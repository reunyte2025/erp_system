import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Loader2, AlertCircle,
  CheckCircle, Clock, Send, FileText, XCircle,
  Building2, User, MapPin, Hash, Calendar,
  Tag, Percent, ChevronRight, Mail, Paperclip, X,
  Edit2, Save, RotateCcw, Plus, Trash2, PenLine,
  Search, ChevronDown, Edit, Phone, CreditCard,
} from 'lucide-react';
import {
  getQuotationById, generateQuotationPdf, sendQuotationToClient,
} from '../../services/quotation';
import { getComplianceByCategory } from '../../services/proforma';
import { getClientById, getClientProjects } from '../../services/clients';

import api from '../../services/api';
import AddComplianceModal from '../../components/AddComplianceModal/AddcomplianceModal';

// ─── Constants ────────────────────────────────────────────────────────────────

const COMPLIANCE_CATEGORIES = {
  1: 'Construction Certificate',
  2: 'Occupational Certificate',
  3: 'Water Main Commissioning',
  4: 'STP Commissioning',
};

// For modal display names
const COMPLIANCE_CATEGORY_SHORT = {
  1: 'Construction Certificate',
  2: 'Occupational Certificate',
  3: 'Water Main',
  4: 'STP',
};

const SUB_COMPLIANCE_CATEGORIES = {
  1: { id: 1, name: 'Plumbing Compliance' },
  2: { id: 2, name: 'PCO Compliance' },
  3: { id: 3, name: 'General Compliance' },
  4: { id: 4, name: 'Road Setback Handing over' },
  0: { id: 0, name: 'Default' },
};

// Category group definitions  — mirrors quotations.jsx
const COMPLIANCE_GROUPS = {
  certificates: [1, 2],
  execution: [3, 4],
};

const STATUS_CONFIG = {
  '1':                   { label: 'Draft',              Icon: FileText,    color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  '2':                   { label: 'Pending',            Icon: Clock,       color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  '3':                   { label: 'Proforma Generated', Icon: CheckCircle, color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  '4':                   { label: 'Completed',          Icon: CheckCircle, color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  '5':                   { label: 'Failed',             Icon: XCircle,     color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  'draft':               { label: 'Draft',              Icon: FileText,    color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  'pending':             { label: 'Pending',            Icon: Clock,       color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  'sent':                { label: 'Proforma Generated', Icon: CheckCircle, color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  'accepted':            { label: 'Proforma Generated', Icon: CheckCircle, color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  'proforma_generated':  { label: 'Proforma Generated', Icon: CheckCircle, color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  'completed':           { label: 'Completed',          Icon: CheckCircle, color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  'approved':            { label: 'Completed',          Icon: CheckCircle, color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  'failed':              { label: 'Failed',             Icon: XCircle,     color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  'rejected':            { label: 'Failed',             Icon: XCircle,     color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtQNum = (n) => {
  if (!n) return '—';
  if (String(n).startsWith('QT-')) return String(n);
  const s = String(n);
  if (s.length >= 8) return `QT-${s.substring(0, 4)}-${s.substring(4).padStart(5, '0')}`;
  return `QT-2026-${String(n).padStart(5, '0')}`;
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

const getStatus = (s) =>
  STATUS_CONFIG[String(s || '').toLowerCase()] || STATUS_CONFIG['1'];

const groupItemsByCategory = (items = []) => {
  const groups = {};
  items.forEach((item) => {
    const catId = item.compliance_category ?? item.category ?? null;
    const key = catId != null ? String(catId) : 'other';
    if (!groups[key]) {
      groups[key] = {
        catId,
        catName: catId != null
          ? (COMPLIANCE_CATEGORIES[catId] || `Category ${catId}`)
          : 'Other Services',
        items: [],
      };
    }
    groups[key].items.push(item);
  });
  return Object.values(groups);
};

/** Detect which group type (certificates | execution | null) the existing items belong to */
const detectExistingGroupType = (items = []) => {
  if (!items.length) return null;
  const cats = [...new Set(items.map(it => it.compliance_category ?? 0))];
  const hasCerts = cats.some(c => COMPLIANCE_GROUPS.certificates.includes(c));
  const hasExec  = cats.some(c => COMPLIANCE_GROUPS.execution.includes(c));
  if (hasCerts) return 'certificates';
  if (hasExec)  return 'execution';
  return null;
};

/**
 * Determine compliance type from items
 * Returns: 'certificates' | 'execution' | 'mixed' | 'none'
 */
const getComplianceType = (items = []) => {
  const hasCerts = items.some(it => [1, 2].includes(it.compliance_category));
  const hasExec  = items.some(it => [3, 4].includes(it.compliance_category));
  if (hasCerts && hasExec) return 'mixed';
  if (hasCerts) return 'certificates';
  if (hasExec)  return 'execution';
  return 'none';
};

/**
 * Get display text for compliance type
 */
const getComplianceTypeLabel = (items = []) => {
  const type = getComplianceType(items);
  switch (type) {
    case 'certificates': return 'Certificates (Construction & Occupational)';
    case 'execution':    return 'Execution (Water Main & STP)';
    case 'mixed':        return 'Mixed Compliance (Certificates & Execution)';
    default:             return 'No Compliance Items';
  }
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
  const int = Math.floor(n);
  const dec = Math.round((n - int) * 100);
  let str = convert(int).trim() || 'Zero';
  if (dec > 0) str += ` and ${convert(dec).trim()} Paise`;
  return str;
}

// ─── calcItemTotal ─────────────────────────────────────────────────────────────
const calcItemTotal = (item) => {
  const prof = parseFloat(item.Professional_amount) || 0;
  const misc = isMiscNumeric(item.miscellaneous_amount) ? parseFloat(item.miscellaneous_amount) : 0;
  const qty  = parseInt(item.quantity) || 1;
  return parseFloat(((prof + misc) * qty).toFixed(2));
};

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
        <button onClick={onBack} style={{ padding: '8px 20px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Back</button>
      </div>
    </div>
  </div>
);

// ─── Send to Client Modal ──────────────────────────────────────────────────

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

const SendToClientModal = ({ quotation, client, qNum, issuedDate, onClose }) => {
  const defaultEmail   = client?.email || '';
  const defaultSubject = `Quotation ${qNum}${issuedDate ? ` — Issued ${issuedDate}` : ''}`;
  const defaultBody    = `Dear ${client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Client' : 'Client'},\n\nPlease find attached your quotation ${qNum}${issuedDate ? `, issued on ${issuedDate}` : ''}.\n\nKindly review the details and feel free to reach out if you have any questions.\n\nBest regards,\nERP System`;

  const [email,   setEmail]   = useState(defaultEmail);
  const [subject, setSubject] = useState(defaultSubject);
  const [body,    setBody]    = useState(defaultBody);
  const [extras,  setExtras]  = useState([]);
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');
  const fileInputRef = useRef(null);

  const totalExtraSize    = extras.reduce((s, f) => s + f.size, 0);
  const estimatedPdfSize  = 2 * 1024 * 1024;
  const remainingBytes    = MAX_ATTACHMENT_BYTES - estimatedPdfSize - totalExtraSize;

  const handleAddFiles = (e) => {
    const newFiles = Array.from(e.target.files || []);
    if (!newFiles.length) return;
    const combined  = [...extras, ...newFiles];
    const totalSize = combined.reduce((s, f) => s + f.size, 0) + estimatedPdfSize;
    if (totalSize > MAX_ATTACHMENT_BYTES) { setError('Adding these files would exceed the 25 MB attachment limit.'); return; }
    setExtras(combined); setError(''); e.target.value = '';
  };

  const removeExtra = (idx) => setExtras(prev => prev.filter((_, i) => i !== idx));

  const handleSend = async () => {
    if (!email.trim()) { setError('Recipient email is required.'); return; }
    if (!/\S+@\S+\.\S+/.test(email.trim())) { setError('Please enter a valid email address.'); return; }
    setError(''); setSending(true);
    try {
      await sendQuotationToClient({ quotationId: quotation.id, quotationNumber: qNum, issuedDate, recipientEmail: email.trim(), subject: subject.trim(), body: body.trim(), extraAttachments: extras });
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,.22)', overflow: 'hidden', fontFamily: "'Outfit', sans-serif", animation: 'vqd_in .25s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 16px', borderBottom: '1.5px solid #f0f4f8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#0f766e,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={17} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Send to Client</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{qNum}</div>
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
              Quotation <strong>{qNum}</strong> has been sent to<br /><strong>{email}</strong>
            </div>
            <button onClick={onClose} style={{ marginTop: 22, padding: '9px 28px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Done</button>
          </div>
        ) : (
          <div style={{ padding: '20px 22px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '9px 12px' }}>
              <FileText size={14} color="#059669" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#15803d', fontWeight: 500 }}><strong>{qNum}.pdf</strong> will be automatically attached</span>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 5 }}>Recipient Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="client@example.com" style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1.5px solid #cbd5e1', fontSize: 13, color: '#1e293b', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = '#0f766e'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 5 }}>Subject</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1.5px solid #cbd5e1', fontSize: 13, color: '#1e293b', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = '#0f766e'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 5 }}>Message</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1.5px solid #cbd5e1', fontSize: 13, color: '#1e293b', outline: 'none', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = '#0f766e'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.07em' }}>Additional Attachments</label>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>~{fmtSize(Math.max(0, remainingBytes))} remaining</span>
              </div>
              {extras.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8 }}>
                  {extras.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderRadius: 8, padding: '6px 10px', border: '1px solid #cbd5e1' }}>
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
              <button onClick={() => fileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, border: '1.5px dashed #94a3b8', background: '#f8fafc', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
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
              <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1.5px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSend} disabled={sending} style={{ flex: 2, padding: 10, borderRadius: 10, background: sending ? '#94a3b8' : '#0f766e', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {sending ? <><Loader2 size={14} style={{ animation: 'vqd_spin .7s linear infinite' }} /> Sending…</> : <><Send size={14} /> Send Email</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Sub-Compliance Dropdown (mirrors quotations.jsx) ─────────────────────────

const SubComplianceDropdown = ({ value, onChange, categoryId, searchTerm, onSearchChange, placeholder = 'Select Sub-Compliance' }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (!e.target.closest('.vqd-sub-dropdown')) setIsOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getAvailable = () => {
    if ([1, 2].includes(categoryId)) {
      return [SUB_COMPLIANCE_CATEGORIES[1], SUB_COMPLIANCE_CATEGORIES[2], SUB_COMPLIANCE_CATEGORIES[3], SUB_COMPLIANCE_CATEGORIES[4]];
    }
    return [];
  };

  const list     = getAvailable().filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const selected = getAvailable().find(i => i.id === value);

  return (
    <div className="vqd-sub-dropdown" style={{ position: 'relative', width: '100%' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', color: selected ? '#1e293b' : '#94a3b8', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', outline: 'none', transition: 'border-color .15s' }}
      >
        <span>{selected ? selected.name : placeholder}</span>
        <ChevronDown size={15} color="#94a3b8" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      {isOpen && (
        <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: 6, width: '100%', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, boxShadow: '0 12px 36px rgba(0,0,0,.14)', zIndex: 99999, overflow: 'hidden' }}>
          <div style={{ padding: 10, borderBottom: '1px solid #f0f4f8', background: '#f8fafc' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text" placeholder="Search…" value={searchTerm}
                onChange={e => onSearchChange(e.target.value)}
                onClick={e => e.stopPropagation()}
                style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {list.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>No results</div>
            ) : list.map(item => (
              <button
                key={item.id}
                onClick={() => { onChange(item.id); setIsOpen(false); onSearchChange(''); }}
                style={{ width: '100%', padding: '10px 14px', border: 'none', background: value === item.id ? '#f0fdf4' : 'transparent', borderLeft: value === item.id ? '3px solid #0f766e' : '3px solid transparent', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: value === item.id ? 700 : 500, color: value === item.id ? '#0f766e' : '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'inherit' }}
              >
                {item.name}
                {value === item.id && <CheckCircle size={14} color="#0f766e" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Compliance Description Dropdown ─────────────────────────────────────────

const DescriptionDropdown = ({ value, onChange, items, loading, searchTerm, onSearchChange, placeholder = 'Select a description' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const modalBodyRef        = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (!e.target.closest('.vqd-desc-dropdown')) setIsOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = items.filter(d => (d.compliance_description || '').toLowerCase().includes(searchTerm.toLowerCase()));
  const selectedItem = items.find(d => d.compliance_description === value);

  const handleOpen = () => {
    setIsOpen(prev => {
      if (!prev) {
        setTimeout(() => {
          const body = document.getElementById('vqd-compliance-modal-body');
          if (body) body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });
        }, 60);
      }
      return !prev;
    });
  };

  return (
    <div className="vqd-desc-dropdown" style={{ position: 'relative', width: '100%' }}>
      <button
        onClick={handleOpen}
        style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', color: value ? '#1e293b' : '#94a3b8', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', outline: 'none', textAlign: 'left', gap: 8 }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value ? (value.length > 65 ? value.substring(0, 65) + '…' : value) : placeholder}
        </span>
        <ChevronDown size={15} color="#94a3b8" style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      {isOpen && (
        <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: 6, width: '100%', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, boxShadow: '0 16px 48px rgba(0,0,0,.18)', zIndex: 99999, overflow: 'hidden' }}>
          <div style={{ padding: 10, borderBottom: '1px solid #f0f4f8', background: '#f8fafc' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                autoFocus type="text" placeholder="Search descriptions…" value={searchTerm}
                onChange={e => onSearchChange(e.target.value)}
                onClick={e => e.stopPropagation()}
                style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginTop: 6, fontSize: 10, color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
              <span>{filtered.length} of {items.length} results</span>
              <span style={{ color: '#0f766e', fontWeight: 600 }}>Click to select</span>
            </div>
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {loading ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Loader2 size={14} style={{ animation: 'vqd_spin .7s linear infinite' }} /> Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>No descriptions found</div>
            ) : filtered.map((desc, idx) => {
              const isSelected = value === desc.compliance_description;
              const words = (desc.compliance_description || '').split(' ');
              const preview = words.slice(0, 4).join(' ');
              const rest    = words.slice(4).join(' ');
              return (
                <button
                  key={desc.id || idx}
                  onClick={() => { onChange(desc.compliance_description); setIsOpen(false); onSearchChange(''); }}
                  style={{ width: '100%', padding: '8px 10px', border: `1px solid ${isSelected ? '#6ee7b7' : '#f0f4f8'}`, borderRadius: 8, background: isSelected ? '#f0fdf4' : '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', display: 'flex', alignItems: 'flex-start', gap: 10, transition: 'background .1s' }}
                >
                  <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6, background: isSelected ? '#0f766e' : '#f1f5f9', color: isSelected ? '#fff' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, marginTop: 1 }}>{idx + 1}</span>
                  <span style={{ flex: 1, fontSize: 12, lineHeight: 1.5, color: isSelected ? '#0f766e' : '#334155' }}>
                    <strong style={{ fontWeight: 700 }}>{preview}</strong>{rest && ` ${rest}`}
                  </span>
                  {isSelected && <CheckCircle size={14} color="#0f766e" style={{ flexShrink: 0, marginTop: 3 }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

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

  useEffect(() => {
    onUpdateNavigation?.({ breadcrumbs: ['Quotations', 'Quotation Details'] });
    return () => onUpdateNavigation?.(null);
  }, [onUpdateNavigation]);

  const fetchData = useCallback(async () => {
    if (!id) { setFetchError('No quotation ID provided'); setLoading(false); return; }
    setLoading(true); setFetchError('');
    try {
      const res = await getQuotationById(id);
      if (res.status !== 'success' || !res.data) throw new Error('Failed to load quotation');
      const q = res.data;
      setQuotation(q);

      // Fetch full client details
      if (q.client) {
        try {
          const cr = await getClientById(q.client);
          if (cr.status === 'success' && cr.data) setClient(cr.data);
        } catch {}
      }

      // Fetch project using client-scoped projects API — much more efficient
      // than loading all 500 projects. Falls back to a broad search if needed.
      if (q.project) {
        try {
          let found = null;
          if (q.client) {
            const pr = await getClientProjects(q.client);
            const results = pr?.data?.results || pr?.results || [];
            found = results.find(p => String(p.id) === String(q.project)) || null;
          }
          // Fallback: if not found via client-scoped call, try direct project fetch
          if (!found) {
            const fallback = await api.get('/projects/get_all_Project/', {
              params: { page: 1, page_size: 500 },
            });
            const allProjects = fallback.data?.data?.results || fallback.data?.results || [];
            found = allProjects.find(p => String(p.id) === String(q.project)) || null;
          }
          if (found) setProject(found);
        } catch {}
      }

      if (q.created_by) {
        try {
          const ur = await api.get('/users/get_user/', { params: { id: q.created_by } });
          if (ur.data?.status === 'success' && ur.data?.data) {
            const u = ur.data.data;
            setCreatedByName(`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || '');
          }
        } catch {}
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



  // ── Compliance modal state — handled by AddComplianceModal component ────────
  const [showAddSection, setShowAddSection] = useState(false);

  /**
   * fetchDescriptionsForModal — passed to AddComplianceModal as fetchDescriptions prop.
   * Calls the API and returns a plain array of description objects.
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

  // ── Edit mode lifecycle ────────────────────────────────────────────────────
  const enterEditMode = () => {
    if (!quotation) return;
    // Block editing once proforma is generated (backend sets status = 3 / sent)
    if (String(quotation.status) === '3' || String(quotation.status_display || '').toLowerCase() === 'sent') return;
    setEditSacCode(quotation.sac_code || '');
    setEditGstRate(parseFloat(quotation.gst_rate || 0));
    setEditDiscRate(parseFloat(quotation.discount_rate || 0));
    setEditItems((quotation.items || []).map(it => ({
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
    const sub = calcEditSubtotal();
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

      // Resolve status integer
      const rawStatus = quotation.status;
      const STATUS_STR_TO_INT = { draft: 1, pending: 2, sent: 3, approved: 4, completed: 4, failed: 5, rejected: 5 };
      const resolvedStatus = Number.isInteger(rawStatus)
        ? rawStatus
        : (parseInt(rawStatus) || STATUS_STR_TO_INT[String(rawStatus).toLowerCase()] || 1);

      const payload = {
        id:               parseInt(quotation.id),
        client:           parseInt(quotation.client),
        project:          parseInt(quotation.project),
        status:           resolvedStatus,
        sac_code:         editSacCode.trim(),
        gst_rate:         String(parseFloat(editGstRate || 0).toFixed(2)),
        discount_rate:    String(parseFloat(editDiscRate || 0).toFixed(2)),
        // API expects integers for these three amount fields
        total_amount:     Math.round(sub),
        total_gst_amount: Math.round(gst),
        grand_total:      Math.round(grand),
        items: editItems.map(it => {
          const compCat    = parseInt(it.compliance_category) || 1;
          const subCompCat = parseInt(it.sub_compliance_category) || 0;
          // Parse id: existing items have a positive integer, new items have null/undefined/0
          const rawId  = it.id != null ? parseInt(it.id) : null;
          const itemId = rawId && rawId > 0 ? rawId : null;
          return {
            id:                      itemId,          // null = new item, integer = existing item
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

      console.log('📤 UPDATE PAYLOAD:', JSON.stringify(payload, null, 2));

      const response = await api.put('/quotations/update_quotation/', payload);
      const data = response.data;

      console.log('✅ UPDATE RESPONSE:', JSON.stringify(data, null, 2));

      if (data && (data.id || data.quotation_number)) {
        const updated = data.data || data;
        setQuotation(prev => ({
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
        setQuotation(prev => ({ ...prev, ...updated, sac_code: editSacCode.trim(), gst_rate: String(editGstRate), discount_rate: String(editDiscRate), total_amount: sub, total_gst_amount: gst, grand_total: grand }));
        setSaveSuccess(true);
        setEditMode(false);
        setTimeout(() => setSaveSuccess(false), 3500);
      } else {
        setSaveError(data?.message || data?.detail || 'Update failed. Please try again.');
      }
    } catch (e) {
      const respData = e.response?.data;
      console.error('❌ UPDATE FAILED — Response data:', JSON.stringify(respData, null, 2));
      let msg = '';
      if (respData) {
        const errors = respData.errors || respData;
        if (typeof errors === 'string') {
          msg = errors;
        } else {
          // Flatten DRF field errors — handle nested arrays of objects (e.g. items)
          msg = Object.entries(errors)
            .map(([field, val]) => {
              if (Array.isArray(val)) {
                const flat = val.map(v => {
                  if (typeof v === 'string') return v;
                  if (typeof v === 'object' && v !== null) {
                    // nested item error: { id: ["required"], description: ["..."] }
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

  const handleDownload = async () => {
    if (pdfLoading) return;
    try { setPdfLoading(true); await generateQuotationPdf(id); }
    catch (e) { console.error(e); }
    finally { setPdfLoading(false); }
  };

  // ── Shared helpers ────────────────────────────────────────────────────────────
  const extractTrailing = (numStr) => {
    if (!numStr) return '';
    const s = String(numStr);
    const last = s.lastIndexOf('-');
    return last >= 0 ? s.substring(last + 1) : s;
  };

  const dismissProformaModal = () =>
    setProformaModal({ open: false, proformaId: null, proformaNum: '', alreadyExists: false, genericError: '' });

  const handleGenerateProforma = async () => {
    if (proformaLoading) return;
    setProformaLoading(true);
    try {
      const response = await api.post('/proformas/create_proforma/', {
        quotation: Number(id),
      });
      const data = response.data;
      const proformaId  = data?.id || data?.data?.id;
      // Display proforma number exactly as API returns it
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
      console.error('Proforma generation failed:', e);
      const errMsg = e?.response?.data?.errors || e?.response?.data?.message || e?.response?.data?.detail || '';
      const isAlreadyExists =
        String(errMsg).toLowerCase().includes('already exists') ||
        String(errMsg).toLowerCase().includes('already generated') ||
        e?.response?.status === 400;
      if (isAlreadyExists) {
        let existingId  = null;
        let existingNum = '';
        try {
          const quotationTrailing = extractTrailing(quotation.quotation_number || String(id));
          const res = await api.get('/proformas/get_all_proformas/', { params: { quotation: Number(id), page: 1, page_size: 50 } });
          const results = res.data?.data?.results || res.data?.results || [];
          let existing = results[0] || null;
          if (!existing && quotationTrailing) {
            existing = results.find(p => extractTrailing(p.proforma_number) === quotationTrailing) || null;
          }
          if (existing) {
            existingId  = existing.id;
            existingNum = String(existing.proforma_number || '');
          }
        } catch { /* silently ignore */ }
        setProformaModal({ open: true, proformaId: existingId, proformaNum: existingNum, alreadyExists: true, genericError: '' });
      } else {
        setProformaModal({ open: true, proformaId: null, proformaNum: '', alreadyExists: true, genericError: errMsg || 'Failed to generate proforma.' });
      }
    } finally {
      setProformaLoading(false);
    }
  };

  if (loading) return <LoadingView />;
  if (fetchError) return <ErrorView message={fetchError} onRetry={fetchData} onBack={() => navigate('/quotations')} />;
  if (!quotation) return <ErrorView message="Quotation not available." onRetry={fetchData} onBack={() => navigate('/quotations')} />;

  // Derived values
  const status     = getStatus(quotation.status_display || quotation.status);
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

  const clientName = client
    ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.email
    : `Client #${quotation.client}`;
  const projName = project
    ? (project.name || project.title || `Project #${quotation.project}`)
    : (quotation.project ? `Project #${quotation.project}` : '—');
  const projLoc = project ? [project.city, project.state].filter(Boolean).join(', ') : '';


  return (
    <>
      {/* ─── Global styles ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        .vqd-root *{box-sizing:border-box;font-family:'Outfit',sans-serif}
        @keyframes vqd_spin{to{transform:rotate(360deg)}}
        @keyframes vqd_in{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
        .animate-fadeIn{animation:fadeIn 0.2s ease-out}
        .animate-scaleIn{animation:scaleIn 0.3s cubic-bezier(0.16,1,0.3,1)}
        .vqd-root{min-height:100vh;padding:0}
        .vqd-topbar{display:flex;align-items:center;justify-content:space-between;margin:0 0 16px}
        .vqd-back{display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;font-size:13px;font-weight:600;color:#475569;padding:6px 10px;border-radius:8px;transition:background .15s,color .15s}
        .vqd-back:hover{background:#e2e8f0;color:#1e293b}
        .vqd-actions{display:flex;gap:8px}
        .vqd-btn-o{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;background:#fff;border:1.5px solid #e2e8f0;font-size:13px;font-weight:600;color:#475569;cursor:pointer;transition:all .15s}
        .vqd-btn-o:hover{background:#f8fafc;border-color:#cbd5e1}
        .vqd-btn-p{display:flex;align-items:center;gap:6px;padding:7px 16px;border-radius:8px;background:#0f766e;border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:background .15s}
        .vqd-btn-p:hover{background:#0d6460}
        .vqd-btn-p:disabled{opacity:.6;cursor:not-allowed}
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
        .vqd-parties{display:grid;grid-template-columns:1fr 28px 1fr 1fr;padding:28px 40px;gap:0;border-bottom:1.5px solid #f0f4f8;background:#fff}
        .vqd-arrow-col{display:flex;align-items:center;justify-content:center;padding:0 4px;padding-top:36px}
        .vqd-party{padding-right:24px}
        .vqd-party--proj{padding-left:24px;padding-right:24px}
        .vqd-party--rates{padding-left:24px;border-left:1.5px solid #f0f4f8}
        .vqd-plabel{font-size:9.5px;font-weight:800;letter-spacing:.14em;color:#94a3b8;text-transform:uppercase;margin-bottom:10px}
        .vqd-pavatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#0f766e,#0d9488);color:#fff;font-size:18px;font-weight:800;display:flex;align-items:center;justify-content:center;margin-bottom:8px}
        .vqd-picon{width:44px;height:44px;border-radius:10px;background:#f0fdf4;border:1.5px solid #bbf7d0;display:flex;align-items:center;justify-content:center;margin-bottom:8px}
        .vqd-pname{font-size:15px;font-weight:700;color:#1e293b;line-height:1.3;margin-bottom:5px}
        .vqd-pdetail{display:flex;align-items:center;gap:5px;font-size:12px;color:#64748b;margin-bottom:3px;word-break:break-all}
        .vqd-rates-list{display:flex;flex-direction:column;gap:12px}
        .vqd-rate-row{display:flex;align-items:center;gap:10px}
        .vqd-rate-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .vqd-rate-v{font-size:15px;font-weight:800;color:#1e293b;line-height:1.2}
        .vqd-rate-l{font-size:11px;color:#94a3b8;font-weight:500}
        .vqd-items{padding:0 40px 32px}
        .vqd-sec-hdr{display:flex;align-items:center;gap:8px;padding:22px 0 14px;border-bottom:2px solid #f0f4f8;font-size:13px;font-weight:700;color:#1e293b}
        .vqd-sec-badge{background:#ecfdf5;color:#059669;font-size:10.5px;font-weight:700;padding:2px 9px;border-radius:20px;border:1px solid #bbf7d0}
        .vqd-table-wrap{overflow-x:auto;margin-top:0}
        .vqd-table{width:100%;border-collapse:collapse;font-size:13px}
        .vqd-table thead tr{background:#f8fafc}
        .vqd-table thead th{padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:.08em;text-transform:uppercase;border-bottom:1.5px solid #e8ecf2;white-space:nowrap}
        .vqd-table thead th:first-child{padding-left:16px}
        .vqd-table thead th:last-child{padding-right:16px;text-align:right}
        .vqd-cat-row td{padding:9px 12px 6px 16px;background:#fafbfc;border-top:1.5px solid #f0f4f8}
        .vqd-cat-inner{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:700;color:#0f766e;text-transform:uppercase;letter-spacing:.08em}
        .vqd-cat-dot{width:6px;height:6px;border-radius:50%;background:#0d9488;flex-shrink:0}
        .vqd-cat-cnt{margin-left:auto;font-size:10px;font-weight:600;color:#94a3b8;text-transform:none;letter-spacing:0}
        .vqd-row{border-bottom:1px solid #f8fafc;transition:background .1s}
        .vqd-row:hover{background:#fafffe}
        .vqd-row td{padding:11px 12px;vertical-align:top}
        .vqd-row td:first-child{padding-left:16px}
        .vqd-row td:last-child{padding-right:16px;text-align:right}
        .vqd-row-idx{font-size:11px;font-weight:700;color:#d1d5db;text-align:center}
        .vqd-desc{font-size:13px;font-weight:500;color:#334155;line-height:1.55;max-width:300px}
        .vqd-subcat{display:inline-block;background:#f1f5f9;color:#475569;font-size:10px;font-weight:600;padding:2px 7px;border-radius:20px;border:1px solid #e2e8f0;white-space:nowrap}
        .vqd-qty-badge{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;background:#f1f5f9;color:#475569;font-size:12px;font-weight:700}
        .vqd-misc-note{color:#d97706;font-style:italic;font-size:11px;border-bottom:1px dashed #fcd34d;cursor:help}
        .vqd-cat-sub td{padding:7px 16px 9px;background:#f8fafc;border-bottom:2px solid #e8ecf2}
        .vqd-foot{display:grid;grid-template-columns:1fr 300px;gap:32px;padding:28px 40px;border-top:2px solid #f0f4f8;align-items:start}
        .vqd-sum-title{font-size:10px;font-weight:800;letter-spacing:.12em;color:#94a3b8;text-transform:uppercase;margin-bottom:14px}
        .vqd-sum-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px}
        .vqd-sum-item{display:flex;flex-direction:column;gap:2px}
        .vqd-sum-lbl{font-size:11px;color:#94a3b8;font-weight:500}
        .vqd-sum-val{font-size:13px;font-weight:700;color:#1e293b}
        .vqd-remarks{margin-top:18px}
        .vqd-rem-title{font-size:10px;font-weight:800;letter-spacing:.12em;color:#94a3b8;text-transform:uppercase;margin-bottom:6px}
        .vqd-rem-text{font-size:12px;color:#64748b;line-height:1.65;white-space:pre-wrap}
        .vqd-tbox{background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:14px;padding:20px 22px}
        .vqd-tbox-title{font-size:10px;font-weight:800;letter-spacing:.12em;color:#94a3b8;text-transform:uppercase;margin-bottom:14px}
        .vqd-trow{display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:13px;color:#475569;font-weight:500}
        .vqd-trow--disc{color:#ea580c}
        .vqd-trow--sub{color:#94a3b8;font-size:12px}
        .vqd-tdiv{border:none;border-top:1.5px solid #e2e8f0;margin:11px 0}
        .vqd-grand{display:flex;justify-content:space-between;align-items:baseline;font-size:19px;font-weight:900;color:#0f766e;letter-spacing:-.02em}
        .vqd-words{margin-top:8px;padding-top:8px;border-top:1px dashed #e2e8f0;font-size:10.5px;line-height:1.55;color:#64748b;font-style:italic}
        .vqd-dl-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-top:12px;padding:11px;background:#0f766e;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;transition:background .15s,transform .1s}
        .vqd-dl-btn:hover{background:#0d6460}
        .vqd-dl-btn:active{transform:scale(.98)}
        .vqd-dl-btn:disabled{opacity:.6;cursor:not-allowed}
        .vqd-btn-edit{display:flex;align-items:center;gap:6px;padding:7px 16px;border-radius:8px;background:linear-gradient(135deg,#f59e0b,#d97706);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;box-shadow:0 2px 8px rgba(217,119,6,.25)}
        .vqd-btn-edit:hover{background:linear-gradient(135deg,#d97706,#b45309);box-shadow:0 4px 12px rgba(217,119,6,.35)}
        .vqd-btn-proforma{display:flex;align-items:center;gap:6px;padding:7px 16px;border-radius:8px;background:linear-gradient(135deg,#059669,#0891b2);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;box-shadow:0 2px 10px rgba(8,145,178,.35)}
        .vqd-btn-proforma:hover{background:linear-gradient(135deg,#047857,#0e7490);box-shadow:0 4px 16px rgba(8,145,178,.50);transform:translateY(-1px)}
        .vqd-btn-proforma:active{transform:translateY(0)}
        .vqd-btn-proforma:disabled{opacity:.6;cursor:not-allowed;transform:none}
        .vqd-btn-save{display:flex;align-items:center;gap:6px;padding:7px 16px;border-radius:8px;background:linear-gradient(135deg,#0f766e,#0d9488);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s}
        .vqd-btn-save:hover{background:linear-gradient(135deg,#0d6460,#0b7a72)}
        .vqd-btn-save:disabled{opacity:.6;cursor:not-allowed}
        .vqd-btn-cancel{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;background:#fff;border:1.5px solid #e2e8f0;font-size:13px;font-weight:600;color:#64748b;cursor:pointer;transition:all .15s}
        .vqd-btn-cancel:hover{background:#fef2f2;border-color:#fca5a5;color:#dc2626}
        .vqd-edit-banner{display:flex;align-items:center;gap:10px;padding:10px 18px;background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1.5px solid #fcd34d;border-radius:12px;margin-bottom:14px;animation:vqd_in .25s ease}
        .vqd-edit-input{padding:6px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;font-family:inherit;color:#1e293b;background:#fff;outline:none;transition:border-color .15s,box-shadow .15s;width:100%}
        .vqd-edit-input:focus{border-color:#0f766e;box-shadow:0 0 0 3px rgba(15,118,110,.1)}
        .vqd-edit-input-sm{width:80px;text-align:right}
        .vqd-edit-input-md{width:110px}
        .vqd-edit-input-num{width:90px;text-align:right}
        .vqd-edit-row td{background:#fafffe !important;padding:8px 6px !important}
        .vqd-edit-row:hover td{background:#f0fdf4 !important}
        .vqd-edit-totals{background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1.5px solid #6ee7b7;border-radius:14px;padding:20px 22px}
        .vqd-save-err{display:flex;align-items:flex-start;gap:8px;background:#fef2f2;border:1.5px solid #fca5a5;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:12.5px;color:#dc2626;line-height:1.5}
        .vqd-success-toast{position:fixed;bottom:28px;right:28px;z-index:9999;display:flex;align-items:center;gap:10px;background:#0f766e;color:#fff;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:600;box-shadow:0 8px 24px rgba(15,118,110,.4);animation:vqd_toast_in .3s cubic-bezier(.16,1,.3,1)}
        @keyframes vqd_toast_in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        /* Prevent background color flash when body is fixed for modal scroll lock */
        body.vqd-modal-open { background: #fff !important; }
        .vqd-doc-foot{display:flex;justify-content:space-between;align-items:center;padding:14px 40px;background:#f8fafc;border-top:1.5px solid #e8ecf2;font-size:11px;color:#94a3b8}
        @media print{
          .vqd-topbar{display:none}
          .vqd-root{background:#fff;padding:0}
          .vqd-doc{box-shadow:none;border-radius:0;opacity:1!important;transform:none!important}
          .vqd-dl-btn,.vqd-btn-p,.vqd-btn-o{display:none}
        }
        @media(max-width:700px){
          .vqd-hdr{padding:22px 20px 22px}
          .vqd-meta{padding:12px 20px}
          .vqd-meta-sep{display:none}
          .vqd-parties{grid-template-columns:1fr;padding:20px;gap:16px}
          .vqd-arrow-col{display:none}
          .vqd-party--proj,.vqd-party--rates{padding-left:0}
          .vqd-party--rates{border-left:none;border-top:1.5px solid #f0f4f8;padding-top:16px}
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
                {/* Update Quotation — locked once proforma is generated (backend status = 3 / sent) */}
                {String(quotation.status) !== '3' && String(quotation.status_display || '').toLowerCase() !== 'sent' ? (
                  <button className="vqd-btn-edit" onClick={enterEditMode}>
                    <Edit2 size={14} /> Update Quotation
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#ecfdf5', border: '1.5px solid #6ee7b7', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#059669' }}>
                    <CheckCircle size={13} /> Proforma Generated
                  </div>
                )}

                {/* Generate Proforma — always available on quotation */}
                <button
                  className="vqd-btn-proforma"
                  onClick={handleGenerateProforma}
                  disabled={proformaLoading}
                  title="Generate Proforma from this Quotation"
                >
                  {proformaLoading
                    ? <><Loader2 size={14} className="vqd-spin" /> Generating…</>
                    : <><FileText size={14} /> Generate Proforma</>}
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

        {/* ── Document card ── */}
        <div className={`vqd-doc${visible ? ' in' : ''}${editMode ? ' vqd-doc-editing' : ''}`}>

          {/* ══════════ HEADER ══════════ */}
          <div className="vqd-hdr">
            <div className="vqd-hdr-l">
              <div className="vqd-logo">
                <div className="vqd-logo-badge">ERP</div>
                <div>
                  <div className="vqd-co-name">ERP System</div>
                  <div className="vqd-co-sub">Professional Services</div>
                </div>
              </div>
              <StatusPill status={status} />
            </div>
            <div className="vqd-hdr-r">
              <div className="vqd-doc-label">Quotation</div>
              <div className="vqd-doc-num">{qNum}</div>
              <div className="vqd-doc-date">Issued {fmtDate(quotation.created_at)}</div>
            </div>
          </div>

          {/* ══════════ META STRIP ══════════ */}
          <div className="vqd-meta">
            <MetaBlock icon={Calendar} label="Issue Date"    value={fmtDate(quotation.created_at)} />
            <div className="vqd-meta-sep" />
            <MetaBlock icon={Calendar} label="Last Updated"  value={fmtDate(quotation.updated_at)} />
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
            {createdByName && <>
              <div className="vqd-meta-sep" />
              <MetaBlock icon={User} label="Prepared By" value={createdByName} />
            </>}
          </div>

          {/* ══════════ PARTIES ══════════ */}
          <div className="vqd-parties">
            <div className="vqd-party">
              <div className="vqd-plabel">Billed To</div>
              <div className="vqd-pavatar">{clientName.charAt(0).toUpperCase()}</div>
              <div className="vqd-pname">{clientName}</div>
              {client?.email && <div className="vqd-pdetail"><Mail size={11} style={{ opacity: .45, flexShrink: 0 }} />{client.email}</div>}
            </div>
            <div className="vqd-arrow-col"><ChevronRight size={16} style={{ color: '#cbd5e1' }} /></div>
            <div className="vqd-party vqd-party--proj">
              <div className="vqd-plabel">Project</div>
              <div className="vqd-picon"><Building2 size={20} color="#0f766e" /></div>
              <div className="vqd-pname">{projName}</div>
              {projLoc && <div className="vqd-pdetail"><MapPin size={11} style={{ opacity: .45, flexShrink: 0 }} />{projLoc}</div>}
            </div>
            <div className="vqd-party vqd-party--rates">
              <div className="vqd-plabel">Applied Rates {editMode && <span style={{ color: '#f59e0b', fontWeight: 700 }}>— Editable</span>}</div>
              <div className="vqd-rates-list">
                <div className="vqd-rate-row">
                  <div className="vqd-rate-icon" style={{ background: '#eff6ff' }}><Percent size={14} color="#2563eb" /></div>
                  <div style={{ flex: 1 }}>
                    {editMode ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="number" min="0" max="100" step="0.01" className="vqd-edit-input vqd-edit-input-sm" value={editGstRate} onChange={e => setEditGstRate(parseFloat(e.target.value) || 0)} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>%</span>
                      </div>
                    ) : (
                      <div className="vqd-rate-v">{gstRate}%</div>
                    )}
                    <div className="vqd-rate-l">GST Rate</div>
                  </div>
                </div>
                <div className="vqd-rate-row">
                  <div className="vqd-rate-icon" style={{ background: (editMode ? editDiscRate : discRate) > 0 ? '#fff7ed' : '#f8fafc' }}>
                    <Tag size={14} color={(editMode ? editDiscRate : discRate) > 0 ? '#ea580c' : '#94a3b8'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    {editMode ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="number" min="0" max="100" step="0.01" className="vqd-edit-input vqd-edit-input-sm" value={editDiscRate} onChange={e => setEditDiscRate(parseFloat(e.target.value) || 0)} />
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

          {/* ══════════ LINE ITEMS ══════════ */}
          <div className="vqd-items">

            {/* ══════════ QUOTATION TYPE INDICATOR ══════════ */}
            {quotation.quotation_type && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12,
                padding: '8px 14px',
                background: '#f0fdf4',
                border: '1.5px solid #bbf7d0',
                borderRadius: 20,
              }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#0d6360',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}>
                  Quotation Type
                </span>
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#059669',
                }}>
                  {quotation.quotation_type}
                </span>
              </div>
            )}

            <div className="vqd-sec-hdr">
              <FileText size={15} color="#0f766e" />
              Services &amp; Compliance Items
              <span className="vqd-sec-badge">
                {editMode ? editItems.length : items.length} {(editMode ? editItems.length : items.length) === 1 ? 'item' : 'items'}
              </span>

              {/* Add Item button — only in edit mode */}
              {editMode && (
                <button
                  onClick={handleOpenAddSection}
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
              <div className="vqd-table-wrap">
                <table className="vqd-table">
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
                        <tr className="vqd-cat-row"><td colSpan={7}><div className="vqd-cat-inner"><span className="vqd-cat-dot" />{grp.catName}<span className="vqd-cat-cnt">{grp.items.length} item{grp.items.length !== 1 ? 's' : ''}</span></div></td></tr>
                        {grp.items.map((item, ii) => {
                          const prof    = parseFloat(item.Professional_amount || 0);
                          const miscRaw = item.miscellaneous_amount;
                          const miscNum = isMiscNumeric(miscRaw) ? parseFloat(miscRaw) : 0;
                          const qty     = parseInt(item.quantity) || 1;
                          const total   = (prof + miscNum) * qty;
                          const subCat  = SUB_COMPLIANCE_CATEGORIES[item.sub_compliance_category] || null;
                          const miscStr = miscRaw && String(miscRaw).trim() && String(miscRaw).trim() !== '--' ? String(miscRaw).trim() : null;
                          return (
                            <tr key={ii} className="vqd-row">
                              <td className="vqd-row-idx">{ii + 1}</td>
                              <td><div className="vqd-desc">{item.description || item.compliance_name || '—'}</div></td>
                              <td>{subCat ? <span className="vqd-subcat">{subCat.name}</span> : <span style={{ color: '#e2e8f0', fontSize: 12 }}>—</span>}</td>
                              <td style={{ textAlign: 'center' }}><span className="vqd-qty-badge">{qty}</span></td>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b', fontSize: 13 }}>₹&nbsp;{fmtINR(prof)}</td>
                              <td style={{ textAlign: 'right', fontSize: 12 }}>
                                {miscStr
                                  ? isMiscNumeric(miscStr)
                                    ? <span style={{ color: '#475569', fontWeight: 600 }}>₹&nbsp;{fmtINR(parseFloat(miscStr))}</span>
                                    : <span className="vqd-misc-note" title="Note — not in total">{miscStr}</span>
                                  : <span style={{ color: '#e2e8f0' }}>—</span>}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 800, color: '#1e293b', fontSize: 13 }}>₹&nbsp;{fmtINR(total)}</td>
                            </tr>
                          );
                        })}
                        <tr className="vqd-cat-sub">
                          <td colSpan={6} style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', fontStyle: 'italic', paddingRight: 14 }}>{grp.catName} subtotal</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 13, color: '#0f766e', paddingRight: 16 }}>₹&nbsp;{fmtINR(grpTotal)}</td>
                        </tr>
                      </tbody>
                    );
                  })}
                </table>
              </div>
            ))}

            {/* ── EDIT MODE TABLE ── */}
            {editMode && (
              <div className="vqd-table-wrap">
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
                    <table className="vqd-table" style={{ tableLayout: 'fixed' }}>
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
                            <tr className="vqd-cat-row">
                              <td colSpan={7}>
                                <div className="vqd-cat-inner">
                                  <span className="vqd-cat-dot" />
                                  {grp.catName}
                                  <span className="vqd-cat-cnt">{grp.rows.length} item{grp.rows.length !== 1 ? 's' : ''}</span>
                                </div>
                              </td>
                            </tr>
                            {grp.rows.map(({ it, globalIdx }) => {
                              const itemTotal = calcItemTotal(it);
                              return (
                                <tr key={globalIdx} className="vqd-edit-row">
                                  <td style={{ textAlign: 'center', fontSize: 11, color: '#d1d5db', fontWeight: 700 }}>{globalIdx + 1}</td>
                                  <td>
                                    <textarea
                                      className="vqd-edit-input"
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
                                      className="vqd-edit-input"
                                      value={it.quantity}
                                      onChange={e => updateItem(globalIdx, 'quantity', parseInt(e.target.value) || 1)}
                                      style={{ textAlign: 'center', width: '100%' }}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="number" min="0" step="0.01"
                                      className="vqd-edit-input"
                                      value={it.Professional_amount === 0 ? '' : it.Professional_amount}
                                      onChange={e => updateItem(globalIdx, 'Professional_amount', parseFloat(e.target.value) || 0)}
                                      placeholder="0.00"
                                      style={{ textAlign: 'right', width: '100%' }}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="vqd-edit-input"
                                      value={it.miscellaneous_amount}
                                      onChange={e => updateItem(globalIdx, 'miscellaneous_amount', e.target.value)}
                                      placeholder="Amount or note"
                                      style={{ textAlign: 'right', width: '100%', borderColor: it.miscellaneous_amount && !isMiscNumeric(it.miscellaneous_amount) ? '#fbbf24' : undefined }}
                                    />
                                    {it.miscellaneous_amount && !isMiscNumeric(it.miscellaneous_amount) && (
                                      <div style={{ fontSize: 10, color: '#d97706', marginTop: 2 }}>Note only — not calculated</div>
                                    )}
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0f766e' }}>₹&nbsp;{fmtINR(itemTotal)}</span>
                                    <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>(Prof+Misc)×Qty</div>
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
                            <tr className="vqd-cat-sub">
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
          <div className="vqd-foot">
            {/* Left */}
            <div>
              <div className="vqd-sum-title">Quotation Summary</div>
              <div className="vqd-sum-grid">
                <div className="vqd-sum-item"><span className="vqd-sum-lbl">Total Items</span><span className="vqd-sum-val">{items.length}</span></div>
                <div className="vqd-sum-item"><span className="vqd-sum-lbl">Total Quantity</span><span className="vqd-sum-val">{totalQty}</span></div>
                <div className="vqd-sum-item"><span className="vqd-sum-lbl">Compliance Groups</span><span className="vqd-sum-val">{groups.length}</span></div>
                <div className="vqd-sum-item"><span className="vqd-sum-lbl">SAC Code</span><span className="vqd-sum-val" style={{ color: '#0f766e', fontFamily: 'monospace' }}>{quotation.sac_code || '—'}</span></div>
                <div className="vqd-sum-item"><span className="vqd-sum-lbl">Status</span><span><StatusPill status={status} /></span></div>
                {createdByName && <div className="vqd-sum-item"><span className="vqd-sum-lbl">Prepared By</span><span className="vqd-sum-val">{createdByName}</span></div>}
              </div>
              {quotation.notes && <div className="vqd-remarks"><div className="vqd-rem-title">Notes</div><p className="vqd-rem-text">{quotation.notes}</p></div>}
              {quotation.terms && <div className="vqd-remarks"><div className="vqd-rem-title">Terms &amp; Conditions</div><p className="vqd-rem-text">{quotation.terms}</p></div>}
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
                      {eGst > 0 && <div className="vqd-trow"><span>GST ({editGstRate}%)</span><span style={{ fontWeight: 700, color: '#1e293b' }}>+&nbsp;₹&nbsp;{fmtINR(eGst)}</span></div>}
                      <hr className="vqd-tdiv" />
                      <div className="vqd-grand" style={{ fontSize: 21 }}>
                        <span>Grand Total</span>
                        <span style={{ color: '#059669' }}>₹&nbsp;{fmtINR(eGrand)}</span>
                      </div>
                      <div className="vqd-words"><strong style={{ color: '#94a3b8', fontStyle: 'normal' }}>In words: </strong>{numberToWords(eGrand)} Rupees only</div>
                      <button className="vqd-btn-save" onClick={handleSaveUpdate} disabled={saving} style={{ width: '100%', marginTop: 14, padding: 11, justifyContent: 'center', borderRadius: 10 }}>
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
      </div>

      {/* ══════════ ADD COMPLIANCE MODAL ══════════ */}
      <AddComplianceModal
        isOpen={showAddSection}
        onClose={() => setShowAddSection(false)}
        onSave={handleComplianceSave}
        existingItems={editItems}
        fetchDescriptions={fetchDescriptionsForModal}
      />


      {/* ── Send to Client Modal ── */}
      {sendModal && (
        <SendToClientModal
          quotation={quotation}
          client={client}
          qNum={qNum}
          issuedDate={fmtDate(quotation.created_at)}
          onClose={() => setSendModal(false)}
        />
      )}

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
          <div style={{ position: 'relative', zIndex: 1, background: '#fff', borderRadius: 24, boxShadow: '0 40px 100px rgba(0,0,0,.22)', width: '100%', maxWidth: 400, overflow: 'hidden', animation: 'vqd_modal_in .32s cubic-bezier(.16,1,.3,1)' }}
            onClick={e => e.stopPropagation()}>
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
    </>
  );
}
