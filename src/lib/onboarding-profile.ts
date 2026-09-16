'use client'

import { useState, useEffect, useCallback } from 'react'

export type OnboardingAnswers = Record<string, string | string[] | number>

export interface OnboardingProfile {
  careTypes: string[]
  answers: OnboardingAnswers
}

const ANSWERS_KEY = 'ludia_answers_v1'
const PROFILE_KEY = 'ludia_user_v1'

export function useOnboardingProfile(): OnboardingProfile {
  const [profile, setProfile] = useState<OnboardingProfile>({ careTypes: [], answers: {} })

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}')
      const answers = JSON.parse(localStorage.getItem(ANSWERS_KEY) || '{}')
      setProfile({ careTypes: user.careTypes ?? [], answers })
    } catch {}
  }, [])

  return profile
}

// 기기 진단이 불가능할 때 사용자가 직접 문진 답변 · 관심 카드를 입력/수정할 수 있는 read-write 버전.
// 같은 localStorage 키를 사용해 온보딩 흐름과 데이터를 공유한다.
export function useEditableOnboardingProfile() {
  const [profile, setProfileState] = useState<OnboardingProfile>({ careTypes: [], answers: {} })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}')
      const answers = JSON.parse(localStorage.getItem(ANSWERS_KEY) || '{}')
      setProfileState({ careTypes: user.careTypes ?? [], answers })
    } catch {}
    setReady(true)
  }, [])

  const setAnswer = useCallback((id: string, value: string | string[] | number) => {
    setProfileState(prev => {
      const answers = { ...prev.answers, [id]: value }
      try { localStorage.setItem(ANSWERS_KEY, JSON.stringify(answers)) } catch {}
      return { ...prev, answers }
    })
  }, [])

  const setCareTypes = useCallback((careTypes: string[]) => {
    setProfileState(prev => {
      try {
        const user = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}')
        localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...user, careTypes }))
      } catch {}
      return { ...prev, careTypes }
    })
  }, [])

  const resetAnswers = useCallback(() => {
    try { localStorage.removeItem(ANSWERS_KEY) } catch {}
    setProfileState(prev => ({ ...prev, answers: {} }))
  }, [])

  return { profile, ready, setAnswer, setCareTypes, resetAnswers }
}

// 답변이 '심각한 관심사' 수준인지 확인
export function isHighConcern(val: string | string[] | number | undefined): boolean {
  if (val === undefined) return false
  if (typeof val === 'number') return val >= 7
  if (Array.isArray(val)) return val.length > 0
  return val === '자주 그래요' || val === '네, 있어요' || val === '네, 느껴요' || val === '네, 있어요'
}

// 답변이 '중간 관심사' 수준인지 확인
export function isModerateConcern(val: string | string[] | number | undefined): boolean {
  if (val === undefined) return false
  if (typeof val === 'number') return val >= 4 && val < 7
  return val === '가끔 그래요' || val === '한 번 있었어요' || val === '조금 그런 것 같아요' || val === '가끔 그런 것 같아요'
}

export function hasCare(profile: OnboardingProfile, care: string): boolean {
  return profile.careTypes.includes(care)
}
