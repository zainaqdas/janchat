// Supabase Edge Function — Send push notification for incoming call
//
// This function is triggered by a Supabase Database Webhook
// when a new `call_signals` row is inserted with signal_type = 'offer'.
//
// Environment variables (set in Supabase dashboard):
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY
//   - VAPID_PUBLIC_KEY
//   - VAPID_PRIVATE_KEY
//   - VAPID_SUBJECT (mailto: or https://)

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// @ts-ignore - web-push via npm specifier
import webPush from 'npm:web-push@3.6.7'

interface WebhookPayload {
  type: 'INSERT'
  table: string
  record: {
    id: string
    caller_id: string
    receiver_id: string
    signal_type: string
    call_id: string
    created_at: string
  }
  schema: 'public'
}

serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json()

    // Only send push for 'offer' signals (new incoming calls)
    if (payload.record.signal_type !== 'offer') {
      return new Response('Not an offer signal, skipping', { status: 200 })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@call-app.com'

    const supabase = createClient(supabaseUrl, supabaseKey)
    const receiverId = payload.record.receiver_id
    const callerId = payload.record.caller_id

    // Get the caller's profile for the notification body
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', callerId)
      .single()

    // Get the receiver's push subscription
    const { data: subscription } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', receiverId)
      .single()

    if (!subscription) {
      return new Response('No push subscription found', { status: 200 })
    }

    // Configure web-push with VAPID keys
    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

    // Send the push notification
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh_key,
          auth: subscription.auth_key,
        },
      },
      JSON.stringify({
        title: 'Incoming Call',
        body: `${callerProfile?.username || 'Someone'} is calling you`,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: `call-${payload.record.call_id}`,
        requireInteraction: true,
        data: {
          url: '/',
          callId: payload.record.call_id,
          callerId: payload.record.caller_id,
        },
        actions: [
          { action: 'open', title: 'Open App' },
        ],
      })
    )

    return new Response('Push notification sent', { status: 200 })
  } catch (err) {
    console.error('Failed to send push notification:', err)
    return new Response('Error sending push notification', { status: 500 })
  }
})
