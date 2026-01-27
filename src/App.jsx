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

  /**
   * Determine active menu item from current route
   * Maps URL paths to menu item names
   */
  const getActiveMenuItem = () => {
    const path = location.pathname;
    if (path === '/' || path === '/pos') return 'POS';
    if (path === '/projects') return 'Projects';
    if (path === '/quotations') return 'Quotations';
    if (path === '/proforma') return 'Proforma';
    if (path === '/invoices') return 'Invoices';
    if (path === '/clients') return 'Clients';
    if (path === '/employees') return 'Employees';
    if (path === '/certificates') return 'Certificates';
    if (path === '/reports') return 'Reports';
    if (path === '/settings') return 'Settings';
    return 'POS';
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
   * - Navigates to intended destination or /pos
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

    // Navigate to the page user was trying to access, or default to /pos
    const from = location.state?.from?.pathname || '/pos';
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
      />
    </div>
  );
}