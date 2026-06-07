import { useCall } from '../../contexts/CallContext'

export default function IncomingCall() {
  const { incomingCall, callPartner, callState, acceptCall, rejectCall } = useCall()

  if (callState !== 'ringing' || !callPartner) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-gray-900 p-8 text-center shadow-2xl">
        <div className="mb-4 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-3xl font-bold text-white">
            {callPartner.username?.[0]?.toUpperCase() || '?'}
          </div>
        </div>
        <h2 className="text-xl font-semibold text-white">{callPartner.username}</h2>
        <p className="mt-1 text-gray-400">Incoming call…</p>

        <div className="mt-8 flex justify-center gap-6">
          <button
            onClick={rejectCall}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700"
            title="Decline"
          >
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={acceptCall}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white transition hover:bg-green-700"
            title="Accept"
          >
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
