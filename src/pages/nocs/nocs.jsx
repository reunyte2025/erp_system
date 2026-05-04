import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck, Building2, Tag, Plus, Trash2, Edit2,
  X, Loader2, AlertCircle, CheckCircle, FileText, User,
  Clock, ChevronDown, Search, MapPin, Phone, Briefcase,
} from 'lucide-react';
import { useRole } from '../../components/RoleContext';
import DynamicList from '../../components/DynamicList/DynamicList';
import {
  nocListConfig,
  authorityListConfig,
  nocTypeListConfig,
  getNocColumns,
  getAuthorityColumns,
} from './noc.config';
import {
  getAllNocs,
  createNoc,
  updateNoc,
  deleteNoc,
  approveNoc,
  rejectNoc,
  reapplyNoc,
  submitNoc,
  getAllAuthorities,
  createAuthority,
  updateAuthority,
  deleteAuthority,
  getAllNocTypes,
  createNocType,
  updateNocType,
  deleteNocType,
} from '../../services/nocs';
import { getClients, getClientProjects } from '../../services/clients';

const PAGE_SIZE = 10;

const EMPTY_NOC_FILTERS = {
  nocId: '',
  clientName: '',
  nocType: '',
  authority: '',
  status: '',
};

const normalizeNocValue = (value) => String(value || '').trim().toLowerCase();

const nocMatchesSearch = (noc, value) => {
  const needle = normalizeNocValue(value);
  if (!needle) return true;

  const haystacks = [
    noc.noc_id,
    noc.title,
    noc.client_name,
    noc.applicant_name,
    noc.noc_type_name,
    noc.authority_name,
    noc.status_display,
    noc.address,
    noc.city,
    noc.state,
    noc.pincode,
  ];

  return haystacks.some((field) => normalizeNocValue(field).includes(needle));
};

const nocMatchesFilters = (noc, filters) => {
  if (filters?.nocId && !normalizeNocValue(noc.noc_id || noc.title).includes(normalizeNocValue(filters.nocId))) return false;
  if (filters?.clientName) {
    const clientHaystack = [noc.client_name, noc.applicant_name].map(normalizeNocValue).join(' ');
    if (!clientHaystack.includes(normalizeNocValue(filters.clientName))) return false;
  }
  if (filters?.nocType && !normalizeNocValue(noc.noc_type_name).includes(normalizeNocValue(filters.nocType))) return false;
  if (filters?.authority && !normalizeNocValue(noc.authority_name).includes(normalizeNocValue(filters.authority))) return false;
  if (filters?.status && !normalizeNocValue(noc.status_display || noc.status).includes(normalizeNocValue(filters.status))) return false;
  return true;
};

// ============================================================================
// APPLICANT TYPES — matches backend enum exactly
// BUILDER=1, OWNER=2, CONTRACTOR=3
// ============================================================================

const APPLICANT_TYPES = [
  { value: 1, label: 'Builder',    description: 'Builder or developer of the property'   },
  { value: 2, label: 'Owner',      description: 'Owner of the property or land'          },
  { value: 3, label: 'Contractor', description: 'Licensed contractor handling the work'  },
];

// ============================================================================
// TOAST
// ============================================================================

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 left-1/2 z-[99999]" style={{ transform: 'translateX(-50%)' }}>
      <div
        className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-sm font-semibold
          ${type === 'success' ? 'bg-teal-600' : 'bg-red-500'}`}
        style={{ animation: 'nocSlideUp .3s cubic-bezier(.16,1,.3,1)' }}
      >
        {type === 'success'
          ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
          : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
        {message}
      </div>
    </div>
  );
};

// ============================================================================
// CONFIRM DELETE MODAL
// ============================================================================

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, title, description, isLoading }) => {
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
          onClick={e => e.stopPropagation()}
        >
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">{title}</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">{description}</p>
          <div className="flex gap-3">
            <button
              onClick={onClose} disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm} disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Deleting…</>
                : 'Yes, Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SHARED MODAL SHELL
// ============================================================================

const ACCENT = {
  teal:   { header: 'bg-teal-700',   subtitle: 'text-teal-200',   btn: 'bg-teal-600 hover:bg-teal-700'     },
  orange: { header: 'bg-orange-700', subtitle: 'text-orange-200', btn: 'bg-orange-600 hover:bg-orange-700' },
  blue:   { header: 'bg-blue-700',   subtitle: 'text-blue-200',   btn: 'bg-blue-600 hover:bg-blue-700'     },
};

const ModalShell = ({
  isOpen, onClose, title, subtitle, accentKey = 'teal',
  icon: Icon, formId, submitting, submitLabel, children, wide = false,
}) => {
  if (!isOpen) return null;
  const a = ACCENT[accentKey];

  return (
    <div className="fixed inset-0 z-[9999] animate-fadeIn pointer-events-none" style={{ position: 'fixed' }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto"
        style={{ position: 'fixed', width: '100vw', height: '100vh' }}
        onClick={!submitting ? onClose : undefined}
      />
      {/* Centering container */}
      <div className="relative z-10 flex items-center justify-center p-4 pointer-events-none" style={{ height: '100vh' }}>
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full flex flex-col animate-scaleIn pointer-events-auto"
          style={{
            maxWidth: wide ? 640 : 488,
            maxHeight: 'calc(100vh - 40px)',
            overflow: 'hidden',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex-shrink-0 ${a.header} px-5 py-4 flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                {Icon && <Icon className="w-4 h-4 text-white" />}
              </div>
              <div>
                <p className="text-white font-semibold text-base leading-tight">{title}</p>
                <p className={`${a.subtitle} text-xs mt-0.5`}>{subtitle}</p>
              </div>
            </div>
            <button
              onClick={onClose} disabled={submitting}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Scrollable body */}
          <div
            className="flex-1 p-5 bg-white"
            style={{ overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {children}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-5 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
            <button
              type="button" onClick={onClose} disabled={submitting}
              className="px-4 py-2.5 text-slate-600 hover:bg-gray-100 rounded-xl transition-colors text-sm font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit" form={formId} disabled={submitting}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold ${a.btn} text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
                : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SHARED FORM PRIMITIVES
// ============================================================================

const Field = ({ icon: Icon, label, name, value, onChange, type = 'text', placeholder, required, disabled, as }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
      {label} {required && <span className="text-red-500 normal-case font-normal">*</span>}
    </label>
    <div className="relative">
      {Icon && <div className="absolute left-3 top-[11px] pointer-events-none"><Icon className="w-4 h-4 text-gray-400" /></div>}
      {as === 'textarea' ? (
        <textarea
          name={name} value={value} onChange={onChange} placeholder={placeholder}
          disabled={disabled} rows={3}
          className={`w-full ${Icon ? 'pl-10' : 'pl-3'} pr-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white resize-none
            hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all
            disabled:bg-gray-50 disabled:text-gray-400`}
        />
      ) : (
        <input
          type={type} name={name} value={value} onChange={onChange}
          placeholder={placeholder} disabled={disabled}
          className={`w-full ${Icon ? 'pl-10' : 'pl-3'} pr-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white
            hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all
            disabled:bg-gray-50 disabled:text-gray-400`}
        />
      )}
    </div>
  </div>
);

// Simple native select — used for NOC Type and Authority (usually short lists)
const SelectField = ({ icon: Icon, label, name, value, onChange, disabled, required, options = [], placeholder }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
      {label} {required && <span className="text-red-500 normal-case font-normal">*</span>}
    </label>
    <div className="relative">
      {Icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><Icon className="w-4 h-4 text-gray-400" /></div>}
      <select
        name={name} value={value} onChange={onChange} disabled={disabled}
        className={`w-full ${Icon ? 'pl-10' : 'pl-3'} pr-8 py-2.5 border border-gray-300 rounded-lg text-sm bg-white appearance-none
          hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all
          disabled:bg-gray-50 disabled:text-gray-400`}
      >
        <option value="">{placeholder || `Select ${label}…`}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
        <ChevronDown className="w-4 h-4" />
      </div>
    </div>
  </div>
);

const ErrorBanner = ({ message }) =>
  message ? (
    <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3.5 mb-4">
      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-red-600">{message}</p>
    </div>
  ) : null;

const NocFilterModal = ({ isOpen, onClose, onApply, currentFilters }) => {
  const [filters, setFilters] = useState(() => currentFilters || EMPTY_NOC_FILTERS);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClear = () => setFilters(EMPTY_NOC_FILTERS);
  const handleApply = () => { onApply(filters); onClose(); };

  if (!isOpen) return null;

  const hasActiveFilters = Object.values(filters).some((value) => String(value || '').trim() !== '');

  return (
    <div className="fixed inset-0 z-[9999] animate-fadeIn pointer-events-none" style={{ position: 'fixed' }}>
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto"
        style={{ position: 'fixed', width: '100vw', height: '100vh' }}
        onClick={onClose}
      />
      <div className="relative z-10 flex items-center justify-center p-4 pointer-events-none" style={{ height: '100vh' }}>
        <div
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col animate-scaleIn pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-teal-700 text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              <h2 className="text-base font-semibold">Filter NOCs</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-white" />
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

            <Field icon={ClipboardCheck} label="NOC ID" name="nocId" value={filters.nocId} onChange={handleInputChange} placeholder="Enter NOC ID" />
            <Field icon={User} label="Client Name" name="clientName" value={filters.clientName} onChange={handleInputChange} placeholder="Enter client name" />
            <Field icon={Tag} label="NOC Type" name="nocType" value={filters.nocType} onChange={handleInputChange} placeholder="Enter NOC type" />
            <Field icon={Building2} label="Authority" name="authority" value={filters.authority} onChange={handleInputChange} placeholder="Enter authority" />
            <Field icon={Clock} label="Status" name="status" value={filters.status} onChange={handleInputChange} placeholder="Enter status" />
          </div>

          <div className="px-5 pb-5">
            <button
              onClick={handleApply}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 px-6 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm"
            >
              <Tag className="w-4 h-4" />
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SEARCHABLE DROPDOWN — for Clients & Projects (potentially large lists)
// ============================================================================

/**
 * A custom searchable dropdown with avatar/icon support.
 * Replaces the native <select> for Client and Project pickers.
 */
const SearchableDropdown = ({
  label, required, disabled, placeholder,
  options = [],          // [{ value, label, sublabel, avatarChar, color }]
  value,                 // currently selected value (string)
  onChange,              // (value: string) => void
  icon: Icon,
  loading = false,
  emptyMessage = 'No results found',
}) => {
  const [open, setOpen]       = useState(false);
  const [search, setSearch]   = useState('');
  const containerRef          = useRef(null);
  const searchRef             = useRef(null);

  const selected = options.find(o => String(o.value) === String(value));

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = search.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        (o.sublabel && o.sublabel.toLowerCase().includes(search.toLowerCase()))
      )
    : options;

  const AVATAR_COLORS = [
    'bg-teal-500', 'bg-orange-500', 'bg-blue-500',
    'bg-purple-500', 'bg-emerald-500', 'bg-rose-500',
  ];

  const handleSelect = (opt) => {
    onChange(String(opt.value));
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
        {label} {required && <span className="text-red-500 normal-case font-normal">*</span>}
      </label>

      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 border rounded-lg text-sm text-left transition-all
          ${open
            ? 'border-teal-500 ring-2 ring-teal-500/20'
            : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white cursor-pointer'}
        `}
      >
        {/* Left icon */}
        {Icon && !selected && (
          <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}

        {/* Selected avatar */}
        {selected && (
          <div className={`w-6 h-6 rounded-md ${AVATAR_COLORS[(selected.colorIndex || 0) % AVATAR_COLORS.length]} flex items-center justify-center flex-shrink-0`}>
            <span className="text-white text-[10px] font-bold leading-none">
              {selected.avatarChar || selected.label.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Label */}
        <span className={`flex-1 truncate ${selected ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
          {selected ? selected.label : placeholder}
        </span>

        {/* Sublabel */}
        {selected?.sublabel && (
          <span className="text-xs text-gray-400 truncate max-w-[100px]">{selected.sublabel}</span>
        )}

        {/* Clear */}
        {selected && !disabled && (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            onKeyDown={e => e.key === 'Enter' && handleClear(e)}
            className="ml-1 text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}

        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1.5 z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
          style={{ animation: 'nocDropIn 0.15s ease-out' }}
        >
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}…`}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-52 overflow-y-auto py-1" style={{ scrollbarWidth: 'thin' }}>
            {loading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-gray-400">{emptyMessage}</p>
              </div>
            ) : (
              filtered.map((opt, idx) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors
                      ${isSelected
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <div className={`w-7 h-7 rounded-lg ${AVATAR_COLORS[(opt.colorIndex ?? idx) % AVATAR_COLORS.length]} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white text-[10px] font-bold leading-none">
                        {opt.avatarChar || opt.label.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{opt.label}</p>
                      {opt.sublabel && (
                        <p className="text-xs text-gray-400 truncate">{opt.sublabel}</p>
                      )}
                    </div>
                    {isSelected && (
                      <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// APPLICANT TYPE SELECTOR — segmented card-based picker
// ============================================================================

const ApplicantTypePicker = ({ value, onChange, disabled }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
      Applicant Type <span className="text-red-500 normal-case font-normal">*</span>
    </label>
    <div className="grid grid-cols-3 gap-2">
      {APPLICANT_TYPES.map(type => {
        const isSelected = String(value) === String(type.value);
        return (
          <button
            key={type.value}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(type.value)}
            className={`flex items-start gap-2.5 p-3 rounded-xl border-2 text-left transition-all duration-150
              ${isSelected
                ? 'border-teal-500 bg-teal-50 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all
              ${isSelected ? 'border-teal-500 bg-teal-500' : 'border-gray-300'}`}>
              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-bold leading-tight ${isSelected ? 'text-teal-700' : 'text-gray-700'}`}>
                {type.label}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{type.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

// ============================================================================
// SECTION DIVIDER — visual grouping inside the modal
// ============================================================================

const SectionLabel = ({ children }) => (
  <div className="flex items-center gap-2 mt-1 mb-3">
    <div className="flex-1 h-px bg-gray-100" />
    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1">{children}</span>
    <div className="flex-1 h-px bg-gray-100" />
  </div>
);

// ============================================================================
// NOC MODAL — fully wired Create / Edit
// ============================================================================

const BLANK_NOC = {
  client_id:      '',
  project_id:     '',
  noc_type_id:    '',
  authority_id:   '',
  applicant_name: '',
  applicant_type: 1,       // default → Individual
  company_name:   '',
  contact_info:   '',
  address:        '',
  city:           '',
  state:          '',
  pincode:        '',
};

const NocModal = ({
  isOpen, onClose, onSuccess, editData,
  nocTypes = [], authorities = [],
}) => {
  const isEdit = !!editData;

  const [form, setForm]             = useState(BLANK_NOC);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  // ── Dropdown data fetched inside modal ────────────────────────────────
  const [clients,         setClients]         = useState([]);
  const [projects,        setProjects]        = useState([]);
  const [clientsLoading,  setClientsLoading]  = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);

  // ── Fetch clients once on open ─────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    // Reset form
    setError('');
    setProjects([]); // clear stale projects from previous session
    setForm(isEdit ? {
      client_id:      String(editData.client_id   || editData.client?.id   || ''),
      project_id:     String(editData.project_id  || editData.project?.id  || ''),
      noc_type_id:    String(editData.noc_type_id || editData.noc_type?.id || ''),
      authority_id:   String(editData.authority_id|| editData.authority?.id|| ''),
      applicant_name: editData.applicant_name || '',
      applicant_type: editData.applicant_type || 1,
      company_name:   editData.company_name   || '',
      contact_info:   editData.contact_info   || '',
      address:        editData.address        || '',
      city:           editData.city           || '',
      state:          editData.state          || '',
      pincode:        editData.pincode        || '',
    } : BLANK_NOC);

    // Fetch clients only
    setClientsLoading(true);
    getClients({ page: 1, page_size: 500 })
      .then(res => {
        const results = res?.data?.results || (Array.isArray(res?.data) ? res.data : []);
        setClients(results);
      })
      .catch(() => setClients([]))
      .finally(() => setClientsLoading(false));

  }, [isOpen, isEdit, editData]);

  // ── Fetch projects whenever the selected client changes ───────────────
  // Mirrors how quotationsList.jsx calls getClientProjects(clientId) so that
  // the API filters projects server-side by client_id — no client-side guessing.
  useEffect(() => {
    if (!isOpen) return;

    const clientId = form.client_id;
    if (!clientId) {
      setProjects([]);
      return;
    }

    setProjectsLoading(true);
    setProjects([]);
    getClientProjects(clientId, { page: 1, page_size: 500 })
      .then(res => {
        // getClientProjects returns res.data which may be shaped as:
        // { results: [...] }  OR  directly an array
        const results = res?.data?.results || res?.results || (Array.isArray(res?.data) ? res.data : []);
        setProjects(results);
      })
      .catch(() => setProjects([]))
      .finally(() => setProjectsLoading(false));

  }, [isOpen, form.client_id]);

  // ── When client changes, reset project selection ─────────────────────
  const handleClientChange = (val) => {
    setForm(p => ({ ...p, client_id: val, project_id: '' }));
    if (error) setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (error) setError('');
  };

  const handleApplicantTypeChange = (val) => {
    setForm(p => ({ ...p, applicant_type: val }));
    if (error) setError('');
  };

  // ── Build searchable option arrays ─────────────────────────────────────
  const clientOptions = clients.map((c, i) => ({
    value:      String(c.id),
    label:      `${c.first_name || ''} ${c.last_name || ''}`.trim() || `Client #${c.id}`,
    sublabel:   c.email || c.phone_number || '',
    avatarChar: (c.first_name || '').charAt(0).toUpperCase(),
    colorIndex: i,
  }));

  // Projects are already filtered by client_id server-side via getClientProjects.
  // Map directly to dropdown options — no extra client-side filter needed.
  const projectOptions = projects.map((p, i) => ({
    value:      String(p.id),
    label:      p.name || `Project #${p.id}`,
    sublabel:   [p.city, p.state].filter(Boolean).join(', '),
    avatarChar: (p.name || 'P').charAt(0).toUpperCase(),
    colorIndex: i,
  }));

  const nocTypeOptions = nocTypes.map((t, i) => ({
    value:      String(t.id),
    label:      t.name || `NOC Type #${t.id}`,
    sublabel:   t.description || '',
    avatarChar: (t.name || 'N').charAt(0).toUpperCase(),
    colorIndex: i,
  }));

  const authorityOptions = authorities.map((a, i) => ({
    value:      String(a.id),
    label:      a.authority_name || a.name || `Authority #${a.id}`,
    sublabel:   a.department || '',
    avatarChar: (a.authority_name || a.name || 'A').charAt(0).toUpperCase(),
    colorIndex: i,
  }));

  // ── Validation & submit ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side guard — mirrors service validation
    if (!form.client_id)             return setError('Please select a client.');
    if (!form.project_id)            return setError('Please select a project.');
    if (!form.noc_type_id)           return setError('Please select a NOC type.');
    if (!form.authority_id)          return setError('Please select an authority.');
    if (!form.applicant_name.trim()) return setError('Applicant name is required.');
    if (!form.applicant_type)        return setError('Please select an applicant type.');

    setError('');
    setSubmitting(true);
    try {
      const response = isEdit
        ? await updateNoc(editData.id, form)
        : await createNoc(form);
      onSuccess(response, isEdit ? 'updated' : 'created');
    } catch (err) {
      setError(err.message || `Failed to ${isEdit ? 'update' : 'create'} NOC`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen} onClose={!submitting ? onClose : undefined}
      title={isEdit ? 'Edit NOC' : 'Create New NOC'}
      subtitle={isEdit ? `Editing NOC application` : 'Fill in all the required details below'}
      accentKey="teal" icon={ClipboardCheck}
      formId="noc-form" submitting={submitting}
      submitLabel={isEdit
        ? <><Edit2 className="w-4 h-4" />Save Changes</>
        : <><Plus className="w-4 h-4" />Create NOC</>}
      wide
    >
      <form id="noc-form" onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={error} />

        {/* ── Section: Client & Project ──────────────────────────────────── */}
        <SectionLabel>Client & Project</SectionLabel>

        <SearchableDropdown
          label="Client"
          required
          disabled={submitting}
          placeholder="Search and select a client…"
          icon={User}
          options={clientOptions}
          value={form.client_id}
          onChange={handleClientChange}
          loading={clientsLoading}
          emptyMessage="No clients found. Add a client first."
        />

        <SearchableDropdown
          label="Project"
          required
          disabled={submitting || !form.client_id}
          placeholder={form.client_id ? 'Search and select a project…' : 'Select a client first'}
          icon={Briefcase}
          options={projectOptions}
          value={form.project_id}
          onChange={(val) => { setForm(p => ({ ...p, project_id: val })); if (error) setError(''); }}
          loading={projectsLoading}
          emptyMessage="No projects found for this client."
        />

        {/* ── Section: NOC Classification ────────────────────────────────── */}
        <SectionLabel>NOC Classification</SectionLabel>

        <SearchableDropdown
          label="NOC Type"
          required
          disabled={submitting}
          placeholder="Search and select a NOC type…"
          icon={Tag}
          options={nocTypeOptions}
          value={form.noc_type_id}
          onChange={(val) => { setForm(p => ({ ...p, noc_type_id: val })); if (error) setError(''); }}
          emptyMessage="No NOC types found. Add a NOC type first."
        />

        <SearchableDropdown
          label="Authority"
          required
          disabled={submitting}
          placeholder="Search and select an authority…"
          icon={Building2}
          options={authorityOptions}
          value={form.authority_id}
          onChange={(val) => { setForm(p => ({ ...p, authority_id: val })); if (error) setError(''); }}
          emptyMessage="No authorities found. Add an authority first."
        />

        {/* ── Section: Applicant Details ─────────────────────────────────── */}
        <SectionLabel>Applicant Details</SectionLabel>

        <ApplicantTypePicker
          value={form.applicant_type}
          onChange={handleApplicantTypeChange}
          disabled={submitting}
        />

        <Field
          icon={User} label="Applicant Name" name="applicant_name" value={form.applicant_name}
          onChange={handleChange} placeholder="Full legal name of the applicant"
          required disabled={submitting}
        />

        <Field
          icon={Briefcase} label="Company Name" name="company_name" value={form.company_name}
          onChange={handleChange} placeholder="Registered company or firm name (if applicable)"
          disabled={submitting}
        />

        <Field
          icon={Phone} label="Contact Info" name="contact_info" value={form.contact_info}
          onChange={handleChange} placeholder="Phone number or email address"
          disabled={submitting}
        />

        {/* ── Section: Address ───────────────────────────────────────────── */}
        <SectionLabel>Address</SectionLabel>

        <Field
          icon={MapPin} label="Address" name="address" value={form.address}
          onChange={handleChange} placeholder="Street address, plot number…"
          disabled={submitting}
        />

        <div className="grid grid-cols-3 gap-3">
          <Field
            label="City" name="city" value={form.city}
            onChange={handleChange} placeholder="City"
            disabled={submitting}
          />
          <Field
            label="State" name="state" value={form.state}
            onChange={handleChange} placeholder="State"
            disabled={submitting}
          />
          <Field
            label="Pincode" name="pincode" value={form.pincode}
            onChange={handleChange} placeholder="000000"
            disabled={submitting}
          />
        </div>
      </form>
    </ModalShell>
  );
};

// ============================================================================
// AUTHORITY MODAL
// ============================================================================

const BLANK_AUTH = { authority_name: '', department: '', contact_info: '' };

const AuthorityModal = ({ isOpen, onClose, onSuccess, editData }) => {
  const isEdit = !!editData;
  const [form, setForm]             = useState(BLANK_AUTH);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setForm(isEdit ? {
      authority_name: editData.authority_name || '',
      department:     editData.department     || '',
      contact_info:   editData.contact_info   || '',
    } : BLANK_AUTH);
  }, [isOpen, isEdit, editData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.authority_name.trim()) { setError('Authority name is required.'); return; }
    setError(''); setSubmitting(true);
    try {
      const response = isEdit
        ? await updateAuthority(editData.id, form)
        : await createAuthority(form);
      onSuccess(response, isEdit ? 'updated' : 'created');
    } catch (err) {
      setError(err.message || `Failed to ${isEdit ? 'update' : 'create'} authority`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen} onClose={!submitting ? onClose : undefined}
      title={isEdit ? 'Edit Authority' : 'Add New Authority'}
      subtitle={isEdit ? `Editing "${editData?.authority_name}"` : 'Register an NOC issuing authority'}
      accentKey="orange" icon={Building2}
      formId="authority-form" submitting={submitting}
      submitLabel={isEdit ? <><Edit2 className="w-4 h-4" />Save Changes</> : <><Plus className="w-4 h-4" />Add Authority</>}
    >
      <form id="authority-form" onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={error} />
        <Field
          icon={Building2} label="Authority Name" name="authority_name" value={form.authority_name}
          onChange={handleChange} placeholder="e.g. Municipal Corporation" required disabled={submitting}
        />
        <Field
          icon={FileText} label="Department" name="department" value={form.department}
          onChange={handleChange} placeholder="e.g. Fire & Safety Department" disabled={submitting}
        />
        <Field
          icon={User} label="Contact Info" name="contact_info" value={form.contact_info}
          onChange={handleChange} placeholder="Phone, email or address…" disabled={submitting} as="textarea"
        />
      </form>
    </ModalShell>
  );
};

// ============================================================================
// NOC TYPE MODAL
// ============================================================================

const BLANK_TYPE = { name: '', description: '' };

const NocTypeModal = ({ isOpen, onClose, onSuccess, editData }) => {
  const isEdit = !!editData;
  const [form, setForm]             = useState(BLANK_TYPE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setForm(isEdit ? {
      name:        editData.name || '',
      description: editData.description || '',
    } : BLANK_TYPE);
  }, [isOpen, isEdit, editData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('NOC Type name is required.'); return; }
    setError(''); setSubmitting(true);
    try {
      const response = isEdit
        ? await updateNocType(editData.id, { name: form.name, description: form.description })
        : await createNocType({ name: form.name, description: form.description });
      onSuccess(response, isEdit ? 'updated' : 'created');
    } catch (err) {
      setError(err.message || `Failed to ${isEdit ? 'update' : 'create'} NOC type`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen} onClose={!submitting ? onClose : undefined}
      title={isEdit ? 'Edit NOC Type' : 'Add NOC Type'}
      subtitle={isEdit ? `Editing "${editData?.name}"` : 'Define a new category of NOC'}
      accentKey="blue" icon={Tag}
      formId="noc-type-form" submitting={submitting}
      submitLabel={isEdit ? <><Edit2 className="w-4 h-4" />Save Changes</> : <><Plus className="w-4 h-4" />Add Type</>}
    >
      <form id="noc-type-form" onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={error} />
        <Field
          icon={Tag} label="Type Name" name="name" value={form.name}
          onChange={handleChange} placeholder="e.g. Fire Safety NOC" required disabled={submitting}
        />
        <Field
          icon={FileText} label="Description" name="description" value={form.description}
          onChange={handleChange} placeholder="Brief description of this NOC category…" disabled={submitting} as="textarea"
        />
      </form>
    </ModalShell>
  );
};

// ============================================================================
// STAT CARD
// ============================================================================

const StatCard = ({ icon: Icon, value, label, subLabel, gradient, loading }) => (
  <div className={`relative rounded-2xl p-5 shadow-sm overflow-hidden ${gradient}`}>
    <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
    <div className="absolute -right-2 -bottom-6 w-20 h-20 rounded-full bg-white/10" />
    <div className="relative flex items-start gap-3">
      <div className="bg-white/20 rounded-full p-2.5 flex-shrink-0">
        {Icon && <Icon className="w-5 h-5 text-white" />}
      </div>
      <div className="min-w-0">
        <h3 className="text-2xl font-bold text-white leading-none mb-1">
          {loading ? '…' : value}
        </h3>
        <p className="text-white/90 font-semibold text-sm truncate">{label}</p>
        {subLabel && <p className="text-white/70 text-xs mt-0.5 truncate">{subLabel}</p>}
      </div>
    </div>
  </div>
);

// ============================================================================
// TABS CONFIG
// ============================================================================

const TABS = [
  {
    key: 'nocs',
    label: 'NOCs',
    icon: ClipboardCheck,
    activeStyle: 'border-teal-500 text-teal-600 bg-white',
    badgeActive: 'bg-teal-100 text-teal-700',
  },
  {
    key: 'authorities',
    label: 'Authorities',
    icon: Building2,
    activeStyle: 'border-orange-500 text-orange-600 bg-white',
    badgeActive: 'bg-orange-100 text-orange-700',
  },
  {
    key: 'types',
    label: 'NOC Types',
    icon: Tag,
    activeStyle: 'border-blue-500 text-blue-600 bg-white',
    badgeActive: 'bg-blue-100 text-blue-700',
  },
];

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function NocsPage() {
  const { isAdminOrManager } = useRole();
  const navigate = useNavigate();

  const VALID_TABS = ['nocs', 'authorities', 'types'];

  const getTabFromUrl = () => {
    const hash = window.location.hash.replace('#tab=', '');
    return VALID_TABS.includes(hash) ? hash : 'nocs';
  };

  const [activeTab, setActiveTab] = useState(getTabFromUrl);

  useEffect(() => {
    const onHashChange = () => setActiveTab(getTabFromUrl());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []); // eslint-disable-line

  // ── NOCs state ────────────────────────────────────────────────────────
  const [nocs,        setNocs]        = useState([]);
  const [nocsLoading, setNocsLoading] = useState(true);
  const [nocsError,   setNocsError]   = useState('');
  const [nocSearch,   setNocSearch]   = useState('');
  const [nocPage,     setNocPage]     = useState(1);
  const [nocTotal,    setNocTotal]    = useState(0);
  const [nocPages,    setNocPages]    = useState(1);
  const [nocSortBy,   setNocSortBy]   = useState('');
  const [nocSortOrd,  setNocSortOrd]  = useState('asc');
  const [nocFilters,  setNocFilters]  = useState(EMPTY_NOC_FILTERS);
  const [nocFilterOpen, setNocFilterOpen] = useState(false);

  // ── Authorities state ─────────────────────────────────────────────────
  const [authorities, setAuthorities] = useState([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError,   setAuthError]   = useState('');
  const [authSearch,  setAuthSearch]  = useState('');
  const [authPage,    setAuthPage]    = useState(1);
  const [authTotal,   setAuthTotal]   = useState(0);
  const [authPages,   setAuthPages]   = useState(1);
  const [authSortBy,  setAuthSortBy]  = useState('');
  const [authSortOrd, setAuthSortOrd] = useState('asc');

  // ── NOC Types state ───────────────────────────────────────────────────
  const [nocTypes,     setNocTypes]     = useState([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError,   setTypesError]   = useState('');
  const [typesSearch,  setTypesSearch]  = useState('');
  const [typesPage,    setTypesPage]    = useState(1);
  const [typesTotal,   setTypesTotal]   = useState(0);
  const [typesPages,   setTypesPages]   = useState(1);

  // ── Dropdown data (for NOC modal selects) ─────────────────────────────
  const [allAuthorities, setAllAuthorities] = useState([]);
  const [allNocTypes,    setAllNocTypes]    = useState([]);

  // ── Modals ────────────────────────────────────────────────────────────
  const [nocModal,    setNocModal]    = useState({ open: false, editData: null });
  const [authModal,   setAuthModal]   = useState({ open: false, editData: null });
  const [typeModal,   setTypeModal]   = useState({ open: false, editData: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, type: '', item: null });
  const [isDeleting,  setIsDeleting]  = useState(false);
  const [toast,       setToast]       = useState(null);

  // ============================================================================
  // FETCHERS
  // ============================================================================

  const fetchNocs = useCallback(async (page = 1, search = '', sortBy = '', sortOrder = 'asc') => {
    setNocsLoading(true); setNocsError('');
    try {
      const hasActiveFilters = Object.values(nocFilters).some((value) => String(value || '').trim() !== '');
      const useLocalSearchAndFilter = Boolean(search.trim() || hasActiveFilters);
      const res = await getAllNocs({
        page: useLocalSearchAndFilter ? 1 : page,
        page_size: useLocalSearchAndFilter ? 1000 : PAGE_SIZE,
        ...(sortBy && { sort_by: sortBy, sort_order: sortOrder }),
      });
      if (res.status === 'success' && res.data) {
        const results = res.data.results || (Array.isArray(res.data) ? res.data : []);
        if (useLocalSearchAndFilter) {
          const filteredResults = results.filter((noc) =>
            nocMatchesSearch(noc, search) && nocMatchesFilters(noc, nocFilters)
          );
          const startIndex = (page - 1) * PAGE_SIZE;
          setNocs(filteredResults.slice(startIndex, startIndex + PAGE_SIZE));
          setNocTotal(filteredResults.length);
          setNocPages(Math.max(1, Math.ceil(filteredResults.length / PAGE_SIZE)));
        } else {
          setNocs(results);
          const count = res.data.total_count ?? res.data.count ?? results.length;
          setNocTotal(count);
          setNocPages(Math.max(1, Math.ceil(count / PAGE_SIZE)));
        }
      } else {
        setNocsError('Failed to load NOCs');
      }
    } catch (err) {
      setNocsError(err.message || 'Failed to load NOCs');
    } finally {
      setNocsLoading(false);
    }
  }, [nocFilters]);

  const fetchAuthorities = useCallback(async (page = 1, search = '', sortBy = '', sortOrder = 'asc') => {
    setAuthLoading(true); setAuthError('');
    try {
      const res = await getAllAuthorities({
        page,
        page_size: PAGE_SIZE,
        ...(search && { search }),
        ...(sortBy && { sort_by: sortBy, sort_order: sortOrder }),
      });
      if (res.status === 'success' && res.data) {
        const results = res.data.results || (Array.isArray(res.data) ? res.data : []);
        setAuthorities(results);
        const count = res.data.total_count ?? res.data.count ?? results.length;
        setAuthTotal(count);
        setAuthPages(Math.max(1, Math.ceil(count / PAGE_SIZE)));
      } else {
        setAuthError('Failed to load authorities');
      }
    } catch (err) {
      setAuthError(err.message || 'Failed to load authorities');
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const fetchNocTypes = useCallback(async (page = 1, search = '') => {
    setTypesLoading(true); setTypesError('');
    try {
      const res = await getAllNocTypes({
        page,
        page_size: PAGE_SIZE,
        ...(search && { search }),
      });
      if (res.status === 'success' && res.data) {
        const results = res.data.results || (Array.isArray(res.data) ? res.data : []);
        setNocTypes(results);
        const count = res.data.total_count ?? res.data.count ?? results.length;
        setTypesTotal(count);
        setTypesPages(Math.max(1, Math.ceil(count / PAGE_SIZE)));
      } else {
        setTypesError('Failed to load NOC types');
      }
    } catch (err) {
      setTypesError(err.message || 'Failed to load NOC types');
    } finally {
      setTypesLoading(false);
    }
  }, []);

  /**
   * Fetches full lists for dropdown selects in the NOC modal.
   * Large page_size so selects are always fully populated.
   */
  const fetchAllForDropdowns = useCallback(async () => {
    try {
      const [aRes, tRes] = await Promise.all([
        getAllAuthorities({ page: 1, page_size: 500 }),
        getAllNocTypes({ page: 1, page_size: 500 }),
      ]);
      if (aRes.status === 'success' && aRes.data)
        setAllAuthorities(aRes.data.results || (Array.isArray(aRes.data) ? aRes.data : []));
      if (tRes.status === 'success' && tRes.data)
        setAllNocTypes(tRes.data.results || (Array.isArray(tRes.data) ? tRes.data : []));
    } catch {
      /* silently ignore — dropdowns will be empty; user can still see the error in modal */
    }
  }, []);

  // ── Initial fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    fetchNocs();
    fetchAuthorities();
    fetchNocTypes();
    fetchAllForDropdowns();
  }, [fetchNocs, fetchAuthorities, fetchNocTypes, fetchAllForDropdowns]);

  // ── Debounced search ──────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { setNocPage(1); fetchNocs(1, nocSearch, nocSortBy, nocSortOrd); }, 350);
    return () => clearTimeout(t);
  }, [nocSearch]); // eslint-disable-line

  useEffect(() => {
    const t = setTimeout(() => { setAuthPage(1); fetchAuthorities(1, authSearch, authSortBy, authSortOrd); }, 350);
    return () => clearTimeout(t);
  }, [authSearch]); // eslint-disable-line

  useEffect(() => {
    const t = setTimeout(() => { setTypesPage(1); fetchNocTypes(1, typesSearch); }, 350);
    return () => clearTimeout(t);
  }, [typesSearch]); // eslint-disable-line

  // ============================================================================
  // SORT HANDLERS
  // ============================================================================

  const handleNocSort = useCallback((field) => {
    const newOrd = nocSortBy === field ? (nocSortOrd === 'asc' ? 'desc' : 'asc') : 'asc';
    setNocSortBy(field);
    setNocSortOrd(newOrd);
    fetchNocs(nocPage, nocSearch, field, newOrd);
  }, [nocSortBy, nocSortOrd, nocPage, nocSearch, fetchNocs]);

  const handleNocFilterApply = useCallback((filters) => {
    setNocFilters(filters);
    setNocPage(1);
  }, []);

  const handleAuthSort = useCallback((field) => {
    const newOrd = authSortBy === field ? (authSortOrd === 'asc' ? 'desc' : 'asc') : 'asc';
    setAuthSortBy(field);
    setAuthSortOrd(newOrd);
    fetchAuthorities(authPage, authSearch, field, newOrd);
  }, [authSortBy, authSortOrd, authPage, authSearch, fetchAuthorities]);

  // ============================================================================
  // SUCCESS HANDLERS
  // ============================================================================

  const showToast = (message, type = 'success') => setToast({ message, type });

  const handleNocSuccess = (_res, action) => {
    setNocModal({ open: false, editData: null });
    fetchNocs(nocPage, nocSearch, nocSortBy, nocSortOrd);
    showToast(`NOC ${action} successfully`);
  };

  const handleAuthSuccess = (_res, action) => {
    setAuthModal({ open: false, editData: null });
    fetchAuthorities(authPage, authSearch, authSortBy, authSortOrd);
    fetchAllForDropdowns();
    showToast(`Authority ${action} successfully`);
  };

  const handleTypeSuccess = (_res, action) => {
    setTypeModal({ open: false, editData: null });
    fetchNocTypes(typesPage, typesSearch);
    fetchAllForDropdowns();
    showToast(`NOC Type ${action} successfully`);
  };

  // ============================================================================
  // DELETE FLOW
  // ============================================================================

  const handleConfirmDelete = async () => {
    const { type, item } = deleteModal;
    if (!item) return;
    setIsDeleting(true);
    try {
      if (type === 'noc') {
        await deleteNoc(item.id);
        fetchNocs(nocPage, nocSearch, nocSortBy, nocSortOrd);
      } else if (type === 'authority') {
        await deleteAuthority(item.id);
        fetchAuthorities(authPage, authSearch, authSortBy, authSortOrd);
        fetchAllForDropdowns();
      } else if (type === 'type') {
        await deleteNocType(item.id);
        fetchNocTypes(typesPage, typesSearch);
        fetchAllForDropdowns();
      }
      setDeleteModal({ open: false, type: '', item: null });
      showToast(
        type === 'noc'       ? 'NOC deleted'       :
        type === 'authority' ? 'Authority deleted'  :
                               'NOC Type deleted'
      );
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // ============================================================================
  // ACTION HANDLERS — passed into DynamicList
  // ============================================================================

  const nocActionHandlers = {
    onEditNoc:   (row) => setNocModal({ open: true, editData: row }),
    onDeleteNoc: isAdminOrManager
      ? (row) => setDeleteModal({ open: true, type: 'noc', item: row })
      : undefined,
    onApproveNoc: isAdminOrManager ? async (row) => {
      try {
        await approveNoc(row.id);
        fetchNocs(nocPage, nocSearch, nocSortBy, nocSortOrd);
        showToast('NOC approved');
      } catch (err) { showToast(err.message || 'Approve failed', 'error'); }
    } : undefined,
    onRejectNoc: isAdminOrManager ? async (row) => {
      try {
        await rejectNoc(row.id);
        fetchNocs(nocPage, nocSearch, nocSortBy, nocSortOrd);
        showToast('NOC rejected');
      } catch (err) { showToast(err.message || 'Reject failed', 'error'); }
    } : undefined,
    onReapplyNoc: async (row) => {
      try {
        await reapplyNoc(row.id);
        fetchNocs(nocPage, nocSearch, nocSortBy, nocSortOrd);
        showToast('NOC reapplied');
      } catch (err) { showToast(err.message || 'Reapply failed', 'error'); }
    },
    onSubmitNoc: async (row) => {
      try {
        await submitNoc(row.id);
        fetchNocs(nocPage, nocSearch, nocSortBy, nocSortOrd);
        showToast('NOC submitted');
      } catch (err) { showToast(err.message || 'Submit failed', 'error'); }
    },
  };

  const authActionHandlers = {
    onEditAuthority:   (row) => setAuthModal({ open: true, editData: row }),
    onDeleteAuthority: isAdminOrManager
      ? (row) => setDeleteModal({ open: true, type: 'authority', item: row })
      : undefined,
  };

  const typeActionHandlers = {
    onEditNocType:   (row) => setTypeModal({ open: true, editData: row }),
    onDeleteNocType: isAdminOrManager
      ? (row) => setDeleteModal({ open: true, type: 'type', item: row })
      : undefined,
  };

  // Pending count for stat card
  const pendingCount = nocs.filter(n =>
    ['pending', 'submitted'].includes(String(n.status || '').toLowerCase())
  ).length;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <style>{`
        html { overflow-y: scroll; scrollbar-gutter: stable; }
        @keyframes fadeIn    { from { opacity: 0; }                         to { opacity: 1; }                      }
        @keyframes scaleIn   { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes nocSlideUp { from{opacity:0;transform:translateX(-50%) translateY(16px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes nocDropIn  { from { opacity: 0; transform: scale(0.97) translateY(-4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-fadeIn  { animation: fadeIn  0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>

      <div className="space-y-6">

        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-md shadow-teal-500/30 flex-shrink-0">
            <ClipboardCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">NOC Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage NOC applications, issuing authorities and categories</p>
          </div>
        </div>

        {/* ── Stat Cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={ClipboardCheck} value={nocTotal}    label="Total NOCs"      subLabel="All applications"   gradient="bg-teal-500"   loading={nocsLoading} />
          <StatCard icon={Clock}          value={pendingCount} label="Pending Review"  subLabel="Awaiting decision"  gradient="bg-yellow-500" loading={nocsLoading} />
          <StatCard icon={Building2}      value={authTotal}    label="Authorities"     subLabel="Registered bodies"  gradient="bg-orange-500" loading={authLoading} />
          <StatCard icon={Tag}            value={typesTotal}   label="NOC Types"       subLabel="Defined categories" gradient="bg-blue-500"   loading={typesLoading} />
        </div>

        {/* ── Main Card with Tabs ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-300 overflow-hidden">

          {/* Tab Bar */}
          <div className="flex border-b-2 border-gray-300 bg-gray-50/60">
            {TABS.map(({ key, label, icon: Icon, activeStyle, badgeActive }) => {
              const count =
                key === 'nocs'        ? nocTotal   :
                key === 'authorities' ? authTotal  :
                                        typesTotal;
              return (
                <button
                  key={key}
                  onClick={() => {
                    window.location.hash = `tab=${key}`;
                    setActiveTab(key);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 text-sm font-semibold transition-all duration-150 border-b-2
                    ${activeTab === key
                      ? activeStyle
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {label}
                  <span className={`inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 rounded-full text-xs font-bold
                    ${activeTab === key ? badgeActive : 'bg-gray-200 text-gray-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ════ NOCs TAB ════ */}
          {activeTab === 'nocs' && (
            <DynamicList
              config={{ ...nocListConfig, columns: getNocColumns(), showFilter: true }}
              data={nocs}
              loading={nocsLoading}
              error={nocsError}
              emptyMessage={nocListConfig.emptyMessage}
              currentPage={nocPage}
              totalPages={nocPages}
              totalCount={nocTotal}
              onPageChange={(p) => { setNocPage(p); fetchNocs(p, nocSearch, nocSortBy, nocSortOrd); }}
              onAdd={() => setNocModal({ open: true, editData: null })}
              onSearch={(val) => setNocSearch(val)}
              onFilterToggle={() => setNocFilterOpen(true)}
              onRetry={() => fetchNocs(nocPage, nocSearch, nocSortBy, nocSortOrd)}
              onSort={handleNocSort}
              sortBy={nocSortBy}
              sortOrder={nocSortOrd}
              searchTerm={nocSearch}
              showFilter={Object.values(nocFilters).some((value) => String(value || '').trim() !== '')}
              actionHandlers={nocActionHandlers}
              onRowClick={(row) => navigate(`/noc/${row.id}`)}
              noBorder
            />
          )}

          {/* ════ AUTHORITIES TAB ════ */}
          {activeTab === 'authorities' && (
            <DynamicList
              config={{ ...authorityListConfig, columns: getAuthorityColumns() }}
              data={authorities}
              loading={authLoading}
              error={authError}
              emptyMessage={authorityListConfig.emptyMessage}
              currentPage={authPage}
              totalPages={authPages}
              totalCount={authTotal}
              onPageChange={(p) => { setAuthPage(p); fetchAuthorities(p, authSearch, authSortBy, authSortOrd); }}
              onAdd={() => setAuthModal({ open: true, editData: null })}
              onSearch={(val) => setAuthSearch(val)}
              onFilterToggle={() => {}}
              onRetry={() => fetchAuthorities(authPage, authSearch, authSortBy, authSortOrd)}
              onSort={handleAuthSort}
              sortBy={authSortBy}
              sortOrder={authSortOrd}
              searchTerm={authSearch}
              showFilter={false}
              actionHandlers={authActionHandlers}
              noBorder
            />
          )}

          {/* ════ NOC TYPES TAB ════ */}
          {activeTab === 'types' && (
            <DynamicList
              config={nocTypeListConfig}
              data={nocTypes}
              loading={typesLoading}
              error={typesError}
              emptyMessage={nocTypeListConfig.emptyMessage}
              currentPage={typesPage}
              totalPages={typesPages}
              totalCount={typesTotal}
              onPageChange={(p) => { setTypesPage(p); fetchNocTypes(p, typesSearch); }}
              onAdd={() => setTypeModal({ open: true, editData: null })}
              onSearch={(val) => setTypesSearch(val)}
              onFilterToggle={() => {}}
              onRetry={() => fetchNocTypes(typesPage, typesSearch)}
              searchTerm={typesSearch}
              showFilter={false}
              actionHandlers={typeActionHandlers}
              noBorder
            />
          )}

        </div>{/* end main card */}
      </div>

      {/* ── Modals ────────────────────────────────────────────────────── */}

      <NocModal
        isOpen={nocModal.open}
        onClose={() => setNocModal({ open: false, editData: null })}
        onSuccess={handleNocSuccess}
        editData={nocModal.editData}
        nocTypes={allNocTypes}
        authorities={allAuthorities}
      />

      <NocFilterModal
        key={`${nocFilterOpen}-${JSON.stringify(nocFilters)}`}
        isOpen={nocFilterOpen}
        onClose={() => setNocFilterOpen(false)}
        onApply={handleNocFilterApply}
        currentFilters={nocFilters}
      />

      <AuthorityModal
        isOpen={authModal.open}
        onClose={() => setAuthModal({ open: false, editData: null })}
        onSuccess={handleAuthSuccess}
        editData={authModal.editData}
      />

      <NocTypeModal
        isOpen={typeModal.open}
        onClose={() => setTypeModal({ open: false, editData: null })}
        onSuccess={handleTypeSuccess}
        editData={typeModal.editData}
      />

      <ConfirmDeleteModal
        isOpen={deleteModal.open}
        onClose={() => { if (!isDeleting) setDeleteModal({ open: false, type: '', item: null }); }}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title={
          deleteModal.type === 'noc'       ? 'Delete NOC?'       :
          deleteModal.type === 'authority' ? 'Delete Authority?' :
                                             'Delete NOC Type?'
        }
        description={
          deleteModal.type === 'noc'
            ? `This NOC application will be permanently removed.`
            : deleteModal.type === 'authority'
            ? `Authority "${deleteModal.item?.authority_name || ''}" will be permanently deleted.`
            : `NOC Type "${deleteModal.item?.name || ''}" will be permanently deleted. Existing NOCs using this type may be affected.`
        }
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
