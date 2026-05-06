import {
  Droplets, Zap, Sparkles, Activity, Leaf, Shield,
  Scale, Wind, Bone, Scissors, Brain,
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
    id: 'healthy_cycle',
    label: '건강한 생리주기',
    desc: '규칙적인 주기 유지 · 호르몬 균형 관리',
    icon: Droplets,
    gradient: 'linear-gradient(135deg, #f43f75, #e11d5a)',
    glow: 'rgba(244,63,117,0.3)', border: 'rgba(244,63,117,0.25)', bg: 'rgba(244,63,117,0.06)',
  },
  {
    id: 'period_pain',
    label: '생리통 관리',
    desc: '통증 패턴 분석 · 자궁 냉증 · 진통 가이드',
    icon: Zap,
    gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
    glow: 'rgba(239,68,68,0.3)', border: 'rgba(239,68,68,0.25)', bg: 'rgba(239,68,68,0.06)',
  },
  {
    id: 'skin_acne',
    label: '여드름 / 피부 질환',
    desc: '호르몬 피부 · 주기별 스킨케어 · 홍채 피부존',
    icon: Sparkles,
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    glow: 'rgba(245,158,11,0.3)', border: 'rgba(245,158,11,0.25)', bg: 'rgba(245,158,11,0.06)',
  },
  {
    id: 'thyroid_uterus',
    label: '갑상선 / 자궁 / 난소',
    desc: '기관 온도 모니터링 · 이상 신호 감지',
    icon: Activity,
    gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)',
    glow: 'rgba(168,85,247,0.3)', border: 'rgba(168,85,247,0.25)', bg: 'rgba(168,85,247,0.06)',
  },
  {
    id: 'fertility',
    label: '난임',
    desc: '배란일 추적 · 착상 환경 · 수정 가능 기간',
    icon: Leaf,
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    glow: 'rgba(16,185,129,0.3)', border: 'rgba(16,185,129,0.25)', bg: 'rgba(16,185,129,0.06)',
  },
  {
    id: 'cyst_fibroid_cancer',
    label: '물혹 · 근종 · 암',
    desc: '이상 온도 패턴 · 정기 모니터링 · 조기 신호',
    icon: Shield,
    gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    glow: 'rgba(59,130,246,0.3)', border: 'rgba(59,130,246,0.25)', bg: 'rgba(59,130,246,0.06)',
  },
  {
    id: 'diet',
    label: '다이어트',
    desc: '주기별 대사 변화 · 체중 관리 · 식이 가이드',
    icon: Scale,
    gradient: 'linear-gradient(135deg, #f97316, #ea580c)',
    glow: 'rgba(249,115,22,0.3)', border: 'rgba(249,115,22,0.25)', bg: 'rgba(249,115,22,0.06)',
  },
  {
    id: 'stress',
    label: '스트레스 관리',
    desc: 'HRV · EDA · 자율신경 균형 · 회복 가이드',
    icon: Wind,
    gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    glow: 'rgba(6,182,212,0.3)', border: 'rgba(6,182,212,0.25)', bg: 'rgba(6,182,212,0.06)',
  },
  {
    id: 'osteoporosis',
    label: '골다공증',
    desc: '호르몬 골밀도 변화 · 칼슘 흡수 · 운동 가이드',
    icon: Bone,
    gradient: 'linear-gradient(135deg, #64748b, #475569)',
    glow: 'rgba(100,116,139,0.3)', border: 'rgba(100,116,139,0.25)', bg: 'rgba(100,116,139,0.06)',
  },
  {
    id: 'hair_care',
    label: '모발 관리',
    desc: '탈모 패턴 · 두피 건강 · 주기별 영양 가이드',
    icon: Scissors,
    gradient: 'linear-gradient(135deg, #ec4899, #db2777)',
    glow: 'rgba(236,72,153,0.3)', border: 'rgba(236,72,153,0.25)', bg: 'rgba(236,72,153,0.06)',
  },
  {
    id: 'brain_cognitive',
    label: '뇌 건강 / 인지 기능',
    desc: '브레인 포그 · 집중력 · 기억력 · 호르몬 인지',
    icon: Brain,
    gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    glow: 'rgba(139,92,246,0.3)', border: 'rgba(139,92,246,0.25)', bg: 'rgba(139,92,246,0.06)',
  },
]
