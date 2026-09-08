import api from './axios'
import { notificationWrite } from '../lib/notification-session'

export interface Message {
  id: number
  sender_id: number | null
  sender_name: string
  body: string
  created_at: string
}
export interface Conversation {
  application_id: number
  conversation_id: number | null
  job_id: number
  job_title: string
  company_name: string
  applicant_name: string
  status: string
  latest_message: Message | null
  unread_count: number
}
export interface MessagePage {
  items: Message[]
  next_before_id: number | null
  next_after_id: number | null
}
export interface ConversationPage { items: Conversation[], next_cursor: number | null }
export const getConversations = async (cursor: number | null, signal?: AbortSignal): Promise<ConversationPage> =>
  (await api.get('/conversations', { params: { cursor }, signal })).data
export const getMessageCount = async (signal?: AbortSignal): Promise<{ unread_count: number }> =>
  (await api.get('/conversations/unread-count', { signal })).data
export const getConversation = async (id: number, signal?: AbortSignal): Promise<Conversation> =>
  (await api.get(`/applications/${id}/conversation`, { signal })).data
export const getMessages = async (id: number, params: { before_id?: number, after_id?: number } = {}, signal?: AbortSignal): Promise<MessagePage> =>
  (await api.get(`/applications/${id}/messages`, { params, signal })).data
export async function sendMessage(id: number, body: string, clientMessageId: string): Promise<Message> {
  const request = notificationWrite()
  try { return (await api.post(`/applications/${id}/messages`, { body, client_message_id: clientMessageId }, { signal: request.signal })).data }
  finally { request.release() }
}
export async function readConversation(id: number, messageId: number): Promise<{ last_read_message_id: number }> {
  const request = notificationWrite()
  try { return (await api.patch(`/applications/${id}/conversation/read`, { last_read_message_id: messageId }, { signal: request.signal })).data }
  finally { request.release() }
}
