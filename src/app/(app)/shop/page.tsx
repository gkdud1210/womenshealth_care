'use client'

import { ShoppingBag, Construction } from 'lucide-react'

export default function ShopPage() {
  return (
    <div className="min-h-screen p-8 flex flex-col items-center justify-center">
      <div className="glass-card p-12 text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-slate-800 mb-2">맞춤 케어샵</h1>
        <p className="text-slate-400 text-sm">진단 결과 기반 개인화 제품 추천 — 곧 출시됩니다</p>
        <div className="flex items-center gap-2 justify-center mt-4 text-xs text-slate-400">
          <Construction className="w-4 h-4" />
          <span>다음 모듈로 구현 예정</span>
        </div>
      </div>
    </div>
  )
}
