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
 * 
 * This component eliminates code duplication across route definitions
 * and ensures UI consistency throughout the application.
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
 */

export default function AuthenticatedLayout({ 
  children, 
  userData, 
  onLogout, 
  activeMenuItem, 
  isMobileSidebarOpen, 
  setIsMobileSidebarOpen, 
  isSidebarCollapsed, 
  setIsSidebarCollapsed 
}) {
  return (
    <>
      <Navbar 
        user={userData} 
        onLogout={onLogout} 
        pageTitle={activeMenuItem}
        onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
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
            flex-1 p-4 sm:p-6 lg:p-8 
            transition-all duration-300 ease-in-out
            ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'}
          `}
        >
          {children}
        </main>
      </div>
    </>
  );
}