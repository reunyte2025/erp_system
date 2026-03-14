import { FileEdit } from 'lucide-react';

/**
 * ============================================================================
 * PROFORMA MODULE CONFIGURATION
 * ============================================================================
 */

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Icon colors — backend: 1=Draft 2=Sent(pending) 3=Approved 4=Rejected 5=Expired
const getStatusIconColor = (status) => {
  const s = String(status || '');
  const sl = s.toLowerCase();
  const colors = {
    '1': 'text-slate-500',   'draft':    'text-slate-500',
    '2': 'text-amber-500',   'sent':     'text-amber-500',
    '3': 'text-green-600',   'approved': 'text-green-600',
    '4': 'text-red-500',     'rejected': 'text-red-500',
    '5': 'text-gray-400',    'expired':  'text-gray-400',
  };
  return colors[s] || colors[sl] || 'text-gray-500';
};

// Status badges — backend: 1=Draft 2=Sent 3=Approved 4=Rejected 5=Expired
const getStatusBadge = (status) => {
  const s  = String(status || '');
  const sl = s.toLowerCase();
  const map = {
    '1': { text: 'Draft',              bgColor: 'bg-slate-100',  textColor: 'text-slate-600',  icon: '📄' },
    '2': { text: 'Sent for Approval',  bgColor: 'bg-amber-100',  textColor: 'text-amber-700',  icon: '⏳' },
    '3': { text: 'Approved',           bgColor: 'bg-green-100',  textColor: 'text-green-700',  icon: '✅' },
    '4': { text: 'Rejected',           bgColor: 'bg-red-100',    textColor: 'text-red-700',    icon: '❌' },
    '5': { text: 'Expired',            bgColor: 'bg-gray-100',   textColor: 'text-gray-500',   icon: '🕒' },
    'draft':    { text: 'Draft',              bgColor: 'bg-slate-100',  textColor: 'text-slate-600',  icon: '📄' },
    'sent':     { text: 'Sent for Approval',  bgColor: 'bg-amber-100',  textColor: 'text-amber-700',  icon: '⏳' },
    'approved': { text: 'Approved',           bgColor: 'bg-green-100',  textColor: 'text-green-700',  icon: '✅' },
    'rejected': { text: 'Rejected',           bgColor: 'bg-red-100',    textColor: 'text-red-700',    icon: '❌' },
    'expired':  { text: 'Expired',            bgColor: 'bg-gray-100',   textColor: 'text-gray-500',   icon: '🕒' },
  };
  return map[s] || map[sl] || map['1'];
};

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return 'Rs. 0';
  return `Rs. ${Number(amount).toLocaleString('en-IN')}`;
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return 'N/A';
  }
};

const formatTimestamp = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${dayName} ${day} ${month} ${year} ${hours}:${minutes} ${ampm}`;
  } catch {
    return '';
  }
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
  // Proforma Number Column
  {
    key: 'proforma_number',
    label: 'Proforma Number',
    render: (row) => {
      const status = row.status_display || row.status;
      const iconColor = getStatusIconColor(status);

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
          <div className={`${iconColor} flex-shrink-0`}>
            <FileEdit className="w-9 h-9" />
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

  // Project / Client Name Column
  {
    key: 'client',
    label: 'Project Name',
    render: (row) => (
      <span className="text-gray-700 text-sm" title={getClientName(row)}>
        {getClientName(row)}
      </span>
    ),
  },

  // Notes Column
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

  // Total Outstanding Column
  {
    key: 'grand_total',
    label: 'Total Outstanding',
    render: (row) => (
      <span className="text-gray-900 font-medium text-sm">
        {formatCurrency(row.grand_total || row.total_amount || 0)}
      </span>
    ),
  },

  // Date Column
  {
    key: 'created_at',
    label: 'Date',
    render: (row) => (
      <span className="text-gray-700 text-sm">
        {formatDate(row.created_at || row.date)}
      </span>
    ),
  },

  // Status Column
  {
    key: 'status',
    label: 'Status',
    render: (row) => {
      const status = row.status_display || row.status;
      const statusConfig = getStatusBadge(status);
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
// MAIN CONFIGURATION OBJECT
// ============================================================================

const proformaConfig = {
  title: 'Proforma List',
  icon: FileEdit,
  addButtonLabel: 'Add Proforma',
  columns,
  showSearch: true,
  showFilter: true,
  loadingMessage: 'Loading proformas...',
  emptyMessage: 'No Proformas Found',
  emptySubMessage: 'Start by adding your first proforma',
  note: 'Click on Proforma to get more details',
  defaultSort: { field: 'created_at', direction: 'desc' },
  defaultPageSize: 10,
};

export default proformaConfig;

export {
  formatCurrency,
  formatDate,
  formatTimestamp,
  getClientName,
  getStatusBadge,
  getStatusIconColor,
  truncateText,
};