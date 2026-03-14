import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Bell, ChevronDown, User, Settings, Lock, LogOut,
  Menu, ArrowLeft, CheckCheck, Trash2, X, Users, FileText,
  Briefcase, CreditCard, Loader2,
} from 'lucide-react';
import { logout as authLogout } from '../services/authService';
import { useNotifications } from '../services/useNotifications';

export default function Navbar({ user, onLogout, pageTitle, onToggleSidebar, breadcrumbs }) {
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [showAllPanel, setShowAllPanel] = useState(false);

  const {
    notifications,
    unreadCount,
    loading: notifLoading,
    markAsRead,
    markAllRead,
    removeNotification,
    clearAllNotifications,
    getNotificationText,
    getNotificationCategory,
    getNavigationPath,
    formatTime,
  } = useNotifications();

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/clients');
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) markAsRead(notification.id);
    const path = getNavigationPath(notification);
    if (path) {
      setIsNotificationOpen(false);
      setShowAllPanel(false);
      navigate(path);
    }
  };

  // ─── Category icon + colour ────────────────────────────────────────────────
  const getCategoryStyle = (category) => {
    const map = {
      proforma:{ icon: <FileText className="w-3.5 h-3.5" />,   bg: 'bg-orange-50', ring: 'ring-orange-200', text: 'text-orange-500' },
      client:  { icon: <Users className="w-3.5 h-3.5" />,      bg: 'bg-teal-50',   ring: 'ring-teal-200',   text: 'text-teal-600' },
      invoice: { icon: <FileText className="w-3.5 h-3.5" />,   bg: 'bg-blue-50',   ring: 'ring-blue-200',   text: 'text-blue-600' },
      project: { icon: <Briefcase className="w-3.5 h-3.5" />,  bg: 'bg-violet-50', ring: 'ring-violet-200', text: 'text-violet-600' },
      payment: { icon: <CreditCard className="w-3.5 h-3.5" />, bg: 'bg-emerald-50',ring: 'ring-emerald-200',text: 'text-emerald-600' },
      default: { icon: <Bell className="w-3.5 h-3.5" />,       bg: 'bg-gray-100',  ring: 'ring-gray-200',   text: 'text-gray-500' },
    };
    return map[category] || map.default;
  };

  // ─── Shared notification row ───────────────────────────────────────────────
  const NotificationRow = ({ notification, compact = false }) => {
    const category  = getNotificationCategory(notification);
    const { icon, bg, ring, text } = getCategoryStyle(category);
    const navPath   = getNavigationPath(notification);
    const isUnread  = !notification.is_read;

    // Status badge for proforma events
    const et = (notification.event_type || '').toUpperCase();
    const statusBadge = et.includes('APPROVED')
      ? { label: 'Approved', cls: 'bg-green-100 text-green-700' }
      : et.includes('REJECTED')
      ? { label: 'Rejected', cls: 'bg-red-100 text-red-600' }
      : et.includes('SUBMITTED')
      ? { label: 'Submitted', cls: 'bg-blue-100 text-blue-600' }
      : null;

    return (
      <div
        className={`
          group relative flex items-start gap-3 px-4 py-3.5
          border-b border-gray-100/80 transition-all duration-150
          ${isUnread ? 'bg-teal-100/70' : 'bg-white'}
          ${navPath ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}
        `}
        onClick={() => navPath && handleNotificationClick(notification)}
      >
        {/* Unread accent bar */}
        {isUnread && (
          <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-teal-500" />
        )}

        {/* Icon */}
        <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ${bg} ${ring} ${text}`}>
          {icon}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 pr-1">
          <p className={`text-[13px] leading-snug ${isUnread ? 'font-semibold text-gray-900' : 'font-normal text-gray-700'}`}>
            {getNotificationText(notification)}
          </p>
          {statusBadge && (
            <span className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusBadge.cls}`}>
              {statusBadge.label}
            </span>
          )}
          {navPath && (
            <span className={`text-[11px] font-medium ${text} mt-0.5 block`}>
              Click to view →
            </span>
          )}
          <p className="text-[11px] text-gray-400 mt-1">{formatTime(notification.created_at)}</p>
        </div>

        {/* Right: unread dot + delete button (always visible) */}
        <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
          {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />}
          <button
            className="p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all duration-150"
            title="Remove notification"
            onClick={(e) => { e.stopPropagation(); removeNotification(notification.id); }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  // ─── User helpers ──────────────────────────────────────────────────────────
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };
  const getUserTypeColor = (ut) => (
    { 'Super Admin':'bg-red-500', Admin:'bg-orange-500', Manager:'bg-cyan-500',
      Accountant:'bg-purple-500', Employee:'bg-green-500', User:'bg-blue-500' }[ut] || 'bg-gray-500'
  );
  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to logout?')) return;
    try { await authLogout(); } catch (_) {}
    onLogout();
  };

  const firstName  = user?.first_name || '';
  const lastName   = user?.last_name  || '';
  const fullName   = firstName && lastName ? `${firstName} ${lastName}` : user?.username || 'User';
  const userType   = user?.role?.name || 'User';
  const userEmail  = user?.email || '';

  const recentNotifs = notifications.slice(0, 5);

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════
          NAVBAR  — z-50, sticky
      ══════════════════════════════════════════════════════════════════ */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="w-full">
          <div className="flex items-center h-14 sm:h-16">

            {/* Left logo */}
            <div className="bg-slate-800 h-full flex items-center px-3 sm:px-4 lg:px-6 xl:px-10 flex-shrink-0 w-auto lg:w-72 gap-3">
              <button onClick={onToggleSidebar} className="lg:hidden p-2 rounded-lg hover:bg-slate-700 transition-colors">
                <Menu className="w-6 h-6 text-white" />
              </button>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-base sm:text-lg lg:text-xl font-bold text-white">E</span>
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-sm sm:text-base lg:text-lg font-bold text-white whitespace-nowrap">ERP System</h1>
                </div>
              </div>
            </div>

            {/* Center + Right */}
            <div className="flex-1 flex items-center justify-between px-3 sm:px-4 lg:px-6">

              {/* Page title */}
              <div className="flex-shrink-0 min-w-0 flex items-center gap-2">
                <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                {breadcrumbs && breadcrumbs.length > 0 ? (
                  <div className="flex items-center gap-2 min-w-0">
                    {breadcrumbs.map((crumb, i) => (
                      <div key={i} className="flex items-center gap-2 min-w-0">
                        {i > 0 && <span className="text-gray-400 flex-shrink-0">→</span>}
                        <span className={`text-sm sm:text-base lg:text-xl font-semibold truncate ${i === breadcrumbs.length - 1 ? 'text-gray-800' : 'text-gray-400'}`}>
                          {crumb}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <h2 className="text-sm sm:text-base lg:text-xl font-semibold text-gray-800 truncate">
                    {pageTitle || 'Dashboard'}
                  </h2>
                )}
              </div>

              {/* Right controls */}
              <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-3">

                {/* Search */}
                <div className="relative hidden sm:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="pl-9 pr-4 py-2 text-sm bg-gray-100 rounded-lg border border-transparent focus:outline-none focus:border-teal-400 focus:bg-white transition-colors w-40 lg:w-56"
                  />
                </div>

                {/* ── Bell ──────────────────────────────────────────────── */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsNotificationOpen((v) => !v);
                      setShowAllPanel(false);
                    }}
                    className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label="Notifications"
                  >
                    {notifLoading
                      ? <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      : <Bell className="w-5 h-5 text-gray-600" />
                    }
                    {unreadCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-[10px] font-bold text-white leading-none px-0.5">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      </span>
                    )}
                  </button>

                  {/* ── Small dropdown (recent 5) ────────────────────────── */}
                  {isNotificationOpen && !showAllPanel && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsNotificationOpen(false)} />
                      <div className="absolute right-0 mt-2 w-80 sm:w-[360px] bg-white rounded-2xl shadow-xl border border-gray-100 z-20 overflow-hidden">

                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">Notifications</span>
                            {unreadCount > 0 && (
                              <span className="bg-teal-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                {unreadCount}
                              </span>
                            )}
                          </div>
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllRead}
                              className="flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-700 font-medium"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              Mark all read
                            </button>
                          )}
                        </div>

                        {/* List */}
                        <div className="max-h-[300px] overflow-y-auto">
                          {recentNotifs.length === 0 ? (
                            <div className="py-10 flex flex-col items-center gap-2 text-gray-400">
                              <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center">
                                <Bell className="w-5 h-5 opacity-40" />
                              </div>
                              <p className="text-sm font-medium text-gray-500">All caught up!</p>
                              <p className="text-xs text-gray-400">No new notifications</p>
                            </div>
                          ) : (
                            recentNotifs.map((n) => (
                              <NotificationRow key={n.id} notification={n} compact />
                            ))
                          )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50/70">
                          <button
                            className="text-[12px] font-semibold text-teal-600 hover:text-teal-700 transition-colors"
                            onClick={() => { setShowAllPanel(true); setIsNotificationOpen(false); }}
                          >
                            View all  ({notifications.length})
                          </button>
                          {notifications.length > 0 && (
                            <button
                              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-500 font-medium transition-colors"
                              onClick={() => { clearAllNotifications(); setIsNotificationOpen(false); }}
                            >
                              <Trash2 className="w-3 h-3" />
                              Clear all
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                {/* ── End Bell ──────────────────────────────────────────── */}

                {/* Profile */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-2 lg:space-x-3 p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-2 lg:space-x-3">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center shadow-md">
                        <span className="text-xs sm:text-sm font-bold text-white">{getInitials(fullName)}</span>
                      </div>
                      <div className="hidden md:block text-left">
                        <p className="text-xs sm:text-sm font-semibold text-gray-800 leading-tight whitespace-nowrap">{fullName}</p>
                        <p className="text-xs text-gray-500 leading-tight whitespace-nowrap">{userType}</p>
                      </div>
                    </div>
                    <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 hidden md:block" />
                  </button>

                  {isProfileOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)} />
                      <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-20">
                        <div className="p-3 sm:p-4 border-b border-gray-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                              <span className="text-base sm:text-lg font-bold text-white">{getInitials(fullName)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">{fullName}</p>
                              <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold text-white rounded-full ${getUserTypeColor(userType)}`}>
                                {userType}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 mt-2 truncate">{userEmail}</p>
                        </div>
                        <div className="py-1.5">
                          {[
                            { label: 'My Profile',       icon: <User className="w-4 h-4" />,     path: '/profile' },
                            { label: 'Settings',         icon: <Settings className="w-4 h-4" />, path: '/settings' },
                            { label: 'Change Password',  icon: <Lock className="w-4 h-4" />,     path: '/change-password' },
                          ].map(({ label, icon, path }) => (
                            <button key={label}
                              className="w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2.5 rounded-lg mx-1 w-[calc(100%-8px)]"
                              onClick={() => { navigate(path); setIsProfileOpen(false); }}>
                              <span className="text-gray-400">{icon}</span>{label}
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-gray-100 py-1.5">
                          <button onClick={handleLogout}
                            className="w-full text-left px-4 py-2 text-xs sm:text-sm text-red-500 hover:bg-red-50 transition-colors font-medium flex items-center gap-2.5 rounded-lg mx-1 w-[calc(100%-8px)]">
                            <LogOut className="w-4 h-4" />Logout
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════
          ALL NOTIFICATIONS PANEL
          ▸ Starts BELOW the navbar (top-14 sm:top-16)
          ▸ Only covers the content area, not the full viewport height
          ▸ Clean, minimal, professional
      ══════════════════════════════════════════════════════════════════ */}
      {showAllPanel && (
        <>
          {/* Semi-transparent backdrop — starts below navbar */}
          <div
            className="fixed top-14 sm:top-16 left-0 right-0 bottom-0 bg-black/20 z-40"
            onClick={() => setShowAllPanel(false)}
          />

          {/* Panel — anchored below navbar, right side */}
          <div className="fixed top-14 sm:top-16 right-0 bottom-0 w-full sm:w-[400px] bg-white z-50 flex flex-col border-l border-gray-200 shadow-2xl">

            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="text-[15px] font-bold text-gray-900">All Notifications</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {notifications.length} total · {unreadCount} unread
                </p>
              </div>
              <button
                onClick={() => setShowAllPanel(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action row — only if there are notifications */}
            {notifications.length > 0 && (
              <div className="flex items-center justify-between px-5 py-2 border-b border-gray-100 bg-gray-50/60 flex-shrink-0">
                {unreadCount > 0 ? (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1.5 text-[12px] text-teal-600 hover:text-teal-700 font-medium transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all as read
                  </button>
                ) : (
                  <span className="text-[12px] text-gray-400">All caught up</span>
                )}
                <button
                  onClick={clearAllNotifications}
                  className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-red-500 font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear all
                </button>
              </div>
            )}

            {/* Notification list */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 pb-16">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <Bell className="w-7 h-7 opacity-30" />
                  </div>
                  <p className="text-sm font-semibold text-gray-500">No notifications</p>
                  <p className="text-xs text-gray-400">You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100/80">
                  {notifications.map((n) => (
                    <NotificationRow key={n.id} notification={n} />
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      )}
    </>
  );
}