export type FlowLevel = 'spotting' | 'light' | 'medium' | 'heavy' | 'very_heavy'
export type MoodType = 'happy' | 'calm' | 'tired' | 'anxious' | 'irritable' | 'sad' | 'energetic' | 'sensitive'
export type SkinCondition = 'clear' | 'slightly_oily' | 'oily' | 'dry' | 'breakout_mild' | 'breakout_severe' | 'sensitive'
export type DischargeType = 'none' | 'white_creamy' | 'clear_watery' | 'egg_white' | 'yellow' | 'brown' | 'unusual'
export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal'

export interface DailyLogFormData {
  date: string
  isPeriod: boolean
  periodFlow?: FlowLevel
  painIntensity?: number
  painLocations?: string[]
  mood?: MoodType
  moodNotes?: string
  skinCondition?: SkinCondition
  acneCount?: number
  dischargeType?: DischargeType
  dischargeColor?: string
  bodyTemperature?: number
  heartRate?: number
  hrv?: number
  sleepHours?: number
  sleepQuality?: number
  weight?: number
  notes?: string
  bodyScore?: number
  cyclePhase?: CyclePhase
}

export interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  log?: DailyLogFormData
  cyclePhase?: CyclePhase
  isPredictedPeriod?: boolean
  isOvulation?: boolean
}

export const FLOW_LABELS: Record<FlowLevel, string> = {
  spotting: '소량 (스포팅)',
  light: '적음',
  medium: '보통',
  heavy: '많음',
  very_heavy: '매우 많음',
}

export const MOOD_LABELS: Record<MoodType, string> = {
  happy: '😊 행복',
  calm: '😌 평온',
  tired: '😴 피곤',
  anxious: '😰 불안',
  irritable: '😤 예민',
  sad: '😢 우울',
  energetic: '⚡ 활기',
  sensitive: '🥺 예민',
}

export const SKIN_LABELS: Record<SkinCondition, string> = {
  clear: '깨끗함',
  slightly_oily: '약간 유분',
  oily: '유분 많음',
  dry: '건조함',
  breakout_mild: '여드름 (경미)',
  breakout_severe: '여드름 (심함)',
  sensitive: '민감함',
}

export const DISCHARGE_LABELS: Record<DischargeType, string> = {
  none: '없음',
  white_creamy: '하얀색/크림색',
  clear_watery: '투명/물같음',
  egg_white: '달걀 흰자형',
  yellow: '노란색',
  brown: '갈색',
  unusual: '비정상 (병원 상담 권장)',
}
