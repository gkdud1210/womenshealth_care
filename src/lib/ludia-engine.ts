/**
 * LUDIA AI Response Engine
 * Fuses cycle phase, EDA, thermal, iris, and bio-signal data
 * to generate personalized, context-aware health insights.
 */

import type { MultimodalData } from '@/components/calendar/LudiaInsightCard'
import type { CyclePhase } from '@/types/health'
import { getPhaseLabel } from '@/lib/cycle-utils'
import type { OnboardingProfile } from '@/lib/onboarding-profile'

export interface LudiaResponse {
  text: string
  sources: string[]
  confidence: 'high' | 'medium'
}

function hit(q: string, words: string[]): boolean {
  return words.some(w => q.includes(w))
}

export function askLudia(
  question: string,
  data: MultimodalData,
  phase: CyclePhase,
  cycleDay: number,
  profile?: OnboardingProfile,
): LudiaResponse {
  const careTypes = profile?.careTypes ?? []
  const a         = profile?.answers ?? {}
  // 온보딩 컨텍스트 헬퍼
  const hasPainCare    = careTypes.includes('period_pain') || careTypes.includes('healthy_cycle')
  const hasSkinCare    = careTypes.includes('skin_acne')
  const hasFertility   = careTypes.includes('fertility')
  const hasStressCare  = careTypes.includes('stress')
  const hasThyroid     = careTypes.includes('thyroid_uterus')
  const painLevel      = typeof a.period_pain_level === 'number' ? a.period_pain_level : 0
  const coldReported   = a.period_coldness === '자주 그래요'
  const thyroidAlert   = a.thyroid_checkup === '네, 있어요' || a.thyroid_swelling === '자주 그래요'
  const q = question.toLowerCase()
  const phaseName    = getPhaseLabel(phase)
  const irisAvg      = Math.round((data.iris.leftScore + data.iris.rightScore) / 2)
  const stressHigh   = data.eda.stressIndex >= 65
  const stressMid    = data.eda.stressIndex >= 45
  const coldUterus   = data.thermal.uterineTemp < 36.2
  const lowHRV       = data.biosignal.hrv < 38
  const poorSleep    = data.biosignal.sleepHours < 6.5
  const ansSym       = data.eda.ansBalance < 45
  const daysLeft     = 28 - cycleDay

  // ── PERIOD / CYCLE ─────────────────────────────────────────────
  if (hit(q, ['생리', '월경', '주기', '언제', '예정', '다음', '올까', '주기가'])) {
    if (phase === 'menstrual') {
      return {
        text: `지금 생리 중이에요 (D+${cycleDay}일째). 자궁 온도 ${data.thermal.uterineTemp}°C ${coldUterus ? '— 냉기 패턴이 감지돼요. 혈관이 수축하면서 통증이 더 심할 수 있어서, 핫팩과 따뜻한 생강차를 지금 바로 챙겨보세요' : '— 정상 범위예요'}. HRV ${data.biosignal.hrv}ms ${lowHRV ? '— 몸이 많이 소모된 상태라 철분·마그네슘 보충과 충분한 수면이 우선이에요' : '— 회복 상태가 양호해요'}. 다음 생리는 약 ${daysLeft + 28}일 후 예정이에요.`,
        sources: ['열화상', 'HRV', '주기'],
        confidence: 'high',
      }
    }
    return {
      text: `현재 D+${cycleDay}일 ${phaseName}이에요. 다음 생리 예정은 약 ${daysLeft}일 후입니다. ${
        phase === 'luteal' && cycleDay >= 21
          ? `PMS 구간에 접어들었어요. EDA 스트레스 ${data.eda.stressIndex}점 ${stressHigh ? '— 피부 전도도가 높아 불안·예민함이 올 수 있으니 지금부터 마그네슘 보충을 시작하면 좋아요' : '— 현재는 관리 가능한 수준이에요'}. 카페인을 줄이고 탄수화물보다 단백질 위주 식사를 권장해요.`
          : phase === 'ovulation'
          ? `배란기라 기초 체온이 약간 상승해요. 자궁 온도 ${data.thermal.uterineTemp}°C — ${coldUterus ? '배란기 치고 다소 낮으니 보온을 신경쓰세요' : '배란 환경이 좋은 상태예요'}.`
          : phase === 'follicular'
          ? `에스트로겐 상승 구간이에요. 에너지가 점점 오르는 시기라 활동량을 늘려도 좋아요. HRV ${data.biosignal.hrv}ms — ${lowHRV ? '회복이 덜 됐으니 무리하지 않게 조절하세요' : '컨디션이 좋아요'}.`
          : `각 단계별 케어 정보가 필요하면 '황체기', '난포기', '배란기' 중 하나를 질문해보세요.`
      }`,
      sources: ['주기', 'EDA', '열화상'],
      confidence: 'high',
    }
  }

  // ── EDA / STRESS / SKIN CONDUCTANCE ───────────────────────────
  if (hit(q, ['스트레스', '긴장', '불안', '집중', 'eda', '피부전도', '자율신경', '멘탈', '이완'])) {
    return {
      text: `EDA 피부 전도도 분석 결과예요. 스트레스 지수 ${data.eda.stressIndex}/100 ${stressHigh ? '— 상당히 높은 수준이에요' : stressMid ? '— 보통 수준이에요' : '— 안정적이에요'}. 긴장도 ${data.eda.tensionLevel}점 vs 이완도 ${data.eda.relaxationScore}점으로 현재 ${data.eda.tensionLevel > data.eda.relaxationScore ? '긴장 상태' : '이완 상태'}예요. 자율신경 균형은 부교감 ${data.eda.ansBalance}% — ${ansSym ? '교감신경이 우세해서 몸이 계속 긴장 모드에 있어요' : '균형이 잘 맞아요'}. 피부 전도도 ${data.eda.conductance}μS. ${
        stressHigh
          ? `지금 당장 4-7-8 호흡(들숨 4초 → 정지 7초 → 날숨 8초)을 3회 반복하면 부교감 신경이 활성화돼요. ${phase === 'luteal' ? '황체기와 겹쳐 있어서 코르티솔이 프로게스테론 생성을 방해할 수 있으니 특히 스트레스 관리가 중요해요.' : ''}`
          : data.eda.relaxationScore < 45
          ? `이완도가 낮아요. 자연 소리, 클래식 음악, 또는 5분 명상이 이완 상태 회복에 효과적이에요.`
          : `EDA 상태가 좋아요. 현재 상태를 유지하세요.`
      }`,
      sources: ['EDA', '자율신경'],
      confidence: 'high',
    }
  }

  // ── THERMAL / UTERUS / COLD ────────────────────────────────────
  if (hit(q, ['자궁', '냉기', '냉증', '온도', '열화상', '하복부', '복부', '따뜻', '차가', '차갑'])) {
    const fertilityNote = hasFertility && coldUterus ? ' 임신 준비 중이라면 자궁 온도 36.5°C 이상 유지가 착상 성공률에 직접 영향을 줘요.' : ''
    const painNote = hasPainCare && painLevel >= 7 ? ` 생리통이 ${painLevel}/10으로 심한 편이라고 하셨는데, 냉기가 주요 원인 중 하나일 수 있어요.` : ''
    const coldConfirm = coldReported && coldUterus ? ' 문진에서도 아랫배 냉감을 자주 느낀다고 하셨기 때문에 지속적인 온열 케어가 중요해요.' : ''
    return {
      text: `열화상 스캔 데이터예요. 자궁 ${data.thermal.uterineTemp}°C ${coldUterus ? '— 정상(36.5°C)보다 낮아 냉기 패턴이에요' : '— 정상 범위예요'}, 좌측 난소 ${data.thermal.leftOvaryTemp}°C, 우측 난소 ${data.thermal.rightOvaryTemp}°C. ${
        coldUterus
          ? `자궁 냉증은 혈액 순환 저하가 원인이에요. 핫팩을 하복부에 15-20분 적용하고, 생강·쑥·계피 차를 꾸준히 마시면 온도가 올라요. ${phase === 'menstrual' ? '생리 중에는 자궁 혈관이 더 예민해서 특히 보온이 중요해요.' : phase === 'luteal' ? '황체기에 자궁이 차면 프로게스테론 활성도도 떨어질 수 있어요.' : ''} 족욕(40°C, 15분)도 자궁 혈류 개선에 매우 효과적이에요.${coldConfirm}${painNote}${fertilityNote}`
          : `자궁 온도가 건강해요. ${phase === 'ovulation' ? 'LH 서지 영향으로 체온이 자연스럽게 높아진 상태예요.' : '보온 관리가 잘 되고 있어요.'}`
      }`,
      sources: ['열화상', '주기'],
      confidence: 'high',
    }
  }

  // ── SLEEP ──────────────────────────────────────────────────────
  if (hit(q, ['수면', '잠', '피곤', '피로', '불면', '잠이', '수면의', '졸려', '피곤해'])) {
    return {
      text: `수면 데이터: ${data.biosignal.sleepHours}시간 ${poorSleep ? '— 권장(7시간) 미만이에요' : '— 충분해요'}. HRV ${data.biosignal.hrv}ms로 ${lowHRV ? '수면 중 회복이 덜 이루어진 상태예요. 수면의 질이 낮을 가능성이 있어요' : '수면 회복이 잘 되고 있어요'}. EDA 스트레스 ${data.eda.stressIndex}점이 ${stressHigh ? '높아서 입면에 방해가 될 수 있어요' : '높지 않아 수면 진입은 괜찮을 거예요'}. ${
        phase === 'luteal'
          ? `황체기에는 프로게스테론이 체온을 올려 수면이 얕아질 수 있어요. 마그네슘 글리시네이트 300mg을 취침 1시간 전에 복용해보세요. 자기 전 발을 따뜻하게(족욕 or 핫팩)하면 체온 저하가 빨라져 깊은 잠에 들기 쉬워요.`
          : phase === 'menstrual'
          ? `생리 중 철분 손실로 빈혈성 피로가 올 수 있어요. 철분(헴 철 위주)과 비타민 C를 함께 섭취하면 좋아요. 8시간 수면을 목표로 하세요.`
          : poorSleep
          ? `수면을 늘리기 위해 취침·기상 시간을 고정하고, 취침 2시간 전에는 스마트폰 블루라이트를 차단해보세요. 카모마일 차도 입면에 도움돼요.`
          : `${phaseName}에 수면 상태가 좋아요. 현재 루틴을 유지하세요.`
      }`,
      sources: ['바이오신호', 'EDA', '주기'],
      confidence: 'high',
    }
  }

  // ── IRIS ───────────────────────────────────────────────────────
  if (hit(q, ['홍채', '눈', '홍채 분석', '홍채 스캔', '홍채로'])) {
    const skinLow    = data.iris.skinZone < 65
    const thyLow     = data.iris.thyroidZone < 70
    const skinContext = hasSkinCare && skinLow ? ' 피부 케어 관심사를 선택하셨는데, 호르몬성 트러블 케어가 지금 가장 효과적이에요.' : ''
    const thyContext  = (hasThyroid || thyroidAlert) && thyLow ? ' 갑상선 케어 관심사 / 문진 결과를 고려하면 정기 혈액 검사(TSH, fT4)를 권장해요.' : ''
    return {
      text: `홍채 3D 스캔 결과: 좌안 밀도 ${data.iris.leftScore}점, 우안 밀도 ${data.iris.rightScore}점 (평균 ${irisAvg}점). ${
        irisAvg >= 75 ? '전반적으로 건강한 홍채 패턴이에요.'
        : irisAvg >= 60 ? '보통 수준이에요. 영양·수면 관리를 강화하면 개선될 수 있어요.'
        : '전반적 컨디션 저하 신호가 보여요. 종합적인 케어가 필요해요.'
      } ${skinLow ? `피부 Zone ${data.iris.skinZone}점 — 호르몬 불균형으로 피부 장벽이 약해진 신호예요. 오메가-3와 아연이 도움이 돼요.${skinContext} ` : ''}${thyLow ? `갑상선 Zone ${data.iris.thyroidZone}점 — 모니터링이 필요한 구간이에요.${thyContext}` : `갑상선 Zone ${data.iris.thyroidZone}점으로 정상이에요.`}`,
      sources: ['홍채 3D'],
      confidence: 'medium',
    }
  }

  // ── EXERCISE ───────────────────────────────────────────────────
  if (hit(q, ['운동', '활동', '걷기', '달리기', '요가', '필라테스', '헬스', '근력', 'hiit', '어떤 운동', '운동 해도'])) {
    const recs: Record<CyclePhase, string> = {
      menstrual: `생리 중에는 고강도 운동보다 가벼운 걷기, 스트레칭, 음 요가(Yin Yoga)가 가장 좋아요. HRV ${data.biosignal.hrv}ms ${lowHRV ? '— 몸이 소모된 상태이니 무리하지 마세요' : '— 가벼운 활동은 괜찮아요'}. 자궁 온도 ${data.thermal.uterineTemp}°C ${coldUterus ? '— 운동 전 하복부 워밍업을 꼭 하세요' : ''}.`,
      follicular: `난포기는 에너지가 빠르게 올라가는 시기예요! HRV ${data.biosignal.hrv}ms로 회복력이 ${lowHRV ? '다소 낮으니 점진적으로 강도를 높이세요' : '좋아요 — 근력 운동이나 HIIT가 효과적이에요'}. 에스트로겐이 근육 회복을 도와주는 구간이라 운동 효과가 극대화돼요.`,
      ovulation: `배란기에 에너지가 피크예요. 가장 강도 높은 운동도 OK! 자궁 온도 ${data.thermal.uterineTemp}°C ${coldUterus ? '— 워밍업을 충분히 하세요' : '— 최적의 운동 환경이에요'}. 인대가 살짝 느슨해지는 시기라 스트레칭 시 과신전 주의하세요.`,
      luteal: `황체기에는 에너지가 점점 감소해요. ${stressHigh ? `EDA 스트레스 ${data.eda.stressIndex}점 — 고강도 운동이 오히려 코르티솔을 올릴 수 있으니 ` : ''}필라테스, 수영, 가벼운 걷기가 코르티솔 관리에 좋아요. 무리하면 PMS 증상이 심해질 수 있어요.`,
    }
    return {
      text: recs[phase],
      sources: ['주기', 'HRV', 'EDA'],
      confidence: 'high',
    }
  }

  // ── NUTRITION ─────────────────────────────────────────────────
  if (hit(q, ['음식', '먹어', '영양', '보충', '비타민', '미네랄', '식단', '뭐 먹', '추천', '먹어야', '식품', '영양제'])) {
    const recs: Record<CyclePhase, string> = {
      menstrual: `생리 중 필수 영양소: 철분(시금치·적색 육류) + 비타민 C(흡수 극대화), 마그네슘 300mg(경련 완화), 오메가-3(염증·통증 감소). 다크 초콜릿(카카오 70%+)은 마그네슘과 기분 향상 두 마리 토끼예요. ${coldUterus ? '자궁 냉기가 있으니 생강·쑥·계피 같은 온열 식품을 꼭 챙기세요.' : ''}`,
      follicular: `난포기엔 에스트로겐 대사를 돕는 식품이 열쇠예요: 브로콜리·케일 등 십자화과 채소, 아마씨, 발효식품(김치·된장·요거트). 단백질 섭취를 늘려 근육 합성과 에너지 상승을 지원하세요. ${lowHRV ? 'HRV가 낮으니 코엔자임 Q10도 추가해보세요.' : ''}`,
      ovulation: `배란기엔 아연(굴·호박씨), 비타민 B6(닭고기·바나나), 항산화 베리류를 중점으로 챙기세요. 카페인은 하루 200mg 이하로 줄이면 가임 환경 최적화에 도움돼요. 수분 섭취를 늘리면 자궁경부 점액 분비도 개선돼요.`,
      luteal: `황체기 핵심 영양소: 마그네슘 300-400mg(PMS 핵심 완화제), 칼슘 1000mg(유제품·멸치), 비타민 B6 50mg. ${stressHigh ? `EDA 스트레스가 높으니 트립토판 식품(터키·달걀·오트밀)으로 세로토닌을 보충하세요. ` : ''}단당류·카페인은 증상 악화 원인이에요. 복합 탄수화물(고구마·현미)을 선택하세요.`,
    }
    return {
      text: recs[phase],
      sources: ['주기', 'EDA', '열화상'],
      confidence: 'high',
    }
  }

  // ── HORMONE ───────────────────────────────────────────────────
  if (hit(q, ['호르몬', '에스트로겐', '프로게스테론', '코르티솔', '호르몬 균형', '인슐린', 'lh', 'fsh'])) {
    const hMap: Record<CyclePhase, string> = {
      menstrual: `지금은 에스트로겐과 프로게스테론이 모두 최저치예요. 몸이 '초기화'되는 시기입니다. 철분과 엽산으로 호르몬 합성 기반을 만들고, 혈당을 안정시키는 저 GI 식품을 먹어 인슐린을 조절해주세요.`,
      follicular: `에스트로겐이 빠르게 상승 중이에요! 기분 향상, 에너지 증가, 피부 광택이 나타나는 시기입니다. 십자화과 채소로 간의 에스트로겐 대사를 도와 호르몬 균형을 최적화하세요.`,
      ovulation: `에스트로겐이 피크에 달하고 LH가 급상승합니다. 자궁 온도 ${data.thermal.uterineTemp}°C가 LH 서지를 반영해요. 이 시기 코르티솔 급상승은 배란을 억제할 수 있으니 스트레스를 최소화하세요.`,
      luteal: `프로게스테론 상승 구간이에요. ${stressHigh ? `EDA 스트레스 지수 ${data.eda.stressIndex}점 — 코르티솔이 프로게스테론 합성 경로(프레그네놀론)를 '훔쳐'가는 '코르티솔 스틸' 현상이 일어날 수 있어요. 지금 스트레스 관리가 호르몬 균형의 핵심이에요. ` : '프로게스테론 생성 환경이 양호해요. '}마그네슘(300mg)과 아연(15mg)이 프로게스테론 합성을 직접 지원해요.`,
    }
    return {
      text: hMap[phase],
      sources: ['주기', 'EDA', '열화상'],
      confidence: 'medium',
    }
  }

  // ── HRV / HEART / ANS ─────────────────────────────────────────
  if (hit(q, ['hrv', '심박', '심장', '맥박', '자율신경', '회복', '회복력', '심박수'])) {
    return {
      text: `심박수 ${data.biosignal.heartRate}bpm, HRV ${data.biosignal.hrv}ms. ${
        lowHRV
          ? `HRV가 기준(40ms) 이하로 낮아요. 자율신경계가 스트레스 반응 상태에 있어 회복력이 떨어진 상태예요. 수면 7-8시간 확보, 알코올·카페인 제한, 야외 걷기 30분이 HRV를 빠르게 회복시켜요.`
          : `HRV가 양호해요. 자율신경계의 균형이 잘 잡혀 회복력이 좋은 상태입니다.`
      } EDA 자율신경 균형: 부교감 ${data.eda.ansBalance}% — ${ansSym ? '교감 우세 상태예요. 심호흡·명상이 빠르게 부교감을 활성화해줘요.' : '균형 잡힌 상태예요.'}${phase === 'luteal' ? ' 황체기에는 체온 상승으로 HRV가 자연스럽게 낮아질 수 있으니 비교 시 참고하세요.' : ''}`,
      sources: ['바이오신호', 'EDA'],
      confidence: 'high',
    }
  }

  // ── SKIN / ACNE ────────────────────────────────────────────────
  if (hit(q, ['피부', '여드름', '트러블', '피부 상태', '건조', '광택', '화장', '기미', '잡티'])) {
    const skinLow = data.iris.skinZone < 65
    return {
      text: `홍채 피부 Zone ${data.iris.skinZone}점 ${skinLow ? '— 피부 장벽 약화 신호가 있어요' : '— 피부 상태가 좋아요'}. ${
        phase === 'luteal'
          ? `황체기에는 프로게스테론이 피지 분비를 늘려 여드름이 생기기 쉬운 시기예요. EDA 스트레스 지수 ${data.eda.stressIndex}점 ${stressHigh ? '— 코르티솔이 피지 과분비를 더 자극하고 있어요. 스트레스 관리가 피부 관리예요.' : '— 스트레스가 높지 않아 다행이에요.'}  저자극 클렌징과 나이아신아마이드 성분을 써보세요.`
          : phase === 'follicular'
          ? `난포기는 에스트로겐 덕분에 피부가 가장 밝고 건강한 시기예요. 지금 각질 제거나 피부 집중 트리트먼트를 하면 효과가 극대화돼요.`
          : phase === 'ovulation'
          ? `배란기엔 에스트로겐 피크로 피부에 광택이 나요. 자외선 차단만 잘 해도 충분해요.`
          : `생리 중에는 피부가 건조해질 수 있어요. 세라마이드·히알루론산 보습제와 충분한 수분 섭취가 핵심이에요.`
      } 오메가-3, 아연, 비오틴이 피부 장벽 강화에 기여해요.`,
      sources: ['홍채 3D', '주기', 'EDA'],
      confidence: 'medium',
    }
  }

  // ── PAIN / CRAMPS ──────────────────────────────────────────────
  if (hit(q, ['통증', '생리통', '경련', '아파', '허리', '복통', '쥐', '쑤셔', '생리 통증', '진통'])) {
    return {
      text: `통증 분석: 자궁 온도 ${data.thermal.uterineTemp}°C ${coldUterus ? '— 냉기로 혈관이 수축하면서 통증이 심해지는 패턴이에요. 핫팩이 최우선이에요' : '— 온도 측면은 정상이에요'}. HRV ${data.biosignal.hrv}ms ${lowHRV ? '— 신체 통증 역치가 낮아진 상태라 평소보다 더 예민하게 느껴질 수 있어요' : '— 통증 대응력은 괜찮아요'}. ${
        coldUterus || lowHRV
          ? `지금 당장: ① 핫팩(40-45°C) 하복부 15-20분 ② 마그네슘 300mg 복용(30분 내 근육 이완) ③ 생강차 1잔. 프로스타글란딘 억제를 위해 이부프로펜은 통증 시작 직전부터 복용하면 훨씬 효과적이에요.`
          : `오메가-3 EPA를 꾸준히 보충하면 프로스타글란딘 생성이 줄어 생리통이 장기적으로 개선돼요. 마그네슘도 매일 복용해보세요.`
      }`,
      sources: ['열화상', 'HRV', '주기'],
      confidence: 'high',
    }
  }

  // ── MOOD / PMS ────────────────────────────────────────────────
  if (hit(q, ['기분', '감정', '우울', '예민', '짜증', '감정 기복', 'pms', '감정적', '눈물', '불안해'])) {
    return {
      text: `감정 패턴 분석 (D+${cycleDay} ${phaseName}): EDA 스트레스 ${data.eda.stressIndex}점, 이완도 ${data.eda.relaxationScore}점, 자율신경 균형 ${data.eda.ansBalance}%. ${
        phase === 'luteal'
          ? `황체기 후반은 세로토닌·도파민이 감소하는 시기예요. ${stressHigh ? `스트레스 지수가 높아서 감정 기복이 더 심해질 수 있어요. ` : ''}트립토판 식품(바나나·달걀·오트밀)으로 세로토닌 전구체를 공급하고, 햇빛을 하루 30분 쬐면 세로토닌 합성이 자연스럽게 높아져요. B6 50mg도 감정 안정에 큰 도움이 돼요.`
          : phase === 'menstrual'
          ? `생리 중 에스트로겐·프로게스테론이 모두 낮아 기분이 무겁게 느껴질 수 있어요. HRV ${data.biosignal.hrv}ms — ${lowHRV ? '몸이 지쳐있는 상태이니 자신을 다그치지 마세요. 작은 것도 기록하며 돌봐주세요.' : '회복력은 있어요. 가벼운 산책이 기분 전환에 효과적이에요.'}`
          : phase === 'follicular'
          ? `난포기는 기분이 자연스럽게 올라가는 시기예요. 에스트로겐 상승으로 세로토닌 수용체 감수성도 높아져서 긍정적인 자극에 더 잘 반응해요.`
          : `배란기에는 LH 서지로 자신감·사교성이 자연스럽게 높아지는 시기예요. 사람들을 만나거나 새로운 경험을 해보기 좋은 때예요.`
      }`,
      sources: ['EDA', '주기', '바이오신호'],
      confidence: 'high',
    }
  }

  // ── OVERALL CONDITION ─────────────────────────────────────────
  if (hit(q, ['오늘', '현재', '지금', '컨디션', '상태', '전반', '종합', '어때', '어떤', '괜찮', '어떻게', '건강'])) {
    const score = Math.round(
      irisAvg * 0.18 +
      (100 - data.eda.stressIndex) * 0.28 +
      data.eda.ansBalance * 0.18 +
      Math.min(data.biosignal.hrv / 0.8, 100) * 0.18 +
      Math.min(data.biosignal.sleepHours / 0.08, 100) * 0.18,
    )
    const level = score >= 72 ? '양호' : score >= 52 ? '보통' : '주의'
    return {
      text: `종합 건강 지수 ${score}점 (${level}). D+${cycleDay} ${phaseName} 기준 5가지 지표 분석: EDA 스트레스 ${data.eda.stressIndex}점(${stressHigh ? '↑높음' : stressMid ? '보통' : '↓양호'}), 자궁 온도 ${data.thermal.uterineTemp}°C(${coldUterus ? '냉기' : '정상'}), HRV ${data.biosignal.hrv}ms(${lowHRV ? '낮음' : '정상'}), 홍채 ${irisAvg}점, 수면 ${data.biosignal.sleepHours}h(${poorSleep ? '부족' : '충분'}). ${
        score >= 72
          ? `전반적으로 좋은 컨디션이에요! ${phaseName}의 특성을 활용해 ${phase === 'follicular' || phase === 'ovulation' ? '운동과 활동을 늘려보세요' : '몸을 충분히 쉬어주세요'}.`
          : score >= 52
          ? `보통 상태예요. ${stressHigh ? 'EDA 스트레스 관리' : ''}${coldUterus ? (stressHigh ? '와 자궁 온열 케어' : '자궁 온열 케어') : ''}${poorSleep ? (stressHigh || coldUterus ? ', 수면 개선' : '수면 개선') : ''}이 지금 가장 중요한 과제예요.`
          : `컨디션이 낮아요. 오늘은 무리하지 말고 충분한 휴식, 따뜻한 식사, 수분 섭취에 집중해주세요. 내일은 더 나아질 거예요.`
      }`,
      sources: ['주기', 'EDA', '열화상', 'HRV', '홍채'],
      confidence: 'high',
    }
  }

  // ── DEFAULT ────────────────────────────────────────────────────
  return {
    text: `D+${cycleDay} ${phaseName} 기준으로 현재 주요 지표예요: EDA 스트레스 ${data.eda.stressIndex}/100, 자궁 온도 ${data.thermal.uterineTemp}°C, HRV ${data.biosignal.hrv}ms, 홍채 점수 ${irisAvg}점, 수면 ${data.biosignal.sleepHours}시간. 더 구체적인 분석을 원하시면 아래 추천 질문 중 하나를 눌러보세요!`,
    sources: ['주기', 'EDA', '열화상', '바이오신호'],
    confidence: 'medium',
  }
}

export const SUGGESTED_QUESTIONS = [
  '오늘 내 컨디션 어때?',
  '지금 긴장·스트레스가 많은 것 같아',
  '자궁이 차가운 것 같아',
  '다음 생리 언제야?',
  '오늘 어떤 운동이 좋아?',
  '지금 단계에 뭘 먹으면 좋아?',
  '수면의 질을 높이려면?',
  '호르몬 균형 어때?',
  '기분이 예민한 이유가 뭐야?',
  '피부 트러블이 심해지는 이유는?',
]
