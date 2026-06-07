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
                  <>
                    {/* Read receipt: single check (sent) or double check (read) */}
                    {msg.read ? (
                      <span className="flex items-center gap-0.5 text-[10px] text-blue-400">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 22 12" fill="currentColor">
                          {/* Back check */}
                          <path d="M15.774 1.672a.422.422 0 10-.396-.745L9.582 4.23l1.34 1.405 4.852-3.963z" />
                          {/* Front check */}
                          <path d="M21.774 1.672a.422.422 0 10-.396-.745L11.582 8.23 9.34 5.855a.422.422 0 10-.63.562l2.63 2.825a.422.422 0 00.597.046l9.837-9.614z" opacity="0.9" />
                        </svg>
                      </span>
                    ) : (
                      <svg className="h-3 w-3 text-gray-400" viewBox="0 0 16 11" fill="currentColor">
                        <path d="M7.774.672a.422.422 0 10-.396-.745L1.582 3.23 0 1.555a.422.422 0 10-.63.562L1.34 4.24a.422.422 0 00.597.046l5.837-5.614z" />
                      </svg>
                    )}
                  </>
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
