import { FolderKanban, Clock, ChevronDown, ChevronUp, MapPin, Hash, CalendarDays, BookOpen, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * ============================================================================
 * PROJECT MODULE CONFIGURATION - ENTERPRISE LEVEL
 * ============================================================================
 * 
 * Professional configuration with smooth animations and polished UX
 * Cards now have COMPACT height for better visual balance
 * 
 * @module projectsConfig
 */

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Status color mapping
 */
const getStatusColor = (status, isDraft = false) => {
  if (isDraft || Number(status) === 1) {
    return 'bg-orange-100 text-orange-700';
  }
  const colors = {
    2: 'bg-teal-100 text-teal-700',
    3: 'bg-green-100 text-green-700',
    4: 'bg-orange-100 text-orange-700',
    'in_progress': 'bg-yellow-100 text-yellow-700',
    'completed': 'bg-green-100 text-green-700',
    'on_hold': 'bg-orange-100 text-orange-700',
    'planning': 'bg-blue-100 text-blue-700',
  };
  return colors[status] || colors.planning;
};

/**
 * Format status text
 */
const formatStatus = (status, isDraft = false) => {
  if (isDraft || Number(status) === 1) {
    return 'Draft';
  }
  const statusMap = {
    2: 'Active',
    3: 'Completed',
    4: 'On Hold',
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'on_hold': 'On Hold',
    'planning': 'Planning',
  };
  return statusMap[status] || 'Planning';
};

const isDeletedProject = (project) => project?.is_active === false || Number(project?.status) === 5;

const ProjectActionsMenu = ({ project, handlers }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const isDeleted = isDeletedProject(project);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div className="relative ml-2 flex-shrink-0" ref={menuRef}>
      <button
        onClick={(event) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 ${
          open ? 'bg-teal-100 text-teal-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
        }`}
        title="Actions"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.4" />
          <circle cx="8" cy="8" r="1.4" />
          <circle cx="8" cy="13" r="1.4" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 z-50 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          {isDeleted ? (
            <button
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                handlers?.onUndoProject?.(project);
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-50"
            >
              <RotateCcw className="h-4 w-4 flex-shrink-0" />
              <span>Restore Project</span>
            </button>
          ) : (
            <button
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                handlers?.onDeleteProject?.(project);
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 flex-shrink-0" />
              <span>Delete Project</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PROJECT CARD COMPONENT - COMPACT HEIGHT, MEDIUM VISIBILITY
// ============================================================================

/**
 * ProjectCard Component
 * 
 * Features:
 * - COMPACT height (reduced padding and spacing)
 * - Medium visibility styling (clearly visible, not too dark)
 * - Darker border for clear definition
 * - Better shadow for depth
 * - Ultra-smooth expand/collapse
 * - Staggered child animations
 */
export const ProjectCard = ({ project, actionHandlers = {} }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!project) {
    console.warn('ProjectCard received undefined project');
    return null;
  }

  const createdDate = project.created_at
    ? new Date(project.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';
  const updatedDate = project.updated_at
    ? new Date(project.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';
  const location = [project.address, project.city, project.state].filter(Boolean).join(', ');

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-320 hover:border-gray-380 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden project-card">
      {/* Card Header - COMPACT */}
      <div className="p-4 border-b border-gray-220">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <FolderKanban className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900 truncate">
                {project.name || 'Untitled Project'}
              </h3>
            </div>
          </div>
          <ProjectActionsMenu project={project} handlers={actionHandlers} />
        </div>

        {/* Status Badge and Details Button - COMPACT */}
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
            isDeletedProject(project)
              ? 'bg-red-100 text-red-700'
              : getStatusColor(project.status ?? 1, project.is_draft)
          }`}>
            {isDeletedProject(project)
              ? <Trash2 className="w-3 h-3" />
              : ((project.is_draft || Number(project.status) === 1) ? <BookOpen className="w-3 h-3" /> : <Clock className="w-3 h-3" />)}
            {isDeletedProject(project) ? 'Deleted' : formatStatus(project.status ?? 1, project.is_draft)}
          </span>
          <button
            onClick={(event) => {
              event.stopPropagation();
              setShowDetails(!showDetails);
            }}
            className="text-teal-600 hover:text-teal-700 transition-all duration-200 flex items-center gap-0.5 text-xs font-medium"
          >
            {showDetails ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 transition-transform duration-200" />
                Hide
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200" />
                Details
              </>
            )}
          </button>
        </div>
      </div>

      {/* Project Description - COMPACT */}
      <div className="px-4 py-2.5 bg-gray-70 border-b border-gray-220">
        <p className="text-xs text-gray-700 line-clamp-2">
          {location || 'Project location details will appear here.'}
        </p>
      </div>

      {/* Expandable Details Section - ULTRA SMOOTH ANIMATION */}
      <div 
        className={`
          transition-all duration-600 ease-in-out
          ${showDetails 
            ? 'max-h-[1000px] opacity-100' 
            : 'max-h-0 opacity-0'
          }
        `}
        style={{
          overflow: 'hidden',
          transitionProperty: 'max-height, opacity',
          transitionDuration: '600ms, 400ms',
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div className="p-4 bg-white border-t border-gray-220">
          {/* Details Header */}
          <div className="flex items-center gap-1.5 mb-3">
            <Clock className="w-3.5 h-3.5 text-teal-600" />
            <h4 className="font-semibold text-gray-900 text-xs uppercase tracking-wider">Project Details</h4>
          </div>
          
          <div className="grid grid-cols-1 gap-2.5 mb-4">
            {[
              {
                icon: Hash,
                label: 'CTS Number',
                value: project.cts_number || 'Not added',
                bgColor: 'bg-slate-50',
                iconColor: 'text-slate-600',
              },
              {
                icon: MapPin,
                label: 'Location',
                value: [project.city, project.state].filter(Boolean).join(', ') || location || 'Not added',
                bgColor: 'bg-teal-50',
                iconColor: 'text-teal-600',
              },
              {
                icon: CalendarDays,
                label: 'Record Status',
                value: project.is_active ? 'Active record' : 'Inactive record',
                bgColor: 'bg-emerald-50',
                iconColor: 'text-emerald-600',
              },
            ].map((item, index) => (
              <div
                key={item.label}
                className="flex items-start gap-2.5 rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2.5"
                style={{
                  opacity: showDetails ? 1 : 0,
                  transform: showDetails ? 'translateX(0)' : 'translateX(-10px)',
                  transition: `opacity 400ms ease-out ${100 + index * 60}ms, transform 400ms ease-out ${100 + index * 60}ms`
                }}
              >
                <div className={`w-8 h-8 ${item.bgColor} rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300`}>
                  <item.icon className={`w-4 h-4 ${item.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{item.label}</p>
                  <p className="text-xs font-semibold text-gray-900 break-words">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Dates Section */}
          <div 
            className="pt-3 border-t border-gray-220"
            style={{
              opacity: showDetails ? 1 : 0,
              transform: showDetails ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 400ms ease-out 500ms, transform 400ms ease-out 500ms'
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide font-medium">Created</p>
                <p className="text-xs text-gray-900 font-semibold">{createdDate}</p>
              </div>

              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide font-medium">Updated</p>
                <p className="text-xs text-gray-900 font-semibold">{updatedDate}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom styles */}
      <style>{`
        .duration-600 {
          transition-duration: 600ms;
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// MAIN CONFIGURATION OBJECT
// ============================================================================

const projectsConfig = {
  title: 'Projects',
  icon: FolderKanban,
  addButtonLabel: 'Add',
  layoutType: 'cards',
  cardComponent: ProjectCard,
  gridColumns: {
    sm: 1,
    md: 2,
    lg: 3,
  },
  gridGap: 6,
  showSearch: true,
  showFilter: true,
  loadingMessage: 'Loading projects...',
  emptyMessage: 'No Projects Found',
  emptySubMessage: 'Start by creating your first project',
  defaultSort: {
    field: 'name',
    direction: 'asc',
  },
  defaultPageSize: 10,
};

export default projectsConfig;

/**
 * ============================================================================
 * COMPACT CARD SIZING
 * ============================================================================
 * 
 * HEADER SECTION:
 * - Padding: p-4 (was p-6, now more compact)
 * - Icon: w-10 h-10 (was w-12 h-12)
 * - Title: text-base (was text-lg)
 * - Gap: gap-2.5 (was gap-3)
 * 
 * DESCRIPTION SECTION:
 * - Padding: py-2.5 (was py-4)
 * - Text: text-xs (was text-sm)
 * - More compact appearance
 * 
 * DETAILS SECTION:
 * - All spacing reduced by ~33%
 * - Same functionality, less visual weight
 * - Better balance with grid layout
 * 
 * RESULT:
 * - Cards look proportional and balanced
 * - Less "broad" or "big" appearance
 * - More modern and condensed
 * - Better suited for 3-column layout
 * 
 * ============================================================================
 */
