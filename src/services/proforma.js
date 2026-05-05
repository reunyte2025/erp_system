// proforma service - fixed named exports
import api, { normalizeError } from './api';

/**
 * ============================================================================
 * PROFORMA SERVICE
 * ============================================================================
 */

const ENABLE_SERVICE_LOGGING = false;

const serviceLogger = {
  log: (...args) => ENABLE_SERVICE_LOGGING && console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

const ENDPOINTS = {
  GET_ALL:                   '/proformas/get_all_proformas/',
  GET_REGULATORY:            '/proformas/get_regulatory_proforma/',
  GET_EXECUTION:             '/proformas/get_execuation_proforma/',
  CREATE_REGULATORY:         '/proformas/create_regulatory_proforma/',
  CREATE_EXECUTION:          '/proformas/create_execution_proforma/',
  UPDATE:                    '/proformas/',
  UPDATE_FULL:               '/proformas/update_proforma/',
  UPDATE_REGULATORY:         '/proformas/update_regulatory_proforma/',
  UPDATE_EXECUTION:          '/proformas/update_execution_proforma/',
  DELETE:                    '/proformas/',
  SEND_FOR_APPROVAL:         '/proformas/send_for_approval/',
  APPROVE:                   '/proformas/approve_proforma/',
  REJECT:                    '/proformas/reject_proforma/',
  GENERATE_PDF_CONSTRUCTIVE: '/proformas/generate_constructive_proforma_pdf/',
  GENERATE_PDF_OTHER:        '/proformas/generate_other_proforma_pdf/',
};

const calculateStatsFromTotal = (totalCount) => ({
  total: totalCount,
  draft: Math.floor(totalCount * 0.10),
  under_review: Math.floor(totalCount * 0.30),
  verified: Math.floor(totalCount * 0.60),
});

export const getProformas = async (params = {}) => {
  try {
    const queryParams = { page: 1, page_size: 10, ...params };
    serviceLogger.log('[Proforma Service] Fetching proformas:', queryParams);
    const response = await api.get(ENDPOINTS.GET_ALL, { params: queryParams });
    return response.data;
  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('[Proforma Service] getProformas failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * getProformaById
 *
 * Fetches a single proforma using the correct typed endpoint.
 *
 * @param {number|string} id            — Proforma ID
 * @param {string}        [proformaType] — Optional: 'execution' or 'regulatory'
 *                                         Pass this when you already know the type
 *                                         (e.g. from the list API's proforma_type field)
 *                                         to avoid an unnecessary extra request.
 *                                         When omitted the function tries regulatory
 *                                         first, then execution.
 */
export const getProformaById = async (id, proformaType) => {
  if (!id) throw new Error('Proforma ID is required');

  // Normalise the hint so we can do simple string comparisons
  const typeHint = String(proformaType || '').trim().toLowerCase();

  const tryEndpoint = async (endpoint) => {
    try {
      const response = await api.get(endpoint, { params: { id } });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  };

  try {
    serviceLogger.log(`[Proforma Service] Fetching proforma ID: ${id}, type hint: "${typeHint}"`);

    // ── Fast-path: caller already knows the type ──────────────────────────────
    if (typeHint.includes('execution')) {
      const result = await tryEndpoint(ENDPOINTS.GET_EXECUTION);
      if (result) return result;
      // Fallback (should never be needed) in case the hint was stale
      const fallback = await tryEndpoint(ENDPOINTS.GET_REGULATORY);
      if (fallback) return fallback;
      throw new Error('Server error: 404');
    }

    if (typeHint.includes('regulatory')) {
      const result = await tryEndpoint(ENDPOINTS.GET_REGULATORY);
      if (result) return result;
      // Fallback
      const fallback = await tryEndpoint(ENDPOINTS.GET_EXECUTION);
      if (fallback) return fallback;
      throw new Error('Server error: 404');
    }

    // ── No hint: try regulatory first (most common), then execution ──────────
    const regulatoryResult = await tryEndpoint(ENDPOINTS.GET_REGULATORY);
    if (regulatoryResult) return regulatoryResult;

    const executionResult = await tryEndpoint(ENDPOINTS.GET_EXECUTION);
    if (executionResult) return executionResult;

    throw new Error('Server error: 404');
  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error(`[Proforma Service] getProformaById(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

const inferProformaCreationType = (proformaData = {}) => {
  const normalizedType = String(
    proformaData.quotation_type ||
    proformaData.proforma_type ||
    ''
  ).trim().toLowerCase();

  if (normalizedType.includes('execution')) return 'execution';
  if (normalizedType.includes('regulatory')) return 'regulatory';

  const items = Array.isArray(proformaData.items) ? proformaData.items : [];
  const hasExecutionItems = items.some((item) => {
    const categoryId = Number(item?.compliance_category || item?.category || 0);
    return [5, 6, 7].includes(categoryId);
  });

  return hasExecutionItems ? 'execution' : 'regulatory';
};

const createTypedProforma = async (proformaData = {}, creationType) => {
  if (!proformaData.quotation) throw new Error('Quotation is required');

  const endpoint = creationType === 'execution'
    ? ENDPOINTS.CREATE_EXECUTION
    : ENDPOINTS.CREATE_REGULATORY;

  const payload = {
    quotation: Number(proformaData.quotation),
  };

  serviceLogger.log(`[Proforma Service] Creating ${creationType} proforma:`, payload);
  const response = await api.post(endpoint, payload);
  return response.data;
};

export const createProforma = async (proformaData) => {
  try {
    const creationType = inferProformaCreationType(proformaData);
    return await createTypedProforma(proformaData, creationType);
  } catch (error) {
    if (error.response?.status === 400) {
      const backendError =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.detail ||
        JSON.stringify(error.response?.data);
      throw new Error(`Validation Error: ${backendError}`);
    }
    const errorMessage = normalizeError(error);
    throw new Error(errorMessage);
  }
};

export const createRegulatoryProforma = async (proformaData) => {
  try {
    return await createTypedProforma(proformaData, 'regulatory');
  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('[Proforma Service] createRegulatoryProforma failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

export const createExecutionProforma = async (proformaData) => {
  try {
    return await createTypedProforma(proformaData, 'execution');
  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('[Proforma Service] createExecutionProforma failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Update proforma (partial PATCH — for simple field updates)
 */
export const updateProforma = async (id, proformaData) => {
  try {
    if (!id) throw new Error('Proforma ID is required');
    const payload = {};
    if (proformaData.client        !== undefined) payload.client        = Number(proformaData.client);
    if (proformaData.quotation     !== undefined) payload.quotation     = Number(proformaData.quotation);
    if (proformaData.gst_rate      !== undefined) payload.gst_rate      = String(proformaData.gst_rate);
    if (proformaData.discount_rate !== undefined) payload.discount_rate = String(proformaData.discount_rate);
    if (proformaData.notes         !== undefined) payload.notes         = proformaData.notes?.trim() || '';
    const response = await api.patch(`${ENDPOINTS.UPDATE}${id}/`, payload);
    return response.data;
  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error(`[Proforma Service] updateProforma(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

// ── Internal error surfacer (mirrors _surfaceErrors in quotation.js) ──────────
const _surfaceProformaErrors = (error, label) => {
  if (error.response?.status === 400) {
    const responseData = error.response.data;
    const rawErrors    = responseData?.errors || responseData;
    const errorParts   = [];
    if (rawErrors && typeof rawErrors === 'object') {
      Object.entries(rawErrors).forEach(([field, value]) => {
        if (field === 'items' && Array.isArray(value)) {
          value.forEach((itemErrors, idx) => {
            if (itemErrors && typeof itemErrors === 'object') {
              Object.entries(itemErrors).forEach(([f, msgs]) => {
                errorParts.push(`Item ${idx + 1} (${f}): ${Array.isArray(msgs) ? msgs.join(', ') : String(msgs)}`);
              });
            }
          });
        } else {
          errorParts.push(`${field}: ${Array.isArray(value) ? value.join(', ') : String(value)}`);
        }
      });
    }
    const friendlyMsg = errorParts.length > 0
      ? errorParts.join(' | ')
      : (responseData?.message || 'Validation failed — please check your input');
    serviceLogger.error(`${label} 400:`, friendlyMsg);
    throw new Error(`Server error: 400 — ${friendlyMsg}`);
  }
  throw error;
};

// ── Build the shared base payload fields (common to both regulatory and execution) ──
const _buildProformaBasePayload = (proformaData, sub, gst, grand) => {
  const now = new Date().toISOString();
  return {
    id:               parseInt(proformaData.id),
    client:           parseInt(proformaData.client),
    project:          parseInt(proformaData.project),
    company:          parseInt(proformaData.company) || 1,
    issue_date:       proformaData.issue_date  || now,
    valid_until:      proformaData.valid_until  || now,
    sac_code:         String(proformaData.sac_code || '').slice(0, 6),
    gst_rate:         String((parseFloat(proformaData.gst_rate)      || 0).toFixed(2)),
    discount_rate:    String((parseFloat(proformaData.discount_rate)  || 0).toFixed(2)),
    total_amount:     String((parseFloat(sub)  || 0).toFixed(2)),
    total_gst_amount: String((parseFloat(gst)  || 0).toFixed(2)),
    grand_total:      String((parseFloat(grand) || 0).toFixed(2)),
    status:           parseInt(proformaData.status) || 1,
    reason:           String(proformaData.reason || '').trim(),
  };
};

/**
 * Update a Regulatory Compliance proforma.
 * PUT /proformas/update_regulatory_proforma/
 *
 * Items payload: id, description, quantity, unit, consultancy_charges,
 *                Professional_amount, total_amount, compliance_category, sub_compliance_category
 */
export const updateRegulatoryProforma = async (proformaData) => {
  if (!proformaData.id) throw new Error('Proforma ID is required for update');
  serviceLogger.log(`[Proforma Service] Updating regulatory proforma ${proformaData.id}…`);

  const sub   = parseFloat(proformaData.total_amount)     || 0;
  const gst   = parseFloat(proformaData.total_gst_amount) || 0;
  const grand = parseFloat(proformaData.grand_total)      || 0;

  const payload = {
    ..._buildProformaBasePayload(proformaData, sub, gst, grand),
    items: (proformaData.items || []).map(item => {
      const rawId  = item.id != null ? parseInt(item.id) : null;
      const itemId = rawId && rawId > 0 ? rawId : null;
      const quantity = parseInt(item.quantity) || 1;
      const prof = parseFloat(item.Professional_amount) || 0;
      const consultancy = (() => {
        const raw = item.consultancy_charges ?? item.miscellaneous_amount ?? '';
        const num = parseFloat(String(raw).trim());
        return isNaN(num) ? '0.00' : num.toFixed(2);
      })();
      const total = parseFloat(item.total_amount) || parseFloat(((prof + parseFloat(consultancy || 0)) * quantity).toFixed(2));
      return {
        id:                      itemId,
        description:             String(item.description || '').trim(),
        quantity,
        unit:                    String(item.unit || '').trim() || 'N/A',
        consultancy_charges:     consultancy,
        Professional_amount:     String(prof.toFixed(2)),
        total_amount:            String(total.toFixed(2)),
        compliance_category:     parseInt(item.compliance_category) || 1,
        sub_compliance_category: parseInt(item.sub_compliance_category || 0),
      };
    }),
  };

  try {
    serviceLogger.log('[Proforma Service] updateRegulatoryProforma payload:', JSON.stringify(payload, null, 2));
    const response = await api.put(ENDPOINTS.UPDATE_REGULATORY, payload);
    serviceLogger.log(`[Proforma Service] Regulatory proforma ${proformaData.id} updated`);
    return response.data;
  } catch (error) {
    if (error.response?.data) {
      serviceLogger.error('[Proforma Service] updateRegulatoryProforma backend error:', JSON.stringify(error.response.data, null, 2));
    }
    _surfaceProformaErrors(error, `updateRegulatoryProforma(${proformaData.id})`);
  }
};

/**
 * Update an Execution Compliance proforma.
 * PUT /proformas/update_execution_proforma/
 *
 * Items payload: id, description, quantity, unit, sac_code, Professional_amount,
 *                material_rate, material_amount, labour_rate, labour_amount,
 *                total_amount, compliance_category, sub_compliance_category
 */
export const updateExecutionProforma = async (proformaData) => {
  if (!proformaData.id) throw new Error('Proforma ID is required for update');
  serviceLogger.log(`[Proforma Service] Updating execution proforma ${proformaData.id}…`);

  const sub   = parseFloat(proformaData.total_amount)     || 0;
  const gst   = parseFloat(proformaData.total_gst_amount) || 0;
  const grand = parseFloat(proformaData.grand_total)      || 0;

  const payload = {
    ..._buildProformaBasePayload(proformaData, sub, gst, grand),
    items: (proformaData.items || []).map(item => {
      const rawId  = item.id != null ? parseInt(item.id) : null;
      const itemId = rawId && rawId > 0 ? rawId : null;
      const quantity     = parseInt(item.quantity) || 1;
      const prof         = parseFloat(item.Professional_amount) || 0;
      const matRate      = parseFloat(item.material_rate)   || 0;
      const labRate      = parseFloat(item.labour_rate)     || 0;
      const matAmt       = (parseFloat(item.material_amount) || 0) || (matRate > 0 ? matRate * quantity : 0);
      const labAmt       = (parseFloat(item.labour_amount)   || 0) || (labRate > 0 ? labRate * quantity : 0);
      const finalMatRate = matRate > 0 ? matRate : (quantity > 0 ? parseFloat((matAmt / quantity).toFixed(2)) : 0);
      const finalLabRate = labRate > 0 ? labRate : (quantity > 0 ? parseFloat((labAmt / quantity).toFixed(2)) : 0);
      const total        = (matAmt + labAmt) > 0
        ? parseFloat((matAmt + labAmt).toFixed(2))
        : parseFloat((prof * quantity).toFixed(2));
      return {
        id:                      itemId,
        description:             String(item.description || '').trim(),
        quantity,
        unit:                    String(item.unit || '').trim() || 'N/A',
        sac_code:                String(item.sac_code || item.item_sac_code || '').trim(),
        Professional_amount:     String(prof.toFixed(2)),
        material_rate:           String(finalMatRate.toFixed(2)),
        material_amount:         String(matAmt.toFixed(2)),
        labour_rate:             String(finalLabRate.toFixed(2)),
        labour_amount:           String(labAmt.toFixed(2)),
        total_amount:            String(total.toFixed(2)),
        compliance_category:     parseInt(item.compliance_category) || 5,
        sub_compliance_category: parseInt(item.sub_compliance_category || 0),
      };
    }),
  };

  try {
    serviceLogger.log('[Proforma Service] updateExecutionProforma payload:', JSON.stringify(payload, null, 2));
    const response = await api.put(ENDPOINTS.UPDATE_EXECUTION, payload);
    serviceLogger.log(`[Proforma Service] Execution proforma ${proformaData.id} updated`);
    return response.data;
  } catch (error) {
    if (error.response?.data) {
      serviceLogger.error('[Proforma Service] updateExecutionProforma backend error:', JSON.stringify(error.response.data, null, 2));
    }
    _surfaceProformaErrors(error, `updateExecutionProforma(${proformaData.id})`);
  }
};

/**
 * Smart update — reads proforma_type and routes to the correct typed endpoint.
 * Used by viewproformadetails.jsx handleSaveUpdateConfirm.
 *
 * PUT /proformas/update_regulatory_proforma/  (Regulatory)
 * PUT /proformas/update_execution_proforma/   (Execution)
 */
export const updateProformaFull = async (proformaData) => {
  if (!proformaData.id) throw new Error('Proforma ID is required for update');

  const pType  = String(proformaData.proforma_type || '').toLowerCase().trim();
  const isExec = pType.includes('execution') ||
    (proformaData.items || []).some(item => {
      const catId = Number(item?.compliance_category || 0);
      return [5, 6, 7].includes(catId)
        || item?.material_rate   != null
        || item?.material_amount != null
        || item?.labour_rate     != null
        || item?.labour_amount   != null;
    });

  serviceLogger.log(
    `[Proforma Service] updateProformaFull(${proformaData.id}) → routing to ${isExec ? 'execution' : 'regulatory'} endpoint`
  );

  return isExec
    ? updateExecutionProforma(proformaData)
    : updateRegulatoryProforma(proformaData);
};

// ============================================================================
// COMPLIANCE FUNCTIONS (mirrors quotation.js — used by Add Compliance modal)
// ============================================================================

/**
 * Fetch compliance descriptions for a given category (and optional sub-category).
 * Used by the Add New Compliance modal in the proforma detail page.
 */
export const getComplianceByCategory = async (categoryId, subCategoryId = null) => {
  try {
    if (!categoryId) throw new Error('Category ID is required');
    serviceLogger.log(`[Proforma Service] Fetching compliance for category: ${categoryId}`);
    const params = { category: categoryId, page_size: 100 };
    if (subCategoryId) params.sub_category = subCategoryId;
    const response = await api.get('/compliance/get_compliance_by_category/', { params });
    serviceLogger.log('[Proforma Service] Compliance response:', response.data);
    return response.data;
  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('[Proforma Service] getComplianceByCategory failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

export const deleteProforma = async (id) => {
  try {
    if (!id) throw new Error('Proforma ID is required');
    const response = await api.delete(`${ENDPOINTS.DELETE}${id}/`);
    return response.data;
  } catch (error) {
    const errorMessage = normalizeError(error);
    throw new Error(errorMessage);
  }
};

/**
 * Delete a proforma by ID using the dedicated delete endpoint.
 *
 * Endpoint:  DELETE /api/proformas/delete_proforma/?id=<id>
 *
 * On success the backend sets:
 *   is_active  → false
 *   is_deleted → true
 *   status     → 5
 *
 * @param {number} id - Proforma ID to delete
 * @returns {Promise<object>} { status: 'success', data: <response> }
 * @throws {Error} If deletion fails
 */
export const deleteProformaById = async (id) => {
  try {
    if (!id) throw new Error('Proforma ID is required');
    serviceLogger.log(`[Proforma Service] Deleting proforma ${id} via delete_proforma endpoint...`);
    const response = await api.delete('/proformas/delete_proforma/', {
      params: { id },
    });
    serviceLogger.log(`[Proforma Service] Proforma ${id} deleted successfully`);
    return { status: 'success', data: response.data };
  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error(`[Proforma Service] deleteProformaById(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Helper — triggers a browser download from a blob response.
 */
const _triggerPdfDownload = (blob, fileName) => {
  if (!blob || blob.size === 0) {
    throw new Error('Empty PDF received from server. Please try again.');
  }
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
};

/**
 * Generate and download PDF for Constructive India (company ID = 1).
 * POST /api/proformas/generate_constructive_proforma_pdf/
 *
 * @param {Object} params
 * @param {number|string} params.id             - Proforma ID
 * @param {string}        params.company_name
 * @param {string}        params.address
 * @param {string}        params.gst_no
 * @param {string}        params.scope_of_work
 * @param {string}        params.sac_code
 * @param {string}        params.invoice_date   - "YYYY-MM-DD"
 * @param {string}        params.work_order_date - "YYYY-MM-DD"
 * @param {string}        params.valid_from      - "YYYY-MM-DD"
 * @param {string}        params.valid_till      - "YYYY-MM-DD"
 * @param {string}        params.vendor_code
 * @param {string}        params.po_no
 * @param {string}        params.schedule_date   - "YYYY-MM-DD"
 * @param {string}        params.state
 * @param {string}        params.code
 * @param {string}        fileName               - Suggested download filename
 * @returns {Promise<void>}
 */
export const generateConstructiveProformaPdf = async (params, fileName = 'proforma.pdf') => {
  try {
    if (!params.id) throw new Error('Proforma ID is required');
    if (!params.scope_of_work?.trim()) throw new Error('Scope of work is required');

    serviceLogger.log(`[Proforma Service] Generating Constructive India PDF for proforma ${params.id}`);

    // Helper: send null for any blank/missing optional field so the backend
    // knows to omit that field from the rendered PDF entirely.
    const orNull = (v) => (v && String(v).trim() ? String(v).trim() : null);

    const payload = {
      id:              parseInt(params.id),
      company_name:    params.company_name    || '',   // required — always a string
      address:         params.address         || '',   // required — always a string
      scope_of_work:   params.scope_of_work.trim(),    // required — always a string
      gst_no:          orNull(params.gst_no),
      sac_code:        orNull(params.sac_code),
      invoice_date:    orNull(params.invoice_date),
      work_order_date: orNull(params.work_order_date),
      valid_from:      orNull(params.valid_from),
      valid_till:      orNull(params.valid_till),
      vendor_code:     orNull(params.vendor_code),
      po_no:           orNull(params.po_no),
      schedule_date:   orNull(params.schedule_date),
      state:           orNull(params.state),
      code:            orNull(params.code),
    };

    const response = await api.post(ENDPOINTS.GENERATE_PDF_CONSTRUCTIVE, payload, {
      responseType: 'blob',
    });

    _triggerPdfDownload(response.data, fileName);
    serviceLogger.log(`[Proforma Service] Constructive India PDF downloaded: ${fileName}`);

  } catch (error) {
    serviceLogger.error(`[Proforma Service] generateConstructiveProformaPdf(${params.id}) failed:`, error.message);
    if (error.message) throw new Error(error.message);
    throw new Error('Failed to generate PDF. Please try again.');
  }
};

/**
 * Generate and download PDF for other companies (company ID = 2, 3, or 4).
 * POST /api/proformas/generate_other_proforma_pdf/
 *
 * @param {Object} params
 * @param {number|string} params.id           - Proforma ID
 * @param {string}        params.company_name
 * @param {string}        params.address
 * @param {string}        params.gst_no
 * @param {string}        params.scope_of_work
 * @param {string}        params.po_no
 * @param {string}        params.schedule_date - "YYYY-MM-DD"
 * @param {string}        params.sac_code
 * @param {string}        params.state
 * @param {string}        params.code
 * @param {string}        fileName             - Suggested download filename
 * @returns {Promise<void>}
 */
export const generateOtherProformaPdf = async (params, fileName = 'proforma.pdf') => {
  try {
    if (!params.id) throw new Error('Proforma ID is required');
    if (!params.scope_of_work?.trim()) throw new Error('Scope of work is required');

    serviceLogger.log(`[Proforma Service] Generating Other Company PDF for proforma ${params.id}`);

    // Helper: send null for any blank/missing optional field so the backend
    // knows to omit that field from the rendered PDF entirely.
    const orNull = (v) => (v && String(v).trim() ? String(v).trim() : null);

    const payload = {
      id:            parseInt(params.id),
      company_name:  params.company_name  || '',   // required — always a string
      address:       params.address       || '',   // required — always a string
      scope_of_work: params.scope_of_work.trim(),  // required — always a string
      gst_no:        orNull(params.gst_no),
      po_no:         orNull(params.po_no),
      schedule_date: orNull(params.schedule_date),
      sac_code:      orNull(params.sac_code),
      state:         orNull(params.state),
      code:          orNull(params.code),
    };

    const response = await api.post(ENDPOINTS.GENERATE_PDF_OTHER, payload, {
      responseType: 'blob',
    });

    _triggerPdfDownload(response.data, fileName);
    serviceLogger.log(`[Proforma Service] Other Company PDF downloaded: ${fileName}`);

  } catch (error) {
    serviceLogger.error(`[Proforma Service] generateOtherProformaPdf(${params.id}) failed:`, error.message);
    if (error.message) throw new Error(error.message);
    throw new Error('Failed to generate PDF. Please try again.');
  }
};

export const getProformaStats = async (params = {}) => {
  try {
    const response = await getProformas({ page: 1, page_size: 1, ...params });
    if (response.status === 'success' && response.data) {
      const totalCount = response.data.total_count || response.data.count || 0;
      return { status: 'success', data: calculateStatsFromTotal(totalCount) };
    }
    return {
      status: 'success',
      data: { total: 0, draft: 0, under_review: 0, verified: 0 },
    };
  } catch {
    return {
      status: 'success',
      data: { total: 0, draft: 0, under_review: 0, verified: 0 },
    };
  }
};


// ============================================================================
// APPROVAL WORKFLOW FUNCTIONS
// ============================================================================

/**
 * Send proforma for approval.
 * POST /proformas/send_for_approval/
 * @param {number} id - Proforma ID
 * @returns {Promise<object>} API response data
 */
export const sendProformaForApproval = async (id) => {
  try {
    if (!id) throw new Error('Proforma ID is required');
    serviceLogger.log(`[Proforma Service] Sending proforma ${id} for approval`);
    const response = await api.post(ENDPOINTS.SEND_FOR_APPROVAL, { id: parseInt(id) });
    serviceLogger.log(`[Proforma Service] Proforma ${id} sent for approval`);
    return response.data;
  } catch (error) {
    if (error.response?.data) {
      serviceLogger.error('[Proforma Service] sendProformaForApproval backend error:', JSON.stringify(error.response.data, null, 2));
    }
    const errorMessage = normalizeError(error);
    serviceLogger.error(`[Proforma Service] sendProformaForApproval(${id}) failed:`, errorMessage);
    throw error;
  }
};

/**
 * Approve a proforma.
 * POST /proformas/approve_proforma/
 * @param {number} id - Proforma ID
 * @returns {Promise<object>} API response data (returns full updated proforma)
 */
export const approveProforma = async (id) => {
  try {
    if (!id) throw new Error('Proforma ID is required');
    serviceLogger.log(`[Proforma Service] Approving proforma ${id}`);
    const response = await api.post(ENDPOINTS.APPROVE, { id: parseInt(id) });
    serviceLogger.log(`[Proforma Service] Proforma ${id} approved successfully`);
    return response.data;
  } catch (error) {
    if (error.response?.data) {
      serviceLogger.error('[Proforma Service] approveProforma backend error:', JSON.stringify(error.response.data, null, 2));
    }
    const errorMessage = normalizeError(error);
    serviceLogger.error(`[Proforma Service] approveProforma(${id}) failed:`, errorMessage);
    throw error;
  }
};

/**
 * Reject a proforma with a reason.
 * POST /proformas/reject_proforma/
 * @param {number} id     - Proforma ID
 * @param {string} reason - Rejection reason (required by backend)
 * @returns {Promise<object>} API response data (returns full updated proforma)
 */
export const rejectProforma = async (id, reason) => {
  try {
    if (!id)     throw new Error('Proforma ID is required');
    if (!reason?.trim()) throw new Error('Rejection reason is required');
    serviceLogger.log(`[Proforma Service] Rejecting proforma ${id} — reason: ${reason}`);
    const response = await api.post(ENDPOINTS.REJECT, {
      id:     parseInt(id),
      reason: reason.trim(),
    });
    serviceLogger.log(`[Proforma Service] Proforma ${id} rejected successfully`);
    return response.data;
  } catch (error) {
    if (error.response?.data) {
      serviceLogger.error('[Proforma Service] rejectProforma backend error:', JSON.stringify(error.response.data, null, 2));
    }
    const errorMessage = normalizeError(error);
    serviceLogger.error(`[Proforma Service] rejectProforma(${id}) failed:`, errorMessage);
    throw error;
  }
};

export default {
  getProformas,
  getProformaById,
  createProforma,
  createRegulatoryProforma,
  createExecutionProforma,
  updateProforma,
  updateProformaFull,
  updateRegulatoryProforma,
  updateExecutionProforma,
  deleteProforma,
  deleteProformaById,
  getProformaStats,
  getComplianceByCategory,
  generateConstructiveProformaPdf,
  generateOtherProformaPdf,
  sendProformaForApproval,
  approveProforma,
  rejectProforma,
};