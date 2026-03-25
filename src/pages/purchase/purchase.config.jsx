import { FileText, CheckCircle2, Clock, FileX, Receipt } from 'lucide-react';

/**
 * ============================================================================
 * PURCHASE MODULE CONFIGURATION — PURCHASE ORDERS LIST
 * ============================================================================
 *
 * Columns render data from the ListQuotationSerializer response
 * (same shape as quotation list, but type=2 → vendor quotations).
 *
 * Response fields available per row:
 *   id, quotation_number, vendor, vendor_name, client (null), client_name,
 *   project, project_name, sac_code, total_amount, gst_rate, total_gst_amount,
 *   discount_rate, grand_total, status, status_display, quotation_type,
 *   quotation_url, created_at, updated_at
 */

// ============================================================================
// HELPERS
// ============================================================================

const getStatusBadge = (status) => {
  const s = String(status || '').toLowerCase();
  const map = {
    'draft':      { text: 'Draft',              bg: 'bg-blue-100',   text_: 'text-blue-700',   icon: '📄' },
    '1':          { text: 'Draft',              bg: 'bg-blue-100',   text_: 'text-blue-700',   icon: '📄' },
    'pending':    { text: 'Pending',            bg: 'bg-yellow-100', text_: 'text-yellow-700', icon: '⏱️' },
    '7':          { text: 'Pending',            bg: 'bg-yellow-100', text_: 'text-yellow-700', icon: '⏱️' },
    'processing': { text: 'Under Review',       bg: 'bg-orange-100', text_: 'text-orange-700', icon: '🔍' },
    '6':          { text: 'Under Review',       bg: 'bg-orange-100', text_: 'text-orange-700', icon: '🔍' },
    'sent':       { text: 'Sent',               bg: 'bg-green-100',  text_: 'text-green-700',  icon: '✅' },
    '2':          { text: 'Sent',               bg: 'bg-green-100',  text_: 'text-green-700',  icon: '✅' },
    'accepted':   { text: 'Accepted',           bg: 'bg-green-100',  text_: 'text-green-700',  icon: '✅' },
    '3':          { text: 'Accepted',           bg: 'bg-green-100',  text_: 'text-green-700',  icon: '✅' },
    'rejected':   { text: 'Rejected',           bg: 'bg-red-100',    text_: 'text-red-700',    icon: '❌' },
    '4':          { text: 'Rejected',           bg: 'bg-red-100',    text_: 'text-red-700',    icon: '❌' },
    'expired':    { text: 'Expired',            bg: 'bg-gray-100',   text_: 'text-gray-600',   icon: '⌛' },
    '5':          { text: 'Expired',            bg: 'bg-gray-100',   text_: 'text-gray-600',   icon: '⌛' },
    'invoice_generated': { text: 'Invoice Generated', bg: 'bg-teal-100', text_: 'text-teal-700', icon: '✅' },
    '8':          { text: 'Invoice Generated', bg: 'bg-teal-100',   text_: 'text-teal-700',   icon: '✅' },
  };
  const cfg = map[s] || map['draft'];
  return { text: cfg.text, bgColor: cfg.bg, textColor: cfg.text_, icon: cfg.icon };
};

const getStatusIconConfig = (status) => {
  const s = String(status || '').toLowerCase();
  if (['draft', '1'].includes(s))                   return { icon: FileText,     color: 'text-blue-600',   lightBg: 'bg-blue-100/30'   };
  if (['pending', '7', 'processing', '6'].includes(s)) return { icon: Clock,    color: 'text-yellow-600', lightBg: 'bg-yellow-100/30' };
  if (['sent', '2', 'accepted', '3'].includes(s))   return { icon: CheckCircle2, color: 'text-green-600',  lightBg: 'bg-green-100/30'  };
  if (['invoice_generated', '8'].includes(s)) return { icon: Receipt, color: 'text-teal-600', lightBg: 'bg-teal-100/30' };
  return { icon: FileX, color: 'text-red-600', lightBg: 'bg-red-100/30' };
};

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return 'Rs. 0';
  const num = parseFloat(amount);
  if (isNaN(num)) return 'Rs. 0';
  const hasDecimal = num % 1 !== 0;
  return `Rs. ${num.toLocaleString('en-IN', {
    minimumFractionDigits: hasDecimal ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
  } catch { return 'N/A'; }
};

const formatTimestamp = (dateString) => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let h = d.getHours();
    const m   = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} ${h}:${m} ${ampm}`;
  } catch { return ''; }
};

const formatPONumber = (number, id) => {
  if (!number) return `PO-2026-${String(id || '00000').padStart(5,'0')}`;
  const s = String(number);
  if (s.startsWith('QT-') || s.startsWith('PO-')) return s;
  if (s.length >= 8) return `PO-${s.substring(0,4)}-${s.substring(4).padStart(5,'0')}`;
  return `PO-2026-${s.padStart(5,'0')}`;
};

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

const columns = [
  // ── PO Number + Timestamp ────────────────────────────────────────────────
  {
    key: 'quotation_number',
    label: 'PO Number',
    sortField: 'quotation_number',
    render: (row) => {
      const status     = row.status_display || row.status;
      const iconCfg    = getStatusIconConfig(status);
      const IconComp   = iconCfg.icon;
      return (
        <div className="flex items-center gap-3">
          <div className={`${iconCfg.lightBg} rounded-xl p-2 flex items-center justify-center flex-shrink-0`}>
            <IconComp className={`w-5 h-5 ${iconCfg.color}`} />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 text-sm">
              {formatPONumber(row.quotation_number, row.id)}
            </div>
            <div className="text-xs text-gray-500">
              {formatTimestamp(row.created_at)}
            </div>
          </div>
        </div>
      );
    },
  },

  // ── Vendor Name ──────────────────────────────────────────────────────────
  {
    key: 'vendor',
    label: 'Vendor',
    render: (row) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-teal-700 font-semibold text-xs">
            {(row.vendor_name || 'V')[0].toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {row.vendor_name || `Vendor #${row.vendor}`}
          </p>
        </div>
      </div>
    ),
  },

  // ── Project Name ─────────────────────────────────────────────────────────
  {
    key: 'project',
    label: 'Project',
    render: (row) => {
      const name = row.project_name || (row.project ? `Project #${row.project}` : 'N/A');
      const display = name.length > 25 ? name.substring(0, 25) + '…' : name;
      return <span className="text-gray-700 text-sm" title={name}>{display}</span>;
    },
  },

  // ── Total Outstanding ────────────────────────────────────────────────────
  {
    key: 'grand_total',
    label: 'Total Outstanding',
    sortField: 'grand_total',
    render: (row) => {
      const subtotal     = parseFloat(row.total_amount  || 0);
      const gstRate      = parseFloat(row.gst_rate      || 0);
      const discountRate = parseFloat(row.discount_rate || 0);
      let precise;
      if (gstRate > 0 || discountRate > 0) {
        const discountAmt = (subtotal * discountRate) / 100;
        const taxable     = subtotal - discountAmt;
        const gstAmt      = (taxable * gstRate) / 100;
        precise = parseFloat((taxable + gstAmt).toFixed(2));
      } else {
        precise = parseFloat(row.grand_total || row.total_amount || 0);
      }
      return <span className="text-gray-900 font-medium text-sm">{formatCurrency(precise)}</span>;
    },
  },

  // ── Date ─────────────────────────────────────────────────────────────────
  {
    key: 'created_at',
    label: 'Date',
    sortField: 'created_at',
    render: (row) => (
      <span className="text-gray-700 text-sm">{formatDate(row.created_at)}</span>
    ),
  },

  // ── Status Badge ─────────────────────────────────────────────────────────
  {
    key: 'status',
    label: 'Status',
    sortField: 'status',
    render: (row) => {
      const status = row.status_display || row.status;
      const cfg    = getStatusBadge(status);
      return (
        <div className="flex items-center">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${cfg.bgColor} ${cfg.textColor}`}>
            <span>{cfg.icon}</span>
            <span>{cfg.text}</span>
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

const purchaseConfig = {
  title:          'Purchase Orders List',
  icon:           FileText,
  addButtonLabel: 'Add',
  columns,
  layoutType:     'table',
  showSearch:     true,
  showFilter:     true,
  loadingMessage: 'Loading purchase orders...',
  emptyMessage:   'No Purchase Orders Found',
  emptySubMessage:'Click "+ Add" to create your first purchase order',
  note:           'Click on a row to view purchase order details',
  defaultSort: {
    field:     'created_at',
    direction: 'desc',
  },
  defaultPageSize: 10,
};

export default purchaseConfig;

export {
  formatCurrency,
  formatDate,
  formatTimestamp,
  formatPONumber,
  getStatusBadge,
  getStatusIconConfig,
};