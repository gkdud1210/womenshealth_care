'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { LudiaLogo } from '@/components/LudiaLogo'

const inputStyle = {
  background: 'rgba(253,248,246,0.9)',
  border: '1.5px solid rgba(244,63,117,0.15)',
  boxShadow: 'inset 0 1px 4px rgba(244,63,117,0.04)',
}

export default function LoginPage() {
  const router = useRouter()
  const { storedUser, verifyPassword, startSession } = useAuth()

  const [userId,   setUserId]   = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId.trim()) { setError('아이디를 입력해주세요.'); return }
    if (!password)      { setError('비밀번호를 입력해주세요.'); return }

    const profile = storedUser()
    if (!profile) {
      setError('등록된 계정이 없어요. 회원가입을 먼저 해주세요.')
      return
    }
    if (profile.userId !== userId.trim()) {
      setError('아이디 또는 비밀번호가 올바르지 않아요.')
      return
    }
    if (!verifyPassword(password)) {
      setError('아이디 또는 비밀번호가 올바르지 않아요.')
      return
    }

    startSession()
    router.push('/')
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5 py-12">

      <div className="flex flex-col items-center mb-8">
        <div style={{
          borderRadius: '28px',
          overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(137,15,93,0.38), 0 4px 16px rgba(137,15,93,0.22)',
        }}>
          <LudiaLogo size={180} />
        </div>
      </div>

      <div className="w-full max-w-sm">
        <div className="rounded-3xl p-7 sm:p-8"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.95)',
            boxShadow: '0 8px 40px rgba(158,18,57,0.1), 0 2px 8px rgba(158,18,57,0.06)',
          }}>

          <h1 className="font-display text-xl font-semibold text-slate-800 mb-1.5 text-center">
            로그인
          </h1>
          <p className="text-xs text-slate-400 text-center mb-7">다시 만나서 반가워요</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 tracking-wide uppercase">
                아이디
              </label>
              <input
                type="text"
                value={userId}
                onChange={e => { setUserId(e.target.value); setError('') }}
                placeholder="아이디를 입력하세요"
                className="w-full px-4 py-3 rounded-2xl text-sm text-slate-700 placeholder-slate-300 outline-none transition-all"
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.border = '1.5px solid rgba(244,63,117,0.45)')}
                onBlur={e  => (e.currentTarget.style.border = '1.5px solid rgba(244,63,117,0.15)')}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 tracking-wide uppercase">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="비밀번호를 입력하세요"
                className="w-full px-4 py-3 rounded-2xl text-sm text-slate-700 placeholder-slate-300 outline-none transition-all"
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.border = '1.5px solid rgba(244,63,117,0.45)')}
                onBlur={e  => (e.currentTarget.style.border = '1.5px solid rgba(244,63,117,0.15)')}
              />
            </div>

            {error && <p className="text-xs text-rose-500 text-center">{error}</p>}

            <button type="submit"
              className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white mt-2 transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #f43f75, #e11d5a)',
                boxShadow: '0 4px 20px rgba(244,63,117,0.4)',
              }}>
              로그인
            </button>
          </form>
        </div>

        <p className="text-[11px] text-slate-300 text-center mt-4">
          계정이 없으신가요?{' '}
          <button
            onClick={() => router.push('/signup')}
            className="text-rose-400 underline underline-offset-2">
            회원가입
          </button>
        </p>
      </div>
    </div>
  )
}
