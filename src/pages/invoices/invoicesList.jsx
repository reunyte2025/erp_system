import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Receipt, FileText, FileEdit, User, X, CheckCircle,
  Loader2, ChevronRight, Search, Filter as FilterIcon, Briefcase, Hash,
} from 'lucide-react';
import { getClients } from '../../services/clients';
import { getQuotations, QUOTATION_COMPANIES, getQuotationCompanyName } from '../../services/quotation';
import { getProformas } from '../../services/proforma';
import { getInvoices, cancelInvoice } from '../../services/invoices';
import { normalizeInvoiceType } from '../../services/invoiceHelpers';
import { useRole } from '../../components/RoleContext';
import invoicesConfig, { getColumns } from './invoices.config';
import DynamicList from '../../components/DynamicList/DynamicList';

/**
 * ============================================================================
 * INVOICES LIST COMPONENT
 * ============================================================================
 * Mirrors proformaList.jsx exactly — including the CompanyDropdown.
 */

const ENABLE_LOGGING = false;
const logger = {
  log:   (...args) => ENABLE_LOGGING && console.log(...args),
  error: (...args) => console.error(...args),
};

const EMPTY_INVOICE_FILTERS = {
  invoiceNumber: '',
  clientName:    '',
  projectName:   '',
  sacCode:       '',
  gstRate:       '',
};

const COMPANY_FILTER_STORAGE_KEY = 'invoice_list_selected_company';

const normalizeInvoiceValue = (value) => String(value || '').trim().toLowerCase();

const invoiceMatchesSearch = (invoice, value) => {
  const needle = normalizeInvoiceValue(value);
  if (!needle) return true;
  const haystacks = [
    invoice.invoice_number,
    invoice.client_name,
    invoice.project_name,
    invoice.sac_code,
    invoice.gst_rate,
  ];
  return haystacks.some((field) => normalizeInvoiceValue(field).includes(needle));
};

const invoiceMatchesFilters = (invoice, filters) => {
  if (filters?.invoiceNumber && !normalizeInvoiceValue(invoice.invoice_number).includes(normalizeInvoiceValue(filters.invoiceNumber))) return false;
  if (filters?.clientName    && !normalizeInvoiceValue(invoice.client_name).includes(normalizeInvoiceValue(filters.clientName)))       return false;
  if (filters?.projectName   && !normalizeInvoiceValue(invoice.project_name).includes(normalizeInvoiceValue(filters.projectName)))     return false;
  if (filters?.sacCode       && !normalizeInvoiceValue(invoice.sac_code).includes(normalizeInvoiceValue(filters.sacCode)))             return false;
  if (filters?.gstRate       && !normalizeInvoiceValue(invoice.gst_rate).includes(normalizeInvoiceValue(filters.gstRate)))             return false;
  return true;
};

// ============================================================================
// STAT CARD — identical to proformaList.jsx
// ============================================================================

const StatCard = ({ icon, count, label, subLabel, bgColor }) => (
  <div className={`${bgColor} rounded-2xl p-5 shadow-sm relative overflow-hidden`}>
    <div className="flex items-start gap-3">
      <div className="bg-white/20 rounded-full p-2.5 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <h3
          className="font-bold text-white mb-1 leading-tight break-all"
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
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none" style={{ position: 'fixed' }}>
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto transition-opacity"
        style={{ position: 'fixed', width: '100vw', height: '100vh' }}
      />
      <div className="relative z-10 flex items-center justify-center p-4 pointer-events-none" style={{ height: '100vh' }}>
        <div
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-scaleIn pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle className="w-12 h-12 text-teal-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Successfully</h3>
          <p className="text-xl font-semibold text-gray-800 mb-8">Invoice Generated</p>
          <div className="space-y-3">
            <button onClick={onProceed} className="w-full px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all duration-200 font-medium">View Invoice</button>
            <button onClick={onClose}   className="w-full px-6 py-3 bg-white text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium">Skip</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CANCEL CONFIRM MODAL
// ============================================================================

const CancelConfirmModal = ({ isOpen, invoice, onConfirm, onCancel, cancelling }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none" style={{ position: 'fixed' }}>
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto"
        style={{ position: 'fixed', width: '100vw', height: '100vh' }}
        onClick={() => !cancelling && onCancel()}
      />
      <div className="relative z-10 flex items-center justify-center p-4 pointer-events-none" style={{ height: '100vh' }}>
        <div
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-scaleIn pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="mb-5 flex justify-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Cancel Invoice?</h3>
          <p className="text-gray-500 text-sm mb-1">You are about to cancel invoice</p>
          <p className="text-gray-800 font-semibold text-sm mb-6">
            {invoice?.invoice_number || `#${invoice?.id}`}
          </p>
          <p className="text-gray-400 text-xs mb-8">
            This action cannot be undone. The invoice will be permanently cancelled.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={cancelling}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm disabled:opacity-50"
            >
              Keep Invoice
            </button>
            <button
              onClick={onConfirm}
              disabled={cancelling}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {cancelling ? (
                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Cancelling…</>
              ) : (
                'Yes, Cancel Invoice'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// FILTER MODAL
// ============================================================================

const FilterModal = ({ isOpen, onClose, onApply, currentFilters }) => {
  const [filters, setFilters] = useState(() => currentFilters || EMPTY_INVOICE_FILTERS);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClear = () => setFilters(EMPTY_INVOICE_FILTERS);

  const handleApply = () => { onApply(filters); onClose(); };

  if (!isOpen) return null;

  const hasActiveFilters = Object.values(filters).some((v) => String(v || '').trim() !== '');

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
              <h2 className="text-base font-semibold">Filter Invoices</h2>
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
              <label className="text-sm font-medium text-gray-700 mb-2 block">Invoice Number</label>
              <div className="relative">
                <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" name="invoiceNumber" value={filters.invoiceNumber} onChange={handleInputChange} placeholder="Enter invoice number" className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" />
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
// SELECT CLIENT + QUOTATION + PROFORMA MODAL  (3-step)
// ============================================================================

const SelectInvoiceModal = ({ isOpen, onClose, onProceed, selectedCompanyId }) => {
  const [step,              setStep]              = useState('client');
  const [clients,           setClients]           = useState([]);
  const [quotations,        setQuotations]        = useState([]);
  const [proformas,         setProformas]         = useState([]);
  const [loadingClients,    setLoadingClients]    = useState(false);
  const [loadingQuotations, setLoadingQuotations] = useState(false);
  const [loadingProformas,  setLoadingProformas]  = useState(false);
  const [selectedClient,    setSelectedClient]    = useState(null);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [selectedProforma,  setSelectedProforma]  = useState(null);
  const [clientSearch,      setClientSearch]      = useState('');
  const [quotationSearch,   setQuotationSearch]   = useState('');
  const [proformaSearch,    setProformaSearch]    = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep('client');
      setSelectedClient(null);
      setSelectedQuotation(null);
      setSelectedProforma(null);
      setClientSearch('');
      setQuotationSearch('');
      setProformaSearch('');
      fetchClients();
    }
  }, [isOpen]);

  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const response = await getClients({ page: 1, page_size: 100 });
      if (response.status === 'success' && response.data) setClients(response.data.results || []);
    } catch (err) { logger.error('Failed to fetch clients:', err); }
    finally { setLoadingClients(false); }
  };

  const fetchQuotations = async (clientId) => {
    setLoadingQuotations(true);
    setQuotations([]);
    try {
      const response = await getQuotations({ page: 1, page_size: 100, client: clientId, company: selectedCompanyId });
      if (response.status === 'success' && response.data) setQuotations(response.data.results || []);
    } catch (err) { logger.error('Failed to fetch quotations:', err); setQuotations([]); }
    finally { setLoadingQuotations(false); }
  };

  const fetchProformas = async (clientId) => {
    setLoadingProformas(true);
    setProformas([]);
    try {
      const response = await getProformas({ page: 1, page_size: 100, client: clientId, company: selectedCompanyId });
      if (response.status === 'success' && response.data) setProformas(response.data.results || []);
    } catch (err) { logger.error('Failed to fetch proformas:', err); setProformas([]); }
    finally { setLoadingProformas(false); }
  };

  const handleClientSelect     = (client) => { setSelectedClient(client); setSelectedQuotation(null); setSelectedProforma(null); };
  const handleNextToQuotation  = () => { if (!selectedClient) return; setStep('quotation'); fetchQuotations(selectedClient.id); };
  const handleNextToProforma   = () => { if (!selectedQuotation) return; setStep('proforma'); fetchProformas(selectedClient.id); };
  const handleBack             = () => {
    if (step === 'quotation') { setStep('client');    setSelectedQuotation(null); }
    if (step === 'proforma')  { setStep('quotation'); setSelectedProforma(null);  }
  };
  const handleGenerate = () => onProceed(selectedClient, selectedQuotation, selectedProforma);

  const filteredClients    = clients.filter(c => `${c.first_name||''} ${c.last_name||''}`.toLowerCase().includes(clientSearch.toLowerCase()) || (c.email||'').toLowerCase().includes(clientSearch.toLowerCase()));
  const filteredQuotations = quotations.filter(q => String(q.quotation_number||'').toLowerCase().includes(quotationSearch.toLowerCase()) || (q.notes||'').toLowerCase().includes(quotationSearch.toLowerCase()));
  const filteredProformas  = proformas.filter(p => String(p.proforma_number||'').toLowerCase().includes(proformaSearch.toLowerCase()) || (p.notes||'').toLowerCase().includes(proformaSearch.toLowerCase()));

  const formatQNumber = (number) => {
    if (!number) return 'N/A';
    if (String(number).startsWith('QT-')) return number;
    const s = String(number);
    if (s.length >= 8) return `QT-${s.substring(0, 4)}-${s.substring(4).padStart(5, '0')}`;
    return `QT-2026-${String(number).padStart(5, '0')}`;
  };
  const formatPNumber = (number) => {
    if (!number) return 'N/A';
    if (String(number).startsWith('PF-')) return number;
    const s = String(number);
    if (s.length >= 8) return `PF-${s.substring(0, 4)}-${s.substring(4).padStart(5, '0')}`;
    return `PF-2026-${String(number).padStart(5, '0')}`;
  };

  if (!isOpen) return null;

  const steps    = [{ key: 'client', label: 'Select Client' }, { key: 'quotation', label: 'Select Quotation' }, { key: 'proforma', label: 'Select Proforma' }];
  const stepIndex = steps.findIndex(s => s.key === step);

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none" style={{ position: 'fixed' }}>
      <div className="absolute inset-0 bg-black/50 pointer-events-auto transition-opacity" style={{ position: 'fixed', width: '100vw', height: '100vh' }} onClick={onClose} />
      <div className="relative z-10 flex items-center justify-center p-4 pointer-events-none" style={{ height: '100vh' }}>
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn pointer-events-auto" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="bg-teal-700 text-white px-5 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2 font-medium">
              <Receipt size={18} />
              <span>Add Invoice</span>
            </div>
            <button onClick={onClose} className="hover:bg-teal-600 p-1 rounded transition-colors"><X size={20} /></button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center px-5 py-3 bg-teal-50 border-b border-teal-100">
            {steps.map((s, idx) => (
              <div key={s.key} className="flex items-center">
                <div className={`flex items-center gap-1.5 text-sm font-medium ${step === s.key ? 'text-teal-700' : idx < stepIndex ? 'text-teal-500' : 'text-gray-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step === s.key ? 'bg-teal-600 text-white' : idx < stepIndex ? 'bg-teal-400 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {idx < stepIndex ? <CheckCircle className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {idx < steps.length - 1 && <ChevronRight className="w-4 h-4 text-teal-300 mx-1 flex-shrink-0" />}
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="p-5">

            {/* STEP 1: Client */}
            {step === 'client' && (
              <>
                <p className="text-sm font-medium mb-1">Select Client</p>
                <p className="text-xs text-gray-500 mb-3">Choose a client to generate invoice for</p>
                {selectedClient && (
                  <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-teal-50 rounded-lg border border-teal-200">
                    <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-teal-800">{selectedClient.first_name} {selectedClient.last_name}</span>
                  </div>
                )}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search by name or email..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                </div>
                <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-lg">
                  {loadingClients ? (
                    <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-teal-600 animate-spin" /></div>
                  ) : filteredClients.length > 0 ? (
                    filteredClients.map(client => (
                      <div key={client.id} onClick={() => handleClientSelect(client)} className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${selectedClient?.id === client.id ? 'bg-teal-50' : ''}`}>
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
            )}

            {/* STEP 2: Quotation */}
            {step === 'quotation' && (
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
                <p className="text-xs text-gray-500 mb-3">Choose a quotation linked to this client</p>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search quotations..." value={quotationSearch} onChange={e => setQuotationSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                </div>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  {loadingQuotations ? (
                    <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-teal-600 animate-spin" /></div>
                  ) : filteredQuotations.length > 0 ? (
                    filteredQuotations.map(q => (
                      <div key={q.id} onClick={() => setSelectedQuotation(q)} className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${selectedQuotation?.id === q.id ? 'bg-teal-50' : ''}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedQuotation?.id === q.id ? 'bg-teal-100' : 'bg-gray-100'}`}>
                            <FileText className={`w-5 h-5 ${selectedQuotation?.id === q.id ? 'text-teal-600' : 'text-gray-500'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{formatQNumber(q.quotation_number)}</p>
                            <p className="text-xs text-gray-500">Rs. {Number(q.grand_total || 0).toLocaleString('en-IN')}{q.notes && ` · ${q.notes.substring(0, 20)}${q.notes.length > 20 ? '...' : ''}`}</p>
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

            {/* STEP 3: Proforma */}
            {step === 'proforma' && (
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
                <p className="text-sm font-medium mb-1">Select Proforma</p>
                <p className="text-xs text-gray-500 mb-3">Choose a proforma linked to this client</p>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search proformas..." value={proformaSearch} onChange={e => setProformaSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                </div>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  {loadingProformas ? (
                    <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-teal-600 animate-spin" /></div>
                  ) : filteredProformas.length > 0 ? (
                    filteredProformas.map(p => (
                      <div key={p.id} onClick={() => setSelectedProforma(p)} className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${selectedProforma?.id === p.id ? 'bg-teal-50' : ''}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedProforma?.id === p.id ? 'bg-teal-100' : 'bg-gray-100'}`}>
                            <FileEdit className={`w-5 h-5 ${selectedProforma?.id === p.id ? 'text-teal-600' : 'text-gray-500'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{formatPNumber(p.proforma_number)}</p>
                            <p className="text-xs text-gray-500">Rs. {Number(p.grand_total || 0).toLocaleString('en-IN')}{p.notes && ` · ${p.notes.substring(0, 20)}${p.notes.length > 20 ? '...' : ''}`}</p>
                          </div>
                          {selectedProforma?.id === p.id && <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0" />}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-sm text-gray-500">
                      <FileEdit className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      No proformas found for this client
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex justify-between gap-2">
            <button onClick={step === 'client' ? onClose : handleBack} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium">
              {step === 'client' ? 'Cancel' : 'Back'}
            </button>
            {step === 'client' && (
              <button onClick={handleNextToQuotation} disabled={!selectedClient} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedClient ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>Next</button>
            )}
            {step === 'quotation' && (
              <button onClick={handleNextToProforma} disabled={!selectedQuotation} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedQuotation ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>Next</button>
            )}
            {step === 'proforma' && (
              <button onClick={handleGenerate} className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-teal-600 text-white hover:bg-teal-700">Generate Invoice</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COMPANY DROPDOWN  — pixel-perfect copy of proformaList.jsx CompanyDropdown
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
  const [open, setOpen]         = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });
  const triggerRef              = useRef(null);
  const panelRef                = useRef(null);
  const selected                = companies.find((c) => String(c.id) === String(selectedId)) || companies[0];
  const selectedIdx             = companies.findIndex((c) => String(c.id) === String(selectedId));
  const selColor                = COMPANY_INITIALS_COLORS[selectedIdx % COMPANY_INITIALS_COLORS.length] || COMPANY_INITIALS_COLORS[0];

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPanelPos({ top: rect.bottom + window.scrollY + 8, right: window.innerWidth - rect.right });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    const handler = (e) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target) && panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  const handleSelect = (id) => { onChange(id); setOpen(false); };

  const panel = open && createPortal(
    <div
      ref={panelRef}
      style={{ position: 'absolute', top: panelPos.top, right: panelPos.right, zIndex: 99999, minWidth: '228px', animation: 'invCompanyDropIn 0.18s cubic-bezier(0.16,1,0.3,1)' }}
      className="rounded-2xl border border-gray-100 bg-white py-2 shadow-2xl"
    >
      <style>{`
        @keyframes invCompanyDropIn {
          from { opacity: 0; transform: scale(0.96) translateY(-6px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>
      <div className="px-4 pb-2 pt-1">
        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-gray-400">Select Company</span>
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
            className={`w-full flex items-center gap-3 px-3 py-2.5 mx-1 rounded-xl text-left transition-all duration-150 text-sm font-medium ${isActive ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-50'}`}
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`group flex items-center gap-2.5 rounded-xl border bg-white pl-2 pr-3 py-2 shadow-sm transition-all duration-200 outline-none ${open ? 'border-teal-400 ring-2 ring-teal-100 shadow-md' : 'border-gray-200 hover:border-teal-300 hover:shadow-md hover:shadow-teal-50'}`}
      >
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold tracking-wide select-none ${selColor.bg} ${selColor.text}`}>
          {getCompanyInitials(selected?.name)}
        </div>
        <div className="text-left min-w-[130px]">
          <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-gray-400 leading-none mb-0.5">Company</span>
          <span className="block text-sm font-semibold text-gray-900 leading-tight truncate max-w-[160px]">{selected?.name || 'Select Company'}</span>
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
// MAIN INVOICES LIST COMPONENT
// ============================================================================

export default function InvoicesList() {
  const navigate = useNavigate();

  const { isAdmin, isManager } = useRole();
  const isPrivileged = isAdmin || (isManager ?? false);

  const [invoices,         setInvoices]         = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState('');
  const [currentPage,      setCurrentPage]      = useState(1);
  const [totalPages,       setTotalPages]       = useState(1);
  const [totalCount,       setTotalCount]       = useState(0);
  const [pageSize]                              = useState(10);
  const [searchTerm,       setSearchTerm]       = useState('');
  const [showFilterModal,  setShowFilterModal]  = useState(false);
  const [activeFilters,    setActiveFilters]    = useState(EMPTY_INVOICE_FILTERS);
  const [selectedCompanyId, setSelectedCompanyId] = useState(() => {
    if (typeof window === 'undefined') return String(QUOTATION_COMPANIES[0]?.id || 1);
    const saved = window.localStorage.getItem(COMPANY_FILTER_STORAGE_KEY);
    return QUOTATION_COMPANIES.some((c) => String(c.id) === String(saved))
      ? String(saved)
      : String(QUOTATION_COMPANIES[0]?.id || 1);
  });
  const [showSelectModal,  setShowSelectModal]  = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdInvoice] = useState(null);
  const [stats, setStats] = useState({ total: 0, total_amount: 0, paid_amount: 0, unpaid_amount: 0 });

  // Cancel state
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling,   setCancelling]   = useState(false);
  const [toast,        setToast]        = useState(null);

  const requestInProgress = useRef(false);
  const lastFetchParams   = useRef(null);

  // Persist selected company
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(COMPANY_FILTER_STORAGE_KEY, selectedCompanyId);
    }
  }, [selectedCompanyId]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchInvoices = useCallback(async () => {
    const fetchKey = JSON.stringify({ currentPage, pageSize, searchTerm, activeFilters, selectedCompanyId });
    const hasActiveFilters = Object.values(activeFilters).some((v) => String(v || '').trim() !== '');
    const useLocalSearchAndFilter = Boolean(searchTerm.trim() || hasActiveFilters);
    if (lastFetchParams.current === fetchKey && !error) return;
    if (requestInProgress.current) return;

    requestInProgress.current = true;
    lastFetchParams.current   = fetchKey;
    setLoading(true);
    setError('');

    try {
      const response = await getInvoices({
        page:      useLocalSearchAndFilter ? 1 : currentPage,
        page_size: useLocalSearchAndFilter ? 1000 : pageSize,
        company:   selectedCompanyId,
      });

      if (response.status === 'success' && response.data) {
        const apiData = response.data;
        const results = Array.isArray(apiData.results)
          ? apiData.results.map((invoice) => ({
              ...invoice,
              company_name: invoice.company_name || getQuotationCompanyName(invoice.company) || 'ERP System',
            }))
          : [];

        if (useLocalSearchAndFilter) {
          const filtered   = results.filter((inv) => invoiceMatchesSearch(inv, searchTerm) && invoiceMatchesFilters(inv, activeFilters));
          const startIndex = (currentPage - 1) * pageSize;
          setInvoices(filtered.slice(startIndex, startIndex + pageSize));
          setTotalPages(Math.max(1, Math.ceil(filtered.length / pageSize)));
          setTotalCount(filtered.length);
        } else {
          setInvoices(results);
          setCurrentPage(apiData.page || 1);
          setTotalPages(apiData.total_pages || 1);
          setTotalCount(apiData.total_count || 0);
        }

        setStats({
          total:         apiData.total_count   || 0,
          total_amount:  apiData.total_amount  || 0,
          paid_amount:   apiData.paid_amount   || 0,
          unpaid_amount: apiData.unpaid_amount || 0,
        });
      } else {
        setInvoices([]);
        setError('Failed to load invoices');
      }
    } catch (err) {
      setError(err.message || 'Failed to load invoices');
      setInvoices([]);
    } finally {
      setLoading(false);
      requestInProgress.current = false;
    }
  }, [currentPage, pageSize, searchTerm, activeFilters, error, selectedCompanyId]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // Handlers
  const handleSearch       = (value) => { setSearchTerm(value); setCurrentPage(1); };
  const handlePageChange   = (page)  => setCurrentPage(page);
  const handleFilterToggle = ()      => setShowFilterModal(true);
  const handleApplyFilters = (filters) => { setActiveFilters(filters); setCurrentPage(1); };
  const handleCompanyChange = (id) => {
    setSelectedCompanyId(id);
    setCurrentPage(1);
    lastFetchParams.current = null;
  };
  const handleRowClick = (invoice) => {
    // Normalise to the canonical type key ('regulatory' | 'execution' | 'vendor' | '')
    // so viewinvoicedetails.jsx hits the correct typed endpoint on the first try —
    // same pattern used by proformaList → viewproformadetails (proformaType hint).
    const invoiceType = normalizeInvoiceType(invoice?.invoice_type || '');
    navigate(`/invoices/${invoice.id}`, {
      state: {
        invoiceType,          // canonical type hint → skips endpoint cascade in detail page
        invoiceData: invoice, // full list-row data → skips extra list fetch in detail page
      },
    });
  };
  const handleViewInvoice = () => {
    setShowSuccessModal(false);
    if (createdInvoice?.id) navigate(`/invoices/${createdInvoice.id}`);
  };
  const handleInvoiceSelectComplete = (client, quotation, proforma) => {
    setShowSelectModal(false);
    navigate('/invoices/generate', { state: { selectedClient: client, selectedQuotation: quotation, selectedProforma: proforma } });
  };

  // Cancel handlers
  const handleCancelInvoice = (invoice) => setCancelTarget(invoice);
  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelInvoice(cancelTarget.id);
      setToast({ message: 'Invoice cancelled successfully', type: 'success' });
      setCancelTarget(null);
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === cancelTarget.id
            ? { ...inv, status: '6', status_display: 'Cancelled', is_cancelled: true }
            : inv
        )
      );
      lastFetchParams.current = null;
      fetchInvoices();
    } catch (err) {
      setToast({ message: err.message || 'Failed to cancel invoice', type: 'error' });
    } finally {
      setCancelling(false);
    }
  };
  const handleCancelDismiss = () => { if (!cancelling) setCancelTarget(null); };

  const selectedCompany = QUOTATION_COMPANIES.find((c) => String(c.id) === String(selectedCompanyId)) || QUOTATION_COMPANIES[0];

  const companySelector = (
    <CompanyDropdown
      companies={QUOTATION_COMPANIES}
      selectedId={selectedCompanyId}
      onChange={handleCompanyChange}
    />
  );

  const renderStatsCards = () => (
    <>
      <StatCard icon={<Receipt className="w-5 h-5 text-white" />} count={stats.total || 0}                                                          label="Total Invoices"  subLabel={`${stats.total || 0} invoices created`}        bgColor="bg-teal-500"  />
      <StatCard icon={<Receipt className="w-5 h-5 text-white" />} count={`Rs. ${Number(stats.total_amount  || 0).toLocaleString('en-IN')}`}         label="Total Amount"    subLabel="Sum of all invoice amounts"                    bgColor="bg-blue-500"  />
      <StatCard icon={<Receipt className="w-5 h-5 text-white" />} count={`Rs. ${Number(stats.paid_amount   || 0).toLocaleString('en-IN')}`}         label="Paid Amount"     subLabel="Total amount received"                         bgColor="bg-green-500" />
      <StatCard icon={<Receipt className="w-5 h-5 text-white" />} count={`Rs. ${Number(stats.unpaid_amount || 0).toLocaleString('en-IN')}`}         label="Unpaid Amount"   subLabel="Outstanding balance"                           bgColor="bg-red-500"   />
    </>
  );

  return (
    <>
      {/* Toast */}
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
        config={{ ...invoicesConfig, columns: getColumns(isPrivileged) }}
        data={invoices}
        loading={loading}
        error={error}
        emptyMessage={`No invoices found for ${selectedCompany?.name || 'the selected company'}`}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        onFilterToggle={handleFilterToggle}
        onRowClick={handleRowClick}
        onRetry={fetchInvoices}
        searchTerm={searchTerm}
        showFilter={Object.values(activeFilters).some((v) => String(v || '').trim() !== '')}
        statsCards={renderStatsCards()}
        actionHandlers={isPrivileged ? { onCancelInvoice: handleCancelInvoice } : undefined}
        headerControls={companySelector}
      />

      <SelectInvoiceModal
        isOpen={showSelectModal}
        onClose={() => setShowSelectModal(false)}
        onProceed={handleInvoiceSelectComplete}
        selectedCompanyId={selectedCompanyId}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onProceed={handleViewInvoice}
      />

      <FilterModal
        key={`${showFilterModal}-${JSON.stringify(activeFilters)}`}
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        currentFilters={activeFilters}
      />

      <CancelConfirmModal
        isOpen={!!cancelTarget}
        invoice={cancelTarget}
        onConfirm={handleCancelConfirm}
        onCancel={handleCancelDismiss}
        cancelling={cancelling}
      />

      <style>{`
        html { overflow-y: scroll; scrollbar-gutter: stable; }
        @keyframes fadeIn  { from { opacity: 0; }                         to { opacity: 1; }                       }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(16px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        .animate-fadeIn  { animation: fadeIn  0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </>
  );
}