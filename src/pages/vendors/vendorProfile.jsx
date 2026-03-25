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
  Globe,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  MoreVertical,
  BarChart2,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { getVendorById, updateVendor, assignVendorToProject, getVendorProjects, unassignVendorFromProject } from "../../services/vendors";
import { getProjects } from "../../services/projects";
import { VENDOR_CATEGORIES, VENDOR_CATEGORY_OPTIONS, VENDOR_STATUS_DISPLAY } from "./vendors.config";

/**
 * ============================================================================
 * VENDOR PROFILE COMPONENT - v1.0
 * ============================================================================
 *
 * Mirrors clientsProfile.jsx exactly in structure and design.
 * Uses real API data from /vendors/get_vendor/?id=
 *
 * API Response fields:
 *   id, name, contact_person, email, phone, address, state, city, pincode,
 *   website, gst_number, status, status_display, vendor_categories_display,
 *   created_at, updated_at, created_by, updated_by, is_active, is_deleted
 *
 * SPACING STRUCTURE (matches vendorsList.jsx):
 * - Container: max-w-7xl mx-auto
 * - Grid gap: gap-6
 * - Card spacing: space-y-6
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const ENABLE_LOGGING = false;

const logger = {
  log: (...args) => ENABLE_LOGGING && console.log("[VendorProfile]", ...args),
  error: (...args) => console.error("[VendorProfile]", ...args),
  warn: (...args) => console.warn("[VendorProfile]", ...args),
};

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

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
// STAT CARD (matches clientsProfile StatCard)
// ============================================================================

const StatCard = ({ icon, count, label, subLabel, bgColor, iconBg }) => (
  <div
    className={`${bgColor} rounded-xl p-5`}
    style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.12)" }}
  >
    <div className="flex items-start gap-3">
      <div className={`${iconBg} rounded-xl p-2.5 flex-shrink-0`}>{icon}</div>
      <div>
        <h3 className="text-3xl font-bold text-white mb-0.5">{count}</h3>
        <p className="text-white/90 font-semibold text-sm">{label}</p>
        {subLabel && <p className="text-white/65 text-xs mt-1">{subLabel}</p>}
      </div>
    </div>
  </div>
);

// ============================================================================
// PAGINATION BAR  (mirrors clientsProfile.jsx exactly)
// ============================================================================

const PaginationBar = ({ currentPage, totalPages, totalItems, pageSize, onPrev, onNext }) => {
  const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);
  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-gray-200">
      <span className="text-xs text-gray-400 font-medium">
        {totalItems === 0 ? "No items" : `${from}–${to} of ${totalItems}`}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          disabled={currentPage === 1}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
            currentPage === 1
              ? "text-gray-300 cursor-not-allowed"
              : "text-gray-600 hover:bg-gray-100 active:bg-gray-200"
          }`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Prev
        </button>
        <div className="flex items-center gap-1 px-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <div
              key={page}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-150 ${
                page === currentPage
                  ? "bg-teal-600 text-white shadow-sm shadow-teal-200"
                  : "bg-gray-100 text-gray-400"
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
              ? "text-gray-300 cursor-not-allowed"
              : "text-teal-600 hover:bg-teal-100 active:bg-teal-200"
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
// STATUS BADGE
// ============================================================================

const getStatusBadgeConfig = (status) => {
  const s = Number(status);
  const configs = {
    1: { text: "Active",      bg: "bg-teal-100",   textColor: "text-teal-700",   dot: "bg-teal-500" },
    2: { text: "Inactive",    bg: "bg-yellow-100", textColor: "text-yellow-700", dot: "bg-yellow-500" },
    3: { text: "Blacklisted", bg: "bg-red-100",    textColor: "text-red-700",    dot: "bg-red-500" },
  };
  return configs[s] || configs[1];
};

const StatusBadge = ({ status }) => {
  const cfg = getStatusBadgeConfig(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.textColor} text-xs font-semibold whitespace-nowrap`}
    >
      <span className={`w-2 h-2 rounded-full ${cfg.dot} flex-shrink-0`} />
      {cfg.text}
    </span>
  );
};

// ============================================================================
// MULTI-SELECT DROPDOWN (for category picker in edit drawer)
// ============================================================================

const MultiSelectField = ({ label, name, value = [], onChange, options = [], required, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useCallback((node) => {
    if (!node) return;
    const handler = (e) => {
      if (!node.contains(e.target)) { setIsOpen(false); setSearch(""); }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));

  const toggle = (optVal) => {
    const numVal = Number(optVal);
    const next = value.includes(numVal)
      ? value.filter((v) => v !== numVal)
      : [...value, numVal];
    onChange({ target: { name, value: next } });
  };

  const selectedLabels = options
    .filter((o) => value.includes(Number(o.value)))
    .map((o) => o.label);

  return (
    <div ref={ref} className="relative w-full">
      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((p) => !p)}
        disabled={disabled}
        className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 text-sm text-left flex items-center justify-between transition-all ${
          disabled ? "bg-gray-100 border-gray-300 cursor-not-allowed" : "bg-white border-gray-300 hover:border-teal-400"
        }`}
      >
        <span className={`flex items-center gap-2 truncate ${selectedLabels.length ? "text-gray-900" : "text-gray-400"}`}>
          <Settings className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {selectedLabels.length
            ? selectedLabels.length === 1
              ? selectedLabels[0]
              : `${selectedLabels.length} categories selected`
            : "Select categories"}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Selected tags */}
      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedLabels.map((label, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-xs font-medium"
            >
              {label}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => toggle(options.find((o) => o.label === label)?.value)}
                  className="w-3.5 h-3.5 rounded-full hover:bg-teal-200 flex items-center justify-center"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {isOpen && !disabled && (
        <div
          className="absolute left-0 top-full mt-1.5 w-full bg-white rounded-lg shadow-2xl border border-gray-200 z-[9999] overflow-hidden"
          style={{ animation: "dropdownIn 0.18s ease" }}
        >
          <div className="p-2.5 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No options found</p>
            ) : (
              filtered.map((opt) => {
                const isSelected = value.includes(Number(opt.value));
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggle(opt.value)}
                    className={`w-full px-3 py-2.5 text-sm text-left flex items-center gap-2.5 transition-colors ${
                      isSelected ? "bg-teal-50 text-teal-800" : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${
                        isSelected ? "bg-teal-600 border-teal-600" : "border-gray-300"
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    {opt.label}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function VendorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================

  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI State
  const [isEditVendorOpen, setIsEditVendorOpen] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [attachmentSearchTerm, setAttachmentSearchTerm] = useState("");

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    website: "",
    gst_number: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    status: 1,
    vendor_category: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [editFormError, setEditFormError] = useState("");

  // Placeholder attachments (UI-only for now)
  const [attachments] = useState(["GST Certificate", "PAN Card", "Trade License"]);

  // Projects state
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [isAssignProjectOpen, setIsAssignProjectOpen] = useState(false);
  const [allProjects, setAllProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState(false);

  // Unassign mode state
  const [isUnassignMode, setIsUnassignMode] = useState(false);
  const [unassigningProjectId, setUnassigningProjectId] = useState(null);
  const [unassignLoadingId, setUnassignLoadingId] = useState(null);
  const [unassignError, setUnassignError] = useState("");

  // Pagination & search — separate per section
  const PAGE_SIZE = 5;
  const [projectSearchTerm, setProjectSearchTerm] = useState("");
  const [showProjectSearch, setShowProjectSearch] = useState(false);
  const [projectsPage, setProjectsPage] = useState(1);
  const [paymentSearchTerm, setPaymentSearchTerm] = useState("");
  const [showPaymentSearch, setShowPaymentSearch] = useState(false);
  const [paymentsPage, setPaymentsPage] = useState(1);

  // Reset each section's page when its own search term changes
  useEffect(() => { setProjectsPage(1); }, [projectSearchTerm]);
  useEffect(() => { setPaymentsPage(1); }, [paymentSearchTerm]);

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  const fetchVendorData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      logger.log("📥 Fetching vendor with ID:", id);

      const response = await getVendorById(id);
      logger.log("✅ Raw API response:", response);

      let vendorData;

      if (response.status === "success" && response.data) {
        vendorData = response.data;
      } else if (response.data && !response.status) {
        vendorData = response.data;
      } else if (response.id) {
        vendorData = response;
      } else {
        throw new Error("Invalid response format from server");
      }

      if (!vendorData || !vendorData.id) {
        throw new Error("Vendor data is incomplete or missing");
      }

      logger.log("✅ Final vendor data:", vendorData);
      setVendor(vendorData);

      // Fetch already-assigned projects for this vendor
      try {
        const projRes = await getVendorProjects(vendorData.id);
        const results = projRes?.data?.results || projRes?.results || [];
        setAssignedProjects(results);
      } catch {
        // Non-critical — silently ignore if this fails
      }
    } catch (err) {
      logger.error("❌ Error fetching vendor:", err);

      let errorMessage = "Failed to load vendor details";

      if (err.message.includes("404") || err.message.includes("not found")) {
        errorMessage = `Vendor with ID ${id} not found`;
      } else if (err.message.includes("Network Error")) {
        errorMessage = "Network error. Please check your connection.";
      } else if (err.message.includes("401") || err.message.includes("403")) {
        errorMessage = "You do not have permission to view this vendor";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (id) {
      fetchVendorData();
    } else {
      setError("No vendor ID provided");
      setLoading(false);
    }
  }, [id, fetchVendorData]);

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  const handleRetry = () => fetchVendorData();

  const handleGoBack = () => navigate("/vendors");

  const handleEditVendor = () => {
    setEditFormError("");
    setSaveError(null);

    // Parse vendor_categories_display back to IDs for the multi-select.
    // API may return an array of strings, a comma-separated string, or null.
    let categoryIds = [];
    const raw = vendor.vendor_categories_display;
    if (raw) {
      const displayNames = Array.isArray(raw)
        ? raw.map((s) => String(s).trim())
        : String(raw).split(",").map((s) => s.trim());
      categoryIds = Object.entries(VENDOR_CATEGORIES)
        .filter(([, label]) => displayNames.includes(label))
        .map(([id]) => Number(id));
    }

    setEditFormData({
      name:            vendor.name            || "",
      contact_person:  vendor.contact_person  || "",
      phone:           vendor.phone           || "",
      email:           vendor.email           || "",
      website:         vendor.website         || "",
      gst_number:      vendor.gst_number      || "",
      address:         vendor.address         || "",
      city:            vendor.city            || "",
      state:           vendor.state           || "",
      pincode:         vendor.pincode != null ? String(vendor.pincode) : "",
      status:          vendor.status          || 1,
      vendor_category: categoryIds,
    });
    setIsEditVendorOpen(true);
  };

  const handleEditFormChange = (field, value) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async () => {
    setEditFormError("");
    if (!editFormData.name.trim()) {
      setEditFormError("Vendor name is required");
      return;
    }
    if (!editFormData.contact_person.trim()) {
      setEditFormError("Contact person is required");
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);

      const payload = {
        name:            editFormData.name.trim(),
        contact_person:  editFormData.contact_person.trim(),
        email:           editFormData.email.trim(),
        phone:           editFormData.phone.trim(),
        address:         editFormData.address.trim(),
        city:            editFormData.city.trim(),
        state:           editFormData.state.trim(),
        pincode:         editFormData.pincode.trim(),
        website:         editFormData.website.trim(),
        gst_number:      editFormData.gst_number.trim(),
        status:          Number(editFormData.status),
        vendor_category: editFormData.vendor_category.map(Number),
      };

      await updateVendor(vendor.id, payload);

      // Update local vendor state with new values
      const updatedCategoryDisplay = editFormData.vendor_category
        .map((id) => VENDOR_CATEGORIES[id] || `Category ${id}`)
        .join(", ");

      setVendor((prev) => ({
        ...prev,
        ...payload,
        vendor_categories_display: updatedCategoryDisplay,
        status_display: VENDOR_STATUS_DISPLAY[Number(editFormData.status)] || "Active",
      }));

      setIsEditVendorOpen(false);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (err) {
      // updateVendor already extracts the best message and throws a plain Error
      setSaveError(err.message || "Failed to update vendor. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditVendorOpen(false);
    setEditFormError("");
    setSaveError(null);
  };

  // ── Assign Project handlers ────────────────────────────────────────────────

  const openAssignProject = async () => {
    setAssignError("");
    setSelectedProjectId("");
    setProjectSearchTerm("");
    setAssignSuccess(false);
    setIsUnassignMode(false);
    setIsAssignProjectOpen(true);
    setProjectsLoading(true);
    try {
      const res = await getProjects({ page: 1, page_size: 200 });
      const results = res?.data?.results || res?.results || [];
      setAllProjects(results);
    } catch {
      setAssignError("Failed to load projects. Please try again.");
    } finally {
      setProjectsLoading(false);
    }
  };

  const closeAssignProject = () => {
    if (assignLoading) return;
    setIsAssignProjectOpen(false);
    setSelectedProjectId("");
    setAssignError("");
    setAssignSuccess(false);
    setProjectSearchTerm("");
  };

  const handleAssignProject = async () => {
    if (!selectedProjectId) {
      setAssignError("Please select a project.");
      return;
    }
    setAssignError("");
    setAssignLoading(true);
    try {
      await assignVendorToProject(vendor.id, selectedProjectId);
      // Add the newly assigned project to the local list
      const project = allProjects.find((p) => String(p.id) === String(selectedProjectId));
      if (project) {
        setAssignedProjects((prev) => {
          const alreadyExists = prev.some((p) => p.id === project.id);
          return alreadyExists ? prev : [...prev, project];
        });
      }
      setAssignSuccess(true);
      setTimeout(() => { closeAssignProject(); }, 1500);
    } catch (err) {
      if (err?.message?.includes('409') || err?.message?.toLowerCase().includes('conflict')) {
        // Already assigned — just add it to local list silently
        const project = allProjects.find((p) => String(p.id) === String(selectedProjectId));
        if (project) {
          setAssignedProjects((prev) =>
            prev.some((p) => p.id === project.id) ? prev : [...prev, project]
          );
        }
        setAssignSuccess(true);
        setTimeout(() => { closeAssignProject(); }, 1500);
        return;
      }
      const msg =
        err?.response?.data?.errors ||
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err.message ||
        "Failed to assign project.";
      setAssignError(typeof msg === "object" ? JSON.stringify(msg) : msg);
    } finally {
      setAssignLoading(false);
    }
  };

  // ── Unassign Project handlers ──────────────────────────────────────────────

  const toggleUnassignMode = () => {
    setIsUnassignMode((prev) => !prev);
    setUnassigningProjectId(null);
    setUnassignError("");
  };

  const handleUnassignConfirm = (projectId) => {
    setUnassigningProjectId(projectId); // show inline confirm for this row
  };

  const handleUnassignCancel = () => {
    setUnassigningProjectId(null);
  };

  const handleUnassignProject = async (projectId) => {
    setUnassignLoadingId(projectId);
    setUnassignError("");
    try {
      await unassignVendorFromProject(vendor.id, projectId);
      setAssignedProjects((prev) => prev.filter((p) => p.id !== projectId));
      setUnassigningProjectId(null);
    } catch (err) {
      const msg =
        err?.response?.data?.errors ||
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err.message ||
        "Failed to unassign project. Please try again.";
      setUnassignError(typeof msg === "object" ? JSON.stringify(msg) : msg);
    } finally {
      setUnassignLoadingId(null);
    }
  };

  // ========================================================================
  // RENDER GUARDS
  // ========================================================================

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} onRetry={handleRetry} onGoBack={handleGoBack} />;
  if (!vendor) return <ErrorDisplay error="Vendor data not available" onRetry={handleRetry} onGoBack={handleGoBack} />;

  // ========================================================================
  // EXTRACT VENDOR DATA WITH SAFE DEFAULTS
  // ========================================================================

  const vendorName = vendor.name || "N/A";
  const contactPerson = vendor.contact_person || "N/A";
  const email = vendor.email || "N/A";
  const phone = vendor.phone || "N/A";
  const address = vendor.address || "N/A";
  const city = vendor.city || "";
  const state = vendor.state || "";
  const pincode = vendor.pincode || "";
  const website = vendor.website || "";
  const gstNumber = vendor.gst_number || "N/A";
  // vendor_categories_display may be a string, an array, or null depending on API
  const rawCategories = vendor.vendor_categories_display;
  const categoryDisplay = Array.isArray(rawCategories)
    ? rawCategories.join(", ") || "N/A"
    : typeof rawCategories === "string" && rawCategories.trim()
      ? rawCategories
      : "N/A";
  const status = vendor.status || 1;

  const fullAddress = [address, city, state, pincode].filter(Boolean).join(", ") || address;

  const filteredAttachments = attachments.filter((a) =>
    a.toLowerCase().includes(attachmentSearchTerm.toLowerCase())
  );

  const createdDate = vendor.created_at
    ? new Date(vendor.created_at).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "N/A";

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div
      className="min-h-screen bg-gray-50"
    >
      {/* ====================================================================
           HEADER SECTION
           ==================================================================== */}
      <div className="max-w-7xl mx-auto">
        <button
          onClick={handleGoBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Vendors</span>
        </button>
      </div>

      {/* ====================================================================
           MAIN CONTENT GRID
           ==================================================================== */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ==================================================================
             LEFT COLUMN
             ================================================================== */}
        <div className="lg:col-span-1 space-y-6">

          {/* Vendor Name + Status */}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-800 flex-1 truncate">
                {vendorName}
              </h1>
              <StatusBadge status={status} />
            </div>
            <p className="text-gray-500 text-sm mt-1">{categoryDisplay}</p>
          </div>

          {/* Vendor Information Card */}
          <div className="bg-white rounded-2xl border-2 border-gray-300 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-teal-600 rounded-full" />
              <h2 className="text-lg font-bold text-gray-800">Vendor Information</h2>
            </div>

            <div className="space-y-0 divide-y divide-gray-100">
              {/* Contact Person */}
              <div className="flex items-center gap-3 py-3">
                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Contact Person</p>
                  <p className="text-sm text-gray-800 font-semibold truncate">{contactPerson}</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3 py-3">
                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Email</p>
                  <p className="text-sm text-gray-800 font-semibold break-all">{email}</p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-3 py-3">
                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-teal-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Phone Number</p>
                  <p className="text-sm text-gray-800 font-semibold">{phone}</p>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-3 py-3">
                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-teal-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Address</p>
                  <p className="text-sm text-gray-800 font-semibold">{fullAddress}</p>
                </div>
              </div>

              {/* Website */}
              {website && (
                <div className="flex items-center gap-3 py-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Website</p>
                    <a
                      href={website.startsWith("http") ? website : `https://${website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-teal-600 font-semibold hover:underline truncate block"
                    >
                      {website}
                    </a>
                  </div>
                </div>
              )}

              {/* GST Number */}
              <div className="flex items-center gap-3 py-3">
                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-teal-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">GST Number</p>
                  <p className="text-sm text-gray-800 font-semibold">{gstNumber}</p>
                </div>
              </div>

              {/* Member Since */}
              <div className="flex items-center gap-3 py-3">
                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <Settings className="w-4 h-4 text-teal-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Member Since</p>
                  <p className="text-sm text-gray-800 font-semibold">{createdDate}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t-2 border-gray-200">
              <button
                onClick={() => window.location.href = `mailto:${email}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                <Mail className="w-4 h-4" />
                Send Email
              </button>
              <button className="flex-1 flex items-center justify-center gap-1.5 py-2 border-2 border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-semibold transition-colors">
                <BarChart2 className="w-4 h-4" />
                Analytics
              </button>
              <button
                onClick={handleEditVendor}
                className="p-2 border-2 border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
                title="Edit Vendor"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Attachments Card */}
          <div className="bg-white rounded-2xl border-2 border-gray-300 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-teal-600 rounded-full" />
                <h2 className="text-lg font-bold text-gray-800">Attachments</h2>
                {attachments.length > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-600 text-white text-xs font-bold">
                    {attachments.length}
                  </span>
                )}
              </div>
              <button className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-colors">
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search attachments..."
                value={attachmentSearchTerm}
                onChange={(e) => setAttachmentSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 text-sm transition-all"
              />
            </div>

            {/* File List */}
            {(() => {
              const getFileStyle = (name) => {
                const ext = name.toLowerCase();
                if (ext.includes("gst"))    return { bg: "bg-green-100",  icon: "text-green-600",  label: "GST" };
                if (ext.includes("pan"))    return { bg: "bg-blue-100",   icon: "text-blue-600",   label: "DOC" };
                if (ext.includes("trade"))  return { bg: "bg-orange-100", icon: "text-orange-600", label: "LIC" };
                if (ext.includes("bank"))   return { bg: "bg-purple-100", icon: "text-purple-600", label: "BANK" };
                return                             { bg: "bg-gray-100",   icon: "text-gray-500",   label: "FILE" };
              };

              return (
                <div className="space-y-2">
                  {filteredAttachments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                        <FileText className="w-6 h-6 text-gray-300" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">No attachments found</p>
                      <p className="text-xs text-gray-400 mt-1">Upload documents for this vendor</p>
                    </div>
                  ) : (
                    filteredAttachments.map((attachment, index) => {
                      const style = getFileStyle(attachment);
                      return (
                        <div
                          key={index}
                          className="group flex items-center gap-3 p-3 rounded-xl border-2 border-gray-100 hover:border-teal-300 hover:bg-teal-50/20 transition-all duration-150 cursor-pointer"
                        >
                          <div className={`w-10 h-10 rounded-xl ${style.bg} flex items-center justify-center flex-shrink-0`}>
                            <FileText className={`w-5 h-5 ${style.icon}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 font-semibold truncate">{attachment}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{style.label} Document</p>
                          </div>
                          <button className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-150 flex-shrink-0">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* ==================================================================
             RIGHT COLUMN
             ================================================================== */}
        <div className="lg:col-span-2 space-y-6">

          {/* Stats Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard
              icon={<FileText className="w-5 h-5 text-white" />}
              count="—"
              label="Total Payments"
              subLabel="Payments linked to this vendor"
              bgColor="bg-teal-600"
              iconBg="bg-white/20"
            />
            <StatCard
              icon={<Building2 className="w-5 h-5 text-white" />}
              count={assignedProjects.length}
              label="Total Projects"
              subLabel="Projects linked to this vendor"
              bgColor="bg-pink-500"
              iconBg="bg-white/20"
            />
          </div>

          {/* Vendor Details Card */}
          <div className="bg-white rounded-2xl border-2 border-gray-300 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-teal-600 rounded-full" />
              <h2 className="text-lg font-bold text-gray-800">Vendor Details</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Vendor ID */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Vendor ID</p>
                <p className="text-sm font-semibold text-gray-800">#{vendor.id}</p>
              </div>

              {/* Status */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Status</p>
                <StatusBadge status={status} />
              </div>

              {/* Category */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 sm:col-span-2">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Categories</p>
                <div className="flex flex-wrap gap-2">
                  {categoryDisplay && categoryDisplay !== "N/A"
                    ? categoryDisplay.split(",").map((cat, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2.5 py-1 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold"
                        >
                          {cat.trim()}
                        </span>
                      ))
                    : <span className="text-sm text-gray-400">No categories assigned</span>
                  }
                </div>
              </div>

              {/* Created Date */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Created On</p>
                <p className="text-sm font-semibold text-gray-800">{createdDate}</p>
              </div>

              {/* Updated Date */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Last Updated</p>
                <p className="text-sm font-semibold text-gray-800">
                  {vendor.updated_at
                    ? new Date(vendor.updated_at).toLocaleDateString("en-GB", {
                        day: "2-digit", month: "short", year: "numeric",
                      })
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Projects Section */}
          <div className={`bg-white rounded-2xl border-2 transition-colors duration-300 p-6 ${isUnassignMode ? "border-red-300" : "border-gray-300"}`}>

            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-1 h-5 rounded-full transition-colors duration-300 ${isUnassignMode ? "bg-red-500" : "bg-teal-600"}`} />
                <h2 className="text-lg font-bold text-gray-800">Projects</h2>
                {assignedProjects.length > 0 && (
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-bold transition-colors duration-300 ${isUnassignMode ? "bg-red-500" : "bg-teal-600"}`}>
                    {assignedProjects.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowProjectSearch(s => !s); if (showProjectSearch) setProjectSearchTerm(""); }}
                  className={`p-2 rounded-lg border-2 transition-all duration-150 ${showProjectSearch ? "border-teal-500 bg-teal-50 text-teal-600" : "border-gray-300 text-teal-600 hover:border-teal-400 hover:bg-teal-50"}`}
                  title="Search projects"
                >
                  <Search className="w-4 h-4" />
                </button>
                {assignedProjects.length > 0 && (
                  <button
                    onClick={toggleUnassignMode}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 border-2 ${
                      isUnassignMode
                        ? "bg-red-500 border-red-500 text-white hover:bg-red-600 hover:border-red-600 shadow-sm shadow-red-500/30"
                        : "bg-white border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-500 hover:bg-red-50"
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                    {isUnassignMode ? "Done" : "Unassign"}
                  </button>
                )}
                <button
                  onClick={() => { setIsUnassignMode(false); openAssignProject(); }}
                  disabled={isUnassignMode}
                  className="flex items-center gap-2 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm shadow-teal-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Assign Project
                </button>
              </div>
            </div>

            {/* Search bar — slides in when toggled */}
            {showProjectSearch && (
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by project name, city..."
                    value={projectSearchTerm}
                    onChange={(e) => setProjectSearchTerm(e.target.value)}
                    autoFocus
                    className="w-full pl-9 pr-9 py-2.5 border-2 border-teal-200 bg-teal-50/40 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:bg-white focus:ring-0 transition-all"
                  />
                  {projectSearchTerm ? (
                    <button
                      onClick={() => setProjectSearchTerm("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                    >
                      <X className="w-3 h-3 text-gray-500" />
                    </button>
                  ) : (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 select-none">
                      {assignedProjects.length} total
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Unassign mode banner */}
            {isUnassignMode && (
              <div className="flex items-center gap-2 px-4 py-2.5 mb-3 bg-red-50 border border-red-200 rounded-xl">
                <Trash2 className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-xs font-medium text-red-600">
                  Unassign mode is active — click <span className="font-bold">Remove</span> on any project to unassign it. Click <span className="font-bold">Done</span> when finished.
                </p>
              </div>
            )}

            {/* Unassign error banner */}
            {unassignError && (
              <div className="flex items-start gap-2 px-4 py-2.5 mb-3 bg-red-50 border border-red-300 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-red-600">Failed to unassign project</p>
                  <p className="text-xs text-red-500 mt-0.5">{unassignError}</p>
                </div>
                <button onClick={() => setUnassignError("")} className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-200 transition-colors">
                  <X className="w-3 h-3 text-red-500" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pb-3 mb-3 border-b-2 border-gray-200">
              <div className="text-sm font-medium text-gray-600">Project Name</div>
              <div className="text-sm font-medium text-gray-600 text-right">{isUnassignMode ? "Action" : "Status"}</div>
            </div>

            {(() => {
              const filtered = assignedProjects.filter(p =>
                !projectSearchTerm ||
                p.name?.toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
                p.city?.toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
                p.state?.toLowerCase().includes(projectSearchTerm.toLowerCase())
              );
              const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
              const safePage = Math.min(projectsPage, totalPages);
              const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
              return filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 font-medium">{projectSearchTerm ? "No projects match your search" : "No projects yet"}</p>
                  <p className="text-xs text-gray-400 mt-1">{projectSearchTerm ? "Try a different search term" : "Projects assigned to this vendor will appear here"}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {paginated.map((project) => {
                      const isConfirming = unassigningProjectId === project.id;
                      const isRemoving = unassignLoadingId === project.id;
                      return (
                        <div
                          key={project.id}
                          className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 ${
                            isUnassignMode
                              ? isConfirming ? "border-red-400 bg-red-50" : "border-red-200 hover:border-red-400 hover:bg-red-50/40"
                              : "border-gray-200 hover:border-teal-400 hover:bg-teal-50/40"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isUnassignMode ? "bg-red-100" : "bg-teal-100"}`}>
                              <Building2 className={`w-4 h-4 ${isUnassignMode ? "text-red-500" : "text-teal-600"}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">{project.name}</p>
                              {project.city && <p className="text-xs text-gray-400 truncate">{project.city}{project.state ? `, ${project.state}` : ""}</p>}
                            </div>
                          </div>
                          {isUnassignMode ? (
                            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                              {isConfirming ? (
                                <>
                                  <span className="text-xs text-red-600 font-medium">Remove?</span>
                                  <button onClick={() => handleUnassignProject(project.id)} disabled={isRemoving} className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50">
                                    {isRemoving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                    Yes
                                  </button>
                                  <button onClick={handleUnassignCancel} disabled={isRemoving} className="px-3 py-1.5 border border-gray-300 hover:bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50">No</button>
                                </>
                              ) : (
                                <button onClick={() => handleUnassignConfirm(project.id)} disabled={isRemoving} className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-red-300 hover:border-red-500 hover:bg-red-500 text-red-500 hover:text-white rounded-lg text-xs font-semibold transition-all duration-150">
                                  <Trash2 className="w-3 h-3" />
                                  Remove
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold flex-shrink-0 ml-2">Assigned</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {totalPages > 1 && (
                    <PaginationBar currentPage={safePage} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE}
                      onPrev={() => setProjectsPage(p => Math.max(1, p - 1))}
                      onNext={() => setProjectsPage(p => Math.min(totalPages, p + 1))}
                    />
                  )}
                </>
              );
            })()}
          </div>

          {/* Payments Section */}
          <div className="bg-white rounded-2xl border-2 border-gray-300 p-6">

            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-teal-600 rounded-full" />
                <h2 className="text-lg font-bold text-gray-800">Payments</h2>
              </div>
              <button
                onClick={() => { setShowPaymentSearch(s => !s); if (showPaymentSearch) setPaymentSearchTerm(""); }}
                className={`p-2 rounded-lg border-2 transition-all duration-150 ${showPaymentSearch ? "border-teal-500 bg-teal-50 text-teal-600" : "border-gray-300 text-teal-600 hover:border-teal-400 hover:bg-teal-50"}`}
                title="Search payments"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* Search bar — appears when toggled */}
            {showPaymentSearch && (
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search payments..."
                    value={paymentSearchTerm}
                    onChange={(e) => setPaymentSearchTerm(e.target.value)}
                    autoFocus
                    className="w-full pl-9 pr-9 py-2.5 border-2 border-teal-200 bg-teal-50/40 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:bg-white focus:ring-0 transition-all"
                  />
                  {paymentSearchTerm && (
                    <button
                      onClick={() => setPaymentSearchTerm("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                    >
                      <X className="w-3 h-3 text-gray-500" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 pb-3 mb-3 border-b-2 border-gray-300">
              <div className="text-sm font-medium text-gray-600">Payment</div>
              <div className="text-sm font-medium text-gray-600 text-center">Date</div>
              <div className="text-sm font-medium text-gray-600 text-right">Status</div>
            </div>

            {(() => {
              const allPayments = [];
              const filtered = allPayments.filter(p =>
                !paymentSearchTerm ||
                p.name?.toLowerCase().includes(paymentSearchTerm.toLowerCase())
              );
              const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
              const safePage = Math.min(paymentsPage, totalPages);
              const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
              return filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 font-medium">{paymentSearchTerm ? "No payments match your search" : "No payments yet"}</p>
                  <p className="text-xs text-gray-400 mt-1">{paymentSearchTerm ? "Try a different search term" : "Payment records for this vendor will appear here"}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    {paginated.map((payment, index) => (
                      <div key={payment.id || index} className="grid grid-cols-3 gap-4 items-center py-3 hover:bg-gray-50 rounded-lg px-2 transition-colors">
                        <p className="text-sm font-medium text-gray-800 truncate">{payment.name}</p>
                        <p className="text-sm text-gray-500 text-center">{payment.date}</p>
                        <div className="flex justify-end">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold">{payment.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <PaginationBar currentPage={safePage} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE}
                      onPrev={() => setPaymentsPage(p => Math.max(1, p - 1))}
                      onNext={() => setPaymentsPage(p => Math.min(totalPages, p + 1))}
                    />
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ====================================================================
           ASSIGN PROJECT MODAL
           ==================================================================== */}
      {isAssignProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeAssignProject}
          />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-scaleIn"
            style={{ maxHeight: "calc(100vh - 48px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 bg-teal-600 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center border border-white/30">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base leading-tight">Assign Project</h3>
                  <p className="text-white/80 text-xs mt-0.5 font-medium">Link a project to {vendorName}</p>
                </div>
              </div>
              <button
                onClick={closeAssignProject}
                disabled={assignLoading}
                className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/30 border border-white/30 flex items-center justify-center text-white transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto min-h-0 px-5 py-5 space-y-4">
              {/* Vendor info chip */}
              <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-teal-600 font-medium">Vendor (auto-detected)</p>
                  <p className="text-sm font-bold text-teal-800">{vendorName}</p>
                </div>
              </div>

              {/* Error */}
              {assignError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 px-3.5 py-2.5 rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-xs font-medium leading-relaxed">{assignError}</span>
                </div>
              )}

              {/* Success */}
              {assignSuccess && (
                <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 text-teal-700 px-3.5 py-2.5 rounded-xl">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-semibold">Project assigned successfully!</span>
                </div>
              )}

              {/* Project search + select */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Project <span className="text-red-500">*</span>
                </label>

                {/* Search */}
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={projectSearchTerm}
                    onChange={(e) => setProjectSearchTerm(e.target.value)}
                    disabled={projectsLoading || assignLoading}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent text-sm disabled:bg-gray-100"
                  />
                </div>

                {/* List */}
                {projectsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
                    <span className="ml-2 text-sm text-gray-500">Loading projects...</span>
                  </div>
                ) : (
                  <div className="border-2 border-gray-300 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    {allProjects.filter((p) =>
                      p.name?.toLowerCase().includes(projectSearchTerm.toLowerCase())
                    ).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Building2 className="w-8 h-8 text-gray-300 mb-2" />
                        <p className="text-sm text-gray-400">No projects found</p>
                      </div>
                    ) : (
                      allProjects
                        .filter((p) =>
                          p.name?.toLowerCase().includes(projectSearchTerm.toLowerCase())
                        )
                        .map((project) => {
                          const isSelected = String(selectedProjectId) === String(project.id);
                          const alreadyAssigned = assignedProjects.some((ap) => ap.id === project.id);
                          return (
                            <button
                              key={project.id}
                              type="button"
                              onClick={() => !alreadyAssigned && setSelectedProjectId(String(project.id))}
                              disabled={alreadyAssigned || assignLoading}
                              className={`w-full px-4 py-3 text-left flex items-center gap-3 border-b border-gray-200 last:border-b-0 transition-colors ${
                                alreadyAssigned
                                  ? "bg-gray-50 cursor-not-allowed opacity-60"
                                  : isSelected
                                  ? "bg-teal-50 border-l-4 border-l-teal-600"
                                  : "hover:bg-gray-50"
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-teal-600" : "bg-gray-100"}`}>
                                <Building2 className={`w-4 h-4 ${isSelected ? "text-white" : "text-gray-500"}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold truncate ${isSelected ? "text-teal-800" : "text-gray-800"}`}>
                                  {project.name}
                                </p>
                                {project.city && (
                                  <p className="text-xs text-gray-400">{project.city}{project.state ? `, ${project.state}` : ""}</p>
                                )}
                              </div>
                              {alreadyAssigned && (
                                <span className="text-xs text-teal-600 font-semibold flex-shrink-0">Already assigned</span>
                              )}
                              {isSelected && !alreadyAssigned && (
                                <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0" />
                              )}
                            </button>
                          );
                        })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-5 py-4 border-t-2 border-gray-200 bg-white rounded-b-2xl">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={closeAssignProject}
                  disabled={assignLoading}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all disabled:opacity-50 flex-shrink-0"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignProject}
                  disabled={assignLoading || !selectedProjectId || assignSuccess}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-teal-600 text-white shadow-sm shadow-teal-600/30 hover:bg-teal-700 active:bg-teal-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {assignLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Assigning...
                    </>
                  ) : assignSuccess ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Assigned!
                    </>
                  ) : (
                    "Assign Project"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
           EDIT VENDOR DRAWER
           ==================================================================== */}
      {isEditVendorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={!isSaving ? handleCancelEdit : undefined}
          />

          {/* Drawer */}
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-scaleIn"
            style={{ maxHeight: "calc(100vh - 48px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 bg-teal-600 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center border border-white/30">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base leading-tight">Edit Vendor</h3>
                  <p className="text-white/80 text-xs mt-0.5 font-medium">Update vendor details</p>
                </div>
              </div>
              <button
                onClick={!isSaving ? handleCancelEdit : undefined}
                disabled={isSaving}
                className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/30 border border-white/30 flex items-center justify-center text-white transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="px-5 pt-5 pb-3 space-y-5">

                {/* Error banners */}
                {editFormError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 px-3.5 py-2.5 rounded-xl">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="text-xs font-medium leading-relaxed">{editFormError}</span>
                  </div>
                )}
                {saveError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 px-3.5 py-2.5 rounded-xl">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="text-xs font-medium leading-relaxed">{saveError}</span>
                  </div>
                )}

                {/* Section: Vendor Info */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Vendor Info</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                        Vendor Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={editFormData.name}
                          onChange={(e) => handleEditFormChange("name", e.target.value)}
                          placeholder="ABC Infra"
                          disabled={isSaving}
                          className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                        Contact Person <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={editFormData.contact_person}
                          onChange={(e) => handleEditFormChange("contact_person", e.target.value)}
                          placeholder="John Doe"
                          disabled={isSaving}
                          className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Contact */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Contact</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="tel"
                          value={editFormData.phone}
                          onChange={(e) => handleEditFormChange("phone", e.target.value)}
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
                          onChange={(e) => handleEditFormChange("email", e.target.value)}
                          placeholder="vendor@example.com"
                          disabled={isSaving}
                          className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Address */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Address</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Street Address</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={editFormData.address}
                          onChange={(e) => handleEditFormChange("address", e.target.value)}
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
                          onChange={(e) => handleEditFormChange("city", e.target.value)}
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
                          onChange={(e) => handleEditFormChange("state", e.target.value)}
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
                          onChange={(e) => handleEditFormChange("pincode", e.target.value)}
                          placeholder="400001"
                          disabled={isSaving}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Category & Status */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Category & Status</p>
                  <div className="space-y-3">
                    <MultiSelectField
                      label="Vendor Categories"
                      name="vendor_category"
                      value={editFormData.vendor_category}
                      onChange={(e) => handleEditFormChange("vendor_category", e.target.value)}
                      options={VENDOR_CATEGORY_OPTIONS}
                      required
                      disabled={isSaving}
                    />

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Status</label>
                      <select
                        value={editFormData.status}
                        onChange={(e) => handleEditFormChange("status", Number(e.target.value))}
                        disabled={isSaving}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
                      >
                        <option value={1}>Active</option>
                        <option value={2}>Inactive</option>
                        <option value={3}>Blacklisted</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section: Additional Info */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Additional Info (Optional)</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Website</label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="url"
                          value={editFormData.website}
                          onChange={(e) => handleEditFormChange("website", e.target.value)}
                          placeholder="https://example.com"
                          disabled={isSaving}
                          className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">GST Number</label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={editFormData.gst_number}
                          onChange={(e) => handleEditFormChange("gst_number", e.target.value)}
                          placeholder="22AAAAA0000A1Z5"
                          disabled={isSaving}
                          className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all text-sm"
                        />
                      </div>
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
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
           SUCCESS MESSAGE
           ==================================================================== */}
      {showSuccessMessage && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 sm:p-8 text-center animate-scaleIn">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full border-4 border-teal-600 flex items-center justify-center animate-checkBounce">
              <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-teal-600" />
            </div>
            <h2 className="text-teal-600 text-xl sm:text-2xl font-bold mb-2">Successfully</h2>
            <p className="text-base sm:text-lg font-medium text-gray-700 mb-0">Vendor details updated</p>
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes checkBounce {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.1); }
        }
        @keyframes dropdownIn {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        .animate-fadeIn    { animation: fadeIn    0.3s ease-out; }
        .animate-scaleIn   { animation: scaleIn   0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-checkBounce { animation: checkBounce 0.6s ease-in-out; }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}