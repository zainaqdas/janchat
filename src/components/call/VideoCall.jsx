import { useRef, useEffect, useState, useCallback } from 'react'
import { useCall } from '../../contexts/CallContext'

const CONTROLS_HIDE_DELAY = 3000

export default function VideoCall() {
  const {
    callState,
    callType,
    callPartner,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isScreenSharing,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
  } = useCall()

  const [controlsVisible, setControlsVisible] = useState(true)
  const hideTimerRef = useRef(null)
  const containerRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_DELAY)
  }, [])

  const showControls = useCallback(() => {
    setControlsVisible(true)
    scheduleHide()
  }, [scheduleHide])

  // Show controls on mount, then hide after delay
  useEffect(() => {
    setControlsVisible(true)
    scheduleHide()
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [scheduleHide])

  // Mouse/touch events on the container
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const PROXIMITY_THRESHOLD = 80 // px from bottom to trigger controls

    const onMouseMove = (e) => {
      const nearBottom = window.innerHeight - e.clientY <= PROXIMITY_THRESHOLD
      if (nearBottom) showControls()
    }

    const onTouchStart = () => showControls()
    const onClick = () => showControls()
    const onMouseLeave = () => scheduleHide()

    container.addEventListener('mousemove', onMouseMove)
    container.addEventListener('touchstart', onTouchStart)
    container.addEventListener('click', onClick)
    container.addEventListener('mouseleave', onMouseLeave)

    return () => {
      container.removeEventListener('mousemove', onMouseMove)
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('click', onClick)
      container.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [showControls, scheduleHide])

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  if (callState === 'idle' || callType !== 'video') return null

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black"
    >
      {/* Remote video (full screen) */}
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-800 text-4xl font-bold text-white">
              {callPartner?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <p className="text-gray-400">Connecting…</p>
          </div>
        )}
      </div>

      {/* Top bar - caller name (fades with controls) */}
      <div
        className={`absolute left-0 right-0 top-0 z-10 transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-gradient-to-b from-black/70 to-transparent px-4 pt-4 pb-10">
          <div className="flex items-center justify-center">
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white backdrop-blur-sm">
              {callPartner?.username}
            </span>
          </div>
        </div>
      </div>

      {/* Local video overlay (always visible, slightly dimmed when controls show) */}
      <div className="absolute bottom-24 right-4 z-10 h-48 w-36 overflow-hidden rounded-xl border-2 border-gray-700 bg-gray-800 shadow-lg transition-opacity duration-300 md:bottom-28">
        {localStream && (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover ${isVideoOff ? 'hidden' : ''}`}
          />
        )}
        {isVideoOff && (
          <div className="flex h-full items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 text-lg font-bold text-white">
              {callPartner?.username?.[0]?.toUpperCase() || '?'}
            </div>
          </div>
        )}
      </div>

      {/* Controls bar - slides up from bottom */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 transition-all duration-300 ${
          controlsVisible
            ? 'translate-y-0 opacity-100'
            : 'translate-y-4 opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-gradient-to-t from-black/80 via-black/50 to-transparent px-4 pt-12 pb-8">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={toggleMute}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-all active:scale-90 ${
                isMuted
                  ? 'bg-red-600 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>

            <button
              onClick={toggleVideo}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-all active:scale-90 ${
                isVideoOff
                  ? 'bg-red-600 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              title={isVideoOff ? 'Camera on' : 'Camera off'}
            >
              {isVideoOff ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>

            <button
              onClick={toggleScreenShare}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-all active:scale-90 ${
                isScreenSharing
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>

            <button
              onClick={endCall}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white transition-all hover:bg-red-700 active:scale-90"
              title="End call"
            >
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
