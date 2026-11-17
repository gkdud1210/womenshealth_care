'use client'

// 앱을 열 때 한 번 — 지난주까지 아직 저장 안 된 주간 기록을 자동으로 만들어 프로필에 남겨요.

import { useEffect } from 'react'
import { ensureWeeklySnapshots } from '@/lib/weekly-record'

function myAuthorIds(): string[] {
  const ids: string[] = []
  try { const v = JSON.parse(localStorage.getItem('ludia_feed_identity_v1') || 'null'); if (v?.id) ids.push(v.id) } catch {}
  try { const u = JSON.parse(localStorage.getItem('ludia_user_v1') || 'null'); if (u?.userId) ids.push(u.userId) } catch {}
  return ids
}

export function WeeklyAutoSaver() {
  useEffect(() => {
    // 화면이 먼저 뜨도록 조금 늦게
    const t = setTimeout(() => { try { ensureWeeklySnapshots(myAuthorIds()) } catch {} }, 1500)
    return () => clearTimeout(t)
  }, [])
  return null
}

export { myAuthorIds }
