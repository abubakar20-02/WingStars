import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { useState, useEffect } from 'react';

export default function SuccessSnackbar({ message, onClose, duration = 3000 }) {
  // Automatically hide the snackbar after a specified duration
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer); // Cleanup the timer on unmount
    }
  }, [duration, onClose]);

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-md bg-green-50 p-4 shadow-lg">
      <div className="flex items-center">
        <CheckCircleIcon aria-hidden="true" className="h-5 w-5 text-green-400" />
        <p className="ml-3 text-sm font-medium text-green-800">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto inline-flex rounded-md bg-green-50 p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 focus:ring-offset-green-50"
        >
          <span className="sr-only">Dismiss</span>
          <XMarkIcon aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
