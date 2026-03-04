import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Receipt, IndianRupee, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import paymentsConfig from './payments.config';
import DynamicList from '../../components/DynamicList/DynamicList';

/**
 * ============================================================================
 * PAYMENTS COMPONENT - VENDOR PAYMENT HISTORY
 * ============================================================================
 * 
 * Displays payment history for a specific vendor
 * 
 * Features:
 * - Payment list with filterable tabs (All, Completed, Pending, Failed)
 * - Stats cards showing payment summary
 * - Integration with DynamicList component
 * - Backend API ready
 * - Pagination support
 * - Empty state handling
 * - Loading states
 * - Error handling
 * 
 * Route: /vendors/:vendorId/payments
 * 
 * @component
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const ENABLE_LOGGING = false;

const logger = {
  log: (...args) => ENABLE_LOGGING && console.log('[Payments]', ...args),
  error: (...args) => console.error('[Payments]', ...args),
};

// ============================================================================
// DEMO DATA - Replace with API call when backend is ready
// ============================================================================

const DEMO_PAYMENTS = [
  { 
    id: 1, 
    payment_id: '#123aa45',
    amount: 1020000, 
    payment_date: '2025-11-27T11:35:00Z',
    quotation_number: 'QT-2026-02034',
    status: 'Pay Now'
  },
  { 
    id: 2, 
    payment_id: '#123aa45',
    amount: 1020000, 
    payment_date: '2025-11-27T11:35:00Z',
    quotation_number: 'QT-2026-02034',
    status: 'Pay Now'
  },
  { 
    id: 3, 
    payment_id: '#123aa45',
    amount: 1020000, 
    payment_date: '2025-11-27T11:35:00Z',
    quotation_number: 'QT-2026-02034',
    status: 'Completed'
  },
  { 
    id: 4, 
    payment_id: '#123aa45',
    amount: 1020000, 
    payment_date: '2025-11-27T11:35:00Z',
    quotation_number: 'QT-2026-02034',
    status: 'Completed'
  },
  { 
    id: 5, 
    payment_id: '#123aa45',
    amount: 1020000, 
    payment_date: '2025-11-27T11:35:00Z',
    quotation_number: 'QT-2026-02034',
    status: 'Completed'
  },
];

const DEMO_STATS = {
  totalPayment: 2035987,
  paymentsDone: 1035564,
  pendingPayment: 1000125,
  failedPayment: 50254,
  pendingCount: 5,
  doneCount: 5,
  addedInLast2Days: 5
};

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

const StatCard = ({ icon, count, label, subLabel, bgColor, textColor }) => (
  <div className={`${bgColor} rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden`}>
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-2 sm:gap-3">
        <div className={`${textColor} bg-white/20 rounded-full p-2 sm:p-2.5 flex-shrink-0`}>
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-1 truncate">{count}</h3>
          <p className="text-white/90 font-medium text-xs sm:text-sm truncate">{label}</p>
          {subLabel && <p className="text-white/70 text-xs mt-1 truncate">{subLabel}</p>}
        </div>
      </div>
      <button className="text-white/80 hover:text-white flex-shrink-0 p-1 -mr-1 touch-manipulation">
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </button>
    </div>
  </div>
);

// ============================================================================
// TAB NAVIGATION COMPONENT
// ============================================================================

const TabNavigation = ({ tabs, activeTab, onTabChange }) => (
  <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        className={`
          px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors
          ${activeTab === tab.id
            ? 'bg-teal-500 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }
        `}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

// ============================================================================
// MAIN PAYMENTS COMPONENT
// ============================================================================

export default function Payments({ onUpdateNavigation }) {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  
  // ============================================================================
  // BREADCRUMB NAVIGATION
  // ============================================================================

  useEffect(() => {
    if (onUpdateNavigation) {
      onUpdateNavigation({
        breadcrumbs: ['Purchase', 'Vendor Profile', 'Payment Details']
      });
    }
    
    return () => {
      if (onUpdateNavigation) {
        onUpdateNavigation(null);
      }
    };
  }, [onUpdateNavigation]);

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  // Data state
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Stats state
  const [stats, setStats] = useState({
    totalPayment: 0,
    paymentsDone: 0,
    pendingPayment: 0,
    failedPayment: 0,
    pendingCount: 0,
    doneCount: 0,
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);

  // Filter state
  const [activeTab, setActiveTab] = useState('all');

  // Ref to track request in progress
  const requestInProgress = useRef(false);
  const lastFetchParams = useRef(null);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  /**
   * Fetch payments from API
   * TODO: Replace with actual API call when backend is ready
   */
  const fetchPayments = useCallback(async () => {
    // Prevent duplicate requests
    const currentParams = JSON.stringify({ vendorId, currentPage, pageSize, activeTab });
    if (requestInProgress.current && lastFetchParams.current === currentParams) {
      logger.log('⏭️ Skipping duplicate request');
      return;
    }

    requestInProgress.current = true;
    lastFetchParams.current = currentParams;

    setLoading(true);
    setError('');

    try {
      logger.log('🔄 Fetching payments...', { vendorId, currentPage, pageSize, activeTab });

      // TODO: Replace this with actual API call
      // Example:
      // const response = await getVendorPayments({
      //   vendor_id: vendorId,
      //   page: currentPage,
      //   page_size: pageSize,
      //   status: activeTab !== 'all' ? activeTab : undefined
      // });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // For now, use demo data
      setPayments(DEMO_PAYMENTS);
      setStats(DEMO_STATS);
      
      // Filter based on active tab
      const filtered = activeTab === 'all' 
        ? DEMO_PAYMENTS 
        : DEMO_PAYMENTS.filter(p => p.status.toLowerCase() === activeTab.toLowerCase() || 
            (activeTab === 'pending' && p.status === 'Pay Now'));
      
      setFilteredPayments(filtered);
      
      // Update pagination
      setTotalCount(filtered.length);
      setTotalPages(Math.ceil(filtered.length / pageSize));

      logger.log('✅ Payments loaded successfully');
    } catch (err) {
      logger.error('❌ Error fetching payments:', err);
      setError(err.message || 'Failed to load payments');
      setPayments([]);
      setFilteredPayments([]);
    } finally {
      setLoading(false);
      requestInProgress.current = false;
    }
  }, [vendorId, currentPage, pageSize, activeTab]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentPage(1); // Reset to first page when changing tabs
    lastFetchParams.current = null;
  };

  const handleRowClick = (payment) => {
    logger.log('Payment clicked:', payment);
    // TODO: Navigate to payment detail page when implemented
    // navigate(`/payments/${payment.id}`);
  };

  const handleRetry = () => {
    fetchPayments();
  };

  const handleBackToVendor = () => {
    navigate(`/vendors/${vendorId}`);
  };

  // ============================================================================
  // RENDER STATS CARDS
  // ============================================================================

  const renderStatsCards = () => (
    <>
      <StatCard
        icon={<IndianRupee className="w-5 h-5" />}
        count={`₹ ${stats.totalPayment.toLocaleString('en-IN')}`}
        label="Total Payment"
        subLabel={`${stats.addedInLast2Days || 5} added in last 2 days`}
        bgColor="bg-purple-500"
        textColor="text-purple-500"
      />
      <StatCard
        icon={<CheckCircle className="w-5 h-5" />}
        count={`₹ ${stats.paymentsDone.toLocaleString('en-IN')}`}
        label="Payments Done"
        subLabel={`${stats.doneCount || 5} payments are done`}
        bgColor="bg-teal-500"
        textColor="text-teal-500"
      />
      <StatCard
        icon={<AlertCircle className="w-5 h-5" />}
        count={`₹ ${stats.pendingPayment.toLocaleString('en-IN')}`}
        label="Pending Payment"
        subLabel={`${stats.pendingCount || 2} need to proceed asap`}
        bgColor="bg-yellow-500"
        textColor="text-yellow-500"
      />
      <StatCard
        icon={<XCircle className="w-5 h-5" />}
        count={stats.failedPayment.toLocaleString('en-IN')}
        label="Failed Payment"
        subLabel={`${stats.addedInLast2Days || 5} added in last 2 days`}
        bgColor="bg-red-500"
        textColor="text-red-500"
      />
    </>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      {/* Back Button */}
      <button
        onClick={handleBackToVendor}
        className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="font-medium">Back to Vendor</span>
      </button>

      <DynamicList
        config={paymentsConfig}
        data={filteredPayments}
        loading={loading}
        error={error}
        emptyMessage={paymentsConfig.emptyMessage}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        onRowClick={handleRowClick}
        onRetry={handleRetry}
        statsCards={renderStatsCards()}
      >
        {/* Tab Navigation - Rendered above table */}
        <div className="px-6 pt-4">
          <TabNavigation
            tabs={paymentsConfig.tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </div>
      </DynamicList>
    </>
  );
}

/**
 * ============================================================================
 * BACKEND INTEGRATION GUIDE
 * ============================================================================
 * 
 * When backend is ready, follow these steps:
 * 
 * 1. CREATE API SERVICE
 * Create /services/payments.js with:
 * 
 * export const getVendorPayments = async (params) => {
 *   const response = await api.get(`/vendors/${params.vendor_id}/payments/`, {
 *     params: {
 *       page: params.page,
 *       page_size: params.page_size,
 *       status: params.status
 *     }
 *   });
 *   return response.data;
 * };
 * 
 * export const getPaymentStats = async (vendorId) => {
 *   const response = await api.get(`/vendors/${vendorId}/payment-stats/`);
 *   return response.data;
 * };
 * 
 * 2. UPDATE fetchPayments FUNCTION
 * Replace the TODO section with:
 * 
 * const response = await getVendorPayments({
 *   vendor_id: vendorId,
 *   page: currentPage,
 *   page_size: pageSize,
 *   status: activeTab !== 'all' ? activeTab : undefined
 * });
 * 
 * setPayments(response.results);
 * setTotalCount(response.total_count);
 * setTotalPages(response.total_pages);
 * 
 * 3. FETCH STATS
 * Add stats fetching:
 * 
 * const statsResponse = await getPaymentStats(vendorId);
 * setStats({
 *   totalPayment: statsResponse.total_payment,
 *   paymentsDone: statsResponse.payments_done,
 *   pendingPayment: statsResponse.pending_payment,
 *   failedPayment: statsResponse.failed_payment,
 *   pendingCount: statsResponse.pending_count,
 *   doneCount: statsResponse.done_count
 * });
 * 
 * 4. ADD ROUTING
 * Add route in AppRoutes.jsx:
 * 
 * <Route
 *   path="/vendors/:vendorId/payments"
 *   element={
 *     <ProtectedRoute isLoggedIn={isLoggedIn}>
 *       <AuthenticatedLayout {...layoutProps}>
 *         <Payments />
 *       </AuthenticatedLayout>
 *     </ProtectedRoute>
 *   }
 * />
 * 
 * 5. LINK FROM VENDOR PROFILE
 * In vendorProfile.jsx, add navigation:
 * 
 * const handlePaymentClick = (payment) => {
 *   navigate(`/vendors/${vendorId}/payments`);
 * };
 * 
 * ============================================================================
 */