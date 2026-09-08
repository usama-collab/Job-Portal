import type { Message } from '../api/messages'

export function mergeMessages(existing: Message[], incoming: Message[]) {
  return [...new Map([...existing, ...incoming].map((message) => [message.id, message])).values()].sort((a, b) => a.id - b.id)
}
