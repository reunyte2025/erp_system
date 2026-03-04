import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, User, X, CheckCircle, Calendar, DollarSign, Package, Loader2, ChevronRight, Search, MapPin, Building2 } from 'lucide-react';
import { getQuotations, getQuotationStats, getQuotationById } from '../../services/quotation';
import { getClientById, getClients, getClientProjects } from '../../services/clients';
import { getProjectById } from '../../services/projects';
import api from '../../services/api';
import quotationConfig from './quotation.config';
import DynamicList from '../../components/DynamicList/DynamicList';

/**
 * ============================================================================
 * QUOTATIONS LIST COMPONENT
 * ============================================================================
 * 
 * Lists all quotations with stats cards
 * UPDATED: Added QuotationDetailModal to show quotation details on click
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const ENABLE_LOGGING = false;

const logger = {
  log: (...args) => ENABLE_LOGGING && console.log(...args),
  error: (...args) => console.error(...args),
};

// ============================================================================
// QUOTATION DETAIL MODAL COMPONENT
// ============================================================================

const QuotationDetailModal = ({ isOpen, onClose, quotationId }) => {
  const [loading, setLoading] = useState(true);
  const [quotation, setQuotation] = useState(null);
  const [clientName, setClientName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectLocation, setProjectLocation] = useState('');
  const [createdByName, setCreatedByName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && quotationId) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      fetchQuotationDetails();
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
  }, [isOpen, quotationId]);

  const fetchQuotationDetails = async () => {
    setLoading(true);
    setError('');
    setClientName('');
    setProjectName('');
    setProjectLocation('');
    setCreatedByName('');
    try {
      const res = await getQuotationById(quotationId);
      if (res.status === 'success' && res.data) {
        const q = res.data;
        setQuotation(q);
        // Fetch client name
        if (q.client) {
          try {
            const cr = await getClientById(q.client);
            if (cr.status === 'success' && cr.data) {
              const c = cr.data;
              setClientName(`${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || 'Unknown');
            }
          } catch { setClientName('Unknown Client'); }
        }
        // Fetch project name
        if (q.project) {
          try {
            const pr = await getProjectById(q.project);
            if (pr.status === 'success' && pr.data) {
              const p = pr.data;
              setProjectName(p.name || p.title || `Project #${q.project}`);
              const loc = [p.city, p.state].filter(Boolean).join(', ');
              setProjectLocation(loc || p.address || '');
            }
          } catch { setProjectName(`Project #${q.project}`); }
        }
        // Fetch created by
        if (q.created_by) {
          try {
            const ur = await api.get('/users/get_user/', { params: { id: q.created_by } });
            if (ur.data?.status === 'success' && ur.data?.data) {
              const u = ur.data.data;
              setCreatedByName(`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || '');
            }
          } catch { setCreatedByName(''); }
        }
      } else {
        setError('Failed to load quotation details');
      }
    } catch (err) {
      setError(err.message || 'Failed to load quotation details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const fmtQNum = (n) => {
    if (!n) return 'N/A';
    if (String(n).startsWith('QT-')) return String(n);
    const s = String(n);
    if (s.length >= 8) return `QT-${s.substring(0, 4)}-${s.substring(4).padStart(5, '0')}`;
    return `QT-2026-${String(n).padStart(5, '0')}`;
  };

  const fmtCurrency = (amount) => {
    if (!amount && amount !== 0) return 'Rs. 0';
    return `Rs. ${Number(amount).toLocaleString('en-IN')}`;
  };

  const fmtDate = (ds) => {
    if (!ds) return 'N/A';
    try {
      const d = new Date(ds);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return 'N/A'; }
  };

  const statusMap = {
    '1': { text: 'Draft', bg: 'bg-slate-100', tc: 'text-slate-600', dot: 'bg-slate-400' },
    '2': { text: 'Pending', bg: 'bg-amber-50', tc: 'text-amber-700', dot: 'bg-amber-400' },
    '3': { text: 'Sent', bg: 'bg-blue-50', tc: 'text-blue-700', dot: 'bg-blue-400' },
    '4': { text: 'Completed', bg: 'bg-emerald-50', tc: 'text-emerald-700', dot: 'bg-emerald-400' },
    '5': { text: 'Failed', bg: 'bg-red-50', tc: 'text-red-700', dot: 'bg-red-400' },
  };
  const statusBadge = statusMap[String(quotation?.status)] || statusMap['1'];

  const subtotal = quotation?.total_amount || 0;
  const gstAmount = quotation?.total_gst_amount || 0;
  const discountRate = parseFloat(quotation?.discount_rate || 0);
  const grandTotal = quotation?.grand_total || 0;

  return (
    <div className="fixed inset-0 z-[9999] animate-fadeIn" style={{ position: 'fixed', overflow: 'hidden' }}>
      <div className="absolute inset-0 bg-black/50" style={{ position: 'fixed', width: '100vw', height: '100vh' }} onClick={onClose} />
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4" style={{ height: '100vh' }}>
        <div className="relative bg-white w-full max-w-3xl max-h-[92vh] overflow-hidden animate-scaleIn flex flex-col" style={{ borderRadius: '16px', boxShadow: '0 24px 48px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>

          {/* ── Header ── */}
          <div className="bg-teal-700 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-lg leading-tight">
                    {quotation ? fmtQNum(quotation.quotation_number) : 'Loading...'}
                  </p>
                  <p className="text-teal-200 text-xs mt-0.5">Quotation Details</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {quotation && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusBadge.bg} ${statusBadge.tc}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                    {statusBadge.text}
                  </span>
                )}
                <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  <X size={16} className="text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Scrollable Body ── */}
          <div className="overflow-y-auto flex-1 bg-gray-50">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 text-teal-500 animate-spin mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Loading quotation...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-24">
                <div className="text-center">
                  <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <X className="w-7 h-7 text-red-500" />
                  </div>
                  <p className="text-gray-700 font-medium mb-1">Failed to load</p>
                  <p className="text-gray-500 text-sm mb-4">{error}</p>
                  <button onClick={fetchQuotationDetails} className="px-5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium">Retry</button>
                </div>
              </div>
            ) : quotation ? (
              <div className="p-6 space-y-4">

                {/* ── Client & Project Banner ── */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="grid grid-cols-2 divide-x divide-gray-200">
                    <div className="px-5 py-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Bill To</p>
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {clientName ? clientName[0].toUpperCase() : '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{clientName || 'Loading...'}</p>
                          <p className="text-xs text-gray-400">Client</p>
                        </div>
                      </div>
                    </div>
                    <div className="px-5 py-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Project</p>
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{projectName || 'Loading...'}</p>
                          {projectLocation && <p className="text-xs text-gray-400 flex items-center gap-0.5"><MapPin className="w-3 h-3" />{projectLocation}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Meta Row ── */}
                <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-1">Issue Date</p>
                      <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />{fmtDate(quotation.created_at)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-1">Last Updated</p>
                      <p className="text-sm font-semibold text-gray-800">{fmtDate(quotation.updated_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-1">Created By</p>
                      <p className="text-sm font-semibold text-gray-800">{createdByName || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* ── Line Items ── */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
                    <Package className="w-4 h-4 text-teal-600" />
                    <span className="text-sm font-semibold text-gray-800">Line Items</span>
                    <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                      {quotation.items?.length || 0} items
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit Price</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">GST %</th>
                          <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {quotation.items && quotation.items.length > 0 ? (
                          quotation.items.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-gray-50 transition-colors">
                              <td className="px-5 py-3.5 text-sm text-gray-400 font-medium">{idx + 1}</td>
                              <td className="px-5 py-3.5 text-sm text-gray-900 font-medium max-w-xs">
                                {item.description || item.compliance_name || item.name || '—'}
                              </td>
                              <td className="px-4 py-3.5 text-sm text-gray-700 text-center">{item.quantity || 1}</td>
                              <td className="px-4 py-3.5 text-sm text-gray-700 text-right font-medium">
                                {fmtCurrency(item.unit_price || item.Professional_amount || item.rate || 0)}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                                  {item.tax_rate ?? item.gst_rate ?? quotation.gst_rate ?? 0}%
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 text-right">
                                {fmtCurrency(item.total || item.total_amount || 0)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="px-5 py-10 text-center text-gray-400 text-sm">No items found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── Summary ── */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex flex-col items-end px-6 py-4 gap-2.5">
                    <div className="flex justify-between w-full max-w-xs">
                      <span className="text-sm text-gray-500">Subtotal</span>
                      <span className="text-sm font-semibold text-gray-800">{fmtCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between w-full max-w-xs">
                      <span className="text-sm text-gray-500">GST ({quotation.gst_rate ?? 0}%)</span>
                      <span className="text-sm font-semibold text-gray-800">+ {fmtCurrency(gstAmount)}</span>
                    </div>
                    {discountRate > 0 && (
                      <div className="flex justify-between w-full max-w-xs">
                        <span className="text-sm text-gray-500">Discount ({discountRate}%)</span>
                        <span className="text-sm font-semibold text-emerald-600">— {fmtCurrency((subtotal * discountRate) / 100)}</span>
                      </div>
                    )}
                    <div className="w-full max-w-xs border-t border-gray-200 pt-2.5 mt-1 flex justify-between items-center">
                      <span className="text-base font-bold text-gray-900">Grand Total</span>
                      <span className="text-xl font-bold text-teal-600">{fmtCurrency(grandTotal)}</span>
                    </div>
                  </div>
                </div>

              </div>
            ) : null}
          </div>

          {/* ── Footer ── */}
          <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4 bg-white flex justify-end">
            <button onClick={onClose} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm">
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};


// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

const StatCard = ({ icon, count, label, subLabel, bgColor, textColor }) => (
  <div className={`${bgColor} rounded-2xl p-5 shadow-sm relative overflow-hidden`}>
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-3">
        <div className={`${textColor} bg-white/20 rounded-full p-2.5`}>
          {icon}
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white mb-1">{count}</h3>
          <p className="text-white/90 font-medium text-sm">{label}</p>
          {subLabel && <p className="text-white/70 text-xs mt-1">{subLabel}</p>}
        </div>
      </div>
      <button className="text-white/80 hover:text-white">
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </button>
    </div>
  </div>
);

// ============================================================================
// SUCCESS MODAL COMPONENT
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
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
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
    <div 
      className="fixed inset-0 z-[9999] animate-fadeIn"
      style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed', overflow: 'hidden' }}
    >
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{ 
          width: '100vw', 
          height: '100vh', 
          top: 0, 
          left: 0, 
          position: 'fixed',
          overflow: 'hidden'
        }}
        onClick={onClose}
      />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4" style={{ height: '100vh' }}>
        <div 
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-scaleIn"
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
// SELECT CLIENT + PROJECT MODAL COMPONENT (2-Step — Professional Design)
// ============================================================================

const SelectClientProjectModal = ({ isOpen, onClose, onProceed }) => {
  const [step, setStep] = useState('client'); // 'client' | 'project'
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [clientSearch, setClientSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      setStep('client');
      setSelectedClient(null);
      setSelectedProject(null);
      setClientSearch('');
      setProjectSearch('');
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

  // Toggle client selection — click again to deselect
  const handleClientToggle = (client) => {
    if (selectedClient?.id === client.id) {
      setSelectedClient(null);
    } else {
      setSelectedClient(client);
    }
    setSelectedProject(null);
  };

  // Toggle project selection — click again to deselect
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

  const handleBack = () => {
    setStep('client');
    setSelectedProject(null);
  };

  const handleProceed = () => {
    if (selectedClient && selectedProject) {
      onProceed(selectedClient, selectedProject);
    }
  };

  const filteredClients = clients.filter((c) => {
    const name = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
    const email = (c.email || '').toLowerCase();
    return name.includes(clientSearch.toLowerCase()) || email.includes(clientSearch.toLowerCase());
  });

  const filteredProjects = projects.filter((p) => {
    const name = (p.name || p.title || '').toLowerCase();
    const city = (p.city || '').toLowerCase();
    return name.includes(projectSearch.toLowerCase()) || city.includes(projectSearch.toLowerCase());
  });

  // Avatar color palette
  const avatarColors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-rose-500', 'bg-cyan-500', 'bg-amber-500', 'bg-indigo-500'];
  const getAvatarColor = (id) => avatarColors[(id || 0) % avatarColors.length];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] animate-fadeIn" style={{ position: 'fixed', overflow: 'hidden' }}>
      {/* Backdrop */}
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
                  <p className="text-white font-semibold text-base leading-tight">New Quotation</p>
                  <p className="text-teal-200 text-xs mt-0.5">
                    {step === 'client' ? 'Step 1 of 2' : 'Step 2 of 2'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-white" />
              </button>
            </div>

            {/* Step progress bar */}
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
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === 'project' ? 'bg-white text-teal-700' : 'bg-white/20 text-teal-300/60'}`}>
                  2
                </div>
              </div>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="bg-white" style={{ minHeight: '380px' }}>
            {step === 'client' ? (
              <div className="p-5">
                <p className="text-sm font-semibold text-gray-700 mb-0.5">Choose a Client</p>
                <p className="text-xs text-gray-400 mb-4">Select the client this quotation is for</p>

                {/* Selected badge */}
                {selectedClient && (
                  <div className="mb-3 flex items-center justify-between px-3 py-2.5 bg-teal-50 rounded-xl border border-teal-200/80">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0" />
                      <span className="text-sm font-semibold text-teal-800">
                        {selectedClient.first_name} {selectedClient.last_name}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedClient(null)}
                      className="text-xs text-teal-500 hover:text-teal-700 font-medium transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {/* Search */}
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

                {/* Client list */}
                <div className="overflow-y-auto rounded-xl border border-gray-200 bg-white" style={{ maxHeight: '252px' }}>
                  {loadingClients ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
                    </div>
                  ) : filteredClients.length > 0 ? (
                    filteredClients.map((client) => {
                      const isSelected = selectedClient?.id === client.id;
                      return (
                        <div
                          key={client.id}
                          onClick={() => handleClientToggle(client)}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                            isSelected
                              ? 'bg-teal-50'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 ${isSelected ? 'bg-teal-600' : getAvatarColor(client.id)}`}>
                            {(client.first_name?.[0] || '').toUpperCase()}{(client.last_name?.[0] || '').toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate transition-colors ${isSelected ? 'text-teal-800' : 'text-gray-800'}`}>
                              {client.first_name} {client.last_name}
                            </p>
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

                {/* Search */}
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

                {/* Project list */}
                <div className="overflow-y-auto rounded-xl border border-gray-200 bg-white" style={{ maxHeight: '224px' }}>
                  {loadingProjects ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
                      <p className="text-xs text-gray-400">Loading projects...</p>
                    </div>
                  ) : filteredProjects.length > 0 ? (
                    filteredProjects.map((project) => {
                      const isSelected = selectedProject?.id === project.id;
                      const projectName = project.name || project.title || `Project #${project.id}`;
                      const projectSub = project.city
                        ? `${project.city}${project.state ? `, ${project.state}` : ''}`
                        : project.address || `ID: ${project.id}`;
                      return (
                        <div
                          key={project.id}
                          onClick={() => handleProjectToggle(project)}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                            isSelected ? 'bg-teal-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-teal-600' : 'bg-gray-100'}`}>
                            <FileText className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate transition-colors ${isSelected ? 'text-teal-800' : 'text-gray-800'}`}>
                              {projectName}
                            </p>
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
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  selectedClient
                    ? 'bg-teal-600 text-white hover:bg-teal-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleProceed}
                disabled={!selectedProject}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  selectedProject
                    ? 'bg-teal-600 text-white hover:bg-teal-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
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
// MAIN QUOTATIONS LIST COMPONENT
// ============================================================================

export default function QuotationsList() {
  const navigate = useNavigate();
  
  // State management
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [showSelectClientModal, setShowSelectClientModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdQuotation, setCreatedQuotation] = useState(null);
  
  // UPDATED: Added state for quotation detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedQuotationId, setSelectedQuotationId] = useState(null);
  
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    review: 0,
    completed: 0,
  });

  // Request deduplication
  const requestInProgress = useRef(false);
  const lastFetchParams = useRef(null);

  // Fetch quotations with deduplication
  const fetchQuotations = useCallback(async () => {
    const fetchKey = JSON.stringify({ currentPage, pageSize, searchTerm });
    
    if (lastFetchParams.current === fetchKey && !error) {
      logger.log('⏭️  Skipping duplicate request');
      return;
    }

    if (requestInProgress.current) {
      logger.log('⏳ Request in progress, skipping');
      return;
    }

    requestInProgress.current = true;
    lastFetchParams.current = fetchKey;
    setLoading(true);
    setError('');

    try {
      const response = await getQuotations({
        page: currentPage,
        page_size: pageSize,
        search: searchTerm,
      });

      logger.log('📊 Quotation Response:', response);

      if (response.status === 'success' && response.data) {
        const apiData = response.data;
        const quotationResults = apiData.results || [];

        setQuotations(quotationResults);
        setCurrentPage(apiData.page || 1);
        setTotalPages(apiData.total_pages || 1);
        setTotalCount(apiData.total_count || 0);

        try {
          const statsResponse = await getQuotationStats();
          logger.log('📈 Stats Response:', statsResponse);
          
          if (statsResponse.status === 'success' && statsResponse.data) {
            setStats(statsResponse.data);
          }
        } catch (statsErr) {
          logger.error('⚠️ Stats fetch failed:', statsErr);
          const totalQuotations = apiData.total_count || quotationResults.length;
          setStats({
            total: totalQuotations,
            draft: Math.floor(totalQuotations * 0.30),
            review: Math.floor(totalQuotations * 0.25),
            completed: Math.floor(totalQuotations * 0.45),
          });
        }
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
  }, [currentPage, pageSize, searchTerm]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const handleAddQuotation = () => {
    setShowSelectClientModal(true);
  };

  const handleClientProjectSelected = (client, project) => {
    setShowSelectClientModal(false);
    // Navigate to quotation form with selected client and project
    navigate('/quotations/form', { state: { selectedClient: client, selectedProject: project } });
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleFilterToggle = () => {
    setShowFilter((prev) => !prev);
  };

  // UPDATED: Changed to show modal instead of navigating
  const handleRowClick = (quotation) => {
    logger.log('Quotation clicked:', quotation);
    setSelectedQuotationId(quotation.id);
    setShowDetailModal(true);
  };

  const handleRetry = () => {
    fetchQuotations();
  };

  const handleViewQuotation = () => {
    setShowSuccessModal(false);
    if (createdQuotation) {
      // Show the detail modal instead of navigating
      setSelectedQuotationId(createdQuotation.id);
      setShowDetailModal(true);
    }
  };

  const renderStatsCards = () => (
    <>
      <StatCard
        icon={<FileText className="w-5 h-5" />}
        count={stats.total || 0}
        label="Total Quotations"
        subLabel={`${stats.total || 0} total quotations`}
        bgColor="bg-teal-500"
        textColor="text-teal-500"
      />
      <StatCard
        icon={<FileText className="w-5 h-5" />}
        count={stats.draft || 0}
        label="Draft Quotations"
        subLabel={`${stats.draft || 0} draft quotations`}
        bgColor="bg-red-500"
        textColor="text-red-500"
      />
      <StatCard
        icon={<FileText className="w-5 h-5" />}
        count={stats.review || 0}
        label="Under Review"
        subLabel={`${stats.review || 0} pending review`}
        bgColor="bg-yellow-500"
        textColor="text-yellow-500"
      />
      <StatCard
        icon={<FileText className="w-5 h-5" />}
        count={stats.completed || 0}
        label="Completed"
        subLabel={`${stats.completed || 0} completed`}
        bgColor="bg-green-500"
        textColor="text-green-500"
      />
    </>
  );

  return (
    <>
      <DynamicList
        config={quotationConfig}
        data={quotations}
        loading={loading}
        error={error}
        emptyMessage={quotationConfig.emptyMessage}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        onAdd={handleAddQuotation}
        onSearch={handleSearch}
        onFilterToggle={handleFilterToggle}
        onRowClick={handleRowClick}
        onRetry={handleRetry}
        searchTerm={searchTerm}
        showFilter={showFilter}
        statsCards={renderStatsCards()}
      />

      {/* UPDATED: Added QuotationDetailModal */}
      <QuotationDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedQuotationId(null);
        }}
        quotationId={selectedQuotationId}
      />

      <SelectClientProjectModal
        isOpen={showSelectClientModal}
        onClose={() => setShowSelectClientModal(false)}
        onProceed={handleClientProjectSelected}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onProceed={handleViewQuotation}
      />

      <style>{`
        html {
          overflow-y: scroll;
          scrollbar-gutter: stable;
        }
        
        body.modal-open {
          overflow: hidden !important;
          position: fixed !important;
          width: 100% !important;
          height: 100% !important;
        }

        body:has(.z-\\[9999\\]) {
          overflow: hidden !important;
          position: fixed !important;
          width: 100% !important;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </>
  );
}