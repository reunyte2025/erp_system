/**
 * proformaHelpers.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared pure-JS constants and helper functions used by both
 *   • viewproformadetails.jsx  (the main details page)
 *   • ProformaTypeTable.jsx    (the type-aware items table component)
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

/**
 * COMPLIANCE_GROUPS — categorises compliance_category IDs into types.
 * Execution categories are 5, 6, 7 (Water Connection, SWD Line Work,
 * Sewer/Drainage Line Work). All others are Regulatory.
 */
export const COMPLIANCE_GROUPS = {
  regulatory: [1, 2, 3, 4],
  execution:  [5, 6, 7],
};

// ─── Status config ────────────────────────────────────────────────────────────
// Icon strings are intentionally omitted here — viewproformadetails.jsx keeps its
// own STATUS_CONFIG with Lucide Icon refs (so this file stays zero-React).
// Both consumer files use STATUS_CONFIG only for label / color / bg / border.

// Actual backend status values from Proforma model:
//   draft | sent | approved | rejected | expired
export const STATUS_CONFIG = {
  'draft':             { label: 'Draft',             color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  'sent':              { label: 'Sent for Approval', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  'approved':          { label: 'Approved',          color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  'rejected':          { label: 'Rejected',          color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  'expired':           { label: 'Expired',           color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
  // Human-readable display string alias
  'sent for approval': { label: 'Sent for Approval', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
};

// ─── Formatters ───────────────────────────────────────────────────────────────

/**
 * fmtPNum — returns the proforma number exactly as received from the backend.
 * The backend is the sole source of truth for this value; the frontend must
 * never construct, pad, or reformat it.
 */
export const fmtPNum = (n) => {
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

export const getStatus = (s) => {
  if (s && typeof s === 'object') {
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

// ─── Compliance type helpers ──────────────────────────────────────────────────

/**
 * getComplianceType
 * Infers whether a set of items belongs to 'execution' or 'regulatory' work,
 * matching the same logic used in proforma.js → inferProformaCreationType.
 *
 * @param  {Array}  items  — proforma.items array
 * @returns {'execution'|'regulatory'}
 */
export const getComplianceType = (items = []) => {
  const hasExecutionItems = items.some((item) => {
    const categoryId = Number(item?.compliance_category || item?.category || 0);
    return COMPLIANCE_GROUPS.execution.includes(categoryId);
  });
  return hasExecutionItems ? 'execution' : 'regulatory';
};

/**
 * getComplianceTypeLabel
 * Human-readable label for the compliance type.
 */
export const getComplianceTypeLabel = (items = []) => {
  const type = getComplianceType(items);
  return type === 'execution' ? 'Execution Compliance' : 'Regulatory Compliance';
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

  const int = Math.floor(n);
  const dec = Math.round((n - int) * 100);
  let str   = convert(int).trim() || 'Zero';
  if (dec > 0) str += ` and ${convert(dec).trim()} Paise`;
  return str;
}

// ─── Item total calculation ───────────────────────────────────────────────────

/**
 * calcItemTotal
 * Returns the correct total for one line item.
 *
 * Priority order:
 *   1. item.total_amount  — the backend-computed value; always use it when present
 *      and non-zero (it is the source of truth from the API).
 *   2. Calculated fallback — used only when total_amount is absent (e.g. a brand-new
 *      item being built in edit-mode before the first save).
 *
 * Calculation fallback logic:
 *   • Execution item  →  (material_amount || material_rate×qty) + (labour_amount || labour_rate×qty)
 *                        falls back to Professional_amount×qty if no rates present.
 *   • Regulatory item →  (Professional_amount + consultancy_charges) × qty
 */
export const calcItemTotal = (item) => {
  // ── 1. Trust the backend value when it is a valid positive number ────────────
  const backendTotal = parseFloat(item.total_amount);
  if (!isNaN(backendTotal) && backendTotal > 0) {
    return parseFloat(backendTotal.toFixed(2));
  }

  // ── 2. Calculated fallback (edit-mode new items, or backend returned 0) ──────
  const qty     = parseInt(item.quantity)              || 1;
  const prof    = parseFloat(item.Professional_amount) || 0;
  const matRate = parseFloat(item.material_rate)       || 0;
  const labRate = parseFloat(item.labour_rate)         || 0;
  const matAmt  = parseFloat(item.material_amount)     || 0;
  const labAmt  = parseFloat(item.labour_amount)       || 0;

  // Execution item: at least one execution-specific field has a positive value.
  const isExecItem = matRate > 0 || labRate > 0 || matAmt > 0 || labAmt > 0;

  if (isExecItem) {
    const effectiveMat = matAmt > 0 ? matAmt : (matRate > 0 ? matRate * qty : 0);
    const effectiveLab = labAmt > 0 ? labAmt : (labRate > 0 ? labRate * qty : 0);
    if (effectiveMat > 0 || effectiveLab > 0) {
      return parseFloat((effectiveMat + effectiveLab).toFixed(2));
    }
    return parseFloat((prof * qty).toFixed(2));
  }

  // Regulatory item — parse consultancy_charges (string from API) correctly.
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
  const qty     = parseInt(item.quantity)              || 1;
  const prof    = parseFloat(item.Professional_amount) || 0;
  const matRate = parseFloat(item.material_rate)       || 0;
  const labRate = parseFloat(item.labour_rate)         || 0;
  const matAmt  = parseFloat(item.material_amount)     || 0;
  const labAmt  = parseFloat(item.labour_amount)       || 0;
  return { qty, prof, matRate, labRate, matAmt, labAmt };
};

/**
 * Returns true when at least one of the 4 execution rate/amount fields has a value.
 */
export const hasExecutionRateBreakdown = (item) => {
  const matRate = parseFloat(item.material_rate)   || 0;
  const labRate = parseFloat(item.labour_rate)     || 0;
  const matAmt  = parseFloat(item.material_amount) || 0;
  const labAmt  = parseFloat(item.labour_amount)   || 0;
  return matRate > 0 || labRate > 0 || matAmt > 0 || labAmt > 0;
};