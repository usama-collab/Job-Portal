import api from './axios'
import { notificationWrite } from '../lib/notification-session'

export interface Notification {
  id: number
  type: 'application_received' | 'application_status_changed'
  application_id: number | null
  job_id: number | null
  company_id: number | null
  title: string
  message: string
  created_at: string
  read_at: string | null
  target_path: string | null
}

export interface NotificationPage {
  items: Notification[]
  next_cursor: string | null
}

export async function getNotifications(limit: number, unreadOnly: boolean, cursor: string | null, signal?: AbortSignal): Promise<NotificationPage> {
  const response = await api.get('/notifications', {
    params: { limit, unread_only: unreadOnly, ...(cursor ? { cursor } : {}) }, signal,
  })
  return response.data
}

export async function getUnreadCount(signal?: AbortSignal): Promise<{ unread_count: number }> {
  return (await api.get('/notifications/unread-count', { signal })).data
}

export async function markNotificationRead(id: number): Promise<Notification> {
  const request = notificationWrite()
  try { return (await api.patch(`/notifications/${id}/read`, undefined, { signal: request.signal })).data }
  finally { request.release() }
}

export async function markAllNotificationsRead(): Promise<{ updated_count: number }> {
  const request = notificationWrite()
  try { return (await api.patch('/notifications/read-all', undefined, { signal: request.signal })).data }
  finally { request.release() }
}
