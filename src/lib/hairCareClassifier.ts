import type { MultimodalData } from '@/components/calendar/LudiaInsightCard'
import type { OnboardingProfile } from '@/lib/onboarding-profile'
import type { HairCareTypeId } from '@/data/hairCareTypes'

// 현재 앱이 수집하는 홍채/EDA/바이오 신호에는 "자율신경링"·"장관 zone" 같은
// 세부 필드가 없어, BMI · HRV · 스트레스 지수 · 부교감 균형 · 수면 시간을
// 근거로 4가지 탈모 원인 유형을 분류한다. 임계값은 DiagnosticReport에서 쓰는
// 기존 기준(BMI 18.5/25, HRV 38)과 통일해 리포트 전체의 판정 기준을 일관되게 유지.
export function classifyHairCareType(d: MultimodalData, p: OnboardingProfile): HairCareTypeId {
  const bmi = d.biosignal.bmi

  if (bmi < 18.5) return 'deficiency'
  if (bmi >= 25) return 'metabolic_damp_heat'

  const highStress = d.eda.stressIndex >= 65 || d.biosignal.hrv < 38 || d.eda.ansBalance < 35
  const poorSleep  = d.biosignal.sleepHours < 6.5 || p.answers.common_sleep === '자주 그래요'

  if (highStress || poorSleep) return 'stress_heat'
  return 'hormonal_genetic'
}
