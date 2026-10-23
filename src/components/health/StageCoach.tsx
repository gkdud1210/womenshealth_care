'use client'

// 지금 나의 상태(주기·임신·완경 + 케어 모드)에 맞춘 영양소·식단·운동·수면 코칭 카드

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, CalendarHeart } from 'lucide-react'
import {
  BODY_META, MODE_META, INTENSITY_LABEL, bodyLabel,
  type Coaching, type LifeFlags,
} from '@/lib/life-stage'

type Tab = 'nutrient' | 'meal' | 'exercise' | 'sleep'
const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'nutrient', label: '영양소', emoji: '💊' },
  { key: 'meal',     label: '식단',   emoji: '🥗' },
  { key: 'exercise', label: '운동',   emoji: '🏃‍♀️' },
  { key: 'sleep',    label: '수면',   emoji: '🌙' },
]

/** 칼로리 카드 안에 들어가는 "지금 나" 한 줄 */
export function StatusChips({ coaching }: { coaching: Coaching }) {
  const s = coaching.status
  return (
    <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t border-white/20">
      <span className="text-[10.5px] font-semibold opacity-80 mr-0.5">지금 나</span>
      {s.modes.map((m, i) => (
        <span key={m} className="flex items-center gap-1">
          {i > 0 && <span className="text-[11px] opacity-70">+</span>}
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-bold">{MODE_META[m].emoji} {MODE_META[m].label}</span>
        </span>
      ))}
      {s.modes.length > 0 && <span className="text-[11px] opacity-70">+</span>}
      <span className="px-2 py-0.5 rounded-full bg-white text-[11px] font-bold" style={{ color: BODY_META[s.body].color }}>
        {BODY_META[s.body].emoji} {bodyLabel(s)}
      </span>
    </div>
  )
}

export default function StageCoach({ coaching, flags, onFlags }: {
  coaching: Coaching
  flags: { ttc: boolean; diet: boolean; ttcAvailable: boolean }
  onFlags: (next: LifeFlags) => void
}) {
  const [tab, setTab] = useState<Tab>('nutrient')
  const [editing, setEditing] = useState(false)
  const s = coaching.status
  const color = BODY_META[s.body].color

  return (
    <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
      <div className="px-4 pt-3.5 pb-3" style={{ background: `${color}0d` }}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold" style={{ color }}>나에게 맞춘 오늘의 코칭</p>
          <button onClick={() => setEditing(v => !v)}
            className="flex items-center gap-0.5 text-[11px] font-semibold text-slate-400">
            상태 바꾸기 <ChevronDown className={`w-3 h-3 transition-transform ${editing ? 'rotate-180' : ''}`} />
          </button>
        </div>
        <p className="text-[14.5px] font-bold text-slate-800 mt-1 leading-snug">{coaching.headline}</p>

        {editing && (
          <div className="mt-3 p-3 rounded-xl bg-white space-y-2">
            {flags.ttcAvailable && (
              <Toggle label="🍃 임신 준비 중이에요" on={flags.ttc} onChange={v => onFlags({ ttc: v })} />
            )}
            {s.body !== 'pregnancy' && (
              <Toggle label="⚖️ 다이어트 중이에요" on={flags.diet} onChange={v => onFlags({ diet: v })} />
            )}
            <Link href="/ludia-call/calendar"
              className="flex items-center justify-between pt-2 border-t border-slate-100 text-[12px] text-slate-500">
              <span className="flex items-center gap-1.5"><CalendarHeart className="w-3.5 h-3.5 text-rose-400" />
                생리 기록 · 임신/완경 모드는 캘린더에서</span>
              <span className="text-slate-300">›</span>
            </Link>
            <p className="text-[10.5px] text-slate-400">탈모·피부 같은 케어는 설정의 케어카드를 따라가요</p>
          </div>
        )}
      </div>

      {(coaching.adjustments.length > 0 || coaching.todayNotes.length > 0) && (
        <div className="px-4 py-3 space-y-1.5 border-b border-slate-100">
          {coaching.adjustments.map(t => (
            <p key={t} className="text-[12px] text-slate-700 leading-relaxed">⚖️ {t}</p>
          ))}
          {coaching.todayNotes.map(t => (
            <p key={t} className="text-[12px] text-slate-500 leading-relaxed">📌 {t}</p>
          ))}
        </div>
      )}

      <div className="flex px-2 pt-2 gap-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex-1 py-1.5 rounded-full text-[12px] font-bold transition-colors"
            style={tab === t.key ? { background: color, color: '#fff' } : { color: '#94a3b8' }}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-3">
        {tab === 'nutrient' && (
          <div className="space-y-2">
            {coaching.nutrients.map(n => (
              <div key={n.name} className="flex items-baseline gap-2">
                <span className="text-[12.5px] font-bold text-slate-800 flex-shrink-0">{n.name}</span>
                {n.amount && <span className="text-[11px] font-semibold flex-shrink-0" style={{ color }}>{n.amount}</span>}
                <span className="text-[11.5px] text-slate-500 min-w-0">{n.why}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'meal' && (
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-bold text-emerald-600 mb-1.5">챙겨 먹어요</p>
              <div className="flex flex-wrap gap-1.5">
                {coaching.foods.map(f => (
                  <span key={f} className="px-2.5 py-1 rounded-full text-[11.5px] font-semibold bg-emerald-50 text-emerald-700">{f}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-rose-500 mb-1.5">줄여요</p>
              <div className="flex flex-wrap gap-1.5">
                {coaching.avoid.map(f => (
                  <span key={f} className="px-2.5 py-1 rounded-full text-[11.5px] font-semibold bg-rose-50 text-rose-600">{f}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'exercise' && (
          <div className="space-y-2.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-bold text-slate-500">오늘 권장 강도</p>
                <p className="text-[12px] font-bold" style={{ color }}>{INTENSITY_LABEL[coaching.intensity]}</p>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex-1 h-1.5 rounded-full"
                    style={{ background: i <= coaching.intensity ? color : 'rgba(200,200,220,0.35)' }} />
                ))}
              </div>
            </div>
            <ul className="space-y-1">
              {coaching.exercise.map(e => <li key={e} className="text-[12.5px] text-slate-700">• {e}</li>)}
            </ul>
            {coaching.exerciseCautions.map(c => (
              <p key={c} className="text-[11.5px] text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 leading-relaxed">⚠️ {c}</p>
            ))}
          </div>
        )}

        {tab === 'sleep' && (
          <ul className="space-y-1">
            {coaching.sleep.map(e => <li key={e} className="text-[12.5px] text-slate-700 leading-relaxed">• {e}</li>)}
          </ul>
        )}
      </div>

      <p className="px-4 pb-3 text-[10px] text-slate-300">
        2020 한국인 영양소 섭취기준 바탕의 일반 가이드예요. 임신 중이거나 질환이 있으면 담당 의사와 상의하세요.
      </p>
    </div>
  )
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className="w-full flex items-center justify-between">
      <span className="text-[12.5px] font-semibold text-slate-700">{label}</span>
      <span className="w-9 h-5 rounded-full relative transition-colors" style={{ background: on ? '#f43f75' : '#e2e8f0' }}>
        <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" style={{ left: on ? 18 : 2 }} />
      </span>
    </button>
  )
}
