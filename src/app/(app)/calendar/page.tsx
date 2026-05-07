'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import { CalendarHeart, Sparkles, Trash2, ChevronDown, Check, X } from 'lucide-react'
import { HealthCalendar } from '@/components/calendar/HealthCalendar'
import { useAuth } from '@/hooks/useAuth'
import { usePersistedLogs } from '@/hooks/usePersistedLogs'
import { CYCLE_MODES, CYCLE_MODE_MAP } from '@/data/cycleModes'
import type { DailyLogFormData, CycleMode } from '@/types/health'
import { cn } from '@/lib/utils'

const CYCLE_LENGTH  = 28
const PERIOD_LENGTH = 5

export default function CalendarPage() {
  const { user, saveUser } = useAuth()
  const { logs, setLogs, clearLogs } = usePersistedLogs()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [pendingMode, setPendingMode] = useState<CycleMode | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentModeId = (user?.cycleMode ?? 'normal') as CycleMode
  const currentMode = CYCLE_MODE_MAP[currentModeId]

  function dateKey(base: string, offsetDays: number) {
    const d = new Date(base + 'T00:00:00')
    d.setDate(d.getDate() + offsetDays)
    return d.toISOString().split('T')[0]
  }

  const handleLogSave = useCallback((data: DailyLogFormData) => {
    setLogs(prev => {
      const next: Record<string, DailyLogFormData> = { ...prev, [data.date]: data }

      // Auto-fill the following days as period days when marking period start
      if (data.isPeriod) {
        const prevKey = dateKey(data.date, -1)
        const isPeriodStart = !prev[prevKey]?.isPeriod
        if (isPeriodStart) {
          for (let i = 1; i < PERIOD_LENGTH; i++) {
            const k = dateKey(data.date, i)
            if (!next[k]?.isPeriod) {
              next[k] = { ...(next[k] ?? {}), date: k, isPeriod: true } as DailyLogFormData
            }
          }
        }
      }

      return next
    })
  }, [setLogs])

  function selectMode(id: CycleMode) {
    if (id === currentModeId) { setDropdownOpen(false); return }
    setPendingMode(id)
    setDropdownOpen(false)
  }

  function confirmMode() {
    if (!pendingMode) return
    saveUser({ ...user!, cycleMode: pendingMode })
    setPendingMode(null)
  }

  // Close dropdown on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [dropdownOpen])

  return (
    <div className="p-3 sm:p-5 lg:p-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="relative">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #0f0810 0%, #2d1129 55%, #1a0a18 100%)',
              boxShadow: '0 3px 14px rgba(244,63,117,0.28)',
            }}>
            <CalendarHeart className="w-4.5 h-4.5 text-rose-300" />
          </div>
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #d4af37, #b8962e)' }}>
            <Sparkles className="w-2 h-2 text-white" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl sm:text-2xl font-semibold text-slate-800 leading-tight">건강 캘린더</h1>
          <p className="text-xs text-slate-400">날짜를 탭해서 바로 기록하세요</p>
        </div>

        {/* Mode selector */}
        <div className="relative flex-none" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
            style={{
              background: currentMode.bg,
              border: `1.5px solid ${currentMode.border}`,
              boxShadow: `0 2px 10px ${currentMode.glow}`,
            }}
          >
            <span
              className="w-3.5 h-3.5 rounded-full flex-shrink-0"
              style={{ background: currentMode.gradient }}
            />
            <span className="text-slate-700">{currentMode.label}</span>
            <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform duration-200', dropdownOpen && 'rotate-180')} />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-56 rounded-2xl shadow-xl overflow-hidden z-30"
              style={{
                background: 'rgba(255,255,255,0.97)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(244,63,117,0.12)',
                boxShadow: '0 8px 32px rgba(244,63,117,0.12)',
              }}
            >
              {CYCLE_MODES.map(({ id, label, desc, icon: Icon, gradient, glow, bg, border }) => {
                const active = id === currentModeId
                return (
                  <button
                    key={id}
                    onClick={() => selectMode(id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-rose-50/60"
                    style={active ? { background: bg } : {}}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: gradient, boxShadow: `0 2px 8px ${glow}` }}>
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800">{label}</p>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">{desc}</p>
                    </div>
                    {active && (
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: gradient }}>
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Calendar ── */}
      <HealthCalendar
        logs={logs}
        cycleLength={CYCLE_LENGTH}
        periodLength={PERIOD_LENGTH}
        onLogSave={handleLogSave}
        userName={user?.name ?? '님'}
        cycleMode={user?.cycleMode}
      />

      {/* ── Mode change confirm dialog ── */}
      {pendingMode && (() => {
        const m = CYCLE_MODE_MAP[pendingMode]
        return (
          <>
            <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px]"
              onClick={() => setPendingMode(null)} />
            <div className="fixed z-[60] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-xs rounded-3xl shadow-2xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(24px)', border: '1px solid rgba(168,85,247,0.15)' }}>
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: m.gradient, boxShadow: `0 4px 14px ${m.glow}` }}>
                    <m.icon className="w-5 h-5 text-white" />
                  </div>
                  <button onClick={() => setPendingMode(null)}
                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                    <X className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
                <h2 className="font-bold text-slate-800 text-[15px] mb-1">
                  {m.label}으로 변경할까요?
                </h2>
                <p className="text-[13px] text-slate-500 leading-relaxed">{m.desc}</p>
              </div>
              <div className="px-5 pb-5 flex gap-2">
                <button onClick={() => setPendingMode(null)}
                  className="flex-1 py-2.5 rounded-2xl text-sm text-slate-400 border border-slate-100 hover:border-slate-200 transition-colors">
                  아니요
                </button>
                <button onClick={confirmMode}
                  className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-95"
                  style={{ background: m.gradient, boxShadow: `0 4px 14px ${m.glow}` }}>
                  네, 변경할게요
                </button>
              </div>
            </div>
          </>
        )
      })()}

      {/* ── Dev-only: clear logs ── */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => { if (confirm('모든 로그를 초기화할까요?')) clearLogs() }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 border border-slate-200 hover:border-rose-300 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            로그 초기화 (dev)
          </button>
        </div>
      )}
    </div>
  )
}
