import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * ============================================================================
 * PAGINATION COMPONENT
 * ============================================================================
 * 
 * Renders pagination controls with:
 * - Current page / total pages display
 * - Previous button
 * - Next button
 * - Disabled states
 * 
 * This component only handles UI.
 * Page change logic is handled by parent component.
 * 
 * @component
 */

const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  showPageInfo = true,
  className = '',
}) => {
  /**
   * Handle previous page
   */
  const handlePrevious = () => {
    if (currentPage > 1 && onPageChange) {
      onPageChange(currentPage - 1);
    }
  };

  /**
   * Handle next page
   */
  const handleNext = () => {
    if (currentPage < totalPages && onPageChange) {
      onPageChange(currentPage + 1);
    }
  };

  // Don't render if only one page
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={`px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 ${className}`}>
      {/* Page Info */}
      {showPageInfo && (
        <div className="text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
          Page {currentPage} of {totalPages}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
        {/* Previous Button */}
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 border border-teal-500 text-teal-600 rounded-lg hover:bg-teal-50 active:bg-teal-100 transition-colors flex items-center justify-center gap-1 sm:gap-2 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white touch-manipulation"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Previous</span>
          <span className="sm:hidden">Prev</span>
        </button>

        {/* Next Button */}
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 border border-teal-500 text-teal-600 rounded-lg hover:bg-teal-50 active:bg-teal-100 transition-colors flex items-center justify-center gap-1 sm:gap-2 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white touch-manipulation"
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

/**
 * ============================================================================
 * ENHANCED PAGINATION (OPTIONAL - FOR FUTURE)
 * ============================================================================
 * 
 * You can enhance this component with:
 * 
 * 1. Page Number Buttons
 * <button onClick={() => onPageChange(1)}>1</button>
 * <button onClick={() => onPageChange(2)}>2</button>
 * ...
 * 
 * 2. Jump to Page Input
 * <input
 *   type="number"
 *   min={1}
 *   max={totalPages}
 *   value={jumpPage}
 *   onChange={(e) => setJumpPage(e.target.value)}
 * />
 * <button onClick={() => onPageChange(jumpPage)}>Go</button>
 * 
 * 3. Items Per Page Selector
 * <select value={pageSize} onChange={(e) => onPageSizeChange(e.target.value)}>
 *   <option value={10}>10 per page</option>
 *   <option value={25}>25 per page</option>
 *   <option value={50}>50 per page</option>
 * </select>
 * 
 * 4. First/Last Buttons
 * <button onClick={() => onPageChange(1)}>First</button>
 * <button onClick={() => onPageChange(totalPages)}>Last</button>
 * 
 * 5. Ellipsis for Large Page Counts
 * 1 ... 5 6 [7] 8 9 ... 100
 * 
 * ============================================================================
 */