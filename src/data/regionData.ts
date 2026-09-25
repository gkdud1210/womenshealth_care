// ── 국가 · 지역 · 도시 데이터 ────────────────────────────────────────────────
//
// 루디아 모임은 국내뿐 아니라 해외 어디에서든 참여할 수 있어요.
// 국가 → 지역(주/도) → 도시 3단계로 나눠서 원하는 곳의 모임을 찾을 수 있어요.

export interface City {
  id: string
  label: string
}

export interface Region {
  id: string
  label: string
  cities: City[]
}

export interface Country {
  code: string
  label: string
  flag: string
  continent: Continent
  regions: Region[]
}

export type Continent = '아시아' | '북미' | '유럽' | '오세아니아' | '중동·아프리카' | '중남미' | '온라인'

export const CONTINENT_ORDER: Continent[] = ['온라인', '아시아', '북미', '유럽', '오세아니아', '중동·아프리카', '중남미']

/** 위치에 매이지 않는 온라인 모임을 나타내는 가상의 국가 코드 */
export const ONLINE_CODE = 'online'
export const ANY = 'all'

const c = (id: string, label: string): City => ({ id, label })

export const COUNTRIES: Country[] = [
  // ── 온라인 ──────────────────────────────────────────────────────────────
  {
    code: ONLINE_CODE, label: '온라인', flag: '🌐', continent: '온라인',
    regions: [
      { id: 'live', label: '실시간 (화상)', cities: [c('zoom', '줌·구글밋'), c('discord', '디스코드')] },
      { id: 'async', label: '자율 참여', cities: [c('challenge', '챌린지·인증방'), c('chat', '오픈채팅')] },
    ],
  },

  // ── 아시아 ──────────────────────────────────────────────────────────────
  {
    code: 'KR', label: '대한민국', flag: '🇰🇷', continent: '아시아',
    regions: [
      { id: 'seoul', label: '서울', cities: [
        c('gangnam', '강남구'), c('seocho', '서초구'), c('songpa', '송파구'), c('mapo', '마포구'),
        c('yongsan', '용산구'), c('seongdong', '성동구'), c('yeongdeungpo', '영등포구'), c('jongno', '종로구'),
        c('jung', '중구'), c('gwanak', '관악구'), c('nowon', '노원구'), c('gangseo', '강서구'),
      ] },
      { id: 'gyeonggi', label: '경기', cities: [
        c('seongnam', '성남·분당'), c('suwon', '수원'), c('goyang', '고양·일산'), c('yongin', '용인'),
        c('anyang', '안양·평촌'), c('bucheon', '부천'), c('hwaseong', '화성·동탄'), c('namyangju', '남양주'),
      ] },
      { id: 'incheon', label: '인천', cities: [c('songdo', '송도'), c('bupyeong', '부평'), c('cheongna', '청라'), c('guwol', '구월·남동')] },
      { id: 'busan', label: '부산', cities: [c('haeundae', '해운대'), c('seomyeon', '서면'), c('gwangalli', '광안리'), c('nampo', '남포·중구')] },
      { id: 'daegu', label: '대구', cities: [c('suseong', '수성구'), c('dalseo', '달서구'), c('jung-daegu', '중구')] },
      { id: 'daejeon', label: '대전·세종', cities: [c('yuseong', '유성구'), c('seo-daejeon', '서구'), c('sejong', '세종시')] },
      { id: 'gwangju', label: '광주', cities: [c('sangmu', '상무지구'), c('cheomdan', '첨단지구')] },
      { id: 'ulsan', label: '울산', cities: [c('nam-ulsan', '남구'), c('ulju', '울주군')] },
      { id: 'gangwon', label: '강원', cities: [c('chuncheon', '춘천'), c('gangneung', '강릉'), c('sokcho', '속초'), c('wonju', '원주')] },
      { id: 'chungcheong', label: '충청', cities: [c('cheongju', '청주'), c('cheonan', '천안·아산'), c('chungju', '충주')] },
      { id: 'jeolla', label: '전라', cities: [c('jeonju', '전주'), c('yeosu', '여수'), c('suncheon', '순천'), c('gunsan', '군산')] },
      { id: 'gyeongsang', label: '경상', cities: [c('changwon', '창원'), c('pohang', '포항'), c('gyeongju', '경주'), c('gimhae', '김해')] },
      { id: 'jeju', label: '제주', cities: [c('jejusi', '제주시'), c('seogwipo', '서귀포시')] },
    ],
  },
  {
    code: 'JP', label: '일본', flag: '🇯🇵', continent: '아시아',
    regions: [
      { id: 'tokyo', label: '도쿄도', cities: [c('shinjuku', '신주쿠'), c('shibuya', '시부야'), c('shin-okubo', '신오쿠보'), c('minato', '미나토'), c('setagaya', '세타가야')] },
      { id: 'kanagawa', label: '가나가와', cities: [c('yokohama', '요코하마'), c('kawasaki', '가와사키')] },
      { id: 'osaka', label: '오사카부', cities: [c('umeda', '우메다'), c('namba', '난바'), c('tsuruhashi', '쓰루하시')] },
      { id: 'aichi', label: '아이치', cities: [c('nagoya', '나고야')] },
      { id: 'fukuoka', label: '후쿠오카', cities: [c('hakata', '하카타'), c('tenjin', '텐진')] },
      { id: 'hokkaido', label: '홋카이도', cities: [c('sapporo', '삿포로')] },
    ],
  },
  {
    code: 'CN', label: '중국', flag: '🇨🇳', continent: '아시아',
    regions: [
      { id: 'beijing', label: '베이징', cities: [c('wangjing', '왕징'), c('chaoyang', '차오양'), c('haidian', '하이뎬')] },
      { id: 'shanghai', label: '상하이', cities: [c('minhang', '민항·구베이'), c('pudong', '푸둥'), c('jingan', '징안')] },
      { id: 'guangdong', label: '광둥', cities: [c('guangzhou', '광저우'), c('shenzhen', '선전')] },
      { id: 'shandong', label: '산둥', cities: [c('qingdao', '칭다오'), c('yantai', '옌타이')] },
    ],
  },
  {
    code: 'HK', label: '홍콩', flag: '🇭🇰', continent: '아시아',
    regions: [{ id: 'hk', label: '홍콩', cities: [c('central', '센트럴'), c('kowloon', '까우롱'), c('tsuen-wan', '췬완')] }],
  },
  {
    code: 'TW', label: '대만', flag: '🇹🇼', continent: '아시아',
    regions: [{ id: 'taipei', label: '타이베이', cities: [c('daan', '다안구'), c('xinyi', '신이구')] }, { id: 'taichung', label: '타이중·가오슝', cities: [c('taichung', '타이중'), c('kaohsiung', '가오슝')] }],
  },
  {
    code: 'SG', label: '싱가포르', flag: '🇸🇬', continent: '아시아',
    regions: [{ id: 'sg', label: '싱가포르', cities: [c('central-sg', '중부 (오차드·탄종파가)'), c('east-sg', '동부 (카통·탐피네스)'), c('west-sg', '서부 (주롱·클레멘티)'), c('north-sg', '북부 (우드랜즈)')] }],
  },
  {
    code: 'VN', label: '베트남', flag: '🇻🇳', continent: '아시아',
    regions: [
      { id: 'hcmc', label: '호치민', cities: [c('d1', '1군'), c('d2', '2군 (타오디엔)'), c('d7', '7군 (푸미흥)')] },
      { id: 'hanoi', label: '하노이', cities: [c('mydinh', '미딩'), c('taiho', '서호'), c('caugiay', '꺼우저이')] },
      { id: 'danang', label: '다낭', cities: [c('danang', '다낭'), c('hoian', '호이안')] },
    ],
  },
  {
    code: 'TH', label: '태국', flag: '🇹🇭', continent: '아시아',
    regions: [{ id: 'bangkok', label: '방콕', cities: [c('sukhumvit', '수쿰빗'), c('silom', '실롬')] }, { id: 'north-th', label: '북부·남부', cities: [c('chiangmai', '치앙마이'), c('phuket', '푸껫')] }],
  },
  {
    code: 'MY', label: '말레이시아', flag: '🇲🇾', continent: '아시아',
    regions: [{ id: 'kl', label: '쿠알라룸푸르', cities: [c('mont-kiara', '몬키아라'), c('klcc', 'KLCC')] }, { id: 'etc-my', label: '그 외', cities: [c('penang', '페낭'), c('johor', '조호르바루')] }],
  },
  {
    code: 'ID', label: '인도네시아', flag: '🇮🇩', continent: '아시아',
    regions: [{ id: 'jakarta', label: '자카르타', cities: [c('scbd', 'SCBD·수디르만'), c('kelapa-gading', '클라파가딩')] }, { id: 'bali', label: '발리', cities: [c('canggu', '창구'), c('seminyak', '스미냑')] }],
  },
  {
    code: 'PH', label: '필리핀', flag: '🇵🇭', continent: '아시아',
    regions: [{ id: 'manila', label: '마닐라', cities: [c('bgc', 'BGC'), c('makati', '마카티')] }, { id: 'etc-ph', label: '그 외', cities: [c('cebu', '세부'), c('clark', '클락')] }],
  },
  {
    code: 'IN', label: '인도', flag: '🇮🇳', continent: '아시아',
    regions: [{ id: 'in', label: '인도', cities: [c('delhi', '뉴델리·구르가온'), c('mumbai', '뭄바이'), c('bangalore', '방갈로르'), c('chennai', '첸나이')] }],
  },

  // ── 북미 ────────────────────────────────────────────────────────────────
  {
    code: 'US', label: '미국', flag: '🇺🇸', continent: '북미',
    regions: [
      { id: 'ca', label: '캘리포니아', cities: [c('la', 'LA (코리아타운)'), c('irvine', '어바인'), c('sf', '샌프란시스코'), c('sanjose', '산호세'), c('sandiego', '샌디에이고')] },
      { id: 'ny', label: '뉴욕', cities: [c('manhattan', '맨해튼'), c('flushing', '플러싱'), c('brooklyn', '브루클린')] },
      { id: 'nj', label: '뉴저지', cities: [c('fortlee', '포트리'), c('palisades', '팰리세이드파크'), c('jerseycity', '저지시티')] },
      { id: 'wa', label: '워싱턴주', cities: [c('seattle', '시애틀'), c('bellevue', '벨뷰'), c('tacoma', '타코마')] },
      { id: 'tx', label: '텍사스', cities: [c('dallas', '댈러스'), c('houston', '휴스턴'), c('austin', '오스틴')] },
      { id: 'ga', label: '조지아', cities: [c('atlanta', '애틀랜타'), c('duluth', '둘루스')] },
      { id: 'il', label: '일리노이', cities: [c('chicago', '시카고'), c('schaumburg', '샴버그')] },
      { id: 'ma', label: '매사추세츠', cities: [c('boston', '보스턴'), c('cambridge', '케임브리지')] },
      { id: 'va', label: '버지니아·메릴랜드·DC', cities: [c('annandale', '애난데일'), c('centreville', '센터빌'), c('dc', '워싱턴 DC')] },
      { id: 'hi', label: '하와이', cities: [c('honolulu', '호놀룰루')] },
    ],
  },
  {
    code: 'CA', label: '캐나다', flag: '🇨🇦', continent: '북미',
    regions: [
      { id: 'on', label: '온타리오', cities: [c('toronto', '토론토'), c('mississauga', '미시소가'), c('ottawa', '오타와')] },
      { id: 'bc', label: '브리티시컬럼비아', cities: [c('vancouver', '밴쿠버'), c('burnaby', '버나비'), c('coquitlam', '코퀴틀람')] },
      { id: 'ab', label: '앨버타', cities: [c('calgary', '캘거리'), c('edmonton', '에드먼턴')] },
      { id: 'qc', label: '퀘벡', cities: [c('montreal', '몬트리올')] },
    ],
  },
  {
    code: 'MX', label: '멕시코', flag: '🇲🇽', continent: '북미',
    regions: [{ id: 'mx', label: '멕시코', cities: [c('cdmx', '멕시코시티'), c('monterrey', '몬테레이'), c('queretaro', '케레타로')] }],
  },

  // ── 유럽 ────────────────────────────────────────────────────────────────
  {
    code: 'GB', label: '영국', flag: '🇬🇧', continent: '유럽',
    regions: [
      { id: 'london', label: '런던', cities: [c('newmalden', '뉴몰든'), c('central-ldn', '센트럴 런던'), c('canarywharf', '카나리워프')] },
      { id: 'england', label: '잉글랜드 그 외', cities: [c('manchester', '맨체스터'), c('birmingham', '버밍엄'), c('cambridge-uk', '케임브리지')] },
      { id: 'scotland', label: '스코틀랜드', cities: [c('edinburgh', '에든버러'), c('glasgow', '글래스고')] },
    ],
  },
  {
    code: 'DE', label: '독일', flag: '🇩🇪', continent: '유럽',
    regions: [
      { id: 'hessen', label: '헤센', cities: [c('frankfurt', '프랑크푸르트')] },
      { id: 'berlin', label: '베를린', cities: [c('mitte', '미테'), c('charlottenburg', '샤를로텐부르크')] },
      { id: 'bayern', label: '바이에른', cities: [c('munich', '뮌헨'), c('nuremberg', '뉘른베르크')] },
      { id: 'nrw', label: '노르트라인베스트팔렌', cities: [c('duesseldorf', '뒤셀도르프'), c('cologne', '쾰른')] },
      { id: 'hamburg', label: '함부르크', cities: [c('hamburg', '함부르크')] },
    ],
  },
  {
    code: 'FR', label: '프랑스', flag: '🇫🇷', continent: '유럽',
    regions: [{ id: 'idf', label: '일드프랑스', cities: [c('paris', '파리'), c('boulogne', '불로뉴')] }, { id: 'etc-fr', label: '그 외', cities: [c('lyon', '리옹'), c('nice', '니스')] }],
  },
  {
    code: 'NL', label: '네덜란드', flag: '🇳🇱', continent: '유럽',
    regions: [{ id: 'nl', label: '네덜란드', cities: [c('amsterdam', '암스테르담'), c('rotterdam', '로테르담'), c('denhaag', '헤이그')] }],
  },
  {
    code: 'ES', label: '스페인', flag: '🇪🇸', continent: '유럽',
    regions: [{ id: 'es', label: '스페인', cities: [c('madrid', '마드리드'), c('barcelona', '바르셀로나')] }],
  },
  {
    code: 'IT', label: '이탈리아', flag: '🇮🇹', continent: '유럽',
    regions: [{ id: 'it', label: '이탈리아', cities: [c('rome', '로마'), c('milan', '밀라노')] }],
  },
  {
    code: 'CH', label: '스위스·오스트리아', flag: '🇨🇭', continent: '유럽',
    regions: [{ id: 'ch', label: '스위스', cities: [c('zurich', '취리히'), c('geneva', '제네바')] }, { id: 'at', label: '오스트리아', cities: [c('vienna', '비엔나')] }],
  },
  {
    code: 'PL', label: '폴란드·체코', flag: '🇵🇱', continent: '유럽',
    regions: [{ id: 'pl', label: '폴란드', cities: [c('warsaw', '바르샤바'), c('wroclaw', '브로츠와프')] }, { id: 'cz', label: '체코', cities: [c('prague', '프라하')] }],
  },
  {
    code: 'SE', label: '북유럽', flag: '🇸🇪', continent: '유럽',
    regions: [{ id: 'nordic', label: '북유럽', cities: [c('stockholm', '스톡홀름'), c('copenhagen', '코펜하겐'), c('oslo', '오슬로'), c('helsinki', '헬싱키')] }],
  },

  // ── 오세아니아 ───────────────────────────────────────────────────────────
  {
    code: 'AU', label: '호주', flag: '🇦🇺', continent: '오세아니아',
    regions: [
      { id: 'nsw', label: '뉴사우스웨일스', cities: [c('sydney', '시드니 시티'), c('strathfield', '스트라스필드'), c('eastwood', '이스트우드')] },
      { id: 'vic', label: '빅토리아', cities: [c('melbourne', '멜버른'), c('boxhill', '박스힐')] },
      { id: 'qld', label: '퀸즐랜드', cities: [c('brisbane', '브리즈번'), c('goldcoast', '골드코스트')] },
      { id: 'wa-au', label: '서호주·남호주', cities: [c('perth', '퍼스'), c('adelaide', '애들레이드')] },
    ],
  },
  {
    code: 'NZ', label: '뉴질랜드', flag: '🇳🇿', continent: '오세아니아',
    regions: [{ id: 'nz', label: '뉴질랜드', cities: [c('auckland', '오클랜드'), c('wellington', '웰링턴'), c('christchurch', '크라이스트처치')] }],
  },

  // ── 중동·아프리카 ────────────────────────────────────────────────────────
  {
    code: 'AE', label: '아랍에미리트', flag: '🇦🇪', continent: '중동·아프리카',
    regions: [{ id: 'ae', label: 'UAE', cities: [c('dubai', '두바이'), c('abudhabi', '아부다비')] }],
  },
  {
    code: 'SA', label: '사우디·카타르', flag: '🇸🇦', continent: '중동·아프리카',
    regions: [{ id: 'sa', label: '사우디아라비아', cities: [c('riyadh', '리야드'), c('jeddah', '제다')] }, { id: 'qa', label: '카타르·쿠웨이트', cities: [c('doha', '도하'), c('kuwait', '쿠웨이트시티')] }],
  },
  {
    code: 'ZA', label: '아프리카', flag: '🌍', continent: '중동·아프리카',
    regions: [{ id: 'af', label: '아프리카', cities: [c('cairo', '카이로'), c('nairobi', '나이로비'), c('johannesburg', '요하네스버그'), c('capetown', '케이프타운')] }],
  },

  // ── 중남미 ──────────────────────────────────────────────────────────────
  {
    code: 'BR', label: '중남미', flag: '🌎', continent: '중남미',
    regions: [{ id: 'latam', label: '중남미', cities: [c('saopaulo', '상파울루'), c('buenosaires', '부에노스아이레스'), c('santiago', '산티아고'), c('bogota', '보고타'), c('lima', '리마')] }],
  },
]

// ── 조회 헬퍼 ───────────────────────────────────────────────────────────────

export interface PlaceRef {
  country: string
  region: string
  city: string
}

export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find(x => x.code === code)
}

export function getRegion(code: string, regionId: string): Region | undefined {
  return getCountry(code)?.regions.find(r => r.id === regionId)
}

export function getCity(code: string, regionId: string, cityId: string): City | undefined {
  return getRegion(code, regionId)?.cities.find(x => x.id === cityId)
}

export function isOnlinePlace(code: string) {
  return code === ONLINE_CODE
}

/** "🇺🇸 미국 · 캘리포니아 · 어바인" 형태의 라벨 */
export function placeLabel(place: PlaceRef, opts: { withFlag?: boolean; short?: boolean } = {}): string {
  const { withFlag = true, short = false } = opts
  const country = getCountry(place.country)
  if (!country) return '위치 미정'
  const region = getRegion(place.country, place.region)
  const city = getCity(place.country, place.region, place.city)
  const parts = short
    ? [city?.label ?? region?.label ?? country.label]
    : [country.label, region?.label, city?.label].filter(Boolean) as string[]
  const text = parts.join(' · ')
  return withFlag ? `${country.flag} ${text}` : text
}

/** 국가 코드 → 국기 이모지 */
export function flagOf(code: string): string {
  return getCountry(code)?.flag ?? '📍'
}

export const COUNTRIES_BY_CONTINENT: { continent: Continent; countries: Country[] }[] =
  CONTINENT_ORDER
    .map(continent => ({ continent, countries: COUNTRIES.filter(x => x.continent === continent) }))
    .filter(g => g.countries.length > 0)

export interface PlaceSearchResult extends PlaceRef {
  label: string
  flag: string
}

/** 국가/지역/도시 이름을 한 번에 검색 */
export function searchPlaces(query: string, limit = 30): PlaceSearchResult[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const out: PlaceSearchResult[] = []
  for (const country of COUNTRIES) {
    for (const region of country.regions) {
      for (const city of region.cities) {
        const hay = `${country.label} ${country.code} ${region.label} ${city.label}`.toLowerCase()
        if (hay.includes(q)) {
          out.push({
            country: country.code, region: region.id, city: city.id,
            label: `${country.label} · ${region.label} · ${city.label}`,
            flag: country.flag,
          })
          if (out.length >= limit) return out
        }
      }
    }
  }
  return out
}
