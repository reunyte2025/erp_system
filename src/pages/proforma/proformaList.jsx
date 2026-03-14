import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileEdit, FileText, User, X, CheckCircle, Calendar, DollarSign,
  Package, Loader2, ChevronRight, Search
} from 'lucide-react';
import { getProformas, getProformaStats, getProformaById } from '../../services/proforma';
import { getClients } from '../../services/clients';
import { getQuotations } from '../../services/quotation';
import { getClientById } from '../../services/clients';
import api from '../../services/api';
import proformaConfig from './proforma.config';
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

// ============================================================================
// PROFORMA DETAIL MODAL
// ============================================================================

const ProformaDetailModal = ({ isOpen, onClose, proformaId }) => {
  const [loading, setLoading] = useState(true);
  const [proforma, setProforma] = useState(null);
  const [clientName, setClientName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && proformaId) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      fetchProformaDetails();
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isOpen, proformaId]);

  const fetchProformaDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getProformaById(proformaId);
      if (res.status === 'success' && res.data) {
        setProforma(res.data);
        if (res.data.client) {
          try {
            const clientRes = await getClientById(res.data.client);
            if (clientRes.status === 'success' && clientRes.data) {
              const c = clientRes.data;
              setClientName(`${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown Client');
            }
          } catch { setClientName('Unknown Client'); }
        }
      } else {
        setError('Failed to load proforma details');
      }
    } catch (err) {
      setError(err.message || 'Failed to load proforma details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatNumber = (number) => {
    if (!number) return 'N/A';
    if (String(number).startsWith('PF-')) return number;
    const s = String(number);
    if (s.length >= 8) return `PF-${s.substring(0, 4)}-${s.substring(4).padStart(5, '0')}`;
    return `PF-2026-${String(number).padStart(5, '0')}`;
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return 'Rs. 0';
    return `Rs. ${Number(amount).toLocaleString('en-IN')}`;
  };

  const formatDate = (ds) => {
    if (!ds) return 'N/A';
    try {
      const d = new Date(ds);
      return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    } catch { return 'N/A'; }
  };

  const getStatusBadge = (status) => {
    const map = {
      '1': { text: 'Draft', bg: 'bg-blue-100', tc: 'text-blue-700' },
      '2': { text: 'Pending', bg: 'bg-yellow-100', tc: 'text-yellow-700' },
      '3': { text: 'In Progress', bg: 'bg-yellow-100', tc: 'text-yellow-700' },
      '4': { text: 'Verified', bg: 'bg-green-100', tc: 'text-green-700' },
      '5': { text: 'Failed', bg: 'bg-red-100', tc: 'text-red-700' },
    };
    return map[String(status)] || map['1'];
  };

  return (
    <div className="fixed inset-0 z-[9999] animate-fadeIn" style={{ position: 'fixed', overflow: 'hidden' }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} style={{ position: 'fixed', width: '100vw', height: '100vh' }} />
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4" style={{ height: '100vh' }}>
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-scaleIn" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <FileEdit className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-semibold">Proforma Details</h2>
                <p className="text-teal-100 text-sm">{proforma ? formatNumber(proforma.proforma_number) : 'Loading...'}</p>
              </div>
            </div>
            <button onClick={onClose} className="hover:bg-teal-600 p-2 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Loading proforma details...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Error Loading Details</h3>
                  <p className="text-gray-600">{error}</p>
                  <button onClick={fetchProformaDetails} className="mt-4 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">Retry</button>
                </div>
              </div>
            ) : proforma ? (
              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FileEdit className="w-5 h-5 text-teal-600" /> Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Proforma Number</label>
                      <p className="text-base font-semibold text-gray-900 mt-1">{formatNumber(proforma.proforma_number)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <div className="mt-1">
                        {(() => { const b = getStatusBadge(proforma.status); return <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${b.bg} ${b.tc}`}>{b.text}</span>; })()}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Client Name</label>
                      <p className="text-base font-semibold text-gray-900 mt-1 flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />{clientName || 'Loading...'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Quotation ID</label>
                      <p className="text-base font-semibold text-gray-900 mt-1">#{proforma.quotation}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Created Date</label>
                      <p className="text-base font-semibold text-gray-900 mt-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />{formatDate(proforma.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl p-5 border border-teal-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-teal-600" /> Financial Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-teal-100">
                      <label className="text-sm font-medium text-gray-600">Total Amount</label>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(proforma.total_amount)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-teal-100">
                      <label className="text-sm font-medium text-gray-600">GST Rate</label>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{proforma.gst_rate}%</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-teal-100">
                      <label className="text-sm font-medium text-gray-600">GST Amount</label>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(proforma.total_gst_amount)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-teal-100">
                      <label className="text-sm font-medium text-gray-600">Discount Rate</label>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{proforma.discount_rate}%</p>
                    </div>
                    <div className="md:col-span-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg p-4">
                      <label className="text-sm font-medium text-teal-100">Grand Total</label>
                      <p className="text-3xl font-bold mt-1">{formatCurrency(proforma.grand_total)}</p>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-teal-600" /> Items ({proforma.items?.length || 0})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-100 border-b border-gray-300">
                          <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">#</th>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Description</th>
                          <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Qty</th>
                          <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Unit Price</th>
                          <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Tax</th>
                          <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proforma.items && proforma.items.length > 0 ? proforma.items.map((item, idx) => (
                          <tr key={item.id || idx} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-600">{idx + 1}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.description}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-center">{item.quantity}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(item.unit_price)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-center">{item.tax_rate}%</td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-semibold text-right">{formatCurrency(item.total)}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">No items found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

const StatCard = ({ icon, count, label, subLabel, bgColor }) => (
  <div className={`${bgColor} rounded-2xl p-5 shadow-sm relative overflow-hidden`}>
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-3">
        <div className="bg-white/20 rounded-full p-2.5">{icon}</div>
        <div>
          <h3 className="text-2xl font-bold text-white mb-1">{count}</h3>
          <p className="text-white/90 font-medium text-sm">{label}</p>
          {subLabel && <p className="text-white/70 text-xs mt-1">{subLabel}</p>}
        </div>
      </div>
      <button className="text-white/80 hover:text-white">
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
        </svg>
      </button>
    </div>
  </div>
);

// ============================================================================
// SUCCESS MODAL
// ============================================================================

const SuccessModal = ({ isOpen, onClose, onProceed }) => {
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] animate-fadeIn" style={{ position: 'fixed', overflow: 'hidden' }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" style={{ position: 'fixed', width: '100vw', height: '100vh' }} />
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4" style={{ height: '100vh' }}>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-scaleIn" onClick={e => e.stopPropagation()}>
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
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      setStep('client');
      setSelectedClient(null);
      setSelectedQuotation(null);
      setClientSearch('');
      setQuotationSearch('');
      fetchClients();
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
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
    <div className="fixed inset-0 z-[9999] animate-fadeIn" style={{ position: 'fixed', overflow: 'hidden' }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" style={{ position: 'fixed', width: '100vw', height: '100vh' }} onClick={onClose} />
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4" style={{ height: '100vh' }}>
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn" onClick={e => e.stopPropagation()}>

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

  const [proformas, setProformas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdProforma, setCreatedProforma] = useState(null);
  const [stats, setStats] = useState({ total: 0, draft: 0, under_review: 0, verified: 0 });

  const requestInProgress = useRef(false);
  const lastFetchParams = useRef(null);

  const fetchProformas = useCallback(async () => {
    const fetchKey = JSON.stringify({ currentPage, pageSize, searchTerm });
    if (lastFetchParams.current === fetchKey && !error) return;
    if (requestInProgress.current) return;

    requestInProgress.current = true;
    lastFetchParams.current = fetchKey;
    setLoading(true);
    setError('');

    try {
      const response = await getProformas({ page: currentPage, page_size: pageSize, search: searchTerm });
      if (response.status === 'success' && response.data) {
        const apiData = response.data;
        setProformas(apiData.results || []);
        setCurrentPage(apiData.page || 1);
        setTotalPages(apiData.total_pages || 1);
        setTotalCount(apiData.total_count || 0);
        try {
          const statsResponse = await getProformaStats();
          if (statsResponse.status === 'success' && statsResponse.data) setStats(statsResponse.data);
        } catch {
          const total = apiData.total_count || (apiData.results || []).length;
          setStats({ total, draft: Math.floor(total * 0.10), under_review: Math.floor(total * 0.30), verified: Math.floor(total * 0.60) });
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
  }, [currentPage, pageSize, searchTerm]);

  useEffect(() => { fetchProformas(); }, [fetchProformas]);

  const handleAddProforma = () => setShowSelectModal(true);

  const handleClientQuotationSelected = (client, quotation) => {
    setShowSelectModal(false);
    navigate('/proforma/form', { state: { selectedClient: client, selectedQuotation: quotation } });
  };

  const handleSearch = (value) => { setSearchTerm(value); setCurrentPage(1); };
  const handlePageChange = (page) => setCurrentPage(page);
  const handleFilterToggle = () => setShowFilter(prev => !prev);

  const handleRowClick = (proforma) => {
    navigate(`/proforma/${proforma.id}`);
  };

  const handleViewProforma = () => {
    setShowSuccessModal(false);
    if (createdProforma?.id) {
      navigate(`/proforma/${createdProforma.id}`);
    }
  };

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
      <DynamicList
        config={proformaConfig}
        data={proformas}
        loading={loading}
        error={error}
        emptyMessage={proformaConfig.emptyMessage}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        onAdd={handleAddProforma}
        onSearch={handleSearch}
        onFilterToggle={handleFilterToggle}
        onRowClick={handleRowClick}
        onRetry={fetchProformas}
        searchTerm={searchTerm}
        showFilter={showFilter}
        statsCards={renderStatsCards()}
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

      <style>{`
        html { overflow-y: scroll; scrollbar-gutter: stable; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </>
  );
}