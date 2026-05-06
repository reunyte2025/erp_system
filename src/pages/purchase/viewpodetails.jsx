/**
 * viewpodetails.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Purchase Order Details page — pixel-perfect mirror of viewquotationdetails,
 * viewproformadetails, and viewinvoicedetails.
 *
 * Split into 3 files:
 *   • purchaseHelpers.js    — pure helpers / constants (no React)
 *   • PurchaseTypeTable.jsx — view-mode items table component
 *   • viewpodetails.jsx     — this file (main page, edit mode, modals)
 *
 * Key differences from other detail pages:
 *   • Always Execution Compliance (POs are never Regulatory)
 *   • "Bill To" shows Vendor, not Client
 *   • Company field is editable in edit mode (same pattern as quotation)
 *   • Uses /quotations/update_execution_quotation/ for updates
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Loader2, AlertCircle,
  X, CheckCircle, Clock, FileText, XCircle,
  Building2, User, MapPin, Hash, Calendar,
  Tag, Percent, ChevronRight, Mail, Truck,
  Edit2, Save, RotateCcw, Plus, Trash2, PenLine,
  ChevronDown, Receipt,
} from 'lucide-react';
import {
  getPurchaseOrderById,
  updatePurchaseOrder,
  getUserById,
  getAllInvoices,
  generatePurchaseOrderPdf,
} from '../../services/purchase';
import { getComplianceByCategory } from '../../services/proforma';
import { getProjects } from '../../services/projects';
import { createPurchaseOrderInvoice } from '../../services/invoices';
import { getVendorById, getVendors } from '../../services/vendors';
import { QUOTATION_COMPANIES } from '../../services/quotation';
import AddComplianceModal from '../../components/AddComplianceModal/AddcomplianceModal';
import Notes from '../../components/Notes';
import { NOTE_ENTITY } from '../../services/notes';
import PurchaseTypeTable from './PurchaseTypeTable';
import SendEmailModal from '../../components/SendEmailModal/SendEmailModal';
import {
  fmtPONum,
  fmtINR,
  fmtDate,
  getStatus,
  groupItemsByCategory,
  calcItemTotal,
  numberToWords,
  PO_COMPANIES,
  getPOCompanyName,
  GST_APPLICABLE_COMPANY_ID,
  STATUS_CONFIG,
} from '../../services/purchaseHelpers';

// ─── STATUS_CONFIG with Lucide Icons (this file only — helpers stay zero-React) ─

const STATUS_CONFIG_UI = {
  '1':          { ...STATUS_CONFIG['1'],          Icon: FileText    },
  '2':          { ...STATUS_CONFIG['2'],          Icon: CheckCircle },
  '3':          { ...STATUS_CONFIG['3'],          Icon: CheckCircle },
  '4':          { ...STATUS_CONFIG['4'],          Icon: XCircle     },
  '5':          { ...STATUS_CONFIG['5'],          Icon: XCircle     },
  '6':          { ...STATUS_CONFIG['6'],          Icon: Clock       },
  '7':          { ...STATUS_CONFIG['7'],          Icon: Clock       },
  'draft':      { ...STATUS_CONFIG['draft'],      Icon: FileText    },
  'pending':    { ...STATUS_CONFIG['pending'],    Icon: Clock       },
  'sent':       { ...STATUS_CONFIG['sent'],       Icon: CheckCircle },
  'accepted':   { ...STATUS_CONFIG['accepted'],   Icon: CheckCircle },
  'rejected':   { ...STATUS_CONFIG['rejected'],   Icon: XCircle     },
  'expired':    { ...STATUS_CONFIG['expired'],    Icon: XCircle     },
  'processing': { ...STATUS_CONFIG['processing'], Icon: Clock       },
};

const getStatusUI = (s) => {
  const key = String(s || '');
  const lower = key.toLowerCase();
  return STATUS_CONFIG_UI[key] || STATUS_CONFIG_UI[lower] || STATUS_CONFIG_UI['1'];
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const StatusPill = ({ status }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    color: status.color, background: status.bg,
    border: `1px solid ${status.border}`,
    fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 20,
  }}>
    <status.Icon size={11} /> {status.label}
  </span>
);

const MetaBlock = ({ icon: Icon, label, value, accent }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
    <span style={{
      fontSize: 10, fontWeight: 700, color: '#94a3b8',
      textTransform: 'uppercase', letterSpacing: '0.08em',
      display: 'flex', alignItems: 'center', gap: 4,
    }}>
      {Icon && <Icon size={10} />} {label}
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
  const [vendor,        setVendor]        = useState(null);
  const [project,       setProject]       = useState(null);
  const [createdByName, setCreatedByName] = useState('');
  const [loading,       setLoading]       = useState(true);
  const [fetchError,    setFetchError]    = useState('');
  const [pdfLoading,    setPdfLoading]    = useState(false);
  const [pdfError,      setPdfError]      = useState('');
  const [visible,       setVisible]       = useState(false);
  const [sendModal,     setSendModal]     = useState(false);

  // ── PDF Modal state (mirrors viewquotationdetails exactly) ───────────────────
  const [showPdfModal,     setShowPdfModal]     = useState(false);
  const [pdfCompanyName,   setPdfCompanyName]   = useState('');
  const [pdfAddress,       setPdfAddress]       = useState('');
  const [pdfContactPerson, setPdfContactPerson] = useState('');
  const [pdfSubject,       setPdfSubject]       = useState('');
  const [pdfExtraNotes,    setPdfExtraNotes]    = useState(['']);
  const [pdfFormError,     setPdfFormError]     = useState('');
  const [pdfApiError,      setPdfApiError]      = useState('');

  // ── Edit mode state ───────────────────────────────────────────────────────────
  const [editMode,    setEditMode]    = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [editSacCode,  setEditSacCode]  = useState('');
  const [editGstRate,  setEditGstRate]  = useState(0);
  const [editDiscRate, setEditDiscRate] = useState(0);
  const [editItems,    setEditItems]    = useState([]);

  // ── Company edit — same pattern as viewquotationdetails ──────────────────────
  const [editCompany,     setEditCompany]     = useState(1);
  const [companyDropOpen, setCompanyDropOpen] = useState(false);
  const [dropdownPos,     setDropdownPos]     = useState({ top: 0, left: 0 });
  const companyDropRef = useRef(null);
  const companyBtnRef  = useRef(null);

  const openCompanyDrop = () => {
    if (companyBtnRef.current) {
      const rect = companyBtnRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 8, left: rect.left });
    }
    setCompanyDropOpen(o => !o);
  };

  useEffect(() => {
    if (!companyDropOpen) return;
    const handler = (e) => {
      if (
        companyDropRef.current && !companyDropRef.current.contains(e.target) &&
        companyBtnRef.current  && !companyBtnRef.current.contains(e.target)
      ) {
        setCompanyDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [companyDropOpen]);

  // ── AddComplianceModal — execution categories only ────────────────────────────
  const [showAddSection, setShowAddSection] = useState(false);

  // ── Generate Invoice modal state ──────────────────────────────────────────────
  const [showInvoiceModal,  setShowInvoiceModal]  = useState(false);
  const [advanceAmount,     setAdvanceAmount]     = useState('');
  const [invoiceGenerating, setInvoiceGenerating] = useState(false);
  const [invoiceChecking,   setInvoiceChecking]   = useState(false);
  const [invoiceError,      setInvoiceError]      = useState('');
  const [invoiceSuccess,    setInvoiceSuccess]    = useState(null);
  const [invoiceModal,      setInvoiceModal]      = useState({
    open: false, invoiceId: null, invoiceNum: '', alreadyExists: false, genericError: '',
  });

  useEffect(() => {
    onUpdateNavigation?.({ breadcrumbs: ['Purchase Orders', 'Purchase Order Details'] });
    return () => onUpdateNavigation?.(null);
  }, [onUpdateNavigation]);

  // ─── Data fetch ───────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!id) { setFetchError('No Purchase Order ID provided'); setLoading(false); return; }
    setLoading(true); setFetchError('');
    try {
      const res    = await getPurchaseOrderById(id);
      const poData = res.data;
      setPo(poData);

      // Resolve vendor name if missing
      if (!poData.vendor_name && poData.vendor) {
        try {
          const vendorRes  = await getVendorById(poData.vendor);
          const vendorData = vendorRes?.data || vendorRes;
          const vendorName = vendorData?.name || vendorData?.vendor_name || '';
          if (vendorName) { poData.vendor_name = vendorName; setPo({ ...poData }); }
          // Store full vendor data for email
          if (vendorData) setVendor(vendorData);
        } catch {
          try {
            const listRes    = await getVendors({ page: 1, page_size: 500 });
            const allVendors = listRes?.data?.results || listRes?.results || [];
            const found      = allVendors.find(v => String(v.id) === String(poData.vendor));
            if (found?.name) { poData.vendor_name = found.name; setPo({ ...poData }); }
            if (found) setVendor(found);
          } catch { /* non-critical */ }
        }
      } else if (poData.vendor) {
        // vendor_name already present — still fetch full vendor data for email
        try {
          const vendorRes  = await getVendorById(poData.vendor);
          const vendorData = vendorRes?.data || vendorRes;
          if (vendorData) setVendor(vendorData);
        } catch { /* non-critical */ }
      }

      // Resolve project details
      if (poData.project) {
        try {
          const pr  = await getProjects({ page: 1, page_size: 500 });
          const all = pr?.data?.results || pr?.results || [];
          const found = all.find(p => String(p.id) === String(poData.project));
          if (found) setProject(found);
        } catch { /* optional */ }
      }

      // Resolve creator name
      if (poData.created_by) {
        try {
          const user = await getUserById(poData.created_by);
          if (user) {
            setCreatedByName(`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || '');
          }
        } catch { /* optional */ }
      }

      setTimeout(() => setVisible(true), 60);
    } catch (e) {
      setFetchError(e.message || 'Failed to load purchase order details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); window.scrollTo(0, 0); }, [fetchData]);

  // ─── Compliance modal fetch ───────────────────────────────────────────────────
  const fetchDescriptionsForModal = async (categoryId, subCategoryId) => {
    const res = await getComplianceByCategory(categoryId, subCategoryId || null);
    if (res?.status === 'success' && res?.data?.results) return res.data.results;
    return [];
  };

  // ─── Edit mode lifecycle ──────────────────────────────────────────────────────
  const enterEditMode = () => {
    if (!po) return;
    setEditSacCode(po.sac_code || '');
    setEditGstRate(parseFloat(po.gst_rate || 0));
    setEditDiscRate(parseFloat(po.discount_rate || 0));
    setEditCompany(parseInt(po.company) || 1);
    setEditItems((po.items || []).map(it => ({
      id:                      it.id,
      description:             it.description || it.compliance_name || '',
      quantity:                parseInt(it.quantity) || 1,
      unit:                    (it.unit && it.unit !== 'N/A') ? it.unit : null,
      sac_code:                it.sac_code || '',
      Professional_amount:     parseFloat(it.Professional_amount || 0),
      material_rate:           parseFloat(it.material_rate || 0),
      material_amount:         parseFloat(it.material_amount || 0),
      labour_rate:             parseFloat(it.labour_rate || 0),
      labour_amount:           parseFloat(it.labour_amount || 0),
      compliance_category:     it.compliance_category ?? 5,
      sub_compliance_category: it.sub_compliance_category ?? 0,
      total_amount:            parseFloat(it.total_amount || 0),
    })));
    setSaveError(''); setSaveSuccess(false);
    setEditMode(true);
  };

  const cancelEditMode = () => { setEditMode(false); setSaveError(''); setCompanyDropOpen(false); };

  // ── Edit totals live calculation ──────────────────────────────────────────────
  // GST only applies for company ID 1 (same rule as quotation/proforma pages)
  const isGSTApplicable = editMode
    ? parseInt(editCompany) === GST_APPLICABLE_COMPANY_ID
    : parseInt(po?.company) === GST_APPLICABLE_COMPANY_ID;

  const calcEditSubtotal   = () => parseFloat(editItems.reduce((s, it) => s + calcItemTotal(it), 0).toFixed(2));
  const calcEditDiscAmt    = (sub) => parseFloat(((sub * (editDiscRate || 0)) / 100).toFixed(2));
  const calcEditGstAmt     = (sub, disc) => {
    if (!isGSTApplicable) return 0;
    return parseFloat((((sub - disc) * (editGstRate || 0)) / 100).toFixed(2));
  };
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
      const qty = parseInt(updated.quantity) || 1;

      // Auto-recalculate paired fields (same logic as quotation + proforma pages)
      if (field === 'material_rate') {
        updated.material_amount = parseFloat(((parseFloat(value) || 0) * qty).toFixed(2));
      } else if (field === 'material_amount') {
        updated.material_rate = parseFloat((qty > 0 ? (parseFloat(value) || 0) / qty : 0).toFixed(6));
      } else if (field === 'labour_rate') {
        updated.labour_amount = parseFloat(((parseFloat(value) || 0) * qty).toFixed(2));
      } else if (field === 'labour_amount') {
        updated.labour_rate = parseFloat((qty > 0 ? (parseFloat(value) || 0) / qty : 0).toFixed(6));
      } else if (field === 'quantity') {
        const newQty  = parseInt(value) || 1;
        const matRate = parseFloat(updated.material_rate) || 0;
        const labRate = parseFloat(updated.labour_rate) || 0;
        if (matRate > 0) updated.material_amount = parseFloat((matRate * newQty).toFixed(2));
        if (labRate > 0) updated.labour_amount   = parseFloat((labRate * newQty).toFixed(2));
      }

      updated.total_amount = calcItemTotal(updated);
      return updated;
    }));
  };

  const removeItem = (idx) => setEditItems(prev => prev.filter((_, i) => i !== idx));

  const handleComplianceSave = (newFlatItems) => {
    const normalized = newFlatItems.map(item => {
      const compCat = parseInt(item.compliance_category);
      if (!compCat) {
        console.error('[PO handleComplianceSave] Item has no compliance_category — skipping:', item);
        return null;
      }
      return {
        id:                      null,
        compliance_category:     compCat,
        sub_compliance_category: parseInt(item.sub_compliance_category) || 0,
        description:             String(item.description || '').trim(),
        quantity:                parseInt(item.quantity) || 1,
        unit:                    String(item.unit || '').trim() || null,
        sac_code:                String(item.sac_code || '').trim() || null,
        Professional_amount:     parseFloat(item.Professional_amount) || 0,
        material_rate:           parseFloat(item.material_rate)   || 0,
        material_amount:         parseFloat(item.material_amount) || 0,
        labour_rate:             parseFloat(item.labour_rate)     || 0,
        labour_amount:           parseFloat(item.labour_amount)   || 0,
        total_amount:            parseFloat(item.total_amount)    || 0,
      };
    }).filter(Boolean);

    if (normalized.length === 0) return;
    setEditItems(prev => [...prev, ...normalized]);
    setShowAddSection(false);
  };

  // ─── Save / Update ────────────────────────────────────────────────────────────
  const handleSaveUpdate = async () => {
    setSaveError('');

    // Validate items
    for (const it of editItems) {
      if (!String(it.description).trim()) { setSaveError('All items must have a description.'); return; }
      if ((parseInt(it.quantity) || 0) <= 0) { setSaveError('All quantities must be ≥ 1.'); return; }
      const prof    = parseFloat(it.Professional_amount) || 0;
      const matRate = parseFloat(it.material_rate) || 0;
      const labRate = parseFloat(it.labour_rate) || 0;
      const matAmt  = parseFloat(it.material_amount) || 0;
      const labAmt  = parseFloat(it.labour_amount) || 0;
      if (prof <= 0 && matRate <= 0 && labRate <= 0 && matAmt <= 0 && labAmt <= 0) {
        setSaveError('Each item must have a rate or amount greater than 0.');
        return;
      }
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

      // Validate compliance_category on every item before sending
      for (const it of editItems) {
        if (!parseInt(it.compliance_category)) {
          throw new Error(
            `Item "${String(it.description || '').slice(0, 40)}" has no compliance_category. Cannot save.`
          );
        }
      }

      // Pass clean data to updatePurchaseOrder — the service layer owns all
      // payload shaping, string-coercion of monetary fields, consultancy_charges
      // defaulting, and routing to /quotations/update_execution_quotation/.
      const payload = {
        id:               parseInt(po.id),
        vendor:           po.vendor  ? parseInt(po.vendor)  : null,
        client:           po.client  ? parseInt(po.client)  : null,
        project:          parseInt(po.project),
        company:          parseInt(editCompany) || 1,
        status:           resolvedStatus,
        sac_code:         editSacCode.trim(),
        gst_rate:         isGSTApplicable ? parseFloat(editGstRate || 0) : 0,
        discount_rate:    parseFloat(editDiscRate || 0),
        total_amount:     sub,
        total_gst_amount: gst,
        grand_total:      grand,
        // Spread editItems as-is — updatePurchaseOrder handles all field shaping
        items:            editItems.map(it => ({ ...it })),
      };

      const response = await updatePurchaseOrder(payload);
      const data = response;

      const newCompanyName = (QUOTATION_COMPANIES || PO_COMPANIES).find(c => c.id === parseInt(editCompany))?.name || po.company_name;

      if (data && (data.id || data.quotation_number || data.status === 'success')) {
        const updated = data.data || data;
        setPo(prev => ({
          ...prev, ...updated,
          company:          editCompany,
          company_name:     newCompanyName,
          sac_code:         editSacCode.trim(),
          gst_rate:         String(isGSTApplicable ? editGstRate : 0),
          discount_rate:    String(editDiscRate),
          total_amount:     sub,
          total_gst_amount: gst,
          grand_total:      grand,
          items: updated.items || editItems.map(it => ({ ...it, total_amount: calcItemTotal(it) })),
        }));
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

  // ─── Invoice helpers ──────────────────────────────────────────────────────────
  const fmtInvNum = (n) => n ? String(n) : '—';

  const extractTrailingDigits = (numStr) => {
    if (!numStr) return '';
    const s = String(numStr);
    const lastDash = s.lastIndexOf('-');
    return lastDash >= 0 ? s.substring(lastDash + 1) : s;
  };

  const fetchInvoiceForThisPO = async () => {
    const poTrailing = extractTrailingDigits(po.quotation_number || String(po.id));
    const results    = await getAllInvoices({ page: 1, page_size: 100 });
    const quotationId = Number(po.id);
    let match = results.find(inv => Number(inv.quotation) === quotationId);
    if (!match && poTrailing) {
      match = results.find(inv => {
        const invTrailing = extractTrailingDigits(inv.invoice_number);
        return invTrailing && invTrailing === poTrailing;
      });
    }
    return match || null;
  };

  const dismissInvoiceModal = () =>
    setInvoiceModal({ open: false, invoiceId: null, invoiceNum: '', alreadyExists: false, genericError: '' });

  const handleInvoiceButtonClick = async () => {
    setInvoiceChecking(true);
    try {
      const existing = await fetchInvoiceForThisPO();
      if (existing) {
        setInvoiceModal({ open: true, invoiceId: existing.id, invoiceNum: fmtInvNum(existing.invoice_number), alreadyExists: true, genericError: '' });
        return;
      }
      setAdvanceAmount(''); setInvoiceError(''); setInvoiceSuccess(null);
      setShowInvoiceModal(true);
    } catch {
      setAdvanceAmount(''); setInvoiceError(''); setInvoiceSuccess(null);
      setShowInvoiceModal(true);
    } finally {
      setInvoiceChecking(false);
    }
  };

  const handleGenerateInvoice = async () => {
    setInvoiceError(''); setInvoiceGenerating(true);
    try {
      const advance = advanceAmount ? parseFloat(advanceAmount) : 0;
      if (advanceAmount && isNaN(advance)) { setInvoiceError('Please enter a valid advance amount.'); setInvoiceGenerating(false); return; }
      if (advance < 0) { setInvoiceError('Advance amount cannot be negative.'); setInvoiceGenerating(false); return; }
      const res     = await createPurchaseOrderInvoice({ quotation: po.id, advance_amount: String(advance.toFixed(2)) });
      const created = res?.data || res;
      if (!created?.id && !created?.invoice_number) {
        setInvoiceError('Invoice created but response was unexpected. Please check Invoice List.');
        return;
      }
      setInvoiceSuccess(created);
    } catch (e) {
      const status   = e.response?.status;
      const respData = e.response?.data;
      if (status === 409) {
        setShowInvoiceModal(false);
        let existingId = null; let existingNum = '';
        try {
          const match = await fetchInvoiceForThisPO();
          if (match) { existingId = match.id; existingNum = fmtInvNum(match.invoice_number); }
        } catch { /* ignore */ }
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

  const handleDownload = () => {
    setPdfCompanyName('');
    setPdfAddress('');
    setPdfContactPerson('');
    setPdfSubject('');
    setPdfExtraNotes(['']);
    setPdfFormError('');
    setPdfApiError('');
    setShowPdfModal(true);
  };

  const handleConfirmPdfDownload = async () => {
    if (!pdfCompanyName.trim()) { setPdfFormError('Company name is required.'); return; }
    setPdfFormError(''); setPdfApiError('');
    setPdfLoading(true);
    try {
      const fileName = `${fmtPONum(po?.quotation_number) || `PurchaseOrder_${id}`}.pdf`;
      await generatePurchaseOrderPdf(po.id, {
        company_name:   pdfCompanyName.trim(),
        address:        pdfAddress.trim(),
        contact_person: pdfContactPerson.trim(),
        subject:        pdfSubject.trim(),
        extra_notes:    pdfExtraNotes.map(n => n.trim()).filter(Boolean),
      }, fileName);
      setShowPdfModal(false);
    } catch (e) {
      setPdfApiError(e.message || 'Failed to generate PDF. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  // ─── Guard clauses ────────────────────────────────────────────────────────────
  if (loading)    return <LoadingView />;
  if (fetchError) return <ErrorView message={fetchError} onRetry={fetchData} onBack={() => navigate('/purchase')} />;
  if (!po)        return <ErrorView message="Purchase order not available." onRetry={fetchData} onBack={() => navigate('/purchase')} />;

  // ─── Derived values ────────────────────────────────────────────────────────────
  const status   = getStatusUI(po.status_display || po.status);
  const poNum    = fmtPONum(po.quotation_number);

  const subtotal   = parseFloat(po.total_amount  || 0);
  const gstRate    = parseFloat(po.gst_rate      || 0);
  const discRate   = parseFloat(po.discount_rate || 0);
  const discAmt    = parseFloat(((subtotal * discRate) / 100).toFixed(2));
  const taxable    = parseFloat((subtotal - discAmt).toFixed(2));
  const gstAmt     = parseFloat(((taxable * gstRate) / 100).toFixed(2));
  const grandTotal = parseFloat((taxable + gstAmt).toFixed(2));

  const items    = po.items || [];
  const groups   = groupItemsByCategory(items);
  const totalQty = items.reduce((s, it) => s + (parseInt(it.quantity) || 1), 0);

  const companyName = po.company_name || getPOCompanyName(po.company) || 'ERP System';
  const vendorName  = po.vendor_name  || (po.vendor ? `Vendor #${po.vendor}` : '—');
  const projName    = project
    ? (project.name || project.title || `Project #${po.project}`)
    : po.project_name || (po.project ? `Project #${po.project}` : '—');
  const projLoc = project ? [project.city, project.state].filter(Boolean).join(', ') : '';

  // ── Edit totals (live) ────────────────────────────────────────────────────────
  const eSub   = editMode ? calcEditSubtotal() : 0;
  const eDisc  = editMode ? calcEditDiscAmt(eSub) : 0;
  const eTax   = editMode ? parseFloat((eSub - eDisc).toFixed(2)) : 0;
  const eGst   = editMode ? calcEditGstAmt(eSub, eDisc) : 0;
  const eGrand = editMode ? calcEditGrandTotal() : 0;

  return (
    <>
      {/* ─── Global styles ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        .vpod-root *{box-sizing:border-box;font-family:'Outfit',sans-serif}
        @keyframes vpod_spin{to{transform:rotate(360deg)}}
        @keyframes vpod_in{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes vpod_toast_in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes vpod_pulse_ring{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.35);opacity:0}}
        @keyframes vqd_dd_in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        .vpod-root{min-height:100vh;padding:0}

        /* ── Top bar ── */
        .vpod-topbar{display:flex;align-items:center;justify-content:space-between;margin:0 0 16px}
        .vpod-back{display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;font-size:13px;font-weight:600;color:#475569;padding:6px 10px;border-radius:8px;transition:background .15s,color .15s}
        .vpod-back:hover{background:#e2e8f0;color:#1e293b}
        .vpod-actions{display:flex;gap:8px;flex-wrap:wrap}
        .vpod-btn-o{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;background:#0f766e;border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:background .15s}
        .vpod-btn-o:hover{background:#0d6460}
        .vpod-btn-p{display:flex;align-items:center;gap:6px;padding:7px 16px;border-radius:8px;background:#0f766e;border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:background .15s}
        .vpod-btn-p:hover{background:#0d6460}
        .vpod-btn-p:disabled{opacity:.6;cursor:not-allowed}
        .vpod-btn-edit{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;background:#fff;border:1.5px solid #0f766e;color:#0f766e;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;font-family:inherit}
        .vpod-btn-edit:hover{background:#f0fdf4}
        .vpod-btn-save{display:flex;align-items:center;gap:6px;padding:7px 16px;border-radius:8px;background:linear-gradient(135deg,#0f766e,#0d9488);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s}
        .vpod-btn-save:hover{background:linear-gradient(135deg,#0d6460,#0b7a72)}
        .vpod-btn-save:disabled{opacity:.6;cursor:not-allowed}
        .vpod-btn-cancel{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;background:#fff;border:1.5px solid #e2e8f0;font-size:13px;font-weight:600;color:#64748b;cursor:pointer;transition:all .15s}
        .vpod-btn-cancel:hover{background:#fef2f2;border-color:#fca5a5;color:#dc2626}
        .vpod-spin{animation:vpod_spin .7s linear infinite}
        .vpod-btn-invoice{display:flex;align-items:center;gap:6px;padding:7px 15px;border-radius:8px;background:linear-gradient(135deg,#7c3aed,#6d28d9);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;box-shadow:0 2px 8px rgba(109,40,217,.25)}
        .vpod-btn-invoice:hover{background:linear-gradient(135deg,#6d28d9,#5b21b6);box-shadow:0 4px 12px rgba(109,40,217,.35)}
        .vpod-btn-invoice:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}

        /* ── Document card ── */
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

        /* ── Company edit button (in header, edit mode) ── */
        .vpod-co-edit-wrap{position:relative;display:inline-flex;align-items:center;gap:6px;cursor:pointer}
        .vpod-co-edit-btn{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.25);border-radius:8px;padding:4px 10px;cursor:pointer;transition:all .15s}
        .vpod-co-edit-btn:hover{background:rgba(255,255,255,.2);border-color:rgba(255,255,255,.4)}
        .vpod-co-dropdown{position:fixed;z-index:99999;background:#fff;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.06);min-width:220px;overflow:hidden;animation:vqd_dd_in .18s cubic-bezier(.16,1,.3,1)}
        .vpod-co-dd-header{padding:10px 14px 8px;font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;border-bottom:1px solid #f1f5f9}
        .vpod-co-dd-item{display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;transition:background .12s;font-size:13px;font-weight:600;color:#1e293b}
        .vpod-co-dd-item:hover{background:#f0fdf4}
        .vpod-co-dd-item.active{background:#ecfdf5;color:#0f766e}
        .vpod-co-dd-item .co-check{width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,#0f766e,#14b8a6);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .vpod-co-dd-item .co-dot{width:18px;height:18px;border-radius:50%;border:1.5px solid #e2e8f0;flex-shrink:0}

        /* ── Meta strip ── */
        .vpod-meta{display:flex;flex-wrap:wrap;align-items:center;gap:0;padding:14px 40px;background:#f8fafc;border-bottom:1.5px solid #e8ecf2}
        .vpod-meta-sep{width:1px;height:30px;background:#e2e8f0;margin:0 18px;flex-shrink:0}

        /* ── Parties ── */
        .vpod-parties{display:grid;grid-template-columns:1fr 24px 1fr 1fr;gap:0;padding:24px 40px;border-bottom:1.5px solid #f0f4f8;align-items:start}
        .vpod-arrow-col{display:flex;align-items:center;justify-content:center;padding-top:28px}
        .vpod-party{display:flex;flex-direction:column;gap:4px;padding-right:24px}
        .vpod-party--proj{padding-left:24px;border-left:1.5px solid #f0f4f8;padding-right:24px}
        .vpod-party--rates{padding-left:24px;border-left:1.5px solid #f0f4f8}
        .vpod-plabel{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px}
        .vpod-pavatar{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#0f766e,#14b8a6);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#fff;margin-bottom:6px}
        .vpod-picon{width:36px;height:36px;border-radius:10px;background:#f0fdf4;border:1.5px solid #bbf7d0;display:flex;align-items:center;justify-content:center;margin-bottom:6px}
        .vpod-pname{font-size:15px;font-weight:800;color:#1e293b;letter-spacing:-.01em}
        .vpod-pdetail{display:flex;align-items:center;gap:5px;font-size:12px;color:#64748b;margin-top:2px}
        .vpod-rates-list{display:flex;flex-direction:column;gap:10px}
        .vpod-rate-row{display:flex;align-items:center;gap:10px}
        .vpod-rate-icon{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .vpod-rate-v{font-size:15px;font-weight:800;color:#1e293b}
        .vpod-rate-l{font-size:11px;color:#94a3b8;font-weight:500;margin-top:1px}

        .vpod-items{padding:0 40px 24px}
        .vpod-sec-hdr{display:flex;align-items:center;gap:8px;padding:20px 0 14px;font-size:14px;font-weight:800;color:#1e293b;letter-spacing:-.01em}
        .vpod-sec-badge{background:#f1f5f9;border-radius:12px;padding:2px 8px;font-size:11px;font-weight:700;color:#64748b}
        .vpod-table-wrap{overflow-x:auto;border-radius:12px;border:1.5px solid #f0f4f8}
        .vpod-table{width:100%;border-collapse:collapse;font-size:13px}
        .vpod-table thead th{padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;background:#f8fafc;border-bottom:1.5px solid #f0f4f8;white-space:nowrap}
        .vpod-cat-row td{padding:8px 12px;background:#f8fafc;border-top:1.5px solid #f0f4f8}
        .vpod-cat-inner{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;color:#374151}
        .vpod-cat-dot{width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#0f766e,#14b8a6);flex-shrink:0}
        .vpod-cat-cnt{background:#e0f2fe;color:#0369a1;font-size:10px;font-weight:700;padding:1px 6px;border-radius:8px}
        .vpod-row td{padding:10px 12px;border-top:1px solid #f8fafc;vertical-align:top}
        .vpod-row:hover td{background:#fafffe}
        .vpod-row-idx{text-align:center;font-size:11px;color:#d1d5db;font-weight:700;width:32px}
        .vpod-desc{font-size:13px;color:#1e293b;font-weight:500;line-height:1.5}
        .vpod-subcat{display:inline-flex;align-items:center;padding:2px 8px;background:#eff6ff;color:#1d4ed8;border-radius:8px;font-size:10px;font-weight:700}
        .vpod-qty-badge{display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:22px;background:#f1f5f9;border-radius:6px;font-size:12px;font-weight:700;color:#475569;padding:0 5px}
        .vpod-cat-sub td{padding:6px 12px;background:#fafffe;border-top:1px solid #f0f4f8}

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
        .vpod-foot{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:24px 40px;border-top:1.5px solid #f0f4f8}
        .vpod-sum-title{font-size:13px;font-weight:800;color:#1e293b;margin-bottom:12px}
        .vpod-sum-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .vpod-sum-item{display:flex;flex-direction:column;gap:2px}
        .vpod-sum-lbl{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em}
        .vpod-sum-val{font-size:13px;font-weight:700;color:#1e293b}
        .vpod-tbox{background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:14px;padding:20px 22px}
        .vpod-tbox-title{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:14px;display:flex;align-items:center;gap:6px}
        .vpod-trow{display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:13px;color:#475569;font-weight:500}
        .vpod-trow--disc{color:#ea580c}
        .vpod-trow--sub{color:#64748b;font-size:12px}
        .vpod-tdiv{border:none;border-top:1.5px solid #e2e8f0;margin:10px 0}
        .vpod-grand{display:flex;justify-content:space-between;align-items:center;font-size:18px;font-weight:900;color:#1e293b;padding:4px 0}
        .vpod-words{font-size:11px;color:#94a3b8;margin-top:8px;font-style:italic;line-height:1.5}
        .vpod-dl-btn{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;margin-top:14px;padding:11px 0;background:linear-gradient(135deg,#0f766e,#0d9488);border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s}
        .vpod-dl-btn:hover{background:linear-gradient(135deg,#0d6460,#0b7a72);transform:translateY(-1px)}
        .vpod-dl-btn:disabled{opacity:.6;cursor:not-allowed}

        /* ── Toasts & modals ── */
        .vpod-success-toast{position:fixed;bottom:28px;right:28px;z-index:9999;display:flex;align-items:center;gap:10px;background:#0f766e;color:#fff;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:600;box-shadow:0 8px 24px rgba(15,118,110,.4);animation:vpod_toast_in .3s cubic-bezier(.16,1,.3,1)}
        .vpod-remarks{margin-top:14px;padding:12px 14px;background:#f8fafc;border-radius:10px;border:1px solid #e8ecf2}
        .vpod-rem-title{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
        .vpod-rem-text{font-size:12.5px;color:#475569;line-height:1.6;margin:0}
        .vpod-misc-note{font-size:11px;color:#d97706;background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:2px 6px;font-style:italic}
        .vpod-exec-rate-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700}

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
          .vpod-hdr{padding:22px 20px 22px}
          .vpod-meta{padding:12px 20px}
          .vpod-meta-sep{display:none}
          .vpod-parties{grid-template-columns:1fr;padding:20px;gap:16px}
          .vpod-arrow-col{display:none}
          .vpod-party--proj,.vpod-party--rates{padding-left:0;border-left:none}
          .vpod-party--rates{border-top:1.5px solid #f0f4f8;padding-top:16px}
          .vpod-items{padding:0 20px 24px}
          .vpod-foot{grid-template-columns:1fr;padding:20px}          .vpod-doc-foot{padding:12px 20px;flex-direction:column;gap:4px;text-align:center}
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
                <button className="vpod-btn-o" onClick={() => setSendModal(true)}>
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
                Edit any field inline · Click company name in header to change company · Click "+ Add Item" to add new execution compliance items · "Save Changes" when done.
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
                <div className="vpod-logo-badge">
                  {editMode
                    ? (PO_COMPANIES.find(c => c.id === parseInt(editCompany))?.name || companyName || 'CI')[0].toUpperCase()
                    : (companyName || 'CI')[0].toUpperCase()}
                </div>
                <div>
                  {editMode ? (
                    <div className="vpod-co-edit-wrap">
                      <div
                        ref={companyBtnRef}
                        className="vpod-co-edit-btn"
                        onClick={openCompanyDrop}
                        title="Click to change company"
                      >
                        <span className="vpod-co-name" style={{ fontSize: 17 }}>
                          {PO_COMPANIES.find(c => c.id === parseInt(editCompany))?.name || companyName}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(255,255,255,.18)', borderRadius: 6, padding: '2px 6px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.9)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                          <PenLine size={9} /> Change
                        </span>
                        <ChevronDown size={13} color="rgba(255,255,255,.7)" style={{ transform: companyDropOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
                      </div>
                    </div>
                  ) : (
                    <div className="vpod-co-name">{companyName}</div>
                  )}
                  <div className="vpod-co-sub">Purchase Order</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <StatusPill status={status} />
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)',
                  color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                  letterSpacing: '0.03em',
                }}>
                  <Truck size={11} />
                  Execution Compliance
                </span>
              </div>
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
                  <Building2 size={10} /> Company
                  <span style={{ color: '#f59e0b', fontSize: 10 }}>✎</span>
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f766e' }}>
                  {PO_COMPANIES.find(c => c.id === parseInt(editCompany))?.name || companyName}
                </span>
              </div>
            ) : (
              po.company_name && <MetaBlock icon={Building2} label="Company" value={po.company_name} />
            )}
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
            <div className="vpod-meta-sep" />
            {/* PO Type — always Execution */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Type</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: '#f5f3ff', border: '1.5px solid #ddd6fe',
                color: '#7c3aed', fontSize: 11, fontWeight: 700,
                padding: '3px 9px', borderRadius: 20,
              }}>
                <Truck size={10} />
                Execution
              </span>
            </div>
            {createdByName && <>
              <div className="vpod-meta-sep" />
              <MetaBlock icon={User} label="Prepared By" value={createdByName} />
            </>}
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
              <div className="vpod-plabel">
                Applied Rates {editMode && <span style={{ color: '#f59e0b', fontWeight: 700 }}>— Editable</span>}
              </div>
              <div className="vpod-rates-list">

                {/* ── GST Rate row
                    ONLY shown for GST-applicable company (ID 1).
                    Companies 2, 3, 4: this entire row is hidden in both
                    view mode AND edit mode — exactly as quotation does it. ── */}
                {isGSTApplicable && (
                  <div className="vpod-rate-row">
                    <div className="vpod-rate-icon" style={{ background: '#eff6ff' }}>
                      <Percent size={14} color="#2563eb" />
                    </div>
                    <div style={{ flex: 1 }}>
                      {editMode ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            type="number" min="0" max="100" step="0.01"
                            className="vpod-edit-input vpod-edit-input-sm"
                            value={editGstRate}
                            onChange={e => setEditGstRate(parseFloat(e.target.value) || 0)}
                          />
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>%</span>
                        </div>
                      ) : (
                        <div className="vpod-rate-v">{gstRate}%</div>
                      )}
                      <div className="vpod-rate-l">GST Rate</div>
                    </div>
                  </div>
                )}

                {/* Discount Rate row — always visible for all companies */}
                <div className="vpod-rate-row">
                  <div className="vpod-rate-icon" style={{ background: (editMode ? editDiscRate : discRate) > 0 ? '#fff7ed' : '#f8fafc' }}>
                    <Tag size={14} color={(editMode ? editDiscRate : discRate) > 0 ? '#ea580c' : '#94a3b8'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    {editMode ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="number" min="0" max="100" step="0.01"
                          className="vpod-edit-input vpod-edit-input-sm"
                          value={editDiscRate}
                          onChange={e => setEditDiscRate(parseFloat(e.target.value) || 0)}
                        />
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

            {/* ── VIEW MODE — uses PurchaseTypeTable component ── */}
            {!editMode && <PurchaseTypeTable items={items} />}

            {/* ── EDIT MODE TABLE ── */}
            {editMode && (
              <div className="vpod-table-wrap">
                {editItems.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 8 }}>
                    <FileText size={28} color="#e2e8f0" />
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>No items. Click "+ Add Item" above to get started.</p>
                  </div>
                ) : (() => {
                  // Group edit items by compliance category
                  const COMPLIANCE_CATEGORIES = { 5: 'Water Connection', 6: 'SWD Line Work', 7: 'Sewer/Drainage Line Work' };
                  const editGroups = {};
                  editItems.forEach((it, globalIdx) => {
                    const catId = it.compliance_category ?? 5;
                    const key   = String(catId);
                    if (!editGroups[key]) editGroups[key] = { catId, catName: COMPLIANCE_CATEGORIES[catId] || `Category ${catId}`, rows: [] };
                    editGroups[key].rows.push({ it, globalIdx });
                  });

                  return (
                    <table className="vpod-table" style={{ tableLayout: 'fixed' }}>
                      <thead>
                        <tr>
                          <th style={{ width: 32 }}>#</th>
                          <th style={{ width: 'auto' }}>
                            Description <span style={{ color: '#f59e0b', fontWeight: 400, fontStyle: 'italic', fontSize: 10 }}>(editable)</span>
                          </th>
                          <th style={{ width: 58, textAlign: 'center' }}>Qty</th>
                          <th style={{ width: 72, textAlign: 'center' }}>Unit</th>
                          <th style={{ width: 116, textAlign: 'right' }}>Material Amt (₹)</th>
                          <th style={{ width: 116, textAlign: 'right' }}>Labour Amt (₹)</th>
                          <th style={{ width: 116, textAlign: 'right' }}>Professional (₹)</th>
                          <th style={{ width: 110, textAlign: 'right' }}>Item Total</th>
                          <th style={{ width: 40 }}></th>
                        </tr>
                      </thead>
                      {Object.values(editGroups).map((grp, gi) => {
                        const grpEditTotal = grp.rows.reduce((s, { it }) => s + calcItemTotal(it), 0);
                        return (
                          <tbody key={gi}>
                            <tr className="vpod-cat-row">
                              <td colSpan={9}>
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
                                      type="text"
                                      className="vpod-edit-input"
                                      value={it.unit || ''}
                                      onChange={e => updateItem(globalIdx, 'unit', e.target.value)}
                                      placeholder="Unit"
                                      style={{ textAlign: 'center', width: '100%' }}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="number" min="0" step="0.01"
                                      className="vpod-edit-input"
                                      value={it.material_amount === 0 ? '' : it.material_amount}
                                      onChange={e => updateItem(globalIdx, 'material_amount', parseFloat(e.target.value) || 0)}
                                      placeholder="0.00"
                                      style={{ textAlign: 'right', width: '100%' }}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="number" min="0" step="0.01"
                                      className="vpod-edit-input"
                                      value={it.labour_amount === 0 ? '' : it.labour_amount}
                                      onChange={e => updateItem(globalIdx, 'labour_amount', parseFloat(e.target.value) || 0)}
                                      placeholder="0.00"
                                      style={{ textAlign: 'right', width: '100%' }}
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
                              <td colSpan={7} style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', fontStyle: 'italic', paddingRight: 14 }}>{grp.catName} subtotal</td>
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
                  <span className="vpod-sum-lbl">PO Type</span>
                  <span className="vpod-sum-val" style={{ color: '#7c3aed' }}>Execution Compliance</span>
                </div>
                <div className="vpod-sum-item">
                  <span className="vpod-sum-lbl">Total Items</span>
                  <span className="vpod-sum-val">{editMode ? editItems.length : items.length}</span>
                </div>
                <div className="vpod-sum-item">
                  <span className="vpod-sum-lbl">Total Quantity</span>
                  <span className="vpod-sum-val">{editMode ? editItems.reduce((s, it) => s + (parseInt(it.quantity) || 1), 0) : totalQty}</span>
                </div>
                <div className="vpod-sum-item">
                  <span className="vpod-sum-lbl">Compliance Groups</span>
                  <span className="vpod-sum-val">{editMode ? Object.keys(editItems.reduce((a, it) => ({ ...a, [it.compliance_category ?? 5]: 1 }), {})).length : groups.length}</span>
                </div>
                <div className="vpod-sum-item">
                  <span className="vpod-sum-lbl">SAC Code</span>
                  <span className="vpod-sum-val" style={{ color: '#0f766e', fontFamily: 'monospace' }}>
                    {editMode ? editSacCode || '—' : (po.sac_code || '—')}
                  </span>
                </div>
                <div className="vpod-sum-item">
                  <span className="vpod-sum-lbl">Status</span>
                  <span><StatusPill status={status} /></span>
                </div>
                <div className="vpod-sum-item">
                  <span className="vpod-sum-lbl">Vendor</span>
                  <span className="vpod-sum-val">{vendorName}</span>
                </div>
                <div className="vpod-sum-item">
                  <span className="vpod-sum-lbl">Project</span>
                  <span className="vpod-sum-val">{projName}</span>
                </div>
                <div className="vpod-sum-item">
                  <span className="vpod-sum-lbl">Company</span>
                  <span className="vpod-sum-val">
                    {editMode
                      ? (PO_COMPANIES.find(c => c.id === parseInt(editCompany))?.name || companyName)
                      : companyName}
                  </span>
                </div>
                {createdByName && (
                  <div className="vpod-sum-item">
                    <span className="vpod-sum-lbl">Prepared By</span>
                    <span className="vpod-sum-val">{createdByName}</span>
                  </div>
                )}
                <div className="vpod-sum-item">
                  <span className="vpod-sum-lbl">Issue Date</span>
                  <span className="vpod-sum-val">{fmtDate(po.created_at)}</span>
                </div>
                <div className="vpod-sum-item">
                  <span className="vpod-sum-lbl">Last Updated</span>
                  <span className="vpod-sum-val">{fmtDate(po.updated_at)}</span>
                </div>
              </div>

              {/* Execution cost breakdown — always shown for POs (always execution) */}
              {items.length > 0 && (
                <div style={{ marginTop: 14, padding: '12px 14px', background: '#f5f3ff', border: '1.5px solid #ddd6fe', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Truck size={11} /> Execution Cost Breakdown
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Professional</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginTop: 2 }}>
                        ₹&nbsp;{fmtINR(items.reduce((s, it) => s + ((parseFloat(it.Professional_amount) || 0) * (parseInt(it.quantity) || 1)), 0))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Material</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginTop: 2 }}>
                        ₹&nbsp;{fmtINR(items.reduce((s, it) => s + (parseFloat(it.material_amount) || 0), 0))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Labour</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginTop: 2 }}>
                        ₹&nbsp;{fmtINR(items.reduce((s, it) => s + (parseFloat(it.labour_amount) || 0), 0))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                  {isGSTApplicable && eGst > 0 && (
                    <div className="vpod-trow"><span>GST ({editGstRate}%)</span><span style={{ fontWeight: 700, color: '#1e293b' }}>+&nbsp;₹&nbsp;{fmtINR(eGst)}</span></div>
                  )}
                  <hr className="vpod-tdiv" />
                  <div className="vpod-grand" style={{ fontSize: 21 }}>
                    <span>Grand Total</span>
                    <span style={{ color: '#059669' }}>₹&nbsp;{fmtINR(eGrand)}</span>
                  </div>
                  <div className="vpod-words"><strong style={{ color: '#94a3b8', fontStyle: 'normal' }}>In words: </strong>{numberToWords(eGrand)} Rupees only</div>
                  <button
                    className="vpod-btn-save"
                    onClick={handleSaveUpdate}
                    disabled={saving}
                    style={{ width: '100%', marginTop: 14, padding: 11, justifyContent: 'center', borderRadius: 10 }}
                  >
                    {saving ? <><Loader2 size={15} className="vpod-spin" /> Saving…</> : <><Save size={15} /> Save Changes</>}
                  </button>
                  {saveError && (
                    <div className="vpod-save-err" style={{ marginTop: 8 }}>
                      <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} /> {saveError}
                    </div>
                  )}
                </div>
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
                  <div className="vpod-grand"><span>Grand Total</span><span>₹&nbsp;{fmtINR(grandTotal)}</span></div>
                  <div className="vpod-words"><strong style={{ color: '#94a3b8', fontStyle: 'normal' }}>In words: </strong>{numberToWords(grandTotal)} Rupees only</div>
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

        {/* ── Notes Section ── */}
        {po && (
          <Notes
            entityType={NOTE_ENTITY.QUOTATION}
            entityId={po.id}
          />
        )}

      </div>{/* end .vpod-root */}

      {/* ══════════ COMPANY DROPDOWN PORTAL ══════════ */}
      {companyDropOpen && (
        <div
          ref={companyDropRef}
          className="vpod-co-dropdown"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          <div className="vpod-co-dd-header">Select Company</div>
          {PO_COMPANIES.map(co => {
            const isActive = parseInt(editCompany) === co.id;
            return (
              <div
                key={co.id}
                className={`vpod-co-dd-item${isActive ? ' active' : ''}`}
                onClick={() => { setEditCompany(co.id); setCompanyDropOpen(false); }}
              >
                {isActive
                  ? <span className="co-check"><svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
                  : <span className="co-dot" />}
                {co.name}
                {co.id === GST_APPLICABLE_COMPANY_ID && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '1px 6px' }}>GST</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════ DOWNLOAD PDF MODAL ══════════ */}
      {showPdfModal && (
        <div className="fixed inset-0 z-[9999] pointer-events-none" style={{ position: 'fixed' }}>
          <div
            className="absolute inset-0 bg-black/50 pointer-events-auto"
            style={{ position: 'fixed', width: '100vw', height: '100vh' }}
            onClick={() => !pdfLoading && setShowPdfModal(false)}
          />
          <div className="relative z-10 flex items-center justify-center p-4 pointer-events-none" style={{ height: '100vh' }}>
            <div
              style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, boxShadow: '0 32px 80px rgba(0,0,0,.28)', overflow: 'hidden', fontFamily: "'Outfit', sans-serif" }}
              className="pointer-events-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div style={{ background: 'linear-gradient(135deg,#0c6e67 0%,#0f766e 45%,#0d9488 100%)', padding: '20px 24px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,.18)', border: '1.5px solid rgba(255,255,255,.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileText size={17} color="#fff" />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-.01em' }}>Download Purchase Order PDF</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.65)', marginTop: 2 }}>{poNum}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => !pdfLoading && setShowPdfModal(false)}
                    style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.25)', borderRadius: 8, width: 30, height: 30, cursor: pdfLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', opacity: pdfLoading ? 0.5 : 1 }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Modal body */}
              <div style={{ padding: '20px 24px 24px' }}>
                {pdfFormError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#dc2626' }}>
                    <AlertCircle size={13} /> {pdfFormError}
                  </div>
                )}
                {pdfApiError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#dc2626' }}>
                    <AlertCircle size={13} /> {pdfApiError}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Company Name */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
                      <Building2 size={11} /> Company Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      value={pdfCompanyName}
                      onChange={e => setPdfCompanyName(e.target.value)}
                      placeholder="Enter company / vendor name"
                      disabled={pdfLoading}
                      style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${pdfFormError && !pdfCompanyName.trim() ? '#fca5a5' : '#e2e8f0'}`, borderRadius: 9, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s' }}
                    />
                  </div>
                  {/* Address */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
                      <MapPin size={11} /> Address <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'none', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                      value={pdfAddress}
                      onChange={e => setPdfAddress(e.target.value)}
                      placeholder="Street, City, State"
                      disabled={pdfLoading}
                      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  {/* Contact Person */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
                      <User size={11} /> Contact Person <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'none', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                      value={pdfContactPerson}
                      onChange={e => setPdfContactPerson(e.target.value)}
                      placeholder="e.g. Mr. Rajesh Kumar"
                      disabled={pdfLoading}
                      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  {/* Subject */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
                      <FileText size={11} /> Subject <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'none', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                      value={pdfSubject}
                      onChange={e => setPdfSubject(e.target.value)}
                      placeholder="e.g. Purchase Order for Plumbing Services"
                      disabled={pdfLoading}
                      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  {/* Extra Notes */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
                      <FileText size={11} /> Extra Notes <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'none', fontWeight: 400 }}>(optional)</span>
                    </label>
                    {pdfExtraNotes.map((note, ni) => (
                      <div key={ni} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                        <input
                          value={note}
                          onChange={e => setPdfExtraNotes(prev => prev.map((n, i) => i === ni ? e.target.value : n))}
                          placeholder={`Note ${ni + 1}`}
                          disabled={pdfLoading}
                          style={{ flex: 1, padding: '7px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                        />
                        {pdfExtraNotes.length > 1 && (
                          <button
                            onClick={() => setPdfExtraNotes(prev => prev.filter((_, i) => i !== ni))}
                            disabled={pdfLoading}
                            style={{ padding: '6px 10px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, cursor: 'pointer', color: '#dc2626', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => setPdfExtraNotes(prev => [...prev, ''])}
                      disabled={pdfLoading}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      <Plus size={12} /> Add Note
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button
                    onClick={() => !pdfLoading && setShowPdfModal(false)}
                    disabled={pdfLoading}
                    style={{ flex: 1, padding: '8px 0', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 13, fontWeight: 600, color: '#475569', cursor: pdfLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: pdfLoading ? 0.5 : 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmPdfDownload}
                    disabled={pdfLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 22px', borderRadius: 9, border: 'none', background: pdfLoading ? '#d1d5db' : 'linear-gradient(135deg,#0f766e,#0d9488)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: pdfLoading ? 'not-allowed' : 'pointer', boxShadow: pdfLoading ? 'none' : '0 2px 8px rgba(15,118,110,.3)', fontFamily: 'inherit', transition: 'all .15s' }}
                  >
                    {pdfLoading
                      ? <><Loader2 size={13} className="vpod-spin" /> Generating…</>
                      : <><Download size={13} /> Generate &amp; Download</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ ADD COMPLIANCE MODAL — execution only ══════════ */}
      <AddComplianceModal
        isOpen={showAddSection}
        onClose={() => setShowAddSection(false)}
        onSave={handleComplianceSave}
        existingItems={editItems}
        fetchDescriptions={fetchDescriptionsForModal}
      />

      {/* ── Send to Vendor Modal ── */}
      <SendEmailModal
        isOpen={sendModal}
        onClose={() => setSendModal(false)}
        title="Send Purchase Order to Vendor"
        defaultRecipient={vendor?.email || po?.vendor_email || ''}
        defaultSubject={`Purchase Order ${poNum}${po?.created_at ? ` — Issued ${fmtDate(po.created_at)}` : ''}`}
        defaultBody={`Dear ${vendorName !== '—' ? vendorName : 'Vendor'},\n\nPlease find attached Purchase Order ${poNum}${po?.created_at ? `, issued on ${fmtDate(po.created_at)}` : ''}.\n\nKindly review the details and confirm acceptance at your earliest convenience.\n\nBest regards,\n${companyName}`}
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, overflow: 'hidden', animation: 'vpod_toast_in .2s ease' }}>
          <div
            style={{ position: 'fixed', width: '100vw', height: '100vh', background: 'rgba(15,23,42,.55)', backdropFilter: 'blur(4px)' }}
            onClick={() => { if (!invoiceGenerating) { setShowInvoiceModal(false); setInvoiceSuccess(null); } }}
          />
          <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', zIndex: 1 }}>
            <div
              style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 420, boxShadow: '0 40px 100px rgba(0,0,0,.24)', overflow: 'hidden', animation: 'vpod_toast_in .32s cubic-bezier(.16,1,.3,1)' }}
              onClick={e => e.stopPropagation()}
            >
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
                      <span>Grand Total: <strong style={{ color: '#1e293b' }}>₹{fmtINR(invoiceSuccess.grand_total)}</strong></span>
                      <span>Advance Paid: <strong style={{ color: '#059669' }}>₹{fmtINR(advanceAmount)}</strong></span>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
                    <button
                      onClick={() => { setShowInvoiceModal(false); setInvoiceSuccess(null); navigate(`/invoices/${invoiceSuccess.id}`, { state: { invoiceType: 'Vendor Compliance' } }); }}
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

                  {/* PO summary chip */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
                    <CheckCircle size={15} color="#059669" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#065f46' }}>Purchase Order</div>
                      <div style={{ fontSize: 11, color: '#047857', marginTop: 1 }}>
                        {poNum} · Vendor: <strong>{po.vendor_name || '—'}</strong> · Grand Total: <strong>₹{fmtINR(grandTotal)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Advance amount input */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                      Advance Amount (₹) <span style={{ color: '#94a3b8', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— optional</span>
                    </label>
                    <input
                      type="number" min="0" step="0.01"
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

                  {/* Live preview when advance entered */}
                  {advanceAmount && !isNaN(parseFloat(advanceAmount)) && parseFloat(advanceAmount) > 0 && (
                    <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Payment Preview</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#475569' }}>
                          <span>Grand Total</span><span style={{ fontWeight: 700, color: '#1e293b' }}>₹{fmtINR(grandTotal)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#059669' }}>
                          <span>Advance Paid</span><span style={{ fontWeight: 700 }}>− ₹{fmtINR(parseFloat(advanceAmount))}</span>
                        </div>
                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 2, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: '#dc2626' }}>
                          <span>Outstanding Balance</span>
                          <span>₹{fmtINR(Math.max(0, grandTotal - parseFloat(advanceAmount)))}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error */}
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
                  onClick={() => { dismissInvoiceModal(); navigate(`/invoices/${invoiceModal.invoiceId}`, { state: { invoiceType: 'Vendor Compliance' } }); }}
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

      {/* ── PDF Error toast ── */}
      {pdfError && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, display: 'flex', alignItems: 'center', gap: 10,
          background: '#fef2f2', color: '#dc2626',
          border: '1.5px solid #fca5a5',
          padding: '12px 20px', borderRadius: 12,
          fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(220,38,38,.18)',
          animation: 'vpod_toast_in .3s cubic-bezier(.16,1,.3,1)',
          fontFamily: "'Outfit', sans-serif",
          maxWidth: 420,
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          {pdfError}
          <button
            onClick={() => setPdfError('')}
            style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', lineHeight: 1, padding: 0 }}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}