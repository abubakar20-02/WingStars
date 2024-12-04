// EnhancedForm.jsx
import React, { useContext, useEffect, useState } from 'react';
import { FormContext } from '../context/FormContext'; // Adjust the path as needed
import SuccessSnackbar from './SuccessSnackbar';
import ErrorSnackbar from './ErrorSnackbar';
import AlertSnackbar from './AlertSnackbar';

export default function EnhancedForm() {
  const {
    scraper,
    apiEndpoint,
    formValues,
    setFormValues,
    comments,
    setComments,
    customComment,
    setCustomComment,
    showDropdown,
    setShowDropdown,
    filteredComments,
    setFilteredComments,
    isSubmitting,
    setIsSubmitting,
    isSendingEmail,
    setIsSendingEmail,
    imagePreview,
    setImagePreview,
    setImageDimensions,
    isModalOpen,
    setIsModalOpen,
    lastEmailSentTime,
    email, // Sender's email
    password, // Sender's password
    predefinedComments,
    apiDelay
  } = useContext(FormContext); // Hook called at top level

  // **Local States**
  const [storedEmails, setStoredEmails] = useState([]); // To store fetched emails
  const [localSnackbar, setLocalSnackbar] = useState({ open: false, message: '', type: '' });

  // **State Variables for Progress Tracking**
  const [totalEmailsToSend, setTotalEmailsToSend] = useState(0);
  const [emailsSent, setEmailsSent] = useState(0);
  const [sendProgress, setSendProgress] = useState(0); // Percentage

  // **Utility Function: Delay Execution**
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // **Handle Input Changes**
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  // **Handle Comment Changes**
  const handleCommentChange = (e) => {
    const value = e.target.value;
    setCustomComment(value);

    setFilteredComments(
      predefinedComments.filter((comment) =>
        comment.toLowerCase().includes(value.toLowerCase())
      )
    );
  };

  // **Handle Adding a Comment**
  const handleAddComment = () => {
    const trimmedComment = customComment.trim();
    if (trimmedComment && !comments.includes(trimmedComment)) {
      setComments((prev) => [...prev, trimmedComment]);
      setCustomComment('');
    } else if (comments.includes(trimmedComment)) {
      setLocalSnackbar({ open: true, message: 'Duplicate comment not allowed.', type: 'alert' });
    }
  };

  // **Handle Selecting a Comment from Dropdown**
  const handleSelectComment = (comment) => {
    setCustomComment(comment);
    setShowDropdown(false);
    handleAddComment(); // Automatically add the selected comment
  };


  // **Handle Removing a Comment**
  const handleRemoveComment = (commentToRemove) => {
    setComments((prevComments) =>
      prevComments.filter((comment) => comment !== commentToRemove)
    );
  };

  // **Handle Key Down Event for Enter Key**
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddComment();
    }
  };

  // **Fetch Stored Emails from the API on Component Mount**
  useEffect(() => {
    const fetchStoredEmails = async () => {
      try {
        const response = await fetch(`${apiEndpoint}/get-emails`, {
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'GET',
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
          // Filter to get only 'unsent' emails
          const unsentEmails = result.emails
            .filter((emailObj) => emailObj.status === 'unsent')
            .map((emailObj) => emailObj.email);
          setStoredEmails(unsentEmails);
        } else {
          setLocalSnackbar({
            open: true,
            message: result.message || 'Failed to fetch emails.',
            type: 'error',
          });
        }
      } catch (error) {
        console.error('Error fetching emails:', error);
      }
    };

    fetchStoredEmails();
  }, [apiEndpoint]);

  // **Handle Form Submission**
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Construct the data to send
    const dataToSend = {
      sites: scraper,
      data: [
        { title: 'TRUCKS', percentage: Number(formValues.trucks) || 0 },
        { title: 'TYPE I', percentage: Number(formValues.typeI) || 0 },
        { title: 'STAFF', percentage: Number(formValues.staff) || 0 },
        { title: 'TYPE IV', percentage: Number(formValues.typeIV) || 0 },
      ],
      comments,
      timer: apiDelay
    };

    console.log('Submitting Data:', dataToSend);

    try {
      const response = await fetch(`${apiEndpoint}/process-sites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Success:', result);

        setLocalSnackbar({ open: true, message: 'Data submitted successfully!', type: 'success' });

        // Reset form values and comments
        setFormValues({
          trucks: '',
          staff: '',
          typeI: '',
          typeIV: '',
        });
        setComments([]);
        setCustomComment('');

        // Fetch the updated image preview from the Flask backend
        const imageUrl = `${apiEndpoint}/images/full_page_screenshot.png?t=${new Date().getTime()}`;
        setImagePreview(imageUrl);

        // Reload image dimensions
        const img = new Image();
        img.src = imageUrl;
        img.onload = () => {
          setImageDimensions({ width: img.width, height: img.height });
        };
        img.onerror = (error) => {
          console.error('Error loading image preview after submission:', error);
          setImagePreview(null); // Ensure "No Preview" is shown
        };

        // After processing sites, fetch the updated list of unsent emails
        await fetchStoredEmails();
      } else {
        const errorData = await response.json();
        console.error('Error:', errorData.message || response.statusText);
        setLocalSnackbar({
          open: true,
          message: errorData.message || 'Failed to submit data.',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      // Set loading to false
      setIsSubmitting(false);
    }
  };

  // **Handle Send Email with Progress Tracking**
  const handleSendEmail = async () => {
    // **Validation Checks**
    if (!password) {
      setLocalSnackbar({ open: true, message: 'Please enter your email password.', type: 'error' });
      return;
    }

    if (storedEmails.length === 0) {
      setLocalSnackbar({ open: true, message: 'No emails to send.', type: 'alert' });
      return;
    }

    if (!imagePreview) {
      setLocalSnackbar({ open: true, message: 'No image to send.', type: 'error' });
      return;
    }

    setIsSendingEmail(true);
    setTotalEmailsToSend(storedEmails.length);
    setEmailsSent(0);
    setSendProgress(0);

    try {
      for (let i = 0; i < storedEmails.length; i++) {
        const recipientEmail = storedEmails[i];

        // **Prepare Payload for Single Email**
        const payload = {
          email: email, // Sender's email
          password: password, // Sender's password
          receiver: recipientEmail, // Single recipient
        };

        const response = await fetch(`${apiEndpoint}/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`Email sent to ${recipientEmail}:`, result);

          setEmailsSent((prev) => prev + 1);
          setSendProgress(Math.round(((i + 1) / storedEmails.length) * 100));

          // Update the list of storedEmails by removing the sent email
          setStoredEmails((prev) => prev.filter((email) => email !== recipientEmail));
        } else {
          const errorData = await response.json();
          console.error(`Error sending email to ${recipientEmail}:`, errorData.message || response.statusText);
          setLocalSnackbar({
            open: true,
            message: `Failed to send email to ${recipientEmail}: ${errorData.message || 'Unknown error.'}`,
            type: 'error',
          });
        }

        // **Optional Delay Between Sends to Avoid Overloading SMTP Server**
        await delay(1000); // 1 second delay
      }

      setLocalSnackbar({ open: true, message: 'All emails processed.', type: 'success' });

      // **Refresh the Unsent Emails List**
      await fetchStoredEmails();
    } catch (error) {
      console.error('Error during email sending process:', error);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // **Load the image preview and dimensions if not already loaded**
  useEffect(() => {
    if (imagePreview) return; // Prevent reloading if already loaded

    // Construct the image URL based on the Flask API endpoint
    const imageUrl = `${apiEndpoint}/images/full_page_screenshot.png?t=${new Date().getTime()}`;

    const img = new Image();
    img.src = imageUrl;

    img.onload = () => {
      setImagePreview(imageUrl);
      setImageDimensions({ width: img.width, height: img.height });
    };

    img.onerror = (error) => {
      console.error('Error loading image preview:', error);
      setImagePreview(null); // Ensure "No Preview" is shown
    };
  }, [imagePreview, setImagePreview, setImageDimensions, apiEndpoint]);

  // **Utility Function to Fetch Unsent Emails**
  const fetchStoredEmails = async () => {
    try {
      const response = await fetch(`${apiEndpoint}/get-emails`, {
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'GET',
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        // Filter to get only 'unsent' emails
        const unsentEmails = result.emails
          .filter((emailObj) => emailObj.status === 'unsent')
          .map((emailObj) => emailObj.email);
        setStoredEmails(unsentEmails);
        setTotalEmailsToSend(unsentEmails.length);
        setEmailsSent(0);
        setSendProgress(0);
      } else {
        setLocalSnackbar({
          open: true,
          message: result.message || 'Failed to fetch emails.',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
    }
  };

  return (
    <div className="container mx-auto p-4 relative">
      {/* Grid Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image Preview Section */}
        <div className="relative">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview Image</h2>
          <div
            className="image-preview-container border border-gray-300 rounded-md overflow-hidden flex justify-center items-center p-4 relative"
            style={{ height: '300px' }}
          >
            {/* Image or "No Preview" */}
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Preview"
                className="object-contain w-full h-full cursor-pointer"
                onClick={() => setIsModalOpen(true)}
                onError={() => {
                  console.error('Error loading image in preview.');
                  setImagePreview(null); // Trigger "No Preview" UI
                }}
              />
            ) : (
              // **Display "No Preview" with White Background and Center-Aligned Text**
              <div className="bg-white flex items-center justify-center w-full h-full">
                <p className="text-center text-gray-500">No Preview</p>
              </div>
            )}

            {/* **Circular Loader Overlay** */}
            {(isSubmitting || isSendingEmail) && (
              <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-40">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-500"></div>
              </div>
            )}
          </div>

          {/* Send via Email Button */}
          <div className="mt-4">
            <button
              type="button"
              className="rounded-md bg-[#1e3364] px-3 py-2 text-sm font-semibold text-[#f1bb27] shadow-sm hover:bg-[#163654] transition duration-200 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={isSendingEmail || isSubmitting || storedEmails.length === 0 || !imagePreview}
              onClick={handleSendEmail}
            >
              {isSendingEmail ? 'Sending...' : 'Send via Email'}
            </button>
            {/* Display tooltip or info if no emails are stored */}
            {storedEmails.length === 0 && (
              <p className="mt-2 text-sm text-gray-500">No emails available to send.</p>
            )}
          </div>

          {/* Progress Bar Component */}
          {isSendingEmail && (
            <div className="mt-4">
              <div
                className="w-full bg-gray-200 rounded-full h-4"
                role="progressbar"
                aria-valuenow={sendProgress}
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <div
                  className="h-4 rounded-full transition-all duration-500"
                  style={{
                    width: `${sendProgress}%`,
                    backgroundColor: '#f0ba26', // Custom color
                  }}
                ></div>
              </div>
              <p className="mt-2 text-sm text-gray-700">
                {emailsSent} of {totalEmailsToSend} emails sent.
              </p>
            </div>
          )}

          {lastEmailSentTime && (
            <p className="mt-2 text-sm text-gray-600">
              Last email sent: <span className="font-semibold">{lastEmailSentTime}</span>
            </p>
          )}
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="relative">
          <fieldset
            disabled={isSubmitting || isSendingEmail}
            aria-busy={isSubmitting || isSendingEmail}
            className="space-y-12"
          >
            <div className="border-b border-gray-900/10 pb-12">
              <h2 className="text-base font-semibold text-gray-900">Performance Input Form</h2>
              <p className="mt-1 text-sm text-gray-600">
                Fill in the details below and select or write your comments.
              </p>

              <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                {/* Trucks Input */}
                <div className="sm:col-span-3">
                  <label htmlFor="trucks" className="block text-sm font-medium text-gray-900">
                    Trucks (%)
                  </label>
                  <div className="mt-2">
                    <input
                      id="trucks"
                      name="trucks"
                      type="number"
                      min="0"
                      max="100"
                      value={formValues.trucks}
                      onChange={handleInputChange}
                      placeholder="Enter percentage"
                      className="block w-full rounded-md bg-white px-3 py-1.5 text-gray-900 border border-gray-300 placeholder-gray-400 focus:ring-[#1e3364] focus:border-[#1e3364] sm:text-sm"
                      required
                    />
                  </div>
                </div>

                {/* Type I Input */}
                <div className="sm:col-span-3">
                  <label htmlFor="typeI" className="block text-sm font-medium text-gray-900">
                    Type I (%)
                  </label>
                  <div className="mt-2">
                    <input
                      id="typeI"
                      name="typeI"
                      type="number"
                      min="0"
                      max="100"
                      value={formValues.typeI}
                      onChange={handleInputChange}
                      placeholder="Enter percentage"
                      className="block w-full rounded-md bg-white px-3 py-1.5 text-gray-900 border border-gray-300 placeholder-gray-400 focus:ring-[#1e3364] focus:border-[#1e3364] sm:text-sm"
                      required
                    />
                  </div>
                </div>

                {/* Staff Input */}
                <div className="sm:col-span-3">
                  <label htmlFor="staff" className="block text-sm font-medium text-gray-900">
                    Staff (%)
                  </label>
                  <div className="mt-2">
                    <input
                      id="staff"
                      name="staff"
                      type="number"
                      min="0"
                      max="100"
                      value={formValues.staff}
                      onChange={handleInputChange}
                      placeholder="Enter percentage"
                      className="block w-full rounded-md bg-white px-3 py-1.5 text-gray-900 border border-gray-300 placeholder-gray-400 focus:ring-[#1e3364] focus:border-[#1e3364] sm:text-sm"
                      required
                    />
                  </div>
                </div>


                {/* Type IV Input */}
                <div className="sm:col-span-3">
                  <label htmlFor="typeIV" className="block text-sm font-medium text-gray-900">
                    Type IV (%)
                  </label>
                  <div className="mt-2">
                    <input
                      id="typeIV"
                      name="typeIV"
                      type="number"
                      min="0"
                      max="100"
                      value={formValues.typeIV}
                      onChange={handleInputChange}
                      placeholder="Enter percentage"
                      className="block w-full rounded-md bg-white px-3 py-1.5 text-gray-900 border border-gray-300 placeholder-gray-400 focus:ring-[#1e3364] focus:border-[#1e3364] sm:text-sm"
                      required
                    />
                  </div>
                </div>

                {/* Comments Section */}
                <div className="sm:col-span-4 relative">
                  <label htmlFor="comments" className="block text-sm font-medium text-gray-900 mb-2">
                    Comment
                  </label>
                  <div className="mt-2">
                    <div className="flex">
                      <input
                        id="comments"
                        name="comments"
                        type="text"
                        value={customComment}
                        onChange={handleCommentChange}
                        onFocus={() => setShowDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                        onKeyDown={handleKeyDown}
                        placeholder="Write a comment or select from dropdown"
                        className="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-gray-900 placeholder-gray-400 focus:ring-[#1e3364] focus:border-[#1e3364] sm:text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleAddComment}
                        className="ml-2 rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-500 disabled:bg-green-400 disabled:cursor-not-allowed"
                        disabled={isSubmitting}
                      >
                        Add
                      </button>
                    </div>

                    {/* Dropdown for predefined comments */}
{/* Dropdown for predefined comments */}
{showDropdown && Array.isArray(filteredComments) && filteredComments.length > 0 && (
  <ul className="absolute z-10 mt-1 max-h-36 w-full overflow-y-auto bg-white rounded-md shadow-lg border border-gray-300">
    {filteredComments.map((option, index) => (
      <li
        key={index}
        onClick={() => handleSelectComment(option)}
        className="cursor-pointer px-3 py-1 hover:bg-indigo-100 text-sm text-gray-900"
      >
        {option}
      </li>
    ))}
  </ul>
)}

                  </div>
                  {/* Display added comments */}
                  <ul className="mt-2 text-sm text-gray-700">
                    {comments.map((comment, index) => (
                      <li key={index} className="mt-1 flex justify-between items-center">
                        {comment}
                        <button
                          type="button"
                          onClick={() => handleRemoveComment(comment)}
                          className="ml-2 text-red-600 text-sm hover:underline disabled:text-red-400 disabled:cursor-not-allowed"
                          disabled={isSubmitting}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </fieldset>

          {/* Submit Button */}
          <div className="mt-6 flex items-center justify-end gap-x-6">
            <button
              type="submit"
              className="rounded-md bg-[#1e3364] px-3 py-2 text-sm font-semibold text-[#f1bb27] shadow-sm hover:bg-[#163654] transition duration-200 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={isSubmitting || isSendingEmail}
            >
              {isSubmitting ? 'Processing...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>

      {/* Snackbars for Feedback */}
      {localSnackbar.open && localSnackbar.type === 'success' && (
        <SuccessSnackbar
          message={localSnackbar.message}
          onClose={() => setLocalSnackbar({ open: false, message: '', type: '' })}
        />
      )}
      {localSnackbar.open && localSnackbar.type === 'error' && (
        <ErrorSnackbar
          message={localSnackbar.message}
          onClose={() => setLocalSnackbar({ open: false, message: '', type: '' })}
        />
      )}
      {localSnackbar.open && localSnackbar.type === 'alert' && (
        <AlertSnackbar
          message={localSnackbar.message}
          onClose={() => setLocalSnackbar({ open: false, message: '', type: '' })}
        />
      )}

      {/* Modal for Image */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg relative w-[90vw] h-[90vh] flex flex-col justify-center items-center">
            <button
              className="absolute top-4 right-4 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center"
              onClick={() => setIsModalOpen(false)}
            >
              ✕
            </button>
            <img
              src={imagePreview}
              alt="Full Preview"
              className="object-contain max-w-full max-h-full"
              onError={(e) => {
                console.error('Error loading image in modal:', e);
                setLocalSnackbar({ open: true, message: 'Failed to load image in modal.', type: 'error' });
                setIsModalOpen(false); // Close modal if image fails to load
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
