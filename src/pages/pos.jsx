import { useState, useCallback, useEffect } from 'react';
import { User, Phone, Mail, FileText, MapPin, Building2, Hash, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';
const CREATE_CLIENT_ENDPOINT = '/api/clients/create_client/';

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

const InputField = ({ icon: Icon, label, name, type = "text", placeholder, required = false, value, onChange }) => (
  <div>
    <label className="block text-xs sm:text-sm text-gray-600 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
      />
    </div>
  </div>
);

export default function POS() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [userData, setUserData] = useState(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstNumber: '',
    sacCode: '',
    projectName: '',
    surveyNumber: '',
    projectAddress: '',
    projectCity: '',
    projectState: '',
    projectPincode: ''
  });

  // PRODUCTION: Load token and user data on component mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('user_data');
    
    if (token) {
      setAuthToken(token);
      console.log('✅ Token loaded from localStorage');
    }
    
    if (user) {
      try {
        setUserData(JSON.parse(user));
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear messages when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  }, [error, success]);

  const validateForm = () => {
    const required = ['firstName', 'lastName', 'phoneNumber', 'email'];
    const missing = required.filter(field => !formData[field].trim());
    
    if (missing.length > 0) {
      const fieldNames = {
        firstName: 'First Name',
        lastName: 'Last Name',
        phoneNumber: 'Phone Number',
        email: 'Email'
      };
      setError(`Please fill in: ${missing.map(f => fieldNames[f]).join(', ')}`);
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (formData.phoneNumber.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid phone number (min 10 digits)');
      return false;
    }

    return true;
  };

  const handleRecordClient = async () => {
    setError('');
    setSuccess('');
    
    if (!validateForm()) return;

    // Get fresh token from localStorage (production approach)
    const token = getAuthToken();
    
    if (!token) {
      setError('Authentication required. Please login first.');
      return;
    }

    setSubmitting(true);

    // Build payload with only required fields
    const payload = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone_number: formData.phoneNumber
    };

    // Add optional fields only if they have values
    if (formData.address) payload.address = formData.address;
    if (formData.city) payload.city = formData.city;
    if (formData.state) payload.state = formData.state;
    if (formData.pincode) payload.pincode = formData.pincode;
    if (formData.gstNumber) payload.gst_number = formData.gstNumber;
    if (formData.sacCode) payload.sac_code = formData.sacCode;

    // Only add projects array if project name is provided
    if (formData.projectName && formData.projectName.trim()) {
      payload.projects = [{
        name: formData.projectName
      }];
      
      // Add optional project fields
      if (formData.surveyNumber) payload.projects[0].servey_number = formData.surveyNumber;
      if (formData.projectAddress) payload.projects[0].address = formData.projectAddress;
      if (formData.projectCity) payload.projects[0].city = formData.projectCity;
      if (formData.projectState) payload.projects[0].state = formData.projectState;
      if (formData.projectPincode) payload.projects[0].pincode = formData.projectPincode;
    }

    console.log('🚀 Sending payload:', JSON.stringify(payload, null, 2));

    try {
      // Use production API utility
      const response = await apiCall(CREATE_CLIENT_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (response.status === 401) {
        setError('Session expired. Please login again.');
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
        setAuthToken('');
        setUserData(null);
        setSubmitting(false);
        // Optionally redirect to login or trigger parent logout
        window.location.reload();
        return;
      }

      if (!response.ok) {
        let errorMessage = 'Failed to create client';
        try {
          const errorData = await response.json();
          console.error('Server error response:', errorData);
          
          errorMessage = errorData.message || errorData.detail || errorData.error || errorMessage;
          
          // Handle validation errors - check if errors is object/array, not string
          if (errorData.errors && typeof errorData.errors === 'object' && !Array.isArray(errorData.errors)) {
            errorMessage = Object.entries(errorData.errors)
              .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
              .join(' | ');
          } else if (errorData.errors && typeof errorData.errors === 'string') {
            // If errors is a string, use it directly
            errorMessage = errorData.errors;
          }
        } catch (e) {
          // If response is not JSON, try to get text
          try {
            const errorText = await response.text();
            console.error('Server error text:', errorText);
            errorMessage = errorText.substring(0, 200) || `Server error (${response.status})`;
          } catch (textError) {
            errorMessage = `Server error (${response.status})`;
          }
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log('✅ Client created successfully:', responseData);

      // Clear form on success
      setFormData({
        firstName: '', lastName: '', phoneNumber: '', email: '',
        address: '', city: '', state: '', pincode: '',
        gstNumber: '', sacCode: '', projectName: '', surveyNumber: '',
        projectAddress: '', projectCity: '', projectState: '', projectPincode: ''
      });

      setSuccess(`✅ Client "${formData.firstName} ${formData.lastName}" created successfully!`);
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);

    } catch (err) {
      if (err.message.includes('Failed to fetch')) {
        setError(`Cannot connect to API server at ${API_BASE_URL}. Please ensure the backend is running.`);
      } else {
        setError(err.message);
      }
      console.error('Error creating client:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    localStorage.setItem('clientDraft', JSON.stringify(formData));
    setSuccess('💾 Draft saved successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleLoadDraft = () => {
    const draft = localStorage.getItem('clientDraft');
    if (draft) {
      setFormData(JSON.parse(draft));
      setSuccess('📂 Draft loaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError('No saved draft found');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start gap-3 animate-fade-in">
          <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">{success}</p>
          </div>
          <button onClick={() => setSuccess('')} className="text-green-700 hover:text-green-900 text-xl font-bold leading-none">×</button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">Error</p>
            <p className="text-sm">{error}</p>
          </div>
          <button onClick={() => setError('')} className="text-red-700 hover:text-red-900 text-xl font-bold leading-none">×</button>
        </div>
      )}

      {/* Main Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Create New Client</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={handleLoadDraft}
                className="px-3 py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                <FileText className="w-4 h-4" />
                <span>Load Draft</span>
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
                <div className="grid grid-cols-2 gap-4">
                  <InputField 
                    icon={User} 
                    label="First Name" 
                    name="firstName" 
                    placeholder="John" 
                    required 
                    value={formData.firstName}
                    onChange={handleInputChange}
                  />
                  <InputField 
                    icon={User} 
                    label="Last Name" 
                    name="lastName" 
                    placeholder="Doe" 
                    required 
                    value={formData.lastName}
                    onChange={handleInputChange}
                  />
                </div>
                <InputField 
                  icon={Phone} 
                  label="Phone Number" 
                  name="phoneNumber" 
                  type="tel" 
                  placeholder="9876543210" 
                  required 
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                />
                <InputField 
                  icon={Mail} 
                  label="Email Address" 
                  name="email" 
                  type="email" 
                  placeholder="john@example.com" 
                  required 
                  value={formData.email}
                  onChange={handleInputChange}
                />
                <InputField 
                  icon={MapPin} 
                  label="Address" 
                  name="address" 
                  placeholder="123 Main Street" 
                  value={formData.address}
                  onChange={handleInputChange}
                />
                <div className="grid grid-cols-3 gap-4">
                  <InputField 
                    icon={Building2} 
                    label="City" 
                    name="city" 
                    placeholder="Mumbai" 
                    value={formData.city}
                    onChange={handleInputChange}
                  />
                  <InputField 
                    icon={MapPin} 
                    label="State" 
                    name="state" 
                    placeholder="Maharashtra" 
                    value={formData.state}
                    onChange={handleInputChange}
                  />
                  <InputField 
                    icon={Hash} 
                    label="Pincode" 
                    name="pincode" 
                    placeholder="400001" 
                    value={formData.pincode}
                    onChange={handleInputChange}
                  />
                </div>
                <InputField 
                  icon={Hash} 
                  label="GST Number" 
                  name="gstNumber" 
                  placeholder="22AAAAA0000A1Z5" 
                  value={formData.gstNumber}
                  onChange={handleInputChange}
                />
                <InputField 
                  icon={Hash} 
                  label="SAC Code" 
                  name="sacCode" 
                  placeholder="998314" 
                  value={formData.sacCode}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Project Details */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-teal-600" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">Project Details (Optional)</h3>
              </div>
              <div className="space-y-4">
                <InputField 
                  icon={Building2} 
                  label="Project Name" 
                  name="projectName" 
                  placeholder="Riverside Corporate Tower" 
                  value={formData.projectName}
                  onChange={handleInputChange}
                />
                <InputField 
                  icon={Hash} 
                  label="Survey Number" 
                  name="surveyNumber" 
                  placeholder="123/4A" 
                  value={formData.surveyNumber}
                  onChange={handleInputChange}
                />
                <InputField 
                  icon={MapPin} 
                  label="Project Address" 
                  name="projectAddress" 
                  placeholder="Plot 45, Sector 5" 
                  value={formData.projectAddress}
                  onChange={handleInputChange}
                />
                <div className="grid grid-cols-3 gap-4">
                  <InputField 
                    icon={Building2} 
                    label="City" 
                    name="projectCity" 
                    placeholder="Mumbai" 
                    value={formData.projectCity}
                    onChange={handleInputChange}
                  />
                  <InputField 
                    icon={MapPin} 
                    label="State" 
                    name="projectState" 
                    placeholder="Maharashtra" 
                    value={formData.projectState}
                    onChange={handleInputChange}
                  />
                  <InputField 
                    icon={Hash} 
                    label="Pincode" 
                    name="projectPincode" 
                    placeholder="400001" 
                    value={formData.projectPincode}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mt-6 sm:mt-8">
            <button
              onClick={handleRecordClient}
              disabled={submitting || !authToken}
              className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center justify-center gap-2 font-medium text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  <span>Creating Client...</span>
                </>
              ) : (
                <>
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Create Client</span>
                </>
              )}
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
    </div>
  );
}