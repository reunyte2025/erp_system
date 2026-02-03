import axios from 'axios';

/**
 * ============================================================================
 * CENTRALIZED API CLIENT - PRODUCTION GRADE
 * ============================================================================
 * 
 * This is the CORE network engine for the entire application.
 * 
 * Key Responsibilities:
 * - Single source of truth for all HTTP communication
 * - Automatic token attachment to requests
 * - Global error handling and normalization
 * - Request/response interceptors
 * - Environment-based base URL configuration
 * - 401 unauthorized handling with automatic logout
 * 
 * Architecture Benefits:
 * - Centralized authentication logic
 * - Consistent error handling across all API calls
 * - Easy to add global features (retry logic, rate limiting, etc.)
 * - Environment switching (dev/staging/production)
 * - Network layer completely decoupled from business logic
 * 
 * Usage Pattern:
 * - NEVER use this directly in components
 * - ONLY use through service layer (clients.js, quotations.js, etc.)
 * - Components should remain agnostic about network implementation
 * 
 * @module apiClient
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Base URL Configuration
 * 
 * Priority Order:
 * 1. Environment variable (VITE_API_BASE_URL)
 * 2. Fallback to localhost for development
 * 
 * Production Setup:
 * - Create .env file in project root
 * - Add: VITE_API_BASE_URL=https://your-production-api.com/api
 * - Vite automatically loads and replaces at build time
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

/**
 * Request timeout in milliseconds
 * 30 seconds is reasonable for most API operations
 * Adjust based on your backend performance requirements
 */
const REQUEST_TIMEOUT = 30000;

// ============================================================================
// AXIOS INSTANCE CREATION
// ============================================================================

/**
 * Create configured axios instance
 * 
 * Why instance vs default axios?
 * - Isolated configuration (won't affect other axios usage)
 * - Multiple instances possible (e.g., different APIs)
 * - Cleaner testing and mocking
 */
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// REQUEST INTERCEPTOR
// ============================================================================

/**
 * Request Interceptor
 * 
 * Executes BEFORE every request is sent
 * 
 * Responsibilities:
 * - Attach authentication token automatically
 * - Add custom headers if needed
 * - Log requests in development
 * - Modify request config if needed
 * 
 * Why interceptors?
 * - DRY principle: No manual token attachment in every API call
 * - Centralized auth logic
 * - Easy to add global request modifications
 */
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('access_token');
    
    // Attach token to request if it exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
    }
    
    return config;
  },
  (error) => {
    // Handle request errors (rare, usually network issues before request)
    console.error('❌ Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// ============================================================================
// RESPONSE INTERCEPTOR
// ============================================================================

/**
 * Response Interceptor
 * 
 * Executes AFTER every response is received
 * 
 * Responsibilities:
 * - Handle successful responses
 * - Normalize error responses
 * - Handle 401 unauthorized (auto logout)
 * - Handle 403 forbidden
 * - Handle network errors
 * - Global error logging
 * 
 * Why interceptors?
 * - Centralized error handling
 * - Automatic token expiry handling
 * - Consistent error format for all API calls
 * - No need to handle 401 in every service function
 */
apiClient.interceptors.response.use(
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
    // HANDLE 401 UNAUTHORIZED - Token Expired or Invalid
    // ========================================================================
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      console.warn('⚠️ 401 Unauthorized - Token expired or invalid');
      
      // Clear authentication data
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('remember_me');
      localStorage.removeItem('login_timestamp');
      
      // Redirect to login page
      // Using window.location instead of navigate() because this runs outside React context
      window.location.href = '/login';
      
      // Note: If you have token refresh endpoint, implement it here
      // Example:
      // try {
      //   const refreshToken = localStorage.getItem('refresh_token');
      //   const response = await axios.post(`${BASE_URL}/auth/refresh/`, {
      //     refresh: refreshToken,
      //   });
      //   const { access } = response.data;
      //   localStorage.setItem('access_token', access);
      //   originalRequest.headers.Authorization = `Bearer ${access}`;
      //   return apiClient(originalRequest);
      // } catch (refreshError) {
      //   // Refresh failed, logout user
      //   localStorage.clear();
      //   window.location.href = '/login';
      //   return Promise.reject(refreshError);
      // }
      
      return Promise.reject(error);
    }

    // ========================================================================
    // HANDLE 403 FORBIDDEN - No Permission
    // ========================================================================
    if (error.response?.status === 403) {
      console.warn('⚠️ 403 Forbidden - User does not have permission');
      // You can trigger a toast notification here via a global event
      // or return a normalized error for the service layer to handle
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
      console.error('- Backend server is not running');
      console.error('- Docker container is not running');
      console.error('- Network connectivity issues');
      console.error('- CORS issues');
    }

    // Return rejected promise with normalized error
    return Promise.reject(error);
  }
);

// ============================================================================
// ERROR NORMALIZATION UTILITIES
// ============================================================================

/**
 * Normalize API errors into consistent format
 * 
 * Backend APIs return errors in different formats:
 * - { message: "..." }
 * - { detail: "..." }
 * - { error: "..." }
 * - { errors: {...} }
 * - { non_field_errors: ["..."] }
 * 
 * This function extracts the error message regardless of format
 * 
 * @param {Error} error - Axios error object
 * @returns {string} User-friendly error message
 */
export const normalizeError = (error) => {
  if (error.response) {
    // Server responded with error status
    const errorData = error.response.data;
    
    // Try to extract error message from various possible formats
    return (
      errorData?.message ||
      errorData?.detail ||
      errorData?.error ||
      errorData?.errors ||
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

/**
 * Export the configured axios instance
 * 
 * DO NOT export axios directly - always use this configured instance
 * This ensures all API calls go through our interceptors
 */
export default apiClient;

/**
 * Export base URL for reference if needed
 * (e.g., for file uploads or external integrations)
 */
export { BASE_URL };

/**
 * ============================================================================
 * USAGE EXAMPLES IN SERVICE LAYER
 * ============================================================================
 * 
 * // In services/clients.js
 * import apiClient from './apiClient';
 * 
 * export const getClients = async (params) => {
 *   const response = await apiClient.get('/clients/get_all_client/', { params });
 *   return response.data;
 * };
 * 
 * export const createClient = async (data) => {
 *   const response = await apiClient.post('/clients/', data);
 *   return response.data;
 * };
 * 
 * ============================================================================
 * WHY THIS ARCHITECTURE?
 * ============================================================================
 * 
 * 1. Single Responsibility Principle
 *    - apiClient only handles HTTP communication
 *    - No business logic
 *    - No UI logic
 *    - No React dependencies
 * 
 * 2. Scalability
 *    - Easy to add 20+ modules
 *    - Each module gets automatic auth, error handling, logging
 *    - Changes to auth logic only need to happen here
 * 
 * 3. Testability
 *    - Easy to mock in tests
 *    - Isolated from business logic
 *    - Can test network layer independently
 * 
 * 4. Maintainability
 *    - Clear separation of concerns
 *    - Easy to debug (all network logs in one place)
 *    - Easy to add features (retry logic, caching, etc.)
 * 
 * 5. Flexibility
 *    - Can switch to different HTTP library (fetch, ky, etc.)
 *    - Can add multiple API clients for different backends
 *    - Can customize per environment
 * 
 * ============================================================================
 */