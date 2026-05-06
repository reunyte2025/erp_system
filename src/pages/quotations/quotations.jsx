import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Plus, User, ChevronDown, Trash2, Edit, FileText, Download, X, Loader2, AlertCircle, CheckCircle, Building2, ChevronRight } from 'lucide-react';
import { createRegulatoryQuotation, createExecutionQuotation, updateQuotationFull, getComplianceByCategory, generateQuotationPdf, QUOTATION_COMPANIES } from '../../services/quotation';
import { getClients, getClientProjects } from '../../services/clients';
import api from '../../services/api';

const ENABLE_LOGGING = false;

const logger = {
  log: (...args) => ENABLE_LOGGING && console.log(...args),
  error: (...args) => console.error(...args),
};

// ── Regulatory categories: 1–4, Execution categories: 5–7, Architecture: 8 ─
const COMPLIANCE_CATEGORIES = {
  // Regulatory
  1: { id: 1, name: 'Construction Certificate',                                             shortName: 'Construction Certificate', type: 'regulatory' },
  2: { id: 2, name: 'Occupational Certificate',                                             shortName: 'Occupational Certificate',  type: 'regulatory' },
  3: { id: 3, name: 'To obtain permission and commissioning of Internal Water Main',        shortName: 'Water Main',                type: 'regulatory' },
  4: { id: 4, name: 'To obtain permission and commissioning of STP',                        shortName: 'STP',                       type: 'regulatory' },
  // Execution
  5: { id: 5, name: 'Water Connection',                                                     shortName: 'Water Connection',          type: 'execution'  },
  6: { id: 6, name: 'SWD Line Work',                                                        shortName: 'SWD Line Work',             type: 'execution'  },
  7: { id: 7, name: 'Sewer/Drainage Line Work',                                             shortName: 'Sewer/Drainage',            type: 'execution'  },
  // Architecture — only for Company ID 1 (Constructive India), no sub-compliance
  8: { id: 8, name: 'Architecture',                                                         shortName: 'Architecture',              type: 'architecture' },
};

const COMPLIANCE_GROUPS = {
  certificates:            [1, 2],      // Regulatory - with sub-compliance, use Professional_amount
  regulatory:              [3, 4],      // Regulatory - no sub-compliance, use Professional_amount
  regulatory_permissions:  [1, 2, 3, 4], // Merged: all Regulatory cats (shown as one option in dropdown)
  execution:               [5, 6, 7],  // Execution  - use material/labour rates
  architecture:            [8],         // Architecture — Company 1 only, no sub-compliance, manual description
};

// All regulatory categories combined (for type-checking)
const REGULATORY_CATS     = [1, 2, 3, 4];
const EXECUTION_CATS      = [5, 6, 7];
const ARCHITECTURE_CATS   = [8]; // Architecture — Company ID 1 only

// ── Company options (matches backend Company class) ──────────────────────────
const COMPANIES = QUOTATION_COMPANIES;

// Sub-categories per compliance category
// Categories 1–2 (certificates): sub 1–4
// Category  5   (Water Connection): sub 5–6
// Categories 6–7 (SWD/Sewer): sub 7–9
const SUB_COMPLIANCE_BY_CATEGORY = {
  1: [ { id: 1, name: 'Plumbing Compliance' }, { id: 2, name: 'PCO Compliance' }, { id: 3, name: 'General Compliance' }, { id: 4, name: 'Road Setback Handing over' } ],
  2: [ { id: 1, name: 'Plumbing Compliance' }, { id: 2, name: 'PCO Compliance' }, { id: 3, name: 'General Compliance' }, { id: 4, name: 'Road Setback Handing over' } ],
  3: [],
  4: [],
  5: [ { id: 5, name: 'Internal Water Main' }, { id: 6, name: 'Permanent Water Connection' } ],
  6: [ { id: 7, name: 'Pipe Jacking Method' }, { id: 8, name: 'HDD Method' }, { id: 9, name: 'Open Cut Method' } ],
  7: [ { id: 7, name: 'Pipe Jacking Method' }, { id: 8, name: 'HDD Method' }, { id: 9, name: 'Open Cut Method' } ],
};

// Flat lookup for display purposes
const SUB_COMPLIANCE_CATEGORIES = {
  0: { id: 0, name: 'Default' },
  1: { id: 1, name: 'Plumbing Compliance' },
  2: { id: 2, name: 'PCO Compliance' },
  3: { id: 3, name: 'General Compliance' },
  4: { id: 4, name: 'Road Setback Handing over' },
  5: { id: 5, name: 'Internal Water Main' },
  6: { id: 6, name: 'Permanent Water Connection' },
  7: { id: 7, name: 'Pipe Jacking Method' },
  8: { id: 8, name: 'HDD Method' },
  9: { id: 9, name: 'Open Cut Method' },
};

// ============================================================================
// SUB-COMPLIANCE DROPDOWN COMPONENT
// ============================================================================

const SubComplianceDropdown = ({ 
  value, 
  onChange, 
  categoryId,
  placeholder = "Select Sub-Compliance",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = React.useRef(null);

  // Close on outside click — using ref so no stale closures
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset search when closed
  useEffect(() => { if (!isOpen) setSearch(''); }, [isOpen]);

  const allSubCategories = SUB_COMPLIANCE_BY_CATEGORY[categoryId] || [];

  const filteredList = allSubCategories.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedItem = allSubCategories.find(item => item.id === value);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-left flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
      >
        <span className={selectedItem ? 'text-gray-900' : 'text-gray-500'}>
          {selectedItem ? selectedItem.name : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 z-[99999] overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredList.length > 0 ? (
              filteredList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(item.id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-0 text-sm ${
                    value === item.id ? 'bg-teal-50 border-l-4 border-l-teal-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 font-medium">{item.name}</span>
                    {value === item.id && (
                      <div className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>No sub-compliance found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COMPLIANCE DROPDOWN COMPONENT
// ============================================================================

const ComplianceDropdown = ({ 
  value, 
  onChange, 
  complianceList, 
  loading, 
  placeholder = "Select Compliance"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { if (!isOpen) setSearch(''); }, [isOpen]);

  const filteredList = complianceList.filter(item =>
    (item.name || item.compliance_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const selectedItem = complianceList.find(item => item.id === value);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-left flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
      >
        <span className={selectedItem ? 'text-gray-900' : 'text-gray-500'}>
          {selectedItem ? (selectedItem.name || selectedItem.compliance_name) : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-4 text-center text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 text-teal-500 animate-spin mx-auto mb-2" />
                Loading...
              </div>
            ) : filteredList.length > 0 ? (
              filteredList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(item.id, item);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-0 text-sm ${
                    value === item.id ? 'bg-teal-50 border-l-4 border-l-teal-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 font-medium">{item.name || item.compliance_name}</span>
                    {value === item.id && (
                      <div className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>No compliance found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SUCCESS MODAL COMPONENT
// ============================================================================

const SuccessModal = ({ isOpen, onClose, onViewQuotation, quotationNumber, quotationId, isEditMode }) => {
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Always display the quotation number exactly as the backend returned it.
  // The backend is the sole source of truth — never construct or reformat it.
  const fmtQNum = (n) => (n ? String(n) : '');

  const handleDownload = async () => {
    if (!quotationId) return;
    try {
      setPdfLoading(true);
      await generateQuotationPdf(quotationId);
    } catch (err) {
      console.error('PDF download failed:', err.message);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] animate-fadeIn"
      style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed', overflow: 'hidden' }}
    >
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div 
          className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center animate-scaleIn"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-5 flex justify-center">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-9 h-9 text-teal-600" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">{isEditMode ? 'Quotation Updated!' : 'Quotation Created!'}</h3>
          {quotationNumber && (
            <p className="text-sm font-semibold text-teal-600 bg-teal-50 rounded-lg px-3 py-1.5 inline-block mb-4">
              {fmtQNum(quotationNumber)}
            </p>
          )}
          <p className="text-sm text-gray-500 mb-6">{isEditMode ? 'Your quotation has been updated successfully.' : 'Your quotation has been saved successfully.'}</p>
          <div className="space-y-2.5">
            <button
              onClick={onViewQuotation}
              className="w-full px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm"
            >
              {isEditMode ? 'View Quotation' : 'Back to Quotations'}
            </button>

            {/* Download Quotation — only shown when ID is available */}
            {quotationId && (
              <button
                onClick={handleDownload}
                disabled={pdfLoading}
                className="w-full px-6 py-2.5 bg-white text-teal-600 border border-teal-300 rounded-lg hover:bg-teal-50 transition-colors font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {pdfLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Generating PDF...</>
                  : <><Download className="w-4 h-4" />Download Quotation</>
                }
              </button>
            )}

            {!isEditMode && (
              <button
                onClick={onClose}
                className="w-full px-6 py-2.5 bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                Create Another
              </button>
            )}
          </div>
        </div>
      </div>

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
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT - PART 1
// ============================================================================

export default function Quotations({ onUpdateNavigation }) {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedClientFromState = location.state?.selectedClient;
  const selectedProjectFromState = location.state?.selectedProject ?? location.state?.project ?? null;

  // ── Edit mode: quotation passed from ViewQuotationDetails ──────────────────
  const editQuotation = location.state?.editQuotation ?? null;
  const isEditMode    = !!editQuotation;

  useEffect(() => {
    if (onUpdateNavigation) {
      onUpdateNavigation({
        breadcrumbs: isEditMode
          ? ['Quotations', 'Update Quotation']
          : ['Quotations', 'Generate Quotation'],
      });
    }
    return () => { if (onUpdateNavigation) onUpdateNavigation(null); };
  }, [onUpdateNavigation, isEditMode]);

  const DRAFT_KEY = 'quotation_draft';

  const saveDraft = (data) => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch { /* local draft is optional */ }
  };

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* local draft is optional */ }
  };

  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  // State Management
  const [clients, setClients] = useState([]);
  const [clientProjects, setClientProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState(selectedClientFromState || null);
  const [selectedProject, setSelectedProject] = useState(selectedProjectFromState || null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [quotationNumber, setQuotationNumber] = useState('');
  const [sacCode, setSacCode] = useState('');
  const [sections, setSections] = useState([]);
  const [gstEnabled, setGstEnabled] = useState(true);
  const [gstRate, setGstRate] = useState(18);
  const [discountType, setDiscountType] = useState('Percentage');
  const [discountValue, setDiscountValue] = useState(0);
  const [showAddSection, setShowAddSection] = useState(false);
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdQuotation, setCreatedQuotation] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, type: null, sectionIndex: null, itemIndex: null });
  const [selectedCompany, setSelectedCompany] = useState(COMPANIES[0]);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  const [selectedCategoryType, setSelectedCategoryType] = useState(null);
  const [_categoryCompliance, setCategoryCompliance] = useState([]);
  const [_categoryComplianceLoading, setCategoryComplianceLoading] = useState(false);

  // ── Per-category items map ────────────────────────────────────────────────
  // Structure: { [categoryId]: { items: [], category_name: '' } }
  // This is the SINGLE SOURCE OF TRUTH for items in the modal.
  // When user switches category tabs, items added under CC stay under CC,
  // items added under OC stay under OC — they never bleed across.
  const [categoryItemsMap, setCategoryItemsMap] = useState({});

  // Active category tab shown in the modal
  const [activeCategoryId, setActiveCategoryId] = useState(null);

  // Compliance descriptions fetched by category + sub_category
  // Keyed by `${categoryId}_${subCategoryId}` so switching tabs preserves cache
  const [descriptionsCacheRef] = useState({ current: {} });
  const [complianceDescriptions, setComplianceDescriptions] = useState([]);
  const [complianceDescLoading, setComplianceDescLoading] = useState(false);
  const [descriptionMode, setDescriptionMode] = useState("dropdown");
  const [descriptionSearch, setDescriptionSearch] = useState("");
  const [showDescriptionDropdown, setShowDescriptionDropdown] = useState(false);
  const [descSelectedFromDropdown, setDescSelectedFromDropdown] = useState(false);

  // sectionForm is only used for EDIT-SECTION mode (editing a section from the table)
  const [sectionForm, setSectionForm] = useState({
    category_id: null,
    category_name: '',
    items: []
  });

  // itemForm is PER-CATEGORY — keyed by categoryId
  // Structure: { [categoryId]: { compliance_name, compliance_id, sub_compliance_id, quantity, miscellaneous_amount, Professional_amount } }
  const [itemFormMap, setItemFormMap] = useState({});

  // editingItemIndex is PER-CATEGORY: { [categoryId]: number | null }
  const [editingItemIndexMap, setEditingItemIndexMap] = useState({});

  // Fetch Data on Mount — restore draft OR pre-fill from edit mode
  useEffect(() => {
    fetchClients();

    if (isEditMode && editQuotation) {
      // ── Pre-fill from existing quotation ──────────────────────────────────
      // quotation_number stays as-is (not regenerated)
      if (editQuotation.quotation_number) setQuotationNumber(String(editQuotation.quotation_number));
      if (editQuotation.sac_code)         setSacCode(editQuotation.sac_code);

      // GST
      const gst = parseFloat(editQuotation.gst_rate || 0);
      setGstEnabled(gst > 0);
      setGstRate(gst > 0 ? gst : 18);

      // Discount — stored as percentage rate string
      const disc = parseFloat(editQuotation.discount_rate || 0);
      setDiscountType('Percentage');
      setDiscountValue(disc);

      // Client & project — passed as full objects from the details page
      if (editQuotation._clientObj)  setSelectedClient(editQuotation._clientObj);
      if (editQuotation._projectObj) setSelectedProject(editQuotation._projectObj);

      // Company — restore from existing quotation or default to Constructive India
      const editCompany = COMPANIES.find(c => c.id === (editQuotation.company || 1)) || COMPANIES[0];
      setSelectedCompany(editCompany);

      // Rebuild sections from flat items array
      if (editQuotation.items?.length) {
        const COMPLIANCE_CATEGORY_NAMES = {
          1: 'Construction Certificate',
          2: 'Occupational Certificate',
          3: 'Water Main',
          4: 'STP',
        };
        const grouped = {};
        editQuotation.items.forEach(item => {
          const catId = item.compliance_category ?? 0;
          if (!grouped[catId]) {
            grouped[catId] = {
              category_id:   catId,
              category_name: COMPLIANCE_CATEGORY_NAMES[catId] || `Category ${catId}`,
              items: [],
            };
          }
          grouped[catId].items.push({
            compliance_name:      item.description || '',
            compliance_id:        item.compliance_id || null,
            sub_compliance_id:    item.sub_compliance_category || null,
            quantity:             item.quantity || 1,
            miscellaneous_amount: item.miscellaneous_amount === '--' ? '' : (item.miscellaneous_amount || ''),
            Professional_amount:  parseFloat(item.Professional_amount || 0),
            unit:                 (item.unit && item.unit !== 'N/A') ? item.unit : '',
            total_amount:         parseFloat(item.total_amount || 0),
            // Execution fields — present for execution items, 0 for regulatory
            material_rate:        parseFloat(item.material_rate  || 0),
            material_amount:      parseFloat(item.material_amount || 0),
            labour_rate:          parseFloat(item.labour_rate    || 0),
            labour_amount:        parseFloat(item.labour_amount  || 0),
            item_sac_code:        item.sac_code || item.item_sac_code || '',
            // Keep original item id so update API can match it
            _itemId:              item.id || null,
            // Category id needed by calcItemTotal when activeCategoryId is null
            _categoryId:          catId,
          });
        });
        setSections(Object.values(grouped));
      }
      return; // skip draft restore in edit mode
    }

    // ── Normal create mode: restore draft if available ─────────────────────
    const draft = loadDraft();
    if (draft) {
      if (draft.sections?.length) {
        // Ensure every item has _categoryId stamped (may be missing in older drafts)
        const stampedSections = draft.sections.map(s => ({
          ...s,
          items: (s.items || []).map(item => ({ ...item, _categoryId: item._categoryId ?? s.category_id })),
        }));
        setSections(stampedSections);
      }
      if (draft.selectedClient)        setSelectedClient(draft.selectedClient);
      if (draft.selectedProject)       setSelectedProject(draft.selectedProject);
      if (draft.sacCode)               setSacCode(draft.sacCode);
      if (draft.quotationNumber)       setQuotationNumber(draft.quotationNumber);
      if (draft.gstEnabled !== undefined) setGstEnabled(draft.gstEnabled);
      if (draft.gstRate !== undefined)    setGstRate(draft.gstRate);
      if (draft.discountType)          setDiscountType(draft.discountType);
      if (draft.discountValue !== undefined) setDiscountValue(draft.discountValue);
      if (draft.selectedCompany)        setSelectedCompany(draft.selectedCompany);
    } else {
      generateQuotationNumber();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── GST is only applicable for Company ID 1 (Constructive India) ────────────
  // When the user switches to any other company, automatically disable GST.
  // When switching back to Constructive India, re-enable it.
  useEffect(() => {
    if (selectedCompany?.id !== 1) {
      setGstEnabled(false);
    } else {
      setGstEnabled(true);
    }
  }, [selectedCompany?.id]);

  // Auto-save draft whenever key state changes
  useEffect(() => {
    saveDraft({
      sections,
      selectedClient,
      selectedProject,
      selectedCompany,
      sacCode,
      quotationNumber,
      gstEnabled,
      gstRate,
      discountType,
      discountValue,
    });
  }, [sections, selectedClient, selectedProject, selectedCompany, sacCode, quotationNumber, gstEnabled, gstRate, discountType, discountValue]);

  const generateQuotationNumber = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 8999);
    // PostgreSQL INTEGER max = 2,147,483,647
    // MMDDRRRR = 8 digits max (e.g. 03031234 = 3,031,234) — always safe
    const quotationNum = Number(`${month}${day}${random}`);
    setQuotationNumber(quotationNum.toString());
  };

  // ── Per-category helpers ──────────────────────────────────────────────────
  // Regulatory fields: Professional_amount, miscellaneous_amount
  // Execution fields:  material_rate, material_amount, labour_rate, labour_amount, unit, sac_code
  const BLANK_ITEM_FORM = {
    compliance_name: '', compliance_id: null, sub_compliance_id: null, quantity: 1,
    miscellaneous_amount: '', Professional_amount: 0,
    unit: '', item_sac_code: '',
    // execution_rate = the "Rate (Rs.) per unit" field — stored in Professional_amount for execution
    // material_rate/material_amount/labour_rate/labour_amount are INDEPENDENT optional breakdown fields
    material_rate: 0, material_amount: 0,
    labour_rate: 0, labour_amount: 0,
  };

  const getActiveItemForm = () => itemFormMap[activeCategoryId] || { ...BLANK_ITEM_FORM };
  const setActiveItemForm = (updater) => {
    setItemFormMap(prev => {
      const current = prev[activeCategoryId] || { ...BLANK_ITEM_FORM };
      const next = typeof updater === 'function' ? updater(current) : updater;
      return { ...prev, [activeCategoryId]: next };
    });
  };

  const getActiveItems = () => (categoryItemsMap[activeCategoryId]?.items || []);
  const getActiveEditingIndex = () => editingItemIndexMap[activeCategoryId] ?? null;

  const setActiveItems = (updater) => {
    setCategoryItemsMap(prev => {
      const current = prev[activeCategoryId] || { items: [], category_name: COMPLIANCE_CATEGORIES[activeCategoryId]?.shortName || '' };
      const nextItems = typeof updater === 'function' ? updater(current.items) : updater;
      return { ...prev, [activeCategoryId]: { ...current, items: nextItems } };
    });
  };

  const setActiveEditingIndex = (idx) => {
    setEditingItemIndexMap(prev => ({ ...prev, [activeCategoryId]: idx }));
  };

  // ── Description uniqueness helpers ────────────────────────────────────────
  // Returns the set of description strings already used in a given sub_compliance_id
  // across ALL categories currently in the modal, so duplicates are blocked globally.
  const getUsedDescriptionsForSub = (subComplianceId) => {
    const used = new Set();
    Object.values(categoryItemsMap).forEach(catData => {
      (catData.items || []).forEach(item => {
        if (item.sub_compliance_id === subComplianceId && item.compliance_name) {
          used.add(item.compliance_name);
        }
      });
    });
    return used;
  };

  const fetchClients = async () => {
    try {
      const response = await getClients({ page: 1, page_size: 100 });
      if (response.status === 'success' && response.data) {
        setClients(response.data.results || []);
      }
    } catch (err) {
      logger.error('Failed to fetch clients:', err);
    }
  };

  const fetchClientProjects = async (clientId) => {
    if (!clientId) {
      setClientProjects([]);
      return;
    }
    try {
      setProjectsLoading(true);
      setClientProjects([]);
      const response = await getClientProjects(clientId);
      if (response.status === 'success' && response.data) {
        setClientProjects(response.data.results || []);
      } else {
        setClientProjects([]);
      }
    } catch (err) {
      logger.error('Failed to fetch client projects:', err);
      setClientProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchComplianceByCategory = async (categoryId) => {
    setCategoryComplianceLoading(true);
    try {
      const response = await getComplianceByCategory(categoryId);
      
      if (response?.status === 'success' && response?.data) {
        const compliances = Array.isArray(response.data) ? response.data : [response.data];
        const transformed = compliances.map(c => ({
          id: c.id,
          name: c.name || c.compliance_name || '',
          compliance_name: c.name || c.compliance_name || '',
          category: c.category || categoryId
        }));
        setCategoryCompliance(transformed);
      } else {
        setCategoryCompliance([]);
      }
    } catch (err) {
      logger.error('Failed to fetch compliance:', err);
      setCategoryCompliance([]);
    } finally {
      setCategoryComplianceLoading(false);
    }
  };

  // Fetch compliance descriptions based on category + sub_category
  // Results are cached in descriptionsCacheRef so switching tabs doesn't re-fetch
  const fetchComplianceDescriptions = async (categoryId, subCategoryId) => {
    if (!categoryId) return;
    const cacheKey = `${categoryId}_${subCategoryId ?? 'none'}`;
    if (descriptionsCacheRef.current[cacheKey]) {
      const cached = descriptionsCacheRef.current[cacheKey];
      setComplianceDescriptions(cached);
      setDescriptionMode(cached.length > 0 ? 'dropdown' : 'manual');
      return;
    }
    setComplianceDescLoading(true);
    setComplianceDescriptions([]);
    setDescriptionMode("dropdown");
    try {
      const params = { category: categoryId, page_size: 100 };
      if (subCategoryId) params.sub_category = subCategoryId;
      const response = await api.get("/compliance/get_compliance_by_category/", { params });
      if (response?.data?.status === "success" && response?.data?.data?.results) {
        const results = response.data.data.results;
        descriptionsCacheRef.current[cacheKey] = results;
        setComplianceDescriptions(results);
        setDescriptionMode(results.length > 0 ? 'dropdown' : 'manual');
      } else {
        descriptionsCacheRef.current[cacheKey] = [];
        setComplianceDescriptions([]);
        setDescriptionMode("manual");
      }
    } catch {
      descriptionsCacheRef.current[cacheKey] = [];
      setComplianceDescriptions([]);
      setDescriptionMode("manual");
    } finally {
      setComplianceDescLoading(false);
    }
  };

  // Close Dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.client-dropdown')) {
        setShowClientDropdown(false);
      }
      if (!e.target.closest('.project-dropdown')) {
        setShowProjectDropdown(false);
      }
      if (!e.target.closest('.section-dropdown')) {
        setShowSectionDropdown(false);
      }
      if (!e.target.closest('.company-dropdown')) {
        setShowCompanyDropdown(false);
      }
      if (!e.target.closest('.description-dropdown')) {
        setShowDescriptionDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modal Scroll Lock
  useEffect(() => {
    if (showAddSection) {
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
  }, [showAddSection]);

  // ============================================================================
  // CALCULATION FUNCTIONS
  // ============================================================================

  /**
   * Determine whether miscellaneous_amount is a pure numeric charge.
   *   Pure number  (e.g. "500", "1500.50", 500)  -> true  -> included in totals
   *   Any text     (e.g. "Govt fees + stamp duty") -> false -> shown as label, not calculated
   */
  const isMiscNumeric = (value) => {
    if (value === '' || value === null || value === undefined) return false;
    const str = String(value).trim();
    if (str === '') return false;
    return !isNaN(str) && !isNaN(parseFloat(str));
  };

  /**
   * Calculate the total for a single item.
   * Formula: (Professional_amount + miscellaneous_amount) x quantity
   * Misc is only added to the numeric total when it is a pure number.
   * When misc is descriptive text it is excluded from calculation and
   * displayed as a note alongside the item total.
   * Single source of truth — never use stored item.total_amount for math.
   */
  /**
   * Calculate item total. Works for both quotation types:
   *   Regulatory: (Professional_amount + miscellaneous_amount) × qty
   *   Execution:  material_amount + labour_amount (qty already baked into these)
   */
  const calcItemTotal = (item, categoryId) => {
    const qty = parseInt(item.quantity, 10) || 1;
    // Resolve the category: prefer explicit categoryId arg, then item._categoryId, then activeCategoryId
    const resolvedCatId = categoryId ?? item._categoryId ?? activeCategoryId;
    const isExecItem = (parseFloat(item.material_rate) > 0) || (parseFloat(item.labour_rate) > 0)
                    || (parseFloat(item.material_amount) > 0) || (parseFloat(item.labour_amount) > 0)
                    || (EXECUTION_CATS.includes(resolvedCatId) && parseFloat(item.Professional_amount) > 0);
    if (isExecItem) {
      const matAmt = parseFloat(item.material_amount) || 0;
      const labAmt = parseFloat(item.labour_amount)   || 0;
      const matRate = parseFloat(item.material_rate) || 0;
      const labRate = parseFloat(item.labour_rate)   || 0;
      // If material/labour breakdown is provided, use that; else use Professional_amount (Rate field) × qty
      if (matAmt > 0 || labAmt > 0) {
        return Math.round((matAmt + labAmt) * 100) / 100;
      }
      if (matRate > 0 || labRate > 0) {
        return Math.round(((matRate + labRate) * qty) * 100) / 100;
      }
      // Rate field (Professional_amount) × qty
      const profRate = parseFloat(item.Professional_amount) || 0;
      return Math.round((profRate * qty) * 100) / 100;
    }
    // Regulatory
    const prof = parseFloat(item.Professional_amount) || 0;
    const misc = isMiscNumeric(item.miscellaneous_amount) ? parseFloat(item.miscellaneous_amount) : 0;
    return Math.round((prof + misc) * qty * 100) / 100;
  };

  /**
   * Sum of all item totals across all sections.
   * Uses live calcItemTotal — NOT the stored item.total_amount — to ensure
   * edits are always reflected correctly.
   */
  const calculateSubTotal = () => {
    return sections.reduce((total, section) => {
      return total + section.items.reduce((sectionTotal, item) => {
        return sectionTotal + calcItemTotal(item, section.category_id);
      }, 0);
    }, 0);
  };

  /**
   * Calculate discount amount.
   * Supports Percentage or Fixed (flat) discount types.
   */
  const calculateDiscount = () => {
    const subTotal = calculateSubTotal();
    if (discountType === 'Percentage') {
      return Math.round(((subTotal * parseFloat(discountValue || 0)) / 100) * 100) / 100;
    }
    return Math.round(parseFloat(discountValue || 0) * 100) / 100;
  };

  /**
   * Calculate GST on (SubTotal - Discount).
   * Returns 0 if GST is disabled OR if the selected company is not Constructive India (ID 1).
   */
  const calculateGST = () => {
    if (!gstEnabled || selectedCompany?.id !== 1) return 0;
    const subTotal  = calculateSubTotal();
    const discount  = calculateDiscount();
    const taxable   = subTotal - discount;
    return Math.round(((taxable * parseFloat(gstRate || 0)) / 100) * 100) / 100;
  };

  /**
   * Final grand total: SubTotal - Discount + GST.
   * Rounded to 2 decimal places to avoid floating-point drift.
   */
  const calculateGrandTotal = () => {
    const subTotal = calculateSubTotal();
    const discount = calculateDiscount();
    const gst      = calculateGST();
    return Math.round((subTotal - discount + gst) * 100) / 100;
  };

  // ============================================================================
  // SECTION HANDLERS
  // ============================================================================

  const handleSelectCategoryType = (type) => {
    // 'regulatory_permissions' is the merged dropdown option (cats 1-4).
    // 'architecture' is cat 8 — single category, manual description, no sub-compliance.
    const resolvedType = type;
    setSelectedCategoryType(resolvedType);
    
    const categoryIds = COMPLIANCE_GROUPS[resolvedType] || [];
    const firstCategoryId = categoryIds[0];

    // Initialize an empty items bucket for each category in this group
    setCategoryItemsMap(prev => {
      const next = { ...prev };
      categoryIds.forEach(id => {
        if (!next[id]) {
          next[id] = { items: [], category_name: COMPLIANCE_CATEGORIES[id].shortName };
        }
      });
      return next;
    });

    setActiveCategoryId(firstCategoryId);

    // Reset item forms and editing indexes for all categories in group
    setItemFormMap(prev => {
      const next = { ...prev };
      categoryIds.forEach(id => { next[id] = { ...BLANK_ITEM_FORM }; });
      return next;
    });
    setEditingItemIndexMap(prev => {
      const next = { ...prev };
      categoryIds.forEach(id => { next[id] = null; });
      return next;
    });

    // Reset description state
    setComplianceDescriptions([]);
    // Architecture always uses manual entry — no preset descriptions
    setDescriptionMode(type === 'architecture' ? 'manual' : 'dropdown');
    setDescriptionSearch('');
    setShowDescriptionDropdown(false);
    setDescSelectedFromDropdown(false);

    // Architecture: no API fetch needed (all manual). Others fetch as before.
    if (type !== 'architecture') {
      fetchComplianceByCategory(firstCategoryId);
      if (resolvedType === 'execution' || (resolvedType === 'regulatory_permissions' && ![1,2].includes(firstCategoryId))) {
        fetchComplianceDescriptions(firstCategoryId, null);
      }
    }
    
    setShowSectionDropdown(false);
    setShowAddSection(true);
  };

  const isSectionTypeDisabled = (type) => {
    if (sections.length === 0) return false;
    const hasExecution    = sections.some(s => EXECUTION_CATS.includes(s.category_id));
    const hasRegulatory   = sections.some(s => REGULATORY_CATS.includes(s.category_id));
    const hasArchitecture = sections.some(s => ARCHITECTURE_CATS.includes(s.category_id));
    if (type === 'execution') return hasRegulatory || hasArchitecture;
    if (type === 'architecture') return hasExecution;
    // 'regulatory_permissions' can coexist with architecture but not execution
    return hasExecution;
  };

  const getSectionTypeDisabledReason = (type) => {
    if (type === 'execution') return 'Cannot mix Execution with Regulatory/Architecture quotations';
    if (type === 'architecture') return 'Cannot mix Architecture with Execution quotations';
    return 'Cannot mix Regulatory with Execution quotations';
  };

  const handleAddItem = () => {
    const itemForm = getActiveItemForm();
    if (!itemForm.compliance_name.trim()) return;
    const isExec = EXECUTION_CATS.includes(activeCategoryId);
    const isArch = ARCHITECTURE_CATS.includes(activeCategoryId);

    const newItem = {
      compliance_name:      itemForm.compliance_name.trim(),
      compliance_id:        itemForm.compliance_id || null,
      // Architecture: sub_compliance_id always null
      sub_compliance_id:    isArch ? null : (itemForm.sub_compliance_id || null),
      quantity:             parseInt(itemForm.quantity, 10) || 1,
      total_amount:         calcItemTotal(itemForm, activeCategoryId),
      _categoryId:          activeCategoryId,
      // Regulatory fields
      ...(isExec ? {} : {
        unit:                 String(itemForm.unit || '').trim(),
        miscellaneous_amount: String(itemForm.miscellaneous_amount ?? '').trim(),
        Professional_amount:  parseFloat(itemForm.Professional_amount) || 0,
      }),
      // Execution fields
      ...(isExec ? {
        unit:            String(itemForm.unit || '').trim(),
        item_sac_code:   String(itemForm.item_sac_code || '').trim(),
        Professional_amount: parseFloat(itemForm.Professional_amount) || 0,  // Rate field
        material_rate:   parseFloat(itemForm.material_rate)   || 0,
        material_amount: parseFloat(itemForm.material_amount) || 0,
        labour_rate:     parseFloat(itemForm.labour_rate)     || 0,
        labour_amount:   parseFloat(itemForm.labour_amount)   || 0,
      } : {}),
    };

    const editingIndex = getActiveEditingIndex();
    if (editingIndex !== null) {
      setActiveItems(prev => prev.map((item, i) => i === editingIndex ? newItem : item));
      setActiveEditingIndex(null);
    } else {
      setActiveItems(prev => [...prev, newItem]);
    }

    // Preserve sub_compliance_id so user can keep adding under same sub-category
    setActiveItemForm(prev => ({
      ...BLANK_ITEM_FORM,
      sub_compliance_id: prev.sub_compliance_id,
    }));
    setDescriptionSearch('');
    setShowDescriptionDropdown(false);
    setDescSelectedFromDropdown(false);
  };

  const handleEditItem = (index) => {
    const items = getActiveItems();
    const item = items[index];
    setActiveItemForm({
      compliance_name:      item.compliance_name,
      compliance_id:        item.compliance_id || null,
      sub_compliance_id:    item.sub_compliance_id || null,
      quantity:             item.quantity || 1,
      miscellaneous_amount: item.miscellaneous_amount || '',
      Professional_amount:  item.Professional_amount  || 0,
      unit:            item.unit            || '',
      item_sac_code:   item.item_sac_code   || '',
      material_rate:   item.material_rate   || 0,
      material_amount: item.material_amount || 0,
      labour_rate:     item.labour_rate     || 0,
      labour_amount:   item.labour_amount   || 0,
    });
    setActiveEditingIndex(index);
    setDescSelectedFromDropdown(true);
    // Re-fetch descriptions for this item's sub-category
    if (item.sub_compliance_id) {
      fetchComplianceDescriptions(activeCategoryId, item.sub_compliance_id);
    } else if (EXECUTION_CATS.includes(activeCategoryId) || [3, 4].includes(activeCategoryId)) {
      fetchComplianceDescriptions(activeCategoryId, null);
    }
  };

  const handleRemoveItem = (index) => {
    const editingIndex = getActiveEditingIndex();
    if (editingIndex === index) {
      setActiveEditingIndex(null);
      setActiveItemForm(prev => ({ ...BLANK_ITEM_FORM, sub_compliance_id: prev.sub_compliance_id }));
    }
    setActiveItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddSection = () => {
    const totalItems = Object.values(categoryItemsMap).reduce((sum, cat) => sum + (cat.items?.length || 0), 0);
    if (totalItems === 0) return;

    if (editingSection !== null) {
      // Edit mode — merge ALL categories that have items back into sections array.
      // The user may have added items to sibling tabs (e.g. Occupational while editing Construction).
      setSections(prev => {
        let next = [...prev];
        Object.entries(categoryItemsMap).forEach(([catIdStr, catData]) => {
          const catId = parseInt(catIdStr, 10);
          const items = catData.items || [];
          const existingIdx = next.findIndex(s => s.category_id === catId);
          if (items.length > 0) {
            if (existingIdx !== -1) {
              next[existingIdx] = { ...next[existingIdx], items };
            } else {
              next = [...next, {
                category_id:   catId,
                category_name: COMPLIANCE_CATEGORIES[catId]?.shortName || catData.category_name || `Category ${catId}`,
                items,
              }];
            }
          } else if (existingIdx !== -1 && existingIdx === editingSection) {
            // The originally-edited section was cleared — remove it
            next = next.filter((_, i) => i !== existingIdx);
          }
        });
        return next;
      });
    } else {
      // New compliance — iterate ALL categories in the map and merge into sections
      setSections(prev => {
        let next = [...prev];
        Object.entries(categoryItemsMap).forEach(([catIdStr, catData]) => {
          const catId = parseInt(catIdStr, 10);
          const newItems = catData.items || [];
          if (newItems.length === 0) return;

          const existingIndex = next.findIndex(s => s.category_id === catId);
          if (existingIndex !== -1) {
            next[existingIndex] = {
              ...next[existingIndex],
              items: [...next[existingIndex].items, ...newItems],
            };
          } else {
            next = [...next, {
              category_id:   catId,
              category_name: COMPLIANCE_CATEGORIES[catId]?.shortName || catData.category_name || `Category ${catId}`,
              items:         newItems,
            }];
          }
        });
        return next;
      });
    }

    // Reset all modal state
    setShowAddSection(false);
    setSectionForm({ category_id: null, category_name: '', items: [] });
    setCategoryItemsMap({});
    setActiveCategoryId(null);
    setItemFormMap({});
    setEditingItemIndexMap({});
    setEditingSection(null);
    setCategoryCompliance([]);
    setComplianceDescriptions([]);
    setDescriptionMode('dropdown');
    setDescriptionSearch('');
    setShowDescriptionDropdown(false);
    setSelectedCategoryType(null);
    setDescSelectedFromDropdown(false);
  };

  const handleEditSection = (index) => {
    const section = sections[index];
    setEditingSection(index);
    setSectionForm({ ...section });

    const categoryId = section.category_id;
    const isExecCat  = EXECUTION_CATS.includes(categoryId);
    const isArchCat  = ARCHITECTURE_CATS.includes(categoryId);

    // For regulatory edit: seed ALL 4 cat slots so tabs 1-4 all appear.
    // Only the current section's category gets the real items; others get empty.
    if (isArchCat) {
      // Architecture — single tab, seed only cat 8
      const archCatMap = {
        8: { items: [...section.items], category_name: section.category_name },
      };
      setCategoryItemsMap(archCatMap);
      setItemFormMap({ 8: { ...BLANK_ITEM_FORM } });
      setEditingItemIndexMap({ 8: null });
      setSelectedCategoryType('architecture');
    } else if (!isExecCat) {
      const regCatMap = {};
      REGULATORY_CATS.forEach(cId => {
        regCatMap[cId] = cId === categoryId
          ? { items: [...section.items], category_name: section.category_name }
          : { items: [], category_name: COMPLIANCE_CATEGORIES[cId]?.shortName || '' };
      });
      setCategoryItemsMap(regCatMap);
      const formMap = {};
      REGULATORY_CATS.forEach(cId => { formMap[cId] = { ...BLANK_ITEM_FORM }; });
      setItemFormMap(formMap);
      const editIdxMap = {};
      REGULATORY_CATS.forEach(cId => { editIdxMap[cId] = null; });
      setEditingItemIndexMap(editIdxMap);
      setSelectedCategoryType('regulatory_permissions');
    } else {
      // Execution: only the 3 execution tabs
      const execCatMap = {};
      EXECUTION_CATS.forEach(cId => {
        execCatMap[cId] = cId === categoryId
          ? { items: [...section.items], category_name: section.category_name }
          : { items: [], category_name: COMPLIANCE_CATEGORIES[cId]?.shortName || '' };
      });
      setCategoryItemsMap(execCatMap);
      const formMap = {};
      EXECUTION_CATS.forEach(cId => { formMap[cId] = { ...BLANK_ITEM_FORM }; });
      setItemFormMap(formMap);
      const editIdxMap = {};
      EXECUTION_CATS.forEach(cId => { editIdxMap[cId] = null; });
      setEditingItemIndexMap(editIdxMap);
      setSelectedCategoryType('execution');
    }

    setActiveCategoryId(categoryId);

    // Architecture: no API fetch, manual description mode
    if (!isArchCat) {
      fetchComplianceByCategory(categoryId);
    }

    // Pre-fetch descriptions for cats that don't need sub-category selection
    if (!isArchCat && (isExecCat || [3, 4].includes(categoryId))) {
      fetchComplianceDescriptions(categoryId, null);
    }

    setComplianceDescriptions([]);
    setDescriptionMode(isArchCat ? 'manual' : 'dropdown');
    setDescriptionSearch('');
    setShowDescriptionDropdown(false);
    setDescSelectedFromDropdown(false);

    setShowAddSection(true);
  };

  const handleEditItemFromTable = (sectionIndex, itemIndex) => {
    const section = sections[sectionIndex];
    setEditingSection(sectionIndex);
    setSectionForm({ ...section });

    const categoryId = section.category_id;
    const isExecCat  = EXECUTION_CATS.includes(categoryId);
    const isArchCat  = ARCHITECTURE_CATS.includes(categoryId);

    // Seed all tabs for the group (same logic as handleEditSection)
    if (isArchCat) {
      setCategoryItemsMap({ 8: { items: [...section.items], category_name: section.category_name } });
      setSelectedCategoryType('architecture');
    } else if (!isExecCat) {
      const regCatMap = {};
      REGULATORY_CATS.forEach(cId => {
        regCatMap[cId] = cId === categoryId
          ? { items: [...section.items], category_name: section.category_name }
          : { items: [], category_name: COMPLIANCE_CATEGORIES[cId]?.shortName || '' };
      });
      setCategoryItemsMap(regCatMap);
      setSelectedCategoryType('regulatory_permissions');
    } else {
      const execCatMap = {};
      EXECUTION_CATS.forEach(cId => {
        execCatMap[cId] = cId === categoryId
          ? { items: [...section.items], category_name: section.category_name }
          : { items: [], category_name: COMPLIANCE_CATEGORIES[cId]?.shortName || '' };
      });
      setCategoryItemsMap(execCatMap);
      setSelectedCategoryType('execution');
    }

    setActiveCategoryId(categoryId);
    if (!isArchCat) fetchComplianceByCategory(categoryId);

    // Pre-populate item form with ALL fields (including unit) from the item being edited
    const item = section.items[itemIndex];
    const unitVal = (item.unit && item.unit !== 'N/A') ? item.unit : '';
    const prefillForm = {
      compliance_name:      item.compliance_name || '',
      compliance_id:        item.compliance_id || null,
      sub_compliance_id:    item.sub_compliance_id || null,
      quantity:             item.quantity || 1,
      // Regulatory fields
      miscellaneous_amount: (item.miscellaneous_amount === '--' ? '' : (item.miscellaneous_amount || '')),
      Professional_amount:  parseFloat(item.Professional_amount) || 0,
      unit:                 unitVal,
      // Execution fields
      item_sac_code:   item.item_sac_code || '',
      material_rate:   parseFloat(item.material_rate)   || 0,
      material_amount: parseFloat(item.material_amount) || 0,
      labour_rate:     parseFloat(item.labour_rate)     || 0,
      labour_amount:   parseFloat(item.labour_amount)   || 0,
    };

    // Seed form for current cat; blank for others
    if (isArchCat) {
      setItemFormMap({ 8: prefillForm });
      setEditingItemIndexMap({ 8: itemIndex });
    } else if (!isExecCat) {
      const formMap = {};
      REGULATORY_CATS.forEach(cId => { formMap[cId] = cId === categoryId ? prefillForm : { ...BLANK_ITEM_FORM }; });
      setItemFormMap(formMap);
      const editIdxMap = {};
      REGULATORY_CATS.forEach(cId => { editIdxMap[cId] = cId === categoryId ? itemIndex : null; });
      setEditingItemIndexMap(editIdxMap);
    } else {
      const formMap = {};
      EXECUTION_CATS.forEach(cId => { formMap[cId] = cId === categoryId ? prefillForm : { ...BLANK_ITEM_FORM }; });
      setItemFormMap(formMap);
      const editIdxMap = {};
      EXECUTION_CATS.forEach(cId => { editIdxMap[cId] = cId === categoryId ? itemIndex : null; });
      setEditingItemIndexMap(editIdxMap);
    }

    // Pre-fetch descriptions (architecture = manual, skip)
    if (!isArchCat) {
      if (item.sub_compliance_id) {
        fetchComplianceDescriptions(categoryId, item.sub_compliance_id);
      } else if (isExecCat || [3, 4].includes(categoryId)) {
        fetchComplianceDescriptions(categoryId, null);
      }
    }

    setComplianceDescriptions([]);
    setDescriptionMode(isArchCat ? 'manual' : 'dropdown');
    setDescriptionSearch('');
    setShowDescriptionDropdown(false);
    setDescSelectedFromDropdown(isArchCat ? true : !!item.compliance_name);
    setShowAddSection(true);
  };

  const handleDeleteSection = (index) => {
    setDeleteConfirm({ show: true, type: 'section', sectionIndex: index, itemIndex: null });
  };

  const handleRemoveItemFromSection = (sectionIndex, itemIndex) => {
    setDeleteConfirm({ show: true, type: 'item', sectionIndex, itemIndex });
  };

  const confirmDelete = () => {
    if (deleteConfirm.type === 'section') {
      setSections(prev => prev.filter((_, i) => i !== deleteConfirm.sectionIndex));
    } else if (deleteConfirm.type === 'item') {
      setSections(prev => {
        const updated = [...prev];
        updated[deleteConfirm.sectionIndex].items = updated[deleteConfirm.sectionIndex].items.filter((_, i) => i !== deleteConfirm.itemIndex);
        return updated;
      });
    }
    setDeleteConfirm({ show: false, type: null, sectionIndex: null, itemIndex: null });
  };

  const cancelDelete = () => {
    setDeleteConfirm({ show: false, type: null, sectionIndex: null, itemIndex: null });
  };

  const handleCategoryChange = (categoryId) => {
    // Just switch the active tab — items in other categories are preserved
    setActiveCategoryId(categoryId);

    // Ensure this category has a slot in the map
    setCategoryItemsMap(prev => {
      if (prev[categoryId]) return prev;
      return { ...prev, [categoryId]: { items: [], category_name: COMPLIANCE_CATEGORIES[categoryId]?.shortName || '' } };
    });

    // Reset description UI for the new tab
    setComplianceDescriptions([]);
    setDescriptionMode('dropdown');
    setDescriptionSearch('');
    setShowDescriptionDropdown(false);
    setDescSelectedFromDropdown(false);

    // Fetch compliance list for this category
    fetchComplianceByCategory(categoryId);

    // For execution + regulatory-no-sub categories, fetch descriptions immediately
    // Architecture: always manual — never fetch
    if (ARCHITECTURE_CATS.includes(categoryId)) {
      setActiveItemForm({ ...BLANK_ITEM_FORM });
      setDescriptionMode('manual');
    } else if (EXECUTION_CATS.includes(categoryId) || [3, 4].includes(categoryId)) {
      setActiveItemForm({ ...BLANK_ITEM_FORM });
      fetchComplianceDescriptions(categoryId, null);
    } else {
      // For certificates, descriptions load when sub-category is picked
      // Restore previously selected sub_compliance_id's descriptions if any
      const existingForm = itemFormMap[categoryId];
      if (existingForm?.sub_compliance_id) {
        fetchComplianceDescriptions(categoryId, existingForm.sub_compliance_id);
      }
    }
  };

  // ============================================================================
  // FORM SUBMISSION
  // ============================================================================

      const handleSubmit = async () => {
    if (!selectedClient) {
      setError('Please select a client');
      return;
    }
    if (!selectedProject) {
      setError('Please select a project');
      return;
    }
    if (sections.length === 0) {
      setError('Please add at least one compliance section');
      return;
    }
    if (!selectedCompany) {
      setError('Please select a company');
      return;
    }

    // Detect quotation type BEFORE validating SAC code.
    // For Regulatory + Architecture quotations the header SAC code is REQUIRED.
    // For Execution quotations the SAC code is entered per-item (item_sac_code).
    //   - If at least one item has its own SAC code the header field stays optional.
    //   - If NO item has a SAC code (user skipped all of them) the header SAC
    //     becomes required as a fallback so the backend always receives a value.
    const _isExecutionSubmit = sections.some(s => EXECUTION_CATS.includes(s.category_id));
    if (_isExecutionSubmit) {
      const anyItemHasSac = sections
        .filter(s => EXECUTION_CATS.includes(s.category_id))
        .some(s => s.items.some(item => String(item.item_sac_code || '').trim() !== ''));
      if (!anyItemHasSac && !sacCode.trim()) {
        setError('Please enter a SAC Code — either in the header field above or on each item when adding compliance.');
        return;
      }
    } else if (!sacCode.trim()) {
      setError('Please enter a SAC code');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // ========== DETECT QUOTATION TYPE ==========
      const isExecutionType = _isExecutionSubmit;

      // ========== BUILD ITEMS ARRAY ==========
      const allItems = sections.flatMap(section =>
        section.items.map((item) => {
          const description = String(item.compliance_name || '').trim();
          const quantity = parseInt(item.quantity, 10);
          const compliance_category = section.category_id;
          const isExec = EXECUTION_CATS.includes(compliance_category);
          const isArch = ARCHITECTURE_CATS.includes(compliance_category);
          // Sub-compliance only relevant for categories 1,2,5,6,7; architecture always 0
          const hasSub = [1, 2, 5, 6, 7].includes(compliance_category);
          const sub_compliance_category = (hasSub && !isArch)
            ? (item.sub_compliance_id ? parseInt(item.sub_compliance_id) : 0)
            : 0;

          if (!description) throw new Error('Item description cannot be empty');
          if (isNaN(quantity) || quantity <= 0) throw new Error(`Invalid quantity for item: ${description}`);

          const base = {
            ...(isEditMode && item._itemId ? { id: item._itemId } : {}),
            description,
            quantity,
            compliance_category: parseInt(compliance_category),
            sub_compliance_category,
          };

          if (isExec) {
            const profRate = parseFloat(item.Professional_amount) || 0;  // Rate field
            const matRate  = parseFloat(item.material_rate) || 0;
            const labRate  = parseFloat(item.labour_rate)   || 0;
            const matAmt   = parseFloat(item.material_amount) || 0;
            const labAmt   = parseFloat(item.labour_amount)   || 0;
            // Total: use mat+lab if provided, else profRate × qty
            const execTotal = (matAmt || labAmt)
              ? parseFloat((matAmt + labAmt).toFixed(2))
              : parseFloat((profRate * quantity).toFixed(2));
            if (profRate <= 0 && matAmt <= 0 && labAmt <= 0 && matRate <= 0 && labRate <= 0) {
              throw new Error(`Rate must be > 0 for: ${description}`);
            }
            return {
              ...base,
              // Empty unit → null so the detail page shows "—" instead of "N/A"
              unit:            String(item.unit || '').trim() || null,
              sac_code:        String(item.item_sac_code || '').trim() || null,
              Professional_amount: profRate.toFixed(2),
              material_rate:   parseFloat(matRate.toFixed(2)),
              material_amount: parseFloat(matAmt.toFixed(2)),
              labour_rate:     parseFloat(labRate.toFixed(2)),
              labour_amount:   parseFloat(labAmt.toFixed(2)),
              total_amount:    execTotal,
            };
          } else {
            // Regulatory + Architecture — both use Professional_amount + consultancy_charges style
            const Professional_amount = parseFloat(item.Professional_amount) || 0;
            if (Professional_amount <= 0) throw new Error(`Professional amount must be > 0 for: ${description}`);
            const rawMisc = String(item.miscellaneous_amount ?? '').trim();
            const miscNumericValue = isMiscNumeric(rawMisc) ? parseFloat(rawMisc) : 0;
            const item_total = parseFloat(((Professional_amount + miscNumericValue) * quantity).toFixed(2));
            return {
              ...base,
              // Empty unit → null so the detail page shows "—" instead of "N/A"
              unit:                    String(item.unit || '').trim() || null,
              // Backend field renamed: miscellaneous_amount → consultancy_charges
              consultancy_charges:     rawMisc || '0.00',
              Professional_amount:     Professional_amount.toFixed(2),
              total_amount:            parseFloat(item_total.toFixed(2)),
            };
          }
        })
      );

      // ========== CALCULATE TOTALS ==========
      const subTotal  = calculateSubTotal();
      const gstAmt    = calculateGST();
      const grandTotal = calculateGrandTotal();

      let discountRateStr = '0';
      if (parseFloat(discountValue) > 0) {
        if (discountType === 'Percentage') {
          discountRateStr = String(parseFloat(discountValue).toFixed(2));
        } else {
          if (subTotal > 0) {
            discountRateStr = ((parseFloat(discountValue) / subTotal) * 100).toFixed(2);
          }
        }
      }

      const clientId  = Number(selectedClient.id);
      const projectId = Number(selectedProject.id);

      if (isNaN(clientId)  || clientId  <= 0) throw new Error('Invalid client ID');
      if (isNaN(projectId) || projectId <= 0) throw new Error('Invalid project ID');

      // ========== EDIT MODE: UPDATE ==========
      if (isEditMode) {
        // Pass quotation_type so updateQuotationFull routes to the correct endpoint.
        // For execution edits we derive it from the sections; for regulatory we
        // preserve the original quotation_type from editQuotation.
        const editQuotationType = isExecutionType
          ? 'Execution'
          : sections.some(s => ARCHITECTURE_CATS.includes(s.category_id))
            ? 'Architecture'
            : (editQuotation.quotation_type || 'Regulatory');

        const updatePayload = {
          id:               parseInt(editQuotation.id),
          company:          selectedCompany?.id || editQuotation.company || 1,
          client:           clientId,
          vendor:           editQuotation.vendor ? parseInt(editQuotation.vendor) : null,
          project:          projectId,
          gst_rate:         String(gstEnabled ? (parseFloat(gstRate) || 0).toFixed(2) : '0'),
          discount_rate:    discountRateStr,
          sac_code:         sacCode.trim(),
          quotation_type:   editQuotationType,
          // FIX: backend expects string for these DecimalFields
          total_amount:     subTotal.toFixed(2),
          total_gst_amount: gstAmt.toFixed(2),
          grand_total:      grandTotal.toFixed(2),
          items:            allItems,
        };

        logger.log('📤 UPDATE PAYLOAD:', JSON.stringify(updatePayload, null, 2));

        const response = await updateQuotationFull(updatePayload);

        if (response.status === 'success' || response.data?.status === 'success' || response.id) {
          const updated = response.data || response;
          setCreatedQuotation({
            id:               updated.id || editQuotation.id,
            quotation_number: updated.quotation_number || editQuotation.quotation_number,
          });
          setShowSuccessModal(true);
        } else {
          setError(response.message || response.data?.message || 'Failed to update quotation');
        }
        return;
      }

      // ========== CREATE MODE ==========
      const quotationData = {
        company:           selectedCompany.id,
        client:            parseInt(clientId),
        vendor:            null,
        project:           parseInt(projectId),
        gst_rate:          String(gstEnabled ? (parseFloat(gstRate) || 0).toFixed(2) : '0'),
        discount_rate:     discountRateStr,
        sac_code:          sacCode.trim(),
        total_amount:      subTotal.toFixed(2),
        total_gst_amount:  gstAmt.toFixed(2),
        grand_total:       grandTotal.toFixed(2),
        items:             allItems,
      };

      logger.log('📤 CREATE PAYLOAD:', JSON.stringify(quotationData, null, 2));

      // Route to the correct API based on compliance category type
      const response = isExecutionType
        ? await createExecutionQuotation(quotationData)
        : await createRegulatoryQuotation(quotationData);

      if (response.status === 'success' || response.data?.status === 'success') {
        setCreatedQuotation(response.data || response);
        clearDraft();
        setShowSuccessModal(true);
      } else {
        setError(response.message || response.data?.message || 'Failed to create quotation');
      }
    } catch (err) {
      console.error('❌ SUBMIT ERROR:', err.message);
      // Parse backend validation errors into readable messages
      let friendlyMsg = err.message || (isEditMode ? 'Failed to update quotation' : 'Failed to create quotation');
      try {
        const parsed = typeof err.response?.data === 'object' ? err.response.data : JSON.parse(err.message);
        const errs = parsed?.errors || parsed;
        if (typeof errs === 'object') {
          const FIELD_LABELS = {
            company: 'Company',
            client: 'Client',
            project: 'Project',
            sac_code: 'SAC Code',
            gst_rate: 'GST Rate',
            items: 'Line Items',
            quotation_number: 'Quotation Number',
            non_field_errors: '',
          };
          const msgs = Object.entries(errs).map(([field, msgs]) => {
            const label = FIELD_LABELS[field] || field;
            const msg = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
            return label ? `${label}: ${msg}` : msg;
          });
          if (msgs.length) friendlyMsg = msgs.join(' • ');
        }
      } catch { /* API error parsing is best-effort */ }
      setError(friendlyMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredClients = clients.filter(client => {
    const fullName = `${client.first_name || ''} ${client.last_name || ''}`.toLowerCase();
    const email = (client.email || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || email.includes(search);
  });

  const filteredProjects = clientProjects.filter(project =>
    project.name.toLowerCase().includes(projectSearchTerm.toLowerCase())
  );

  useEffect(() => {
    if (selectedClient?.id) {
      fetchClientProjects(selectedClient.id);
    } else {
      setClientProjects([]);
    }
  }, [selectedClient?.id]);

  // ============================================================================
  // MODAL COMPUTED VARIABLES (avoids IIFE-in-JSX parse errors)
  // ============================================================================

  // Derived: is the current quotation Execution type? (based on sections already added)
  // Also checks the modal's active category type so the header updates as soon as
  // the user opens the Execution modal — even before they hit "Add Compliance".
  const isExecutionType = sections.some(s => EXECUTION_CATS.includes(s.category_id))
    || selectedCategoryType === 'execution';

  // Is architecture mode active?
  const isArchitectureType = sections.some(s => ARCHITECTURE_CATS.includes(s.category_id))
    || selectedCategoryType === 'architecture';

  const isEditSectionMode = editingSection !== null;

  const modalItemForm = isEditSectionMode
    ? (itemFormMap[activeCategoryId] || BLANK_ITEM_FORM)
    : getActiveItemForm();

  const modalEditingItemIndex = isEditSectionMode
    ? (editingItemIndexMap[activeCategoryId] ?? null)
    : getActiveEditingIndex();

  const modalActiveItems = isEditSectionMode ? (categoryItemsMap[activeCategoryId]?.items || []) : getActiveItems();

  // Used descriptions for uniqueness enforcement
  const modalUsedDescriptions = (() => {
    const used = new Set();
    modalActiveItems.forEach((item, i) => {
      if (i === modalEditingItemIndex) return;
      if (item.sub_compliance_id === modalItemForm.sub_compliance_id && item.compliance_name) {
        used.add(item.compliance_name);
      }
    });
    if (!isEditSectionMode) {
      const globalUsed = getUsedDescriptionsForSub(modalItemForm.sub_compliance_id);
      globalUsed.forEach(d => used.add(d));
      if (modalEditingItemIndex !== null && modalActiveItems[modalEditingItemIndex]?.compliance_name) {
        used.delete(modalActiveItems[modalEditingItemIndex].compliance_name);
      }
    }
    return used;
  })();

  const modalSetItemForm = isEditSectionMode
    ? (updater) => setItemFormMap(prev => {
        const current = prev[activeCategoryId] || BLANK_ITEM_FORM;
        const next = typeof updater === 'function' ? updater(current) : updater;
        return { ...prev, [activeCategoryId]: next };
      })
    : setActiveItemForm;

  const modalSetEditingIdx = isEditSectionMode
    ? (idx) => setEditingItemIndexMap(prev => ({ ...prev, [activeCategoryId]: idx }))
    : setActiveEditingIndex;

  const modalAddItem = isEditSectionMode
    ? () => {
        const itemForm = modalItemForm;
        if (!itemForm.compliance_name.trim()) return;
        const _isExec = EXECUTION_CATS.includes(activeCategoryId);
        const _isArch = ARCHITECTURE_CATS.includes(activeCategoryId);
        const newItem = {
          compliance_name:      itemForm.compliance_name.trim(),
          compliance_id:        itemForm.compliance_id || null,
          // Architecture: sub_compliance_id is always null (backend gets sub_compliance_category=0)
          sub_compliance_id:    _isArch ? null : (itemForm.sub_compliance_id || null),
          quantity:             parseInt(itemForm.quantity, 10) || 1,
          total_amount:         calcItemTotal(itemForm, activeCategoryId),
          _categoryId:          activeCategoryId,
          ...(_isExec ? {} : {
            unit:                 String(itemForm.unit || '').trim(),
            miscellaneous_amount: String(itemForm.miscellaneous_amount ?? '').trim(),
            Professional_amount:  parseFloat(itemForm.Professional_amount) || 0,
          }),
          ...(_isExec ? {
            unit:                String(itemForm.unit || '').trim(),
            item_sac_code:       String(itemForm.item_sac_code || '').trim(),
            Professional_amount: parseFloat(itemForm.Professional_amount) || 0,
            material_rate:       parseFloat(itemForm.material_rate)   || 0,
            material_amount:     parseFloat(itemForm.material_amount) || 0,
            labour_rate:         parseFloat(itemForm.labour_rate)     || 0,
            labour_amount:       parseFloat(itemForm.labour_amount)   || 0,
          } : {}),
        };
        if (modalEditingItemIndex !== null) {
          setActiveItems(prev => prev.map((it, i) => i === modalEditingItemIndex ? newItem : it));
          modalSetEditingIdx(null);
        } else {
          setActiveItems(prev => [...prev, newItem]);
        }
        modalSetItemForm(prev => ({ ...BLANK_ITEM_FORM, sub_compliance_id: prev.sub_compliance_id }));
        setDescriptionSearch('');
        setShowDescriptionDropdown(false);
        setDescSelectedFromDropdown(false);
      }
    : handleAddItem;

  const modalEditItem = isEditSectionMode
    ? (index) => {
        const item = categoryItemsMap[activeCategoryId]?.items?.[index];
        if (!item) return;
        modalSetItemForm({
          compliance_name:      item.compliance_name,
          compliance_id:        item.compliance_id || null,
          sub_compliance_id:    item.sub_compliance_id || null,
          quantity:             item.quantity || 1,
          miscellaneous_amount: item.miscellaneous_amount || '',
          Professional_amount:  item.Professional_amount  || 0,
          unit:            item.unit            || '',
          item_sac_code:   item.item_sac_code   || '',
          material_rate:   item.material_rate   || 0,
          material_amount: item.material_amount || 0,
          labour_rate:     item.labour_rate     || 0,
          labour_amount:   item.labour_amount   || 0,
        });
        modalSetEditingIdx(index);
        setDescSelectedFromDropdown(true);
        // Architecture = manual, no fetch; others fetch as normal
        if (!ARCHITECTURE_CATS.includes(activeCategoryId)) {
          if (item.sub_compliance_id) {
            fetchComplianceDescriptions(activeCategoryId, item.sub_compliance_id);
          } else if (EXECUTION_CATS.includes(activeCategoryId) || [3, 4].includes(activeCategoryId)) {
            fetchComplianceDescriptions(activeCategoryId, null);
          }
        }
      }
    : handleEditItem;

  const modalRemoveItem = isEditSectionMode
    ? (index) => {
        if (modalEditingItemIndex === index) {
          modalSetEditingIdx(null);
          modalSetItemForm(prev => ({ ...BLANK_ITEM_FORM, sub_compliance_id: prev.sub_compliance_id }));
        }
        setActiveItems(prev => prev.filter((_, i) => i !== index));
      }
    : handleRemoveItem;

  const modalTotalItems = isEditSectionMode
    ? (categoryItemsMap[activeCategoryId]?.items?.length || 0)
    : Object.values(categoryItemsMap).reduce((sum, cat) => sum + (cat.items?.length || 0), 0);

  const modalSaveDisabled = isEditSectionMode
    ? (categoryItemsMap[activeCategoryId]?.items?.length || 0) === 0
    : Object.values(categoryItemsMap).every(cat => (cat.items?.length || 0) === 0);

  const closeModal = () => {
    setShowAddSection(false);
    setSectionForm({ category_id: null, category_name: '', items: [] });
    setCategoryItemsMap({});
    setActiveCategoryId(null);
    setItemFormMap({});
    setEditingItemIndexMap({});
    setEditingSection(null);
    setSelectedCategoryType(null);
    setComplianceDescriptions([]);
    setDescriptionMode('dropdown');
    setDescriptionSearch('');
    setShowDescriptionDropdown(false);
    setDescSelectedFromDropdown(false);
  };

  // ============================================================================
  // RENDER - MAIN RETURN
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto">
        {/* Header Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-3">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                
                {/* COMPANY DROPDOWN */}
                <div className="company-dropdown relative">
                  <button
                    onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                    className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors group"
                  >
                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-base font-semibold text-gray-900">
                          {selectedCompany ? selectedCompany.name : 'Select Company'}
                        </h2>
                        <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                      </div>
                      <p className="text-xs text-gray-500">
                        {selectedCompany ? 'Issuing company' : 'Click to select company'}
                      </p>
                    </div>
                  </button>

                  {showCompanyDropdown && (
                    <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Select Company</p>
                      </div>
                      <div className="py-1">
                        {COMPANIES.map((company) => (
                          <button
                            key={company.id}
                            onClick={() => {
                              setSelectedCompany(company);
                              setShowCompanyDropdown(false);
                            }}
                            className={`w-full px-4 py-2.5 text-left hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-0 flex items-center justify-between ${
                              selectedCompany?.id === company.id ? 'bg-teal-50' : ''
                            }`}
                          >
                            <span className="text-sm font-medium text-gray-900">{company.name}</span>
                            {selectedCompany?.id === company.id && (
                              <div className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="w-px h-10 bg-gray-200" />

                {/* CLIENT DROPDOWN */}
                <div className="client-dropdown relative">
                  <button
                    onClick={() => setShowClientDropdown(!showClientDropdown)}
                    className="flex items-center gap-3 hover:bg-gray-50 rounded-lg px-3 py-2 -ml-3 transition-colors group"
                  >
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h1 className="text-lg font-semibold text-gray-900">
                          {selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : 'Select Client'}
                        </h1>
                        <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                      </div>
                      <p className="text-sm text-gray-500">
                        {selectedClient?.email || 'Click to select a client'}
                      </p>
                    </div>
                  </button>

                  {showClientDropdown && (
                    <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                      <div className="p-3 border-b border-gray-200 bg-gray-50">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search clients..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>

                      <div className="max-h-64 overflow-y-auto">
                        {filteredClients.length > 0 ? (
                          filteredClients.map((client) => (
                            <button
                              key={client.id}
                              onClick={() => {
                                setSelectedClient(client);
                                setSelectedProject(null);
                                setShowClientDropdown(false);
                                setSearchTerm('');
                              }}
                              className={`w-full px-4 py-3 text-left hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-0 ${
                                selectedClient?.id === client.id ? 'bg-teal-50' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <User className="w-4 h-4 text-teal-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 text-sm truncate">
                                    {client.first_name} {client.last_name}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {client.email}
                                  </div>
                                </div>
                                {selectedClient?.id === client.id && (
                                  <div className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-8 text-center text-gray-500 text-sm">
                            <User className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p>No clients found</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* PROJECT DROPDOWN */}
                {selectedClient && (
                  <>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <div className="project-dropdown relative">
                      <button
                        onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                        className="flex items-center gap-3 hover:bg-gray-50 rounded-lg px-3 py-2 -ml-3 transition-colors group"
                      >
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <h2 className="text-base font-semibold text-gray-900">
                              {selectedProject ? selectedProject.name : 'Select Project'}
                            </h2>
                            <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                          </div>
                          <p className="text-xs text-gray-500">
                            {selectedProject 
                              ? [selectedProject.city, selectedProject.state].filter(Boolean).join(', ') || 'No location'
                              : 'Click to select a project'}
                          </p>
                        </div>
                      </button>

                      {showProjectDropdown && (
                        <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                          <div className="p-3 border-b border-gray-200 bg-gray-50">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search projects..."
                                value={projectSearchTerm}
                                onChange={(e) => setProjectSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>

                          <div className="max-h-64 overflow-y-auto">
                            {projectsLoading ? (
                              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                                <Loader2 className="w-6 h-6 text-teal-500 animate-spin mx-auto mb-2" />
                                <p>Loading projects...</p>
                              </div>
                            ) : filteredProjects.length > 0 ? (
                              filteredProjects.map((project) => (
                                <button
                                  key={project.id}
                                  onClick={() => {
                                    setSelectedProject(project);
                                    setShowProjectDropdown(false);
                                    setProjectSearchTerm('');
                                  }}
                                  className={`w-full px-4 py-3 text-left hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-0 ${
                                    selectedProject?.id === project.id ? 'bg-teal-50' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                                      <Building2 className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-gray-900 text-sm truncate">
                                        {project.name}
                                      </div>
                                      <div className="text-xs text-gray-500 truncate">
                                        {[project.city, project.state].filter(Boolean).join(', ') || 'No location'}
                                      </div>
                                    </div>
                                    {selectedProject?.id === project.id && (
                                      <div className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                                <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p>{projectSearchTerm ? 'No projects match your search' : 'No projects found for this client'}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end">
                    <label className="text-xs font-medium text-gray-600 whitespace-nowrap">
                      SAC Code{isExecutionType ? (
                        <span className="ml-1 text-gray-400 font-normal">(fallback)</span>
                      ) : (
                        <span className="text-red-500"> *</span>
                      )}
                    </label>
                    {isExecutionType && (
                      <span className="text-[10px] text-gray-400 leading-tight whitespace-nowrap">Required if not set per-item</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={sacCode}
                    onChange={(e) => setSacCode(e.target.value)}
                    placeholder="e.g. 998313"
                    title={isExecutionType
                      ? 'Optional when SAC code is entered on each item. Required if no items have a SAC code.'
                      : 'SAC code is required for Regulatory quotations'}
                    className={`w-28 px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors bg-white ${
                      isExecutionType ? 'border-gray-200 placeholder-gray-300' : 'border-gray-300'
                    }`}
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || sections.length === 0 || !selectedClient || !selectedProject || !selectedCompany}
                  className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />{isEditMode ? 'Updating...' : 'Generating...'}</>
                  ) : (
                    <><FileText className="w-4 h-4" />{isEditMode ? 'Update Quotation' : 'Generate Quotation'}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Mode Banner */}
        {isEditMode && (
          <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Edit className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Editing Quotation</p>
              <p className="text-xs text-amber-600 mt-0.5">
                You are updating an existing quotation. All changes will overwrite the current data.
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Service Quotation Builder</h2>
                </div>
                
                <div className="section-dropdown relative">
                  <button 
                    onClick={() => setShowSectionDropdown(!showSectionDropdown)}
                    className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Compliance
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  
                  {showSectionDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      {/* ── Regulatory Permissions: cats 1–4 (merged) ── */}
                      <button
                        onClick={() => !isSectionTypeDisabled('regulatory_permissions') && handleSelectCategoryType('regulatory_permissions')}
                        disabled={isSectionTypeDisabled('regulatory_permissions')}
                        title={isSectionTypeDisabled('regulatory_permissions') ? getSectionTypeDisabledReason('regulatory_permissions') : ''}
                        className={`w-full px-4 py-3 text-left transition-colors text-sm font-medium border-b border-gray-100
                          ${isSectionTypeDisabled('regulatory_permissions') ? 'text-gray-300 cursor-not-allowed bg-white' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <div className="font-semibold">Regulatory Permissions</div>
                        <div className="text-xs text-gray-500 mt-0.5">Construction, Occupational, Water Main & STP (Cat 1–4)</div>
                      </button>

                      {/* ── Execution: cats 5, 6, 7 ── */}
                      <button
                        onClick={() => !isSectionTypeDisabled('execution') && handleSelectCategoryType('execution')}
                        disabled={isSectionTypeDisabled('execution')}
                        title={isSectionTypeDisabled('execution') ? getSectionTypeDisabledReason('execution') : ''}
                        className={`w-full px-4 py-3 text-left transition-colors text-sm font-medium ${selectedCompany?.id === 1 ? 'border-b border-gray-100' : ''}
                          ${isSectionTypeDisabled('execution') ? 'text-gray-300 cursor-not-allowed bg-white' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <div className="font-semibold">Execution Compliance</div>
                        <div className="text-xs text-gray-500 mt-0.5">Water Connection, SWD & Sewer/Drainage (Cat 5–7)</div>
                      </button>

                      {/* ── Architecture: cat 8 — only for Company ID 1 ── */}
                      {selectedCompany?.id === 1 && (
                        <button
                          onClick={() => !isSectionTypeDisabled('architecture') && handleSelectCategoryType('architecture')}
                          disabled={isSectionTypeDisabled('architecture')}
                          title={isSectionTypeDisabled('architecture') ? getSectionTypeDisabledReason('architecture') : ''}
                          className={`w-full px-4 py-3 text-left transition-colors text-sm font-medium
                            ${isSectionTypeDisabled('architecture') ? 'text-gray-300 cursor-not-allowed bg-white' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          <div className="font-semibold">Architecture</div>
                          <div className="text-xs text-gray-500 mt-0.5">Architecture Services (Cat 8)</div>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Table header — rendered inside each section as a proper <table> for pixel-perfect alignment */}
              {/* The old grid-cols-12 header is removed; each section now owns its own thead */}

              <div className="px-4 py-4">
                {sections.length === 0 ? (
                  <div className="py-12 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No compliance added yet</p>
                    <p className="text-gray-400 text-xs mt-1">Click "Add Compliance" to get started</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {sections.map((section, sectionIndex) => {
                      const isExecSection = EXECUTION_CATS.includes(section.category_id);
                      return (
                        <div key={sectionIndex} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">

                          {/* Section header row */}
                          <div className="bg-gray-50 px-5 py-3 flex items-center justify-between border-b border-gray-200">
                            <div className="flex items-center gap-2.5">
                              <div className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0"></div>
                              <span className="text-sm font-bold text-gray-800">{section.category_name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-sm text-gray-500">
                                Subtotal: <span className="font-bold text-gray-900 ml-1">Rs. {section.items.reduce((sum, item) => sum + calcItemTotal(item, section.category_id), 0).toLocaleString('en-IN')}</span>
                              </div>
                              <button
                                onClick={() => handleEditSection(sectionIndex)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-600 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add Item
                              </button>
                              <button
                                onClick={() => handleDeleteSection(sectionIndex)}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Proper <table> so every column is pixel-aligned */}
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                              <colgroup>
                                {isExecSection ? (
                                  <>
                                    <col style={{ width: '32%' }} /> {/* Description */}
                                    <col style={{ width: '6%'  }} /> {/* Qty */}
                                    <col style={{ width: '7%'  }} /> {/* Unit */}
                                    <col style={{ width: '9%'  }} /> {/* SAC */}
                                    <col style={{ width: '10%' }} /> {/* Rate */}
                                    <col style={{ width: '12%' }} /> {/* Mat. Amt */}
                                    <col style={{ width: '12%' }} /> {/* Lab. Amt */}
                                    <col style={{ width: '12%' }} /> {/* Total (inc. action btns) */}
                                  </>
                                ) : (
                                  <>
                                    <col style={{ width: '30%' }} /> {/* Description */}
                                    <col style={{ width: '16%' }} /> {/* Sub Cat. */}
                                    <col style={{ width: '7%'  }} /> {/* Unit */}
                                    <col style={{ width: '6%'  }} /> {/* Qty */}
                                    <col style={{ width: '14%' }} /> {/* Misc. */}
                                    <col style={{ width: '15%' }} /> {/* Prof. Charges */}
                                    <col style={{ width: '12%' }} /> {/* Total */}
                                  </>
                                )}
                              </colgroup>

                              {/* Column header */}
                              <thead>
                                <tr className="bg-gray-50/70 border-b border-gray-200">
                                  {isExecSection ? (
                                    <>
                                      <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Description</th>
                                      <th className="px-2 py-2.5 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                                      <th className="px-2 py-2.5 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Unit</th>
                                      <th className="px-2 py-2.5 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">SAC</th>
                                      <th className="px-2 py-2.5 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Rate</th>
                                      <th className="px-3 py-2.5 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Mat. Amt</th>
                                      <th className="px-3 py-2.5 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Lab. Amt</th>
                                      <th className="px-4 py-2.5 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total</th>
                                    </>
                                  ) : (
                                    <>
                                      <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Description</th>
                                      <th className="px-2 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Sub Cat.</th>
                                      <th className="px-2 py-2.5 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Unit</th>
                                      <th className="px-2 py-2.5 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                                      <th className="px-3 py-2.5 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Misc.</th>
                                      <th className="px-3 py-2.5 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Prof. Charges</th>
                                      <th className="px-4 py-2.5 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total</th>
                                    </>
                                  )}
                                </tr>
                              </thead>

                              <tbody className="bg-white divide-y divide-gray-100">
                                {section.items.map((item, itemIndex) => {
                                  const displayUnit = (item.unit && item.unit !== 'N/A') ? item.unit : '—';
                                  const execRate = parseFloat(item.Professional_amount) || 0;
                                  const matAmt   = parseFloat(item.material_amount) || 0;
                                  const labAmt   = parseFloat(item.labour_amount)   || 0;
                                  const itemTotal = calcItemTotal(item, section.category_id);

                                  // For Rate column: show material_rate + labour_rate if set, else Professional_amount
                                  const matRate = parseFloat(item.material_rate) || 0;
                                  const labRate = parseFloat(item.labour_rate)   || 0;
                                  const displayRate = (matRate > 0 || labRate > 0)
                                    ? matRate + labRate
                                    : execRate;

                                  return (
                                    <tr
                                      key={itemIndex}
                                      className="group hover:bg-teal-50/30 transition-colors"
                                    >
                                      {isExecSection ? (
                                        <>
                                          {/* Description */}
                                          <td className="px-4 py-3.5 align-top">
                                            <p className="text-sm text-gray-900 leading-relaxed">{item.compliance_name}</p>
                                            {item.sub_compliance_id && (
                                              <span className="inline-block mt-1 text-[11px] font-semibold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                                                {SUB_COMPLIANCE_CATEGORIES[item.sub_compliance_id]?.name}
                                              </span>
                                            )}
                                          </td>
                                          {/* Qty */}
                                          <td className="px-2 py-3.5 text-center align-top">
                                            <span className="text-sm font-medium text-gray-700">{item.quantity}</span>
                                          </td>
                                          {/* Unit */}
                                          <td className="px-2 py-3.5 text-center align-top">
                                            <span className="inline-block text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md">
                                              {displayUnit}
                                            </span>
                                          </td>
                                          {/* SAC */}
                                          <td className="px-2 py-3.5 text-center align-top">
                                            <span className="text-xs text-gray-500 font-mono">{item.item_sac_code || '—'}</span>
                                          </td>
                                          {/* Rate */}
                                          <td className="px-2 py-3.5 text-right align-top">
                                            <span className="text-sm text-gray-700">
                                              {displayRate > 0 ? (
                                                <span className="font-medium">Rs.&nbsp;{displayRate.toLocaleString('en-IN')}</span>
                                              ) : '—'}
                                            </span>
                                          </td>
                                          {/* Mat. Amt */}
                                          <td className="px-3 py-3.5 text-right align-top">
                                            <span className="text-sm text-gray-700">
                                              {matAmt > 0 ? (
                                                <span className="font-medium">Rs.&nbsp;{matAmt.toLocaleString('en-IN')}</span>
                                              ) : <span className="text-gray-300">—</span>}
                                            </span>
                                          </td>
                                          {/* Lab. Amt */}
                                          <td className="px-3 py-3.5 text-right align-top">
                                            <span className="text-sm text-gray-700">
                                              {labAmt > 0 ? (
                                                <span className="font-medium">Rs.&nbsp;{labAmt.toLocaleString('en-IN')}</span>
                                              ) : <span className="text-gray-300">—</span>}
                                            </span>
                                          </td>
                                          {/* Total + actions */}
                                          <td className="px-4 py-3.5 text-right align-top">
                                            <div className="flex flex-col items-end gap-1.5">
                                              <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                                                Rs.&nbsp;{itemTotal.toLocaleString('en-IN')}
                                              </span>
                                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                  onClick={() => handleEditItemFromTable(sectionIndex, itemIndex)}
                                                  className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                                                  title="Edit item"
                                                >
                                                  <Edit className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                  onClick={() => handleRemoveItemFromSection(sectionIndex, itemIndex)}
                                                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                  title="Remove item"
                                                >
                                                  <X className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </div>
                                          </td>
                                        </>
                                      ) : (
                                        <>
                                          {/* Description */}
                                          <td className="px-4 py-3.5 align-top">
                                            <p className="text-sm text-gray-900 leading-relaxed">{item.compliance_name}</p>
                                          </td>
                                          {/* Sub Cat. */}
                                          <td className="px-2 py-3.5 align-top">
                                            <span className="text-xs font-semibold text-gray-600 leading-snug">
                                              {SUB_COMPLIANCE_CATEGORIES[item.sub_compliance_id]?.name || '—'}
                                            </span>
                                          </td>
                                          {/* Unit */}
                                          <td className="px-2 py-3.5 text-center align-top">
                                            <span className="inline-block text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md">
                                              {displayUnit}
                                            </span>
                                          </td>
                                          {/* Qty */}
                                          <td className="px-2 py-3.5 text-center align-top">
                                            <span className="text-sm font-medium text-gray-700">{item.quantity}</span>
                                          </td>
                                          {/* Misc. */}
                                          <td className="px-3 py-3.5 text-right align-top">
                                            <span className="text-sm text-gray-700">
                                              {(String(item.miscellaneous_amount ?? '').trim() !== '' && item.miscellaneous_amount !== '--')
                                                ? isMiscNumeric(item.miscellaneous_amount)
                                                  ? <span className="font-medium">Rs.&nbsp;{parseFloat(item.miscellaneous_amount).toLocaleString('en-IN')}</span>
                                                  : <span className="italic text-amber-600 text-xs" title="Not included in total">{item.miscellaneous_amount}</span>
                                                : <span className="text-gray-300">—</span>}
                                            </span>
                                          </td>
                                          {/* Prof. Charges */}
                                          <td className="px-3 py-3.5 text-right align-top">
                                            <span className="text-sm font-medium text-gray-700">
                                              Rs.&nbsp;{parseFloat(item.Professional_amount || 0).toLocaleString('en-IN')}
                                            </span>
                                          </td>
                                          {/* Total + actions */}
                                          <td className="px-4 py-3.5 text-right align-top">
                                            <div className="flex flex-col items-end gap-1.5">
                                              <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                                                Rs.&nbsp;{itemTotal.toLocaleString('en-IN')}
                                              </span>
                                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                  onClick={() => handleEditItemFromTable(sectionIndex, itemIndex)}
                                                  className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                                                  title="Edit item"
                                                >
                                                  <Edit className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                  onClick={() => handleRemoveItemFromSection(sectionIndex, itemIndex)}
                                                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                  title="Remove item"
                                                >
                                                  <X className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </div>
                                          </td>
                                        </>
                                      )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column — Quotation Summary */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 sticky top-4 overflow-hidden">
              {/* Summary header */}
              <div className="px-5 py-4 bg-gradient-to-r from-teal-600 to-teal-500 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Quotation Summary</h3>
                  <p className="text-teal-100 text-xs mt-0.5">{selectedCompany?.name || 'No company selected'}</p>
                </div>
              </div>

              <div className="p-5 space-y-1">
                {/* Sub Total Row */}
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500 font-medium">Sub Total</span>
                  <span className="text-sm font-semibold text-gray-900">Rs. {calculateSubTotal().toLocaleString('en-IN')}</span>
                </div>

                {/* GST Section */}
                <div className="py-3 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 font-medium">GST</span>
                      {selectedCompany?.id !== 1 && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 uppercase tracking-wide">
                          Non-GST
                        </span>
                      )}
                    </div>
                    {selectedCompany?.id === 1 ? (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={gstEnabled}
                          onChange={(e) => setGstEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                      </label>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Not applicable</span>
                    )}
                  </div>

                  {selectedCompany?.id === 1 && gstEnabled && (
                    <div className="mt-2.5 bg-teal-50 rounded-xl px-3 py-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-teal-700 font-medium">Rate (%)</label>
                        <input
                          type="number"
                          value={gstRate}
                          onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1 text-xs border border-teal-200 rounded-lg text-right bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-teal-600">Amount</span>
                        <span className="text-xs font-bold text-teal-700">Rs. {calculateGST().toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Discount Section */}
                <div className="py-3 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-sm text-gray-500 font-medium flex items-center gap-1.5">
                      <span>🎁</span> Discount
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-xl px-3 py-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-600 font-medium">Rate (%)</label>
                      <input
                        type="number"
                        value={discountValue === 0 ? '' : discountValue}
                        onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-16 px-2 py-1 text-xs border border-gray-200 rounded-lg text-right bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Amount</span>
                      <span className="text-xs font-bold text-gray-700">Rs. {calculateDiscount().toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Grand Total */}
                <div className="pt-3">
                  <div className="bg-gradient-to-r from-teal-50 to-teal-100/60 rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-800">Grand Total</span>
                    <span className="text-lg font-extrabold text-teal-600 tracking-tight">Rs. {calculateGrandTotal().toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Quick Info */}
              <div className="px-5 pb-5">
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2 text-teal-600 mb-3">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold uppercase tracking-wide">Quick Info</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                      <div className="text-lg font-bold text-gray-900">{sections.length}</div>
                      <div className="text-[10px] text-gray-400 font-medium mt-0.5 uppercase tracking-wide">Compliances</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                      <div className="text-lg font-bold text-gray-900">{sections.reduce((sum, s) => sum + s.items.length, 0)}</div>
                      <div className="text-[10px] text-gray-400 font-medium mt-0.5 uppercase tracking-wide">Items</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                      <div className="text-lg font-bold text-gray-900">
                        {sections.reduce((sum, s) => sum + s.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)}
                      </div>
                      <div className="text-[10px] text-gray-400 font-medium mt-0.5 uppercase tracking-wide">Qty</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add/Edit Section Modal */}
        {showAddSection && (
          <div className="fixed inset-0 z-[9999] animate-fadeIn" style={{ position: 'fixed', overflow: 'hidden' }}>
            {/* Clean dark backdrop — no blur */}
            <div
              className="absolute inset-0 bg-black/50"
              style={{ position: 'fixed', width: '100vw', height: '100vh' }}
              onClick={closeModal}
            />

            <div className="relative z-10 flex items-center justify-center p-4" style={{ height: '100vh' }}>
              <div
                className="relative w-full max-w-2xl animate-scaleIn bg-white flex flex-col"
                style={{ 
                  borderRadius: '20px', 
                  boxShadow: '0 32px 64px rgba(0,0,0,0.24)', 
                  height: '88vh',
                  maxHeight: '760px',
                  minHeight: '480px',
                  overflow: 'hidden'
                }}
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="bg-teal-700 px-6 py-4 flex-shrink-0" style={{ borderRadius: '20px 20px 0 0' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                        <Plus className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-base leading-tight">
                          {editingSection !== null ? 'Edit Compliance' : 'Add New Compliance'}
                        </p>
                        <p className="text-teal-200 text-xs mt-0.5">
                          {sectionForm.category_name || 'Select a category below'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={closeModal}
                      className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    >
                      <X size={16} className="text-white" />
                    </button>
                  </div>
                </div>

                {/* Scrollable body */}
                <div id="compliance-modal-body" className="p-5 space-y-4 bg-gray-50 flex-1" style={{ minHeight: 0, overflowY: 'scroll', scrollbarGutter: 'stable' }}>

                    {/* Category Selection */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Compliance Category</p>
                      {/* Show category tabs for multi-cat types; single-cat types just show a label */}
                      {selectedCategoryType && (() => {
                        const catIds = COMPLIANCE_GROUPS[selectedCategoryType] || [];
                        if (catIds.length <= 1) {
                          // Single category — just show active name, no tabs needed
                          return (
                            <div className="px-3 py-2 rounded-lg bg-teal-50 border border-teal-200 text-sm font-semibold text-teal-700">
                              {COMPLIANCE_CATEGORIES[catIds[0]]?.name || ''}
                            </div>
                          );
                        }
                        // For regulatory_permissions (4 cats) use 2 cols, others use 2 cols too
                        const gridCols = catIds.length === 3 ? 'grid-cols-3' : 'grid-cols-2';
                        return (
                          <div className={`grid ${gridCols} gap-2`}>
                            {catIds.map(catId => {
                              const cat = COMPLIANCE_CATEGORIES[catId];
                              const itemCount = categoryItemsMap[catId]?.items?.length || 0;
                              return (
                                <button key={catId} onClick={() => handleCategoryChange(catId)}
                                  className={`px-3 py-2.5 rounded-lg border-2 font-medium text-xs transition-colors relative ${activeCategoryId === catId ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}>
                                  {cat?.shortName || cat?.name}
                                  {itemCount > 0 && (
                                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-teal-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                      {itemCount}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Add Item Form */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-visible">
                      <div className={`px-4 py-3 border-b border-gray-100 flex items-center justify-between ${modalEditingItemIndex !== null ? 'bg-amber-50' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-2">
                          {modalEditingItemIndex !== null ? (
                            <>
                              <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                                <Edit className="w-3 h-3 text-white" />
                              </div>
                              <span className="text-sm font-semibold text-amber-800">Editing Item #{modalEditingItemIndex + 1}</span>
                            </>
                          ) : (
                            <>
                              <div className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center">
                                <Plus className="w-3 h-3 text-white" />
                              </div>
                              <span className="text-sm font-semibold text-gray-700">Add Item</span>
                            </>
                          )}
                        </div>
                        {modalEditingItemIndex !== null && (
                          <button
                            onClick={() => {
                              modalSetEditingIdx(null);
                              modalSetItemForm(prev => ({ ...BLANK_ITEM_FORM, sub_compliance_id: prev.sub_compliance_id }));
                              setDescSelectedFromDropdown(false);
                            }}
                            className="text-xs text-amber-600 hover:text-amber-800 font-medium"
                          >
                            Cancel edit
                          </button>
                        )}
                      </div>

                      <div className="p-4 space-y-3">
                        {/* Sub-compliance shown only for categories that have sub-options: 1,2,5,6,7 (never architecture) */}
                        {activeCategoryId && !ARCHITECTURE_CATS.includes(activeCategoryId) && (SUB_COMPLIANCE_BY_CATEGORY[activeCategoryId]?.length > 0) && (
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                              Sub-Compliance Category <span className="text-red-400">*</span>
                            </label>
                            <SubComplianceDropdown
                              value={modalItemForm.sub_compliance_id}
                              onChange={(id) => {
                                modalSetItemForm(prev => ({ ...prev, sub_compliance_id: id, compliance_name: '' }));
                                setDescriptionSearch('');
                                setShowDescriptionDropdown(false);
                                setDescSelectedFromDropdown(false);
                                fetchComplianceDescriptions(activeCategoryId, id);
                              }}
                              categoryId={activeCategoryId}
                              placeholder="Select sub-compliance category"
                            />
                          </div>
                        )}

                        <div className="relative">
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Description <span className="text-red-400">*</span>
                            </label>
                            {complianceDescriptions.length > 0 && !ARCHITECTURE_CATS.includes(activeCategoryId) && (
                              <button type="button"
                                onClick={() => {
                                  setDescriptionMode(prev => prev === 'dropdown' ? 'manual' : 'dropdown');
                                  modalSetItemForm(prev => ({ ...prev, compliance_name: '' }));
                                  setDescSelectedFromDropdown(false);
                                }}
                                className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                              >
                                {descriptionMode === 'dropdown' ? '+ Type manually' : '← Pick from list'}
                              </button>
                            )}
                          </div>

                          {complianceDescLoading ? (
                            <div className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 flex items-center gap-2 text-sm text-gray-500">
                              <Loader2 className="w-4 h-4 animate-spin text-teal-500" />Loading descriptions...
                            </div>
                          ) : ARCHITECTURE_CATS.includes(activeCategoryId) ? (
                            /* Architecture: always manual text entry */
                            <textarea
                              value={modalItemForm.compliance_name}
                              onChange={e => modalSetItemForm(prev => ({ ...prev, compliance_name: e.target.value }))}
                              placeholder="Enter architecture service description"
                              rows="2"
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none"
                            />
                          ) : descriptionMode === 'dropdown' && complianceDescriptions.length > 0 ? (
                            <div className="description-dropdown relative w-full">

                              {/* ── Chip + textarea (selected, dropdown closed) ── */}
                              {modalItemForm.compliance_name && descSelectedFromDropdown && !showDescriptionDropdown ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg">
                                    <div className="w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                    <span className="text-xs font-semibold text-teal-700 flex-1 truncate">Selected from list — edit below if needed</span>
                                    <button type="button"
                                      onClick={() => {
                                        setShowDescriptionDropdown(true);
                                      }}
                                      className="text-xs text-teal-600 hover:text-teal-800 font-semibold underline underline-offset-2 flex-shrink-0">
                                      Change
                                    </button>
                                  </div>
                                  <textarea
                                    value={modalItemForm.compliance_name}
                                    onChange={e => modalSetItemForm(prev => ({ ...prev, compliance_name: e.target.value }))}
                                    rows={3}
                                    autoFocus
                                    className="w-full px-3 py-2.5 border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none bg-white shadow-sm"
                                    placeholder="Edit the description as needed…"
                                  />
                                </div>
                              ) : !descSelectedFromDropdown || showDescriptionDropdown ? (
                                /* ── Dropdown trigger button ── */
                                <button type="button"
                                  onClick={() => {
                                    setShowDescriptionDropdown(prev => !prev);
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-left flex items-center justify-between bg-white hover:bg-gray-50 transition-colors">
                                  <span className={modalItemForm.compliance_name ? 'text-gray-900' : 'text-gray-500'}>
                                    {modalItemForm.compliance_name
                                      ? (modalItemForm.compliance_name.length > 65 ? modalItemForm.compliance_name.substring(0, 65) + '...' : modalItemForm.compliance_name)
                                      : 'Select a description'}
                                  </span>
                                  <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${showDescriptionDropdown ? 'rotate-180' : ''}`} />
                                </button>
                              ) : null}

                              {/* ── Dropdown panel — inline so it pushes content down and doesn't jump scroll ── */}
                              {showDescriptionDropdown && (
                                <div
                                  className="w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mt-1.5"
                                  style={{ zIndex: 10 }}
                                  onMouseDown={(e) => e.preventDefault()}
                                >
                                  {/* Search bar */}
                                  <div className="px-3 pt-3 pb-2">
                                    <div className="relative">
                                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                      <input
                                        type="text"
                                        placeholder="Search descriptions..."
                                        value={descriptionSearch}
                                        onChange={(e) => setDescriptionSearch(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white text-sm transition-colors"
                                        autoFocus
                                      />
                                    </div>
                                  </div>
                                  {/* Results count */}
                                  <div className="px-3 pb-1.5 flex items-center justify-between">
                                    <span className="text-[11px] text-gray-400 font-medium">
                                      {complianceDescriptions.filter(d => !modalUsedDescriptions.has(d.compliance_description) && d.compliance_description?.toLowerCase().includes(descriptionSearch.toLowerCase())).length} options available
                                    </span>
                                    <span className="text-[11px] text-teal-500 font-medium">Click to select</span>
                                  </div>
                                  {/* Divider */}
                                  <div className="border-t border-gray-100" />
                                  {/* List */}
                                  <div className="max-h-60 overflow-y-auto">
                                    {complianceDescriptions
                                      .filter(d => !modalUsedDescriptions.has(d.compliance_description) && d.compliance_description?.toLowerCase().includes(descriptionSearch.toLowerCase()))
                                      .map((desc, idx) => {
                                        const isSelected = modalItemForm.compliance_name === desc.compliance_description;
                                        return (
                                          <button
                                            key={desc.id}
                                            type="button"
                                            onClick={() => {
                                              modalSetItemForm(prev => ({ ...prev, compliance_name: desc.compliance_description }));
                                              setDescSelectedFromDropdown(true);
                                              setShowDescriptionDropdown(false);
                                              setDescriptionSearch('');
                                            }}
                                            className={`w-full text-left px-3 py-2.5 border-b border-gray-100 last:border-b-0 transition-colors duration-100 flex items-start gap-3
                                              ${isSelected ? 'bg-teal-50' : 'bg-white hover:bg-teal-600'} group`}
                                          >
                                            <span className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold mt-0.5 transition-colors
                                              ${isSelected ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-teal-500 group-hover:text-white'}`}>
                                              {idx + 1}
                                            </span>
                                            <span className={`flex-1 text-sm leading-snug transition-colors
                                              ${isSelected ? 'text-teal-800 font-medium' : 'text-gray-700 group-hover:text-white'}`}>
                                              {desc.compliance_description}
                                            </span>
                                            {isSelected && (
                                              <svg className="flex-shrink-0 w-4 h-4 text-teal-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                              </svg>
                                            )}
                                          </button>
                                        );
                                      })}
                                    {complianceDescriptions.filter(d => !modalUsedDescriptions.has(d.compliance_description)).length === 0 && (
                                      <div className="px-4 py-10 text-center">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                          <FileText className="w-6 h-6 text-gray-300" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-500">All descriptions already used</p>
                                        <p className="text-xs text-gray-400 mt-1">Switch sub-compliance or type manually</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <textarea
                              value={modalItemForm.compliance_name}
                              onChange={e => modalSetItemForm(prev => ({ ...prev, compliance_name: e.target.value }))}
                              placeholder={complianceDescriptions.length === 0 && !complianceDescLoading ? 'No presets — type your own description' : 'Enter service description'}
                              rows="2"
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none"
                            />
                          )}
                        </div>

                        {/* ── EXECUTION fields: Unit, SAC, Qty, Rate, then optional breakdown ── */}
                        {EXECUTION_CATS.includes(activeCategoryId) ? (
                          <>
                            {/* Row 1: Unit + SAC Code */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Unit <span className="text-red-400">*</span></label>
                                <input type="text" value={modalItemForm.unit}
                                  onChange={e => modalSetItemForm(prev => ({ ...prev, unit: e.target.value }))}
                                  placeholder="e.g. m, nos, RM, RMT"
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">SAC Code</label>
                                <input type="text" value={modalItemForm.item_sac_code}
                                  onChange={e => modalSetItemForm(prev => ({ ...prev, item_sac_code: e.target.value }))}
                                  placeholder="e.g. 998313"
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                              </div>
                            </div>

                            {/* Row 2: Qty + Rate (mandatory, like Professional in Regulatory) */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Qty <span className="text-red-400">*</span></label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={modalItemForm.quantity}
                                  onChange={e => {
                                    const raw = e.target.value.replace(/[^0-9]/g, '');
                                    const qty = parseInt(raw, 10) || 0;
                                    // Auto-recompute amounts when qty changes
                                    const matAmt = parseFloat((( parseFloat(modalItemForm.material_rate) || 0) * (qty || 1)).toFixed(2));
                                    const labAmt = parseFloat(((parseFloat(modalItemForm.labour_rate) || 0) * (qty || 1)).toFixed(2));
                                    modalSetItemForm(prev => ({
                                      ...prev,
                                      quantity: raw,
                                      material_amount: (parseFloat(prev.material_rate) || 0) > 0 ? matAmt : prev.material_amount,
                                      labour_amount:   (parseFloat(prev.labour_rate)   || 0) > 0 ? labAmt : prev.labour_amount,
                                    }));
                                  }}
                                  onBlur={e => {
                                    const val = parseInt(e.target.value, 10);
                                    const qty = (!val || val < 1) ? 1 : val;
                                    const matAmt = parseFloat(((parseFloat(modalItemForm.material_rate) || 0) * qty).toFixed(2));
                                    const labAmt = parseFloat(((parseFloat(modalItemForm.labour_rate)   || 0) * qty).toFixed(2));
                                    modalSetItemForm(prev => ({
                                      ...prev,
                                      quantity: qty,
                                      material_amount: (parseFloat(prev.material_rate) || 0) > 0 ? matAmt : prev.material_amount,
                                      labour_amount:   (parseFloat(prev.labour_rate)   || 0) > 0 ? labAmt : prev.labour_amount,
                                    }));
                                  }}
                                  placeholder="Enter qty"
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                  Rate (Rs.) <span className="text-red-400">*</span>
                                  <span className="ml-1 normal-case font-normal text-gray-400 text-xs">per unit</span>
                                </label>
                                <input type="number" min="0" step="0.01"
                                  value={modalItemForm.Professional_amount === 0 ? '' : modalItemForm.Professional_amount}
                                  onChange={e => {
                                    // Rate field stores in Professional_amount — independent of material/labour breakdown
                                    const rate = parseFloat(e.target.value) || 0;
                                    modalSetItemForm(prev => ({
                                      ...prev,
                                      Professional_amount: rate,
                                    }));
                                  }}
                                  placeholder="0.00"
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                              </div>
                            </div>

                            {/* Advanced breakdown: Material + Labour split (optional) */}
                            <div className="pt-1">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                                Rate Breakdown
                                <span className="normal-case font-normal text-gray-400 ml-1">(optional — split into Material &amp; Labour)</span>
                              </p>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Material Rate (Rs./unit)</label>
                                  <input type="number" min="0" step="0.01"
                                    value={modalItemForm.material_rate === 0 ? '' : modalItemForm.material_rate}
                                    onChange={e => {
                                      const rate = parseFloat(e.target.value) || 0;
                                      const qty  = parseInt(modalItemForm.quantity, 10) || 1;
                                      modalSetItemForm(prev => ({
                                        ...prev,
                                        material_rate:   rate,
                                        material_amount: parseFloat((rate * qty).toFixed(2)),
                                      }));
                                    }}
                                    placeholder="0.00"
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Material Amount (Rs.)</label>
                                  <input type="number" min="0" step="0.01"
                                    value={modalItemForm.material_amount === 0 ? '' : modalItemForm.material_amount}
                                    onChange={e => modalSetItemForm(prev => ({ ...prev, material_amount: parseFloat(e.target.value) || 0 }))}
                                    placeholder="auto = rate × qty"
                                    className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3 mt-3">
                                <div>
                                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Labour Rate (Rs./unit)</label>
                                  <input type="number" min="0" step="0.01"
                                    value={modalItemForm.labour_rate === 0 ? '' : modalItemForm.labour_rate}
                                    onChange={e => {
                                      const rate = parseFloat(e.target.value) || 0;
                                      const qty  = parseInt(modalItemForm.quantity, 10) || 1;
                                      modalSetItemForm(prev => ({
                                        ...prev,
                                        labour_rate:   rate,
                                        labour_amount: parseFloat((rate * qty).toFixed(2)),
                                      }));
                                    }}
                                    placeholder="0.00"
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Labour Amount (Rs.)</label>
                                  <input type="number" min="0" step="0.01"
                                    value={modalItemForm.labour_amount === 0 ? '' : modalItemForm.labour_amount}
                                    onChange={e => modalSetItemForm(prev => ({ ...prev, labour_amount: parseFloat(e.target.value) || 0 }))}
                                    placeholder="auto = rate × qty"
                                    className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          /* ── REGULATORY fields: Unit + Professional + Misc ── */
                          <>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Unit</label>
                              <input
                                type="text"
                                value={modalItemForm.unit}
                                onChange={e => modalSetItemForm(prev => ({ ...prev, unit: e.target.value }))}
                                placeholder="e.g. m, nos, RM, Lump Sum"
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Qty <span className="text-red-400">*</span></label>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={modalItemForm.quantity}
                                onChange={e => {
                                  const raw = e.target.value.replace(/[^0-9]/g, '');
                                  modalSetItemForm(prev => ({ ...prev, quantity: raw }));
                                }}
                                onBlur={e => {
                                  const val = parseInt(e.target.value, 10);
                                  modalSetItemForm(prev => ({ ...prev, quantity: (!val || val < 1) ? 1 : val }));
                                }}
                                placeholder="Enter qty"
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Professional (Rs.) <span className="text-red-400">*</span></label>
                              <input
                                type="number" min="0" step="0.01"
                                value={modalItemForm.Professional_amount === 0 ? '' : modalItemForm.Professional_amount}
                                onChange={e => modalSetItemForm(prev => ({ ...prev, Professional_amount: parseFloat(e.target.value) || 0 }))}
                                placeholder="0.00"
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                Misc. (Rs.)
                                {modalItemForm.miscellaneous_amount !== '' && (
                                  <span className={`ml-1.5 normal-case font-normal text-xs ${isMiscNumeric(modalItemForm.miscellaneous_amount) ? 'text-teal-500' : 'text-amber-500'}`}>
                                    {isMiscNumeric(modalItemForm.miscellaneous_amount) ? '(calculated)' : '(note only)'}
                                  </span>
                                )}
                              </label>
                              <input
                                type="text"
                                value={modalItemForm.miscellaneous_amount}
                                onChange={e => modalSetItemForm(prev => ({ ...prev, miscellaneous_amount: e.target.value }))}
                                placeholder="Amount or description"
                                className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-colors ${modalItemForm.miscellaneous_amount !== '' && !isMiscNumeric(modalItemForm.miscellaneous_amount) ? 'border-amber-300 focus:ring-amber-400 bg-amber-50' : 'border-gray-300 focus:ring-teal-500 bg-white'}`}
                              />
                            </div>
                          </div>
                          </>
                        )}

                        <div className="flex items-center gap-3">
                          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-teal-50 border border-teal-200 rounded-lg flex-wrap">
                            <span className="text-sm text-teal-700 font-medium">Item Total:</span>
                            <span className="text-sm font-bold text-teal-800">Rs. {calcItemTotal(modalItemForm).toLocaleString('en-IN')}</span>
                            {EXECUTION_CATS.includes(activeCategoryId) ? (
                              <span className="text-xs text-teal-500 ml-auto">
                                {(parseFloat(modalItemForm.material_amount) > 0 || parseFloat(modalItemForm.labour_amount) > 0)
                                  ? `Mat. + Lab. = (${(parseFloat(modalItemForm.material_amount)||0).toLocaleString('en-IN')} + ${(parseFloat(modalItemForm.labour_amount)||0).toLocaleString('en-IN')})`
                                  : (parseFloat(modalItemForm.material_rate) > 0 || parseFloat(modalItemForm.labour_rate) > 0)
                                    ? `Rate × Qty = (${((parseFloat(modalItemForm.material_rate)||0)+(parseFloat(modalItemForm.labour_rate)||0)).toLocaleString('en-IN')} × ${parseInt(modalItemForm.quantity)||1})`
                                    : `Rate × Qty = (${(parseFloat(modalItemForm.Professional_amount)||0).toLocaleString('en-IN')} × ${parseInt(modalItemForm.quantity)||1})`}
                              </span>
                            ) : modalItemForm.miscellaneous_amount !== '' && !isMiscNumeric(modalItemForm.miscellaneous_amount) ? (
                              <span className="text-xs text-amber-600 ml-auto flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Misc shown as note
                              </span>
                            ) : (
                              <span className="text-xs text-teal-500 ml-auto">(Prof + Misc) × Qty</span>
                            )}
                          </div>
                          <button
                            onClick={modalAddItem}
                            disabled={
                              !modalItemForm.compliance_name.trim() ||
                              // Sub-compliance required only for cats 1,2,5,6,7 (not arch)
                              (activeCategoryId && !ARCHITECTURE_CATS.includes(activeCategoryId) && (SUB_COMPLIANCE_BY_CATEGORY[activeCategoryId]?.length > 0) && !modalItemForm.sub_compliance_id) ||
                              // Professional_amount required for regulatory + architecture; execution uses rates
                              (!EXECUTION_CATS.includes(activeCategoryId) && !(parseFloat(modalItemForm.Professional_amount) > 0))
                            }
                            className={`px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${modalEditingItemIndex !== null ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
                          >
                            {modalEditingItemIndex !== null ? <><Edit className="w-4 h-4" />Update</> : <><Plus className="w-4 h-4" />Add Item</>}
                          </button>
                        </div>
                      </div>
                    </div>

                    {modalActiveItems.length > 0 && (
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-700">
                            {COMPLIANCE_CATEGORIES[activeCategoryId]?.shortName || 'Added'} Items
                          </span>
                          <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-semibold">{modalActiveItems.length} items</span>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {modalActiveItems.map((item, index) => (
                            <div key={index} className={`flex items-start gap-3 px-4 py-3 transition-colors ${modalEditingItemIndex === index ? 'bg-amber-50 border-l-2 border-amber-400' : 'hover:bg-gray-50'}`}>
                              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-gray-500">{index + 1}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 leading-snug">{item.compliance_name}</p>
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                  {item.sub_compliance_id && (
                                    <span className="text-xs text-indigo-600 font-medium">{SUB_COMPLIANCE_CATEGORIES[item.sub_compliance_id]?.name}</span>
                                  )}
                                  <span className="text-xs text-gray-400">Qty: {item.quantity}</span>
                                  {EXECUTION_CATS.includes(activeCategoryId) ? (
                                    <>
                                      {parseFloat(item.material_amount) > 0 && <span className="text-xs text-gray-400">Mat: Rs. {parseFloat(item.material_amount).toLocaleString('en-IN')}</span>}
                                      {parseFloat(item.labour_amount) > 0  && <span className="text-xs text-gray-400">Lab: Rs. {parseFloat(item.labour_amount).toLocaleString('en-IN')}</span>}
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-xs text-gray-400">Prof: Rs. {parseFloat(item.Professional_amount || 0).toLocaleString('en-IN')}</span>
                                      {String(item.miscellaneous_amount ?? '').trim() !== '' && (
                                        isMiscNumeric(item.miscellaneous_amount)
                                          ? <span className="text-xs text-gray-400">Misc: Rs. {parseFloat(item.miscellaneous_amount).toLocaleString('en-IN')}</span>
                                          : <span className="text-xs text-amber-600 italic font-medium" title="Not included in total">Misc: {item.miscellaneous_amount}</span>
                                      )}
                                    </>
                                  )}
                                  <span className="text-xs font-semibold text-teal-700">Total: Rs. {calcItemTotal(item).toLocaleString('en-IN')}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button onClick={() => modalEditItem(index)}
                                  className={`p-1.5 rounded-lg transition-colors ${modalEditingItemIndex === index ? 'bg-amber-100 text-amber-600' : 'text-gray-400 hover:bg-blue-50 hover:text-blue-600'}`}
                                  title="Edit item">
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => modalRemoveItem(index)}
                                  className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                                  title="Remove item">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
                          <span className="text-sm font-bold text-gray-800">
                            Section Total: Rs. {modalActiveItems.reduce((sum, item) => sum + calcItemTotal(item), 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Summary of other categories when multiple have items */}
                    {/* Cross-category summary: show other cats in the group that also have items */}
                    {!editingSection && selectedCategoryType && (() => {
                      const groupCats = COMPLIANCE_GROUPS[selectedCategoryType] || [];
                      const others = groupCats.filter(cId => cId !== activeCategoryId && (categoryItemsMap[cId]?.items?.length || 0) > 0);
                      return others.map(cId => (
                        <div key={cId} className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center gap-3">
                          <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">{categoryItemsMap[cId]?.items?.length}</span>
                          </div>
                          <p className="text-sm text-indigo-700 font-medium">
                            {COMPLIANCE_CATEGORIES[cId]?.shortName} also has {categoryItemsMap[cId]?.items?.length} item{categoryItemsMap[cId]?.items?.length > 1 ? 's' : ''} — will be saved to its own section.
                          </p>
                        </div>
                      ));
                    })()}

                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-5 py-4 bg-white flex items-center justify-between gap-3 flex-shrink-0" style={{ borderRadius: '0 0 20px 20px' }}>
                  <span className="text-xs text-gray-400">
                    {modalTotalItems === 0 ? 'Add at least one item to continue' : `${modalTotalItems} item${modalTotalItems > 1 ? 's' : ''} ready`}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={closeModal}
                      className="px-5 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600"
                    >
                      Cancel
                    </button>
                    <button onClick={handleAddSection}
                      disabled={modalSaveDisabled}
                      className="px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
                      {editingSection !== null ? 'Update Compliance' : 'Save Compliance'}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm.show && (
          <div className="fixed inset-0 z-[9999] animate-fadeIn">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={cancelDelete}
            />
            
            <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
              <div 
                className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scaleIn"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {deleteConfirm.type === 'section' ? 'Delete Compliance?' : 'Remove Item?'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {deleteConfirm.type === 'section' 
                        ? 'Are you sure you want to delete this compliance? All items will be permanently removed. This action cannot be undone.'
                        : 'Are you sure you want to remove this item? This action cannot be undone.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={cancelDelete}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                  >
                    {deleteConfirm.type === 'section' ? 'Delete Compliance' : 'Remove Item'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Bottom Action Bar */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-gray-900">
                  Total: Rs. {calculateGrandTotal().toLocaleString('en-IN')}
                </span>
                <span className="text-sm text-gray-600">Items: {sections.reduce((sum, s) => sum + s.items.length, 0)}</span>
                <span className="text-sm text-gray-600">
                  Status: <span className="text-orange-500 font-medium">Draft</span>
                </span>
                {sections.length > 0 && (
                  <span className="flex items-center gap-1.5 text-xs text-teal-600 font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    Auto-saved
                  </span>
                )}
                {sections.length > 0 && (
                  <button
                    onClick={() => { if (window.confirm('Clear all draft data?')) { clearDraft(); setSections([]); setSelectedClient(null); setSelectedProject(null); setSacCode(''); setGstRate(18); setDiscountValue(0); generateQuotationNumber(); } }}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors"
                  >
                    Clear draft
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={handleSubmit}
                  disabled={submitting || sections.length === 0 || !selectedClient || !selectedProject || !selectedCompany}
                  className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isEditMode ? 'Updating...' : 'Generating...'}
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      {isEditMode ? 'Update Quotation' : 'Generate Quotation'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        isEditMode={isEditMode}
        quotationNumber={createdQuotation?.quotation_number}
        quotationId={createdQuotation?.id}
        onClose={() => {
          setShowSuccessModal(false);
          if (!isEditMode) {
            setSections([]);
            setSelectedClient(null);
            setSelectedProject(null);
            setSacCode('');
            setGstRate(18);
            setDiscountValue(0);
            clearDraft();
            generateQuotationNumber();
          }
        }}
        onViewQuotation={() => {
          if (isEditMode && createdQuotation?.id) {
            navigate(`/quotations/${createdQuotation.id}`);
          } else {
            navigate('/quotations');
          }
        }}
      />

      <style>{`
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

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}