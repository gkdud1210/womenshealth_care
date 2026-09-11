'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Plus, X, Search, MapPin, Clock, Users, Heart, MessageCircle,
  Send, Camera, Wallet, ArrowLeft, Receipt, Sparkles,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import {
  ALL_CATEGORIES, CATEGORY_META, SEED_GROUPS, calcSubsidy, monthKeyOf,
  type MeetupCategory, type MeetupGroup, type MeetupPost, type SubsidyRequest,
} from '@/data/meetupData'

// ── Storage ────────────────────────────────────────────────────────────────

const GROUPS_KEY  = 'ludia_meetup_groups_v1'
const POSTS_KEY   = 'ludia_meetup_posts_v1'
const SUBSIDY_KEY = 'ludia_meetup_subsidy_v1'
const LIKES_KEY   = 'ludia_meetup_likes_v1'

function loadGroups(): MeetupGroup[] {
  if (typeof window === 'undefined') return SEED_GROUPS
  try {
    const s = localStorage.getItem(GROUPS_KEY)
    if (s) return JSON.parse(s)
    localStorage.setItem(GROUPS_KEY, JSON.stringify(SEED_GROUPS))
    return SEED_GROUPS
  } catch { return SEED_GROUPS }
}
function saveGroups(g: MeetupGroup[]) { try { localStorage.setItem(GROUPS_KEY, JSON.stringify(g)) } catch {} }

function loadPosts(): MeetupPost[] {
  if (typeof window === 'undefined') return []
  try { const s = localStorage.getItem(POSTS_KEY); return s ? JSON.parse(s) : [] } catch { return [] }
}
function savePosts(p: MeetupPost[]) { try { localStorage.setItem(POSTS_KEY, JSON.stringify(p)) } catch {} }

function loadSubsidy(): SubsidyRequest[] {
  if (typeof window === 'undefined') return []
  try { const s = localStorage.getItem(SUBSIDY_KEY); return s ? JSON.parse(s) : [] } catch { return [] }
}
function saveSubsidy(r: SubsidyRequest[]) { try { localStorage.setItem(SUBSIDY_KEY, JSON.stringify(r)) } catch {} }

function loadLikes(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try { const s = localStorage.getItem(LIKES_KEY); return s ? new Set(JSON.parse(s)) : new Set() } catch { return new Set() }
}
function saveLikes(s: Set<string>) { try { localStorage.setItem(LIKES_KEY, JSON.stringify(Array.from(s))) } catch {} }

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new window.Image()
      img.onload = () => {
        const MAX = 1080
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = reject
      img.src = e.target!.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime()
  const m = Math.floor(d / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const day = Math.floor(h / 24)
  if (day < 7) return `${day}일 전`
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

const AUTHOR_EMOJIS = ['🌸', '🌿', '💪', '✨', '🦋', '🌻', '🍀', '💜', '🌺', '🌙', '⭐', '🔥']

function fmtWon(n: number) { return `${n.toLocaleString()}원` }

// ── Category chip row ────────────────────────────────────────────────────

function CategoryChips({ value, onChange }: { value: MeetupCategory | 'all'; onChange: (c: MeetupCategory | 'all') => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-3">
      <button onClick={() => onChange('all')}
        className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all"
        style={value === 'all'
          ? { background: '#1e293b', borderColor: '#1e293b', color: '#fff' }
          : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#94a3b8' }}>
        🏠 전체
      </button>
      {ALL_CATEGORIES.map(c => {
        const meta = CATEGORY_META[c]
        const on = value === c
        return (
          <button key={c} onClick={() => onChange(c)}
            className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all"
            style={on
              ? { background: meta.bg, borderColor: meta.color, color: meta.color }
              : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#94a3b8' }}>
            {meta.emoji} {meta.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Group card ─────────────────────────────────────────────────────────────

function GroupCard({ group, joined, onOpen }: { group: MeetupGroup; joined: boolean; onOpen: () => void }) {
  const meta = CATEGORY_META[group.category]
  return (
    <button onClick={onOpen}
      className="w-full bg-white rounded-2xl shadow-sm p-4 flex gap-3.5 text-left mb-2.5 hover:shadow-md transition-shadow">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
        style={{ background: meta.gradient }}>
        {meta.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <h3 className="text-[15px] font-bold text-slate-900 truncate">{group.name}</h3>
          {joined && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: 'rgba(244,63,117,0.12)', color: '#e11d5a' }}>참여중</span>
          )}
        </div>
        <p className="text-[12.5px] text-slate-500 line-clamp-2 leading-snug mb-1.5">{group.description}</p>
        <div className="flex items-center gap-2.5 flex-wrap text-[11px] text-slate-400">
          <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{group.location}</span>
          <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{group.schedule}</span>
          <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{group.memberIds.length}/{group.maxMembers}</span>
        </div>
        <div className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: meta.bg, color: meta.color }}>
          <Wallet className="w-3 h-3" /> 활동비 {meta.subsidy.percent}% 지원 · 월 최대 {fmtWon(meta.subsidy.capPerMonth)}
        </div>
      </div>
    </button>
  )
}

// ── Create group modal ──────────────────────────────────────────────────────

function CreateGroupModal({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (draft: { name: string; category: MeetupCategory; description: string; location: string; schedule: string; maxMembers: number }) => void
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<MeetupCategory>('badminton')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [schedule, setSchedule] = useState('')
  const [maxMembers, setMaxMembers] = useState(10)

  const canSubmit = name.trim().length > 0 && description.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#fff' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <button onClick={onClose} className="p-1"><X className="w-6 h-6 text-slate-600" /></button>
        <p className="text-base font-bold text-slate-800">새 모임 만들기</p>
        <button disabled={!canSubmit}
          onClick={() => onCreate({ name: name.trim(), category, description: description.trim(), location: location.trim() || '미정', schedule: schedule.trim() || '미정', maxMembers })}
          className="text-sm font-bold text-rose-500 disabled:text-slate-300">만들기</button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        <div>
          <p className="text-xs font-bold text-slate-500 mb-2">카테고리</p>
          <div className="flex flex-wrap gap-2">
            {ALL_CATEGORIES.map(c => {
              const meta = CATEGORY_META[c]
              const on = category === c
              return (
                <button key={c} onClick={() => setCategory(c)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                  style={on ? { background: meta.bg, borderColor: meta.color, color: meta.color } : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#94a3b8' }}>
                  {meta.emoji} {meta.label}
                </button>
              )
            })}
          </div>
          <div className="mt-2 text-[11px] rounded-xl p-2.5" style={{ background: CATEGORY_META[category].bg, color: CATEGORY_META[category].color }}>
            🎁 이 카테고리는 {CATEGORY_META[category].subsidy.eligibleItems}에 대해 결제금액의 <b>{CATEGORY_META[category].subsidy.percent}%</b>를
            월 최대 <b>{fmtWon(CATEGORY_META[category].subsidy.capPerMonth)}</b>까지 지원받을 수 있어요.
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-500 mb-1.5">모임 이름</p>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={30}
            placeholder="예) 주말 배드민턴 클럽"
            className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 outline-none focus:border-rose-300 text-slate-800" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-500 mb-1.5">소개</p>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} maxLength={300}
            placeholder="어떤 모임인지 소개해주세요"
            className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 outline-none focus:border-rose-300 resize-none text-slate-800" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1.5">장소</p>
            <input value={location} onChange={e => setLocation(e.target.value)} maxLength={40}
              placeholder="예) 서울 강남구"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 outline-none focus:border-rose-300 text-slate-800" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1.5">일정</p>
            <input value={schedule} onChange={e => setSchedule(e.target.value)} maxLength={30}
              placeholder="예) 매주 토 09:00"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 outline-none focus:border-rose-300 text-slate-800" />
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-500 mb-1.5">최대 인원</p>
          <input type="number" min={2} max={100} value={maxMembers}
            onChange={e => setMaxMembers(Math.max(2, Math.min(100, Number(e.target.value) || 2)))}
            className="w-24 px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 outline-none focus:border-rose-300 text-slate-800" />
          <span className="ml-2 text-xs text-slate-400">명</span>
        </div>
      </div>
    </div>
  )
}

// ── Activity post + expense modal ───────────────────────────────────────────

function ActivityModal({ group, remainingCap, onClose, onSubmit }: {
  group: MeetupGroup
  remainingCap: number
  onClose: () => void
  onSubmit: (content: string, image: string | undefined, expense: { item: string; amount: number } | null) => void
}) {
  const meta = CATEGORY_META[group.category]
  const [content, setContent] = useState('')
  const [image, setImage] = useState<string | undefined>()
  const [uploading, setUploading] = useState(false)
  const [addExpense, setAddExpense] = useState(false)
  const [item, setItem] = useState('')
  const [amount, setAmount] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const amountNum = Number(amount.replace(/[^0-9]/g, '')) || 0
  const previewSubsidy = addExpense ? calcSubsidy(group.category, amountNum, meta.subsidy.capPerMonth - remainingCap) : 0

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try { setImage(await compressImage(file)) } finally { setUploading(false); e.target.value = '' }
  }

  function submit() {
    if (!content.trim()) return
    onSubmit(content.trim(), image, addExpense && amountNum > 0 && item.trim() ? { item: item.trim(), amount: amountNum } : null)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#fff' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <button onClick={onClose} className="p-1"><X className="w-6 h-6 text-slate-600" /></button>
        <p className="text-base font-bold text-slate-800">활동 인증하기</p>
        <button onClick={submit} disabled={!content.trim()} className="text-sm font-bold text-rose-500 disabled:text-slate-300">공유</button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <textarea value={content} onChange={e => setContent(e.target.value)} rows={5} maxLength={1000}
          placeholder={`${group.name}에서의 활동을 공유해보세요 (예: 오늘 코트 대관해서 2시간 쳤어요!)`}
          className="w-full text-sm text-slate-800 placeholder-slate-400 outline-none resize-none leading-relaxed" />

        {image ? (
          <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="w-full h-full object-cover" />
            <button onClick={() => setImage(undefined)} className="absolute top-2 right-2 w-7 h-7 bg-black/55 rounded-full flex items-center justify-center">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()}
            className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-rose-400"
            style={{ background: 'linear-gradient(135deg,#fdf2f8,#f5f0ff)', border: '1.5px dashed rgba(244,63,117,0.3)' }}>
            {uploading ? <div className="w-4 h-4 rounded-full border-2 border-rose-300 border-t-rose-500 animate-spin" /> : <Camera className="w-4 h-4" />}
            사진 추가 (선택)
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        <div className="rounded-2xl p-3.5" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <button onClick={() => setAddExpense(v => !v)} className="w-full flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
              <Receipt className="w-4 h-4 text-rose-400" /> 지출 등록하고 지원금 받기
            </span>
            <div className={cn('w-9 h-5 rounded-full transition-colors relative', addExpense ? 'bg-rose-400' : 'bg-slate-300')}>
              <div className={cn('w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all', addExpense ? 'left-4.5' : 'left-0.5')}
                style={{ left: addExpense ? 18 : 2 }} />
            </div>
          </button>
          {addExpense && (
            <div className="mt-3 space-y-2.5">
              <p className="text-[11px] text-slate-400">지원 대상: {meta.subsidy.eligibleItems}</p>
              <input value={item} onChange={e => setItem(e.target.value)} maxLength={40}
                placeholder="지출 항목 (예: 코트 대관료)"
                className="w-full px-3 py-2 rounded-lg text-sm bg-white border border-slate-200 outline-none focus:border-rose-300 text-slate-800" />
              <input value={amount} onChange={e => setAmount(e.target.value)} inputMode="numeric"
                placeholder="결제 금액 (원)"
                className="w-full px-3 py-2 rounded-lg text-sm bg-white border border-slate-200 outline-none focus:border-rose-300 text-slate-800" />
              {amountNum > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg" style={{ background: meta.bg, color: meta.color }}>
                  <Sparkles className="w-3.5 h-3.5" />
                  예상 지원금 {fmtWon(previewSubsidy)}
                  {previewSubsidy < Math.floor(amountNum * meta.subsidy.percent / 100) && (
                    <span className="font-medium"> (이번 달 잔여 한도 {fmtWon(remainingCap)} 반영)</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Activity feed card ───────────────────────────────────────────────────────

function ActivityCard({ post, liked, isOwn, onLike, onComment }: {
  post: MeetupPost; liked: boolean; isOwn: boolean
  onLike: (id: string) => void
  onComment: (id: string, text: string) => void
}) {
  const [showComments, setShowComments] = useState(false)
  const [text, setText] = useState('')

  return (
    <article className="bg-white rounded-2xl shadow-sm p-4 mb-2.5">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ background: 'rgba(244,63,117,0.1)' }}>
          {post.authorEmoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-bold text-slate-900 truncate">{post.authorName}{isOwn && <span className="text-slate-400 font-normal"> (나)</span>}</p>
          <p className="text-[11px] text-slate-400">{timeAgo(post.createdAt)}</p>
        </div>
      </div>
      <p className="text-[14px] text-slate-800 leading-relaxed whitespace-pre-line mb-2.5">{post.content}</p>
      {post.image && (
        <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-100 mb-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.image} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex items-center gap-2 text-[13px] mb-1">
        <button onClick={() => onLike(post.id)} className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-full transition-all active:scale-95', liked ? 'text-rose-500' : 'text-slate-500 hover:bg-slate-50')}>
          <Heart className="w-4 h-4" style={liked ? { fill: '#f43f75' } : undefined} /> {post.likes}
        </button>
        <button onClick={() => setShowComments(v => !v)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-slate-500 hover:bg-slate-50">
          <MessageCircle className="w-4 h-4" /> {post.comments.length}
        </button>
      </div>
      {showComments && (
        <div className="mt-2 pt-2.5 border-t border-slate-100 space-y-2">
          {post.comments.map(c => (
            <div key={c.id} className="flex gap-2">
              <span className="text-sm">{c.authorEmoji}</span>
              <div className="flex-1 bg-slate-50 rounded-xl px-3 py-1.5">
                <p className="text-[11.5px] font-bold text-slate-800">{c.authorName}</p>
                <p className="text-[12.5px] text-slate-700">{c.text}</p>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <input value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && text.trim()) { onComment(post.id, text.trim()); setText('') } }}
              placeholder="댓글 달기..." className="flex-1 text-[12.5px] bg-slate-50 rounded-full px-3 py-1.5 outline-none text-slate-800" />
            {text.trim() && (
              <button onClick={() => { onComment(post.id, text.trim()); setText('') }}><Send className="w-4 h-4 text-rose-400" /></button>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

// ── Group detail view ────────────────────────────────────────────────────────

function GroupDetail({
  group, posts, liked, joined, currentUserId, currentUserName, currentUserEmoji, remainingCap,
  onBack, onJoinToggle, onSubmitActivity, onLike, onComment,
}: {
  group: MeetupGroup; posts: MeetupPost[]; liked: Set<string>; joined: boolean
  currentUserId: string; currentUserName: string; currentUserEmoji: string
  remainingCap: number
  onBack: () => void
  onJoinToggle: () => void
  onSubmitActivity: (content: string, image: string | undefined, expense: { item: string; amount: number } | null) => void
  onLike: (id: string) => void
  onComment: (postId: string, text: string) => void
}) {
  const meta = CATEGORY_META[group.category]
  const [showActivity, setShowActivity] = useState(false)
  const feed = posts.filter(p => p.groupId === group.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto" style={{ background: '#fafafa' }}>
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 flex items-center gap-3 px-4 py-3">
        <button onClick={onBack} className="p-1"><ArrowLeft className="w-5 h-5 text-slate-700" /></button>
        <h2 className="flex-1 text-[15px] font-bold text-slate-900 truncate">{group.name}</h2>
        <button onClick={onJoinToggle}
          className="text-xs font-bold px-3.5 py-1.5 rounded-full transition-colors flex-shrink-0"
          style={joined ? { background: '#f1f5f9', color: '#64748b' } : { background: '#f43f75', color: '#fff' }}>
          {joined ? '참여중' : '참여하기'}
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: meta.gradient }}>{meta.emoji}</div>
            <div>
              <p className="text-[15px] font-bold text-slate-900">{group.name}</p>
              <p className="text-[11.5px] text-slate-400">{meta.label} · {group.createdByName}님 개설</p>
            </div>
          </div>
          <p className="text-[13px] text-slate-600 leading-relaxed mb-3">{group.description}</p>
          <div className="flex flex-wrap gap-3 text-[12px] text-slate-500 mb-3">
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{group.location}</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{group.schedule}</span>
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{group.memberIds.length}/{group.maxMembers}명</span>
          </div>
          <div className="rounded-xl p-3 text-[12px] leading-relaxed" style={{ background: meta.bg, color: meta.color }}>
            🎁 <b>{meta.subsidy.eligibleItems}</b>에 대해 결제금액의 <b>{meta.subsidy.percent}%</b>를 월 최대 <b>{fmtWon(meta.subsidy.capPerMonth)}</b>까지 지원해요.
            <br />이번 달 잔여 한도: <b>{fmtWon(remainingCap)}</b>
          </div>
        </div>

        <button onClick={() => setShowActivity(true)}
          className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-white mb-3 shadow-sm"
          style={{ background: 'linear-gradient(135deg,#f43f75,#e11d5a)' }}>
          <Plus className="w-4 h-4" /> 활동 인증하기
        </button>

        {feed.length === 0 ? (
          <div className="text-center py-14">
            <p className="text-4xl mb-2">🙌</p>
            <p className="text-sm text-slate-400">아직 활동 인증이 없어요. 첫 인증을 남겨보세요!</p>
          </div>
        ) : (
          feed.map(post => (
            <ActivityCard key={post.id} post={post} liked={liked.has(post.id)} isOwn={post.authorId === currentUserId}
              onLike={onLike} onComment={onComment} />
          ))
        )}
      </div>

      {showActivity && (
        <ActivityModal group={group} remainingCap={remainingCap}
          onClose={() => setShowActivity(false)}
          onSubmit={(content, image, expense) => { onSubmitActivity(content, image, expense); setShowActivity(false) }} />
      )}
    </div>
  )
}

// ── My subsidy tab ───────────────────────────────────────────────────────────

function MySubsidyTab({ requests, currentUserId }: { requests: SubsidyRequest[]; currentUserId: string }) {
  const nowKey = monthKeyOf(new Date())
  const mine = requests.filter(r => r.userId === currentUserId)
  const thisMonth = mine.filter(r => r.monthKey === nowKey)
  const totalThisMonth = thisMonth.reduce((s, r) => s + r.subsidyAmount, 0)

  const usedByCategory = useMemo(() => {
    const map = new Map<MeetupCategory, number>()
    thisMonth.forEach(r => map.set(r.category, (map.get(r.category) ?? 0) + r.subsidyAmount))
    return map
  }, [thisMonth])

  const activeCategories = ALL_CATEGORIES.filter(c => usedByCategory.has(c))

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <div className="rounded-2xl p-5 mb-4 text-white" style={{ background: 'linear-gradient(135deg,#f43f75,#a855f7)' }}>
        <p className="text-xs font-semibold opacity-85 mb-1">이번 달 총 지원금</p>
        <p className="text-3xl font-black">{fmtWon(totalThisMonth)}</p>
      </div>

      {activeCategories.length > 0 && (
        <div className="space-y-2.5 mb-5">
          {activeCategories.map(c => {
            const meta = CATEGORY_META[c]
            const used = usedByCategory.get(c) ?? 0
            const pct = Math.min(100, Math.round((used / meta.subsidy.capPerMonth) * 100))
            return (
              <div key={c} className="bg-white rounded-xl p-3.5 shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13px] font-bold text-slate-700">{meta.emoji} {meta.label}</span>
                  <span className="text-[12px] font-semibold" style={{ color: meta.color }}>{fmtWon(used)} / {fmtWon(meta.subsidy.capPerMonth)}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: meta.color }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs font-bold text-slate-500 mb-2">지원금 신청 내역</p>
      {mine.length === 0 ? (
        <div className="text-center py-14">
          <p className="text-4xl mb-2">💌</p>
          <p className="text-sm text-slate-400">모임에서 활동 인증 시 지출을 등록하면{'\n'}지원금을 받을 수 있어요</p>
        </div>
      ) : (
        <div className="space-y-2">
          {mine.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(r => {
            const meta = CATEGORY_META[r.category]
            return (
              <div key={r.id} className="bg-white rounded-xl p-3.5 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: meta.bg }}>{meta.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-slate-800 truncate">{r.itemDescription}</p>
                  <p className="text-[11px] text-slate-400 truncate">{r.groupName} · {timeAgo(r.createdAt)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[13.5px] font-black" style={{ color: meta.color }}>+{fmtWon(r.subsidyAmount)}</p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: r.status === '지급완료' ? 'rgba(22,163,74,0.1)' : 'rgba(148,163,184,0.15)', color: r.status === '지급완료' ? '#16a34a' : '#64748b' }}>
                    {r.status}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<MeetupGroup[]>([])
  const [posts, setPosts] = useState<MeetupPost[]>([])
  const [subsidy, setSubsidy] = useState<SubsidyRequest[]>([])
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<'groups' | 'mySubsidy'>('groups')
  const [categoryFilter, setCategoryFilter] = useState<MeetupCategory | 'all'>('all')
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [openGroupId, setOpenGroupId] = useState<string | null>(null)

  const currentUserId = user?.userId ?? 'me'
  const currentUserName = user?.nickname || user?.name || '나'
  const currentUserEmoji = AUTHOR_EMOJIS[Math.abs(currentUserName.charCodeAt(0)) % AUTHOR_EMOJIS.length]

  useEffect(() => {
    setGroups(loadGroups())
    setPosts(loadPosts())
    setSubsidy(loadSubsidy())
    setLiked(loadLikes())
  }, [])

  const filteredGroups = groups
    .filter(g => categoryFilter === 'all' || g.category === categoryFilter)
    .filter(g => !query.trim() || g.name.toLowerCase().includes(query.trim().toLowerCase()) || g.description.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const openGroup = groups.find(g => g.id === openGroupId) ?? null

  const remainingCapFor = useCallback((category: MeetupCategory) => {
    const nowKey = monthKeyOf(new Date())
    const usedThisMonth = subsidy.filter(r => r.userId === currentUserId && r.category === category && r.monthKey === nowKey)
      .reduce((s, r) => s + r.subsidyAmount, 0)
    return Math.max(0, CATEGORY_META[category].subsidy.capPerMonth - usedThisMonth)
  }, [subsidy, currentUserId])

  const handleCreateGroup = useCallback((draft: { name: string; category: MeetupCategory; description: string; location: string; schedule: string; maxMembers: number }) => {
    const group: MeetupGroup = {
      id: `g-${Date.now()}`, ...draft,
      memberIds: [currentUserId], createdBy: currentUserId, createdByName: currentUserName,
      createdAt: new Date().toISOString(),
    }
    setGroups(prev => { const u = [group, ...prev]; saveGroups(u); return u })
    setShowCreate(false)
    setOpenGroupId(group.id)
  }, [currentUserId, currentUserName])

  const handleJoinToggle = useCallback((groupId: string) => {
    setGroups(prev => {
      const u = prev.map(g => {
        if (g.id !== groupId) return g
        const isMember = g.memberIds.includes(currentUserId)
        return { ...g, memberIds: isMember ? g.memberIds.filter(id => id !== currentUserId) : [...g.memberIds, currentUserId] }
      })
      saveGroups(u); return u
    })
  }, [currentUserId])

  const handleSubmitActivity = useCallback((groupId: string, content: string, image: string | undefined, expense: { item: string; amount: number } | null) => {
    const group = groups.find(g => g.id === groupId)
    if (!group) return
    const postId = `post-${Date.now()}`
    let subsidyRequestId: string | undefined

    if (expense) {
      const nowKey = monthKeyOf(new Date())
      const usedThisMonth = subsidy.filter(r => r.userId === currentUserId && r.category === group.category && r.monthKey === nowKey)
        .reduce((s, r) => s + r.subsidyAmount, 0)
      const subsidyAmount = calcSubsidy(group.category, expense.amount, usedThisMonth)
      const req: SubsidyRequest = {
        id: `sub-${Date.now()}`, userId: currentUserId, userName: currentUserName,
        groupId, groupName: group.name, category: group.category,
        itemDescription: expense.item, amountSpent: expense.amount, subsidyAmount,
        monthKey: nowKey, status: '지급예정', createdAt: new Date().toISOString(),
      }
      subsidyRequestId = req.id
      setSubsidy(prev => { const u = [req, ...prev]; saveSubsidy(u); return u })
    }

    const post: MeetupPost = {
      id: postId, groupId, authorId: currentUserId, authorName: currentUserName, authorEmoji: currentUserEmoji,
      content, image, createdAt: new Date().toISOString(), likes: 0, comments: [], subsidyRequestId,
    }
    setPosts(prev => { const u = [post, ...prev]; savePosts(u); return u })
  }, [groups, subsidy, currentUserId, currentUserName, currentUserEmoji])

  const handleLike = useCallback((postId: string) => {
    setLiked(prev => {
      const next = new Set(prev)
      const was = next.has(postId)
      was ? next.delete(postId) : next.add(postId)
      saveLikes(next)
      setPosts(prevP => { const u = prevP.map(p => p.id === postId ? { ...p, likes: p.likes + (was ? -1 : 1) } : p); savePosts(u); return u })
      return next
    })
  }, [])

  const handleComment = useCallback((postId: string, text: string) => {
    setPosts(prev => {
      const u = prev.map(p => p.id === postId ? {
        ...p, comments: [...p.comments, { id: `c-${Date.now()}`, authorName: currentUserName, authorEmoji: currentUserEmoji, text, createdAt: new Date().toISOString() }],
      } : p)
      savePosts(u); return u
    })
  }, [currentUserName, currentUserEmoji])

  return (
    <div className="min-h-screen pb-24" style={{ background: '#fafafa' }}>
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div>
            <h1 className="font-display text-xl font-semibold text-slate-800 leading-tight">루디아 모임</h1>
            <p className="text-[11.5px] text-slate-400">함께 움직이고, 활동비도 지원받아요</p>
          </div>
          {tab === 'groups' && (
            <button onClick={() => setShowCreate(true)} className="p-1.5 rounded-full hover:bg-slate-50 transition-colors">
              <Plus className="w-6 h-6 text-slate-800" strokeWidth={2.5} />
            </button>
          )}
        </div>

        <div className="flex px-4 max-w-lg mx-auto border-b border-slate-100">
          {([{ key: 'groups', label: '모임' }, { key: 'mySubsidy', label: '내 지원금' }] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex-1 py-2.5 text-sm font-bold relative"
              style={{ color: tab === t.key ? '#e11d5a' : '#94a3b8' }}>
              {t.label}
              {tab === t.key && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full" style={{ background: '#e11d5a' }} />}
            </button>
          ))}
        </div>

        {tab === 'groups' && (
          <>
            <div className="px-4 pt-3 pb-1 max-w-lg mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="모임 검색..."
                  className="w-full pl-9 pr-9 py-2 rounded-2xl text-sm bg-slate-100 border-none outline-none placeholder-slate-400 text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-200 transition-all" />
                {query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-slate-400" /></button>}
              </div>
            </div>
            <CategoryChips value={categoryFilter} onChange={setCategoryFilter} />
          </>
        )}
      </div>

      {tab === 'groups' ? (
        <div className="max-w-lg mx-auto px-4 py-3">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-sm text-slate-400 font-medium">조건에 맞는 모임이 없어요</p>
              <p className="text-xs text-slate-300 mt-1">+ 버튼으로 새 모임을 만들어보세요!</p>
            </div>
          ) : (
            filteredGroups.map(g => (
              <GroupCard key={g.id} group={g} joined={g.memberIds.includes(currentUserId)} onOpen={() => setOpenGroupId(g.id)} />
            ))
          )}
        </div>
      ) : (
        <MySubsidyTab requests={subsidy} currentUserId={currentUserId} />
      )}

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} onCreate={handleCreateGroup} />}

      {openGroup && (
        <GroupDetail
          group={openGroup}
          posts={posts}
          liked={liked}
          joined={openGroup.memberIds.includes(currentUserId)}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserEmoji={currentUserEmoji}
          remainingCap={remainingCapFor(openGroup.category)}
          onBack={() => setOpenGroupId(null)}
          onJoinToggle={() => handleJoinToggle(openGroup.id)}
          onSubmitActivity={(content, image, expense) => handleSubmitActivity(openGroup.id, content, image, expense)}
          onLike={handleLike}
          onComment={handleComment}
        />
      )}
    </div>
  )
}
