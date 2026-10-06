'use client'

// ── 시설 찾기 ───────────────────────────────────────────────────────────────
//
// 스포츠센터·수영장·코트·걷기 코스·공유 주방 같은 장소를 이용료, 루디아 회원 할인과 함께 보여줘요.
// 목록과 지도 두 가지로 볼 수 있고, 지도에서는 OpenStreetMap 의 실제 주변 시설도 찾아볼 수 있어요.

import { useCallback, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  Search, X, MapPin, Clock, ChevronRight, Map as MapIcon, Navigation, BadgePercent, Footprints, Users,
} from 'lucide-react'
import {
  FACILITIES, FACILITY_TYPE_META, ALL_FACILITY_TYPES, formatPrice, discountRate,
  type Facility, type FacilityType,
} from '@/data/facilityData'
import { CATEGORY_META, type MeetupCategory } from '@/data/meetupData'
import { ANY, flagOf, placeLabel, type PlaceRef } from '@/data/regionData'
import { osmDirectionsUrl } from '@/lib/osm-facilities'
import type { MapLocation } from '@/components/community/PlaceMap'

const PlaceMap = dynamic(() => import('@/components/community/PlaceMap'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[45] flex items-center justify-center bg-white">
      <p className="text-sm text-slate-400">지도를 불러오는 중…</p>
    </div>
  ),
}) as typeof import('@/components/community/PlaceMap').default

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

export function FacilityCard({ f, isMember, onOpen }: { f: Facility; isMember: boolean; onOpen: () => void }) {
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
        </div>
      </div>
    </button>
  )
}

// ── 시설 상세 ──────────────────────────────────────────────────────────────

function FacilityDetail({ f, isMember, onClose, onShowGroups }: {
  f: Facility; isMember: boolean; onClose: () => void; onShowGroups: (c: MeetupCategory) => void
}) {
  const meta = FACILITY_TYPE_META[f.type]
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" style={{ background: 'rgba(15,23,42,0.45)' }} onClick={onClose}>
      <div className="w-full sm:max-w-lg max-h-[88vh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 px-5 pt-5 pb-3 border-b border-slate-100 flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: meta.bg }}>{meta.emoji}</div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-slate-900">{f.name}</p>
            <p className="text-[12px] text-slate-400 mt-0.5">{meta.label} · {flagOf(f.place.country)} {placeLabel(f.place, { withFlag: false })}</p>
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
          </div>

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

          <div>
            <p className="text-[11.5px] font-bold text-slate-500 mb-1.5">여기서 할 수 있는 모임</p>
            <div className="flex flex-wrap gap-1.5">
              {meta.categories.map(c => (
                <button key={c} onClick={() => onShowGroups(c)}
                  className="flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-1 rounded-full border"
                  style={{ background: CATEGORY_META[c].bg, borderColor: CATEGORY_META[c].color, color: CATEGORY_META[c].color }}>
                  <Users className="w-3 h-3" /> {CATEGORY_META[c].emoji} {CATEGORY_META[c].label} 모임 보기
                </button>
              ))}
            </div>
          </div>

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

export default function FacilityExplorer({ place, placeText, isMember, onPickPlace, onClearPlace, onShowGroups }: {
  place: PlaceRef                 // 모임 찾기와 같은 지역 필터를 써요
  placeText: string
  isMember: boolean
  onPickPlace: () => void
  onClearPlace: () => void
  onShowGroups: (c: MeetupCategory) => void
}) {
  const [type, setType] = useState<FacilityType | 'all'>('all')
  const [partnerOnly, setPartnerOnly] = useState(false)
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(false)

  // 종류·제휴·검색 조건 (지도는 지역을 직접 고르니까 지역 조건은 빼요)
  const topicFiltered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return FACILITIES
      .filter(f => type === 'all' || f.type === type)
      .filter(f => !partnerOnly || !!f.ludia)
      .filter(f => !q || `${f.name} ${f.description} ${f.address} ${placeLabel(f.place)} ${FACILITY_TYPE_META[f.type].label}`.toLowerCase().includes(q))
      // 제휴 할인 시설을 먼저
      .sort((a, b) => Number(!!b.ludia) - Number(!!a.ludia))
  }, [type, partnerOnly, query])

  const list = useMemo(() => topicFiltered.filter(f => matchesPlace(f, place)), [topicFiltered, place])
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
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
          </button>
          {placeIsSet && (
            <button onClick={onClearPlace} className="px-2.5 py-2 rounded-2xl bg-slate-100 text-slate-500 flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => setPartnerOnly(v => !v)}
            className="flex items-center gap-1 px-3 py-2 rounded-2xl text-[12.5px] font-bold flex-shrink-0 transition-colors"
            style={partnerOnly ? { background: 'rgba(244,63,117,0.12)', color: '#e11d5a' } : { background: '#f1f5f9', color: '#475569' }}>
            <BadgePercent className="w-3.5 h-3.5" /> 할인
          </button>
          <button onClick={() => setShowMap(true)}
            className="flex items-center gap-1 px-3 py-2 rounded-2xl text-[12.5px] font-bold flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.1)', color: '#4f46e5' }}>
            <MapIcon className="w-3.5 h-3.5" /> 지도
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-3 max-w-lg mx-auto">
        <button onClick={() => setType('all')}
          className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all"
          style={type === 'all' ? { background: '#1e293b', borderColor: '#1e293b', color: '#fff' } : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#94a3b8' }}>
          🏠 전체
        </button>
        {ALL_FACILITY_TYPES.map(t => {
          const meta = FACILITY_TYPE_META[t]
          const on = type === t
          return (
            <button key={t} onClick={() => setType(t)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all"
              style={on ? { background: meta.bg, borderColor: meta.color, color: meta.color } : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#94a3b8' }}>
              {meta.emoji} {meta.label}
            </button>
          )
        })}
      </div>

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

        {list.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🗺️</p>
            <p className="text-sm text-slate-400 font-medium">이 조건에 맞는 등록 시설이 아직 없어요</p>
            <button onClick={() => setShowMap(true)} className="mt-3 text-xs font-bold text-indigo-500">
              지도에서 주변 실제 시설 찾아보기
            </button>
          </div>
        ) : (
          <>
            <p className="text-[11.5px] text-slate-400 mb-2 px-1">{list.length}곳</p>
            {list.map(f => <FacilityCard key={f.id} f={f} isMember={isMember} onOpen={() => setOpenId(f.id)} />)}
          </>
        )}
      </div>

      {showMap && (
        <PlaceMap<Facility>
          title="🗺️ 지도로 시설 찾기"
          items={topicFiltered}
          locate={locate}
          markerBadge={badge}
          hint="핀을 누르면 이용료·할인 정보를 볼 수 있어요"
          emptyText="조건에 맞는 등록 시설이 없어요"
          osmNearby
          onClose={() => setShowMap(false)}
          renderItem={f => <FacilityCard f={f} isMember={isMember} onOpen={() => setOpenId(f.id)} />}
        />
      )}

      {opened && (
        <FacilityDetail f={opened} isMember={isMember} onClose={() => setOpenId(null)}
          onShowGroups={c => { setOpenId(null); setShowMap(false); onShowGroups(c) }} />
      )}
    </>
  )
}
