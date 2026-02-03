import React from 'react';
import { Users } from 'lucide-react';

/**
 * ============================================================================
 * EMPTY STATE COMPONENT
 * ============================================================================
 * 
 * Displays a friendly message when no data is available.
 * Can show different messages for:
 * - Empty list (no data at all)
 * - No search results
 * 
 * @component
 */

const EmptyState = ({
  icon: Icon = Users,
  message = 'No items found',
  subMessage = 'Start by adding your first item',
}) => {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        {Icon && <Icon className="w-12 h-12 text-gray-400 mx-auto mb-4" />}
        <p className="text-gray-600 font-medium mb-2">{message}</p>
        {subMessage && (
          <p className="text-gray-500 text-sm">{subMessage}</p>
        )}
      </div>
    </div>
  );
};

export default EmptyState;