import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useChat } from '../../contexts/ChatContext'
import { searchUsers } from '../../services/auth'
import { sendContactRequest } from '../../services/contacts'

function OnlineIndicator({ lastSeen }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])

  const isOnline = lastSeen && (now - new Date(lastSeen).getTime() < 120000)

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`h-2 w-2 rounded-full ${
          isOnline ? 'bg-green-500' : 'bg-gray-600'
        }`}
      />
      <span className="text-xs text-gray-500">
        {isOnline ? 'Online' : lastSeen ? formatLastSeen(lastSeen) : 'Offline'}
      </span>
    </div>
  )
}

function formatLastSeen(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

export default function Sidebar() {
  const { user, profile } = useAuth()
  const { contacts, unreadCounts, selectChat, loadContacts, activeChat } = useChat()
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [addingContact, setAddingContact] = useState(null)

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  // Search users
  useEffect(() => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await searchUsers(query)
        setSearchResults(results.filter((u) => u.id !== user.id))
      } catch (err) {
        console.error(err)
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, user])

  const handleAddContact = async (contactId) => {
    setAddingContact(contactId)
    try {
      await sendContactRequest(user.id, contactId)
      setQuery('')
      setSearchResults([])
    } catch (err) {
      console.error(err)
    } finally {
      setAddingContact(null)
    }
  }

  const handleSelectContact = (contact) => {
    selectChat(contact)
    navigate(`/chat/${contact.id}`)
  }

  const contactList = contacts.filter((c) => c.contact)

  return (
    <div className="flex h-full flex-col border-r border-gray-800 bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <h1 className="text-lg font-bold text-white">call</h1>
        <button
          onClick={() => navigate('/settings')}
          className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-800 hover:text-white"
          title="Settings"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="relative border-b border-gray-800 p-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users…"
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
        {searching && (
          <div className="absolute right-5 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-blue-500" />
          </div>
        )}

        {/* Search results dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute left-3 right-3 top-full z-50 mt-1 rounded-lg border border-gray-700 bg-gray-800 shadow-lg">
            {searchResults.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-700"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                    {u.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="text-sm text-white">{u.username}</span>
                </div>
                <button
                  onClick={() => handleAddContact(u.id)}
                  disabled={addingContact === u.id}
                  className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {addingContact === u.id ? '…' : 'Add'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        {contactList.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500">
            <svg className="mb-2 h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-sm">No contacts yet</p>
            <p className="mt-1 text-xs">Search for users above to add them</p>
          </div>
        ) : (
          contactList.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSelectContact(c.contact)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-800 ${
                activeChat?.contact?.id === c.contact?.id ? 'bg-gray-800' : ''
              }`}
            >
              <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                {c.contact?.username?.[0]?.toUpperCase() || '?'}
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-gray-900 bg-green-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">
                    {c.contact?.username || 'Unknown'}
                  </span>
                  {unreadCounts[c.contact?.id] > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-bold text-white">
                      {unreadCounts[c.contact?.id]}
                    </span>
                  )}
                </div>
                <OnlineIndicator
                  lastSeen={c.contact?.last_seen}
                />
              </div>
            </button>
          ))
        )}
      </div>

      {/* User info footer */}
      <div className="border-t border-gray-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
            {profile?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <span className="text-sm text-gray-300">{profile?.username || 'User'}</span>
        </div>
      </div>
    </div>
  )
}
