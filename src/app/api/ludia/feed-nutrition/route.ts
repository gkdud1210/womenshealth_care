import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// 루디아피드 게시물 사진(음식·카페)의 칼로리·영양성분 분석.
// 정적 배포(output: 'export')에는 API 라우트가 없어요 — dev 서버에서만 응답하고,
// 클라이언트는 실패 시 src/lib/feed-nutrition.ts의 캡션 키워드 추정으로 자동 폴백해요.

export const maxDuration = 30

const MAX_IMAGES = 4

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

  const files = formData.getAll('file').filter((f): f is File => f instanceof File).slice(0, MAX_IMAGES)
  const caption = String(formData.get('caption') ?? '').slice(0, 500)

  if (files.length === 0) {
    return NextResponse.json({ error: 'no_file' }, { status: 400 })
  }

  try {
    const images = await Promise.all(files.map(async f => ({
      inlineData: {
        data: Buffer.from(await f.arrayBuffer()).toString('base64'),
        mimeType: f.type || 'image/jpeg',
      },
    })))

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' })

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

    const result = await model.generateContent([prompt, ...images])
    const raw = result.response.text().trim()
    const jsonStr = raw.startsWith('{') ? raw : (raw.match(/\{[\s\S]*\}/) ?? ['{}'])[0]
    const parsed = JSON.parse(jsonStr) as { isFood?: boolean; items?: unknown[]; summary?: string; tip?: string }

    if (!Array.isArray(parsed.items)) {
      throw new Error('malformed_response')
    }

    return NextResponse.json({
      isFood: parsed.isFood !== false,
      items: parsed.items,
      summary: parsed.summary ?? '분석을 완료했어요.',
      tip: parsed.tip ?? '',
      source: 'ai',
    })
  } catch (err) {
    console.error('[ludia/feed-nutrition]', err)
    return NextResponse.json({ error: 'analysis_failed' }, { status: 500 })
  }
}
