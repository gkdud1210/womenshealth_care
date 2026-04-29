'use client'

import { useState, useEffect } from 'react'

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
