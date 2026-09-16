'use client'

import { useState, useEffect, useCallback } from 'react'
import type { MultimodalData } from '@/components/calendar/LudiaInsightCard'
import type { OnboardingAnswers } from '@/lib/onboarding-profile'

export type DiagnosticSource = 'scan' | 'manual'

export interface DiagnosticSession {
  id: string
  createdAt: string // ISO timestamp
  source: DiagnosticSource
  data: MultimodalData
  answers: OnboardingAnswers
  careTypes: string[]
}

const HISTORY_KEY = 'ludia_diagnostic_history_v1'

function loadHistory(): DiagnosticSession[] {
  if (typeof window === 'undefined') return []
  try {
    const s = localStorage.getItem(HISTORY_KEY)
    return s ? JSON.parse(s) : []
  } catch { return [] }
}

function persistHistory(sessions: DiagnosticSession[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions)) } catch {}
}

// 진단(기기 스캔 또는 직접 입력)이 끝날 때마다 하나의 기록으로 저장해,
// 몇 달에 걸쳐 여러 번 검사해도 날짜별로 다시 찾아볼 수 있게 한다.
export function useDiagnosticHistory() {
  const [sessions, setSessions] = useState<DiagnosticSession[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setSessions(loadHistory())
    setReady(true)
  }, [])

  const addSession = useCallback((input: {
    source: DiagnosticSource
    data: MultimodalData
    answers: OnboardingAnswers
    careTypes: string[]
  }) => {
    const session: DiagnosticSession = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...input,
    }
    setSessions(prev => {
      const next = [session, ...prev]
      persistHistory(next)
      return next
    })
    return session.id
  }, [])

  const removeSession = useCallback((id: string) => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id)
      persistHistory(next)
      return next
    })
  }, [])

  return { sessions, ready, addSession, removeSession }
}

// 특정 세션을 id로 바로 조회할 때 사용 (상세 리포트 페이지 등, 훅 밖에서도 필요할 때)
export function getSessionById(id: string): DiagnosticSession | null {
  return loadHistory().find(s => s.id === id) ?? null
}

export function groupSessionsByYear(sessions: DiagnosticSession[]): [string, DiagnosticSession[]][] {
  const groups = new Map<string, DiagnosticSession[]>()
  for (const s of sessions) {
    const year = String(new Date(s.createdAt).getFullYear())
    const list = groups.get(year) ?? []
    list.push(s)
    groups.set(year, list)
  }
  const entries = Array.from(groups.entries())
  for (const [, list] of entries) {
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  return entries.sort((a, b) => Number(b[0]) - Number(a[0]))
}
