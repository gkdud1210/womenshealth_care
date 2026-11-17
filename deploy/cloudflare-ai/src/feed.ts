/**
 * 루디아피드 서버 — 여러 사람이 같은 피드를 보고, 댓글·질문·답글·좋아요를 나누고,
 * 전문가 인증 계정이 건강상식 글을 올려요. (Cloudflare D1 + KV)
 *
 * 본인 확인: 앱이 기기마다 만든 글쓴이 id + 비밀 키를 헤더(X-Ludia-Author, X-Ludia-Key)로 보내요.
 * 서버는 키의 해시만 저장하고, 처음 글을 쓸 때 등록해요.
 *
 * 엔드포인트
 *   GET    /feed/posts?before=ISO        — 최근 글 50개 (댓글·좋아요 포함)
 *   GET    /feed/threads?ids=a,b         — 앱 기본 글(루디아 공식 글)에 달린 댓글·좋아요
 *   GET    /feed/me                      — 내 전문가 여부
 *   GET    /feed/img/:id                 — 글 사진
 *   POST   /feed/posts                   — 글쓰기 (건강상식·레시피·운동 글은 전문가만, 후기는 누구나)
 *   DELETE /feed/posts/:id               — 내 글 지우기
 *   PUT    /feed/posts/:id/nutrition     — 내 글 사진 칼로리 분석 결과 저장
 *   POST   /feed/posts/:id/comments      — 댓글·질문·답글
 *   DELETE /feed/comments/:id            — 내 댓글 지우기
 *   POST   /feed/posts/:id/like          — 좋아요 누르기/취소
 *   POST   /feed/expert                  — 전문가 인증 코드 등록
 */

// ── Cloudflare 바인딩 (필요한 부분만) ─────────────────────────────────────────

interface D1Result<T> { results: T[] }
interface D1Prepared {
  bind(...values: unknown[]): D1Prepared
  first<T = Record<string, unknown>>(): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>
  run(): Promise<unknown>
}
export interface D1Database {
  prepare(sql: string): D1Prepared
  batch(stmts: D1Prepared[]): Promise<unknown[]>
}
export interface KVNamespace {
  get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>
  put(key: string, value: ArrayBuffer | Uint8Array, opts?: { metadata?: unknown }): Promise<void>
  delete(key: string): Promise<void>
}

export interface FeedEnv {
  FEED_DB?: D1Database
  FEED_IMAGES?: KVNamespace
}

export class FeedError extends Error {
  constructor(public status: number, public code: string) { super(code) }
}

// ── 제한 ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50
const MAX_IMAGES = 4
const MAX_IMAGE_BYTES = 900 * 1024
const POST_TYPES = new Set(['tip', 'recipe', 'exercise', 'review'])
/** 전문가가 아니어도 올릴 수 있는 글 종류 */
const OPEN_TYPES = new Set(['review'])

const ID_RE = /^[A-Za-z0-9_-]{6,64}$/
const KEY_RE = /^[a-f0-9]{32,128}$/

// ── 도우미 ───────────────────────────────────────────────────────────────────

function now() { return new Date().toISOString() }
function newId(prefix: string) {
  const b = crypto.getRandomValues(new Uint8Array(9))
  return `${prefix}_${Array.from(b, x => x.toString(16).padStart(2, '0')).join('')}`
}
async function sha256(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(d), x => x.toString(16).padStart(2, '0')).join('')
}
function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}
function optStr(v: unknown, max: number): string | null {
  const s = str(v, max)
  return s ? s : null
}
async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json()
    return b && typeof b === 'object' ? b as Record<string, unknown> : {}
  } catch { throw new FeedError(400, 'bad_request') }
}
function parseJson<T>(s: unknown, fallback: T): T {
  if (typeof s !== 'string') return fallback
  try { return JSON.parse(s) as T } catch { return fallback }
}

// ── 본인 확인 ─────────────────────────────────────────────────────────────────

interface AuthorRow { id: string; key_hash: string; name: string; emoji: string; expert: number; expert_title: string | null; banned: number }

/** 헤더의 글쓴이를 확인해요. 처음 보는 글쓴이면 등록해요 (register=true 일 때만). */
async function authenticate(req: Request, db: D1Database, register: boolean, profile?: { name: string; emoji: string }): Promise<AuthorRow | null> {
  const id = req.headers.get('X-Ludia-Author') ?? ''
  const key = req.headers.get('X-Ludia-Key') ?? ''
  if (!ID_RE.test(id) || !KEY_RE.test(key)) {
    if (register) throw new FeedError(401, 'no_author')
    return null
  }
  const hash = await sha256(key)
  const row = await db.prepare('SELECT * FROM authors WHERE id = ?').bind(id).first<AuthorRow>()
  if (row) {
    if (row.key_hash !== hash) throw new FeedError(401, 'bad_key')
    if (row.banned) throw new FeedError(403, 'banned')
    // 닉네임·이모지가 바뀌었으면 맞춰요
    if (profile && profile.name && (profile.name !== row.name || profile.emoji !== row.emoji)) {
      await db.prepare('UPDATE authors SET name = ?, emoji = ? WHERE id = ?').bind(profile.name, profile.emoji, id).run()
      row.name = profile.name; row.emoji = profile.emoji
    }
    return row
  }
  if (!register) return null
  const fresh: AuthorRow = { id, key_hash: hash, name: profile?.name || '루디아 회원', emoji: profile?.emoji || '🌸', expert: 0, expert_title: null, banned: 0 }
  await db.prepare('INSERT INTO authors (id, key_hash, name, emoji, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(fresh.id, fresh.key_hash, fresh.name, fresh.emoji, now()).run()
  return fresh
}

function profileFrom(b: Record<string, unknown>) {
  return { name: str(b.authorName, 20) || '루디아 회원', emoji: str(b.authorEmoji, 8) || '🌸' }
}

// ── 응답 모양 (앱의 SnsPost / SnsComment 와 같게) ─────────────────────────────

interface CommentRow { id: string; post_id: string; parent_id: string | null; author_id: string; text: string; question: number; created_at: string; name: string; emoji: string; expert: number; expert_title: string | null }

function toComment(c: CommentRow) {
  return {
    id: c.id, authorId: c.author_id, authorName: c.name, authorEmoji: c.emoji,
    authorVerified: !!c.expert, authorTitle: c.expert_title ?? undefined,
    text: c.text, createdAt: c.created_at, question: !!c.question || undefined,
  }
}

/** 글 id 들에 달린 댓글(답글은 부모 아래로)·좋아요 수·내 좋아요 */
async function threadsFor(db: D1Database, ids: string[], me: string | null) {
  const out: Record<string, { comments: ReturnType<typeof toComment>[]; likes: number; liked: boolean }> = {}
  if (ids.length === 0) return out
  for (const id of ids) out[id] = { comments: [], likes: 0, liked: false }
  const marks = ids.map(() => '?').join(',')
  const [comments, likes, mine] = await Promise.all([
    db.prepare(`SELECT c.*, a.name, a.emoji, a.expert, a.expert_title FROM comments c JOIN authors a ON a.id = c.author_id
                WHERE c.post_id IN (${marks}) ORDER BY c.created_at`).bind(...ids).all<CommentRow>(),
    db.prepare(`SELECT post_id, COUNT(*) AS n FROM likes WHERE post_id IN (${marks}) GROUP BY post_id`).bind(...ids).all<{ post_id: string; n: number }>(),
    me ? db.prepare(`SELECT post_id FROM likes WHERE author_id = ? AND post_id IN (${marks})`).bind(me, ...ids).all<{ post_id: string }>()
       : Promise.resolve({ results: [] as { post_id: string }[] }),
  ])
  const byId = new Map<string, ReturnType<typeof toComment> & { replies?: ReturnType<typeof toComment>[] }>()
  for (const c of comments.results) {
    const t = toComment(c)
    if (!c.parent_id) {
      byId.set(c.id, t)
      out[c.post_id]?.comments.push(t)
    }
  }
  for (const c of comments.results) {
    if (!c.parent_id) continue
    const parent = byId.get(c.parent_id)
    if (parent) (parent.replies ??= []).push(toComment(c))
  }
  for (const l of likes.results) if (out[l.post_id]) out[l.post_id].likes = Number(l.n)
  for (const l of mine.results) if (out[l.post_id]) out[l.post_id].liked = true
  return out
}

interface PostRow {
  id: string; author_id: string; type: string; title: string; content: string; images: string
  cover_emoji: string | null; cover_gradient: string | null; tags: string; video: string | null; sport: string | null
  facility_id: string | null
  review: string | null; nutrition: string | null; created_at: string
  name: string; emoji: string; expert: number; expert_title: string | null
}

function toPost(p: PostRow, base: string, thread: { comments: unknown[]; likes: number; liked: boolean }) {
  const images = parseJson<string[]>(p.images, []).map(id => `${base}/feed/img/${id}`)
  return {
    id: p.id, authorId: p.author_id, authorName: p.name, authorEmoji: p.emoji,
    authorVerified: !!p.expert, authorTitle: p.expert_title ?? undefined,
    createdAt: p.created_at, type: p.type, title: p.title, content: p.content,
    images: images.length ? images : undefined,
    coverEmoji: p.cover_emoji ?? undefined, coverGradient: p.cover_gradient ?? undefined,
    tags: parseJson<string[]>(p.tags, []), video: p.video ?? undefined, sport: p.sport ?? undefined,
    facilityId: p.facility_id ?? undefined,
    review: parseJson(p.review, undefined), nutrition: parseJson(p.nutrition, undefined),
    likes: thread.likes, liked: thread.liked, comments: thread.comments,
  }
}

// ── 사진 ─────────────────────────────────────────────────────────────────────

/** data:image/jpeg;base64,... 를 KV 에 저장하고 id 를 돌려줘요 (앱은 사진을 JPEG 로 줄여서 보내요) */
async function storeImage(kv: KVNamespace, dataUrl: unknown): Promise<string> {
  if (typeof dataUrl !== 'string') throw new FeedError(400, 'bad_image')
  const m = /^data:(image\/jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl)
  if (!m) throw new FeedError(400, 'bad_image')
  const bin = atob(m[2])
  if (bin.length > MAX_IMAGE_BYTES) throw new FeedError(413, 'image_too_large')
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const id = newId('img')
  await kv.put(id, bytes, { metadata: { type: m[1] } })
  return id
}

// ── 라우터 ───────────────────────────────────────────────────────────────────

/** /feed/* 요청을 처리해요. 응답 본문(JSON) 또는 Response(사진)를 돌려줘요. */
export async function handleFeed(req: Request, env: FeedEnv, path: string): Promise<unknown> {
  const db = env.FEED_DB
  if (!db) throw new FeedError(503, 'feed_not_configured')
  const url = new URL(req.url)
  const base = url.origin
  const seg = path.split('/').filter(Boolean)   // ['feed', ...]
  const m = req.method

  // GET /feed/img/:id
  if (m === 'GET' && seg[1] === 'img' && seg[2]) {
    if (!env.FEED_IMAGES || !ID_RE.test(seg[2])) throw new FeedError(404, 'not_found')
    const buf = await env.FEED_IMAGES.get(seg[2], 'arrayBuffer')
    if (!buf) throw new FeedError(404, 'not_found')
    return new Response(buf, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' } })
  }

  // GET /feed/posts
  if (m === 'GET' && seg[1] === 'posts' && !seg[2]) {
    const me = await authenticate(req, db, false).catch(() => null)
    const before = url.searchParams.get('before') ?? '9999'
    const rows = await db.prepare(`SELECT p.*, a.name, a.emoji, a.expert, a.expert_title FROM posts p JOIN authors a ON a.id = p.author_id
                                   WHERE p.created_at < ? AND a.banned = 0 ORDER BY p.created_at DESC LIMIT ?`)
      .bind(before, PAGE_SIZE).all<PostRow>()
    const threads = await threadsFor(db, rows.results.map(p => p.id), me?.id ?? null)
    return { posts: rows.results.map(p => toPost(p, base, threads[p.id])), hasMore: rows.results.length === PAGE_SIZE }
  }

  // GET /feed/threads?ids=
  if (m === 'GET' && seg[1] === 'threads') {
    const me = await authenticate(req, db, false).catch(() => null)
    const ids = (url.searchParams.get('ids') ?? '').split(',').filter(id => ID_RE.test(id)).slice(0, 100)
    return { threads: await threadsFor(db, ids, me?.id ?? null) }
  }

  // GET /feed/me
  if (m === 'GET' && seg[1] === 'me') {
    const me = await authenticate(req, db, false)
    return { registered: !!me, expert: !!me?.expert, expertTitle: me?.expert_title ?? null }
  }

  // POST /feed/expert — 전문가 인증 코드 등록
  if (m === 'POST' && seg[1] === 'expert') {
    const b = await body(req)
    const me = await authenticate(req, db, true, profileFrom(b))
    const code = str(b.code, 40).toUpperCase()
    const row = code ? await db.prepare('SELECT * FROM expert_codes WHERE code = ?').bind(code).first<{ title: string; used_by: string | null }>() : null
    if (!row || (row.used_by && row.used_by !== me!.id)) throw new FeedError(400, 'bad_code')
    await db.batch([
      db.prepare('UPDATE expert_codes SET used_by = ? WHERE code = ?').bind(me!.id, code),
      db.prepare('UPDATE authors SET expert = 1, expert_title = ? WHERE id = ?').bind(row.title, me!.id),
    ])
    return { expert: true, expertTitle: row.title }
  }

  // POST /feed/posts — 글쓰기
  if (m === 'POST' && seg[1] === 'posts' && !seg[2]) {
    const b = await body(req)
    const me = (await authenticate(req, db, true, profileFrom(b)))!
    const type = str(b.type, 12)
    if (!POST_TYPES.has(type)) throw new FeedError(400, 'bad_type')
    if (!OPEN_TYPES.has(type) && !me.expert) throw new FeedError(403, 'expert_only')
    const content = str(b.content, 2000)
    if (!content) throw new FeedError(400, 'empty')
    const rawImages = Array.isArray(b.images) ? b.images.slice(0, MAX_IMAGES) : []
    if (rawImages.length && !env.FEED_IMAGES) throw new FeedError(503, 'images_not_configured')
    const imageIds: string[] = []
    for (const img of rawImages) imageIds.push(await storeImage(env.FEED_IMAGES!, img))
    const tags = Array.isArray(b.tags) ? b.tags.filter((t): t is string => typeof t === 'string' && ID_RE.test(t)).slice(0, 8) : []
    const review = type === 'review' && b.review && typeof b.review === 'object' ? JSON.stringify(b.review).slice(0, 6000) : null
    // 장소 — 앱의 시설 id 모양(f-영문-숫자)만 받아요
    const facilityId = typeof b.facilityId === 'string' && /^f-[a-z0-9-]{1,60}$/.test(b.facilityId) ? b.facilityId : null
    const id = newId('post')
    const createdAt = now()
    await db.prepare(`INSERT INTO posts (id, author_id, type, title, content, images, cover_emoji, cover_gradient, tags, video, sport, review, facility_id, created_at)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, me.id, type, str(b.title, 60) || content.slice(0, 50), content, JSON.stringify(imageIds),
        optStr(b.coverEmoji, 8), optStr(b.coverGradient, 120), JSON.stringify(tags),
        optStr(b.video, 300), optStr(b.sport, 12), review, facilityId, createdAt).run()
    const row = await db.prepare(`SELECT p.*, a.name, a.emoji, a.expert, a.expert_title FROM posts p JOIN authors a ON a.id = p.author_id WHERE p.id = ?`).bind(id).first<PostRow>()
    return { post: toPost(row!, base, { comments: [], likes: 0, liked: false }) }
  }

  const postId = seg[1] === 'posts' ? seg[2] : undefined
  if (postId && !ID_RE.test(postId)) throw new FeedError(400, 'bad_id')

  // DELETE /feed/posts/:id
  if (m === 'DELETE' && postId && !seg[3]) {
    const me = (await authenticate(req, db, true))!
    const row = await db.prepare('SELECT author_id, images FROM posts WHERE id = ?').bind(postId).first<{ author_id: string; images: string }>()
    if (!row) return { ok: true }
    if (row.author_id !== me.id) throw new FeedError(403, 'not_yours')
    await db.batch([
      db.prepare('DELETE FROM posts WHERE id = ?').bind(postId),
      db.prepare('DELETE FROM comments WHERE post_id = ?').bind(postId),
      db.prepare('DELETE FROM likes WHERE post_id = ?').bind(postId),
    ])
    if (env.FEED_IMAGES) for (const img of parseJson<string[]>(row.images, [])) await env.FEED_IMAGES.delete(img)
    return { ok: true }
  }

  // PUT /feed/posts/:id/nutrition
  if (m === 'PUT' && postId && seg[3] === 'nutrition') {
    const b = await body(req)
    const me = (await authenticate(req, db, true))!
    const row = await db.prepare('SELECT author_id FROM posts WHERE id = ?').bind(postId).first<{ author_id: string }>()
    if (!row) throw new FeedError(404, 'not_found')
    if (row.author_id !== me.id) throw new FeedError(403, 'not_yours')
    const n = JSON.stringify(b.nutrition ?? null)
    if (n.length > 20000) throw new FeedError(413, 'too_large')
    await db.prepare('UPDATE posts SET nutrition = ? WHERE id = ?').bind(n, postId).run()
    return { ok: true }
  }

  // POST /feed/posts/:id/comments
  if (m === 'POST' && postId && seg[3] === 'comments') {
    const b = await body(req)
    const me = (await authenticate(req, db, true, profileFrom(b)))!
    const text = str(b.text, 500)
    if (!text) throw new FeedError(400, 'empty')
    const parentId = optStr(b.parentId, 64)
    if (parentId) {
      const parent = await db.prepare('SELECT post_id, parent_id FROM comments WHERE id = ?').bind(parentId).first<{ post_id: string; parent_id: string | null }>()
      if (!parent || parent.post_id !== postId || parent.parent_id) throw new FeedError(400, 'bad_parent')
    }
    const id = newId('cmt')
    const createdAt = now()
    const question = !parentId && b.question === true ? 1 : 0
    await db.prepare('INSERT INTO comments (id, post_id, parent_id, author_id, text, question, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, postId, parentId, me.id, text, question, createdAt).run()
    return {
      comment: toComment({ id, post_id: postId, parent_id: parentId, author_id: me.id, text, question, created_at: createdAt,
        name: me.name, emoji: me.emoji, expert: me.expert, expert_title: me.expert_title }),
      parentId,
    }
  }

  // DELETE /feed/comments/:id
  if (m === 'DELETE' && seg[1] === 'comments' && seg[2]) {
    const me = (await authenticate(req, db, true))!
    const row = await db.prepare('SELECT author_id FROM comments WHERE id = ?').bind(seg[2]).first<{ author_id: string }>()
    if (!row) return { ok: true }
    if (row.author_id !== me.id) throw new FeedError(403, 'not_yours')
    await db.batch([
      db.prepare('DELETE FROM comments WHERE id = ? OR parent_id = ?').bind(seg[2], seg[2]),
    ])
    return { ok: true }
  }

  // POST /feed/posts/:id/like
  if (m === 'POST' && postId && seg[3] === 'like') {
    const b = await body(req)
    const me = (await authenticate(req, db, true, profileFrom(b)))!
    const had = await db.prepare('SELECT 1 AS x FROM likes WHERE post_id = ? AND author_id = ?').bind(postId, me.id).first()
    if (had) await db.prepare('DELETE FROM likes WHERE post_id = ? AND author_id = ?').bind(postId, me.id).run()
    else await db.prepare('INSERT INTO likes (post_id, author_id) VALUES (?, ?)').bind(postId, me.id).run()
    const n = await db.prepare('SELECT COUNT(*) AS n FROM likes WHERE post_id = ?').bind(postId).first<{ n: number }>()
    return { liked: !had, likes: Number(n?.n ?? 0) }
  }

  throw new FeedError(404, 'not_found')
}
