import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FileText, Download, Send, Edit, Building2, MapPin, Mail, Phone,
  Clock, CheckCircle, User, ChevronDown, X,
  Home, Hash, AtSign
} from 'lucide-react';

// ============================================================================
// GIVE WORKORDER MODAL
// ============================================================================
// NOTE: vendor list and selectedVendor will be replaced with API data later.
// handleNext will trigger the workorder creation API call.

const GiveWorkorderModal = ({ isOpen, onClose, onCreateVendor }) => {
  const [selectedVendor, setSelectedVendor] = useState('ABC Infra');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Placeholder vendor list — replace with API response later
  // e.g. const [vendors, setVendors] = useState([]); useEffect(() => fetchVendors(), []);
  const vendors = ['ABC Infra', 'XYZ Builders', 'PQR Contractors', 'LMN Works'];

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
      if (scrollY) window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    // TODO: integrate with workorder creation API
    // e.g. createWorkorder({ vendorId: selectedVendorId, invoiceId: selectedInvoice.id })
    console.log('Proceeding with vendor:', selectedVendor);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] animate-fadeIn"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{ width: '100vw', height: '100vh', position: 'fixed' }}
        onClick={onClose}
      />
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4" style={{ height: '100vh' }}>
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-scaleIn"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-teal-600 text-white px-5 py-4 flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              <h2 className="text-base font-semibold">Give Workorder</h2>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5">
            <div>
              <p className="text-sm font-medium text-gray-800 mb-1">Select Vendor</p>
              <p className="text-xs text-gray-500 mb-3">Please select vendor u wants to give workorder</p>

              {/* Vendor Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:border-teal-400 transition-colors text-sm"
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-800">{selectedVendor}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                    {vendors.map((vendor) => (
                      <button
                        key={vendor}
                        onClick={() => { setSelectedVendor(vendor); setDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-teal-50 transition-colors flex items-center gap-2 ${
                          selectedVendor === vendor ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700'
                        }`}
                      >
                        <User className="w-4 h-4 text-gray-400" />
                        {vendor}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Next Button */}
            <button
              onClick={handleNext}
              className="w-full py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all duration-200 font-medium text-sm transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Next
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs text-gray-400 font-medium">OR</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            {/* Create New Vendor */}
            <button
              onClick={onCreateVendor}
              className="w-full py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-teal-400 transition-all duration-200 font-medium text-sm transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Create New Vendor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CREATE VENDOR MODAL
// ============================================================================
// NOTE: onSubmit will be replaced with createVendor() API call later.
// Form fields map directly to the vendor creation API payload.

const CreateVendorModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    vendorName: '',
    vendorCategory: '',
    phoneNumber: '',
    address: '',
    gstNumber: '',
    emailAddress: '',
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
      if (scrollY) window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    // TODO: replace with API call
    // e.g. const created = await createVendor(formData); onSuccess(created);
    onSuccess(formData);
  };

  const handleCancel = () => {
    setFormData({ vendorName: '', vendorCategory: '', phoneNumber: '', address: '', gstNumber: '', emailAddress: '' });
    onClose();
  };

  const inputClass =
    'w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all';

  return (
    <div
      className="fixed inset-0 z-[9999] animate-fadeIn"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{ width: '100vw', height: '100vh', position: 'fixed' }}
        onClick={onClose}
      />
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4" style={{ height: '100vh' }}>
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-scaleIn overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-teal-600 text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              <h2 className="text-base font-semibold">Create Vendor</h2>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="p-5 overflow-y-auto max-h-[65vh]">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-semibold text-gray-800">Vendor Details</span>
            </div>

            <div className="space-y-4">
              {/* Vendor Name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Vendor Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    name="vendorName"
                    value={formData.vendorName}
                    onChange={handleChange}
                    placeholder="ABC Infra"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              {/* Vendor Category */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Vendor Category</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    name="vendorCategory"
                    value={formData.vendorCategory}
                    onChange={handleChange}
                    placeholder="Plumbing"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="123456789"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Address</label>
                <div className="relative">
                  <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="abc, xyz, 234 567"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              {/* GST Number */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">GST Number</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    name="gstNumber"
                    value={formData.gstNumber}
                    onChange={handleChange}
                    placeholder="1234556"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Email Address</label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    name="emailAddress"
                    value={formData.emailAddress}
                    onChange={handleChange}
                    placeholder="Contact@acme.in"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="px-5 pb-5 pt-2 flex gap-3 border-t border-gray-100">
            <button
              onClick={handleSubmit}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all duration-200 font-medium text-sm transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <User className="w-4 h-4" />
              Create Vendor
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium text-sm transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// VENDOR SUCCESS MODAL
// ============================================================================
// Matches exactly the SuccessModal pattern from projects.jsx

const VendorSuccessModal = ({ isOpen, onClose, onProceedToPurchaseOrder }) => {
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
      if (scrollY) window.scrollTo(0, parseInt(scrollY || '0') * -1);
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
        style={{ width: '100vw', height: '100vh', top: 0, left: 0, position: 'fixed', overflow: 'hidden' }}
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
          <p className="text-xl font-semibold text-gray-800 mb-8">Created Vendor</p>
          <div className="space-y-3">
            <button
              onClick={onProceedToPurchaseOrder}
              className="w-full px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all duration-200 font-medium transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Proceed To Purchase Order
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
// MAIN INVOICES COMPONENT
// ============================================================================

export default function Invoices({ onUpdateNavigation }) {
  const navigate = useNavigate();
  const location = useLocation();

  // State passed from InvoicesList 3-step modal via navigate('/invoices/generate', { state: ... })
  // TODO (backend): use selectedClient.id, selectedQuotation.id, selectedProforma.id
  // to fetch or create the actual invoice via createInvoice() from services/invoices.js
  const {
    selectedClient    = null,
    selectedQuotation = null,
    selectedProforma  = null,
  } = location.state || {};

  // Set breadcrumb so navbar shows "Invoices → Generate Invoice"
  useEffect(() => {
    if (onUpdateNavigation) {
      onUpdateNavigation({ breadcrumbs: ['Invoices', 'Generate Invoice'] });
    }
    return () => {
      if (onUpdateNavigation) onUpdateNavigation(null);
    };
  }, [onUpdateNavigation]);
  
  const [invoices, setInvoices] = useState([
    {
      id: 1,
      number: 'IN-2026-02034',
      client: {
        name: 'Acme Corporation',
        contact: 'Robert Johnson',
        email: 'robert@acmecorp.com',
        phone: '+1 (555) 123-4567'
      },
      company: {
        name: 'BuildPro Construction',
        address: '123 Builder Street, Construction District',
        city: 'Mumbai, Maharashtra 400001',
        email: 'info@buildpro.com',
        phone: '+91 22 1234 5678'
      },
      project: {
        name: 'Riverside Corporate Tower',
        location: 'Downtown District, Mumbai',
        plot: 'CTS-458/2B'
      },
      proformaNumber: 'QT-2026-0234',
      version: 'Rev 2',
      issueDate: '2026-01-01',
      validUntil: '2026-01-31',
      subject: 'Proforma to Acme Corporation about.....',
      sections: [
        {
          title: 'Section A - Construction Certificate',
          items: [
            { description: 'To obtain Extra Water & Extra Sewerage Charges & No Dues NOC from Water Dept.', quantity: 1, unit: 'Cubic ft', rate: 555, amount: 555 },
            { description: 'To obtain Extra Water & Extra Sewerage Charges & No Dues NOC from Water Dept.', quantity: 1, unit: 'Cubic ft', rate: 555, amount: 555 }
          ]
        },
        {
          title: 'Section B - Occupational Certificate',
          items: [
            { description: 'To obtain Extra Water & Extra Sewerage Charges & No Dues NOC from Water Dept.', quantity: 1, unit: 'Cubic ft', rate: 555, amount: 555 },
            { description: 'To obtain Extra Water & Extra Sewerage Charges & No Dues NOC from Water Dept.', quantity: 1, unit: 'Cubic ft', rate: 555, amount: 555 }
          ]
        }
      ],
      subTotal: 638552,
      gst: { enabled: true, rate: 18, amount: 2452 },
      discount: { type: 'Percentage', value: 0, amount: 0 },
      grandTotal: 636512,
      preparedBy: 'Mr. ABC',
      preparedByRole: 'Project Manager',
      status: 'Invoice',
      timeline: [
        { title: 'Quotation Created', date: '01-01-2026, 09:30 AM', user: 'Mr. ABC' },
        { title: 'Revised to version 2 - update pricing', date: '01-01-2026, 09:30 AM', user: 'Mr. ABC' },
        { title: 'Proforma Generated', date: '01-01-2026, 09:30 AM', user: 'Mr. ABC' },
        { title: 'Send to client via Email', date: '01-01-2026, 09:30 AM', user: 'Mr. ABC' },
        { title: 'Client Approved invoice Generated', date: '01-01-2026, 09:30 AM', user: 'Mr. ABC' }
      ]
    }
  ]);

  const [selectedInvoice, setSelectedInvoice] = useState(invoices[0]);

  // ── Modal state ──
  const [showWorkorderModal, setShowWorkorderModal] = useState(false);
  const [showCreateVendorModal, setShowCreateVendorModal] = useState(false);
  const [showVendorSuccessModal, setShowVendorSuccessModal] = useState(false);

  const calculateSectionTotal = (section) =>
    section.items.reduce((total, item) => total + item.amount, 0);

  // Both top & bottom "Proceed to Workorder" buttons open GiveWorkorder modal
  const handleProceedToWorkorder = () => {
    setShowWorkorderModal(true);
  };

  // GiveWorkorder → "Create New Vendor" → open CreateVendor
  const handleOpenCreateVendor = () => {
    setShowWorkorderModal(false);
    setShowCreateVendorModal(true);
  };

  // CreateVendor submitted → show success
  const handleVendorCreated = (vendorData) => {
    // vendorData will eventually be the API response object
    setShowCreateVendorModal(false);
    setShowVendorSuccessModal(true);
  };

  // Success → "Proceed To Purchase Order"
  const handleProceedToPurchaseOrder = () => {
    setShowVendorSuccessModal(false);
    // Navigate to Purchase Order page
    navigate('/purchase-order');
  };

  const handleDownloadPDF = () => {
    // TODO: integrate with PDF generation / download API
    alert('PDF download will be implemented with backend integration');
  };

  return (
    <>
      <div className="space-y-4 sm:space-y-6">

        {/* ── Header Bar ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-base sm:text-lg font-semibold text-gray-900">{selectedInvoice.number}</div>
                <div className="text-xs sm:text-sm text-gray-500">{selectedInvoice.client.name}, {selectedInvoice.project.name}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleDownloadPDF}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5 sm:gap-2 font-medium"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">PDF</span>
              </button>
              <button
                onClick={handleProceedToWorkorder}
                className="px-3 sm:px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium"
              >
                Proceed to work-order
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">

                {/* Company Info */}
                <div className="bg-gray-50 rounded-xl p-5 sm:p-6 border border-gray-200">
                  <div className="flex flex-col sm:flex-row justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-4">
                        <Building2 className="w-5 h-5 text-teal-600" />
                        <span className="font-bold text-gray-900 text-lg">{selectedInvoice.company.name}</span>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" /><span>{selectedInvoice.company.address}</span></div>
                        <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" /><span>{selectedInvoice.company.city}</span></div>
                        <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400 flex-shrink-0" /><span>{selectedInvoice.company.email}</span></div>
                        <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400 flex-shrink-0" /><span>{selectedInvoice.company.phone}</span></div>
                      </div>
                    </div>
                    <div className="flex-1 text-right">
                      <div className="inline-block bg-teal-600 text-white px-6 py-2 rounded-lg font-bold text-lg mb-4">INVOICE</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-end gap-2"><span className="text-gray-500">Invoice No:</span><span className="font-semibold text-gray-900">{selectedInvoice.number}</span></div>
                        <div className="flex justify-end gap-2"><span className="text-gray-500">Issue Date:</span><span className="font-semibold text-gray-900">{selectedInvoice.issueDate}</span></div>
                        <div className="flex justify-end gap-2"><span className="text-gray-500">Valid Until:</span><span className="font-semibold text-gray-900">{selectedInvoice.validUntil}</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Client & Project Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-3">Bill To</div>
                    <div className="font-semibold text-gray-900 mb-1">{selectedInvoice.client.name}</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>{selectedInvoice.client.contact}</div>
                      <div className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{selectedInvoice.client.email}</div>
                      <div className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{selectedInvoice.client.phone}</div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-3">Project Details</div>
                    <div className="font-semibold text-gray-900 mb-1">{selectedInvoice.project.name}</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{selectedInvoice.project.location}</div>
                      <div>Plot: {selectedInvoice.project.plot}</div>
                    </div>
                  </div>
                </div>

                {/* Sections & Line Items */}
                <div className="space-y-6">
                  {selectedInvoice.sections.map((section, sectionIndex) => (
                    <div key={sectionIndex}>
                      <div className="bg-teal-600 text-white px-4 py-2.5 rounded-t-xl font-semibold text-sm">{section.title}</div>
                      <div className="overflow-x-auto border border-gray-200 rounded-b-xl">
                        <table className="w-full min-w-[500px]">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Qty</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Unit</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Professional<br/>Charges</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {section.items.map((item, itemIndex) => (
                              <tr key={itemIndex} className="border-b border-gray-100 last:border-0">
                                <td className="px-4 py-3 text-gray-700">{item.description}</td>
                                <td className="px-4 py-3 text-center text-gray-700">{item.quantity}</td>
                                <td className="px-4 py-3 text-center text-gray-700">{item.unit}</td>
                                <td className="px-4 py-3 text-right text-gray-700">{item.rate}</td>
                                <td className="px-4 py-3 text-right font-semibold text-gray-900">Rs. {item.amount.toLocaleString('en-IN')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-full sm:w-80 space-y-2">
                    <div className="flex justify-between text-sm py-2">
                      <span className="text-gray-600">Sub Total:</span>
                      <span className="font-semibold text-gray-900">Rs. {selectedInvoice.subTotal.toLocaleString('en-IN')}</span>
                    </div>
                    {selectedInvoice.gst.enabled && (
                      <div className="flex justify-between text-sm py-2">
                        <span className="text-gray-600">GST ({selectedInvoice.gst.rate}%)</span>
                        <span className="font-semibold text-gray-900">Rs. {selectedInvoice.gst.amount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base py-3 border-t-2 border-gray-300">
                      <span className="font-bold text-gray-900">Grand Total</span>
                      <span className="font-bold text-teal-600 text-lg">Rs. {selectedInvoice.grandTotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Terms & Conditions */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <div className="text-base font-bold text-gray-900 mb-3">Terms & Conditions</div>
                  <p className="text-sm text-gray-700 leading-relaxed mb-6">
                    Payment terms: Net 30 days from invoice date. All services subject to availability and standard terms and conditions. Prices are valid for 30 days from quotation date. Any changes to the scope of work may result in price adjustments.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <div className="text-sm font-medium text-gray-600 mb-1">Prepared By :</div>
                      <div className="font-semibold text-gray-900">{selectedInvoice.preparedBy}</div>
                      <div className="text-sm text-gray-600">{selectedInvoice.preparedByRole}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-600 mb-1">Client Approval :</div>
                      <div className="font-medium text-gray-700">Sign:</div>
                      <div className="font-medium text-gray-700">Date:</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Quick Summary */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="text-sm font-semibold text-gray-800">Quick Summary</div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Amount</span>
                      <span className="font-bold text-teal-600">Rs. {selectedInvoice.grandTotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Valid Until</span>
                      <span className="font-medium text-gray-900">{selectedInvoice.validUntil}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Sections</span>
                      <span className="font-medium text-gray-900">{selectedInvoice.sections.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Line Items</span>
                      <span className="font-medium text-gray-900">
                        {selectedInvoice.sections.reduce((total, section) => total + section.items.length, 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <Clock className="w-4 h-4 text-teal-600" />
                      Quick Info
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {selectedInvoice.timeline.map((event, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          index === 0 ? 'bg-purple-100' :
                          index === 1 ? 'bg-blue-100' :
                          index === 2 ? 'bg-teal-100' :
                          index === 3 ? 'bg-green-100' : 'bg-green-100'
                        }`}>
                          {index === 0 ? <FileText className="w-4 h-4 text-purple-600" /> :
                           index === 1 ? <Edit className="w-4 h-4 text-blue-600" /> :
                           index === 2 ? <FileText className="w-4 h-4 text-teal-600" /> :
                           index === 3 ? <Send className="w-4 h-4 text-green-600" /> :
                           <CheckCircle className="w-4 h-4 text-green-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-500 mb-0.5">{event.title}</div>
                          <div className="text-xs font-medium text-gray-900">{event.date} by {event.user}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Action Bar ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm">
              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 font-medium"
              >
                <Download className="w-4 h-4" />
                PDF
              </button>
              <div className="flex items-center gap-4 px-2">
                <div className="text-red-600 text-xs">
                  <span className="font-semibold">Note:</span> This is the final invoice only admin can change it
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                className="w-full sm:w-auto px-6 py-2.5 bg-red-400 text-white rounded-lg hover:bg-red-500 transition-colors font-medium text-sm"
              >
                Track Payment
              </button>
              <button
                onClick={handleProceedToWorkorder}
                className="w-full sm:w-auto px-6 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-medium text-sm"
              >
                Proceed to Workorder
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 pt-3 border-t border-gray-200 text-sm">
            <div>
              <span className="font-semibold text-gray-900">Total:</span>
              <span className="ml-2 font-bold text-gray-900">Rs. {selectedInvoice.grandTotal.toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">Items:</span>
              <span className="ml-2">{selectedInvoice.sections.reduce((total, section) => total + section.items.length, 0)}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">Status:</span>
              <span className="ml-2 text-orange-600 font-semibold">{selectedInvoice.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════ MODALS ══════════════ */}

      {/* Step 1: Give Workorder — select existing vendor or create new */}
      <GiveWorkorderModal
        isOpen={showWorkorderModal}
        onClose={() => setShowWorkorderModal(false)}
        onCreateVendor={handleOpenCreateVendor}
      />

      {/* Step 2: Create New Vendor form */}
      <CreateVendorModal
        isOpen={showCreateVendorModal}
        onClose={() => setShowCreateVendorModal(false)}
        onSuccess={handleVendorCreated}
      />

      {/* Step 3: Vendor created successfully */}
      <VendorSuccessModal
        isOpen={showVendorSuccessModal}
        onClose={() => setShowVendorSuccessModal(false)}
        onProceedToPurchaseOrder={handleProceedToPurchaseOrder}
      />

      {/* Animations — identical to projects.jsx */}
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