import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  FolderKanban, Plus, CheckCircle, X, Loader2,
  Building2, MapPin, Hash, FileText, Users, User, Mail, Send, 
  FileCheck, PlayCircle, Clock, Calendar, Filter as FilterIcon
} from 'lucide-react';

// Import service layer
import { getProjects, createProject, getUsers } from '../../services/projects';
import { getClients } from '../../services/clients';

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
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] animate-fadeIn"
      style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed', overflow: 'hidden' }}
    >
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{ 
          width: '100vw', 
          height: '100vh', 
          top: 0, 
          left: 0, 
          position: 'fixed',
          overflow: 'hidden'
        }}
        onClick={onClose}
      />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4" style={{ height: '100vh' }}>
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
// FILTER MODAL COMPONENT
// ============================================================================

const FilterModal = ({ isOpen, onClose, onApply, currentFilters }) => {
  const [filters, setFilters] = useState(() => currentFilters || {
    dateFrom: '',
    dateTo: '',
    projectName: '',
    location: '',
    surveyNumber: '',
  });

  // Sync with parent whenever modal opens
  useEffect(() => {
    if (isOpen && currentFilters) {
      setFilters(currentFilters);
    }
  }, [isOpen, currentFilters]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleClear = () => {
    setFilters({ dateFrom: '', dateTo: '', projectName: '', location: '', surveyNumber: '' });
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  if (!isOpen) return null;

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
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col animate-scaleIn overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-teal-600 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <FilterIcon className="w-5 h-5" />
              <h2 className="text-base font-semibold">Filter</h2>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {/* Date Range */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Select Date</label>
                <button onClick={handleClear} className="text-teal-600 text-sm font-medium hover:text-teal-700 px-2 py-1">
                  Clear
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">From:</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      name="dateFrom"
                      value={filters.dateFrom}
                      onChange={handleInputChange}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">To:</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      name="dateTo"
                      value={filters.dateTo}
                      onChange={handleInputChange}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Project Name */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Project Name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="projectName"
                  value={filters.projectName}
                  onChange={handleInputChange}
                  placeholder="Enter project name"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Survey Number */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Survey Number</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="surveyNumber"
                  value={filters.surveyNumber}
                  onChange={handleInputChange}
                  placeholder="Enter survey number"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="location"
                  value={filters.location}
                  onChange={handleInputChange}
                  placeholder="City or address"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 flex-shrink-0">
            <button
              onClick={handleApply}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 px-6 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm"
            >
              <FilterIcon className="w-4 h-4" />
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CLIENT DROPDOWN COMPONENT (reused from quotationsList pattern)
// ============================================================================

const ClientDropdown = ({ value, onChange, disabled }) => {
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchClientList();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchClientList = async () => {
    setLoadingClients(true);
    try {
      const response = await getClients({ page: 1, page_size: 100 });
      if (response.status === 'success' && response.data) {
        setClients(response.data.results || []);
      }
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    } finally {
      setLoadingClients(false);
    }
  };

  const filteredClients = clients.filter(client => {
    const fullName = `${client.first_name || ''} ${client.last_name || ''}`.toLowerCase();
    const email = (client.email || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || email.includes(search);
  });

  const handleSelect = (client) => {
    setSelectedClient(client);
    onChange(client.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedClient(null);
    onChange('');
    setSearchTerm('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        disabled={disabled}
        className={`w-full px-4 py-2.5 border rounded-lg text-left flex items-center justify-between transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
          disabled ? 'bg-gray-100 cursor-not-allowed border-gray-300' : 'bg-white hover:border-teal-400 border-gray-300 cursor-pointer'
        } ${isOpen ? 'ring-2 ring-teal-500 border-transparent' : ''}`}
      >
        {selectedClient ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-teal-600" />
            </div>
            <span className="text-sm text-gray-800 truncate">
              {selectedClient.first_name} {selectedClient.last_name}
            </span>
            <span className="text-xs text-gray-400 flex-shrink-0">ID: {selectedClient.id}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">Select a client</span>
        )}
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {selectedClient && !disabled && (
            <span
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          {/* List */}
          <div className="max-h-52 overflow-y-auto">
            {loadingClients ? (
              <div className="text-center py-6 text-sm text-gray-500">Loading clients...</div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-500">No clients found</div>
            ) : (
              filteredClients.map(client => (
                <div
                  key={client.id}
                  onClick={() => handleSelect(client)}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                    value === client.id
                      ? 'bg-teal-50 border-l-2 border-teal-500'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {client.first_name} {client.last_name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{client.email}</div>
                  </div>
                  {value === client.id && (
                    <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// USER DROPDOWN COMPONENT
// ============================================================================

const UserDropdown = ({ value, onChange, disabled }) => {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchUserList();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUserList = async () => {
    setLoadingUsers(true);
    try {
      const response = await getUsers({ page: 1, page_size: 100 });
      if (response.status === 'success' && response.data) {
        setUsers(response.data.results || []);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''} ${user.username || ''}`.toLowerCase();
    const email = (user.email || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || email.includes(search);
  });

  const handleSelect = (user) => {
    setSelectedUser(user);
    onChange(user.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedUser(null);
    onChange('');
    setSearchTerm('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        disabled={disabled}
        className={`w-full px-4 py-2.5 border rounded-lg text-left flex items-center justify-between transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
          disabled ? 'bg-gray-100 cursor-not-allowed border-gray-300' : 'bg-white hover:border-teal-400 border-gray-300 cursor-pointer'
        } ${isOpen ? 'ring-2 ring-teal-500 border-transparent' : ''}`}
      >
        {selectedUser ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-teal-600" />
            </div>
            <span className="text-sm text-gray-800 truncate">
              {selectedUser.first_name} {selectedUser.last_name || selectedUser.username}
            </span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">Select a user</span>
        )}
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {selectedUser && !disabled && (
            <span
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {loadingUsers ? (
              <div className="text-center py-6 text-sm text-gray-500">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-500">No users found</div>
            ) : (
              filteredUsers.map(user => (
                <div
                  key={user.id}
                  onClick={() => handleSelect(user)}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                    value === user.id
                      ? 'bg-teal-50 border-l-2 border-teal-500'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {user.first_name} {user.last_name || user.username}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{user.email}</div>
                  </div>
                  {value === user.id && (
                    <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
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
    assigned_user_id: '',
    servey_number: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    start_date: '',
    end_date: '',
    description: '',
    is_draft: false,
  });

  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
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

    if (!formData.assigned_user_id) {
      setError('Assigned user is required');
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
        assigned_user_id: '',
        servey_number: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        start_date: '',
        end_date: '',
        description: '',
        is_draft: false,
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
      style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed', overflow: 'hidden' }}
    >
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{ 
          width: '100vw', 
          height: '100vh', 
          top: 0, 
          left: 0, 
          position: 'fixed',
          overflow: 'hidden'
        }}
        onClick={onClose}
      />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4 py-10">
        <div 
          className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-scaleIn"
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

              {/* Client - Searchable Dropdown */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                  <Users className="w-4 h-4" />
                  Client
                </label>
                <ClientDropdown
                  value={formData.client_id}
                  onChange={(clientId) => {
                    setFormData(prev => ({ ...prev, client_id: clientId }));
                    if (error) setError('');
                  }}
                  disabled={submitting}
                />
              </div>

              {/* Assigned User - Required */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                  <User className="w-4 h-4" />
                  Assigned User *
                </label>
                <UserDropdown
                  value={formData.assigned_user_id}
                  onChange={(userId) => {
                    setFormData(prev => ({ ...prev, assigned_user_id: userId }));
                    if (error) setError('');
                  }}
                  disabled={submitting}
                />
              </div>

              {/* Is Draft Toggle */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                  <FileText className="w-4 h-4" />
                  Save as Draft
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, is_draft: !prev.is_draft }))}
                    disabled={submitting}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                      formData.is_draft ? 'bg-teal-500' : 'bg-gray-200'
                    } ${submitting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                        formData.is_draft ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-500">
                    {formData.is_draft ? 'Draft — will not be published' : 'Active — will be published immediately'}
                  </span>
                </div>
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
  const [pageSize] = useState(12);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdProject, setCreatedProject] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    dateFrom: '',
    dateTo: '',
    projectName: '',
    location: '',
    surveyNumber: '',
  });
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
        ...(activeFilters.dateFrom && { date_from: activeFilters.dateFrom }),
        ...(activeFilters.dateTo && { date_to: activeFilters.dateTo }),
        ...(activeFilters.projectName?.trim() && { name: activeFilters.projectName.trim() }),
        ...(activeFilters.location?.trim() && { location: activeFilters.location.trim() }),
        ...(activeFilters.surveyNumber?.trim() && { servey_number: activeFilters.surveyNumber.trim() }),
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
  }, [currentPage, pageSize, searchTerm, activeFilters]);

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
    setShowFilterModal(true);
  };

  const handleApplyFilters = (filters) => {
    setActiveFilters(filters);
    setCurrentPage(1);
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
        if (!project) return false;
        // Search term filter
        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          const matchesSearch = (
            project.name?.toLowerCase().includes(search) ||
            project.address?.toLowerCase().includes(search) ||
            project.city?.toLowerCase().includes(search) ||
            project.servey_number?.toLowerCase().includes(search)
          );
          if (!matchesSearch) return false;
        }
        // Active filters (client-side fallback for immediate feedback)
        if (activeFilters.projectName?.trim()) {
          if (!project.name?.toLowerCase().includes(activeFilters.projectName.trim().toLowerCase())) return false;
        }
        if (activeFilters.surveyNumber?.trim()) {
          if (!project.servey_number?.toLowerCase().includes(activeFilters.surveyNumber.trim().toLowerCase())) return false;
        }
        if (activeFilters.location?.trim()) {
          const loc = activeFilters.location.trim().toLowerCase();
          if (!project.address?.toLowerCase().includes(loc) && !project.city?.toLowerCase().includes(loc)) return false;
        }
        if (activeFilters.dateFrom) {
          const from = new Date(activeFilters.dateFrom);
          const created = project.created_at ? new Date(project.created_at) : null;
          if (created && created < from) return false;
        }
        if (activeFilters.dateTo) {
          const to = new Date(activeFilters.dateTo);
          to.setHours(23, 59, 59, 999);
          const created = project.created_at ? new Date(project.created_at) : null;
          if (created && created > to) return false;
        }
        return true;
      })
    : [];

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

      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        currentFilters={activeFilters}
      />

      {/* Custom CSS for animations */}
      <style>{`
        body.modal-open {
          overflow: hidden !important;
          position: fixed !important;
          width: 100% !important;
          height: 100% !important;
        }

        html {
          overflow-y: scroll;
          scrollbar-gutter: stable;
        }

        /* Prevent background scroll when modal is open */
        body:has(.z-\\[9999\\]) {
          overflow: hidden !important;
          position: fixed !important;
          width: 100% !important;
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

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </>
  );
}