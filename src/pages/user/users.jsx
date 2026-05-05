import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users as UsersIcon, Shield, Plus, Trash2, Edit2, Search,
  X, Loader2, AlertCircle, CheckCircle, ChevronDown, Eye, EyeOff,
  User, Mail, Lock, Tag, ChevronLeft, ChevronRight, Activity,
} from 'lucide-react';
import { useRole } from '../../components/RoleContext';
import {
  getUsers, createUser, updateUser, deleteUser,
  getRoles, createRole, updateRole, deleteRole,
} from '../../services/users';

// ============================================================================
// HELPERS
// ============================================================================

const fmtDate = (ds) => {
  if (!ds) return '—';
  try {
    return new Date(ds).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '—'; }
};

const getRoleBadgeColor = (roleName = '') => {
  const r = String(roleName).toLowerCase();
  if (r === 'admin')   return { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500', border: 'border-purple-200' };
  if (r === 'manager') return { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500',   border: 'border-blue-200' };
  return                      { bg: 'bg-teal-100',   text: 'text-teal-700',   dot: 'bg-teal-500',   border: 'border-teal-200' };
};

const AVATAR_COLORS = [
  'from-teal-500 to-teal-600',
  'from-blue-500 to-blue-600',
  'from-purple-500 to-purple-600',
  'from-emerald-500 to-emerald-600',
  'from-orange-500 to-orange-600',
  'from-rose-500 to-rose-600',
];
const avatarColor = (i) => AVATAR_COLORS[i % AVATAR_COLORS.length];

const PAGE_SIZE = 10;

// ============================================================================
// SCROLL LOCK HOOK
// ============================================================================

const useScrollLock = (locked) => {
  useEffect(() => {
    if (!locked) return;
    const y = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${y}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, y);
    };
  }, [locked]);
};

// ============================================================================
// INPUT FIELD
// ============================================================================

const InputField = ({ icon: Icon, label, name, value, onChange, type = 'text', placeholder, required, disabled, rightElement, autoComplete }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
      {label} {required && <span className="text-red-500 normal-case font-normal">*</span>}
    </label>
    <div className="relative">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        </div>
      )}
      <input
        type={type} name={name} value={value} onChange={onChange}
        placeholder={placeholder} disabled={disabled}
        autoComplete={autoComplete || 'off'}
        readOnly={false}
        className={`w-full ${Icon ? 'pl-10' : 'pl-3'} ${rightElement ? 'pr-10' : 'pr-3'} py-2.5
          border border-gray-300 rounded-lg text-sm bg-white
          hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent
          transition-all duration-150 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed`}
      />
      {rightElement && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
      )}
    </div>
  </div>
);

// ============================================================================
// ROLE DROPDOWN — Fixed: opens upward if needed, visible immediately, no scrollbar issues
// ============================================================================

const RoleDropdown = ({ value, onChange, disabled, roles, loading }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const btnRef = useRef(null);
  const [dropUp, setDropUp] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    if (!open && btnRef.current) {
      // Determine if dropdown should go up or down
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 220);
    }
    setOpen(p => !p);
  };

  const selected = roles.find(r => r.name === value);

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
        Role <span className="text-red-500 normal-case font-normal">*</span>
      </label>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full pl-3 pr-10 py-2.5 border rounded-lg text-sm text-left flex items-center justify-between
          transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent
          disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
          ${open ? 'border-teal-500 ring-2 ring-teal-500' : 'border-gray-300 bg-white hover:border-gray-400'}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {loading
            ? <span className="text-gray-400 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />Loading roles…</span>
            : selected
              ? <span className="text-gray-900 font-medium truncate">{selected.name}</span>
              : <span className="text-gray-400">Select a role…</span>
          }
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !loading && (
        <div
          className={`absolute left-0 w-full bg-white rounded-xl border border-gray-300 shadow-xl z-[99999] overflow-hidden
            ${dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`}
        >
          {roles.length === 0
            ? <div className="px-4 py-6 text-center text-sm text-gray-400">No roles available</div>
            : <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
                {roles.map(role => {
                  const c = getRoleBadgeColor(role.name);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => { onChange(role.name); setOpen(false); }}
                      className={`w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors text-sm
                        ${value === role.name ? 'bg-teal-50' : ''}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${c.dot} flex-shrink-0`} />
                      <span className={`font-medium flex-1 ${value === role.name ? 'text-teal-700' : 'text-gray-800'}`}>{role.name}</span>
                      {role.description && <span className="text-gray-400 text-xs truncate max-w-[100px]">{role.description}</span>}
                      {value === role.name && <CheckCircle className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
          }
        </div>
      )}
    </div>
  );
};

// ============================================================================
// TOAST
// ============================================================================

const Toast = ({ message, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed bottom-6 left-1/2 z-[99999]" style={{ transform: 'translateX(-50%)' }}>
      <div
        className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-sm font-semibold
          ${type === 'success' ? 'bg-teal-600' : 'bg-red-500'}`}
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,.25)', animation: 'umSlideUp .3s cubic-bezier(.16,1,.3,1)' }}
      >
        {type === 'success'
          ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
          : <AlertCircle className="w-4 h-4 flex-shrink-0" />
        }
        {message}
      </div>
    </div>
  );
};

// ============================================================================
// CONFIRM DELETE MODAL
// ============================================================================

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, title, description, isLoading }) => {
  useScrollLock(isOpen);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999]" style={{ position: 'fixed' }}>
      <div className="absolute inset-0 bg-black/50" onClick={!isLoading ? onClose : undefined} />
      <div className="relative z-10 flex items-center justify-center w-screen h-screen">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center"
          style={{ animation: 'umScaleIn .25s cubic-bezier(.16,1,.3,1)' }}
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
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm} disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Deleting…</> : 'Yes, Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CREATE / EDIT USER MODAL — Fixed scrollbar visibility + role dropdown
// ============================================================================

const BLANK_USER = { username: '', email: '', first_name: '', last_name: '', password: '', confirm_password: '', role_name: '' };

const UserModal = ({ isOpen, onClose, onSuccess, editData, roles, rolesLoading }) => {
  const isEdit = !!editData;
  const [form, setForm]             = useState(BLANK_USER);
  const [showPwd, setShowPwd]       = useState(false);
  const [showCfm, setShowCfm]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    setError(''); setShowPwd(false); setShowCfm(false);
    setForm(isEdit
      ? {
          username: editData.username || '',
          email: editData.email || '',
          first_name: editData.first_name || '',
          last_name: editData.last_name || '',
          password: '',
          confirm_password: '',
          role_name: editData.role?.name || '',
        }
      : BLANK_USER);
  }, [isOpen, isEdit, editData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      const response = isEdit
        ? await updateUser({ id: editData.id, email: form.email, first_name: form.first_name, last_name: form.last_name })
        : await createUser(form);
      onSuccess(response, isEdit ? 'updated' : 'created');
    } catch (err) {
      setError(err.message || `Failed to ${isEdit ? 'update' : 'create'} user`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999]"
      style={{ position: 'fixed', overflow: 'hidden', animation: 'umFadeIn .2s ease' }}
    >
      <div className="absolute inset-0 bg-black/55" onClick={!submitting ? onClose : undefined} />
      <div className="relative z-10 flex items-center justify-center w-screen h-screen p-4">
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full flex flex-col"
          style={{
            maxWidth: 488,
            maxHeight: 'calc(100vh - 40px)',
            animation: 'umScaleIn .25s cubic-bezier(.16,1,.3,1)',
            overflow: 'hidden',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex-shrink-0 bg-teal-600 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                {isEdit ? <Edit2 className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-white" />}
              </div>
              <div>
                <p className="text-white font-bold text-base leading-tight">{isEdit ? 'Edit User' : 'Create New User'}</p>
                <p className="text-teal-100 text-xs mt-0.5">{isEdit ? `Editing ${editData.first_name} ${editData.last_name}` : 'Fill in all required details'}</p>
              </div>
            </div>
            <button
              onClick={onClose} disabled={submitting}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Body — hidden scrollbar, functionally scrollable */}
          <form
            id="user-form"
            onSubmit={handleSubmit}
            autoComplete="off"
            className="flex-1 p-5 space-y-4 bg-gray-50"
            style={{
              overflowY: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            <style>{`#user-form::-webkit-scrollbar { display: none; }`}</style>

            {/* Honeypot — tricks browser autofill into targeting these instead of real fields */}
            <div style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none', height: 0, overflow: 'hidden' }} aria-hidden="true">
              <input type="text"     name="fake_username" tabIndex={-1} autoComplete="username" />
              <input type="password" name="fake_password" tabIndex={-1} autoComplete="current-password" />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3.5">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 leading-relaxed">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <InputField icon={User} label="First Name" name="first_name" value={form.first_name} onChange={handleChange} placeholder="John" required disabled={submitting} autoComplete="given-name" />
              <InputField icon={User} label="Last Name"  name="last_name"  value={form.last_name}  onChange={handleChange} placeholder="Doe"  required disabled={submitting} autoComplete="family-name" />
            </div>

            {!isEdit && (
              <InputField icon={User} label="Username" name="username" value={form.username} onChange={handleChange} placeholder="johndoe" required disabled={submitting} autoComplete="one-time-code" />
            )}

            <InputField icon={Mail} label="Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="john@example.com" required disabled={submitting} autoComplete="one-time-code" />

            {!isEdit && (
              <>
                <InputField
                  icon={Lock} label="Password" name="password"
                  type={showPwd ? 'text' : 'password'}
                  value={form.password} onChange={handleChange}
                  placeholder="Min. 8 characters" required disabled={submitting}
                  autoComplete="new-password"
                  rightElement={
                    <button type="button" onClick={() => setShowPwd(p => !p)} className="text-gray-400 hover:text-gray-600 transition-colors">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
                <InputField
                  icon={Lock} label="Confirm Password" name="confirm_password"
                  type={showCfm ? 'text' : 'password'}
                  value={form.confirm_password} onChange={handleChange}
                  placeholder="Re-enter password" required disabled={submitting}
                  autoComplete="new-password"
                  rightElement={
                    <button type="button" onClick={() => setShowCfm(p => !p)} className="text-gray-400 hover:text-gray-600 transition-colors">
                      {showCfm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
                {/* Role dropdown — rendered last so it can open upward cleanly */}
                <RoleDropdown
                  value={form.role_name}
                  onChange={(name) => { setForm(p => ({ ...p, role_name: name })); setError(''); }}
                  disabled={submitting}
                  roles={roles}
                  loading={rolesLoading}
                />
              </>
            )}
          </form>

          {/* Footer */}
          <div className="flex-shrink-0 px-5 py-4 border-t border-gray-200 bg-white flex gap-2.5">
            <button
              type="button" onClick={onClose} disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50 flex-shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit" form="user-form" disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-teal-600/25"
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" />{isEdit ? 'Saving…' : 'Creating…'}</>
                : isEdit ? <><Edit2 className="w-4 h-4" />Save Changes</> : <><Plus className="w-4 h-4" />Create User</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CREATE / EDIT ROLE MODAL
// ============================================================================

const RoleModal = ({ isOpen, onClose, onSuccess, editData }) => {
  const isEdit = !!editData;
  const [form, setForm]             = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setForm(isEdit ? { name: editData.name || '', description: editData.description || '' } : { name: '', description: '' });
  }, [isOpen, isEdit, editData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      const response = isEdit ? await updateRole({ id: editData.id, ...form }) : await createRole(form);
      onSuccess(response, isEdit ? 'updated' : 'created');
    } catch (err) {
      setError(err.message || `Failed to ${isEdit ? 'update' : 'create'} role`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999]" style={{ position: 'fixed', overflow: 'hidden', animation: 'umFadeIn .2s ease' }}>
      <div className="absolute inset-0 bg-black/55" onClick={!submitting ? onClose : undefined} />
      <div className="relative z-10 flex items-center justify-center w-screen h-screen p-4">
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
          style={{ maxWidth: 420, animation: 'umScaleIn .25s cubic-bezier(.16,1,.3,1)' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex-shrink-0 px-5 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-base leading-tight">{isEdit ? 'Edit Role' : 'Create New Role'}</p>
                <p className="text-purple-200 text-xs mt-0.5">{isEdit ? `Editing "${editData.name}"` : 'Define a new access role'}</p>
              </div>
            </div>
            <button onClick={onClose} disabled={submitting} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors disabled:opacity-50">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          <form id="role-form" onSubmit={handleSubmit} className="p-5 space-y-4 bg-gray-50">
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3.5">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <InputField icon={Tag} label="Role Name" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Manager" required disabled={submitting} />
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Description</label>
              <textarea
                name="description" value={form.description} onChange={handleChange}
                placeholder="Brief description of this role's permissions…"
                disabled={submitting} rows={3}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm resize-none
                  focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent hover:border-gray-400 transition-all
                  disabled:bg-gray-50 disabled:text-gray-400 bg-white"
              />
            </div>
          </form>

          <div className="flex-shrink-0 px-5 py-4 border-t border-gray-200 bg-white flex gap-2.5">
            <button type="button" onClick={onClose} disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50 flex-shrink-0">
              Cancel
            </button>
            <button type="submit" form="role-form" disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" />{isEdit ? 'Saving…' : 'Creating…'}</>
                : isEdit ? <><Edit2 className="w-4 h-4" />Save Changes</> : <><Plus className="w-4 h-4" />Create Role</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// STAT CARD — matching clients.jsx colorful card style
// ============================================================================

const StatCard = ({ icon: Icon, value, label, subLabel, gradient, iconBg }) => (
  <div className={`relative rounded-2xl p-5 shadow-sm overflow-hidden ${gradient}`}>
    {/* Decorative circle */}
    <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
    <div className="absolute -right-2 -bottom-6 w-20 h-20 rounded-full bg-white/10" />

    <div className="relative flex items-start justify-between">
      <div className="flex items-start gap-3">
        <div className={`${iconBg} rounded-full p-2.5 flex-shrink-0`}>
          {Icon && <Icon className="w-5 h-5 text-white" />}
        </div>
        <div className="min-w-0">
          <h3 className="text-2xl font-bold text-white leading-none mb-1">{value}</h3>
          <p className="text-white/90 font-semibold text-sm truncate">{label}</p>
          {subLabel && <p className="text-white/70 text-xs mt-0.5 truncate">{subLabel}</p>}
        </div>
      </div>
    </div>
  </div>
);

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function UsersPage() {
  const navigate             = useNavigate();
  const { isAdminOrManager } = useRole();

  useEffect(() => {
    if (isAdminOrManager === false) navigate('/clients', { replace: true });
  }, [isAdminOrManager, navigate]);

  const [activeTab,      setActiveTab]      = useState('users');

  const [users,          setUsers]          = useState([]);
  const [usersLoading,   setUsersLoading]   = useState(true);
  const [usersError,     setUsersError]     = useState('');
  const [userSearch,     setUserSearch]     = useState('');
  const [userPage,       setUserPage]       = useState(1);
  const [userTotal,      setUserTotal]      = useState(0);
  const [userPages,      setUserPages]      = useState(1);

  const [roles,          setRoles]          = useState([]);
  const [rolesLoading,   setRolesLoading]   = useState(true);
  const [rolesError,     setRolesError]     = useState('');
  const [roleSearch,     setRoleSearch]     = useState('');
  const [rolePage,       setRolePage]       = useState(1);
  const [roleTotal,      setRoleTotal]      = useState(0);
  const [rolePages,      setRolePages]      = useState(1);

  const [allRoles,        setAllRoles]        = useState([]);
  const [allRolesLoading, setAllRolesLoading] = useState(false);

  const [userModal,   setUserModal]   = useState({ open: false, editData: null });
  const [roleModal,   setRoleModal]   = useState({ open: false, editData: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, type: '', item: null });
  const [isDeleting,  setIsDeleting]  = useState(false);
  const [toast,       setToast]       = useState(null);

  // ── Fetchers ──────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async (page = 1, search = '') => {
    setUsersLoading(true); setUsersError('');
    try {
      const res = await getUsers({ page, page_size: PAGE_SIZE, ...(search ? { search } : {}) });
      if (res.status === 'success' && res.data) {
        const results = res.data.results || (Array.isArray(res.data) ? res.data : []);
        setUsers(results);
        const count = res.data.count || res.data.total_count || results.length;
        setUserTotal(count);
        setUserPages(Math.max(1, Math.ceil(count / PAGE_SIZE)));
      } else { setUsersError('Failed to load users'); }
    } catch (err) { setUsersError(err.message || 'Failed to load users'); }
    finally { setUsersLoading(false); }
  }, []);

  const fetchRoles = useCallback(async (page = 1, search = '') => {
    setRolesLoading(true); setRolesError('');
    try {
      const res = await getRoles({ page, page_size: PAGE_SIZE, ...(search ? { search } : {}) });
      if (res.status === 'success' && res.data) {
        const results = res.data.results || (Array.isArray(res.data) ? res.data : []);
        setRoles(results);
        const count = res.data.count || res.data.total_count || results.length;
        setRoleTotal(count);
        setRolePages(Math.max(1, Math.ceil(count / PAGE_SIZE)));
      } else { setRolesError('Failed to load roles'); }
    } catch (err) { setRolesError(err.message || 'Failed to load roles'); }
    finally { setRolesLoading(false); }
  }, []);

  const fetchAllRoles = useCallback(async () => {
    setAllRolesLoading(true);
    try {
      const res = await getRoles({ page: 1, page_size: 100 });
      if (res.status === 'success' && res.data) {
        const results = res.data.results || (Array.isArray(res.data) ? res.data : []);
        setAllRoles(results);
      }
    } catch { /* silently ignore */ }
    finally { setAllRolesLoading(false); }
  }, []);

  useEffect(() => {
    if (!isAdminOrManager) return;
    fetchUsers(); fetchRoles(); fetchAllRoles();
  }, [isAdminOrManager, fetchUsers, fetchRoles, fetchAllRoles]);

  useEffect(() => {
    const t = setTimeout(() => { setUserPage(1); fetchUsers(1, userSearch); }, 350);
    return () => clearTimeout(t);
  }, [userSearch]);

  useEffect(() => {
    const t = setTimeout(() => { setRolePage(1); fetchRoles(1, roleSearch); }, 350);
    return () => clearTimeout(t);
  }, [roleSearch]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleUserSuccess = (_res, action) => {
    setUserModal({ open: false, editData: null });
    fetchUsers(userPage, userSearch);
    fetchAllRoles();
    setToast({ message: `User ${action} successfully`, type: 'success' });
  };

  const handleRoleSuccess = (_res, action) => {
    setRoleModal({ open: false, editData: null });
    fetchRoles(rolePage, roleSearch);
    fetchAllRoles();
    setToast({ message: `Role ${action} successfully`, type: 'success' });
  };

  const handleConfirmDelete = async () => {
    const { type, item } = deleteModal;
    if (!item) return;
    setIsDeleting(true);
    try {
      if (type === 'user') { await deleteUser(item.id); fetchUsers(userPage, userSearch); }
      else                 { await deleteRole(item.id); fetchRoles(rolePage, roleSearch); fetchAllRoles(); }
      setDeleteModal({ open: false, type: '', item: null });
      setToast({ message: `${type === 'user' ? 'User' : 'Role'} deleted successfully`, type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Delete failed', type: 'error' });
    } finally { setIsDeleting(false); }
  };

  if (!isAdminOrManager) return null;

  const activeUsers = users.filter(u => u.is_active !== false).length;

  // ── Pagination ────────────────────────────────────────────────────────────

  const Pagination = ({ page, pages, total, onPrev, onNext, onPage, accentClass }) =>
    pages <= 1 ? null : (
      <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Showing <span className="font-semibold text-gray-700">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</span> of <span className="font-semibold text-gray-700">{total}</span>
        </p>
        <div className="flex gap-1">
          <button onClick={onPrev} disabled={page === 1}
            className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => onPage(p)}
              className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all
                ${p === page ? `${accentClass} text-white shadow-sm` : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              {p}
            </button>
          ))}
          <button onClick={onNext} disabled={page === pages}
            className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes umFadeIn  { from{opacity:0}                                               to{opacity:1}                                           }
        @keyframes umScaleIn { from{opacity:0;transform:scale(.95) translateY(8px)}          to{opacity:1;transform:scale(1) translateY(0)}           }
        @keyframes umSlideUp { from{opacity:0;transform:translateX(-50%) translateY(16px)}   to{opacity:1;transform:translateX(-50%) translateY(0)}   }
      `}</style>

      <div className="space-y-6">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-md shadow-teal-500/30 flex-shrink-0">
              <UsersIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">User Management</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage system users and access roles</p>
            </div>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={UsersIcon} value={userTotal} label="Total Users" subLabel={`${userTotal} registered`}
            gradient="bg-teal-500" iconBg="bg-white/20"
          />
          <StatCard
            icon={Activity} value={activeUsers} label="Active Users" subLabel="Currently active"
            gradient="bg-emerald-500" iconBg="bg-white/20"
          />
          <StatCard
            icon={Shield} value={roleTotal} label="Total Roles" subLabel="Access roles defined"
            gradient="bg-purple-600" iconBg="bg-white/20"
          />
          <StatCard
            icon={User} value={users.length} label="This Page" subLabel="Displayed records"
            gradient="bg-blue-500" iconBg="bg-white/20"
          />
        </div>

        {/* ── Main Card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

          {/* Tab Bar */}
          <div className="flex border-b border-gray-200 bg-gray-50/60">
            {[
              { key: 'users', label: 'Users',  icon: UsersIcon, count: userTotal, activeStyle: 'border-teal-500 text-teal-600 bg-white',   badge: 'bg-teal-100 text-teal-700' },
              { key: 'roles', label: 'Roles',  icon: Shield,    count: roleTotal, activeStyle: 'border-purple-500 text-purple-600 bg-white', badge: 'bg-purple-100 text-purple-700' },
            ].map(({ key, label, icon: Icon, count, activeStyle, badge }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 text-sm font-semibold transition-all duration-150 border-b-2
                  ${activeTab === key ? activeStyle : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {label}
                <span className={`inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 rounded-full text-xs font-bold
                  ${activeTab === key ? badge : 'bg-gray-200 text-gray-500'}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* ════ USERS TAB ════ */}
          {activeTab === 'users' && (
            <>
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-200 bg-white">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text" placeholder="Search by name, email or username…"
                    value={userSearch} onChange={e => setUserSearch(e.target.value)}
                    className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-xl text-sm
                      focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent
                      hover:border-gray-400 transition-all bg-white"
                  />
                  {userSearch && (
                    <button onClick={() => setUserSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setUserModal({ open: true, editData: null })}
                  className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-teal-600/20 flex-shrink-0 active:scale-[.98]"
                >
                  <Plus className="w-4 h-4" /> Add User
                </button>
              </div>

              {/* Table */}
              {usersLoading ? (
                <div className="flex items-center justify-center py-20 gap-3">
                  <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
                  <span className="text-sm text-gray-500 font-medium">Loading users…</span>
                </div>
              ) : usersError ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                  <p className="text-sm text-red-500 font-medium">{usersError}</p>
                  <button onClick={() => fetchUsers(userPage, userSearch)} className="text-xs text-teal-600 hover:underline font-semibold">Retry</button>
                </div>
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <UsersIcon className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-500 text-sm font-semibold">No users found</p>
                  {userSearch && <p className="text-gray-400 text-xs">Try a different search term</p>}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {['User', 'Username', 'Email', 'Role', 'Joined', 'Status', 'Actions'].map((h, i) => (
                          <th
                            key={h}
                            className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap ${i === 6 ? 'text-center' : ''}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {users.map((user, idx) => {
                        const roleName = user.role?.name || '—';
                        const colors   = getRoleBadgeColor(roleName);
                        const initials = `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase() || (user.username || 'U')[0].toUpperCase();
                        const isActive = user.is_active !== false;
                        return (
                          <tr
                            key={user.id}
                            className="hover:bg-teal-50/40 transition-colors group cursor-pointer"
                            onClick={() => navigate(`/users/${user.username}`)}
                          >
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarColor(idx)} flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow-sm`}>
                                  {initials}
                                </div>
                                <p className="text-sm font-semibold text-gray-900 truncate max-w-[120px] group-hover:text-teal-700 transition-colors">
                                  {`${user.first_name || ''} ${user.last_name || ''}`.trim() || '—'}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">{user.username || '—'}</span>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="text-sm text-gray-600 truncate max-w-[180px] block">{user.email || '—'}</span>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                                {roleName}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="text-sm text-gray-400">{fmtDate(user.created_at)}</span>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border
                                ${isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                {isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div
                                className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={e => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => setUserModal({ open: true, editData: user })}
                                  className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 flex items-center justify-center transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeleteModal({ open: true, type: 'user', item: user })}
                                  className="w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 flex items-center justify-center transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <Pagination
                page={userPage} pages={userPages} total={userTotal} accentClass="bg-teal-600"
                onPrev={() => { const p = userPage - 1; setUserPage(p); fetchUsers(p, userSearch); }}
                onNext={() => { const p = userPage + 1; setUserPage(p); fetchUsers(p, userSearch); }}
                onPage={(p) => { setUserPage(p); fetchUsers(p, userSearch); }}
              />
            </>
          )}

          {/* ════ ROLES TAB ════ */}
          {activeTab === 'roles' && (
            <>
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-200 bg-white">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text" placeholder="Search roles…"
                    value={roleSearch} onChange={e => setRoleSearch(e.target.value)}
                    className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-xl text-sm
                      focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                      hover:border-gray-400 transition-all bg-white"
                  />
                  {roleSearch && (
                    <button onClick={() => setRoleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setRoleModal({ open: true, editData: null })}
                  className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-purple-600/20 flex-shrink-0 active:scale-[.98]"
                >
                  <Plus className="w-4 h-4" /> Add Role
                </button>
              </div>

              {rolesLoading ? (
                <div className="flex items-center justify-center py-20 gap-3">
                  <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
                  <span className="text-sm text-gray-500 font-medium">Loading roles…</span>
                </div>
              ) : rolesError ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                  <p className="text-sm text-red-500 font-medium">{rolesError}</p>
                  <button onClick={() => fetchRoles(rolePage, roleSearch)} className="text-xs text-teal-600 hover:underline font-semibold">Retry</button>
                </div>
              ) : roles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <Shield className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-500 text-sm font-semibold">No roles found</p>
                </div>
              ) : (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roles.map(role => {
                    const c = getRoleBadgeColor(role.name);
                    return (
                      <div
                        key={role.id}
                        className="group relative bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center flex-shrink-0`}>
                              <Shield className={`w-5 h-5 ${c.text}`} />
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 text-sm leading-tight">{role.name}</h3>
                              <span className={`inline-flex items-center gap-1 text-xs font-medium mt-0.5 ${c.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                                {role.is_active !== false ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setRoleModal({ open: true, editData: role })}
                              className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 flex items-center justify-center transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteModal({ open: true, type: 'role', item: role })}
                              className="w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 flex items-center justify-center transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {role.description
                          ? <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{role.description}</p>
                          : <p className="text-xs text-gray-300 italic">No description provided</p>
                        }
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <span className="text-xs text-gray-400">Created {fmtDate(role.created_at)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <Pagination
                page={rolePage} pages={rolePages} total={roleTotal} accentClass="bg-purple-600"
                onPrev={() => { const p = rolePage - 1; setRolePage(p); fetchRoles(p, roleSearch); }}
                onNext={() => { const p = rolePage + 1; setRolePage(p); fetchRoles(p, roleSearch); }}
                onPage={(p) => { setRolePage(p); fetchRoles(p, roleSearch); }}
              />
            </>
          )}

        </div>{/* end main card */}
      </div>

      {/* ── Modals ── */}
      <UserModal
        isOpen={userModal.open}
        onClose={() => setUserModal({ open: false, editData: null })}
        onSuccess={handleUserSuccess}
        editData={userModal.editData}
        roles={allRoles}
        rolesLoading={allRolesLoading}
      />
      <RoleModal
        isOpen={roleModal.open}
        onClose={() => setRoleModal({ open: false, editData: null })}
        onSuccess={handleRoleSuccess}
        editData={roleModal.editData}
      />
      <ConfirmDeleteModal
        isOpen={deleteModal.open}
        onClose={() => { if (!isDeleting) setDeleteModal({ open: false, type: '', item: null }); }}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title={deleteModal.type === 'user' ? 'Delete User?' : 'Delete Role?'}
        description={
          deleteModal.type === 'user'
            ? `"${deleteModal.item ? `${deleteModal.item.first_name} ${deleteModal.item.last_name}`.trim() : ''}" will be permanently removed from the system.`
            : `Role "${deleteModal.item?.name || ''}" will be permanently deleted. Users assigned this role may be affected.`
        }
      />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
