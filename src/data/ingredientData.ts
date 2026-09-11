// ── Ingredient Safety Database ─────────────────────────────────────────────

export type RiskLevel = 'safe' | 'caution' | 'danger'
export type IngredientCategory =
  | 'endocrine_disruptor'
  | 'chemical_excipient'
  | 'skin_irritant'
  | 'fragrance'
  | 'safe'
  | 'premium'

export type ProductCategory = 'supplement' | 'sanitary' | 'cosmetics'
export type LudiaGrade = 'GREEN' | 'PREMIUM' | 'CAUTION' | 'DANGER'

export interface IngredientInfo {
  id: string
  name: string
  nameKo: string
  riskLevel: RiskLevel
  category: IngredientCategory
  riskPoints: number
  description: string
  affectedOrgans: string[]
}

export interface ProductIngredientData {
  id: string
  name: string
  brand: string
  category: ProductCategory
  barcode?: string
  ingredientIds: string[]
  ludiaGrade: LudiaGrade
  safetyScore: number
  isPartner?: boolean
}

// ── Ingredient Database ────────────────────────────────────────────────────

export const INGREDIENT_DB: Record<string, IngredientInfo> = {
  // ── 내분비계 교란 물질 (Endocrine Disruptors) — -15점 ─────────────────
  methylparaben: {
    id: 'methylparaben',
    name: 'Methylparaben',
    nameKo: '메틸파라벤',
    riskLevel: 'danger',
    category: 'endocrine_disruptor',
    riskPoints: 15,
    description:
      '에스트로겐 유사 활성을 가져 자궁근종, 유방암 위험을 높일 수 있는 파라벤 계열 방부제입니다. 체내 호르몬 수용체에 결합해 내분비계를 교란시킵니다.',
    affectedOrgans: ['자궁', '유방', '난소'],
  },
  propylparaben: {
    id: 'propylparaben',
    name: 'Propylparaben',
    nameKo: '프로필파라벤',
    riskLevel: 'danger',
    category: 'endocrine_disruptor',
    riskPoints: 15,
    description:
      '파라벤 중 에스트로겐 활성이 가장 강한 성분입니다. EU에서 3세 이하 어린이 제품에 사용 금지되었으며, 난소 기능 저하와 연관성이 보고되었습니다.',
    affectedOrgans: ['난소', '자궁', '갑상선'],
  },
  butylparaben: {
    id: 'butylparaben',
    name: 'Butylparaben',
    nameKo: '부틸파라벤',
    riskLevel: 'danger',
    category: 'endocrine_disruptor',
    riskPoints: 15,
    description:
      '지용성이 높아 피부를 통해 빠르게 흡수됩니다. 혈중 농도가 높아지면 여성 생식 기능에 영향을 미칠 수 있습니다.',
    affectedOrgans: ['자궁', '유방', '난소'],
  },
  bha: {
    id: 'bha',
    name: 'BHA (Butylated Hydroxyanisole)',
    nameKo: 'BHA (부틸히드록시아니솔)',
    riskLevel: 'danger',
    category: 'endocrine_disruptor',
    riskPoints: 15,
    description:
      '합성 산화방지제로, 동물 실험에서 내분비 교란과 암 촉진 효과가 관찰되었습니다. IARC에서 발암 가능 물질(2B군)으로 분류합니다.',
    affectedOrgans: ['갑상선', '부신', '생식계'],
  },
  triclosan: {
    id: 'triclosan',
    name: 'Triclosan',
    nameKo: '트리클로산',
    riskLevel: 'danger',
    category: 'endocrine_disruptor',
    riskPoints: 15,
    description:
      '항균 성분으로 널리 사용되었으나, 갑상선 호르몬 교란과 장내 마이크로바이옴 파괴가 확인되어 미국 FDA가 세정제에서 금지했습니다.',
    affectedOrgans: ['갑상선', '대장', '자궁'],
  },
  peg_compounds: {
    id: 'peg_compounds',
    name: 'PEG Compounds',
    nameKo: 'PEG 화합물류',
    riskLevel: 'caution',
    category: 'endocrine_disruptor',
    riskPoints: 10,
    description:
      '피부 장벽을 약화시켜 유해 물질의 경피 흡수를 증가시킵니다. 불순물로 에틸렌옥사이드(발암물질)를 포함할 수 있습니다.',
    affectedOrgans: ['피부', '간', '신장'],
  },
  pfas: {
    id: 'pfas',
    name: 'PFAS (Per/polyfluoroalkyl substances)',
    nameKo: '과불화화합물(PFAS)',
    riskLevel: 'danger',
    category: 'endocrine_disruptor',
    riskPoints: 20,
    description:
      '"영원한 화학물질"로 불리는 물질로, 체내에 축적되어 면역계 교란, 갑상선 질환, 불임 위험을 높입니다. 일부 생리대에서 검출된 사례가 있습니다.',
    affectedOrgans: ['갑상선', '자궁', '면역계', '신장'],
  },

  // ── 화학 부형제 (Chemical Excipients) — -5점 ──────────────────────────
  silicon_dioxide: {
    id: 'silicon_dioxide',
    name: 'Silicon Dioxide',
    nameKo: '이산화규소 (실리카)',
    riskLevel: 'caution',
    category: 'chemical_excipient',
    riskPoints: 5,
    description:
      '영양제의 고결방지제로 사용됩니다. 나노 입자 형태는 장 세포에 영향을 줄 수 있어 장 민감성이 높은 분들은 주의가 필요합니다.',
    affectedOrgans: ['대장', '소장'],
  },
  magnesium_stearate: {
    id: 'magnesium_stearate',
    name: 'Magnesium Stearate',
    nameKo: '스테아린산마그네슘',
    riskLevel: 'caution',
    category: 'chemical_excipient',
    riskPoints: 5,
    description:
      '정제 제조 시 윤활제로 사용되는 합성 화합물입니다. 소화기 점막을 코팅해 영양 흡수를 방해할 수 있습니다.',
    affectedOrgans: ['소장', '대장'],
  },
  titanium_dioxide: {
    id: 'titanium_dioxide',
    name: 'Titanium Dioxide (CI 77891)',
    nameKo: '이산화티타늄',
    riskLevel: 'caution',
    category: 'chemical_excipient',
    riskPoints: 8,
    description:
      '하얀 코팅을 위한 색소 성분입니다. 나노 입자는 소화관에서 염증을 유발하고 장 내막을 손상시킬 수 있어 EFSA에서 식품 첨가물 승인을 취소했습니다.',
    affectedOrgans: ['대장', '소장', '면역계'],
  },
  sodium_lauryl_sulfate: {
    id: 'sodium_lauryl_sulfate',
    name: 'Sodium Lauryl Sulfate (SLS)',
    nameKo: '소듐라우릴설페이트 (SLS)',
    riskLevel: 'caution',
    category: 'chemical_excipient',
    riskPoints: 7,
    description:
      '강력한 합성 계면활성제로, 점막 세포를 손상시킵니다. 여성 민감 부위에 사용 시 질 내 pH를 교란하고 미생물 환경을 망칠 수 있습니다.',
    affectedOrgans: ['피부', '점막', '생식계'],
  },
  chlorine: {
    id: 'chlorine',
    name: 'Chlorine / Dioxin residues',
    nameKo: '염소계 형광증백제 / 다이옥신 잔류',
    riskLevel: 'danger',
    category: 'chemical_excipient',
    riskPoints: 12,
    description:
      '염소 표백 생리대에서 발생하는 다이옥신 잔류물은 강력한 내분비 교란 물질입니다. 자궁내막증, 자궁근종과의 연관성이 연구에서 제시됩니다.',
    affectedOrgans: ['자궁', '난소', '면역계'],
  },

  // ── 피부/점막 자극 성분 (Skin/Mucous Irritants) — -3점 ────────────────
  synthetic_fragrance: {
    id: 'synthetic_fragrance',
    name: 'Fragrance / Parfum',
    nameKo: '합성향료',
    riskLevel: 'caution',
    category: 'fragrance',
    riskPoints: 5,
    description:
      '"향료"라고 표기된 성분은 최대 3,000여 가지의 화학물질을 포함할 수 있습니다. 여성 민감 부위에 알레르기 반응, 호르몬 교란을 유발할 수 있습니다.',
    affectedOrgans: ['피부', '점막', '호흡계'],
  },
  sodium_benzoate: {
    id: 'sodium_benzoate',
    name: 'Sodium Benzoate',
    nameKo: '벤조산나트륨',
    riskLevel: 'caution',
    category: 'skin_irritant',
    riskPoints: 3,
    description:
      '방부제로 사용되며, 비타민C와 반응 시 발암물질 벤젠을 생성합니다. 장 내 염증을 악화시킬 수 있습니다.',
    affectedOrgans: ['대장', '간'],
  },
  dmdm_hydantoin: {
    id: 'dmdm_hydantoin',
    name: 'DMDM Hydantoin',
    nameKo: 'DMDM 하이단토인 (포름알데히드 방출)',
    riskLevel: 'danger',
    category: 'skin_irritant',
    riskPoints: 12,
    description:
      '포름알데히드를 천천히 방출하는 방부제입니다. 포름알데히드는 IARC 1군 발암물질로, 두피와 피부에 지속 노출 시 위험합니다.',
    affectedOrgans: ['피부', '면역계'],
  },

  // ── 안전 성분 (Safe Ingredients) — 0점 감점 ──────────────────────────
  vitamin_c: {
    id: 'vitamin_c',
    name: 'Ascorbic Acid (Vitamin C)',
    nameKo: '아스코르브산 (비타민C)',
    riskLevel: 'safe',
    category: 'safe',
    riskPoints: 0,
    description:
      '강력한 항산화제로 세포 손상을 방지합니다. 면역 기능을 강화하고 콜라겐 생성을 돕습니다.',
    affectedOrgans: ['면역계', '피부'],
  },
  magnesium_glycinate: {
    id: 'magnesium_glycinate',
    name: 'Magnesium Glycinate',
    nameKo: '글리신산마그네슘 (천연 마그네슘)',
    riskLevel: 'safe',
    category: 'premium',
    riskPoints: 0,
    description:
      '흡수율이 높은 킬레이트 마그네슘입니다. 자율신경계 안정화, 생리통 완화, 수면 개선에 탁월합니다.',
    affectedOrgans: ['신경계', '자궁', '근육'],
  },
  zinc_bisglycinate: {
    id: 'zinc_bisglycinate',
    name: 'Zinc Bisglycinate',
    nameKo: '비스글리신산아연',
    riskLevel: 'safe',
    category: 'premium',
    riskPoints: 0,
    description:
      '생체 이용률이 높은 아연 형태입니다. 여성 호르몬 균형 유지와 난소 기능 지원에 중요합니다.',
    affectedOrgans: ['난소', '면역계', '피부'],
  },
  organic_cotton: {
    id: 'organic_cotton',
    name: 'Certified Organic Cotton',
    nameKo: '유기농 인증 면',
    riskLevel: 'safe',
    category: 'premium',
    riskPoints: 0,
    description:
      'GOTS 인증 유기농 면으로, 농약 잔류물 없이 재배된 천연 소재입니다. 통기성이 좋고 점막 자극이 최소화됩니다.',
    affectedOrgans: ['점막', '피부'],
  },
  hyaluronic_acid: {
    id: 'hyaluronic_acid',
    name: 'Sodium Hyaluronate',
    nameKo: '히알루론산',
    riskLevel: 'safe',
    category: 'safe',
    riskPoints: 0,
    description:
      '피부 자체에서 생성되는 천연 보습 성분입니다. 피부 장벽을 강화하고 수분을 오래 유지시켜 줍니다.',
    affectedOrgans: ['피부'],
  },
  centella_asiatica: {
    id: 'centella_asiatica',
    name: 'Centella Asiatica Extract',
    nameKo: '병풀 추출물 (시카)',
    riskLevel: 'safe',
    category: 'premium',
    riskPoints: 0,
    description:
      '진정, 재생, 항염 효과가 뛰어난 천연 식물 추출물입니다. 피부 장벽 회복과 콜라겐 합성 촉진에 도움을 줍니다.',
    affectedOrgans: ['피부'],
  },
  niacinamide: {
    id: 'niacinamide',
    name: 'Niacinamide (Vitamin B3)',
    nameKo: '나이아신아마이드 (비타민B3)',
    riskLevel: 'safe',
    category: 'safe',
    riskPoints: 0,
    description:
      '미백, 모공 축소, 피부 장벽 강화 효과가 있는 안전한 성분입니다. 다양한 피부 타입에 잘 맞습니다.',
    affectedOrgans: ['피부'],
  },
  vitamin_d3: {
    id: 'vitamin_d3',
    name: 'Cholecalciferol (Vitamin D3)',
    nameKo: '콜레칼시페롤 (비타민D3)',
    riskLevel: 'safe',
    category: 'premium',
    riskPoints: 0,
    description:
      '면역 조절, 호르몬 합성, 뼈 건강에 필수적인 비타민입니다. 여성 건강에 특히 중요하며 비타민D 결핍은 자궁내막증 위험을 높입니다.',
    affectedOrgans: ['면역계', '뼈', '자궁'],
  },
  omega3: {
    id: 'omega3',
    name: 'EPA/DHA (Omega-3)',
    nameKo: 'EPA/DHA (오메가-3)',
    riskLevel: 'safe',
    category: 'premium',
    riskPoints: 0,
    description:
      '항염 작용으로 생리통, 자궁내막증 증상을 완화합니다. 세포막 건강과 호르몬 전구체 합성에 필수적입니다.',
    affectedOrgans: ['자궁', '신경계', '면역계'],
  },
}

// ── Sample Product Database ────────────────────────────────────────────────

export const SAMPLE_PRODUCTS: ProductIngredientData[] = [
  {
    id: 'prod_001',
    name: '칼마그D 정',
    brand: '롯데헬스케어',
    category: 'supplement',
    barcode: '8801234567890',
    ingredientIds: [
      'silicon_dioxide',
      'magnesium_stearate',
      'titanium_dioxide',
      'vitamin_c',
      'vitamin_d3',
    ],
    safetyScore: 68,
    ludiaGrade: 'CAUTION',
  },
  {
    id: 'prod_002',
    name: '비타민C 1000 발포정',
    brand: 'GNC Korea',
    category: 'supplement',
    barcode: '8809876543210',
    ingredientIds: [
      'vitamin_c',
      'sodium_benzoate',
      'silicon_dioxide',
      'magnesium_stearate',
    ],
    safetyScore: 74,
    ludiaGrade: 'CAUTION',
  },
  {
    id: 'prod_003',
    name: '화이트 생리대 오버나이트',
    brand: '유한킴벌리',
    category: 'sanitary',
    barcode: '8801111222333',
    ingredientIds: [
      'chlorine',
      'synthetic_fragrance',
      'sodium_lauryl_sulfate',
      'peg_compounds',
    ],
    safetyScore: 38,
    ludiaGrade: 'DANGER',
  },
  {
    id: 'prod_004',
    name: '순면 생리대 일반형',
    brand: '한산생활',
    category: 'sanitary',
    barcode: '8804444555666',
    ingredientIds: [
      'organic_cotton',
      'silicon_dioxide',
    ],
    safetyScore: 88,
    ludiaGrade: 'GREEN',
  },
  {
    id: 'prod_005',
    name: '데일리 수분크림',
    brand: '이니스프리',
    category: 'cosmetics',
    barcode: '8807777888999',
    ingredientIds: [
      'methylparaben',
      'propylparaben',
      'synthetic_fragrance',
      'hyaluronic_acid',
      'niacinamide',
    ],
    safetyScore: 44,
    ludiaGrade: 'DANGER',
  },
  {
    id: 'prod_006',
    name: '시카 진정 크림',
    brand: 'Dr.Jart+',
    category: 'cosmetics',
    barcode: '8800001112223',
    ingredientIds: [
      'centella_asiatica',
      'hyaluronic_acid',
      'niacinamide',
      'sodium_benzoate',
    ],
    safetyScore: 82,
    ludiaGrade: 'GREEN',
  },
  {
    id: 'prod_007',
    name: 'LUDIA 프리미엄 마그네슘 복합',
    brand: 'LUDIA',
    category: 'supplement',
    barcode: '8800009998887',
    ingredientIds: [
      'magnesium_glycinate',
      'zinc_bisglycinate',
      'vitamin_d3',
      'omega3',
      'vitamin_c',
    ],
    safetyScore: 97,
    ludiaGrade: 'PREMIUM',
    isPartner: true,
  },
  {
    id: 'prod_008',
    name: 'LUDIA 유기농 순면 생리대',
    brand: 'LUDIA',
    category: 'sanitary',
    barcode: '8800009998886',
    ingredientIds: [
      'organic_cotton',
    ],
    safetyScore: 98,
    ludiaGrade: 'PREMIUM',
    isPartner: true,
  },
]

// ── Computed helpers ───────────────────────────────────────────────────────

export function computeSafetyScore(ingredientIds: string[]): number {
  let score = 100
  for (const id of ingredientIds) {
    const info = INGREDIENT_DB[id]
    if (info) score -= info.riskPoints
  }
  return Math.max(0, Math.min(100, score))
}

export function getIngredients(ids: string[]): IngredientInfo[] {
  return ids.map(id => INGREDIENT_DB[id]).filter(Boolean)
}

export function getDangerousIngredients(ids: string[]): IngredientInfo[] {
  return getIngredients(ids).filter(i => i.riskLevel !== 'safe')
}

export function searchProducts(query: string): ProductIngredientData[] {
  const q = query.toLowerCase().trim()
  if (!q) return SAMPLE_PRODUCTS
  return SAMPLE_PRODUCTS.filter(
    p =>
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.barcode?.includes(q),
  )
}

export function getAlternative(product: ProductIngredientData): ProductIngredientData | null {
  if (product.ludiaGrade === 'PREMIUM' || product.ludiaGrade === 'GREEN') return null
  return (
    SAMPLE_PRODUCTS.find(
      p =>
        p.category === product.category &&
        p.isPartner &&
        p.safetyScore > product.safetyScore,
    ) ?? null
  )
}
