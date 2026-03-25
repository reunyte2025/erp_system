import { FolderKanban, Clock, ChevronDown, ChevronUp, MoreVertical } from 'lucide-react';
import { useState } from 'react';
import { 
  FileText, FileCheck, Send, CheckCircle, PlayCircle 
} from 'lucide-react';

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
const getStatusColor = (status) => {
  const colors = {
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
const formatStatus = (status) => {
  const statusMap = {
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'on_hold': 'On Hold',
    'planning': 'Planning',
  };
  return statusMap[status] || 'Planning';
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
export const ProjectCard = ({ project }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!project) {
    console.warn('ProjectCard received undefined project');
    return null;
  }

  const trackingSteps = [
    { 
      icon: FileText, 
      text: 'Quotation Created', 
      timestamp: '01-01-2026, 09:30 AM by Mr. ABC',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    { 
      icon: FileCheck, 
      text: 'Revised to version 2 - update pricing', 
      timestamp: '01-01-2026, 09:30 AM by Mr. ABC',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      icon: FileCheck, 
      text: 'Proforma Generated', 
      timestamp: '01-01-2026, 09:30 AM by Mr. ABC',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50'
    },
    { 
      icon: Send, 
      text: 'Send to client via Email', 
      timestamp: '01-01-2026, 09:30 AM by Mr. ABC',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    { 
      icon: CheckCircle, 
      text: 'Client Approved Invoice Generated', 
      timestamp: '01-01-2026, 09:30 AM by Mr. ABC',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    { 
      icon: PlayCircle, 
      text: 'Project Started In Progress', 
      timestamp: '01-01-2026, 09:30 AM by Mr. ABC',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    }
  ];

  const members = [
    { color: 'bg-red-400' },
    { color: 'bg-green-400' },
    { color: 'bg-blue-400' }
  ];

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
          <button className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 ml-2 flex-shrink-0 p-1 rounded-lg">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Status Badge and Details Button - COMPACT */}
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status || 'planning')}`}>
            <Clock className="w-3 h-3" />
            {formatStatus(project.status || 'planning')}
          </span>
          <button
            onClick={() => setShowDetails(!showDetails)}
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
          {project.description || 'we discuss abot some points at first meeting and the client had fpcused on xyz things so we need to do those AEAP'}
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
          {/* Tracking Header */}
          <div className="flex items-center gap-1.5 mb-3">
            <Clock className="w-3.5 h-3.5 text-teal-600" />
            <h4 className="font-semibold text-gray-900 text-xs uppercase tracking-wider">Tracking</h4>
          </div>
          
          {/* Tracking Steps with Staggered Animation */}
          <div className="space-y-2.5 mb-4">
            {trackingSteps.map((step, index) => (
              <div 
                key={index} 
                className="flex items-start gap-2.5"
                style={{ 
                  opacity: showDetails ? 1 : 0,
                  transform: showDetails ? 'translateX(0)' : 'translateX(-10px)',
                  transition: `opacity 400ms ease-out ${100 + index * 60}ms, transform 400ms ease-out ${100 + index * 60}ms`
                }}
              >
                <div className={`w-7 h-7 ${step.bgColor} rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-300`}>
                  <step.icon className={`w-3.5 h-3.5 ${step.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900">{step.text}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{step.timestamp}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Members and Dates Section */}
          <div 
            className="pt-3 border-t border-gray-220"
            style={{
              opacity: showDetails ? 1 : 0,
              transform: showDetails ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 400ms ease-out 500ms, transform 400ms ease-out 500ms'
            }}
          >
            <div className="grid grid-cols-3 gap-3">
              {/* Members */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide font-medium">Members</p>
                <div className="flex items-center gap-1">
                  {members.map((member, index) => (
                    <div 
                      key={index} 
                      className={`w-7 h-7 ${member.color} rounded-full border-2 border-white shadow-sm`}
                      style={{
                        opacity: showDetails ? 1 : 0,
                        transform: showDetails ? 'scale(1)' : 'scale(0.8)',
                        transition: `opacity 300ms ease-out ${600 + index * 80}ms, transform 300ms ease-out ${600 + index * 80}ms`
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Start Date */}
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide font-medium">Start</p>
                <p className="text-xs text-red-500 font-semibold">
                  {project.start_date 
                    ? new Date(project.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '20 Jan'}
                </p>
              </div>

              {/* End Date */}
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide font-medium">End</p>
                <p className="text-xs text-gray-900 font-semibold">
                  {project.end_date 
                    ? new Date(project.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '20 Jan'}
                </p>
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