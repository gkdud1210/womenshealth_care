'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ScheduleEvent } from '@/types/health'

const STORAGE_KEY = 'ludia_schedule_v1'

function load(): ScheduleEvent[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ScheduleEvent[]) : []
  } catch {
    return []
  }
}

function persist(events: ScheduleEvent[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
  } catch {}
}

export function useSchedule() {
  const [events, setEventsState] = useState<ScheduleEvent[]>(load)

  useEffect(() => { persist(events) }, [events])

  const addEvents = useCallback((incoming: ScheduleEvent[]) => {
    setEventsState(prev => {
      const ids = new Set(prev.map(e => e.id))
      const deduped = incoming.filter(e => !ids.has(e.id))
      return [...prev, ...deduped]
    })
  }, [])

  const updateEvent = useCallback((id: string, patch: Partial<ScheduleEvent>) => {
    setEventsState(prev =>
      prev.map(e => (e.id === id ? { ...e, ...patch } : e))
    )
  }, [])

  const deleteEvent = useCallback((id: string) => {
    setEventsState(prev => prev.filter(e => e.id !== id))
  }, [])

  const getEventsByDate = useCallback(
    (date: string) => events.filter(e => e.date === date),
    [events],
  )

  const clearAll = useCallback(() => {
    setEventsState([])
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  return { events, addEvents, updateEvent, deleteEvent, getEventsByDate, clearAll }
}
