import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

/**
 * ============================================================================
 * REDESIGNED LIST TABLE COMPONENT
 * ============================================================================
 * Modern, sharp, professional table with:
 * - Row dividers (visible, medium color)
 * - NO column separator borders
 * - Darker main border for visibility
 * - Professional styling
 */

const SortIndicator = ({ field, sortBy, sortOrder }) => {
  const isActive = sortBy === field;

  if (isActive) {
    return (
      <div className="inline-flex items-center justify-center ml-2 w-5 h-5 rounded bg-teal-200">
        {sortOrder === 'asc' ? (
          <ChevronUp className="w-3.5 h-3.5 text-teal-700" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-teal-700" />
        )}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center justify-center ml-2 w-5 h-5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-gray-500">
        <path d="M7 1v12M11 6L7 2L3 6M11 8L7 12L3 8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

const ListTable = ({
  columns = [],
  data = [],
  onRowClick,
  onSort,
  sortBy = '',
  sortOrder = 'asc',
  actionHandlers = {},
}) => {
  const getNestedValue = (obj, path) =>
    path.split('.').reduce((cur, key) => cur?.[key], obj);

  const renderCell = (column, row, index) => {
    if (column.render && typeof column.render === 'function') {
      return column.render(row, index, actionHandlers);
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

          {/* ── HEADER ── */}
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #d1d5db' }}>
              {columns.map((col) => {
                const isSortable = !!col.sortField && !!onSort;
                const isActive = isSortable && sortBy === col.sortField;

                return (
                  <th
                    key={col.key}
                    onClick={() => handleHeaderClick(col)}
                    className={`
                      ${isSortable ? 'cursor-pointer group hover:bg-gray-200/60' : ''}
                      ${alignClass(col.headerAlign ?? col.align)}
                      transition-colors duration-150
                    `}
                    style={{
                      padding: '13px 16px',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                      userSelect: 'none',
                      width: col.width,
                      color: isActive ? '#0d9488' : '#4b5563',
                      backgroundColor: isActive ? '#e0f7f6' : 'transparent',
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

          {/* ── BODY (With row dividers, NO column borders) ── */}
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={row.id ?? rowIndex}
                onClick={() => handleRowClick(row)}
                className={`
                  transition-all duration-150
                  ${onRowClick ? 'cursor-pointer hover:bg-teal-50' : ''}
                `}
                style={{
                  backgroundColor: '#ffffff',
                  borderBottom: '1px solid #d9dce3',
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`
                      ${alignClass(col.align)}
                      text-sm text-gray-800
                      ${col.key === 'actions' ? 'py-2' : 'py-3'}
                    `}
                    onClick={col.key === 'actions' ? (e) => e.stopPropagation() : undefined}
                    style={{
                      padding: `${col.key === 'actions' ? '8px 16px' : '13px 16px'}`,
                      whiteSpace: 'nowrap',
                      color: '#374151',
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
          scrollbar-color: #0d9488 #f3f4f6;
        }

        .list-table-scroll-host::-webkit-scrollbar {
          height: 6px;
        }

        .list-table-scroll-host::-webkit-scrollbar-track {
          background: #f9fafb;
        }

        .list-table-scroll-host::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 999px;
          border: 2px solid #f9fafb;
        }

        .list-table-scroll-host::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </>
  );
};

export default ListTable;