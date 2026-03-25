import api, { normalizeError } from './api';

/**
 * ============================================================================
 * USERS & ROLES SERVICE
 * ============================================================================
 * Handles all API calls for User Management and Role Management.
 * Follows the same pattern as vendors.js, clients.js, invoices.js.
 */

const ENABLE_SERVICE_LOGGING = false;

const serviceLogger = {
  log: (...args) => ENABLE_SERVICE_LOGGING && console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

// ============================================================================
// ENDPOINTS
// ============================================================================

const USER_ENDPOINTS = {
  GET_ALL: '/users/get_all_users/',
  GET_BY_ID: '/users/get_user/',         // query param: ?id=
  CREATE: '/users/create_user/',
  UPDATE: '/users/update_user/',         // PUT with id in body
  DELETE: '/users/delete_user/',         // DELETE ?id=
};

const ROLE_ENDPOINTS = {
  GET_ALL: '/roles/get_all_roles/',
  GET_BY_ID: '/roles/get_role/',         // query param: ?id=
  CREATE: '/roles/create_role/',
  UPDATE: '/roles/update_role/',         // PUT with id in body
  DELETE: '/roles/delete_role/',         // DELETE ?id=
};

// ============================================================================
// USER API FUNCTIONS
// ============================================================================

/**
 * Get all users with pagination, search and sort.
 * @param {Object} params - { page, page_size, search, sort_by, sort_order }
 */
export const getUsers = async (params = {}) => {
  try {
    const queryParams = { page: 1, page_size: 10, ...params };
    serviceLogger.log('[Users Service] Fetching users:', queryParams);
    const response = await api.get(USER_ENDPOINTS.GET_ALL, { params: queryParams });
    return response.data;
  } catch (error) {
    const msg = normalizeError(error);
    serviceLogger.error('[Users Service] getUsers failed:', msg);
    throw new Error(msg);
  }
};

/**
 * Get a single user by ID.
 * @param {number} id
 */
export const getUserById = async (id) => {
  try {
    if (!id) throw new Error('User ID is required');
    const response = await api.get(USER_ENDPOINTS.GET_BY_ID, { params: { id } });
    return response.data;
  } catch (error) {
    const msg = normalizeError(error);
    serviceLogger.error(`[Users Service] getUserById(${id}) failed:`, msg);
    throw new Error(msg);
  }
};

/**
 * Create a new user.
 * @param {Object} userData - { username, email, first_name, last_name, password, confirm_password, role_name }
 */
export const createUser = async (userData) => {
  try {
    serviceLogger.log('[Users Service] Creating user:', userData);

    if (!userData.username?.trim())        throw new Error('Username is required');
    if (!userData.email?.trim())           throw new Error('Email is required');
    if (!userData.first_name?.trim())      throw new Error('First name is required');
    if (!userData.last_name?.trim())       throw new Error('Last name is required');
    if (!userData.password?.trim())        throw new Error('Password is required');
    if (!userData.confirm_password?.trim()) throw new Error('Confirm password is required');
    if (userData.password !== userData.confirm_password) throw new Error('Passwords do not match');
    if (!userData.role_name?.trim())       throw new Error('Role is required');

    const payload = {
      username:         userData.username.trim(),
      email:            userData.email.trim().toLowerCase(),
      first_name:       userData.first_name.trim(),
      last_name:        userData.last_name.trim(),
      password:         userData.password,
      confirm_password: userData.confirm_password,
      role_name:        userData.role_name.trim(),
    };

    const response = await api.post(USER_ENDPOINTS.CREATE, payload);
    return response.data;
  } catch (error) {
    if (error.response?.status === 400) {
      const d = error.response?.data;
      const msg = d?.message || d?.error || d?.detail || JSON.stringify(d);
      throw new Error(`Validation Error: ${msg}`);
    }
    if (error.message) throw error;
    throw new Error(normalizeError(error));
  }
};

/**
 * Update an existing user (email, first_name, last_name only — no password/role).
 * @param {Object} userData - { id, email, first_name, last_name }
 */
export const updateUser = async (userData) => {
  try {
    if (!userData.id) throw new Error('User ID is required');

    const payload = {
      id:         Number(userData.id),
      email:      userData.email?.trim().toLowerCase() || '',
      first_name: userData.first_name?.trim()          || '',
      last_name:  userData.last_name?.trim()           || '',
    };

    serviceLogger.log('[Users Service] Updating user:', payload);
    const response = await api.put(USER_ENDPOINTS.UPDATE, payload);
    return response.data;
  } catch (error) {
    if (error.response?.status === 400) {
      const d = error.response?.data;
      throw new Error(d?.message || d?.error || d?.detail || JSON.stringify(d));
    }
    const msg = normalizeError(error);
    serviceLogger.error(`[Users Service] updateUser failed:`, msg);
    throw new Error(msg);
  }
};

/**
 * Delete a user by ID.
 * @param {number} id
 */
export const deleteUser = async (id) => {
  try {
    if (!id) throw new Error('User ID is required');
    serviceLogger.log(`[Users Service] Deleting user ID: ${id}`);
    const response = await api.delete(USER_ENDPOINTS.DELETE, { params: { id } });
    return response.data;
  } catch (error) {
    const msg = normalizeError(error);
    serviceLogger.error(`[Users Service] deleteUser(${id}) failed:`, msg);
    throw new Error(msg);
  }
};

// ============================================================================
// ROLE API FUNCTIONS
// ============================================================================

/**
 * Get all roles with pagination, search and sort.
 * @param {Object} params - { page, page_size, search, sort_by, sort_order }
 */
export const getRoles = async (params = {}) => {
  try {
    const queryParams = { page: 1, page_size: 100, ...params };
    serviceLogger.log('[Roles Service] Fetching roles:', queryParams);
    const response = await api.get(ROLE_ENDPOINTS.GET_ALL, { params: queryParams });
    return response.data;
  } catch (error) {
    const msg = normalizeError(error);
    serviceLogger.error('[Roles Service] getRoles failed:', msg);
    throw new Error(msg);
  }
};

/**
 * Get a single role by ID.
 * @param {number} id
 */
export const getRoleById = async (id) => {
  try {
    if (!id) throw new Error('Role ID is required');
    const response = await api.get(ROLE_ENDPOINTS.GET_BY_ID, { params: { id } });
    return response.data;
  } catch (error) {
    const msg = normalizeError(error);
    serviceLogger.error(`[Roles Service] getRoleById(${id}) failed:`, msg);
    throw new Error(msg);
  }
};

/**
 * Create a new role.
 * @param {Object} roleData - { name, description }
 */
export const createRole = async (roleData) => {
  try {
    if (!roleData.name?.trim()) throw new Error('Role name is required');

    const payload = {
      name:        roleData.name.trim(),
      description: roleData.description?.trim() || '',
    };

    serviceLogger.log('[Roles Service] Creating role:', payload);
    const response = await api.post(ROLE_ENDPOINTS.CREATE, payload);
    return response.data;
  } catch (error) {
    if (error.response?.status === 400) {
      const d = error.response?.data;
      throw new Error(d?.message || d?.error || d?.detail || JSON.stringify(d));
    }
    if (error.message) throw error;
    throw new Error(normalizeError(error));
  }
};

/**
 * Update an existing role.
 * @param {Object} roleData - { id, name, description }
 */
export const updateRole = async (roleData) => {
  try {
    if (!roleData.id) throw new Error('Role ID is required');
    if (!roleData.name?.trim()) throw new Error('Role name is required');

    const payload = {
      id:          Number(roleData.id),
      name:        roleData.name.trim(),
      description: roleData.description?.trim() || '',
    };

    serviceLogger.log('[Roles Service] Updating role:', payload);
    const response = await api.put(ROLE_ENDPOINTS.UPDATE, payload);
    return response.data;
  } catch (error) {
    if (error.response?.status === 400) {
      const d = error.response?.data;
      throw new Error(d?.message || d?.error || d?.detail || JSON.stringify(d));
    }
    const msg = normalizeError(error);
    serviceLogger.error(`[Roles Service] updateRole failed:`, msg);
    throw new Error(msg);
  }
};

/**
 * Delete a role by ID.
 * @param {number} id
 */
export const deleteRole = async (id) => {
  try {
    if (!id) throw new Error('Role ID is required');
    serviceLogger.log(`[Roles Service] Deleting role ID: ${id}`);
    const response = await api.delete(ROLE_ENDPOINTS.DELETE, { params: { id } });
    return response.data;
  } catch (error) {
    const msg = normalizeError(error);
    serviceLogger.error(`[Roles Service] deleteRole(${id}) failed:`, msg);
    throw new Error(msg);
  }
};

export default {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
};