'use client'

// ── 장소 지도 (모임 · 운동 시설 공용) ─────────────────────────────────────────
//
// 멀리서 보면 가까운 장소끼리 묶여 숫자로 보이고, 확대할수록 나라 → 지역 → 도시 → 장소 단위로
// 나뉘어요. 핀을 누르면 그곳 항목 목록이 아래에서 올라와요.
// osm 을 넘기면 OpenStreetMap 에 등록된 실제 주변 운동 시설도 불러올 수 있어요.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { X, LocateFixed, Loader2 } from 'lucide-react'
import { flagOf } from '@/data/regionData'
import { osmDirectionsUrl, type Bounds, type OsmFacility } from '@/lib/osm-facilities'

export interface MapLocation {
  key: string       // 같은 key 끼리 한 핀으로 묶여요 (모임은 도시, 시설은 시설 하나)
  lat: number
  lng: number
  country: string
  label: string     // 핀 아래 이름표
  title: string     // 목록 시트 제목
}

interface Point<T> extends MapLocation {
  latlng: L.LatLng
  items: T[]
}

interface Cluster<T> {
  points: Point<T>[]
  count: number
  latlng: L.LatLng
}

const CLUSTER_RADIUS_PX = 56
const OSM_MIN_ZOOM = 12

/** 화면상 가까운 장소끼리 묶어요 (줌이 바뀔 때마다 다시 계산) */
function clusterPoints<T>(map: L.Map, points: Point<T>[]): Cluster<T>[] {
  const clusters: (Cluster<T> & { px: L.Point })[] = []
  // 항목이 많은 곳을 중심으로 먼저 잡아요
  for (const p of [...points].sort((a, b) => b.items.length - a.items.length)) {
    const px = map.latLngToLayerPoint(p.latlng)
    const near = clusters.find(c => c.px.distanceTo(px) < CLUSTER_RADIUS_PX)
    if (near) {
      near.points.push(p)
      near.count += p.items.length
    } else {
      clusters.push({ points: [p], count: p.items.length, latlng: p.latlng, px })
    }
  }
  return clusters
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!))
}

function clusterIcon<T>(c: Cluster<T>, badge?: (items: T[]) => string): L.DivIcon {
  const countries = new Set(c.points.map(p => p.country))
  const flag = countries.size === 1 ? flagOf(c.points[0].country) : '🌏'
  const single = c.points.length === 1
  const size = Math.min(64, 38 + Math.round(Math.log2(c.count + 1) * 6))
  const text = single && badge ? badge(c.points[0].items) : String(c.count)
  const label = single ? escapeHtml(c.points[0].label) : ''
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;
        border-radius:9999px;background:linear-gradient(135deg,#f43f75,#a855f7);border:3px solid #fff;
        box-shadow:0 4px 14px rgba(225,29,90,0.4);color:#fff;font-weight:800;font-size:${single && badge ? 18 : 13}px;cursor:pointer;">
        ${single && badge ? '' : `<span style="position:absolute;top:-8px;left:-6px;font-size:15px;">${flag}</span>`}
        ${text}
        ${label ? `<span style="position:absolute;top:${size + 2}px;left:50%;transform:translateX(-50%);white-space:nowrap;
          max-width:160px;overflow:hidden;text-overflow:ellipsis;
          font-size:11px;font-weight:700;color:#334155;background:rgba(255,255,255,0.92);padding:1px 6px;border-radius:8px;
          box-shadow:0 1px 4px rgba(0,0,0,0.12);">${label}</span>` : ''}
      </div>`,
  })
}

function osmIcon(f: OsmFacility): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `<div style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:9999px;
      background:#fff;border:2px solid #64748b;box-shadow:0 2px 8px rgba(15,23,42,0.25);font-size:15px;cursor:pointer;">${f.emoji}</div>`,
  })
}

function osmPopup(f: OsmFacility): string {
  return `
    <div style="min-width:180px;font-family:inherit;">
      <p style="margin:0;font-size:13px;font-weight:800;color:#0f172a;">${f.emoji} ${escapeHtml(f.name)}</p>
      <p style="margin:2px 0 0;font-size:11px;color:#64748b;">${escapeHtml(f.kind)}${f.access ? ` · ${escapeHtml(f.access)}` : ''}</p>
      ${f.hours ? `<p style="margin:4px 0 0;font-size:11px;color:#475569;">🕘 ${escapeHtml(f.hours)}</p>` : ''}
      <p style="margin:6px 0 0;font-size:10.5px;color:#94a3b8;">OpenStreetMap 정보 · 이용료는 시설에 확인해 주세요</p>
      <a href="${osmDirectionsUrl(f)}" target="_blank" rel="noopener noreferrer"
        style="display:inline-block;margin-top:6px;font-size:11.5px;font-weight:700;color:#e11d5a;">길찾기 →</a>
    </div>`
}

export default function PlaceMap<T>({
  title, items, locate, renderItem, markerBadge, extraList, hint, emptyText, countText = n => `${n}곳`,
  osm = null, toolbar, filterKey = '', hidden = false, onClose,
}: {
  title: string
  items: T[]
  locate: (item: T) => MapLocation | null
  renderItem: (item: T) => ReactNode
  /** 장소가 하나뿐인 핀에 숫자 대신 보여줄 글자 (예: 시설 종류 이모지) */
  markerBadge?: (items: T[]) => string
  /** 지도에 찍히지 않는 항목 (예: 온라인 모임) 을 따로 여는 버튼 */
  extraList?: { label: string; title: string; items: T[] }
  hint?: string
  emptyText?: string
  /** 목록 시트 제목 옆 개수 표시 */
  countText?: (n: number) => string
  /** 지도 영역 안의 실제 시설을 불러오는 함수. key 가 바뀌면(예: 종목 변경) 다시 불러와요 */
  osm?: { key: string; fetch: (b: Bounds) => Promise<OsmFacility[]> } | null
  /** 지도 위쪽에 붙는 필터 영역 (예: 종목 칩) */
  toolbar?: ReactNode
  /** 필터가 바뀐 걸 알려주는 값 — 바뀌면 걸러진 장소가 다 보이게 다시 맞춰요 */
  filterKey?: string
  hidden?: boolean               // 상세 화면을 보는 동안 지도 상태를 유지한 채 숨겨요
  onClose: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const osmLayerRef = useRef<L.LayerGroup | null>(null)
  const fittedRef = useRef(false)
  const [zoom, setZoom] = useState(2)
  const [viewTick, setViewTick] = useState(0)
  // 선택한 장소 key — 목록은 최신 데이터로 다시 계산해요
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [osmState, setOsmState] = useState<{ status: 'idle' | 'loading' | 'done' | 'error'; count: number }>({ status: 'idle', count: 0 })
  const [locating, setLocating] = useState(false)

  const EXTRA_KEY = '__extra__'

  const points = useMemo(() => {
    const byKey = new Map<string, Point<T>>()
    for (const item of items) {
      const loc = locate(item)
      if (!loc) continue
      const cur = byKey.get(loc.key)
      if (cur) cur.items.push(item)
      else byKey.set(loc.key, { ...loc, latlng: L.latLng(loc.lat, loc.lng), items: [item] })
    }
    return Array.from(byKey.values())
  }, [items, locate])

  const selected = useMemo(() => {
    if (selectedKey === EXTRA_KEY) return extraList && extraList.items.length ? { title: extraList.title, items: extraList.items } : null
    const p = points.find(x => x.key === selectedKey)
    return p ? { title: p.title, items: p.items } : null
  }, [selectedKey, points, extraList])

  // 지도 생성
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      center: [25, 60], zoom: 2, minZoom: 0.5, maxZoom: 18, zoomSnap: 0.25,
      worldCopyJump: true, zoomControl: false,
    })
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    // OpenStreetMap 기본 타일 — 이용자가 많아지면 상용 타일 제공처(MapTiler 등)로 바꿔야 해요
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)
    osmLayerRef.current = L.layerGroup().addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    map.on('zoomend', () => { setZoom(map.getZoom()); setViewTick(t => t + 1) })
    map.on('moveend', () => setViewTick(t => t + 1))
    map.on('locationfound', e => {
      setLocating(false)
      L.circleMarker(e.latlng, { radius: 8, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).addTo(map)
    })
    map.on('locationerror', () => setLocating(false))
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null; layerRef.current = null; osmLayerRef.current = null
      fittedRef.current = false
    }
  }, [])

  const osmRef = useRef(osm)
  osmRef.current = osm

  const loadOsm = useCallback(async () => {
    const map = mapRef.current, layer = osmLayerRef.current, source = osmRef.current
    if (!map || !layer || !source) return
    setOsmState({ status: 'loading', count: 0 })
    try {
      const b = map.getBounds()
      const list = await source.fetch({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() })
      if (osmRef.current?.key !== source.key) return   // 불러오는 사이 종목이 바뀌었어요
      layer.clearLayers()
      for (const f of list) {
        L.marker([f.lat, f.lng], { icon: osmIcon(f) }).bindPopup(osmPopup(f)).addTo(layer)
      }
      setOsmState({ status: 'done', count: list.length })
    } catch {
      if (osmRef.current?.key === source.key) setOsmState({ status: 'error', count: 0 })
    }
  }, [])

  // 필터(종목)가 바뀌면: 동네를 보고 있으면 그 자리에서 실제 시설을 다시 찾고,
  // 아니면 걸러진 등록 장소가 다 보이게 지도를 다시 맞춰요
  const prevFilterKey = useRef(filterKey)
  useEffect(() => {
    if (prevFilterKey.current === filterKey) return
    prevFilterKey.current = filterKey
    setSelectedKey(null)
    osmLayerRef.current?.clearLayers()
    setOsmState({ status: 'idle', count: 0 })
    const map = mapRef.current
    if (map && osmRef.current && map.getZoom() >= OSM_MIN_ZOOM) loadOsm()
    else fittedRef.current = false
  }, [filterKey, loadOsm])

  // 처음 열릴 때 (또는 필터가 바뀐 뒤) 항목이 있는 곳이 다 보이게 맞춰요
  useEffect(() => {
    const map = mapRef.current
    if (!map || fittedRef.current || points.length === 0) return
    fittedRef.current = true
    map.fitBounds(L.latLngBounds(points.map(p => p.latlng)), { padding: [36, 36], maxZoom: 13 })
  }, [points])

  // 숨겼다가 다시 보이면 지도 크기를 다시 계산해요
  useEffect(() => {
    if (!hidden) mapRef.current?.invalidateSize()
  }, [hidden])

  // 마커 그리기 (줌이 바뀔 때만 다시 묶어요)
  useEffect(() => {
    const map = mapRef.current, layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    for (const c of clusterPoints(map, points)) {
      const marker = L.marker(c.latlng, { icon: clusterIcon(c, markerBadge), zIndexOffset: 1000 })
      marker.on('click', () => {
        if (c.points.length === 1) {
          const p = c.points[0]
          setSelectedKey(p.key)
          map.setView(p.latlng, Math.max(map.getZoom(), 12), { animate: true })
        } else {
          // 여러 곳이 묶여 있으면 그 영역으로 확대해요
          setSelectedKey(null)
          map.fitBounds(L.latLngBounds(c.points.map(p => p.latlng)), { padding: [60, 60], maxZoom: 16 })
        }
      })
      layer.addLayer(marker)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, zoom, markerBadge])

  // 화면이 움직이면 이전에 불러온 주변 시설 안내 상태를 초기화해요 (핀은 그대로 둬요)
  useEffect(() => {
    setOsmState(s => (s.status === 'done' || s.status === 'error' ? { status: 'idle', count: s.count } : s))
  }, [viewTick])

  const locateMe = () => {
    const map = mapRef.current
    if (!map) return
    setLocating(true)
    map.locate({ setView: true, maxZoom: 14 })
  }

  return (
    <div className={`fixed inset-0 z-[45] flex flex-col bg-white ${hidden ? 'hidden' : ''}`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <p className="flex-1 text-[15px] font-bold text-slate-800">{title}</p>
        <button onClick={onClose} aria-label="닫기" className="p-1 rounded-full hover:bg-slate-100">
          <X className="w-6 h-6 text-slate-600" />
        </button>
      </div>

      {toolbar && <div className="flex-shrink-0 border-b border-slate-100">{toolbar}</div>}

      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="absolute inset-0 z-0" style={{ background: '#aad3df' }} />

        <div className="absolute top-3 left-3 right-3 z-[500] flex items-start justify-between gap-2 pointer-events-none">
          <div className="flex flex-col items-start gap-1.5">
            {hint && (
              <p className="px-3 py-1.5 rounded-full text-[11.5px] font-semibold text-slate-600 bg-white/90 shadow-sm">{hint}</p>
            )}
            {osm && (
              zoom < OSM_MIN_ZOOM ? (
                <p className="px-3 py-1.5 rounded-full text-[11px] font-semibold text-slate-500 bg-white/90 shadow-sm">
                  동네까지 확대하면 주변 실제 시설도 찾을 수 있어요
                </p>
              ) : (
                <button onClick={loadOsm} disabled={osmState.status === 'loading'}
                  className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-bold shadow-sm bg-slate-800 text-white disabled:opacity-80">
                  {osmState.status === 'loading'
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 주변 시설 찾는 중…</>
                    : osmState.status === 'done'
                      ? <>🔎 이 지역 시설 {osmState.count}곳 표시됨</>
                      : osmState.status === 'error'
                        ? <>⚠️ 불러오지 못했어요 · 다시 시도</>
                        : <>🔎 이 지역 실제 운동 시설 찾기</>}
                </button>
              )
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {extraList && extraList.items.length > 0 && (
              <button onClick={() => setSelectedKey(EXTRA_KEY)}
                className="pointer-events-auto px-3 py-1.5 rounded-full text-[11.5px] font-bold shadow-sm"
                style={{ background: 'rgba(37,99,235,0.95)', color: '#fff' }}>
                {extraList.label}
              </button>
            )}
            <button onClick={locateMe} aria-label="내 위치"
              className="pointer-events-auto w-9 h-9 rounded-full flex items-center justify-center bg-white shadow-md text-slate-600">
              {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {points.length === 0 && emptyText && (
          <div className="absolute inset-x-0 top-28 z-[500] flex justify-center pointer-events-none">
            <p className="px-4 py-2 rounded-2xl text-sm text-slate-500 bg-white/95 shadow">{emptyText}</p>
          </div>
        )}

        {selected && (
          <div className="absolute inset-x-0 bottom-0 z-[600] max-h-[55%] flex flex-col bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
            <div className="flex items-center gap-2 px-5 pt-4 pb-2 flex-shrink-0">
              <p className="flex-1 text-sm font-bold text-slate-800 truncate">
                {selected.title} <span className="text-rose-500">· {countText(selected.items.length)}</span>
              </p>
              <button onClick={() => setSelectedKey(null)} aria-label="목록 닫기" className="p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
              {selected.items.map((item, i) => <div key={i}>{renderItem(item)}</div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
