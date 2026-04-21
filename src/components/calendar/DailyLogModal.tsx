'use client'

import { useState, useEffect } from 'react'
import { X, Droplets, Heart, Smile, Sparkles, Activity, Moon, Scale, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { calculateBodyScore } from '@/lib/body-score'
import { getPhaseLabel, getPhaseColor } from '@/lib/cycle-utils'
import type {
  DailyLogFormData, FlowLevel, MoodType, SkinCondition, DischargeType,
  FLOW_LABELS, MOOD_LABELS, SKIN_LABELS, DISCHARGE_LABELS
} from '@/types/health'
import {
  FLOW_LABELS as FL,
  MOOD_LABELS as ML,
  SKIN_LABELS as SL,
  DISCHARGE_LABELS as DL,
} from '@/types/health'

interface Props {
  date: Date
  existingLog?: DailyLogFormData
  cyclePhase?: DailyLogFormData['cyclePhase']
  onSave: (data: DailyLogFormData) => void
  onClose: () => void
}

const PAIN_LOCATIONS = [
  { id: 'lower_abdomen', label: '하복부' },
  { id: 'back', label: '허리/등' },
  { id: 'head', label: '두통' },
  { id: 'breast', label: '유방 통증' },
  { id: 'legs', label: '다리/허벅지' },
]

type TabId = 'menstrual' | 'symptoms' | 'mood_skin' | 'vitals' | 'notes'

const TABS: { id: TabId; label: string; icon: typeof Droplets }[] = [
  { id: 'menstrual', label: '생리', icon: Droplets },
  { id: 'symptoms', label: '증상', icon: Activity },
  { id: 'mood_skin', label: '기분/피부', icon: Smile },
  { id: 'vitals', label: '바이탈', icon: Heart },
  { id: 'notes', label: '메모', icon: FileText },
]

export function DailyLogModal({ date, existingLog, cyclePhase, onSave, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('menstrual')
  const [form, setForm] = useState<DailyLogFormData>({
    date: date.toISOString().split('T')[0],
    isPeriod: false,
    painLocations: [],
    ...existingLog,
  })

  const dateLabel = date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
  const score = calculateBodyScore(form)

  function set<K extends keyof DailyLogFormData>(key: K, value: DailyLogFormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function togglePainLocation(loc: string) {
    const locs = form.painLocations ?? []
    set('painLocations', locs.includes(loc) ? locs.filter(l => l !== loc) : [...locs, loc])
  }

  function handleSave() {
    onSave({ ...form, bodyScore: score })
  }

  const tabIndex = TABS.findIndex(t => t.id === activeTab)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      {/* Modal — fullscreen on mobile, centered card on sm+ */}
      <div className="relative w-full sm:max-w-lg bg-white sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up
                      max-h-[100dvh] sm:max-h-[90vh] flex flex-col
                      rounded-t-3xl fixed bottom-0 left-0 sm:static sm:bottom-auto">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-rose-50 to-pink-50 border-b border-rose-100/60">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center hover:bg-rose-50 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
          <div className="flex items-start justify-between pr-10">
            <div>
              <p className="text-xs text-rose-400 font-medium uppercase tracking-wider mb-1">Daily Health Log</p>
              <h2 className="font-display text-xl font-semibold text-slate-800">{dateLabel}</h2>
              {cyclePhase && (
                <span className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: getPhaseColor(cyclePhase) + '20', color: getPhaseColor(cyclePhase) }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getPhaseColor(cyclePhase) }} />
                  {getPhaseLabel(cyclePhase)}
                </span>
              )}
            </div>
            {/* Body Score Preview */}
            <div className="text-center">
              <div className={cn(
                'w-14 h-14 rounded-2xl flex flex-col items-center justify-center',
                score >= 80 ? 'bg-green-50' : score >= 60 ? 'bg-yellow-50' : 'bg-rose-50'
              )}>
                <span className={cn(
                  'text-2xl font-bold font-display leading-none',
                  score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-rose-600'
                )}>{score}</span>
                <span className="text-[9px] text-slate-400 mt-0.5">Body Score</span>
              </div>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex gap-1 mt-4 overflow-x-auto pb-0.5 scrollbar-hide">
            {TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200',
                    isActive
                      ? 'bg-rose-500 text-white shadow-soft'
                      : 'text-slate-500 hover:bg-white/60'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 flex-1 overflow-y-auto">

          {/* === MENSTRUAL TAB === */}
          {activeTab === 'menstrual' && (
            <div className="space-y-5">
              <div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={cn(
                    'w-12 h-6 rounded-full transition-all duration-300 relative',
                    form.isPeriod ? 'bg-rose-500' : 'bg-slate-200'
                  )} onClick={() => set('isPeriod', !form.isPeriod)}>
                    <div className={cn(
                      'absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300',
                      form.isPeriod ? 'left-7' : 'left-1'
                    )} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">오늘 생리 중</p>
                    <p className="text-xs text-slate-400">생리 첫날이거나 현재 진행 중인 경우</p>
                  </div>
                </label>
              </div>

              {form.isPeriod && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">출혈량</p>
                  <div className="grid grid-cols-5 gap-2">
                    {(Object.entries(FL) as [FlowLevel, string][]).map(([val, label]) => {
                      const levels = { spotting: 1, light: 2, medium: 3, heavy: 4, very_heavy: 5 }
                      const level = levels[val]
                      return (
                        <button key={val} onClick={() => set('periodFlow', val)}
                          className={cn(
                            'flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all duration-200',
                            form.periodFlow === val
                              ? 'border-rose-400 bg-rose-50'
                              : 'border-slate-100 hover:border-rose-200'
                          )}>
                          <div className="flex gap-0.5">
                            {Array.from({ length: level }).map((_, i) => (
                              <Droplets key={i} className={cn('w-3 h-3', form.periodFlow === val ? 'text-rose-500' : 'text-slate-300')} />
                            ))}
                          </div>
                          <span className="text-[10px] text-center leading-tight text-slate-500">{label.split(' ')[0]}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Discharge */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">분비물 상태</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(DL) as [DischargeType, string][]).map(([val, label]) => (
                    <button key={val} onClick={() => set('dischargeType', val)}
                      className={cn(
                        'text-left px-3 py-2.5 rounded-xl border-2 text-xs transition-all duration-200',
                        form.dischargeType === val
                          ? 'border-rose-400 bg-rose-50 text-rose-700 font-medium'
                          : 'border-slate-100 text-slate-600 hover:border-rose-200'
                      )}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* === SYMPTOMS TAB === */}
          {activeTab === 'symptoms' && (
            <div className="space-y-5">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">통증 강도</p>
                  <span className={cn(
                    'text-lg font-bold font-display',
                    (form.painIntensity ?? 0) <= 3 ? 'text-green-500'
                      : (form.painIntensity ?? 0) <= 6 ? 'text-yellow-500'
                        : 'text-rose-600'
                  )}>
                    {form.painIntensity ?? 0} <span className="text-xs text-slate-400 font-normal">/ 10</span>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="range" min="0" max="10" step="1"
                    value={form.painIntensity ?? 0}
                    onChange={e => set('painIntensity', Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #f43f75 0%, #f43f75 ${(form.painIntensity ?? 0) * 10}%, #fce7f3 ${(form.painIntensity ?? 0) * 10}%, #fce7f3 100%)`
                    }}
                  />
                  <div className="flex justify-between mt-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <span key={n} className="text-[10px] text-slate-300">{n}</span>
                    ))}
                  </div>
                </div>
              </div>

              {(form.painIntensity ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">통증 부위</p>
                  <div className="flex flex-wrap gap-2">
                    {PAIN_LOCATIONS.map(({ id, label }) => (
                      <button key={id} onClick={() => togglePainLocation(id)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all duration-200',
                          form.painLocations?.includes(id)
                            ? 'border-rose-400 bg-rose-50 text-rose-600'
                            : 'border-slate-200 text-slate-500 hover:border-rose-200'
                        )}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === MOOD & SKIN TAB === */}
          {activeTab === 'mood_skin' && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">오늘의 기분</p>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.entries(ML) as [MoodType, string][]).map(([val, label]) => {
                    const [emoji, text] = label.split(' ')
                    return (
                      <button key={val} onClick={() => set('mood', val)}
                        className={cn(
                          'flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all duration-200',
                          form.mood === val
                            ? 'border-rose-400 bg-rose-50 shadow-soft'
                            : 'border-slate-100 hover:border-rose-200'
                        )}>
                        <span className="text-xl">{emoji}</span>
                        <span className="text-[10px] text-slate-600">{text}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">피부 상태</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(SL) as [SkinCondition, string][]).map(([val, label]) => (
                    <button key={val} onClick={() => set('skinCondition', val)}
                      className={cn(
                        'text-left px-3 py-2.5 rounded-xl border-2 text-xs transition-all duration-200',
                        form.skinCondition === val
                          ? 'border-rose-400 bg-rose-50 text-rose-700 font-medium'
                          : 'border-slate-100 text-slate-600 hover:border-rose-200'
                      )}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {form.skinCondition?.includes('breakout') && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">여드름 개수</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => set('acneCount', Math.max(0, (form.acneCount ?? 0) - 1))}
                      className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-rose-100 transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-2xl font-bold font-display w-10 text-center text-slate-800">{form.acneCount ?? 0}</span>
                    <button onClick={() => set('acneCount', (form.acneCount ?? 0) + 1)}
                      className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-rose-100 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === VITALS TAB === */}
          {activeTab === 'vitals' && (
            <div className="space-y-4">
              {[
                { key: 'sleepHours', label: '수면 시간', unit: '시간', min: 0, max: 14, step: 0.5, icon: Moon },
                { key: 'sleepQuality', label: '수면 질', unit: '/ 10', min: 1, max: 10, step: 1, icon: Moon },
                { key: 'heartRate', label: '심박수', unit: 'bpm', min: 40, max: 160, step: 1, icon: Heart },
                { key: 'bodyTemperature', label: '체온', unit: '°C', min: 35, max: 40, step: 0.1, icon: Activity },
                { key: 'weight', label: '체중', unit: 'kg', min: 30, max: 120, step: 0.1, icon: Scale },
              ].map(({ key, label, unit, min, max, step, icon: Icon }) => (
                <div key={key} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-1">{label}</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={min} max={max} step={step}
                        value={form[key as keyof DailyLogFormData] as number ?? ''}
                        onChange={e => set(key as keyof DailyLogFormData, e.target.value ? Number(e.target.value) : undefined as never)}
                        placeholder="—"
                        className="w-20 text-sm font-semibold text-slate-800 bg-transparent outline-none border-b-2 border-slate-200 focus:border-rose-400 transition-colors"
                      />
                      <span className="text-xs text-slate-400">{unit}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* === NOTES TAB === */}
          {activeTab === 'notes' && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">오늘의 메모</p>
              <textarea
                rows={8}
                value={form.notes ?? ''}
                onChange={e => set('notes', e.target.value)}
                placeholder="오늘의 건강 상태, 특이사항, 복약 정보 등을 자유롭게 기록하세요..."
                className="w-full text-sm text-slate-700 placeholder-slate-300 bg-slate-50 rounded-xl px-4 py-3 resize-none outline-none border-2 border-transparent focus:border-rose-200 transition-colors"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-rose-100/60 flex items-center justify-between bg-rose-50/30">
          <div className="flex gap-1">
            {TABS.map((_, i) => (
              <div key={i} className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === tabIndex ? 'w-6 bg-rose-500' : 'w-1.5 bg-rose-200'
              )} />
            ))}
          </div>
          <div className="flex gap-2">
            {tabIndex > 0 && (
              <button onClick={() => setActiveTab(TABS[tabIndex - 1].id)}
                className="btn-ghost text-sm py-2 px-4">
                이전
              </button>
            )}
            {tabIndex < TABS.length - 1 ? (
              <button onClick={() => setActiveTab(TABS[tabIndex + 1].id)}
                className="btn-primary text-sm py-2 px-4">
                다음
              </button>
            ) : (
              <button onClick={handleSave} className="btn-primary text-sm py-2 px-5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                저장하기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
