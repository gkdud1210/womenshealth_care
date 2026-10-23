'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, ChevronDown, Dumbbell, Salad, Users, Home, Plus, LayoutGrid, List, Search, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { CARE_CASES, type CareCase, type CareCaseId } from '@/data/careCases'
import { CARE_BODY_PARTS } from '@/data/careBodyParts'
import { CATEGORY_META } from '@/data/meetupData'
import { recommendedMeetupCategories } from '@/lib/care-recommend'
import {
  useFeed, AlbumGrid, PostCard, WriteModal, albumSectionsByPeriod, loadView, saveView,
  type FeedView, type SnsPost,
} from '@/components/feed/LudiaFeed'

const ALL_GRADIENT = 'linear-gradient(135deg,#f43f75,#a855f7)'
const ONLY_MINE_KEY = 'ludia_feed_only_mine_v1'

/** 피드 위 케어카드 버튼에 쓰는 이모지 */
const CARE_EMOJI: Record<CareCaseId, string> = {
  hair_scalp: '💇‍♀️', weight_metabolic: '⚖️', male_wellness: '💪', posture_correction: '🧘',
  gut_detox: '🥬', mental_brain: '🧠', hormone_female: '🌸', disease_postcare: '🩺',
  skin_beauty: '✨', musculoskeletal_lymph: '🦴', organ_monitoring: '🫀', senior_wellness: '🌳',
}

function accent(gradient: string) {
  return gradient.match(/#[0-9a-fA-F]{6}/)?.[0] ?? '#f43f75'
}

function isCareId(v: string | null): v is CareCaseId {
  return !!v && CARE_CASES.some(c => c.id === v)
}

// ── 케어카드 가이드: 부위별 관리법 ───────────────────────────────────────────

function CareGuide({ care }: { care: CareCase }) {
  const parts = CARE_BODY_PARTS[care.id]
  const [partId, setPartId] = useState(parts[0]?.id)
  const part = parts.find(p => p.id === partId) ?? parts[0]
  const color = accent(care.gradient)
  const meetup = recommendedMeetupCategories([care.id])[0]
  const Icon = care.icon

  // 다른 케어카드로 바꾸면 첫 부위부터
  useEffect(() => { setPartId(parts[0]?.id) }, [care.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const tips = [
    { key: 'exercise', label: '운동', Icon: Dumbbell, text: part.exercise },
    { key: 'diet', label: '식단', Icon: Salad, text: part.diet },
    { key: 'homecare', label: '홈케어', Icon: Home, text: part.homecare },
  ]

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      <div className="rounded-3xl p-4 mb-4 text-white" style={{ background: care.gradient, boxShadow: `0 8px 24px ${care.glow}` }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-white/20 flex-shrink-0">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[16px] font-bold leading-tight">{care.label}</p>
            <p className="text-[11.5px] text-white/85 mt-0.5 leading-snug">{care.desc}</p>
          </div>
        </div>
      </div>

      <p className="text-[12px] font-bold text-slate-500 mb-2 px-1">어느 부위가 고민이세요?</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {parts.map(p => {
          const on = p.id === part.id
          return (
            <button key={p.id} onClick={() => setPartId(p.id)}
              className={cn('flex flex-col items-center gap-1 py-3 px-1 rounded-2xl border transition-all active:scale-95',
                on ? 'bg-white shadow-md' : 'bg-white/70 border-slate-100')}
              style={on ? { borderColor: color } : undefined}>
              <span className="text-2xl leading-none">{p.emoji}</span>
              <span className="text-[12px] font-bold text-center leading-tight" style={{ color: on ? color : '#475569' }}>{p.label}</span>
            </button>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{part.emoji}</span>
          <p className="text-[15px] font-bold text-slate-900">{part.label} 케어</p>
        </div>
        <p className="text-[12.5px] text-slate-500 mb-3">{part.concern}</p>
        <div className="space-y-2">
          {tips.map(t => (
            <div key={t.key} className="flex gap-3 rounded-xl p-3" style={{ background: care.bg }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white">
                <t.Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold" style={{ color }}>{t.label}</p>
                <p className="text-[13px] text-slate-700 leading-snug">{t.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {meetup && (
        <Link href={`/community?category=${meetup}`}
          className="flex items-center gap-3 bg-white rounded-2xl shadow-sm px-4 py-3 hover:shadow-md transition-shadow">
          <Users className="w-5 h-5 text-rose-400" />
          <span className="flex-1 text-[13.5px] font-semibold text-slate-700">
            함께하는 {CATEGORY_META[meetup].emoji} {CATEGORY_META[meetup].label} 모임 찾기
          </span>
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </Link>
      )}

      <p className="text-[10.5px] text-slate-400 text-center mt-5 leading-relaxed">
        생활 속 웰니스 가이드예요. 통증이나 이상 증상이 계속되면 전문의와 상담하세요.
      </p>
    </div>
  )
}

// ── 루디아피드 화면: 처음엔 전체 피드, 위의 케어카드를 고르면 그 카드의 가이드 + 피드 ───

export default function CarePage() {
  const { user } = useAuth()
  const [openId, setOpenId] = useState<CareCaseId | null>(null)
  const [view, setView] = useState<FeedView>('list')
  const [openPostId, setOpenPostId] = useState<string | null>(null)
  const [showWrite, setShowWrite] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  // 펼친 목록에 내가 고른 케어카드만 보여줄지 (기기에 기억해요)
  const [onlyMine, setOnlyMine] = useState(true)
  const [query, setQuery] = useState('')
  const feed = useFeed()
  const myCare = useMemo(() => user?.careTypes ?? [], [user])

  // 내 케어카드를 앞에
  const cards = useMemo(() => [
    ...CARE_CASES.filter(c => myCare.includes(c.id)),
    ...CARE_CASES.filter(c => !myCare.includes(c.id)),
  ], [myCare])

  // ?id=weight_metabolic 로 바로 열기 + 뒤로가기 지원
  useEffect(() => {
    try { setOnlyMine(localStorage.getItem(ONLY_MINE_KEY) !== '0') } catch {}
    setView(loadView('list'))
    const sync = () => {
      const id = new URLSearchParams(window.location.search).get('id')
      setOpenId(isCareId(id) ? id : null)
    }
    sync()
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  function select(id: CareCaseId | null) {
    setPickerOpen(false)
    if (id === openId) return
    setOpenId(id)
    const url = id ? `${window.location.pathname}?id=${id}` : window.location.pathname
    window.history.pushState(null, '', url)
    window.scrollTo(0, 0)
  }

  function changeView(v: FeedView) { setView(v); saveView(v) }
  function changeOnlyMine(v: boolean) {
    setOnlyMine(v)
    try { localStorage.setItem(ONLY_MINE_KEY, v ? '1' : '0') } catch {}
  }

  const care = CARE_CASES.find(c => c.id === openId) ?? null
  // 검색어 — 제목·본문·글쓴이·운동 종목·케어카드 이름에서 찾아요 (띄어쓰기로 나눈 단어가 모두 들어 있어야 해요)
  const words = useMemo(() => query.trim().toLowerCase().split(/\s+/).filter(Boolean), [query])
  const posts: SnsPost[] = useMemo(() => feed.posts
    .filter(p => !care || p.tags.includes(care.id))
    .filter(p => {
      if (words.length === 0) return true
      const hay = [p.title, p.content, p.authorName, p.sport ?? '', p.type === 'exercise' ? '운동 자세' : '',
        ...p.tags.map(t => CARE_CASES.find(c => c.id === t)?.label ?? '')].join(' ').toLowerCase()
      return words.every(w => hay.includes(w))
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  [feed.posts, care, words])
  const openPost = feed.posts.find(p => p.id === openPostId) ?? null
  const gradient = care?.gradient ?? ALL_GRADIENT

  const postCard = (p: SnsPost, onDelete?: () => void) => (
    <PostCard key={p.id} post={p}
      liked={feed.liked.has(p.id)} saved={feed.saved.has(p.id)}
      currentUserId={feed.user?.userId}
      currentUserName={feed.authorName} currentUserEmoji={feed.authorEmoji}
      onLike={feed.handleLike} onSave={feed.handleSave}
      onDelete={id => { feed.handleDelete(id); onDelete?.() }} onAddComment={feed.handleAddComment}
      analyzing={feed.analyzingIds.has(p.id)} onAnalyze={feed.handleAnalyze} />
  )

  return (
    <div className="min-h-screen pb-24" style={{ background: '#fafafa' }}>
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100">
        <div className="px-4 pt-3 pb-2 max-w-lg mx-auto">
          <h1 className="font-display text-xl font-semibold text-slate-800 leading-tight">루디아피드</h1>
        </div>

        {/* 케어카드 고르기(접힘) + 검색 */}
        <div className="max-w-lg mx-auto flex items-center gap-2 px-4 pb-3">
          <button onClick={() => setPickerOpen(v => !v)} aria-expanded={pickerOpen}
            className="h-9 pl-3 pr-2.5 rounded-full flex items-center gap-1 text-[12.5px] font-bold flex-shrink-0 transition-colors"
            style={care
              ? { background: care.gradient, color: '#fff' }
              : { background: ALL_GRADIENT, color: '#fff' }}>
            {care ? <>{CARE_EMOJI[care.id]} <span className="max-w-[88px] truncate">{care.label.split(' ')[0]}</span></> : '전체'}
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', pickerOpen && 'rotate-180')} />
          </button>
          <label className="flex-1 min-w-0 h-9 flex items-center gap-1.5 px-3 rounded-full bg-slate-100 focus-within:ring-2 focus-within:ring-rose-200">
            <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="레시피·운동·팁 검색"
              aria-label="피드 검색"
              className="flex-1 min-w-0 bg-transparent border-0 p-0 text-[13px] text-slate-700 placeholder:text-slate-400 outline-none focus-visible:ring-0 focus-visible:ring-offset-0" />
            {query && (
              <button onClick={() => setQuery('')} aria-label="검색어 지우기" className="p-0.5 rounded-full">
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </label>
        </div>

        {pickerOpen && (() => {
          const showMine = onlyMine && myCare.length > 0
          const list = showMine ? cards.filter(c => myCare.includes(c.id) || c.id === openId) : cards
          return (
            <div className="max-w-lg mx-auto px-4 pb-3">
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex rounded-full bg-white border border-slate-200 p-0.5">
                    {([[true, `내 케어${myCare.length ? ` ${myCare.length}` : ''}`], [false, '모든 케어']] as const).map(([v, label]) => (
                      <button key={label} onClick={() => changeOnlyMine(v)} aria-pressed={onlyMine === v}
                        className="px-3 py-1 rounded-full text-[11.5px] font-bold transition-colors"
                        style={onlyMine === v ? { background: '#1e293b', color: '#fff' } : { color: '#64748b' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setPickerOpen(false)}
                    className="flex items-center gap-0.5 px-2 py-1 rounded-full text-[11.5px] font-bold text-slate-500 hover:bg-slate-200">
                    닫기 <X className="w-3 h-3" />
                  </button>
                </div>

                {onlyMine && myCare.length === 0 ? (
                  <div className="py-3 text-center">
                    <p className="text-[12.5px] text-slate-500">아직 고른 케어카드가 없어요</p>
                    <div className="flex justify-center gap-3 mt-1.5">
                      <button onClick={() => changeOnlyMine(false)} className="text-[12px] font-bold text-rose-500">모든 케어 보기</button>
                      <Link href="/settings" className="text-[12px] font-bold text-slate-500">설정에서 고르기</Link>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => select(null)} aria-pressed={!care}
                      className="h-9 px-3.5 rounded-full text-[12.5px] font-bold border transition-colors"
                      style={!care ? { background: ALL_GRADIENT, color: '#fff', borderColor: 'transparent' } : { color: '#475569', borderColor: '#e2e8f0', background: '#fff' }}>
                      전체 피드
                    </button>
                    {list.map(c => {
                      const on = c.id === openId
                      return (
                        <button key={c.id} onClick={() => select(c.id)} aria-pressed={on}
                          className="h-9 px-3 rounded-full flex items-center gap-1 text-[12.5px] font-bold border transition-all active:scale-95"
                          style={on
                            ? { background: c.gradient, color: '#fff', borderColor: 'transparent', boxShadow: `0 3px 10px ${c.glow}` }
                            : { background: '#fff', color: '#334155', borderColor: '#e2e8f0' }}>
                          <span className="text-[14px] leading-none">{CARE_EMOJI[c.id]}</span> {c.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })()}
      </div>

      {care && <CareGuide care={care} />}

      {/* 피드 */}
      <div className={cn('max-w-lg mx-auto', care && 'mt-4 bg-white border-t border-slate-100')}>
        <div className="flex items-center gap-2 px-4 pt-4 pb-1">
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-slate-900">{care ? `${care.label} 피드` : '전체 피드'}</p>
            <p className="text-[11.5px] text-slate-400">{words.length ? `'${query.trim()}' 검색 결과 ${posts.length}개` : `게시물 ${posts.length}개`}</p>
          </div>
          <div className="flex rounded-full bg-slate-100 p-0.5 flex-shrink-0">
            {([['list', List, '목록으로 보기'], ['album', LayoutGrid, '앨범으로 보기']] as const).map(([v, VIcon, label]) => (
              <button key={v} onClick={() => changeView(v)} aria-label={label}
                className={cn('p-1.5 rounded-full', view === v && 'bg-white shadow-sm')}>
                <VIcon className="w-3.5 h-3.5" style={{ color: view === v ? accent(gradient) : '#94a3b8' }} />
              </button>
            ))}
          </div>
          <button onClick={() => setShowWrite(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-bold text-white flex-shrink-0"
            style={{ background: gradient }}>
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> 글쓰기
          </button>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">{words.length ? '🔍' : '📷'}</p>
            <p className="text-[13px] text-slate-400">
              {words.length ? '검색어에 맞는 글이 없어요' : care ? '아직 이 케어카드에 올라온 글이 없어요' : '아직 올라온 글이 없어요'}
            </p>
            {words.length
              ? <button onClick={() => setQuery('')} className="mt-2 text-xs font-bold text-rose-500">검색어 지우기</button>
              : <button onClick={() => setShowWrite(true)} className="mt-2 text-xs font-bold text-rose-500">첫 글 남기기</button>}
          </div>
        ) : view === 'album' ? (
          <AlbumGrid sections={albumSectionsByPeriod(posts)} onOpen={setOpenPostId} />
        ) : (
          <div className="pt-2">{posts.map(p => postCard(p))}</div>
        )}
      </div>

      {openPost && (
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: '#fafafa' }}>
          <div className="sticky top-0 z-10 bg-white border-b border-slate-100">
            <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
              <button onClick={() => setOpenPostId(null)} className="p-1"><ArrowLeft className="w-5 h-5 text-slate-700" /></button>
              <p className="flex-1 text-[15px] font-bold text-slate-900 truncate">{openPost.title}</p>
            </div>
          </div>
          <div className="max-w-lg mx-auto pt-2 pb-24">
            {postCard(openPost, () => setOpenPostId(null))}
          </div>
        </div>
      )}

      {showWrite && (
        <WriteModal authorName={feed.authorName} authorEmoji={feed.authorEmoji} defaultTags={care ? [care.id] : []}
          onClose={() => setShowWrite(false)}
          onSubmit={draft => { feed.handleSubmit(draft); setShowWrite(false) }} />
      )}
    </div>
  )
}
