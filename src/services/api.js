import axios from 'axios';
import config from '../config.js';
import { getToken, logout } from './authService';

/**
 * ============================================================================
 * CENTRALIZED API CLIENT - PRODUCTION GRADE
 * ============================================================================
 * 
 * Single source of truth for all HTTP communication.
 * Integrates with existing authService.js for authentication.
 * 
 * Key Features:
 * - Automatic token attachment from authService
 * - Global error handling and normalization
 * - Request/response interceptors
 * - 401 unauthorized handling with automatic logout
 * - CSRF token support for Django backend
 * 
 * @module api
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Base URL from config
 * config.apiUrl already includes /api
 */
const BASE_URL = config.apiUrl;

/**
 * Request timeout in milliseconds (30 seconds)
 */
const REQUEST_TIMEOUT = 30000;

// ============================================================================
// AXIOS INSTANCE CREATION
// ============================================================================

const api = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
  // TEMPORARILY DISABLED - Fix CORS issue first on backend
  // withCredentials: true, 
});

// ============================================================================
// CSRF TOKEN HELPER
// ============================================================================

/**
 * Get CSRF token from cookie (for Django)
 * 
 * @returns {string|null} CSRF token or null
 */
const getCsrfToken = () => {
  const name = 'csrftoken';
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
};

// ============================================================================
// REQUEST INTERCEPTOR
// ============================================================================

/**
 * Request Interceptor
 * Executes BEFORE every request is sent
 * 
 * Attaches:
 * - Authentication token from authService
 * - CSRF token (for Django)
 */
api.interceptors.request.use(
  (config) => {
    // Get authentication token from authService
    const token = getToken();
    
    // Attach Bearer token if available
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Get and attach CSRF token for Django (if needed)
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    
    // Development logging
    if (import.meta.env.DEV) {
      console.log(`🔵 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      if (config.params) {
        console.log('📤 Request Params:', config.params);
      }
      if (config.data) {
        console.log('📤 Request Data:', config.data);
      }
      if (token) {
        console.log('🔐 Token attached:', token.substring(0, 20) + '...');
      } else {
        console.log('⚠️ No authentication token found');
      }
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ============================================================================
// RESPONSE INTERCEPTOR
// ============================================================================

/**
 * Response Interceptor
 * Executes AFTER every response is received
 * 
 * Handles:
 * - Successful responses
 * - 401 Unauthorized (auto logout via authService)
 * - 403 Forbidden
 * - 404 Not Found
 * - 500 Server Errors
 * - Network errors
 */
api.interceptors.response.use(
  // Success handler
  (response) => {
    // Log successful responses in development
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`);
      console.log('📥 Response Data:', response.data);
    }
    
    return response;
  },
  
  // Error handler
  async (error) => {
    const originalRequest = error.config;
    
    // Log error in development
    if (import.meta.env.DEV) {
      console.error(`❌ API Error: ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`);
      console.error('Error Details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
    }

    // ========================================================================
    // HANDLE 401 UNAUTHORIZED - Token Expired/Invalid or Missing
    // ========================================================================
    if (error.response?.status === 401) {
      console.warn('⚠️ 401 Unauthorized - Authentication required or token expired');
      
      // Check if this is a login request (don't redirect on login failure)
      const isLoginRequest = originalRequest.url?.includes('/login') || 
                            originalRequest.url?.includes('/auth');
      
      if (!isLoginRequest && !originalRequest._retry) {
        originalRequest._retry = true;
        
        // Use authService logout to clear everything properly
        await logout();
        
        // Redirect to login page
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          console.log('🔄 Redirecting to login page...');
          window.location.href = '/login';
        }
      }
      
      return Promise.reject(error);
    }

    // ========================================================================
    // HANDLE 403 FORBIDDEN - No Permission
    // ========================================================================
    if (error.response?.status === 403) {
      console.warn('⚠️ 403 Forbidden - User does not have permission');
      // You can show a toast notification here
    }

    // ========================================================================
    // HANDLE 404 NOT FOUND
    // ========================================================================
    if (error.response?.status === 404) {
      console.warn('⚠️ 404 Not Found - Resource does not exist');
    }

    // ========================================================================
    // HANDLE 500 SERVER ERROR
    // ========================================================================
    if (error.response?.status === 500) {
      console.error('❌ 500 Server Error - Something went wrong on the server');
    }

    // ========================================================================
    // HANDLE NETWORK ERRORS (No response from server)
    // ========================================================================
    if (!error.response) {
      console.error('❌ Network Error - Unable to connect to server');
      console.error('Possible causes:');
      console.error('  - Backend server is not running');
      console.error('  - Docker container is not running');
      console.error('  - Network connectivity issues');
      console.error('  - CORS configuration issues');
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// ERROR NORMALIZATION UTILITIES
// ============================================================================

/**
 * Normalize API errors into consistent user-friendly format
 * 
 * @param {Error} error - Axios error object
 * @returns {string} User-friendly error message
 */
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const errorData = error.response.data;
    
    // Try to extract error message from various possible formats
    return (
      errorData?.message ||
      errorData?.detail ||
      errorData?.error ||
      errorData?.errors?.detail ||
      errorData?.non_field_errors?.[0] ||
      `Server error: ${error.response.status}`
    );
  } else if (error.request) {
    // Request made but no response received
    return 'Unable to connect to server. Please check if the backend is running.';
  } else {
    // Something else happened
    return error.message || 'An unexpected error occurred';
  }
};

/**
 * Alternative name for handleApiError (for consistency)
 */
export const normalizeError = handleApiError;

/**
 * Check if error is a network error
 * 
 * @param {Error} error - Axios error object
 * @returns {boolean} True if network error
 */
export const isNetworkError = (error) => {
  return !error.response && !!error.request;
};

/**
 * Check if error is an authentication error
 * 
 * @param {Error} error - Axios error object
 * @returns {boolean} True if auth error (401 or 403)
 */
export const isAuthError = (error) => {
  return error.response?.status === 401 || error.response?.status === 403;
};

/**
 * Check if error is a validation error
 * 
 * @param {Error} error - Axios error object
 * @returns {boolean} True if validation error (400 or 422)
 */
export const isValidationError = (error) => {
  return error.response?.status === 400 || error.response?.status === 422;
};

/**
 * Check if error is a server error
 * 
 * @param {Error} error - Axios error object
 * @returns {boolean} True if server error (500-599)
 */
export const isServerError = (error) => {
  return error.response?.status >= 500 && error.response?.status < 600;
};

// ============================================================================
// EXPORTS
// ============================================================================

export default api;
export { BASE_URL, getCsrfToken };