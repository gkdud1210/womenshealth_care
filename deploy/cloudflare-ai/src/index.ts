/**
 * LUDIA AI 서비스 — Gemini 기반 대화·식단 사진 분석 (Cloudflare Workers)
 *
 * 배포 사이트는 정적 사이트(GitHub Pages)라 Next.js API 라우트가 없어요. 그래서 Gemini API 키를
 * 이 Worker의 시크릿(GEMINI_API_KEY)에 숨겨 두고, 앱은 NEXT_PUBLIC_LUDIA_AI_URL로 여기를 호출해요.
 * 응답 형식은 src/app/api/ludia/* (dev 서버용 라우트)와 동일해요 — 프롬프트를 고치면 양쪽을 같이 고쳐주세요.
 *
 * 엔드포인트
 *   GET  /health            — 상태 확인
 *   POST /chat              — 루디아에게 물어보기 (JSON: message, history, context)
 *   POST /vision-nutrition  — 루디아 호출 끼니 사진 분석 (form: file, mealType, careLabels, targetLo, targetHi)
 *   POST /feed-nutrition    — 루디아피드 게시물 사진 분석 (form: file×최대 4, caption)
 */

interface Env {
  GEMINI_API_KEY: string
  GEMINI_MODEL: string
  ALLOWED_ORIGINS: string
  RATE_LIMIT_PER_10MIN: string
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_FEED_IMAGES = 4
const GEMINI_TIMEOUT_MS = 25_000

class HttpError extends Error {
  constructor(public status: number, public code: string) { super(code) }
}

// ── CORS · 요청 제한 ──────────────────────────────────────────────────────────

function corsHeaders(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowed = env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  if (!allowed.includes(origin)) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

// Worker 인스턴스(isolate)별 IP 요청 기록 — 완벽한 전역 제한은 아니지만 과도한 반복 호출은 막아요.
const hits = new Map<string, number[]>()

function rateLimited(req: Request, env: Env): boolean {
  const ip = req.headers.get('CF-Connecting-IP') ?? 'unknown'
  const limit = Number(env.RATE_LIMIT_PER_10MIN) || 40
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter(t => now - t < 600_000)
  if (recent.length >= limit) { hits.set(ip, recent); return true }
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) hits.clear()
  return false
}

// ── Gemini 호출 ──────────────────────────────────────────────────────────────

type Part = { text: string } | { inline_data: { mime_type: string; data: string } }
type Content = { role: 'user' | 'model'; parts: Part[] }

async function gemini(env: Env, contents: Content[], systemInstruction?: string): Promise<string> {
  if (!env.GEMINI_API_KEY) throw new HttpError(503, 'no_key')
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents,
        ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
      }),
      // 타임아웃이 없으면 Gemini 쪽이 멈췄을 때 요청이 무한정 걸려요 (앱은 실패 시 로컬 추정으로 폴백)
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    },
  )
  if (!res.ok) throw new Error(`gemini_${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = await res.json() as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[]
  }
  const parts = data.candidates?.[0]?.content?.parts ?? []
  return parts.filter(p => p.text && !p.thought).map(p => p.text).join('').trim()
}

function parseJson(raw: string): Record<string, unknown> {
  const jsonStr = raw.startsWith('{') ? raw : (raw.match(/\{[\s\S]*\}/) ?? ['{}'])[0]
  return JSON.parse(jsonStr)
}

async function imagePart(f: File): Promise<Part> {
  if (f.size > MAX_IMAGE_BYTES) throw new HttpError(413, 'image_too_large')
  const bytes = new Uint8Array(await f.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)))
  return { inline_data: { mime_type: f.type || 'image/jpeg', data: btoa(bin) } }
}

// ── /chat ────────────────────────────────────────────────────────────────────

const PHASE_KO: Record<string, string> = { menstrual: '생리기', follicular: '난포기', ovulation: '배란기', luteal: '황체기' }
const NO_EVENT = { hasEvent: false, title: null, date: null, startTime: null, endTime: null, category: null }

interface ChatBody {
  message: string
  history?: { role: 'user' | 'assistant'; content: string }[]
  context: {
    phase: string; cycleDay: number; careTypes?: string[]
    stressIndex?: number; hrv?: number; sleepHours?: number
    today: string; userName?: string
  }
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function chatSystemPrompt(c: ChatBody['context']): string {
  const tomorrow = addDays(c.today, 1)
  const care = c.careTypes?.length ? c.careTypes.join(', ') : '일반 건강'
  return `당신은 LUDIA, 한국 여성 건강 AI 어시스턴트입니다.

사용자 건강 컨텍스트:
- 이름: ${c.userName ?? '사용자'}님
- 현재 주기: 생리 D+${c.cycleDay}일 (${PHASE_KO[c.phase] ?? c.phase})
- 관심 케어: ${care}
- EDA 스트레스: ${c.stressIndex ?? 0}/100
- HRV: ${c.hrv ?? 0}ms
- 수면: ${c.sleepHours ?? 0}시간
- 오늘: ${c.today} | 내일: ${tomorrow}

응답 원칙:
1. 일정/약속이 감지되면: reply는 "📅 [날짜] [시간]에 [제목] 일정이 맞나요?" 형식으로만 짧게 답하세요. 건강 조언 없이 확인만 요청하세요.
2. 일정이 없으면: 따뜻하고 공감적인 한국어로 2~4문장 건강 인사이트를 제공하세요.

반드시 아래 JSON 형식만 출력하세요 (코드블록·설명 없이):
{"reply":"응답 텍스트","event":{"hasEvent":false,"title":null,"date":null,"startTime":null,"endTime":null,"category":null}}

일정 감지 기준: 발표·회의·미팅·약속·병원·검진·파티·수업·시험·모임·과외·레슨·강습·강의·운동·헬스·요가·필라테스·미용실·헤어·네일·데이트·여행·출장 등
시간 변환: 오전 N시→"0N:00", 오후 N시→"(N+12):00" (오후 12시→"12:00"), 시간 없으면→null
종료시간: 명시된 경우 변환, 없으면 startTime +1시간, startTime이 null이면 null
category 분류: work=업무/회의/발표/출장, study=수업/과외/시험/강의/레슨/강습, exercise=운동/헬스/요가/필라테스, medical=병원/검진, social=약속/파티/모임/데이트, rest=휴식, other=기타/미용실/여행
날짜 변환: 오늘→"${c.today}", 내일→"${tomorrow}", 언급 없으면→"${c.today}"`
}

async function handleChat(req: Request, env: Env) {
  let body: ChatBody
  try { body = await req.json() } catch { throw new HttpError(400, 'bad_request') }
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  if (!message || message.length > 1000 || !body.context?.today) throw new HttpError(400, 'bad_request')

  const contents: Content[] = (Array.isArray(body.history) ? body.history : [])
    .slice(-10)
    .filter(h => typeof h?.content === 'string')
    .map(h => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content.slice(0, 4000) }] }))
  contents.push({ role: 'user', parts: [{ text: message }] })

  const raw = await gemini(env, contents, chatSystemPrompt(body.context))
  try {
    const parsed = parseJson(raw)
    return { reply: String(parsed.reply ?? raw), event: parsed.event ?? NO_EVENT }
  } catch {
    return { reply: raw, event: NO_EVENT }
  }
}

// ── /vision-nutrition (루디아 호출 끼니 사진) ───────────────────────────────────

const MEAL_LABEL: Record<string, string> = { breakfast: '아침', lunch: '점심', dinner: '저녁' }
const DIET_PATTERNS = ['home', 'delivery', 'processed', 'unclear']

async function handleVisionNutrition(req: Request, env: Env) {
  const form = await req.formData().catch(() => { throw new HttpError(400, 'bad_request') })
  const file = form.get('file')
  if (!(file instanceof File)) throw new HttpError(400, 'no_file')
  const mealLabel = MEAL_LABEL[String(form.get('mealType') ?? 'lunch')] ?? '식사'
  const careLabels = String(form.get('careLabels') ?? '일반 건강').slice(0, 300)
  const targetLo = Number(form.get('targetLo') ?? 500) || 500
  const targetHi = Number(form.get('targetHi') ?? 700) || 700

  const prompt = `당신은 LUDIA, 여성 건강 전문 AI 웰니스 트레이너입니다. 사용자가 ${mealLabel} 식사 사진을 보냈습니다.

사용자 케어 관심사(체질/케어카드): ${careLabels}
이 끼니의 권장 칼로리 범위: 약 ${targetLo}~${targetHi}kcal

사진 속 음식을 최대한 구체적으로 인식해서, 아래 JSON 형식으로만 답하세요. 설명이나 코드블록 없이 순수 JSON만 출력하세요.
{
  "foods": [{"name": "음식명", "calories": 숫자}],
  "totalCalories": 숫자,
  "protein": 숫자,
  "carb": 숫자,
  "fat": 숫자,
  "dietPattern": "home" | "delivery" | "processed" | "unclear",
  "dietPatternNote": "그렇게 판단한 짧은 이유 (예: 일회용 배달 용기와 튀김이 보여요)",
  "assessment": "사용자의 케어 관심사에 맞춘 2~3문장의 따뜻하고 구체적인 평가 (한국어)",
  "addSuggestions": ["이 식사에 추가하면 좋을 것 1~2개"],
  "removeSuggestions": ["줄이면 좋을 것, 없으면 빈 배열"]
}
칼로리·영양소는 사진에 보이는 양을 기준으로 합리적으로 추정하세요. 음식을 알아볼 수 없으면 foods를 빈 배열로 두고 assessment에 그 사실을 안내하세요.

dietPattern 판단 기준: 일회용 배달 용기·플라스틱 포장·프랜차이즈 로고·과도한 튀김/소스가 보이면 "delivery", 인스턴트·즉석식품·통조림처럼 보이면 "processed", 집에서 직접 조리한 반찬·밥상 구성이면 "home", 사진만으로 판단하기 어려우면 "unclear"로 표시하세요.`

  const p = parseJson(await gemini(env, [{ role: 'user', parts: [{ text: prompt }, await imagePart(file)] }]))
  if (!Array.isArray(p.foods) || typeof p.totalCalories !== 'number') throw new Error('malformed_response')

  return {
    foods: p.foods,
    totalCalories: p.totalCalories,
    protein: p.protein ?? undefined,
    carb: p.carb ?? undefined,
    fat: p.fat ?? undefined,
    dietPattern: DIET_PATTERNS.includes(String(p.dietPattern)) ? p.dietPattern : 'unclear',
    dietPatternNote: p.dietPatternNote ?? undefined,
    assessment: p.assessment ?? '분석을 완료했어요.',
    addSuggestions: Array.isArray(p.addSuggestions) ? p.addSuggestions : [],
    removeSuggestions: Array.isArray(p.removeSuggestions) ? p.removeSuggestions : [],
    source: 'ai',
  }
}

// ── /feed-nutrition (루디아피드 게시물 사진) ────────────────────────────────────

async function handleFeedNutrition(req: Request, env: Env) {
  const form = await req.formData().catch(() => { throw new HttpError(400, 'bad_request') })
  const files = form.getAll('file').filter((f): f is File => f instanceof File).slice(0, MAX_FEED_IMAGES)
  if (files.length === 0) throw new HttpError(400, 'no_file')
  const caption = String(form.get('caption') ?? '').slice(0, 500)

  const prompt = `당신은 LUDIA, 여성 건강 전문 AI 영양 코치입니다. 사용자가 인스타그램 피드처럼 SNS에 올린 사진 ${files.length}장을 보냈습니다.
사진에는 식사, 카페 음료, 디저트, 간식 등이 있을 수 있어요.
${caption ? `게시물 캡션(메뉴명·양 힌트로 참고): """${caption}"""` : ''}

사진에 보이는 음식과 음료를 하나씩 인식해서(여러 장이면 같은 음식은 중복 없이) 보이는 양 기준으로 영양성분을 추정하고,
아래 JSON 형식으로만 답하세요. 설명이나 코드블록 없이 순수 JSON만 출력하세요.
{
  "isFood": true | false,
  "items": [{
    "name": "구체적인 메뉴명 (예: 아이스 바닐라 라떼 톨 사이즈)",
    "emoji": "대표 이모지 1개",
    "calories": 숫자(kcal),
    "protein": 숫자(g),
    "carb": 숫자(g),
    "fat": 숫자(g),
    "sugar": 숫자(g),
    "sodium": 숫자(mg),
    "caffeine": 숫자(mg, 없으면 0)
  }],
  "summary": "전체 구성을 1~2문장으로 따뜻하게 요약 (한국어)",
  "tip": "여성 건강 관점의 짧고 구체적인 한 줄 조언 (한국어)"
}
음식이나 음료가 전혀 보이지 않으면 isFood를 false, items를 빈 배열로 두고 summary에 그 사실을 안내하세요.`

  const images = await Promise.all(files.map(imagePart))
  const p = parseJson(await gemini(env, [{ role: 'user', parts: [{ text: prompt }, ...images] }]))
  if (!Array.isArray(p.items)) throw new Error('malformed_response')

  return {
    isFood: p.isFood !== false,
    items: p.items,
    summary: p.summary ?? '분석을 완료했어요.',
    tip: p.tip ?? '',
    source: 'ai',
  }
}

// ── 라우터 ───────────────────────────────────────────────────────────────────

const ROUTES: Record<string, { handler: (req: Request, env: Env) => Promise<unknown>; failCode: string }> = {
  '/chat':             { handler: handleChat,             failCode: 'api_error' },
  '/vision-nutrition': { handler: handleVisionNutrition, failCode: 'analysis_failed' },
  '/feed-nutrition':   { handler: handleFeedNutrition,   failCode: 'analysis_failed' },
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(req, env)
    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors } })

    const path = new URL(req.url).pathname.replace(/\/+$/, '') || '/'

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: Object.keys(cors).length ? 204 : 403, headers: cors })
    }
    if (req.method === 'GET' && path === '/health') {
      return json({ status: 'ok', model: env.GEMINI_MODEL, hasKey: !!env.GEMINI_API_KEY })
    }

    const route = ROUTES[path]
    if (!route || req.method !== 'POST') return json({ error: 'not_found' }, 404)
    if (rateLimited(req, env)) return json({ error: 'rate_limited' }, 429)

    try {
      return json(await route.handler(req, env))
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.code }, err.status)
      console.error(`[${path}]`, err)
      return json({ error: route.failCode }, 500)
    }
  },
}
