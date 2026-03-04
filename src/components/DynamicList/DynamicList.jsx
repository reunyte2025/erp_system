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

  // Sorting
  onSort,
  sortBy = '',
  sortOrder = 'asc',
  
  // State
  searchTerm = '',
  showFilter = false,
  
  // Optional: Stats cards data
  statsCards = null,
}) => {
  // ============================================================================
  // VALIDATION
  // ============================================================================
  
  if (!config) {
    console.error('DynamicList: config prop is required');
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
        Configuration error: config prop is required
      </div>
    );
  }

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

  const renderContent = () => {
    if (loading) {
      return <LoadingState message={config.loadingMessage || 'Loading...'} />;
    }

    if (error) {
      return (
        <ErrorState
          message={error}
          onRetry={onRetry}
        />
      );
    }

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

    if (config.layoutType === 'cards' && config.cardComponent) {
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
      return (
        <ListTable
          columns={config.columns}
          data={data}
          onRowClick={onRowClick}
          onSort={onSort}
          sortBy={sortBy}
          sortOrder={sortOrder}
        />
      );
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
      {/* Optional: Stats Cards */}
      {statsCards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statsCards}
        </div>
      )}

      {/* Main Content Card */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
        {/* Header Section */}
        <ListHeader
          title={config.title}
          icon={config.icon}
          totalCount={totalCount}
          addButtonLabel={config.addButtonLabel}
          onAdd={onAdd}
          showSearch={config.showSearch !== false}
          showFilter={config.showFilter !== false}
          searchTerm={searchTerm}
          onSearch={onSearch}
          onFilterToggle={onFilterToggle}
          filterActive={showFilter}
          note={config.note}
        />

        {/* Content Section - Table/Cards/Loading/Error/Empty */}
        <div className={config.layoutType === 'cards' ? 'p-4 sm:p-6' : 'overflow-x-auto'}>
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