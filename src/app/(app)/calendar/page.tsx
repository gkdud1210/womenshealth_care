'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 캘린더는 "루디아 호출" 안으로 옮겨졌어요(/ludia-call/calendar).
// 기존 북마크·링크를 위해 이 경로는 새 위치로 넘겨줘요 (정적 배포라 서버 redirect 대신 클라이언트 이동).
export default function CalendarRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/ludia-call/calendar') }, [router])
  return null
}
