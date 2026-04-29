'use client'

import { FileText, AlertTriangle, CheckCircle, Info, ShoppingBag, ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMultimodalData } from '@/hooks/useMultimodalData'
import { useOnboardingProfile, isHighConcern, hasCare } from '@/lib/onboarding-profile'
import type { MultimodalData } from '@/components/calendar/LudiaInsightCard'
import type { OnboardingProfile } from '@/lib/onboarding-profile'

interface Finding {
  type: 'warning' | 'info' | 'ok'
  title: string
  detail: string
  tags: string[]
}

interface ProductRec {
  name: string
  reason: string
  tag: string
  color: string
}

// ── 진단 소견 동적 생성 ────────────────────────────────────────────────────────
function buildFindings(d: MultimodalData, p: OnboardingProfile): Finding[] {
  const findings: Finding[] = []
  const a = p.answers
  const coldUterus = d.thermal.uterineTemp < 36.2
  const lowHRV = d.biosignal.hrv < 38
  const poorSleep = d.biosignal.sleepHours < 6.5

  // 부정 출혈 — 온보딩에서 신고된 경우 최우선 경고
  if (isHighConcern(a.fibroid_bleeding)) {
    findings.push({
      type: 'warning',
      title: '부정 출혈 이력 확인됨',
      detail: '문진에서 생리 기간 외 출혈이 보고되었습니다. 자궁근종·물혹·암 조기 선별을 위해 산부인과 정밀 검사를 권장합니다.',
      tags: ['부정 출혈', '정밀 검사 권장'],
    })
  }

  // 자궁 냉기 패턴
  if (coldUterus) {
    const confirmed = isHighConcern(a.period_coldness)
    const painLevel = typeof a.period_pain_level === 'number' ? a.period_pain_level : 0
    const hasFertility = hasCare(p, 'fertility')
    findings.push({
      type: 'warning',
      title: `자궁 냉기 패턴 (열화상 ${d.thermal.uterineTemp}°C)`,
      detail: [
        `하복부 자궁 영역 온도 ${d.thermal.uterineTemp}°C — 정상 범위(36.5°C) 이하. 혈액 순환 저하 및 자궁 냉증 의심.`,
        confirmed ? ' 문진에서도 아랫배 냉감을 자주 느끼는 것으로 확인되어 주의가 필요합니다.' : '',
        painLevel >= 7 ? ` 생리통 강도 ${painLevel}/10 — 냉기로 인한 혈관 수축이 통증을 악화시킬 수 있습니다.` : '',
        hasFertility ? ' 임신 준비 중이라면 자궁 온열 환경 개선이 착상 성공률에 직접 영향을 줍니다.' : '',
      ].join(''),
      tags: [
        '자궁 냉증',
        '혈액 순환 저하',
        ...(confirmed ? ['문진 일치'] : []),
        ...(hasFertility ? ['임신 준비 영향'] : []),
      ],
    })
  }

  // 홍채 피부 zone
  if (d.iris.skinZone < 65) {
    const hasSkin = hasCare(p, 'skin_acne')
    const cyclicAcne = isHighConcern(a.skin_cycle_acne)
    findings.push({
      type: 'warning',
      title: `홍채 피부 zone 저하 (${d.iris.skinZone}점)`,
      detail: [
        `피부 zone 밀도 ${d.iris.skinZone}/100. 호르몬 불균형으로 인한 피부 장벽 약화 가능성.`,
        cyclicAcne ? ' 문진에서 주기별 반복 트러블을 경험한다고 응답하여 호르몬성 여드름 패턴으로 판단됩니다.' : '',
        hasSkin ? ' 피부 케어 관심사가 선택되어 맞춤 스킨케어 루틴을 아래에 추천드립니다.' : '',
      ].join(''),
      tags: [
        '피부 장벽',
        '호르몬 불균형',
        ...(cyclicAcne ? ['주기성 트러블'] : []),
      ],
    })
  }

  // 갑상선 zone
  const thyroidWarn = d.iris.thyroidZone < 70
  const thyroidCheckup = isHighConcern(a.thyroid_checkup)
  const thyroidSwelling = isHighConcern(a.thyroid_swelling)
  if (thyroidWarn || thyroidCheckup || thyroidSwelling) {
    findings.push({
      type: thyroidWarn ? 'info' : 'info',
      title: `갑상선 zone ${thyroidWarn ? '주의 신호' : '모니터링'} (${d.iris.thyroidZone}점)`,
      detail: [
        thyroidWarn
          ? `홍채 갑상선 영역 밀도 ${d.iris.thyroidZone}/100 (주의 구간). 피로, 체중 변화 모니터링 권장.`
          : `갑상선 zone ${d.iris.thyroidZone}/100으로 수치는 정상이지만 문진 결과를 고려합니다.`,
        thyroidCheckup ? ' 과거 검진에서 주의 판정 이력이 있어 정기 모니터링이 중요합니다.' : '',
        thyroidSwelling ? ' 피로·부종 증상이 자주 나타난다고 응답하여 갑상선 기능 이상 가능성에 유의하세요.' : '',
      ].join(''),
      tags: [
        '갑상선',
        '호르몬',
        ...(thyroidCheckup || thyroidSwelling ? ['문진 일치'] : []),
      ],
    })
  }

  // HRV / 자율신경
  if (lowHRV) {
    const stressSleep = isHighConcern(a.stress_sleep)
    const palpitation = isHighConcern(a.stress_palpitation)
    findings.push({
      type: 'info',
      title: `HRV 저하 (${d.biosignal.hrv}ms)`,
      detail: [
        `주간 평균 HRV ${d.biosignal.hrv}ms — 기준치(40ms) 이하로 자율신경계 회복력이 낮습니다.`,
        stressSleep ? ' 문진에서 입면 어려움·수면 중 각성이 자주 있다고 응답하여 수면 질 저하가 원인일 수 있습니다.' : '',
        palpitation ? ' 두근거림·가슴 답답함도 보고되어 교감신경 우세 상태가 지속되는 패턴입니다.' : '',
        poorSleep ? ` 실제 수면 시간도 ${d.biosignal.sleepHours}h로 부족합니다.` : '',
      ].join(''),
      tags: [
        '자율신경',
        '스트레스',
        ...(stressSleep || palpitation ? ['문진 일치'] : []),
      ],
    })
  }

  // BMI
  const bmiOk = d.biosignal.bmi >= 18.5 && d.biosignal.bmi < 25
  findings.push({
    type: bmiOk ? 'ok' : 'info',
    title: `BMI ${bmiOk ? '정상' : '관리 필요'} (${d.biosignal.bmi})`,
    detail: bmiOk
      ? `BMI ${d.biosignal.bmi}로 정상 체중 범위입니다.${hasCare(p, 'diet') ? ' 다이어트 케어 중이나 현재 수치는 양호합니다.' : ''}`
      : `BMI ${d.biosignal.bmi} — ${d.biosignal.bmi < 18.5 ? '저체중' : '과체중'} 범위입니다. 호르몬 균형과 생리 주기에 영향을 줄 수 있습니다.`,
    tags: bmiOk ? ['체중 관리', '정상'] : ['BMI 관리', '호르몬 영향'],
  })

  // HRV 정상인 경우 긍정 소견 추가
  if (!lowHRV) {
    findings.push({
      type: 'ok',
      title: `HRV 정상 범위 (${d.biosignal.hrv}ms)`,
      detail: `HRV ${d.biosignal.hrv}ms로 자율신경계 균형이 양호합니다.`,
      tags: ['자율신경', '스트레스 지수 양호'],
    })
  }

  return findings
}

// ── 맞춤 제품 추천 동적 생성 ───────────────────────────────────────────────────
function buildProductRecs(d: MultimodalData, p: OnboardingProfile): ProductRec[] {
  const recs: ProductRec[] = []
  const coldUterus = d.thermal.uterineTemp < 36.2

  if (coldUterus || hasCare(p, 'period_pain') || hasCare(p, 'healthy_cycle')) {
    recs.push({ name: '온열 패드 (자궁 전용)', reason: '자궁 냉기 패턴 / 생리통 케어', tag: '🔥 온열', color: 'bg-orange-50 border-orange-200' })
    recs.push({ name: '마그네슘 글리시네이트 300mg', reason: '근육 이완 + 생리통 완화', tag: '💊 보충제', color: 'bg-green-50 border-green-200' })
  }
  if (hasCare(p, 'fertility')) {
    recs.push({ name: '이노시톨 복합 보충제', reason: '난소 기능 지원 & 호르몬 균형', tag: '💊 보충제', color: 'bg-green-50 border-green-200' })
    recs.push({ name: '엽산 + CoQ10 복합제', reason: '임신 준비 필수 영양소', tag: '🍃 임신 준비', color: 'bg-emerald-50 border-emerald-200' })
  }
  if (hasCare(p, 'skin_acne') || d.iris.skinZone < 65) {
    recs.push({ name: '호르몬 밸런스 스킨케어', reason: `홍채 피부 zone ${d.iris.skinZone}점 저하 감지`, tag: '✨ 스킨케어', color: 'bg-rose-50 border-rose-200' })
    recs.push({ name: '아연 + 비오틴 복합제', reason: '피부 장벽·모발 강화', tag: '💊 보충제', color: 'bg-green-50 border-green-200' })
  }
  if (hasCare(p, 'thyroid_uterus') || d.iris.thyroidZone < 70) {
    recs.push({ name: '쑥 온열 패치', reason: '하복부 혈액 순환 개선', tag: '🌿 한방', color: 'bg-emerald-50 border-emerald-200' })
  }
  if (hasCare(p, 'stress') || d.biosignal.hrv < 38) {
    recs.push({ name: '아슈와간다 + L-테아닌', reason: '코르티솔 조절 & 이완 지원', tag: '🌿 스트레스', color: 'bg-purple-50 border-purple-200' })
  }
  if (hasCare(p, 'hair_care')) {
    recs.push({ name: '바이오틴 5000mcg + 실리카', reason: '모발 강화 & 두피 개선', tag: '✂️ 모발', color: 'bg-amber-50 border-amber-200' })
  }
  if (hasCare(p, 'osteoporosis')) {
    recs.push({ name: '칼슘 + 비타민 D3/K2', reason: '골밀도 유지 필수 영양소', tag: '🦴 골건강', color: 'bg-blue-50 border-blue-200' })
  }

  // 기본 추천이 없으면 공통 추천
  if (recs.length === 0) {
    recs.push({ name: '오메가-3 EPA/DHA', reason: '항염 & 호르몬 합성 기반', tag: '💊 보충제', color: 'bg-green-50 border-green-200' })
  }

  return recs.slice(0, 4)
}

// ── AI 종합 소견 요약 생성 ─────────────────────────────────────────────────────
function buildSummary(d: MultimodalData, p: OnboardingProfile): string {
  const issues: string[] = []
  if (d.thermal.uterineTemp < 36.2) issues.push('자궁 냉기 패턴')
  if (d.iris.skinZone < 65) issues.push('피부 zone 저하')
  if (d.iris.thyroidZone < 70) issues.push('갑상선 zone 주의')
  if (d.biosignal.hrv < 38) issues.push('HRV 저하')
  if (isHighConcern(p.answers.fibroid_bleeding)) issues.push('부정 출혈 이력')

  if (issues.length === 0) {
    return '홍채·열화상·EDA·HRV 데이터 전반이 양호합니다. 현재의 건강 루틴을 유지하고 주기별 변화를 지속 모니터링하세요.'
  }

  const careContext = p.careTypes.length > 0
    ? ` 선택하신 관심사(${p.careTypes.slice(0, 2).join(', ')})를 반영한 맞춤 소견입니다.`
    : ''

  return `홍채 분석 및 열화상 데이터를 종합한 결과, ${issues.join('과 ')}이(가) 주요 관심 사항입니다.${careContext} 3개월 연속 데이터 수집 후 정밀 분석을 권장합니다.`
}

function buildScore(d: MultimodalData): number {
  const irisAvg = (d.iris.leftScore + d.iris.rightScore) / 2
  const thermal = d.thermal.uterineTemp >= 36.2 ? 100 : Math.max(0, (d.thermal.uterineTemp - 34) / 2.2 * 100)
  const hrv = Math.min(100, d.biosignal.hrv * 2)
  const sleep = Math.min(100, d.biosignal.sleepHours / 8 * 100)
  const stress = 100 - d.eda.stressIndex
  return Math.round(irisAvg * 0.2 + thermal * 0.25 + hrv * 0.2 + sleep * 0.15 + stress * 0.2)
}

const ICON = {
  warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  info:    <Info           className="w-4 h-4 text-blue-500"  />,
  ok:      <CheckCircle    className="w-4 h-4 text-green-500" />,
}

const BG = {
  warning: 'bg-amber-50 border-amber-200',
  info:    'bg-blue-50 border-blue-200',
  ok:      'bg-green-50 border-green-200',
}

export function DiagnosticReport() {
  const { data } = useMultimodalData()
  const profile  = useOnboardingProfile()

  const findings    = buildFindings(data, profile)
  const productRecs = buildProductRecs(data, profile)
  const summary     = buildSummary(data, profile)
  const score       = buildScore(data)
  const levelLabel  = score >= 72 ? '양호' : score >= 52 ? '보통' : '주의'
  const levelColor  = score >= 72 ? 'bg-green-100 text-green-600' : score >= 52 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
  const warnCount   = findings.filter(f => f.type === 'warning').length

  const clinicNote = findings.some(f => f.tags.includes('부정 출혈'))
    ? '부정 출혈 이력이 보고되었습니다. 가능한 빠른 시일 내 산부인과 방문을 권장합니다.'
    : findings.some(f => f.tags.includes('자궁 냉증'))
      ? '자궁 냉기 패턴이 감지될 경우 산부인과 방문을 권장드립니다.'
      : '본 분석은 생활습관 가이드 목적이며 의료 진단을 대체하지 않습니다.'

  return (
    <div className="space-y-6">
      {/* Overall summary */}
      <div className="glass-card p-5 border-l-4 border-rose-400">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <p className="text-xs text-rose-400 font-medium uppercase tracking-wider">AI 종합 소견</p>
            <p className="text-sm text-slate-700 mt-1 leading-relaxed">{summary}</p>
            <div className="flex gap-2 mt-3">
              <span className={cn('px-2.5 py-1 text-[10px] font-medium rounded-full', levelColor)}>
                종합 점수 {score}/100
              </span>
              <span className={cn('px-2.5 py-1 text-[10px] font-medium rounded-full',
                warnCount >= 2 ? 'bg-red-100 text-red-600' : warnCount === 1 ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600')}>
                {warnCount >= 2 ? '주의 관찰 필요' : warnCount === 1 ? '일부 관심 항목' : levelLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Findings list */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">세부 소견</h3>
        </div>
        <div className="space-y-2.5">
          {findings.map((f, i) => (
            <div key={i} className={cn('flex gap-3 p-4 rounded-2xl border', BG[f.type])}>
              <div className="mt-0.5 flex-shrink-0">{ICON[f.type]}</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">{f.title}</p>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{f.detail}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {f.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-white/70 rounded-full text-[10px] text-slate-500 font-medium border border-white">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Product Recommendations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-semibold text-slate-700">맞춤 제품 추천</h3>
          </div>
          <span className="text-[10px] text-rose-400 font-medium">진단 + 문진 결과 기반</span>
        </div>
        <div className="space-y-2">
          {productRecs.map((p, i) => (
            <div key={i} className={cn('flex items-center gap-3 p-3.5 rounded-2xl border', p.color)}>
              <span className="text-base">{p.tag.split(' ')[0]}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-700">{p.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{p.reason}</p>
              </div>
              <button className="flex items-center gap-1 px-3 py-1.5 bg-white/80 rounded-xl text-[11px] font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors border border-white">
                보기 <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Clinic note */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
        <p className="text-xs text-slate-500">{clinicNote}</p>
        <p className="text-[10px] text-slate-400 mt-1">본 분석은 의료 진단을 대체하지 않습니다.</p>
      </div>
    </div>
  )
}
