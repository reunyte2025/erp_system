import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, User, Tag, Calendar, Filter as FilterIcon, X,
  Building2, MapPin, Hash, CheckCircle, Loader2, FileText, Search,
} from 'lucide-react';

import purchaseConfig from './purchase.config';
import DynamicList from '../../components/DynamicList/DynamicList';
import { getVendors } from '../../services/vendors';
import { getProjects } from '../../services/projects';
import { getQuotations } from '../../services/quotation';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ENABLE_LOGGING = false;

const logger = {
  log: (...args) => ENABLE_LOGGING && console.log(...args),
  error: (...args) => console.error(...args),
};

const EMPTY_PURCHASE_FILTERS = {
  purchaseNumber: '',
  vendorName: '',
  projectName: '',
  sacCode: '',
  ctsNumber: '',
};

const normalizePurchaseValue = (value) => String(value || '').trim().toLowerCase();

const purchaseMatchesSearch = (purchase, value) => {
  const needle = normalizePurchaseValue(value);
  if (!needle) return true;

  const haystacks = [
    purchase.quotation_number,
    purchase.vendor_name,
    purchase.project_name,
    purchase.sac_code,
    purchase.project_cts_number,
  ];

  return haystacks.some((field) => normalizePurchaseValue(field).includes(needle));
};

const purchaseMatchesFilters = (purchase, filters) => {
  if (filters?.purchaseNumber && !normalizePurchaseValue(purchase.quotation_number).includes(normalizePurchaseValue(filters.purchaseNumber))) return false;
  if (filters?.vendorName && !normalizePurchaseValue(purchase.vendor_name).includes(normalizePurchaseValue(filters.vendorName))) return false;
  if (filters?.projectName && !normalizePurchaseValue(purchase.project_name).includes(normalizePurchaseValue(filters.projectName))) return false;
  if (filters?.sacCode && !normalizePurchaseValue(purchase.sac_code).includes(normalizePurchaseValue(filters.sacCode))) return false;
  if (filters?.ctsNumber && !normalizePurchaseValue(purchase.project_cts_number).includes(normalizePurchaseValue(filters.ctsNumber))) return false;
  return true;
};

const FilterModal = ({ isOpen, onClose, onApply, currentFilters }) => {
  const [filters, setFilters] = useState(() => currentFilters || EMPTY_PURCHASE_FILTERS);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClear = () => {
    setFilters(EMPTY_PURCHASE_FILTERS);
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  if (!isOpen) return null;

  const hasActiveFilters = Object.values(filters).some((value) => String(value || '').trim() !== '');

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none" style={{ position: 'fixed' }}>
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto"
        style={{ position: 'fixed', width: '100vw', height: '100vh' }}
        onClick={onClose}
      />
      <div className="relative z-10 flex items-center justify-center min-h-screen p-3 sm:p-4 pointer-events-none" style={{ height: '100vh' }}>
        <div
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col animate-scaleIn overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-teal-600 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <FilterIcon className="w-5 h-5" />
              <h2 className="text-base font-semibold">Filter Purchase Orders</h2>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Filter by</p>
              {hasActiveFilters && (
                <button onClick={handleClear} className="text-teal-600 text-sm font-medium hover:text-teal-700 px-2 py-1">
                  Clear All
                </button>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Purchase Number</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" name="purchaseNumber" value={filters.purchaseNumber} onChange={handleInputChange} placeholder="Enter purchase number" className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Vendor Name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" name="vendorName" value={filters.vendorName} onChange={handleInputChange} placeholder="Enter vendor name" className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Project Name</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" name="projectName" value={filters.projectName} onChange={handleInputChange} placeholder="Enter project name" className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">SAC Code</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" name="sacCode" value={filters.sacCode} onChange={handleInputChange} placeholder="Enter SAC code" className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">CTS Number</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" name="ctsNumber" value={filters.ctsNumber} onChange={handleInputChange} placeholder="Enter CTS number" className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" />
              </div>
            </div>
          </div>

          <div className="px-5 pb-5 flex-shrink-0">
            <button
              onClick={handleApply}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 px-6 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm"
            >
              <FilterIcon className="w-4 h-4" />
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SELECT VENDOR + PROJECT MODAL  (mirrors SelectClientProjectModal in quotationsList)
// ============================================================================

const SelectVendorProjectModal = ({ isOpen, onClose, onProceed }) => {
  const [step,            setStep]            = useState('vendor');
  const [vendors,         setVendors]         = useState([]);
  const [projects,        setProjects]        = useState([]);
  const [loadingVendors,  setLoadingVendors]  = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedVendor,  setSelectedVendor]  = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [vendorSearch,    setVendorSearch]    = useState('');
  const [projectSearch,   setProjectSearch]   = useState('');

  // Scroll-lock
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top      = `-${scrollY}px`;
      document.body.style.width    = '100%';
      document.body.style.overflow = 'hidden';
      setStep('vendor');
      setSelectedVendor(null);
      setSelectedProject(null);
      setVendorSearch('');
      setProjectSearch('');
      fetchVendorsList();
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top      = '';
      document.body.style.width    = '';
      document.body.style.overflow = '';
      if (scrollY) window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top      = '';
      document.body.style.width    = '';
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const fetchVendorsList = async () => {
    setLoadingVendors(true);
    try {
      const response = await getVendors({ page: 1, page_size: 100 });
      if (response.status === 'success' && response.data) {
        setVendors(response.data.results || []);
      }
    } catch (err) {
      logger.error('Failed to fetch vendors:', err);
    } finally {
      setLoadingVendors(false);
    }
  };

  const fetchProjectsList = async () => {
    setLoadingProjects(true);
    setProjects([]);
    try {
      const response = await getProjects({ page: 1, page_size: 100 });
      if (response.status === 'success' && response.data) {
        setProjects(response.data.results || []);
      }
    } catch (err) {
      logger.error('Failed to fetch projects:', err);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleVendorToggle = (vendor) => {
    setSelectedVendor(prev => prev?.id === vendor.id ? null : vendor);
    setSelectedProject(null);
  };

  const handleProjectToggle = (project) => {
    setSelectedProject(prev => prev?.id === project.id ? null : project);
  };

  const handleNextToProject = () => {
    if (!selectedVendor) return;
    setStep('project');
    setProjectSearch('');
    fetchProjectsList();
  };

  const handleBack    = () => { setStep('vendor'); setSelectedProject(null); };
  const handleProceed = () => { if (selectedVendor && selectedProject) onProceed(selectedVendor, selectedProject); };

  const filteredVendors = vendors.filter((v) => {
    const name  = (v.name || v.company_name || '').toLowerCase();
    const email = (v.email || '').toLowerCase();
    return name.includes(vendorSearch.toLowerCase()) || email.includes(vendorSearch.toLowerCase());
  });

  const filteredProjects = projects.filter((p) => {
    const name = (p.name || p.title || '').toLowerCase();
    const city = (p.city || '').toLowerCase();
    return name.includes(projectSearch.toLowerCase()) || city.includes(projectSearch.toLowerCase());
  });

  const avatarColors  = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-orange-500','bg-rose-500','bg-cyan-500','bg-amber-500','bg-indigo-500'];
  const getAvatarColor = (id) => avatarColors[(id || 0) % avatarColors.length];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] animate-fadeIn" style={{ position: 'fixed', overflow: 'hidden' }}>
      <div
        className="absolute inset-0 bg-black/50"
        style={{ position: 'fixed', width: '100vw', height: '100vh' }}
        onClick={onClose}
      />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4" style={{ height: '100vh' }}>
        <div
          className="relative w-full max-w-md overflow-hidden animate-scaleIn"
          style={{ borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="bg-teal-700 px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  <FileText size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-base leading-tight">Create Purchase Order</p>
                  <p className="text-teal-200 text-xs mt-0.5">{step === 'vendor' ? 'Step 1 of 2' : 'Step 2 of 2'}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-white" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="flex gap-2">
              <div className="flex-1 h-1 rounded-full bg-white/40" />
              <div className={`flex-1 h-1 rounded-full transition-all duration-500 ${step === 'project' ? 'bg-white' : 'bg-white/20'}`} />
            </div>

            {/* Step labels */}
            <div className="flex justify-between mt-2">
              <div className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === 'vendor' ? 'bg-white text-teal-700' : 'bg-white/30 text-white'}`}>
                  {step === 'project' ? '✓' : '1'}
                </div>
                <span className={`text-xs font-medium ${step === 'vendor' ? 'text-white' : 'text-teal-200'}`}>Select Vendor</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-medium ${step === 'project' ? 'text-white' : 'text-teal-300/60'}`}>Select Project</span>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === 'project' ? 'bg-white text-teal-700' : 'bg-white/20 text-teal-300/60'}`}>2</div>
              </div>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="bg-white" style={{ minHeight: '380px' }}>
            {step === 'vendor' ? (
              <div className="p-5">
                <p className="text-sm font-semibold text-gray-700 mb-0.5">Choose a Vendor</p>
                <p className="text-xs text-gray-400 mb-4">Select the vendor this purchase order is for</p>

                {selectedVendor && (
                  <div className="mb-3 flex items-center justify-between px-3 py-2.5 bg-teal-50 rounded-xl border border-teal-200/80">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0" />
                      <span className="text-sm font-semibold text-teal-800">{selectedVendor.name || selectedVendor.company_name}</span>
                    </div>
                    <button onClick={() => setSelectedVendor(null)} className="text-xs text-teal-500 hover:text-teal-700 font-medium transition-colors">Clear</button>
                  </div>
                )}

                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 text-sm text-gray-700 placeholder-gray-400 transition-all"
                  />
                </div>

                <div className="overflow-y-auto rounded-xl border border-gray-200 bg-white" style={{ maxHeight: '252px' }}>
                  {loadingVendors ? (
                    <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 text-teal-500 animate-spin" /></div>
                  ) : filteredVendors.length > 0 ? (
                    filteredVendors.map((vendor) => {
                      const isSelected = selectedVendor?.id === vendor.id;
                      const vendorName = vendor.name || vendor.company_name || 'Vendor';
                      return (
                        <div
                          key={vendor.id}
                          onClick={() => handleVendorToggle(vendor)}
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
                      <User className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No vendors found</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-5">
                {/* Vendor summary chip */}
                <div className="flex items-center gap-2.5 mb-4 px-3 py-2.5 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getAvatarColor(selectedVendor?.id)}`}>
                    {((selectedVendor?.name || selectedVendor?.company_name || '')[0] || '').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{selectedVendor?.name || selectedVendor?.company_name}</p>
                    <p className="text-xs text-gray-400 truncate">{selectedVendor?.email || ''}</p>
                  </div>
                  <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Vendor</span>
                </div>

                <p className="text-sm font-semibold text-gray-700 mb-0.5">Choose a Project</p>
                <p className="text-xs text-gray-400 mb-4">Select the project for this purchase order</p>

                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 text-sm text-gray-700 placeholder-gray-400 transition-all"
                  />
                </div>

                <div className="overflow-y-auto rounded-xl border border-gray-200 bg-white" style={{ maxHeight: '224px' }}>
                  {loadingProjects ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
                      <p className="text-xs text-gray-400">Loading projects...</p>
                    </div>
                  ) : filteredProjects.length > 0 ? (
                    filteredProjects.map((project) => {
                      const isSelected   = selectedProject?.id === project.id;
                      const projectLabel = project.name || project.title || `Project #${project.id}`;
                      const projectSub   = project.city
                        ? `${project.city}${project.state ? `, ${project.state}` : ''}`
                        : project.address || `ID: ${project.id}`;
                      return (
                        <div
                          key={project.id}
                          onClick={() => handleProjectToggle(project)}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${isSelected ? 'bg-teal-50' : 'hover:bg-gray-50'}`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-teal-600' : 'bg-gray-100'}`}>
                            <FileText className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate transition-colors ${isSelected ? 'text-teal-800' : 'text-gray-800'}`}>{projectLabel}</p>
                            <p className="text-xs text-gray-400 truncate">{projectSub}</p>
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
                      <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 font-medium">No projects found</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
            <button
              onClick={step === 'vendor' ? onClose : handleBack}
              className="px-4 py-2.5 text-slate-600 hover:bg-gray-100 rounded-xl transition-colors text-sm font-medium"
            >
              {step === 'vendor' ? 'Cancel' : '← Back'}
            </button>

            {step === 'vendor' ? (
              <button
                onClick={handleNextToProject}
                disabled={!selectedVendor}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${selectedVendor ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleProceed}
                disabled={!selectedProject}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${selectedProject ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              >
                Create Purchase Order
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// STAT CARD
// ============================================================================

const StatCard = ({ icon, count, label, subLabel, bgColor, textColor }) => (
  <div className={`${bgColor} rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden`}>
    <div className="flex items-start gap-2 sm:gap-3">
      <div className={`${textColor} bg-white/20 rounded-full p-2 sm:p-2.5 flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-1 truncate">{count}</h3>
        <p className="text-white/90 font-medium text-xs sm:text-sm truncate">{label}</p>
        {subLabel && <p className="text-white/70 text-xs mt-1 truncate">{subLabel}</p>}
      </div>
    </div>
  </div>
);

// ============================================================================
// MAIN PURCHASE COMPONENT
// ============================================================================

export default function Purchase({ onUpdateNavigation }) {
  const navigate = useNavigate();

  // Data state — no demo data, real API only
  const [purchaseOrders,  setPurchaseOrders]  = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');

  // Stats from API
  const [stats, setStats] = useState({ total: 0, draft: 0, review: 0, completed: 0 });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [totalCount,  setTotalCount]  = useState(0);
  const [pageSize]                    = useState(10);

  // Search / filter / modals
  const [searchTerm,             setSearchTerm]             = useState('');
  const [sortBy,                 setSortBy]                 = useState('created_at');
  const [sortOrder,              setSortOrder]              = useState('desc');
  const [showFilterModal,        setShowFilterModal]        = useState(false);
  const [activeFilters,          setActiveFilters]          = useState(EMPTY_PURCHASE_FILTERS);
  const [showSelectVendorModal,  setShowSelectVendorModal]  = useState(false);

  const requestInProgress = useRef(false);
  const lastFetchParams   = useRef(null);

  // Breadcrumbs
  useEffect(() => {
    if (onUpdateNavigation) onUpdateNavigation({ breadcrumbs: null });
    return () => { if (onUpdateNavigation) onUpdateNavigation(null); };
  }, [onUpdateNavigation]);

  // ── Fetch purchase orders (type=2 → vendor quotations) ──────────────────────
  const fetchPurchaseOrders = useCallback(async () => {
    const fetchKey = JSON.stringify({ currentPage, pageSize, searchTerm, activeFilters, sortBy, sortOrder });
    const hasActiveFilters = Object.values(activeFilters).some((value) => String(value || '').trim() !== '');
    const useLocalSearchAndFilter = Boolean(searchTerm.trim() || hasActiveFilters);
    if (lastFetchParams.current === fetchKey && !error) return;
    if (requestInProgress.current) return;

    requestInProgress.current = true;
    lastFetchParams.current   = fetchKey;
    setLoading(true);
    setError('');

    try {
      const response = await getQuotations({
        page:       useLocalSearchAndFilter ? 1 : currentPage,
        page_size:  useLocalSearchAndFilter ? 1000 : pageSize,
        sort_by:    sortBy,
        sort_order: sortOrder,
        type:       2,   // type=2 → vendor / purchase order quotations
      });

      if (response.status === 'success' && response.data) {
        const apiData = response.data;
        const quotationResults = Array.isArray(apiData.results) ? apiData.results : [];

        let projectMap = {};
        try {
          const allProjectsRes = await getProjects({ page: 1, page_size: 2000 });
          const allProjects = allProjectsRes?.data?.results || allProjectsRes?.results || [];
          allProjects.forEach((p) => {
            if (p.id) {
              projectMap[p.id] = {
                name: p.name || p.title || `Project #${p.id}`,
                cts_number: p.cts_number || '',
              };
            }
          });
        } catch {
          projectMap = {};
        }

        const enrichedResults = quotationResults.map((q) => ({
          ...q,
          project_name: projectMap[q.project]?.name || q.project_name || (q.project ? `Project #${q.project}` : 'N/A'),
          project_cts_number: projectMap[q.project]?.cts_number || q.project_cts_number || '',
        }));

        if (useLocalSearchAndFilter) {
          const filteredResults = enrichedResults.filter((purchase) =>
            purchaseMatchesSearch(purchase, searchTerm) && purchaseMatchesFilters(purchase, activeFilters)
          );
          const startIndex = (currentPage - 1) * pageSize;

          setPurchaseOrders(filteredResults.slice(startIndex, startIndex + pageSize));
          setCurrentPage(currentPage);
          setTotalPages(Math.max(1, Math.ceil(filteredResults.length / pageSize)));
          setTotalCount(filteredResults.length);
        } else {
          setPurchaseOrders(enrichedResults);
          setCurrentPage(apiData.page        || 1);
          setTotalPages(apiData.total_pages  || 1);
          setTotalCount(apiData.total_count  || 0);
        }
        setStats({
          total:     apiData.total_count        || 0,
          draft:     apiData.draft_count        || 0,
          review:    apiData.under_review_count || 0,
          completed: apiData.completed_count    || 0,
        });
      } else {
        setPurchaseOrders([]);
        setError('Failed to load purchase orders');
      }
    } catch (err) {
      logger.error('❌ Error fetching purchase orders:', err);
      setError(err.message || 'Failed to load purchase orders');
      setPurchaseOrders([]);
    } finally {
      setLoading(false);
      requestInProgress.current = false;
    }
  }, [currentPage, pageSize, searchTerm, activeFilters, sortBy, sortOrder, error]);

  useEffect(() => { fetchPurchaseOrders(); }, [fetchPurchaseOrders]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSearch      = (value) => { setSearchTerm(value); setCurrentPage(1); };
  const handlePageChange  = (page)  => setCurrentPage(page);
  const handleRetry       = ()      => { lastFetchParams.current = null; fetchPurchaseOrders(); };
  const handleFilterToggle = ()     => setShowFilterModal(true);
  const handleApplyFilters = (filters) => { setActiveFilters(filters); setCurrentPage(1); };
  const handleSort = (field) => {
    if (field === sortBy) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
    lastFetchParams.current = null;
  };
  const handleAddPurchaseOrder = () => setShowSelectVendorModal(true);

  const handleRowClick = (row) => {
    navigate(`/purchase/${row.id}`);
  };

  // After vendor + project selected → navigate to create page
  const handleVendorProjectSelected = (vendor, project) => {
    setShowSelectVendorModal(false);
    navigate('/purchase/form', {
      state: { selectedVendor: vendor, selectedProject: project },
    });
  };

  // ── Stats cards ──────────────────────────────────────────────────────────────

  const renderStatsCards = () => (
    <>
      <StatCard
        icon={<Users className="w-5 h-5" />}
        count={stats.total}
        label="Total Purchase Orders"
        subLabel="All vendor purchase orders"
        bgColor="bg-teal-500"
        textColor="text-teal-500"
      />
      <StatCard
        icon={<FileText className="w-5 h-5" />}
        count={stats.draft}
        label="Draft"
        subLabel="Pending review"
        bgColor="bg-orange-600"
        textColor="text-orange-600"
      />
      <StatCard
        icon={<Tag className="w-5 h-5" />}
        count={stats.review}
        label="Under Review"
        subLabel="In processing"
        bgColor="bg-yellow-500"
        textColor="text-yellow-500"
      />
      <StatCard
        icon={<CheckCircle className="w-5 h-5" />}
        count={stats.completed}
        label="Completed"
        subLabel="Accepted orders"
        bgColor="bg-green-500"
        textColor="text-green-500"
      />
    </>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <DynamicList
        config={{ ...purchaseConfig, title: 'Purchase Orders List' }}
        data={purchaseOrders}
        loading={loading}
        error={error}
        emptyMessage="No Purchase Orders Found"
        emptySubMessage="Click '+ Add' to create your first purchase order"
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        onAdd={handleAddPurchaseOrder}
        onSearch={handleSearch}
        onFilterToggle={handleFilterToggle}
        onRowClick={handleRowClick}
        onRetry={handleRetry}
        onSort={handleSort}
        sortBy={sortBy}
        sortOrder={sortOrder}
        searchTerm={searchTerm}
        showFilter={Object.values(activeFilters).some((value) => String(value || '').trim() !== '')}
        statsCards={renderStatsCards()}
      />

      {/* Create Purchase Order — Vendor + Project selector */}
      <SelectVendorProjectModal
        isOpen={showSelectVendorModal}
        onClose={() => setShowSelectVendorModal(false)}
        onProceed={handleVendorProjectSelected}
      />

      <FilterModal
        key={`${showFilterModal}-${JSON.stringify(activeFilters)}`}
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        currentFilters={activeFilters}
      />

      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn  { animation: fadeIn  0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.3s cubic-bezier(0.16,1,0.3,1); }
      `}</style>
    </>
  );
}