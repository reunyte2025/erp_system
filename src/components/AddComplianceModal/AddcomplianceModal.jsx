/**
 * ============================================================================
 * AddComplianceModal — Supports BOTH Regulatory & Execution quotation types
 * ============================================================================
 *
 * Used by:
 *   - quotations.jsx       (create / edit quotation)       — internal modal
 *   - viewquotationdetails (edit mode "Add Item" button)   — this component
 *
 * Props:
 *   isOpen          {boolean}   — controls visibility
 *   onClose         {function}  — called when user dismisses without saving
 *   onSave          {function(newFlatItems: array)} — called on Save;
 *                               receives flat items array ready to spread into editItems
 *   existingItems   {array}     — current flat items already in the quotation
 *                               (used only to lock/detect type when quotationType not provided)
 *   fetchDescriptions {function(categoryId, subCategoryId): Promise<results[]>}
 *                               — async fn that fetches compliance descriptions from API
 *   quotationType   {string}    — 'execution' | 'regulatory' | '' (or any string)
 *                               When provided, locks the modal to that type immediately.
 *                               When omitted, falls back to detecting from existingItems.
 *
 * Behaviour:
 *   ┌─ Execution quotation (quotation_type contains "execution") ─────────────┐
 *   │  Categories: 5 = Water Connection, 6 = SWD Line Work, 7 = Sewer/Drainage│
 *   │  Fields per item:                                                        │
 *   │    description, sub_compliance_id, quantity, unit, item_sac_code,       │
 *   │    Professional_amount (Rate), material_rate, material_amount,          │
 *   │    labour_rate, labour_amount                                            │
 *   └──────────────────────────────────────────────────────────────────────────┘
 *   ┌─ Regulatory quotation ──────────────────────────────────────────────────┐
 *   │  Categories: 1 = Construction Cert, 2 = Occupational Cert,             │
 *   │              3 = Water Main, 4 = STP                                    │
 *   │  Fields per item:                                                        │
 *   │    description, sub_compliance_id (cats 1–2 only), quantity, unit,     │
 *   │    Professional_amount, miscellaneous_amount                            │
 *   └──────────────────────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X, Plus, Edit, Search, ChevronDown, Loader2, FileText, Trash2,
} from 'lucide-react';

// ─── Constants ─────────────────────────────────────────────────────────────────

// All compliance categories — Regulatory (1–4) + Execution (5–7) + Architecture (8)
const ALL_COMPLIANCE_CATEGORIES = {
  1: { id: 1, name: 'Construction Certificate',                                      shortName: 'Construction Cert', type: 'regulatory' },
  2: { id: 2, name: 'Occupational Certificate',                                      shortName: 'Occupational Cert', type: 'regulatory' },
  3: { id: 3, name: 'Water Main Commissioning',                                      shortName: 'Water Main',        type: 'regulatory' },
  4: { id: 4, name: 'STP Commissioning',                                             shortName: 'STP',               type: 'regulatory' },
  5: { id: 5, name: 'Water Connection',                                              shortName: 'Water Connection',  type: 'execution'  },
  6: { id: 6, name: 'SWD Line Work',                                                 shortName: 'SWD Line Work',     type: 'execution'  },
  7: { id: 7, name: 'Sewer/Drainage Line Work',                                      shortName: 'Sewer/Drainage',    type: 'execution'  },
  8: { id: 8, name: 'Architecture',                                                  shortName: 'Architecture',      type: 'architecture' },
};

// Sub-compliance options per category
const SUB_COMPLIANCE_BY_CATEGORY = {
  1: [ { id: 1, name: 'Plumbing Compliance' }, { id: 2, name: 'PCO Compliance' }, { id: 3, name: 'General Compliance' }, { id: 4, name: 'Road Setback Handing over' } ],
  2: [ { id: 1, name: 'Plumbing Compliance' }, { id: 2, name: 'PCO Compliance' }, { id: 3, name: 'General Compliance' }, { id: 4, name: 'Road Setback Handing over' } ],
  3: [],
  4: [],
  5: [ { id: 5, name: 'Internal Water Main' }, { id: 6, name: 'Permanent Water Connection' } ],
  6: [ { id: 7, name: 'Pipe Jacking Method' }, { id: 8, name: 'HDD Method' }, { id: 9, name: 'Open Cut Method' } ],
  7: [ { id: 7, name: 'Pipe Jacking Method' }, { id: 8, name: 'HDD Method' }, { id: 9, name: 'Open Cut Method' } ],
};

// Flat lookup for display
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

const REGULATORY_CATS    = [1, 2, 3, 4];
const EXECUTION_CATS     = [5, 6, 7];
const ARCHITECTURE_CATS  = [8]; // Architecture — no sub-category, manual description, regulatory-style fields

const BLANK_ITEM_FORM = {
  compliance_name:      '',
  compliance_id:        null,
  sub_compliance_id:    null,
  quantity:             1,
  unit:                 '',
  item_sac_code:        '',
  // Regulatory fields
  miscellaneous_amount: '',
  Professional_amount:  0,
  // Execution fields
  material_rate:   0,
  material_amount: 0,
  labour_rate:     0,
  labour_amount:   0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isMiscNumeric = (value) => {
  if (value === '' || value === null || value === undefined) return false;
  const str = String(value).trim();
  return str !== '' && !isNaN(str) && !isNaN(parseFloat(str));
};

const calcItemTotalRegulatory = (item) => {
  const prof = parseFloat(item.Professional_amount) || 0;
  const misc = isMiscNumeric(item.miscellaneous_amount) ? parseFloat(item.miscellaneous_amount) : 0;
  const qty  = parseInt(item.quantity, 10) || 1;
  return Math.round((prof + misc) * qty * 100) / 100;
};

const calcItemTotalExecution = (item) => {
  const qty     = parseInt(item.quantity, 10) || 1;
  const matAmt  = parseFloat(item.material_amount) || 0;
  const labAmt  = parseFloat(item.labour_amount)   || 0;
  const matRate = parseFloat(item.material_rate)   || 0;
  const labRate = parseFloat(item.labour_rate)     || 0;
  if (matAmt > 0 || labAmt > 0) return Math.round((matAmt + labAmt) * 100) / 100;
  if (matRate > 0 || labRate > 0) return Math.round(((matRate + labRate) * qty) * 100) / 100;
  const prof = parseFloat(item.Professional_amount) || 0;
  return Math.round((prof * qty) * 100) / 100;
};

/**
 * Resolve which modal type to show from the quotation_type string.
 * Returns 'execution' or 'regulatory'.
 */
const resolveQuotationType = (quotationType, existingItems = []) => {
  if (quotationType) {
    const qt = String(quotationType).toLowerCase().trim();
    if (qt.includes('execution'))    return 'execution';
    if (qt.includes('architecture')) return 'architecture';
    return 'regulatory';
  }
  // Fall back: detect from existing items' compliance_category
  if (existingItems.length > 0) {
    const cats = existingItems.map(it => parseInt(it.compliance_category || 0));
    if (cats.some(c => EXECUTION_CATS.includes(c)))    return 'execution';
    if (cats.some(c => ARCHITECTURE_CATS.includes(c))) return 'architecture';
    if (cats.some(c => REGULATORY_CATS.includes(c)))   return 'regulatory';
  }
  return null; // unknown — show type chooser
};

// ─── Sub-compliance Dropdown ──────────────────────────────────────────────────

const SubComplianceDropdown = ({ value, onChange, categoryId, placeholder = 'Select Sub-Compliance' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setIsOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const list = SUB_COMPLIANCE_BY_CATEGORY[categoryId] || [];
  const filtered = list.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  const selected = list.find(i => i.id === value);

  return (
    <div ref={ref} className="relative w-full">
      <button type="button" onClick={() => setIsOpen(p => !p)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-left flex items-center justify-between bg-white hover:bg-gray-50 transition-colors">
        <span className={selected ? 'text-gray-900' : 'text-gray-500'}>{selected ? selected.name : placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 z-[99999] overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                onMouseDown={e => e.stopPropagation()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" autoFocus />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length > 0 ? filtered.map(item => (
              <button key={item.id} type="button" onMouseDown={e => e.preventDefault()}
                onClick={() => { onChange(item.id); setIsOpen(false); setSearch(''); }}
                className={`w-full px-4 py-3 text-left hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-0 text-sm ${value === item.id ? 'bg-teal-50 border-l-4 border-l-teal-500' : ''}`}>
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
            )) : (
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

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AddComplianceModal({
  isOpen,
  onClose,
  onSave,
  existingItems = [],
  fetchDescriptions,
  quotationType, // 'execution' | 'regulatory' | '' — passed from viewquotationdetails
}) {

  // ── Resolved type & category state ─────────────────────────────────────────
  const [resolvedType,   setResolvedType]   = useState(null); // 'execution' | 'regulatory' | null
  const [activeCategoryId, setActiveCategoryId] = useState(null);

  /**
   * categoryItemsMap: { [categoryId: number]: { items: [], category_name: string } }
   * Each category tab has its OWN independent items array.
   */
  const [categoryItemsMap,   setCategoryItemsMap]   = useState({});
  const [itemFormMap,        setItemFormMap]        = useState({});
  const [editingIndexMap,    setEditingIndexMap]    = useState({});

  // ── Description state ───────────────────────────────────────────────────────
  const [complianceDescriptions, setComplianceDescriptions] = useState([]);
  const [complianceDescLoading,  setComplianceDescLoading]  = useState(false);
  const [descriptionMode,        setDescriptionMode]        = useState('dropdown');
  const [descriptionSearch,      setDescriptionSearch]      = useState('');
  const [showDescDropdown,       setShowDescDropdown]       = useState(false);
  const [descSelectedFromDropdown, setDescSelectedFromDropdown] = useState(false);

  const descCacheRef  = useRef({});
  const descFieldRef  = useRef(null);
  const descPanelRef  = useRef(null);

  // ── Scroll lock ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top      = `-${scrollY}px`;
    document.body.style.width    = '100%';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.position = '';
      document.body.style.top      = '';
      document.body.style.width    = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  // ── Reset & initialise when modal opens ─────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    // Determine type from prop first, then fall back to existingItems detection
    const detected = resolveQuotationType(quotationType, existingItems);

    // Reset all transient state
    setCategoryItemsMap({});
    setItemFormMap({});
    setEditingIndexMap({});
    setComplianceDescriptions([]);
    setDescriptionMode('dropdown');
    setDescriptionSearch('');
    setShowDescDropdown(false);
    setDescSelectedFromDropdown(false);
    descCacheRef.current = {};

    if (detected) {
      initForType(detected);
    } else {
      // No type determined — show type chooser
      setResolvedType(null);
      setActiveCategoryId(null);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const initForType = (type) => {
    setResolvedType(type);
    const catIds = type === 'execution'
      ? EXECUTION_CATS
      : type === 'architecture'
        ? ARCHITECTURE_CATS
        : REGULATORY_CATS;
    const firstId = catIds[0];

    const initMap = {};
    catIds.forEach(id => {
      initMap[id] = { items: [], category_name: ALL_COMPLIANCE_CATEGORIES[id].shortName };
    });
    setCategoryItemsMap(initMap);

    const initItemForms = {};
    const initEditIdx   = {};
    catIds.forEach(id => { initItemForms[id] = { ...BLANK_ITEM_FORM }; initEditIdx[id] = null; });
    setItemFormMap(initItemForms);
    setEditingIndexMap(initEditIdx);

    setActiveCategoryId(firstId);

    // Architecture: always manual description (no API fetch needed)
    // Pre-fetch descriptions for execution / regulatory no-sub cats
    const needsImmediateFetch = type === 'execution' || (type === 'regulatory' && [3, 4].includes(firstId));
    if (needsImmediateFetch) {
      fetchDescForCategory(firstId, null);
    }
  };

  // ── Fetch compliance descriptions ───────────────────────────────────────────
  const fetchDescForCategory = async (categoryId, subCategoryId) => {
    if (!categoryId || !fetchDescriptions) return;
    const cacheKey = `${categoryId}_${subCategoryId ?? 'none'}`;
    if (descCacheRef.current[cacheKey]) {
      const cached = descCacheRef.current[cacheKey];
      setComplianceDescriptions(cached);
      setDescriptionMode(cached.length > 0 ? 'dropdown' : 'manual');
      return;
    }
    setComplianceDescLoading(true);
    setComplianceDescriptions([]);
    setDescriptionMode('dropdown');
    try {
      const results = await fetchDescriptions(categoryId, subCategoryId);
      const arr = Array.isArray(results) ? results : [];
      descCacheRef.current[cacheKey] = arr;
      setComplianceDescriptions(arr);
      setDescriptionMode(arr.length > 0 ? 'dropdown' : 'manual');
    } catch {
      descCacheRef.current[cacheKey] = [];
      setComplianceDescriptions([]);
      setDescriptionMode('manual');
    } finally {
      setComplianceDescLoading(false);
    }
  };

  // ── Category type selection ─────────────────────────────────────────────────
  const handleSelectType = (type) => {
    setDescriptionSearch('');
    setShowDescDropdown(false);
    setComplianceDescriptions([]);
    // Architecture always uses manual entry — set before initForType so it sticks
    setDescriptionMode(type === 'architecture' ? 'manual' : 'dropdown');
    initForType(type);
  };

  // ── Category tab switching ──────────────────────────────────────────────────
  const handleCategoryChange = (categoryId) => {
    setCategoryItemsMap(prev => {
      if (prev[categoryId]) return prev;
      return { ...prev, [categoryId]: { items: [], category_name: ALL_COMPLIANCE_CATEGORIES[categoryId]?.shortName || '' } };
    });

    // Always reset the item form for the new category — never carry sub_compliance_id
    // or any other field from a different category's form into this tab.
    setItemFormMap(prev => ({
      ...prev,
      [categoryId]: { ...BLANK_ITEM_FORM },
    }));
    setEditingIndexMap(prev => ({ ...prev, [categoryId]: null }));
    setActiveCategoryId(categoryId);

    // Always fully reset ALL description UI state when switching categories.
    setComplianceDescriptions([]);
    setDescriptionMode('dropdown');
    setDescriptionSearch('');
    setShowDescDropdown(false);
    setDescSelectedFromDropdown(false);

    // Architecture: always manual, no fetch
    if (ARCHITECTURE_CATS.includes(categoryId)) {
      setDescriptionMode('manual');
      return;
    }
    // Auto-fetch for execution cats + regulatory cats 3,4 (no sub-category needed)
    if (EXECUTION_CATS.includes(categoryId) || [3, 4].includes(categoryId)) {
      fetchDescForCategory(categoryId, null);
    }
    // For cats 1,2 (regulatory with sub-compliance): do NOT auto-fetch —
    // the user must pick a sub-category first.
  };

  // ── Per-category form helpers ───────────────────────────────────────────────
  const getItemForm    = () => itemFormMap[activeCategoryId]     || { ...BLANK_ITEM_FORM };
  const getEditingIdx  = () => editingIndexMap[activeCategoryId] ?? null;
  const getActiveItems = () => categoryItemsMap[activeCategoryId]?.items || [];

  const setItemForm = (updater) => {
    setItemFormMap(prev => {
      const current = prev[activeCategoryId] || { ...BLANK_ITEM_FORM };
      const next    = typeof updater === 'function' ? updater(current) : updater;
      return { ...prev, [activeCategoryId]: next };
    });
  };

  const setEditingIdx = (idx) => setEditingIndexMap(prev => ({ ...prev, [activeCategoryId]: idx }));

  const setActiveItems = (updater) => {
    setCategoryItemsMap(prev => {
      const current   = prev[activeCategoryId] || { items: [], category_name: '' };
      const nextItems = typeof updater === 'function' ? updater(current.items) : updater;
      return { ...prev, [activeCategoryId]: { ...current, items: nextItems } };
    });
  };

  // ── Item CRUD ───────────────────────────────────────────────────────────────
  const isExecCategory = activeCategoryId ? EXECUTION_CATS.includes(activeCategoryId) : false;
  const isArchCategory = activeCategoryId ? ARCHITECTURE_CATS.includes(activeCategoryId) : false;

  const handleAddItem = () => {
    const form = getItemForm();
    if (!form.compliance_name.trim()) return;
    // Regulatory cats 1,2 require sub_compliance_id; Architecture (8) does NOT
    if (!isExecCategory && !isArchCategory && [1, 2].includes(activeCategoryId) && !form.sub_compliance_id) return;

    const newItem = {
      compliance_name:   form.compliance_name.trim(),
      compliance_id:     form.compliance_id  || null,
      // Architecture always uses sub_compliance_category = 0
      sub_compliance_id: isArchCategory ? null : (form.sub_compliance_id || null),
      quantity:          parseInt(form.quantity, 10) || 1,
      unit:              String(form.unit || '').trim(),
      ...(isExecCategory ? {
        // Execution-specific fields
        item_sac_code:   String(form.item_sac_code || '').trim(),
        Professional_amount: parseFloat(form.Professional_amount) || 0,
        material_rate:   parseFloat(form.material_rate)   || 0,
        material_amount: parseFloat(form.material_amount) || 0,
        labour_rate:     parseFloat(form.labour_rate)     || 0,
        labour_amount:   parseFloat(form.labour_amount)   || 0,
        total_amount:    calcItemTotalExecution(form),
      } : {
        // Regulatory + Architecture use the same fields
        Professional_amount:  parseFloat(form.Professional_amount) || 0,
        miscellaneous_amount: String(form.miscellaneous_amount ?? '').trim(),
        total_amount:         calcItemTotalRegulatory(form),
      }),
    };

    const editingIdx = getEditingIdx();
    if (editingIdx !== null) {
      setActiveItems(prev => prev.map((it, i) => i === editingIdx ? newItem : it));
      setEditingIdx(null);
    } else {
      setActiveItems(prev => [...prev, newItem]);
    }
    // Reset form fully after each add
    setItemForm({ ...BLANK_ITEM_FORM });
    setDescriptionSearch('');
    setShowDescDropdown(false);
    setDescSelectedFromDropdown(false);
    // Architecture: stay in manual mode; no re-fetch needed
    if (isArchCategory) {
      setDescriptionMode('manual');
      return;
    }
    // Re-fetch descriptions for execution / no-sub cats so the list is still ready
    if (EXECUTION_CATS.includes(activeCategoryId) || [3, 4].includes(activeCategoryId)) {
      fetchDescForCategory(activeCategoryId, null);
    } else {
      setComplianceDescriptions([]);
      setDescriptionMode('dropdown');
    }
  };

  const handleEditItem = (index) => {
    const item = getActiveItems()[index];
    if (!item) return;
    setItemForm({
      compliance_name:      item.compliance_name,
      compliance_id:        item.compliance_id   || null,
      sub_compliance_id:    item.sub_compliance_id || null,
      quantity:             item.quantity || 1,
      unit:                 item.unit || '',
      // Regulatory
      Professional_amount:  item.Professional_amount || 0,
      miscellaneous_amount: item.miscellaneous_amount || '',
      // Execution
      item_sac_code:   item.item_sac_code   || '',
      material_rate:   item.material_rate   || 0,
      material_amount: item.material_amount || 0,
      labour_rate:     item.labour_rate     || 0,
      labour_amount:   item.labour_amount   || 0,
    });
    setEditingIdx(index);
    setDescSelectedFromDropdown(true);
    if (item.sub_compliance_id) {
      fetchDescForCategory(activeCategoryId, item.sub_compliance_id);
    } else if (isExecCategory || [3, 4].includes(activeCategoryId)) {
      fetchDescForCategory(activeCategoryId, null);
    }
  };

  const handleRemoveItem = (index) => {
    const editingIdx = getEditingIdx();
    if (editingIdx === index) {
      setEditingIdx(null);
      setItemForm({ ...BLANK_ITEM_FORM });
    }
    setActiveItems(prev => prev.filter((_, i) => i !== index));
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = () => {
    const totalItems = Object.values(categoryItemsMap).reduce((s, c) => s + (c.items?.length || 0), 0);
    if (totalItems === 0) return;

    const newFlatItems = [];
    Object.entries(categoryItemsMap).forEach(([catIdStr, catData]) => {
      const catId   = parseInt(catIdStr, 10);
      const isExec  = EXECUTION_CATS.includes(catId);
      (catData.items || []).forEach(item => {
        if (!item.compliance_name?.trim()) return;
        newFlatItems.push({
          id:                      null, // new item — backend assigns
          description:             item.compliance_name.trim(),
          quantity:                parseInt(item.quantity) || 1,
          // Pass null for any empty optional string field — backend renders it as "–"
          unit:                    String(item.unit || '').trim() || null,
          compliance_category:     catId,
          sub_compliance_category: item.sub_compliance_id || 0,
          total_amount:            isExec ? calcItemTotalExecution(item) : calcItemTotalRegulatory(item),
          // Regulatory fields
          Professional_amount:     parseFloat(item.Professional_amount) || 0,
          miscellaneous_amount:    isExec ? null : (String(item.miscellaneous_amount ?? '').trim() || null),
          // Execution fields
          ...(isExec ? {
            sac_code:        String(item.item_sac_code || '').trim() || null,
            material_rate:   parseFloat(item.material_rate)   || 0,
            material_amount: parseFloat(item.material_amount) || 0,
            labour_rate:     parseFloat(item.labour_rate)     || 0,
            labour_amount:   parseFloat(item.labour_amount)   || 0,
          } : {}),
        });
      });
    });

    if (newFlatItems.length === 0) return;
    onSave(newFlatItems);
    handleClose();
  };

  // ── Close ───────────────────────────────────────────────────────────────────
  const handleClose = () => { onClose(); };

  // ── Computed ────────────────────────────────────────────────────────────────
  const itemForm       = getItemForm();
  const editingIdx     = getEditingIdx();
  const activeItems    = getActiveItems();
  const totalItemCount = Object.values(categoryItemsMap).reduce((s, c) => s + (c.items?.length || 0), 0);
  const saveDisabled   = totalItemCount === 0;

  // Description uniqueness guard (same sub-category, same tab)
  const usedDescriptions = (() => {
    const used = new Set();
    activeItems.forEach((item, i) => {
      if (i === editingIdx) return;
      if (item.sub_compliance_id === itemForm.sub_compliance_id && item.compliance_name) {
        used.add(item.compliance_name);
      }
    });
    return used;
  })();

  // Determine whether sub-compliance is required for current category
  const subCompRequired = isExecCategory
    ? (SUB_COMPLIANCE_BY_CATEGORY[activeCategoryId]?.length > 0)
    : [1, 2].includes(activeCategoryId);

  const addItemDisabled = (
    !itemForm.compliance_name.trim() ||
    (subCompRequired && !itemForm.sub_compliance_id)
  );

  const catIds = resolvedType === 'execution'
    ? EXECUTION_CATS
    : resolvedType === 'architecture'
      ? ARCHITECTURE_CATS
      : (resolvedType === 'regulatory' ? REGULATORY_CATS : []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] animate-fadeIn" style={{ position: 'fixed', overflow: 'hidden' }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" style={{ position: 'fixed', width: '100vw', height: '100vh' }}
        onClick={handleClose} />

      <div className="relative z-10 flex items-center justify-center p-4" style={{ height: '100vh' }}>
        <div
          className="relative w-full max-w-2xl animate-scaleIn bg-white flex flex-col"
          style={{ borderRadius: '20px', boxShadow: '0 32px 64px rgba(0,0,0,0.24)', height: '90vh', maxHeight: '820px', minHeight: '480px', overflow: 'hidden' }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div
            className="px-6 py-4 flex-shrink-0"
            style={{
              borderRadius: '20px 20px 0 0',
              background: resolvedType === 'execution'
                ? 'linear-gradient(135deg, #0f766e, #0891b2)'
                : 'linear-gradient(135deg, #0f766e, #059669)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-base leading-tight">
                    {resolvedType === 'execution' ? 'Add Execution Item' : resolvedType === 'architecture' ? 'Add Architecture Item' : resolvedType === 'regulatory' ? 'Add Regulatory Item' : 'Add New Compliance'}
                  </p>
                  <p className="text-white/70 text-xs mt-0.5">
                    {activeCategoryId
                      ? ALL_COMPLIANCE_CATEGORIES[activeCategoryId]?.name
                      : resolvedType
                        ? (resolvedType === 'execution'
                            ? 'Execution Quotation — Water Connection / SWD / Sewer'
                            : resolvedType === 'architecture'
                              ? 'Architecture Services — Manual Description'
                              : 'Regulatory Quotation — Certificates / Water Main / STP')
                        : 'Select a compliance type below'}
                  </p>
                </div>
              </div>
              <button onClick={handleClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <X size={16} className="text-white" />
              </button>
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div id="acm-modal-body" className="p-5 space-y-4 bg-gray-50 flex-1"
            style={{ minHeight: 0, overflowY: 'scroll', scrollbarGutter: 'stable' }}>

            {/* ── Type chooser — shown only when type not yet determined ── */}
            {!resolvedType && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Select Compliance Type</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { type: 'regulatory',    label: 'Regulatory Permissions', sub: 'Construction / Occupational / Water Main / STP  (Cat 1–4)' },
                    { type: 'execution',     label: 'Execution Compliance',   sub: 'Water Connection / SWD / Sewer/Drainage  (Cat 5–7)' },
                    { type: 'architecture',  label: 'Architecture',           sub: 'Architecture Services  (Cat 8)' },
                  ].map(({ type, label, sub }) => (
                    <button key={type} onClick={() => handleSelectType(type)}
                      className="px-4 py-3 rounded-xl border-2 font-medium text-sm transition-colors text-left border-gray-200 bg-white text-gray-600 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700 cursor-pointer">
                      <p className="font-semibold">{label}</p>
                      <p className="text-xs font-normal mt-0.5 opacity-70">{sub}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Category tab pills ── */}
            {resolvedType && catIds.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  {resolvedType === 'execution' ? 'Execution Category' : resolvedType === 'architecture' ? 'Architecture Category' : 'Regulatory Category'}
                </p>
                <div className={`grid gap-2 ${catIds.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {catIds.map(catId => {
                    const itemCount = categoryItemsMap[catId]?.items?.length || 0;
                    return (
                      <button key={catId} onClick={() => handleCategoryChange(catId)}
                        className={`px-3 py-2.5 rounded-lg border-2 font-medium text-xs transition-colors relative ${activeCategoryId === catId ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}>
                        {ALL_COMPLIANCE_CATEGORIES[catId]?.shortName}
                        {itemCount > 0 && (
                          <span className="absolute -top-2 -right-2 w-5 h-5 bg-teal-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                            {itemCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Add Item form ── */}
            {activeCategoryId && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-visible">
                {/* Form header */}
                <div className={`px-4 py-3 border-b border-gray-100 flex items-center justify-between ${editingIdx !== null ? 'bg-amber-50' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2">
                    {editingIdx !== null ? (
                      <>
                        <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                          <Edit className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-amber-800">Editing Item #{editingIdx + 1}</span>
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
                  {editingIdx !== null && (
                    <button onClick={() => { setEditingIdx(null); setItemForm({ ...BLANK_ITEM_FORM }); setDescSelectedFromDropdown(false); setComplianceDescriptions([]); setDescriptionMode('dropdown'); }}
                      className="text-xs text-amber-600 hover:text-amber-800 font-medium">Cancel edit</button>
                  )}
                </div>

                <div className="p-4 space-y-3">

                  {/* Sub-compliance dropdown — only for categories that have sub-options */}
                  {(SUB_COMPLIANCE_BY_CATEGORY[activeCategoryId]?.length > 0) && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Sub-Compliance Category {subCompRequired && <span className="text-red-400">*</span>}
                      </label>
                      <SubComplianceDropdown
                        value={itemForm.sub_compliance_id}
                        categoryId={activeCategoryId}
                        onChange={(id) => {
                          setItemForm(prev => ({ ...prev, sub_compliance_id: id, compliance_name: '' }));
                          setDescriptionSearch('');
                          setShowDescDropdown(false);
                          setDescSelectedFromDropdown(false);
                          fetchDescForCategory(activeCategoryId, id);
                        }}
                        placeholder="Select sub-compliance category"
                      />
                    </div>
                  )}

                  {/* Description field */}
                  <div ref={descFieldRef} className="relative">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Description <span className="text-red-400">*</span>
                      </label>
                      {complianceDescriptions.length > 0 && (
                        <button type="button"
                          onClick={() => { setDescriptionMode(p => p === 'dropdown' ? 'manual' : 'dropdown'); setItemForm(p => ({ ...p, compliance_name: '' })); setDescSelectedFromDropdown(false); }}
                          className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                          {descriptionMode === 'dropdown' ? '+ Type manually' : '← Pick from list'}
                        </button>
                      )}
                    </div>

                    {complianceDescLoading ? (
                      <div className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin text-teal-500" /> Loading descriptions...
                      </div>
                    ) : descriptionMode === 'dropdown' && complianceDescriptions.length > 0 ? (
                      <div className="relative">
                        {/* Chip showing selected description with inline-edit textarea */}
                        {descSelectedFromDropdown && !showDescDropdown ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-800 font-medium truncate">
                                {itemForm.compliance_name.length > 70 ? itemForm.compliance_name.substring(0, 70) + '…' : itemForm.compliance_name}
                              </div>
                              <button type="button" onClick={() => { setShowDescDropdown(true); setDescSelectedFromDropdown(false); }}
                                className="px-2 py-2 text-xs text-teal-600 hover:bg-teal-50 rounded-lg border border-teal-200 transition-colors flex-shrink-0">
                                Change
                              </button>
                            </div>
                            <textarea
                              value={itemForm.compliance_name}
                              onChange={e => setItemForm(p => ({ ...p, compliance_name: e.target.value }))}
                              rows={3} autoFocus
                              className="w-full px-3 py-2.5 border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none bg-white shadow-sm"
                              placeholder="Edit the description as needed…"
                            />
                          </div>
                        ) : (
                          <button type="button"
                            onClick={() => { setShowDescDropdown(p => !p); }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-left flex items-center justify-between bg-white hover:bg-gray-50 transition-colors">
                            <span className={itemForm.compliance_name ? 'text-gray-900' : 'text-gray-500'}>
                              {itemForm.compliance_name
                                ? (itemForm.compliance_name.length > 65 ? itemForm.compliance_name.substring(0, 65) + '…' : itemForm.compliance_name)
                                : 'Select a description'}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${showDescDropdown ? 'rotate-180' : ''}`} />
                          </button>
                        )}

                        {showDescDropdown && (
                          <div ref={descPanelRef} className="absolute left-0 top-full mt-1.5 w-full bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden" style={{ zIndex: 99999 }} onMouseDown={e => e.preventDefault()}>
                            <div className="px-3 pt-3 pb-2">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input type="text" placeholder="Search descriptions..." value={descriptionSearch}
                                  onChange={e => setDescriptionSearch(e.target.value)}
                                  onClick={e => e.stopPropagation()}
                                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white text-sm transition-colors" autoFocus />
                              </div>
                            </div>
                            <div className="px-3 pb-1.5 flex items-center justify-between">
                              <span className="text-[11px] text-gray-400 font-medium">
                                {complianceDescriptions.filter(d =>
                                  !usedDescriptions.has(d.compliance_description) &&
                                  d.compliance_description?.toLowerCase().includes(descriptionSearch.toLowerCase())
                                ).length} options available
                              </span>
                              <span className="text-[11px] text-teal-500 font-medium">Click to select</span>
                            </div>
                            <div className="border-t border-gray-100" />
                            <div className="max-h-60 overflow-y-auto">
                              {complianceDescriptions
                                .filter(d =>
                                  !usedDescriptions.has(d.compliance_description) &&
                                  d.compliance_description?.toLowerCase().includes(descriptionSearch.toLowerCase())
                                )
                                .map((desc, idx) => {
                                  const isSelected = itemForm.compliance_name === desc.compliance_description;
                                  return (
                                    <button key={desc.id || idx} type="button"
                                      onClick={() => {
                                        setItemForm(p => ({ ...p, compliance_name: desc.compliance_description }));
                                        setDescSelectedFromDropdown(true);
                                        setShowDescDropdown(false);
                                        setDescriptionSearch('');
                                      }}
                                      className={`w-full text-left px-3 py-2.5 border-b border-gray-100 last:border-b-0 transition-colors duration-100 flex items-start gap-3 ${isSelected ? 'bg-teal-50' : 'bg-white hover:bg-teal-600'} group`}>
                                      <span className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold mt-0.5 transition-colors ${isSelected ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-teal-500 group-hover:text-white'}`}>
                                        {idx + 1}
                                      </span>
                                      <span className={`flex-1 text-sm leading-snug transition-colors ${isSelected ? 'text-teal-800 font-medium' : 'text-gray-700 group-hover:text-white'}`}>
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
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <textarea value={itemForm.compliance_name}
                        onChange={e => setItemForm(p => ({ ...p, compliance_name: e.target.value }))}
                        placeholder={complianceDescriptions.length === 0 && !complianceDescLoading ? 'No presets — type your own description' : 'Enter service description'}
                        rows={2} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none" />
                    )}
                  </div>

                  {/* ════════════════════════════════════════════════════════
                      EXECUTION FIELDS  (cats 5, 6, 7)
                      ════════════════════════════════════════════════════════ */}
                  {isExecCategory ? (
                    <>
                      {/* Row 1: Unit + SAC + Qty */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Unit</label>
                          <input type="text"
                            value={itemForm.unit}
                            onChange={e => setItemForm(p => ({ ...p, unit: e.target.value }))}
                            placeholder="e.g. m, nos, RM"
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">SAC Code</label>
                          <input type="text"
                            value={itemForm.item_sac_code}
                            onChange={e => setItemForm(p => ({ ...p, item_sac_code: e.target.value }))}
                            placeholder="e.g. 998312"
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Qty <span className="text-red-400">*</span></label>
                          <input type="text" inputMode="numeric"
                            value={itemForm.quantity}
                            onChange={e => {
                              const raw = e.target.value.replace(/[^0-9]/g, '');
                              const qty = parseInt(raw, 10) || 1;
                              // Auto-recalculate amounts when qty changes
                              const matAmt = parseFloat(((parseFloat(itemForm.material_rate) || 0) * qty).toFixed(2));
                              const labAmt = parseFloat(((parseFloat(itemForm.labour_rate)   || 0) * qty).toFixed(2));
                              setItemForm(p => ({
                                ...p,
                                quantity:        raw,
                                material_amount: (parseFloat(p.material_rate) || 0) > 0 ? matAmt : p.material_amount,
                                labour_amount:   (parseFloat(p.labour_rate)   || 0) > 0 ? labAmt : p.labour_amount,
                              }));
                            }}
                            onBlur={e => {
                              const qty = Math.max(1, parseInt(e.target.value, 10) || 1);
                              const matAmt = parseFloat(((parseFloat(itemForm.material_rate) || 0) * qty).toFixed(2));
                              const labAmt = parseFloat(((parseFloat(itemForm.labour_rate)   || 0) * qty).toFixed(2));
                              setItemForm(p => ({
                                ...p,
                                quantity:        qty,
                                material_amount: (parseFloat(p.material_rate) || 0) > 0 ? matAmt : p.material_amount,
                                labour_amount:   (parseFloat(p.labour_rate)   || 0) > 0 ? labAmt : p.labour_amount,
                              }));
                            }}
                            placeholder="1"
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                        </div>
                      </div>

                      {/* Row 2: Rate (Rs./unit) */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                          Rate (Rs.) <span className="text-red-400">*</span>
                          <span className="ml-1 normal-case font-normal text-gray-400">per unit</span>
                        </label>
                        <input type="number" min="0" step="0.01"
                          value={itemForm.Professional_amount === 0 ? '' : itemForm.Professional_amount}
                          onChange={e => setItemForm(p => ({ ...p, Professional_amount: parseFloat(e.target.value) || 0 }))}
                          placeholder="0.00"
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      </div>

                      {/* Row 3: Rate Breakdown (Material + Labour) — optional */}
                      <div className="pt-1">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                          Rate Breakdown
                          <span className="normal-case font-normal text-gray-400 ml-1">(optional — split into Material &amp; Labour)</span>
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Material Rate (Rs./unit)</label>
                            <input type="number" min="0" step="0.01"
                              value={itemForm.material_rate === 0 ? '' : itemForm.material_rate}
                              onChange={e => {
                                const rate = parseFloat(e.target.value) || 0;
                                const qty  = parseInt(itemForm.quantity, 10) || 1;
                                setItemForm(p => ({
                                  ...p,
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
                              value={itemForm.material_amount === 0 ? '' : itemForm.material_amount}
                              onChange={e => setItemForm(p => ({ ...p, material_amount: parseFloat(e.target.value) || 0 }))}
                              placeholder="auto = rate × qty"
                              className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Labour Rate (Rs./unit)</label>
                            <input type="number" min="0" step="0.01"
                              value={itemForm.labour_rate === 0 ? '' : itemForm.labour_rate}
                              onChange={e => {
                                const rate = parseFloat(e.target.value) || 0;
                                const qty  = parseInt(itemForm.quantity, 10) || 1;
                                setItemForm(p => ({
                                  ...p,
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
                              value={itemForm.labour_amount === 0 ? '' : itemForm.labour_amount}
                              onChange={e => setItemForm(p => ({ ...p, labour_amount: parseFloat(e.target.value) || 0 }))}
                              placeholder="auto = rate × qty"
                              className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                          </div>
                        </div>
                      </div>

                      {/* Execution total preview */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-teal-50 border border-teal-200 rounded-lg flex-wrap">
                          <span className="text-sm text-teal-700 font-medium">Item Total:</span>
                          <span className="text-sm font-bold text-teal-800">
                            Rs. {calcItemTotalExecution(itemForm).toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs text-teal-500 ml-auto">
                            {(parseFloat(itemForm.material_amount) > 0 || parseFloat(itemForm.labour_amount) > 0)
                              ? `Mat.(${(parseFloat(itemForm.material_amount)||0).toLocaleString('en-IN')}) + Lab.(${(parseFloat(itemForm.labour_amount)||0).toLocaleString('en-IN')})`
                              : (parseFloat(itemForm.material_rate) > 0 || parseFloat(itemForm.labour_rate) > 0)
                                ? `Rate×Qty = (${((parseFloat(itemForm.material_rate)||0)+(parseFloat(itemForm.labour_rate)||0)).toLocaleString('en-IN')} × ${parseInt(itemForm.quantity)||1})`
                                : `Rate×Qty = (${(parseFloat(itemForm.Professional_amount)||0).toLocaleString('en-IN')} × ${parseInt(itemForm.quantity)||1})`
                            }
                          </span>
                        </div>
                        <button onClick={handleAddItem} disabled={addItemDisabled}
                          className={`px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${editingIdx !== null ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-teal-600 text-white hover:bg-teal-700'}`}>
                          {editingIdx !== null ? <><Edit className="w-4 h-4" />Update</> : <><Plus className="w-4 h-4" />Add Item</>}
                        </button>
                      </div>
                    </>
                  ) : (
                    /* ════════════════════════════════════════════════════════
                        REGULATORY FIELDS  (cats 1, 2, 3, 4)
                        ════════════════════════════════════════════════════════ */
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Unit</label>
                          <input type="text"
                            value={itemForm.unit}
                            onChange={e => setItemForm(p => ({ ...p, unit: e.target.value }))}
                            placeholder="e.g. Lump Sum, nos"
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Qty <span className="text-red-400">*</span></label>
                          <input type="number" min="1"
                            value={itemForm.quantity}
                            onChange={e => setItemForm(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Professional (Rs.) <span className="text-red-400">*</span></label>
                          <input type="number" min="0" step="0.01"
                            value={itemForm.Professional_amount === 0 ? '' : itemForm.Professional_amount}
                            onChange={e => setItemForm(p => ({ ...p, Professional_amount: parseFloat(e.target.value) || 0 }))}
                            placeholder="0.00"
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                          Misc. (Rs.)
                          {itemForm.miscellaneous_amount !== '' && (
                            <span className={`ml-1.5 normal-case font-normal text-xs ${isMiscNumeric(itemForm.miscellaneous_amount) ? 'text-teal-500' : 'text-amber-500'}`}>
                              {isMiscNumeric(itemForm.miscellaneous_amount) ? '(calculated)' : '(note only)'}
                            </span>
                          )}
                        </label>
                        <input type="text"
                          value={itemForm.miscellaneous_amount}
                          onChange={e => setItemForm(p => ({ ...p, miscellaneous_amount: e.target.value }))}
                          placeholder="Amount or descriptive note"
                          className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-colors ${itemForm.miscellaneous_amount !== '' && !isMiscNumeric(itemForm.miscellaneous_amount) ? 'border-amber-300 focus:ring-amber-400 bg-amber-50' : 'border-gray-300 focus:ring-teal-500 bg-white'}`} />
                      </div>

                      {/* Regulatory total preview */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-teal-50 border border-teal-200 rounded-lg flex-wrap">
                          <span className="text-sm text-teal-700 font-medium">Item Total:</span>
                          <span className="text-sm font-bold text-teal-800">Rs. {calcItemTotalRegulatory(itemForm).toLocaleString('en-IN')}</span>
                          {itemForm.miscellaneous_amount !== '' && !isMiscNumeric(itemForm.miscellaneous_amount) ? (
                            <span className="text-xs text-amber-600 ml-auto flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              Misc shown as note
                            </span>
                          ) : (
                            <span className="text-xs text-teal-500 ml-auto">(Prof + Misc) × Qty</span>
                          )}
                        </div>
                        <button onClick={handleAddItem} disabled={addItemDisabled}
                          className={`px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${editingIdx !== null ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-teal-600 text-white hover:bg-teal-700'}`}>
                          {editingIdx !== null ? <><Edit className="w-4 h-4" />Update</> : <><Plus className="w-4 h-4" />Add Item</>}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── Items list for current category ── */}
            {activeItems.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">
                    Added Items — {activeCategoryId ? ALL_COMPLIANCE_CATEGORIES[activeCategoryId]?.shortName : ''}
                  </span>
                  <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-semibold">{activeItems.length} item{activeItems.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {activeItems.map((item, index) => {
                    const isExec = EXECUTION_CATS.includes(activeCategoryId);
                    const total  = isExec ? calcItemTotalExecution(item) : calcItemTotalRegulatory(item);
                    return (
                      <div key={index} className={`flex items-start gap-3 px-4 py-3 transition-colors ${editingIdx === index ? 'bg-amber-50 border-l-2 border-amber-400' : 'hover:bg-gray-50'}`}>
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-gray-500">{index + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 leading-snug">{item.compliance_name}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                            {item.sub_compliance_id && <span className="text-xs text-indigo-600 font-medium">{SUB_COMPLIANCE_CATEGORIES[item.sub_compliance_id]?.name}</span>}
                            <span className="text-xs text-gray-400">Qty: {item.quantity}</span>
                            {isExec ? (
                              <>
                                {item.unit && item.unit !== 'N/A' && <span className="text-xs text-gray-400">Unit: {item.unit}</span>}
                                {(parseFloat(item.material_rate) > 0 || parseFloat(item.labour_rate) > 0) ? (
                                  <>
                                    {parseFloat(item.material_rate) > 0 && <span className="text-xs text-gray-400">Mat.Rate: Rs.{parseFloat(item.material_rate).toLocaleString('en-IN')}</span>}
                                    {parseFloat(item.labour_rate) > 0  && <span className="text-xs text-gray-400">Lab.Rate: Rs.{parseFloat(item.labour_rate).toLocaleString('en-IN')}</span>}
                                  </>
                                ) : (
                                  <span className="text-xs text-gray-400">Rate: Rs.{(parseFloat(item.Professional_amount)||0).toLocaleString('en-IN')}</span>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="text-xs text-gray-400">Prof: Rs.{parseFloat(item.Professional_amount || 0).toLocaleString('en-IN')}</span>
                                {String(item.miscellaneous_amount ?? '').trim() !== '' && (
                                  isMiscNumeric(item.miscellaneous_amount)
                                    ? <span className="text-xs text-gray-400">Misc: Rs.{parseFloat(item.miscellaneous_amount).toLocaleString('en-IN')}</span>
                                    : <span className="text-xs text-amber-600 italic font-medium">Misc: {item.miscellaneous_amount}</span>
                                )}
                              </>
                            )}
                            <span className="text-xs font-semibold text-teal-700">Total: Rs. {total.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => handleEditItem(index)}
                            className={`p-1.5 rounded-lg transition-colors ${editingIdx === index ? 'bg-amber-100 text-amber-600' : 'text-gray-400 hover:bg-blue-50 hover:text-blue-600'}`} title="Edit item">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleRemoveItem(index)}
                            className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors" title="Remove item">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
                  <span className="text-sm font-bold text-gray-800">
                    Section Total: Rs. {activeItems.reduce((sum, item) => {
                      const isExec = EXECUTION_CATS.includes(activeCategoryId);
                      return sum + (isExec ? calcItemTotalExecution(item) : calcItemTotalRegulatory(item));
                    }, 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}

          </div>{/* end scrollable body */}

          {/* ── Footer ── */}
          <div className="border-t border-gray-200 px-5 py-4 bg-white flex items-center justify-between gap-3 flex-shrink-0"
            style={{ borderRadius: '0 0 20px 20px' }}>
            <span className="text-xs text-gray-400">
              {saveDisabled
                ? 'Add at least one item to continue'
                : `${totalItemCount} item${totalItemCount !== 1 ? 's' : ''} ready across ${Object.values(categoryItemsMap).filter(c => c.items?.length > 0).length} category/ies`}
            </span>
            <div className="flex gap-2">
              <button onClick={handleClose}
                className="px-5 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saveDisabled}
                className="px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
                Save Items
              </button>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0; }                          to { opacity: 1; }                        }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); }  }
        .animate-fadeIn  { animation: fadeIn  0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}