import { User } from 'lucide-react';

/**
 * ============================================================================
 * CLIENT MODULE CONFIGURATION
 * ============================================================================
 */

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

const formatFullName = (firstName, lastName) => {
  const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'N/A';
  return fullName.length > 20 ? fullName.substring(0, 20) + '...' : fullName;
};

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

/**
 * Column Configuration
 *
 * sortField: (optional) The API field name passed to sort_by.
 *   When set, the column header becomes clickable and shows sort arrows.
 *   Leave undefined for non-sortable columns.
 */
const columns = [
  // ============================================================================
  // CUSTOMER NAME COLUMN — sortable by first_name
  // ============================================================================
  {
    key: 'customer_name',
    label: 'Customer Name',
    width: '220px',
    headerAlign: 'left',
    sortField: 'first_name',   // ← API sort_by value
    render: (row, index) => (
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 ${getStatusColor(index)} rounded-full flex items-center justify-center flex-shrink-0`}
        >
          <User className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="font-medium text-gray-900 truncate max-w-[130px]">
            {formatFullName(row.first_name, row.last_name)}
          </div>
          <div className="text-sm text-gray-500 truncate max-w-[130px]">
            {row.email || 'No email'}
          </div>
        </div>
      </div>
    ),
  },

  // ============================================================================
  // ADDRESS COLUMN
  // ============================================================================
  {
    key: 'address',
    label: 'Address',
    width: '200px',
    headerAlign: 'center',
    render: (row) => {
      const fullAddress = [row.address, row.city, row.state, row.pincode].filter(Boolean).join(', ');
      const shortAddress = [row.address, row.city].filter(Boolean).join(', ');
      return shortAddress ? (
        <span className="text-gray-700 max-w-[180px] block truncate" title={fullAddress}>
          {shortAddress}
        </span>
      ) : (
        <span className="text-gray-400 block text-center">—</span>
      );
    },
  },

  // ============================================================================
  // NOTES COLUMN
  // ============================================================================
  {
    key: 'notes',
    label: 'Notes',
    width: '150px',
    headerAlign: 'center',
    render: (row) => {
      const notes = row.Notes || [];
      if (notes.length === 0) {
        return <span className="text-gray-400 block text-center">—</span>;
      }
      const firstNote = notes[0].note || '';
      const preview = firstNote.length > 20 ? firstNote.substring(0, 20) + '…' : firstNote;
      return (
        <span className="text-gray-700" title={firstNote}>
          {preview}
          {notes.length > 1 && (
            <span className="ml-1.5 text-xs text-teal-600 font-medium">+{notes.length - 1}</span>
          )}
        </span>
      );
    },
  },

  // ============================================================================
  // TOTAL OUTSTANDING COLUMN
  // ============================================================================
  {
    key: 'outstanding',
    label: 'Total Outstanding',
    width: '140px',
    align: 'center',
    render: () => <span className="text-gray-400 block text-center">—</span>,
  },

  // ============================================================================
  // DATE COLUMN — sortable by created_at
  // ============================================================================
  {
    key: 'date',
    label: 'Date',
    width: '110px',
    headerAlign: 'center',
    sortField: 'created_at',   // ← API sort_by value
    render: (row) => {
      if (!row.created_at) return <span className="text-gray-400">—</span>;
      const date = new Date(row.created_at);
      const formatted = date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      return <span className="text-gray-700">{formatted}</span>;
    },
  },

  // ============================================================================
  // STATUS COLUMN — sortable by status
  // ============================================================================
  {
    key: 'status',
    label: 'Status',
    width: '130px',
    sortField: 'status',       // ← API sort_by value
    render: (row) => {
      if (row.status === 1) {
        return (
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 text-orange-600 text-xs font-semibold whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
              Draft
            </span>
          </div>
        );
      }
      return (
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" />
            Active
          </span>
        </div>
      );
    },
    align: 'center',
  },

  // ============================================================================
  // ACTIONS COLUMN
  // ============================================================================
  {
    key: 'actions',
    label: 'Actions',
    width: '80px',
    align: 'center',
    render: () => (
      <button
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400
                   hover:text-gray-600 hover:bg-gray-100 active:bg-gray-200
                   transition-all duration-150"
        title="Actions"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3"  r="1.4" />
          <circle cx="8" cy="8"  r="1.4" />
          <circle cx="8" cy="13" r="1.4" />
        </svg>
      </button>
    ),
  },
];

// ============================================================================
// MAIN CONFIGURATION OBJECT
// ============================================================================

const clientConfig = {
  title: 'Client List',
  icon: User,

  addButtonLabel: 'Add Client',

  columns: columns,

  showSearch: true,
  showFilter: true,

  loadingMessage: 'Loading clients...',
  emptyMessage: 'No Clients Found',
  emptySubMessage: 'Start by adding your first client',
  note: 'Click on client to get more details',

  defaultSort: {
    field: 'first_name',
    direction: 'asc',
  },

  defaultPageSize: 10,
};

export default clientConfig;