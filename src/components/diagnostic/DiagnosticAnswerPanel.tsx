'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ClipboardList, RotateCcw, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ALL_QUESTIONS } from '@/data/onboardingQuestions'
import type { OnboardingAnswers } from '@/lib/onboarding-profile'

interface Props {
  answers: OnboardingAnswers
  onChange: (id: string, value: string | string[] | number) => void
  onReset: () => void
}

function groupByCategory() {
  const groups = new Map<string, typeof ALL_QUESTIONS>()
  for (const q of ALL_QUESTIONS) {
    const list = groups.get(q.category) ?? []
    list.push(q)
    groups.set(q.category, list)
  }
  return Array.from(groups.entries())
}

const GROUPS = groupByCategory()

export function DiagnosticAnswerPanel({ answers, onChange, onReset }: Props) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set([GROUPS[0]?.[0] ?? '']))

  function toggleGroup(cat: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  const answeredCount = ALL_QUESTIONS.filter(q => answers[q.id] !== undefined).length

  return (
    <div className="glass-card overflow-hidden">
      <button onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between p-4 sm:p-5 transition-colors hover:bg-rose-50/20 text-left">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #f43f75, #a855f7)', boxShadow: '0 2px 12px rgba(244,63,117,0.3)' }}>
            <ClipboardList className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-700">문진 답변 직접 입력</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                style={{ background: 'rgba(244,63,117,0.1)', border: '1px solid rgba(244,63,117,0.25)', color: '#e11d5a' }}>
                {answeredCount}/{ALL_QUESTIONS.length}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">기기 진단 없이도 답변만으로 유형 · 소견이 즉시 바뀌어요</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-rose-100/60 px-4 sm:px-5 pb-5">
          <div className="flex items-start gap-2.5 mt-4 mb-4 p-3 rounded-xl"
            style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}>
            <Info className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              답변을 선택하면 아래 종합 리포트와 탈모 원인 유형이 실시간으로 업데이트돼요.
            </p>
          </div>

          <div className="space-y-2.5">
            {GROUPS.map(([category, questions]) => {
              const isExp = expanded.has(category)
              return (
                <div key={category} className="rounded-2xl overflow-hidden"
                  style={{ background: 'rgba(248,244,246,0.65)', border: '1px solid rgba(244,63,117,0.08)' }}>
                  <button onClick={() => toggleGroup(category)}
                    className="w-full flex items-center justify-between p-3.5 transition-colors hover:bg-rose-50/30 text-left">
                    <p className="text-xs font-semibold text-slate-700">
                      {questions[0].emoji} {category}
                      <span className="text-[10px] text-slate-400 font-normal ml-1.5">({questions.length}문항)</span>
                    </p>
                    {isExp ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                  </button>

                  {isExp && (
                    <div className="px-3.5 pb-3.5 space-y-4 border-t border-rose-100/40 pt-3">
                      {questions.map(q => (
                        <div key={q.id}>
                          <p className="text-xs font-medium text-slate-600 mb-2 leading-relaxed">{q.text}</p>

                          {q.type === 'radio' && (
                            <div className="flex flex-wrap gap-1.5">
                              {q.options!.map(opt => {
                                const on = answers[q.id] === opt
                                return (
                                  <button key={opt} type="button" onClick={() => onChange(q.id, opt)}
                                    className="text-[11px] font-medium px-3 py-1.5 rounded-full transition-all"
                                    style={{
                                      background: on ? 'rgba(244,63,117,0.12)' : 'rgba(100,116,139,0.07)',
                                      color: on ? '#e11d5a' : '#64748b',
                                      border: `1px solid ${on ? 'rgba(244,63,117,0.3)' : 'transparent'}`,
                                    }}>
                                    {opt}
                                  </button>
                                )
                              })}
                            </div>
                          )}

                          {q.type === 'multiselect' && (
                            <div className="flex flex-wrap gap-1.5">
                              {q.options!.map(opt => {
                                const current = (answers[q.id] as string[] | undefined) ?? []
                                const on = current.includes(opt)
                                return (
                                  <button key={opt} type="button"
                                    onClick={() => onChange(q.id, on ? current.filter(o => o !== opt) : [...current, opt])}
                                    className="text-[11px] font-medium px-3 py-1.5 rounded-full transition-all"
                                    style={{
                                      background: on ? 'rgba(244,63,117,0.12)' : 'rgba(100,116,139,0.07)',
                                      color: on ? '#e11d5a' : '#64748b',
                                      border: `1px solid ${on ? 'rgba(244,63,117,0.3)' : 'transparent'}`,
                                    }}>
                                    {opt}
                                  </button>
                                )
                              })}
                            </div>
                          )}

                          {q.type === 'slider' && (
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] text-slate-400">{q.min}~{q.max}</span>
                                <span className="text-sm font-bold font-display text-rose-500">
                                  {(answers[q.id] as number | undefined) ?? q.min}
                                </span>
                              </div>
                              <input
                                type="range"
                                min={q.min} max={q.max} step={1}
                                value={(answers[q.id] as number | undefined) ?? q.min}
                                onChange={e => onChange(q.id, parseInt(e.target.value, 10))}
                                className="w-full"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex justify-end mt-3">
            <button onClick={onReset}
              className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-500',
                'hover:text-rose-500 hover:bg-rose-50 transition-all duration-200')}>
              <RotateCcw className="w-3 h-3" />
              답변 초기화
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
