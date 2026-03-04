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
    <div className="p-4 sm:p-6 border-b border-gray-200">
      {/* Mobile Layout: Stack vertically */}
      <div className="block lg:hidden space-y-3">
        {/* Title Section - Mobile */}
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 truncate">{title}</h2>
            {totalCount !== undefined && (
              <p className="text-xs sm:text-sm text-gray-500">
                Total {totalCount.toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Search Bar - Mobile */}
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => onSearch && onSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            />
          </div>
        )}

        {/* Filter and Add Buttons - Mobile */}
        <div className="flex gap-2">
          {showFilter && (
            <button
              onClick={onFilterToggle}
              className={`flex-1 px-4 py-2 border rounded-lg transition-colors flex items-center justify-center gap-2 font-medium text-sm ${
                filterActive
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filter
            </button>
          )}
          {onAdd && addButtonLabel && (
            <button
              onClick={onAdd}
              className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
            >
              {Icon && <Icon className="w-4 h-4" />}
              {addButtonLabel}
            </button>
          )}
        </div>
      </div>

      {/* Desktop Layout: Single Line */}
      <div className={`hidden lg:flex items-center gap-4 ${note ? 'mb-4' : ''}`}>
        {/* Title Section */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {Icon && (
            <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center">
              <Icon className="w-6 h-6 text-white" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-gray-800 whitespace-nowrap">{title}</h2>
            {totalCount !== undefined && (
              <p className="text-sm text-gray-500 whitespace-nowrap">
                Total {totalCount.toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Spacer to push items to the right */}
        <div className="flex-1"></div>

        {/* Search Bar */}
        {showSearch && (
          <div className="relative w-80">
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
            className={`px-6 py-2.5 border rounded-lg transition-colors flex items-center gap-2 font-medium flex-shrink-0 ${
              filterActive
                ? 'border-teal-500 bg-teal-50 text-teal-700'
                : 'border-gray-300 hover:bg-gray-50 text-gray-700'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filter
          </button>
        )}

        {/* Add Button */}
        {onAdd && addButtonLabel && (
          <button
            onClick={onAdd}
            className="px-6 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2 font-medium flex-shrink-0"
          >
            {Icon && <Icon className="w-5 h-5" />}
            {addButtonLabel}
          </button>
        )}
      </div>

      {/* Optional Note */}
      {note && (
        <div className="text-sm text-red-600 mt-3 lg:mt-0">
          <span className="font-medium">Note:</span> {note}
        </div>
      )}
    </div>
  );
};

export default ListHeader;