import { FileEdit, FileText, Clock, CheckCircle2, FileX, AlertCircle, Trash2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

/**
 * ============================================================================
 * PROFORMA MODULE CONFIGURATION
 * ============================================================================
 * Left icon: ALWAYS FileText — only its COLOR changes based on status.
 * Status badge: emoji + text pill on the right (no border).
 *
 * STATUS IDs (from backend):
 *   1 = Draft
 *   2 = Sent (for approval)
 *   3 = Approved
 *   4 = Rejected
 *   5 = Expired
 */

// ============================================================================
// UNIFIED STATUS RESOLVER
// The API returns status in THREE possible shapes:
//   1. Numeric string  → row.status = "2"
//   2. Snake-case slug → row.status = "sent"
//   3. Display string  → row.status_display = "Sent for Approval"
// resolveStatus() handles all three so the badge is always correct.
// ============================================================================

// Actual backend status values from Proforma model:
//   draft | sent | approved | rejected | expired
const STATUS_MAP = {
  'draft':             { iconColor: 'text-blue-600',   iconBg: 'bg-blue-100/30',   emoji: '📄', text: 'Draft',             badgeBg: 'bg-blue-100',   badgeText: 'text-blue-700'   },
  'sent':              { iconColor: 'text-amber-500',  iconBg: 'bg-amber-100/30',  emoji: '📤', text: 'Sent for Approval', badgeBg: 'bg-amber-100',  badgeText: 'text-amber-700'  },
  'approved':          { iconColor: 'text-green-600',  iconBg: 'bg-green-100/30',  emoji: '✅', text: 'Approved',          badgeBg: 'bg-green-100',  badgeText: 'text-green-700'  },
  'rejected':          { iconColor: 'text-red-500',    iconBg: 'bg-red-100/30',    emoji: '❌', text: 'Rejected',          badgeBg: 'bg-red-100',    badgeText: 'text-red-700'    },
  'expired':           { iconColor: 'text-gray-400',   iconBg: 'bg-gray-100/30',   emoji: '⏰', text: 'Expired',           badgeBg: 'bg-gray-100',   badgeText: 'text-gray-600'   },
  // Human-readable display string alias
  'sent for approval': 'sent',
};

const resolveEntry = (key) => {
  const val = STATUS_MAP[key];
  if (!val) return STATUS_MAP['draft'];
  if (typeof val === 'string') return STATUS_MAP[val] || STATUS_MAP['draft'];
  return val;
};

const resolveStatus = (row) => {
  if (!row) return STATUS_MAP['draft'];
  const display = String(row.status_display || '').toLowerCase().trim();
  if (display && STATUS_MAP[display] !== undefined) return resolveEntry(display);
  const raw = String(row.status ?? '').toLowerCase().trim();
  if (raw && STATUS_MAP[raw] !== undefined) return resolveEntry(raw);
  return STATUS_MAP['draft'];
};

// ============================================================================
// HELPERS
// ============================================================================

const getStatusIconConfig = (rowOrStatus) => {
  const row = (rowOrStatus && typeof rowOrStatus === 'object') ? rowOrStatus : { status: rowOrStatus };
  const s = resolveStatus(row);
  // Icon is ALWAYS FileText — only color + bg change based on status
  return { icon: FileText, color: s.iconColor, bgColor: s.iconBg, lightBg: s.iconBg };
};

const getStatusBadge = (rowOrStatus) => {
  const row = (rowOrStatus && typeof rowOrStatus === 'object') ? rowOrStatus : { status: rowOrStatus };
  const s = resolveStatus(row);
  return {
    text:        s.text,
    icon:        s.emoji,
    bgColor:     s.badgeBg,
    textColor:   s.badgeText,
    borderColor: '', // kept for backwards compat with any callers that use it
  };
};

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return 'Rs. 0';
  return `Rs. ${Number(amount).toLocaleString('en-IN')}`;
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date  = new Date(dateString);
    const day   = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year  = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch { return 'N/A'; }
};

const formatTimestamp = (dateString) => {
  if (!dateString) return '';
  try {
    const date    = new Date(dateString);
    const days    = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months  = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayName = days[date.getDay()];
    const day     = date.getDate();
    const month   = months[date.getMonth()];
    const year    = date.getFullYear();
    let hours     = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm    = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${dayName} ${day} ${month} ${year} ${hours}:${minutes} ${ampm}`;
  } catch { return ''; }
};

const getClientName = (row) => {
  if (row.client_name) {
    return row.client_name.length > 25 ? row.client_name.substring(0, 25) + '...' : row.client_name;
  }
  if (row.client && typeof row.client === 'object') {
    const name = `${row.client.first_name || ''} ${row.client.last_name || ''}`.trim();
    return name.length > 25 ? name.substring(0, 25) + '...' : name;
  }
  return 'N/A';
};

const truncateText = (text, maxLength = 30) => {
  if (!text) return '-';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// ============================================================================
// DELETE HELPERS  (used by proformaList.jsx)
// ============================================================================

/**
 * Returns true when a proforma row is deleted.
 * Checks status === 5, is_deleted flag, or is_active === false —
 * same logic as isQuotationDeleted in quotation.config.jsx.
 */
export const isProformaDeleted = (row) => {
  const status = String(row.status ?? '').toLowerCase().trim();
  return (
    status === 'expired'  ||
    status === 'deleted'  ||
    row.is_deleted === true  ||
    row.is_active  === false
  );
};

// ============================================================================
// ACTIONS DROPDOWN MENU  (Admin / Manager only)
// ============================================================================

const ActionsMenu = ({ row, handlers }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const deleted = isProformaDeleted(row);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const handleDelete = (e) => {
    e.stopPropagation();
    setOpen(false);
    handlers?.onDeleteProforma?.(row);
  };

  // Already-deleted rows show a plain label — no dropdown
  if (deleted) {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-red-400 font-medium italic">Deleted</span>
      </div>
    );
  }

  return (
    <div className="relative flex justify-center" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150
          ${open ? 'text-red-700 bg-red-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:bg-gray-200'}`}
        title="Actions"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3"  r="1.4" />
          <circle cx="8" cy="8"  r="1.4" />
          <circle cx="8" cy="13" r="1.4" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 z-50 w-52 bg-white rounded-xl border border-gray-200 py-1.5 shadow-lg overflow-hidden"
          style={{ animation: 'dropdownIn 0.15s ease-out' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors duration-100 rounded-lg"
          >
            <Trash2 className="w-4 h-4 flex-shrink-0" />
            <span>Delete Proforma</span>
          </button>
        </div>
      )}

      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

const columns = [
  {
    key: 'proforma_number',
    label: 'Proforma Number',
    sortField: 'proforma_number',
    render: (row) => {
      // Icon is always FileText, color changes based on status
      const iconConfig    = getStatusIconConfig(row);
      const IconComponent = iconConfig.icon; // always FileText

      return (
        <div className="flex items-center gap-3">
          {/* Left icon — always same document icon, color reflects status */}
          <div className={`${iconConfig.lightBg} rounded-xl p-2 flex items-center justify-center flex-shrink-0`}>
            <IconComponent className={`w-5 h-5 ${iconConfig.color}`} />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 text-sm">
              {row.proforma_number || `#${row.id}`}
            </div>
            <div className="text-xs text-gray-500">
              {formatTimestamp(row.created_at || row.date)}
            </div>
          </div>
        </div>
      );
    },
  },

  {
    key: 'client',
    label: 'Project Name',
    render: (row) => (
      <span className="text-gray-700 text-sm" title={getClientName(row)}>
        {getClientName(row)}
      </span>
    ),
  },

  {
    key: 'proforma_type',
    label: 'Proforma Type',
    render: (row) => (
      <div className="max-w-xs">
        {row.proforma_type ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
            {row.proforma_type}
          </span>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        )}
      </div>
    ),
  },

  {
    key: 'grand_total',
    label: 'Total Outstanding',
    sortField: 'grand_total',
    render: (row) => (
      <span className="text-gray-900 font-medium text-sm">
        {formatCurrency(row.grand_total || row.total_amount || 0)}
      </span>
    ),
  },

  {
    key: 'created_at',
    label: 'Date',
    sortField: 'created_at',
    render: (row) => (
      <span className="text-gray-700 text-sm">{formatDate(row.created_at || row.date)}</span>
    ),
  },

  {
    key: 'status',
    label: 'Status',
    sortField: 'status',
    render: (row) => {
      // Right-side badge: emoji icon + text
      const statusConfig = getStatusBadge(row);
      return (
        <div className="flex items-center">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}>
            <span>{statusConfig.icon}</span>
            <span>{statusConfig.text}</span>
          </span>
        </div>
      );
    },
    align: 'left',
  },

  // Actions column — only rendered for Admin / Manager (adminOnly flag)
  {
    key: 'actions',
    label: 'Actions',
    adminOnly: true,
    align: 'center',
    render: (row, _index, handlers) => <ActionsMenu row={row} handlers={handlers} />,
  },
];

// ============================================================================
// MAIN CONFIG
// ============================================================================

const proformaConfig = {
  title:           'Proformas',
  icon:            FileEdit,
  addButtonLabel:  'Add',
  columns,
  showSearch:      true,
  showFilter:      true,
  loadingMessage:  'Loading proformas...',
  emptyMessage:    'No Proformas Found',
  emptySubMessage: 'Start by adding your first proforma',
  note:            'Click on Proforma to get more details',
  defaultSort:     { field: 'created_at', direction: 'desc' },
  defaultPageSize: 10,
};

export default proformaConfig;

/**
 * Returns columns filtered by role.
 *   isPrivileged = true  → Admin or Manager → sees Actions column
 *   isPrivileged = false → Regular user     → Actions column hidden
 */
export const getColumns = (isPrivileged) =>
  isPrivileged ? columns : columns.filter((col) => !col.adminOnly);

export { formatCurrency, formatDate, formatTimestamp, getClientName, getStatusBadge, getStatusIconConfig, truncateText };