'use client'

import { useMemo } from 'react'
import { getCyclePhase } from '@/lib/cycle-utils'
import { useMultimodalData } from '@/hooks/useMultimodalData'
import { useAuth } from '@/hooks/useAuth'
import { LudiaVoice } from '@/components/voice/LudiaVoice'

const MOCK_LAST_PERIOD = new Date(2026, 3, 8)
const CYCLE_LENGTH = 28
const PERIOD_LENGTH = 5

function computeCycleDay(from: Date, to: Date, len: number) {
  return (Math.floor((to.getTime() - from.getTime()) / 86400000) % len) + 1
}

export default function DashboardPage() {
  const { data, ready } = useMultimodalData()
  const { user } = useAuth()
  const today = useMemo(() => new Date(), [])
  const cycleDay = useMemo(
    () => computeCycleDay(MOCK_LAST_PERIOD, today, CYCLE_LENGTH),
    [today],
  )
  const phase = useMemo(
    () => getCyclePhase(cycleDay, CYCLE_LENGTH, PERIOD_LENGTH),
    [cycleDay],
  )

  if (!ready) return null

  return (
    <LudiaVoice
      data={data}
      phase={phase}
      cycleDay={cycleDay}
      userName={user?.name ?? '님'}
    />
  )
}
