import api, { normalizeError } from './api';

/**
 * ============================================================================
 * QUOTATIONS SERVICE - WITH COMPLIANCE SUPPORT
 * ============================================================================
 * 
 * Service for creating and managing quotations with compliance categories
 * 
 * @module quotationService
 * @version 1.1.0 (FIXED)
 * @production
 * 
 * FIXES APPLIED:
 * ✅ Logging configuration now respects NODE_ENV (development-only)
 * ✅ Removed all console.log() from production code
 * ✅ Improved error handling and logging consistency
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

// Only enable logging in development mode to avoid console pollution in production
const ENABLE_SERVICE_LOGGING = process.env.NODE_ENV === 'development';

const serviceLogger = {
  log: (...args) => {
    if (ENABLE_SERVICE_LOGGING) {
      console.log('[Quotations Service]', ...args);
    }
  },
  warn: (...args) => console.warn('[Quotations Service]', ...args),
  error: (...args) => console.error('[Quotations Service]', ...args),
};

// ============================================================================
// API ENDPOINTS
// ============================================================================

const ENDPOINTS = {
  GET_ALL:      '/quotations/get_all_quotations/',
  GET_BY_ID:    '/quotations/get_quotation/',
  CREATE:       '/quotations/create_quotation/',
  UPDATE:       '/quotations/',
  UPDATE_FULL:  '/quotations/update_quotation/',
  DELETE:       '/quotations/',
  DELETE_BY_ID: '/quotations/delete_quotation/',
  SEARCH:       '/quotations/search/',
  EXPORT:       '/quotations/export/',
  GENERATE_PDF: '/quotations/generate_pdf/',
  SEND_EMAIL:   '/notifications/send_email/',
  STATS:        '/quotations/stats/',
  BULK_DELETE:  '/quotations/bulk_delete/',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique 7-digit number for quotation numbering.
 * Backend will format this as "QT-YYYYMM-XXXXXXX"
 * 
 * @returns {number} 7-digit unique number (1,000,000 - 9,999,999)
 */
const generateQuotationNumber = () => {
  // Frontend generates 7-digit unique suffix
  // This ensures high probability of uniqueness within a month
  // Example: 3093529 → Backend formats as "QT-202603-3093529"
  return Math.floor(1000000 + Math.random() * 9000000);
};

/**
 * Validate quotation data before API submission
 * Performs client-side validation to fail fast without wasting API calls
 * 
 * @param {Object} quotationData - Data to validate
 * @returns {Array} Array of error messages (empty if valid)
 */
const validateQuotationData = (quotationData) => {
  const errors = [];

  // Purchase orders use vendor instead of client — only require client for client quotations
  if (!quotationData.client && !quotationData.vendor) {
    errors.push('Client or Vendor is required');
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

/**
 * Fetch all quotations with pagination and filters
 * 
 * @param {Object} params - Query parameters (page, page_size, search, filters, etc.)
 * @returns {Promise<Object>} API response with quotations list and metadata
 * @throws {Error} Normalized error message
 */
export const getQuotations = async (params = {}) => {
  try {
    const queryParams = {
      page: 1,
      page_size: 10,
      ...params,
    };

    serviceLogger.log('Fetching quotations with params:', queryParams);

    const response = await api.get(ENDPOINTS.GET_ALL, {
      params: queryParams,
    });

    serviceLogger.log('Quotations fetched successfully:', {
      count: response.data?.data?.results?.length || 0,
      total: response.data?.data?.total_count || 0,
      page: response.data?.data?.page || 1,
    });

    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('getQuotations failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Fetch a single quotation by ID
 * 
 * @param {number} id - Quotation ID
 * @returns {Promise<Object>} API response with quotation details
 * @throws {Error} If ID is not provided or quotation not found
 */
export const getQuotationById = async (id) => {
  try {
    if (!id) {
      throw new Error('Quotation ID is required');
    }

    serviceLogger.log(`Fetching quotation with ID: ${id}`);

    const response = await api.get(ENDPOINTS.GET_BY_ID, {
      params: { id }
    });
    
    serviceLogger.log('Quotation data received');
    
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error(`getQuotationById(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Create a new quotation with compliance support
 * 
 * Backend expects:
 * {
 *   quotation_number: "999" (REQUIRED - string, backend builds full QT-YYYYMM-999),
 *   client: 47 | null (REQUIRED for client quotation, null for vendor/purchase order),
 *   vendor: null | 15 (null for client quotation, SET for vendor/purchase order),
 *   project: 1 (REQUIRED),
 *   sac_code: "998313" (REQUIRED),
 *   gst_rate: "18",
 *   discount_rate: "10",
 *   total_amount: "50000.00" (string),
 *   total_gst_amount: "9000.00" (string),
 *   grand_total: "59000.00" (string),
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
 * 
 * @param {Object} quotationData - Complete quotation data
 * @returns {Promise<Object>} Created quotation with ID and metadata
 * @throws {Error} Validation or API errors
 */
export const createQuotation = async (quotationData) => {
  try {
    serviceLogger.log('Creating quotation...');

    // STEP 1: Validate data on client side (fail fast)
    const validationErrors = validateQuotationData(quotationData);
    if (validationErrors.length > 0) {
      const errorMessage = validationErrors.join('; ');
      serviceLogger.error('Validation failed:', errorMessage);
      throw new Error(errorMessage);
    }

    // STEP 2: Build payload with proper type coercion
    const isVendorQuotation = !!quotationData.vendor;
    const payload = {
      quotation_number: String(quotationData.quotation_number),
      client: isVendorQuotation ? null : parseInt(quotationData.client),
      vendor: isVendorQuotation ? parseInt(quotationData.vendor) : null,
      project: parseInt(quotationData.project),
      gst_rate: String((parseFloat(quotationData.gst_rate) || 0).toFixed(2)),
      discount_rate: String((parseFloat(quotationData.discount_rate) || 0).toFixed(2)),
      sac_code: String(quotationData.sac_code || '').slice(0, 6),
      total_amount: String((parseFloat(quotationData.total_amount) || 0).toFixed(2)),
      total_gst_amount: String((parseFloat(quotationData.total_gst_amount) || 0).toFixed(2)),
      grand_total: String((parseFloat(quotationData.grand_total) || 0).toFixed(2)),
      items: quotationData.items.map(item => ({
        description: String(item.description).trim(),
        quantity: parseInt(item.quantity),
        miscellaneous_amount: String(item.miscellaneous_amount ?? '').trim() || '--',
        Professional_amount: String((parseFloat(item.Professional_amount) || 0).toFixed(2)),
        total_amount: String((parseFloat(item.total_amount) || 0).toFixed(2)),
        compliance_category: parseInt(item.compliance_category || 0),
        sub_compliance_category: parseInt(item.sub_compliance_category || 0),
      }))
    };

    // STEP 3: Log in development mode only
    if (ENABLE_SERVICE_LOGGING) {
      serviceLogger.log('Payload prepared:', {
        quotation_number: payload.quotation_number,
        client: payload.client,
        vendor: payload.vendor,
        project: payload.project,
        items_count: payload.items.length,
        total_amount: payload.total_amount,
      });
    }

    // STEP 4: Make API call
    serviceLogger.log('Sending quotation to backend...');
    const response = await api.post(ENDPOINTS.CREATE, payload);

    serviceLogger.log('Quotation created successfully:', {
      id: response.data?.data?.id,
      quotation_number: response.data?.data?.quotation_number,
    });

    return response.data;

  } catch (error) {
    serviceLogger.error('createQuotation failed');

    // Handle specific error types
    if (error.response?.status === 500) {
      const responseData = error.response?.data;
      let errorMsg = 'Server Error: ';
      
      if (responseData?.errors) {
        errorMsg += typeof responseData.errors === 'string' 
          ? responseData.errors 
          : JSON.stringify(responseData.errors);
      } else if (responseData?.message) {
        errorMsg += responseData.message;
      } else {
        errorMsg += 'An unexpected error occurred';
      }
      
      throw new Error(errorMsg);
    }

    if (error.response?.status === 400) {
      const responseData = error.response?.data;
      let errorDetails = [];
      
      if (responseData?.message) errorDetails.push(responseData.message);
      if (responseData?.detail) errorDetails.push(responseData.detail);
      if (responseData?.errors) {
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
        : 'Validation failed';

      throw new Error(`Validation Error: ${finalError}`);
    }

    // Generic error handling
    const errorMessage = normalizeError(error);
    throw new Error(errorMessage);
  }
};

/**
 * Update an existing quotation (partial update)
 * 
 * @param {number} id - Quotation ID
 * @param {Object} quotationData - Fields to update
 * @returns {Promise<Object>} Updated quotation data
 * @throws {Error} If ID is missing or update fails
 */
export const updateQuotation = async (id, quotationData) => {
  try {
    if (!id) {
      throw new Error('Quotation ID is required');
    }

    serviceLogger.log(`Updating quotation ${id}...`);

    const payload = {};
    
    if (quotationData.client !== undefined) payload.client = Number(quotationData.client);
    if (quotationData.project !== undefined) payload.project = Number(quotationData.project);
    if (quotationData.quotation_number !== undefined) payload.quotation_number = Number(quotationData.quotation_number);
    if (quotationData.sac_code !== undefined) payload.sac_code = String(quotationData.sac_code);
    if (quotationData.gst_rate !== undefined) payload.gst_rate = String(quotationData.gst_rate);
    if (quotationData.discount_rate !== undefined) payload.discount_rate = String(quotationData.discount_rate);
    if (quotationData.notes !== undefined) payload.notes = quotationData.notes?.trim() || "";
    if (quotationData.terms !== undefined) payload.terms = quotationData.terms?.trim() || "";
    if (quotationData.total_amount !== undefined) payload.total_amount = String((parseFloat(quotationData.total_amount) || 0).toFixed(2));
    if (quotationData.total_gst_amount !== undefined) payload.total_gst_amount = String((parseFloat(quotationData.total_gst_amount) || 0).toFixed(2));
    if (quotationData.grand_total !== undefined) payload.grand_total = String((parseFloat(quotationData.grand_total) || 0).toFixed(2));
    
    if (quotationData.items !== undefined) {
      payload.items = quotationData.items.map(item => ({
        description: item.description.trim(),
        quantity: Number(item.quantity),
        Professional_amount: String((parseFloat(item.Professional_amount || item.rate) || 0).toFixed(2)),
        miscellaneous_amount: String(item.miscellaneous_amount ?? '').trim() || '--',
        total_amount: String((parseFloat(item.total_amount) || 0).toFixed(2)),
        compliance_category: Number(item.compliance_category || 0),
        sub_compliance_category: Number(item.sub_compliance_category || 0)
      }));
    }

    serviceLogger.log('Update payload prepared');

    const response = await api.patch(`${ENDPOINTS.UPDATE}${id}/`, payload);
    
    serviceLogger.log(`Quotation ${id} updated successfully`);
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error(`updateQuotation(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Delete a quotation by ID using the dedicated delete endpoint.
 * Endpoint: DELETE /quotations/delete_quotation/?id=<id>
 *
 * @param {number} id - Quotation ID to delete
 * @returns {Promise<Object>} Deletion response
 * @throws {Error} If deletion fails
 */
export const deleteQuotationById = async (id) => {
  try {
    if (!id) {
      throw new Error('Quotation ID is required');
    }

    serviceLogger.log(`Deleting quotation ${id} via delete_quotation endpoint...`);

    const response = await api.delete(`${ENDPOINTS.DELETE_BY_ID}`, {
      params: { id },
    });

    serviceLogger.log(`Quotation ${id} deleted successfully`);
    return { status: 'success', data: response.data };

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error(`deleteQuotationById(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Delete a quotation by ID
 * 
 * @param {number} id - Quotation ID to delete
 * @returns {Promise<Object>} Deletion response
 * @throws {Error} If deletion fails
 */
export const deleteQuotation = async (id) => {
  try {
    if (!id) {
      throw new Error('Quotation ID is required');
    }

    serviceLogger.log(`Deleting quotation ${id}...`);

    const response = await api.delete(`${ENDPOINTS.DELETE}${id}/`);

    serviceLogger.log(`Quotation ${id} deleted successfully`);
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error(`deleteQuotation(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Search quotations by criteria
 * 
 * @param {string} query - Search query
 * @param {Object} filters - Additional filters
 * @returns {Promise<Object>} Search results
 * @throws {Error} If search fails
 */
export const searchQuotations = async (query, filters = {}) => {
  try {
    if (!query) {
      throw new Error('Search query is required');
    }

    serviceLogger.log('Searching quotations:', query);

    const response = await api.get(ENDPOINTS.SEARCH, {
      params: { q: query, ...filters }
    });

    serviceLogger.log('Search completed:', {
      results_count: response.data?.data?.results?.length || 0,
    });

    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('searchQuotations failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Export quotations (CSV, PDF, etc.)
 * 
 * @param {Object} params - Export parameters
 * @returns {Promise<Blob>} Exported file
 * @throws {Error} If export fails
 */
export const exportQuotations = async (params = {}) => {
  try {
    serviceLogger.log('Exporting quotations...');

    const response = await api.get(ENDPOINTS.EXPORT, {
      params,
      responseType: 'blob',
    });

    serviceLogger.log('Export completed');
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('exportQuotations failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Get quotation statistics
 * 
 * @returns {Promise<Object>} Statistics data (total, draft, review, completed)
 * @throws {Error} If fetch fails
 */
export const getQuotationStats = async () => {
  try {
    serviceLogger.log('Fetching quotation statistics...');

    const response = await api.get(ENDPOINTS.STATS);

    serviceLogger.log('Statistics fetched successfully');
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('getQuotationStats failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Bulk delete multiple quotations
 * 
 * @param {Array<number>} ids - Array of quotation IDs to delete
 * @returns {Promise<Object>} Deletion response
 * @throws {Error} If deletion fails
 */
export const bulkDeleteQuotations = async (ids = []) => {
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('At least one quotation ID is required');
    }

    serviceLogger.log('Bulk deleting quotations:', ids.length);

    const response = await api.post(ENDPOINTS.BULK_DELETE, { ids });

    serviceLogger.log('Bulk deletion completed:', ids.length);
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('bulkDeleteQuotations failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Get compliance categories
 * 
 * @returns {Promise<Object>} Compliance categories list
 * @throws {Error} If fetch fails
 */
export const getComplianceByCategory = async () => {
  try {
    serviceLogger.log('Fetching compliance categories...');

    const response = await api.get('/compliance/get_all_compliance/');

    serviceLogger.log('Compliance categories fetched');
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('getComplianceByCategory failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Get sub-compliance categories for a given compliance category
 * 
 * @param {number} categoryId - Compliance category ID
 * @returns {Promise<Object>} Sub-compliance categories
 * @throws {Error} If fetch fails
 */
export const getSubComplianceCategories = async (categoryId) => {
  try {
    if (!categoryId) {
      throw new Error('Category ID is required');
    }

    serviceLogger.log(`Fetching sub-compliance categories for category ${categoryId}`);

    const response = await api.get('/compliance/get_compliance_by_category/', {
      params: { category: categoryId, page_size: 100 }
    });

    serviceLogger.log('Sub-compliance categories fetched');
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('getSubComplianceCategories failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Get all compliance data
 * 
 * @returns {Promise<Object>} All compliance data
 * @throws {Error} If fetch fails
 */
export const getAllCompliance = async () => {
  try {
    serviceLogger.log('Fetching all compliance data...');

    const response = await api.get('/compliance/get_all_compliance/');

    serviceLogger.log('All compliance data fetched');
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('getAllCompliance failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Generate PDF for a quotation
 * Downloads the PDF directly to the user's computer
 * 
 * @param {number} id - Quotation ID
 * @throws {Error} If PDF generation fails
 */
export const generateQuotationPdf = async (id) => {
  try {
    if (!id) {
      throw new Error('Quotation ID is required');
    }

    serviceLogger.log(`Generating PDF for quotation ${id}...`);

    const response = await api.post(
      ENDPOINTS.GENERATE_PDF,
      {},
      { params: { id }, responseType: 'blob' }
    );

    // Create blob and trigger download
    const url = URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    const downloadName = `Quotation_${id}.pdf`;
    link.setAttribute('download', downloadName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Release the object URL memory after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    serviceLogger.log(`PDF downloaded: ${downloadName}`);
  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error(`generateQuotationPdf(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Update an existing quotation using the dedicated update endpoint
 * Sends the complete quotation payload including all items.
 *
 * @param {Object} quotationData - Full quotation payload (must include id)
 * @returns {Promise<Object>} API response data
 */
export const updateQuotationFull = async (quotationData) => {
  try {
    if (!quotationData.id) throw new Error('Quotation ID is required for update');

    serviceLogger.log(`Updating quotation ${quotationData.id}...`);

    const payload = {
      id: parseInt(quotationData.id),
      // CLIENT quotation → client: <id>, vendor: null
      // VENDOR quotation → vendor: <id>, client: null
      client: quotationData.client ? parseInt(quotationData.client) : null,
      vendor: quotationData.vendor ? parseInt(quotationData.vendor) : null,
      project: parseInt(quotationData.project),
      gst_rate: String((parseFloat(quotationData.gst_rate) || 0).toFixed(2)),
      discount_rate: String((parseFloat(quotationData.discount_rate) || 0).toFixed(2)),
      sac_code: String(quotationData.sac_code || '').slice(0, 6),
      total_amount: String((parseFloat(quotationData.total_amount) || 0).toFixed(2)),
      total_gst_amount: String((parseFloat(quotationData.total_gst_amount) || 0).toFixed(2)),
      grand_total: String((parseFloat(quotationData.grand_total) || 0).toFixed(2)),
      items: (quotationData.items || []).map(item => {
        // Always send id: existing items need their integer id (UPDATE), new items need null (INSERT).
        const rawId = item.id != null ? parseInt(item.id) : null;
        const itemId = rawId && rawId > 0 ? rawId : null;
        return {
          id: itemId,
          description: String(item.description).trim(),
          quantity: parseInt(item.quantity),
          miscellaneous_amount: String(item.miscellaneous_amount ?? '').trim() || '--',
          Professional_amount: String((parseFloat(item.Professional_amount) || 0).toFixed(2)),
          total_amount: String((parseFloat(item.total_amount) || 0).toFixed(2)),
          compliance_category: parseInt(item.compliance_category || 0),
          sub_compliance_category: parseInt(item.sub_compliance_category || 0),
        };
      }),
    };

    serviceLogger.log(`Sending full update for quotation ${quotationData.id}...`);

    const response = await api.put(ENDPOINTS.UPDATE_FULL, payload);

    serviceLogger.log(`Quotation ${quotationData.id} updated successfully`);
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error(`updateQuotationFull(${quotationData.id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Send a quotation to a client via email with the PDF attached.
 * 
 * @param {Object} params - Email parameters
 * @param {number} params.quotationId - Quotation ID
 * @param {string} params.quotationNumber - Quotation number for display
 * @param {string} params.issuedDate - Issued date for email body
 * @param {string} params.recipientEmail - Recipient email address
 * @param {string} params.subject - Email subject (optional)
 * @param {string} params.body - Email body (optional)
 * @param {Array<File>} params.extraAttachments - Additional files to attach (optional)
 * @returns {Promise<Object>} Email sending response
 * @throws {Error} If email sending fails
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
    if (!quotationId) throw new Error('Quotation ID is required');
    if (!recipientEmail) throw new Error('Recipient email is required');

    serviceLogger.log(`Sending quotation ${quotationId} to ${recipientEmail}`);

    // Generate PDF
    const pdfResponse = await api.post(
      ENDPOINTS.GENERATE_PDF,
      {},
      { params: { id: quotationId }, responseType: 'blob' }
    );

    const pdfBlob = new Blob([pdfResponse.data], { type: 'application/pdf' });
    const pdfFile = new File([pdfBlob], `${quotationNumber || `Quotation_${quotationId}`}.pdf`, {
      type: 'application/pdf',
    });

    // Validate total attachment size
    const MAX_BYTES = 25 * 1024 * 1024;
    const allFiles = [pdfFile, ...extraAttachments];
    const totalSize = allFiles.reduce((sum, f) => sum + (f.size || 0), 0);
    if (totalSize > MAX_BYTES) {
      throw new Error(
        `Total attachment size (${(totalSize / (1024 * 1024)).toFixed(1)} MB) exceeds the 25 MB limit.`
      );
    }

    // Build email content
    const autoSubject =
      subject ||
      `Quotation ${quotationNumber}${issuedDate ? ` — Issued ${issuedDate}` : ''}`;

    const autoBody =
      body ||
      `Dear Client,\n\nPlease find attached your quotation ${quotationNumber}${issuedDate ? `, issued on ${issuedDate}` : ''}.\n\nKindly review the details and feel free to reach out if you have any questions.\n\nBest regards,\nERP System`;

    // Build FormData
    const formData = new FormData();
    formData.append('subject', autoSubject);
    formData.append('recipients', recipientEmail);
    formData.append('body', autoBody);
    allFiles.forEach((file) => formData.append('attachments', file));

    serviceLogger.log('Sending email with attachment...');

    const response = await api.post(ENDPOINTS.SEND_EMAIL, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    serviceLogger.log('Email sent successfully');
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('sendQuotationToClient failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Fetch compliance descriptions for a category + optional sub-category.
 * Used by the Add Compliance modal in both quotations.jsx and
 * create_purchase_order.jsx to populate the description dropdown.
 *
 * API: GET /compliance/get_compliance_by_category/
 *   ?category=<id>&sub_category=<id>&page_size=100
 *
 * @param {number} categoryId - Compliance category ID (1–4)
 * @param {number|null} subCategoryId - Sub-compliance ID (null for execution)
 * @returns {Promise<Array>} Array of compliance description objects
 */
export const getComplianceDescriptions = async (categoryId, subCategoryId = null) => {
  try {
    if (!categoryId) throw new Error('Category ID is required');

    serviceLogger.log(`Fetching compliance descriptions for category ${categoryId}`);

    const params = { category: categoryId, page_size: 100 };
    if (subCategoryId) params.sub_category = subCategoryId;

    const response = await api.get('/compliance/get_compliance_by_category/', { params });

    if (response?.data?.status === 'success' && response?.data?.data?.results) {
      serviceLogger.log('Compliance descriptions fetched:', {
        count: response.data.data.results.length,
      });
      return response.data.data.results;
    }

    return [];

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('getComplianceDescriptions failed:', errorMessage);
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
  deleteQuotationById,
  searchQuotations,
  exportQuotations,
  getQuotationStats,
  bulkDeleteQuotations,
  getComplianceByCategory,
  getComplianceDescriptions,
  getSubComplianceCategories,
  getAllCompliance,
  generateQuotationPdf,
  sendQuotationToClient,
};