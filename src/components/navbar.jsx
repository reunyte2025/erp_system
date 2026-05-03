import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, ChevronDown, User, Settings, Lock, LogOut,
  Menu, ArrowLeft, CheckCheck, Trash2, X, Users, FileText,
  Briefcase, CreditCard, ChevronRight, Building2,
  Store, Tag, Receipt, Eye, RefreshCw,
} from 'lucide-react';
import { logout as authLogout } from '../services/authService';
import { useNotifications } from '../services/useNotifications';
import api from '../services/api';

export default function Navbar({ user, onLogout, pageTitle, onToggleSidebar, breadcrumbs }) {
  const navigate = useNavigate();
  const [isProfileOpen,      setIsProfileOpen]      = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [showAllPanel,       setShowAllPanel]       = useState(false);
  const [activeTab,          setActiveTab]          = useState('all'); // 'all' | 'approvals' | 'alerts'
  const [loadingNotifId,     setLoadingNotifId]     = useState(null);  // tracks which notification is resolving
  const [quotationTypeCache, setQuotationTypeCache] = useState({});    // { [entity_id]: true/false } — true = isPO

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllRead,
    removeNotification,
    clearAllNotifications,
    getNotificationText,
    getNotificationCategory,
    formatTime,
  } = useNotifications();

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/clients');
  };

  // ─── Bell click: if "All panel" is open → close it; otherwise toggle dropdown ─
  const handleBellClick = () => {
    if (showAllPanel) {
      setShowAllPanel(false);
      return;
    }
    setIsNotificationOpen((prev) => !prev);
    setIsProfileOpen(false);
  };

  // ─── Nav path resolver ────────────────────────────────────────────────────
  // Returns { path, state } or null.
  //
  // CRITICAL: The backend sends entity_type in UPPERCASE strings:
  //   "INVOICE", "Proforma", "QUOTATION", "PURCHASE_ORDER", "Client", "NOC"
  // We normalise with toUpperCase() before matching so casing never matters.
  //
  // invoice_type state hint: viewinvoicedetails.jsx reads location.state.invoiceType
  // and uses it as a priority hint to hit the correct API endpoint first,
  // avoiding "Vendor #null" placeholders.
  //
  // NOTE: QUOTATION / PURCHASE_ORDER events are intentionally NOT handled here —
  // they are always resolved async in handleNotificationClick because the backend
  // uses entity_type="QUOTATION" for BOTH client quotations AND purchase orders,
  // so we must fetch the record to check quotation_type before routing.
  const resolveNavPath = (notification) => {
    const { entity_type, entity_id, event_type, metadata } = notification;
    const et  = (event_type   || '').toUpperCase();
    const etp = (entity_type  || '').toUpperCase();
    const meta = typeof metadata === 'object' && metadata !== null ? metadata : {};

    // ── Derive invoice_type hint from event_type string ────────────────────
    // viewinvoicedetails reads location.state.invoiceType and tries that
    // endpoint first, avoiding unnecessary waterfall fetches.
    const invoiceTypeHint = (() => {
      const metadataType = String(
        meta.invoice_type ||
        meta.invoiceType ||
        meta.type ||
        meta.quotation_type ||
        ''
      ).toLowerCase();
      if (metadataType.includes('vendor') || metadataType.includes('purchase')) return 'Vendor Compliance';
      if (metadataType.includes('execution')) return 'Execution Compliance';
      if (metadataType.includes('regulatory')) return 'Regulatory Compliance';
      if (meta.vendor || meta.vendor_id || meta.vendor_name || meta.quotation) return 'Vendor Compliance';
      if (et.includes('REGULATORY')) return 'Regulatory Compliance';
      if (et.includes('EXECUTION'))  return 'Execution Compliance';
      // PURCHASE_ORDER or VENDOR events → vendor invoice endpoint
      if (et.includes('VENDOR') || et.includes('PURCHASE_ORDER')) return 'Vendor Compliance';
      // entity_type=PURCHASE_ORDER or entity_type=Purchase → always a vendor invoice
      if (etp === 'PURCHASE_ORDER' || entity_type === 'Purchase') return 'Vendor Compliance';
      return '';
    })();

    // ── QUOTATION / PURCHASE_ORDER ─────────────────────────────────────────
    // Both entity_types share the same backend entity_type="QUOTATION" or
    // "PURCHASE_ORDER" — resolved async in handleNotificationClick.
    // Return null here so the caller knows to go async.
    if (etp === 'QUOTATION' || etp === 'PURCHASE_ORDER' ||
        et.includes('QUOTATION') || et.includes('PURCHASE_ORDER')) {
      return null; // handled async
    }

    // ── INVOICE ────────────────────────────────────────────────────────────
    // entity_type from API: "INVOICE" (uppercase)
    if (etp === 'INVOICE' || et.includes('INVOICE') || et.includes('PAYMENT')) {
      return entity_id
        ? { path: `/invoices/${entity_id}`, state: { invoiceType: invoiceTypeHint } }
        : { path: '/invoices', state: {} };
    }

    // ── PROFORMA ───────────────────────────────────────────────────────────
    // entity_type from API: "Proforma" (mixed case)
    if (etp === 'PROFORMA' || et.includes('PROFORMA')) {
      return entity_id
        ? { path: `/proforma/${entity_id}`, state: {} }
        : { path: '/proforma', state: {} };
    }

    // ── CLIENT ─────────────────────────────────────────────────────────────
    // entity_type from API: "Client"
    // event_type: "client_created" (lowercase) → et uppercased = "CLIENT_CREATED"
    if (etp === 'CLIENT' || et.includes('CLIENT')) {
      return entity_id
        ? { path: `/clients/${entity_id}`, state: {} }
        : { path: '/clients', state: {} };
    }

    // ── PROJECT ────────────────────────────────────────────────────────────
    if (etp === 'PROJECT' || et.includes('PROJECT')) {
      return entity_id
        ? { path: `/projects/${entity_id}`, state: {} }
        : { path: '/projects', state: {} };
    }

    // ── VENDOR ─────────────────────────────────────────────────────────────
    if (etp === 'VENDOR' || et.includes('VENDOR')) {
      return entity_id
        ? { path: `/vendors/${entity_id}`, state: {} }
        : { path: '/vendors', state: {} };
    }

    // ── NOC ────────────────────────────────────────────────────────────────
    // NOC events (NOC_CREATED, NOC_SUBMITTED, NOC_APPROVED, NOC_REJECTED,
    // NOC_UPDATED, NOC_REAPPLIED) — route to NOC list; no detail page assumed.
    if (etp === 'NOC' || et.includes('NOC')) {
      return { path: '/noc', state: {} };
    }

    return null;
  };

  // ─── Smart click handler ───────────────────────────────────────────────────
  // QUOTATION / PURCHASE_ORDER: fetch to determine real type → route correctly.
  // All other events: synchronous resolution via resolveNavPath.
  //
  // Why async for quotations?
  //   Backend sends entity_type="QUOTATION" for BOTH client quotations (type=1)
  //   AND purchase orders (type=2). We call GET_REGULATORY to read quotation_type
  //   and route to /quotations/:id or /purchase/:id accordingly.
  //   We also try GET_PURCHASE_ORDER as fallback so either endpoint works.
  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) markAsRead(notification.id);

    const { entity_id, event_type, entity_type, metadata } = notification;
    const et  = (event_type  || '').toUpperCase();
    const etp = (entity_type || '').toUpperCase();
    const meta = typeof metadata === 'object' && metadata !== null ? metadata : {};

    // ── QUOTATION or PURCHASE_ORDER — must resolve async ──────────────────
    const isQuotationEvent   = et.includes('QUOTATION');
    const isPurchaseOrderEvt = etp === 'PURCHASE_ORDER' || et.includes('PURCHASE_ORDER');

    if ((isQuotationEvent || isPurchaseOrderEvt) && entity_id) {
      setLoadingNotifId(notification.id);

      const closeDropdowns = () => {
        setIsNotificationOpen(false);
        setShowAllPanel(false);
      };

      try {
        // Strategy 1: try the regulatory/client quotation endpoint first
        // It returns quotation_type which tells us client vs vendor (PO).
        let isPO = isPurchaseOrderEvt; // if event_type itself says PURCHASE_ORDER, trust it
        let resolved = false;

        if (!isPO) {
          try {
            const res = await api.get('/quotations/get_regulatory_quotation/', { params: { id: entity_id } });
            const record = res.data?.data ?? res.data ?? {};
            if (record && (record.id || record.quotation_number)) {
              // quotation_type contains "Vendor" → it's a purchase order
              isPO = (record.quotation_type || '').toLowerCase().includes('vendor')
                || (record.client === null && record.vendor != null);
              resolved = true;
            }
          } catch (_) { /* try next strategy */ }
        }

        // Strategy 2: if regulatory endpoint failed or returned nothing, try purchase order endpoint
        if (!resolved && !isPO) {
          try {
            const res2 = await api.get('/quotations/get_purchase_order/', { params: { id: entity_id } });
            const record2 = res2.data?.data ?? res2.data ?? {};
            if (record2 && (record2.id || record2.quotation_number)) {
              isPO = true;
              resolved = true;
            }
          } catch (_) { /* fall through to default */ }
        }

        // Cache so label updates immediately on future renders without refetch
        setQuotationTypeCache(prev => ({ ...prev, [entity_id]: isPO }));

        const path = isPO ? `/purchase/${entity_id}` : `/quotations/${entity_id}`;
        closeDropdowns();
        navigate(path, { state: { quotationType: isPO ? 'vendor' : 'client' } });
      } catch (_) {
        // Hard fallback — go to quotations list
        setIsNotificationOpen(false);
        setShowAllPanel(false);
        navigate('/quotations', { state: {} });
      } finally {
        setLoadingNotifId(null);
      }
      return;
    }

    // ── All other events — synchronous ────────────────────────────────────
    if ((etp === 'INVOICE' || et.includes('INVOICE') || et.includes('PAYMENT')) && entity_id) {
      const closeDropdowns = () => {
        setIsNotificationOpen(false);
        setShowAllPanel(false);
      };

      const normalizeInvoiceTypeHint = (value = '') => {
        const t = String(value || '').toLowerCase();
        if (t.includes('vendor') || t.includes('purchase')) return 'Vendor Compliance';
        if (t.includes('execution')) return 'Execution Compliance';
        if (t.includes('regulatory')) return 'Regulatory Compliance';
        return '';
      };

      const metadataHint = normalizeInvoiceTypeHint(
        meta.invoice_type || meta.invoiceType || meta.type || meta.quotation_type
      ) || ((meta.vendor || meta.vendor_id || meta.vendor_name || meta.quotation) ? 'Vendor Compliance' : '');

      let invoiceType = metadataHint;
      let invoiceData = null;

      if (!invoiceType) {
        setLoadingNotifId(notification.id);
        try {
          const res = await api.get('/invoices/get_all_invoices/', { params: { page: 1, page_size: 1000 } });
          const rows = res.data?.data?.results || res.data?.results || [];
          const found = rows.find((inv) => String(inv.id) === String(entity_id));
          if (found) {
            invoiceData = found;
            invoiceType = normalizeInvoiceTypeHint(found.invoice_type) ||
              (found.vendor || found.vendor_name || found.quotation ? 'Vendor Compliance' : '');
          }
        } catch (_) {
          // The detail page still has its endpoint fallback cascade.
        } finally {
          setLoadingNotifId(null);
        }
      }

      closeDropdowns();
      navigate(`/invoices/${entity_id}`, {
        state: {
          invoiceType,
          invoiceData: invoiceData || (Object.keys(meta).length ? meta : null),
        },
      });
      return;
    }

    const resolved = resolveNavPath(notification);
    if (resolved) {
      setIsNotificationOpen(false);
      setShowAllPanel(false);
      navigate(resolved.path, { state: resolved.state });
    }
  };

  // ─── Category style ───────────────────────────────────────────────────────
  const getCategoryStyle = (category, eventType = '') => {
    const et = (eventType || '').toUpperCase();
    if (et.includes('APPROVED')) return { icon: <CheckCheck className="w-4 h-4" />, bg: 'bg-emerald-500/15', text: 'text-emerald-500', label: 'Approved',  labelCls: 'text-emerald-600 bg-emerald-50' };
    if (et.includes('REJECTED')) return { icon: <X className="w-4 h-4" />,          bg: 'bg-red-500/15',     text: 'text-red-500',     label: 'Rejected',  labelCls: 'text-red-600 bg-red-50' };
    if (et.includes('SUBMITTED'))return { icon: <FileText className="w-4 h-4" />,   bg: 'bg-blue-500/15',    text: 'text-blue-500',    label: 'Submitted', labelCls: 'text-blue-600 bg-blue-50' };

    const map = {
      proforma:  { icon: <FileText className="w-4 h-4" />,  bg: 'bg-orange-500/15', text: 'text-orange-500', label: 'Proforma',       labelCls: 'text-orange-600 bg-orange-50' },
      quotation: { icon: <FileText className="w-4 h-4" />,  bg: 'bg-purple-500/15', text: 'text-purple-600', label: 'Quotation',      labelCls: 'text-purple-600 bg-purple-50' },
      client:    { icon: <Users className="w-4 h-4" />,     bg: 'bg-teal-500/15',   text: 'text-teal-600',   label: 'Client',         labelCls: 'text-teal-700 bg-teal-50' },
      invoice:   { icon: <Receipt className="w-4 h-4" />,   bg: 'bg-blue-500/15',   text: 'text-blue-600',   label: 'Invoice',        labelCls: 'text-blue-600 bg-blue-50' },
      project:   { icon: <Briefcase className="w-4 h-4" />, bg: 'bg-violet-500/15', text: 'text-violet-600', label: 'Project',        labelCls: 'text-violet-600 bg-violet-50' },
      payment:   { icon: <CreditCard className="w-4 h-4" />,bg: 'bg-emerald-500/15',text: 'text-emerald-600',label: 'Payment',        labelCls: 'text-emerald-600 bg-emerald-50' },
      vendor:    { icon: <Store className="w-4 h-4" />,     bg: 'bg-amber-500/15',  text: 'text-amber-600',  label: 'Vendor',         labelCls: 'text-amber-600 bg-amber-50' },
      purchase:  { icon: <Tag className="w-4 h-4" />,       bg: 'bg-cyan-500/15',   text: 'text-cyan-600',   label: 'Purchase Order', labelCls: 'text-cyan-600 bg-cyan-50' },
      default:   { icon: <Bell className="w-4 h-4" />,      bg: 'bg-gray-200',      text: 'text-gray-500',   label: 'Update',         labelCls: 'text-gray-600 bg-gray-100' },
    };
    return map[category] || map.default;
  };

  // ─── Filter tabs logic ────────────────────────────────────────────────────
  const getFilteredNotifications = (list) => {
    if (activeTab === 'approvals') {
      return list.filter(n => {
        const et = (n.event_type || '').toUpperCase();
        return et.includes('APPROVED') || et.includes('REJECTED') || et.includes('SUBMITTED');
      });
    }
    if (activeTab === 'alerts') {
      return list.filter(n => {
        const et = (n.event_type || '').toUpperCase();
        return et.includes('CREATED') || et.includes('UPDATED') || et.includes('DELETED') || et.includes('PAYMENT');
      });
    }
    return list;
  };

  // ─── Shared notification row ───────────────────────────────────────────────
  const NotificationRow = ({ notification, inPanel = false }) => {
    const rawCategory = getNotificationCategory(notification);
    // For QUOTATION events: check cache first (populated on first click),
    // then fall back to metadata heuristic (vendor set, client null)
    const et0  = (notification.event_type  || '').toUpperCase();
    const etp0 = (notification.entity_type || '').toUpperCase();
    const meta0 = typeof notification.metadata === 'object' && notification.metadata !== null ? notification.metadata : {};
    const cachedIsPO     = quotationTypeCache[notification.entity_id];
    const heuristicIsPO  = meta0.vendor !== undefined && meta0.vendor !== null && meta0.client === null;
    // Show 'purchase' badge for explicit PURCHASE_ORDER events, or QUOTATION events
    // that are cached/heuristically identified as purchase orders
    const isPOEvent      = etp0 === 'PURCHASE_ORDER' || et0.includes('PURCHASE_ORDER');
    const isQuotationPO  = et0.includes('QUOTATION') && (cachedIsPO === true || (cachedIsPO === undefined && heuristicIsPO));
    const category       = (isPOEvent || isQuotationPO) ? 'purchase' : rawCategory;
    const { icon, bg, text, label, labelCls } = getCategoryStyle(category, notification.event_type);
    const et  = (notification.event_type  || '').toUpperCase();
    const etp = (notification.entity_type || '').toUpperCase();
    // QUOTATION / PURCHASE_ORDER events are always clickable — resolved async in handleNotificationClick
    const isAsyncEvent = (et.includes('QUOTATION') || et.includes('PURCHASE_ORDER') || etp === 'PURCHASE_ORDER')
      && Boolean(notification.entity_id);
    const resolvedNav  = isAsyncEvent ? { path: '__async__', state: {} } : resolveNavPath(notification);
    const hasNavTarget = Boolean(resolvedNav);
    const isUnread     = !notification.is_read;
    const isResolving  = loadingNotifId === notification.id;

    return (
      <div
        className={`
          group relative p-4 transition-all duration-150
          border-b border-gray-100/80
          ${isUnread ? 'bg-teal-50/60' : 'bg-white hover:bg-gray-50/80'}
          ${hasNavTarget ? (isResolving ? 'cursor-wait opacity-70' : 'cursor-pointer') : ''}
        `}
        onClick={() => !isResolving && hasNavTarget && handleNotificationClick(notification)}
      >
        {/* Unread accent bar */}
        {isUnread && (
          <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-gradient-to-b from-teal-400 to-teal-600" />
        )}

        <div className="flex gap-3.5">
          {/* Icon bubble */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg} ${text} transition-transform duration-200 group-hover:scale-105`}>
            {icon}
          </div>

          <div className="flex-1 min-w-0">
            {/* Top row: label + time */}
            <div className="flex items-center justify-between mb-0.5">
              <span className={`text-[10px] font-black tracking-widest uppercase ${text}`}>{label}</span>
              <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{formatTime(notification.created_at)}</span>
            </div>

            {/* Message */}
            <p className={`text-[13px] leading-snug tracking-tight ${isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
              {(() => {
                const txt = getNotificationText(notification);
                // If we know this is a PO, replace "Quotation #" with "Purchase order #"
                if (category === 'purchase' && txt.toLowerCase().startsWith('quotation #')) {
                  return txt.replace(/^Quotation #/i, 'Purchase order #');
                }
                return txt;
              })()}
            </p>

            {/* Hover action buttons */}
            <div className="flex gap-2 mt-2.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
              {hasNavTarget && (
                <button
                  onClick={(e) => { e.stopPropagation(); if (!isResolving) handleNotificationClick(notification); }}
                  disabled={isResolving}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-sm border border-gray-100 bg-white ${text} hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-wait`}
                >
                  {isResolving
                    ? <RefreshCw className="w-3 h-3 animate-spin" />
                    : <Eye className="w-3 h-3" />
                  }
                  {isResolving ? 'Opening...' : 'View'}
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); removeNotification(notification.id); }}
                className="p-1.5 rounded-lg bg-white shadow-sm border border-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
                title="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Unread pulse dot */}
          {isUnread && (
            <div className="flex-shrink-0 pt-1">
              <span className="w-2 h-2 rounded-full bg-teal-500 block animate-pulse" />
            </div>
          )}
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
    { 'Super Admin': 'bg-red-500', Admin: 'bg-orange-500', Manager: 'bg-cyan-500',
      Accountant: 'bg-purple-500', Employee: 'bg-green-500', User: 'bg-blue-500' }[ut] || 'bg-gray-500'
  );
  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to logout?')) return;
    try { await authLogout(); } catch (_) {}
    onLogout();
  };

  const firstName = user?.first_name || '';
  const lastName  = user?.last_name  || '';
  const fullName  = firstName && lastName ? `${firstName} ${lastName}` : user?.username || 'User';
  const userType  = user?.role?.name || 'User';
  const userEmail = user?.email || '';

  // NOTE: No pre-fetch useEffect here.
  // Quotation type (client quotation vs purchase order) is resolved lazily on click
  // via handleNotificationClick, which uses the correct GET_REGULATORY endpoint.
  // Pre-fetching all quotation types on every notification poll would fire N API
  // calls every 30 seconds — one per QUOTATION notification — causing request spam.

  const filteredRecent = getFilteredNotifications(notifications).slice(0, 6);
  const filteredAll    = getFilteredNotifications(notifications);

  const tabs = [
    { id: 'all',       label: 'All',       count: notifications.length },
    { id: 'approvals', label: 'Approvals', count: notifications.filter(n => { const et = (n.event_type||'').toUpperCase(); return et.includes('APPROVED')||et.includes('REJECTED')||et.includes('SUBMITTED'); }).length },
    { id: 'alerts',    label: 'Alerts',    count: notifications.filter(n => { const et = (n.event_type||'').toUpperCase(); return et.includes('CREATED')||et.includes('UPDATED')||et.includes('DELETED')||et.includes('PAYMENT'); }).length },
  ];

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════
          NAVBAR — original design, completely unchanged
      ══════════════════════════════════════════════════════════════════ */}
      <nav className="bg-white border-b border-gray-200/80 sticky top-0 z-50 shadow-sm backdrop-blur-sm bg-white/95">
        <div className="w-full">
          <div className="flex items-center h-14 sm:h-16">

            {/* Left: Logo Section */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 h-full flex items-center px-3 sm:px-4 lg:px-5 flex-shrink-0 w-auto lg:w-64 gap-3 border-r border-slate-700/50">
              <button
                onClick={onToggleSidebar}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-700 transition-all duration-200 active:scale-95"
                aria-label="Toggle sidebar"
              >
                <Menu className="w-5 h-5 text-white" />
              </button>
              <div className="hidden lg:flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-orange-400 via-orange-500 to-red-500 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-md">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-bold text-white text-sm leading-tight">Constructuve</span>
                  <span className="text-orange-300 text-xs font-semibold leading-tight">India</span>
                </div>
              </div>
            </div>

            {/* Center: Back Button + Breadcrumbs / Page Title */}
            <div className="flex-1 flex items-center px-4 sm:px-6 lg:px-8 gap-2 sm:gap-3 min-w-0">
              {breadcrumbs && breadcrumbs.length > 0 && (
                <>
                  <button
                    onClick={handleBack}
                    className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 active:scale-95"
                    title="Go back"
                    aria-label="Go back"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600 transition-colors" />
                  </button>
                  <div className="hidden md:flex items-center gap-1.5 text-xs sm:text-sm overflow-x-auto">
                    {breadcrumbs.map((crumb, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="text-gray-700 font-medium">{crumb}</span>
                        {idx < breadcrumbs.length - 1 && (
                          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="md:hidden flex items-center gap-1.5 text-xs overflow-x-auto min-w-0">
                    {breadcrumbs.map((crumb, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="text-gray-700 font-medium">{crumb}</span>
                        {idx < breadcrumbs.length - 1 && (
                          <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
              {(!breadcrumbs || breadcrumbs.length === 0) && (
                <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">{pageTitle}</h1>
              )}
            </div>

            {/* Right: Actions & Profile */}
            <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 lg:px-6 flex-shrink-0">

              {/* ── Bell Icon ── */}
              <div className="relative">
                <button
                  onClick={handleBellClick}
                  className={`relative p-2 sm:p-2.5 rounded-lg transition-all duration-200 group
                    ${showAllPanel ? 'bg-slate-100 text-slate-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5 text-gray-600 group-hover:text-gray-900 transition-colors" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-5 h-5 bg-gradient-to-br from-red-500 to-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* ── Quick Notifications Dropdown (redesigned) ── */}
                {isNotificationOpen && !showAllPanel && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsNotificationOpen(false)} />

                    <div className="absolute right-0 mt-2 w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-100/80 z-20 flex flex-col overflow-hidden"
                      style={{ boxShadow: '0 20px 60px -10px rgba(0,0,0,0.18), 0 4px 20px rgba(0,0,0,0.08)' }}
                    >
                      {/* Dropdown header — dark, matches reference */}
                      <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <Bell className="w-4.5 h-4.5 text-teal-400" />
                            <span className="text-white font-bold tracking-tight text-[15px]">Notifications</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                              <span className="bg-teal-500 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                                {unreadCount} NEW
                              </span>
                            )}
                            <button onClick={() => setIsNotificationOpen(false)} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex gap-1 bg-white/10 rounded-lg p-1">
                          {tabs.map(tab => (
                            <button
                              key={tab.id}
                              onClick={() => setActiveTab(tab.id)}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-bold transition-all duration-200
                                ${activeTab === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                              {tab.label}
                              {tab.count > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black
                                  ${activeTab === tab.id ? 'bg-teal-100 text-teal-700' : 'bg-white/20 text-slate-300'}`}>
                                  {tab.count}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Notification list */}
                      <div className="flex-1 overflow-y-auto max-h-[340px] custom-scrollbar">
                        {filteredRecent.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                              <Bell className="w-5 h-5 text-gray-300" />
                            </div>
                            <p className="text-xs text-gray-400 font-medium">No notifications here</p>
                          </div>
                        ) : (
                          filteredRecent.map((n) => (
                            <NotificationRow key={n.id} notification={n} />
                          ))
                        )}
                      </div>

                      {/* Footer actions */}
                      <div className="border-t border-gray-100 bg-gray-50/80 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3">
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllRead}
                              className="flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-700 font-semibold transition-colors"
                            >
                              <CheckCheck className="w-3 h-3" />
                              Mark all read
                            </button>
                          )}
                          <button
                            onClick={() => { clearAllNotifications(); setIsNotificationOpen(false); }}
                            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-500 font-semibold transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            Clear all
                          </button>
                        </div>
                        <button
                          onClick={() => { setShowAllPanel(true); setIsNotificationOpen(false); }}
                          className="text-[11px] text-teal-600 hover:text-teal-700 font-bold transition-colors"
                        >
                          View all →
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* ── Profile Section (unchanged) ── */}
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-2 lg:space-x-3 p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 group"
                  aria-label="Profile menu"
                >
                  <div className="flex items-center space-x-2 lg:space-x-3">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                      <span className="text-xs sm:text-sm font-bold text-white">{getInitials(fullName)}</span>
                    </div>
                    <div className="hidden md:block text-left">
                      <p className="text-xs sm:text-sm font-semibold text-gray-800 leading-tight whitespace-nowrap">{fullName}</p>
                      <p className="text-xs text-gray-500 leading-tight whitespace-nowrap">{userType}</p>
                    </div>
                  </div>
                  <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 hidden md:block group-hover:rotate-180 transition-transform duration-300" />
                </button>

                {isProfileOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)} />
                    <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-20 overflow-hidden">
                      <div className="p-3 sm:p-4 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-cyan-50">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                            <span className="text-lg font-bold text-white">{getInitials(fullName)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">{fullName}</p>
                            <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold text-white rounded-full ${getUserTypeColor(userType)}`}>
                              {userType}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 truncate">{userEmail}</p>
                      </div>
                      <div className="py-1.5">
                        {[
                          { label: 'My Profile',      icon: <User className="w-4 h-4" />,     path: '/profile' },
                          { label: 'Settings',        icon: <Settings className="w-4 h-4" />, path: '/settings' },
                          { label: 'Change Password', icon: <Lock className="w-4 h-4" />,     path: '/change-password' },
                        ].map(({ label, icon, path }) => (
                          <button
                            key={label}
                            className="w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-teal-50 transition-all duration-200 flex items-center gap-2.5 rounded-lg mx-1 w-[calc(100%-8px)] group/menu-item"
                            onClick={() => { navigate(path); setIsProfileOpen(false); }}
                          >
                            <span className="text-gray-400 group-hover/menu-item:text-teal-600 transition-colors">{icon}</span>
                            <span className="group-hover/menu-item:text-teal-700 font-medium">{label}</span>
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-gray-100 py-1.5">
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 transition-all duration-200 font-medium flex items-center gap-2.5 rounded-lg mx-1 w-[calc(100%-8px)] group/logout"
                        >
                          <LogOut className="w-4 h-4 group-hover/logout:scale-110 transition-transform" />
                          Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════
          ALL NOTIFICATIONS PANEL — clean floating dropdown
      ══════════════════════════════════════════════════════════════════ */}
      {showAllPanel && (
        <>
          {/* Soft backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'transparent' }}
            onClick={() => setShowAllPanel(false)}
          />

          {/* Floating panel — anchored below navbar, right-aligned */}
          <div
            className="fixed z-50 all-notif-panel"
            style={{
              top: '70px',
              right: '16px',
              width: '380px',
              maxWidth: 'calc(100vw - 32px)',
              maxHeight: 'calc(100vh - 90px)',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '20px',
              overflow: 'hidden',
              background: '#ffffff',
              boxShadow: '0 24px 48px -8px rgba(15,23,42,0.22), 0 8px 20px rgba(15,23,42,0.10), 0 0 0 1px rgba(15,23,42,0.06)',
            }}
          >
            {/* ── Header — dark, matches small dropdown ── */}
            <div
              className="flex-shrink-0 px-4 pt-4 pb-3"
              style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(20,184,166,0.18)' }}>
                    <Bell className="w-4 h-4 text-teal-400" />
                  </div>
                  <div>
                    <h2 className="text-[14px] font-bold text-white leading-tight tracking-tight">All Notifications</h2>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      {notifications.length} total ·{' '}
                      <span className="text-teal-400 font-semibold">{unreadCount} unread</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAllPanel(false)}
                  className="w-7 h-7 rounded-xl flex items-center justify-center transition-all text-slate-400 hover:text-white"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Filter tabs */}
              <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.08)' }}>
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200
                      ${activeTab === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black
                        ${activeTab === tab.id ? 'bg-teal-100 text-teal-700' : 'bg-white/20 text-slate-300'}`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Action bar ── */}
            {notifications.length > 0 && (
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
                {unreadCount > 0 ? (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1.5 text-[11px] text-teal-600 hover:text-teal-700 font-semibold transition-colors group"
                  >
                    <CheckCheck className="w-3 h-3 group-hover:scale-110 transition-transform" />
                    Mark all as read
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                    <CheckCheck className="w-3 h-3 text-teal-400" />
                    All caught up!
                  </span>
                )}
                <button
                  onClick={clearAllNotifications}
                  className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-red-500 font-semibold transition-colors group"
                >
                  <Trash2 className="w-3 h-3 group-hover:scale-110 transition-transform" />
                  Clear all
                </button>
              </div>
            )}

            {/* ── Scrollable list ── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ minHeight: 0 }}>
              {filteredAll.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#f1f5f9' }}>
                    <Bell className="w-6 h-6 text-gray-300" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-500">No notifications here</p>
                    <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white">
                  {filteredAll.map((n) => (
                    <NotificationRow key={n.id} notification={n} inPanel />
                  ))}
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            {filteredAll.length > 0 && (
              <div className="flex-shrink-0 px-4 py-2.5 border-t border-gray-100" style={{ background: '#f8fafc' }}>
                <p className="text-center text-[11px] text-gray-400 font-medium">
                  Showing {filteredAll.length} of {notifications.length} notifications
                </p>
              </div>
            )}
          </div>
        </>
      )}
      <style>{`
        @keyframes notifPopIn {
          from { opacity: 0; transform: scale(0.96) translateY(-8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        .all-notif-panel {
          animation: notifPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .custom-scrollbar::-webkit-scrollbar       { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.35);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.55);
        }
      `}</style>
    </>
  );
}
