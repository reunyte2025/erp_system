import { useState, useEffect } from 'react';
import { Search, Plus, User, ChevronDown, Trash2, Edit, FileText, Download, Send, X } from 'lucide-react';

export default function Quotations() {
  const [clients, setClients] = useState([
    {
      id: 1,
      name: 'ACME Corporation',
      email: 'contact@acme.in',
      project: 'Riverside Corporate Tower',
      location: 'Downtown District, Mumbai',
      contact: 'Robert Johnson',
      phone: '+1 (555) 123-4567'
    },
    {
      id: 2,
      name: 'Tech Solutions Ltd',
      email: 'info@techsolutions.com',
      project: 'Innovation Hub',
      location: 'Tech Park, Bangalore',
      contact: 'John Doe',
      phone: '+91 98765 43210'
    },
    {
      id: 3,
      name: 'Green Builders',
      email: 'contact@greenbuilders.in',
      project: 'Eco Apartments',
      location: 'Green Valley, Pune',
      contact: 'Sarah Smith',
      phone: '+91 99999 88888'
    }
  ]);

  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sections, setSections] = useState([]);
  const [gstEnabled, setGstEnabled] = useState(true);
  const [gstRate, setGstRate] = useState(18);
  const [discountType, setDiscountType] = useState('Percentage');
  const [discountValue, setDiscountValue] = useState(0);
  const [showAddSection, setShowAddSection] = useState(false);
  const [editingSection, setEditingSection] = useState(null);

  const [sectionForm, setSectionForm] = useState({
    title: '',
    items: []
  });

  const [itemForm, setItemForm] = useState({
    description: '',
    quantity: 1,
    unit: 'Cubic ft',
    rate: 0
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.client-dropdown')) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const calculateSubTotal = () => {
    return sections.reduce((total, section) => {
      return total + section.items.reduce((sectionTotal, item) => {
        return sectionTotal + (parseFloat(item.quantity) * parseFloat(item.rate));
      }, 0);
    }, 0);
  };

  const calculateDiscount = () => {
    const subTotal = calculateSubTotal();
    if (discountType === 'Percentage') {
      return (subTotal * parseFloat(discountValue || 0)) / 100;
    }
    return parseFloat(discountValue || 0);
  };

  const calculateGST = () => {
    if (!gstEnabled) return 0;
    const subTotal = calculateSubTotal();
    const afterDiscount = subTotal - calculateDiscount();
    return (afterDiscount * parseFloat(gstRate)) / 100;
  };

  const calculateGrandTotal = () => {
    const subTotal = calculateSubTotal();
    const discount = calculateDiscount();
    const gst = calculateGST();
    return subTotal - discount + gst;
  };

  const getTotalItems = () => {
    return sections.reduce((total, section) => total + section.items.length, 0);
  };

  const getTotalQuantity = () => {
    return sections.reduce((total, section) => {
      return total + section.items.reduce((itemTotal, item) => itemTotal + parseFloat(item.quantity), 0);
    }, 0);
  };

  const getAverageItemValue = () => {
    const totalItems = getTotalItems();
    return totalItems > 0 ? calculateGrandTotal() / totalItems : 0;
  };

  const getSectionSubtotal = (section) => {
    return section.items.reduce((total, item) => total + (parseFloat(item.quantity) * parseFloat(item.rate)), 0);
  };

  const handleAddItem = () => {
    if (!itemForm.description.trim()) {
      alert('Please enter item description');
      return;
    }

    if (parseFloat(itemForm.quantity) <= 0 || parseFloat(itemForm.rate) <= 0) {
      alert('Quantity and rate must be greater than 0');
      return;
    }

    setSectionForm(prev => ({
      ...prev,
      items: [...prev.items, { ...itemForm }]
    }));

    setItemForm({
      description: '',
      quantity: 1,
      unit: 'Cubic ft',
      rate: 0
    });
  };

  const handleRemoveItem = (index) => {
    setSectionForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleAddSection = () => {
    if (!sectionForm.title.trim()) {
      alert('Please enter section title');
      return;
    }

    if (sectionForm.items.length === 0) {
      alert('Please add at least one item to the section');
      return;
    }

    if (editingSection !== null) {
      setSections(prev => prev.map((section, idx) => 
        idx === editingSection ? { ...sectionForm } : section
      ));
      setEditingSection(null);
    } else {
      setSections(prev => [...prev, { ...sectionForm }]);
    }

    setSectionForm({ title: '', items: [] });
    setShowAddSection(false);
  };

  const handleEditSection = (index) => {
    setSectionForm(sections[index]);
    setEditingSection(index);
    setShowAddSection(true);
  };

  const handleDeleteSection = (index) => {
    if (window.confirm('Are you sure you want to delete this section?')) {
      setSections(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleGenerateProforma = () => {
    if (!selectedClient) {
      alert('Please select a client');
      return;
    }

    if (sections.length === 0) {
      alert('Please add at least one section');
      return;
    }

    alert('Proforma will be generated with the quotation data');
  };

  const handleSaveDraft = () => {
    if (!selectedClient) {
      alert('Please select a client');
      return;
    }

    alert('Draft saved successfully!');
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.project.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Service Quotation Builder</h1>
            <div className="flex gap-2 sm:gap-3">
              <button className="px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                <Edit className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button className="px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">PDF</span>
              </button>
              <button
                onClick={handleGenerateProforma}
                className="px-3 sm:px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <FileText className="w-4 h-4" />
                Generate Proforma
              </button>
            </div>
          </div>
        </div>

        {/* Client Selection */}
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="relative client-dropdown">
                <button
                  onClick={() => setShowClientDropdown(!showClientDropdown)}
                  className="w-full text-left px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-teal-400 transition-colors flex items-center justify-between bg-white"
                >
                  <div>
                    {selectedClient ? (
                      <>
                        <div className="font-semibold text-gray-900">{selectedClient.name}</div>
                        <div className="text-sm text-gray-500">{selectedClient.project}</div>
                      </>
                    ) : (
                      <div className="text-gray-500">Select a client</div>
                    )}
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showClientDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showClientDropdown && (
                  <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-auto">
                    <div className="p-3 border-b border-gray-200">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search clients..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                        />
                      </div>
                    </div>
                    {filteredClients.map(client => (
                      <button
                        key={client.id}
                        onClick={() => {
                          setSelectedClient(client);
                          setShowClientDropdown(false);
                          setSearchTerm('');
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{client.name}</div>
                        <div className="text-sm text-gray-600">{client.project}</div>
                        <div className="text-xs text-gray-400 mt-1">{client.location}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Service Quotation Builder and Quotation Summary Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Service Quotation Builder (2/3 width) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Service Quotation Builder</h3>
                </div>
                <button
                  onClick={() => {
                    setSectionForm({ title: '', items: [] });
                    setEditingSection(null);
                    setShowAddSection(true);
                  }}
                  className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Section
                </button>
              </div>

              {/* Sections List */}
              <div className="space-y-4">
                {sections.map((section, sectionIndex) => (
                  <div key={sectionIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-6 bg-teal-500 rounded"></div>
                        <h4 className="font-semibold text-gray-800">{section.title}</h4>
                        <span className="text-sm text-gray-500">
                          Subtotal: <span className="font-semibold text-gray-800">Rs. {getSectionSubtotal(section).toLocaleString('en-IN')}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditSection(sectionIndex)}
                          className="p-2 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSection(sectionIndex)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Quantity</th>
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
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                Rs. {(parseFloat(item.quantity) * parseFloat(item.rate)).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                {sections.length === 0 && (
                  <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 text-lg mb-2">No sections added yet</p>
                    <p className="text-gray-400 text-sm">Click "Add Section" to start building your quotation</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Quotation Summary (1/3 width) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden sticky top-6">
            <div className="bg-gradient-to-r from-teal-500 to-blue-500 px-4 py-3">
              <h3 className="font-semibold text-white">Quotation Summary</h3>
            </div>

            <div className="p-4 space-y-6">
              {/* Sub Total */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <span className="text-gray-600">Sub Total</span>
                <span className="text-xl font-bold text-gray-900">Rs. {calculateSubTotal().toLocaleString('en-IN')}</span>
              </div>

              {/* GST */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-600 font-medium">GST</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gstEnabled}
                      onChange={(e) => setGstEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                  </label>
                </div>
                {gstEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Rate (%)</label>
                      <input
                        type="number"
                        value={gstRate}
                        onChange={(e) => setGstRate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Amount</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-teal-600 text-sm">
                        Rs. {calculateGST().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Discount */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-gray-600 font-medium">Discount</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Type</label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    >
                      <option>Percentage</option>
                      <option>Fixed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Value</label>
                    <input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Grand Total */}
              <div className="pt-4 border-t-2 border-gray-300">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-800">Grand Total</span>
                  <span className="text-2xl font-bold text-teal-600">Rs. {calculateGrandTotal().toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Quick Info */}
              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="text-teal-600">₹</span> Quick Info
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Sections</span>
                    <span className="font-semibold text-gray-900">{sections.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Items</span>
                    <span className="font-semibold text-gray-900">{getTotalItems()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Quantity</span>
                    <span className="font-semibold text-gray-900">{getTotalQuantity()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Avg. Item Value</span>
                    <span className="font-semibold text-teal-600">
                      Rs. {getAverageItemValue().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="text-sm">
            <span className="font-semibold">Total:</span> Rs. {calculateGrandTotal().toLocaleString('en-IN', { maximumFractionDigits: 2 })} 
            <span className="mx-3">|</span>
            <span className="font-semibold">Items:</span> {getTotalItems()}
            <span className="mx-3">|</span>
            <span className="font-semibold">Status:</span> <span className="text-yellow-600">Draft</span>
          </div>
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            <button
              onClick={handleSaveDraft}
              className="flex-1 sm:flex-initial px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <FileText className="w-4 h-4" />
              Save Draft
            </button>
            <button className="flex-1 sm:flex-initial px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
              <Download className="w-4 h-4" />
              PDF
            </button>
            <button className="flex-1 sm:flex-initial px-6 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
              <FileText className="w-4 h-4" />
              Invoice
            </button>
            <button
              onClick={handleGenerateProforma}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <FileText className="w-4 h-4" />
              Generate Proforma
            </button>
          </div>
        </div>
      </div>

      {/* Add Section Modal */}
      {showAddSection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-800">
                {editingSection !== null ? 'Edit Section' : 'Add New Section'}
              </h3>
              <button
                onClick={() => {
                  setShowAddSection(false);
                  setSectionForm({ title: '', items: [] });
                  setEditingSection(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Section Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Section Title</label>
                <input
                  type="text"
                  value={sectionForm.title}
                  onChange={(e) => setSectionForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Section A - Construction Certificate"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Add Item Form */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h4 className="font-semibold text-gray-800 mb-4">Add Item</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Description</label>
                    <textarea
                      value={itemForm.description}
                      onChange={(e) => setItemForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter item description"
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={itemForm.quantity}
                      onChange={(e) => setItemForm(prev => ({ ...prev, quantity: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Unit</label>
                    <select
                      value={itemForm.unit}
                      onChange={(e) => setItemForm(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    >
                      <option>Cubic ft</option>
                      <option>Square ft</option>
                      <option>Piece</option>
                      <option>Hour</option>
                      <option>Day</option>
                      <option>Month</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Rate (Rs.)</label>
                    <input type="number" value={itemForm.rate} onChange={(e) => setItemForm(prev => ({ ...prev, rate: e.target.value }))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"/>
                    </div>
                  </div>
                <button
                onClick={handleAddItem}
               className="w-full px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
              <Plus className="w-4 h-4" />Add Item to Section
            </button>
          </div>

              {/* Items List */}
                {sectionForm.items.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Section Items ({sectionForm.items.length})</h4>
              <div className="space-y-2">
                {sectionForm.items.map((item, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">{item.description}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {item.quantity} {item.unit} × Rs. {item.rate} = Rs. {(parseFloat(item.quantity) * parseFloat(item.rate)).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={() => {
              setShowAddSection(false);
              setSectionForm({ title: '', items: [] });
              setEditingSection(null);
            }}
            className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleAddSection}
            className="px-6 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors text-sm font-medium"
          >
            {editingSection !== null ? 'Update Section' : 'Add Section'}
          </button>
        </div>
      </div>
    </div>
  )}
</div>
  );
}