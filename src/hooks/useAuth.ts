'use client'

import { useState, useEffect, useCallback } from 'react'

export interface UserProfile {
  userId: string
  nickname: string
  name: string
  birthdate: string
  passwordHash: string
  careTypes: string[]
  cycleMode?: string
}

const PROFILE_KEY = 'ludia_user_v1'
const SESSION_KEY = 'ludia_session'

function hashPassword(pw: string): string {
  // Simple deterministic hash for local storage (not cryptographic)
  let h = 0
  for (let i = 0; i < pw.length; i++) {
    h = (Math.imul(31, h) + pw.charCodeAt(i)) | 0
  }
  return h.toString(36)
}

export function useAuth() {
  const [user, setUserState]        = useState<UserProfile | null>(null)
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

  const register = useCallback((
    profile: Omit<UserProfile, 'passwordHash'> & { password: string }
  ): void => {
    const { password, ...rest } = profile
    const full: UserProfile = { ...rest, passwordHash: hashPassword(password) }
    setUserState(full)
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(full)) } catch {}
  }, [])

  const verifyPassword = useCallback((password: string): boolean => {
    try {
      const stored = localStorage.getItem(PROFILE_KEY)
      if (!stored) return false
      const profile: UserProfile = JSON.parse(stored)
      return profile.passwordHash === hashPassword(password)
    } catch { return false }
  }, [])

  const startSession = useCallback(() => {
    setHasSession(true)
    try { sessionStorage.setItem(SESSION_KEY, '1') } catch {}
  }, [])

  const logout = useCallback(() => {
    setUserState(null)
    setHasSession(false)
    try { sessionStorage.removeItem(SESSION_KEY) } catch {}
  }, [])

  const isOnboarded = !!user && user.careTypes.length > 0

  const storedUser = useCallback((): UserProfile | null => {
    try {
      const s = localStorage.getItem(PROFILE_KEY)
      return s ? JSON.parse(s) : null
    } catch { return null }
  }, [])

  return {
    user, ready, hasSession,
    saveUser, register, verifyPassword,
    startSession, logout,
    isOnboarded, storedUser,
  }
}
