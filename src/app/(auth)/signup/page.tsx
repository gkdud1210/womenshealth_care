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
const inputFocusStyle = '1.5px solid rgba(244,63,117,0.45)'
const inputBlurStyle  = '1.5px solid rgba(244,63,117,0.15)'

function Field({
  label, type = 'text', value, onChange, placeholder,
}: {
  label: string; type?: string; value: string
  onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1.5 tracking-wide uppercase">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-2xl text-sm text-slate-700 placeholder-slate-300 outline-none transition-all"
        style={inputStyle}
        onFocus={e => (e.currentTarget.style.border = inputFocusStyle)}
        onBlur={e  => (e.currentTarget.style.border = inputBlurStyle)}
      />
    </div>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const { register, startSession, storedUser } = useAuth()

  const [userId,    setUserId]    = useState('')
  const [nickname,  setNickname]  = useState('')
  const [name,      setName]      = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [password,  setPassword]  = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [error,     setError]     = useState('')

  function validate(): string {
    if (!userId.trim())          return '아이디를 입력해주세요.'
    if (userId.trim().length < 4) return '아이디는 4자 이상이어야 해요.'
    if (!nickname.trim())        return '닉네임을 입력해주세요.'
    if (!name.trim())            return '이름을 입력해주세요.'
    if (!birthdate)              return '생년월일을 입력해주세요.'
    if (!password)               return '비밀번호를 입력해주세요.'
    if (password.length < 6)     return '비밀번호는 6자 이상이어야 해요.'
    if (password !== pwConfirm)  return '비밀번호가 일치하지 않아요.'
    return ''
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const msg = validate()
    if (msg) { setError(msg); return }

    const existing = storedUser()
    if (existing && existing.userId === userId.trim()) {
      setError('이미 사용 중인 아이디예요.')
      return
    }

    register({
      userId:    userId.trim(),
      nickname:  nickname.trim(),
      name:      name.trim(),
      birthdate,
      password,
      careTypes: [],
    })
    startSession()
    router.push('/onboarding')
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
            회원가입
          </h1>
          <p className="text-xs text-slate-400 text-center mb-7">나만의 건강 여정을 시작해요</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="아이디" value={userId} onChange={v => { setUserId(v); setError('') }} placeholder="영문/숫자 4자 이상" />
            <Field label="닉네임" value={nickname} onChange={v => { setNickname(v); setError('') }} placeholder="앱에서 표시될 이름" />
            <Field label="이름" value={name} onChange={v => { setName(v); setError('') }} placeholder="실명을 입력하세요" />

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 tracking-wide uppercase">
                생년월일
              </label>
              <input
                type="date"
                value={birthdate}
                onChange={e => { setBirthdate(e.target.value); setError('') }}
                className="w-full px-4 py-3 rounded-2xl text-sm text-slate-700 outline-none transition-all"
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.border = inputFocusStyle)}
                onBlur={e  => (e.currentTarget.style.border = inputBlurStyle)}
              />
            </div>

            <Field label="비밀번호" type="password" value={password} onChange={v => { setPassword(v); setError('') }} placeholder="6자 이상" />
            <Field label="비밀번호 확인" type="password" value={pwConfirm} onChange={v => { setPwConfirm(v); setError('') }} placeholder="비밀번호를 다시 입력하세요" />

            {error && <p className="text-xs text-rose-500 text-center">{error}</p>}

            <button type="submit"
              className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white mt-2 transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #f43f75, #e11d5a)',
                boxShadow: '0 4px 20px rgba(244,63,117,0.4)',
              }}>
              가입하기 →
            </button>
          </form>
        </div>

        <p className="text-[11px] text-slate-300 text-center mt-4">
          이미 계정이 있으신가요?{' '}
          <button
            onClick={() => router.push('/login')}
            className="text-rose-400 underline underline-offset-2">
            로그인
          </button>
        </p>

        <p className="text-[11px] text-slate-300 text-center mt-3">
          입력하신 정보는 이 기기에만 저장되며 외부로 전송되지 않습니다
        </p>
      </div>
    </div>
  )
}
