'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Microscope, Scan, History, ChevronLeft, ChevronRight, PenLine, Trash2, ScanEye, FolderOpen, Sparkles, Brain, FileBarChart } from 'lucide-react'
import { useDiagnosticHistory, groupSessionsByYear, type DiagnosticSession } from '@/lib/diagnosticHistory'
import { buildScore } from '@/components/diagnostic/DiagnosticReport'
import { DiagnosticTrends } from '@/components/diagnostic/DiagnosticTrends'
import { useOnboardingProfile } from '@/lib/onboarding-profile'

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
          {session.demo && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">예시</span>
          )}
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
  const { sessions, ready, removeSession, addSampleSessions } = useDiagnosticHistory()
  const onboarding = useOnboardingProfile()
  const hasDemo = sessions.some(s => s.demo)
  const loadSamples = () => addSampleSessions({ answers: onboarding.answers, careTypes: onboarding.careTypes })

  /* ── Landing: action cards ── */
  if (view === 'home') {
    const latest = sessions[0]
    const q = latest ? `?id=${latest.id}` : ''
    const tiles = [
      { key: 'history', label: '과거 진단 기록', sub: ready && sessions.length ? `${sessions.length}건 · 변화 추이` : '날짜별 리포트 모아보기',
        Icon: History, grad: 'linear-gradient(135deg,#a855f7,#7c3aed)', onClick: () => setView('history') },
      { key: 'report', label: '진단 리포트', sub: latest ? '최근 기록 · 그래프·BMI' : '지금 값으로 보기',
        Icon: FileBarChart, grad: 'linear-gradient(135deg,#f59e0b,#ea580c)', href: `/diagnostic/report${q}` },
      { key: 'psyche', label: '홍채 심리', sub: '안정 ↔ 긴장 · 내 타입',
        Icon: Brain, grad: 'linear-gradient(135deg,#8b5cf6,#e11d48)', href: `/diagnostic/psyche${q}` },
      { key: 'iris', label: '홍채 엔진 리포트', sub: '소견 · 구역 · 자율신경환',
        Icon: ScanEye, grad: 'linear-gradient(135deg,#6366f1,#0ea5e9)', href: `/diagnostic/iris-report${q}` },
    ]
    return (
      <div className="min-h-[calc(100dvh-96px)] lg:min-h-screen flex flex-col justify-center px-4 py-4 sm:p-8 max-w-lg mx-auto w-full">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', boxShadow: '0 6px 20px rgba(168,85,247,0.3)' }}>
            <Microscope className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl sm:text-2xl font-semibold text-slate-800 leading-tight">멀티모달 진단 분석</h1>
            <p className="text-[12px] text-slate-400">홍채 3D · EDA · HRV · BMI 융합 분석</p>
          </div>
        </div>

        {/* 새 진단 시작 — 가장 큰 카드 */}
        <Link href="/diagnostic/scan"
          className="group flex items-center gap-4 rounded-3xl p-5 text-white active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg, #f43f75, #e11d5a)', boxShadow: '0 10px 28px rgba(244,63,117,0.3)' }}>
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Scan className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-[19px] font-semibold leading-tight">새 진단 시작</p>
            <p className="text-[12px] text-white/85 mt-0.5">홍채 · EDA · HRV · BMI 4단계 전신 진단</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/80 flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
        </Link>

        {/* 기록 · 리포트 · 홍채 심리 · 홍채 엔진 — 2×2 */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          {tiles.map(t => {
            const body = (
              <>
                <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: t.grad }}>
                  <t.Icon className="w-5 h-5 text-white" />
                </span>
                <span className="mt-2.5 block text-[14.5px] font-bold text-slate-800 leading-tight">{t.label}</span>
                <span className="mt-0.5 block text-[11px] text-slate-400 leading-snug">{t.sub}</span>
              </>
            )
            const cls = 'glass-card p-4 text-left flex flex-col items-start active:scale-[0.97] transition-transform hover-lift'
            return t.href
              ? <Link key={t.key} href={t.href} className={cls}>{body}</Link>
              : <button key={t.key} onClick={t.onClick} className={cls}>{body}</button>
          })}
        </div>

        {latest && (
          <p className="mt-3 text-center text-[11px] text-slate-400">
            최근 진단 {new Date(latest.createdAt).getMonth() + 1}월 {new Date(latest.createdAt).getDate()}일{latest.demo ? ' (예시)' : ''} · 리포트·홍채 심리는 이 기록으로 열려요
          </p>
        )}

        {/* 직접 입력 진입점 */}
        <button onClick={() => router.push('/diagnostic/report')}
          className="mt-4 mx-auto flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-rose-500 transition-colors">
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
          <button onClick={loadSamples}
            className="mt-3 flex items-center gap-1 text-xs font-semibold text-purple-500">
            <Sparkles className="w-3.5 h-3.5" /> 예시 기록으로 둘러보기
          </button>
        </div>
      )}

      {ready && sessions.length >= 2 && (
        <div className="mb-6">
          <DiagnosticTrends sessions={sessions} />
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

      {ready && sessions.length > 0 && (
        <div className="flex justify-center gap-4 mt-8">
          <button onClick={loadSamples} className="flex items-center gap-1 text-xs font-semibold text-purple-500">
            <Sparkles className="w-3.5 h-3.5" /> {hasDemo ? '예시 기록 다시 만들기' : '예시 기록 추가하기'}
          </button>
          {hasDemo && (
            <button onClick={() => sessions.filter(s => s.demo).forEach(s => removeSession(s.id))}
              className="text-xs font-semibold text-slate-400">
              예시 기록 지우기
            </button>
          )}
        </div>
      )}
    </div>
  )
}
