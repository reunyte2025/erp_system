import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Plus, User, ChevronDown, Trash2, Edit, FileText, X, Loader2, AlertCircle, CheckCircle, Building2, ChevronRight } from 'lucide-react';
import {
  createPurchaseOrder,
  updatePurchaseOrder,
  getComplianceDescriptions,
} from '../../services/purchase';
import { getVendors } from '../../services/vendors';
import { getProjects } from '../../services/projects';

const ENABLE_LOGGING = false;

const logger = {
  log: (...args) => ENABLE_LOGGING && console.log(...args),
  error: (...args) => console.error(...args),
};

// ============================================================================
// COMPLIANCE CONSTANTS — EXECUTION ONLY (Water Connection, SWD, Sewer)
// ============================================================================

const COMPLIANCE_CATEGORIES = {
  5: { id: 5, name: 'Water Connection',          shortName: 'Water Connection' },
  6: { id: 6, name: 'SWD Line Work',             shortName: 'SWD Line Work'    },
  7: { id: 7, name: 'Sewer/Drainage Line Work',  shortName: 'Sewer/Drainage'   },
};

const EXECUTION_CAT_IDS = [5, 6, 7];
const DESCRIPTION_MAX_LENGTH = 255;

const SUB_COMPLIANCE_BY_CATEGORY = {
  5: [ { id: 5, name: 'Internal Water Main' }, { id: 6, name: 'Permanent Water Connection' } ],
  6: [ { id: 7, name: 'Pipe Jacking Method' }, { id: 8, name: 'HDD Method' }, { id: 9, name: 'Open Cut Method' } ],
  7: [ { id: 7, name: 'Pipe Jacking Method' }, { id: 8, name: 'HDD Method' }, { id: 9, name: 'Open Cut Method' } ],
};

const sanitizeDescription = (value) => String(value || '').trim().slice(0, DESCRIPTION_MAX_LENGTH);

// ── Company options (matches backend Company class) ──────────────────────────
const COMPANIES = [
  { id: 1, name: 'Constructive India' },
  { id: 2, name: 'PVA Arch'           },
  { id: 3, name: 'Atharv India'       },
  { id: 4, name: 'VD Associates'      },
];

// ============================================================================
// SUB-COMPLIANCE DROPDOWN COMPONENT (matches quotation.jsx design)
// ============================================================================

const SubComplianceDropdown = ({ value, options = [], onChange, placeholder = 'Select sub-compliance category' }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => { if (!isOpen) setSearch(''); }, [isOpen]);

  const filtered = options.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));
  const selected = options.find(item => item.id === value);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-left flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-500'}>
          {selected ? selected.name : placeholder}
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
            {filtered.length > 0 ? (
              filtered.map((item) => (
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
// SUCCESS MODAL
// ============================================================================

const SuccessModal = ({ isOpen, onClose, onViewOrder, orderNumber, isEditMode }) => {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] animate-fadeIn" style={{ position: 'fixed', overflow: 'hidden' }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center animate-scaleIn" onClick={e => e.stopPropagation()}>
          <div className="mb-5 flex justify-center">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-9 h-9 text-teal-600" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">{isEditMode ? 'Purchase Order Updated!' : 'Purchase Order Created!'}</h3>
          {orderNumber && (
            <p className="text-sm font-semibold text-teal-600 bg-teal-50 rounded-lg px-3 py-1.5 inline-block mb-4">{orderNumber}</p>
          )}
          <p className="text-sm text-gray-500 mb-6">{isEditMode ? 'Your purchase order has been updated successfully.' : 'Your purchase order has been saved successfully.'}</p>
          <div className="space-y-2.5">
            <button onClick={onViewOrder} className="w-full px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm">
              {isEditMode ? 'View Purchase Order' : 'Back to Purchase Orders'}
            </button>
            {!isEditMode && (
              <button onClick={onClose} className="w-full px-6 py-2.5 bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm">
                Create Another
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CreatePurchaseOrder({ onUpdateNavigation }) {
  const location = useLocation();
  const navigate  = useNavigate();

  const selectedVendorFromState  = location.state?.selectedVendor  || null;
  const selectedProjectFromState = location.state?.selectedProject || null;
  const editQuotation            = location.state?.editQuotation   || null;
  const isEditMode               = !!editQuotation;

  useEffect(() => {
    if (onUpdateNavigation) {
      onUpdateNavigation({
        breadcrumbs: isEditMode
          ? ['Purchase Orders', 'Edit Purchase Order']
          : ['Purchase Orders', 'New Purchase Order'],
      });
    }
    return () => { if (onUpdateNavigation) onUpdateNavigation(null); };
  }, [onUpdateNavigation, isEditMode]);

  // Draft helpers
  const DRAFT_KEY = 'purchase_order_draft';
  const saveDraft  = (data) => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch { /* local draft is optional */ } };
  const clearDraft = ()     => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* local draft is optional */ } };
  const loadDraft  = ()     => { try { const d = localStorage.getItem(DRAFT_KEY); return d ? JSON.parse(d) : null; } catch { return null; } };

  // ── State ─────────────────────────────────────────────────────────────────
  const [vendors,              setVendors]              = useState([]);
  const [allProjects,          setAllProjects]          = useState([]);
  const [projectsLoading,      setProjectsLoading]      = useState(false);
  const [selectedVendor,       setSelectedVendor]       = useState(selectedVendorFromState  || null);
  const [selectedProject,      setSelectedProject]      = useState(selectedProjectFromState || null);
  const [selectedCompany,      setSelectedCompany]      = useState(COMPANIES[0]); // default = Constructive India
  const [showVendorDropdown,   setShowVendorDropdown]   = useState(false);
  const [showProjectDropdown,  setShowProjectDropdown]  = useState(false);
  const [showCompanyDropdown,  setShowCompanyDropdown]  = useState(false);
  const [vendorSearch,         setVendorSearch]         = useState('');
  const [projectSearch,        setProjectSearch]        = useState('');
  const [sacCode,              setSacCode]              = useState('');
  const [sections,             setSections]             = useState([]);
  const [gstEnabled,           setGstEnabled]           = useState(true);
  const [gstRate,              setGstRate]              = useState(18);
  const [discountType,         setDiscountType]         = useState('Percentage');
  const [discountValue,        setDiscountValue]        = useState(0);
  const [showAddSection,       setShowAddSection]       = useState(false);
  const [editingSection,       setEditingSection]       = useState(null);
  const [submitting,           setSubmitting]           = useState(false);
  const [error,                setError]                = useState('');
  const [showSuccessModal,     setShowSuccessModal]     = useState(false);
  const [createdOrder,         setCreatedOrder]         = useState(null);
  const [deleteConfirm,        setDeleteConfirm]        = useState({ show: false, type: null, sectionIndex: null, itemIndex: null });
  const [, setSelectedCategoryType] = useState(null);
  const [categoryItemsMap,     setCategoryItemsMap]     = useState({});
  const [activeCategoryId,     setActiveCategoryId]     = useState(null);
  const [descriptionsCacheRef]                          = useState({ current: {} });
  const [complianceDescriptions, setComplianceDescriptions] = useState([]);
  const [complianceDescLoading,  setComplianceDescLoading]  = useState(false);
  const [descriptionMode,      setDescriptionMode]      = useState('dropdown');
  const [descriptionSearch,    setDescriptionSearch]    = useState('');
  const [showDescriptionDropdown, setShowDescriptionDropdown] = useState(false);
  const [descSelectedFromDropdown, setDescSelectedFromDropdown] = useState(false);
  const [, setSectionForm]          = useState({ category_id: null, category_name: '', items: [] });
  const [itemFormMap,          setItemFormMap]          = useState({});
  const [editingItemIndexMap,  setEditingItemIndexMap]  = useState({});

  // ── Blank item form for execution ─────────────────────────────────────────
  const BLANK_ITEM_FORM = {
    compliance_name: '', compliance_id: null, sub_compliance_id: null, quantity: 1,
    unit: '', item_sac_code: '',
    // Professional_amount = the "Rate (Rs.) per unit" field
    Professional_amount: 0,
    // Optional breakdown
    material_rate: 0, material_amount: 0,
    labour_rate: 0,   labour_amount: 0,
  };

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchVendorsList();
    fetchProjectsList();

    if (isEditMode && editQuotation) {
      if (editQuotation.sac_code) setSacCode(editQuotation.sac_code);
      const gst = parseFloat(editQuotation.gst_rate || 0);
      setGstEnabled(gst > 0);
      setGstRate(gst > 0 ? gst : 18);
      setDiscountValue(parseFloat(editQuotation.discount_rate || 0));
      if (editQuotation._vendorObj)  setSelectedVendor(editQuotation._vendorObj);
      if (editQuotation._projectObj) setSelectedProject(editQuotation._projectObj);
      if (editQuotation.company) {
        const co = COMPANIES.find(c => c.id === parseInt(editQuotation.company));
        if (co) setSelectedCompany(co);
      }
      if (editQuotation.items?.length) {
        const grouped = {};
        editQuotation.items.forEach(item => {
          const catId = item.compliance_category ?? 5;
          if (!grouped[catId]) grouped[catId] = { category_id: catId, category_name: COMPLIANCE_CATEGORIES[catId]?.shortName || `Category ${catId}`, items: [] };
          grouped[catId].items.push({
            compliance_name:    item.description || '',
            compliance_id:      item.compliance_id || null,
            sub_compliance_id:  item.sub_compliance_category || null,
            quantity:           item.quantity || 1,
            unit:               item.unit || '',
            item_sac_code:      item.sac_code || '',
            Professional_amount: parseFloat(item.Professional_amount || 0),
            material_rate:      parseFloat(item.material_rate || 0),
            material_amount:    parseFloat(item.material_amount || 0),
            labour_rate:        parseFloat(item.labour_rate || 0),
            labour_amount:      parseFloat(item.labour_amount || 0),
            total_amount:       parseFloat(item.total_amount || 0),
            _itemId:            item.id || null,
          });
        });
        setSections(Object.values(grouped));
      }
      return;
    }

    const draft = loadDraft();
    if (draft) {
      if (draft.sections?.length)            setSections(draft.sections);
      if (draft.sacCode)                     setSacCode(draft.sacCode);
      if (draft.gstEnabled !== undefined)    setGstEnabled(draft.gstEnabled);
      if (draft.gstRate !== undefined)       setGstRate(draft.gstRate);
      if (draft.discountType)               setDiscountType(draft.discountType);
      if (draft.discountValue !== undefined) setDiscountValue(draft.discountValue);
      if (draft.selectedCompanyId) {
        const co = COMPANIES.find(c => c.id === draft.selectedCompanyId);
        if (co) setSelectedCompany(co);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save draft
  useEffect(() => {
    saveDraft({ sections, sacCode, gstEnabled, gstRate, discountType, discountValue, selectedCompanyId: selectedCompany?.id });
  }, [sections, sacCode, gstEnabled, gstRate, discountType, discountValue, selectedCompany]);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchVendorsList = async () => {
    try {
      const response = await getVendors({ page: 1, page_size: 100 });
      if (response.status === 'success' && response.data) setVendors(response.data.results || []);
    } catch (err) { logger.error('Failed to fetch vendors:', err); }
  };

  const fetchProjectsList = async () => {
    setProjectsLoading(true);
    try {
      const response = await getProjects({ page: 1, page_size: 100 });
      if (response.status === 'success' && response.data) setAllProjects(response.data.results || []);
    } catch (err) { logger.error('Failed to fetch projects:', err); }
    finally { setProjectsLoading(false); }
  };

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
    setDescriptionMode('dropdown');
    try {
      const results = await getComplianceDescriptions(categoryId, subCategoryId || null);
      descriptionsCacheRef.current[cacheKey] = results;
      setComplianceDescriptions(results);
      setDescriptionMode(results.length > 0 ? 'dropdown' : 'manual');
    } catch {
      descriptionsCacheRef.current[cacheKey] = [];
      setComplianceDescriptions([]);
      setDescriptionMode('manual');
    } finally { setComplianceDescLoading(false); }
  };

  // ── Close dropdowns on outside click ─────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.vendor-dropdown'))      setShowVendorDropdown(false);
      if (!e.target.closest('.project-dropdown'))     setShowProjectDropdown(false);
      if (!e.target.closest('.company-dropdown'))     setShowCompanyDropdown(false);
      if (!e.target.closest('.description-dropdown')) setShowDescriptionDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modal scroll lock
  useEffect(() => {
    if (showAddSection) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top      = `-${scrollY}px`;
      document.body.style.width    = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top      = '';
      document.body.style.width    = '';
      document.body.style.overflow = '';
      if (scrollY) window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    return () => { document.body.style.position = ''; document.body.style.top = ''; document.body.style.width = ''; document.body.style.overflow = ''; };
  }, [showAddSection]);

  // ── Calculations ──────────────────────────────────────────────────────────
  const calcItemTotal = (item) => {
    const qty      = parseInt(item.quantity, 10) || 1;
    const matAmt   = parseFloat(item.material_amount) || 0;
    const labAmt   = parseFloat(item.labour_amount)   || 0;
    const matRate  = parseFloat(item.material_rate)   || 0;
    const labRate  = parseFloat(item.labour_rate)     || 0;
    // If mat/lab breakdown amounts provided, use those
    if (matAmt > 0 || labAmt > 0) return Math.round((matAmt + labAmt) * 100) / 100;
    // If mat/lab rates provided, derive amounts from rate × qty
    if (matRate > 0 || labRate > 0) return Math.round(((matRate + labRate) * qty) * 100) / 100;
    // Otherwise use Professional_amount (Rate field) × qty
    const profRate = parseFloat(item.Professional_amount) || 0;
    return Math.round((profRate * qty) * 100) / 100;
  };

  const calculateSubTotal  = () => sections.reduce((t, s) => t + s.items.reduce((st, i) => st + calcItemTotal(i), 0), 0);
  const calculateDiscount  = () => {
    const sub = calculateSubTotal();
    if (discountType === 'Percentage') return Math.round(((sub * parseFloat(discountValue || 0)) / 100) * 100) / 100;
    return Math.round(parseFloat(discountValue || 0) * 100) / 100;
  };
  const calculateGST       = () => {
    if (!gstEnabled) return 0;
    return Math.round(((calculateSubTotal() - calculateDiscount()) * parseFloat(gstRate || 0) / 100) * 100) / 100;
  };
  const calculateGrandTotal = () => Math.round((calculateSubTotal() - calculateDiscount() + calculateGST()) * 100) / 100;

  // ── Per-category helpers ──────────────────────────────────────────────────
  const getActiveItemForm     = ()    => itemFormMap[activeCategoryId]             || { ...BLANK_ITEM_FORM };
  const getActiveEditingIndex = ()    => editingItemIndexMap[activeCategoryId]     ?? null;
  const getActiveItems        = ()    => categoryItemsMap[activeCategoryId]?.items || [];

  const setActiveItemForm = (updater) => setItemFormMap(prev => {
    const cur  = prev[activeCategoryId] || { ...BLANK_ITEM_FORM };
    const next = typeof updater === 'function' ? updater(cur) : updater;
    return { ...prev, [activeCategoryId]: next };
  });
  const setActiveItems = (updater) => setCategoryItemsMap(prev => {
    const cur      = prev[activeCategoryId] || { items: [], category_name: COMPLIANCE_CATEGORIES[activeCategoryId]?.shortName || '' };
    const nextItems = typeof updater === 'function' ? updater(cur.items) : updater;
    return { ...prev, [activeCategoryId]: { ...cur, items: nextItems } };
  });
  const setActiveEditingIndex = (idx) => setEditingItemIndexMap(prev => ({ ...prev, [activeCategoryId]: idx }));

  const getUsedDescriptions = () => {
    const used = new Set();
    Object.values(categoryItemsMap).forEach(catData => {
      (catData.items || []).forEach(item => { if (item.compliance_name) used.add(item.compliance_name); });
    });
    return used;
  };

  // ── Section handlers ──────────────────────────────────────────────────────
  const handleSelectCategoryType = () => {
    // Only execution type for PO
    setSelectedCategoryType('execution');
    const firstId = EXECUTION_CAT_IDS[0];
    setCategoryItemsMap(prev => {
      const n = { ...prev };
      EXECUTION_CAT_IDS.forEach(id => { if (!n[id]) n[id] = { items: [], category_name: COMPLIANCE_CATEGORIES[id].shortName }; });
      return n;
    });
    setActiveCategoryId(firstId);
    setItemFormMap(prev => { const n = { ...prev }; EXECUTION_CAT_IDS.forEach(id => { n[id] = { ...BLANK_ITEM_FORM }; }); return n; });
    setEditingItemIndexMap(prev => { const n = { ...prev }; EXECUTION_CAT_IDS.forEach(id => { n[id] = null; }); return n; });
    setComplianceDescriptions([]); setDescriptionMode('dropdown'); setDescriptionSearch(''); setShowDescriptionDropdown(false);
    fetchComplianceDescriptions(firstId, null);
    setShowAddSection(true);
  };

  const handleAddItem = () => {
    const itemForm = getActiveItemForm();
    const complianceName = sanitizeDescription(itemForm.compliance_name);
    if (!complianceName) return;
    const newItem = {
      compliance_name:    complianceName,
      compliance_id:      itemForm.compliance_id || null,
      sub_compliance_id:  itemForm.sub_compliance_id || null,
      quantity:           parseInt(itemForm.quantity, 10) || 1,
      unit:               String(itemForm.unit || '').trim(),
      item_sac_code:      String(itemForm.item_sac_code || '').trim(),
      Professional_amount: parseFloat(itemForm.Professional_amount) || 0,
      material_rate:      parseFloat(itemForm.material_rate)   || 0,
      material_amount:    parseFloat(itemForm.material_amount) || 0,
      labour_rate:        parseFloat(itemForm.labour_rate)     || 0,
      labour_amount:      parseFloat(itemForm.labour_amount)   || 0,
      total_amount:       calcItemTotal(itemForm),
    };
    const editIdx = getActiveEditingIndex();
    if (editIdx !== null) { setActiveItems(prev => prev.map((item, i) => i === editIdx ? newItem : item)); setActiveEditingIndex(null); }
    else { setActiveItems(prev => [...prev, newItem]); }
    setActiveItemForm({ ...BLANK_ITEM_FORM, sub_compliance_id: itemForm.sub_compliance_id });
    setDescriptionSearch(''); setShowDescriptionDropdown(false); setDescSelectedFromDropdown(false);
  };

  const handleEditItem = (index) => {
    const item = getActiveItems()[index];
    setActiveItemForm({
      compliance_name:    item.compliance_name,
      compliance_id:      item.compliance_id || null,
      sub_compliance_id:  item.sub_compliance_id || null,
      quantity:           item.quantity || 1,
      unit:               item.unit || '',
      item_sac_code:      item.item_sac_code || '',
      Professional_amount: parseFloat(item.Professional_amount) || 0,
      material_rate:      parseFloat(item.material_rate)   || 0,
      material_amount:    parseFloat(item.material_amount) || 0,
      labour_rate:        parseFloat(item.labour_rate)     || 0,
      labour_amount:      parseFloat(item.labour_amount)   || 0,
    });
    setActiveEditingIndex(index);
    setDescSelectedFromDropdown(true);
    fetchComplianceDescriptions(activeCategoryId, item.sub_compliance_id || null);
  };

  const handleRemoveItem = (index) => {
    if (getActiveEditingIndex() === index) { setActiveEditingIndex(null); setActiveItemForm({ ...BLANK_ITEM_FORM }); }
    setActiveItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddSection = () => {
    const totalItems = Object.values(categoryItemsMap).reduce((sum, cat) => sum + (cat.items?.length || 0), 0);
    if (totalItems === 0) return;

    if (editingSection !== null) {
      setSections(prev => {
        let next = [...prev];
        Object.entries(categoryItemsMap).forEach(([catIdStr, catData]) => {
          const catId    = parseInt(catIdStr, 10);
          const items    = catData.items || [];
          const existing = next.findIndex(s => s.category_id === catId);
          if (items.length > 0) {
            if (existing !== -1) next[existing] = { ...next[existing], items };
            else next = [...next, { category_id: catId, category_name: COMPLIANCE_CATEGORIES[catId]?.shortName || catData.category_name, items }];
          } else if (existing !== -1 && existing === editingSection) {
            next = next.filter((_, i) => i !== existing);
          }
        });
        return next;
      });
    } else {
      setSections(prev => {
        let next = [...prev];
        Object.entries(categoryItemsMap).forEach(([catIdStr, catData]) => {
          const catId    = parseInt(catIdStr, 10);
          const newItems = catData.items || [];
          if (newItems.length === 0) return;
          const existingIndex = next.findIndex(s => s.category_id === catId);
          if (existingIndex !== -1) {
            next[existingIndex] = { ...next[existingIndex], items: [...next[existingIndex].items, ...newItems] };
          } else {
            next = [...next, { category_id: catId, category_name: COMPLIANCE_CATEGORIES[catId]?.shortName || catData.category_name, items: newItems }];
          }
        });
        return next;
      });
    }
    closeModal();
  };

  const handleEditSection = (index) => {
    const section    = sections[index];
    setEditingSection(index);
    setSectionForm({ ...section });
    const categoryId = section.category_id;
    const execMap    = {};
    EXECUTION_CAT_IDS.forEach(cId => {
      execMap[cId] = cId === categoryId
        ? { items: [...section.items], category_name: section.category_name }
        : { items: [], category_name: COMPLIANCE_CATEGORIES[cId]?.shortName || '' };
    });
    setCategoryItemsMap(execMap);
    setActiveCategoryId(categoryId);
    setSelectedCategoryType('execution');
    const formMap = {};
    EXECUTION_CAT_IDS.forEach(cId => { formMap[cId] = { ...BLANK_ITEM_FORM }; });
    setItemFormMap(formMap);
    const editIdxMap = {};
    EXECUTION_CAT_IDS.forEach(cId => { editIdxMap[cId] = null; });
    setEditingItemIndexMap(editIdxMap);
    setComplianceDescriptions([]); setDescriptionMode('dropdown'); setDescriptionSearch(''); setShowDescriptionDropdown(false);
    fetchComplianceDescriptions(categoryId, null);
    setShowAddSection(true);
  };

  const handleEditItemFromTable = (sectionIndex, itemIndex) => {
    const section    = sections[sectionIndex];
    setEditingSection(sectionIndex);
    setSectionForm({ ...section });
    const categoryId = section.category_id;
    const execMap    = {};
    EXECUTION_CAT_IDS.forEach(cId => {
      execMap[cId] = cId === categoryId
        ? { items: [...section.items], category_name: section.category_name }
        : { items: [], category_name: COMPLIANCE_CATEGORIES[cId]?.shortName || '' };
    });
    setCategoryItemsMap(execMap);
    setActiveCategoryId(categoryId);
    setSelectedCategoryType('execution');
    const item = section.items[itemIndex];
    const formMap = {};
    EXECUTION_CAT_IDS.forEach(cId => {
      formMap[cId] = cId === categoryId ? {
        compliance_name:    item.compliance_name || '',
        compliance_id:      item.compliance_id || null,
        sub_compliance_id:  item.sub_compliance_id || null,
        quantity:           item.quantity || 1,
        unit:               item.unit || '',
        item_sac_code:      item.item_sac_code || '',
        Professional_amount: parseFloat(item.Professional_amount) || 0,
        material_rate:      parseFloat(item.material_rate)   || 0,
        material_amount:    parseFloat(item.material_amount) || 0,
        labour_rate:        parseFloat(item.labour_rate)     || 0,
        labour_amount:      parseFloat(item.labour_amount)   || 0,
      } : { ...BLANK_ITEM_FORM };
    });
    setItemFormMap(formMap);
    const editIdxMap = {};
    EXECUTION_CAT_IDS.forEach(cId => { editIdxMap[cId] = cId === categoryId ? itemIndex : null; });
    setEditingItemIndexMap(editIdxMap);
    fetchComplianceDescriptions(categoryId, item.sub_compliance_id || null);
    setDescriptionSearch(''); setShowDescriptionDropdown(false);
    setShowAddSection(true);
  };

  const handleDeleteSection = (index) => setDeleteConfirm({ show: true, type: 'section', sectionIndex: index, itemIndex: null });
  const handleRemoveItemFromSection = (sectionIndex, itemIndex) => setDeleteConfirm({ show: true, type: 'item', sectionIndex, itemIndex });

  const confirmDelete = () => {
    if (deleteConfirm.type === 'section') {
      setSections(prev => prev.filter((_, i) => i !== deleteConfirm.sectionIndex));
    } else {
      setSections(prev => {
        const updated = [...prev];
        updated[deleteConfirm.sectionIndex].items = updated[deleteConfirm.sectionIndex].items.filter((_, i) => i !== deleteConfirm.itemIndex);
        return updated;
      });
    }
    setDeleteConfirm({ show: false, type: null, sectionIndex: null, itemIndex: null });
  };

  const cancelDelete = () => setDeleteConfirm({ show: false, type: null, sectionIndex: null, itemIndex: null });

  const handleCategoryChange = (categoryId) => {
    setActiveCategoryId(categoryId);
    setCategoryItemsMap(prev => {
      if (prev[categoryId]) return prev;
      return { ...prev, [categoryId]: { items: [], category_name: COMPLIANCE_CATEGORIES[categoryId]?.shortName || '' } };
    });
    setComplianceDescriptions([]); setDescriptionMode('dropdown'); setDescriptionSearch(''); setShowDescriptionDropdown(false);
    setActiveItemForm({ ...BLANK_ITEM_FORM });
    setDescSelectedFromDropdown(false);
    fetchComplianceDescriptions(categoryId, null);
  };

  const closeModal = () => {
    setShowAddSection(false);
    setSectionForm({ category_id: null, category_name: '', items: [] });
    setCategoryItemsMap({}); setActiveCategoryId(null); setItemFormMap({}); setEditingItemIndexMap({});
    setEditingSection(null);
    setComplianceDescriptions([]); setDescriptionMode('dropdown'); setDescriptionSearch(''); setShowDescriptionDropdown(false); setDescSelectedFromDropdown(false);
    setSelectedCategoryType(null);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedVendor)       { setError('Please select a vendor');                     return; }
    if (!selectedProject)      { setError('Please select a project');                    return; }
    if (!selectedCompany)      { setError('Please select a company');                    return; }
    if (sections.length === 0) { setError('Please add at least one compliance section'); return; }
    if (!sacCode.trim())       { setError('Please enter a SAC code');                   return; }

    setSubmitting(true); setError('');

    try {
      // Build items with execution fields
      const allItems = sections.flatMap(section =>
        section.items.map(item => {
          const description = sanitizeDescription(item.compliance_name);
          const quantity    = parseInt(item.quantity, 10);
          if (!description) throw new Error('Item description cannot be empty');
          if (isNaN(quantity) || quantity <= 0) throw new Error(`Invalid quantity for: ${description}`);

          const profRate = parseFloat(item.Professional_amount) || 0;
          const matRate  = parseFloat(item.material_rate) || 0;
          const labRate  = parseFloat(item.labour_rate)   || 0;
          const matAmt   = parseFloat(item.material_amount) || 0;
          const labAmt   = parseFloat(item.labour_amount)   || 0;

          if (profRate <= 0 && matAmt <= 0 && labAmt <= 0 && matRate <= 0 && labRate <= 0) {
            throw new Error(`Rate must be greater than 0 for: ${description}`);
          }

          const total = (matAmt || labAmt)
            ? parseFloat((matAmt + labAmt).toFixed(2))
            : parseFloat((profRate * quantity).toFixed(2));

          return {
            ...(isEditMode && item._itemId ? { id: item._itemId } : {}),
            description,
            quantity,
            unit:                    String(item.unit || '').trim() || null,
            sac_code:                String(item.item_sac_code || '').trim(),
            Professional_amount:     profRate.toFixed(2),
            material_rate:           matRate.toFixed(2),
            material_amount:         matAmt.toFixed(2),
            labour_rate:             labRate.toFixed(2),
            labour_amount:           labAmt.toFixed(2),
            total_amount:            total,
            compliance_category:     parseInt(section.category_id),
            sub_compliance_category: parseInt(item.sub_compliance_id || 0),
          };
        })
      );

      const subTotal   = calculateSubTotal();
      const gstAmt     = calculateGST();
      const grandTotal = calculateGrandTotal();

      let discountRateStr = '0';
      if (parseFloat(discountValue) > 0) {
        discountRateStr = discountType === 'Percentage'
          ? String(parseFloat(discountValue).toFixed(2))
          : subTotal > 0 ? ((parseFloat(discountValue) / subTotal) * 100).toFixed(2) : '0';
      }

      const vendorId  = Number(selectedVendor.id);
      const projectId = Number(selectedProject.id);
      if (isNaN(vendorId)  || vendorId  <= 0) throw new Error('Invalid vendor ID');
      if (isNaN(projectId) || projectId <= 0) throw new Error('Invalid project ID');

      // ── Edit mode ──
      if (isEditMode) {
        const updatePayload = {
          id:               parseInt(editQuotation.id),
          company:          selectedCompany.id,
          vendor:           vendorId,
          project:          projectId,
          gst_rate:         String(gstEnabled ? (parseFloat(gstRate) || 0).toFixed(2) : '0'),
          discount_rate:    discountRateStr,
          sac_code:         sacCode.trim(),
          total_amount:     subTotal.toFixed(2),
          total_gst_amount: gstAmt.toFixed(2),
          grand_total:      grandTotal.toFixed(2),
          items:            allItems,
        };
        const response = await updatePurchaseOrder(updatePayload);
        if (response.status === 'success' || response.data?.status === 'success' || response.id) {
          const updated = response.data || response;
          setCreatedOrder({ id: updated.id || editQuotation.id, quotation_number: updated.quotation_number || editQuotation.quotation_number });
          setShowSuccessModal(true);
        } else { setError(response.message || 'Failed to update purchase order'); }
        return;
      }

      // ── Create mode — backend generates quotation_number ──
      const quotationData = {
        // NO quotation_number — backend generates it (PO-YYYYMM-xxx)
        company:          selectedCompany.id,
        vendor:           vendorId,
        project:          projectId,
        gst_rate:         String(gstEnabled ? (parseFloat(gstRate) || 0).toFixed(2) : '0'),
        discount_rate:    discountRateStr,
        sac_code:         sacCode.trim(),
        total_amount:     subTotal.toFixed(2),
        total_gst_amount: gstAmt.toFixed(2),
        grand_total:      grandTotal.toFixed(2),
        items:            allItems,
      };

      logger.log('📤 CREATE PO PAYLOAD:', JSON.stringify(quotationData, null, 2));

      // Uses create_execution_quotation endpoint which handles vendor → purchase order
      const response = await createPurchaseOrder(quotationData);
      if (response.status === 'success' || response.data?.status === 'success') {
        setCreatedOrder(response.data || response);
        clearDraft();
        setShowSuccessModal(true);
      } else { setError(response.message || response.data?.message || 'Failed to create purchase order'); }

    } catch (err) {
      console.error('❌ SUBMIT ERROR:', err.message);
      setError(err.message || (isEditMode ? 'Failed to update purchase order' : 'Failed to create purchase order'));
    } finally { setSubmitting(false); }
  };

  // ── Filtered lists ────────────────────────────────────────────────────────
  const filteredVendors  = vendors.filter(v => {
    const n = (v.name || v.company_name || '').toLowerCase();
    const e = (v.email || '').toLowerCase();
    return n.includes(vendorSearch.toLowerCase()) || e.includes(vendorSearch.toLowerCase());
  });
  const filteredProjects = allProjects.filter(p =>
    (p.name || p.title || '').toLowerCase().includes(projectSearch.toLowerCase())
  );

  // ── Modal computed vars ───────────────────────────────────────────────────
  const isEditSectionMode     = editingSection !== null;
  const modalItemForm         = isEditSectionMode ? (itemFormMap[activeCategoryId] || BLANK_ITEM_FORM) : getActiveItemForm();
  const modalEditingItemIndex = isEditSectionMode ? (editingItemIndexMap[activeCategoryId] ?? null) : getActiveEditingIndex();
  const modalActiveItems      = isEditSectionMode ? (categoryItemsMap[activeCategoryId]?.items || []) : getActiveItems();

  const modalUsedDescriptions = (() => {
    const used = new Set();
    modalActiveItems.forEach((item, i) => { if (i === modalEditingItemIndex) return; if (item.compliance_name) used.add(item.compliance_name); });
    if (!isEditSectionMode) {
      getUsedDescriptions().forEach(d => used.add(d));
      if (modalEditingItemIndex !== null && modalActiveItems[modalEditingItemIndex]?.compliance_name) used.delete(modalActiveItems[modalEditingItemIndex].compliance_name);
    }
    return used;
  })();

  const modalSetItemForm = isEditSectionMode
    ? (updater) => setItemFormMap(prev => { const cur = prev[activeCategoryId] || BLANK_ITEM_FORM; return { ...prev, [activeCategoryId]: typeof updater === 'function' ? updater(cur) : updater }; })
    : setActiveItemForm;
  const modalSetEditingIdx = isEditSectionMode
    ? (idx) => setEditingItemIndexMap(prev => ({ ...prev, [activeCategoryId]: idx }))
    : setActiveEditingIndex;
  const modalAddItem = isEditSectionMode
    ? () => {
        const f = modalItemForm;
        const complianceName = sanitizeDescription(f.compliance_name);
        if (!complianceName) return;
        const newItem = {
          compliance_name:    complianceName, compliance_id: f.compliance_id || null, sub_compliance_id: f.sub_compliance_id || null,
          quantity:           parseInt(f.quantity, 10) || 1, unit: String(f.unit || '').trim(), item_sac_code: String(f.item_sac_code || '').trim(),
          Professional_amount: parseFloat(f.Professional_amount) || 0,
          material_rate: parseFloat(f.material_rate) || 0, material_amount: parseFloat(f.material_amount) || 0,
          labour_rate: parseFloat(f.labour_rate) || 0, labour_amount: parseFloat(f.labour_amount) || 0,
          total_amount: calcItemTotal(f),
        };
        if (modalEditingItemIndex !== null) { setActiveItems(prev => prev.map((it, i) => i === modalEditingItemIndex ? newItem : it)); modalSetEditingIdx(null); }
        else { setActiveItems(prev => [...prev, newItem]); }
        modalSetItemForm({ ...BLANK_ITEM_FORM, sub_compliance_id: f.sub_compliance_id });
        setDescriptionSearch(''); setShowDescriptionDropdown(false); setDescSelectedFromDropdown(false);
      }
    : handleAddItem;
  const modalEditItem = isEditSectionMode
    ? (index) => {
        const item = categoryItemsMap[activeCategoryId]?.items?.[index];
        if (!item) return;
        modalSetItemForm({
          compliance_name: item.compliance_name, compliance_id: item.compliance_id || null, sub_compliance_id: item.sub_compliance_id || null,
          quantity: item.quantity || 1, unit: item.unit || '', item_sac_code: item.item_sac_code || '',
          Professional_amount: parseFloat(item.Professional_amount) || 0,
          material_rate: parseFloat(item.material_rate) || 0, material_amount: parseFloat(item.material_amount) || 0,
          labour_rate: parseFloat(item.labour_rate) || 0, labour_amount: parseFloat(item.labour_amount) || 0,
        });
        modalSetEditingIdx(index);
        setDescSelectedFromDropdown(true);
        fetchComplianceDescriptions(activeCategoryId, item.sub_compliance_id || null);
      }
    : handleEditItem;
  const modalRemoveItem = isEditSectionMode
    ? (index) => { if (modalEditingItemIndex === index) { modalSetEditingIdx(null); modalSetItemForm({ ...BLANK_ITEM_FORM }); } setActiveItems(prev => prev.filter((_, i) => i !== index)); }
    : handleRemoveItem;

  const modalTotalItems   = Object.values(categoryItemsMap).reduce((sum, cat) => sum + (cat.items?.length || 0), 0);
  const modalSaveDisabled = Object.values(categoryItemsMap).every(cat => (cat.items?.length || 0) === 0);

  const canAddItem = modalItemForm.compliance_name.trim() &&
    (parseFloat(modalItemForm.Professional_amount) > 0 || parseFloat(modalItemForm.material_rate) > 0 || parseFloat(modalItemForm.material_amount) > 0 || parseFloat(modalItemForm.labour_rate) > 0 || parseFloat(modalItemForm.labour_amount) > 0);

  // Sub-compliance for current category
  const subOptions = SUB_COMPLIANCE_BY_CATEGORY[activeCategoryId] || [];

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto">

        {/* ── Header Card ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-3">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>

                {/* COMPANY DROPDOWN — leftmost, like quotations.jsx */}
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
                        {COMPANIES.map((co) => (
                          <button
                            key={co.id}
                            onClick={() => { setSelectedCompany(co); setShowCompanyDropdown(false); }}
                            className={`w-full px-4 py-2.5 text-left hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-0 flex items-center justify-between ${selectedCompany?.id === co.id ? 'bg-teal-50' : ''}`}
                          >
                            <span className="text-sm font-medium text-gray-900">{co.name}</span>
                            {selectedCompany?.id === co.id && (
                              <div className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <ChevronRight className="w-4 h-4 text-gray-400" />

                {/* VENDOR DROPDOWN */}
                <div className="vendor-dropdown relative">
                  <button onClick={() => setShowVendorDropdown(!showVendorDropdown)}
                    className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors group">
                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <h1 className="text-base font-semibold text-gray-900">
                          {selectedVendor ? (selectedVendor.name || selectedVendor.company_name) : 'Select Vendor'}
                        </h1>
                        <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                      </div>
                      <p className="text-xs text-gray-500">{selectedVendor?.email || 'Click to select a vendor'}</p>
                    </div>
                  </button>

                  {showVendorDropdown && (
                    <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                      <div className="p-3 border-b border-gray-200 bg-gray-50">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input type="text" placeholder="Search vendors..." value={vendorSearch} onChange={e => setVendorSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" onClick={e => e.stopPropagation()} />
                        </div>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {filteredVendors.length > 0 ? filteredVendors.map(vendor => (
                          <button key={vendor.id} onClick={() => { setSelectedVendor(vendor); setShowVendorDropdown(false); setVendorSearch(''); }}
                            className={`w-full px-4 py-3 text-left hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-0 ${selectedVendor?.id === vendor.id ? 'bg-teal-50 border-l-4 border-l-teal-500' : ''}`}>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-teal-600" /></div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 text-sm truncate">{vendor.name || vendor.company_name}</div>
                                <div className="text-xs text-gray-500 truncate">{vendor.email}</div>
                              </div>
                              {selectedVendor?.id === vendor.id && (
                                <div className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                              )}
                            </div>
                          </button>
                        )) : (
                          <div className="px-4 py-8 text-center text-gray-500 text-sm"><User className="w-8 h-8 text-gray-300 mx-auto mb-2" /><p>No vendors found</p></div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* PROJECT DROPDOWN */}
                {selectedVendor && (
                  <>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <div className="project-dropdown relative">
                      <button onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                        className="flex items-center gap-3 hover:bg-gray-50 rounded-lg px-3 py-2 -ml-3 transition-colors group">
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <h2 className="text-base font-semibold text-gray-900">
                              {selectedProject ? (selectedProject.name || selectedProject.title) : 'Select Project'}
                            </h2>
                            <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                          </div>
                          <p className="text-xs text-gray-500">
                            {selectedProject ? [selectedProject.city, selectedProject.state].filter(Boolean).join(', ') || 'No location' : 'Click to select a project'}
                          </p>
                        </div>
                      </button>

                      {showProjectDropdown && (
                        <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                          <div className="p-3 border-b border-gray-200 bg-gray-50">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input type="text" placeholder="Search projects..." value={projectSearch} onChange={e => setProjectSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" onClick={e => e.stopPropagation()} />
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {projectsLoading ? (
                              <div className="px-4 py-8 text-center text-gray-500 text-sm"><Loader2 className="w-6 h-6 text-teal-500 animate-spin mx-auto mb-2" /><p>Loading projects...</p></div>
                            ) : filteredProjects.length > 0 ? filteredProjects.map(project => (
                              <button key={project.id} onClick={() => { setSelectedProject(project); setShowProjectDropdown(false); setProjectSearch(''); }}
                                className={`w-full px-4 py-3 text-left hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-0 ${selectedProject?.id === project.id ? 'bg-teal-50' : ''}`}>
                                <div className="font-medium text-gray-900 text-sm">{project.name || project.title}</div>
                                <div className="text-xs text-gray-500">{[project.city, project.state].filter(Boolean).join(', ') || 'No location'}</div>
                              </button>
                            )) : (
                              <div className="px-4 py-8 text-center text-gray-500 text-sm"><FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" /><p>No projects found</p></div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Right: SAC Code + Submit */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 whitespace-nowrap">SAC Code <span className="text-red-500">*</span></label>
                  <input type="text" value={sacCode} onChange={e => setSacCode(e.target.value)} placeholder="e.g. 998313" required
                    className="w-28 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors bg-white" />
                </div>

                <button onClick={handleSubmit}
                  disabled={submitting || sections.length === 0 || !selectedVendor || !selectedProject || !selectedCompany}
                  className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                  {submitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" />{isEditMode ? 'Updating...' : 'Generating...'}</>
                    : <><FileText className="w-4 h-4" />{isEditMode ? 'Update Purchase Order' : 'Generate Purchase Order'}</>}
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
              <p className="text-sm font-semibold text-amber-800">Editing Purchase Order</p>
              <p className="text-xs text-amber-600 mt-0.5">You are updating an existing purchase order. All changes will overwrite the current data.</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1"><p className="text-sm font-medium text-red-800">{error}</p></div>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 transition-colors"><X className="w-4 h-4" /></button>
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
                  <h2 className="text-lg font-semibold text-gray-900">Purchase Order Builder</h2>
                </div>
                <button onClick={handleSelectCategoryType}
                  className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2 text-sm font-medium">
                  <Plus className="w-4 h-4" />Add Compliance
                </button>
              </div>

              {/* Table header */}
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-3 text-xs font-semibold text-gray-600 uppercase">Description</div>
                  <div className="col-span-1 text-xs font-semibold text-gray-600 uppercase text-center">Qty</div>
                  <div className="col-span-1 text-xs font-semibold text-gray-600 uppercase text-center">Unit</div>
                  <div className="col-span-1 text-xs font-semibold text-gray-600 uppercase text-center">SAC</div>
                  <div className="col-span-2 text-xs font-semibold text-gray-600 uppercase text-center">Rate (Rs.)</div>
                  <div className="col-span-2 text-xs font-semibold text-gray-600 uppercase text-center">Mat + Lab</div>
                  <div className="col-span-2 text-xs font-semibold text-gray-600 uppercase text-right">Total</div>
                </div>
              </div>

              <div className="px-6 py-4">
                {sections.length === 0 ? (
                  <div className="py-12 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No compliance added yet</p>
                    <p className="text-gray-400 text-xs mt-1">Click "Add Compliance" to get started</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {sections.map((section, sectionIndex) => (
                      <div key={sectionIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-teal-500 rounded-full"></div>
                            <span className="text-sm font-semibold text-gray-900">{section.category_name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600">Subtotal: <span className="font-semibold text-gray-900">Rs. {section.items.reduce((sum, item) => sum + calcItemTotal(item), 0).toLocaleString('en-IN')}</span></span>
                            <button onClick={() => handleEditSection(sectionIndex)} className="text-teal-500 hover:text-teal-600 text-sm font-medium flex items-center gap-1 transition-colors"><Plus className="w-4 h-4" />Add Item</button>
                            <button onClick={() => handleDeleteSection(sectionIndex)} className="text-red-500 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                        <div className="bg-white">
                          {section.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="grid grid-cols-12 gap-2 items-center px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors group">
                              <div className="col-span-3"><p className="text-sm text-gray-900 leading-relaxed">{item.compliance_name}</p></div>
                              <div className="col-span-1 text-center"><span className="text-sm text-gray-700">{item.quantity}</span></div>
                              <div className="col-span-1 text-center"><span className="text-xs text-gray-500">{item.unit || '—'}</span></div>
                              <div className="col-span-1 text-center"><span className="text-xs text-gray-500">{item.item_sac_code || '—'}</span></div>
                              <div className="col-span-2 text-center"><span className="text-sm text-gray-700">Rs. {parseFloat(item.Professional_amount || 0).toLocaleString('en-IN')}</span></div>
                              <div className="col-span-2 text-center">
                                {(parseFloat(item.material_amount) > 0 || parseFloat(item.labour_amount) > 0) ? (
                                  <span className="text-xs text-gray-500">M: {parseFloat(item.material_amount||0).toLocaleString('en-IN')} / L: {parseFloat(item.labour_amount||0).toLocaleString('en-IN')}</span>
                                ) : <span className="text-xs text-gray-400">—</span>}
                              </div>
                              <div className="col-span-2 text-right flex items-center justify-end gap-1.5">
                                <span className="text-sm font-semibold text-gray-900">Rs. {calcItemTotal(item).toLocaleString('en-IN')}</span>
                                <button onClick={() => handleEditItemFromTable(sectionIndex, itemIndex)} className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-600 p-1 hover:bg-blue-50 rounded transition-all" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleRemoveItemFromSection(sectionIndex, itemIndex)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-all"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column — Order Summary */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 sticky top-4 overflow-hidden">
              {/* Summary header */}
              <div className="px-5 py-4 bg-gradient-to-r from-teal-600 to-teal-500 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Order Summary</h3>
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
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 uppercase tracking-wide">Non-GST</span>
                      )}
                    </div>
                    {selectedCompany?.id === 1 ? (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={gstEnabled} onChange={e => setGstEnabled(e.target.checked)} className="sr-only peer" />
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
                        <input type="number" value={gstRate} onChange={e => setGstRate(parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1 text-xs border border-teal-200 rounded-lg text-right bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
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
                    <span className="text-sm text-gray-500 font-medium flex items-center gap-1.5"><span>🎁</span> Discount</span>
                  </div>
                  <div className="bg-gray-50 rounded-xl px-3 py-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-600 font-medium">Rate (%)</label>
                      <input type="number" value={discountValue === 0 ? '' : discountValue} onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)} placeholder="0"
                        className="w-16 px-2 py-1 text-xs border border-gray-200 rounded-lg text-right bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
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
                      <div className="text-lg font-bold text-gray-900">{sections.reduce((sum, s) => sum + s.items.reduce((is, i) => is + (parseInt(i.quantity) || 0), 0), 0)}</div>
                      <div className="text-[10px] text-gray-400 font-medium mt-0.5 uppercase tracking-wide">Qty</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-gray-900">Total: Rs. {calculateGrandTotal().toLocaleString('en-IN')}</span>
                <span className="text-sm text-gray-600">Items: {sections.reduce((sum, s) => sum + s.items.length, 0)}</span>
                <span className="text-sm text-gray-600">Status: <span className="text-orange-500 font-medium">Draft</span></span>
                {sections.length > 0 && (
                  <span className="flex items-center gap-1.5 text-xs text-teal-600 font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    Auto-saved
                  </span>
                )}
                {sections.length > 0 && (
                  <button onClick={() => { if (window.confirm('Clear all draft data?')) { clearDraft(); setSections([]); setSelectedVendor(null); setSelectedProject(null); setSacCode(''); setGstRate(18); setDiscountValue(0); setSelectedCompany(COMPANIES[0]); } }}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors">Clear draft</button>
                )}
              </div>
              <button onClick={handleSubmit}
                disabled={submitting || sections.length === 0 || !selectedVendor || !selectedProject || !selectedCompany}
                className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" />{isEditMode ? 'Updating...' : 'Generating...'}</>
                  : <><FileText className="w-4 h-4" />{isEditMode ? 'Update Purchase Order' : 'Create Purchase Order'}</>}
              </button>
            </div>
          </div>
        </div>

        {/* ── Add/Edit Compliance Modal ── */}
        {showAddSection && (
          <div className="fixed inset-0 z-[9999] animate-fadeIn" style={{ position: 'fixed', overflow: 'hidden' }}>
            <div className="absolute inset-0 bg-black/50" style={{ position: 'fixed', width: '100vw', height: '100vh' }} onClick={closeModal} />
            <div className="relative z-10 flex items-center justify-center p-4" style={{ height: '100vh' }}>
              <div className="relative w-full max-w-2xl animate-scaleIn bg-white flex flex-col"
                style={{ borderRadius: '20px', boxShadow: '0 32px 64px rgba(0,0,0,0.24)', height: '88vh', maxHeight: '820px', minHeight: '480px', overflow: 'hidden' }}
                onClick={e => e.stopPropagation()}>

                {/* Modal Header */}
                <div className="bg-teal-700 px-6 py-4 flex-shrink-0" style={{ borderRadius: '20px 20px 0 0' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center"><Plus className="w-5 h-5 text-white" /></div>
                      <div>
                        <p className="text-white font-bold text-base leading-tight">{editingSection !== null ? 'Edit Compliance' : 'Add New Compliance'}</p>
                        <p className="text-teal-200 text-xs mt-0.5">{COMPLIANCE_CATEGORIES[activeCategoryId]?.name || 'Select a category below'}</p>
                      </div>
                    </div>
                    <button onClick={closeModal} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"><X size={16} className="text-white" /></button>
                  </div>
                </div>

                {/* Modal Scrollable Body */}
                <div className="p-5 space-y-4 bg-gray-50 flex-1" style={{ minHeight: 0, overflowY: 'scroll', scrollbarGutter: 'stable' }}>

                  {/* Category Tabs */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Compliance Category</p>
                    <div className="grid grid-cols-3 gap-2">
                      {EXECUTION_CAT_IDS.map(catId => {
                        const cat       = COMPLIANCE_CATEGORIES[catId];
                        const itemCount = categoryItemsMap[catId]?.items?.length || 0;
                        return (
                          <button key={catId} onClick={() => handleCategoryChange(catId)}
                            className={`px-3 py-2.5 rounded-lg border-2 font-medium text-xs transition-colors relative ${activeCategoryId === catId ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}>
                            {cat?.shortName}
                            {itemCount > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-teal-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{itemCount}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add Item Form */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-visible">
                    <div className={`px-4 py-3 border-b border-gray-100 flex items-center justify-between ${modalEditingItemIndex !== null ? 'bg-amber-50' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2">
                        {modalEditingItemIndex !== null ? (
                          <><div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center"><Edit className="w-3 h-3 text-white" /></div><span className="text-sm font-semibold text-amber-800">Editing Item #{modalEditingItemIndex + 1}</span></>
                        ) : (
                          <><div className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center"><Plus className="w-3 h-3 text-white" /></div><span className="text-sm font-semibold text-gray-700">Add Item</span></>
                        )}
                      </div>
                      {modalEditingItemIndex !== null && (
                        <button onClick={() => { modalSetEditingIdx(null); modalSetItemForm({ ...BLANK_ITEM_FORM }); setDescSelectedFromDropdown(false); }} className="text-xs text-amber-600 hover:text-amber-800 font-medium">Cancel edit</button>
                      )}
                    </div>

                    <div className="p-4 space-y-3">

                      {/* Sub-compliance dropdown (for cats with sub-options) */}
                      {subOptions.length > 0 && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                            Sub-Compliance Category <span className="text-red-400">*</span>
                          </label>
                          <SubComplianceDropdown
                            value={modalItemForm.sub_compliance_id}
                            options={subOptions}
                            onChange={(id) => {
                              modalSetItemForm(prev => ({ ...prev, sub_compliance_id: id, compliance_name: '' }));
                              setDescriptionSearch('');
                              setShowDescriptionDropdown(false);
                              setDescSelectedFromDropdown(false);
                              fetchComplianceDescriptions(activeCategoryId, id);
                            }}
                            placeholder="Select sub-compliance category"
                          />
                        </div>
                      )}

                      {/* Description */}
                      <div className="relative">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description <span className="text-red-400">*</span></label>
                          {complianceDescriptions.length > 0 && (
                            <button type="button" onClick={() => { setDescriptionMode(prev => prev === 'dropdown' ? 'manual' : 'dropdown'); modalSetItemForm(prev => ({ ...prev, compliance_name: '' })); setDescSelectedFromDropdown(false); }}
                              className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                              {descriptionMode === 'dropdown' ? '+ Type manually' : '← Pick from list'}
                            </button>
                          )}
                        </div>
                        {complianceDescLoading ? (
                          <div className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin text-teal-500" />Loading descriptions...</div>
                        ) : descriptionMode === 'dropdown' && complianceDescriptions.length > 0 ? (
                          <div className="description-dropdown relative w-full">
                            {/* Chip + textarea when selected from dropdown */}
                            {modalItemForm.compliance_name && descSelectedFromDropdown && !showDescriptionDropdown ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg">
                                  <div className="w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                  </div>
                                  <span className="text-xs font-semibold text-teal-700 flex-1 truncate">Selected from list — edit below if needed</span>
                                  <button type="button" onClick={() => setShowDescriptionDropdown(true)} className="text-xs text-teal-600 hover:text-teal-800 font-semibold underline underline-offset-2 flex-shrink-0">Change</button>
                                </div>
                                <textarea
                                  value={modalItemForm.compliance_name}
                                  onChange={e => modalSetItemForm(prev => ({ ...prev, compliance_name: e.target.value.slice(0, DESCRIPTION_MAX_LENGTH) }))}
                                  rows={3}
                                  autoFocus
                                  className="w-full px-3 py-2.5 border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none bg-white shadow-sm"
                                  placeholder="Edit the description as needed…"
                                />
                              </div>
                            ) : !descSelectedFromDropdown || showDescriptionDropdown ? (
                              <button type="button"
                                onClick={() => setShowDescriptionDropdown(prev => !prev)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-left flex items-center justify-between bg-white hover:bg-gray-50 transition-colors">
                                <span className={modalItemForm.compliance_name ? 'text-gray-900' : 'text-gray-500'}>
                                  {modalItemForm.compliance_name
                                    ? (modalItemForm.compliance_name.length > 65 ? modalItemForm.compliance_name.substring(0, 65) + '...' : modalItemForm.compliance_name)
                                    : 'Select a description'}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${showDescriptionDropdown ? 'rotate-180' : ''}`} />
                              </button>
                            ) : null}
                            {showDescriptionDropdown && (
                              <div className="w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mt-1.5" style={{ zIndex: 99999 }} onMouseDown={e => e.preventDefault()}>
                                <div className="px-3 pt-3 pb-2">
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                    <input type="text" placeholder="Search descriptions..." value={descriptionSearch} onChange={e => setDescriptionSearch(e.target.value)} onClick={e => e.stopPropagation()}
                                      className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white text-sm transition-colors" autoFocus />
                                  </div>
                                </div>
                                <div className="px-3 pb-1.5 flex items-center justify-between">
                                  <span className="text-[11px] text-gray-400 font-medium">{complianceDescriptions.filter(d => !modalUsedDescriptions.has(d.compliance_description) && d.compliance_description?.toLowerCase().includes(descriptionSearch.toLowerCase())).length} options available</span>
                                  <span className="text-[11px] text-teal-500 font-medium">Click to select</span>
                                </div>
                                <div className="border-t border-gray-100" />
                                <div className="max-h-60 overflow-y-auto">
                                  {complianceDescriptions
                                    .filter(d => !modalUsedDescriptions.has(d.compliance_description) && d.compliance_description?.toLowerCase().includes(descriptionSearch.toLowerCase()))
                                    .map((desc, idx) => {
                                      const isSelected = modalItemForm.compliance_name === desc.compliance_description;
                                      return (
                                        <button key={desc.id} type="button"
                                          onClick={() => { modalSetItemForm(prev => ({ ...prev, compliance_name: sanitizeDescription(desc.compliance_description) })); setDescSelectedFromDropdown(true); setShowDescriptionDropdown(false); setDescriptionSearch(''); }}
                                          className={`w-full text-left px-3 py-2.5 border-b border-gray-100 last:border-b-0 transition-colors flex items-start gap-3 ${isSelected ? 'bg-teal-50' : 'bg-white hover:bg-teal-600'} group`}>
                                          <span className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold mt-0.5 transition-colors ${isSelected ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-teal-500 group-hover:text-white'}`}>{idx + 1}</span>
                                          <span className={`flex-1 text-sm leading-snug transition-colors ${isSelected ? 'text-teal-800 font-medium' : 'text-gray-700 group-hover:text-white'}`}>{desc.compliance_description}</span>
                                          {isSelected && <svg className="flex-shrink-0 w-4 h-4 text-teal-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                                        </button>
                                      );
                                    })}
                                  {complianceDescriptions.filter(d => !modalUsedDescriptions.has(d.compliance_description)).length === 0 && (
                                    <div className="px-4 py-10 text-center">
                                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3"><FileText className="w-6 h-6 text-gray-300" /></div>
                                      <p className="text-sm font-medium text-gray-500">All descriptions already used</p>
                                      <p className="text-xs text-gray-400 mt-1">Switch category or type manually</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <textarea value={modalItemForm.compliance_name} onChange={e => modalSetItemForm(prev => ({ ...prev, compliance_name: e.target.value.slice(0, DESCRIPTION_MAX_LENGTH) }))}
                            placeholder={complianceDescriptions.length === 0 && !complianceDescLoading ? 'No presets — type your own description' : 'Enter service description'}
                            rows={3} maxLength={DESCRIPTION_MAX_LENGTH} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none" />
                        )}
                      </div>

                      {/* Row 1: Unit + SAC Code */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Unit <span className="normal-case font-normal text-gray-400 text-xs">(optional)</span></label>
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

                      {/* Row 2: Qty + Rate */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Qty <span className="text-red-400">*</span></label>
                          <input type="text" inputMode="numeric" value={modalItemForm.quantity}
                            onChange={e => {
                              const raw = e.target.value.replace(/[^0-9]/g, '');
                              const qty = parseInt(raw, 10) || 0;
                              modalSetItemForm(prev => ({
                                ...prev, quantity: raw,
                                material_amount: (parseFloat(prev.material_rate) || 0) > 0 ? parseFloat(((parseFloat(prev.material_rate)||0) * (qty||1)).toFixed(2)) : prev.material_amount,
                                labour_amount:   (parseFloat(prev.labour_rate)   || 0) > 0 ? parseFloat(((parseFloat(prev.labour_rate)  ||0) * (qty||1)).toFixed(2)) : prev.labour_amount,
                              }));
                            }}
                            onBlur={e => {
                              const val = parseInt(e.target.value, 10);
                              const qty = (!val || val < 1) ? 1 : val;
                              modalSetItemForm(prev => ({
                                ...prev, quantity: qty,
                                material_amount: (parseFloat(prev.material_rate) || 0) > 0 ? parseFloat(((parseFloat(prev.material_rate)||0) * qty).toFixed(2)) : prev.material_amount,
                                labour_amount:   (parseFloat(prev.labour_rate)   || 0) > 0 ? parseFloat(((parseFloat(prev.labour_rate)  ||0) * qty).toFixed(2)) : prev.labour_amount,
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
                              const rate = parseFloat(e.target.value) || 0;
                              // Rate field = Professional_amount only — does NOT touch material/labour
                              modalSetItemForm(prev => ({ ...prev, Professional_amount: rate }));
                            }}
                            placeholder="0.00"
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        </div>
                      </div>

                      {/* Optional Breakdown: Material + Labour */}
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
                                modalSetItemForm(prev => ({ ...prev, material_rate: rate, material_amount: parseFloat((rate * qty).toFixed(2)) }));
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
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Labour Rate (Rs./unit)</label>
                            <input type="number" min="0" step="0.01"
                              value={modalItemForm.labour_rate === 0 ? '' : modalItemForm.labour_rate}
                              onChange={e => {
                                const rate = parseFloat(e.target.value) || 0;
                                const qty  = parseInt(modalItemForm.quantity, 10) || 1;
                                modalSetItemForm(prev => ({ ...prev, labour_rate: rate, labour_amount: parseFloat((rate * qty).toFixed(2)) }));
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

                      {/* Item Total + Add Button */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-teal-50 border border-teal-200 rounded-lg flex-wrap">
                          <span className="text-sm text-teal-700 font-medium">Item Total:</span>
                          <span className="text-sm font-bold text-teal-800">Rs. {calcItemTotal(modalItemForm).toLocaleString('en-IN')}</span>
                          <span className="text-xs text-teal-500 ml-auto">
                            {(parseFloat(modalItemForm.material_amount) > 0 || parseFloat(modalItemForm.labour_amount) > 0)
                              ? `Mat. + Lab. = (${(parseFloat(modalItemForm.material_amount)||0).toLocaleString('en-IN')} + ${(parseFloat(modalItemForm.labour_amount)||0).toLocaleString('en-IN')})`
                              : (parseFloat(modalItemForm.material_rate) > 0 || parseFloat(modalItemForm.labour_rate) > 0)
                                ? `Rate × Qty = (${((parseFloat(modalItemForm.material_rate)||0)+(parseFloat(modalItemForm.labour_rate)||0)).toLocaleString('en-IN')} × ${parseInt(modalItemForm.quantity)||1})`
                                : `Rate × Qty = (${(parseFloat(modalItemForm.Professional_amount)||0).toLocaleString('en-IN')} × ${parseInt(modalItemForm.quantity)||1})`}
                          </span>
                        </div>
                        <button onClick={modalAddItem} disabled={!canAddItem}
                          className={`px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${modalEditingItemIndex !== null ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-teal-600 text-white hover:bg-teal-700'}`}>
                          {modalEditingItemIndex !== null ? <><Edit className="w-4 h-4" />Update</> : <><Plus className="w-4 h-4" />Add Item</>}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  {modalActiveItems.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700">{COMPLIANCE_CATEGORIES[activeCategoryId]?.shortName || 'Added'} Items</span>
                        <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-semibold">{modalActiveItems.length} items</span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {modalActiveItems.map((item, index) => (
                          <div key={index} className={`flex items-start gap-3 px-4 py-3 transition-colors ${modalEditingItemIndex === index ? 'bg-amber-50 border-l-2 border-amber-400' : 'hover:bg-gray-50'}`}>
                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-gray-500">{index + 1}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 leading-snug">{item.compliance_name}</p>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                <span className="text-xs text-gray-400">Qty: {item.quantity}</span>
                                {item.unit && <span className="text-xs text-gray-400">Unit: {item.unit}</span>}
                                <span className="text-xs text-gray-400">Rate: Rs. {parseFloat(item.Professional_amount || 0).toLocaleString('en-IN')}</span>
                                {(parseFloat(item.material_amount) > 0 || parseFloat(item.labour_amount) > 0) && (
                                  <span className="text-xs text-gray-400">M+L: Rs. {(parseFloat(item.material_amount||0)+parseFloat(item.labour_amount||0)).toLocaleString('en-IN')}</span>
                                )}
                                <span className="text-xs font-semibold text-teal-700">Total: Rs. {calcItemTotal(item).toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => modalEditItem(index)} className={`p-1.5 rounded-lg transition-colors ${modalEditingItemIndex === index ? 'bg-amber-100 text-amber-600' : 'text-gray-400 hover:bg-blue-50 hover:text-blue-600'}`} title="Edit item"><Edit className="w-3.5 h-3.5" /></button>
                              <button onClick={() => modalRemoveItem(index)} className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors" title="Remove item"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
                        <span className="text-sm font-bold text-gray-800">Section Total: Rs. {modalActiveItems.reduce((sum, item) => sum + calcItemTotal(item), 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  )}

                  {/* Cross-category hint */}
                  {!editingSection && EXECUTION_CAT_IDS.filter(id => id !== activeCategoryId && (categoryItemsMap[id]?.items?.length || 0) > 0).map(otherId => (
                    <div key={otherId} className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center gap-3">
                      <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">{categoryItemsMap[otherId]?.items?.length}</span>
                      </div>
                      <p className="text-sm text-indigo-700 font-medium">
                        {COMPLIANCE_CATEGORIES[otherId]?.shortName} also has {categoryItemsMap[otherId]?.items?.length} item{categoryItemsMap[otherId]?.items?.length > 1 ? 's' : ''} — will be saved to its own section.
                      </p>
                    </div>
                  ))}
                </div>

                {/* Modal Footer */}
                <div className="border-t border-gray-200 px-5 py-4 bg-white flex items-center justify-between gap-3 flex-shrink-0" style={{ borderRadius: '0 0 20px 20px' }}>
                  <span className="text-xs text-gray-400">{modalTotalItems === 0 ? 'Add at least one item to continue' : `${modalTotalItems} item${modalTotalItems > 1 ? 's' : ''} ready`}</span>
                  <div className="flex gap-2">
                    <button onClick={closeModal} className="px-5 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600">Cancel</button>
                    <button onClick={handleAddSection} disabled={modalSaveDisabled}
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
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={cancelDelete} />
            <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
              <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scaleIn" onClick={e => e.stopPropagation()}>
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0"><AlertCircle className="w-6 h-6 text-red-600" /></div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{deleteConfirm.type === 'section' ? 'Delete Compliance?' : 'Remove Item?'}</h3>
                    <p className="text-sm text-gray-600">{deleteConfirm.type === 'section' ? 'Are you sure you want to delete this compliance? All items will be permanently removed.' : 'Are you sure you want to remove this item?'} This action cannot be undone.</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <button onClick={cancelDelete} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                  <button onClick={confirmDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">
                    {deleteConfirm.type === 'section' ? 'Delete Compliance' : 'Remove Item'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        <SuccessModal
          isOpen={showSuccessModal}
          isEditMode={isEditMode}
          orderNumber={createdOrder?.quotation_number}
          onClose={() => {
            setShowSuccessModal(false);
            if (!isEditMode) { setSections([]); setSelectedVendor(null); setSelectedProject(null); setSacCode(''); setGstRate(18); setDiscountValue(0); setSelectedCompany(COMPANIES[0]); clearDraft(); }
          }}
          onViewOrder={() => {
            if (isEditMode && createdOrder?.id) navigate(`/purchase/${createdOrder.id}`);
            else navigate('/purchase');
          }}
        />

      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn  { animation: fadeIn  0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3,1); }
      `}</style>
    </div>
  );
}