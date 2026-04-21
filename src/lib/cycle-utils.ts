export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal'

export interface CycleInfo {
  phase: CyclePhase
  dayInCycle: number
  daysUntilNextPeriod: number
  ovulationDate: Date | null
  nextPeriodDate: Date
}

export function getCyclePhase(
  dayInCycle: number,
  cycleLength: number = 28,
  periodLength: number = 5
): CyclePhase {
  if (dayInCycle <= periodLength) return 'menstrual'
  const ovulationDay = cycleLength - 14
  if (dayInCycle <= ovulationDay - 2) return 'follicular'
  if (dayInCycle <= ovulationDay + 2) return 'ovulation'
  return 'luteal'
}

export function getPhaseColor(phase: CyclePhase): string {
  const colors: Record<CyclePhase, string> = {
    menstrual: '#f43f75',
    follicular: '#fb923c',
    ovulation: '#22c55e',
    luteal: '#a855f7',
  }
  return colors[phase]
}

export function getPhaseBg(phase: CyclePhase): string {
  const colors: Record<CyclePhase, string> = {
    menstrual: 'bg-rose-100 text-rose-700',
    follicular: 'bg-orange-100 text-orange-700',
    ovulation: 'bg-green-100 text-green-700',
    luteal: 'bg-purple-100 text-purple-700',
  }
  return colors[phase]
}

export function getPhaseLabel(phase: CyclePhase): string {
  const labels: Record<CyclePhase, string> = {
    menstrual: '생리기',
    follicular: '난포기',
    ovulation: '배란기',
    luteal: '황체기',
  }
  return labels[phase]
}

export function getPhaseDescription(phase: CyclePhase): string {
  const desc: Record<CyclePhase, string> = {
    menstrual: '자궁 내막이 탈락하는 시기. 충분한 휴식과 철분 보충이 필요합니다.',
    follicular: '에스트로겐이 증가하며 에너지가 높아지는 시기. 운동과 사교 활동에 좋습니다.',
    ovulation: '가임력이 최고조에 달하는 시기. 기초 체온이 약간 상승합니다.',
    luteal: '프로게스테론이 증가하는 시기. PMS 증상이 나타날 수 있습니다.',
  }
  return desc[phase]
}

export function calculateDayInCycle(lastPeriodStart: Date, today: Date): number {
  const diffMs = today.getTime() - lastPeriodStart.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return (diffDays % 28) + 1
}

export function predictNextPeriod(lastPeriodStart: Date, cycleLength: number = 28): Date {
  const next = new Date(lastPeriodStart)
  next.setDate(next.getDate() + cycleLength)
  return next
}
