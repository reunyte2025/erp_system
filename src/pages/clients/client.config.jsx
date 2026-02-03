import { User } from 'lucide-react';

/**
 * ============================================================================
 * CLIENT MODULE CONFIGURATION
 * ============================================================================
 * 
 * This file contains ALL configuration for the Clients list page.
 * 
 * Separation of Concerns:
 * - Clients.jsx = Business logic, state management, API calls
 * - client.config.js = UI configuration, column definitions
 * 
 * Why Separate?
 * - Easy to update columns without touching logic
 * - Easy to reuse configuration (e.g., export columns)
 * - Clear separation between what and how
 * - Can be generated from backend schema
 * - Can be shared with backend for consistency
 * 
 * @module clientConfig
 */

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Status color mapping
 * Returns color class based on index
 */
const getStatusColor = (index) => {
  const colors = [
    'bg-teal-500',
    'bg-orange-600',
    'bg-lime-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-emerald-600',
  ];
  return colors[index % colors.length];
};

/**
 * Format full name from first and last name
 */
const formatFullName = (firstName, lastName) => {
  const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'N/A';
  return fullName.length > 20 ? fullName.substring(0, 20) + '...' : fullName;
};

/**
 * Format username
 */
const formatUserName = (firstName, lastName) => {
  return `Mr. ${firstName || 'John'} ${(lastName || 'Doe').substring(0, 3)}`;
};

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

/**
 * Column Configuration
 * 
 * Each column object has:
 * - key: Unique identifier
 * - label: Display name in header
 * - accessor: Property path to access data (optional if using render)
 * - render: Custom render function (optional)
 * - width: Column width (optional)
 * - align: Text alignment (left/center/right)
 * 
 * Custom Render Function Signature:
 * - render: (row, index) => ReactNode
 *   - row: Current row data object
 *   - index: Row index in array
 */
const columns = [
  // ============================================================================
  // CUSTOMER NAME COLUMN (Complex with Avatar)
  // ============================================================================
  {
    key: 'customer_name',
    label: 'Customer Name',
    render: (row, index) => (
      <div className="flex items-center gap-3">
        {/* Avatar with Status Color */}
        <div
          className={`w-10 h-10 ${getStatusColor(index)} rounded-full flex items-center justify-center flex-shrink-0`}
        >
          <User className="w-5 h-5 text-white" />
        </div>
        {/* Name and Email */}
        <div className="min-w-0">
          <div className="font-medium text-gray-900">
            {formatFullName(row.first_name, row.last_name)}
          </div>
          <div className="text-sm text-gray-500 truncate">
            {row.email || 'No email'}
          </div>
        </div>
      </div>
    ),
  },

  // ============================================================================
  // USER NAME COLUMN (Simple Text)
  // ============================================================================
  {
    key: 'user_name',
    label: 'User Name',
    render: (row) => (
      <span className="text-gray-700">
        {formatUserName(row.first_name, row.last_name)}
      </span>
    ),
  },

  // ============================================================================
  // SESSIONS COLUMN (Hardcoded for now - Replace with actual data)
  // ============================================================================
  {
    key: 'sessions',
    label: 'Sessions',
    render: () => <span className="text-gray-700">50</span>,
  },

  // ============================================================================
  // NOTES COLUMN (Hardcoded for now - Replace with actual data)
  // ============================================================================
  {
    key: 'notes',
    label: 'Notes',
    render: () => <span className="text-gray-700">abcdef</span>,
  },

  // ============================================================================
  // TOTAL OUTSTANDING COLUMN (Hardcoded for now - Replace with actual data)
  // ============================================================================
  {
    key: 'outstanding',
    label: 'Total Outstanding',
    render: () => <span className="text-gray-700">Rs. 2,90,589</span>,
  },

  // ============================================================================
  // DATE COLUMN (Hardcoded for now - Replace with actual date field)
  // ============================================================================
  {
    key: 'date',
    label: 'Date',
    render: () => <span className="text-gray-700">01-01-2026</span>,
    // Future: Use actual date field
    // accessor: 'created_at',
    // render: (row) => new Date(row.created_at).toLocaleDateString('en-GB'),
  },

  // ============================================================================
  // STATUS COLUMN (Color Indicator)
  // ============================================================================
  {
    key: 'status',
    label: 'Status',
    render: (row, index) => (
      <div className={`w-8 h-8 ${getStatusColor(index)} rounded-full`} />
    ),
    align: 'left',
  },
];

// ============================================================================
// MAIN CONFIGURATION OBJECT
// ============================================================================

/**
 * Client List Configuration
 * 
 * This object contains all configuration for the Clients list page:
 * - Page metadata (title, icon)
 * - Button labels
 * - Column definitions
 * - Search/filter settings
 * - Messages for different states
 */
const clientConfig = {
  // Page Metadata
  title: 'Client List',
  icon: User,

  // Button Labels
  addButtonLabel: 'Add Client',

  // Column Definitions
  columns: columns,

  // Search & Filter
  showSearch: true,
  showFilter: true,

  // Messages
  loadingMessage: 'Loading clients...',
  emptyMessage: 'No Clients Found',
  emptySubMessage: 'Start by adding your first client',
  note: 'Click on client to get more details',

  // Default Sorting (optional)
  defaultSort: {
    field: 'first_name',
    direction: 'asc',
  },

  // Page Size (optional)
  defaultPageSize: 10,
};

export default clientConfig;

/**
 * ============================================================================
 * FUTURE ENHANCEMENTS
 * ============================================================================
 * 
 * 1. REAL DATA INTEGRATION
 * Replace hardcoded values with actual fields:
 * 
 * {
 *   key: 'sessions',
 *   label: 'Sessions',
 *   accessor: 'session_count',
 * }
 * 
 * {
 *   key: 'notes',
 *   label: 'Notes',
 *   accessor: 'notes',
 *   render: (row) => row.notes || '-',
 * }
 * 
 * 2. DATE FORMATTING
 * {
 *   key: 'date',
 *   label: 'Created Date',
 *   accessor: 'created_at',
 *   render: (row) => {
 *     const date = new Date(row.created_at);
 *     return date.toLocaleDateString('en-GB'); // DD-MM-YYYY
 *   },
 * }
 * 
 * 3. STATUS BADGES
 * {
 *   key: 'status',
 *   label: 'Status',
 *   accessor: 'status',
 *   render: (row) => {
 *     const statusColors = {
 *       active: 'bg-green-500',
 *       inactive: 'bg-gray-400',
 *       pending: 'bg-yellow-500',
 *     };
 *     return (
 *       <span className={`px-3 py-1 ${statusColors[row.status]} text-white rounded-full text-sm`}>
 *         {row.status}
 *       </span>
 *     );
 *   },
 * }
 * 
 * 4. SORTABLE COLUMNS
 * {
 *   key: 'name',
 *   label: 'Name',
 *   accessor: 'first_name',
 *   sortable: true,
 *   sortField: 'first_name', // Backend field for sorting
 * }
 * 
 * 5. FILTERABLE COLUMNS
 * {
 *   key: 'status',
 *   label: 'Status',
 *   accessor: 'status',
 *   filterable: true,
 *   filterOptions: ['active', 'inactive', 'pending'],
 * }
 * 
 * 6. CONDITIONAL RENDERING
 * {
 *   key: 'actions',
 *   label: 'Actions',
 *   render: (row) => (
 *     <div className="flex gap-2">
 *       {row.can_edit && <button>Edit</button>}
 *       {row.can_delete && <button>Delete</button>}
 *     </div>
 *   ),
 * }
 * 
 * 7. CELL TOOLTIPS
 * {
 *   key: 'notes',
 *   label: 'Notes',
 *   accessor: 'notes',
 *   render: (row) => (
 *     <div title={row.notes} className="truncate max-w-xs">
 *       {row.notes}
 *     </div>
 *   ),
 * }
 * 
 * ============================================================================
 * COLUMN CUSTOMIZATION BY USER ROLE
 * ============================================================================
 * 
 * You can conditionally show/hide columns based on user role:
 * 
 * export const getColumns = (userRole) => {
 *   const allColumns = [...columns];
 *   
 *   if (userRole !== 'admin') {
 *     // Hide sensitive columns for non-admin users
 *     return allColumns.filter(col => col.key !== 'outstanding');
 *   }
 *   
 *   return allColumns;
 * };
 * 
 * ============================================================================
 */