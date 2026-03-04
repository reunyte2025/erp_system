import { Receipt } from 'lucide-react';

/**
 * ============================================================================
 * INVOICES MODULE CONFIGURATION
 * ============================================================================
 * Follows exact same pattern as proforma.config.jsx
 */

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getStatusIconColor = (status) => {
  const s = String(status || '').toLowerCase();
  const colors = {
    'draft':             'text-blue-500',
    'pending':           'text-yellow-600',
    'in_progress':       'text-yellow-600',
    'under_review':      'text-yellow-600',
    'verified':          'text-green-600',
    'placed_work_order': 'text-green-600',
    'failed':            'text-red-600',
    '1': 'text-blue-500',
    '2': 'text-yellow-600',
    '3': 'text-yellow-600',
    '4': 'text-green-600',
    '5': 'text-red-600',
  };
  return colors[s] || 'text-gray-600';
};

const getStatusBadge = (status) => {
  const s = String(status || '').toLowerCase();
  const statusConfigs = {
    'draft':             { text: 'Draft',             bgColor: 'bg-blue-100',   textColor: 'text-blue-700',   icon: 'D' },
    'pending':           { text: 'Pending',           bgColor: 'bg-yellow-100', textColor: 'text-yellow-700', icon: 'P' },
    'in_progress':       { text: 'In Progress',       bgColor: 'bg-yellow-100', textColor: 'text-yellow-700', icon: 'P' },
    'under_review':      { text: 'Under Review',      bgColor: 'bg-yellow-100', textColor: 'text-yellow-700', icon: 'P' },
    'verified':          { text: 'Verified',          bgColor: 'bg-green-100',  textColor: 'text-green-700',  icon: 'V' },
    'placed_work_order': { text: 'Placed Work-order', bgColor: 'bg-green-100',  textColor: 'text-green-700',  icon: 'V' },
    'failed':            { text: 'Failed',            bgColor: 'bg-red-100',    textColor: 'text-red-700',    icon: 'X' },
    '1': { text: 'Draft',             bgColor: 'bg-blue-100',   textColor: 'text-blue-700',   icon: 'D' },
    '2': { text: 'Under Review',      bgColor: 'bg-yellow-100', textColor: 'text-yellow-700', icon: 'P' },
    '3': { text: 'In Progress',       bgColor: 'bg-yellow-100', textColor: 'text-yellow-700', icon: 'P' },
    '4': { text: 'Placed Work-order', bgColor: 'bg-green-100',  textColor: 'text-green-700',  icon: 'V' },
    '5': { text: 'Failed',            bgColor: 'bg-red-100',    textColor: 'text-red-700',    icon: 'X' },
  };
  return statusConfigs[s] || statusConfigs['draft'];
};

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return 'Rs. 0';
  return `Rs. ${Number(amount).toLocaleString('en-IN')}`;
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
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
    const months  = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
    return row.client_name.length > 25
      ? row.client_name.substring(0, 25) + '...'
      : row.client_name;
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
// Invoice Number | Project Name | Notes | Total Outstanding | Date | Status
// ============================================================================

const columns = [
  {
    key: 'invoice_number',
    label: 'Invoice Number',
    render: (row) => {
      const status    = row.status_display || row.status;
      const iconColor = getStatusIconColor(status);

      const formatInvNumber = (number) => {
        if (!number) return `IN-2026-${String(row.id || '00000').padStart(5, '0')}`;
        if (String(number).startsWith('IN-')) return number;
        const s = String(number);
        if (s.length >= 8) return `IN-${s.substring(0, 4)}-${s.substring(4).padStart(5, '0')}`;
        return `IN-2026-${String(number).padStart(5, '0')}`;
      };

      return (
        <div className="flex items-center gap-3">
          <div className={`${iconColor} flex-shrink-0`}>
            <Receipt className="w-9 h-9" />
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
      <div className="max-w-xs" title={row.notes || 'No notes'}>
        <span className="text-gray-700 text-sm">
          {row.notes ? truncateText(row.notes, 30) : 'abcdef'}
        </span>
      </div>
    ),
  },

  {
    key: 'grand_total',
    label: 'Total Outstanding',
    render: (row) => (
      <span className="text-gray-900 font-medium text-sm">
        {formatCurrency(row.grand_total || row.total_amount || 0)}
      </span>
    ),
  },

  {
    key: 'created_at',
    label: 'Date',
    render: (row) => (
      <span className="text-gray-700 text-sm">
        {formatDate(row.created_at || row.date)}
      </span>
    ),
  },

  {
    key: 'status',
    label: 'Status',
    render: (row) => {
      const status       = row.status_display || row.status;
      const statusConfig = getStatusBadge(status);
      return (
        <div className="flex items-center">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}
          >
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
// MAIN CONFIGURATION OBJECT
// ============================================================================

const invoicesConfig = {
  title:           'Invoices List',
  icon:            Receipt,
  addButtonLabel:  'Add Invoice',
  columns,
  showSearch:      true,
  showFilter:      true,
  loadingMessage:  'Loading invoices...',
  emptyMessage:    'No Invoices Found',
  emptySubMessage: 'Start by adding your first invoice',
  note:            'Click on Invoices to get more details',
  defaultSort:     { field: 'created_at', direction: 'desc' },
  defaultPageSize: 10,
};

export default invoicesConfig;

export {
  formatCurrency,
  formatDate,
  formatTimestamp,
  getClientName,
  getStatusBadge,
  getStatusIconColor,
  truncateText,
};