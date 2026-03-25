import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * ============================================================================
 * REDESIGNED PAGINATION COMPONENT
 * ============================================================================
 * Modern pagination with clean, professional styling
 */

const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  showPageInfo = true,
  className = '',
}) => {
  const handlePrevious = () => {
    if (currentPage > 1 && onPageChange) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages && onPageChange) onPageChange(currentPage + 1);
  };

  if (totalPages <= 1) return null;

  return (
    <div
      className={`
        px-6 py-4 border-t border-gray-200/80
        flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6
        bg-gray-50/50
        ${className}
      `}
    >
      {/* Page Info */}
      {showPageInfo && (
        <div className="order-2 sm:order-1 text-sm font-medium text-gray-600">
          Page <span className="font-bold text-gray-900">{currentPage}</span> of{' '}
          <span className="font-bold text-gray-900">{totalPages}</span>
        </div>
      )}

      {/* Pagination Buttons */}
      <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-100 active:bg-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-lg font-medium text-sm hover:from-teal-600 hover:to-teal-700 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-teal-500 disabled:hover:to-teal-600 shadow-sm"
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;