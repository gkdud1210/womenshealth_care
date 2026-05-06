'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import { CalendarHeart, Sparkles, Trash2, ChevronDown, Check } from 'lucide-react'
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
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentModeId = (user?.cycleMode ?? 'normal') as CycleMode
  const currentMode = CYCLE_MODE_MAP[currentModeId]

  const handleLogSave = useCallback((data: DailyLogFormData) => {
    setLogs(prev => ({ ...prev, [data.date]: data }))
  }, [setLogs])

  function selectMode(id: CycleMode) {
    saveUser({ ...user!, cycleMode: id })
    setDropdownOpen(false)
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
      />

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
