'use client'

import { useState, useMemo } from 'react'
import { X, Heart, Scale, Droplets } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import { getPhaseColor, getPhaseCellBg, getPhaseLabel } from '@/lib/cycle-utils'
import { LudiaInsightCard } from './LudiaInsightCard'
import type { MultimodalData } from './LudiaInsightCard'
import { DEFAULT_MULTIMODAL } from './MultimodalDataPanel'
import type { DailyLogFormData, CyclePhase } from '@/types/health'

interface Props {
  date: Date
  log?: DailyLogFormData
  phase?: CyclePhase
  cycleDay: number
  logs: Record<string, DailyLogFormData>
  onSave: (data: DailyLogFormData) => void
  onClose: () => void
}

function hrvStatus(hrv: number): { label: string; color: string } {
  if (hrv >= 40) return { label: '양호', color: '#10b981' }
  if (hrv >= 28) return { label: '주의', color: '#f59e0b' }
  return { label: '저하', color: '#ef4444' }
}

function bmiStatus(bmi: number): { label: string; color: string } {
  if (bmi >= 18.5 && bmi <= 24.9) return { label: '정상', color: '#10b981' }
  if (bmi < 18.5) return { label: '저체중', color: '#f59e0b' }
  if (bmi <= 29.9) return { label: '과체중', color: '#f59e0b' }
  return { label: '비만', color: '#ef4444' }
}

const FLOW_DROPS: Record<string, string> = {
  spotting: '💧',
  light: '💧',
  medium: '💧💧',
  heavy: '💧💧💧',
  very_heavy: '💧💧💧',
}

const FLOW_LABEL: Record<string, string> = {
  spotting: '소량',
  light: '적음',
  medium: '보통',
  heavy: '많음',
  very_heavy: '매우 많음',
}

export function DailyDetailModal({ date, log, phase, cycleDay, logs, onSave, onClose }: Props) {
  const [notes, setNotes] = useState(log?.notes ?? '')

  const multimodalData = useMemo((): MultimodalData => ({
    iris:      { ...DEFAULT_MULTIMODAL.iris },
    thermal:   { ...DEFAULT_MULTIMODAL.thermal },
    eda:       { ...DEFAULT_MULTIMODAL.eda },
    biosignal: {
      ...DEFAULT_MULTIMODAL.biosignal,
      ...(log?.hrv        != null && { hrv:       log.hrv }),
      ...(log?.bmi        != null && { bmi:       log.bmi }),
      ...(log?.heartRate  != null && { heartRate: log.heartRate }),
      ...(log?.sleepHours != null && { sleepHours: log.sleepHours }),
      ...(log?.weight     != null && { weight:    log.weight }),
    },
  }), [log])

  const trendData = useMemo(() => {
    return Array.from({ length: 7 }, (_, idx) => {
      const d = subDays(date, 6 - idx)
      const key = format(d, 'yyyy-MM-dd')
      return { label: format(d, 'M/d'), hrv: logs[key]?.hrv ?? null }
    })
  }, [date, logs])

  const hasHrvTrend = trendData.filter(d => d.hrv != null).length >= 2

  const phaseColor = phase ? getPhaseColor(phase) : '#f43f75'

  function handleSave() {
    const dateKey = format(date, 'yyyy-MM-dd')
    onSave({
      ...(log ?? { date: dateKey, isPeriod: false }),
      date: dateKey,
      notes,
    } as DailyLogFormData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white sm:rounded-3xl shadow-2xl overflow-hidden
                      max-h-[100dvh] sm:max-h-[90vh] flex flex-col
                      rounded-t-3xl">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex items-start justify-between flex-shrink-0"
          style={{ borderBottom: `1.5px solid ${phaseColor}20`, background: `${phaseColor}08` }}>
          <div>
            <p className="font-semibold text-slate-800 text-[15px]">
              {format(date, 'M월 d일 EEEE', { locale: ko })}
            </p>
            {phase && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full inline-block mt-1"
                style={{ background: getPhaseCellBg(phase), color: phaseColor }}>
                D+{cycleDay} · {getPhaseLabel(phase)}
              </span>
            )}
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors flex-shrink-0 mt-0.5">
            <X className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* ── Biosignals grid ── */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">바이오 측정값</p>
            <div className="grid grid-cols-2 gap-2">

              {/* HRV */}
              {log?.hrv != null ? (
                <BioCard color={hrvStatus(log.hrv).color}>
                  <BioCardHeader icon={Heart} label="HRV" color={hrvStatus(log.hrv).color} />
                  <p className="text-xl font-bold font-display mt-1" style={{ color: hrvStatus(log.hrv).color }}>
                    {log.hrv}<span className="text-xs font-normal text-slate-400 ml-0.5">ms</span>
                  </p>
                  <StatusPill label={hrvStatus(log.hrv).label} color={hrvStatus(log.hrv).color} />
                </BioCard>
              ) : (
                <EmptyBioCard icon={Heart} label="HRV 미측정" />
              )}

              {/* BMI */}
              {log?.bmi != null ? (
                <BioCard color={bmiStatus(log.bmi).color}>
                  <BioCardHeader icon={Scale} label="BMI" color={bmiStatus(log.bmi).color} />
                  <p className="text-xl font-bold font-display mt-1" style={{ color: bmiStatus(log.bmi).color }}>
                    {log.bmi.toFixed(1)}
                  </p>
                  <StatusPill label={bmiStatus(log.bmi).label} color={bmiStatus(log.bmi).color} />
                </BioCard>
              ) : (
                <EmptyBioCard icon={Scale} label="BMI 미측정" />
              )}

              {/* Period flow */}
              {log?.isPeriod && (
                <div className="rounded-2xl p-3 bg-rose-50 border border-rose-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Droplets className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-[10px] font-semibold text-slate-500">생리량</span>
                  </div>
                  <p className="text-xl leading-none mt-1">
                    {log.periodFlow ? FLOW_DROPS[log.periodFlow] : '💧'}
                  </p>
                  <span className="text-[10px] text-rose-400 mt-1 block">
                    {log.periodFlow ? FLOW_LABEL[log.periodFlow] : '생리 중'}
                  </span>
                </div>
              )}

              {/* Pain */}
              {(log?.painIntensity ?? 0) > 0 && (
                <div className="rounded-2xl p-3 bg-amber-50 border border-amber-100">
                  <p className="text-[10px] font-semibold text-slate-500 mb-1.5">통증 강도</p>
                  <div className="flex items-end gap-1 mt-1">
                    <span className={`text-xl font-bold font-display ${
                      (log!.painIntensity ?? 0) >= 7 ? 'text-rose-500'
                        : (log!.painIntensity ?? 0) >= 4 ? 'text-amber-500' : 'text-green-500'
                    }`}>
                      {log!.painIntensity}
                    </span>
                    <span className="text-xs text-slate-400 mb-0.5">/ 10</span>
                  </div>
                  <div className="flex gap-0.5 mt-2">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="flex-1 h-1.5 rounded-full"
                        style={{
                          background: i < (log!.painIntensity ?? 0)
                            ? i >= 6 ? '#ef4444' : i >= 3 ? '#f59e0b' : '#22c55e'
                            : '#e2e8f0',
                        }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── AI Insight ── */}
          {phase && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">LUDIA AI 인사이트</p>
              <LudiaInsightCard phase={phase} cycleDay={cycleDay} data={multimodalData} />
            </div>
          )}

          {/* ── HRV Trend ── */}
          {hasHrvTrend && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                최근 7일 HRV 변화
              </p>
              <HrvTrendChart data={trendData} />
            </div>
          )}

          {/* ── Notes ── */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">메모</p>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="오늘의 특이사항을 자유롭게 기록하세요..."
              className="w-full text-sm text-slate-700 placeholder-slate-300 bg-slate-50 rounded-xl px-4 py-3 resize-none outline-none border-2 border-transparent focus:border-rose-200 transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pt-3 flex-shrink-0 border-t border-rose-100/60 bg-rose-50/20"
          style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
          <button onClick={handleSave}
            className="w-full py-3 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #f43f75, #e11d5a)', boxShadow: '0 4px 16px rgba(244,63,117,0.35)' }}>
            저장하기 ✓
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function BioCard({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-3" style={{ background: color + '10', border: `1px solid ${color}30` }}>
      {children}
    </div>
  )
}

function BioCardHeader({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5" style={{ color }} />
      <span className="text-[10px] font-semibold text-slate-500">{label}</span>
    </div>
  )
}

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full inline-block mt-1"
      style={{ background: color + '18', color }}>
      {label}
    </span>
  )
}

function EmptyBioCard({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="rounded-2xl p-3 bg-slate-50 border border-slate-100 flex flex-col items-center justify-center gap-1 min-h-[76px]">
      <Icon className="w-4 h-4 text-slate-300" />
      <span className="text-[10px] text-slate-300">{label}</span>
    </div>
  )
}

// ── HRV Trend Chart ────────────────────────────────────────────────────────────
function HrvTrendChart({ data }: { data: { label: string; hrv: number | null }[] }) {
  const valids = data.map(d => d.hrv).filter((v): v is number => v != null)

  const minV = Math.max(0,   Math.min(...valids) - 5)
  const maxV = Math.min(200, Math.max(...valids) + 5)
  const range = maxV - minV || 1

  const W = 280, H = 80
  const PL = 16, PR = 8, PT = 8, PB = 22
  const cW = W - PL - PR
  const cH = H - PT - PB

  const xOf = (i: number) => PL + (i / (data.length - 1)) * cW
  const yOf = (v: number) => PT + cH - ((v - minV) / range) * cH

  const segments: string[] = []
  let inSeg = false
  data.forEach((d, i) => {
    if (d.hrv == null) { inSeg = false; return }
    const x = xOf(i).toFixed(1), y = yOf(d.hrv).toFixed(1)
    segments.push(inSeg ? `L${x},${y}` : `M${x},${y}`)
    inSeg = true
  })

  const y40 = yOf(40)
  const show40 = y40 >= PT && y40 <= PT + cH

  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {show40 && (
          <>
            <line x1={PL} y1={y40} x2={W - PR} y2={y40}
              stroke="#10b98130" strokeWidth="1" strokeDasharray="4,3" />
            <text x={PL - 2} y={y40 - 2} fontSize="7" fill="#10b981" textAnchor="end">40</text>
          </>
        )}
        {segments.length > 0 && (
          <path d={segments.join(' ')} fill="none" stroke="#3b82f6" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" />
        )}
        {data.map((d, i) => (
          <g key={i}>
            {d.hrv != null && (
              <circle cx={xOf(i)} cy={yOf(d.hrv)} r="2.5" fill="#3b82f6" />
            )}
            <text x={xOf(i)} y={H - 4} textAnchor="middle" fontSize="8" fill="#94a3b8">
              {d.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
