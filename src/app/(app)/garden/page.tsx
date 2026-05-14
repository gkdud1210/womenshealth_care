'use client'

import { useState, useEffect } from 'react'
import { GardenProvider, useGarden } from '@/contexts/GardenContext'
import { GardenField } from '@/components/garden/GardenField'
import { GardenSimulator } from '@/components/garden/GardenSimulator'
import { GardenSurvey } from '@/components/garden/GardenSurvey'
import { TemperamentModal } from '@/components/garden/TemperamentModal'
import { ORGANS } from '@/lib/tkm-scoring'
import { GROWTH_CONFIG } from '@/lib/bio-digital-twin'
import type { GardenResult, OrganKey } from '@/lib/tkm-scoring'
import type { GrowthStage } from '@/lib/bio-digital-twin'
import { useAuth } from '@/hooks/useAuth'

const SURVEY_KEY = 'ludia_garden_result_v1'

interface Saved {
  result: GardenResult
  answers: Record<string, number>
  date: string
}

type View = 'landing' | 'survey' | 'garden'

/* ── Inner page (needs GardenContext) ─────────────────────────── */
function GardenInner({ saved, onRescan }: { saved: Saved | null; onRescan: () => void }) {
  const { user } = useAuth()
  const { result } = useGarden()

  // Determine primary organ from survey or default to heart
  const surveyResult = saved?.result
  const primaryOrgan: OrganKey = surveyResult?.primary ?? 'heart'

  const primary   = result.organStates[primaryOrgan]
  const gc        = GROWTH_CONFIG[primary.growthStage as GrowthStage]
  const info      = ORGANS[primaryOrgan]

  return (
    <div className="min-h-screen pb-28 px-4 pt-4 max-w-lg mx-auto"
      style={{ background: 'linear-gradient(160deg,#f0fdf4 0%,#ecfdf5 40%,#f5f3ff 100%)' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-800">내 치유 정원</h1>
          <p className="text-[10px] text-slate-400">{user?.name ?? ''}님의 바이오 디지털 트윈</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-xl text-[10px] font-bold"
            style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a' }}>
            {gc.emoji} {gc.label}
          </div>
          <button onClick={onRescan}
            className="text-[10px] font-semibold px-2.5 py-1 rounded-xl"
            style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>
            재진단
          </button>
        </div>
      </div>

      {/* ── Garden Field ── */}
      <GardenField primaryOrgan={primaryOrgan} />

      {/* ── Survey summary if exists ── */}
      {surveyResult && (
        <div className="mt-4 rounded-3xl p-4"
          style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(22,163,74,0.12)', boxShadow: '0 4px 20px rgba(22,163,74,0.07)' }}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">설문 기반 오장 진단</p>
          <div className="grid grid-cols-5 gap-1.5">
            {(['heart','liver','spleen','lung','kidney'] as OrganKey[]).map(o => {
              const sc = surveyResult.scores[o]
              const active = o === surveyResult.primary
              return (
                <div key={o} className="text-center p-2 rounded-xl"
                  style={{
                    background: active ? `rgba(22,163,74,0.12)` : 'rgba(248,250,252,0.8)',
                    border: active ? '1.5px solid rgba(22,163,74,0.3)' : '1px solid rgba(230,230,240,0.6)',
                  }}>
                  <p className="text-[8px] text-slate-500 mb-0.5">{ORGANS[o].name}</p>
                  <p className="text-xs font-black text-slate-700">{sc.raw}<span className="text-[8px] font-normal">/10</span></p>
                  <p className="text-[8px]">{sc.state === 'glowing' ? '✨' : sc.state === 'wilting' ? '🥺' : '🌿'}</p>
                </div>
              )
            })}
          </div>
          <p className="text-[9px] text-slate-400 text-center mt-2">
            마지막 진단: {saved ? new Date(saved.date).toLocaleDateString('ko-KR') : '-'}
          </p>
        </div>
      )}

      {/* ── Bio-Digital Twin info card ── */}
      <div className="mt-4 rounded-3xl p-4"
        style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(22,163,74,0.12)', boxShadow: '0 4px 20px rgba(22,163,74,0.07)' }}>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">오늘 {info.vegetable} 상태</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { label: '선천 체질',      value: `취약도 ${primary.constitutionScore}`, color: '#7c3aed', icon: '👁' },
            { label: '토양 품질',      value: primary.soilQuality === 'optimal' ? '비옥' : primary.soilQuality === 'heavy' ? '밀도 높음' : '건조', color: '#5D4037', icon: '🌱' },
            { label: 'HRV 활력',       value: `${Math.round(primary.vitalityScore)}점`, color: primary.vitalityScore >= 60 ? '#16a34a' : '#d97706', icon: '♥' },
            { label: 'EDA 스트레스',   value: primary.alertLevel === 'calm' ? '안정' : primary.alertLevel === 'moderate' ? '중등' : '급등', color: primary.alertLevel === 'high' ? '#dc2626' : '#d97706', icon: '⚡' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="p-2.5 rounded-2xl"
              style={{ background: `${color}0D`, border: `1px solid ${color}25` }}>
              <p className="text-[9px] text-slate-400 mb-0.5">{icon} {label}</p>
              <p className="text-xs font-black" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-600 leading-relaxed px-1">
          {ORGANS[primaryOrgan].advice[
            primary.comprehensiveScore >= 70 ? 'glowing'
            : primary.comprehensiveScore >= 40 ? 'normal'
            : 'wilting'
          ]}
        </p>
      </div>

      {/* ── Simulator ── */}
      <div className="mt-4">
        <GardenSimulator />
      </div>

    </div>
  )
}

/* ── Root page with state management ─────────────────────────── */
export default function GardenPage() {
  const [view, setView]         = useState<View>('landing')
  const [saved, setSaved]       = useState<Saved | null>(null)
  const [pendingResult, setPendingResult] = useState<{ result: GardenResult; answers: Record<string, number> } | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SURVEY_KEY)
      if (raw) {
        setSaved(JSON.parse(raw))
        setView('garden')
      }
    } catch {}
  }, [])

  function handleSurveyComplete(result: GardenResult, answers: Record<string, number>) {
    // 설문 완료 → 기질 모달 먼저 표시
    setPendingResult({ result, answers })
  }

  function handleTemperamentClose() {
    if (!pendingResult) return
    const data: Saved = { result: pendingResult.result, answers: pendingResult.answers, date: new Date().toISOString() }
    setSaved(data)
    try { localStorage.setItem(SURVEY_KEY, JSON.stringify(data)) } catch {}
    setPendingResult(null)
    setView('garden')
  }

  function rescan() {
    setSaved(null)
    try { localStorage.removeItem(SURVEY_KEY) } catch {}
    setView('survey')
  }

  /* ── Landing ── */
  if (view === 'landing') {
    return (
      <div className="min-h-screen pb-28 px-4 pt-6 max-w-lg mx-auto"
        style={{ background: 'linear-gradient(160deg,#f0fdf4 0%,#ecfdf5 40%,#f5f3ff 100%)' }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-4"
            style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 8px 32px rgba(22,163,74,0.35)' }}>
            <span className="text-5xl">🌱</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">내 치유 정원</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            한의학 오장 × 홍채 × HRV × EDA 융합<br />
            바이오 디지털 트윈으로 건강 캐릭터를 키워보세요
          </p>
        </div>

        {/* Feature cards */}
        <div className="space-y-2 mb-8">
          {[
            { icon: '👁', title: '홍채 분석', desc: '선천 체질(種子)을 결정', color: '#7c3aed' },
            { icon: '♥', title: 'HRV 활력',  desc: '기(氣) 순환 → 성장 레벨 결정', color: '#16a34a' },
            { icon: '⚡', title: 'EDA 스트레스', desc: '화(火) 반응 → 진동 오버레이', color: '#d97706' },
            { icon: '⚖️', title: 'BMI 토양',  desc: '체형 → 성장 환경 품질', color: '#3730a3' },
          ].map(({ icon, title, desc, color }) => (
            <div key={title} className="flex items-center gap-3 p-3 rounded-2xl"
              style={{ background: `${color}0A`, border: `1px solid ${color}22` }}>
              <span className="text-xl w-8 text-center">{icon}</span>
              <div>
                <p className="text-xs font-bold text-slate-800">{title}</p>
                <p className="text-[10px] text-slate-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setView('survey')}
          className="w-full py-4 rounded-2xl text-sm font-bold text-white transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 6px 24px rgba(22,163,74,0.35)' }}
        >
          오장 진단 시작하기 🌱
        </button>

        <button
          onClick={() => setView('garden')}
          className="w-full py-3 mt-2 rounded-2xl text-sm font-semibold text-emerald-700 transition-all active:scale-95"
          style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)' }}
        >
          바로 정원 보기 (시뮬레이터)
        </button>
      </div>
    )
  }

  /* ── Survey ── */
  if (view === 'survey') {
    return (
      <div className="min-h-screen pb-28 px-4 pt-5 max-w-lg mx-auto"
        style={{ background: 'linear-gradient(160deg,#f0fdf4 0%,#ecfdf5 40%,#f5f3ff 100%)' }}>
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => setView('landing')} className="text-slate-400 text-sm hover:text-slate-600">
            ← 뒤로
          </button>
          <h1 className="text-base font-bold text-slate-700">오장(五臟) 에너지 진단</h1>
        </div>
        <GardenSurvey onComplete={handleSurveyComplete} />
        {pendingResult && (
          <TemperamentModal result={pendingResult.result} onClose={handleTemperamentClose} />
        )}
      </div>
    )
  }

  /* ── Garden (with context) ── */
  return (
    <GardenProvider>
      <GardenInner saved={saved} onRescan={rescan} />
    </GardenProvider>
  )
}
