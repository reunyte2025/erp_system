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
// NOTE TOOLTIP STYLES — injected ONCE into <head> at module load time.
//
// Root cause of the "works first time, breaks on navigation" bug:
//   Previously the <style> block lived inside the Note column's render()
//   function. Every row render injected its own copy, and each navigation
//   caused React to remount rows — the last row's <style> would overwrite
//   all the others, leaving some rows with broken or missing CSS rules.
//
// Fix: inject a single <style id="tp-note-tooltip-styles"> into document.head
//   here at module evaluation time. The id guard ensures it only runs once
//   even if the module is hot-reloaded. Navigation never touches it again.
// ============================================================================

const NOTE_STYLE_ID = 'tp-note-tooltip-styles';

if (typeof document !== 'undefined' && !document.getElementById(NOTE_STYLE_ID)) {
  const styleEl = document.createElement('style');
  styleEl.id = NOTE_STYLE_ID;
  styleEl.textContent = `
    /* ── Tooltip wrapper ──────────────────────────────────────────────────────
       padding-bottom + margin-bottom extends the hover zone downward so the
       mouse doesn't lose :hover while crossing the gap between the trigger
       text and the floating tooltip box.                                      */
    .tp-note-wrap {
      position: relative;
      display: inline-block;
      max-width: 200px;
      padding-bottom: 14px;
      margin-bottom: -14px;
    }

    .tp-note-text {
      font-size: 12px;
      color: #64748b;
      font-family: 'Outfit', sans-serif;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
      display: block;
    }

    /* Dashed underline signals "hover me for more" */
    .tp-note-text--truncated {
      border-bottom: 1px dashed #94a3b8;
      cursor: help;
    }

    /* ── Tooltip box ───────────────────────────────────────────────────────── */
    .tp-note-tooltip {
      visibility: hidden;
      opacity: 0;
      /* pointer-events: auto lets the user move their mouse INTO the tooltip
         without it disappearing — critical for readability on long notes.     */
      pointer-events: auto;
      position: absolute;
      bottom: calc(100% + 2px);
      left: 50%;
      transform: translateX(-50%) translateY(6px);
      background: #0f172a;
      color: #f1f5f9;
      font-size: 12px;
      font-family: 'Outfit', sans-serif;
      font-weight: 400;
      line-height: 1.65;
      padding: 10px 14px;
      border-radius: 10px;
      width: max-content;
      max-width: 300px;
      white-space: pre-wrap;
      word-break: break-word;
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.28);
      z-index: 9999;
      /* Delay visibility:hidden so the CSS fade-out finishes first */
      transition: opacity 0.15s ease, transform 0.15s ease, visibility 0s linear 0.15s;
    }

    /* ::before fills the invisible gap between the tooltip bottom and the
       trigger text — keeps :hover alive while the mouse crosses the gap.     */
    .tp-note-tooltip::before {
      content: '';
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      height: 18px;
    }

    /* Caret arrow pointing down toward the trigger */
    .tp-note-tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-top-color: #0f172a;
    }

    /* Show immediately on hover-in; delay on hover-out handled by transition */
    .tp-note-wrap:hover .tp-note-tooltip {
      visibility: visible;
      opacity: 1;
      transform: translateX(-50%) translateY(0);
      transition: opacity 0.15s ease, transform 0.15s ease, visibility 0s linear 0s;
    }

    /* ── Critical: stop table rows/cells from clipping the tooltip ──────────
       position:absolute tooltips are clipped whenever an ancestor has
       overflow:hidden (common in table implementations). Setting overflow
       visible on tr and td lets the tooltip escape above the row.           */
    table tr,
    table td {
      overflow: visible !important;
    }
  `;
  document.head.appendChild(styleEl);
}

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

  // ── Note ─────────────────────────────────────────────────────────────────
  // No <style> tag here — CSS lives in document.head (injected above).
  // This is the fix for the "works first time, breaks on navigation" bug.
  {
    key: 'note',
    label: 'Note',
    render: (row) => {
      if (!row.note) {
        return <span style={{ color: '#cbd5e1', fontSize: 13 }}>—</span>;
      }

      const isTruncated = row.note.length > 32;
      const preview     = isTruncated ? row.note.substring(0, 32) + '…' : row.note;

      return (
        <div className="tp-note-wrap">
          <span className={`tp-note-text${isTruncated ? ' tp-note-text--truncated' : ''}`}>
            {preview}
          </span>
          {isTruncated && (
            <div className="tp-note-tooltip">{row.note}</div>
          )}
        </div>
      );
    },
  },

  // ── Actions ───────────────────────────────────────────────────────────────
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
  addButtonLabel:  null,
  columns,
  showSearch:      false,
  showFilter:      false,
  loadingMessage:  'Loading payments...',
  emptyMessage:    'No Payments Recorded',
  emptySubMessage: 'Record the first payment using the Add Payment button above',
  note:            null,
  defaultSort:     { field: 'created_at', direction: 'desc' },
  defaultPageSize: 10,
};

export default trackPaymentConfig;