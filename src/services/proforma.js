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
  GET_ALL:          '/proformas/get_all_proformas/',
  GET_BY_ID:        '/proformas/get_proforma/',
  CREATE:           '/proformas/create_proforma/',
  UPDATE:           '/proformas/',
  UPDATE_FULL:      '/proformas/update_proforma/',
  DELETE:           '/proformas/',
  SEND_FOR_APPROVAL:'/proformas/send_for_approval/',
  APPROVE:          '/proformas/approve_proforma/',
  REJECT:           '/proformas/reject_proforma/',
};

const generateProformaNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return Number(`${year}${month}${day}${random}`);
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

export const getProformaById = async (id) => {
  try {
    if (!id) throw new Error('Proforma ID is required');
    serviceLogger.log(`[Proforma Service] Fetching proforma ID: ${id}`);
    const response = await api.get(ENDPOINTS.GET_BY_ID, { params: { id } });
    return response.data;
  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error(`[Proforma Service] getProformaById(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

export const createProforma = async (proformaData) => {
  try {
    serviceLogger.log('[Proforma Service] Creating proforma:', proformaData);

    if (!proformaData.quotation) throw new Error('Quotation is required');

    // Backend only requires quotation — all other fields are derived server-side
    const payload = {
      quotation: Number(proformaData.quotation),
    };

    const response = await api.post(ENDPOINTS.CREATE, payload);
    return response.data;
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

/**
 * Full update proforma via PUT /proformas/update_proforma/
 * Sends the complete payload including all items — mirrors updateQuotationFull in quotation.js
 *
 * @param {object} proformaData - Full proforma payload (must include id)
 * @returns {Promise<object>} API response data
 */
export const updateProformaFull = async (proformaData) => {
  try {
    if (!proformaData.id) throw new Error('Proforma ID is required for update');

    serviceLogger.log(`[Proforma Service] Full update proforma ${proformaData.id}`);

    // Build ISO date strings — backend requires these fields
    const now = new Date().toISOString();
    const issueDate  = proformaData.issue_date  || now;
    const validUntil = proformaData.valid_until  || now;

    const payload = {
      id:               parseInt(proformaData.id),
      client:           parseInt(proformaData.client),
      project:          parseInt(proformaData.project),
      issue_date:       issueDate,
      valid_until:      validUntil,
      sac_code:         String(proformaData.sac_code || '').slice(0, 6),
      gst_rate:         String((parseFloat(proformaData.gst_rate) || 0).toFixed(2)),
      discount_rate:    String((parseFloat(proformaData.discount_rate) || 0).toFixed(2)),
      total_amount:     String(parseFloat((parseFloat(proformaData.total_amount) || 0).toFixed(2))),
      total_gst_amount: String(parseFloat((parseFloat(proformaData.total_gst_amount) || 0).toFixed(2))),
      grand_total:      String(parseFloat((parseFloat(proformaData.grand_total) || 0).toFixed(2))),
      reason:           String(proformaData.reason || '').trim(),
      status:           parseInt(proformaData.status) || 1,
      items: (proformaData.items || []).map(item => {
        const rawId  = item.id != null ? parseInt(item.id) : null;
        const itemId = rawId && rawId > 0 ? rawId : null;
        return {
          id:                      itemId,
          description:             String(item.description).trim(),
          quantity:                parseInt(item.quantity) || 1,
          Professional_amount:     String(parseFloat((parseFloat(item.Professional_amount) || 0).toFixed(2))),
          miscellaneous_amount:    String(item.miscellaneous_amount ?? '').trim() || '--',
          total_amount:            String(parseFloat((parseFloat(item.total_amount) || 0).toFixed(2))),
          compliance_category:     parseInt(item.compliance_category || 0),
          sub_compliance_category: parseInt(item.sub_compliance_category || 0),
        };
      }),
    };

    serviceLogger.log('[Proforma Service] updateProformaFull payload:', JSON.stringify(payload, null, 2));

    const response = await api.put(ENDPOINTS.UPDATE_FULL, payload);

    serviceLogger.log(`[Proforma Service] Proforma ${proformaData.id} updated successfully`);
    return response.data;

  } catch (error) {
    // Log the full backend error response so we can debug field validation issues
    if (error.response?.data) {
      serviceLogger.error('[Proforma Service] updateProformaFull backend error:', JSON.stringify(error.response.data, null, 2));
    }
    const errorMessage = normalizeError(error);
    serviceLogger.error(`[Proforma Service] updateProformaFull(${proformaData.id}) failed:`, errorMessage);
    throw error; // re-throw original so caller can read error.response.data
  }
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

export const getProformaStats = async () => {
  try {
    const response = await getProformas({ page: 1, page_size: 1 });
    if (response.status === 'success' && response.data) {
      const totalCount = response.data.total_count || response.data.count || 0;
      return { status: 'success', data: calculateStatsFromTotal(totalCount) };
    }
    return {
      status: 'success',
      data: { total: 0, draft: 0, under_review: 0, verified: 0 },
    };
  } catch (error) {
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
  updateProforma,
  updateProformaFull,
  deleteProforma,
  getProformaStats,
  getComplianceByCategory,
  sendProformaForApproval,
  approveProforma,
  rejectProforma,
};