import apiClient, { normalizeError } from './apiClient';

/**
 * ============================================================================
 * PROJECTS SERVICE - MODULE-BASED API LAYER
 * ============================================================================
 * 
 * This file contains ALL project-related API operations.
 * 
 * @module projectsService
 */

// ============================================================================
// API ENDPOINTS
// ============================================================================

const ENDPOINTS = {
  GET_ALL: '/projects/get_all_Project/',
  GET_BY_ID: '/projects/',
  CREATE: '/projects/create_Project/',
  UPDATE: '/projects/',
  DELETE: '/projects/',
};

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get all projects with pagination
 * 
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.page_size - Items per page
 * @param {string} params.search - Search query
 * @returns {Promise<Object>} API response data
 * @throws {Error} Normalized error message
 */
export const getProjects = async (params = {}) => {
  try {
    const queryParams = {
      page: 1,
      page_size: 10,
      ...params,
    };

    const response = await apiClient.get(ENDPOINTS.GET_ALL, {
      params: queryParams,
    });

    return response.data;
  } catch (error) {
    const errorMessage = normalizeError(error);
    throw new Error(errorMessage);
  }
};

/**
 * Get a single project by ID
 * 
 * @param {number|string} id - Project ID
 * @returns {Promise<Object>} Project data
 * @throws {Error} Normalized error message
 */
export const getProjectById = async (id) => {
  try {
    if (!id) {
      throw new Error('Project ID is required');
    }

    const response = await apiClient.get(`${ENDPOINTS.GET_BY_ID}${id}/`);
    return response.data;
  } catch (error) {
    const errorMessage = normalizeError(error);
    throw new Error(errorMessage);
  }
};

/**
 * Create a new project
 * 
 * @param {Object} projectData - Project information
 * @param {string} projectData.name - Project name (required)
 * @param {string} projectData.servey_number - Survey number
 * @param {string} projectData.address - Address
 * @param {string} projectData.city - City
 * @param {string} projectData.state - State
 * @param {string} projectData.pincode - Postal code
 * @param {number} projectData.client_id - Client ID
 * @param {string} projectData.start_date - Start date
 * @param {string} projectData.end_date - End date
 * @param {string} projectData.description - Description
 * @returns {Promise<Object>} Created project data
 * @throws {Error} Normalized error message
 */
export const createProject = async (projectData) => {
  try {
    if (!projectData.name || !projectData.name.trim()) {
      throw new Error('Project name is required');
    }

    // Build payload with only provided fields
    const payload = {
      name: projectData.name,
    };

    if (projectData.servey_number) payload.servey_number = projectData.servey_number;
    if (projectData.address) payload.address = projectData.address;
    if (projectData.city) payload.city = projectData.city;
    if (projectData.state) payload.state = projectData.state;
    if (projectData.pincode) payload.pincode = projectData.pincode;
    if (projectData.client_id) payload.client_id = parseInt(projectData.client_id);
    if (projectData.start_date) payload.start_date = projectData.start_date;
    if (projectData.end_date) payload.end_date = projectData.end_date;
    if (projectData.description) payload.description = projectData.description;

    console.log('🚀 Creating project with payload:', JSON.stringify(payload, null, 2));

    const response = await apiClient.post(ENDPOINTS.CREATE, payload);
    return response.data;
  } catch (error) {
    const errorMessage = normalizeError(error);
    throw new Error(errorMessage);
  }
};

/**
 * Update an existing project
 * 
 * @param {number|string} id - Project ID
 * @param {Object} projectData - Updated project information
 * @returns {Promise<Object>} Updated project data
 * @throws {Error} Normalized error message
 */
export const updateProject = async (id, projectData) => {
  try {
    if (!id) {
      throw new Error('Project ID is required');
    }

    const response = await apiClient.patch(`${ENDPOINTS.UPDATE}${id}/`, projectData);
    return response.data;
  } catch (error) {
    const errorMessage = normalizeError(error);
    throw new Error(errorMessage);
  }
};

/**
 * Delete a project
 * 
 * @param {number|string} id - Project ID
 * @returns {Promise<Object>} Deletion confirmation
 * @throws {Error} Normalized error message
 */
export const deleteProject = async (id) => {
  try {
    if (!id) {
      throw new Error('Project ID is required');
    }

    const response = await apiClient.delete(`${ENDPOINTS.DELETE}${id}/`);
    return response.data;
  } catch (error) {
    const errorMessage = normalizeError(error);
    throw new Error(errorMessage);
  }
};

/**
 * Get project statistics
 * 
 * @returns {Promise<Object>} Project statistics
 * @throws {Error} Normalized error message
 */
export const getProjectStats = async () => {
  try {
    const response = await getProjects({ page: 1, page_size: 1 });
    
    const totalCount = response.data?.total_count || 0;
    
    return {
      total: totalCount,
      onHold: 0,
      active: 0,
      completed: 0,
    };
  } catch (error) {
    const errorMessage = normalizeError(error);
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
};