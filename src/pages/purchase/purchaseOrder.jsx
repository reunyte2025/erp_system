import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, FileText, Building2, CheckCircle, Clock, MoreVertical,
  Plus, Save, X, Search
} from 'lucide-react';
import { getProjectsForPurchaseOrder } from '../../services/purchase';

/**
 * ============================================================================
 * PURCHASE ORDER PAGE - PRODUCTION READY
 * ============================================================================
 */

// ============================================================================
// CHANGE PROJECT MODAL - MATCHING FILTER MODAL DESIGN
// ============================================================================

const ChangeProjectModal = ({ isOpen, onClose, onSelectProject, currentProjectId }) => {
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState('projects');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const pageSize = 5;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSelectedProjectId(currentProjectId);
      setCurrentPage(1);
      setAllProjects([]);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, currentProjectId]);

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentPage, searchTerm]);

  const fetchProjects = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getProjectsForPurchaseOrder({
        page: currentPage,
        page_size: pageSize,
        search: searchTerm || undefined,
      });

      if (response.status === 'success' && response.data) {
        const apiData = response.data;
        const newProjects = apiData.results || [];
        
        if (currentPage === 1) {
          setAllProjects(newProjects);
        } else {
          setAllProjects(prev => [...prev, ...newProjects]);
        }
        
        setTotalPages(apiData.total_pages || 1);
        setTotalCount(apiData.total_count || 0);
      } else {
        if (currentPage === 1) {
          setAllProjects([]);
        }
        setError('Failed to load projects');
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err.message || 'Failed to load projects');
      if (currentPage === 1) {
        setAllProjects([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
    setAllProjects([]);
  };

  const handleLoadMore = () => {
    if (currentPage < totalPages && !loading) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleProjectClick = (project) => {
    setSelectedProjectId(project.id);
  };

  const handleDone = () => {
    if (selectedProjectId) {
      const selectedProject = allProjects.find(p => p.id === selectedProjectId);
      if (selectedProject) {
        onSelectProject(selectedProject);
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  const remainingCount = totalCount - allProjects.length;

  return (
    <div
      className="fixed inset-0 z-[9999] animate-fadeIn"
      style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed', overflow: 'hidden' }}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{ width: '100vw', height: '100vh', top: 0, left: 0, position: 'fixed', overflow: 'hidden' }}
        onClick={onClose}
      />
      <div className="relative z-10 flex items-center justify-center min-h-screen p-3 sm:p-4" style={{ height: '100vh' }}>
        <div
          className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col animate-scaleIn overflow-hidden"
          style={{ height: '600px' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-teal-600 text-white px-5 py-4 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              <h2 className="text-base font-semibold">Change Project</h2>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 bg-white flex-shrink-0">
            <div className="flex">
              <button
                onClick={() => setActiveTab('projects')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'projects'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Projects
              </button>
              <button
                onClick={() => setActiveTab('details')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'details'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Details
              </button>
            </div>
          </div>

          {/* Search Bar - FIXED */}
          <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all"
              />
            </div>
          </div>

          {/* Content - SCROLLABLE with FIXED HEIGHT */}
          <div className="flex-1 overflow-y-auto bg-gray-50" style={{ minHeight: 0, maxHeight: '340px' }}>
            {loading && allProjects.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="inline-block w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-3 text-sm text-gray-600">Loading projects...</p>
                </div>
              </div>
            ) : error && allProjects.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center px-4">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
                    <X className="w-6 h-6 text-red-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">Failed to load projects</p>
                  <p className="text-xs text-gray-600 mt-1">{error}</p>
                  <button
                    onClick={fetchProjects}
                    className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : allProjects.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center px-4">
                  <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900">No projects found</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {searchTerm ? 'Try adjusting your search' : 'No projects available'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {allProjects.map((project) => {
                  const isSelected = selectedProjectId === project.id;
                  return (
                    <div
                      key={project.id}
                      onClick={() => handleProjectClick(project)}
                      className={`rounded-xl p-3.5 transition-all cursor-pointer shadow-sm ${
                        isSelected
                          ? 'bg-teal-50 border-2 border-teal-500 shadow-md'
                          : 'bg-white hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-11 h-11 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 truncate mb-0.5">
                              {project.name}
                            </h3>
                            <p className="text-xs text-gray-600 truncate">
                              {[project.address, project.city, project.state]
                                .filter(Boolean)
                                .join(', ') || 'No address available'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className="px-3.5 py-2 bg-white text-teal-600 border border-teal-600 rounded-lg text-xs font-medium hover:bg-teal-50 transition-all flex-shrink-0 shadow-sm hover:shadow"
                        >
                          View Project
                        </button>
                      </div>
                    </div>
                  );
                })}
                
                {loading && allProjects.length > 0 && (
                  <div className="py-4 text-center">
                    <div className="inline-block w-6 h-6 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer - FIXED */}
          <div className="px-5 py-4 bg-white border-t border-gray-200 flex-shrink-0 rounded-b-2xl">
            {!error && allProjects.length > 0 && remainingCount > 0 && (
              <div className="mb-3">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="text-teal-600 text-sm font-medium hover:text-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:underline"
                >
                  {loading ? 'Loading...' : `See 5 More (${remainingCount} remaining)`}
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleDone}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-lg font-medium transition-all text-sm shadow-md hover:shadow-lg"
              >
                Done
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 py-2.5 rounded-lg font-medium transition-all text-sm hover:border-gray-400 shadow-sm hover:shadow"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CHANGE VENDOR MODAL
// ============================================================================

const ChangeVendorModal = ({ isOpen, onClose, onSelectVendor, currentVendorId }) => {
  const [allVendors, setAllVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState('projects');
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const pageSize = 5;

  // Mock vendor data - replace with actual API call when backend is ready
  const mockVendors = [
    { id: 1, name: 'ABC Infra', location: 'abc, xyz building, ,g road , mum, 200187' },
    { id: 2, name: 'ABC Infra', location: 'abc, xyz building, ,g road , mum, 200187' },
    { id: 3, name: 'ABC Infra', location: 'abc, xyz building, ,g road , mum, 200187' },
    { id: 4, name: 'ABC Infra', location: 'abc, xyz building, ,g road , mum, 200187' },
    { id: 5, name: 'ABC Infra', location: 'abc, xyz building, ,g road , mum, 200187' },
    { id: 6, name: 'XYZ Vendors', location: 'def, abc tower, main street, delhi, 110001' },
    { id: 7, name: 'Global Suppliers', location: 'shop 5, market area, bangalore, 560001' },
    { id: 8, name: 'Prime Materials', location: 'building 12, industrial area, pune, 411001' },
    { id: 9, name: 'Elite Distributors', location: 'sector 8, commercial hub, chennai, 600001' },
    { id: 10, name: 'Mega Vendors', location: 'plot 45, business park, hyderabad, 500001' },
  ];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSelectedVendorId(currentVendorId);
      setCurrentPage(1);
      setAllVendors([]);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, currentVendorId]);

  useEffect(() => {
    if (isOpen) {
      fetchVendors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentPage, searchTerm]);

  const fetchVendors = async () => {
    setLoading(true);
    setError('');

    try {
      // Simulate API call - replace with actual API when backend is ready
      await new Promise(resolve => setTimeout(resolve, 300));
      
      let filtered = mockVendors;
      if (searchTerm) {
        filtered = mockVendors.filter(vendor =>
          vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          vendor.location.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedVendors = filtered.slice(startIndex, endIndex);

      if (currentPage === 1) {
        setAllVendors(paginatedVendors);
      } else {
        setAllVendors(prev => [...prev, ...paginatedVendors]);
      }

      setTotalPages(Math.ceil(filtered.length / pageSize));
      setTotalCount(filtered.length);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setError(err.message || 'Failed to load vendors');
      if (currentPage === 1) {
        setAllVendors([]);
      }
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
    setAllVendors([]);
  };

  const handleLoadMore = () => {
    if (currentPage < totalPages && !loading) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleVendorClick = (vendor) => {
    setSelectedVendorId(vendor.id);
  };

  const handleDone = () => {
    if (selectedVendorId) {
      const selectedVendor = allVendors.find(v => v.id === selectedVendorId);
      if (selectedVendor) {
        onSelectVendor(selectedVendor);
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  const remainingCount = totalCount - allVendors.length;

  return (
    <div
      className="fixed inset-0 z-[9999] animate-fadeIn"
      style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed', overflow: 'hidden' }}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{ width: '100vw', height: '100vh', top: 0, left: 0, position: 'fixed', overflow: 'hidden' }}
        onClick={onClose}
      />
      <div className="relative z-10 flex items-center justify-center min-h-screen p-3 sm:p-4" style={{ height: '100vh' }}>
        <div
          className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col animate-scaleIn overflow-hidden"
          style={{ height: '600px' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-teal-600 text-white px-5 py-4 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              <h2 className="text-base font-semibold">Change Vendor</h2>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 bg-white flex-shrink-0">
            <div className="flex">
              <button
                onClick={() => setActiveTab('projects')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'projects'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Projects
              </button>
              <button
                onClick={() => setActiveTab('details')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'details'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Details
              </button>
            </div>
          </div>

          {/* Search Bar - FIXED */}
          <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all"
              />
            </div>
          </div>

          {/* Content - SCROLLABLE with FIXED HEIGHT */}
          <div className="flex-1 overflow-y-auto bg-gray-50" style={{ minHeight: 0, maxHeight: '340px' }}>
            {loading && allVendors.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="inline-block w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-3 text-sm text-gray-600">Loading vendors...</p>
                </div>
              </div>
            ) : error && allVendors.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center px-4">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
                    <X className="w-6 h-6 text-red-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">Failed to load vendors</p>
                  <p className="text-xs text-gray-600 mt-1">{error}</p>
                  <button
                    onClick={fetchVendors}
                    className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : allVendors.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center px-4">
                  <User className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900">No vendors found</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {searchTerm ? 'Try adjusting your search' : 'No vendors available'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {allVendors.map((vendor) => {
                  const isSelected = selectedVendorId === vendor.id;
                  return (
                    <div
                      key={vendor.id}
                      onClick={() => handleVendorClick(vendor)}
                      className={`rounded-xl p-3.5 transition-all cursor-pointer shadow-sm ${
                        isSelected
                          ? 'bg-teal-50 border-2 border-teal-500 shadow-md'
                          : 'bg-white hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-11 h-11 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 truncate mb-0.5">
                              {vendor.name}
                            </h3>
                            <p className="text-xs text-gray-600 truncate">
                              {vendor.location}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className="px-3.5 py-2 bg-white text-teal-600 border border-teal-600 rounded-lg text-xs font-medium hover:bg-teal-50 transition-all flex-shrink-0 shadow-sm hover:shadow"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  );
                })}
                
                {loading && allVendors.length > 0 && (
                  <div className="py-4 text-center">
                    <div className="inline-block w-6 h-6 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer - FIXED */}
          <div className="px-5 py-4 bg-white border-t border-gray-200 flex-shrink-0 rounded-b-2xl">
            {!error && allVendors.length > 0 && remainingCount > 0 && (
              <div className="mb-3">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="text-teal-600 text-sm font-medium hover:text-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:underline"
                >
                  {loading ? 'Loading...' : `See all`}
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleDone}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-lg font-medium transition-all text-sm shadow-md hover:shadow-lg"
              >
                Done
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 py-2.5 rounded-lg font-medium transition-all text-sm hover:border-gray-400 shadow-sm hover:shadow"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PurchaseOrder() {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('details');
  const [showChangeProjectModal, setShowChangeProjectModal] = useState(false);
  const [showChangeVendorModal, setShowChangeVendorModal] = useState(false);

  const [projectData, setProjectData] = useState({
    id: null,
    name: 'ACME Corporation',
    address: 'Acme Corporation, Riverside Corporate Tower'
  });

  const [vendorData, setVendorData] = useState({
    name: 'ABC Infra',
    address: 'abc, xyz building, .g road , mum, 200187'
  });

  const [stats, setStats] = useState({
    paymentsDone: 8,
    paymentsPending: 2,
    totalProjects: 10,
    projectsAdded: '5 added in last 2 days',
    pendingProjects: 10,
    pendingNote: '2 projects are pending',
    completedProjects: 5,
    completedNote: '5 project completed on time'
  });

  const [documents, setDocuments] = useState([
    { id: 1, name: 'Doc 1', file: null },
    { id: 2, name: 'Doc 1', file: null }
  ]);

  const handleChangeProject = () => {
    setShowChangeProjectModal(true);
  };

  const handleProjectSelect = (project) => {
    console.log('Project selected:', project);
    setProjectData({
      id: project.id,
      name: project.name,
      address: [project.address, project.city, project.state]
        .filter(Boolean)
        .join(', ') || 'No address available'
    });
  };

  const handleVendorSelect = (vendor) => {
    console.log('Vendor selected:', vendor);
    setVendorData({
      name: vendor.name,
      address: vendor.location
    });
  };

  const handleViewProject = () => {
    console.log('View project clicked');
  };

  const handleChangeVendor = () => {
    setShowChangeVendorModal(true);
  };

  const handleAttachDocument = (docId) => {
    console.log('Attach document clicked for doc:', docId);
  };

  const handleViewDetails = () => {
    console.log('View vendor details clicked');
  };

  const handleConfirmWorkOrder = () => {
    console.log('Confirm work order');
  };

  const handleSaveDraft = () => {
    console.log('Save draft');
  };

  const tabs = [
    { id: 'details', label: 'Vendor and Project details', icon: User },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'quotations', label: 'Quotations', icon: FileText },
    { id: 'pending', label: 'Pending', icon: Building2 }
  ];

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center border-b border-gray-200 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? 'border-teal-600 text-teal-600 bg-teal-50/70'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'details' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 sm:p-6 space-y-6">
              
              <div className="border border-gray-200 rounded-xl">
                <div className="px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <FileText className="w-4 h-4 text-teal-600" />
                    Project Details
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-14 h-14 rounded-xl bg-teal-500 flex items-center justify-center flex-shrink-0">
                        <User className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 mb-1">
                          {projectData.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {projectData.address}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={handleViewProject}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-teal-400 transition-colors"
                      >
                        View Project
                      </button>
                      <button
                        onClick={handleChangeProject}
                        className="px-4 py-2 text-sm font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-600 transition-colors"
                      >
                        Change Project
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl">
                <div className="px-6 py-4 border-b border-gray-200 bg-white rounded-t-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
                    <FileText className="w-5 h-5 text-teal-600" />
                    Vendor Details
                  </div>
                  <button
                    onClick={handleChangeVendor}
                    className="px-6 py-2 text-sm font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-600 transition-colors"
                  >
                    Change Vendor
                  </button>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-teal-500 flex items-center justify-center flex-shrink-0">
                          <User className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-1">
                            {vendorData.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {vendorData.address}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                          <FileText className="w-4 h-4 text-gray-600" />
                          Upload vendor Documents
                        </div>
                        
                        <div className="space-y-2">
                          <div className="text-sm text-gray-700 font-medium">Doc 1</div>
                          <button
                            onClick={() => handleAttachDocument(1)}
                            className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-teal-400 transition-all duration-200 flex items-center gap-3 text-sm text-gray-700"
                          >
                            <FileText className="w-5 h-5 text-gray-500" />
                            <span className="font-medium">Attach document 1</span>
                            <Plus className="w-5 h-5 ml-auto text-gray-500" />
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm text-gray-700 font-medium">Doc 1</div>
                          <button
                            onClick={() => handleAttachDocument(2)}
                            className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-teal-400 transition-all duration-200 flex items-center gap-3 text-sm text-gray-700"
                          >
                            <FileText className="w-5 h-5 text-gray-500" />
                            <span className="font-medium">Attach document 1</span>
                            <Plus className="w-5 h-5 ml-auto text-gray-500" />
                          </button>
                        </div>

                        <button
                          onClick={handleViewDetails}
                          className="w-40 px-4 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm font-medium text-gray-900"
                        >
                          View Details
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-cyan-100 rounded-xl border border-cyan-400 p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <div className="text-3xl font-bold text-gray-900 mb-0.5">
                                {stats.paymentsDone}
                              </div>
                              <div className="text-sm font-medium text-gray-700">Payments Done</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-4 h-4 text-gray-600 flex-shrink-0" />
                            <span className="text-xs text-gray-700">
                              {stats.paymentsPending} payments are pending
                            </span>
                            <button className="text-gray-500 hover:text-gray-700 ml-1">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="bg-pink-100 rounded-xl border border-pink-400 p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <div className="text-3xl font-bold text-gray-900 mb-0.5">
                                {stats.totalProjects}
                              </div>
                              <div className="text-sm font-medium text-gray-700">Total Project</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-4 h-4 text-gray-600 flex-shrink-0" />
                            <span className="text-xs text-gray-700">
                              {stats.projectsAdded}
                            </span>
                            <button className="text-gray-500 hover:text-gray-700 ml-1">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="bg-yellow-100 rounded-xl border border-yellow-400 p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <div className="text-3xl font-bold text-gray-900 mb-0.5">
                                {stats.pendingProjects}
                              </div>
                              <div className="text-sm font-medium text-gray-700">Pending Projects</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-4 h-4 text-gray-600 flex-shrink-0" />
                            <span className="text-xs text-gray-700">
                              {stats.pendingNote}
                            </span>
                            <button className="text-gray-500 hover:text-gray-700 ml-1">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-100 rounded-xl border border-green-400 p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <div className="text-3xl font-bold text-gray-900 mb-0.5">
                                {stats.completedProjects}
                              </div>
                              <div className="text-sm font-medium text-gray-700">completed</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-4 h-4 text-gray-600 flex-shrink-0" />
                            <span className="text-xs text-gray-700">
                              {stats.completedNote}
                            </span>
                            <button className="text-gray-500 hover:text-gray-700 ml-1">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={handleConfirmWorkOrder}
                    className="w-full sm:w-auto px-8 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all duration-200 font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    Confirm Work-order
                  </button>
                  <button
                    onClick={handleSaveDraft}
                    className="w-full sm:w-auto px-8 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-teal-400 transition-all duration-200 font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Draft
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-lg font-medium">History Tab</p>
              <p className="text-sm mt-1">Content coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === 'quotations' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-lg font-medium">Quotations Tab</p>
              <p className="text-sm mt-1">Content coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-lg font-medium">Pending Tab</p>
              <p className="text-sm mt-1">Content coming soon...</p>
            </div>
          </div>
        )}
      </div>

      <ChangeProjectModal
        isOpen={showChangeProjectModal}
        onClose={() => setShowChangeProjectModal(false)}
        onSelectProject={handleProjectSelect}
        currentProjectId={projectData.id}
      />

      <ChangeVendorModal
        isOpen={showChangeVendorModal}
        onClose={() => setShowChangeVendorModal(false)}
        onSelectVendor={handleVendorSelect}
        currentVendorId={null}
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </>
  );
}