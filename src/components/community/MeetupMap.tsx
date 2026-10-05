'use client'

// ── 모임 지도 ───────────────────────────────────────────────────────────────
//
// 전 세계 모임을 지도에 보여줘요. 멀리서 보면 가까운 도시끼리 묶여 숫자로 보이고,
// 확대할수록 나라 → 지역 → 도시 단위로 나뉘어요. 도시 핀을 누르면 그곳 모임 목록이 떠요.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { X, Globe } from 'lucide-react'
import type { MeetupGroup } from '@/data/meetupData'
import { coordsOf } from '@/data/regionCoords'
import { ONLINE_CODE, flagOf, placeLabel } from '@/data/regionData'

interface CityPoint {
  key: string
  latlng: L.LatLng
  country: string
  label: string
  groups: MeetupGroup[]
}

interface Cluster {
  points: CityPoint[]
  count: number
  latlng: L.LatLng
}

const CLUSTER_RADIUS_PX = 56

/** 화면상 가까운 도시끼리 묶어요 (줌이 바뀔 때마다 다시 계산) */
function clusterPoints(map: L.Map, points: CityPoint[]): Cluster[] {
  const clusters: (Cluster & { px: L.Point })[] = []
  // 모임이 많은 도시를 중심으로 먼저 잡아요
  for (const p of [...points].sort((a, b) => b.groups.length - a.groups.length)) {
    const px = map.latLngToLayerPoint(p.latlng)
    const near = clusters.find(c => c.px.distanceTo(px) < CLUSTER_RADIUS_PX)
    if (near) {
      near.points.push(p)
      near.count += p.groups.length
    } else {
      clusters.push({ points: [p], count: p.groups.length, latlng: p.latlng, px })
    }
  }
  return clusters
}

function clusterIcon(c: Cluster): L.DivIcon {
  const countries = new Set(c.points.map(p => p.country))
  const flag = countries.size === 1 ? flagOf(c.points[0].country) : '🌏'
  const single = c.points.length === 1
  const size = Math.min(64, 38 + Math.round(Math.log2(c.count + 1) * 6))
  const label = single ? c.points[0].label : ''
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;
        border-radius:9999px;background:linear-gradient(135deg,#f43f75,#a855f7);border:3px solid #fff;
        box-shadow:0 4px 14px rgba(225,29,90,0.4);color:#fff;font-weight:800;font-size:13px;cursor:pointer;">
        <span style="position:absolute;top:-8px;left:-6px;font-size:15px;">${flag}</span>
        ${c.count}
        ${label ? `<span style="position:absolute;top:${size + 2}px;left:50%;transform:translateX(-50%);white-space:nowrap;
          font-size:11px;font-weight:700;color:#334155;background:rgba(255,255,255,0.92);padding:1px 6px;border-radius:8px;
          box-shadow:0 1px 4px rgba(0,0,0,0.12);">${label}</span>` : ''}
      </div>`,
  })
}

export default function MeetupMap({ groups, hidden = false, onClose, renderGroup }: {
  groups: MeetupGroup[]           // 종목·검색으로 걸러진 모임 (지역 필터는 지도에서 고름)
  hidden?: boolean                // 모임 상세를 보는 동안 지도 상태를 유지한 채 숨겨요
  onClose: () => void
  renderGroup: (g: MeetupGroup) => ReactNode
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const fittedRef = useRef(false)
  const [zoomTick, setZoomTick] = useState(0)
  // 선택한 도시 키 (`국가/도시`) 또는 온라인 — 목록은 최신 모임 데이터로 다시 계산해요
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const onlineGroups = useMemo(() => groups.filter(g => g.place.country === ONLINE_CODE), [groups])

  const points = useMemo(() => {
    const byCity = new Map<string, CityPoint>()
    for (const g of groups) {
      if (g.place.country === ONLINE_CODE) continue
      const ll = coordsOf(g.place)
      if (!ll) continue
      const key = `${g.place.country}/${g.place.city}`
      const cur = byCity.get(key)
      if (cur) cur.groups.push(g)
      else byCity.set(key, {
        key, latlng: L.latLng(ll[0], ll[1]), country: g.place.country,
        label: placeLabel(g.place, { short: true, withFlag: false }), groups: [g],
      })
    }
    return Array.from(byCity.values())
  }, [groups])

  const selected = useMemo(() => {
    if (selectedKey === ONLINE_CODE) return onlineGroups.length ? { title: '🌐 온라인 모임', groups: onlineGroups } : null
    const p = points.find(x => x.key === selectedKey)
    return p ? { title: `${flagOf(p.country)} ${placeLabel(p.groups[0].place, { withFlag: false })}`, groups: p.groups } : null
  }, [selectedKey, points, onlineGroups])

  // 지도 생성
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      center: [25, 60], zoom: 2, minZoom: 0.5, maxZoom: 14, zoomSnap: 0.25,
      worldCopyJump: true, zoomControl: false,
    })
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    // OpenStreetMap 기본 타일 — 이용자가 많아지면 상용 타일 제공처(MapTiler 등)로 바꿔야 해요
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    map.on('zoomend', () => setZoomTick(t => t + 1))
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null; layerRef.current = null; fittedRef.current = false }
  }, [])

  // 처음 열릴 때 모임이 있는 곳이 다 보이게 맞춰요
  useEffect(() => {
    const map = mapRef.current
    if (!map || fittedRef.current || points.length === 0) return
    fittedRef.current = true
    map.fitBounds(L.latLngBounds(points.map(p => p.latlng)), { padding: [36, 36], maxZoom: 6 })
  }, [points])

  // 숨겼다가 다시 보이면 지도 크기를 다시 계산해요
  useEffect(() => {
    if (!hidden) mapRef.current?.invalidateSize()
  }, [hidden])

  // 마커 그리기
  useEffect(() => {
    const map = mapRef.current, layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    for (const c of clusterPoints(map, points)) {
      const marker = L.marker(c.latlng, { icon: clusterIcon(c) })
      marker.on('click', () => {
        if (c.points.length === 1) {
          const p = c.points[0]
          setSelectedKey(p.key)
          map.setView(p.latlng, Math.max(map.getZoom(), 10), { animate: true })
        } else {
          // 여러 도시가 묶여 있으면 그 영역으로 확대해요
          setSelectedKey(null)
          map.fitBounds(L.latLngBounds(c.points.map(p => p.latlng)), { padding: [60, 60], maxZoom: 13 })
        }
      })
      layer.addLayer(marker)
    }
  }, [points, zoomTick])

  return (
    <div className={`fixed inset-0 z-[45] flex flex-col bg-white ${hidden ? 'hidden' : ''}`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <p className="flex-1 text-[15px] font-bold text-slate-800">🗺️ 지도로 모임 찾기</p>
        <button onClick={onClose} aria-label="닫기" className="p-1 rounded-full hover:bg-slate-100">
          <X className="w-6 h-6 text-slate-600" />
        </button>
      </div>

      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="absolute inset-0 z-0" style={{ background: '#aad3df' }} />

        <div className="absolute top-3 left-3 right-3 z-[500] flex items-center justify-between gap-2 pointer-events-none">
          <p className="px-3 py-1.5 rounded-full text-[11.5px] font-semibold text-slate-600 bg-white/90 shadow-sm">
            확대하면 지역·도시별로 나뉘어 보여요
          </p>
          {onlineGroups.length > 0 && (
            <button onClick={() => setSelectedKey(ONLINE_CODE)}
              className="pointer-events-auto flex items-center gap-1 px-3 py-1.5 rounded-full text-[11.5px] font-bold shadow-sm"
              style={{ background: 'rgba(37,99,235,0.95)', color: '#fff' }}>
              <Globe className="w-3.5 h-3.5" /> 온라인 모임 {onlineGroups.length}개
            </button>
          )}
        </div>

        {points.length === 0 && (
          <div className="absolute inset-x-0 top-16 z-[500] flex justify-center pointer-events-none">
            <p className="px-4 py-2 rounded-2xl text-sm text-slate-500 bg-white/95 shadow">조건에 맞는 지역 모임이 없어요</p>
          </div>
        )}

        {selected && (
          <div className="absolute inset-x-0 bottom-0 z-[600] max-h-[55%] flex flex-col bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
            <div className="flex items-center gap-2 px-5 pt-4 pb-2 flex-shrink-0">
              <p className="flex-1 text-sm font-bold text-slate-800 truncate">
                {selected.title} <span className="text-rose-500">· 모임 {selected.groups.length}개</span>
              </p>
              <button onClick={() => setSelectedKey(null)} aria-label="목록 닫기" className="p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
              {selected.groups.map(g => <div key={g.id}>{renderGroup(g)}</div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
