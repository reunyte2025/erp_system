import { Building2, Trash2, RotateCcw } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

/**
 * ============================================================================
 * VENDOR MODULE CONFIGURATION
 * ============================================================================
 */

// ============================================================================
// VENDOR CONSTANTS
// ============================================================================

export const VENDOR_STATUS = {
  ACTIVE: 1,
  INACTIVE: 2,
  BLACKLISTED: 3,
};

export const VENDOR_STATUS_DISPLAY = {
  1: 'Active',
  2: 'Inactive',
  3: 'Blacklisted',
};

export const VENDOR_CATEGORIES = {
  1: 'Plumbing',
  2: 'Electrical',
  3: 'Civil',
  4: 'HVAC',
  99: 'Other',
};

export const VENDOR_CATEGORY_OPTIONS = [
  { value: 1, label: 'Plumbing' },
  { value: 2, label: 'Electrical' },
  { value: 3, label: 'Civil' },
  { value: 4, label: 'HVAC' },
  { value: 99, label: 'Other' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getStatusColor = (index) => {
  const colors = [
    'bg-teal-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-emerald-600',
    'bg-indigo-500',
    'bg-cyan-500',
  ];
  return colors[index % colors.length];
};

export const formatVendorName = (name) => {
  const vendorName = name || 'N/A';
  return vendorName.length > 25 ? vendorName.substring(0, 25) + '...' : vendorName;
};

export const getStatusIconColor = (status) => {
  const s = Number(status);
  const colors = {
    1: 'text-teal-600',    // Active
    2: 'text-yellow-600',  // Inactive
    3: 'text-red-600',     // Blacklisted
  };
  return colors[s] || 'text-gray-600';
};

export const getStatusBadge = (status, isActive) => {
  // is_active=false → show Deactive badge regardless of status integer
  if (isActive === false) {
    return { text: 'Deactive', bgColor: 'bg-red-100', textColor: 'text-red-700', icon: 'D' };
  }
  const s = Number(status);
  const statusConfigs = {
    1: { text: 'Active',      bgColor: 'bg-teal-100',   textColor: 'text-teal-700',   icon: 'A' },
    2: { text: 'Inactive',    bgColor: 'bg-yellow-100', textColor: 'text-yellow-700', icon: 'I' },
    3: { text: 'Blacklisted', bgColor: 'bg-red-100',    textColor: 'text-red-700',    icon: 'B' },
  };
  return statusConfigs[s] || statusConfigs[1];
};

export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return 'Rs. 0';
  return `Rs. ${Number(amount).toLocaleString('en-IN')}`;
};

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    const day   = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year  = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch { return 'N/A'; }
};

export const formatCategoryList = (categories) => {
  if (!categories || categories.length === 0) return 'N/A';
  if (Array.isArray(categories)) {
    const labels = categories.map(cat => {
      const catNum = Number(cat);
      return VENDOR_CATEGORIES[catNum] || `Category ${cat}`;
    });
    return labels.join(', ');
  }
  return String(categories);
};

export const truncateText = (text, maxLength = 30) => {
  if (!text) return '-';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// ============================================================================
// ACTIONS DROPDOWN MENU COMPONENT
// ============================================================================

const ActionsMenu = ({ row, handlers }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const handleDelete = (e) => {
    e.stopPropagation();
    setOpen(false);
    handlers?.onDeleteVendor?.(row);
  };

  return (
    <div className="relative flex justify-center" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg
                   transition-all duration-150
                   ${open
                     ? 'text-gray-700 bg-gray-100'
                     : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:bg-gray-200'
                   }`}
        title="Actions"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3"  r="1.4" />
          <circle cx="8" cy="8"  r="1.4" />
          <circle cx="8" cy="13" r="1.4" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-9 z-50 w-44 bg-white rounded-xl border border-gray-100 py-1.5 overflow-hidden"
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.13)', animation: 'dropdownIn 0.15s ease' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium
                       text-red-500 hover:bg-red-50 transition-colors duration-100"
          >
            <Trash2 className="w-4 h-4 flex-shrink-0" />
            Delete Vendor
          </button>
        </div>
      )}

      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

const baseColumns = [
  // ── Vendor Name — sortable ──────────────────────────────────────────────
  {
    key: 'name',
    label: 'Vendor Name',
    width: '220px',
    headerAlign: 'left',
    sortField: 'name',
    render: (row, index) => (
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 ${getStatusColor(index)} rounded-full flex items-center justify-center flex-shrink-0`}
        >
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="font-medium text-gray-900 truncate max-w-[130px]">
            {formatVendorName(row.name)}
          </div>
          <div className="text-sm text-gray-500 truncate max-w-[130px]">
            {row.email || 'No email'}
          </div>
        </div>
      </div>
    ),
  },

  // ── Contact Person ──────────────────────────────────────────────────────
  {
    key: 'contact_person',
    label: 'Contact Person',
    width: '160px',
    headerAlign: 'center',
    render: (row) => (
      <span className="text-gray-700 max-w-[140px] block truncate" title={row.contact_person || 'N/A'}>
        {row.contact_person || '-'}
      </span>
    ),
  },

  // ── Phone ───────────────────────────────────────────────────────────────
  {
    key: 'phone',
    label: 'Phone',
    width: '130px',
    headerAlign: 'center',
    render: (row) => (
      <span className="text-gray-700" title={row.phone || 'N/A'}>
        {row.phone || '-'}
      </span>
    ),
  },

  // ── City ────────────────────────────────────────────────────────────────
  {
    key: 'city',
    label: 'City',
    width: '110px',
    headerAlign: 'center',
    render: (row) => (
      <span className="text-gray-700 max-w-[100px] block truncate" title={row.city || 'N/A'}>
        {row.city || '-'}
      </span>
    ),
  },

  // ── Category ────────────────────────────────────────────────────────────
  {
    key: 'vendor_categories_display',
    label: 'Category',
    width: '140px',
    headerAlign: 'center',
    render: (row) => {
      const categories = row.vendor_categories_display || '';
      return (
        <span className="text-gray-700 text-xs max-w-[130px] block truncate" title={categories || 'N/A'}>
          {categories || '-'}
        </span>
      );
    },
  },

  // ── Date — sortable ─────────────────────────────────────────────────────
  {
    key: 'created_at',
    label: 'Date',
    width: '110px',
    headerAlign: 'center',
    sortField: 'created_at',
    render: (row) => {
      if (!row.created_at) return <span className="text-gray-400">—</span>;
      return <span className="text-gray-700">{formatDate(row.created_at)}</span>;
    },
  },

  // ── Status — sortable ───────────────────────────────────────────────────
  // 1 = Active  |  2 = Inactive  |  3 = Blacklisted
  {
    key: 'status',
    label: 'Status',
    width: '130px',
    sortField: 'status',
    align: 'center',
    render: (row) => {
      const statusConfig = getStatusBadge(row.status, row.is_active);
      return (
        <div className="flex justify-center">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusConfig.bgColor} ${statusConfig.textColor} text-xs font-semibold whitespace-nowrap`}
          >
            <span className="w-2 h-2 rounded-full bg-current flex-shrink-0" />
            {statusConfig.text}
          </span>
        </div>
      );
    },
  },

  // ── Actions — Admin only ────────────────────────────────────────────────
  {
    key: 'actions',
    label: 'Actions',
    width: '80px',
    align: 'center',
    adminOnly: true,
    render: (row, index, handlers) => (
      <ActionsMenu row={row} handlers={handlers} />
    ),
  },
];

/**
 * Returns columns for the current user's role.
 * Admin or Manager → all columns including Actions.
 * Regular user → all columns except Actions.
 */
export const getColumns = (isAdminOrManager) =>
  isAdminOrManager ? baseColumns : baseColumns.filter((col) => !col.adminOnly);

// ============================================================================
// MAIN CONFIGURATION OBJECT
// ============================================================================

const vendorConfig = {
  title: 'Vendor List',
  icon: Building2,

  addButtonLabel: 'Add Vendor',

  columns: baseColumns,

  showSearch: true,
  showFilter: true,

  loadingMessage: 'Loading vendors...',
  emptyMessage: 'No Vendors Found',
  emptySubMessage: 'Start by adding your first vendor',
  note: 'Click on vendor to get more details',

  defaultSort: {
    field: 'name',
    direction: 'asc',
  },

  defaultPageSize: 10,
};

export default vendorConfig;