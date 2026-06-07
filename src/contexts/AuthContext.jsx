import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { onAuthStateChange, getProfile, updateLastSeen } from '../services/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        getProfile(session.user.id).then((p) => setProfile(p)).catch(console.error)
      }
      setLoading(false)
    })

    const { data: { subscription } } = onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        getProfile(session.user.id).then((p) => setProfile(p)).catch(console.error)
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Update last_seen periodically
  useEffect(() => {
    if (!user) return

    updateLastSeen(user.id)
    const interval = setInterval(() => {
      updateLastSeen(user.id)
    }, 60000) // every minute

    return () => clearInterval(interval)
  }, [user])

  // Update last_seen on visibility change
  useEffect(() => {
    if (!user) return
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        updateLastSeen(user.id)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [user])

  const refreshProfile = useCallback(async () => {
    if (user) {
      const p = await getProfile(user.id)
      setProfile(p)
    }
  }, [user])

  const value = { user, profile, loading, refreshProfile }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
