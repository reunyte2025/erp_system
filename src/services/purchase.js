import api, { handleApiError, normalizeError } from './api';

/**
 * ============================================================================
 * PURCHASE SERVICE - PRODUCTION-READY API LAYER
 * ============================================================================
 * 
 * Service for fetching and managing purchase order related data
 * 
 * @module purchaseService
 * @version 1.0.0
 * @production
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const ENABLE_SERVICE_LOGGING = process.env.NODE_ENV === 'development';

const serviceLogger = {
  log: (...args) => ENABLE_SERVICE_LOGGING && console.log('[Purchase Service]', ...args),
  warn: (...args) => console.warn('[Purchase Service]', ...args),
  error: (...args) => console.error('[Purchase Service]', ...args),
};

// ============================================================================
// API ENDPOINTS
// ============================================================================

const ENDPOINTS = {
  GET_ALL_PROJECTS: '/projects/get_all_Project/',
  GENERATE_PDF: '/quotations/generate_pdf/',
};

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get all projects for purchase order with pagination and search
 * 
 * @param {Object} params - Query parameters
 * @param {number} [params.page=1] - Page number
 * @param {number} [params.page_size=5] - Items per page (default 5 for purchase order modal)
 * @param {string} [params.search] - Search query
 * @returns {Promise<Object>} API response data with projects list and metadata
 * @throws {Error} Normalized error message
 */
export const getProjectsForPurchaseOrder = async (params = {}) => {
  try {
    const queryParams = {
      page: 1,
      page_size: 5, // Default to 5 as per requirements
      ...params,
    };

    serviceLogger.log('Fetching projects for purchase order with params:', queryParams);

    const response = await api.get(ENDPOINTS.GET_ALL_PROJECTS, {
      params: queryParams,
    });

    serviceLogger.log('Projects fetched successfully:', {
      count: response.data?.data?.results?.length || 0,
      total: response.data?.data?.total_count || 0,
      page: response.data?.data?.page || 1,
      total_pages: response.data?.data?.total_pages || 1
    });

    return response.data;
  } catch (error) {
    const errorMessage = handleApiError(error) || normalizeError(error);
    serviceLogger.error('getProjectsForPurchaseOrder failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Generate and download PDF for a Purchase Order
 * Uses the same endpoint as quotation PDF (POs share the quotation model, type=2)
 *
 * @param {number} id - Purchase Order (quotation) ID
 * @param {string} [poNumber] - PO number used as the download filename (optional)
 * @throws {Error} If PDF generation or download fails
 */
export const generatePurchaseOrderPdf = async (id, poNumber) => {
  try {
    if (!id) {
      throw new Error('Purchase Order ID is required');
    }

    serviceLogger.log(`Generating PDF for purchase order ${id}...`);

    const response = await api.post(
      ENDPOINTS.GENERATE_PDF,
      {},
      { params: { id }, responseType: 'blob' }
    );

    // Create blob URL and trigger browser download
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    const downloadName = poNumber ? `${poNumber}.pdf` : `PurchaseOrder_${id}.pdf`;
    link.setAttribute('download', downloadName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Release object URL memory after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    serviceLogger.log(`PDF downloaded: ${downloadName}`);
  } catch (error) {
    const errorMessage = handleApiError(error) || normalizeError(error);
    serviceLogger.error(`generatePurchaseOrderPdf(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getProjectsForPurchaseOrder,
  generatePurchaseOrderPdf,
};