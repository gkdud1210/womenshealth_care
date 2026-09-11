'use client'

import { useState, useRef, useCallback } from 'react'
import {
  X, Search, ShieldCheck, ShieldAlert, ShieldX,
  Leaf, Sparkles, ChevronRight, AlertCircle, CheckCircle2,
  ScanLine, ArrowRight,
} from 'lucide-react'
import {
  SAMPLE_PRODUCTS,
  INGREDIENT_DB,
  getDangerousIngredients,
  getIngredients,
  getAlternative,
  searchProducts,
  type ProductIngredientData,
  type IngredientInfo,
  type RiskLevel,
} from '@/data/ingredientData'

// ── Circular Score Gauge ───────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const radius = 52
  const stroke = 10
  const normalizedR = radius - stroke / 2
  const circumference = normalizedR * 2 * Math.PI
  const offset = circumference - (score / 100) * circumference

  const color =
    score >= 80 ? '#22c55e'
    : score >= 60 ? '#f59e0b'
    : '#ef4444'

  const bg =
    score >= 80 ? 'rgba(34,197,94,0.08)'
    : score >= 60 ? 'rgba(245,158,11,0.08)'
    : 'rgba(239,68,68,0.08)'

  const label =
    score >= 80 ? '안심'
    : score >= 60 ? '주의'
    : '위험'

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex items-center justify-center" style={{ width: radius * 2, height: radius * 2 }}>
        <svg
          width={radius * 2}
          height={radius * 2}
          style={{ transform: 'rotate(-90deg)', position: 'absolute' }}
        >
          {/* track */}
          <circle
            cx={radius}
            cy={radius}
            r={normalizedR}
            fill="none"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth={stroke}
          />
          {/* progress */}
          <circle
            cx={radius}
            cy={radius}
            r={normalizedR}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
          />
        </svg>
        <div
          className="flex flex-col items-center justify-center rounded-full"
          style={{ width: radius * 2 - stroke * 2.5, height: radius * 2 - stroke * 2.5, background: bg }}
        >
          <span className="text-2xl font-black" style={{ color, lineHeight: 1 }}>{score}</span>
          <span className="text-[10px] font-bold mt-0.5" style={{ color }}>{label}</span>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 font-medium">여성 호르몬 안전 지수</p>
    </div>
  )
}

// ── Ludia Grade Badge ──────────────────────────────────────────────────────

function LudiaBadge({ grade }: { grade: ProductIngredientData['ludiaGrade'] }) {
  if (grade === 'PREMIUM') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full"
        style={{ background: 'linear-gradient(135deg,#f43f75,#a855f7)', color: '#fff', letterSpacing: '0.04em' }}>
        <Sparkles size={11} />✨ PREMIUM
      </span>
    )
  }
  if (grade === 'GREEN') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full"
        style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', letterSpacing: '0.04em' }}>
        <Leaf size={11} />🌱 GREEN
      </span>
    )
  }
  if (grade === 'CAUTION') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
        style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', border: '1px solid rgba(245,158,11,0.25)' }}>
        ⚠️ 주의
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
      style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.22)' }}>
      🚫 위험
    </span>
  )
}

// ── Traffic Light Filter ───────────────────────────────────────────────────

type FilterStatus = 'safe' | 'caution' | 'danger'

function TrafficLight({ status, label, detail }: { status: FilterStatus; label: string; detail: string }) {
  const cfg = {
    safe:   { Icon: CheckCircle2, color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)',   badge: '안심' },
    caution:{ Icon: AlertCircle,  color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.22)', badge: '주의' },
    danger: { Icon: ShieldX,      color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)',   badge: '위험' },
  }[status]

  return (
    <div className="flex items-start gap-3 p-3.5 rounded-2xl"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <cfg.Icon size={20} className="shrink-0 mt-0.5" style={{ color: cfg.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[13px] font-bold text-slate-700">{label}</p>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: cfg.color, color: '#fff' }}>
            {cfg.badge}
          </span>
        </div>
        <p className="text-[12px] text-slate-500 leading-snug">{detail}</p>
      </div>
    </div>
  )
}

// ── Ingredient Row ─────────────────────────────────────────────────────────

function IngredientRow({
  info,
  onTap,
}: {
  info: IngredientInfo
  onTap: (info: IngredientInfo) => void
}) {
  const colorMap: Record<RiskLevel, string> = {
    danger: '#ef4444',
    caution: '#f59e0b',
    safe: '#22c55e',
  }
  const bgMap: Record<RiskLevel, string> = {
    danger: 'rgba(239,68,68,0.07)',
    caution: 'rgba(245,158,11,0.07)',
    safe: 'rgba(34,197,94,0.06)',
  }
  const labelMap: Record<RiskLevel, string> = {
    danger: '위험',
    caution: '주의',
    safe: '안심',
  }

  return (
    <button
      type="button"
      onClick={() => onTap(info)}
      className="w-full flex items-center gap-3 py-3 text-left"
      style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}
    >
      <span
        className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[34px] text-center"
        style={{ background: bgMap[info.riskLevel], color: colorMap[info.riskLevel] }}
      >
        {labelMap[info.riskLevel]}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-slate-700 truncate">{info.nameKo}</p>
        <p className="text-[11px] text-slate-400 truncate">{info.name}</p>
      </div>
      <ChevronRight size={14} className="text-slate-300 shrink-0" />
    </button>
  )
}

// ── Ingredient Detail Popup ────────────────────────────────────────────────

function IngredientDetailPopup({
  info,
  onClose,
}: {
  info: IngredientInfo
  onClose: () => void
}) {
  const riskColor = info.riskLevel === 'danger' ? '#ef4444' : info.riskLevel === 'caution' ? '#f59e0b' : '#22c55e'

  return (
    <>
      <div className="fixed inset-0 z-[80]" onClick={onClose}
        style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }} />
      <div className="fixed left-4 right-4 bottom-8 z-[90] rounded-3xl p-5 space-y-4"
        style={{
          background: 'rgba(255,253,252,0.99)',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.15)',
          border: `1.5px solid ${riskColor}30`,
        }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] text-slate-400 font-medium">{info.name}</p>
            <h3 className="font-display text-lg font-bold text-slate-800">{info.nameKo}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(0,0,0,0.06)' }}>
            <X size={14} className="text-slate-500" />
          </button>
        </div>

        <div className="p-3.5 rounded-2xl"
          style={{ background: `${riskColor}0D`, border: `1px solid ${riskColor}25` }}>
          <p className="text-[13px] text-slate-700 leading-relaxed">{info.description}</p>
        </div>

        {info.affectedOrgans.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">영향 부위</p>
            <div className="flex flex-wrap gap-2">
              {info.affectedOrgans.map(organ => (
                <span key={organ} className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: `${riskColor}15`, color: riskColor }}>
                  {organ}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── Iris Matching Panel ────────────────────────────────────────────────────

const MOCK_IRIS = {
  stressIndex: 74,
  weakZones: ['대장', '자율신경계'],
  lowZones: ['자궁'],
}

function IrisMatchingPanel({ product }: { product: ProductIngredientData }) {
  const ingredients = getIngredients(product.ingredientIds)
  const helpfulIngredients = ingredients.filter(i =>
    i.affectedOrgans.some(o => MOCK_IRIS.weakZones.includes(o) || MOCK_IRIS.lowZones.includes(o)) &&
    i.riskLevel === 'safe',
  )
  const harmfulForUser = ingredients.filter(i =>
    i.affectedOrgans.some(o => MOCK_IRIS.weakZones.includes(o) || MOCK_IRIS.lowZones.includes(o)) &&
    i.riskLevel !== 'safe',
  )

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(244,63,117,0.04), rgba(99,102,241,0.06))',
        border: '1px solid rgba(244,63,117,0.14)',
      }}>
      <div className="flex items-center gap-2 px-4 pt-4 pb-3"
        style={{ borderBottom: '1px solid rgba(244,63,117,0.08)' }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#f43f75,#a855f7)' }}>
          <span className="text-[12px]">👁</span>
        </div>
        <div>
          <p className="text-[11px] font-black tracking-widest" style={{ color: '#f43f75' }}>LUDIA CORES</p>
          <p className="text-[10px] text-slate-400">홍채 분석 데이터 연동 매칭</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-500">내 취약 부위</span>
          {[...MOCK_IRIS.weakZones, ...MOCK_IRIS.lowZones].map(z => (
            <span key={z} className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(244,63,117,0.1)', color: '#f43f75' }}>
              {z}
            </span>
          ))}
        </div>

        <div className="rounded-xl p-3.5 space-y-2"
          style={{ background: 'rgba(255,255,255,0.65)' }}>
          {helpfulIngredients.length > 0 && (
            <div className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
              <p className="text-[12px] text-slate-600 leading-snug">
                <span className="font-semibold text-emerald-600">
                  {helpfulIngredients.map(i => i.nameKo).join(', ')}
                </span>
                {' '}성분이 자율신경계 안정 및 소화 기능에 도움을 줄 수 있어요.
              </p>
            </div>
          )}
          {harmfulForUser.length > 0 && (
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="text-rose-500 mt-0.5 shrink-0" />
              <p className="text-[12px] text-slate-600 leading-snug">
                <span className="font-semibold text-rose-600">
                  {harmfulForUser.map(i => i.nameKo).join(', ')}
                </span>
                {' '}은(는) 민감한 {harmfulForUser[0]?.affectedOrgans[0]} 상태에 추가적인 부담을 줄 수 있어요.
              </p>
            </div>
          )}
          {helpfulIngredients.length === 0 && harmfulForUser.length === 0 && (
            <p className="text-[12px] text-slate-500">
              현재 홍채 분석 데이터와 직접 연관된 성분이 없어요.
            </p>
          )}
        </div>

        <p className="text-[10px] text-slate-400 leading-relaxed">
          ※ 자율신경계 스트레스 지수 {MOCK_IRIS.stressIndex}% · 최신 홍채 분석 결과 기반
        </p>
      </div>
    </div>
  )
}

// ── Alternative Product Banner ─────────────────────────────────────────────

function AlternativeBanner({ alt, onSelect }: { alt: ProductIngredientData; onSelect: () => void }) {
  return (
    <div className="rounded-2xl p-4"
      style={{
        background: 'linear-gradient(135deg, rgba(34,197,94,0.06), rgba(16,163,74,0.04))',
        border: '1px solid rgba(34,197,94,0.2)',
      }}>
      <p className="text-[11px] font-bold text-emerald-600 mb-2.5">
        🌱 이 제품의 안전한 대체재를 찾으시나요?
      </p>
      <button onClick={onSelect}
        className="w-full flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98]"
        style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(34,197,94,0.15)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
          {alt.ludiaGrade === 'PREMIUM' ? <Sparkles size={18} color="#fff" /> : <Leaf size={18} color="#fff" />}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[13px] font-bold text-slate-700 truncate">{alt.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-[11px] text-slate-400">{alt.brand}</p>
            <LudiaBadge grade={alt.ludiaGrade} />
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[13px] font-black text-emerald-600">{alt.safetyScore}</span>
          <ArrowRight size={13} className="text-emerald-500" />
        </div>
      </button>
    </div>
  )
}

// ── Full Product Report ────────────────────────────────────────────────────

function ProductReport({
  product,
  onSelectAlternative,
}: {
  product: ProductIngredientData
  onSelectAlternative: (p: ProductIngredientData) => void
}) {
  const [activeIngredient, setActiveIngredient] = useState<IngredientInfo | null>(null)
  const allIngredients = getIngredients(product.ingredientIds)
  const dangerousFirst = [
    ...allIngredients.filter(i => i.riskLevel === 'danger'),
    ...allIngredients.filter(i => i.riskLevel === 'caution'),
    ...allIngredients.filter(i => i.riskLevel === 'safe'),
  ]

  // Traffic light logic
  const hasChemExcipient = allIngredients.some(i => i.category === 'chemical_excipient')
  const chemExcipientDanger = allIngredients.filter(i => i.category === 'chemical_excipient').some(i => i.riskLevel === 'danger')
  const hasMucousIrritant = allIngredients.some(i => i.category === 'skin_irritant' || i.category === 'fragrance')
  const mucousDanger = allIngredients.filter(i => i.category === 'skin_irritant' || i.category === 'fragrance').some(i => i.riskLevel === 'danger')
  const hasEndocrine = allIngredients.some(i => i.category === 'endocrine_disruptor')
  const endocrineDanger = allIngredients.filter(i => i.category === 'endocrine_disruptor').some(i => i.riskLevel === 'danger')

  const chemStatus = !hasChemExcipient ? 'safe' : chemExcipientDanger ? 'danger' : 'caution'
  const mucousStatus = !hasMucousIrritant ? 'safe' : mucousDanger ? 'danger' : 'caution'
  const endocrineStatus = !hasEndocrine ? 'safe' : endocrineDanger ? 'danger' : 'caution'

  const chemDetail =
    chemStatus === 'safe'
      ? '화학 부형제 검출 안 됨'
      : allIngredients.filter(i => i.category === 'chemical_excipient').map(i => i.nameKo).join(', ') + ' 검출'

  const mucousDetail =
    mucousStatus === 'safe'
      ? '합성 계면활성제·인공향료 배제'
      : allIngredients.filter(i => i.category === 'skin_irritant' || i.category === 'fragrance').map(i => i.nameKo).join(', ') + ' 포함'

  const endocrineDetail =
    endocrineStatus === 'safe'
      ? '내분비계 교란 물질 검출 안 됨'
      : allIngredients.filter(i => i.category === 'endocrine_disruptor').map(i => i.nameKo).join(', ') + ' 검출'

  const alternative = getAlternative(product)

  const categoryLabel = product.category === 'supplement' ? '영양제' : product.category === 'sanitary' ? '생리대' : '화장품'

  return (
    <div className="space-y-5">
      {/* ── Section 1: Score + Grade ── */}
      <div className="flex items-center gap-5 p-4 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.05)' }}>
        <ScoreGauge score={product.safetyScore} />
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide mb-0.5">{product.brand} · {categoryLabel}</p>
            <h3 className="font-display text-[17px] font-bold text-slate-800 leading-snug">{product.name}</h3>
          </div>
          <LudiaBadge grade={product.ludiaGrade} />
          <p className="text-[11px] text-slate-400">
            {allIngredients.length}가지 성분 분석 ·{' '}
            <span style={{ color: getDangerousIngredients(product.ingredientIds).length > 0 ? '#ef4444' : '#22c55e' }}>
              유의 성분 {getDangerousIngredients(product.ingredientIds).length}가지
            </span>
          </p>
        </div>
      </div>

      {/* ── Section 2: Traffic Lights ── */}
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">3대 핵심 안전 필터</p>
        <div className="space-y-2.5">
          {product.category === 'supplement' && (
            <TrafficLight
              status={chemStatus}
              label="화학 부형제"
              detail={chemDetail}
            />
          )}
          {(product.category === 'sanitary' || product.category === 'cosmetics') && (
            <TrafficLight
              status={mucousStatus}
              label="경피독 · 점막 자극"
              detail={mucousDetail}
            />
          )}
          <TrafficLight
            status={endocrineStatus}
            label="내분비계 교란 물질"
            detail={endocrineDetail}
          />
          {product.category !== 'supplement' && (
            <TrafficLight
              status={chemStatus}
              label="화학 부형제 · 합성 첨가물"
              detail={chemDetail}
            />
          )}
        </div>
      </div>

      {/* ── Alternative Recommendation ── */}
      {alternative && (
        <AlternativeBanner alt={alternative} onSelect={() => onSelectAlternative(alternative)} />
      )}

      {/* ── Section 3: Ingredient List ── */}
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">전체 성분 분석</p>
        <p className="text-[11px] text-slate-400 mb-3">성분을 탭하면 여성 건강 관련 설명이 표시됩니다</p>
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.05)' }}>
          <div className="px-4">
            {dangerousFirst.map(info => (
              <IngredientRow key={info.id} info={info} onTap={setActiveIngredient} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 4: Iris Matching ── */}
      <IrisMatchingPanel product={product} />

      {activeIngredient && (
        <IngredientDetailPopup info={activeIngredient} onClose={() => setActiveIngredient(null)} />
      )}
    </div>
  )
}

// ── Product Search List ────────────────────────────────────────────────────

function ProductSearchList({
  query,
  onSelect,
}: {
  query: string
  onSelect: (p: ProductIngredientData) => void
}) {
  const results = searchProducts(query)

  if (!results.length) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
          style={{ background: 'rgba(244,63,117,0.07)' }}>
          <Search size={20} className="text-rose-300" />
        </div>
        <p className="text-sm font-semibold text-slate-500">검색 결과가 없어요</p>
        <p className="text-xs text-slate-300 mt-1">다른 제품명으로 검색해 보세요</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {results.map(p => {
        const scoreColor = p.safetyScore >= 80 ? '#22c55e' : p.safetyScore >= 60 ? '#f59e0b' : '#ef4444'
        return (
          <button key={p.id} onClick={() => onSelect(p)}
            className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl text-left transition-all active:scale-[0.98]"
            style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(244,63,117,0.08)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: p.isPartner ? 'linear-gradient(135deg,#f43f75,#a855f7)' : 'rgba(100,116,139,0.08)' }}>
              {p.isPartner
                ? <Sparkles size={18} color="#fff" />
                : p.category === 'supplement'
                  ? <span className="text-lg">💊</span>
                  : p.category === 'sanitary'
                    ? <span className="text-lg">🌸</span>
                    : <span className="text-lg">✨</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-slate-700 truncate">{p.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-[11px] text-slate-400">{p.brand}</p>
                {p.isPartner && <LudiaBadge grade={p.ludiaGrade} />}
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0 gap-1">
              <span className="text-[17px] font-black" style={{ color: scoreColor }}>{p.safetyScore}</span>
              <span className="text-[9px] font-medium" style={{ color: scoreColor }}>점</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── Main Sheet ─────────────────────────────────────────────────────────────

export function IngredientSafetySheet({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<ProductIngredientData | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const handleSelectAlternative = useCallback((p: ProductIngredientData) => {
    setSelectedProduct(p)
  }, [])

  return (
    <>
      <div className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
        onClick={onClose} />

      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl flex flex-col"
        style={{
          maxHeight: '94dvh',
          background: 'rgba(253,248,246,0.98)',
          boxShadow: '0 -8px 48px rgba(158,18,57,0.13)',
        }}>

        {/* handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3 shrink-0">
          <div>
            {selectedProduct ? (
              <button onClick={() => setSelectedProduct(null)}
                className="flex items-center gap-1.5 text-sm font-semibold"
                style={{ color: '#f43f75' }}>
                ← 검색 목록
              </button>
            ) : (
              <>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <ShieldCheck size={16} style={{ color: '#f43f75' }} />
                  <h2 className="font-display text-lg font-bold text-slate-800">안심 성분 검색</h2>
                </div>
                <p className="text-xs text-slate-400">제품 성분을 여성 호르몬 관점에서 분석합니다</p>
              </>
            )}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.06)' }}>
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        {/* search bar (shown when no product selected) */}
        {!selectedProduct && (
          <div className="px-5 pb-3 shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="제품명, 브랜드 또는 바코드 번호 검색"
                className="w-full pl-9 pr-9 py-3 rounded-2xl text-sm text-slate-700 placeholder-slate-300 outline-none"
                style={{
                  background: 'rgba(255,255,255,0.85)',
                  border: '1.5px solid rgba(244,63,117,0.15)',
                }}
                onFocus={e => (e.currentTarget.style.border = '1.5px solid rgba(244,63,117,0.4)')}
                onBlur={e => (e.currentTarget.style.border = '1.5px solid rgba(244,63,117,0.15)')}
                autoFocus
              />
              {query ? (
                <button onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(100,116,139,0.1)' }}>
                  <X size={10} className="text-slate-400" />
                </button>
              ) : (
                <ScanLine size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              )}
            </div>
          </div>
        )}

        {/* content */}
        <div className="overflow-y-auto flex-1 px-5 pb-8">
          {selectedProduct ? (
            <ProductReport
              product={selectedProduct}
              onSelectAlternative={handleSelectAlternative}
            />
          ) : (
            <>
              {!query && (
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  분석 가능 제품 {SAMPLE_PRODUCTS.length}개
                </p>
              )}
              <ProductSearchList query={query} onSelect={setSelectedProduct} />
            </>
          )}
        </div>
      </div>
    </>
  )
}
