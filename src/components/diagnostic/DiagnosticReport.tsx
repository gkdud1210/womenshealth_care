'use client'

import { FileText, AlertTriangle, CheckCircle, Info, ShoppingBag, ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Finding {
  type: 'warning' | 'info' | 'ok'
  title: string
  detail: string
  tags: string[]
}

const FINDINGS: Finding[] = [
  {
    type: 'warning',
    title: '자궁 냉기 패턴 (열화상)',
    detail: '하복부 자궁 영역 온도 35.8°C — 정상 범위(36.5°C) 이하. 혈액 순환 저하 및 자궁 냉증 의심.',
    tags: ['자궁 냉증', '혈액 순환 저하'],
  },
  {
    type: 'warning',
    title: '홍채 피부 zone 저하',
    detail: '피부 zone 밀도 48/100. 호르몬 불균형으로 인한 피부 장벽 약화 가능성.',
    tags: ['피부 장벽', '호르몬 불균형'],
  },
  {
    type: 'info',
    title: '갑상선 zone 주의 신호',
    detail: '홍채 갑상선 영역 밀도 71/100 (주의 구간). 피로, 체중 변화 모니터링 권장.',
    tags: ['갑상선', '호르몬'],
  },
  {
    type: 'ok',
    title: 'HRV 정상 범위',
    detail: '주간 평균 HRV 42ms. 자율신경계 균형이 양호한 상태입니다.',
    tags: ['자율신경', '스트레스 지수 양호'],
  },
  {
    type: 'ok',
    title: 'BMI 정상',
    detail: 'BMI 22.1로 정상 체중 범위입니다.',
    tags: ['체중 관리', '정상'],
  },
]

const PRODUCT_RECS = [
  { name: '온열 패드 (자궁 전용)', reason: '자궁 냉기 패턴 감지', tag: '🔥 온열', color: 'bg-orange-50 border-orange-200' },
  { name: '이노시톨 복합 보충제', reason: '난소 기능 지원 & 호르몬 균형', tag: '💊 보충제', color: 'bg-green-50 border-green-200' },
  { name: '쑥 온열 패치', reason: '하복부 혈액 순환 개선', tag: '🌿 한방', color: 'bg-emerald-50 border-emerald-200' },
  { name: '호르몬 밸런스 스킨케어', reason: '홍채 피부 zone 저하 감지', tag: '✨ 스킨케어', color: 'bg-rose-50 border-rose-200' },
]

const ICON = {
  warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  info: <Info className="w-4 h-4 text-blue-500" />,
  ok: <CheckCircle className="w-4 h-4 text-green-500" />,
}

const BG = {
  warning: 'bg-amber-50 border-amber-200',
  info: 'bg-blue-50 border-blue-200',
  ok: 'bg-green-50 border-green-200',
}

export function DiagnosticReport() {
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
            <p className="text-sm text-slate-700 mt-1 leading-relaxed">
              홍채 분석 및 열화상 데이터를 종합한 결과, <strong>자궁 냉기 패턴</strong>과 <strong>피부 zone 저하</strong>가
              주요 관심 사항입니다. 황체기 현재 호르몬 변동에 따른 일시적 증상일 수 있으나,
              3개월 연속 데이터 수집 후 정밀 분석을 권장합니다.
            </p>
            <div className="flex gap-2 mt-3">
              <span className="px-2.5 py-1 bg-rose-100 text-rose-600 text-[10px] font-medium rounded-full">종합 점수 64/100</span>
              <span className="px-2.5 py-1 bg-amber-100 text-amber-600 text-[10px] font-medium rounded-full">주의 관찰 필요</span>
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
          {FINDINGS.map((f, i) => (
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
          <span className="text-[10px] text-rose-400 font-medium">진단 결과 기반</span>
        </div>
        <div className="space-y-2">
          {PRODUCT_RECS.map((p, i) => (
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

      {/* Clinic recommendation */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
        <p className="text-xs text-slate-500">자궁 냉기 패턴이 <strong>3개월 연속</strong> 감지될 경우 산부인과 방문을 권장드립니다.</p>
        <p className="text-[10px] text-slate-400 mt-1">본 분석은 의료 진단을 대체하지 않습니다.</p>
      </div>
    </div>
  )
}
