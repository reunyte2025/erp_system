import { Receipt, FileText } from 'lucide-react';

/**
 * ============================================================================
 * PAYMENTS MODULE CONFIGURATION
 * ============================================================================
 * 
 * This file contains ALL configuration for the Payments list page.
 * 
 * Separation of Concerns:
 * - payments.jsx = Business logic, state management, API calls
 * - payments.config.jsx = UI configuration, column definitions
 * 
 * @module paymentsConfig
 */

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Status badge configuration
 * Returns appropriate classes for payment status badges
 */
const getStatusConfig = (status) => {
  const statusMap = {
    'Pay Now': {
      bg: 'bg-red-100',
      text: 'text-red-700',
      icon: '⚠️',
      displayText: 'Pay Now'
    },
    'Pending': {
      bg: 'bg-orange-100',
      text: 'text-orange-700',
      icon: '⏱',
      displayText: 'Pending'
    },
    'Completed': {
      bg: 'bg-green-100',
      text: 'text-green-700',
      icon: '✓',
      displayText: 'Completed'
    },
    'Failed': {
      bg: 'bg-red-100',
      text: 'text-red-700',
      icon: '✕',
      displayText: 'Failed'
    }
  };
  
  return statusMap[status] || statusMap['Pending'];
};

/**
 * Format currency amount
 */
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return 'Rs. 0';
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `Rs. ${numAmount.toLocaleString('en-IN')}`;
};

/**
 * Format date and time
 */
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    return 'Invalid Date';
  }
};

/**
 * Truncate payment ID for display
 */
const formatPaymentId = (paymentId) => {
  if (!paymentId) return 'N/A';
  return paymentId.length > 10 ? `${paymentId.substring(0, 10)}...` : paymentId;
};

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

/**
 * Column Configuration
 * 
 * Each column object has:
 * - key: Unique identifier
 * - label: Display name in header
 * - accessor: Property path to access data (optional if using render)
 * - render: Custom render function (optional)
 * - width: Column width (optional)
 * - align: Text alignment (left/center/right)
 */
const columns = [
  // ============================================================================
  // PAYMENT COLUMN (Amount with Date)
  // ============================================================================
  {
    key: 'payment',
    label: 'Payment',
    render: (row) => (
      <div className="flex items-center gap-3">
        {/* Payment Icon */}
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Receipt className="w-5 h-5 text-gray-600" />
        </div>
        {/* Amount and Date */}
        <div className="min-w-0">
          <div className="font-medium text-gray-900">
            {formatCurrency(row.amount)}
          </div>
          <div className="text-xs text-gray-500">
            {formatDateTime(row.payment_date || row.created_at)}
          </div>
        </div>
      </div>
    ),
  },

  // ============================================================================
  // PAYMENT ID COLUMN
  // ============================================================================
  {
    key: 'payment_id',
    label: 'Payment ID',
    render: (row) => (
      <div>
        <div className="font-medium text-gray-700">
          {row.payment_id || row.id || 'N/A'}
        </div>
      </div>
    ),
  },

  // ============================================================================
  // QUOTATION NUMBER COLUMN
  // ============================================================================
  {
    key: 'quotation',
    label: 'Quotation Number',
    render: (row) => (
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-gray-400" />
        <span className="text-gray-700 font-medium">
          {row.quotation_number || 'N/A'}
        </span>
      </div>
    ),
  },

  // ============================================================================
  // STATUS COLUMN (Badge)
  // ============================================================================
  {
    key: 'status',
    label: 'Status',
    render: (row) => {
      const config = getStatusConfig(row.status);
      
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}
        >
          <span>{config.icon}</span>
          {config.displayText}
        </span>
      );
    },
    align: 'left',
  },
];

// ============================================================================
// MAIN CONFIGURATION OBJECT
// ============================================================================

/**
 * Payments List Configuration
 * 
 * This object contains all configuration for the Payments list page:
 * - Page metadata (title, icon)
 * - Button labels
 * - Column definitions
 * - Search/filter settings
 * - Messages for different states
 * - Tab configuration
 */
const paymentsConfig = {
  // Page Metadata
  title: 'Payment History',
  icon: Receipt,

  // Button Labels
  addButtonLabel: null, // No add button for payments list

  // Column Definitions
  columns: columns,

  // Layout Type
  layoutType: 'table', // Use table layout for payments

  // Search & Filter
  showSearch: false, // Search handled differently in payments
  showFilter: false, // Filter tabs used instead

  // Messages
  loadingMessage: 'Loading payments...',
  emptyMessage: 'No Payments Found',
  emptySubMessage: 'No payment records available for this vendor',
  
  // Note displayed below header
  note: null,

  // Default Sorting (optional)
  defaultSort: {
    field: 'payment_date',
    direction: 'desc',
  },

  // Page Size (optional)
  defaultPageSize: 10,

  // Tab Configuration for filtering
  tabs: [
    { id: 'all', label: 'All', filter: null },
    { id: 'completed', label: 'Completed', filter: 'Completed' },
    { id: 'pending', label: 'Pending', filter: 'Pending' },
    { id: 'failed', label: 'Failed', filter: 'Failed' },
  ],
};

export default paymentsConfig;

/**
 * ============================================================================
 * FUTURE ENHANCEMENTS - WHEN BACKEND IS READY
 * ============================================================================
 * 
 * 1. REAL PAYMENT DATA
 * Replace demo data with actual API fields:
 * 
 * Backend Response Expected Format:
 * {
 *   results: [
 *     {
 *       id: 1,
 *       payment_id: "#123aa45",
 *       amount: 1020000,
 *       payment_date: "2025-11-27T11:35:00Z",
 *       quotation_number: "QT-2026-02034",
 *       status: "Completed", // "Pay Now" | "Pending" | "Completed" | "Failed"
 *       vendor_id: 1,
 *       project_id: 1,
 *       created_at: "2025-11-27T11:35:00Z",
 *       updated_at: "2025-11-27T11:35:00Z"
 *     }
 *   ],
 *   total_count: 100,
 *   total_pages: 10,
 *   current_page: 1,
 *   page_size: 10
 * }
 * 
 * 2. ADDITIONAL COLUMNS (Optional)
 * Add these columns when data becomes available:
 * 
 * {
 *   key: 'vendor',
 *   label: 'Vendor',
 *   render: (row) => (
 *     <span className="text-gray-700">{row.vendor_name || 'N/A'}</span>
 *   ),
 * }
 * 
 * {
 *   key: 'project',
 *   label: 'Project',
 *   render: (row) => (
 *     <span className="text-gray-700">{row.project_name || 'N/A'}</span>
 *   ),
 * }
 * 
 * {
 *   key: 'payment_method',
 *   label: 'Method',
 *   render: (row) => (
 *     <span className="text-gray-600 text-sm">{row.payment_method || 'N/A'}</span>
 *   ),
 * }
 * 
 * 3. CLICKABLE ROWS
 * Navigate to payment detail page on row click
 * 
 * 4. EXPORT FUNCTIONALITY
 * Add ability to export payments to Excel/PDF
 * 
 * 5. BULK ACTIONS
 * Add checkboxes for bulk payment operations
 * 
 * ============================================================================
 */