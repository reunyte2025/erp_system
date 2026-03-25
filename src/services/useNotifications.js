import { useState, useEffect, useCallback, useRef } from 'react';
import api from './api';

/**
 * useNotifications Hook
 *
 * Full-featured notification system using your existing api.js.
 * Bearer token is auto-attached by the api.js interceptor.
 *
 * API Endpoints:
 * - GET    /api/usernotification/get_all_notifications/   → fetch all
 * - PUT    /api/usernotification/read_notification/?id=   → mark single as read
 * - DELETE /api/usernotification/remove_notification/?id= → remove single
 * - DELETE /api/usernotification/remove_all_notifications/ → clear all (bulk)
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

      const raw = response.data?.data;

      const data = Array.isArray(raw?.notification)
        ? raw.notification
        : Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.results)
        ? raw.results
        : Array.isArray(response.data)
        ? response.data
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
  const markAsRead = useCallback(async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    try {
      await api.put('/usernotification/read_notification/', null, {
        params: { id },
      });
    } catch (err) {
      console.error('Failed to mark notification as read:', err.message);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: false } : n))
      );
    }
  }, []);

  // ─── MARK ALL AS READ ─────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    const unreadIds = notifications
      .filter((n) => !n.is_read)
      .map((n) => n.id);

    if (unreadIds.length === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    try {
      await Promise.all(
        unreadIds.map((id) =>
          api.put('/usernotification/read_notification/', null, { params: { id } })
        )
      );
    } catch (err) {
      console.error('Failed to mark all as read:', err.message);
      fetchNotifications();
    }
  }, [notifications, fetchNotifications]);

  // ─── REMOVE SINGLE ────────────────────────────────────────────────────────
  const removeNotification = useCallback(async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await api.delete('/usernotification/remove_notification/', {
        params: { id },
      });
    } catch (err) {
      console.error('Failed to remove notification:', err.message);
      fetchNotifications();
    }
  }, [fetchNotifications]);

  // ─── CLEAR ALL — uses bulk endpoint ───────────────────────────────────────
  /**
   * Uses DELETE /api/usernotification/remove_all_notifications/
   * which is available per the API docs screenshot.
   * Falls back to individual deletes if the bulk endpoint fails.
   */
  const clearAllNotifications = useCallback(async () => {
    if (notifications.length === 0) return;

    // Optimistic clear
    const backup = [...notifications];
    setNotifications([]);

    try {
      await api.delete('/usernotification/remove_all_notifications/');
    } catch (err) {
      console.error('Bulk clear failed, trying individual deletes:', err.message);
      // Fallback: delete one by one
      try {
        await Promise.all(
          backup.map((n) =>
            api.delete('/usernotification/remove_notification/', { params: { id: n.id } })
          )
        );
      } catch (fallbackErr) {
        console.error('Individual clear also failed:', fallbackErr.message);
        // Restore on total failure
        setNotifications(backup);
        fetchNotifications();
      }
    }
  }, [notifications, fetchNotifications]);

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  /**
   * Build a human-readable notification message from event_type + metadata.
   * Handles all event types including Quotation, Vendor, Purchase Order.
   */
  const getNotificationText = (notification) => {
    const { event_type, entity_type, metadata } = notification;
    const meta = typeof metadata === 'object' && metadata !== null ? metadata : {};
    const et = (event_type || '').toUpperCase();

    // ── Proforma events ────────────────────────────────────────────────────
    if (et === 'PROFORMA_APPROVED') {
      const num = meta.proforma_number || '';
      const by  = meta.by || '';
      return num ? `Proforma #${num} approved${by ? ` by ${by}` : ''}` : 'Proforma was approved';
    }
    if (et === 'PROFORMA_SUBMITTED') {
      const num = meta.proforma_number || '';
      const by  = meta.by || '';
      return num ? `Proforma #${num} submitted${by ? ` by ${by}` : ''}` : 'Proforma was submitted';
    }
    if (et === 'PROFORMA_REJECTED') {
      const num = meta.proforma_number || '';
      const by  = meta.by || '';
      return num ? `Proforma #${num} rejected${by ? ` by ${by}` : ''}` : 'Proforma was rejected';
    }
    if (et === 'PROFORMA_CREATED') {
      const num = meta.proforma_number || '';
      return num ? `Proforma #${num} created` : 'New proforma created';
    }

    // ── Quotation events ───────────────────────────────────────────────────
    if (et === 'QUOTATION_CREATED' || et === 'QUOTATION_GENERATED') {
      const num = meta.quotation_number || meta.reference || '';
      return num ? `Quotation #${num} created` : 'New quotation created';
    }
    if (et === 'QUOTATION_UPDATED') {
      const num = meta.quotation_number || '';
      return num ? `Quotation #${num} updated` : 'Quotation updated';
    }
    if (et === 'QUOTATION_APPROVED') {
      const num = meta.quotation_number || '';
      return num ? `Quotation #${num} approved` : 'Quotation approved';
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
    if (et === 'PROJECT_UPDATED') {
      const name = meta.project_name || meta.name || '';
      return name ? `Project updated: ${name}` : 'Project updated';
    }

    // ── Vendor events ──────────────────────────────────────────────────────
    if (et === 'VENDOR_CREATED') {
      const name = meta.vendor_name || meta.name || '';
      return name ? `New vendor added: ${name}` : 'New vendor added';
    }
    if (et === 'VENDOR_UPDATED') {
      const name = meta.vendor_name || meta.name || '';
      return name ? `Vendor updated: ${name}` : 'Vendor updated';
    }

    // ── Purchase Order events ──────────────────────────────────────────────
    if (et === 'PURCHASE_ORDER_CREATED' || et === 'PURCHASE_CREATED') {
      const num = meta.po_number || meta.purchase_number || meta.reference || '';
      return num ? `Purchase order created: ${num}` : 'New purchase order created';
    }
    if (et === 'PURCHASE_ORDER_APPROVED' || et === 'PURCHASE_APPROVED') {
      const num = meta.po_number || '';
      return num ? `Purchase order #${num} approved` : 'Purchase order approved';
    }
    if (et === 'PURCHASE_ORDER_UPDATED' || et === 'PURCHASE_UPDATED') {
      return 'Purchase order updated';
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
   * Returns: 'proforma' | 'quotation' | 'client' | 'invoice' | 'project' |
   *          'payment' | 'vendor' | 'purchase' | 'default'
   */
  const getNotificationCategory = (notification) => {
    const et = (notification.event_type || '').toUpperCase();
    if (et.includes('PROFORMA'))  return 'proforma';
    // If the backend sets entity_type='Purchase' on the notification, it's a PO
    if (et.includes('QUOTATION')) return notification.entity_type === 'Purchase' ? 'purchase' : 'quotation';
    if (et.includes('CLIENT'))    return 'client';
    if (et.includes('INVOICE'))   return 'invoice';
    if (et.includes('PROJECT'))   return 'project';
    if (et.includes('PAYMENT'))   return 'payment';
    if (et.includes('VENDOR'))    return 'vendor';
    if (et.includes('PURCHASE'))  return 'purchase';

    // Fallback to entity_type
    const etype = (notification.entity_type || '').toLowerCase();
    if (etype.includes('proforma'))  return 'proforma';
    if (etype.includes('quotation')) return 'quotation';
    if (etype.includes('client'))    return 'client';
    if (etype.includes('invoice'))   return 'invoice';
    if (etype.includes('project'))   return 'project';
    if (etype.includes('vendor'))    return 'vendor';
    if (etype.includes('purchase'))  return 'purchase';

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
      Vendor:   `/vendors/${entity_id}`,
      Quotation:`/quotations/${entity_id}`,
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