'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function RootPage() {
  const router = useRouter()
  const { user, ready, hasSession, isOnboarded, storedUser } = useAuth()

  useEffect(() => {
    if (!ready) return
    if (hasSession && user && isOnboarded) { router.replace('/care'); return }

    if (hasSession && user && !isOnboarded) {
      router.replace('/onboarding')
      return
    }

    // 세션 없음 — 기존 계정 있으면 로그인, 없으면 회원가입
    const existing = storedUser()
    router.replace(existing ? '/login' : '/signup')
  }, [ready, hasSession, user, isOnboarded, router, storedUser])

  // 첫 화면은 항상 루디아피드(/care)로 바로 넘어가요.
  // 넘어가기 전에 다른 화면(예전 음성 대시보드)이 잠깐 보이지 않도록 로딩 표시만 보여줘요.
  return (
    <div className="min-h-[100dvh] flex items-center justify-center"
      style={{ background: 'linear-gradient(145deg, #fdf6f9 0%, #fce9f0 35%, #f8eeff 70%, #fdf0f8 100%)' }}>
      <div className="w-8 h-8 rounded-full border-2 border-rose-300 border-t-rose-500 animate-spin" />
    </div>
  )
}
