// ── 도시 좌표 (모임 지도용) ─────────────────────────────────────────────────
//
// regionData 의 도시마다 대략적인 중심 좌표 [위도, 경도] 를 담아요.
// 모임은 도시 단위로 저장되므로 지도 핀도 도시 중심에 찍혀요.
// 키: `${국가코드}/${도시id}`

import { COUNTRIES, type PlaceRef } from '@/data/regionData'

const REGION_OF_CITY: Record<string, string> = Object.fromEntries(
  COUNTRIES.flatMap(c => c.regions.flatMap(r => r.cities.map(ct => [ct.id, r.id]))),
)

export const CITY_COORDS: Record<string, [number, number]> = {
  // ── 대한민국 ──
  'KR/gangnam': [37.5172, 127.0473], 'KR/seocho': [37.4837, 127.0324], 'KR/songpa': [37.5145, 127.1059],
  'KR/mapo': [37.5663, 126.9019], 'KR/yongsan': [37.5326, 126.9905], 'KR/seongdong': [37.5634, 127.0369],
  'KR/yeongdeungpo': [37.5264, 126.8962], 'KR/jongno': [37.5735, 126.9790], 'KR/jung': [37.5641, 126.9979],
  'KR/gwanak': [37.4784, 126.9516], 'KR/nowon': [37.6542, 127.0568], 'KR/gangseo': [37.5509, 126.8495],
  'KR/seongnam': [37.3827, 127.1189], 'KR/suwon': [37.2636, 127.0286], 'KR/goyang': [37.6584, 126.8320],
  'KR/yongin': [37.2411, 127.1776], 'KR/anyang': [37.3943, 126.9568], 'KR/bucheon': [37.5034, 126.7660],
  'KR/hwaseong': [37.2006, 127.0742], 'KR/namyangju': [37.6360, 127.2165],
  'KR/songdo': [37.3826, 126.6566], 'KR/bupyeong': [37.5070, 126.7219], 'KR/cheongna': [37.5347, 126.6496],
  'KR/guwol': [37.4486, 126.7052],
  'KR/haeundae': [35.1631, 129.1636], 'KR/seomyeon': [35.1578, 129.0600], 'KR/gwangalli': [35.1532, 129.1186],
  'KR/nampo': [35.0979, 129.0306],
  'KR/suseong': [35.8582, 128.6306], 'KR/dalseo': [35.8299, 128.5327], 'KR/jung-daegu': [35.8693, 128.6062],
  'KR/yuseong': [36.3622, 127.3561], 'KR/seo-daejeon': [36.3553, 127.3838], 'KR/jung-daejeon': [36.3258, 127.4214], 'KR/dong-daejeon': [36.3119, 127.4548], 'KR/daedeok': [36.3466, 127.4156], 'KR/sejong': [36.4800, 127.2890],
  'KR/sangmu': [35.1520, 126.8490], 'KR/cheomdan': [35.2190, 126.8470], 'KR/dong-gwangju': [35.1460, 126.9232], 'KR/seo-gwangju': [35.1520, 126.8899], 'KR/nam-gwangju': [35.1330, 126.9025], 'KR/buk-gwangju': [35.1740, 126.9120], 'KR/gwangsan': [35.1395, 126.7937],
  'KR/nam-ulsan': [35.5439, 129.3300], 'KR/ulju': [35.5622, 129.1427],
  'KR/chuncheon': [37.8813, 127.7298], 'KR/gangneung': [37.7519, 128.8761], 'KR/sokcho': [38.2070, 128.5918],
  'KR/wonju': [37.3422, 127.9202],
  'KR/cheongju': [36.6424, 127.4890], 'KR/cheonan': [36.8151, 127.1139], 'KR/chungju': [36.9910, 127.9259],
  'KR/jeonju': [35.8242, 127.1480], 'KR/yeosu': [34.7604, 127.6622], 'KR/suncheon': [34.9506, 127.4872],
  'KR/gunsan': [35.9676, 126.7366],
  'KR/changwon': [35.2280, 128.6811], 'KR/pohang': [36.0190, 129.3435], 'KR/gyeongju': [35.8562, 129.2247],
  'KR/gimhae': [35.2285, 128.8894],
  'KR/jejusi': [33.4996, 126.5312], 'KR/seogwipo': [33.2541, 126.5600],
}

/** 모임 장소의 좌표. 도시가 없거나 좌표를 모르면 null */
export function coordsOf(place: Pick<PlaceRef, 'country' | 'city'>): [number, number] | null {
  return CITY_COORDS[`${place.country}/${place.city}`] ?? null
}

/** 지금 위치에서 가장 가까운 동네(시·구). 한국 밖이거나 너무 멀면(50km 넘게) null */
export function nearestCity(lat: number, lng: number): PlaceRef | null {
  let best: string | null = null
  let bestD = Infinity
  for (const [key, [la, ln]] of Object.entries(CITY_COORDS)) {
    const dLat = (la - lat) * 111
    const dLng = (ln - lng) * 111 * Math.cos(lat * Math.PI / 180)
    const d = Math.hypot(dLat, dLng)
    if (d < bestD) { bestD = d; best = key }
  }
  if (!best || bestD > 50) return null
  const [country, city] = best.split('/')
  const region = REGION_OF_CITY[city]
  return region ? { country, region, city } : null
}

