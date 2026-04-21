'use client'

import { MessageCircleHeart, Construction } from 'lucide-react'

export default function ConsultantPage() {
  return (
    <div className="min-h-screen p-8 flex flex-col items-center justify-center">
      <div className="glass-card p-12 text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto mb-4">
          <MessageCircleHeart className="w-8 h-8 text-rose-500" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-slate-800 mb-2">AI 여성 건강 상담사</h1>
        <p className="text-slate-400 text-sm">RAG 기반 맞춤형 건강 상담 챗봇 — 곧 출시됩니다</p>
        <div className="flex items-center gap-2 justify-center mt-4 text-xs text-slate-400">
          <Construction className="w-4 h-4" />
          <span>다음 모듈로 구현 예정</span>
        </div>
      </div>
    </div>
  )
}
