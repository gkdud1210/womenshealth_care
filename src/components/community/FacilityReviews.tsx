'use client'

// ── 시설 리뷰 ───────────────────────────────────────────────────────────────
//
// 시설 상세 안에서 보여주는 리뷰 영역이에요.
// 사람들이 고른 장점 키워드를 모아 보여주고, 사진·글 리뷰를 쓰고 읽을 수 있어요.

import { useMemo, useRef, useState } from 'react'
import { Camera, PenLine, Star, Trash2, X } from 'lucide-react'
import type { Facility } from '@/data/facilityData'
import {
  MAX_REVIEW_PHOTOS, averageRating, keywordOptions, keywordStats, type FacilityReview,
} from '@/lib/facility-reviews'
import { compressImage } from '@/lib/utils'

const ACCENT = '#e11d5a'
const STAR = '#f59e0b'
const RATING_LABELS = ['', '별로예요', '그저 그래요', '괜찮아요', '좋아요', '최고예요']

/** 읽기 전용 별 (소수점은 반 별까지 채워요) */
export function Stars({ value, size = 12 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-px" aria-label={`별점 ${value}점`}>
      {[1, 2, 3, 4, 5].map(i => {
        const fill = Math.max(0, Math.min(1, value - i + 1))
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star className="absolute inset-0 text-slate-200" style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill >= 0.75 ? 100 : fill >= 0.25 ? 50 : 0}%` }}>
                <Star style={{ width: size, height: size, color: STAR }} fill="currentColor" strokeWidth={0} />
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}

/** 카드에 붙이는 평균 별점 */
export function RatingBadge({ reviews }: { reviews: FacilityReview[] }) {
  const r = useMemo(() => averageRating(reviews), [reviews])
  if (!r) return null
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-slate-700">
      <Star className="w-3 h-3" style={{ color: STAR }} fill="currentColor" strokeWidth={0} />
      {r.avg.toFixed(1)}
    </span>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

/** 카드에 붙이는 상위 키워드 */
export function TopKeywords({ reviews, max = 3 }: { reviews: FacilityReview[]; max?: number }) {
  const top = useMemo(() => keywordStats(reviews).slice(0, max), [reviews, max])
  if (top.length === 0) return null
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {top.map(k => (
        <span key={k.keyword} className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600">
          #{k.keyword} {k.count}
        </span>
      ))}
    </div>
  )
}

// ── 리뷰 쓰기 ──────────────────────────────────────────────────────────────

function ReviewComposer({ facility, onCancel, onSubmit }: {
  facility: Facility
  onCancel: () => void
  onSubmit: (rating: number, text: string, images: string[], keywords: string[]) => boolean
}) {
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [keywords, setKeywords] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const options = useMemo(() => keywordOptions(facility.type), [facility.type])

  const toggle = (k: string) =>
    setKeywords(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_REVIEW_PHOTOS - images.length)
    if (files.length === 0) return
    setUploading(true)
    try {
      // 기기에 저장하니까 대화방 사진보다 작게 줄여요
      const added = await Promise.all(files.map(f => compressImage(f, 800, 0.75)))
      setImages(prev => [...prev, ...added].slice(0, MAX_REVIEW_PHOTOS))
    } finally { setUploading(false); e.target.value = '' }
  }

  const canSubmit = rating > 0
  const submit = () => {
    if (!canSubmit) return
    setError('')
    if (!onSubmit(rating, text.trim(), images, keywords)) {
      setError('저장 공간이 부족해요. 사진을 줄이거나 빼고 다시 올려주세요.')
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 p-3.5 space-y-3">
      <div className="text-center">
        <p className="text-[12px] font-bold text-slate-700 mb-1">이곳은 어땠나요?</p>
        <div className="inline-flex gap-1" role="radiogroup" aria-label="별점">
          {[1, 2, 3, 4, 5].map(i => (
            <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i}점`}
              onClick={() => setRating(i)} className="p-0.5">
              <Star className="w-8 h-8" style={{ color: i <= rating ? STAR : '#e2e8f0' }} fill="currentColor" strokeWidth={0} />
            </button>
          ))}
        </div>
        <p className="text-[11.5px] h-4" style={{ color: rating ? STAR : '#94a3b8' }}>
          {rating ? RATING_LABELS[rating] : '별을 눌러 별점을 남겨주세요'}
        </p>
      </div>

      <div>
        <p className="text-[12px] font-bold text-slate-700 mb-1.5">이곳의 좋은 점을 골라주세요</p>
        <div className="flex flex-wrap gap-1.5">
          {options.map(k => {
            const on = keywords.includes(k)
            return (
              <button key={k} type="button" onClick={() => toggle(k)}
                className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${on ? 'text-white' : 'bg-white text-slate-600 border-slate-200'}`}
                style={on ? { background: ACCENT, borderColor: ACCENT } : undefined}>
                {on ? '✓ ' : ''}{k}
              </button>
            )
          })}
        </div>
      </div>

      <textarea value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={1000}
        placeholder="이용해 본 경험을 자유롭게 남겨주세요 (예: 평일 저녁엔 한산해요)"
        className="w-full text-[13px] rounded-xl border border-slate-200 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-rose-200" />

      <div className="flex items-center gap-2 flex-wrap">
        {images.map((src, i) => (
          <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="w-full h-full object-cover" />
            <button type="button" aria-label="사진 빼기" onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
              className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}
        {images.length < MAX_REVIEW_PHOTOS && (
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-16 h-16 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-[10.5px] gap-0.5">
            <Camera className="w-4 h-4" />
            {uploading ? '올리는 중' : `사진 ${images.length}/${MAX_REVIEW_PHOTOS}`}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      </div>

      {error && <p className="text-[11.5px] text-rose-600">{error}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold bg-slate-100 text-slate-600">취소</button>
        <button type="button" onClick={submit} disabled={!canSubmit || uploading}
          className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-40"
          style={{ background: ACCENT }}>리뷰 올리기</button>
      </div>
    </div>
  )
}

// ── 리뷰 영역 ──────────────────────────────────────────────────────────────

export default function FacilityReviews({ facility, reviews, userId, onAdd, onDelete }: {
  facility: Facility
  reviews: FacilityReview[]
  userId: string
  /** 저장 공간이 모자라면 false */
  onAdd: (rating: number, text: string, images: string[], keywords: string[]) => boolean
  onDelete: (reviewId: string) => void
}) {
  const [writing, setWriting] = useState(false)
  const [viewer, setViewer] = useState<string | null>(null)
  const stats = useMemo(() => keywordStats(reviews), [reviews])
  const avg = useMemo(() => averageRating(reviews), [reviews])
  const maxCount = stats[0]?.count ?? 1

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11.5px] font-bold text-slate-500">리뷰 {reviews.length > 0 && <span className="text-slate-400">{reviews.length}</span>}</p>
        {!writing && (
          <button onClick={() => setWriting(true)}
            className="flex items-center gap-1 text-[12px] font-bold" style={{ color: ACCENT }}>
            <PenLine className="w-3.5 h-3.5" /> 리뷰 쓰기
          </button>
        )}
      </div>

      {avg && (
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-[22px] font-extrabold text-slate-900 leading-none">{avg.avg.toFixed(1)}</span>
          <div>
            <Stars value={avg.avg} size={14} />
            <p className="text-[11px] text-slate-400">별점 {avg.count}개</p>
          </div>
        </div>
      )}

      {stats.length > 0 && (
        <div className="rounded-2xl bg-slate-50 p-3.5 mb-3">
          <p className="text-[11.5px] font-bold text-slate-500 mb-2">이런 점이 좋았어요</p>
          <div className="space-y-1.5">
            {stats.slice(0, 6).map(s => (
              <div key={s.keyword} className="relative h-7 rounded-lg bg-white overflow-hidden">
                <div className="absolute inset-y-0 left-0 rounded-lg" style={{ width: `${(s.count / maxCount) * 100}%`, background: 'rgba(225,29,90,0.12)' }} />
                <div className="relative h-full flex items-center justify-between px-2.5 text-[12px]">
                  <span className="font-semibold text-slate-700">{s.keyword}</span>
                  <span className="font-bold" style={{ color: ACCENT }}>{s.count}</span>
                </div>
              </div>
            ))}
          </div>
          {stats.length > 6 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {stats.slice(6).map(s => (
                <span key={s.keyword} className="text-[11px] px-2 py-0.5 rounded-full bg-white text-slate-500">{s.keyword} {s.count}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {writing && (
        <div className="mb-3">
          <ReviewComposer facility={facility} onCancel={() => setWriting(false)}
            onSubmit={(rating, text, images, keywords) => {
              const ok = onAdd(rating, text, images, keywords)
              if (ok) setWriting(false)
              return ok
            }} />
        </div>
      )}

      {reviews.length === 0 && !writing ? (
        <p className="text-[12px] text-slate-400 bg-slate-50 rounded-xl px-3 py-3 text-center">
          아직 리뷰가 없어요. 다녀오셨다면 첫 리뷰를 남겨주세요!
        </p>
      ) : (
        <ul className="space-y-3">
          {reviews.map(r => (
            <li key={r.id} className="border-b border-slate-100 pb-3 last:border-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[12.5px] font-bold text-slate-800">{r.authorName}
                  <span className="ml-1.5 text-[11px] font-normal text-slate-400">{formatDate(r.createdAt)}</span>
                </p>
                {r.authorId === userId && (
                  <button onClick={() => { if (confirm('이 리뷰를 지울까요?')) onDelete(r.id) }}
                    aria-label="리뷰 지우기" className="p-1 text-slate-300 hover:text-slate-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {typeof r.rating === 'number' && <div className="mb-1"><Stars value={r.rating} /></div>}
              {r.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {r.keywords.map(k => (
                    <span key={k} className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600">#{k}</span>
                  ))}
                </div>
              )}
              {r.images.length > 0 && (
                <div className="flex gap-1.5 mb-1.5">
                  {r.images.map((src, i) => (
                    <button key={i} onClick={() => setViewer(src)} className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              {r.text && <p className="text-[12.5px] text-slate-600 leading-relaxed whitespace-pre-wrap">{r.text}</p>}
            </li>
          ))}
        </ul>
      )}

      {viewer && (
        <div className="fixed inset-0 z-[80] bg-black/85 flex items-center justify-center p-4" onClick={() => setViewer(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewer} alt="" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
    </div>
  )
}
