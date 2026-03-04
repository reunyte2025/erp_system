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

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getProjectsForPurchaseOrder,
};