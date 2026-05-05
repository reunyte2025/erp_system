/**
 * PurchaseTypeTable.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Owns ONLY the items table rendering for viewpodetails.jsx.
 *
 * Purchase Orders are ALWAYS Execution Compliance type — they only ever
 * use the Mat.Rate + Lab.Rate + Mat.Amt + Lab.Amt + Prof + Total column layout.
 * There is no Regulatory path for POs.
 *
 * Props:
 *   items   {Array}   — po.items array (view-mode only, no edit)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { FileText } from 'lucide-react';
import {
  SUB_COMPLIANCE_CATEGORIES,
  fmtINR,
  groupItemsByCategory,
  calcItemTotal,
  getExecutionDisplayValues,
} from '../../services/purchaseHelpers';

// Column count: #, Description, Sub-Category, Unit, Qty,
//               Mat.Rate, Lab.Rate, Mat.Amt, Lab.Amt, Professional, Item Total = 11
const COL_COUNT = 11;

export default function PurchaseTypeTable({ items }) {
  const groups = groupItemsByCategory(items);

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
          <tr>
            <th style={{ width: 32 }}>#</th>
            <th>Description</th>
            <th style={{ width: 110 }}>Sub-Category</th>
            <th style={{ width: 70, textAlign: 'center' }}>Unit</th>
            <th style={{ width: 44, textAlign: 'center' }}>Qty</th>
            <th style={{ width: 110, textAlign: 'right' }}>Mat. Rate (₹)</th>
            <th style={{ width: 110, textAlign: 'right' }}>Lab. Rate (₹)</th>
            <th style={{ width: 115, textAlign: 'right' }}>Material Amt (₹)</th>
            <th style={{ width: 115, textAlign: 'right' }}>Labour Amt (₹)</th>
            <th style={{ width: 110, textAlign: 'right' }}>Professional (₹)</th>
            <th style={{ width: 115, textAlign: 'right' }}>Item Total</th>
          </tr>
        </thead>

        {groups.map((grp, gi) => {
          const grpTotal = grp.items.reduce((s, it) => s + calcItemTotal(it), 0);

          return (
            <tbody key={gi}>
              {/* ── Category header row ── */}
              <tr className="vpod-cat-row">
                <td colSpan={COL_COUNT}>
                  <div className="vpod-cat-inner">
                    <span className="vpod-cat-dot" />
                    {grp.catName}
                    <span className="vpod-cat-cnt">
                      {grp.items.length} item{grp.items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </td>
              </tr>

              {/* ── Line item rows ── */}
              {grp.items.map((item, ii) => {
                const { qty, prof, matRate, labRate, matAmt, labAmt } = getExecutionDisplayValues(item);
                const total  = calcItemTotal(item);
                const subCat = SUB_COMPLIANCE_CATEGORIES[item.sub_compliance_category] || null;
                const itemSacCode = item.sac_code;

                return (
                  <tr key={ii} className="vpod-row">
                    <td style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#d1d5db' }}>
                      {ii + 1}
                    </td>
                    <td>
                      <div className="vpod-desc">{item.description || item.compliance_name || '—'}</div>
                      {itemSacCode && (
                        <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>SAC:</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#0f766e', fontFamily: 'monospace' }}>
                            {itemSacCode}
                          </span>
                        </div>
                      )}
                    </td>
                    <td>
                      {subCat
                        ? <span className="vpod-subcat">{subCat.name}</span>
                        : <span style={{ color: '#e2e8f0', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                      {item.unit || '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="vpod-qty-badge">{qty}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                      {matRate > 0
                        ? <>₹&nbsp;{fmtINR(matRate)}</>
                        : <span style={{ color: '#e2e8f0' }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                      {labRate > 0
                        ? <>₹&nbsp;{fmtINR(labRate)}</>
                        : <span style={{ color: '#e2e8f0' }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                      {matAmt > 0
                        ? <>₹&nbsp;{fmtINR(matAmt)}</>
                        : <span style={{ color: '#e2e8f0' }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#475569', fontSize: 13 }}>
                      {labAmt > 0
                        ? <>₹&nbsp;{fmtINR(labAmt)}</>
                        : <span style={{ color: '#e2e8f0' }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                      {prof > 0
                        ? <>₹&nbsp;{fmtINR(prof)}</>
                        : <span style={{ color: '#e2e8f0' }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#1e293b', fontSize: 13 }}>
                      ₹&nbsp;{fmtINR(total)}
                    </td>
                  </tr>
                );
              })}

              {/* ── Category subtotal row ── */}
              <tr className="vpod-cat-sub">
                <td
                  colSpan={COL_COUNT - 1}
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