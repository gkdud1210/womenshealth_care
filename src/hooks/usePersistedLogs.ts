'use client'

import { useState, useEffect } from 'react'
import type { DailyLogFormData } from '@/types/health'

const STORAGE_KEY = 'ludia_daily_logs_v1'

function load(): Record<string, DailyLogFormData> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, DailyLogFormData>) : {}
  } catch {
    return {}
  }
}

export function usePersistedLogs() {
  const [logs, setLogs] = useState<Record<string, DailyLogFormData>>({})
  const [hydrated, setHydrated] = useState(false)

  // Load from localStorage only after mount to avoid SSR hydration mismatch
  useEffect(() => {
    setLogs(load())
    setHydrated(true)
  }, [])

  // Save only after hydration so we don't overwrite with the initial empty state
  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
    } catch {
      // storage quota exceeded — fail silently
    }
  }, [logs, hydrated])

  function clearLogs() {
    setLogs({})
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }

  return { logs, setLogs, clearLogs }
}
