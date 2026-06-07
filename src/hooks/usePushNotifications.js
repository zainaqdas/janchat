import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  registerServiceWorker,
  subscribeToPush,
  saveSubscription,
  unsubscribeFromPush,
  removeSubscription,
} from '../services/pushNotifications'

export function usePushNotifications() {
  const { user } = useAuth()
  const registered = useRef(false)

  useEffect(() => {
    if (!user || registered.current) return

    let cancelled = false

    async function setup() {
      try {
        const registration = await registerServiceWorker()
        if (!registration || cancelled) return

        const subscription = await subscribeToPush(registration)
        if (!subscription || cancelled) return

        await saveSubscription(user.id, subscription)
        registered.current = true
      } catch (err) {
        console.error('Push notification setup failed:', err)
      }
    }

    // Request notification permission first
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          setup()
        }
      })
    } else if ('Notification' in window && Notification.permission === 'granted') {
      setup()
    }

    return () => {
      cancelled = true
    }
  }, [user])

  // Cleanup subscription on logout
  useEffect(() => {
    if (!user) {
      registered.current = false
    }
  }, [user])
}
