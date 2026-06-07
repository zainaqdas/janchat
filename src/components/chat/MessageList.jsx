import { useEffect, useRef, useMemo } from 'react'
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

export default function MessageList({ messages, typing, contact }) {
  const { user } = useAuth()
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Find the last message that the recipient has read
  const lastReadIndex = useMemo(() => {
    if (!messages || !contact) return -1
    let lastIdx = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      // Only consider messages sent by the current user
      if (msg.sender_id === user.id && msg.read) {
        lastIdx = i
        break
      }
    }
    return lastIdx
  }, [messages, user, contact])

  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-gray-500">No messages yet. Say hello!</p>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
      {messages.map((msg, idx) => {
        const isMine = msg.sender_id === user.id
        return (
          <div key={msg.id}>
            <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                isMine
                  ? 'bg-gray-700 text-white rounded-br-sm'
                  : 'bg-gray-900 text-gray-100 rounded-bl-sm'
              }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                <div className={`mt-0.5 flex items-center gap-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[10px] text-gray-400">{formatTime(msg.created_at)}</span>
                  {isMine && (
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        msg.read ? 'bg-blue-400' : 'bg-gray-400'
                      }`}
                    />
                  )}
                </div>
              </div>
            </div>
            {/* Seen avatar bubble - shown below the last read message from the current user */}
            {isMine && lastReadIndex === idx && contact && (
              <div className="mt-1 flex items-center justify-end gap-1.5 pr-1">
                <span className="text-[10px] text-gray-500">Seen</span>
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[8px] font-medium text-white">
                  {contact.username?.[0]?.toUpperCase() || '?'}
                </div>
              </div>
            )}
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
