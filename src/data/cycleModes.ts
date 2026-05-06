import { Droplets, Baby, Sparkles, Leaf } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CycleMode } from '@/types/health'

export interface CycleModeItem {
  id: CycleMode
  label: string
  desc: string
  icon: LucideIcon
  gradient: string
  glow: string
  border: string
  bg: string
}

export const CYCLE_MODES: CycleModeItem[] = [
  {
    id: 'normal',
    label: '일반 모드',
    desc: '기본 생리주기 추적 · 호르몬 분석',
    icon: Droplets,
    gradient: 'linear-gradient(135deg, #f43f75, #e11d5a)',
    glow: 'rgba(244,63,117,0.3)', border: 'rgba(244,63,117,0.25)', bg: 'rgba(244,63,117,0.06)',
  },
  {
    id: 'pregnancy',
    label: '임신/출산',
    desc: '임신·출산 기간 태아 & 산모 케어',
    icon: Baby,
    gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)',
    glow: 'rgba(168,85,247,0.3)', border: 'rgba(168,85,247,0.25)', bg: 'rgba(168,85,247,0.06)',
  },
  {
    id: 'menopause',
    label: '완경',
    desc: '완경 전후 호르몬 변화 · 증상 관리',
    icon: Sparkles,
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    glow: 'rgba(245,158,11,0.3)', border: 'rgba(245,158,11,0.25)', bg: 'rgba(245,158,11,0.06)',
  },
  {
    id: 'amenorrhea',
    label: '무월경/불임',
    desc: '생리 부재 · 난임 모니터링 · 배란 추적',
    icon: Leaf,
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    glow: 'rgba(16,185,129,0.3)', border: 'rgba(16,185,129,0.25)', bg: 'rgba(16,185,129,0.06)',
  },
]

export const CYCLE_MODE_MAP = Object.fromEntries(
  CYCLE_MODES.map(m => [m.id, m])
) as Record<CycleMode, CycleModeItem>
