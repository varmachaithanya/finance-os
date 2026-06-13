import { api } from './api';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsListResponse {
  data: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export const listNotifications = (params?: { page?: number; limit?: number; is_read?: boolean; type?: string }) =>
  api.get<NotificationsListResponse>('/notifications', { params }).then(r => r.data);

export const getUnreadCount = () =>
  api.get<UnreadCountResponse>('/notifications/count').then(r => r.data);

export const markAsRead = (id: string) =>
  api.patch(`/notifications/${id}/read`).then(r => r.data);

export const markAllAsRead = () =>
  api.patch('/notifications/read-all').then(r => r.data);

export const deleteNotification = (id: string) =>
  api.delete(`/notifications/${id}`).then(r => r.data);
