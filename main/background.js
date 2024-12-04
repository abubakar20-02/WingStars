// main/main.js
import path from 'path';
import { spawn } from 'child_process'; // Use spawn for better process management
import { app, ipcMain } from 'electron';
import serve from 'electron-serve';
import { execSync } from 'child_process';

import { createWindow } from './helpers';
const { Menu } = require('electron');
const net = require('net');
const Store = require('electron-store');

// Initialize electron-store
const store = new Store();

const isProd = process.env.NODE_ENV === 'production';
let flaskProcess; // To track the Flask process

/**
 * Function to find a free port
 * @returns {Promise<number>} A promise that resolves to a free port number
 */
function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref(); // Allow the program to exit if this is the only active server
    server.on('error', (err) => reject(err));
    server.listen(0, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

/**
 * Function to start the Flask backend with a specified port
 * @param {number} port - The port number to run Flask on
 * @returns {Promise<ChildProcess|null>} The spawned Flask process or null if failed
 */
async function startFlask(port) {
  const flaskScriptPath = isProd
    ? path.join(process.resourcesPath, 'scripts', 'backend.exe') // Production executable
    : path.join(__dirname, '..', 'scripts', 'backend.exe'); // Development script

  try {
    // Spawn the Flask process with the port as an argument
    flaskProcess = spawn(flaskScriptPath, [port], { // Pass port as an argument
      stdio: 'ignore', // Ignore stdio to prevent blocking
      detached: true, // Allow the Flask process to run independently
      windowsHide: true, // Hide the terminal window on Windows
    });
    flaskProcess.unref(); // Allow Flask to run independently

    console.log(`Flask backend started on port ${port}`);
    return flaskProcess;
  } catch (error) {
    console.error(`Failed to start Flask backend: ${error.message}`);
    return null;
  }
}

/**
 * Function to terminate the Flask process gracefully
 */
function terminateFlaskProcess() {
  if (flaskProcess && !flaskProcess.killed) {
    try {
      if (process.platform === 'win32') {
        // Use taskkill to terminate the process and its child processes on Windows
        execSync(`taskkill /pid ${flaskProcess.pid} /f /t`);
      } else {
        // Force kill for non-Windows systems
        flaskProcess.kill('SIGKILL');
      }
      console.log('Flask backend terminated.');
    } catch (error) {
      console.error(`Failed to terminate Flask process: ${error.message}`);
    } finally {
      flaskProcess = null;
    }
  }
}

// Add IPC handler to get the stored API endpoint
ipcMain.handle('getApiEndpoint', async () => {
  try {
    const apiEndpoint = store.get('apiEndpoint'); // Fetch from electron-store
    if (!apiEndpoint) {
      throw new Error('API Endpoint not set');
    }
    return apiEndpoint;
  } catch (error) {
    console.error('Failed to fetch API Endpoint:', error.message);
    throw error;
  }
});


// IPC handlers for electron-store
ipcMain.handle('electron-store-get', (_event, key) => {
  return store.get(key);
});

ipcMain.handle('electron-store-set', (_event, key, value) => {
  store.set(key, value);
});

ipcMain.handle('electron-store-delete', (_event, key) => {
  store.delete(key);
});

// Serve production or development content
if (isProd) {
  serve({ directory: 'app' }); // Serve static files in production
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`);
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const mainWindow = createWindow('main', { show: true });
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Main application logic
  (async () => {
    await app.whenReady();

    console.log('App is ready. Starting Flask backend...');

    try {
      // Determine a free port
      const port = await getFreePort();
      console.log(`Assigned port: ${port}`);

      // Start Flask on the determined port
      flaskProcess = await startFlask(port);

      if (!flaskProcess) {
        throw new Error('Failed to start Flask backend.');
      }

      // Store the apiEndpoint for frontend use
      const apiEndpoint = `http://localhost:${port}`;
      store.set('apiEndpoint', apiEndpoint);
      console.log(`API Endpoint set to: ${apiEndpoint}`);

      // Remove the application menu
      Menu.setApplicationMenu(null);

      // Create the main window
      const mainWindow = createWindow('main', {
        width: 1000,
        height: 600,
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          contextIsolation: true,
          enableRemoteModule: false,
          nodeIntegration: false, // Disabled for security
        },
      });

      if (isProd) {
        await mainWindow.loadURL('app://./home')
      } else {
        const port = process.argv[2]
        await mainWindow.loadURL(`http://localhost:${port}/home`)
        mainWindow.webContents.openDevTools()
      }

      // Handle window closed
      mainWindow.on('closed', () => {
        terminateFlaskProcess(); // Ensure Flask process is terminated
        app.quit();
      });
    } catch (error) {
      console.error(`Error during app initialization: ${error.message}`);
      terminateFlaskProcess();
      app.quit();
    }
  })();
}

app.on('ready', () => {
  const resourcesPath = isProd
    ? process.resourcesPath // Use resources path in production
    : path.join(__dirname, '..', 'resources'); // Use resources path in development

  console.log(`Resources path: ${resourcesPath}`);

  // Check if the app is packaged
  if (app.isPackaged) {
    // Check if it's the first launch
    const isFirstLaunch = !store.get('appInstalled');

    if (isFirstLaunch) {
// Define predefined comments
      store.set('predefinedComments', [
        'Excellent',
        'Good',
        'Average',
        'Poor',
        'Needs Improvement',
        'Outstanding',
      ]);
      store.set('scraper', [
        {
          url: "https://metar-taf.com/livestream/KBOS",
          div_selector: "div#canvas.bg-primary.text-white.flex-shrink-0",
          full_screenshot_file: path.join(resourcesPath,  "images","site1_full_screenshot.png"),
          window_size: "1920x1080",
          crop_percentages: [
            [0.0, 0.0, 0.75, 0.80],
            [0.0, 0.78, 0.38, 1.0],
            [0.40, 0.78, 0.75, 1.0],
          ],
          output_files: [
            path.join(resourcesPath, "template","site1_screenshot_area1.png"),
            path.join(resourcesPath, "template","site1_screenshot_area2.png"),
            path.join(resourcesPath, "template","site1_screenshot_area3.png"),
          ],
        },
        {
          url: path.join(resourcesPath, 'html', 'summary.html'),
          div_selector: "div.tomorrow",
          full_screenshot_file: path.join(resourcesPath,"images", "summary_full_screenshot.png"),
          window_size: "800x800",
          crop_percentages: [
            [0.0, 0.0, 1.0, 1.0]
          ],
          output_files: [
            path.join(resourcesPath, "template","summary-cropped.png"),
          ],
        },
        {
          url: path.join(resourcesPath, 'html', 'multi-location.html'),
          div_selector: "div.tomorrow",
          full_screenshot_file: path.join(resourcesPath,"images", "multi-location_full_screenshot.png"),
          window_size: "800x800",
          crop_percentages: [
            [0.0, 0.0, 1.0, 1.0]
          ],
          output_files: [
            path.join(resourcesPath, "template","multi-location-cropped.png"),
          ],
        },
        {
          url: path.join(resourcesPath, 'html', 'upcoming-days.html'),
          div_selector: "div.tomorrow",
          full_screenshot_file: path.join(resourcesPath, "images", "upcoming-days_full_screenshot.png"),
          window_size: "800x800",
          crop_percentages: [
            [0.0, 0.0, 1.0, 1.0]
          ],
          output_files: [
            path.join(resourcesPath, "template","upcoming-days-cropped.png"),
          ],
        },
        {
          url: "https://www.massport.com/logan-airport/flights/flight-status",
          table_selector: "table.search-table",
          table_screenshot_file: "flight_status_table.png",
          rows_to_capture: 3,
          window_size: "1920x1080",
        },
        {
          url: "https://www.massport.com/logan-airport/flights/flight-status#departure",
          table_selector: "table.search-table",
          table_screenshot_file: "flight_departure_table.png",
          rows_to_capture: 3,
          window_size: "1920x1080",
        },
        {
          "url": path.join(resourcesPath, "template", "generated_template.html"),  
          "full_page": true,
          "full_screenshot_file": path.join(resourcesPath, "images","full_page_screenshot.png"),
          "window_size": "1920x1080",
      },
      ]);

      store.set('appInstalled', true);

      console.log('Initial data saved to the store.');
    }
  }
});


// Handle app lifecycle events
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    terminateFlaskProcess();
    app.quit();
  }
});

app.on('before-quit', () => {
  terminateFlaskProcess(); // Ensure termination before quit
});

app.on('quit', () => {
  console.log('Quitting app...');
  terminateFlaskProcess();
});

// Handle unexpected exits to ensure Flask is terminated
process.on('exit', () => {
  terminateFlaskProcess();
});

process.on('SIGINT', () => {
  terminateFlaskProcess();
  process.exit();
});

process.on('SIGTERM', () => {
  terminateFlaskProcess();
  process.exit();
});
