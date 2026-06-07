import { useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'

function formatTime(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (isToday) return time
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`
}

export default function MessageList({ messages, typing }) {
  const { user } = useAuth()
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-gray-500">No messages yet. Say hello!</p>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
      {messages.map((msg) => {
        const isMine = msg.sender_id === user.id
        return (
          <div
            key={msg.id}
            className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                isMine
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-gray-800 text-gray-100 rounded-bl-sm'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
              <div className={`mt-0.5 flex items-center gap-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                <span className="text-[10px] text-gray-400">{formatTime(msg.created_at)}</span>
                {isMine && (
                  <svg className="h-3 w-3 text-gray-400" viewBox="0 0 16 11" fill="currentColor">
                    <path d={msg.read ? "M11.071.653a.457.457 0 00-.304-.102.493.493 0 00-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 00-.336-.153.457.457 0 00-.335.134l-.455.455a.473.473 0 000 .665l2.757 2.755.473.473c.1.1.218.15.355.15a.544.544 0 00.374-.168l6.945-8.527a.465.465 0 00.095-.363.474.474 0 00-.177-.28z" : "M7.774.672a.422.422 0 10-.396-.745L1.582 3.23 0 1.555a.422.422 0 10-.63.562L1.34 4.24a.422.422 0 00.597.046l5.837-5.614z"}/>
                  </svg>
                )}
              </div>
            </div>
          </div>
        )
      })}
      {typing && (
        <div className="flex justify-start">
          <div className="rounded-2xl rounded-bl-sm bg-gray-800 px-4 py-3">
            <div className="flex gap-1">
              <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500" style={{ animationDelay: '0ms' }} />
              <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500" style={{ animationDelay: '150ms' }} />
              <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
