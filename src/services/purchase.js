import api, { handleApiError, normalizeError } from './api';

/**
 * ============================================================================
 * PURCHASE SERVICE - PRODUCTION-READY API LAYER
 * ============================================================================
 *
 * Owns every endpoint and function specific to Purchase Orders:
 *   - CRUD for Purchase Orders
 *   - PDF generation for Purchase Orders
 *   - Project / user / invoice lookups used by PO pages
 *   - Compliance description lookup used by the PO create/edit form
 *
 * @module purchaseService
 * @version 2.0.0
 * @production
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const ENABLE_SERVICE_LOGGING = import.meta.env.MODE === 'development';

const serviceLogger = {
  log:   (...args) => ENABLE_SERVICE_LOGGING && console.log('[Purchase Service]', ...args),
  warn:  (...args) => console.warn('[Purchase Service]', ...args),
  error: (...args) => console.error('[Purchase Service]', ...args),
};

// ============================================================================
// API ENDPOINTS
// ============================================================================

const ENDPOINTS = {
  // Purchase Order CRUD
  GET_PURCHASE_ORDER:    '/quotations/get_purchase_order/',
  CREATE_PURCHASE_ORDER: '/quotations/create_purchase_order/',
  UPDATE_PURCHASE_ORDER: '/quotations/update_quotation/',     // shared PUT endpoint

  // Supporting lookups used by PO pages
  GET_ALL_PROJECTS: '/projects/get_all_Project/',
  GET_USER:         '/users/get_user/',
  GET_ALL_INVOICES: '/invoices/get_all_invoices/',

  // Compliance descriptions (used by PO create/edit form)
  GET_COMPLIANCE_BY_CATEGORY: '/compliance/get_compliance_by_category/',

  // PDF generation
  GENERATE_PDF: '/quotations/generate_pdf/',
};

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Build the items array payload for execution-type Purchase Orders.
 * Shared internally by createPurchaseOrder and updatePurchaseOrder.
 *
 * @param {Array} items - Raw item objects from the form
 * @returns {Array} Shaped items ready for the API
 */
const buildExecutionItemsPayload = (items = []) =>
  items.map((item) => {
    const qty      = parseInt(item.quantity)              || 1;
    const profRate = parseFloat(item.Professional_amount) || 0;
    const matRate  = parseFloat(item.material_rate)       || 0;
    const labRate  = parseFloat(item.labour_rate)         || 0;
    const matAmt   = parseFloat(item.material_amount)     || 0;
    const labAmt   = parseFloat(item.labour_amount)       || 0;
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

/**
 * Surface structured 400 validation errors (including nested items[n].field)
 * into a single human-readable string.
 *
 * @param {Object} responseData - error.response.data from a failed API call
 * @returns {string} Human-readable error message
 */
const format400Error = (responseData) => {
  const rawErrors = responseData?.errors || responseData;
  const errorParts = [];

  if (rawErrors && typeof rawErrors === 'object') {
    Object.entries(rawErrors).forEach(([field, value]) => {
      if (field === 'items' && Array.isArray(value)) {
        value.forEach((itemErrors, idx) => {
          if (itemErrors && typeof itemErrors === 'object') {
            Object.entries(itemErrors).forEach(([f, msgs]) => {
              errorParts.push(
                `Item ${idx + 1} (${f}): ${Array.isArray(msgs) ? msgs.join(', ') : String(msgs)}`
              );
            });
          }
        });
      } else {
        errorParts.push(
          `${field}: ${Array.isArray(value) ? value.join(', ') : String(value)}`
        );
      }
    });
  }

  return errorParts.length > 0
    ? errorParts.join(' | ')
    : (responseData?.message || 'Validation failed — please check your input');
};

// ============================================================================
// PURCHASE ORDER — CRUD
// ============================================================================

/**
 * Fetch a single Purchase Order by ID.
 * Endpoint: GET /quotations/get_purchase_order/?id=<id>
 *
 * @param {number|string} id - Purchase Order ID
 * @returns {Promise<Object>} API response with full PO details including items
 * @throws {Error} If ID is missing or request fails
 */
export const getPurchaseOrderById = async (id) => {
  if (!id) throw new Error('Purchase Order ID is required');
  try {
    serviceLogger.log(`Fetching Purchase Order with ID: ${id}`);
    const response = await api.get(ENDPOINTS.GET_PURCHASE_ORDER, { params: { id } });
    if (response.data?.status !== 'success' || !response.data?.data) {
      throw new Error('Failed to load purchase order');
    }
    serviceLogger.log(`Purchase Order ${id} fetched successfully`);
    return response.data;
  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error(`getPurchaseOrderById(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Create a new Purchase Order.
 * Endpoint: POST /quotations/create_purchase_order/
 * Vendor-based — no client field required.
 *
 * @param {Object} quotationData - Full PO data from the create form
 * @returns {Promise<Object>} API response with created PO data
 * @throws {Error} If validation or creation fails
 */
export const createPurchaseOrder = async (quotationData) => {
  try {
    const payload = {
      vendor:           parseInt(quotationData.vendor),
      project:          parseInt(quotationData.project),
      company:          parseInt(quotationData.company) || 1,
      gst_rate:         String((parseFloat(quotationData.gst_rate)         || 0).toFixed(2)),
      discount_rate:    String((parseFloat(quotationData.discount_rate)    || 0).toFixed(2)),
      sac_code:         String(quotationData.sac_code || '').slice(0, 6),
      total_amount:     String((parseFloat(quotationData.total_amount)     || 0).toFixed(2)),
      total_gst_amount: String((parseFloat(quotationData.total_gst_amount) || 0).toFixed(2)),
      grand_total:      String((parseFloat(quotationData.grand_total)      || 0).toFixed(2)),
      items:            buildExecutionItemsPayload(quotationData.items),
    };

    serviceLogger.log('Creating Purchase Order ->', ENDPOINTS.CREATE_PURCHASE_ORDER);
    const response = await api.post(ENDPOINTS.CREATE_PURCHASE_ORDER, payload);
    serviceLogger.log('Purchase Order created:', { id: response.data?.data?.id });
    return response.data;

  } catch (error) {
    if (error.response?.status === 400) {
      const msg = format400Error(error.response.data);
      serviceLogger.error('createPurchaseOrder 400:', msg);
      throw new Error(`Server error: 400 — ${msg}`);
    }
    const errorMessage = normalizeError(error);
    serviceLogger.error('createPurchaseOrder failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Update an existing Purchase Order.
 * Endpoint: PUT /quotations/update_quotation/
 *
 * @param {Object} payload - Full PO payload (must include id)
 * @returns {Promise<Object>} API response data
 * @throws {Error} If ID is missing or update fails
 */
export const updatePurchaseOrder = async (payload) => {
  if (!payload?.id) throw new Error('Purchase Order ID is required for update');
  try {
    serviceLogger.log(`Updating Purchase Order ${payload.id}...`);
    const response = await api.put(ENDPOINTS.UPDATE_PURCHASE_ORDER, payload);
    serviceLogger.log(`Purchase Order ${payload.id} updated successfully`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 400) {
      const msg = format400Error(error.response.data);
      serviceLogger.error(`updatePurchaseOrder(${payload.id}) 400:`, msg);
      throw new Error(`Server error: 400 — ${msg}`);
    }
    const errorMessage = normalizeError(error);
    serviceLogger.error(`updatePurchaseOrder(${payload.id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// PURCHASE ORDER — PDF
// ============================================================================

/**
 * Generate and download a PDF for a Purchase Order.
 * Endpoint: POST /quotations/generate_pdf/?id=<id>
 *
 * @param {number} id - Purchase Order ID
 * @param {string} [poNumber] - Used as the downloaded filename (optional)
 * @throws {Error} If PDF generation or download fails
 */
export const generatePurchaseOrderPdf = async (id, { company_name = '', address = '', contact_person = '', subject = '', extra_notes = [] } = {}, fileName = null) => {
  if (!id) throw new Error('Purchase Order ID is required');
  try {
    serviceLogger.log(`Generating PDF for purchase order ${id}...`);

    const response = await api.post(
      ENDPOINTS.GENERATE_PDF,
      { id: parseInt(id), company_name, address, contact_person, subject, extra_notes },
      { responseType: 'blob' }
    );

    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    const downloadName = fileName || `PurchaseOrder_${id}.pdf`;
    link.setAttribute('download', downloadName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 5000);

    serviceLogger.log(`PDF downloaded: ${downloadName}`);
  } catch (error) {
    const errorMessage = handleApiError(error) || normalizeError(error);
    serviceLogger.error(`generatePurchaseOrderPdf(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// SUPPORTING LOOKUPS — USED BY PO PAGES
// ============================================================================

/**
 * Fetch all projects with pagination and optional search.
 * Used in the PO create/edit form project selector.
 * Endpoint: GET /projects/get_all_Project/
 *
 * @param {Object} [params] - Query parameters
 * @param {number} [params.page=1]
 * @param {number} [params.page_size=5] - Default 5 for the PO project picker modal
 * @param {string} [params.search]
 * @returns {Promise<Object>} API response with projects list and pagination metadata
 * @throws {Error} If request fails
 */
export const getProjectsForPurchaseOrder = async (params = {}) => {
  try {
    const queryParams = {
      page:      1,
      page_size: 5,
      ...params,
    };

    serviceLogger.log('Fetching projects for purchase order with params:', queryParams);

    const response = await api.get(ENDPOINTS.GET_ALL_PROJECTS, { params: queryParams });

    serviceLogger.log('Projects fetched successfully:', {
      count:       response.data?.data?.results?.length || 0,
      total:       response.data?.data?.total_count    || 0,
      page:        response.data?.data?.page           || 1,
      total_pages: response.data?.data?.total_pages    || 1,
    });

    return response.data;
  } catch (error) {
    const errorMessage = handleApiError(error) || normalizeError(error);
    serviceLogger.error('getProjectsForPurchaseOrder failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Fetch a user by ID.
 * Used by the PO detail view to display the creator's name.
 * Endpoint: GET /users/get_user/?id=<id>
 *
 * @param {number|string} id - User ID
 * @returns {Promise<Object|null>} User data object, or null if not found / on error
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
    // Non-critical — user display name is cosmetic, silently return null
    serviceLogger.error(`getUserById(${id}) failed:`, normalizeError(error));
    return null;
  }
};

/**
 * Fetch all invoices with optional pagination.
 * Used by the PO detail view to check for linked invoices.
 * Endpoint: GET /invoices/get_all_invoices/
 *
 * @param {Object} [params] - Query params (page, page_size, etc.)
 * @returns {Promise<Array>} Array of invoice objects (empty array on error)
 */
export const getAllInvoices = async (params = { page: 1, page_size: 100 }) => {
  try {
    serviceLogger.log('Fetching invoices list...');
    const response = await api.get(ENDPOINTS.GET_ALL_INVOICES, { params });
    return response.data?.data?.results || response.data?.results || [];
  } catch (error) {
    serviceLogger.error('getAllInvoices failed:', normalizeError(error));
    return [];
  }
};

/**
 * Fetch compliance descriptions for a category + optional sub-category.
 * Used by the PO create/edit form to populate the description dropdown.
 * Endpoint: GET /compliance/get_compliance_by_category/
 *
 * @param {number} categoryId - Compliance category ID (5, 6, or 7 for execution)
 * @param {number|null} [subCategoryId] - Sub-compliance ID (null to fetch all)
 * @returns {Promise<Array>} Array of compliance description objects
 * @throws {Error} If categoryId is missing or request fails
 */
export const getComplianceDescriptions = async (categoryId, subCategoryId = null) => {
  try {
    if (!categoryId) throw new Error('Category ID is required');

    serviceLogger.log(`Fetching compliance descriptions for category ${categoryId}`);

    const params = { category: categoryId, page_size: 100 };
    if (subCategoryId) params.sub_category = subCategoryId;

    const response = await api.get(ENDPOINTS.GET_COMPLIANCE_BY_CATEGORY, { params });

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
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  generatePurchaseOrderPdf,
  getProjectsForPurchaseOrder,
  getUserById,
  getAllInvoices,
  getComplianceDescriptions,
};