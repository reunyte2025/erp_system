import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, User, Phone, Mail, FileText, MapPin, Building2, Hash, Loader2, AlertCircle, CheckCircle, X, Calendar, Filter as FilterIcon, BookOpen } from 'lucide-react';
import { getClients, createClient, deleteClient, undoClient } from '../../services/clients';
import clientConfig, { getColumns } from './client.config';
import { useRole } from '../../components/RoleContext';
import DynamicList from '../../components/DynamicList/DynamicList';

/**
 * ============================================================================
 * CLIENTS COMPONENT - WITH NAVIGATION AND FILTER MODAL
 * ============================================================================
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
// STAT CARD COMPONENT
// ============================================================================

const StatCard = ({ icon, count, label, subLabel, bgColor, textColor }) => (
  <div className={`${bgColor} rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden`}>
    <div className="flex items-start justify-between">
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
      <button className="text-white/80 hover:text-white flex-shrink-0 p-1 -mr-1 touch-manipulation">
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
// FILTER MODAL COMPONENT
// ============================================================================

const FilterModal = ({ isOpen, onClose, onApply, currentFilters }) => {
  const [filters, setFilters] = useState(() => currentFilters || {
    dateFrom: '',
    dateTo: '',
    plotNumber: '',
    projectName: '',
    location: '',
    gstNumber: ''
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Sync local filter state with parent activeFilters whenever modal opens
  useEffect(() => {
    if (isOpen && currentFilters) {
      setFilters(currentFilters);
    }
  }, [isOpen, currentFilters]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleClear = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      plotNumber: '',
      projectName: '',
      location: '',
      gstNumber: ''
    });
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

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
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-3 sm:p-4" style={{ height: '100vh' }}>
        <div 
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col animate-scaleIn"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-teal-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <FilterIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <h2 className="text-base sm:text-lg font-semibold">Filter</h2>
            </div>
            <button 
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors touch-manipulation"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 flex-1">
            {/* Date Range */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700">Select Date</label>
                <button 
                  onClick={handleClear}
                  className="text-teal-600 text-xs sm:text-sm font-medium hover:text-teal-700 touch-manipulation px-2 py-1"
                >
                  Clear
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">From:</label>
                  <div className="relative">
                    <Calendar className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      name="dateFrom"
                      value={filters.dateFrom}
                      onChange={handleInputChange}
                      className="w-full pl-8 sm:pl-9 pr-2 sm:pr-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-xs sm:text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">To:</label>
                  <div className="relative">
                    <Calendar className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      name="dateTo"
                      value={filters.dateTo}
                      onChange={handleInputChange}
                      className="w-full pl-8 sm:pl-9 pr-2 sm:pr-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-xs sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Plot / CTS / Survey Number */}
            <div>
              <label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                Plot / CTS / Survey Number
              </label>
              <div className="relative">
                <Hash className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="plotNumber"
                  value={filters.plotNumber}
                  onChange={handleInputChange}
                  placeholder="123456789"
                  className="w-full pl-8 sm:pl-9 pr-2 sm:pr-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Project Name */}
            <div>
              <label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                Project Name
              </label>
              <div className="relative">
                <Building2 className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="projectName"
                  value={filters.projectName}
                  onChange={handleInputChange}
                  placeholder="ACME Corporation"
                  className="w-full pl-8 sm:pl-9 pr-2 sm:pr-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="location"
                  value={filters.location}
                  onChange={handleInputChange}
                  placeholder="Contact@acme.in"
                  className="w-full pl-8 sm:pl-9 pr-2 sm:pr-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* GST Number */}
            <div>
              <label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                GST Number
              </label>
              <div className="relative">
                <FileText className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="gstNumber"
                  value={filters.gstNumber}
                  onChange={handleInputChange}
                  placeholder="1234556"
                  className="w-full pl-8 sm:pl-9 pr-2 sm:pr-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 flex-shrink-0">
            <button
              onClick={handleApply}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 sm:py-3 px-6 rounded-xl font-medium transition-all duration-200 transform active:scale-[0.98] sm:hover:scale-[1.02] flex items-center justify-center gap-2 text-sm sm:text-base touch-manipulation"
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
// SUCCESS MODAL COMPONENT
// ============================================================================

const SuccessModal = ({ isOpen, onClose, onProceed, isDraft = false }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
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
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 text-center animate-scaleIn"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full border-4 flex items-center justify-center ${isDraft ? 'border-orange-400' : 'border-teal-600'}`}>
            {isDraft
              ? <BookOpen className="w-8 h-8 text-orange-500" />
              : <CheckCircle className="w-8 h-8 text-teal-600" />
            }
          </div>

          <h2 className={`text-xl font-bold mb-1 ${isDraft ? 'text-orange-500' : 'text-teal-600'}`}>
            {isDraft ? 'Saved as Draft' : 'Successfully Created'}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {isDraft ? 'Client has been saved as a draft.' : 'New client has been added.'}
          </p>

          <div className="space-y-2">
            <button
              onClick={onProceed}
              className={`w-full text-white py-2.5 px-6 rounded-xl text-sm font-semibold transition-all duration-150 touch-manipulation ${isDraft ? 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700' : 'bg-teal-600 hover:bg-teal-700 active:bg-teal-800'}`}
            >
              {isDraft ? 'Back to Client List' : 'View Client Profile'}
            </button>
            <button
              onClick={onClose}
              className={`w-full border-2 py-2.5 px-6 rounded-xl text-sm font-semibold transition-all duration-150 touch-manipulation ${isDraft ? 'border-orange-400 text-orange-500 hover:bg-orange-50' : 'border-teal-600 text-teal-600 hover:bg-teal-50'}`}
            >
              {isDraft ? 'Continue Editing' : 'Back to Client List'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// INPUT FIELD COMPONENT
// ============================================================================

// ============================================================================
// CONFIRM DELETE MODAL
// ============================================================================

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, clientName, isLoading }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!isLoading ? onClose : undefined}
      />
      <div className="relative z-10 flex items-center justify-center" style={{ width: '100vw', height: '100vh' }}>
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center animate-scaleIn"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Delete Client?</h2>
          <p className="text-sm text-gray-500 mb-6">
            <span className="font-semibold text-gray-700">{clientName}</span> will be marked as deactive.
            You can restore them later using Undo.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 border-gray-200
                         text-gray-600 hover:bg-gray-50 transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white
                         hover:bg-red-600 active:bg-red-700 transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              {isLoading ? (
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

// ============================================================================
// ACTION TOAST
// ============================================================================

const ActionToast = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className="fixed bottom-6 left-1/2 z-[99999] animate-slideUp"
      style={{ transform: 'translateX(-50%)' }}
    >
      <div
        className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-sm font-semibold
          ${type === 'success' ? 'bg-teal-600' : 'bg-red-500'}`}
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}
      >
        {type === 'success' ? (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        <span>{message}</span>
        <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100 transition-opacity">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// INPUT FIELD COMPONENT
// ============================================================================

const InputField = ({ 
  icon: Icon, 
  label, 
  name, 
  value, 
  onChange, 
  type = 'text', 
  placeholder = '', 
  required = false,
  disabled = false 
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
      />
    </div>
  </div>
);

// ============================================================================
// CREATE / EDIT DRAFT CLIENT MODAL COMPONENT
// ============================================================================

const CreateClientModal = ({ isOpen, onClose, onSuccess, initialData = null }) => {
  // isDraftEdit = true when clicking an existing draft client from the list
  const isDraftEdit = !!(initialData && initialData.id);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstNumber: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [draftSubmitting, setDraftSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill form when editing a draft; reset when opening fresh
  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        firstName:   initialData.first_name   || '',
        lastName:    initialData.last_name    || '',
        phoneNumber: initialData.phone_number || '',
        email:       initialData.email        || '',
        address:     initialData.address      || '',
        city:        initialData.city         || '',
        state:       initialData.state        || '',
        pincode:     initialData.pincode != null ? String(initialData.pincode) : '',
        gstNumber:   initialData.gst_number   || '',
      });
    } else if (isOpen && !initialData) {
      setFormData({ firstName:'', lastName:'', phoneNumber:'', email:'', address:'', city:'', state:'', pincode:'', gstNumber:'' });
    }
    setError('');
  }, [isOpen, initialData]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  }, [error]);

  const validateForm = () => {
    const required = ['firstName', 'lastName', 'phoneNumber', 'email'];
    const missing = required.filter(field => !formData[field].trim());
    
    if (missing.length > 0) {
      const fieldNames = {
        firstName: 'First Name',
        lastName: 'Last Name',
        phoneNumber: 'Phone Number',
        email: 'Email'
      };
      setError(`Please fill in: ${missing.map(f => fieldNames[f]).join(', ')}`);
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (formData.phoneNumber.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid phone number (min 10 digits)');
      return false;
    }

    return true;
  };

  const buildPayload = (isDraft) => ({
    first_name:   formData.firstName.trim(),
    last_name:    formData.lastName.trim(),
    email:        formData.email.trim().toLowerCase(),
    phone_number: formData.phoneNumber.trim(),
    address:      formData.address?.trim()    || '',
    city:         formData.city?.trim()        || '',
    state:        formData.state?.trim()       || '',
    pincode:      formData.pincode?.trim()     || '',
    gst_number:   formData.gstNumber?.trim()   || '',
    is_draft:     isDraft,
  });

  const resetForm = () => {
    setFormData({ firstName:'', lastName:'', phoneNumber:'', email:'', address:'', city:'', state:'', pincode:'', gstNumber:'' });
  };

  const handleSaveAsDraft = async () => {
    setError('');
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('Please enter at least First Name and Last Name to save as draft');
      return;
    }
    setDraftSubmitting(true);
    try {
      // Always createClient with is_draft: true.
      // Backend matches by first_name + last_name + email:
      //   - If a draft exists with those details → updates it in place.
      //   - If nothing exists → creates a new draft.
      const payload = buildPayload(true);
      const response = await createClient(payload);
      resetForm();
      onSuccess(response, true);
    } catch (err) {
      const d = err.response?.data;
      const msg = d?.message
        || d?.errors?.non_field_errors?.[0]
        || d?.errors?.email?.[0]
        || d?.error
        || err.message
        || 'Failed to save draft';
      setError(msg);
    } finally {
      setDraftSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      // Always createClient regardless of new or draft edit.
      // Backend matches by first_name + last_name + email:
      //   - If a DRAFT exists with those details → updates it to ACTIVE (status 2).
      //   - If nothing exists → creates a new ACTIVE client.
      // No deleteClient call needed — backend handles it all internally.
      const payload = buildPayload(false);
      const response = await createClient(payload);
      resetForm();
      onSuccess(response, false);
    } catch (err) {
      logger.error('❌ Error saving client:', err);
      const d = err.response?.data;
      const msg = d?.errors
        || d?.message
        || d?.errors?.non_field_errors?.[0]
        || d?.errors?.email?.[0]
        || d?.error
        || d?.detail
        || err.message
        || 'Failed to save client';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  // Lock body scroll while modal is open
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

  const isAnySubmitting = submitting || draftSubmitting;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] animate-fadeIn"
      style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed', overflow: 'hidden' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{ width: '100vw', height: '100vh', top: 0, left: 0, position: 'fixed', overflow: 'hidden' }}
        onClick={onClose}
      />

      {/* Centering wrapper — never scrolls, always full screen */}
      <div className="relative z-10 flex items-center justify-center" style={{ width: '100vw', height: '100vh' }}>

        {/* Modal card — fixed size, never grows with content */}
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full animate-scaleIn flex flex-col overflow-hidden"
          style={{ maxWidth: '520px', maxHeight: 'calc(100vh - 48px)', margin: '0 16px' }}
          onClick={(e) => e.stopPropagation()}
        >

          {/* ── HEADER — always visible, never moves ───────────────────── */}
          <div className={`flex-shrink-0 text-white px-5 py-4 flex items-center justify-between rounded-t-2xl ${isDraftEdit ? 'bg-orange-500' : 'bg-teal-600'}`}>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                {isDraftEdit ? <BookOpen className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white" />}
              </div>
              <div>
                <h2 className="text-white font-semibold text-base leading-tight">
                  {isDraftEdit ? 'Complete Draft Client' : 'Create New Client'}
                </h2>
                <p className={`text-xs mt-0.5 ${isDraftEdit ? 'text-orange-100' : 'text-teal-100'}`}>
                  {isDraftEdit ? 'Review and complete or re-save this draft' : 'Fill in the details below'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isAnySubmitting}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Draft info banner — shown only when editing an existing draft */}
          {isDraftEdit && (
            <div className="flex-shrink-0 flex items-center gap-2 bg-orange-50 border-b border-orange-100 px-5 py-2.5">
              <BookOpen className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <p className="text-xs text-orange-600 font-medium">
                This client is saved as a draft. Complete all required fields and click <strong>Save as Client</strong> to finalise.
              </p>
            </div>
          )}

          {/* ── SCROLLABLE BODY — error + fields live here, body scrolls ── */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <form onSubmit={handleSubmit} id="create-client-form">
              <div className="px-5 pt-4 pb-2 space-y-4">

                {/* Error banner — inside scroll so card size never changes */}
                {error && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-600 px-3.5 py-2.5 rounded-xl">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="text-xs font-medium leading-relaxed">{error}</span>
                  </div>
                )}

                {/* Section: Personal Info */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Personal Info</p>
                  <div className="grid grid-cols-2 gap-3">
                    <InputField icon={User} label="First Name" name="firstName"
                      value={formData.firstName} onChange={handleInputChange}
                      placeholder="John" required disabled={isAnySubmitting} />
                    <InputField icon={User} label="Last Name" name="lastName"
                      value={formData.lastName} onChange={handleInputChange}
                      placeholder="Doe" required disabled={isAnySubmitting} />
                  </div>
                </div>

                {/* Section: Contact */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Contact</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InputField icon={Phone} label="Phone Number" name="phoneNumber"
                      value={formData.phoneNumber} onChange={handleInputChange}
                      type="tel" placeholder="+91 98765 43210" required disabled={isAnySubmitting} />
                    <InputField icon={Mail} label="Email Address" name="email"
                      value={formData.email} onChange={handleInputChange}
                      type="email" placeholder="john@example.com" required disabled={isAnySubmitting} />
                  </div>
                </div>

                {/* Section: Address */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Address</p>
                  <div className="space-y-3">
                    <InputField icon={MapPin} label="Street Address" name="address"
                      value={formData.address} onChange={handleInputChange}
                      placeholder="123 Main Street" disabled={isAnySubmitting} />
                    <div className="grid grid-cols-3 gap-2.5">
                      <InputField icon={Building2} label="City" name="city"
                        value={formData.city} onChange={handleInputChange}
                        placeholder="Mumbai" disabled={isAnySubmitting} />
                      <InputField icon={MapPin} label="State" name="state"
                        value={formData.state} onChange={handleInputChange}
                        placeholder="MH" disabled={isAnySubmitting} />
                      <InputField icon={Hash} label="Pincode" name="pincode"
                        value={formData.pincode} onChange={handleInputChange}
                        placeholder="400001" disabled={isAnySubmitting} />
                    </div>
                  </div>
                </div>

                {/* Section: Business */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Business (Optional)</p>
                  <InputField icon={FileText} label="GST Number" name="gstNumber"
                    value={formData.gstNumber} onChange={handleInputChange}
                    placeholder="22AAAAA0000A1Z5" disabled={isAnySubmitting} />
                </div>

              </div>
            </form>
          </div>

          {/* ── FOOTER — always visible, never moves ───────────────────── */}
          <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 bg-white rounded-b-2xl">
            <div className="flex items-center gap-2.5">
              {/* Cancel */}
              <button
                type="button"
                onClick={onClose}
                disabled={isAnySubmitting}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200
                           hover:bg-gray-50 active:bg-gray-100 transition-all duration-150
                           disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                Cancel
              </button>

              {/* Save as Draft */}
              <button
                type="button"
                onClick={handleSaveAsDraft}
                disabled={isAnySubmitting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium
                           border-2 border-orange-400 text-orange-500
                           hover:bg-orange-50 active:bg-orange-100 transition-all duration-150
                           disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center justify-center gap-1.5"
              >
                {draftSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
                ) : (
                  <><BookOpen className="w-4 h-4" />{isDraftEdit ? 'Update Draft' : 'Save as Draft'}</>
                )}
              </button>

              {/* Create / Finalise Client */}
              <button
                type="submit"
                form="create-client-form"
                disabled={isAnySubmitting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold
                           bg-teal-600 text-white shadow-sm shadow-teal-600/30
                           hover:bg-teal-700 active:bg-teal-800 transition-all duration-150
                           disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />{isDraftEdit ? 'Saving...' : 'Creating...'}</>
                ) : (
                  isDraftEdit ? 'Save as Client' : 'Create Client'
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN CLIENTS COMPONENT
// ============================================================================

export default function Clients() {
  const navigate = useNavigate();
  const { isAdmin } = useRole();

  // Columns are filtered by role — Admin sees Actions column, others do not
  const columns = getColumns(isAdmin);
  
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState({ total: 0, draft: 0, star: 0, newlyAdded: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  // ── Sorting state ──────────────────────────────────────────────────────────
  // sortBy: the API field name (e.g. 'first_name', 'created_at', 'status')
  // sortOrder: 'asc' | 'desc'
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [createdClient, setCreatedClient] = useState(null);
  const [lastCreatedIsDraft, setLastCreatedIsDraft] = useState(false);
  const [draftClientToEdit, setDraftClientToEdit] = useState(null);
  const [activeFilters, setActiveFilters] = useState({
    dateFrom: '',
    dateTo: '',
    plotNumber: '',
    projectName: '',
    location: '',
    gstNumber: ''
  });

  // ── Delete / Undo state ────────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clientToDelete, setClientToDelete]   = useState(null);
  const [isDeleting, setIsDeleting]           = useState(false);
  const [isUndoing, setIsUndoing]             = useState(false);
  const [toast, setToast]                     = useState(null); // { message, type }
  // ──────────────────────────────────────────────────────────────────────────
  
  const requestInProgress = useRef(false);
  const lastFetchParams = useRef(null);

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  const fetchClients = useCallback(async () => {
    const currentParams = JSON.stringify({ currentPage, pageSize, searchTerm, activeFilters, sortBy, sortOrder });

    if (requestInProgress.current && lastFetchParams.current === currentParams) {
      logger.log('⏭️ Skipping duplicate request');
      return;
    }

    requestInProgress.current = true;
    lastFetchParams.current = currentParams;

    try {
      setLoading(true);
      setError(null);

      logger.log('📡 Fetching clients...', { currentPage, pageSize, searchTerm, activeFilters, sortBy, sortOrder });

      const params = {
        page: currentPage,
        page_size: pageSize,
      };

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      // ── Sorting params ───────────────────────────────────────────────────
      if (sortBy) {
        params.sort_by = sortBy;
        params.sort_order = sortOrder;
      }

      if (activeFilters.dateFrom) params.date_from = activeFilters.dateFrom;
      if (activeFilters.dateTo) params.date_to = activeFilters.dateTo;
      if (activeFilters.plotNumber?.trim()) params.plot_number = activeFilters.plotNumber.trim();
      if (activeFilters.projectName?.trim()) params.project_name = activeFilters.projectName.trim();
      if (activeFilters.location?.trim()) params.location = activeFilters.location.trim();
      if (activeFilters.gstNumber?.trim()) params.gst_number = activeFilters.gstNumber.trim();

      const response = await getClients(params);
      logger.log('📦 Clients Response:', response);

      if (response.status === 'success' && response.data) {
        const apiData = response.data;
        const clientResults = apiData.results || [];

        setClients(clientResults);
        setTotalPages(apiData.total_pages || 1);
        setTotalCount(apiData.total_count || clientResults.length);

        // ── Stats ────────────────────────────────────────────────────────────
        // Log the raw apiData so we can see exactly what fields the backend returns
        console.log('[Clients] apiData keys:', Object.keys(apiData));
        console.log('[Clients] apiData stats:', {
          total_count:        apiData.total_count,
          draft_count:        apiData.draft_count,
          star_count:         apiData.star_count,
          start_client_count: apiData.start_client_count,
          new_count:          apiData.new_count,
        });

        // The backend field for "star client" is "start_client" (backend typo).
        // For the count stat card we try every possible field name the backend
        // might use. We NEVER fall back to page-level counting because that only
        // covers the current page (up to page_size items) and will be wrong when
        // there are multiple pages.
        const resolveCount = (...fields) => {
          for (const f of fields) {
            if (typeof apiData[f] === 'number') return apiData[f];
          }
          return 0; // unknown — show 0, not a guess
        };

        setStats({
          total:      resolveCount('total_count'),
          draft:      resolveCount('draft_count'),
          star:       resolveCount('star_count', 'start_client_count', 'starred_count'),
          newlyAdded: resolveCount('new_count', 'newly_added_count'),
        });
      } else {
        setClients([]);
        setError('Failed to load clients');
      }
    } catch (err) {
      logger.error('❌ Error fetching clients:', err);
      setError(err.message || 'Failed to load clients');
      setClients([]);
    } finally {
      setLoading(false);
      requestInProgress.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, searchTerm, activeFilters, sortBy, sortOrder]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  const handleCreateSuccess = (clientData, isDraft = false) => {
    // Log the full response so we can see exactly what shape it is
    console.log('[Clients] handleCreateSuccess — clientData received:', JSON.stringify(clientData, null, 2));
    setCreatedClient(clientData);
    setLastCreatedIsDraft(isDraft);
    setShowCreateModal(false);
    setShowSuccessModal(true);
    lastFetchParams.current = null;
    fetchClients();
  };

  const handleProceedToClient = () => {
    setShowSuccessModal(false);
    // Draft clients stay on the list — no profile page to navigate to
    if (lastCreatedIsDraft) {
      setDraftClientToEdit(null);
      return;
    }
    // Navigate to the newly created/finalised client profile
    // Handle all possible response shapes:
    // Shape A: { data: { id: X } }          ← wrapped response
    // Shape B: { id: X }                     ← flat response
    // Shape C: { status: "success", data: { id: X } } ← API envelope
    // Handle all response shapes:
    // Shape A (normal create): { id: X, first_name: ... }  ← flat, direct
    // Shape B (wrapped):       { data: { id: X } }
    // Shape C (envelope):      { status: 'success', data: { id: X } }
    const id = createdClient?.id
      ?? createdClient?.data?.id
      ?? createdClient?.data?.data?.id;
    console.log('[Clients] Navigating to client ID:', id, '| Full createdClient:', createdClient);
    if (id) {
      navigate(`/clients/${id}`);
    } else {
      logger.error('No client ID found in created client data');
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleFilterToggle = () => {
    setShowFilterModal(true);
  };

  const handleApplyFilters = (filters) => {
    logger.log('🔍 Filters applied:', filters);
    setActiveFilters(filters);
    setCurrentPage(1);
    lastFetchParams.current = null;
  };

  /**
   * Sort handler — called from ListTable when a sortable column header is clicked.
   * Toggles direction if the same column is clicked again; resets to page 1.
   *
   * NOTE: We read sortBy/sortOrder directly (not via prev callbacks) to avoid
   * the stale-closure / nested-setState bug that caused the 2nd click to silently
   * no-op. Both state values are in the useCallback dep array so they are always
   * fresh when this function is called.
   */
  const handleSort = useCallback((field) => {
    if (field === sortBy) {
      // Same column → flip direction
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New column → set field and default to asc
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
    lastFetchParams.current = null;
  }, [sortBy, sortOrder]);

  /**
   * Row click handler.
   * Draft clients: status === 1  → open the modal pre-filled with their data.
   * Active clients: status === 2 (or any other) → navigate to profile page.
   */
  const handleRowClick = (client) => {
    logger.log('Client clicked:', client);
    // Deactive clients (status 3) — block navigation entirely
    if (client.status === 3) return;
    if (client.status === 1) {
      setDraftClientToEdit(client);
      setShowCreateModal(true);
      return;
    }
    if (client.id) {
      navigate(`/clients/${client.id}`);
    } else {
      logger.error('Client ID not found');
    }
  };

  const handleRetry = () => {
    fetchClients();
  };

  // ── Delete Client ──────────────────────────────────────────────────────────
  const handleDeleteClient = (client) => {
    setClientToDelete(client);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;
    setIsDeleting(true);
    try {
      await deleteClient(clientToDelete.id);
      setShowDeleteModal(false);
      setClientToDelete(null);
      lastFetchParams.current = null;
      fetchClients();
      setToast({ message: 'Client deleted successfully', type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Failed to delete client', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Undo (Restore) Client — PATCH /clients/undo_client/?id= ───────────────
  const handleUndoClient = async (client) => {
    if (isUndoing) return;
    setIsUndoing(true);
    try {
      await undoClient(client.id);
      lastFetchParams.current = null;
      fetchClients();
      setToast({ message: 'Client restored successfully', type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Failed to restore client', type: 'error' });
    } finally {
      setIsUndoing(false);
    }
  };
  // ──────────────────────────────────────────────────────────────────────────

  // ========================================================================
  // RENDER STATS CARDS
  // ========================================================================

  const renderStatsCards = () => (
    <>
      <StatCard
        icon={<Users className="w-5 h-5" />}
        count={stats.total || 0}
        label="Total Clients"
        subLabel={`${stats.total || 0} total clients`}
        bgColor="bg-teal-500"
        textColor="text-teal-500"
      />
      <StatCard
        icon={<Users className="w-5 h-5" />}
        count={stats.draft || 0}
        label="Draft Clients"
        subLabel={`${stats.draft || 0} draft clients`}
        bgColor="bg-orange-600"
        textColor="text-orange-600"
      />
      <StatCard
        icon={<Users className="w-5 h-5" />}
        count={stats.star || 0}
        label="Star Clients"
        subLabel={`${stats.star || 0} star clients`}
        bgColor="bg-lime-500"
        textColor="text-lime-500"
      />
      <StatCard
        icon={<Users className="w-5 h-5" />}
        count={stats.newlyAdded || 0}
        label="Newly Added"
        bgColor="bg-green-500"
        textColor="text-green-500"
      />
    </>
  );

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <>
      <DynamicList
        config={{ ...clientConfig, columns }}
        data={clients}
        loading={loading}
        error={error}
        emptyMessage={clientConfig.emptyMessage}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        onAdd={() => { setDraftClientToEdit(null); setShowCreateModal(true); }}
        onSearch={handleSearch}
        onFilterToggle={handleFilterToggle}
        onRowClick={handleRowClick}
        onRetry={handleRetry}
        onSort={handleSort}
        sortBy={sortBy}
        sortOrder={sortOrder}
        searchTerm={searchTerm}
        showFilter={showFilter}
        statsCards={renderStatsCards()}
        actionHandlers={isAdmin ? { onDeleteClient: handleDeleteClient, onUndoClient: handleUndoClient } : undefined}
      />

      <CreateClientModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setDraftClientToEdit(null); }}
        onSuccess={handleCreateSuccess}
        initialData={draftClientToEdit}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        isDraft={lastCreatedIsDraft}
        onClose={() => setShowSuccessModal(false)}
        onProceed={handleProceedToClient}
      />

      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        currentFilters={activeFilters}
      />

      {/* ── Confirm Delete Modal (Admin only — gated in ActionsMenu) ── */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => { if (!isDeleting) { setShowDeleteModal(false); setClientToDelete(null); } }}
        onConfirm={handleConfirmDelete}
        clientName={clientToDelete ? `${clientToDelete.first_name || ''} ${clientToDelete.last_name || ''}`.trim() : ''}
        isLoading={isDeleting}
      />

      {/* ── Action Toast ── */}
      {toast && (
        <ActionToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <style>{`
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
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .animate-fadeIn  { animation: fadeIn  0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
        .animate-slideUp   { animation: slideUp   0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </>
  );
}