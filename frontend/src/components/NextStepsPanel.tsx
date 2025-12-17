'use client';

import { useEffect, useState } from 'react';
import { notificationsApi } from '@/lib/api';

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  related_goal_id: number | null;
  related_challenge_id: number | null;
  scheduled_for: string;
  created_at: string;
  read_at: string | null;
  dismissed_at: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  is_active: boolean;
}

export default function NextStepsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      const data = await notificationsApi.getNotifications();
      // Show only top 3 notifications
      setNotifications(data.notifications.slice(0, 3));
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleDismiss = async (notificationId: number) => {
    try {
      await notificationsApi.dismiss(notificationId);
      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  // Hide panel if no notifications
  if (loading || notifications.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-amber-50/50 via-white to-yellow-50/50 rounded-2xl p-6 border border-amber-100/50 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="text-amber-500">📌</span>
          Next Steps
        </h3>
        <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
          {notifications.length} reminder{notifications.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="bg-white rounded-xl p-4 border border-gray-100 hover:border-amber-200 transition-all group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  {notification.type === 'deadline' && '⏰'}
                  {notification.type === 'nudge' && '💡'}
                  {notification.type === 'streak' && '🔥'}
                  <span>{notification.title}</span>
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  {notification.body}
                </p>

                {/* CTA Button (placeholder - can be customized based on notification type) */}
                <button
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 px-3 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                  onClick={() => {
                    // Navigate to relevant page based on notification type
                    // For now, just mark as read
                    notificationsApi.markAsRead(notification.id);
                  }}
                >
                  View →
                </button>
              </div>

              {/* Dismiss Button */}
              <button
                onClick={() => handleDismiss(notification.id)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Dismiss"
              >
                <svg
                  className="h-5 w-5"
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
        ))}
      </div>
    </div>
  );
}
