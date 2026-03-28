import { FileText, Trash2, RotateCcw } from "lucide-react";
import { useState, useEffect, useRef } from "react";

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
 * Get status icon configuration with icon component, color, and background.
 * Quotations only have two meaningful states from the user's perspective:
 *   Draft  →  not yet sent for proforma
 *   Proforma Generated  →  proforma has been created from this quotation
 * All other backend status values are mapped to one of these two visuals.
 */
const getStatusIconConfig = (status) => {
  const normalizedStatus = String(status || "").toLowerCase();

  // Icon is ALWAYS FileText — only color + bg change based on status

  // Deleted group
  const deletedGroup = ["deleted", "5"];
  if (deletedGroup.includes(normalizedStatus)) {
    return {
      icon: FileText,
      color: "text-red-500",
      bgColor: "bg-red-50",
      lightBg: "bg-red-100/30",
    };
  }

  // Proforma-Generated group — all backend values that mean "done / proforma exists"
  const proformaGroup = ["sent", "accepted", "approved", "completed", "3", "4"];
  if (proformaGroup.includes(normalizedStatus)) {
    return {
      icon: FileText,
      color: "text-green-600",
      bgColor: "bg-green-50",
      lightBg: "bg-green-100/30",
    };
  }

  // Draft group — everything else falls back to Draft
  return {
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    lightBg: "bg-blue-100/30",
  };
};

/**
 * Get status color for the document icon in the Quotation Number column.
 * Only two states are shown: Draft (blue) and Proforma Generated (green).
 */
const getStatusIconColor = (status) => {
  const normalizedStatus = String(status || "").toLowerCase();
  const deletedGroup = ["deleted", "5"];
  if (deletedGroup.includes(normalizedStatus)) return "text-red-500";
  const proformaGroup = ["sent", "accepted", "approved", "completed", "3", "4"];
  if (proformaGroup.includes(normalizedStatus)) return "text-green-600";
  return "text-blue-500"; // Draft fallback
};

/**
 * Get status badge configuration.
 * The quotation list shows only two statuses:
 *   • Draft              — quotation created, no proforma yet
 *   • Proforma Generated — proforma has been created from this quotation
 * Every backend value maps to one of these two badges.
 */
const getStatusBadge = (status) => {
  const normalizedStatus = String(status || "").toLowerCase();

  // Deleted
  const deletedGroup = ["deleted", "5"];
  if (deletedGroup.includes(normalizedStatus)) {
    return {
      text: "Deleted",
      bgColor: "bg-red-100",
      textColor: "text-red-700",
      icon: "🗑️",
    };
  }

  // All backend values that mean "Proforma Generated"
  const proformaGroup = ["sent", "accepted", "approved", "completed", "3", "4"];
  if (proformaGroup.includes(normalizedStatus)) {
    return {
      text: "Proforma Generated",
      bgColor: "bg-green-100",
      textColor: "text-green-700",
      icon: "✅",
    };
  }

  // Everything else → Draft
  return {
    text: "Draft",
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
    icon: "📄",
  };
};

/**
 * Format currency in Indian Rupee format
 */
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return "Rs. 0";
  const num = parseFloat(amount);
  if (isNaN(num)) return "Rs. 0";
  // Show decimals only when the value actually has them (e.g. 7.2 → "7.20", 40 → "40")
  const hasDecimal = num % 1 !== 0;
  return `Rs. ${num.toLocaleString("en-IN", {
    minimumFractionDigits: hasDecimal ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Format date to DD-MM-YYYY
 */
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (error) {
    return "N/A";
  }
};

/**
 * Format timestamp to "Tue 27 Nov 2025 11:35 AM"
 */
const formatTimestamp = (dateString) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    return `${dayName} ${day} ${month} ${year} ${hours}:${minutes} ${ampm}`;
  } catch (error) {
    return "";
  }
};

/**
 * Get project name from row data.
 * Priority: enriched project_name (set by fetchQuotations) → project object → fallback
 */
const getProjectName = (row) => {
  // First priority: enriched project_name attached by fetchQuotations in quotationsList
  if (row.project_name && !row.project_name.startsWith("Project #")) {
    return row.project_name.length > 25
      ? row.project_name.substring(0, 25) + "..."
      : row.project_name;
  }

  // Fallback: project object if API returned it nested
  if (row.project && typeof row.project === "object") {
    const name =
      row.project.name || row.project.title || `Project #${row.project.id}`;
    return name.length > 25 ? name.substring(0, 25) + "..." : name;
  }

  // Fallback: enriched project_name even if it's a "Project #N" placeholder
  if (row.project_name) {
    return row.project_name.length > 25
      ? row.project_name.substring(0, 25) + "..."
      : row.project_name;
  }

  if (row.project && typeof row.project === "number") {
    return `Project #${row.project}`;
  }

  return "N/A";
};

/**
 * Truncate text
 */
const truncateText = (text, maxLength = 30) => {
  if (!text) return "-";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

/**
 * Check if a quotation is deleted (status 5, is_deleted true, or is_active false)
 */
export const isQuotationDeleted = (row) => {
  const status = String(row.status || "").toLowerCase();
  return (
    status === "5" ||
    status === "deleted" ||
    row.is_deleted === true ||
    row.is_active === false
  );
};

// ============================================================================
// ACTIONS DROPDOWN MENU COMPONENT (Admin / Manager only)
// ============================================================================

const ActionsMenu = ({ row, handlers }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const deleted = isQuotationDeleted(row);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const handleDelete = (e) => {
    e.stopPropagation();
    setOpen(false);
    handlers?.onDeleteQuotation?.(row);
  };

  // Don't show the menu at all for already-deleted quotations
  if (deleted) {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-red-400 font-medium italic">Deleted</span>
      </div>
    );
  }

  return (
    <div className="relative flex justify-center" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`
          inline-flex items-center justify-center w-8 h-8 rounded-lg
          transition-all duration-150
          ${
            open
              ? "text-red-700 bg-red-100"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:bg-gray-200"
          }
        `}
        title="Actions"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.4" />
          <circle cx="8" cy="8" r="1.4" />
          <circle cx="8" cy="13" r="1.4" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          className="absolute right-0 top-10 z-50 w-52 bg-white rounded-xl border border-gray-200 py-1.5 shadow-lg overflow-hidden"
          style={{ animation: "dropdownIn 0.15s ease-out" }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors duration-100 rounded-lg"
          >
            <Trash2 className="w-4 h-4 flex-shrink-0" />
            <span>Delete Quotation</span>
          </button>
        </div>
      )}

      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

const columns = [
  // ============================================================================
  // QUOTATION NUMBER COLUMN (with Icon and Timestamp)
  // ============================================================================
  {
    key: "quotation_number",
    label: "Quotation Number",
    sortField: "quotation_number", // ← API sort_by value
    render: (row) => {
      // Icon is always FileText — only its color changes based on status
      const status = isQuotationDeleted(row)
        ? "5"
        : row.status_display || row.status;
      const iconConfig = getStatusIconConfig(status);
      const IconComponent = FileText; // always FileText, color reflects status

      // Format quotation number from backend (numeric) to display format
      const formatQuotationNumber = (number) => {
        if (!number)
          return `QT-2026-${String(row.id || "00000").padStart(5, "0")}`;

        // If it's already formatted, return as is
        if (String(number).startsWith("QT-")) return number;

        // Convert numeric format to QT-YYYY-XXXXX
        const numStr = String(number);
        if (numStr.length >= 8) {
          // Extract year and number parts from numeric format (e.g., 20260101234)
          const year = numStr.substring(0, 4);
          const rest = numStr.substring(4);
          return `QT-${year}-${rest.padStart(5, "0")}`;
        }

        return `QT-2026-${String(number).padStart(5, "0")}`;
      };

      return (
        <div
          className={`flex items-center gap-3 ${isQuotationDeleted(row) ? "opacity-60" : ""}`}
        >
          {/* Status-colored icon with background */}
          <div
            className={`${iconConfig.lightBg} rounded-xl p-2 flex items-center justify-center flex-shrink-0`}
          >
            <IconComponent className={`w-5 h-5 ${iconConfig.color}`} />
          </div>
          {/* Quotation Number and Timestamp */}
          <div className="min-w-0">
            <div
              className={`font-semibold text-sm ${isQuotationDeleted(row) ? "text-gray-400 line-through" : "text-gray-900"}`}
            >
              {formatQuotationNumber(row.quotation_number)}
            </div>
            <div className="text-xs text-gray-400">
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
    key: "project",
    label: "Project Name",
    render: (row) => (
      <span className="text-gray-700 text-sm" title={getProjectName(row)}>
        {getProjectName(row)}
      </span>
    ),
  },

  // ============================================================================
  // QUOTATION TYPE COLUMN
  // ============================================================================
  {
    key: "quotation_type",
    label: "Quotation Type",
    render: (row) => (
      <div className="max-w-xs">
        {row.quotation_type ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
            {row.quotation_type}
          </span>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        )}
      </div>
    ),
  },

  // ============================================================================
  // TOTAL OUTSTANDING COLUMN
  // ============================================================================
  {
    key: "grand_total",
    label: "Total Outstanding",
    sortField: "grand_total", // ← API sort_by value
    render: (row) => {
      // grand_total in DB is a rounded integer (backend IntegerField).
      // Recalculate precise value from gst_rate + total_amount so decimals show correctly.
      const subtotal = parseFloat(row.total_amount || 0);
      const gstRate = parseFloat(row.gst_rate || 0);
      const discountRate = parseFloat(row.discount_rate || 0);

      let precise;
      if (gstRate > 0 || discountRate > 0) {
        const discountAmt = (subtotal * discountRate) / 100;
        const taxable = subtotal - discountAmt;
        const gstAmt = (taxable * gstRate) / 100;
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
    key: "created_at",
    label: "Date",
    sortField: "created_at", // ← API sort_by value
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
    key: "status",
    label: "Status",
    sortField: "status", // ← API sort_by value
    render: (row) => {
      // Check deleted first — is_deleted / is_active takes priority over status number
      // because the backend may still return status=1 (Draft) even after deletion
      const deleted = isQuotationDeleted(row);
      const statusConfig = deleted
        ? {
            text: "Deleted",
            bgColor: "bg-red-100",
            textColor: "text-red-700",
            icon: "🗑️",
          }
        : getStatusBadge(row.status_display || row.status);

      return (
        <div className="flex items-center">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}
          >
            <span>{statusConfig.icon}</span>
            <span>{statusConfig.text}</span>
          </span>
        </div>
      );
    },
    align: "left",
  },

  // ============================================================================
  // ACTIONS COLUMN (Admin / Manager only)
  // ============================================================================
  {
    key: "actions",
    label: "Actions",
    adminOnly: true,
    align: "center",
    render: (row, index, handlers) => (
      <ActionsMenu row={row} handlers={handlers} />
    ),
  },
];

/**
 * Return columns filtered by role.
 *  isPrivileged = true  → Admin or Manager (sees Actions column)
 *  isPrivileged = false → Regular user (no Actions column)
 */
export const getColumns = (isPrivileged) =>
  isPrivileged ? columns : columns.filter((col) => !col.adminOnly);

// ============================================================================
// MAIN CONFIGURATION OBJECT
// ============================================================================

const quotationConfig = {
  // Page Metadata
  title: "Quotation List",
  icon: FileText,

  // Button Labels
  addButtonLabel: "Add Quotation",

  // Column Definitions
  columns: columns,

  // Search & Filter
  showSearch: true,
  showFilter: true,

  // Messages
  loadingMessage: "Loading quotations...",
  emptyMessage: "No Quotations Found",
  emptySubMessage: "Start by adding your first quotation",
  note: "Click on Quotation to get more details",

  // Default Sorting (optional)
  defaultSort: {
    field: "created_at",
    direction: "desc",
  },

  // Page Size (optional)
  defaultPageSize: 10,
};

export {
  formatCurrency,
  formatDate,
  formatTimestamp,
  getProjectName,
  getStatusBadge,
  getStatusIconColor,
  truncateText,
};

export default quotationConfig;
