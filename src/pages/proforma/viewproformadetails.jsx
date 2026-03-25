import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Loader2, AlertCircle,
  CheckCircle, Clock, Send, FileText, XCircle,
  Building2, User, MapPin, Hash, Calendar,
  Tag, Percent, ChevronRight, Mail, FileEdit,
  ThumbsUp, ThumbsDown, Receipt,
  Edit2, Save, RotateCcw, Plus, Trash2, PenLine,
  Edit, X, Paperclip,
} from 'lucide-react';
import { getProformaById, updateProformaFull, getComplianceByCategory, sendProformaForApproval, approveProforma, rejectProforma } from '../../services/proforma';
import { createInvoice } from '../../services/invoices';
import { getClientById } from '../../services/clients';
import { getProjects } from '../../services/projects';
import { useRole } from '../../components/RoleContext';
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

const COMPLIANCE_GROUPS = {
  certificates: [1, 2],
  execution: [3, 4],
};

// STATUS_CONFIG — aligned with backend Proforma model:
// 1=Draft  2=Sent (pending approval)  3=Approved  4=Rejected  5=Expired
const STATUS_CONFIG = {
  '1':         { label: 'Draft',               Icon: FileText,    color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  '2':         { label: 'Sent for Approval',   Icon: Clock,       color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  '3':         { label: 'Approved',            Icon: CheckCircle, color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  '4':         { label: 'Rejected',            Icon: XCircle,     color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  '5':         { label: 'Expired',             Icon: XCircle,     color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
  'draft':     { label: 'Draft',               Icon: FileText,    color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  'sent':      { label: 'Sent for Approval',   Icon: Clock,       color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  'approved':  { label: 'Approved',            Icon: CheckCircle, color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  'rejected':  { label: 'Rejected',            Icon: XCircle,     color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  'expired':   { label: 'Expired',             Icon: XCircle,     color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtPNum = (n) => {
  if (!n) return '—';
  if (String(n).startsWith('PF-')) return String(n);
  const s = String(n);
  if (s.length >= 8) return `PF-${s.substring(0, 4)}-${s.substring(4).padStart(5, '0')}`;
  return `PF-2026-${String(n).padStart(5, '0')}`;
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
  try { return new Date(ds).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
};

const isMiscNumeric = (v) => {
  if (v === '' || v == null) return false;
  const s = String(v).trim();
  return s !== '' && !isNaN(s) && !isNaN(parseFloat(s));
};

// getStatus: tries numeric string key first (e.g. '3'), then lowercase string (e.g. 'approved')
const getStatus = (s) => {
  const key = String(s || '');
  return STATUS_CONFIG[key] || STATUS_CONFIG[key.toLowerCase()] || STATUS_CONFIG['1'];
};

const groupItemsByCategory = (items = []) => {
  const groups = {};
  items.forEach((item) => {
    const catId = item.compliance_category ?? item.category ?? null;
    const key = catId != null ? String(catId) : 'other';
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

// ─── Number to words ──────────────────────────────────────────────────────────
function numberToWords(n) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const convert = (num) => {
    if (num === 0) return '';
    if (num < 20) return ones[num] + ' ';
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? '-' + ones[num % 10] : '') + ' ';
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred ' + convert(num % 100);
    if (num < 100000) return convert(Math.floor(num / 1000)) + 'Thousand ' + convert(num % 1000);
    if (num < 10000000) return convert(Math.floor(num / 100000)) + 'Lakh ' + convert(num % 100000);
    return convert(Math.floor(num / 10000000)) + 'Crore ' + convert(n % 10000000);
  };
  const int = Math.floor(Math.abs(n));
  const dec = Math.round((Math.abs(n) - int) * 100);
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
    <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 4 }}>
      <Icon size={10} /> {label}
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

  const timeline = [
    {
      title: 'Proforma Generated',
      sub: fmtDate(proforma.created_at),
      color: '#059669', bg: '#ecfdf5', border: '#bbf7d0',
      Icon: CheckCircle, pending: false,
    },
    ...(proforma.updated_at && proforma.updated_at !== proforma.created_at ? [{
      title: 'Last Updated',
      sub: fmtDate(proforma.updated_at),
      color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe',
      Icon: FileEdit, pending: false,
    }] : []),
    {
      title: 'Awaiting Client Approval',
      sub: 'Pending client response',
      color: '#d97706', bg: '#fffbeb', border: '#fcd34d',
      Icon: Clock, pending: true,
    },
  ];

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
                { label: 'GST Rate',      value: `${parseFloat(proforma.gst_rate || 0)}%`,       color: '#2563eb' },
                { label: 'Discount',      value: parseFloat(proforma.discount_rate || 0) > 0 ? `${parseFloat(proforma.discount_rate)}%` : 'Nil', color: '#ea580c' },
                { label: 'SAC Code',      value: proforma.sac_code || '—',                         color: '#0f766e' },
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

        // Derive icon + color from event string
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
            {/* vertical connector line */}
            <div style={{ position: 'absolute', left: 33, top: 24, bottom: 24, width: 2, background: 'linear-gradient(to bottom,#0d9488 0%,#e2e8f0 100%)', borderRadius: 2, zIndex: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative', zIndex: 1 }}>
              {entries.map((ev, i) => {
                const style = getEventStyle(ev.event || '');
                const ts    = ev.timestamp || ev.timespan || '';
                const isLast = i === entries.length - 1;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingBottom: isLast ? 0 : 14 }}>
                    {/* dot */}
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: style.bg, border: `2px solid ${style.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 0 3px #fff', fontSize: 13 }}>
                      {style.dot}
                    </div>
                    {/* content */}
                    <div style={{ flex: 1, paddingTop: 4, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: style.color, lineHeight: 1.4, marginBottom: 2, wordBreak: 'break-word' }}>
                        {ev.event || 'Event'}
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500, marginBottom: 1 }}>
                        {fmtMetaTime(ts)}
                      </div>
                      {ev.by && (
                        <div style={{ fontSize: 10, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'linear-gradient(135deg,#0f766e,#0d9488)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', fontWeight: 800, flexShrink: 0 }}>
                            {ev.by.charAt(0).toUpperCase()}
                          </span>
                          {ev.by}
                        </div>
                      )}
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

const calcItemTotal = (item) => {
  const prof = parseFloat(item.Professional_amount || 0);
  const misc = isMiscNumeric(item.miscellaneous_amount) ? parseFloat(item.miscellaneous_amount) : 0;
  return parseFloat(((prof + misc) * (parseInt(item.quantity) || 1)).toFixed(2));
};


// ─── Send to Client Modal ────────────────────────────────────────────────────

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

const SendToClientModal = ({ proforma, client, pNum, issuedDate, onClose }) => {
  const defaultEmail   = client?.email || '';
  const defaultSubject = `Proforma ${pNum}${issuedDate ? ` — Issued ${issuedDate}` : ''}`;
  const defaultBody    = `Dear ${client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Client' : 'Client'},\n\nPlease find attached your proforma invoice ${pNum}${issuedDate ? `, issued on ${issuedDate}` : ''}.\n\nKindly review the details and feel free to reach out if you have any questions.\n\nBest regards,\nERP System`;

  const [email,   setEmail]   = useState(defaultEmail);
  const [subject, setSubject] = useState(defaultSubject);
  const [body,    setBody]    = useState(defaultBody);
  const [extras,  setExtras]  = useState([]);
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');
  const fileInputRef = useRef(null);

  const totalExtraSize   = extras.reduce((s, f) => s + f.size, 0);
  const estimatedPdfSize = 2 * 1024 * 1024;
  const remainingBytes   = MAX_ATTACHMENT_BYTES - estimatedPdfSize - totalExtraSize;

  const handleAddFiles = (e) => {
    const newFiles = Array.from(e.target.files || []);
    if (!newFiles.length) return;
    const combined  = [...extras, ...newFiles];
    const totalSize = combined.reduce((s, f) => s + f.size, 0) + estimatedPdfSize;
    if (totalSize > MAX_ATTACHMENT_BYTES) { setError('Adding these files would exceed the 25 MB limit.'); return; }
    setExtras(combined); setError(''); e.target.value = '';
  };
  const removeExtra = (idx) => setExtras(prev => prev.filter((_, i) => i !== idx));

  const handleSend = async () => {
    if (!email.trim()) { setError('Recipient email is required.'); return; }
    if (!/\S+@\S+\.\S+/.test(email.trim())) { setError('Please enter a valid email address.'); return; }
    setError(''); setSending(true);
    try {
      // TODO: wire to proforma send-to-client API when available
      await new Promise(r => setTimeout(r, 900));
      setSent(true);
    } catch (e) { setError(e.message || 'Failed to send email. Please try again.'); }
    finally { setSending(false); }
  };

  const fmtSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-[10000]" style={{ position: 'fixed', overflow: 'hidden', animation: 'vpd_overlay_in .2s ease' }}>
      <div className="absolute inset-0 bg-black/50" style={{ position: 'fixed', width: '100vw', height: '100vh' }} onClick={onClose} />
      <div className="relative z-10 flex items-center justify-center p-4" style={{ height: '100vh' }}>
        <div className="relative bg-white" style={{ borderRadius: 18, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,.24)', overflow: 'hidden', fontFamily: "'Outfit', sans-serif", animation: 'vpd_modal_in .3s cubic-bezier(.16,1,.3,1)' }} onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 16px', borderBottom: '1.5px solid #f0f4f8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#0f766e,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mail size={17} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Send to Client</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{pNum}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <X size={15} />
            </button>
          </div>

          {sent ? (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <CheckCircle size={28} color="#059669" />
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Email Sent!</div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                Proforma <strong>{pNum}</strong> has been sent to<br /><strong>{email}</strong>
              </div>
              <button onClick={onClose} style={{ marginTop: 22, padding: '9px 28px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Done</button>
            </div>
          ) : (
            <div style={{ padding: '20px 22px 22px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '75vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '9px 12px' }}>
                <FileText size={14} color="#059669" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#15803d', fontWeight: 500 }}><strong>{pNum}.pdf</strong> will be automatically attached</span>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 5 }}>Recipient Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="client@example.com" style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#1e293b', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor='#0f766e'} onBlur={e => e.target.style.borderColor='#e2e8f0'} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 5 }}>Subject</label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#1e293b', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor='#0f766e'} onBlur={e => e.target.style.borderColor='#e2e8f0'} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 5 }}>Message</label>
                <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#1e293b', outline: 'none', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor='#0f766e'} onBlur={e => e.target.style.borderColor='#e2e8f0'} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.07em' }}>Additional Attachments</label>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>~{fmtSize(Math.max(0, remainingBytes))} remaining</span>
                </div>
                {extras.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8 }}>
                    {extras.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderRadius: 8, padding: '6px 10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <Paperclip size={12} color="#64748b" />
                          <span style={{ fontSize: 12, color: '#334155', fontWeight: 500 }}>{f.name}</span>
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>({fmtSize(f.size)})</span>
                        </div>
                        <button onClick={() => removeExtra(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, display: 'flex', alignItems: 'center' }}><X size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => fileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, border: '1.5px dashed #cbd5e1', background: '#f8fafc', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
                  <Paperclip size={13} /> Add Attachment
                </button>
                <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleAddFiles} />
                <p style={{ fontSize: 10, color: '#94a3b8', margin: '5px 0 0', textAlign: 'center' }}>Max total size: 25 MB (including PDF)</p>
              </div>
              {error && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 9, padding: '9px 12px' }}>
                  <AlertCircle size={14} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 12, color: '#dc2626', lineHeight: 1.5 }}>{error}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 9, marginTop: 2 }}>
                <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 10, border: '2px solid #94a3b8', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSend} disabled={sending} style={{ flex: 2, padding: 10, borderRadius: 10, background: sending ? '#94a3b8' : '#0f766e', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                  {sending ? <><Loader2 size={14} style={{ animation: 'vpd_spin .7s linear infinite' }} /> Sending…</> : <><Send size={14} /> Send Email</>}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ViewProformaDetails({ onUpdateNavigation }) {
  const { id }   = useParams();
  const navigate = useNavigate();

  // ── Role-based access via RoleContext (set by AuthenticatedLayout) ──────────
  const { userRole } = useRole();
  const isAdminOrManager = userRole === 'Admin' || userRole === 'Manager';

  const [proforma,      setProforma]      = useState(null);
  const [client,        setClient]        = useState(null);
  const [project,       setProject]       = useState(null);
  const [createdByName, setCreatedByName] = useState('');
  const [loading,       setLoading]       = useState(true);
  const [fetchError,    setFetchError]    = useState('');
  const [pdfLoading,    setPdfLoading]    = useState(false);
  const [visible,       setVisible]       = useState(false);

  // ── Edit mode state (mirrors viewquotationdetails exactly) ───────────────────
  const [editMode,    setEditMode]    = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Approval flow state ───────────────────────────────────────────────────────
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

  // ── Generate Invoice modal state ─────────────────────────────────────────────
  const [showInvoiceModal,   setShowInvoiceModal]   = useState(false);
  const [advanceAmount,      setAdvanceAmount]      = useState('');
  const [invoiceGenerating,  setInvoiceGenerating]  = useState(false);
  const [invoiceChecking,    setInvoiceChecking]    = useState(false); // true while pre-checking for existing invoice
  const [invoiceError,       setInvoiceError]       = useState('');
  const [invoiceSuccess,     setInvoiceSuccess]     = useState(null); // holds created invoice object

  // ── Invoice Already Exists toast state (mirrors proformaModal in viewquotationdetails) ──
  const [invoiceModal, setInvoiceModal] = useState({
    open: false,
    invoiceId: null,
    invoiceNum: '',
    alreadyExists: false,
    genericError: '',
  });

  const [editSacCode,  setEditSacCode]  = useState('');
  const [editGstRate,  setEditGstRate]  = useState(0);
  const [editDiscRate, setEditDiscRate] = useState(0);
  const [editItems,    setEditItems]    = useState([]);

  // ── Compliance modal state — handled by AddComplianceModal component ────────
  const [showAddSection, setShowAddSection] = useState(false);

  // Scroll lock when modal open
  // Lock body scroll whenever ANY modal is open — prevents blue/scrollable background
  useEffect(() => {
    const anyModalOpen = showAddSection || showUpdateReasonModal || showRejectModal || sendModal;
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
  }, [showAddSection, showUpdateReasonModal, showRejectModal, sendModal, showInvoiceModal]);

  // ── Compliance modal helpers ─────────────────────────────────────────────────

  /**
   * fetchDescriptionsForModal — passed to AddComplianceModal as fetchDescriptions prop.
   * Calls the proforma service and returns a plain array of description objects.
   */
  const fetchDescriptionsForModal = async (categoryId, subCategoryId) => {
    const res = await getComplianceByCategory(categoryId, subCategoryId || null);
    if (res?.status === 'success' && res?.data?.results) return res.data.results;
    return [];
  };

  const handleOpenAddSection = () => setShowAddSection(true);

  /**
   * Called by AddComplianceModal when user clicks "Save Compliance".
   * newFlatItems is already correctly tagged per category — just append to editItems.
   */
  const handleComplianceSave = (newFlatItems) => {
    setEditItems(prev => [...prev, ...newFlatItems]);
    setShowAddSection(false);
  };

  // ── Edit mode lifecycle ──────────────────────────────────────────────────────

  const enterEditMode = () => {
    if (!proforma) return;
    // Block editing when sent for approval, approved, or expired
    if (isSent() || isApproved() || isExpired()) return;
    setEditSacCode(proforma.sac_code || '');
    setEditGstRate(parseFloat(proforma.gst_rate || 0));
    setEditDiscRate(parseFloat(proforma.discount_rate || 0));
    setEditItems((proforma.items || []).map(it => ({
      id:                      it.id,
      description:             it.description || it.compliance_name || '',
      quantity:                parseInt(it.quantity) || 1,
      Professional_amount:     parseFloat(it.Professional_amount || 0),
      miscellaneous_amount:    (it.miscellaneous_amount === '--' || it.miscellaneous_amount === null) ? '' : (it.miscellaneous_amount || ''),
      compliance_category:     it.compliance_category ?? 1,
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

  // Step 1: validate fields, then open the reason modal
  const handleSaveUpdate = () => {
    setSaveError('');
    for (const it of editItems) {
      if (!String(it.description).trim()) { setSaveError('All items must have a description.'); return; }
      if ((parseInt(it.quantity) || 0) <= 0) { setSaveError('All quantities must be ≥ 1.'); return; }
      if ((parseFloat(it.Professional_amount) || 0) <= 0) { setSaveError('Professional amount must be > 0 for all items.'); return; }
    }
    if (!editSacCode.trim()) { setSaveError('SAC Code is required.'); return; }
    // All fields valid — open reason modal before submitting
    setUpdateReason('');
    setUpdateReasonError('');
    setShowUpdateReasonModal(true);
  };

  // Step 2: called from the reason modal — actually submits to backend
  const handleSaveUpdateConfirm = async () => {
    if (!updateReason.trim()) { setUpdateReasonError('Please provide a reason for this update.'); return; }
    setUpdateReasonError('');
    setShowUpdateReasonModal(false);
    setSaving(true);
    try {
      const sub   = calcEditSubtotal();
      const disc  = calcEditDiscAmt(sub);
      const gst   = calcEditGstAmt(sub, disc);
      const grand = sub - disc + gst;

      const payload = {
        id:               parseInt(proforma.id),
        client:           parseInt(proforma.client),
        project:          parseInt(proforma.project),
        issue_date:       proforma.issue_date  || new Date().toISOString(),
        valid_until:      proforma.valid_until || new Date().toISOString(),
        sac_code:         editSacCode.trim(),
        gst_rate:         String(parseFloat(editGstRate || 0).toFixed(2)),
        discount_rate:    String(parseFloat(editDiscRate || 0).toFixed(2)),
        total_amount:     String(parseFloat(sub.toFixed(2))),
        total_gst_amount: String(parseFloat(gst.toFixed(2))),
        grand_total:      String(parseFloat(grand.toFixed(2))),
        reason:           updateReason.trim(),
        status:           getProformaStatus() || 1,
        items: editItems.map(it => {
          const rawId  = it.id != null ? parseInt(it.id) : null;
          const itemId = rawId && rawId > 0 ? rawId : null;
          return {
            id:                      itemId,
            description:             String(it.description).trim(),
            quantity:                parseInt(it.quantity) || 1,
            Professional_amount:     String(parseFloat((parseFloat(it.Professional_amount) || 0).toFixed(2))),
            miscellaneous_amount:    String(it.miscellaneous_amount ?? '').trim() || '--',
            total_amount:            String(parseFloat(calcItemTotal(it).toFixed(2))),
            compliance_category:     parseInt(it.compliance_category) || 1,
            sub_compliance_category: parseInt(it.sub_compliance_category) || 0,
          };
        }),
      };

      const data = await updateProformaFull(payload);

      if (data && (data.id || data.proforma_number || data.status === 'success')) {
        const updated = data.data || data;
        setProforma(prev => ({
          ...prev, ...updated,
          sac_code:      editSacCode.trim(),
          gst_rate:      String(editGstRate),
          discount_rate: String(editDiscRate),
          total_amount:  sub, total_gst_amount: gst, grand_total: grand,
          items: updated.items || editItems.map(it => ({
            ...it,
            miscellaneous_amount: String(it.miscellaneous_amount ?? '').trim() || '--',
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

  // ── Approval helpers ────────────────────────────────────────────────────────

  // ── Status helpers — backend model: 1=Draft 2=Sent 3=Approved 4=Rejected 5=Expired ──
  // Checks BOTH the numeric status field AND status_display string (case-insensitive)
  // so it works correctly on fresh page load AND after optimistic UI updates.
  const getProformaStatus = () => {
    const raw = proforma?.status;
    // Could be integer 3, string '3', or string 'Approved' — normalise to int when possible
    const n = parseInt(raw);
    return isNaN(n) ? 0 : n;
  };
  const getStatusDisplay = () => String(proforma?.status_display ?? '').toLowerCase().trim();

  const isDraft    = () => getProformaStatus() === 1 || getStatusDisplay() === 'draft';
  const isSent     = () => getProformaStatus() === 2 || getStatusDisplay() === 'sent';
  const isApproved = () => getProformaStatus() === 3 || getStatusDisplay() === 'approved';
  const isRejected = () => getProformaStatus() === 4 || getStatusDisplay() === 'rejected';
  const isExpired  = () => getProformaStatus() === 5 || getStatusDisplay() === 'expired';

  // isPendingApproval = proforma has been sent and is awaiting Admin/Manager action
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
      // Optimistically update, then re-fetch real backend state
      setProforma(prev => ({ ...prev, status: 2, status_display: 'Sent' }));
      showApprovalToastMsg('sent');
      try {
        const fresh = await getProformaById(proforma.id);
        if (fresh?.status === 'success' && fresh?.data) {
          setProforma(fresh.data);
        }
      } catch { /* silently ignore */ }
    } catch (e) {
      const msg = e.response?.data?.errors?.detail
        || e.response?.data?.message
        || e.response?.data?.detail
        || 'Failed to send for approval.';
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
      // API returns data:true — not the updated proforma object.
      // Optimistically update UI immediately, then re-fetch to sync real backend state.
      setProforma(prev => ({ ...prev, status: 3, status_display: 'Approved' }));
      showApprovalToastMsg('approved');
      // Re-fetch to get the real persisted status so page reload stays consistent
      try {
        const fresh = await getProformaById(proforma.id);
        if (fresh?.status === 'success' && fresh?.data) {
          setProforma(fresh.data);
        }
      } catch { /* silently ignore re-fetch error — optimistic state already set */ }
    } catch (e) {
      const msg = e.response?.data?.errors?.detail
        || e.response?.data?.message
        || e.response?.data?.detail
        || 'Failed to approve proforma.';
      setSaveError(msg);
    } finally {
      setApproving(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      setRejectReasonError('Please provide a reason for rejection.');
      return;
    }
    setRejectReasonError('');
    setRejecting(true);
    try {
      await rejectProforma(proforma.id, rejectReason);
      // Optimistically update UI, then re-fetch real backend state
      setProforma(prev => ({ ...prev, status: 4, status_display: 'Rejected' }));
      setShowRejectModal(false);
      setRejectReason('');
      showApprovalToastMsg('rejected');
      // Re-fetch to ensure status persists correctly on reload
      try {
        const fresh = await getProformaById(proforma.id);
        if (fresh?.status === 'success' && fresh?.data) {
          setProforma(fresh.data);
        }
      } catch { /* silently ignore */ }
    } catch (e) {
      const msg = e.response?.data?.errors?.detail
        || e.response?.data?.message
        || e.response?.data?.detail
        || 'Failed to reject proforma.';
      setRejectReasonError(msg);
    } finally {
      setRejecting(false);
    }
  };

  // ── Helper: fetch the invoice that belongs to this specific proforma ─────────
  // The backend's get_all_invoices does not reliably filter by proforma param,
  // so we fetch the first page and match client-side by proforma id.
  // ── Invoice number formatter — display EXACTLY as returned by API, never reformat ──
  const fmtInvNum = (n) => n ? String(n) : '—';

  // ── Extract the shared trailing digits from a proforma/invoice number ─────────
  // e.g. "PF-2026-3075433" → "3075433", "INV-202603-3075433" → "3075433"
  const extractTrailingDigits = (numStr) => {
    if (!numStr) return '';
    const s = String(numStr);
    const lastDash = s.lastIndexOf('-');
    return lastDash >= 0 ? s.substring(lastDash + 1) : s;
  };

  // ── Find the invoice for THIS proforma by matching shared trailing digits ─────
  // The backend invoice number is derived from the proforma number, so they share
  // the same trailing segment (e.g. PF-2026-3075433 → INV-202603-3075433).
  // get_all_invoices has NO proforma filter param, so we match client-side.
  const fetchInvoiceForThisProforma = async () => {
    const proformaTrailing = extractTrailingDigits(proforma.proforma_number || String(proforma.id));
    const res = await api.get('/invoices/get_all_invoices/', {
      params: { page: 1, page_size: 100 },
    });
    const results = res.data?.data?.results || res.data?.results || [];
    // First try: match by proforma field on the invoice object (most reliable)
    const proformaId = Number(proforma.id);
    let match = results.find((inv) => Number(inv.proforma) === proformaId);
    // Second try: match by shared trailing digits in invoice_number
    if (!match && proformaTrailing) {
      match = results.find((inv) => {
        const invTrailing = extractTrailingDigits(inv.invoice_number);
        return invTrailing && invTrailing === proformaTrailing;
      });
    }
    return match || null;
  };

  // ── Dismiss invoice modal helper ─────────────────────────────────────────────
  const dismissInvoiceModal = () =>
    setInvoiceModal({ open: false, invoiceId: null, invoiceNum: '', alreadyExists: false, genericError: '' });

  // ── Generate Invoice button click ─────────────────────────────────────────────
  // Pre-checks for an existing invoice BEFORE opening the modal so the modal
  // never opens if an invoice already exists. Uses fetchInvoiceForThisProforma
  // which matches by proforma field AND by shared trailing digits.
  const handleInvoiceButtonClick = async () => {
    if (!isApproved()) return;
    setInvoiceChecking(true);
    try {
      const existing = await fetchInvoiceForThisProforma();
      if (existing) {
        setInvoiceModal({
          open: true,
          invoiceId: existing.id,
          invoiceNum: fmtInvNum(existing.invoice_number),
          alreadyExists: true,
          genericError: '',
        });
        return; // Never open the modal
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
      const res = await createInvoice({
        proforma:       proforma.id,
        advance_amount: String(advance.toFixed(2)),
      });
      const created = res?.data || res;
      if (!created?.id && !created?.invoice_number) {
        setInvoiceError('Invoice created but response was unexpected. Please check Invoice List.');
        return;
      }
      setInvoiceSuccess(created);
    } catch (e) {
      const status = e.response?.status;
      const respData = e.response?.data;

      // ── 409 Conflict: safety-net if pre-check missed it ──────────────────────
      if (status === 409) {
        setShowInvoiceModal(false);
        let existingId  = null;
        let existingNum = '';
        try {
          const match = await fetchInvoiceForThisProforma();
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

  const fetchData = useCallback(async () => {
    if (!id) { setFetchError('No proforma ID provided'); setLoading(false); return; }
    setLoading(true); setFetchError('');
    try {
      const res = await getProformaById(id);
      if (res.status !== 'success' || !res.data) throw new Error('Failed to load proforma');
      const p = res.data;
      // Debug: log exact status values so we can verify backend response
      console.log('[Proforma] Loaded status:', p.status, '| status_display:', p.status_display);
      setProforma(p);

      if (p.client) {
        try {
          const cr = await getClientById(p.client);
          if (cr.status === 'success' && cr.data) setClient(cr.data);
        } catch {}
      }
      if (p.project) {
        try {
          const pr  = await getProjects({ page: 1, page_size: 500 });
          const all = pr?.data?.results || pr?.results || [];
          const found = all.find(proj => String(proj.id) === String(p.project));
          if (found) setProject(found);
        } catch {}
      }
      if (p.created_by) {
        try {
          const ur = await api.get('/users/get_user/', { params: { id: p.created_by } });
          if (ur.data?.status === 'success' && ur.data?.data) {
            const u = ur.data.data;
            setCreatedByName(`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || '');
          }
        } catch {}
      }
      setTimeout(() => setVisible(true), 60);
    } catch (e) {
      setFetchError(e.message || 'Failed to load proforma details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); window.scrollTo(0, 0); }, [fetchData]);

  const handleDownload = async () => {
    if (pdfLoading) return;
    try {
      setPdfLoading(true);
      // TODO: wire to proforma PDF endpoint when available
      const response = await api.get(`/proformas/${id}/generate_pdf/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${fmtPNum(proforma?.proforma_number)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PDF download failed:', e);
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading)     return <LoadingView />;
  if (fetchError)  return <ErrorView message={fetchError} onRetry={fetchData} onBack={() => navigate('/proforma')} />;
  if (!proforma)   return <ErrorView message="Proforma not available." onRetry={fetchData} onBack={() => navigate('/proforma')} />;

  // ── Derived values ──
  const status     = getStatus(proforma.status ?? proforma.status_display ?? 1);
  const pNum       = fmtPNum(proforma.proforma_number);
  const subtotal   = parseFloat(proforma.total_amount  || 0);
  const gstRate    = parseFloat(proforma.gst_rate      || 0);
  const discRate   = parseFloat(proforma.discount_rate || 0);
  const discAmt    = parseFloat(((subtotal * discRate) / 100).toFixed(2));
  const taxable    = parseFloat((subtotal - discAmt).toFixed(2));
  const gstAmt     = parseFloat(((taxable * gstRate) / 100).toFixed(2));
  const grandTotal = parseFloat((taxable + gstAmt).toFixed(2));
  const items      = proforma.items || [];
  const groups     = groupItemsByCategory(items);
  const totalQty   = items.reduce((s, it) => s + (parseInt(it.quantity) || 1), 0);

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
        .vpd-party{padding-right:24px}
        .vpd-party--proj{padding-left:24px;padding-right:24px}
        .vpd-party--rates{padding-left:24px;border-left:1.5px solid #f0f4f8}
        .vpd-plabel{font-size:9.5px;font-weight:800;letter-spacing:.14em;color:#94a3b8;text-transform:uppercase;margin-bottom:10px}
        .vpd-pavatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#0f766e,#0d9488);color:#fff;font-size:18px;font-weight:800;display:flex;align-items:center;justify-content:center;margin-bottom:8px}
        .vpd-picon{width:44px;height:44px;border-radius:10px;background:#f0fdf4;border:1.5px solid #bbf7d0;display:flex;align-items:center;justify-content:center;margin-bottom:8px}
        .vpd-pname{font-size:15px;font-weight:700;color:#1e293b;line-height:1.3;margin-bottom:5px}
        .vpd-pdetail{display:flex;align-items:center;gap:5px;font-size:12px;color:#64748b;margin-bottom:3px;word-break:break-all}
        .vpd-rates-list{display:flex;flex-direction:column;gap:12px}
        .vpd-rate-row{display:flex;align-items:center;gap:10px}
        .vpd-rate-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .vpd-rate-v{font-size:15px;font-weight:800;color:#1e293b;line-height:1.2}
        .vpd-rate-l{font-size:11px;color:#94a3b8;font-weight:500}
        /* ── Two-column layout: document left, quick info right ── */
        .vpd-body-wrap{display:grid;grid-template-columns:1fr 310px;gap:20px;padding:0 40px 32px;align-items:start}
        .vpd-body-left{min-width:0}
        .vpd-body-right{position:sticky;top:20px;display:flex;flex-direction:column;gap:0}
        .vpd-sec-hdr{display:flex;align-items:center;gap:8px;padding:22px 0 14px;border-bottom:2px solid #f0f4f8;font-size:13px;font-weight:700;color:#1e293b}
        .vpd-sec-badge{background:#ecfdf5;color:#059669;font-size:10.5px;font-weight:700;padding:2px 9px;border-radius:20px;border:1px solid #bbf7d0}
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
        .vpd-btn-invoice{display:flex;align-items:center;gap:6px;padding:7px 15px;border-radius:8px;background:linear-gradient(135deg,#7c3aed,#6d28d9);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;box-shadow:0 2px 8px rgba(109,40,217,.25)}
        .vpd-btn-invoice:hover{background:linear-gradient(135deg,#6d28d9,#5b21b6);box-shadow:0 4px 12px rgba(109,40,217,.35)}
        .vpd-btn-invoice:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}
        .vpd-admin-bar{display:flex;align-items:center;gap:8px;padding:10px 16px;background:linear-gradient(135deg,#faf5ff,#ede9fe);border:1.5px solid #ddd6fe;border-radius:12px;margin-bottom:14px}
        .vpd-admin-bar-label{font-size:10px;font-weight:800;color:#7c3aed;text-transform:uppercase;letter-spacing:.1em;margin-right:4px}
        .vpd-btn-edit{display:flex;align-items:center;gap:6px;padding:7px 16px;border-radius:8px;background:linear-gradient(135deg,#f59e0b,#d97706);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;box-shadow:0 2px 8px rgba(217,119,6,.25)}
        .vpd-btn-edit:hover{background:linear-gradient(135deg,#d97706,#b45309);box-shadow:0 4px 12px rgba(217,119,6,.35)}
        .vpd-btn-edit:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}
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
        @keyframes vqd_pulse_ring{0%{transform:scale(1);opacity:.6}70%{transform:scale(1.18);opacity:0}100%{transform:scale(1.18);opacity:0}}
        @keyframes vpd_modal_in{from{opacity:0;transform:scale(.93) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes vpd_overlay_in{from{opacity:0}to{opacity:1}}
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
                {/* Update Proforma — disabled when Sent/Approved/Expired; re-enabled when Rejected */}
                {(() => {
                  const cantEdit = isSent() || isApproved() || isExpired();
                  let editTitle = 'Edit this proforma';
                  if (isSent())     editTitle = 'Cannot edit — proforma is awaiting approval';
                  if (isApproved()) editTitle = 'Cannot edit — proforma is approved';
                  if (isExpired())  editTitle = 'Cannot edit — proforma has expired';
                  return (
                    <button
                      className="vpd-btn-edit"
                      onClick={enterEditMode}
                      disabled={cantEdit}
                      title={editTitle}
                      style={cantEdit ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                    >
                      <Edit2 size={14} /> Update Proforma
                    </button>
                  );
                })()}

                {/* Send to Client — all roles */}
                <button className="vpd-btn-o" onClick={() => setSendModal(true)}>
                  <Mail size={14} /> Send to Client
                </button>

                {/* Download PDF — all roles */}
                <button className="vpd-btn-p" onClick={handleDownload} disabled={pdfLoading}>
                  {pdfLoading ? <><Loader2 size={14} className="vpd-spin" /> Generating…</> : <><Download size={14} /> Download PDF</>}
                </button>

                {/* Send For Approval — always visible; disabled when already sent/approved/expired */}
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
                    <button
                      className="vpd-btn-send-approval"
                      onClick={handleSendForApproval}
                      disabled={isDisabled}
                      title={tooltip}
                      style={isDisabled ? { opacity: 0.55, cursor: 'not-allowed' } : {}}
                    >
                      {sendingForApproval
                        ? <><Loader2 size={14} className="vpd-spin" /> Sending…</>
                        : alreadySent
                          ? <><Clock size={14} /> Awaiting Approval</>
                          : <><Send size={14} /> Send For Approval</>}
                    </button>
                  );
                })()}

                {/* Generate Invoice — only enabled when Approved (status=3) */}
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
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <PenLine size={15} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>Edit Mode Active</div>
              <div style={{ fontSize: 11, color: '#a16207', marginTop: 1 }}>
                Edit any field inline or click "+ Add Item" to add new compliance items. Click "Save Changes" when done.
              </div>
            </div>
            {saveError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#dc2626', fontWeight: 500 }}>
                <AlertCircle size={13} /> {saveError}
              </div>
            )}
          </div>
        )}

        {/* ── Admin / Manager Action Bar — only shown when proforma is pending approval ── */}
        {isAdminOrManager && isPendingApproval() && (
          <div className="vpd-admin-bar">
            <span className="vpd-admin-bar-label">Admin Actions</span>
            <div style={{ display: 'flex', gap: 8, marginLeft: 4 }}>
              <button
                className="vpd-btn-approve"
                title="Approve this proforma"
                onClick={handleApprove}
                disabled={approving || rejecting}
              >
                {approving
                  ? <><Loader2 size={13} className="vpd-spin" /> Approving…</>
                  : <><ThumbsUp size={13} /> Approve</>}
              </button>
              <button
                className="vpd-btn-reject"
                title="Reject this proforma"
                onClick={() => { setRejectReason(''); setRejectReasonError(''); setShowRejectModal(true); }}
                disabled={approving || rejecting}
              >
                <ThumbsDown size={13} /> Reject
              </button>
            </div>
          </div>
        )}

        {/* ── Document card ── */}
        <div className={`vpd-doc${visible ? ' in' : ''}`}>

          {/* ══════════ HEADER ══════════ */}
          <div className="vpd-hdr">
            <div className="vpd-hdr-l">
              <div className="vpd-logo">
                <div className="vpd-logo-badge">ERP</div>
                <div>
                  <div className="vpd-co-name">ERP System</div>
                  <div className="vpd-co-sub">Professional Services</div>
                </div>
              </div>
              <StatusPill status={status} />
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
            <MetaBlock icon={Calendar} label="Issue Date"    value={fmtDate(proforma.issue_date || proforma.created_at)} />
            <div className="vpd-meta-sep" />
            <MetaBlock icon={Calendar} label="Valid Until"   value={fmtDate(proforma.valid_until)} />
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
            <MetaBlock icon={Hash}     label="Proforma No."  value={pNum} accent />
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
              {client?.phone_number && <div className="vpd-pdetail"><Hash size={11} style={{ opacity: .45, flexShrink: 0 }} />{client.phone_number}</div>}
            </div>
            <div className="vpd-arrow-col"><ChevronRight size={16} style={{ color: '#cbd5e1' }} /></div>
            <div className="vpd-party vpd-party--proj">
              <div className="vpd-plabel">Project</div>
              <div className="vpd-picon"><Building2 size={20} color="#0f766e" /></div>
              <div className="vpd-pname">{projName}</div>
              {projLoc && <div className="vpd-pdetail"><MapPin size={11} style={{ opacity: .45, flexShrink: 0 }} />{projLoc}</div>}
              {project?.address && <div className="vpd-pdetail" style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{project.address}</div>}
            </div>
            <div className="vpd-party vpd-party--rates">
              <div className="vpd-plabel">Applied Rates {editMode && <span style={{ color: '#f59e0b', fontWeight: 700 }}>— Editable</span>}</div>
              <div className="vpd-rates-list">
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

          {/* ══════════ TWO-COLUMN BODY: Items LEFT + Quick Info RIGHT ══════════ */}
          <div className="vpd-body-wrap">

            {/* ── LEFT: Line Items ── */}
            <div className="vpd-body-left">
              <div className="vpd-sec-hdr">
                <FileText size={15} color="#0f766e" />
                Services &amp; Compliance Items
                <span className="vpd-sec-badge">
                  {editMode ? editItems.length : items.length} {(editMode ? editItems.length : items.length) === 1 ? 'item' : 'items'}
                </span>

                {/* Add Item button — edit mode only */}
                {editMode && (
                  <button
                    onClick={handleOpenAddSection}
                    style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'linear-gradient(135deg,#0f766e,#0d9488)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(15,118,110,.25)', transition: 'all .15s' }}
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
                <div className="vpd-table-wrap">
                  <table className="vpd-table">
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
                          <tr className="vpd-cat-row">
                            <td colSpan={7}>
                              <div className="vpd-cat-inner">
                                <span className="vpd-cat-dot" />
                                {grp.catName}
                                <span className="vpd-cat-cnt">{grp.items.length} item{grp.items.length !== 1 ? 's' : ''}</span>
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
                            const miscStr = miscRaw && String(miscRaw).trim() && String(miscRaw).trim() !== '--' ? String(miscRaw).trim() : null;
                            return (
                              <tr key={ii} className="vpd-row">
                                <td className="vpd-row-idx">{ii + 1}</td>
                                <td><div className="vpd-desc">{item.description || item.compliance_name || '—'}</div></td>
                                <td>{subCat ? <span className="vpd-subcat">{subCat.name}</span> : <span style={{ color: '#e2e8f0', fontSize: 12 }}>—</span>}</td>
                                <td style={{ textAlign: 'center' }}><span className="vpd-qty-badge">{qty}</span></td>
                                <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b', fontSize: 13 }}>₹&nbsp;{fmtINR(prof)}</td>
                                <td style={{ textAlign: 'right', fontSize: 12 }}>
                                  {miscStr
                                    ? isMiscNumeric(miscStr)
                                      ? <span style={{ color: '#475569', fontWeight: 600 }}>₹&nbsp;{fmtINR(parseFloat(miscStr))}</span>
                                      : <span className="vpd-misc-note" title="Note — not in total">{miscStr}</span>
                                    : <span style={{ color: '#e2e8f0' }}>—</span>}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 800, color: '#1e293b', fontSize: 13 }}>₹&nbsp;{fmtINR(total)}</td>
                              </tr>
                            );
                          })}
                          <tr className="vpd-cat-sub">
                            <td colSpan={6} style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', fontStyle: 'italic', paddingRight: 14 }}>{grp.catName} subtotal</td>
                            <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 13, color: '#0f766e', paddingRight: 4 }}>₹&nbsp;{fmtINR(grpTotal)}</td>
                          </tr>
                        </tbody>
                      );
                    })}
                  </table>
                </div>
              ))}

              {/* ── EDIT MODE TABLE ── */}
              {editMode && (
                <div className="vpd-table-wrap">
                  {editItems.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 8 }}>
                      <FileText size={28} color="#e2e8f0" />
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>No items. Click "+ Add Item" above to get started.</p>
                    </div>
                  ) : (() => {
                    const editGroups = {};
                    editItems.forEach((it, globalIdx) => {
                      const catId = it.compliance_category ?? 0;
                      const key   = String(catId);
                      if (!editGroups[key]) editGroups[key] = { catId, catName: COMPLIANCE_CATEGORIES[catId] || `Category ${catId}`, rows: [] };
                      editGroups[key].rows.push({ it, globalIdx });
                    });
                    return (
                      <table className="vpd-table" style={{ tableLayout: 'fixed' }}>
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
                              <tr className="vpd-cat-row">
                                <td colSpan={7}>
                                  <div className="vpd-cat-inner">
                                    <span className="vpd-cat-dot" />{grp.catName}
                                    <span className="vpd-cat-cnt">{grp.rows.length} item{grp.rows.length !== 1 ? 's' : ''}</span>
                                  </div>
                                </td>
                              </tr>
                              {grp.rows.map(({ it, globalIdx }) => (
                                <tr key={globalIdx} className="vpd-edit-row">
                                  <td style={{ textAlign: 'center', fontSize: 11, color: '#d1d5db', fontWeight: 700 }}>{globalIdx + 1}</td>
                                  <td>
                                    <textarea className="vpd-edit-input" value={it.description}
                                      onChange={e => updateItem(globalIdx, 'description', e.target.value)}
                                      rows={2} style={{ resize: 'vertical', minHeight: 42, fontSize: 12 }} placeholder="Service description…" />
                                  </td>
                                  <td>
                                    <input type="number" min="1" className="vpd-edit-input" value={it.quantity}
                                      onChange={e => updateItem(globalIdx, 'quantity', parseInt(e.target.value) || 1)}
                                      style={{ textAlign: 'center', width: '100%' }} />
                                  </td>
                                  <td>
                                    <input type="number" min="0" step="0.01" className="vpd-edit-input"
                                      value={it.Professional_amount === 0 ? '' : it.Professional_amount}
                                      onChange={e => updateItem(globalIdx, 'Professional_amount', parseFloat(e.target.value) || 0)}
                                      placeholder="0.00" style={{ textAlign: 'right', width: '100%' }} />
                                  </td>
                                  <td>
                                    <input type="text" className="vpd-edit-input" value={it.miscellaneous_amount}
                                      onChange={e => updateItem(globalIdx, 'miscellaneous_amount', e.target.value)}
                                      placeholder="Amount or note"
                                      style={{ textAlign: 'right', width: '100%', borderColor: it.miscellaneous_amount && !isMiscNumeric(it.miscellaneous_amount) ? '#fbbf24' : undefined }} />
                                    {it.miscellaneous_amount && !isMiscNumeric(it.miscellaneous_amount) && (
                                      <div style={{ fontSize: 10, color: '#d97706', marginTop: 2 }}>Note only — not calculated</div>
                                    )}
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0f766e' }}>₹&nbsp;{fmtINR(calcItemTotal(it))}</span>
                                    <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>(Prof+Misc)×Qty</div>
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <button onClick={() => removeItem(globalIdx)}
                                      style={{ width: 28, height: 28, border: 'none', background: '#fef2f2', borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}
                                      title="Remove item"><Trash2 size={13} /></button>
                                  </td>
                                </tr>
                              ))}
                              <tr className="vpd-cat-sub">
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

            {/* ── RIGHT: Quick Info ── */}
            <div className="vpd-body-right">
              <QuickInfoCard proforma={proforma} client={client} project={project} />
            </div>
          </div>

          {/* ══════════ FOOTER: SUMMARY + TOTALS ══════════ */}
          <div className="vpd-foot">
            {/* Left — static summary (no editable fields here — edits are inline above) */}
            <div>
              <div className="vpd-sum-title">Proforma Summary</div>
              <div className="vpd-sum-grid">
                <div className="vpd-sum-item"><span className="vpd-sum-lbl">Total Items</span><span className="vpd-sum-val">{editMode ? editItems.length : items.length}</span></div>
                <div className="vpd-sum-item"><span className="vpd-sum-lbl">Total Quantity</span><span className="vpd-sum-val">{editMode ? editItems.reduce((s, it) => s + (parseInt(it.quantity) || 1), 0) : totalQty}</span></div>
                <div className="vpd-sum-item"><span className="vpd-sum-lbl">Compliance Groups</span><span className="vpd-sum-val">{editMode ? [...new Set(editItems.map(it => it.compliance_category))].length : groups.length}</span></div>
                <div className="vpd-sum-item"><span className="vpd-sum-lbl">SAC Code</span><span className="vpd-sum-val" style={{ color: '#0f766e', fontFamily: 'monospace' }}>{editMode ? (editSacCode || '—') : (proforma.sac_code || '—')}</span></div>
                <div className="vpd-sum-item"><span className="vpd-sum-lbl">Version</span><span className="vpd-sum-val">v{proforma.version || 1}</span></div>
                <div className="vpd-sum-item"><span className="vpd-sum-lbl">Status</span><span><StatusPill status={status} /></span></div>
                {createdByName && <div className="vpd-sum-item"><span className="vpd-sum-lbl">Prepared By</span><span className="vpd-sum-val">{createdByName}</span></div>}
              </div>
              {proforma.notes && <div className="vpd-remarks"><div className="vpd-rem-title">Notes</div><p className="vpd-rem-text">{proforma.notes}</p></div>}
              {proforma.terms && <div className="vpd-remarks"><div className="vpd-rem-title">Terms &amp; Conditions</div><p className="vpd-rem-text">{proforma.terms}</p></div>}
            </div>

            {/* Right — totals (live in edit mode, static in view mode) */}
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
                      </div>
                      <div className="vpd-trow"><span>Subtotal</span><span style={{ fontWeight: 700, color: '#1e293b' }}>₹&nbsp;{fmtINR(eSub)}</span></div>
                      {eDisc > 0 && <>
                        <div className="vpd-trow vpd-trow--disc"><span>Discount ({editDiscRate}%)</span><span style={{ fontWeight: 700 }}>−&nbsp;₹&nbsp;{fmtINR(eDisc)}</span></div>
                        <div className="vpd-trow vpd-trow--sub"><span>Taxable Amount</span><span>₹&nbsp;{fmtINR(eTax)}</span></div>
                      </>}
                      {eGst > 0 && <div className="vpd-trow"><span>GST ({editGstRate}%)</span><span style={{ fontWeight: 700, color: '#1e293b' }}>+&nbsp;₹&nbsp;{fmtINR(eGst)}</span></div>}
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
                <button className="vpd-dl-btn" onClick={handleDownload} disabled={pdfLoading}>
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
      </div>

      {/* ══════════ SEND TO CLIENT MODAL ══════════ */}
      {sendModal && (
        <SendToClientModal
          proforma={proforma}
          client={client}
          pNum={pNum}
          issuedDate={fmtDate(proforma.issue_date || proforma.created_at)}
          onClose={() => setSendModal(false)}
        />
      )}

      {/* ══════════ SUCCESS TOAST ══════════ */}
      {saveSuccess && (
        <div className="vpd-success-toast">
          <CheckCircle size={16} /> Proforma updated successfully!
        </div>
      )}

      {/* ══════════ ADD COMPLIANCE MODAL ══════════ */}
      <AddComplianceModal
        isOpen={showAddSection}
        onClose={() => setShowAddSection(false)}
        onSave={handleComplianceSave}
        existingItems={editItems}
        fetchDescriptions={fetchDescriptionsForModal}
      />

      {/* ══════════ SUCCESS TOAST ══════════ */}
      {saveSuccess && (
        <div className="vpd-success-toast">
          <CheckCircle size={16} /> Proforma updated successfully!
        </div>
      )}

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
        <div className="fixed inset-0 z-[10000]" style={{ position: 'fixed', overflow: 'hidden', animation: 'vpd_overlay_in .2s ease' }}>
          <div className="absolute inset-0 bg-black/50" style={{ position: 'fixed', width: '100vw', height: '100vh' }} onClick={() => setShowUpdateReasonModal(false)} />
          <div className="relative z-10 flex items-center justify-center p-4" style={{ height: '100vh' }}>
            <div
              className="relative animate-scaleIn"
              style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 460, boxShadow: '0 32px 80px rgba(0,0,0,.28)', overflow: 'hidden', animation: 'vpd_modal_in .3s cubic-bezier(.16,1,.3,1)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Orange gradient header — matches quotation modal style */}
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
                  <button
                    onClick={() => { setShowUpdateReasonModal(false); setUpdateReason(''); setUpdateReasonError(''); }}
                    style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', transition: 'background .15s' }}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '22px 24px 24px', background: '#fafafa' }}>
                {/* Info banner */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 18 }}>
                  <AlertCircle size={14} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ margin: 0, fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
                    This reason will be recorded in the proforma history so the team can track what changed and why.
                  </p>
                </div>

                <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  Update Reason <span style={{ color: '#dc2626' }}>*</span>
                </div>
                <textarea
                  style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${updateReasonError ? '#fca5a5' : '#e2e8f0'}`, borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: '#1e293b', resize: 'vertical', minHeight: 96, outline: 'none', transition: 'border-color .15s, box-shadow .15s', boxSizing: 'border-box', background: '#fff' }}
                  placeholder="e.g. Corrected GST rate from 18% to 12%, added new compliance item per client request..."
                  value={updateReason}
                  onChange={e => { setUpdateReason(e.target.value); setUpdateReasonError(''); }}
                  onFocus={e => { e.target.style.borderColor = '#d97706'; e.target.style.boxShadow = '0 0 0 3px rgba(217,119,6,.12)'; }}
                  onBlur={e => { e.target.style.borderColor = updateReasonError ? '#fca5a5' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                  autoFocus
                />
                {updateReasonError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#dc2626', marginTop: 6, fontWeight: 500 }}>
                    <AlertCircle size={13} /> {updateReasonError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                  <button
                    className="vpd-btn-cancel"
                    onClick={() => { setShowUpdateReasonModal(false); setUpdateReason(''); setUpdateReasonError(''); }}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveUpdateConfirm}
                    disabled={saving || !updateReason.trim()}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 9, border: 'none', background: saving || !updateReason.trim() ? '#d1d5db' : 'linear-gradient(135deg,#d97706,#f59e0b)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving || !updateReason.trim() ? 'not-allowed' : 'pointer', transition: 'all .15s', boxShadow: saving || !updateReason.trim() ? 'none' : '0 2px 8px rgba(217,119,6,.35)', fontFamily: 'inherit' }}
                  >
                    {saving
                      ? <><Loader2 size={13} className="vpd-spin" /> Saving…</>
                      : <><Save size={13} /> Confirm & Save</>}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ══════════ REJECT MODAL ══════════ */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[10000]" style={{ position: 'fixed', overflow: 'hidden', animation: 'vpd_overlay_in .2s ease' }}>
          <div className="absolute inset-0 bg-black/50" style={{ position: 'fixed', width: '100vw', height: '100vh' }} onClick={() => setShowRejectModal(false)} />
          <div className="relative z-10 flex items-center justify-center p-4" style={{ height: '100vh' }}>
            <div className="relative bg-white" style={{ borderRadius: 20, padding: '28px 28px 24px', width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.24)', animation: 'vpd_modal_in .3s cubic-bezier(.16,1,.3,1)' }} onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="vpd-modal-title">
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fef2f2', border: '1.5px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ThumbsDown size={18} color="#dc2626" />
                </div>
                Reject Proforma
              </div>
              <p className="vpd-modal-sub">
                Please provide a reason for rejection. This will be recorded and visible to the team.
              </p>

              <div className="vpd-modal-label">Rejection Reason <span style={{ color: '#dc2626' }}>*</span></div>
              <textarea
                className="vpd-modal-textarea"
                placeholder="e.g. Incorrect line items, amounts need revision..."
                value={rejectReason}
                onChange={e => { setRejectReason(e.target.value); setRejectReasonError(''); }}
                autoFocus
              />
              {rejectReasonError && (
                <div className="vpd-modal-err">
                  <AlertCircle size={13} /> {rejectReasonError}
                </div>
              )}

              <div className="vpd-modal-actions">
                <button
                  className="vpd-btn-cancel"
                  onClick={() => { setShowRejectModal(false); setRejectReason(''); setRejectReasonError(''); }}
                  disabled={rejecting}
                >
                  Cancel
                </button>
                <button
                  className="vpd-btn-reject"
                  onClick={handleRejectSubmit}
                  disabled={rejecting || !rejectReason.trim()}
                >
                  {rejecting
                    ? <><Loader2 size={13} className="vpd-spin" /> Rejecting…</>
                    : <><ThumbsDown size={13} /> Confirm Reject</>}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ══════════ GENERATE INVOICE MODAL ══════════ */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-[10000]" style={{ position: 'fixed', overflow: 'hidden', animation: 'vpd_overlay_in .2s ease' }}>
          <div className="absolute inset-0 bg-black/50" style={{ position: 'fixed', width: '100vw', height: '100vh' }}
            onClick={() => { if (!invoiceGenerating) { setShowInvoiceModal(false); setInvoiceSuccess(null); } }} />
          <div className="relative z-10 flex items-center justify-center p-4" style={{ height: '100vh' }}>
            <div className="relative bg-white" style={{ borderRadius: 24, width: '100%', maxWidth: 420, boxShadow: '0 40px 100px rgba(0,0,0,.24)', overflow: 'hidden', animation: 'vpd_modal_in .32s cubic-bezier(.16,1,.3,1)' }}
              onClick={e => e.stopPropagation()}>

              {/* Top accent bar */}
              <div style={{ height: 5, background: 'linear-gradient(90deg,#7c3aed,#6d28d9,#8b5cf6)' }} />

              {/* ── SUCCESS STATE ── */}
              {invoiceSuccess ? (
                <div style={{ padding: '36px 32px 28px', textAlign: 'center' }}>
                  {/* Animated checkmark ring */}
                  <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid #c4b5fd', animation: 'vqd_pulse_ring 1.8s ease-out infinite' }} />
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#ede9fe,#ddd6fe)', border: '2px solid #c4b5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(124,58,237,.2)' }}>
                      <CheckCircle size={38} color="#7c3aed" />
                    </div>
                  </div>
                  <div style={{ fontSize: 21, fontWeight: 800, color: '#1e293b', letterSpacing: '-.02em', marginBottom: 8 }}>Invoice Generated!</div>
                  <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, marginBottom: 6 }}>
                    Your invoice has been successfully created and is ready to review.
                  </div>
                  {/* Invoice number chip */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#faf5ff', border: '1.5px solid #ddd6fe', borderRadius: 20, padding: '6px 16px', margin: '6px 0 8px', fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>
                    <Receipt size={13} /> {fmtInvNum(invoiceSuccess.invoice_number)}
                  </div>
                  {/* Show advance deduction if applicable */}
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
                      Stay on this Proforma
                    </button>
                  </div>
                </div>
              ) : (
                /* ── INPUT STATE ── */
                <div style={{ padding: '28px 28px 24px' }}>
                  {/* Header */}
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
                    <button
                      onClick={() => { if (!invoiceGenerating) setShowInvoiceModal(false); }}
                      style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: '#f1f5f9', cursor: invoiceGenerating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', opacity: invoiceGenerating ? 0.4 : 1 }}
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* Proforma summary chip */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
                    <CheckCircle size={15} color="#059669" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#065f46' }}>Approved Proforma</div>
                      <div style={{ fontSize: 11, color: '#047857', marginTop: 1 }}>
                        {pNum} · Grand Total: <strong>Rs. {fmtINR(proforma.grand_total || grandTotal)}</strong>
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
                          <span style={{ fontWeight: 700, color: '#1e293b' }}>Rs. {fmtINR(proforma.grand_total || grandTotal)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#059669' }}>
                          <span>Advance Paid</span>
                          <span style={{ fontWeight: 700 }}>− Rs. {fmtINR(parseFloat(advanceAmount))}</span>
                        </div>
                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 2, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: '#dc2626' }}>
                          <span>Outstanding Balance</span>
                          <span>Rs. {fmtINR(Math.max(0, parseFloat(proforma.grand_total || grandTotal) - parseFloat(advanceAmount)))}</span>
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
                        ? <><Loader2 size={14} className="vpd-spin" /> Generating…</>
                        : <><Receipt size={14} /> Generate Invoice</>}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ══════════ INVOICE ALREADY EXISTS TOAST ══════════ */}
      {invoiceModal.open && invoiceModal.alreadyExists && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
          background: '#fff', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,.14), 0 0 0 1px rgba(0,0,0,.06)',
          display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
          maxWidth: 380, width: '100%',
          animation: 'vpd_toast_in .3s cubic-bezier(.16,1,.3,1)',
          borderLeft: '4px solid #7c3aed',
          fontFamily: "'Outfit', sans-serif",
        }}>
          {/* Icon */}
          <div style={{ width: 34, height: 34, borderRadius: 10, background: '#faf5ff', border: '1.5px solid #ddd6fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Receipt size={16} color="#7c3aed" />
          </div>
          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>Invoice Already Exists</div>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 10 }}>
              An invoice has already been generated for this proforma.
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
          {/* Close X */}
          <button
            onClick={dismissInvoiceModal}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, flexShrink: 0, lineHeight: 1 }}
          >
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

    </>
  );
}