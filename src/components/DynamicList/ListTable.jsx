import React from 'react';

/**
 * ============================================================================
 * LIST TABLE COMPONENT
 * ============================================================================
 * 
 * Renders a dynamic table with configurable columns.
 * 
 * Features:
 * - Dynamic column rendering based on config
 * - Custom cell renderers
 * - Row click handling
 * - Responsive design
 * - Hover effects
 * 
 * Column Configuration:
 * - key: Unique identifier for the column
 * - label: Display name for the header
 * - accessor: Property path to access data (supports nested: 'user.name')
 * - render: Custom render function (optional)
 * - width: Custom width (optional)
 * - align: Text alignment (left/center/right)
 * 
 * @component
 */

const ListTable = ({
  columns = [],
  data = [],
  onRowClick,
}) => {
  /**
   * Get nested property value from object
   * Supports dot notation: 'user.profile.name'
   * 
   * @param {Object} obj - Object to get value from
   * @param {string} path - Property path
   * @returns {any} Property value
   */
  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  /**
   * Render cell content
   * - If column has custom render function, use it
   * - Otherwise, use accessor to get value
   * 
   * @param {Object} column - Column configuration
   * @param {Object} row - Row data
   * @param {number} index - Row index
   * @returns {React.ReactNode} Rendered cell content
   */
  const renderCell = (column, row, index) => {
    // Custom render function
    if (column.render && typeof column.render === 'function') {
      return column.render(row, index);
    }

    // Default: Use accessor to get value
    if (column.accessor) {
      const value = getNestedValue(row, column.accessor);
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        return <span className="text-gray-400">N/A</span>;
      }

      // Format based on type
      if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
      }

      if (typeof value === 'number') {
        return value.toLocaleString();
      }

      return value;
    }

    return null;
  };

  /**
   * Handle row click
   * Calls onRowClick with row data if provided
   */
  const handleRowClick = (row) => {
    if (onRowClick && typeof onRowClick === 'function') {
      onRowClick(row);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <table className="w-full">
      {/* Table Header */}
      <thead>
        <tr className="border-b border-gray-200 bg-gray-50">
          {columns.map((column) => (
            <th
              key={column.key}
              className={`px-6 py-4 text-sm font-semibold text-gray-700 ${
                column.align === 'center'
                  ? 'text-center'
                  : column.align === 'right'
                  ? 'text-right'
                  : 'text-left'
              }`}
              style={{ width: column.width }}
            >
              {column.label}
            </th>
          ))}
        </tr>
      </thead>

      {/* Table Body */}
      <tbody>
        {data.map((row, rowIndex) => (
          <tr
            key={row.id || rowIndex}
            onClick={() => handleRowClick(row)}
            className={`border-b border-gray-100 transition-colors ${
              onRowClick
                ? 'hover:bg-gray-50 cursor-pointer'
                : ''
            }`}
          >
            {columns.map((column) => (
              <td
                key={column.key}
                className={`px-6 py-4 ${
                  column.align === 'center'
                    ? 'text-center'
                    : column.align === 'right'
                    ? 'text-right'
                    : 'text-left'
                }`}
              >
                {renderCell(column, row, rowIndex)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ListTable;

/**
 * ============================================================================
 * USAGE EXAMPLE
 * ============================================================================
 * 
 * // Define columns in config file
 * const columns = [
 *   {
 *     key: 'name',
 *     label: 'Customer Name',
 *     accessor: 'first_name',
 *     render: (row) => (
 *       <div className="flex items-center gap-3">
 *         <div className="w-10 h-10 bg-teal-500 rounded-full">
 *           <User className="w-5 h-5 text-white" />
 *         </div>
 *         <div>
 *           <div className="font-medium">{row.first_name} {row.last_name}</div>
 *           <div className="text-sm text-gray-500">{row.email}</div>
 *         </div>
 *       </div>
 *     ),
 *   },
 *   {
 *     key: 'phone',
 *     label: 'Phone Number',
 *     accessor: 'phone_number',
 *   },
 *   {
 *     key: 'status',
 *     label: 'Status',
 *     render: (row, index) => (
 *       <div className={`w-8 h-8 ${getStatusColor(index)} rounded-full`} />
 *     ),
 *     align: 'center',
 *   },
 * ];
 * 
 * // Use in component
 * <ListTable
 *   columns={columns}
 *   data={clients}
 *   onRowClick={(client) => navigate(`/clients/${client.id}`)}
 * />
 * 
 * ============================================================================
 */