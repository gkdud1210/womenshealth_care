'use client'

import { useState } from 'react'
import { X, Trash2, RotateCcw, Check, Clock, CalendarDays } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { ScheduleEvent } from '@/types/health'
import { SCHEDULE_CATEGORY_LABELS, SCHEDULE_CATEGORY_COLORS } from '@/types/health'

interface Props {
  events: ScheduleEvent[]
  transcript: string
  onConfirm: (events: ScheduleEvent[]) => void
  onRetry: () => void
  onClose: () => void
}

const CATEGORIES = Object.keys(SCHEDULE_CATEGORY_LABELS) as ScheduleEvent['category'][]

function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  if (h === 0)  return `오전 12:${String(m).padStart(2,'0')}`
  if (h < 12)   return `오전 ${h}:${String(m).padStart(2,'0')}`
  if (h === 12) return `오후 12:${String(m).padStart(2,'0')}`
  return `오후 ${h - 12}:${String(m).padStart(2,'0')}`
}

function durationHours(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins <= 0) return null
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? (m > 0 ? `${h}시간 ${m}분` : `${h}시간`) : `${m}분`
}

export function VoiceConfirmModal({ events: initial, transcript, onConfirm, onRetry, onClose }: Props) {
  const [items, setItems] = useState<ScheduleEvent[]>(initial)

  function updateItem(id: string, patch: Partial<ScheduleEvent>) {
    setItems(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e))
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(e => e.id !== id))
  }

  function handleSave() {
    if (items.length === 0) { onClose(); return }
    onConfirm(items)
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[3px]" onClick={onClose} />

      <div
        className="fixed inset-x-4 z-50 mx-auto max-w-sm rounded-3xl overflow-hidden shadow-modal"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom) + 1rem)',
          maxHeight: 'calc(100dvh - 5rem)',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(255,255,255,0.98)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(244,63,117,0.12)',
        }}>

        {/* ── Header ── */}
        <div className="flex-none flex items-start justify-between px-5 pt-5 pb-3.5"
          style={{ borderBottom: '1px solid rgba(244,63,117,0.1)' }}>
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #f43f75, #a855f7)' }}>
                <CalendarDays className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-[15px] font-bold text-slate-800">이렇게 정리했어요</p>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
              "{transcript}"
            </p>
          </div>
          <button onClick={onClose}
            className="flex-none w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>

        {/* ── Event cards ── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {items.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-6">
              일정이 모두 삭제됐어요. 다시 말하거나 닫아주세요.
            </p>
          )}

          {items.map(ev => {
            const color    = SCHEDULE_CATEGORY_COLORS[ev.category]
            const duration = durationHours(ev.startTime, ev.endTime)
            let dateLabel  = ''
            try {
              dateLabel = format(new Date(ev.date), 'M월 d일 EEEE', { locale: ko })
            } catch {
              dateLabel = ev.date
            }

            return (
              <div key={ev.id}
                className="rounded-2xl overflow-hidden"
                style={{ border: `1.5px solid ${color}25`, background: `${color}06` }}>

                {/* Card header */}
                <div className="flex items-center justify-between px-3.5 pt-3 pb-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-2 h-2 rounded-full flex-none" style={{ background: color }} />
                    <span className="text-xs font-semibold text-slate-500">{dateLabel}</span>
                  </div>
                  <button onClick={() => removeItem(ev.id)}
                    className="flex-none w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3 h-3 text-slate-300 hover:text-red-400" />
                  </button>
                </div>

                <div className="px-3.5 pb-3.5 space-y-2.5">
                  {/* Title input */}
                  <input
                    value={ev.title}
                    onChange={e => updateItem(ev.id, { title: e.target.value })}
                    className="w-full text-sm font-semibold text-slate-800 bg-transparent outline-none placeholder-slate-300 border-b pb-1 transition-colors focus:border-rose-300"
                    style={{ borderColor: `${color}30` }}
                    placeholder="일정 제목"
                  />

                  {/* Time row */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Clock className="w-3 h-3 flex-none text-slate-400" />
                    <span className="font-medium">{fmtTime(ev.startTime)}</span>
                    <span className="text-slate-300">–</span>
                    <span className="font-medium">{fmtTime(ev.endTime)}</span>
                    {duration && (
                      <span className="ml-1 text-[10px] text-slate-400">· {duration}</span>
                    )}
                  </div>

                  {/* Category pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map(cat => {
                      const c     = SCHEDULE_CATEGORY_COLORS[cat]
                      const isOn  = ev.category === cat
                      return (
                        <button
                          key={cat}
                          onClick={() => updateItem(ev.id, { category: cat })}
                          className="text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all"
                          style={{
                            background: isOn ? c : 'rgba(148,163,184,0.1)',
                            color:      isOn ? '#fff' : '#94a3b8',
                            border:     `1px solid ${isOn ? c : 'transparent'}`,
                          }}>
                          {SCHEDULE_CATEGORY_LABELS[cat]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Footer ── */}
        <div className="flex-none px-4 py-4 flex gap-2.5"
          style={{ borderTop: '1px solid rgba(244,63,117,0.08)' }}>
          <button
            onClick={onRetry}
            className={cn(
              'flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-medium',
              'border border-slate-100 text-slate-400 hover:border-rose-200 hover:text-rose-400 transition-all active:scale-95',
            )}>
            <RotateCcw className="w-3.5 h-3.5" />
            다시 말하기
          </button>
          <button
            onClick={handleSave}
            disabled={items.length === 0}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold text-white',
              'transition-all active:scale-95',
              items.length === 0 && 'opacity-40 cursor-not-allowed',
            )}
            style={{
              background: 'linear-gradient(135deg, #f43f75, #e11d5a)',
              boxShadow: '0 4px 16px rgba(244,63,117,0.35)',
            }}>
            <Check className="w-4 h-4" />
            {items.length}개 일정 저장
          </button>
        </div>
      </div>
    </>
  )
}
