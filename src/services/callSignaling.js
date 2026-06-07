import { supabase } from '../lib/supabase'

/**
 * WebRTC signaling via Supabase Realtime channels.
 * Instead of a custom signaling server, we use Realtime broadcast
 * to exchange SDP offers/answers and ICE candidates.
 */

export function getCallChannel(callId) {
  return supabase.channel(`call:${callId}`, {
    config: {
      broadcast: { self: true },
    },
  })
}

// Persist a signal in the database (broadcast is handled by the caller via their channel ref)
export async function persistSignal(callId, callerId, receiverId, signalType, signalData) {
  const { error } = await supabase.from('call_signals').insert({
    caller_id: callerId,
    receiver_id: receiverId,
    signal_type: signalType,
    signal_data: signalData,
    call_id: callId,
  })
  if (error) console.error('Failed to persist signal:', error)
}

export async function subscribeToCall(callId, userId, handlers) {
  const callChannel = getCallChannel(callId)

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
}

export function subscribeToIncomingCalls(userId, onCall) {
  return supabase
    .channel(`incoming-calls-${userId}`)
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
