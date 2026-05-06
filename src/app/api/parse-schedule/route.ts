import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { randomUUID } from 'crypto'
import type { ScheduleEvent } from '@/types/health'

interface ParseRequest {
  transcript: string
  currentDate: string   // YYYY-MM-DD
  currentTime: string   // HH:mm
}

interface RawEvent {
  date?: string
  startTime?: string
  endTime?: string
  title?: string
  category?: string
  intensity?: string
  notes?: string
}

const VALID_CATEGORIES = new Set(['work','study','exercise','social','rest','medical','other'])
const VALID_INTENSITIES = new Set(['low','medium','high'])

function normaliseEvent(raw: RawEvent, today: string): ScheduleEvent | null {
  const date      = typeof raw.date      === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date)      ? raw.date      : today
  const startTime = typeof raw.startTime === 'string' && /^\d{2}:\d{2}$/.test(raw.startTime) ? raw.startTime : null
  const endTime   = typeof raw.endTime   === 'string' && /^\d{2}:\d{2}$/.test(raw.endTime)   ? raw.endTime   : null
  const title     = typeof raw.title     === 'string' && raw.title.trim() ? raw.title.trim() : null

  if (!startTime || !endTime || !title) return null

  const category  = VALID_CATEGORIES.has(raw.category ?? '')  ? (raw.category  as ScheduleEvent['category'])  : 'other'
  const intensity = VALID_INTENSITIES.has(raw.intensity ?? '') ? (raw.intensity as ScheduleEvent['intensity']) : 'medium'

  return {
    id:        randomUUID(),
    date,
    startTime,
    endTime,
    title,
    category,
    intensity,
    source:    'voice',
    createdAt: new Date().toISOString(),
    notes:     typeof raw.notes === 'string' ? raw.notes : undefined,
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'no_key' }, { status: 503 })
  }

  let body: ParseRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const { transcript, currentDate, currentTime } = body

  if (!transcript?.trim()) {
    return NextResponse.json({ events: [] })
  }

  function addDays(dateStr: string, n: number) {
    const d = new Date(dateStr)
    d.setDate(d.getDate() + n)
    return d.toISOString().split('T')[0]
  }
  const tomorrow   = addDays(currentDate, 1)
  const dayAfter   = addDays(currentDate, 2)
  const nextMonday = (() => {
    const d = new Date(currentDate)
    const dow = d.getDay()
    d.setDate(d.getDate() + ((1 + 7 - dow) % 7 || 7))
    return d.toISOString().split('T')[0]
  })()

  const systemInstruction = `당신은 한국어 자연어에서 일정 정보를 추출하는 파서입니다.

현재 날짜: ${currentDate} (내일: ${tomorrow}, 모레: ${dayAfter}, 다음 월요일: ${nextMonday})
현재 시각: ${currentTime}

규칙:
- 상대적 날짜를 절대 날짜(YYYY-MM-DD)로 변환하세요
  오늘→${currentDate}, 내일→${tomorrow}, 모레→${dayAfter}
- 시간 변환
  오전 N시 → "0N:00" (두 자리), 오후 N시 → "(N+12):00" (오후 12시→"12:00")
  저녁→"18:00", 아침→"09:00", 점심→"12:00", 새벽→"04:00"
  시작·종료 시간이 모두 있어야 일정으로 인정
- category 추론
  수업/공부/시험/과제 → study
  회의/업무/미팅/발표/출근 → work
  운동/헬스/요가/산책 → exercise
  약속/모임/파티/식사 → social
  병원/검진/진료 → medical
  휴식/낮잠 → rest, 그 외 → other
- intensity: 운동·발표·시험→high, 수업·회의→medium, 식사·휴식→low
- 일정이 여러 개면 모두 추출
- 일정 정보가 없으면 events:[] 반환

반드시 순수 JSON만 출력하세요 (마크다운·설명 없이):
{"events":[{"date":"YYYY-MM-DD","startTime":"HH:mm","endTime":"HH:mm","title":"제목","category":"study","intensity":"medium"}]}`

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction,
    })

    const result = await model.generateContent(transcript)
    const raw = result.response.text().trim()

    let parsed: { events?: RawEvent[] }
    try {
      const jsonStr = raw.startsWith('{') ? raw : (raw.match(/\{[\s\S]*\}/) ?? ['{}'])[0]
      parsed = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json({ events: [] })
    }

    const events: ScheduleEvent[] = (parsed.events ?? [])
      .map((e: RawEvent) => normaliseEvent(e, currentDate))
      .filter((e): e is ScheduleEvent => e !== null)

    return NextResponse.json({ events })
  } catch (err) {
    console.error('[parse-schedule]', err)
    return NextResponse.json({ error: 'api_error' }, { status: 500 })
  }
}
