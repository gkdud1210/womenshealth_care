'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Plus, X, Search, MapPin, Clock, Users, Heart, MessageCircle,
  Send, Camera, ArrowLeft, Globe, ChevronRight, Check, Languages,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import {
  ALL_CATEGORIES, CATEGORY_META, SEED_GROUPS, LANGUAGE_OPTIONS, isMeetupCategory, normalizeGroup,
  type MeetupCategory, type MeetupGroup, type MeetupPost, type MeetupLanguage, type MeetupPlace,
} from '@/data/meetupData'
import {
  ANY, ONLINE_CODE, COUNTRIES_BY_CONTINENT,
  getCountry, getRegion, getCity, placeLabel, searchPlaces,
  type Country, type Region, type PlaceRef,
} from '@/data/regionData'

// ── Storage ────────────────────────────────────────────────────────────────

const GROUPS_KEY    = 'ludia_meetup_groups_v2'
const GROUPS_KEY_V1 = 'ludia_meetup_groups_v1'
const POSTS_KEY     = 'ludia_meetup_posts_v1'
const LIKES_KEY     = 'ludia_meetup_likes_v1'
const HOME_KEY      = 'ludia_meetup_home_place_v1'

/** v1(국내 전용 문자열 주소)로 저장된 모임을 새 구조로 옮겨와요. */
function migrateFromV1(): MeetupGroup[] | null {
  try {
    const old = localStorage.getItem(GROUPS_KEY_V1)
    if (!old) return null
    const parsed = JSON.parse(old)
    if (!Array.isArray(parsed)) return null
    const migrated = parsed.map(normalizeGroup).filter((g): g is MeetupGroup => g !== null)
    const seedById = new Map(SEED_GROUPS.map(g => [g.id, g]))
    // 기본 제공 모임은 새 버전으로 교체하되, 참여 기록은 유지해요.
    const merged = migrated.map(g => {
      const seed = seedById.get(g.id)
      return seed ? { ...seed, memberIds: g.memberIds } : g
    })
    const existing = new Set(merged.map(g => g.id))
    return [...merged, ...SEED_GROUPS.filter(g => !existing.has(g.id))]
  } catch { return null }
}

function loadGroups(): MeetupGroup[] {
  if (typeof window === 'undefined') return SEED_GROUPS
  try {
    const s = localStorage.getItem(GROUPS_KEY)
    if (s) {
      const parsed = JSON.parse(s)
      if (Array.isArray(parsed)) {
        const list = parsed.map(normalizeGroup).filter((g): g is MeetupGroup => g !== null)
        if (list.length > 0) return list
      }
    }
    const migrated = migrateFromV1()
    const next = migrated ?? SEED_GROUPS
    localStorage.setItem(GROUPS_KEY, JSON.stringify(next))
    return next
  } catch { return SEED_GROUPS }
}
function saveGroups(g: MeetupGroup[]) { try { localStorage.setItem(GROUPS_KEY, JSON.stringify(g)) } catch {} }

function loadPosts(): MeetupPost[] {
  if (typeof window === 'undefined') return []
  try { const s = localStorage.getItem(POSTS_KEY); return s ? JSON.parse(s) : [] } catch { return [] }
}
function savePosts(p: MeetupPost[]) { try { localStorage.setItem(POSTS_KEY, JSON.stringify(p)) } catch {} }

function loadLikes(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try { const s = localStorage.getItem(LIKES_KEY); return s ? new Set(JSON.parse(s)) : new Set() } catch { return new Set() }
}
function saveLikes(s: Set<string>) { try { localStorage.setItem(LIKES_KEY, JSON.stringify(Array.from(s))) } catch {} }

/** 지금 머무는 지역 — 해외로 이동하면 여기만 바꾸면 돼요. */
function loadHomePlace(): PlaceRef | null {
  if (typeof window === 'undefined') return null
  try { const s = localStorage.getItem(HOME_KEY); return s ? JSON.parse(s) : null } catch { return null }
}
function saveHomePlace(p: PlaceRef | null) {
  try { p ? localStorage.setItem(HOME_KEY, JSON.stringify(p)) : localStorage.removeItem(HOME_KEY) } catch {}
}

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

// ── 지역 필터 ───────────────────────────────────────────────────────────────

export interface PlaceFilter {
  country: string   // 국가 코드 | ANY
  region: string    // 지역 id | ANY
  city: string      // 도시 id | ANY
  includeOnline: boolean
}

const ALL_PLACES: PlaceFilter = { country: ANY, region: ANY, city: ANY, includeOnline: true }

function filterLabel(f: PlaceFilter): string {
  if (f.country === ANY) return '전 세계'
  const country = getCountry(f.country)
  if (!country) return '전 세계'
  if (f.region === ANY) return `${country.flag} ${country.label} 전체`
  const region = getRegion(f.country, f.region)
  if (f.city === ANY) return `${country.flag} ${country.label} · ${region?.label ?? ''} 전체`
  const city = getCity(f.country, f.region, f.city)
  return `${country.flag} ${country.label} · ${region?.label ?? ''} · ${city?.label ?? ''}`
}

/** 선택한 지역에 실제로 열리는 모임인지 (온라인 전용 모임은 제외) */
function isLocalMatch(g: MeetupGroup, f: PlaceFilter): boolean {
  if (g.place.country === ONLINE_CODE) return false
  if (f.country === ANY) return true
  if (f.country === ONLINE_CODE) return false
  return g.place.country === f.country &&
    (f.region === ANY || g.place.region === f.region) &&
    (f.city === ANY || g.place.city === f.city)
}

function matchesPlace(g: MeetupGroup, f: PlaceFilter): boolean {
  const pureOnline = g.place.country === ONLINE_CODE
  if (f.country === ONLINE_CODE) return pureOnline || g.onlineJoinable
  if (pureOnline) return f.includeOnline
  if (isLocalMatch(g, f)) return true
  // 다른 지역 모임이라도 원격 참여가 열려 있으면 보여줘요.
  return f.includeOnline && g.onlineJoinable
}

// ── 위치 선택 모달 ──────────────────────────────────────────────────────────

function LocationPicker({ mode, initial, onClose, onSelect }: {
  mode: 'filter' | 'create'
  initial: PlaceRef | null
  onClose: () => void
  onSelect: (place: PlaceRef | null) => void   // filter 모드에서 null = 전체
}) {
  const [country, setCountry] = useState<Country | null>(initial ? getCountry(initial.country) ?? null : null)
  const [region, setRegion] = useState<Region | null>(
    initial && initial.region !== ANY ? getRegion(initial.country, initial.region) ?? null : null,
  )
  const [query, setQuery] = useState('')
  const results = useMemo(() => searchPlaces(query), [query])

  function pick(place: PlaceRef | null) { onSelect(place); onClose() }

  const title = !country ? '국가 선택' : !region ? `${country.flag} ${country.label}` : `${country.flag} ${country.label} · ${region.label}`

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: '#fff' }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 flex-shrink-0">
        {country ? (
          <button onClick={() => (region ? setRegion(null) : setCountry(null))} className="p-1">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
        ) : (
          <button onClick={onClose} className="p-1"><X className="w-6 h-6 text-slate-600" /></button>
        )}
        <p className="flex-1 text-[15px] font-bold text-slate-800 truncate">{title}</p>
        {country && <button onClick={onClose} className="p-1"><X className="w-5 h-5 text-slate-400" /></button>}
      </div>

      <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="나라·도시 검색 (예: 어바인, 도쿄, 시드니)"
            className="w-full pl-9 pr-9 py-2 rounded-2xl text-sm bg-slate-100 border-none outline-none placeholder-slate-400 text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-200 transition-all" />
          {query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-slate-400" /></button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {query.trim() ? (
          results.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-12">검색 결과가 없어요</p>
          ) : (
            <div className="space-y-1.5">
              {results.map(r => (
                <button key={`${r.country}-${r.region}-${r.city}`}
                  onClick={() => pick({ country: r.country, region: r.region, city: r.city })}
                  className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-white border border-slate-100 text-left hover:border-rose-200 transition-colors">
                  <span className="text-lg">{r.flag}</span>
                  <span className="flex-1 text-[13.5px] text-slate-700">{r.label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </button>
              ))}
            </div>
          )
        ) : !country ? (
          <>
            {mode === 'filter' && (
              <button onClick={() => pick(null)}
                className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl mb-3 text-left"
                style={{ background: 'rgba(244,63,117,0.08)', border: '1px solid rgba(244,63,117,0.2)' }}>
                <Globe className="w-4.5 h-4.5" style={{ color: '#e11d5a', width: 18, height: 18 }} />
                <span className="flex-1 text-[13.5px] font-bold" style={{ color: '#e11d5a' }}>전 세계 모든 지역 보기</span>
              </button>
            )}
            {COUNTRIES_BY_CONTINENT.map(group => (
              <div key={group.continent} className="mb-4">
                <p className="text-[11px] font-bold text-slate-400 mb-1.5 px-1">{group.continent}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {group.countries.map(x => (
                    <button key={x.code} onClick={() => setCountry(x)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-slate-100 text-left hover:border-rose-200 transition-colors">
                      <span className="text-base">{x.flag}</span>
                      <span className="flex-1 text-[13px] font-semibold text-slate-700 truncate">{x.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : !region ? (
          <div className="space-y-1.5">
            {mode === 'filter' && (
              <button onClick={() => pick({ country: country.code, region: ANY, city: ANY })}
                className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left"
                style={{ background: 'rgba(244,63,117,0.08)', border: '1px solid rgba(244,63,117,0.2)' }}>
                <span className="text-[13.5px] font-bold" style={{ color: '#e11d5a' }}>{country.label} 전체 보기</span>
              </button>
            )}
            {country.regions.map(r => (
              <button key={r.id} onClick={() => setRegion(r)}
                className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-white border border-slate-100 text-left hover:border-rose-200 transition-colors">
                <span className="flex-1 text-[13.5px] font-semibold text-slate-700">{r.label}</span>
                <span className="text-[11px] text-slate-400">{r.cities.length}곳</span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {mode === 'filter' && (
              <button onClick={() => pick({ country: country.code, region: region.id, city: ANY })}
                className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left"
                style={{ background: 'rgba(244,63,117,0.08)', border: '1px solid rgba(244,63,117,0.2)' }}>
                <span className="text-[13.5px] font-bold" style={{ color: '#e11d5a' }}>{region.label} 전체 보기</span>
              </button>
            )}
            {region.cities.map(ct => (
              <button key={ct.id} onClick={() => pick({ country: country.code, region: region.id, city: ct.id })}
                className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-white border border-slate-100 text-left hover:border-rose-200 transition-colors">
                <MapPin className="w-4 h-4 text-slate-300" />
                <span className="flex-1 text-[13.5px] font-semibold text-slate-700">{ct.label}</span>
                {initial?.city === ct.id && initial?.region === region.id && <Check className="w-4 h-4 text-rose-500" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Category chip row ────────────────────────────────────────────────────

function CategoryChips({ value, onChange }: { value: MeetupCategory | 'all'; onChange: (c: MeetupCategory | 'all') => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-3">
      <button onClick={() => onChange('all')}
        className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all"
        style={value === 'all'
          ? { background: '#1e293b', borderColor: '#1e293b', color: '#fff' }
          : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#94a3b8' }}>
        🏠 전체 종목
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

function placeLine(place: MeetupPlace): string {
  const country = getCountry(place.country)
  if (!country) return place.venue || '위치 미정'
  const city = getCity(place.country, place.region, place.city)
  const region = getRegion(place.country, place.region)
  const spot = city?.label ?? region?.label ?? ''
  const prefix = place.country === ONLINE_CODE ? '' : `${country.flag} `
  return `${prefix}${country.label}${spot ? ` · ${spot}` : ''}`
}

function GroupCard({ group, joined, onOpen }: { group: MeetupGroup; joined: boolean; onOpen: () => void }) {
  const meta = CATEGORY_META[group.category]
  const isOnline = group.place.country === ONLINE_CODE
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
          <span className="flex items-center gap-0.5 font-semibold text-slate-500">
            {isOnline ? <Globe className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}{placeLine(group.place)}
          </span>
          <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{group.schedule}</span>
          <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{group.memberIds.length}/{group.maxMembers}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
          <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>
            {meta.emoji} {meta.label}
          </span>
          {!isOnline && group.onlineJoinable && (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}>
              <Globe className="w-2.5 h-2.5" /> 원격 참여 가능
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
            <Languages className="w-2.5 h-2.5" /> {group.language}
          </span>
        </div>
      </div>
    </button>
  )
}

// ── Create group modal ──────────────────────────────────────────────────────

export interface GroupDraft {
  name: string
  category: MeetupCategory
  description: string
  place: MeetupPlace
  onlineJoinable: boolean
  language: MeetupLanguage
  schedule: string
  maxMembers: number
}

function CreateGroupModal({ defaultPlace, onClose, onCreate }: {
  defaultPlace: PlaceRef | null
  onClose: () => void
  onCreate: (draft: GroupDraft) => void
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<MeetupCategory>('badminton')
  const [description, setDescription] = useState('')
  const [place, setPlace] = useState<PlaceRef>(
    defaultPlace && defaultPlace.city !== ANY ? defaultPlace : { country: 'KR', region: 'seoul', city: 'gangnam' },
  )
  const [venue, setVenue] = useState('')
  const [onlineJoinable, setOnlineJoinable] = useState(false)
  const [language, setLanguage] = useState<MeetupLanguage>('한국어')
  const [schedule, setSchedule] = useState('')
  const [maxMembers, setMaxMembers] = useState(10)
  const [showPicker, setShowPicker] = useState(false)

  const isOnlineGroup = place.country === ONLINE_CODE
  const canSubmit = name.trim().length > 0 && description.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#fff' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <button onClick={onClose} className="p-1"><X className="w-6 h-6 text-slate-600" /></button>
        <p className="text-base font-bold text-slate-800">새 모임 만들기</p>
        <button disabled={!canSubmit}
          onClick={() => onCreate({
            name: name.trim(), category, description: description.trim(),
            place: { ...place, venue: venue.trim() || '장소 미정' },
            onlineJoinable: isOnlineGroup ? true : onlineJoinable,
            language, schedule: schedule.trim() || '미정', maxMembers,
          })}
          className="text-sm font-bold text-rose-500 disabled:text-slate-300">만들기</button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        <div>
          <p className="text-xs font-bold text-slate-500 mb-2">종목</p>
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
        </div>

        <div>
          <p className="text-xs font-bold text-slate-500 mb-1.5">모임 이름</p>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={30}
            placeholder="예) 어바인 아침 러닝크루"
            className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 outline-none focus:border-rose-300 text-slate-800" />
        </div>

        <div>
          <p className="text-xs font-bold text-slate-500 mb-1.5">소개</p>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} maxLength={300}
            placeholder="어떤 모임인지 소개해주세요"
            className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 outline-none focus:border-rose-300 resize-none text-slate-800" />
        </div>

        <div>
          <p className="text-xs font-bold text-slate-500 mb-1.5">국가 · 지역 · 도시</p>
          <button onClick={() => setShowPicker(true)}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 text-left">
            {isOnlineGroup ? <Globe className="w-4 h-4 text-slate-400" /> : <MapPin className="w-4 h-4 text-slate-400" />}
            <span className="flex-1 text-slate-800 truncate">{placeLabel(place)}</span>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>
          <input value={venue} onChange={e => setVenue(e.target.value)} maxLength={50}
            placeholder={isOnlineGroup ? '참여 방법 (예: Zoom 링크는 가입 시 안내)' : '상세 장소 (예: Irvine Community Center)'}
            className="w-full mt-2 px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 outline-none focus:border-rose-300 text-slate-800" />
        </div>

        {!isOnlineGroup && (
          <button onClick={() => setOnlineJoinable(v => !v)}
            className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Globe className="w-4 h-4 text-blue-500" /> 다른 나라에서도 원격 참여 가능
            </span>
            <div className={cn('w-9 h-5 rounded-full transition-colors relative', onlineJoinable ? 'bg-rose-400' : 'bg-slate-300')}>
              <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: onlineJoinable ? 18 : 2 }} />
            </div>
          </button>
        )}

        <div>
          <p className="text-xs font-bold text-slate-500 mb-1.5">사용 언어</p>
          <div className="flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map(l => (
              <button key={l} onClick={() => setLanguage(l)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                style={language === l
                  ? { background: 'rgba(244,63,117,0.1)', borderColor: '#f43f75', color: '#e11d5a' }
                  : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#94a3b8' }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1.5">일정</p>
            <input value={schedule} onChange={e => setSchedule(e.target.value)} maxLength={30}
              placeholder="예) 매주 토 09:00"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 outline-none focus:border-rose-300 text-slate-800" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1.5">최대 인원</p>
            <input type="number" min={2} max={100} value={maxMembers}
              onChange={e => setMaxMembers(Math.max(2, Math.min(100, Number(e.target.value) || 2)))}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 outline-none focus:border-rose-300 text-slate-800" />
          </div>
        </div>
      </div>

      {showPicker && (
        <LocationPicker mode="create" initial={place}
          onClose={() => setShowPicker(false)}
          onSelect={p => { if (p) setPlace(p) }} />
      )}
    </div>
  )
}

// ── Activity post modal ─────────────────────────────────────────────────────

function ActivityModal({ group, onClose, onSubmit }: {
  group: MeetupGroup
  onClose: () => void
  onSubmit: (content: string, image: string | undefined) => void
}) {
  const [content, setContent] = useState('')
  const [image, setImage] = useState<string | undefined>()
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try { setImage(await compressImage(file)) } finally { setUploading(false); e.target.value = '' }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#fff' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <button onClick={onClose} className="p-1"><X className="w-6 h-6 text-slate-600" /></button>
        <p className="text-base font-bold text-slate-800">활동 인증하기</p>
        <button onClick={() => content.trim() && onSubmit(content.trim(), image)}
          disabled={!content.trim()} className="text-sm font-bold text-rose-500 disabled:text-slate-300">공유</button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <textarea value={content} onChange={e => setContent(e.target.value)} rows={6} maxLength={1000}
          placeholder={`${group.name}에서의 활동을 공유해보세요`}
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
  group, posts, liked, joined, currentUserId,
  onBack, onJoinToggle, onSubmitActivity, onLike, onComment,
}: {
  group: MeetupGroup; posts: MeetupPost[]; liked: Set<string>; joined: boolean
  currentUserId: string
  onBack: () => void
  onJoinToggle: () => void
  onSubmitActivity: (content: string, image: string | undefined) => void
  onLike: (id: string) => void
  onComment: (postId: string, text: string) => void
}) {
  const meta = CATEGORY_META[group.category]
  const isOnline = group.place.country === ONLINE_CODE
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

          <div className="rounded-xl p-3 space-y-1.5 mb-3" style={{ background: '#f8fafc' }}>
            <div className="flex items-start gap-1.5 text-[12.5px] text-slate-600">
              {isOnline ? <Globe className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" /> : <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />}
              <span><b className="text-slate-800">{placeLabel(group.place, { withFlag: !isOnline })}</b>{group.place.venue ? ` · ${group.place.venue}` : ''}</span>
            </div>
            <div className="flex items-start gap-1.5 text-[12.5px] text-slate-600">
              <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
              <span>{group.schedule}{group.timeNote ? ` · ${group.timeNote}` : ''}</span>
            </div>
            <div className="flex items-start gap-1.5 text-[12.5px] text-slate-600">
              <Languages className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
              <span>{group.language}</span>
            </div>
            <div className="flex items-start gap-1.5 text-[12.5px] text-slate-600">
              <Users className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
              <span>{group.memberIds.length}/{group.maxMembers}명</span>
            </div>
          </div>

          {(isOnline || group.onlineJoinable) && (
            <div className="rounded-xl p-3 text-[12px] leading-relaxed" style={{ background: 'rgba(37,99,235,0.08)', color: '#1d4ed8' }}>
              🌐 이 모임은 <b>다른 나라에서도 원격으로 함께</b>할 수 있어요. 해외에 있어도 시간만 맞추면 참여 가능해요.
            </div>
          )}
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
        <ActivityModal group={group}
          onClose={() => setShowActivity(false)}
          onSubmit={(content, image) => { onSubmitActivity(content, image); setShowActivity(false) }} />
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<MeetupGroup[]>([])
  const [posts, setPosts] = useState<MeetupPost[]>([])
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<'explore' | 'mine'>('explore')
  const [categoryFilter, setCategoryFilter] = useState<MeetupCategory | 'all'>('all')
  const [placeFilter, setPlaceFilter] = useState<PlaceFilter>(ALL_PLACES)
  const [homePlace, setHomePlace] = useState<PlaceRef | null>(null)
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showFilterPicker, setShowFilterPicker] = useState(false)
  const [openGroupId, setOpenGroupId] = useState<string | null>(null)

  const currentUserId = user?.userId ?? 'me'
  const currentUserName = user?.nickname || user?.name || '나'
  const currentUserEmoji = AUTHOR_EMOJIS[Math.abs(currentUserName.charCodeAt(0)) % AUTHOR_EMOJIS.length]

  useEffect(() => {
    setGroups(loadGroups())
    setPosts(loadPosts())
    setLiked(loadLikes())
    const home = loadHomePlace()
    setHomePlace(home)

    try {
      const params = new URLSearchParams(window.location.search)
      const cat = params.get('category')
      if (cat && isMeetupCategory(cat)) setCategoryFilter(cat)
      const country = params.get('country')
      if (country && (country === ONLINE_CODE || getCountry(country))) {
        setPlaceFilter(f => ({ ...f, country, region: ANY, city: ANY }))
      } else if (home) {
        setPlaceFilter(f => ({ ...f, country: home.country, region: home.region, city: ANY }))
      }
    } catch {}
  }, [])

  const filteredGroups = useMemo(() => groups
    .filter(g => categoryFilter === 'all' || g.category === categoryFilter)
    .filter(g => matchesPlace(g, placeFilter))
    .filter(g => {
      const q = query.trim().toLowerCase()
      if (!q) return true
      const place = `${placeLabel(g.place, { withFlag: false })} ${g.place.venue}`.toLowerCase()
      return g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)
        || place.includes(q) || CATEGORY_META[g.category].label.toLowerCase().includes(q)
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  [groups, categoryFilter, placeFilter, query])

  const myGroups = useMemo(
    () => groups.filter(g => g.memberIds.includes(currentUserId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [groups, currentUserId],
  )

  // 지역을 고른 경우 현지 모임을 먼저, 원격 참여 모임을 뒤에 보여줘요.
  const splitList = placeFilter.country !== ANY && placeFilter.country !== ONLINE_CODE
  const localGroups = splitList ? filteredGroups.filter(g => isLocalMatch(g, placeFilter)) : filteredGroups
  const remoteGroups = splitList ? filteredGroups.filter(g => !isLocalMatch(g, placeFilter)) : []

  const openGroup = groups.find(g => g.id === openGroupId) ?? null

  const handleSetHome = useCallback(() => {
    if (placeFilter.country === ANY || placeFilter.country === ONLINE_CODE) return
    const next: PlaceRef = { country: placeFilter.country, region: placeFilter.region, city: placeFilter.city }
    setHomePlace(next)
    saveHomePlace(next)
  }, [placeFilter])

  const handleCreateGroup = useCallback((draft: GroupDraft) => {
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

  const handleSubmitActivity = useCallback((groupId: string, content: string, image: string | undefined) => {
    const post: MeetupPost = {
      id: `post-${Date.now()}`, groupId, authorId: currentUserId, authorName: currentUserName, authorEmoji: currentUserEmoji,
      content, image, createdAt: new Date().toISOString(), likes: 0, comments: [],
    }
    setPosts(prev => { const u = [post, ...prev]; savePosts(u); return u })
  }, [currentUserId, currentUserName, currentUserEmoji])

  const handleLike = useCallback((postId: string) => {
    setLiked(prev => {
      const next = new Set(prev)
      const was = next.has(postId)
      if (was) next.delete(postId); else next.add(postId)
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

  const placeIsSet = placeFilter.country !== ANY
  const canSetHome = placeIsSet && placeFilter.country !== ONLINE_CODE &&
    !(homePlace && homePlace.country === placeFilter.country && homePlace.region === placeFilter.region && homePlace.city === placeFilter.city)

  return (
    <div className="min-h-screen pb-24" style={{ background: '#fafafa' }}>
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div>
            <h1 className="font-display text-xl font-semibold text-slate-800 leading-tight">루디아 모임</h1>
            <p className="text-[11.5px] text-slate-400">어느 나라에 있든, 함께 움직여요</p>
          </div>
          {tab === 'explore' && (
            <button onClick={() => setShowCreate(true)} className="p-1.5 rounded-full hover:bg-slate-50 transition-colors">
              <Plus className="w-6 h-6 text-slate-800" strokeWidth={2.5} />
            </button>
          )}
        </div>

        <div className="flex px-4 max-w-lg mx-auto border-b border-slate-100">
          {([{ key: 'explore', label: '모임 찾기' }, { key: 'mine', label: `내 모임${myGroups.length ? ` ${myGroups.length}` : ''}` }] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex-1 py-2.5 text-sm font-bold relative"
              style={{ color: tab === t.key ? '#e11d5a' : '#94a3b8' }}>
              {t.label}
              {tab === t.key && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full" style={{ background: '#e11d5a' }} />}
            </button>
          ))}
        </div>

        {tab === 'explore' && (
          <>
            <div className="px-4 pt-3 pb-2 max-w-lg mx-auto space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="모임·종목·도시 검색..."
                  className="w-full pl-9 pr-9 py-2 rounded-2xl text-sm bg-slate-100 border-none outline-none placeholder-slate-400 text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-200 transition-all" />
                {query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-slate-400" /></button>}
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => setShowFilterPicker(true)}
                  className="flex-1 min-w-0 flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[12.5px] font-bold transition-colors"
                  style={placeIsSet
                    ? { background: 'rgba(244,63,117,0.1)', color: '#e11d5a' }
                    : { background: '#f1f5f9', color: '#475569' }}>
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{filterLabel(placeFilter)}</span>
                  <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                </button>
                {placeIsSet && (
                  <button onClick={() => setPlaceFilter(ALL_PLACES)}
                    className="px-2.5 py-2 rounded-2xl bg-slate-100 text-slate-500 flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => setPlaceFilter(f => ({ ...f, country: f.country === ONLINE_CODE ? ANY : ONLINE_CODE, region: ANY, city: ANY }))}
                  className="flex items-center gap-1 px-3 py-2 rounded-2xl text-[12.5px] font-bold flex-shrink-0 transition-colors"
                  style={placeFilter.country === ONLINE_CODE
                    ? { background: 'rgba(37,99,235,0.12)', color: '#2563eb' }
                    : { background: '#f1f5f9', color: '#475569' }}>
                  <Globe className="w-3.5 h-3.5" /> 온라인
                </button>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {placeFilter.country !== ONLINE_CODE && (
                  <button onClick={() => setPlaceFilter(f => ({ ...f, includeOnline: !f.includeOnline }))}
                    className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500">
                    <span className={cn('w-4 h-4 rounded-md flex items-center justify-center border transition-colors',
                      placeFilter.includeOnline ? 'bg-rose-500 border-rose-500' : 'bg-white border-slate-300')}>
                      {placeFilter.includeOnline && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </span>
                    원격 참여 가능한 모임도 함께 보기
                  </button>
                )}
                {canSetHome && (
                  <button onClick={handleSetHome} className="text-[11.5px] font-semibold text-rose-400">
                    📍 지금 사는 지역으로 저장
                  </button>
                )}
                {homePlace && placeFilter.country === ANY && (
                  <button onClick={() => setPlaceFilter(f => ({ ...f, country: homePlace.country, region: homePlace.region, city: homePlace.city }))}
                    className="text-[11.5px] font-semibold text-slate-400">
                    내 지역({placeLabel(homePlace, { short: true })}) 모임 보기
                  </button>
                )}
              </div>
            </div>
            <CategoryChips value={categoryFilter} onChange={setCategoryFilter} />
          </>
        )}
      </div>

      {tab === 'explore' ? (
        <div className="max-w-lg mx-auto px-4 py-3">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-4xl mb-3">🌏</p>
              <p className="text-sm text-slate-400 font-medium">이 조건에 맞는 모임이 아직 없어요</p>
              <p className="text-xs text-slate-300 mt-1">+ 버튼으로 이 지역의 첫 모임을 만들어보세요!</p>
              <button onClick={() => { setPlaceFilter(ALL_PLACES); setCategoryFilter('all') }}
                className="mt-4 text-xs font-bold text-rose-500">필터 모두 지우기</button>
            </div>
          ) : (
            <>
              {splitList ? (
                <>
                  <p className="text-[11.5px] font-bold text-slate-500 mb-2 px-1">
                    📍 {filterLabel(placeFilter)} 모임 {localGroups.length}개
                  </p>
                  {localGroups.length === 0 ? (
                    <div className="rounded-2xl bg-white p-5 text-center mb-4">
                      <p className="text-[13px] text-slate-400">이 지역엔 아직 모임이 없어요.</p>
                      <button onClick={() => setShowCreate(true)} className="mt-2 text-xs font-bold text-rose-500">첫 모임 만들기</button>
                    </div>
                  ) : (
                    localGroups.map(g => (
                      <GroupCard key={g.id} group={g} joined={g.memberIds.includes(currentUserId)} onOpen={() => setOpenGroupId(g.id)} />
                    ))
                  )}
                  {remoteGroups.length > 0 && (
                    <>
                      <p className="text-[11.5px] font-bold text-slate-500 mt-5 mb-2 px-1">
                        🌐 어디서든 원격으로 함께할 수 있는 모임 {remoteGroups.length}개
                      </p>
                      {remoteGroups.map(g => (
                        <GroupCard key={g.id} group={g} joined={g.memberIds.includes(currentUserId)} onOpen={() => setOpenGroupId(g.id)} />
                      ))}
                    </>
                  )}
                </>
              ) : (
                <>
                  <p className="text-[11.5px] text-slate-400 mb-2 px-1">{filteredGroups.length}개 모임</p>
                  {filteredGroups.map(g => (
                    <GroupCard key={g.id} group={g} joined={g.memberIds.includes(currentUserId)} onOpen={() => setOpenGroupId(g.id)} />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="max-w-lg mx-auto px-4 py-4">
          {myGroups.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-4xl mb-3">💌</p>
              <p className="text-sm text-slate-400 font-medium">아직 참여 중인 모임이 없어요</p>
              <button onClick={() => setTab('explore')} className="mt-3 text-xs font-bold text-rose-500">모임 찾아보기</button>
            </div>
          ) : (
            myGroups.map(g => (
              <GroupCard key={g.id} group={g} joined onOpen={() => setOpenGroupId(g.id)} />
            ))
          )}
        </div>
      )}

      {showCreate && (
        <CreateGroupModal
          defaultPlace={homePlace ?? (placeFilter.country !== ANY ? { country: placeFilter.country, region: placeFilter.region, city: placeFilter.city } : null)}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreateGroup} />
      )}

      {showFilterPicker && (
        <LocationPicker mode="filter"
          initial={placeFilter.country === ANY ? null : { country: placeFilter.country, region: placeFilter.region, city: placeFilter.city }}
          onClose={() => setShowFilterPicker(false)}
          onSelect={p => setPlaceFilter(f => p
            ? { ...f, country: p.country, region: p.region, city: p.city }
            : { ...f, country: ANY, region: ANY, city: ANY })} />
      )}

      {openGroup && (
        <GroupDetail
          group={openGroup}
          posts={posts}
          liked={liked}
          joined={openGroup.memberIds.includes(currentUserId)}
          currentUserId={currentUserId}
          onBack={() => setOpenGroupId(null)}
          onJoinToggle={() => handleJoinToggle(openGroup.id)}
          onSubmitActivity={(content, image) => handleSubmitActivity(openGroup.id, content, image)}
          onLike={handleLike}
          onComment={handleComment}
        />
      )}
    </div>
  )
}
