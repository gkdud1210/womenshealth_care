'use client'

import { useMemo } from 'react'
import { Brain, Sparkles, Eye, Thermometer, Activity, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { LudiaChat } from '@/components/consultant/LudiaChat'
import { MultimodalDataPanel } from '@/components/calendar/MultimodalDataPanel'
import { useMultimodalData } from '@/hooks/useMultimodalData'
import { getCyclePhase, getPhaseLabel, getPhaseColor } from '@/lib/cycle-utils'
import { cn } from '@/lib/utils'

const LAST_PERIOD  = new Date(2026, 3, 8)
const CYCLE_LENGTH = 28
const PERIOD_LEN   = 5

function computeDay(from: Date, to: Date, len: number) {
  return (Math.floor((to.getTime() - from.getTime()) / 86400000) % len) + 1
}

export default function ConsultantPage() {
  const { data, setData, ready } = useMultimodalData()
  const [dataOpen, setDataOpen]  = useState(false)

  const today    = useMemo(() => new Date(), [])
  const cycleDay = useMemo(() => computeDay(LAST_PERIOD, today, CYCLE_LENGTH), [today])
  const phase    = useMemo(() => getCyclePhase(cycleDay, CYCLE_LENGTH, PERIOD_LEN), [cycleDay])

  if (!ready) return null

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Left panel: chat (main area) ── */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">

        {/* Header */}
        <div className="px-4 sm:px-6 pt-5 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* LUDIA icon */}
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #0f0810 0%, #2d1129 55%, #1a0a18 100%)',
                  boxShadow: '0 4px 20px rgba(244,63,117,0.28)',
                }}>
                <Brain className="w-5 h-5 text-rose-300" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #d4af37, #b8962e)', boxShadow: '0 2px 8px rgba(212,175,55,0.4)' }}>
                <Sparkles className="w-2.5 h-2.5 text-white" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-[0.18em] uppercase"
                  style={{
                    background: 'linear-gradient(135deg, #d4af37 0%, #b8962e 45%, #e8d07a 70%, #d4af37 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  }}>LUDIA</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)', color: '#9a7d26' }}>
                  AI HEALTH GUIDE
                </span>
              </div>
              <h1 className="font-display text-xl sm:text-2xl font-semibold text-slate-800 leading-tight">AI 건강 상담</h1>
              <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                홍채 · 열화상 · EEG · 바이오신호 · 생리 주기 통합 분석
              </p>
            </div>
          </div>

          {/* Data source summary chips */}
          <div className="flex flex-wrap gap-2 mt-4">
            {[
              { icon: Eye,         label: '홍채 3D',   val: `${Math.round((data.iris.leftScore + data.iris.rightScore) / 2)}점`,  ok: Math.round((data.iris.leftScore + data.iris.rightScore) / 2) >= 70 },
              { icon: Thermometer, label: '자궁 온도', val: `${data.thermal.uterineTemp}°C`,  ok: data.thermal.uterineTemp >= 36.2 },
              { icon: Brain,       label: 'EEG 스트레스', val: `${data.eeg.stressIndex}/100`, ok: data.eeg.stressIndex < 65 },
              { icon: Activity,    label: 'HRV',       val: `${data.biosignal.hrv}ms`,       ok: data.biosignal.hrv >= 38 },
            ].map(({ icon: Icon, label, val, ok }) => (
              <div key={label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs"
                style={{
                  background: ok ? 'rgba(34,197,94,0.07)' : 'rgba(244,63,117,0.07)',
                  border: ok ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(244,63,117,0.2)',
                }}>
                <Icon className={cn('w-3 h-3', ok ? 'text-green-500' : 'text-rose-500')} />
                <span className="text-slate-500">{label}</span>
                <span className={cn('font-semibold', ok ? 'text-green-600' : 'text-rose-600')}>{val}</span>
              </div>
            ))}

            {/* Edit data button */}
            <button onClick={() => setDataOpen(p => !p)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-slate-500 hover:text-rose-500 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100">
              {dataOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              데이터 수정
            </button>
          </div>

          {/* Collapsible data panel */}
          {dataOpen && (
            <div className="mt-3 animate-fade-in">
              <MultimodalDataPanel value={data} onChange={setData} />
            </div>
          )}
        </div>

        {/* Chat area */}
        <div className="flex-1 glass-card mx-4 sm:mx-6 mb-4 overflow-hidden flex flex-col"
          style={{ minHeight: 0 }}>
          <LudiaChat data={data} phase={phase} cycleDay={cycleDay} />
        </div>
      </div>

      {/* ── Right panel: live health context (desktop only) ── */}
      <div className="hidden lg:flex w-72 flex-col gap-4 p-6 border-l border-rose-100/60 flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(12px)' }}>
        <div>
          <p className="label-caps mb-3">실시간 건강 컨텍스트</p>
          <p className="text-xs text-slate-400 mb-4">LUDIA가 응답 시 참조하는 현재 데이터예요</p>

          {/* Phase */}
          <div className="glass-card-sm p-3.5 mb-3">
            <p className="label-caps mb-2">주기 단계</p>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: getPhaseColor(phase) + '20' }}>
                <div className="w-3 h-3 rounded-full" style={{ background: getPhaseColor(phase) }} />
              </div>
              <div>
                <p className="font-semibold text-slate-700 text-sm">{getPhaseLabel(phase)}</p>
                <p className="text-xs text-slate-400">D+{cycleDay} · 다음 생리 {CYCLE_LENGTH - cycleDay}일 후</p>
              </div>
            </div>
          </div>

          {/* Data breakdown */}
          {[
            {
              title: '홍채 3D',
              items: [
                { label: '좌안 밀도', v: `${data.iris.leftScore}점`, ok: data.iris.leftScore >= 70 },
                { label: '우안 밀도', v: `${data.iris.rightScore}점`, ok: data.iris.rightScore >= 70 },
                { label: '피부 Zone', v: `${data.iris.skinZone}점`, ok: data.iris.skinZone >= 70 },
              ],
            },
            {
              title: '열화상',
              items: [
                { label: '자궁', v: `${data.thermal.uterineTemp}°C`, ok: data.thermal.uterineTemp >= 36.2 },
                { label: '좌난소', v: `${data.thermal.leftOvaryTemp}°C`, ok: data.thermal.leftOvaryTemp >= 36.2 },
                { label: '우난소', v: `${data.thermal.rightOvaryTemp}°C`, ok: data.thermal.rightOvaryTemp >= 36.2 },
              ],
            },
            {
              title: 'EEG 뇌파',
              items: [
                { label: '스트레스', v: `${data.eeg.stressIndex}/100`, ok: data.eeg.stressIndex < 65 },
                { label: '알파파', v: `${data.eeg.alphaRatio}%`, ok: data.eeg.alphaRatio >= 50 },
                { label: '부교감', v: `${data.eeg.ansBalance}%`, ok: data.eeg.ansBalance >= 45 },
              ],
            },
            {
              title: '바이오신호',
              items: [
                { label: 'HRV', v: `${data.biosignal.hrv}ms`, ok: data.biosignal.hrv >= 38 },
                { label: '수면', v: `${data.biosignal.sleepHours}h`, ok: data.biosignal.sleepHours >= 7 },
                { label: '심박수', v: `${data.biosignal.heartRate}bpm`, ok: data.biosignal.heartRate >= 55 && data.biosignal.heartRate <= 85 },
              ],
            },
          ].map(({ title, items }) => (
            <div key={title} className="glass-card-sm p-3 mb-2">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">{title}</p>
              <div className="space-y-1.5">
                {items.map(({ label, v, ok }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', ok ? 'bg-green-400' : 'bg-rose-400')} />
                      <span className="text-xs text-slate-500">{label}</span>
                    </div>
                    <span className={cn('text-xs font-semibold', ok ? 'text-green-600' : 'text-rose-600')}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Edit link */}
          <button onClick={() => setDataOpen(p => !p)}
            className="w-full mt-1 py-2 text-xs text-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
            슬라이더로 데이터 수정
          </button>
        </div>
      </div>
    </div>
  )
}
