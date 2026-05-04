import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Plus, 
  FileText, 
  Search,
  Mail,
  Phone,
  MapPin,
  Building2,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  User,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Star,
  Send,
  Paperclip,
} from "lucide-react";
import { getClientById, updateClient, getClientProjects, getClientInvoices, toggleStarClient, sendClientEmail } from '../../services/clients';
import Notes from '../../components/Notes';
import { NOTE_ENTITY } from '../../services/notes';


/**
 * ============================================================================
 * CLIENT PROFILE COMPONENT - PRODUCTION READY v2.1
 * ============================================================================
 * 
 * UPDATES v2.1:
 * - Fixed spacing to match clients.jsx exactly
 * - Removed extra margins/padding
 * - Consistent layout structure
 * - Matches page transition smoothly
 * 
 * SPACING STRUCTURE (matches clients.jsx):
 * - Container: p-6 (24px all sides)
 * - Max width: max-w-7xl mx-auto
 * - Grid gap: gap-6 (24px between columns)
 * - Card spacing: space-y-6 (24px between cards)
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const ENABLE_LOGGING = false; // Set to true for debugging

const logger = {
  log: (...args) => ENABLE_LOGGING && console.log('[ClientProfile]', ...args),
  error: (...args) => console.error('[ClientProfile]', ...args),
  warn: (...args) => console.warn('[ClientProfile]', ...args),
};

// ============================================================================
// STATUS BADGE CONFIGURATION
// ============================================================================

const STATUS_CONFIG = {
  "In Progress": {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    icon: "Clock"
  },
  "Pending": {
    bg: "bg-amber-100",
    text: "text-amber-800",
    icon: "Clock"
  },
  "Draft": {
    bg: "bg-cyan-100",
    text: "text-cyan-800",
    icon: "FileText"
  },
  "Failed": {
    bg: "bg-red-100",
    text: "text-red-800",
    icon: "X"
  },
  "Completed": {
    bg: "bg-green-100",
    text: "text-green-800",
    icon: "CheckCircle"
  }
};

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG["Draft"];
  const iconMap = {
    Clock: () => <span className="text-sm">⏱</span>,
    FileText: () => <span className="text-sm">📝</span>,
    X: () => <span className="text-sm">❌</span>,
    CheckCircle: () => <span className="text-sm">✓</span>
  };
  const IconComponent = iconMap[config.icon];
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${config.bg} ${config.text}`}>
      <IconComponent />
      {status}
    </span>
  );
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
      <p className="text-gray-600">Loading client details...</p>
    </div>
  </div>
);

const ErrorDisplay = ({ error, onRetry, onGoBack }) => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center max-w-md">
      <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Client</h2>
      <p className="text-gray-600 mb-6">{error}</p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={onGoBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  </div>
);

// ============================================================================
// STAT CARD COMPONENT (matches clients.jsx style)
// ============================================================================

const StatCard = ({ icon, count, label, subLabel, bgColor, iconBg }) => (
  <div className={`${bgColor} rounded-xl p-5`}
    style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.12)' }}
  >
    <div className="flex items-start gap-3">
      <div className={`${iconBg} rounded-xl p-2.5 flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <h3 className="text-3xl font-bold text-white mb-0.5">{count}</h3>
        <p className="text-white/90 font-semibold text-sm">{label}</p>
        {subLabel && <p className="text-white/65 text-xs mt-1">{subLabel}</p>}
      </div>
    </div>
  </div>
);

// ============================================================================
// PAGINATION BAR COMPONENT
// ============================================================================

const PaginationBar = ({ currentPage, totalPages, totalItems, pageSize, onPrev, onNext }) => {
  const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-gray-200">
      {/* Item count label */}
      <span className="text-xs text-gray-400 font-medium">
        {totalItems === 0 ? 'No items' : `${from}–${to} of ${totalItems}`}
      </span>

      {/* Prev / Page indicator / Next */}
      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          disabled={currentPage === 1}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
            currentPage === 1
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
          }`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Prev
        </button>

        {/* Page bubbles */}
        <div className="flex items-center gap-1 px-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <div
              key={page}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-150 ${
                page === currentPage
                  ? 'bg-teal-600 text-white shadow-sm shadow-teal-200'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {page}
            </div>
          ))}
        </div>

        <button
          onClick={onNext}
          disabled={currentPage === totalPages}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
            currentPage === totalPages
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-teal-600 hover:bg-teal-100 active:bg-teal-200'
          }`}
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

const SendClientEmailModal = ({ client, onClose }) => {
  const defaultEmail = client?.email || "";

  const [email, setEmail] = useState(defaultEmail);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const totalAttachmentSize = attachments.reduce((sum, file) => sum + (file.size || 0), 0);
  const remainingBytes = MAX_ATTACHMENT_BYTES - totalAttachmentSize;

  const fmtSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAddFiles = (e) => {
    const newFiles = Array.from(e.target.files || []);
    if (!newFiles.length) return;

    const combined = [...attachments, ...newFiles];
    const totalSize = combined.reduce((sum, file) => sum + (file.size || 0), 0);

    if (totalSize > MAX_ATTACHMENT_BYTES) {
      setError("Adding these files would exceed the 25 MB attachment limit.");
      return;
    }

    setAttachments(combined);
    setError("");
    e.target.value = "";
  };

  const removeAttachment = (idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSend = async () => {
    if (!email.trim()) {
      setError("Recipient email is required.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setSending(true);
    try {
      await sendClientEmail({
        recipientEmail: email.trim(),
        subject: subject.trim(),
        body: body.trim(),
        attachments,
      });
      setSent(true);
    } catch (e) {
      setError(e.message || "Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}>
      <style>{`
        @keyframes vqd_spin{to{transform:rotate(360deg)}}
        @keyframes vqd_in{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,.22)', overflow: 'hidden', fontFamily: "'Outfit', sans-serif", animation: 'vqd_in .25s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 16px', borderBottom: '1.5px solid #f0f4f8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#0f766e,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={17} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Send Email</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                {`${client?.first_name || ''} ${client?.last_name || ''}`.trim() || 'Client'}
              </div>
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
              Email has been sent to<br /><strong>{email}</strong>
            </div>
            <button onClick={onClose} style={{ marginTop: 22, padding: '9px 28px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Done</button>
          </div>
        ) : (
          <div style={{ padding: '20px 22px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
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
              {attachments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8 }}>
                  {attachments.map((file, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderRadius: 8, padding: '6px 10px', border: '1px solid #cbd5e1' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Paperclip size={12} color="#64748b" />
                        <span style={{ fontSize: 12, color: '#334155', fontWeight: 500 }}>{file.name}</span>
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>({fmtSize(file.size)})</span>
                      </div>
                      <button onClick={() => removeAttachment(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, display: 'flex', alignItems: 'center' }}><X size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => fileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, border: '1.5px dashed #94a3b8', background: '#f8fafc', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
                <Paperclip size={13} /> Add Attachment
              </button>
              <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleAddFiles} />
              <p style={{ fontSize: 10, color: '#94a3b8', margin: '5px 0 0', textAlign: 'center' }}>Max total size: 25 MB</p>
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================
  
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI State
  const [showSearch, setShowSearch] = useState(false);
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isSendEmailOpen, setIsSendEmailOpen] = useState(false);
  
  const [projectSearchTerm, setProjectSearchTerm] = useState(""); // For projects/invoices search

  // Projects state
  const [clientProjects, setClientProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState(null);

  // Invoices state
  const [clientInvoices, setClientInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState(null);

  // Pagination state
  const PAGE_SIZE = 5;
  const [projectsPage, setProjectsPage] = useState(1);
  const [invoicesPage, setInvoicesPage] = useState(1);

  // Star state
  const [isStarred, setIsStarred] = useState(false);
  const [starLoading, setStarLoading] = useState(false);
  const [editFormData, setEditFormData] = useState({ first_name: "", last_name: "", phone_number: "", gst_number: "", address: "", city: "", state: "", pincode: "", email: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [editFormError, setEditFormError] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [id]);

  // Reset pagination to page 1 whenever search changes
  useEffect(() => {
    setProjectsPage(1);
    setInvoicesPage(1);
  }, [projectSearchTerm]);

  // ========================================================================
  // NAVIGATION HANDLERS
  // ========================================================================

  const handleAddProject = () => {
    navigate('/projects');
  };

  const handleGenerateQuotation = () => {
    navigate('/quotations/form', {
      state: {
        selectedClient: client
      }
    });
  };

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  const fetchClientData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      logger.log('📥 Fetching client with ID:', id);

      const response = await getClientById(id);
      
      logger.log('✅ Raw API response:', response);

      // Handle different response structures
      let clientData;
      
      if (response.status === 'success' && response.data) {
        clientData = response.data;
        logger.log('📦 Extracted from response.data:', clientData);
      } else if (response.data && !response.status) {
        clientData = response.data;
        logger.log('📦 Extracted from response.data (alternate):', clientData);
      } else if (response.id) {
        clientData = response;
        logger.log('📦 Using response directly:', clientData);
      } else {
        logger.error('❌ Unexpected response structure:', response);
        throw new Error('Invalid response format from server');
      }

      if (!clientData || !clientData.id) {
        throw new Error('Client data is incomplete or missing');
      }

      logger.log('✅ Final client data:', clientData);
      setClient(clientData);
      setIsStarred(clientData.start_client === true);

    } catch (err) {
      logger.error('❌ Error fetching client:', err);
      
      let errorMessage = 'Failed to load client details';
      
      if (err.message.includes('404') || err.message.includes('not found')) {
        errorMessage = `Client with ID ${id} not found`;
      } else if (err.message.includes('Network Error')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (err.message.includes('401') || err.message.includes('403')) {
        errorMessage = 'You do not have permission to view this client';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchClientData();
    } else {
      setError('No client ID provided');
      setLoading(false);
    }
  }, [id, fetchClientData]);

  // ========================================================================
  // FETCH CLIENT PROJECTS
  // ========================================================================

  const fetchClientProjectsData = useCallback(async () => {
    if (!id) return;
    try {
      setProjectsLoading(true);
      setProjectsError(null);
      const response = await getClientProjects(id);
      if (response.status === 'success' && response.data) {
        setClientProjects(response.data.results || []);
      } else {
        setClientProjects([]);
      }
    } catch {
      setProjectsError('Failed to load projects');
      setClientProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchClientProjectsData();
  }, [id, fetchClientProjectsData]);

  // ========================================================================
  // FETCH CLIENT INVOICES
  // ========================================================================

  const fetchClientInvoicesData = useCallback(async () => {
    if (!id) return;
    try {
      setInvoicesLoading(true);
      setInvoicesError(null);
      const response = await getClientInvoices(id);
      if (response.status === 'success' && response.data) {
        setClientInvoices(response.data.results || []);
      } else {
        setClientInvoices([]);
      }
    } catch {
      setInvoicesError('Failed to load invoices');
      setClientInvoices([]);
    } finally {
      setInvoicesLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchClientInvoicesData();
  }, [id, fetchClientInvoicesData]);

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  const handleRetry = () => {
    fetchClientData();
  };

  const handleGoBack = () => {
    navigate('/clients');
  };

  const handleToggleStar = async () => {
    if (starLoading || !client?.id) return;
    const newStarState = !isStarred;
    setIsStarred(newStarState); // optimistic update
    setStarLoading(true);
    try {
      await toggleStarClient(client.id, newStarState);
    } catch (err) {
      setIsStarred(!newStarState); // revert on error
      logger.error('❌ Failed to toggle star:', err);
    } finally {
      setStarLoading(false);
    }
  };

  const handleEditClient = () => {
    setEditFormError("");
    setSaveError(null);
    setEditFormData({
      first_name:   client.first_name   || "",
      last_name:    client.last_name    || "",
      phone_number: client.phone_number || "",
      gst_number:   client.gst_number   || "",
      address:      client.address      || "",
      city:         client.city         || "",
      state:        client.state        || "",
      pincode:      client.pincode != null ? String(client.pincode) : "",
      email:        client.email        || "",
    });
    setIsEditClientOpen(true);
  };
  const handleEditFormChange = (field, value) => { setEditFormData(prev => ({ ...prev, [field]: value })); };
  const handleSaveEdit = async () => {
    setEditFormError("");
    if (!editFormData.first_name.trim() || !editFormData.last_name.trim()) {
      setEditFormError("First name and last name are required");
      return;
    }
    try {
      setIsSaving(true);
      setSaveError(null);
      // Helper — only include a field if it has a non-empty value.
      // The backend rejects blank strings (e.g. pincode: "") with a 400 error.
      const v = (val) => val?.trim() || undefined;

      const payload = {
        id:           client.id,
        first_name:   editFormData.first_name.trim(),
        last_name:    editFormData.last_name.trim(),
        email:        editFormData.email.trim(),
        phone_number: editFormData.phone_number.trim(),
        // Optional fields — omitted when empty so backend doesn't see blank strings
        ...(v(editFormData.address)     && { address:     v(editFormData.address) }),
        ...(v(editFormData.city)        && { city:        v(editFormData.city) }),
        ...(v(editFormData.state)       && { state:       v(editFormData.state) }),
        ...(v(editFormData.pincode)     && { pincode:     v(editFormData.pincode) }),
        ...(v(editFormData.gst_number)  && { gst_number:  v(editFormData.gst_number) }),
      };
      await updateClient(client.id, payload);
      setClient(prev => ({ ...prev, ...payload }));
      setIsEditClientOpen(false);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (err) {
      // updateClient re-throws the original axios error — extract the best message
      const d = err.response?.data;
      const msg = d?.message
        || d?.errors?.pincode?.[0]
        || d?.errors?.non_field_errors?.[0]
        || d?.errors?.email?.[0]
        || d?.error
        || err.message
        || "Failed to update client. Please try again.";
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };
  const handleCancelEdit = () => { setIsEditClientOpen(false); setEditFormError(""); setSaveError(null); setEditFormData({ first_name: "", last_name: "", phone_number: "", gst_number: "", address: "", city: "", state: "", pincode: "", email: "" }); };

  // ========================================================================
  // RENDER LOGIC
  // ========================================================================

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={handleRetry} onGoBack={handleGoBack} />;
  }

  if (!client) {
    return (
      <ErrorDisplay 
        error="Client data not available" 
        onRetry={handleRetry} 
        onGoBack={handleGoBack} 
      />
    );
  }

  // Extract client data with safe defaults
  const firstName = client.first_name || 'N/A';
  const lastName = client.last_name || '';
  const email = client.email || 'N/A';
  const phone = client.phone_number || 'N/A';
  const address = client.address || 'N/A';
  const city = client.city || '';
  const state = client.state || '';
  const pincode = client.pincode || '';
  const gstNumber = client.gst_number || 'N/A';
  
  // Construct full address
  const fullAddress = [address, city, state, pincode]
    .filter(Boolean)
    .join(', ') || address;

  // Get projects and invoices count from fetched data
  const projectsCount = clientProjects.length;
  const invoicesCount = clientInvoices.length;

  return (
    // FIXED: Changed from p-6 to match DynamicList wrapper spacing
    <div className="min-h-screen bg-gray-50 client-profile-page">
      
      {/* ====================================================================
           HEADER SECTION - FIXED SPACING
           max-w-7xl mx-auto matches clients.jsx container
           mb-6 matches vertical spacing in clients.jsx
           ==================================================================== */}
      <div className="max-w-7xl mx-auto">
        
        {/* Back Button - minimal bottom margin */}
        <button
          onClick={handleGoBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Clients</span>
        </button>
      </div>

      {/* ====================================================================
           MAIN CONTENT GRID - FIXED SPACING
           max-w-7xl mx-auto matches clients.jsx container
           gap-6 matches spacing between columns in clients.jsx
           ==================================================================== */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ==================================================================
             LEFT COLUMN - CLIENT INFO & ATTACHMENTS
             space-y-6 matches vertical spacing between cards
             ================================================================== */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Header with Name + Star */}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-800 flex-1">
                {firstName} {lastName}
              </h1>
              {/* Star Button */}
              <button
                onClick={handleToggleStar}
                disabled={starLoading}
                title={isStarred ? 'Remove from starred' : 'Mark as star client'}
                className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                  isStarred
                    ? 'bg-amber-100 hover:bg-amber-200'
                    : 'bg-gray-100 hover:bg-amber-50'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {starLoading ? (
                  <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                ) : (
                  <Star
                    className={`w-5 h-5 transition-all duration-200 ${
                      isStarred
                        ? 'fill-amber-400 text-amber-400 scale-110'
                        : 'text-gray-400 group-hover:text-amber-400'
                    }`}
                  />
                )}
              </button>
            </div>
          </div>
          
          {/* Client Information Card */}
          <div className="bg-white rounded-2xl border-2 border-gray-300 p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-1 h-5 bg-teal-600 rounded-full"></div>
                <h2 className="text-lg font-bold text-gray-800">Client Information</h2>
              </div>
              <button
                onClick={handleEditClient}
                className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700 flex-shrink-0"
                title="Edit client"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-teal-600">
                  <Edit2 className="w-3 h-3" />
                </span>
                <span>Edit</span>
              </button>
            </div>

            <div className="space-y-0 divide-y divide-gray-100">
              {/* Email */}
              <div className="flex items-center gap-3 py-3">
                <div className="w-8 h-8 rounded-lg bg-teal-200 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-teal-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Email</p>
                  <p className="text-sm text-gray-800 font-semibold break-all">{email}</p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-3 py-3">
                <div className="w-8 h-8 rounded-lg bg-teal-200 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-teal-700" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Phone Number</p>
                  <p className="text-sm text-gray-800 font-semibold">{phone}</p>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-3 py-3">
                <div className="w-8 h-8 rounded-lg bg-teal-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-teal-700" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Address</p>
                  <p className="text-sm text-gray-800 font-semibold">{fullAddress}</p>
                </div>
              </div>

              {/* GST Number */}
              <div className="flex items-center gap-3 py-3">
                <div className="w-8 h-8 rounded-lg bg-teal-200 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-teal-700" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">GST Number</p>
                  <p className="text-sm text-gray-800 font-semibold">{gstNumber}</p>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <button
                onClick={() => setIsSendEmailOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-teal-600/25 transition-colors hover:bg-teal-700 active:bg-teal-800"
                title="Send email"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-2xl bg-white/15 text-white">
                  <Mail className="w-3.5 h-3.5" />
                </span>
                <span>Send Email</span>
              </button>
            </div>

          </div>

          {/* Notes Section — new reusable Notes component */}
          {!loading && client && (
            <Notes
              entityType={NOTE_ENTITY.CLIENT}
              entityId={client.id}
            />
          )}
        </div>

        {/* ==================================================================
             RIGHT COLUMN - PROJECTS & INVOICES
             space-y-6 matches vertical spacing between cards
             ================================================================== */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Action Buttons Row */}
          <div className="flex items-center justify-end gap-3">
            <button 
              onClick={() => setShowSearch(!showSearch)}
              className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <Search className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleAddProject}
              className="flex items-center justify-center gap-2 w-44 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors flex-shrink-0"
            >
              <Building2 className="w-4 h-4" />
              Add Project
            </button>
            <button 
              onClick={handleGenerateQuotation}
              className="flex items-center justify-center gap-2 w-52 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors flex-shrink-0"
            >
              <FileText className="w-4 h-4" />
              Generate Quotation
            </button>
          </div>

          {/* Search Input - smooth expand/collapse */}
          <div className={showSearch ? "search-panel-open" : "search-panel-closed"}>
            <div className="bg-white rounded-xl border-2 border-gray-300 p-4">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search projects, invoices..."
                  value={projectSearchTerm}
                  onChange={(e) => setProjectSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 transition-all"
                />
                {projectSearchTerm && (
                  <button
                    onClick={() => setProjectSearchTerm("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stats Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard
              icon={<FileText className="w-5 h-5 text-white" />}
              count={invoicesLoading ? '...' : invoicesCount}
              label="Total Invoices"
              subLabel={invoicesCount === 0 ? 'No invoices yet' : `${invoicesCount} invoice${invoicesCount !== 1 ? 's' : ''}`}
              bgColor="bg-teal-600"
              iconBg="bg-white/20"
            />
            <StatCard
              icon={<Building2 className="w-5 h-5 text-white" />}
              count={projectsLoading ? '...' : projectsCount}
              label="Total Projects"
              subLabel={projectsCount === 0 ? 'No projects yet' : `${projectsCount} project${projectsCount !== 1 ? 's' : ''}`}
              bgColor="bg-pink-500"
              iconBg="bg-white/20"
            />
          </div>

          {/* Projects Section */}
          <div className="bg-white rounded-2xl border-2 border-gray-300 p-6">
            <div className="flex items-center gap-2 mb-4"><div className="w-1 h-5 bg-teal-600 rounded-full"></div><h2 className="text-lg font-bold text-gray-800">Projects</h2></div>

            {/* Table Header */}
            <div className="grid grid-cols-2 gap-4 pb-3 mb-3 border-b-2 border-gray-300">
              <div className="text-sm font-medium text-gray-600">Project Name</div>
              <div className="text-sm font-medium text-gray-600 text-right">Status</div>
            </div>

            {projectsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
              </div>
            ) : projectsError ? (
              <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-sm text-red-500">{projectsError}</p>
                <button
                  onClick={fetchClientProjectsData}
                  className="mt-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  Retry
                </button>
              </div>
            ) : (() => {
              const filtered = clientProjects.filter(project =>
                !projectSearchTerm ||
                project.name?.toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
                project.servey_number?.toLowerCase().includes(projectSearchTerm.toLowerCase())
              );
              const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
              const safePage = Math.min(projectsPage, totalPages);
              const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

              return filtered.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 font-medium">No projects yet</p>
                  <p className="text-xs text-gray-400 mt-1">Projects assigned to this client will appear here</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    {paginated.map((project, index) => (
                      <div
                        key={project.id || index}
                        className="grid grid-cols-2 gap-4 items-center py-3 hover:bg-gray-50 rounded-lg px-2 transition-colors duration-150 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <Building2 className="w-10 h-10 p-2 bg-gray-100 text-gray-600 rounded-lg flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-800">{project.name}</p>
                            <p className="text-xs text-gray-500">{project.servey_number || 'No survey number'}</p>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <StatusBadge status={
                            project.status === 2 ? 'Completed' :
                            project.status === 1 ? 'In Progress' :
                            project.is_draft ? 'Draft' : 'In Progress'
                          } />
                        </div>
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <PaginationBar
                      currentPage={safePage}
                      totalPages={totalPages}
                      totalItems={filtered.length}
                      pageSize={PAGE_SIZE}
                      onPrev={() => setProjectsPage(p => Math.max(1, p - 1))}
                      onNext={() => setProjectsPage(p => Math.min(totalPages, p + 1))}
                    />
                  )}
                </>
              );
            })()}
          </div>

          {/* Invoices Section */}
          <div className="bg-white rounded-2xl border-2 border-gray-300 p-6">
            <div className="flex items-center gap-2 mb-4"><div className="w-1 h-5 bg-teal-600 rounded-full"></div><h2 className="text-lg font-bold text-gray-800">Invoice</h2></div>

            {/* Table Header */}
            <div className="grid grid-cols-2 gap-4 pb-3 mb-3 border-b-2 border-gray-300">
              <div className="text-sm font-medium text-gray-600">Invoice</div>
              <div className="text-sm font-medium text-gray-600 text-right">Status</div>
            </div>

            {invoicesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
              </div>
            ) : invoicesError ? (
              <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-sm text-red-500">{invoicesError}</p>
                <button
                  onClick={fetchClientInvoicesData}
                  className="mt-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  Retry
                </button>
              </div>
            ) : (() => {
              const filtered = clientInvoices.filter(invoice =>
                !projectSearchTerm ||
                String(invoice.invoice_number)?.toLowerCase().includes(projectSearchTerm.toLowerCase())
              );
              const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
              const safePage = Math.min(invoicesPage, totalPages);
              const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

              return filtered.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 font-medium">There are no invoices yet</p>
                  <p className="text-xs text-gray-400 mt-1">Invoices for this client will appear here</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    {paginated.map((invoice, index) => (
                      <div
                        key={invoice.id || index}
                        className="grid grid-cols-2 gap-4 items-center py-3 hover:bg-gray-50 rounded-lg px-2 transition-colors duration-150 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-10 h-10 p-2 bg-gray-100 text-gray-600 rounded-lg flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-800">
                              {invoice.invoice_number ? `INV-${invoice.invoice_number}` : `Invoice #${invoice.id}`}
                            </p>
                            <p className="text-xs text-gray-500">
                              {invoice.created_at
                                ? new Date(invoice.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <StatusBadge status={invoice.is_draft ? 'Draft' : 'Completed'} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <PaginationBar
                      currentPage={safePage}
                      totalPages={totalPages}
                      totalItems={filtered.length}
                      pageSize={PAGE_SIZE}
                      onPrev={() => setInvoicesPage(p => Math.max(1, p - 1))}
                      onNext={() => setInvoicesPage(p => Math.min(totalPages, p + 1))}
                    />
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ====================================================================
           MODALS & OVERLAYS
           ==================================================================== */}

      

      {/* Edit Client Modal */}
      {isEditClientOpen && (
        <div
          className="fixed inset-0 z-[9999] animate-fadeIn pointer-events-none"
          style={{ position: 'fixed' }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 pointer-events-auto"
            style={{ position: 'fixed', width: '100vw', height: '100vh' }}
            onClick={handleCancelEdit}
          />
          {/* Centering wrapper */}
          <div className="relative z-10 flex items-center justify-center pointer-events-none" style={{ height: '100vh' }}>
            <div
              className="relative bg-white rounded-2xl shadow-2xl w-full animate-scaleIn flex flex-col overflow-hidden pointer-events-auto"
              style={{ maxWidth: '520px', maxHeight: 'calc(100vh - 48px)', margin: '0 16px' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex-shrink-0 bg-teal-600 text-white px-5 py-4 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Edit2 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-semibold text-base leading-tight">Edit Client Details</h2>
                    <p className="text-teal-100 text-xs mt-0.5">Update the information below</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors flex-shrink-0"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto min-h-0">
                <div className="px-5 pt-4 pb-2 space-y-4">

                  {/* Error Banner */}
                  {(editFormError || saveError) && (
                    <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-600 px-3.5 py-2.5 rounded-xl">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span className="text-xs font-medium leading-relaxed">{editFormError || saveError}</span>
                    </div>
                  )}

                  {/* Section: Personal Info */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Personal Info</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={editFormData.first_name}
                            onChange={(e) => handleEditFormChange('first_name', e.target.value)}
                            placeholder="John"
                            disabled={isSaving}
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                          Last Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={editFormData.last_name}
                            onChange={(e) => handleEditFormChange('last_name', e.target.value)}
                            placeholder="Doe"
                            disabled={isSaving}
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section: Contact */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Contact</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="tel"
                            value={editFormData.phone_number}
                            onChange={(e) => handleEditFormChange('phone_number', e.target.value)}
                            placeholder="+91 98765 43210"
                            disabled={isSaving}
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="email"
                            value={editFormData.email}
                            onChange={(e) => handleEditFormChange('email', e.target.value)}
                            placeholder="john@example.com"
                            disabled={isSaving}
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section: Address */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Address</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Street Address</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={editFormData.address}
                            onChange={(e) => handleEditFormChange('address', e.target.value)}
                            placeholder="123 Main Street"
                            disabled={isSaving}
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">City</label>
                          <input
                            type="text"
                            value={editFormData.city}
                            onChange={(e) => handleEditFormChange('city', e.target.value)}
                            placeholder="Mumbai"
                            disabled={isSaving}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">State</label>
                          <input
                            type="text"
                            value={editFormData.state}
                            onChange={(e) => handleEditFormChange('state', e.target.value)}
                            placeholder="MH"
                            disabled={isSaving}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Pincode</label>
                          <input
                            type="text"
                            value={editFormData.pincode}
                            onChange={(e) => handleEditFormChange('pincode', e.target.value)}
                            placeholder="400001"
                            disabled={isSaving}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section: Business */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Business (Optional)</p>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">GST Number</label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={editFormData.gst_number}
                          onChange={(e) => handleEditFormChange('gst_number', e.target.value)}
                          placeholder="22AAAAA0000A1Z5"
                          disabled={isSaving}
                          className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="h-2" />
                </div>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 px-5 py-4 border-t-2 border-gray-200 bg-white rounded-b-2xl">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-teal-600 text-white shadow-sm shadow-teal-600/30 hover:bg-teal-700 active:bg-teal-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    {isSaving ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message - SMOOTH ANIMATION */}
      {showSuccessMessage && (
        <div
          className="fixed inset-0 z-[9999] animate-fadeIn pointer-events-none"
          style={{ position: 'fixed' }}
        >
          <div
            className="absolute inset-0 bg-black/50 pointer-events-auto"
            style={{ position: 'fixed', width: '100vw', height: '100vh' }}
          />
          <div className="relative z-10 flex items-center justify-center pointer-events-none" style={{ height: '100vh' }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 sm:p-8 text-center animate-scaleIn pointer-events-auto" style={{ margin: '0 16px' }}>
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full border-4 border-teal-600 flex items-center justify-center animate-checkBounce">
              <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-teal-600" />
            </div>

            <h2 className="text-teal-600 text-xl sm:text-2xl font-bold mb-2">Successfully</h2>
            <p className="text-base sm:text-lg font-medium text-gray-700 mb-0">Client details updated</p>
          </div>
          </div>
        </div>
      )}

      {isSendEmailOpen && (
        <SendClientEmailModal
          client={client}
          onClose={() => setIsSendEmailOpen(false)}
        />
      )}


      {/* Smooth Animations */}
      <style>{`
        .search-panel-open {
          max-height: 80px;
          opacity: 1;
          overflow: hidden;
          transition: max-height 0.35s ease, opacity 0.3s ease;
        }
        .search-panel-closed {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: max-height 0.35s ease, opacity 0.3s ease;
        }
        
        /* Custom Scrollbar Styling — scoped to page only, not modal overlays */
        .client-profile-page ::-webkit-scrollbar {
          width: 6px;
        }
        .client-profile-page ::-webkit-scrollbar-track {
          background: transparent;
        }
        .client-profile-page ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .client-profile-page ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes checkBounce {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .animate-checkBounce {
          animation: checkBounce 0.6s ease-in-out;
        }
      `}</style>
    </div>
  );
}
