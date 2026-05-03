import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { FileText, User, X, CheckCircle, Loader2, Search, Filter as FilterIcon, Briefcase, Hash, Building2 } from 'lucide-react';
import { getQuotations, deleteQuotationById, QUOTATION_COMPANIES, getQuotationCompanyName } from '../../services/quotation';
import { getClients, getClientProjects } from '../../services/clients';
import { getProjects } from '../../services/projects';
import { useRole } from '../../components/RoleContext';
import quotationConfig, { getColumns, isQuotationDeleted } from './quotation.config';
import DynamicList from '../../components/DynamicList/DynamicList';

/**
 * ============================================================================
 * QUOTATIONS LIST COMPONENT
 * ============================================================================
 *
 * Lists all quotations with stats cards.
 *
 * UPDATED:
 *  - Removed QuotationDetailModal entirely.
 *  - handleRowClick now navigates to /quotations/:id (ViewQuotationDetails page).
 *  - handleViewQuotation (post-create success) also navigates to the detail page.
 *  - All modal-scroll-lock logic removed (no longer needed here).
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const ENABLE_LOGGING = false;

const logger = {
  log:   (...args) => ENABLE_LOGGING && console.log(...args),
  error: (...args) => console.error(...args),
};

const EMPTY_QUOTATION_FILTERS = {
  quotationNumber: '',
  clientName: '',
  vendorName: '',
  projectName: '',
  sacCode: '',
  ctsNumber: '',
};

const COMPANY_FILTER_STORAGE_KEY = 'quotation_list_selected_company';

const normalizeQuotationValue = (value) => String(value || '').trim().toLowerCase();

const quotationMatchesSearch = (quotation, value) => {
  const needle = normalizeQuotationValue(value);
  if (!needle) return true;

  const haystacks = [
    quotation.quotation_number,
    quotation.client_name,
    quotation.vendor_name,
    quotation.project_name,
    quotation.sac_code,
    quotation.project_cts_number,
  ];

  return haystacks.some((field) => normalizeQuotationValue(field).includes(needle));
};

const quotationMatchesFilters = (quotation, filters) => {
  if (filters?.quotationNumber && !normalizeQuotationValue(quotation.quotation_number).includes(normalizeQuotationValue(filters.quotationNumber))) return false;
  if (filters?.clientName && !normalizeQuotationValue(quotation.client_name).includes(normalizeQuotationValue(filters.clientName))) return false;
  if (filters?.vendorName && !normalizeQuotationValue(quotation.vendor_name).includes(normalizeQuotationValue(filters.vendorName))) return false;
  if (filters?.projectName && !normalizeQuotationValue(quotation.project_name).includes(normalizeQuotationValue(filters.projectName))) return false;
  if (filters?.sacCode && !normalizeQuotationValue(quotation.sac_code).includes(normalizeQuotationValue(filters.sacCode))) return false;
  if (filters?.ctsNumber && !normalizeQuotationValue(quotation.project_cts_number).includes(normalizeQuotationValue(filters.ctsNumber))) return false;
  return true;
};

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

const StatCard = ({ icon, count, label, subLabel, bgColor }) => (
  <div className={`${bgColor} rounded-2xl p-5 shadow-sm relative overflow-hidden`}>
    <div className="flex items-start gap-3">
      <div className="text-white bg-white/20 rounded-full p-2.5 flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-white mb-1 leading-tight break-all"
          style={{ fontSize: typeof count === 'string' && count.length > 14 ? '15px' : typeof count === 'string' && count.length > 10 ? '18px' : '24px' }}
        >
          {count}
        </h3>
        <p className="text-white/90 font-medium text-sm">{label}</p>
        {subLabel && <p className="text-white/70 text-xs mt-1">{subLabel}</p>}
      </div>
    </div>
  </div>
);

// ============================================================================
// SUCCESS MODAL COMPONENT
// ============================================================================

const SuccessModal = ({ isOpen, onClose, onProceed }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none" style={{ position: 'fixed' }}>
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
        style={{ position: 'fixed', width: '100vw', height: '100vh' }}
        onClick={onClose}
      />
      <div className="relative z-10 flex items-center justify-center p-4 pointer-events-none" style={{ height: '100vh' }}>
        <div
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-scaleIn pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle className="w-12 h-12 text-teal-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Successfully</h3>
          <p className="text-xl font-semibold text-gray-800 mb-8">Created Quotation</p>
          <div className="space-y-3">
            <button
              onClick={onProceed}
              className="w-full px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all duration-200 font-medium transform hover:scale-[1.02] active:scale-[0.98]"
            >
              View Quotation
            </button>
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-white text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// DELETE CONFIRM MODAL
// ============================================================================

const DeleteConfirmModal = ({ isOpen, quotation, onConfirm, onCancel, deleting }) => {
  if (!isOpen || !quotation) return null;

  const qNum = quotation.quotation_number
    ? (String(quotation.quotation_number).startsWith('QT-')
        ? quotation.quotation_number
        : `QT-${String(quotation.quotation_number)}`)
    : `QT-${String(quotation.id || '').padStart(5, '0')}`;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none" style={{ position: 'fixed' }}>
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto"
        style={{ position: 'fixed', width: '100vw', height: '100vh' }}
        onClick={!deleting ? onCancel : undefined}
      />
      <div className="relative z-10 flex items-center justify-center pointer-events-none" style={{ height: '100vh' }}>
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center animate-scaleIn pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Delete Quotation?</h2>
          <p className="text-sm text-gray-500 mb-6">
            <span className="font-semibold text-gray-700">{qNum}</span> will be permanently deleted.
            This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={deleting}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 border-gray-200
                         text-gray-600 hover:bg-gray-50 transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={deleting}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white
                         hover:bg-red-600 active:bg-red-700 transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              {deleting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Deleting...
                </>
              ) : 'Yes, Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FilterModal = ({ isOpen, onClose, onApply, currentFilters }) => {
  const [filters, setFilters] = useState(() => currentFilters || EMPTY_QUOTATION_FILTERS);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClear = () => {
    setFilters(EMPTY_QUOTATION_FILTERS);
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
              <h2 className="text-base font-semibold">Filter Quotations</h2>
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
              <label className="text-sm font-medium text-gray-700 mb-2 block">Quotation Number</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" name="quotationNumber" value={filters.quotationNumber} onChange={handleInputChange} placeholder="Enter quotation number" className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Client Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" name="clientName" value={filters.clientName} onChange={handleInputChange} placeholder="Enter client name" className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Vendor Name</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" name="vendorName" value={filters.vendorName} onChange={handleInputChange} placeholder="Enter vendor name" className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Project Name</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
// SELECT CLIENT + PROJECT MODAL (2-Step)
// ============================================================================

const SelectClientProjectModal = ({ isOpen, onClose, onProceed }) => {
  const [step,            setStep]            = useState('client');
  const [clients,         setClients]         = useState([]);
  const [projects,        setProjects]        = useState([]);
  const [loadingClients,  setLoadingClients]  = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedClient,  setSelectedClient]  = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [clientSearch,    setClientSearch]    = useState('');
  const [projectSearch,   setProjectSearch]   = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep('client');
      setSelectedClient(null);
      setSelectedProject(null);
      setClientSearch('');
      setProjectSearch('');
      fetchClients();
    }
  }, [isOpen]);

  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const response = await getClients({ page: 1, page_size: 100 });
      if (response.status === 'success' && response.data) {
        setClients(response.data.results || []);
      }
    } catch (error) {
      logger.error('Failed to fetch clients:', error);
    } finally {
      setLoadingClients(false);
    }
  };

  const fetchProjectsByClient = async (clientId) => {
    setLoadingProjects(true);
    setProjects([]);
    try {
      const response = await getClientProjects(clientId);
      if (response.status === 'success' && response.data) {
        setProjects(response.data.results || []);
      }
    } catch (error) {
      logger.error('Failed to fetch projects:', error);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleClientToggle = (client) => {
    if (selectedClient?.id === client.id) {
      setSelectedClient(null);
    } else {
      setSelectedClient(client);
    }
    setSelectedProject(null);
  };

  const handleProjectToggle = (project) => {
    if (selectedProject?.id === project.id) {
      setSelectedProject(null);
    } else {
      setSelectedProject(project);
    }
  };

  const handleNextToProject = () => {
    if (!selectedClient) return;
    setStep('project');
    setProjectSearch('');
    fetchProjectsByClient(selectedClient.id);
  };

  const handleBack    = () => { setStep('client'); setSelectedProject(null); };
  const handleProceed = () => { if (selectedClient && selectedProject) onProceed(selectedClient, selectedProject); };

  const filteredClients = clients.filter((c) => {
    const name  = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
    const email = (c.email || '').toLowerCase();
    return name.includes(clientSearch.toLowerCase()) || email.includes(clientSearch.toLowerCase());
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
    <div className="fixed inset-0 z-[9999] animate-fadeIn pointer-events-none" style={{ position: 'fixed' }}>
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto"
        style={{ position: 'fixed', width: '100vw', height: '100vh' }}
        onClick={onClose}
      />

      <div className="relative z-10 flex items-center justify-center p-4 pointer-events-none" style={{ height: '100vh' }}>
        <div
          className="relative w-full max-w-md overflow-hidden animate-scaleIn pointer-events-auto"
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
                  <p className="text-white font-semibold text-base leading-tight">New Quotation</p>
                  <p className="text-teal-200 text-xs mt-0.5">{step === 'client' ? 'Step 1 of 2' : 'Step 2 of 2'}</p>
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
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === 'client' ? 'bg-white text-teal-700' : 'bg-white/30 text-white'}`}>
                  {step === 'project' ? '✓' : '1'}
                </div>
                <span className={`text-xs font-medium ${step === 'client' ? 'text-white' : 'text-teal-200'}`}>Select Client</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-medium ${step === 'project' ? 'text-white' : 'text-teal-300/60'}`}>Select Project</span>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === 'project' ? 'bg-white text-teal-700' : 'bg-white/20 text-teal-300/60'}`}>2</div>
              </div>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="bg-white" style={{ minHeight: '380px' }}>
            {step === 'client' ? (
              <div className="p-5">
                <p className="text-sm font-semibold text-gray-700 mb-0.5">Choose a Client</p>
                <p className="text-xs text-gray-400 mb-4">Select the client this quotation is for</p>

                {selectedClient && (
                  <div className="mb-3 flex items-center justify-between px-3 py-2.5 bg-teal-50 rounded-xl border border-teal-200/80">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0" />
                      <span className="text-sm font-semibold text-teal-800">{selectedClient.first_name} {selectedClient.last_name}</span>
                    </div>
                    <button onClick={() => setSelectedClient(null)} className="text-xs text-teal-500 hover:text-teal-700 font-medium transition-colors">Clear</button>
                  </div>
                )}

                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 text-sm text-gray-700 placeholder-gray-400 transition-all"
                  />
                </div>

                <div className="overflow-y-auto rounded-xl border border-gray-200 bg-white" style={{ maxHeight: '252px' }}>
                  {loadingClients ? (
                    <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 text-teal-500 animate-spin" /></div>
                  ) : filteredClients.length > 0 ? (
                    filteredClients.map((client) => {
                      const isSelected = selectedClient?.id === client.id;
                      return (
                        <div
                          key={client.id}
                          onClick={() => handleClientToggle(client)}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${isSelected ? 'bg-teal-50' : 'hover:bg-gray-50'}`}
                        >
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 ${isSelected ? 'bg-teal-600' : getAvatarColor(client.id)}`}>
                            {(client.first_name?.[0] || '').toUpperCase()}{(client.last_name?.[0] || '').toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate transition-colors ${isSelected ? 'text-teal-800' : 'text-gray-800'}`}>{client.first_name} {client.last_name}</p>
                            <p className="text-xs text-gray-400 truncate">{client.email}</p>
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
                      <p className="text-sm text-gray-400">No clients found</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-5">
                {/* Client summary chip */}
                <div className="flex items-center gap-2.5 mb-4 px-3 py-2.5 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getAvatarColor(selectedClient?.id)}`}>
                    {(selectedClient?.first_name?.[0] || '').toUpperCase()}{(selectedClient?.last_name?.[0] || '').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{selectedClient?.first_name} {selectedClient?.last_name}</p>
                    <p className="text-xs text-gray-400 truncate">{selectedClient?.email}</p>
                  </div>
                  <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Client</span>
                </div>

                <p className="text-sm font-semibold text-gray-700 mb-0.5">Choose a Project</p>
                <p className="text-xs text-gray-400 mb-4">Only projects registered under this client are shown</p>

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
                      <p className="text-xs text-gray-400 mt-1">This client has no registered projects</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
            <button
              onClick={step === 'client' ? onClose : handleBack}
              className="px-4 py-2.5 text-slate-600 hover:bg-gray-100 rounded-xl transition-colors text-sm font-medium"
            >
              {step === 'client' ? 'Cancel' : '← Back'}
            </button>

            {step === 'client' ? (
              <button
                onClick={handleNextToProject}
                disabled={!selectedClient}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${selectedClient ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleProceed}
                disabled={!selectedProject}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${selectedProject ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              >
                Create Quotation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COMPANY DROPDOWN — custom animated selector (replaces native <select>)
// ============================================================================

const COMPANY_INITIALS_COLORS = [
  { bg: 'bg-teal-500',   text: 'text-white' },
  { bg: 'bg-violet-500', text: 'text-white' },
  { bg: 'bg-blue-500',   text: 'text-white' },
  { bg: 'bg-amber-500',  text: 'text-white' },
  { bg: 'bg-rose-500',   text: 'text-white' },
];

const getCompanyInitials = (name = '') =>
  name.split(' ').slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?';

const CompanyDropdown = ({ companies = [], selectedId, onChange }) => {
  const [open, setOpen]       = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });
  const triggerRef            = useRef(null);
  const panelRef              = useRef(null);
  const selected              = companies.find((c) => String(c.id) === String(selectedId)) || companies[0];
  const selectedIdx           = companies.findIndex((c) => String(c.id) === String(selectedId));
  const selColor              = COMPANY_INITIALS_COLORS[selectedIdx % COMPANY_INITIALS_COLORS.length] || COMPANY_INITIALS_COLORS[0];

  // Recalculate panel position whenever the dropdown opens or window scrolls/resizes
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPanelPos({
      top:   rect.bottom + window.scrollY + 8,
      right: window.innerWidth - rect.right,
    });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('scroll',  updatePosition, true);
    window.addEventListener('resize',  updatePosition);
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        panelRef.current   && !panelRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll',  updatePosition, true);
      window.removeEventListener('resize',  updatePosition);
    };
  }, [open]);

  const handleSelect = (id) => {
    onChange(id);
    setOpen(false);
  };

  // Portal panel — rendered into document.body so it's always above everything
  const panel = open && createPortal(
    <div
      ref={panelRef}
      style={{
        position:  'absolute',
        top:       panelPos.top,
        right:     panelPos.right,
        zIndex:    99999,
        minWidth:  '228px',
        animation: 'companyDropIn 0.18s cubic-bezier(0.16,1,0.3,1)',
      }}
      className="rounded-2xl border border-gray-100 bg-white py-2 shadow-2xl"
    >
      <style>{`
        @keyframes companyDropIn {
          from { opacity: 0; transform: scale(0.96) translateY(-6px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>

      {/* Header label */}
      <div className="px-4 pb-2 pt-1">
        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-gray-400">
          Select Company
        </span>
      </div>

      <div className="h-px bg-gray-100 mx-2 mb-1" />

      {companies.map((company, idx) => {
        const isActive = String(company.id) === String(selectedId);
        const color    = COMPANY_INITIALS_COLORS[idx % COMPANY_INITIALS_COLORS.length];
        return (
          <button
            key={company.id}
            type="button"
            onClick={() => handleSelect(company.id)}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 mx-1 rounded-xl text-left
              transition-all duration-150 text-sm font-medium
              ${isActive ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-50'}
            `}
            style={{ width: 'calc(100% - 8px)' }}
          >
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-bold tracking-wide select-none ${color.bg} ${color.text}`}>
              {getCompanyInitials(company.name)}
            </div>
            <span className="flex-1 truncate">{company.name}</span>
            {isActive && (
              <svg className="w-4 h-4 text-teal-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.704 5.296a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.296-7.29a1 1 0 011.408.008z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        );
      })}
    </div>,
    document.body
  );

  return (
    <div className="relative" ref={triggerRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`
          group flex items-center gap-2.5 rounded-xl border bg-white pl-2 pr-3 py-2
          shadow-sm transition-all duration-200 outline-none
          ${open
            ? 'border-teal-400 ring-2 ring-teal-100 shadow-md'
            : 'border-gray-200 hover:border-teal-300 hover:shadow-md hover:shadow-teal-50'}
        `}
      >
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold tracking-wide select-none ${selColor.bg} ${selColor.text}`}>
          {getCompanyInitials(selected?.name)}
        </div>
        <div className="text-left min-w-[130px]">
          <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-gray-400 leading-none mb-0.5">
            Company
          </span>
          <span className="block text-sm font-semibold text-gray-900 leading-tight truncate max-w-[160px]">
            {selected?.name || 'Select Company'}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ml-1 ${open ? 'rotate-180 text-teal-500' : 'group-hover:text-teal-400'}`}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {panel}
    </div>
  );
};

// ============================================================================
// MAIN QUOTATIONS LIST COMPONENT
// ============================================================================

export default function QuotationsList() {
  const navigate = useNavigate();
  const { isAdmin, isManager } = useRole();

  // Privileged = Admin or Manager → can see & use the Actions column
  // isManager may not be provided by all RoleContext implementations — default false
  const isPrivileged = isAdmin || (isManager ?? false);

  // ── State ──────────────────────────────────────────────────────────────────
  const [quotations,             setQuotations]             = useState([]);
  const [loading,                setLoading]                = useState(true);
  const [error,                  setError]                  = useState('');
  const [currentPage,            setCurrentPage]            = useState(1);
  const [totalPages,             setTotalPages]             = useState(1);
  const [totalCount,             setTotalCount]             = useState(0);
  const [pageSize]                                          = useState(10);
  const [searchTerm,             setSearchTerm]             = useState('');
  const [showFilterModal,        setShowFilterModal]        = useState(false);
  const [activeFilters,          setActiveFilters]          = useState(EMPTY_QUOTATION_FILTERS);
  const [selectedCompanyId,      setSelectedCompanyId]      = useState(() => {
    if (typeof window === 'undefined') {
      return String(QUOTATION_COMPANIES[0]?.id || 1);
    }
    const savedCompany = window.localStorage.getItem(COMPANY_FILTER_STORAGE_KEY);
    return QUOTATION_COMPANIES.some((company) => String(company.id) === String(savedCompany))
      ? String(savedCompany)
      : String(QUOTATION_COMPANIES[0]?.id || 1);
  });
  const [showSelectClientModal,  setShowSelectClientModal]  = useState(false);
  const [showSuccessModal,       setShowSuccessModal]       = useState(false);
  const [createdQuotation,       _setCreatedQuotation]      = useState(null);
  const [stats,                  setStats]                  = useState({ total: 0, draft: 0, review: 0, completed: 0 });

  // Delete state
  const [deleteTarget,  setDeleteTarget]  = useState(null);  // quotation row to delete
  const [deleting,      setDeleting]      = useState(false);
  const [toast,         setToast]         = useState(null);  // { message, type }

  // ── Sorting state ─────────────────────────────────────────────────────────
  // sortBy: the API field name (e.g. 'created_at', 'status', 'grand_total')
  // sortOrder: 'asc' | 'desc'
  const [sortBy,    setSortBy]    = useState(quotationConfig.defaultSort?.field     || 'created_at');
  const [sortOrder, setSortOrder] = useState(quotationConfig.defaultSort?.direction || 'desc');

  // Request deduplication
  const requestInProgress = useRef(false);
  const lastFetchParams   = useRef(null);

  // Bust the cache every time this page mounts (e.g. navigating back from
  // a quotation detail page) so the list always re-fetches fresh data.
  useEffect(() => {
    lastFetchParams.current = null;
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(COMPANY_FILTER_STORAGE_KEY, selectedCompanyId);
    }
  }, [selectedCompanyId]);

  // ── Fetch quotations ────────────────────────────────────────────────────────
  const fetchQuotations = useCallback(async () => {
    const fetchKey = JSON.stringify({ currentPage, pageSize, searchTerm, activeFilters, sortBy, sortOrder, selectedCompanyId });
    const hasActiveFilters = Object.values(activeFilters).some((value) => String(value || '').trim() !== '');
    const useLocalSearchAndFilter = Boolean(searchTerm.trim() || hasActiveFilters);

    if (lastFetchParams.current === fetchKey && !error) {
      logger.log('⏭️  Skipping duplicate request');
      return;
    }
    if (requestInProgress.current) {
      logger.log('⏳ Request in progress, skipping');
      return;
    }

    requestInProgress.current = true;
    lastFetchParams.current   = fetchKey;
    setLoading(true);
    setError('');

    try {
      // Always send sort_by + sort_order so the backend sorts all pages correctly
      // type=1 → client quotations list
      const response = await getQuotations({
        page:       useLocalSearchAndFilter ? 1 : currentPage,
        page_size:  useLocalSearchAndFilter ? 1000 : pageSize,
        sort_by:    sortBy,
        sort_order: sortOrder,
        type:       1,
        company:    selectedCompanyId,
      });

      if (response.status === 'success' && response.data) {
        const apiData          = response.data;
        const quotationResults = apiData.results || [];

        // Enrich rows with project names via bulk fetch
        let projectMap = {};
        try {
          const allProjectsRes = await getProjects({ page: 1, page_size: 2000 });
          const allProjects    = allProjectsRes?.data?.results || allProjectsRes?.results || [];
          allProjects.forEach((p) => {
            if (p.id) {
              projectMap[p.id] = {
                name: p.name || p.title || `Project #${p.id}`,
                cts_number: p.cts_number || '',
              };
            }
          });
        } catch { /* projectMap stays empty — rows fall back to "Project #N" */ }

        const enrichedResults = quotationResults.map((q) => ({
          ...q,
          project_name: projectMap[q.project]?.name || q.project_name || (q.project ? `Project #${q.project}` : 'N/A'),
          project_cts_number: projectMap[q.project]?.cts_number || q.project_cts_number || '',
          company_name: q.company_name || getQuotationCompanyName(q.company) || 'ERP System',
        }));

        if (useLocalSearchAndFilter) {
          const filteredResults = enrichedResults.filter((quotation) =>
            quotationMatchesSearch(quotation, searchTerm) && quotationMatchesFilters(quotation, activeFilters)
          );
          const startIndex = (currentPage - 1) * pageSize;

          setQuotations(filteredResults.slice(startIndex, startIndex + pageSize));
          setCurrentPage(currentPage);
          setTotalPages(Math.max(1, Math.ceil(filteredResults.length / pageSize)));
          setTotalCount(filteredResults.length);
        } else {
          setQuotations(enrichedResults);
          setCurrentPage(apiData.page         || 1);
          setTotalPages(apiData.total_pages   || 1);
          setTotalCount(apiData.total_count   || 0);
        }

        // Use counts provided directly by the API — no second fetch needed
        setStats({
          total:     apiData.total_count        || 0,
          draft:     apiData.draft_count        || 0,
          review:    apiData.under_review_count || 0,
          completed: apiData.completed_count    || 0,
        });
      } else {
        setQuotations([]);
        setError('Failed to load quotations');
      }
    } catch (err) {
      logger.error('❌ Error fetching quotations:', err);
      setError(err.message || 'Failed to load quotations');
      setQuotations([]);
    } finally {
      setLoading(false);
      requestInProgress.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, searchTerm, activeFilters, sortBy, sortOrder, selectedCompanyId]);

  useEffect(() => { fetchQuotations(); }, [fetchQuotations]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAddQuotation = () => setShowSelectClientModal(true);

  const handleClientProjectSelected = (client, project) => {
    setShowSelectClientModal(false);
    navigate('/quotations/form', { state: { selectedClient: client, selectedProject: project } });
  };

  const handleSearch       = (value) => { setSearchTerm(value); setCurrentPage(1); };
  const handlePageChange   = (page)  => setCurrentPage(page);
  const handleFilterToggle = ()      => setShowFilterModal(true);
  const handleApplyFilters = (filters) => { setActiveFilters(filters); setCurrentPage(1); };
  const handleRetry        = ()      => { lastFetchParams.current = null; fetchQuotations(); };
  const handleCompanyChange = (event) => {
    setSelectedCompanyId(event.target.value);
    setCurrentPage(1);
    lastFetchParams.current = null;
  };

  // ── Delete handlers ──────────────────────────────────────────────────────
  const handleDeleteQuotation = (quotation) => {
    setDeleteTarget(quotation);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteQuotationById(deleteTarget.id);
      setToast({ message: 'Quotation deleted successfully', type: 'success' });
      setDeleteTarget(null);
      // Optimistically update the row in the local list so the status badge
      // flips to "Deleted" immediately without waiting for a re-fetch.
      setQuotations((prev) =>
        prev.map((q) =>
          q.id === deleteTarget.id
            ? { ...q, status: 5, is_deleted: true, is_active: false }
            : q
        )
      );
      // Refresh list to get latest data from server
      lastFetchParams.current = null;
      fetchQuotations();
    } catch (err) {
      setToast({ message: err.message || 'Failed to delete quotation', type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    if (!deleting) setDeleteTarget(null);
  };

  // Auto-dismiss toast after 3 s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  /**
   * Sort handler — called from DynamicList (ListTable) when a sortable column
   * header is clicked. Toggles direction for the same field; resets page to 1.
   * sortBy/sortOrder are in the dep array so this always has fresh values.
   */
  const handleSort = useCallback((field) => {
    if (field === sortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
    lastFetchParams.current = null;
  }, [sortBy, sortOrder]);

  /**
   * Navigate to the dedicated ViewQuotationDetails page.
   * Deleted quotations are not clickable.
   */
  const handleRowClick = (quotation) => {
    if (isQuotationDeleted(quotation)) return; // disabled for deleted
    logger.log('Navigating to quotation details:', quotation.id);
    navigate(`/quotations/${quotation.id}`);
  };

  /**
   * After creating a quotation and clicking "View Quotation" in the success modal,
   * navigate directly to the details page.
   */
  const handleViewQuotation = () => {
    setShowSuccessModal(false);
    if (createdQuotation?.id) {
      navigate(`/quotations/${createdQuotation.id}`);
    }
  };

  const selectedCompany = QUOTATION_COMPANIES.find((company) => String(company.id) === String(selectedCompanyId)) || QUOTATION_COMPANIES[0];

  const companySelector = (
    <CompanyDropdown
      companies={QUOTATION_COMPANIES}
      selectedId={selectedCompanyId}
      onChange={(id) => handleCompanyChange({ target: { value: id } })}
    />
  );

  // ── Stats cards ─────────────────────────────────────────────────────────────
  const renderStatsCards = () => (
    <>
      <StatCard icon={<FileText className="w-5 h-5" />} count={stats.total     || 0} label="Total Quotations" subLabel={`${stats.total || 0} total quotations`} bgColor="bg-teal-500"   />
      <StatCard icon={<FileText className="w-5 h-5" />} count={stats.draft     || 0} label="Draft Quotations" bgColor="bg-red-500"    />
      <StatCard icon={<FileText className="w-5 h-5" />} count={stats.review    || 0} label="Under Review"     bgColor="bg-yellow-500" />
      <StatCard icon={<FileText className="w-5 h-5" />} count={stats.completed || 0} label="Completed"        bgColor="bg-green-500"  />
    </>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Toast notification — matches client ActionToast exactly */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-[99999] animate-slideUp"
          style={{ transform: 'translateX(-50%)' }}
        >
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-sm font-semibold
              ${toast.type === 'success' ? 'bg-teal-600' : 'bg-red-500'}`}
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}
          >
            {toast.type === 'success' ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-1 opacity-70 hover:opacity-100 transition-opacity">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <DynamicList
        config={{ ...quotationConfig, columns: getColumns(isPrivileged) }}
        data={quotations}
        loading={loading}
        error={error}
        emptyMessage={`No quotations found for ${selectedCompany?.name || 'the selected company'}`}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        onAdd={handleAddQuotation}
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
        actionHandlers={isPrivileged ? { onDeleteQuotation: handleDeleteQuotation } : undefined}
        headerControls={companySelector}
      />

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        quotation={deleteTarget}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        deleting={deleting}
      />

      {/* Select Client + Project before creating quotation */}
      <SelectClientProjectModal
        isOpen={showSelectClientModal}
        onClose={() => setShowSelectClientModal(false)}
        onProceed={handleClientProjectSelected}
      />

      {/* Post-create success modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onProceed={handleViewQuotation}
      />

      <FilterModal
        key={`${showFilterModal}-${JSON.stringify(activeFilters)}`}
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        currentFilters={activeFilters}
      />

      <style>{`
        html { overflow-y: scroll; scrollbar-gutter: stable; }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .animate-fadeIn  { animation: fadeIn  0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </>
  );
}