'use client'

import { useState } from 'react'
import { useGarden } from '@/contexts/GardenContext'
import { PRESETS } from '@/lib/bio-digital-twin'
import type { OrganKey } from '@/lib/tkm-scoring'

const ORGAN_ACCENT: Record<OrganKey, string> = {
  heart: '#C41A4A', liver: '#1A7A3A', spleen: '#A16207', lung: '#7C3AED', kidney: '#3730A3',
}

/* ── Generic bio-slider ───────────────────────────────────────── */
function BioSlider({
  label, unit, value, min, max, step = 1, colorFn, onChange, desc,
}: {
  label: string; unit: string; value: number; min: number; max: number; step?: number
  colorFn: (v: number) => string; onChange: (v: number) => void; desc: string
}) {
  const pct = ((value - min) / (max - min)) * 100
  const color = colorFn(value)

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <div>
          <span className="text-xs font-bold text-slate-700">{label}</span>
          <span className="text-[10px] text-slate-400 ml-1.5">{desc}</span>
        </div>
        <span className="text-sm font-black tabular-nums" style={{ color }}>
          {typeof value === 'number' && step < 1 ? value.toFixed(1) : value}{unit}
        </span>
      </div>
      <div className="relative h-5 flex items-center">
        {/* Track */}
        <div className="absolute left-0 right-0 h-2 rounded-full overflow-hidden"
          style={{ background: 'rgba(200,200,220,0.35)' }}>
          <div className="h-full rounded-full transition-all duration-150"
            style={{ width: `${pct}%`, background: color }} />
        </div>
        {/* Range input */}
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute left-0 right-0 w-full opacity-0 h-5 cursor-pointer z-10"
        />
        {/* Thumb */}
        <div
          className="absolute w-5 h-5 rounded-full border-2 border-white shadow-md pointer-events-none transition-all duration-150"
          style={{ left: `calc(${pct}% - 10px)`, background: color }}
        />
      </div>
      {/* Ticks */}
      <div className="flex justify-between text-[8px] text-slate-400 px-0.5">
        <span>{min}{unit}</span>
        <span>{Math.round((min + max) / 2)}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

/* ── Color helpers ────────────────────────────────────────────── */
const hrv2color  = (v: number) => v >= 70 ? '#16a34a' : v >= 45 ? '#d97706' : '#dc2626'
const eda2color  = (v: number) => v <= 8  ? '#16a34a' : v <= 15  ? '#d97706' : '#dc2626'
const bmi2color  = (v: number) => v >= 18.5 && v <= 25 ? '#16a34a' : v > 30 ? '#dc2626' : '#d97706'
const iris2color = (_: number) => '#7c3aed'

/* ── BMI label ────────────────────────────────────────────────── */
function bmiLabel(bmi: number): string {
  if (bmi < 18.5) return '저체중'
  if (bmi < 25)   return '정상'
  if (bmi < 30)   return '과체중'
  return '비만'
}

/* ── Iris zone sliders ────────────────────────────────────────── */
const IRIS_ZONES: { key: keyof import('@/lib/bio-digital-twin').IrisData; organ: OrganKey; label: string }[] = [
  { key: 'heartZone',  organ: 'heart',  label: '심장(3-4링)' },
  { key: 'liverZone',  organ: 'liver',  label: '간(4-5링)' },
  { key: 'spleenZone', organ: 'spleen', label: '비장(3링)' },
  { key: 'lungZone',   organ: 'lung',   label: '폐(5-6링)' },
  { key: 'kidneyZone', organ: 'kidney', label: '신장(6-7링)' },
]

/* ── Main simulator ───────────────────────────────────────────── */
export function GardenSimulator() {
  const { inputs, result, setHrv, setEda, setBmi, setIris, applyPreset } = useGarden()
  const [irisOpen, setIrisOpen] = useState(false)

  return (
    <div className="rounded-3xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.94)',
        boxShadow: '0 4px 24px rgba(22,163,74,0.08)',
        border: '1px solid rgba(22,163,74,0.12)',
      }}>

      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-2xl flex items-center justify-center flex-none"
            style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 3px 12px rgba(22,163,74,0.3)' }}>
            <span className="text-sm font-black text-white">⚡</span>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 leading-none">바이오 시뮬레이터</p>
            <p className="text-[10px] text-slate-400 mt-0.5">HRV · EDA · BMI · 홍채 슬라이더로 캐릭터 변화 확인</p>
          </div>
        </div>

        {/* Overall vitality gauge */}
        <div className="mt-3 flex items-center gap-3">
          <span className="text-[10px] font-bold text-slate-500 flex-none">종합 활력</span>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(200,200,220,0.3)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${result.overallVitality}%`,
                background: `linear-gradient(90deg, #16a34a, #84cc16)`,
              }}
            />
          </div>
          <span className="text-sm font-black text-emerald-600 tabular-nums flex-none">
            {result.overallVitality}점
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">

        {/* Preset buttons */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">빠른 시나리오</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(PRESETS).map(([key, p]) => (
              <button
                key={key}
                onClick={() => applyPreset(p.inputs)}
                className="py-2 px-3 rounded-2xl text-[11px] font-semibold text-left transition-all duration-200 active:scale-95"
                style={{
                  background: 'rgba(22,163,74,0.06)',
                  border: '1px solid rgba(22,163,74,0.18)',
                  color: '#1e293b',
                }}
              >
                <span className="mr-1.5">{p.emoji}</span>{p.label}
              </button>
            ))}
          </div>
        </div>

        {/* HRV slider */}
        <div className="p-3 rounded-2xl" style={{ background: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.15)' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs font-bold text-emerald-700">♥ HRV (심박 변이도)</span>
            <span className="text-[9px] text-slate-400 px-1.5 py-0.5 rounded-full bg-white">TKM 기(氣) 순환 지표</span>
          </div>
          <BioSlider
            label="" unit="ms" value={inputs.hrv} min={20} max={100} step={1}
            colorFn={hrv2color} onChange={setHrv}
            desc="낮을수록 자율신경 불균형"
          />
          <p className="text-[9px] text-slate-400 mt-1">
            {inputs.hrv >= 70 ? '✅ 양호 — 자율신경 균형, 기(氣) 순환 원활'
             : inputs.hrv >= 45 ? '⚠️ 주의 — 스트레스 또는 피로 누적'
             : '🔴 위험 — 기(氣) 부족, 휴식 필요'}
          </p>
        </div>

        {/* EDA slider */}
        <div className="p-3 rounded-2xl" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs font-bold text-amber-700">⚡ EDA (피부전도도)</span>
            <span className="text-[9px] text-slate-400 px-1.5 py-0.5 rounded-full bg-white">TKM 화(火)·스트레스 지표</span>
          </div>
          <BioSlider
            label="" unit="μS" value={inputs.eda} min={0} max={20} step={0.5}
            colorFn={eda2color} onChange={setEda}
            desc="높을수록 교감신경 과활성"
          />
          <p className="text-[9px] text-slate-400 mt-1">
            {result.alertLevel === 'calm'    ? '✅ 차분 — 교감신경 안정, 화(火) 균형'
             : result.alertLevel === 'moderate' ? '⚠️ 활성 — 중등도 자극 또는 집중 상태'
             : '🔴 급등 — 스트레스 스파이크, 캐릭터 진동 효과 발생'}
          </p>
        </div>

        {/* BMI slider */}
        <div className="p-3 rounded-2xl" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs font-bold text-indigo-700">⚖️ BMI (체질량지수)</span>
            <span className="text-[9px] text-slate-400 px-1.5 py-0.5 rounded-full bg-white">TKM 토양 품질</span>
          </div>
          <BioSlider
            label="" unit="" value={inputs.bmi} min={15} max={35} step={0.5}
            colorFn={bmi2color} onChange={setBmi}
            desc="성장 환경 효율에 영향"
          />
          <p className="text-[9px] text-slate-400 mt-1">
            현재: <b>{bmiLabel(inputs.bmi)}</b>
            {' · '}
            {inputs.bmi > 25 ? '밀도 높은 토양 (BMI 보정 -18%)'
             : inputs.bmi < 18.5 ? '건조한 토양 (BMI 보정 -12%)'
             : '비옥한 토양 (보정 없음)'}
          </p>
        </div>

        {/* Iris section (collapsible) */}
        <div className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(124,58,237,0.2)' }}>
          <button
            onClick={() => setIrisOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3"
            style={{ background: 'rgba(124,58,237,0.05)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-purple-700">👁 홍채 분석 (선천 체질)</span>
              <span className="text-[9px] text-slate-400 px-1.5 py-0.5 rounded-full bg-white">5 오장 zone</span>
            </div>
            <span className="text-slate-400 text-sm">{irisOpen ? '▲' : '▼'}</span>
          </button>

          {irisOpen && (
            <div className="px-4 pb-4 pt-2 space-y-3">
              <p className="text-[10px] text-slate-400 leading-relaxed">
                홍채 zone 취약도 (0=건강, 100=고취약). 값이 높을수록 해당 장기 선천 취약성 표시.
              </p>
              {IRIS_ZONES.map(({ key, organ, label }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold" style={{ color: ORGAN_ACCENT[organ] }}>
                      {label}
                    </span>
                    <span className="text-[10px] font-black tabular-nums" style={{ color: ORGAN_ACCENT[organ] }}>
                      {inputs.iris[key]}
                    </span>
                  </div>
                  <BioSlider
                    label="" unit="" value={inputs.iris[key]} min={0} max={100} step={5}
                    colorFn={iris2color}
                    onChange={v => setIris({ ...inputs.iris, [key]: v })}
                    desc=""
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bio-state summary */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '토양', value: result.soilQuality === 'optimal' ? '비옥' : result.soilQuality === 'heavy' ? '밀도↑' : '건조', color: '#5D4037' },
            { label: '스트레스', value: result.alertLevel === 'calm' ? '안정' : result.alertLevel === 'moderate' ? '중등' : '급등', color: result.alertLevel === 'high' ? '#dc2626' : result.alertLevel === 'moderate' ? '#d97706' : '#16a34a' },
            { label: '종합', value: `${result.overallVitality}점`, color: result.overallVitality >= 70 ? '#16a34a' : result.overallVitality >= 40 ? '#d97706' : '#dc2626' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center p-2.5 rounded-2xl"
              style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
              <p className="text-[9px] text-slate-400 mb-0.5">{label}</p>
              <p className="text-xs font-black" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
