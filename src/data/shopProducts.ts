// ── Category ───────────────────────────────────────────────────────────────

export type ProductCategory =
  | 'rhythm_balance'
  | 'vitality_aging'
  | 'deep_healing'
  | 'future_planning'

export const CATEGORY_META: Record<ProductCategory, {
  label: string
  subtitle: string
  primaryColor: string
  bgColor: string
}> = {
  rhythm_balance: {
    label: '주기·호르몬',
    subtitle: 'Rhythm & Balance',
    primaryColor: '#f43f75',
    bgColor: 'rgba(244,63,117,0.08)',
  },
  vitality_aging: {
    label: '활력·스트레스',
    subtitle: 'Vitality & Aging',
    primaryColor: '#8b5cf6',
    bgColor: 'rgba(139,92,246,0.08)',
  },
  deep_healing: {
    label: '질환·심부',
    subtitle: 'Deep Healing',
    primaryColor: '#10b981',
    bgColor: 'rgba(16,185,129,0.08)',
  },
  future_planning: {
    label: '가임·준비',
    subtitle: 'Future Planning',
    primaryColor: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.08)',
  },
}

// ── Review ─────────────────────────────────────────────────────────────────

export interface ProductReview {
  id: string
  nickname: string
  ageGroup: string
  careTypes: string[]
  rating: number
  body: string
  date: string
  photos?: string[]
  healthScoreBefore?: number
  healthScoreAfter?: number
}

// ── Product ────────────────────────────────────────────────────────────────

export interface ShopProduct {
  id: string
  name: string
  brand: string
  tagline: string
  price: number
  originalPrice?: number
  volume: string
  category: ProductCategory
  image?: string
  placeholderIcon?: string
  placeholderGradient?: { from: string; to: string }
  description: string
  keyBenefits: string[]
  howToUse: string
  ludiaTags: string[]
  reviews: ProductReview[]
}

// ── Products ───────────────────────────────────────────────────────────────

export const SHOP_PRODUCTS: ShopProduct[] = [

  // ── Rhythm & Balance ──────────────────────────────────────────────────

  {
    id: 'lymphia_inner_rest_oil',
    name: '궁오일',
    brand: 'Lymphia',
    tagline: '자궁 냉증 · 림프 순환 · 이너케어 오일',
    price: 38000,
    volume: '10ml / 0.40 fl.oz',
    category: 'rhythm_balance',
    image: '/products/lymphia-inner-rest-oil.png',
    description:
      'Lymphia Y Inner Rest Oil은 자궁과 골반 주변의 냉증을 개선하고 림프 순환을 활성화하는 프리미엄 이너케어 오일입니다.\n\n생리통, 냉증, 골반 불균형으로 고민하는 분들을 위해 식물성 천연 성분만을 엄선해 배합했습니다. 매일 아침 복부와 골반에 부드럽게 마사지하면 자궁 환경 개선에 도움이 됩니다.',
    keyBenefits: [
      '자궁 냉증 개선 · 체온 순환 활성화',
      '생리통 완화 · 골반 근육 이완',
      '림프 순환 도움 · 부종 감소',
      '천연 식물성 성분 · 무자극 포뮬러',
    ],
    howToUse:
      '아침 공복 또는 취침 전, 하복부와 골반 주변에 2–3방울을 덜어 원을 그리듯 부드럽게 마사지하세요. (5–10분)',
    ludiaTags: ['자궁냉증_케어', '림프순환_활성화', '생리통감소', '배란기_pH밸런스', '기초체온_상승'],
    reviews: [
      {
        id: 'r1', nickname: '김**', ageGroup: '30대 초반',
        careTypes: ['period_pain', 'healthy_cycle'], rating: 5,
        body: '생리 시작 전 복부 마사지에 써봤는데 진짜 체감이 달라요. 평소 생리 첫날이 제일 힘들었는데 이번엔 훨씬 수월했어요. 향도 부담 없고 흡수도 빠릅니다.',
        date: '2026-04-18',
      },
      {
        id: 'r2', nickname: '박**', ageGroup: '20대 후반',
        careTypes: ['period_pain'], rating: 5,
        body: '자궁 냉증이 심해서 구매했는데 꾸준히 쓰니 손발 냉기도 줄어든 느낌이에요. 한 달 쓰고 생리통도 확실히 덜해져서 재구매 결정했어요.',
        date: '2026-04-05',
      },
      {
        id: 'r3', nickname: '이**', ageGroup: '30대 후반',
        careTypes: ['thyroid_uterus', 'period_pain'], rating: 4,
        body: '자궁근종 관리 차원에서 써보고 있어요. 한 달 정도 됐는데 생리 기간 불쾌감이 줄어든 것 같아요. 전반적으로 만족합니다.',
        date: '2026-03-29',
      },
      {
        id: 'r4', nickname: '최**', ageGroup: '20대 중반',
        careTypes: ['stress', 'healthy_cycle'], rating: 5,
        body: '스트레스 받을 때 호르몬 불균형으로 주기가 불규칙했는데, 이 오일 쓰면서 마사지하는 루틴 자체가 릴렉싱 돼서 좋아요.',
        date: '2026-03-15',
      },
      {
        id: 'r5', nickname: '정**', ageGroup: '40대 초반',
        careTypes: ['thyroid_uterus', 'healthy_cycle'], rating: 4,
        body: '갱년기 초입이라 여러 이너케어 제품 써봤는데 이게 제일 자극 없고 좋더라고요. 흡수가 빠르고 끈적임이 없어서 아침마다 편하게 쓸 수 있어요.',
        date: '2026-02-28',
      },
    ],
  },

  {
    id: 'ph_balance_wash',
    name: 'pH 밸런스 Y존 워시',
    brand: '마이사이클',
    tagline: '배란기·생리 후 Y존 산성도 복원 클렌저',
    price: 24000,
    volume: '150ml',
    category: 'rhythm_balance',
    image: '/products/ph-balance-wash.png',
    description:
      '분비물 성상이 변하는 배란기와 생리 직후, 무너진 Y존 pH를 빠르게 회복시켜 주는 약산성 포뮬러 워시입니다.\n\n유산균 유래 성분과 판테놀이 질 내 유익균 환경을 보호하고 자극·가려움을 완화합니다.',
    keyBenefits: [
      '약산성 pH 3.8 포뮬러 · 질내 유익균 보호',
      '유산균 추출물 · 판테놀 복합 배합',
      '향료·알코올·파라벤 무첨가',
      '임상 피부과 알레르기 테스트 완료',
    ],
    howToUse: '세정 시 소량을 Y존에 직접 도포 후 미지근한 물로 충분히 헹구세요. 1일 1회 사용을 권장합니다.',
    ludiaTags: ['배란기_필수템', '질내_pH밸런스', '냉증개선', '자극없는_클렌징', '주기별_케어'],
    reviews: [
      {
        id: 'rb2r1', nickname: '한**', ageGroup: '20대 후반',
        careTypes: ['healthy_cycle', 'period_pain'], rating: 5,
        body: '배란기마다 분비물 냄새로 스트레스였는데, 이거 쓰고 나서 많이 나아졌어요. 자극도 전혀 없고 순해요.',
        date: '2026-04-10',
      },
    ],
  },

  {
    id: 'gla_supplement',
    name: '달맞이꽃종자유 GLA',
    brand: '이너웰니스',
    tagline: 'PMS·호르몬 밸런스 감마리놀렌산 1000mg',
    price: 32000,
    volume: '60캡슐 / 2개월분',
    category: 'rhythm_balance',
    image: '/products/gla-supplement.png',
    description:
      '달맞이꽃종자유에서 추출한 감마리놀렌산(GLA)은 에스트로겐 불균형으로 인한 생리 전 증후군(PMS) 완화에 도움이 되는 성분입니다.\n\n비타민 E와 함께 배합되어 산화 안정성을 높였으며, 생리 전 유방 통증, 복부 팽만, 기분 변화 개선에 도움을 줍니다.',
    keyBenefits: [
      'GLA 1000mg 고함량 · 에스트로겐 밸런스',
      'PMS 복부 팽만 · 유방 통증 완화',
      '비타민 E 함께 배합 · 산화 안정',
      'Non-GMO 달맞이꽃 원료',
    ],
    howToUse: '1일 2캡슐, 식사와 함께 충분한 물과 함께 복용하세요. 생리 예정 2주 전부터 복용하면 PMS 예방에 도움이 됩니다.',
    ludiaTags: ['PMS_완화', '호르몬밸런스', '생리전증후군_개선', '감마리놀렌산', '황체기_필수영양제'],
    reviews: [
      {
        id: 'rb3r1', nickname: '오**', ageGroup: '30대 초반',
        careTypes: ['healthy_cycle', 'period_pain'], rating: 5,
        body: '생리 전에 가슴 통증이 너무 심했는데 이거 2달 먹었더니 확실히 줄었어요. PMS도 덜하고 기분 기복도 줄어든 것 같아서 계속 먹을 것 같아요.',
        date: '2026-03-20',
      },
      {
        id: 'rb3r2', nickname: '강**', ageGroup: '20대 후반',
        careTypes: ['healthy_cycle'], rating: 4,
        body: '주기가 불규칙했는데 복용 시작하고 3개월째 규칙적으로 돌아왔어요. 개인차가 있겠지만 저는 효과 봤습니다.',
        date: '2026-02-15',
      },
    ],
  },

  // ── Vitality & Aging ──────────────────────────────────────────────────

  {
    id: 'magnesium_lotion',
    name: '마그네슘 릴렉싱 바디로션',
    brand: '슬립케어',
    tagline: '수면 전 근육 이완 · HRV 회복 마그네슘 로션',
    price: 36000,
    volume: '200ml',
    category: 'vitality_aging',
    image: '/products/magnesium-lotion.png',
    description:
      '단순 보습을 넘어, 수면 전 뭉친 근육을 이완시키고 체온을 적절히 유지해 깊은 잠과 HRV 회복을 돕는 기능성 바디로션입니다.\n\n경피 흡수형 마그네슘 클로라이드와 라벤더·캐모마일 추출물이 결합되어 부교감 신경을 자극하고 코르티솔 수준을 안정시킵니다.',
    keyBenefits: [
      '경피 흡수 마그네슘 클로라이드 함유',
      '라벤더·캐모마일 추출물 · 부교감 활성',
      '수면 전 체온 조절 · HRV 개선 도움',
      '향료 최소화 · 민감성 피부 적합',
    ],
    howToUse: '취침 30분 전, 종아리·허벅지·복부에 넉넉히 도포 후 마사지하듯 흡수시키세요.',
    ludiaTags: ['HRV_회복템', '수면질개선', '근육이완', '야간_코르티솔_감소', '황체기_숙면가이드'],
    reviews: [
      {
        id: 'va1r1', nickname: '윤**', ageGroup: '30대 중반',
        careTypes: ['stress'], rating: 5,
        body: '루디아에서 HRV 수치가 낮다고 알림 와서 샀는데 2주 쓰고 수면 점수가 올라가는 게 체감돼요. 향도 자극 없이 은은해서 자기 전에 딱이에요.',
        date: '2026-04-22',
      },
      {
        id: 'va1r2', nickname: '서**', ageGroup: '40대 초반',
        careTypes: ['stress', 'thyroid_uterus'], rating: 4,
        body: '다리에 쥐가 자주 났는데 마그네슘 경피 흡수라 어떨지 반신반의했는데 꽤 효과있는 것 같아요. 수면도 조금 깊어진 느낌입니다.',
        date: '2026-04-01',
      },
    ],
  },

  {
    id: 'lavender_aroma_rollon',
    name: '라벤더 아로마 롤온',
    brand: '센트테라피',
    tagline: '교감신경 진정 · 펄스 포인트 아로마테라피',
    price: 22000,
    volume: '10ml',
    category: 'vitality_aging',
    image: '/products/lavender-rollon.png',
    description:
      '스트레스 지수가 높은 날, 손목·목 뒤 펄스 포인트에 한 번 굴리면 라벤더·버가못·일랑일랑의 시너지 블렌딩이 교감 신경을 빠르게 안정시킵니다.\n\n정유 함량 15%의 고농도 롤온으로 향이 오래 지속되며, 캐리어 오일은 피부 자극 없이 빠르게 흡수됩니다.',
    keyBenefits: [
      '라벤더·버가못·일랑일랑 시너지 블렌딩',
      '정유 함량 15% · 지속력 4–6시간',
      '교감신경 억제 · 코르티솔 완화',
      '호호바 캐리어 오일 · 피부 자극 없음',
    ],
    howToUse: '손목 안쪽·목 뒤·귀 뒤쪽 등 맥박이 느껴지는 곳에 굴려 바르고 가볍게 두드려 흡수시키세요.',
    ludiaTags: ['스트레스지수_감소', '부교감활성화', '황체기_진정', '향기테라피', '즉각_이완효과'],
    reviews: [
      {
        id: 'va2r1', nickname: '임**', ageGroup: '20대 후반',
        careTypes: ['stress'], rating: 5,
        body: '"스트레스 지수가 높습니다" 루디아 알림 보고 주문했어요. 회의 전에 손목에 바르면 심장 두근거림이 줄어드는 게 느껴져요. 신기해요.',
        date: '2026-04-15',
      },
    ],
  },

  {
    id: 'theanine_magnesium',
    name: '테아닌+마그네슘 수면 서포트',
    brand: '이너웰니스',
    tagline: '자율신경 안정 · 수면의 질 개선 복합 영양제',
    price: 42000,
    volume: '60캡슐 / 2개월분',
    category: 'vitality_aging',
    image: '/products/theanine-magnesium.png',
    description:
      'L-테아닌 200mg과 글리신형 마그네슘 200mg의 조합으로 자율신경을 안정시키고 수면 입면 시간을 단축시켜 줍니다.\n\nHRV 수치가 지속적으로 낮은 번아웃 상태나, 황체기에 수면 장애가 심한 분들을 위해 설계된 저녁 전용 포뮬러입니다.',
    keyBenefits: [
      'L-테아닌 200mg · 알파파 유도 · 긴장 완화',
      '글리신형 마그네슘 200mg · 생체 이용률 높음',
      '수면 입면 시간 단축 · 깊은 수면 증가',
      '카페인 無 · 다음날 무기력함 없음',
    ],
    howToUse: '취침 30–60분 전에 1캡슐을 물과 함께 복용하세요. 마그네슘 바디로션과 함께 사용 시 시너지 효과가 있습니다.',
    ludiaTags: ['HRV_회복템', '수면_딥다이브', '자율신경_안정', '번아웃케어', '테아닌_황체기추천'],
    reviews: [
      {
        id: 'va3r1', nickname: '배**', ageGroup: '30대 후반',
        careTypes: ['stress', 'brain_cognitive'], rating: 5,
        body: '브레인 포그가 심해서 찾다가 샀어요. 2주 복용 후 루디아 앱 수면 점수가 68 → 81로 올랐어요. 아침 기상이 훨씬 가벼워졌습니다.',
        date: '2026-04-28',
      },
      {
        id: 'va3r2', nickname: '조**', ageGroup: '40대 초반',
        careTypes: ['stress'], rating: 4,
        body: '갱년기 수면 장애로 고생했는데 이거 먹고 한 번 깨더라도 다시 잠들기가 훨씬 쉬워졌어요. 만족합니다.',
        date: '2026-03-30',
      },
    ],
  },

  // ── Deep Healing ──────────────────────────────────────────────────────

  {
    id: 'organic_pad',
    name: '유기농 OCS 무독성 생리대',
    brand: '클린시스터',
    tagline: 'SAP-Free · 화학 흡수체 없는 OCS 유기농 인증',
    price: 18000,
    volume: '28매 (중형)',
    category: 'deep_healing',
    image: '/products/organic-pad.png',
    description:
      '자궁 질환·암 회복기 등 환경 호르몬에 민감한 분들을 위한 화학 흡수체(SAP) 프리 유기농 면 생리대입니다.\n\nOCS(유기농 콘텐츠 표준) 인증 원료만 사용하며, 형광증백제·방향제·다이옥신 0%를 보장합니다.',
    keyBenefits: [
      'SAP(화학 고분자 흡수체) 완전 미함유',
      'OCS 유기농 인증 100% 면 커버',
      '형광증백제·방향제·다이옥신 0%',
      '자궁근종·물혹·암 회복기 유저 최우선 추천',
    ],
    howToUse: '일반 생리대와 동일하게 사용하세요. 흡수력은 일반 대비 동등하며, 냄새 차단은 무향 특성상 자주 교체를 권장합니다.',
    ludiaTags: ['자궁근종_안심', '화학물질_0%', 'SAP_Free', 'OCS_유기농인증', '회복기_최우선추천'],
    reviews: [
      {
        id: 'dh1r1', nickname: '류**', ageGroup: '30대 후반',
        careTypes: ['cyst_fibroid_cancer', 'period_pain'], rating: 5,
        body: '근종 진단 후 생리대부터 바꿔야겠다 생각했어요. 루디아에서 이 제품 추천해 줘서 샀는데 자극이 없고 흡수력도 충분해요. 이제 이것만 씁니다.',
        date: '2026-04-05',
      },
      {
        id: 'dh1r2', nickname: '문**', ageGroup: '20대 중반',
        careTypes: ['cyst_fibroid_cancer'], rating: 5,
        body: '일반 생리대 쓸 때마다 Y존이 가려웠는데 이걸로 바꾸고 나서 그게 없어졌어요. 예민한 분들한테 정말 강추.',
        date: '2026-03-18',
      },
    ],
  },

  {
    id: 'ewg_clean_bodywash',
    name: 'EWG 그린 클린 바디워시',
    brand: '딥케어',
    tagline: '피부 장벽 복원 · 갑상선·회복기 고보습 클렌저',
    price: 28000,
    volume: '250ml',
    category: 'deep_healing',
    image: '/products/ewg-clean-bodywash.png',
    description:
      'EWG 그린 등급 원료만 사용한 무향·무색소 클렌저입니다. 갑상선 기능 저하로 극건조한 피부나 항암 치료 후 장벽이 무너진 회복기 피부를 위해 세라마이드·판테놀·히알루론산을 집중 배합했습니다.',
    keyBenefits: [
      'EWG 그린 등급 전 성분 · 무향·무색소',
      '세라마이드 + 판테놀 + 히알루론산 복합 장벽 케어',
      '갑상선 기능 저하 · 회복기 극건조 피부 적합',
      'pH 약산성 · 피부 마이크로바이옴 보호',
    ],
    howToUse: '적당량을 손 또는 바디볼에 묻혀 부드럽게 마사지 후 미지근한 물로 헹구세요. 샤워 직후 바디로션과 함께 사용하면 장벽 회복이 빠릅니다.',
    ludiaTags: ['EWG_그린등급', '피부장벽_케어', '무향료_무독성', '갑상선_안심', '회복기_피부추천'],
    reviews: [
      {
        id: 'dh2r1', nickname: '신**', ageGroup: '40대 중반',
        careTypes: ['thyroid_uterus'], rating: 5,
        body: '갑상선 저하로 피부가 너무 건조하고 가렵더라고요. 이거 쓰고 가려움이 확 줄었어요. 무향이라 처음엔 낯선데 적응하면 이게 맞아요.',
        date: '2026-04-12',
      },
    ],
  },

  {
    id: 'curcumin_immunity',
    name: '커큐민 프리미엄 영양제',
    brand: '이너웰니스',
    tagline: '항염·면역 강화 · BCM-95 고흡수 커큐민',
    price: 54000,
    volume: '60캡슐 / 2개월분',
    category: 'deep_healing',
    image: '/products/curcumin-immunity.png',
    description:
      '일반 커큐민 대비 생체 이용률 7배 높은 BCM-95 기술로 추출한 고흡수 커큐민입니다.\n\n만성 염증 억제, 간 해독 효소 활성화, 면역 조절에 도움을 주며, 자궁 질환·암 회복기 유저의 항염 지지 영양소로 루디아 AI가 최우선 분류한 제품입니다.',
    keyBenefits: [
      'BCM-95 기술 · 일반 커큐민 대비 흡수율 700%',
      '만성 염증 지표(CRP) 완화 도움',
      '간 해독 효소 활성화 · 독소 배출',
      '자궁 내막 환경 개선 임상 연구 기반',
    ],
    howToUse: '1일 1캡슐, 식사와 함께 복용하세요. 지방과 함께 먹으면 흡수율이 더 높아집니다.',
    ludiaTags: ['항염_작용', '면역력증진', '종양환경_개선', '프리미엄_흡수형', 'BCM95_커큐민'],
    reviews: [
      {
        id: 'dh3r1', nickname: '황**', ageGroup: '40대 후반',
        careTypes: ['cyst_fibroid_cancer', 'thyroid_uterus'], rating: 5,
        body: '유방암 회복 중인데 루디아 추천으로 샀어요. 염증 수치 관리 차원에서 먹기 시작했는데 피로감이 줄고 소화도 좋아진 것 같아요.',
        date: '2026-04-08',
      },
      {
        id: 'dh3r2', nickname: '안**', ageGroup: '30대 중반',
        careTypes: ['cyst_fibroid_cancer'], rating: 4,
        body: '자궁근종 때문에 염증 케어 시작했어요. 3개월째 복용 중인데 피부가 맑아지고 월경 중 복통도 약해진 것 같아요.',
        date: '2026-03-05',
      },
    ],
  },

  // ── Future Planning ───────────────────────────────────────────────────

  {
    id: 'folate_inositol',
    name: '활성형 엽산+이노시톨',
    brand: '이너웰니스',
    tagline: '난임 케어 · 다낭성 난소 증후군 · 착상 환경 개선',
    price: 48000,
    volume: '60캡슐 / 2개월분',
    category: 'future_planning',
    image: '/products/folate-inositol.png',
    description:
      '활성형 엽산(메틸폴레이트 400mcg)과 이노시톨 2000mg 조합으로 다낭성 난소 증후군(PCOS) 환경을 개선하고 난자 질을 높여 착상 가능성을 높이는 임신 준비 전용 영양제입니다.\n\n일반 엽산과 달리 체내 활성화 과정이 필요 없는 메틸폴레이트 형태라 MTHFR 유전자 변이 여성도 효과적으로 흡수됩니다.',
    keyBenefits: [
      '메틸폴레이트(활성형 엽산) 400mcg · MTHFR 대응',
      '이노시톨 2000mg · PCOS 인슐린 저항성 개선',
      '난자 미토콘드리아 보호 · 착상 환경 지원',
      '임신 준비 3개월 전 복용 권장',
    ],
    howToUse: '1일 1캡슐, 아침 식사와 함께 복용하세요. 임신 준비 최소 3개월 전부터 꾸준히 복용하시면 효과가 좋습니다.',
    ludiaTags: ['난임케어', '다낭성_난소_지원', '착상환경_개선', '활성형_엽산', 'PCOS_인슐린개선'],
    reviews: [
      {
        id: 'fp1r1', nickname: '노**', ageGroup: '30대 초반',
        careTypes: ['fertility', 'healthy_cycle'], rating: 5,
        body: '불규칙한 배란으로 임신 준비가 힘들었는데 이거 4개월 복용 후 루디아 배란일 예측이 훨씬 정확해졌어요. 호르몬 검사 수치도 개선됐다고 산부인과 선생님께서 말씀하셨어요.',
        date: '2026-04-20',
      },
      {
        id: 'fp1r2', nickname: '전**', ageGroup: '30대 후반',
        careTypes: ['fertility'], rating: 5,
        body: 'PCOS 진단 후 이노시톨 찾다가 여기서 샀어요. 생리 주기가 35일 → 29일로 짧아졌고 체중도 자연스럽게 빠졌어요.',
        date: '2026-03-10',
      },
    ],
  },

  {
    id: 'coq10_antioxidant',
    name: '코엔자임Q10 항산화',
    brand: '이너웰니스',
    tagline: '난자 질 개선 · 미토콘드리아 활성 · 가임력 향상',
    price: 56000,
    volume: '60캡슐 / 2개월분',
    category: 'future_planning',
    image: '/products/coq10-antioxidant.png',
    description:
      '난자의 에너지 공장인 미토콘드리아 기능을 활성화하는 코엔자임Q10(유비퀴놀 형태) 200mg 고함량 제품입니다.\n\n특히 35세 이상 고령 임신 준비 중이거나 항산화 수치가 낮은 분들에게 루디아 AI가 우선 추천하는 가임력 향상 영양소입니다.',
    keyBenefits: [
      '유비퀴놀형 CoQ10 200mg · 일반형 대비 흡수 8배',
      '난자 미토콘드리아 에너지 생성 활성화',
      '항산화 · 세포 손상 방지',
      '35세 이상 고령 임신 준비 여성 특히 권장',
    ],
    howToUse: '1일 1캡슐, 식사와 함께 복용하세요. 활성형 엽산+이노시톨과 병행 복용 시 가임력 개선 시너지 효과가 있습니다.',
    ludiaTags: ['난자_질개선', '항산화_최강', '미토콘드리아_활성화', '가임력_향상', '고령임신_준비'],
    reviews: [
      {
        id: 'fp2r1', nickname: '손**', ageGroup: '30대 후반',
        careTypes: ['fertility'], rating: 5,
        body: '38살에 난임 치료 시작하면서 CoQ10 꼭 먹으라는 이야기를 많이 들었는데 여기 제품이 유비퀴놀 형태라서 선택했어요. 시험관 채취한 난자 퀄리티가 좋아졌다고 선생님이 말씀해 주셨어요.',
        date: '2026-04-14',
      },
    ],
  },
]
