'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
  Camera, X, ChevronRight, Sparkles, Loader2, RotateCcw,
  Plus, Minus, ChevronLeft, ShoppingBag, ChefHat, Trash2, ImagePlus,
  Salad, UtensilsCrossed, Flame, Soup, MessageCircle, Stethoscope, Users, Dumbbell, SprayCan, TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CARE_CASES, type CareCaseId } from '@/data/careCases'
import { useMultimodalData } from '@/hooks/useMultimodalData'
import { useOnboardingProfile, type OnboardingProfile } from '@/lib/onboarding-profile'
import type { MultimodalData } from '@/components/calendar/LudiaInsightCard'
import { HAIR_CARE_TYPES } from '@/data/hairCareTypes'
import { classifyHairCareType } from '@/lib/hairCareClassifier'
import { CARE_SUBTYPES, type CareSubtype } from '@/data/careSubtypes'
import {
  classifyCareSubtype, classifyAcrossAllCards,
  type SignalOverrides, type GlobalSubtypeMatch,
} from '@/lib/careSubtypeClassifier'
import { ROOT_CAUSE_META, rootCauseOf } from '@/data/rootCause'
import { SYMPTOM_OPTIONS } from '@/data/symptomOptions'
import { CATEGORY_META as MEETUP_CATEGORY_META } from '@/data/meetupData'
import type { HairCareType } from '@/data/hairCareTypes'
import {
  MEAL_META, MEAL_ORDER, FOOD_TAGS, PORTIONS,
  resolveMealProfile, refineMealProfileWithSubtype, mealTargetKcal,
  type MealType, type Portion, type CareMealProfile,
} from '@/data/mealWellness'
import {
  recommendMealProducts, buildManualResult,
  DIET_PATTERN_META, type MealAnalysisResult, type DietPattern,
} from '@/lib/meal-analysis'
import type { ShopProduct } from '@/data/shopProducts'

/** 선택한 케어카드 중 첫 번째 카드의 세부 체질을(홍채+BMI+문진 기반) 분류해요.
 *  탈모 카드는 기존 hairCareClassifier를, 그 외 11개 카드는 careSubtypeClassifier를 써요. */
function getPrimarySubtype(
  careTypes: string[], data: MultimodalData, profile: OnboardingProfile, overrides?: SignalOverrides,
): { label: string; diet: { good: string[]; avoid: string[] }; mechanism: string } | null {
  const firstCard = careTypes[0]
  if (!firstCard) return null
  if (firstCard === 'hair_scalp') {
    const { primary } = classifyHairCareType(data, profile)
    const t = HAIR_CARE_TYPES[primary.id]
    return t ? { label: t.label, diet: t.diet, mechanism: t.mechanism } : null
  }
  const classification = classifyCareSubtype(firstCard as CareCaseId, data, profile, overrides)
  if (!classification) return null
  const t = CARE_SUBTYPES[classification.primary.id]
  return t ? { label: t.label, diet: t.diet, mechanism: t.mechanism } : null
}

/** 최근 7일 동안 기록한 끼니 중 배달·외식·가공식품 비중이 높으면 true.
 *  실시간 진단·체질 재계산에 신호로 얹어서, "찍어 올린 식단"이 원인 추정에 직접 반영되게 해요. */
function computeDeliveryFoodSignal(logs: MealLogs): { high: boolean; ratio: number; count: number; total: number } {
  const keys = last7Keys()
  const entries = keys.flatMap(k => MEAL_ORDER.map(m => logs[k]?.[m]).filter((e): e is MealEntry => !!e))
  const total = entries.length
  if (total === 0) return { high: false, ratio: 0, count: 0, total: 0 }
  const count = entries.filter(e => e.dietPattern === 'delivery' || e.dietPattern === 'processed').length
  const ratio = count / total
  return { high: ratio >= 0.4, ratio, count, total }
}

/** 증상 진단 결과 렌더링에 필요한 최소 공통 모양 (탈모형/일반형 둘 다 만족해요) */
type RenderableSubtype = Pick<CareSubtype,
  'emoji' | 'label' | 'subtitle' | 'color' | 'gradient' | 'bg' | 'border' | 'glow' |
  'mechanism' | 'routineClub' | 'diet' | 'exercise' | 'homecare' | 'meetupCategory' | 'meetupNote'>

function resolveSubtype(careCaseId: CareCaseId, subtypeId: string): RenderableSubtype | null {
  if (careCaseId === 'hair_scalp') {
    return (HAIR_CARE_TYPES as Record<string, HairCareType>)[subtypeId] ?? null
  }
  return CARE_SUBTYPES[subtypeId] ?? null
}

// ── Storage ────────────────────────────────────────────────────────────────

const LOGS_KEY = 'ludia_meal_logs_v1'

interface MealEntry extends MealAnalysisResult {
  mealType: MealType
  photo: string
  createdAt: string
}
type DayLog = Partial<Record<MealType, MealEntry>>
type MealLogs = Record<string, DayLog>

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function loadLogs(): MealLogs {
  if (typeof window === 'undefined') return {}
  try {
    const s = localStorage.getItem(LOGS_KEY)
    return s ? JSON.parse(s) : {}
  } catch { return {} }
}
function saveLogs(logs: MealLogs) {
  try {
    const keys = Object.keys(logs).sort().slice(-30)
    const pruned: MealLogs = {}
    keys.forEach(k => { pruned[k] = logs[k] })
    localStorage.setItem(LOGS_KEY, JSON.stringify(pruned))
  } catch {}
}

// ── Image helpers ─────────────────────────────────────────────────────────

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new window.Image()
      img.onload = () => {
        const MAX = 1080
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = reject
      img.src = e.target!.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/data:(.*);base64/)?.[1] ?? 'image/jpeg'
  const bin = atob(base64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

function careLabelsOf(careTypes: string[], subtypeLabel?: string): string {
  const labels = careTypes.map(id => CARE_CASES.find(c => c.id === id)?.label).filter((x): x is string => !!x)
  const base = labels.length ? labels.join(' · ') : '일반 건강'
  return subtypeLabel ? `${base} (세부 체질: ${subtypeLabel})` : base
}

/** dev 서버에서만 응답하는 비전 분석 API. 정적 배포에서는 실패 → 클라이언트가 수동 선택으로 자동 전환해요. */
async function callVisionApi(
  photo: string, mealType: MealType, careLabel: string, target: [number, number],
): Promise<MealAnalysisResult | null> {
  try {
    const fd = new FormData()
    fd.append('file', dataUrlToBlob(photo), 'meal.jpg')
    fd.append('mealType', mealType)
    fd.append('careLabels', careLabel)
    fd.append('targetLo', String(target[0]))
    fd.append('targetHi', String(target[1]))
    const res = await fetch('/api/ludia/vision-nutrition/', { method: 'POST', body: fd, signal: AbortSignal.timeout(25_000) })
    if (!res.ok) return null
    const data = await res.json()
    if (data.error) return null
    return {
      foods: data.foods ?? [],
      totalCalories: data.totalCalories ?? 0,
      protein: data.protein, carb: data.carb, fat: data.fat,
      dietPattern: data.dietPattern ?? 'unclear',
      dietPatternNote: data.dietPatternNote,
      assessment: data.assessment ?? '',
      addSuggestions: data.addSuggestions ?? [],
      removeSuggestions: data.removeSuggestions ?? [],
      source: 'ai',
    }
  } catch {
    return null
  }
}

// ── Small UI atoms ───────────────────────────────────────────────────────

const PLACEHOLDER_ICON_MAP: Record<string, LucideIcon> = {
  salad: Salad, utensils: UtensilsCrossed, flame: Flame, soup: Soup,
}

function ProductRecCard({ product }: { product: ShopProduct }) {
  const Icon = product.placeholderIcon ? PLACEHOLDER_ICON_MAP[product.placeholderIcon] ?? ShoppingBag : ShoppingBag
  return (
    <Link href={`/shop?product=${product.id}`}
      className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-100 hover:border-rose-200 transition-colors">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: product.placeholderGradient ? `linear-gradient(135deg,${product.placeholderGradient.from},${product.placeholderGradient.to})` : '#f1f5f9' }}>
        <Icon className="w-5 h-5" color="rgba(255,255,255,0.9)" strokeWidth={1.6} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-bold text-slate-800 truncate">{product.name}</p>
        <p className="text-[11px] text-slate-400 truncate">{product.tagline}</p>
        <p className="text-[12px] font-bold text-rose-500 mt-0.5">{product.price.toLocaleString()}원</p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
    </Link>
  )
}

function SuggestionRow({ label, items, tone }: { label: string; items: string[]; tone: 'add' | 'remove' }) {
  if (items.length === 0) return null
  return (
    <div className="flex items-start gap-1.5">
      <span className={cn('mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0',
        tone === 'add' ? 'bg-emerald-100' : 'bg-orange-100')}>
        {tone === 'add' ? <Plus className="w-2.5 h-2.5 text-emerald-600" /> : <Minus className="w-2.5 h-2.5 text-orange-600" />}
      </span>
      <p className="text-[12.5px] text-slate-600 leading-snug">
        <span className="font-bold text-slate-700">{label}</span> {items.join(', ')}
      </p>
    </div>
  )
}

// ── Result view (분석 직후 / 기록 다시보기 공용) ───────────────────────────

function MealResultView({ entry, mealProfile }: { entry: MealEntry; mealProfile: CareMealProfile }) {
  const products = useMemo(() => recommendMealProducts(mealProfile, 2), [mealProfile])
  const meta = MEAL_META[entry.mealType]
  const [lo, hi] = mealTargetKcal(mealProfile, entry.mealType)
  const pct = Math.min(100, Math.round((entry.totalCalories / hi) * 100))

  return (
    <div className="space-y-4">
      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={entry.photo} alt="" className="w-full h-full object-cover" />
        <span className="absolute top-2.5 left-2.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/90 text-slate-700">
          {meta.emoji} {meta.label}
        </span>
        <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1">
          {entry.source === 'manual' && (
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-slate-800/70 text-white">
              직접 선택으로 추정
            </span>
          )}
          {entry.dietPattern !== 'unclear' && (
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-slate-800/70 text-white">
              {DIET_PATTERN_META[entry.dietPattern].emoji} {DIET_PATTERN_META[entry.dietPattern].label}
            </span>
          )}
        </div>
      </div>
      {entry.dietPatternNote && (
        <p className="text-[11.5px] text-slate-400 -mt-2 px-1">🔎 {entry.dietPatternNote}</p>
      )}

      <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg,#fdf2f8,#f5f0ff)' }}>
        <div className="flex items-baseline justify-between mb-1.5">
          <p className="text-[12px] font-bold text-slate-500">이 끼니 칼로리</p>
          <p className="text-[11px] text-slate-400">목표 {lo}~{hi}kcal</p>
        </div>
        <p className="text-[26px] font-black text-slate-800 mb-2">{entry.totalCalories.toLocaleString()}<span className="text-sm font-bold text-slate-400 ml-1">kcal</span></p>
        <div className="w-full h-2 rounded-full bg-white/70 overflow-hidden">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: pct > 130 ? '#ea580c' : pct >= 70 ? '#16a34a' : '#f59e0b' }} />
        </div>
        {(entry.protein !== undefined || entry.carb !== undefined || entry.fat !== undefined) && (
          <div className="flex gap-3 mt-3 text-[11px] text-slate-500">
            {entry.protein !== undefined && <span>단백질 <b className="text-slate-700">{Math.round(entry.protein)}g</b></span>}
            {entry.carb !== undefined && <span>탄수화물 <b className="text-slate-700">{Math.round(entry.carb)}g</b></span>}
            {entry.fat !== undefined && <span>지방 <b className="text-slate-700">{Math.round(entry.fat)}g</b></span>}
          </div>
        )}
      </div>

      {entry.foods.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-100 p-3.5">
          <p className="text-[11.5px] font-bold text-slate-500 mb-2">인식된 음식</p>
          <div className="space-y-1.5">
            {entry.foods.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-[13px]">
                <span className="text-slate-700">{f.name}</span>
                <span className="text-slate-400 font-semibold">{f.calories}kcal</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {entry.assessment && (
        <div className="rounded-2xl p-3.5 flex items-start gap-2.5" style={{ background: 'rgba(139,92,246,0.07)' }}>
          <ChefHat className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
          <p className="text-[13px] text-slate-700 leading-relaxed">{entry.assessment}</p>
        </div>
      )}

      {(entry.addSuggestions.length > 0 || entry.removeSuggestions.length > 0) && (
        <div className="rounded-2xl bg-white border border-slate-100 p-3.5 space-y-2">
          <SuggestionRow label="추가하면 좋아요" items={entry.addSuggestions} tone="add" />
          <SuggestionRow label="줄이면 좋아요" items={entry.removeSuggestions} tone="remove" />
        </div>
      )}

      {products.length > 0 && (
        <div>
          <p className="text-[11.5px] font-bold text-slate-500 mb-2 px-0.5">🛍️ 루디아샵 추천</p>
          <div className="space-y-2">
            {products.map(p => <ProductRecCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Manual tag picker (AI 실패 시 폴백) ────────────────────────────────────

function ManualTagPicker({ onSubmit }: {
  onSubmit: (selections: { tagId: string; portion: Portion }[], dietPattern: DietPattern) => void
}) {
  const [selection, setSelection] = useState<Record<string, Portion | null>>({})
  const [dietPattern, setDietPattern] = useState<DietPattern>('unclear')

  const chosen = Object.entries(selection).filter((e): e is [string, Portion] => e[1] !== null)

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-3 text-[12px] text-slate-500 leading-relaxed" style={{ background: '#f8fafc' }}>
        지금은 AI 자동 분석에 연결할 수 없어요. 먹은 음식 종류와 양을 골라주시면 루디아가 바로 계산해드려요.
      </div>

      <div>
        <p className="text-[11.5px] font-bold text-slate-500 mb-1.5">이 식사는 어떻게 준비했나요?</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(DIET_PATTERN_META) as DietPattern[]).map(k => (
            <button key={k} onClick={() => setDietPattern(k)}
              className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
              style={dietPattern === k
                ? { background: 'rgba(244,63,117,0.1)', border: '1.5px solid #f43f75', color: '#e11d5a' }
                : { background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#94a3b8' }}>
              {DIET_PATTERN_META[k].emoji} {DIET_PATTERN_META[k].label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        {FOOD_TAGS.map(tag => (
          <div key={tag.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-100">
            <span className="text-lg flex-shrink-0">{tag.emoji}</span>
            <span className="flex-1 text-[13px] font-semibold text-slate-700 min-w-0 truncate">{tag.label}</span>
            <div className="flex gap-1 flex-shrink-0">
              {PORTIONS.map(p => {
                const on = selection[tag.id] === p
                return (
                  <button key={p}
                    onClick={() => setSelection(prev => ({ ...prev, [tag.id]: prev[tag.id] === p ? null : p }))}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                    style={on ? { background: '#f43f75', color: '#fff' } : { background: '#f1f5f9', color: '#94a3b8' }}>
                    {p}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => onSubmit(chosen.map(([tagId, portion]) => ({ tagId, portion })), dietPattern)}
        disabled={chosen.length === 0}
        className="w-full py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-40 transition-opacity"
        style={{ background: 'linear-gradient(135deg,#f43f75,#e11d5a)' }}>
        {chosen.length === 0 ? '음식을 선택해주세요' : `선택한 ${chosen.length}개로 계산하기`}
      </button>
    </div>
  )
}

// ── Capture sheet ───────────────────────────────────────────────────────

type CaptureStep = 'capture' | 'analyzing' | 'manual' | 'done'

function CaptureSheet({ mealType, mealProfile, careLabel, onClose, onSaved }: {
  mealType: MealType
  mealProfile: CareMealProfile
  careLabel: string
  onClose: () => void
  onSaved: (entry: MealEntry) => void
}) {
  const meta = MEAL_META[mealType]
  const target = mealTargetKcal(mealProfile, mealType)
  const [step, setStep] = useState<CaptureStep>('capture')
  const [photo, setPhoto] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<MealEntry | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try { setPhoto(await compressImage(file)) } finally { setUploading(false); e.target.value = '' }
  }

  async function analyze() {
    if (!photo) return
    setStep('analyzing')
    const aiResult = await callVisionApi(photo, mealType, careLabel, target)
    if (aiResult) {
      finish(aiResult)
    } else {
      setStep('manual')
    }
  }

  function finish(analysis: MealAnalysisResult) {
    const entry: MealEntry = { ...analysis, mealType, photo: photo!, createdAt: new Date().toISOString() }
    setResult(entry)
    setStep('done')
    onSaved(entry)
  }

  function submitManual(selections: { tagId: string; portion: Portion }[], dietPattern: DietPattern) {
    finish(buildManualResult(mealType, selections, mealProfile, dietPattern))
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#fff' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <button onClick={onClose} className="p-1"><X className="w-6 h-6 text-slate-600" /></button>
        <p className="text-base font-bold text-slate-800">{meta.emoji} {meta.label} 식단 기록</p>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {step === 'capture' && (
          <div className="space-y-4">
            {photo ? (
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setPhoto(null)} className="absolute top-2.5 right-2.5 w-8 h-8 bg-black/55 rounded-full flex items-center justify-center">
                  <X className="w-4.5 h-4.5 text-white" />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                className="w-full aspect-[4/3] rounded-2xl flex flex-col items-center justify-center gap-2.5 text-rose-400"
                style={{ background: 'linear-gradient(135deg,#fdf2f8,#f5f0ff)', border: '1.5px dashed rgba(244,63,117,0.3)' }}>
                {uploading
                  ? <Loader2 className="w-8 h-8 animate-spin" />
                  : <Camera className="w-9 h-9" />}
                <span className="text-sm font-bold">{meta.label} 사진 찍기 · 올리기</span>
                <span className="text-[11px] text-rose-300">루디아가 칼로리와 영양 균형을 분석해드려요</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

            <button onClick={analyze} disabled={!photo}
              className="w-full py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#f43f75,#e11d5a)' }}>
              <Sparkles className="w-4 h-4" /> 루디아에게 분석 요청하기
            </button>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="relative">
              <Loader2 className="w-10 h-10 text-rose-400 animate-spin" />
            </div>
            <p className="text-sm font-bold text-slate-600">루디아가 식단을 살펴보는 중...</p>
            <p className="text-[11.5px] text-slate-400">음식과 칼로리를 인식하고 있어요</p>
          </div>
        )}

        {step === 'manual' && <ManualTagPicker onSubmit={submitManual} />}

        {step === 'done' && result && (
          <div className="space-y-4">
            <MealResultView entry={result} mealProfile={mealProfile} />
            <button onClick={onClose}
              className="w-full py-3.5 rounded-2xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#f43f75,#e11d5a)' }}>
              확인 완료
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── View sheet (이미 저장된 기록 보기) ─────────────────────────────────────

function ViewSheet({ entry, mealProfile, onClose, onRetake, onDelete }: {
  entry: MealEntry; mealProfile: CareMealProfile
  onClose: () => void; onRetake: () => void; onDelete: () => void
}) {
  const meta = MEAL_META[entry.mealType]
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#fff' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <button onClick={onClose} className="p-1"><ChevronLeft className="w-6 h-6 text-slate-600" /></button>
        <p className="text-base font-bold text-slate-800">{meta.emoji} {meta.label} 기록</p>
        <button onClick={onDelete} className="p-1"><Trash2 className="w-5 h-5 text-slate-400" /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <MealResultView entry={entry} mealProfile={mealProfile} />
        <button onClick={onRetake}
          className="w-full mt-4 py-3 rounded-2xl text-sm font-bold text-rose-500 flex items-center justify-center gap-1.5"
          style={{ background: 'rgba(244,63,117,0.08)' }}>
          <RotateCcw className="w-4 h-4" /> 다시 찍기
        </button>
      </div>
    </div>
  )
}

// ── Meal slot card ──────────────────────────────────────────────────────

function MealSlotCard({ mealType, entry, onOpen }: { mealType: MealType; entry?: MealEntry; onOpen: () => void }) {
  const meta = MEAL_META[mealType]
  return (
    <button onClick={onOpen}
      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-100 text-left hover:border-rose-200 transition-colors">
      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
        style={{ background: entry ? undefined : 'rgba(244,63,117,0.06)' }}>
        {entry
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={entry.photo} alt="" className="w-full h-full object-cover" />
          : <ImagePlus className="w-5 h-5 text-rose-300" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[13.5px] font-bold text-slate-800">{meta.emoji} {meta.label}</p>
          <span className="text-[10.5px] text-slate-300">{meta.timeHint}</span>
        </div>
        {entry ? (
          <p className="text-[12.5px] text-slate-500 mt-0.5 line-clamp-1">
            <span className="font-bold text-rose-500">{entry.totalCalories.toLocaleString()}kcal</span> · {entry.assessment.slice(0, 24)}{entry.assessment.length > 24 ? '…' : ''}
          </p>
        ) : (
          <p className="text-[12.5px] text-slate-400 mt-0.5">사진으로 기록하고 분석받기</p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
    </button>
  )
}

// ── 루디아에게 물어보기 (대화) 진입 카드 ────────────────────────────────

function AskLudiaCard() {
  return (
    <Link href="/ludia-call/chat"
      className="flex items-center gap-3 p-4 rounded-2xl transition-transform active:scale-[0.98]"
      style={{
        background: 'linear-gradient(135deg, #0f0810 0%, #2d1129 55%, #1a0a18 100%)',
        boxShadow: '0 4px 20px rgba(244,63,117,0.22)',
      }}>
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#f43f75,#a855f7)' }}>
        <MessageCircle className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-bold text-white flex items-center gap-1.5">
          루디아에게 물어보기 <Sparkles className="w-3.5 h-3.5 text-rose-300" />
        </p>
        <p className="text-[11.5px] text-white/55 mt-0.5">컨디션, 식단, 건강 고민을 언제든 편하게 대화해요</p>
      </div>
      <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />
    </Link>
  )
}

// ── Daily summary ──────────────────────────────────────────────────────

function DailySummary({ dayLog, mealProfile, subtypeLabel }: { dayLog: DayLog; mealProfile: CareMealProfile; subtypeLabel?: string }) {
  const total = MEAL_ORDER.reduce((sum, m) => sum + (dayLog[m]?.totalCalories ?? 0), 0)
  const [lo, hi] = mealProfile.dailyKcal
  const pct = Math.min(100, Math.round((total / hi) * 100))
  const loggedCount = MEAL_ORDER.filter(m => dayLog[m]).length

  return (
    <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg,#f43f75,#a855f7)' }}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[12px] font-semibold opacity-90">오늘 섭취 칼로리</p>
        <p className="text-[11px] opacity-75">{loggedCount}/3끼 기록</p>
      </div>
      <p className="text-3xl font-black mb-2">{total.toLocaleString()}<span className="text-sm font-bold opacity-80 ml-1">kcal</span></p>
      <div className="w-full h-2 rounded-full bg-white/25 overflow-hidden mb-1.5">
        <div className="h-full rounded-full bg-white transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] opacity-85">하루 목표 {lo.toLocaleString()}~{hi.toLocaleString()}kcal · {mealProfile.focus}</p>
      {subtypeLabel && (
        <p className="text-[10.5px] mt-2 pt-2 border-t border-white/20 opacity-80">
          🔎 진단 기반 체질 반영 중 · {subtypeLabel}
        </p>
      )}
    </div>
  )
}

// ── History ───────────────────────────────────────────────────────────

function HistoryList({ logs, todayK, onOpenEntry }: {
  logs: MealLogs; todayK: string
  onOpenEntry: (dateKey: string, mealType: MealType) => void
}) {
  const days = Object.keys(logs).filter(k => k !== todayK).sort((a, b) => b.localeCompare(a)).slice(0, 14)
  if (days.length === 0) return null

  return (
    <div>
      <p className="text-[11.5px] font-bold text-slate-500 mb-2 px-0.5">지난 기록</p>
      <div className="space-y-2">
        {days.map(dateKey => {
          const dayLog = logs[dateKey]
          const total = MEAL_ORDER.reduce((s, m) => s + (dayLog[m]?.totalCalories ?? 0), 0)
          const d = new Date(dateKey)
          return (
            <div key={dateKey} className="p-3 rounded-2xl bg-white border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12.5px] font-bold text-slate-700">{d.getMonth() + 1}월 {d.getDate()}일</p>
                <p className="text-[12px] font-bold text-rose-500">{total.toLocaleString()}kcal</p>
              </div>
              <div className="flex gap-2">
                {MEAL_ORDER.map(m => {
                  const e = dayLog[m]
                  const meta = MEAL_META[m]
                  return (
                    <button key={m} onClick={() => e && onOpenEntry(dateKey, m)} disabled={!e}
                      className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl disabled:opacity-30"
                      style={{ background: e ? '#f8fafc' : 'transparent' }}>
                      <span className="text-base">{meta.emoji}</span>
                      <span className="text-[10px] font-semibold text-slate-500">{e ? `${e.totalCalories}kcal` : '-'}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 지금 뭐가 불편하세요? (증상 우선 · 카드 전체 교차 진단) ────────────────

function SymptomCheckCard({ onOpen }: { onOpen: () => void }) {
  return (
    <button onClick={onOpen}
      className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-transform active:scale-[0.98]"
      style={{ background: 'rgba(139,92,246,0.08)', border: '1.5px solid rgba(139,92,246,0.2)' }}>
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)' }}>
        <Stethoscope className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-bold text-slate-800">지금 뭐가 불편하세요?</p>
        <p className="text-[11.5px] text-slate-500 mt-0.5">증상만 골라도 홍채·BMI로 원인을 실시간으로 찾아드려요</p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
    </button>
  )
}

function SymptomResultView({ match }: { match: GlobalSubtypeMatch }) {
  const t = resolveSubtype(match.careCaseId, match.subtypeId)
  if (!t) return null
  const isHair = match.careCaseId === 'hair_scalp'
  const rc = ROOT_CAUSE_META[rootCauseOf(match.subtypeId, isHair)]
  const cardLabel = CARE_CASES.find(c => c.id === match.careCaseId)?.label ?? ''
  const meetupMeta = MEETUP_CATEGORY_META[t.meetupCategory]

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4 text-white" style={{ background: `linear-gradient(135deg,${rc.color},${rc.color}cc)` }}>
        <p className="text-[11px] font-bold opacity-85 mb-1">가장 유력한 원인</p>
        <p className="text-xl font-black flex items-center gap-1.5">{rc.emoji} {rc.label}</p>
        <p className="text-[12px] opacity-90 mt-1 leading-relaxed">{rc.desc}</p>
      </div>

      <div className="glass-card p-5 border-l-4 rounded-2xl bg-white" style={{ borderLeftColor: t.color }}>
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: t.color }}>{cardLabel} · 세부 체질</p>
        <p className="text-base font-bold text-slate-800 mt-0.5">{t.emoji} {t.label}</p>
        <p className="text-xs text-slate-400">{t.subtitle}</p>
        <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">{t.mechanism}</p>
      </div>

      <div className="rounded-2xl p-4 bg-white border border-slate-100">
        <div className="flex items-center gap-2 mb-2">
          <Salad className="w-4 h-4" style={{ color: t.color }} />
          <h3 className="text-sm font-semibold text-slate-700">식습관</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {t.diet.good.map(f => (
            <span key={f} className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-green-50 text-green-700 border border-green-200">✓ {f}</span>
          ))}
          {t.diet.avoid.map(f => (
            <span key={f} className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-50 text-red-500 border border-red-200">✕ {f}</span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-4 bg-white border border-slate-100">
        <div className="flex items-center gap-2 mb-2">
          <Dumbbell className="w-4 h-4" style={{ color: t.color }} />
          <h3 className="text-sm font-semibold text-slate-700">운동</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {t.exercise.map(e => (
            <span key={e} className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200">{e}</span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-4 bg-white border border-slate-100">
        <div className="flex items-center gap-2 mb-2">
          <SprayCan className="w-4 h-4" style={{ color: t.color }} />
          <h3 className="text-sm font-semibold text-slate-700">홈케어</h3>
        </div>
        <div className="space-y-1">
          {t.homecare.map(h => <p key={h} className="text-xs text-slate-500 leading-relaxed">• {h}</p>)}
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4" style={{ color: t.color }} />
          <p className="text-sm font-bold text-slate-800">{t.routineClub.name}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {t.routineClub.activities.map(a => (
            <span key={a} className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/70 border border-white text-slate-600">{a}</span>
          ))}
        </div>
        <Link href={`/community?category=${t.meetupCategory}`}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
          style={{ background: t.gradient, boxShadow: `0 4px 14px ${t.glow}` }}>
          {meetupMeta.emoji} 추천 모임 보러가기 <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}

function SymptomDiagnosisSheet({ data, profile, baseOverrides, onClose }: {
  data: MultimodalData; profile: OnboardingProfile; baseOverrides?: SignalOverrides; onClose: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [result, setResult] = useState<GlobalSubtypeMatch | null>(null)

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function diagnose() {
    const overrides: SignalOverrides = { ...baseOverrides }
    SYMPTOM_OPTIONS.filter(s => selected.has(s.id)).forEach(s => Object.assign(overrides, s.overrides))
    const { primary } = classifyAcrossAllCards(data, profile, overrides)
    setResult(primary)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#fff' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <button onClick={result ? () => setResult(null) : onClose} className="p-1">
          {result ? <ChevronLeft className="w-6 h-6 text-slate-600" /> : <X className="w-6 h-6 text-slate-600" />}
        </button>
        <p className="text-base font-bold text-slate-800">{result ? '실시간 진단 결과' : '지금 뭐가 불편하세요?'}</p>
        <button onClick={onClose} className="p-1"><X className="w-5 h-5 text-slate-400" /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!result ? (
          <div className="space-y-4">
            <p className="text-[12.5px] text-slate-500 leading-relaxed">
              해당하는 증상을 모두 골라주세요. 지금 선택된 케어카드와 상관없이, 홍채·BMI 데이터와 함께 12개 영역 전체에서 가장 가능성 높은 원인을 찾아드려요.
            </p>
            {baseOverrides?.deliveryFoodHigh && (
              <div className="rounded-xl p-3 text-[11.5px] leading-relaxed" style={{ background: 'rgba(79,70,229,0.08)', color: '#4338ca' }}>
                🛵 최근 일주일 찍어 올린 식단에 배달·가공식품 비중이 높았던 것도 함께 반영했어요.
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {SYMPTOM_OPTIONS.map(opt => {
                const on = selected.has(opt.id)
                return (
                  <button key={opt.id} onClick={() => toggle(opt.id)}
                    className="px-3.5 py-2 rounded-full text-[12.5px] font-semibold transition-all"
                    style={on
                      ? { background: 'rgba(139,92,246,0.12)', border: '1.5px solid #8b5cf6', color: '#6d28d9' }
                      : { background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#94a3b8' }}>
                    {opt.emoji} {opt.label}
                  </button>
                )
              })}
            </div>
            <button onClick={diagnose} disabled={selected.size === 0}
              className="w-full py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2 sticky bottom-2"
              style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)' }}>
              <Sparkles className="w-4 h-4" /> {selected.size === 0 ? '증상을 선택해주세요' : `${selected.size}개 증상으로 진단하기`}
            </button>
          </div>
        ) : (
          <SymptomResultView match={result} />
        )}
      </div>
    </div>
  )
}

// ── 이번 주 영양소 추이 ───────────────────────────────────────────────────

function last7Keys(): string[] {
  const out: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  return out
}

function WeeklyNutritionSummary({ logs, mealProfile }: { logs: MealLogs; mealProfile: CareMealProfile }) {
  const weekKeys = useMemo(() => last7Keys(), [])
  const entries = weekKeys.flatMap(k => MEAL_ORDER.map(m => logs[k]?.[m]).filter((e): e is MealEntry => !!e))

  if (entries.length === 0) return null

  const daysWithData = new Set(weekKeys.filter(k => MEAL_ORDER.some(m => logs[k]?.[m]))).size
  const avg = (pick: (e: MealEntry) => number | undefined) => {
    const vals = entries.map(pick).filter((v): v is number => v !== undefined)
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / daysWithData) : null
  }

  const avgKcal = avg(e => e.totalCalories)
  const avgProtein = avg(e => e.protein)
  const avgCarb = avg(e => e.carb)
  const avgFat = avg(e => e.fat)

  // 아주 단순한 가이드라인 — 정밀한 영양 처방이 아니라 대략적인 경향 파악용이에요.
  const proteinLow = avgProtein !== null && avgProtein < 45
  const boostHint = mealProfile.boost[0]

  const deliveryCount = entries.filter(e => e.dietPattern === 'delivery' || e.dietPattern === 'processed').length
  const deliveryRatio = Math.round((deliveryCount / entries.length) * 100)
  const deliveryHigh = deliveryCount / entries.length >= 0.4

  const bars: { label: string; value: number | null; target: number; color: string }[] = [
    { label: '칼로리', value: avgKcal, target: Math.round((mealProfile.dailyKcal[0] + mealProfile.dailyKcal[1]) / 2), color: '#f43f75' },
    { label: '단백질(g)', value: avgProtein, target: 60, color: '#0891b2' },
    { label: '탄수화물(g)', value: avgCarb, target: 200, color: '#ca8a04' },
    { label: '지방(g)', value: avgFat, target: 55, color: '#7c3aed' },
  ]

  return (
    <div className="rounded-2xl p-4 bg-white border border-slate-100">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-rose-400" />
        <h3 className="text-sm font-bold text-slate-700">이번 주 영양소 추이</h3>
        <span className="text-[10.5px] text-slate-400 ml-auto">기록 {daysWithData}일 기준</span>
      </div>
      <div className="space-y-2.5">
        {bars.map(b => {
          const pct = b.value !== null ? Math.min(100, Math.round((b.value / b.target) * 100)) : 0
          return (
            <div key={b.label}>
              <div className="flex items-center justify-between text-[11.5px] mb-1">
                <span className="font-semibold text-slate-600">{b.label}</span>
                <span className="text-slate-400">{b.value !== null ? `일평균 ${b.value.toLocaleString()}` : '데이터 없음'}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: b.color }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between text-[11.5px] mb-1">
          <span className="font-semibold text-slate-600">🛵 배달·가공식품 비중</span>
          <span className={cn('font-bold', deliveryHigh ? 'text-orange-500' : 'text-slate-400')}>
            {deliveryCount}/{entries.length}끼 ({deliveryRatio}%)
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${deliveryRatio}%`, background: deliveryHigh ? '#ea580c' : '#94a3b8' }} />
        </div>
      </div>

      {(proteinLow || boostHint || deliveryHigh) && (
        <p className="text-[11.5px] text-slate-500 mt-3 pt-3 border-t border-slate-100 leading-relaxed">
          {deliveryHigh
            ? '💡 최근 배달·가공식품 비중이 높아요. 간 부담이나 나트륨 과다로 이어질 수 있어서, 진단에도 독소·장 원인 가능성을 함께 반영했어요.'
            : proteinLow
              ? `💡 최근 일주일 단백질 섭취가 부족한 편이에요.${boostHint ? ` 지금 체질엔 ${boostHint} 위주 보충이 특히 도움돼요.` : ''}`
              : `💡 지금 체질엔 ${boostHint} 위주 식단이 꾸준히 도움돼요.`}
        </p>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────

export default function LudiaCallPage() {
  const onboarding = useOnboardingProfile()
  const { data, ready: dataReady } = useMultimodalData()
  const careTypes = onboarding.careTypes
  const [logs, setLogs] = useState<MealLogs>({})
  const [hydrated, setHydrated] = useState(false)
  const [captureMeal, setCaptureMeal] = useState<MealType | null>(null)
  const [viewing, setViewing] = useState<{ dateKey: string; mealType: MealType } | null>(null)
  const [showSymptomCheck, setShowSymptomCheck] = useState(false)

  useEffect(() => { setLogs(loadLogs()); setHydrated(true) }, [])

  const tKey = todayKey()
  const todayLog: DayLog = logs[tKey] ?? {}

  // 최근 7일간 찍어 올린 식단에서 배달·가공식품 비중을 계산해, 체질 재분류에 실제로 반영해요.
  const deliverySignal = useMemo(() => computeDeliveryFoodSignal(logs), [logs])
  const dietOverrides = useMemo<SignalOverrides>(
    () => ({ deliveryFoodHigh: deliverySignal.high }),
    [deliverySignal.high],
  )

  // 홍채+BMI+문진 기반 세부 체질 분류 → 식단 목표·평가·상품 추천에 반영해요.
  const primarySubtype = useMemo(
    () => (dataReady ? getPrimarySubtype(careTypes, data, onboarding, dietOverrides) : null),
    [dataReady, data, careTypes, onboarding, dietOverrides],
  )
  const mealProfile = useMemo(
    () => refineMealProfileWithSubtype(resolveMealProfile(careTypes), primarySubtype),
    [careTypes, primarySubtype],
  )
  const careLabel = useMemo(
    () => careLabelsOf(careTypes, primarySubtype?.label),
    [careTypes, primarySubtype],
  )

  const persist = useCallback((next: MealLogs) => {
    setLogs(next)
    saveLogs(next)
  }, [])

  const handleSaved = useCallback((entry: MealEntry) => {
    persist({ ...logs, [tKey]: { ...(logs[tKey] ?? {}), [entry.mealType]: entry } })
  }, [logs, tKey, persist])

  const handleDelete = useCallback((dateKey: string, mealType: MealType) => {
    if (!confirm('이 기록을 삭제할까요?')) return
    const day = { ...(logs[dateKey] ?? {}) }
    delete day[mealType]
    persist({ ...logs, [dateKey]: day })
    setViewing(null)
  }, [logs, persist])

  const viewingEntry = viewing ? logs[viewing.dateKey]?.[viewing.mealType] : null

  if (!hydrated) return null

  return (
    <div className="min-h-screen pb-24" style={{ background: '#fafafa' }}>
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100">
        <div className="px-4 py-4 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#f43f75,#a855f7)' }}>
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-xl font-semibold text-slate-800 leading-tight">루디아 호출</h1>
              <p className="text-[11.5px] text-slate-400">사진 한 장으로 받는 AI 웰니스 코칭</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <AskLudiaCard />
        <SymptomCheckCard onOpen={() => setShowSymptomCheck(true)} />
        <DailySummary dayLog={todayLog} mealProfile={mealProfile} subtypeLabel={primarySubtype?.label} />

        <div className="space-y-2">
          <p className="text-[11.5px] font-bold text-slate-500 px-0.5">오늘의 식단</p>
          {MEAL_ORDER.map(m => (
            <MealSlotCard key={m} mealType={m} entry={todayLog[m]}
              onOpen={() => todayLog[m] ? setViewing({ dateKey: tKey, mealType: m }) : setCaptureMeal(m)} />
          ))}
        </div>

        <WeeklyNutritionSummary logs={logs} mealProfile={mealProfile} />

        <HistoryList logs={logs} todayK={tKey} onOpenEntry={(dateKey, mealType) => setViewing({ dateKey, mealType })} />
      </div>

      {captureMeal && (
        <CaptureSheet mealType={captureMeal} mealProfile={mealProfile} careLabel={careLabel}
          onClose={() => setCaptureMeal(null)}
          onSaved={handleSaved} />
      )}

      {viewingEntry && viewing && (
        <ViewSheet entry={viewingEntry} mealProfile={mealProfile}
          onClose={() => setViewing(null)}
          onRetake={() => { setCaptureMeal(viewing.mealType); setViewing(null) }}
          onDelete={() => handleDelete(viewing.dateKey, viewing.mealType)} />
      )}

      {showSymptomCheck && (
        <SymptomDiagnosisSheet data={data} profile={onboarding} baseOverrides={dietOverrides} onClose={() => setShowSymptomCheck(false)} />
      )}
    </div>
  )
}
