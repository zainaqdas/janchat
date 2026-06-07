import { supabase } from '../lib/supabase'

export async function getContacts(userId) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*, contact:contact_id(*)')
    .eq('user_id', userId)
    .in('status', ['accepted', 'pending'])
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getContactRequests(userId) {
  // Contacts where this user is the contact_id and status is pending
  const { data, error } = await supabase
    .from('contacts')
    .select('*, user:user_id(*)')
    .eq('contact_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function sendContactRequest(userId, contactId) {
  const { data, error } = await supabase
    .from('contacts')
    .insert({ user_id: userId, contact_id: contactId, status: 'pending' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function acceptContactRequest(contactId) {
  const { data, error } = await supabase
    .from('contacts')
    .update({ status: 'accepted' })
    .eq('id', contactId)
    .select()
    .single()
  if (error) throw error

  // Also create a reciprocal contact entry
  const { error: recipError } = await supabase.from('contacts').insert({
    user_id: data.contact_id,
    contact_id: data.user_id,
    status: 'accepted',
  })
  if (recipError) throw recipError

  return data
}

export async function removeContact(contactId) {
  const { error } = await supabase.from('contacts').delete().eq('id', contactId)
  if (error) throw error
}

export async function getAcceptedContacts(userId) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*, contact:contact_id(*)')
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
