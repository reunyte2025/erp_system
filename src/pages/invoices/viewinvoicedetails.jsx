import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Download, Loader2, AlertCircle,
  CheckCircle, Clock, Send, FileText, XCircle,
  Building2, User, MapPin, Hash, Calendar,
  Tag, Percent, ChevronRight, Mail, Receipt,
  Briefcase, ShoppingCart, Users, X, Paperclip, Truck,
  DollarSign, FileEdit, ChevronDown, Search, FileSearch,
} from 'lucide-react';
import {
  getInvoiceById,
  getInvoices,
  getRegulatoryInvoiceById,
  getExecutionInvoiceById,
  getPurchaseOrderInvoiceById,
  generateConstructiveInvoicePdf,
  generateOtherCompanyInvoicePdf,
  generatePaymentReceivedPdf,
  cancelInvoice,
  CONSTRUCTIVE_INDIA_COMPANY_ID,
} from '../../services/invoices';
import { getQuotationById, getQuotationCompanyName } from '../../services/quotation';
import { getPurchaseOrderById } from '../../services/purchase';
import { getClientById } from '../../services/clients';
import { getProjects } from '../../services/projects';
import { getVendors, getVendorById } from '../../services/vendors';
import { useRole } from '../../components/RoleContext';
import api from '../../services/api';
import Notes from '../../components/Notes';
import { NOTE_ENTITY } from '../../services/notes';
import InvoiceTypeTable from './InvoiceTypeTable';
import {
  fmtInvNum,
  fmtINR,
  fmtDate,
  groupItemsByCategory,
  calcItemUnitAmount,
  numberToWords,
  normalizeInvoiceType,
  detectInvoiceTypeFromData,
} from '../../services/invoiceHelpers';

// ─── Status config (with Lucide Icon refs — kept here because invoiceHelpers.js is zero-React) ──

const STATUS_CONFIG = {
  '1':                 { label: 'Draft',             Icon: FileText,    color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  '2':                 { label: 'Under Review',       Icon: Clock,       color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  '3':                 { label: 'In Progress',        Icon: Clock,       color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  '4':                 { label: 'Placed Work-order',  Icon: CheckCircle, color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  '5':                 { label: 'Failed',             Icon: XCircle,     color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  '6':                 { label: 'Cancelled',          Icon: XCircle,     color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  'draft':             { label: 'Draft',             Icon: FileText,    color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  'under_review':      { label: 'Under Review',       Icon: Clock,       color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  'in_progress':       { label: 'In Progress',        Icon: Clock,       color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  'placed_work_order': { label: 'Placed Work-order',  Icon: CheckCircle, color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  'verified':          { label: 'Verified',           Icon: CheckCircle, color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  'failed':            { label: 'Failed',             Icon: XCircle,     color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  'pending':           { label: 'Pending',            Icon: Clock,       color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  'cancelled':         { label: 'Cancelled',          Icon: XCircle,     color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  'canceled':          { label: 'Cancelled',          Icon: XCircle,     color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
};

// Local getStatus override that also resolves Lucide Icon refs
const getStatusWithIcon = (s) => {
  const key = String(s || '');
  const lower = key.toLowerCase();
  return STATUS_CONFIG[key] || STATUS_CONFIG[lower] || STATUS_CONFIG['1'];
};

// ─── Sub-components ──────────────────────────────────────────────────────────────

const StatusPill = ({ status }) => {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: status.color, background: status.bg, border: `1px solid ${status.border}`, fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 20 }}>
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

const QuickInfoCard = ({ invoice, client, project, isPurchaseOrder }) => {
  const [activeTab, setActiveTab] = useState('info');

  const clientDisplayName = isPurchaseOrder
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
              <span style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '.1em' }}>
                {isPurchaseOrder ? 'Vendor' : 'Billed To'}
              </span>
            </div>
            <div style={{ padding: '10px 12px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{clientDisplayName}</div>
              {!isPurchaseOrder && client?.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b', marginBottom: 3 }}>
                  <Mail size={10} style={{ flexShrink: 0 }} /> {client.email}
                </div>
              )}
              {!isPurchaseOrder && client?.phone_number && (
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

const SendToClientModal = ({ client, invNum, issuedDate, onClose }) => {
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
  const location = useLocation();

  // Role-based access
  const { isAdmin, isManager } = useRole();
  const isPrivileged = isAdmin || (isManager ?? false);

  const [invoice,       setInvoice]       = useState(null);
  const [client,        setClient]        = useState(null);
  const [project,       setProject]       = useState(null);
  const [createdByName, setCreatedByName] = useState('');
  const [loading,       setLoading]       = useState(true);
  const [fetchError,    setFetchError]    = useState('');
  // ── Invoice PDF modal (Download Invoice) ─────────────────────────────────
  const [pdfLoading,          setPdfLoading]          = useState(false);
  const [showPdfModal,        setShowPdfModal]        = useState(false);
  const [pdfError,            setPdfError]            = useState('');
  // Shared form fields across both invoice PDF modals
  const [pdfForm, setPdfForm] = useState({
    company_name: '', address: '', gst_no: '', state: '', sac_code: '',
    code: '', invoice_number: '', invoice_date: '', work_order_date: '',
    valid_from: '', valid_till: '', vendor_code: '', po_no: '',
    schedule_date: '', scope_of_work: '',
  });
  const [pdfFormErrors, setPdfFormErrors] = useState({});
  // Item checklist: { [itemKey]: { selected: bool, quantity: number } }
  const [pdfItemSelections, setPdfItemSelections] = useState({});

  // ── Payment Received PDF modal ────────────────────────────────────────────
  const [showPaymentPdfModal,   setShowPaymentPdfModal]   = useState(false);
  const [paymentPdfLoading,     setPaymentPdfLoading]     = useState(false);
  const [paymentPdfError,       setPaymentPdfError]       = useState('');
  const [paymentPdfForm, setPaymentPdfForm] = useState({
    invoice_number: '', company_name: '', address: '', gst_no: '',
    state: '', sac_code: '', po_no: '', schedule_date: '',
    scope_of_work: '', received_amount: '',
  });
  const [paymentPdfFormErrors, setPaymentPdfFormErrors] = useState({});
  const [visible,       setVisible]       = useState(false);
  const [sendModal,     setSendModal]     = useState(false);

  // Cancel state
  const [showCancelModal,  setShowCancelModal]  = useState(false);
  const [cancelLoading,    setCancelLoading]    = useState(false);
  const [cancelError,      setCancelError]      = useState('');
  const [cancelSuccess,    setCancelSuccess]    = useState(false);

  // Create Purchase Order Modal state
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [poVendors,         setPoVendors]         = useState([]);
  const [poVendorsLoading,  setPoVendorsLoading]  = useState(false);
  const [poSelectedVendor,  setPoSelectedVendor]  = useState(null);
  const [poVendorSearch,    setPoVendorSearch]    = useState('');
  const preferredInvoiceType = normalizeInvoiceType(
    location.state?.invoiceType || location.state?.invoiceData?.invoice_type
  );

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
    setVisible(false);
    setClient(null);
    setProject(null);
    setCreatedByName('');
    try {
      /**
       * tryTypedEndpoint: call one endpoint, return { data, type } or null.
       *
       * CRITICAL VALIDATION — why we re-detect after fetching:
       *   The backend returns HTTP 200 from ALL three invoice endpoints for ANY
       *   valid invoice ID, but with different (sometimes wrong) invoice_type
       *   strings. E.g. /get_purchase_order_invoice/?id=36 returns the execution
       *   invoice data with invoice_type="Vendor Compliance" and vendor=null.
       *
       *   We use detectInvoiceTypeFromData() which does STRUCTURAL validation
       *   (vendor non-null → vendor, client non-null + rate breakdown → execution)
       *   to check whether the endpoint actually owns this invoice.
       *
       *   Accept the result only when:
       *     a) detectedType matches endpointType (the endpoint owns this invoice), OR
       *     b) detectedType is empty (can't determine structurally — trust the endpoint)
       */
      const tryTypedEndpoint = async (fetchFn, endpointType) => {
        try {
          const response = await fetchFn(id);
          const data = response?.data || response;
          if (!data || (!data.id && !data.invoice_number)) return null;

          const detectedType = detectInvoiceTypeFromData(data);

          // Structural mismatch — this endpoint doesn't own the invoice.
          // E.g. /get_purchase_order_invoice/ returned data but structural
          // check says it's an execution invoice (client non-null, has rates).
          if (detectedType && detectedType !== endpointType) return null;

          return { data, type: endpointType };
        } catch {
          return null;
        }
      };

      const endpointMap = {
        regulatory: { fetchFn: getRegulatoryInvoiceById, type: 'regulatory' },
        execution:  { fetchFn: getExecutionInvoiceById,  type: 'execution' },
        vendor:     { fetchFn: getPurchaseOrderInvoiceById, type: 'vendor' },
      };

      let listInvoiceData = location.state?.invoiceData || null;
      let listInvoiceType = '';

      if (!preferredInvoiceType) {
        if (!listInvoiceData || String(listInvoiceData.id || '') !== String(id)) {
          try {
            const listRes = await getInvoices({ page: 1, page_size: 1000 });
            const listRows = listRes?.data?.results || listRes?.results || [];
            listInvoiceData = listRows.find((row) => String(row.id) === String(id)) || listInvoiceData;
          } catch {
            // Endpoint cascade below remains the final source of truth.
          }
        }
        listInvoiceType = normalizeInvoiceType(listInvoiceData?.invoice_type) ||
          ((listInvoiceData?.vendor || listInvoiceData?.vendor_name || listInvoiceData?.quotation) ? 'vendor' : '');
      }

      /**
       * Trial order strategy:
       *
       * 1. If we have a preferredInvoiceType hint (from location.state), try
       *    that endpoint FIRST — it's the cheapest and most accurate path.
       *
       * 2. Default fallback order: regulatory → execution → vendor
       *    (NOT vendor-first, because /get_purchase_order_invoice/ responds to
       *    ALL invoice IDs and may return misleading data for client invoices)
       */
      const defaultOrder = ['regulatory', 'execution', 'vendor'];
      const hintedInvoiceType = preferredInvoiceType || listInvoiceType;
      const orderedTypes = hintedInvoiceType
        ? [hintedInvoiceType, ...defaultOrder.filter(t => t !== hintedInvoiceType)]
        : defaultOrder;

      const orderedEndpoints = orderedTypes.map(t => endpointMap[t]).filter(Boolean);

      let result = null;

      for (const endpoint of orderedEndpoints) {
        result = await tryTypedEndpoint(endpoint.fetchFn, endpoint.type);
        if (result) break; // structural validation passed — accept this result
      }

      // Ultimate fallback: use getInvoiceById (regulatory → execution → vendor cascade)
      if (!result) {
        const res = await getInvoiceById(id);
        if (res.status !== 'success' || !res.data) throw new Error('Failed to load invoice');
        result = {
          data: res.data,
          type: detectInvoiceTypeFromData(res.data),
        };
      }

      const inv = { ...(listInvoiceData || {}), ...result.data };
      inv.invoice_type = inv.invoice_type || result.type;
      setInvoice(inv);

      // ── Determine invoice kind from response shape ───────────────────────────
      // PO (vendor) invoices have a `vendor` field; client invoices have `client`.
      const resolvedInvoiceType = preferredInvoiceType || listInvoiceType || detectInvoiceTypeFromData(inv) || result.type;
      const isPoInvoice = resolvedInvoiceType === 'vendor';

      // ── Load project ─────────────────────────────────────────────────────────
      const resolvedProjectId = inv.project || null;
      if (resolvedProjectId) {
        try {
          const pr  = await getProjects({ page: 1, page_size: 500 });
          const all = pr?.data?.results || pr?.results || [];
          const found = all.find(proj => String(proj.id) === String(resolvedProjectId));
          if (found) setProject(found);
        } catch { /* project details are optional */ }
      }

      if (isPoInvoice) {
        // PO invoices: vendor name is usually embedded as vendor_name.
        // If missing (e.g. navigated without location.state), resolve it by fetching the vendor by ID.
        if (!inv.vendor_name && inv.vendor) {
          try {
            const vendorRes = await getVendorById(inv.vendor);
            // getVendorById returns { status, data } or the object directly
            const vendorData = vendorRes?.data || vendorRes;
            if (vendorData?.name) {
              inv.vendor_name = vendorData.name;
              setInvoice({ ...inv });
            }
          } catch {
            // Fallback: try from paginated list
            try {
              const listRes = await getVendors({ page: 1, page_size: 500 });
              const allVendors = listRes?.data?.results || listRes?.results || [];
              const found = allVendors.find(v => String(v.id) === String(inv.vendor));
              if (found?.name) {
                inv.vendor_name = found.name;
                setInvoice({ ...inv });
              }
            } catch { /* silently ignore — billedToName will fall back to "Vendor #ID" */ }
          }
        }

        if ((!inv.vendor_name || !inv.vendor) && inv.quotation) {
          try {
            const poRes = await getPurchaseOrderById(inv.quotation);
            const poData = poRes?.data || poRes;
            if (poData) {
              inv.vendor = inv.vendor || poData.vendor;
              inv.vendor_name = inv.vendor_name || poData.vendor_name;
              inv.project = inv.project || poData.project;
              inv.project_name = inv.project_name || poData.project_name;
              setInvoice({ ...inv });
            }
          } catch {
            // Some older invoices may not keep a quotation/PO link.
          }
        }
      } else {
        // ── Client invoices: resolve client ID ─────────────────────────────────
        // When invoice is generated from quotation, backend may not populate:
        //   inv.client, inv.client_name, inv.project, inv.quotation
        // Strategy:
        //   1. Use inv.client if present
        //   2. If inv.quotation is populated, fetch that quotation
        //   3. If not, find the quotation by matching trailing digits of invoice_number
        let resolvedClientId = inv.client || null;

        if (!resolvedClientId) {
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

          if (quotationData?.client) resolvedClientId = quotationData.client;
        }

        // ── Load client ────────────────────────────────────────────────────────
        if (resolvedClientId) {
          try {
            const cr = await getClientById(resolvedClientId);
            if (cr.status === 'success' && cr.data) setClient(cr.data);
          } catch { /* quotation details are optional */ }
        }
      }

      // ── Load created-by name ────────────────────────────────────────────────
      if (inv.created_by) {
        try {
          const ur = await api.get('/users/get_user/', { params: { id: inv.created_by } });
          if (ur.data?.status === 'success' && ur.data?.data) {
            const u = ur.data.data;
            setCreatedByName(`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || '');
          }
        } catch { /* client details are optional */ }
      }

      setTimeout(() => setVisible(true), 60);
    } catch (e) {
      setFetchError(e.message || 'Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  }, [id, preferredInvoiceType, location.state]);

  useEffect(() => { fetchData(); window.scrollTo(0, 0); }, [fetchData]);

  /**
   * Open the Download Invoice PDF modal.
   * Pre-fills form fields from invoice data and initialises the item checklist.
   * Company ID 1 (Constructive India) → constructive endpoint (extra fields + items).
   * Company ID 2/3/4 → other-company endpoint (fewer fields + items).
   */
  const handleDownload = () => {
    // Pre-fill shared form from invoice data
    const today = new Date().toISOString().split('T')[0];
    setPdfForm({
      company_name:   invoice?.company_name  || '',
      address:        invoice?.address       || '',
      gst_no:         invoice?.gst_no        || '',
      state:          invoice?.state         || '',
      sac_code:       invoice?.sac_code      || '',
      code:           invoice?.code          || '',
      invoice_number: invoice?.invoice_number || '',
      invoice_date:   invoice?.issue_date    ? invoice.issue_date.split('T')[0] : today,
      work_order_date: invoice?.work_order_date ? invoice.work_order_date.split('T')[0] : today,
      valid_from:     invoice?.valid_from    ? invoice.valid_from.split('T')[0]  : today,
      valid_till:     invoice?.valid_until   ? invoice.valid_until.split('T')[0] : today,
      vendor_code:    invoice?.vendor_code   || '',
      po_no:          invoice?.po_no         || '',
      schedule_date:  invoice?.schedule_date ? invoice.schedule_date.split('T')[0] : today,
      scope_of_work:  '',
    });
    setPdfFormErrors({});
    // Initialise item checklist — all selected, quantity = item's actual quantity
    const initSelections = {};
    (invoice?.items || []).forEach((item, idx) => {
      const key = item.id != null ? String(item.id) : `idx_${idx}`;
      initSelections[key] = {
        selected: true,
        quantity: parseInt(item.quantity) || 1,
        maxQty:   parseInt(item.quantity) || 1,
        item,
        idx,
      };
    });
    setPdfItemSelections(initSelections);
    setPdfError('');
    setShowPdfModal(true);
  };

  /** Validate and submit invoice PDF download (constructive or other-company) */
  const handleConfirmPdfDownload = async () => {
    const errors = {};
    if (!pdfForm.scope_of_work?.trim()) errors.scope_of_work = 'Scope of work is required.';
    if (!pdfForm.schedule_date)         errors.schedule_date  = 'Schedule date is required.';
    // Constructive India extra validations
    const companyId = parseInt(invoice?.company) || 0;
    const isConstructive = companyId === CONSTRUCTIVE_INDIA_COMPANY_ID;
    if (isConstructive) {
      if (!pdfForm.invoice_date)    errors.invoice_date    = 'Invoice date is required.';
      if (!pdfForm.work_order_date) errors.work_order_date = 'Work order date is required.';
      if (!pdfForm.valid_from)      errors.valid_from      = 'Valid from is required.';
      if (!pdfForm.valid_till)      errors.valid_till      = 'Valid till is required.';
    }
    if (Object.keys(errors).length > 0) { setPdfFormErrors(errors); return; }

    // Build items array from selected checklist rows
    const selectedItems = Object.values(pdfItemSelections)
      .filter(sel => sel.selected)
      .map(sel => ({
        item_id:  sel.item?.id != null ? Number(sel.item.id) : sel.idx,
        quantity: Number(sel.quantity),
      }));
    if (selectedItems.length === 0) {
      setPdfError('Please select at least one item to include in the PDF.'); return;
    }

    setPdfFormErrors({});
    setPdfError('');
    setPdfLoading(true);
    try {
      const fileName = `${fmtInvNum(invoice?.invoice_number)}.pdf`;
      if (isConstructive) {
        await generateConstructiveInvoicePdf({
          id:             Number(id),
          company_name:   pdfForm.company_name,
          address:        pdfForm.address,
          gst_no:         pdfForm.gst_no,
          state:          pdfForm.state,
          sac_code:       pdfForm.sac_code,
          code:           pdfForm.code,
          invoice_number: pdfForm.invoice_number,
          invoice_date:   pdfForm.invoice_date,
          work_order_date: pdfForm.work_order_date,
          valid_from:     pdfForm.valid_from,
          valid_till:     pdfForm.valid_till,
          vendor_code:    pdfForm.vendor_code,
          po_no:          pdfForm.po_no,
          schedule_date:  pdfForm.schedule_date,
          scope_of_work:  pdfForm.scope_of_work,
          items:          selectedItems,
        }, fileName);
      } else {
        await generateOtherCompanyInvoicePdf({
          id:             Number(id),
          invoice_number: pdfForm.invoice_number,
          company_name:   pdfForm.company_name,
          address:        pdfForm.address,
          gst_no:         pdfForm.gst_no,
          state:          pdfForm.state,
          sac_code:       pdfForm.sac_code,
          po_no:          pdfForm.po_no,
          schedule_date:  pdfForm.schedule_date,
          scope_of_work:  pdfForm.scope_of_work,
          items:          selectedItems,
        }, fileName);
      }
      setShowPdfModal(false);
    } catch (e) {
      setPdfError(e.message || 'Failed to generate PDF. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  /** Open the Payment Received PDF modal and pre-fill from invoice */
  const handleOpenPaymentPdf = () => {
    const today = new Date().toISOString().split('T')[0];
    setPaymentPdfForm({
      invoice_number: invoice?.invoice_number || '',
      company_name:   invoice?.company_name   || '',
      address:        invoice?.address        || '',
      gst_no:         invoice?.gst_no         || '',
      state:          invoice?.state          || '',
      sac_code:       invoice?.sac_code       || '',
      po_no:          invoice?.po_no          || '',
      schedule_date:  invoice?.schedule_date  ? invoice.schedule_date.split('T')[0] : today,
      scope_of_work:  '',
      received_amount: '',
    });
    setPaymentPdfFormErrors({});
    setPaymentPdfError('');
    setShowPaymentPdfModal(true);
  };

  /** Validate and submit Payment Received PDF download */
  const handleConfirmPaymentPdfDownload = async () => {
    const errors = {};
    if (!paymentPdfForm.scope_of_work?.trim())  errors.scope_of_work  = 'Scope of work is required.';
    if (!paymentPdfForm.received_amount?.trim()) errors.received_amount = 'Received amount is required.';
    if (!paymentPdfForm.schedule_date)           errors.schedule_date   = 'Schedule date is required.';
    if (Object.keys(errors).length > 0) { setPaymentPdfFormErrors(errors); return; }

    setPaymentPdfFormErrors({});
    setPaymentPdfError('');
    setPaymentPdfLoading(true);
    try {
      const fileName = `payment-received-${fmtInvNum(invoice?.invoice_number)}.pdf`;
      await generatePaymentReceivedPdf({
        id:              Number(id),
        invoice_number:  paymentPdfForm.invoice_number,
        company_name:    paymentPdfForm.company_name,
        address:         paymentPdfForm.address,
        gst_no:          paymentPdfForm.gst_no,
        state:           paymentPdfForm.state,
        sac_code:        paymentPdfForm.sac_code,
        po_no:           paymentPdfForm.po_no,
        schedule_date:   paymentPdfForm.schedule_date,
        scope_of_work:   paymentPdfForm.scope_of_work,
        received_amount: paymentPdfForm.received_amount,
      }, fileName);
      setShowPaymentPdfModal(false);
    } catch (e) {
      setPaymentPdfError(e.message || 'Failed to generate PDF. Please try again.');
    } finally {
      setPaymentPdfLoading(false);
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

  const handleCancelInvoice = async () => {
    setCancelLoading(true);
    setCancelError('');
    try {
      await cancelInvoice(id);
      setCancelSuccess(true);
      // Update invoice status locally so UI reflects cancelled state immediately
      setInvoice((prev) => prev ? { ...prev, status: '6', status_display: 'Cancelled', is_cancelled: true } : prev);
    } catch (e) {
      setCancelError(e.message || 'Failed to cancel invoice. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading)    return <LoadingView />;
  if (fetchError) return <ErrorView message={fetchError} onRetry={fetchData} onBack={() => navigate('/invoices')} />;
  if (!invoice)   return <ErrorView message="Invoice not available." onRetry={fetchData} onBack={() => navigate('/invoices')} />;

  // ── Derived values ────────────────────────────────────────────────────────────
  const statusKey  = String(invoice.status_display || invoice.status || '1').toLowerCase();
  const status     = getStatusWithIcon(statusKey !== '' ? statusKey : (invoice.status ?? 1));
  const isCancelled = (
    String(invoice.status) === '6' ||
    statusKey === 'cancelled' ||
    statusKey === 'canceled' ||
    invoice.is_cancelled === true
  );
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

  // Detect vendor invoice: has vendor field (generated from a Purchase Order)
  // The backend returns vendor/vendor_name instead of client/client_name for PO invoices
  const isVendorInvoice = Boolean(invoice.vendor) ||
    String(invoice.invoice_type || '').toLowerCase().includes('purchase order') ||
    String(invoice.invoice_type || '').toLowerCase().includes('vendor');

  // Detect invoice type from invoice_type field (authoritative) with item-level fallback
  const invoiceTypeRaw   = String(invoice.invoice_type || '').toLowerCase();
  const isPurchaseOrder  = isVendorInvoice || invoiceTypeRaw.includes('purchase order') || invoiceTypeRaw.includes('vendor');
  const isExecution      = !isPurchaseOrder && (invoiceTypeRaw.includes('execution') || items.some(it => [5, 6, 7].includes(Number(it.compliance_category))));
  // Regulatory = everything that is neither Execution nor PO (i.e. categories 1-4 / proforma flow)

  // PO invoices share the material/labour column layout with Execution invoices
  const hasRateColumns   = isExecution || isPurchaseOrder;

  const billedToName = isPurchaseOrder
    ? (invoice.vendor_name || `Vendor #${invoice.vendor}`)
    : client
      ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.email
      : invoice.client_name
        ? invoice.client_name
        : invoice.client
          ? `Client #${invoice.client}`
          : '—';

  const projName = project
    ? (project.name || project.title || `Project #${invoice.project}`)
    : invoice.project_name
      ? invoice.project_name
      : invoice.project
        ? `Project #${invoice.project}`
        : '—';

  const projLoc = project ? [project.city, project.state].filter(Boolean).join(', ') : '';
  const companyName = invoice.company_name || getQuotationCompanyName(invoice.company) || 'ERP System';
  const totalProfessionalAmount = items.reduce((sum, item) => {
    const qty = parseInt(item.quantity) || 1;
    const professional = parseFloat(item.Professional_amount || 0) || 0;
    return sum + (professional * qty);
  }, 0);
  const totalMaterialAmount = items.reduce((sum, item) => {
    const qty = parseInt(item.quantity) || 1;
    const materialAmount = parseFloat(item.material_amount);
    const materialRate = parseFloat(item.material_rate || 0) || 0;
    return sum + (Number.isFinite(materialAmount) ? materialAmount : materialRate * qty);
  }, 0);
  const totalLabourAmount = items.reduce((sum, item) => {
    const qty = parseInt(item.quantity) || 1;
    const labourAmount = parseFloat(item.labour_amount);
    const labourRate = parseFloat(item.labour_rate || 0) || 0;
    return sum + (Number.isFinite(labourAmount) ? labourAmount : labourRate * qty);
  }, 0);

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
        @keyframes notes_spin{to{transform:rotate(360deg)}}
        @keyframes notes_slide_in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        .vid-root{min-height:100vh;padding:0}
        .vid-topbar{display:flex;align-items:center;justify-content:space-between;margin:0 0 16px;flex-wrap:wrap;gap:10px}
        .vid-back{display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;font-size:13px;font-weight:600;color:#475569;padding:6px 10px;border-radius:8px;transition:background .15s,color .15s}
        .vid-back:hover{background:#e2e8f0;color:#1e293b}
        .vid-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}

        /* Track Payment — indigo/purple (distinguishable, not red) */
        .vid-btn-track{display:flex;align-items:center;gap:6px;padding:7px 15px;border-radius:8px;background:linear-gradient(135deg,#4f46e5,#6366f1);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;box-shadow:0 2px 8px rgba(99,102,241,.3)}
        .vid-btn-track:hover{background:linear-gradient(135deg,#4338ca,#4f46e5);box-shadow:0 4px 14px rgba(99,102,241,.4);transform:translateY(-1px)}
        .vid-btn-track:active{transform:translateY(0)}
        .vid-btn-track:disabled{opacity:.4;cursor:not-allowed;transform:none;box-shadow:none}

        /* Cancel Invoice — same red gradient as old Track Payment (admin/manager only) */
        .vid-btn-cancel{display:flex;align-items:center;gap:6px;padding:7px 15px;border-radius:8px;background:linear-gradient(135deg,#dc2626,#b91c1c);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;box-shadow:0 2px 8px rgba(220,38,38,.3)}
        .vid-btn-cancel:hover{background:linear-gradient(135deg,#b91c1c,#991b1b);box-shadow:0 4px 14px rgba(220,38,38,.4);transform:translateY(-1px)}
        .vid-btn-cancel:active{transform:translateY(0)}

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
            {/* Track Payment — indigo/purple, more neutral */}
            <button
              className="vid-btn-track"
              title="Track payment for this invoice"
              onClick={() => navigate(`/invoices/${id}/track-payment`, {
                state: {
                  invoice_id:    id,
                  invoice_type:  isPurchaseOrder ? 'vendor' : isExecution ? 'execution' : 'regulatory',
                  client_id:     isPurchaseOrder ? null : (invoice.client || client?.id || null),
                  vendor_id:     isPurchaseOrder ? (invoice.vendor || null) : null,
                  invoice_number: invoice.invoice_number,
                  grand_total:   invoice.grand_total || invoice.total_outstanding,
                },
              })}
              disabled={isCancelled}
              style={isCancelled ? { opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' } : {}}
            >
              <DollarSign size={14} /> Track Payment
            </button>
            {/* Send to Client / Vendor */}
            <button
              className="vid-btn-o"
              onClick={() => setSendModal(true)}
              disabled={isCancelled}
              style={isCancelled ? { opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' } : {}}
            >
              <Mail size={14} /> {isPurchaseOrder ? 'Send to Vendor' : 'Send to Client'}
            </button>
            {/* Download Invoice — always active, even when cancelled */}
            <button
              className="vid-btn-p"
              onClick={handleDownload}
              disabled={pdfLoading}
            >
              {pdfLoading ? <><Loader2 size={14} className="vid-spin" /> Generating…</> : <><Download size={14} /> Download Invoice</>}
            </button>
            {/* Download Payment Received PDF — separate button, always active */}
            <button
              className="vid-btn-p"
              onClick={handleOpenPaymentPdf}
              disabled={paymentPdfLoading}
              style={{ background: 'linear-gradient(135deg,#0d9488,#0891b2)', boxShadow: '0 2px 8px rgba(8,145,178,.25)' }}
            >
              {paymentPdfLoading ? <><Loader2 size={14} className="vid-spin" /> Generating…</> : <><Receipt size={14} /> Payment Received PDF</>}
            </button>
            {/* Create Purchase Order — only shown for Execution Compliance invoices (client invoices, not PO) */}
            {!isPurchaseOrder && invoice.invoice_type === 'Execution Compliance' && (
              <button
                className="vid-btn-p"
                onClick={handleOpenCreatePOModal}
                title="Create a purchase order for this invoice"
                disabled={isCancelled}
                style={isCancelled ? { opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' } : {}}
              >
                <ShoppingCart size={14} /> Create Purchase Order
              </button>
            )}
            {/* Cancel Invoice — Admin / Manager only, hidden once already cancelled */}
            {isPrivileged && !isCancelled && (
              <button
                className="vid-btn-cancel"
                title="Cancel this invoice"
                onClick={() => setShowCancelModal(true)}
              >
                <XCircle size={14} /> Cancel Invoice
              </button>
            )}
          </div>
        </div>

        {/* ── Document card ── */}
        <div className={`vid-doc${visible ? ' in' : ''}`}>

          {/* ══════════ CANCELLED BANNER ══════════ */}
          {isCancelled && (
            <div style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', padding: '12px 40px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <XCircle size={18} color="#fff" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '.01em' }}>
                This invoice has been cancelled. All actions are disabled.
              </span>
            </div>
          )}

          {/* ══════════ HEADER ══════════ */}
          <div className="vid-hdr">
            <div className="vid-hdr-l">
              <div className="vid-logo">
                <div className="vid-logo-badge">ERP</div>
                <div>
                  <div className="vid-co-name">{companyName}</div>
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
              <div className="vid-plabel">{isPurchaseOrder ? 'Vendor' : 'Billed To'}</div>
              <div className="vid-pavatar" style={isPurchaseOrder ? { background: 'linear-gradient(135deg,#0d9488,#0f766e)' } : {}}>
                {(billedToName && billedToName !== '—' ? billedToName : isPurchaseOrder ? 'V' : '?').charAt(0).toUpperCase()}
              </div>
              <div className="vid-pname">{billedToName}</div>
              {isPurchaseOrder ? (
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

              {/* ══════════ ITEMS TABLE — delegated to InvoiceTypeTable ══════════ */}
              <InvoiceTypeTable
                isExecution={isExecution}
                isPurchaseOrder={isPurchaseOrder}
                items={items}
              />
            </div>

            {/* RIGHT: Quick Info Card */}
            <div className="vid-body-right">
              <QuickInfoCard
                invoice={invoice}
                client={client}
                project={project}
                isPurchaseOrder={isPurchaseOrder}
              />
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
                <div className="vid-sum-item"><span className="vid-sum-lbl">{isPurchaseOrder ? 'Vendor' : 'Client'}</span><span className="vid-sum-val">{billedToName}</span></div>
                <div className="vid-sum-item"><span className="vid-sum-lbl">Project</span><span className="vid-sum-val">{projName}</span></div>
                <div className="vid-sum-item"><span className="vid-sum-lbl">Company</span><span className="vid-sum-val">{companyName}</span></div>
                <div className="vid-sum-item"><span className="vid-sum-lbl">Issue Date</span><span className="vid-sum-val">{fmtDate(invoice.issue_date || invoice.created_at)}</span></div>
                <div className="vid-sum-item"><span className="vid-sum-lbl">Last Updated</span><span className="vid-sum-val">{fmtDate(invoice.updated_at)}</span></div>
                {createdByName && <div className="vid-sum-item"><span className="vid-sum-lbl">Prepared By</span><span className="vid-sum-val">{createdByName}</span></div>}
              </div>
              {hasRateColumns && (
                <div style={{ marginTop: 18, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '16px 18px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 12 }}>
                    {isPurchaseOrder ? 'Purchase Order Cost Breakdown' : 'Execution Cost Breakdown'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div className="vid-sum-item">
                      <span className="vid-sum-lbl">Professional Amount</span>
                      <span className="vid-sum-val">₹ {fmtINR(totalProfessionalAmount)}</span>
                    </div>
                    <div className="vid-sum-item">
                      <span className="vid-sum-lbl">Material Amount</span>
                      <span className="vid-sum-val">₹ {fmtINR(totalMaterialAmount)}</span>
                    </div>
                    <div className="vid-sum-item">
                      <span className="vid-sum-lbl">Labour Amount</span>
                      <span className="vid-sum-val">₹ {fmtINR(totalLabourAmount)}</span>
                    </div>
                  </div>
                </div>
              )}
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
              <button
                className="vid-dl-btn"
                onClick={handleOpenPaymentPdf}
                disabled={paymentPdfLoading}
                style={{ marginTop: 8 }}
              >
                {paymentPdfLoading ? <><Loader2 size={15} className="vid-spin" /> Generating…</> : <><Receipt size={15} /> Payment Received PDF</>}
              </button>
            </div>
          </div>

          {/* ══════════ DOC FOOTER ══════════ */}
          <div className="vid-doc-foot">
            <span>This is a system-generated invoice.</span>
            <span>{invNum}&nbsp;·&nbsp;{fmtDate(invoice.issue_date || invoice.created_at)}</span>
          </div>

        </div>{/* end .vid-doc */}

        {/* ══════════ NOTES SECTION ══════════ */}
        {!loading && invoice && (
          <Notes entityType={NOTE_ENTITY.INVOICE} entityId={invoice.id} />
        )}

      </div>{/* end .vid-root */}

      {/* ══════════ SEND TO CLIENT MODAL ══════════ */}
      {sendModal && (
        <SendToClientModal
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

      {/* ══════════ DOWNLOAD INVOICE PDF MODAL ══════════ */}
      {showPdfModal && (() => {
        const companyId = parseInt(invoice?.company) || 0;
        const isConstructive = companyId === CONSTRUCTIVE_INDIA_COMPANY_ID;
        const allItems = invoice?.items || [];

        // ── Invoice-type flags (mirror outer-scope derivations so checklist is type-aware) ──
        const modalInvoiceTypeRaw = String(invoice?.invoice_type || '').toLowerCase();
        const modalIsExecution    = !isPurchaseOrder && (
          modalInvoiceTypeRaw.includes('execution') ||
          allItems.some(it => [5, 6, 7].includes(Number(it.compliance_category)))
        );
        // ── Selected Items Total (uses correct per-unit helper) ──
        const selectedTotal = parseFloat(
          Object.values(pdfItemSelections)
            .filter(s => s.selected)
            .reduce((sum, s) => {
              const unitAmt = s.item ? calcItemUnitAmount(s.item) : 0;
              return sum + unitAmt * (parseInt(s.quantity) || 0);
            }, 0)
          .toFixed(2)
        );
        const field = (key, label, required = false, type = 'text', extra = {}) => (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5 }}>
              {label}{required && <span style={{ color: '#dc2626', marginLeft: 3 }}>*</span>}
            </div>
            <input
              type={type}
              value={pdfForm[key] || ''}
              onChange={e => { setPdfForm(p => ({ ...p, [key]: e.target.value })); setPdfFormErrors(p => ({ ...p, [key]: '' })); }}
              disabled={pdfLoading}
              style={{
                width: '100%', padding: '8px 11px',
                border: `1.5px solid ${pdfFormErrors[key] ? '#fca5a5' : '#e2e8f0'}`,
                borderRadius: 9, fontSize: 13, fontFamily: 'inherit', color: '#1e293b',
                outline: 'none', boxSizing: 'border-box',
                background: pdfLoading ? '#f8fafc' : '#fff',
              }}
              {...extra}
            />
            {pdfFormErrors[key] && (
              <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={11} /> {pdfFormErrors[key]}
              </div>
            )}
          </div>
        );
        return (
          <div className="fixed inset-0 z-[9999] pointer-events-none" style={{ position: 'fixed' }}>
            <div
              className="absolute inset-0 bg-black/50 pointer-events-auto"
              style={{ position: 'fixed', width: '100vw', height: '100vh' }}
              onClick={() => !pdfLoading && setShowPdfModal(false)}
            />
            <div className="relative z-10 flex items-center justify-center p-4 pointer-events-none" style={{ height: '100vh' }}>
              <div
                style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 620, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,.28)', fontFamily: "'Outfit', sans-serif", display: 'flex', flexDirection: 'column' }}
                className="pointer-events-auto"
                onClick={e => e.stopPropagation()}
              >
                {/* ── Header ── */}
                <div style={{ background: 'linear-gradient(135deg,#0c6e67 0%,#0f766e 45%,#0d9488 100%)', padding: '20px 24px 18px', position: 'sticky', top: 0, zIndex: 2, borderRadius: '20px 20px 0 0', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,.18)', border: '1.5px solid rgba(255,255,255,.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileSearch size={17} color="#fff" />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>Download Invoice PDF</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>
                          {fmtInvNum(invoice?.invoice_number)}&nbsp;·&nbsp;
                          {isConstructive ? 'Constructive India (GST Invoice)' : 'Other Company Invoice'}
                        </div>
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
                <div style={{ padding: '22px 24px 24px', background: '#fafafa' }}>

                  {/* Company badge */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: isConstructive ? '#f0fdf4' : '#eff6ff', border: `1px solid ${isConstructive ? '#86efac' : '#bfdbfe'}`, borderRadius: 20, padding: '5px 12px', marginBottom: 18, fontSize: 12, fontWeight: 700, color: isConstructive ? '#059669' : '#2563eb' }}>
                    <Building2 size={13} />
                    {isConstructive ? 'Constructive India — GST endpoint' : 'Other Company — generic endpoint'}
                  </div>

                  {/* ── Form fields grid ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                    {field('invoice_number', 'Invoice Number', false)}
                    {field('company_name',   'Company Name', false)}
                    {field('address',        'Address', false)}
                    {field('gst_no',         'GST No.', false)}
                    {field('state',          'State', false)}
                    {field('sac_code',       'SAC Code', false)}
                    {field('po_no',          'PO No.', false)}
                    {field('schedule_date',  'Schedule Date', true, 'date')}
                    {isConstructive && field('invoice_date',    'Invoice Date', true, 'date')}
                    {isConstructive && field('work_order_date', 'Work Order Date', true, 'date')}
                    {isConstructive && field('valid_from',      'Valid From', true, 'date')}
                    {isConstructive && field('valid_till',      'Valid Till', true, 'date')}
                    {isConstructive && field('vendor_code',     'Vendor Code', false)}
                    {isConstructive && field('code',            'Code', false)}
                  </div>

                  {/* Scope of Work */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5 }}>
                      Scope of Work <span style={{ color: '#dc2626' }}>*</span>
                    </div>
                    <textarea
                      rows={3}
                      placeholder="e.g. Supply, installation and commissioning of plumbing works…"
                      value={pdfForm.scope_of_work || ''}
                      onChange={e => { setPdfForm(p => ({ ...p, scope_of_work: e.target.value })); setPdfFormErrors(p => ({ ...p, scope_of_work: '' })); }}
                      disabled={pdfLoading}
                      style={{
                        width: '100%', padding: '9px 11px',
                        border: `1.5px solid ${pdfFormErrors.scope_of_work ? '#fca5a5' : '#e2e8f0'}`,
                        borderRadius: 9, fontSize: 13, fontFamily: 'inherit', color: '#1e293b',
                        resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                        background: pdfLoading ? '#f8fafc' : '#fff',
                      }}
                    />
                    {pdfFormErrors.scope_of_work && (
                      <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <AlertCircle size={11} /> {pdfFormErrors.scope_of_work}
                      </div>
                    )}
                  </div>

                  {/* ── Items Checklist ── */}
                  {allItems.length > 0 && (() => {
                    // ── Build groups in the exact same order as the main invoice table ──
                    // groupItemsByCategory preserves insertion order; we then sort groups
                    // by compliance_category ID ascending (1→2→3→4→5→6→7→null-last)
                    // so the checklist always matches the view-page table precisely.
                    const checklistGroups = groupItemsByCategory(allItems)
                      .slice()
                      .sort((a, b) => {
                        if (a.catId == null && b.catId == null) return 0;
                        if (a.catId == null) return 1;   // nulls go last
                        if (b.catId == null) return -1;
                        return Number(a.catId) - Number(b.catId);
                      });

                    // Flat ordered list used only for border-bottom logic
                    return (
                      <div style={{ marginBottom: 20 }}>
                        {/* Header row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                            Select Items for PDF
                            <span style={{ marginLeft: 8, background: '#f0fdf4', color: '#0f766e', border: '1px solid #99f6e4', borderRadius: 20, padding: '1px 8px', fontSize: 10.5, fontWeight: 700 }}>
                              {Object.values(pdfItemSelections).filter(s => s.selected).length} / {allItems.length} selected
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => setPdfItemSelections(prev => {
                                const next = {};
                                Object.keys(prev).forEach(k => { next[k] = { ...prev[k], selected: true }; });
                                return next;
                              })}
                              style={{ fontSize: 11, fontWeight: 600, color: '#0f766e', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
                            >Select All</button>
                            <button
                              onClick={() => setPdfItemSelections(prev => {
                                const next = {};
                                Object.keys(prev).forEach(k => { next[k] = { ...prev[k], selected: false }; });
                                return next;
                              })}
                              style={{ fontSize: 11, fontWeight: 600, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
                            >Deselect All</button>
                          </div>
                        </div>

                        {/* Grouped list — one section per compliance category, same order as main table */}
                        <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                          {checklistGroups.map((grp, grpIdx) => {
                            const isLastGroup = grpIdx === checklistGroups.length - 1;
                            return (
                              <div key={grp.catId ?? 'other'}>

                                {/* ── Category header ── */}
                                <div style={{
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  padding: '7px 14px',
                                  background: '#f8fafc',
                                  borderBottom: '1px solid #e2e8f0',
                                  borderTop: grpIdx > 0 ? '1.5px solid #e2e8f0' : 'none',
                                }}>
                                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#0f766e', flexShrink: 0, display: 'inline-block' }} />
                                  <span style={{ fontSize: 10.5, fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                                    {grp.catName}
                                  </span>
                                  <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', marginLeft: 2 }}>
                                    {grp.items.length} item{grp.items.length !== 1 ? 's' : ''}
                                  </span>
                                </div>

                                {/* ── Items within this category ── */}
                                {grp.items.map((item, itemIdx) => {
                                  const key = item.id != null ? String(item.id) : `idx_${allItems.indexOf(item)}`;
                                  const sel = pdfItemSelections[key] || {
                                    selected: false,
                                    quantity: parseInt(item.quantity) || 1,
                                    maxQty:   parseInt(item.quantity) || 1,
                                  };

                                  // Use safe numeric qty (handles mid-typing empty string)
                                  const selQty = parseInt(sel.quantity) || 0;

                                  const prof    = parseFloat(item.Professional_amount) || 0;
                                  const matRate = parseFloat(item.material_rate) || 0;
                                  const labRate = parseFloat(item.labour_rate)   || 0;
                                  const matAmt  = parseFloat(item.material_amount) || 0;
                                  const labAmt  = parseFloat(item.labour_amount)   || 0;
                                  const consultancyRaw = item.consultancy_charges ?? item.miscellaneous_amount;
                                  const consultancyNum = (() => {
                                    if (consultancyRaw === '--' || consultancyRaw == null || consultancyRaw === '') return 0;
                                    const n = parseFloat(String(consultancyRaw).trim());
                                    return isNaN(n) ? 0 : n;
                                  })();

                                  // Per-unit rates for Mat and Lab (prefer rate field, fallback to amount/maxQty)
                                  const matRatePerUnit = matRate > 0 ? matRate : (matAmt > 0 ? matAmt / (parseInt(item.quantity) || 1) : 0);
                                  const labRatePerUnit = labRate > 0 ? labRate : (labAmt > 0 ? labAmt / (parseInt(item.quantity) || 1) : 0);

                                  // Dynamic amounts based on currently selected quantity
                                  const dynamicMatAmt = parseFloat((matRatePerUnit * selQty).toFixed(2));
                                  const dynamicLabAmt = parseFloat((labRatePerUnit * selQty).toFixed(2));
                                  const dynamicProfAmt = parseFloat((prof * selQty).toFixed(2));

                                  // Line total using dynamic qty
                                  const unitAmt  = calcItemUnitAmount(item);
                                  const lineTotal = parseFloat((unitAmt * selQty).toFixed(2));

                                  // isExecution covers both execution and vendor compliance invoice types
                                  const itemIsExec = (
                                    item.material_rate   != null ||
                                    item.labour_rate     != null ||
                                    item.material_amount != null ||
                                    item.labour_amount   != null
                                  );
                                  // Show execution-style breakdown for exec AND vendor invoices
                                  const showExecBreakdown = itemIsExec && (modalIsExecution || isPurchaseOrder);

                                  const isLastItemInGroup  = itemIdx === grp.items.length - 1;
                                  const showBottomBorder   = !(isLastGroup && isLastItemInGroup);

                                  return (
                                    <div
                                      key={key}
                                      style={{
                                        display: 'flex', alignItems: 'flex-start', gap: 12,
                                        padding: '10px 14px',
                                        borderBottom: showBottomBorder ? '1px solid #f0f4f8' : 'none',
                                        background: sel.selected ? '#fafffe' : '#fff',
                                        transition: 'background .1s',
                                      }}
                                    >
                                      {/* Checkbox */}
                                      <div
                                        onClick={() => setPdfItemSelections(prev => ({ ...prev, [key]: { ...sel, selected: !sel.selected } }))}
                                        style={{
                                          width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 2,
                                          border: `2px solid ${sel.selected ? '#0f766e' : '#cbd5e1'}`,
                                          background: sel.selected ? '#0f766e' : '#fff',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          cursor: 'pointer', transition: 'all .12s',
                                        }}
                                      >
                                        {sel.selected && (
                                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                            <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                        )}
                                      </div>

                                      {/* Item info */}
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 12.5, fontWeight: 600, color: sel.selected ? '#1e293b' : '#94a3b8', lineHeight: 1.45, marginBottom: 3, transition: 'color .1s' }}>
                                          {item.description || '—'}
                                        </div>
                                        {showExecBreakdown ? (
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', fontSize: 11, color: '#64748b' }}>
                                            {matRatePerUnit > 0 && <span>Mat: ₹{fmtINR(dynamicMatAmt)}</span>}
                                            {labRatePerUnit > 0 && <span>Lab: ₹{fmtINR(dynamicLabAmt)}</span>}
                                            {prof > 0 && <span>Prof: ₹{fmtINR(dynamicProfAmt)}</span>}
                                          </div>
                                        ) : (
                                          <div style={{ fontSize: 11, color: '#64748b' }}>
                                            Prof: ₹{fmtINR(prof * selQty)}
                                            {consultancyNum > 0 && <span style={{ marginLeft: 10 }}>Cons: ₹{fmtINR(consultancyNum * selQty)}</span>}
                                          </div>
                                        )}
                                      </div>

                                      {/* Qty + Line total */}
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>Qty</span>
                                          <input
                                            type="number"
                                            min={1}
                                            max={sel.maxQty}
                                            value={sel.quantity}
                                            disabled={!sel.selected}
                                            onChange={e => {
                                              const raw = e.target.value;
                                              if (raw === '' || raw === '-') {
                                                setPdfItemSelections(prev => ({ ...prev, [key]: { ...sel, quantity: raw } }));
                                                return;
                                              }
                                              let v = parseInt(raw, 10);
                                              if (isNaN(v)) return;
                                              if (v < 1) v = 1;
                                              if (v > sel.maxQty) v = sel.maxQty;
                                              setPdfItemSelections(prev => ({ ...prev, [key]: { ...sel, quantity: v } }));
                                            }}
                                            onBlur={e => {
                                              // Clamp on blur — if user left it empty, restore to 1
                                              let v = parseInt(e.target.value, 10);
                                              if (isNaN(v) || v < 1) v = 1;
                                              if (v > sel.maxQty) v = sel.maxQty;
                                              setPdfItemSelections(prev => ({ ...prev, [key]: { ...sel, quantity: v } }));
                                            }}
                                            style={{
                                              width: 52, padding: '4px 6px', fontSize: 13, fontWeight: 700,
                                              border: `1.5px solid ${sel.selected ? '#0f766e' : '#e2e8f0'}`,
                                              borderRadius: 7, textAlign: 'center', outline: 'none',
                                              color: sel.selected ? '#1e293b' : '#94a3b8',
                                              background: sel.selected ? '#fff' : '#f8fafc',
                                              fontFamily: 'inherit',
                                            }}
                                          />
                                          <span style={{ fontSize: 10, color: '#94a3b8' }}>/ {sel.maxQty}</span>
                                        </div>
                                        <div style={{ fontSize: 11.5, fontWeight: 700, color: sel.selected ? '#0f766e' : '#d1d5db' }}>
                                          ₹ {fmtINR(lineTotal)}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>

                        {/* Selected total */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 10, padding: '8px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10 }}>
                          <span style={{ fontSize: 12, color: '#064e3b', fontWeight: 600 }}>Selected Items Total:</span>
                          <span style={{ fontSize: 15, fontWeight: 900, color: '#0f766e' }}>₹ {fmtINR(selectedTotal)}</span>
                        </div>
                      </div>
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
                        ? <><Loader2 size={13} style={{ animation: 'vid_spin 0.7s linear infinite' }} /> Generating…</>
                        : <><Download size={13} /> Generate &amp; Download</>
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════════ PAYMENT RECEIVED PDF MODAL ══════════ */}
      {showPaymentPdfModal && (
        <div className="fixed inset-0 z-[9999] pointer-events-none" style={{ position: 'fixed' }}>
          <div
            className="absolute inset-0 bg-black/50 pointer-events-auto"
            style={{ position: 'fixed', width: '100vw', height: '100vh' }}
            onClick={() => !paymentPdfLoading && setShowPaymentPdfModal(false)}
          />
          <div className="relative z-10 flex items-center justify-center p-4 pointer-events-none" style={{ height: '100vh' }}>
            <div
              style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,.28)', fontFamily: "'Outfit', sans-serif", display: 'flex', flexDirection: 'column' }}
              className="pointer-events-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* ── Header ── */}
              <div style={{ background: 'linear-gradient(135deg,#0c6e67 0%,#0f766e 45%,#0d9488 100%)', padding: '20px 24px 18px', position: 'sticky', top: 0, zIndex: 2, borderRadius: '20px 20px 0 0', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,.18)', border: '1.5px solid rgba(255,255,255,.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Receipt size={17} color="#fff" />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>Payment Received PDF</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>Acknowledge received payment · {fmtInvNum(invoice?.invoice_number)}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => !paymentPdfLoading && setShowPaymentPdfModal(false)}
                    style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.15)', border: 'none', cursor: paymentPdfLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* ── Body ── */}
              <div style={{ padding: '22px 24px 24px', background: '#fafafa' }}>
                {/* Info */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
                  <AlertCircle size={14} color="#0d9488" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ margin: 0, fontSize: 12, color: '#134e4a', lineHeight: 1.6 }}>
                    This PDF acknowledges a payment received for this invoice. Enter the received amount and other details below.
                  </p>
                </div>

                {/* Form fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  {[
                    ['invoice_number', 'Invoice Number', false, 'text'],
                    ['company_name',   'Company Name',   false, 'text'],
                    ['address',        'Address',        false, 'text'],
                    ['gst_no',         'GST No.',        false, 'text'],
                    ['state',          'State',          false, 'text'],
                    ['sac_code',       'SAC Code',       false, 'text'],
                    ['po_no',          'PO No.',         false, 'text'],
                    ['schedule_date',  'Schedule Date',  true,  'date'],
                  ].map(([key, label, req, type]) => (
                    <div key={key} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5 }}>
                        {label}{req && <span style={{ color: '#dc2626', marginLeft: 3 }}>*</span>}
                      </div>
                      <input
                        type={type}
                        value={paymentPdfForm[key] || ''}
                        onChange={e => { setPaymentPdfForm(p => ({ ...p, [key]: e.target.value })); setPaymentPdfFormErrors(p => ({ ...p, [key]: '' })); }}
                        disabled={paymentPdfLoading}
                        style={{
                          width: '100%', padding: '8px 11px',
                          border: `1.5px solid ${paymentPdfFormErrors[key] ? '#fca5a5' : '#e2e8f0'}`,
                          borderRadius: 9, fontSize: 13, fontFamily: 'inherit', color: '#1e293b',
                          outline: 'none', boxSizing: 'border-box',
                          background: paymentPdfLoading ? '#f8fafc' : '#fff',
                        }}
                      />
                      {paymentPdfFormErrors[key] && (
                        <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <AlertCircle size={11} /> {paymentPdfFormErrors[key]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Scope of Work */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5 }}>
                    Scope of Work <span style={{ color: '#dc2626' }}>*</span>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="e.g. Supply, installation and commissioning of plumbing works…"
                    value={paymentPdfForm.scope_of_work || ''}
                    onChange={e => { setPaymentPdfForm(p => ({ ...p, scope_of_work: e.target.value })); setPaymentPdfFormErrors(p => ({ ...p, scope_of_work: '' })); }}
                    disabled={paymentPdfLoading}
                    style={{
                      width: '100%', padding: '9px 11px',
                      border: `1.5px solid ${paymentPdfFormErrors.scope_of_work ? '#fca5a5' : '#e2e8f0'}`,
                      borderRadius: 9, fontSize: 13, fontFamily: 'inherit', color: '#1e293b',
                      resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                      background: paymentPdfLoading ? '#f8fafc' : '#fff',
                    }}
                  />
                  {paymentPdfFormErrors.scope_of_work && (
                    <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertCircle size={11} /> {paymentPdfFormErrors.scope_of_work}
                    </div>
                  )}
                </div>

                {/* Received Amount — highlighted */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5 }}>
                    Received Amount <span style={{ color: '#dc2626' }}>*</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700, color: '#0d9488' }}>₹</span>
                    <input
                      type="text"
                      placeholder="e.g. 50000.00"
                      value={paymentPdfForm.received_amount || ''}
                      onChange={e => { setPaymentPdfForm(p => ({ ...p, received_amount: e.target.value })); setPaymentPdfFormErrors(p => ({ ...p, received_amount: '' })); }}
                      disabled={paymentPdfLoading}
                      style={{
                        width: '100%', padding: '10px 12px 10px 28px',
                        border: `2px solid ${paymentPdfFormErrors.received_amount ? '#fca5a5' : '#0d9488'}`,
                        borderRadius: 10, fontSize: 15, fontWeight: 700, fontFamily: 'inherit', color: '#0f766e',
                        outline: 'none', boxSizing: 'border-box',
                        background: paymentPdfLoading ? '#f8fafc' : '#f0fdfa',
                      }}
                    />
                  </div>
                  {paymentPdfFormErrors.received_amount && (
                    <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertCircle size={11} /> {paymentPdfFormErrors.received_amount}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 5 }}>
                    Grand total for reference: <strong style={{ color: '#0f766e' }}>₹ {fmtINR(grandTotal)}</strong>
                  </div>
                </div>

                {/* API error */}
                {paymentPdfError && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '11px 14px', marginBottom: 8, fontSize: 12.5, color: '#dc2626', fontWeight: 500 }}>
                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>PDF generation failed</div>
                      <div style={{ fontWeight: 400 }}>{paymentPdfError}</div>
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div style={{ display: 'flex', gap: 10, marginTop: 4, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => !paymentPdfLoading && setShowPaymentPdfModal(false)}
                    disabled={paymentPdfLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 9, background: '#fff', border: '2px solid #94a3b8', color: '#475569', fontSize: 13, fontWeight: 600, cursor: paymentPdfLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmPaymentPdfDownload}
                    disabled={paymentPdfLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 22px', borderRadius: 9, border: 'none', background: paymentPdfLoading ? '#d1d5db' : '#0f766e', color: '#fff', fontSize: 13, fontWeight: 700, cursor: paymentPdfLoading ? 'not-allowed' : 'pointer', boxShadow: paymentPdfLoading ? 'none' : '0 2px 8px rgba(13,148,136,.3)', fontFamily: 'inherit', transition: 'all .15s' }}
                  >
                    {paymentPdfLoading
                      ? <><Loader2 size={13} style={{ animation: 'vid_spin 0.7s linear infinite' }} /> Generating…</>
                      : <><Download size={13} /> Generate &amp; Download</>
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Invoice Modal ── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[9999] pointer-events-none" style={{ position: 'fixed' }}>
          <div
            className="absolute inset-0 bg-black/50 pointer-events-auto"
            style={{ position: 'fixed', width: '100vw', height: '100vh' }}
            onClick={() => !cancelLoading && !cancelSuccess && setShowCancelModal(false)}
          />
          <div className="relative z-10 flex items-center justify-center p-4 pointer-events-none" style={{ height: '100vh' }}>
            <div
              style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440, boxShadow: '0 32px 80px rgba(0,0,0,.28)', overflow: 'hidden', fontFamily: "'Outfit', sans-serif", animation: 'vid_modal_in 0.3s cubic-bezier(0.16,1,0.3,1)' }}
              className="pointer-events-auto"
              onClick={e => e.stopPropagation()}
            >
              {cancelSuccess ? (
                /* ── Success state ── */
                <div style={{ padding: '40px 32px', textAlign: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                    <CheckCircle size={32} color="#059669" />
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: '0 0 8px' }}>Invoice Cancelled</h3>
                  <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 28px', lineHeight: 1.7 }}>
                    Invoice <strong>{fmtInvNum(invoice?.invoice_number)}</strong> has been successfully cancelled.
                  </p>
                  <button
                    onClick={() => { setShowCancelModal(false); setCancelSuccess(false); }}
                    style={{ width: '100%', padding: '11px', borderRadius: 10, background: '#0f766e', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Close
                  </button>
                </div>
              ) : (
                /* ── Confirm state ── */
                <>
                  {/* Header */}
                  <div style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', padding: '20px 24px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,.18)', border: '1.5px solid rgba(255,255,255,.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <XCircle size={18} color="#fff" />
                        </div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>Cancel Invoice</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{fmtInvNum(invoice?.invoice_number)}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => !cancelLoading && setShowCancelModal(false)}
                        style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.15)', border: 'none', cursor: cancelLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div style={{ padding: '24px 24px 26px', background: '#fafafa' }}>
                    {/* Warning banner */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '11px 14px', marginBottom: 20 }}>
                      <AlertCircle size={14} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                      <p style={{ margin: 0, fontSize: 12, color: '#7f1d1d', lineHeight: 1.6 }}>
                        This action <strong>cannot be undone</strong>. The invoice will be permanently cancelled and all actions will be disabled.
                      </p>
                    </div>

                    <p style={{ fontSize: 13, color: '#475569', margin: '0 0 20px', lineHeight: 1.7 }}>
                      Are you sure you want to cancel invoice <strong style={{ color: '#1e293b' }}>{fmtInvNum(invoice?.invoice_number)}</strong>?
                    </p>

                    {/* API error */}
                    {cancelError && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '11px 14px', marginBottom: 16, fontSize: 12.5, color: '#dc2626', fontWeight: 500 }}>
                        <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span>{cancelError}</span>
                      </div>
                    )}

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => !cancelLoading && setShowCancelModal(false)}
                        disabled={cancelLoading}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 9, background: '#fff', border: '2px solid #94a3b8', color: '#475569', fontSize: 13, fontWeight: 600, cursor: cancelLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                      >
                        Keep Invoice
                      </button>
                      <button
                        onClick={handleCancelInvoice}
                        disabled={cancelLoading}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 22px', borderRadius: 9, border: 'none', background: cancelLoading ? '#d1d5db' : 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: cancelLoading ? 'not-allowed' : 'pointer', boxShadow: cancelLoading ? 'none' : '0 2px 8px rgba(220,38,38,.3)', fontFamily: 'inherit', transition: 'all .15s' }}
                      >
                        {cancelLoading
                          ? <><Loader2 size={13} style={{ animation: 'vid_spin 0.7s linear infinite' }} /> Cancelling…</>
                          : <><XCircle size={13} /> Yes, Cancel Invoice</>
                        }
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
