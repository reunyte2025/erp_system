/**
 * PurchaseTypeTable.jsx
 * Owns the view-mode items table for viewpodetails.jsx.
 */

import { FileText } from 'lucide-react';
import {
  SUB_COMPLIANCE_CATEGORIES,
  fmtINR,
  groupItemsByCategory,
  calcItemTotal,
  getExecutionDisplayValues,
  hasRateBreakdown,
} from '../../services/purchaseHelpers';

export default function PurchaseTypeTable({ items = [] }) {
  const groups       = groupItemsByCategory(items);
  const anyBreakdown = items.some(it => hasRateBreakdown(it));
  const colCount     = anyBreakdown ? 11 : 8;

  if (items.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '48px 0', gap: 8,
      }}>
        <FileText size={32} color="#e2e8f0" />
        <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>No line items found</p>
      </div>
    );
  }

  return (
    <div className="vpod-table-wrap">
      <table className="vpod-table">
        <thead>
          {anyBreakdown ? (
            <tr>
              <th style={{ width: 32 }}>#</th>
              <th>Description</th>
              <th style={{ width: 110 }}>Sub-Category</th>
              <th style={{ width: 44, textAlign: 'center' }}>Qty</th>
              <th style={{ width: 70, textAlign: 'center' }}>Unit</th>
              <th style={{ width: 88, textAlign: 'center' }}>SAC Code</th>
              <th style={{ width: 110, textAlign: 'right' }}>Mat. Rate (₹)</th>
              <th style={{ width: 115, textAlign: 'right' }}>Material Amt (₹)</th>
              <th style={{ width: 110, textAlign: 'right' }}>Lab. Rate (₹)</th>
              <th style={{ width: 115, textAlign: 'right' }}>Labour Amt (₹)</th>
              <th style={{ width: 115, textAlign: 'right' }}>Item Total</th>
            </tr>
          ) : (
            <tr>
              <th style={{ width: 32 }}>#</th>
              <th>Description</th>
              <th style={{ width: 110 }}>Sub-Category</th>
              <th style={{ width: 44, textAlign: 'center' }}>Qty</th>
              <th style={{ width: 70, textAlign: 'center' }}>Unit</th>
              <th style={{ width: 88, textAlign: 'center' }}>SAC Code</th>
              <th style={{ width: 120, textAlign: 'right' }}>Rate (₹)</th>
              <th style={{ width: 115, textAlign: 'right' }}>Item Total</th>
            </tr>
          )}
        </thead>

        {groups.map((grp, gi) => {
          const grpTotal = grp.items.reduce((s, it) => s + calcItemTotal(it), 0);

          return (
            <tbody key={gi}>
              <tr className="vpod-cat-row">
                <td colSpan={colCount}>
                  <div className="vpod-cat-inner">
                    <span className="vpod-cat-dot" />
                    {grp.catName}
                    <span className="vpod-cat-cnt">
                      {grp.items.length} item{grp.items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </td>
              </tr>

              {grp.items.map((item, ii) => {
                const { qty, prof, matRate, labRate, matAmt, labAmt } = getExecutionDisplayValues(item);
                const total            = calcItemTotal(item);
                const subCat           = SUB_COMPLIANCE_CATEGORIES[item.sub_compliance_category] || null;
                const itemSacCode      = item.sac_code;
                const itemHasBreakdown = hasRateBreakdown(item);

                return (
                  <tr key={ii} className="vpod-row">
                    <td style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#d1d5db' }}>
                      {ii + 1}
                    </td>
                    <td><div className="vpod-desc">{item.description || item.compliance_name || '—'}</div></td>
                    <td>
                      {subCat
                        ? <span className="vpod-subcat">{subCat.name}</span>
                        : <span style={{ color: '#e2e8f0', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="vpod-qty-badge">{qty}</span>
                    </td>
                    <td style={{ textAlign: 'center', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                      {item.unit || '—'}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: 12, color: '#0f766e', fontWeight: 700, fontFamily: 'monospace' }}>
                      {itemSacCode || <span style={{ color: '#e2e8f0' }}>—</span>}
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
                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#475569', fontSize: 13 }}>
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
              })}

              <tr className="vpod-cat-sub">
                <td
                  colSpan={colCount - 1}
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
  );
}
