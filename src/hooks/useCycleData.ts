'use client'

import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import type { DailyLogFormData } from '@/types/health'
import { getCyclePhase } from '@/lib/cycle-utils'
import type { CyclePhase } from '@/types/health'

const LOGS_KEY = 'ludia_daily_logs_v1'

function loadLogs(): Record<string, DailyLogFormData> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(LOGS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, DailyLogFormData>) : {}
  } catch {
    return {}
  }
}

/** Returns the first day of the most recent consecutive period run. */
function detectLastPeriodStart(logs: Record<string, DailyLogFormData>): Date | undefined {
  const periodKeys = Object.keys(logs)
    .filter(k => logs[k]?.isPeriod)
    .sort()
    .reverse()

  for (const key of periodKeys) {
    const date = new Date(key + 'T00:00:00')
    const prevKey = format(new Date(date.getTime() - 86400000), 'yyyy-MM-dd')
    if (!logs[prevKey]?.isPeriod) return date
  }
  return undefined
}

export interface CycleData {
  lastPeriodStart: Date | undefined
  cycleDay: number
  cycleLength: number
  periodLength: number
  phase: CyclePhase
  daysUntilNextPeriod: number
  daysUntilOvulation: number | null
  ovulationDay: number
  hasRealData: boolean
}

export function useCycleData(cycleLength = 28, periodLength = 5): CycleData {
  const [logs, setLogs] = useState<Record<string, DailyLogFormData>>({})

  useEffect(() => {
    setLogs(loadLogs())

    function onStorage(e: StorageEvent) {
      if (e.key === LOGS_KEY) setLogs(loadLogs())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const lastPeriodStart = detectLastPeriodStart(logs)
    const hasRealData = !!lastPeriodStart

    let cycleDay: number
    if (lastPeriodStart) {
      const diff = Math.floor((today.getTime() - lastPeriodStart.getTime()) / 86400000)
      cycleDay = (diff % cycleLength) + 1
    } else {
      cycleDay = 1
    }

    const phase = getCyclePhase(cycleDay, cycleLength, periodLength)
    const ovulationDay = cycleLength - 14

    const daysUntilNextPeriod = cycleLength - cycleDay + 1
    const daysUntilOvulation = cycleDay < ovulationDay ? ovulationDay - cycleDay : null

    return {
      lastPeriodStart,
      cycleDay,
      cycleLength,
      periodLength,
      phase,
      daysUntilNextPeriod,
      daysUntilOvulation,
      ovulationDay,
      hasRealData,
    }
  }, [logs, cycleLength, periodLength])
}
