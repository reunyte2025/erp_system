import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Loader2, AlertCircle,
  CheckCircle, Clock, Send, FileText, XCircle,
  Building2, User, MapPin, Hash, Calendar,
  Tag, Percent, ChevronRight, Mail, X,
  Edit2, Save, RotateCcw, Plus, Trash2, PenLine,
  Search, ChevronDown, Edit, Phone, CreditCard, Package, Wrench, FileSearch,
} from 'lucide-react';
import {
  getQuotationById, generateQuotationPdf,
  updateRegulatoryQuotation, updateExecutionQuotation,
  getQuotationCompanyName, getUserById, getAllProjects,
  QUOTATION_COMPANIES,
} from '../../services/quotation';
import { getComplianceByCategory, createProforma, getProformas } from '../../services/proforma';
import { getClientById, getClientProjects } from '../../services/clients';
import AddComplianceModal from '../../components/AddComplianceModal/AddcomplianceModal';
import Notes from '../../components/Notes';
import { NOTE_ENTITY } from '../../services/notes';
import SendEmailModal from '../../components/SendEmailModal/SendEmailModal';

// ─── Helpers & constants (shared with QuotationTypeTable) ─────────────────────
import {
  fmtQNum, fmtINR, fmtDate,
  groupItemsByCategory, numberToWords,
  calcItemTotal, getExecutionDisplayValues, hasExecutionRateBreakdown,
  STATUS_CONFIG, COMPLIANCE_CATEGORIES, SUB_COMPLIANCE_CATEGORIES,
} from '../../services/quotationHelpers';

// ─── Type-aware items table ───────────────────────────────────────────────────
import QuotationTypeTable from './QuotationTypeTable';

// ─── Company GST applicability ────────────────────────────────────────────────
// Company ID 1 (Constructive India) is GST applicable.
// Company IDs 2, 3, 4 are NOT GST applicable.
const GST_APPLICABLE_COMPANY_ID = 1;

// ─── Status config — attach Lucide Icon references here (kept in main file
//     so this file retains full control of icon imports) ──────────────────────
const STATUS_CONFIG_WITH_ICONS = {
  '1':                  { ...STATUS_CONFIG['1'],                  Icon: FileText    },
  '2':                  { ...STATUS_CONFIG['2'],                  Icon: Clock       },
  '3':                  { ...STATUS_CONFIG['3'],                  Icon: CheckCircle },
  '4':                  { ...STATUS_CONFIG['4'],                  Icon: CheckCircle },
  '5':                  { ...STATUS_CONFIG['5'],                  Icon: XCircle     },
  'draft':              { ...STATUS_CONFIG['draft'],              Icon: FileText    },
  'pending':            { ...STATUS_CONFIG['pending'],            Icon: Clock       },
  'sent':               { ...STATUS_CONFIG['sent'],               Icon: CheckCircle },
  'accepted':           { ...STATUS_CONFIG['accepted'],           Icon: CheckCircle },
  'proforma_generated': { ...STATUS_CONFIG['proforma_generated'], Icon: CheckCircle },
  'completed':          { ...STATUS_CONFIG['completed'],          Icon: CheckCircle },
  'approved':           { ...STATUS_CONFIG['approved'],           Icon: CheckCircle },
  'failed':             { ...STATUS_CONFIG['failed'],             Icon: XCircle     },
  'rejected':           { ...STATUS_CONFIG['rejected'],           Icon: XCircle     },
};

const getStatusWithIcon = (s) =>
  STATUS_CONFIG_WITH_ICONS[String(s || '').toLowerCase()] || STATUS_CONFIG_WITH_ICONS['1'];

// ─── Sub-components ────────────────────────────────────────────────────────────

const StatusPill = ({ status }) => {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      color: status.color, background: status.bg,
      border: `1px solid ${status.border}`,
      fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 20,
    }}>
      <status.Icon size={11} /> {status.label}
    </span>
  );
};

const MetaBlock = ({ icon: Icon, label, value, accent }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
    <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 4 }}>
      {Icon && <Icon size={10} />} {label}
    </span>
    <span style={{ fontSize: 13, fontWeight: 700, color: accent ? '#0f766e' : '#1e293b', fontFamily: accent ? 'monospace' : 'inherit', letterSpacing: accent ? '0.03em' : 0 }}>
      {value || '—'}
    </span>
  </div>
);

const LoadingView = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 14 }}>
    <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#0f766e', animation: 'vqd_spin .75s linear infinite' }} />
    <p style={{ fontSize: 14, fontWeight: 500, color: '#64748b', margin: 0 }}>Loading quotation…</p>
    <style>{`@keyframes vqd_spin{to{transform:rotate(360deg)}}`}</style>
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ViewQuotationDetails({ onUpdateNavigation }) {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [quotation,     setQuotation]     = useState(null);
  const [client,        setClient]        = useState(null);
  const [project,       setProject]       = useState(null);
  const [createdByName, setCreatedByName] = useState('');
  const [loading,       setLoading]       = useState(true);
  const [fetchError,    setFetchError]    = useState('');
  const [pdfLoading,      setPdfLoading]      = useState(false);
  const [proformaLoading, setProformaLoading] = useState(false);
  const [proformaModal,   setProformaModal]   = useState({ open: false, proformaId: null, proformaNum: '', alreadyExists: false, genericError: '' });
  const [visible,         setVisible]         = useState(false);
  const [sendModal,       setSendModal]       = useState(false);

  // ── PDF Modal state ────────────────────────────────────────────────────────
  const [showPdfModal,     setShowPdfModal]     = useState(false);
  const [pdfCompanyName,   setPdfCompanyName]   = useState('');
  const [pdfAddress,       setPdfAddress]       = useState('');
  const [pdfContactPerson, setPdfContactPerson] = useState('');
  const [pdfSubject,       setPdfSubject]       = useState('');
  const [pdfExtraNotes,    setPdfExtraNotes]    = useState(['']);
  const [pdfFormError,     setPdfFormError]     = useState('');
  const [pdfApiError,      setPdfApiError]      = useState('');

  useEffect(() => {
    onUpdateNavigation?.({ breadcrumbs: ['Quotations', 'Quotation Details'] });
    return () => onUpdateNavigation?.(null);
  }, [onUpdateNavigation]);

  // ── Fetch quotation by type-specific API ──────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!id) { setFetchError('No quotation ID provided'); setLoading(false); return; }
    setLoading(true); setFetchError('');
    try {
      const res = await getQuotationById(id);
      if (res.status !== 'success' || !res.data) throw new Error('Failed to load quotation');
      const q = res.data;
      setQuotation(q);

      if (q.client) {
        try {
          const cr = await getClientById(q.client);
          if (cr.status === 'success' && cr.data) setClient(cr.data);
        } catch { /* client details are optional */ }
      }

      if (q.project) {
        try {
          let found = null;
          if (q.client) {
            const pr = await getClientProjects(q.client);
            const results = pr?.data?.results || pr?.results || [];
            found = results.find(p => String(p.id) === String(q.project)) || null;
          }
          if (!found) {
            const fallback = await getAllProjects({ page: 1, page_size: 500 });
            const allProjects = fallback?.data?.results || fallback?.results || [];
            found = allProjects.find(p => String(p.id) === String(q.project)) || null;
          }
          if (found) setProject(found);
        } catch { /* project details are optional */ }
      }

      if (q.created_by) {
        try {
          const u = await getUserById(q.created_by);
          if (u) {
            setCreatedByName(`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || '');
          }
        } catch { /* creator details are optional */ }
      }

      setTimeout(() => setVisible(true), 60);
    } catch (e) {
      setFetchError(e.message || 'Failed to load quotation details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); window.scrollTo(0, 0); }, [fetchData]);

  // ── Edit mode state ────────────────────────────────────────────────────────
  const [editMode,    setEditMode]    = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [editSacCode,  setEditSacCode]  = useState('');
  const [editGstRate,  setEditGstRate]  = useState(0);
  const [editDiscRate, setEditDiscRate] = useState(0);
  const [editItems,    setEditItems]    = useState([]);
  const [editCompany,  setEditCompany]  = useState(1);
  const [companyDropOpen, setCompanyDropOpen] = useState(false);
  const [dropdownPos,    setDropdownPos]    = useState({ top: 0, left: 0 });
  const companyDropRef  = useRef(null);
  const companyBtnRef   = useRef(null);

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

  const [showAddSection, setShowAddSection] = useState(false);

  const fetchDescriptionsForModal = async (categoryId, subCategoryId) => {
    const res = await getComplianceByCategory(categoryId, subCategoryId || null);
    if (res?.status === 'success' && res?.data?.results) return res.data.results;
    return [];
  };

  const handleComplianceSave = (newFlatItems) => {
    const EXECUTION_CATS = [5, 6, 7];
    const normalized = newFlatItems.map(item => {
      // ── CRITICAL: compliance_category MUST come from the item that was
      // actually saved in the modal (i.e. the category tab the user was on
      // when they clicked "Add Item"). Never default/fallback here — an
      // incorrect category is worse than an error, because it silently saves
      // the item under the wrong compliance section.
      const complianceCat = parseInt(item.compliance_category);
      if (!complianceCat) {
        // Safety guard: if somehow the modal sent an item with no category,
        // log it loudly and skip it rather than saving garbage data.
        console.error('[handleComplianceSave] Item has no compliance_category — skipping:', item);
        return null;
      }
      const isExec = EXECUTION_CATS.includes(complianceCat);
      const base = {
        id:                      null,
        // compliance_category is the field that determines which section this
        // item appears under. It must ALWAYS be set from the item, never inferred.
        compliance_category:     complianceCat,
        sub_compliance_category: parseInt(item.sub_compliance_category) || 0,
        description:             String(item.description || '').trim(),
        quantity:                parseInt(item.quantity) || 1,
        // null for empty unit — backend stores null, UI shows "—"
        unit:                    String(item.unit || '').trim() || null,
        Professional_amount:     parseFloat(item.Professional_amount) || 0,
        total_amount:            parseFloat(item.total_amount) || 0,
      };
      if (isExec) {
        return {
          ...base,
          sac_code:        String(item.sac_code || '').trim() || null,
          material_rate:   parseFloat(item.material_rate)   || 0,
          material_amount: parseFloat(item.material_amount) || 0,
          labour_rate:     parseFloat(item.labour_rate)     || 0,
          labour_amount:   parseFloat(item.labour_amount)   || 0,
        };
      } else {
        const miscRaw = item.miscellaneous_amount ?? item.consultancy_charges ?? '';
        return {
          ...base,
          consultancy_charges: (miscRaw === '--' || miscRaw === '' || miscRaw == null) ? '0' : String(miscRaw),
        };
      }
    }).filter(Boolean); // remove any nulls from the safety guard above

    if (normalized.length === 0) return; // nothing valid to add
    setEditItems(prev => [...prev, ...normalized]);
    setShowAddSection(false);
  };

  const enterEditMode = () => {
    if (!quotation) return;
    if (String(quotation.status) === '3' || String(quotation.status_display || '').toLowerCase() === 'sent') return;
    const qTypeLocal = (quotation.quotation_type || '').toLowerCase();
    const isExec     = qTypeLocal.includes('execution');
    setEditSacCode(quotation.sac_code || '');
    setEditGstRate(parseFloat(quotation.gst_rate || 0));
    setEditDiscRate(parseFloat(quotation.discount_rate || 0));
    setEditCompany(parseInt(quotation.company) || 1);
    setEditItems((quotation.items || []).map(it => ({
      id:                      it.id,
      description:             it.description || it.compliance_name || '',
      quantity:                parseInt(it.quantity) || 1,
      unit:                    it.unit && it.unit !== 'N/A' ? it.unit : null,
      compliance_category:     it.compliance_category ?? (isExec ? 5 : 1),
      sub_compliance_category: it.sub_compliance_category ?? 0,
      total_amount:            parseFloat(it.total_amount || 0),
      Professional_amount:     parseFloat(it.Professional_amount || 0),
      consultancy_charges:     (() => {
        const raw = it.consultancy_charges ?? it.miscellaneous_amount ?? '';
        if (raw === '--' || raw === null || raw === undefined) return '0';
        return String(raw);
      })(),
      material_rate:   parseFloat(it.material_rate   || 0),
      material_amount: parseFloat(it.material_amount || 0),
      labour_rate:     parseFloat(it.labour_rate     || 0),
      labour_amount:   parseFloat(it.labour_amount   || 0),
      sac_code:        it.sac_code || '',
    })));
    setSaveError(''); setSaveSuccess(false);
    setEditMode(true);
  };

  const cancelEditMode = () => { setEditMode(false); setSaveError(''); };

  // ── Edit totals calculation ────────────────────────────────────────────────
  // isGSTApplicable is derived from the current quotation's company field.
  // For companies 2, 3, 4: GST is always 0 regardless of editGstRate input.
  const isGSTApplicable = quotation
    ? (editMode ? parseInt(editCompany) : parseInt(quotation.company)) === GST_APPLICABLE_COMPANY_ID
    : true; // safe default while quotation loads

  const calcEditSubtotal   = () => parseFloat(editItems.reduce((s, it) => s + calcItemTotal(it), 0).toFixed(2));
  const calcEditDiscAmt    = (sub) => parseFloat(((sub * (editDiscRate || 0)) / 100).toFixed(2));
  // GST fix: non-GST companies always return 0, regardless of any editGstRate value
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

      if (field === 'material_rate') {
        const rate = parseFloat(value) || 0;
        updated.material_amount = parseFloat((rate * qty).toFixed(2));
      } else if (field === 'material_amount') {
        const amt = parseFloat(value) || 0;
        updated.material_rate = parseFloat((qty > 0 ? amt / qty : 0).toFixed(6));
      } else if (field === 'labour_rate') {
        const rate = parseFloat(value) || 0;
        updated.labour_amount = parseFloat((rate * qty).toFixed(2));
      } else if (field === 'labour_amount') {
        const amt = parseFloat(value) || 0;
        updated.labour_rate = parseFloat((qty > 0 ? amt / qty : 0).toFixed(6));
      } else if (field === 'quantity') {
        const newQty  = parseInt(value) || 1;
        const matRate = parseFloat(updated.material_rate) || 0;
        const labRate = parseFloat(updated.labour_rate)   || 0;
        if (matRate > 0) updated.material_amount = parseFloat((matRate * newQty).toFixed(2));
        if (labRate > 0) updated.labour_amount   = parseFloat((labRate * newQty).toFixed(2));
      }

      updated.total_amount = calcItemTotal(updated);
      return updated;
    }));
  };

  const removeItem = (idx) => setEditItems(prev => prev.filter((_, i) => i !== idx));

  const handleSaveUpdate = async () => {
    setSaveError('');
    for (const it of editItems) {
      if (!String(it.description).trim()) { setSaveError('All items must have a description.'); return; }
      if ((parseInt(it.quantity) || 0) <= 0) { setSaveError('All quantities must be ≥ 1.'); return; }
    }
    const isExec = (quotation.quotation_type || '').toLowerCase().includes('execution');
    if (!isExec && !editSacCode.trim()) { setSaveError('SAC Code is required.'); return; }
    setSaving(true);

    try {
      const sub   = calcEditSubtotal();
      const disc  = calcEditDiscAmt(sub);
      // GST fix: force 0 for non-GST companies before building payload
      const gst   = isGSTApplicable ? calcEditGstAmt(sub, disc) : 0;
      const grand = sub - disc + gst;

      const rawStatus = quotation.status;
      const STATUS_STR_TO_INT = { draft: 1, pending: 2, sent: 3, approved: 4, completed: 4, failed: 5, rejected: 5 };
      const resolvedStatus = Number.isInteger(rawStatus)
        ? rawStatus
        : (parseInt(rawStatus) || STATUS_STR_TO_INT[String(rawStatus).toLowerCase()] || 1);

      const payload = {
        id:               parseInt(quotation.id),
        quotation_type:   quotation.quotation_type || '',
        client:           quotation.client  ? parseInt(quotation.client)  : null,
        vendor:           quotation.vendor  ? parseInt(quotation.vendor)  : null,
        project:          parseInt(quotation.project),
        company:          parseInt(editCompany) || 1,
        status:           resolvedStatus,
        sac_code:         editSacCode.trim(),
        // GST fix: always send "0.00" for non-GST companies
        gst_rate:         isGSTApplicable
                            ? String(parseFloat(editGstRate  || 0).toFixed(2))
                            : '0.00',
        discount_rate:    String(parseFloat(editDiscRate || 0).toFixed(2)),
        total_amount:     String(sub.toFixed(2)),
        // GST fix: always send "0.00" for non-GST companies
        total_gst_amount: isGSTApplicable
                            ? String(gst.toFixed(2))
                            : '0.00',
        grand_total:      String(grand.toFixed(2)),
        items: editItems.map(it => {
          const rawId  = it.id != null ? parseInt(it.id) : null;
          const itemId = rawId && rawId > 0 ? rawId : null;
          const compCat    = parseInt(it.compliance_category)     || (isExec ? 5 : 1);
          const subCompCat = parseInt(it.sub_compliance_category) || 0;

          if (isExec) {
            const qty     = parseInt(it.quantity) || 1;
            const prof    = parseFloat(it.Professional_amount) || 0;
            const matRate = parseFloat(it.material_rate)   || 0;
            const labRate = parseFloat(it.labour_rate)     || 0;
            const matAmt  = parseFloat(it.material_amount) || (matRate > 0 ? parseFloat((matRate * qty).toFixed(2)) : 0);
            const labAmt  = parseFloat(it.labour_amount)   || (labRate > 0 ? parseFloat((labRate * qty).toFixed(2)) : 0);
            const finalMatRate = matRate > 0 ? matRate : (qty > 0 ? parseFloat((matAmt / qty).toFixed(6)) : 0);
            const finalLabRate = labRate > 0 ? labRate : (qty > 0 ? parseFloat((labAmt / qty).toFixed(6)) : 0);
            const consultancy = (() => {
              const num = parseFloat(String(it.consultancy_charges ?? '').trim());
              return isNaN(num) ? '0.00' : num.toFixed(2);
            })();
            return {
              id:                      itemId,
              description:             String(it.description).trim(),
              quantity:                qty,
              // Empty unit → null so backend stores null and detail page shows "—"
              unit:                    String(it.unit || '').trim() || null,
              sac_code:                String(it.sac_code || '').trim(),
              consultancy_charges:     consultancy,
              Professional_amount:     String(prof.toFixed(2)),
              material_rate:           String(finalMatRate.toFixed(6)),
              material_amount:         String(matAmt.toFixed(2)),
              labour_rate:             String(finalLabRate.toFixed(6)),
              labour_amount:           String(labAmt.toFixed(2)),
              total_amount:            String(calcItemTotal({ ...it, quantity: qty, material_amount: matAmt, labour_amount: labAmt }).toFixed(2)),
              compliance_category:     compCat,
              sub_compliance_category: subCompCat,
            };
          }

          // Regulatory item
          const consultancy = (() => {
            const num = parseFloat(String(it.consultancy_charges ?? it.miscellaneous_amount ?? '').trim());
            return isNaN(num) ? '0.00' : num.toFixed(2);
          })();
          return {
            id:                      itemId,
            description:             String(it.description).trim(),
            quantity:                parseInt(it.quantity) || 1,
            // Empty unit → null so backend stores null and detail page shows "—"
            unit:                    String(it.unit || '').trim() || null,
            consultancy_charges:     consultancy,
            Professional_amount:     String((parseFloat(it.Professional_amount) || 0).toFixed(2)),
            total_amount:            String(parseFloat(calcItemTotal(it).toFixed(2)).toFixed(2)),
            compliance_category:     compCat,
            sub_compliance_category: subCompCat,
          };
        }),
      };

      const updateFn = isExec ? updateExecutionQuotation : updateRegulatoryQuotation;
      const data = await updateFn(payload);

      if (data && (data.id || data.quotation_number || data?.status === 'success')) {
        const updated = data.data || data;
        setQuotation(prev => ({
          ...prev, ...updated,
          company:       editCompany,
          company_name:  QUOTATION_COMPANIES.find(c => c.id === parseInt(editCompany))?.name || prev.company_name,
          sac_code:      editSacCode.trim(),
          gst_rate:      isGSTApplicable ? String(editGstRate) : '0',
          discount_rate: String(editDiscRate),
          total_amount: sub, total_gst_amount: gst, grand_total: grand,
          items: updated.items || editItems.map(it => ({
            ...it,
            total_amount: calcItemTotal(it),
          })),
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
      setSaveError(msg || e.message || 'Failed to update quotation.');
    } finally {
      setSaving(false);
    }
  };

  // ── Download PDF ───────────────────────────────────────────────────────────
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
      const fileName = `${fmtQNum(quotation?.quotation_number) || `Quotation_${id}`}.pdf`;
      await generateQuotationPdf(id, {
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

  const extractTrailing = (numStr) => {
    if (!numStr) return '';
    const s    = String(numStr);
    const last = s.lastIndexOf('-');
    return last >= 0 ? s.substring(last + 1) : s;
  };

  const dismissProformaModal = () =>
    setProformaModal({ open: false, proformaId: null, proformaNum: '', alreadyExists: false, genericError: '' });

  // ── Generate Proforma ──────────────────────────────────────────────────────
  const handleGenerateProforma = async () => {
    if (proformaLoading) return;
    setProformaLoading(true);
    try {
      const data = await createProforma({
        quotation:      Number(id),
        quotation_type: quotation?.quotation_type,
        items:          quotation?.items || [],
      });
      const proformaId  = data?.id || data?.data?.id;
      const proformaNum = String(data?.proforma_number || data?.data?.proforma_number || '');
      setProformaModal({ open: true, proformaId: proformaId || null, proformaNum, alreadyExists: false, genericError: '' });
      try {
        const refreshed = await getQuotationById(id);
        if (refreshed.status === 'success' && refreshed.data) {
          setQuotation(refreshed.data);
        } else {
          setQuotation(prev => prev ? { ...prev, status: '3', status_display: 'sent' } : prev);
        }
      } catch {
        setQuotation(prev => prev ? { ...prev, status: '3', status_display: 'sent' } : prev);
      }
    } catch (e) {
      const backendMessage =
        e?.response?.data?.errors   ||
        e?.response?.data?.message  ||
        e?.response?.data?.detail   ||
        '';
      const errMsg = String(backendMessage || e?.message || '').trim();
      const isAlreadyExists =
        String(errMsg).toLowerCase().includes('already exists') ||
        String(errMsg).toLowerCase().includes('already generated') ||
        e?.response?.status === 400;

      if (isAlreadyExists) {
        let existingId  = null;
        let existingNum = '';
        try {
          const quotationId       = Number(id);
          const quotationTrailing = extractTrailing(quotation.quotation_number || String(id));
          const res = await getProformas({ page: 1, page_size: 100 });
          const results = res?.data?.results || res?.results || [];
          let existing = results.find(p => Number(p.quotation) === quotationId) || null;
          if (!existing && quotationTrailing) {
            existing = results.find(p =>
              String(p.quotation_number || '').endsWith(quotationTrailing) ||
              String(p.reference       || '').endsWith(quotationTrailing)
            ) || null;
          }
          if (existing) { existingId = existing.id; existingNum = existing.proforma_number || ''; }
        } catch { /* existing proforma lookup is best-effort */ }
        setProformaModal({ open: true, proformaId: existingId, proformaNum: existingNum, alreadyExists: true, genericError: '' });
      } else {
        setProformaModal({ open: true, proformaId: null, proformaNum: '', alreadyExists: true, genericError: errMsg || 'Failed to generate proforma.' });
      }
    } finally {
      setProformaLoading(false);
    }
  };

  if (loading)    return <LoadingView />;
  if (fetchError) return <ErrorView message={fetchError} onRetry={fetchData} onBack={() => navigate('/quotations')} />;
  if (!quotation) return <ErrorView message="Quotation not available." onRetry={fetchData} onBack={() => navigate('/quotations')} />;

  // ── Derived values ─────────────────────────────────────────────────────────
  const status     = getStatusWithIcon(quotation.status_display || quotation.status);
  const qNum       = fmtQNum(quotation.quotation_number);
  const subtotal   = parseFloat(quotation.total_amount  || 0);
  const gstRate    = parseFloat(quotation.gst_rate      || 0);
  const discRate   = parseFloat(quotation.discount_rate || 0);
  const discAmt    = parseFloat(((subtotal * discRate) / 100).toFixed(2));
  const taxable    = parseFloat((subtotal - discAmt).toFixed(2));
  const gstAmt     = parseFloat(((taxable * gstRate) / 100).toFixed(2));
  const grandTotal = parseFloat((taxable + gstAmt).toFixed(2));
  const items      = quotation.items || [];
  const groups     = groupItemsByCategory(items);
  const totalQty   = items.reduce((s, it) => s + (parseInt(it.quantity) || 1), 0);

  // Quotation type detection
  const qTypeRaw    = quotation.quotation_type || '';
  const qType       = qTypeRaw.toLowerCase();
  const isExecution   = qType.includes('execution');
  const isArchitecture = !isExecution && (
    qType.includes('architecture') ||
    (items.length > 0 && items.every(it => Number(it.compliance_category ?? it.category) === 8))
  );
  const isRegulatory = !isExecution && !isArchitecture;

  // Display names
  const clientName = quotation.client_name
    ? quotation.client_name
    : client
      ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.email
      : `Client #${quotation.client}`;

  const projName = quotation.project_name
    ? quotation.project_name
    : project
      ? (project.name || project.title || `Project #${quotation.project}`)
      : (quotation.project ? `Project #${quotation.project}` : '—');

  const companyName = quotation.company_name || getQuotationCompanyName(quotation.company) || 'ERP System';
  const projLoc     = project ? [project.city, project.state].filter(Boolean).join(', ') : '';

  // Type badge colors
  const typeColor = isExecution
    ? { text: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' }
    : isArchitecture
      ? { text: '#9333ea', bg: '#fdf4ff', border: '#e9d5ff' }
      : { text: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' };

  return (
    <>
      {/* ─── Global styles (unchanged — every class exactly as original) ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        .vqd-root *{box-sizing:border-box;font-family:'Outfit',sans-serif}
        @keyframes vqd_spin{to{transform:rotate(360deg)}}
        @keyframes vqd_in{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .vqd-root{min-height:100vh;padding:0}
        .vqd-topbar{display:flex;align-items:center;justify-content:space-between;margin:0 0 16px;flex-wrap:wrap;gap:8px}
        .vqd-back{display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;font-size:13px;font-weight:600;color:#475569;padding:6px 10px;border-radius:8px;transition:background .15s,color .15s}
        .vqd-back:hover{background:#e2e8f0;color:#1e293b}
        .vqd-actions{display:flex;gap:8px;flex-wrap:wrap}
        .vqd-btn-o{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;background:linear-gradient(135deg,#0369a1,#0284c7);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;font-family:inherit;box-shadow:0 2px 8px rgba(3,105,161,.25)}
        .vqd-btn-o:hover{background:linear-gradient(135deg,#075985,#0369a1);transform:translateY(-1px);box-shadow:0 4px 12px rgba(3,105,161,.35)}
        .vqd-btn-p{display:flex;align-items:center;gap:6px;padding:7px 16px;border-radius:8px;background:#0f766e;border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:background .15s;font-family:inherit}
        .vqd-btn-p:hover{background:#0d6460}
        .vqd-btn-p:disabled{opacity:.6;cursor:not-allowed}
        .vqd-btn-edit{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;background:#fff;border:1.5px solid #0f766e;color:#0f766e;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;font-family:inherit}
        .vqd-btn-edit:hover{background:#f0fdf4}
        .vqd-btn-proforma{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;background:linear-gradient(135deg,#1d4ed8,#2563eb);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;font-family:inherit;box-shadow:0 2px 8px rgba(37,99,235,.25)}
        .vqd-btn-proforma:hover{background:linear-gradient(135deg,#1e40af,#1d4ed8);transform:translateY(-1px)}
        .vqd-btn-proforma:disabled{opacity:.6;cursor:not-allowed;transform:none}
        .vqd-spin{animation:vqd_spin .7s linear infinite}
        .vqd-doc{background:#fff;border-radius:20px;box-shadow:0 2px 4px rgba(0,0,0,.04),0 12px 40px rgba(0,0,0,.09);overflow:hidden;opacity:0;transform:translateY(16px);transition:opacity .4s ease,transform .4s ease}
        .vqd-doc.in{opacity:1;transform:translateY(0)}
        .vqd-doc.vqd-doc-editing{box-shadow:0 0 0 2.5px #f59e0b,0 2px 4px rgba(0,0,0,.04),0 12px 40px rgba(0,0,0,.09)}
        .vqd-hdr{display:flex;align-items:flex-end;justify-content:space-between;padding:32px 40px 28px;background:linear-gradient(135deg,#0c6e67 0%,#0f766e 40%,#0d9488 80%,#14b8a6 100%);position:relative;overflow:hidden}
        .vqd-hdr::after{content:'';position:absolute;top:-60px;right:-60px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.06);pointer-events:none}
        .vqd-hdr::before{content:'';position:absolute;bottom:-80px;left:30%;width:300px;height:300px;border-radius:50%;background:rgba(255,255,255,.04);pointer-events:none}
        .vqd-hdr-l{position:relative;z-index:1}
        .vqd-hdr-r{text-align:right;position:relative;z-index:1}
        .vqd-logo{display:flex;align-items:center;gap:12px;margin-bottom:16px}
        .vqd-logo-badge{width:46px;height:46px;border-radius:12px;background:rgba(255,255,255,.15);border:1.5px solid rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#fff;letter-spacing:.03em}
        .vqd-co-name{font-size:20px;font-weight:800;color:#fff;letter-spacing:-.02em;line-height:1.1}
        .vqd-co-sub{font-size:12px;color:rgba(255,255,255,.6);font-weight:400;margin-top:2px}
        .vqd-hdr-info{display:flex;flex-direction:column;gap:3px}
        .vqd-doc-label{font-size:10px;font-weight:800;color:rgba(255,255,255,.55);letter-spacing:.18em;text-transform:uppercase}
        .vqd-doc-num{font-size:24px;font-weight:900;color:#fff;letter-spacing:-.02em;font-variant-numeric:tabular-nums;margin-top:3px}
        .vqd-doc-date{font-size:12px;color:rgba(255,255,255,.6);margin-top:5px;font-weight:400}
        .vqd-meta{display:flex;flex-wrap:wrap;align-items:center;gap:0;padding:14px 40px;background:#f8fafc;border-bottom:1.5px solid #e8ecf2}
        .vqd-meta-sep{width:1px;height:30px;background:#e2e8f0;margin:0 18px;flex-shrink:0}
        .vqd-parties{display:grid;grid-template-columns:1fr 24px 1fr 1fr;gap:0;padding:24px 40px;border-bottom:1.5px solid #f0f4f8;align-items:start}
        .vqd-arrow-col{display:flex;align-items:center;justify-content:center;padding-top:28px}
        .vqd-party{display:flex;flex-direction:column;gap:4px;padding-right:24px}
        .vqd-party--proj{padding-left:24px;border-left:1.5px solid #f0f4f8;padding-right:24px}
        .vqd-party--rates{padding-left:24px;border-left:1.5px solid #f0f4f8}
        .vqd-plabel{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px}
        .vqd-pavatar{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#0f766e,#14b8a6);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#fff;margin-bottom:6px}
        .vqd-picon{width:36px;height:36px;border-radius:10px;background:#f0fdf4;border:1.5px solid #bbf7d0;display:flex;align-items:center;justify-content:center;margin-bottom:6px}
        .vqd-pname{font-size:15px;font-weight:800;color:#1e293b;letter-spacing:-.01em}
        .vqd-pdetail{display:flex;align-items:center;gap:5px;font-size:12px;color:#64748b;margin-top:2px}
        .vqd-rates-list{display:flex;flex-direction:column;gap:10px}
        .vqd-rate-row{display:flex;align-items:center;gap:10px}
        .vqd-rate-icon{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .vqd-rate-v{font-size:15px;font-weight:800;color:#1e293b}
        .vqd-rate-l{font-size:11px;color:#94a3b8;font-weight:500;margin-top:1px}
        .vqd-items{padding:0 40px 24px}
        .vqd-sec-hdr{display:flex;align-items:center;gap:8px;padding:20px 0 14px;font-size:14px;font-weight:800;color:#1e293b;letter-spacing:-.01em}
        .vqd-sec-badge{background:#f1f5f9;border-radius:12px;padding:2px 8px;font-size:11px;font-weight:700;color:#64748b}
        .vqd-table-wrap{overflow-x:auto;border-radius:12px;border:1.5px solid #f0f4f8}
        .vqd-table{width:100%;border-collapse:collapse;font-size:13px}
        .vqd-table thead th{padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;background:#f8fafc;border-bottom:1.5px solid #f0f4f8;white-space:nowrap}
        .vqd-cat-row td{padding:8px 12px;background:#f8fafc;border-top:1.5px solid #f0f4f8}
        .vqd-cat-inner{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;color:#374151}
        .vqd-cat-dot{width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#0f766e,#14b8a6);flex-shrink:0}
        .vqd-cat-cnt{background:#e0f2fe;color:#0369a1;font-size:10px;font-weight:700;padding:1px 6px;border-radius:8px}
        .vqd-row td{padding:10px 12px;border-top:1px solid #f8fafc;vertical-align:top}
        .vqd-row:hover td{background:#fafffe}
        .vqd-row-idx{text-align:center;font-size:11px;color:#d1d5db;font-weight:700;width:32px}
        .vqd-desc{font-size:13px;color:#1e293b;font-weight:500;line-height:1.5}
        .vqd-subcat{display:inline-flex;align-items:center;padding:2px 8px;background:#eff6ff;color:#1d4ed8;border-radius:8px;font-size:10px;font-weight:700}
        .vqd-qty-badge{display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:22px;background:#f1f5f9;border-radius:6px;font-size:12px;font-weight:700;color:#475569;padding:0 5px}
        .vqd-cat-sub td{padding:6px 12px;background:#fafffe;border-top:1px solid #f0f4f8}
        .vqd-misc-note{font-size:11px;color:#d97706;background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:2px 6px;font-style:italic}
        .vqd-foot{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:24px 40px;border-top:1.5px solid #f0f4f8}
        .vqd-sum-title{font-size:13px;font-weight:800;color:#1e293b;margin-bottom:12px}
        .vqd-sum-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .vqd-sum-item{display:flex;flex-direction:column;gap:2px}
        .vqd-sum-lbl{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em}
        .vqd-sum-val{font-size:13px;font-weight:700;color:#1e293b}
        .vqd-remarks{margin-top:14px;padding:12px 14px;background:#f8fafc;border-radius:10px;border:1px solid #e8ecf2}
        .vqd-rem-title{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
        .vqd-rem-text{font-size:12.5px;color:#475569;line-height:1.6;margin:0}
        .vqd-tbox{background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:14px;padding:20px 22px}
        .vqd-tbox-title{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:14px;display:flex;align-items:center;gap:6px}
        .vqd-trow{display:flex;justify-content:space-between;align-items:center;font-size:13px;padding:5px 0;color:#475569}
        .vqd-trow--disc{color:#ea580c}
        .vqd-trow--sub{color:#64748b;font-size:12px}
        .vqd-tdiv{border:none;border-top:1.5px solid #e2e8f0;margin:10px 0}
        .vqd-grand{display:flex;justify-content:space-between;align-items:center;font-size:18px;font-weight:900;color:#1e293b;padding:4px 0}
        .vqd-words{font-size:11px;color:#94a3b8;margin-top:8px;font-style:italic;line-height:1.5}
        .vqd-dl-btn{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;margin-top:14px;padding:11px 0;background:linear-gradient(135deg,#0f766e,#0d9488);border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s}
        .vqd-dl-btn:hover{background:linear-gradient(135deg,#0d6460,#0b7a72);transform:translateY(-1px)}
        .vqd-btn-save{display:flex;align-items:center;gap:6px;padding:7px 16px;border-radius:8px;background:linear-gradient(135deg,#0f766e,#0d9488);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;font-family:inherit}
        .vqd-btn-cancel{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;background:#fff;border:1.5px solid #e2e8f0;font-size:13px;font-weight:600;color:#64748b;cursor:pointer;transition:all .15s;font-family:inherit}
        .vqd-btn-cancel:hover{background:#fef2f2;border-color:#fca5a5;color:#dc2626}
        .vqd-edit-banner{display:flex;align-items:center;gap:10px;padding:10px 18px;background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1.5px solid #fcd34d;border-radius:12px;margin-bottom:14px;animation:vqd_in .25s ease}
        .vqd-edit-input{padding:6px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;font-family:inherit;color:#1e293b;background:#fff;outline:none;transition:border-color .15s,box-shadow .15s;width:100%}
        .vqd-edit-input:focus{border-color:#0f766e;box-shadow:0 0 0 3px rgba(15,118,110,.1)}
        .vqd-edit-input-sm{width:80px;text-align:right}
        .vqd-edit-input-md{width:110px}
        .vqd-exec-edit td{padding:6px 6px;vertical-align:middle}
        .vqd-exec-edit th{padding:7px 6px}
        .vqd-exec-edit .vqd-edit-input{padding:5px 7px;font-size:12px;border-radius:6px}
        .vqd-exec-edit td.col-rate{background:rgba(245,243,255,0.55);border-left:1.5px solid #ddd6fe}
        .vqd-exec-edit td.col-rate-last{background:rgba(245,243,255,0.55);border-right:1.5px solid #ddd6fe}
        .vqd-exec-edit td.col-amt{background:rgba(240,253,244,0.6);border-left:1.5px solid #bbf7d0}
        .vqd-exec-edit td.col-amt-last{background:rgba(240,253,244,0.6);border-right:1.5px solid #bbf7d0}
        .vqd-edit-totals{background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1.5px solid #6ee7b7;border-radius:14px;padding:20px 22px}
        .vqd-save-err{display:flex;align-items:flex-start;gap:8px;background:#fef2f2;border:1.5px solid #fca5a5;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:12.5px;color:#dc2626;line-height:1.5}
        .vqd-success-toast{position:fixed;bottom:28px;right:28px;z-index:9999;display:flex;align-items:center;gap:10px;background:#0f766e;color:#fff;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:600;box-shadow:0 8px 24px rgba(15,118,110,.4);animation:vqd_toast_in .3s cubic-bezier(.16,1,.3,1)}
        @keyframes vqd_toast_in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .vqd-co-edit-wrap{position:relative;display:inline-flex;align-items:center;gap:6px;cursor:pointer}
        .vqd-co-edit-btn{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.25);border-radius:8px;padding:4px 10px;cursor:pointer;transition:all .15s}
        .vqd-co-edit-btn:hover{background:rgba(255,255,255,.2);border-color:rgba(255,255,255,.4)}
        .vqd-co-dropdown{position:fixed;z-index:99999;background:#fff;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.06);min-width:220px;overflow:hidden;animation:vqd_dd_in .18s cubic-bezier(.16,1,.3,1)}
        @keyframes vqd_dd_in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        .vqd-co-dd-header{padding:10px 14px 8px;font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;border-bottom:1px solid #f1f5f9}
        .vqd-co-dd-item{display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;transition:background .12s;font-size:13px;font-weight:600;color:#1e293b}
        .vqd-co-dd-item:hover{background:#f0fdf4}
        .vqd-co-dd-item.active{background:#ecfdf5;color:#0f766e}
        .vqd-co-dd-item .co-check{width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,#0f766e,#14b8a6);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .vqd-co-dd-item .co-dot{width:18px;height:18px;border-radius:50%;border:1.5px solid #e2e8f0;flex-shrink:0}
        .vqd-doc-foot{display:flex;justify-content:space-between;align-items:center;padding:14px 40px;background:#f8fafc;border-top:1.5px solid #e8ecf2;font-size:11px;color:#94a3b8}
        .vqd-exec-rate-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700}
        @media print{.vqd-topbar{display:none}.vqd-root{background:#fff;padding:0}.vqd-doc{box-shadow:none;border-radius:0;opacity:1!important;transform:none!important}.vqd-dl-btn,.vqd-btn-p,.vqd-btn-o{display:none}}
        @media(max-width:700px){
          .vqd-hdr{padding:22px 20px 22px}
          .vqd-meta{padding:12px 20px}
          .vqd-meta-sep{display:none}
          .vqd-parties{grid-template-columns:1fr;padding:20px;gap:16px}
          .vqd-arrow-col{display:none}
          .vqd-party--proj,.vqd-party--rates{padding-left:0;border-left:none;border-top:1.5px solid #f0f4f8;padding-top:16px}
          .vqd-items{padding:0 20px 24px}
          .vqd-foot{grid-template-columns:1fr;padding:20px}
          .vqd-doc-foot{padding:12px 20px;flex-direction:column;gap:4px;text-align:center}
          .vqd-doc-num{font-size:19px}
          .vqd-grand{font-size:16px}
          .vqd-hdr-r{text-align:left;margin-top:16px}
          .vqd-hdr{flex-direction:column}
        }
      `}</style>

      <div className="vqd-root">

        {/* ── Top bar ── */}
        <div className="vqd-topbar">
          <button className="vqd-back" onClick={() => editMode ? cancelEditMode() : navigate('/quotations')}>
            <ArrowLeft size={15} /> {editMode ? 'Cancel Edit' : 'Back to Quotations'}
          </button>
          <div className="vqd-actions">
            {editMode ? (
              <>
                <button className="vqd-btn-cancel" onClick={cancelEditMode} disabled={saving}>
                  <RotateCcw size={14} /> Discard Changes
                </button>
                <button className="vqd-btn-save" onClick={handleSaveUpdate} disabled={saving}>
                  {saving ? <><Loader2 size={14} className="vqd-spin" /> Saving…</> : <><Save size={14} /> Save Changes</>}
                </button>
              </>
            ) : (
              <>
                {String(quotation.status) !== '3' && String(quotation.status_display || '').toLowerCase() !== 'sent' ? (
                  <button className="vqd-btn-edit" onClick={enterEditMode}>
                    <Edit2 size={14} /> Update Quotation
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#ecfdf5', border: '1.5px solid #6ee7b7', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#059669' }}>
                    <CheckCircle size={13} /> Proforma Generated
                  </div>
                )}
                <button className="vqd-btn-proforma" onClick={handleGenerateProforma} disabled={proformaLoading}>
                  {proformaLoading ? <><Loader2 size={14} className="vqd-spin" /> Generating…</> : <><FileText size={14} /> Generate Proforma</>}
                </button>
                <button className="vqd-btn-o" onClick={() => setSendModal(true)}>
                  <Mail size={14} /> Send to Client
                </button>
                <button className="vqd-btn-p" onClick={handleDownload} disabled={pdfLoading}>
                  {pdfLoading ? <><Loader2 size={14} className="vqd-spin" /> Generating…</> : <><Download size={14} /> Download PDF</>}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Edit mode banner ── */}
        {editMode && (
          <div className="vqd-edit-banner">
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <PenLine size={15} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>Edit Mode Active</div>
              <div style={{ fontSize: 11, color: '#a16207', marginTop: 1 }}>
                Edit fields inline or click &quot;+ Add Item&quot; to add compliance items. Click &quot;Save Changes&quot; when done.
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
        <div className={`vqd-doc${visible ? ' in' : ''}${editMode ? ' vqd-doc-editing' : ''}`}>

          {/* ══════════ HEADER ══════════ */}
          <div className="vqd-hdr">
            <div className="vqd-hdr-l">
              <div className="vqd-logo">
                <div className="vqd-logo-badge">ERP</div>
                <div>
                  {editMode ? (
                    <div className="vqd-co-edit-wrap">
                      <div
                        ref={companyBtnRef}
                        className="vqd-co-edit-btn"
                        onClick={openCompanyDrop}
                        title="Click to change company"
                      >
                        <span className="vqd-co-name" style={{ fontSize: 17 }}>
                          {QUOTATION_COMPANIES.find(c => c.id === parseInt(editCompany))?.name || companyName}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(255,255,255,.18)', borderRadius: 6, padding: '2px 6px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.9)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                          <PenLine size={9} /> Change
                        </span>
                        <ChevronDown size={13} color="rgba(255,255,255,.7)" style={{ transform: companyDropOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
                      </div>
                    </div>
                  ) : (
                    <div className="vqd-co-name">{companyName}</div>
                  )}
                  <div className="vqd-co-sub">Professional Services</div>
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
                  {isExecution ? <Wrench size={11} /> : <FileText size={11} />}
                  {qTypeRaw || 'Quotation'}
                </span>
              </div>
            </div>
            <div className="vqd-hdr-r">
              <div className="vqd-doc-label">Quotation</div>
              <div className="vqd-doc-num">{qNum}</div>
              <div className="vqd-doc-date">Issued {fmtDate(quotation.created_at)}</div>
            </div>
          </div>

          {/* ══════════ META STRIP ══════════ */}
          <div className="vqd-meta">
            <MetaBlock icon={Calendar} label="Issue Date"   value={fmtDate(quotation.created_at)} />
            <div className="vqd-meta-sep" />
            <MetaBlock icon={Calendar} label="Last Updated" value={fmtDate(quotation.updated_at)} />
            <div className="vqd-meta-sep" />
            {editMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Tag size={10} /> SAC Code <span style={{ color: '#f59e0b' }}>✎</span>
                </span>
                <input
                  className="vqd-edit-input vqd-edit-input-md"
                  value={editSacCode}
                  onChange={e => setEditSacCode(e.target.value.slice(0, 6))}
                  placeholder="e.g. 998313"
                  maxLength={6}
                  style={{ width: 100, fontFamily: 'monospace', fontWeight: 700, color: '#0f766e' }}
                />
              </div>
            ) : (
              <MetaBlock icon={Tag} label="SAC Code" value={quotation.sac_code} accent />
            )}
            <div className="vqd-meta-sep" />
            <MetaBlock icon={Hash} label="Quotation No." value={qNum} accent />
            <div className="vqd-meta-sep" />
            {/* Quotation Type */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Type</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: typeColor.bg, border: `1.5px solid ${typeColor.border}`,
                color: typeColor.text, fontSize: 11, fontWeight: 700,
                padding: '3px 9px', borderRadius: 20,
              }}>
                {isExecution ? <Wrench size={10} /> : <FileText size={10} />}
                {isExecution ? 'Execution' : isArchitecture ? 'Architecture' : 'Regulatory'}
              </span>
            </div>
            {createdByName && <>
              <div className="vqd-meta-sep" />
              <MetaBlock icon={User} label="Prepared By" value={createdByName} />
            </>}
          </div>

          {/* ══════════ PARTIES ══════════ */}
          <div className="vqd-parties">
            {/* Billed To */}
            <div className="vqd-party">
              <div className="vqd-plabel">Billed To</div>
              <div className="vqd-pavatar">{(clientName || 'C').charAt(0).toUpperCase()}</div>
              <div className="vqd-pname">{clientName}</div>
              {client?.email && <div className="vqd-pdetail"><Mail size={11} style={{ opacity: .45, flexShrink: 0 }} />{client.email}</div>}
              {client?.phone && <div className="vqd-pdetail"><Phone size={11} style={{ opacity: .45, flexShrink: 0 }} />{client.phone}</div>}
            </div>

            <div className="vqd-arrow-col"><ChevronRight size={16} style={{ color: '#cbd5e1' }} /></div>

            {/* Project */}
            <div className="vqd-party vqd-party--proj">
              <div className="vqd-plabel">Project</div>
              <div className="vqd-picon"><Building2 size={20} color="#0f766e" /></div>
              <div className="vqd-pname">{projName}</div>
              {projLoc && <div className="vqd-pdetail"><MapPin size={11} style={{ opacity: .45, flexShrink: 0 }} />{projLoc}</div>}
              {quotation.company_name && (
                <div className="vqd-pdetail" style={{ marginTop: 4 }}>
                  <Building2 size={11} style={{ opacity: .45, flexShrink: 0 }} />
                  {quotation.company_name}
                </div>
              )}
            </div>

            {/* Applied Rates */}
            <div className="vqd-party vqd-party--rates">
              <div className="vqd-plabel">Applied Rates {editMode && <span style={{ color: '#f59e0b', fontWeight: 700 }}>— Editable</span>}</div>
              <div className="vqd-rates-list">

                {/* ── GST Rate row
                    ONLY shown for GST-applicable company (ID 1).
                    Companies 2, 3, 4: this entire row is hidden in both
                    view mode AND edit mode. ── */}
                {isGSTApplicable && (
                  <div className="vqd-rate-row">
                    <div className="vqd-rate-icon" style={{ background: '#eff6ff' }}>
                      <Percent size={14} color="#2563eb" />
                    </div>
                    <div style={{ flex: 1 }}>
                      {editMode ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            type="number" min="0" max="100" step="0.01"
                            className="vqd-edit-input vqd-edit-input-sm"
                            value={editGstRate}
                            onChange={e => setEditGstRate(parseFloat(e.target.value) || 0)}
                          />
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>%</span>
                        </div>
                      ) : (
                        <div className="vqd-rate-v">{gstRate}%</div>
                      )}
                      <div className="vqd-rate-l">GST Rate</div>
                    </div>
                  </div>
                )}

                {/* Discount Rate row — always visible for all companies */}
                <div className="vqd-rate-row">
                  <div className="vqd-rate-icon" style={{ background: (editMode ? editDiscRate : discRate) > 0 ? '#fff7ed' : '#f8fafc' }}>
                    <Tag size={14} color={(editMode ? editDiscRate : discRate) > 0 ? '#ea580c' : '#94a3b8'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    {editMode ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="number" min="0" max="100" step="0.01"
                          className="vqd-edit-input vqd-edit-input-sm"
                          value={editDiscRate}
                          onChange={e => setEditDiscRate(parseFloat(e.target.value) || 0)}
                        />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#ea580c' }}>%</span>
                      </div>
                    ) : (
                      <div className="vqd-rate-v" style={{ color: discRate > 0 ? '#ea580c' : '#64748b' }}>
                        {discRate > 0 ? `${discRate}%` : 'Nil'}
                      </div>
                    )}
                    <div className="vqd-rate-l">Discount</div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* ══════════ LINE ITEMS — delegated to QuotationTypeTable ══════════ */}
          <QuotationTypeTable
            isExecution={isExecution}
            isRegulatory={isRegulatory}
            editMode={editMode}
            items={items}
            editItems={editItems}
            updateItem={updateItem}
            removeItem={removeItem}
            onAddItem={() => setShowAddSection(true)}
          />

          {/* ══════════ FOOTER: SUMMARY + TOTALS ══════════ */}
          <div className="vqd-foot">
            {/* Left — Summary */}
            <div>
              <div className="vqd-sum-title">Quotation Summary</div>
              <div className="vqd-sum-grid">
                <div className="vqd-sum-item">
                  <span className="vqd-sum-lbl">Quotation Type</span>
                  <span className="vqd-sum-val" style={{ color: isExecution ? '#7c3aed' : '#0369a1' }}>{qTypeRaw || '—'}</span>
                </div>
                <div className="vqd-sum-item">
                  <span className="vqd-sum-lbl">Total Items</span>
                  <span className="vqd-sum-val">{items.length}</span>
                </div>
                <div className="vqd-sum-item">
                  <span className="vqd-sum-lbl">Total Quantity</span>
                  <span className="vqd-sum-val">{totalQty}</span>
                </div>
                <div className="vqd-sum-item">
                  <span className="vqd-sum-lbl">Compliance Groups</span>
                  <span className="vqd-sum-val">{groups.length}</span>
                </div>
                <div className="vqd-sum-item">
                  <span className="vqd-sum-lbl">SAC Code</span>
                  <span className="vqd-sum-val" style={{ color: '#0f766e', fontFamily: 'monospace' }}>{quotation.sac_code || '—'}</span>
                </div>
                <div className="vqd-sum-item">
                  <span className="vqd-sum-lbl">Status</span>
                  <span><StatusPill status={status} /></span>
                </div>
                <div className="vqd-sum-item">
                  <span className="vqd-sum-lbl">Client</span>
                  <span className="vqd-sum-val">{clientName}</span>
                </div>
                <div className="vqd-sum-item">
                  <span className="vqd-sum-lbl">Project</span>
                  <span className="vqd-sum-val">{projName}</span>
                </div>
                <div className="vqd-sum-item">
                  <span className="vqd-sum-lbl">Company</span>
                  <span className="vqd-sum-val">{companyName}</span>
                </div>
                {createdByName && (
                  <div className="vqd-sum-item">
                    <span className="vqd-sum-lbl">Prepared By</span>
                    <span className="vqd-sum-val">{createdByName}</span>
                  </div>
                )}
                <div className="vqd-sum-item">
                  <span className="vqd-sum-lbl">Issue Date</span>
                  <span className="vqd-sum-val">{fmtDate(quotation.created_at)}</span>
                </div>
                <div className="vqd-sum-item">
                  <span className="vqd-sum-lbl">Last Updated</span>
                  <span className="vqd-sum-val">{fmtDate(quotation.updated_at)}</span>
                </div>
              </div>

              {/* Execution cost breakdown hint */}
              {isExecution && items.length > 0 && (
                <div style={{ marginTop: 14, padding: '12px 14px', background: '#f5f3ff', border: '1.5px solid #ddd6fe', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Wrench size={11} /> Execution Cost Breakdown
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Professional</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginTop: 2 }}>
                        ₹&nbsp;{fmtINR(items.reduce((s, it) => s + (hasExecutionRateBreakdown(it) ? 0 : ((parseFloat(it.Professional_amount || 0) || 0) * (parseInt(it.quantity) || 1))), 0))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Material</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginTop: 2 }}>
                        ₹&nbsp;{fmtINR(items.reduce((s, it) => s + getExecutionDisplayValues(it).matAmt, 0))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Labour</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginTop: 2 }}>
                        ₹&nbsp;{fmtINR(items.reduce((s, it) => s + getExecutionDisplayValues(it).labAmt, 0))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {quotation.notes && (
                <div className="vqd-remarks">
                  <div className="vqd-rem-title">Notes</div>
                  <p className="vqd-rem-text">{quotation.notes}</p>
                </div>
              )}
              {quotation.terms && (
                <div className="vqd-remarks">
                  <div className="vqd-rem-title">Terms &amp; Conditions</div>
                  <p className="vqd-rem-text">{quotation.terms}</p>
                </div>
              )}
            </div>

            {/* Right — Totals */}
            <div>
              {editMode ? (
                (() => {
                  const eSub   = calcEditSubtotal();
                  const eDisc  = calcEditDiscAmt(eSub);
                  const eTax   = parseFloat((eSub - eDisc).toFixed(2));
                  // GST fix: calcEditGstAmt already returns 0 for non-GST companies
                  const eGst   = calcEditGstAmt(eSub, eDisc);
                  const eGrand = calcEditGrandTotal();
                  return (
                    <div className="vqd-edit-totals">
                      <div className="vqd-tbox-title" style={{ color: '#065f46' }}>
                        Live Calculation
                        <span style={{ marginLeft: 6, fontSize: 9, background: '#059669', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>EDIT MODE</span>
                      </div>
                      <div className="vqd-trow"><span>Subtotal</span><span style={{ fontWeight: 700, color: '#1e293b' }}>₹&nbsp;{fmtINR(eSub)}</span></div>
                      {eDisc > 0 && <>
                        <div className="vqd-trow vqd-trow--disc"><span>Discount ({editDiscRate}%)</span><span style={{ fontWeight: 700 }}>−&nbsp;₹&nbsp;{fmtINR(eDisc)}</span></div>
                        <div className="vqd-trow vqd-trow--sub"><span>Taxable Amount</span><span>₹&nbsp;{fmtINR(eTax)}</span></div>
                      </>}
                      {/* GST fix: only show GST line in Live Calculation for GST-applicable company */}
                      {isGSTApplicable && eGst > 0 && (
                        <div className="vqd-trow"><span>GST ({editGstRate}%)</span><span style={{ fontWeight: 700, color: '#1e293b' }}>+&nbsp;₹&nbsp;{fmtINR(eGst)}</span></div>
                      )}
                      <hr className="vqd-tdiv" />
                      <div className="vqd-grand" style={{ fontSize: 21 }}>
                        <span>Grand Total</span>
                        <span style={{ color: '#059669' }}>₹&nbsp;{fmtINR(eGrand)}</span>
                      </div>
                      <div className="vqd-words"><strong style={{ color: '#94a3b8', fontStyle: 'normal' }}>In words: </strong>{numberToWords(eGrand)} Rupees only</div>
                      <button className="vqd-btn-save" onClick={handleSaveUpdate} disabled={saving} style={{ width: '100%', marginTop: 14, padding: 11, justifyContent: 'center', borderRadius: 10, fontFamily: 'inherit' }}>
                        {saving ? <><Loader2 size={15} className="vqd-spin" /> Saving…</> : <><Save size={15} /> Save Changes</>}
                      </button>
                      {saveError && (
                        <div className="vqd-save-err" style={{ marginTop: 8 }}>
                          <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} /> {saveError}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="vqd-tbox">
                  <div className="vqd-tbox-title">Amount Due</div>
                  <div className="vqd-trow"><span>Subtotal</span><span style={{ fontWeight: 700, color: '#1e293b' }}>₹&nbsp;{fmtINR(subtotal)}</span></div>
                  {discAmt > 0 && <>
                    <div className="vqd-trow vqd-trow--disc"><span>Discount ({discRate}%)</span><span style={{ fontWeight: 700 }}>−&nbsp;₹&nbsp;{fmtINR(discAmt)}</span></div>
                    <div className="vqd-trow vqd-trow--sub"><span>Taxable Amount</span><span>₹&nbsp;{fmtINR(taxable)}</span></div>
                  </>}
                  {gstAmt > 0 && <div className="vqd-trow"><span>GST ({gstRate}%)</span><span style={{ fontWeight: 700, color: '#1e293b' }}>+&nbsp;₹&nbsp;{fmtINR(gstAmt)}</span></div>}
                  <hr className="vqd-tdiv" />
                  <div className="vqd-grand"><span>Grand Total</span><span>₹&nbsp;{fmtINR(grandTotal)}</span></div>
                  <div className="vqd-words"><strong style={{ color: '#94a3b8', fontStyle: 'normal' }}>In words: </strong>{numberToWords(grandTotal)} Rupees only</div>
                </div>
              )}
              {!editMode && (
                <button className="vqd-dl-btn" onClick={handleDownload} disabled={pdfLoading}>
                  {pdfLoading ? <><Loader2 size={15} className="vqd-spin" /> Generating PDF…</> : <><Download size={15} /> Download PDF</>}
                </button>
              )}
            </div>
          </div>

          {/* ══════════ DOC FOOTER ══════════ */}
          <div className="vqd-doc-foot">
            <span>This is a system-generated quotation. Prices are valid for 30 days from the issue date.</span>
            <span>{qNum}&nbsp;·&nbsp;{fmtDate(quotation.created_at)}</span>
          </div>

        </div>{/* end .vqd-doc */}

        {/* ══════════ NOTES SECTION ══════════ */}
        {!loading && quotation && (
          <Notes entityType={NOTE_ENTITY.QUOTATION} entityId={quotation.id} />
        )}

      </div>{/* end .vqd-root */}

      {/* ══════════ DOWNLOAD QUOTATION PDF MODAL ══════════ */}
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
              <div style={{ background: 'linear-gradient(135deg,#0c6e67 0%,#0f766e 45%,#0d9488 100%)', padding: '20px 24px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,.18)', border: '1.5px solid rgba(255,255,255,.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileSearch size={17} color="#fff" />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-.01em' }}>Download Quotation PDF</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.65)', marginTop: 2 }}>{qNum}</div>
                    </div>
                  </div>
                  <button onClick={() => !pdfLoading && setShowPdfModal(false)} style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.25)', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <X size={14} />
                  </button>
                </div>
              </div>

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
                      placeholder="Enter company / client name"
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
                      placeholder="e.g. Quotation for Plumbing Services"
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
                          style={{ flex: 1, padding: '7px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                        />
                        {pdfExtraNotes.length > 1 && (
                          <button
                            onClick={() => setPdfExtraNotes(prev => prev.filter((_, i) => i !== ni))}
                            style={{ padding: '6px 10px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, cursor: 'pointer', color: '#dc2626', fontSize: 12 }}
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => setPdfExtraNotes(prev => [...prev, ''])}
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
                    style={{ flex: 1, padding: '8px 0', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmPdfDownload}
                    disabled={pdfLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 22px', borderRadius: 9, border: 'none', background: pdfLoading ? '#d1d5db' : 'linear-gradient(135deg,#0f766e,#0d9488)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: pdfLoading ? 'not-allowed' : 'pointer', boxShadow: pdfLoading ? 'none' : '0 2px 8px rgba(15,118,110,.3)', fontFamily: 'inherit', transition: 'all .15s' }}
                  >
                    {pdfLoading
                      ? <><Loader2 size={13} className="vqd-spin" /> Generating…</>
                      : <><Download size={13} /> Generate &amp; Download</>
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ ADD COMPLIANCE MODAL ══════════ */}
      <AddComplianceModal
        isOpen={showAddSection}
        onClose={() => setShowAddSection(false)}
        onSave={handleComplianceSave}
        existingItems={editItems}
        fetchDescriptions={fetchDescriptionsForModal}
        quotationType={quotation?.quotation_type || ''}
      />

      {/* ── Send to Client Modal ── */}
      <SendEmailModal
        isOpen={sendModal}
        onClose={() => setSendModal(false)}
        title="Send Quotation to Client"
        defaultRecipient={client?.email || ''}
        defaultSubject={`Quotation ${qNum}${quotation.created_at ? ` — Issued ${fmtDate(quotation.created_at)}` : ''}`}
        defaultBody={`Dear ${client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Client' : 'Client'},\n\nPlease find attached your quotation ${qNum}${quotation.created_at ? `, issued on ${fmtDate(quotation.created_at)}` : ''}.\n\nKindly review the details and feel free to reach out if you have any questions.\n\nBest regards,\n${companyName}`}
      />

      {/* ── Proforma Already Exists Toast ── */}
      {proformaModal.open && proformaModal.alreadyExists && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
          background: '#fff', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,.14), 0 0 0 1px rgba(0,0,0,.06)',
          display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
          maxWidth: 380, width: '100%',
          animation: 'vqd_toast_in .3s cubic-bezier(.16,1,.3,1)',
          borderLeft: '4px solid #f59e0b',
          fontFamily: "'Outfit', sans-serif",
        }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fffbeb', border: '1.5px solid #fcd34d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={16} color="#d97706" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>Proforma Already Exists</div>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 10 }}>A proforma has already been generated for this quotation.</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {proformaModal.proformaId && (
                <button
                  onClick={() => { dismissProformaModal(); navigate(`/proforma/${proformaModal.proformaId}`); }}
                  style={{ padding: '5px 12px', background: 'linear-gradient(135deg,#059669,#0891b2)', border: 'none', borderRadius: 7, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <FileText size={11} /> {proformaModal.proformaNum ? `View ${proformaModal.proformaNum}` : 'View Proforma'}
                </button>
              )}
              <button
                onClick={() => { dismissProformaModal(); navigate('/proforma'); }}
                style={{ padding: '5px 12px', background: '#0f766e', border: 'none', borderRadius: 7, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <FileText size={11} /> View Proforma List
              </button>
              <button onClick={dismissProformaModal}
                style={{ padding: '5px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 7, color: '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >Dismiss</button>
            </div>
          </div>
          <button onClick={dismissProformaModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, flexShrink: 0, lineHeight: 1 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Proforma Generated Success Modal ── */}
      {proformaModal.open && !proformaModal.alreadyExists && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <style>{`
            @keyframes vqd_modal_in{from{opacity:0;transform:scale(.92) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}
            @keyframes vqd_pulse_ring{0%{transform:scale(1);opacity:.6}70%{transform:scale(1.18);opacity:0}100%{transform:scale(1.18);opacity:0}}
          `}</style>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={dismissProformaModal} />
          <div
            style={{ position: 'relative', zIndex: 1, background: '#fff', borderRadius: 24, boxShadow: '0 40px 100px rgba(0,0,0,.22)', width: '100%', maxWidth: 400, overflow: 'hidden', animation: 'vqd_modal_in .32s cubic-bezier(.16,1,.3,1)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ height: 5, background: 'linear-gradient(90deg,#0f766e,#0d9488,#14b8a6)' }} />
            <div style={{ padding: '36px 32px 28px', textAlign: 'center' }}>
              <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid #6ee7b7', animation: 'vqd_pulse_ring 1.8s ease-out infinite' }} />
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#ecfdf5,#d1fae5)', border: '2px solid #6ee7b7', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(5,150,105,.2)' }}>
                  <CheckCircle size={38} color="#059669" />
                </div>
              </div>
              <div style={{ fontSize: 21, fontWeight: 800, color: '#1e293b', letterSpacing: '-.02em', marginBottom: 8 }}>Proforma Generated!</div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, marginBottom: 6 }}>Your proforma has been successfully created and is ready to review.</div>
              {proformaModal.proformaNum && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 20, padding: '6px 16px', margin: '6px 0 24px', fontSize: 13, fontWeight: 700, color: '#0f766e' }}>
                  <FileText size={13} /> {proformaModal.proformaNum}
                </div>
              )}
              {!proformaModal.proformaNum && <div style={{ marginBottom: 24 }} />}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={() => { dismissProformaModal(); navigate(`/proforma/${proformaModal.proformaId}`); }}
                  style={{ width: '100%', padding: '13px 20px', background: 'linear-gradient(135deg,#0f766e,#0d9488)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}
                >
                  <FileText size={15} /> View Proforma
                </button>
                <button
                  onClick={() => { dismissProformaModal(); navigate('/proforma'); }}
                  style={{ width: '100%', padding: '12px 20px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Go to Proforma List
                </button>
                <button
                  onClick={dismissProformaModal}
                  style={{ width: '100%', padding: '10px 20px', background: 'none', border: 'none', borderRadius: 12, color: '#94a3b8', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Stay on this Quotation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Save Success toast ── */}
      {saveSuccess && (
        <div className="vqd-success-toast">
          <CheckCircle size={17} />
          Quotation updated successfully!
        </div>
      )}

      {/* ── Company dropdown — fixed so it escapes overflow:hidden parents ── */}
      {companyDropOpen && (
        <div
          ref={companyDropRef}
          className="vqd-co-dropdown"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          <div className="vqd-co-dd-header">Select Company</div>
          {QUOTATION_COMPANIES.map(co => {
            const isActive = parseInt(editCompany) === co.id;
            return (
              <div
                key={co.id}
                className={`vqd-co-dd-item${isActive ? ' active' : ''}`}
                onClick={() => { setEditCompany(co.id); setCompanyDropOpen(false); }}
              >
                {isActive
                  ? <span className="co-check"><svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
                  : <span className="co-dot" />
                }
                {co.name}
                {co.id === 1 && <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '1px 6px' }}>GST</span>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}