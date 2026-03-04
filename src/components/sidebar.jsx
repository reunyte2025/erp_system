import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, FileEdit, Receipt, Briefcase, Users, Award, BarChart3, Settings, ChevronLeft, ChevronRight, UserCircle, Tag } from 'lucide-react';

export default function Sidebar({ activeItem, onCollapseChange, isMobileMenuOpen, setIsMobileMenuOpen }) {
  const [hoveredItem, setHoveredItem] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const buttonRefs = useRef({});
  const location = useLocation();

  useEffect(() => {
    if (onCollapseChange) {
      onCollapseChange(isCollapsed);
    }
  }, [isCollapsed, onCollapseChange]);

  const menuItems = [
    { id: 'Clients', label: 'Clients', icon: UserCircle, path: '/clients' },
    { id: 'Projects', label: 'Projects', icon: Briefcase, path: '/projects' },
    { id: 'Quotations', label: 'Quotations', icon: FileText, path: '/quotations' },
    { id: 'Proforma', label: 'Proforma', icon: FileEdit, path: '/proforma' },
    { id: 'Invoices', label: 'Invoices', icon: Receipt, path: '/invoices' },
    { id: 'Purchase', label: 'Purchase', icon: Tag, path: '/purchase' },
    { id: 'Employees', label: 'Employees', icon: Users, path: '/employees' },
    { id: 'Certificates', label: 'Certificates', icon: Award, path: '/certificates' },
    { id: 'Reports', label: 'Reports', icon: BarChart3, path: '/reports' },
    { id: 'Settings', label: 'Settings', icon: Settings, path: '/settings' },
  ];

  const handleItemClick = () => {
    if (setIsMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleMouseEnter = (itemId) => {
    setHoveredItem(itemId);
    if (isCollapsed && buttonRefs.current[itemId]) {
      const rect = buttonRefs.current[itemId].getBoundingClientRect();
      setTooltipPosition({
        top: rect.top + rect.height / 2,
        left: rect.right + 24
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  // Determine if a menu item is active based on activeItem prop from App.jsx
  // This ensures consistency between App.jsx route logic and Sidebar highlighting
  const isItemActive = (itemId) => {
    return activeItem === itemId;
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 z-40
          ${isCollapsed ? 'w-20' : 'w-72 sm:w-80 lg:w-72'}
          bg-slate-800 
          shadow-xl
          transform transition-all duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          top: 'var(--header-height, 3.5rem)',
          height: 'calc(100vh - var(--header-height, 3.5rem))'
        }}
      >
        {/* Desktop Collapse Toggle Button */}
        <button
          onClick={toggleCollapse}
          className="hidden lg:flex absolute -right-3 top-8 w-6 h-6 bg-teal-500 text-white rounded-full items-center justify-center hover:bg-teal-600 transition-all duration-300 shadow-lg z-50 hover:scale-110"
          aria-label="Toggle sidebar"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        <nav className="py-6 px-4 h-full overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item.id);
              const isHovered = hoveredItem === item.id;

              return (
                <li key={item.id} className="relative">
                  <Link
                    to={item.path}
                    ref={(el) => (buttonRefs.current[item.id] = el)}
                    onClick={handleItemClick}
                    onMouseEnter={() => handleMouseEnter(item.id)}
                    onMouseLeave={handleMouseLeave}
                    className={`
                      w-full flex items-center
                      ${isCollapsed ? 'justify-center px-3' : 'space-x-3 px-4 sm:px-5'}
                      py-3 sm:py-3.5 
                      rounded-xl
                      transition-all duration-200 text-left
                      ${isActive 
                        ? 'bg-teal-500 text-white' 
                        : 'text-gray-300 hover:bg-slate-700/50'
                      }
                    `}
                  >
                    <Icon 
                      className={`
                        ${isCollapsed ? 'w-6 h-6' : 'w-5 h-5 sm:w-6 sm:h-6'}
                        transition-all duration-200
                        ${isActive ? 'text-white' : 'text-gray-400'}
                        ${isHovered && !isActive ? 'scale-110 text-teal-400' : ''}
                      `}
                    />
                    <span className={`
                      font-medium text-sm sm:text-base whitespace-nowrap
                      ${isActive ? 'text-white' : 'text-gray-200'}
                      transition-all duration-300
                      ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}
                    `}>
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Tooltip Portal - Rendered at root level */}
      {isCollapsed && hoveredItem && (
        <div 
          className="hidden lg:block fixed px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg whitespace-nowrap shadow-2xl border border-slate-600 pointer-events-none transition-opacity duration-200"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: 'translateY(-50%)',
            zIndex: 99999
          }}
        >
          {menuItems.find(item => item.id === hoveredItem)?.label}
          <div 
            className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-r-[8px] border-transparent border-r-slate-900"
            style={{ marginRight: '-1px' }}
          ></div>
        </div>
      )}

      {/* CSS Variables for header height */}
      <style>{`
        :root {
          --header-height: 3.5rem;
        }
        
        @media (min-width: 640px) {
          :root {
            --header-height: 4rem;
          }
        }
      `}</style>
    </>
  );
}