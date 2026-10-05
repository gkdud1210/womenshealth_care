/**
 * 루디아 AI(Gemini) 엔드포인트 주소
 *
 * 배포 사이트는 정적 사이트라 Next.js API 라우트가 없어요. NEXT_PUBLIC_LUDIA_AI_URL
 * (Hugging Face Space의 ludia_ai_service.py)이 설정돼 있으면 그쪽을, 없으면 dev 서버의
 * /api/ludia/* 라우트를 불러요. 둘 다 실패하면 각 화면이 로컬 추정으로 폴백해요.
 */
export type LudiaApiPath = 'chat' | 'vision-nutrition' | 'feed-nutrition'

export function ludiaApiUrl(path: LudiaApiPath): string {
  const base = process.env.NEXT_PUBLIC_LUDIA_AI_URL
  return base ? `${base.replace(/\/+$/, '')}/${path}` : `/api/ludia/${path}/`
}
