import { CreditCard, Building2, Wifi, FileText, MoreHorizontal } from 'lucide-react';

/**
 * ============================================================================
 * INVOICE TRACK PAYMENT — LIST CONFIGURATION
 * ============================================================================
 * Follows exact same pattern as invoices.config.jsx / proforma.config.jsx
 * Column render functions carry all custom styles (Outfit font, teal palette)
 * so DynamicList → ListTable renders them correctly without any changes.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const PAYMENT_METHODS = {
  1: { label: 'Cheque',        Icon: FileText,       color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' },
  2: { label: 'Bank Transfer', Icon: Building2,      color: '#0f766e', bg: '#f0fdf4', border: '#6ee7b7' },
  3: { label: 'Online',        Icon: Wifi,            color: '#2563eb', bg: '#eff6ff', border: '#93c5fd' },
  4: { label: 'Other',         Icon: MoreHorizontal,  color: '#64748b', bg: '#f8fafc', border: '#cbd5e1' },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '₹ 0';
  const n = parseFloat(amount) || 0;
  return `₹ ${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n)}`;
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

const truncateText = (text, maxLength = 35) => {
  if (!text) return '—';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// ============================================================================
// COLUMN DEFINITIONS
// All styles are inline inside render() so ListTable renders them correctly.
// Outfit font is declared here — DynamicList/ListTable does not need changes.
// ============================================================================

const columns = [

  // ── Payment ID / Invoice Number ──────────────────────────────────────────
  {
    key: 'id',
    label: 'Payment',
    render: (row) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: '#f0fdf4', border: '1.5px solid #6ee7b7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CreditCard size={17} color="#0f766e" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
            {row.invoice_number || `Invoice #${row.invoice}`}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontFamily: "'Outfit', sans-serif" }}>
            {formatTimestamp(row.created_at)} · ID #{row.id}
          </div>
        </div>
      </div>
    ),
  },

  // ── Payment Method ────────────────────────────────────────────────────────
  {
    key: 'payment_method',
    label: 'Method',
    render: (row) => {
      const method = PAYMENT_METHODS[row.payment_method] || PAYMENT_METHODS[4];
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 11px', borderRadius: 20,
          border: `1.5px solid ${method.border}`,
          background: method.bg,
          fontSize: 12, fontWeight: 600, color: method.color,
          fontFamily: "'Outfit', sans-serif", whiteSpace: 'nowrap',
        }}>
          <method.Icon size={12} />
          {method.label}
        </span>
      );
    },
  },

  // ── Amount ────────────────────────────────────────────────────────────────
  {
    key: 'amount',
    label: 'Amount',
    render: (row) => (
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0f766e', fontFamily: "'Outfit', sans-serif" }}>
          {formatCurrency(row.amount)}
        </div>
      </div>
    ),
  },

  // ── Reference ─────────────────────────────────────────────────────────────
  {
    key: 'reference',
    label: 'Reference',
    render: (row) => (
      row.reference
        ? (
          <span style={{
            fontFamily: 'monospace', fontSize: 12,
            background: '#f1f5f9', color: '#334155',
            padding: '3px 9px', borderRadius: 6,
            border: '1px solid #cbd5e1', whiteSpace: 'nowrap',
          }}>
            {truncateText(row.reference, 30)}
          </span>
        ) : (
          <span style={{ color: '#cbd5e1', fontSize: 13 }}>—</span>
        )
    ),
  },

  // ── Payment Date ──────────────────────────────────────────────────────────
  {
    key: 'payment_date',
    label: 'Payment Date',
    render: (row) => (
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', fontFamily: "'Outfit', sans-serif" }}>
          {formatDate(row.payment_date)}
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontFamily: "'Outfit', sans-serif" }}>
          {formatTimestamp(row.payment_date)}
        </div>
      </div>
    ),
  },

  // ── Note ──────────────────────────────────────────────────────────────────
  {
    key: 'note',
    label: 'Note',
    render: (row) => (
      row.note
        ? (
          <span style={{
            fontSize: 12, color: '#64748b', lineHeight: 1.55,
            fontFamily: "'Outfit', sans-serif",
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
            maxWidth: 200,
          }}>
            {row.note}
          </span>
        ) : (
          <span style={{ color: '#cbd5e1', fontSize: 13 }}>—</span>
        )
    ),
  },

  // ── Actions ───────────────────────────────────────────────────────────────
  // actionHandlers is passed as 3rd arg by ListTable → render(row, index, actionHandlers)
  {
    key: 'actions',
    label: 'Actions',
    render: (row, _index, actionHandlers = {}) => (
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => actionHandlers.onEditPayment?.(row)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: 8,
            border: '1.5px solid #6ee7b7', background: '#f0fdf4',
            color: '#0f766e', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
            whiteSpace: 'nowrap', transition: 'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#dcfce7'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf4'; }}
        >
          Edit
        </button>
      </div>
    ),
  },
];

// ============================================================================
// MAIN CONFIGURATION OBJECT
// ============================================================================

const trackPaymentConfig = {
  title:           'Payment History',
  icon:            CreditCard,
  addButtonLabel:  null,          // Add Payment is handled by the parent page button
  columns,
  showSearch:      false,         // payments list for one invoice — search not needed
  showFilter:      false,
  loadingMessage:  'Loading payments...',
  emptyMessage:    'No Payments Recorded',
  emptySubMessage: 'Record the first payment using the Add Payment button above',
  note:            null,
  defaultSort:     { field: 'created_at', direction: 'desc' },
  defaultPageSize: 10,
};

export default trackPaymentConfig;