'use client'

// 종목·시설 종류처럼 긴 선택지를 [전체 ▾] 버튼 하나로 접어 두고, 누르면 아래로 펼쳐 고르게 해요.
// (루디아피드 위 케어카드 고르기와 같은 방식)

import { useEffect, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATEGORY_GROUPS, CATEGORY_META, type MeetupCategory } from '@/data/meetupData'

export interface PickOption<T extends string> { id: T; label: string; emoji: string; color: string; bg: string }
export interface PickGroup<T extends string> { label?: string; options: PickOption<T>[] }

const DARK = '#1e293b'

export function CollapsiblePicker<T extends string>({
  value, onChange, groups, allLabel = '전체', hint, mine, mineLabel = '추천', storageKey, className,
}: {
  value: T | 'all'
  onChange: (v: T | 'all') => void
  groups: PickGroup<T>[]
  allLabel?: string
  hint?: string
  /** 나에게 맞는 선택지 — 주면 [추천 | 모두] 전환이 생겨요 */
  mine?: T[]
  mineLabel?: string
  /** 추천만 보기 선택을 기기에 기억할 키 */
  storageKey?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [onlyMine, setOnlyMine] = useState(true)
  useEffect(() => {
    if (!storageKey) return
    try { setOnlyMine(localStorage.getItem(storageKey) !== '0') } catch {}
  }, [storageKey])
  function changeOnlyMine(v: boolean) {
    setOnlyMine(v)
    if (storageKey) try { localStorage.setItem(storageKey, v ? '1' : '0') } catch {}
  }

  const all = groups.flatMap(g => g.options)
  const current = value === 'all' ? null : all.find(o => o.id === value) ?? null
  const hasMine = !!mine && mine.length > 0
  const showMine = hasMine && onlyMine
  const mineOptions = showMine
    ? all.filter(o => mine!.includes(o.id) || o.id === value)
    : []

  function pick(v: T | 'all') { onChange(v); setOpen(false) }

  const chip = (o: PickOption<T>) => {
    const on = o.id === value
    return (
      <button key={o.id} onClick={() => pick(o.id)} aria-pressed={on}
        className="h-8 px-3 rounded-full flex items-center gap-1 text-[12.5px] font-semibold border transition-all active:scale-95"
        style={on ? { background: o.bg, borderColor: o.color, color: o.color } : { background: '#fff', borderColor: '#e2e8f0', color: '#475569' }}>
        <span className="text-[13px] leading-none">{o.emoji}</span> {o.label}
        {hasMine && mine!.includes(o.id) && !showMine && <span className="text-[9px]">💜</span>}
      </button>
    )
  }

  return (
    <div className={className}>
      <button onClick={() => setOpen(v => !v)} aria-expanded={open}
        className="h-8 pl-3 pr-2.5 rounded-full flex items-center gap-1 text-[12.5px] font-bold border transition-colors"
        style={current
          ? { background: current.bg, borderColor: current.color, color: current.color }
          : { background: DARK, borderColor: DARK, color: '#fff' }}>
        {current ? <>{current.emoji} {current.label}</> : <>🏠 {allLabel}</>}
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="mt-2 rounded-2xl bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            {hasMine ? (
              <div className="flex rounded-full bg-white border border-slate-200 p-0.5">
                {([[true, `${mineLabel} ${mine!.length}`], [false, '모두 보기']] as const).map(([v, label]) => (
                  <button key={label} onClick={() => changeOnlyMine(v)} aria-pressed={onlyMine === v}
                    className="px-3 py-1 rounded-full text-[11.5px] font-bold transition-colors"
                    style={onlyMine === v ? { background: DARK, color: '#fff' } : { color: '#64748b' }}>
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[11.5px] text-slate-500">{hint ?? '하나를 고르면 그것만 모아 보여줘요'}</p>
            )}
            <button onClick={() => setOpen(false)}
              className="flex items-center gap-0.5 px-2 py-1 rounded-full text-[11.5px] font-bold text-slate-500 hover:bg-slate-200 flex-shrink-0">
              닫기 <X className="w-3 h-3" />
            </button>
          </div>

          <button onClick={() => pick('all')} aria-pressed={value === 'all'}
            className="h-8 px-3 mb-2 rounded-full text-[12.5px] font-bold border transition-colors"
            style={value === 'all' ? { background: DARK, borderColor: DARK, color: '#fff' } : { background: '#fff', borderColor: '#e2e8f0', color: '#475569' }}>
            🏠 {allLabel}
          </button>

          {showMine ? (
            <div className="flex flex-wrap gap-1.5">{mineOptions.map(chip)}</div>
          ) : (
            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto">
              {groups.map((g, i) => (
                <div key={g.label ?? i}>
                  {g.label && <p className="text-[11px] font-semibold text-slate-400 mb-1.5">{g.label}</p>}
                  <div className="flex flex-wrap gap-1.5">{g.options.map(chip)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 운동 종목 선택지 (종목 분류 순서대로) ─────────────────────────────────────


/** 종목 분류를 묶음으로 — only를 주면 그 종목만 남겨요 */
export function sportPickGroups(only?: readonly MeetupCategory[]): PickGroup<MeetupCategory>[] {
  const keep = only ? new Set(only) : null
  return CATEGORY_GROUPS.flatMap(g => g.sections.map(s => ({
    label: s.label ? `${g.emoji} ${g.label} · ${s.label}` : `${g.emoji} ${g.label}`,
    options: s.categories.filter(c => !keep || keep.has(c)).map(c => {
      const m = CATEGORY_META[c]
      return { id: c, label: m.label, emoji: m.emoji, color: m.color, bg: m.bg }
    }),
  }))).filter(g => g.options.length > 0)
}
