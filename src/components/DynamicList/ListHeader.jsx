import React from 'react';
import { Search, Filter, Plus } from 'lucide-react';

/**
 * ============================================================================
 * COMPACT INLINE LIST HEADER COMPONENT
 * ============================================================================
 * Modern, compact inline header with:
 * - Single row layout (all controls inline)
 * - Curvy, modern search bar
 * - Clean, professional appearance
 * - Fixed Note styling (only behind text, not full width)
 */

const ListHeader = ({
  title,
  icon: Icon,
  addButtonLabel,
  onAdd,
  showSearch = true,
  showFilter = true,
  searchTerm = '',
  onSearch,
  onFilterToggle,
  filterActive = false,
  note,
  controls,
}) => {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 border-b border-gray-200/80 space-y-2.5">
      {/* ── INLINE HEADER (All controls in one row) ── */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        {/* Title */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {Icon && (
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
              <Icon className="w-5 h-5 sm:w-5 sm:h-5 text-white" />
            </div>
          )}
          <div className="flex-shrink-0">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 whitespace-nowrap">{title}</h2>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1 hidden sm:block" />

        {/* Search Bar - Modern Curvy */}
        {showSearch && (
          <div className="relative flex-1 sm:flex-initial sm:min-w-64 max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => onSearch && onSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-300 rounded-full text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent focus:bg-white transition-all duration-300 shadow-sm hover:border-gray-400"
            />
          </div>
        )}

        {controls && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {controls}
          </div>
        )}

        {/* Filter Button */}
        {showFilter && (
          <button
            onClick={onFilterToggle}
            className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 border flex-shrink-0 ${
              filterActive
                ? 'border-teal-600 bg-teal-50 text-teal-700 shadow-sm'
                : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
            }`}
            title="Filter options"
          >
            <Filter className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline text-sm">Filter</span>
          </button>
        )}

        {/* Add Button */}
        {onAdd && addButtonLabel && (
          <button
            onClick={onAdd}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-lg font-medium text-sm hover:from-teal-600 hover:to-teal-700 active:scale-95 transition-all duration-200 shadow-sm flex-shrink-0"
            title={addButtonLabel}
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline text-sm">Add</span>
          </button>
        )}
      </div>

      {/* Note (Compact - only behind text) */}
      {note && (
        <div className="inline-block">
          <div className="text-sm font-medium text-red-700 bg-red-100 rounded-lg px-3 py-1.5 border border-red-300">
            <span className="font-bold">Note:</span> {note}
          </div>
        </div>
      )}
    </div>
  );
};

export default ListHeader;
