import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface ChatRequest {
  message: string
  history: Array<{ role: 'user' | 'assistant'; content: string }>
  context: {
    phase: string
    cycleDay: number
    careTypes: string[]
    stressIndex: number
    hrv: number
    sleepHours: number
    uterineTemp: number
    today: string
    userName: string
  }
}

const PHASE_KO: Record<string, string> = {
  menstrual: '생리기',
  follicular: '난포기',
  ovulation: '배란기',
  luteal: '황체기',
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'no_key' }, { status: 503 })
  }

  let body: ChatRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const { message, history, context } = body
  const tomorrow = addDays(context.today, 1)

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: `당신은 LUDIA, 한국 여성 건강 AI 어시스턴트입니다.

사용자 건강 컨텍스트:
- 이름: ${context.userName}님
- 현재 주기: 생리 D+${context.cycleDay}일 (${PHASE_KO[context.phase] ?? context.phase})
- 관심 케어: ${context.careTypes.length ? context.careTypes.join(', ') : '일반 건강'}
- EDA 스트레스: ${context.stressIndex}/100
- HRV: ${context.hrv}ms
- 수면: ${context.sleepHours}시간
- 자궁 온도: ${context.uterineTemp}°C
- 오늘: ${context.today} | 내일: ${tomorrow}

응답 원칙:
1. 일정/약속이 감지되면: reply는 "📅 [날짜] [시간]에 [제목] 일정이 맞나요?" 형식으로만 짧게 답하세요. 건강 조언 없이 확인만 요청하세요.
2. 일정이 없으면: 따뜻하고 공감적인 한국어로 2~4문장 건강 인사이트를 제공하세요.

반드시 아래 JSON 형식만 출력하세요 (코드블록·설명 없이):
{"reply":"응답 텍스트","event":{"hasEvent":false,"title":null,"date":null,"startTime":null,"endTime":null,"category":null}}

일정 감지 기준: 발표·회의·미팅·약속·병원·검진·파티·수업·시험·모임·과외·레슨·강습·강의·운동·헬스·요가·필라테스·미용실·헤어·네일·데이트·여행·출장 등
시간 변환: 오전 N시→"0N:00", 오후 N시→"(N+12):00" (오후 12시→"12:00"), 시간 없으면→null
종료시간: 명시된 경우 변환, 없으면 startTime +1시간, startTime이 null이면 null
category 분류: work=업무/회의/발표/출장, study=수업/과외/시험/강의/레슨/강습, exercise=운동/헬스/요가/필라테스, medical=병원/검진, social=약속/파티/모임/데이트, rest=휴식, other=기타/미용실/여행
날짜 변환: 오늘→"${context.today}", 내일→"${tomorrow}", 언급 없으면→"${context.today}"`,
    })

    const geminiHistory = history
      .slice(-10)
      .map(h => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      }))

    const chat = model.startChat({ history: geminiHistory })
    const result = await chat.sendMessage(message)
    const raw = result.response.text().trim()

    try {
      const jsonStr = raw.startsWith('{') ? raw : (raw.match(/\{[\s\S]*\}/) ?? ['{}'])[0]
      const parsed = JSON.parse(jsonStr)
      return NextResponse.json({
        reply: String(parsed.reply ?? raw),
        event: parsed.event ?? { hasEvent: false, title: null, date: null, time: null },
      })
    } catch {
      return NextResponse.json({
        reply: raw,
        event: { hasEvent: false, title: null, date: null, time: null },
      })
    }
  } catch (err) {
    console.error('[ludia/chat]', err)
    return NextResponse.json({ error: 'api_error' }, { status: 500 })
  }
}
