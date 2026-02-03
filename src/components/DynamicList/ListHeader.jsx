import React from 'react';
import { Search, Filter } from 'lucide-react';

/**
 * ============================================================================
 * LIST HEADER COMPONENT
 * ============================================================================
 * 
 * Renders the header section of a list:
 * - Title with icon
 * - Total count
 * - Add button
 * - Search bar
 * - Filter button
 * - Optional note/instruction
 * 
 * Pure presentational component with no business logic.
 * 
 * @component
 */

const ListHeader = ({
  title,
  icon: Icon,
  totalCount,
  addButtonLabel,
  onAdd,
  showSearch = true,
  showFilter = true,
  searchTerm = '',
  onSearch,
  onFilterToggle,
  filterActive = false,
  note,
}) => {
  return (
    <div className="p-6 border-b border-gray-200">
      {/* Title and Add Button */}
      <div className="flex items-center justify-between mb-6">
        {/* Title Section */}
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center">
              <Icon className="w-6 h-6 text-white" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            {totalCount !== undefined && (
              <p className="text-sm text-gray-500">
                Total {totalCount.toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Add Button */}
        {onAdd && addButtonLabel && (
          <button
            onClick={onAdd}
            className="px-6 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2 font-medium"
          >
            {Icon && <Icon className="w-5 h-5" />}
            {addButtonLabel}
          </button>
        )}
      </div>

      {/* Search and Filter */}
      {(showSearch || showFilter) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Bar */}
          {showSearch && (
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => onSearch && onSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Filter Button */}
          {showFilter && (
            <button
              onClick={onFilterToggle}
              className={`px-6 py-2.5 border rounded-lg transition-colors flex items-center justify-center gap-2 font-medium ${
                filterActive
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'
              }`}
            >
              <Filter className="w-5 h-5" />
              Filter
            </button>
          )}
        </div>
      )}

      {/* Optional Note */}
      {note && (
        <div className="mt-4 text-sm text-red-600">
          <span className="font-medium">Note:</span> {note}
        </div>
      )}
    </div>
  );
};

export default ListHeader;