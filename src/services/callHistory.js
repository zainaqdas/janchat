import { supabase } from '../lib/supabase'

/**
 * Record a new call in history (called when a call starts).
 */
export async function recordCall(callId, callerId, receiverId, callType) {
  const { error } = await supabase.from('call_history').insert({
    call_id: callId,
    caller_id: callerId,
    receiver_id: receiverId,
    call_type: callType,
    status: 'missed', // will be updated when call ends
    started_at: new Date().toISOString(),
  })
  if (error) console.error('Failed to record call:', error)
}

/**
 * Update the call status and duration when a call ends.
 */
export async function updateCallStatus(callId, status, duration) {
  const { error } = await supabase
    .from('call_history')
    .update({
      status,
      duration: Math.floor(duration),
      ended_at: new Date().toISOString(),
    })
    .eq('call_id', callId)

  if (error) console.error('Failed to update call status:', error)
}

/**
 * Fetch call history for a user, ordered by most recent first.
 * Includes the other participant's profile info.
 */
export async function getCallHistory(userId) {
  const { data, error } = await supabase
    .from('call_history')
    .select('*, caller:caller_id(id, username, avatar_url), receiver:receiver_id(id, username, avatar_url)')
    .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('started_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Failed to fetch call history:', error)
    return []
  }

  return data.map((entry) => ({
    ...entry,
    // Determine the "other" participant
    otherUser:
      entry.caller_id === userId ? entry.receiver : entry.caller,
    // Determine if the current user was the caller
    isCaller: entry.caller_id === userId,
  }))
}
