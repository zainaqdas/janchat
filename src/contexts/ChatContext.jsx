import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import {
  getMessages,
  sendMessage as sendMessageService,
  markAsRead,
  subscribeToMessages,
  subscribeToSentMessages,
  getUnreadCountBySender,
} from '../services/messages'
import { getAcceptedContacts } from '../services/contacts'
import { supabase } from '../lib/supabase'

const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const { user } = useAuth()
  const [contacts, setContacts] = useState([])
  const [activeChat, setActiveChat] = useState(null) // { contact, messages }
  const [messages, setMessages] = useState([])
  const [unreadCounts, setUnreadCounts] = useState({})
  const [typingUsers, setTypingUsers] = useState({})
  const typingTimeouts = useRef({})
  const activeChatUserRef = useRef(null)

  // Keep a ref in sync with activeChat for use in callbacks
  useEffect(() => {
    activeChatUserRef.current = activeChat
  }, [activeChat])

  // Load contacts
  const loadContacts = useCallback(async () => {
    if (!user) return
    try {
      const data = await getAcceptedContacts(user.id)
      setContacts(data || [])

      // Load unread counts
      const counts = await getUnreadCountBySender(user.id)
      setUnreadCounts(counts)
    } catch (err) {
      console.error('Failed to load contacts:', err)
    }
  }, [user])

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  // Load messages when active chat changes
  const loadMessages = useCallback(async (contactId) => {
    if (!user || !contactId) return
    try {
      const msgs = await getMessages(user.id, contactId)
      setMessages(msgs)

      // Mark unread messages as read
      const unreadIds = msgs
        .filter((m) => m.receiver_id === user.id && !m.read)
        .map((m) => m.id)
      if (unreadIds.length > 0) {
        await markAsRead(unreadIds)
        setUnreadCounts((prev) => ({ ...prev, [contactId]: 0 }))
      }
    } catch (err) {
      console.error('Failed to load messages:', err)
    }
  }, [user])

  useEffect(() => {
    if (activeChat?.contact?.id) {
      loadMessages(activeChat.contact.id)
    }
  }, [activeChat?.contact?.id, loadMessages])

  // Subscribe to realtime messages
  useEffect(() => {
    if (!user) return

    const incomingSub = subscribeToMessages(user.id, (newMsg) => {
      // Only add to messages if it's for the active chat
      const activeChatId = activeChatUserRef.current?.contact?.id
      if (activeChatId === newMsg.sender_id) {
        setMessages((prev) => [...prev, newMsg])
        markAsRead([newMsg.id]).catch(console.error)
      } else {
        setUnreadCounts((prev) => ({
          ...prev,
          [newMsg.sender_id]: (prev[newMsg.sender_id] || 0) + 1,
        }))
      }
    })

    const sentSub = subscribeToSentMessages(user.id, (newMsg) => {
      // Only add to messages if it's for the active chat
      const activeChatId = activeChatUserRef.current?.contact?.id
      if (activeChatId === newMsg.receiver_id) {
        setMessages((prev) => [...prev, newMsg])
      }
    })

    // Subscribe to message updates (read receipts)
    // When the recipient reads our messages, update them in real-time
    const readReceiptSub = supabase
      .channel(`read-receipts-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new
          // Only react to read status changes
          if (updated.read) {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === updated.id ? { ...msg, read: true } : msg))
            )
          }
        }
      )
      .subscribe()

    return () => {
      incomingSub.unsubscribe()
      sentSub.unsubscribe()
      supabase.removeChannel(readReceiptSub)
    }
  }, [user])

  const typingChannelRef = useRef(null)

  // Maintain a persistent typing channel for both sending and receiving
  useEffect(() => {
    if (!user) return

    const channel = supabase.channel(`typing-indicators-${user.id}`)
    typingChannelRef.current = channel

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.senderId !== user.id) {
          setTypingUsers((prev) => ({ ...prev, [payload.senderId]: true }))

          if (typingTimeouts.current[payload.senderId]) {
            clearTimeout(typingTimeouts.current[payload.senderId])
          }
          typingTimeouts.current[payload.senderId] = setTimeout(() => {
            setTypingUsers((prev) => ({ ...prev, [payload.senderId]: false }))
          }, 3000)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      typingChannelRef.current = null
      Object.values(typingTimeouts.current).forEach(clearTimeout)
    }
  }, [user])

  const sendMessage = useCallback(async (receiverId, message) => {
    if (!user || !message.trim()) return
    try {
      await sendMessageService(user.id, receiverId, message.trim())
    } catch (err) {
      console.error('Failed to send message:', err)
    }
  }, [user])

  const sendTypingIndicator = useCallback(async (receiverId) => {
    if (!user || !typingChannelRef.current) return
    await typingChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { senderId: user.id, receiverId },
    })
  }, [user])

  const selectChat = useCallback((contact) => {
    setActiveChat({ contact, messages: [] })
  }, [])

  const clearUnread = useCallback((senderId) => {
    setUnreadCounts((prev) => ({ ...prev, [senderId]: 0 }))
  }, [])

  const value = {
    contacts,
    activeChat,
    messages,
    unreadCounts,
    typingUsers,
    selectChat,
    sendMessage,
    sendTypingIndicator,
    loadContacts,
    loadMessages,
    clearUnread,
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within a ChatProvider')
  return ctx
}
