/**
 * ProformaTypeTable.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Owns ONLY the items table rendering for viewproformadetails.jsx.
 * Renders the correct table columns for Regulatory OR Execution proformas,
 * in both view mode and edit mode. Pixel-perfect same JSX as the original.
 *
 * Props:
 *   isExecution   {boolean}
 *   isRegulatory  {boolean}
 *   editMode      {boolean}
 *   items         {Array}   — view mode data (proforma.items)
 *   editItems     {Array}   — edit mode data
 *   updateItem    {Function(idx, field, value)}
 *   removeItem    {Function(idx)}
 *   onAddItem     {Function} — opens AddComplianceModal
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { FileText, Plus, Trash2 } from 'lucide-react';
import {
  COMPLIANCE_CATEGORIES,
  SUB_COMPLIANCE_CATEGORIES,
  fmtINR,
  isMiscNumeric,
  groupItemsByCategory,
  calcItemTotal,
  getExecutionDisplayValues,
  hasExecutionRateBreakdown,
} from '../../services/proformaHelpers';

export default function ProformaTypeTable({
  isExecution,
  isRegulatory,
  editMode,
  items,
  editItems,
  updateItem,
  removeItem,
  onAddItem,
}) {
  return (
    <div>
      {/* ── Section header ── */}
      <div className="vpd-sec-hdr">
        <FileText size={15} color="#0f766e" />
        Services &amp; Compliance Items
        <span className="vpd-sec-badge">
          {editMode ? editItems.length : items.length}{' '}
          {(editMode ? editItems.length : items.length) === 1 ? 'item' : 'items'}
        </span>

        {/* Add Item button — edit mode only */}
        {editMode && (
          <button
            onClick={onAddItem}
            style={{
              marginLeft: 'auto',
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px',
              background: 'linear-gradient(135deg,#0f766e,#0d9488)',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(15,118,110,.25)',
              transition: 'all .15s',
            }}
          >
            <Plus size={14} /> Add Item
          </button>
        )}
      </div>

      {/* ══════════ VIEW MODE TABLE ══════════ */}
      {!editMode && (
        items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', gap: 8 }}>
            <FileText size={32} color="#e2e8f0" />
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>No line items found</p>
          </div>
        ) : (
          <div className="vpd-table-wrap">
            <table className="vpd-table">
              <thead>
                {isRegulatory ? (
                  <tr>
                    <th style={{ width: 32 }}>#</th>
                    <th>Service Description</th>
                    <th style={{ width: 110 }}>Sub-Category</th>
                    <th style={{ width: 54, textAlign: 'center' }}>Qty</th>
                    <th style={{ width: 70, textAlign: 'center' }}>Unit</th>
                    <th style={{ width: 115, textAlign: 'right' }}>Professional</th>
                    <th style={{ width: 130, textAlign: 'right' }}>Consultancy / Misc</th>
                    <th style={{ width: 115, textAlign: 'right' }}>Item Total</th>
                  </tr>
                ) : (
                  <>
                    <tr>
                      <th rowSpan={2} style={{ width: 32 }}>#</th>
                      <th rowSpan={2}>Service Description</th>
                      <th rowSpan={2} style={{ width: 110 }}>Sub-Category</th>
                      <th rowSpan={2} style={{ width: 54, textAlign: 'center' }}>Qty</th>
                      <th rowSpan={2} style={{ width: 70, textAlign: 'center' }}>Unit</th>
                      <th colSpan={4} style={{ textAlign: 'center' }}>Rates</th>
                      <th rowSpan={2} style={{ width: 115, textAlign: 'right' }}>Item Total</th>
                    </tr>
                    <tr>
                      <th style={{ width: 100, textAlign: 'right' }}>Mat. Rate (₹)</th>
                      <th style={{ width: 100, textAlign: 'right' }}>Lab. Rate (₹)</th>
                      <th style={{ width: 110, textAlign: 'right' }}>Material Amt (₹)</th>
                      <th style={{ width: 110, textAlign: 'right' }}>Labour Amt (₹)</th>
                    </tr>
                  </>
                )}
              </thead>

              {groupItemsByCategory(items).map((grp, gi) => {
                const grpTotal = grp.items.reduce((s, it) => s + calcItemTotal(it), 0);
                const colSpan  = isExecution ? 10 : 8;
                return (
                  <tbody key={gi}>
                    <tr className="vpd-cat-row">
                      <td colSpan={colSpan}>
                        <div className="vpd-cat-inner">
                          <span className="vpd-cat-dot" />
                          {grp.catName}
                          <span className="vpd-cat-cnt">{grp.items.length} item{grp.items.length !== 1 ? 's' : ''}</span>
                        </div>
                      </td>
                    </tr>

                    {grp.items.map((item, ii) => {
                      const prof    = parseFloat(item.Professional_amount || 0);
                      const total   = calcItemTotal(item);
                      const subCat  = SUB_COMPLIANCE_CATEGORIES[item.sub_compliance_category] || null;

                      // ── Consultancy / Misc display value ──────────────────────────────────
                      // Priority: consultancy_charges (proforma API field) → miscellaneous_amount
                      // We must NOT use a truthy check for the raw value because "0" is valid.
                      const rawConsultancy = item.consultancy_charges ?? item.miscellaneous_amount ?? null;
                      // Normalise to a trimmed string or null
                      const consultancyStr = (
                        rawConsultancy !== null &&
                        rawConsultancy !== undefined &&
                        String(rawConsultancy).trim() !== '' &&
                        String(rawConsultancy).trim() !== '--'
                      ) ? String(rawConsultancy).trim() : null;
                      const { matRate, labRate, matAmt, labAmt } = getExecutionDisplayValues(item);
                      const itemSacCode        = item.sac_code;
                      const showExecBreakdown  = hasExecutionRateBreakdown(item);

                      return (
                        <tr key={ii} className="vpd-row">
                          <td className="vpd-row-idx">{ii + 1}</td>
                          <td>
                            <div className="vpd-desc">{item.description || item.compliance_name || '—'}</div>
                            {isExecution && itemSacCode && (
                              <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ fontSize: 10, color: '#94a3b8' }}>SAC:</span>
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#0f766e', fontFamily: 'monospace' }}>{itemSacCode}</span>
                              </div>
                            )}
                          </td>
                          <td>{subCat ? <span className="vpd-subcat">{subCat.name}</span> : <span style={{ color: '#e2e8f0', fontSize: 12 }}>—</span>}</td>
                          <td style={{ textAlign: 'center' }}><span className="vpd-qty-badge">{parseInt(item.quantity) || 1}</span></td>
                          <td style={{ textAlign: 'center', fontSize: 12, color: '#64748b', fontWeight: 600 }}>{item.unit || '—'}</td>

                          {isRegulatory ? (
                            <>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b', fontSize: 13 }}>₹&nbsp;{fmtINR(prof)}</td>
                              <td style={{ textAlign: 'right', fontSize: 12 }}>
                                {consultancyStr !== null
                                  ? isMiscNumeric(consultancyStr)
                                    ? <span style={{ color: '#475569', fontWeight: 600 }}>₹&nbsp;{fmtINR(parseFloat(consultancyStr))}</span>
                                    : <span className="vpd-misc-note" title="Note — not included in total">{consultancyStr}</span>
                                  : <span style={{ color: '#e2e8f0' }}>—</span>}
                              </td>
                            </>
                          ) : showExecBreakdown ? (
                            <>
                              <td style={{ textAlign: 'right', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                                {matRate > 0 ? <>₹&nbsp;{fmtINR(matRate)}</> : <span style={{ color: '#e2e8f0' }}>—</span>}
                              </td>
                              <td style={{ textAlign: 'right', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                                {labRate > 0 ? <>₹&nbsp;{fmtINR(labRate)}</> : <span style={{ color: '#e2e8f0' }}>—</span>}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                                {matAmt > 0 ? <>₹&nbsp;{fmtINR(matAmt)}</> : <span style={{ color: '#e2e8f0' }}>—</span>}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: '#475569', fontSize: 13 }}>
                                {labAmt > 0 ? <>₹&nbsp;{fmtINR(labAmt)}</> : <span style={{ color: '#e2e8f0' }}>—</span>}
                              </td>
                            </>
                          ) : (
                            <td colSpan={4} style={{ textAlign: 'center', fontWeight: 700, color: '#1e293b', fontSize: 13 }}>
                              {prof > 0 ? <>₹&nbsp;{fmtINR(prof)}</> : <span style={{ color: '#e2e8f0' }}>—</span>}
                            </td>
                          )}

                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#1e293b', fontSize: 13 }}>₹&nbsp;{fmtINR(total)}</td>
                        </tr>
                      );
                    })}

                    <tr className="vpd-cat-sub">
                      <td colSpan={colSpan - 1} style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', fontStyle: 'italic', paddingRight: 14 }}>
                        {grp.catName} subtotal
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 13, color: '#0f766e', paddingRight: 4 }}>
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

      {/* ══════════ EDIT MODE ══════════ */}
      {editMode && (
        <div style={{ marginTop: 4 }}>
          {editItems.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 10, background: '#f8fafc', borderRadius: 12, border: '1.5px dashed #e2e8f0' }}>
              <FileText size={32} color="#e2e8f0" />
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>No items. Click &quot;+ Add Item&quot; above to get started.</p>
            </div>
          ) : (() => {
            const editGroups = {};
            editItems.forEach((it, globalIdx) => {
              const catId = it.compliance_category ?? 0;
              const key   = String(catId);
              if (!editGroups[key]) {
                editGroups[key] = {
                  catId,
                  catName: COMPLIANCE_CATEGORIES[catId] || `Category ${catId}`,
                  rows: [],
                };
              }
              editGroups[key].rows.push({ it, globalIdx });
            });

            return Object.values(editGroups).map((grp, gi) => {
              const grpEditTotal = grp.rows.reduce((s, { it }) => s + calcItemTotal(it), 0);
              return (
                <div key={gi} style={{ marginBottom: 20 }}>
                  {/* Category header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: 'linear-gradient(135deg,#f0fdf4,#ecfdf5)', border: '1.5px solid #bbf7d0', borderRadius: '10px 10px 0 0', marginBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#0d9488', display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '.08em' }}>{grp.catName}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8' }}>{grp.rows.length} item{grp.rows.length !== 1 ? 's' : ''}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#0f766e' }}>Subtotal: ₹&nbsp;{fmtINR(grpEditTotal)}</span>
                  </div>

                  {/* Item cards */}
                  <div style={{ border: '1.5px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
                    {grp.rows.map(({ it, globalIdx }, rowIdx) => (
                      <div key={globalIdx} style={{ background: rowIdx % 2 === 0 ? '#fafffe' : '#f0fdf4', borderTop: rowIdx > 0 ? '1px solid #e8f5f0' : 'none', padding: '14px 16px' }}>

                        {/* Item header row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 22, height: 22, borderRadius: 6, background: '#0f766e', color: '#fff', fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{globalIdx + 1}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em' }}>Line Item</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#0f766e' }}>₹&nbsp;{fmtINR(calcItemTotal(it))}</span>
                            <button
                              onClick={() => removeItem(globalIdx)}
                              style={{ width: 28, height: 28, border: 'none', background: '#fef2f2', borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', flexShrink: 0 }}
                              title="Remove item"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Description full width */}
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 4 }}>Description</label>
                          <textarea
                            className="vpd-edit-input"
                            value={it.description}
                            onChange={e => updateItem(globalIdx, 'description', e.target.value)}
                            rows={2}
                            style={{ resize: 'vertical', minHeight: 44, fontSize: 13, width: '100%' }}
                            placeholder="Service description…"
                          />
                        </div>

                        {/* Qty + Unit row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 4 }}>Quantity</label>
                            <input
                              type="number" min="1"
                              className="vpd-edit-input"
                              value={it.quantity}
                              onChange={e => updateItem(globalIdx, 'quantity', parseInt(e.target.value) || 1)}
                              style={{ textAlign: 'center', width: '100%' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 4 }}>Unit</label>
                            <input
                              type="text"
                              className="vpd-edit-input"
                              value={it.unit || ''}
                              onChange={e => updateItem(globalIdx, 'unit', e.target.value)}
                              placeholder="e.g. Nos, m, sqm"
                              style={{ textAlign: 'center', width: '100%' }}
                            />
                          </div>
                        </div>

                        {isRegulatory ? (
                          /* Regulatory: Professional + Consultancy */
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div>
                              <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 4 }}>Professional Amount (₹)</label>
                              <input
                                type="number" min="0" step="0.01"
                                className="vpd-edit-input"
                                value={it.Professional_amount === 0 ? '' : it.Professional_amount}
                                onChange={e => updateItem(globalIdx, 'Professional_amount', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                style={{ textAlign: 'right', width: '100%' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 4 }}>Consultancy / Misc</label>
                              <input
                                type="text"
                                className="vpd-edit-input"
                                value={it.consultancy_charges ?? it.miscellaneous_amount ?? ''}
                                onChange={e => {
                                  updateItem(globalIdx, 'consultancy_charges', e.target.value);
                                  updateItem(globalIdx, 'miscellaneous_amount', e.target.value);
                                }}
                                placeholder="Amount or note"
                                style={{
                                  textAlign: 'right', width: '100%',
                                  borderColor: (it.consultancy_charges ?? it.miscellaneous_amount) && !isMiscNumeric(it.consultancy_charges ?? it.miscellaneous_amount) ? '#fbbf24' : undefined,
                                }}
                              />
                              {(it.consultancy_charges ?? it.miscellaneous_amount) && !isMiscNumeric(it.consultancy_charges ?? it.miscellaneous_amount) && (
                                <div style={{ fontSize: 10, color: '#d97706', marginTop: 3 }}>⚠ Note only — not included in calculation</div>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* Execution: Professional + SAC Code + Material Rate + Labour Rate + Material Amt + Labour Amt */
                          <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                              <div>
                                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 4 }}>Professional Amount (₹)</label>
                                <input
                                  type="number" min="0" step="0.01"
                                  className="vpd-edit-input"
                                  value={it.Professional_amount === 0 ? '' : it.Professional_amount}
                                  onChange={e => updateItem(globalIdx, 'Professional_amount', parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  style={{ textAlign: 'right', width: '100%' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 4 }}>SAC Code</label>
                                <input
                                  type="text"
                                  className="vpd-edit-input"
                                  value={it.sac_code || ''}
                                  onChange={e => updateItem(globalIdx, 'sac_code', e.target.value)}
                                  placeholder="e.g. 998312"
                                  style={{ textAlign: 'center', width: '100%', fontFamily: 'monospace' }}
                                />
                              </div>
                            </div>
                            <div style={{ background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', padding: '10px 12px', marginTop: 2 }}>
                              <div style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Rate &amp; Amount Breakdown</div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div>
                                  <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 4 }}>Material Rate (₹)</label>
                                  <input
                                    type="number" min="0" step="0.01"
                                    className="vpd-edit-input"
                                    value={it.material_rate === 0 ? '' : it.material_rate}
                                    onChange={e => updateItem(globalIdx, 'material_rate', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                    style={{ textAlign: 'right', width: '100%' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 4 }}>Labour Rate (₹)</label>
                                  <input
                                    type="number" min="0" step="0.01"
                                    className="vpd-edit-input"
                                    value={it.labour_rate === 0 ? '' : it.labour_rate}
                                    onChange={e => updateItem(globalIdx, 'labour_rate', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                    style={{ textAlign: 'right', width: '100%' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 4 }}>Material Amount (₹)</label>
                                  <input
                                    type="number" min="0" step="0.01"
                                    className="vpd-edit-input"
                                    value={it.material_amount === 0 ? '' : it.material_amount}
                                    onChange={e => updateItem(globalIdx, 'material_amount', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                    style={{ textAlign: 'right', width: '100%' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 4 }}>Labour Amount (₹)</label>
                                  <input
                                    type="number" min="0" step="0.01"
                                    className="vpd-edit-input"
                                    value={it.labour_amount === 0 ? '' : it.labour_amount}
                                    onChange={e => updateItem(globalIdx, 'labour_amount', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                    style={{ textAlign: 'right', width: '100%' }}
                                  />
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                      </div>
                    ))}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}