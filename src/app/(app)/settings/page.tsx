'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { CARE_CASES } from '@/data/careCases'
import { LogOut, Calendar, Shield, ChevronRight, X, Check, LayoutGrid } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const router = useRouter()
  const { user, saveUser, logout } = useAuth()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showCareSheet, setShowCareSheet] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set(user?.careTypes ?? []))

  function handleLogout() {
    logout()
    router.push('/signup')
  }

  function toggleCare(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function saveCare() {
    if (selected.size === 0) return
    saveUser({ ...user!, careTypes: Array.from(selected) })
    setShowCareSheet(false)
  }

  function openCareSheet() {
    setSelected(new Set(user?.careTypes ?? []))
    setShowCareSheet(true)
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

      {/* 케어 카드 재선택 */}
      <button
        onClick={openCareSheet}
        className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl mb-4 transition-all active:scale-95"
        style={{
          background: 'rgba(244,63,117,0.06)',
          border: '1.5px solid rgba(244,63,117,0.18)',
        }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(244,63,117,0.12)' }}>
          <LayoutGrid className="w-4 h-4 text-rose-500" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-slate-700">케어 카드 재선택</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {user?.careTypes?.length ? `${user.careTypes.length}개 선택됨` : '아직 선택하지 않았어요'}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300" />
      </button>

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
        onClick={() => setShowLogoutConfirm(true)}
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
      {showLogoutConfirm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
            onClick={() => setShowLogoutConfirm(false)} />
          <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-xs rounded-3xl shadow-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(24px)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <LogOut className="w-5 h-5 text-red-500" />
                </div>
                <button onClick={() => setShowLogoutConfirm(false)}
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
              <button onClick={() => setShowLogoutConfirm(false)}
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

      {/* 케어 카드 재선택 바텀 시트 */}
      {showCareSheet && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setShowCareSheet(false)} />
          <div className="fixed z-50 bottom-0 left-0 right-0 rounded-t-3xl shadow-2xl overflow-hidden"
            style={{ background: 'rgba(255,248,250,0.98)', backdropFilter: 'blur(24px)', border: '1px solid rgba(244,63,117,0.12)', maxHeight: '85dvh' }}>
            <div className="flex flex-col" style={{ maxHeight: '85dvh' }}>
              {/* 헤더 */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-none">
                <div>
                  <h2 className="font-bold text-slate-800 text-base">케어 카드 재선택</h2>
                  <p className="text-xs text-slate-400 mt-0.5">집중하고 싶은 건강 항목을 선택하세요</p>
                </div>
                <button onClick={() => setShowCareSheet(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              {/* 케어 카드 그리드 */}
              <div className="flex-1 overflow-y-auto px-4 pb-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {CARE_CASES.map(({ id, label, desc, icon: Icon, gradient, glow, border, bg }) => {
                    const active = selected.has(id)
                    return (
                      <button key={id} onClick={() => toggleCare(id)}
                        className={cn(
                          'relative text-left p-3.5 rounded-2xl transition-all duration-200 active:scale-95',
                          active ? 'shadow-lg' : 'hover:scale-[1.02]'
                        )}
                        style={{
                          background: active ? bg : 'rgba(255,255,255,0.82)',
                          border: `1.5px solid ${active ? border : 'rgba(255,255,255,0.95)'}`,
                          boxShadow: active
                            ? `0 6px 24px ${glow}, inset 0 1px 0 rgba(255,255,255,0.9)`
                            : '0 2px 12px rgba(158,18,57,0.07)',
                          backdropFilter: 'blur(12px)',
                        }}>
                        {active && (
                          <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full flex items-center justify-center"
                            style={{ background: gradient, boxShadow: `0 2px 8px ${glow}` }}>
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2 flex-shrink-0"
                          style={{ background: gradient, boxShadow: `0 4px 14px ${glow}` }}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <p className="font-semibold text-slate-800 text-xs leading-tight mb-0.5">{label}</p>
                        <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">{desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 저장 버튼 */}
              <div className="px-4 pt-2 pb-6 flex-none"
                style={{ background: 'linear-gradient(to top, rgba(255,248,250,1) 80%, transparent)' }}>
                <button
                  onClick={saveCare}
                  disabled={selected.size === 0}
                  className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(135deg, #f43f75, #e11d5a)',
                    boxShadow: selected.size > 0 ? '0 6px 28px rgba(244,63,117,0.45)' : 'none',
                  }}>
                  {selected.size > 0 ? `${selected.size}개 선택 완료 · 저장하기` : '하나 이상 선택해주세요'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
