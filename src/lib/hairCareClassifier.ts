import type { MultimodalData } from '@/components/calendar/LudiaInsightCard'
import type { OnboardingProfile } from '@/lib/onboarding-profile'
import { isHighConcern } from '@/lib/onboarding-profile'
import type { HairCareTypeId } from '@/data/hairCareTypes'

export interface HairCareMatch {
  id: HairCareTypeId
  score: number
  percent: number
}

export interface HairCareClassification {
  primary: HairCareMatch
  // 2순위 원인이 전체의 20% 이상을 차지할 때만 "복합 유형"으로 함께 표시
  secondary: HairCareMatch | null
  matches: HairCareMatch[]
}

// 같은 "탈모"라도 두피 혈관 수축, 피지 대사 장애, 영양 흡수 결핍, 내분비 불균형,
// 장내 독소, 경추/자세 문제 등 서로 다른 메커니즘이 원인일 수 있어 각 유형에
// 가중치 점수를 매겨 비교한 뒤, 가장 높은 1~2개 원인을 "복합 유형(예: 55%+45%)"으로 보여준다.
// 신호는 기기 데이터(MultimodalData)와 문진 답변(OnboardingProfile.answers)을 함께 사용하므로,
// 두 값을 직접 입력/조정하면 결과가 즉시 바뀐다.
export function classifyHairCareType(d: MultimodalData, p: OnboardingProfile): HairCareClassification {
  const bmi = d.biosignal.bmi
  const a = p.answers

  const stressHigh   = d.eda.stressIndex >= 65
  const hrvLow       = d.biosignal.hrv < 38
  const ansLow       = d.eda.ansBalance < 35
  const poorSleep    = d.biosignal.sleepHours < 6.5 || isHighConcern(a.stress_sleep)
  const palpitation  = isHighConcern(a.stress_palpitation)
  const giHigh       = isHighConcern(a.gut_bloating) || isHighConcern(a.gut_bowel)
  const postureHigh  = isHighConcern(a.posture_neck) || isHighConcern(a.posture_pelvis)
  const hairThin     = isHighConcern(a.hair_thinning) || isHighConcern(a.hair_loss)
  const skinTrouble  = isHighConcern(a.skin_cycle_acne)
  const dietCraving  = isHighConcern(a.diet_craving)
  const fatigueHigh  = isHighConcern(a.common_fatigue)

  const scores: Record<HairCareTypeId, number> = {
    stress_ans: 0,
    metabolic_damp_heat: 0,
    deficiency: 0,
    hormonal_dht: 0,
    gut_inflammation: 0,
    cervical_capillary: 0,
  }

  // 1. 상열하한 & 자율신경 수축형 — 교감신경 과활성화 · 두피 혈류 저하
  if (stressHigh) scores.stress_ans += 15
  if (hrvLow) scores.stress_ans += 15
  if (ansLow) scores.stress_ans += 10
  if (poorSleep) scores.stress_ans += 10
  if (bmi >= 18.5 && bmi < 23) scores.stress_ans += 5

  // 2. 지루성 습열 & 대사 정체형 — 대사 정체 · 피지 과다
  if (bmi >= 25) scores.metabolic_damp_heat += 25
  if (skinTrouble) scores.metabolic_damp_heat += 10
  if (dietCraving) scores.metabolic_damp_heat += 10

  // 3. 기혈 수척 & 영양 전달 저하형 — 저체중 · 영양 결핍
  if (bmi < 18.5) scores.deficiency += 30
  if (fatigueHigh) scores.deficiency += 10

  // 4. 내분비 & DHT 호르몬 감수성형 — 유전/호르몬 기반 (다른 신호가 약할 때의 기본값)
  scores.hormonal_dht += 8
  if (bmi >= 21 && bmi <= 26) scores.hormonal_dht += 10
  if (hairThin) scores.hormonal_dht += 15

  // 5. 장내 독소 & 만성 염증형 — 장-두피 축
  if (giHigh) scores.gut_inflammation += 25
  if (bmi >= 23 && bmi <= 27) scores.gut_inflammation += 10
  if (skinTrouble) scores.gut_inflammation += 8

  // 6. 경추 변형 & 모세혈관 압착형 — 거북목/자세로 인한 국소 혈류 압박
  if (postureHigh) scores.cervical_capillary += 28
  if (fatigueHigh) scores.cervical_capillary += 5
  if (palpitation) scores.cervical_capillary += 5

  const matches = (Object.entries(scores) as [HairCareTypeId, number][])
    .map(([id, score]) => ({ id, score, percent: 0 }))
    .sort((x, y) => y.score - x.score)

  const total = matches.reduce((sum, m) => sum + m.score, 0)

  if (total === 0) {
    // 아무 신호도 없으면 유전/호르몬형을 기본값으로 표시
    const withPercent = matches.map(m => ({ ...m, percent: m.id === 'hormonal_dht' ? 100 : 0 }))
    return {
      primary: withPercent.find(m => m.id === 'hormonal_dht')!,
      secondary: null,
      matches: withPercent,
    }
  }

  const withPercent = matches.map(m => ({ ...m, percent: Math.round((m.score / total) * 100) }))
  const primary = withPercent[0]
  const secondCandidate = withPercent[1]
  const secondary = secondCandidate && secondCandidate.score > 0 && secondCandidate.percent >= 20
    ? secondCandidate
    : null

  return { primary, secondary, matches: withPercent }
}
