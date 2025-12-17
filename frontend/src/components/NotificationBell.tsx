'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { notificationsApi } from '@/lib/api';

interface Notification {
  id: number;
  type: 'deadline' | 'nudge' | 'streak';
  title: string;
  body: string;
  related_goal_id?: number;
  related_challenge_id?: number;
  scheduled_for: string;
  read_at?: string;
  dismissed_at?: string;
  created_at: string;
}

interface NotificationResponse {
  notifications: Notification[];
  unread_count: number;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data: NotificationResponse = await notificationsApi.getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchNotifications();
    // Poll every 60 seconds for new notifications
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Mark as read and navigate
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already
    if (!notification.read_at) {
      try {
        await notificationsApi.markAsRead(notification.id);
        // Update local state
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    // Deep-link navigation
    if (notification.related_challenge_id) {
      router.push('/student'); // Today's Mission shows current challenge
    } else if (notification.related_goal_id) {
      router.push('/student'); // Goal overview is in student dashboard
    } else {
      router.push('/student'); // Default to student dashboard
    }

    setIsOpen(false);
  };

  // Dismiss notification
  const handleDismiss = async (notificationId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering navigation
    try {
      await notificationsApi.dismiss(notificationId);
      // Remove from local state
      const dismissedNotification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      // Update unread count if dismissed notification was unread
      if (dismissedNotification && !dismissedNotification.read_at) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  // Get icon for notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'deadline':
        return '⏰';
      case 'nudge':
        return '💡';
      case 'streak':
        return '🔥';
      default:
        return '📬';
    }
  };

  // If no notifications, show nothing
  if (notifications.length === 0 && !loading) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-full"
        aria-label="Notifications"
      >
        {/* Bell Icon */}
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-rose-400 to-pink-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200/50 bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                All caught up! 🎉
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`px-4 py-3 border-b border-gray-100/50 hover:bg-indigo-50/30 cursor-pointer transition-colors ${
                    !notification.read_at ? 'bg-blue-50/30' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {notification.title}
                        </p>
                        {!notification.read_at && (
                          <span className="flex-shrink-0 inline-block h-2 w-2 rounded-full bg-blue-500"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {notification.body}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notification.scheduled_for).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {/* Dismiss Button */}
                    <button
                      onClick={(e) => handleDismiss(notification.id, e)}
                      className="flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none"
                      aria-label="Dismiss"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
