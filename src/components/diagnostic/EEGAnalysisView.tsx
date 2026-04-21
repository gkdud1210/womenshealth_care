'use client'

import { useState } from 'react'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts'
import { Brain, Zap, Wind, Shield, AlertTriangle, CheckCircle, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrainTopoMap } from './BrainTopoMap'
import { BrainSurface3D } from './BrainSurface3D'

/* ── Mock data ── */
const STRESS_TIMELINE = Array.from({ length: 30 }, (_, i) => ({
  t: `${i * 2}s`,
  stress:  Math.max(20, Math.min(90, 55 + Math.sin(i * 0.6) * 18 + Math.random() * 8)),
  relax:   Math.max(15, Math.min(85, 48 - Math.sin(i * 0.6) * 12 + Math.random() * 6)),
}))

const ANS_DATA = Array.from({ length: 20 }, (_, i) => ({
  t: `${i}s`,
  sympathetic:   Math.max(10, 58 + Math.sin(i * 0.8) * 15 + Math.random() * 5),
  parasympathetic: Math.max(10, 42 - Math.sin(i * 0.8) * 12 + Math.random() * 5),
}))

const BAND_POWER = [
  { band: 'Delta\n(0.5-4Hz)', power: 28, norm: 35, label: '델타' },
  { band: 'Theta\n(4-8Hz)',   power: 42, norm: 30, label: '세타' },
  { band: 'Alpha\n(8-13Hz)',  power: 65, norm: 55, label: '알파' },
  { band: 'Beta\n(13-30Hz)',  power: 78, norm: 45, label: '베타' },
  { band: 'Gamma\n(30+Hz)',   power: 32, norm: 20, label: '감마' },
]

const FREQ_SPECTRUM = Array.from({ length: 50 }, (_, i) => {
  const hz = i * 1.2
  const delta = hz < 4  ? 28 * Math.exp(-((hz - 1.5) ** 2) / 3) : 0
  const theta = hz > 3 && hz < 9  ? 38 * Math.exp(-((hz - 6) ** 2) / 4)   : 0
  const alpha = hz > 7 && hz < 14 ? 62 * Math.exp(-((hz - 10) ** 2) / 6)  : 0
  const beta  = hz > 12 && hz < 32 ? 72 * Math.exp(-((hz - 20) ** 2) / 25) : 0
  const gamma = hz > 30 ? 28 * Math.exp(-((hz - 38) ** 2) / 30) : 0
  return { hz: hz.toFixed(1), power: Math.max(0, delta + theta + alpha + beta + gamma + Math.random() * 3) }
})

const COHERENCE_RADAR = [
  { axis: '전두엽\n집중력', val: 62 },
  { axis: '측두엽\n언어/감정', val: 58 },
  { axis: '두정엽\n감각통합', val: 71 },
  { axis: '후두엽\n시각처리', val: 75 },
  { axis: '소뇌\n균형', val: 68 },
  { axis: '전반적\n이완', val: 52 },
]

type TopoMode = 'stress' | 'alpha' | 'beta' | 'theta'
const TOPO_MODES: { id: TopoMode; label: string; color: string }[] = [
  { id: 'stress', label: '스트레스', color: 'text-rose-600' },
  { id: 'beta',   label: '베타파',   color: 'text-amber-600' },
  { id: 'alpha',  label: '알파파',   color: 'text-green-600' },
  { id: 'theta',  label: '세타파',   color: 'text-blue-600' },
]

const STRESS_INDEX  = 68
const ANS_BALANCE   = 42  // % parasympathetic (42 = slightly sympathetic dominant)
const COHERENCE_IDX = 71

export function EEGAnalysisView() {
  const [topoMode, setTopoMode] = useState<TopoMode>('stress')
  const [view3D, setView3D] = useState(false)

  const stressLevel = STRESS_INDEX >= 70 ? 'high' : STRESS_INDEX >= 45 ? 'moderate' : 'low'

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            icon: Brain,
            label: '스트레스 지수',
            value: STRESS_INDEX,
            unit: '/ 100',
            sub: stressLevel === 'high' ? '⚠ 높음' : stressLevel === 'moderate' ? '보통' : '낮음',
            iconBg: 'bg-rose-100', iconColor: 'text-rose-500',
            valueColor: stressLevel === 'high' ? 'text-rose-600' : stressLevel === 'moderate' ? 'text-amber-500' : 'text-green-600',
          },
          {
            icon: Activity,
            label: '자율신경 균형',
            value: ANS_BALANCE,
            unit: '% 부교감',
            sub: ANS_BALANCE < 45 ? '교감신경 우세' : '균형 양호',
            iconBg: 'bg-blue-100', iconColor: 'text-blue-500',
            valueColor: ANS_BALANCE < 45 ? 'text-amber-500' : 'text-green-600',
          },
          {
            icon: Zap,
            label: '뇌파 코히런스',
            value: COHERENCE_IDX,
            unit: '/ 100',
            sub: '전두-두정 동기화',
            iconBg: 'bg-purple-100', iconColor: 'text-purple-500',
            valueColor: 'text-purple-600',
          },
          {
            icon: Wind,
            label: '알파파 지수',
            value: 65,
            unit: 'μV²/Hz',
            sub: '이완 상태 양호',
            iconBg: 'bg-green-100', iconColor: 'text-green-500',
            valueColor: 'text-green-600',
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

      {/* ── Main row: Topo Map + Freq Spectrum ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">

        {/* Brain Topo Map */}
        <div className="lg:col-span-4 glass-card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="card-title">뇌파 토포그래피</h4>
              <p className="text-2xs text-slate-400 mt-0.5">10-20 전극 배치 · 두피 분포도</p>
            </div>
          </div>

          {/* Mode selector */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {TOPO_MODES.map(m => (
              <button key={m.id} onClick={() => setTopoMode(m.id)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-2xs font-semibold border transition-all duration-150',
                  topoMode === m.id
                    ? `bg-white shadow-sm border-rose-200 ${m.color}`
                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-rose-200'
                )}>
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex justify-center">
            <BrainTopoMap band={topoMode} size={220} />
          </div>

          {/* Color scale */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-2xs text-slate-400">낮음</span>
            <div className="flex-1 h-2 rounded-full"
              style={{ background: 'linear-gradient(to right, #1e50dc, #1eb4c8, #32d250, #f0be1e, #f03c3c)' }} />
            <span className="text-2xs text-slate-400">높음</span>
          </div>
        </div>

        {/* Frequency Spectrum */}
        <div className="lg:col-span-8 glass-card p-4 sm:p-5">
          <div className="flex items-start justify-between mb-4 gap-2">
            <div>
              <h4 className="card-title">EEG 주파수 스펙트럼</h4>
              <p className="text-2xs text-slate-400 mt-0.5">Power Spectral Density (PSD)</p>
            </div>
            <div className="flex flex-wrap gap-1 justify-end">
              {[
                { label: 'δ Delta', color: '#6366f1' },
                { label: 'θ Theta', color: '#3b82f6' },
                { label: 'α Alpha', color: '#22c55e' },
                { label: 'β Beta',  color: '#f59e0b' },
                { label: 'γ Gamma', color: '#ef4444' },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-50 border border-slate-100">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-2xs text-slate-500 hidden sm:inline">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={FREQ_SPECTRUM} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
              <defs>
                {[
                  { id: 'gDelta', color: '#6366f1' },
                  { id: 'gTheta', color: '#3b82f6' },
                  { id: 'gAlpha', color: '#22c55e' },
                  { id: 'gBeta',  color: '#f59e0b' },
                  { id: 'gGamma', color: '#ef4444' },
                ].map(({ id, color }) => (
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,63,117,0.06)" />
              <XAxis dataKey="hz" tick={{ fontSize: 9, fill: '#94a3b8' }}
                label={{ value: 'Hz', position: 'insideRight', fontSize: 9, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }}
                label={{ value: 'μV²', angle: -90, position: 'insideLeft', fontSize: 9, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 11, border: '1px solid #fce7f3' }}
                formatter={(v: number) => [v.toFixed(1), 'Power']} />
              <Area type="monotone" dataKey="power" stroke="#f43f75" strokeWidth={2}
                fill="url(#gBeta)" dot={false} />
              {/* Band range markers */}
              <ReferenceLine x="4.0"  stroke="#6366f1" strokeDasharray="2 2" strokeWidth={1} />
              <ReferenceLine x="8.4"  stroke="#3b82f6" strokeDasharray="2 2" strokeWidth={1} />
              <ReferenceLine x="13.2" stroke="#22c55e" strokeDasharray="2 2" strokeWidth={1} />
              <ReferenceLine x="30.0" stroke="#f59e0b" strokeDasharray="2 2" strokeWidth={1} />
            </AreaChart>
          </ResponsiveContainer>

          {/* Band Power Bars */}
          <div className="mt-4 grid grid-cols-5 gap-2">
            {BAND_POWER.map(b => {
              const colors = ['#6366f1', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444']
              const ci = BAND_POWER.indexOf(b)
              return (
                <div key={b.label} className="text-center">
                  <div className="text-xs font-bold mb-1" style={{ color: colors[ci] }}>{b.label}</div>
                  <div className="h-16 flex items-end justify-center gap-1">
                    {/* Current */}
                    <div className="w-3 rounded-t-sm transition-all duration-700"
                      style={{ height: `${b.power}%`, backgroundColor: colors[ci], opacity: 0.9 }} />
                    {/* Normal range */}
                    <div className="w-3 rounded-t-sm bg-slate-200"
                      style={{ height: `${b.norm}%` }} />
                  </div>
                  <div className="flex justify-center gap-1 mt-1">
                    <span className="text-2xs font-semibold" style={{ color: colors[ci] }}>{b.power}</span>
                    <span className="text-2xs text-slate-300">/</span>
                    <span className="text-2xs text-slate-400">{b.norm}</span>
                  </div>
                  <p className="text-2xs text-slate-400">현재/기준</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Stress + ANS Charts ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 lg:gap-5">

        {/* Stress timeline */}
        <div className="sm:col-span-1 lg:col-span-5 glass-card p-4 sm:p-5">
          <h4 className="card-title mb-1">스트레스·이완 타임라인</h4>
          <p className="text-2xs text-slate-400 mb-4">베타/알파 비율 기반 실시간 추적</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={STRESS_TIMELINE} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="stressG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f43f75" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f43f75" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="relaxG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,63,117,0.06)" />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={4} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 11 }}
                formatter={(v: number, name: string) => [v.toFixed(0), name === 'stress' ? '스트레스' : '이완']} />
              <ReferenceLine y={70} stroke="#f43f75" strokeDasharray="3 3" strokeWidth={1} />
              <Area type="monotone" dataKey="stress" stroke="#f43f75" strokeWidth={2} fill="url(#stressG)" dot={false} name="stress" />
              <Area type="monotone" dataKey="relax"  stroke="#22c55e" strokeWidth={2} fill="url(#relaxG)"  dot={false} name="relax" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded bg-rose-400" />
              <span className="text-2xs text-slate-500">스트레스 (Beta↑)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded bg-green-400" />
              <span className="text-2xs text-slate-500">이완 (Alpha↑)</span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <div className="w-3 h-px bg-rose-300 border-t border-dashed border-rose-400" />
              <span className="text-2xs text-slate-400">경고 기준 70</span>
            </div>
          </div>
        </div>

        {/* ANS Balance */}
        <div className="sm:col-span-1 lg:col-span-4 glass-card p-4 sm:p-5">
          <h4 className="card-title mb-1">자율신경계 균형</h4>
          <p className="text-2xs text-slate-400 mb-4">교감 vs 부교감 신경 활성도</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={ANS_DATA} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="sympG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="parasG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.07)" />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={3} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 11 }}
                formatter={(v: number, name: string) => [v.toFixed(0) + '%', name === 'sympathetic' ? '교감' : '부교감']} />
              <ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth={1} label={{ value: '균형', fontSize: 8, fill: '#94a3b8' }} />
              <Area type="monotone" dataKey="sympathetic"    stroke="#f59e0b" strokeWidth={2} fill="url(#sympG)"  dot={false} name="sympathetic" />
              <Area type="monotone" dataKey="parasympathetic" stroke="#3b82f6" strokeWidth={2} fill="url(#parasG)" dot={false} name="parasympathetic" />
            </AreaChart>
          </ResponsiveContainer>

          {/* Balance gauge */}
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex justify-between text-2xs text-slate-400 mb-1">
              <span>교감 (Fight/Flight)</span>
              <span>부교감 (Rest/Digest)</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${100 - ANS_BALANCE}%`,
                  background: 'linear-gradient(to right, #f59e0b, #f43f75)',
                }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-2xs font-semibold text-amber-500">{100 - ANS_BALANCE}%</span>
              <span className="text-2xs font-semibold text-blue-500">{ANS_BALANCE}%</span>
            </div>
          </div>
        </div>

        {/* Brain Coherence Radar */}
        <div className="sm:col-span-2 lg:col-span-3 glass-card p-4 sm:p-5">
          <h4 className="card-title mb-1">뇌 영역 코히런스</h4>
          <p className="text-2xs text-slate-400 mb-2">뇌파 동기화 분포</p>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={COHERENCE_RADAR}>
              <PolarGrid stroke="rgba(244,63,117,0.12)" />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 8, fill: '#94a3b8' }} />
              <Radar dataKey="val" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2}
                strokeWidth={2} dot={{ r: 3, fill: '#a855f7' }} />
              <Tooltip formatter={(v: number) => [`${v}점`, '코히런스']}
                contentStyle={{ borderRadius: '12px', fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── 3D Surface Plot ── */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="card-title">3D 주파수-시간-파워 분석</h4>
            <p className="text-2xs text-slate-400 mt-0.5">EEG 대역별 시간 흐름에 따른 파워 변화 · 자동 회전</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {[
                { color: '#1e50dc', label: 'Low' },
                { color: '#1eb4c8', label: '' },
                { color: '#32d250', label: 'Mid' },
                { color: '#f0be1e', label: '' },
                { color: '#f03c3c', label: 'High' },
              ].map(({ color, label }) => (
                <div key={color} className="flex flex-col items-center gap-0.5">
                  <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: color }} />
                  {label && <span className="text-2xs text-slate-400">{label}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-slate-950 rounded-2xl p-4 overflow-hidden">
          <BrainSurface3D />
        </div>
        <p className="text-2xs text-slate-400 text-center mt-2">
          X축: 시간(초) · Y축: 파워(μV²) · Z축: 주파수 대역 (Delta → Gamma)
        </p>
      </div>

      {/* ── AI Interpretation ── */}
      <div className="glass-card p-5 border-l-4 border-purple-400">
        <h4 className="card-title mb-3">🧠 뇌파 AI 해석</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              type: 'warn' as const,
              icon: AlertTriangle,
              title: '교감신경 우세 상태',
              desc: '베타파(13-30Hz) 활성이 기준치 대비 73% 높습니다. 현재 황체기와 맞물려 스트레스 호르몬(코르티솔) 상승 가능성이 있습니다.',
              tags: ['베타파 과활성', '코르티솔 주의'],
            },
            {
              type: 'info' as const,
              icon: Brain,
              title: '전두엽 집중력 저하',
              desc: '전두엽(Fp1, Fp2, F3, F4) 알파파가 평균보다 낮습니다. 생리 전 PMS로 인한 인지 기능 저하와 연관될 수 있습니다.',
              tags: ['전두엽', 'PMS 연관'],
            },
            {
              type: 'ok' as const,
              icon: CheckCircle,
              title: '두정-후두엽 안정적',
              desc: '알파파(8-13Hz)가 후두엽 영역에서 정상 범위를 유지하고 있습니다. 시각 처리 및 감각 통합 기능은 양호합니다.',
              tags: ['알파파 정상', '감각 통합 양호'],
            },
            {
              type: 'info' as const,
              icon: Shield,
              title: '이완 프로토콜 권장',
              desc: '세타파(4-8Hz) 강화를 위한 명상·심호흡을 권장합니다. 황체기 자율신경 안정에 효과적입니다.',
              tags: ['명상 권장', '자율신경 강화'],
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
