'use client'

import { useState, useEffect, useCallback } from 'react'

export interface UserProfile {
  name: string
  birthdate: string
  careTypes: string[]
}

const KEY = 'ludia_user_v1'

export function useAuth() {
  const [user, setUserState] = useState<UserProfile | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY)
      if (stored) setUserState(JSON.parse(stored))
    } catch {}
    setReady(true)
  }, [])

  const saveUser = useCallback((profile: UserProfile) => {
    setUserState(profile)
    try { localStorage.setItem(KEY, JSON.stringify(profile)) } catch {}
  }, [])

  const logout = useCallback(() => {
    setUserState(null)
    try { localStorage.removeItem(KEY) } catch {}
  }, [])

  const isOnboarded = !!user && user.careTypes.length > 0

  return { user, ready, saveUser, logout, isOnboarded }
}
