import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react'
import { useAuth } from './AuthContext'
import {
  subscribeToCall,
  unsubscribeFromCall,
  sendSignal,
  subscribeToIncomingCalls,
} from '../services/callSignaling'
import { supabase } from '../lib/supabase'

const CallContext = createContext(null)

const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

export function CallProvider({ children }) {
  const { user } = useAuth()
  const [callState, setCallState] = useState('idle') // idle | ringing | connecting | connected | ended
  const [callType, setCallType] = useState(null) // audio | video
  const [remoteStream, setRemoteStream] = useState(null)
  const [localStream, setLocalStream] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [callPartner, setCallPartner] = useState(null)
  const [incomingCall, setIncomingCall] = useState(null)

  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const callChannelRef = useRef(null)
  const currentCallIdRef = useRef(null)
  const screenStreamRef = useRef(null)
  const pendingCandidatesRef = useRef([])

  // Cleanup function
  const cleanupCall = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop())
      screenStreamRef.current = null
    }
    if (callChannelRef.current) {
      unsubscribeFromCall(callChannelRef.current)
      callChannelRef.current = null
    }
    setLocalStream(null)
    setRemoteStream(null)
    setIsMuted(false)
    setIsVideoOff(false)
    setIsScreenSharing(false)
    setCallState('idle')
    setCallType(null)
    setCallPartner(null)
    setIncomingCall(null)
    currentCallIdRef.current = null
    pendingCandidatesRef.current = []
  }, [])

  // Handle incoming calls via Realtime
  useEffect(() => {
    if (!user) return

    const sub = subscribeToIncomingCalls(user.id, (callSignal) => {
      if (callState === 'idle') {
        setIncomingCall(callSignal)
        setCallPartner(callSignal.caller)
        setCallState('ringing')
        currentCallIdRef.current = callSignal.call_id
      }
    })

    return () => sub.unsubscribe()
  }, [user, callState])

  const getLocalStream = useCallback(async (video = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video,
      })
      localStreamRef.current = stream
      setLocalStream(stream)
      return stream
    } catch (err) {
      console.error('Failed to get local stream:', err)
      throw err
    }
  }, [])

  const createPeerConnection = useCallback((stream) => {
    const pc = new RTCPeerConnection(RTC_CONFIG)
    pcRef.current = pc

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream)
    })

    pc.onicecandidate = (e) => {
      if (e.candidate && currentCallIdRef.current && callPartner) {
        sendSignal(
          currentCallIdRef.current,
          user.id,
          callPartner.id,
          'ice-candidate',
          e.candidate
        ).catch(console.error)
      }
    }

    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0])
    }

    pc.oniceconnectionstatechange = () => {
      if (
        pc.iceConnectionState === 'disconnected' ||
        pc.iceConnectionState === 'failed' ||
        pc.iceConnectionState === 'closed'
      ) {
        cleanupCall()
      }
    }

    return pc
  }, [user, callPartner, cleanupCall])

  // Start a call (audio or video)
  const startCall = useCallback(
    async (contact, type) => {
      if (!user) return
      try {
        const stream = await getLocalStream(type === 'video')
        const callId = crypto.randomUUID()
        currentCallIdRef.current = callId
        setCallPartner(contact)
        setCallType(type)
        setCallState('connecting')

        const pc = createPeerConnection(stream)

        // Subscribe to the call channel
        const channel = await subscribeToCall(callId, user.id, {
          onAnswer: async (answerDesc) => {
            await pc.setRemoteDescription(new RTCSessionDescription(answerDesc))
            // Send any pending ICE candidates
            for (const candidate of pendingCandidatesRef.current) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate))
            }
            pendingCandidatesRef.current = []
            setCallState('connected')
          },
          onIceCandidate: async (candidate) => {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate))
            } else {
              pendingCandidatesRef.current.push(candidate)
            }
          },
          onEndCall: () => {
            cleanupCall()
          },
        })
        callChannelRef.current = channel

        // Create and send offer
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        await sendSignal(callId, user.id, contact.id, 'offer', offer)
        // Also broadcast the offer via Realtime
        await channel.send({
          type: 'broadcast',
          event: 'offer',
          payload: { signalData: offer, callerId: user.id, receiverId: contact.id },
        })
      } catch (err) {
        console.error('Failed to start call:', err)
        cleanupCall()
      }
    },
    [user, getLocalStream, createPeerConnection, cleanupCall]
  )

  // Accept an incoming call
  const acceptCall = useCallback(async () => {
    if (!user || !incomingCall || !callPartner) return
    try {
      // First, fetch the offer from the database to determine if it's a video call
      const { data: offerData } = await supabase
        .from('call_signals')
        .select('*')
        .eq('call_id', currentCallIdRef.current)
        .eq('signal_type', 'offer')
        .single()

      const hasVideo = offerData?.signal_data?.sdp?.includes('m=video')
      const isVideoCall = hasVideo || callType === 'video'
      setCallType(isVideoCall ? 'video' : 'audio')
      setCallState('connecting')

      // Now create local stream with correct video setting
      const stream = await getLocalStream(isVideoCall)

      const pc = createPeerConnection(stream)

      const channel = await subscribeToCall(currentCallIdRef.current, user.id, {
        onIceCandidate: async (candidate) => {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
          } else {
            pendingCandidatesRef.current.push(candidate)
          }
        },
        onEndCall: () => {
          cleanupCall()
        },
      })
      callChannelRef.current = channel

      if (offerData?.signal_data) {
        await pc.setRemoteDescription(new RTCSessionDescription(offerData.signal_data))

        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        await sendSignal(
          currentCallIdRef.current,
          user.id,
          callPartner.id,
          'answer',
          answer
        )
        await channel.send({
          type: 'broadcast',
          event: 'answer',
          payload: { signalData: answer, callerId: callPartner.id, receiverId: user.id },
        })

        // Send any pending ICE candidates
        for (const candidate of pendingCandidatesRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        }
        pendingCandidatesRef.current = []

        setCallState('connected')
      }
    } catch (err) {
      console.error('Failed to accept call:', err)
      cleanupCall()
    }
  }, [user, incomingCall, callPartner, getLocalStream, createPeerConnection, cleanupCall])

  // Reject an incoming call
  const rejectCall = useCallback(async () => {
    if (currentCallIdRef.current && callPartner) {
      await supabase
        .from('call_signals')
        .delete()
        .eq('call_id', currentCallIdRef.current)
    }
    cleanupCall()
  }, [callPartner, cleanupCall])

  // End the current call
  const endCall = useCallback(async () => {
    if (currentCallIdRef.current && callChannelRef.current) {
      await callChannelRef.current.send({
        type: 'broadcast',
        event: 'end-call',
        payload: { userId: user.id },
      })
      await supabase
        .from('call_signals')
        .delete()
        .eq('call_id', currentCallIdRef.current)
    }
    cleanupCall()
  }, [user, cleanupCall])

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }, [])

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOff(!videoTrack.enabled)
      }
    }
  }, [])

  // Screen sharing
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Stop screen sharing, switch back to camera
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop())
        screenStreamRef.current = null
      }

      // Get camera stream again
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        })
        const videoTrack = stream.getVideoTracks()[0]
        const sender = pcRef.current?.getSenders().find((s) => s.track?.kind === 'video')
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack)
        }
        // Stop old tracks
        localStreamRef.current?.getVideoTracks().forEach((t) => t.stop())
        localStreamRef.current = stream
        setLocalStream(stream)
      } catch (err) {
        console.error('Failed to switch back to camera:', err)
      }
      setIsScreenSharing(false)
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        })
        screenStreamRef.current = screenStream

        const videoTrack = screenStream.getVideoTracks()[0]
        const sender = pcRef.current?.getSenders().find((s) => s.track?.kind === 'video')

        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack)
        }

        // When user stops sharing via browser UI
        videoTrack.onended = () => {
          toggleScreenShare()
        }

        setIsScreenSharing(true)
      } catch (err) {
        console.error('Failed to start screen share:', err)
      }
    }
  }, [isScreenSharing])

  const value = {
    callState,
    callType,
    callPartner,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isScreenSharing,
    incomingCall,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    cleanupCall,
  }

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>
}

export function useCall() {
  const ctx = useContext(CallContext)
  if (!ctx) throw new Error('useCall must be used within a CallProvider')
  return ctx
}
