// SettingsPage.jsx
import React, { useContext } from 'react';
import { FormContext } from '../context/FormContext'; // Adjust the path as needed
import SettingContainer from './setting-container';
import SuccessSnackbar from './SuccessSnackbar';
import ErrorSnackbar from './ErrorSnackbar';
import AlertSnackbar from './AlertSnackbar';

export default function SettingsPage() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    receiveEmail,
    setReceiveEmail,
    apiDelay,      // <--- Add this line
    setApiDelay,
    snackbar,
    setSnackbar,
  } = useContext(FormContext);

  // Handle form submission
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      // Perform any necessary validations or processing here

      // Update settings as needed (currently, settings are managed via context)

      // Display success message using snackbar
      setSnackbar({ open: true, message: 'Settings saved successfully!', type: 'success' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setSnackbar({ open: true, message: 'Failed to save settings.', type: 'error' });
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  // Local state for password visibility
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <SettingContainer title="Settings">
      <div className="divide-y divide-gray-200 px-6 py-8 sm:px-8 lg:px-10 space-y-8">
        <form className="space-y-12" onSubmit={handleSave}>
{/* Personal Information Section */}
<div className="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-3">
  <div>
    <h2 className="text-lg font-semibold text-gray-900">Sending Email</h2>
    <p className="mt-2 text-sm text-gray-500">
      Store your email and password securely.
    </p>
  </div>

  <div className="sm:col-span-2 space-y-6">
    {/* Simplified Inner Grid for Email and Password */}
    <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-6">
      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="block w-full rounded-md bg-white px-3 py-1.5 text-gray-900 border border-gray-300 placeholder-gray-400 focus:ring-[#1e3364] focus:border-[#1e3364] sm:text-sm"
          placeholder="your-email@example.com"
          required
        />
      </div>

      {/* Password Field */}
      <div className="relative">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          App Password
        </label>
        <div className="mt-0 relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full rounded-md bg-white px-3 py-1.5 text-gray-900 border border-gray-300 placeholder-gray-400 focus:ring-[#1e3364] focus:border-[#1e3364] sm:text-sm"
            placeholder="Enter your password"
            required
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
    </div>
  </div>
</div>



          {/* Receive Email Section */}
          <div className="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Delay</h2>
              <p className="mt-2 text-sm text-gray-500">
              Specify the delay time in seconds before screenshots are taken.
              </p>
            </div>

            <div className="sm:col-span-2">
              <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-6 sm:gap-x-6">
                {/* Receive Email Field */}
 {/* Delay Field */}
<div className="sm:col-span-3">
  <label htmlFor="delay" className="block text-sm font-medium text-gray-700">
    Delay (seconds)
  </label>
  <input
    id="delay"
    name="delay"
    type="number"
    min="1"
    value={apiDelay}
    onChange={(e) => setApiDelay(Number(e.target.value))}
    className="block w-full rounded-md bg-white px-3 py-1.5 text-gray-900 border border-gray-300 placeholder-gray-400 focus:ring-[#1e3364] focus:border-[#1e3364] sm:text-sm"
    placeholder="Enter delay in seconds"
    required
  />
</div>
              </div>
            </div>
          </div>
          

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-md bg-[#1e3364] px-3 py-2 text-sm font-semibold text-[#f1bb27] shadow-sm hover:bg-[#163654] transition duration-200 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={false} // Adjust based on your logic if needed
            >
              Save All Settings
            </button>
          </div>
        </form>
      </div>

      {/* Render Specific Snackbars within SettingsPage */}
      {snackbar.open && snackbar.type === 'success' && (
        <SuccessSnackbar
          message={snackbar.message}
          onClose={() => setSnackbar({ open: false, message: '', type: '' })}
        />
      )}
      {snackbar.open && snackbar.type === 'error' && (
        <ErrorSnackbar
          message={snackbar.message}
          onClose={() => setSnackbar({ open: false, message: '', type: '' })}
        />
      )}
      {snackbar.open && snackbar.type === 'alert' && (
        <AlertSnackbar
          message={snackbar.message}
          onClose={() => setSnackbar({ open: false, message: '', type: '' })}
        />
      )}
    </SettingContainer>
  );
}
