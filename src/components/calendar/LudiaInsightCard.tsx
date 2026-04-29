'use client'

import { useState, useEffect, useRef } from 'react'
import { Brain, ChevronRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPhaseLabel, getPhaseColor } from '@/lib/cycle-utils'
import type { CyclePhase } from '@/types/health'

export interface MultimodalData {
  iris:      { leftScore: number; rightScore: number; skinZone: number; thyroidZone: number }
  thermal:   { uterineTemp: number; leftOvaryTemp: number; rightOvaryTemp: number }
  eda:       { conductance: number; stressIndex: number; tensionLevel: number; relaxationScore: number; ansBalance: number }
  biosignal: { hrv: number; sleepHours: number; heartRate: number; weight: number; bmi: number }
}

interface DataPoint {
  label: string
  value: string
  status: 'ok' | 'warn' | 'critical' | 'info'
}

interface Insight {
  type: 'critical' | 'warn' | 'info' | 'ok'
  headline: string
  message: string
  actions: string[]
  dataPoints: DataPoint[]
}

function generate(phase: CyclePhase, cycleDay: number, d: MultimodalData): Insight {
  const stressHigh = d.eda.stressIndex >= 65
  const stressMid  = d.eda.stressIndex >= 45
  const coldUterus = d.thermal.uterineTemp < 36.2
  const lowHRV     = d.biosignal.hrv < 38
  const poorSleep  = d.biosignal.sleepHours < 6.5
  const irisAvg    = Math.round((d.iris.leftScore + d.iris.rightScore) / 2)
  const ansSym     = d.eda.ansBalance < 45

  const mkDP = (label: string, value: string, status: DataPoint['status']): DataPoint => ({ label, value, status })

  // ── LUTEAL ──────────────────────────────────────────────────────
  if (phase === 'luteal') {
    if (stressHigh && coldUterus) {
      return {
        type: 'critical',
        headline: '황체기 복합 스트레스 패턴 감지',
        message: `EDA 긴장도 ${d.eda.stressIndex}점 + 자궁 온도 ${d.thermal.uterineTemp}°C 냉기 패턴이 동시에 감지됩니다. 황체기 프로게스테론 저하와 코르티솔 길항이 겹쳐 PMS 증상이 심화될 위험이 높습니다. 즉시 온열 케어와 부교감 활성 프로토콜을 권장합니다.`,
        actions: ['핫팩 하복부 15분', '마그네슘 300mg', '4-7-8 심호흡', '따뜻한 생강차', '디지털 디톡스 1시간'],
        dataPoints: [
          mkDP('EDA 긴장도', `${d.eda.stressIndex}/100`, 'critical'),
          mkDP('자궁 온도', `${d.thermal.uterineTemp}°C`, 'critical'),
          mkDP('자율신경', ansSym ? '교감 우세' : '균형', ansSym ? 'warn' : 'ok'),
          mkDP('HRV', `${d.biosignal.hrv}ms`, lowHRV ? 'warn' : 'ok'),
        ],
      }
    }
    if (stressHigh) {
      return {
        type: 'warn',
        headline: '황체기 고스트레스 — 이완 케어 권장',
        message: `EDA 긴장도 ${d.eda.tensionLevel}점, 스트레스 지수 ${d.eda.stressIndex}점으로 기준치를 초과합니다. 황체기 에스트로겐 감소와 맞물려 불안·집중력 저하가 나타날 수 있습니다. HRV ${d.biosignal.hrv}ms — 부교감 신경 활성화가 필요합니다.`,
        actions: ['요가 니드라 20분', '마그네슘 + B6 보충', '저강도 산책 30분', '스크린 타임 제한'],
        dataPoints: [
          mkDP('EDA 긴장도', `${d.eda.stressIndex}/100`, 'warn'),
          mkDP('이완도', `${d.eda.relaxationScore}%`, d.eda.relaxationScore < 40 ? 'warn' : 'ok'),
          mkDP('수면', `${d.biosignal.sleepHours}h`, poorSleep ? 'warn' : 'ok'),
          mkDP('자궁 온도', `${d.thermal.uterineTemp}°C`, coldUterus ? 'warn' : 'ok'),
        ],
      }
    }
    return {
      type: 'info',
      headline: '황체기 안정 — 지속 모니터링 중',
      message: `D+${cycleDay} 황체기, EDA 긴장도 ${d.eda.stressIndex}점으로 관리 가능한 범위입니다. 자궁 온도 ${d.thermal.uterineTemp}°C, HRV ${d.biosignal.hrv}ms 안정적. 다음 생리 예정일까지 ${28 - cycleDay}일 — 주기 관리를 지속하세요.`,
      actions: ['오메가-3 보충', '규칙적 수면 루틴 유지', '항산화 식품 섭취'],
      dataPoints: [
        mkDP('EDA 긴장도', `${d.eda.stressIndex}/100`, 'ok'),
        mkDP('자궁 온도', `${d.thermal.uterineTemp}°C`, coldUterus ? 'warn' : 'ok'),
        mkDP('HRV', `${d.biosignal.hrv}ms`, lowHRV ? 'warn' : 'ok'),
        mkDP('수면', `${d.biosignal.sleepHours}h`, poorSleep ? 'warn' : 'ok'),
      ],
    }
  }

  // ── MENSTRUAL ────────────────────────────────────────────────────
  if (phase === 'menstrual') {
    if (coldUterus && lowHRV) {
      return {
        type: 'critical',
        headline: '생리기 냉기 + HRV 저하 — 즉각 케어 필요',
        message: `자궁 온도 ${d.thermal.uterineTemp}°C 냉기 + HRV ${d.biosignal.hrv}ms 저하로 생리통 심화 가능성이 높습니다. 홍채 분석 점수 ${irisAvg}점으로 전신 컨디션도 저하되어 있습니다. 온열 요법과 철분 보충이 우선입니다.`,
        actions: ['핫팩 하복부 즉시 적용', '철분 + 비타민 C 보충', '수면 8시간 확보', '카페인·알코올 제한'],
        dataPoints: [
          mkDP('자궁 온도', `${d.thermal.uterineTemp}°C`, 'critical'),
          mkDP('HRV', `${d.biosignal.hrv}ms`, 'critical'),
          mkDP('홍채 점수', `${irisAvg}`, irisAvg < 65 ? 'warn' : 'ok'),
          mkDP('EDA 긴장도', `${d.eda.stressIndex}/100`, stressHigh ? 'warn' : 'ok'),
        ],
      }
    }
    return {
      type: 'info',
      headline: '생리기 — 자궁 에너지 회복 시간',
      message: `자궁 온도 ${d.thermal.uterineTemp}°C. 에스트로겐·프로게스테론이 최저치입니다. 생리기는 자궁 내막 재생 시기 — 에너지 소비를 줄이고 내면 회복에 집중하세요. 홍채 분석 ${irisAvg}점, 수면 ${d.biosignal.sleepHours}h 기준으로 가벼운 활동을 권장합니다.`,
      actions: ['따뜻한 수분 충분 섭취', '철분·엽산 보충', '명상·스트레칭', '무리한 운동 자제'],
      dataPoints: [
        mkDP('자궁 온도', `${d.thermal.uterineTemp}°C`, coldUterus ? 'warn' : 'ok'),
        mkDP('HRV', `${d.biosignal.hrv}ms`, lowHRV ? 'warn' : 'ok'),
        mkDP('홍채 점수', `${irisAvg}`, irisAvg < 65 ? 'warn' : 'ok'),
        mkDP('수면', `${d.biosignal.sleepHours}h`, poorSleep ? 'warn' : 'ok'),
      ],
    }
  }

  // ── FOLLICULAR ───────────────────────────────────────────────────
  if (phase === 'follicular') {
    return {
      type: 'ok',
      headline: '난포기 에너지 상승 — 최적 활동 구간',
      message: `에스트로겐 상승기입니다. EDA 이완도 ${d.eda.relaxationScore}%로 인지 기능이 향상되는 최적의 구간입니다. HRV ${d.biosignal.hrv}ms — 신체 회복력이 양호합니다. 새로운 도전과 집중적인 업무·운동에 최적인 시기입니다.`,
      actions: ['고강도 운동 도전', '새로운 학습·창작', '사회적 활동 활성화', '단백질 보충'],
      dataPoints: [
        mkDP('EDA 이완도', `${d.eda.relaxationScore}%`, d.eda.relaxationScore >= 55 ? 'ok' : 'warn'),
        mkDP('자궁 온도', `${d.thermal.uterineTemp}°C`, coldUterus ? 'warn' : 'ok'),
        mkDP('HRV', `${d.biosignal.hrv}ms`, lowHRV ? 'warn' : 'ok'),
        mkDP('수면', `${d.biosignal.sleepHours}h`, poorSleep ? 'warn' : 'ok'),
      ],
    }
  }

  // ── OVULATION ────────────────────────────────────────────────────
  return {
    type: 'ok',
    headline: '배란기 — 생체 에너지 피크 구간',
    message: `LH 서지로 체온이 상승합니다 (현재 ${d.thermal.uterineTemp}°C). EDA 이완도 ${d.eda.relaxationScore}%로 높고 HRV ${d.biosignal.hrv}ms — 자율신경 균형이 최적입니다. 가임 능력 최고조, 활동 에너지와 집중력 모두 피크 상태입니다.`,
    actions: ['기초체온 측정 지속', '최대 강도 운동 가능', '중요 의사결정 최적 시기', '항산화 영양소 섭취'],
    dataPoints: [
      mkDP('자궁 온도', `${d.thermal.uterineTemp}°C`, 'ok'),
      mkDP('HRV', `${d.biosignal.hrv}ms`, lowHRV ? 'warn' : 'ok'),
      mkDP('EDA 이완도', `${d.eda.relaxationScore}%`, 'ok'),
      mkDP('수면', `${d.biosignal.sleepHours}h`, poorSleep ? 'warn' : 'ok'),
    ],
  }
}

/* ─── Typewriter hook ─────────────────────────────────────────── */
function useTypewriter(text: string, speed = 18) {
  const [displayed, setDisplayed] = useState(text)
  const [typing, setTyping] = useState(false)
  const prev = useRef(text)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (prev.current === text) return
    prev.current = text
    setTyping(true)
    setDisplayed('')
    let i = 0
    function tick() {
      i++
      setDisplayed(text.slice(0, i))
      if (i < text.length) {
        timer.current = setTimeout(tick, speed)
      } else {
        setTyping(false)
      }
    }
    timer.current = setTimeout(tick, 350)
    return () => clearTimeout(timer.current)
  }, [text, speed])

  return { displayed, typing }
}

/* ─── Component ───────────────────────────────────────────────── */
interface Props {
  phase: CyclePhase
  cycleDay: number
  data: MultimodalData
}

const TYPE_GRADIENTS = {
  critical: { bar: 'from-rose-400 via-pink-300 to-rose-400', glow: 'rgba(244,63,117,0.18)' },
  warn:     { bar: 'from-amber-400 via-yellow-300 to-amber-400', glow: 'rgba(212,175,55,0.15)' },
  info:     { bar: 'from-blue-400 via-sky-300 to-blue-400', glow: 'rgba(59,130,246,0.12)' },
  ok:       { bar: 'from-green-400 via-emerald-300 to-green-400', glow: 'rgba(34,197,94,0.12)' },
}
const TYPE_ACCENT = {
  critical: 'text-rose-600', warn: 'text-amber-600', info: 'text-blue-600', ok: 'text-emerald-600',
}
const TYPE_BG = {
  critical: 'rgba(255,241,245,0.75)', warn: 'rgba(255,251,235,0.75)',
  info: 'rgba(239,246,255,0.75)', ok: 'rgba(240,253,244,0.75)',
}
const STATUS_DOT = {
  critical: 'bg-rose-500 animate-pulse', warn: 'bg-amber-400', ok: 'bg-green-400', info: 'bg-blue-400',
}
const STATUS_TEXT = {
  critical: 'text-rose-600', warn: 'text-amber-600', ok: 'text-green-600', info: 'text-blue-600',
}

export function LudiaInsightCard({ phase, cycleDay, data }: Props) {
  const insight = generate(phase, cycleDay, data)
  const { displayed, typing } = useTypewriter(insight.message)
  const tg = TYPE_GRADIENTS[insight.type]

  return (
    <div className="relative rounded-3xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.9)',
        boxShadow: `0 8px 48px ${tg.glow}, 0 2px 12px rgba(158,18,57,0.05), inset 0 1px 0 rgba(255,255,255,0.95)`,
      }}>

      {/* Gradient accent bar */}
      <div className={cn('h-1 w-full bg-gradient-to-r', tg.bar)} />

      <div className="p-5 sm:p-6">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {/* LUDIA brain badge */}
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #0f0810 0%, #2d1129 55%, #1a0a18 100%)',
                  boxShadow: '0 4px 20px rgba(244,63,117,0.28), inset 0 1px 0 rgba(255,255,255,0.08)',
                }}>
                <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-rose-300" />
              </div>
              {/* Live pulse dot */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
                style={{ background: insight.type === 'ok' ? '#22c55e' : insight.type === 'critical' ? '#f43f75' : insight.type === 'warn' ? '#f59e0b' : '#3b82f6' }}>
                <div className="w-full h-full rounded-full animate-ping opacity-60"
                  style={{ background: insight.type === 'ok' ? '#22c55e' : insight.type === 'critical' ? '#f43f75' : insight.type === 'warn' ? '#f59e0b' : '#3b82f6' }} />
              </div>
            </div>

            <div>
              {/* Gold LUDIA label */}
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-black tracking-[0.18em] uppercase"
                  style={{
                    background: 'linear-gradient(135deg, #d4af37 0%, #b8962e 45%, #e8d07a 70%, #d4af37 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  }}>
                  LUDIA ANALYSIS
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)', color: '#9a7d26' }}>
                  <Sparkles className="w-2.5 h-2.5" /> AI
                </span>
              </div>
              <p className={cn('text-sm sm:text-base font-semibold leading-tight', TYPE_ACCENT[insight.type])}>
                {insight.headline}
              </p>
            </div>
          </div>

          {/* Phase pill — hidden on very small screens */}
          <div className="hidden sm:flex flex-col items-end flex-shrink-0">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mb-1">현재 주기</p>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: getPhaseColor(phase) + '18', border: `1px solid ${getPhaseColor(phase)}40` }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: getPhaseColor(phase) }} />
              <span className="text-xs font-bold" style={{ color: getPhaseColor(phase) }}>
                D+{cycleDay} · {getPhaseLabel(phase)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Typewriter message bubble ── */}
        <div className="relative mb-4 p-4 rounded-2xl overflow-hidden"
          style={{ background: TYPE_BG[insight.type], border: '1px solid rgba(244,63,117,0.07)' }}>
          {/* Dot grid overlay */}
          <div className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(244,63,117,0.05) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }} />
          <p className="text-sm text-slate-700 leading-relaxed relative z-10 font-light">
            {displayed}
            {typing && <span className="inline-block w-0.5 h-4 bg-rose-400 ml-0.5 animate-pulse align-middle rounded-full" />}
          </p>
        </div>

        {/* ── Data points grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {insight.dataPoints.map(dp => (
            <div key={dp.label} className="rounded-xl p-2.5 text-center"
              style={{ background: 'rgba(248,244,246,0.7)', border: '1px solid rgba(244,63,117,0.06)' }}>
              <div className="flex justify-center mb-1">
                <div className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[dp.status])} />
              </div>
              <p className={cn('text-sm font-bold font-display leading-none', STATUS_TEXT[dp.status])}>
                {dp.value}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 leading-tight">{dp.label}</p>
            </div>
          ))}
        </div>

        {/* ── Action chips ── */}
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-2.5">권장 액션</p>
          <div className="flex flex-wrap gap-1.5">
            {insight.actions.map((action, i) => (
              <div key={action}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium cursor-default transition-all hover:scale-105"
                style={i === 0 ? {
                  background: 'linear-gradient(135deg, rgba(244,63,117,0.14), rgba(244,63,117,0.07))',
                  border: '1px solid rgba(244,63,117,0.28)', color: '#e11d5a',
                } : {
                  background: 'rgba(248,244,246,0.9)', border: '1px solid rgba(244,63,117,0.1)', color: '#64748b',
                }}>
                <ChevronRight className="w-3 h-3 flex-shrink-0" />
                {action}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
