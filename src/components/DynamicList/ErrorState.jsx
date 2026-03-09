import React from 'react';
import { AlertCircle } from 'lucide-react';

const ErrorState = ({
  message = 'An error occurred',
  onRetry,
  showRetry = true,
}) => {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 font-semibold mb-2">Error Loading Data</p>
        <p className="text-gray-700 text-sm mb-4">{message}</p>
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 active:bg-teal-800 transition-colors font-semibold shadow-md"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorState;