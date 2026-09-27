'use client'

import { Eye } from 'lucide-react'
import type { IrisEyeDetection, MultimodalData } from '@/components/calendar/LudiaInsightCard'
import {
  LesionChips, LesionList, LesionOverlay, LesionResetButton, canSelectLesions, useLesionSelection,
} from './IrisLesionViewer'

// 홍채 스캔에서 LUDIA LAB 병소 모델이 실제로 검출한 결과(주석 이미지·병소 목록)를 리포트에 표시
function EyeColumn({ label, d }: { label: string; d: IrisEyeDetection }) {
  const { sel, toggle, clear } = useLesionSelection()
  const interactive = canSelectLesions(d)

  return (
    <div className="space-y-2.5 min-w-0">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700">{label}</p>
        <span className="text-[10px] text-slate-400">점수 {d.score} · 병소 {d.lesions.length}개</span>
      </div>

      {interactive ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.baseImg!} alt={`${label} 홍채 검출 결과`} className="block w-full h-auto rounded-xl bg-black" />
          <LesionOverlay d={d} sel={sel} />
          <LesionResetButton d={d} sel={sel} onClear={clear} />
        </div>
      ) : d.annotatedImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={d.annotatedImg} alt={`${label} 홍채 검출 결과`} className="w-full rounded-xl bg-black object-contain" />
      )}

      <LesionChips d={d} sel={sel} onToggle={toggle} interactive={interactive} />
      <LesionList d={d} sel={sel} onToggle={toggle} interactive={interactive} />
    </div>
  )
}

export function IrisDetectionCard({ iris }: { iris: MultimodalData['iris'] }) {
  const det = iris.detection
  if (!det || (!det.right && !det.left)) return null
  const eyes = [['우안 (오른쪽 눈)', det.right], ['좌안 (왼쪽 눈)', det.left]] as const
  const any = det.right ?? det.left!
  const unreliable = [det.right, det.left].some(d => d?.model && !d.model.reliable)

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-purple-500" />
        <h3 className="text-sm font-semibold text-slate-700">홍채 검출 결과</h3>
        <span className="ml-auto text-[10px] text-purple-400 font-medium">LUDIA LAB 병소 모델</span>
      </div>

      {unreliable && any.model && (
        <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">
          ⚠ 병소 모델이 아직 학습 초기 단계입니다
          {any.model.trainImages != null && ` (학습 사진 ${any.model.trainImages}장`}
          {any.model.valMiou != null && `, 검증 정확도 mIoU ${any.model.valMiou.toFixed(2)}`}
          {any.model.trainImages != null && ')'} — 결과는 참고용입니다.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {eyes.map(([label, d]) => d
          ? <EyeColumn key={label} label={label} d={d} />
          : (
            <div key={label} className="text-xs text-slate-400">
              <p className="font-semibold text-slate-600 mb-1">{label}</p>
              실제 분석 결과 없음 (데모 값)
            </div>
          ))}
      </div>

      {any.disclaimer && <p className="text-[10px] text-slate-400">* {any.disclaimer}</p>}
    </div>
  )
}
