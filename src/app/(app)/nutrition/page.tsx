'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  Search, ChevronDown, ChevronUp, Clock, Users, Flame, Sparkles,
  Heart, Trash2, ImagePlus, X, PenLine, Send,
} from 'lucide-react'
import { NUTRITION_DATA, type HealthMode } from '@/data/nutritionData'
import type { FoodItem, Recipe } from '@/data/nutritionData'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

// ── Community types & storage ─────────────────────────────────────────────

type PostType = 'recipe' | 'tip'

interface CommunityPost {
  id: string
  authorId: string
  authorName: string
  authorEmoji: string
  createdAt: string
  type: PostType
  title: string
  content: string
  image?: string
  tags: HealthMode[]
  likes: number
}

const POSTS_KEY  = 'ludia_community_v1'
const LIKES_KEY  = 'ludia_community_likes_v1'

const SEED_POSTS: CommunityPost[] = [
  {
    id: 'seed-1', authorId: 'seed', authorName: '민지맘', authorEmoji: '🌸',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    type: 'tip', tags: ['임신'],
    title: '임신 초기 입덧 줄이는 생강 레몬 물',
    content: '생강 3조각 + 레몬 1/4개 + 꿀 1작은술을 미지근한 물에 넣어 아침마다 마셨더니 입덧이 확연히 줄었어요. 생강은 항구역 성분이 있고 레몬 향이 메스꺼움을 완화해줘요. 꿀은 혈당 유지에도 도움이 되니 임신 초기에 강추!',
    likes: 24,
  },
  {
    id: 'seed-2', authorId: 'seed', authorName: '건강덕후', authorEmoji: '💪',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
    type: 'recipe', tags: ['다이어트'],
    title: '단백질 한 끼 해결! 두부 스크램블',
    content: '두부 반 모를 면포로 꽉 짜서 물기 제거 → 달군 팬에 올리브오일 약간 → 두부를 으깨며 강불로 볶기 → 달걀 1개, 소금, 후추 추가 → 30초만 더 볶으면 완성!\n\n칼로리: 약 180kcal / 단백질: 18g\n일반 스크램블보다 훨씬 든든하고 포만감이 오래가요.',
    likes: 41,
  },
  {
    id: 'seed-3', authorId: 'seed', authorName: '항암중이에요', authorEmoji: '💜',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    type: 'tip', tags: ['항암'],
    title: '항암 치료 중 입맛 없을 때 먹기 좋은 것들',
    content: '치료 후 며칠간 아무것도 못 먹다가 찾은 조합들을 공유해요.\n\n• 차가운 수박 주스 (속 시원하고 수분 보충)\n• 미지근한 녹차 두유 (비린내 없고 단백질 보충)\n• 냉동 바나나 스무디 (달콤하고 칼로리 있음)\n• 구운 고구마 (짜지 않고 소화 편함)\n\n맛을 느끼기 어려울 때는 신맛(레몬, 식초) 살짝 추가하면 입맛이 살아나요.',
    likes: 89,
  },
  {
    id: 'seed-4', authorId: 'seed', authorName: '50대언니', authorEmoji: '🌺',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    type: 'recipe', tags: ['갱년기'],
    title: '안면홍조에 진짜 효과 봤던 두유 스무디',
    content: '두유 200ml + 냉동 아마씨 1큰술 + 바나나 반 개 + 계피가루 약간 + 얼음 한 줌.\n블렌더에 30초만 갈면 끝!\n\n이소플라본 + 리그난 조합이라 약 먹는 것처럼 효과 있어요. 매일 아침 3주 먹었더니 안면홍조 횟수가 확실히 줄었고 수면도 나아진 것 같아요. 의사 선생님한테 말했더니 계속 드셔도 된다고 하셨어요.',
    likes: 67,
  },
]

function loadPosts(): CommunityPost[] {
  if (typeof window === 'undefined') return []
  try {
    const s = localStorage.getItem(POSTS_KEY)
    if (s) return JSON.parse(s)
    // seed on first load
    localStorage.setItem(POSTS_KEY, JSON.stringify(SEED_POSTS))
    return SEED_POSTS
  } catch { return [] }
}

function savePosts(posts: CommunityPost[]) {
  try { localStorage.setItem(POSTS_KEY, JSON.stringify(posts)) } catch {}
}

function loadLikedSet(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const s = localStorage.getItem(LIKES_KEY)
    return s ? new Set(JSON.parse(s) as string[]) : new Set()
  } catch { return new Set() }
}

function saveLikedSet(set: Set<string>) {
  try { localStorage.setItem(LIKES_KEY, JSON.stringify(Array.from(set))) } catch {}
}

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new window.Image()
      img.onload = () => {
        const MAX = 900
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.78))
      }
      img.onerror = reject
      img.src = e.target!.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const AUTHOR_EMOJIS = ['🌸','🌿','💪','✨','🦋','🌻','🍀','💜','🌺','🌙','⭐','🔥']

function randomEmoji() {
  return AUTHOR_EMOJIS[Math.floor(Math.random() * AUTHOR_EMOJIS.length)]
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  if (mins < 1)  return '방금'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7)  return `${days}일 전`
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

// ── Mode tab bar ──────────────────────────────────────────────────────────

function ModeTabs({ active, onChange }: { active: HealthMode; onChange: (m: HealthMode) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      {NUTRITION_DATA.map(({ mode, emoji, color }) => {
        const isActive = mode === active
        return (
          <button key={mode} onClick={() => onChange(mode)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-200"
            style={isActive
              ? { background: color, color: '#fff', boxShadow: `0 4px 12px ${color}40` }
              : { background: 'rgba(0,0,0,0.05)', color: '#64748b' }
            }>
            <span>{emoji}</span><span>{mode}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Nutrient cards ────────────────────────────────────────────────────────

function NutrientCards({ data }: { data: typeof NUTRITION_DATA[0] }) {
  return (
    <div>
      <h2 className="text-sm font-bold text-slate-700 mb-2.5">주요 영양소</h2>
      <div className="grid grid-cols-2 gap-2">
        {data.nutrients.map(n => (
          <div key={n.name} className="rounded-2xl p-3"
            style={{ background: data.bg, border: `1px solid ${data.border}` }}>
            <div className="flex items-start gap-2">
              <span className="text-xl leading-none">{n.emoji}</span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800">{n.name}</p>
                <p className="text-[11px] font-semibold mt-0.5" style={{ color: data.color }}>
                  {n.amount} {n.unit}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{n.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Food card ─────────────────────────────────────────────────────────────

function FoodCard({ food, accentColor, bg, border }: {
  food: FoodItem; accentColor: string; bg: string; border: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
      <button className="w-full text-left px-4 py-3 flex items-center gap-3" onClick={() => setOpen(o => !o)}>
        <span className="text-3xl leading-none">{food.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">{food.name}</span>
            {food.tag && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: bg, color: accentColor }}>
                {food.tag}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {food.highlights.map(h => (
              <span key={h} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">{h}</span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-xs font-bold text-slate-500">{food.calories} kcal</span>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3 border-t border-slate-100">
          <div className="mt-2.5 mb-2 rounded-xl p-2.5" style={{ background: bg, border: `1px solid ${border}` }}>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {food.nutrients.map(n => (
                <div key={n.name} className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500">{n.name}</span>
                  <span className="text-[10px] font-bold text-slate-700">{n.value}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">{food.benefit}</p>
        </div>
      )}
    </div>
  )
}

// ── Recipe card ───────────────────────────────────────────────────────────

function RecipeCard({ recipe, accentColor, bg, border }: {
  recipe: Recipe; accentColor: string; bg: string; border: string
}) {
  const [open, setOpen] = useState(false)
  const difficultyColor = recipe.difficulty === '쉬움' ? '#16a34a' : recipe.difficulty === '보통' ? '#d97706' : '#dc2626'

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
      <button className="w-full text-left px-4 py-3" onClick={() => setOpen(o => !o)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl leading-none">{recipe.emoji}</span>
            <div>
              <p className="text-sm font-bold text-slate-800">{recipe.name}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="flex items-center gap-0.5 text-[10px] text-slate-500"><Clock className="w-3 h-3" />{recipe.time}</span>
                <span className="flex items-center gap-0.5 text-[10px] text-slate-500"><Users className="w-3 h-3" />{recipe.servings}인분</span>
                <span className="flex items-center gap-0.5 text-[10px] text-slate-500"><Flame className="w-3 h-3" />{recipe.calories}kcal</span>
                <span className="text-[10px] font-semibold" style={{ color: difficultyColor }}>{recipe.difficulty}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: bg, color: accentColor }}>
              <Sparkles className="w-2.5 h-2.5 inline mr-0.5" />{recipe.keyNutrient}
            </span>
            {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>
      </button>
      {open && (
        <div className="border-t border-slate-100">
          <div className="px-4 pt-3 pb-2">
            <p className="text-xs font-bold text-slate-700 mb-2">재료</p>
            <div className="flex flex-wrap gap-1.5">
              {recipe.ingredients.map(ing => (
                <span key={ing} className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: bg, color: '#374151' }}>{ing}</span>
              ))}
            </div>
          </div>
          <div className="px-4 pb-3">
            <p className="text-xs font-bold text-slate-700 mb-2">조리법</p>
            <ol className="space-y-2">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: accentColor }}>{i + 1}</span>
                  <p className="text-[11px] text-slate-600 leading-relaxed pt-0.5">{step}</p>
                </li>
              ))}
            </ol>
            {recipe.tip && (
              <div className="mt-3 rounded-xl px-3 py-2" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                <p className="text-[11px] text-amber-700"><span className="font-bold">💡 Tip: </span>{recipe.tip}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Community post card ───────────────────────────────────────────────────

const MODE_META: Record<HealthMode, { color: string; bg: string; emoji: string }> = {
  임신:    { color: '#16a34a', bg: 'rgba(22,163,74,0.1)',   emoji: '🤰' },
  다이어트: { color: '#2563eb', bg: 'rgba(37,99,235,0.1)',   emoji: '🥗' },
  항암:    { color: '#7c3aed', bg: 'rgba(124,58,237,0.1)',  emoji: '💜' },
  갱년기:  { color: '#d97706', bg: 'rgba(217,119,6,0.1)',   emoji: '🌸' },
  일반:    { color: '#e11d5a', bg: 'rgba(225,29,90,0.1)',   emoji: '✨' },
}

function PostCard({
  post, currentUserId, liked, onLike, onDelete,
}: {
  post: CommunityPost
  currentUserId: string | undefined
  liked: boolean
  onLike: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isOwn = currentUserId && post.authorId === currentUserId
  const preview = post.content.slice(0, 120)
  const needsExpand = post.content.length > 120

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
            style={{ background: 'rgba(244,63,117,0.1)' }}>
            {post.authorEmoji}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700">{post.authorName}</p>
            <p className="text-[10px] text-slate-400">{timeAgo(post.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: post.type === 'recipe' ? 'rgba(234,179,8,0.15)' : 'rgba(59,130,246,0.12)', color: post.type === 'recipe' ? '#a16207' : '#1d4ed8' }}>
            {post.type === 'recipe' ? '🍳 레시피' : '💡 팁'}
          </span>
          {isOwn && (
            <button onClick={() => onDelete(post.id)}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-red-400 transition-colors" />
            </button>
          )}
        </div>
      </div>

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="px-4 pb-1.5 flex flex-wrap gap-1">
          {post.tags.map(tag => {
            const m = MODE_META[tag]
            return (
              <span key={tag} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: m.bg, color: m.color }}>
                {m.emoji} {tag}
              </span>
            )
          })}
        </div>
      )}

      {/* Title */}
      <div className="px-4 pb-1.5">
        <p className="text-sm font-bold text-slate-800 leading-snug">{post.title}</p>
      </div>

      {/* Content */}
      <div className="px-4 pb-2">
        <p className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-line">
          {expanded || !needsExpand ? post.content : preview + '…'}
        </p>
        {needsExpand && (
          <button onClick={() => setExpanded(o => !o)}
            className="text-[11px] font-semibold text-rose-400 mt-0.5">
            {expanded ? '접기' : '더보기'}
          </button>
        )}
      </div>

      {/* Image */}
      {post.image && (
        <div className="px-4 pb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.image} alt="첨부 이미지"
            className="w-full rounded-xl object-cover max-h-52" />
        </div>
      )}

      {/* Footer: like */}
      <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-1">
        <button onClick={() => onLike(post.id)}
          className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-200',
            liked ? 'text-rose-500' : 'text-slate-400 hover:text-rose-400')}
          style={liked ? { background: 'rgba(244,63,117,0.1)' } : {}}>
          <Heart className={cn('w-3.5 h-3.5 transition-all', liked && 'fill-rose-500')} />
          <span>{post.likes}</span>
        </button>
      </div>
    </div>
  )
}

// ── Write post modal ──────────────────────────────────────────────────────

function WriteModal({
  authorName,
  onClose,
  onSubmit,
}: {
  authorName: string
  onClose: () => void
  onSubmit: (draft: Omit<CommunityPost, 'id' | 'createdAt' | 'likes'>) => void
}) {
  const [title, setTitle]     = useState('')
  const [content, setContent] = useState('')
  const [type, setType]       = useState<PostType>('tip')
  const [tags, setTags]       = useState<HealthMode[]>([])
  const [image, setImage]     = useState<string | undefined>()
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const toggleTag = (m: HealthMode) =>
    setTags(prev => prev.includes(m) ? prev.filter(t => t !== m) : [...prev, m])

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try { setImage(await compressImage(file)) }
    finally { setUploading(false) }
  }

  const canSubmit = title.trim().length > 0 && content.trim().length > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit({
      authorId: 'me',
      authorName: authorName || '익명',
      authorEmoji: randomEmoji(),
      type,
      title: title.trim(),
      content: content.trim(),
      tags,
      image,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-lg rounded-t-3xl flex flex-col"
        style={{ background: '#fff', maxHeight: '92dvh' }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Top bar */}
        <div className="px-5 py-3 flex items-center justify-between flex-shrink-0 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">새 글 쓰기</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Post type */}
          <div>
            <p className="text-xs font-bold text-slate-600 mb-2">글 종류</p>
            <div className="flex gap-2">
              {(['recipe', 'tip'] as PostType[]).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border"
                  style={type === t
                    ? { background: t === 'recipe' ? '#fefce8' : '#eff6ff', borderColor: t === 'recipe' ? '#ca8a04' : '#2563eb', color: t === 'recipe' ? '#a16207' : '#1d4ed8' }
                    : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#94a3b8' }
                  }>
                  {t === 'recipe' ? '🍳 레시피' : '💡 팁 / 경험'}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <p className="text-xs font-bold text-slate-600 mb-2">건강 카테고리 <span className="font-normal text-slate-400">(복수 선택)</span></p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(MODE_META) as HealthMode[]).map(m => {
                const meta = MODE_META[m]
                const on = tags.includes(m)
                return (
                  <button key={m} onClick={() => toggleTag(m)}
                    className="px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 border"
                    style={on
                      ? { background: meta.bg, borderColor: meta.color, color: meta.color }
                      : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#94a3b8' }
                    }>
                    {meta.emoji} {m}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <p className="text-xs font-bold text-slate-600 mb-1.5">제목 <span className="text-rose-400">*</span></p>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={60}
              placeholder="레시피나 팁의 핵심을 한 줄로 표현해주세요"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Content */}
          <div>
            <p className="text-xs font-bold text-slate-600 mb-1.5">내용 <span className="text-rose-400">*</span></p>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={6}
              maxLength={1000}
              placeholder={type === 'recipe'
                ? '재료, 조리 순서, 칼로리 등을 자유롭게 적어주세요...'
                : '경험, 효과, 주의사항 등 유용한 정보를 공유해주세요...'}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-slate-800 placeholder-slate-400 resize-none leading-relaxed"
            />
            <p className="text-[10px] text-slate-400 text-right mt-0.5">{content.length} / 1000</p>
          </div>

          {/* Image */}
          <div>
            <p className="text-xs font-bold text-slate-600 mb-1.5">사진 <span className="font-normal text-slate-400">(선택)</span></p>
            {image ? (
              <div className="relative w-full rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="미리보기" className="w-full object-cover max-h-44" />
                <button onClick={() => setImage(undefined)}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full h-24 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-rose-300 hover:text-rose-400 transition-colors">
                <ImagePlus className="w-6 h-6" />
                <span className="text-xs">{uploading ? '업로드 중...' : '사진 추가'}</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
          </div>
        </div>

        {/* Submit */}
        <div className="px-5 py-4 flex-shrink-0 border-t border-slate-100 safe-bottom">
          <button onClick={handleSubmit} disabled={!canSubmit}
            className="w-full py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all duration-200"
            style={canSubmit
              ? { background: 'linear-gradient(135deg, #f43f75, #e11d5a)', boxShadow: '0 4px 16px rgba(244,63,117,0.35)' }
              : { background: '#e2e8f0', color: '#94a3b8' }
            }>
            <Send className="w-4 h-4" />
            게시하기
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Community section ─────────────────────────────────────────────────────

function CommunitySection({
  currentUserId,
  currentUserName,
  filterMode,
}: {
  currentUserId: string | undefined
  currentUserName: string
  filterMode: HealthMode | 'all'
}) {
  const [posts, setPosts]         = useState<CommunityPost[]>([])
  const [liked, setLiked]         = useState<Set<string>>(new Set())
  const [showWrite, setShowWrite]  = useState(false)
  const [tagFilter, setTagFilter]  = useState<HealthMode | 'all'>(filterMode)

  useEffect(() => {
    setPosts(loadPosts())
    setLiked(loadLikedSet())
  }, [])

  useEffect(() => {
    setTagFilter(filterMode)
  }, [filterMode])

  const displayed = useMemo(() => {
    const sorted = [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    if (tagFilter === 'all') return sorted
    return sorted.filter(p => p.tags.includes(tagFilter))
  }, [posts, tagFilter])

  const handleLike = useCallback((id: string) => {
    setLiked(prev => {
      const next = new Set(prev)
      const alreadyLiked = next.has(id)
      alreadyLiked ? next.delete(id) : next.add(id)
      saveLikedSet(next)
      setPosts(prevPosts => {
        const updated = prevPosts.map(p =>
          p.id === id ? { ...p, likes: p.likes + (alreadyLiked ? -1 : 1) } : p
        )
        savePosts(updated)
        return updated
      })
      return next
    })
  }, [])

  const handleDelete = useCallback((id: string) => {
    setPosts(prev => {
      const updated = prev.filter(p => p.id !== id)
      savePosts(updated)
      return updated
    })
  }, [])

  const handleSubmit = useCallback((draft: Omit<CommunityPost, 'id' | 'createdAt' | 'likes'>) => {
    const post: CommunityPost = {
      ...draft,
      id: `post-${Date.now()}`,
      createdAt: new Date().toISOString(),
      likes: 0,
    }
    setPosts(prev => {
      const updated = [post, ...prev]
      savePosts(updated)
      return updated
    })
    setShowWrite(false)
  }, [])

  const allModes = Object.keys(MODE_META) as HealthMode[]

  return (
    <>
      {/* Filter + write button */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 flex gap-1.5 overflow-x-auto scrollbar-hide">
          <button onClick={() => setTagFilter('all')}
            className="flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all duration-150"
            style={tagFilter === 'all'
              ? { background: '#1e293b', color: '#fff' }
              : { background: 'rgba(0,0,0,0.05)', color: '#64748b' }
            }>전체</button>
          {allModes.map(m => {
            const meta = MODE_META[m]
            const on = tagFilter === m
            return (
              <button key={m} onClick={() => setTagFilter(m)}
                className="flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all duration-150"
                style={on
                  ? { background: meta.color, color: '#fff' }
                  : { background: 'rgba(0,0,0,0.05)', color: '#64748b' }
                }>
                {meta.emoji} {m}
              </button>
            )
          })}
        </div>
        <button onClick={() => setShowWrite(true)}
          className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all"
          style={{ background: 'linear-gradient(135deg,#f43f75,#e11d5a)', boxShadow: '0 4px 12px rgba(244,63,117,0.3)' }}>
          <PenLine className="w-3.5 h-3.5" />글쓰기
        </button>
      </div>

      {/* Posts */}
      <div className="space-y-3">
        {displayed.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm text-slate-400">아직 게시글이 없어요.</p>
            <p className="text-xs text-slate-300 mt-1">첫 번째 레시피나 팁을 공유해보세요!</p>
          </div>
        ) : (
          displayed.map(post => (
            <PostCard key={post.id} post={post}
              currentUserId={currentUserId}
              liked={liked.has(post.id)}
              onLike={handleLike}
              onDelete={handleDelete} />
          ))
        )}
      </div>

      {showWrite && (
        <WriteModal
          authorName={currentUserName}
          onClose={() => setShowWrite(false)}
          onSubmit={handleSubmit}
        />
      )}
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────

type Section = 'foods' | 'recipes' | 'community'

export default function NutritionPage() {
  const { user } = useAuth()
  const [activeMode, setActiveMode] = useState<HealthMode>('일반')
  const [query,       setQuery]      = useState('')
  const [section,     setSection]    = useState<Section>('foods')

  const data = useMemo(() => NUTRITION_DATA.find(d => d.mode === activeMode)!, [activeMode])

  const filteredFoods = useMemo(() => {
    if (!query) return data.foods
    const q = query.toLowerCase()
    return data.foods.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.highlights.some(h => h.toLowerCase().includes(q)) ||
      f.benefit.toLowerCase().includes(q)
    )
  }, [data.foods, query])

  const filteredRecipes = useMemo(() => {
    if (!query) return data.recipes
    const q = query.toLowerCase()
    return data.recipes.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.keyNutrient.toLowerCase().includes(q) ||
      r.ingredients.some(i => i.toLowerCase().includes(q))
    )
  }, [data.recipes, query])

  const showModeContext = section !== 'community'

  return (
    <div className="min-h-screen pb-28 px-4 pt-4 max-w-lg mx-auto"
      style={{ background: 'linear-gradient(160deg,#fff5f8 0%,#f5f0ff 50%,#f0fff4 100%)' }}>

      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-800">건강 식단 & 레시피</h1>
        <p className="text-xs text-slate-400 mt-0.5">영양 정보, 레시피, 그리고 커뮤니티 팁</p>
      </div>

      {/* Mode tabs (only in foods/recipes) */}
      {showModeContext && (
        <div className="mb-4">
          <ModeTabs active={activeMode} onChange={m => { setActiveMode(m); setQuery('') }} />
        </div>
      )}

      {/* Mode description */}
      {showModeContext && (
        <div className="rounded-2xl px-4 py-3 mb-4 flex items-center gap-3"
          style={{ background: data.bg, border: `1px solid ${data.border}` }}>
          <span className="text-2xl">{data.emoji}</span>
          <div>
            <p className="text-sm font-bold" style={{ color: data.color }}>{data.mode} 모드</p>
            <p className="text-[11px] text-slate-600">{data.description}</p>
          </div>
        </div>
      )}

      {/* Nutrient cards */}
      {showModeContext && (
        <div className="mb-5">
          <NutrientCards data={data} />
        </div>
      )}

      {/* Search (not in community) */}
      {section !== 'community' && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="식품명, 영양소, 재료 검색..."
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-sm bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-slate-800 placeholder-slate-400"
          />
        </div>
      )}

      {/* Section toggle */}
      <div className="flex rounded-2xl overflow-hidden border mb-4"
        style={{ borderColor: data.border, background: data.bg }}>
        {([
          { key: 'foods',     label: `🥗 식품 (${filteredFoods.length})` },
          { key: 'recipes',   label: `👩‍🍳 레시피 (${filteredRecipes.length})` },
          { key: 'community', label: '💬 커뮤니티' },
        ] as { key: Section; label: string }[]).map(({ key, label }) => (
          <button key={key} onClick={() => setSection(key)}
            className="flex-1 py-2 text-xs font-semibold transition-all duration-200"
            style={section === key
              ? { background: data.color, color: '#fff' }
              : { color: '#64748b' }
            }>
            {label}
          </button>
        ))}
      </div>

      {/* Foods */}
      {section === 'foods' && (
        <div className="space-y-2.5">
          {filteredFoods.length === 0
            ? <div className="text-center py-10 text-slate-400 text-sm">검색 결과가 없습니다.</div>
            : filteredFoods.map(food => (
              <FoodCard key={food.id} food={food} accentColor={data.color} bg={data.bg} border={data.border} />
            ))}
        </div>
      )}

      {/* Recipes */}
      {section === 'recipes' && (
        <div className="space-y-2.5">
          {filteredRecipes.length === 0
            ? <div className="text-center py-10 text-slate-400 text-sm">검색 결과가 없습니다.</div>
            : filteredRecipes.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} accentColor={data.color} bg={data.bg} border={data.border} />
            ))}
        </div>
      )}

      {/* Community */}
      {section === 'community' && (
        <CommunitySection
          currentUserId={user?.userId}
          currentUserName={user?.nickname || user?.name || '나'}
          filterMode="all"
        />
      )}
    </div>
  )
}
