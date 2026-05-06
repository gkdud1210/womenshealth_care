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
  const [logs, setLogs] = useState<Record<string, DailyLogFormData>>(load)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
    } catch {
      // storage quota exceeded — fail silently
    }
  }, [logs])

  function clearLogs() {
    setLogs({})
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }

  return { logs, setLogs, clearLogs }
}
