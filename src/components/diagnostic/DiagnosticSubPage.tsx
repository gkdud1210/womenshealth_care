'use client'

// 진단 기록 하나를 골라 보여주는 화면 틀 — ?id= 기록, 없으면 가장 최근 기록, 기록이 없으면 지금 입력 중인 값

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useDiagnosticHistory, type DiagnosticSession } from '@/lib/diagnosticHistory'
import { useMultimodalData } from '@/hooks/useMultimodalData'
import type { MultimodalData } from '@/components/calendar/LudiaInsightCard'

function when(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} 기록`
}

export function DiagnosticSubPage({ title, icon, children }: {
  title: string
  icon: ReactNode
  children: (p: { data: MultimodalData; session: DiagnosticSession | null; sessions: DiagnosticSession[] }) => ReactNode
}) {
  const [id, setId] = useState<string | null | undefined>(undefined)
  const { sessions, ready } = useDiagnosticHistory()
  const { data, ready: liveReady } = useMultimodalData()

  useEffect(() => { setId(new URLSearchParams(window.location.search).get('id')) }, [])
  if (id === undefined || !ready || !liveReady) return null

  const session = (id ? sessions.find(s => s.id === id) : null) ?? sessions[0] ?? null
  const shown = session?.data ?? data

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-2xl mx-auto pb-16">
      <div className="flex items-center gap-3 mb-4">
        <Link href={session ? `/diagnostic/report?id=${session.id}` : '/diagnostic'}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 hover:bg-rose-50 text-slate-400 hover:text-rose-500">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#8b5cf6,#e11d48)' }}>{icon}</span>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold text-slate-800 truncate">{title}</h1>
          <p className="text-[11.5px] text-slate-400">
            {session ? `${when(session.createdAt)}${session.demo ? ' · 예시' : ''}` : '지금 입력 중인 값 기준'}
          </p>
        </div>
      </div>

      {sessions.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 mb-4">
          {sessions.slice(0, 12).map(s => {
            const d = new Date(s.createdAt)
            const on = s.id === session?.id
            return (
              <button key={s.id} onClick={() => { setId(s.id); window.history.replaceState(null, '', `?id=${s.id}`) }}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11.5px] font-bold border"
                style={on ? { background: '#1e293b', color: '#fff', borderColor: '#1e293b' } : { background: '#fff', color: '#64748b', borderColor: '#e2e8f0' }}>
                {d.getMonth() + 1}/{d.getDate()}
              </button>
            )
          })}
        </div>
      )}

      {children({ data: shown, session, sessions })}
    </div>
  )
}
