import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, User, Phone, Mail, FileText, MapPin, Building2, Hash, Loader2, AlertCircle, CheckCircle, X, Filter as FilterIcon, BookOpen } from 'lucide-react';
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
// FILTER MODAL COMPONENT
// ============================================================================

const EMPTY_FILTERS = {
  first_name:  '',
  last_name:   '',
  email:       '',
  gst_number:  '',
};

const CLIENT_ERROR_LABELS = {
  first_name: 'First Name',
  last_name: 'Last Name',
  email: 'Email',
  phone_number: 'Phone Number',
  address: 'Address',
  city: 'City',
  state: 'State',
  pincode: 'Pincode',
  gst_number: 'GST Number',
};

const cleanClientErrorText = (message) => String(message || '')
  .replace(/^Validation error:\s*/i, '')
  .replace(/^Server error:\s*/i, '')
  .trim();

const parseClientErrorPayload = (value) => {
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const formatClientErrorPayload = (payload, fallbackMessage) => {
  if (!payload) return fallbackMessage;

  if (typeof payload === 'string') {
    return cleanClientErrorText(payload) || fallbackMessage;
  }

  const fieldErrors = payload.errors;
  if (fieldErrors && typeof fieldErrors === 'object') {
    const messages = Object.entries(fieldErrors).flatMap(([field, fieldValue]) => {
      const entries = Array.isArray(fieldValue) ? fieldValue : [fieldValue];
      return entries
        .filter(Boolean)
        .map((entry) => {
          const text = cleanClientErrorText(entry);
          if (!text) return null;
          if (field === 'non_field_errors') return text;
          return `${CLIENT_ERROR_LABELS[field] || field}: ${text}`;
        })
        .filter(Boolean);
    });

    if (messages.length > 0) {
      return messages.join(' ');
    }
  }

  const genericMessage = payload.message || payload.error || payload.detail;
  if (genericMessage) {
    return cleanClientErrorText(genericMessage) || fallbackMessage;
  }

  return fallbackMessage;
};

const formatClientSubmissionError = (err, fallbackMessage) => {
  const payloadMessage = formatClientErrorPayload(err?.response?.data, '');
  if (payloadMessage) return payloadMessage;

  const cleanedMessage = cleanClientErrorText(err?.message);
  const parsedPayload = parseClientErrorPayload(cleanedMessage);
  if (parsedPayload) {
    return formatClientErrorPayload(parsedPayload, fallbackMessage);
  }

  return cleanedMessage || fallbackMessage;
};

const normalizeSearchValue = (value) => String(value || '').trim().toLowerCase();

const clientMatchesText = (client, value) => {
  const needle = normalizeSearchValue(value);
  if (!needle) return true;

  const haystacks = [
    client.first_name,
    client.last_name,
    `${client.first_name || ''} ${client.last_name || ''}`.trim(),
    client.email,
    client.phone_number,
    client.gst_number,
    client.address,
    client.city,
    client.state,
    client.pincode,
  ];

  return haystacks.some((field) => normalizeSearchValue(field).includes(needle));
};

const clientMatchesFilters = (client, filters) => (
  clientMatchesText({ first_name: client.first_name }, filters?.first_name) &&
  clientMatchesText({ last_name: client.last_name }, filters?.last_name) &&
  clientMatchesText({ email: client.email }, filters?.email) &&
  clientMatchesText({ gst_number: client.gst_number }, filters?.gst_number)
);

const FilterModal = ({ isOpen, onClose, onApply, currentFilters }) => {
  const [filters, setFilters] = useState(() => currentFilters || EMPTY_FILTERS);

  // Sync with parent whenever modal opens
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
    setFilters(EMPTY_FILTERS);
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  if (!isOpen) return null;

  // Check if any filter is active to show a visual indicator on the Clear button
  const hasActiveFilters = Object.values(filters).some(v => v.trim() !== '');

  return (
    <div
      className="fixed inset-0 z-[9999] animate-fadeIn pointer-events-none"
      style={{ position: 'fixed' }}
    >
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto"
        style={{ position: 'fixed', width: '100vw', height: '100vh' }}
        onClick={onClose}
      />
      <div className="relative z-10 flex items-center justify-center p-3 sm:p-4 pointer-events-none" style={{ height: '100vh' }}>
        <div
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col animate-scaleIn pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-teal-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <FilterIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <h2 className="text-base sm:text-lg font-semibold">Filter Clients</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors touch-manipulation"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 space-y-4 flex-1">
            {/* Section header + Clear */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Filter by</p>
              {hasActiveFilters && (
                <button
                  onClick={handleClear}
                  className="text-teal-600 text-xs sm:text-sm font-medium hover:text-teal-700 touch-manipulation px-2 py-1 rounded-lg hover:bg-teal-50 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* First Name */}
            <div>
              <label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                First Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="first_name"
                  value={filters.first_name}
                  onChange={handleInputChange}
                  placeholder="e.g. John"
                  className="w-full pl-9 pr-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            {/* Last Name */}
            <div>
              <label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                Last Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="last_name"
                  value={filters.last_name}
                  onChange={handleInputChange}
                  placeholder="e.g. Doe"
                  className="w-full pl-9 pr-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={filters.email}
                  onChange={handleInputChange}
                  placeholder="e.g. john@example.com"
                  className="w-full pl-9 pr-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            {/* GST Number */}
            <div>
              <label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                GST Number
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="gst_number"
                  value={filters.gst_number}
                  onChange={handleInputChange}
                  placeholder="e.g. 22AAAAA0000A1Z5"
                  className="w-full pl-9 pr-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 flex-shrink-0">
            <button
              onClick={handleApply}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 sm:py-3 px-6 rounded-xl font-medium transition-all duration-200 transform active:scale-[0.98] flex items-center justify-center gap-2 text-sm sm:text-base touch-manipulation"
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
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] animate-fadeIn pointer-events-none"
      style={{ position: 'fixed' }}
    >
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto"
        style={{ position: 'fixed', width: '100vw', height: '100vh' }}
        onClick={onClose}
      />
      <div className="relative z-10 flex items-center justify-center p-4 pointer-events-none" style={{ height: '100vh' }}>
        <div
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 text-center animate-scaleIn pointer-events-auto"
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
// CONFIRM DELETE MODAL
// ============================================================================

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, clientName, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none" style={{ position: 'fixed' }}>
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto"
        style={{ position: 'fixed', width: '100vw', height: '100vh' }}
        onClick={!isLoading ? onClose : undefined}
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
      const payload = buildPayload(true);
      const response = await createClient(payload);
      resetForm();
      onSuccess(response, true);
    } catch (err) {
      setError(formatClientSubmissionError(err, 'Failed to save draft'));
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
      const payload = buildPayload(false);
      const response = await createClient(payload);
      resetForm();
      onSuccess(response, false);
    } catch (err) {
      logger.error('❌ Error saving client:', err);
      setError(formatClientSubmissionError(err, 'Failed to save client'));
    } finally {
      setSubmitting(false);
    }
  };

  const isAnySubmitting = submitting || draftSubmitting;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] animate-fadeIn pointer-events-none"
      style={{ position: 'fixed' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto"
        style={{ position: 'fixed', width: '100vw', height: '100vh' }}
        onClick={onClose}
      />

      {/* Centering wrapper */}
      <div className="relative z-10 flex items-center justify-center pointer-events-none" style={{ height: '100vh' }}>

        {/* Modal card */}
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full animate-scaleIn flex flex-col overflow-hidden pointer-events-auto"
          style={{ maxWidth: '520px', maxHeight: 'calc(100vh - 48px)', margin: '0 16px' }}
          onClick={(e) => e.stopPropagation()}
        >

          {/* HEADER */}
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

          {/* Draft info banner */}
          {isDraftEdit && (
            <div className="flex-shrink-0 flex items-center gap-2 bg-orange-50 border-b border-orange-100 px-5 py-2.5">
              <BookOpen className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <p className="text-xs text-orange-600 font-medium">
                This client is saved as a draft. Complete all required fields and click <strong>Save as Client</strong> to finalise.
              </p>
            </div>
          )}

          {/* SCROLLABLE BODY */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <form onSubmit={handleSubmit} id="create-client-form">
              <div className="px-5 pt-4 pb-2 space-y-4">

                {error && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-600 px-3.5 py-2.5 rounded-xl">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="text-xs font-medium leading-relaxed">{error}</span>
                  </div>
                )}

                {/* Personal Info */}
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

                {/* Contact */}
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

                {/* Address */}
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

                {/* Business */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Business (Optional)</p>
                  <InputField icon={FileText} label="GST Number" name="gstNumber"
                    value={formData.gstNumber} onChange={handleInputChange}
                    placeholder="22AAAAA0000A1Z5" disabled={isAnySubmitting} />
                </div>

              </div>
            </form>
          </div>

          {/* FOOTER */}
          <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 bg-white rounded-b-2xl">
            <div className="flex items-center gap-2.5">
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

  const [clients, setClients]           = useState([]);
  const [stats, setStats]               = useState({ total: 0, draft: 0, star: 0, newlyAdded: 0 });
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  const [currentPage, setCurrentPage]   = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [totalCount, setTotalCount]     = useState(0);
  const [pageSize]                      = useState(10);
  const [searchTerm, setSearchTerm]     = useState('');

  // ── Sorting state ────────────────────────────────────────────────────────
  const [sortBy, setSortBy]             = useState('');
  const [sortOrder, setSortOrder]       = useState('asc');

  const [showCreateModal, setShowCreateModal]     = useState(false);
  const [showSuccessModal, setShowSuccessModal]   = useState(false);
  const [showFilterModal, setShowFilterModal]     = useState(false);
  const [createdClient, setCreatedClient]         = useState(null);
  const [lastCreatedIsDraft, setLastCreatedIsDraft] = useState(false);
  const [draftClientToEdit, setDraftClientToEdit] = useState(null);

  // ── Filter state — matches only the fields the API supports ─────────────
  const [activeFilters, setActiveFilters] = useState({
    first_name:  '',
    last_name:   '',
    email:       '',
    gst_number:  '',
  });

  // ── Delete / Undo state ─────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal]   = useState(false);
  const [clientToDelete, setClientToDelete]     = useState(null);
  const [isDeleting, setIsDeleting]             = useState(false);
  const [isUndoing, setIsUndoing]               = useState(false);
  const [toast, setToast]                       = useState(null);

  const requestInProgress = useRef(false);
  const lastFetchParams   = useRef(null);
  // Debounce timer for the search bar
  const searchDebounceRef = useRef(null);

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  const fetchClients = useCallback(async () => {
    const currentParams = JSON.stringify({ currentPage, pageSize, searchTerm, activeFilters, sortBy, sortOrder });
    const trimmedSearch = searchTerm.trim();
    const hasActiveFilters = Object.values(activeFilters).some((value) => String(value || '').trim() !== '');
    const useLocalSearchAndFilter = Boolean(trimmedSearch || hasActiveFilters);

    if (requestInProgress.current && lastFetchParams.current === currentParams) {
      logger.log('⏭️ Skipping duplicate request');
      return;
    }

    requestInProgress.current = true;
    lastFetchParams.current   = currentParams;

    try {
      setLoading(true);
      setError(null);

      const params = {
        page:      useLocalSearchAndFilter ? 1 : currentPage,
        page_size: useLocalSearchAndFilter ? 1000 : pageSize,
      };

      if (sortBy) {
        params.sort_by    = sortBy;
        params.sort_order = sortOrder;
      }

      if (activeFilters.first_name?.trim()) params.first_name = activeFilters.first_name.trim();
      if (activeFilters.last_name?.trim())  params.last_name  = activeFilters.last_name.trim();
      if (activeFilters.email?.trim())      params.email      = activeFilters.email.trim().toLowerCase();
      if (activeFilters.gst_number?.trim()) params.gst_number = activeFilters.gst_number.trim();

      logger.log('📡 Fetching clients...', params);

      const response = await getClients(params);
      logger.log('📦 Clients Response:', response);

      if (response.status === 'success' && response.data) {
        const apiData = response.data;
        const clientResults = Array.isArray(apiData.results) ? apiData.results : [];

        if (useLocalSearchAndFilter) {
          const filteredResults = clientResults.filter((client) =>
            clientMatchesText(client, trimmedSearch) && clientMatchesFilters(client, activeFilters)
          );
          const calculatedTotalPages = Math.max(1, Math.ceil(filteredResults.length / pageSize));
          const startIndex = (currentPage - 1) * pageSize;

          setClients(filteredResults.slice(startIndex, startIndex + pageSize));
          setTotalPages(calculatedTotalPages);
          setTotalCount(filteredResults.length);
        } else {
          setClients(clientResults);
          setTotalPages(apiData.total_pages || 1);
          setTotalCount(apiData.total_count || clientResults.length);
        }

        const resolveCount = (...fields) => {
          for (const f of fields) {
            if (typeof apiData[f] === 'number') return apiData[f];
          }
          return 0;
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
  }, [currentPage, pageSize, searchTerm, activeFilters, sortBy, sortOrder]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  const handleCreateSuccess = (clientData, isDraft = false) => {
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
    if (lastCreatedIsDraft) {
      setDraftClientToEdit(null);
      return;
    }
    const id = createdClient?.id
      ?? createdClient?.data?.id
      ?? createdClient?.data?.data?.id;
    console.log('[Clients] Navigating to client ID:', id);
    if (id) {
      navigate(`/clients/${id}`);
    } else {
      logger.error('No client ID found in created client data');
    }
  };

  /**
   * Search handler — debounced 400ms so we don't fire a request on every
   * keystroke. The actual API call uses get_all_client_by_name.
   */
  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
    setCurrentPage(1);

    // Invalidate cache so the debounced fetchClients actually fires
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      lastFetchParams.current = null;
    }, 400);
  }, []);

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
   * Sort handler — toggles direction if the same column is clicked again.
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
   * Row click handler.
   * Draft (status 1)   → open create modal pre-filled.
   * Active (status 2+) → navigate to profile page.
   * Deactive (status 3)→ no action.
   */
  const handleRowClick = (client) => {
    logger.log('Client clicked:', client);
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
    lastFetchParams.current = null;
    fetchClients();
  };

  // ── Delete Client ────────────────────────────────────────────────────────
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

  // ── Undo (Restore) Client ────────────────────────────────────────────────
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
        showFilter={Object.values(activeFilters).some((value) => String(value || '').trim() !== '')}
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

      {/* Confirm Delete Modal (Admin only — gated in ActionsMenu) */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => { if (!isDeleting) { setShowDeleteModal(false); setClientToDelete(null); } }}
        onConfirm={handleConfirmDelete}
        clientName={clientToDelete ? `${clientToDelete.first_name || ''} ${clientToDelete.last_name || ''}`.trim() : ''}
        isLoading={isDeleting}
      />

      {/* Action Toast */}
      {toast && (
        <ActionToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <style>{`
        html { overflow-y: scroll; scrollbar-gutter: stable; }

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

        .animate-fadeIn   { animation: fadeIn   0.2s ease-out; }
        .animate-scaleIn  { animation: scaleIn  0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
        .animate-slideUp   { animation: slideUp   0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </>
  );
}
