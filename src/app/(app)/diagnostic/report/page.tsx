'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Save, Scan, RadioTower } from 'lucide-react'
import { DiagnosticReport } from '@/components/diagnostic/DiagnosticReport'
import { useDiagnosticHistory, type DiagnosticSession } from '@/lib/diagnosticHistory'
import { useMultimodalData } from '@/hooks/useMultimodalData'
import { useEditableOnboardingProfile } from '@/lib/onboarding-profile'

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const SOURCE_LABEL: Record<DiagnosticSession['source'], string> = {
  scan: '기기 스캔',
  manual: '직접 입력',
}

export default function DiagnosticReportPage() {
  const router = useRouter()
  const [id, setId] = useState<string | null>(null)
  const [paramsChecked, setParamsChecked] = useState(false)
  const { sessions, ready, addSession } = useDiagnosticHistory()
  const { data } = useMultimodalData()
  const { profile } = useEditableOnboardingProfile()
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setId(params.get('id'))
    setParamsChecked(true)
  }, [])

  if (!paramsChecked || !ready) return null

  const session = id ? sessions.find(s => s.id === id) ?? null : null
  const isLive = !session

  function handleSave() {
    const newId = addSession({
      source: 'manual',
      data,
      answers: profile.answers,
      careTypes: profile.careTypes,
    })
    setId(newId)
    router.replace(`/diagnostic/report?id=${newId}`)
    setJustSaved(true)
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-2xl mx-auto pb-16">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/diagnostic"
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 hover:bg-rose-50 transition-colors text-slate-400 hover:text-rose-500">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-semibold text-slate-800 truncate">
              {isLive ? '현재 진단 리포트' : '진단 리포트'}
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              {isLive
                ? <><RadioTower className="w-3 h-3" /> 지금 입력 중인 값 기준 · 실시간</>
                : <><Scan className="w-3 h-3" /> {formatDateTime(session.createdAt)} · {SOURCE_LABEL[session.source]}</>
              }
            </p>
          </div>
        </div>

        {isLive && (
          <button onClick={handleSave}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white flex-shrink-0 transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #f43f75, #e11d5a)', boxShadow: '0 4px 14px rgba(244,63,117,0.3)' }}>
            <Save className="w-3.5 h-3.5" />
            기록에 저장
          </button>
        )}
      </div>

      {justSaved && !isLive && (
        <div className="mb-4 px-4 py-2.5 rounded-xl text-xs font-medium text-center"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#059669' }}>
          진단 기록에 저장했어요. 과거 진단 기록에서 언제든 다시 볼 수 있어요.
        </div>
      )}

      <DiagnosticReport session={session ?? undefined} />
    </div>
  )
}
