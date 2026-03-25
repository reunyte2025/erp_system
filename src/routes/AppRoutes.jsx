import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import Quotations from '../pages/quotations/quotations';
import QuotationsList from '../pages/quotations/quotationsList';
import ViewQuotationDetails from '../pages/quotations/viewquotationdetails';
import Proforma from '../pages/proforma/proforma';
import ProformaList from '../pages/proforma/proformaList';
import ViewProformaDetails from '../pages/proforma/viewproformadetails';
import Invoices from '../pages/invoices/invoices';
import InvoicesList from '../pages/invoices/invoicesList';
import ViewInvoiceDetails from '../pages/invoices/viewinvoicedetails';
import InvoiceTrackPayment from '../pages/payments/invoice.track.payment';
import Purchase from '../pages/purchase/purchase';
import CreatePurchaseOrder from '../pages/purchase/create.purchase.order';
import ViewPODetails from '../pages/purchase/viewpodetails';
import VendorsList from '../pages/vendors/vendorsList';
import VendorProfile from '../pages/vendors/vendorProfile';
import Projects from '../pages/projects/projects';
import Clients from '../pages/clients/clients';
import ClientProfile from '../pages/clients/clientsProfile';
import Employees from '../pages/employees';
import Certificates from '../pages/certificates';
import Reports from '../pages/reports';
import Settings from '../pages/settings';
import Users from '../pages/user/users';
import UserProfile from '../pages/user/userprofile';
import ProtectedRoute from '../routes/PrivateRoute';
import AuthenticatedLayout from '../components/AuthenticatedLayout';

/**
 * ============================================================================
 * APP ROUTES CONFIGURATION
 * ============================================================================
 *
 * USERS ROUTES:
 *  /users             → Users list     (pages/user/users.jsx)
 *  /users/:username   → UserProfile    (pages/user/userprofile.jsx)
 *    NOTE: Route param is :username — the URL shows the username, NOT the user ID.
 *    e.g. /users/johndoe  instead of  /users/42
 *
 * VENDOR ROUTES:
 *  /vendors/:id  → VendorProfile  (pages/vendors/vendorProfile.jsx)
 *  /vendors      → VendorsList    (pages/vendors/vendorsList.jsx)
 *
 * OTHER ROUTES:
 *  QUOTATIONS:  /quotations/form → /quotations/:id → /quotations
 *  PROFORMA:    /proforma/form   → /proforma/:id   → /proforma
 *  INVOICES:    /invoices/generate → /invoices/:id/track-payment
 *               → /invoices/:id → /invoices
 *  PURCHASE:    /purchase/form → /purchase/:id → /purchase
 *  CLIENTS:     /clients/:id → /clients
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
  setNavigationConfig,
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
    setNavigationConfig,
  };

  return (
    <Routes>

      {/* ==================================================================
          PUBLIC ROUTES
          ================================================================== */}

      <Route
        path="/login"
        element={
          isLoggedIn
            ? <Navigate to="/clients" replace />
            : <Login onLoginSuccess={onLoginSuccess} />
        }
      />

      {/* ==================================================================
          ROOT — redirect to Clients
          ================================================================== */}

      <Route
        path="/"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <Navigate to="/clients" replace />
          </ProtectedRoute>
        }
      />

      {/* ==================================================================
          CLIENTS
          IMPORTANT: /clients/:id  before  /clients
          ================================================================== */}

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

      {/* ==================================================================
          PROJECTS
          ================================================================== */}

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

      {/* ==================================================================
          QUOTATIONS
          IMPORTANT: most-specific routes FIRST
            1. /quotations/form  — create new quotation
            2. /quotations/:id   — view quotation details
            3. /quotations       — list view
          ================================================================== */}

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

      <Route
        path="/quotations/:id"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <ViewQuotationDetails onUpdateNavigation={setNavigationConfig} />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

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

      {/* ==================================================================
          PROFORMA
          IMPORTANT: /proforma/form  before  /proforma
          ================================================================== */}

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

      <Route
        path="/proforma/:id"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <ViewProformaDetails onUpdateNavigation={setNavigationConfig} />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

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

      {/* ==================================================================
          INVOICES
          IMPORTANT: most-specific routes FIRST
            1. /invoices/generate          — invoice generation form
            2. /invoices/:id/track-payment — track payment for an invoice
            3. /invoices/:id               — view invoice details
            4. /invoices                   — list view
          ================================================================== */}

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

      <Route
        path="/invoices/:id/track-payment"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <InvoiceTrackPayment onUpdateNavigation={setNavigationConfig} />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/invoices/:id"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <ViewInvoiceDetails onUpdateNavigation={setNavigationConfig} />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

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

      {/* ==================================================================
          PURCHASE ORDERS
          IMPORTANT: most-specific routes FIRST
            1. /purchase/form  — create new purchase order
            2. /purchase/:id   — view purchase order details
            3. /purchase       — purchase orders list
          ================================================================== */}

      <Route
        path="/purchase/form"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <CreatePurchaseOrder onUpdateNavigation={setNavigationConfig} />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/purchase/:id"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <ViewPODetails onUpdateNavigation={setNavigationConfig} />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/purchase"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <Purchase onUpdateNavigation={setNavigationConfig} />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      {/* ==================================================================
          VENDORS
          IMPORTANT: most-specific routes FIRST
            1. /vendors/:id  — vendor profile view
            2. /vendors      — vendor list view
          ================================================================== */}

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

      <Route
        path="/vendors"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <VendorsList />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      {/* ==================================================================
          EMPLOYEES
          ================================================================== */}

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

      {/* ==================================================================
          CERTIFICATES
          ================================================================== */}

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

      {/* ==================================================================
          REPORTS
          ================================================================== */}

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

      {/* ==================================================================
          SETTINGS
          ================================================================== */}

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

      {/* ==================================================================
          USERS — Admin and Manager only
          IMPORTANT: /users/:username  before  /users
            1. /users/:username  — user profile (URL shows username, not ID)
            2. /users            — users & roles management list
          Regular users are redirected to /clients inside the component.
          ================================================================== */}

      <Route
        path="/users/:username"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <UserProfile />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <Users />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      {/* ==================================================================
          404 CATCH-ALL → Clients
          ================================================================== */}

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