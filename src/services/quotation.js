import api, { normalizeError } from './api';

/**
 * ============================================================================
 * QUOTATIONS SERVICE - WITH COMPLIANCE SUPPORT
 * ============================================================================
 * 
 * Service for creating and managing quotations with compliance categories
 */

const ENABLE_SERVICE_LOGGING = true;

const serviceLogger = {
  log: (...args) => ENABLE_SERVICE_LOGGING && console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

// ============================================================================
// API ENDPOINTS
// ============================================================================

const ENDPOINTS = {
  GET_ALL: '/quotations/get_all_quotations/',
  GET_BY_ID: '/quotations/get_quotation/',
  CREATE: '/quotations/create_quotation/',
  UPDATE: '/quotations/',
  UPDATE_FULL: '/quotations/update_quotation/',
  DELETE: '/quotations/',
  SEARCH: '/quotations/search/',
  EXPORT: '/quotations/export/',
  GENERATE_PDF: '/quotations/generate_pdf/',
  SEND_EMAIL: '/notification/send_email/',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const generateQuotationNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  
  return Number(`${year}${month}${day}${random}`);
};

const calculateStatsFromTotal = (totalCount) => {
  return {
    total: totalCount,
    draft: Math.floor(totalCount * 0.30),
    review: Math.floor(totalCount * 0.25),
    completed: Math.floor(totalCount * 0.45),
  };
};

const validateQuotationData = (quotationData) => {
  const errors = [];

  if (!quotationData.client) {
    errors.push('Client is required');
  }

  if (!quotationData.project) {
    errors.push('Project is required');
  }

  if (!quotationData.items || !Array.isArray(quotationData.items) || quotationData.items.length === 0) {
    errors.push('At least one item is required');
  }

  if (quotationData.items && Array.isArray(quotationData.items)) {
    quotationData.items.forEach((item, index) => {
      if (!item.description || !item.description.trim()) {
        errors.push(`Item ${index + 1}: Description is required`);
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
      }
      if ((!item.Professional_amount && !item.rate) || ((item.Professional_amount || 0) <= 0 && (item.rate || 0) <= 0)) {
        errors.push(`Item ${index + 1}: Professional amount must be greater than 0`);
      }
    });
  }

  return errors;
};

// ============================================================================
// API SERVICE FUNCTIONS
// ============================================================================

export const getQuotations = async (params = {}) => {
  try {
    const queryParams = {
      page: 1,
      page_size: 10,
      ...params,
    };

    serviceLogger.log('[Quotations Service] Fetching quotations with params:', queryParams);

    const response = await api.get(ENDPOINTS.GET_ALL, {
      params: queryParams,
    });

    serviceLogger.log('[Quotations Service] Response:', response.data);

    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('[Quotations Service] getQuotations failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

export const getQuotationById = async (id) => {
  try {
    if (!id) {
      throw new Error('Quotation ID is required');
    }

    serviceLogger.log(`[Quotations Service] Fetching quotation with ID: ${id}`);

    const response = await api.get(ENDPOINTS.GET_BY_ID, {
      params: { id }
    });
    
    serviceLogger.log('[Quotations Service] Quotation data received:', response.data);
    
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error(`[Quotations Service] getQuotationById(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Create a new quotation with compliance support
 * 
 * Backend expects:
 * {
 *   quotation_number: 1234567890 (REQUIRED - integer),
 *   client: 47 (REQUIRED),
 *   project: 1 (REQUIRED),
 *   sac_code: "998313" (REQUIRED),
 *   gst_rate: "18",
 *   discount_rate: "10",
 *   total_amount: 50000,
 *   total_gst_amount: 9000,
 *   grand_total: 59000,
 *   items: [
 *     {
 *       description: "Item description",
 *       quantity: 10,
 *       Professional_amount: 5000,
 *       miscellaneous_amount: "0",
 *       total_amount: 50000,
 *       compliance_category: 1,
 *       sub_compliance_category: 1
 *     }
 *   ]
 * }
 */
export const createQuotation = async (quotationData) => {
  try {
    serviceLogger.log('[Quotations Service] Creating quotation with data:', quotationData);

    const validationErrors = validateQuotationData(quotationData);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join('; '));
    }

    // ========== BUILD PAYLOAD - MATCH BACKEND EXACTLY ==========
    // Backend uses IntegerField for monetary amounts — must send whole numbers.
    // Use Math.round (not parseInt) so 1.8 → 2, not 1.
    // The UI derives the precise decimal GST display from gst_rate + total_amount at read time.
    const payload = {
      quotation_number: parseInt(quotationData.quotation_number),
      client: parseInt(quotationData.client),
      project: parseInt(quotationData.project),
      gst_rate: String((parseFloat(quotationData.gst_rate) || 0).toFixed(2)),  // "18.00"
      discount_rate: String((parseFloat(quotationData.discount_rate) || 0).toFixed(2)),  // "0.00"
      sac_code: String(quotationData.sac_code || '').slice(0, 6),  // Max 6 chars
      total_amount:     Math.round(parseFloat(quotationData.total_amount)     || 0),
      total_gst_amount: Math.round(parseFloat(quotationData.total_gst_amount) || 0),
      grand_total:      Math.round(parseFloat(quotationData.grand_total)      || 0),
      items: quotationData.items.map(item => {
        // sub_compliance_category: 0 = execution (no sub-category), integer = certificate sub-category
        const subComplianceId = (item.sub_compliance_category !== null && item.sub_compliance_category !== undefined)
          ? parseInt(item.sub_compliance_category)
          : 0;

        return {
          description:             String(item.description).trim(),
          quantity:                parseInt(item.quantity),
          miscellaneous_amount:    (String(item.miscellaneous_amount || '').trim() || '--'),
          Professional_amount:     Math.round(parseFloat(item.Professional_amount) || 0),
          total_amount:            Math.round(parseFloat(item.total_amount)         || 0),
          compliance_category:     parseInt(item.compliance_category || 0),
          sub_compliance_category: subComplianceId,
        };
      })
    };

    console.log('='.repeat(100));
    console.log('📤 FINAL PAYLOAD TO BACKEND');
    console.log('='.repeat(100));
    console.log('quotation_number:', payload.quotation_number, typeof payload.quotation_number);
    console.log('client:', payload.client, typeof payload.client);
    console.log('project:', payload.project, typeof payload.project);
    console.log('gst_rate:', payload.gst_rate, typeof payload.gst_rate);
    console.log('discount_rate:', payload.discount_rate, typeof payload.discount_rate);
    console.log('sac_code:', payload.sac_code, 'length:', payload.sac_code.length);
    console.log('total_amount:', payload.total_amount, typeof payload.total_amount);
    console.log('total_gst_amount:', payload.total_gst_amount, typeof payload.total_gst_amount);
    console.log('grand_total:', payload.grand_total, typeof payload.grand_total);
    console.log('items count:', payload.items.length);
    payload.items.forEach((item, i) => {
      console.log(`Item ${i}:`, item);
    });
    console.log('Full JSON:', JSON.stringify(payload, null, 2));
    console.log('='.repeat(100));

    const response = await api.post('/quotations/create_quotation/', payload);

    console.log('='.repeat(100));
    console.log('✅ SUCCESS - QUOTATION CREATED');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('='.repeat(100));

    return response.data;

  } catch (error) {
    console.error('='.repeat(100));
    console.error('❌ QUOTATION CREATION FAILED');
    console.error('Error Status:', error.response?.status);
    console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('='.repeat(100));

    if (error.response?.status === 500) {
      const responseData = error.response?.data;
      let errorMsg = 'Server Error (500): ';
      
      if (responseData?.errors) {
        errorMsg += typeof responseData.errors === 'string' 
          ? responseData.errors 
          : JSON.stringify(responseData.errors);
      } else if (responseData?.message) {
        errorMsg += responseData.message;
      } else {
        errorMsg += JSON.stringify(responseData);
      }
      
      throw new Error(errorMsg);
    }

    if (error.response?.status === 400) {
      const responseData = error.response?.data;
      let errorDetails = [];
      
      if (responseData.message) errorDetails.push(responseData.message);
      if (responseData.detail) errorDetails.push(responseData.detail);
      if (responseData.errors) {
        if (typeof responseData.errors === 'object') {
          Object.entries(responseData.errors).forEach(([key, value]) => {
            const msg = Array.isArray(value) ? value.join(', ') : String(value);
            errorDetails.push(`${key}: ${msg}`);
          });
        } else {
          errorDetails.push(String(responseData.errors));
        }
      }

      const finalError = errorDetails.length > 0 
        ? errorDetails.join(' | ') 
        : JSON.stringify(responseData);

      throw new Error(`Validation Error (400): ${finalError}`);
    }

    const errorMessage = normalizeError(error);
    throw new Error(errorMessage);
  }
};

export const updateQuotation = async (id, quotationData) => {
  try {
    if (!id) {
      throw new Error('Quotation ID is required');
    }

    serviceLogger.log(`[Quotations Service] Updating quotation ${id} with data:`, quotationData);

    const payload = {};
    
    if (quotationData.client !== undefined) payload.client = Number(quotationData.client);
    if (quotationData.project !== undefined) payload.project = Number(quotationData.project);
    if (quotationData.quotation_number !== undefined) payload.quotation_number = Number(quotationData.quotation_number);
    if (quotationData.sac_code !== undefined) payload.sac_code = String(quotationData.sac_code);
    if (quotationData.gst_rate !== undefined) payload.gst_rate = String(quotationData.gst_rate);
    if (quotationData.discount_rate !== undefined) payload.discount_rate = String(quotationData.discount_rate);
    if (quotationData.notes !== undefined) payload.notes = quotationData.notes?.trim() || "";
    if (quotationData.terms !== undefined) payload.terms = quotationData.terms?.trim() || "";
    if (quotationData.total_amount !== undefined) payload.total_amount = Number(quotationData.total_amount);
    if (quotationData.total_gst_amount !== undefined) payload.total_gst_amount = Number(quotationData.total_gst_amount);
    if (quotationData.grand_total !== undefined) payload.grand_total = Number(quotationData.grand_total);
    
    if (quotationData.items !== undefined) {
      payload.items = quotationData.items.map(item => ({
        description: item.description.trim(),
        quantity: Number(item.quantity),
        Professional_amount: Number(item.Professional_amount || item.rate),
        miscellaneous_amount: String(item.miscellaneous_amount || '0'),
        total_amount: Number(item.total_amount || 0),
        compliance_category: Number(item.compliance_category || 0),
        sub_compliance_category: Number(item.sub_compliance_category || 0)
      }));
    }

    serviceLogger.log('[Quotations Service] Update payload:', JSON.stringify(payload, null, 2));

    const response = await api.patch(`${ENDPOINTS.UPDATE}${id}/`, payload);
    
    serviceLogger.log(`[Quotations Service] Quotation ${id} updated successfully`);
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error(`[Quotations Service] updateQuotation(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

export const deleteQuotation = async (id) => {
  try {
    if (!id) {
      throw new Error('Quotation ID is required');
    }

    serviceLogger.log(`[Quotations Service] Deleting quotation ${id}`);

    const response = await api.delete(`${ENDPOINTS.DELETE}${id}/`);
    
    serviceLogger.log(`[Quotations Service] Quotation ${id} deleted successfully`);
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error(`[Quotations Service] deleteQuotation(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

export const searchQuotations = async (query, filters = {}) => {
  try {
    if (!query) {
      throw new Error('Search query is required');
    }

    serviceLogger.log(`[Quotations Service] Searching quotations with query: "${query}"`);

    const response = await api.get(ENDPOINTS.SEARCH, {
      params: {
        q: query,
        ...filters,
      },
    });

    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('[Quotations Service] searchQuotations failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

export const exportQuotations = async (params = {}) => {
  try {
    serviceLogger.log('[Quotations Service] Exporting quotations with params:', params);

    const response = await api.get(ENDPOINTS.EXPORT, {
      params,
      responseType: 'blob',
    });

    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('[Quotations Service] exportQuotations failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

export const getQuotationStats = async () => {
  try {
    serviceLogger.log('[Quotations Service] Fetching quotation statistics...');

    const response = await getQuotations({ 
      page: 1, 
      page_size: 1
    });
    
    if (response.status === 'success' && response.data) {
      const totalCount = response.data.total_count || response.data.count || 0;
      
      const stats = calculateStatsFromTotal(totalCount);
      
      serviceLogger.log('[Quotations Service] Statistics calculated:', stats);
      
      return {
        status: 'success',
        data: stats,
      };
    }

    serviceLogger.warn('[Quotations Service] Unexpected response structure, returning zero stats');
    return {
      status: 'success',
      data: {
        total: 0,
        draft: 0,
        review: 0,
        completed: 0,
      },
    };

  } catch (error) {
    serviceLogger.error('[Quotations Service] getQuotationStats failed:', error);
    serviceLogger.warn('[Quotations Service] Returning zero statistics as fallback');
    
    return {
      status: 'success',
      data: {
        total: 0,
        draft: 0,
        review: 0,
        completed: 0,
      },
    };
  }
};

export const bulkDeleteQuotations = async (ids) => {
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('Quotation IDs array is required and cannot be empty');
    }

    serviceLogger.log(`[Quotations Service] Bulk deleting ${ids.length} quotations:`, ids);

    const response = await api.post('/quotations/bulk-delete/', { ids });
    
    serviceLogger.log(`[Quotations Service] Successfully deleted ${ids.length} quotations`);
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('[Quotations Service] bulkDeleteQuotations failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// COMPLIANCE FUNCTIONS
// ============================================================================

export const getComplianceByCategory = async (categoryId) => {
  try {
    if (!categoryId) {
      throw new Error('Category ID is required');
    }

    serviceLogger.log(`[Quotations Service] Fetching compliance for category: ${categoryId}`);

    // CHANGED: Remove /api prefix - baseURL already has it
    const response = await api.get('/compliance/get_compliance_by_category/', {
      params: { category: categoryId }
    });

    serviceLogger.log('[Quotations Service] Compliance response:', response.data);

    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('[Quotations Service] getComplianceByCategory failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

export const getSubComplianceCategories = async () => {
  try {
    serviceLogger.log('[Quotations Service] Fetching all sub-compliance categories');

    // CHANGED: Remove /api prefix
    const response = await api.get('/compliance/get_sub_compliance_categories/');

    serviceLogger.log('[Quotations Service] Sub-compliance response:', response.data);

    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('[Quotations Service] getSubComplianceCategories failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

export const getAllCompliance = async () => {
  try {
    serviceLogger.log('[Quotations Service] Fetching all compliance');

    // CHANGED: Remove /api prefix
    const response = await api.get('/compliance/get_all_compliance/');

    serviceLogger.log('[Quotations Service] All compliance response:', response.data);

    if (response.data?.status === 'success') {
      return response.data;
    }

    throw new Error('Failed to fetch compliance');

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('[Quotations Service] getAllCompliance failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// GENERATE PDF
// ============================================================================

/**
 * Generate and download a PDF for a quotation.
 *
 * API: POST /api/quotations/generate_pdf/?id=<id>
 * Response: application/pdf binary  (Content-Disposition: attachment; filename="Quotation_#<id>.pdf")
 *
 * The function fetches the PDF as a blob and triggers a browser download.
 *
 * @param {number|string} id - The quotation's database ID (NOT the quotation_number)
 * @param {string} [filename] - Optional override for the downloaded file name
 * @returns {Promise<void>}
 */
export const generateQuotationPdf = async (id, filename) => {
  try {
    if (!id) throw new Error('Quotation ID is required to generate PDF');

    serviceLogger.log(`[Quotations Service] Generating PDF for quotation ID: ${id}`);

    // Use responseType: 'blob' so axios gives us raw binary instead of JSON
    const response = await api.post(
      ENDPOINTS.GENERATE_PDF,
      {},                          // empty body — the API only needs the query param
      {
        params: { id },
        responseType: 'blob',
      }
    );

    // Derive filename from Content-Disposition header or use a safe default
    const contentDisposition = response.headers['content-disposition'] || '';
    const headerFilename = contentDisposition.match(/filename="?([^";\n]+)"?/)?.[1];
    const downloadName = filename || headerFilename || `Quotation_${id}.pdf`;

    // Create an object URL from the blob and programmatically click a link
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Release the object URL memory after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    serviceLogger.log(`[Quotations Service] PDF downloaded: ${downloadName}`);
  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error(`[Quotations Service] generateQuotationPdf(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// UPDATE QUOTATION (FULL — via /quotations/update_quotation/)
// ============================================================================

/**
 * Update an existing quotation using the dedicated update endpoint.
 * Sends the complete quotation payload including all items.
 *
 * @param {object} quotationData - Full quotation payload (must include id)
 * @returns {Promise<object>} API response data
 */
export const updateQuotationFull = async (quotationData) => {
  try {
    if (!quotationData.id) throw new Error('Quotation ID is required for update');

    serviceLogger.log(`[Quotations Service] Updating quotation ${quotationData.id} via full update endpoint`);

    const payload = {
      id:               parseInt(quotationData.id),
      client:           parseInt(quotationData.client),
      project:          parseInt(quotationData.project),
      gst_rate:         String((parseFloat(quotationData.gst_rate) || 0).toFixed(2)),
      discount_rate:    String((parseFloat(quotationData.discount_rate) || 0).toFixed(2)),
      sac_code:         String(quotationData.sac_code || '').slice(0, 6),
      total_amount:     parseFloat((parseFloat(quotationData.total_amount) || 0).toFixed(2)),
      total_gst_amount: parseFloat((parseFloat(quotationData.total_gst_amount) || 0).toFixed(2)),
      grand_total:      parseFloat((parseFloat(quotationData.grand_total) || 0).toFixed(2)),
      items: (quotationData.items || []).map(item => {
        // Always send id: existing items need their integer id (UPDATE), new items need null (INSERT).
        // Omitting the field entirely causes a 400 "This field is required" from DRF.
        const rawId  = item.id != null ? parseInt(item.id) : null;
        const itemId = rawId && rawId > 0 ? rawId : null;
        return {
          id:                      itemId,
          description:             String(item.description).trim(),
          quantity:                parseInt(item.quantity),
          miscellaneous_amount:    String(item.miscellaneous_amount || '--').trim() || '--',
          Professional_amount:     parseFloat((parseFloat(item.Professional_amount) || 0).toFixed(2)),
          total_amount:            parseFloat((parseFloat(item.total_amount) || 0).toFixed(2)),
          compliance_category:     parseInt(item.compliance_category || 0),
          sub_compliance_category: parseInt(item.sub_compliance_category || 0),
        };
      }),
    };

    serviceLogger.log('[Quotations Service] updateQuotationFull payload:', JSON.stringify(payload, null, 2));

    const response = await api.put(ENDPOINTS.UPDATE_FULL, payload);

    serviceLogger.log(`[Quotations Service] Quotation ${quotationData.id} updated successfully`);
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error(`[Quotations Service] updateQuotationFull(${quotationData.id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// SEND QUOTATION TO CLIENT VIA EMAIL
// ============================================================================

/**
 * Send a quotation to a client via email with the PDF attached.
 */
export const sendQuotationToClient = async ({
  quotationId,
  quotationNumber,
  issuedDate,
  recipientEmail,
  subject,
  body,
  extraAttachments = [],
}) => {
  try {
    if (!quotationId)    throw new Error('Quotation ID is required');
    if (!recipientEmail) throw new Error('Recipient email is required');

    serviceLogger.log(`[Quotations Service] Sending quotation ${quotationId} to ${recipientEmail}`);

    const pdfResponse = await api.post(
      ENDPOINTS.GENERATE_PDF,
      {},
      { params: { id: quotationId }, responseType: 'blob' }
    );
    const pdfBlob = new Blob([pdfResponse.data], { type: 'application/pdf' });
    const pdfFile = new File([pdfBlob], `${quotationNumber || `Quotation_${quotationId}`}.pdf`, {
      type: 'application/pdf',
    });

    const MAX_BYTES = 25 * 1024 * 1024;
    const allFiles = [pdfFile, ...extraAttachments];
    const totalSize = allFiles.reduce((sum, f) => sum + (f.size || 0), 0);
    if (totalSize > MAX_BYTES) {
      throw new Error(
        `Total attachment size (${(totalSize / (1024 * 1024)).toFixed(1)} MB) exceeds the 25 MB limit.`
      );
    }

    const autoSubject =
      subject ||
      `Quotation ${quotationNumber}${issuedDate ? ` — Issued ${issuedDate}` : ''}`;

    const autoBody =
      body ||
      `Dear Client,\n\nPlease find attached your quotation ${quotationNumber}${issuedDate ? `, issued on ${issuedDate}` : ''}.\n\nKindly review the details and feel free to reach out if you have any questions.\n\nBest regards,\nERP System`;

    const formData = new FormData();
    formData.append('subject',    autoSubject);
    formData.append('recipients', recipientEmail);
    formData.append('body',       autoBody);
    allFiles.forEach((file) => formData.append('attachments', file));

    const response = await api.post(ENDPOINTS.SEND_EMAIL, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    serviceLogger.log('[Quotations Service] Email sent successfully:', response.data);
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('[Quotations Service] sendQuotationToClient failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  updateQuotationFull,
  deleteQuotation,
  searchQuotations,
  exportQuotations,
  getQuotationStats,
  bulkDeleteQuotations,
  getComplianceByCategory,
  getSubComplianceCategories,
  getAllCompliance,
  generateQuotationPdf,
  sendQuotationToClient,
};