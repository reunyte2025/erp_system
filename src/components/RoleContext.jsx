import { createContext, useContext } from 'react';

/**
 * ============================================================================
 * ROLE CONTEXT — Role-Based Access Control (RBAC)
 * ============================================================================
 *
 * Provides the current user's role throughout the app without prop-drilling.
 *
 * Roles (from backend):
 *   Admin   → full access (can delete/undo clients, see all actions)
 *   Manager → read-only on destructive actions (no delete/undo)
 *   User    → read-only on destructive actions (no delete/undo)
 *
 * Usage:
 *   // In any child component:
 *   const { isAdmin, userRole } = useRole();
 *
 * Provider is placed in AuthenticatedLayout so it wraps every protected page.
 */

const RoleContext = createContext({ userRole: 'User', isAdmin: false });

/**
 * Hook to consume role context
 * @returns {{ userRole: string, isAdmin: boolean }}
 */
export const useRole = () => useContext(RoleContext);

export default RoleContext;