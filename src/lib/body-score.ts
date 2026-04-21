import type { DailyLogFormData } from '@/types/health'

export function calculateBodyScore(log: Partial<DailyLogFormData>): number {
  let score = 70 // base score
  let factors = 0

  if (log.sleepHours !== undefined) {
    factors++
    const sleepScore = log.sleepHours >= 7 && log.sleepHours <= 9
      ? 100
      : log.sleepHours >= 6
        ? 75
        : 50
    score += (sleepScore - 70)
  }

  if (log.painIntensity !== undefined) {
    factors++
    score -= log.painIntensity * 4
  }

  if (log.mood) {
    factors++
    const moodScores: Record<string, number> = {
      happy: 20, calm: 15, energetic: 18,
      tired: -10, anxious: -15, irritable: -12, sad: -15, sensitive: -5,
    }
    score += moodScores[log.mood] ?? 0
  }

  if (log.heartRate !== undefined) {
    factors++
    const hrScore = log.heartRate >= 60 && log.heartRate <= 80
      ? 15
      : log.heartRate >= 50 && log.heartRate <= 100
        ? 5
        : -10
    score += hrScore
  }

  if (log.sleepQuality !== undefined) {
    factors++
    score += (log.sleepQuality - 5) * 3
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

export function getBodyScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-gold-500'
  if (score >= 40) return 'text-orange-500'
  return 'text-rose-600'
}

export function getBodyScoreLabel(score: number): string {
  if (score >= 80) return '최상'
  if (score >= 60) return '양호'
  if (score >= 40) return '보통'
  return '주의'
}
