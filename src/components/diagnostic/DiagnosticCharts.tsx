'use client'

// 진단 리포트 그래프 — 이 기록의 실제 값으로 그려요 (예전 고정 예시 그래프 대신)

import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { BarChart3, Scale } from 'lucide-react'
import type { MultimodalData } from '@/components/calendar/LudiaInsightCard'
import { BMI_BANDS, bmiBand } from '@/lib/iris-psyche'

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)))

/** 0~100 점수로 바꾼 6개 축 — 높을수록 좋아요 */
function balanceAxes(d: MultimodalData) {
  const bmi = d.biosignal.bmi
  const bmiScore = bmi <= 0 ? 0 : clamp(100 - Math.abs(bmi - 21) * 12)
  return [
    { axis: '홍채', value: clamp((d.iris.leftScore + d.iris.rightScore) / 2) },
    { axis: '이완', value: clamp(d.eda.relaxationScore) },
    { axis: '자율신경 균형', value: clamp(d.eda.ansBalance * 1.6) },
    { axis: 'HRV 회복력', value: clamp(d.biosignal.hrv * 1.8) },
    { axis: '수면', value: clamp(d.biosignal.sleepHours / 8 * 100) },
    { axis: '체형(BMI)', value: bmiScore },
  ]
}

function MetricBar({ label, value, max, unit, note, goodHigh }: {
  label: string; value: number; max: number; unit: string; note: string; goodHigh: boolean
}) {
  const pct = Math.max(2, Math.min(100, value / max * 100))
  const good = goodHigh ? pct >= 60 : pct <= 45
  const warn = goodHigh ? pct < 40 : pct >= 65
  const status = good ? { t: '좋음', c: '#059669', i: '●' } : warn ? { t: '관리 필요', c: '#dc2626', i: '▲' } : { t: '보통', c: '#d97706', i: '■' }
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[12.5px] font-semibold text-slate-700">{label}</span>
        <span className="text-[12.5px] font-bold text-slate-800">
          {value}{unit} <span className="text-[10.5px] font-semibold" style={{ color: status.c }}>{status.i} {status.t}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 mt-1" title={`${label} ${value}${unit}`}>
        <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: '#8b5cf6' }} />
      </div>
      <p className="text-[10.5px] text-slate-400 mt-0.5">{note}</p>
    </div>
  )
}

export function BmiGauge({ bmi, weight }: { bmi: number; weight?: number }) {
  if (!bmi || bmi <= 0) return null
  const lo = 15, hi = 35
  const pos = (v: number) => Math.max(0, Math.min(100, (v - lo) / (hi - lo) * 100))
  const band = bmiBand(bmi)
  let prev = lo
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Scale className="w-4 h-4 text-emerald-500" />
        <h3 className="text-sm font-semibold text-slate-700">BMI 체질량지수</h3>
        <span className="ml-auto text-[10.5px] text-slate-400">대한비만학회 기준</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[28px] font-black text-slate-900 leading-none">{bmi.toFixed(1)}</span>
        <span className="text-[13px] font-bold" style={{ color: band.color }}>{band.label}</span>
        {weight ? <span className="text-[11.5px] text-slate-400">· 체중 {weight}kg</span> : null}
      </div>
      <div className="relative mt-4">
        <div className="flex h-3 rounded-full overflow-hidden gap-[2px]">
          {BMI_BANDS.map(b => {
            const to = Math.min(hi, b.max)
            const w = pos(to) - pos(prev)
            prev = to
            return w > 0 ? <div key={b.label} style={{ width: `${w}%`, background: b.color, opacity: 0.85 }} /> : null
          })}
        </div>
        <div className="absolute -top-1.5 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-[3px] shadow"
          style={{ left: `${pos(bmi)}%`, borderColor: band.color }} aria-label={`BMI ${bmi}`} />
      </div>
      <div className="relative h-4 mt-1 text-[10px] text-slate-400">
        {[18.5, 23, 25, 30].map(v => (
          <span key={v} className="absolute -translate-x-1/2" style={{ left: `${pos(v)}%` }}>{v}</span>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
        {BMI_BANDS.map(b => (
          <span key={b.label} className="flex items-center gap-1 text-[10.5px] text-slate-500">
            <span className="w-2 h-2 rounded-full" style={{ background: b.color }} />{b.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function DiagnosticCharts({ data }: { data: MultimodalData }) {
  const axes = balanceAxes(data)
  const { eda, biosignal: b, iris } = data
  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-4 h-4 text-violet-500" />
          <h3 className="text-sm font-semibold text-slate-700">종합 균형 그래프</h3>
        </div>
        <p className="text-[11px] text-slate-400">6가지 지표를 0~100점으로 — 바깥으로 넓을수록 좋아요</p>
        <div className="h-64 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={axes} outerRadius="72%">
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Tooltip formatter={(v: number) => [`${v}점`, '점수']} contentStyle={{ fontSize: 12, borderRadius: 12 }} />
              <Radar dataKey="value" stroke="#8b5cf6" strokeWidth={2} fill="#8b5cf6" fillOpacity={0.18}
                dot={{ r: 4, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {axes.map(a => (
            <div key={a.axis} className="text-center rounded-xl bg-slate-50 py-1.5">
              <p className="text-[10.5px] text-slate-400">{a.axis}</p>
              <p className="text-[14px] font-black text-slate-800">{a.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">스트레스·자율신경 (EDA)</h3>
        <div className="space-y-3">
          <MetricBar label="스트레스 지수" value={eda.stressIndex} max={100} unit="" goodHigh={false} note="낮을수록 좋아요" />
          <MetricBar label="긴장도" value={eda.tensionLevel} max={100} unit="" goodHigh={false} note="근육·신경이 얼마나 긴장했는지" />
          <MetricBar label="이완 점수" value={eda.relaxationScore} max={100} unit="" goodHigh note="높을수록 잘 쉬고 있어요" />
          <MetricBar label="자율신경 균형" value={eda.ansBalance} max={100} unit="" goodHigh note="50 이상이면 부교감(휴식 신경)이 충분해요" />
          <MetricBar label="피부 전도도" value={eda.conductance} max={20} unit="μS" goodHigh={false} note="높으면 땀샘이 긴장 반응 중이에요" />
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">생체 신호</h3>
        <div className="space-y-3">
          <MetricBar label="HRV 심박변이" value={b.hrv} max={80} unit="ms" goodHigh note="높을수록 스트레스에서 잘 회복돼요 (40ms 이상 권장)" />
          <MetricBar label="수면" value={b.sleepHours} max={9} unit="시간" goodHigh note="7~8시간 권장" />
          <MetricBar label="안정 심박" value={b.heartRate} max={110} unit="bpm" goodHigh={false} note="60~80bpm 이 보통이에요" />
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">홍채 점수</h3>
        <div className="space-y-3">
          <MetricBar label="우안 (오른쪽 눈)" value={iris.rightScore} max={100} unit="점" goodHigh note="병소가 적을수록 높아요" />
          <MetricBar label="좌안 (왼쪽 눈)" value={iris.leftScore} max={100} unit="점" goodHigh note="병소가 적을수록 높아요" />
          <MetricBar label="갑상선 구역" value={iris.thyroidZone} max={100} unit="" goodHigh note="구역 밀도" />
          <MetricBar label="피부 구역" value={iris.skinZone} max={100} unit="" goodHigh note="구역 밀도" />
        </div>
      </div>

      <BmiGauge bmi={b.bmi} weight={b.weight} />
    </div>
  )
}
