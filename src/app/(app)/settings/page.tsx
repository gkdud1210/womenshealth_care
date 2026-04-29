'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { LogOut, Calendar, Shield, ChevronRight, X } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function SettingsPage() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [showConfirm, setShowConfirm] = useState(false)

  function handleLogout() {
    logout()
    router.push('/signup')
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-lg mx-auto">

      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-800">설정</h1>
        <p className="text-sm text-slate-400 mt-1">계정 및 앱 환경설정</p>
      </div>

      {/* 프로필 카드 */}
      <div className="glass-card p-5 mb-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">내 프로필</p>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #fde68a, #d4af37)', boxShadow: '0 4px 12px rgba(212,175,55,0.35)' }}>
            <span className="text-xl font-bold text-amber-800">
              {user?.name?.[0]?.toUpperCase() ?? 'L'}
            </span>
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-base">{user?.name ?? '사용자'}</p>
            {user?.birthdate && (
              <p className="text-sm text-slate-400 mt-0.5">
                {format(new Date(user.birthdate), 'yyyy년 M월 d일생', { locale: ko })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 앱 정보 */}
      <div className="glass-card p-5 mb-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">앱 정보</p>
        <div className="space-y-1">
          {[
            { icon: Shield, label: '개인정보 보호', sub: '모든 데이터는 이 기기에만 저장됩니다' },
            { icon: Calendar, label: '버전', sub: '1.0.0' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3 px-1 py-2.5 rounded-xl">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(244,63,117,0.08)' }}>
                <Icon className="w-4 h-4 text-rose-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 로그아웃 버튼 */}
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all active:scale-95"
        style={{
          background: 'rgba(239,68,68,0.07)',
          border: '1.5px solid rgba(239,68,68,0.18)',
        }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(239,68,68,0.12)' }}>
          <LogOut className="w-4 h-4 text-red-500" />
        </div>
        <span className="text-sm font-semibold text-red-500">로그아웃</span>
        <ChevronRight className="w-4 h-4 text-red-300 ml-auto" />
      </button>

      {/* 로그아웃 확인 다이얼로그 */}
      {showConfirm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
            onClick={() => setShowConfirm(false)} />
          <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-xs rounded-3xl shadow-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(24px)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <LogOut className="w-5 h-5 text-red-500" />
                </div>
                <button onClick={() => setShowConfirm(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                  <X className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>
              <h2 className="font-bold text-slate-800 text-[15px] mb-1">로그아웃 하시겠어요?</h2>
              <p className="text-[13px] text-slate-500 leading-relaxed">
                로그아웃하면 저장된 건강 데이터와 설정이 모두 초기화됩니다.
              </p>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-2xl text-sm text-slate-400 border border-slate-100 hover:border-slate-200 transition-colors">
                취소
              </button>
              <button onClick={handleLogout}
                className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 4px 14px rgba(239,68,68,0.38)' }}>
                로그아웃
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
