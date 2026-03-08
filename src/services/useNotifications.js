import { useState, useEffect, useCallback, useRef } from 'react';
import api from './api';

/**
 * useNotifications Hook
 *
 * Full-featured notification system using your existing api.js.
 * Bearer token is auto-attached by the api.js interceptor.
 *
 * Features:
 * - Fetch all notifications on mount (login)
 * - Poll every 30 seconds for new ones
 * - removeNotification(id)  → DELETE /api/notifications/remove_notification/?id=
 * - clearAllNotifications() → DELETE all one by one (API only supports single id)
 * - Stop polling on 401 / logout / unmount
 * - Smart notification text from metadata + event_type
 * - Navigation target derived from entity_type + entity_id
 */

const POLL_INTERVAL = 30000;

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const isMounted = useRef(true);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // ─── FETCH ────────────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/notifications/get_all_notifications/');
      if (!isMounted.current) return;

      const data =
        response.data?.data ?? (Array.isArray(response.data) ? response.data : []);
      setNotifications(data);
    } catch (err) {
      if (!isMounted.current) return;
      if (err.response?.status === 401) {
        stopPolling();
        setNotifications([]);
        return;
      }
      console.error('Notifications fetch error:', err.message);
      setError(err.message);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  // ─── POLLING ──────────────────────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => {
      isMounted.current = false;
      stopPolling();
    };
  }, [fetchNotifications]);

  // ─── REMOVE SINGLE ────────────────────────────────────────────────────────
  /**
   * Delete a single notification by id.
   * API: DELETE /api/notifications/remove_notification/?id=<id>
   * Optimistic update — removes from UI immediately, reverts on failure.
   */
  const removeNotification = useCallback(async (id) => {
    // Optimistic removal
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await api.delete('/notifications/remove_notification/', { params: { id } });
    } catch (err) {
      console.error('Failed to remove notification:', err.message);
      // Revert on failure — refetch from server
      fetchNotifications();
    }
  }, [fetchNotifications]);

  // ─── CLEAR ALL ────────────────────────────────────────────────────────────
  /**
   * Delete ALL notifications.
   * Since the API only supports deleting by single id, we fire them in parallel.
   * Optimistic — clears UI immediately, refetches if any fail.
   */
  const clearAllNotifications = useCallback(async () => {
    const ids = notifications.map((n) => n.id);
    if (ids.length === 0) return;

    // Optimistic clear
    setNotifications([]);

    try {
      await Promise.all(
        ids.map((id) =>
          api.delete('/notifications/remove_notification/', { params: { id } })
        )
      );
    } catch (err) {
      console.error('Failed to clear all notifications:', err.message);
      fetchNotifications(); // sync with server on failure
    }
  }, [notifications, fetchNotifications]);

  // ─── MARK AS READ (local state only) ─────────────────────────────────────
  const markAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, []);

  // ─── HELPERS ──────────────────────────────────────────────────────────────
  /**
   * Build a human-readable notification message.
   *
   * The API sends:
   *   event_type: "client_created"
   *   entity_type: "Client"
   *   metadata: { client_name: "Notification Testing 02" }
   *
   * We use this to produce: "New client added: Notification Testing 02"
   */
  const getNotificationText = (notification) => {
    const { event_type, entity_type, metadata } = notification;
    const meta = typeof metadata === 'object' ? metadata : {};

    // ── Client events ──────────────────────────────────────────────────────
    if (event_type === 'client_created') {
      const name = meta.client_name || meta.name || '';
      return name ? `New client added: ${name}` : 'New client was added';
    }
    if (event_type === 'client_updated') {
      const name = meta.client_name || meta.name || '';
      return name ? `Client updated: ${name}` : 'A client was updated';
    }
    if (event_type === 'client_deleted') {
      const name = meta.client_name || meta.name || '';
      return name ? `Client removed: ${name}` : 'A client was deleted';
    }

    // ── Invoice events ─────────────────────────────────────────────────────
    if (event_type === 'invoice_created') {
      const ref = meta.invoice_number || meta.reference || '';
      return ref ? `New invoice created: ${ref}` : 'New invoice created';
    }
    if (event_type === 'invoice_updated') return 'Invoice was updated';
    if (event_type === 'payment_received') {
      const amt = meta.amount || '';
      return amt ? `Payment received: ₹${amt}` : 'Payment received';
    }

    // ── Project events ─────────────────────────────────────────────────────
    if (event_type === 'project_created') {
      const name = meta.project_name || meta.name || '';
      return name ? `New project: ${name}` : 'New project created';
    }

    // ── Generic fallback ───────────────────────────────────────────────────
    if (meta.client_name) return `${entity_type}: ${meta.client_name}`;
    if (event_type) return event_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return 'New notification';
  };

  /**
   * Get an icon type string based on event_type (used in navbar for colored icons).
   * Returns: 'client' | 'invoice' | 'project' | 'payment' | 'default'
   */
  const getNotificationCategory = (notification) => {
    const et = notification.event_type || '';
    if (et.startsWith('client')) return 'client';
    if (et.startsWith('invoice')) return 'invoice';
    if (et.startsWith('project')) return 'project';
    if (et.includes('payment')) return 'payment';
    return 'default';
  };

  /**
   * Get the navigation path when a notification is clicked.
   *
   * entity_type: "Client", entity_id: 48  →  /clients/48
   * entity_type: "Invoice", entity_id: 5  →  /invoices/5
   * entity_type: "Project", entity_id: 3  →  /projects/3
   */
  const getNavigationPath = (notification) => {
    const { entity_type, entity_id } = notification;
    if (!entity_id) return null;

    const typeMap = {
      Client:  `/clients/${entity_id}`,
      Invoice: `/invoices/${entity_id}`,
      Project: `/projects/${entity_id}`,
      Proforma:`/proforma/${entity_id}`,
      Purchase:`/purchase/${entity_id}`,
    };

    return typeMap[entity_type] || null;
  };

  /**
   * Format ISO timestamp → relative time string
   */
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    // Actions
    markAsRead,
    markAllRead,
    removeNotification,
    clearAllNotifications,
    refetch: fetchNotifications,
    // Helpers
    getNotificationText,
    getNotificationCategory,
    getNavigationPath,
    formatTime,
  };
}