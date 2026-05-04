import api from './api';

/**
 * ============================================================================
 * PROJECTS SERVICE - PRODUCTION-READY API LAYER
 * ============================================================================
 * 
 * Enhanced with better error handling, payload validation, and debugging
 * 
 * @module projectsService
 * @version 2.0.0
 * @production
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const ENABLE_SERVICE_LOGGING = import.meta.env.MODE === 'development';

const serviceLogger = {
  log: (...args) => ENABLE_SERVICE_LOGGING && console.log('[Projects Service]', ...args),
  warn: (...args) => console.warn('[Projects Service]', ...args),
  error: (...args) => console.error('[Projects Service]', ...args),
};

// ============================================================================
// API ENDPOINTS
// ============================================================================

const ENDPOINTS = {
  GET_ALL: '/projects/get_all_Project/',
  GET_BY_ID: '/projects/get_Project/',
  CREATE: '/projects/create_Project/',
  UPDATE: '/projects/update_Project/',
  DELETE: '/projects/delete_Project/',
  UNDO: '/projects/undo_Project/',
  GET_ALL_USERS: '/users/get_all_users/',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Parse API errors into user-friendly messages.
 *
 * Handles three error shapes from the backend:
 *   1. Field-level validation errors:  { errors: { field: ["msg"] } }
 *   2. Non-field / detail errors:      { errors: { non_field_errors: ["msg"] } }
 *                                       { detail: "msg" }
 *   3. Generic message string:         { message: "msg" }
 *
 * Falls back to `fallback` when none of the above are present.
 */
const parseApiError = (error, fallback = 'Something went wrong. Please try again.') => {
  // Network / no-response errors
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return 'Request timed out. Please check your connection and try again.';
    }
    if (error.message === 'Network Error') {
      return 'Unable to reach the server. Please check your internet connection.';
    }
    return fallback;
  }

  const { status, data } = error.response;

  // Map HTTP status codes to friendly messages first
  const statusMessages = {
    401: 'Your session has expired. Please log in again.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: 'A conflict occurred. This record may already exist.',
    413: 'The data you submitted is too large.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'An internal server error occurred. Please try again later.',
    502: 'Server is temporarily unavailable. Please try again later.',
    503: 'Service is under maintenance. Please try again later.',
  };

  // Parse field-level / structured errors from response body
  if (data) {
    // Shape: { errors: { field: ["msg", ...], ... } }
    if (data.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
      const fieldLabels = {
        name: 'Project name',
        assigned_user_id: 'Assigned user',
        client_id: 'Client',
        cts_number: 'CTS number',
        address: 'Address',
        city: 'City',
        state: 'State',
        pincode: 'Pincode',
        start_date: 'Start date',
        end_date: 'End date',
        description: 'Description',
        is_draft: null, // internal field — suppress from user-facing messages
      };

      const messages = [];
      Object.entries(data.errors).forEach(([field, msgs]) => {
        if (field === 'non_field_errors') {
          // Non-field errors shown as-is
          const list = Array.isArray(msgs) ? msgs : [msgs];
          messages.push(...list);
        } else {
          const label = field in fieldLabels ? fieldLabels[field] : null;
          if (label === null) return; // suppress internal/irrelevant fields
          const displayLabel = label || field.replace(/_/g, ' ');
          const list = Array.isArray(msgs) ? msgs : [String(msgs)];
          messages.push(`${displayLabel}: ${list[0]}`);
        }
      });

      if (messages.length > 0) {
        return messages.join(' • ');
      }
    }

    // Shape: { detail: "msg" }
    if (data.detail && typeof data.detail === 'string') {
      return data.detail;
    }

    // Shape: { message: "msg" }
    if (data.message && typeof data.message === 'string') {
      return data.message;
    }

    // Shape: { errors: "string" }
    if (typeof data.errors === 'string') {
      return data.errors;
    }
  }

  // Fall back to HTTP-status message or generic fallback
  return statusMessages[status] || fallback;
};


const validateProjectData = (data) => {
  const errors = [];
  
  // Required fields
  if (!data.name || !data.name.trim()) {
    errors.push('Project name is required');
  }

  if (!data.assigned_user_id) {
    errors.push('Assigned user is required');
  }
  
  // Optional: validate date formats if provided
  if (data.start_date && !isValidDate(data.start_date)) {
    errors.push('Invalid start date format (expected YYYY-MM-DD)');
  }
  
  if (data.end_date && !isValidDate(data.end_date)) {
    errors.push('Invalid end date format (expected YYYY-MM-DD)');
  }
  
  // Optional: validate date logic
  if (data.start_date && data.end_date) {
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    if (end < start) {
      errors.push('End date cannot be before start date');
    }
  }
  
  return errors;
};

/**
 * Check if date string is valid YYYY-MM-DD format
 */
const isValidDate = (dateString) => {
  if (!dateString) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get all projects with pagination
 * 
 * @param {Object} params - Query parameters
 * @param {number} [params.page=1] - Page number
 * @param {number} [params.page_size=100] - Items per page
 * @param {string} [params.search] - Search query
 * @returns {Promise<Object>} API response data with projects list and metadata
 * @throws {Error} Normalized error message
 */
export const getProjects = async (params = {}) => {
  try {
    const queryParams = {
      page: 1,
      page_size: 100,
      ...params,
    };

    serviceLogger.log('Fetching projects with params:', queryParams);

    const response = await api.get(ENDPOINTS.GET_ALL, {
      params: queryParams,
    });

    serviceLogger.log('Projects fetched successfully:', {
      count: response.data?.data?.results?.length || 0,
      total: response.data?.data?.total_count || 0
    });

    return response.data;
  } catch (error) {
    const errorMessage = parseApiError(error, 'Failed to load projects. Please try again.');
    serviceLogger.error('getProjects failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Get a single project by ID
 * 
 * @param {number|string} id - Project ID
 * @returns {Promise<Object>} Project data
 * @throws {Error} Normalized error message if ID is missing or request fails
 */
export const getProjectById = async (id) => {
  try {
    if (!id) {
      throw new Error('Project ID is required');
    }

    serviceLogger.log(`Fetching project ${id}`);

    const response = await api.get(ENDPOINTS.GET_BY_ID, {
      params: { id },
    });
    
    serviceLogger.log('Project fetched:', response.data);
    
    return response.data;
  } catch (error) {
    const errorMessage = parseApiError(error, 'Failed to load project details. Please try again.');
    serviceLogger.error(`getProjectById(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Create a new project - PRODUCTION READY VERSION
 * 
 * @param {Object} projectData - Project information
 * @param {string} projectData.name - Project name (required)
 * @param {string} [projectData.cts_number] - CTS number
 * @param {string} [projectData.address] - Address
 * @param {string} [projectData.city] - City
 * @param {string} [projectData.state] - State
 * @param {string} [projectData.pincode] - Postal code
 * @param {number|string} [projectData.client_id] - Client ID
 * @param {string} [projectData.start_date] - Start date (YYYY-MM-DD format)
 * @param {string} [projectData.end_date] - End date (YYYY-MM-DD format)
 * @param {string} [projectData.description] - Project description
 * @returns {Promise<Object>} Created project data
 * @throws {Error} Normalized error message if validation fails or request fails
 */
export const createProject = async (projectData) => {
  try {
    serviceLogger.log('Creating project with raw data:', projectData);
    
    // Step 1: Validate input data
    const validationErrors = validateProjectData(projectData);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(', '));
    }

    // Step 2: Build clean payload - only include fields with actual values
    const payload = {};
    
    // Required field
    payload.name = projectData.name.trim();
    
    // Optional fields - only include if provided and not empty
    if (projectData.cts_number?.trim()) {
      payload.cts_number = projectData.cts_number.trim();
    }
    
    if (projectData.address?.trim()) {
      payload.address = projectData.address.trim();
    }
    
    if (projectData.city?.trim()) {
      payload.city = projectData.city.trim();
    }
    
    if (projectData.state?.trim()) {
      payload.state = projectData.state.trim();
    }
    
    if (projectData.pincode?.trim()) {
      payload.pincode = projectData.pincode.trim();
    }
    
    // Client ID - handle both string and number, but only if provided
    if (projectData.client_id) {
      const clientId = parseInt(projectData.client_id, 10);
      if (!isNaN(clientId) && clientId > 0) {
        payload.client_id = clientId;
      }
    }
    
    // Dates - only include if provided and valid
    if (projectData.start_date?.trim()) {
      payload.start_date = projectData.start_date.trim();
    }
    
    if (projectData.end_date?.trim()) {
      payload.end_date = projectData.end_date.trim();
    }
    
    if (projectData.description?.trim()) {
      payload.description = projectData.description.trim();
    }

    // assigned_user_id - required by API
    if (projectData.assigned_user_id) {
      const userId = parseInt(projectData.assigned_user_id, 10);
      if (!isNaN(userId) && userId > 0) {
        payload.assigned_user_id = userId;
      }
    }

    // is_draft - always false; field is required by the API
    payload.is_draft = false;

    serviceLogger.log('Cleaned payload for API:', JSON.stringify(payload, null, 2));
    serviceLogger.log('Payload fields:', Object.keys(payload));
    serviceLogger.log('Sending POST request to:', ENDPOINTS.CREATE);

    // Step 3: Make API request
    const response = await api.post(ENDPOINTS.CREATE, payload);
    
    serviceLogger.log('✅ Project created successfully:', response.data);

    return response.data;
    
  } catch (error) {
    serviceLogger.error('❌ createProject failed:', error.message);
    if (error.response) {
      serviceLogger.error('API Response Status:', error.response.status);
      serviceLogger.error('API Response Data:', JSON.stringify(error.response.data, null, 2));
    }
    throw new Error(parseApiError(error, 'Failed to create project. Please try again.'));
  }
};

/**
 * Update an existing project
 * 
 * @param {number|string} id - Project ID
 * @param {Object} projectData - Updated project information (partial updates supported)
 * @returns {Promise<Object>} Updated project data
 * @throws {Error} Normalized error message if ID is missing or request fails
 */
export const updateProject = async (id, projectData) => {
  try {
    if (!id) {
      throw new Error('Project ID is required');
    }

    const payload = {
      id: Number(id),
      name: projectData.name?.trim() || '',
      cts_number: projectData.cts_number?.trim() || '',
      address: projectData.address?.trim() || '',
      city: projectData.city?.trim() || '',
      state: projectData.state?.trim() || '',
      pincode: projectData.pincode?.trim() || '',
    };

    serviceLogger.log(`Updating project ${id} with payload:`, JSON.stringify(payload, null, 2));

    const response = await api.put(ENDPOINTS.UPDATE, payload);
    
    serviceLogger.log('Project updated successfully:', response.data);

    return response.data;
  } catch (error) {
    const errorMessage = parseApiError(error, 'Failed to update project. Please try again.');
    serviceLogger.error(`updateProject(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Delete a project
 * 
 * @param {number|string} id - Project ID
 * @returns {Promise<Object>} Deletion confirmation
 * @throws {Error} Normalized error message if ID is missing or request fails
 */
export const deleteProject = async (id) => {
  try {
    if (!id) {
      throw new Error('Project ID is required');
    }

    serviceLogger.log(`Deleting project ${id}`);

    const response = await api.delete(ENDPOINTS.DELETE, {
      params: { id },
      validateStatus: (status) => status >= 200 && status < 300,
    });
    
    serviceLogger.log('Project deleted successfully');

    return response.data;
  } catch (error) {
    const errorMessage = parseApiError(error, 'Failed to delete project. Please try again.');
    serviceLogger.error(`deleteProject(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Restore a deleted project
 *
 * @param {number|string} id - Project ID
 * @returns {Promise<Object>} Restore confirmation
 * @throws {Error} Normalized error message if ID is missing or request fails
 */
export const undoProject = async (id) => {
  try {
    if (!id) {
      throw new Error('Project ID is required');
    }

    serviceLogger.log(`Restoring project ${id}`);

    const response = await api.delete(ENDPOINTS.UNDO, {
      params: { id },
      validateStatus: (status) => status >= 200 && status < 300,
    });

    serviceLogger.log('Project restored successfully');

    return response.data;
  } catch (error) {
    const errorMessage = parseApiError(error, 'Failed to restore project. Please try again.');
    serviceLogger.error(`undoProject(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Get project statistics
 * 
 * @returns {Promise<Object>} Project statistics including total, onHold, active, and completed counts
 * @throws {Error} Normalized error message if request fails
 */
export const getProjectStats = async () => {
  try {
    serviceLogger.log('Fetching project statistics');

    const response = await getProjects({ page: 1, page_size: 1 });
    
    const totalCount = response.data?.total_count || response.total_count || 0;
    
    const stats = {
      total: totalCount,
      onHold: 0,      // TODO: Implement status-based counting when backend supports it
      active: 0,      // TODO: Implement status-based counting when backend supports it
      completed: 0,   // TODO: Implement status-based counting when backend supports it
    };

    serviceLogger.log('Project statistics:', stats);

    return stats;
  } catch (error) {
    const errorMessage = parseApiError(error, 'Failed to load project statistics.');
    serviceLogger.error('getProjectStats failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Get all users for assignment dropdown
 *
 * @param {Object} params - Query parameters
 * @param {number} [params.page=1] - Page number
 * @param {number} [params.page_size=100] - Items per page
 * @returns {Promise<Object>} API response data with users list
 * @throws {Error} Normalized error message
 */
export const getUsers = async (params = {}) => {
  try {
    const queryParams = {
      page: 1,
      page_size: 100,
      ...params,
    };

    serviceLogger.log('Fetching users with params:', queryParams);

    const response = await api.get(ENDPOINTS.GET_ALL_USERS, {
      params: queryParams,
    });

    serviceLogger.log('Users fetched successfully:', {
      count: response.data?.data?.results?.length || 0,
    });

    return response.data;
  } catch (error) {
    const errorMessage = parseApiError(error, 'Failed to load users. Please try again.');
    serviceLogger.error('getUsers failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  undoProject,
  getProjectStats,
  getUsers,
};
