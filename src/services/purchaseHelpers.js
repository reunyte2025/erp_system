/**
 * purchaseHelpers.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared pure-JS constants and helper functions used by both
 *   • viewpodetails.jsx       (the main PO details page)
 *   • PurchaseTypeTable.jsx   (the items table component)
 *
 * NO React imports. NO JSX. NO side-effects.
 * Keep this file 100 % pure so it can be imported anywhere safely.
 *
 * Purchase Orders are ALWAYS Execution Compliance type — they only ever
 * use categories 5, 6, 7 and always show the Mat/Lab rate column layout.
 * There is no Regulatory path for POs.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Compliance category maps ─────────────────────────────────────────────────

// Purchase Orders only use execution categories (5, 6, 7)
export const COMPLIANCE_CATEGORIES = {
  5: 'Water Connection',
  6: 'SWD Line Work',
  7: 'Sewer/Drainage Line Work',
};

export const SUB_COMPLIANCE_CATEGORIES = {
  0: { id: 0, name: 'Default' },
  5: { id: 5, name: 'Internal Water Main' },
  6: { id: 6, name: 'Permanent Water Connection' },
  7: { id: 7, name: 'Pipe Jacking Method' },
  8: { id: 8, name: 'HDD Method' },
  9: { id: 9, name: 'Open Cut Method' },
};

// Purchase Orders are always execution compliance only
export const PO_COMPLIANCE_GROUPS = {
  execution: [5, 6, 7],
};

// ─── Status config ────────────────────────────────────────────────────────────
// Icon values intentionally omitted — viewpodetails.jsx keeps its own
// STATUS_CONFIG with Lucide Icon refs so this file stays zero-React.
// Both consumer files use STATUS_CONFIG only for label / color / bg / border.

export const STATUS_CONFIG = {
  '1':          { label: 'Draft',        color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  '2':          { label: 'Sent',         color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  '3':          { label: 'Accepted',     color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  '4':          { label: 'Rejected',     color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  '5':          { label: 'Expired',      color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  '6':          { label: 'Under Review', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  '7':          { label: 'Pending',      color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  'draft':      { label: 'Draft',        color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  'pending':    { label: 'Pending',      color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  'sent':       { label: 'Sent',         color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  'accepted':   { label: 'Accepted',     color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  'rejected':   { label: 'Rejected',     color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  'expired':    { label: 'Expired',      color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  'processing': { label: 'Under Review', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
};

// ─── Company list — same source of truth as quotation / proforma ──────────────
// GST is only applicable for company ID 1.
export const GST_APPLICABLE_COMPANY_ID = 1;

export const PO_COMPANIES = [
  { id: 1, name: 'Constructive India' },
  { id: 2, name: 'PVA Arch' },
  { id: 3, name: 'Atharv India' },
  { id: 4, name: 'VD Associates' },
];

export const getPOCompanyName = (companyId) => {
  const co = PO_COMPANIES.find(c => c.id === parseInt(companyId));
  return co?.name || null;
};

// ─── Formatters ───────────────────────────────────────────────────────────────

/**
 * fmtPONum — returns the PO number exactly as received from the backend.
 * The backend is the sole source of truth for this value; the frontend must
 * never construct, pad, or reformat it.
 */
export const fmtPONum = (n) => {
  if (!n) return '—';
  return String(n);
};

export const fmtINR = (v) => {
  const n = parseFloat(v) || 0;
  // Always show 2 decimal places to preserve amounts like 61,371.80
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

export const fmtDate = (ds) => {
  if (!ds) return '—';
  try {
    return new Date(ds).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return '—';
  }
};

// ─── Misc ─────────────────────────────────────────────────────────────────────

export const getStatus = (s) => {
  const key = String(s || '');
  const lower = key.toLowerCase();
  return STATUS_CONFIG[key] || STATUS_CONFIG[lower] || STATUS_CONFIG['1'];
};

export const groupItemsByCategory = (items = []) => {
  const groups = {};
  items.forEach((item) => {
    const catId = item.compliance_category ?? item.category ?? null;
    const key   = catId != null ? String(catId) : 'other';
    if (!groups[key]) {
      groups[key] = {
        catId,
        catName: catId != null
          ? (COMPLIANCE_CATEGORIES[catId] || `Category ${catId}`)
          : 'Other Services',
        items: [],
      };
    }
    groups[key].items.push(item);
  });
  return Object.values(groups);
};

// ─── Number → words (Indian system) ──────────────────────────────────────────

export function numberToWords(n) {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convert = (num) => {
    if (num === 0) return '';
    if (num < 20)   return ones[num] + ' ';
    if (num < 100)  return tens[Math.floor(num / 10)] + (num % 10 ? '-' + ones[num % 10] : '') + ' ';
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred ' + convert(num % 100);
    if (num < 100000)   return convert(Math.floor(num / 1000))   + 'Thousand ' + convert(num % 1000);
    if (num < 10000000) return convert(Math.floor(num / 100000)) + 'Lakh '     + convert(num % 100000);
    return convert(Math.floor(num / 10000000)) + 'Crore ' + convert(n % 10000000);
  };

  const int = Math.floor(Math.abs(n));
  const dec = Math.round((Math.abs(n) - int) * 100);
  let str   = convert(int).trim() || 'Zero';
  if (dec > 0) str += ` and ${convert(dec).trim()} Paise`;
  return str;
}

// ─── Item total calculation ───────────────────────────────────────────────────

/**
 * calcItemTotal
 * Returns the computed total for one PO line item.
 * PO items are always execution-type (material + labour + professional).
 *
 * Priority order:
 *   1. item.total_amount — the backend-computed value; always use when present
 *      and non-zero (it is the source of truth from the API).
 *   2. Calculated fallback — used only when total_amount is absent (e.g. a
 *      brand-new item being built in edit-mode before the first save).
 */
export const calcItemTotal = (item) => {
  // ── 1. Trust the backend value when it is a valid positive number ────────────
  const backendTotal = parseFloat(item.total_amount);
  if (!isNaN(backendTotal) && backendTotal > 0) {
    return parseFloat(backendTotal.toFixed(2));
  }

  // ── 2. Calculated fallback ───────────────────────────────────────────────────
  const qty     = parseInt(item.quantity)              || 1;
  const prof    = parseFloat(item.Professional_amount) || 0;
  const matRate = parseFloat(item.material_rate)       || 0;
  const labRate = parseFloat(item.labour_rate)         || 0;
  const matAmt  = parseFloat(item.material_amount)     || 0;
  const labAmt  = parseFloat(item.labour_amount)       || 0;

  // Prefer direct amounts; fall back to rate * qty
  if (matAmt > 0 || labAmt > 0) {
    return parseFloat((matAmt + labAmt + prof * qty).toFixed(2));
  }

  if (matRate > 0 || labRate > 0) {
    return parseFloat(((matRate + labRate + prof) * qty).toFixed(2));
  }

  return parseFloat((prof * qty).toFixed(2));
};

/**
 * getExecutionDisplayValues
 * Returns the 5 display values for a PO item's rate columns.
 */
export const getExecutionDisplayValues = (item) => {
  const qty     = parseInt(item.quantity)              || 1;
  const prof    = parseFloat(item.Professional_amount) || 0;
  const matRate = parseFloat(item.material_rate)       || 0;
  const labRate = parseFloat(item.labour_rate)         || 0;
  const matAmt  = parseFloat(item.material_amount)     || 0;
  const labAmt  = parseFloat(item.labour_amount)       || 0;
  return { qty, prof, matRate, labRate, matAmt, labAmt };
};

/**
 * hasRateBreakdown
 * Returns true when at least one rate/amount field has a positive value.
 */
export const hasRateBreakdown = (item) => {
  const matRate = parseFloat(item.material_rate)   || 0;
  const labRate = parseFloat(item.labour_rate)     || 0;
  const matAmt  = parseFloat(item.material_amount) || 0;
  const labAmt  = parseFloat(item.labour_amount)   || 0;
  return matRate > 0 || labRate > 0 || matAmt > 0 || labAmt > 0;
};