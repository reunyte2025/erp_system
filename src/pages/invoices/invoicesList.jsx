import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt, FileText, FileEdit, User, X, CheckCircle,
  Calendar, DollarSign, Package, Loader2, ChevronRight, Search,
} from 'lucide-react';
import { getClients, getClientById } from '../../services/clients';
import { getQuotations } from '../../services/quotation';
import { getProformas } from '../../services/proforma';
import { getInvoices, getInvoiceStats, getInvoiceById } from '../../services/invoices';
import invoicesConfig from './invoices.config';
import DynamicList from '../../components/DynamicList/DynamicList';

/**
 * ============================================================================
 * INVOICES LIST COMPONENT
 * ============================================================================
 * Follows exact same pattern as proformaList.jsx
 */

const ENABLE_LOGGING = false;
const logger = {
  log:   (...args) => ENABLE_LOGGING && console.log(...args),
  error: (...args) => console.error(...args),
};

// ============================================================================
// STAT CARD COMPONENT  — identical to proformaList.jsx StatCard
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
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="5"  r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </button>
    </div>
  </div>
);

// ============================================================================
// INVOICE DETAIL MODAL  — same structure as ProformaDetailModal
// ============================================================================

const InvoiceDetailModal = ({ isOpen, onClose, invoiceId }) => {
  const [loading,    setLoading]    = useState(true);
  const [invoice,    setInvoice]    = useState(null);
  const [clientName, setClientName] = useState('');
  const [error,      setError]      = useState('');

  useEffect(() => {
    if (isOpen && invoiceId) {
      
      
      
      
      
      fetchInvoiceDetails();
    } else {
      
      
      
      
      
      
    }
    return () => {
      
      
      
      
    };
  }, [isOpen, invoiceId]);

  const fetchInvoiceDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getInvoiceById(invoiceId);
      if (res.status === 'success' && res.data) {
        setInvoice(res.data);
        if (res.data.client) {
          try {
            const clientRes = await getClientById(res.data.client);
            if (clientRes.status === 'success' && clientRes.data) {
              const c = clientRes.data;
              setClientName(
                `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown Client'
              );
            }
          } catch { setClientName('Unknown Client'); }
        }
      } else {
        setError('Failed to load invoice details');
      }
    } catch (err) {
      setError(err.message || 'Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatNumber = (number) => {
    if (!number) return 'N/A';
    if (String(number).startsWith('IN-')) return number;
    const s = String(number);
    if (s.length >= 8) return `IN-${s.substring(0, 4)}-${s.substring(4).padStart(5, '0')}`;
    return `IN-2026-${String(number).padStart(5, '0')}`;
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
      '1': { text: 'Draft',             bg: 'bg-blue-100',   tc: 'text-blue-700'   },
      '2': { text: 'Under Review',      bg: 'bg-yellow-100', tc: 'text-yellow-700' },
      '3': { text: 'In Progress',       bg: 'bg-yellow-100', tc: 'text-yellow-700' },
      '4': { text: 'Placed Work-order', bg: 'bg-green-100',  tc: 'text-green-700'  },
      '5': { text: 'Failed',            bg: 'bg-red-100',    tc: 'text-red-700'    },
    };
    return map[String(status)] || map['1'];
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none" style={{ position: 'fixed' }}>
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto transition-opacity"
        onClick={onClose}
        style={{ position: 'fixed', width: '100vw', height: '100vh' }}
      />
      <div className="relative z-10 flex items-center justify-center p-4 pointer-events-none" style={{ height: '100vh' }}>
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-scaleIn pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <Receipt className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-semibold">Invoice Details</h2>
                <p className="text-teal-100 text-sm">
                  {invoice ? formatNumber(invoice.invoice_number) : 'Loading...'}
                </p>
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
                  <p className="text-gray-600">Loading invoice details...</p>
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
                  <button
                    onClick={fetchInvoiceDetails}
                    className="mt-4 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : invoice ? (
              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-teal-600" /> Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Invoice Number</label>
                      <p className="text-base font-semibold text-gray-900 mt-1">
                        {formatNumber(invoice.invoice_number)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <div className="mt-1">
                        {(() => {
                          const b = getStatusBadge(invoice.status);
                          return (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${b.bg} ${b.tc}`}>
                              {b.text}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Client Name</label>
                      <p className="text-base font-semibold text-gray-900 mt-1 flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        {clientName || 'Loading...'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Proforma Ref.</label>
                      <p className="text-base font-semibold text-gray-900 mt-1">
                        #{invoice.proforma || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Created Date</label>
                      <p className="text-base font-semibold text-gray-900 mt-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        {formatDate(invoice.created_at)}
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
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {formatCurrency(invoice.total_amount)}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-teal-100">
                      <label className="text-sm font-medium text-gray-600">GST Rate</label>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{invoice.gst_rate}%</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-teal-100">
                      <label className="text-sm font-medium text-gray-600">GST Amount</label>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {formatCurrency(invoice.total_gst_amount)}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-teal-100">
                      <label className="text-sm font-medium text-gray-600">Discount Rate</label>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{invoice.discount_rate}%</p>
                    </div>
                    <div className="md:col-span-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg p-4">
                      <label className="text-sm font-medium text-teal-100">Grand Total</label>
                      <p className="text-3xl font-bold mt-1">{formatCurrency(invoice.grand_total)}</p>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-teal-600" /> Items ({invoice.items?.length || 0})
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
                        {invoice.items && invoice.items.length > 0
                          ? invoice.items.map((item, idx) => (
                              <tr key={item.id || idx} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-600">{idx + 1}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.description}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center">{item.quantity}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                  {formatCurrency(item.unit_price)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center">{item.tax_rate}%</td>
                                <td className="px-4 py-3 text-sm text-gray-900 font-semibold text-right">
                                  {formatCurrency(item.total)}
                                </td>
                              </tr>
                            ))
                          : (
                            <tr>
                              <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                                No items found
                              </td>
                            </tr>
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
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SUCCESS MODAL  — identical to proformaList.jsx SuccessModal
// ============================================================================

const SuccessModal = ({ isOpen, onClose, onProceed }) => {
  useEffect(() => {
    if (isOpen) {
      
      
      
      
      
    } else {
      
      
      
      
      
      
    }
    return () => {
      
      
      
      
    };
  }, [isOpen]);

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
            <button
              onClick={onProceed}
              className="w-full px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all duration-200 font-medium"
            >
              View Invoice
            </button>
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-white text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium"
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
// SELECT CLIENT + QUOTATION + PROFORMA MODAL  (3-step)
// Same card style as SelectClientQuotationModal in proformaList.jsx
// ============================================================================

const SelectInvoiceModal = ({ isOpen, onClose, onProceed }) => {
  // step: 'client' | 'quotation' | 'proforma'
  const [step,               setStep]               = useState('client');
  const [clients,            setClients]            = useState([]);
  const [quotations,         setQuotations]         = useState([]);
  const [proformas,          setProformas]          = useState([]);
  const [loadingClients,     setLoadingClients]     = useState(false);
  const [loadingQuotations,  setLoadingQuotations]  = useState(false);
  const [loadingProformas,   setLoadingProformas]   = useState(false);
  const [selectedClient,     setSelectedClient]     = useState(null);
  const [selectedQuotation,  setSelectedQuotation]  = useState(null);
  const [selectedProforma,   setSelectedProforma]   = useState(null);
  const [clientSearch,       setClientSearch]       = useState('');
  const [quotationSearch,    setQuotationSearch]    = useState('');
  const [proformaSearch,     setProformaSearch]     = useState('');

  useEffect(() => {
    if (isOpen) {
      
      
      
      
      
      // Reset on every open
      setStep('client');
      setSelectedClient(null);
      setSelectedQuotation(null);
      setSelectedProforma(null);
      setClientSearch('');
      setQuotationSearch('');
      setProformaSearch('');
      fetchClients();
    } else {
      
      
      
      
      
      
    }
    return () => {
      
      
      
      
    };
  }, [isOpen]);

  // ── Fetchers ──────────────────────────────────────────────────────────────

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
    setQuotations([]);
    try {
      // Filters quotations by client ID — only this client's quotations appear
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

  const fetchProformas = async (clientId) => {
    setLoadingProformas(true);
    setProformas([]);
    try {
      // Filters proformas by client ID — only this client's proformas appear
      const response = await getProformas({ page: 1, page_size: 100, client: clientId });
      if (response.status === 'success' && response.data) {
        setProformas(response.data.results || []);
      }
    } catch (err) {
      logger.error('Failed to fetch proformas:', err);
      setProformas([]);
    } finally {
      setLoadingProformas(false);
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleClientSelect = (client) => {
    setSelectedClient(client);
    setSelectedQuotation(null);
    setSelectedProforma(null);
  };

  const handleNextToQuotation = () => {
    if (!selectedClient) return;
    setStep('quotation');
    fetchQuotations(selectedClient.id);
  };

  const handleNextToProforma = () => {
    if (!selectedQuotation) return;
    setStep('proforma');
    fetchProformas(selectedClient.id);
  };

  const handleBack = () => {
    if (step === 'quotation') { setStep('client');    setSelectedQuotation(null); }
    if (step === 'proforma')  { setStep('quotation'); setSelectedProforma(null);  }
  };

  const handleGenerate = () => {
    // UI-only mode: navigate immediately — backend wiring done later
    // TODO (backend): validate selectedProforma before navigating, then call createInvoice()
    onProceed(selectedClient, selectedQuotation, selectedProforma);
  };

  // ── Filters ───────────────────────────────────────────────────────────────

  const filteredClients = clients.filter(c => {
    const name  = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
    const email = (c.email || '').toLowerCase();
    return name.includes(clientSearch.toLowerCase()) || email.includes(clientSearch.toLowerCase());
  });

  const filteredQuotations = quotations.filter(q => {
    const num   = String(q.quotation_number || '').toLowerCase();
    const notes = (q.notes || '').toLowerCase();
    return num.includes(quotationSearch.toLowerCase()) || notes.includes(quotationSearch.toLowerCase());
  });

  const filteredProformas = proformas.filter(p => {
    const num   = String(p.proforma_number || '').toLowerCase();
    const notes = (p.notes || '').toLowerCase();
    return num.includes(proformaSearch.toLowerCase()) || notes.includes(proformaSearch.toLowerCase());
  });

  // ── Formatters ────────────────────────────────────────────────────────────

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

  // Step indicator config
  const steps = [
    { key: 'client',    label: 'Select Client'    },
    { key: 'quotation', label: 'Select Quotation' },
    { key: 'proforma',  label: 'Select Proforma'  },
  ];
  const stepIndex = steps.findIndex(s => s.key === step);

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none" style={{ position: 'fixed' }}>
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto transition-opacity"
        style={{ position: 'fixed', width: '100vw', height: '100vh' }}
        onClick={onClose}
      />
      <div
        className="relative z-10 flex items-center justify-center min-h-screen p-4"
        style={{ height: '100vh' }}
      >
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header — matches proformaList.jsx header exactly */}
          <div className="bg-teal-700 text-white px-5 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2 font-medium">
              <Receipt size={18} />
              <span>Add Invoice</span>
            </div>
            <button onClick={onClose} className="hover:bg-teal-600 p-1 rounded transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Step Indicator — 3 steps */}
          <div className="flex items-center px-5 py-3 bg-teal-50 border-b border-teal-100">
            {steps.map((s, idx) => (
              <div key={s.key} className="flex items-center">
                <div className={`flex items-center gap-1.5 text-sm font-medium ${
                  step === s.key   ? 'text-teal-700' :
                  idx < stepIndex  ? 'text-teal-500' : 'text-gray-400'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    step === s.key   ? 'bg-teal-600 text-white' :
                    idx < stepIndex  ? 'bg-teal-400 text-white' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {idx < stepIndex
                      ? <CheckCircle className="w-3.5 h-3.5" />
                      : idx + 1
                    }
                  </div>
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {idx < steps.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-teal-300 mx-1 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="p-5">

            {/* ── STEP 1: Select Client ── */}
            {step === 'client' && (
              <>
                <p className="text-sm font-medium mb-1">Select Client</p>
                <p className="text-xs text-gray-500 mb-3">Choose a client to generate invoice for</p>

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
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
                    </div>
                  ) : filteredClients.length > 0 ? (
                    filteredClients.map(client => (
                      <div
                        key={client.id}
                        onClick={() => handleClientSelect(client)}
                        className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                          selectedClient?.id === client.id ? 'bg-teal-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                            selectedClient?.id === client.id ? 'bg-teal-600' : 'bg-gray-400'
                          }`}>
                            {client.first_name?.[0]}{client.last_name?.[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {client.first_name} {client.last_name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{client.email}</p>
                          </div>
                          {selectedClient?.id === client.id && (
                            <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-gray-500 text-sm">No clients found</div>
                  )}
                </div>
              </>
            )}

            {/* ── STEP 2: Select Quotation ── */}
            {step === 'quotation' && (
              <>
                {/* Selected client chip */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold">
                    {selectedClient?.first_name?.[0]}{selectedClient?.last_name?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedClient?.first_name} {selectedClient?.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{selectedClient?.email}</p>
                  </div>
                </div>

                <p className="text-sm font-medium mb-1">Select Quotation</p>
                <p className="text-xs text-gray-500 mb-3">Choose a quotation linked to this client</p>

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
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
                    </div>
                  ) : filteredQuotations.length > 0 ? (
                    filteredQuotations.map(q => (
                      <div
                        key={q.id}
                        onClick={() => setSelectedQuotation(q)}
                        className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                          selectedQuotation?.id === q.id ? 'bg-teal-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            selectedQuotation?.id === q.id ? 'bg-teal-100' : 'bg-gray-100'
                          }`}>
                            <FileText className={`w-5 h-5 ${
                              selectedQuotation?.id === q.id ? 'text-teal-600' : 'text-gray-500'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">
                              {formatQNumber(q.quotation_number)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Rs. {Number(q.grand_total || 0).toLocaleString('en-IN')}
                              {q.notes && ` · ${q.notes.substring(0, 20)}${q.notes.length > 20 ? '...' : ''}`}
                            </p>
                          </div>
                          {selectedQuotation?.id === q.id && (
                            <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0" />
                          )}
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

            {/* ── STEP 3: Select Proforma ── */}
            {step === 'proforma' && (
              <>
                {/* Selected client chip */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold">
                    {selectedClient?.first_name?.[0]}{selectedClient?.last_name?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedClient?.first_name} {selectedClient?.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{selectedClient?.email}</p>
                  </div>
                </div>

                <p className="text-sm font-medium mb-1">Select Proforma</p>
                <p className="text-xs text-gray-500 mb-3">Choose a proforma linked to this client</p>

                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search proformas..."
                    value={proformaSearch}
                    onChange={e => setProformaSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  {loadingProformas ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
                    </div>
                  ) : filteredProformas.length > 0 ? (
                    filteredProformas.map(p => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProforma(p)}
                        className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                          selectedProforma?.id === p.id ? 'bg-teal-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            selectedProforma?.id === p.id ? 'bg-teal-100' : 'bg-gray-100'
                          }`}>
                            <FileEdit className={`w-5 h-5 ${
                              selectedProforma?.id === p.id ? 'text-teal-600' : 'text-gray-500'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">
                              {formatPNumber(p.proforma_number)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Rs. {Number(p.grand_total || 0).toLocaleString('en-IN')}
                              {p.notes && ` · ${p.notes.substring(0, 20)}${p.notes.length > 20 ? '...' : ''}`}
                            </p>
                          </div>
                          {selectedProforma?.id === p.id && (
                            <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0" />
                          )}
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

          {/* Footer — matches proformaList.jsx footer exactly */}
          <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex justify-between gap-2">
            <button
              onClick={step === 'client' ? onClose : handleBack}
              className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
            >
              {step === 'client' ? 'Cancel' : 'Back'}
            </button>

            {step === 'client' && (
              <button
                onClick={handleNextToQuotation}
                disabled={!selectedClient}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedClient
                    ? 'bg-teal-600 text-white hover:bg-teal-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            )}

            {step === 'quotation' && (
              <button
                onClick={handleNextToProforma}
                disabled={!selectedQuotation}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedQuotation
                    ? 'bg-teal-600 text-white hover:bg-teal-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            )}

            {step === 'proforma' && (
              <button
                onClick={handleGenerate}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-teal-600 text-white hover:bg-teal-700"
              >
                Generate Invoice
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN INVOICES LIST COMPONENT  — mirrors ProformaList exactly
// ============================================================================

export default function InvoicesList() {
  const navigate = useNavigate();

  const [invoices,          setInvoices]          = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState('');
  const [currentPage,       setCurrentPage]       = useState(1);
  const [totalPages,        setTotalPages]        = useState(1);
  const [totalCount,        setTotalCount]        = useState(0);
  const [pageSize]                                = useState(10);
  const [searchTerm,        setSearchTerm]        = useState('');
  const [showFilter,        setShowFilter]        = useState(false);
  const [showSelectModal,   setShowSelectModal]   = useState(false);
  const [showSuccessModal,  setShowSuccessModal]  = useState(false);
  const [showDetailModal,   setShowDetailModal]   = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [createdInvoice,    setCreatedInvoice]    = useState(null);
  const [stats, setStats] = useState({
    total: 0, total_amount: 0, paid_amount: 0, unpaid_amount: 0,
  });

  const requestInProgress = useRef(false);
  const lastFetchParams   = useRef(null);

  const fetchInvoices = useCallback(async () => {
    const fetchKey = JSON.stringify({ currentPage, pageSize, searchTerm });
    if (lastFetchParams.current === fetchKey && !error) return;
    if (requestInProgress.current) return;

    requestInProgress.current = true;
    lastFetchParams.current   = fetchKey;
    setLoading(true);
    setError('');

    try {
      const response = await getInvoices({
        page: currentPage, page_size: pageSize, search: searchTerm,
      });
      if (response.status === 'success' && response.data) {
        const apiData = response.data;
        setInvoices(apiData.results || []);
        setCurrentPage(apiData.page || 1);
        setTotalPages(apiData.total_pages || 1);
        setTotalCount(apiData.total_count || 0);
        try {
          // Stats come directly from the get_all_invoices response — no separate API call needed
          setStats({
            total:        apiData.total_count  || 0,
            total_amount: apiData.total_amount || 0,
            paid_amount:  apiData.paid_amount  || 0,
            unpaid_amount: apiData.unpaid_amount || 0,
          });
        } catch {
          setStats({ total: apiData.total_count || 0, total_amount: 0, paid_amount: 0, unpaid_amount: 0 });
        }
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
  }, [currentPage, pageSize, searchTerm]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleAddInvoice = () => setShowSelectModal(true);

  // Called when user completes 3-step modal and clicks "Generate Invoice"
  const handleInvoiceSelectComplete = (client, quotation, proforma) => {
    setShowSelectModal(false);
    // Navigate to invoices generation page with selected data as state
    navigate('/invoices/generate', {
      state: {
        selectedClient:    client,
        selectedQuotation: quotation,
        selectedProforma:  proforma,
      },
    });
  };

  const handleSearch       = (value) => { setSearchTerm(value); setCurrentPage(1); };
  const handlePageChange   = (page)  => setCurrentPage(page);
  const handleFilterToggle = ()      => setShowFilter(prev => !prev);

  const handleRowClick = (invoice) => navigate(`/invoices/${invoice.id}`);

  const handleViewInvoice = () => {
    setShowSuccessModal(false);
    if (createdInvoice) {
      setSelectedInvoiceId(createdInvoice.id);
      setShowDetailModal(true);
    }
  };

  const renderStatsCards = () => (
    <>
      <StatCard
        icon={<Receipt className="w-5 h-5 text-white" />}
        count={stats.total || 0}
        label="Total Invoices"
        subLabel={`${stats.total || 0} invoices created`}
        bgColor="bg-teal-500"
      />
      <StatCard
        icon={<Receipt className="w-5 h-5 text-white" />}
        count={`Rs. ${Number(stats.total_amount || 0).toLocaleString('en-IN')}`}
        label="Total Amount"
        subLabel="Sum of all invoice amounts"
        bgColor="bg-blue-500"
      />
      <StatCard
        icon={<Receipt className="w-5 h-5 text-white" />}
        count={`Rs. ${Number(stats.paid_amount || 0).toLocaleString('en-IN')}`}
        label="Paid Amount"
        subLabel="Total amount received"
        bgColor="bg-green-500"
      />
      <StatCard
        icon={<Receipt className="w-5 h-5 text-white" />}
        count={`Rs. ${Number(stats.unpaid_amount || 0).toLocaleString('en-IN')}`}
        label="Unpaid Amount"
        subLabel="Outstanding balance"
        bgColor="bg-red-500"
      />
    </>
  );

  return (
    <>
      <DynamicList
        config={invoicesConfig}
        data={invoices}
        loading={loading}
        error={error}
        emptyMessage={invoicesConfig.emptyMessage}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        onAdd={handleAddInvoice}
        onSearch={handleSearch}
        onFilterToggle={handleFilterToggle}
        onRowClick={handleRowClick}
        onRetry={fetchInvoices}
        searchTerm={searchTerm}
        showFilter={showFilter}
        statsCards={renderStatsCards()}
      />

      <SelectInvoiceModal
        isOpen={showSelectModal}
        onClose={() => setShowSelectModal(false)}
        onProceed={handleInvoiceSelectComplete}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onProceed={handleViewInvoice}
      />

      <style>{`
        html { overflow-y: scroll; scrollbar-gutter: stable; }
        @keyframes fadeIn  { from { opacity: 0; }                         to { opacity: 1; }                       }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn  { animation: fadeIn  0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </>
  );
}
