'use client'

// 진단 화면 맨 위에 살짝 보이는 내 프로필 — 누르면 /profile(전체 프로필)로 이동

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useFeed } from '@/components/feed/LudiaFeed'
import { useDiagnosticHistory } from '@/lib/diagnosticHistory'
import { analyzePsyche } from '@/lib/iris-psyche'
import { buildWeek, loadWeekly } from '@/lib/weekly-record'
import { myAuthorIds } from '@/components/profile/WeeklyAutoSaver'

export function ProfilePeek() {
  const { user } = useAuth()
  const feed = useFeed()
  const { sessions } = useDiagnosticHistory()
  const [weekly, setWeekly] = useState({ saved: 0, minutes: 0 })

  useEffect(() => {
    try {
      const ids = Array.from(new Set([...myAuthorIds(), feed.myId ?? ''].filter(Boolean)))
      setWeekly({ saved: loadWeekly().length, minutes: buildWeek(new Date(), { myAuthorIds: ids }).workout.minutes })
    } catch {}
  }, [feed.myId])

  const latest = sessions.find(s => !s.demo) ?? sessions[0]
  const type = useMemo(() => (latest ? analyzePsyche(latest.data).type : null), [latest])
  const posts = feed.posts.filter(p => p.authorId === feed.myId || p.authorId === user?.userId).length
  const name = user?.nickname || user?.name || feed.authorName || '나'

  return (
    <Link href="/profile" aria-label="내 프로필 열기"
      className="glass-card flex items-center gap-3 px-3.5 py-3 mb-3 active:scale-[0.98] transition-transform hover-lift">
      <span className="w-11 h-11 rounded-full flex items-center justify-center text-[22px] flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#fce7f3,#ede9fe)', boxShadow: '0 0 0 2px #fff, 0 0 0 4px rgba(244,63,117,0.25)' }}>
        {feed.authorEmoji}
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="text-[15px] font-black text-slate-900 truncate">{name}</span>
          {type && (
            <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 truncate flex-shrink min-w-0">
              {type.emoji} {type.name}
            </span>
          )}
        </span>
        <span className="block text-[11px] text-slate-400 mt-0.5 truncate">
          내 글 {posts} · 주간 기록 {weekly.saved} · 이번 주 운동 {weekly.minutes}분
        </span>
      </span>
      <span className="flex items-center text-[11px] font-bold text-rose-500 flex-shrink-0">
        내 프로필 <ChevronRight className="w-4 h-4" />
      </span>
    </Link>
  )
}
