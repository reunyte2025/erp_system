import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FileText, FileEdit, Receipt, Briefcase, Users, Award, BarChart3,
  Settings, ChevronLeft, ChevronRight, UserCircle, Tag, Store,
  Home, Layout
} from 'lucide-react';

export default function Sidebar({ activeItem, onCollapseChange, isMobileMenuOpen, setIsMobileMenuOpen, isAdminOrManager }) {
  const [hoveredItem, setHoveredItem] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [activeIndicatorPos, setActiveIndicatorPos] = useState({ height: 0, top: 0 });
  const buttonRefs = useRef({});
  const location = useLocation();

  useEffect(() => {
    if (onCollapseChange) {
      onCollapseChange(isCollapsed);
    }
  }, [isCollapsed, onCollapseChange]);

  // Update active indicator position when active item or collapsed state changes
  useEffect(() => {
    const activeButton = buttonRefs.current[getActiveItemId()];
    if (activeButton) {
      const rect = activeButton.getBoundingClientRect();
      const sidebar = document.querySelector('[data-sidebar]');
      if (sidebar) {
        const sidebarRect = sidebar.getBoundingClientRect();
        setActiveIndicatorPos({
          height: rect.height,
          top: rect.top - sidebarRect.top
        });
      }
    }
  }, [activeItem, isCollapsed, location.pathname]);

  const allMenuItems = [
    { id: 'Clients',      label: 'Clients',      icon: UserCircle, path: '/clients' },
    { id: 'Projects',     label: 'Projects',     icon: Briefcase,  path: '/projects' },
    { id: 'Quotations',   label: 'Quotations',   icon: FileText,   path: '/quotations' },
    { id: 'Proforma',     label: 'Proforma',     icon: FileEdit,   path: '/proforma' },
    { id: 'Invoices',     label: 'Invoices',     icon: Receipt,    path: '/invoices' },
    { id: 'Vendors',      label: 'Vendors',      icon: Store,      path: '/vendors' },
    { id: 'Purchase',     label: 'Purchase',     icon: Tag,        path: '/purchase' },
    { id: 'Employees',    label: 'Employees',    icon: Users,      path: '/employees' },
    { id: 'Certificates', label: 'Certificates', icon: Award,      path: '/certificates' },
    { id: 'Reports',      label: 'Reports',      icon: BarChart3,  path: '/reports' },
    { id: 'Settings',     label: 'Settings',     icon: Settings,   path: '/settings' },
    { id: 'Users',        label: 'Users',        icon: UserCircle, path: '/users', adminOnly: true },
  ];

  // Users tab is only visible to Admin and Manager
  const menuItems = allMenuItems.filter(item => !item.adminOnly || isAdminOrManager);

  const handleItemClick = () => {
    if (setIsMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const getActiveItemId = () => {
    if (activeItem) return activeItem;
    const path = location.pathname;
    const pathMap = {
      Clients:      '/clients',
      Projects:     '/projects',
      Quotations:   '/quotations',
      Proforma:     '/proforma',
      Invoices:     '/invoices',
      Vendors:      '/vendors',
      Purchase:     '/purchase',
      Employees:    '/employees',
      Certificates: '/certificates',
      Reports:      '/reports',
      Settings:     '/settings',
      Users:        '/users',
    };
    return Object.entries(pathMap).find(([, p]) => path.startsWith(p))?.[0] || null;
  };

  const handleMouseEnter = (itemId) => {
    setHoveredItem(itemId);
    if (isCollapsed && buttonRefs.current[itemId]) {
      const rect = buttonRefs.current[itemId].getBoundingClientRect();
      setTooltipPosition({
        top: rect.top + rect.height / 2,
        left: rect.right + 16
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  const isItemActive = (itemId) => {
    return getActiveItemId() === itemId;
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-30 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}
        />
      )}

      {/* Modern Sidebar - Compact Version */}
      <aside
        data-sidebar
        className={`
          fixed left-0 z-40
          ${isCollapsed ? 'w-20' : 'w-64'}
          bg-gradient-to-b from-slate-800 to-slate-900
          shadow-2xl
          transform transition-all duration-500 ease-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          border-r border-slate-700/50
        `}
        style={{
          top: 'var(--header-height, 3.5rem)',
          height: 'calc(100vh - var(--header-height, 3.5rem))'
        }}
      >
        {/* Glow effect for active indicator */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-r-3xl">
          <div className="absolute inset-0 opacity-0 bg-gradient-to-r from-teal-500/10 to-transparent" />
        </div>

        {/* Active Indicator Bar - Animated */}
        <div
          className="absolute left-0 top-0 w-1.5 bg-gradient-to-b from-teal-400 to-teal-600 rounded-r-full shadow-lg shadow-teal-500/50 transition-all duration-300 ease-out"
          style={{
            height: `${activeIndicatorPos.height}px`,
            top: `${activeIndicatorPos.top}px`,
            opacity: activeIndicatorPos.height > 0 ? 1 : 0
          }}
        />

        {/* Collapse Toggle Button */}
        <button
          onClick={toggleCollapse}
          className="hidden lg:flex absolute -right-5 top-6 w-7 h-7 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-full items-center justify-center hover:from-teal-600 hover:to-teal-700 transition-all duration-300 shadow-md hover:shadow-lg z-50 active:scale-95 group/toggle"
          aria-label="Toggle sidebar"
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 transition-transform duration-300 group-hover/toggle:translate-x-0.5" />
          ) : (
            <ChevronLeft className="w-5 h-5 transition-transform duration-300 group-hover/toggle:-translate-x-0.5" />
          )}
        </button>

        {/* Navigation - Compact Layout */}
        <nav className="sidebar-nav py-4 px-0 h-full overflow-y-auto custom-scrollbar">
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item.id);
              const isHovered = hoveredItem === item.id;

              return (
                <li key={item.id} className="relative group/item">
                  {/* Link - Compact Version */}
                  <Link
                    to={item.path}
                    ref={(el) => (buttonRefs.current[item.id] = el)}
                    onClick={handleItemClick}
                    onMouseEnter={() => handleMouseEnter(item.id)}
                    onMouseLeave={handleMouseLeave}
                    className={`
                      w-full flex items-center gap-3
                      ${isCollapsed ? 'justify-center px-2' : 'px-3'}
                      py-2.5
                      rounded-lg
                      transition-all duration-300 ease-out
                      relative overflow-hidden
                      ${isActive
                        ? 'text-white'
                        : 'text-slate-400 hover:text-slate-200'
                      }
                      group/link
                    `}
                  >
                    {/* Background gradient on hover */}
                    {!isActive && (
                      <div className="absolute inset-0 bg-slate-700/30 opacity-0 group-hover/link:opacity-100 transition-opacity duration-300" />
                    )}

                    {/* Background for active state */}
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-teal-600/40 to-teal-500/20" />
                    )}

                    {/* Icon */}
                    <div className="relative z-10">
                      <Icon
                        className={`
                          w-5 h-5 flex-shrink-0
                          transition-all duration-300
                          ${isActive ? 'text-teal-300 drop-shadow-lg' : 'text-slate-500 group-hover/link:text-teal-400'}
                          ${isHovered && !isActive ? 'scale-120' : 'scale-100'}
                        `}
                      />
                    </div>

                    {/* Label - Animated Width */}
                    <span
                      className={`
                        font-medium text-sm whitespace-nowrap
                        transition-all duration-300
                        relative z-10
                        ${isActive ? 'text-white' : 'text-slate-300 group-hover/link:text-slate-100'}
                        ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}
                      `}
                    >
                      {item.label}
                    </span>

                    {/* Ripple effect on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover/link:opacity-20 bg-gradient-to-r from-teal-400 to-transparent rounded-lg" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent pointer-events-none rounded-r-3xl" />
      </aside>

      {/* Tooltip - Animated */}
      {isCollapsed && hoveredItem && (
        <div
          className="hidden lg:block fixed px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl whitespace-nowrap shadow-2xl border border-slate-700/60 pointer-events-none transition-all duration-200 animate-fade-in"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: 'translateY(-50%)',
            zIndex: 99999
          }}
        >
          {menuItems.find(item => item.id === hoveredItem)?.label}
          {/* Arrow */}
          <div
            className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-r-[8px] border-transparent border-r-slate-900"
            style={{ marginRight: '-1px' }}
          />
        </div>
      )}

      <style>{`
        :root {
          --header-height: 3.5rem;
        }

        @media (min-width: 640px) {
          :root {
            --header-height: 4rem;
          }
        }

        /* Custom scrollbar styling */
        .sidebar-nav::-webkit-scrollbar {
          width: 6px;
          background: transparent;
        }

        .sidebar-nav::-webkit-scrollbar-track {
          background: transparent;
        }

        .sidebar-nav::-webkit-scrollbar-thumb {
          background: rgba(139, 148, 166, 0.4);
          border-radius: 3px;
          transition: background 0.3s ease;
        }

        .sidebar-nav::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 148, 166, 0.6);
        }

        .sidebar-nav {
          scrollbar-width: thin;
          scrollbar-color: rgba(139, 148, 166, 0.4) transparent;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-50%) translateX(8px);
          }
          to {
            opacity: 1;
            transform: translateY(-50%) translateX(0);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </>
  );
}