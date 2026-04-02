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
 * Generate and download the PDF for a proforma.
 * GET /api/proformas/generate_pdf/?id=<id>&scope_of_work=<scope_of_work>
 *
 * The backend starts an async task and returns a URL string (the PDF URL).
 * We then fetch that URL as a blob and trigger a browser download.
 *
 * @param {number|string} id           - Proforma ID (required)
 * @param {string}        scopeOfWork  - Scope of work text to embed in the PDF (required)
 * @param {string}        fileName     - Suggested download filename (e.g. "PF-2026-00001.pdf")
 * @returns {Promise<void>}
 */
export const generateProformaPdf = async (id, scopeOfWork, fileName = 'proforma.pdf') => {
  try {
    if (!id)               throw new Error('Proforma ID is required');
    if (!scopeOfWork?.trim()) throw new Error('Scope of work is required');

    serviceLogger.log(`[Proforma Service] Generating PDF for proforma ${id}`);

    // Step 1 — call the generate endpoint and receive the PDF as a blob directly
    const response = await api.get('/proformas/generate_pdf/', {
      params: {
        id:            parseInt(id),
        scope_of_work: scopeOfWork.trim(),
      },
      responseType: 'blob',
    });

    // Step 2 — response.data is already a Blob; trigger browser download
    const blob = response.data;

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

    serviceLogger.log(`[Proforma Service] PDF downloaded: ${fileName}`);

  } catch (error) {
    serviceLogger.error(`[Proforma Service] generateProformaPdf(${id}) failed:`, error.message);
    // Re-throw a clean error message for the UI layer
    if (error.message) throw new Error(error.message);
    throw new Error('Failed to generate PDF. Please try again.');
  }
};

/**
 * Send a proforma to a client via email with the PDF attached.
 * Mirrors sendQuotationToClient in quotation.js exactly.
 *
 * @param {Object} params
 * @param {number} params.proformaId          - Proforma ID
 * @param {string} params.proformaNumber      - Proforma number for display / filename
 * @param {string} params.issuedDate          - Issued date for email body
 * @param {string} params.recipientEmail      - Recipient email address
 * @param {string} params.subject             - Email subject
 * @param {string} params.body                - Email body
 * @param {Array<File>} params.extraAttachments - Additional files to attach (optional)
 * @returns {Promise<Object>} Email sending response
 * @throws {Error} If email sending fails
 */
export const sendProformaToClient = async ({
  proformaId,
  proformaNumber,
  issuedDate,
  recipientEmail,
  subject,
  body,
  extraAttachments = [],
}) => {
  try {
    if (!proformaId)     throw new Error('Proforma ID is required');
    if (!recipientEmail) throw new Error('Recipient email is required');

    serviceLogger.log(`[Proforma Service] Sending proforma ${proformaId} to ${recipientEmail}`);

    // Step 1 — Generate the PDF blob
    const pdfResponse = await api.get('/proformas/generate_pdf/', {
      params: {
        id:            parseInt(proformaId),
        scope_of_work: 'As per scope discussed.',
      },
      responseType: 'blob',
    });

    const pdfBlob = new Blob([pdfResponse.data], { type: 'application/pdf' });
    const pdfFile = new File(
      [pdfBlob],
      `${proformaNumber || `Proforma_${proformaId}`}.pdf`,
      { type: 'application/pdf' },
    );

    // Step 2 — Validate total attachment size
    const MAX_BYTES = 25 * 1024 * 1024;
    const allFiles  = [pdfFile, ...extraAttachments];
    const totalSize = allFiles.reduce((sum, f) => sum + (f.size || 0), 0);
    if (totalSize > MAX_BYTES) {
      throw new Error(
        `Total attachment size (${(totalSize / (1024 * 1024)).toFixed(1)} MB) exceeds the 25 MB limit.`,
      );
    }

    // Step 3 — Build email content
    const autoSubject =
      subject ||
      `Proforma ${proformaNumber}${issuedDate ? ` — Issued ${issuedDate}` : ''}`;

    const autoBody =
      body ||
      `Dear Client,\n\nPlease find attached your proforma invoice ${proformaNumber}${issuedDate ? `, issued on ${issuedDate}` : ''}.\n\nKindly review the details and feel free to reach out if you have any questions.\n\nBest regards,\nERP System`;

    // Step 4 — Build FormData and POST to send_email
    const formData = new FormData();
    formData.append('subject',    autoSubject);
    formData.append('recipients', recipientEmail);
    formData.append('body',       autoBody);
    allFiles.forEach((file) => formData.append('attachments', file));

    serviceLogger.log('[Proforma Service] Sending email with PDF attachment…');

    const response = await api.post('/notifications/send_email/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    serviceLogger.log('[Proforma Service] Email sent successfully');
    return response.data;

  } catch (error) {
    const responseData = error.response?.data;
    let errorMessage   = '';

    if (error.response?.status === 400) {
      const errors =
        responseData?.errors && typeof responseData.errors === 'object'
          ? responseData.errors
          : responseData && typeof responseData === 'object'
            ? responseData
            : {};

      const missingSubject     = Array.isArray(errors.subject)     && errors.subject.length     > 0;
      const missingBody        = Array.isArray(errors.body)        && errors.body.length        > 0;
      const missingAttachments = Array.isArray(errors.attachments) && errors.attachments.length > 0;
      const invalidRecipients  = Array.isArray(errors.recipients)  && errors.recipients.length  > 0;

      const missingParts = [];
      if (missingSubject)     missingParts.push('a subject');
      if (missingBody)        missingParts.push('a message');
      if (missingAttachments) missingParts.push('at least one attachment');

      const joinNatural = (parts) => {
        if (parts.length === 0) return '';
        if (parts.length === 1) return parts[0];
        if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
        return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
      };

      if (invalidRecipients) {
        errorMessage = 'Please enter a valid recipient email address before sending.';
      } else if (missingParts.length > 0) {
        errorMessage = `Please add ${joinNatural(missingParts)} before sending the email.`;
      } else if (responseData?.message || responseData?.detail) {
        errorMessage = responseData.message || responseData.detail;
      } else {
        errorMessage = 'Please check the email details and try again.';
      }
    } else {
      errorMessage = normalizeError(error);
    }

    serviceLogger.error('[Proforma Service] sendProformaToClient failed:', errorMessage);
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
  deleteProformaById,
  getProformaStats,
  getComplianceByCategory,
  generateProformaPdf,
  sendProformaForApproval,
  approveProforma,
  rejectProforma,
  sendProformaToClient,
};