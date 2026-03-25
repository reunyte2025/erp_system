import React from 'react';

/**
 * ============================================================================
 * REDESIGNED EMPTY STATE COMPONENT
 * ============================================================================
 * Modern, friendly message when no data is available
 */

const EmptyState = ({
  icon: Icon,
  message = 'No items found',
  subMessage = 'Start by adding your first item',
}) => {
  return (
    <div className="flex items-center justify-center py-24 lg:py-32">
      <div className="text-center space-y-4 max-w-sm">
        {/* Icon */}
        {Icon && (
          <div className="relative w-16 h-16 mx-auto mb-2">
            <div className="absolute inset-0 bg-teal-100 rounded-2xl blur opacity-50"></div>
            <div className="relative w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center">
              <Icon className="w-8 h-8 text-teal-600" />
            </div>
          </div>
        )}

        {/* Message */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{message}</h3>
          {subMessage && (
            <p className="text-sm text-gray-500">{subMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmptyState;