import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Plus, Loader2, AlertCircle, CheckCircle,
  CreditCard, Building2, Wifi, MoreHorizontal, Receipt,
  User, FileText, X, IndianRupee, TrendingUp,
  Clock, RefreshCw, BadgeCheck, Banknote,
} from 'lucide-react';
import { getInvoiceById, getInvoiceByIdTyped, trackInvoice } from '../../services/invoices';
import { getPaymentsByInvoice, createPayment, updatePayment } from '../../services/payments';
import DynamicList from '../../components/DynamicList/DynamicList';
import trackPaymentConfig from './config.invoice.track.payment';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_METHODS = {
  1: { label: 'Cheque',        Icon: FileText,       color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' },
  2: { label: 'Bank Transfer', Icon: Building2,      color: '#0f766e', bg: '#f0fdf4', border: '#6ee7b7' },
  3: { label: 'Online',        Icon: Wifi,            color: '#2563eb', bg: '#eff6ff', border: '#93c5fd' },
  4: { label: 'Other',         Icon: MoreHorizontal,  color: '#64748b', bg: '#f8fafc', border: '#cbd5e1' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtINR = (v) => {
  const n = parseFloat(v) || 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
};

const fmtDate = (ds) => {
  if (!ds) return '—';
  try {
    return new Date(ds).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '—'; }
};

const fmtDateTime = (ds) => {
  if (!ds) return '—';
  try {
    return new Date(ds).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch { return '—'; }
};

// ─── Add Payment Modal ────────────────────────────────────────────────────────

const AddPaymentModal = ({ invoice, navClientId, navVendorId, onClose, onSuccess }) => {
  const today = new Date().toISOString().slice(0, 16);
  const [form, setForm] = useState({
    payment_date:   today,
    payment_method: 1,
    reference:      '',
    note:           '',
    amount:         '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError('Please enter a valid payment amount.'); return;
    }
    if (!form.payment_date) { setError('Payment date is required.'); return; }
    setError(''); setSubmitting(true);
    try {
      // Priority 1: use IDs passed via navigation state from ViewInvoiceDetails
      // Priority 2: extract from the invoice object returned by the API
      //   - invoice.client may be a number, a nested object { id, ... }, or absent
      //   - invoice.vendor may similarly be a number or nested object
      const resolveId = (field) => {
        if (!field) return null;
        if (typeof field === 'object') return field.id ? Number(field.id) : null;
        const n = Number(field);
        return isNaN(n) ? null : n;
      };

      const clientId = navClientId ?? resolveId(invoice?.client);
      const vendorId = navVendorId ?? resolveId(invoice?.vendor);

      if (!clientId && !vendorId) {
        setError('Unable to determine client or vendor for this invoice. Please go back and reopen the page.');
        return;
      }

      const result = await createPayment({
        invoice_id:     invoice.id,
        client_id:      clientId,
        vendor_id:      vendorId,
        payment_date:   form.payment_date,
        payment_method: Number(form.payment_method),
        reference:      form.reference.trim(),
        note:           form.note.trim(),
        amount:         form.amount,
      });
      onSuccess(result?.data || result);
    } catch (e) {
      setError(
        e.response?.data?.message ||
        e.response?.data?.error   ||
        e.response?.data?.detail  ||
        e.message ||
        'Failed to record payment.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const mLabel = {
    display: 'block', fontSize: 11, fontWeight: 700, color: '#475569',
    textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6,
  };
  const mInput = {
    width: '100%', padding: '9px 12px', border: '1.5px solid #cbd5e1',
    borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: '#1e293b',
    outline: 'none', boxSizing: 'border-box', background: '#fff',
  };

  return (
    <div className="fixed inset-0 z-[10000]" style={{ position: 'fixed', overflow: 'hidden', animation: 'tp_overlay_in .2s ease' }}>
      <div className="absolute inset-0 bg-black/50" style={{ position: 'fixed', width: '100vw', height: '100vh' }} onClick={onClose} />
      <div className="relative z-10 flex items-center justify-center p-4" style={{ height: '100vh' }}>
        <div className="relative bg-white" style={{ borderRadius: 18, width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(0,0,0,.24)', overflow: 'hidden', fontFamily: "'Outfit',sans-serif", animation: 'tp_modal_in .3s cubic-bezier(.16,1,.3,1)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 16px', borderBottom: '1.5px solid #f0f4f8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#0f766e,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Banknote size={17} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Record Payment</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{invoice?.invoice_number || `Invoice #${invoice?.id}`}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px 22px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '75vh', overflowY: 'auto' }}>

          {/* Amount */}
          <div>
            <label style={mLabel}>Amount (₹) *</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569', fontSize: 14, fontWeight: 700 }}>₹</span>
              <input
                type="number" min="0" step="0.01"
                value={form.amount}
                onChange={e => { set('amount', e.target.value); setError(''); }}
                placeholder="0.00"
                style={{ ...mInput, paddingLeft: 28, fontSize: 15, fontWeight: 700 }}
                autoFocus
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label style={mLabel}>Payment Method *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {Object.entries(PAYMENT_METHODS).map(([key, cfg]) => {
                const active = Number(form.payment_method) === Number(key);
                return (
                  <button key={key} type="button" onClick={() => set('payment_method', Number(key))} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                    borderRadius: 10, border: active ? `2px solid ${cfg.color}` : '1.5px solid #cbd5e1',
                    background: active ? cfg.bg : '#fafafa', cursor: 'pointer',
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    color: active ? cfg.color : '#64748b', transition: 'all .15s', fontFamily: 'inherit',
                  }}>
                    <cfg.Icon size={14} /> {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Date */}
          <div>
            <label style={mLabel}>Payment Date *</label>
            <input type="datetime-local" value={form.payment_date} onChange={e => set('payment_date', e.target.value)} style={mInput} />
          </div>

          {/* Reference */}
          <div>
            <label style={mLabel}>Reference / Cheque No.</label>
            <input type="text" value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="e.g. CHQ-001234 or UTR number" style={mInput} />
          </div>

          {/* Note */}
          <div>
            <label style={mLabel}>Note (optional)</label>
            <textarea value={form.note} onChange={e => set('note', e.target.value)} placeholder="Any remarks about this payment…" rows={2} style={{ ...mInput, resize: 'vertical', lineHeight: 1.55 }} />
          </div>

          {/* Error */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 9, padding: '9px 12px', fontSize: 12, color: '#dc2626', fontWeight: 500 }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting} style={{
              flex: 2, padding: '10px', borderRadius: 10, border: 'none',
              background: submitting ? '#94a3b8' : '#0f766e',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'inherit',
            }}>
              {submitting
                ? <><Loader2 size={14} style={{ animation: 'tp_spin .7s linear infinite' }} /> Recording…</>
                : <><BadgeCheck size={15} /> Record Payment</>}
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

// ─── Edit Payment Modal ───────────────────────────────────────────────────────

const EditPaymentModal = ({ payment, onClose, onSuccess }) => {
  // Pre-fill form from the existing payment record
  const toLocalDT = (iso) => {
    if (!iso) return new Date().toISOString().slice(0, 16);
    try {
      const d = new Date(iso);
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch { return new Date().toISOString().slice(0, 16); }
  };

  const [form, setForm] = useState({
    payment_date:   toLocalDT(payment.payment_date),
    payment_method: payment.payment_method || 1,
    reference:      payment.reference || '',
    note:           payment.note || '',
    amount:         String(parseFloat(payment.amount || 0)),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError('Please enter a valid payment amount.'); return;
    }
    if (!form.payment_date) { setError('Payment date is required.'); return; }
    setError(''); setSubmitting(true);
    try {
      const result = await updatePayment({
        id:             payment.id,
        payment_date:   form.payment_date,
        payment_method: Number(form.payment_method),
        reference:      form.reference.trim(),
        note:           form.note.trim(),
        amount:         form.amount,
      });
      onSuccess(result?.data || result);
    } catch (e) {
      setError(
        e.response?.data?.message ||
        e.response?.data?.error   ||
        e.response?.data?.detail  ||
        e.message ||
        'Failed to update payment.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const mLabel = {
    display: 'block', fontSize: 11, fontWeight: 700, color: '#475569',
    textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6,
  };
  const mInput = {
    width: '100%', padding: '9px 12px', border: '1.5px solid #cbd5e1',
    borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: '#1e293b',
    outline: 'none', boxSizing: 'border-box', background: '#fff',
  };

  return (
    <div className="fixed inset-0 z-[10000]" style={{ position: 'fixed', overflow: 'hidden', animation: 'tp_overlay_in .2s ease' }}>
      <div className="absolute inset-0 bg-black/50" style={{ position: 'fixed', width: '100vw', height: '100vh' }} onClick={onClose} />
      <div className="relative z-10 flex items-center justify-center p-4" style={{ height: '100vh' }}>
        <div className="relative bg-white" style={{ borderRadius: 18, width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(0,0,0,.24)', overflow: 'hidden', fontFamily: "'Outfit',sans-serif", animation: 'tp_modal_in .3s cubic-bezier(.16,1,.3,1)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 16px', borderBottom: '1.5px solid #f0f4f8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#0f766e,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={17} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Edit Payment</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                Payment #{payment.id} · {payment.invoice_number || `Invoice #${payment.invoice}`}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px 22px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '75vh', overflowY: 'auto' }}>

          {/* Amount */}
          <div>
            <label style={mLabel}>Amount (₹) *</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569', fontSize: 14, fontWeight: 700 }}>₹</span>
              <input
                type="number" min="0" step="0.01"
                value={form.amount}
                onChange={e => { set('amount', e.target.value); setError(''); }}
                placeholder="0.00"
                style={{ ...mInput, paddingLeft: 28, fontSize: 15, fontWeight: 700 }}
                autoFocus
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label style={mLabel}>Payment Method *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {Object.entries(PAYMENT_METHODS).map(([key, cfg]) => {
                const active = Number(form.payment_method) === Number(key);
                return (
                  <button key={key} type="button" onClick={() => set('payment_method', Number(key))} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                    borderRadius: 10, border: active ? `2px solid ${cfg.color}` : '1.5px solid #cbd5e1',
                    background: active ? cfg.bg : '#fafafa', cursor: 'pointer',
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    color: active ? cfg.color : '#64748b', transition: 'all .15s', fontFamily: 'inherit',
                  }}>
                    <cfg.Icon size={14} /> {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Date */}
          <div>
            <label style={mLabel}>Payment Date *</label>
            <input type="datetime-local" value={form.payment_date} onChange={e => set('payment_date', e.target.value)} style={mInput} />
          </div>

          {/* Reference */}
          <div>
            <label style={mLabel}>Reference / Cheque No.</label>
            <input type="text" value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="e.g. CHQ-001234 or UTR number" style={mInput} />
          </div>

          {/* Note */}
          <div>
            <label style={mLabel}>Note (optional)</label>
            <textarea value={form.note} onChange={e => set('note', e.target.value)} placeholder="Any remarks about this payment…" rows={2} style={{ ...mInput, resize: 'vertical', lineHeight: 1.55 }} />
          </div>

          {/* Error */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 9, padding: '9px 12px', fontSize: 12, color: '#dc2626', fontWeight: 500 }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting} style={{
              flex: 2, padding: '10px', borderRadius: 10, border: 'none',
              background: submitting ? '#94a3b8' : '#0f766e',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'inherit',
            }}>
              {submitting
                ? <><Loader2 size={14} style={{ animation: 'tp_spin .7s linear infinite' }} /> Updating…</>
                : <><BadgeCheck size={15} /> Update Payment</>}
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

// ─── Summary Card ─────────────────────────────────────────────────────────────

const SummaryCard = ({ label, value, sub, iconColor, iconBg, Icon, accent }) => (
  <div style={{
    background: '#fff', borderRadius: 14, border: `1.5px solid ${accent || '#d1d5db'}`,
    padding: '18px 20px', flex: 1, minWidth: 160,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={17} color={iconColor} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 20, padding: '2px 9px', whiteSpace: 'nowrap' }}>
        {sub}
      </span>
    </div>
    <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: 4 }}>
      ₹ {fmtINR(value)}
    </div>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
      {label}
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InvoiceTrackPayment({ onUpdateNavigation }) {
  const { id }   = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // client_id / vendor_id / invoiceType passed from ViewInvoiceDetails via navigate state
  // These are the most reliable source — the raw API invoice response sometimes
  // returns client as a nested object or omits vendor/client IDs altogether.
  // invoiceType tells us which endpoint to hit directly (avoids wrong-cascade bug).
  const navState = location.state || {};
  const navClientId   = navState.client_id   ? Number(navState.client_id)  : null;
  const navVendorId   = navState.vendor_id   ? Number(navState.vendor_id)  : null;
  const navInvoiceType = navState.invoice_type || '';

  const [invoice,    setInvoice]    = useState(null);
  const [trackData,  setTrackData]  = useState(null);   // from /track_invoice/
  const [payments,   setPayments]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [showModal,    setShowModal]    = useState(false);
  const [editPayment,  setEditPayment]  = useState(null);  // payment being edited
  const [toast,        setToast]        = useState('');

  useEffect(() => {
    onUpdateNavigation?.({ breadcrumbs: ['Invoices', 'Invoice Details', 'Track Payment'] });
    return () => onUpdateNavigation?.(null);
  }, [onUpdateNavigation]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const fetchPayments = useCallback(async (invoiceId) => {
    setPayLoading(true);
    try {
      // Service already returns a clean normalised array
      const list = await getPaymentsByInvoice(invoiceId);
      return Array.isArray(list) ? list : [];
    } catch (e) {
      console.error('[TrackPayment] fetchPayments error:', e);
      return [];
    } finally {
      setPayLoading(false);
    }
  }, []);

  const fetchTrackData = useCallback(async (invoiceId) => {
    try {
      const res = await trackInvoice(invoiceId);
      if (res.status === 'success' && res.data) setTrackData(res.data);
    } catch (e) {
      console.error('[TrackPayment] trackInvoice error:', e);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!id) { setFetchError('No invoice ID provided'); setLoading(false); return; }
    setLoading(true); setFetchError('');
    try {
      // Use typed fetch so vendor invoices hit get_purchase_order_invoice directly
      // instead of falling into the cascade and returning the wrong invoice type.
      const [res] = await Promise.all([
        getInvoiceByIdTyped(id, navInvoiceType),
        fetchTrackData(id),
      ]);
      if (res.status !== 'success' || !res.data) throw new Error('Failed to load invoice');
      const inv = res.data;
      setInvoice(inv);
      const pList = await fetchPayments(inv.id);
      setPayments(pList);
    } catch (e) {
      setFetchError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [id, fetchPayments, fetchTrackData]);

  useEffect(() => { fetchData(); window.scrollTo(0, 0); }, [fetchData]);

  const handlePaymentSuccess = async () => {
    setShowModal(false);
    showToast('Payment recorded successfully!');
    if (invoice?.id) {
      // Refresh both payments list and track data so all numbers update live
      const [pList] = await Promise.all([
        fetchPayments(invoice.id),
        fetchTrackData(invoice.id),
      ]);
      setPayments(pList);
    }
  };

  const handleEditSuccess = async () => {
    setEditPayment(null);
    showToast('Payment updated successfully!');
    if (invoice?.id) {
      const [pList] = await Promise.all([
        fetchPayments(invoice.id),
        fetchTrackData(invoice.id),
      ]);
      setPayments(pList);
    }
  };

  // ── Derived financials — use trackData (from /track_invoice/) as source of truth
  // Falls back to local calculation if trackData not yet loaded
  const grandTotal  = parseFloat(trackData?.grand_total  || invoice?.grand_total  || 0);
  const paidAmount  = parseFloat(trackData?.paid_amount  || 0);
  const advancePaid = parseFloat(trackData?.advance_amount || invoice?.advance_amount || 0);
  const balanceDue  = parseFloat(trackData?.unpaid_amount || Math.max(0, grandTotal - paidAmount));
  // paymentsSum still used for stage markers to show live count
  const paymentsSum = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  // totalPaid = what the backend says was paid (most accurate)
  const totalPaid   = paidAmount || paymentsSum + advancePaid;
  const paidPct     = grandTotal > 0
    ? Math.min(100, parseFloat(((totalPaid / grandTotal) * 100).toFixed(2)))
    : 0;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 14, fontFamily: "'Outfit',sans-serif" }}>
      <div style={{ width: 42, height: 42, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#0f766e', animation: 'tp_spin .75s linear infinite' }} />
      <p style={{ fontSize: 14, fontWeight: 500, color: '#64748b', margin: 0 }}>Loading payment details…</p>
      <style>{`@keyframes tp_spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── Error ──────────────────────────────────────────────────────────────────
  if (fetchError) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', fontFamily: "'Outfit',sans-serif" }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ width: 54, height: 54, background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <AlertCircle size={26} color="#dc2626" />
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Failed to load</h3>
        <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px', lineHeight: 1.7 }}>{fetchError}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={fetchData} style={{ padding: '8px 20px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>Retry</button>
          <button onClick={() => navigate(`/invoices/${id}`)} style={{ padding: '8px 20px', background: '#fff', color: '#475569', border: '1.5px solid #cbd5e1', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>Back</button>
        </div>
      </div>
    </div>
  );

  const invNum     = trackData?.invoice_number || invoice?.invoice_number || `Invoice #${invoice?.id}`;
  const clientName = trackData?.client_name || invoice?.client_name || (invoice?.client ? `Client #${invoice.client}` : '');

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        .tp-root * { box-sizing: border-box; font-family: 'Outfit', sans-serif; }
        @keyframes tp_spin     { to { transform: rotate(360deg); } }
        @keyframes tp_in       { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes tp_modal_in { from { opacity:0; transform:scale(.95) translateY(16px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes tp_overlay_in { from { opacity:0; } to { opacity:1; } }
        @keyframes tp_toast    { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

        .tp-root   { animation: tp_in .3s ease; }
        .tp-topbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:10px; }

        .tp-back { display:flex; align-items:center; gap:6px; background:none; border:none; cursor:pointer;
                   font-size:13px; font-weight:600; color:#475569; padding:7px 11px; border-radius:8px;
                   transition:background .14s; font-family:inherit; }
        .tp-back:hover { background:#e2e8f0; color:#0f172a; }

        .tp-add-btn { display:flex; align-items:center; gap:7px; padding:9px 20px; border-radius:10px;
                      background:linear-gradient(135deg,#0f766e,#0d9488); border:none; color:#fff;
                      font-size:13px; font-weight:700; cursor:pointer; transition:all .15s; font-family:inherit; }
        .tp-add-btn:hover { filter:brightness(1.08); transform:translateY(-1px); }

        .tp-refresh-btn { display:flex; align-items:center; gap:6px; padding:9px 14px; border-radius:10px;
                          background:#fff; border:1.5px solid #cbd5e1; color:#475569;
                          font-size:13px; font-weight:600; cursor:pointer; transition:all .15s; font-family:inherit; }
        .tp-refresh-btn:hover { background:#f8fafc; border-color:#94a3b8; }

        .tp-card { background:#fff; border-radius:16px; border:1.5px solid #d1d5db; overflow:hidden; }

        .tp-th { padding:11px 14px; text-align:left; font-size:10px; font-weight:700; color:#64748b;
                 letter-spacing:.09em; text-transform:uppercase; background:#f8fafc;
                 border-bottom:1.5px solid #d1d5db; white-space:nowrap; }

        .tp-toast { position:fixed; bottom:26px; right:26px; z-index:9999; display:flex; align-items:center;
                    gap:9px; background:#0f172a; color:#fff; padding:12px 18px; border-radius:12px;
                    font-size:13px; font-weight:600; box-shadow:0 6px 24px rgba(0,0,0,.22);
                    animation:tp_toast .28s ease; font-family:'Outfit',sans-serif; }

        @media(max-width:700px) {
          .tp-cards-grid  { flex-direction:column !important; }
          .tp-hdr-strip   { flex-direction:column !important; align-items:flex-start !important; }
          .tp-hdr-stats   { flex-wrap:wrap !important; }
          .tp-stage-row   { flex-direction:column !important; gap:12px !important; }
          .tp-stage-item  { border-right:none !important; padding-right:0 !important; margin-right:0 !important; border-bottom:1px dashed #e2e8f0; padding-bottom:12px !important; }
          .tp-stage-item:last-child { border-bottom:none !important; padding-bottom:0 !important; }
        }
      `}</style>

      <div className="tp-root">

        {/* ── Top bar ── */}
        <div className="tp-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="tp-back" onClick={() => navigate(`/invoices/${id}`)}>
              <ArrowLeft size={14} /> Back to Invoice
            </button>
            <div style={{ width: 1, height: 18, background: '#d1d5db' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#64748b' }}>
              <Receipt size={13} color="#0f766e" />
              <span style={{ color: '#0f766e', fontWeight: 700 }}>{invNum}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="tp-refresh-btn" onClick={fetchData} disabled={payLoading}>
              <RefreshCw size={13} style={{ animation: payLoading ? 'tp_spin .85s linear infinite' : 'none' }} />
              Refresh
            </button>
            <button className="tp-add-btn" onClick={() => setShowModal(true)}>
              <Plus size={15} /> Add Payment
            </button>
          </div>
        </div>

        {/* ── Header strip ── */}
        <div className="tp-hdr-strip" style={{
          background: 'linear-gradient(135deg,#134e4a 0%,#0f766e 55%,#0d9488 100%)',
          borderRadius: 16, padding: '22px 28px', marginBottom: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(255,255,255,.15)', border: '1.5px solid rgba(255,255,255,.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Receipt size={21} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 3 }}>Track Payment</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' }}>{invNum}</div>
              {clientName && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <User size={11} /> {clientName}
                </div>
              )}
            </div>
          </div>
          <div className="tp-hdr-stats" style={{ display: 'flex', alignItems: 'center' }}>
            {[
              { label: 'Grand Total', value: `₹ ${fmtINR(grandTotal)}`, large: true },
              { label: 'Payments',    value: payments.length,            large: true },
              { label: 'Due Date',    value: fmtDate(trackData?.valid_until || invoice?.valid_until || invoice?.created_at), large: false },
            ].map((s, i, arr) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ textAlign: 'right', padding: '0 20px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.55)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 3 }}>{s.label}</div>
                  <div style={{ fontSize: s.large ? 20 : 15, fontWeight: 900, color: '#fff' }}>{s.value}</div>
                </div>
                {i < arr.length - 1 && <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,.2)' }} />}
              </div>
            ))}
          </div>
        </div>

        {/* ── 4 Summary Cards ── */}
        <div className="tp-cards-grid" style={{ display: 'flex', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
          <SummaryCard label="Total Amount"  value={grandTotal}  sub="Invoice Total with GST"  iconBg="#ecfdf5" iconColor="#0f766e" Icon={IndianRupee} accent="#86efac" />
          <SummaryCard label="Paid Amount"   value={totalPaid}   sub={`${paidPct.toFixed(1)}% of Total`}        iconBg="#fef2f2" iconColor="#dc2626" Icon={TrendingUp}  accent="#fca5a5" />
          <SummaryCard label="Balance Due"   value={balanceDue}  sub={(trackData?.valid_until || invoice?.valid_until) ? `Due by ${fmtDate(trackData?.valid_until || invoice?.valid_until)}` : 'Outstanding'} iconBg="#fffbeb" iconColor="#d97706" Icon={Clock} accent="#fcd34d" />
          <SummaryCard label="Advance Paid"  value={advancePaid} sub="Initial Payment Received" iconBg="#ecfdf5" iconColor="#059669" Icon={CheckCircle} accent="#6ee7b7" />
        </div>

        {/* ── Payment Progress ── */}
        <div className="tp-card" style={{ padding: '22px 26px', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Payment Progress</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: paidPct >= 100 ? '#059669' : paidPct > 0 ? '#d97706' : '#94a3b8' }}>
              {paidPct.toFixed(1)}%
            </div>
          </div>

          {/* Bar */}
          <div style={{ position: 'relative', height: 10, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
            <div style={{
              height: '100%', borderRadius: 99,
              background: paidPct >= 100
                ? 'linear-gradient(90deg,#059669,#10b981)'
                : 'linear-gradient(90deg,#0f766e,#0d9488,#06b6d4)',
              width: `${paidPct}%`,
              transition: 'width .8s cubic-bezier(.34,1.1,.64,1)',
              minWidth: paidPct > 0 ? 6 : 0,
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', fontWeight: 500, marginBottom: 20 }}>
            <span>₹ 0</span>
            <span>₹ {fmtINR(totalPaid)} Paid</span>
            <span>{paidPct.toFixed(1)}% of Total</span>
          </div>

          {/* Stage markers */}
          <div className="tp-stage-row" style={{ display: 'flex', borderTop: '1.5px solid #e2e8f0', paddingTop: 18 }}>
            {[
              { label: 'Advance',           sub: advancePaid > 0 ? `₹ ${fmtINR(advancePaid)} Received` : 'Pending',   done: advancePaid > 0 },
              { label: 'Payments Received', sub: payments.length > 0 ? `${payments.length} payment${payments.length !== 1 ? 's' : ''} · ₹ ${fmtINR(paymentsSum)}` : 'None yet', done: payments.length > 0 },
              { label: 'Full Payment',      sub: balanceDue <= 0 ? 'Completed ✓' : `₹ ${fmtINR(balanceDue)} remaining`, done: balanceDue <= 0 },
            ].map((m, i) => (
              <div key={i} className="tp-stage-item" style={{
                display: 'flex', alignItems: 'center', gap: 10, flex: 1,
                paddingRight: i < 2 ? 24 : 0, marginRight: i < 2 ? 24 : 0,
                borderRight: i < 2 ? '1px dashed #e2e8f0' : 'none',
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: m.done ? '#ecfdf5' : '#f8fafc',
                  border: `1.5px solid ${m.done ? '#6ee7b7' : '#d1d5db'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {m.done ? <CheckCircle size={16} color="#059669" /> : <TrendingUp size={16} color="#94a3b8" />}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: m.done ? '#059669' : '#94a3b8', marginTop: 1, fontWeight: 500 }}>{m.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Payment History — DynamicList ── */}
        <DynamicList
          config={trackPaymentConfig}
          data={payments}
          loading={payLoading}
          error=""
          emptyMessage={trackPaymentConfig.emptyMessage}
          currentPage={1}
          totalPages={1}
          totalCount={payments.length}
          onRetry={() => invoice?.id && fetchPayments(invoice.id).then(setPayments)}
          actionHandlers={{
            onEditPayment: (payment) => setEditPayment(payment),
          }}
        />

      </div>{/* end .tp-root */}

      {/* ── Add Payment Modal ── */}
      {showModal && (
        <AddPaymentModal
          invoice={invoice}
          navClientId={navClientId}
          navVendorId={navVendorId}
          onClose={() => setShowModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* ── Edit Payment Modal ── */}
      {editPayment && (
        <EditPaymentModal
          payment={editPayment}
          onClose={() => setEditPayment(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="tp-toast">
          <CheckCircle size={15} color="#4ade80" /> {toast}
        </div>
      )}
    </>
  );
}