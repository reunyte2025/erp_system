// import axios from "axios";
// import { getToken, logout } from "./authService";

// /**
//  * Axios Instance Configuration
//  * 
//  * Production-ready API client with:
//  * - Base URL configuration
//  * - Request interceptors (auto-attach tokens)
//  * - Response interceptors (error handling)
//  * - Token refresh logic
//  * - Automatic logout on 401
//  * 
//  * @module api
//  */

// // Create axios instance with base configuration
// const api = axios.create({
//   baseURL: "http://127.0.0.1:8000/api",
//   timeout: 30000, // 30 seconds timeout
//   headers: {
//     "Content-Type": "application/json",
//   },
// });

// /**
//  * Request Interceptor
//  * Automatically attach authentication token to all requests
//  */
// api.interceptors.request.use(
//   (config) => {
//     // Get token from storage
//     const token = getToken();
    
//     // Attach token to request headers if it exists
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
    
//     // Log request in development (remove in production)
//     if (process.env.NODE_ENV === 'development') {
//       console.log(`🔵 API Request: ${config.method?.toUpperCase()} ${config.url}`);
//     }
    
//     return config;
//   },
//   (error) => {
//     console.error('❌ Request interceptor error:', error);
//     return Promise.reject(error);
//   }
// );

// /**
//  * Response Interceptor
//  * Handle responses and errors globally
//  */
// api.interceptors.response.use(
//   (response) => {
//     // Log successful response in development
//     if (process.env.NODE_ENV === 'development') {
//       console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
//     }
    
//     return response;
//   },
//   async (error) => {
//     const originalRequest = error.config;
    
//     // Log error in development
//     if (process.env.NODE_ENV === 'development') {
//       console.error(`❌ API Error: ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`, {
//         status: error.response?.status,
//         data: error.response?.data,
//       });
//     }

//     // Handle 401 Unauthorized - Token expired or invalid
//     if (error.response?.status === 401 && !originalRequest._retry) {
//       originalRequest._retry = true;
      
//       // Option 1: Try to refresh token (if you have refresh token endpoint)
//       // Uncomment and implement if you have token refresh
//       /*
//       try {
//         const refreshToken = localStorage.getItem('refresh_token');
//         const response = await axios.post(`${api.defaults.baseURL}/auth/refresh/`, {
//           refresh: refreshToken,
//         });
        
//         const { access } = response.data;
//         localStorage.setItem('access_token', access);
        
//         // Retry original request with new token
//         originalRequest.headers.Authorization = `Bearer ${access}`;
//         return api(originalRequest);
//       } catch (refreshError) {
//         // Refresh failed, logout user
//         await logout();
//         window.location.href = '/login';
//         return Promise.reject(refreshError);
//       }
//       */
      
//       // Option 2: Logout user immediately (current implementation)
//       console.warn('⚠️ Authentication expired - Logging out user');
//       await logout();
      
//       // Redirect to login page
//       // Note: In React Router, you might use navigate() instead
//       window.location.href = '/login';
      
//       return Promise.reject(error);
//     }

//     // Handle 403 Forbidden - No permission
//     if (error.response?.status === 403) {
//       console.warn('⚠️ Access forbidden - User does not have permission');
//       // You can show a toast notification here
//       // toast.error('You do not have permission to perform this action');
//     }

//     // Handle 404 Not Found
//     if (error.response?.status === 404) {
//       console.warn('⚠️ Resource not found');
//     }

//     // Handle 500 Server Error
//     if (error.response?.status === 500) {
//       console.error('❌ Server error - Please try again later');
//       // You can show a toast notification here
//       // toast.error('Server error. Please try again later.');
//     }

//     // Handle network errors (no response from server)
//     if (!error.response) {
//       console.error('❌ Network error - Unable to connect to server');
//       // You can show a toast notification here
//       // toast.error('Unable to connect to server. Please check your connection.');
//     }

//     return Promise.reject(error);
//   }
// );

// /**
//  * Helper function to handle API errors consistently
//  * 
//  * @param {Error} error - Axios error object
//  * @returns {string} User-friendly error message
//  */
// export const handleApiError = (error) => {
//   if (error.response) {
//     // Server responded with error
//     const errorData = error.response.data;
    
//     return errorData?.message || 
//            errorData?.detail || 
//            errorData?.error ||
//            `Server error: ${error.response.status}`;
//   } else if (error.request) {
//     // Request made but no response
//     return 'Unable to connect to server. Please check your connection.';
//   } else {
//     // Something else happened
//     return error.message || 'An unexpected error occurred';
//   }
// };

// /**
//  * Helper function to check if error is due to network issues
//  * 
//  * @param {Error} error - Axios error object
//  * @returns {boolean} True if network error
//  */
// export const isNetworkError = (error) => {
//   return !error.response && error.request;
// };

// /**
//  * Helper function to check if error is due to authentication
//  * 
//  * @param {Error} error - Axios error object
//  * @returns {boolean} True if authentication error
//  */
// export const isAuthError = (error) => {
//   return error.response?.status === 401 || error.response?.status === 403;
// };

// /**
//  * Helper function to check if error is due to validation
//  * 
//  * @param {Error} error - Axios error object
//  * @returns {boolean} True if validation error
//  */
// export const isValidationError = (error) => {
//   return error.response?.status === 400 || error.response?.status === 422;
// };

// export default api;

