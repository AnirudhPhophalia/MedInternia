import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import api, { getSocketUrl } from '../utils/api';

export interface Notification {
  _id: string;
  type: 'comment' | 'peer_review' | 'job_status' | 'webinar' | 'badge';
  message: string;
  link?: string;
  payload?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newToast, setNewToast] = useState<Notification | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // ── Recalculate unread count whenever notifications change ──
  useEffect(() => {
    setUnreadCount(notifications.filter((n) => !n.isRead).length);
  }, [notifications]);

  // ── Connect socket + fetch initial notifications ────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Fetch existing notifications from REST API using api helper
    api.get('/notifications')
      .then((res) => {
        if (res.data?.success) setNotifications(res.data.notifications);
      })
      .catch(() => { }); // Silently fail — non-critical

    // 2. Connect Socket.io with credentials (cookies)
    const socket = io(getSocketUrl(), {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // 4. Listen for real-time notifications
    socket.on('new_notification', (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setNewToast(notification); // Triggers toast popup

      // Trigger native browser push notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        new window.Notification('MedInternia Alert', {
          body: notification.message,
          icon: '/favicon.ico'
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // ── Mark single notification as read ────────────────────────
  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );

    await api.patch(`/notifications/${id}/read`).catch(() => { });
  }, []);

  // ── Mark all notifications as read ──────────────────────────
  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    await api.patch('/notifications/read-all').catch(() => { });
  }, []);

  // ── Clear toast after it's been shown ───────────────────────
  const clearToast = useCallback(() => setNewToast(null), []);

  // ── Request browser notification permission only after explicit user interaction ────────────────
  const requestNotificationPermission = useCallback(async () => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "default"
    ) {
      return Notification.permission;
    }

    return await Notification.requestPermission();
  }, []);
  
  return {
    notifications,
    unreadCount,
    newToast,
    markAsRead,
    markAllAsRead,
    clearToast,
    requestNotificationPermission,
  };


}