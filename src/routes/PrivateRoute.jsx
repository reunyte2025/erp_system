import { Navigate, useLocation } from 'react-router-dom';

/**
 * ProtectedRoute Component
 * 
 * A wrapper component that protects routes requiring authentication.
 * 
 * Features:
 * - Checks if user is authenticated (isLoggedIn)
 * - Redirects to /login if not authenticated
 * - Preserves the attempted location for redirect after login
 * - Allows rendering of children components if authenticated
 * 
 * Usage:
 * <ProtectedRoute isLoggedIn={isLoggedIn}>
 *   <YourProtectedComponent />
 * </ProtectedRoute>
 * 
 * @param {boolean} isLoggedIn - Authentication status
 * @param {React.ReactNode} children - Components to render if authenticated
 * @returns {React.ReactNode} - Children or redirect to login
 */

export default function ProtectedRoute({ children, isLoggedIn }) {
  const location = useLocation();
  
  // If not logged in, redirect to login page
  // Save the current location so we can redirect back after login
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // User is authenticated, render the protected content
  return children;
}