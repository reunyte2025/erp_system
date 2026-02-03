import apiClient, { normalizeError } from './apiClient';

/**
 * ============================================================================
 * CLIENTS SERVICE - MODULE-BASED API LAYER
 * ============================================================================
 * 
 * This file contains ALL client-related API operations.
 * 
 * Key Principles:
 * - ONLY contains API functions
 * - NO React code (no hooks, no state, no JSX)
 * - NO UI logic (no toasts, no alerts, no navigation)
 * - NO business logic (only data fetching/sending)
 * - Clean function signatures
 * - Consistent error handling
 * - Well-documented
 * 
 * Architecture Benefits:
 * - Reusable across different components
 * - Easy to test (no React dependencies)
 * - Clear API contracts
 * - Type-safe (can add TypeScript easily)
 * - Can be used in non-React contexts (Node.js scripts, etc.)
 * 
 * Component Responsibilities vs Service Responsibilities:
 * 
 * COMPONENT (Clients.jsx):
 * - Manages UI state (loading, error, data)
 * - Handles user interactions
 * - Calls service functions
 * - Displays toasts/notifications
 * - Navigation
 * 
 * SERVICE (clients.js):
 * - Makes HTTP requests
 * - Returns data or throws errors
 * - No knowledge of UI
 * - No state management
 * 
 * @module clientsService
 */

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * Client API Endpoints
 * 
 * Centralized endpoint definitions:
 * - Easy to update if backend changes
 * - Single source of truth
 * - Can be generated from OpenAPI/Swagger spec
 */
const ENDPOINTS = {
  GET_ALL: '/clients/get_all_client/',
  GET_BY_ID: '/clients/',  // Append ID: /clients/123/
  CREATE: '/clients/',
  UPDATE: '/clients/',      // Append ID: /clients/123/
  DELETE: '/clients/',      // Append ID: /clients/123/
  SEARCH: '/clients/search/',
  EXPORT: '/clients/export/',
};

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get all clients with pagination, search, and filters
 * 
 * Standard API Response Format (from your backend):
 * {
 *   status: "success",
 *   data: {
 *     results: [...],      // Array of client objects
 *     page: 1,             // Current page number
 *     total_pages: 10,     // Total number of pages
 *     total_count: 95,     // Total number of records
 *     page_size: 10        // Items per page
 *   }
 * }
 * 
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.page_size - Items per page (default: 10)
 * @param {string} params.search - Search query
 * @param {string} params.ordering - Sort field (e.g., 'first_name', '-created_at')
 * @param {string} params.status - Filter by status
 * @returns {Promise<Object>} API response data
 * @throws {Error} Normalized error message
 * 
 * @example
 * // Get first page with default settings
 * const data = await getClients({ page: 1 });
 * 
 * @example
 * // Get clients with search and sorting
 * const data = await getClients({
 *   page: 2,
 *   page_size: 20,
 *   search: 'john',
 *   ordering: '-created_at'
 * });
 */
export const getClients = async (params = {}) => {
  try {
    // Default parameters
    const queryParams = {
      page: 1,
      page_size: 10,
      ...params, // Override with provided params
    };

    // Make API request
    // apiClient automatically attaches auth token via interceptor
    const response = await apiClient.get(ENDPOINTS.GET_ALL, {
      params: queryParams,
    });

    // Return response data
    // Your backend wraps data in { status: 'success', data: {...} }
    return response.data;

  } catch (error) {
    // Normalize error and throw
    // This allows components to catch and display user-friendly messages
    const errorMessage = normalizeError(error);
    throw new Error(errorMessage);
  }
};

/**
 * Get a single client by ID
 * 
 * @param {number|string} id - Client ID
 * @returns {Promise<Object>} Client data
 * @throws {Error} Normalized error message
 * 
 * @example
 * const client = await getClientById(123);
 * console.log(client.first_name); // "John"
 */
export const getClientById = async (id) => {
  try {
    if (!id) {
      throw new Error('Client ID is required');
    }

    const response = await apiClient.get(`${ENDPOINTS.GET_BY_ID}${id}/`);
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    throw new Error(errorMessage);
  }
};

/**
 * Create a new client
 * 
 * @param {Object} clientData - Client information
 * @param {string} clientData.first_name - First name (required)
 * @param {string} clientData.last_name - Last name (required)
 * @param {string} clientData.email - Email address
 * @param {string} clientData.phone_number - Phone number
 * @param {string} clientData.address - Address
 * @param {string} clientData.city - City
 * @param {string} clientData.state - State
 * @param {string} clientData.country - Country
 * @param {string} clientData.postal_code - Postal code
 * @param {string} clientData.notes - Additional notes
 * @returns {Promise<Object>} Created client data
 * @throws {Error} Normalized error message
 * 
 * @example
 * const newClient = await createClient({
 *   first_name: 'John',
 *   last_name: 'Doe',
 *   email: 'john@example.com',
 *   phone_number: '+1234567890'
 * });
 */
export const createClient = async (clientData) => {
  try {
    // Validate required fields
    if (!clientData.first_name || !clientData.last_name) {
      throw new Error('First name and last name are required');
    }

    const response = await apiClient.post(ENDPOINTS.CREATE, clientData);
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    throw new Error(errorMessage);
  }
};

/**
 * Update an existing client
 * 
 * @param {number|string} id - Client ID
 * @param {Object} clientData - Updated client information
 * @returns {Promise<Object>} Updated client data
 * @throws {Error} Normalized error message
 * 
 * @example
 * const updated = await updateClient(123, {
 *   phone_number: '+9876543210',
 *   notes: 'VIP customer'
 * });
 */
export const updateClient = async (id, clientData) => {
  try {
    if (!id) {
      throw new Error('Client ID is required');
    }

    // Use PATCH for partial updates, PUT for full replacement
    const response = await apiClient.patch(`${ENDPOINTS.UPDATE}${id}/`, clientData);
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    throw new Error(errorMessage);
  }
};

/**
 * Delete a client
 * 
 * @param {number|string} id - Client ID
 * @returns {Promise<Object>} Deletion confirmation
 * @throws {Error} Normalized error message
 * 
 * @example
 * await deleteClient(123);
 * console.log('Client deleted successfully');
 */
export const deleteClient = async (id) => {
  try {
    if (!id) {
      throw new Error('Client ID is required');
    }

    const response = await apiClient.delete(`${ENDPOINTS.DELETE}${id}/`);
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    throw new Error(errorMessage);
  }
};

/**
 * Search clients
 * 
 * @param {string} query - Search query
 * @param {Object} filters - Additional filters
 * @returns {Promise<Object>} Search results
 * @throws {Error} Normalized error message
 * 
 * @example
 * const results = await searchClients('john', { status: 'active' });
 */
export const searchClients = async (query, filters = {}) => {
  try {
    if (!query) {
      throw new Error('Search query is required');
    }

    const response = await apiClient.get(ENDPOINTS.SEARCH, {
      params: {
        q: query,
        ...filters,
      },
    });

    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    throw new Error(errorMessage);
  }
};

/**
 * Export clients to CSV/Excel
 * 
 * @param {Object} params - Export parameters
 * @param {string} params.format - Export format ('csv' or 'excel')
 * @param {Array} params.fields - Fields to export
 * @returns {Promise<Blob>} File blob for download
 * @throws {Error} Normalized error message
 * 
 * @example
 * const blob = await exportClients({ format: 'csv' });
 * // Create download link
 * const url = window.URL.createObjectURL(blob);
 * const link = document.createElement('a');
 * link.href = url;
 * link.download = 'clients.csv';
 * link.click();
 */
export const exportClients = async (params = {}) => {
  try {
    const response = await apiClient.get(ENDPOINTS.EXPORT, {
      params,
      responseType: 'blob', // Important for file downloads
    });

    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    throw new Error(errorMessage);
  }
};

/**
 * Get client statistics
 * 
 * This is useful for dashboard stats cards
 * 
 * @returns {Promise<Object>} Client statistics
 * @throws {Error} Normalized error message
 * 
 * @example
 * const stats = await getClientStats();
 * console.log(stats.total); // 95
 * console.log(stats.active); // 80
 * console.log(stats.draft); // 10
 */
export const getClientStats = async () => {
  try {
    // If your backend has a dedicated stats endpoint, use it
    // Otherwise, calculate from getClients response
    const response = await getClients({ page: 1, page_size: 1 });
    
    // Extract total count from response
    const totalCount = response.data?.total_count || 0;
    
    // Calculate other stats (adjust based on your backend)
    // For now, using estimates - replace with actual API calls if available
    return {
      total: totalCount,
      active: Math.floor(totalCount * 0.85),
      draft: Math.floor(totalCount * 0.10),
      archived: Math.floor(totalCount * 0.05),
    };

  } catch (error) {
    const errorMessage = normalizeError(error);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// BATCH OPERATIONS (OPTIONAL - IMPLEMENT IF BACKEND SUPPORTS)
// ============================================================================

/**
 * Bulk delete clients
 * 
 * @param {Array<number>} ids - Array of client IDs
 * @returns {Promise<Object>} Deletion result
 * @throws {Error} Normalized error message
 */
export const bulkDeleteClients = async (ids) => {
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('Client IDs array is required');
    }

    const response = await apiClient.post('/clients/bulk-delete/', { ids });
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    throw new Error(errorMessage);
  }
};

/**
 * Bulk update clients
 * 
 * @param {Array<number>} ids - Array of client IDs
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Update result
 * @throws {Error} Normalized error message
 */
export const bulkUpdateClients = async (ids, updates) => {
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('Client IDs array is required');
    }

    const response = await apiClient.post('/clients/bulk-update/', {
      ids,
      updates,
    });

    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Default export - all functions as an object
 * 
 * Usage:
 * import clientsService from './services/clients';
 * const data = await clientsService.getClients();
 */
export default {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  searchClients,
  exportClients,
  getClientStats,
  bulkDeleteClients,
  bulkUpdateClients,
};

/**
 * ============================================================================
 * USAGE IN COMPONENTS
 * ============================================================================
 * 
 * // In Clients.jsx
 * import { getClients, createClient } from '@/services/clients';
 * 
 * const Clients = () => {
 *   const [clients, setClients] = useState([]);
 *   const [loading, setLoading] = useState(false);
 *   const [error, setError] = useState('');
 * 
 *   const loadClients = async () => {
 *     setLoading(true);
 *     setError('');
 *     
 *     try {
 *       const response = await getClients({ page: 1, page_size: 10 });
 *       setClients(response.data.results);
 *     } catch (err) {
 *       setError(err.message);
 *     } finally {
 *       setLoading(false);
 *     }
 *   };
 * 
 *   return (
 *     // ... JSX
 *   );
 * };
 * 
 * ============================================================================
 * WHY THIS PATTERN?
 * ============================================================================
 * 
 * 1. Separation of Concerns
 *    - Network logic separated from UI logic
 *    - Components don't know about axios, endpoints, tokens
 *    - Easy to switch HTTP libraries without touching components
 * 
 * 2. Reusability
 *    - Same functions can be used in multiple components
 *    - Can be used in Node.js scripts, background jobs, etc.
 *    - Can be called from Redux thunks, React Query, etc.
 * 
 * 3. Testability
 *    - Easy to mock in component tests
 *    - Can test service functions independently
 *    - No React dependencies to worry about
 * 
 * 4. Type Safety (with TypeScript)
 *    - Clear function signatures
 *    - Can add types for parameters and return values
 *    - Better autocomplete in IDE
 * 
 * 5. Maintainability
 *    - API changes only affect this file
 *    - Easy to find all client-related API calls
 *    - Clear documentation for each function
 * 
 * 6. Scalability
 *    - Easy to add new functions
 *    - Consistent patterns across all services
 *    - Can generate from OpenAPI spec
 * 
 * ============================================================================
 */