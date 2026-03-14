import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import Quotations from '../pages/quotations/quotations';
import QuotationsList from '../pages/quotations/quotationsList';
import ViewQuotationDetails from '../pages/quotations/viewquotationdetails';  // ← NEW
import Proforma from '../pages/proforma/proforma';
import ProformaList from '../pages/proforma/proformaList';
import ViewProformaDetails from '../pages/proforma/viewproformadetails';
import Invoices from '../pages/invoices/invoices';
import InvoicesList from '../pages/invoices/invoicesList';
import Purchase from '../pages/purchase/purchase';
import PurchaseOrder from '../pages/purchase/purchaseOrder';
import VendorProfile from '../pages/purchase/vendorProfile';
import Payments from '../pages/purchase/payments';
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
 * ROUTE STRUCTURE (QUOTATIONS — order matters, specific before generic):
 *
 *  /quotations/form   → Quotations (create form)
 *  /quotations/:id    → ViewQuotationDetails  ← UPDATED: dedicated detail page
 *  /quotations        → QuotationsList
 *
 * All other routes are unchanged from the original AppRoutes.
 *
 * BREADCRUMB BEHAVIOUR for Quotation Details:
 *  - AuthenticatedLayout reads navigationConfig.breadcrumbs
 *  - ViewQuotationDetails calls onUpdateNavigation({ breadcrumbs: ['Quotations','Quotation Details'] })
 *  - AuthenticatedLayout falls back to getAutoBreadcrumbs() which also returns
 *    ['Quotations','Quotation Details'] for paths matching /quotations/:id — so
 *    the breadcrumb is correct even on hard-refresh.
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
            2. /quotations/:id   — view quotation details  ← NEW dedicated page
            3. /quotations       — list view
          ================================================================== */}

      {/* 1 — Create new quotation form */}
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

      {/* 2 — View quotation details (dedicated page — replaces the old modal) */}
      <Route
        path="/quotations/:id"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <ViewQuotationDetails />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      {/* 3 — Quotations list */}
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

      {/* Proforma detail page */}
      <Route
        path="/proforma/:id"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <ViewProformaDetails />
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
          IMPORTANT: /invoices/generate  before  /invoices
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
          PURCHASE
          IMPORTANT: /vendors/:vendorId/payments  before  /vendors/:id
          ================================================================== */}

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
        path="/purchase-order"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AuthenticatedLayout {...layoutProps}>
              <PurchaseOrder />
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