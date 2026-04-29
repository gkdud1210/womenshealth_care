'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { LudiaLogo } from '@/components/LudiaLogo'

export default function SignupPage() {
  const router = useRouter()
  const { saveUser, startSession, isOnboarded, storedUser, ready } = useAuth()
  const [name, setName]           = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [error, setError]         = useState('')

  // 이전 세션 프로필이 있으면 폼에 미리 채우기
  useEffect(() => {
    if (!ready) return
    const prev = storedUser()
    if (prev) {
      setName(prev.name)
      setBirthdate(prev.birthdate)
    }
  }, [ready, storedUser])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('이름을 입력해주세요.'); return }
    if (!birthdate)   { setError('생년월일을 입력해주세요.'); return }

    const prev = storedUser()
    if (prev && prev.name === name.trim() && prev.birthdate === birthdate) {
      // 기존 사용자 — 프로필 유지, 세션 시작 후 카드 선택 화면으로
      startSession()
    } else {
      // 신규 또는 정보 변경
      saveUser({ name: name.trim(), birthdate, careTypes: [] })
      startSession()
    }
    router.push('/onboarding')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12">

      {/* LUDIA Brand */}
      <div className="flex flex-col items-center mb-8">
        <div style={{
          borderRadius: '28px',
          overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(137,15,93,0.38), 0 4px 16px rgba(137,15,93,0.22)',
        }}>
          <LudiaLogo size={180} />
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        <div className="rounded-3xl p-7 sm:p-8"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.95)',
            boxShadow: '0 8px 40px rgba(158,18,57,0.1), 0 2px 8px rgba(158,18,57,0.06)',
          }}>
          <h1 className="font-display text-xl font-semibold text-slate-800 mb-1.5 text-center">시작하기</h1>
          <p className="text-xs text-slate-400 text-center mb-7">나만의 건강 여정을 시작해요</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 tracking-wide uppercase">이름</label>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setError('') }}
                placeholder="이름을 입력하세요"
                className="w-full px-4 py-3 rounded-2xl text-sm text-slate-700 placeholder-slate-300 outline-none transition-all"
                style={{
                  background: 'rgba(253,248,246,0.9)',
                  border: '1.5px solid rgba(244,63,117,0.15)',
                  boxShadow: 'inset 0 1px 4px rgba(244,63,117,0.04)',
                }}
                onFocus={e => e.currentTarget.style.border = '1.5px solid rgba(244,63,117,0.45)'}
                onBlur={e  => e.currentTarget.style.border = '1.5px solid rgba(244,63,117,0.15)'}
              />
            </div>

            {/* Birthdate */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 tracking-wide uppercase">생년월일</label>
              <input
                type="date"
                value={birthdate}
                onChange={e => { setBirthdate(e.target.value); setError('') }}
                className="w-full px-4 py-3 rounded-2xl text-sm text-slate-700 outline-none transition-all"
                style={{
                  background: 'rgba(253,248,246,0.9)',
                  border: '1.5px solid rgba(244,63,117,0.15)',
                  boxShadow: 'inset 0 1px 4px rgba(244,63,117,0.04)',
                }}
                onFocus={e => e.currentTarget.style.border = '1.5px solid rgba(244,63,117,0.45)'}
                onBlur={e  => e.currentTarget.style.border = '1.5px solid rgba(244,63,117,0.15)'}
              />
            </div>

            {error && <p className="text-xs text-rose-500 text-center">{error}</p>}

            <button type="submit"
              className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white mt-2 transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #f43f75, #e11d5a)',
                boxShadow: '0 4px 20px rgba(244,63,117,0.4)',
              }}>
              다음 →
            </button>
          </form>
        </div>

        <p className="text-[11px] text-slate-300 text-center mt-5">
          입력하신 정보는 이 기기에만 저장되며 외부로 전송되지 않습니다
        </p>
      </div>
    </div>
  )
}
