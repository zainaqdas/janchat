import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useChat } from '../../contexts/ChatContext'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import { useCall } from '../../contexts/CallContext'
import { useNavigate } from 'react-router-dom'

export default function ChatWindow() {
  const { user } = useAuth()
  const { activeChat, messages, sendMessage, sendTypingIndicator, typingUsers } = useChat()
  const { startCall, callState } = useCall()
  const navigate = useNavigate()
  const [callMenuOpen, setCallMenuOpen] = useState(false)

  if (!activeChat?.contact) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
            <svg className="h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-gray-400">Select a conversation</h2>
          <p className="mt-1 text-sm text-gray-600">
            Choose a contact from the sidebar to start chatting
          </p>
        </div>
      </div>
    )
  }

  const contact = activeChat.contact
  const isTyping = typingUsers[contact.id]

  const handleSend = useCallback(
    (text) => {
      sendMessage(contact.id, text)
    },
    [contact.id, sendMessage]
  )

  const handleTyping = useCallback(() => {
    sendTypingIndicator(contact.id)
  }, [contact.id, sendTypingIndicator])

  const handleAudioCall = () => {
    setCallMenuOpen(false)
    startCall(contact, 'audio')
  }

  const handleVideoCall = () => {
    setCallMenuOpen(false)
    startCall(contact, 'video')
  }

  return (
    <div className="flex flex-1 flex-col bg-gray-950">
      {/* Chat header */}
      <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/contacts')}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-800 hover:text-white md:hidden"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
            {contact.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h2 className="text-sm font-medium text-white">{contact.username}</h2>
            {isTyping ? (
              <span className="text-xs text-blue-400">typing…</span>
            ) : (
              <span className="text-xs text-gray-500">Online</span>
            )}
          </div>
        </div>

        {/* Call buttons */}
        <div className="relative flex items-center gap-1">
          <button
            onClick={handleAudioCall}
            disabled={callState !== 'idle'}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-800 hover:text-green-400 disabled:opacity-30"
            title="Audio call"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
          <button
            onClick={handleVideoCall}
            disabled={callState !== 'idle'}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-800 hover:text-blue-400 disabled:opacity-30"
            title="Video call"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <MessageList messages={messages} typing={isTyping} />

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        onTyping={handleTyping}
        disabled={callState !== 'idle'}
      />
    </div>
  )
}
