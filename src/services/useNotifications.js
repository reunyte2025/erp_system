import { useState, useEffect, useCallback, useRef } from 'react';
import api from './api';

/**
 * useNotifications Hook
 *
 * Full-featured notification system using your existing api.js.
 * Bearer token is auto-attached by the api.js interceptor.
 *
 * API Endpoints:
 * - GET  /api/usernotification/get_all_notifications/   → fetch all
 * - PUT  /api/usernotification/read_notification/?id=   → mark single as read
 * - DELETE /api/usernotification/remove_notification/?id= → remove single
 *
 * Response shape from backend:
 * {
 *   status: "success",
 *   data: {
 *     notification: [...],
 *     unread_count: 25
 *   }
 * }
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

      const response = await api.get('/usernotification/get_all_notifications/');
      if (!isMounted.current) return;

      // FIX: Backend returns { status, data: { notification: [...], unread_count: N } }
      // We must read response.data.data.notification
      const raw = response.data?.data;

      const data = Array.isArray(raw?.notification)
        ? raw.notification                         // ✅ correct path
        : Array.isArray(raw)
        ? raw                                      // flat array fallback
        : Array.isArray(raw?.results)
        ? raw.results                              // paginated fallback
        : Array.isArray(response.data)
        ? response.data                            // bare array fallback
        : [];

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

  // ─── MARK SINGLE AS READ ──────────────────────────────────────────────────
  /**
   * Marks a notification as read on the backend.
   * API: PUT /api/usernotification/read_notification/?id=<id>
   * Optimistic: update UI immediately, revert on failure.
   */
  const markAsRead = useCallback(async (id) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    try {
      await api.put('/usernotification/read_notification/', null, {
        params: { id },
      });
    } catch (err) {
      console.error('Failed to mark notification as read:', err.message);
      // Revert on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: false } : n))
      );
    }
  }, []);

  // ─── MARK ALL AS READ ─────────────────────────────────────────────────────
  /**
   * Marks ALL unread notifications as read — calls PUT for each one in parallel.
   */
  const markAllRead = useCallback(async () => {
    const unreadIds = notifications
      .filter((n) => !n.is_read)
      .map((n) => n.id);

    if (unreadIds.length === 0) return;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    try {
      await Promise.all(
        unreadIds.map((id) =>
          api.put('/usernotification/read_notification/', null, {
            params: { id },
          })
        )
      );
    } catch (err) {
      console.error('Failed to mark all as read:', err.message);
      // Revert on failure — refetch from server
      fetchNotifications();
    }
  }, [notifications, fetchNotifications]);

  // ─── REMOVE SINGLE ────────────────────────────────────────────────────────
  /**
   * Permanently deletes a single notification.
   * API: DELETE /api/usernotification/remove_notification/?id=<id>
   * Optimistic: remove from UI immediately, refetch on failure.
   */
  const removeNotification = useCallback(async (id) => {
    // Optimistic removal
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await api.delete('/usernotification/remove_notification/', {
        params: { id },
      });
    } catch (err) {
      console.error('Failed to remove notification:', err.message);
      // Revert on failure — refetch from server
      fetchNotifications();
    }
  }, [fetchNotifications]);

  // ─── CLEAR ALL ────────────────────────────────────────────────────────────
  /**
   * Permanently deletes ALL notifications one by one (API only supports single id).
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
          api.delete('/usernotification/remove_notification/', {
            params: { id },
          })
        )
      );
    } catch (err) {
      console.error('Failed to clear all notifications:', err.message);
      fetchNotifications(); // sync with server on failure
    }
  }, [notifications, fetchNotifications]);

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  /**
   * Build a human-readable notification message from event_type + metadata.
   *
   * Handles all event types seen in production:
   *   PROFORMA_APPROVED, PROFORMA_SUBMITTED, PROFORMA_REJECTED
   *   client_created, client_updated, client_deleted
   *   invoice_created, invoice_updated, payment_received
   *   project_created
   */
  const getNotificationText = (notification) => {
    const { event_type, entity_type, metadata } = notification;
    const meta = typeof metadata === 'object' && metadata !== null ? metadata : {};

    const et = (event_type || '').toUpperCase();

    // ── Proforma events ────────────────────────────────────────────────────
    if (et === 'PROFORMA_APPROVED') {
      const num = meta.proforma_number || '';
      const by  = meta.by || '';
      return num
        ? `Proforma #${num} approved${by ? ` by ${by}` : ''}`
        : 'Proforma was approved';
    }
    if (et === 'PROFORMA_SUBMITTED') {
      const num = meta.proforma_number || '';
      const by  = meta.by || '';
      return num
        ? `Proforma #${num} submitted${by ? ` by ${by}` : ''}`
        : 'Proforma was submitted';
    }
    if (et === 'PROFORMA_REJECTED') {
      const num = meta.proforma_number || '';
      const by  = meta.by || '';
      return num
        ? `Proforma #${num} rejected${by ? ` by ${by}` : ''}`
        : 'Proforma was rejected';
    }

    // ── Client events ──────────────────────────────────────────────────────
    if (et === 'CLIENT_CREATED') {
      const name = meta.client_name || meta.name || '';
      return name ? `New client added: ${name}` : 'New client was added';
    }
    if (et === 'CLIENT_UPDATED') {
      const name = meta.client_name || meta.name || '';
      return name ? `Client updated: ${name}` : 'A client was updated';
    }
    if (et === 'CLIENT_DELETED') {
      const name = meta.client_name || meta.name || '';
      return name ? `Client removed: ${name}` : 'A client was deleted';
    }

    // ── Invoice events ─────────────────────────────────────────────────────
    if (et === 'INVOICE_CREATED') {
      const ref = meta.invoice_number || meta.reference || '';
      return ref ? `New invoice created: ${ref}` : 'New invoice created';
    }
    if (et === 'INVOICE_UPDATED') return 'Invoice was updated';
    if (et === 'PAYMENT_RECEIVED') {
      const amt = meta.amount || '';
      return amt ? `Payment received: ₹${amt}` : 'Payment received';
    }

    // ── Project events ─────────────────────────────────────────────────────
    if (et === 'PROJECT_CREATED') {
      const name = meta.project_name || meta.name || '';
      return name ? `New project: ${name}` : 'New project created';
    }

    // ── Generic fallback ───────────────────────────────────────────────────
    if (meta.client_name) return `${entity_type || 'Update'}: ${meta.client_name}`;
    if (event_type) {
      return event_type
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return 'New notification';
  };

  /**
   * Get category string for icon/colour selection.
   * Returns: 'proforma' | 'client' | 'invoice' | 'project' | 'payment' | 'default'
   */
  const getNotificationCategory = (notification) => {
    const et = (notification.event_type || '').toUpperCase();
    if (et.includes('PROFORMA'))  return 'proforma';
    if (et.includes('CLIENT'))    return 'client';
    if (et.includes('INVOICE'))   return 'invoice';
    if (et.includes('PROJECT'))   return 'project';
    if (et.includes('PAYMENT'))   return 'payment';
    return 'default';
  };

  /**
   * Get the navigation path when a notification is clicked.
   */
  const getNavigationPath = (notification) => {
    const { entity_type, entity_id } = notification;
    if (!entity_id) return null;

    const typeMap = {
      Client:   `/clients/${entity_id}`,
      Invoice:  `/invoices/${entity_id}`,
      Project:  `/projects/${entity_id}`,
      Proforma: `/proforma/${entity_id}`,
      Purchase: `/purchase/${entity_id}`,
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