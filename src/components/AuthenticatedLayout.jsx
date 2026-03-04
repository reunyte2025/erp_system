import { cloneElement } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './navbar';
import Sidebar from './sidebar';

/**
 * AuthenticatedLayout Component
 * 
 * Wrapper component that provides consistent layout for all authenticated pages.
 * Includes Navbar and Sidebar with proper responsive behavior.
 * 
 * Features:
 * - Consistent header (Navbar) across all pages
 * - Collapsible sidebar with mobile support
 * - Responsive main content area
 * - Smooth transitions for sidebar collapse
 * - Automatic breadcrumb generation from routes
 * - Universal back button on sub-pages
 * - Passes navigation callbacks to child components
 * 
 * This component eliminates code duplication across route definitions
 * and ensures UI consistency throughout the application.
 * 
 * UPDATED:
 * - Auto-generates breadcrumbs from current route
 * - Back button always visible on sub-pages (handled by navbar)
 * - Breadcrumbs persist on page reload
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Page content to render
 * @param {Object} props.userData - Current user data
 * @param {Function} props.onLogout - Logout handler
 * @param {string} props.activeMenuItem - Currently active menu item
 * @param {boolean} props.isMobileSidebarOpen - Mobile sidebar state
 * @param {Function} props.setIsMobileSidebarOpen - Mobile sidebar state setter
 * @param {boolean} props.isSidebarCollapsed - Desktop sidebar collapsed state
 * @param {Function} props.setIsSidebarCollapsed - Desktop sidebar collapse setter
 * @param {Object} props.navigationConfig - Navigation config (breadcrumbs from child)
 * @param {Function} props.setNavigationConfig - Navigation config setter
 */

export default function AuthenticatedLayout({ 
  children, 
  userData, 
  onLogout, 
  activeMenuItem, 
  isMobileSidebarOpen, 
  setIsMobileSidebarOpen, 
  isSidebarCollapsed, 
  setIsSidebarCollapsed,
  navigationConfig,
  setNavigationConfig
}) {
  const location = useLocation();

  /**
   * Auto-generate breadcrumbs based on current route
   * This ensures breadcrumbs are always available even on page reload
   */
  const getAutoBreadcrumbs = () => {
    const path = location.pathname;
    
    // Quotations routes
    if (path === '/quotations/form') {
      return ['Quotations', 'Generate Quotation'];
    }
    if (path.startsWith('/quotations/') && path !== '/quotations') {
      return ['Quotations', 'Quotation Details'];
    }
    
    // Clients routes
    if (path.startsWith('/clients/') && path !== '/clients') {
      return ['Clients', 'Client Profile'];
    }
    
    // Vendors routes (Purchase)
    // Payment history must be checked before general vendor profile
    if (path.match(/\/vendors\/\d+\/payments/)) {
      return ['Purchase', 'Vendor Profile', 'Payment Details'];
    }
    if (path.startsWith('/vendors/')) {
      return ['Purchase', 'Vendor Profile'];
    }
    
    // Purchase Order route
    if (path === '/purchase-order') {
      return ['Purchase', 'Purchase Order'];
    }
    
    // Projects routes
    if (path.startsWith('/projects/') && path !== '/projects') {
      return ['Projects', 'Project Details'];
    }
    
    // Invoices routes
    if (path === '/invoices/generate') {
      return ['Invoices', 'Generate Invoice'];
    }
    if (path.startsWith('/invoices/') && path !== '/invoices') {
      return ['Invoices', 'Invoice Details'];
    }
    
    // Proforma routes
    if (path.startsWith('/proforma/') && path !== '/proforma') {
      return ['Proforma', 'Proforma Details'];
    }
    
    // Employees routes
    if (path.startsWith('/employees/') && path !== '/employees') {
      return ['Employees', 'Employee Details'];
    }
    
    // Certificates routes
    if (path.startsWith('/certificates/') && path !== '/certificates') {
      return ['Certificates', 'Certificate Details'];
    }
    
    // Reports routes
    if (path.startsWith('/reports/') && path !== '/reports') {
      return ['Reports', 'Report Details'];
    }
    
    // Settings routes
    if (path.startsWith('/settings/') && path !== '/settings') {
      return ['Settings', 'Settings Details'];
    }
    
    // Return null for main pages (no breadcrumbs needed)
    return null;
  };

  // Use custom breadcrumbs if provided, otherwise auto-generate
  const breadcrumbs = navigationConfig?.breadcrumbs || getAutoBreadcrumbs();

  return (
    <>
      <Navbar 
        user={userData} 
        onLogout={onLogout} 
        pageTitle={activeMenuItem}
        onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        breadcrumbs={breadcrumbs}
      />
      <div className="flex">
        <Sidebar 
          activeItem={activeMenuItem} 
          isMobileMenuOpen={isMobileSidebarOpen}
          setIsMobileMenuOpen={setIsMobileSidebarOpen}
          onCollapseChange={setIsSidebarCollapsed}
        />
        <main 
          className={`
            flex-1 min-w-0 p-4 sm:p-6 lg:p-8
            overflow-x-hidden
            transition-all duration-300 ease-in-out
            ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'}
          `}
        >
          {/* Clone children and inject onUpdateNavigation callback */}
          {children && typeof children.type === 'function' 
            ? cloneElement(children, { onUpdateNavigation: setNavigationConfig })
            : children
          }
        </main>
      </div>
    </>
  );
}