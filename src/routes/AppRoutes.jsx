import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import POS from '../pages/pos';
import Quotations from '../pages/quotations';
import Proforma from '../pages/Proforma';
import Invoices from '../pages/invoices';
import Projects from '../pages/projects';
import Clients from '../pages/clients';
import Employees from '../pages/employees';
import Certificates from '../pages/certificates';
import Reports from '../pages/reports';
import Settings from '../pages/settings';
import ProtectedRoute from '../routes/PrivateRoute';
import AuthenticatedLayout from '../components/AuthenticatedLayout';

/**
 * AppRoutes Component
 * 
 * Centralized routing configuration for the entire application.
 * All route definitions are managed here for easy maintenance and scalability.
 * 
 * Route Structure:
 * - /login - Public login page
 * - / - Redirects to /pos
 * - /pos - Point of Sale (Create clients)
 * - /clients - Client management
 * - /projects - Project management
 * - /quotations - Quotation management
 * - /proforma - Proforma invoice management
 * - /invoices - Invoice management
 * - /employees - Employee management
 * - /certificates - Certificate management
 * - /reports - Reports and analytics
 * - /settings - Application settings
 * 
 * All routes except /login are protected and require authentication.
 */

export default function AppRoutes({ 
  isLoggedIn, 
  userData, 
  onLogout, 
  onLoginSuccess,
  activeMenuItem,
  isMobileSidebarOpen,
  setIsMobileSidebarOpen,
  isSidebarCollapsed,
  setIsSidebarCollapsed
}) {
  
  // Common props for all authenticated pages
  const layoutProps = {
    userData,
    onLogout,
    activeMenuItem,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={
          isLoggedIn ? (
            <Navigate to="/pos" replace />
          ) : (
            <Login onLoginSuccess={onLoginSuccess} />
          )
        } 
      />

      {/* Protected Routes - All require authentication */}
      
      {/* Root redirect to POS */}
      <Route
        path="/"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <Navigate to="/pos" replace />
          </ProtectedRoute>
        }
      />

      {/* POS - Point of Sale / Create Client */}
      <Route
        path="/pos"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <POS />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      {/* Clients Management */}
      <Route
        path="/clients"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <Clients />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      {/* Projects Management */}
      <Route
        path="/projects"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <Projects />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      {/* Quotations Management */}
      <Route
        path="/quotations"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <Quotations />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      {/* Proforma Invoice Management */}
      <Route
        path="/proforma"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <Proforma />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      {/* Invoices Management */}
      <Route
        path="/invoices"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <Invoices />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      {/* Employees Management */}
      <Route
        path="/employees"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <Employees />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      {/* Certificates Management */}
      <Route
        path="/certificates"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <Certificates />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      {/* Reports and Analytics */}
      <Route
        path="/reports"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <Reports />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      {/* Application Settings */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <Settings />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      {/* 404 Catch-All - Redirect undefined routes to POS */}
      <Route 
        path="*" 
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <Navigate to="/pos" replace />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}