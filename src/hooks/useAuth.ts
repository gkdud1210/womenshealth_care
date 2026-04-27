'use client'

import { useState, useEffect, useCallback } from 'react'

export interface UserProfile {
  name: string
  birthdate: string
  careTypes: string[]
}

const PROFILE_KEY = 'ludia_user_v1'
const SESSION_KEY = 'ludia_session'

export function useAuth() {
  const [user, setUserState]       = useState<UserProfile | null>(null)
  const [hasSession, setHasSession] = useState(false)
  const [ready, setReady]           = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PROFILE_KEY)
      if (stored) setUserState(JSON.parse(stored))
    } catch {}
    try {
      setHasSession(!!sessionStorage.getItem(SESSION_KEY))
    } catch {}
    setReady(true)
  }, [])

  const saveUser = useCallback((profile: UserProfile) => {
    setUserState(profile)
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)) } catch {}
  }, [])

  // Call on login (signup form submit) to mark this browser session as active
  const startSession = useCallback(() => {
    setHasSession(true)
    try { sessionStorage.setItem(SESSION_KEY, '1') } catch {}
  }, [])

  const logout = useCallback(() => {
    setUserState(null)
    setHasSession(false)
    try { localStorage.removeItem(PROFILE_KEY) } catch {}
    try { sessionStorage.removeItem(SESSION_KEY) } catch {}
  }, [])

  const isOnboarded = !!user && user.careTypes.length > 0

  // storedUser: profile saved from a previous session (for pre-filling signup form)
  const storedUser = useCallback((): UserProfile | null => {
    try {
      const s = localStorage.getItem(PROFILE_KEY)
      return s ? JSON.parse(s) : null
    } catch { return null }
  }, [])

  return { user, ready, hasSession, saveUser, startSession, logout, isOnboarded, storedUser }
}
