'use client'

import { useState } from 'react'
import { QUESTIONS, ORGANS, LIKERT, calcScores } from '@/lib/tkm-scoring'
import type { GardenResult } from '@/lib/tkm-scoring'

interface Props {
  onComplete: (result: GardenResult, answers: Record<string, number>) => void
}

const ORGAN_ORDER = ['heart', 'liver', 'spleen', 'lung', 'kidney'] as const

const ORGAN_BG: Record<string, string> = {
  heart:  'rgba(196,26,74,0.07)',
  liver:  'rgba(26,122,58,0.07)',
  spleen: 'rgba(161,98,7,0.07)',
  lung:   'rgba(124,58,237,0.07)',
  kidney: 'rgba(30,27,75,0.07)',
}
const ORGAN_BORDER: Record<string, string> = {
  heart:  'rgba(196,26,74,0.22)',
  liver:  'rgba(26,122,58,0.22)',
  spleen: 'rgba(161,98,7,0.22)',
  lung:   'rgba(124,58,237,0.22)',
  kidney: 'rgba(30,27,75,0.22)',
}
const ORGAN_ACCENT: Record<string, string> = {
  heart:  '#C41A4A',
  liver:  '#1A7A3A',
  spleen: '#A16207',
  lung:   '#7C3AED',
  kidney: '#1E1B4B',
}

export function GardenSurvey({ onComplete }: Props) {
  const [step, setStep] = useState(0)          // 0–9: question index
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [selected, setSelected] = useState<number | null>(null)

  const question = QUESTIONS[step]
  const organ = ORGANS[question.organ]
  const progress = ((step) / QUESTIONS.length) * 100
  const isLast = step === QUESTIONS.length - 1

  function handleSelect(value: number) {
    setSelected(value)
    setTimeout(() => {
      const next = { ...answers, [question.id]: value }
      setAnswers(next)
      setSelected(null)
      if (isLast) {
        onComplete(calcScores(next), next)
      } else {
        setStep(s => s + 1)
      }
    }, 320)
  }

  function handleBack() {
    if (step === 0) return
    setStep(s => s - 1)
    setSelected(null)
  }

  const bg = ORGAN_BG[question.organ]
  const border = ORGAN_BORDER[question.organ]
  const accent = ORGAN_ACCENT[question.organ]

  const organIdx = ORGAN_ORDER.indexOf(question.organ as typeof ORGAN_ORDER[number])
  const questionInOrgan = step - organIdx * 2 + 1

  return (
    <div className="flex flex-col min-h-[70vh]" style={{ fontFamily: 'inherit' }}>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-slate-400">{step + 1} / {QUESTIONS.length}</span>
          <span className="text-xs font-bold" style={{ color: accent }}>{organ.name}({organ.vegetable})</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(200,200,220,0.3)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${accent}, ${accent}99)` }}
          />
        </div>
        {/* Organ step indicators */}
        <div className="flex gap-1 mt-2">
          {ORGAN_ORDER.map((o, i) => (
            <div key={o} className="flex-1 flex gap-0.5">
              {[0, 1].map(j => {
                const qIdx = i * 2 + j
                const done = qIdx < step
                const current = qIdx === step
                return (
                  <div key={j} className="flex-1 h-1 rounded-full transition-all duration-300"
                    style={{
                      background: done
                        ? ORGAN_ACCENT[o]
                        : current
                          ? `${ORGAN_ACCENT[o]}88`
                          : 'rgba(200,200,220,0.4)',
                    }} />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Question card */}
      <div
        className="rounded-3xl p-6 mb-6 flex-1 flex flex-col justify-between"
        style={{ background: bg, border: `1.5px solid ${border}` }}
      >
        <div>
          {/* Organ badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">
              {question.organ === 'heart' ? '🩺'
               : question.organ === 'liver' ? '🌿'
               : question.organ === 'spleen' ? '🎃'
               : question.organ === 'lung' ? '🧅'
               : '🫘'}
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>
                {organ.name} · {organ.element}
              </p>
              <p className="text-[10px] text-slate-400">{questionInOrgan}번째 질문</p>
            </div>
          </div>

          {/* Question text */}
          <h2 className="text-base font-semibold text-slate-800 leading-relaxed mb-2">
            {question.text}
          </h2>
          <p className="text-[10px] text-slate-400">관련 증상: {organ.traits.join(' · ')}</p>
        </div>

        {/* Likert scale */}
        <div className="mt-6">
          <div className="flex justify-between text-[9px] text-slate-400 mb-2 px-1">
            <span>전혀 없어요</span>
            <span>항상 있어요</span>
          </div>
          <div className="flex gap-2">
            {LIKERT.map(({ value, label }) => {
              const isSelected = selected === value || answers[question.id] === value
              const isPending = selected === value
              return (
                <button
                  key={value}
                  onClick={() => handleSelect(value)}
                  className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all duration-200 active:scale-95"
                  style={{
                    background: isSelected ? accent : 'rgba(255,255,255,0.7)',
                    border: `1.5px solid ${isSelected ? accent : 'rgba(200,200,220,0.5)'}`,
                    transform: isPending ? 'scale(1.05)' : 'scale(1)',
                    boxShadow: isSelected ? `0 4px 16px ${accent}44` : 'none',
                  }}
                >
                  <span className="text-sm font-black"
                    style={{ color: isSelected ? 'white' : accent }}>
                    {value}
                  </span>
                  <span className="text-[8px] leading-tight text-center whitespace-pre-line"
                    style={{ color: isSelected ? 'rgba(255,255,255,0.85)' : '#94a3b8' }}>
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Back button */}
      {step > 0 && (
        <button
          onClick={handleBack}
          className="text-xs text-slate-400 font-medium self-start hover:text-slate-600 transition-colors"
        >
          ← 이전 질문
        </button>
      )}
    </div>
  )
}
