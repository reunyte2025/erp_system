/**
 * ============================================================================
 * AddComplianceModal — Reusable compliance add/edit modal
 * ============================================================================
 *
 * Used by:
 *   - quotations.jsx       (create / edit quotation)
 *   - viewproformadetails  (edit proforma inline)
 *   - viewquotationdetails (edit quotation details)
 *
 * Props:
 *   isOpen          {boolean}   — controls visibility
 *   onClose         {function}  — called when user dismisses without saving
 *   onSave          {function(newFlatItems: array)} — called on Save; receives
 *                               flat items array ready to spread into editItems
 *   existingItems   {array}     — current flat items already in the document
 *                               (used to lock type & detect category)
 *   fetchDescriptions {function(categoryId, subCategoryId): Promise<results[]>}
 *                               — async fn that fetches compliance descriptions
 *                               from the API for the given category/sub-category
 *
 * Behaviour:
 *   - Detects the compliance type (certificates vs execution) from existingItems
 *     and locks the modal to that type — so you can never mix types.
 *   - If no existing items → shows the type chooser (Certificates / Execution).
 *   - Each category tab (CC, OC, WaterMain, STP) has its OWN items array
 *     stored in categoryItemsMap so switching tabs never loses items.
 *   - On Save, emits ALL items across ALL categories with the correct
 *     compliance_category tag for each item.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X, Plus, Edit, Search, ChevronDown, Loader2, FileText, Trash2,
} from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────────────

const COMPLIANCE_CATEGORIES = {
  1: { id: 1, name: 'Construction Certificate', shortName: 'Construction Certificate' },
  2: { id: 2, name: 'Occupational Certificate', shortName: 'Occupational Certificate' },
  3: { id: 3, name: 'Water Main Commissioning', shortName: 'Water Main' },
  4: { id: 4, name: 'STP Commissioning',        shortName: 'STP' },
};

const SUB_COMPLIANCE_CATEGORIES = {
  1: { id: 1, name: 'Plumbing Compliance' },
  2: { id: 2, name: 'PCO Compliance' },
  3: { id: 3, name: 'General Compliance' },
  4: { id: 4, name: 'Road Setback Handing over' },
  0: { id: 0, name: 'Default' },
};

const COMPLIANCE_GROUPS = {
  certificates: [1, 2],
  execution:    [3, 4],
};

const BLANK_ITEM_FORM = {
  compliance_name:      '',
  compliance_id:        null,
  sub_compliance_id:    null,
  quantity:             1,
  miscellaneous_amount: '',
  Professional_amount:  0,
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

const isMiscNumeric = (value) => {
  if (value === '' || value === null || value === undefined) return false;
  const str = String(value).trim();
  if (str === '') return false;
  return !isNaN(str) && !isNaN(parseFloat(str));
};

const calcItemTotal = (item) => {
  const prof = parseFloat(item.Professional_amount) || 0;
  const misc = isMiscNumeric(item.miscellaneous_amount) ? parseFloat(item.miscellaneous_amount) : 0;
  const qty  = parseInt(item.quantity, 10) || 1;
  return Math.round((prof + misc) * qty * 100) / 100;
};

/**
 * Detect which compliance group the existing items belong to.
 * Returns 'certificates', 'execution', or null.
 */
const detectLockedType = (existingItems = []) => {
  if (!existingItems.length) return null;
  const cats = [...new Set(existingItems.map(it => it.compliance_category ?? 0))];
  if (cats.some(c => COMPLIANCE_GROUPS.certificates.includes(c))) return 'certificates';
  if (cats.some(c => COMPLIANCE_GROUPS.execution.includes(c)))    return 'execution';
  return null;
};

// ─── Sub-compliance Dropdown ─────────────────────────────────────────────────

const SubComplianceDropdown = ({ value, onChange, categoryId, placeholder = 'Select Sub-Compliance' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setIsOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const list = [1, 2].includes(categoryId)
    ? [SUB_COMPLIANCE_CATEGORIES[1], SUB_COMPLIANCE_CATEGORIES[2], SUB_COMPLIANCE_CATEGORIES[3], SUB_COMPLIANCE_CATEGORIES[4]]
    : [];

  const filtered  = list.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  const selected  = list.find(i => i.id === value);

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

// ─── Main Component ──────────────────────────────────────────────────────────────

export default function AddComplianceModal({ isOpen, onClose, onSave, existingItems = [], fetchDescriptions }) {

  // ── Type & category state ───────────────────────────────────────────────────
  const [selectedCategoryType, setSelectedCategoryType] = useState(null);
  const [activeCategoryId,     setActiveCategoryId]     = useState(null);

  /**
   * categoryItemsMap: { [categoryId: number]: { items: [], category_name: string } }
   * Each category tab has its OWN independent items array.
   * Switching tabs NEVER overwrites another tab's items.
   */
  const [categoryItemsMap, setCategoryItemsMap] = useState({});

  // Per-category item form: { [categoryId]: itemForm }
  const [itemFormMap,        setItemFormMap]        = useState({});
  // Per-category editing index: { [categoryId]: number | null }
  const [editingIndexMap,    setEditingIndexMap]    = useState({});

  // ── Description state ───────────────────────────────────────────────────────
  const [complianceDescriptions, setComplianceDescriptions] = useState([]);
  const [complianceDescLoading,  setComplianceDescLoading]  = useState(false);
  const [descriptionMode,        setDescriptionMode]        = useState('dropdown');
  const [descriptionSearch,      setDescriptionSearch]      = useState('');
  const [showDescDropdown,       setShowDescDropdown]       = useState(false);

  // Cache so switching tabs doesn't re-fetch
  const descCacheRef = useRef({});

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

    const lockedType = detectLockedType(existingItems);

    // Reset all transient state
    setCategoryItemsMap({});
    setItemFormMap({});
    setEditingIndexMap({});
    setComplianceDescriptions([]);
    setDescriptionMode('dropdown');
    setDescriptionSearch('');
    setShowDescDropdown(false);
    descCacheRef.current = {};

    if (lockedType) {
      // Type already determined — go straight to category selection
      initForType(lockedType);
    } else {
      // No existing items — show the type chooser
      setSelectedCategoryType(null);
      setActiveCategoryId(null);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const initForType = (type) => {
    setSelectedCategoryType(type);
    const ids = COMPLIANCE_GROUPS[type];
    const firstId = ids[0];

    // Pre-create empty slots for every category in the group
    const initMap = {};
    ids.forEach(id => {
      initMap[id] = { items: [], category_name: COMPLIANCE_CATEGORIES[id].shortName };
    });
    setCategoryItemsMap(initMap);

    const initItemForms = {};
    const initEditIdx   = {};
    ids.forEach(id => { initItemForms[id] = { ...BLANK_ITEM_FORM }; initEditIdx[id] = null; });
    setItemFormMap(initItemForms);
    setEditingIndexMap(initEditIdx);

    setActiveCategoryId(firstId);

    // For execution, fetch descriptions immediately (no sub-category required)
    if (type === 'execution') {
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

  // ── Category type selection (type chooser screen) ───────────────────────────
  const handleSelectType = (type) => {
    setDescriptionSearch('');
    setShowDescDropdown(false);
    setComplianceDescriptions([]);
    setDescriptionMode('dropdown');
    initForType(type);
  };

  // ── Category tab switching ───────────────────────────────────────────────────
  const handleCategoryChange = (categoryId) => {
    // Ensure this category has a slot — never lose existing items
    setCategoryItemsMap(prev => {
      if (prev[categoryId]) return prev;
      return { ...prev, [categoryId]: { items: [], category_name: COMPLIANCE_CATEGORIES[categoryId]?.shortName || '' } };
    });
    // Ensure this category has a form slot
    setItemFormMap(prev => ({ ...prev, [categoryId]: prev[categoryId] || { ...BLANK_ITEM_FORM } }));
    setEditingIndexMap(prev => ({ ...prev, [categoryId]: prev[categoryId] ?? null }));

    setActiveCategoryId(categoryId);

    // Reset description UI for the new tab
    setComplianceDescriptions([]);
    setDescriptionMode('dropdown');
    setDescriptionSearch('');
    setShowDescDropdown(false);

    // For execution, fetch descriptions immediately
    if (COMPLIANCE_GROUPS.execution.includes(categoryId)) {
      fetchDescForCategory(categoryId, null);
    } else {
      // For certificates, if the current form already has a sub-category, fetch
      const existingForm = itemFormMap[categoryId];
      if (existingForm?.sub_compliance_id) {
        fetchDescForCategory(categoryId, existingForm.sub_compliance_id);
      }
    }
  };

  // ── Per-category form helpers ────────────────────────────────────────────────
  const getItemForm   = () => itemFormMap[activeCategoryId]   || { ...BLANK_ITEM_FORM };
  const getEditingIdx = () => editingIndexMap[activeCategoryId] ?? null;
  const getActiveItems = () => categoryItemsMap[activeCategoryId]?.items || [];

  const setItemForm = (updater) => {
    setItemFormMap(prev => {
      const current = prev[activeCategoryId] || { ...BLANK_ITEM_FORM };
      const next    = typeof updater === 'function' ? updater(current) : updater;
      return { ...prev, [activeCategoryId]: next };
    });
  };

  const setEditingIdx = (idx) => {
    setEditingIndexMap(prev => ({ ...prev, [activeCategoryId]: idx }));
  };

  const setActiveItems = (updater) => {
    setCategoryItemsMap(prev => {
      const current   = prev[activeCategoryId] || { items: [], category_name: '' };
      const nextItems = typeof updater === 'function' ? updater(current.items) : updater;
      return { ...prev, [activeCategoryId]: { ...current, items: nextItems } };
    });
  };

  // ── Item CRUD ────────────────────────────────────────────────────────────────
  const handleAddItem = () => {
    const form = getItemForm();
    if (!form.compliance_name.trim()) return;
    if (COMPLIANCE_GROUPS.certificates.includes(activeCategoryId) && !form.sub_compliance_id) return;

    const newItem = {
      compliance_name:      form.compliance_name.trim(),
      compliance_id:        form.compliance_id   || null,
      sub_compliance_id:    form.sub_compliance_id || null,
      quantity:             parseInt(form.quantity, 10) || 1,
      miscellaneous_amount: String(form.miscellaneous_amount ?? '').trim(),
      Professional_amount:  parseFloat(form.Professional_amount) || 0,
      total_amount:         calcItemTotal(form),
    };

    const editingIdx = getEditingIdx();
    if (editingIdx !== null) {
      setActiveItems(prev => prev.map((it, i) => i === editingIdx ? newItem : it));
      setEditingIdx(null);
    } else {
      setActiveItems(prev => [...prev, newItem]);
    }
    // Preserve sub_compliance_id so user keeps adding under same sub-category
    setItemForm(prev => ({ ...BLANK_ITEM_FORM, sub_compliance_id: prev.sub_compliance_id }));
    setDescriptionSearch('');
    setShowDescDropdown(false);
  };

  const handleEditItem = (index) => {
    const item = getActiveItems()[index];
    if (!item) return;
    setItemForm({
      compliance_name:      item.compliance_name,
      compliance_id:        item.compliance_id   || null,
      sub_compliance_id:    item.sub_compliance_id || null,
      quantity:             item.quantity || 1,
      miscellaneous_amount: item.miscellaneous_amount || '',
      Professional_amount:  item.Professional_amount || 0,
    });
    setEditingIdx(index);
    if (item.sub_compliance_id && COMPLIANCE_GROUPS.certificates.includes(activeCategoryId)) {
      fetchDescForCategory(activeCategoryId, item.sub_compliance_id);
    }
  };

  const handleRemoveItem = (index) => {
    const editingIdx = getEditingIdx();
    if (editingIdx === index) {
      setEditingIdx(null);
      setItemForm(prev => ({ ...BLANK_ITEM_FORM, sub_compliance_id: prev.sub_compliance_id }));
    }
    setActiveItems(prev => prev.filter((_, i) => i !== index));
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = () => {
    const totalItems = Object.values(categoryItemsMap).reduce((s, c) => s + (c.items?.length || 0), 0);
    if (totalItems === 0) return;

    // Build flat items array — each item tagged with its own compliance_category
    const newFlatItems = [];
    Object.entries(categoryItemsMap).forEach(([catIdStr, catData]) => {
      const catId = parseInt(catIdStr, 10);
      (catData.items || []).forEach(item => {
        if (!item.compliance_name?.trim()) return;
        newFlatItems.push({
          id:                      null, // new item — backend will assign
          description:             item.compliance_name.trim(),
          quantity:                parseInt(item.quantity) || 1,
          Professional_amount:     parseFloat(item.Professional_amount) || 0,
          miscellaneous_amount:    String(item.miscellaneous_amount ?? '').trim() || '--',
          compliance_category:     catId,                        // ← correct per-category tag
          sub_compliance_category: item.sub_compliance_id || 0,
          total_amount:            calcItemTotal(item),
        });
      });
    });

    if (newFlatItems.length === 0) return;
    onSave(newFlatItems);
    handleClose();
  };

  // ── Close ────────────────────────────────────────────────────────────────────
  const handleClose = () => {
    // State reset happens in the isOpen useEffect on next open
    onClose();
  };

  // ── Computed for render ──────────────────────────────────────────────────────
  const itemForm       = getItemForm();
  const editingIdx     = getEditingIdx();
  const activeItems    = getActiveItems();
  const totalItemCount = Object.values(categoryItemsMap).reduce((s, c) => s + (c.items?.length || 0), 0);
  const saveDisabled   = totalItemCount === 0;

  // Description uniqueness: block re-adding same description under same sub-category
  const usedDescriptions = (() => {
    const used = new Set();
    activeItems.forEach((item, i) => {
      if (i === editingIdx) return; // current item being edited is OK
      if (item.sub_compliance_id === itemForm.sub_compliance_id && item.compliance_name) {
        used.add(item.compliance_name);
      }
    });
    return used;
  })();

  const addItemDisabled = (
    !itemForm.compliance_name.trim() ||
    (selectedCategoryType === 'certificates' && !itemForm.sub_compliance_id)
  );

  if (!isOpen) return null;

  const lockedType = detectLockedType(existingItems);

  return (
    <div className="fixed inset-0 z-[9999] animate-fadeIn" style={{ position: 'fixed', overflow: 'hidden' }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" style={{ position: 'fixed', width: '100vw', height: '100vh' }}
        onClick={handleClose} />

      <div className="relative z-10 flex items-center justify-center p-4" style={{ height: '100vh' }}>
        <div
          className="relative w-full max-w-2xl animate-scaleIn bg-white flex flex-col"
          style={{ borderRadius: '20px', boxShadow: '0 32px 64px rgba(0,0,0,0.24)', height: '88vh', maxHeight: '760px', minHeight: '480px', overflow: 'hidden' }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="bg-teal-700 px-6 py-4 flex-shrink-0" style={{ borderRadius: '20px 20px 0 0' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-base leading-tight">Add New Compliance</p>
                  <p className="text-teal-200 text-xs mt-0.5">
                    {activeCategoryId
                      ? COMPLIANCE_CATEGORIES[activeCategoryId]?.name
                      : 'Select a category below'}
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

            {/* ── Type chooser — shown only when no type locked and not yet selected ── */}
            {!selectedCategoryType && !lockedType && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Select Compliance Type</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { type: 'certificates', label: 'Certificates', sub: 'Construction / Occupational' },
                    { type: 'execution',    label: 'Execution',    sub: 'Water Main / STP' },
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

            {/* ── Category tab pills — shown after type is selected ── */}
            {selectedCategoryType && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Compliance Category</p>
                <div className="grid grid-cols-2 gap-2">
                  {(selectedCategoryType === 'certificates'
                    ? [{ id: 1, label: 'Construction Certificate' }, { id: 2, label: 'Occupational Certificate' }]
                    : [{ id: 3, label: 'Water Main' },               { id: 4, label: 'STP' }]
                  ).map(cat => {
                    const itemCount = categoryItemsMap[cat.id]?.items?.length || 0;
                    return (
                      <button key={cat.id} onClick={() => handleCategoryChange(cat.id)}
                        className={`px-4 py-2.5 rounded-lg border-2 font-medium text-sm transition-colors relative ${activeCategoryId === cat.id ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}>
                        {cat.label}
                        {/* Badge showing item count for this tab */}
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

            {/* ── Add Item form — shown after a category is selected ── */}
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
                    <button onClick={() => { setEditingIdx(null); setItemForm(prev => ({ ...BLANK_ITEM_FORM, sub_compliance_id: prev.sub_compliance_id })); }}
                      className="text-xs text-amber-600 hover:text-amber-800 font-medium">Cancel edit</button>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  {/* Sub-compliance dropdown — certificates only */}
                  {selectedCategoryType === 'certificates' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Sub-Compliance Category <span className="text-red-400">*</span>
                      </label>
                      <SubComplianceDropdown
                        value={itemForm.sub_compliance_id}
                        categoryId={activeCategoryId}
                        onChange={(id) => {
                          setItemForm(prev => ({ ...prev, sub_compliance_id: id, compliance_name: '' }));
                          setDescriptionSearch('');
                          setShowDescDropdown(false);
                          fetchDescForCategory(activeCategoryId, id);
                        }}
                        placeholder="Select sub-compliance category"
                      />
                    </div>
                  )}

                  {/* Description */}
                  <div className="relative" style={{ paddingBottom: showDescDropdown ? '320px' : '0', transition: 'padding-bottom 0.15s ease' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Description <span className="text-red-400">*</span>
                      </label>
                      {complianceDescriptions.length > 0 && (
                        <button type="button"
                          onClick={() => { setDescriptionMode(p => p === 'dropdown' ? 'manual' : 'dropdown'); setItemForm(p => ({ ...p, compliance_name: '' })); }}
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
                      <div className="description-dropdown relative w-full">
                        <button type="button"
                          onClick={() => {
                            const next = !showDescDropdown;
                            setShowDescDropdown(next);
                            if (next) {
                              setTimeout(() => {
                                const body = document.getElementById('acm-modal-body');
                                if (body) body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });
                              }, 50);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-left flex items-center justify-between bg-white hover:bg-gray-50 transition-colors">
                          <span className={itemForm.compliance_name ? 'text-gray-900' : 'text-gray-500'}>
                            {itemForm.compliance_name
                              ? (itemForm.compliance_name.length > 65 ? itemForm.compliance_name.substring(0, 65) + '…' : itemForm.compliance_name)
                              : 'Select a description'}
                          </span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${showDescDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showDescDropdown && (
                          <div className="absolute left-0 top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
                            style={{ zIndex: 99999 }} onMouseDown={e => e.preventDefault()}>
                            <div className="p-3 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-400" />
                                <input type="text" placeholder="Search descriptions..." value={descriptionSearch}
                                  onChange={e => setDescriptionSearch(e.target.value)}
                                  onClick={e => e.stopPropagation()}
                                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm bg-white" autoFocus />
                              </div>
                              <div className="flex items-center justify-between mt-2 px-0.5">
                                <span className="text-xs text-gray-400">
                                  {complianceDescriptions.filter(d =>
                                    !usedDescriptions.has(d.compliance_description) &&
                                    d.compliance_description?.toLowerCase().includes(descriptionSearch.toLowerCase())
                                  ).length} results
                                </span>
                                <span className="text-xs text-teal-500 font-medium">Click to select</span>
                              </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto p-2 space-y-1.5">
                              {complianceDescriptions
                                .filter(d =>
                                  !usedDescriptions.has(d.compliance_description) &&
                                  d.compliance_description?.toLowerCase().includes(descriptionSearch.toLowerCase())
                                )
                                .map((desc, idx) => {
                                  const isSelected = itemForm.compliance_name === desc.compliance_description;
                                  const words   = (desc.compliance_description || '').split(' ');
                                  const preview = words.slice(0, 4).join(' ');
                                  const rest    = words.slice(4).join(' ');
                                  return (
                                    <button key={desc.id || idx} type="button"
                                      onClick={() => { setItemForm(p => ({ ...p, compliance_name: desc.compliance_description })); setShowDescDropdown(false); setDescriptionSearch(''); }}
                                      className={`w-full text-left rounded-lg border transition-all duration-150 group ${isSelected ? 'border-teal-400 bg-teal-50 shadow-sm' : 'border-gray-100 bg-white hover:border-teal-200 hover:bg-teal-50/30'}`}>
                                      <div className="flex items-start gap-3 px-3 py-2.5">
                                        <div className={`flex-shrink-0 min-w-[1.5rem] h-6 rounded-md flex items-center justify-center text-xs font-bold mt-0.5 ${isSelected ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-teal-100 group-hover:text-teal-600'}`}>
                                          {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className={`text-sm leading-relaxed ${isSelected ? 'text-teal-900 font-medium' : 'text-gray-700'}`}>
                                            <span className={`font-semibold ${isSelected ? 'text-teal-700' : 'text-gray-900'}`}>{preview}</span>
                                            {rest && <span> {rest}</span>}
                                          </p>
                                        </div>
                                        {isSelected && (
                                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center mt-0.5">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                          </div>
                                        )}
                                      </div>
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

                  {/* Qty + Amounts row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Qty <span className="text-red-400">*</span></label>
                      <input type="number" min="1" value={itemForm.quantity}
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
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Misc. (Rs.)
                        {itemForm.miscellaneous_amount !== '' && (
                          <span className={`ml-1.5 normal-case font-normal text-xs ${isMiscNumeric(itemForm.miscellaneous_amount) ? 'text-teal-500' : 'text-amber-500'}`}>
                            {isMiscNumeric(itemForm.miscellaneous_amount) ? '(calculated)' : '(note only)'}
                          </span>
                        )}
                      </label>
                      <input type="text" value={itemForm.miscellaneous_amount}
                        onChange={e => setItemForm(p => ({ ...p, miscellaneous_amount: e.target.value }))}
                        placeholder="Amount or description"
                        className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-colors ${itemForm.miscellaneous_amount !== '' && !isMiscNumeric(itemForm.miscellaneous_amount) ? 'border-amber-300 focus:ring-amber-400 bg-amber-50' : 'border-gray-300 focus:ring-teal-500 bg-white'}`} />
                    </div>
                  </div>

                  {/* Total preview + Add button */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-teal-50 border border-teal-200 rounded-lg flex-wrap">
                      <span className="text-sm text-teal-700 font-medium">Item Total:</span>
                      <span className="text-sm font-bold text-teal-800">Rs. {calcItemTotal(itemForm).toLocaleString('en-IN')}</span>
                      {itemForm.miscellaneous_amount !== '' && !isMiscNumeric(itemForm.miscellaneous_amount) ? (
                        <span className="text-xs text-amber-600 ml-auto flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Misc shown as note
                        </span>
                      ) : (
                        <span className="text-xs text-teal-500 ml-auto">(Prof + Misc) x Qty</span>
                      )}
                    </div>
                    <button onClick={handleAddItem} disabled={addItemDisabled}
                      className={`px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${editingIdx !== null ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-teal-600 text-white hover:bg-teal-700'}`}>
                      {editingIdx !== null ? <><Edit className="w-4 h-4" />Update</> : <><Plus className="w-4 h-4" />Add Item</>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Items list for current category ── */}
            {activeItems.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">
                    Added Items — {activeCategoryId ? COMPLIANCE_CATEGORIES[activeCategoryId]?.shortName : ''}
                  </span>
                  <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-semibold">{activeItems.length} item{activeItems.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {activeItems.map((item, index) => (
                    <div key={index} className={`flex items-start gap-3 px-4 py-3 transition-colors ${editingIdx === index ? 'bg-amber-50 border-l-2 border-amber-400' : 'hover:bg-gray-50'}`}>
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-gray-500">{index + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 leading-snug">{item.compliance_name}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                          {item.sub_compliance_id && <span className="text-xs text-indigo-600 font-medium">{SUB_COMPLIANCE_CATEGORIES[item.sub_compliance_id]?.name}</span>}
                          <span className="text-xs text-gray-400">Qty: {item.quantity}</span>
                          <span className="text-xs text-gray-400">Prof: Rs. {parseFloat(item.Professional_amount || 0).toLocaleString('en-IN')}</span>
                          {String(item.miscellaneous_amount ?? '').trim() !== '' && (
                            isMiscNumeric(item.miscellaneous_amount)
                              ? <span className="text-xs text-gray-400">Misc: Rs. {parseFloat(item.miscellaneous_amount).toLocaleString('en-IN')}</span>
                              : <span className="text-xs text-amber-600 italic font-medium">Misc: {item.miscellaneous_amount}</span>
                          )}
                          <span className="text-xs font-semibold text-teal-700">Total: Rs. {calcItemTotal(item).toLocaleString('en-IN')}</span>
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
                  ))}
                </div>
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
                  <span className="text-sm font-bold text-gray-800">
                    Section Total: Rs. {activeItems.reduce((sum, item) => sum + calcItemTotal(item), 0).toLocaleString('en-IN')}
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
                Save Compliance
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