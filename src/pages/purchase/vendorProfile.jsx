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
  Edit2
} from "lucide-react";

/**
 * ============================================================================
 * VENDOR PROFILE COMPONENT - PRODUCTION READY v2.1
 * ============================================================================
 * 
 * UPDATES v2.1:
 * - Fixed spacing to match vendors.jsx exactly
 * - Removed extra margins/padding
 * - Consistent layout structure
 * - Matches page transition smoothly
 * - Using demo data until backend is ready
 * 
 * SPACING STRUCTURE (matches vendors.jsx):
 * - Container: p-6 (24px all sides)
 * - Max width: max-w-7xl mx-auto
 * - Grid gap: gap-6 (24px between columns)
 * - Card spacing: space-y-6 (24px between cards)
 */

// ============================================================================
// DEMO DATA - Replace with API calls when backend is ready
// ============================================================================

const DEMO_VENDOR_DATA = {
  id: 1,
  company_name: 'ABC Infra',
  name: 'ABC Infra',
  email: 'abcinfra@gmail.com',
  phone: '+91 123456789',
  category: 'Plumbing',
  address: '19, A, Mumbai (E), 201, abc society',
  notes: 'Discussed scope in first meeting. Vendor focused on quality materials and timely delivery.',
  total_projects: 50,
  completed_projects: 35,
  payments_done: 8,
  total_payments: 10,
  total_outstanding: 290589,
  created_at: '2026-01-01T00:00:00Z'
};

const DEMO_PROJECTS = [
  { id: 1, name: "ACME Corporation", status: "In Progress" },
  { id: 2, name: "ACME Corporation", status: "Pending" },
  { id: 3, name: "ACME Corporation", status: "Draft" },
  { id: 4, name: "ACME Corporation", status: "Failed" },
  { id: 5, name: "ACME Corporation", status: "Completed" },
  { id: 6, name: "XYZ Pvt Ltd", status: "Completed" },
];

const DEMO_PAYMENTS = [
  { id: 1, amount: "102000", status: "Pending", date: "2025-02-10" },
  { id: 2, amount: "102000", status: "Pending", date: "2025-02-12" },
  { id: 3, amount: "102000", status: "Completed", date: "2025-02-15" },
  { id: 4, amount: "102000", status: "Completed", date: "2025-02-18" },
  { id: 5, amount: "102000", status: "Completed", date: "2025-02-20" },
  { id: 6, amount: "85000", status: "Completed", date: "2025-02-22" },
];

const DEMO_NOTES = [
  "We discussed scope in first meeting and the vendor focused on quality materials",
  "Vendor has excellent track record with timely delivery",
  "Preferred supplier for plumbing materials",
  "Competitive pricing and good after-sales support",
  "Recommended by previous clients",
];

const DEMO_ATTACHMENTS = [
  "GST Certificate",
  "PAN Card",
  "Trade License",
  "Bank Details",
];

// ============================================================================
// CONFIGURATION
// ============================================================================

const ENABLE_LOGGING = false; // Set to true for debugging

const logger = {
  log: (...args) => ENABLE_LOGGING && console.log('[VendorProfile]', ...args),
  error: (...args) => console.error('[VendorProfile]', ...args),
  warn: (...args) => console.warn('[VendorProfile]', ...args),
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
      <p className="text-gray-600">Loading vendor details...</p>
    </div>
  </div>
);

const ErrorDisplay = ({ error, onRetry, onGoBack }) => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center max-w-md">
      <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Vendor</h2>
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
// STAT CARD COMPONENT (matches vendors.jsx style)
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
// MAIN COMPONENT
// ============================================================================

export default function VendorProfile({ onUpdateNavigation }) {
  const { id } = useParams();
  const navigate = useNavigate();

  // ========================================================================
  // BREADCRUMB NAVIGATION
  // ========================================================================

  // Notify parent about breadcrumbs
  useEffect(() => {
    if (onUpdateNavigation) {
      onUpdateNavigation({
        breadcrumbs: ['Purchase', 'Vendor Profile']
      });
    }
    
    return () => {
      if (onUpdateNavigation) {
        onUpdateNavigation(null);
      }
    };
  }, [onUpdateNavigation]);

  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================
  
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI State
  const [isViewAllNotesOpen, setIsViewAllNotesOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isEditVendorOpen, setIsEditVendorOpen] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  
  // Data State
  const [projects, setProjects] = useState([]);
  const [payments, setPayments] = useState([]);
  const [attachments, setAttachments] = useState([
    "Aadhaar Card",
    "PAN Card",
    "GST Certificate",
  ]);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [projectSearchTerm, setProjectSearchTerm] = useState(""); // For projects/invoices search
  const [attachmentSearchTerm, setAttachmentSearchTerm] = useState(""); // For attachments search
  const [editFormData, setEditFormData] = useState({ first_name: "", last_name: "", phone_number: "", gst_number: "", address: "", email: "" });

  // ========================================================================
  // NAVIGATION HANDLERS
  // ========================================================================

  const handleAddProject = () => {
    navigate('/projects');
  };

  const handleGenerateQuotation = () => {
    navigate('/quotations/form', {
      state: {
        selectedVendor: vendor
      }
    });
  };

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  const fetchVendorData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      logger.log('📥 Fetching vendor with ID:', id);

      // TODO: Replace with actual API call when backend is ready
      // const response = await getVendorById(id);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Use demo data for now
      const vendorData = DEMO_VENDOR_DATA;
      
      logger.log('✅ Using demo vendor data:', vendorData);

      if (!vendorData || !vendorData.id) {
        throw new Error('Vendor data is incomplete or missing');
      }

      logger.log('✅ Final vendor data:', vendorData);
      setVendor(vendorData);
      
      // Initialize demo data
      setProjects(DEMO_PROJECTS);
      setPayments(DEMO_PAYMENTS);
      setNotes(DEMO_NOTES);
      setAttachments(DEMO_ATTACHMENTS);

    } catch (err) {
      logger.error('❌ Error fetching vendor:', err);
      
      let errorMessage = 'Failed to load vendor details';
      
      if (err.message.includes('404') || err.message.includes('not found')) {
        errorMessage = `Vendor with ID ${id} not found`;
      } else if (err.message.includes('Network Error')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (err.message.includes('401') || err.message.includes('403')) {
        errorMessage = 'You do not have permission to view this vendor';
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
      fetchVendorData();
    } else {
      setError('No vendor ID provided');
      setLoading(false);
    }
  }, [id, fetchVendorData]);

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  const handleRetry = () => {
    fetchVendorData();
  };

  const handleGoBack = () => {
    navigate('/vendors');
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      setNotes(prev => [...prev, newNote.trim()]);
      setNewNote("");
      setIsAddNoteOpen(false);
    }
  };

  const handleEditVendor = () => { setEditFormData({ first_name: vendor.first_name || "", last_name: vendor.last_name || "", phone_number: vendor.phone_number || "", gst_number: vendor.gst_number || "", address: vendor.address || "", email: vendor.email || "" }); setIsEditVendorOpen(true); };
  const handleEditFormChange = (field, value) => { setEditFormData(prev => ({ ...prev, [field]: value })); };
  const handleSaveEdit = () => { setVendor(prev => ({ ...prev, ...editFormData })); setIsEditVendorOpen(false); setShowSuccessMessage(true); setTimeout(() => setShowSuccessMessage(false), 3000); };
  const handleCancelEdit = () => { setIsEditVendorOpen(false); setEditFormData({ first_name: "", last_name: "", phone_number: "", gst_number: "", address: "", email: "" }); };

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

  if (!vendor) {
    return (
      <ErrorDisplay 
        error="Vendor data not available" 
        onRetry={handleRetry} 
        onGoBack={handleGoBack} 
      />
    );
  }

  // Extract vendor data with safe defaults
  const firstName = vendor.first_name || 'N/A';
  const lastName = vendor.last_name || '';
  const email = vendor.email || 'N/A';
  const phone = vendor.phone_number || 'N/A';
  const address = vendor.address || 'N/A';
  const city = vendor.city || '';
  const state = vendor.state || '';
  const pincode = vendor.pincode || '';
  const gstNumber = vendor.gst_number || 'N/A';
  const sacCode = vendor.sac_code || 'N/A';
  
  // Construct full address
  const fullAddress = [address, city, state, pincode]
    .filter(Boolean)
    .join(', ') || address;

  // Get projects count
  const projectsCount = vendor.projects?.length || 0;
  const invoicesCount = 190; // Placeholder

  return (
    // FIXED: Changed from p-6 to match DynamicList wrapper spacing
    <div className="min-h-screen bg-gray-50" ref={(el) => { if (el) window.scrollTo(0, 0); }}>
      
      {/* ====================================================================
           HEADER SECTION - FIXED SPACING
           max-w-7xl mx-auto matches vendors.jsx container
           mb-6 matches vertical spacing in vendors.jsx
           ==================================================================== */}
      <div className="max-w-7xl mx-auto">
        
        {/* Back Button - minimal bottom margin */}
        <button
          onClick={handleGoBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Vendors</span>
        </button>
      </div>

      {/* ====================================================================
           MAIN CONTENT GRID - FIXED SPACING
           max-w-7xl mx-auto matches vendors.jsx container
           gap-6 matches spacing between columns in vendors.jsx
           ==================================================================== */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ==================================================================
             LEFT COLUMN - VENDOR INFO & ATTACHMENTS
             space-y-6 matches vertical spacing between cards
             ================================================================== */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Header with Name */}
          <div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                {firstName} {lastName}
              </h1>
              <p className="text-gray-500 mt-1">Vendor ID: {vendor.id}</p>
            </div>
          </div>
          
          {/* Vendor Information Card */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Vendor Information</h2>

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

              {/* SAC Code */}
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">SAC Code</p>
                  <p className="text-sm text-gray-800 font-medium">{sacCode}</p>
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
                onClick={handleEditVendor}
                className="p-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
                title="Edit Vendor"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
            </div>
          </div>

          {/* Attachments Card */}
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

          {/* Notes Card */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Notes</h2>
              <button
                onClick={() => setIsAddNoteOpen(true)}
                className="text-teal-600 hover:text-teal-700 text-sm font-medium"
              >
                + Add
              </button>
            </div>

            {notes.length > 0 ? (
              <>
                <div className="space-y-3">
                  {notes.slice(0, 2).map((note, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700 line-clamp-2">{note}</p>
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
              onClick={() => setShowAssignModal(true)}
              className="flex items-center justify-center gap-2 w-44 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors flex-shrink-0"
            >
              <Building2 className="w-4 h-4" />
              Assign Project
            </button>
          </div>

          {/* Search Input - smooth expand/collapse */}
          <div className={showSearch ? "search-panel-open" : "search-panel-closed"}>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search projects, payments..."
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
              icon={<CheckCircle className="w-5 h-5 text-teal-700" />}
              count={vendor.payments_done || 8}
              label="Payments Done"
              subLabel={`${vendor.payments_done || 8} payments are pending`}
              bgColor="bg-teal-50"
              iconBg="bg-teal-100"
            />
            <StatCard
              icon={<Building2 className="w-5 h-5 text-pink-700" />}
              count={projectsCount}
              label="Total Projects"
              subLabel="5 added in last 2 days"
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

            <div className="space-y-3">
              {vendor.projects && vendor.projects.length > 0 ? (
                vendor.projects
                  .filter(project => 
                    !projectSearchTerm || 
                    project.name?.toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
                    project.servey_number?.toLowerCase().includes(projectSearchTerm.toLowerCase())
                  )
                  .slice(0, 5)
                  .map((project, index) => (
                  <div
                    key={project.id || index}
                    className="grid grid-cols-2 gap-4 items-center py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-10 h-10 p-2 bg-gray-100 text-gray-600 rounded-lg flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-800">{project.name}</p>
                        <p className="text-xs text-gray-500">{project.servey_number || 'Newly added'}</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <StatusBadge status={project.is_active ? "Completed" : "Draft"} />
                    </div>
                  </div>
                ))
              ) : (
                <>
                  {[...Array(5)].map((_, index) => {
                    const statuses = ["In Progress", "Pending", "Draft", "Failed", "Completed"];
                    const status = statuses[index % statuses.length];
                    const timestamps = ["Newly added", "Last Month", "Newly added", "Newly added", "Newly added"];
                    
                    return (
                      <div
                        key={index}
                        className="grid grid-cols-2 gap-4 items-center py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <Building2 className="w-10 h-10 p-2 bg-gray-100 text-gray-600 rounded-lg flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-800">ACME Corporation</p>
                            <p className="text-xs text-gray-500">{timestamps[index]}</p>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <StatusBadge status={status} />
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {vendor.projects && vendor.projects.length > 5 ? (
              <button className="w-full mt-4 py-2 text-teal-600 hover:text-teal-700 font-medium text-sm">
                See {vendor.projects.length - 5} More
              </button>
            ) : (
              <button className="w-full mt-4 py-2 text-teal-600 hover:text-teal-700 font-medium text-sm">
                See 5 More
              </button>
            )}
          </div>

          {/* Payments Section */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Payment</h2>

            {/* Table Header */}
            <div className="grid grid-cols-2 gap-4 pb-3 mb-3 border-b border-gray-200">
              <div className="text-sm font-medium text-gray-600">Payment</div>
              <div className="text-sm font-medium text-gray-600 text-right">Status</div>
            </div>

            <div className="space-y-3">
              {DEMO_PAYMENTS.slice(0, 5).map((payment, index) => {
                return (
                  <div
                    key={payment.id}
                    onClick={() => navigate(`/vendors/${id}/payments`)}
                    className="grid grid-cols-2 gap-4 items-center py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-10 h-10 p-2 bg-gray-100 text-gray-600 rounded-lg flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-800">Rs. {parseInt(payment.amount).toLocaleString('en-IN')}/-</p>
                        <p className="text-xs text-gray-500">{new Date(payment.date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <StatusBadge status={payment.status} />
                    </div>
                  </div>
                );
              })}
            </div>

            {DEMO_PAYMENTS.length > 5 && (
              <button 
                onClick={() => navigate(`/vendors/${id}/payments`)}
                className="w-full mt-4 py-2 text-teal-600 hover:text-teal-700 font-medium text-sm"
              >
                See {DEMO_PAYMENTS.length - 5} More
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ====================================================================
           MODALS & OVERLAYS
           ==================================================================== */}

      {/* Add Note Modal */}
      {isAddNoteOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Add Note</h3>
              <button
                onClick={() => setIsAddNoteOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Enter note..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleAddNote}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Add Note
              </button>
              <button
                onClick={() => setIsAddNoteOpen(false)}
                className="flex-1 border border-gray-300 hover:bg-gray-50 py-3 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      

      {/* Edit Vendor Modal - RESPONSIVE */}
      {isEditVendorOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto my-8">
            {/* Header */}
            <div className="bg-teal-600 px-5 py-3.5 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <h3 className="text-lg font-bold text-white">Edit Vendor Details</h3>
              </div>
              <button
                onClick={handleCancelEdit}
                className="text-white hover:text-gray-200 transition-colors p-1 -mr-1 touch-manipulation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <div className="p-5 space-y-3.5">
              {/* Vendor Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Vendor Name
                </label>
                <div className="relative">
                  <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    value={`${editFormData.first_name} ${editFormData.last_name}`.trim()}
                    onChange={(e) => {
                      const fullName = e.target.value.trim();
                      const nameParts = fullName.split(' ');
                      const firstName = nameParts[0] || '';
                      const lastName = nameParts.slice(1).join(' ') || '';
                      handleEditFormChange('first_name', firstName);
                      handleEditFormChange('last_name', lastName);
                    }}
                    placeholder="Acme Corporation"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="tel"
                    value={editFormData.phone_number}
                    onChange={(e) => handleEditFormChange('phone_number', e.target.value)}
                    placeholder="123456789"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm"
                  />
                </div>
              </div>

              {/* GST Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  GST Number
                </label>
                <div className="relative">
                  <FileText className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    value={editFormData.gst_number}
                    onChange={(e) => handleEditFormChange('gst_number', e.target.value)}
                    placeholder="1234556"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Address
                </label>
                <div className="relative">
                  <MapPin className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={editFormData.address}
                    onChange={(e) => handleEditFormChange('address', e.target.value)}
                    placeholder="abc, xyz, 234 567"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => handleEditFormChange('email', e.target.value)}
                    placeholder="Contact@acme.in"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-5 pb-5 space-y-2.5">
              <button
                onClick={handleSaveEdit}
                className="w-full bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white py-2.5 rounded-lg font-medium transition-all text-sm touch-manipulation"
              >
                Save Info
              </button>
              <button
                onClick={handleCancelEdit}
                className="w-full border-2 border-teal-600 text-teal-600 hover:bg-teal-50 active:bg-teal-100 py-2.5 rounded-lg font-medium transition-all text-sm touch-manipulation"
              >
                Cancel
              </button>
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
            <p className="text-base sm:text-lg font-medium text-gray-700 mb-0">Vendor details updated</p>
          </div>
        </div>
      )}


            {/* View All Notes Modal */}
      {isViewAllNotesOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">All Notes</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddNoteOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Note
                </button>
                <button
                  onClick={() => setIsViewAllNotesOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {notes.length > 0 ? (
                <div className="space-y-4">
                  {notes.map((note, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <p className="text-sm text-gray-700 leading-relaxed">{note}</p>
                      <p className="text-xs text-gray-500 mt-2">Added recently</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No notes available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Project Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scaleIn">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-teal-600 text-white">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                <h4 className="text-lg font-semibold">Assign Project</h4>
              </div>
              <button 
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedProject(null);
                }}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button className="flex-1 px-4 py-3 text-sm font-medium text-teal-600 border-b-2 border-teal-600 bg-teal-50">
                Projects
              </button>
              <button className="flex-1 px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors">
                Details
              </button>
            </div>

            {/* Projects List */}
            <div className="p-4 max-h-[50vh] overflow-y-auto">
              <div className="space-y-3">
                {DEMO_PROJECTS.slice(0, 5).map((project) => {
                  const isSelected = selectedProject?.id === project.id;
                  
                  return (
                    <div
                      key={project.id}
                      onClick={() => setSelectedProject(project)}
                      className={`
                        flex items-center justify-between p-4 rounded-xl transition-colors cursor-pointer
                        ${isSelected 
                          ? 'bg-teal-50 border-2 border-teal-500' 
                          : 'bg-white border-2 border-gray-200 hover:border-teal-300 hover:bg-teal-50/50'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors
                          ${isSelected ? 'bg-teal-500' : 'bg-gray-200'}
                        `}>
                          <User className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{project.name}</p>
                          <p className="text-xs text-gray-500">Acme Corporation, Riverside Corporate Tower</p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-teal-600" />
                          <span className="text-sm font-medium text-teal-600">Selected</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {DEMO_PROJECTS.length > 5 && (
                <button className="text-sm text-teal-600 hover:text-teal-700 font-medium mt-3">
                  See {DEMO_PROJECTS.length - 5} More
                </button>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="p-4 space-y-2 border-t border-gray-200">
              <button 
                onClick={() => {
                  // Handle done action - assign project
                  if (selectedProject) {
                    // TODO: API call to assign project to vendor
                    console.log('Assigning project:', selectedProject.id, 'to vendor:', id);
                  }
                  setShowAssignModal(false);
                  setSelectedProject(null);
                }}
                disabled={!selectedProject}
                className={`
                  w-full py-3 rounded-lg font-medium transition-colors
                  ${selectedProject
                    ? 'bg-teal-600 hover:bg-teal-700 text-white cursor-pointer'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                Done
              </button>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedProject(null);
                }}
                className="w-full border border-teal-600 text-teal-600 hover:bg-teal-50 py-3 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
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