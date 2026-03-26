import { Receipt, FileText, Clock, CheckCircle2, FileX } from 'lucide-react';

/**
 * ============================================================================
 * INVOICES MODULE CONFIGURATION
 * ============================================================================
 * Left icon: ALWAYS FileText — only its COLOR changes based on status.
 * Status badge: emoji + text pill on the right (no border).
 *
 * STATUS IDs (from backend):
 *   1 = Draft
 *   2 = Under Review
 *   3 = In Progress
 *   4 = Placed Work-order
 *   5 = Failed
 */

// ============================================================================
// UNIFIED STATUS RESOLVER
// The API returns status in THREE possible shapes:
//   1. Numeric string  → row.status = "3"
//   2. Snake-case slug → row.status = "in_progress"
//   3. Display string  → row.status_display = "In Progress"
// resolveStatus() handles all three so the badge is always correct.
// ============================================================================

const STATUS_MAP = {
  // Numeric IDs
  '1': { iconColor: 'text-blue-600',    iconBg: 'bg-blue-100/30',    emoji: '📄', text: 'Draft',             badgeBg: 'bg-blue-100',   badgeText: 'text-blue-700'   },
  '2': { iconColor: 'text-yellow-600',  iconBg: 'bg-yellow-100/30',  emoji: '🔍', text: 'Under Review',      badgeBg: 'bg-yellow-100', badgeText: 'text-yellow-700' },
  '3': { iconColor: 'text-yellow-600',  iconBg: 'bg-yellow-100/30',  emoji: '🕐', text: 'In Progress',       badgeBg: 'bg-yellow-100', badgeText: 'text-yellow-700' },
  '4': { iconColor: 'text-green-600',   iconBg: 'bg-green-100/30',   emoji: '✅', text: 'Placed Work-order', badgeBg: 'bg-green-100',  badgeText: 'text-green-700'  },
  '5': { iconColor: 'text-red-600',     iconBg: 'bg-red-100/30',     emoji: '❌', text: 'Failed',            badgeBg: 'bg-red-100',    badgeText: 'text-red-700'    },

  // Snake-case slugs → alias to numeric key
  'draft':             '1',
  'pending':           '2',
  'under_review':      '2',
  'in_progress':       '3',
  'verified':          '4',
  'placed_work_order': '4',
  'failed':            '5',

  // Human-readable display strings (status_display field from API)
  'under review':      '2',
  'in progress':       '3',
  'placed work-order': '4',
  'placed work order': '4',
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
  return { text: s.text, icon: s.emoji, bgColor: s.badgeBg, textColor: s.badgeText };
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
    key: 'invoice_number',
    label: 'Invoice Number',
    sortField: 'invoice_number',
    render: (row) => {
      // Icon is always FileText, color changes based on status
      const iconConfig = getStatusIconConfig(row);
      const IconComponent = iconConfig.icon; // always FileText

      const formatInvNumber = (number) => {
        if (!number) return `INV-${String(row.id || '00000')}`;
        return String(number);
      };

      return (
        <div className="flex items-center gap-3">
          {/* Left icon — always same document icon, color reflects status */}
          <div className={`${iconConfig.lightBg} rounded-xl p-2 flex items-center justify-center flex-shrink-0`}>
            <IconComponent className={`w-5 h-5 ${iconConfig.color}`} />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 text-sm">
              {formatInvNumber(row.invoice_number)}
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
    render: (row) => {
      const display   = row.project_name || row.client_name || 'N/A';
      const truncated = display.length > 25 ? display.substring(0, 25) + '...' : display;
      return <span className="text-gray-700 text-sm" title={display}>{truncated}</span>;
    },
  },

  {
    key: 'invoice_type',
    label: 'Invoice Type',
    render: (row) => (
      <div className="max-w-xs">
        {row.invoice_type ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
            {row.invoice_type}
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
];

// ============================================================================
// MAIN CONFIG
// ============================================================================

const invoicesConfig = {
  title:           'Invoices',
  icon:            Receipt,
  addButtonLabel:  'Add',
  columns,
  showSearch:      true,
  showFilter:      true,
  loadingMessage:  'Loading invoices...',
  emptyMessage:    'No Invoices Found',
  emptySubMessage: 'Start by adding your first invoice',
  note:            'Click on Invoice to get more details',
  defaultSort:     { field: 'created_at', direction: 'desc' },
  defaultPageSize: 10,
};

export default invoicesConfig;

export { formatCurrency, formatDate, formatTimestamp, getClientName, getStatusBadge, getStatusIconConfig, truncateText };