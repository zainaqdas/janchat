import { useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'

export function useNotifications() {
  const { user } = useAuth()

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false

    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }, [])

  const showNotification = useCallback((title, options = {}) => {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    try {
      new Notification(title, {
        icon: '/favicon.svg',
        ...options,
      })
    } catch (err) {
      // Fallback for older browsers
      if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, options)
        })
      }
    }
  }, [])

  useEffect(() => {
    if (user) {
      requestPermission().catch(console.error)
    }
  }, [user, requestPermission])

  return { showNotification, requestPermission }
}
