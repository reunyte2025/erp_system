import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * ============================================================================
 * LOADING STATE COMPONENT
 * ============================================================================
 * 
 * Displays a loading indicator with message.
 * Used when data is being fetched from API.
 * 
 * @component
 */

const LoadingState = ({ message = 'Loading...' }) => {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-teal-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
};

export default LoadingState;