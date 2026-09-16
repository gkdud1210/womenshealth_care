import {
  Scissors, Scale, Dumbbell, PersonStanding, Sprout, Brain,
  Droplets, ShieldPlus, Sparkles, Bone, Activity,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface CareCase {
  id: string
  label: string
  desc: string
  icon: LucideIcon
  gradient: string
  glow: string
  border: string
  bg: string
}

export const CARE_CASES: CareCase[] = [
  {
    id: 'hair_scalp',
    label: '탈모 & 두피 케어',
    desc: '두피 열(상열하한) · 모세혈관 수축 · 피지 대사 정체',
    icon: Scissors,
    gradient: 'linear-gradient(135deg, #ec4899, #db2777)',
    glow: 'rgba(236,72,153,0.3)', border: 'rgba(236,72,153,0.25)', bg: 'rgba(236,72,153,0.06)',
  },
  {
    id: 'weight_metabolic',
    label: '체중 & 대사 케어',
    desc: '인슐린 저항성 · 부종 체증 · 대사 저하형 다이어트',
    icon: Scale,
    gradient: 'linear-gradient(135deg, #f97316, #ea580c)',
    glow: 'rgba(249,115,22,0.3)', border: 'rgba(249,115,22,0.25)', bg: 'rgba(249,115,22,0.06)',
  },
  {
    id: 'male_wellness',
    label: '남성 웰니스 & 벌크업',
    desc: '남성호르몬(테스토스테론) · 린매스업 · 전립선 림프 순환',
    icon: Dumbbell,
    gradient: 'linear-gradient(135deg, #0284c7, #0369a1)',
    glow: 'rgba(2,132,199,0.3)', border: 'rgba(2,132,199,0.25)', bg: 'rgba(2,132,199,0.06)',
  },
  {
    id: 'posture_correction',
    label: '체형 & 자세 교정',
    desc: 'C커브 파괴 · 골반 틀어짐 · 척추측만 · 승모근 체증',
    icon: PersonStanding,
    gradient: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    glow: 'rgba(124,58,237,0.3)', border: 'rgba(124,58,237,0.25)', bg: 'rgba(124,58,237,0.06)',
  },
  {
    id: 'gut_detox',
    label: '장 건강 & 디톡스',
    desc: '장관 독소 · 과민성 장 · 위산 결핍 · SIBO 가스',
    icon: Sprout,
    gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)',
    glow: 'rgba(20,184,166,0.3)', border: 'rgba(20,184,166,0.25)', bg: 'rgba(20,184,166,0.06)',
  },
  {
    id: 'mental_brain',
    label: '멘탈 & 뇌 건강',
    desc: '자율신경 불균형 · 부신 피로(번아웃) · 브레인 포그',
    icon: Brain,
    gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    glow: 'rgba(139,92,246,0.3)', border: 'rgba(139,92,246,0.25)', bg: 'rgba(139,92,246,0.06)',
  },
  {
    id: 'hormone_female',
    label: '호르몬 & 여성 케어',
    desc: '하초 냉증 · 생리통/PMS · 에스트로겐 우세증',
    icon: Droplets,
    gradient: 'linear-gradient(135deg, #f43f75, #e11d5a)',
    glow: 'rgba(244,63,117,0.3)', border: 'rgba(244,63,117,0.25)', bg: 'rgba(244,63,117,0.06)',
  },
  {
    id: 'disease_postcare',
    label: '질환 관리 & 포스트 케어',
    desc: '자궁근종/물혹 케어 · 암 회복기 면역 · 간/성인병 케어',
    icon: ShieldPlus,
    gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    glow: 'rgba(99,102,241,0.3)', border: 'rgba(99,102,241,0.25)', bg: 'rgba(99,102,241,0.06)',
  },
  {
    id: 'skin_beauty',
    label: '피부 & 호르몬 뷰티',
    desc: '장-피부 축 독소 · 속건조 홍조 · 인슐린 여드름',
    icon: Sparkles,
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    glow: 'rgba(245,158,11,0.3)', border: 'rgba(245,158,11,0.25)', bg: 'rgba(245,158,11,0.06)',
  },
  {
    id: 'musculoskeletal_lymph',
    label: '근골격 & 림프 순환',
    desc: '하체 부종 · 전신 근육 경직 · 골반 정맥 울혈',
    icon: Bone,
    gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    glow: 'rgba(6,182,212,0.3)', border: 'rgba(6,182,212,0.25)', bg: 'rgba(6,182,212,0.06)',
  },
  {
    id: 'organ_monitoring',
    label: '기관 징후 & 정기 모니터링',
    desc: '갑상선/자궁/난소 체온 모니터링 · 이상 신호 감지 · 정기 검진 가이드',
    icon: Activity,
    gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    glow: 'rgba(59,130,246,0.3)', border: 'rgba(59,130,246,0.25)', bg: 'rgba(59,130,246,0.06)',
  },
]
