/**
 * SendEmailModal.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Universal "Send to Client / Vendor" modal.
 * Works identically across every details page and profile page in the system.
 *
 * USAGE EXAMPLES
 * ──────────────
 * // Quotation / Proforma / Invoice / Purchase Order details page:
 * <SendEmailModal
 *   isOpen={sendModal}
 *   onClose={() => setSendModal(false)}
 *   title="Send Quotation to Client"
 *   defaultRecipient={client?.email || ''}
 *   defaultSubject={`Quotation ${qNum} — Issued ${issuedDate}`}
 *   defaultBody={`Dear ${clientName},\n\n...`}
 * />
 *
 * // Client profile page:
 * <SendEmailModal
 *   isOpen={sendModal}
 *   onClose={() => setSendModal(false)}
 *   title="Send to Client"
 *   defaultRecipient={client?.email || ''}
 *   defaultSubject=""
 *   defaultBody=""
 * />
 *
 * // Vendor profile page:
 * <SendEmailModal
 *   isOpen={sendModal}
 *   onClose={() => setSendModal(false)}
 *   title="Send to Vendor"
 *   defaultRecipient={vendor?.email || ''}
 *   defaultSubject=""
 *   defaultBody=""
 * />
 *
 * PROPS
 * ─────
 * isOpen           {boolean}   Controls visibility
 * onClose          {function}  Called when modal should close
 * title            {string}    Modal header title  (default: "Send Email")
 * defaultRecipient {string}    Pre-filled "To" field — user can edit
 * defaultSubject   {string}    Pre-filled subject
 * defaultBody      {string}    Pre-filled message body
 * onSuccess        {function?} Optional callback(recipientEmail) after successful send
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Send, Paperclip, Plus, Loader2, CheckCircle,
  AlertCircle, Mail, FileText, Trash2, Upload,
} from 'lucide-react';
import { sendEmail, validateEmail, formatFileSize, MAX_ATTACHMENT_BYTES } from '../../services/sendEmail';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
].join(',');

// ─── File icon helper ─────────────────────────────────────────────────────────

const getFileIcon = (file) => {
  const type = file?.type || '';
  if (type === 'application/pdf') return { icon: '📄', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' };
  if (type.startsWith('image/'))  return { icon: '🖼️', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' };
  if (type.includes('word'))      return { icon: '📝', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };
  if (type.includes('excel') || type.includes('spreadsheet'))
    return { icon: '📊', color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' };
  return { icon: '📎', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' };
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const FieldLabel = ({ children, required }) => (
  <label style={{
    display: 'block', marginBottom: 6,
    fontSize: 11, fontWeight: 700, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.07em',
  }}>
    {children}
    {required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
  </label>
);

const InputBase = ({ style, ...props }) => (
  <input
    style={{
      width: '100%', padding: '9px 13px',
      border: '1.5px solid #e2e8f0', borderRadius: 9,
      fontSize: 13, fontFamily: 'inherit', color: '#1e293b',
      background: '#fff', outline: 'none',
      transition: 'border-color .15s, box-shadow .15s',
      boxSizing: 'border-box',
      ...style,
    }}
    onFocus={e => { e.target.style.borderColor = '#0f766e'; e.target.style.boxShadow = '0 0 0 3px rgba(15,118,110,.1)'; }}
    onBlur={e  => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
    {...props}
  />
);

// ─── Main component ───────────────────────────────────────────────────────────

export default function SendEmailModal({
  isOpen,
  onClose,
  title = 'Send Email',
  defaultRecipient = '',
  defaultSubject   = '',
  defaultBody      = '',
  onSuccess,
}) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [recipient, setRecipient] = useState(defaultRecipient);
  const [subject,   setSubject]   = useState(defaultSubject);
  const [body,      setBody]      = useState(defaultBody);
  const [files,     setFiles]     = useState([]);
  const [sending,   setSending]   = useState(false);
  const [sent,      setSent]      = useState(false);
  const [error,     setError]     = useState('');
  const [fieldErr,  setFieldErr]  = useState({ recipient: '' });
  const [dragOver,  setDragOver]  = useState(false);

  const fileInputRef = useRef(null);
  const modalRef     = useRef(null);

  // ── Sync props when modal reopens ─────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setRecipient(defaultRecipient);
      setSubject(defaultSubject);
      setBody(defaultBody);
      setFiles([]);
      setSending(false);
      setSent(false);
      setError('');
      setFieldErr({ recipient: '' });
      setDragOver(false);
    }
  }, [isOpen, defaultRecipient, defaultSubject, defaultBody]);

  // ── Escape key ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape' && !sending) onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, sending, onClose]);

  // ── File helpers ──────────────────────────────────────────────────────────
  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const remaining = MAX_ATTACHMENT_BYTES - totalSize;

  const addFiles = useCallback((incoming) => {
    const newFiles  = Array.from(incoming).filter(Boolean);
    if (!newFiles.length) return;
    const combined  = [...files, ...newFiles];
    const newTotal  = combined.reduce((s, f) => s + f.size, 0);
    if (newTotal > MAX_ATTACHMENT_BYTES) {
      setError(`Adding these files would exceed the 25 MB attachment limit. You have ${formatFileSize(remaining)} remaining.`);
      return;
    }
    // Deduplicate by name+size
    const seen = new Set();
    const deduped = combined.filter(f => {
      const key = `${f.name}_${f.size}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setFiles(deduped);
    setError('');
  }, [files, remaining]);

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const handleFileInput = (e) => {
    addFiles(e.target.files);
    e.target.value = '';
  };

  // ── Drag and drop ─────────────────────────────────────────────────────────
  const handleDragOver  = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = ()  => setDragOver(false);
  const handleDrop      = (e) => {
    e.preventDefault(); setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validateFields = () => {
    const recipErr = validateEmail(recipient);
    setFieldErr({ recipient: recipErr });
    return !recipErr;
  };

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    setError('');
    if (!validateFields()) return;
    if (!subject.trim()) { setError('Subject is required.'); return; }
    if (!body.trim())    { setError('Message body is required.'); return; }

    setSending(true);
    try {
      await sendEmail({ recipients: recipient, subject, body, attachments: files });
      setSent(true);
      onSuccess?.(recipient);
    } catch (e) {
      setError(e.message || 'Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // ── Render guard ──────────────────────────────────────────────────────────
  if (!isOpen) return null;

  // ── Success screen ────────────────────────────────────────────────────────
  if (sent) {
    return (
      <ModalShell onClose={onClose} sending={false} title={title}>
        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          {/* Animated check */}
          <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: '2px solid #6ee7b7',
              animation: 'sem_pulse 1.8s ease-out infinite',
            }} />
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg,#ecfdf5,#d1fae5)',
              border: '2px solid #6ee7b7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(5,150,105,.18)',
            }}>
              <CheckCircle size={32} color="#059669" />
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', letterSpacing: '-.02em', marginBottom: 8 }}>
            Email Sent!
          </div>
          <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, marginBottom: 24 }}>
            Your email was delivered to<br />
            <strong style={{ color: '#0f766e' }}>{recipient}</strong>
            {files.length > 0 && (
              <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: '#94a3b8' }}>
                {files.length} attachment{files.length > 1 ? 's' : ''} included
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '11px 36px',
              background: 'linear-gradient(135deg,#0f766e,#0d9488)',
              border: 'none', borderRadius: 10,
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 12px rgba(15,118,110,.3)',
            }}
          >
            Done
          </button>
        </div>
      </ModalShell>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <ModalShell onClose={onClose} sending={sending} title={title}>
      {/* Error banner */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          background: '#fef2f2', border: '1.5px solid #fca5a5',
          borderRadius: 9, padding: '9px 13px', marginBottom: 16,
          fontSize: 12.5, color: '#dc2626', lineHeight: 1.5,
        }}>
          <AlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* To field */}
        <div>
          <FieldLabel required>To</FieldLabel>
          <InputBase
            type="email"
            value={recipient}
            onChange={e => { setRecipient(e.target.value); setFieldErr(p => ({ ...p, recipient: '' })); }}
            placeholder="recipient@example.com"
            style={fieldErr.recipient ? { borderColor: '#fca5a5', background: '#fff5f5' } : {}}
          />
          {fieldErr.recipient && (
            <div style={{ marginTop: 4, fontSize: 11.5, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertCircle size={11} /> {fieldErr.recipient}
            </div>
          )}
        </div>

        {/* Subject */}
        <div>
          <FieldLabel required>Subject</FieldLabel>
          <InputBase
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Email subject"
          />
        </div>

        {/* Body */}
        <div>
          <FieldLabel required>Message</FieldLabel>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={6}
            placeholder="Write your message here…"
            style={{
              width: '100%', padding: '9px 13px',
              border: '1.5px solid #e2e8f0', borderRadius: 9,
              fontSize: 13, fontFamily: 'inherit', color: '#1e293b',
              background: '#fff', outline: 'none',
              resize: 'vertical', lineHeight: 1.6,
              transition: 'border-color .15s, box-shadow .15s',
              boxSizing: 'border-box',
            }}
            onFocus={e => { e.target.style.borderColor = '#0f766e'; e.target.style.boxShadow = '0 0 0 3px rgba(15,118,110,.1)'; }}
            onBlur={e  => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Attachments */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <FieldLabel>Attachments</FieldLabel>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
              {formatFileSize(remaining)} remaining
            </span>
          </div>

          {/* Existing files */}
          {files.length > 0 && (
            <div style={{
              border: '1.5px solid #e2e8f0', borderRadius: 10,
              overflow: 'hidden', marginBottom: 8,
            }}>
              {files.map((file, idx) => {
                const { icon, color, bg, border } = getFileIcon(file);
                return (
                  <div
                    key={idx}
                    className="sem-file-row"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px',
                      borderBottom: idx < files.length - 1 ? '1px solid #f1f5f9' : 'none',
                      background: '#fff', transition: 'background .12s',
                    }}
                  >
                    {/* File type icon */}
                    <div style={{
                      width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                      background: bg, border: `1px solid ${border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14,
                    }}>
                      {icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12.5, fontWeight: 600, color: '#1e293b',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {file.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                        {formatFileSize(file.size)}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(idx)}
                      title="Remove"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#cbd5e1', padding: 4, borderRadius: 5, lineHeight: 1,
                        transition: 'color .12s, background .12s', flexShrink: 0,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.background = 'none'; }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Drop zone / Add file */}
          <div
            className="sem-drop-zone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? '#0f766e' : '#e2e8f0'}`,
              borderRadius: 10,
              background: dragOver ? '#f0fdf4' : '#f8fafc',
              padding: '14px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, transition: 'all .2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Upload size={14} color={dragOver ? '#0f766e' : '#94a3b8'} />
              <span style={{ fontSize: 12, color: dragOver ? '#0f766e' : '#94a3b8', fontWeight: 500 }}>
                {dragOver ? 'Drop files here' : 'Drag & drop files, or'}
              </span>
            </div>
            {!dragOver && (
              <button
                className="sem-add-btn"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px',
                  background: '#fff', border: '1.5px solid #e2e8f0',
                  borderRadius: 7, fontSize: 12, fontWeight: 600, color: '#475569',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                  flexShrink: 0,
                }}
              >
                <Plus size={12} /> Add File
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_TYPES}
              style={{ display: 'none' }}
              onChange={handleFileInput}
            />
          </div>

          {files.length === 0 && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#b0bec5', lineHeight: 1.5 }}>
              PDF, images, Word, Excel supported · 25 MB total limit
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
        <button
          onClick={onClose}
          disabled={sending}
          style={{
            flex: 1, padding: '10px 0',
            background: '#f8fafc', border: '1.5px solid #e2e8f0',
            borderRadius: 10, fontSize: 13, fontWeight: 600,
            color: '#64748b', cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all .15s',
          }}
          onMouseEnter={e => { if (!sending) { e.currentTarget.style.background = '#f1f5f9'; }}}
          onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; }}
        >
          Cancel
        </button>
        <button
          className="sem-send-btn"
          onClick={handleSend}
          disabled={sending}
          style={{
            flex: 2, padding: '10px 0',
            background: 'linear-gradient(135deg,#0f766e,#0d9488)',
            border: 'none', borderRadius: 10,
            fontSize: 13, fontWeight: 700, color: '#fff',
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            boxShadow: '0 4px 14px rgba(15,118,110,.3)',
            transition: 'all .15s',
          }}
        >
          {sending
            ? <><Loader2 size={14} style={{ animation: 'sem_spin .7s linear infinite' }} /> Sending…</>
            : <><Send size={14} /> Send Email</>
          }
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Modal shell (backdrop + card) ───────────────────────────────────────────
// Matches the Download Quotation PDF modal pattern exactly:
//   • Tailwind bg-black/50 backdrop (no blur, no rgba override)
//   • fontFamily: "'Outfit', sans-serif" on the card
//   • Green gradient header: linear-gradient(135deg,#0c6e67,#0f766e,#0d9488)

function ModalShell({ children, onClose, sending, title }) {
  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none" style={{ position: 'fixed' }}>
      <style>{`
        @keyframes sem_in{from{opacity:0;transform:scale(.94) translateY(14px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes sem_pulse{0%{transform:scale(1);opacity:.5}70%{transform:scale(1.2);opacity:0}100%{transform:scale(1.2);opacity:0}}
        @keyframes sem_spin{to{transform:rotate(360deg)}}
        .sem-file-row:hover{background:#f8fafc !important}
        .sem-add-btn:hover{background:#f0fdf4 !important;border-color:#6ee7b7 !important;color:#0f766e !important}
        .sem-send-btn:not(:disabled):hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(15,118,110,.4) !important}
        .sem-send-btn:disabled{opacity:.65;cursor:not-allowed}
        .sem-drop-zone{transition:all .2s}
      `}</style>

      {/* Backdrop — identical to PDF modal: bg-black/50, no blur */}
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto"
        style={{ position: 'fixed', width: '100vw', height: '100vh' }}
        onClick={() => { if (!sending) onClose(); }}
      />

      {/* Centering wrapper */}
      <div
        className="relative z-10 flex items-center justify-center p-4 pointer-events-none"
        style={{ height: '100vh' }}
      >
        {/* Modal card — Outfit font, same shadow as PDF modal */}
        <div
          style={{
            background: '#fff', borderRadius: 20,
            width: '100%', maxWidth: 520,
            boxShadow: '0 32px 80px rgba(0,0,0,.28)',
            overflow: 'hidden',
            fontFamily: "'Outfit', sans-serif",
            animation: 'sem_in .28s cubic-bezier(.16,1,.3,1)',
          }}
          className="pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Green gradient header — identical to PDF modal */}
          <div style={{
            background: 'linear-gradient(135deg,#0c6e67 0%,#0f766e 45%,#0d9488 100%)',
            padding: '20px 24px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(255,255,255,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Mail size={18} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-.01em' }}>
                  {title}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>
                  Compose and send your message
                </div>
              </div>
            </div>
            <button
              onClick={() => { if (!sending) onClose(); }}
              disabled={sending}
              style={{
                background: 'rgba(255,255,255,0.15)', border: 'none',
                borderRadius: 8, cursor: sending ? 'not-allowed' : 'pointer',
                color: '#fff', padding: '5px 6px', lineHeight: 1,
                transition: 'background .15s', display: 'flex', alignItems: 'center',
              }}
              onMouseEnter={e => { if (!sending) e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
            >
              <X size={17} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '22px 26px 24px', fontFamily: "'Outfit', sans-serif" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}