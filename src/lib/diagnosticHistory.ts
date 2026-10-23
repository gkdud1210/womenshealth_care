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
  /** 앱 둘러보기용 예시 기록 */
  demo?: boolean
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

  // 둘러보기용 예시 기록 — 약 9주 동안 2주 간격으로 검사하며 조금씩 좋아진 흐름이에요
  const addSampleSessions = useCallback((base: { answers: OnboardingAnswers; careTypes: string[] }) => {
    const samples = makeSampleSessions(base)
    setSessions(prev => {
      const next = [...prev.filter(s => !s.demo), ...samples]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      persistHistory(next)
      return next
    })
    return samples[0]?.id
  }, [])

  const removeSession = useCallback((id: string) => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id)
      persistHistory(next)
      return next
    })
  }, [])

  return { sessions, ready, addSession, addSampleSessions, removeSession }
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

/** 예시 진단 기록 6회 — 오래된 것부터 [홍채 좌, 홍채 우, 피부구역, 갑상선구역, 전도도, 스트레스, 긴장, 이완, 자율신경 균형, HRV, 수면, 심박, 체중, BMI] */
const SAMPLE_ROWS: { daysAgo: number; v: number[] }[] = [
  { daysAgo: 63, v: [60, 63, 52, 58, 11.2, 74, 79, 48, 38, 33, 5.6, 77, 62.6, 24.1] },
  { daysAgo: 49, v: [62, 64, 55, 60, 10.4, 70, 74, 52, 41, 36, 6.0, 75, 62.0, 23.9] },
  { daysAgo: 35, v: [63, 66, 57, 61, 9.8,  66, 70, 55, 44, 38, 6.3, 73, 61.5, 23.7] },
  { daysAgo: 21, v: [66, 68, 60, 64, 9.1,  61, 66, 60, 48, 41, 6.6, 71, 61.1, 23.5] },
  { daysAgo: 7,  v: [68, 70, 62, 66, 8.6,  57, 61, 63, 51, 43, 6.9, 70, 60.6, 23.3] },
  { daysAgo: 1,  v: [70, 73, 64, 68, 8.2,  53, 58, 67, 54, 46, 7.1, 68, 60.2, 23.2] },
]

export function makeSampleSessions(base: { answers: OnboardingAnswers; careTypes: string[] }): DiagnosticSession[] {
  return SAMPLE_ROWS.map(({ daysAgo, v }, i) => {
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    d.setHours(8, 30 + i * 3, 0, 0)
    const [leftScore, rightScore, skinZone, thyroidZone, conductance, stressIndex, tensionLevel, relaxationScore, ansBalance, hrv, sleepHours, heartRate, weight, bmi] = v
    return {
      id: `demo_${daysAgo}`,
      createdAt: d.toISOString(),
      source: 'scan' as const,
      data: {
        iris: { leftScore, rightScore, skinZone, thyroidZone },
        eda: { conductance, stressIndex, tensionLevel, relaxationScore, ansBalance },
        biosignal: { hrv, sleepHours, heartRate, weight, bmi },
      },
      answers: base.answers,
      careTypes: base.careTypes,
      demo: true,
    }
  }).reverse()
}
