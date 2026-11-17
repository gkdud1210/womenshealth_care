'use client'

// ── 시설 찾기 ───────────────────────────────────────────────────────────────
//
// 첫 화면에서 스포츠·마사지·헤어·반영구 같은 큰 분류를 고르고, 그 안의 시설 종류(수영장·헬스장·마사지샵…)로 나눠 봐요.
// 스포츠센터·수영장·코트·걷기 코스·공유 주방·뷰티샵 같은 장소를 이용료, 루디아 회원 할인과 함께 보여줘요.
// 목록과 지도 두 가지로 볼 수 있고, 지도에서는 OpenStreetMap 의 실제 주변 시설도 찾아볼 수 있어요.

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  Search, X, MapPin, Clock, ChevronRight, Map as MapIcon, Navigation, BadgePercent, Footprints, Users,
  Car, Backpack, Info, ChevronLeft,
} from 'lucide-react'
import {
  FACILITIES, FACILITY_TYPE_META, FACILITY_GROUPS, formatPrice, discountRate, facilityActivities,
  groupOfType, type Facility, type FacilityType,
} from '@/data/facilityData'
import { CATEGORY_META, type MeetupCategory } from '@/data/meetupData'
import { ANY, placeLabel, type PlaceRef } from '@/data/regionData'
import { fetchOsmByType, osmDirectionsUrl, osmSupportsType, type Bounds } from '@/lib/osm-facilities'
import type { MapLocation } from '@/components/community/PlaceMap'
import FacilityReviews, { RatingBadge, TopKeywords } from '@/components/community/FacilityReviews'
import {
  addReview, loadReviews, removeReview, saveReviews, type FacilityReview, type ReviewMap,
} from '@/lib/facility-reviews'
import { CollapsiblePicker } from '@/components/community/CollapsiblePicker'
import FacilityFeed from '@/components/community/FacilityFeed'

// ── 내 위치 ───────────────────────────────────────────────────────────────

export interface LatLng { lat: number; lng: number }

/** 두 지점 사이 직선거리 (km) */
function kmBetween(a: LatLng, b: LatLng): number {
  const rad = (d: number) => d * Math.PI / 180
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(h))
}

function formatAway(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}m` : km < 10 ? `${km.toFixed(1)}km` : `${Math.round(km)}km`
}

const PlaceMap = dynamic(() => import('@/components/community/PlaceMap'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[45] flex items-center justify-center bg-white">
      <p className="text-sm text-slate-400">지도를 불러오는 중…</p>
    </div>
  ),
}) as typeof import('@/components/community/PlaceMap').default

// 지도에서 고르는 시설 종류 — 목록과 같은 분류(스포츠·러닝·마사지·헤어·반영구·네일·피부·요리)
const MAP_PICK_GROUPS = FACILITY_GROUPS.map(g => ({
  label: `${g.emoji} ${g.label}`,
  options: g.types.map(t => ({ id: t, ...FACILITY_TYPE_META[t] })),
}))

/** 지도에서 이 종류를 고르면 보여줄 등록 시설 — 같은 종류 + (운동이면) 그 종목을 할 수 있는 곳 (예: 배드민턴장 → 스포츠센터도) */
function matchesMapType(f: Facility, t: FacilityType): boolean {
  if (f.type === t) return true
  const sport = FACILITY_TYPE_META[t].categories[0]
  return t !== 'sports_center' && !!sport && facilityActivities(f).includes(sport)
}

function MapTypeChips({ value, onChange }: { value: FacilityType | 'all'; onChange: (t: FacilityType | 'all') => void }) {
  return (
    <CollapsiblePicker className="px-4 py-2.5" value={value} onChange={onChange}
      groups={MAP_PICK_GROUPS} allLabel="모든 시설" hint="시설 종류를 고르면 그 종류의 등록 시설과 주변 실제 시설을 보여줘요" />
  )
}

function matchesPlace(f: Facility, p: PlaceRef): boolean {
  if (p.country === ANY) return true
  return f.place.country === p.country &&
    (p.region === ANY || f.place.region === p.region) &&
    (p.city === ANY || f.place.city === p.city)
}

// ── 가격 표시 ──────────────────────────────────────────────────────────────

function PriceLine({ f, isMember, large = false }: { f: Facility; isMember: boolean; large?: boolean }) {
  const { amount, unit, currency } = f.price
  const rate = discountRate(f)
  const regular = formatPrice(amount, currency)
  if (f.price.inquire) {
    return <span className={`${large ? 'text-base' : 'text-[12.5px]'} font-bold text-slate-500`}>요금 전화 문의</span>
  }
  if (amount === null) {
    return <span className={`${large ? 'text-base' : 'text-[12.5px]'} font-bold text-emerald-600`}>무료 · 누구나 이용</span>
  }
  if (!f.ludia) {
    return (
      <span className={`${large ? 'text-base' : 'text-[12.5px]'} font-bold text-slate-700`}>
        {regular} <span className="text-[11px] font-medium text-slate-400">/ {unit}</span>
      </span>
    )
  }
  const member = formatPrice(f.ludia.memberAmount, currency)
  return (
    <span className="inline-flex items-baseline gap-1.5 flex-wrap">
      <span className={`${large ? 'text-[12.5px]' : 'text-[11px]'} text-slate-400 line-through`}>{regular}</span>
      <span className={`${large ? 'text-base' : 'text-[12.5px]'} font-extrabold`} style={{ color: '#e11d5a' }}>
        {isMember ? '' : '회원가 '}{member}
      </span>
      <span className="text-[11px] font-medium text-slate-400">/ {unit}</span>
      {rate !== null && rate > 0 && (
        <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded-full text-white"
          style={{ background: 'linear-gradient(135deg,#f43f75,#a855f7)' }}>{rate}%↓</span>
      )}
    </span>
  )
}

// ── 시설 카드 ──────────────────────────────────────────────────────────────

export function FacilityCard({ f, isMember, reviews = [], awayKm, onOpen }: {
  f: Facility; isMember: boolean; reviews?: FacilityReview[]
  /** 내 위치에서 떨어진 거리 (위치를 알 때만) */
  awayKm?: number
  onOpen: () => void
}) {
  const meta = FACILITY_TYPE_META[f.type]
  return (
    <button onClick={onOpen}
      className="w-full bg-white rounded-2xl shadow-sm p-4 flex gap-3.5 text-left mb-2.5 hover:shadow-md transition-shadow">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: meta.bg }}>
        {meta.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <h3 className="text-[15px] font-bold text-slate-900 truncate">{f.name}</h3>
          {f.ludia && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 text-white"
              style={{ background: 'linear-gradient(135deg,#f43f75,#a855f7)' }}>
              <BadgePercent className="w-2.5 h-2.5" /> 루디아 제휴
            </span>
          )}
        </div>
        <p className="text-[12.5px] text-slate-500 line-clamp-2 leading-snug mb-1.5">{f.description}</p>
        <div className="mb-1.5"><PriceLine f={f} isMember={isMember} /></div>
        <div className="flex items-center gap-2.5 flex-wrap text-[11px] text-slate-400">
          <span className="flex items-center gap-0.5 font-semibold text-slate-500">
            <MapPin className="w-3 h-3" />{placeLabel(f.place, { short: true })}
          </span>
          {awayKm !== undefined && (
            <span className="flex items-center gap-0.5 font-semibold text-rose-500">
              <Navigation className="w-3 h-3" />내 위치에서 {formatAway(awayKm)}
            </span>
          )}
          <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{f.hours}</span>
          {f.distanceKm && <span className="flex items-center gap-0.5"><Footprints className="w-3 h-3" />{f.distanceKm}km</span>}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
          <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>
            {meta.emoji} {meta.label}
          </span>
          {f.sample && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">예시 정보</span>
          )}
          {reviews.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-400">
              <RatingBadge reviews={reviews} /> 리뷰 {reviews.length}
            </span>
          )}
        </div>
        {reviews.length > 0 && <div className="mt-1.5"><TopKeywords reviews={reviews} /></div>}
      </div>
    </button>
  )
}

// ── 시설 상세 ──────────────────────────────────────────────────────────────

function FacilityDetail({ f, isMember, reviews, userId, onAddReview, onDeleteReview, onClose, onShowGroups }: {
  f: Facility; isMember: boolean
  reviews: FacilityReview[]; userId: string
  onAddReview: (rating: number, text: string, images: string[], keywords: string[]) => boolean
  onDeleteReview: (reviewId: string) => void
  onClose: () => void; onShowGroups: (c: MeetupCategory) => void
}) {
  const meta = FACILITY_TYPE_META[f.type]
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" style={{ background: 'rgba(15,23,42,0.45)' }} onClick={onClose}>
      <div className="w-full sm:max-w-lg max-h-[88vh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 px-5 pt-5 pb-3 border-b border-slate-100 flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: meta.bg }}>{meta.emoji}</div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-slate-900">{f.name}</p>
            <p className="text-[12px] text-slate-400 mt-0.5">{meta.label} · {placeLabel(f.place, { withFlag: false })}</p>
          </div>
          <button onClick={onClose} aria-label="닫기" className="p-1 -mr-1 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <p className="text-[13px] text-slate-600 leading-relaxed">{f.description}</p>

          <div className="rounded-2xl p-4" style={{ background: f.ludia ? 'linear-gradient(135deg,#fff1f5,#f5f0ff)' : '#f8fafc' }}>
            <p className="text-[11.5px] font-bold text-slate-500 mb-2">이용료</p>
            {f.price.amount === null ? (
              <PriceLine f={f} isMember={isMember} large />
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[12.5px] text-slate-500">일반 ({f.price.unit})</span>
                  <span className={`text-[14px] font-bold ${f.ludia ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                    {formatPrice(f.price.amount, f.price.currency)}
                  </span>
                </div>
                {f.ludia && (
                  <div className="flex items-baseline justify-between">
                    <span className="text-[12.5px] font-bold" style={{ color: '#e11d5a' }}>
                      루디아 회원가 {discountRate(f) ? `(${discountRate(f)}% 할인)` : ''}
                    </span>
                    <span className="text-[17px] font-extrabold" style={{ color: '#e11d5a' }}>
                      {formatPrice(f.ludia.memberAmount, f.price.currency)}
                    </span>
                  </div>
                )}
              </div>
            )}
            {f.monthly && (
              <div className="mt-2.5 pt-2.5 border-t border-slate-200/70 space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-[12.5px] text-slate-500">월 이용권 (성인)</span>
                  <span className="text-[14px] font-bold text-slate-800">{formatPrice(f.monthly.adult, f.price.currency)}</span>
                </div>
                {(f.monthly.youth || f.monthly.child) && (
                  <p className="text-[11.5px] text-slate-500 text-right">
                    {[
                      f.monthly.youth && `청소년 ${formatPrice(f.monthly.youth, f.price.currency)}`,
                      f.monthly.child && `어린이 ${formatPrice(f.monthly.child, f.price.currency)}`,
                    ].filter(Boolean).join(' · ')}
                  </p>
                )}
                {f.monthly.note && <p className="text-[11.5px] text-slate-500">{f.monthly.note}</p>}
              </div>
            )}
            {f.ludia && (
              <p className="mt-2.5 text-[12px] font-semibold text-violet-600">🎁 {f.ludia.perk}</p>
            )}
            {f.ludia && !isMember && (
              <p className="mt-1.5 text-[11.5px] text-slate-500">게스트로 이용 중이에요. 루디아 회원으로 가입하면 회원가로 이용할 수 있어요.</p>
            )}
            {f.ludia && isMember && (
              <p className="mt-1.5 text-[11.5px] text-slate-500">방문 시 루디아 앱 프로필 화면을 보여주면 회원가가 적용돼요.</p>
            )}
          </div>

          <div className="space-y-2 text-[12.5px] text-slate-600">
            <p className="flex items-start gap-2"><MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />{f.address}</p>
            <p className="flex items-start gap-2"><Clock className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />{f.hours}</p>
            {f.distanceKm && <p className="flex items-start gap-2"><Footprints className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />코스 길이 약 {f.distanceKm}km</p>}
            {f.parking && <p className="flex items-start gap-2"><Car className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />{f.parking}</p>}
          </div>

          {f.supplies && f.supplies.length > 0 && (
            <div>
              <p className="flex items-center gap-1 text-[11.5px] font-bold text-slate-500 mb-1.5"><Backpack className="w-3.5 h-3.5" />준비물</p>
              <div className="flex flex-wrap gap-1.5">
                {f.supplies.map(s => (
                  <span key={s} className="text-[11.5px] px-2.5 py-1 rounded-full bg-sky-50 text-sky-700">{s}</span>
                ))}
              </div>
            </div>
          )}

          {f.amenities.length > 0 && (
            <div>
              <p className="text-[11.5px] font-bold text-slate-500 mb-1.5">시설·특징</p>
              <div className="flex flex-wrap gap-1.5">
                {f.amenities.map(a => (
                  <span key={a} className="text-[11.5px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{a}</span>
                ))}
              </div>
            </div>
          )}

          {f.notes && f.notes.length > 0 && (
            <div>
              <p className="flex items-center gap-1 text-[11.5px] font-bold text-slate-500 mb-1.5"><Info className="w-3.5 h-3.5" />이용 안내</p>
              <ul className="space-y-1 text-[12px] text-slate-600 leading-snug">
                {f.notes.map(n => <li key={n} className="flex gap-1.5"><span className="text-slate-300">•</span>{n}</li>)}
              </ul>
            </div>
          )}

          <FacilityReviews facility={f} reviews={reviews} userId={userId}
            onAdd={onAddReview} onDelete={onDeleteReview} />

          <FacilityFeed f={f} />

          {facilityActivities(f).length > 0 && <div>
            <p className="text-[11.5px] font-bold text-slate-500 mb-1.5">여기서 할 수 있는 모임</p>
            <div className="flex flex-wrap gap-1.5">
              {facilityActivities(f).map(c => (
                <button key={c} onClick={() => onShowGroups(c)}
                  className="flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-1 rounded-full border"
                  style={{ background: CATEGORY_META[c].bg, borderColor: CATEGORY_META[c].color, color: CATEGORY_META[c].color }}>
                  <Users className="w-3 h-3" /> {CATEGORY_META[c].emoji} {CATEGORY_META[c].label} 모임 보기
                </button>
              ))}
            </div>
          </div>}

          {f.sample && (
            <p className="text-[11px] text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
              아직 실제 제휴 전이라 이름·가격·할인은 예시로 보여주는 정보예요.
            </p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex-shrink-0">
          <a href={osmDirectionsUrl(f)} target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#f43f75,#e11d5a)' }}>
            <Navigation className="w-4 h-4" /> 길찾기
          </a>
        </div>
      </div>
    </div>
  )
}

// ── 시설 찾기 탭 ───────────────────────────────────────────────────────────

export default function FacilityExplorer({ place, placeText, homeCenter, isMember, userId, userName, onPickPlace, onBackHome, onShowGroups, onLocated, start }: {
  place: PlaceRef                 // 모임 찾기와 같은 지역 필터 (처음엔 내 동네)를 써요
  placeText: string
  /** 내 동네 중심 좌표 — 지도가 여기서 열려요 */
  homeCenter: [number, number] | null
  isMember: boolean
  /** 리뷰 작성자 */
  userId: string
  userName: string
  onPickPlace: () => void
  /** 다른 지역을 보고 있을 때 내 동네로 돌아가기 */
  onBackHome?: () => void
  onShowGroups: (c: MeetupCategory) => void
  /** 내 위치를 알게 되면 불러요 — 지역 필터를 지금 있는 지역으로 맞출 때 써요 */
  onLocated?: (here: LatLng) => void
  /** 처음 열 때 바로 보여줄 시설 종류 · 제휴 할인만 보기 */
  start?: { type?: FacilityType; partner?: boolean; facilityId?: string } | null
}) {
  const [groupId, setGroupId] = useState<string | null>(null)
  const [type, setType] = useState<FacilityType | 'all'>('all')
  /** 큰 분류 안에서 종류를 고르지 않고 '전체 보기'를 눌렀을 때 */
  const [groupAll, setGroupAll] = useState(false)
  const [partnerOnly, setPartnerOnly] = useState(false)
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [mapType, setMapType] = useState<FacilityType | 'all'>('all')
  const [reviews, setReviews] = useState<ReviewMap>({})

  useEffect(() => { setReviews(loadReviews()) }, [])

  useEffect(() => {
    if (!start) return
    if (start.type) {
      setGroupId(groupOfType(start.type)?.id ?? null)
      setType(start.type)
      setGroupAll(false)
    }
    if (start.partner) setPartnerOnly(true)
    // 피드 글의 📍 장소를 눌러 들어오면 그 시설 화면을 바로 열어요
    const target = start.facilityId ? FACILITIES.find(f => f.id === start.facilityId) : null
    if (target) {
      setGroupId(groupOfType(target.type)?.id ?? null)
      setType(target.type)
      setOpenId(target.id)
    }
  }, [start])

  // 내 위치 — 지금 있는 곳에서 가까운 시설을 먼저 보여줘요. 위치를 허용하지 않으면 예전 순서 그대로예요.
  const [here, setHere] = useState<LatLng | null>(null)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    let alive = true
    navigator.geolocation.getCurrentPosition(
      pos => {
        if (!alive) return
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setHere(p)
        onLocated?.(p)
      },
      () => {},
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 },
    )
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAddReview = useCallback((facilityId: string, rating: number, text: string, images: string[], keywords: string[]) => {
    const next = addReview(reviews, {
      id: `rv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      facilityId, authorId: userId, authorName: userName,
      rating, text, images, keywords, createdAt: new Date().toISOString(),
    })
    if (!saveReviews(next)) return false
    setReviews(next)
    return true
  }, [reviews, userId, userName])

  const handleDeleteReview = useCallback((facilityId: string, reviewId: string) => {
    const next = removeReview(reviews, facilityId, reviewId)
    saveReviews(next)
    setReviews(next)
  }, [reviews])

  // 종류·제휴·검색 조건 (지도는 지역을 직접 고르니까 지역 조건은 빼요)
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase()
    return FACILITIES
      .filter(f => !partnerOnly || !!f.ludia)
      .filter(f => !q || `${f.name} ${f.description} ${f.address} ${placeLabel(f.place)} ${FACILITY_TYPE_META[f.type].label}`.toLowerCase().includes(q))
      // 내 위치를 알면 가까운 곳부터, 모르면 제휴 할인 시설을 먼저
      .sort((a, b) => here
        ? kmBetween(here, a) - kmBetween(here, b)
        : Number(!!b.ludia) - Number(!!a.ludia))
  }, [partnerOnly, query, here])

  const group = FACILITY_GROUPS.find(g => g.id === groupId) ?? null
  const inPlace = useMemo(() => searched.filter(f => matchesPlace(f, place)), [searched, place])
  const list = useMemo(
    () => inPlace.filter(f => type === 'all' ? (!group || group.types.includes(f.type)) : f.type === type),
    [inPlace, type, group],
  )
  // 검색어가 없고 큰 분류도 안 골랐으면 분류 카드부터 보여줘요
  const showGroups = !group && !query.trim()
  // 큰 분류를 고른 뒤에는 그 안의 시설 종류 카드를 보여줘요 (스포츠 → 스포츠센터·수영장…)
  const showTypes = !!group && type === 'all' && !groupAll && !query.trim()
  function openGroup(id: string | null) {
    const g = FACILITY_GROUPS.find(x => x.id === id)
    setGroupId(id); setGroupAll(false)
    // 종류가 하나뿐인 분류(네일·요리)는 카드 없이 바로 목록으로
    setType(g && g.types.length === 1 ? g.types[0] : 'all')
  }
  function goBack() {
    if (group && group.types.length > 1 && (type !== 'all' || groupAll)) { setType('all'); setGroupAll(false) }
    else openGroup(null)
  }

  // 지도: 고른 종목을 할 수 있는 곳은 시설 종류와 상관없이 다 보여줘요 (예: 배드민턴 → 배드민턴장 + 스포츠센터)
  const mapItems = useMemo(
    () => mapType === 'all' ? searched : searched.filter(f => matchesMapType(f, mapType)),
    [searched, mapType],
  )
  const osm = useMemo(
    () => osmSupportsType(mapType)
      ? { key: mapType, fetch: (b: Bounds) => fetchOsmByType(b, mapType) }
      : null,
    [mapType],
  )
  // 목록에서 고른 종류 그대로, 분류만 골랐으면 그 분류의 첫 종류로 지도를 열어요
  const openMap = () => { setMapType(type !== 'all' ? type : group && group.id !== 'sports' ? group.types[0] : 'all'); setShowMap(true) }
  const opened = FACILITIES.find(f => f.id === openId) ?? null
  const placeIsSet = place.country !== ANY

  const locate = useCallback((f: Facility): MapLocation => ({
    key: f.id, lat: f.lat, lng: f.lng, country: f.place.country,
    label: f.name.replace(/ \(예시\)$/, ''), title: `${FACILITY_TYPE_META[f.type].emoji} ${f.name}`,
  }), [])
  const badge = useCallback((items: Facility[]) => FACILITY_TYPE_META[items[0].type].emoji, [])

  return (
    <>
      <div className="px-4 pt-3 pb-2 max-w-lg mx-auto space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="시설·코스·동네 검색..."
            className="w-full pl-9 pr-9 py-2 rounded-2xl text-sm bg-slate-100 border-none outline-none placeholder-slate-400 text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-200 transition-all" />
          {query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-slate-400" /></button>}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onPickPlace}
            className="flex-1 min-w-0 flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[12.5px] font-bold transition-colors"
            style={placeIsSet ? { background: 'rgba(244,63,117,0.1)', color: '#e11d5a' } : { background: '#f1f5f9', color: '#475569' }}>
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{placeText}</span>
            <span className="ml-auto text-[11px] font-semibold opacity-60 flex-shrink-0">바꾸기</span>
          </button>
          {onBackHome && (
            <button onClick={onBackHome} className="px-3 py-2 rounded-2xl text-[12.5px] font-bold bg-slate-100 text-slate-600 flex-shrink-0">
              내 동네로
            </button>
          )}
          <button onClick={() => setPartnerOnly(v => !v)}
            className="flex items-center gap-1 px-3 py-2 rounded-2xl text-[12.5px] font-bold flex-shrink-0 transition-colors"
            style={partnerOnly ? { background: 'rgba(244,63,117,0.12)', color: '#e11d5a' } : { background: '#f1f5f9', color: '#475569' }}>
            <BadgePercent className="w-3.5 h-3.5" /> 할인
          </button>
          <button onClick={openMap}
            className="flex items-center gap-1 px-3 py-2 rounded-2xl text-[12.5px] font-bold flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.1)', color: '#4f46e5' }}>
            <MapIcon className="w-3.5 h-3.5" /> 지도
          </button>
        </div>
      </div>

      {group && (
        <div className="px-4 pb-3 max-w-lg mx-auto">
          <div className="flex items-center gap-1.5">
            <button onClick={goBack} aria-label="뒤로"
              className="p-1 -ml-1 rounded-full hover:bg-slate-100"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
            <button onClick={() => group.types.length > 1 ? (setType('all'), setGroupAll(false)) : openGroup(null)}
              className={`text-[15px] font-bold ${showTypes ? 'text-slate-800' : 'text-slate-400'}`}>
              {group.emoji} {group.label}
            </button>
            {!showTypes && (
              <>
                <ChevronRight className="w-4 h-4 text-slate-300" />
                <p className="text-[15px] font-bold text-slate-800">
                  {type === 'all' ? '전체' : `${FACILITY_TYPE_META[type].emoji} ${FACILITY_TYPE_META[type].label}`}
                </p>
              </>
            )}
          </div>
          {!showTypes && group.types.length > 1 && (
            <div className="mt-2 flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4">
              {group.types.map(t => {
                const on = t === type
                const meta = FACILITY_TYPE_META[t]
                return (
                  <button key={t} onClick={() => { setType(t); setGroupAll(false) }} aria-pressed={on}
                    className="h-8 px-3 rounded-full flex items-center gap-1 text-[12.5px] font-semibold border whitespace-nowrap flex-shrink-0 transition-all active:scale-95"
                    style={on ? { background: meta.bg, borderColor: meta.color, color: meta.color } : { background: '#fff', borderColor: '#e2e8f0', color: '#475569' }}>
                    {meta.emoji} {meta.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-3 border-t border-slate-100" style={{ background: '#fafafa' }}>
        <div className="flex items-center gap-2 mb-3 px-3.5 py-2.5 rounded-2xl"
          style={{ background: 'linear-gradient(135deg,#fff1f5,#f5f0ff)', border: '1px solid rgba(244,63,117,0.12)' }}>
          <BadgePercent className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <p className="flex-1 min-w-0 text-[12px] text-slate-600 leading-snug">
            {isMember
              ? <>루디아 회원이라 <b className="text-rose-500">제휴 시설 회원가</b>로 이용할 수 있어요</>
              : <>루디아 회원으로 가입하면 <b className="text-rose-500">제휴 시설 할인</b>을 받을 수 있어요</>}
          </p>
        </div>

        {showGroups ? (
          <div className="grid grid-cols-2 gap-2.5">
            {FACILITY_GROUPS.map(g => {
              const n = inPlace.filter(f => g.types.includes(f.type)).length
              return (
                <button key={g.id} onClick={() => openGroup(g.id)}
                  className="text-left rounded-2xl p-3.5 border border-white shadow-sm active:scale-[0.98] transition-transform"
                  style={{ background: g.gradient }}>
                  <span className="text-[26px] leading-none">{g.emoji}</span>
                  <p className="mt-2 text-[14.5px] font-bold text-slate-800">{g.label}</p>
                  <p className="text-[11.5px] text-slate-600 leading-snug">{g.desc}</p>
                  <p className="mt-1.5 text-[11px] font-semibold text-slate-500">{n > 0 ? `${n}곳` : '준비 중'}</p>
                </button>
              )
            })}
          </div>
        ) : showTypes && group ? (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              {group.types.map(t => {
                const meta = FACILITY_TYPE_META[t]
                const n = inPlace.filter(f => f.type === t).length
                return (
                  <button key={t} onClick={() => setType(t)}
                    className="text-left rounded-2xl p-3.5 bg-white border shadow-sm active:scale-[0.98] transition-transform"
                    style={{ borderColor: meta.bg }}>
                    <span className="w-11 h-11 rounded-xl flex items-center justify-center text-[24px]" style={{ background: meta.bg }}>
                      {meta.emoji}
                    </span>
                    <p className="mt-2 text-[14px] font-bold" style={{ color: meta.color }}>{meta.label}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{n > 0 ? `${n}곳` : '준비 중'}</p>
                  </button>
                )
              })}
            </div>
            <button onClick={() => setGroupAll(true)}
              className="mt-3 w-full py-2.5 rounded-2xl bg-white border border-slate-200 text-[12.5px] font-bold text-slate-600">
              {group.label} 전체 {list.length}곳 보기
            </button>
          </>
        ) : list.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🗺️</p>
            <p className="text-sm text-slate-400 font-medium">이 조건에 맞는 등록 시설이 아직 없어요</p>
            <button onClick={openMap} className="mt-3 text-xs font-bold text-indigo-500">
              지도에서 주변 실제 시설 찾아보기
            </button>
          </div>
        ) : (
          <>
            <p className="text-[11.5px] text-slate-400 mb-2 px-1">{list.length}곳{here && ' · 내 위치에서 가까운 순'}</p>
            {list.map(f => <FacilityCard key={f.id} f={f} isMember={isMember} reviews={reviews[f.id]}
              awayKm={here ? kmBetween(here, f) : undefined} onOpen={() => setOpenId(f.id)} />)}
          </>
        )}
      </div>

      {showMap && (
        <PlaceMap<Facility>
          title="🗺️ 지도로 시설 찾기"
          items={mapItems}
          locate={locate}
          markerBadge={badge}
          toolbar={<MapTypeChips value={mapType} onChange={setMapType} />}
          filterKey={mapType}
          hint="핀을 누르면 이용료·할인 정보를 볼 수 있어요"
          emptyText={mapType === 'all' ? '조건에 맞는 등록 시설이 없어요' : `등록된 ${FACILITY_TYPE_META[mapType].label}이(가) 아직 없어요`}
          osm={osm}
          focus={homeCenter}
          onClose={() => setShowMap(false)}
          renderItem={f => <FacilityCard f={f} isMember={isMember} reviews={reviews[f.id]} onOpen={() => setOpenId(f.id)} />}
        />
      )}

      {opened && (
        <FacilityDetail f={opened} isMember={isMember}
          reviews={reviews[opened.id] ?? []} userId={userId}
          onAddReview={(rating, text, images, keywords) => handleAddReview(opened.id, rating, text, images, keywords)}
          onDeleteReview={id => handleDeleteReview(opened.id, id)}
          onClose={() => setOpenId(null)}
          onShowGroups={c => { setOpenId(null); setShowMap(false); onShowGroups(c) }} />
      )}
    </>
  )
}
