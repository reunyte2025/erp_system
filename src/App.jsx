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
 * USERS ROUTING:
 * - /users             → Users list
 * - /users/:username   → UserProfile  (URL shows username, NOT user ID)
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

  const [isMobileSidebarOpen,  setIsMobileSidebarOpen]  = useState(false);
  const [isSidebarCollapsed,   setIsSidebarCollapsed]   = useState(false);
  const [navigationConfig,     setNavigationConfig]     = useState(null);

  /**
   * Determine active menu item from current route.
   * Uses startsWith() so all sub-routes (/:id, /:username, /form, etc.)
   * correctly highlight the parent menu item.
   *
   * USERS routes:
   *   /users             → 'Users'  (list view)
   *   /users/:username   → 'Users'  (profile view — username in URL, not ID)
   */
  const getActiveMenuItem = () => {
    const path = location.pathname;

    if (path === '/') return 'Clients';

    // Clients routes (/clients, /clients/:id)
    if (path.startsWith('/clients')) return 'Clients';

    // Projects routes
    if (path.startsWith('/projects')) return 'Projects';

    // Quotations routes (/quotations, /quotations/form, /quotations/:id)
    if (path.startsWith('/quotations')) return 'Quotations';

    // Proforma routes
    if (path.startsWith('/proforma')) return 'Proforma';

    // Invoices routes
    if (path.startsWith('/invoices')) return 'Invoices';

    // Vendors routes (/vendors, /vendors/:id)
    if (path.startsWith('/vendors')) return 'Vendors';

    // Purchase routes (/purchase, /purchase/form, /purchase/:id)
    if (path.startsWith('/purchase')) return 'Purchase';

    // NOC routes
    if (path.startsWith('/noc')) return 'NOC';

    // Employees routes
    if (path.startsWith('/employees')) return 'Employees';

    // Certificates routes
    if (path.startsWith('/certificates')) return 'Certificates';

    // Reports routes
    if (path.startsWith('/reports')) return 'Reports';

    // Settings routes
    if (path.startsWith('/settings')) return 'Settings';

    // Users routes — covers both /users (list) and /users/:username (profile)
    if (path.startsWith('/users')) return 'Users';

    return 'Clients';
  };

  const activeMenuItem = getActiveMenuItem();

  /**
   * Handle logout
   * - Clears all authentication data from localStorage
   * - Resets application state
   * - Navigates to login page
   */
  const handleLogout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('remember_me');
    localStorage.removeItem('login_timestamp');

    setUserData(null);
    setIsLoggedIn(false);

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

    if (token && !localStorage.getItem('access_token')) {
      localStorage.setItem('access_token', token);
    }

    const from = location.state?.from?.pathname || '/clients';
    navigate(from, { replace: true });
  }, [navigate, location.state]);

  /**
   * PRODUCTION: Verify token validity on mount and periodically.
   * Auto-logout after 24 hours if "remember me" not checked.
   * Runs verification every 5 minutes.
   */
  useEffect(() => {
    const verifyAuth = () => {
      const token     = localStorage.getItem('access_token');
      const loginTime = localStorage.getItem('login_timestamp');

      if (!token) {
        setIsLoggedIn(false);
        setUserData(null);
        return;
      }

      if (loginTime) {
        const hoursElapsed = (new Date().getTime() - parseInt(loginTime)) / (1000 * 60 * 60);
        const rememberMe   = localStorage.getItem('remember_me') === 'true';

        if (!rememberMe && hoursElapsed > 24) {
          console.log('Session expired - auto logout');
          handleLogout();
          return;
        }
      }

      setIsLoggedIn(true);
    };

    verifyAuth();
    const interval = setInterval(verifyAuth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [handleLogout]);

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