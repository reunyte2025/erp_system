import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Loader2, AlertCircle,
  CheckCircle, Clock, Send, FileText, XCircle,
  Building2, User, MapPin, Hash, Calendar,
  Tag, Percent, ChevronRight, Mail, Receipt,
  Briefcase, ShoppingCart, Users, X, Paperclip, Truck,
  DollarSign, FileEdit, ChevronDown, Search,
} from 'lucide-react';
import { getInvoiceById } from '../../services/invoices';
import { getQuotationById } from '../../services/quotation';
import { getClientById } from '../../services/clients';
import { getProjects } from '../../services/projects';
import { getVendors } from '../../services/vendors';
import api from '../../services/api';

// ─── Constants ──────────────────────────────────────────────────────────────────

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

const STATUS_CONFIG = {
  '1':                 { label: 'Draft',             Icon: FileText,    color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  '2':                 { label: 'Under Review',       Icon: Clock,       color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  '3':                 { label: 'In Progress',        Icon: Clock,       color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  '4':                 { label: 'Placed Work-order',  Icon: CheckCircle, color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  '5':                 { label: 'Failed',             Icon: XCircle,     color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  'draft':             { label: 'Draft',             Icon: FileText,    color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  'under_review':      { label: 'Under Review',       Icon: Clock,       color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  'in_progress':       { label: 'In Progress',        Icon: Clock,       color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  'placed_work_order': { label: 'Placed Work-order',  Icon: CheckCircle, color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  'verified':          { label: 'Verified',           Icon: CheckCircle, color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  'failed':            { label: 'Failed',             Icon: XCircle,     color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  'pending':           { label: 'Pending',            Icon: Clock,       color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

const fmtInvNum = (n) => {
  if (!n) return '—';
  return String(n);
};

const fmtINR = (v) => {
  const n = parseFloat(v) || 0;
  // Always show 2 decimal places to preserve amounts like 61,371.80
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
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

const calcItemTotal = (item) => {
  const prof = parseFloat(item.Professional_amount || 0);
  const misc = isMiscNumeric(item.miscellaneous_amount) ? parseFloat(item.miscellaneous_amount) : 0;
  return parseFloat(((prof + misc) * (parseInt(item.quantity) || 1)).toFixed(2));
};

function numberToWords(n) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
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

/**
 * Determine compliance type from items
 * Returns: 'certificates' | 'execution' | 'mixed' | 'none'
 */
const getComplianceType = (items = []) => {
  const hasCerts = items.some(it => [1, 2].includes(it.compliance_category));
  const hasExec = items.some(it => [3, 4].includes(it.compliance_category));
  
  if (hasCerts && hasExec) return 'mixed';
  if (hasCerts) return 'certificates';
  if (hasExec) return 'execution';
  return 'none';
};

/**
 * Get display text for compliance type
 */
const getComplianceTypeLabel = (items = []) => {
  const type = getComplianceType(items);
  switch (type) {
    case 'certificates':
      return 'Certificates (Construction & Occupational)';
    case 'execution':
      return 'Execution (Water Main & STP)';
    case 'mixed':
      return 'Mixed Compliance (Certificates & Execution)';
    default:
      return 'No Compliance Items';
  }
};

/**
 * Check if invoice has Execution compliance items (categories 3 or 4)
 */
const hasExecutionCompliance = (items = []) => {
  return items.some(it => [3, 4].includes(it.compliance_category));
};

// ─── Sub-components ──────────────────────────────────────────────────────────────

const StatusPill = ({ status }) => {
  const { Icon } = status;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: status.color, background: status.bg, border: `1px solid ${status.border}`, fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 20 }}>
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
    <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#0f766e', animation: 'vid_spin .75s linear infinite' }} />
    <p style={{ fontSize: 14, fontWeight: 500, color: '#64748b', margin: 0 }}>Loading invoice…</p>
    <style>{`@keyframes vid_spin{to{transform:rotate(360deg)}}`}</style>
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

// ─── Quick Info Card — same structure as proforma ────────────────────────────────

const QuickInfoCard = ({ invoice, client, project }) => {
  const [activeTab, setActiveTab] = useState('info');

  const isVendorInv = Boolean(invoice.vendor) && !invoice.client;
  const clientDisplayName = isVendorInv
    ? (invoice.vendor_name || `Vendor #${invoice.vendor}`)
    : client
      ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unknown Client'
      : invoice.client_name || (invoice.client ? `Client #${invoice.client}` : '—');

  const getEventStyle = (event = '') => {
    const e = event.toLowerCase();
    if (e.includes('paid') || e.includes('verified'))    return { color: '#059669', bg: '#ecfdf5', border: '#bbf7d0', dot: '✅' };
    if (e.includes('failed') || e.includes('rejected'))  return { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', dot: '❌' };
    if (e.includes('sent'))                              return { color: '#d97706', bg: '#fffbeb', border: '#fcd34d', dot: '📤' };
    if (e.includes('updated'))                           return { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', dot: '✏️' };
    if (e.includes('invoice created') || e.includes('created')) return { color: '#0f766e', bg: '#f0fdf4', border: '#bbf7d0', dot: '🧾' };
    return { color: '#475569', bg: '#f8fafc', border: '#e2e8f0', dot: '🔵' };
  };

  const fmtMetaTime = (ts) => {
    if (!ts) return '';
    try {
      const d = new Date(String(ts).replace(' ', 'T'));
      return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return String(ts).slice(0, 16); }
  };

  const entries = invoice.metadata ? (typeof invoice.metadata === 'string'
    ? (() => { try { return JSON.parse(invoice.metadata); } catch { return []; } })()
    : Array.isArray(invoice.metadata) ? invoice.metadata : []
  ) : [];

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e8ecf2', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>

      {/* Card header */}
      <div style={{ padding: '13px 16px 0', borderBottom: '1.5px solid #f0f4f8' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 10 }}>Quick Info</div>
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
                { label: 'Issue Date',    value: fmtDate(invoice.issue_date || invoice.created_at) },
                { label: 'Valid Until',   value: fmtDate(invoice.valid_until) },
                { label: 'Last Updated', value: fmtDate(invoice.updated_at) },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Rates */}
          <div style={{ borderRadius: 12, border: '1.5px solid #e8ecf2', overflow: 'hidden' }}>
            <div style={{ background: '#f8fafc', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 7, borderBottom: '1px solid #f0f4f8' }}>
              <div style={{ width: 22, height: 22, borderRadius: 7, background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Percent size={11} color="#fff" />
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '.1em' }}>Applied Rates</span>
            </div>
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { label: 'GST Rate',  value: `${parseFloat(invoice.gst_rate || 0)}%`,      color: '#2563eb' },
                { label: 'Discount',  value: parseFloat(invoice.discount_rate || 0) > 0 ? `${parseFloat(invoice.discount_rate)}%` : 'Nil', color: '#ea580c' },
                { label: 'SAC Code',  value: invoice.sac_code || '—',                       color: '#0f766e' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Proforma link */}
          {invoice.proforma && (
            <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '10px 12px', border: '1.5px solid #bbf7d0' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 5 }}>🧾 Source Proforma</div>
              <p style={{ margin: 0, fontSize: 12, color: '#0f766e', fontWeight: 700 }}>Proforma #{invoice.proforma}</p>
            </div>
          )}

        </div>
      )}

      {/* Timeline tab */}
      {activeTab === 'timeline' && (() => {
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
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingBottom: isLast ? 0 : 14 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: style.bg, border: `2px solid ${style.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 0 3px #fff', fontSize: 13 }}>
                      {style.dot}
                    </div>
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

// ─── Send to Client Modal ────────────────────────────────────────────────────────

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

const SendToClientModal = ({ invoice, client, invNum, issuedDate, onClose }) => {
  const defaultEmail   = client?.email || '';
  const defaultSubject = `Invoice ${invNum}${issuedDate ? ` — Issued ${issuedDate}` : ''}`;
  const defaultBody    = `Dear ${client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Client' : 'Client'},\n\nPlease find attached your invoice ${invNum}${issuedDate ? `, issued on ${issuedDate}` : ''}.\n\nKindly review the details and make the payment at the earliest convenience.\n\nBest regards,\nERP System`;

  const [email,   setEmail]   = useState(defaultEmail);
  const [subject, setSubject] = useState(defaultSubject);
  const [body,    setBody]    = useState(defaultBody);
  const [extras,  setExtras]  = useState([]);
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');
  const fileInputRef = useRef(null);

  const handleAddFiles = (e) => {
    const newFiles = Array.from(e.target.files || []);
    if (!newFiles.length) return;
    const combined  = [...extras, ...newFiles];
    const totalSize = combined.reduce((s, f) => s + f.size, 0) + 2 * 1024 * 1024;
    if (totalSize > MAX_ATTACHMENT_BYTES) { setError('Adding these files would exceed the 25 MB limit.'); return; }
    setExtras(combined); setError(''); e.target.value = '';
  };
  const removeExtra = (idx) => setExtras(prev => prev.filter((_, i) => i !== idx));

  const handleSend = async () => {
    if (!email.trim()) { setError('Recipient email is required.'); return; }
    if (!/\S+@\S+\.\S+/.test(email.trim())) { setError('Please enter a valid email address.'); return; }
    setError(''); setSending(true);
    try {
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
    <div className="fixed inset-0 z-[10000]" style={{ position: 'fixed', overflow: 'hidden', animation: 'vid_overlay_in .2s ease' }}>
      <div className="absolute inset-0 bg-black/50" style={{ position: 'fixed', width: '100vw', height: '100vh' }} onClick={onClose} />
      <div className="relative z-10 flex items-center justify-center p-4" style={{ height: '100vh' }}>
        <div className="relative bg-white" style={{ borderRadius: 18, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,.24)', overflow: 'hidden', fontFamily: "'Outfit', sans-serif", animation: 'vid_modal_in .3s cubic-bezier(.16,1,.3,1)' }} onClick={e => e.stopPropagation()}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 16px', borderBottom: '1.5px solid #f0f4f8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#0f766e,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mail size={17} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Send to Client</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{invNum}</div>
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
                Invoice <strong>{invNum}</strong> has been sent to<br /><strong>{email}</strong>
              </div>
              <button onClick={onClose} style={{ marginTop: 22, padding: '9px 28px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Done</button>
            </div>
          ) : (
            <div style={{ padding: '20px 22px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '9px 12px' }}>
                <FileText size={14} color="#059669" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#065f46', fontWeight: 500 }}>Invoice PDF will be automatically attached to this email.</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5 }}>To</label>
                <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} placeholder="client@example.com"
                  style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5 }}>Subject</label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5 }}>Message</label>
                <textarea value={body} onChange={e => setBody(e.target.value)} rows={5}
                  style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', color: '#1e293b', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em' }}>Extra Attachments</label>
                  <button onClick={() => fileInputRef.current?.click()}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#0f766e', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 7px', borderRadius: 6 }}>
                    <Paperclip size={12} /> Add File
                  </button>
                  <input type="file" multiple ref={fileInputRef} onChange={handleAddFiles} style={{ display: 'none' }} />
                </div>
                {extras.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {extras.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                        <Paperclip size={12} color="#64748b" />
                        <span style={{ flex: 1, fontSize: 12, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{fmtSize(f.size)}</span>
                        <button onClick={() => removeExtra(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 2 }}><X size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 9, padding: '8px 12px', fontSize: 12, color: '#dc2626', fontWeight: 500 }}>
                  <AlertCircle size={13} /> {error}
                </div>
              )}
              <div style={{ display: 'flex', gap: 9, marginTop: 2 }}>
                <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 10, border: '2px solid #94a3b8', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSend} disabled={sending} style={{ flex: 2, padding: 10, borderRadius: 10, background: sending ? '#94a3b8' : '#0f766e', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                  {sending ? <><Loader2 size={14} style={{ animation: 'vid_spin .7s linear infinite' }} /> Sending…</> : <><Send size={14} /> Send Email</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────────

export default function ViewInvoiceDetails({ onUpdateNavigation }) {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [invoice,       setInvoice]       = useState(null);
  const [client,        setClient]        = useState(null);
  const [project,       setProject]       = useState(null);
  const [createdByName, setCreatedByName] = useState('');
  const [loading,       setLoading]       = useState(true);
  const [fetchError,    setFetchError]    = useState('');
  const [pdfLoading,    setPdfLoading]    = useState(false);
  const [visible,       setVisible]       = useState(false);
  const [sendModal,     setSendModal]     = useState(false);

  // Create Purchase Order Modal state
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [poVendors,         setPoVendors]         = useState([]);
  const [poVendorsLoading,  setPoVendorsLoading]  = useState(false);
  const [poSelectedVendor,  setPoSelectedVendor]  = useState(null);
  const [poVendorSearch,    setPoVendorSearch]    = useState('');

  // Scroll lock when send modal is open
  useEffect(() => {
    if (sendModal) {
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
  }, [sendModal]);

  useEffect(() => {
    onUpdateNavigation?.({ breadcrumbs: ['Invoices', 'Invoice Details'] });
    return () => onUpdateNavigation?.(null);
  }, [onUpdateNavigation]);

  const fetchData = useCallback(async () => {
    if (!id) { setFetchError('No invoice ID provided'); setLoading(false); return; }
    setLoading(true); setFetchError('');
    try {
      const res = await getInvoiceById(id);
      if (res.status !== 'success' || !res.data) throw new Error('Failed to load invoice');
      const inv = res.data;
      setInvoice(inv);

      // ── Resolve client ID and project ID ────────────────────────────────────
      // When invoice is generated from quotation, backend may not populate:
      //   inv.client, inv.client_name, inv.project, inv.quotation
      // Strategy:
      //   1. Use inv.client / inv.project if present
      //   2. If inv.quotation is populated, fetch that quotation
      //   3. If not, find the quotation by matching trailing digits of invoice_number
      let resolvedClientId  = inv.client  || null;
      let resolvedProjectId = inv.project || null;

      // Only run quotation lookup if we're missing client or project
      if (!resolvedClientId || !resolvedProjectId) {
        let quotationData = null;

        // Try 1: use inv.quotation field directly
        if (inv.quotation) {
          try {
            const qRes = await getQuotationById(inv.quotation);
            quotationData = qRes?.data || qRes;
          } catch { /* silently ignore */ }
        }

        // Try 2: match by trailing digits (INV-202603-3075714 → "3075714" → QT-xxx-3075714)
        if (!quotationData && inv.invoice_number) {
          try {
            const invTrailing = String(inv.invoice_number).split('-').pop();
            const allQ = await api.get('/quotations/get_all_quotations/', {
              params: { page: 1, page_size: 100 },
            });
            const qResults =
              allQ.data?.data?.results ||
              allQ.data?.results ||
              [];
            const matched = qResults.find((q) => {
              const qTrailing = String(q.quotation_number || '').split('-').pop();
              return qTrailing && qTrailing === invTrailing;
            });
            if (matched) quotationData = matched;
          } catch { /* silently ignore */ }
        }

        if (quotationData) {
          if (!resolvedClientId  && quotationData.client)  resolvedClientId  = quotationData.client;
          if (!resolvedProjectId && quotationData.project) resolvedProjectId = quotationData.project;
        }
      }

      // ── Load client ──────────────────────────────────────────────────────────
      if (resolvedClientId) {
        try {
          const cr = await getClientById(resolvedClientId);
          if (cr.status === 'success' && cr.data) setClient(cr.data);
        } catch {}
      }

      // ── Load project ──────────────────────────────────────────────────────────
      if (resolvedProjectId) {
        try {
          const pr  = await getProjects({ page: 1, page_size: 500 });
          const all = pr?.data?.results || pr?.results || [];
          const found = all.find(proj => String(proj.id) === String(resolvedProjectId));
          if (found) setProject(found);
        } catch {}
      }

      // ── Load created-by name ────────────────────────────────────────────────
      if (inv.created_by) {
        try {
          const ur = await api.get('/users/get_user/', { params: { id: inv.created_by } });
          if (ur.data?.status === 'success' && ur.data?.data) {
            const u = ur.data.data;
            setCreatedByName(`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || '');
          }
        } catch {}
      }

      setTimeout(() => setVisible(true), 60);
    } catch (e) {
      setFetchError(e.message || 'Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); window.scrollTo(0, 0); }, [fetchData]);

  const handleDownload = async () => {
    if (pdfLoading) return;
    try {
      setPdfLoading(true);
      if (invoice?.invoice_url) {
        window.open(invoice.invoice_url, '_blank');
      } else {
        const response = await api.get(`/invoices/${id}/generate_pdf/`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${fmtInvNum(invoice?.invoice_number)}.pdf`);
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

  /**
   * Open Create PO Modal and fetch vendors.
   * Project is pre-filled from the invoice — only vendor selection is needed.
   */
  const handleOpenCreatePOModal = async () => {
    setPoSelectedVendor(null);
    setPoVendorSearch('');
    setPoVendors([]);
    setShowCreatePOModal(true);
    setPoVendorsLoading(true);
    try {
      const response = await getVendors({ page: 1, page_size: 100 });
      if (response.status === 'success' && response.data) {
        setPoVendors(response.data.results || []);
      }
    } catch (error) {
      console.warn('Failed to fetch vendors:', error);
    } finally {
      setPoVendorsLoading(false);
    }
  };

  /**
   * Navigate to /purchase/form with pre-filled vendor + project data.
   */
  const handleCreatePO = () => {
    if (!poSelectedVendor) return;
    const prefilledProject = project
      ? { id: project.id, name: project.name || project.title, city: project.city, state: project.state }
      : { id: invoice.project, name: invoice.project_name || `Project #${invoice.project}` };

    navigate('/purchase/form', {
      state: {
        selectedVendor:  poSelectedVendor,
        selectedProject: prefilledProject,
      },
    });
    setShowCreatePOModal(false);
  };

  const handleCloseCreatePOModal = () => {
    setShowCreatePOModal(false);
    setPoSelectedVendor(null);
    setPoVendorSearch('');
  };

  if (loading)    return <LoadingView />;
  if (fetchError) return <ErrorView message={fetchError} onRetry={fetchData} onBack={() => navigate('/invoices')} />;
  if (!invoice)   return <ErrorView message="Invoice not available." onRetry={fetchData} onBack={() => navigate('/invoices')} />;

  // ── Derived values ────────────────────────────────────────────────────────────
  const status     = getStatus(invoice.status ?? invoice.status_display ?? 1);
  const invNum     = fmtInvNum(invoice.invoice_number);
  const subtotal   = parseFloat(invoice.total_amount  || 0);
  const gstRate    = parseFloat(invoice.gst_rate      || 0);
  const discRate   = parseFloat(invoice.discount_rate || 0);
  const discAmt    = parseFloat(((subtotal * discRate) / 100).toFixed(2));
  const taxable    = parseFloat((subtotal - discAmt).toFixed(2));
  const gstAmt     = parseFloat(((taxable * gstRate) / 100).toFixed(2));
  // Always use grand_total from API — it's the authoritative value including all server-side rounding
  const grandTotal = parseFloat(invoice.grand_total || invoice.total_outstanding || (taxable + gstAmt));
  const items      = invoice.items || [];
  const groups     = groupItemsByCategory(items);
  const totalQty   = items.reduce((s, it) => s + (parseInt(it.quantity) || 1), 0);

  // Detect vendor invoice: has vendor but no client (generated from a Purchase Order)
  const isVendorInvoice = Boolean(invoice.vendor) && !invoice.client;

  const billedToName = isVendorInvoice
    ? (invoice.vendor_name || `Vendor #${invoice.vendor}`)
    : client
      ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.email
      : invoice.client_name
        ? invoice.client_name
        : invoice.client
          ? `Client #${invoice.client}`
          : '—';

  // Keep clientName alias for legacy usage (SendToClientModal etc.)
  const clientName = billedToName;

  const projName = project
    ? (project.name || project.title || `Project #${invoice.project}`)
    : invoice.project_name
      ? invoice.project_name
      : invoice.project
        ? `Project #${invoice.project}`
        : '—';

  const projLoc = project ? [project.city, project.state].filter(Boolean).join(', ') : '';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        .vid-root *{box-sizing:border-box;font-family:'Outfit',sans-serif}
        @keyframes vid_spin{to{transform:rotate(360deg)}}
        @keyframes vid_in{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes vid_modal_in{from{opacity:0;transform:scale(.93) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes vid_overlay_in{from{opacity:0}to{opacity:1}}
        @keyframes vid_toast_in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .vid-root{min-height:100vh;padding:0}
        .vid-topbar{display:flex;align-items:center;justify-content:space-between;margin:0 0 16px;flex-wrap:wrap;gap:10px}
        .vid-back{display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;font-size:13px;font-weight:600;color:#475569;padding:6px 10px;border-radius:8px;transition:background .15s,color .15s}
        .vid-back:hover{background:#e2e8f0;color:#1e293b}
        .vid-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}

        /* Track Payment — red */
        .vid-btn-track{display:flex;align-items:center;gap:6px;padding:7px 15px;border-radius:8px;background:linear-gradient(135deg,#dc2626,#b91c1c);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;box-shadow:0 2px 8px rgba(220,38,38,.3)}
        .vid-btn-track:hover{background:linear-gradient(135deg,#b91c1c,#991b1b);box-shadow:0 4px 14px rgba(220,38,38,.4);transform:translateY(-1px)}
        .vid-btn-track:active{transform:translateY(0)}

        /* Send to Client, Download — teal */
        .vid-btn-o{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;background:#0f766e;border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:background .15s}
        .vid-btn-o:hover{background:#0d6460}
        .vid-btn-p{display:flex;align-items:center;gap:6px;padding:7px 16px;border-radius:8px;background:#0f766e;border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:background .15s}
        .vid-btn-p:hover{background:#0d6460}
        .vid-btn-p:disabled{opacity:.6;cursor:not-allowed}

        /* Coming soon — looks like a real button, slate color, no hover/click */
        .vid-btn-soon{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;background:linear-gradient(135deg,#64748b,#475569);border:none;color:#fff;font-size:13px;font-weight:600;cursor:not-allowed;box-shadow:0 1px 4px rgba(71,85,105,.2);pointer-events:none}

        .vid-spin{animation:vid_spin .7s linear infinite}
        .vid-doc{background:#fff;border-radius:20px;box-shadow:0 2px 4px rgba(0,0,0,.04),0 12px 40px rgba(0,0,0,.09);overflow:hidden;opacity:0;transform:translateY(16px);transition:opacity .4s ease,transform .4s ease}
        .vid-doc.in{opacity:1;transform:translateY(0)}

        /* Header — deep teal-to-cyan gradient */
        .vid-hdr{display:flex;align-items:flex-end;justify-content:space-between;padding:32px 40px 28px;background:linear-gradient(135deg,#134e4a 0%,#0f766e 40%,#0d9488 75%,#0891b2 100%);position:relative;overflow:hidden}
        .vid-hdr::after{content:'';position:absolute;top:-60px;right:-60px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.07);pointer-events:none}
        .vid-hdr::before{content:'';position:absolute;bottom:-80px;left:30%;width:300px;height:300px;border-radius:50%;background:rgba(255,255,255,.04);pointer-events:none}
        .vid-hdr-l{position:relative;z-index:1}
        .vid-hdr-r{text-align:right;position:relative;z-index:1}
        .vid-logo{display:flex;align-items:center;gap:12px;margin-bottom:16px}
        .vid-logo-badge{width:46px;height:46px;border-radius:12px;background:rgba(255,255,255,.15);border:1.5px solid rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#fff;letter-spacing:.03em}
        .vid-co-name{font-size:20px;font-weight:800;color:#fff;letter-spacing:-.02em;line-height:1.1}
        .vid-co-sub{font-size:12px;color:rgba(255,255,255,.6);font-weight:400;margin-top:2px}
        .vid-doc-label{font-size:10px;font-weight:800;color:rgba(255,255,255,.55);letter-spacing:.18em;text-transform:uppercase}
        .vid-doc-num{font-size:20px;font-weight:900;color:#fff;letter-spacing:-.01em;font-variant-numeric:tabular-nums;margin-top:3px;word-break:break-all}
        .vid-doc-date{font-size:12px;color:rgba(255,255,255,.6);margin-top:5px;font-weight:400}

        .vid-meta{display:flex;flex-wrap:wrap;align-items:center;gap:0;padding:14px 40px;background:#f8fafc;border-bottom:1.5px solid #e8ecf2}
        .vid-meta-sep{width:1px;height:30px;background:#e2e8f0;margin:0 18px;flex-shrink:0}
        .vid-parties{display:grid;grid-template-columns:1fr 28px 1fr 1fr;padding:28px 40px;gap:0;border-bottom:1.5px solid #f0f4f8;background:#fff}
        .vid-arrow-col{display:flex;align-items:center;justify-content:center;padding:0 4px;padding-top:36px}
        .vid-party{padding-right:24px}
        .vid-party--proj{padding-left:24px;padding-right:24px}
        .vid-party--rates{padding-left:24px;border-left:1.5px solid #f0f4f8}
        .vid-plabel{font-size:9.5px;font-weight:800;letter-spacing:.14em;color:#94a3b8;text-transform:uppercase;margin-bottom:10px}
        .vid-pavatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#0f766e,#0d9488);color:#fff;font-size:18px;font-weight:800;display:flex;align-items:center;justify-content:center;margin-bottom:8px}
        .vid-picon{width:44px;height:44px;border-radius:10px;background:#f0fdf4;border:1.5px solid #bbf7d0;display:flex;align-items:center;justify-content:center;margin-bottom:8px}
        .vid-pname{font-size:15px;font-weight:700;color:#1e293b;line-height:1.3;margin-bottom:5px}
        .vid-pdetail{display:flex;align-items:center;gap:5px;font-size:12px;color:#64748b;margin-bottom:3px;word-break:break-all}
        .vid-rates-list{display:flex;flex-direction:column;gap:12px}
        .vid-rate-row{display:flex;align-items:center;gap:10px}
        .vid-rate-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .vid-rate-v{font-size:15px;font-weight:800;color:#1e293b;line-height:1.2}
        .vid-rate-l{font-size:11px;color:#94a3b8;font-weight:500}

        /* Two-column layout — same as proforma */
        .vid-body-wrap{display:grid;grid-template-columns:1fr 310px;gap:20px;padding:0 40px 32px;align-items:start}
        .vid-body-left{min-width:0}
        .vid-body-right{position:sticky;top:20px;display:flex;flex-direction:column;gap:0}

        .vid-sec-hdr{display:flex;align-items:center;gap:8px;padding:22px 0 14px;border-bottom:2px solid #f0f4f8;font-size:13px;font-weight:700;color:#1e293b}
        .vid-sec-badge{background:#ccfbf1;color:#0f766e;font-size:10.5px;font-weight:700;padding:2px 9px;border-radius:20px;border:1px solid #99f6e4}

        .vid-table-wrap{overflow-x:auto;margin-top:0}
        .vid-table{width:100%;border-collapse:collapse;font-size:13px}
        .vid-table thead tr{background:#f8fafc}
        .vid-table thead th{padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:.08em;text-transform:uppercase;border-bottom:1.5px solid #e8ecf2;white-space:nowrap}
        .vid-table thead th:first-child{padding-left:16px}
        .vid-table thead th:last-child{padding-right:16px;text-align:right}

        /* Category rows — same white/light style as proforma/quotation */
        .vid-cat-row td{padding:9px 12px 6px 16px;background:#fafbfc;border-top:1.5px solid #f0f4f8}
        .vid-cat-inner{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:700;color:#0f766e;text-transform:uppercase;letter-spacing:.08em}
        .vid-cat-dot{width:6px;height:6px;border-radius:50%;background:#0d9488;flex-shrink:0}
        .vid-cat-cnt{margin-left:auto;font-size:10px;font-weight:600;color:#94a3b8;text-transform:none;letter-spacing:0}

        .vid-row{border-bottom:1px solid #f8fafc;transition:background .1s}
        .vid-row:hover{background:#fafffe}
        .vid-row td{padding:11px 12px;vertical-align:top}
        .vid-row td:first-child{padding-left:16px}
        .vid-row td:last-child{padding-right:16px;text-align:right}
        .vid-desc{font-size:13px;font-weight:500;color:#334155;line-height:1.55;max-width:300px}
        .vid-subcat{display:inline-block;background:#f1f5f9;color:#475569;font-size:10px;font-weight:600;padding:2px 7px;border-radius:20px;border:1px solid #e2e8f0;white-space:nowrap}
        .vid-qty-badge{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;background:#f1f5f9;color:#475569;font-size:12px;font-weight:700}
        .vid-misc-note{color:#d97706;font-style:italic;font-size:11px;border-bottom:1px dashed #fcd34d;cursor:help}
        .vid-cat-sub td{padding:7px 16px 9px;background:#f8fafc;border-bottom:2px solid #e8ecf2}

        .vid-foot{display:grid;grid-template-columns:1fr 310px;gap:32px;padding:28px 40px;border-top:2px solid #f0f4f8;align-items:start}
        .vid-sum-title{font-size:10px;font-weight:800;letter-spacing:.12em;color:#94a3b8;text-transform:uppercase;margin-bottom:14px}
        .vid-sum-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px}
        .vid-sum-item{display:flex;flex-direction:column;gap:2px}
        .vid-sum-lbl{font-size:11px;color:#94a3b8;font-weight:500}
        .vid-sum-val{font-size:13px;font-weight:700;color:#1e293b}

        .vid-tbox{background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:14px;padding:20px 22px}
        .vid-tbox-title{font-size:10px;font-weight:800;letter-spacing:.12em;color:#94a3b8;text-transform:uppercase;margin-bottom:14px}
        .vid-trow{display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:13px;color:#475569;font-weight:500}
        .vid-trow--disc{color:#ea580c}
        .vid-tdiv{border:none;border-top:1.5px solid #e2e8f0;margin:11px 0}
        .vid-grand{display:flex;justify-content:space-between;align-items:baseline;font-size:19px;font-weight:900;color:#0f766e;letter-spacing:-.02em}
        .vid-words{margin-top:8px;padding-top:8px;border-top:1px dashed #e2e8f0;font-size:10.5px;line-height:1.55;color:#64748b;font-style:italic}

        .vid-dl-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-top:12px;padding:11px;background:#0f766e;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;transition:background .15s,transform .1s}
        .vid-dl-btn:hover{background:#0d6460}
        .vid-dl-btn:disabled{opacity:.6;cursor:not-allowed}
        .vid-doc-foot{display:flex;justify-content:space-between;align-items:center;padding:14px 40px;background:#f8fafc;border-top:1.5px solid #e8ecf2;font-size:11px;color:#94a3b8}

        @media(max-width:700px){
          .vid-hdr{flex-direction:column;padding:22px 20px}
          .vid-meta{padding:12px 20px}
          .vid-meta-sep{display:none}
          .vid-parties{grid-template-columns:1fr;padding:20px;gap:16px}
          .vid-arrow-col{display:none}
          .vid-party--proj,.vid-party--rates{padding-left:0}
          .vid-party--rates{border-left:none;border-top:1.5px solid #f0f4f8;padding-top:16px}
          .vid-body-wrap,.vid-foot{grid-template-columns:1fr;padding:16px 20px}
          .vid-body-right{position:static}
          .vid-hdr-r{text-align:left;margin-top:16px}
          .vid-doc-num{font-size:16px}
          .vid-grand{font-size:16px}
          .vid-actions{gap:6px}
        }
      `}</style>

      <div className="vid-root">

        {/* ── Top bar ── */}
        <div className="vid-topbar">
          <button className="vid-back" onClick={() => navigate('/invoices')}>
            <ArrowLeft size={15} /> Back to Invoices
          </button>
          <div className="vid-actions">
            {/* Track Payment — red */}
            <button className="vid-btn-track" title="Track payment for this invoice" onClick={() => navigate(`/invoices/${id}/track-payment`)}>
              <DollarSign size={14} /> Track Payment
            </button>
            {/* Send to Client */}
            <button className="vid-btn-o" onClick={() => setSendModal(true)}>
              <Mail size={14} /> Send to Client
            </button>
            {/* Download Invoice */}
            <button className="vid-btn-p" onClick={handleDownload} disabled={pdfLoading}>
              {pdfLoading ? <><Loader2 size={14} className="vid-spin" /> Generating…</> : <><Download size={14} /> Download Invoice</>}
            </button>
            {/* Coming soon — solid slate buttons, not clickable */}
            <button className="vid-btn-soon"><Briefcase size={14} /> Proceed to Work Order</button>
            {/* Create Purchase Order — visible only for client invoices (not vendor/Purchase Order invoices) */}
            {!isVendorInvoice && (
              <button 
                className="vid-btn-p" 
                onClick={handleOpenCreatePOModal}
                title="Create a purchase order for this invoice"
              >
                <ShoppingCart size={14} /> Create Purchase Order
              </button>
            )}
            <button className="vid-btn-soon"><Users size={14} /> Create Vendor</button>
          </div>
        </div>

        {/* ── Document card ── */}
        <div className={`vid-doc${visible ? ' in' : ''}`}>

          {/* ══════════ HEADER ══════════ */}
          <div className="vid-hdr">
            <div className="vid-hdr-l">
              <div className="vid-logo">
                <div className="vid-logo-badge">ERP</div>
                <div>
                  <div className="vid-co-name">ERP System</div>
                  <div className="vid-co-sub">Professional Services</div>
                </div>
              </div>
              <StatusPill status={status} />
            </div>
            <div className="vid-hdr-r">
              <div className="vid-doc-label">Tax Invoice</div>
              <div className="vid-doc-num">{invNum}</div>
              <div className="vid-doc-date">Issued {fmtDate(invoice.issue_date || invoice.created_at)}</div>
              {invoice.valid_until && (
                <div className="vid-doc-date">Valid until {fmtDate(invoice.valid_until)}</div>
              )}
            </div>
          </div>

          {/* ══════════ META STRIP ══════════ */}
          <div className="vid-meta">
            <MetaBlock icon={Calendar} label="Issue Date"  value={fmtDate(invoice.issue_date || invoice.created_at)} />
            <div className="vid-meta-sep" />
            <MetaBlock icon={Calendar} label="Valid Until" value={fmtDate(invoice.valid_until)} />
            <div className="vid-meta-sep" />
            <MetaBlock icon={Tag}      label="SAC Code"    value={invoice.sac_code} accent />
            <div className="vid-meta-sep" />
            <MetaBlock icon={Hash}     label="Invoice No." value={invNum} accent />
            {createdByName && (
              <>
                <div className="vid-meta-sep" />
                <MetaBlock icon={User} label="Prepared By" value={createdByName} />
              </>
            )}
          </div>

          {/* ══════════ PARTIES ══════════ */}
          <div className="vid-parties">
            <div className="vid-party">
              <div className="vid-plabel">{isVendorInvoice ? 'Vendor' : 'Billed To'}</div>
              <div className="vid-pavatar" style={isVendorInvoice ? { background: 'linear-gradient(135deg,#0d9488,#0f766e)' } : {}}>
                {(billedToName && billedToName !== '—' ? billedToName : isVendorInvoice ? 'V' : '?').charAt(0).toUpperCase()}
              </div>
              <div className="vid-pname">{billedToName}</div>
              {isVendorInvoice ? (
                <>
                  {/* Vendor ID hidden from UI but preserved in DOM for track payment & other functionality */}
                  {invoice.vendor && (
                    <div style={{ display: 'none' }} data-vendor-id={invoice.vendor} />
                  )}
                  <div className="vid-pdetail" style={{ marginTop: 3 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, background: '#f0fdf4', color: '#0f766e', border: '1px solid #6ee7b7', borderRadius: 20, padding: '3px 9px 3px 7px' }}>
                      <Truck size={11} style={{ color: '#0f766e', flexShrink: 0 }} />
                      Purchase Order Invoice
                    </span>
                  </div>
                </>
              ) : (
                <>
                  {client?.email && <div className="vid-pdetail"><User  size={11} style={{ opacity: .45, flexShrink: 0 }} />{client.email}</div>}
                </>
              )}
            </div>
            <div className="vid-arrow-col"><ChevronRight size={16} style={{ color: '#cbd5e1' }} /></div>
            <div className="vid-party vid-party--proj">
              <div className="vid-plabel">Project</div>
              <div className="vid-picon"><Building2 size={20} color="#0f766e" /></div>
              <div className="vid-pname">{projName}</div>
              {projLoc && <div className="vid-pdetail"><MapPin size={11} style={{ opacity: .45, flexShrink: 0 }} />{projLoc}</div>}
              {invoice.proforma && (
                <div className="vid-pdetail"><FileText size={11} style={{ opacity: .45, flexShrink: 0 }} /><span>Proforma #{invoice.proforma}</span></div>
              )}
            </div>
            <div className="vid-party vid-party--rates">
              <div className="vid-plabel">Applied Rates</div>
              <div className="vid-rates-list">
                <div className="vid-rate-row">
                  <div className="vid-rate-icon" style={{ background: '#eff6ff' }}><Percent size={14} color="#2563eb" /></div>
                  <div><div className="vid-rate-v">{gstRate}%</div><div className="vid-rate-l">GST Rate</div></div>
                </div>
                <div className="vid-rate-row">
                  <div className="vid-rate-icon" style={{ background: discRate > 0 ? '#fff7ed' : '#f8fafc' }}>
                    <Tag size={14} color={discRate > 0 ? '#ea580c' : '#94a3b8'} />
                  </div>
                  <div>
                    <div className="vid-rate-v" style={{ color: discRate > 0 ? '#ea580c' : '#64748b' }}>{discRate > 0 ? `${discRate}%` : 'Nil'}</div>
                    <div className="vid-rate-l">Discount</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════ TWO-COLUMN BODY ══════════ */}
          <div className="vid-body-wrap">

            {/* LEFT: Line Items */}
            <div className="vid-body-left">
              {/* ══════════ INVOICE TYPE INDICATOR ══════════ */}
              {invoice.invoice_type && (
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
                    Invoice Type
                  </span>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#059669',
                  }}>
                    {invoice.invoice_type}
                  </span>
                </div>
              )}

              <div className="vid-sec-hdr">
                <FileText size={15} color="#0f766e" />
                Services &amp; Compliance Items
                <span className="vid-sec-badge">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
              </div>

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
                        <th style={{ width: 44, textAlign: 'center' }}>Qty</th>
                        <th style={{ width: 115, textAlign: 'right' }}>Professional</th>
                        <th style={{ width: 130, textAlign: 'right' }}>Miscellaneous</th>
                        <th style={{ width: 115, textAlign: 'right' }}>Item Total</th>
                      </tr>
                    </thead>
                    {groups.map((grp, gi) => {
                      const grpTotal = grp.items.reduce((s, it) => s + calcItemTotal(it), 0);
                      return (
                        <tbody key={gi}>
                          <tr className="vid-cat-row">
                            <td colSpan={7}>
                              <div className="vid-cat-inner">
                                <span className="vid-cat-dot" />
                                {grp.catName}
                                <span className="vid-cat-cnt">{grp.items.length} item{grp.items.length !== 1 ? 's' : ''}</span>
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
                              <tr key={ii} className="vid-row">
                                <td style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#d1d5db' }}>{ii + 1}</td>
                                <td><div className="vid-desc">{item.description || '—'}</div></td>
                                <td>{subCat ? <span className="vid-subcat">{subCat.name}</span> : <span style={{ color: '#e2e8f0', fontSize: 12 }}>—</span>}</td>
                                <td style={{ textAlign: 'center' }}><span className="vid-qty-badge">{qty}</span></td>
                                <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b', fontSize: 13 }}>₹&nbsp;{fmtINR(prof)}</td>
                                <td style={{ textAlign: 'right', fontSize: 12 }}>
                                  {miscStr
                                    ? isMiscNumeric(miscStr)
                                      ? <span style={{ color: '#475569', fontWeight: 600 }}>₹&nbsp;{fmtINR(parseFloat(miscStr))}</span>
                                      : <span className="vid-misc-note" title="Note — not in total">{miscStr}</span>
                                    : <span style={{ color: '#e2e8f0' }}>—</span>}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 800, color: '#1e293b', fontSize: 13 }}>₹&nbsp;{fmtINR(total)}</td>
                              </tr>
                            );
                          })}
                          <tr className="vid-cat-sub">
                            <td colSpan={6} style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', fontStyle: 'italic', paddingRight: 14 }}>{grp.catName} subtotal</td>
                            <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 13, color: '#0f766e', paddingRight: 4 }}>₹&nbsp;{fmtINR(grpTotal)}</td>
                          </tr>
                        </tbody>
                      );
                    })}
                  </table>
                )}
              </div>
            </div>

            {/* RIGHT: Quick Info Card */}
            <div className="vid-body-right">
              <QuickInfoCard invoice={invoice} client={client} project={project} />
            </div>
          </div>

          {/* ══════════ FOOTER: SUMMARY + TOTALS ══════════ */}
          <div className="vid-foot">
            <div>
              <div className="vid-sum-title">Invoice Summary</div>
              <div className="vid-sum-grid">
                <div className="vid-sum-item"><span className="vid-sum-lbl">Total Items</span><span className="vid-sum-val">{items.length}</span></div>
                <div className="vid-sum-item"><span className="vid-sum-lbl">Total Quantity</span><span className="vid-sum-val">{totalQty}</span></div>
                <div className="vid-sum-item"><span className="vid-sum-lbl">Compliance Groups</span><span className="vid-sum-val">{groups.length}</span></div>
                <div className="vid-sum-item"><span className="vid-sum-lbl">SAC Code</span><span className="vid-sum-val" style={{ color: '#0f766e', fontFamily: 'monospace' }}>{invoice.sac_code || '—'}</span></div>
                <div className="vid-sum-item"><span className="vid-sum-lbl">Status</span><span><StatusPill status={status} /></span></div>
                {createdByName && <div className="vid-sum-item"><span className="vid-sum-lbl">Prepared By</span><span className="vid-sum-val">{createdByName}</span></div>}
              </div>
              {invoice.notes && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 6 }}>Notes</div>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{invoice.notes}</p>
                </div>
              )}
            </div>

            {/* Totals */}
            <div>
              <div className="vid-tbox">
                <div className="vid-tbox-title">Amount Due</div>
                <div className="vid-trow"><span>Subtotal</span><span style={{ fontWeight: 700, color: '#1e293b' }}>₹&nbsp;{fmtINR(subtotal)}</span></div>
                {discAmt > 0 && <>
                  <div className="vid-trow vid-trow--disc"><span>Discount ({discRate}%)</span><span style={{ fontWeight: 700 }}>−&nbsp;₹&nbsp;{fmtINR(discAmt)}</span></div>
                  <div className="vid-trow" style={{ color: '#94a3b8', fontSize: 12 }}><span>Taxable Amount</span><span>₹&nbsp;{fmtINR(taxable)}</span></div>
                </>}
                {gstAmt > 0 && <div className="vid-trow"><span>GST ({gstRate}%)</span><span style={{ fontWeight: 700, color: '#1e293b' }}>+&nbsp;₹&nbsp;{fmtINR(gstAmt)}</span></div>}
                <hr className="vid-tdiv" />
                <div className="vid-grand"><span>Grand Total</span><span>₹&nbsp;{fmtINR(grandTotal)}</span></div>
                <div className="vid-words"><strong style={{ color: '#94a3b8', fontStyle: 'normal' }}>In words: </strong>{numberToWords(grandTotal)} Rupees only</div>
              </div>
              <button className="vid-dl-btn" onClick={handleDownload} disabled={pdfLoading}>
                {pdfLoading ? <><Loader2 size={15} className="vid-spin" /> Generating PDF…</> : <><Download size={15} /> Download Invoice</>}
              </button>
            </div>
          </div>

          {/* ══════════ DOC FOOTER ══════════ */}
          <div className="vid-doc-foot">
            <span>This is a system-generated invoice.</span>
            <span>{invNum}&nbsp;·&nbsp;{fmtDate(invoice.issue_date || invoice.created_at)}</span>
          </div>

        </div>{/* end .vid-doc */}
      </div>{/* end .vid-root */}

      {/* ══════════ SEND TO CLIENT MODAL ══════════ */}
      {sendModal && (
        <SendToClientModal
          invoice={invoice}
          client={client}
          invNum={invNum}
          issuedDate={fmtDate(invoice.issue_date || invoice.created_at)}
          onClose={() => setSendModal(false)}
        />
      )}

      {/* ═══════════ CREATE PURCHASE ORDER MODAL ═══════════ */}
      {showCreatePOModal && (() => {
        const avatarColors  = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-orange-500','bg-rose-500','bg-cyan-500','bg-amber-500','bg-indigo-500'];
        const getAvatarColor = (id) => avatarColors[(id || 0) % avatarColors.length];
        const prefilledProjectName = project
          ? (project.name || project.title || `Project #${project.id}`)
          : (invoice.project_name || `Project #${invoice.project}`);
        const filteredVendors = poVendors.filter((v) => {
          const name  = (v.name || v.company_name || '').toLowerCase();
          const email = (v.email || '').toLowerCase();
          return name.includes(poVendorSearch.toLowerCase()) || email.includes(poVendorSearch.toLowerCase());
        });

        return (
          <div className="fixed inset-0 z-[9999] animate-po-fadeIn" style={{ position: 'fixed', overflow: 'hidden' }}>
            <div
              className="absolute inset-0 bg-black/50"
              style={{ position: 'fixed', width: '100vw', height: '100vh' }}
              onClick={handleCloseCreatePOModal}
            />
            <div className="relative z-10 flex items-center justify-center min-h-screen p-4" style={{ height: '100vh' }}>
              <div
                className="relative w-full max-w-md overflow-hidden animate-po-scaleIn"
                style={{ borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* ── Header — teal, exact copy from purchase.jsx ── */}
                <div className="bg-teal-700 px-6 py-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                        <FileText size={18} className="text-white" />
                      </div>
                      <div>
                        <p className="text-white font-semibold text-base leading-tight">Create Purchase Order</p>
                        <p className="text-teal-200 text-xs mt-0.5">Select a vendor to continue</p>
                      </div>
                    </div>
                    <button
                      onClick={handleCloseCreatePOModal}
                      className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    >
                      <X size={16} className="text-white" />
                    </button>
                  </div>

                  {/* Progress bar — single filled step */}
                  <div className="flex gap-2">
                    <div className="flex-1 h-1 rounded-full bg-white/40" />
                    <div className="flex-1 h-1 rounded-full bg-white/40" />
                  </div>

                  {/* Step labels */}
                  <div className="flex justify-between mt-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-white text-teal-700">1</div>
                      <span className="text-xs font-medium text-white">Select Vendor</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-teal-300/60">Project (pre-selected)</span>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-white/20 text-teal-300/60">✓</div>
                    </div>
                  </div>
                </div>

                {/* ── Body ── */}
                <div className="bg-white" style={{ minHeight: '340px' }}>
                  <div className="p-5">

                    {/* Project locked chip */}
                    <div className="flex items-center gap-2.5 mb-5 px-3 py-2.5 bg-teal-50 rounded-xl border border-teal-200/80">
                      <div className="w-8 h-8 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Building2 size={14} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-0.5">Project (pre-selected)</p>
                        <p className="text-sm font-semibold text-teal-900 truncate">{prefilledProjectName}</p>
                      </div>
                      <span className="text-xs bg-teal-600 text-white px-2 py-0.5 rounded-full font-medium flex-shrink-0">Locked</span>
                    </div>

                    <p className="text-sm font-semibold text-gray-700 mb-0.5">Choose a Vendor</p>
                    <p className="text-xs text-gray-400 mb-4">Select the vendor this purchase order is for</p>

                    {poSelectedVendor && (
                      <div className="mb-3 flex items-center justify-between px-3 py-2.5 bg-teal-50 rounded-xl border border-teal-200/80">
                        <div className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-teal-600 flex-shrink-0" />
                          <span className="text-sm font-semibold text-teal-800">{poSelectedVendor.name || poSelectedVendor.company_name}</span>
                        </div>
                        <button onClick={() => setPoSelectedVendor(null)} className="text-xs text-teal-500 hover:text-teal-700 font-medium transition-colors">Clear</button>
                      </div>
                    )}

                    <div className="relative mb-3">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={poVendorSearch}
                        onChange={(e) => setPoVendorSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 text-sm text-gray-700 placeholder-gray-400 transition-all"
                      />
                    </div>

                    <div className="overflow-y-auto rounded-xl border border-gray-200 bg-white" style={{ maxHeight: '220px' }}>
                      {poVendorsLoading ? (
                        <div className="flex items-center justify-center py-10">
                          <Loader2 size={24} className="text-teal-500 animate-spin" />
                        </div>
                      ) : filteredVendors.length > 0 ? (
                        filteredVendors.map((vendor) => {
                          const isSelected = poSelectedVendor?.id === vendor.id;
                          const vendorName = vendor.name || vendor.company_name || 'Vendor';
                          return (
                            <div
                              key={vendor.id}
                              onClick={() => setPoSelectedVendor(vendor)}
                              className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${isSelected ? 'bg-teal-50' : 'hover:bg-gray-50'}`}
                            >
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 ${isSelected ? 'bg-teal-600' : getAvatarColor(vendor.id)}`}>
                                {(vendorName[0] || '').toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold truncate transition-colors ${isSelected ? 'text-teal-800' : 'text-gray-800'}`}>{vendorName}</p>
                                <p className="text-xs text-gray-400 truncate">{vendor.email || ''}</p>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-teal-600 border-teal-600' : 'border-gray-300'}`}>
                                {isSelected && (
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-10 text-center">
                          <User size={32} className="text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">No vendors found</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Footer ── */}
                <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
                  <button
                    onClick={handleCloseCreatePOModal}
                    className="px-4 py-2.5 text-slate-600 hover:bg-gray-100 rounded-xl transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreatePO}
                    disabled={!poSelectedVendor}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${poSelectedVendor ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                  >
                    Create Purchase Order →
                  </button>
                </div>
              </div>
            </div>

            <style>{`
              @keyframes po-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
              @keyframes po-scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
              .animate-po-fadeIn  { animation: po-fadeIn  0.2s ease-out; }
              .animate-po-scaleIn { animation: po-scaleIn 0.3s cubic-bezier(0.16,1,0.3,1); }
            `}</style>
          </div>
        );
      })()}

    </>
  );
}