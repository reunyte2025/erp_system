import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Download, Loader2, AlertCircle,
  CheckCircle, Clock, Send, FileText, XCircle,
  Building2, User, MapPin, Hash, Calendar,
  Tag, Percent, ChevronRight, ChevronDown, Mail, FileEdit,
  ThumbsUp, ThumbsDown, Receipt,
  Edit2, Save, RotateCcw, Plus, Trash2, PenLine,
  Edit, X, FileSearch, Wrench,
} from 'lucide-react';
import { getProformaById, updateProformaFull, getComplianceByCategory, sendProformaForApproval, approveProforma, rejectProforma, generateConstructiveProformaPdf, generateOtherProformaPdf } from '../../services/proforma';
import { createRegulatoryInvoice, createExecutionInvoice } from '../../services/invoices';
import { getClientById } from '../../services/clients';
import { getProjects } from '../../services/projects';
import { useRole } from '../../components/RoleContext';
import { getQuotationCompanyName, QUOTATION_COMPANIES } from '../../services/quotation';
import api from '../../services/api';
import AddComplianceModal from '../../components/AddComplianceModal/AddcomplianceModal';
import Notes from '../../components/Notes';
import { NOTE_ENTITY } from '../../services/notes';
import SendEmailModal from '../../components/SendEmailModal/SendEmailModal';

// ─── Helpers & constants (from shared module) ────────────────────────────────
import {
  COMPLIANCE_CATEGORIES,
  SUB_COMPLIANCE_CATEGORIES,
  COMPLIANCE_GROUPS,
  fmtPNum,
  fmtINR,
  fmtDate,
  groupItemsByCategory,
  getComplianceType,
  numberToWords,
  calcItemTotal,
  getExecutionDisplayValues,
  hasExecutionRateBreakdown,
} from '../../services/proformaHelpers';

// ─── Table component ─────────────────────────────────────────────────────────
import ProformaTypeTable from './ProformaTypeTable';

// ─── Company GST applicability ────────────────────────────────────────────────
// Company ID 1 (Constructive India) is GST applicable.
// Company IDs 2, 3, 4 are NOT GST applicable.
const GST_APPLICABLE_COMPANY_ID = 1;

// Actual backend status values from Proforma model:
//   draft | sent | approved | rejected | expired
const STATUS_CONFIG = {
  'draft':             { label: 'Draft',             Icon: FileText,    color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  'sent':              { label: 'Sent for Approval', Icon: Clock,       color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  'approved':          { label: 'Approved',          Icon: CheckCircle, color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  'rejected':          { label: 'Rejected',          Icon: XCircle,     color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  'expired':           { label: 'Expired',           Icon: XCircle,     color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
  // Human-readable display string alias
  'sent for approval': { label: 'Sent for Approval', Icon: Clock,       color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
};

// getStatus with Icon — overrides the pure helper so Icon is available in JSX.
// Accepts a raw status string OR a row/proforma object (checks status_display first).
const getStatusWithIcon = (s) => {
  if (s && typeof s === 'object') {
    const display = String(s.status_display || '').toLowerCase().trim();
    if (display && STATUS_CONFIG[display]) return STATUS_CONFIG[display];
    const raw = String(s.status || '').toLowerCase().trim();
    if (raw && STATUS_CONFIG[raw]) return STATUS_CONFIG[raw];
    return STATUS_CONFIG['draft'];
  }
  const key = String(s || '').toLowerCase().trim();
  return STATUS_CONFIG[key] || STATUS_CONFIG['draft'];
};

// ─── Sub-components ───────────────────────────────────────────────────────────

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
    <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#0f766e', animation: 'vpd_spin .75s linear infinite' }} />
    <p style={{ fontSize: 14, fontWeight: 500, color: '#64748b', margin: 0 }}>Loading proforma…</p>
    <style>{`@keyframes vpd_spin{to{transform:rotate(360deg)}}`}</style>
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
        <button onClick={onBack} style={{ padding: '8px 20px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Back</button>
      </div>
    </div>
  </div>
);

// ─── Quick Info Card ──────────────────────────────────────────────────────────

const QuickInfoCard = ({ proforma, client, project }) => {
  const [activeTab, setActiveTab] = useState('info');

  const clientDisplayName = client
    ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unknown Client'
    : `Client #${proforma.client}`;

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e8ecf2', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>

      {/* Card header */}
      <div style={{ padding: '13px 16px 0', borderBottom: '1.5px solid #f0f4f8' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 10 }}>Quick Info</div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {[
            { key: 'info',     label: '📌 Details'  },
            { key: 'timeline', label: '🕐 Timeline' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              flex: 1, padding: '8px 4px 10px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
              color: activeTab === key ? '#0f766e' : '#94a3b8',
              borderBottom: activeTab === key ? '2.5px solid #0f766e' : '2.5px solid transparent',
              transition: 'all .15s',
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Details tab */}
      {activeTab === 'info' && (
        <div style={{ padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Client */}
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid #e8ecf2' }}>
            <div style={{ background: '#f8fafc', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 7, borderBottom: '1px solid #f0f4f8' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#0f766e,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={11} color="#fff" />
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '.1em' }}>Billed To</span>
            </div>
            <div style={{ padding: '10px 12px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{clientDisplayName}</div>
              {client?.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b', marginBottom: 3 }}>
                  <Mail size={10} style={{ flexShrink: 0 }} /> {client.email}
                </div>
              )}
              {client?.phone_number && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b' }}>
                  <Hash size={10} style={{ flexShrink: 0 }} /> {client.phone_number}
                </div>
              )}
            </div>
          </div>

          {/* Project */}
          {project && (
            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid #bbf7d0' }}>
              <div style={{ background: '#f0fdf4', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 7, borderBottom: '1px solid #d1fae5' }}>
                <div style={{ width: 22, height: 22, borderRadius: 7, background: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Building2 size={11} color="#fff" />
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '.1em' }}>Project</span>
              </div>
              <div style={{ padding: '10px 12px', background: '#fafffe' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 3 }}>{project.name || project.title}</div>
                {(project.city || project.state) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b' }}>
                    <MapPin size={10} style={{ flexShrink: 0 }} />
                    {[project.city, project.state].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Key Dates */}
          <div style={{ borderRadius: 12, border: '1.5px solid #e8ecf2', overflow: 'hidden' }}>
            <div style={{ background: '#f8fafc', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 7, borderBottom: '1px solid #f0f4f8' }}>
              <div style={{ width: 22, height: 22, borderRadius: 7, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Calendar size={11} color="#fff" />
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '.1em' }}>Key Dates</span>
            </div>
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { label: 'Issue Date',    value: fmtDate(proforma.issue_date || proforma.created_at) },
                { label: 'Valid Until',   value: fmtDate(proforma.valid_until) },
                { label: 'Last Updated', value: fmtDate(proforma.updated_at) },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rates */}
          <div style={{ borderRadius: 12, border: '1.5px solid #e8ecf2', overflow: 'hidden' }}>
            <div style={{ background: '#f8fafc', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 7, borderBottom: '1px solid #f0f4f8' }}>
              <div style={{ width: 22, height: 22, borderRadius: 7, background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Percent size={11} color="#fff" />
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '.1em' }}>Applied Rates</span>
            </div>
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { label: 'GST Rate',  value: `${parseFloat(proforma.gst_rate || 0)}%`,       color: '#2563eb' },
                { label: 'Discount',  value: parseFloat(proforma.discount_rate || 0) > 0 ? `${parseFloat(proforma.discount_rate)}%` : 'Nil', color: '#ea580c' },
                { label: 'SAC Code', value: proforma.sac_code || '—',                          color: '#0f766e' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {proforma.notes && (
            <div style={{ background: '#fffbeb', borderRadius: 12, padding: '10px 12px', border: '1.5px solid #fcd34d' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 5 }}>📝 Notes</div>
              <p style={{ margin: 0, fontSize: 12, color: '#78350f', lineHeight: 1.65 }}>{proforma.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Timeline tab — driven by proforma.metadata */}
      {activeTab === 'timeline' && (() => {
        const entries = proforma.metadata || [];

        const getEventStyle = (event = '') => {
          const e = event.toLowerCase();
          if (e.includes('approved'))          return { color: '#059669', bg: '#ecfdf5', border: '#bbf7d0', dot: '✅' };
          if (e.includes('rejected'))          return { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', dot: '❌' };
          if (e.includes('sent for approval')) return { color: '#d97706', bg: '#fffbeb', border: '#fcd34d', dot: '⏳' };
          if (e.includes('updated'))           return { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', dot: '✏️' };
          if (e.includes('proforma created'))  return { color: '#0f766e', bg: '#f0fdf4', border: '#bbf7d0', dot: '📄' };
          if (e.includes('quotation created')) return { color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', dot: '📋' };
          return { color: '#475569', bg: '#f8fafc', border: '#e2e8f0', dot: '🔵' };
        };

        const fmtMetaTime = (ts) => {
          if (!ts) return '';
          try {
            const d = new Date(ts.replace(' ', 'T'));
            return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
          } catch { return String(ts).slice(0, 16); }
        };

        if (entries.length === 0) {
          return (
            <div style={{ padding: '28px 14px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
              No timeline events yet.
            </div>
          );
        }

        return (
          <div style={{ padding: '14px 14px', position: 'relative', maxHeight: 400, overflowY: 'auto' }}>
            <div style={{ position: 'absolute', left: 33, top: 24, bottom: 24, width: 2, background: 'linear-gradient(to bottom,#0d9488 0%,#e2e8f0 100%)', borderRadius: 2, zIndex: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative', zIndex: 1 }}>
              {entries.map((ev, i) => {
                const style  = getEventStyle(ev.event || '');
                const ts     = ev.timestamp || ev.timespan || '';
                const isLast = i === entries.length - 1;
                return (
                  <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: isLast ? 0 : 16, position: 'relative' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: style.bg, border: `1.5px solid ${style.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, zIndex: 1, position: 'relative' }}>
                      {style.dot}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: style.color, lineHeight: 1.3 }}>{ev.event || 'Event'}</div>
                      {ev.reason && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 1.4 }}>Reason: {ev.reason}</div>}
                      {ev.updated_by && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>By: {ev.updated_by}</div>}
                      {ts && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{fmtMetaTime(ts)}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
};


// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ViewProformaDetails({ onUpdateNavigation }) {
  const { id }   = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // proformaType may be passed via navigate() state from the list page:
  //   navigate(`/proforma/${row.id}`, { state: { proformaType: row.proforma_type } })
  // This lets getProformaById call the correct typed endpoint immediately,
  // without a trial-and-error round-trip to the wrong endpoint.
  const proformaTypeHint = location.state?.proformaType || '';

  const { userRole } = useRole();
  const isAdminOrManager = userRole === 'Admin' || userRole === 'Manager';

  const [proforma,      setProforma]      = useState(null);
  const [client,        setClient]        = useState(null);
  const [project,       setProject]       = useState(null);
  const [createdByName, setCreatedByName] = useState('');
  const [loading,       setLoading]       = useState(true);
  const [fetchError,    setFetchError]    = useState('');
  const [pdfLoading,    setPdfLoading]    = useState(false);
  const [showPdfModal,  setShowPdfModal]  = useState(false);
  const [scopeOfWork,   setScopeOfWork]   = useState('');
  const [scopeError,    setScopeError]    = useState('');
  const [pdfError,      setPdfError]      = useState('');

  const [pdfCompanyName,   setPdfCompanyName]   = useState('');
  const [pdfAddress,       setPdfAddress]       = useState('');
  const [pdfGstNo,         setPdfGstNo]         = useState('');
  const [pdfSacCode,       setPdfSacCode]       = useState('');
  const [pdfInvoiceDate,   setPdfInvoiceDate]   = useState('');
  const [pdfWorkOrderDate, setPdfWorkOrderDate] = useState('');
  const [pdfValidFrom,     setPdfValidFrom]     = useState('');
  const [pdfValidTill,     setPdfValidTill]     = useState('');
  const [pdfVendorCode,    setPdfVendorCode]    = useState('');
  const [pdfPoNo,          setPdfPoNo]          = useState('');
  const [pdfScheduleDate,  setPdfScheduleDate]  = useState('');
  const [pdfState,         setPdfState]         = useState('');
  const [pdfCode,          setPdfCode]          = useState('');
  const [visible,       setVisible]       = useState(false);

  const [editMode,    setEditMode]    = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [sendModal,             setSendModal]             = useState(false);
  const [showUpdateReasonModal, setShowUpdateReasonModal] = useState(false);
  const [updateReason,          setUpdateReason]          = useState('');
  const [updateReasonError,     setUpdateReasonError]     = useState('');
  const [sendingForApproval,  setSendingForApproval]  = useState(false);
  const [approving,           setApproving]           = useState(false);
  const [rejecting,           setRejecting]           = useState(false);
  const [showRejectModal,     setShowRejectModal]     = useState(false);
  const [rejectReason,        setRejectReason]        = useState('');
  const [rejectReasonError,   setRejectReasonError]   = useState('');
  const [approvalToast,       setApprovalToast]       = useState('');

  const [showInvoiceModal,   setShowInvoiceModal]   = useState(false);
  const [advanceAmount,      setAdvanceAmount]      = useState('');
  const [invoiceGenerating,  setInvoiceGenerating]  = useState(false);
  const [invoiceChecking,    setInvoiceChecking]    = useState(false);
  const [invoiceError,       setInvoiceError]       = useState('');
  const [invoiceSuccess,     setInvoiceSuccess]     = useState(null);

  const [invoiceModal, setInvoiceModal] = useState({
    open: false, invoiceId: null, invoiceNum: '', invoiceType: '', alreadyExists: false, genericError: '',
  });

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

  // ── Scroll lock — prevents background page scroll whenever any modal is open
  useEffect(() => {
    const anyModalOpen = showAddSection || showUpdateReasonModal || showRejectModal || showInvoiceModal || showPdfModal;
    if (anyModalOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [showAddSection, showUpdateReasonModal, showRejectModal, showInvoiceModal, showPdfModal]);

  // ── Compliance modal helpers ─────────────────────────────────────────────────

  const fetchDescriptionsForModal = async (categoryId, subCategoryId) => {
    const res = await getComplianceByCategory(categoryId, subCategoryId || null);
    if (res?.status === 'success' && res?.data?.results) return res.data.results;
    return [];
  };

  const handleOpenAddSection = () => setShowAddSection(true);

  const handleComplianceSave = (newFlatItems) => {
    const EXECUTION_CATS = [5, 6, 7];
    const normalized = newFlatItems.map(item => {
      // CRITICAL: compliance_category must come from the item exactly as saved
      // by the modal. Never default/fallback — wrong category = corrupted data.
      const complianceCat = parseInt(item.compliance_category);
      if (!complianceCat) {
        console.error('[Proforma handleComplianceSave] Item has no compliance_category — skipping:', item);
        return null;
      }
      const isExec = EXECUTION_CATS.includes(complianceCat);
      const base = {
        id:                      null,
        compliance_category:     complianceCat,
        sub_compliance_category: parseInt(item.sub_compliance_category) || 0,
        description:             String(item.description || '').trim(),
        quantity:                parseInt(item.quantity) || 1,
        // Empty unit → null so backend stores null and UI shows "—"
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
          consultancy_charges:  (miscRaw === '--' || miscRaw === '' || miscRaw == null) ? '0' : String(miscRaw),
          miscellaneous_amount: (miscRaw === '--' || miscRaw === '' || miscRaw == null) ? '' : String(miscRaw),
        };
      }
    }).filter(Boolean); // drop any items that had no compliance_category

    if (normalized.length === 0) return;
    setEditItems(prev => [...prev, ...normalized]);
    setShowAddSection(false);
  };

  // ── Edit mode lifecycle ──────────────────────────────────────────────────────

  const enterEditMode = () => {
    if (!proforma) return;
    if (isSent() || isApproved() || isExpired()) return;
    setEditSacCode(proforma.sac_code || '');
    setEditGstRate(parseFloat(proforma.gst_rate || 0));
    setEditDiscRate(parseFloat(proforma.discount_rate || 0));
    setEditCompany(parseInt(proforma.company) || 1);
    setEditItems((proforma.items || []).map(it => ({
      id:                      it.id,
      description:             it.description || it.compliance_name || '',
      quantity:                parseInt(it.quantity) || 1,
      unit:                    (it.unit && it.unit !== 'N/A') ? it.unit : '',
      sac_code:                it.sac_code || it.item_sac_code || '',
      Professional_amount:     parseFloat(it.Professional_amount || 0),
      miscellaneous_amount:    (it.consultancy_charges ?? it.miscellaneous_amount) === '--' || (it.consultancy_charges ?? it.miscellaneous_amount) === null ? '' : ((it.consultancy_charges ?? it.miscellaneous_amount) || ''),
      consultancy_charges:     (it.consultancy_charges === '--' || it.consultancy_charges === null) ? '' : (it.consultancy_charges || ''),
      material_rate:           parseFloat(it.material_rate || 0),
      material_amount:         parseFloat(it.material_amount || 0),
      labour_rate:             parseFloat(it.labour_rate || 0),
      labour_amount:           parseFloat(it.labour_amount || 0),
      compliance_category:     it.compliance_category ?? 1,
      sub_compliance_category: it.sub_compliance_category ?? 0,
      total_amount:            parseFloat(it.total_amount || 0),
    })));
    setSaveError(''); setSaveSuccess(false);
    setEditMode(true);
  };

  const cancelEditMode = () => { setEditMode(false); setSaveError(''); };

  // ── GST applicability — derived from the selected company in edit mode,
  //    or the saved company in view mode. Only company ID 1 is GST applicable.
  const isGSTApplicable = proforma
    ? (editMode ? parseInt(editCompany) : parseInt(proforma.company)) === GST_APPLICABLE_COMPANY_ID
    : true; // safe default while loading

  const calcEditSubtotal   = () => parseFloat(editItems.reduce((s, it) => s + calcItemTotal(it), 0).toFixed(2));
  const calcEditDiscAmt    = (sub) => parseFloat(((sub * (editDiscRate || 0)) / 100).toFixed(2));
  // GST fix: non-GST companies always return 0 regardless of editGstRate
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
        updated.material_amount = parseFloat(((parseFloat(value) || 0) * qty).toFixed(2));
      } else if (field === 'material_amount') {
        updated.material_rate = parseFloat((qty > 0 ? (parseFloat(value) || 0) / qty : 0).toFixed(6));
      } else if (field === 'labour_rate') {
        updated.labour_amount = parseFloat(((parseFloat(value) || 0) * qty).toFixed(2));
      } else if (field === 'labour_amount') {
        updated.labour_rate = parseFloat((qty > 0 ? (parseFloat(value) || 0) / qty : 0).toFixed(6));
      } else if (field === 'quantity') {
        const newQty = parseInt(value) || 1;
        const matRate = parseFloat(updated.material_rate) || 0;
        const labRate = parseFloat(updated.labour_rate) || 0;
        if (matRate > 0) updated.material_amount = parseFloat((matRate * newQty).toFixed(2));
        if (labRate > 0) updated.labour_amount = parseFloat((labRate * newQty).toFixed(2));
      }

      updated.total_amount = calcItemTotal(updated);
      return updated;
    }));
  };

  const removeItem = (idx) => setEditItems(prev => prev.filter((_, i) => i !== idx));

  // Step 1: validate fields, then open the reason modal
  const handleSaveUpdate = () => {
    setSaveError('');
    for (const it of editItems) {
      if (!String(it.description).trim()) { setSaveError('All items must have a description.'); return; }
      if ((parseInt(it.quantity) || 0) <= 0) { setSaveError('All quantities must be ≥ 1.'); return; }
      const isExecutionItem =
        [5, 6, 7].includes(Number(it.compliance_category)) ||
        it.material_rate != null || it.material_amount != null ||
        it.labour_rate != null || it.labour_amount != null;
      const hasExecutionValue =
        (parseFloat(it.material_rate) || 0) > 0 ||
        (parseFloat(it.material_amount) || 0) > 0 ||
        (parseFloat(it.labour_rate) || 0) > 0 ||
        (parseFloat(it.labour_amount) || 0) > 0 ||
        (parseFloat(it.Professional_amount) || 0) > 0;
      if (isExecutionItem && !hasExecutionValue) { setSaveError('Execution items must have a professional, material, or labour amount greater than 0.'); return; }
      if (!isExecutionItem && (parseFloat(it.Professional_amount) || 0) <= 0) { setSaveError('Professional amount must be > 0 for all regulatory items.'); return; }
    }
    const isExecType = (proforma?.proforma_type || '').toLowerCase().includes('execution') ||
      editItems.some(it => [5, 6, 7].includes(Number(it.compliance_category)));
    if (!isExecType && !editSacCode.trim()) { setSaveError('SAC Code is required.'); return; }
    setUpdateReason('');
    setUpdateReasonError('');
    setShowUpdateReasonModal(true);
  };

  // Step 2: actually submits to backend
  const handleSaveUpdateConfirm = async () => {
    if (!updateReason.trim()) { setUpdateReasonError('Please provide a reason for this update.'); return; }
    setUpdateReasonError('');
    setShowUpdateReasonModal(false);
    setSaving(true);
    try {
      const sub   = calcEditSubtotal();
      const disc  = calcEditDiscAmt(sub);
      // GST fix: force 0 for non-GST companies before building payload
      const gst   = isGSTApplicable ? calcEditGstAmt(sub, disc) : 0;
      const grand = sub - disc + gst;

      const payload = {
        id:               parseInt(proforma.id),
        proforma_type:    proforma.proforma_type || '',
        client:           parseInt(proforma.client),
        project:          parseInt(proforma.project),
        company:          parseInt(editCompany) || 1,
        issue_date:       proforma.issue_date  || new Date().toISOString(),
        valid_until:      proforma.valid_until  || new Date().toISOString(),
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
        reason:           updateReason.trim(),
        status:           proforma?.status || 'draft',
        items:            editItems,
      };

      const data = await updateProformaFull(payload);

      if (data && (data.id || data.proforma_number || data.status === 'success')) {
        const updated = data.data || data;
        setProforma(prev => ({
          ...prev, ...updated,
          company:       editCompany,
          company_name:  QUOTATION_COMPANIES.find(c => c.id === parseInt(editCompany))?.name || prev.company_name,
          sac_code:      editSacCode.trim(),
          gst_rate:      isGSTApplicable ? String(editGstRate) : '0',
          discount_rate: String(editDiscRate),
          total_amount:  sub, total_gst_amount: gst, grand_total: grand,
          items: updated.items || editItems.map(it => ({
            ...it,
            miscellaneous_amount: String(it.consultancy_charges ?? it.miscellaneous_amount ?? '').trim() || '--',
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
        } else if (typeof errors === 'object') {
          msg = Object.entries(errors)
            .map(([field, val]) => {
              if (Array.isArray(val)) return val.map(v => (typeof v === 'string' ? v : JSON.stringify(v))).join('; ');
              return `${field}: ${val}`;
            })
            .filter(Boolean).join(' | ');
        }
      }
      setSaveError(msg || e.message || 'Failed to update proforma.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    onUpdateNavigation?.({ breadcrumbs: ['Proforma', 'Proforma Details'] });
    return () => onUpdateNavigation?.(null);
  }, [onUpdateNavigation]);

  // ── Status helpers ───────────────────────────────────────────────────────────
  const getStatusDisplay = () => String(proforma?.status_display ?? '').toLowerCase().trim();

  const isSent     = () => String(proforma?.status || '').toLowerCase() === 'sent'     || getStatusDisplay() === 'sent' || getStatusDisplay() === 'sent for approval';
  const isApproved = () => String(proforma?.status || '').toLowerCase() === 'approved' || getStatusDisplay() === 'approved';
  const isExpired  = () => String(proforma?.status || '').toLowerCase() === 'expired'  || getStatusDisplay() === 'expired';
  const isPendingApproval = () => isSent();

  const showApprovalToastMsg = (type) => {
    setApprovalToast(type);
    setTimeout(() => setApprovalToast(''), 3500);
  };

  const handleSendForApproval = async () => {
    if (sendingForApproval || !proforma) return;
    setSendingForApproval(true);
    try {
      await sendProformaForApproval(proforma.id);
      setProforma(prev => ({ ...prev, status: 'sent', status_display: 'Sent for Approval' }));
      showApprovalToastMsg('sent');
      try {
        const fresh = await getProformaById(proforma.id, proforma.proforma_type);
        if (fresh?.status === 'success' && fresh?.data) setProforma(fresh.data);
      } catch { /* silently ignore */ }
    } catch (e) {
      const msg = e.response?.data?.errors?.detail || e.response?.data?.message || e.response?.data?.detail || 'Failed to send for approval.';
      setSaveError(msg);
    } finally {
      setSendingForApproval(false);
    }
  };

  const handleApprove = async () => {
    if (approving || !proforma) return;
    setApproving(true);
    try {
      await approveProforma(proforma.id);
      setProforma(prev => ({ ...prev, status: 'approved', status_display: 'Approved' }));
      showApprovalToastMsg('approved');
      try {
        const fresh = await getProformaById(proforma.id, proforma.proforma_type);
        if (fresh?.status === 'success' && fresh?.data) setProforma(fresh.data);
      } catch { /* silently ignore */ }
    } catch (e) {
      const msg = e.response?.data?.errors?.detail || e.response?.data?.message || e.response?.data?.detail || 'Failed to approve proforma.';
      setSaveError(msg);
    } finally {
      setApproving(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) { setRejectReasonError('Please provide a reason for rejection.'); return; }
    setRejectReasonError('');
    setRejecting(true);
    try {
      await rejectProforma(proforma.id, rejectReason);
      setProforma(prev => ({ ...prev, status: 'rejected', status_display: 'Rejected' }));
      setShowRejectModal(false);
      setRejectReason('');
      showApprovalToastMsg('rejected');
      try {
        const fresh = await getProformaById(proforma.id, proforma.proforma_type);
        if (fresh?.status === 'success' && fresh?.data) setProforma(fresh.data);
      } catch { /* silently ignore */ }
    } catch (e) {
      const msg = e.response?.data?.errors?.detail || e.response?.data?.message || e.response?.data?.detail || 'Failed to reject proforma.';
      setRejectReasonError(msg);
    } finally {
      setRejecting(false);
    }
  };

  const fmtInvNum = (n) => n ? String(n) : '—';

  const extractTrailingDigits = (numStr) => {
    if (!numStr) return '';
    const s = String(numStr);
    const lastDash = s.lastIndexOf('-');
    return lastDash >= 0 ? s.substring(lastDash + 1) : s;
  };

  const fetchInvoiceForThisProforma = async () => {
    const proformaTrailing = extractTrailingDigits(proforma.proforma_number || String(proforma.id));
    const res = await api.get('/invoices/get_all_invoices/', { params: { page: 1, page_size: 100 } });
    const results = res.data?.data?.results || res.data?.results || [];
    const proformaId = Number(proforma.id);
    let match = results.find((inv) => Number(inv.proforma) === proformaId);
    if (!match && proformaTrailing) {
      match = results.find((inv) => {
        const invTrailing = extractTrailingDigits(inv.invoice_number);
        return invTrailing && invTrailing === proformaTrailing;
      });
    }
    return match || null;
  };

  const dismissInvoiceModal = () =>
    setInvoiceModal({ open: false, invoiceId: null, invoiceNum: '', invoiceType: '', alreadyExists: false, genericError: '' });

  const handleInvoiceButtonClick = async () => {
    if (!isApproved()) return;
    setInvoiceChecking(true);
    try {
      const existing = await fetchInvoiceForThisProforma();
      if (existing) {
        setInvoiceModal({ open: true, invoiceId: existing.id, invoiceNum: fmtInvNum(existing.invoice_number), invoiceType: existing.invoice_type || '', alreadyExists: true, genericError: '' });
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
    setInvoiceError('');
    setInvoiceGenerating(true);
    try {
      const advance = advanceAmount ? parseFloat(advanceAmount) : 0;
      if (advanceAmount && isNaN(advance)) { setInvoiceError('Please enter a valid advance amount.'); setInvoiceGenerating(false); return; }
      if (advance < 0) { setInvoiceError('Advance amount cannot be negative.'); setInvoiceGenerating(false); return; }
      const advanceStr = String(advance.toFixed(2));

      let res;
      if (isRegulatory) {
        res = await createRegulatoryInvoice({ proforma: proforma.id, advance_amount: advanceStr });
      } else {
        res = await createExecutionInvoice({ proforma: proforma.id, advance_amount: advanceStr });
      }

      const created = res?.data || res;
      if (!created?.id && !created?.invoice_number) {
        setInvoiceError('Invoice created but response was unexpected. Please check Invoice List.');
        return;
      }
      setInvoiceSuccess(created);
    } catch (e) {
      const status = e.response?.status;
      const respData = e.response?.data;

      if (status === 409) {
        setShowInvoiceModal(false);
        let existingId = null; let existingNum = '';
        try {
          const match = await fetchInvoiceForThisProforma();
          if (match) { existingId = match.id; existingNum = fmtInvNum(match.invoice_number); }
        } catch { /* silently ignore */ }
        setInvoiceModal({ open: true, invoiceId: existingId, invoiceNum: existingNum, invoiceType: '', alreadyExists: true, genericError: '' });
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

  const fetchData = useCallback(async () => {
    if (!id) { setFetchError('No proforma ID provided'); setLoading(false); return; }
    setLoading(true); setFetchError('');
    try {
      // Pass the type hint so the service calls the correct endpoint directly.
      // After first load we also derive the type from the loaded proforma itself.
      const res = await getProformaById(id, proformaTypeHint);
      if (res.status !== 'success' || !res.data) throw new Error('Failed to load proforma');
      const p = res.data;
      setProforma(p);

      if (p.client) {
        try {
          const cr = await getClientById(p.client);
          if (cr.status === 'success' && cr.data) setClient(cr.data);
        } catch { /* client details are optional */ }
      }
      if (p.project) {
        try {
          const pr  = await getProjects({ page: 1, page_size: 500 });
          const all = pr?.data?.results || pr?.results || [];
          const found = all.find(proj => String(proj.id) === String(p.project));
          if (found) setProject(found);
        } catch { /* project details are optional */ }
      }
      if (p.created_by) {
        try {
          const ur = await api.get('/users/get_user/', { params: { id: p.created_by } });
          if (ur.data?.status === 'success' && ur.data?.data) {
            const u = ur.data.data;
            setCreatedByName(`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || '');
          }
        } catch { /* creator details are optional */ }
      }
      setTimeout(() => setVisible(true), 60);
    } catch (e) {
      setFetchError(e.message || 'Failed to load proforma details');
    } finally {
      setLoading(false);
    }
  }, [id, proformaTypeHint]);

  useEffect(() => { fetchData(); window.scrollTo(0, 0); }, [fetchData]);

  const handleOpenPdfModal = () => {
    setScopeOfWork(''); setScopeError(''); setPdfError('');
    setPdfCompanyName(''); setPdfAddress(''); setPdfGstNo(''); setPdfSacCode('');
    setPdfInvoiceDate(''); setPdfWorkOrderDate(''); setPdfValidFrom(''); setPdfValidTill('');
    setPdfVendorCode(''); setPdfPoNo(''); setPdfScheduleDate(''); setPdfState(''); setPdfCode('');
    setShowPdfModal(true);
  };

  const handleConfirmPdfDownload = async () => {
    if (!scopeOfWork.trim()) { setScopeError('Scope of work is required to generate the PDF.'); return; }
    if (!pdfCompanyName.trim()) { setPdfError('Company name is required to generate the PDF.'); return; }
    if (!pdfAddress.trim()) { setPdfError('Address is required to generate the PDF.'); return; }
    setScopeError(''); setPdfError('');
    setPdfLoading(true);
    try {
      const fileName    = `${fmtPNum(proforma?.proforma_number)}.pdf`;
      const companyId   = parseInt(proforma?.company) || 0;
      const isConstructive = companyId === 1;

      if (isConstructive) {
        await generateConstructiveProformaPdf({
          id: proforma.id,
          company_name: pdfCompanyName.trim(),
          address: pdfAddress.trim(),
          scope_of_work: scopeOfWork,
          gst_no: pdfGstNo.trim() || null,
          sac_code: pdfSacCode.trim() || null,
          invoice_date: pdfInvoiceDate || null,
          work_order_date: pdfWorkOrderDate || null,
          valid_from: pdfValidFrom || null,
          valid_till: pdfValidTill || null,
          vendor_code: pdfVendorCode.trim() || null,
          po_no: pdfPoNo.trim() || null,
          schedule_date: pdfScheduleDate.trim() ? pdfScheduleDate : null,
          state: pdfState.trim() || null,
          code: pdfCode.trim() || null,
        }, fileName);
      } else {
        await generateOtherProformaPdf({
          id: proforma.id,
          company_name: pdfCompanyName.trim(),
          address: pdfAddress.trim(),
          scope_of_work: scopeOfWork,
          gst_no: pdfGstNo.trim() || null,
          po_no: pdfPoNo.trim() || null,
          schedule_date: pdfScheduleDate.trim() ? pdfScheduleDate : null,
          sac_code: pdfSacCode.trim() || null,
          state: pdfState.trim() || null,
          code: pdfCode.trim() || null,
        }, fileName);
      }
      setShowPdfModal(false);
    } catch (e) {
      setPdfError(e.message || 'Failed to generate PDF. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading)    return <LoadingView />;
  if (fetchError) return <ErrorView message={fetchError} onRetry={fetchData} onBack={() => navigate('/proforma')} />;
  if (!proforma)  return <ErrorView message="Proforma not available." onRetry={fetchData} onBack={() => navigate('/proforma')} />;

  // ── Derived values ──
  const status     = getStatusWithIcon(proforma);
  const pNum       = fmtPNum(proforma.proforma_number);

  // ── Financial totals: always use the backend-computed values as source of truth.
  //    Only fall back to recalculation if the backend field is missing (shouldn't happen).
  const subtotal   = parseFloat(proforma.total_amount    || 0);
  const gstRate    = parseFloat(proforma.gst_rate        || 0);
  const discRate   = parseFloat(proforma.discount_rate   || 0);
  const discAmt    = parseFloat(((subtotal * discRate) / 100).toFixed(2));
  const taxable    = parseFloat((subtotal - discAmt).toFixed(2));
  // Prefer backend gst amount; recalculate only as a fallback
  const gstAmt     = proforma.total_gst_amount != null
    ? parseFloat(proforma.total_gst_amount)
    : parseFloat(((taxable * gstRate) / 100).toFixed(2));
  // Prefer backend grand total; recalculate only as a fallback
  const grandTotal = proforma.grand_total != null
    ? parseFloat(proforma.grand_total)
    : parseFloat((taxable + gstAmt).toFixed(2));
  const items      = proforma.items || [];
  const groups     = groupItemsByCategory(items);
  const totalQty   = items.reduce((s, it) => s + (parseInt(it.quantity) || 1), 0);
  const pTypeRaw      = proforma.proforma_type || '';
  const pTypeLower    = pTypeRaw.toLowerCase();
  const isExecution   = pTypeLower.includes('execution') || getComplianceType(items) === 'execution';
  // Architecture: type string says "architecture" OR all items are category 8
  const isArchitecture = !isExecution && (
    pTypeLower.includes('architecture') ||
    (items.length > 0 && items.every(it => Number(it.compliance_category) === 8))
  );
  const isRegulatory  = !isExecution;
  const companyName  = proforma.company_name || getQuotationCompanyName(proforma.company) || 'ERP System';

  const clientName = client
    ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.email
    : `Client #${proforma.client}`;
  const projName = project
    ? (project.name || project.title || `Project #${proforma.project}`)
    : (proforma.project ? `Project #${proforma.project}` : '—');
  const projLoc = project ? [project.city, project.state].filter(Boolean).join(', ') : '';

  return (
    <>
      {/* ─── Global styles ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        .vpd-root *{box-sizing:border-box;font-family:'Outfit',sans-serif}
        .vpd-pdf-body::-webkit-scrollbar{display:none}
        .vpd-modal-textarea{font-family:'Outfit',sans-serif !important}
        .vpd-modal-title{font-family:'Outfit',sans-serif !important}
        .vpd-modal-sub{font-family:'Outfit',sans-serif !important}
        .vpd-modal-label{font-family:'Outfit',sans-serif !important}
        .vpd-modal-err{font-family:'Outfit',sans-serif !important}
        .vpd-btn-cancel{font-family:'Outfit',sans-serif !important}
        .vpd-btn-reject{font-family:'Outfit',sans-serif !important}
        @keyframes vpd_spin{to{transform:rotate(360deg)}}
        @keyframes vpd_in{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
        .vpd-root{min-height:100vh;padding:0}
        .vpd-topbar{display:flex;align-items:center;justify-content:space-between;margin:0 0 16px}
        .vpd-back{display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;font-size:13px;font-weight:600;color:#475569;padding:6px 10px;border-radius:8px;transition:background .15s,color .15s}
        .vpd-back:hover{background:#e2e8f0;color:#1e293b}
        .vpd-actions{display:flex;gap:8px}
        .vpd-btn-o{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;background:#0f766e;border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:background .15s}
        .vpd-btn-o:hover{background:#0d6460}
        .vpd-btn-p{display:flex;align-items:center;gap:6px;padding:7px 16px;border-radius:8px;background:#0f766e;border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:background .15s}
        .vpd-btn-p:hover{background:#0d6460}
        .vpd-btn-p:disabled{opacity:.6;cursor:not-allowed}
        .vpd-spin{animation:vpd_spin .7s linear infinite}
        .vpd-doc{background:#fff;border-radius:20px;box-shadow:0 2px 4px rgba(0,0,0,.04),0 12px 40px rgba(0,0,0,.09);overflow:hidden;opacity:0;transform:translateY(16px);transition:opacity .4s ease,transform .4s ease}
        .vpd-doc.in{opacity:1;transform:translateY(0)}
        .vpd-hdr{display:flex;align-items:flex-end;justify-content:space-between;padding:32px 40px 28px;background:linear-gradient(135deg,#0c6e67 0%,#0f766e 40%,#0d9488 80%,#14b8a6 100%);position:relative;overflow:hidden}
        .vpd-hdr::after{content:'';position:absolute;top:-60px;right:-60px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.06);pointer-events:none}
        .vpd-hdr::before{content:'';position:absolute;bottom:-80px;left:30%;width:300px;height:300px;border-radius:50%;background:rgba(255,255,255,.04);pointer-events:none}
        .vpd-hdr-l{position:relative;z-index:1}
        .vpd-hdr-r{text-align:right;position:relative;z-index:1}
        .vpd-logo{display:flex;align-items:center;gap:12px;margin-bottom:16px}
        .vpd-logo-badge{width:46px;height:46px;border-radius:12px;background:rgba(255,255,255,.15);border:1.5px solid rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#fff;letter-spacing:.03em}
        .vpd-co-name{font-size:20px;font-weight:800;color:#fff;letter-spacing:-.02em;line-height:1.1}
        .vpd-co-sub{font-size:12px;color:rgba(255,255,255,.6);font-weight:400;margin-top:2px}
        .vpd-doc-label{font-size:10px;font-weight:800;color:rgba(255,255,255,.55);letter-spacing:.18em;text-transform:uppercase}
        .vpd-doc-num{font-size:24px;font-weight:900;color:#fff;letter-spacing:-.02em;font-variant-numeric:tabular-nums;margin-top:3px}
        .vpd-doc-date{font-size:12px;color:rgba(255,255,255,.6);margin-top:5px;font-weight:400}
        .vpd-meta{display:flex;flex-wrap:wrap;align-items:center;gap:0;padding:14px 40px;background:#f8fafc;border-bottom:1.5px solid #e8ecf2}
        .vpd-meta-sep{width:1px;height:30px;background:#e2e8f0;margin:0 18px;flex-shrink:0}
        .vpd-parties{display:grid;grid-template-columns:1fr 28px 1fr 1fr;padding:28px 40px;gap:0;border-bottom:1.5px solid #f0f4f8;background:#fff}
        .vpd-arrow-col{display:flex;align-items:center;justify-content:center;padding:0 4px;padding-top:36px}
        .vpd-party{display:flex;flex-direction:column;gap:4px}
        .vpd-plabel{font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.12em;margin-bottom:6px}
        .vpd-pavatar{width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#0f766e,#0d9488);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#fff;margin-bottom:6px}
        .vpd-picon{margin-bottom:6px}
        .vpd-pname{font-size:14px;font-weight:700;color:#1e293b;line-height:1.3}
        .vpd-pdetail{display:flex;align-items:center;gap:5px;font-size:11px;color:#64748b;margin-top:2px}
        .vpd-party--proj{padding-left:28px}
        .vpd-party--rates{padding-left:28px;border-left:1.5px solid #f0f4f8}
        .vpd-rates-list{display:flex;flex-direction:column;gap:10px;margin-top:4px}
        .vpd-rate-row{display:flex;align-items:center;gap:10px}
        .vpd-rate-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .vpd-rate-v{font-size:14px;font-weight:700;color:#1e293b;line-height:1}
        .vpd-rate-l{font-size:10px;color:#94a3b8;font-weight:500;margin-top:2px}
        .vpd-body-wrap{display:grid;grid-template-columns:1fr 280px;gap:24px;padding:0 40px 28px;align-items:start}
        .vpd-body-left{min-width:0}
        .vpd-body-right{position:sticky;top:20px}
        .vpd-sec-hdr{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:800;color:#0f766e;text-transform:uppercase;letter-spacing:.1em;padding:16px 0 12px;border-bottom:1.5px solid #f0f4f8;margin-bottom:0}
        .vpd-sec-badge{background:#f0fdf4;color:#059669;border:1px solid #bbf7d0;font-size:10px;padding:2px 8px;border-radius:20px;font-weight:700;text-transform:none;letter-spacing:0}
        .vpd-table-wrap{overflow-x:auto;margin-top:0}
        .vpd-table{width:100%;border-collapse:collapse;font-size:13px}
        .vpd-table thead tr{background:#f8fafc}
        .vpd-table thead th{padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:.08em;text-transform:uppercase;border-bottom:1.5px solid #e8ecf2;white-space:nowrap}
        .vpd-table thead th:first-child{padding-left:16px}
        .vpd-table thead th:last-child{padding-right:16px;text-align:right}
        .vpd-cat-row td{padding:9px 12px 6px 16px;background:#fafbfc;border-top:1.5px solid #f0f4f8}
        .vpd-cat-inner{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:700;color:#0f766e;text-transform:uppercase;letter-spacing:.08em}
        .vpd-cat-dot{width:6px;height:6px;border-radius:50%;background:#0d9488;flex-shrink:0}
        .vpd-cat-cnt{margin-left:auto;font-size:10px;font-weight:600;color:#94a3b8;text-transform:none;letter-spacing:0}
        .vpd-row td{padding:10px 12px;border-bottom:1px solid #f8fafc;vertical-align:middle}
        .vpd-row:hover td{background:#f8fafc}
        .vpd-row td:first-child{padding-left:16px}
        .vpd-row td:last-child{padding-right:16px;text-align:right}
        .vpd-row-idx{font-size:11px;font-weight:700;color:#d1d5db;text-align:center}
        .vpd-desc{font-size:13px;font-weight:500;color:#334155;line-height:1.55;max-width:300px}
        .vpd-subcat{display:inline-block;background:#f1f5f9;color:#475569;font-size:10px;font-weight:600;padding:2px 7px;border-radius:20px;border:1px solid #e2e8f0;white-space:nowrap}
        .vpd-qty-badge{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;background:#f1f5f9;color:#475569;font-size:12px;font-weight:700}
        .vpd-misc-note{color:#d97706;font-style:italic;font-size:11px;border-bottom:1px dashed #fcd34d;cursor:help}
        .vpd-cat-sub td{padding:7px 16px 9px;background:#f8fafc;border-bottom:2px solid #e8ecf2}
        .vpd-foot{display:grid;grid-template-columns:1fr 310px;gap:32px;padding:28px 40px;border-top:2px solid #f0f4f8;align-items:start}
        .vpd-sum-title{font-size:10px;font-weight:800;letter-spacing:.12em;color:#94a3b8;text-transform:uppercase;margin-bottom:14px}
        .vpd-sum-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px}
        .vpd-sum-item{display:flex;flex-direction:column;gap:2px}
        .vpd-sum-lbl{font-size:11px;color:#94a3b8;font-weight:500}
        .vpd-sum-val{font-size:13px;font-weight:700;color:#1e293b}
        .vpd-remarks{margin-top:18px}
        .vpd-rem-title{font-size:10px;font-weight:800;letter-spacing:.12em;color:#94a3b8;text-transform:uppercase;margin-bottom:6px}
        .vpd-rem-text{font-size:12px;color:#64748b;line-height:1.65;white-space:pre-wrap}
        .vpd-tbox{background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:14px;padding:20px 22px}
        .vpd-tbox-title{font-size:10px;font-weight:800;letter-spacing:.12em;color:#94a3b8;text-transform:uppercase;margin-bottom:14px}
        .vpd-trow{display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:13px;color:#475569;font-weight:500}
        .vpd-trow--disc{color:#ea580c}
        .vpd-trow--sub{color:#94a3b8;font-size:12px}
        .vpd-tdiv{border:none;border-top:1.5px solid #e2e8f0;margin:11px 0}
        .vpd-grand{display:flex;justify-content:space-between;align-items:baseline;font-size:19px;font-weight:900;color:#0f766e;letter-spacing:-.02em}
        .vpd-words{margin-top:8px;padding-top:8px;border-top:1px dashed #e2e8f0;font-size:10.5px;line-height:1.55;color:#64748b;font-style:italic}
        .vpd-dl-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-top:12px;padding:11px;background:#0f766e;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;transition:background .15s,transform .1s}
        .vpd-dl-btn:hover{background:#0d6460}
        .vpd-dl-btn:active{transform:scale(.98)}
        .vpd-dl-btn:disabled{opacity:.6;cursor:not-allowed}
        .vpd-doc-foot{display:flex;justify-content:space-between;align-items:center;padding:14px 40px;background:#f8fafc;border-top:1.5px solid #e8ecf2;font-size:11px;color:#94a3b8}
        .vpd-btn-approve{display:flex;align-items:center;gap:6px;padding:7px 15px;border-radius:8px;background:linear-gradient(135deg,#059669,#047857);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;box-shadow:0 2px 8px rgba(5,150,105,.25)}
        .vpd-btn-approve:hover{background:linear-gradient(135deg,#047857,#065f46);box-shadow:0 4px 12px rgba(5,150,105,.35)}
        .vpd-btn-reject{display:flex;align-items:center;gap:6px;padding:7px 15px;border-radius:8px;background:linear-gradient(135deg,#dc2626,#b91c1c);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;box-shadow:0 2px 8px rgba(220,38,38,.25)}
        .vpd-btn-reject:hover{background:linear-gradient(135deg,#b91c1c,#991b1b);box-shadow:0 4px 12px rgba(220,38,38,.35)}
        .vpd-doc.vpd-doc-editing{box-shadow:0 0 0 2.5px #f59e0b,0 2px 4px rgba(0,0,0,.04),0 12px 40px rgba(0,0,0,.09)}
        .vpd-co-edit-wrap{position:relative;display:inline-flex;align-items:center;gap:6px;cursor:pointer}
        .vpd-co-edit-btn{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.25);border-radius:8px;padding:4px 10px;cursor:pointer;transition:all .15s}
        .vpd-co-edit-btn:hover{background:rgba(255,255,255,.2);border-color:rgba(255,255,255,.4)}
        .vpd-co-dropdown{position:fixed;z-index:99999;background:#fff;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.06);min-width:220px;overflow:hidden;animation:vpd_dd_in .18s cubic-bezier(.16,1,.3,1)}
        @keyframes vpd_dd_in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        .vpd-co-dd-header{padding:10px 14px 8px;font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;border-bottom:1px solid #f1f5f9}
        .vpd-co-dd-item{display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;transition:background .12s;font-size:13px;font-weight:600;color:#1e293b}
        .vpd-co-dd-item:hover{background:#f0fdf4}
        .vpd-co-dd-item.active{background:#ecfdf5;color:#0f766e}
        .vpd-co-dd-item .co-check{width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,#0f766e,#14b8a6);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .vpd-co-dd-item .co-dot{width:18px;height:18px;border-radius:50%;border:1.5px solid #e2e8f0;flex-shrink:0}
        .vpd-btn-invoice{display:flex;align-items:center;gap:6px;padding:7px 15px;border-radius:8px;background:linear-gradient(135deg,#7c3aed,#6d28d9);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;box-shadow:0 2px 8px rgba(109,40,217,.25)}
        .vpd-btn-invoice:hover{background:linear-gradient(135deg,#6d28d9,#5b21b6);box-shadow:0 4px 12px rgba(109,40,217,.35)}
        .vpd-btn-invoice:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}
        .vpd-admin-bar{display:flex;align-items:center;gap:8px;padding:10px 16px;background:linear-gradient(135deg,#faf5ff,#ede9fe);border:1.5px solid #ddd6fe;border-radius:12px;margin-bottom:14px}
        .vpd-admin-bar-label{font-size:10px;font-weight:800;color:#7c3aed;text-transform:uppercase;letter-spacing:.1em;margin-right:4px}
        .vpd-btn-edit{display:flex;align-items:center;gap:6px;padding:7px 16px;border-radius:8px;background:linear-gradient(135deg,#f59e0b,#d97706);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;box-shadow:0 2px 8px rgba(217,119,6,.25)}
        .vpd-btn-edit:hover{background:linear-gradient(135deg,#d97706,#b45309);box-shadow:0 4px 12px rgba(217,119,6,.35)}
        .vpd-btn-edit:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}
        .vpd-btn-save{display:flex;align-items:center;gap:6px;padding:7px 16px;border-radius:8px;background:linear-gradient(135deg,#0f766e,#0d9488);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s}
        .vpd-btn-save:hover{background:linear-gradient(135deg,#0d6460,#0b7a72)}
        .vpd-btn-save:disabled{opacity:.6;cursor:not-allowed}
        .vpd-btn-cancel{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;background:#fff;border:2px solid #94a3b8;font-size:13px;font-weight:600;color:#475569;cursor:pointer;transition:all .15s}
        .vpd-btn-cancel:hover{background:#fef2f2;border-color:#fca5a5;color:#dc2626}
        .vpd-edit-banner{display:flex;align-items:center;gap:10px;padding:10px 18px;background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1.5px solid #fcd34d;border-radius:12px;margin-bottom:14px;animation:vpd_in .25s ease}
        .vpd-edit-input{padding:6px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;font-family:inherit;color:#1e293b;background:#fff;outline:none;transition:border-color .15s,box-shadow .15s;width:100%}
        .vpd-edit-input:focus{border-color:#0f766e;box-shadow:0 0 0 3px rgba(15,118,110,.1)}
        .vpd-edit-row td{background:#fafffe !important;padding:8px 6px !important}
        .vpd-edit-row:hover td{background:#f0fdf4 !important}
        .vpd-edit-totals{background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1.5px solid #6ee7b7;border-radius:14px;padding:20px 22px}
        .vpd-save-err{display:flex;align-items:flex-start;gap:8px;background:#fef2f2;border:1.5px solid #fca5a5;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:12.5px;color:#dc2626;line-height:1.5}
        .vpd-btn-send-approval{display:flex;align-items:center;gap:6px;padding:7px 15px;border-radius:8px;background:linear-gradient(135deg,#0284c7,#0369a1);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;box-shadow:0 2px 8px rgba(3,105,161,.25)}
        .vpd-btn-send-approval:hover{background:linear-gradient(135deg,#0369a1,#075985);box-shadow:0 4px 12px rgba(3,105,161,.35)}
        .vpd-btn-send-approval:disabled{opacity:.6;cursor:not-allowed}
        .vpd-modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:10000;display:flex;align-items:center;justify-content:center}
        .vpd-modal-box{background:#fff;border-radius:20px;padding:28px 28px 24px;width:100%;max-width:440px;box-shadow:0 24px 64px rgba(0,0,0,.22)}
        .vpd-modal-title{font-size:17px;font-weight:800;color:#1e293b;margin-bottom:6px;display:flex;align-items:center;gap:10px}
        .vpd-modal-sub{font-size:13px;color:#64748b;margin-bottom:20px;line-height:1.6}
        .vpd-modal-label{font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
        .vpd-modal-textarea{width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;font-family:inherit;color:#1e293b;resize:vertical;min-height:90px;outline:none;transition:border-color .15s,box-shadow .15s;box-sizing:border-box}
        .vpd-modal-textarea:focus{border-color:#dc2626;box-shadow:0 0 0 3px rgba(220,38,38,.1)}
        .vpd-modal-textarea--amber:focus{border-color:#d97706;box-shadow:0 0 0 3px rgba(217,119,6,.1)}
        .vpd-modal-err{display:flex;align-items:center;gap:6px;font-size:12px;color:#dc2626;margin-top:6px;font-weight:500}
        .vpd-modal-actions{display:flex;gap:10px;margin-top:20px;justify-content:flex-end}
        .vpd-success-toast{position:fixed;bottom:28px;right:28px;z-index:9999;display:flex;align-items:center;gap:10px;background:#0f766e;color:#fff;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:600;box-shadow:0 8px 24px rgba(15,118,110,.4);animation:vpd_toast_in .3s cubic-bezier(.16,1,.3,1)}
        @keyframes vpd_toast_in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes notes_spin{to{transform:rotate(360deg)}}
        @keyframes notes_slide_in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes vqd_pulse_ring{0%{transform:scale(1);opacity:.6}70%{transform:scale(1.18);opacity:0}100%{transform:scale(1.18);opacity:0}}
        @keyframes vpd_modal_in{from{opacity:0;transform:scale(.93) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes vpd_overlay_in{from{opacity:0}to{opacity:1}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
        .animate-fadeIn{animation:fadeIn .2s ease-out}
        .animate-scaleIn{animation:scaleIn .3s cubic-bezier(0.16,1,0.3,1)}
        @media print{
          .vpd-topbar{display:none}
          .vpd-root{background:#fff;padding:0}
          .vpd-doc{box-shadow:none;border-radius:0;opacity:1!important;transform:none!important}
          .vpd-body-wrap{grid-template-columns:1fr;padding:0 40px 32px}
          .vpd-body-right{display:none}
          .vpd-foot{grid-template-columns:1fr 300px}
          .vpd-dl-btn,.vpd-btn-p,.vpd-btn-o{display:none}
        }
        @media(max-width:900px){
          .vpd-body-wrap{grid-template-columns:1fr;padding:0 20px 24px}
          .vpd-body-right{position:static}
          .vpd-foot{grid-template-columns:1fr;padding:20px}
        }
        @media(max-width:700px){
          .vpd-hdr{padding:22px 20px 22px}
          .vpd-meta{padding:12px 20px}
          .vpd-meta-sep{display:none}
          .vpd-parties{grid-template-columns:1fr;padding:20px;gap:16px}
          .vpd-arrow-col{display:none}
          .vpd-party--proj,.vpd-party--rates{padding-left:0}
          .vpd-party--rates{border-left:none;border-top:1.5px solid #f0f4f8;padding-top:16px}
          .vpd-doc-foot{padding:12px 20px;flex-direction:column;gap:4px;text-align:center}
          .vpd-doc-num{font-size:19px}
          .vpd-grand{font-size:16px}
          .vpd-hdr-r{text-align:left;margin-top:16px}
          .vpd-hdr{flex-direction:column}
        }
      `}</style>

      <div className="vpd-root">

        {/* ── Top bar ── */}
        <div className="vpd-topbar">
          <button className="vpd-back" onClick={() => editMode ? cancelEditMode() : navigate('/proforma')}>
            <ArrowLeft size={15} /> {editMode ? 'Cancel Edit' : 'Back to Proforma'}
          </button>
          <div className="vpd-actions">
            {editMode ? (
              <>
                <button className="vpd-btn-cancel" onClick={cancelEditMode} disabled={saving}>
                  <RotateCcw size={14} /> Discard Changes
                </button>
                <button className="vpd-btn-save" onClick={handleSaveUpdate} disabled={saving}>
                  {saving ? <><Loader2 size={14} className="vpd-spin" /> Saving…</> : <><Save size={14} /> Save Changes</>}
                </button>
              </>
            ) : (
              <>
                {(() => {
                  const cantEdit = isSent() || isApproved() || isExpired();
                  let editTitle = 'Edit this proforma';
                  if (isSent())     editTitle = 'Cannot edit — proforma is awaiting approval';
                  if (isApproved()) editTitle = 'Cannot edit — proforma is approved';
                  if (isExpired())  editTitle = 'Cannot edit — proforma has expired';
                  return (
                    <button className="vpd-btn-edit" onClick={enterEditMode} disabled={cantEdit} title={editTitle} style={cantEdit ? { opacity: 0.45, cursor: 'not-allowed' } : {}}>
                      <Edit2 size={14} /> Update Proforma
                    </button>
                  );
                })()}

                <button className="vpd-btn-o" onClick={() => setSendModal(true)}>
                  <Mail size={14} /> Send to Client
                </button>

                <button className="vpd-btn-p" onClick={handleOpenPdfModal} disabled={pdfLoading}>
                  {pdfLoading ? <><Loader2 size={14} className="vpd-spin" /> Generating…</> : <><Download size={14} /> Download PDF</>}
                </button>

                {(() => {
                  const alreadySent     = isSent();
                  const alreadyApproved = isApproved();
                  const alreadyExpired  = isExpired();
                  const isDisabled      = sendingForApproval || alreadySent || alreadyApproved || alreadyExpired;
                  let tooltip = 'Send this proforma for Admin/Manager approval';
                  if (alreadySent)     tooltip = 'Already sent for approval — awaiting Admin/Manager review';
                  if (alreadyApproved) tooltip = 'Proforma is already approved';
                  if (alreadyExpired)  tooltip = 'Proforma has expired';
                  return (
                    <button className="vpd-btn-send-approval" onClick={handleSendForApproval} disabled={isDisabled} title={tooltip} style={isDisabled ? { opacity: 0.55, cursor: 'not-allowed' } : {}}>
                      {sendingForApproval
                        ? <><Loader2 size={14} className="vpd-spin" /> Sending…</>
                        : alreadySent
                          ? <><Clock size={14} /> Awaiting Approval</>
                          : <><Send size={14} /> Send For Approval</>}
                    </button>
                  );
                })()}

                <button
                  className="vpd-btn-invoice"
                  disabled={!isApproved() || invoiceChecking}
                  title={isApproved() ? 'Generate Invoice from this Proforma' : 'Proforma must be Approved before generating an invoice'}
                  onClick={handleInvoiceButtonClick}
                >
                  {invoiceChecking
                    ? <><Loader2 size={14} className="vpd-spin" /> Checking…</>
                    : <><Receipt size={14} /> Generate Invoice</>}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Edit mode banner ── */}
        {editMode && (
          <div className="vpd-edit-banner">
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(217,119,6,.3)' }}>
              <PenLine size={17} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
                Edit Mode Active
                <span style={{ fontSize: 9, background: '#f59e0b', color: '#fff', padding: '2px 7px', borderRadius: 20, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>LIVE</span>
              </div>
              <div style={{ fontSize: 11.5, color: '#a16207', marginTop: 3, lineHeight: 1.5 }}>
                Edit fields inline below. Use &quot;+ Add Item&quot; to add compliance items. Click <strong>Save Changes</strong> in the top-right when done.
              </div>
            </div>
            {saveError && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#dc2626', fontWeight: 500, maxWidth: 320, lineHeight: 1.4 }}>
                <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} /> {saveError}
              </div>
            )}
          </div>
        )}

        {/* ── Admin / Manager Action Bar ── */}
        {isAdminOrManager && isPendingApproval() && (
          <div className="vpd-admin-bar">
            <span className="vpd-admin-bar-label">Admin Actions</span>
            <div style={{ display: 'flex', gap: 8, marginLeft: 4 }}>
              <button className="vpd-btn-approve" title="Approve this proforma" onClick={handleApprove} disabled={approving || rejecting}>
                {approving ? <><Loader2 size={13} className="vpd-spin" /> Approving…</> : <><ThumbsUp size={13} /> Approve</>}
              </button>
              <button className="vpd-btn-reject" title="Reject this proforma" onClick={() => { setRejectReason(''); setRejectReasonError(''); setShowRejectModal(true); }} disabled={approving || rejecting}>
                <ThumbsDown size={13} /> Reject
              </button>
            </div>
          </div>
        )}

        {/* ── Document card ── */}
        <div className={`vpd-doc${visible ? ' in' : ''}${editMode ? ' vpd-doc-editing' : ''}`}>

          {/* ══════════ HEADER ══════════ */}
          <div className="vpd-hdr">
            <div className="vpd-hdr-l">
              <div className="vpd-logo">
                <div className="vpd-logo-badge">ERP</div>
                <div>
                  {editMode ? (
                    <div className="vpd-co-edit-wrap">
                      <div
                        ref={companyBtnRef}
                        className="vpd-co-edit-btn"
                        onClick={openCompanyDrop}
                        title="Click to change company"
                      >
                        <span className="vpd-co-name" style={{ fontSize: 17 }}>
                          {QUOTATION_COMPANIES.find(c => c.id === parseInt(editCompany))?.name || companyName}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(255,255,255,.18)', borderRadius: 6, padding: '2px 6px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.9)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                          <PenLine size={9} /> Change
                        </span>
                        <ChevronDown size={13} color="rgba(255,255,255,.7)" style={{ transform: companyDropOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
                      </div>
                    </div>
                  ) : (
                    <div className="vpd-co-name">{companyName}</div>
                  )}
                  <div className="vpd-co-sub">Professional Services</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <StatusPill status={status} />
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, letterSpacing: '0.03em' }}>
                  {isExecution ? <Wrench size={11} /> : <FileText size={11} />}
                  {pTypeRaw || 'Proforma'}
                </span>
              </div>
            </div>
            <div className="vpd-hdr-r">
              <div className="vpd-doc-label">Proforma Invoice</div>
              <div className="vpd-doc-num">{pNum}</div>
              <div className="vpd-doc-date">Issued {fmtDate(proforma.issue_date || proforma.created_at)}</div>
              {proforma.valid_until && (
                <div className="vpd-doc-date">Valid until {fmtDate(proforma.valid_until)}</div>
              )}
            </div>
          </div>

          {/* ══════════ META STRIP ══════════ */}
          <div className="vpd-meta">
            <MetaBlock icon={Calendar} label="Issue Date"   value={fmtDate(proforma.issue_date || proforma.created_at)} />
            <div className="vpd-meta-sep" />
            <MetaBlock icon={Calendar} label="Valid Until"  value={fmtDate(proforma.valid_until)} />
            <div className="vpd-meta-sep" />
            {editMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Tag size={10} /> SAC Code <span style={{ color: '#f59e0b' }}>✎</span>
                </span>
                <input
                  className="vpd-edit-input"
                  value={editSacCode}
                  onChange={e => setEditSacCode(e.target.value.slice(0, 6))}
                  placeholder="e.g. 998313"
                  maxLength={6}
                  style={{ width: 100, fontFamily: 'monospace', fontWeight: 700, color: '#0f766e' }}
                />
              </div>
            ) : (
              <MetaBlock icon={Tag} label="SAC Code" value={proforma.sac_code} accent />
            )}
            <div className="vpd-meta-sep" />
            <MetaBlock icon={Hash} label="Proforma No." value={pNum} accent />
            <div className="vpd-meta-sep" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Type</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: isExecution ? '#f5f3ff' : isArchitecture ? '#fdf4ff' : '#f0f9ff', border: `1.5px solid ${isExecution ? '#ddd6fe' : isArchitecture ? '#e9d5ff' : '#bae6fd'}`, color: isExecution ? '#7c3aed' : isArchitecture ? '#9333ea' : '#0369a1', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20 }}>
                {isExecution ? <Wrench size={10} /> : <FileText size={10} />}
                {isExecution ? 'Execution' : isArchitecture ? 'Architecture' : 'Regulatory'}
              </span>
            </div>
            {createdByName && <>
              <div className="vpd-meta-sep" />
              <MetaBlock icon={User} label="Prepared By" value={createdByName} />
            </>}
          </div>

          {/* ══════════ PARTIES ══════════ */}
          <div className="vpd-parties">
            <div className="vpd-party">
              <div className="vpd-plabel">Billed To</div>
              <div className="vpd-pavatar">{clientName.charAt(0).toUpperCase()}</div>
              <div className="vpd-pname">{clientName}</div>
              {client?.email && <div className="vpd-pdetail"><User size={11} style={{ opacity: .45, flexShrink: 0 }} />{client.email}</div>}
            </div>
            <div className="vpd-arrow-col"><ChevronRight size={16} style={{ color: '#cbd5e1' }} /></div>
            <div className="vpd-party vpd-party--proj">
              <div className="vpd-plabel">Project</div>
              <div className="vpd-picon"><Building2 size={20} color="#0f766e" /></div>
              <div className="vpd-pname">{projName}</div>
              {projLoc && <div className="vpd-pdetail"><MapPin size={11} style={{ opacity: .45, flexShrink: 0 }} />{projLoc}</div>}
            </div>
            <div className="vpd-party vpd-party--rates">
              <div className="vpd-plabel">Applied Rates {editMode && <span style={{ color: '#f59e0b', fontWeight: 700 }}>— Editable</span>}</div>
              <div className="vpd-rates-list">

                {/* ── GST Rate row
                    ONLY shown for GST-applicable company (ID 1).
                    Companies 2, 3, 4: this entire row is hidden in both
                    view mode AND edit mode. ── */}
                {isGSTApplicable && (
                  <div className="vpd-rate-row">
                    <div className="vpd-rate-icon" style={{ background: '#eff6ff' }}><Percent size={14} color="#2563eb" /></div>
                    <div style={{ flex: 1 }}>
                      {editMode ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input type="number" min="0" max="100" step="0.01" className="vpd-edit-input" value={editGstRate} onChange={e => setEditGstRate(parseFloat(e.target.value) || 0)} style={{ width: 80, textAlign: 'right' }} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>%</span>
                        </div>
                      ) : (
                        <div className="vpd-rate-v">{gstRate}%</div>
                      )}
                      <div className="vpd-rate-l">GST Rate</div>
                    </div>
                  </div>
                )}

                <div className="vpd-rate-row">
                  <div className="vpd-rate-icon" style={{ background: (editMode ? editDiscRate : discRate) > 0 ? '#fff7ed' : '#f8fafc' }}>
                    <Tag size={14} color={(editMode ? editDiscRate : discRate) > 0 ? '#ea580c' : '#94a3b8'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    {editMode ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="number" min="0" max="100" step="0.01" className="vpd-edit-input" value={editDiscRate} onChange={e => setEditDiscRate(parseFloat(e.target.value) || 0)} style={{ width: 80, textAlign: 'right' }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#ea580c' }}>%</span>
                      </div>
                    ) : (
                      <div className="vpd-rate-v" style={{ color: discRate > 0 ? '#ea580c' : '#64748b' }}>
                        {discRate > 0 ? `${discRate}%` : 'Nil'}
                      </div>
                    )}
                    <div className="vpd-rate-l">Discount</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════ TWO-COLUMN BODY ══════════ */}
          <div className="vpd-body-wrap">

            {/* ── LEFT: Line Items ── */}
            <div className="vpd-body-left">

              {/* Proforma type indicator */}
              {proforma.proforma_type && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '8px 14px', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 20 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0d6360', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Proforma Type</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>{proforma.proforma_type}</span>
                </div>
              )}

              {/* ── Items table (delegated to ProformaTypeTable) ── */}
              <ProformaTypeTable
                isExecution={isExecution}
                isRegulatory={isRegulatory}
                editMode={editMode}
                items={items}
                editItems={editItems}
                updateItem={updateItem}
                removeItem={removeItem}
                onAddItem={handleOpenAddSection}
              />

            </div>

            {/* ── RIGHT: Quick Info ── */}
            <div className="vpd-body-right">
              <QuickInfoCard proforma={proforma} client={client} project={project} />
            </div>
          </div>

          {/* ══════════ FOOTER: SUMMARY + TOTALS ══════════ */}
          <div className="vpd-foot">
            {/* Left — static summary */}
            <div>
              <div className="vpd-sum-title">Proforma Summary</div>
              <div className="vpd-sum-grid">
                <div className="vpd-sum-item"><span className="vpd-sum-lbl">Total Items</span><span className="vpd-sum-val">{editMode ? editItems.length : items.length}</span></div>
                <div className="vpd-sum-item"><span className="vpd-sum-lbl">Total Quantity</span><span className="vpd-sum-val">{editMode ? editItems.reduce((s, it) => s + (parseInt(it.quantity) || 1), 0) : totalQty}</span></div>
                <div className="vpd-sum-item"><span className="vpd-sum-lbl">Compliance Groups</span><span className="vpd-sum-val">{editMode ? [...new Set(editItems.map(it => it.compliance_category))].length : groups.length}</span></div>
                <div className="vpd-sum-item"><span className="vpd-sum-lbl">SAC Code</span><span className="vpd-sum-val" style={{ color: '#0f766e', fontFamily: 'monospace' }}>{editMode ? (editSacCode || '—') : (proforma.sac_code || '—')}</span></div>
                <div className="vpd-sum-item"><span className="vpd-sum-lbl">Version</span><span className="vpd-sum-val">v{proforma.version || 1}</span></div>
                <div className="vpd-sum-item"><span className="vpd-sum-lbl">Status</span><span><StatusPill status={status} /></span></div>
                <div className="vpd-sum-item"><span className="vpd-sum-lbl">Client</span><span className="vpd-sum-val">{clientName}</span></div>
                <div className="vpd-sum-item"><span className="vpd-sum-lbl">Project</span><span className="vpd-sum-val">{projName}</span></div>
                <div className="vpd-sum-item"><span className="vpd-sum-lbl">Company</span><span className="vpd-sum-val">{companyName}</span></div>
                {createdByName && <div className="vpd-sum-item"><span className="vpd-sum-lbl">Prepared By</span><span className="vpd-sum-val">{createdByName}</span></div>}
                <div className="vpd-sum-item"><span className="vpd-sum-lbl">Issue Date</span><span className="vpd-sum-val">{fmtDate(proforma.issue_date || proforma.created_at)}</span></div>
                <div className="vpd-sum-item"><span className="vpd-sum-lbl">Last Updated</span><span className="vpd-sum-val">{fmtDate(proforma.updated_at)}</span></div>
              </div>

              {/* Execution-specific breakdown */}
              {isExecution && items.length > 0 && !editMode && (
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
              {proforma.notes && <div className="vpd-remarks"><div className="vpd-rem-title">Notes</div><p className="vpd-rem-text">{proforma.notes}</p></div>}
              {proforma.terms && <div className="vpd-remarks"><div className="vpd-rem-title">Terms &amp; Conditions</div><p className="vpd-rem-text">{proforma.terms}</p></div>}
            </div>

            {/* Right — totals box */}
            <div>
              {editMode ? (
                (() => {
                  const eSub   = calcEditSubtotal();
                  const eDisc  = calcEditDiscAmt(eSub);
                  const eTax   = parseFloat((eSub - eDisc).toFixed(2));
                  const eGst   = calcEditGstAmt(eSub, eDisc);
                  const eGrand = calcEditGrandTotal();
                  return (
                    <div className="vpd-edit-totals">
                      <div className="vpd-tbox-title" style={{ color: '#065f46' }}>
                        Live Calculation
                        <span style={{ marginLeft: 6, fontSize: 9, background: '#059669', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>EDIT MODE</span>
                        {!isGSTApplicable && (
                          <span style={{ marginLeft: 6, fontSize: 9, background: '#64748b', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>NO GST</span>
                        )}
                      </div>
                      <div className="vpd-trow"><span>Subtotal</span><span style={{ fontWeight: 700, color: '#1e293b' }}>₹&nbsp;{fmtINR(eSub)}</span></div>
                      {eDisc > 0 && <>
                        <div className="vpd-trow vpd-trow--disc"><span>Discount ({editDiscRate}%)</span><span style={{ fontWeight: 700 }}>−&nbsp;₹&nbsp;{fmtINR(eDisc)}</span></div>
                        <div className="vpd-trow vpd-trow--sub"><span>Taxable Amount</span><span>₹&nbsp;{fmtINR(eTax)}</span></div>
                      </>}
                      {isGSTApplicable && eGst > 0 && (
                        <div className="vpd-trow"><span>GST ({editGstRate}%)</span><span style={{ fontWeight: 700, color: '#1e293b' }}>+&nbsp;₹&nbsp;{fmtINR(eGst)}</span></div>
                      )}
                      <hr className="vpd-tdiv" />
                      <div className="vpd-grand" style={{ fontSize: 21 }}>
                        <span>Grand Total</span>
                        <span style={{ color: '#059669' }}>₹&nbsp;{fmtINR(eGrand)}</span>
                      </div>
                      <div className="vpd-words"><strong style={{ color: '#94a3b8', fontStyle: 'normal' }}>In words: </strong>{numberToWords(eGrand)} Rupees only</div>
                      <button className="vpd-btn-save" onClick={handleSaveUpdate} disabled={saving} style={{ width: '100%', marginTop: 14, padding: 11, justifyContent: 'center', borderRadius: 10 }}>
                        {saving ? <><Loader2 size={15} className="vpd-spin" /> Saving…</> : <><Save size={15} /> Save Changes</>}
                      </button>
                      {saveError && (
                        <div className="vpd-save-err" style={{ marginTop: 8 }}>
                          <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} /> {saveError}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="vpd-tbox">
                  <div className="vpd-tbox-title">Amount Due</div>
                  <div className="vpd-trow"><span>Subtotal</span><span style={{ fontWeight: 700, color: '#1e293b' }}>₹&nbsp;{fmtINR(subtotal)}</span></div>
                  {discAmt > 0 && <>
                    <div className="vpd-trow vpd-trow--disc"><span>Discount ({discRate}%)</span><span style={{ fontWeight: 700 }}>−&nbsp;₹&nbsp;{fmtINR(discAmt)}</span></div>
                    <div className="vpd-trow vpd-trow--sub"><span>Taxable Amount</span><span>₹&nbsp;{fmtINR(taxable)}</span></div>
                  </>}
                  {gstAmt > 0 && <div className="vpd-trow"><span>GST ({gstRate}%)</span><span style={{ fontWeight: 700, color: '#1e293b' }}>+&nbsp;₹&nbsp;{fmtINR(gstAmt)}</span></div>}
                  <hr className="vpd-tdiv" />
                  <div className="vpd-grand"><span>Grand Total</span><span>₹&nbsp;{fmtINR(grandTotal)}</span></div>
                  <div className="vpd-words"><strong style={{ color: '#94a3b8', fontStyle: 'normal' }}>In words: </strong>{numberToWords(grandTotal)} Rupees only</div>
                </div>
              )}
              {!editMode && (
                <button className="vpd-dl-btn" onClick={handleOpenPdfModal} disabled={pdfLoading}>
                  {pdfLoading ? <><Loader2 size={15} className="vpd-spin" /> Generating PDF…</> : <><Download size={15} /> Download PDF</>}
                </button>
              )}
            </div>
          </div>

          {/* ══════════ DOC FOOTER ══════════ */}
          <div className="vpd-doc-foot">
            <span>This is a system-generated proforma invoice. Valid for 30 days from the issue date.</span>
            <span>{pNum}&nbsp;·&nbsp;{fmtDate(proforma.issue_date || proforma.created_at)}</span>
          </div>

        </div>{/* end .vpd-doc */}

        {/* ══════════ NOTES SECTION ══════════ */}
        {!loading && proforma && (
          <Notes entityType={NOTE_ENTITY.PROFORMA} entityId={proforma.id} />
        )}

      </div>{/* end .vpd-root */}

      {/* ══════════ SEND TO CLIENT MODAL ══════════ */}
      <SendEmailModal
        isOpen={sendModal}
        onClose={() => setSendModal(false)}
        title="Send Proforma to Client"
        defaultRecipient={client?.email || ''}
        defaultSubject={`Proforma ${pNum}${proforma.issue_date || proforma.created_at ? ` — Issued ${fmtDate(proforma.issue_date || proforma.created_at)}` : ''}`}
        defaultBody={`Dear ${client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Client' : 'Client'},\n\nPlease find attached your proforma invoice ${pNum}${proforma.issue_date || proforma.created_at ? `, issued on ${fmtDate(proforma.issue_date || proforma.created_at)}` : ''}.\n\nKindly review the details and feel free to reach out if you have any questions.\n\nBest regards,\n${companyName}`}
        onSuccess={() => setSendModal(false)}
      />

      {/* ══════════ ADD COMPLIANCE MODAL ══════════ */}
      <AddComplianceModal
        isOpen={showAddSection}
        onClose={() => setShowAddSection(false)}
        onSave={handleComplianceSave}
        existingItems={editItems}
        fetchDescriptions={fetchDescriptionsForModal}
        quotationType={proforma?.proforma_type || ''}
      />

      {/* ══════════ APPROVAL TOASTS ══════════ */}
      {approvalToast === 'sent' && (
        <div className="vpd-success-toast" style={{ background: '#0284c7' }}>
          <Send size={16} /> Sent for approval successfully!
        </div>
      )}
      {approvalToast === 'approved' && (
        <div className="vpd-success-toast" style={{ background: '#059669' }}>
          <CheckCircle size={16} /> Proforma approved successfully!
        </div>
      )}
      {approvalToast === 'rejected' && (
        <div className="vpd-success-toast" style={{ background: '#dc2626' }}>
          <XCircle size={16} /> Proforma rejected.
        </div>
      )}

      {/* ══════════ UPDATE REASON MODAL ══════════ */}
      {showUpdateReasonModal && (
        <div className="fixed inset-0 z-[10000]" style={{ position: 'fixed', overflow: 'hidden', animation: 'vpd_overlay_in .2s ease', fontFamily: "'Outfit', sans-serif" }}>
          <div className="absolute inset-0 bg-black/50" style={{ position: 'fixed', width: '100vw', height: '100vh' }} onClick={() => setShowUpdateReasonModal(false)} />
          <div className="relative z-10 flex items-center justify-center p-4" style={{ height: '100vh' }}>
            <div className="relative animate-scaleIn" style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 460, boxShadow: '0 32px 80px rgba(0,0,0,.28)', overflow: 'hidden', animation: 'vpd_modal_in .3s cubic-bezier(.16,1,.3,1)', fontFamily: "'Outfit', sans-serif" }} onClick={e => e.stopPropagation()}>
              <div style={{ background: 'linear-gradient(135deg,#b45309 0%,#d97706 45%,#f59e0b 100%)', padding: '20px 24px 18px', borderRadius: '20px 20px 0 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,.18)', border: '1.5px solid rgba(255,255,255,.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <PenLine size={18} color="#fff" />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>Reason for Update</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>Briefly describe what you are changing</div>
                    </div>
                  </div>
                  <button onClick={() => { setShowUpdateReasonModal(false); setUpdateReason(''); setUpdateReasonError(''); }} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', transition: 'background .15s' }}>
                    <X size={15} />
                  </button>
                </div>
              </div>
              <div style={{ padding: '22px 24px 24px', background: '#fafafa', fontFamily: "'Outfit', sans-serif" }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 18 }}>
                  <AlertCircle size={14} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ margin: 0, fontSize: 12, color: '#92400e', lineHeight: 1.6, fontFamily: "'Outfit', sans-serif" }}>
                    This reason will be recorded in the proforma history so the team can track what changed and why.
                  </p>
                </div>
                <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: "'Outfit', sans-serif" }}>
                  Update Reason <span style={{ color: '#dc2626' }}>*</span>
                </div>
                <textarea
                  style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${updateReasonError ? '#fca5a5' : '#e2e8f0'}`, borderRadius: 10, fontSize: 13, fontFamily: "'Outfit', sans-serif", color: '#1e293b', resize: 'vertical', minHeight: 96, outline: 'none', transition: 'border-color .15s, box-shadow .15s', boxSizing: 'border-box', background: '#fff' }}
                  placeholder="e.g. Corrected GST rate from 18% to 12%, added new compliance item per client request..."
                  value={updateReason}
                  onChange={e => { setUpdateReason(e.target.value); setUpdateReasonError(''); }}
                  onFocus={e => { e.target.style.borderColor = '#d97706'; e.target.style.boxShadow = '0 0 0 3px rgba(217,119,6,.12)'; }}
                  onBlur={e => { e.target.style.borderColor = updateReasonError ? '#fca5a5' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                  autoFocus
                />
                {updateReasonError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#dc2626', marginTop: 6, fontWeight: 500, fontFamily: "'Outfit', sans-serif" }}>
                    <AlertCircle size={13} /> {updateReasonError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                  <button className="vpd-btn-cancel" style={{ fontFamily: "'Outfit', sans-serif" }} onClick={() => { setShowUpdateReasonModal(false); setUpdateReason(''); setUpdateReasonError(''); }} disabled={saving}>Cancel</button>
                  <button
                    onClick={handleSaveUpdateConfirm}
                    disabled={saving || !updateReason.trim()}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 9, border: 'none', background: saving || !updateReason.trim() ? '#d1d5db' : 'linear-gradient(135deg,#d97706,#f59e0b)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving || !updateReason.trim() ? 'not-allowed' : 'pointer', transition: 'all .15s', boxShadow: saving || !updateReason.trim() ? 'none' : '0 2px 8px rgba(217,119,6,.35)', fontFamily: "'Outfit', sans-serif" }}
                  >
                    {saving ? <><Loader2 size={13} className="vpd-spin" /> Saving…</> : <><Save size={13} /> Confirm & Save</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ REJECT MODAL ══════════ */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[10000]" style={{ position: 'fixed', overflow: 'hidden', animation: 'vpd_overlay_in .2s ease', fontFamily: "'Outfit', sans-serif" }}>
          <div className="absolute inset-0 bg-black/50" style={{ position: 'fixed', width: '100vw', height: '100vh' }} onClick={() => setShowRejectModal(false)} />
          <div className="relative z-10 flex items-center justify-center p-4" style={{ height: '100vh' }}>
            <div className="relative bg-white" style={{ borderRadius: 20, padding: '28px 28px 24px', width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.24)', animation: 'vpd_modal_in .3s cubic-bezier(.16,1,.3,1)', fontFamily: "'Outfit', sans-serif" }} onClick={e => e.stopPropagation()}>
              <div className="vpd-modal-title" style={{ fontFamily: "'Outfit', sans-serif" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fef2f2', border: '1.5px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ThumbsDown size={18} color="#dc2626" />
                </div>
                Reject Proforma
              </div>
              <p className="vpd-modal-sub" style={{ fontFamily: "'Outfit', sans-serif" }}>Please provide a reason for rejection. This will be recorded and visible to the team.</p>
              <div className="vpd-modal-label" style={{ fontFamily: "'Outfit', sans-serif" }}>Rejection Reason <span style={{ color: '#dc2626' }}>*</span></div>
              <textarea
                className="vpd-modal-textarea"
                placeholder="e.g. Incorrect line items, amounts need revision..."
                value={rejectReason}
                onChange={e => { setRejectReason(e.target.value); setRejectReasonError(''); }}
                onFocus={e => { e.target.style.borderColor = '#dc2626'; e.target.style.boxShadow = '0 0 0 3px rgba(220,38,38,.1)'; }}
                onBlur={e => { e.target.style.borderColor = rejectReasonError ? '#fca5a5' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: '#1e293b' }}
                autoFocus
              />
              {rejectReasonError && (
                <div className="vpd-modal-err" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  <AlertCircle size={13} /> {rejectReasonError}
                </div>
              )}
              <div className="vpd-modal-actions">
                <button className="vpd-btn-cancel" style={{ fontFamily: "'Outfit', sans-serif" }} onClick={() => { setShowRejectModal(false); setRejectReason(''); setRejectReasonError(''); }} disabled={rejecting}>Cancel</button>
                <button className="vpd-btn-reject" style={{ fontFamily: "'Outfit', sans-serif" }} onClick={handleRejectSubmit} disabled={rejecting || !rejectReason.trim()}>
                  {rejecting ? <><Loader2 size={13} className="vpd-spin" /> Rejecting…</> : <><ThumbsDown size={13} /> Confirm Reject</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ GENERATE INVOICE MODAL ══════════ */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-[10000]" style={{ position: 'fixed', overflow: 'hidden', animation: 'vpd_overlay_in .2s ease', fontFamily: "'Outfit', sans-serif" }}>
          <div className="absolute inset-0 bg-black/50" style={{ position: 'fixed', width: '100vw', height: '100vh' }} onClick={() => { if (!invoiceGenerating) { setShowInvoiceModal(false); setInvoiceSuccess(null); } }} />
          <div className="relative z-10 flex items-center justify-center p-4" style={{ height: '100vh' }}>
            <div className="relative bg-white" style={{ borderRadius: 24, width: '100%', maxWidth: 420, boxShadow: '0 40px 100px rgba(0,0,0,.24)', overflow: 'hidden', animation: 'vpd_modal_in .32s cubic-bezier(.16,1,.3,1)', fontFamily: "'Outfit', sans-serif" }} onClick={e => e.stopPropagation()}>

              <div style={{ height: 5, background: 'linear-gradient(90deg,#7c3aed,#6d28d9,#8b5cf6)' }} />

              {invoiceSuccess ? (
                <div style={{ padding: '36px 32px 28px', textAlign: 'center' }}>
                  <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid #c4b5fd', animation: 'vqd_pulse_ring 1.8s ease-out infinite' }} />
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#ede9fe,#ddd6fe)', border: '2px solid #c4b5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(124,58,237,.2)' }}>
                      <CheckCircle size={38} color="#7c3aed" />
                    </div>
                  </div>
                  <div style={{ fontSize: 21, fontWeight: 800, color: '#1e293b', letterSpacing: '-.02em', marginBottom: 8 }}>Invoice Generated!</div>
                  <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, marginBottom: 6 }}>Your invoice has been successfully created and is ready to review.</div>
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
                    <button onClick={() => { setShowInvoiceModal(false); setInvoiceSuccess(null); navigate(`/invoices/${invoiceSuccess.id}`, { state: { invoiceType: invoiceSuccess.invoice_type || (isExecution ? 'Execution Compliance' : 'Regulatory Compliance'), invoiceData: invoiceSuccess } }); }} style={{ width: '100%', padding: '13px 20px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
                      <Receipt size={15} /> View Invoice
                    </button>
                    <button onClick={() => { setShowInvoiceModal(false); setInvoiceSuccess(null); navigate('/invoices'); }} style={{ width: '100%', padding: '12px 20px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Go to Invoice List</button>
                    <button onClick={() => { setShowInvoiceModal(false); setInvoiceSuccess(null); }} style={{ width: '100%', padding: '10px 20px', background: 'none', border: 'none', borderRadius: 12, color: '#94a3b8', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Stay on this Proforma</button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '28px 28px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Receipt size={20} color="#fff" />
                      </div>
                      <div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: '#1e293b' }}>Generate Invoice</div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{pNum}</div>
                      </div>
                    </div>
                    <button onClick={() => { if (!invoiceGenerating) setShowInvoiceModal(false); }} style={{ width: 30, height: 30, borderRadius: 8, background: '#f1f5f9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                      <X size={14} />
                    </button>
                  </div>
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginBottom: 20, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Proforma Total</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>₹&nbsp;{fmtINR(grandTotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Invoice Type</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: isExecution ? '#7c3aed' : '#0369a1' }}>{isExecution ? 'Execution Compliance' : 'Regulatory Compliance'}</span>
                    </div>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6, fontFamily: "'Outfit', sans-serif" }}>Advance Amount (₹) — Optional</label>
                    <input
                      type="number" min="0" step="0.01"
                      placeholder="e.g. 50000"
                      value={advanceAmount}
                      onChange={e => { setAdvanceAmount(e.target.value); setInvoiceError(''); }}
                      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#1e293b', outline: 'none', fontFamily: "'Outfit', sans-serif", boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = '#7c3aed'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    />
                    <p style={{ margin: '5px 0 0', fontSize: 11, color: '#94a3b8', fontFamily: "'Outfit', sans-serif" }}>Leave blank if no advance has been paid.</p>
                  </div>
                  {invoiceError && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12.5, color: '#dc2626' }}>
                      <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {invoiceError}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setShowInvoiceModal(false)} style={{ flex: 1, padding: '11px 16px', border: '2px solid #94a3b8', borderRadius: 10, background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    <button onClick={handleGenerateInvoice} disabled={invoiceGenerating} style={{ flex: 2, padding: '11px 16px', border: 'none', borderRadius: 10, background: invoiceGenerating ? '#d1d5db' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: invoiceGenerating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
                      {invoiceGenerating ? <><Loader2 size={14} className="vpd-spin" /> Generating…</> : <><Receipt size={14} /> Generate Invoice</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════ PDF DOWNLOAD MODAL ══════════ */}
      {showPdfModal && (
        <div className="fixed inset-0 z-[9999] pointer-events-none" style={{ position: 'fixed' }}>
          <div
            className="absolute inset-0 bg-black/50 pointer-events-auto"
            style={{ position: 'fixed', width: '100vw', height: '100vh' }}
            onClick={() => !pdfLoading && setShowPdfModal(false)}
          />
          <div className="relative z-10 flex items-center justify-center p-4 pointer-events-none" style={{ height: '100vh' }}>
            <div
              style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '90vh', boxShadow: '0 32px 80px rgba(0,0,0,.28)', overflow: 'hidden', fontFamily: "'Outfit', sans-serif", display: 'flex', flexDirection: 'column' }}
              className="pointer-events-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* ── Sticky Header ── */}
              <div style={{ background: 'linear-gradient(135deg,#0c6e67 0%,#0f766e 45%,#0d9488 100%)', padding: '20px 24px 18px', position: 'sticky', top: 0, zIndex: 2, borderRadius: '20px 20px 0 0', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,.18)', border: '1.5px solid rgba(255,255,255,.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileSearch size={17} color="#fff" />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>Generate Proforma PDF</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{pNum} · {companyName}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => !pdfLoading && setShowPdfModal(false)}
                    style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.15)', border: 'none', cursor: pdfLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* ── Body ── */}
              <div className="vpd-pdf-body" style={{ padding: '22px 24px 24px', background: '#fff', overflowY: 'auto', flex: 1, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {(() => {
                  const companyId      = parseInt(proforma?.company) || 0;
                  const isConstructive = companyId === 1;

                  const fieldWrap  = { marginBottom: 14 };
                  const labelStyle = { fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5 };
                  const inputStyle = {
                    width: '100%', padding: '8px 11px', border: '1.5px solid #e2e8f0', borderRadius: 9,
                    fontSize: 13, color: '#1e293b', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                    background: pdfLoading ? '#f8fafc' : '#fff',
                  };
                  const onFocus = e => { e.target.style.borderColor = '#0f766e'; e.target.style.boxShadow = '0 0 0 3px rgba(15,118,110,.1)'; };
                  const onBlur  = e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; };

                  return (
                    <>
                      {/* ── Form fields grid ── */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                        {/* Company Name — full width */}
                        <div style={{ ...fieldWrap, gridColumn: '1 / -1' }}>
                          <div style={labelStyle}>Company Name <span style={{ color: '#dc2626', marginLeft: 3 }}>*</span></div>
                          <input type="text" placeholder="e.g. ABC Construction Pvt. Ltd." value={pdfCompanyName} onChange={e => setPdfCompanyName(e.target.value)} onFocus={onFocus} onBlur={onBlur} disabled={pdfLoading} style={{ ...inputStyle, borderColor: pdfCompanyName === '' && pdfError ? '#fca5a5' : '#e2e8f0' }} />
                        </div>
                        {/* Address — full width */}
                        <div style={{ ...fieldWrap, gridColumn: '1 / -1' }}>
                          <div style={labelStyle}>Address <span style={{ color: '#dc2626', marginLeft: 3 }}>*</span></div>
                          <input type="text" placeholder="e.g. 123 Main St, Mumbai" value={pdfAddress} onChange={e => { setPdfAddress(e.target.value); setPdfError(''); }} onFocus={onFocus} onBlur={onBlur} disabled={pdfLoading} style={{ ...inputStyle, borderColor: !pdfAddress.trim() && pdfError ? '#fca5a5' : '#e2e8f0' }} />
                        </div>
                        {/* GST No — full width */}
                        <div style={{ ...fieldWrap, gridColumn: '1 / -1' }}>
                          <div style={labelStyle}>GST No.</div>
                          <input type="text" placeholder="e.g. 27AABCU9603R1ZX" value={pdfGstNo} onChange={e => setPdfGstNo(e.target.value)} onFocus={onFocus} onBlur={onBlur} disabled={pdfLoading} style={inputStyle} />
                        </div>
                        {/* State */}
                        <div style={fieldWrap}>
                          <div style={labelStyle}>State</div>
                          <input type="text" placeholder="e.g. Maharashtra" value={pdfState} onChange={e => setPdfState(e.target.value)} onFocus={onFocus} onBlur={onBlur} disabled={pdfLoading} style={inputStyle} />
                        </div>
                        {/* Code */}
                        <div style={fieldWrap}>
                          <div style={labelStyle}>Code</div>
                          <input type="text" placeholder="e.g. MH" value={pdfCode} onChange={e => setPdfCode(e.target.value)} onFocus={onFocus} onBlur={onBlur} disabled={pdfLoading} style={inputStyle} />
                        </div>
                        {/* PO No */}
                        <div style={fieldWrap}>
                          <div style={labelStyle}>PO No.</div>
                          <input type="text" placeholder="e.g. PO-2024-001" value={pdfPoNo} onChange={e => setPdfPoNo(e.target.value)} onFocus={onFocus} onBlur={onBlur} disabled={pdfLoading} style={inputStyle} />
                        </div>
                        {/* Schedule Date */}
                        <div style={fieldWrap}>
                          <div style={labelStyle}>Schedule Date <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'none', fontWeight: 400 }}>(optional)</span></div>
                          <input type="date" value={pdfScheduleDate} onChange={e => setPdfScheduleDate(e.target.value)} onFocus={onFocus} onBlur={onBlur} disabled={pdfLoading} style={inputStyle} />
                        </div>

                        {/* Constructive-only fields */}
                        {isConstructive && (
                          <>
                            <div style={{ ...fieldWrap, gridColumn: '1 / -1' }}>
                              <div style={labelStyle}>SAC Code</div>
                              <input type="text" placeholder="e.g. 998313" value={pdfSacCode} onChange={e => setPdfSacCode(e.target.value)} onFocus={onFocus} onBlur={onBlur} disabled={pdfLoading} style={inputStyle} />
                            </div>
                            <div style={fieldWrap}>
                              <div style={labelStyle}>Invoice Date</div>
                              <input type="date" value={pdfInvoiceDate} onChange={e => setPdfInvoiceDate(e.target.value)} onFocus={onFocus} onBlur={onBlur} disabled={pdfLoading} style={inputStyle} />
                            </div>
                            <div style={fieldWrap}>
                              <div style={labelStyle}>Work Order Date</div>
                              <input type="date" value={pdfWorkOrderDate} onChange={e => setPdfWorkOrderDate(e.target.value)} onFocus={onFocus} onBlur={onBlur} disabled={pdfLoading} style={inputStyle} />
                            </div>
                            <div style={fieldWrap}>
                              <div style={labelStyle}>Valid From</div>
                              <input type="date" value={pdfValidFrom} onChange={e => setPdfValidFrom(e.target.value)} onFocus={onFocus} onBlur={onBlur} disabled={pdfLoading} style={inputStyle} />
                            </div>
                            <div style={fieldWrap}>
                              <div style={labelStyle}>Valid Till</div>
                              <input type="date" value={pdfValidTill} onChange={e => setPdfValidTill(e.target.value)} onFocus={onFocus} onBlur={onBlur} disabled={pdfLoading} style={inputStyle} />
                            </div>
                            <div style={{ ...fieldWrap, gridColumn: '1 / -1' }}>
                              <div style={labelStyle}>Vendor Code</div>
                              <input type="text" placeholder="e.g. VND-001" value={pdfVendorCode} onChange={e => setPdfVendorCode(e.target.value)} onFocus={onFocus} onBlur={onBlur} disabled={pdfLoading} style={inputStyle} />
                            </div>
                          </>
                        )}
                      </div>

                      {/* Scope of Work — full width below grid */}
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5 }}>
                          Scope of Work <span style={{ color: '#dc2626' }}>*</span>
                        </div>
                        <textarea
                          rows={3}
                          placeholder="e.g. Supply, installation and commissioning of plumbing works as per approved drawings…"
                          value={scopeOfWork}
                          onChange={e => { setScopeOfWork(e.target.value); setScopeError(''); setPdfError(''); }}
                          onFocus={e => { e.target.style.borderColor = '#0f766e'; e.target.style.boxShadow = '0 0 0 3px rgba(15,118,110,.1)'; }}
                          onBlur={e => { e.target.style.borderColor = scopeError ? '#fca5a5' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                          disabled={pdfLoading}
                          style={{ width: '100%', padding: '9px 11px', border: `1.5px solid ${scopeError ? '#fca5a5' : '#e2e8f0'}`, borderRadius: 9, fontSize: 13, fontFamily: 'inherit', color: '#1e293b', resize: 'vertical', outline: 'none', boxSizing: 'border-box', background: pdfLoading ? '#f8fafc' : '#fff' }}
                        />
                        {scopeError && (
                          <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <AlertCircle size={11} /> {scopeError}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}

                {/* API error */}
                {pdfError && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '11px 14px', marginBottom: 8, fontSize: 12.5, color: '#dc2626', fontWeight: 500 }}>
                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>PDF generation failed</div>
                      <div style={{ fontWeight: 400 }}>{pdfError}</div>
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div style={{ display: 'flex', gap: 10, marginTop: 4, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => !pdfLoading && setShowPdfModal(false)}
                    disabled={pdfLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 9, background: '#fff', border: '2px solid #94a3b8', color: '#475569', fontSize: 13, fontWeight: 600, cursor: pdfLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmPdfDownload}
                    disabled={pdfLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 22px', borderRadius: 9, border: 'none', background: pdfLoading ? '#d1d5db' : '#0f766e', color: '#fff', fontSize: 13, fontWeight: 700, cursor: pdfLoading ? 'not-allowed' : 'pointer', boxShadow: pdfLoading ? 'none' : '0 2px 8px rgba(15,118,110,.3)', fontFamily: 'inherit', transition: 'all .15s' }}
                  >
                    {pdfLoading
                      ? <><Loader2 size={13} style={{ animation: 'vpd_spin .7s linear infinite' }} /> Generating…</>
                      : <><Download size={13} /> Generate &amp; Download</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ INVOICE ALREADY EXISTS TOAST ══════════ */}
      {invoiceModal.open && invoiceModal.alreadyExists && (
        <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 9999, background: '#fff', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,.14), 0 0 0 1px rgba(0,0,0,.06)', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', maxWidth: 380, width: '100%', animation: 'vpd_toast_in .3s cubic-bezier(.16,1,.3,1)', borderLeft: '4px solid #7c3aed', fontFamily: "'Outfit', sans-serif" }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: '#faf5ff', border: '1.5px solid #ddd6fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Receipt size={16} color="#7c3aed" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>Invoice Already Exists</div>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 10 }}>An invoice has already been generated for this proforma.</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {invoiceModal.invoiceId && (
                <button onClick={() => { dismissInvoiceModal(); navigate(`/invoices/${invoiceModal.invoiceId}`, { state: { invoiceType: invoiceModal.invoiceType || '' } }); }} style={{ padding: '5px 12px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', border: 'none', borderRadius: 7, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Receipt size={11} /> {invoiceModal.invoiceNum ? `View ${invoiceModal.invoiceNum}` : 'View Invoice'}
                </button>
              )}
              <button onClick={() => { dismissInvoiceModal(); navigate('/invoices'); }} style={{ padding: '5px 12px', background: '#7c3aed', border: 'none', borderRadius: 7, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Receipt size={11} /> View Invoice List
              </button>
              <button onClick={dismissInvoiceModal} style={{ padding: '5px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 7, color: '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Dismiss</button>
            </div>
          </div>
          <button onClick={dismissInvoiceModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, flexShrink: 0, lineHeight: 1 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ══════════ SAVE SUCCESS TOAST ══════════ */}
      {saveSuccess && (
        <div className="vpd-success-toast">
          <CheckCircle size={17} />
          Proforma updated successfully!
        </div>
      )}

      {/* ── Company dropdown — fixed so it escapes overflow:hidden parents ── */}
      {companyDropOpen && (
        <div
          ref={companyDropRef}
          className="vpd-co-dropdown"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          <div className="vpd-co-dd-header">Select Company</div>
          {QUOTATION_COMPANIES.map(co => {
            const isActive = parseInt(editCompany) === co.id;
            return (
              <div
                key={co.id}
                className={`vpd-co-dd-item${isActive ? ' active' : ''}`}
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