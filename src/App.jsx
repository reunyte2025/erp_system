import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes.jsx';

/**
 * App Component - Root Application Component
 * 
 * Responsibilities:
 * - Authentication state management
 * - Session validation and auto-logout
 * - Login/logout handlers
 * - Active menu tracking based on current route
 * - Sidebar state management (mobile & desktop)
 * - Delegates routing to AppRoutes component
 * 
 * UPDATED: 
 * - Added proper handling for quotation form route (/quotations/form)
 * - Added proper handling for client profile route (/clients/:id)
 */

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // PRODUCTION: Check authentication from localStorage (persists across reloads)
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const token = localStorage.getItem('access_token');
    return !!token;
  });
  
  const [userData, setUserData] = useState(() => {
    const data = localStorage.getItem('user_data');
    try {
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Failed to parse user data:', e);
      return null;
    }
  });

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // NEW: Navigation state for breadcrumbs and back navigation
  const [navigationConfig, setNavigationConfig] = useState(null);

  /**
   * Determine active menu item from current route
   * Maps URL paths to menu item names
   * 
   * UPDATED: Uses startsWith() for routes with dynamic segments to handle ALL sub-routes:
   * 
   * Clients:
   * - /clients (list view)
   * - /clients/:id (profile detail view)
   * 
   * Projects:
   * - /projects (list view)
   * - /projects/:id (detail view)
   * 
   * Quotations:
   * - /quotations (list view)
   * - /quotations/form (create form)
   * - /quotations/:id (detail/edit view)
   * 
   * Proforma:
   * - /proforma (list view)
   * - /proforma/:id (detail view)
   * 
   * Invoices:
   * - /invoices (list view)
   * - /invoices/:id (detail view)
   * 
   * Purchase:
   * - /purchase (vendor list view)
   * - /vendors/:id (vendor profile detail view)
   * - /vendors/:id/payments (vendor payment history)
   * - /purchase-order (purchase order form)
   * 
   * Employees:
   * - /employees (list view)
   * - /employees/:id (detail view)
   * 
   * Certificates:
   * - /certificates (list view)
   * - /certificates/:id (detail view)
   * 
   * Reports:
   * - /reports (main view)
   * - /reports/* (any sub-pages)
   * 
   * Settings:
   * - /settings (main view)
   * - /settings/* (any sub-pages)
   */
  const getActiveMenuItem = () => {
    const path = location.pathname;
    
    // Root redirects to Clients
    if (path === '/') {
      return 'Clients';
    }
    
    // Clients routes (handles /clients and /clients/:id)
    if (path.startsWith('/clients')) {
      return 'Clients';
    }
    
    // Projects routes (handles /projects and /projects/:id)
    if (path.startsWith('/projects')) {
      return 'Projects';
    }
    
    // Quotations routes (handles /quotations, /quotations/form, /quotations/:id)
    if (path.startsWith('/quotations')) {
      return 'Quotations';
    }
    
    // Proforma routes (handles /proforma and /proforma/:id)
    if (path.startsWith('/proforma')) {
      return 'Proforma';
    }
    
    // Invoices routes (handles /invoices and /invoices/:id)
    if (path.startsWith('/invoices')) {
      return 'Invoices';
    }
    
    // Purchase routes (handles /purchase, /vendors/:id, /vendors/:id/payments, /purchase-order)
    // ALL purchase-related routes should highlight Purchase in sidebar
    if (
      path === '/purchase' ||
      path === '/purchase-order' ||
      path.startsWith('/purchase/') ||
      path.startsWith('/vendors/')
    ) {
      return 'Purchase';
    }
    
    // Employees routes (handles /employees and /employees/:id)
    if (path.startsWith('/employees')) {
      return 'Employees';
    }
    
    // Certificates routes (handles /certificates and /certificates/:id)
    if (path.startsWith('/certificates')) {
      return 'Certificates';
    }
    
    // Reports routes (handles /reports and any sub-routes)
    if (path.startsWith('/reports')) {
      return 'Reports';
    }
    
    // Settings routes (handles /settings and any sub-routes)
    if (path.startsWith('/settings')) {
      return 'Settings';
    }
    
    // Default fallback
    return 'Clients';
  };

  const activeMenuItem = getActiveMenuItem();

  /**
   * Handle logout - DEFINED BEFORE useEffect
   * - Clears all authentication data from localStorage
   * - Resets application state
   * - Navigates to login page
   */
  const handleLogout = useCallback(() => {
    // Clear all auth data
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('remember_me');
    localStorage.removeItem('login_timestamp');
    
    // Clear state
    setUserData(null);
    setIsLoggedIn(false);
    
    // Navigate to login
    navigate('/login', { replace: true });
    
    console.log('✅ Logged out successfully');
  }, [navigate]);

  /**
   * Handle successful login
   * - Stores user data and authentication state
   * - Navigates to intended destination or /clients
   */
  const handleLoginSuccess = useCallback((data) => {
    const { user, token } = data;
    
    console.log('App: Login successful', { user, token });
    
    setUserData(user);
    setIsLoggedIn(true);
    
    // Ensure token is stored
    if (token && !localStorage.getItem('access_token')) {
      localStorage.setItem('access_token', token);
    }

    // Navigate to the page user was trying to access, or default to /clients
    const from = location.state?.from?.pathname || '/clients';
    navigate(from, { replace: true });
  }, [navigate, location.state]);

  /**
   * PRODUCTION: Verify token validity on mount and periodically
   * - Checks if token exists
   * - Auto-logout after 24 hours if "remember me" not checked
   * - Runs verification every 5 minutes
   */
  useEffect(() => {
    const verifyAuth = () => {
      const token = localStorage.getItem('access_token');
      const loginTime = localStorage.getItem('login_timestamp');
      
      if (!token) {
        setIsLoggedIn(false);
        setUserData(null);
        return;
      }

      // Optional: Check if token is expired (24 hours)
      if (loginTime) {
        const hoursElapsed = (new Date().getTime() - parseInt(loginTime)) / (1000 * 60 * 60);
        const rememberMe = localStorage.getItem('remember_me') === 'true';
        
        // Auto-logout after 24 hours if "remember me" is not checked
        if (!rememberMe && hoursElapsed > 24) {
          console.log('Session expired - auto logout');
          handleLogout();
          return;
        }
      }

      setIsLoggedIn(true);
    };

    verifyAuth();

    // Check auth status every 5 minutes
    const interval = setInterval(verifyAuth, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [handleLogout]); // Added handleLogout as dependency

  return (
    <div className="min-h-screen bg-gray-50">
      <AppRoutes
        isLoggedIn={isLoggedIn}
        userData={userData}
        onLogout={handleLogout}
        onLoginSuccess={handleLoginSuccess}
        activeMenuItem={activeMenuItem}
        isMobileSidebarOpen={isMobileSidebarOpen}
        setIsMobileSidebarOpen={setIsMobileSidebarOpen}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        navigationConfig={navigationConfig}
        setNavigationConfig={setNavigationConfig}
      />
    </div>
  );
}