import { ClipboardCheck, Building2, Tag } from 'lucide-react';
import NocTypeCard from './nocTypeCard';
import NocActionsMenu from './nocactionsmenu';
import AuthorityActionsMenu from './authorityactionsmenu';

// ============================================================================
// NOC CONFIG — Pure config objects & column definitions. Zero React components.
// Components live in: NocActionsMenu.jsx, AuthorityActionsMenu.jsx, NocTypeCard.jsx
// ============================================================================

// ── Avatar colour cycling ──────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-gradient-to-br from-teal-500 to-teal-600',
  'bg-gradient-to-br from-orange-500 to-orange-600',
  'bg-gradient-to-br from-blue-500 to-blue-600',
  'bg-gradient-to-br from-purple-500 to-purple-600',
  'bg-gradient-to-br from-emerald-500 to-emerald-600',
  'bg-gradient-to-br from-rose-500 to-rose-600',
];
const avatarColor = (i) => AVATAR_COLORS[i % AVATAR_COLORS.length];

// ── Date formatter ─────────────────────────────────────────────────────────
const fmtDate = (ds) => {
  if (!ds) return '—';
  try {
    return new Date(ds).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return '—'; }
};

// ── NOC Status badge map ───────────────────────────────────────────────────
const STATUS_MAP = {
  pending:  { label: 'Pending',   bg: 'bg-yellow-100',  text: 'text-yellow-700',  dot: 'bg-yellow-500'  },
  approved: { label: 'Approved',  bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  rejected: { label: 'Rejected',  bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500'     },
  draft:    { label: 'Draft',     bg: 'bg-gray-100',    text: 'text-gray-600',    dot: 'bg-gray-400'    },
  submitted:{ label: 'Submitted', bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500'    },
};

const getStatusStyle = (status = '') =>
  STATUS_MAP[String(status).toLowerCase()] || STATUS_MAP.draft;

// ============================================================================
// NOCs TAB — Column Definitions
// ============================================================================

const nocBaseColumns = [
  {
    key: 'title',
    label: 'NOC Title',
    width: '240px',
    headerAlign: 'left',
    sortField: 'noc_id',
    render: (row, index) => (
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 ${avatarColor(index)} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
          <ClipboardCheck className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-gray-900 truncate max-w-[160px] text-sm">
            {row.noc_id || row.title || '—'}
          </div>
          <div className="text-xs text-gray-400 truncate max-w-[160px]">
            {row.client_name || row.applicant_name || 'No client'}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: 'noc_type',
    label: 'NOC Type',
    width: '140px',
    headerAlign: 'center',
    align: 'center',
    render: (row) => {
      const name = row.noc_type_name || row.noc_type?.name || '—';
      if (name === '—') return <span className="text-gray-400 text-sm">—</span>;
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
          <Tag className="w-3 h-3" />
          {name}
        </span>
      );
    },
  },
  {
    key: 'authority',
    label: 'Authority',
    width: '160px',
    headerAlign: 'center',
    align: 'center',
    render: (row) => {
      const name = row.authority_name || row.authority?.name || '—';
      if (name === '—') return <span className="text-gray-400 text-sm">—</span>;
      return (
        <span className="text-gray-700 text-xs font-medium max-w-[140px] block truncate text-center" title={name}>
          {name}
        </span>
      );
    },
  },
  {
    key: 'created_at',
    label: 'Applied On',
    width: '120px',
    headerAlign: 'center',
    align: 'center',
    sortField: 'created_at',
    render: (row) => (
      <span className="text-gray-500 text-xs">{fmtDate(row.created_at)}</span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    width: '120px',
    headerAlign: 'center',
    align: 'center',
    sortField: 'status',
    render: (row) => {
      // API returns status as an integer + status_display as the human string
      const statusStr = row.status_display || String(row.status || '');
      const s = getStatusStyle(statusStr);
      return (
        <div className="flex justify-center">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${s.bg} ${s.text} text-xs font-semibold whitespace-nowrap`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot} flex-shrink-0`} />
            {s.label}
          </span>
        </div>
      );
    },
  },
  {
    key: 'actions',
    label: 'Actions',
    width: '80px',
    align: 'center',
    render: (row, index, handlers) => <NocActionsMenu row={row} handlers={handlers} />,
  },
];

export const getNocColumns = () => nocBaseColumns;

export const nocListConfig = {
  title: 'NOCs',
  icon: ClipboardCheck,
  addButtonLabel: 'Add NOC',
  columns: nocBaseColumns,
  showSearch: true,
  showFilter: false,
  loadingMessage: 'Loading NOCs…',
  emptyIcon: ClipboardCheck,
  emptyMessage: 'No NOCs Found',
  emptySubMessage: 'Start by creating your first NOC application',
  note: 'Click on a row to view NOC details',
  defaultSort: { field: 'created_at', direction: 'desc' },
  defaultPageSize: 10,
};

// ============================================================================
// AUTHORITIES TAB — Column Definitions
// ============================================================================

const authorityBaseColumns = [
  {
    key: 'authority_name',
    label: 'Authority',
    width: '220px',
    headerAlign: 'left',
    sortField: 'authority_name',
    render: (row, index) => (
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 ${avatarColor(index)} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-gray-900 truncate max-w-[150px] text-sm">
            {row.authority_name || '—'}
          </div>
          <div className="text-xs text-gray-400 truncate max-w-[150px]">
            {row.department || 'No department'}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: 'department',
    label: 'Department',
    width: '180px',
    headerAlign: 'center',
    align: 'center',
    render: (row) => (
      row.department
        ? <span className="text-gray-600 text-xs truncate max-w-[160px] block text-center" title={row.department}>{row.department}</span>
        : <span className="text-gray-400 text-sm block text-center">—</span>
    ),
  },
  {
    key: 'contact_info',
    label: 'Contact Info',
    width: '200px',
    headerAlign: 'center',
    align: 'center',
    render: (row) => (
      row.contact_info
        ? <span className="text-gray-600 text-xs truncate max-w-[180px] block text-center" title={row.contact_info}>{row.contact_info}</span>
        : <span className="text-gray-400 text-sm block text-center">—</span>
    ),
  },
  {
    key: 'actions',
    label: 'Actions',
    width: '80px',
    align: 'center',
    render: (row, index, handlers) => <AuthorityActionsMenu row={row} handlers={handlers} />,
  },
];

export const getAuthorityColumns = () => authorityBaseColumns;

export const authorityListConfig = {
  title: 'Authorities',
  icon: Building2,
  addButtonLabel: 'Add Authority',
  columns: authorityBaseColumns,
  showSearch: true,
  showFilter: false,
  loadingMessage: 'Loading authorities…',
  emptyIcon: Building2,
  emptyMessage: 'No Authorities Found',
  emptySubMessage: 'Start by adding your first NOC issuing authority',
  note: 'Click on a row to view Authority details',
  defaultSort: { field: 'authority_name', direction: 'asc' },
  defaultPageSize: 10,
};

// ============================================================================
// NOC TYPES TAB — Card Grid Config
// ============================================================================

export const nocTypeListConfig = {
  title: 'NOC Types',
  icon: Tag,
  addButtonLabel: 'Add Type',
  layoutType: 'cards',
  cardComponent: NocTypeCard,
  gridColumns: { sm: 1, md: 2, lg: 3 },
  gridGap: 5,
  showSearch: true,
  showFilter: false,
  loadingMessage: 'Loading NOC types…',
  emptyIcon: Tag,
  emptyMessage: 'No NOC Types Found',
  emptySubMessage: 'Define your first NOC category to get started',
  note: 'Click on a card to view NOC Type details',
  defaultPageSize: 12,
};