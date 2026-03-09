import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
    <div className={`px-4 sm:px-6 py-3 sm:py-4 border-t-2 border-gray-300 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 ${className}`}>
      {showPageInfo && (
        <div className="text-xs sm:text-sm text-gray-700 font-medium order-2 sm:order-1">
          Page {currentPage} of {totalPages}
        </div>
      )}

      <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 border-2 border-teal-600 text-teal-700 rounded-lg hover:bg-teal-50 active:bg-teal-100 transition-colors flex items-center justify-center gap-1 sm:gap-2 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white touch-manipulation"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Previous</span>
          <span className="sm:hidden">Prev</span>
        </button>

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 border-2 border-teal-600 text-teal-700 rounded-lg hover:bg-teal-50 active:bg-teal-100 transition-colors flex items-center justify-center gap-1 sm:gap-2 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white touch-manipulation"
          aria-label="Next page"
        >
          Next
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;