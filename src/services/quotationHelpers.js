/**
 * quotationHelpers.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared pure-JS constants and helper functions used by both
 *   • viewquotationdetails.jsx  (the main details page)
 *   • QuotationTypeTable.jsx    (the type-aware items table component)
 *
 * NO React imports. NO JSX. NO side-effects.
 * Keep this file 100 % pure so it can be imported anywhere safely.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Compliance category maps ─────────────────────────────────────────────────

export const COMPLIANCE_CATEGORIES = {
  1: 'Construction Certificate',
  2: 'Occupational Certificate',
  3: 'Water Main Commissioning',
  4: 'STP Commissioning',
  5: 'Water Connection',
  6: 'SWD Line Work',
  7: 'Sewer/Drainage Line Work',
  8: 'Architecture',
};

export const SUB_COMPLIANCE_CATEGORIES = {
  1: { id: 1, name: 'Plumbing Compliance' },
  2: { id: 2, name: 'PCO Compliance' },
  3: { id: 3, name: 'General Compliance' },
  4: { id: 4, name: 'Road Setback Handing over' },
  0: { id: 0, name: 'Default' },
  5: { id: 5, name: 'Internal Water Main' },
  6: { id: 6, name: 'Permanent Water Connection' },
  7: { id: 7, name: 'Pipe Jacking Method' },
  8: { id: 8, name: 'HDD Method' },
  9: { id: 9, name: 'Open Cut Method' },
};

// ─── Status config ────────────────────────────────────────────────────────────
// NOTE: Icon values are intentionally kept as strings here so this file has
// zero React/Lucide dependency.  viewquotationdetails.jsx maps these strings
// to the actual Lucide components just as before — nothing changes for callers
// that already use getStatus().
// The Icon property is kept as-is from the original file; both consumer files
// import the Lucide icons themselves and use STATUS_CONFIG only for the
// label / color / bg / border values.

export const STATUS_CONFIG = {
  '1':                  { label: 'Draft',              color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  '2':                  { label: 'Pending',            color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  '3':                  { label: 'Proforma Generated', color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  '4':                  { label: 'Completed',          color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  '5':                  { label: 'Failed',             color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  'draft':              { label: 'Draft',              color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  'pending':            { label: 'Pending',            color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  'sent':               { label: 'Proforma Generated', color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  'accepted':           { label: 'Proforma Generated', color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  'proforma_generated': { label: 'Proforma Generated', color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  'completed':          { label: 'Completed',          color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  'approved':           { label: 'Completed',          color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  'failed':             { label: 'Failed',             color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  'rejected':           { label: 'Failed',             color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
};

// Architecture category — treated as regulatory-style (prof + consultancy, no sub-category)
export const ARCHITECTURE_CAT = 8;

/**
 * fmtQNum — returns the quotation number exactly as received from the backend.
 * The backend is the sole source of truth for this value; the frontend must
 * never construct, pad, or reformat it.
 */
export const fmtQNum = (n) => {
  if (!n) return '—';
  return String(n);
};

export const fmtINR = (v) => {
  const n = parseFloat(v) || 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
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

export const getStatus = (s) =>
  STATUS_CONFIG[String(s || '').toLowerCase()] || STATUS_CONFIG['1'];

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
    if (num < 100000)   return convert(Math.floor(num / 1000))    + 'Thousand ' + convert(num % 1000);
    if (num < 10000000) return convert(Math.floor(num / 100000))  + 'Lakh '     + convert(num % 100000);
    return convert(Math.floor(num / 10000000)) + 'Crore ' + convert(n % 10000000);
  };

  const int = Math.floor(n);
  const dec = Math.round((n - int) * 100);
  let str   = convert(int).trim() || 'Zero';
  if (dec > 0) str += ` and ${convert(dec).trim()} Paise`;
  return str;
}

// ─── Item total calculation ───────────────────────────────────────────────────

/**
 * calcItemTotal
 * Returns the computed total for one line item.
 * Works for both Regulatory and Execution items — same logic as the original.
 */
export const calcItemTotal = (item) => {
  const qty     = parseInt(item.quantity)            || 1;
  const prof    = parseFloat(item.Professional_amount) || 0;
  const matRate = parseFloat(item.material_rate)       || 0;
  const labRate = parseFloat(item.labour_rate)         || 0;
  const matAmt  = parseFloat(item.material_amount)     || 0;
  const labAmt  = parseFloat(item.labour_amount)       || 0;

  // Execution item: any of the four rate/amount fields is present (not undefined/null).
  // Uses != null which covers both undefined and null in one check.
  const isExecItem = (
    item.material_rate   != null ||
    item.labour_rate     != null ||
    item.material_amount != null ||
    item.labour_amount   != null
  );

  if (isExecItem) {
    // Prefer direct amounts from API; fall back to rate * qty
    const effectiveMat = matAmt > 0 ? matAmt : (matRate > 0 ? matRate * qty : 0);
    const effectiveLab = labAmt > 0 ? labAmt : (labRate > 0 ? labRate * qty : 0);
    if (effectiveMat > 0 || effectiveLab > 0) {
      return parseFloat((effectiveMat + effectiveLab).toFixed(2));
    }
    // Nothing in rates → fall back to Professional_amount
    return parseFloat((prof * qty).toFixed(2));
  }

  // Regulatory item — consultancy_charges replaces the old miscellaneous_amount
  const consultancy = (() => {
    const raw = item.consultancy_charges ?? item.miscellaneous_amount;
    if (raw === '--' || raw === null || raw === undefined || raw === '') return 0;
    const n = parseFloat(String(raw).trim());
    return isNaN(n) ? 0 : n;
  })();

  return parseFloat(((prof + consultancy) * qty).toFixed(2));
};

// ─── Execution display helpers ────────────────────────────────────────────────

/**
 * Returns the 4 display values for an execution item's rate columns.
 * Prefers direct amounts; falls back to rate * qty so columns are never blank.
 */
export const getExecutionDisplayValues = (item) => {
  const qty     = parseInt(item.quantity)          || 1;
  const prof    = parseFloat(item.Professional_amount) || 0;
  const matRate = parseFloat(item.material_rate)   || 0;
  const labRate = parseFloat(item.labour_rate)     || 0;
  // Use the field value directly — DO NOT fall back here; let the render decide visibility
  const matAmt  = parseFloat(item.material_amount) || 0;
  const labAmt  = parseFloat(item.labour_amount)   || 0;
  return { qty, prof, matRate, labRate, matAmt, labAmt };
};

/**
 * Returns true when at least one of the 4 execution rate/amount fields has a value.
 * Checks field presence on the raw item to avoid false negatives from parseFloat("0").
 */
export const hasExecutionRateBreakdown = (item) => {
  const matRate = parseFloat(item.material_rate)   || 0;
  const labRate = parseFloat(item.labour_rate)     || 0;
  const matAmt  = parseFloat(item.material_amount) || 0;
  const labAmt  = parseFloat(item.labour_amount)   || 0;
  return matRate > 0 || labRate > 0 || matAmt > 0 || labAmt > 0;
};