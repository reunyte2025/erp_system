import { FileText } from 'lucide-react';

/**
 * ============================================================================
 * QUOTATION MODULE CONFIGURATION
 * ============================================================================
 * 
 * This file contains ALL configuration for the Quotations list page.
 * Design matches the exact layout from the provided image.
 * 
 * Separation of Concerns:
 * - QuotationsList.jsx = Business logic, state management, API calls
 * - quotation.config.jsx = UI configuration, column definitions
 */

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get status color for document icon based on status
 */
const getStatusIconColor = (status) => {
  const normalizedStatus = String(status || '').toLowerCase();
  
  const colors = {
    'draft': 'text-blue-500',
    'pending': 'text-yellow-600',
    'sent': 'text-blue-500',
    'approved': 'text-green-600',
    'rejected': 'text-red-600',
    'in_progress': 'text-yellow-600',
    'completed': 'text-green-600',
    'failed': 'text-red-600',
    '1': 'text-blue-500',      // Draft
    '2': 'text-yellow-600',    // Pending
    '3': 'text-blue-500',      // Sent
    '4': 'text-green-600',     // Approved
    '5': 'text-red-600',       // Rejected
  };
  
  return colors[normalizedStatus] || 'text-gray-600';
};

/**
 * Get status badge configuration
 */
const getStatusBadge = (status) => {
  const normalizedStatus = String(status || '').toLowerCase();
  
  const statusConfigs = {
    'draft': {
      text: 'Draft',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      icon: '📄'
    },
    'pending': {
      text: 'Pending',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      icon: '⏱️'
    },
    'sent': {
      text: 'Sent',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      icon: '📤'
    },
    'approved': {
      text: 'Completed',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      icon: '✅'
    },
    'rejected': {
      text: 'Failed',
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      icon: '❌'
    },
    'in_progress': {
      text: 'In Progress',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      icon: '⏱️'
    },
    'completed': {
      text: 'Completed',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      icon: '✅'
    },
    'failed': {
      text: 'Failed',
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      icon: '❌'
    },
    '1': {
      text: 'Draft',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      icon: '📄'
    },
    '2': {
      text: 'Pending',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      icon: '⏱️'
    },
    '3': {
      text: 'Sent',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      icon: '📤'
    },
    '4': {
      text: 'Completed',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      icon: '✅'
    },
    '5': {
      text: 'Failed',
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      icon: '❌'
    }
  };
  
  return statusConfigs[normalizedStatus] || statusConfigs['draft'];
};

/**
 * Format currency in Indian Rupee format
 */
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return 'Rs. 0';
  const num = parseFloat(amount);
  if (isNaN(num)) return 'Rs. 0';
  // Show decimals only when the value actually has them (e.g. 7.2 → "7.20", 40 → "40")
  const hasDecimal = num % 1 !== 0;
  return `Rs. ${num.toLocaleString('en-IN', {
    minimumFractionDigits: hasDecimal ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Format date to DD-MM-YYYY
 */
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (error) {
    return 'N/A';
  }
};

/**
 * Format timestamp to "Tue 27 Nov 2025 11:35 AM"
 */
const formatTimestamp = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    
    return `${dayName} ${day} ${month} ${year} ${hours}:${minutes} ${ampm}`;
  } catch (error) {
    return '';
  }
};

/**
 * Get project name from row data.
 * Priority: enriched project_name (set by fetchQuotations) → project object → fallback
 */
const getProjectName = (row) => {
  // First priority: enriched project_name attached by fetchQuotations in quotationsList
  if (row.project_name && !row.project_name.startsWith('Project #')) {
    return row.project_name.length > 25 ? row.project_name.substring(0, 25) + '...' : row.project_name;
  }

  // Fallback: project object if API returned it nested
  if (row.project && typeof row.project === 'object') {
    const name = row.project.name || row.project.title || `Project #${row.project.id}`;
    return name.length > 25 ? name.substring(0, 25) + '...' : name;
  }

  // Fallback: enriched project_name even if it's a "Project #N" placeholder
  if (row.project_name) {
    return row.project_name.length > 25 ? row.project_name.substring(0, 25) + '...' : row.project_name;
  }

  if (row.project && typeof row.project === 'number') {
    return `Project #${row.project}`;
  }

  return 'N/A';
};

/**
 * Truncate text
 */
const truncateText = (text, maxLength = 30) => {
  if (!text) return '-';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

const columns = [
  // ============================================================================
  // QUOTATION NUMBER COLUMN (with Icon and Timestamp)
  // ============================================================================
  {
    key: 'quotation_number',
    label: 'Quotation Number',
    render: (row) => {
      const status = row.status_display || row.status;
      const iconColor = getStatusIconColor(status);
      
      // Format quotation number from backend (numeric) to display format
      const formatQuotationNumber = (number) => {
        if (!number) return `QT-2026-${String(row.id || '00000').padStart(5, '0')}`;
        
        // If it's already formatted, return as is
        if (String(number).startsWith('QT-')) return number;
        
        // Convert numeric format to QT-YYYY-XXXXX
        const numStr = String(number);
        if (numStr.length >= 8) {
          // Extract year and number parts from numeric format (e.g., 20260101234)
          const year = numStr.substring(0, 4);
          const rest = numStr.substring(4);
          return `QT-${year}-${rest.padStart(5, '0')}`;
        }
        
        return `QT-2026-${String(number).padStart(5, '0')}`;
      };
      
      return (
        <div className="flex items-center gap-3">
          {/* Document Icon with Status Color */}
          <div className={`${iconColor} flex-shrink-0`}>
            <FileText className="w-9 h-9" />
          </div>
          {/* Quotation Number and Timestamp */}
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 text-sm">
              {formatQuotationNumber(row.quotation_number)}
            </div>
            <div className="text-xs text-gray-500">
              {formatTimestamp(row.created_at || row.date)}
            </div>
          </div>
        </div>
      );
    },
  },

  // ============================================================================
  // PROJECT NAME COLUMN
  // ============================================================================
  {
    key: 'project',
    label: 'Project Name',
    render: (row) => (
      <span className="text-gray-700 text-sm" title={getProjectName(row)}>
        {getProjectName(row)}
      </span>
    ),
  },

  // ============================================================================
  // NOTES COLUMN
  // ============================================================================
  {
    key: 'notes',
    label: 'Notes',
    render: (row) => (
      <div className="max-w-xs" title={row.notes || '—'}>
        <span className="text-gray-700 text-sm">
          {row.notes ? truncateText(row.notes, 30) : '—'}
        </span>
      </div>
    ),
  },

  // ============================================================================
  // TOTAL OUTSTANDING COLUMN
  // ============================================================================
  {
    key: 'grand_total',
    label: 'Total Outstanding',
    render: (row) => {
      // grand_total in DB is a rounded integer (backend IntegerField).
      // Recalculate precise value from gst_rate + total_amount so decimals show correctly.
      const subtotal      = parseFloat(row.total_amount  || 0);
      const gstRate       = parseFloat(row.gst_rate      || 0);
      const discountRate  = parseFloat(row.discount_rate || 0);

      let precise;
      if (gstRate > 0 || discountRate > 0) {
        const discountAmt = (subtotal * discountRate) / 100;
        const taxable     = subtotal - discountAmt;
        const gstAmt      = (taxable * gstRate) / 100;
        precise = parseFloat((taxable + gstAmt).toFixed(2));
      } else {
        // No GST/discount — fall back to stored grand_total
        precise = parseFloat(row.grand_total || row.total_amount || 0);
      }

      return (
        <span className="text-gray-900 font-medium text-sm">
          {formatCurrency(precise)}
        </span>
      );
    },
  },

  // ============================================================================
  // DATE COLUMN
  // ============================================================================
  {
    key: 'created_at',
    label: 'Date',
    render: (row) => (
      <span className="text-gray-700 text-sm">
        {formatDate(row.created_at || row.date)}
      </span>
    ),
  },

  // ============================================================================
  // STATUS COLUMN (Badge with Icon)
  // ============================================================================
  {
    key: 'status',
    label: 'Status',
    render: (row) => {
      const status = row.status_display || row.status;
      const statusConfig = getStatusBadge(status);
      
      return (
        <div className="flex items-center">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}>
            <span>{statusConfig.icon}</span>
            <span>{statusConfig.text}</span>
          </span>
        </div>
      );
    },
    align: 'left',
  },
];

// ============================================================================
// MAIN CONFIGURATION OBJECT
// ============================================================================

const quotationConfig = {
  // Page Metadata
  title: 'Quotation List',
  icon: FileText,

  // Button Labels
  addButtonLabel: 'Add Quotation',

  // Column Definitions
  columns: columns,

  // Search & Filter
  showSearch: true,
  showFilter: true,

  // Messages
  loadingMessage: 'Loading quotations...',
  emptyMessage: 'No Quotations Found',
  emptySubMessage: 'Start by adding your first quotation',
  note: 'Click on Quotation to get more details',

  // Default Sorting (optional)
  defaultSort: {
    field: 'created_at',
    direction: 'desc',
  },

  // Page Size (optional)
  defaultPageSize: 10,
};

export default quotationConfig;

/**
 * ============================================================================
 * EXPORT HELPER FUNCTIONS
 * ============================================================================
 */
export {
  formatCurrency,
  formatDate,
  formatTimestamp,
  getProjectName,
  getStatusBadge,
  getStatusIconColor,
  truncateText
};