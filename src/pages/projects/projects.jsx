import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FolderKanban, CheckCircle, X, Loader2, AlertCircle,
  Building2, MapPin, Hash, Users, User, Send, Calendar, Filter as FilterIcon,
  TrendingUp, PowerOff
} from 'lucide-react';

// Import service layer
import { getProjects, createProject, getUsers, deleteProject, undoProject } from '../../services/projects';
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
  </div>
);

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, projectName, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none" style={{ position: 'fixed' }}>
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto"
        style={{ position: 'fixed', width: '100vw', height: '100vh' }}
        onClick={!isLoading ? onClose : undefined}
      />
      <div className="relative z-10 flex items-center justify-center pointer-events-none" style={{ height: '100vh' }}>
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center animate-scaleIn pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Delete Project?</h2>
          <p className="text-sm text-gray-500 mb-6">
            <span className="font-semibold text-gray-700">{projectName}</span> will be marked as deleted.
            You can restore it later using Undo.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 active:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? 'Deleting...' : 'Yes, Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActionToast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 left-1/2 z-[99999] animate-slideUp" style={{ transform: 'translateX(-50%)' }}>
      <div
        className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-sm font-semibold ${
          type === 'success' ? 'bg-teal-600' : 'bg-red-500'
        }`}
      >
        <span>{message}</span>
        <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100 transition-opacity">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// SUCCESS MODAL COMPONENT
// ============================================================================

const SuccessModal = ({ isOpen, onClose, onProceed }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none" style={{ position: 'fixed' }}>
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto"
        style={{ position: 'fixed', width: '100vw', height: '100vh' }}
        onClick={onClose}
      />
      <div className="relative z-10 flex items-center justify-center p-4 pointer-events-none" style={{ height: '100vh' }}>
        <div
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-scaleIn pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center bg-teal-100">
              <CheckCircle className="w-12 h-12 text-teal-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-2 text-gray-800">Successfully</h3>
          <p className="text-xl font-semibold text-gray-800 mb-8">Created Project</p>
          <div className="space-y-3">
            <button
              onClick={onProceed}
              className="w-full px-6 py-3 text-white rounded-lg transition-all duration-200 font-medium bg-teal-500 hover:bg-teal-600"
            >
              Proceed To Project
            </button>
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-white rounded-lg transition-all duration-200 font-medium text-gray-600 border border-gray-300 hover:bg-gray-50"
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
    ctsNumber: '',
  });

  // Sync with parent whenever modal opens
  useEffect(() => {
    if (isOpen && currentFilters) {
      setFilters(currentFilters);
    }
  }, [isOpen, currentFilters]);

  useEffect(() => {
    if (isOpen) {
      
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
    setFilters({ dateFrom: '', dateTo: '', projectName: '', location: '', ctsNumber: '' });
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none" style={{ position: 'fixed' }}>
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto"
        style={{ position: 'fixed', width: '100vw', height: '100vh' }}
        onClick={onClose}
      />
      <div className="relative z-10 flex items-center justify-center min-h-screen p-3 sm:p-4 pointer-events-none" style={{ height: '100vh' }}>
        <div
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col animate-scaleIn overflow-hidden pointer-events-auto"
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

            {/* CTS Number */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">CTS Number</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="ctsNumber"
                  value={filters.ctsNumber}
                  onChange={handleInputChange}
                  placeholder="Enter CTS number"
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

const getClientDisplayName = (client) => {
  if (!client) return '';
  return (
    `${client.first_name || ''} ${client.last_name || ''}`.trim() ||
    client.name ||
    client.full_name ||
    (client.id ? `Client #${client.id}` : '')
  );
};

const ClientDropdown = ({ value, onChange, disabled, initialOption = null }) => {
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchClientList();
  }, []);

  useEffect(() => {
    if (!value) {
      setSelectedClient(initialOption || null);
      return;
    }

    const matchedClient = clients.find((client) => String(client.id) === String(value));
    if (matchedClient) {
      setSelectedClient(matchedClient);
      return;
    }

    if (initialOption) {
      setSelectedClient(initialOption);
    }
  }, [value, clients, initialOption]);

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
              {getClientDisplayName(selectedClient)}
            </span>

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
                      {getClientDisplayName(client)}
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

const getUserDisplayName = (user) => {
  if (!user) return '';
  return (
    `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
    user.name ||
    user.full_name ||
    user.username ||
    (user.id ? `User #${user.id}` : '')
  );
};

const UserDropdown = ({ value, onChange, disabled, initialOption = null }) => {
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
    if (!value) {
      setSelectedUser(initialOption || null);
      return;
    }

    const matchedUser = users.find((user) => String(user.id) === String(value));
    if (matchedUser) {
      setSelectedUser(matchedUser);
      return;
    }

    if (initialOption) {
      setSelectedUser(initialOption);
    }
  }, [value, users, initialOption]);

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
              {getUserDisplayName(selectedUser)}
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
                      {getUserDisplayName(user)}
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

const CreateProjectModal = ({ isOpen, onClose, onSuccess, initialData = null }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [initialClientOption, setInitialClientOption] = useState(null);
  const [initialUserOption, setInitialUserOption] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    assigned_user_id: '',
    cts_number: '',
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
      setInitialClientOption(null);
      setInitialUserOption(null);
      resetForm();
    }
    setError('');
  }, [isOpen]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  }, [error]);

  const resetForm = () => {
    setFormData({
      name: '',
      client_id: '',
      assigned_user_id: '',
      cts_number: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      start_date: '',
      end_date: '',
      description: '',
      is_draft: false,
    });
  };

  const buildPayload = () => ({
    name: formData.name.trim(),
    client_id: formData.client_id,
    assigned_user_id: formData.assigned_user_id,
    cts_number: formData.cts_number.trim(),
    address: formData.address.trim(),
    city: formData.city.trim(),
    state: formData.state.trim(),
    pincode: formData.pincode.trim(),
    start_date: formData.start_date,
    end_date: formData.end_date,
    description: formData.description.trim(),
    is_draft: false,
  });

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
      const payload = buildPayload();
      const response = await createProject(payload);
      
      console.log('Project created successfully:', response);
      
      resetForm();
      onSuccess?.(response);

    } catch (err) {
      console.error('Project save failed:', err);
      setError(err.message || 'Failed to save project');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none" style={{ position: 'fixed' }}>
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto transition-opacity"
        style={{ position: 'fixed', width: '100vw', height: '100vh' }}
        onClick={onClose}
      />

      <div className="relative z-10 flex items-center justify-center p-4 pointer-events-none" style={{ height: '100vh' }}>
        <div
          className="relative w-full max-w-[540px] overflow-hidden animate-scaleIn pointer-events-auto flex flex-col"
          style={{ borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxHeight: 'calc(100vh - 56px)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="bg-teal-700 px-5 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  <Building2 size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-base leading-tight">Create New Project</p>
                  <p className="text-xs mt-0.5 text-teal-200">Fill in the project details</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                disabled={submitting}
              >
                <X size={16} className="text-white" />
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
            <div className="bg-white px-5 py-4 overflow-y-auto min-h-0 flex-1">
              {error && (
                <div className="mb-4 flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm animate-slideDown">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3.5">
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
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 text-sm text-gray-700 placeholder-gray-400 transition-all"
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
                    initialOption={initialClientOption}
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
                    initialOption={initialUserOption}
                    onChange={(userId) => {
                      setFormData(prev => ({ ...prev, assigned_user_id: userId }));
                      if (error) setError('');
                    }}
                    disabled={submitting}
                  />
                </div>

                {/* CTS Number */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                    <Hash className="w-4 h-4" />
                    CTS Number
                  </label>
                  <input
                    type="text"
                    name="cts_number"
                    value={formData.cts_number}
                    onChange={handleInputChange}
                    placeholder="Enter CTS number"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 text-sm text-gray-700 placeholder-gray-400 transition-all"
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
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 text-sm text-gray-700 placeholder-gray-400 transition-all"
                    disabled={submitting}
                  />
                </div>

                {/* City and State */}
                <div className="grid grid-cols-3 gap-3">
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
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 text-sm text-gray-700 placeholder-gray-400 transition-all"
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
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 text-sm text-gray-700 placeholder-gray-400 transition-all"
                      disabled={submitting}
                    />
                  </div>
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
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 text-sm text-gray-700 placeholder-gray-400 transition-all"
                      disabled={submitting}
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* ── Footer ── */}
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-300 flex items-center gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-slate-600 hover:bg-gray-100 border border-gray-300 rounded-xl transition-colors text-sm font-medium"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`flex-1 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  submitting
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
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
  const navigate = useNavigate();
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [toast, setToast] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    dateFrom: '',
    dateTo: '',
    projectName: '',
    location: '',
    ctsNumber: '',
  });
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    deactive: 0,
    completed: 0,
  });

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  // Fetch ALL projects (no filters, large page_size) just to compute stats.
  // This runs separately from the paginated list fetch so counts are always
  // accurate regardless of which page the user is on or what filters are active.
  const fetchStats = useCallback(async () => {
    try {
      const response = await getProjects({ page: 1, page_size: 9999 });
      if (response.status === 'success' && response.data) {
        const all = (response.data.results || []).filter(p => p != null);
        setStats({
          total:     response.data.total_count || all.length,
          active:    all.filter(p => Number(p?.status) === 2 && p?.is_active !== false).length,
          deactive:  all.filter(p => p?.is_active === false || Number(p?.status) === 5).length,
          completed: all.filter(p => Number(p?.status) === 3).length,
        });
      }
    } catch (err) {
      console.error('❌ Error fetching project stats:', err);
    }
  }, []);

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
        ...(activeFilters.ctsNumber?.trim() && { cts_number: activeFilters.ctsNumber.trim() }),
      });

      if (response.status === 'success' && response.data) {
        const apiData = response.data;
        const projectResults = apiData.results || [];
        const validProjects = projectResults.filter(project => project != null);

        setProjects(validProjects);
        setCurrentPage(apiData.page || 1);
        setTotalPages(apiData.total_pages || 1);
        setTotalCount(apiData.total_count || 0);
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

  // Stats are fetched once on mount and refreshed whenever fetchStats identity
  // changes (i.e. it has no deps so this only runs on mount).
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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
    const projectId = createdProject?.id || createdProject?.data?.id;
    if (projectId) {
      navigate(`/projects/${projectId}`);
    }
  };

  const handleProjectClick = async (project) => {
    if (project?.is_active === false || Number(project?.status) === 5) {
      return;
    }
    if (project?.id) {
      navigate(`/projects/${project.id}`);
    }
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

  const handleDeleteProject = (project) => {
    setProjectToDelete(project);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      await deleteProject(projectToDelete.id);
      setShowDeleteModal(false);
      setProjectToDelete(null);
      fetchProjects();
      fetchStats();
      setToast({ message: 'Project deleted successfully', type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Failed to delete project', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUndoProject = async (project) => {
    if (isUndoing) return;
    setIsUndoing(true);
    try {
      await undoProject(project.id);
      fetchProjects();
      fetchStats();
      setToast({ message: 'Project restored successfully', type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Failed to restore project', type: 'error' });
    } finally {
      setIsUndoing(false);
    }
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
        subLabel="All projects in your workspace"
        bgColor="bg-teal-500"
      />
      <StatCard
        icon={<TrendingUp className="w-5 h-5" />}
        count={stats.active}
        label="Active Projects"
        subLabel="Projects currently in progress"
        bgColor="bg-yellow-500"
      />
      <StatCard
        icon={<PowerOff className="w-5 h-5" />}
        count={stats.deactive}
        label="Deactive Projects"
        subLabel="Deleted or inactive projects"
        bgColor="bg-red-500"
      />
      <StatCard
        icon={<CheckCircle className="w-5 h-5" />}
        count={stats.completed}
        label="Completed"
        subLabel="Projects marked as completed"
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
            project.cts_number?.toLowerCase().includes(search)
          );
          if (!matchesSearch) return false;
        }
        // Active filters (client-side fallback for immediate feedback)
        if (activeFilters.projectName?.trim()) {
          if (!project.name?.toLowerCase().includes(activeFilters.projectName.trim().toLowerCase())) return false;
        }
        if (activeFilters.ctsNumber?.trim()) {
          if (!project.cts_number?.toLowerCase().includes(activeFilters.ctsNumber.trim().toLowerCase())) return false;
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
        onAdd={() => { setShowCreateModal(true); }}
        onSearch={handleSearch}
        onFilterToggle={handleFilterToggle}
        onRowClick={handleProjectClick}
        onRetry={handleRetry}
        searchTerm={searchTerm}
        showFilter={showFilter}
        statsCards={renderStatsCards()}
        actionHandlers={{ onDeleteProject: handleDeleteProject, onUndoProject: handleUndoProject }}
      />

      {/* Modals */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); }}
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

      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => { if (!isDeleting) { setShowDeleteModal(false); setProjectToDelete(null); } }}
        onConfirm={handleConfirmDelete}
        projectName={projectToDelete?.name || ''}
        isLoading={isDeleting}
      />

      {toast && (
        <ActionToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

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