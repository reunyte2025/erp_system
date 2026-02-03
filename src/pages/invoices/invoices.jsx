import { useState } from 'react';
import { FileText, Download, Send, Edit, Building2, MapPin, Mail, Phone, Clock, CheckCircle, XCircle, AlertCircle, Printer, Archive, User } from 'lucide-react';

export default function Invoices() {
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
            }
          ]
        }
      ],
      subTotal: 638552,
      gst: {
        enabled: true,
        rate: 18,
        amount: 2452
      },
      discount: {
        type: 'Percentage',
        value: 0,
        amount: 0
      },
      grandTotal: 636512,
      preparedBy: 'Mr. ABC',
      preparedByRole: 'Project Manager',
      status: 'Invoice',
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
          title: 'Client Approved invoice Generated',
          date: '01-01-2026, 09:30 AM',
          user: 'Mr. ABC'
        }
      ]
    }
  ]);

  const [selectedInvoice, setSelectedInvoice] = useState(invoices[0]);

  const calculateSectionTotal = (section) => {
    return section.items.reduce((total, item) => total + item.amount, 0);
  };

  const handleProceedToWorkorder = () => {
    alert('Proceeding to work order generation');
  };

  const handleDownloadPDF = () => {
    alert('PDF download will be implemented with backend integration');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
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

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Left Column - Invoice Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Company Info Card with INVOICE label */}
              <div className="bg-gray-50 rounded-xl p-5 sm:p-6 border border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-900 mb-1">{selectedInvoice.company.name}</div>
                      <div className="text-sm text-gray-600 space-y-0.5">
                        <div>{selectedInvoice.company.address}</div>
                        <div>{selectedInvoice.company.city}</div>
                        <div className="mt-2">
                          <div>Email: {selectedInvoice.company.email}</div>
                          <div>Phone: {selectedInvoice.company.phone}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg px-4 py-3 border border-gray-200 min-w-[160px]">
                    <div className="text-xs font-semibold text-teal-600 uppercase mb-2">INVOICE</div>
                    <div className="space-y-1.5 text-sm">
                      <div>
                        <div className="text-xs text-gray-500">Number</div>
                        <div className="font-semibold text-gray-900">{selectedInvoice.proformaNumber}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Version</div>
                        <div className="font-medium text-gray-900">{selectedInvoice.version}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Issue Date:</div>
                        <div className="font-medium text-gray-900">{selectedInvoice.issueDate}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Valid Until</div>
                        <div className="font-medium text-gray-900">{selectedInvoice.validUntil}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* To and Project Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* To Section */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <div className="flex items-center gap-2 text-teal-600 mb-3">
                    <User className="w-4 h-4" />
                    <span className="text-sm font-semibold">To</span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="font-semibold text-gray-900">{selectedInvoice.client.name}</div>
                    <div className="text-gray-600">{selectedInvoice.client.contact}</div>
                    <div className="text-gray-600">{selectedInvoice.client.email}</div>
                    <div className="text-gray-600">{selectedInvoice.client.phone}</div>
                  </div>
                </div>

                {/* Project Details */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <div className="flex items-center gap-2 text-teal-600 mb-3">
                    <Building2 className="w-4 h-4" />
                    <span className="text-sm font-semibold">Project Details</span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="font-medium text-gray-900">{selectedInvoice.project.name}</div>
                    <div className="text-gray-600">{selectedInvoice.project.location}</div>
                    <div className="text-gray-600">Plot: {selectedInvoice.project.plot}</div>
                  </div>
                </div>
              </div>

              {/* Subject */}
              <div>
                <div className="text-sm font-semibold text-gray-800 mb-2">Subject :</div>
                <div className="text-sm text-gray-700">{selectedInvoice.subject}</div>
              </div>

              {/* Service Description */}
              <div>
                <div className="text-base font-bold text-gray-900 mb-4">Service Description</div>
                <div className="space-y-4">
                  {selectedInvoice.sections.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <div className="font-semibold text-gray-900 text-sm border-l-4 border-teal-500 pl-3">
                          {section.title}
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-white border-b border-gray-200">
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Quantity</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Miscellaneous</th>
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

            {/* Right Column - Summary */}
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

              {/* Quick Info */}
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
                        index === 3 ? 'bg-green-100' :
                        'bg-green-100'
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

      {/* Bottom Action Bar */}
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
          <button
            onClick={handleProceedToWorkorder}
            className="w-full sm:w-auto px-6 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-medium text-sm"
          >
            Proceed to Workorder
          </button>
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
  );
}