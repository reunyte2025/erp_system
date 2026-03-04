import { useEffect, useState, useCallback } from "react";
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
  MoreVertical,
  User,
  BarChart2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Star
} from "lucide-react";
import { getClientById, updateClient, getNotesByClientId, createNote, deleteNote, getClientProjects, getClientInvoices, toggleStarClient } from '../../services/clients';


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
  <div className={`${bgColor} rounded-xl p-4 relative border-2 ${bgColor.includes('teal') ? 'border-teal-400' : 'border-pink-400'}`}>
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-3">
        <div className={`${iconBg} rounded-lg p-2`}>
          {icon}
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-800 mb-0.5">{count}</h3>
          <p className="text-gray-700 font-medium text-sm">{label}</p>
          {subLabel && <p className="text-gray-600 text-xs mt-1">{subLabel}</p>}
        </div>
      </div>
      <button className="text-gray-600 hover:text-gray-800">
        <MoreVertical className="w-5 h-5" />
      </button>
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
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
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
                  ? 'bg-teal-500 text-white shadow-sm shadow-teal-200'
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
              : 'text-teal-600 hover:bg-teal-50 active:bg-teal-100'
          }`}
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
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
  const [isViewAllNotesOpen, setIsViewAllNotesOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  // Data State
  const [attachments, setAttachments] = useState([
    "Aadhaar Card",
    "PAN Card",
    "GST Certificate",
  ]);
  const [notes, setNotes] = useState([]);         // [{id, note}]
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState(null);
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [addNoteError, setAddNoteError] = useState("");
  const [deletingNoteId, setDeletingNoteId] = useState(null);
  const [projectSearchTerm, setProjectSearchTerm] = useState(""); // For projects/invoices search
  const [attachmentSearchTerm, setAttachmentSearchTerm] = useState(""); // For attachments search

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
  // FETCH NOTES
  // ========================================================================

  const fetchNotes = useCallback(async () => {
    if (!id) return;
    try {
      setNotesLoading(true);
      setNotesError(null);
      const response = await getNotesByClientId(id);
      if (response.status === 'success' && Array.isArray(response.data)) {
        setNotes(response.data); // [{id, note}]
      } else {
        setNotes([]);
      }
    } catch (err) {
      setNotesError('Failed to load notes');
      setNotes([]);
    } finally {
      setNotesLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchNotes();
  }, [id, fetchNotes]);

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
    } catch (err) {
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
    } catch (err) {
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

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      setIsAddingNote(true);
      setAddNoteError("");
      const response = await createNote(id, newNote.trim());
      if (response.status === 'success' && response.data) {
        setNotes(prev => [...prev, response.data]); // {id, note}
      }
      setNewNote("");
      setIsAddNoteOpen(false);
    } catch (err) {
      setAddNoteError(err.message || 'Failed to add note. Please try again.');
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      setDeletingNoteId(noteId);
      await deleteNote(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      // silently fail — note stays in list
    } finally {
      setDeletingNoteId(null);
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

  const filteredAttachments = attachments.filter((attachment) =>
    attachment.toLowerCase().includes(attachmentSearchTerm.toLowerCase())
  );

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
  const sacCode = client.sac_code || 'N/A';
  
  // Construct full address
  const fullAddress = [address, city, state, pincode]
    .filter(Boolean)
    .join(', ') || address;

  // Get projects and invoices count from fetched data
  const projectsCount = clientProjects.length;
  const invoicesCount = clientInvoices.length;

  return (
    // FIXED: Changed from p-6 to match DynamicList wrapper spacing
    <div className="min-h-screen bg-gray-50" ref={(el) => { if (el) window.scrollTo(0, 0); }}>
      
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
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Client Information</h2>

            <div className="space-y-4">
              {/* Email */}
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <p className="text-sm text-gray-800 font-medium break-all">{email}</p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                  <p className="text-sm text-gray-800 font-medium">{phone}</p>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Address</p>
                  <p className="text-sm text-gray-800 font-medium">{fullAddress}</p>
                </div>
              </div>

              {/* GST Number */}
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">GST Number</p>
                  <p className="text-sm text-gray-800 font-medium">{gstNumber}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons - below SAC Code */}
            <div className="flex items-center gap-2 mt-5 pt-4 border-t border-gray-100">
              <button
                onClick={() => window.location.href = `mailto:${email}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Mail className="w-4 h-4" />
                Send Email
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                <BarChart2 className="w-4 h-4" />
                Analytics
              </button>
              <button
                onClick={handleEditClient}
                className="p-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
                title="Edit Client"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
            </div>
          </div>

          {/* Notes Card — now first (swapped) */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Notes</h2>
              <button
                onClick={() => { setAddNoteError(""); setIsAddNoteOpen(true); }}
                className="text-teal-600 hover:text-teal-700 text-sm font-medium"
              >
                + Add
              </button>
            </div>

            {notesLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
              </div>
            ) : notesError ? (
              <p className="text-sm text-red-500 text-center py-4">{notesError}</p>
            ) : notes.length > 0 ? (
              <>
                <div className="space-y-2">
                  {notes.slice(0, 2).map((note) => (
                    <div key={note.id} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg group">
                      <p className="text-sm text-gray-700 line-clamp-2 flex-1">{note.note}</p>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        disabled={deletingNoteId === note.id}
                        className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100"
                        title="Remove note"
                      >
                        {deletingNoteId === note.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <X className="w-3.5 h-3.5" />
                        }
                      </button>
                    </div>
                  ))}
                </div>
                {notes.length > 2 && (
                  <button
                    onClick={() => setIsViewAllNotesOpen(true)}
                    className="w-full mt-3 text-teal-600 hover:text-teal-700 text-sm font-medium"
                  >
                    View All {notes.length} Notes
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No notes available
              </p>
            )}
          </div>

          {/* Attachments Card — now second (swapped) */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Attachments</h2>
              <button className="text-teal-600 hover:text-teal-700 text-sm font-medium">
                + Add
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search attachments..."
                value={attachmentSearchTerm}
                onChange={(e) => setAttachmentSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm transition-all"
              />
            </div>

            <div className="space-y-2">
              {filteredAttachments.map((attachment, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-700 font-medium">
                      {attachment}
                    </span>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {filteredAttachments.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No attachments found
              </p>
            )}
          </div>
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
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search projects, invoices..."
                  value={projectSearchTerm}
                  onChange={(e) => setProjectSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
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
              icon={<FileText className="w-5 h-5 text-teal-700" />}
              count={invoicesLoading ? '...' : invoicesCount}
              label="Total Invoices"
              subLabel={invoicesCount === 0 ? 'No invoices yet' : `${invoicesCount} invoice${invoicesCount !== 1 ? 's' : ''}`}
              bgColor="bg-teal-50"
              iconBg="bg-teal-100"
            />
            <StatCard
              icon={<Building2 className="w-5 h-5 text-pink-700" />}
              count={projectsLoading ? '...' : projectsCount}
              label="Total Projects"
              subLabel={projectsCount === 0 ? 'No projects yet' : `${projectsCount} project${projectsCount !== 1 ? 's' : ''}`}
              bgColor="bg-pink-50"
              iconBg="bg-pink-100"
            />
          </div>

          {/* Projects Section */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Projects</h2>

            {/* Table Header */}
            <div className="grid grid-cols-2 gap-4 pb-3 mb-3 border-b border-gray-200">
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
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Invoice</h2>

            {/* Table Header */}
            <div className="grid grid-cols-2 gap-4 pb-3 mb-3 border-b border-gray-200">
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

      {/* Add Note Modal */}
      {isAddNoteOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { if (!isAddingNote) { setIsAddNoteOpen(false); setNewNote(""); setAddNoteError(""); } }}
          />
          {/* Modal */}
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Teal Header bar */}
            <div className="bg-teal-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base leading-tight">Add Note</h3>
                  <p className="text-teal-100 text-xs mt-0.5">Write anything about this client</p>
                </div>
              </div>
              <button
                onClick={() => { if (!isAddingNote) { setIsAddNoteOpen(false); setNewNote(""); setAddNoteError(""); } }}
                disabled={isAddingNote}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              {addNoteError && (
                <div className="flex items-start gap-2 mb-4 bg-red-50 border border-red-200 text-red-600 px-3.5 py-2.5 rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-xs font-medium">{addNoteError}</span>
                </div>
              )}

              {/* Character count textarea */}
              <div className="relative">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Type your note here..."
                  disabled={isAddingNote}
                  maxLength={500}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none text-sm text-gray-700 placeholder-gray-400 disabled:bg-gray-50 transition-all"
                />
                <span className="absolute bottom-3 right-3 text-xs text-gray-300 select-none">
                  {newNote.length}/500
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => { setIsAddNoteOpen(false); setNewNote(""); setAddNoteError(""); }}
                  disabled={isAddingNote}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNote}
                  disabled={isAddingNote || !newNote.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-teal-600 text-white shadow-sm shadow-teal-600/30 hover:bg-teal-700 active:bg-teal-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isAddingNote ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Save Note
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      

      {/* Edit Client Modal */}
      {isEditClientOpen && (
        <div
          className="fixed inset-0 z-[9999] animate-fadeIn"
          style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed', overflow: 'hidden' }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            style={{ width: '100vw', height: '100vh', top: 0, left: 0, position: 'fixed', overflow: 'hidden' }}
            onClick={handleCancelEdit}
          />
          {/* Centering wrapper */}
          <div className="relative z-10 flex items-center justify-center" style={{ width: '100vw', height: '100vh' }}>
            <div
              className="relative bg-white rounded-2xl shadow-2xl w-full animate-scaleIn flex flex-col overflow-hidden"
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
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
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
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
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
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
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
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
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
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
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
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
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
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
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
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
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
                          className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="h-2" />
                </div>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 bg-white rounded-b-2xl">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 sm:p-8 text-center animate-scaleIn">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full border-4 border-teal-600 flex items-center justify-center animate-checkBounce">
              <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-teal-600" />
            </div>

            <h2 className="text-teal-600 text-xl sm:text-2xl font-bold mb-2">Successfully</h2>
            <p className="text-base sm:text-lg font-medium text-gray-700 mb-0">Client details updated</p>
          </div>
        </div>
      )}


      {/* View All Notes Modal */}
      {isViewAllNotesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsViewAllNotesOpen(false)}
          />
          {/* Modal */}
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Teal Header */}
            <div className="flex-shrink-0 bg-teal-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base leading-tight">All Notes</h3>
                  <p className="text-teal-100 text-xs mt-0.5">
                    {notes.length} {notes.length === 1 ? 'note' : 'notes'} for this client
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setIsViewAllNotesOpen(false); setAddNoteError(""); setIsAddNoteOpen(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Note
                </button>
                <button
                  onClick={() => setIsViewAllNotesOpen(false)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Notes List */}
            <div className="flex-1 overflow-y-auto p-6">
              {notes.length > 0 ? (
                <div className="space-y-3">
                  {notes.map((note, idx) => (
                    <div
                      key={note.id}
                      className="flex items-start gap-3 p-4 bg-gray-50 hover:bg-teal-50/40 rounded-xl border border-gray-100 hover:border-teal-100 transition-all duration-150"
                    >
                      {/* Note number badge */}
                      <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed flex-1">{note.note}</p>
                      {/* Delete button — always visible, turns red on hover */}
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        disabled={deletingNoteId === note.id}
                        title="Delete note"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all duration-150 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingNoteId === note.id
                          ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          : <X className="w-4 h-4" />
                        }
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                    <FileText className="w-7 h-7 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">No notes yet</p>
                  <p className="text-xs text-gray-400 mt-1">Click "Add Note" to write the first one</p>
                </div>
              )}
            </div>
          </div>
        </div>
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
        
        /* Custom Scrollbar Styling */
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
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