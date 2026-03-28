import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, AlertCircle,
  CheckCircle, Clock, FileText, XCircle,
  Building2, User, MapPin, Hash, Calendar,
  Tag, ChevronRight, Phone, Send, RotateCcw,
  ClipboardCheck, Briefcase, Home, AlertTriangle,
  ThumbsUp, ThumbsDown, X, Edit2, Save,
} from 'lucide-react';
import { getNocById, submitNoc, approveNoc, rejectNoc, reapplyNoc, updateNoc } from '../../services/nocs';

// ─── NOC Status Config ────────────────────────────────────────────────────────
// Backend: DRAFT=1  SUBMITTED=2  APPROVED=3  REJECTED=4  EXPIRED=5

const STATUS_CONFIG = {
  '1':         { label: 'Draft',     Icon: FileText,      color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  '2':         { label: 'Submitted', Icon: Clock,         color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  '3':         { label: 'Approved',  Icon: CheckCircle,   color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  '4':         { label: 'Rejected',  Icon: XCircle,       color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  '5':         { label: 'Expired',   Icon: AlertTriangle, color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
  'draft':     { label: 'Draft',     Icon: FileText,      color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  'submitted': { label: 'Submitted', Icon: Clock,         color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  'approved':  { label: 'Approved',  Icon: CheckCircle,   color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  'rejected':  { label: 'Rejected',  Icon: XCircle,       color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  'expired':   { label: 'Expired',   Icon: AlertTriangle, color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
};

const getStatus = (s) => {
  const key = String(s ?? '');
  return STATUS_CONFIG[key] || STATUS_CONFIG[key.toLowerCase()] || STATUS_CONFIG['1'];
};

// ─── History event styling ────────────────────────────────────────────────────

const getHistoryEventStyle = (eventDisplay = '', newStatus = null) => {
  const e = String(eventDisplay).toLowerCase();
  const s = String(newStatus ?? '');
  if (s === '3' || e.includes('approved'))  return { color: '#059669', bg: '#ecfdf5', border: '#bbf7d0', dot: '✅' };
  if (s === '4' || e.includes('rejected'))  return { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', dot: '❌' };
  if (s === '5' || e.includes('expired'))   return { color: '#94a3b8', bg: '#f8fafc',  border: '#e2e8f0', dot: '⏰' };
  if (s === '2' || e.includes('submitted')) return { color: '#d97706', bg: '#fffbeb',  border: '#fcd34d', dot: '⏳' };
  if (e.includes('created'))                return { color: '#0f766e', bg: '#f0fdf4',  border: '#bbf7d0', dot: '📄' };
  if (e.includes('updated'))                return { color: '#2563eb', bg: '#eff6ff',  border: '#bfdbfe', dot: '✏️' };
  if (e.includes('reappl'))                 return { color: '#6366f1', bg: '#eef2ff',  border: '#c7d2fe', dot: '🔄' };
  return                                             { color: '#475569', bg: '#f8fafc',  border: '#e2e8f0', dot: '🔵' };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (ds) => {
  if (!ds) return '—';
  try {
    return new Date(ds).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
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

const toISODate = (dateStr) => {
  if (!dateStr) return null;
  try { return new Date(dateStr).toISOString(); }
  catch { return null; }
};

// Converts ISO datetime → "YYYY-MM-DD" for <input type="date"> value
const toDateInputValue = (isoStr) => {
  if (!isoStr) return '';
  try { return new Date(isoStr).toISOString().split('T')[0]; }
  catch { return ''; }
};

// ─── Status Pill ──────────────────────────────────────────────────────────────

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

// ─── Meta Block ───────────────────────────────────────────────────────────────

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

// ─── Loading / Error views ────────────────────────────────────────────────────

const LoadingView = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 14 }}>
    <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#0f766e', animation: 'vnd_spin .75s linear infinite' }} />
    <p style={{ fontSize: 14, fontWeight: 500, color: '#64748b', margin: 0 }}>Loading NOC details…</p>
    <style>{`@keyframes vnd_spin{to{transform:rotate(360deg)}}`}</style>
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

// ─── Shared modal field wrapper ───────────────────────────────────────────────

const ModalField = ({ label, required, error, children }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
      {label}{required && <span style={{ color: '#dc2626' }}> *</span>}
    </div>
    {children}
    {error && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#dc2626', marginTop: 5, fontWeight: 500 }}>
        <AlertCircle size={12} /> {error}
      </div>
    )}
  </div>
);

const baseInput = (hasError) => ({
  width: '100%', padding: '9px 12px',
  border: `1.5px solid ${hasError ? '#fca5a5' : '#e2e8f0'}`,
  borderRadius: 10, fontSize: 13, fontFamily: 'inherit',
  color: '#1e293b', outline: 'none', boxSizing: 'border-box',
  background: '#fff', transition: 'border-color .15s, box-shadow .15s',
});

// ─── SUBMIT MODAL ─────────────────────────────────────────────────────────────

const SubmitModal = ({ nocId, nocIdDisplay, onClose, onSuccess }) => {
  const [appNumber,  setAppNumber]  = useState('');
  const [appDate,    setAppDate]    = useState('');
  const [errors,     setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e = {};
    if (!appNumber.trim()) e.appNumber = 'Application number is required.';
    if (!appDate)          e.appDate   = 'Application date is required.';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setSubmitting(true);
    try {
      await submitNoc(nocId, appNumber, toISODate(appDate));
      onSuccess();
    } catch (err) {
      // Service layer already parses the error into a clean string
      setErrors({ api: err.message || 'Failed to submit NOC. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000]" style={{ position: 'fixed', overflow: 'hidden', animation: 'vnd_overlay_in .2s ease' }}>
      <div className="absolute inset-0 bg-black/50" style={{ position: 'fixed', width: '100vw', height: '100vh' }} onClick={!submitting ? onClose : undefined} />
      <div className="relative z-10 flex items-center justify-center p-4" style={{ height: '100vh' }}>
        <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 460, boxShadow: '0 32px 80px rgba(0,0,0,.28)', overflow: 'hidden', animation: 'vnd_modal_in .3s cubic-bezier(.16,1,.3,1)', position: 'relative' }} onClick={e => e.stopPropagation()}>

          {/* Gradient header — teal */}
          <div style={{ background: 'linear-gradient(135deg,#0c6e67 0%,#0f766e 45%,#0d9488 100%)', padding: '20px 24px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,.18)', border: '1.5px solid rgba(255,255,255,.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Send size={17} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>Submit NOC</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{nocIdDisplay}</div>
                </div>
              </div>
              <button onClick={!submitting ? onClose : undefined} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '22px 24px 24px', background: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
              <AlertCircle size={14} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 12, color: '#065f46', lineHeight: 1.6 }}>
                Once submitted, the NOC will be pending approval. Please fill in the application details before submitting.
              </p>
            </div>

            <ModalField label="Application Number" required error={errors.appNumber}>
              <input
                type="text"
                placeholder="e.g. APP-2026-00123"
                value={appNumber}
                onChange={e => { setAppNumber(e.target.value); setErrors(p => ({ ...p, appNumber: '' })); }}
                style={baseInput(!!errors.appNumber)}
                onFocus={e => { e.target.style.borderColor = '#0f766e'; e.target.style.boxShadow = '0 0 0 3px rgba(15,118,110,.1)'; }}
                onBlur={e => { e.target.style.borderColor = errors.appNumber ? '#fca5a5' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                autoFocus
              />
            </ModalField>

            <ModalField label="Application Date" required error={errors.appDate}>
              <input
                type="date"
                value={appDate}
                onChange={e => { setAppDate(e.target.value); setErrors(p => ({ ...p, appDate: '' })); }}
                style={baseInput(!!errors.appDate)}
                onFocus={e => { e.target.style.borderColor = '#0f766e'; e.target.style.boxShadow = '0 0 0 3px rgba(15,118,110,.1)'; }}
                onBlur={e => { e.target.style.borderColor = errors.appDate ? '#fca5a5' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              />
            </ModalField>

            {errors.api && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 8, fontSize: 12.5, color: '#dc2626', fontWeight: 500 }}>
                <AlertCircle size={13} style={{ flexShrink: 0 }} /> {errors.api}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 4, justifyContent: 'flex-end' }}>
              <button onClick={!submitting ? onClose : undefined} disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 9, background: '#fff', border: '2px solid #94a3b8', color: '#475569', fontSize: 13, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 9, border: 'none', background: submitting ? '#d1d5db' : 'linear-gradient(135deg,#0f766e,#0d9488)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: submitting ? 'none' : '0 2px 8px rgba(15,118,110,.3)', fontFamily: 'inherit', transition: 'all .15s' }}>
                {submitting ? <><Loader2 size={13} style={{ animation: 'vnd_spin .7s linear infinite' }} /> Submitting…</> : <><Send size={13} /> Submit NOC</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── APPROVE MODAL ────────────────────────────────────────────────────────────

const ApproveModal = ({ nocId, nocIdDisplay, onClose, onSuccess }) => {
  const [nocNumber, setNocNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTill, setValidTill] = useState('');
  const [errors,    setErrors]    = useState({});
  const [approving, setApproving] = useState(false);

  const validate = () => {
    const e = {};
    if (!nocNumber.trim()) e.nocNumber = 'NOC number is required.';
    if (!issueDate)        e.issueDate = 'Issue date is required.';
    if (!validFrom)        e.validFrom = 'Valid from date is required.';
    if (!validTill)        e.validTill = 'Valid till date is required.';
    if (validFrom && validTill && new Date(validTill) <= new Date(validFrom))
      e.validTill = 'Valid till must be after valid from.';
    return e;
  };

  const handleApprove = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setApproving(true);
    try {
      await approveNoc(
        nocId,
        nocNumber,
        toISODate(issueDate),
        toISODate(validFrom),
        toISODate(validTill),
      );
      onSuccess();
    } catch (err) {
      // Service layer already parses the error into a clean string
      setErrors({ api: err.message || 'Failed to approve NOC. Please try again.' });
    } finally {
      setApproving(false);
    }
  };

  const focusGreen = (e) => { e.target.style.borderColor = '#059669'; e.target.style.boxShadow = '0 0 0 3px rgba(5,150,105,.1)'; };
  const blurField  = (key) => (e) => { e.target.style.borderColor = errors[key] ? '#fca5a5' : '#e2e8f0'; e.target.style.boxShadow = 'none'; };

  return (
    <div className="fixed inset-0 z-[10000]" style={{ position: 'fixed', overflow: 'hidden', animation: 'vnd_overlay_in .2s ease' }}>
      <div className="absolute inset-0 bg-black/50" style={{ position: 'fixed', width: '100vw', height: '100vh' }} onClick={!approving ? onClose : undefined} />
      <div className="relative z-10 flex items-center justify-center p-4" style={{ height: '100vh' }}>
        <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, boxShadow: '0 32px 80px rgba(0,0,0,.28)', overflow: 'hidden', animation: 'vnd_modal_in .3s cubic-bezier(.16,1,.3,1)', position: 'relative' }} onClick={e => e.stopPropagation()}>

          {/* Gradient header — green */}
          <div style={{ background: 'linear-gradient(135deg,#047857 0%,#059669 50%,#0d9488 100%)', padding: '20px 24px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,.18)', border: '1.5px solid rgba(255,255,255,.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ThumbsUp size={17} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>Approve NOC</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{nocIdDisplay}</div>
                </div>
              </div>
              <button onClick={!approving ? onClose : undefined} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '22px 24px 24px', background: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
              <AlertCircle size={14} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 12, color: '#065f46', lineHeight: 1.6 }}>
                Fill in the approval details. Once approved, the NOC will be marked active and the validity period will be recorded.
              </p>
            </div>

            <ModalField label="NOC Number" required error={errors.nocNumber}>
              <input type="text" placeholder="e.g. NOC/2026/00123" value={nocNumber}
                onChange={e => { setNocNumber(e.target.value); setErrors(p => ({ ...p, nocNumber: '' })); }}
                style={baseInput(!!errors.nocNumber)} onFocus={focusGreen} onBlur={blurField('nocNumber')} autoFocus />
            </ModalField>

            <ModalField label="Issue Date" required error={errors.issueDate}>
              <input type="date" value={issueDate}
                onChange={e => { setIssueDate(e.target.value); setErrors(p => ({ ...p, issueDate: '' })); }}
                style={baseInput(!!errors.issueDate)} onFocus={focusGreen} onBlur={blurField('issueDate')} />
            </ModalField>

            {/* Valid From + Valid Till side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <ModalField label="Valid From" required error={errors.validFrom}>
                <input type="date" value={validFrom}
                  onChange={e => { setValidFrom(e.target.value); setErrors(p => ({ ...p, validFrom: '' })); }}
                  style={baseInput(!!errors.validFrom)} onFocus={focusGreen} onBlur={blurField('validFrom')} />
              </ModalField>
              <ModalField label="Valid Till" required error={errors.validTill}>
                <input type="date" value={validTill}
                  onChange={e => { setValidTill(e.target.value); setErrors(p => ({ ...p, validTill: '' })); }}
                  style={baseInput(!!errors.validTill)} onFocus={focusGreen} onBlur={blurField('validTill')} />
              </ModalField>
            </div>

            {errors.api && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 8, fontSize: 12.5, color: '#dc2626', fontWeight: 500 }}>
                <AlertCircle size={13} style={{ flexShrink: 0 }} /> {errors.api}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 4, justifyContent: 'flex-end' }}>
              <button onClick={!approving ? onClose : undefined} disabled={approving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 9, background: '#fff', border: '2px solid #94a3b8', color: '#475569', fontSize: 13, fontWeight: 600, cursor: approving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={handleApprove} disabled={approving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 9, border: 'none', background: approving ? '#d1d5db' : 'linear-gradient(135deg,#059669,#047857)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: approving ? 'not-allowed' : 'pointer', boxShadow: approving ? 'none' : '0 2px 8px rgba(5,150,105,.3)', fontFamily: 'inherit', transition: 'all .15s' }}>
                {approving ? <><Loader2 size={13} style={{ animation: 'vnd_spin .7s linear infinite' }} /> Approving…</> : <><ThumbsUp size={13} /> Confirm Approve</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── REJECT MODAL ─────────────────────────────────────────────────────────────

const RejectModal = ({ nocId, nocIdDisplay, onClose, onSuccess }) => {
  const [reason,    setReason]    = useState('');
  const [error,     setError]     = useState('');
  const [apiError,  setApiError]  = useState('');
  const [rejecting, setRejecting] = useState(false);

  const handleReject = async () => {
    if (!reason.trim()) { setError('Please provide a reason for rejection.'); return; }
    setError(''); setApiError('');
    setRejecting(true);
    try {
      await rejectNoc(nocId, reason);
      onSuccess();
    } catch (err) {
      // Service layer already parses the error into a clean string
      setApiError(err.message || 'Failed to reject NOC. Please try again.');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000]" style={{ position: 'fixed', overflow: 'hidden', animation: 'vnd_overlay_in .2s ease' }}>
      <div className="absolute inset-0 bg-black/50" style={{ position: 'fixed', width: '100vw', height: '100vh' }} onClick={!rejecting ? onClose : undefined} />
      <div className="relative z-10 flex items-center justify-center p-4" style={{ height: '100vh' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '28px 28px 24px', width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,.24)', animation: 'vnd_modal_in .3s cubic-bezier(.16,1,.3,1)', position: 'relative' }} onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div style={{ fontSize: 17, fontWeight: 800, color: '#1e293b', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fef2f2', border: '1.5px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ThumbsDown size={18} color="#dc2626" />
            </div>
            Reject NOC
          </div>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20, lineHeight: 1.6 }}>
            Please provide a reason for rejection. This will be recorded in the NOC history and visible to the team.
          </p>

          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
            Rejection Reason <span style={{ color: '#dc2626' }}>*</span>
          </div>
          <textarea
            style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${error ? '#fca5a5' : '#e2e8f0'}`, borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: '#1e293b', resize: 'vertical', minHeight: 90, outline: 'none', transition: 'border-color .15s, box-shadow .15s', boxSizing: 'border-box', background: '#fff' }}
            placeholder="e.g. Incomplete documentation, incorrect applicant details…"
            value={reason}
            onChange={e => { setReason(e.target.value); setError(''); }}
            onFocus={e => { e.target.style.borderColor = '#dc2626'; e.target.style.boxShadow = '0 0 0 3px rgba(220,38,38,.1)'; }}
            onBlur={e => { e.target.style.borderColor = error ? '#fca5a5' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
            autoFocus
          />
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#dc2626', marginTop: 6, fontWeight: 500 }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}
          {apiError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginTop: 10, fontSize: 12.5, color: '#dc2626', fontWeight: 500 }}>
              <AlertCircle size={13} style={{ flexShrink: 0 }} /> {apiError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button onClick={() => { if (!rejecting) onClose(); }} disabled={rejecting} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: '#fff', border: '2px solid #94a3b8', color: '#475569', fontSize: 13, fontWeight: 600, cursor: rejecting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
            <button onClick={handleReject} disabled={rejecting || !reason.trim()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 15px', borderRadius: 8, border: 'none', background: rejecting || !reason.trim() ? '#d1d5db' : 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: rejecting || !reason.trim() ? 'not-allowed' : 'pointer', boxShadow: rejecting || !reason.trim() ? 'none' : '0 2px 8px rgba(220,38,38,.25)', fontFamily: 'inherit', transition: 'all .15s' }}>
              {rejecting ? <><Loader2 size={13} style={{ animation: 'vnd_spin .7s linear infinite' }} /> Rejecting…</> : <><ThumbsDown size={13} /> Confirm Reject</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── UPDATE NOC MODAL ─────────────────────────────────────────────────────────

const UpdateNocModal = ({ noc, nocIdDisplay, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    noc_number:         noc.noc_number         || '',
    application_number: noc.application_number || '',
    application_date:   toDateInputValue(noc.application_date),
    issue_date:         toDateInputValue(noc.issue_date),
    valid_from:         toDateInputValue(noc.valid_from),
    valid_till:         toDateInputValue(noc.valid_till),
    applicant_name:     noc.applicant_name     || '',
    applicant_type:     noc.applicant_type     || '',
    company_name:       noc.company_name       || '',
    contact_info:       noc.contact_info       || '',
    address:            noc.address            || '',
    state:              noc.state              || '',
    city:               noc.city               || '',
    pincode:            noc.pincode            || '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set     = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const clearErr = (key)    => setErrors(p => ({ ...p, [key]: '' }));

  const validate = () => {
    const e = {};
    if (!form.applicant_name.trim()) e.applicant_name = 'Applicant name is required.';
    if (form.valid_from && form.valid_till && new Date(form.valid_till) <= new Date(form.valid_from))
      e.valid_till = 'Valid till must be after valid from.';
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setSaving(true);
    try {
      const payload = {
        ...(form.noc_number         && { noc_number:         form.noc_number.trim()          }),
        ...(form.application_number && { application_number: form.application_number.trim()  }),
        ...(form.application_date   && { application_date:   toISODate(form.application_date) }),
        ...(form.issue_date         && { issue_date:         toISODate(form.issue_date)       }),
        ...(form.valid_from         && { valid_from:         toISODate(form.valid_from)       }),
        ...(form.valid_till         && { valid_till:         toISODate(form.valid_till)       }),
        applicant_name: form.applicant_name.trim(),
        ...(form.applicant_type     && { applicant_type:     parseInt(form.applicant_type, 10) }),
        ...(form.company_name       && { company_name:       form.company_name.trim()         }),
        ...(form.contact_info       && { contact_info:       form.contact_info.trim()         }),
        address: form.address?.trim() || '',
        state:   form.state?.trim()   || '',
        city:    form.city?.trim()    || '',
        pincode: form.pincode?.trim() || '',
      };
      await updateNoc(noc.id, payload);
      onSuccess();
    } catch (err) {
      setErrors({ api: err.message || 'Failed to update NOC. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const focusBlue = (e)    => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,.1)'; };
  const blurField = (key) => (e) => { e.target.style.borderColor = errors[key] ? '#fca5a5' : '#e2e8f0'; e.target.style.boxShadow = 'none'; };

  // Shared input props builder
  const inp = (key, extra = {}) => ({
    value:    form[key],
    onChange: (e) => { set(key, e.target.value); clearErr(key); },
    style:    baseInput(!!errors[key]),
    onFocus:  focusBlue,
    onBlur:   blurField(key),
    ...extra,
  });

  // Small section divider used inside the modal body
  const SecHdr = ({ icon: Icon, label, color, bg }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '.1em', padding: '4px 0 10px', borderBottom: '1.5px solid #f0f4f8', marginBottom: 14, marginTop: 4 }}>
      <div style={{ width: 24, height: 24, borderRadius: 7, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={12} color={color} />
      </div>
      {label}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[10000]" style={{ position: 'fixed', overflow: 'hidden', animation: 'vnd_overlay_in .2s ease' }}>
      <div className="absolute inset-0 bg-black/50" style={{ position: 'fixed', width: '100vw', height: '100vh' }} onClick={!saving ? onClose : undefined} />
      <div className="relative z-10 flex items-center justify-center p-4" style={{ height: '100vh' }}>
        <div
          style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 640, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,.28)', overflow: 'hidden', animation: 'vnd_modal_in .3s cubic-bezier(.16,1,.3,1)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── Gradient header — blue ── */}
          <div style={{ background: 'linear-gradient(135deg,#1d4ed8 0%,#2563eb 45%,#3b82f6 100%)', padding: '20px 24px 18px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,.18)', border: '1.5px solid rgba(255,255,255,.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Edit2 size={17} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>Update NOC</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{nocIdDisplay}</div>
                </div>
              </div>
              <button onClick={!saving ? onClose : undefined} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <X size={15} />
              </button>
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div style={{ padding: '22px 24px 8px', background: '#fafafa', overflowY: 'auto', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', marginBottom: 22 }}>
              <AlertCircle size={14} color="#2563eb" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
                Edit the NOC details below. Applicant name is the only required field — all other fields are optional updates.
              </p>
            </div>

            {/* Section: NOC References */}
            <SecHdr icon={ClipboardCheck} label="NOC References" color="#2563eb" bg="#eff6ff" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <ModalField label="NOC Number" error={errors.noc_number}>
                <input type="text" placeholder="e.g. NOC/2026/00123" {...inp('noc_number')} />
              </ModalField>
              <ModalField label="Application Number" error={errors.application_number}>
                <input type="text" placeholder="e.g. APP-2026-00123" {...inp('application_number')} />
              </ModalField>
              <ModalField label="Application Date" error={errors.application_date}>
                <input type="date" {...inp('application_date')} />
              </ModalField>
              <ModalField label="Issue Date" error={errors.issue_date}>
                <input type="date" {...inp('issue_date')} />
              </ModalField>
            </div>

            {/* Section: Validity Period */}
            <SecHdr icon={Calendar} label="Validity Period" color="#7c3aed" bg="#faf5ff" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <ModalField label="Valid From" error={errors.valid_from}>
                <input type="date" {...inp('valid_from')} />
              </ModalField>
              <ModalField label="Valid Till" error={errors.valid_till}>
                <input type="date" {...inp('valid_till')} />
              </ModalField>
            </div>

            {/* Section: Applicant Details */}
            <SecHdr icon={User} label="Applicant Details" color="#0f766e" bg="#f0fdf4" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <ModalField label="Applicant Name" required error={errors.applicant_name}>
                <input type="text" placeholder="Full applicant name" {...inp('applicant_name')} autoFocus />
              </ModalField>
              <ModalField label="Applicant Type" error={errors.applicant_type}>
                <select
                  value={form.applicant_type}
                  onChange={e => { set('applicant_type', e.target.value); clearErr('applicant_type'); }}
                  style={{ ...baseInput(!!errors.applicant_type), appearance: 'auto' }}
                  onFocus={focusBlue}
                  onBlur={blurField('applicant_type')}
                >
                  <option value="">Select type…</option>
                  <option value="1">Individual</option>
                  <option value="2">Company</option>
                  <option value="3">Government</option>
                  <option value="4">NGO</option>
                </select>
              </ModalField>
              <ModalField label="Company Name" error={errors.company_name}>
                <input type="text" placeholder="Company / organisation name" {...inp('company_name')} />
              </ModalField>
              <ModalField label="Contact Info" error={errors.contact_info}>
                <input type="text" placeholder="Phone or email" {...inp('contact_info')} />
              </ModalField>
            </div>

            {/* Section: Location */}
            <SecHdr icon={MapPin} label="Location Details" color="#7c3aed" bg="#faf5ff" />
            <ModalField label="Address" error={errors.address}>
              <input type="text" placeholder="Street address" {...inp('address')} />
            </ModalField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <ModalField label="City" error={errors.city}>
                <input type="text" placeholder="City" {...inp('city')} />
              </ModalField>
              <ModalField label="State" error={errors.state}>
                <input type="text" placeholder="State" {...inp('state')} />
              </ModalField>
              <ModalField label="Pincode" error={errors.pincode}>
                <input type="text" placeholder="6-digit pincode" {...inp('pincode')} />
              </ModalField>
            </div>

            {/* API error banner */}
            {errors.api && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '11px 14px', marginBottom: 8, fontSize: 12.5, color: '#dc2626', fontWeight: 500 }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>Update failed</div>
                  <div>{errors.api}</div>
                </div>
              </div>
            )}
          </div>

          {/* ── Sticky footer ── */}
          <div style={{ padding: '14px 24px', borderTop: '1.5px solid #f0f4f8', background: '#fff', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
            <button onClick={!saving ? onClose : undefined} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 9, background: '#fff', border: '2px solid #94a3b8', color: '#475569', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 22px', borderRadius: 9, border: 'none', background: saving ? '#d1d5db' : 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 2px 8px rgba(37,99,235,.3)', fontFamily: 'inherit', transition: 'all .15s' }}>
              {saving ? <><Loader2 size={13} style={{ animation: 'vnd_spin .7s linear infinite' }} /> Saving…</> : <><Save size={13} /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── REAPPLY NOC MODAL ────────────────────────────────────────────────────────
// Multi-step: confirm → loading → done (with new NOC preview + redirect) | error

const ReapplyModal = ({ nocId, nocIdDisplay, onClose, onSuccess, onViewNew }) => {
  const [step,     setStep]    = useState('confirm'); // 'confirm' | 'loading' | 'done' | 'error'
  const [newNoc,   setNewNoc]  = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleReapply = async () => {
    setStep('loading');
    try {
      const res = await reapplyNoc(nocId);
      // Service returns response.data — the newly created NOC object
      const created = res?.data || res;
      setNewNoc(created);
      setStep('done');
    } catch (err) {
      // Map raw backend/service errors to user-friendly messages
      const raw = err.message || '';
      let friendly = raw;
      if (!raw || raw === 'Failed to reapply NOC. Please try again.') {
        friendly = 'Something went wrong while creating the reapplication. Please refresh and try again.';
      } else if (raw.toLowerCase().includes('id is required') || raw.toLowerCase().includes('noc id is required')) {
        friendly = 'Could not identify this NOC. Please refresh the page and try again.';
      } else if (raw.toLowerCase().includes('already') || raw.toLowerCase().includes('duplicate')) {
        friendly = 'A reapplication already exists for this NOC. Check the NOC list for your draft.';
      } else if (raw.toLowerCase().includes('not rejected') || raw.toLowerCase().includes('status')) {
        friendly = 'Only rejected NOCs can be reapplied. This NOC may have already changed status.';
      }
      setErrorMsg(friendly);
      setStep('error');
    }
  };

  const newNocId = newNoc
    ? (newNoc.noc_id || (newNoc.id ? `NOC-${String(newNoc.id).padStart(5, '0')}` : null))
    : null;

  return (
    <div className="fixed inset-0 z-[10000]" style={{ position: 'fixed', overflow: 'hidden', animation: 'vnd_overlay_in .2s ease' }}>
      <div className="absolute inset-0 bg-black/50" style={{ position: 'fixed', width: '100vw', height: '100vh' }} onClick={step !== 'loading' ? onClose : undefined} />
      <div className="relative z-10 flex items-center justify-center p-4" style={{ height: '100vh' }}>
        <div
          style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 460, boxShadow: '0 32px 80px rgba(0,0,0,.28)', overflow: 'hidden', animation: 'vnd_modal_in .3s cubic-bezier(.16,1,.3,1)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── Gradient header — indigo/purple ── */}
          <div style={{ background: 'linear-gradient(135deg,#4338ca 0%,#6366f1 50%,#818cf8 100%)', padding: '20px 24px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,.18)', border: '1.5px solid rgba(255,255,255,.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <RotateCcw size={17} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>Reapply NOC</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{nocIdDisplay}</div>
                </div>
              </div>
              {step !== 'loading' && (
                <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* ── STEP: confirm ── */}
          {step === 'confirm' && (
            <div style={{ padding: '22px 24px 24px', background: '#fafafa' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
                <AlertCircle size={14} color="#6366f1" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: 12, color: '#3730a3', lineHeight: 1.6 }}>
                  This will create a <strong>new Draft NOC</strong> from <strong>{nocIdDisplay}</strong>. The original rejected NOC stays in the system. You can then edit and submit the new one.
                </p>
              </div>

              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>What happens next</div>
                {[
                  { dot: '🔄', text: 'A new NOC is created in Draft status with an R- prefix' },
                  { dot: '📋', text: 'All details are copied from this rejected NOC' },
                  { dot: '✏️', text: 'You can update and submit the new NOC for re-approval' },
                ].map(({ dot, text }, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < 2 ? 8 : 0 }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>{dot}</span>
                    <span style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{text}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 9, background: '#fff', border: '2px solid #94a3b8', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancel
                </button>
                <button onClick={handleReapply} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#4338ca,#6366f1)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,.35)', fontFamily: 'inherit' }}>
                  <RotateCcw size={13} /> Confirm Reapply
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: loading ── */}
          {step === 'loading' && (
            <div style={{ padding: '44px 24px', background: '#fafafa', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#6366f1', animation: 'vnd_spin .75s linear infinite' }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Creating reapplication…</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Please wait while we set up your new NOC draft.</div>
            </div>
          )}

          {/* ── STEP: done ── */}
          {step === 'done' && (
            <div style={{ padding: '22px 24px 24px', background: '#fafafa' }}>
              {/* Success icon + title */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingBottom: 20 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#ecfdf5', border: '2px solid #6ee7b7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <CheckCircle size={26} color="#059669" />
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>Reapplication Created!</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                  A new Draft NOC has been created. You can now view, edit, and submit it.
                </div>
              </div>

              {/* New NOC preview card */}
              {newNoc && (
                <div style={{ background: '#fff', border: '1.5px solid #c7d2fe', borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>New NOC Created</div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#4338ca,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ClipboardCheck size={16} color="#fff" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', fontFamily: 'monospace' }}>{newNocId || '—'}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Draft · Ready to edit &amp; submit</div>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 20, padding: '3px 9px', fontSize: 11, fontWeight: 700, color: '#64748b', flexShrink: 0 }}>
                      <FileText size={10} /> Draft
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {[
                      { label: 'NOC Type',  value: newNoc.noc_type_name  || '—' },
                      { label: 'Authority', value: newNoc.authority_name || '—' },
                      { label: 'Applicant', value: newNoc.applicant_name || '—' },
                      { label: 'Created',   value: fmtDate(newNoc.created_at) },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: '#f8fafc', borderRadius: 8, padding: '7px 10px' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', wordBreak: 'break-word' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { onSuccess(); onClose(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, background: '#fff', border: '2px solid #e2e8f0', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Close
                </button>
                {newNoc?.id && (
                  <button
                    onClick={() => { onClose(); onViewNew(newNoc.id); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#4338ca,#6366f1)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,.35)', fontFamily: 'inherit' }}
                  >
                    <ClipboardCheck size={13} /> View New NOC
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── STEP: error ── */}
          {step === 'error' && (
            <div style={{ padding: '22px 24px 24px', background: '#fafafa' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingBottom: 20 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fef2f2', border: '2px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <XCircle size={26} color="#dc2626" />
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>Reapply Failed</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>The reapplication could not be created.</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 12, padding: '12px 14px', marginBottom: 20 }}>
                <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', marginBottom: 3 }}>Error Details</div>
                  <div style={{ fontSize: 12, color: '#b91c1c', lineHeight: 1.6 }}>{errorMsg}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, background: '#fff', border: '2px solid #e2e8f0', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Close
                </button>
                <button
                  onClick={() => { setStep('confirm'); setErrorMsg(''); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#4338ca,#6366f1)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,.3)', fontFamily: 'inherit' }}
                >
                  <RotateCcw size={13} /> Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Quick Info Card ──────────────────────────────────────────────────────────

const QuickInfoCard = ({ noc }) => {
  const [activeTab, setActiveTab] = useState('info');
  const histories = noc.histories || [];

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e8ecf2', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
      <div style={{ padding: '13px 16px 0', borderBottom: '1.5px solid #f0f4f8' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 10 }}>Quick Info</div>
        <div style={{ display: 'flex', gap: 0 }}>
          {[{ key: 'info', label: '📌 Details' }, { key: 'history', label: '🕐 History' }].map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{ flex: 1, padding: '8px 4px 10px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', color: activeTab === key ? '#0f766e' : '#94a3b8', borderBottom: activeTab === key ? '2.5px solid #0f766e' : '2.5px solid transparent', transition: 'all .15s' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Details tab */}
      {activeTab === 'info' && (
        <div style={{ padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Applicant */}
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid #e8ecf2' }}>
            <div style={{ background: '#f8fafc', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 7, borderBottom: '1px solid #f0f4f8' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#0f766e,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><User size={11} color="#fff" /></div>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '.1em' }}>Applicant</span>
            </div>
            <div style={{ padding: '10px 12px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{noc.applicant_name || '—'}</div>
              {noc.applicant_type_display && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b', marginBottom: 3 }}><Briefcase size={10} style={{ flexShrink: 0 }} /> {noc.applicant_type_display}</div>}
              {noc.company_name && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b', marginBottom: 3 }}><Building2 size={10} style={{ flexShrink: 0 }} /> {noc.company_name}</div>}
              {noc.contact_info && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b' }}><Phone size={10} style={{ flexShrink: 0 }} /> {noc.contact_info}</div>}
            </div>
          </div>

          {/* NOC Details */}
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid #bbf7d0' }}>
            <div style={{ background: '#f0fdf4', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 7, borderBottom: '1px solid #d1fae5' }}>
              <div style={{ width: 22, height: 22, borderRadius: 7, background: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ClipboardCheck size={11} color="#fff" /></div>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '.1em' }}>NOC Details</span>
            </div>
            <div style={{ padding: '10px 12px', background: '#fafffe', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[{ label: 'NOC Type', value: noc.noc_type_name || '—' }, { label: 'Authority', value: noc.authority_name || '—' }, { label: 'Client', value: noc.client_name || '—' }, { label: 'Project', value: noc.project_name || '—' }].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Key Dates */}
          <div style={{ borderRadius: 12, border: '1.5px solid #e8ecf2', overflow: 'hidden' }}>
            <div style={{ background: '#f8fafc', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 7, borderBottom: '1px solid #f0f4f8' }}>
              <div style={{ width: 22, height: 22, borderRadius: 7, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Calendar size={11} color="#fff" /></div>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '.1em' }}>Key Dates</span>
            </div>
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[{ label: 'Applied On', value: fmtDate(noc.application_date || noc.created_at) }, { label: 'Issue Date', value: fmtDate(noc.issue_date) }, { label: 'Valid From', value: fmtDate(noc.valid_from) }, { label: 'Valid Till', value: fmtDate(noc.valid_till) }, { label: 'Last Updated', value: fmtDate(noc.updated_at) }].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Created by */}
          {noc.created_by_name && (
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '8px 12px', border: '1px solid #e8ecf2', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#0f766e,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{noc.created_by_name.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' }}>Created by</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{noc.created_by_name}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {activeTab === 'history' && (() => {
        if (histories.length === 0) {
          return <div style={{ padding: '28px 14px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>No history events yet.</div>;
        }
        return (
          <div style={{ padding: '14px 14px', position: 'relative', maxHeight: 440, overflowY: 'auto' }}>
            <div style={{ position: 'absolute', left: 33, top: 24, bottom: 24, width: 2, background: 'linear-gradient(to bottom,#0d9488 0%,#e2e8f0 100%)', borderRadius: 2, zIndex: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative', zIndex: 1 }}>
              {histories.map((ev, i) => {
                const style  = getHistoryEventStyle(ev.event_display, ev.new_status);
                const newSt  = ev.new_status_display ? getStatus(ev.new_status_display || ev.new_status) : null;
                const isLast = i === histories.length - 1;
                return (
                  <div key={ev.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingBottom: isLast ? 0 : 16 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: style.bg, border: `2px solid ${style.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 0 3px #fff', fontSize: 13 }}>{style.dot}</div>
                    <div style={{ flex: 1, paddingTop: 4, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: style.color, lineHeight: 1.4, marginBottom: 2, wordBreak: 'break-word' }}>{ev.event_display || ev.event || 'Event'}</div>
                      {ev.new_status_display && newSt && (
                        <div style={{ marginBottom: 3 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: newSt.bg, color: newSt.color, border: `1px solid ${newSt.border}`, fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20 }}>
                            {ev.old_status_display && <><span style={{ opacity: .6 }}>{ev.old_status_display}</span> → </>}{ev.new_status_display}
                          </span>
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500, marginBottom: 2 }}>{fmtDateTime(ev.created_at)}</div>
                      {ev.remark && <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', lineHeight: 1.5, background: '#f8fafc', borderRadius: 6, padding: '4px 8px', marginTop: 2 }}>{ev.remark}</div>}
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

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ViewNocDetails({ onUpdateNavigation }) {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [noc,        setNoc]        = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [visible,    setVisible]    = useState(false);

  // Modal visibility
  const [showSubmitModal,  setShowSubmitModal]  = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal,  setShowRejectModal]  = useState(false);
  const [showUpdateModal,  setShowUpdateModal]  = useState(false);
  const [showReapplyModal, setShowReapplyModal] = useState(false);

  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    onUpdateNavigation?.({ breadcrumbs: ['NOC', 'NOC Details'] });
    return () => onUpdateNavigation?.(null);
  }, [onUpdateNavigation]);

  const fetchData = useCallback(async () => {
    if (!id) { setFetchError('No NOC ID provided'); setLoading(false); return; }
    setLoading(true); setFetchError('');
    try {
      const res = await getNocById(id);
      if (res.status !== 'success' || !res.data) throw new Error('Failed to load NOC');
      setNoc(res.data);
      setTimeout(() => setVisible(true), 60);
    } catch (e) {
      setFetchError(e.message || 'Failed to load NOC details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); window.scrollTo(0, 0); }, [fetchData]);

  // Scroll-lock when any modal is open
  useEffect(() => {
    const anyOpen = showSubmitModal || showApproveModal || showRejectModal || showUpdateModal || showReapplyModal;
    document.body.style.overflow = anyOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showSubmitModal, showApproveModal, showRejectModal, showUpdateModal, showReapplyModal]);

  // Auto-dismiss success toast
  useEffect(() => {
    if (!actionSuccess) return;
    const t = setTimeout(() => setActionSuccess(''), 3500);
    return () => clearTimeout(t);
  }, [actionSuccess]);

  // ── Modal success callbacks ─────────────────────────────────────────────────

  const onSubmitSuccess = async () => {
    setShowSubmitModal(false);
    setActionSuccess('NOC submitted successfully!');
    await fetchData();
  };
  const onApproveSuccess = async () => {
    setShowApproveModal(false);
    setActionSuccess('NOC approved successfully!');
    await fetchData();
  };
  const onRejectSuccess = async () => {
    setShowRejectModal(false);
    setActionSuccess('NOC rejected successfully!');
    await fetchData();
  };
  const onUpdateSuccess = async () => {
    setShowUpdateModal(false);
    setActionSuccess('NOC updated successfully!');
    await fetchData();
  };
  // Reapply creates a NEW NOC — current NOC stays Rejected. Just show the toast.
  const onReapplySuccess = () => {
    setActionSuccess('Reapplication created! Check the NOC list for your new draft.');
  };
  // Navigate to the newly created NOC details page
  const onViewNewNoc = (newId) => {
    navigate(`/noc/${newId}`);
  };

  // ── Render guards ───────────────────────────────────────────────────────────

  if (loading)    return <LoadingView />;
  if (fetchError) return <ErrorView message={fetchError} onRetry={fetchData} onBack={() => navigate('/noc')} />;
  if (!noc)       return <ErrorView message="NOC not available." onRetry={fetchData} onBack={() => navigate('/noc')} />;

  // ── Derived values ──────────────────────────────────────────────────────────

  const status       = getStatus(noc.status_display || String(noc.status || ''));
  // ✅ Show noc_id from API (e.g. "NOC-202603-2"), fall back gracefully
  const nocIdDisplay = noc.noc_id || noc.noc_number || `NOC-${String(noc.id).padStart(5, '0')}`;

  const statusInt   = parseInt(noc.status || 0);
  const isDraft     = statusInt === 1;
  const isSubmitted = statusInt === 2;
  const isApproved  = statusInt === 3;
  const isRejected  = statusInt === 4;
  const isExpired   = statusInt === 5;

  // Update allowed for Draft & Submitted; not for terminal states (Approved/Rejected/Expired)
  const canUpdate   = isDraft || isSubmitted;

  const fullAddress = [noc.address, noc.city, noc.state, noc.pincode].filter(Boolean).join(', ');

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        .vnd-root *{box-sizing:border-box;font-family:'Outfit',sans-serif}
        @keyframes vnd_spin{to{transform:rotate(360deg)}}
        @keyframes vnd_in{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes vnd_toast_in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes vnd_overlay_in{from{opacity:0}to{opacity:1}}
        @keyframes vnd_modal_in{from{opacity:0;transform:scale(.93) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .vnd-root{min-height:100vh;padding:0}
        .vnd-topbar{display:flex;align-items:center;justify-content:space-between;margin:0 0 16px;flex-wrap:wrap;gap:8px}
        .vnd-back{display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;font-size:13px;font-weight:600;color:#475569;padding:6px 10px;border-radius:8px;transition:background .15s,color .15s}
        .vnd-back:hover{background:#e2e8f0;color:#1e293b}
        .vnd-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
        .vnd-btn-divider{width:1px;height:24px;background:#e2e8f0;flex-shrink:0}
        /* Update */
        .vnd-btn-update{display:flex;align-items:center;gap:6px;padding:7px 16px;border-radius:8px;background:#fff;border:2px solid #bfdbfe;color:#2563eb;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s}
        .vnd-btn-update:hover:not(:disabled){background:#eff6ff;border-color:#93c5fd;transform:translateY(-1px);box-shadow:0 2px 8px rgba(37,99,235,.15)}
        .vnd-btn-update:disabled{opacity:.45;cursor:not-allowed;transform:none}
        /* Submit */
        .vnd-btn-submit{display:flex;align-items:center;gap:6px;padding:7px 16px;border-radius:8px;background:linear-gradient(135deg,#0f766e,#0d9488);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;box-shadow:0 2px 10px rgba(15,118,110,.3)}
        .vnd-btn-submit:hover:not(:disabled){background:linear-gradient(135deg,#0d6460,#0b7a72);transform:translateY(-1px)}
        .vnd-btn-submit:disabled{opacity:.45;cursor:not-allowed;transform:none;box-shadow:none}
        /* Approve */
        .vnd-btn-approve{display:flex;align-items:center;gap:6px;padding:7px 15px;border-radius:8px;background:linear-gradient(135deg,#059669,#047857);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;box-shadow:0 2px 8px rgba(5,150,105,.25)}
        .vnd-btn-approve:hover:not(:disabled){background:linear-gradient(135deg,#047857,#065f46);box-shadow:0 4px 12px rgba(5,150,105,.35)}
        .vnd-btn-approve:disabled{opacity:.4;cursor:not-allowed;box-shadow:none}
        /* Reject */
        .vnd-btn-reject{display:flex;align-items:center;gap:6px;padding:7px 15px;border-radius:8px;background:linear-gradient(135deg,#dc2626,#b91c1c);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;box-shadow:0 2px 8px rgba(220,38,38,.25)}
        .vnd-btn-reject:hover:not(:disabled){background:linear-gradient(135deg,#b91c1c,#991b1b);box-shadow:0 4px 12px rgba(220,38,38,.35)}
        .vnd-btn-reject:disabled{opacity:.4;cursor:not-allowed;box-shadow:none}
        /* Reapply */
        .vnd-btn-reapply{display:flex;align-items:center;gap:6px;padding:7px 16px;border-radius:8px;background:linear-gradient(135deg,#6366f1,#4f46e5);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;box-shadow:0 2px 10px rgba(99,102,241,.35)}
        .vnd-btn-reapply:hover:not(:disabled){background:linear-gradient(135deg,#4f46e5,#4338ca);transform:translateY(-1px)}
        .vnd-btn-reapply:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}
        /* Document card */
        .vnd-doc{background:#fff;border-radius:20px;box-shadow:0 2px 4px rgba(0,0,0,.04),0 12px 40px rgba(0,0,0,.09);overflow:hidden;opacity:0;transform:translateY(16px);transition:opacity .4s ease,transform .4s ease}
        .vnd-doc.in{opacity:1;transform:translateY(0)}
        .vnd-hdr{display:flex;align-items:flex-end;justify-content:space-between;padding:32px 40px 28px;background:linear-gradient(135deg,#0c6e67 0%,#0f766e 40%,#0d9488 80%,#14b8a6 100%);position:relative;overflow:hidden}
        .vnd-hdr::after{content:'';position:absolute;top:-60px;right:-60px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.06);pointer-events:none}
        .vnd-hdr::before{content:'';position:absolute;bottom:-80px;left:30%;width:300px;height:300px;border-radius:50%;background:rgba(255,255,255,.04);pointer-events:none}
        .vnd-hdr-l{position:relative;z-index:1}
        .vnd-hdr-r{text-align:right;position:relative;z-index:1}
        .vnd-logo{display:flex;align-items:center;gap:12px;margin-bottom:16px}
        .vnd-logo-badge{width:46px;height:46px;border-radius:12px;background:rgba(255,255,255,.15);border:1.5px solid rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center}
        .vnd-co-name{font-size:20px;font-weight:800;color:#fff;letter-spacing:-.02em;line-height:1.1}
        .vnd-co-sub{font-size:12px;color:rgba(255,255,255,.6);font-weight:400;margin-top:2px}
        .vnd-doc-label{font-size:10px;font-weight:800;color:rgba(255,255,255,.55);letter-spacing:.18em;text-transform:uppercase}
        .vnd-doc-num{font-size:24px;font-weight:900;color:#fff;letter-spacing:-.02em;font-variant-numeric:tabular-nums;margin-top:3px}
        .vnd-doc-date{font-size:12px;color:rgba(255,255,255,.6);margin-top:5px;font-weight:400}
        .vnd-meta{display:flex;flex-wrap:wrap;align-items:center;gap:0;padding:14px 40px;background:#f8fafc;border-bottom:1.5px solid #e8ecf2}
        .vnd-meta-sep{width:1px;height:30px;background:#e2e8f0;margin:0 18px;flex-shrink:0}
        .vnd-parties{display:grid;grid-template-columns:1fr 28px 1fr 1fr;padding:28px 40px;gap:0;border-bottom:1.5px solid #f0f4f8;background:#fff}
        .vnd-arrow-col{display:flex;align-items:center;justify-content:center;padding:0 4px;padding-top:36px}
        .vnd-party{padding-right:24px}
        .vnd-party--proj{padding-left:24px;padding-right:24px}
        .vnd-party--auth{padding-left:24px;border-left:1.5px solid #f0f4f8}
        .vnd-plabel{font-size:9.5px;font-weight:800;letter-spacing:.14em;color:#94a3b8;text-transform:uppercase;margin-bottom:10px}
        .vnd-pavatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#0f766e,#0d9488);color:#fff;font-size:18px;font-weight:800;display:flex;align-items:center;justify-content:center;margin-bottom:8px}
        .vnd-picon{width:44px;height:44px;border-radius:10px;background:#f0fdf4;border:1.5px solid #bbf7d0;display:flex;align-items:center;justify-content:center;margin-bottom:8px}
        .vnd-pname{font-size:15px;font-weight:700;color:#1e293b;line-height:1.3;margin-bottom:5px}
        .vnd-pdetail{display:flex;align-items:center;gap:5px;font-size:12px;color:#64748b;margin-bottom:3px;word-break:break-word}
        .vnd-body{display:grid;grid-template-columns:1fr 300px;gap:28px;padding:28px 40px;align-items:start}
        .vnd-main{min-width:0}
        .vnd-section{margin-bottom:24px}
        .vnd-sec-hdr{display:flex;align-items:center;gap:8px;padding-bottom:12px;border-bottom:2px solid #f0f4f8;font-size:13px;font-weight:700;color:#1e293b;margin-bottom:14px}
        .vnd-sec-icon{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .vnd-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .vnd-info-item{display:flex;flex-direction:column;gap:3px}
        .vnd-info-lbl{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em}
        .vnd-info-val{font-size:13px;font-weight:600;color:#1e293b;line-height:1.4}
        .vnd-info-val--accent{color:#0f766e;font-family:monospace;font-size:13px;font-weight:700}
        .vnd-address-block{background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:14px 16px;display:flex;gap:10px;align-items:flex-start}
        .vnd-docs-empty{background:#f8fafc;border:1.5px dashed #e2e8f0;border-radius:12px;padding:24px;text-align:center}
        .vnd-doc-foot{display:flex;justify-content:space-between;align-items:center;padding:14px 40px;background:#f8fafc;border-top:1.5px solid #e8ecf2;font-size:11px;color:#94a3b8}
        .vnd-success-toast{position:fixed;bottom:28px;right:28px;z-index:9999;display:flex;align-items:center;gap:10px;background:#0f766e;color:#fff;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:600;box-shadow:0 8px 24px rgba(15,118,110,.4);animation:vnd_toast_in .3s cubic-bezier(.16,1,.3,1)}
        @media(max-width:800px){
          .vnd-hdr{padding:22px 20px;flex-direction:column}.vnd-hdr-r{text-align:left;margin-top:16px}
          .vnd-meta{padding:12px 20px}.vnd-meta-sep{display:none}
          .vnd-parties{grid-template-columns:1fr;padding:20px;gap:16px}.vnd-arrow-col{display:none}
          .vnd-party--proj,.vnd-party--auth{padding-left:0}.vnd-party--auth{border-left:none;border-top:1.5px solid #f0f4f8;padding-top:16px}
          .vnd-body{grid-template-columns:1fr;padding:20px}
          .vnd-doc-foot{padding:12px 20px;flex-direction:column;gap:4px;text-align:center}
          .vnd-doc-num{font-size:18px}.vnd-info-grid{grid-template-columns:1fr}
        }
      `}</style>

      <div className="vnd-root">

        {/* ── Top bar ── */}
        <div className="vnd-topbar">
          <button className="vnd-back" onClick={() => navigate('/noc')}>
            <ArrowLeft size={15} /> Back to NOCs
          </button>

          <div className="vnd-actions">
            {/* Update — visible for Draft & Submitted */}
            {canUpdate && (
              <button className="vnd-btn-update" onClick={() => setShowUpdateModal(true)} title="Edit NOC details">
                <Edit2 size={14} /> Update NOC
              </button>
            )}

            <div className="vnd-btn-divider" />

            {/* Submit — always rendered, enabled only on Draft */}
            <button className="vnd-btn-submit" onClick={() => setShowSubmitModal(true)} disabled={!isDraft} title={isDraft ? 'Submit NOC for approval' : 'NOC must be in Draft status to submit'}>
              <Send size={14} /> Submit NOC
            </button>

            <div className="vnd-btn-divider" />

            {/* Approve — always rendered, enabled only when Submitted */}
            <button className="vnd-btn-approve" onClick={() => setShowApproveModal(true)} disabled={!isSubmitted} title={isSubmitted ? 'Approve this NOC' : 'NOC must be submitted before it can be approved'}>
              <ThumbsUp size={14} /> Approve
            </button>

            {/* Reject — always rendered, enabled only when Submitted */}
            <button className="vnd-btn-reject" onClick={() => setShowRejectModal(true)} disabled={!isSubmitted} title={isSubmitted ? 'Reject this NOC' : 'NOC must be submitted before it can be rejected'}>
              <ThumbsDown size={14} /> Reject
            </button>

            {/* Reapply — only when Rejected */}
            {isRejected && (
              <>
                <div className="vnd-btn-divider" />
                <button className="vnd-btn-reapply" onClick={() => setShowReapplyModal(true)}>
                  <RotateCcw size={14} /> Reapply
                </button>
              </>
            )}

            {/* Terminal status badges */}
            {isApproved && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#ecfdf5', border: '1.5px solid #6ee7b7', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#059669' }}>
                <CheckCircle size={13} /> NOC Approved
              </div>
            )}
            {isExpired && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
                <AlertTriangle size={13} /> NOC Expired
              </div>
            )}
          </div>
        </div>

        {/* ── Document card ── */}
        <div className={`vnd-doc${visible ? ' in' : ''}`}>

          {/* ══════════ HEADER ══════════ */}
          <div className="vnd-hdr">
            <div className="vnd-hdr-l">
              <div className="vnd-logo">
                <div className="vnd-logo-badge"><ClipboardCheck size={22} color="#fff" /></div>
                <div>
                  <div className="vnd-co-name">ERP System</div>
                  <div className="vnd-co-sub">No Objection Certificate</div>
                </div>
              </div>
              <StatusPill status={status} />
            </div>
            <div className="vnd-hdr-r">
              <div className="vnd-doc-label">NOC Application</div>
              {/* ✅ Displays noc_id from API e.g. "NOC-202603-2" */}
              <div className="vnd-doc-num">{nocIdDisplay}</div>
              <div className="vnd-doc-date">Applied {fmtDate(noc.application_date || noc.created_at)}</div>
            </div>
          </div>

          {/* ══════════ META STRIP ══════════ */}
          <div className="vnd-meta">
            <MetaBlock icon={Calendar} label="Created On"   value={fmtDate(noc.created_at)} />
            <div className="vnd-meta-sep" />
            <MetaBlock icon={Calendar} label="Last Updated" value={fmtDate(noc.updated_at)} />
            <div className="vnd-meta-sep" />
            <MetaBlock icon={Tag}      label="NOC Type"     value={noc.noc_type_name || '—'} />
            <div className="vnd-meta-sep" />
            <MetaBlock icon={Hash}     label="NOC ID"       value={nocIdDisplay} accent />
            {noc.created_by_name && (
              <><div className="vnd-meta-sep" /><MetaBlock icon={User} label="Prepared By" value={noc.created_by_name} /></>
            )}
          </div>

          {/* ══════════ PARTIES ══════════ */}
          <div className="vnd-parties">
            <div className="vnd-party">
              <div className="vnd-plabel">Client</div>
              <div className="vnd-pavatar">{(noc.client_name || 'C').charAt(0).toUpperCase()}</div>
              <div className="vnd-pname">{noc.client_name || `Client #${noc.client}`}</div>
              {noc.project_name && <div className="vnd-pdetail"><Briefcase size={11} style={{ opacity: .45, flexShrink: 0 }} />{noc.project_name}</div>}
            </div>
            <div className="vnd-arrow-col"><ChevronRight size={16} style={{ color: '#cbd5e1' }} /></div>
            <div className="vnd-party vnd-party--proj">
              <div className="vnd-plabel">Applicant</div>
              <div className="vnd-picon"><User size={20} color="#0f766e" /></div>
              <div className="vnd-pname">{noc.applicant_name || '—'}</div>
              {noc.applicant_type_display && <div className="vnd-pdetail"><Tag size={11} style={{ opacity: .45, flexShrink: 0 }} />{noc.applicant_type_display}</div>}
              {noc.company_name  && <div className="vnd-pdetail"><Building2 size={11} style={{ opacity: .45, flexShrink: 0 }} />{noc.company_name}</div>}
              {noc.contact_info  && <div className="vnd-pdetail"><Phone size={11} style={{ opacity: .45, flexShrink: 0 }} />{noc.contact_info}</div>}
            </div>
            <div className="vnd-party vnd-party--auth">
              <div className="vnd-plabel">Issuing Authority</div>
              <div className="vnd-picon" style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe' }}><Building2 size={20} color="#2563eb" /></div>
              <div className="vnd-pname">{noc.authority_name || '—'}</div>
              <div className="vnd-pdetail"><Tag size={11} style={{ opacity: .45, flexShrink: 0 }} />{noc.noc_type_name || '—'}</div>
            </div>
          </div>

          {/* ══════════ BODY ══════════ */}
          <div className="vnd-body">
            <div className="vnd-main">

              {/* NOC Application Details */}
              <div className="vnd-section">
                <div className="vnd-sec-hdr">
                  <div className="vnd-sec-icon" style={{ background: '#ecfdf5' }}><ClipboardCheck size={14} color="#059669" /></div>
                  NOC Application Details
                </div>
                <div className="vnd-info-grid">
                  <div className="vnd-info-item"><div className="vnd-info-lbl">NOC ID</div><div className="vnd-info-val--accent">{nocIdDisplay}</div></div>
                  <div className="vnd-info-item"><div className="vnd-info-lbl">Status</div><div style={{ marginTop: 2 }}><StatusPill status={status} /></div></div>
                  <div className="vnd-info-item"><div className="vnd-info-lbl">NOC Type</div><div className="vnd-info-val">{noc.noc_type_name || '—'}</div></div>
                  <div className="vnd-info-item"><div className="vnd-info-lbl">Authority</div><div className="vnd-info-val">{noc.authority_name || '—'}</div></div>
                  <div className="vnd-info-item"><div className="vnd-info-lbl">Application Date</div><div className="vnd-info-val">{fmtDate(noc.application_date)}</div></div>
                  <div className="vnd-info-item"><div className="vnd-info-lbl">Issue Date</div><div className="vnd-info-val">{fmtDate(noc.issue_date)}</div></div>
                  <div className="vnd-info-item"><div className="vnd-info-lbl">Valid From</div><div className="vnd-info-val">{fmtDate(noc.valid_from)}</div></div>
                  <div className="vnd-info-item">
                    <div className="vnd-info-lbl">Valid Till</div>
                    <div className="vnd-info-val" style={noc.valid_till && isExpired ? { color: '#dc2626' } : {}}>{fmtDate(noc.valid_till)}</div>
                  </div>
                </div>
              </div>

              {/* Applicant Information */}
              <div className="vnd-section">
                <div className="vnd-sec-hdr">
                  <div className="vnd-sec-icon" style={{ background: '#eff6ff' }}><User size={14} color="#2563eb" /></div>
                  Applicant Information
                </div>
                <div className="vnd-info-grid">
                  <div className="vnd-info-item"><div className="vnd-info-lbl">Applicant Name</div><div className="vnd-info-val">{noc.applicant_name || '—'}</div></div>
                  <div className="vnd-info-item"><div className="vnd-info-lbl">Applicant Type</div><div className="vnd-info-val">{noc.applicant_type_display || '—'}</div></div>
                  <div className="vnd-info-item"><div className="vnd-info-lbl">Company Name</div><div className="vnd-info-val">{noc.company_name || '—'}</div></div>
                  <div className="vnd-info-item"><div className="vnd-info-lbl">Contact Info</div><div className="vnd-info-val">{noc.contact_info || '—'}</div></div>
                </div>
              </div>

              {/* Project & Location */}
              <div className="vnd-section">
                <div className="vnd-sec-hdr">
                  <div className="vnd-sec-icon" style={{ background: '#faf5ff' }}><MapPin size={14} color="#7c3aed" /></div>
                  Project &amp; Location
                </div>
                <div className="vnd-info-grid" style={{ marginBottom: 14 }}>
                  <div className="vnd-info-item"><div className="vnd-info-lbl">Client</div><div className="vnd-info-val">{noc.client_name || '—'}</div></div>
                  <div className="vnd-info-item"><div className="vnd-info-lbl">Project</div><div className="vnd-info-val">{noc.project_name || '—'}</div></div>
                </div>
                {fullAddress ? (
                  <div className="vnd-address-block">
                    <Home size={16} color="#7c3aed" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Full Address</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#334155', lineHeight: 1.6 }}>{fullAddress}</div>
                    </div>
                  </div>
                ) : (
                  <div className="vnd-info-grid">
                    <div className="vnd-info-item"><div className="vnd-info-lbl">City</div><div className="vnd-info-val">{noc.city || '—'}</div></div>
                    <div className="vnd-info-item"><div className="vnd-info-lbl">State</div><div className="vnd-info-val">{noc.state || '—'}</div></div>
                    <div className="vnd-info-item"><div className="vnd-info-lbl">Pincode</div><div className="vnd-info-val">{noc.pincode || '—'}</div></div>
                  </div>
                )}
              </div>

              {/* Documents */}
              <div className="vnd-section">
                <div className="vnd-sec-hdr">
                  <div className="vnd-sec-icon" style={{ background: '#fefce8' }}><FileText size={14} color="#ca8a04" /></div>
                  Documents
                  <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>{(noc.documents || []).length} file(s)</span>
                </div>
                {(noc.documents || []).length === 0 ? (
                  <div className="vnd-docs-empty">
                    <FileText size={28} color="#cbd5e1" style={{ marginBottom: 8 }} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>No documents attached</div>
                    <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4 }}>Documents uploaded will appear here</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {noc.documents.map((doc, i) => (
                      <div key={doc.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1.5px solid #e2e8f0' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ecfdf5', border: '1.5px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FileText size={14} color="#059669" /></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name || doc.file_name || `Document ${i + 1}`}</div>
                          {doc.uploaded_at && <div style={{ fontSize: 11, color: '#94a3b8' }}>Uploaded {fmtDate(doc.uploaded_at)}</div>}
                        </div>
                        {doc.file_url && <a href={doc.file_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600, color: '#0f766e', textDecoration: 'none' }}>View ↗</a>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>{/* end left */}

            {/* RIGHT: Quick Info */}
            <div><QuickInfoCard noc={noc} /></div>

          </div>{/* end body */}

          {/* ══════════ FOOTER ══════════ */}
          <div className="vnd-doc-foot">
            <span>This is a system-generated NOC record. For official purposes only.</span>
            <span>{nocIdDisplay}&nbsp;·&nbsp;{fmtDate(noc.created_at)}</span>
          </div>
        </div>
      </div>

      {/* ══════════ MODALS ══════════ */}
      {showSubmitModal  && <SubmitModal  nocId={id} nocIdDisplay={nocIdDisplay} onClose={() => setShowSubmitModal(false)}  onSuccess={onSubmitSuccess}  />}
      {showApproveModal && <ApproveModal nocId={id} nocIdDisplay={nocIdDisplay} onClose={() => setShowApproveModal(false)} onSuccess={onApproveSuccess} />}
      {showRejectModal  && <RejectModal  nocId={id} nocIdDisplay={nocIdDisplay} onClose={() => setShowRejectModal(false)}  onSuccess={onRejectSuccess}  />}
      {showUpdateModal  && <UpdateNocModal noc={noc} nocIdDisplay={nocIdDisplay} onClose={() => setShowUpdateModal(false)} onSuccess={onUpdateSuccess} />}
      {showReapplyModal && <ReapplyModal  nocId={id} nocIdDisplay={nocIdDisplay} onClose={() => setShowReapplyModal(false)} onSuccess={onReapplySuccess} onViewNew={onViewNewNoc} />}

      {/* ── Success toast ── */}
      {actionSuccess && (
        <div className="vnd-success-toast">
          <CheckCircle size={17} /> {actionSuccess}
        </div>
      )}
    </>
  );
}