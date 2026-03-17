import api, { handleApiError, normalizeError } from './api';

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

const ENABLE_SERVICE_LOGGING = process.env.NODE_ENV === 'development';

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
  GET_BY_ID: '/projects/',
  CREATE: '/projects/create_Project/',
  UPDATE: '/projects/',
  DELETE: '/projects/',
  GET_ALL_USERS: '/users/get_all_users/',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Clean payload by removing empty, null, or undefined values
 * This prevents sending unnecessary fields to the API
 */
const cleanPayload = (data) => {
  const cleaned = {};
  
  Object.entries(data).forEach(([key, value]) => {
    // Only include non-empty values
    if (value !== null && value !== undefined && value !== '') {
      // Trim strings
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          cleaned[key] = trimmed;
        }
      } else {
        cleaned[key] = value;
      }
    }
  });
  
  return cleaned;
};

/**
 * Validate project data before submission
 */
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
    const errorMessage = handleApiError(error) || normalizeError(error);
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

    const response = await api.get(`${ENDPOINTS.GET_BY_ID}${id}/`);
    
    serviceLogger.log('Project fetched:', response.data);
    
    return response.data;
  } catch (error) {
    const errorMessage = handleApiError(error) || normalizeError(error);
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

    // is_draft - required by API, defaults to false
    payload.is_draft = projectData.is_draft === true || projectData.is_draft === 'true';

    serviceLogger.log('Cleaned payload for API:', JSON.stringify(payload, null, 2));
    serviceLogger.log('Payload fields:', Object.keys(payload));
    serviceLogger.log('Sending POST request to:', ENDPOINTS.CREATE);

    // Step 3: Make API request
    const response = await api.post(ENDPOINTS.CREATE, payload);
    
    serviceLogger.log('✅ Project created successfully:', response.data);

    return response.data;
    
  } catch (error) {
    // Enhanced error logging
    serviceLogger.error('❌ createProject failed');
    serviceLogger.error('Error type:', error.constructor.name);
    serviceLogger.error('Error message:', error.message);
    
    if (error.response) {
      serviceLogger.error('API Response Status:', error.response.status);
      serviceLogger.error('API Response Data:', JSON.stringify(error.response.data, null, 2));
      serviceLogger.error('API Response Headers:', error.response.headers);
    }
    
    if (error.request) {
      serviceLogger.error('Request made but no response received');
    }
    
    const errorMessage = handleApiError(error) || normalizeError(error);
    serviceLogger.error('Final error message:', errorMessage);
    
    throw new Error(errorMessage);
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

    // Clean the payload - remove empty values
    const payload = cleanPayload(projectData);
    
    // Convert client_id to integer if present
    if (payload.client_id) {
      payload.client_id = parseInt(payload.client_id, 10);
    }

    serviceLogger.log(`Updating project ${id} with payload:`, JSON.stringify(payload, null, 2));

    const response = await api.patch(`${ENDPOINTS.UPDATE}${id}/`, payload);
    
    serviceLogger.log('Project updated successfully:', response.data);

    return response.data;
  } catch (error) {
    const errorMessage = handleApiError(error) || normalizeError(error);
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

    const response = await api.delete(`${ENDPOINTS.DELETE}${id}/`);
    
    serviceLogger.log('Project deleted successfully');

    return response.data;
  } catch (error) {
    const errorMessage = handleApiError(error) || normalizeError(error);
    serviceLogger.error(`deleteProject(${id}) failed:`, errorMessage);
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
    const errorMessage = handleApiError(error) || normalizeError(error);
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
    const errorMessage = handleApiError(error) || normalizeError(error);
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
  getProjectStats,
  getUsers,
};