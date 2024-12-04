// Example.jsx
import React, { useState, useEffect, useContext } from 'react';
import { FormContext } from '../context/FormContext'; // Adjust the path as needed
import SuccessSnackbar from './SuccessSnackbar';
import ErrorSnackbar from './ErrorSnackbar';
import AlertSnackbar from './AlertSnackbar';

export default function Example() {
  const {
    apiEndpoint,
    // ... other context values if needed
  } = useContext(FormContext); // Hook called at top level

  const [emails, setEmails] = useState([]); // Initialize with empty array
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [editEmail, setEditEmail] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false); // State for Add Email Modal
  const [isAddBulkModalOpen, setIsAddBulkModalOpen] = useState(false); // State for Bulk Add Modal
  const [newEmail, setNewEmail] = useState(''); // State for new email input
  const [bulkEmailsText, setBulkEmailsText] = useState(''); // State for bulk emails input
  const [localSnackbar, setLocalSnackbar] = useState({ open: false, message: '', type: '' });
  const [isLoading, setIsLoading] = useState(false); // Optional: Loading state
  const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState(false); // State for Batch Delete Confirmation

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Extract fetchEmails so it can be called independently
  const fetchEmails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${apiEndpoint}/get-emails`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        setEmails(result.emails);
      } else {
        setLocalSnackbar({
          open: true,
          message: result.message || 'Failed to fetch emails.',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
      setLocalSnackbar({
        open: true,
        message: 'An error occurred while fetching emails.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch emails from the API on component mount
  useEffect(() => {
    fetchEmails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiEndpoint]);

  // Handle Search Input and Reset to Page 1
  const handleSearch = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
    setCurrentPage(1); // Reset to first page on search
  };

  // Open Edit Modal and ensure other modals are closed
  const handleOpenModal = (email) => {
    setSelectedEmail(email);
    setEditEmail(email.email);
    setIsModalOpen(true);
    setIsAddModalOpen(false); // Ensure Add Email modal is closed
    setIsAddBulkModalOpen(false); // Ensure Bulk Add modal is closed
    setIsBatchDeleteConfirmOpen(false); // Ensure Batch Delete Confirmation modal is closed
  };

  // Close Edit Modal and reset selectedEmail
  const handleCloseEditModal = () => {
    setIsModalOpen(false);
    setSelectedEmail(null);
  };

  // Save Edited Email
  const handleSaveEdit = async () => {
    if (!editEmail.trim()) {
      setLocalSnackbar({ open: true, message: 'Email cannot be empty.', type: 'error' });
      return;
    }

    // Update the email in the database via API
    try {
      const response = await fetch(`${apiEndpoint}/update-email/${encodeURIComponent(selectedEmail.email)}`, {
        method: 'PUT', // or 'PATCH' based on your back-end implementation
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: editEmail, status: selectedEmail.status }),
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        console.log('Email updated:', editEmail);
        setLocalSnackbar({ open: true, message: 'Email updated successfully!', type: 'success' });
        handleCloseEditModal();
        fetchEmails(); // Reload data after update
      } else {
        setLocalSnackbar({ open: true, message: result.message || 'Failed to update email.', type: 'error' });
      }
    } catch (error) {
      console.error('Error updating email:', error);
      setLocalSnackbar({ open: true, message: 'An error occurred while updating the email.', type: 'error' });
    }
  };

  // Open Bulk Add Modal
  const handleOpenAddBulkModal = () => {
    setBulkEmailsText(''); // Clear any existing text in the textarea
    setIsAddBulkModalOpen(true); // Open the Bulk Add Modal
    setIsAddModalOpen(false); // Ensure the Add Email modal is closed
    setIsModalOpen(false); // Ensure the Edit/Delete modal is closed
    setIsBatchDeleteConfirmOpen(false); // Ensure the Batch Delete Confirmation modal is closed
  };

  // Close Bulk Add Modal
  const handleCloseAddBulkModal = () => {
    setIsAddBulkModalOpen(false); // Close the Bulk Add Modal
  };

  // Delete Email
  const handleDelete = async () => {
    if (!selectedEmail) return;

    // Delete the email via API
    try {
      const response = await fetch(`${apiEndpoint}/delete-email/${encodeURIComponent(selectedEmail.email)}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        console.log('Email deleted:', selectedEmail.email);
        setLocalSnackbar({ open: true, message: 'Email deleted successfully!', type: 'success' });
        handleCloseEditModal();
        fetchEmails(); // Reload data after deletion
      } else {
        setLocalSnackbar({ open: true, message: result.message || 'Failed to delete email.', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting email:', error);
      setLocalSnackbar({ open: true, message: 'An error occurred while deleting the email.', type: 'error' });
    }
  };

  // Toggle Sent Status
  const toggleSentStatus = async () => {
    if (!selectedEmail) return;

    // Toggle the status via API
    try {
      const newStatus = selectedEmail.status === 'sent' ? 'unsent' : 'sent';
      const response = await fetch(`${apiEndpoint}/update-email/${encodeURIComponent(selectedEmail.email)}`, {
        method: 'PUT', // or 'PATCH' based on your back-end implementation
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        console.log('Email status updated:', newStatus);
        setLocalSnackbar({ open: true, message: 'Email status updated successfully!', type: 'success' });
        handleCloseEditModal();
        fetchEmails(); // Reload data after status toggle
      } else {
        setLocalSnackbar({ open: true, message: result.message || 'Failed to update status.', type: 'error' });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setLocalSnackbar({ open: true, message: 'An error occurred while updating status.', type: 'error' });
    }
  };

  // Select/Deselect Single Email
  const handleSelectEmail = (email) => {
    if (selectedEmails.includes(email)) {
      setSelectedEmails(selectedEmails.filter((e) => e !== email));
    } else {
      setSelectedEmails([...selectedEmails, email]);
    }
  };

  // Select/Deselect All Emails
  const handleSelectAll = () => {
    if (selectedEmails.length === filteredEmails.length && filteredEmails.length > 0) {
      setSelectedEmails([]);
    } else {
      const allEmails = filteredEmails.map((entry) => entry.email);
      setSelectedEmails(allEmails);
    }
  };

  // Open Batch Delete Confirmation Modal
  const handleOpenBatchDeleteConfirm = () => {
    setIsBatchDeleteConfirmOpen(true);
    setIsModalOpen(false); // Ensure other modals are closed
    setIsAddBulkModalOpen(false); // Ensure Bulk Add modal is closed
    setIsAddModalOpen(false); // Ensure Add Email modal is closed
  };

  // Close Batch Delete Confirmation Modal
  const handleCloseBatchDeleteConfirm = () => {
    setIsBatchDeleteConfirmOpen(false);
  };

  // Batch Delete Selected Emails
  const handleBatchDelete = async () => {
    if (selectedEmails.length === 0) {
      setLocalSnackbar({ open: true, message: 'No emails selected for deletion.', type: 'alert' });
      return;
    }

    // Open confirmation modal instead of window.confirm
    handleOpenBatchDeleteConfirm();
  };

  // Open Add Email Modal and ensure other modals are closed
  const handleOpenAddModal = () => {
    setNewEmail('');
    setIsAddModalOpen(true);
    setIsModalOpen(false); // Ensure Edit/Delete modal is closed
    setIsAddBulkModalOpen(false); // Ensure Bulk Add modal is closed
    setIsBatchDeleteConfirmOpen(false); // Ensure Batch Delete Confirmation modal is closed
  };

  // Close Add Email Modal
  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
  };

  // Add New Email
  const handleAddEmail = async () => {
    if (!newEmail.trim()) {
      setLocalSnackbar({ open: true, message: 'Email cannot be empty.', type: 'error' });
      return;
    }

    // Simple email format validation
    const emailRegex = /^[\w\.-]+@[\w\.-]+\.\w+$/;
    if (!emailRegex.test(newEmail.trim().toLowerCase())) {
      setLocalSnackbar({ open: true, message: 'Invalid email format.', type: 'error' });
      return;
    }

    try {
      const response = await fetch(`${apiEndpoint}/add-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newEmail.trim().toLowerCase() }),
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        console.log('Email added:', newEmail);
        setLocalSnackbar({ open: true, message: 'Email added successfully!', type: 'success' });
        handleCloseAddModal();
        fetchEmails(); // Reload data after adding
      } else {
        setLocalSnackbar({ open: true, message: result.message || 'Failed to add email.', type: 'error' });
      }
    } catch (error) {
      console.error('Error adding email:', error);
      setLocalSnackbar({ open: true, message: 'An error occurred while adding the email.', type: 'error' });
    }
  };

  // Add Bulk Emails
  const handleAddBulkEmails = async () => {
    if (!bulkEmailsText.trim()) {
      setLocalSnackbar({ open: true, message: 'Please enter at least one email.', type: 'error' });
      return;
    }

    // Split the input by commas or new lines
    const emailArray = bulkEmailsText
      .split(/[\n,]+/)
      .map(email => email.trim().toLowerCase())
      .filter(email => email.length > 0);

    if (emailArray.length === 0) {
      setLocalSnackbar({ open: true, message: 'No valid emails found.', type: 'error' });
      return;
    }

    // Validate each email
    const emailRegex = /^[\w\.-]+@[\w\.-]+\.\w+$/;
    const invalidEmails = emailArray.filter(email => !emailRegex.test(email));

    if (invalidEmails.length > 0) {
      setLocalSnackbar({ open: true, message: `Invalid email format: ${invalidEmails.join(', ')}`, type: 'error' });
      return;
    }

    try {
      const response = await fetch(`${apiEndpoint}/add-emails`, { // Ensure this endpoint exists
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emails: emailArray }),
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        console.log('Bulk emails added:', emailArray);
        setLocalSnackbar({ open: true, message: 'Bulk emails added successfully!', type: 'success' });
        handleCloseAddBulkModal();
        fetchEmails(); // Reload data after adding
      } else {
        setLocalSnackbar({ open: true, message: result.message || 'Failed to add bulk emails.', type: 'error' });
      }
    } catch (error) {
      console.error('Error adding bulk emails:', error);
      setLocalSnackbar({ open: true, message: 'An error occurred while adding bulk emails.', type: 'error' });
    }
  };

  // Compute filtered emails based on search term
  const filteredEmails = emails.filter((entry) =>
    entry.email.toLowerCase().includes(searchTerm)
  );

  // Pagination Calculations
  const totalPages = Math.ceil(filteredEmails.length / itemsPerPage);
  const indexOfLastEmail = currentPage * itemsPerPage;
  const indexOfFirstEmail = indexOfLastEmail - itemsPerPage;
  const paginatedEmails = filteredEmails.slice(indexOfFirstEmail, indexOfLastEmail);

  // Handle Page Change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Generate Page Numbers
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header and Search Bar */}
      <div className="sm:flex sm:items-center mb-4">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold text-gray-900">Emails</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all emails with the ability to edit, delete, or toggle their status.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none flex space-x-4 justify-end">
          <button
            type="button"
            className="rounded-md bg-[#1e3364] px-3 py-2 text-sm font-semibold text-[#f1bb27] shadow-sm hover:bg-[#163654] transition duration-200 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={handleOpenAddBulkModal}
          >
            Add Bulk Mail
          </button>
          <button
            type="button"
            className="rounded-md bg-[#1e3364] px-3 py-2 text-sm font-semibold text-[#f1bb27] shadow-sm hover:bg-[#163654] transition duration-200 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={handleOpenAddModal}
          >
            Add Email
          </button>
        </div>
      </div>

      {/* Batch Delete Button */}
      <div className="mb-4">
        <button
          type="button"
          className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 transition duration-200 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed"
          onClick={handleBatchDelete}
          disabled={selectedEmails.length === 0}
        >
          Delete Selected
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search emails..."
          value={searchTerm}
          onChange={handleSearch}
          className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-[#1e3364] focus:ring-[#1e3364]"
        />
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="text-center text-gray-500 mb-4">Loading emails...</div>
      )}

      {/* Email Table */}
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black/5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    {/* Select All Checkbox */}
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmails.length === filteredEmails.length && filteredEmails.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-[#1e3364] shadow-sm focus:border-[#1e3364] focus:ring-[#1e3364]"
                      />
                    </th>

                    <th
                      scope="col"
                      className="py-3.5 pl-3 pr-3 text-left text-sm font-semibold text-gray-900"
                    >
                      Email
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Sent Status
                    </th>
                    <th
                      scope="col"
                      className="relative py-3.5 pl-3 pr-4 text-sm font-semibold sm:pr-6"
                    >
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {paginatedEmails.map((entry) => (
                    <tr key={entry.id || entry.email}>
                      {/* Checkbox for each email */}
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6">
                        <input
                          type="checkbox"
                          checked={selectedEmails.includes(entry.email)}
                          onChange={() => handleSelectEmail(entry.email)}
                          className="rounded border-gray-300 text-[#1e3364] shadow-sm focus:border-[#1e3364] focus:ring-[#1e3364]"
                        />
                      </td>
                      <td className="whitespace-nowrap py-4 pl-3 pr-3 text-sm text-gray-900">
                        {entry.email}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {entry.status === 'sent' ? 'Sent' : 'Not Sent'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <button
                          className="text-[#1e3364] hover:text-indigo-900"
                          onClick={() => handleOpenModal(entry)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paginatedEmails.length === 0 && !isLoading && (
                    <tr>
                      <td
                        colSpan="4"
                        className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 text-center"
                      >
                        No emails found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>



      {/* Add Email Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-8 w-96 shadow-lg relative">
            {/* Close button */}
            <button
              className="absolute top-2 right-2 bg-gray-200 text-gray-700 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-300 focus:outline-none"
              onClick={handleCloseAddModal}
            >
              ✕
            </button>
            <h2 className="text-xl font-semibold mb-6 text-center">Add New Email</h2>
            <div className="mb-6">
              <label htmlFor="new-email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-[#1e3364] focus:ring-[#1e3364]"
                placeholder="Enter email address"
              />
            </div>
            <div className="flex justify-between space-x-4">
              <button
                className="w-full py-2 rounded-md bg-gray-300 text-gray-700 font-semibold shadow-sm hover:bg-gray-400"
                onClick={handleCloseAddModal}
              >
                Cancel
              </button>
              <button
                className="w-full py-2 rounded-md bg-[#1e3364] text-white font-semibold shadow-sm hover:bg-[#1e3364]"
                onClick={handleAddEmail}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Email Modal */}
      {isAddBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-8 w-96 shadow-lg relative">
            {/* Close button */}
            <button
              className="absolute top-2 right-2 bg-gray-200 text-gray-700 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-300 focus:outline-none"
              onClick={handleCloseAddBulkModal}
            >
              ✕
            </button>
            <h2 className="text-xl font-semibold mb-6 text-center">Add Bulk Emails</h2>
            <div className="mb-6">
              <label htmlFor="bulk-emails" className="block text-sm font-medium text-gray-700 mb-2">
                Email Addresses
              </label>
              <textarea
                id="bulk-emails"
                value={bulkEmailsText}
                onChange={(e) => setBulkEmailsText(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-[#1e3364] focus:[#1e3364]"
                placeholder="Enter one email per line or separate them with commas."
                rows="6"
              />
            </div>
            <div className="flex justify-between space-x-4">
              <button
                className="w-full py-2 rounded-md bg-gray-300 text-gray-700 font-semibold shadow-sm hover:bg-gray-400"
                onClick={handleCloseAddBulkModal}
              >
                Cancel
              </button>
              <button
                className="w-full py-2 rounded-md bg-[#1e3364] text-white font-semibold shadow-sm hover:bg-[#163654]"
                onClick={handleAddBulkEmails}
              >
                Add Bulk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Delete Modal */}
      {isModalOpen && selectedEmail && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-8 w-96 shadow-lg relative">
            {/* Close button */}
            <button
              className="absolute top-2 right-2 bg-gray-200 text-gray-700 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-300 focus:outline-none"
              onClick={handleCloseEditModal}
            >
              ✕
            </button>
            <h2 className="text-xl font-semibold mb-6 text-center">Edit Email</h2>
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-[#1e3364] focus:ring-[#1e3364]"
              />
            </div>
            <div className="mb-6">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="status"
                value={selectedEmail.status}
                onChange={(e) =>
                  setSelectedEmail((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
                className="block w-full rounded-md border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-[#1e3364] focus:ring-[#1e3364]"
              >
                <option value="sent">Sent</option>
                <option value="unsent">Not Sent</option>
              </select>
            </div>
            <div className="flex justify-between space-x-4">
              <button
                className="w-full py-2 rounded-md bg-red-600 text-white font-semibold shadow-sm hover:bg-red-500"
                onClick={() => setIsDeleteConfirmOpen(true)}
              >
                Delete
              </button>
              <button
                className="w-full py-2 rounded-md bg-green-600 text-white font-semibold shadow-sm hover:bg-green-500"
                onClick={handleSaveEdit}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Single Deletion */}
      {isDeleteConfirmOpen && selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-10">
          <div className="bg-white rounded-lg p-6 w-80 shadow-lg text-center">
            <h3 className="text-lg font-semibold mb-4">Are you sure?</h3>
            <p className="text-sm text-gray-600 mb-6">Do you really want to delete this email?</p>
            <div className="flex justify-center space-x-4">
              <button
                className="px-4 py-2 rounded-md bg-gray-300 text-gray-700 font-semibold shadow-sm hover:bg-gray-400"
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md bg-red-600 text-white font-semibold shadow-sm hover:bg-red-500"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Batch Deletion */}
      {isBatchDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-80 shadow-lg text-center">
            <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete {selectedEmails.length} selected email(s)?
            </p>
            <div className="flex justify-center space-x-4">
              <button
                className="px-4 py-2 rounded-md bg-gray-300 text-gray-700 font-semibold shadow-sm hover:bg-gray-400"
                onClick={handleCloseBatchDeleteConfirm}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md bg-red-600 text-white font-semibold shadow-sm hover:bg-red-500"
                onClick={async () => {
                  handleCloseBatchDeleteConfirm();
                  try {
                    const response = await fetch(`${apiEndpoint}/delete-emails`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ emails: selectedEmails }),
                    });

                    const result = await response.json();

                    if (response.ok && result.status === 'success') {
                      const { deleted_emails, not_found_emails } = result;

                      // Reset selected emails
                      setSelectedEmails([]);

                      // Provide feedback to the user
                      let message = `${deleted_emails.length} email(s) deleted successfully.`;
                      if (not_found_emails.length > 0) {
                        message += ` ${not_found_emails.length} email(s) were not found.`;
                      }
                      setLocalSnackbar({ open: true, message, type: 'success' });

                      fetchEmails(); // Reload data after batch deletion
                    } else {
                      // Handle errors returned by the API
                      setLocalSnackbar({ open: true, message: result.message || 'Failed to delete emails.', type: 'error' });
                    }
                  } catch (error) {
                    console.error('Error deleting emails:', error);
                    setLocalSnackbar({ open: true, message: 'An error occurred while deleting emails.', type: 'error' });
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Add Email Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-8 w-96 shadow-lg relative">
            {/* Close button */}
            <button
              className="absolute top-2 right-2 bg-gray-200 text-gray-700 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-300 focus:outline-none"
              onClick={handleCloseAddModal}
            >
              ✕
            </button>
            <h2 className="text-xl font-semibold mb-6 text-center">Add New Email</h2>
            <div className="mb-6">
              <label htmlFor="new-email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-[#1e3364] focus:ring-[#1e3364]"
                placeholder="Enter email address"
              />
            </div>
            <div className="flex justify-between space-x-4">
              <button
                className="w-full py-2 rounded-md bg-gray-300 text-gray-700 font-semibold shadow-sm hover:bg-gray-400"
                onClick={handleCloseAddModal}
              >
                Cancel
              </button>
              <button
                className="w-full py-2 rounded-md bg-[#1e3364] text-white font-semibold shadow-sm hover:bg-[#163654]"
                onClick={handleAddEmail}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Email Modal */}
      {isAddBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-8 w-96 shadow-lg relative">
            {/* Close button */}
            <button
              className="absolute top-2 right-2 bg-gray-200 text-gray-700 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-300 focus:outline-none"
              onClick={handleCloseAddBulkModal}
            >
              ✕
            </button>
            <h2 className="text-xl font-semibold mb-6 text-center">Add Bulk Emails</h2>
            <div className="mb-6">
              <label htmlFor="bulk-emails" className="block text-sm font-medium text-gray-700 mb-2">
                Email Addresses
              </label>
              <textarea
                id="bulk-emails"
                value={bulkEmailsText}
                onChange={(e) => setBulkEmailsText(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-[#1e3364] focus:ring-[#1e3364]"
                placeholder="Enter one email per line or separate them with commas."
                rows="6"
              />
            </div>
            <div className="flex justify-between space-x-4">
              <button
                className="w-full py-2 rounded-md bg-gray-300 text-gray-700 font-semibold shadow-sm hover:bg-gray-400"
                onClick={handleCloseAddBulkModal}
              >
                Cancel
              </button>
              <button
                className="w-full py-2 rounded-md bg-[#1e3364] text-white font-semibold shadow-sm hover:bg-[#163654]"
                onClick={handleAddBulkEmails}
              >
                Add Bulk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Delete Modal */}
      {isModalOpen && selectedEmail && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-8 w-96 shadow-lg relative">
            {/* Close button */}
            <button
              className="absolute top-2 right-2 bg-gray-200 text-gray-700 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-300 focus:outline-none"
              onClick={handleCloseEditModal}
            >
              ✕
            </button>
            <h2 className="text-xl font-semibold mb-6 text-center">Edit Email</h2>
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-[#1e3364] focus:ring-[#1e3364]"
              />
            </div>
            <div className="mb-6">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="status"
                value={selectedEmail.status}
                onChange={(e) =>
                  setSelectedEmail((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
                className="block w-full rounded-md border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-[#1e3364] focus:ring-[#1e3364]"
              >
                <option value="sent">Sent</option>
                <option value="unsent">Not Sent</option>
              </select>
            </div>
            <div className="flex justify-between space-x-4">
              <button
                className="w-full py-2 rounded-md bg-red-600 text-white font-semibold shadow-sm hover:bg-red-500"
                onClick={() => setIsDeleteConfirmOpen(true)}
              >
                Delete
              </button>
              <button
                className="w-full py-2 rounded-md bg-green-600 text-white font-semibold shadow-sm hover:bg-green-500"
                onClick={handleSaveEdit}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Single Deletion */}
      {isDeleteConfirmOpen && selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-80 shadow-lg text-center">
            <h3 className="text-lg font-semibold mb-4">Are you sure?</h3>
            <p className="text-sm text-gray-600 mb-6">Do you really want to delete this email?</p>
            <div className="flex justify-center space-x-4">
              <button
                className="px-4 py-2 rounded-md bg-gray-300 text-gray-700 font-semibold shadow-sm hover:bg-gray-400"
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md bg-red-600 text-white font-semibold shadow-sm hover:bg-red-500"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Batch Deletion */}
      {isBatchDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-80 shadow-lg text-center">
            <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete {selectedEmails.length} selected email(s)?
            </p>
            <div className="flex justify-center space-x-4">
              <button
                className="px-4 py-2 rounded-md bg-gray-300 text-gray-700 font-semibold shadow-sm hover:bg-gray-400"
                onClick={handleCloseBatchDeleteConfirm}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md bg-red-600 text-white font-semibold shadow-sm hover:bg-red-500"
                onClick={async () => {
                  handleCloseBatchDeleteConfirm();
                  try {
                    const response = await fetch(`${apiEndpoint}/delete-emails`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ emails: selectedEmails }),
                    });

                    const result = await response.json();

                    if (response.ok && result.status === 'success') {
                      const { deleted_emails, not_found_emails } = result;

                      // Reset selected emails
                      setSelectedEmails([]);

                      // Provide feedback to the user
                      let message = `${deleted_emails.length} email(s) deleted successfully.`;
                      setLocalSnackbar({ open: true, message, type: 'success' });

                      fetchEmails(); // Reload data after batch deletion
                    } else {
                      // Handle errors returned by the API
                      setLocalSnackbar({ open: true, message: result.message || 'Failed to delete emails.', type: 'error' });
                    }
                  } catch (error) {
                    console.error('Error deleting emails:', error);
                    setLocalSnackbar({ open: true, message: 'An error occurred while deleting emails.', type: 'error' });
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <nav className="flex space-x-1" aria-label="Pagination">
            {/* Previous Button */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-md border ${
                currentPage === 1
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Previous
            </button>

            {/* Page Numbers */}
            {pageNumbers.map((number) => (
              <button
                key={number}
                onClick={() => handlePageChange(number)}
                className={`px-3 py-1 rounded-md border ${
                  currentPage === number
                    ? 'bg-[#1e3364] text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {number}
              </button>
            ))}

            {/* Next Button */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded-md border ${
                currentPage === totalPages
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Next
            </button>
          </nav>
        </div>
      )}

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
    </div>
  );
}
