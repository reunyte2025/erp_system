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
} from '../../services/quotationHelpers';

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
                      const total    = parseFloat(item.total_amount) || calcItemTotal(item);
                      const subCat   = SUB_COMPLIANCE_CATEGORIES[item.sub_compliance_category] || null;
                      const prof     = parseFloat(item.Professional_amount || 0);
                      const consultancy    = item.consultancy_charges ?? item.miscellaneous_amount;
                      const consultancyStr = (() => {
                        if (!consultancy || String(consultancy).trim() === '--') return null;
                        const s = String(consultancy).trim();
                        return s !== '' && !isNaN(parseFloat(s)) ? s : null;
                      })();
                      const { qty, matRate, labRate, matAmt, labAmt } = getExecutionDisplayValues(item);
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
                              {subCat
                                ? (
                                  <span
                                    className="vqd-subcat"
                                    style={isExecution ? { background: '#f5f3ff', color: '#7c3aed' } : {}}
                                  >
                                    {subCat.name}
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
                            {item.unit || '—'}
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
                                {consultancyStr
                                  ? <span style={{ color: '#475569', fontWeight: 600 }}>₹&nbsp;{fmtINR(parseFloat(consultancyStr))}</span>
                                  : <span style={{ color: '#e2e8f0' }}>—</span>}
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
                                {consultancyStr
                                  ? <span style={{ color: '#475569', fontWeight: 600 }}>₹&nbsp;{fmtINR(parseFloat(consultancyStr))}</span>
                                  : <span style={{ color: '#e2e8f0' }}>—</span>}
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
        <div className="vqd-table-wrap">
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
              style={{ tableLayout: 'fixed', width: '100%' }}
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
                    <th style={{ textAlign: 'center' }}>#</th>
                    <th>
                      Description{' '}
                      <span style={{ color: '#f59e0b', fontWeight: 400, fontStyle: 'italic', fontSize: 10 }}>(editable)</span>
                    </th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'center' }}>
                      Unit{' '}
                      <span style={{ color: '#f59e0b', fontWeight: 400, fontStyle: 'italic', fontSize: 10 }}>(editable)</span>
                    </th>
                    <th style={{ textAlign: 'right' }}>Consultancy (₹)</th>
                    <th style={{ textAlign: 'right' }}>Professional (₹)</th>
                    <th style={{ textAlign: 'right' }}>Item Total</th>
                    <th></th>
                  </tr>
                ) : isRegulatory ? (
                  /* ── Regulatory edit header — single row ── */
                  <tr>
                    <th style={{ textAlign: 'center' }}>#</th>
                    <th>
                      Description{' '}
                      <span style={{ color: '#f59e0b', fontWeight: 400, fontStyle: 'italic', fontSize: 10 }}>(editable)</span>
                    </th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'center' }}>
                      Unit{' '}
                      <span style={{ color: '#f59e0b', fontWeight: 400, fontStyle: 'italic', fontSize: 10 }}>(editable)</span>
                    </th>
                    <th style={{ textAlign: 'right' }}>Professional (₹)</th>
                    <th style={{ textAlign: 'right' }}>Misc / Note</th>
                    <th style={{ textAlign: 'right' }}>Item Total</th>
                    <th></th>
                  </tr>
                ) : (
                  /* ── Execution edit header — two rows with sub-columns ── */
                  <>
                    <tr>
                      <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle' }}>#</th>
                      <th rowSpan={2} style={{ verticalAlign: 'middle' }}>
                        Description{' '}
                        <span style={{ color: '#f59e0b', fontWeight: 400, fontStyle: 'italic', fontSize: 10 }}>(editable)</span>
                      </th>
                      <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle' }}>Qty</th>
                      <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle' }}>Unit</th>
                      <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle' }}>SAC Code</th>
                      <th rowSpan={2} style={{ textAlign: 'right', verticalAlign: 'middle' }}>Prof. (₹)</th>
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
                // Edit colSpan: Architecture=8, Regulatory=8, Execution=12
                const editTotalColSpan = isExecution ? 12 : 8;
                return (
                  <tbody key={gi}>
                    {/* Category header row */}
                    <tr className="vqd-cat-row">
                      <td colSpan={editTotalColSpan}>
                        <div className="vqd-cat-inner">
                          <span
                            className="vqd-cat-dot"
                            style={isExecution ? { background: 'linear-gradient(135deg,#7c3aed,#a78bfa)' } : isArchitecture ? { background: 'linear-gradient(135deg,#9333ea,#c084fc)' } : {}}
                          />
                          {grp.catName}
                          <span
                            className="vqd-cat-cnt"
                            style={isExecution ? { background: '#f5f3ff', color: '#7c3aed' } : isArchitecture ? { background: '#fdf4ff', color: '#9333ea' } : {}}
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
                        <tr key={globalIdx} style={{ background: '#fafffe', verticalAlign: 'middle' }}>
                          {/* # */}
                          <td style={{ textAlign: 'center', fontSize: 11, color: '#d1d5db', fontWeight: 700, verticalAlign: 'middle' }}>
                            {globalIdx + 1}
                          </td>

                          {/* Description */}
                          <td style={{ verticalAlign: 'middle' }}>
                            <textarea
                              className="vqd-edit-input"
                              value={it.description}
                              onChange={e => updateItem(globalIdx, 'description', e.target.value)}
                              rows={2}
                              style={{ resize: 'vertical', minHeight: 42, fontSize: 12 }}
                              placeholder="Service description…"
                            />
                          </td>

                          {/* Qty */}
                          <td style={{ verticalAlign: 'middle' }}>
                            <input
                              type="number"
                              min="1"
                              className="vqd-edit-input"
                              value={it.quantity}
                              onChange={e => updateItem(globalIdx, 'quantity', parseInt(e.target.value) || 1)}
                              style={{ textAlign: 'center', width: '100%' }}
                            />
                          </td>

                          {/* Type-specific editable columns */}
                          {isArchitecture ? (
                            /* ── Architecture edit columns ── */
                            <>
                              {/* Unit */}
                              <td style={{ verticalAlign: 'middle' }}>
                                <input
                                  type="text"
                                  className="vqd-edit-input"
                                  value={it.unit || ''}
                                  onChange={e => updateItem(globalIdx, 'unit', e.target.value)}
                                  placeholder="e.g. Nos"
                                  style={{ textAlign: 'center', width: '100%' }}
                                />
                              </td>
                              {/* Consultancy */}
                              <td>
                                <input
                                  type="number"
                                  className="vqd-edit-input"
                                  value={it.consultancy_charges === '0' || it.consultancy_charges === 0 ? '' : it.consultancy_charges}
                                  onChange={e => updateItem(globalIdx, 'consultancy_charges', e.target.value)}
                                  placeholder="0.00"
                                  style={{ textAlign: 'right', width: '100%' }}
                                />
                              </td>
                              {/* Professional amount */}
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="vqd-edit-input"
                                  value={it.Professional_amount === 0 ? '' : it.Professional_amount}
                                  onChange={e => updateItem(globalIdx, 'Professional_amount', parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  style={{ textAlign: 'right', width: '100%' }}
                                />
                              </td>
                            </>
                          ) : isRegulatory ? (
                            <>
                              {/* Unit */}
                              <td style={{ verticalAlign: 'middle' }}>
                                <input
                                  type="text"
                                  className="vqd-edit-input"
                                  value={it.unit || ''}
                                  onChange={e => updateItem(globalIdx, 'unit', e.target.value)}
                                  placeholder="e.g. Nos"
                                  style={{ textAlign: 'center', width: '100%' }}
                                />
                              </td>
                              {/* Professional amount */}
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="vqd-edit-input"
                                  value={it.Professional_amount === 0 ? '' : it.Professional_amount}
                                  onChange={e => updateItem(globalIdx, 'Professional_amount', parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  style={{ textAlign: 'right', width: '100%' }}
                                />
                              </td>
                              {/* Consultancy / Misc */}
                              <td>
                                <input
                                  type="number"
                                  className="vqd-edit-input"
                                  value={it.consultancy_charges === '0' || it.consultancy_charges === 0 ? '' : it.consultancy_charges}
                                  onChange={e => updateItem(globalIdx, 'consultancy_charges', e.target.value)}
                                  placeholder="0.00"
                                  style={{ textAlign: 'right', width: '100%' }}
                                />
                              </td>
                            </>
                          ) : (
                            <>
                              {/* Unit */}
                              <td style={{ verticalAlign: 'middle' }}>
                                <input
                                  type="text"
                                  className="vqd-edit-input"
                                  value={it.unit || ''}
                                  onChange={e => updateItem(globalIdx, 'unit', e.target.value)}
                                  placeholder="Unit"
                                  style={{ textAlign: 'center', width: '100%' }}
                                />
                              </td>
                              {/* SAC Code */}
                              <td style={{ verticalAlign: 'middle' }}>
                                <input
                                  type="text"
                                  className="vqd-edit-input"
                                  value={it.sac_code || ''}
                                  onChange={e => updateItem(globalIdx, 'sac_code', e.target.value)}
                                  placeholder="e.g. 998312"
                                  title="Per-item SAC Code"
                                  style={{ textAlign: 'center', width: '100%', fontFamily: 'monospace', fontSize: 12 }}
                                />
                              </td>
                              {/* Professional amount */}
                              <td style={{ verticalAlign: 'middle' }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="vqd-edit-input"
                                  value={it.Professional_amount === 0 ? '' : it.Professional_amount}
                                  onChange={e => updateItem(globalIdx, 'Professional_amount', parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  style={{ textAlign: 'right', width: '100%' }}
                                />
                              </td>
                              {/* Mat. Rate */}
                              <td className="col-rate" style={{ verticalAlign: 'middle' }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="vqd-edit-input"
                                  value={it.material_rate === 0 ? '' : it.material_rate}
                                  onChange={e => updateItem(globalIdx, 'material_rate', parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  title="Material Rate per unit — Material Amount = Rate × Qty (auto-calculated)"
                                  style={{ textAlign: 'right', width: '100%', borderColor: '#c4b5fd' }}
                                />
                              </td>
                              {/* Lab. Rate */}
                              <td className="col-rate-last" style={{ verticalAlign: 'middle' }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="vqd-edit-input"
                                  value={it.labour_rate === 0 ? '' : it.labour_rate}
                                  onChange={e => updateItem(globalIdx, 'labour_rate', parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  title="Labour Rate per unit — Labour Amount = Rate × Qty (auto-calculated)"
                                  style={{ textAlign: 'right', width: '100%', borderColor: '#c4b5fd' }}
                                />
                              </td>
                              {/* Material Amt */}
                              <td className="col-amt" style={{ verticalAlign: 'middle' }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="vqd-edit-input"
                                  value={it.material_amount === 0 ? '' : it.material_amount}
                                  onChange={e => updateItem(globalIdx, 'material_amount', parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  title="Material Amount — Material Rate = Amt ÷ Qty (auto-calculated)"
                                  style={{ textAlign: 'right', width: '100%', borderColor: '#6ee7b7' }}
                                />
                              </td>
                              {/* Labour Amt */}
                              <td className="col-amt-last" style={{ verticalAlign: 'middle' }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="vqd-edit-input"
                                  value={it.labour_amount === 0 ? '' : it.labour_amount}
                                  onChange={e => updateItem(globalIdx, 'labour_amount', parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  title="Labour Amount — Labour Rate = Amt ÷ Qty (auto-calculated)"
                                  style={{ textAlign: 'right', width: '100%', borderColor: '#6ee7b7' }}
                                />
                              </td>
                            </>
                          )}

                          {/* Item Total (read-only, live-calculated) */}
                          <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#0f766e' }}>
                              ₹&nbsp;{fmtINR(itemTotal)}
                            </span>
                            <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>
                              {(isRegulatory || isArchitecture)
                                ? '(Prof+Misc)×Qty'
                                : (hasExecutionRateBreakdown(it) ? 'Mat+Lab' : 'Rate×Qty')}
                            </div>
                          </td>

                          {/* Remove button */}
                          <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                            <button
                              onClick={() => removeItem(globalIdx)}
                              style={{
                                width: 28, height: 28, border: 'none', background: '#fef2f2',
                                borderRadius: 6, cursor: 'pointer', display: 'inline-flex',
                                alignItems: 'center', justifyContent: 'center', color: '#dc2626',
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Category subtotal row */}
                    <tr className="vqd-cat-sub">
                      <td
                        colSpan={(isExecution ? 10 : 6)}
                        style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', fontStyle: 'italic', paddingRight: 14 }}
                      >
                        {grp.catName} subtotal
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 13, color: '#0f766e', paddingRight: 4 }}>
                        ₹&nbsp;{fmtINR(grpEditTotal)}
                      </td>
                      <td />
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
