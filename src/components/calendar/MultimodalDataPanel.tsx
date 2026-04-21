'use client'

import { useState } from 'react'
import { Eye, Thermometer, Brain, Activity, ChevronDown, ChevronUp, Sliders, RotateCcw, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MultimodalData } from './LudiaInsightCard'

export const DEFAULT_MULTIMODAL: MultimodalData = {
  iris:      { leftScore: 67, rightScore: 71, skinZone: 48, thyroidZone: 71 },
  thermal:   { uterineTemp: 35.8, leftOvaryTemp: 36.4, rightOvaryTemp: 36.6 },
  eeg:       { stressIndex: 68, alphaRatio: 65, betaRatio: 78, ansBalance: 42 },
  biosignal: { hrv: 42, sleepHours: 7.5, heartRate: 72 },
}

interface FieldDef {
  key: string
  label: string
  unit: string
  min: number
  max: number
  step: number
  hint: string
  statusFn: (v: number) => 'ok' | 'warn' | 'critical'
}

interface SectionDef {
  id: keyof MultimodalData
  icon: typeof Eye
  label: string
  sublabel: string
  iconBg: string
  iconColor: string
  accentColor: string
  fields: FieldDef[]
}

const SECTIONS: SectionDef[] = [
  {
    id: 'iris',
    icon: Eye,
    label: '홍채 3D 스캔',
    sublabel: 'Iris Pattern Indices',
    iconBg: 'bg-purple-100', iconColor: 'text-purple-600', accentColor: '#a855f7',
    fields: [
      { key: 'leftScore',   label: '좌안 밀도',   unit: '점', min: 0, max: 100, step: 1, hint: '75+ 정상', statusFn: v => v >= 75 ? 'ok' : v >= 60 ? 'warn' : 'critical' },
      { key: 'rightScore',  label: '우안 밀도',   unit: '점', min: 0, max: 100, step: 1, hint: '75+ 정상', statusFn: v => v >= 75 ? 'ok' : v >= 60 ? 'warn' : 'critical' },
      { key: 'skinZone',    label: '피부 Zone',   unit: '점', min: 0, max: 100, step: 1, hint: '75+ 정상', statusFn: v => v >= 75 ? 'ok' : v >= 60 ? 'warn' : 'critical' },
      { key: 'thyroidZone', label: '갑상선 Zone', unit: '점', min: 0, max: 100, step: 1, hint: '75+ 정상', statusFn: v => v >= 75 ? 'ok' : v >= 60 ? 'warn' : 'critical' },
    ],
  },
  {
    id: 'thermal',
    icon: Thermometer,
    label: '열화상 스캔',
    sublabel: 'Thermal 320×240 Matrix',
    iconBg: 'bg-orange-100', iconColor: 'text-orange-600', accentColor: '#f97316',
    fields: [
      { key: 'uterineTemp',    label: '자궁 온도',      unit: '°C', min: 34.0, max: 39.0, step: 0.1, hint: '36.5+ 정상', statusFn: v => v >= 36.5 ? 'ok' : v >= 36.0 ? 'warn' : 'critical' },
      { key: 'leftOvaryTemp',  label: '좌측 난소 온도', unit: '°C', min: 34.0, max: 39.0, step: 0.1, hint: '36.5+ 정상', statusFn: v => v >= 36.5 ? 'ok' : v >= 36.0 ? 'warn' : 'critical' },
      { key: 'rightOvaryTemp', label: '우측 난소 온도', unit: '°C', min: 34.0, max: 39.0, step: 0.1, hint: '36.5+ 정상', statusFn: v => v >= 36.5 ? 'ok' : v >= 36.0 ? 'warn' : 'critical' },
    ],
  },
  {
    id: 'eeg',
    icon: Brain,
    label: 'EEG 뇌파',
    sublabel: 'Alpha / Beta Wave Ratios',
    iconBg: 'bg-blue-100', iconColor: 'text-blue-600', accentColor: '#3b82f6',
    fields: [
      { key: 'stressIndex', label: '스트레스 지수', unit: '/100', min: 0, max: 100, step: 1, hint: '<45 정상', statusFn: v => v < 45 ? 'ok' : v < 65 ? 'warn' : 'critical' },
      { key: 'alphaRatio',  label: '알파파 비율',  unit: '%',    min: 0, max: 100, step: 1, hint: '55%+ 이완', statusFn: v => v >= 55 ? 'ok' : v >= 40 ? 'warn' : 'critical' },
      { key: 'betaRatio',   label: '베타파 비율',  unit: '%',    min: 0, max: 100, step: 1, hint: '<50% 정상', statusFn: v => v < 50 ? 'ok' : v < 70 ? 'warn' : 'critical' },
      { key: 'ansBalance',  label: '부교감 균형',  unit: '%',    min: 0, max: 100, step: 1, hint: '45%+ 균형', statusFn: v => v >= 45 ? 'ok' : v >= 35 ? 'warn' : 'critical' },
    ],
  },
  {
    id: 'biosignal',
    icon: Activity,
    label: '바이오 신호',
    sublabel: 'HRV · Sleep · Heart Rate',
    iconBg: 'bg-rose-100', iconColor: 'text-rose-600', accentColor: '#f43f75',
    fields: [
      { key: 'hrv',        label: 'HRV',      unit: 'ms',  min: 10, max: 100, step: 1,   hint: '40ms+ 양호', statusFn: v => v >= 40 ? 'ok' : v >= 28 ? 'warn' : 'critical' },
      { key: 'sleepHours', label: '수면 시간', unit: '시간', min: 2,  max: 12,  step: 0.5, hint: '7h+ 권장', statusFn: v => v >= 7 ? 'ok' : v >= 6 ? 'warn' : 'critical' },
      { key: 'heartRate',  label: '심박수',   unit: 'bpm', min: 40, max: 120, step: 1,   hint: '55-85 정상', statusFn: v => v >= 55 && v <= 85 ? 'ok' : v >= 45 && v <= 100 ? 'warn' : 'critical' },
    ],
  },
]

const STATUS_TRACK_COLOR = { ok: '#22c55e', warn: '#f59e0b', critical: '#f43f75' }
const STATUS_DOT  = { ok: 'bg-green-400', warn: 'bg-amber-400', critical: 'bg-rose-500 animate-pulse' }
const STATUS_TEXT = { ok: 'text-green-600', warn: 'text-amber-600', critical: 'text-rose-600' }

interface Props {
  value: MultimodalData
  onChange: (data: MultimodalData) => void
}

export function MultimodalDataPanel({ value, onChange }: Props) {
  const [open, setOpen]  = useState(false)
  const [expanded, setExpanded] = useState<Set<keyof MultimodalData>>(new Set<keyof MultimodalData>(['eeg', 'thermal']))

  function toggle(id: keyof MultimodalData) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function updateField(section: keyof MultimodalData, key: string, v: number) {
    onChange({ ...value, [section]: { ...(value[section] as Record<string, number>), [key]: v } })
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* ── Toggle header ── */}
      <button onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between p-4 sm:p-5 transition-colors hover:bg-rose-50/20 text-left">
        <div className="flex items-center gap-3">
          {/* Gold icon */}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #d4af37, #b8962e)',
              boxShadow: '0 2px 12px rgba(212,175,55,0.3)',
            }}>
            <Sliders className="w-4 h-4 text-white" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-700">멀티모달 데이터 입력</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)', color: '#9a7d26' }}>
                4-WAY FUSION
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">홍채 · 열화상 · EEG · 바이오신호 → AI 인사이트 연동</p>
          </div>
        </div>

        {/* Status dots summary */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:flex gap-1">
            {SECTIONS.map(s => {
              const sectionData = value[s.id] as Record<string, number>
              const anyWarn = s.fields.some(f => {
                const st = f.statusFn(sectionData[f.key])
                return st === 'warn' || st === 'critical'
              })
              const anyCrit = s.fields.some(f => f.statusFn(sectionData[f.key]) === 'critical')
              return (
                <div key={s.id} className={cn('w-2 h-2 rounded-full',
                  anyCrit ? 'bg-rose-500 animate-pulse' : anyWarn ? 'bg-amber-400' : 'bg-green-400'
                )} />
              )
            })}
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {/* ── Expandable body ── */}
      {open && (
        <div className="border-t border-rose-100/60 px-4 sm:px-5 pb-5">
          {/* Info banner */}
          <div className="flex items-start gap-2.5 mt-4 mb-4 p-3 rounded-xl"
            style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}>
            <Info className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              슬라이더를 조절하면 상단 LUDIA AI 인사이트가 즉시 업데이트됩니다. 실제 기기 데이터 연동 시 자동 입력됩니다.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SECTIONS.map(section => {
              const Icon = section.icon
              const isExp = expanded.has(section.id)
              const sectionData = value[section.id] as Record<string, number>

              return (
                <div key={section.id} className="rounded-2xl overflow-hidden"
                  style={{ background: 'rgba(248,244,246,0.65)', border: '1px solid rgba(244,63,117,0.08)' }}>

                  {/* Section header */}
                  <button onClick={() => toggle(section.id)}
                    className="w-full flex items-center justify-between p-3.5 transition-colors hover:bg-rose-50/30 text-left">
                    <div className="flex items-center gap-2.5">
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', section.iconBg)}>
                        <Icon className={cn('w-3.5 h-3.5', section.iconColor)} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-700 leading-none">{section.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{section.sublabel}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Mini status dots */}
                      <div className="flex gap-0.5">
                        {section.fields.map(f => {
                          const st = f.statusFn(sectionData[f.key])
                          return <div key={f.key} className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[st])} />
                        })}
                      </div>
                      {isExp
                        ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                        : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      }
                    </div>
                  </button>

                  {/* Fields */}
                  {isExp && (
                    <div className="px-3.5 pb-3.5 space-y-4 border-t border-rose-100/40 pt-3">
                      {section.fields.map(field => {
                        const v  = sectionData[field.key]
                        const st = field.statusFn(v)
                        const pct = ((v - field.min) / (field.max - field.min)) * 100
                        const trackColor = STATUS_TRACK_COLOR[st]

                        return (
                          <div key={field.key}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', STATUS_DOT[st])} />
                                <label className="text-xs font-medium text-slate-600">{field.label}</label>
                                <span className="text-[10px] text-slate-400 hidden sm:inline">— {field.hint}</span>
                              </div>
                              <span className={cn('text-sm font-bold font-display', STATUS_TEXT[st])}>
                                {v.toFixed(field.step < 1 ? 1 : 0)}{field.unit}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={field.min} max={field.max} step={field.step} value={v}
                              onChange={e => updateField(section.id, field.key, parseFloat(e.target.value))}
                              className="w-full"
                              style={{
                                background: `linear-gradient(to right, ${trackColor} 0%, ${trackColor} ${pct}%, #fce7f3 ${pct}%, #fce7f3 100%)`,
                              }}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Reset button */}
          <div className="flex justify-end mt-3">
            <button
              onClick={() => onChange(DEFAULT_MULTIMODAL)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-rose-500 hover:bg-rose-50 transition-all duration-200">
              <RotateCcw className="w-3 h-3" />
              기본값 초기화
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
