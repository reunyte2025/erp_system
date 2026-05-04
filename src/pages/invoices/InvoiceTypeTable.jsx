/**
 * InvoiceTypeTable.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Owns ONLY the items table rendering for viewinvoicedetails.jsx.
 * Renders the correct table columns for one of three invoice types:
 *
 *   • Regulatory   — Consultancy + Professional + Item Total columns
 *   • Execution    — Mat.Rate + Lab.Rate + Mat.Amt + Lab.Amt + Prof + Total
 *   • Vendor (PO)  — Exact same columns as Execution (hasRateColumns = true)
 *                    The "BILL TO" difference (client vs vendor) is handled
 *                    upstream in viewinvoicedetails.jsx — this table only
 *                    renders the correct columns.
 *
 * Props:
 *   isRegulatory    {boolean}  — true for Regulatory Compliance invoices
 *   isExecution     {boolean}  — true for Execution Compliance invoices
 *   isPurchaseOrder {boolean}  — true for Vendor / Purchase Order invoices
 *   items           {Array}    — invoice.items array (view-mode only, no edit)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { FileText } from 'lucide-react';
import {
  SUB_COMPLIANCE_CATEGORIES,
  fmtINR,
  isMiscNumeric,
  groupItemsByCategory,
  calcItemTotal,
} from '../../services/invoiceHelpers';

export default function InvoiceTypeTable({
  isExecution,
  isPurchaseOrder,
  items,
}) {
  // Execution and Vendor share the same rate-column layout.
  // The only difference between them is the "Bill To" party shown in the
  // parties section (handled by viewinvoicedetails.jsx, not this component).
  const hasRateColumns = isExecution || isPurchaseOrder;

  const groups = groupItemsByCategory(items);

  // Column count for colSpan calculations:
  // Rate columns layout: #, Description, Sub-Category, Unit, Qty,
  //                      Mat.Rate, Lab.Rate, Mat.Amt, Lab.Amt, Professional, Total = 11
  // Regulatory layout:   #, Description, Sub-Category, Qty, Consultancy,
  //                      Professional, Total = 7
  const colSpanCount = hasRateColumns ? 11 : 7;

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
            <tr>
              <th style={{ width: 32 }}>#</th>
              <th>Description</th>
              <th style={{ width: 80 }}>Sub-Category</th>
              {/* Unit column only exists in rate-column (execution/vendor) layout */}
              {hasRateColumns && <th style={{ width: 70 }}>Unit</th>}
              <th style={{ width: 44, textAlign: 'center' }}>Qty</th>
              {hasRateColumns ? (
                <>
                  <th style={{ width: 115, textAlign: 'right' }}>Mat. Rate (₹)</th>
                  <th style={{ width: 115, textAlign: 'right' }}>Lab. Rate (₹)</th>
                  <th style={{ width: 115, textAlign: 'right' }}>Material Amt (₹)</th>
                  <th style={{ width: 115, textAlign: 'right' }}>Labour Amt (₹)</th>
                </>
              ) : (
                <th style={{ width: 130, textAlign: 'right' }}>Consultancy</th>
              )}
              <th style={{ width: 115, textAlign: 'right' }}>Professional</th>
              <th style={{ width: 115, textAlign: 'right' }}>Item Total</th>
            </tr>
          </thead>

          {groups.map((grp, gi) => {
            const grpTotal = grp.items.reduce((s, it) => s + calcItemTotal(it), 0);

            return (
              <tbody key={gi}>
                {/* ── Category header row ── */}
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

                {/* ── Line item rows ── */}
                {grp.items.map((item, ii) => {
                  const prof   = parseFloat(item.Professional_amount || 0);
                  const qty    = parseInt(item.quantity) || 1;
                  const total  = calcItemTotal(item);
                  const subCat = SUB_COMPLIANCE_CATEGORIES[item.sub_compliance_category] || null;

                  if (hasRateColumns) {
                    // ── Execution & Vendor columns ──────────────────────────
                    // Mat. Rate | Lab. Rate | Material Amt | Labour Amt | Professional | Total
                    const matRate = parseFloat(item.material_rate)   || 0;
                    const labRate = parseFloat(item.labour_rate)     || 0;
                    const matAmt  = parseFloat(item.material_amount) || 0;
                    const labAmt  = parseFloat(item.labour_amount)   || 0;

                    return (
                      <tr key={ii} className="vid-row">
                        <td style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#d1d5db' }}>{ii + 1}</td>
                        <td><div className="vid-desc">{item.description || '—'}</div></td>
                        <td>
                          {subCat
                            ? <span className="vid-subcat">{subCat.name}</span>
                            : <span style={{ color: '#e2e8f0', fontSize: 12 }}>—</span>}
                        </td>
                        <td style={{ fontSize: 12, color: '#64748b' }}>{item.unit || '—'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="vid-qty-badge">{qty}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                          {matRate > 0 ? <>₹&nbsp;{fmtINR(matRate)}</> : <span style={{ color: '#e2e8f0' }}>—</span>}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                          {labRate > 0 ? <>₹&nbsp;{fmtINR(labRate)}</> : <span style={{ color: '#e2e8f0' }}>—</span>}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                          {matAmt > 0 ? <>₹&nbsp;{fmtINR(matAmt)}</> : <span style={{ color: '#e2e8f0' }}>—</span>}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                          {labAmt > 0 ? <>₹&nbsp;{fmtINR(labAmt)}</> : <span style={{ color: '#e2e8f0' }}>—</span>}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                          ₹&nbsp;{fmtINR(prof)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#1e293b', fontSize: 13 }}>
                          ₹&nbsp;{fmtINR(total)}
                        </td>
                      </tr>
                    );
                  }

                  // ── Regulatory columns ──────────────────────────────────
                  // Consultancy | Professional | Total
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
                      <td style={{ textAlign: 'right', fontSize: 12 }}>
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

                {/* ── Category subtotal row ── */}
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
