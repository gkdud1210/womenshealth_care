/**
 * 루디아피드 서버 연결 — 여러 사람이 같은 피드를 보도록 글·댓글·좋아요를 LUDIA AI 서버
 * (deploy/cloudflare-ai, /feed/*)에 저장해요.
 *
 * NEXT_PUBLIC_LUDIA_AI_URL 이 없거나 서버에 닿지 않으면 예전처럼 이 기기에만 저장해요.
 * 본인 확인은 기기마다 만든 글쓴이 id + 비밀 키로 해요 (서버는 키의 해시만 저장).
 */

import type { SnsComment, SnsPost, ReviewInfo, PostType } from '@/components/feed/LudiaFeed'
import type { FeedNutrition } from '@/lib/feed-nutrition'

const IDENTITY_KEY = 'ludia_feed_identity_v1'

export function feedServerBase(): string | null {
  const base = process.env.NEXT_PUBLIC_LUDIA_AI_URL
  return base ? base.replace(/\/+$/, '') : null
}

function randomHex(bytes: number) {
  const b = crypto.getRandomValues(new Uint8Array(bytes))
  return Array.from(b, x => x.toString(16).padStart(2, '0')).join('')
}

/** 이 기기의 글쓴이 id·비밀 키 — 처음 부를 때 만들어요 */
export function feedIdentity(): { id: string; key: string } {
  try {
    const s = localStorage.getItem(IDENTITY_KEY)
    if (s) {
      const v = JSON.parse(s)
      if (typeof v?.id === 'string' && typeof v?.key === 'string') return v
    }
  } catch {}
  const v = { id: `a_${randomHex(12)}`, key: randomHex(32) }
  try { localStorage.setItem(IDENTITY_KEY, JSON.stringify(v)) } catch {}
  return v
}

export class FeedServerError extends Error {
  constructor(public status: number, public code: string) { super(code) }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const base = feedServerBase()
  if (!base) throw new FeedServerError(0, 'no_server')
  const me = feedIdentity()
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      'X-Ludia-Author': me.id,
      'X-Ludia-Key': me.key,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new FeedServerError(res.status, (data as { error?: string }).error ?? 'failed')
  return data as T
}

type ServerPost = SnsPost & { liked?: boolean }
export interface Thread { comments: SnsComment[]; likes: number; liked: boolean }

export const feedServer = {
  posts: (before?: string) =>
    call<{ posts: ServerPost[]; hasMore: boolean }>('GET', `/feed/posts${before ? `?before=${encodeURIComponent(before)}` : ''}`),
  /** 앱에 들어 있는 기본 글에 달린 댓글·좋아요 */
  threads: (ids: string[]) =>
    call<{ threads: Record<string, Thread> }>('GET', `/feed/threads?ids=${ids.map(encodeURIComponent).join(',')}`),
  me: () => call<{ registered: boolean; expert: boolean; expertTitle: string | null }>('GET', '/feed/me'),
  registerExpert: (code: string, authorName: string, authorEmoji: string) =>
    call<{ expert: true; expertTitle: string }>('POST', '/feed/expert', { code, authorName, authorEmoji }),
  createPost: (draft: {
    type: PostType; title: string; content: string; images?: string[]; coverEmoji?: string; coverGradient?: string
    tags: string[]; video?: string; sport?: string; review?: ReviewInfo; authorName: string; authorEmoji: string
  }) => call<{ post: ServerPost }>('POST', '/feed/posts', draft),
  deletePost: (id: string) => call<{ ok: true }>('DELETE', `/feed/posts/${encodeURIComponent(id)}`),
  saveNutrition: (id: string, nutrition: FeedNutrition) =>
    call<{ ok: true }>('PUT', `/feed/posts/${encodeURIComponent(id)}/nutrition`, { nutrition }),
  addComment: (postId: string, c: { text: string; question?: boolean; parentId?: string; authorName: string; authorEmoji: string }) =>
    call<{ comment: SnsComment; parentId: string | null }>('POST', `/feed/posts/${encodeURIComponent(postId)}/comments`, c),
  toggleLike: (postId: string, authorName: string, authorEmoji: string) =>
    call<{ liked: boolean; likes: number }>('POST', `/feed/posts/${encodeURIComponent(postId)}/like`, { authorName, authorEmoji }),
}

/** 서버 오류를 사람이 읽을 말로 */
export function feedErrorText(err: unknown): string {
  const code = err instanceof FeedServerError ? err.code : ''
  switch (code) {
    case 'expert_only': return '건강상식·레시피·운동 글은 인증된 전문가만 올릴 수 있어요. 후기 자랑은 누구나 올릴 수 있어요.'
    case 'rate_limited': return '잠시 후 다시 시도해주세요.'
    case 'image_too_large': return '사진이 너무 커요. 다른 사진으로 올려주세요.'
    case 'bad_code': return '인증 코드가 맞지 않거나 이미 사용된 코드예요.'
    case 'banned': return '이용이 제한된 계정이에요.'
    default: return '서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.'
  }
}
