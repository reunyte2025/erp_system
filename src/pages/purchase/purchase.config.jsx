import { User, Users } from 'lucide-react';

/**
 * ============================================================================
 * PURCHASE MODULE CONFIGURATION
 * ============================================================================
 * 
 * This file contains ALL configuration for the Purchase (Vendors) list page.
 * 
 * Separation of Concerns:
 * - Purchase.jsx = Business logic, state management, API calls
 * - purchase.config.jsx = UI configuration, column definitions
 * 
 * @module purchaseConfig
 */

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Vendor avatar color mapping
 * Returns color class based on index
 */
const getVendorColor = (index) => {
  const colors = [
    'bg-teal-500',
    'bg-green-500',
    'bg-cyan-500',
    'bg-purple-500',
    'bg-yellow-600',
    'bg-red-600',
  ];
  return colors[index % colors.length];
};

/**
 * Project avatar color mapping for last project column
 */
const getProjectColor = (index) => {
  const colors = [
    'bg-lime-500',
    'bg-green-500',
    'bg-teal-500',
  ];
  return colors[index % colors.length];
};

/**
 * Category badge color mapping
 */
const getCategoryColor = (category) => {
  const colorMap = {
    'Plumbing': 'bg-green-100 text-green-700',
    'Interior': 'bg-blue-100 text-blue-700',
    'Ceramics': 'bg-red-100 text-red-700',
    'Electrical': 'bg-yellow-100 text-yellow-700',
    'Carpentry': 'bg-purple-100 text-purple-700',
    'Painting': 'bg-orange-100 text-orange-700',
  };
  return colorMap[category] || 'bg-gray-100 text-gray-700';
};

/**
 * Format full name from vendor data
 */
const formatVendorName = (vendor) => {
  const name = vendor.company_name || vendor.name || 'ABC Infra';
  return name.length > 25 ? name.substring(0, 25) + '...' : name;
};

/**
 * Format email
 */
const formatEmail = (vendor) => {
  return vendor.email || 'abcinfra@gmail.com';
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
  // VENDOR NAME COLUMN (Complex with Avatar)
  // ============================================================================
  {
    key: 'vendor_name',
    label: 'Vendor Name',
    render: (row, index) => (
      <div className="flex items-center gap-3">
        {/* Avatar with Dynamic Color */}
        <div
          className={`w-10 h-10 ${getVendorColor(index)} rounded-full flex items-center justify-center flex-shrink-0`}
        >
          <User className="w-5 h-5 text-white" />
        </div>
        {/* Name and Email */}
        <div className="min-w-0">
          <div className="font-medium text-gray-900">
            {formatVendorName(row)}
          </div>
          <div className="text-sm text-gray-500 truncate">
            {formatEmail(row)}
          </div>
        </div>
      </div>
    ),
  },

  // ============================================================================
  // PROJECTS COLUMN (Number)
  // ============================================================================
  {
    key: 'projects',
    label: 'Projects',
    render: (row) => (
      <span className="text-gray-700 font-medium">
        {row.total_projects || 50}
      </span>
    ),
    align: 'center',
  },

  // ============================================================================
  // LAST PROJECT COLUMN (Project with Avatar)
  // ============================================================================
  {
    key: 'last_project',
    label: 'last Project',
    render: (row, index) => (
      <div className="flex items-center gap-2">
        {/* Project Avatar */}
        <div
          className={`w-8 h-8 ${getProjectColor(index)} rounded-full flex items-center justify-center flex-shrink-0`}
        >
          <Users className="w-4 h-4 text-white" />
        </div>
        {/* Project Name */}
        <span className="text-gray-700 font-medium">
          {row.last_project?.name || 'Acme Corporation'}
        </span>
      </div>
    ),
  },

  // ============================================================================
  // CATEGORY COLUMN (Badge)
  // ============================================================================
  {
    key: 'category',
    label: 'Category',
    render: (row, index) => {
      // Cycle through categories for demo
      const categories = ['Plumbing', 'Interior', 'Ceramics'];
      const category = row.category || categories[index % categories.length];
      
      return (
        <span
          className={`inline-block px-3 py-1.5 rounded-full text-xs font-semibold ${getCategoryColor(category)}`}
        >
          {category}
        </span>
      );
    },
  },

  // ============================================================================
  // TOTAL OUTSTANDING COLUMN (Currency)
  // ============================================================================
  {
    key: 'outstanding',
    label: 'Total Outstanding',
    render: (row) => (
      <span className="text-gray-700 font-medium">
        Rs. {row.total_outstanding ? row.total_outstanding.toLocaleString('en-IN') : '2,90,589'}
      </span>
    ),
  },

  // ============================================================================
  // DATE COLUMN
  // ============================================================================
  {
    key: 'date',
    label: 'Date',
    render: (row) => {
      // Use created_at or default date
      const date = row.created_at 
        ? new Date(row.created_at).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }).replace(/\//g, '- ')
        : '01- 01- 2026';
      
      return <span className="text-gray-700">{date}</span>;
    },
  },
];

// ============================================================================
// MAIN CONFIGURATION OBJECT
// ============================================================================

/**
 * Purchase/Vendor List Configuration
 * 
 * This object contains all configuration for the Purchase/Vendors list page:
 * - Page metadata (title, icon)
 * - Button labels
 * - Column definitions
 * - Search/filter settings
 * - Messages for different states
 */
const purchaseConfig = {
  // Page Metadata
  title: 'Vendors List',
  icon: User,

  // Button Labels
  addButtonLabel: 'Add Client',

  // Column Definitions
  columns: columns,

  // Layout Type (table or cards)
  layoutType: 'table', // Use table layout for vendors

  // Search & Filter
  showSearch: true,
  showFilter: true,

  // Messages
  loadingMessage: 'Loading vendors...',
  emptyMessage: 'No Vendors Found',
  emptySubMessage: 'Currently there are no vendors in the system',
  
  // Note displayed below header
  note: null, // No note for purchase page

  // Default Sorting (optional)
  defaultSort: {
    field: 'company_name',
    direction: 'asc',
  },

  // Page Size (optional)
  defaultPageSize: 10,
};

export default purchaseConfig;

/**
 * ============================================================================
 * FUTURE ENHANCEMENTS - WHEN BACKEND IS READY
 * ============================================================================
 * 
 * 1. REAL VENDOR DATA
 * Replace hardcoded values with actual API fields:
 * 
 * {
 *   key: 'projects',
 *   label: 'Projects',
 *   accessor: 'total_projects',
 * }
 * 
 * {
 *   key: 'last_project',
 *   label: 'last Project',
 *   render: (row) => (
 *     <div className="flex items-center gap-2">
 *       <div className="w-8 h-8 bg-green-500 rounded-full">
 *         <Users className="w-4 h-4 text-white" />
 *       </div>
 *       <span>{row.last_project?.name || 'N/A'}</span>
 *     </div>
 *   ),
 * }
 * 
 * 2. CATEGORY FROM BACKEND
 * {
 *   key: 'category',
 *   label: 'Category',
 *   accessor: 'category',
 *   render: (row) => (
 *     <span className={`px-3 py-1 rounded-full ${getCategoryColor(row.category)}`}>
 *       {row.category}
 *     </span>
 *   ),
 * }
 * 
 * 3. OUTSTANDING AMOUNT
 * {
 *   key: 'outstanding',
 *   label: 'Total Outstanding',
 *   accessor: 'total_outstanding',
 *   render: (row) => (
 *     <span>Rs. {row.total_outstanding.toLocaleString('en-IN')}</span>
 *   ),
 * }
 * 
 * 4. DYNAMIC DATES
 * {
 *   key: 'date',
 *   label: 'Date',
 *   accessor: 'created_at',
 *   render: (row) => {
 *     const date = new Date(row.created_at);
 *     return date.toLocaleDateString('en-GB', {
 *       day: '2-digit',
 *       month: '2-digit',
 *       year: 'numeric'
 *     }).replace(/\//g, '- ');
 *   },
 * }
 * 
 * 5. FILTERABLE COLUMNS
 * Add filter options for categories, date ranges, outstanding amounts
 * 
 * 6. SORTABLE COLUMNS
 * Enable sorting on vendor name, projects count, outstanding amount, date
 * 
 * ============================================================================
 */