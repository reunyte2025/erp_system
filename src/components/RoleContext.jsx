import { createContext, useContext } from 'react';

/**
 * ============================================================================
 * ROLE CONTEXT — Role-Based Access Control (RBAC)
 * ============================================================================
 *
 * Provides the current user's role throughout the app without prop-drilling.
 *
 * Roles (from backend):
 *   Admin   → full access (delete/undo, sees Users tab, sees Actions columns)
 *   Manager → elevated access (sees Users tab, sees Actions columns)
 *   User    → standard access (no destructive actions, no Users tab)
 *
 * Usage:
 *   const { isAdmin, isManager, isAdminOrManager, userRole } = useRole();
 *
 * Provider is placed in AuthenticatedLayout so it wraps every protected page.
 */

const RoleContext = createContext({
  userRole:         'User',
  isAdmin:          false,
  isManager:        false,
  isAdminOrManager: false,
});

/**
 * Hook to consume role context
 * @returns {{ userRole: string, isAdmin: boolean, isManager: boolean, isAdminOrManager: boolean }}
 */
export const useRole = () => useContext(RoleContext);

export default RoleContext;