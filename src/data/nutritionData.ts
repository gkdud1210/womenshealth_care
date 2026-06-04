export type HealthMode = '임신' | '다이어트' | '항암' | '갱년기' | '일반'

export interface NutrientInfo {
  name: string
  amount: string
  unit: string
  description: string
  emoji: string
}

export interface FoodItem {
  id: string
  name: string
  emoji: string
  calories: number
  highlights: string[]
  nutrients: { name: string; value: string }[]
  benefit: string
  tag?: string
}

export interface Recipe {
  id: string
  name: string
  emoji: string
  time: string
  difficulty: '쉬움' | '보통' | '어려움'
  servings: number
  calories: number
  keyNutrient: string
  ingredients: string[]
  steps: string[]
  tip?: string
}

export interface ModeData {
  mode: HealthMode
  emoji: string
  description: string
  color: string
  bg: string
  border: string
  accent: string
  nutrients: NutrientInfo[]
  foods: FoodItem[]
  recipes: Recipe[]
}

export const NUTRITION_DATA: ModeData[] = [
  {
    mode: '임신',
    emoji: '🤰',
    description: '태아 발달과 산모 건강을 위한 영양 관리',
    color: '#16a34a',
    bg: 'rgba(22,163,74,0.08)',
    border: 'rgba(22,163,74,0.2)',
    accent: '#dcfce7',
    nutrients: [
      { name: '엽산', amount: '600', unit: 'μg/일', description: '신경관 결손 예방, 세포 분열 촉진', emoji: '🌿' },
      { name: '철분', amount: '27', unit: 'mg/일', description: '빈혈 예방, 태아 산소 공급', emoji: '🩸' },
      { name: '칼슘', amount: '1000', unit: 'mg/일', description: '태아 뼈·치아 형성', emoji: '🦴' },
      { name: 'DHA', amount: '200', unit: 'mg/일', description: '태아 뇌·시신경 발달', emoji: '🐟' },
    ],
    foods: [
      {
        id: 'preg-1', name: '시금치', emoji: '🥬', calories: 23,
        highlights: ['엽산 풍부', '철분 함유', '비타민K'],
        nutrients: [{ name: '엽산', value: '194μg/100g' }, { name: '철분', value: '2.7mg/100g' }, { name: '칼슘', value: '99mg/100g' }],
        benefit: '임신 초기 신경관 형성에 필수적인 엽산이 풍부해 매일 섭취를 권장합니다.',
      },
      {
        id: 'preg-2', name: '연어', emoji: '🐟', calories: 208,
        highlights: ['DHA 풍부', '단백질', '비타민D'],
        nutrients: [{ name: 'DHA', value: '1,800mg/100g' }, { name: '단백질', value: '20g/100g' }, { name: '비타민D', value: '11μg/100g' }],
        benefit: '태아 뇌 발달에 필수적인 오메가-3(DHA)가 풍부하며, 수은 함량이 낮아 안전합니다.',
        tag: '추천',
      },
      {
        id: 'preg-3', name: '두부', emoji: '🫙', calories: 76,
        highlights: ['식물성 단백질', '칼슘', '이소플라본'],
        nutrients: [{ name: '단백질', value: '8.1g/100g' }, { name: '칼슘', value: '123mg/100g' }, { name: '철분', value: '1.3mg/100g' }],
        benefit: '부드러운 식감으로 입덧 시기에도 섭취 가능하며, 칼슘과 단백질을 동시에 보충합니다.',
      },
      {
        id: 'preg-4', name: '아보카도', emoji: '🥑', calories: 160,
        highlights: ['엽산', '건강한 지방', '칼륨'],
        nutrients: [{ name: '엽산', value: '81μg/100g' }, { name: '지방', value: '15g/100g' }, { name: '칼륨', value: '485mg/100g' }],
        benefit: '건강한 불포화지방산으로 태아 뇌 발달을 돕고 임신부의 혈압 조절을 지원합니다.',
      },
      {
        id: 'preg-5', name: '요거트', emoji: '🥛', calories: 61,
        highlights: ['칼슘 풍부', '프로바이오틱스', '단백질'],
        nutrients: [{ name: '칼슘', value: '110mg/100g' }, { name: '단백질', value: '3.5g/100g' }, { name: '비타민B12', value: '0.4μg/100g' }],
        benefit: '장 건강을 개선해 변비 예방에 도움을 주며, 칼슘 흡수율이 높습니다.',
        tag: 'BEST',
      },
    ],
    recipes: [
      {
        id: 'preg-r1', name: '연어 아보카도 덮밥', emoji: '🍱',
        time: '20분', difficulty: '쉬움', servings: 1, calories: 520, keyNutrient: 'DHA + 엽산',
        ingredients: ['현미밥 150g', '훈제연어 80g', '아보카도 1/2개', '시금치 한 줌', '레몬즙 1작은술', '간장 1작은술', '참기름 약간', '깨소금'],
        steps: [
          '시금치를 끓는 물에 30초 데쳐 찬물에 헹군 뒤 물기를 짜고 참기름·소금으로 무칩니다.',
          '아보카도를 반으로 갈라 씨를 제거하고 얇게 슬라이스합니다.',
          '현미밥 위에 시금치 나물, 훈제연어, 아보카도를 올립니다.',
          '간장과 레몬즙을 섞어 소스로 뿌리고 깨소금을 마무리합니다.',
        ],
        tip: '현미밥 대신 잡곡밥을 쓰면 식이섬유를 더 섭취할 수 있어요.',
      },
      {
        id: 'preg-r2', name: '두부 시금치 된장국', emoji: '🍲',
        time: '15분', difficulty: '쉬움', servings: 2, calories: 95, keyNutrient: '철분 + 칼슘',
        ingredients: ['두부 150g', '시금치 100g', '된장 1.5큰술', '다시마 육수 500ml', '대파 1/4대', '마늘 1쪽'],
        steps: [
          '다시마 육수를 냄비에 넣고 중불로 끓입니다.',
          '된장을 체에 걸러 풀어 넣고 마늘을 다져 넣습니다.',
          '두부를 한 입 크기로 썰어 넣고 2분간 끓입니다.',
          '시금치를 넣고 1분간 더 끓인 뒤 대파를 올려 마무리합니다.',
        ],
        tip: '시금치는 오래 끓이면 엽산이 파괴되므로 마지막에 짧게 넣어주세요.',
      },
    ],
  },
  {
    mode: '다이어트',
    emoji: '🥗',
    description: '건강한 체중 관리를 위한 균형 잡힌 식단',
    color: '#2563eb',
    bg: 'rgba(37,99,235,0.08)',
    border: 'rgba(37,99,235,0.2)',
    accent: '#dbeafe',
    nutrients: [
      { name: '단백질', amount: '체중×1.2~1.6', unit: 'g/일', description: '근육량 유지, 포만감 지속', emoji: '💪' },
      { name: '식이섬유', amount: '25~30', unit: 'g/일', description: '장 건강, 혈당 안정화', emoji: '🌾' },
      { name: '수분', amount: '2,000+', unit: 'ml/일', description: '대사율 향상, 포만감 조절', emoji: '💧' },
      { name: '건강지방', amount: '총 칼로리의 25~35', unit: '%', description: '지용성 비타민 흡수 지원', emoji: '🥑' },
    ],
    foods: [
      {
        id: 'diet-1', name: '닭가슴살', emoji: '🍗', calories: 165,
        highlights: ['고단백', '저지방', '저칼로리'],
        nutrients: [{ name: '단백질', value: '31g/100g' }, { name: '지방', value: '3.6g/100g' }, { name: '칼로리', value: '165kcal/100g' }],
        benefit: '다이어트 식단의 핵심. 근육량을 유지하면서 체지방 감소를 돕습니다.',
        tag: 'BEST',
      },
      {
        id: 'diet-2', name: '고구마', emoji: '🍠', calories: 86,
        highlights: ['복합탄수화물', '식이섬유', '베타카로틴'],
        nutrients: [{ name: '식이섬유', value: '3g/100g' }, { name: '칼로리', value: '86kcal/100g' }, { name: 'GI지수', value: '44 (낮음)' }],
        benefit: '낮은 GI 지수로 혈당을 천천히 올려 포만감이 오래 지속됩니다.',
      },
      {
        id: 'diet-3', name: '브로콜리', emoji: '🥦', calories: 34,
        highlights: ['초저칼로리', '고식이섬유', '항산화'],
        nutrients: [{ name: '식이섬유', value: '2.6g/100g' }, { name: '비타민C', value: '89mg/100g' }, { name: '칼로리', value: '34kcal/100g' }],
        benefit: '칼로리 대비 영양 밀도가 최고 수준. 볶음·수프 등 다양하게 활용 가능합니다.',
      },
      {
        id: 'diet-4', name: '계란', emoji: '🥚', calories: 155,
        highlights: ['완전단백질', '포만감', '비타민B군'],
        nutrients: [{ name: '단백질', value: '13g/100g' }, { name: '지방', value: '11g/100g' }, { name: '콜린', value: '251mg/100g' }],
        benefit: '아침 식사로 섭취하면 하루 종일 포만감을 유지해 과식을 방지합니다.',
        tag: '추천',
      },
      {
        id: 'diet-5', name: '그릭요거트', emoji: '🫙', calories: 59,
        highlights: ['고단백', '저당', '프로바이오틱스'],
        nutrients: [{ name: '단백질', value: '10g/100g' }, { name: '당류', value: '3.6g/100g' }, { name: '칼슘', value: '110mg/100g' }],
        benefit: '일반 요거트보다 2배 높은 단백질로 간식으로 활용하기에 완벽합니다.',
      },
    ],
    recipes: [
      {
        id: 'diet-r1', name: '닭가슴살 채소 볶음', emoji: '🥘',
        time: '25분', difficulty: '쉬움', servings: 1, calories: 310, keyNutrient: '고단백 저칼로리',
        ingredients: ['닭가슴살 150g', '브로콜리 100g', '파프리카 1/2개', '양파 1/4개', '간장 2작은술', '올리브오일 1작은술', '마늘 2쪽', '후추'],
        steps: [
          '닭가슴살을 얇게 슬라이스하고 간장·마늘·후추로 10분간 재웁니다.',
          '브로콜리를 한 입 크기로 자르고, 파프리카와 양파를 채썹니다.',
          '팬을 강불로 달궈 올리브오일을 두르고 닭가슴살을 먼저 볶아 반쯤 익힙니다.',
          '채소를 넣고 3~4분 더 볶아 완성합니다.',
        ],
        tip: '닭가슴살을 사전에 재워두면 훨씬 부드럽게 먹을 수 있어요.',
      },
      {
        id: 'diet-r2', name: '고구마 그릭요거트 볼', emoji: '🥗',
        time: '10분', difficulty: '쉬움', servings: 1, calories: 220, keyNutrient: '식이섬유 + 단백질',
        ingredients: ['고구마 100g (삶은 것)', '그릭요거트 100g', '블루베리 50g', '아몬드 10g', '꿀 1작은술', '시나몬 약간'],
        steps: [
          '고구마를 전자레인지에 5분 익히거나 삶아서 식힙니다.',
          '볼에 그릭요거트를 담고 고구마를 으깨어 올립니다.',
          '블루베리와 아몬드를 얹고 꿀과 시나몬을 뿌려 완성합니다.',
        ],
        tip: '고구마 대신 바나나 1/2개로도 맛있게 만들 수 있어요.',
      },
    ],
  },
  {
    mode: '항암',
    emoji: '💜',
    description: '항암 치료 중·후 면역력 강화와 영양 회복',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.08)',
    border: 'rgba(124,58,237,0.2)',
    accent: '#ede9fe',
    nutrients: [
      { name: '항산화 비타민', amount: '충분량', unit: '(C·E·베타카로틴)', description: '자유라디칼 제거, 세포 보호', emoji: '🍊' },
      { name: '단백질', amount: '체중×1.2~2.0', unit: 'g/일', description: '조직 회복, 면역세포 생성', emoji: '🥩' },
      { name: '셀레늄', amount: '55~200', unit: 'μg/일', description: '항산화 효소 활성화', emoji: '🌰' },
      { name: '식물성 화합물', amount: '매끼', unit: '포함', description: '암세포 성장 억제 효과', emoji: '🥦' },
    ],
    foods: [
      {
        id: 'cancer-1', name: '강황', emoji: '🫚', calories: 354,
        highlights: ['커큐민', '강력 항염', '항산화'],
        nutrients: [{ name: '커큐민', value: '3.14g/100g' }, { name: '철분', value: '41.4mg/100g' }, { name: '항산화지수', value: '매우 높음' }],
        benefit: '커큐민 성분이 암세포 성장을 억제하고 항암 치료 부작용을 완화하는 데 도움을 줍니다.',
        tag: '추천',
      },
      {
        id: 'cancer-2', name: '블루베리', emoji: '🫐', calories: 57,
        highlights: ['안토시아닌', '비타민C', '항산화'],
        nutrients: [{ name: '안토시아닌', value: '163mg/100g' }, { name: '비타민C', value: '9.7mg/100g' }, { name: '식이섬유', value: '2.4g/100g' }],
        benefit: '강력한 항산화 성분인 안토시아닌이 DNA 손상을 막고 면역 기능을 강화합니다.',
        tag: 'BEST',
      },
      {
        id: 'cancer-3', name: '브로콜리', emoji: '🥦', calories: 34,
        highlights: ['설포라판', '항암 성분', '면역 강화'],
        nutrients: [{ name: '설포라판', value: '풍부', }, { name: '비타민C', value: '89mg/100g' }, { name: '인돌-3-카비놀', value: '함유' }],
        benefit: '설포라판이 발암 물질을 무력화하고 암세포의 자기소멸(아포토시스)을 유도합니다.',
      },
      {
        id: 'cancer-4', name: '마늘', emoji: '🧄', calories: 149,
        highlights: ['알리신', '항암 효과', '면역 강화'],
        nutrients: [{ name: '알리신', value: '5mg/g (다진 것)' }, { name: '셀레늄', value: '14.2μg/100g' }, { name: '비타민B6', value: '1.2mg/100g' }],
        benefit: '알리신이 암세포 성장을 억제하고 면역 세포 활성을 높입니다. 다져서 5분 후 섭취가 효과적입니다.',
      },
      {
        id: 'cancer-5', name: '토마토', emoji: '🍅', calories: 18,
        highlights: ['리코펜', '항산화', '저칼로리'],
        nutrients: [{ name: '리코펜', value: '2.57mg/100g (익힌 것↑)' }, { name: '비타민C', value: '14mg/100g' }, { name: '칼로리', value: '18kcal/100g' }],
        benefit: '리코펜은 익힐수록 흡수율이 높아지므로, 올리브오일과 함께 가열 조리 시 더욱 효과적입니다.',
      },
    ],
    recipes: [
      {
        id: 'cancer-r1', name: '강황 두부 수프', emoji: '🍵',
        time: '30분', difficulty: '쉬움', servings: 2, calories: 185, keyNutrient: '커큐민 + 단백질',
        ingredients: ['두부 200g', '당근 1/2개', '양파 1/2개', '강황가루 1작은술', '생강 1쪽', '채소 육수 400ml', '코코넛밀크 100ml', '올리브오일 1큰술', '소금·후추'],
        steps: [
          '양파와 당근을 작게 썰고, 올리브오일로 양파가 투명해질 때까지 중불에 볶습니다.',
          '강황가루와 생강을 넣고 30초간 더 볶아 향을 냅니다.',
          '채소 육수를 붓고 당근이 부드러워질 때까지 12분간 끓입니다.',
          '두부를 넣고 코코넛밀크를 추가해 5분 더 끓인 후 소금·후추로 간합니다.',
        ],
        tip: '강황은 흑후추와 함께 먹으면 커큐민 흡수율이 20배 높아집니다.',
      },
      {
        id: 'cancer-r2', name: '항산화 베리 스무디', emoji: '🥤',
        time: '5분', difficulty: '쉬움', servings: 1, calories: 195, keyNutrient: '항산화 비타민',
        ingredients: ['블루베리 100g', '딸기 80g', '바나나 1/2개', '그릭요거트 80g', '아마씨 1큰술', '아몬드밀크 150ml'],
        steps: [
          '모든 재료를 블렌더에 넣습니다.',
          '부드럽게 갈아 컵에 담아 바로 섭취합니다.',
        ],
        tip: '항암 치료 중 구강 점막이 민감할 때, 차갑지 않게 상온 재료로 만드세요.',
      },
    ],
  },
  {
    mode: '갱년기',
    emoji: '🌸',
    description: '호르몬 변화에 따른 뼈 건강 및 심혈관 관리',
    color: '#d97706',
    bg: 'rgba(217,119,6,0.08)',
    border: 'rgba(217,119,6,0.2)',
    accent: '#fef3c7',
    nutrients: [
      { name: '칼슘', amount: '1,200', unit: 'mg/일', description: '골다공증 예방, 뼈 밀도 유지', emoji: '🦴' },
      { name: '비타민D', amount: '800~1,000', unit: 'IU/일', description: '칼슘 흡수 증진, 면역 조절', emoji: '☀️' },
      { name: '식물성 에스트로겐', amount: '40~80', unit: 'mg/일', description: '호르몬 균형, 안면홍조 완화', emoji: '🌿' },
      { name: '마그네슘', amount: '320', unit: 'mg/일', description: '수면 개선, 근육 이완', emoji: '🫘' },
    ],
    foods: [
      {
        id: 'meno-1', name: '두유', emoji: '🥛', calories: 54,
        highlights: ['이소플라본', '식물성 에스트로겐', '칼슘'],
        nutrients: [{ name: '이소플라본', value: '20~30mg/200ml' }, { name: '칼슘', value: '120mg/200ml (강화)' }, { name: '단백질', value: '3.3g/100ml' }],
        benefit: '이소플라본이 에스트로겐 수용체에 결합해 안면홍조와 야간 발한을 자연스럽게 완화합니다.',
        tag: 'BEST',
      },
      {
        id: 'meno-2', name: '멸치', emoji: '🐟', calories: 210,
        highlights: ['칼슘 최고', '비타민D', '단백질'],
        nutrients: [{ name: '칼슘', value: '509mg/100g' }, { name: '비타민D', value: '8.7μg/100g' }, { name: '단백질', value: '17g/100g' }],
        benefit: '칼슘과 비타민D를 동시에 함유해 갱년기 골밀도 감소를 효과적으로 예방합니다.',
        tag: '추천',
      },
      {
        id: 'meno-3', name: '아마씨', emoji: '🌾', calories: 534,
        highlights: ['리그난', '오메가-3', '식이섬유'],
        nutrients: [{ name: '리그난', value: '0.3g/30g' }, { name: '오메가-3', value: '6.6g/30g' }, { name: '식이섬유', value: '7.6g/30g' }],
        benefit: '리그난 성분이 체내에서 식물성 에스트로겐으로 전환되어 호르몬 균형을 돕습니다.',
      },
      {
        id: 'meno-4', name: '시금치', emoji: '🥬', calories: 23,
        highlights: ['마그네슘', '칼슘', '비타민K'],
        nutrients: [{ name: '마그네슘', value: '79mg/100g' }, { name: '칼슘', value: '99mg/100g' }, { name: '비타민K', value: '483μg/100g' }],
        benefit: '마그네슘이 수면 품질을 개선하고 신경과 근육 기능을 안정시킵니다.',
      },
      {
        id: 'meno-5', name: '청국장', emoji: '🫘', calories: 210,
        highlights: ['이소플라본', '프로바이오틱스', '단백질'],
        nutrients: [{ name: '이소플라본', value: '40~60mg/100g' }, { name: '단백질', value: '19g/100g' }, { name: '프로바이오틱스', value: '풍부' }],
        benefit: '발효 과정에서 이소플라본 흡수율이 높아지며, 장내 유익균도 함께 보충됩니다.',
      },
    ],
    recipes: [
      {
        id: 'meno-r1', name: '두유 시금치 리소토', emoji: '🍚',
        time: '35분', difficulty: '보통', servings: 2, calories: 380, keyNutrient: '이소플라본 + 칼슘',
        ingredients: ['쌀 150g', '두유 300ml', '채소 육수 200ml', '시금치 100g', '양파 1/2개', '마늘 2쪽', '올리브오일 2큰술', '파마산 치즈 20g', '소금·후추'],
        steps: [
          '쌀을 씻어 물기를 뺀 후, 올리브오일에 양파·마늘을 볶아 쌀을 넣고 2분간 더 볶습니다.',
          '채소 육수를 조금씩 넣어가며 흡수될 때까지 저어줍니다.',
          '두유를 2~3번에 나눠 넣으며 쌀이 크리미하게 익을 때까지 저어줍니다.',
          '시금치를 넣고 2분 더 익힌 뒤 파마산 치즈로 마무리합니다.',
        ],
        tip: '두유 특유의 비린 맛이 신경 쓰인다면 넛크림 두유를 사용해보세요.',
      },
      {
        id: 'meno-r2', name: '멸치 두부 조림', emoji: '🍱',
        time: '20분', difficulty: '쉬움', servings: 2, calories: 265, keyNutrient: '칼슘 + 단백질',
        ingredients: ['두부 300g', '국물용 멸치 30g', '간장 2큰술', '매실청 1큰술', '참기름 1작은술', '다진 마늘 1작은술', '청양고추 1개 (선택)', '물 100ml'],
        steps: [
          '두부를 두껍게 썰어 키친타월로 물기를 최대한 제거합니다.',
          '팬에 기름 없이 두부를 노릇하게 앞뒤로 굽습니다.',
          '멸치를 마른 팬에 볶은 뒤, 간장·매실청·마늘·물을 넣고 끓입니다.',
          '두부를 넣고 소스가 자작해질 때까지 조린 후 참기름으로 마무리합니다.',
        ],
      },
    ],
  },
  {
    mode: '일반',
    emoji: '✨',
    description: '일상 건강 유지를 위한 균형 잡힌 영양 섭취',
    color: '#e11d5a',
    bg: 'rgba(225,29,90,0.08)',
    border: 'rgba(225,29,90,0.2)',
    accent: '#ffe4ec',
    nutrients: [
      { name: '단백질', amount: '체중×0.8~1.0', unit: 'g/일', description: '근육·효소·호르몬 합성', emoji: '💪' },
      { name: '탄수화물', amount: '총 칼로리의 45~65', unit: '%', description: '에너지 공급, 뇌 기능 지원', emoji: '🌾' },
      { name: '건강 지방', amount: '총 칼로리의 20~35', unit: '%', description: '호르몬 합성, 세포막 형성', emoji: '🥑' },
      { name: '비타민·미네랄', amount: '다양한 채소·과일', unit: '매일', description: '대사 효소 보조인자', emoji: '🥝' },
    ],
    foods: [
      {
        id: 'gen-1', name: '연어', emoji: '🐟', calories: 208,
        highlights: ['오메가-3', '단백질', '비타민D'],
        nutrients: [{ name: '오메가-3', value: '2.2g/100g' }, { name: '단백질', value: '20g/100g' }, { name: '비타민D', value: '11μg/100g' }],
        benefit: '심혈관 건강과 뇌 기능에 도움을 주는 오메가-3 지방산의 최고 공급원입니다.',
        tag: 'BEST',
      },
      {
        id: 'gen-2', name: '현미', emoji: '🍚', calories: 111,
        highlights: ['복합탄수화물', '식이섬유', '비타민B군'],
        nutrients: [{ name: '식이섬유', value: '1.8g/100g (백미 3배)' }, { name: '마그네슘', value: '43mg/100g' }, { name: 'GI지수', value: '50 (백미 72 대비)' }],
        benefit: '혈당을 천천히 올려 에너지를 지속적으로 공급하며, 식이섬유로 장 건강을 개선합니다.',
      },
      {
        id: 'gen-3', name: '견과류 믹스', emoji: '🥜', calories: 607,
        highlights: ['건강 지방', '항산화', '미네랄'],
        nutrients: [{ name: '비타민E', value: '26mg/100g' }, { name: '마그네슘', value: '270mg/100g' }, { name: '오메가-3', value: '6.8g/100g (호두)' }],
        benefit: '하루 한 줌(약 30g)이 심장병 위험을 줄이고 뇌 건강을 지원합니다.',
        tag: '추천',
      },
      {
        id: 'gen-4', name: '계란', emoji: '🥚', calories: 155,
        highlights: ['완전단백질', '콜린', '루테인'],
        nutrients: [{ name: '단백질', value: '13g/100g' }, { name: '콜린', value: '251mg/100g' }, { name: '루테인·제아잔틴', value: '218μg/100g' }],
        benefit: '모든 필수 아미노산을 포함한 완전단백질로, 눈 건강과 뇌 기능에도 도움을 줍니다.',
      },
      {
        id: 'gen-5', name: '키위', emoji: '🥝', calories: 61,
        highlights: ['비타민C', '소화 효소', '수면 유도'],
        nutrients: [{ name: '비타민C', value: '92mg/100g (레몬 2배)' }, { name: '악티니딘', value: '단백질 소화 효소' }, { name: '세로토닌', value: '5.8μg/g' }],
        benefit: '취침 1시간 전 키위 2개 섭취가 수면 시간과 질을 향상시킨다는 연구 결과가 있습니다.',
      },
    ],
    recipes: [
      {
        id: 'gen-r1', name: '균형 샐러드 볼', emoji: '🥗',
        time: '15분', difficulty: '쉬움', servings: 1, calories: 445, keyNutrient: '균형 영양',
        ingredients: ['혼합 채소 100g', '현미밥 100g', '삶은 달걀 1개', '아보카도 1/4개', '방울토마토 8개', '견과류 20g', '올리브오일 1큰술', '레몬즙 1큰술', '소금·후추'],
        steps: [
          '현미밥을 볼 한쪽에 담고 혼합 채소를 풍성하게 얹습니다.',
          '삶은 달걀을 반으로 자르고, 아보카도를 슬라이스합니다.',
          '방울토마토와 함께 색깔별로 예쁘게 배치합니다.',
          '올리브오일과 레몬즙을 드레싱으로 뿌리고 견과류를 올려 마무리합니다.',
        ],
        tip: '드레싱에 꿀 1/2작은술을 추가하면 상큼달콤한 맛을 낼 수 있어요.',
      },
      {
        id: 'gen-r2', name: '연어 현미 주먹밥', emoji: '🍙',
        time: '20분', difficulty: '쉬움', servings: 2, calories: 390, keyNutrient: '오메가-3 + 복합탄수화물',
        ingredients: ['현미밥 200g', '훈제연어 80g', '아보카도 1/4개', '깨소금 1큰술', '참기름 1작은술', '소금 약간'],
        steps: [
          '현미밥에 참기름·소금·깨소금을 넣고 섞어 간을 맞춥니다.',
          '훈제연어와 아보카도를 작게 썹니다.',
          '랩 위에 밥을 넓게 펴고, 중앙에 연어와 아보카도를 올립니다.',
          '랩으로 감싸 동글게 모양을 잡아 주먹밥을 완성합니다.',
        ],
      },
    ],
  },
]
