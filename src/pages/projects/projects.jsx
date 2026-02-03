import { useState, useCallback, useEffect } from 'react';
import { 
  FolderKanban, Plus, CheckCircle, X, Loader2,
  Building2, MapPin, Hash, FileText, Users, Mail, Send, 
  FileCheck, PlayCircle, Clock
} from 'lucide-react';

// Import service layer
import { getProjects, createProject } from '../../services/projects';

// Import configuration
import projectsConfig from './projects.config';

// Import reusable UI components
import DynamicList from '../../components/DynamicList/DynamicList';

/**
 * ============================================================================
 * PROJECTS PAGE COMPONENT - REFACTORED WITH ARCHITECTURE
 * ============================================================================
 * 
 * Clean implementation with service layer and DynamicList component.
 * All your original functionality preserved: modals, stats, etc.
 * 
 * @component
 */

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

const StatCard = ({ icon, count, label, subLabel, bgColor }) => (
  <div className={`${bgColor} rounded-2xl p-5 shadow-sm`}>
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-3">
        <div className="bg-white/20 rounded-full p-2.5">
          {icon}
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white mb-1">{count}</h3>
          <p className="text-white/90 font-medium text-sm">{label}</p>
          {subLabel && <p className="text-white/70 text-xs mt-1">{subLabel}</p>}
        </div>
      </div>
      <button className="text-white/80 hover:text-white">
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
        </svg>
      </button>
    </div>
  </div>
);

// ============================================================================
// SUCCESS MODAL COMPONENT
// ============================================================================

const SuccessModal = ({ isOpen, onClose, onProceed }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] animate-fadeIn"
      style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}
    >
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{ width: '100vw', height: '100vh', top: 0, left: 0, position: 'fixed' }}
        onClick={onClose}
      />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div 
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-scaleIn"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle className="w-12 h-12 text-teal-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Successfully</h3>
          <p className="text-xl font-semibold text-gray-800 mb-8">Created Project</p>
          <div className="space-y-3">
            <button
              onClick={onProceed}
              className="w-full px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all duration-200 font-medium transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Proceed To Project
            </button>
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-white text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CREATE PROJECT MODAL COMPONENT
// ============================================================================

const CreateProjectModal = ({ isOpen, onClose, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    servey_number: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    start_date: '',
    end_date: '',
    description: ''
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }

    setSubmitting(true);

    try {
      // Use service layer function instead of direct API call
      const response = await createProject(formData);
      
      console.log('✅ Project created successfully:', response);
      
      // Reset form
      setFormData({
        name: '',
        client_id: '',
        servey_number: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        start_date: '',
        end_date: '',
        description: ''
      });

      // Call success callback
      if (onSuccess) {
        onSuccess(response);
      }

    } catch (err) {
      console.error('❌ Error creating project:', err);
      setError(err.message || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] animate-fadeIn overflow-y-auto"
      style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}
    >
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{ width: '100vw', height: '100%', top: 0, left: 0, position: 'fixed' }}
        onClick={onClose}
      />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4 py-10">
        <div 
          className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full animate-scaleIn"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
            <h2 className="text-xl font-bold text-gray-800">Create New Project</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={submitting}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm animate-slideDown">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Project Name */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                  <Building2 className="w-4 h-4" />
                  Project Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter project name"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  required
                  disabled={submitting}
                />
              </div>

              {/* Client ID */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                  <Users className="w-4 h-4" />
                  Client ID
                </label>
                <input
                  type="number"
                  name="client_id"
                  value={formData.client_id}
                  onChange={handleInputChange}
                  placeholder="Enter client ID"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  disabled={submitting}
                />
              </div>

              {/* Survey Number */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                  <Hash className="w-4 h-4" />
                  Survey Number
                </label>
                <input
                  type="text"
                  name="servey_number"
                  value={formData.servey_number}
                  onChange={handleInputChange}
                  placeholder="Enter survey number"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  disabled={submitting}
                />
              </div>

              {/* Address */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                  <MapPin className="w-4 h-4" />
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter address"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  disabled={submitting}
                />
              </div>

              {/* City and State */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                    <MapPin className="w-4 h-4" />
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Enter city"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                    <MapPin className="w-4 h-4" />
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    placeholder="Enter state"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Pincode */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                  <MapPin className="w-4 h-4" />
                  Pincode
                </label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleInputChange}
                  placeholder="Enter pincode"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  disabled={submitting}
                />
              </div>

              {/* Start and End Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                    <PlayCircle className="w-4 h-4" />
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                    <FileCheck className="w-4 h-4" />
                    End Date
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                  <FileText className="w-4 h-4" />
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter project description"
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all resize-none"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Create Project
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Projects() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdProject, setCreatedProject] = useState(null);
  const [stats, setStats] = useState({
    total: 7,
    onHold: 0,
    active: 0,
    completed: 0,
  });

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // Use service layer function
      const response = await getProjects({
        page: currentPage,
        page_size: pageSize,
        search: searchTerm,
      });

      console.log('📊 Full API Response:', response);

      if (response.status === 'success' && response.data) {
        const apiData = response.data;
        const projectResults = apiData.results || [];

        console.log('📋 Project Results:', projectResults);
        console.log('📋 Number of projects:', projectResults.length);

        // Filter out any null/undefined entries
        const validProjects = projectResults.filter(project => project != null);
        console.log('✅ Valid projects:', validProjects);

        setProjects(validProjects);
        setCurrentPage(apiData.page || 1);
        setTotalPages(apiData.total_pages || 1);
        setTotalCount(apiData.total_count || 0);

        const totalProjects = apiData.total_count || validProjects.length;
        setStats({
          total: totalProjects,
          onHold: 0, // Update with actual data when available
          active: 0,
          completed: 0,
        });
      } else {
        console.error('❌ Invalid response format:', response);
        setProjects([]);
        setError('Failed to load projects');
      }
    } catch (err) {
      console.error('❌ Error fetching projects:', err);
      setError(err.message || 'Failed to load projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleCreateSuccess = (projectData) => {
    setCreatedProject(projectData);
    setShowCreateModal(false);
    setShowSuccessModal(true);
    
    // Refresh project list
    fetchProjects();
  };

  const handleProceedToProject = () => {
    setShowSuccessModal(false);
    console.log('Navigate to project:', createdProject);
    // Add navigation logic here
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleFilterToggle = () => {
    setShowFilter((prev) => !prev);
  };

  const handleRetry = () => {
    fetchProjects();
  };

  // ============================================================================
  // STATS CARDS
  // ============================================================================

  const renderStatsCards = () => (
    <>
      <StatCard
        icon={<FolderKanban className="w-5 h-5" />}
        count={stats.total}
        label="Total Projects"
        subLabel="2 added last 5 days"
        bgColor="bg-teal-500"
      />
      <StatCard
        icon={<Clock className="w-5 h-5" />}
        count={stats.onHold}
        label="On Hold"
        subLabel="2 is successfully added from hold"
        bgColor="bg-orange-600"
      />
      <StatCard
        icon={<Clock className="w-5 h-5" />}
        count={stats.active}
        label="Active Projects"
        subLabel="0 Active Projects"
        bgColor="bg-yellow-500"
      />
      <StatCard
        icon={<CheckCircle className="w-5 h-5" />}
        count={stats.completed}
        label="Completed"
        subLabel="0 Projects Completed"
        bgColor="bg-green-500"
      />
    </>
  );

  // ============================================================================
  // DATA PREPARATION
  // ============================================================================

  // Filter projects based on search term (client-side filtering)
  // Only filter if searchTerm exists and projects is an array
  const filteredProjects = Array.isArray(projects) 
    ? projects.filter(project => {
        if (!project) return false; // Skip null/undefined projects
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
          project.name?.toLowerCase().includes(search) ||
          project.address?.toLowerCase().includes(search) ||
          project.city?.toLowerCase().includes(search) ||
          project.servey_number?.toLowerCase().includes(search)
        );
      })
    : [];

  console.log('🔍 Filtered Projects:', filteredProjects);
  console.log('🔍 Filtered Projects Count:', filteredProjects.length);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <DynamicList
        config={projectsConfig}
        data={filteredProjects}
        loading={loading}
        error={error}
        emptyMessage={projectsConfig.emptyMessage}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        onAdd={() => setShowCreateModal(true)}
        onSearch={handleSearch}
        onFilterToggle={handleFilterToggle}
        onRetry={handleRetry}
        searchTerm={searchTerm}
        showFilter={showFilter}
        statsCards={renderStatsCards()}
      />

      {/* Modals */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onProceed={handleProceedToProject}
      />

      {/* Custom CSS for animations */}
      <style>{`
        html {
          overflow-y: scroll;
          scrollbar-gutter: stable;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes expandDown {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 1000px;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }

        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
          animation-fill-mode: both;
        }

        .animate-expandDown {
          animation: expandDown 0.4s ease-out;
        }
      `}</style>
    </>
  );
}