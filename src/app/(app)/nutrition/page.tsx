'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 헬스피드는 케어 메뉴 안으로 옮겨졌어요 — 예전 링크(/nutrition?care=…)는 케어 화면으로 보내요.
export default function NutritionRedirect() {
  const router = useRouter()
  useEffect(() => {
    const care = new URLSearchParams(window.location.search).get('care')
    router.replace(care ? `/care?id=${care}` : '/care')
  }, [router])
  return null
}
