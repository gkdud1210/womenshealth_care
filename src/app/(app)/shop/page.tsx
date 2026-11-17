'use client'

import { Fragment, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  Star, X, ShoppingBag, Trash2, PenLine, ImagePlus, Sparkles,
  Droplets, Shield, Leaf, Wind, Heart, Zap, Search, ShieldCheck,
  Salad, UtensilsCrossed, Flame, Soup, Settings, Menu, ChevronRight, ChevronLeft,
  type LucideIcon,
} from 'lucide-react'
import {
  SHOP_PRODUCTS, CATEGORY_META,
  type ShopProduct, type ProductReview, type ProductCategory,
} from '@/data/shopProducts'
import { CARE_CASES } from '@/data/careCases'
import {
  SHOP_DEPTS, SHOP_ADS, SHOP_MID_AD, productSub, productDept, findDept, type ShopAd,
} from '@/data/shopCategories'
import { useAuth } from '@/hooks/useAuth'
import { IngredientSafetySheet } from '@/components/shop/IngredientSafetySheet'

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

// ── Icon map for placeholder products ─────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  droplets: Droplets,
  shield: Shield,
  sparkles: Sparkles,
  wind: Wind,
  leaf: Leaf,
  heart: Heart,
  zap: Zap,
  salad: Salad,
  utensils: UtensilsCrossed,
  flame: Flame,
  soup: Soup,
}

// ── Types ──────────────────────────────────────────────────────────────────

interface UserReview extends ProductReview {
  productId: string
  isUserReview: true
}

// ── localStorage helpers ───────────────────────────────────────────────────

const REVIEWS_KEY = 'ludia_reviews_v1'

function loadUserReviews(productId: string): UserReview[] {
  if (typeof window === 'undefined') return []
  try {
    const s = localStorage.getItem(REVIEWS_KEY)
    if (!s) return []
    return (JSON.parse(s) as UserReview[]).filter(r => r.productId === productId)
  } catch { return [] }
}

function persistReview(review: UserReview) {
  if (typeof window === 'undefined') return
  try {
    const s = localStorage.getItem(REVIEWS_KEY)
    const all: UserReview[] = s ? JSON.parse(s) : []
    localStorage.setItem(REVIEWS_KEY, JSON.stringify([review, ...all]))
  } catch {}
}

function removeReview(reviewId: string) {
  if (typeof window === 'undefined') return
  try {
    const s = localStorage.getItem(REVIEWS_KEY)
    if (!s) return
    const all: UserReview[] = JSON.parse(s)
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(all.filter(r => r.id !== reviewId)))
  } catch {}
}

// ── Image compression ──────────────────────────────────────────────────────

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new window.Image()
      img.onload = () => {
        const MAX = 900
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.78))
      }
      img.onerror = reject
      img.src = e.target!.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ── Helpers ────────────────────────────────────────────────────────────────

function careLabel(id: string) {
  return CARE_CASES.find(c => c.id === id)?.label ?? id
}

function avgRating(reviews: ProductReview[]) {
  if (!reviews.length) return 0
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
}

function getAgeGroup(birthdate: string): string {
  if (!birthdate) return ''
  const age = new Date().getFullYear() - new Date(birthdate).getFullYear()
  const decade = Math.floor(age / 10) * 10
  const sub = age % 10 < 4 ? '초반' : age % 10 < 7 ? '중반' : '후반'
  return `${decade}대 ${sub}`
}

// ── PlaceholderImage ───────────────────────────────────────────────────────

function PlaceholderImage({
  icon,
  from,
  to,
  iconSize = 44,
}: {
  icon: string
  from: string
  to: string
  iconSize?: number
}) {
  const Icon = ICON_MAP[icon] ?? Droplets
  return (
    <div className="w-full h-full flex items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
      <Icon size={iconSize} color="rgba(255,255,255,0.78)" strokeWidth={1.4} />
    </div>
  )
}

// ── ProductImage (real or placeholder) ────────────────────────────────────

function ProductImage({
  product,
  fill = false,
  iconSize,
  className = '',
}: {
  product: ShopProduct
  fill?: boolean
  iconSize?: number
  className?: string
}) {
  if (product.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`${BASE}${product.image}`}
        alt={product.name}
        className={`w-full h-full object-contain ${className}`}
      />
    )
  }
  if (product.placeholderGradient && product.placeholderEmoji) {
    return (
      <div className="w-full h-full flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${product.placeholderGradient.from}, ${product.placeholderGradient.to})` }}>
        <span style={{ fontSize: Math.round((iconSize ?? 44) * 1.1) }} className="leading-none drop-shadow-sm">{product.placeholderEmoji}</span>
      </div>
    )
  }
  if (product.placeholderGradient && product.placeholderIcon) {
    return (
      <PlaceholderImage
        icon={product.placeholderIcon}
        from={product.placeholderGradient.from}
        to={product.placeholderGradient.to}
        iconSize={iconSize}
      />
    )
  }
  return <div className="w-full h-full bg-slate-100" />
}

// ── StarRow ────────────────────────────────────────────────────────────────

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={size}
          className={n <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'} />
      ))}
    </span>
  )
}

// ── StarPicker ─────────────────────────────────────────────────────────────

function StarPicker({ rating, onChange }: { rating: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-3 justify-center">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className="transition-transform active:scale-90">
          <Star size={34}
            className={n <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'} />
        </button>
      ))}
    </div>
  )
}

// ── LudiaTags ─────────────────────────────────────────────────────────────

function LudiaTags({ tags }: { tags: string[] }) {
  if (!tags.length) return null
  return (
    <div className="rounded-2xl p-4"
      style={{
        background: 'linear-gradient(135deg, rgba(244,63,117,0.03), rgba(99,102,241,0.05))',
        border: '1px solid rgba(244,63,117,0.12)',
      }}>
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(244,63,117,0.1)', color: '#f43f75' }}>
          LUDIA AI
        </span>
        <span className="text-xs text-slate-400 font-medium">이 제품을 분석했어요</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span key={tag}
            className="text-[12px] font-medium px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(15,23,42,0.05)', color: '#334155' }}>
            <span style={{ color: '#f43f75' }}>#</span>{tag}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── ReviewCard ─────────────────────────────────────────────────────────────

function ReviewCard({
  review,
  onDelete,
}: {
  review: ProductReview | UserReview
  onDelete?: () => void
}) {
  const tags = review.careTypes.slice(0, 2).map(careLabel)
  const isUser = 'isUserReview' in review
  const photos = review.photos ?? []

  return (
    <div className="rounded-2xl p-4 space-y-2.5"
      style={{
        background: 'rgba(255,255,255,0.7)',
        border: `1px solid ${isUser ? 'rgba(244,63,117,0.18)' : 'rgba(244,63,117,0.08)'}`,
      }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          {isUser && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(244,63,117,0.12)', color: '#f43f75' }}>
              내 리뷰
            </span>
          )}
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
            style={{ background: 'rgba(244,63,117,0.08)', color: '#f43f75' }}>
            {review.ageGroup}
          </span>
          {tags.map(t => (
            <span key={t} className="text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(100,116,139,0.08)', color: '#64748b' }}>
              {t}
            </span>
          ))}
        </div>
        {onDelete && (
          <button onClick={onDelete}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-colors active:bg-rose-50">
            <Trash2 size={13} className="text-slate-300" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <StarRow rating={review.rating} size={13} />
        <span className="text-[11px] text-slate-300">{review.date.slice(0, 7)}</span>
      </div>

      <p className="text-[13px] text-slate-600 leading-relaxed">{review.body}</p>

      {photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {photos.map((src, i) => (
            <div key={i} className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400 font-medium">{review.nickname}</p>
    </div>
  )
}

// ── WriteReviewSheet ───────────────────────────────────────────────────────

function WriteReviewSheet({
  product,
  onClose,
  onSubmit,
}: {
  product: ShopProduct
  onClose: () => void
  onSubmit: (r: UserReview) => void
}) {
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const userCareTypes = user?.careTypes ?? []
  const ageGroup = user?.birthdate ? getAgeGroup(user.birthdate) : ''
  const availableCares = userCareTypes.length > 0
    ? userCareTypes
    : CARE_CASES.slice(0, 6).map(c => c.id)

  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [selectedCares, setSelectedCares] = useState<string[]>(userCareTypes.slice(0, 2))
  const [compressing, setCompressing] = useState(false)

  function toggleCare(id: string) {
    setSelectedCares(prev =>
      prev.includes(id)
        ? prev.filter(c => c !== id)
        : prev.length < 2 ? [...prev, id] : prev
    )
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return
    const toAdd = Array.from(files).slice(0, 3 - photos.length)
    if (!toAdd.length) return
    setCompressing(true)
    try {
      const compressed = await Promise.all(toAdd.map(compressImage))
      setPhotos(prev => [...prev, ...compressed])
    } finally {
      setCompressing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function handleSubmit() {
    if (!canSubmit) return
    const review: UserReview = {
      id: `user_${Date.now()}`,
      productId: product.id,
      isUserReview: true,
      nickname: user?.nickname ? `${user.nickname.slice(0, 1)}**` : '익명',
      ageGroup: ageGroup || '비공개',
      careTypes: selectedCares,
      rating,
      body: body.trim(),
      date: new Date().toISOString().slice(0, 10),
      photos,
    }
    onSubmit(review)
  }

  const canSubmit = rating > 0 && body.trim().length >= 1 && !compressing
  const ratingLabel = ['', '별로예요', '아쉬워요', '보통이에요', '좋아요', '최고예요!'][rating]

  return (
    <>
      <div className="fixed inset-0 z-[60]"
        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}
        onClick={onClose} />

      <div className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-3xl overflow-hidden flex flex-col"
        style={{
          maxHeight: '90dvh',
          background: 'rgba(253,248,246,0.99)',
          boxShadow: '0 -8px 48px rgba(158,18,57,0.15)',
        }}>

        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <h3 className="font-display text-lg font-bold text-slate-800">리뷰 쓰기</h3>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.06)' }}>
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-6 space-y-5">
          {/* product mini-header */}
          <div className="flex items-center gap-3 py-1">
            <div className="relative w-12 h-12 rounded-2xl overflow-hidden shrink-0"
              style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
              <ProductImage product={product} fill iconSize={22} className="p-1" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold tracking-wide">{product.brand}</p>
              <p className="text-sm font-bold text-slate-700">{product.name}</p>
            </div>
          </div>

          {/* star rating */}
          <div className="text-center space-y-3">
            <p className="text-xs font-semibold text-slate-500">별점을 선택해주세요</p>
            <StarPicker rating={rating} onChange={setRating} />
            <p className="text-sm font-semibold text-amber-500 h-4">{ratingLabel}</p>
          </div>

          {/* care concerns */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500">
              해당하는 고민 선택
              <span className="text-slate-300 ml-1 font-normal">(최대 2개)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {availableCares.map(id => {
                const on = selectedCares.includes(id)
                return (
                  <button key={id} type="button" onClick={() => toggleCare(id)}
                    className="text-xs font-medium px-3 py-1.5 rounded-full transition-all"
                    style={{
                      background: on ? 'rgba(244,63,117,0.1)' : 'rgba(100,116,139,0.07)',
                      color: on ? '#f43f75' : '#64748b',
                      border: `1px solid ${on ? 'rgba(244,63,117,0.25)' : 'transparent'}`,
                    }}>
                    {careLabel(id)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* photos */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500">
              사진 추가
              <span className="text-slate-300 ml-1 font-normal">({photos.length}/3)</span>
            </p>
            <div className="flex gap-2 flex-wrap">
              {photos.map((src, i) => (
                <div key={i} className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0"
                  style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.55)' }}>
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ))}
              {photos.length < 3 && (
                <button type="button" onClick={() => fileRef.current?.click()}
                  disabled={compressing}
                  className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 shrink-0 disabled:opacity-50"
                  style={{
                    background: 'rgba(100,116,139,0.06)',
                    border: '1.5px dashed rgba(100,116,139,0.22)',
                  }}>
                  <ImagePlus size={18} className="text-slate-300" />
                  <span className="text-[10px] text-slate-300">
                    {compressing ? '처리 중…' : '사진 추가'}
                  </span>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => handleFiles(e.target.files)} />
          </div>

          {/* body */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500">후기 작성</p>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="솔직한 사용 후기를 남겨주세요."
              rows={4}
              className="w-full rounded-2xl px-4 py-3 text-sm text-slate-700 placeholder-slate-300 outline-none resize-none"
              style={{
                background: 'rgba(253,248,246,0.9)',
                border: '1.5px solid rgba(244,63,117,0.15)',
              }}
              onFocus={e => (e.currentTarget.style.border = '1.5px solid rgba(244,63,117,0.4)')}
              onBlur={e  => (e.currentTarget.style.border = '1.5px solid rgba(244,63,117,0.15)')}
            />
          </div>
        </div>

        <div className="shrink-0 px-5 py-4 border-t border-slate-100"
          style={{ background: 'rgba(253,248,246,0.99)' }}>
          <button onClick={handleSubmit} disabled={!canSubmit}
            className="w-full py-4 rounded-2xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #f43f75, #e11d5a)',
              boxShadow: canSubmit ? '0 4px 20px rgba(244,63,117,0.4)' : 'none',
            }}>
            등록하기
          </button>
        </div>
      </div>
    </>
  )
}

// ── ProductDetailSheet ─────────────────────────────────────────────────────

function ProductDetailSheet({ product, onClose }: { product: ShopProduct; onClose: () => void }) {
  const [userReviews, setUserReviews] = useState<UserReview[]>([])
  const [showWriteReview, setShowWriteReview] = useState(false)
  const catMeta = CATEGORY_META[product.category]

  useEffect(() => {
    setUserReviews(loadUserReviews(product.id))
  }, [product.id])

  const allReviews: ProductReview[] = [...userReviews, ...product.reviews]
  const avg = avgRating(allReviews)

  function handleSubmit(review: UserReview) {
    persistReview(review)
    setUserReviews(loadUserReviews(product.id))
    setShowWriteReview(false)
  }

  function handleDelete(reviewId: string) {
    removeReview(reviewId)
    setUserReviews(loadUserReviews(product.id))
  }

  return (
    <>
      <div className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
        onClick={onClose} />

      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden flex flex-col"
        style={{
          maxHeight: '92dvh',
          background: 'rgba(253,248,246,0.98)',
          boxShadow: '0 -8px 48px rgba(158,18,57,0.12)',
        }}>

        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.06)' }}>
          <X size={16} className="text-slate-500" />
        </button>

        <div className="overflow-y-auto flex-1 pb-8">

          {/* product image */}
          <div className="flex justify-center py-6 px-8">
            <div className="relative w-44 h-44 rounded-3xl overflow-hidden"
              style={{ background: product.image ? '#fff' : undefined, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
              <ProductImage product={product} fill iconSize={72} className="p-3" />
            </div>
          </div>

          <div className="px-5 space-y-5">

            {/* header */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-semibold text-slate-400 tracking-widest uppercase">
                  {product.brand}
                </p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: catMeta.bgColor, color: catMeta.primaryColor }}>
                  {catMeta.subtitle}
                </span>
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-800">{product.name}</h2>
              <p className="text-sm text-slate-500 mt-0.5">{product.tagline}</p>
              {product.sample && (
                <p className="mt-1.5 inline-block text-[10.5px] font-semibold text-amber-700 bg-amber-50 rounded-lg px-2 py-1">
                  아직 판매 전인 예시 상품이에요 · 가격·구성은 바뀔 수 있어요
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <StarRow rating={avg} size={14} />
                <span className="text-sm font-semibold text-slate-700">{avg.toFixed(1)}</span>
                <span className="text-xs text-slate-400">({allReviews.length}개 리뷰)</span>
              </div>
            </div>

            {/* price */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800">
                {product.price.toLocaleString()}원
              </span>
              <span className="text-xs text-slate-400">{product.volume}</span>
            </div>

            {/* LUDIA AI tags */}
            <LudiaTags tags={product.ludiaTags} />

            {/* key benefits */}
            <div className="rounded-2xl p-4 space-y-2"
              style={{ background: 'rgba(244,63,117,0.04)', border: '1px solid rgba(244,63,117,0.1)' }}>
              <p className="text-xs font-bold text-rose-400 tracking-wide uppercase mb-1">Key Benefits</p>
              {product.keyBenefits.map(b => (
                <div key={b} className="flex items-start gap-2">
                  <span className="mt-0.5 text-rose-400 shrink-0">·</span>
                  <p className="text-sm text-slate-600">{b}</p>
                </div>
              ))}
            </div>

            {/* description */}
            <div>
              <p className="text-xs font-bold text-slate-500 tracking-wide uppercase mb-2">제품 설명</p>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>

            {/* how to use */}
            <div className="rounded-2xl p-4"
              style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)' }}>
              <p className="text-xs font-bold text-indigo-400 tracking-wide uppercase mb-1.5">사용 방법</p>
              <p className="text-sm text-slate-600 leading-relaxed">{product.howToUse}</p>
            </div>

            <div className="border-t border-slate-100" />

            {/* reviews */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-700">
                    리뷰 <span className="text-rose-400">{allReviews.length}</span>
                  </p>
                  <div className="flex items-center gap-1">
                    <StarRow rating={avg} size={12} />
                    <span className="text-xs font-semibold text-slate-600">{avg.toFixed(1)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowWriteReview(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all active:scale-95"
                  style={{ background: 'rgba(244,63,117,0.09)', color: '#f43f75' }}>
                  <PenLine size={12} />
                  리뷰 쓰기
                </button>
              </div>

              <div className="space-y-3">
                {allReviews.map(r => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    onDelete={'isUserReview' in r ? () => handleDelete(r.id) : undefined}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="shrink-0 px-5 py-4 border-t border-slate-100"
          style={{ background: 'rgba(253,248,246,0.98)' }}>
          <button className="w-full py-4 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #f43f75, #e11d5a)',
              boxShadow: '0 4px 20px rgba(244,63,117,0.4)',
            }}>
            <ShoppingBag size={16} />
            구매하기
          </button>
        </div>
      </div>

      {showWriteReview && (
        <WriteReviewSheet
          product={product}
          onClose={() => setShowWriteReview(false)}
          onSubmit={handleSubmit}
        />
      )}
    </>
  )
}

// ── ProductCard ────────────────────────────────────────────────────────────

function ProductCard({ product, onTap }: { product: ShopProduct; onTap: () => void }) {
  const avg = avgRating(product.reviews)
  const catMeta = CATEGORY_META[product.category]

  return (
    <button onClick={onTap}
      className="w-full text-left rounded-3xl overflow-hidden transition-all active:scale-[0.98]"
      style={{
        background: 'rgba(255,255,255,0.85)',
        border: '1px solid rgba(244,63,117,0.1)',
        boxShadow: '0 4px 24px rgba(158,18,57,0.06)',
      }}>

      {/* image */}
      <div className="relative w-full aspect-square overflow-hidden"
        style={{ background: product.image ? 'linear-gradient(135deg, #fff5f7, #fff)' : undefined }}>
        <ProductImage product={product} fill iconSize={52} className="p-8" />
        {/* brand badge */}
        <span className="absolute top-3 left-3 text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.88)', color: catMeta.primaryColor }}>
          {product.brand}
        </span>
        {product.originalPrice && product.originalPrice > product.price && (
          <span className="absolute top-3 right-3 text-[10px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ background: '#e11d48' }}>
            {Math.round((1 - product.price / product.originalPrice) * 100)}%
          </span>
        )}
      </div>

      {/* info */}
      <div className="p-3.5">
        <p className="font-display text-[15px] font-bold text-slate-800 leading-snug">{product.name}</p>
        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">{product.tagline}</p>

        <div className="flex items-center justify-between mt-2.5">
          <div className="flex items-center gap-1">
            <StarRow rating={avg} size={11} />
            <span className="text-[11px] text-slate-400">({product.reviews.length})</span>
          </div>
          <span className="text-sm font-bold text-slate-800">
            {product.price.toLocaleString()}원
          </span>
        </div>
      </div>
    </button>
  )
}

// ── 광고 배너 ─────────────────────────────────────────────────────────────

function AdCarousel({ ads, onGo }: { ads: ShopAd[]; onGo: (ad: ShopAd) => void }) {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused || ads.length < 2) return
    const t = setInterval(() => setIdx(i => (i + 1) % ads.length), 4500)
    return () => clearInterval(t)
  }, [paused, ads.length])
  const touchX = useRef<number | null>(null)

  return (
    <div className="relative rounded-3xl overflow-hidden mb-4 select-none"
      onTouchStart={e => { touchX.current = e.touches[0].clientX; setPaused(true) }}
      onTouchEnd={e => {
        const start = touchX.current
        touchX.current = null
        setPaused(false)
        if (start === null) return
        const dx = e.changedTouches[0].clientX - start
        if (Math.abs(dx) > 40) setIdx(i => (i + (dx < 0 ? 1 : ads.length - 1)) % ads.length)
      }}>
      <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${idx * 100}%)` }}>
        {ads.map(ad => (
          <button key={ad.id} onClick={() => onGo(ad)}
            className="w-full flex-shrink-0 text-left p-5 min-h-[150px] flex items-center gap-3 text-white"
            style={{ background: ad.gradient }}>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold opacity-85">{ad.eyebrow}</p>
              <p className="mt-1 text-[19px] font-black leading-snug whitespace-pre-line">{ad.title}</p>
              <p className="mt-1 text-[11.5px] opacity-85">{ad.sub}</p>
              <span className="mt-3 inline-flex items-center gap-0.5 text-[11.5px] font-bold px-3 py-1.5 rounded-full bg-white/25">
                {ad.cta} <ChevronRight size={13} />
              </span>
            </div>
            <span className="text-[64px] leading-none drop-shadow-lg flex-shrink-0">{ad.emoji}</span>
          </button>
        ))}
      </div>
      <span className="absolute top-3 right-3 text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-black/20 text-white/90">AD</span>
      <span className="absolute bottom-3 right-4 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-black/25 text-white">
        {idx + 1} / {ads.length}
      </span>
    </div>
  )
}

// ── 전체 메뉴 (쇼핑몰 카테고리) ──────────────────────────────────────────

function CategoryMenu({ onClose, onPick, onPickConcern, onIngredient }: {
  onClose: () => void
  onPick: (dept: string, sub: string | null) => void
  onPickConcern: (c: ProductCategory) => void
  onIngredient: () => void
}) {
  const [active, setActive] = useState<string>(SHOP_DEPTS[0].id)
  const dept = findDept(active)
  const count = (sub: string) => SHOP_PRODUCTS.filter(p => productSub(p) === sub).length

  return (
    <div className="fixed inset-0 z-[60] flex" style={{ background: 'rgba(15,23,42,0.45)' }} onClick={onClose}>
      <div className="w-full max-w-md h-full bg-white flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
          <p className="text-[16px] font-black text-slate-800">전체 카테고리</p>
          <button onClick={onClose} aria-label="닫기" className="p-1.5 rounded-full hover:bg-slate-100"><X size={20} className="text-slate-500" /></button>
        </div>
        <div className="flex-1 flex min-h-0">
          <div className="w-[112px] flex-shrink-0 bg-slate-50 overflow-y-auto">
            {[...SHOP_DEPTS.map(d => ({ id: d.id, label: d.label, emoji: d.emoji })), { id: 'concern', label: '고민별', emoji: '💗' }].map(d => {
              const on = d.id === active
              return (
                <button key={d.id} onClick={() => setActive(d.id)}
                  className="w-full flex flex-col items-center gap-1 py-3.5 text-[12px] font-bold border-l-[3px] transition-colors"
                  style={on ? { background: '#fff', color: '#e11d48', borderColor: '#e11d48' } : { color: '#64748b', borderColor: 'transparent' }}>
                  <span className="text-[20px] leading-none">{d.emoji}</span>{d.label}
                </button>
              )
            })}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {dept ? (
              <>
                <button onClick={() => onPick(dept.id, null)}
                  className="w-full flex items-center justify-between mb-3 px-3.5 py-3 rounded-2xl text-[13.5px] font-black"
                  style={{ background: dept.bg, color: dept.color }}>
                  {dept.emoji} {dept.label} 전체 보기 <ChevronRight size={16} />
                </button>
                <div className="grid grid-cols-2 gap-2">
                  {dept.subs.map(s => (
                    <button key={s.id} onClick={() => onPick(dept.id, s.id)}
                      className="flex flex-col items-center gap-1.5 py-4 rounded-2xl border border-slate-100 hover:border-rose-200 active:scale-95 transition-all">
                      <span className="w-12 h-12 rounded-full flex items-center justify-center text-[24px]" style={{ background: dept.bg }}>{s.emoji}</span>
                      <span className="text-[12.5px] font-bold text-slate-700">{s.label}</span>
                      <span className="text-[10.5px] text-slate-400">{count(s.id)}개</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-[11.5px] text-slate-400 mb-1">내 몸 고민에 맞춰 골라 봐요</p>
                {(Object.keys(CATEGORY_META) as ProductCategory[]).map(c => (
                  <button key={c} onClick={() => onPickConcern(c)}
                    className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-[13px] font-bold"
                    style={{ background: CATEGORY_META[c].bgColor, color: CATEGORY_META[c].primaryColor }}>
                    {CATEGORY_META[c].label}
                    <span className="text-[11px] font-semibold opacity-70">{SHOP_PRODUCTS.filter(p => p.category === c).length}개 <ChevronRight size={13} className="inline" /></span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <button onClick={onIngredient}
          className="flex items-center gap-2 px-4 py-3.5 border-t border-slate-100 text-[12.5px] font-bold text-slate-600">
          <ShieldCheck size={16} className="text-rose-400" /> 안심 성분 검색 — 내 제품 성분 확인하기
          <ChevronRight size={14} className="ml-auto text-slate-300" />
        </button>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ShopPage() {
  const [selected, setSelected] = useState<ShopProduct | null>(null)
  // 쇼핑몰 분류: 큰 분류 · 세부 분류 · 고민별
  const [deptId, setDeptId] = useState<string | null>(null)
  const [subId, setSubId] = useState<string | null>(null)
  const [concern, setConcern] = useState<ProductCategory | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [query, setQuery] = useState('')
  const [showIngredientSearch, setShowIngredientSearch] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // 다른 페이지(예: 루디아 헬스 식단 분석)에서 특정 상품으로 바로 연결
  useEffect(() => {
    try {
      const id = new URLSearchParams(window.location.search).get('product')
      if (!id) return
      const product = SHOP_PRODUCTS.find(p => p.id === id)
      if (product) {
        setSelected(product)
        setDeptId(productDept(product)?.id ?? null)
      }
    } catch {}
  }, [])

  function pick(dept: string | null, sub: string | null = null) {
    setDeptId(dept); setSubId(sub); setConcern(null); setShowMenu(false); setQuery('')
    window.scrollTo(0, 0)
  }
  function pickConcern(c: ProductCategory | null) {
    setConcern(c); setDeptId(null); setSubId(null); setShowMenu(false); setQuery('')
    window.scrollTo(0, 0)
  }
  function goAd(ad: ShopAd) {
    if ('product' in ad.to) {
      const p = SHOP_PRODUCTS.find(x => x.id === (ad.to as { product: string }).product)
      if (p) setSelected(p)
    } else pick(ad.to.dept, ad.to.sub ?? null)
  }

  const dept = findDept(deptId)
  const sub = dept?.subs.find(s => s.id === subId) ?? null
  const isHome = !dept && !concern

  const q = query.toLowerCase().trim()
  const byCategory = SHOP_PRODUCTS
    .filter(p => !concern || p.category === concern)
    .filter(p => !dept || productDept(p)?.id === dept.id)
    .filter(p => !sub || productSub(p) === sub.id)
  const visible = q === ''
    ? byCategory
    : SHOP_PRODUCTS.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.ludiaTags.some(t => t.toLowerCase().replace(/_/g, ' ').includes(q))
      )
  const title = sub ? sub.label : dept ? dept.label : concern ? CATEGORY_META[concern].label : '전체 상품'

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => setShowMenu(true)} aria-label="전체 카테고리"
          className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/80 border border-rose-100 shadow-sm active:scale-95 shrink-0">
          <Menu className="w-5 h-5 text-slate-700" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl font-semibold text-slate-800 leading-tight">루디아샵</h1>
        </div>
        <Link href="/settings" aria-label="설정"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-slate-500 bg-white/80 border border-rose-100 shadow-sm transition-all hover:text-rose-500 hover:border-rose-200 active:scale-95 shrink-0">
          <Settings className="w-4 h-4" />
          설정
        </Link>
      </div>
      {/* search bar */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="제품명, 브랜드, 고민 키워드 검색"
          className="w-full pl-10 pr-10 py-3 rounded-2xl text-sm text-slate-700 placeholder-slate-300 outline-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.8)',
            border: '1.5px solid rgba(244,63,117,0.12)',
            boxShadow: '0 2px 12px rgba(158,18,57,0.04)',
          }}
          onFocus={e => (e.currentTarget.style.border = '1.5px solid rgba(244,63,117,0.38)')}
          onBlur={e  => (e.currentTarget.style.border = '1.5px solid rgba(244,63,117,0.12)')}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); searchRef.current?.focus() }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(100,116,139,0.1)' }}>
            <X size={12} className="text-slate-400" />
          </button>
        )}
      </div>

      {q === '' && isHome && (
        <>
          <AdCarousel ads={SHOP_ADS} onGo={goAd} />
          <div className="grid grid-cols-4 gap-y-3 gap-x-2 mb-5">
            {SHOP_DEPTS.map(d => (
              <button key={d.id} onClick={() => pick(d.id)} className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
                <span className="w-14 h-14 rounded-2xl flex items-center justify-center text-[26px] shadow-sm" style={{ background: d.bg }}>{d.emoji}</span>
                <span className="text-[11.5px] font-bold text-slate-600">{d.label}</span>
              </button>
            ))}
            <button onClick={() => pickConcern('rhythm_balance')} className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
              <span className="w-14 h-14 rounded-2xl flex items-center justify-center text-[26px] shadow-sm" style={{ background: '#fff1f5' }}>💗</span>
              <span className="text-[11.5px] font-bold text-slate-600">고민별</span>
            </button>
            <button onClick={() => setShowMenu(true)} className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
              <span className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm bg-slate-100"><Menu className="w-6 h-6 text-slate-500" /></span>
              <span className="text-[11.5px] font-bold text-slate-600">전체 메뉴</span>
            </button>
          </div>
        </>
      )}

      {q === '' && !isHome && (
        <div className="mb-2">
          <div className="flex items-center gap-1 text-[12px] font-semibold text-slate-400 mb-2">
            <button onClick={() => sub ? pick(dept!.id) : pick(null)} aria-label="뒤로" className="p-1 -ml-1 rounded-full hover:bg-white">
              <ChevronLeft size={18} className="text-slate-600" />
            </button>
            <button onClick={() => pick(null)}>홈</button>
            <ChevronRight size={12} />
            {dept ? (
              <>
                <button onClick={() => pick(dept.id)} className={sub ? '' : 'text-slate-800 font-black text-[15px]'}>{dept.emoji} {dept.label}</button>
                {sub && <><ChevronRight size={12} /><span className="text-slate-800 font-black text-[15px]">{sub.label}</span></>}
              </>
            ) : concern && <span className="text-slate-800 font-black text-[15px]">💗 고민별</span>}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-4 px-4 scrollbar-hide">
            {dept ? (
              [{ id: null as string | null, label: '전체', emoji: '' }, ...dept.subs].map(s => {
                const on = s.id === subId
                return (
                  <button key={s.id ?? 'all'} onClick={() => pick(dept.id, s.id)}
                    className="shrink-0 text-xs font-semibold px-3.5 py-2 rounded-full transition-all"
                    style={on ? { background: dept.color, color: '#fff' } : { background: 'rgba(255,255,255,0.85)', color: '#64748b', border: '1px solid rgba(100,116,139,0.12)' }}>
                    {s.emoji && <span className="mr-0.5">{s.emoji}</span>}{s.label}
                  </button>
                )
              })
            ) : (
              (Object.keys(CATEGORY_META) as ProductCategory[]).map(c => {
                const on = c === concern
                const m = CATEGORY_META[c]
                return (
                  <button key={c} onClick={() => pickConcern(c)}
                    className="shrink-0 text-xs font-semibold px-3.5 py-2 rounded-full transition-all"
                    style={on ? { background: m.primaryColor, color: '#fff' } : { background: 'rgba(255,255,255,0.85)', color: '#64748b', border: '1px solid rgba(100,116,139,0.12)' }}>
                    {m.label}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      <div className="mt-3 mb-1 flex items-baseline justify-between">
        <p className="text-[15px] font-black text-slate-800">{q !== '' ? `'${query.trim()}' 검색 결과` : title}</p>
        <p className="text-xs font-medium text-slate-400">{visible.length}개</p>
      </div>

      {visible.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 mt-2">
          {visible.map((p, i) => (
            <Fragment key={p.id}>
              <ProductCard product={p} onTap={() => setSelected(p)} />
              {/* 홈 목록 중간 광고 */}
              {q === '' && isHome && i === 5 && (
                <button onClick={() => goAd(SHOP_MID_AD)}
                  className="col-span-2 relative flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left text-white"
                  style={{ background: SHOP_MID_AD.gradient }}>
                  <span className="text-[34px] leading-none">{SHOP_MID_AD.emoji}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[10.5px] font-bold opacity-85">{SHOP_MID_AD.eyebrow}</span>
                    <span className="block text-[14.5px] font-black">{SHOP_MID_AD.title}</span>
                    <span className="block text-[11px] opacity-85 truncate">{SHOP_MID_AD.sub}</span>
                  </span>
                  <ChevronRight size={18} />
                  <span className="absolute top-2 right-2.5 text-[8.5px] font-bold px-1 rounded bg-black/20">AD</span>
                </button>
              )}
            </Fragment>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: 'rgba(244,63,117,0.07)' }}>
            <Search size={24} className="text-rose-300" />
          </div>
          <p className="text-sm font-semibold text-slate-500">검색 결과가 없어요</p>
          <p className="text-xs text-slate-300 mt-1">다른 키워드로 검색해 보세요</p>
          <button
            onClick={() => setQuery('')}
            className="mt-4 text-xs font-semibold px-4 py-2 rounded-full"
            style={{ background: 'rgba(244,63,117,0.08)', color: '#f43f75' }}>
            검색 초기화
          </button>
        </div>
      )}

      {showMenu && (
        <CategoryMenu onClose={() => setShowMenu(false)}
          onPick={(d, s) => pick(d, s)}
          onPickConcern={c => pickConcern(c)}
          onIngredient={() => { setShowMenu(false); setShowIngredientSearch(true) }} />
      )}

      {selected && (
        <ProductDetailSheet product={selected} onClose={() => setSelected(null)} />
      )}

      {showIngredientSearch && (
        <IngredientSafetySheet onClose={() => setShowIngredientSearch(false)} />
      )}
    </div>
  )
}
