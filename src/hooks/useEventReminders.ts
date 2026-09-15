'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { ScheduleEvent } from '@/types/health'
import { REMINDER_OFFSET_MINUTES } from '@/types/health'

const FIRED_KEY = 'ludia_fired_reminders_v1'
const CHECK_INTERVAL_MS = 20000
const LATE_WINDOW_MS = 5 * 60000 // don't fire for reminders more than 5min past the event start

export interface FiredReminder {
  eventId: string
  title: string
  message: string
}

function loadFired(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(FIRED_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch { return new Set() }
}

function persistFired(ids: Set<string>) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(FIRED_KEY, JSON.stringify(Array.from(ids))) } catch {}
}

export function useEventReminders(events: ScheduleEvent[]) {
  const [toast, setToast] = useState<FiredReminder | null>(null)
  const firedRef = useRef<Set<string> | null>(null)
  if (firedRef.current === null) firedRef.current = loadFired()
  const permissionRequestedRef = useRef(false)

  // Ask for notification permission once, only if the user actually set a reminder
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    const hasReminders = events.some(e => e.reminder && e.reminder !== 'none')
    if (hasReminders && Notification.permission === 'default' && !permissionRequestedRef.current) {
      permissionRequestedRef.current = true
      Notification.requestPermission().catch(() => {})
    }
  }, [events])

  useEffect(() => {
    function check() {
      const fired = firedRef.current!
      const now = Date.now()
      let changed = false

      for (const ev of events) {
        const offset = ev.reminder ? REMINDER_OFFSET_MINUTES[ev.reminder] : null
        if (offset == null) continue
        if (fired.has(ev.id)) continue

        const eventTime = new Date(`${ev.date}T${ev.startTime}:00`).getTime()
        const target = eventTime - offset * 60000
        if (now >= target && now < eventTime + LATE_WINDOW_MS) {
          fired.add(ev.id)
          changed = true

          const message = `${ev.startTime} · ${ev.title}`
          setToast({ eventId: ev.id, title: ev.title, message })

          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try { new Notification(`🔔 ${ev.title}`, { body: message, tag: ev.id }) } catch {}
          }
        }
      }

      if (changed) persistFired(fired)
    }

    check()
    const id = setInterval(check, CHECK_INTERVAL_MS)
    return () => clearInterval(id)
  }, [events])

  const dismissToast = useCallback(() => setToast(null), [])

  return { toast, dismissToast }
}
