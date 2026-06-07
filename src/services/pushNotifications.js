import { supabase } from '../lib/supabase'

// Replace this with your actual VAPID public key
const VAPID_PUBLIC_KEY = 'BJFRGKkhgoNugMiurr2sAde0ctz-7BE2m8MR9OJ5jMPrVaV6TuyhWsjKEc6HI5BwyUFhELQTYXZcj_FQ0Vs96nU'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })
    console.log('Service worker registered')
    return registration
  } catch (err) {
    console.error('Service worker registration failed:', err)
    return null
  }
}

export async function subscribeToPush(registration) {
  if (!registration || !('PushManager' in window)) {
    console.warn('Push notifications not supported')
    return null
  }

  try {
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      return subscription
    }

    // Request new subscription
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    return subscription
  } catch (err) {
    console.error('Push subscription failed:', err)
    return null
  }
}

export async function saveSubscription(userId, subscription) {
  if (!userId || !subscription) return

  try {
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.toJSON().keys.p256dh,
        auth_key: subscription.toJSON().keys.auth,
      },
      { onConflict: 'user_id' }
    )
    if (error) console.error('Failed to save push subscription:', error)
  } catch (err) {
    console.error('Failed to save push subscription:', err)
  }
}

export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator)) return

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
    }
  } catch (err) {
    console.error('Failed to unsubscribe:', err)
  }
}

export async function removeSubscription(userId) {
  if (!userId) return

  try {
    await supabase.from('push_subscriptions').delete().eq('user_id', userId)
  } catch (err) {
    console.error('Failed to remove push subscription:', err)
  }
}
