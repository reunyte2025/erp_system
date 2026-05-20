/**
 * QuotationTypeTable.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders the line-items section of the Quotation Details page.
 *
 * Responsibilities:
 *   • Section header — dynamic per quotation type:
 *       "Regulatory Compliance Items" / "Execution Work Items" / "Architecture Compliance Items"
 *   • "+ Add Item" button in edit mode
 *   • VIEW MODE table  — correct columns per quotation type
 *   • EDIT MODE table  — editable inputs, correct columns per quotation type
 *
 * Architecture type:
 *   Columns: #, Service Description, Qty, Unit, Consultancy (₹), Professional (₹), Item Total (₹)
 *   No Sub-Category column. No material/labour rate columns.
 *
 * What this component does NOT own:
 *   • Any state (all state lives in viewquotationdetails.jsx)
 *   • Any API calls
 *   • Any modals
 *   • Any CSS classes (all classes are defined in viewquotationdetails.jsx's
 *     <style> block which is always mounted first in the same page render)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { FileText, Wrench, Plus, Trash2, Landmark } from 'lucide-react';
import {
  COMPLIANCE_CATEGORIES,
  SUB_COMPLIANCE_CATEGORIES,
  fmtINR,
  calcItemTotal,
  getExecutionDisplayValues,
  hasExecutionRateBreakdown,
  isBlankOptionalValue,
} from '../../services/quotationHelpers';

const getSubComplianceName = (value) => {
  if (!value) return '';
  return SUB_COMPLIANCE_CATEGORIES[value]?.name || String(value);
};

// ── Expand-on-focus helpers ────────────────────────────────────────────────────
// Strategy: each input sits inside a `position:relative` wrapper div.
// On focus the input switches to `position:absolute` with high z-index so it
// floats above ALL sibling table cells. The wrapper keeps its height so the
// row doesn't collapse.
const onExpandFocus = (e, extra = {}) => {
  const inp = e.currentTarget;
  const wrapper = inp.parentElement;
  if (wrapper) {
    // Lock the wrapper size so the row height doesn't collapse
    const h = wrapper.offsetHeight;
    const w = wrapper.offsetWidth;
    wrapper.style.height = `${h}px`;
    wrapper.style.minWidth = `${w}px`;
  }
  Object.assign(inp.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    zIndex: '9999',
    minWidth: '170px',
    width: 'auto',
    boxShadow: '0 6px 24px rgba(15,118,110,0.25), 0 2px 8px rgba(0,0,0,0.15)',
    borderColor: '#0f766e',
    borderWidth: '2px',
    background: '#f0fdf4',
    borderRadius: '8px',
    padding: '6px 10px',
    transition: 'box-shadow 0.12s, border-color 0.12s',
    ...extra,
  });
};

const onExpandBlur = (e, restore = {}) => {
  const inp = e.currentTarget;
  const wrapper = inp.parentElement;
  if (wrapper) {
    wrapper.style.height = '';
    wrapper.style.minWidth = '';
  }
  Object.assign(inp.style, {
    position: '',
    top: '',
    left: '',
    zIndex: '',
    minWidth: '',
    width: '100%',
    boxShadow: 'none',
    borderColor: '',
    borderWidth: '',
    background: '',
    borderRadius: '',
    padding: '',
    transition: 'box-shadow 0.12s, border-color 0.12s',
    ...restore,
  });
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Props
 * ─────
 * isExecution      {boolean}  — true when quotation_type includes "execution"
 * isRegulatory     {boolean}  — true for regulatory compliance quotations
 * isArchitecture   {boolean}  — true for architecture compliance quotations
 * quotationType    {string}   — raw quotation_type string from backend (for header display)
 * editMode         {boolean}  — true when the page is in edit mode
 * items            {Array}    — view-mode items from quotation.items
 * editItems        {Array}    — edit-mode item array (live-edited copies)
 * updateItem       {Function} — (index, field, value) → updates editItems
 * removeItem       {Function} — (index) → removes item from editItems
 * onAddItem        {Function} — () → opens the AddCompliance modal
 */
export default function QuotationTypeTable({
  isExecution,
  isRegulatory,
  isArchitecture,
  quotationType,
  editMode,
  items,
  editItems,
  updateItem,
  removeItem,
  onAddItem,
}) {
  // ── Derived counts ─────────────────────────────────────────────────────────
  const displayCount = editMode ? editItems.length : items.length;

  // ── Determine section header text and icon ─────────────────────────────────
  const sectionLabel = isExecution
    ? 'Execution Work Items'
    : isArchitecture
      ? (quotationType || 'Architecture Compliance') + ' Items'
      : 'Regulatory Compliance Items';

  const SectionIcon = isExecution ? Wrench : isArchitecture ? Landmark : FileText;
  const sectionIconColor = isExecution ? '#7c3aed' : isArchitecture ? '#9333ea' : '#0f766e';

  // ── Group view-mode items by compliance category ───────────────────────────
  const viewGroups = (() => {
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
  })();

  // ── Group edit-mode items by compliance category (preserving globalIdx) ────
  const editGroups = (() => {
    const groups = {};
    editItems.forEach((it, globalIdx) => {
      const catId = it.compliance_category ?? 0;
      const key   = String(catId);
      if (!groups[key]) {
        groups[key] = {
          catId,
          catName: COMPLIANCE_CATEGORIES[catId] || `Category ${catId}`,
          rows: [],
        };
      }
      groups[key].rows.push({ it, globalIdx });
    });
    return groups;
  })();

  // ── Execution: check if ANY item has per-unit material/labour RATES ─────────
  // Only check material_rate / labour_rate (per-unit rates entered by user).
  // Do NOT check material_amount / labour_amount — the backend auto-populates
  // those from Professional_amount for execution items, giving false positives.
  const anyExecBreakdown = isExecution && (() => {
    const source = editMode ? editItems : items;
    return source.some(it =>
      (parseFloat(it.material_rate) || 0) > 0 ||
      (parseFloat(it.labour_rate)  || 0) > 0
    );
  })();

  // ── colspan constants ──────────────────────────────────────────────────────
  // Architecture: #, Desc, Qty, Unit, Consultancy, Professional, Total = 7
  // Regulatory:   #, Desc, SubCat, Qty, Unit, Professional, Consultancy, Total = 8
  // Execution (with breakdown):    #, Desc, SubCat, Qty, Unit, SAC, MatRate, LabRate, MatAmt, LabAmt, Total = 11
  // Execution (no breakdown):      #, Desc, SubCat, Qty, Unit, SAC, Rate, Total = 8
  const viewColSpan = isExecution
    ? (anyExecBreakdown ? 11 : 8)
    : isArchitecture ? 7 : 8;

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="vqd-items">
      {/* ── Hide number-input spinners for all edit inputs in this section ── */}
      <style>{`
        .vqd-items input[type=number].vqd-edit-input::-webkit-inner-spin-button,
        .vqd-items input[type=number].vqd-edit-input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .vqd-items input[type=number].vqd-edit-input {
          -moz-appearance: textfield;
        }
        .vqd-items .vqd-edit-input:focus {
          outline: none;
        }
      `}</style>

      {/* ── Section header ── */}
      <div className="vqd-sec-hdr">
        <SectionIcon size={15} color={sectionIconColor} />
        {sectionLabel}
        <span className="vqd-sec-badge">
          {displayCount} {displayCount === 1 ? 'item' : 'items'}
        </span>
        {editMode && (
          <button
            onClick={onAddItem}
            style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', background: 'linear-gradient(135deg,#0f766e,#0d9488)',
              color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 2px 8px rgba(15,118,110,.25)', fontFamily: 'inherit',
            }}
          >
            <Plus size={14} /> Add Item
          </button>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          VIEW MODE TABLE
          ═══════════════════════════════════════════════════════════════════ */}
      {!editMode && (
        items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', gap: 8 }}>
            <FileText size={32} color="#e2e8f0" />
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>No line items found</p>
          </div>
        ) : (
          <div className="vqd-table-wrap">
            <table className="vqd-table">
              <thead>
                {isArchitecture ? (
                  /* ── Architecture header — no Sub-Category, shows Consultancy + Professional ── */
                  <tr>
                    <th style={{ width: 32 }}>#</th>
                    <th>Service Description</th>
                    <th style={{ width: 54, textAlign: 'center' }}>Qty</th>
                    <th style={{ width: 70, textAlign: 'center' }}>Unit</th>
                    <th style={{ width: 130, textAlign: 'right' }}>Consultancy (₹)</th>
                    <th style={{ width: 120, textAlign: 'right' }}>Professional (₹)</th>
                    <th style={{ width: 115, textAlign: 'right' }}>Item Total (₹)</th>
                  </tr>
                ) : isRegulatory ? (
                  /* ── Regulatory header — single row ── */
                  <tr>
                    <th style={{ width: 32 }}>#</th>
                    <th>Service Description</th>
                    <th style={{ width: 110 }}>Sub-Category</th>
                    <th style={{ width: 54, textAlign: 'center' }}>Qty</th>
                    <th style={{ width: 70, textAlign: 'center' }}>Unit</th>
                    <th style={{ width: 120, textAlign: 'right' }}>Professional (₹)</th>
                    <th style={{ width: 130, textAlign: 'right' }}>Consultancy / Misc</th>
                    <th style={{ width: 115, textAlign: 'right' }}>Item Total (₹)</th>
                  </tr>
                ) : (
                  /* ── Execution header — dynamic based on whether any item has rate breakdown ── */
                  anyExecBreakdown ? (
                    /* Full 4-column rate layout */
                    <>
                      <tr>
                        <th rowSpan={2} style={{ width: 32 }}>#</th>
                        <th rowSpan={2}>Service Description</th>
                        <th rowSpan={2} style={{ width: 110 }}>Sub-Category</th>
                        <th rowSpan={2} style={{ width: 54, textAlign: 'center' }}>Qty</th>
                        <th rowSpan={2} style={{ width: 70, textAlign: 'center' }}>Unit</th>
                        <th rowSpan={2} style={{ width: 88, textAlign: 'center' }}>SAC Code</th>
                        <th colSpan={4} style={{ textAlign: 'center' }}>Rates</th>
                        <th rowSpan={2} style={{ width: 115, textAlign: 'right' }}>Item Total (₹)</th>
                      </tr>
                      <tr>
                        <th style={{ width: 100, textAlign: 'right' }}>Mat. Rate (₹)</th>
                        <th style={{ width: 110, textAlign: 'right' }}>Material Amt (₹)</th>
                        <th style={{ width: 100, textAlign: 'right' }}>Lab. Rate (₹)</th>
                        <th style={{ width: 110, textAlign: 'right' }}>Labour Amt (₹)</th>
                      </tr>
                    </>
                  ) : (
                    /* Simplified single Rate column — no items have mat/lab breakdown */
                    <tr>
                      <th style={{ width: 32 }}>#</th>
                      <th>Service Description</th>
                      <th style={{ width: 110 }}>Sub-Category</th>
                      <th style={{ width: 54, textAlign: 'center' }}>Qty</th>
                      <th style={{ width: 70, textAlign: 'center' }}>Unit</th>
                      <th style={{ width: 88, textAlign: 'center' }}>SAC Code</th>
                      <th style={{ width: 120, textAlign: 'right' }}>Rate (₹)</th>
                      <th style={{ width: 115, textAlign: 'right' }}>Item Total (₹)</th>
                    </tr>
                  )
                )}
              </thead>

              {viewGroups.map((grp, gi) => {
                const grpTotal = grp.items.reduce((s, it) => s + calcItemTotal(it), 0);
                return (
                  <tbody key={gi}>
                    {/* Category header row */}
                    <tr className="vqd-cat-row">
                      <td colSpan={viewColSpan}>
                        <div className="vqd-cat-inner">
                          <span
                            className="vqd-cat-dot"
                            style={isExecution ? { background: 'linear-gradient(135deg,#7c3aed,#a78bfa)' } : isArchitecture ? { background: 'linear-gradient(135deg,#9333ea,#c084fc)' } : undefined}
                          />
                          {grp.catName}
                          <span
                            className="vqd-cat-cnt"
                            style={isExecution ? { background: '#f5f3ff', color: '#7c3aed' } : isArchitecture ? { background: '#fdf4ff', color: '#9333ea' } : {}}
                          >
                            {grp.items.length} item{grp.items.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Item rows */}
                    {grp.items.map((item, ii) => {
                      const total    = calcItemTotal(item);
                      const subCatName = getSubComplianceName(item.sub_compliance_category);
                      const prof     = parseFloat(item.Professional_amount || 0);
                      const consultancy    = item.consultancy_charges ?? item.miscellaneous_amount;
                      const consultancyText = consultancy == null ? '' : String(consultancy).trim();
                      const isConsultancyAmount = consultancyText !== '' &&
                        !isNaN(consultancyText) &&
                        !isNaN(parseFloat(consultancyText));
                      const consultancyDisplay = consultancyText === ''
                        ? <span style={{ color: '#e2e8f0' }}>—</span>
                        : isConsultancyAmount
                          ? <span style={{ color: '#475569', fontWeight: 600 }}>₹&nbsp;{fmtINR(parseFloat(consultancyText))}</span>
                          : (
                            <span
                              title="Note only, not included in total"
                              style={{ color: '#d97706', fontWeight: 600, fontStyle: 'italic', whiteSpace: 'normal', overflowWrap: 'anywhere' }}
                            >
                              {consultancyText}
                            </span>
                          );
                      const { qty, matRate, labRate, matAmt, labAmt } = getExecutionDisplayValues(item);
                      const unitDisplay = isBlankOptionalValue(item.unit) ? '—' : item.unit;
                      const itemSacCode        = item.sac_code;
                      const showExecBreakdown  = hasExecutionRateBreakdown(item);

                      return (
                        <tr key={ii} className="vqd-row">
                          <td className="vqd-row-idx">{ii + 1}</td>

                          {/* Description */}
                          <td>
                            <div className="vqd-desc">
                              {item.description || item.compliance_name || '—'}
                            </div>
                          </td>

                          {/* Sub-category — NOT shown for Architecture */}
                          {!isArchitecture && (
                            <td>
                              {subCatName
                                ? (
                                  <span
                                    className="vqd-subcat"
                                    style={isExecution ? { background: '#f5f3ff', color: '#7c3aed' } : {}}
                                  >
                                    {subCatName}
                                  </span>
                                )
                                : <span style={{ color: '#e2e8f0', fontSize: 12 }}>—</span>}
                            </td>
                          )}

                          {/* Qty */}
                          <td style={{ textAlign: 'center' }}>
                            <span className="vqd-qty-badge">{qty}</span>
                          </td>

                          {/* Unit */}
                          <td style={{ textAlign: 'center', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                            {unitDisplay}
                          </td>

                          {isExecution && (
                            <td style={{ textAlign: 'center', fontSize: 12, color: '#0f766e', fontWeight: 700, fontFamily: 'monospace' }}>
                              {itemSacCode || <span style={{ color: '#e2e8f0' }}>—</span>}
                            </td>
                          )}

                          {/* Type-specific columns */}
                          {isArchitecture ? (
                            /* ── Architecture columns: Consultancy + Professional ── */
                            <>
                              <td style={{ textAlign: 'right', fontSize: 12 }}>
                                {consultancyDisplay}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: '#1e293b', fontSize: 13 }}>
                                ₹&nbsp;{fmtINR(prof)}
                              </td>
                            </>
                          ) : isRegulatory ? (
                            <>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: '#1e293b', fontSize: 13 }}>
                                ₹&nbsp;{fmtINR(prof)}
                              </td>
                              <td style={{ textAlign: 'right', fontSize: 12 }}>
                                {consultancyDisplay}
                              </td>
                            </>
                          ) : (
                            // Execution columns — dynamic based on table-level breakdown check
                            anyExecBreakdown ? (
                              // Full 4-column breakdown
                              showExecBreakdown ? (
                                <>
                                  <td style={{ textAlign: 'right', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                                    {matRate > 0 ? <>₹&nbsp;{fmtINR(matRate)}</> : <span style={{ color: '#e2e8f0' }}>—</span>}
                                  </td>
                                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                                    {matAmt > 0
                                      ? <>₹&nbsp;{fmtINR(matAmt)}</>
                                      : (matRate > 0 ? <>₹&nbsp;{fmtINR(matRate * qty)}</> : <span style={{ color: '#e2e8f0' }}>—</span>)}
                                  </td>
                                  <td style={{ textAlign: 'right', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                                    {labRate > 0 ? <>₹&nbsp;{fmtINR(labRate)}</> : <span style={{ color: '#e2e8f0' }}>—</span>}
                                  </td>
                                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#475569', fontSize: 13 }}>
                                    {labAmt > 0
                                      ? <>₹&nbsp;{fmtINR(labAmt)}</>
                                      : (labRate > 0 ? <>₹&nbsp;{fmtINR(labRate * qty)}</> : <span style={{ color: '#e2e8f0' }}>—</span>)}
                                  </td>
                                </>
                              ) : (
                                // This item has only Professional_amount but table has breakdown — span 4 cols
                                <td colSpan={4} style={{ textAlign: 'center', fontWeight: 700, color: '#1e293b', fontSize: 13 }}>
                                  {parseFloat(item.Professional_amount || 0) > 0
                                    ? <>₹&nbsp;{fmtINR(parseFloat(item.Professional_amount))}</>
                                    : <span style={{ color: '#e2e8f0' }}>—</span>}
                                </td>
                              )
                            ) : (
                              // Simplified single Rate column — no items in the quotation have breakdown
                              <td style={{ textAlign: 'right', fontWeight: 700, color: '#1e293b', fontSize: 13 }}>
                                {parseFloat(item.Professional_amount || 0) > 0
                                  ? <>₹&nbsp;{fmtINR(parseFloat(item.Professional_amount))}</>
                                  : <span style={{ color: '#e2e8f0' }}>—</span>}
                              </td>
                            )
                          )}

                          {/* Item Total */}
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#1e293b', fontSize: 13 }}>
                            ₹&nbsp;{fmtINR(total)}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Category subtotal row */}
                    <tr className="vqd-cat-sub">
                      <td
                        colSpan={viewColSpan - 1}
                        style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', fontStyle: 'italic', paddingRight: 14 }}
                      >
                        {grp.catName} subtotal
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 13, color: '#0f766e', paddingRight: 16 }}>
                        ₹&nbsp;{fmtINR(grpTotal)}
                      </td>
                    </tr>
                  </tbody>
                );
              })}
            </table>
          </div>
        )
      )}

      {/* ════════════════════════════════════════════════════════════════════
          EDIT MODE TABLE
          ═══════════════════════════════════════════════════════════════════ */}
      {editMode && (
        <div className="vqd-table-wrap" style={{ borderRadius: 14, border: '1.5px solid #e2e8f0', overflow: 'visible', boxShadow: '0 1px 6px rgba(0,0,0,.05)' }}>
          {editItems.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 8 }}>
              <FileText size={28} color="#e2e8f0" />
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>
                No items. Click &quot;+ Add Item&quot; above to get started.
              </p>
            </div>
          ) : (
            <table
              className={`vqd-table${isExecution ? ' vqd-exec-edit' : ''}`}
              style={{ tableLayout: 'fixed', width: '100%', overflow: 'visible', borderCollapse: 'separate', borderSpacing: 0 }}
            >
              <colgroup>
                {isArchitecture ? (
                  /* Architecture edit: #, Desc, Qty, Unit, Consultancy, Professional, Total, Delete */
                  <>
                    <col style={{ width: 36 }} />
                    <col />
                    <col style={{ width: 56 }} />
                    <col style={{ width: 80 }} />
                    <col style={{ width: 128 }} />
                    <col style={{ width: 128 }} />
                    <col style={{ width: 112 }} />
                    <col style={{ width: 38 }} />
                  </>
                ) : isRegulatory ? (
                  <>
                    <col style={{ width: 36 }} />
                    <col />
                    <col style={{ width: 110 }} />
                    <col style={{ width: 56 }} />
                    <col style={{ width: 80 }} />
                    <col style={{ width: 128 }} />
                    <col style={{ width: 128 }} />
                    <col style={{ width: 112 }} />
                    <col style={{ width: 38 }} />
                  </>
                ) : (
                  <>
                    <col style={{ width: 34 }} />
                    <col />
                    <col style={{ width: 118 }} />
                    <col style={{ width: 52 }} />
                    <col style={{ width: 56 }} />
                    <col style={{ width: 96 }} />
                    <col style={{ width: 104 }} />
                    <col style={{ width: 104 }} />
                    <col style={{ width: 110 }} />
                    <col style={{ width: 110 }} />
                    <col style={{ width: 104 }} />
                    <col style={{ width: 36 }} />
                  </>
                )}
              </colgroup>

              <thead>
                {isArchitecture ? (
                  /* ── Architecture edit header ── */
                  <tr>
                    <th style={{ textAlign: 'center', width: 36, padding: '11px 4px' }}>#</th>
                    <th style={{ padding: '11px 10px 11px 6px', minWidth: 130 }}>
                      Description
                      <span style={{ display: 'block', color: '#f59e0b', fontWeight: 500, fontStyle: 'italic', fontSize: 10, marginTop: 2 }}>(editable)</span>
                    </th>
                    <th style={{ textAlign: 'center', padding: '11px 6px' }}>Qty</th>
                    <th style={{ textAlign: 'center', padding: '11px 6px' }}>
                      Unit
                      <span style={{ color: '#f59e0b', fontWeight: 500, fontStyle: 'italic', fontSize: 10, marginLeft: 4 }}>(editable)</span>
                    </th>
                    <th style={{ textAlign: 'right', padding: '11px 6px' }}>Consultancy (₹)</th>
                    <th style={{ textAlign: 'right', padding: '11px 6px' }}>Professional (₹)</th>
                    <th style={{ textAlign: 'right', padding: '11px 12px 11px 6px' }}>Item Total</th>
                    <th style={{ width: 46, padding: '11px 8px' }}></th>
                  </tr>
                ) : isRegulatory ? (
                  /* ── Regulatory edit header — single row ── */
                  <tr>
                    <th style={{ textAlign: 'center', width: 36, padding: '11px 4px' }}>#</th>
                    <th style={{ padding: '11px 10px 11px 6px', minWidth: 130 }}>
                      Description
                      <span style={{ display: 'block', color: '#f59e0b', fontWeight: 500, fontStyle: 'italic', fontSize: 10, marginTop: 2 }}>(editable)</span>
                    </th>
                    <th style={{ textAlign: 'center', padding: '11px 10px', minWidth: 100 }}>
                      <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.04em' }}>Sub-Category</span>
                      <span style={{ display: 'block', color: '#94a3b8', fontWeight: 400, fontStyle: 'italic', fontSize: 9, marginTop: 2 }}>view only</span>
                    </th>
                    <th style={{ textAlign: 'center', padding: '11px 6px' }}>Qty</th>
                    <th style={{ textAlign: 'center', padding: '11px 6px' }}>
                      Unit
                      <span style={{ color: '#f59e0b', fontWeight: 500, fontStyle: 'italic', fontSize: 10, marginLeft: 4 }}>(editable)</span>
                    </th>
                    <th style={{ textAlign: 'right', padding: '11px 6px' }}>Professional (₹)</th>
                    <th style={{ textAlign: 'right', padding: '11px 6px' }}>Misc / Note</th>
                    <th style={{ textAlign: 'right', padding: '11px 12px 11px 6px' }}>Item Total</th>
                    <th style={{ width: 46, padding: '11px 8px' }}></th>
                  </tr>
                ) : (
                  /* ── Execution edit header — two rows with sub-columns ── */
                  <>
                    <tr>
                      <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', width: 34, padding: '10px 4px' }}>#</th>
                      <th rowSpan={2} style={{ verticalAlign: 'middle', padding: '10px 10px 10px 6px', minWidth: 130 }}>
                        Description
                        <span style={{ display: 'block', color: '#f59e0b', fontWeight: 500, fontStyle: 'italic', fontSize: 10, marginTop: 2 }}>(editable)</span>
                      </th>
                      <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', padding: '10px 10px', minWidth: 100 }}>
                        <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.04em' }}>Sub-Category</span>
                        <span style={{ display: 'block', color: '#94a3b8', fontWeight: 400, fontStyle: 'italic', fontSize: 9, marginTop: 2 }}>view only</span>
                      </th>
                      <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', padding: '10px 6px' }}>Qty</th>
                      <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', padding: '10px 6px' }}>Unit</th>
                      <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', padding: '10px 6px' }}>SAC Code</th>
                      <th rowSpan={2} style={{ textAlign: 'right', verticalAlign: 'middle', padding: '10px 6px' }}>Prof. (₹)</th>
                      <th
                        colSpan={2}
                        style={{
                          textAlign: 'center', verticalAlign: 'middle',
                          background: '#f5f3ff',
                          color: '#7c3aed', fontSize: 10, fontWeight: 800,
                          letterSpacing: '0.07em', textTransform: 'uppercase',
                          borderLeft: '2px solid #ddd6fe', borderRight: '1px solid #ddd6fe',
                          padding: '7px 8px',
                        }}
                      >
                        Rate (per unit)
                      </th>
                      <th
                        colSpan={2}
                        style={{
                          textAlign: 'center', verticalAlign: 'middle',
                          background: '#f0fdf4',
                          color: '#0f766e', fontSize: 10, fontWeight: 800,
                          letterSpacing: '0.07em', textTransform: 'uppercase',
                          borderLeft: '2px solid #bbf7d0', borderRight: '1px solid #bbf7d0',
                          padding: '7px 8px',
                        }}
                      >
                        Amount (Rate × Qty)
                      </th>
                      <th rowSpan={2} style={{ textAlign: 'right', verticalAlign: 'middle' }}>Item Total</th>
                      <th rowSpan={2}></th>
                    </tr>
                    <tr>
                      <th style={{ textAlign: 'right', background: '#f5f3ff', color: '#7c3aed', borderLeft: '2px solid #ddd6fe', fontWeight: 700 }}>
                        Mat. Rate (₹)
                      </th>
                      <th style={{ textAlign: 'right', background: '#f5f3ff', color: '#7c3aed', borderRight: '1px solid #ddd6fe', fontWeight: 700 }}>
                        Lab. Rate (₹)
                      </th>
                      <th style={{ textAlign: 'right', background: '#f0fdf4', color: '#0f766e', borderLeft: '2px solid #bbf7d0', fontWeight: 700 }}>
                        Material Amt (₹)
                      </th>
                      <th style={{ textAlign: 'right', background: '#f0fdf4', color: '#0f766e', borderRight: '1px solid #bbf7d0', fontWeight: 700 }}>
                        Labour Amt (₹)
                      </th>
                    </tr>
                  </>
                )}
              </thead>

              {/* Edit table body — grouped by compliance category */}
              {Object.values(editGroups).map((grp, gi) => {
                const grpEditTotal = grp.rows.reduce((s, { it }) => s + calcItemTotal(it), 0);
                // Edit colSpan: Architecture=8, Regulatory=9 (+SubCat), Execution=13 (+SubCat)
                const editTotalColSpan = isExecution ? 13 : isRegulatory ? 9 : 8;
                return (
                  <tbody key={gi}>
                    {/* Category header row */}
                    <tr className="vqd-cat-row" style={{ background: 'linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                      <td colSpan={editTotalColSpan} style={{ padding: '9px 14px', borderTop: '1.5px solid #e8ecf2', borderBottom: '1px solid #e8ecf2' }}>
                        <div className="vqd-cat-inner">
                          <span
                            className="vqd-cat-dot"
                            style={isExecution ? { background: 'linear-gradient(135deg,#7c3aed,#a78bfa)' } : isArchitecture ? { background: 'linear-gradient(135deg,#9333ea,#c084fc)' } : { background: 'linear-gradient(135deg,#0f766e,#14b8a6)' }}
                          />
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#334155', letterSpacing: '-0.01em' }}>{grp.catName}</span>
                          <span
                            className="vqd-cat-cnt"
                            style={isExecution ? { background: '#f5f3ff', color: '#7c3aed' } : isArchitecture ? { background: '#fdf4ff', color: '#9333ea' } : { background: '#f0fdf4', color: '#0f766e' }}
                          >
                            {grp.rows.length} item{grp.rows.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Editable item rows */}
                    {grp.rows.map(({ it, globalIdx }) => {
                      const itemTotal = calcItemTotal(it);
                      return (
                        <tr key={globalIdx} style={{ background: '#ffffff', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9', transition: 'background .12s', overflow: 'visible' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                        >
                          {/* # */}
                          <td style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', fontWeight: 700, verticalAlign: 'middle', padding: '10px 4px' }}>
                            {globalIdx + 1}
                          </td>

                          {/* Description */}
                          <td style={{ verticalAlign: 'middle', padding: '8px 8px 8px 4px' }}>
                            <textarea
                              className="vqd-edit-input"
                              value={it.description}
                              onChange={e => updateItem(globalIdx, 'description', e.target.value)}
                              rows={2}
                              style={{ resize: 'vertical', minHeight: 44, fontSize: 12, lineHeight: 1.5 }}
                              placeholder="Service description…"
                            />
                          </td>

                          {/* Type-specific columns — Qty is placed INSIDE each branch
                               so it always appears in the correct column position matching the header */}
                          {isArchitecture ? (
                            /* ── Architecture: # | Desc | Qty | Unit | Consultancy | Professional | Total | Del ── */
                            <>
                              {/* Qty */}
                              <td style={{ verticalAlign: 'middle', padding: '8px 6px', overflow: 'visible' }}>
                                <div style={{ position: 'relative', width: '100%' }}>
                                  <input
                                    type="number" min="1"
                                    onWheel={e => e.target.blur()}
                                    className="vqd-edit-input"
                                    value={it.quantity}
                                    onChange={e => updateItem(globalIdx, 'quantity', parseInt(e.target.value) || 1)}
                                    onFocus={e => onExpandFocus(e, { textAlign: 'center' })}
                                    onBlur={e => onExpandBlur(e, { textAlign: 'center' })}
                                    style={{ textAlign: 'center', width: '100%' }}
                                  />
                                </div>
                              </td>
                              {/* Unit */}
                              <td style={{ verticalAlign: 'middle', padding: '8px 6px', overflow: 'visible' }}>
                                <div style={{ position: 'relative', width: '100%' }}>
                                  <input
                                    type="text"
                                    className="vqd-edit-input"
                                    value={it.unit ?? ''}
                                    onChange={e => updateItem(globalIdx, 'unit', e.target.value)}
                                    placeholder="e.g. Nos"
                                    onFocus={e => onExpandFocus(e, { textAlign: 'center' })}
                                    onBlur={e => onExpandBlur(e, { textAlign: 'center' })}
                                    style={{ textAlign: 'center', width: '100%' }}
                                  />
                                </div>
                              </td>
                              {/* Consultancy */}
                              <td style={{ verticalAlign: 'middle', padding: '8px 6px', overflow: 'visible' }}>
                                <div style={{ position: 'relative', width: '100%' }}>
                                  <input
                                    type="text"
                                    className="vqd-edit-input"
                                    value={it.consultancy_charges === '0' || it.consultancy_charges === 0 ? '' : (it.consultancy_charges ?? '')}
                                    onChange={e => updateItem(globalIdx, 'consultancy_charges', e.target.value)}
                                    placeholder="0.00 or note"
                                    onFocus={e => onExpandFocus(e, { textAlign: 'right' })}
                                    onBlur={e => onExpandBlur(e, { textAlign: 'right' })}
                                    style={{ textAlign: 'right', width: '100%' }}
                                  />
                                </div>
                              </td>
                              {/* Professional amount */}
                              <td style={{ verticalAlign: 'middle', padding: '8px 6px', overflow: 'visible' }}>
                                <div style={{ position: 'relative', width: '100%' }}>
                                  <input
                                    type="number" min="0" step="0.01"
                                    onWheel={e => e.target.blur()}
                                    className="vqd-edit-input"
                                    value={it.Professional_amount === 0 ? '' : it.Professional_amount}
                                    onChange={e => updateItem(globalIdx, 'Professional_amount', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                    onFocus={e => onExpandFocus(e, { textAlign: 'right' })}
                                    onBlur={e => onExpandBlur(e, { textAlign: 'right' })}
                                    style={{ textAlign: 'right', width: '100%' }}
                                  />
                                </div>
                              </td>
                            </>
                          ) : isRegulatory ? (
                            /* ── Regulatory: # | Desc | SubCat(RO) | Qty | Unit | Professional | Misc | Total | Del ── */
                            <>
                              {/* Sub-Category — read-only */}
                              <td style={{ verticalAlign: 'middle', padding: '8px 10px' }}>
                                {(() => {
                                  const subCatName = getSubComplianceName(it.sub_compliance_category);
                                  return subCatName ? (
                                    <span style={{
                                      display: 'inline-flex', alignItems: 'center', padding: '4px 9px',
                                      background: '#eff6ff', color: '#1d4ed8',
                                      border: '1px solid #bfdbfe',
                                      borderRadius: 20, fontSize: 11, fontWeight: 600,
                                      lineHeight: 1.4, letterSpacing: '0.01em',
                                    }}>
                                      {subCatName}
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: 12, color: '#cbd5e1', fontStyle: 'italic' }}>—</span>
                                  );
                                })()}
                              </td>
                              {/* Qty */}
                              <td style={{ verticalAlign: 'middle', padding: '8px 6px', overflow: 'visible' }}>
                                <div style={{ position: 'relative', width: '100%' }}>
                                  <input
                                    type="number" min="1"
                                    onWheel={e => e.target.blur()}
                                    className="vqd-edit-input"
                                    value={it.quantity}
                                    onChange={e => updateItem(globalIdx, 'quantity', parseInt(e.target.value) || 1)}
                                    onFocus={e => onExpandFocus(e, { textAlign: 'center' })}
                                    onBlur={e => onExpandBlur(e, { textAlign: 'center' })}
                                    style={{ textAlign: 'center', width: '100%' }}
                                  />
                                </div>
                              </td>
                              {/* Unit */}
                              <td style={{ verticalAlign: 'middle', padding: '8px 6px', overflow: 'visible' }}>
                                <div style={{ position: 'relative', width: '100%' }}>
                                  <input
                                    type="text"
                                    className="vqd-edit-input"
                                    value={it.unit ?? ''}
                                    onChange={e => updateItem(globalIdx, 'unit', e.target.value)}
                                    placeholder="e.g. Nos"
                                    onFocus={e => onExpandFocus(e, { textAlign: 'center' })}
                                    onBlur={e => onExpandBlur(e, { textAlign: 'center' })}
                                    style={{ textAlign: 'center', width: '100%' }}
                                  />
                                </div>
                              </td>
                              {/* Professional amount */}
                              <td style={{ verticalAlign: 'middle', padding: '8px 6px', overflow: 'visible' }}>
                                <div style={{ position: 'relative', width: '100%' }}>
                                  <input
                                    type="number" min="0" step="0.01"
                                    onWheel={e => e.target.blur()}
                                    className="vqd-edit-input"
                                    value={it.Professional_amount === 0 ? '' : it.Professional_amount}
                                    onChange={e => updateItem(globalIdx, 'Professional_amount', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                    onFocus={e => onExpandFocus(e, { textAlign: 'right' })}
                                    onBlur={e => onExpandBlur(e, { textAlign: 'right' })}
                                    style={{ textAlign: 'right', width: '100%' }}
                                  />
                                </div>
                              </td>
                              {/* Consultancy / Misc */}
                              <td style={{ verticalAlign: 'middle', padding: '8px 6px', overflow: 'visible' }}>
                                <div style={{ position: 'relative', width: '100%' }}>
                                  <input
                                    type="text"
                                    className="vqd-edit-input"
                                    value={it.consultancy_charges === '0' || it.consultancy_charges === 0 ? '' : (it.consultancy_charges ?? '')}
                                    onChange={e => updateItem(globalIdx, 'consultancy_charges', e.target.value)}
                                    placeholder="0.00 or note"
                                    onFocus={e => onExpandFocus(e, { textAlign: 'right' })}
                                    onBlur={e => onExpandBlur(e, { textAlign: 'right' })}
                                    style={{ textAlign: 'right', width: '100%' }}
                                  />
                                </div>
                              </td>
                            </>
                          ) : (
                            /* ── Execution: # | Desc | SubCat(RO) | Qty | Unit | SAC | Prof | MatRate | LabRate | MatAmt | LabAmt | Total | Del ── */
                            <>
                              {/* Sub-Category — read-only */}
                              <td style={{ verticalAlign: 'middle', padding: '8px 10px' }}>
                                {(() => {
                                  const subCatName = getSubComplianceName(it.sub_compliance_category);
                                  return subCatName ? (
                                    <span style={{
                                      display: 'inline-flex', alignItems: 'center', padding: '4px 9px',
                                      background: '#f5f3ff', color: '#7c3aed',
                                      border: '1px solid #ddd6fe',
                                      borderRadius: 20, fontSize: 11, fontWeight: 600,
                                      lineHeight: 1.4, letterSpacing: '0.01em',
                                    }}>
                                      {subCatName}
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: 12, color: '#cbd5e1', fontStyle: 'italic' }}>—</span>
                                  );
                                })()}
                              </td>
                              {/* Qty */}
                              <td style={{ verticalAlign: 'middle', padding: '8px 6px', overflow: 'visible' }}>
                                <div style={{ position: 'relative', width: '100%' }}>
                                  <input
                                    type="number" min="1"
                                    onWheel={e => e.target.blur()}
                                    className="vqd-edit-input"
                                    value={it.quantity}
                                    onChange={e => updateItem(globalIdx, 'quantity', parseInt(e.target.value) || 1)}
                                    onFocus={e => onExpandFocus(e, { textAlign: 'center' })}
                                    onBlur={e => onExpandBlur(e, { textAlign: 'center' })}
                                    style={{ textAlign: 'center', width: '100%' }}
                                  />
                                </div>
                              </td>
                              {/* Unit */}
                              <td style={{ verticalAlign: 'middle', padding: '8px 6px', overflow: 'visible' }}>
                                <div style={{ position: 'relative', width: '100%' }}>
                                  <input
                                    type="text"
                                    className="vqd-edit-input"
                                    value={it.unit ?? ''}
                                    onChange={e => updateItem(globalIdx, 'unit', e.target.value)}
                                    placeholder="Unit"
                                    onFocus={e => onExpandFocus(e, { textAlign: 'center' })}
                                    onBlur={e => onExpandBlur(e, { textAlign: 'center' })}
                                    style={{ textAlign: 'center', width: '100%' }}
                                  />
                                </div>
                              </td>
                              {/* SAC Code */}
                              <td style={{ verticalAlign: 'middle', padding: '8px 6px', overflow: 'visible' }}>
                                <div style={{ position: 'relative', width: '100%' }}>
                                  <input
                                    type="text"
                                    className="vqd-edit-input"
                                    value={it.sac_code || ''}
                                    onChange={e => updateItem(globalIdx, 'sac_code', e.target.value)}
                                    placeholder="e.g. 998312"
                                    title="Per-item SAC Code"
                                    onFocus={e => onExpandFocus(e, { textAlign: 'center', fontFamily: 'monospace', fontSize: '12px' })}
                                    onBlur={e => onExpandBlur(e, { textAlign: 'center', fontFamily: 'monospace', fontSize: '12px' })}
                                    style={{ textAlign: 'center', width: '100%', fontFamily: 'monospace', fontSize: 12 }}
                                  />
                                </div>
                              </td>
                              {/* Professional amount */}
                              <td style={{ verticalAlign: 'middle', padding: '8px 6px', overflow: 'visible' }}>
                                <div style={{ position: 'relative', width: '100%' }}>
                                  <input
                                    type="number" min="0" step="0.01"
                                    onWheel={e => e.target.blur()}
                                    className="vqd-edit-input"
                                    value={it.Professional_amount === 0 ? '' : it.Professional_amount}
                                    onChange={e => updateItem(globalIdx, 'Professional_amount', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                    onFocus={e => onExpandFocus(e, { textAlign: 'right' })}
                                    onBlur={e => onExpandBlur(e, { textAlign: 'right' })}
                                    style={{ textAlign: 'right', width: '100%' }}
                                  />
                                </div>
                              </td>
                              {/* Mat. Rate */}
                              <td className="col-rate" style={{ verticalAlign: 'middle', overflow: 'visible' }}>
                                <div style={{ position: 'relative', width: '100%' }}>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="vqd-edit-input"
                                    value={it.material_rate === 0 ? '' : it.material_rate}
                                    onChange={e => updateItem(globalIdx, 'material_rate', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                    title="Material Rate per unit — Material Amount = Rate × Qty (auto-calculated)"
                                    onWheel={e => e.target.blur()}
                                    onFocus={e => onExpandFocus(e, { textAlign: 'right', borderColor: '#c4b5fd' })}
                                    onBlur={e => onExpandBlur(e, { textAlign: 'right', borderColor: '#c4b5fd' })}
                                    style={{ textAlign: 'right', width: '100%', borderColor: '#c4b5fd' }}
                                  />
                                </div>
                              </td>
                              {/* Lab. Rate */}
                              <td className="col-rate-last" style={{ verticalAlign: 'middle', overflow: 'visible' }}>
                                <div style={{ position: 'relative', width: '100%' }}>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="vqd-edit-input"
                                    value={it.labour_rate === 0 ? '' : it.labour_rate}
                                    onChange={e => updateItem(globalIdx, 'labour_rate', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                    title="Labour Rate per unit — Labour Amount = Rate × Qty (auto-calculated)"
                                    onWheel={e => e.target.blur()}
                                    onFocus={e => onExpandFocus(e, { textAlign: 'right', borderColor: '#c4b5fd' })}
                                    onBlur={e => onExpandBlur(e, { textAlign: 'right', borderColor: '#c4b5fd' })}
                                    style={{ textAlign: 'right', width: '100%', borderColor: '#c4b5fd' }}
                                  />
                                </div>
                              </td>
                              {/* Material Amt */}
                              <td className="col-amt" style={{ verticalAlign: 'middle', overflow: 'visible' }}>
                                <div style={{ position: 'relative', width: '100%' }}>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="vqd-edit-input"
                                    value={it.material_amount === 0 ? '' : it.material_amount}
                                    onChange={e => updateItem(globalIdx, 'material_amount', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                    title="Material Amount — Material Rate = Amt ÷ Qty (auto-calculated)"
                                    onWheel={e => e.target.blur()}
                                    onFocus={e => onExpandFocus(e, { textAlign: 'right', borderColor: '#6ee7b7' })}
                                    onBlur={e => onExpandBlur(e, { textAlign: 'right', borderColor: '#6ee7b7' })}
                                    style={{ textAlign: 'right', width: '100%', borderColor: '#6ee7b7' }}
                                  />
                                </div>
                              </td>
                              {/* Labour Amt */}
                              <td className="col-amt-last" style={{ verticalAlign: 'middle', overflow: 'visible' }}>
                                <div style={{ position: 'relative', width: '100%' }}>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="vqd-edit-input"
                                    value={it.labour_amount === 0 ? '' : it.labour_amount}
                                    onChange={e => updateItem(globalIdx, 'labour_amount', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                    title="Labour Amount — Labour Rate = Amt ÷ Qty (auto-calculated)"
                                    onWheel={e => e.target.blur()}
                                    onFocus={e => onExpandFocus(e, { textAlign: 'right', borderColor: '#6ee7b7' })}
                                    onBlur={e => onExpandBlur(e, { textAlign: 'right', borderColor: '#6ee7b7' })}
                                    style={{ textAlign: 'right', width: '100%', borderColor: '#6ee7b7' }}
                                  />
                                </div>
                              </td>
                            </>
                          )}

                          {/* Item Total (read-only, live-calculated) */}
                          <td style={{ textAlign: 'right', verticalAlign: 'middle', padding: '8px 12px 8px 6px', whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#0f766e', letterSpacing: '-0.01em' }}>
                              ₹&nbsp;{fmtINR(itemTotal)}
                            </span>
                            <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2, fontWeight: 500 }}>
                              {(isRegulatory || isArchitecture)
                                ? '(Prof+Misc)×Qty'
                                : (hasExecutionRateBreakdown(it) ? 'Mat+Lab' : 'Rate×Qty')}
                            </div>
                          </td>

                          {/* Remove button */}
                          <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '8px 8px 8px 4px' }}>
                            <button
                              onClick={() => removeItem(globalIdx)}
                              title="Remove item"
                              style={{
                                width: 30, height: 30, border: '1px solid #fecaca', background: '#fff5f5',
                                borderRadius: 7, cursor: 'pointer', display: 'inline-flex',
                                alignItems: 'center', justifyContent: 'center', color: '#ef4444',
                                transition: 'all .15s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#fff5f5'; e.currentTarget.style.borderColor = '#fecaca'; }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Category subtotal row */}
                    <tr className="vqd-cat-sub" style={{ background: '#f8fafc', borderTop: '1.5px solid #e8ecf2' }}>
                      <td
                        colSpan={(isExecution ? 11 : isRegulatory ? 7 : 6)}
                        style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', fontStyle: 'italic', padding: '9px 14px', letterSpacing: '0.01em' }}
                      >
                        {grp.catName} subtotal
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 13, color: '#0f766e', padding: '9px 12px', whiteSpace: 'nowrap' }}>
                        ₹&nbsp;{fmtINR(grpEditTotal)}
                      </td>
                      <td style={{ padding: '9px 8px' }} />
                    </tr>
                  </tbody>
                );
              })}
            </table>
          )}
        </div>
      )}
    </div>
  );
}