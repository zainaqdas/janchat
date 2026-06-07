import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useChat } from '../contexts/ChatContext'
import { supabase } from '../lib/supabase'

export default function Chat() {
  const { contactId } = useParams()
  const { user } = useAuth()
  const { contacts, selectChat } = useChat()
  const navigate = useNavigate()

  useEffect(() => {
    if (!contactId || !contacts.length) return
    const contact = contacts.find((c) => c.contact?.id === contactId)
    if (contact) {
      selectChat(contact.contact)
    } else {
      // Load the contact profile
      supabase
        .from('profiles')
        .select('*')
        .eq('id', contactId)
        .single()
        .then(({ data }) => {
          if (data) {
            selectChat(data)
          }
        })
    }
  }, [contactId, contacts, selectChat])

  return null
}
