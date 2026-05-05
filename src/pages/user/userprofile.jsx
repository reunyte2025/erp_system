import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit2, User, Mail, Shield,
  Calendar, CheckCircle, X, Loader2, AlertCircle,
  Activity, Clock,
} from 'lucide-react';
import { updateUser, getUsers } from '../../services/users';

// ============================================================================
// HELPERS
// ============================================================================

const fmtDate = (ds) => {
  if (!ds) return '—';
  try {
    return new Date(ds).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch { return '—'; }
};

const fmtDateTime = (ds) => {
  if (!ds) return '—';
  try {
    return new Date(ds).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
};

const getRoleStyle = (roleName = '') => {
  const r = String(roleName).toLowerCase();
  if (r === 'admin')   return {
    bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500',
    border: 'border-purple-200', cardBg: 'bg-purple-50',
    iconBg: 'bg-purple-600', barColor: '#9333ea',
  };
  if (r === 'manager') return {
    bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500',
    border: 'border-blue-200', cardBg: 'bg-blue-50',
    iconBg: 'bg-blue-600', barColor: '#2563eb',
  };
  return {
    bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500',
    border: 'border-teal-200', cardBg: 'bg-teal-50',
    iconBg: 'bg-teal-600', barColor: '#0d9488',
  };
};

const AVATAR_GRADIENTS = [
  'from-teal-400 to-teal-600',
  'from-blue-400 to-blue-600',
  'from-purple-400 to-purple-600',
  'from-emerald-400 to-emerald-600',
  'from-orange-400 to-orange-600',
  'from-rose-400 to-rose-600',
];
const getAvatarGrad = (str = '') => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
};

// ============================================================================
// SCROLL LOCK
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
// EDIT MODAL
// ============================================================================

const EditUserModal = ({ isOpen, onClose, onSuccess, user }) => {
  const [form, setForm]             = useState({ first_name: '', last_name: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen || !user) return;
    setError('');
    setForm({ first_name: user.first_name || '', last_name: user.last_name || '', email: user.email || '' });
  }, [isOpen, user]);

  const handleChange = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name.trim()) { setError('First name is required'); return; }
    if (!form.last_name.trim())  { setError('Last name is required');  return; }
    if (!form.email.trim())      { setError('Email is required');      return; }
    setError(''); setSubmitting(true);
    try {
      await updateUser({ id: user.id, ...form });
      onSuccess({ ...user, ...form });
    } catch (err) {
      setError(err.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const Field = ({ icon: Icon, label, name, type = 'text', placeholder, required }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-500 normal-case font-normal ml-1">*</span>}
      </label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />}
        <input
          type={type} name={name} value={form[name]} onChange={handleChange}
          placeholder={placeholder} disabled={submitting} autoComplete="off"
          className={`w-full ${Icon ? 'pl-10' : 'pl-3'} pr-3 py-2.5 border border-gray-300 rounded-lg text-sm
            bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent
            transition-all duration-150 disabled:bg-gray-50 disabled:text-gray-400`}
        />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999]" style={{ position: 'fixed', overflow: 'hidden', animation: 'upFadeIn .2s ease' }}>
      <div className="absolute inset-0 bg-black/55" onClick={!submitting ? onClose : undefined} />
      <div className="relative z-10 flex items-center justify-center w-screen h-screen p-4">
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
          style={{ maxWidth: 460, animation: 'upScaleIn .28s cubic-bezier(.16,1,.3,1)' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex-shrink-0 bg-teal-600 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Edit2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-base leading-tight">Edit Profile</p>
                <p className="text-teal-100 text-xs mt-0.5">Update user information</p>
              </div>
            </div>
            <button onClick={onClose} disabled={submitting}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors disabled:opacity-50">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          <form
            id="up-edit-form" onSubmit={handleSubmit} autoComplete="off"
            className="p-5 space-y-4 bg-gray-50"
            style={{ overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`#up-edit-form::-webkit-scrollbar{display:none}`}</style>
            <div style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none', height: 0 }} aria-hidden="true">
              <input type="text" name="fake_u" tabIndex={-1} autoComplete="username" />
            </div>
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3.5">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 leading-relaxed">{error}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field icon={User} label="First Name" name="first_name" placeholder="John" required />
              <Field icon={User} label="Last Name"  name="last_name"  placeholder="Doe"  required />
            </div>
            <Field icon={Mail} label="Email" name="email" type="email" placeholder="john@example.com" required />
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                Username and role cannot be changed here. Contact a system administrator if needed.
              </p>
            </div>
          </form>

          <div className="flex-shrink-0 px-5 py-4 border-t border-gray-200 bg-white flex gap-2.5">
            <button type="button" onClick={onClose} disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50 flex-shrink-0">
              Cancel
            </button>
            <button type="submit" form="up-edit-form" disabled={submitting}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-teal-600/25">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><CheckCircle className="w-4 h-4" />Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TOAST
// ============================================================================

const Toast = ({ message, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed bottom-6 left-1/2 z-[99999]"
      style={{ transform: 'translateX(-50%)', animation: 'upSlideUp .3s cubic-bezier(.16,1,.3,1)' }}>
      <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl text-white text-sm font-semibold bg-teal-600"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,.22)' }}>
        <CheckCircle className="w-4 h-4 flex-shrink-0" />
        {message}
      </div>
    </div>
  );
};

// ============================================================================
// DETAIL ROW
// ============================================================================

const DetailRow = ({ icon: Icon, label, value, mono, iconClass = 'text-teal-500', iconBgClass = 'bg-teal-50 border-teal-100' }) => (
  <div className="flex items-center gap-4 py-3.5 border-b border-gray-100 last:border-0">
    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${iconBgClass}`}>
      {Icon && <Icon className={`w-4 h-4 ${iconClass}`} />}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm font-semibold text-gray-800 truncate ${mono ? 'font-mono' : ''}`}>
        {value || <span className="text-gray-300 font-normal italic text-xs">Not provided</span>}
      </p>
    </div>
  </div>
);

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function UserProfile() {
  const { username } = useParams();
  const navigate     = useNavigate();

  const [user,     setUser]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [toast,    setToast]    = useState(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const res = await getUsers({ search: username, page: 1, page_size: 20 });
      let found = null;
      if (res.status === 'success' && res.data) {
        const results = res.data.results || (Array.isArray(res.data) ? res.data : []);
        found = results.find(u => u.username === username);
      }
      if (!found) throw new Error(`User "${username}" not found`);
      setUser(found);
    } catch (err) {
      setError(err.message || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const handleEditSuccess = (updated) => {
    setUser(updated);
    setEditOpen(false);
    setToast('Profile updated successfully');
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-teal-600 animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500 font-medium">Loading profile…</p>
      </div>
    </div>
  );

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !user) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">User Not Found</h2>
        <p className="text-sm text-gray-500 mb-6">{error || 'This user does not exist.'}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('/users')}
            className="px-5 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-all">
            Back to Users
          </button>
          <button onClick={fetchUser}
            className="px-5 py-2.5 border border-gray-300 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all">
            Retry
          </button>
        </div>
      </div>
    </div>
  );

  // ── Computed ──────────────────────────────────────────────────────────────
  const fullName  = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
  const initials  = `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase()
                    || user.username?.[0]?.toUpperCase() || 'U';
  const roleName  = user.role?.name || user.role_name || 'User';
  const rs        = getRoleStyle(roleName);
  const avatarGrad = getAvatarGrad(user.username || fullName);
  const isActive  = user.is_active !== false;

  return (
    <>
      <style>{`
        @keyframes upFadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes upScaleIn { from{opacity:0;transform:scale(.96) translateY(6px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes upSlideUp { from{opacity:0;transform:translateX(-50%) translateY(16px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes upCardIn  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .up-c0{animation:upCardIn .38s cubic-bezier(.16,1,.3,1) .00s both}
        .up-c1{animation:upCardIn .38s cubic-bezier(.16,1,.3,1) .07s both}
        .up-c2{animation:upCardIn .38s cubic-bezier(.16,1,.3,1) .14s both}
        .up-c3{animation:upCardIn .38s cubic-bezier(.16,1,.3,1) .21s both}
      `}</style>

      <div className="space-y-5 max-w-5xl">

        {/* ── Breadcrumb + actions row ── */}
        <div className="up-c0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/users')}
              className="w-9 h-9 rounded-xl border border-gray-300 bg-white flex items-center justify-center hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-xs text-gray-400 font-medium cursor-pointer hover:text-teal-600 transition-colors"
                  onClick={() => navigate('/users')}
                >
                  Users
                </span>
                <span className="text-gray-300 text-xs">/</span>
                <span className="text-xs text-gray-600 font-semibold">{fullName}</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 leading-snug mt-0.5">User Profile</h1>
            </div>
          </div>

          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-teal-600/25 active:scale-[.98]"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>
        </div>

        {/* ── HERO CARD — clean, no banner overlap ── */}
        <div className="up-c1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Top accent strip */}
          <div className={`h-1.5 w-full bg-gradient-to-r ${avatarGrad}`} />

          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">

              {/* Avatar circle */}
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0 select-none`}>
                {initials}
              </div>

              {/* Info block */}
              <div className="flex-1 min-w-0">
                {/* Name + status */}
                <div className="flex flex-wrap items-center gap-2.5 mb-1">
                  <h2 className="text-2xl font-bold text-gray-900 leading-tight">{fullName}</h2>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border
                    ${isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Username */}
                <p className="text-sm text-gray-400 mb-3">
                  @<span className="font-mono text-gray-500 font-medium">{user.username}</span>
                </p>

                {/* Pills row */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Role */}
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${rs.bg} ${rs.text} ${rs.border}`}>
                    <Shield className="w-3.5 h-3.5" />
                    {roleName}
                  </span>
                  {/* Email */}
                  {user.email && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-xl text-xs font-medium text-gray-600 border border-gray-200">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      {user.email}
                    </span>
                  )}
                  {/* Joined */}
                  {user.created_at && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-xl text-xs font-medium text-gray-600 border border-gray-200">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      Joined {fmtDate(user.created_at)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── GRID: Account Details + Role & Status ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Account Details */}
          <div className="up-c2 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center">
                  <User className="w-4 h-4 text-teal-600" />
                </div>
                <h3 className="text-sm font-bold text-gray-800">Account Details</h3>
              </div>
              <button
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition-all"
              >
                <Edit2 className="w-3 h-3" /> Edit
              </button>
            </div>
            <div className="px-5 pb-1">
              <DetailRow icon={User} label="First Name" value={user.first_name} />
              <DetailRow icon={User} label="Last Name"  value={user.last_name} />
              <DetailRow icon={Mail} label="Email"      value={user.email}
                iconClass="text-teal-500" iconBgClass="bg-teal-50 border-teal-100" />
              <DetailRow icon={User} label="Username"   value={user.username} mono />
            </div>
          </div>

          {/* Role & Status */}
          <div className="up-c2 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-200">
              <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center">
                <Shield className="w-4 h-4 text-purple-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-800">Role & Status</h3>
            </div>
            <div className="px-5 py-4 space-y-3">

              {/* Role */}
              <div className={`flex items-center gap-4 p-4 rounded-xl border ${rs.border} ${rs.cardBg}`}>
                <div className={`w-11 h-11 rounded-xl ${rs.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className={`text-base font-bold ${rs.text}`}>{roleName}</p>
                  <p className={`text-xs ${rs.text} opacity-70 font-medium mt-0.5`}>
                    {roleName.toLowerCase() === 'admin'   ? 'Full system access & administration' :
                     roleName.toLowerCase() === 'manager' ? 'Management & team oversight access'  :
                     'Standard read & write access'}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className={`flex items-center gap-4 p-4 rounded-xl border
                ${isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0
                  ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`}>
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className={`text-base font-bold ${isActive ? 'text-emerald-700' : 'text-red-700'}`}>
                    {isActive ? 'Active Account' : 'Inactive Account'}
                  </p>
                  <p className={`text-xs font-medium mt-0.5 ${isActive ? 'text-emerald-600' : 'text-red-500'}`}>
                    {isActive ? 'Account is enabled & accessible' : 'Account has been disabled'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Account Timeline — full width */}
          <div className="up-c3 bg-white rounded-2xl border border-gray-200 shadow-sm lg:col-span-2">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-200">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-800">Account Timeline</h3>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                <div className="flex items-start gap-3.5 p-4 rounded-xl bg-teal-50 border border-teal-200">
                  <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-1">Account Created</p>
                    <p className="text-sm font-bold text-teal-800">{fmtDateTime(user.created_at)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <Edit2 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Last Updated</p>
                    <p className="text-sm font-bold text-blue-800">{fmtDateTime(user.updated_at)}</p>
                  </div>
                </div>

                <div className={`flex items-start gap-3.5 p-4 rounded-xl border
                  ${isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                    ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`}>
                    <Activity className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wide mb-1
                      ${isActive ? 'text-emerald-600' : 'text-red-500'}`}>Current Status</p>
                    <p className={`text-sm font-bold ${isActive ? 'text-emerald-800' : 'text-red-700'}`}>
                      {isActive ? 'Active & Enabled' : 'Disabled'}
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>

      <EditUserModal isOpen={editOpen} onClose={() => setEditOpen(false)} onSuccess={handleEditSuccess} user={user} />
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}
