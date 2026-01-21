import { useState } from 'react';
import { Search, Filter, Plus, User, Phone, Mail, FileText, MapPin, Building2, Hash, Clock, CircleDot } from 'lucide-react';

export default function POS() {
  const [clients, setClients] = useState([]);

  const [formData, setFormData] = useState({
    clientName: '',
    phoneNumber: '',
    email: '',
    sacNumber: '',
    projectName: '',
    plotNumber: '',
    location: '',
    gstNumber: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getRandomColor = () => {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500',
      'bg-lime-500',
      'bg-amber-500',
      'bg-emerald-500',
      'bg-rose-500',
      'bg-fuchsia-500',
      'bg-violet-500'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleRecordClient = (e) => {
    e.preventDefault();
    
    if (!formData.clientName || !formData.phoneNumber || !formData.email) {
      alert('Please fill in all required fields');
      return;
    }

    const newClient = {
      id: Date.now(),
      name: formData.clientName,
      email: formData.email,
      userName: 'New User',
      sessions: 0,
      notes: formData.plotNumber || 'N/A',
      totalOutstanding: 'Rs. 0',
      date: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
      status: 'active',
      color: getRandomColor()
    };

    setClients(prev => [newClient, ...prev]);
    
    setFormData({
      clientName: '',
      phoneNumber: '',
      email: '',
      sacNumber: '',
      projectName: '',
      plotNumber: '',
      location: '',
      gstNumber: ''
    });

    alert('Client recorded successfully!');
  };

  const handleSaveDraft = (e) => {
    e.preventDefault();
    alert('Draft saved successfully!');
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-blue-500';
      case 'inactive': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Client & Project Information Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Client & Project Information</h2>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button className="px-3 py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">History</span>
              </button>
              <button className="px-3 py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Quotations</span>
              </button>
              <button className="px-3 py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2">
                <CircleDot className="w-4 h-4" />
                <span className="hidden sm:inline">Pending</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Client Details */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-teal-600" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">Client Details</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm text-gray-600 mb-2">Client Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    <input
                      type="text"
                      name="clientName"
                      value={formData.clientName}
                      onChange={handleInputChange}
                      placeholder="Acme Corporation"
                      className="w-full pl-9 sm:pl-10 pr-12 sm:pr-14 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 bg-teal-500 rounded-md flex items-center justify-center hover:bg-teal-600 transition-colors">
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm text-gray-600 mb-2">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="123456789"
                      className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm text-gray-600 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Contact@acme.in"
                      className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm text-gray-600 mb-2">SAC Number</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    <input
                      type="text"
                      name="sacNumber"
                      value={formData.sacNumber}
                      onChange={handleInputChange}
                      placeholder="1234556"
                      className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Project Details */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-teal-600" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">Project Details</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm text-gray-600 mb-2">Project / Property Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    <input
                      type="text"
                      name="projectName"
                      value={formData.projectName}
                      onChange={handleInputChange}
                      placeholder="Reverside Corporate Tower"
                      className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm text-gray-600 mb-2">Plot / CTS / Survey Number</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    <input
                      type="text"
                      name="plotNumber"
                      value={formData.plotNumber}
                      onChange={handleInputChange}
                      placeholder="123456789"
                      className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm text-gray-600 mb-2">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="Contact@acme.in"
                      className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm text-gray-600 mb-2">GST Number</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    <input
                      type="text"
                      name="gstNumber"
                      value={formData.gstNumber}
                      onChange={handleInputChange}
                      placeholder="1234556"
                      className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mt-6 sm:mt-8">
            <button
              onClick={handleRecordClient}
              className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
            >
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="truncate">Record Client & Proceed</span>
            </button>
            <button
              onClick={handleSaveDraft}
              className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-white text-teal-600 border-2 border-teal-500 rounded-lg hover:bg-teal-50 transition-colors flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
            >
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              Save Draft
            </button>
          </div>
        </div>
      </div>

      {/* Client List Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Client List</h2>
                <p className="text-xs sm:text-sm text-gray-500">Total {(clients.length / 1000).toFixed(1)} K</p>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="w-full sm:w-64 pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 flex-shrink-0"
              >
                <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                <span className="text-sm sm:text-base text-gray-700 hidden sm:inline">Filter</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table - Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer Name
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User Name
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sessions
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Outstanding
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${client.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{client.name}</div>
                        <div className="text-sm text-gray-500">{client.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {client.userName}
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {client.sessions}
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {client.notes}
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {client.totalOutstanding}
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {client.date}
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <span className={`inline-block w-3 h-3 rounded-full ${getStatusColor(client.status)}`}></span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Card View - Mobile/Tablet */}
        <div className="md:hidden divide-y divide-gray-200">
          {filteredClients.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No clients found</p>
            </div>
          ) : (
            filteredClients.map((client) => (
              <div key={client.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-12 h-12 ${client.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{client.name}</h3>
                    <p className="text-xs text-gray-500 truncate">{client.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-block w-2 h-2 rounded-full ${getStatusColor(client.status)}`}></span>
                      <span className="text-xs text-gray-600">{client.userName}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Sessions:</span>
                    <span className="ml-1 font-medium text-gray-700">{client.sessions}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Date:</span>
                    <span className="ml-1 font-medium text-gray-700">{client.date}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Notes:</span>
                    <span className="ml-1 font-medium text-gray-700">{client.notes}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Outstanding:</span>
                    <span className="ml-1 font-medium text-gray-700">{client.totalOutstanding}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* See All Clients Button */}
        <div className="p-4 sm:p-6 border-t border-gray-200 flex justify-end">
          <button className="w-full sm:w-auto px-6 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-medium text-sm sm:text-base">
            See All Clients
          </button>
        </div>
      </div>
    </div>
  );
}