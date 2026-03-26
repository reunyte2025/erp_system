import { useState, useEffect, useRef } from 'react';
import { User, Trash2, RotateCcw } from 'lucide-react';

/**
 * ============================================================================
 * CLIENT MODULE CONFIGURATION - REDESIGNED
 * ============================================================================
 * Modern, sharp, professional styling for client list
 */

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getStatusColor = (index) => {
  const colors = [
    'bg-gradient-to-br from-teal-500 to-teal-600',
    'bg-gradient-to-br from-orange-500 to-orange-600',
    'bg-gradient-to-br from-lime-500 to-lime-600',
    'bg-gradient-to-br from-green-500 to-green-600',
    'bg-gradient-to-br from-yellow-500 to-yellow-600',
    'bg-gradient-to-br from-emerald-500 to-emerald-600',
  ];
  return colors[index % colors.length];
};

const getStatusColorLight = (index) => {
  const colors = [
    'text-teal-700',
    'text-orange-700',
    'text-lime-700',
    'text-green-700',
    'text-yellow-700',
    'text-emerald-700',
  ];
  return colors[index % colors.length];
};

const formatFullName = (firstName, lastName) => {
  const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'N/A';
  return fullName.length > 20 ? fullName.substring(0, 20) + '...' : fullName;
};

// ============================================================================
// MODERN ACTIONS DROPDOWN MENU COMPONENT
// ============================================================================

const ActionsMenu = ({ row, handlers }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const isDeactive = row.status === 3;

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const handleDelete = (e) => {
    e.stopPropagation();
    setOpen(false);
    handlers?.onDeleteClient?.(row);
  };

  const handleUndo = (e) => {
    e.stopPropagation();
    setOpen(false);
    handlers?.onUndoClient?.(row);
  };

  return (
    <div className="relative flex justify-center" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`
          inline-flex items-center justify-center w-8 h-8 rounded-lg
          transition-all duration-150
          ${open
            ? 'text-teal-700 bg-teal-100'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:bg-gray-200'
          }
        `}
        title="Actions"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.4" />
          <circle cx="8" cy="8" r="1.4" />
          <circle cx="8" cy="13" r="1.4" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          className="absolute right-0 top-10 z-50 w-48 bg-white rounded-xl border border-gray-200 py-1.5 shadow-lg overflow-hidden"
          style={{ animation: 'dropdownIn 0.15s ease-out' }}
          onClick={(e) => e.stopPropagation()}
        >
          {isDeactive ? (
            /* Undo Action */
            <button
              onClick={handleUndo}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50 transition-colors duration-100 first:rounded-t-lg last:rounded-b-lg"
            >
              <RotateCcw className="w-4 h-4 flex-shrink-0" />
              <span>Restore Client</span>
            </button>
          ) : (
            /* Delete Action */
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors duration-100 first:rounded-t-lg last:rounded-b-lg"
            >
              <Trash2 className="w-4 h-4 flex-shrink-0" />
              <span>Delete Client</span>
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes dropdownIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

const baseColumns = [
  // ── Customer Name ─────────────────────────────────────────────────────
  {
    key: 'customer_name',
    label: 'Customer Name',
    width: '220px',
    headerAlign: 'left',
    sortField: 'first_name',
    render: (row, index) => (
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 ${getStatusColor(index)} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}
        >
          <User className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-gray-900 truncate max-w-[130px]">
            {formatFullName(row.first_name, row.last_name)}
          </div>
          <div className="text-xs text-gray-500 truncate max-w-[130px]">
            {row.email || 'No email'}
          </div>
        </div>
      </div>
    ),
  },

  // ── Address ───────────────────────────────────────────────────────────
  {
    key: 'address',
    label: 'Address',
    width: '200px',
    headerAlign: 'center',
    render: (row) => {
      const fullAddress = [row.address, row.city, row.state, row.pincode]
        .filter(Boolean)
        .join(', ');
      const shortAddress = [row.address, row.city].filter(Boolean).join(', ');
      return shortAddress ? (
        <span
          className="text-gray-700 max-w-[180px] block truncate text-sm"
          title={fullAddress}
        >
          {shortAddress}
        </span>
      ) : (
        <span className="text-gray-400 block text-center text-sm">—</span>
      );
    },
  },

  // ── Notes ─────────────────────────────────────────────────────────────
  {
    key: 'notes',
    label: 'Notes',
    width: '150px',
    headerAlign: 'center',
    render: (row) => {
      const notes = row.Notes || [];
      if (notes.length === 0)
        return <span className="text-gray-400 block text-center text-sm">—</span>;
      const firstNote = notes[0].note || '';
      const preview = firstNote.length > 20 ? firstNote.substring(0, 20) + '…' : firstNote;
      return (
        <span className="text-gray-700 text-sm" title={firstNote}>
          {preview}
          {notes.length > 1 && (
            <span className="ml-2 text-xs text-teal-600 font-semibold">
              +{notes.length - 1}
            </span>
          )}
        </span>
      );
    },
  },

  // ── GST Number ────────────────────────────────────────────────────────
  {
    key: 'gst_number',
    label: 'GST Number',
    width: '160px',
    headerAlign: 'center',
    render: (row) => {
      const gst = row.gst_number;
      if (!gst) return <span className="text-gray-400 block text-center text-sm">—</span>;
      return (
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-mono font-medium tracking-wide"
          title={gst}
        >
          {gst.length > 18 ? gst.substring(0, 18) + '…' : gst}
        </span>
      );
    },
  },

  // ── Date ──────────────────────────────────────────────────────────────
  {
    key: 'date',
    label: 'Date',
    width: '110px',
    headerAlign: 'center',
    sortField: 'created_at',
    render: (row) => {
      if (!row.created_at) return <span className="text-gray-400 text-sm">—</span>;
      const date = new Date(row.created_at);
      const formatted = date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      return <span className="text-gray-700 text-sm">{formatted}</span>;
    },
  },

  // ── Status ────────────────────────────────────────────────────────────
  {
    key: 'status',
    label: 'Status',
    width: '130px',
    sortField: 'status',
    align: 'center',
    render: (row) => {
      if (row.status === 1) {
        return (
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
              Draft
            </span>
          </div>
        );
      }
      if (row.status === 3) {
        return (
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              Deactive
            </span>
          </div>
        );
      }
      return (
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" />
            Active
          </span>
        </div>
      );
    },
  },

  // ── Actions (Admin only) ──────────────────────────────────────────────
  {
    key: 'actions',
    label: 'Actions',
    width: '80px',
    align: 'center',
    adminOnly: true,
    render: (row, index, handlers) => <ActionsMenu row={row} handlers={handlers} />,
  },
];

/**
 * Get columns for the current user's role
 * Admin → all columns including Actions
 * Manager / User → all columns except Actions
 */
export const getColumns = (isAdmin) =>
  isAdmin ? baseColumns : baseColumns.filter((col) => !col.adminOnly);

// ============================================================================
// MAIN CONFIGURATION
// ============================================================================

const clientConfig = {
  title: 'Clients',
  icon: User,

  addButtonLabel: 'Add Client',

  columns: baseColumns,

  showSearch: true,
  showFilter: true,

  loadingMessage: 'Loading clients...',
  emptyMessage: 'No Clients Found',
  emptySubMessage: 'Start by adding your first client',
  note: 'Click on a client to view details',

  defaultSort: {
    field: 'first_name',
    direction: 'asc',
  },

  defaultPageSize: 10,
};

export default clientConfig;