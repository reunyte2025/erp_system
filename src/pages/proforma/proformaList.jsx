import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileEdit, FileText, X, CheckCircle,
  Loader2, ChevronRight, Search, Filter as FilterIcon, User, Briefcase, Hash
} from 'lucide-react';
import { getProformas, getProformaStats, deleteProformaById } from '../../services/proforma';
import { getClients } from '../../services/clients';
import { getQuotations } from '../../services/quotation';
import { useRole } from '../../components/RoleContext';
import proformaConfig, { getColumns, isProformaDeleted } from './proforma.config';
import DynamicList from '../../components/DynamicList/DynamicList';

/**
 * ============================================================================
 * PROFORMA LIST COMPONENT
 * ============================================================================
 */

const ENABLE_LOGGING = false;
const logger = {
  log: (...args) => ENABLE_LOGGING && console.log(...args),
  error: (...args) => console.error(...args),
};

const EMPTY_PROFORMA_FILTERS = {
  proformaNumber: '',
  clientName: '',
  projectName: '',
  sacCode: '',
  gstRate: '',
};

const normalizeProformaValue = (value) => String(value || '').trim().toLowerCase();

const proformaMatchesSearch = (proforma, value) => {
  const needle = normalizeProformaValue(value);
  if (!needle) return true;

  const haystacks = [
    proforma.proforma_number,
    proforma.client_name,
    proforma.project_name,
    proforma.sac_code,
    proforma.gst_rate,
  ];

  return haystacks.some((field) => normalizeProformaValue(field).includes(needle));
};

const proformaMatchesFilters = (proforma, filters) => {
  if (filters?.proformaNumber && !normalizeProformaValue(proforma.proforma_number).includes(normalizeProformaValue(filters.proformaNumber))) return false;
  if (filters?.clientName && !normalizeProformaValue(proforma.client_name).includes(normalizeProformaValue(filters.clientName))) return false;
  if (filters?.projectName && !normalizeProformaValue(proforma.project_name).includes(normalizeProformaValue(filters.projectName))) return false;
  if (filters?.sacCode && !normalizeProformaValue(proforma.sac_code).includes(normalizeProformaValue(filters.sacCode))) return false;
  if (filters?.gstRate && !normalizeProformaValue(proforma.gst_rate).includes(normalizeProformaValue(filters.gstRate))) return false;
  return true;
};


// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

const StatCard = ({ icon, count, label, subLabel, bgColor }) => (
  <div className={`${bgColor} rounded-2xl p-5 shadow-sm relative overflow-hidden`}>
    <div className="flex items-start gap-3">
      <div className="bg-white/20 rounded-full p-2.5 flex-shrink-0">{icon}</div>
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
// SUCCESS MODAL
// ============================================================================

const SuccessModal = ({ isOpen, onClose, onProceed }) => {
  useEffect(() => {
    return undefined;
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none" style={{ position: 'fixed' }}>
      <div className="absolute inset-0 bg-black/50 pointer-events-auto transition-opacity" style={{ position: 'fixed', width: '100vw', height: '100vh' }} />
      <div className="relative z-10 flex items-center justify-center p-4 pointer-events-none" style={{ height: '100vh' }}>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-scaleIn pointer-events-auto" onClick={e => e.stopPropagation()}>
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle className="w-12 h-12 text-teal-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Successfully</h3>
          <p className="text-xl font-semibold text-gray-800 mb-8">Created Proforma</p>
          <div className="space-y-3">
            <button onClick={onProceed} className="w-full px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all duration-200 font-medium">View Proforma</button>
            <button onClick={onClose} className="w-full px-6 py-3 bg-white text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium">Skip</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// DELETE CONFIRM MODAL
// ============================================================================

const DeleteConfirmModal = ({ isOpen, proforma, onConfirm, onCancel, deleting }) => {
  if (!isOpen || !proforma) return null;

  const pfNum = proforma.proforma_number
    ? (String(proforma.proforma_number).startsWith('PF-')
        ? proforma.proforma_number
        : `PF-${String(proforma.proforma_number)}`)
    : `PF-${String(proforma.id || '').padStart(5, '0')}`;

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
          <h2 className="text-xl font-bold text-gray-800 mb-1">Delete Proforma?</h2>
          <p className="text-sm text-gray-500 mb-6">
            <span className="font-semibold text-gray-700">{pfNum}</span> will be permanently deleted.
            This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={deleting}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={deleting}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 active:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {deleting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
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
  const [filters, setFilters] = useState(() => currentFilters || EMPTY_PROFORMA_FILTERS);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClear = () => {
    setFilters(EMPTY_PROFORMA_FILTERS);
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
              <h2 className="text-base font-semibold">Filter Proforma</h2>
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
              <label className="text-sm font-medium text-gray-700 mb-2 block">Proforma Number</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" name="proformaNumber" value={filters.proformaNumber} onChange={handleInputChange} placeholder="Enter proforma number" className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" />
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
              <label className="text-sm font-medium text-gray-700 mb-2 block">GST Rate</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" name="gstRate" value={filters.gstRate} onChange={handleInputChange} placeholder="Enter GST rate" className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" />
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
// SELECT CLIENT + QUOTATION MODAL (Combined, single card)
// ============================================================================

const SelectClientQuotationModal = ({ isOpen, onClose, onProceed }) => {
  const [step, setStep] = useState('client'); // 'client' | 'quotation'
  const [clients, setClients] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingQuotations, setLoadingQuotations] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [clientSearch, setClientSearch] = useState('');
  const [quotationSearch, setQuotationSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep('client');
      setSelectedClient(null);
      setSelectedQuotation(null);
      setClientSearch('');
      setQuotationSearch('');
      fetchClients();
    }
    return undefined;
  }, [isOpen]);

  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const response = await getClients({ page: 1, page_size: 100 });
      if (response.status === 'success' && response.data) {
        setClients(response.data.results || []);
      }
    } catch (err) {
      logger.error('Failed to fetch clients:', err);
    } finally {
      setLoadingClients(false);
    }
  };

  const fetchQuotations = async (clientId) => {
    setLoadingQuotations(true);
    try {
      const response = await getQuotations({ page: 1, page_size: 100, client: clientId });
      if (response.status === 'success' && response.data) {
        setQuotations(response.data.results || []);
      }
    } catch (err) {
      logger.error('Failed to fetch quotations:', err);
      setQuotations([]);
    } finally {
      setLoadingQuotations(false);
    }
  };

  const handleClientSelect = (client) => {
    setSelectedClient(client);
    setSelectedQuotation(null);
  };

  const handleNextToQuotation = () => {
    if (!selectedClient) return;
    setStep('quotation');
    fetchQuotations(selectedClient.id);
  };

  const handleBack = () => {
    setStep('client');
    setSelectedQuotation(null);
  };

  const handleProceed = () => {
    if (selectedClient && selectedQuotation) {
      onProceed(selectedClient, selectedQuotation);
    }
  };

  const filteredClients = clients.filter(c => {
    const name = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
    const email = (c.email || '').toLowerCase();
    return name.includes(clientSearch.toLowerCase()) || email.includes(clientSearch.toLowerCase());
  });

  const filteredQuotations = quotations.filter(q => {
    const num = String(q.quotation_number || '').toLowerCase();
    const notes = (q.notes || '').toLowerCase();
    return num.includes(quotationSearch.toLowerCase()) || notes.includes(quotationSearch.toLowerCase());
  });

  const formatQNumber = (number) => {
    if (!number) return 'N/A';
    if (String(number).startsWith('QT-')) return number;
    const s = String(number);
    if (s.length >= 8) return `QT-${s.substring(0, 4)}-${s.substring(4).padStart(5, '0')}`;
    return `QT-2026-${String(number).padStart(5, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none" style={{ position: 'fixed' }}>
      <div className="absolute inset-0 bg-black/50 pointer-events-auto transition-opacity" style={{ position: 'fixed', width: '100vw', height: '100vh' }} onClick={onClose} />
      <div className="relative z-10 flex items-center justify-center p-4 pointer-events-none" style={{ height: '100vh' }}>
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn pointer-events-auto" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="bg-teal-700 text-white px-5 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2 font-medium">
              <FileEdit size={18} />
              <span>Add Proforma</span>
            </div>
            <button onClick={onClose} className="hover:bg-teal-600 p-1 rounded transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center px-5 py-3 bg-teal-50 border-b border-teal-100">
            <div className={`flex items-center gap-2 text-sm font-medium ${step === 'client' ? 'text-teal-700' : 'text-teal-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 'client' ? 'bg-teal-600 text-white' : 'bg-teal-200 text-teal-600'}`}>1</div>
              Select Client
            </div>
            <ChevronRight className="w-4 h-4 text-teal-300 mx-2" />
            <div className={`flex items-center gap-2 text-sm font-medium ${step === 'quotation' ? 'text-teal-700' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 'quotation' ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
              Select Quotation
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            {step === 'client' ? (
              <>
                <p className="text-sm font-medium mb-1">Select Client</p>
                <p className="text-xs text-gray-500 mb-3">Choose a client to create a proforma for</p>

                {/* Selected client badge */}
                {selectedClient && (
                  <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-teal-50 rounded-lg border border-teal-200">
                    <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-teal-800">
                      {selectedClient.first_name} {selectedClient.last_name}
                    </span>
                  </div>
                )}

                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                </div>

                <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-lg">
                  {loadingClients ? (
                    <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-teal-600 animate-spin" /></div>
                  ) : filteredClients.length > 0 ? (
                    filteredClients.map(client => (
                      <div
                        key={client.id}
                        onClick={() => handleClientSelect(client)}
                        className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${selectedClient?.id === client.id ? 'bg-teal-50' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${selectedClient?.id === client.id ? 'bg-teal-600' : 'bg-gray-400'}`}>
                            {client.first_name?.[0]}{client.last_name?.[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{client.first_name} {client.last_name}</p>
                            <p className="text-xs text-gray-500 truncate">{client.email}</p>
                          </div>
                          {selectedClient?.id === client.id && <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0" />}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-gray-500 text-sm">No clients found</div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold">
                    {selectedClient?.first_name?.[0]}{selectedClient?.last_name?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedClient?.first_name} {selectedClient?.last_name}</p>
                    <p className="text-xs text-gray-500">{selectedClient?.email}</p>
                  </div>
                </div>

                <p className="text-sm font-medium mb-1">Select Quotation</p>
                <p className="text-xs text-gray-500 mb-3">Choose a quotation to generate proforma from</p>

                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search quotations..."
                    value={quotationSearch}
                    onChange={e => setQuotationSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  {loadingQuotations ? (
                    <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-teal-600 animate-spin" /></div>
                  ) : filteredQuotations.length > 0 ? (
                    filteredQuotations.map(q => (
                      <div
                        key={q.id}
                        onClick={() => setSelectedQuotation(q)}
                        className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${selectedQuotation?.id === q.id ? 'bg-teal-50' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedQuotation?.id === q.id ? 'bg-teal-100' : 'bg-gray-100'}`}>
                            <FileText className={`w-5 h-5 ${selectedQuotation?.id === q.id ? 'text-teal-600' : 'text-gray-500'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{formatQNumber(q.quotation_number)}</p>
                            <p className="text-xs text-gray-500">
                              Rs. {Number(q.grand_total || 0).toLocaleString('en-IN')}
                              {q.notes && ` · ${q.notes.substring(0, 20)}${q.notes.length > 20 ? '...' : ''}`}
                            </p>
                          </div>
                          {selectedQuotation?.id === q.id && <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0" />}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-sm text-gray-500">
                      <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      No quotations found for this client
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex justify-between gap-2">
            <button
              onClick={step === 'client' ? onClose : handleBack}
              className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
            >
              {step === 'client' ? 'Cancel' : 'Back'}
            </button>
            {step === 'client' ? (
              <button
                onClick={handleNextToQuotation}
                disabled={!selectedClient}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedClient ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleProceed}
                disabled={!selectedQuotation}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedQuotation ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              >
                Generate Proforma
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN PROFORMA LIST COMPONENT
// ============================================================================

export default function ProformaList() {
  const navigate = useNavigate();

  // Role-based access
  const { isAdmin, isManager } = useRole();
  const isPrivileged = isAdmin || (isManager ?? false);

  const [proformas, setProformas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState(EMPTY_PROFORMA_FILTERS);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdProforma, _setCreatedProforma] = useState(null);
  const [stats, setStats] = useState({ total: 0, draft: 0, under_review: 0, verified: 0 });

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);
  const [toast, setToast]               = useState(null);

  const requestInProgress = useRef(false);
  const lastFetchParams = useRef(null);

  const fetchProformas = useCallback(async () => {
    const fetchKey = JSON.stringify({ currentPage, pageSize, searchTerm, activeFilters });
    const hasActiveFilters = Object.values(activeFilters).some((value) => String(value || '').trim() !== '');
    const useLocalSearchAndFilter = Boolean(searchTerm.trim() || hasActiveFilters);
    if (lastFetchParams.current === fetchKey && !error) return;
    if (requestInProgress.current) return;

    requestInProgress.current = true;
    lastFetchParams.current = fetchKey;
    setLoading(true);
    setError('');

    try {
      const response = await getProformas({
        page: useLocalSearchAndFilter ? 1 : currentPage,
        page_size: useLocalSearchAndFilter ? 1000 : pageSize,
      });
      if (response.status === 'success' && response.data) {
        const apiData = response.data;
        const results = Array.isArray(apiData.results) ? apiData.results : [];

        if (useLocalSearchAndFilter) {
          const filteredResults = results.filter((proforma) =>
            proformaMatchesSearch(proforma, searchTerm) && proformaMatchesFilters(proforma, activeFilters)
          );
          const startIndex = (currentPage - 1) * pageSize;

          setProformas(filteredResults.slice(startIndex, startIndex + pageSize));
          setCurrentPage(currentPage);
          setTotalPages(Math.max(1, Math.ceil(filteredResults.length / pageSize)));
          setTotalCount(filteredResults.length);
        } else {
          setProformas(results);
          setCurrentPage(apiData.page || 1);
          setTotalPages(apiData.total_pages || 1);
          setTotalCount(apiData.total_count || 0);
        }
        try {
          const statsResponse = await getProformaStats();
          if (statsResponse.status === 'success' && statsResponse.data) setStats(statsResponse.data);
        } catch {
          setStats({ total: 0, draft: 0, under_review: 0, verified: 0 });
        }
      } else {
        setProformas([]);
        setError('Failed to load proformas');
      }
    } catch (err) {
      setError(err.message || 'Failed to load proformas');
      setProformas([]);
    } finally {
      setLoading(false);
      requestInProgress.current = false;
    }
  }, [currentPage, pageSize, searchTerm, activeFilters, error]);

  useEffect(() => { fetchProformas(); }, [fetchProformas]);

  const handleAddProforma = () => setShowSelectModal(true);

  const handleClientQuotationSelected = (client, quotation) => {
    setShowSelectModal(false);
    navigate('/proforma/form', { state: { selectedClient: client, selectedQuotation: quotation } });
  };

  const handleSearch = (value) => { setSearchTerm(value); setCurrentPage(1); };
  const handlePageChange = (page) => setCurrentPage(page);
  const handleFilterToggle = () => setShowFilterModal(true);
  const handleApplyFilters = (filters) => { setActiveFilters(filters); setCurrentPage(1); };

  const handleRowClick = (proforma) => {
    if (isProformaDeleted(proforma)) return;
    navigate(`/proforma/${proforma.id}`);
  };

  const handleViewProforma = () => {
    setShowSuccessModal(false);
    if (createdProforma?.id) {
      navigate(`/proforma/${createdProforma.id}`);
    }
  };

  // Delete handlers
  const handleDeleteProforma = (proforma) => setDeleteTarget(proforma);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProformaById(deleteTarget.id);
      setToast({ message: 'Proforma deleted successfully', type: 'success' });
      setDeleteTarget(null);
      // Optimistically update local state so badge flips to Deleted immediately
      setProformas((prev) =>
        prev.map((p) =>
          p.id === deleteTarget.id
            ? { ...p, status: 5, is_deleted: true, is_active: false }
            : p
        )
      );
      // Re-fetch from server
      lastFetchParams.current = null;
      fetchProformas();
    } catch (err) {
      setToast({ message: err.message || 'Failed to delete proforma', type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => { if (!deleting) setDeleteTarget(null); };

  // Auto-dismiss toast after 3s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const renderStatsCards = () => (
    <>
      <StatCard icon={<FileEdit className="w-5 h-5 text-white" />} count={stats.total || 0} label="Total Proforma" subLabel={`${stats.total || 0} total proformas`} bgColor="bg-teal-500" />
      <StatCard icon={<FileEdit className="w-5 h-5 text-white" />} count={stats.draft || 0} label="Draft Proforma" subLabel={`${stats.draft || 0} draft proformas`} bgColor="bg-red-500" />
      <StatCard icon={<FileEdit className="w-5 h-5 text-white" />} count={stats.under_review || 0} label="Under Review" subLabel={`${stats.under_review || 0} under review`} bgColor="bg-yellow-500" />
      <StatCard icon={<FileEdit className="w-5 h-5 text-white" />} count={stats.verified || 0} label="Verified" subLabel={`${stats.verified || 0} proceed to invoice`} bgColor="bg-green-500" />
    </>
  );

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[99999] animate-slideUp" style={{ transform: 'translateX(-50%)' }}>
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-sm font-semibold ${toast.type === 'success' ? 'bg-teal-600' : 'bg-red-500'}`}
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}
          >
            {toast.type === 'success' ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            )}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-1 opacity-70 hover:opacity-100 transition-opacity">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      <DynamicList
        config={{ ...proformaConfig, columns: getColumns(isPrivileged) }}
        data={proformas}
        loading={loading}
        error={error}
        emptyMessage={proformaConfig.emptyMessage}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        onFilterToggle={handleFilterToggle}
        onRowClick={handleRowClick}
        onRetry={fetchProformas}
        searchTerm={searchTerm}
        showFilter={Object.values(activeFilters).some((value) => String(value || '').trim() !== '')}
        statsCards={renderStatsCards()}
        actionHandlers={isPrivileged ? { onDeleteProforma: handleDeleteProforma } : undefined}
      />

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        proforma={deleteTarget}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        deleting={deleting}
      />

      <SelectClientQuotationModal
        isOpen={showSelectModal}
        onClose={() => setShowSelectModal(false)}
        onProceed={handleClientQuotationSelected}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onProceed={handleViewProforma}
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
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(16px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        .animate-fadeIn  { animation: fadeIn  0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </>
  );
}