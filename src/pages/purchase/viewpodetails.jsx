import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Loader2, AlertCircle,
  X,
  CheckCircle, Clock, FileText, XCircle,
  Building2, User, MapPin, Hash, Calendar,
  Tag, Percent, ChevronRight, Mail, Truck,
  Edit2, Save, RotateCcw, Plus, Trash2, PenLine,
  Search, ChevronDown, Edit, Receipt,
} from 'lucide-react';
import { getQuotationById } from '../../services/quotation';
import { getComplianceByCategory } from '../../services/proforma';
import { getProjects } from '../../services/projects';
import { createInvoice } from '../../services/invoices';
import api from '../../services/api';
import AddComplianceModal from '../../components/AddComplianceModal/AddcomplianceModal';

// ─── Constants ────────────────────────────────────────────────────────────────

const COMPLIANCE_CATEGORIES = {
  1: 'Construction Certificate',
  2: 'Occupational Certificate',
  3: 'Water Main Commissioning',
  4: 'STP Commissioning',
};

const SUB_COMPLIANCE_CATEGORIES = {
  1: { id: 1, name: 'Plumbing Compliance' },
  2: { id: 2, name: 'PCO Compliance' },
  3: { id: 3, name: 'General Compliance' },
  4: { id: 4, name: 'Road Setback Handing over' },
  0: { id: 0, name: 'Default' },
};

// Purchase Orders are ALWAYS execution compliance only (categories 3 & 4)
const PO_COMPLIANCE_GROUPS = { execution: [3, 4] };

const STATUS_CONFIG = {
  '1':          { label: 'Draft',        Icon: FileText,    color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  '2':          { label: 'Sent',         Icon: CheckCircle, color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  '3':          { label: 'Accepted',     Icon: CheckCircle, color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  '4':          { label: 'Rejected',     Icon: XCircle,     color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  '5':          { label: 'Expired',      Icon: XCircle,     color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  '6':          { label: 'Under Review', Icon: Clock,       color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  '7':          { label: 'Pending',      Icon: Clock,       color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  'draft':      { label: 'Draft',        Icon: FileText,    color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  'pending':    { label: 'Pending',      Icon: Clock,       color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  'sent':       { label: 'Sent',         Icon: CheckCircle, color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  'accepted':   { label: 'Accepted',     Icon: CheckCircle, color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  'rejected':   { label: 'Rejected',     Icon: XCircle,     color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  'expired':    { label: 'Expired',      Icon: XCircle,     color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  'processing': { label: 'Under Review', Icon: Clock,       color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtPONum = (n) => {
  if (!n) return '—';
  const s = String(n);
  if (s.startsWith('QT-') || s.startsWith('PO-')) return s;
  if (s.length >= 8) return `PO-${s.substring(0, 4)}-${s.substring(4).padStart(5, '0')}`;
  return `PO-2026-${s.padStart(5, '0')}`;
};

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

const isMiscNumeric = (v) => {
  if (v === '' || v == null) return false;
  const s = String(v).trim();
  return s !== '' && !isNaN(s) && !isNaN(parseFloat(s));
};

const getStatus = (s) =>
  STATUS_CONFIG[String(s || '').toLowerCase()] ||
  STATUS_CONFIG[String(s || '')] ||
  STATUS_CONFIG['1'];

const groupItemsByCategory = (items = []) => {
  const groups = {};
  items.forEach((item) => {
    const catId = item.compliance_category ?? item.category ?? null;
    const key   = catId != null ? String(catId) : 'other';
    if (!groups[key]) {
      groups[key] = {
        catId,
        catName: catId != null ? (COMPLIANCE_CATEGORIES[catId] || `Category ${catId}`) : 'Other Services',
        items: [],
      };
    }
    groups[key].items.push(item);
  });
  return Object.values(groups);
};

const calcItemTotal = (item) => {
  const prof = parseFloat(item.Professional_amount) || 0;
  const misc = isMiscNumeric(item.miscellaneous_amount) ? parseFloat(item.miscellaneous_amount) : 0;
  const qty  = parseInt(item.quantity) || 1;
  return parseFloat(((prof + misc) * qty).toFixed(2));
};

// ─── Number to words ──────────────────────────────────────────────────────────
function numberToWords(n) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const convert = (num) => {
    if (num === 0) return '';
    if (num < 20)     return ones[num] + ' ';
    if (num < 100)    return tens[Math.floor(num / 10)] + (num % 10 ? '-' + ones[num % 10] : '') + ' ';
    if (num < 1000)   return ones[Math.floor(num / 100)] + ' Hundred ' + convert(num % 100);
    if (num < 100000) return convert(Math.floor(num / 1000)) + 'Thousand ' + convert(num % 1000);
    if (num < 10000000) return convert(Math.floor(num / 100000)) + 'Lakh ' + convert(num % 100000);
    return convert(Math.floor(num / 10000000)) + 'Crore ' + convert(n % 10000000);
  };
  const int = Math.floor(n);
  const dec = Math.round((n - int) * 100);
  let str = convert(int).trim() || 'Zero';
  if (dec > 0) str += ` and ${convert(dec).trim()} Paise`;
  return str;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const StatusPill = ({ status }) => {
  const { Icon } = status;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      color: status.color, background: status.bg,
      border: `1px solid ${status.border}`,
      fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 20,
    }}>
      <Icon size={11} /> {status.label}
    </span>
  );
};

const MetaBlock = ({ icon: Icon, label, value, accent }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
    <span style={{
      fontSize: 10, fontWeight: 700, color: '#94a3b8',
      textTransform: 'uppercase', letterSpacing: '0.08em',
      display: 'flex', alignItems: 'center', gap: 4,
    }}>
      <Icon size={10} /> {label}
    </span>
    <span style={{
      fontSize: 13, fontWeight: 700,
      color: accent ? '#0f766e' : '#1e293b',
      fontFamily: accent ? 'monospace' : 'inherit',
      letterSpacing: accent ? '0.03em' : 0,
    }}>
      {value || '—'}
    </span>
  </div>
);

const LoadingView = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 14 }}>
    <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#0f766e', animation: 'vpod_spin .75s linear infinite' }} />
    <p style={{ fontSize: 14, fontWeight: 500, color: '#64748b', margin: 0 }}>Loading purchase order…</p>
    <style>{`@keyframes vpod_spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

const ErrorView = ({ message, onRetry, onBack }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
    <div style={{ textAlign: 'center', maxWidth: 380 }}>
      <div style={{ width: 56, height: 56, background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <AlertCircle size={28} color="#dc2626" />
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>Failed to load</h3>
      <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px', lineHeight: 1.7 }}>{message}</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button onClick={onRetry} style={{ padding: '8px 20px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Retry</button>
        <button onClick={onBack}  style={{ padding: '8px 20px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Back</button>
      </div>
    </div>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ViewPODetails({ onUpdateNavigation }) {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [po,            setPo]            = useState(null);
  const [project,       setProject]       = useState(null);
  const [createdByName, setCreatedByName] = useState('');
  const [loading,       setLoading]       = useState(true);
  const [fetchError,    setFetchError]    = useState('');
  const [pdfLoading,    setPdfLoading]    = useState(false);
  const [visible,       setVisible]       = useState(false);

  // ── Edit mode state — mirrors viewquotationdetails exactly ──────────────────
  const [editMode,    setEditMode]    = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [editSacCode,  setEditSacCode]  = useState('');
  const [editGstRate,  setEditGstRate]  = useState(0);
  const [editDiscRate, setEditDiscRate] = useState(0);
  const [editItems,    setEditItems]    = useState([]);

  // AddComplianceModal — locked to execution only for POs
  const [showAddSection, setShowAddSection] = useState(false);

  // ── Generate Invoice modal state ─────────────────────────────────────────────
  const [showInvoiceModal,   setShowInvoiceModal]   = useState(false);
  const [advanceAmount,      setAdvanceAmount]      = useState('');
  const [invoiceGenerating,  setInvoiceGenerating]  = useState(false);
  const [invoiceChecking,    setInvoiceChecking]    = useState(false);
  const [invoiceError,       setInvoiceError]       = useState('');
  const [invoiceSuccess,     setInvoiceSuccess]     = useState(null);
  const [invoiceModal,       setInvoiceModal]       = useState({
    open: false, invoiceId: null, invoiceNum: '', alreadyExists: false, genericError: '',
  });

  useEffect(() => {
    onUpdateNavigation?.({ breadcrumbs: ['Purchase Orders', 'Purchase Order Details'] });
    return () => onUpdateNavigation?.(null);
  }, [onUpdateNavigation]);

  const fetchData = useCallback(async () => {
    if (!id) { setFetchError('No Purchase Order ID provided'); setLoading(false); return; }
    setLoading(true); setFetchError('');
    try {
      const res = await getQuotationById(id);
      if (res.status !== 'success' || !res.data) throw new Error('Failed to load purchase order');
      const poData = res.data;
      setPo(poData);

      if (poData.project) {
        try {
          const pr  = await getProjects({ page: 1, page_size: 500 });
          const all = pr?.data?.results || pr?.results || [];
          const found = all.find(p => String(p.id) === String(poData.project));
          if (found) setProject(found);
        } catch {}
      }

      if (poData.created_by) {
        try {
          const ur = await api.get('/users/get_user/', { params: { id: poData.created_by } });
          if (ur.data?.status === 'success' && ur.data?.data) {
            const u = ur.data.data;
            setCreatedByName(`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || '');
          }
        } catch {}
      }

      setTimeout(() => setVisible(true), 60);
    } catch (e) {
      setFetchError(e.message || 'Failed to load purchase order details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); window.scrollTo(0, 0); }, [fetchData]);

  // ── fetchDescriptionsForModal — same as quotation, execution categories only ─
  const fetchDescriptionsForModal = async (categoryId, subCategoryId) => {
    // PO only uses execution categories (3=Water Main, 4=STP) — no sub-category
    const res = await getComplianceByCategory(categoryId, subCategoryId || null);
    if (res?.status === 'success' && res?.data?.results) return res.data.results;
    return [];
  };

  // ── Edit mode lifecycle — exact copy of quotation pattern ──────────────────
  const enterEditMode = () => {
    if (!po) return;
    setEditSacCode(po.sac_code || '');
    setEditGstRate(parseFloat(po.gst_rate || 0));
    setEditDiscRate(parseFloat(po.discount_rate || 0));
    setEditItems((po.items || []).map(it => ({
      id:                      it.id,
      description:             it.description || it.compliance_name || '',
      quantity:                parseInt(it.quantity) || 1,
      Professional_amount:     parseFloat(it.Professional_amount || 0),
      miscellaneous_amount:    (it.miscellaneous_amount === '--' || it.miscellaneous_amount === null) ? '' : (it.miscellaneous_amount || ''),
      compliance_category:     it.compliance_category ?? 3, // PO defaults to execution (3)
      sub_compliance_category: it.sub_compliance_category ?? 0,
      total_amount:            parseFloat(it.total_amount || 0),
    })));
    setSaveError(''); setSaveSuccess(false);
    setEditMode(true);
  };

  const cancelEditMode = () => { setEditMode(false); setSaveError(''); };

  const calcEditSubtotal   = () => parseFloat(editItems.reduce((s, it) => s + calcItemTotal(it), 0).toFixed(2));
  const calcEditDiscAmt    = (sub) => parseFloat(((sub * (editDiscRate || 0)) / 100).toFixed(2));
  const calcEditGstAmt     = (sub, disc) => parseFloat((((sub - disc) * (editGstRate || 0)) / 100).toFixed(2));
  const calcEditGrandTotal = () => {
    const sub  = calcEditSubtotal();
    const disc = calcEditDiscAmt(sub);
    const gst  = calcEditGstAmt(sub, disc);
    return parseFloat((sub - disc + gst).toFixed(2));
  };

  const updateItem = (idx, field, value) => {
    setEditItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: value };
      updated.total_amount = calcItemTotal(updated);
      return updated;
    }));
  };

  const removeItem = (idx) => setEditItems(prev => prev.filter((_, i) => i !== idx));

  // Called by AddComplianceModal — new items added from the modal
  const handleComplianceSave = (newFlatItems) => {
    setEditItems(prev => [...prev, ...newFlatItems]);
    setShowAddSection(false);
  };

  // ── Save / Update — same API as quotation: PUT /quotations/update_quotation/ ─
  const handleSaveUpdate = async () => {
    setSaveError('');
    for (const it of editItems) {
      if (!String(it.description).trim()) { setSaveError('All items must have a description.'); return; }
      if ((parseInt(it.quantity) || 0) <= 0) { setSaveError('All quantities must be ≥ 1.'); return; }
      if ((parseFloat(it.Professional_amount) || 0) <= 0) { setSaveError('Professional amount must be > 0 for all items.'); return; }
    }
    if (!editSacCode.trim()) { setSaveError('SAC Code is required.'); return; }
    setSaving(true);
    try {
      const sub   = calcEditSubtotal();
      const disc  = calcEditDiscAmt(sub);
      const gst   = calcEditGstAmt(sub, disc);
      const grand = sub - disc + gst;

      const rawStatus = po.status;
      const STATUS_STR_TO_INT = { draft: 1, pending: 2, sent: 2, accepted: 3, rejected: 4, expired: 5, processing: 6 };
      const resolvedStatus = Number.isInteger(rawStatus)
        ? rawStatus
        : (parseInt(rawStatus) || STATUS_STR_TO_INT[String(rawStatus).toLowerCase()] || 1);

      const payload = {
        id:               parseInt(po.id),
        vendor:           parseInt(po.vendor),   // PO uses vendor instead of client
        project:          parseInt(po.project),
        status:           resolvedStatus,
        sac_code:         editSacCode.trim(),
        gst_rate:         String(parseFloat(editGstRate || 0).toFixed(2)),
        discount_rate:    String(parseFloat(editDiscRate || 0).toFixed(2)),
        total_amount:     Math.round(sub),
        total_gst_amount: Math.round(gst),
        grand_total:      Math.round(grand),
        items: editItems.map(it => {
          const compCat    = parseInt(it.compliance_category) || 3; // execution default
          const subCompCat = parseInt(it.sub_compliance_category) || 0;
          const rawId  = it.id != null ? parseInt(it.id) : null;
          const itemId = rawId && rawId > 0 ? rawId : null;
          return {
            id:                      itemId,
            description:             String(it.description).trim(),
            quantity:                parseInt(it.quantity) || 1,
            Professional_amount:     parseFloat((parseFloat(it.Professional_amount) || 0).toFixed(2)),
            miscellaneous_amount:    String(it.miscellaneous_amount ?? '').trim() || '--',
            total_amount:            Math.round(calcItemTotal(it)),
            compliance_category:     compCat,
            sub_compliance_category: subCompCat,
          };
        }),
      };

      const response = await api.put('/quotations/update_quotation/', payload);
      const data = response.data;

      if (data && (data.id || data.quotation_number)) {
        const updated = data.data || data;
        setPo(prev => ({
          ...prev, ...updated,
          sac_code: editSacCode.trim(),
          gst_rate: String(editGstRate),
          discount_rate: String(editDiscRate),
          total_amount: sub, total_gst_amount: gst, grand_total: grand,
          items: updated.items || editItems.map(it => ({
            ...it,
            miscellaneous_amount: String(it.miscellaneous_amount ?? '').trim() || '--',
            total_amount: calcItemTotal(it),
          })),
        }));
        setSaveSuccess(true);
        setEditMode(false);
        setTimeout(() => setSaveSuccess(false), 3500);
      } else if (data?.status === 'success') {
        const updated = data.data || {};
        setPo(prev => ({ ...prev, ...updated, sac_code: editSacCode.trim(), gst_rate: String(editGstRate), discount_rate: String(editDiscRate), total_amount: sub, total_gst_amount: gst, grand_total: grand }));
        setSaveSuccess(true);
        setEditMode(false);
        setTimeout(() => setSaveSuccess(false), 3500);
      } else {
        setSaveError(data?.message || data?.detail || 'Update failed. Please try again.');
      }
    } catch (e) {
      const respData = e.response?.data;
      let msg = '';
      if (respData) {
        const errors = respData.errors || respData;
        if (typeof errors === 'string') {
          msg = errors;
        } else {
          msg = Object.entries(errors)
            .map(([field, val]) => {
              if (Array.isArray(val)) {
                const flat = val.map(v => {
                  if (typeof v === 'string') return v;
                  if (typeof v === 'object' && v !== null) {
                    return Object.entries(v).map(([k2, v2]) =>
                      `${field}[${k2}]: ${Array.isArray(v2) ? v2.join(', ') : v2}`
                    ).join('; ');
                  }
                  return String(v);
                }).filter(Boolean);
                return flat.length ? flat.join('; ') : null;
              }
              return `${field}: ${val}`;
            })
            .filter(Boolean)
            .join(' | ');
        }
      }
      setSaveError(msg || e.message || 'Failed to update purchase order.');
    } finally {
      setSaving(false);
    }
  };

  // ── Invoice number formatter ─────────────────────────────────────────────────
  const fmtInvNum = (n) => n ? String(n) : '—';

  // ── Extract trailing digits from a PO/invoice number for matching ────────────
  const extractTrailingDigits = (numStr) => {
    if (!numStr) return '';
    const s = String(numStr);
    const lastDash = s.lastIndexOf('-');
    return lastDash >= 0 ? s.substring(lastDash + 1) : s;
  };

  // ── Find the invoice for THIS purchase order (quotation) by matching ─────────
  // Matches by quotation field on invoice OR by shared trailing digits.
  const fetchInvoiceForThisPO = async () => {
    const poTrailing = extractTrailingDigits(po.quotation_number || String(po.id));
    const res = await api.get('/invoices/get_all_invoices/', {
      params: { page: 1, page_size: 100 },
    });
    const results = res.data?.data?.results || res.data?.results || [];
    // First try: match by quotation field on the invoice (most reliable)
    const quotationId = Number(po.id);
    let match = results.find((inv) => Number(inv.quotation) === quotationId);
    // Second try: match by shared trailing digits in invoice_number
    if (!match && poTrailing) {
      match = results.find((inv) => {
        const invTrailing = extractTrailingDigits(inv.invoice_number);
        return invTrailing && invTrailing === poTrailing;
      });
    }
    return match || null;
  };

  // ── Dismiss invoice modal helper ─────────────────────────────────────────────
  const dismissInvoiceModal = () =>
    setInvoiceModal({ open: false, invoiceId: null, invoiceNum: '', alreadyExists: false, genericError: '' });

  // ── Generate Invoice button click (pre-checks for existing invoice) ──────────
  const handleInvoiceButtonClick = async () => {
    setInvoiceChecking(true);
    try {
      const existing = await fetchInvoiceForThisPO();
      if (existing) {
        setInvoiceModal({
          open: true,
          invoiceId: existing.id,
          invoiceNum: fmtInvNum(existing.invoice_number),
          alreadyExists: true,
          genericError: '',
        });
        return;
      }
      // No existing invoice — safe to open modal
      setAdvanceAmount('');
      setInvoiceError('');
      setInvoiceSuccess(null);
      setShowInvoiceModal(true);
    } catch {
      // Pre-check failed — open modal and let the API 409 handle it
      setAdvanceAmount('');
      setInvoiceError('');
      setInvoiceSuccess(null);
      setShowInvoiceModal(true);
    } finally {
      setInvoiceChecking(false);
    }
  };

  // ── Generate Invoice handler (called from inside the modal) ──────────────────
  const handleGenerateInvoice = async () => {
    setInvoiceError('');
    setInvoiceGenerating(true);
    try {
      const advance = advanceAmount ? parseFloat(advanceAmount) : 0;
      if (advanceAmount && isNaN(advance)) {
        setInvoiceError('Please enter a valid advance amount.');
        setInvoiceGenerating(false);
        return;
      }
      if (advance < 0) {
        setInvoiceError('Advance amount cannot be negative.');
        setInvoiceGenerating(false);
        return;
      }
      // For Purchase Orders: pass quotation ID, proforma must be null
      const res = await createInvoice({
        quotation:      po.id,
        advance_amount: String(advance.toFixed(2)),
      });
      const created = res?.data || res;
      if (!created?.id && !created?.invoice_number) {
        setInvoiceError('Invoice created but response was unexpected. Please check Invoice List.');
        return;
      }
      setInvoiceSuccess(created);
    } catch (e) {
      const status   = e.response?.status;
      const respData = e.response?.data;

      // ── 409 Conflict: safety-net if pre-check missed it ──────────────────────
      if (status === 409) {
        setShowInvoiceModal(false);
        let existingId  = null;
        let existingNum = '';
        try {
          const match = await fetchInvoiceForThisPO();
          if (match) {
            existingId  = match.id;
            existingNum = fmtInvNum(match.invoice_number);
          }
        } catch { /* silently ignore */ }
        setInvoiceModal({ open: true, invoiceId: existingId, invoiceNum: existingNum, alreadyExists: true, genericError: '' });
        return;
      }

      let msg = '';
      if (respData) {
        const errs = respData.errors || respData.message || respData.detail || respData;
        if (typeof errs === 'string') msg = errs;
        else if (typeof errs === 'object') msg = Object.values(errs).flat().join(' | ');
      }
      setInvoiceError(msg || e.message || 'Failed to generate invoice. Please try again.');
    } finally {
      setInvoiceGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (pdfLoading) return;
    try {
      setPdfLoading(true);
      if (po?.quotation_url) {
        window.open(po.quotation_url, '_blank');
      } else {
        const response = await api.get(`/quotations/${id}/generate_pdf/`, { responseType: 'blob' });
        const url  = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${fmtPONum(po?.quotation_number)}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('PDF download failed:', e);
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading)    return <LoadingView />;
  if (fetchError) return <ErrorView message={fetchError} onRetry={fetchData} onBack={() => navigate('/purchase')} />;
  if (!po)        return <ErrorView message="Purchase order not available." onRetry={fetchData} onBack={() => navigate('/purchase')} />;

  // ── Derived values ─────────────────────────────────────────────────────────────
  const status     = getStatus(po.status_display || po.status);
  const poNum      = fmtPONum(po.quotation_number);
  const subtotal   = parseFloat(po.total_amount  || 0);
  const gstRate    = parseFloat(po.gst_rate      || 0);
  const discRate   = parseFloat(po.discount_rate || 0);
  const discAmt    = parseFloat(((subtotal * discRate) / 100).toFixed(2));
  const taxable    = parseFloat((subtotal - discAmt).toFixed(2));
  const gstAmt     = parseFloat(((taxable * gstRate) / 100).toFixed(2));
  const grandTotal = parseFloat((taxable + gstAmt).toFixed(2));
  const items      = po.items || [];
  const groups     = groupItemsByCategory(items);
  const totalQty   = items.reduce((s, it) => s + (parseInt(it.quantity) || 1), 0);

  const vendorName = po.vendor_name || (po.vendor ? `Vendor` : '—');
  const projName   = project
    ? (project.name || project.title || `Project #${po.project}`)
    : po.project_name || (po.project ? `Project #${po.project}` : '—');
  const projLoc    = project ? [project.city, project.state].filter(Boolean).join(', ') : '';

  return (
    <>
      {/* ─── Global styles — pixel-perfect mirror of viewquotationdetails.jsx ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        .vpod-root *{box-sizing:border-box;font-family:'Outfit',sans-serif}
        @keyframes vpod_spin{to{transform:rotate(360deg)}}
        @keyframes vpod_in{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes vpod_toast_in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes vpod_pulse_ring{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.35);opacity:0}}
        .vpod-root{min-height:100vh;padding:0}
        .vpod-topbar{display:flex;align-items:center;justify-content:space-between;margin:0 0 16px}
        .vpod-back{display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;font-size:13px;font-weight:600;color:#475569;padding:6px 10px;border-radius:8px;transition:background .15s,color .15s}
        .vpod-back:hover{background:#e2e8f0;color:#1e293b}
        .vpod-actions{display:flex;gap:8px}
        .vpod-btn-o{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;background:#fff;border:1.5px solid #e2e8f0;font-size:13px;font-weight:600;color:#475569;cursor:pointer;transition:all .15s}
        .vpod-btn-o:hover{background:#f8fafc;border-color:#cbd5e1}
        .vpod-btn-p{display:flex;align-items:center;gap:6px;padding:7px 16px;border-radius:8px;background:#0f766e;border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:background .15s}
        .vpod-btn-p:hover{background:#0d6460}
        .vpod-btn-p:disabled{opacity:.6;cursor:not-allowed}
        .vpod-btn-edit{display:flex;align-items:center;gap:6px;padding:7px 16px;border-radius:8px;background:linear-gradient(135deg,#f59e0b,#d97706);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;box-shadow:0 2px 8px rgba(217,119,6,.25)}
        .vpod-btn-edit:hover{background:linear-gradient(135deg,#d97706,#b45309);box-shadow:0 4px 12px rgba(217,119,6,.35)}
        .vpod-btn-save{display:flex;align-items:center;gap:6px;padding:7px 16px;border-radius:8px;background:linear-gradient(135deg,#0f766e,#0d9488);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s}
        .vpod-btn-save:hover{background:linear-gradient(135deg,#0d6460,#0b7a72)}
        .vpod-btn-save:disabled{opacity:.6;cursor:not-allowed}
        .vpod-btn-cancel{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;background:#fff;border:1.5px solid #e2e8f0;font-size:13px;font-weight:600;color:#64748b;cursor:pointer;transition:all .15s}
        .vpod-btn-cancel:hover{background:#fef2f2;border-color:#fca5a5;color:#dc2626}
        .vpod-spin{animation:vpod_spin .7s linear infinite}
        .vpod-doc{background:#fff;border-radius:20px;box-shadow:0 2px 4px rgba(0,0,0,.04),0 12px 40px rgba(0,0,0,.09);overflow:hidden;opacity:0;transform:translateY(16px);transition:opacity .4s ease,transform .4s ease}
        .vpod-doc.in{opacity:1;transform:translateY(0)}
        .vpod-doc.vpod-doc-editing{box-shadow:0 0 0 2.5px #f59e0b,0 2px 4px rgba(0,0,0,.04),0 12px 40px rgba(0,0,0,.09)}

        /* ── Header ── */
        .vpod-hdr{display:flex;align-items:flex-end;justify-content:space-between;padding:32px 40px 28px;background:linear-gradient(135deg,#0c6e67 0%,#0f766e 40%,#0d9488 80%,#14b8a6 100%);position:relative;overflow:hidden}
        .vpod-hdr::after{content:'';position:absolute;top:-60px;right:-60px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.06);pointer-events:none}
        .vpod-hdr::before{content:'';position:absolute;bottom:-80px;left:30%;width:300px;height:300px;border-radius:50%;background:rgba(255,255,255,.04);pointer-events:none}
        .vpod-hdr-l{position:relative;z-index:1}
        .vpod-hdr-r{text-align:right;position:relative;z-index:1}
        .vpod-logo{display:flex;align-items:center;gap:12px;margin-bottom:16px}
        .vpod-logo-badge{width:46px;height:46px;border-radius:12px;background:rgba(255,255,255,.15);border:1.5px solid rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#fff;letter-spacing:.03em}
        .vpod-co-name{font-size:20px;font-weight:800;color:#fff;letter-spacing:-.02em;line-height:1.1}
        .vpod-co-sub{font-size:12px;color:rgba(255,255,255,.6);font-weight:400;margin-top:2px}
        .vpod-doc-label{font-size:10px;font-weight:800;color:rgba(255,255,255,.55);letter-spacing:.18em;text-transform:uppercase}
        .vpod-doc-num{font-size:24px;font-weight:900;color:#fff;letter-spacing:-.02em;font-variant-numeric:tabular-nums;margin-top:3px}
        .vpod-doc-date{font-size:12px;color:rgba(255,255,255,.6);margin-top:5px;font-weight:400}

        /* ── Meta strip ── */
        .vpod-meta{display:flex;flex-wrap:wrap;align-items:center;gap:0;padding:14px 40px;background:#f8fafc;border-bottom:1.5px solid #e8ecf2}
        .vpod-meta-sep{width:1px;height:30px;background:#e2e8f0;margin:0 18px;flex-shrink:0}

        /* ── Parties ── */
        .vpod-parties{display:grid;grid-template-columns:1fr 28px 1fr 1fr;padding:28px 40px;gap:0;border-bottom:1.5px solid #f0f4f8;background:#fff}
        .vpod-arrow-col{display:flex;align-items:center;justify-content:center;padding:0 4px;padding-top:36px}
        .vpod-party{padding-right:24px}
        .vpod-party--proj{padding-left:24px;padding-right:24px}
        .vpod-party--rates{padding-left:24px;border-left:1.5px solid #f0f4f8}
        .vpod-plabel{font-size:9.5px;font-weight:800;letter-spacing:.14em;color:#94a3b8;text-transform:uppercase;margin-bottom:10px}
        .vpod-pavatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#0f766e,#0d9488);color:#fff;font-size:18px;font-weight:800;display:flex;align-items:center;justify-content:center;margin-bottom:8px}
        .vpod-picon{width:44px;height:44px;border-radius:10px;background:#f0fdf4;border:1.5px solid #bbf7d0;display:flex;align-items:center;justify-content:center;margin-bottom:8px}
        .vpod-pname{font-size:15px;font-weight:700;color:#1e293b;line-height:1.3;margin-bottom:5px}
        .vpod-pdetail{display:flex;align-items:center;gap:5px;font-size:12px;color:#64748b;margin-bottom:3px;word-break:break-all}
        .vpod-rates-list{display:flex;flex-direction:column;gap:12px}
        .vpod-rate-row{display:flex;align-items:center;gap:10px}
        .vpod-rate-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .vpod-rate-v{font-size:15px;font-weight:800;color:#1e293b;line-height:1.2}
        .vpod-rate-l{font-size:11px;color:#94a3b8;font-weight:500}

        /* ── Items section ── */
        .vpod-items{padding:0 40px 32px}
        .vpod-sec-hdr{display:flex;align-items:center;gap:8px;padding:22px 0 14px;border-bottom:2px solid #f0f4f8;font-size:13px;font-weight:700;color:#1e293b}
        .vpod-sec-badge{background:#ecfdf5;color:#059669;font-size:10.5px;font-weight:700;padding:2px 9px;border-radius:20px;border:1px solid #bbf7d0}
        .vpod-table-wrap{overflow-x:auto;margin-top:0}
        .vpod-table{width:100%;border-collapse:collapse;font-size:13px}
        .vpod-table thead tr{background:#f8fafc}
        .vpod-table thead th{padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:.08em;text-transform:uppercase;border-bottom:1.5px solid #e8ecf2;white-space:nowrap}
        .vpod-table thead th:first-child{padding-left:16px}
        .vpod-table thead th:last-child{padding-right:16px;text-align:right}
        .vpod-cat-row td{padding:9px 12px 6px 16px;background:#fafbfc;border-top:1.5px solid #f0f4f8}
        .vpod-cat-inner{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:700;color:#0f766e;text-transform:uppercase;letter-spacing:.08em}
        .vpod-cat-dot{width:6px;height:6px;border-radius:50%;background:#0d9488;flex-shrink:0}
        .vpod-cat-cnt{margin-left:auto;font-size:10px;font-weight:600;color:#94a3b8;text-transform:none;letter-spacing:0}
        .vpod-row{border-bottom:1px solid #f8fafc;transition:background .1s}
        .vpod-row:hover{background:#fafffe}
        .vpod-row td{padding:11px 12px;vertical-align:top}
        .vpod-row td:first-child{padding-left:16px}
        .vpod-row td:last-child{padding-right:16px;text-align:right}
        .vpod-row-idx{font-size:11px;font-weight:700;color:#d1d5db;text-align:center}
        .vpod-desc{font-size:13px;font-weight:500;color:#334155;line-height:1.55;max-width:300px}
        .vpod-subcat{display:inline-block;background:#f1f5f9;color:#475569;font-size:10px;font-weight:600;padding:2px 7px;border-radius:20px;border:1px solid #e2e8f0;white-space:nowrap}
        .vpod-qty-badge{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;background:#f1f5f9;color:#475569;font-size:12px;font-weight:700}
        .vpod-misc-note{color:#d97706;font-style:italic;font-size:11px;border-bottom:1px dashed #fcd34d;cursor:help}
        .vpod-cat-sub td{padding:7px 16px 9px;background:#f8fafc;border-bottom:2px solid #e8ecf2}

        /* ── Edit mode ── */
        .vpod-edit-banner{display:flex;align-items:center;gap:10px;padding:10px 18px;background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1.5px solid #fcd34d;border-radius:12px;margin-bottom:14px;animation:vpod_in .25s ease}
        .vpod-edit-input{padding:6px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;font-family:inherit;color:#1e293b;background:#fff;outline:none;transition:border-color .15s,box-shadow .15s;width:100%}
        .vpod-edit-input:focus{border-color:#0f766e;box-shadow:0 0 0 3px rgba(15,118,110,.1)}
        .vpod-edit-input-sm{width:80px;text-align:right}
        .vpod-edit-input-md{width:110px}
        .vpod-edit-row td{background:#fafffe !important;padding:8px 6px !important}
        .vpod-edit-row:hover td{background:#f0fdf4 !important}
        .vpod-edit-totals{background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1.5px solid #6ee7b7;border-radius:14px;padding:20px 22px}
        .vpod-save-err{display:flex;align-items:flex-start;gap:8px;background:#fef2f2;border:1.5px solid #fca5a5;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:12.5px;color:#dc2626;line-height:1.5}

        /* ── Footer ── */
        .vpod-foot{display:grid;grid-template-columns:1fr 300px;gap:32px;padding:28px 40px;border-top:2px solid #f0f4f8;align-items:start}
        .vpod-sum-title{font-size:10px;font-weight:800;letter-spacing:.12em;color:#94a3b8;text-transform:uppercase;margin-bottom:14px}
        .vpod-sum-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px}
        .vpod-sum-item{display:flex;flex-direction:column;gap:2px}
        .vpod-sum-lbl{font-size:11px;color:#94a3b8;font-weight:500}
        .vpod-sum-val{font-size:13px;font-weight:700;color:#1e293b}
        .vpod-remarks{margin-top:18px}
        .vpod-rem-title{font-size:10px;font-weight:800;letter-spacing:.12em;color:#94a3b8;text-transform:uppercase;margin-bottom:6px}
        .vpod-rem-text{font-size:12px;color:#64748b;line-height:1.65;white-space:pre-wrap}
        .vpod-tbox{background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:14px;padding:20px 22px}
        .vpod-tbox-title{font-size:10px;font-weight:800;letter-spacing:.12em;color:#94a3b8;text-transform:uppercase;margin-bottom:14px}
        .vpod-trow{display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:13px;color:#475569;font-weight:500}
        .vpod-trow--disc{color:#ea580c}
        .vpod-trow--sub{color:#94a3b8;font-size:12px}
        .vpod-tdiv{border:none;border-top:1.5px solid #e2e8f0;margin:11px 0}
        .vpod-grand{display:flex;justify-content:space-between;align-items:baseline;font-size:19px;font-weight:900;color:#0f766e;letter-spacing:-.02em}
        .vpod-words{margin-top:8px;padding-top:8px;border-top:1px dashed #e2e8f0;font-size:10.5px;line-height:1.55;color:#64748b;font-style:italic}
        .vpod-dl-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-top:12px;padding:11px;background:#0f766e;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;transition:background .15s,transform .1s;font-family:inherit}
        .vpod-dl-btn:hover{background:#0d6460}
        .vpod-dl-btn:active{transform:scale(.98)}
        .vpod-dl-btn:disabled{opacity:.6;cursor:not-allowed}

        /* ── Success toast ── */
        .vpod-success-toast{position:fixed;bottom:28px;right:28px;z-index:9999;display:flex;align-items:center;gap:10px;background:#0f766e;color:#fff;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:600;box-shadow:0 8px 24px rgba(15,118,110,.4);animation:vpod_toast_in .3s cubic-bezier(.16,1,.3,1)}

        /* ── Generate Invoice button ── */
        .vpod-btn-invoice{display:flex;align-items:center;gap:6px;padding:7px 15px;border-radius:8px;background:linear-gradient(135deg,#7c3aed,#6d28d9);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;box-shadow:0 2px 8px rgba(109,40,217,.25)}
        .vpod-btn-invoice:hover{background:linear-gradient(135deg,#6d28d9,#5b21b6);box-shadow:0 4px 12px rgba(109,40,217,.35)}
        .vpod-btn-invoice:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}

        /* ── Modal overlay ── */
        .vpod-modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(4px);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px}
        .vpod-modal{background:#fff;border-radius:20px;box-shadow:0 24px 60px rgba(0,0,0,.22);width:100%;max-width:460px;overflow:hidden;animation:vpod_in .22s cubic-bezier(.16,1,.3,1)}
        .vpod-modal-hdr{display:flex;align-items:center;justify-content:space-between;padding:22px 24px 18px;border-bottom:1.5px solid #f0f4f8}
        .vpod-modal-body{padding:22px 24px}
        .vpod-modal-foot{display:flex;gap:10px;padding:0 24px 22px}

        /* ── Doc footer ── */
        .vpod-doc-foot{display:flex;justify-content:space-between;align-items:center;padding:14px 40px;background:#f8fafc;border-top:1.5px solid #e8ecf2;font-size:11px;color:#94a3b8}

        /* ── Print ── */
        @media print{
          .vpod-topbar{display:none}
          .vpod-root{background:#fff;padding:0}
          .vpod-doc{box-shadow:none;border-radius:0;opacity:1!important;transform:none!important}
          .vpod-dl-btn,.vpod-btn-p,.vpod-btn-o,.vpod-btn-edit{display:none}
        }

        /* ── Responsive ── */
        @media(max-width:700px){
          .vpod-hdr{padding:22px 20px 22px;flex-direction:column}
          .vpod-meta{padding:12px 20px}
          .vpod-meta-sep{display:none}
          .vpod-parties{grid-template-columns:1fr;padding:20px;gap:16px}
          .vpod-arrow-col{display:none}
          .vpod-party--proj,.vpod-party--rates{padding-left:0}
          .vpod-party--rates{border-left:none;border-top:1.5px solid #f0f4f8;padding-top:16px}
          .vpod-items{padding:0 20px 24px}
          .vpod-foot{grid-template-columns:1fr;padding:20px}
          .vpod-doc-foot{padding:12px 20px;flex-direction:column;gap:4px;text-align:center}
          .vpod-doc-num{font-size:19px}
          .vpod-grand{font-size:16px}
          .vpod-hdr-r{text-align:left;margin-top:16px}
        }
      `}</style>

      <div className="vpod-root">

        {/* ── Top bar ── */}
        <div className="vpod-topbar">
          <button className="vpod-back" onClick={() => editMode ? cancelEditMode() : navigate('/purchase')}>
            <ArrowLeft size={15} /> {editMode ? 'Cancel Edit' : 'Back to Purchase Orders'}
          </button>
          <div className="vpod-actions">
            {editMode ? (
              <>
                <button className="vpod-btn-cancel" onClick={cancelEditMode} disabled={saving}>
                  <RotateCcw size={14} /> Discard Changes
                </button>
                <button className="vpod-btn-save" onClick={handleSaveUpdate} disabled={saving}>
                  {saving ? <><Loader2 size={14} className="vpod-spin" /> Saving…</> : <><Save size={14} /> Save Changes</>}
                </button>
              </>
            ) : (
              <>
                <button className="vpod-btn-edit" onClick={enterEditMode}>
                  <Edit2 size={14} /> Update Purchase Order
                </button>
                <button className="vpod-btn-o" onClick={() => {}}>
                  <Mail size={14} /> Send to Vendor
                </button>
                <button
                  className="vpod-btn-invoice"
                  onClick={handleInvoiceButtonClick}
                  disabled={invoiceChecking}
                  title="Generate Invoice from this Purchase Order"
                >
                  {invoiceChecking
                    ? <><Loader2 size={14} className="vpod-spin" /> Checking…</>
                    : <><Receipt size={14} /> Generate Invoice</>}
                </button>
                <button className="vpod-btn-p" onClick={handleDownload} disabled={pdfLoading}>
                  {pdfLoading ? <><Loader2 size={14} className="vpod-spin" /> Generating…</> : <><Download size={14} /> Download PDF</>}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Edit mode banner ── */}
        {editMode && (
          <div className="vpod-edit-banner">
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <PenLine size={15} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>Edit Mode Active</div>
              <div style={{ fontSize: 11, color: '#a16207', marginTop: 1 }}>
                Edit any field inline or click "+ Add Item" to add new execution compliance items. Click "Save Changes" when done.
              </div>
            </div>
            {saveError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#dc2626', fontWeight: 500 }}>
                <AlertCircle size={13} /> {saveError}
              </div>
            )}
          </div>
        )}

        {/* ── Document card ── */}
        <div className={`vpod-doc${visible ? ' in' : ''}${editMode ? ' vpod-doc-editing' : ''}`}>

          {/* ══════════ HEADER ══════════ */}
          <div className="vpod-hdr">
            <div className="vpod-hdr-l">
              <div className="vpod-logo">
                <div className="vpod-logo-badge">ERP</div>
                <div>
                  <div className="vpod-co-name">ERP System</div>
                  <div className="vpod-co-sub">Professional Services</div>
                </div>
              </div>
              <StatusPill status={status} />
            </div>
            <div className="vpod-hdr-r">
              <div className="vpod-doc-label">Purchase Order</div>
              <div className="vpod-doc-num">{poNum}</div>
              <div className="vpod-doc-date">Issued {fmtDate(po.created_at)}</div>
            </div>
          </div>

          {/* ══════════ META STRIP ══════════ */}
          <div className="vpod-meta">
            <MetaBlock icon={Calendar} label="Issue Date"   value={fmtDate(po.created_at)} />
            <div className="vpod-meta-sep" />
            <MetaBlock icon={Calendar} label="Last Updated" value={fmtDate(po.updated_at)} />
            <div className="vpod-meta-sep" />
            {editMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Tag size={10} /> SAC Code <span style={{ color: '#f59e0b' }}>✎</span>
                </span>
                <input
                  className="vpod-edit-input vpod-edit-input-md"
                  value={editSacCode}
                  onChange={e => setEditSacCode(e.target.value.slice(0, 6))}
                  placeholder="e.g. 998313"
                  maxLength={6}
                  style={{ width: 100, fontFamily: 'monospace', fontWeight: 700, color: '#0f766e' }}
                />
              </div>
            ) : (
              <MetaBlock icon={Tag} label="SAC Code" value={po.sac_code} accent />
            )}
            <div className="vpod-meta-sep" />
            <MetaBlock icon={Hash} label="PO Number" value={poNum} accent />
            {createdByName && (
              <>
                <div className="vpod-meta-sep" />
                <MetaBlock icon={User} label="Prepared By" value={createdByName} />
              </>
            )}
          </div>

          {/* ══════════ PARTIES ══════════ */}
          <div className="vpod-parties">

            {/* Vendor */}
            <div className="vpod-party">
              <div className="vpod-plabel">Vendor</div>
              <div className="vpod-pavatar">
                {(vendorName && vendorName !== '—' ? vendorName : 'V').charAt(0).toUpperCase()}
              </div>
              <div className="vpod-pname">{vendorName}</div>
              {po.quotation_type && (
                <div className="vpod-pdetail">
                  <Truck size={11} style={{ opacity: .45, flexShrink: 0 }} />
                  {po.quotation_type}
                </div>
              )}
            </div>

            <div className="vpod-arrow-col">
              <ChevronRight size={16} style={{ color: '#cbd5e1' }} />
            </div>

            {/* Project */}
            <div className="vpod-party vpod-party--proj">
              <div className="vpod-plabel">Project</div>
              <div className="vpod-picon"><Building2 size={20} color="#0f766e" /></div>
              <div className="vpod-pname">{projName}</div>
              {projLoc && (
                <div className="vpod-pdetail">
                  <MapPin size={11} style={{ opacity: .45, flexShrink: 0 }} />
                  {projLoc}
                </div>
              )}
              {project?.address && (
                <div className="vpod-pdetail" style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  {project.address}
                </div>
              )}
            </div>

            {/* Applied Rates — editable in edit mode */}
            <div className="vpod-party vpod-party--rates">
              <div className="vpod-plabel">Applied Rates {editMode && <span style={{ color: '#f59e0b', fontWeight: 700 }}>— Editable</span>}</div>
              <div className="vpod-rates-list">
                <div className="vpod-rate-row">
                  <div className="vpod-rate-icon" style={{ background: '#eff6ff' }}>
                    <Percent size={14} color="#2563eb" />
                  </div>
                  <div style={{ flex: 1 }}>
                    {editMode ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="number" min="0" max="100" step="0.01"
                          className="vpod-edit-input vpod-edit-input-sm"
                          value={editGstRate}
                          onChange={e => setEditGstRate(parseFloat(e.target.value) || 0)} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>%</span>
                      </div>
                    ) : (
                      <div className="vpod-rate-v">{gstRate}%</div>
                    )}
                    <div className="vpod-rate-l">GST Rate</div>
                  </div>
                </div>
                <div className="vpod-rate-row">
                  <div className="vpod-rate-icon" style={{ background: (editMode ? editDiscRate : discRate) > 0 ? '#fff7ed' : '#f8fafc' }}>
                    <Tag size={14} color={(editMode ? editDiscRate : discRate) > 0 ? '#ea580c' : '#94a3b8'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    {editMode ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="number" min="0" max="100" step="0.01"
                          className="vpod-edit-input vpod-edit-input-sm"
                          value={editDiscRate}
                          onChange={e => setEditDiscRate(parseFloat(e.target.value) || 0)} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#ea580c' }}>%</span>
                      </div>
                    ) : (
                      <div className="vpod-rate-v" style={{ color: discRate > 0 ? '#ea580c' : '#64748b' }}>
                        {discRate > 0 ? `${discRate}%` : 'Nil'}
                      </div>
                    )}
                    <div className="vpod-rate-l">Discount</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════ LINE ITEMS ══════════ */}
          <div className="vpod-items">
            <div className="vpod-sec-hdr">
              <FileText size={15} color="#0f766e" />
              Services &amp; Compliance Items
              <span className="vpod-sec-badge">
                {editMode ? editItems.length : items.length}{' '}
                {(editMode ? editItems.length : items.length) === 1 ? 'item' : 'items'}
              </span>

              {/* + Add Item button — edit mode only */}
              {editMode && (
                <button
                  onClick={() => setShowAddSection(true)}
                  style={{
                    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', background: 'linear-gradient(135deg,#0f766e,#0d9488)',
                    color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', boxShadow: '0 2px 8px rgba(15,118,110,.25)', transition: 'all .15s',
                  }}
                >
                  <Plus size={14} /> Add Item
                </button>
              )}
            </div>

            {/* ── VIEW MODE TABLE ── */}
            {!editMode && (items.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', gap: 8 }}>
                <FileText size={32} color="#e2e8f0" />
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>No line items found</p>
              </div>
            ) : (
              <div className="vpod-table-wrap">
                <table className="vpod-table">
                  <thead>
                    <tr>
                      <th style={{ width: 32 }}>#</th>
                      <th>Service Description</th>
                      <th style={{ width: 110 }}>Sub-Category</th>
                      <th style={{ width: 44, textAlign: 'center' }}>Qty</th>
                      <th style={{ width: 115, textAlign: 'right' }}>Professional</th>
                      <th style={{ width: 130, textAlign: 'right' }}>Miscellaneous</th>
                      <th style={{ width: 115, textAlign: 'right' }}>Item Total</th>
                    </tr>
                  </thead>
                  {groups.map((grp, gi) => {
                    const grpTotal = grp.items.reduce((s, it) => {
                      const prof = parseFloat(it.Professional_amount || 0);
                      const misc = isMiscNumeric(it.miscellaneous_amount) ? parseFloat(it.miscellaneous_amount) : 0;
                      return s + (prof + misc) * (parseInt(it.quantity) || 1);
                    }, 0);
                    return (
                      <tbody key={gi}>
                        <tr className="vpod-cat-row">
                          <td colSpan={7}>
                            <div className="vpod-cat-inner">
                              <span className="vpod-cat-dot" />
                              {grp.catName}
                              <span className="vpod-cat-cnt">{grp.items.length} item{grp.items.length !== 1 ? 's' : ''}</span>
                            </div>
                          </td>
                        </tr>
                        {grp.items.map((item, ii) => {
                          const prof    = parseFloat(item.Professional_amount || 0);
                          const miscRaw = item.miscellaneous_amount;
                          const miscNum = isMiscNumeric(miscRaw) ? parseFloat(miscRaw) : 0;
                          const qty     = parseInt(item.quantity) || 1;
                          const total   = (prof + miscNum) * qty;
                          const subCat  = SUB_COMPLIANCE_CATEGORIES[item.sub_compliance_category] || null;
                          const miscStr = miscRaw && String(miscRaw).trim() && String(miscRaw).trim() !== '--'
                            ? String(miscRaw).trim() : null;
                          return (
                            <tr key={ii} className="vpod-row">
                              <td className="vpod-row-idx">{ii + 1}</td>
                              <td><div className="vpod-desc">{item.description || item.compliance_name || '—'}</div></td>
                              <td>
                                {subCat
                                  ? <span className="vpod-subcat">{subCat.name}</span>
                                  : <span style={{ color: '#e2e8f0', fontSize: 12 }}>—</span>}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span className="vpod-qty-badge">{qty}</span>
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                                ₹&nbsp;{fmtINR(prof)}
                              </td>
                              <td style={{ textAlign: 'right', fontSize: 12 }}>
                                {miscStr
                                  ? isMiscNumeric(miscStr)
                                    ? <span style={{ color: '#475569', fontWeight: 600 }}>₹&nbsp;{fmtINR(parseFloat(miscStr))}</span>
                                    : <span className="vpod-misc-note" title="Note — not in total">{miscStr}</span>
                                  : <span style={{ color: '#e2e8f0' }}>—</span>}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 800, color: '#1e293b', fontSize: 13 }}>
                                ₹&nbsp;{fmtINR(total)}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="vpod-cat-sub">
                          <td colSpan={6} style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', fontStyle: 'italic', paddingRight: 14 }}>
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
            ))}

            {/* ── EDIT MODE TABLE ── */}
            {editMode && (
              <div className="vpod-table-wrap">
                {editItems.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 8 }}>
                    <FileText size={28} color="#e2e8f0" />
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>No items. Click "+ Add Item" above to get started.</p>
                  </div>
                ) : (() => {
                  // Group edit items by category
                  const editGroups = {};
                  editItems.forEach((it, globalIdx) => {
                    const catId = it.compliance_category ?? 3;
                    const key   = String(catId);
                    if (!editGroups[key]) editGroups[key] = { catId, catName: COMPLIANCE_CATEGORIES[catId] || `Category ${catId}`, rows: [] };
                    editGroups[key].rows.push({ it, globalIdx });
                  });

                  return (
                    <table className="vpod-table" style={{ tableLayout: 'fixed' }}>
                      <thead>
                        <tr>
                          <th style={{ width: 32 }}>#</th>
                          <th style={{ width: 'auto' }}>Description <span style={{ color: '#f59e0b', fontWeight: 400, fontStyle: 'italic', fontSize: 10 }}>(editable)</span></th>
                          <th style={{ width: 58, textAlign: 'center' }}>Qty</th>
                          <th style={{ width: 130, textAlign: 'right' }}>Professional (₹)</th>
                          <th style={{ width: 130, textAlign: 'right' }}>Misc (₹ or note)</th>
                          <th style={{ width: 110, textAlign: 'right' }}>Item Total</th>
                          <th style={{ width: 40 }}></th>
                        </tr>
                      </thead>
                      {Object.values(editGroups).map((grp, gi) => {
                        const grpEditTotal = grp.rows.reduce((s, { it }) => s + calcItemTotal(it), 0);
                        return (
                          <tbody key={gi}>
                            <tr className="vpod-cat-row">
                              <td colSpan={7}>
                                <div className="vpod-cat-inner">
                                  <span className="vpod-cat-dot" />
                                  {grp.catName}
                                  <span className="vpod-cat-cnt">{grp.rows.length} item{grp.rows.length !== 1 ? 's' : ''}</span>
                                </div>
                              </td>
                            </tr>
                            {grp.rows.map(({ it, globalIdx }) => {
                              const itemTotal = calcItemTotal(it);
                              return (
                                <tr key={globalIdx} className="vpod-edit-row">
                                  <td style={{ textAlign: 'center', fontSize: 11, color: '#d1d5db', fontWeight: 700 }}>{globalIdx + 1}</td>
                                  <td>
                                    <textarea
                                      className="vpod-edit-input"
                                      value={it.description}
                                      onChange={e => updateItem(globalIdx, 'description', e.target.value)}
                                      rows={2}
                                      style={{ resize: 'vertical', minHeight: 42, fontSize: 12 }}
                                      placeholder="Service description…"
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="number" min="1"
                                      className="vpod-edit-input"
                                      value={it.quantity}
                                      onChange={e => updateItem(globalIdx, 'quantity', parseInt(e.target.value) || 1)}
                                      style={{ textAlign: 'center', width: '100%' }}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="number" min="0" step="0.01"
                                      className="vpod-edit-input"
                                      value={it.Professional_amount === 0 ? '' : it.Professional_amount}
                                      onChange={e => updateItem(globalIdx, 'Professional_amount', parseFloat(e.target.value) || 0)}
                                      placeholder="0.00"
                                      style={{ textAlign: 'right', width: '100%' }}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="vpod-edit-input"
                                      value={it.miscellaneous_amount}
                                      onChange={e => updateItem(globalIdx, 'miscellaneous_amount', e.target.value)}
                                      placeholder="Amount or note"
                                      style={{ textAlign: 'right', width: '100%', borderColor: it.miscellaneous_amount && !isMiscNumeric(it.miscellaneous_amount) ? '#fbbf24' : undefined }}
                                    />
                                    {it.miscellaneous_amount && !isMiscNumeric(it.miscellaneous_amount) && (
                                      <div style={{ fontSize: 10, color: '#d97706', marginTop: 2 }}>Note only — not calculated</div>
                                    )}
                                  </td>
                                  <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f766e', fontSize: 13 }}>
                                    ₹&nbsp;{fmtINR(itemTotal)}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <button
                                      onClick={() => removeItem(globalIdx)}
                                      style={{ width: 28, height: 28, border: 'none', background: '#fef2f2', borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}
                                      title="Remove item"
                                    ><Trash2 size={13} /></button>
                                  </td>
                                </tr>
                              );
                            })}
                            <tr className="vpod-cat-sub">
                              <td colSpan={5} style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', fontStyle: 'italic', paddingRight: 14 }}>{grp.catName} subtotal</td>
                              <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 13, color: '#0f766e', paddingRight: 4 }}>₹&nbsp;{fmtINR(grpEditTotal)}</td>
                              <td />
                            </tr>
                          </tbody>
                        );
                      })}
                    </table>
                  );
                })()}
              </div>
            )}
          </div>

          {/* ══════════ FOOTER: SUMMARY + TOTALS ══════════ */}
          <div className="vpod-foot">

            {/* Left — summary */}
            <div>
              <div className="vpod-sum-title">Purchase Order Summary</div>
              <div className="vpod-sum-grid">
                <div className="vpod-sum-item">
                  <span className="vpod-sum-lbl">Total Items</span>
                  <span className="vpod-sum-val">{items.length}</span>
                </div>
                <div className="vpod-sum-item">
                  <span className="vpod-sum-lbl">Total Quantity</span>
                  <span className="vpod-sum-val">{totalQty}</span>
                </div>
                <div className="vpod-sum-item">
                  <span className="vpod-sum-lbl">Compliance Groups</span>
                  <span className="vpod-sum-val">{groups.length}</span>
                </div>
                <div className="vpod-sum-item">
                  <span className="vpod-sum-lbl">SAC Code</span>
                  <span className="vpod-sum-val" style={{ color: '#0f766e', fontFamily: 'monospace' }}>
                    {po.sac_code || '—'}
                  </span>
                </div>
                <div className="vpod-sum-item">
                  <span className="vpod-sum-lbl">Status</span>
                  <span><StatusPill status={status} /></span>
                </div>
                {createdByName && (
                  <div className="vpod-sum-item">
                    <span className="vpod-sum-lbl">Prepared By</span>
                    <span className="vpod-sum-val">{createdByName}</span>
                  </div>
                )}
              </div>
              {po.notes && (
                <div className="vpod-remarks">
                  <div className="vpod-rem-title">Notes</div>
                  <p className="vpod-rem-text">{po.notes}</p>
                </div>
              )}
              {po.terms && (
                <div className="vpod-remarks">
                  <div className="vpod-rem-title">Terms &amp; Conditions</div>
                  <p className="vpod-rem-text">{po.terms}</p>
                </div>
              )}
            </div>

            {/* Right — totals */}
            <div>
              {editMode ? (
                (() => {
                  const eSub   = calcEditSubtotal();
                  const eDisc  = calcEditDiscAmt(eSub);
                  const eTax   = parseFloat((eSub - eDisc).toFixed(2));
                  const eGst   = calcEditGstAmt(eSub, eDisc);
                  const eGrand = calcEditGrandTotal();
                  return (
                    <div className="vpod-edit-totals">
                      <div className="vpod-tbox-title" style={{ color: '#065f46' }}>
                        Live Calculation
                        <span style={{ marginLeft: 6, fontSize: 9, background: '#059669', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>EDIT MODE</span>
                      </div>
                      <div className="vpod-trow"><span>Subtotal</span><span style={{ fontWeight: 700, color: '#1e293b' }}>₹&nbsp;{fmtINR(eSub)}</span></div>
                      {eDisc > 0 && (
                        <>
                          <div className="vpod-trow vpod-trow--disc"><span>Discount ({editDiscRate}%)</span><span style={{ fontWeight: 700 }}>−&nbsp;₹&nbsp;{fmtINR(eDisc)}</span></div>
                          <div className="vpod-trow vpod-trow--sub"><span>Taxable Amount</span><span>₹&nbsp;{fmtINR(eTax)}</span></div>
                        </>
                      )}
                      {eGst > 0 && <div className="vpod-trow"><span>GST ({editGstRate}%)</span><span style={{ fontWeight: 700, color: '#1e293b' }}>+&nbsp;₹&nbsp;{fmtINR(eGst)}</span></div>}
                      <hr className="vpod-tdiv" />
                      <div className="vpod-grand" style={{ fontSize: 21 }}>
                        <span>Grand Total</span>
                        <span style={{ color: '#059669' }}>₹&nbsp;{fmtINR(eGrand)}</span>
                      </div>
                      <div className="vpod-words"><strong style={{ color: '#94a3b8', fontStyle: 'normal' }}>In words: </strong>{numberToWords(eGrand)} Rupees only</div>
                      <button className="vpod-btn-save" onClick={handleSaveUpdate} disabled={saving}
                        style={{ width: '100%', marginTop: 14, padding: 11, justifyContent: 'center', borderRadius: 10 }}>
                        {saving ? <><Loader2 size={15} className="vpod-spin" /> Saving…</> : <><Save size={15} /> Save Changes</>}
                      </button>
                      {saveError && (
                        <div className="vpod-save-err" style={{ marginTop: 8 }}>
                          <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} /> {saveError}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="vpod-tbox">
                  <div className="vpod-tbox-title">Amount Payable</div>
                  <div className="vpod-trow">
                    <span>Subtotal</span>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>₹&nbsp;{fmtINR(subtotal)}</span>
                  </div>
                  {discAmt > 0 && (
                    <>
                      <div className="vpod-trow vpod-trow--disc">
                        <span>Discount ({discRate}%)</span>
                        <span style={{ fontWeight: 700 }}>−&nbsp;₹&nbsp;{fmtINR(discAmt)}</span>
                      </div>
                      <div className="vpod-trow vpod-trow--sub">
                        <span>Taxable Amount</span>
                        <span>₹&nbsp;{fmtINR(taxable)}</span>
                      </div>
                    </>
                  )}
                  {gstAmt > 0 && (
                    <div className="vpod-trow">
                      <span>GST ({gstRate}%)</span>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>+&nbsp;₹&nbsp;{fmtINR(gstAmt)}</span>
                    </div>
                  )}
                  <hr className="vpod-tdiv" />
                  <div className="vpod-grand">
                    <span>Grand Total</span>
                    <span>₹&nbsp;{fmtINR(grandTotal)}</span>
                  </div>
                  <div className="vpod-words">
                    <strong style={{ color: '#94a3b8', fontStyle: 'normal' }}>In words: </strong>
                    {numberToWords(grandTotal)} Rupees only
                  </div>
                </div>
              )}
              {!editMode && (
                <button className="vpod-dl-btn" onClick={handleDownload} disabled={pdfLoading}>
                  {pdfLoading
                    ? <><Loader2 size={15} className="vpod-spin" /> Generating PDF…</>
                    : <><Download size={15} /> Download PDF</>}
                </button>
              )}
            </div>
          </div>

          {/* ══════════ DOC FOOTER ══════════ */}
          <div className="vpod-doc-foot">
            <span>This is a system-generated purchase order. Prices are valid for 30 days from the issue date.</span>
            <span>{poNum}&nbsp;·&nbsp;{fmtDate(po.created_at)}</span>
          </div>

        </div>{/* end .vpod-doc */}
      </div>{/* end .vpod-root */}

      {/* ══════════ ADD COMPLIANCE MODAL — execution only ══════════ */}
      <AddComplianceModal
        isOpen={showAddSection}
        onClose={() => setShowAddSection(false)}
        onSave={handleComplianceSave}
        existingItems={editItems}
        fetchDescriptions={fetchDescriptionsForModal}
      />

      {/* ── Save Success toast ── */}
      {saveSuccess && (
        <div className="vpod-success-toast">
          <CheckCircle size={17} />
          Purchase order updated successfully!
        </div>
      )}

      {/* ═══════════ GENERATE INVOICE MODAL ══════════ */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-[10000]" style={{ position: 'fixed', overflow: 'hidden', animation: 'vpod_toast_in .2s ease' }}>
          <div className="absolute inset-0 bg-black/50" style={{ position: 'fixed', width: '100vw', height: '100vh' }}
            onClick={() => { if (!invoiceGenerating) { setShowInvoiceModal(false); setInvoiceSuccess(null); } }} />
          <div className="relative z-10 flex items-center justify-center p-4" style={{ height: '100vh' }}>
            <div className="relative bg-white" style={{ borderRadius: 24, width: '100%', maxWidth: 420, boxShadow: '0 40px 100px rgba(0,0,0,.24)', overflow: 'hidden', animation: 'vpod_toast_in .32s cubic-bezier(.16,1,.3,1)' }}
              onClick={e => e.stopPropagation()}>

              {/* Top accent bar */}
              <div style={{ height: 5, background: 'linear-gradient(90deg,#7c3aed,#6d28d9,#8b5cf6)' }} />

              {/* ── SUCCESS STATE ── */}
              {invoiceSuccess ? (
                <div style={{ padding: '36px 32px 28px', textAlign: 'center' }}>
                  <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid #c4b5fd', animation: 'vpod_pulse_ring 1.8s ease-out infinite' }} />
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#ede9fe,#ddd6fe)', border: '2px solid #c4b5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(124,58,237,.2)' }}>
                      <CheckCircle size={38} color="#7c3aed" />
                    </div>
                  </div>
                  <div style={{ fontSize: 21, fontWeight: 800, color: '#1e293b', letterSpacing: '-.02em', marginBottom: 8 }}>Invoice Generated!</div>
                  <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, marginBottom: 6 }}>
                    Your invoice has been successfully created and is ready to review.
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#faf5ff', border: '1.5px solid #ddd6fe', borderRadius: 20, padding: '6px 16px', margin: '6px 0 8px', fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>
                    <Receipt size={13} /> {fmtInvNum(invoiceSuccess.invoice_number)}
                  </div>
                  {parseFloat(advanceAmount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, margin: '8px 0 16px', fontSize: 12, color: '#64748b' }}>
                      <span>Grand Total: <strong style={{ color: '#1e293b' }}>Rs. {fmtINR(invoiceSuccess.grand_total)}</strong></span>
                      <span>Advance Paid: <strong style={{ color: '#059669' }}>Rs. {fmtINR(advanceAmount)}</strong></span>
                      <span>Outstanding: <strong style={{ color: '#dc2626' }}>Rs. {fmtINR(invoiceSuccess.total_outstanding)}</strong></span>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
                    <button
                      onClick={() => { setShowInvoiceModal(false); setInvoiceSuccess(null); navigate(`/invoices/${invoiceSuccess.id}`); }}
                      style={{ width: '100%', padding: '13px 20px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}
                    >
                      <Receipt size={15} /> View Invoice
                    </button>
                    <button
                      onClick={() => { setShowInvoiceModal(false); setInvoiceSuccess(null); navigate('/invoices'); }}
                      style={{ width: '100%', padding: '12px 20px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Go to Invoice List
                    </button>
                    <button
                      onClick={() => { setShowInvoiceModal(false); setInvoiceSuccess(null); }}
                      style={{ width: '100%', padding: '10px 20px', background: 'none', border: 'none', borderRadius: 12, color: '#94a3b8', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Stay on this Purchase Order
                    </button>
                  </div>
                </div>
              ) : (
                /* ── INPUT STATE ── */
                <div style={{ padding: '28px 28px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Receipt size={20} color="#fff" />
                      </div>
                      <div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: '#1e293b' }}>Generate Invoice</div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{poNum}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => { if (!invoiceGenerating) setShowInvoiceModal(false); }}
                      style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: '#f1f5f9', cursor: invoiceGenerating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', opacity: invoiceGenerating ? 0.4 : 1 }}
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* Purchase Order summary chip */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
                    <CheckCircle size={15} color="#059669" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#065f46' }}>Purchase Order</div>
                      <div style={{ fontSize: 11, color: '#047857', marginTop: 1 }}>
                        {poNum} · Vendor: <strong>{po.vendor_name || '—'}</strong> · Grand Total: <strong>Rs. {fmtINR(grandTotal)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Advance amount input */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                      Advance Amount (Rs.) <span style={{ color: '#94a3b8', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— optional</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00 — leave blank if no advance"
                      value={advanceAmount}
                      onChange={e => { setAdvanceAmount(e.target.value); setInvoiceError(''); }}
                      disabled={invoiceGenerating}
                      style={{ width: '100%', padding: '10px 14px', border: `1.5px solid ${invoiceError ? '#fca5a5' : '#e2e8f0'}`, borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#1e293b', background: '#fff', outline: 'none', transition: 'border-color .15s', boxSizing: 'border-box' }}
                      onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,.1)'; }}
                      onBlur={e => { e.target.style.borderColor = invoiceError ? '#fca5a5' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                    />
                    <p style={{ margin: '6px 0 0', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
                      If provided, the advance will be deducted from the grand total and shown as the outstanding balance.
                    </p>
                  </div>

                  {/* Live preview when advance is entered */}
                  {advanceAmount && !isNaN(parseFloat(advanceAmount)) && parseFloat(advanceAmount) > 0 && (
                    <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Payment Preview</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#475569' }}>
                          <span>Grand Total</span>
                          <span style={{ fontWeight: 700, color: '#1e293b' }}>Rs. {fmtINR(grandTotal)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#059669' }}>
                          <span>Advance Paid</span>
                          <span style={{ fontWeight: 700 }}>− Rs. {fmtINR(parseFloat(advanceAmount))}</span>
                        </div>
                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 2, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: '#dc2626' }}>
                          <span>Outstanding Balance</span>
                          <span>Rs. {fmtINR(Math.max(0, grandTotal - parseFloat(advanceAmount)))}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error message */}
                  {invoiceError && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12.5, color: '#dc2626', lineHeight: 1.5 }}>
                      <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>{typeof invoiceError === 'string' ? invoiceError : JSON.stringify(invoiceError)}</span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => { if (!invoiceGenerating) setShowInvoiceModal(false); }}
                      disabled={invoiceGenerating}
                      style={{ flex: 1, padding: '11px 16px', border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: invoiceGenerating ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: invoiceGenerating ? 0.5 : 1 }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleGenerateInvoice}
                      disabled={invoiceGenerating}
                      style={{ flex: 2, padding: '11px 16px', border: 'none', borderRadius: 10, background: invoiceGenerating ? '#a78bfa' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: invoiceGenerating ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .15s' }}
                    >
                      {invoiceGenerating
                        ? <><Loader2 size={14} className="vpod-spin" /> Generating…</>
                        : <><Receipt size={14} /> Generate Invoice</>}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ═══════════ INVOICE ALREADY EXISTS TOAST ══════════ */}
      {invoiceModal.open && invoiceModal.alreadyExists && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
          background: '#fff', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,.14), 0 0 0 1px rgba(0,0,0,.06)',
          display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
          maxWidth: 380, width: '100%',
          animation: 'vpod_toast_in .3s cubic-bezier(.16,1,.3,1)',
          borderLeft: '4px solid #7c3aed',
          fontFamily: "'Outfit', sans-serif",
        }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: '#faf5ff', border: '1.5px solid #ddd6fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Receipt size={16} color="#7c3aed" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>Invoice Already Exists</div>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 10 }}>
              An invoice has already been generated for this purchase order.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {invoiceModal.invoiceId && (
                <button
                  onClick={() => { dismissInvoiceModal(); navigate(`/invoices/${invoiceModal.invoiceId}`); }}
                  style={{ padding: '5px 12px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', border: 'none', borderRadius: 7, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <Receipt size={11} /> {invoiceModal.invoiceNum ? `View ${invoiceModal.invoiceNum}` : 'View Invoice'}
                </button>
              )}
              <button
                onClick={() => { dismissInvoiceModal(); navigate('/invoices'); }}
                style={{ padding: '5px 12px', background: '#7c3aed', border: 'none', borderRadius: 7, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Receipt size={11} /> View Invoice List
              </button>
              <button
                onClick={dismissInvoiceModal}
                style={{ padding: '5px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 7, color: '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Dismiss
              </button>
            </div>
          </div>
          <button
            onClick={dismissInvoiceModal}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, flexShrink: 0, lineHeight: 1 }}
          >
            <X size={14} />
          </button>
        </div>
      )}

    </>
  );
}