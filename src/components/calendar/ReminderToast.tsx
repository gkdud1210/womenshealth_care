'use client'

import { Bell, X } from 'lucide-react'
import type { FiredReminder } from '@/hooks/useEventReminders'

export function ReminderToast({ reminder, onDismiss }: { reminder: FiredReminder; onDismiss: () => void }) {
  return (
    <div
      className="fixed inset-x-4 mx-auto max-w-sm z-[100] px-4 py-3 rounded-2xl shadow-modal flex items-start gap-3"
      style={{
        top:            'calc(1rem + env(safe-area-inset-top))',
        background:     'rgba(255,255,255,0.97)',
        border:         '1px solid rgba(244,63,117,0.2)',
        backdropFilter: 'blur(16px)',
        animation:      'ludia-msg 0.25s ease-out both',
      }}
    >
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-none"
        style={{ background: 'rgba(244,63,117,0.12)' }}>
        <Bell className="w-4 h-4 text-rose-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">{reminder.title}</p>
        <p className="text-xs text-slate-400 truncate">{reminder.message}</p>
      </div>
      <button onClick={onDismiss}
        className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors flex-none">
        <X className="w-3.5 h-3.5 text-slate-400" />
      </button>
    </div>
  )
}
