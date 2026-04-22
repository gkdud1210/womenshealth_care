'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Microscope, Eye, Thermometer, Activity, FileText, Download, Brain, Scan, History, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IrisAnalysisView } from '@/components/diagnostic/IrisAnalysisView'
import { ThermalMapView } from '@/components/diagnostic/ThermalMapView'
import { BioSignalPanel } from '@/components/diagnostic/BioSignalPanel'
import { DiagnosticReport } from '@/components/diagnostic/DiagnosticReport'
import { EEGAnalysisView } from '@/components/diagnostic/EEGAnalysisView'

type Tab = 'iris' | 'thermal' | 'eeg' | 'biosignal' | 'report'
type View = 'home' | 'history'

const TABS: { id: Tab; label: string; icon: typeof Eye; badge?: string }[] = [
  { id: 'iris',      label: '홍채 분석',   icon: Eye },
  { id: 'thermal',   label: '열화상 맵',   icon: Thermometer, badge: '냉기감지' },
  { id: 'eeg',       label: '뇌파 분석',   icon: Brain,       badge: 'NEW' },
  { id: 'biosignal', label: '바이오 신호', icon: Activity },
  { id: 'report',    label: '종합 리포트', icon: FileText },
]

const SCAN_META = {
  date: '2026-04-21',
  cyclePhase: '황체기 D+14',
  device: 'LUDIA Iris 3D v2.1',
  quality: 94,
}

export default function DiagnosticPage() {
  const [view, setView]           = useState<View>('home')
  const [activeTab, setActiveTab] = useState<Tab>('iris')

  /* ── Landing: two action buttons ── */
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
          <p className="text-sm text-slate-400">홍채 3D · 열화상 · 뇌파 · 바이오신호 융합 분석</p>
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
              홍채 · 열화상 · 뇌파 · 바이오신호<br />4단계 전신 진단을 시작합니다
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
              이전 진단 결과를 확인하고<br />홍채 · 열화상 · 뇌파 기록을 분석합니다
            </p>
            <div className="mt-4 px-4 py-1.5 rounded-full text-xs font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}>
              기록 보기 →
            </div>
          </button>
        </div>
      </div>
    )
  }

  /* ── History: existing diagnostic tabs ── */
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-5 sm:mb-8">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('home')}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-rose-50 transition-colors text-slate-400 hover:text-rose-500">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="icon-badge-lg bg-gradient-to-br from-purple-400 to-purple-600 shadow-soft">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl sm:text-3xl font-semibold text-slate-800">과거 진단 기록</h1>
            <p className="text-xs sm:text-sm text-slate-400 hidden sm:block">홍채 3D · 열화상 · 뇌파 · 바이오신호 기록</p>
          </div>
        </div>
        <button className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium btn-ghost">
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">저장</span>
        </button>
      </div>

      {/* Scan Meta Bar */}
      <div className="glass-card px-4 py-3 mb-5 overflow-x-auto">
        <div className="flex items-center gap-4 sm:gap-6 min-w-max sm:min-w-0 justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            {[
              { label: '스캔 일시', value: SCAN_META.date },
              { label: '주기 단계', value: SCAN_META.cyclePhase },
              { label: '기기',     value: SCAN_META.device },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="label-caps">{label}</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-700">{value}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <p className="text-xs font-bold text-green-600">{SCAN_META.quality}%</p>
            <div className="w-12 h-1.5 bg-green-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${SCAN_META.quality}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto scrollbar-hide pb-1">
        {TABS.map(({ id, label, icon: Icon, badge }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 relative whitespace-nowrap flex-shrink-0',
              activeTab === id
                ? 'bg-white shadow-card text-rose-600 border border-rose-100'
                : 'text-slate-500 hover:bg-white/60'
            )}>
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {label}
            {badge && (
              <span className="absolute -top-1.5 -right-1.5 px-1 py-0.5 bg-blue-500 text-white text-[8px] rounded-full font-medium">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'iris' && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 lg:gap-6">
            <div className="sm:col-span-1 lg:col-span-4 glass-card p-4 sm:p-6">
              <h3 className="font-display text-lg font-semibold text-slate-700 mb-5">좌안 홍채</h3>
              <IrisAnalysisView side="left" scanDate="2026-04-21" overallScore={67} />
            </div>
            <div className="sm:col-span-1 lg:col-span-4 glass-card p-4 sm:p-6">
              <h3 className="font-display text-lg font-semibold text-slate-700 mb-5">우안 홍채</h3>
              <IrisAnalysisView side="right" scanDate="2026-04-21" overallScore={71} />
            </div>
            <div className="sm:col-span-2 lg:col-span-4 space-y-4">
              <div className="glass-card p-5">
                <h4 className="text-sm font-semibold text-slate-700 mb-4">홍채 zone 가이드</h4>
                <div className="space-y-2.5">
                  {[
                    { zone: '중심부 (동공 주변)', desc: '소화기계, 위장 반영', ring: '1-2링' },
                    { zone: '자율신경 콜라렛', desc: '자율신경계 경계선', ring: '2-3링' },
                    { zone: '내부 장기 zone', desc: '내장 기관 밀도 반영', ring: '3-5링' },
                    { zone: '림프 & 피부 zone', desc: '면역/순환/피부 상태', ring: '6-7링' },
                  ].map(({ zone, desc, ring }) => (
                    <div key={zone} className="flex gap-2.5 p-2.5 rounded-xl bg-slate-50/60">
                      <div className="w-12 text-center">
                        <span className="text-[9px] text-rose-400 font-medium">{ring}</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-700">{zone}</p>
                        <p className="text-[10px] text-slate-400">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass-card p-5">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">밀도 상태 범례</h4>
                {[
                  { status: '정상', color: 'bg-green-400', desc: '75-100' },
                  { status: '주의', color: 'bg-amber-400', desc: '60-74' },
                  { status: '저하', color: 'bg-rose-400', desc: '40-59' },
                  { status: '경고', color: 'bg-red-500', desc: '0-39' },
                ].map(({ status, color, desc }) => (
                  <div key={status} className="flex items-center gap-2.5 py-1.5">
                    <div className={cn('w-3 h-3 rounded-full', color)} />
                    <span className="text-xs text-slate-600 flex-1">{status}</span>
                    <span className="text-[10px] text-slate-400">{desc}점</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'thermal' && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
            <div className="lg:col-span-7 glass-card p-4 sm:p-6">
              <ThermalMapView />
            </div>
            <div className="lg:col-span-5 space-y-4">
              <div className="glass-card p-5">
                <h4 className="text-sm font-semibold text-slate-700 mb-4">열화상 분석 기준</h4>
                <div className="space-y-2.5">
                  {[
                    { range: '35.0 – 35.9°C', label: '냉기 감지', color: 'bg-blue-400', desc: '혈액 순환 저하 의심' },
                    { range: '36.0 – 36.4°C', label: '약간 저온', color: 'bg-cyan-400', desc: '경미한 순환 저하' },
                    { range: '36.5 – 37.0°C', label: '정상 범위', color: 'bg-green-400', desc: '건강한 혈액 순환' },
                    { range: '37.1 – 37.9°C', label: '약간 고온', color: 'bg-yellow-400', desc: '염증 반응 가능성' },
                    { range: '38.0°C 이상',   label: '고온 경보', color: 'bg-red-400',    desc: '염증/감염 의심' },
                  ].map(({ range, label, color, desc }) => (
                    <div key={range} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50">
                      <div className={cn('w-3 h-3 rounded-full flex-shrink-0', color)} />
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="text-xs font-medium text-slate-700">{label}</span>
                          <span className="text-[10px] text-slate-400">{range}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass-card p-5">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">자궁 냉증 자가 체크</h4>
                <div className="space-y-2">
                  {[
                    '생리통이 심하고 혈색이 어둡다',
                    '손발이 차고 하복부가 시리다',
                    '생리 주기가 불규칙하다',
                    '아랫배가 자주 묵직하다',
                  ].map((item, i) => (
                    <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
                      <div className="w-4 h-4 rounded border-2 border-rose-200 bg-rose-50 group-hover:border-rose-400 transition-colors flex-shrink-0" />
                      <span className="text-xs text-slate-600">{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'eeg' && (
        <div className="animate-fade-in">
          <EEGAnalysisView />
        </div>
      )}

      {activeTab === 'biosignal' && (
        <div className="animate-fade-in">
          <BioSignalPanel />
        </div>
      )}

      {activeTab === 'report' && (
        <div className="animate-fade-in max-w-2xl">
          <DiagnosticReport />
        </div>
      )}
    </div>
  )
}
