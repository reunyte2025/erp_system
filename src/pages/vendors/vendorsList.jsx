import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Trash2, Phone, Mail, MapPin, FileText, Loader2, AlertCircle,
  CheckCircle, X, Calendar, Filter as FilterIcon, BookOpen, Settings, Search, ChevronDown
} from 'lucide-react';
import { getVendors, createVendor, deleteVendor, getVendorStats } from '../../services/vendors';
import vendorConfig, { getColumns, VENDOR_CATEGORY_OPTIONS } from './vendors.config';
import { useRole } from '../../components/RoleContext';
import DynamicList from '../../components/DynamicList/DynamicList';

/**
 * ============================================================================
 * VENDORS COMPONENT - WITH MODAL AND DELETE FUNCTIONALITY
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

// ✅ FIX: Removed the unnecessary three-dots button from the top-right corner
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

const FilterModal = ({ isOpen, onClose, onApply, currentFilters }) => {
  const [filters, setFilters] = useState(() => currentFilters || {
    dateFrom: '',
    dateTo: '',
    vendorName: '',
    city: '',
    category: '',
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
      vendorName: '',
      city: '',
      category: '',
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
        className="absolute inset-0 bg-black/50"
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

            {/* Vendor Name */}
            <div>
              <label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                Vendor Name
              </label>
              <div className="relative">
                <Building2 className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="vendorName"
                  value={filters.vendorName}
                  onChange={handleInputChange}
                  placeholder="Enter vendor name"
                  className="w-full pl-8 sm:pl-9 pr-2 sm:pr-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* City */}
            <div>
              <label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                City
              </label>
              <div className="relative">
                <MapPin className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="city"
                  value={filters.city}
                  onChange={handleInputChange}
                  placeholder="Enter city"
                  className="w-full pl-8 sm:pl-9 pr-2 sm:pr-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                Category
              </label>
              <select
                name="category"
                value={filters.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              >
                <option value="">All Categories</option>
                {VENDOR_CATEGORY_OPTIONS.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
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

const SuccessModal = ({ isOpen, onClose, onProceed }) => {
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
        className="absolute inset-0 bg-black/50"
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
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-teal-600 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-teal-600" />
          </div>

          <h2 className="text-xl font-bold mb-1 text-teal-600">
            Successfully Created
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            New vendor has been added successfully.
          </p>

          <div className="space-y-2">
            <button
              onClick={onProceed}
              className="w-full text-white py-2.5 px-6 rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-700 active:bg-teal-800 transition-all duration-150 touch-manipulation"
            >
              Back to Vendor List
            </button>
            <button
              onClick={onClose}
              className="w-full border-2 border-teal-600 text-teal-600 py-2.5 px-6 rounded-xl text-sm font-semibold hover:bg-teal-50 transition-all duration-150 touch-manipulation"
            >
              Add Another Vendor
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

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, vendorName, isLoading }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div
        className="absolute inset-0 bg-black/50"
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
          <h2 className="text-xl font-bold text-gray-800 mb-1">Delete Vendor?</h2>
          <p className="text-sm text-gray-500 mb-6">
            <span className="font-semibold text-gray-700">{vendorName}</span> will be permanently deleted.
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
// MULTI-SELECT FIELD COMPONENT FOR CATEGORIES
// ============================================================================

const MultiSelectField = ({
  label,
  name,
  value = [],
  onChange,
  options = [],
  required = false,
  disabled = false,
  placeholder = 'Select categories',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = (optValue) => {
    const numVal = Number(optValue);
    const next = value.includes(numVal)
      ? value.filter(v => v !== numVal)
      : [...value, numVal];
    onChange({ target: { name, value: next } });
  };

  const selectedLabels = options
    .filter(o => value.includes(Number(o.value)))
    .map(o => o.label);

  const triggerText = selectedLabels.length === 0
    ? placeholder
    : selectedLabels.length === 1
      ? selectedLabels[0]
      : `${selectedLabels.length} categories selected`;

  return (
    <div ref={ref} className="relative w-full">
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <button
        type="button"
        onClick={() => !disabled && setIsOpen(p => !p)}
        disabled={disabled}
        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-left flex items-center justify-between transition-all duration-200 ${
          disabled
            ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
            : 'bg-white border-gray-300 hover:border-teal-400'
        }`}
      >
        <span className={`flex items-center gap-2.5 truncate ${selectedLabels.length > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
          <Settings className={`w-4 h-4 flex-shrink-0 ${selectedLabels.length > 0 ? 'text-teal-600' : 'text-gray-400'}`} />
          {triggerText}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-all duration-300 flex-shrink-0 ${isOpen ? 'rotate-180 text-teal-600' : ''}`} />
      </button>

      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedLabels.map((lbl, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-xs font-medium">
              {lbl}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => {
                    const opt = options.find(o => o.label === lbl);
                    if (opt) handleToggle(opt.value);
                  }}
                  className="w-3.5 h-3.5 rounded-full hover:bg-teal-200 flex items-center justify-center ml-0.5"
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
          className="absolute left-0 top-full mt-2 w-full bg-white rounded-lg shadow-2xl border border-gray-200 z-[9999] overflow-hidden"
          style={{ animation: 'dropdownOpen 0.2s cubic-bezier(0.16,1,0.3,1) forwards' }}
        >
          <div className="p-3 border-b border-gray-200 bg-white sticky top-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full pl-10 pr-4 py-2 border border-teal-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm placeholder-gray-400 bg-white"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-gray-400">No options found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((opt) => {
                  const isSelected = value.includes(Number(opt.value));
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleToggle(opt.value)}
                      className={`w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 transition-all duration-150 ${
                        isSelected ? 'bg-teal-50 text-teal-800 font-semibold' : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                        isSelected ? 'bg-teal-600 border-teal-600' : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className="flex-1 leading-tight">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400">
              {value.length === 0 ? 'Select one or more categories' : `${value.length} selected`}
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dropdownOpen {
          from { opacity: 0; transform: scale(0.95) translateY(-8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        .overflow-y-auto::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

// ============================================================================
// CREATE VENDOR MODAL COMPONENT
// ============================================================================

const CreateVendorModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    website: '',
    gstNumber: '',
    vendorCategory: [],
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        website: '',
        gstNumber: '',
        vendorCategory: [],
      });
      setError('');
    }
  }, [isOpen]);

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

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  }, [error]);

  const validateForm = () => {
    const required = ['name', 'contactPerson', 'email', 'phone', 'address', 'city', 'state', 'pincode'];
    const missing = required.filter(field => !formData[field].toString().trim());

    if (!formData.vendorCategory || formData.vendorCategory.length === 0) {
      missing.push('vendorCategory');
    }
    
    if (missing.length > 0) {
      const fieldNames = {
        name: 'Vendor Name',
        contactPerson: 'Contact Person',
        email: 'Email',
        phone: 'Phone',
        address: 'Address',
        city: 'City',
        state: 'State',
        pincode: 'Pincode',
        vendorCategory: 'Vendor Category',
      };
      setError(`Please fill in: ${missing.map(f => fieldNames[f]).join(', ')}`);
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (formData.phone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid phone number (min 10 digits)');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        name:              formData.name.trim(),
        contact_person:    formData.contactPerson.trim(),
        email:             formData.email.trim().toLowerCase(),
        phone:             formData.phone.trim(),
        address:           formData.address.trim(),
        state:             formData.state.trim(),
        city:              formData.city.trim(),
        pincode:           formData.pincode.trim(),
        website:           formData.website?.trim() || '',
        gst_number:        formData.gstNumber?.trim() || '',
        status:            1,
        vendor_category:   formData.vendorCategory.map(Number),
      };

      logger.log('Creating vendor:', payload);
      const response = await createVendor(payload);
      
      setFormData({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        website: '',
        gstNumber: '',
        vendorCategory: [],
      });
      
      onSuccess(response);
    } catch (err) {
      logger.error('Error creating vendor:', err);
      const d = err.response?.data;
      const msg = d?.message
        || d?.error
        || d?.detail
        || err.message
        || 'Failed to create vendor';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] animate-fadeIn"
      style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed', overflow: 'hidden' }}
    >
      <div
        className="absolute inset-0 bg-black/50"
        style={{ width: '100vw', height: '100vh', top: 0, left: 0, position: 'fixed', overflow: 'hidden' }}
        onClick={onClose}
      />

      <div className="relative z-10 flex items-center justify-center" style={{ width: '100vw', height: '100vh' }}>
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full animate-scaleIn flex flex-col overflow-hidden"
          style={{ maxWidth: '520px', maxHeight: 'calc(100vh - 48px)', margin: '0 16px' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex-shrink-0 text-white px-5 py-4 flex items-center justify-between rounded-t-2xl bg-teal-600">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-white font-semibold text-base leading-tight">
                  Create New Vendor
                </h2>
                <p className="text-xs mt-0.5 text-teal-100">
                  Fill in the details below
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            <form onSubmit={handleSubmit} id="create-vendor-form">
              <div className="px-5 pt-4 pb-2 space-y-4">
                {error && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-600 px-3.5 py-2.5 rounded-xl">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="text-xs font-medium leading-relaxed">{error}</span>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Vendor Info</p>
                  <div className="grid grid-cols-1 gap-3">
                    <InputField icon={Building2} label="Vendor Name" name="name"
                      value={formData.name} onChange={handleInputChange}
                      placeholder="ABC Plumbing Services" required disabled={submitting} />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Contact</p>
                  <div className="space-y-3">
                    <InputField icon={Building2} label="Contact Person" name="contactPerson"
                      value={formData.contactPerson} onChange={handleInputChange}
                      placeholder="John Doe" required disabled={submitting} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <InputField icon={Phone} label="Phone Number" name="phone"
                        value={formData.phone} onChange={handleInputChange}
                        type="tel" placeholder="+91 98765 43210" required disabled={submitting} />
                      <InputField icon={Mail} label="Email Address" name="email"
                        value={formData.email} onChange={handleInputChange}
                        type="email" placeholder="vendor@example.com" required disabled={submitting} />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Address</p>
                  <div className="space-y-3">
                    <InputField icon={MapPin} label="Street Address" name="address"
                      value={formData.address} onChange={handleInputChange}
                      placeholder="123 Main Street" required disabled={submitting} />
                    <div className="grid grid-cols-3 gap-2.5">
                      <InputField icon={MapPin} label="City" name="city"
                        value={formData.city} onChange={handleInputChange}
                        placeholder="Mumbai" required disabled={submitting} />
                      <InputField icon={MapPin} label="State" name="state"
                        value={formData.state} onChange={handleInputChange}
                        placeholder="MH" required disabled={submitting} />
                      <InputField icon={FileText} label="Pincode" name="pincode"
                        value={formData.pincode} onChange={handleInputChange}
                        placeholder="400001" required disabled={submitting} />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Category</p>
                  <MultiSelectField
                    label="Vendor Category"
                    name="vendorCategory"
                    value={formData.vendorCategory}
                    onChange={handleInputChange}
                    options={VENDOR_CATEGORY_OPTIONS}
                    required
                    disabled={submitting}
                    placeholder="Select one or more categories"
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Additional Info (Optional)</p>
                  <div className="space-y-3">
                    <InputField icon={Building2} label="Website" name="website"
                      value={formData.website} onChange={handleInputChange}
                      placeholder="https://example.com" disabled={submitting} />
                    <InputField icon={FileText} label="GST Number" name="gstNumber"
                      value={formData.gstNumber} onChange={handleInputChange}
                      placeholder="22AAAAA0000A1Z5" disabled={submitting} />
                  </div>
                </div>
              </div>
            </form>
          </div>

          <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 bg-white rounded-b-2xl">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200
                           hover:bg-gray-50 active:bg-gray-100 transition-all duration-150
                           disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                Cancel
              </button>

              <button
                type="submit"
                form="create-vendor-form"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold
                           bg-teal-600 text-white shadow-sm shadow-teal-600/30
                           hover:bg-teal-700 active:bg-teal-800 transition-all duration-150
                           disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Creating...</>
                ) : (
                  <>
                    <Building2 className="w-4 h-4" />
                    Create Vendor
                  </>
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
// MAIN VENDORS COMPONENT
// ============================================================================

export default function VendorsList() {
  const navigate = useNavigate();
  const { isAdmin, isManager } = useRole();

  const isAdminOrManager = isAdmin || isManager;
  const columns = getColumns(isAdminOrManager);
  
  const [vendors, setVendors] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, blacklisted: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});
  const [toast, setToast] = useState(null);

  const lastFetchParams = useRef(null);

  const fetchVendors = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = {
        page: params.page || currentPage,
        page_size: pageSize,
        search: params.search || searchTerm,
        ordering: params.ordering || (sortOrder === 'desc' ? `-${sortBy}` : sortBy),
        ...params,
      };

      if (isAdminOrManager) {
        queryParams.show_inactive = true;
        queryParams.include_deleted = true;
        queryParams.is_active = '';
      }

      logger.log('Fetching vendors with params:', queryParams);

      const response = await getVendors(queryParams);

      if (response.status === 'success' && response.data) {
        setVendors(response.data.results || []);
        
        const totalPages = Math.ceil((response.data.count || 0) / pageSize);
        setTotalPages(totalPages);
        setTotalCount(response.data.count || 0);
      } else {
        setError('Failed to load vendors');
      }
    } catch (err) {
      logger.error('Error fetching vendors:', err);
      setError(err.message || 'Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, sortBy, sortOrder, isAdminOrManager]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await getVendorStats();
      if (response.status === 'success' && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      logger.error('Error fetching vendor stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
    fetchStats();
  }, []);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    lastFetchParams.current = null;
    fetchVendors({ page: newPage });
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    setCurrentPage(1);
    lastFetchParams.current = null;
    fetchVendors({ search: term, page: 1 });
  };

  const handleSort = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    setCurrentPage(1);
    lastFetchParams.current = null;
    fetchVendors({ ordering: order === 'desc' ? `-${field}` : field, page: 1 });
  };

  const handleFilterToggle = () => {
    setShowFilterModal(true);
  };

  const handleApplyFilters = (filters) => {
    setActiveFilters(filters);
    setCurrentPage(1);
    lastFetchParams.current = null;
    
    const queryParams = { page: 1 };
    if (filters.vendorName) queryParams.search = filters.vendorName;
    if (filters.city) queryParams.city = filters.city;
    if (filters.category) queryParams.vendor_category = filters.category;
    
    fetchVendors(queryParams);
  };

  const handleDeleteVendor = (vendor) => {
    setVendorToDelete(vendor);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!vendorToDelete) return;
    setIsDeleting(true);
    try {
      await deleteVendor(vendorToDelete.id);
      setShowDeleteModal(false);
      setVendorToDelete(null);
      lastFetchParams.current = null;
      fetchVendors();
      fetchStats();
      setToast({ message: 'Vendor deleted successfully', type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Failed to delete vendor', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRowClick = (vendor) => {
    if (vendor?.is_active === false) return;
    if (vendor?.id) {
      navigate(`/vendors/${vendor.id}`);
    }
  };

  const handleCreateSuccess = (response) => {
    logger.log('Vendor created:', response);
    setShowCreateModal(false);
    setShowSuccessModal(true);
    lastFetchParams.current = null;
    fetchVendors();
    fetchStats();
  };

  const handleProceedToVendorList = () => {
    setShowSuccessModal(false);
  };

  const renderStatsCards = () => (
    <>
      <StatCard
        icon={<Building2 className="w-5 h-5" />}
        count={stats.total || 0}
        label="Total Vendors"
        subLabel={`${stats.total || 0} total vendors`}
        bgColor="bg-teal-500"
        textColor="text-teal-500"
      />
      <StatCard
        icon={<Building2 className="w-5 h-5" />}
        count={stats.active || 0}
        label="Active"
        subLabel={`${stats.active || 0} active vendors`}
        bgColor="bg-green-500"
        textColor="text-green-500"
      />
      <StatCard
        icon={<Building2 className="w-5 h-5" />}
        count={stats.inactive || 0}
        label="Inactive"
        subLabel={`${stats.inactive || 0} inactive vendors`}
        bgColor="bg-yellow-500"
        textColor="text-yellow-500"
      />
      <StatCard
        icon={<Building2 className="w-5 h-5" />}
        count={stats.blacklisted || 0}
        label="Blacklisted"
        subLabel={`${stats.blacklisted || 0} blacklisted`}
        bgColor="bg-red-500"
        textColor="text-red-500"
      />
    </>
  );

  return (
    <>
      <DynamicList
        config={{ ...vendorConfig, columns }}
        data={vendors}
        loading={loading}
        error={error}
        emptyMessage={vendorConfig.emptyMessage}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        onAdd={() => setShowCreateModal(true)}
        onSearch={handleSearch}
        onFilterToggle={handleFilterToggle}
        onRetry={() => fetchVendors()}
        onSort={handleSort}
        sortBy={sortBy}
        sortOrder={sortOrder}
        searchTerm={searchTerm}
        showFilter={showFilterModal}
        statsCards={renderStatsCards()}
        onRowClick={handleRowClick}
        actionHandlers={isAdminOrManager ? { onDeleteVendor: handleDeleteVendor } : undefined}
      />

      <CreateVendorModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onProceed={handleProceedToVendorList}
      />

      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        currentFilters={activeFilters}
      />

      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => { if (!isDeleting) { setShowDeleteModal(false); setVendorToDelete(null); } }}
        onConfirm={handleConfirmDelete}
        vendorName={vendorToDelete ? vendorToDelete.name : ''}
        isLoading={isDeleting}
      />

      {toast && (
        <ActionToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <style>{`
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
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .animate-fadeIn  { animation: fadeIn  0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
        .animate-slideUp   { animation: slideUp   0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </>
  );
}