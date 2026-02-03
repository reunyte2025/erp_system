import React from 'react';
import ListHeader from './ListHeader';
import ListTable from './ListTable';
import CardGrid from './CardGrid';
import Pagination from './Pagination';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';

/**
 * ============================================================================
 * DYNAMIC LIST COMPONENT - REUSABLE LIST UI
 * ============================================================================
 * 
 * This is a PURE UI component that can render any list/table.
 * It is completely agnostic about the data it displays.
 * 
 * Key Principles:
 * - ZERO business logic
 * - ZERO API calls
 * - ZERO data fetching
 * - Configuration-driven
 * - Pure presentation
 * 
 * Responsibilities:
 * - Render header with title, stats, and actions
 * - Render search and filter UI
 * - Render table with dynamic columns
 * - Handle loading state
 * - Handle empty state
 * - Handle error state
 * - Render pagination controls
 * 
 * What it DOES NOT do:
 * - Fetch data
 * - Manage state
 * - Handle API errors
 * - Navigate
 * - Show toasts
 * 
 * Architecture Benefits:
 * - Used by ALL modules (Clients, Quotations, Projects, etc.)
 * - Single source of truth for list UI
 * - Consistent UX across entire application
 * - Easy to update styling globally
 * - Easy to add features (bulk actions, export, etc.)
 * 
 * @component
 */

/**
 * DynamicList Component
 * 
 * @param {Object} props - Component props
 * 
 * CONFIGURATION PROPS:
 * @param {Object} config - List configuration (from module config file)
 * @param {string} config.title - Page title (e.g., "Client List")
 * @param {string} config.icon - Icon component for header
 * @param {string} config.addButtonLabel - Label for add button
 * @param {boolean} config.showSearch - Show/hide search bar
 * @param {boolean} config.showFilter - Show/hide filter button
 * @param {Array} config.columns - Column definitions
 * 
 * DATA PROPS:
 * @param {Array} data - Array of items to display
 * @param {boolean} loading - Loading state
 * @param {string} error - Error message
 * @param {string} emptyMessage - Message when no data
 * 
 * PAGINATION PROPS:
 * @param {number} currentPage - Current page number
 * @param {number} totalPages - Total number of pages
 * @param {number} totalCount - Total number of items
 * @param {Function} onPageChange - Page change handler
 * 
 * ACTION PROPS:
 * @param {Function} onAdd - Add button click handler
 * @param {Function} onSearch - Search input handler
 * @param {Function} onFilterToggle - Filter toggle handler
 * @param {Function} onRowClick - Row click handler
 * 
 * STATE PROPS:
 * @param {string} searchTerm - Current search term
 * @param {boolean} showFilter - Filter panel visibility
 * 
 * @example
 * <DynamicList
 *   config={clientConfig}
 *   data={clients}
 *   loading={loading}
 *   error={error}
 *   currentPage={page}
 *   totalPages={totalPages}
 *   totalCount={totalCount}
 *   onPageChange={handlePageChange}
 *   onAdd={handleAdd}
 *   onSearch={handleSearch}
 *   onRowClick={handleRowClick}
 *   searchTerm={searchTerm}
 * />
 */
const DynamicList = ({
  // Configuration
  config,
  
  // Data
  data = [],
  loading = false,
  error = '',
  emptyMessage = 'No items found',
  
  // Pagination
  currentPage = 1,
  totalPages = 1,
  totalCount = 0,
  onPageChange,
  
  // Actions
  onAdd,
  onSearch,
  onFilterToggle,
  onRowClick,
  onRetry,
  
  // State
  searchTerm = '',
  showFilter = false,
  
  // Optional: Stats cards data
  statsCards = null,
}) => {
  // ============================================================================
  // VALIDATION
  // ============================================================================
  
  // Ensure config is provided
  if (!config) {
    console.error('DynamicList: config prop is required');
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
        Configuration error: config prop is required
      </div>
    );
  }

  // Ensure either columns (for table) or cardComponent (for cards) are defined
  if (config.layoutType === 'cards') {
    if (!config.cardComponent) {
      console.error('DynamicList: config.cardComponent is required for card layout');
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          Configuration error: cardComponent is required for card layout
        </div>
      );
    }
  } else {
    if (!config.columns || config.columns.length === 0) {
      console.error('DynamicList: config.columns is required for table layout');
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          Configuration error: columns are not defined for table layout
        </div>
      );
    }
  }

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  /**
   * Render appropriate state based on loading, error, and data
   */
  const renderContent = () => {
    // Loading state
    if (loading) {
      return <LoadingState message={config.loadingMessage || 'Loading...'} />;
    }

    // Error state
    if (error) {
      return (
        <ErrorState
          message={error}
          onRetry={onRetry}
        />
      );
    }

    // Empty state
    if (!data || data.length === 0) {
      return (
        <EmptyState
          icon={config.emptyIcon}
          message={emptyMessage}
          subMessage={
            searchTerm
              ? 'Try adjusting your search criteria'
              : config.emptySubMessage || `Start by adding your first ${config.title?.toLowerCase() || 'item'}`
          }
        />
      );
    }

    // Data rendering - Card layout or Table layout
    if (config.layoutType === 'cards' && config.cardComponent) {
      // Card-based layout (for Projects, etc.)
      return (
        <CardGrid
          data={data}
          renderCard={config.cardComponent}
          columns={config.gridColumns || { sm: 1, md: 2, lg: 3 }}
          gap={config.gridGap || 6}
          onCardClick={onRowClick}
        />
      );
    } else {
      // Table-based layout (for Clients, Quotations, etc.)
      return (
        <ListTable
          columns={config.columns}
          data={data}
          onRowClick={onRowClick}
        />
      );
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Optional: Stats Cards */}
      {statsCards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards}
        </div>
      )}

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl shadow-sm">
        {/* Header Section */}
        <ListHeader
          title={config.title}
          icon={config.icon}
          totalCount={totalCount}
          addButtonLabel={config.addButtonLabel}
          onAdd={onAdd}
          showSearch={config.showSearch !== false} // Default true
          showFilter={config.showFilter !== false} // Default true
          searchTerm={searchTerm}
          onSearch={onSearch}
          onFilterToggle={onFilterToggle}
          filterActive={showFilter}
          note={config.note}
        />

        {/* Content Section - Table/Cards/Loading/Error/Empty */}
        <div className={config.layoutType === 'cards' ? 'p-6' : 'overflow-x-auto'}>
          {renderContent()}
        </div>

        {/* Pagination Section */}
        {!loading && !error && data.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        )}
      </div>
    </div>
  );
};

export default DynamicList;

/**
 * ============================================================================
 * USAGE EXAMPLE
 * ============================================================================
 * 
 * // In Clients.jsx
 * import DynamicList from '@/components/ui/DynamicList/DynamicList';
 * import clientConfig from './client.config';
 * 
 * const Clients = () => {
 *   const [clients, setClients] = useState([]);
 *   const [loading, setLoading] = useState(true);
 *   const [error, setError] = useState('');
 *   const [page, setPage] = useState(1);
 *   const [searchTerm, setSearchTerm] = useState('');
 * 
 *   return (
 *     <DynamicList
 *       config={clientConfig}
 *       data={clients}
 *       loading={loading}
 *       error={error}
 *       currentPage={page}
 *       totalPages={10}
 *       totalCount={95}
 *       onPageChange={setPage}
 *       onAdd={() => navigate('/pos')}
 *       onSearch={setSearchTerm}
 *       onRowClick={(client) => navigate(`/clients/${client.id}`)}
 *       searchTerm={searchTerm}
 *     />
 *   );
 * };
 * 
 * ============================================================================
 * WHY THIS ARCHITECTURE?
 * ============================================================================
 * 
 * 1. DRY Principle (Don't Repeat Yourself)
 *    - List UI code written once
 *    - Used by 20+ modules
 *    - Update once, affects all modules
 * 
 * 2. Consistency
 *    - Same UI patterns across entire app
 *    - Same user experience everywhere
 *    - Easier for users to learn
 * 
 * 3. Maintainability
 *    - Bug fixes in one place
 *    - Feature additions benefit all modules
 *    - Clear separation of concerns
 * 
 * 4. Testability
 *    - Test once, works for all modules
 *    - Pure component, easy to test
 *    - No side effects
 * 
 * 5. Flexibility
 *    - Configuration-driven
 *    - Easy to customize per module
 *    - Can add features without breaking existing code
 * 
 * 6. Scalability
 *    - Adding new modules is trivial
 *    - Just create config file
 *    - No need to rewrite UI code
 * 
 * ============================================================================
 */