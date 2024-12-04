import { ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { useEffect } from 'react';

export default function AlertSnackbar({ message, onClose, duration = 3000 }) {
  // Automatically hide the snackbar after a specified duration
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer); // Clean up the timer on unmount
    }
  }, [duration, onClose]);

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-md bg-yellow-50 p-4 shadow-lg">
      <div className="flex items-center">
        <ExclamationCircleIcon aria-hidden="true" className="h-5 w-5 text-yellow-400" />
        <p className="ml-3 text-sm font-medium text-yellow-800">{message}</p>
        <button
          type="button"
          onClick={onClose} // Ensure this is correctly passed
          className="ml-auto inline-flex rounded-md bg-yellow-50 p-1.5 text-yellow-500 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:ring-offset-2 focus:ring-offset-yellow-50"
        >
          <span className="sr-only">Dismiss</span>
          <XMarkIcon aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
