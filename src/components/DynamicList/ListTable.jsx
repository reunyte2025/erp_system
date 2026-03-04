import React from 'react';

/**
 * ============================================================================
 * LIST TABLE COMPONENT
 * ============================================================================
 *
 * Fully contained horizontal scroll — nothing outside this component moves.
 * Supports sortable columns via onSort / sortBy / sortOrder props.
 *
 * Sort UI:
 * - Inactive sortable columns: faint double-arrow hint on hover
 * - Active column: single chevron that flips smoothly (↑ / ↓) in teal
 * - Active header text + subtle teal background highlight
 * - All transitions are CSS-based for silky smoothness
 */

// ── Sort indicator ────────────────────────────────────────────────────────────
const SortIndicator = ({ field, sortBy, sortOrder }) => {
  const isActive = sortBy === field;

  if (isActive) {
    return (
      <span
        className="inline-flex items-center justify-center ml-1.5 w-4 h-4 rounded bg-teal-500/15 flex-shrink-0"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className="text-teal-500"
          style={{
            transform: sortOrder === 'asc' ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <path
            d="M2 6.5L5 3.5L8 6.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  // Inactive — faint double arrows, revealed on header hover
  return (
    <span
      className="inline-flex flex-col items-center justify-center ml-1.5 gap-[1px] flex-shrink-0
                 opacity-0 group-hover:opacity-35 transition-opacity duration-150"
      aria-hidden="true"
    >
      <svg width="8" height="5" viewBox="0 0 8 5" fill="none" className="text-gray-500">
        <path d="M4 0L7.46 4.5H0.54L4 0Z" fill="currentColor" />
      </svg>
      <svg width="8" height="5" viewBox="0 0 8 5" fill="none" className="text-gray-500">
        <path d="M4 5L0.54 0.5H7.46L4 5Z" fill="currentColor" />
      </svg>
    </span>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const ListTable = ({
  columns = [],
  data = [],
  onRowClick,
  onSort,
  sortBy = '',
  sortOrder = 'asc',
}) => {
  const getNestedValue = (obj, path) =>
    path.split('.').reduce((cur, key) => cur?.[key], obj);

  const renderCell = (column, row, index) => {
    if (column.render && typeof column.render === 'function') {
      return column.render(row, index);
    }
    if (column.accessor) {
      const value = getNestedValue(row, column.accessor);
      if (value === null || value === undefined)
        return <span className="text-gray-400">N/A</span>;
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (typeof value === 'number') return value.toLocaleString();
      return value;
    }
    return null;
  };

  const handleRowClick = (row) => {
    if (onRowClick && typeof onRowClick === 'function') onRowClick(row);
  };

  const handleHeaderClick = (col) => {
    if (col.sortField && onSort && typeof onSort === 'function') {
      onSort(col.sortField);
    }
  };

  const alignClass = (align) =>
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

  return (
    <>
      <div className="list-table-scroll-host">
        <table
          className="divide-y divide-gray-200"
          style={{ minWidth: '1080px', width: '100%' }}
        >
          {/* ── Header ── */}
          <thead>
            <tr className="bg-gray-50">
              {columns.map((col) => {
                const isSortable = !!col.sortField && !!onSort;
                const isActive   = isSortable && sortBy === col.sortField;

                return (
                  <th
                    key={col.key}
                    onClick={() => handleHeaderClick(col)}
                    className={[
                      'px-4 sm:px-6 py-3 sm:py-4',
                      'text-xs font-semibold uppercase tracking-wider whitespace-nowrap select-none',
                      alignClass(col.headerAlign ?? col.align),
                      isSortable ? 'cursor-pointer group' : '',
                      isSortable ? 'transition-colors duration-150 hover:bg-teal-50/70 active:bg-teal-100/60' : '',
                      isActive ? 'text-teal-600 bg-teal-50/50' : 'text-gray-500',
                    ].filter(Boolean).join(' ')}
                    style={{ width: col.width }}
                  >
                    <span className="inline-flex items-center">
                      {col.label}
                      {isSortable && (
                        <SortIndicator
                          field={col.sortField}
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                        />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody className="divide-y divide-gray-100 bg-white">
            {data.map((row, rowIndex) => (
              <tr
                key={row.id ?? rowIndex}
                onClick={() => handleRowClick(row)}
                className={[
                  'transition-colors duration-150',
                  onRowClick
                    ? 'cursor-pointer hover:bg-teal-50/50 active:bg-teal-100/50 touch-manipulation'
                    : '',
                ].filter(Boolean).join(' ')}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 sm:px-6 py-3 sm:py-4 text-sm whitespace-nowrap ${alignClass(col.align)}`}
                    onClick={col.key === 'actions' ? (e) => e.stopPropagation() : undefined}
                  >
                    {renderCell(col, row, rowIndex)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Scoped CSS ── */}
      <style>{`
        .list-table-scroll-host {
          width: 100%;
          overflow-x: auto;
          overflow-y: visible;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: #2dd4bf #f1f5f9;
        }
        .list-table-scroll-host::-webkit-scrollbar { height: 4px; }
        .list-table-scroll-host::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 999px;
        }
        .list-table-scroll-host::-webkit-scrollbar-thumb {
          background: #2dd4bf;
          border-radius: 999px;
          transition: background 0.2s ease;
        }
        .list-table-scroll-host::-webkit-scrollbar-thumb:hover {
          background: #0d9488;
        }
      `}</style>
    </>
  );
};

export default ListTable;