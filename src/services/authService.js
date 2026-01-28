import axios from 'axios';
import config from '../config.js';

/**
 * Authentication Service
 * 
 * Production-ready authentication service with:
 * - Centralized API calls
 * - Token management
 * - Error handling
 * - Security best practices
 * - Multi-user support
 * 
 * @module authService
 */

// FIXED: Use config.apiUrl directly, it already includes /api
const AUTH_API_URL = `${config.apiUrl}/auth`;

// Storage Keys - Centralized for consistency
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  USER_DATA: 'user_data',
  REMEMBER_ME: 'remember_me',
  LOGIN_TIMESTAMP: 'login_timestamp',
};

/**
 * Login user with credentials
 * 
 * @param {Object} credentials - User login credentials
 * @param {string} credentials.username - Username
 * @param {string} credentials.password - Password
 * @param {boolean} credentials.rememberMe - Remember me flag
 * @returns {Promise<Object>} Response with user and token
 * @throws {Error} Login error with descriptive message
 */
export const login = async (credentials) => {
  try {
    const response = await axios.post(`${AUTH_API_URL}/login/`, {
      username: credentials.username,
      password: credentials.password,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      // Timeout for slow networks (30 seconds)
      timeout: 30000,
    });

    // Validate response structure
    if (response.data.status === 'success' && response.data.data) {
      const { user, token } = response.data.data;

      // Validate critical data before storing
      if (!token || !user) {
        throw new Error('Invalid response: Missing user or token data');
      }

      // Store authentication data in localStorage
      // PRODUCTION: Always use localStorage for persistence across reloads
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, credentials.rememberMe.toString());
      localStorage.setItem(STORAGE_KEYS.LOGIN_TIMESTAMP, new Date().getTime().toString());

      console.log('✅ Login successful - User authenticated:', user.username);

      return {
        success: true,
        user,
        token,
      };
    } else {
      throw new Error('Login failed. Please check your credentials.');
    }
  } catch (error) {
    console.error('❌ Login error:', error);

    // Enhanced error handling for production
    let errorMessage = 'An unexpected error occurred. Please try again.';

    if (error.response) {
      // Server responded with error status
      const errorData = error.response.data;
      
      // Extract error message from various possible response formats
      errorMessage = errorData?.errors || 
                     errorData?.detail || 
                     errorData?.message ||
                     errorData?.non_field_errors?.[0] ||
                     'Invalid username or password';
      
      console.error('Server error response:', errorData);
    } else if (error.request) {
      // Request made but no response received
      errorMessage = 'Unable to connect to server. Please check if the Docker container is running.';
      console.error('No response received:', error.request);
    } else if (error.code === 'ECONNABORTED') {
      // Request timeout
      errorMessage = 'Request timeout. Please check your internet connection and try again.';
    }

    // Throw error with user-friendly message
    throw new Error(errorMessage);
  }
};

/**
 * Logout user and clear all authentication data
 * 
 * @returns {Promise<void>}
 */
export const logout = async () => {
  try {
    // Optional: Call backend logout endpoint if you have one
    // const token = getToken();
    // if (token) {
    //   await axios.post(`${AUTH_API_URL}/logout/`, {}, {
    //     headers: { 'Authorization': `Bearer ${token}` }
    //   });
    // }

    // Clear all authentication data from localStorage
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
    localStorage.removeItem(STORAGE_KEYS.LOGIN_TIMESTAMP);

    console.log('✅ Logout successful - Session cleared');

    return { success: true };
  } catch (error) {
    console.error('❌ Logout error:', error);
    
    // Even if API call fails, clear local storage
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
    localStorage.removeItem(STORAGE_KEYS.LOGIN_TIMESTAMP);

    return { success: true };
  }
};

/**
 * Get stored authentication token
 * 
 * @returns {string|null} JWT token or null if not authenticated
 */
export const getToken = () => {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  } catch (error) {
    console.error('Error reading token from storage:', error);
    return null;
  }
};

/**
 * Get stored user data
 * 
 * @returns {Object|null} User object or null if not authenticated
 */
export const getUserData = () => {
  try {
    const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error reading user data from storage:', error);
    return null;
  }
};

/**
 * Check if user is authenticated
 * 
 * @returns {boolean} True if user is authenticated
 */
export const isAuthenticated = () => {
  const token = getToken();
  const userData = getUserData();
  return !!(token && userData);
};

/**
 * Get remember me preference
 * 
 * @returns {boolean} Remember me flag
 */
export const getRememberMe = () => {
  try {
    const rememberMe = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
    return rememberMe === 'true';
  } catch (error) {
    console.error('Error reading remember me preference:', error);
    return false;
  }
};

/**
 * Get login timestamp
 * 
 * @returns {number|null} Login timestamp in milliseconds
 */
export const getLoginTimestamp = () => {
  try {
    const timestamp = localStorage.getItem(STORAGE_KEYS.LOGIN_TIMESTAMP);
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch (error) {
    console.error('Error reading login timestamp:', error);
    return null;
  }
};

/**
 * Get session duration in minutes
 * 
 * @returns {number} Session duration in minutes
 */
export const getSessionDuration = () => {
  const loginTimestamp = getLoginTimestamp();
  if (!loginTimestamp) return 0;

  const currentTime = new Date().getTime();
  const durationMs = currentTime - loginTimestamp;
  return Math.floor(durationMs / (1000 * 60)); // Convert to minutes
};

/**
 * Validate token format (basic validation)
 * 
 * @param {string} token - JWT token
 * @returns {boolean} True if token format is valid
 */
export const isValidTokenFormat = (token) => {
  if (!token || typeof token !== 'string') return false;
  
  // Basic JWT format check (3 parts separated by dots)
  const parts = token.split('.');
  return parts.length === 3;
};

/**
 * Get user role name
 * 
 * @returns {string} User role name or 'User' as default
 */
export const getUserRole = () => {
  const userData = getUserData();
  return userData?.role?.name || 'User';
};

/**
 * Get user full name
 * 
 * @returns {string} User's full name or username
 */
export const getUserFullName = () => {
  const userData = getUserData();
  if (!userData) return 'User';

  const firstName = userData.first_name || '';
  const lastName = userData.last_name || '';
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  
  return userData.username || 'User';
};

/**
 * Get user email
 * 
 * @returns {string} User's email
 */
export const getUserEmail = () => {
  const userData = getUserData();
  return userData?.email || '';
};

/**
 * Check if current session is valid (not expired)
 * 
 * @param {number} maxSessionMinutes - Maximum session duration in minutes (default: 480 = 8 hours)
 * @returns {boolean} True if session is still valid
 */
export const isSessionValid = (maxSessionMinutes = 480) => {
  if (!isAuthenticated()) return false;

  const sessionDuration = getSessionDuration();
  return sessionDuration < maxSessionMinutes;
};

/**
 * Refresh user data from localStorage (useful after profile updates)
 * 
 * @returns {Object|null} Updated user data
 */
export const refreshUserData = () => {
  return getUserData();
};

/**
 * Update stored user data (useful after profile updates)
 * 
 * @param {Object} updatedUser - Updated user object
 * @returns {boolean} True if update was successful
 */
export const updateStoredUserData = (updatedUser) => {
  try {
    if (!updatedUser) {
      console.error('Cannot update user data: Invalid user object');
      return false;
    }

    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
    console.log('✅ User data updated in storage');
    return true;
  } catch (error) {
    console.error('❌ Error updating user data in storage:', error);
    return false;
  }
};

// Export storage keys for consistency across the app
export const AUTH_STORAGE_KEYS = STORAGE_KEYS;

export default {
  login,
  logout,
  getToken,
  getUserData,
  isAuthenticated,
  getRememberMe,
  getLoginTimestamp,
  getSessionDuration,
  isValidTokenFormat,
  getUserRole,
  getUserFullName,
  getUserEmail,
  isSessionValid,
  refreshUserData,
  updateStoredUserData,
  AUTH_STORAGE_KEYS,
};