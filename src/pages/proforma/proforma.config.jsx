import { FileEdit, FileText, Clock, CheckCircle2, FileX, AlertCircle } from 'lucide-react';

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

const STATUS_MAP = {
  // Numeric IDs
  '1': { iconColor: 'text-blue-600',   iconBg: 'bg-blue-100/30',   emoji: '📄', text: 'Draft',             badgeBg: 'bg-blue-100',   badgeText: 'text-blue-700'   },
  '2': { iconColor: 'text-amber-500',  iconBg: 'bg-amber-100/30',  emoji: '📤', text: 'Sent for Approval', badgeBg: 'bg-amber-100',  badgeText: 'text-amber-700'  },
  '3': { iconColor: 'text-green-600',  iconBg: 'bg-green-100/30',  emoji: '✅', text: 'Approved',          badgeBg: 'bg-green-100',  badgeText: 'text-green-700'  },
  '4': { iconColor: 'text-red-500',    iconBg: 'bg-red-100/30',    emoji: '❌', text: 'Rejected',          badgeBg: 'bg-red-100',    badgeText: 'text-red-700'    },
  '5': { iconColor: 'text-gray-400',   iconBg: 'bg-gray-100/30',   emoji: '⏰', text: 'Expired',           badgeBg: 'bg-gray-100',   badgeText: 'text-gray-600'   },

  // Snake-case slugs → alias to numeric key
  'draft':    '1',
  'sent':     '2',
  'approved': '3',
  'rejected': '4',
  'expired':  '5',

  // Human-readable display strings (status_display field from API)
  'sent for approval': '2',
};

const resolveEntry = (key) => {
  const val = STATUS_MAP[key];
  if (!val) return STATUS_MAP['1'];
  if (typeof val === 'string') return STATUS_MAP[val] || STATUS_MAP['1'];
  return val;
};

const resolveStatus = (row) => {
  if (!row) return STATUS_MAP['1'];
  const display = String(row.status_display || '').toLowerCase().trim();
  if (display && STATUS_MAP[display] !== undefined) return resolveEntry(display);
  const raw = String(row.status ?? '').toLowerCase().trim();
  if (raw && STATUS_MAP[raw] !== undefined) return resolveEntry(raw);
  return STATUS_MAP['1'];
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

      const formatProformaNumber = (number) => {
        if (!number) return `PF-2026-${String(row.id || '00000').padStart(5, '0')}`;
        if (String(number).startsWith('PF-')) return number;
        const numStr = String(number);
        if (numStr.length >= 8) {
          const year = numStr.substring(0, 4);
          const rest = numStr.substring(4);
          return `PF-${year}-${rest.padStart(5, '0')}`;
        }
        return `PF-2026-${String(number).padStart(5, '0')}`;
      };

      return (
        <div className="flex items-center gap-3">
          {/* Left icon — always same document icon, color reflects status */}
          <div className={`${iconConfig.lightBg} rounded-xl p-2 flex items-center justify-center flex-shrink-0`}>
            <IconComponent className={`w-5 h-5 ${iconConfig.color}`} />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 text-sm">
              {formatProformaNumber(row.proforma_number)}
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
    key: 'notes',
    label: 'Notes',
    render: (row) => (
      <div className="max-w-xs" title={row.notes || '—'}>
        <span className="text-gray-700 text-sm">{row.notes ? truncateText(row.notes, 30) : '—'}</span>
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

export { formatCurrency, formatDate, formatTimestamp, getClientName, getStatusBadge, getStatusIconConfig, truncateText };