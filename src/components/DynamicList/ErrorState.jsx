import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

/**
 * ============================================================================
 * REDESIGNED ERROR STATE COMPONENT
 * ============================================================================
 * Modern error display with professional styling
 */

const ErrorState = ({
  message = 'An error occurred while loading data',
  onRetry,
  showRetry = true,
}) => {
  return (
    <div className="flex items-center justify-center py-24 lg:py-32">
      <div className="text-center space-y-5 max-w-sm">
        {/* Error Icon */}
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 bg-red-100 rounded-2xl blur opacity-50"></div>
          <div className="relative w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        {/* Error Message */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Data</h3>
          <p className="text-sm text-gray-600">{message}</p>
        </div>

        {/* Retry Button */}
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-lg font-medium text-sm hover:from-teal-600 hover:to-teal-700 active:scale-95 transition-all duration-200 shadow-md mt-2"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorState;