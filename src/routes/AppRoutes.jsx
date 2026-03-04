import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import Quotations from '../pages/quotations/quotations';
import QuotationsList from '../pages/quotations/quotationsList';
import Proforma from '../pages/proforma/proforma';
import ProformaList from '../pages/proforma/proformaList';
import Invoices from '../pages/invoices/invoices';
import InvoicesList from '../pages/invoices/invoicesList';
import Purchase from '../pages/purchase/purchase';
import PurchaseOrder from '../pages/purchase/purchaseOrder';
import VendorProfile from '../pages/purchase/vendorProfile';
import Payments from '../pages/purchase/payments'; // NEW IMPORT
import Projects from '../pages/projects/projects';
import Clients from '../pages/clients/clients';
import ClientProfile from '../pages/clients/clientsProfile';
import Employees from '../pages/employees';
import Certificates from '../pages/certificates';
import Reports from '../pages/reports';
import Settings from '../pages/settings';
import ProtectedRoute from '../routes/PrivateRoute';
import AuthenticatedLayout from '../components/AuthenticatedLayout';

/**
 * ============================================================================
 * APP ROUTES CONFIGURATION
 * ============================================================================
 * 
 * Centralized routing configuration for the entire application.
 * All route definitions are managed here for easy maintenance and scalability.
 * 
 * ROUTE STRUCTURE:
 * ============================================================================
 * 
 * PUBLIC ROUTES:
 * - /login               → Login page (redirects to /clients if authenticated)
 * 
 * PROTECTED ROUTES (require authentication):
 * - /                    → Redirects to /clients (default landing page)
 * - /clients             → Client management (list view)
 * - /clients/:id         → Client profile (detail view)
 * - /projects            → Project management
 * - /quotations          → Quotations list view
 * - /quotations/form     → Create new quotation
 * - /quotations/:id      → View/edit specific quotation
 * - /proforma            → Proforma list view
 * - /proforma/form       → Create new proforma
 * - /invoices            → Invoice management
 * - /purchase            → Purchase management (vendor list)
 * - /vendors/:id         → Vendor profile (detail view)
 * - /vendors/:id/payments → Vendor payment history
 * - /purchase-order      → Purchase Order management (Vendor & Project details)
 * - /employees           → Employee management
 * - /certificates        → Certificate management
 * - /reports             → Reports and analytics
 * - /settings            → Application settings
 * - *                    → 404 catch-all (redirects to /clients)
 * 
 * IMPORTANT NOTES:
 * ============================================================================
 * - Route order matters! Specific routes must come before generic ones
 * - All protected routes are wrapped with ProtectedRoute component
 * - All authenticated pages use AuthenticatedLayout for consistent UI
 * - Quotations uses nested routing for list, create, and edit views
 * - Client profile route (/clients/:id) comes before /clients for proper matching
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
  setIsSidebarCollapsed,
  navigationConfig,
  setNavigationConfig
}) {
  
  // Common props for all authenticated pages
  const layoutProps = {
    userData,
    onLogout,
    activeMenuItem,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    navigationConfig,
    setNavigationConfig
  };

  return (
    <Routes>
      {/* ====================================================================
          PUBLIC ROUTES
          ==================================================================== */}
      
      <Route 
        path="/login" 
        element={
          isLoggedIn ? (
            <Navigate to="/clients" replace />
          ) : (
            <Login onLoginSuccess={onLoginSuccess} />
          )
        } 
      />

      {/* ====================================================================
          PROTECTED ROUTES - All require authentication
          ==================================================================== */}
      
      {/* Root redirect to Clients (Default Landing Page) */}
      <Route
        path="/"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <Navigate to="/clients" replace />
          </ProtectedRoute>
        }
      />

      {/* ====================================================================
          CLIENTS ROUTES
          IMPORTANT: Order matters! Specific routes BEFORE generic ones
          ==================================================================== */}
      
      {/* Client Profile Detail View - Must come before /clients */}
      <Route
        path="/clients/:id"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <ClientProfile />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      {/* Clients List Management - Must be last in clients group */}
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

      {/* ====================================================================
          QUOTATIONS ROUTES
          IMPORTANT: Order matters! Specific routes BEFORE generic ones
          ==================================================================== */}
      
      {/* Create New Quotation - Must come before /quotations/:id */}
      <Route
        path="/quotations/form"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <Quotations />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      {/* View/Edit Specific Quotation by ID - Must come before /quotations */}
      <Route
        path="/quotations/:id"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <Quotations />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      {/* Quotations List View - Must be last in quotations group */}
      <Route
        path="/quotations"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <QuotationsList />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      {/* ====================================================================
          PROFORMA ROUTES
          IMPORTANT: Order matters! Specific routes BEFORE generic ones
          ==================================================================== */}

      {/* Create New Proforma - Must come before /proforma */}
      <Route
        path="/proforma/form"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <Proforma />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      {/* Proforma List View - Must be last in proforma group */}
      <Route
        path="/proforma"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <ProformaList />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      {/* ====================================================================
          INVOICES ROUTES
          IMPORTANT: Order matters! Specific routes BEFORE generic ones
          ==================================================================== */}

      {/* Generate Invoice page — opened after 3-step modal (must come before /invoices) */}
      <Route
        path="/invoices/generate"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <Invoices />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      {/* Invoices List View — sidebar "Invoices" tab lands here */}
      <Route
        path="/invoices"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <InvoicesList />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      {/* ====================================================================
          PURCHASE ROUTES
          IMPORTANT: Order matters! Specific routes BEFORE generic ones
          ==================================================================== */}

      {/* Purchase Management - Vendor List */}
      <Route
        path="/purchase"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <Purchase />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      {/* Vendor Payment History - Must come before /vendors/:id */}
      <Route
        path="/vendors/:vendorId/payments"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <Payments />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      {/* Vendor Profile Detail View - Must come before /purchase-order */}
      <Route
        path="/vendors/:id"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <VendorProfile />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      {/* Purchase Order Management - Vendor & Project Details */}
      <Route
        path="/purchase-order"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <PurchaseOrder />
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

      {/* ====================================================================
          404 CATCH-ALL
          Redirect all undefined routes to Clients page
          ==================================================================== */}
      <Route 
        path="*" 
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <Navigate to="/clients" replace />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}