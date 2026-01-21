import { useState } from 'react';
import { FileText, Download, Send, Edit, Building2, MapPin, Mail, Phone, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function Proforma() {
  const [proformas, setProformas] = useState([
    {
      id: 1,
      number: 'QT-2026-02034',
      client: {
        name: 'ACME Corporation',
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
      version: 'Rev 2',
      issueDate: '2026-01-01',
      validUntil: '2026-01-31',
      subject: 'Proforma to Acme Corporation about construction services',
      sections: [
        {
          title: 'Section A - Construction Certificate',
          items: [
            {
              description: 'To obtain Extra Water & Extra Sewerage Charges & No Dues NOC from Water Dept.',
              quantity: 1,
              unit: 'Cubic ft',
              rate: 555,
              amount: 555
            },
            {
              description: 'To obtain Extra Water & Extra Sewerage Charges & No Dues NOC from Water Dept.',
              quantity: 1,
              unit: 'Cubic ft',
              rate: 555,
              amount: 555
            }
          ]
        },
        {
          title: 'Section B - Occupational Certificate',
          items: [
            {
              description: 'To obtain Extra Water & Extra Sewerage Charges & No Dues NOC from Water Dept.',
              quantity: 1,
              unit: 'Cubic ft',
              rate: 555,
              amount: 555
            },
            {
              description: 'To obtain Extra Water & Extra Sewerage Charges & No Dues NOC from Water Dept.',
              quantity: 1,
              unit: 'Cubic ft',
              rate: 555,
              amount: 555
            },
            {
              description: 'To obtain Extra Water & Extra Sewerage Charges & No Dues NOC from Water Dept.',
              quantity: 1,
              unit: 'Cubic ft',
              rate: 555,
              amount: 555
            }
          ]
        }
      ],
      subTotal: 636512,
      gst: {
        enabled: true,
        rate: 18,
        amount: 25325
      },
      discount: {
        type: 'Percentage',
        value: 0
      },
      grandTotal: 612322,
      status: 'Draft',
      timeline: [
        {
          title: 'Quotation Created',
          date: '01-01-2026, 09:30 AM',
          user: 'Mr. ABC'
        },
        {
          title: 'Revised to version 2 - update pricing',
          date: '01-01-2026, 09:30 AM',
          user: 'Mr. ABC'
        },
        {
          title: 'Proforma Generated',
          date: '01-01-2026, 09:30 AM',
          user: 'Mr. ABC'
        },
        {
          title: 'Send to client via Email',
          date: '01-01-2026, 09:30 AM',
          user: 'Mr. ABC'
        },
        {
          title: 'Awaiting for client approval',
          date: '',
          user: '',
          pending: true
        }
      ]
    }
  ]);

  const [selectedProforma, setSelectedProforma] = useState(proformas[0]);
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' or 'timeline'

  const calculateSectionTotal = (section) => {
    return section.items.reduce((total, item) => total + item.amount, 0);
  };

  const handleSendToClient = () => {
    alert('Email sent to client successfully!');
  };

  const handleSaveDraft = () => {
    alert('Proforma saved as draft!');
  };

  const handleDownloadPDF = () => {
    alert('PDF download will be implemented with backend integration');
  };

  const handleTurnIntoInvoice = () => {
    if (selectedProforma.status === 'Draft') {
      alert('Please get client approval before converting to invoice');
      return;
    }
    alert('Invoice generation will be implemented');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Proforma Generation</h1>
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={handleDownloadPDF}
                className="px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">PDF</span>
              </button>
              <button
                onClick={handleSendToClient}
                className="px-3 sm:px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Send className="w-4 h-4" />
                Send to Client
              </button>
            </div>
          </div>
        </div>

        {/* Proforma Number */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{selectedProforma.number}</div>
              <div className="text-sm text-gray-500">{selectedProforma.client.name}, {selectedProforma.project.name}</div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Proforma Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Company & Client Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Company Info */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="w-5 h-5 text-teal-600" />
                    <h3 className="font-semibold text-gray-800">{selectedProforma.company.name}</h3>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>{selectedProforma.company.address}</p>
                    <p>{selectedProforma.company.city}</p>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{selectedProforma.company.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{selectedProforma.company.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Client Info */}
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="text-xs font-medium text-gray-500 mb-2">To</h4>
                    <div className="space-y-1">
                      <div className="font-semibold text-gray-900">{selectedProforma.client.name}</div>
                      <div className="text-sm text-gray-600">{selectedProforma.client.contact}</div>
                      <div className="text-sm text-gray-600">{selectedProforma.client.email}</div>
                      <div className="text-sm text-gray-600">{selectedProforma.client.phone}</div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-teal-600" />
                      <h4 className="text-xs font-medium text-gray-500">Project Details</h4>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-900">{selectedProforma.project.name}</div>
                      <div className="text-sm text-gray-600">{selectedProforma.project.location}</div>
                      <div className="text-sm text-gray-600">Plot: {selectedProforma.project.plot}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quotation Details */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600 mb-1">Quotation Number</div>
                    <div className="font-semibold text-gray-900">{selectedProforma.number}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">Version</div>
                    <div className="font-semibold text-gray-900">{selectedProforma.version}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">Issue Date</div>
                    <div className="font-semibold text-gray-900">{selectedProforma.issueDate}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">Valid Until</div>
                    <div className="font-semibold text-gray-900">{selectedProforma.validUntil}</div>
                  </div>
                </div>
              </div>

              {/* Subject */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Subject :</h4>
                <p className="text-gray-600">{selectedProforma.subject}</p>
              </div>

              {/* Service Description */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Service Description</h3>
                
                {selectedProforma.sections.map((section, sectionIndex) => (
                  <div key={sectionIndex} className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-6 bg-teal-500 rounded"></div>
                      <h4 className="font-semibold text-gray-800">{section.title}</h4>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {section.items.map((item, itemIndex) => (
                            <tr key={itemIndex} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-700">{item.description}</td>
                              <td className="px-4 py-3 text-sm text-gray-700 text-center">{item.quantity}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">{item.unit}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">{item.rate}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900">Rs. {item.amount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                {/* Totals */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-6">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sub Total:</span>
                      <span className="font-semibold text-gray-900">Rs. {selectedProforma.subTotal.toLocaleString('en-IN')}</span>
                    </div>
                    {selectedProforma.gst.enabled && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">GST ({selectedProforma.gst.rate}%):</span>
                        <span className="font-semibold text-gray-900">Rs. {selectedProforma.gst.amount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-300">
                      <span className="font-semibold text-gray-800">Grand Total:</span>
                      <span className="text-xl font-bold text-teal-600">Rs. {selectedProforma.grandTotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3">Terms & Conditions</h4>
                <p className="text-sm text-gray-600">
                  Payment terms: Net 30 days from invoice date. All services subject to availability and standard terms and conditions. Prices are valid for 30 days from quotation date. Any changes to the scope of work may result in price adjustments.
                </p>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Prepared By :</h4>
                  <div className="text-sm">
                    <div className="font-semibold text-gray-900">Mr. ABC</div>
                    <div className="text-gray-600">Project Manager</div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Client Approval :</h4>
                  <div className="text-sm">
                    <div className="font-semibold text-gray-900">Sign:</div>
                    <div className="text-gray-600">Date:</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Summary & Timeline */}
            <div className="space-y-6">
              {/* Quick Summary */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-teal-500 to-blue-500 px-4 py-3">
                  <h3 className="font-semibold text-white">Quotation Summary</h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Amount</span>
                    <span className="font-bold text-gray-900">Rs. {selectedProforma.grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Valid Until</span>
                    <span className="font-medium text-gray-900">{selectedProforma.validUntil}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sections</span>
                    <span className="font-medium text-gray-900">{selectedProforma.sections.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Line Items</span>
                    <span className="font-medium text-gray-900">
                      {selectedProforma.sections.reduce((total, section) => total + section.items.length, 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Info / Timeline Toggle */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="border-b border-gray-200">
                  <div className="flex">
                    <button
                      onClick={() => setActiveTab('preview')}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'preview'
                          ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Quick Info
                    </button>
                    <button
                      onClick={() => setActiveTab('timeline')}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'timeline'
                          ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Timeline
                    </button>
                  </div>
                </div>

                {activeTab === 'preview' ? (
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <FileText className="w-5 h-5 text-purple-600" />
                      <div className="flex-1">
                        <div className="text-xs text-gray-500">Quotation Created</div>
                        <div className="text-sm font-medium text-gray-900">01-01-2026, 09:30 AM by Mr. ABC</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <div className="flex-1">
                        <div className="text-xs text-gray-500">Revised to version 2 - update pricing</div>
                        <div className="text-sm font-medium text-gray-900">01-01-2026, 09:30 AM by Mr. ABC</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div className="flex-1">
                        <div className="text-xs text-gray-500">Proforma Generated</div>
                        <div className="text-sm font-medium text-gray-900">01-01-2026, 09:30 AM by Mr. ABC</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-lg border border-teal-200">
                      <Send className="w-5 h-5 text-teal-600" />
                      <div className="flex-1">
                        <div className="text-xs text-gray-500">Send to client via Email</div>
                        <div className="text-sm font-medium text-gray-900">01-01-2026, 09:30 AM by Mr. ABC</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <div className="flex-1">
                        <div className="text-xs text-gray-500">Awaiting for client approval</div>
                        <div className="text-sm font-medium text-yellow-600">Pending</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                      <div className="space-y-4">
                        {selectedProforma.timeline.map((event, index) => (
                          <div key={index} className="relative flex gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                              event.pending 
                                ? 'bg-yellow-100 border-2 border-yellow-400' 
                                : 'bg-teal-100 border-2 border-teal-400'
                            }`}>
                              {event.pending ? (
                                <Clock className="w-4 h-4 text-yellow-600" />
                              ) : (
                                <CheckCircle className="w-4 h-4 text-teal-600" />
                              )}
                            </div>
                            <div className="flex-1 pb-4">
                              <div className={`text-sm font-medium ${event.pending ? 'text-yellow-600' : 'text-gray-900'}`}>
                                {event.title}
                              </div>
                              {!event.pending && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {event.date} by {event.user}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="text-sm">
            <span className="font-semibold">Total:</span> Rs. {selectedProforma.grandTotal.toLocaleString('en-IN')}
            <span className="mx-3">|</span>
            <span className="font-semibold">Items:</span> {selectedProforma.sections.reduce((total, section) => total + section.items.length, 0)}
            <span className="mx-3">|</span>
            <span className="font-semibold">Status:</span> 
            <span className={`ml-1 ${selectedProforma.status === 'Draft' ? 'text-yellow-600' : 'text-green-600'}`}>
              {selectedProforma.status}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            <button
              onClick={handleSaveDraft}
              className="flex-1 sm:flex-initial px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <FileText className="w-4 h-4" />
              Save Draft
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex-1 sm:flex-initial px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
            <button
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleTurnIntoInvoice}
            >
              <FileText className="w-4 h-4" />
              Turn into Invoice
            </button>
            <button
              onClick={handleSendToClient}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Send className="w-4 h-4" />
              Send to Client
            </button>
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">Note:</span> Turn into Invoice option will enable once client approve the Proforma
          </p>
        </div>
      </div>
    </div>
  );
}