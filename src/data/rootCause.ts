// ── 근본 원인 카테고리 ───────────────────────────────────────────────────────
//
// 66개(11카드×6) + 6개(탈모) = 72개 세부 체질을 "이게 결국 무슨 문제인가"로
// 한 번 더 묶어요. 증상 기반 실시간 진단에서 "이건 영양 문제예요 / 스트레스
// 문제예요"처럼 한눈에 알려주는 데 써요.

export type RootCause =
  | 'nutrition'   // 영양소 불균형
  | 'exercise'    // 운동 부족·과다·잘못된 방식
  | 'stress'      // 스트레스 · 자율신경
  | 'circulation' // 순환 저하 · 냉증 · 부종
  | 'hormone'     // 호르몬 불균형
  | 'gut'         // 장 · 소화 문제
  | 'toxin'       // 독소 · 간 부담 · 환경호르몬 노출
  | 'posture'     // 자세 · 근골격
  | 'sleep'       // 수면 · 바이오리듬
  | 'immune'      // 면역 · 회복력 저하

export const ROOT_CAUSE_META: Record<RootCause, { label: string; emoji: string; color: string; desc: string }> = {
  nutrition:   { label: '영양소 불균형',      emoji: '🍽️', color: '#ca8a04', desc: '먹는 것에서 필요한 영양소가 채워지지 않고 있어요' },
  exercise:    { label: '운동·활동 부족',      emoji: '🏃', color: '#ea580c', desc: '몸에 맞지 않는 운동량이나 방식이 원인일 수 있어요' },
  stress:      { label: '스트레스 · 자율신경',  emoji: '😣', color: '#8b5cf6', desc: '교감신경이 과활성화되어 몸이 계속 긴장 상태예요' },
  circulation: { label: '순환 저하 · 냉증·부종', emoji: '💧', color: '#0891b2', desc: '혈액·림프 순환이 정체돼 노폐물과 냉기가 쌓이고 있어요' },
  hormone:     { label: '호르몬 불균형',       emoji: '⚖️', color: '#e11d5a', desc: '호르몬 신호 체계가 흐트러진 상태예요' },
  gut:         { label: '장 · 소화 문제',      emoji: '🌱', color: '#16a34a', desc: '장 환경이나 소화 기능이 근본 원인일 수 있어요' },
  toxin:       { label: '독소 · 환경 노출',    emoji: '🫗', color: '#4f46e5', desc: '간 해독 부담이나 외부 독소·환경호르몬 노출이 영향을 줄 수 있어요' },
  posture:     { label: '자세 · 근골격',       emoji: '🦴', color: '#7c3aed', desc: '체형·자세로 인한 신경·혈류 압박이 원인일 수 있어요' },
  sleep:       { label: '수면 · 바이오리듬',   emoji: '🌙', color: '#6366f1', desc: '수면·생체 리듬이 깨져 회복이 잘 안 되고 있어요' },
  immune:      { label: '면역 · 회복력 저하',   emoji: '🛡️', color: '#2563eb', desc: '면역력과 회복 자원이 떨어져 있는 상태예요' },
}

/** 탈모 6유형(HairCareTypeId) 근본 원인 */
export const HAIR_ROOT_CAUSE: Record<string, RootCause> = {
  stress_ans: 'stress',
  metabolic_damp_heat: 'nutrition',
  deficiency: 'nutrition',
  hormonal_dht: 'hormone',
  gut_inflammation: 'gut',
  cervical_capillary: 'posture',
}

/** 나머지 66개 세부 체질(CareSubtype id) 근본 원인 */
export const CARE_SUBTYPE_ROOT_CAUSE: Record<string, RootCause> = {
  // 체중 & 대사
  weight_metabolic__water_retention: 'circulation',
  weight_metabolic__insulin_spike: 'nutrition',
  weight_metabolic__cortisol_binge: 'stress',
  weight_metabolic__weak_lean_obese: 'nutrition',
  weight_metabolic__gut_imbalance: 'gut',
  weight_metabolic__thyroid_slow: 'hormone',
  // 남성 웰니스
  male_wellness__adrenal_cortisol: 'stress',
  male_wellness__insulin_visceral: 'nutrition',
  male_wellness__digestion_weak: 'gut',
  male_wellness__pelvic_lymph: 'circulation',
  male_wellness__liver_overload: 'toxin',
  male_wellness__circadian_broken: 'sleep',
  // 체형 & 자세
  posture_correction__cervical_lymph: 'posture',
  posture_correction__swayback: 'posture',
  posture_correction__pelvic_vein: 'circulation',
  posture_correction__fascia_tight: 'stress',
  posture_correction__lumbar_visceral: 'nutrition',
  posture_correction__weak_core: 'nutrition',
  // 장 건강
  gut_detox__toxin_stuck: 'gut',
  gut_detox__nervous_ibs: 'stress',
  gut_detox__low_stomach_acid: 'gut',
  gut_detox__leaky_gut: 'gut',
  gut_detox__cold_abdomen: 'circulation',
  gut_detox__sibo_gas: 'gut',
  // 멘탈 & 뇌
  mental_brain__sympathetic_tense: 'stress',
  mental_brain__adrenal_burnout: 'stress',
  mental_brain__brain_fog: 'posture',
  mental_brain__gut_brain_toxin: 'gut',
  mental_brain__serotonin_deficiency: 'nutrition',
  mental_brain__circadian_broken: 'sleep',
  // 호르몬 & 여성 케어
  hormone_female__cold_stasis: 'circulation',
  hormone_female__pms_explosive: 'stress',
  hormone_female__estrogen_dominance: 'hormone',
  hormone_female__implantation_weak: 'nutrition',
  hormone_female__gut_uterus_axis: 'gut',
  hormone_female__pelvic_congestion: 'posture',
  // 질환 관리 & 포스트 케어
  disease_postcare__cold_blood_stasis: 'circulation',
  disease_postcare__immune_cold: 'immune',
  disease_postcare__liver_overload: 'toxin',
  disease_postcare__prediabetes: 'nutrition',
  disease_postcare__hypertension_risk: 'stress',
  disease_postcare__spine_surgery: 'posture',
  // 피부 & 호르몬 뷰티
  skin_beauty__gut_skin_axis: 'gut',
  skin_beauty__insulin_sebum: 'nutrition',
  skin_beauty__barrier_dry: 'stress',
  skin_beauty__estrogen_low_elasticity: 'hormone',
  skin_beauty__upper_heat: 'circulation',
  skin_beauty__weak_dermis: 'nutrition',
  // 근골격 & 림프 순환
  musculoskeletal_lymph__leg_edema: 'circulation',
  musculoskeletal_lymph__trapezius_tension: 'posture',
  musculoskeletal_lymph__pelvic_asymmetry: 'posture',
  musculoskeletal_lymph__muscle_rigid: 'stress',
  musculoskeletal_lymph__insulin_joint: 'nutrition',
  musculoskeletal_lymph__weak_bone_density: 'nutrition',
  // 기관 징후 & 정기 모니터링
  organ_monitoring__thyroid_slow: 'hormone',
  organ_monitoring__pelvic_organ: 'circulation',
  organ_monitoring__liver_detox: 'toxin',
  organ_monitoring__pancreas_stress: 'nutrition',
  organ_monitoring__cardiovascular: 'stress',
  organ_monitoring__immune_weak: 'immune',
  // 시니어 웰니스
  senior_wellness__joint_arthritis: 'posture',
  senior_wellness__sarcopenia: 'nutrition',
  senior_wellness__metabolic_complex: 'nutrition',
  senior_wellness__brain_circulation: 'circulation',
  senior_wellness__spinal_stenosis: 'posture',
  senior_wellness__constipation: 'gut',
}

export function rootCauseOf(subtypeId: string, isHair: boolean): RootCause {
  return (isHair ? HAIR_ROOT_CAUSE[subtypeId] : CARE_SUBTYPE_ROOT_CAUSE[subtypeId]) ?? 'nutrition'
}
