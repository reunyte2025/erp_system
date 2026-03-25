import React from 'react';

/**
 * ============================================================================
 * REDESIGNED LOADING STATE COMPONENT
 * ============================================================================
 * Modern loading indicator with smooth animation
 */

const LoadingState = ({ message = 'Loading...' }) => {
  return (
    <div className="flex items-center justify-center py-24 lg:py-32">
      <div className="text-center space-y-4">
        {/* Animated spinner */}
        <div className="relative w-12 h-12 mx-auto">
          <div className="absolute inset-0 rounded-full border-3 border-gray-200"></div>
          <div
            className="absolute inset-0 rounded-full border-3 border-transparent border-t-teal-500 border-r-teal-500"
            style={{
              animation: 'spin 1s linear infinite',
            }}
          ></div>
        </div>
        
        <p className="text-gray-600 font-medium text-base">{message}</p>
        <p className="text-gray-500 text-sm">Please wait...</p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingState;