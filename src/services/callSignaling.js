import { supabase } from '../lib/supabase'

/**
 * WebRTC signaling via Supabase Realtime channels.
 * Instead of a custom signaling server, we use Realtime broadcast
 * to exchange SDP offers/answers and ICE candidates.
 */

let channel = null

export function getCallChannel(callId) {
  return supabase.channel(`call:${callId}`, {
    config: {
      broadcast: { self: true },
    },
  })
}

export async function sendSignal(callId, callerId, receiverId, signalType, signalData) {
  // Persist signal in the database as fallback
  const { error } = await supabase.from('call_signals').insert({
    caller_id: callerId,
    receiver_id: receiverId,
    signal_type: signalType,
    signal_data: signalData,
    call_id: callId,
  })
  if (error) console.error('Failed to persist signal:', error)

  // Also broadcast via Realtime presence/broadcast
  if (channel) {
    await channel.send({
      type: 'broadcast',
      event: signalType,
      payload: { signalData, callerId, receiverId },
    })
  }
}

export async function subscribeToCall(callId, userId, handlers) {
  const callChannel = getCallChannel(callId)
  channel = callChannel

  callChannel.on('broadcast', { event: 'offer' }, ({ payload }) => {
    if (payload.receiverId === userId && handlers.onOffer) {
      handlers.onOffer(payload.signalData, payload.callerId)
    }
  })

  callChannel.on('broadcast', { event: 'answer' }, ({ payload }) => {
    if (payload.callerId === userId || payload.receiverId === userId) {
      if (handlers.onAnswer) handlers.onAnswer(payload.signalData)
    }
  })

  callChannel.on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
    if (handlers.onIceCandidate) handlers.onIceCandidate(payload.signalData)
  })

  callChannel.on('broadcast', { event: 'end-call' }, ({ payload }) => {
    if (handlers.onEndCall) handlers.onEndCall(payload)
  })

  callChannel.on('broadcast', { event: 'mute-changed' }, ({ payload }) => {
    if (handlers.onMuteChanged) handlers.onMuteChanged(payload)
  })

  const status = await callChannel.subscribe()
  return callChannel
}

export function unsubscribeFromCall(callChannel) {
  if (callChannel) {
    supabase.removeChannel(callChannel)
  }
  channel = null
}

export async function initiateCall(callerId, receiverId) {
  const callId = crypto.randomUUID()
  const { error } = await supabase.from('call_signals').insert({
    caller_id: callerId,
    receiver_id: receiverId,
    signal_type: 'offer',
    signal_data: { type: 'call-initiated' },
    call_id: callId,
  })
  if (error) throw error
  return callId
}

export async function getPendingCalls(userId) {
  const { data, error } = await supabase
    .from('call_signals')
    .select('*, caller:caller_id(*)')
    .eq('receiver_id', userId)
    .eq('signal_type', 'offer')
    .order('created_at', { ascending: false })
    .limit(10)
  if (error) throw error
  return data
}

export function subscribeToIncomingCalls(userId, onCall) {
  return supabase
    .channel('incoming-calls')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'call_signals',
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new.signal_type === 'offer') {
          onCall(payload.new)
        }
      }
    )
    .subscribe()
}
