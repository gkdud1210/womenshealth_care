'use client'

// 저장된 진단 기록들로 홍채·HRV·스트레스·BMI·수면 변화를 그래프로 보여줘요.

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, LineChart as LineIcon } from 'lucide-react'
import type { DiagnosticSession } from '@/lib/diagnosticHistory'

interface Series { key: string; label: string; color: string }
interface Metric {
  id: string
  /** 두 번째 선의 단위가 달라 오른쪽 축을 따로 써요 */
  dualAxis?: boolean
  title: string
  unit: string
  /** 값이 오를수록 좋은 지표인지 (스트레스·심박·BMI는 내려가야 좋아요) */
  higherIsBetter: boolean
  series: Series[]
  pick: (s: DiagnosticSession) => Record<string, number>
  domain?: [number | 'auto', number | 'auto']
}

const METRICS: Metric[] = [
  {
    id: 'iris', title: '홍채 점수', unit: '점', higherIsBetter: true,
    series: [{ key: 'left', label: '좌안', color: '#a855f7' }, { key: 'right', label: '우안', color: '#f43f75' }],
    pick: s => ({ left: s.data.iris.leftScore, right: s.data.iris.rightScore }),
  },
  {
    id: 'hrv', title: '심박변이(HRV)', unit: 'ms', higherIsBetter: true,
    series: [{ key: 'hrv', label: 'HRV', color: '#f43f75' }],
    pick: s => ({ hrv: s.data.biosignal.hrv }),
  },
  {
    id: 'stress', title: '스트레스 · 이완 (EDA)', unit: '/100', higherIsBetter: false,
    series: [{ key: 'stress', label: '스트레스', color: '#ef4444' }, { key: 'relax', label: '이완', color: '#06b6d4' }],
    pick: s => ({ stress: s.data.eda.stressIndex, relax: s.data.eda.relaxationScore }),
  },
  {
    id: 'bmi', title: 'BMI · 체중', unit: '', higherIsBetter: false, dualAxis: true,
    series: [{ key: 'bmi', label: 'BMI', color: '#f59e0b' }, { key: 'weight', label: '체중(kg)', color: '#64748b' }],
    pick: s => ({ bmi: s.data.biosignal.bmi, weight: s.data.biosignal.weight }),
  },
  {
    id: 'sleep', title: '수면 · 심박', unit: '', higherIsBetter: true, dualAxis: true,
    series: [{ key: 'sleep', label: '수면(시간)', color: '#6366f1' }, { key: 'hr', label: '심박(bpm)', color: '#94a3b8' }],
    pick: s => ({ sleep: s.data.biosignal.sleepHours, hr: s.data.biosignal.heartRate }),
  },
]

function fmtDay(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function round(v: number) { return Math.round(v * 10) / 10 }

function Change({ first, last, higherIsBetter, unit }: { first: number; last: number; higherIsBetter: boolean; unit: string }) {
  const diff = round(last - first)
  if (Math.abs(diff) < 0.1) return <span className="flex items-center gap-0.5 text-[11px] text-slate-400"><Minus className="w-3 h-3" /> 변화 없음</span>
  const good = diff > 0 === higherIsBetter
  const Icon = diff > 0 ? TrendingUp : TrendingDown
  return (
    <span className="flex items-center gap-0.5 text-[11px] font-bold" style={{ color: good ? '#059669' : '#e11d48' }}>
      <Icon className="w-3 h-3" /> {diff > 0 ? '+' : ''}{diff}{unit}
    </span>
  )
}

export function DiagnosticTrends({ sessions, highlightId }: { sessions: DiagnosticSession[]; highlightId?: string }) {
  const ordered = [...sessions].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  if (ordered.length < 2) return null
  const highlight = ordered.find(s => s.id === highlightId)
  // 같은 날 여러 번 검사해도 x축이 겹치지 않게 순번을 붙여요
  const xKey = (s: DiagnosticSession, i: number) => `${fmtDay(s.createdAt)}${ordered.filter((o, j) => j < i && fmtDay(o.createdAt) === fmtDay(s.createdAt)).length ? `#${i}` : ''}`

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <LineIcon className="w-4 h-4 text-purple-500" />
        <h3 className="text-sm font-semibold text-slate-700">변화 추이</h3>
        <span className="ml-auto text-[11px] text-slate-400">
          {fmtDay(ordered[0].createdAt)} ~ {fmtDay(ordered[ordered.length - 1].createdAt)} · {ordered.length}회 진단
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {METRICS.map(m => {
          const data = ordered.map((s, i) => ({ x: xKey(s, i), ...m.pick(s) }))
          const main = m.series[0].key
          const first = m.pick(ordered[0])[main]
          const last = m.pick(ordered[ordered.length - 1])[main]
          const hx = highlight ? data[ordered.indexOf(highlight)].x : undefined
          return (
            <div key={m.id} className="rounded-2xl bg-white/70 border border-slate-100 p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <p className="text-[12px] font-semibold text-slate-600">{m.title}</p>
                  <p className="text-lg font-bold font-display text-slate-800 leading-tight">
                    {round(last)}<span className="text-[11px] font-medium text-slate-400 ml-0.5">{m.unit}</span>
                  </p>
                </div>
                <Change first={first} last={last} higherIsBetter={m.higherIsBetter} unit={m.unit === '/100' ? '' : m.unit} />
              </div>
              <ResponsiveContainer width="100%" height={110}>
                <LineChart data={data} margin={{ top: 6, right: m.dualAxis ? -18 : 6, bottom: 0, left: -24 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
                  <XAxis dataKey="x" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="l" tick={{ fontSize: 10, fill: m.series[0].color }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                  {m.dualAxis && (
                    <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: m.series[1].color }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                  )}
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #e2e8f0' }} />
                  {hx && <ReferenceLine yAxisId="l" x={hx} stroke="#a855f7" strokeDasharray="3 3" />}
                  {m.series.map((se, i) => (
                    <Line key={se.key} yAxisId={m.dualAxis && i === 1 ? 'r' : 'l'} type="monotone" dataKey={se.key} name={se.label} stroke={se.color}
                      strokeWidth={2} dot={{ r: 2.5 }} activeDot={{ r: 4 }} isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              {m.series.length > 1 && (
                <div className="flex gap-3 mt-1">
                  {m.series.map(se => (
                    <span key={se.key} className="flex items-center gap-1 text-[10.5px] text-slate-500">
                      <span className="w-2 h-2 rounded-full" style={{ background: se.color }} /> {se.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {highlight && <p className="text-[10.5px] text-slate-400">보라색 점선이 이 리포트의 진단 시점이에요.</p>}
    </div>
  )
}
