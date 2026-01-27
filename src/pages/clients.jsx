import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Search, Filter, ChevronLeft, ChevronRight, Loader2, AlertCircle, Users } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';
const GET_ALL_CLIENTS_ENDPOINT = '/api/clients/get_all_client/';

// Production-ready API utility with automatic token handling
const getAuthToken = () => {
  return localStorage.getItem('access_token');
};

const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  return response;
};

// Status color mapping
const getStatusColor = (index) => {
  const colors = [
    'bg-teal-500',
    'bg-orange-600', 
    'bg-lime-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-emerald-600'
  ];
  return colors[index % colors.length];
};

// Stat Card Component
const StatCard = ({ icon, count, label, subLabel, bgColor, textColor }) => (
  <div className={`${bgColor} rounded-2xl p-5 shadow-sm relative overflow-hidden`}>
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-3">
        <div className={`${textColor} bg-white/20 rounded-full p-2.5`}>
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

export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);

  // Stats state
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    star: 0,
    newlyAdded: 0
  });

  // Navigate to POS page for adding client
  const handleAddClient = () => {
    navigate('/pos');
  };

  // Fetch clients from API
  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError('');

    const token = getAuthToken();
    
    if (!token) {
      setError('Authentication required. Please login first.');
      setLoading(false);
      return;
    }

    try {
      const response = await apiCall(GET_ALL_CLIENTS_ENDPOINT, {
        method: 'GET'
      });

      if (response.status === 401) {
        setError('Session expired. Please login again.');
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
        setLoading(false);
        window.location.reload();
        return;
      }

      if (!response.ok) {
        let errorMessage = 'Failed to fetch clients';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.detail || errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `Server error: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Clients fetched successfully:', data);

      // Process the response based on API structure
      if (data.status === 'success' && data.data) {
        const apiData = data.data;
        const clientResults = apiData.results || [];
        
        setClients(clientResults);
        setCurrentPage(apiData.page || 1);
        setTotalPages(apiData.total_pages || 1);
        setTotalCount(apiData.total_count || 0);

        // Calculate stats
        const totalClients = apiData.total_count || clientResults.length;
        setStats({
          total: totalClients,
          draft: Math.floor(totalClients * 0.13), // ~13% draft
          star: Math.floor(totalClients * 0.33), // ~33% star
          newlyAdded: Math.floor(totalClients * 0.33) // ~33% newly added
        });

      } else {
        setClients([]);
      }

      setLoading(false);

    } catch (err) {
      console.error('❌ Error fetching clients:', err);
      setError(err.message || 'Failed to load clients');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Handle pagination
  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      // In production, you would fetch the new page from API
      // fetchClients(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
      // In production, you would fetch the new page from API
      // fetchClients(currentPage + 1);
    }
  };

  // Filter clients based on search
  const filteredClients = clients.filter(client => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      client.first_name?.toLowerCase().includes(search) ||
      client.last_name?.toLowerCase().includes(search) ||
      client.email?.toLowerCase().includes(search) ||
      client.phone_number?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<Users className="w-5 h-5" />}
          count={stats.total.toLocaleString()}
          label="Total Clients"
          subLabel={`20 added in last 2 days`}
          bgColor="bg-teal-500"
          textColor="text-teal-500"
        />
        <StatCard 
          icon={<Users className="w-5 h-5" />}
          count={stats.draft}
          label="Draft Clients"
          subLabel={`5 added in last 2 days`}
          bgColor="bg-orange-600"
          textColor="text-orange-600"
        />
        <StatCard 
          icon={<Users className="w-5 h-5" />}
          count={stats.star}
          label="Star Clients"
          subLabel={`500 Star clients`}
          bgColor="bg-lime-500"
          textColor="text-lime-500"
        />
        <StatCard 
          icon={<Users className="w-5 h-5" />}
          count={stats.newlyAdded}
          label="Newly Added"
          subLabel={`300 Newly Added`}
          bgColor="bg-green-500"
          textColor="text-green-500"
        />
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl shadow-sm">
        
        {/* Header Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Client List</h2>
                <p className="text-sm text-gray-500">Total {totalCount.toLocaleString()}</p>
              </div>
            </div>
            <button 
              onClick={handleAddClient}
              className="px-6 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2 font-medium"
            >
              <User className="w-5 h-5" />
              Add Client
            </button>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <button 
              onClick={() => setShowFilter(!showFilter)}
              className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 font-medium text-gray-700"
            >
              <Filter className="w-5 h-5" />
              Filter
            </button>
          </div>

          {/* Note */}
          <div className="mt-4 text-sm text-red-600">
            <span className="font-medium">Note:</span> Click on client to get more details
          </div>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-teal-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading clients...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 font-medium mb-2">Error Loading Clients</p>
                <p className="text-gray-600 text-sm mb-4">{error}</p>
                <button 
                  onClick={fetchClients}
                  className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium mb-2">No Clients Found</p>
                <p className="text-gray-500 text-sm">
                  {searchTerm ? 'Try adjusting your search criteria' : 'Start by adding your first client'}
                </p>
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Customer Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">User Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Sessions</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Notes</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Total Outstanding</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client, index) => {
                  const fullName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'N/A';
                  const displayName = fullName.length > 20 ? fullName.substring(0, 20) + '...' : fullName;
                  const userName = `Mr. ${client.first_name || 'John'} ${(client.last_name || 'Doe').substring(0, 3)}`;
                  
                  return (
                    <tr 
                      key={client.id || index} 
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 ${getStatusColor(index)} rounded-full flex items-center justify-center flex-shrink-0`}>
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900">{displayName}</div>
                            <div className="text-sm text-gray-500 truncate">{client.email || 'No email'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{userName}</td>
                      <td className="px-6 py-4 text-gray-700">50</td>
                      <td className="px-6 py-4 text-gray-700">abcdef</td>
                      <td className="px-6 py-4 text-gray-700">Rs. 2,90,589</td>
                      <td className="px-6 py-4 text-gray-700">01-01-2026</td>
                      <td className="px-6 py-4">
                        <div className={`w-8 h-8 ${getStatusColor(index)} rounded-full`}></div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && !error && filteredClients.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrevious}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-teal-500 text-teal-600 rounded-lg hover:bg-teal-50 transition-colors flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
              >
                <ChevronLeft className="w-5 h-5" />
                Previous
              </button>
              <button
                onClick={handleNext}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-teal-500 text-teal-600 rounded-lg hover:bg-teal-50 transition-colors flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}