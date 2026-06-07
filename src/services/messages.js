import { supabase } from '../lib/supabase'

export async function getMessages(userId1, userId2, limit = 50) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`
    )
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []).reverse()
}

export async function sendMessage(senderId, receiverId, message) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: senderId, receiver_id: receiverId, message })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function markAsRead(messageIds) {
  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .in('id', messageIds)
  if (error) throw error
}

export async function getUnreadCount(userId) {
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .eq('read', false)
  if (error) throw error
  return count || 0
}

export async function getUnreadCountBySender(userId) {
  const { data, error } = await supabase
    .from('messages')
    .select('sender_id, count')
    .eq('receiver_id', userId)
    .eq('read', false)
  if (error) throw error
  const counts = {}
  for (const row of data || []) {
    counts[row.sender_id] = (counts[row.sender_id] || 0) + 1
  }
  return counts
}

export function subscribeToMessages(userId, callback) {
  return supabase
    .channel('messages-channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => callback(payload.new)
    )
    .subscribe()
}

export function subscribeToSentMessages(userId, callback) {
  return supabase
    .channel('sent-messages-channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${userId}`,
      },
      (payload) => callback(payload.new)
    )
    .subscribe()
}
