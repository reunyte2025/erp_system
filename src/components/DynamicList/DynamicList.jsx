import React from 'react';
import ListHeader from './ListHeader';
import ListTable from './ListTable';
import CardGrid from './CardGrid';
import Pagination from './Pagination';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';

const DynamicList = ({
  config,
  data = [],
  loading = false,
  error = '',
  emptyMessage = 'No items found',
  currentPage = 1,
  totalPages = 1,
  totalCount = 0,
  onPageChange,
  onAdd,
  onSearch,
  onFilterToggle,
  onRowClick,
  onRetry,
  onSort,
  sortBy = '',
  sortOrder = 'asc',
  searchTerm = '',
  showFilter = false,
  statsCards = null,
  actionHandlers = {},
}) => {
  if (!config) {
    return (
      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 text-red-700 font-medium">
        Configuration error: config prop is required
      </div>
    );
  }

  if (config.layoutType === 'cards') {
    if (!config.cardComponent) {
      return (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 text-red-700 font-medium">
          Configuration error: cardComponent is required for card layout
        </div>
      );
    }
  } else {
    if (!config.columns || config.columns.length === 0) {
      return (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 text-red-700 font-medium">
          Configuration error: columns are not defined for table layout
        </div>
      );
    }
  }

  const renderContent = () => {
    if (loading) {
      return <LoadingState message={config.loadingMessage || 'Loading...'} />;
    }

    if (error) {
      return <ErrorState message={error} onRetry={onRetry} />;
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
          actionHandlers={actionHandlers}
        />
      );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
      {statsCards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statsCards}
        </div>
      )}

      <div className="bg-white rounded-xl sm:rounded-2xl border-2 border-gray-300 overflow-hidden">
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

        <div className={config.layoutType === 'cards' ? 'p-4 sm:p-6' : 'overflow-x-auto'}>
          {renderContent()}
        </div>

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