/**
 * invoiceHelpers.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared pure-JS constants and helper functions used by both
 *   • viewinvoicedetails.jsx  (the main details page)
 *   • InvoiceTypeTable.jsx    (the type-aware items table component)
 *
 * NO React imports. NO JSX. NO side-effects.
 * Keep this file 100 % pure so it can be imported anywhere safely.
 *
 * Invoice has THREE types (unlike quotation/proforma which have two):
 *   1. Regulatory   — client invoice, categories 1–4, Consultancy column
 *   2. Execution    — client invoice, categories 5–7, Mat/Lab rate columns
 *   3. Vendor (PO)  — vendor/purchase-order invoice, same Mat/Lab columns
 *                     as Execution but "Bill To" shows the vendor, not client
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Compliance category maps ─────────────────────────────────────────────────

// Regulatory invoice categories (from quotation/proforma flow)
export const REGULATORY_COMPLIANCE_CATEGORIES = {
  1: 'Construction Certificate',
  2: 'Occupational Certificate',
  3: 'Water Main Commissioning',
  4: 'STP Commissioning',
};

// Execution & Purchase Order invoice categories
export const EXECUTION_COMPLIANCE_CATEGORIES = {
  5: 'Water Connection',
  6: 'SWD Line Work',
  7: 'Sewer/Drainage Line Work',
};

// Merged map for display — used by both files
export const COMPLIANCE_CATEGORIES = {
  ...REGULATORY_COMPLIANCE_CATEGORIES,
  ...EXECUTION_COMPLIANCE_CATEGORIES,
};

export const SUB_COMPLIANCE_CATEGORIES = {
  0: { id: 0, name: 'Default' },
  1: { id: 1, name: 'Plumbing Compliance' },
  2: { id: 2, name: 'PCO Compliance' },
  3: { id: 3, name: 'General Compliance' },
  4: { id: 4, name: 'Road Setback Handing over' },
  5: { id: 5, name: 'Internal Water Main' },
  6: { id: 6, name: 'Permanent Water Connection' },
  7: { id: 7, name: 'Pipe Jacking Method' },
  8: { id: 8, name: 'HDD Method' },
  9: { id: 9, name: 'Open Cut Method' },
};

// ─── Status config ────────────────────────────────────────────────────────────
// Icon values intentionally omitted — viewinvoicedetails.jsx keeps its own
// STATUS_CONFIG with Lucide Icon refs so this file stays zero-React.
// Both consumer files use STATUS_CONFIG only for label / color / bg / border.

// Actual backend status values from Invoice model:
//   draft | sent | partial_paid | paid | cancelled
export const STATUS_CONFIG = {
  // ── Actual backend status slugs ───────────────────────────────────────────
  'draft':        { label: 'Draft',        color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  'sent':         { label: 'Sent',         color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  'partial_paid': { label: 'Partial Paid', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  'paid':         { label: 'Paid',         color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  'cancelled':    { label: 'Cancelled',    color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  'canceled':     { label: 'Cancelled',    color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },

  // ── Human-readable display strings (status_display from API) ──────────────
  'partial paid':  { label: 'Partial Paid', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  'overdue':       { label: 'Overdue',      color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
};

// ─── Formatters ───────────────────────────────────────────────────────────────

export const fmtInvNum = (n) => {
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

export const isMiscNumeric = (v) => {
  if (v === '' || v == null) return false;
  const s = String(v).trim();
  return s !== '' && !isNaN(s) && !isNaN(parseFloat(s));
};

export const getStatus = (s) => {
  if (s && typeof s === 'object') {
    // Try status_display first (backend may return "Overdue" etc.)
    const display = String(s.status_display || '').toLowerCase().trim();
    if (display && STATUS_CONFIG[display]) return STATUS_CONFIG[display];
    const raw = String(s.status || '').toLowerCase().trim();
    if (raw && STATUS_CONFIG[raw]) return STATUS_CONFIG[raw];
    return STATUS_CONFIG['draft'];
  }
  const key = String(s || '').toLowerCase().trim();
  return STATUS_CONFIG[key] || STATUS_CONFIG['draft'];
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

// ─── Invoice type detection ───────────────────────────────────────────────────

/**
 * normalizeInvoiceType
 * Maps any invoice_type string to one of: 'vendor' | 'execution' | 'regulatory' | ''
 */
export const normalizeInvoiceType = (value = '') => {
  const t = String(value || '').toLowerCase().trim();
  if (!t) return '';
  if (t.includes('vendor') || t.includes('purchase')) return 'vendor';
  if (t.includes('execution')) return 'execution';
  if (t.includes('regulatory')) return 'regulatory';
  return '';
};

/**
 * detectInvoiceTypeFromData
 * Determines the true invoice type from response data using STRUCTURAL validation.
 *
 * Rule priority (most reliable → least reliable):
 *   1. vendor field non-null              → 'vendor'
 *   2. client field non-null + has rates  → 'execution'
 *   3. client field non-null, no rates   → 'regulatory'
 *   4. vendor_name set (but vendor null) → 'vendor'
 *   5. invoice_type string               → fallback
 *   6. items rate breakdown analysis     → fallback
 */
export const detectInvoiceTypeFromData = (invoiceData = {}) => {
  // Structural check 1: vendor field present and non-null → vendor invoice
  if (invoiceData?.vendor != null && invoiceData.vendor !== '') return 'vendor';

  // Structural check 2: client field present and non-null → client invoice
  if (invoiceData?.client != null && invoiceData.client !== '') {
    if (Array.isArray(invoiceData?.items)) {
      const hasRateBreakdown = invoiceData.items.some((item) =>
        (item?.material_rate   != null && parseFloat(item.material_rate)   !== 0) ||
        (item?.labour_rate     != null && parseFloat(item.labour_rate)     !== 0) ||
        (item?.material_amount != null && parseFloat(item.material_amount) !== 0) ||
        (item?.labour_amount   != null && parseFloat(item.labour_amount)   !== 0)
      );
      if (hasRateBreakdown) return 'execution';
    }
    return 'regulatory';
  }

  // Structural check 3: vendor_name set but vendor ID null
  if (invoiceData?.vendor_name) return 'vendor';

  // Fallback: trust invoice_type string only when structural fields absent
  const normalizedType = normalizeInvoiceType(invoiceData?.invoice_type);
  if (normalizedType) return normalizedType;

  // Last resort: items analysis without client/vendor context
  if (Array.isArray(invoiceData?.items)) {
    const hasRateBreakdown = invoiceData.items.some((item) =>
      (item?.material_rate   != null && parseFloat(item.material_rate)   !== 0) ||
      (item?.labour_rate     != null && parseFloat(item.labour_rate)     !== 0) ||
      (item?.material_amount != null && parseFloat(item.material_amount) !== 0) ||
      (item?.labour_amount   != null && parseFloat(item.labour_amount)   !== 0)
    );
    if (hasRateBreakdown) return 'execution';
  }

  return '';
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
 * Returns the computed total for one line item.
 * Works for Regulatory, Execution, and Vendor Compliance items — same logic
 * as the original inline code in viewinvoicedetails.jsx.
 */
export const calcItemTotal = (item) => {
  const qty  = parseInt(item.quantity) || 1;
  const prof = parseFloat(item.Professional_amount) || 0;

  const isExecItem = (
    item.material_rate   != null ||
    item.labour_rate     != null ||
    item.material_amount != null ||
    item.labour_amount   != null
  );

  if (isExecItem) {
    // material_amount / labour_amount are server-computed aggregate totals (rate × qty).
    // Professional_amount is per-unit — must be multiplied by qty separately.
    const matAmt  = parseFloat(item.material_amount) || 0;
    const labAmt  = parseFloat(item.labour_amount)   || 0;
    const matRate = parseFloat(item.material_rate)   || 0;
    const labRate = parseFloat(item.labour_rate)     || 0;
    if (matAmt > 0 || labAmt > 0) {
      return parseFloat((matAmt + labAmt + prof * qty).toFixed(2));
    }
    // Fallback: all fields are per-unit
    return parseFloat(((matRate + labRate + prof) * qty).toFixed(2));
  }

  // Regulatory: both per-unit fees × qty
  const consultancy = (() => {
    const raw = item.consultancy_charges ?? item.miscellaneous_amount;
    if (raw === '--' || raw == null || raw === '') return 0;
    const n = parseFloat(String(raw).trim());
    return isNaN(n) ? 0 : n;
  })();
  return parseFloat(((prof + consultancy) * qty).toFixed(2));
};

/**
 * calcItemUnitAmount
 * Returns the PER-UNIT amount for one piece of a line item.
 * Used in the PDF modal checklist so lineTotal = unitAmt × selectedQty is
 * always correct.
 *
 * EXECUTION / VENDOR items → mat_rate + lab_rate + Professional_amount (all per-unit)
 *   Fallback when rates absent: (matAmt + labAmt) / qty + prof
 * REGULATORY items → Professional_amount + consultancy_charges (both per-unit)
 */
export const calcItemUnitAmount = (item) => {
  const qty  = parseInt(item.quantity) || 1;
  const prof = parseFloat(item.Professional_amount) || 0;

  const isExecItem = (
    item.material_rate   != null ||
    item.labour_rate     != null ||
    item.material_amount != null ||
    item.labour_amount   != null
  );

  if (isExecItem) {
    const matRate = parseFloat(item.material_rate) || 0;
    const labRate = parseFloat(item.labour_rate)   || 0;
    if (matRate > 0 || labRate > 0) {
      return parseFloat((matRate + labRate + prof).toFixed(2));
    }
    const matAmt = parseFloat(item.material_amount) || 0;
    const labAmt = parseFloat(item.labour_amount)   || 0;
    return parseFloat(((matAmt + labAmt) / qty + prof).toFixed(2));
  }

  const consultancy = (() => {
    const raw = item.consultancy_charges ?? item.miscellaneous_amount;
    if (raw === '--' || raw == null || raw === '') return 0;
    const n = parseFloat(String(raw).trim());
    return isNaN(n) ? 0 : n;
  })();
  return parseFloat((prof + consultancy).toFixed(2));
};