/**
 * InvoiceTypeTable.jsx
 * Owns the items table rendering for viewinvoicedetails.jsx.
 */

import { FileText } from 'lucide-react';
import {
  SUB_COMPLIANCE_CATEGORIES,
  fmtINR,
  isMiscNumeric,
  groupItemsByCategory,
  calcItemTotal,
  hasExecutionRateBreakdown,
} from '../../services/invoiceHelpers';

export default function InvoiceTypeTable({
  isExecution,
  isPurchaseOrder,
  items = [],
}) {
  const hasRateColumns = isExecution || isPurchaseOrder;
  const anyBreakdown   = hasRateColumns && items.some(it => hasExecutionRateBreakdown(it));
  const groups         = groupItemsByCategory(items);

  const colSpanCount = hasRateColumns
    ? (anyBreakdown ? 11 : 8)
    : 7;

  return (
    <div className="vid-table-wrap">
      {items.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', gap: 8 }}>
          <FileText size={32} color="#e2e8f0" />
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>No line items found</p>
        </div>
      ) : (
        <table className="vid-table">
          <thead>
            {hasRateColumns ? (
              anyBreakdown ? (
                <tr>
                  <th style={{ width: 32 }}>#</th>
                  <th>Description</th>
                  <th style={{ width: 80 }}>Sub-Category</th>
                  <th style={{ width: 44, textAlign: 'center' }}>Qty</th>
                  <th style={{ width: 70, textAlign: 'center' }}>Unit</th>
                  <th style={{ width: 88, textAlign: 'center' }}>SAC Code</th>
                  <th style={{ width: 115, textAlign: 'right' }}>Mat. Rate (₹)</th>
                  <th style={{ width: 115, textAlign: 'right' }}>Material Amt (₹)</th>
                  <th style={{ width: 115, textAlign: 'right' }}>Lab. Rate (₹)</th>
                  <th style={{ width: 115, textAlign: 'right' }}>Labour Amt (₹)</th>
                  <th style={{ width: 115, textAlign: 'right' }}>Item Total</th>
                </tr>
              ) : (
                <tr>
                  <th style={{ width: 32 }}>#</th>
                  <th>Description</th>
                  <th style={{ width: 80 }}>Sub-Category</th>
                  <th style={{ width: 44, textAlign: 'center' }}>Qty</th>
                  <th style={{ width: 70, textAlign: 'center' }}>Unit</th>
                  <th style={{ width: 88, textAlign: 'center' }}>SAC Code</th>
                  <th style={{ width: 120, textAlign: 'right' }}>Rate (₹)</th>
                  <th style={{ width: 115, textAlign: 'right' }}>Item Total</th>
                </tr>
              )
            ) : (
              <tr>
                <th style={{ width: 32 }}>#</th>
                <th>Description</th>
                <th style={{ width: 80 }}>Sub-Category</th>
                <th style={{ width: 44, textAlign: 'center' }}>Qty</th>
                <th style={{ width: 130, textAlign: 'right' }}>Consultancy</th>
                <th style={{ width: 115, textAlign: 'right' }}>Professional</th>
                <th style={{ width: 115, textAlign: 'right' }}>Item Total</th>
              </tr>
            )}
          </thead>

          {groups.map((grp, gi) => {
            const grpTotal = grp.items.reduce((s, it) => s + calcItemTotal(it), 0);

            return (
              <tbody key={gi}>
                <tr className="vid-cat-row">
                  <td colSpan={colSpanCount}>
                    <div className="vid-cat-inner">
                      <span className="vid-cat-dot" />
                      {grp.catName}
                      <span className="vid-cat-cnt">
                        {grp.items.length} item{grp.items.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </td>
                </tr>

                {grp.items.map((item, ii) => {
                  const prof   = parseFloat(item.Professional_amount || 0);
                  const qty    = parseInt(item.quantity) || 1;
                  const total  = calcItemTotal(item);
                  const subCat = SUB_COMPLIANCE_CATEGORIES[item.sub_compliance_category] || null;

                  if (hasRateColumns) {
                    const matRate          = parseFloat(item.material_rate)   || 0;
                    const labRate          = parseFloat(item.labour_rate)     || 0;
                    const matAmt           = parseFloat(item.material_amount) || 0;
                    const labAmt           = parseFloat(item.labour_amount)   || 0;
                    const itemHasBreakdown = hasExecutionRateBreakdown(item);
                    const sacCode          = item.sac_code;

                    return (
                      <tr key={ii} className="vid-row">
                        <td style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#d1d5db' }}>{ii + 1}</td>
                        <td><div className="vid-desc">{item.description || '—'}</div></td>
                        <td>
                          {subCat
                            ? <span className="vid-subcat">{subCat.name}</span>
                            : <span style={{ color: '#e2e8f0', fontSize: 12 }}>—</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="vid-qty-badge">{qty}</span>
                        </td>
                        <td style={{ textAlign: 'center', fontSize: 12, color: '#64748b' }}>{item.unit || '—'}</td>
                        <td style={{ textAlign: 'center', fontSize: 12, color: '#0f766e', fontWeight: 700, fontFamily: 'monospace' }}>
                          {sacCode || <span style={{ color: '#e2e8f0' }}>—</span>}
                        </td>

                        {anyBreakdown ? (
                          itemHasBreakdown ? (
                            <>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                                {matRate > 0 ? <>₹&nbsp;{fmtINR(matRate)}</> : <span style={{ color: '#e2e8f0' }}>—</span>}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                                {matAmt > 0 ? <>₹&nbsp;{fmtINR(matAmt)}</> : <span style={{ color: '#e2e8f0' }}>—</span>}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                                {labRate > 0 ? <>₹&nbsp;{fmtINR(labRate)}</> : <span style={{ color: '#e2e8f0' }}>—</span>}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                                {labAmt > 0 ? <>₹&nbsp;{fmtINR(labAmt)}</> : <span style={{ color: '#e2e8f0' }}>—</span>}
                              </td>
                            </>
                          ) : (
                            <td colSpan={4} style={{ textAlign: 'center', fontWeight: 700, color: '#1e293b', fontSize: 13 }}>
                              {prof > 0 ? <>₹&nbsp;{fmtINR(prof)}</> : <span style={{ color: '#e2e8f0' }}>—</span>}
                            </td>
                          )
                        ) : (
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#1e293b', fontSize: 13 }}>
                            {prof > 0 ? <>₹&nbsp;{fmtINR(prof)}</> : <span style={{ color: '#e2e8f0' }}>—</span>}
                          </td>
                        )}

                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#1e293b', fontSize: 13 }}>
                          ₹&nbsp;{fmtINR(total)}
                        </td>
                      </tr>
                    );
                  }

                  const consultancyRaw = item.consultancy_charges ?? item.miscellaneous_amount;
                  const consultancyStr = consultancyRaw &&
                    String(consultancyRaw).trim() &&
                    String(consultancyRaw).trim() !== '--'
                      ? String(consultancyRaw).trim()
                      : null;

                  return (
                    <tr key={ii} className="vid-row">
                      <td style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#d1d5db' }}>{ii + 1}</td>
                      <td><div className="vid-desc">{item.description || '—'}</div></td>
                      <td>
                        {subCat
                          ? <span className="vid-subcat">{subCat.name}</span>
                          : <span style={{ color: '#e2e8f0', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="vid-qty-badge">{qty}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontSize: 12, verticalAlign: 'middle' }}>
                        {consultancyStr
                          ? isMiscNumeric(consultancyStr)
                            ? <span style={{ color: '#475569', fontWeight: 600 }}>₹&nbsp;{fmtINR(parseFloat(consultancyStr))}</span>
                            : <span className="vid-misc-note" title="Note — not in total">{consultancyStr}</span>
                          : <span style={{ color: '#e2e8f0' }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                        ₹&nbsp;{fmtINR(prof)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#1e293b', fontSize: 13 }}>
                        ₹&nbsp;{fmtINR(total)}
                      </td>
                    </tr>
                  );
                })}

                <tr className="vid-cat-sub">
                  <td
                    colSpan={colSpanCount - 1}
                    style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', fontStyle: 'italic', paddingRight: 14 }}
                  >
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
      )}
    </div>
  );
}