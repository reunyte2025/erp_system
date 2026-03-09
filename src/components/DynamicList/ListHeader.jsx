import React from 'react';
import { Search, Filter } from 'lucide-react';

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
    <div className="p-4 sm:p-6 border-b-2 border-gray-300">

      {/* ── Mobile Layout ── */}
      <div className="block lg:hidden space-y-3">

        {/* Title row */}
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{title}</h2>
            {totalCount !== undefined && (
              <p className="text-xs sm:text-sm text-gray-600 font-medium">
                Total {totalCount.toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Search */}
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => onSearch && onSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 text-sm text-gray-800 placeholder-gray-400"
            />
          </div>
        )}

        {/* Filter + Add */}
        <div className="flex gap-2">
          {showFilter && (
            <button
              onClick={onFilterToggle}
              className={`flex-1 px-4 py-2 border-2 rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold text-sm ${
                filterActive
                  ? 'border-teal-600 bg-teal-50 text-teal-700'
                  : 'border-gray-300 hover:bg-gray-100 text-gray-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filter
            </button>
          )}
          {onAdd && addButtonLabel && (
            <button
              onClick={onAdd}
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 active:bg-teal-800 transition-colors flex items-center justify-center gap-2 font-semibold text-sm"
            >
              {Icon && <Icon className="w-4 h-4" />}
              {addButtonLabel}
            </button>
          )}
        </div>
      </div>

      {/* ── Desktop Layout ── */}
      <div className={`hidden lg:flex items-center gap-4 ${note ? 'mb-4' : ''}`}>

        {/* Title + icon */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {Icon && (
            <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center">
              <Icon className="w-6 h-6 text-white" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-gray-900 whitespace-nowrap">{title}</h2>
            {totalCount !== undefined && (
              <p className="text-sm text-gray-600 font-medium whitespace-nowrap">
                Total {totalCount.toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Search */}
        {showSearch && (
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => onSearch && onSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 text-gray-800 placeholder-gray-400"
            />
          </div>
        )}

        {/* Filter */}
        {showFilter && (
          <button
            onClick={onFilterToggle}
            className={`px-6 py-2.5 border-2 rounded-lg transition-colors flex items-center gap-2 font-semibold flex-shrink-0 ${
              filterActive
                ? 'border-teal-600 bg-teal-50 text-teal-700'
                : 'border-gray-300 hover:bg-gray-100 text-gray-700'
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
            className="px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 active:bg-teal-800 transition-colors flex items-center gap-2 font-semibold flex-shrink-0"
          >
            {Icon && <Icon className="w-5 h-5" />}
            {addButtonLabel}
          </button>
        )}
      </div>

      {/* Note */}
      {note && (
        <div className="text-sm text-red-600 mt-3 lg:mt-0 font-medium">
          <span className="font-bold">Note:</span> {note}
        </div>
      )}

    </div>
  );
};

export default ListHeader;