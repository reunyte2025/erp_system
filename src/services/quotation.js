import api, { normalizeError } from './api';

/**
 * ============================================================================
 * QUOTATIONS SERVICE - WITH COMPLIANCE SUPPORT
 * ============================================================================
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const ENABLE_SERVICE_LOGGING = import.meta.env.MODE === 'development';

const serviceLogger = {
  log: (...args) => {
    if (ENABLE_SERVICE_LOGGING) {
      console.log('[Quotations Service]', ...args);
    }
  },
  warn:  (...args) => console.warn('[Quotations Service]', ...args),
  error: (...args) => console.error('[Quotations Service]', ...args),
};

// ============================================================================
// API ENDPOINTS  (only what exists in swagger image)
// ============================================================================

const ENDPOINTS = {
  GET_ALL:           '/quotations/get_all_quotations/',
  GET_REGULATORY:    '/quotations/get_regulatory_quotation/',
  GET_EXECUTION:     '/quotations/get_execuation_quotation/',
  CREATE:            '/quotations/create_quotation/',            // Regulatory
  CREATE_EXECUTION:  '/quotations/create_execution_quotation/', // Execution
  UPDATE_REGULATORY: '/quotations/update_quotation/',           // PUT – Regulatory
  UPDATE_EXECUTION:  '/quotations/update_execution_quotation/', // PUT – Execution
  DELETE_BY_ID:      '/quotations/delete_quotation/',
  GENERATE_PDF:      '/quotations/generate_pdf/',
  GET_ALL_PROJECTS:  '/projects/get_all_Project/',
  GET_USER:          '/users/get_user/',
};

// ============================================================================
// COMPANY HELPERS
// ============================================================================

export const QUOTATION_COMPANIES = [
  { id: 1, name: 'Constructive India' },
  { id: 2, name: 'PVA Arch' },
  { id: 3, name: 'Atharv India' },
  { id: 4, name: 'VD Associates' },
];

export const getQuotationCompanyName = (companyValue) => {
  if (companyValue === null || companyValue === undefined || companyValue === '') return '';
  const normalizedValue = String(companyValue).trim().toLowerCase();
  const matchedCompany = QUOTATION_COMPANIES.find(
    (company) =>
      String(company.id) === normalizedValue ||
      company.name.toLowerCase() === normalizedValue
  );
  return matchedCompany?.name || '';
};

// ============================================================================
// UTILITY
// ============================================================================

const validateQuotationData = (quotationData) => {
  const errors = [];
  if (!quotationData.client && !quotationData.vendor) errors.push('Client or Vendor is required');
  if (!quotationData.project) errors.push('Project is required');
  if (!quotationData.items || !Array.isArray(quotationData.items) || quotationData.items.length === 0)
    errors.push('At least one item is required');
  if (quotationData.items && Array.isArray(quotationData.items)) {
    quotationData.items.forEach((item, index) => {
      if (!item.description || !item.description.trim())
        errors.push(`Item ${index + 1}: Description is required`);
      if (!item.quantity || item.quantity <= 0)
        errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
      if ((!item.Professional_amount && !item.rate) ||
          ((item.Professional_amount || 0) <= 0 && (item.rate || 0) <= 0))
        errors.push(`Item ${index + 1}: Professional amount must be greater than 0`);
    });
  }
  return errors;
};

// ============================================================================
// READ
// ============================================================================

/**
 * Fetch all quotations with pagination and filters.
 */
export const getQuotations = async (params = {}) => {
  try {
    const queryParams = { page: 1, page_size: 10, ...params };
    serviceLogger.log('Fetching quotations with params:', queryParams);
    const response = await api.get(ENDPOINTS.GET_ALL, { params: queryParams });
    serviceLogger.log('Quotations fetched successfully:', {
      count: response.data?.data?.results?.length || 0,
      total: response.data?.data?.total_count || 0,
      page:  response.data?.data?.page || 1,
    });
    return response.data;
  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('getQuotations failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Fetch a single quotation by ID.
 *
 * Strategy:
 *  1. Try GET_REGULATORY first — this endpoint returns quotation_type for ALL quotations.
 *  2. If quotation_type contains "execution", call GET_EXECUTION to get the FULL data
 *     (material_rate, labour_rate, material_amount, labour_amount only come from this endpoint).
 *  3. If regulatory endpoint returns 404, fall back to trying GET_EXECUTION directly.
 *
 * ⚠️  IMPORTANT: Never skip step 2 for execution quotations — loading them from
 *     GET_REGULATORY will return zeros for all mat/lab rate/amount fields.
 */
export const getQuotationById = async (id) => {
  if (!id) throw new Error('Quotation ID is required');

  serviceLogger.log(`Fetching quotation with ID: ${id}`);

  const tryEndpoint = async (endpoint) => {
    try {
      const res = await api.get(endpoint, { params: { id } });
      serviceLogger.log(`Quotation data received from ${endpoint}`);
      return res.data;
    } catch (err) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  };

  try {
    // ── Step 1: Use regulatory endpoint to detect quotation_type ──────────
    const regulatoryResult = await tryEndpoint(ENDPOINTS.GET_REGULATORY);

    if (regulatoryResult?.data) {
      const qTypeRaw = regulatoryResult.data.quotation_type || '';
      const qType    = qTypeRaw.toLowerCase().trim();
      serviceLogger.log(`quotation_type detected: "${qTypeRaw}"`);

      // ── Step 2: Execution quotation — MUST call dedicated endpoint ────────
      // GET_REGULATORY does NOT return material_rate / labour_rate / etc.
      // These fields only come from GET_EXECUTION.
      if (qType.includes('execution')) {
        serviceLogger.log('Execution type detected — fetching full data from execution endpoint…');
        const executionResult = await tryEndpoint(ENDPOINTS.GET_EXECUTION);
        if (executionResult?.data) return executionResult;
        serviceLogger.warn('Execution endpoint failed, falling back to regulatory data (mat/lab fields will be missing)');
      }

      // Regulatory quotation — data from step 1 is complete
      return regulatoryResult;
    }

    // ── Step 3: Regulatory 404 — try execution endpoint directly ─────────
    serviceLogger.log(`Regulatory 404 for ID ${id}, trying execution endpoint…`);
    const executionResult = await tryEndpoint(ENDPOINTS.GET_EXECUTION);
    if (executionResult?.data) return executionResult;

    throw new Error('Server error: 404');

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error(`getQuotationById(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Fetch a Regulatory Compliance quotation by ID directly.
 */
export const getRegulatorQuotationById = async (id) => {
  if (!id) throw new Error('Quotation ID is required');
  try {
    const response = await api.get(ENDPOINTS.GET_REGULATORY, { params: { id } });
    return response.data;
  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error(`getRegulatorQuotationById(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Fetch an Execution Compliance quotation by ID directly.
 * This is the ONLY endpoint that returns material_rate / labour_rate / material_amount / labour_amount.
 */
export const getExecutionQuotationById = async (id) => {
  if (!id) throw new Error('Quotation ID is required');
  try {
    const response = await api.get(ENDPOINTS.GET_EXECUTION, { params: { id } });
    return response.data;
  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error(`getExecutionQuotationById(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// CREATE
// ============================================================================

const isExecutionQuotation = (items = []) =>
  items.some(item => [5, 6, 7].includes(parseInt(item.compliance_category || 0)));

const buildExecutionItemsPayload = (items = []) =>
  items.map(item => {
    const qty      = parseInt(item.quantity) || 1;
    const profRate = parseFloat(item.Professional_amount) || 0;
    const matRate  = parseFloat(item.material_rate)   || 0;
    const labRate  = parseFloat(item.labour_rate)     || 0;
    const matAmt   = parseFloat(item.material_amount) || 0;
    const labAmt   = parseFloat(item.labour_amount)   || 0;
    const total    = (matAmt || labAmt)
      ? parseFloat((matAmt + labAmt).toFixed(2))
      : parseFloat((profRate * qty).toFixed(2));
    return {
      description:             String(item.description || '').trim().slice(0, 255),
      quantity:                qty,
      unit:                    String(item.unit || '').trim() || 'N/A',
      sac_code:                String(item.sac_code || '').trim(),
      Professional_amount:     profRate.toFixed(2),
      material_rate:           matRate.toFixed(2),
      material_amount:         matAmt.toFixed(2),
      labour_rate:             labRate.toFixed(2),
      labour_amount:           labAmt.toFixed(2),
      total_amount:            total.toFixed(2),
      compliance_category:     parseInt(item.compliance_category) || null,
      sub_compliance_category: parseInt(item.sub_compliance_category || 0),
    };
  });

const _surfaceErrors = (error, label) => {
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
  throw new Error(normalizeError(error));
};

const _createQuotationInternal = async (quotationData, endpoint) => {
  const isExecution = endpoint === ENDPOINTS.CREATE_EXECUTION;

  const basePayload = {
    client:           quotationData.vendor ? null : parseInt(quotationData.client),
    vendor:           quotationData.vendor ? parseInt(quotationData.vendor) : null,
    project:          parseInt(quotationData.project),
    company:          parseInt(quotationData.company) || 1,
    gst_rate:         String((parseFloat(quotationData.gst_rate)         || 0).toFixed(2)),
    discount_rate:    String((parseFloat(quotationData.discount_rate)    || 0).toFixed(2)),
    sac_code:         String(quotationData.sac_code || '').slice(0, 6),
    total_amount:     String((parseFloat(quotationData.total_amount)     || 0).toFixed(2)),
    total_gst_amount: String((parseFloat(quotationData.total_gst_amount) || 0).toFixed(2)),
    grand_total:      String((parseFloat(quotationData.grand_total)      || 0).toFixed(2)),
  };

  if (isExecution) {
    basePayload.items = buildExecutionItemsPayload(quotationData.items);
  } else {
    // Regulatory items — backend field is consultancy_charges
    basePayload.items = quotationData.items.map(item => ({
      description:             String(item.description).trim(),
      quantity:                parseInt(item.quantity),
      unit:                    String(item.unit || '').trim() || 'N/A',
      sac_code:                String(item.sac_code || '').trim(),
      consultancy_charges:     String(item.consultancy_charges ?? item.miscellaneous_amount ?? '').trim()
                               || String((parseFloat(String(item.miscellaneous_amount ?? '').trim()) || 0).toFixed(2)),
      Professional_amount:     String((parseFloat(item.Professional_amount) || 0).toFixed(2)),
      total_amount:            String((parseFloat(item.total_amount)         || 0).toFixed(2)),
      compliance_category:     parseInt(item.compliance_category)  || null,
      sub_compliance_category: parseInt(item.sub_compliance_category || 0),
    }));
  }

  try {
    serviceLogger.log(`Creating ${isExecution ? 'Execution' : 'Regulatory'} quotation → ${endpoint}`);
    const response = await api.post(endpoint, basePayload);
    serviceLogger.log('Quotation created successfully:', { id: response.data?.data?.id });
    return response.data;
  } catch (error) {
    _surfaceErrors(error, `_createQuotationInternal(${endpoint})`);
  }
};

export const createRegulatoryQuotation = (quotationData) =>
  _createQuotationInternal(quotationData, ENDPOINTS.CREATE);

export const createExecutionQuotation = (quotationData) =>
  _createQuotationInternal(quotationData, ENDPOINTS.CREATE_EXECUTION);

export const createQuotation = async (quotationData) => {
  try {
    serviceLogger.log('Creating quotation...');
    const validationErrors = validateQuotationData(quotationData);
    if (validationErrors.length > 0) throw new Error(validationErrors.join('; '));
    const useExecution = isExecutionQuotation(quotationData.items || []);
    const endpoint = useExecution ? ENDPOINTS.CREATE_EXECUTION : ENDPOINTS.CREATE;
    serviceLogger.log(`Routing to ${useExecution ? 'Execution' : 'Regulatory'} endpoint`);
    const result = await _createQuotationInternal(quotationData, endpoint);
    serviceLogger.log('Quotation created successfully:', { id: result?.data?.id });
    return result;
  } catch (error) {
    serviceLogger.error('createQuotation failed');
    if (error.response?.status === 500) {
      const d = error.response?.data;
      throw new Error('Server Error: ' + (d?.errors ? JSON.stringify(d.errors) : d?.message || 'Unexpected error'));
    }
    if (error.response?.status === 400) {
      const d = error.response?.data;
      const parts = [];
      if (d?.message) parts.push(d.message);
      if (d?.detail)  parts.push(d.detail);
      if (d?.errors && typeof d.errors === 'object') {
        Object.entries(d.errors).forEach(([k, v]) =>
          parts.push(`${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
        );
      }
      throw new Error(`Validation Error: ${parts.length > 0 ? parts.join(' | ') : 'Validation failed'}`);
    }
    throw new Error(normalizeError(error));
  }
};

// ============================================================================
// UPDATE
// ============================================================================

/**
 * Update a Regulatory Compliance quotation.
 * PUT /quotations/update_quotation/
 *
 * Swagger payload: id, client, project, company, sac_code, gst_rate,
 * discount_rate, total_amount, total_gst_amount, grand_total, status,
 * items[]: { id, description, quantity, unit, consultancy_charges,
 *            Professional_amount, total_amount,
 *            compliance_category, sub_compliance_category }
 */
export const updateRegulatoryQuotation = async (quotationData) => {
  if (!quotationData.id) throw new Error('Quotation ID is required for update');
  serviceLogger.log(`Updating regulatory quotation ${quotationData.id}…`);

  const payload = {
    id:               parseInt(quotationData.id),
    client:           quotationData.client ? parseInt(quotationData.client) : null,
    project:          parseInt(quotationData.project),
    company:          parseInt(quotationData.company) || 1,
    sac_code:         String(quotationData.sac_code || '').slice(0, 6),
    gst_rate:         String((parseFloat(quotationData.gst_rate)         || 0).toFixed(2)),
    discount_rate:    String((parseFloat(quotationData.discount_rate)    || 0).toFixed(2)),
    total_amount:     String((parseFloat(quotationData.total_amount)     || 0).toFixed(2)),
    total_gst_amount: String((parseFloat(quotationData.total_gst_amount) || 0).toFixed(2)),
    grand_total:      String((parseFloat(quotationData.grand_total)      || 0).toFixed(2)),
    status:           parseInt(quotationData.status) || 1,
    items: (quotationData.items || []).map(item => {
      const rawId  = item.id != null ? parseInt(item.id) : null;
      const itemId = rawId && rawId > 0 ? rawId : null;
      const consultancy = (() => {
        const raw = item.consultancy_charges ?? item.miscellaneous_amount ?? '';
        const num = parseFloat(String(raw).trim());
        return isNaN(num) ? '0.00' : num.toFixed(2);
      })();
      return {
        id:                      itemId,
        description:             String(item.description || '').trim(),
        quantity:                parseInt(item.quantity) || 1,
        unit:                    String(item.unit || '').trim() || 'N/A',
        consultancy_charges:     consultancy,
        Professional_amount:     String((parseFloat(item.Professional_amount) || 0).toFixed(2)),
        total_amount:            String((parseFloat(item.total_amount)         || 0).toFixed(2)),
        compliance_category:     parseInt(item.compliance_category)  || 1,
        sub_compliance_category: parseInt(item.sub_compliance_category || 0),
      };
    }),
  };

  try {
    const response = await api.put(ENDPOINTS.UPDATE_REGULATORY, payload);
    serviceLogger.log(`Regulatory quotation ${quotationData.id} updated`);
    return response.data;
  } catch (error) {
    _surfaceErrors(error, `updateRegulatoryQuotation(${quotationData.id})`);
  }
};

/**
 * Update an Execution Compliance quotation.
 * PUT /quotations/update_execution_quotation/
 *
 * Swagger payload: id, client, vendor, project, company, sac_code, gst_rate,
 * discount_rate, total_amount, total_gst_amount, grand_total, status,
 * items[]: { id, description, quantity, unit, sac_code, consultancy_charges,
 *            Professional_amount, material_rate, material_amount,
 *            labour_rate, labour_amount, total_amount,
 *            compliance_category, sub_compliance_category }
 */
export const updateExecutionQuotation = async (quotationData) => {
  if (!quotationData.id) throw new Error('Quotation ID is required for update');
  serviceLogger.log(`Updating execution quotation ${quotationData.id}…`);

  const payload = {
    id:               parseInt(quotationData.id),
    client:           quotationData.client ? parseInt(quotationData.client) : null,
    vendor:           quotationData.vendor ? parseInt(quotationData.vendor) : null,
    project:          parseInt(quotationData.project),
    company:          parseInt(quotationData.company) || 1,
    sac_code:         String(quotationData.sac_code || '').slice(0, 6),
    gst_rate:         String((parseFloat(quotationData.gst_rate)         || 0).toFixed(2)),
    discount_rate:    String((parseFloat(quotationData.discount_rate)    || 0).toFixed(2)),
    total_amount:     String((parseFloat(quotationData.total_amount)     || 0).toFixed(2)),
    total_gst_amount: String((parseFloat(quotationData.total_gst_amount) || 0).toFixed(2)),
    grand_total:      String((parseFloat(quotationData.grand_total)      || 0).toFixed(2)),
    status:           parseInt(quotationData.status) || 1,
    items: (quotationData.items || []).map(item => {
      const rawId  = item.id != null ? parseInt(item.id) : null;
      const itemId = rawId && rawId > 0 ? rawId : null;
      const qty     = parseInt(item.quantity) || 1;
      const prof    = parseFloat(item.Professional_amount) || 0;
      const matRate = parseFloat(item.material_rate)   || 0;
      const labRate = parseFloat(item.labour_rate)     || 0;
      const matAmt  = (parseFloat(item.material_amount) || 0) || (matRate > 0 ? matRate * qty : 0);
      const labAmt  = (parseFloat(item.labour_amount)   || 0) || (labRate > 0 ? labRate * qty : 0);
      const total   = (matAmt + labAmt) > 0
        ? parseFloat((matAmt + labAmt).toFixed(2))
        : parseFloat((prof * qty).toFixed(2));
      const consultancy = (() => {
        const raw = item.consultancy_charges ?? item.miscellaneous_amount ?? '';
        const num = parseFloat(String(raw).trim());
        return isNaN(num) ? '0.00' : num.toFixed(2);
      })();
      return {
        id:                      itemId,
        description:             String(item.description || '').trim(),
        quantity:                qty,
        unit:                    String(item.unit || '').trim() || 'N/A',
        sac_code:                String(item.sac_code || item.item_sac_code || '').trim(),
        consultancy_charges:     consultancy,
        Professional_amount:     String(prof.toFixed(2)),
        material_rate:           String(matRate.toFixed(2)),
        material_amount:         String(matAmt.toFixed(2)),
        labour_rate:             String(labRate.toFixed(2)),
        labour_amount:           String(labAmt.toFixed(2)),
        total_amount:            String(total.toFixed(2)),
        compliance_category:     parseInt(item.compliance_category) || 5,
        sub_compliance_category: parseInt(item.sub_compliance_category || 0),
      };
    }),
  };

  try {
    const response = await api.put(ENDPOINTS.UPDATE_EXECUTION, payload);
    serviceLogger.log(`Execution quotation ${quotationData.id} updated`);
    return response.data;
  } catch (error) {
    _surfaceErrors(error, `updateExecutionQuotation(${quotationData.id})`);
  }
};

/**
 * Smart update — reads quotation_type and routes to the correct endpoint.
 * Used by viewquotationdetails.jsx handleSaveUpdate.
 */
export const updateQuotationFull = async (quotationData) => {
  if (!quotationData.id) throw new Error('Quotation ID is required for update');
  const qType  = String(quotationData.quotation_type || '').toLowerCase().trim();
  const isExec = qType.includes('execution');
  serviceLogger.log(
    `updateQuotationFull(${quotationData.id}) → routing to ${isExec ? 'execution' : 'regulatory'} endpoint`
  );
  return isExec
    ? updateExecutionQuotation(quotationData)
    : updateRegulatoryQuotation(quotationData);
};

// ============================================================================
// DELETE
// ============================================================================

/**
 * Delete a quotation by ID.
 * DELETE /quotations/delete_quotation/?id=<id>
 */
export const deleteQuotationById = async (id) => {
  if (!id) throw new Error('Quotation ID is required');
  try {
    serviceLogger.log(`Deleting quotation ${id}…`);
    const response = await api.delete(ENDPOINTS.DELETE_BY_ID, { params: { id } });
    serviceLogger.log(`Quotation ${id} deleted`);
    return { status: 'success', data: response.data };
  } catch (error) {
    const msg = normalizeError(error);
    serviceLogger.error(`deleteQuotationById(${id}) failed:`, msg);
    throw new Error(msg);
  }
};

// Alias for backwards compatibility
export const deleteQuotation = deleteQuotationById;

// ============================================================================
// PDF
// ============================================================================

export const generateQuotationPdf = async (id, { company_name = '', address = '', contact_person = '', subject = '', extra_notes = [] } = {}, fileName = null) => {
  if (!id) throw new Error('Quotation ID is required');
  try {
    serviceLogger.log(`Generating PDF for quotation ${id}…`);
    const response = await api.post(
      ENDPOINTS.GENERATE_PDF,
      { id: parseInt(id), company_name, address, contact_person, subject, extra_notes },
      { responseType: 'blob' }
    );
    const url  = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName || `Quotation_${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    serviceLogger.log(`PDF downloaded: ${fileName || `Quotation_${id}.pdf`}`);
  } catch (error) {
    const msg = normalizeError(error);
    serviceLogger.error(`generateQuotationPdf(${id}) failed:`, msg);
    throw new Error(msg);
  }
};

// ============================================================================
// COMPLIANCE
// ============================================================================

export const getComplianceByCategory = async () => {
  try {
    serviceLogger.log('Fetching compliance categories...');
    const response = await api.get('/compliance/get_all_compliance/');
    serviceLogger.log('Compliance categories fetched');
    return response.data;
  } catch (error) {
    const msg = normalizeError(error);
    serviceLogger.error('getComplianceByCategory failed:', msg);
    throw new Error(msg);
  }
};

export const getSubComplianceCategories = async (categoryId) => {
  if (!categoryId) throw new Error('Category ID is required');
  try {
    serviceLogger.log(`Fetching sub-compliance categories for category ${categoryId}`);
    const response = await api.get('/compliance/get_compliance_by_category/', {
      params: { category: categoryId, page_size: 100 },
    });
    serviceLogger.log('Sub-compliance categories fetched');
    return response.data;
  } catch (error) {
    const msg = normalizeError(error);
    serviceLogger.error('getSubComplianceCategories failed:', msg);
    throw new Error(msg);
  }
};

export const getAllCompliance = async () => {
  try {
    serviceLogger.log('Fetching all compliance data...');
    const response = await api.get('/compliance/get_all_compliance/');
    serviceLogger.log('All compliance data fetched');
    return response.data;
  } catch (error) {
    const msg = normalizeError(error);
    serviceLogger.error('getAllCompliance failed:', msg);
    throw new Error(msg);
  }
};

export const getComplianceDescriptions = async (categoryId, subCategoryId = null) => {
  try {
    if (!categoryId) throw new Error('Category ID is required');
    serviceLogger.log(`Fetching compliance descriptions for category ${categoryId}`);
    const params = { category: categoryId, page_size: 100 };
    if (subCategoryId) params.sub_category = subCategoryId;
    const response = await api.get('/compliance/get_compliance_by_category/', { params });
    if (response?.data?.status === 'success' && response?.data?.data?.results) {
      return response.data.data.results;
    }
    return [];
  } catch (error) {
    const msg = normalizeError(error);
    serviceLogger.error('getComplianceDescriptions failed:', msg);
    throw new Error(msg);
  }
};

// ============================================================================
// PROJECTS LOOKUP
// ============================================================================

export const getAllProjects = async (params = {}) => {
  try {
    const queryParams = { page: 1, page_size: 500, ...params };
    serviceLogger.log('Fetching all projects with params:', queryParams);
    const response = await api.get(ENDPOINTS.GET_ALL_PROJECTS, { params: queryParams });
    serviceLogger.log('Projects fetched successfully:', {
      count: response.data?.data?.results?.length || 0,
    });
    return response.data;
  } catch (error) {
    const msg = normalizeError(error);
    serviceLogger.error('getAllProjects failed:', msg);
    throw new Error(msg);
  }
};

// ============================================================================
// USER LOOKUP
// ============================================================================

/**
 * Fetch a user by ID.
 * Endpoint: GET /users/get_user/?id=<id>
 * Returns null silently on error — non-critical display field.
 */
export const getUserById = async (id) => {
  if (!id) return null;
  try {
    serviceLogger.log(`Fetching user with ID: ${id}`);
    const response = await api.get(ENDPOINTS.GET_USER, { params: { id } });
    if (response.data?.status === 'success' && response.data?.data) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    serviceLogger.error(`getUserById(${id}) failed:`, normalizeError(error));
    return null; // Non-critical — silently return null
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getQuotations,
  getQuotationById,
  getRegulatorQuotationById,
  getExecutionQuotationById,
  createQuotation,
  createRegulatoryQuotation,
  createExecutionQuotation,
  updateQuotationFull,
  updateRegulatoryQuotation,
  updateExecutionQuotation,
  deleteQuotation,
  deleteQuotationById,
  getComplianceByCategory,
  getComplianceDescriptions,
  getSubComplianceCategories,
  getAllCompliance,
  generateQuotationPdf,
  getUserById,
  getAllProjects,
};