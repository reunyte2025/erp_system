import React from 'react';

const SortIndicator = ({ field, sortBy, sortOrder }) => {
  const isActive = sortBy === field;

  if (isActive) {
    return (
      <span className="inline-flex items-center justify-center ml-1.5 w-4 h-4 rounded bg-teal-600/20 flex-shrink-0">
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          className="text-teal-600"
          style={{
            transform: sortOrder === 'asc' ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <path d="M2 6.5L5 3.5L8 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }

  return (
    <span
      className="inline-flex flex-col items-center justify-center ml-1.5 gap-[1px] flex-shrink-0 opacity-0 group-hover:opacity-40 transition-opacity duration-150"
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
        return <span className="text-gray-400">—</span>;
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
        <table style={{ minWidth: '1080px', width: '100%', borderCollapse: 'collapse' }}>

          {/* ── Header ── */}
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #94a3b8' }}>
              {columns.map((col) => {
                const isSortable = !!col.sortField && !!onSort;
                const isActive   = isSortable && sortBy === col.sortField;

                return (
                  <th
                    key={col.key}
                    onClick={() => handleHeaderClick(col)}
                    className={[
                      isSortable ? 'cursor-pointer group' : '',
                      alignClass(col.headerAlign ?? col.align),
                    ].filter(Boolean).join(' ')}
                    style={{
                      padding: '14px 20px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      whiteSpace: 'nowrap',
                      userSelect: 'none',
                      width: col.width,
                      color: isActive ? '#0f766e' : '#475569',
                      backgroundColor: isActive ? '#f0fdfa' : 'transparent',
                      transition: 'background-color 0.15s, color 0.15s',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {col.label}
                      {isSortable && (
                        <SortIndicator field={col.sortField} sortBy={sortBy} sortOrder={sortOrder} />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={row.id ?? rowIndex}
                onClick={() => handleRowClick(row)}
                className={onRowClick ? 'table-row-clickable' : ''}
                style={{
                  backgroundColor: '#ffffff',
                  borderBottom: '1.5px solid #cbd5e1',
                  transition: 'background-color 0.15s',
                  cursor: onRowClick ? 'pointer' : 'default',
                }}
                onMouseEnter={e => { if (onRowClick) e.currentTarget.style.backgroundColor = '#f0fdfa'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={alignClass(col.align)}
                    onClick={col.key === 'actions' ? (e) => e.stopPropagation() : undefined}
                    style={{
                      padding: '14px 20px',
                      fontSize: '14px',
                      whiteSpace: 'nowrap',
                      color: '#1e293b',
                    }}
                  >
                    {renderCell(col, row, rowIndex)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .list-table-scroll-host {
          width: 100%;
          overflow-x: auto;
          overflow-y: visible;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: #0d9488 #e2e8f0;
          border-radius: 0 0 12px 12px;
        }
        .list-table-scroll-host::-webkit-scrollbar { height: 5px; }
        .list-table-scroll-host::-webkit-scrollbar-track {
          background: #e2e8f0;
        }
        .list-table-scroll-host::-webkit-scrollbar-thumb {
          background: #0d9488;
          border-radius: 999px;
        }
        .list-table-scroll-host::-webkit-scrollbar-thumb:hover {
          background: #0f766e;
        }
      `}</style>
    </>
  );
};

export default ListTable;