'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts'
import { Zap, Activity, Shield, AlertTriangle, CheckCircle, Waves } from 'lucide-react'
import { cn } from '@/lib/utils'

const CONDUCTANCE_TIMELINE = Array.from({ length: 30 }, (_, i) => ({
  t: `${i * 2}s`,
  conductance: Math.max(2, Math.min(25, 8.4 + Math.sin(i * 0.55) * 3.5 + Math.random() * 1.5)),
  baseline: 8.4,
}))

const ANS_DATA = Array.from({ length: 20 }, (_, i) => ({
  t: `${i}s`,
  sympathetic:    Math.max(10, 58 + Math.sin(i * 0.8) * 14 + Math.random() * 5),
  parasympathetic: Math.max(10, 42 - Math.sin(i * 0.8) * 11 + Math.random() * 5),
}))

const STRESS_TIMELINE = Array.from({ length: 30 }, (_, i) => ({
  t: `${i * 2}s`,
  stress:  Math.max(20, Math.min(95, 68 + Math.sin(i * 0.6) * 16 + Math.random() * 7)),
  relax:   Math.max(15, Math.min(90, 65 - Math.sin(i * 0.6) * 12 + Math.random() * 6)),
}))

const EDA_RADAR = [
  { axis: '스트레스 반응', val: 72 },
  { axis: '긴장도',        val: 78 },
  { axis: '이완도',        val: 65 },
  { axis: '부교감 균형',   val: 42 },
  { axis: '피부 전도',     val: 56 },
  { axis: '회복력',        val: 60 },
]

const CONDUCTANCE   = 8.4
const STRESS_INDEX  = 68
const ANS_BALANCE   = 42
const TENSION_LEVEL = 78
const RELAX_SCORE   = 65

export function EDAAnalysisView() {
  const stressLevel = STRESS_INDEX >= 70 ? 'high' : STRESS_INDEX >= 45 ? 'moderate' : 'low'

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            icon: Zap,
            label: '피부 전도도',
            value: CONDUCTANCE,
            unit: 'μS',
            sub: CONDUCTANCE >= 4 && CONDUCTANCE <= 16 ? '정상 범위' : '주의',
            iconBg: 'bg-cyan-100', iconColor: 'text-cyan-500',
            valueColor: CONDUCTANCE >= 4 && CONDUCTANCE <= 16 ? 'text-cyan-600' : 'text-amber-500',
          },
          {
            icon: Activity,
            label: '스트레스 지수',
            value: STRESS_INDEX,
            unit: '/ 100',
            sub: stressLevel === 'high' ? '⚠ 높음' : stressLevel === 'moderate' ? '보통' : '낮음',
            iconBg: 'bg-rose-100', iconColor: 'text-rose-500',
            valueColor: stressLevel === 'high' ? 'text-rose-600' : stressLevel === 'moderate' ? 'text-amber-500' : 'text-green-600',
          },
          {
            icon: Waves,
            label: '긴장도',
            value: TENSION_LEVEL,
            unit: '/ 100',
            sub: TENSION_LEVEL >= 70 ? '긴장 상태' : TENSION_LEVEL >= 50 ? '보통' : '이완',
            iconBg: 'bg-amber-100', iconColor: 'text-amber-500',
            valueColor: TENSION_LEVEL >= 70 ? 'text-amber-600' : 'text-green-600',
          },
          {
            icon: Shield,
            label: '부교감 균형',
            value: ANS_BALANCE,
            unit: '%',
            sub: ANS_BALANCE < 45 ? '교감신경 우세' : '균형 양호',
            iconBg: 'bg-blue-100', iconColor: 'text-blue-500',
            valueColor: ANS_BALANCE < 45 ? 'text-amber-500' : 'text-green-600',
          },
        ].map(({ icon: Icon, label, value, unit, sub, iconBg, iconColor, valueColor }) => (
          <div key={label} className="glass-card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className={cn('icon-badge-md rounded-xl', iconBg)}>
                <Icon className={cn('w-4 h-4', iconColor)} />
              </div>
              <span className="text-2xs text-slate-400 text-right leading-tight">{sub}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={cn('text-2xl font-bold font-display', valueColor)}>{value}</span>
              <span className="text-xs text-slate-400">{unit}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Main row: Conductance + Stress Timelines ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">

        {/* Conductance Timeline */}
        <div className="lg:col-span-7 glass-card p-4 sm:p-5">
          <div className="mb-4">
            <h4 className="card-title">피부 전도도 타임라인</h4>
            <p className="text-2xs text-slate-400 mt-0.5">EDA Skin Conductance Level (SCL) · μS</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={CONDUCTANCE_TIMELINE} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
              <defs>
                <linearGradient id="condGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,182,212,0.08)" />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={4} />
              <YAxis domain={[0, 28]} tick={{ fontSize: 9, fill: '#94a3b8' }}
                label={{ value: 'μS', angle: -90, position: 'insideLeft', fontSize: 9, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 11 }}
                formatter={(v: number) => [v.toFixed(1) + 'μS', '전도도']} />
              <ReferenceLine y={4}  stroke="#22c55e" strokeDasharray="3 3" strokeWidth={1} label={{ value: '하한', fontSize: 8, fill: '#22c55e' }} />
              <ReferenceLine y={16} stroke="#22c55e" strokeDasharray="3 3" strokeWidth={1} label={{ value: '상한', fontSize: 8, fill: '#22c55e' }} />
              <Area type="monotone" dataKey="conductance" stroke="#06b6d4" strokeWidth={2} fill="url(#condGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded bg-cyan-400" />
              <span className="text-2xs text-slate-500">피부 전도도</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-px border-t border-dashed border-green-400" />
              <span className="text-2xs text-slate-400">정상 범위 (4-16μS)</span>
            </div>
          </div>
        </div>

        {/* EDA Radar */}
        <div className="lg:col-span-5 glass-card p-4 sm:p-5">
          <h4 className="card-title mb-1">EDA 지표 종합</h4>
          <p className="text-2xs text-slate-400 mb-2">6가지 자율신경 반응 분포</p>
          <ResponsiveContainer width="100%" height={210}>
            <RadarChart data={EDA_RADAR}>
              <PolarGrid stroke="rgba(6,182,212,0.15)" />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <Radar dataKey="val" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2}
                strokeWidth={2} dot={{ r: 3, fill: '#06b6d4' }} />
              <Tooltip formatter={(v: number) => [`${v}점`, '']}
                contentStyle={{ borderRadius: '12px', fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Stress/Relax + ANS Balance ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">

        {/* Stress/Relax Timeline */}
        <div className="glass-card p-4 sm:p-5">
          <h4 className="card-title mb-1">스트레스·이완 타임라인</h4>
          <p className="text-2xs text-slate-400 mb-4">EDA 반응 기반 실시간 추적</p>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={STRESS_TIMELINE} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="edaStG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f43f75" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f43f75" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="edaRlG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,63,117,0.06)" />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={4} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 11 }}
                formatter={(v: number, name: string) => [v.toFixed(0), name === 'stress' ? '스트레스' : '이완도']} />
              <ReferenceLine y={65} stroke="#f43f75" strokeDasharray="3 3" strokeWidth={1} />
              <Area type="monotone" dataKey="stress" stroke="#f43f75" strokeWidth={2} fill="url(#edaStG)" dot={false} name="stress" />
              <Area type="monotone" dataKey="relax"  stroke="#22c55e" strokeWidth={2} fill="url(#edaRlG)" dot={false} name="relax" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded bg-rose-400" />
              <span className="text-2xs text-slate-500">스트레스</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded bg-green-400" />
              <span className="text-2xs text-slate-500">이완도</span>
            </div>
          </div>
        </div>

        {/* ANS Balance */}
        <div className="glass-card p-4 sm:p-5">
          <h4 className="card-title mb-1">자율신경계 균형</h4>
          <p className="text-2xs text-slate-400 mb-4">교감 vs 부교감 신경 활성도 (EDA 기반)</p>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={ANS_DATA} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="edaSympG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="edaParaG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.07)" />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={3} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 11 }}
                formatter={(v: number, name: string) => [v.toFixed(0) + '%', name === 'sympathetic' ? '교감' : '부교감']} />
              <ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth={1} />
              <Area type="monotone" dataKey="sympathetic"     stroke="#f59e0b" strokeWidth={2} fill="url(#edaSympG)" dot={false} name="sympathetic" />
              <Area type="monotone" dataKey="parasympathetic" stroke="#3b82f6" strokeWidth={2} fill="url(#edaParaG)" dot={false} name="parasympathetic" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex justify-between text-2xs text-slate-400 mb-1">
              <span>교감 (Fight/Flight)</span>
              <span>부교감 (Rest/Digest)</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${100 - ANS_BALANCE}%`, background: 'linear-gradient(to right, #f59e0b, #f43f75)' }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-2xs font-semibold text-amber-500">{100 - ANS_BALANCE}%</span>
              <span className="text-2xs font-semibold text-blue-500">{ANS_BALANCE}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI Interpretation ── */}
      <div className="glass-card p-5 border-l-4 border-cyan-400">
        <h4 className="card-title mb-3">⚡ EDA AI 해석</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              type: 'warn' as const,
              icon: AlertTriangle,
              title: '교감신경 우세 상태',
              desc: `피부 전도도 ${CONDUCTANCE}μS, 스트레스 지수 ${STRESS_INDEX}점. 황체기와 맞물려 코르티솔 상승으로 피부 전도도가 높게 측정됩니다.`,
              tags: ['교감 우세', '코르티솔 주의'],
            },
            {
              type: 'warn' as const,
              icon: Waves,
              title: '긴장도 상승',
              desc: `긴장도 ${TENSION_LEVEL}점으로 기준(50점)을 초과합니다. 이완도 ${RELAX_SCORE}점으로 긴장-이완 불균형이 감지됩니다.`,
              tags: ['긴장도 ↑', '이완 필요'],
            },
            {
              type: 'ok' as const,
              icon: CheckCircle,
              title: '전도도 정상 범위',
              desc: `피부 전도도 ${CONDUCTANCE}μS — 정상 범위(4-16μS) 내에 있습니다. 기기 접촉 상태 및 기저 전도도가 안정적입니다.`,
              tags: ['전도도 정상', '기저선 안정'],
            },
            {
              type: 'info' as const,
              icon: Shield,
              title: '이완 프로토콜 권장',
              desc: '4-7-8 호흡법, 바이오피드백 이완 훈련으로 부교감 신경을 활성화하세요. EDA 피부 반응이 즉각 개선됩니다.',
              tags: ['호흡법 권장', '자율신경 강화'],
            },
          ].map(({ type, icon: Icon, title, desc, tags }) => (
            <div key={title} className={cn('alert-card', `alert-${type}`)}>
              <Icon className={cn('w-4 h-4 flex-shrink-0 mt-0.5',
                type === 'warn' ? 'text-amber-500' :
                type === 'info' ? 'text-blue-500' : 'text-green-500')} />
              <div>
                <p className="text-sm font-semibold text-slate-800">{title}</p>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{desc}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.map(tag => (
                    <span key={tag} className="badge-neutral text-2xs">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
