import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// 정적 배포(output: 'export')에는 API 라우트가 없어요 — 이 엔드포인트는 dev 서버에서만 응답하고,
// 클라이언트는 실패 시 src/lib/meal-analysis.ts의 로컬 태그 기반 추정으로 자동 폴백해요.

export const maxDuration = 30

const MEAL_LABEL: Record<string, string> = { breakfast: '아침', lunch: '점심', dinner: '저녁' }

interface ParsedAnalysis {
  foods: { name: string; calories: number }[]
  totalCalories: number
  protein: number
  carb: number
  fat: number
  dietPattern: 'home' | 'delivery' | 'processed' | 'unclear'
  dietPatternNote: string
  assessment: string
  addSuggestions: string[]
  removeSuggestions: string[]
}

function fileToBase64(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString('base64')
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'no_key' }, { status: 503 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const mealType = String(formData.get('mealType') ?? 'lunch')
  const careLabels = String(formData.get('careLabels') ?? '일반 건강')
  const targetLo = Number(formData.get('targetLo') ?? 500)
  const targetHi = Number(formData.get('targetHi') ?? 700)

  if (!file) {
    return NextResponse.json({ error: 'no_file' }, { status: 400 })
  }

  const mealLabel = MEAL_LABEL[mealType] ?? '식사'

  try {
    const buf = await file.arrayBuffer()
    const base64 = fileToBase64(buf)
    const mimeType = file.type || 'image/jpeg'

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' })

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

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64, mimeType } },
    ])
    const raw = result.response.text().trim()
    const jsonStr = raw.startsWith('{') ? raw : (raw.match(/\{[\s\S]*\}/) ?? ['{}'])[0]
    const parsed = JSON.parse(jsonStr) as Partial<ParsedAnalysis>

    if (!Array.isArray(parsed.foods) || typeof parsed.totalCalories !== 'number') {
      throw new Error('malformed_response')
    }

    return NextResponse.json({
      foods: parsed.foods,
      totalCalories: parsed.totalCalories,
      protein: parsed.protein ?? undefined,
      carb: parsed.carb ?? undefined,
      fat: parsed.fat ?? undefined,
      dietPattern: (['home', 'delivery', 'processed', 'unclear'] as const).includes(parsed.dietPattern as 'home')
        ? parsed.dietPattern : 'unclear',
      dietPatternNote: parsed.dietPatternNote ?? undefined,
      assessment: parsed.assessment ?? '분석을 완료했어요.',
      addSuggestions: Array.isArray(parsed.addSuggestions) ? parsed.addSuggestions : [],
      removeSuggestions: Array.isArray(parsed.removeSuggestions) ? parsed.removeSuggestions : [],
      source: 'ai',
    })
  } catch (err) {
    console.error('[ludia/vision-nutrition]', err)
    return NextResponse.json({ error: 'analysis_failed' }, { status: 500 })
  }
}
