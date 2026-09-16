'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Microscope, Scan, History, ChevronLeft, ChevronRight, PenLine, Trash2, ScanEye, FolderOpen } from 'lucide-react'
import { useDiagnosticHistory, groupSessionsByYear, type DiagnosticSession } from '@/lib/diagnosticHistory'
import { buildScore } from '@/components/diagnostic/DiagnosticReport'

type View = 'home' | 'history'

const SOURCE_META: Record<DiagnosticSession['source'], { label: string; color: string; bg: string }> = {
  scan:   { label: '기기 스캔', color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
  manual: { label: '직접 입력', color: '#f43f75', bg: 'rgba(244,63,117,0.1)' },
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]}) · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function SessionCard({ session, onDelete }: { session: DiagnosticSession; onDelete: () => void }) {
  const score = buildScore(session.data)
  const scoreColor = score >= 72 ? '#10b981' : score >= 52 ? '#f59e0b' : '#ef4444'
  const src = SOURCE_META[session.source]

  return (
    <Link href={`/diagnostic/report?id=${session.id}`}
      className="flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-[0.98] hover-lift"
      style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(158,18,57,0.08)', boxShadow: '0 2px 12px rgba(158,18,57,0.05)' }}>
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-sm font-black font-display"
        style={{ background: `${scoreColor}18`, color: scoreColor }}>
        {score}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{formatDateTime(session.createdAt)}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: src.bg, color: src.color }}>
            {src.label}
          </span>
          <span className="text-[10px] text-slate-400">
            HRV {session.data.biosignal.hrv}ms · 홍채 {Math.round((session.data.iris.leftScore + session.data.iris.rightScore) / 2)}점
          </span>
        </div>
      </div>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete() }}
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors hover:bg-rose-50">
        <Trash2 className="w-3.5 h-3.5 text-slate-300" />
      </button>
      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
    </Link>
  )
}

export default function DiagnosticPage() {
  const router = useRouter()
  const [view, setView] = useState<View>('home')
  const { sessions, ready, removeSession } = useDiagnosticHistory()

  /* ── Landing: action cards ── */
  if (view === 'home') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-10">

        {/* Header */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
              boxShadow: '0 8px 32px rgba(168,85,247,0.35)',
            }}>
            <Microscope className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-800 mb-2">멀티모달 진단 분석</h1>
          <p className="text-sm text-slate-400">홍채 3D · EDA · HRV · BMI 융합 분석</p>
        </div>

        {/* Two CTA cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">

          {/* 새 진단 시작 */}
          <Link href="/diagnostic/scan"
            className="group glass-card p-6 sm:p-8 flex flex-col items-center text-center hover-lift transition-all duration-300 cursor-pointer"
            style={{ border: '1.5px solid rgba(244,63,117,0.2)' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
              style={{
                background: 'linear-gradient(135deg, #f43f75, #e11d5a)',
                boxShadow: '0 6px 24px rgba(244,63,117,0.35)',
              }}>
              <Scan className="w-6 h-6 text-white" />
            </div>
            <h2 className="font-display text-lg font-semibold text-slate-800 mb-1.5">새 진단 시작</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              홍채 · EDA · HRV · BMI<br />4단계 전신 진단을 시작합니다
            </p>
            <div className="mt-4 px-4 py-1.5 rounded-full text-xs font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #f43f75, #e11d5a)' }}>
              시작하기 →
            </div>
          </Link>

          {/* 과거 진단 기록 */}
          <button onClick={() => setView('history')}
            className="group glass-card p-6 sm:p-8 flex flex-col items-center text-center hover-lift transition-all duration-300 cursor-pointer"
            style={{ border: '1.5px solid rgba(168,85,247,0.2)' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
              style={{
                background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                boxShadow: '0 6px 24px rgba(168,85,247,0.3)',
              }}>
              <History className="w-6 h-6 text-white" />
            </div>
            <h2 className="font-display text-lg font-semibold text-slate-800 mb-1.5">과거 진단 기록</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              날짜 · 연도별로 지금까지의<br />진단 리포트를 모아봅니다
            </p>
            <div className="mt-4 px-4 py-1.5 rounded-full text-xs font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}>
              기록 보기 →
            </div>
          </button>
        </div>

        {/* 직접 입력 진입점 */}
        <button onClick={() => router.push('/diagnostic/report')}
          className="mt-5 flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-rose-500 transition-colors">
          <PenLine className="w-3.5 h-3.5" />
          기기 없이 건강정보를 직접 입력해서 진단할래요
        </button>
      </div>
    )
  }

  /* ── History: date/year-grouped session list ── */
  const grouped = groupSessionsByYear(sessions)

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setView('home')}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-rose-50 transition-colors text-slate-400 hover:text-rose-500">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="icon-badge-lg bg-gradient-to-br from-purple-400 to-purple-600 shadow-soft">
          <History className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-semibold text-slate-800">과거 진단 기록</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {ready ? `총 ${sessions.length}건의 진단 리포트` : '불러오는 중…'}
          </p>
        </div>
      </div>

      {ready && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(168,85,247,0.08)' }}>
            <FolderOpen className="w-7 h-7 text-purple-300" />
          </div>
          <p className="text-sm font-semibold text-slate-500">아직 진단 기록이 없어요</p>
          <p className="text-xs text-slate-400 mt-1 mb-5">새 진단을 시작하면 여기에 날짜별로 쌓여요</p>
          <Link href="/diagnostic/scan"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #f43f75, #e11d5a)' }}>
            <ScanEye className="w-3.5 h-3.5" /> 새 진단 시작하기
          </Link>
        </div>
      )}

      <div className="space-y-6">
        {grouped.map(([year, list]) => (
          <div key={year}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 pl-1">
              {year}년 <span className="text-slate-300 font-normal">· {list.length}건</span>
            </p>
            <div className="space-y-2">
              {list.map(s => (
                <SessionCard key={s.id} session={s} onDelete={() => removeSession(s.id)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
