'use client'

import { useEffect } from 'react'
import { useSchedule } from '@/hooks/useSchedule'
import { useEventReminders } from '@/hooks/useEventReminders'
import { ReminderToast } from './ReminderToast'

const TOAST_DURATION_MS = 8000

export function EventReminderHost() {
  const { events } = useSchedule()
  const { toast, dismissToast } = useEventReminders(events)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(dismissToast, TOAST_DURATION_MS)
    return () => clearTimeout(timer)
  }, [toast, dismissToast])

  if (!toast) return null
  return <ReminderToast reminder={toast} onDismiss={dismissToast} />
}
