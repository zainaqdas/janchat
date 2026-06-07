import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useChat } from '../contexts/ChatContext'
import { searchUsers } from '../services/auth'
import { getContactRequests, acceptContactRequest, removeContact, sendContactRequest } from '../services/contacts'

export default function Contacts() {
  const { user } = useAuth()
  const { contacts, loadContacts, selectChat } = useChat()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [requests, setRequests] = useState([])
  const [searching, setSearching] = useState(false)
  const [addingContact, setAddingContact] = useState(null)
  const [acceptingId, setAcceptingId] = useState(null)
  const [removingId, setRemovingId] = useState(null)

  useEffect(() => {
    loadContacts()
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      const data = await getContactRequests(user.id)
      setRequests(data || [])
    } catch (err) {
      console.error(err)
    }
  }

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

  const handleAccept = async (id) => {
    setAcceptingId(id)
    try {
      await acceptContactRequest(id)
      loadRequests()
      loadContacts()
    } catch (err) {
      console.error(err)
    } finally {
      setAcceptingId(null)
    }
  }

  const handleRemove = async (id) => {
    setRemovingId(id)
    try {
      await removeContact(id)
      loadContacts()
    } catch (err) {
      console.error(err)
    } finally {
      setRemovingId(null)
    }
  }

  const handleChat = (contact) => {
    selectChat(contact)
    navigate(`/chat/${contact.id}`)
  }

  const acceptedContacts = contacts.filter((c) => c.status === 'accepted' && c.contact)

  return (
    <div className="flex h-full flex-col bg-gray-950">
      <div className="border-b border-gray-800 bg-gray-900 px-4 py-3">
        <h1 className="text-lg font-bold text-white">Contacts</h1>
      </div>

      {/* Search */}
      <div className="relative border-b border-gray-800 p-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users by username…"
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
        {searching && (
          <div className="absolute right-5 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-blue-500" />
          </div>
        )}
        {searchResults.length > 0 && (
          <div className="absolute left-3 right-3 z-50 mt-1 rounded-lg border border-gray-700 bg-gray-800 shadow-lg">
            {searchResults.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-700">
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

      {/* Contact requests */}
      {requests.length > 0 && (
        <div className="border-b border-gray-800">
          <div className="px-4 py-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Contact Requests ({requests.length})
            </h2>
          </div>
          {requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-sm font-medium text-white">
                  {r.user?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <span className="text-sm text-white">{r.user?.username}</span>
              </div>
              <button
                onClick={() => handleAccept(r.id)}
                disabled={acceptingId === r.id}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
              >
                {acceptingId === r.id ? '…' : 'Accept'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        {acceptedContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500">
            <svg className="mb-2 h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-sm">No contacts yet</p>
            <p className="mt-1 text-xs">Search for users above to send contact requests</p>
          </div>
        ) : (
          acceptedContacts.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-900"
            >
              <button
                onClick={() => handleChat(c.contact)}
                className="flex flex-1 items-center gap-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                  {c.contact?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="text-left">
                  <span className="text-sm font-medium text-white">{c.contact?.username}</span>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-xs text-gray-500">Online</span>
                  </div>
                </div>
              </button>
              <button
                onClick={() => handleRemove(c.id)}
                disabled={removingId === c.id}
                className="rounded p-1.5 text-gray-500 transition hover:bg-gray-800 hover:text-red-400 disabled:opacity-30"
                title="Remove contact"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
