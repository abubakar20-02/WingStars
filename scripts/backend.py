import base64
import sys
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import smtplib
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from flask import Flask, request, jsonify, send_file, abort, g
from flask_cors import CORS
from datetime import datetime
from colorsys import hsv_to_rgb
from PIL import Image
import json
import sqlite3
import re
from io import BytesIO

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes


# Define a JSON formatter for structured logging
class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            'time': self.formatTime(record, self.datefmt),
            'level': record.levelname,
            'message': record.getMessage(),
            'name': record.name,
            'pathname': record.pathname,
            'lineno': record.lineno,
        }
        if record.exc_info:
            log_record['exception'] = self.formatException(record.exc_info)
        return json.dumps(log_record)


# Configure logging with RotatingFileHandler and JSONFormatter
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)  # Set to DEBUG for detailed logs

# Define log rotation handler
rotating_handler = RotatingFileHandler(
    "app.log",
    maxBytes=5 * 1024 * 1024,  # 5 MB per log file
    backupCount=5  # Keep up to 5 backup files
)
rotating_handler.setFormatter(JSONFormatter())
logger.addHandler(rotating_handler)

# Also add console handler
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(JSONFormatter())
logger.addHandler(console_handler)


def init_db():
    """
    Initialize the SQLite3 database and create the 'emails' table if it doesn't exist.
    """
    try:
        db_path = BASE_DIR / 'wing-master-db.db'
        log_path("Database path", db_path)
        db = sqlite3.connect(db_path)
        cursor = db.cursor()
        # Create the 'emails' table with the 'status' column
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS emails (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                status TEXT NOT NULL DEFAULT 'unsent',
                date_added TEXT NOT NULL
            )
        ''')
        db.commit()
        logger.info("Database initialized and 'emails' table ensured.")
    except Exception as e:
        logger.exception("Failed to initialize the database.")
    finally:
        db.close()


def log_path(name, path_obj):
    """
    Logs the name, type, and value of a Path object.
    """
    logger.debug(f"{name}: Type={type(path_obj)}, Value={path_obj}")


# Determine the base directory
if getattr(sys, 'frozen', False):
    # Running as a bundled executable
    current_dir = Path(sys.executable).parent
    log_path("current_dir (frozen)", current_dir)
else:
    # Running as a normal Python script
    current_dir = Path(__file__).resolve().parent
    log_path("current_dir (script)", current_dir)

# Set BASE_DIR to the parent directory of current_dir
BASE_DIR = current_dir.parent
log_path("BASE_DIR", BASE_DIR)


def get_db():
    """
    Opens a new database connection if there is none yet for the current application context.
    """
    if 'db' not in g:
        db_path = BASE_DIR / 'wing-master-db.db'
        g.db = sqlite3.connect(str(db_path))
        g.db.row_factory = sqlite3.Row  # Enables name-based access to columns
        logger.debug("Database connection established.")
    return g.db


@app.teardown_appcontext
def close_db(error):
    """
    Closes the database again at the end of the request.
    """
    db = g.pop('db', None)

    if db is not None:
        db.close()
        logger.debug("Database connection closed.")


def is_valid_email(email):
    """
    Validate the email address using a regex pattern.
    Returns True if valid, False otherwise.
    """
    regex = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return re.match(regex, email) is not None


def percentage_to_color(percentage):
    """
    Converts a percentage to a HEX color code, transitioning from red (0%)
    through yellow (50%) to green (100%).
    """
    # Ensure percentage is between 0 and 100
    percentage = max(0, min(100, percentage))

    # Map percentage to hue (0° to 120°)
    hue = (percentage * 1.2) / 360  # Adjust hue for hsv_to_rgb (range 0 to 1)

    # Full saturation and brightness
    saturation = 1.0
    brightness = 1.0

    # Get RGB values from HSV
    r, g, b = hsv_to_rgb(hue, saturation, brightness)

    # Convert RGB values to integers in the range [0,255]
    r = int(r * 255)
    g = int(g * 255)
    b = int(b * 255)

    # Return color in HEX format
    return f'#{r:02X}{g:02X}{b:02X}'


def get_text_color(hex_color):
    """
    Determines whether black or white text would be more readable on the given background color.
    """
    # Remove '#' if present
    hex_color = hex_color.lstrip('#')
    # Convert HEX to RGB
    r, g, b = tuple(int(hex_color[i:i + 2], 16) for i in (0, 2, 4))
    # Calculate brightness
    brightness = (r * 299 + g * 587 + b * 114) / 1000
    # Return black for bright colors, white for dark colors
    return '#000000' if brightness > 125 else '#FFFFFF'


def crop_image_with_percentage(image_path, crop_percentages, output_files):
    """
    Crop an image based on percentage values.

    Parameters:
    - image_path: Path to the image to crop.
    - crop_percentages: List of (left, top, right, bottom) percentages for cropping.
    - output_files: List of file paths for saving cropped images.
    """
    logger.info("Starting cropping process...")
    try:
        # Log image_path
        log_path("image_path", image_path)

        # Log output_files
        for idx, output_file in enumerate(output_files, start=1):
            log_path(f"output_file_{idx}", output_file)

        # Validate input
        if not image_path.exists():
            logger.error(f"Image path {image_path} does not exist.")
            return

        if len(crop_percentages) != len(output_files):
            logger.error("Mismatch between crop_percentages and output_files.")
            return

        # Open the image
        with Image.open(image_path) as img:
            width, height = img.size
            logger.info(f"Original image dimensions: width={width}, height={height}")

            # Iterate through crop regions
            for i, (left_pct, top_pct, right_pct, bottom_pct) in enumerate(crop_percentages):
                # Log crop percentages
                logger.info(
                    f"Crop {i + 1} percentages: left={left_pct}, top={top_pct}, right={right_pct}, bottom={bottom_pct}")

                # Validate percentages
                if not all(0.0 <= pct <= 1.0 for pct in (left_pct, top_pct, right_pct, bottom_pct)):
                    logger.warning(
                        f"Invalid crop percentages for crop {i + 1}: {left_pct}, {top_pct}, {right_pct}, {bottom_pct}")
                    continue
                if left_pct >= right_pct or top_pct >= bottom_pct:
                    logger.warning(f"Invalid crop bounds for crop {i + 1}: left >= right or top >= bottom")
                    continue

                # Calculate pixel coordinates
                left = int(left_pct * width)
                top = int(top_pct * height)
                right = int(right_pct * width)
                bottom = int(bottom_pct * height)

                # Debug cropping dimensions
                logger.debug(f"Cropping {i + 1}: left={left}, top={top}, right={right}, bottom={bottom}")

                # Perform the crop
                cropped_img = img.crop((left, top, right, bottom))

                # Save the cropped image
                output_path = Path(output_files[i])
                log_path(f"Saving cropped image {i + 1}", output_path)
                output_path.parent.mkdir(parents=True, exist_ok=True)

                # Remove existing file if it exists
                if output_path.exists():
                    output_path.unlink()
                    logger.debug(f"Old file removed: {output_path}")

                cropped_img.save(output_path)
                logger.info(f"Cropped image saved to: {output_path}")

    except Exception as e:
        logger.exception("Error cropping image.")


def generate_html_file(template_path, output_path, boxes, comments):
    """
    Generates an HTML file by replacing placeholders with actual data.

    Parameters:
    - template_path: Path to the HTML template file.
    - output_path: Path where the generated HTML file will be saved.
    - boxes: List of dictionaries containing 'title' and 'percentage'.
    - comments: List of comment strings.
    """
    # Log template_path and output_path
    log_path("template_path", template_path)
    log_path("output_path", output_path)

    # Read the HTML template
    try:
        with open(template_path, 'r', encoding='utf-8') as file:
            html_template = file.read()
        logger.info(f"HTML template loaded from: {template_path}")
    except FileNotFoundError:
        logger.error(f"HTML template not found at {template_path}")
        return False
    except Exception as e:
        logger.exception("Unexpected error while loading HTML template.")
        return False

    # Get the current timestamp
    current_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    logger.debug(f"Current timestamp: {current_timestamp}")

    # Replace the timestamp placeholder
    html_content = html_template.replace("{{timestamp}}", current_timestamp)

    # Generate the HTML for comments
    comments_html = ''
    for comment in comments:
        comments_html += f'<p>- {comment}</p>'

    # Replace the comments placeholder
    html_content = html_content.replace("{{comments}}", comments_html)

    # Calculate colors and replace placeholders
    for i, box in enumerate(boxes, start=1):
        color = percentage_to_color(box['percentage'])  # Convert percentage to color
        html_content = html_content.replace(f'{{{{percent{i}}}}}', str(box['percentage']))
        html_content = html_content.replace(f'{{{{color{i}}}}}', color)
        html_content = html_content.replace(f'{{{{title{i}}}}}', box['title'])

    # Save the generated HTML to the output path
    try:
        with open(output_path, 'w', encoding='utf-8') as file:
            file.write(html_content)
        logger.info(f"Generated HTML file saved to: {output_path}")
        return True
    except Exception as e:
        logger.exception("Error saving generated HTML file.")
        return False


def capture_full_page(driver, output_path):
    """
    Capture a full-page screenshot using Chrome DevTools Protocol (CDP).
    """
    try:
        # Log output_path
        log_path("capture_full_page output_path", output_path)

        # Get the total width and height of the page
        total_width = driver.execute_script("return document.body.scrollWidth")
        total_height = driver.execute_script("return document.body.scrollHeight")
        logger.debug(f"Full page dimensions: width={total_width}, height={total_height}")

        # Set device metrics to the full page dimensions
        driver.execute_cdp_cmd('Emulation.setDeviceMetricsOverride', {
            "mobile": False,
            "width": total_width,
            "height": total_height,
            "deviceScaleFactor": 1,
            "screenOrientation": {"angle": 0, "type": "portraitPrimary"}
        })
        logger.debug("Device metrics overridden for full-page screenshot.")

        # Capture the screenshot
        result = driver.execute_cdp_cmd('Page.captureScreenshot', {
            'fromSurface': True,
            'captureBeyondViewport': True
        })

        # Ensure the directory exists
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        # Decode the base64 screenshot data and save it to a file
        with open(output_path, "wb") as file:
            file.write(base64.b64decode(result['data']))
        logger.info(f"Full page screenshot saved to: {output_path}")
    except Exception as e:
        logger.exception("Error capturing full page screenshot.")
    finally:
        # Clear the device metrics override to reset the browser back to its original state
        try:
            driver.execute_cdp_cmd('Emulation.clearDeviceMetricsOverride', {})
            logger.debug("Device metrics override cleared.")
        except Exception as e:
            logger.exception("Error clearing device metrics override.")


def capture_table(driver, table_selector, table_screenshot_file, timer, rows_to_capture=3):
    """
    Capture a screenshot of the table headers and the first N rows of the table.
    """
    try:
        # Log table_selector and table_screenshot_file
        logger.debug(f"Capturing table with selector: {table_selector}")
        logger.debug(f"Table screenshot will be saved as: {table_screenshot_file}")

        # Locate the table element
        table_element = WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, table_selector))
        )
        logger.debug("Table element located.")

        # Ensure all rows are loaded
        WebDriverWait(driver, 15).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, f"{table_selector} tbody tr"))
        )
        logger.debug("All table rows are loaded.")

        # Scroll the table into view
        driver.execute_script("arguments[0].scrollIntoView();", table_element)
        logger.debug("Scrolled table into view.")

        # Wait for the table to render completely
        time.sleep(timer)

        # Get the table header
        try:
            thead = table_element.find_element(By.CSS_SELECTOR, "thead")
            has_thead = True
            logger.debug("Table has a <thead>.")
        except:
            logger.debug("No <thead> found in the table.")
            has_thead = False

        # Get the first N rows
        rows = table_element.find_elements(By.CSS_SELECTOR, "tbody tr")[:rows_to_capture]
        logger.debug(f"Number of rows captured: {len(rows)}")

        if not rows:
            logger.warning("No rows found in the table.")
            return

        # Get bounding rectangle of the header and first N rows
        if has_thead:
            # Get bounding rectangle of the thead
            header_rect = driver.execute_script("""
                var rect = arguments[0].getBoundingClientRect();
                return {x: rect.left, y: rect.top, width: rect.width, height: rect.height};
            """, thead)
            logger.debug(f"Header rect: {header_rect}")
        else:
            # If no thead, use the first row as the start
            header_rect = driver.execute_script("""
                var rect = arguments[0].getBoundingClientRect();
                return {x: rect.left, y: rect.top, width: rect.width, height: rect.height};
            """, rows[0])
            logger.debug(f"First row rect: {header_rect}")

        last_row = rows[-1]

        # Get bounding rectangle of the last row
        last_row_rect = driver.execute_script("""
            var rect = arguments[0].getBoundingClientRect();
            return {x: rect.left, y: rect.bottom, width: rect.width, height: 0};
        """, last_row)
        logger.debug(f"Last row rect: {last_row_rect}")

        # Calculate the bounding box for the header and first N rows
        x = header_rect['x']
        y = header_rect['y']
        width = header_rect['width']
        height = last_row_rect['y'] - header_rect['y']

        logger.debug(f"Cropping coordinates before DPI adjustment: x={x}, y={y}, width={width}, height={height}")

        # Adjust for device pixel ratio
        device_pixel_ratio = driver.execute_script("return window.devicePixelRatio;")
        logger.debug(f"Device Pixel Ratio: {device_pixel_ratio}")
        x = int(x * device_pixel_ratio)
        y = int(y * device_pixel_ratio)
        width = int(width * device_pixel_ratio)
        height = int(height * device_pixel_ratio)

        logger.debug(f"Cropping coordinates after DPI adjustment: x={x}, y={y}, width={width}, height={height}")

        # Capture full-page screenshot as PNG
        png = driver.get_screenshot_as_png()
        img = Image.open(BytesIO(png))
        logger.debug("Full-page screenshot captured.")

        # Crop the image
        crop_box = (x, y, x + width, y + height)
        cropped_img = img.crop(crop_box)
        logger.debug(f"Image cropped with box: {crop_box}")

        # Save the cropped image
        cropped_screenshot_path = Path(BASE_DIR, "template", f"cropped_{table_screenshot_file}")
        log_path("cropped_screenshot_path", cropped_screenshot_path)
        cropped_screenshot_path.parent.mkdir(parents=True, exist_ok=True)  # Ensure directory exists
        cropped_img.save(cropped_screenshot_path)
        logger.info(f"Table screenshot cropped and saved to: {cropped_screenshot_path}")

    except Exception as e:
        logger.exception("An error occurred while capturing the table.")


def capture_element_or_table(site, timer):
    """
    Capture elements or tables from a site with a configurable timer.

    Returns:
    - True if all operations succeed.
    - False if any operation fails.
    """
    try:
        # Log the entire site dictionary
        logger.debug(f"Processing site: {json.dumps(site, default=str)}")

        # Setup Chrome options
        options = uc.ChromeOptions()
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--force-device-scale-factor=1")

        # Initialize WebDriver
        driver = uc.Chrome(options=options)
        logger.debug("WebDriver initialized.")

        # Log window size
        window_size = site.get("window_size", "1920x1080")
        logger.debug(f"Setting window size to: {window_size}")
        width, height = map(int, window_size.split('x'))
        driver.set_window_size(width, height)

        # Log URL
        url = site["url"]
        logger.debug(f"Navigating to URL: {url}")
        driver.get(url)

        WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        logger.debug("Page loaded successfully.")
        time.sleep(timer)  # Wait for the page to load

        screenshot_dir = Path(BASE_DIR, "images")  # Path to save screenshots
        log_path("screenshot_dir", screenshot_dir)
        screenshot_dir.mkdir(parents=True, exist_ok=True)  # Ensure directory exists

        # Ensure 'template' directory exists
        template_dir = Path(BASE_DIR, "template")
        log_path("template_dir", template_dir)
        template_dir.mkdir(parents=True, exist_ok=True)

        # 1. Capture Full-Page Screenshot (If Required)
        if site.get("full_page", False):
            full_screenshot_file = site.get("full_screenshot_file")
            full_screenshot_path = screenshot_dir / full_screenshot_file
            log_path("full_screenshot_path", full_screenshot_path)
            logger.debug(f"Full screen path: {full_screenshot_path}")
            if full_screenshot_path.exists():
                full_screenshot_path.unlink()
                logger.debug(f"Old file removed: {full_screenshot_path}")

            capture_full_page(driver, full_screenshot_path)

        # 2. Capture Element Screenshot (If div_selector is Present)
        if "div_selector" in site:
            div_selector = site["div_selector"]
            logger.debug(f"Capturing element with selector: {div_selector}")
            element = WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, div_selector))
            )
            driver.execute_script("arguments[0].scrollIntoView();", element)
            logger.debug("Element scrolled into view.")
            element_screenshot_file = site["full_screenshot_file"]
            element_screenshot_path = screenshot_dir / element_screenshot_file
            log_path("element_screenshot_path", element_screenshot_path)

            if element_screenshot_path.exists():
                element_screenshot_path.unlink()
                logger.debug(f"Old file removed: {element_screenshot_path}")

            # Convert Path to string before passing to Selenium
            element_screenshot_path_str = str(element_screenshot_path)
            time.sleep(timer)  # Wait for the element to be in view
            element.screenshot(element_screenshot_path_str)
            logger.info(f"Element screenshot saved to: {element_screenshot_path_str}")

        # 3. Perform Cropping (If crop_percentages and output_files are Present)
        if "crop_percentages" in site and "output_files" in site:
            full_screenshot_file = site["full_screenshot_file"]
            full_screenshot_path = screenshot_dir / full_screenshot_file
            log_path("full_screenshot_path for cropping", full_screenshot_path)
            if not full_screenshot_path.exists():
                logger.error(f"Error: Image path {full_screenshot_path} does not exist.")
                return False

            logger.debug("Starting cropping process...")
            # Ensure output_files are correctly logged
            output_files = [template_dir / output_file for output_file in site["output_files"]]
            for idx, output_file in enumerate(output_files, start=1):
                log_path(f"output_file_{idx} for cropping", output_file)

            # Pass Path objects
            crop_image_with_percentage(
                full_screenshot_path,
                site["crop_percentages"],
                output_files
            )

        # 4. Capture Table Screenshot (If table_selector is Present)
        if "table_selector" in site:
            table_selector = site["table_selector"]
            table_screenshot_file = site["table_screenshot_file"]
            logger.debug(f"Capturing table with selector: {table_selector}")
            table_screenshot_path = screenshot_dir / table_screenshot_file
            log_path("table_screenshot_path", table_screenshot_path)

            if table_screenshot_path.exists():
                table_screenshot_path.unlink()
                logger.debug(f"Old file removed: {table_screenshot_path}")

            capture_table(
                driver,
                table_selector,
                table_screenshot_file,
                timer=timer,
                rows_to_capture=site.get("rows_to_capture", 3)  # Default to 3 if not specified
            )
            logger.info(f"Table screenshot saved to: {table_screenshot_path}")

        # 5. **After Processing Sites: Reset All Email Statuses to 'unsent'**
        logger.debug("Resetting all email statuses to 'unsent' after processing sites.")
        try:
            db = get_db()
            cursor = db.cursor()
            cursor.execute("UPDATE emails SET status = 'unsent'")
            db.commit()
            logger.info("All email statuses have been reset to 'unsent'.")
        except Exception as e:
            logger.exception("Failed to reset email statuses after processing sites.")
            return False

        return True
    except Exception as e:
        logger.exception("An error occurred during capture_element_or_table.")
        # Optionally, log the site URL and other details here
        log_path("Error site URL", site.get("url", "Unknown URL"))
        return False
    finally:
        if 'driver' in locals():
            driver.quit()
            logger.debug("WebDriver closed.")


@app.before_request
def log_request_info():
    """
    Logs incoming request information.
    """
    try:
        # Avoid logging sensitive endpoints or data
        if request.endpoint in ['send_email', 'send_emails_from_db', 'add_email', 'add_emails']:
            logger.debug(f"Received {request.method} request for {request.url}")
            logger.debug(f"Request headers: {dict(request.headers)}")
            # Do not log request body for sensitive endpoints
            logger.debug("Request body: [REDACTED]")
        else:
            logger.debug(f"Received {request.method} request for {request.url}")
            logger.debug(f"Request headers: {dict(request.headers)}")
            logger.debug(f"Request body: {request.get_data(as_text=True)}")
    except Exception as e:
        logger.exception("Failed to log request information.")


@app.after_request
def log_response_info(response):
    """
    Logs outgoing response information.
    """
    try:
        logger.debug(f"Response status: {response.status}")
        logger.debug(f"Response headers: {dict(response.headers)}")
        # To log response data, ensure it's not binary and not too large
        if response.content_type.startswith('application/json'):
            response_data = response.get_json()
            logger.debug(f"Response body: {json.dumps(response_data)}")
        else:
            logger.debug("Response body: [Non-JSON Content]")
    except Exception as e:
        logger.exception("Failed to log response information.")
    return response


@app.errorhandler(Exception)
def handle_exception(e):
    """
    Handle uncaught exceptions and log them.
    """
    logger.exception("An unhandled exception occurred.")
    return jsonify({"status": "error", "message": "An internal error occurred."}), 500


@app.route('/process-sites', methods=['POST'])
def process_sites():
    """
    Endpoint to process sites and generate screenshots.
    Expects a JSON payload with 'data', 'comments', 'timer', and 'sites'.
    """
    template_path = Path(BASE_DIR, "template", "template.html")
    generated_html_path = Path(BASE_DIR, "template", "generated_template.html")
    log_path("template_path in process_sites", template_path)
    log_path("generated_html_path", generated_html_path)

    # Get JSON data from the request
    data = request.get_json()
    logger.debug(f"Received data: {data}")

    # Validate input data
    if not data or 'data' not in data or 'comments' not in data or 'timer' not in data or 'sites' not in data:
        logger.error("Invalid input data received.")
        return jsonify({
            "status": "error",
            "message": "Invalid input data. Required fields: 'data', 'comments', 'timer', 'sites'."
        }), 400

    boxes = data['data']
    comments = data['comments']
    timer = data['timer']
    sites = data['sites']

    # Log received data
    logger.debug(f"Boxes: {boxes}")
    logger.debug(f"Comments: {comments}")
    logger.debug(f"Timer: {timer}")
    logger.debug(f"Sites: {sites}")

    # Validate 'timer' value
    if not isinstance(timer, (int, float)) or timer <= 0:
        logger.error("Invalid timer value received.")
        return jsonify({"status": "error", "message": "Invalid timer value. It must be a positive number."}), 400

    # Validate 'sites'
    if not isinstance(sites, list) or not all(isinstance(site, dict) for site in sites):
        logger.error("Invalid sites data received.")
        return jsonify(
            {"status": "error", "message": "Invalid sites data. It must be a list of site configurations."}), 400

    # Log all site URLs
    for idx, site in enumerate(sites, start=1):
        if 'url' not in site:
            logger.error(f"Site {idx} does not contain a 'url'.")
            return jsonify({"status": "error", "message": f"Site {idx} is missing a 'url' field."}), 400
        log_path(f"Site_{idx}_url", site["url"])

    # Generate the HTML file with variables replaced
    logger.debug("Generating HTML file with replaced variables...")
    if not generate_html_file(template_path, generated_html_path, boxes, comments):
        logger.error("Failed to generate HTML file.")
        return jsonify({"status": "error", "message": "Failed to generate HTML file."}), 500

    # Process each site
    failed_sites = []
    error_messages = {}

    for site in sites:
        success = capture_element_or_table(site, timer)
        if not success:
            failed_sites.append(site["url"])
            error_messages[site["url"]] = "Failed to capture screenshots."

    if failed_sites:
        logger.error(f"Failed to process sites: {failed_sites}")
        return jsonify({
            "status": "error",
            "message": "Failed to process some sites.",
            "failed_sites": failed_sites,
            "details": error_messages
        }), 500  # Use 500 for server-side errors

    logger.info("All screenshots captured successfully.")
    return jsonify({"status": "success", "message": "Screenshots captured successfully."}), 200


@app.route('/send-email', methods=['POST'])
def send_email():
    """
    Send an email with a resized image for compatibility with email clients.
    """
    data = request.get_json()
    logger.debug(f"Received email data: {data}")

    # Validate input data
    required_fields = {"email", "password", "receiver"}
    if not data or not required_fields.issubset(data.keys()):
        logger.error("Invalid email input data received.")
        return jsonify({"status": "error",
                        "message": "Invalid input data. Required fields: 'email', 'password', 'receiver'."}), 400

    sender_email = data["email"]
    sender_password = data["password"]
    recipient_emails = data["receiver"] if isinstance(data["receiver"], list) else [data["receiver"]]

    # Image paths
    image_path = Path(BASE_DIR, 'images', 'full_page_screenshot.png')  # Update with actual path
    resized_image_path = Path(BASE_DIR, 'images', 'resized_screenshot.png')

    # Resize the image
    if not resize_image(image_path, resized_image_path, (870, 490)):
        return jsonify({"status": "error", "message": "Failed to process image."}), 500

    # Create email content
    try:
        html_content = create_html_body()
    except Exception as e:
        logger.error(f"Error creating email HTML content: {e}")
        return jsonify({"status": "error", "message": "Failed to create email content."}), 500

    # Send emails
    response = send_emails(sender_email, sender_password, recipient_emails, html_content, resized_image_path)
    return jsonify(response), 200 if response["status"] == "success" else 500


def resize_image(image_path, output_path, size):
    """Resize an image and save it to the specified path."""
    try:
        with Image.open(image_path) as img:
            img = img.resize(size)
            img.save(output_path)
        logger.debug(f"Image resized to {size} and saved at {output_path}")
        return True
    except Exception as e:
        logger.error(f"Error resizing image: {e}")
        return False


def create_html_body():
    """Create the HTML body for the email."""
    return '''
<html>
<body style="margin: 0; padding: 0; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; margin: 0; padding: 0; background-color: #f4f4f4;">
        <tr>
            <td align="center" style="padding: 20px;">
                <img src="cid:image1" alt="Daily Report" style="width: 100%; max-width: 1366px; height: auto;">
            </td>
        </tr>
        <!-- Buttons Row -->
        <tr>
            <td>
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; margin: 0 auto; max-width: 1366px;">
                    <tr>
                        <!-- Left Aligned Button -->
                        <td align="left" style="padding: 10px;">
                            <a href="https://weather.tomorrow.io/widget/" style="background-color: #1d3361; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 24px; display: inline-block;">
                                CLICK HERE FOR <span style="color: #ed1c24;">LIVE</span> VIEW!
                            </a>
                        </td>

                        <!-- Centered Button 1 -->
                        <td align="center" style="padding: 10px;">
                            <a href="https://www.massport.com/logan-airport/flights/flight-status#departure" style="background-color: #edba25; color: #1d3359; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 24px; display: inline-block;">
                                PRESS FOR DEPARTURES
                            </a>
                        </td>

                        <!-- Centered Button 2 -->
                        <td align="center" style="padding: 10px;">
                            <a href="https://www.massport.com/logan-airport/flights/flight-status" style="background-color: #edba25; color: #1d3359; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 24px; display: inline-block;">
                                PRESS FOR ARRIVALS
                            </a>
                        </td>

                        <!-- Right Aligned Button -->
                        <td align="right" style="padding: 10px;">
                            <a href="https://metar-taf.com/livestream/KBOS?zoom=88" style="background-color: #1d3361; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 24px; display: inline-block;">
                                CLICK HERE FOR <span style="color: #ed1c24;">LIVE</span> WEATHER VIEW!
                            </a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    '''


def send_emails(sender_email, sender_password, recipient_emails, html_content, attachment_path):
    """Send emails to the recipients."""
    sent_emails, skipped_emails, failed_emails = [], [], []
    db = get_db()
    cursor = db.cursor()

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(sender_email, sender_password)
            logger.info("SMTP server connection established.")

            for recipient_email in recipient_emails:
                try:
                    # Check email status in the database
                    cursor.execute("SELECT status FROM emails WHERE email = ?", (recipient_email,))
                    result = cursor.fetchone()

                    if result and result["status"] == 'sent':
                        logger.info(f"Skipping email to {recipient_email}, already sent.")
                        skipped_emails.append(recipient_email)
                        continue

                    # Create email message
                    msg = MIMEMultipart('related')
                    msg['From'] = sender_email
                    msg['To'] = recipient_email
                    msg['Subject'] = "Daily Report"

                    msg_alternative = MIMEMultipart('alternative')
                    msg.attach(msg_alternative)
                    msg_alternative.attach(MIMEText(html_content, 'html'))

                    # Attach the image
                    with open(attachment_path, 'rb') as img_file:
                        img_data = img_file.read()
                        msg_image = MIMEImage(img_data)
                        msg_image.add_header('Content-ID', '<image1>')
                        msg.attach(msg_image)

                    # Send email
                    server.sendmail(sender_email, recipient_email, msg.as_string())
                    sent_emails.append(recipient_email)

                    # Update database
                    cursor.execute("UPDATE emails SET status = 'sent' WHERE email = ?", (recipient_email,))
                    db.commit()

                except Exception as e:
                    logger.error(f"Failed to send email to {recipient_email}: {e}")
                    failed_emails.append(recipient_email)

    except smtplib.SMTPAuthenticationError:
        logger.error("Authentication failed. Check your email and app password.")
        return {"status": "error", "message": "Authentication failed."}
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return {"status": "error", "message": str(e)}

    return {
        "status": "success",
        "message": "Emails processed successfully.",
        "sent_emails": sent_emails,
        "skipped_emails": skipped_emails,
        "failed_emails": failed_emails,
    }


@app.route('/get-emails', methods=['GET'])
def get_emails():
    """
    Endpoint to retrieve all email addresses from the database.
    Returns all fields: id, email, status, date_added.
    """
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute('SELECT id, email, status, date_added FROM emails')
        rows = cursor.fetchall()
        emails = [{"id": row["id"], "email": row["email"], "status": row["status"], "date_added": row["date_added"]} for
                  row in rows]
        logger.info("Retrieved all emails from the database.")
        return jsonify({"status": "success", "emails": emails}), 200
    except Exception as e:
        logger.exception("An error occurred while retrieving emails.")
        return jsonify({"status": "error", "message": "An internal error occurred."}), 500


@app.route('/add-email', methods=['POST'])
def add_email_route():
    """
    Endpoint to add an email address to the database.
    Expects a JSON payload with the 'email' field.
    """
    # Get JSON data from the request
    data = request.get_json()
    logger.debug(f"Received add-email data: {data}")

    # Validate input data
    if not data or 'email' not in data:
        logger.error("Invalid input data received for add-email.")
        return jsonify({"status": "error", "message": "Invalid input data. Required field: 'email'."}), 400

    email = data['email'].strip()

    # Validate the email format
    if not is_valid_email(email):
        logger.error(f"Invalid email format received: {email}")
        return jsonify({"status": "error", "message": "Invalid email format."}), 400

    # Insert the email into the database
    try:
        db = get_db()
        cursor = db.cursor()
        date_added = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        # Explicitly set the 'status' to 'unsent' (optional since default is 'unsent')
        cursor.execute('INSERT INTO emails (email, status, date_added) VALUES (?, ?, ?)', (email, 'unsent', date_added))
        db.commit()
        logger.info(f"Email '{email}' added to the database with status 'unsent'.")
        return jsonify(
            {"status": "success", "message": f"Email '{email}' added successfully with status 'unsent'."}), 201
    except sqlite3.IntegrityError:
        logger.warning(f"Attempted to add duplicate email: {email}")
        return jsonify({"status": "error", "message": "Email already exists in the database."}), 409
    except Exception as e:
        logger.exception("An error occurred while adding the email to the database.")
        return jsonify({"status": "error", "message": "An internal error occurred."}), 500


@app.route('/add-emails', methods=['POST'])
def add_emails():
    """
    Endpoint to add multiple email addresses to the database.
    Expects a JSON payload with the 'emails' field as a list.
    """
    data = request.get_json()
    logger.debug(f"Received add-emails data: {data}")

    # Validate input data
    if not data or 'emails' not in data:
        logger.error("Invalid input data received for add-emails.")
        return jsonify({"status": "error", "message": "Invalid input data. Required field: 'emails'."}), 400

    emails = data['emails']

    if not isinstance(emails, list):
        logger.error("The 'emails' field must be a list.")
        return jsonify({"status": "error", "message": "The 'emails' field must be a list."}), 400

    if not emails:
        logger.error("The 'emails' list is empty.")
        return jsonify({"status": "error", "message": "The 'emails' list cannot be empty."}), 400

    added_emails = []
    duplicate_emails = []
    invalid_emails = []
    current_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    try:
        db = get_db()
        cursor = db.cursor()

        for email in emails:
            email = email.strip()
            if not is_valid_email(email):
                invalid_emails.append(email)
                logger.warning(f"Invalid email format: {email}")
                continue
            try:
                cursor.execute(
                    'INSERT INTO emails (email, status, date_added) VALUES (?, ?, ?)',
                    (email, 'unsent', current_timestamp)
                )
                added_emails.append(email)
                logger.info(f"Email '{email}' added to the database with status 'unsent'.")
            except sqlite3.IntegrityError:
                duplicate_emails.append(email)
                logger.warning(f"Duplicate email attempted to add: {email}")
                continue

        db.commit()

        response = {
            "status": "success",
            "message": "Bulk email addition completed.",
            "added_emails": added_emails,
            "duplicate_emails": duplicate_emails,
            "invalid_emails": invalid_emails
        }

        return jsonify(response), 201

    except Exception as e:
        logger.exception("An error occurred while adding bulk emails.")
        return jsonify({"status": "error", "message": "An internal error occurred."}), 500


@app.route('/delete-email/<path:email>', methods=['DELETE'])
def delete_email(email):
    """
    Endpoint to delete an email address from the database based on the email address.
    """
    logger.debug(f"Received delete-email request for email {email}.")
    try:
        db = get_db()
        cursor = db.cursor()

        # Check if the email exists
        cursor.execute("SELECT id FROM emails WHERE email = ?", (email,))
        result = cursor.fetchone()
        if not result:
            logger.error(f"Email '{email}' not found.")
            return jsonify({"status": "error", "message": f"Email '{email}' not found."}), 404

        # Delete the email
        cursor.execute("DELETE FROM emails WHERE email = ?", (email,))
        db.commit()

        logger.info(f"Email '{email}' deleted successfully.")
        return jsonify({"status": "success", "message": f"Email '{email}' deleted successfully."}), 200

    except Exception as e:
        logger.exception("An error occurred while deleting the email.")
        return jsonify({"status": "error", "message": "An internal error occurred."}), 500


@app.route('/delete-emails', methods=['POST'])
def delete_emails():
    """
    Endpoint to delete multiple email addresses from the database.
    Expects a JSON payload with the 'emails' field as a list of email addresses.
    """
    data = request.get_json()
    logger.debug(f"Received delete-emails data: {data}")

    # Validate input data
    if not data or 'emails' not in data:
        logger.error("Invalid input data received for delete-emails.")
        return jsonify({"status": "error", "message": "Invalid input data. Required field: 'emails'."}), 400

    emails = data['emails']

    if not isinstance(emails, list):
        logger.error("The 'emails' field must be a list.")
        return jsonify({"status": "error", "message": "The 'emails' field must be a list."}), 400

    if not emails:
        logger.error("The 'emails' list is empty.")
        return jsonify({"status": "error", "message": "The 'emails' list cannot be empty."}), 400

    # Normalize emails to lowercase to ensure consistency
    emails = [email.strip().lower() for email in emails if is_valid_email(email.strip())]

    if not emails:
        logger.error("No valid email addresses provided for deletion.")
        return jsonify({"status": "error", "message": "No valid email addresses provided for deletion."}), 400

    try:
        db = get_db()
        cursor = db.cursor()

        # Prepare placeholders for the SQL IN clause
        placeholders = ', '.join(['?'] * len(emails))
        query = f"DELETE FROM emails WHERE email IN ({placeholders})"

        cursor.execute(query, tuple(emails))
        db.commit()

        deleted_count = cursor.rowcount

        # Determine which emails were not found (i.e., not deleted)
        # Fetch existing emails to compare
        cursor.execute(f"SELECT email FROM emails WHERE email IN ({placeholders})", tuple(emails))
        existing_emails = {row["email"] for row in cursor.fetchall()}
        not_found_emails = list(set(emails) - existing_emails)

        response = {
            "status": "success",
            "message": "Batch deletion completed.",
            "deleted_count": deleted_count,
            "deleted_emails": emails if not not_found_emails else list(existing_emails),
            "not_found_emails": not_found_emails
        }

        logger.info(f"Batch deletion completed. Deleted {deleted_count} emails.")
        if not_found_emails:
            logger.warning(f"The following emails were not found and could not be deleted: {not_found_emails}")

        return jsonify(response), 200

    except Exception as e:
        logger.exception("An error occurred while deleting emails.")
        return jsonify({"status": "error", "message": "An internal error occurred."}), 500


@app.route('/update-email/<path:email>', methods=['PUT', 'PATCH'])
def update_email(email):
    """
    Endpoint to update an existing email address in the database.
    Expects a JSON payload with fields to update: 'email' and/or 'status'.
    """
    data = request.get_json()
    logger.debug(f"Received update-email data for email '{email}': {data}")

    if not data:
        logger.error("No data provided for update.")
        return jsonify({"status": "error", "message": "No data provided for update."}), 400

    fields_to_update = {}
    if 'email' in data:
        new_email = data['email'].strip()
        if not is_valid_email(new_email):
            logger.error(f"Invalid email format received for update: {new_email}")
            return jsonify({"status": "error", "message": "Invalid email format."}), 400
        fields_to_update['email'] = new_email

    if 'status' in data:
        new_status = data['status'].strip().lower()
        if new_status not in ['sent', 'unsent']:
            logger.error(f"Invalid status value received: {new_status}")
            return jsonify({"status": "error", "message": "Invalid status value. Must be 'sent' or 'unsent'."}), 400
        fields_to_update['status'] = new_status

    if not fields_to_update:
        logger.error("No valid fields provided for update.")
        return jsonify({"status": "error", "message": "No valid fields provided for update."}), 400

    try:
        db = get_db()
        cursor = db.cursor()

        # Check if the original email exists
        cursor.execute("SELECT id FROM emails WHERE email = ?", (email,))
        result = cursor.fetchone()
        if not result:
            logger.error(f"Email '{email}' not found.")
            return jsonify({"status": "error", "message": f"Email '{email}' not found."}), 404

        # Prepare the SET part of the SQL statement
        set_clause = ', '.join([f"{key} = ?" for key in fields_to_update.keys()])
        values = list(fields_to_update.values())
        values.append(email)  # For the WHERE clause

        sql = f"UPDATE emails SET {set_clause} WHERE email = ?"
        cursor.execute(sql, tuple(values))
        db.commit()

        logger.info(f"Email '{email}' updated successfully.")
        return jsonify({"status": "success", "message": f"Email '{email}' updated successfully."}), 200

    except sqlite3.IntegrityError:
        logger.warning(f"Attempted to update email to a duplicate address: {fields_to_update.get('email')}")
        return jsonify({"status": "error", "message": "The updated email address already exists in the database."}), 409
    except Exception as e:
        logger.exception("An error occurred while updating the email.")
        return jsonify({"status": "error", "message": "An internal error occurred."}), 500


@app.route('/images/<path:filename>', methods=['GET'])
def serve_image(filename):
    """
    Serve images stored in the 'images' directory.
    """
    image_dir = Path(BASE_DIR, 'images')
    log_path("serve_image image_dir", image_dir)
    image_path = image_dir / filename
    log_path("serve_image image_path", image_path)

    if image_path.exists() and image_path.is_file():
        try:
            logger.debug(f"Serving image: {image_path}")
            return send_file(image_path, mimetype='image/png')  # Adjust mimetype based on file type
        except Exception as e:
            logger.exception(f"Error serving image {filename}.")
            abort(500, description="Internal Server Error")
    else:
        logger.warning(f"Image not found: {filename}")
        abort(404, description="Image not found")


if __name__ == '__main__':
    # Initialize the database when the application starts
    init_db()

    # Check if a port was passed as an argument
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            logger.error("Invalid port number provided. Using default port 5000.")
            port = 5000
    else:
        port = 5000  # Default port

    app.run(host='0.0.0.0', port=port)
