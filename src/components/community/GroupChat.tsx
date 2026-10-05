'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft, Camera, Send, Users, X } from 'lucide-react'
import { CATEGORY_META, type MeetupGroup } from '@/data/meetupData'
import type { ChatMessage } from '@/lib/meetup-chat'
import { cn, compressImage } from '@/lib/utils'

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
}

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
}

function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

/** 같은 사람이 같은 분에 연달아 보낸 메시지는 이름·시간을 한 번만 보여줘요. */
function sameBurst(a: ChatMessage | undefined, b: ChatMessage | undefined) {
  if (!a || !b || a.system || b.system) return false
  return a.authorId === b.authorId && sameDay(a.createdAt, b.createdAt) &&
    Math.abs(new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) < 60_000
}

export default function GroupChat({ group, messages, currentUserId, onBack, onSend }: {
  group: MeetupGroup
  messages: ChatMessage[]
  currentUserId: string
  onBack: () => void
  onSend: (text: string, image: string | undefined) => void
}) {
  const meta = CATEGORY_META[group.category]
  const [text, setText] = useState('')
  const [image, setImage] = useState<string | undefined>()
  const [uploading, setUploading] = useState(false)
  const [viewing, setViewing] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // 새 메시지가 오면 맨 아래로
  useLayoutEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length])

  // 입력창 높이 자동 조절 (최대 5줄 정도)
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [text])

  const canSend = text.trim().length > 0 || !!image

  function send() {
    if (!canSend) return
    onSend(text.trim(), image)
    setText('')
    setImage(undefined)
    inputRef.current?.focus()
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try { setImage(await compressImage(file, 720, 0.75)) } finally { setUploading(false); e.target.value = '' }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#f6f3f7' }}>
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 flex-shrink-0">
        <button onClick={onBack} className="p-1"><ArrowLeft className="w-5 h-5 text-slate-700" /></button>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: meta.gradient }}>
          {meta.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14.5px] font-bold text-slate-900 truncate">{group.name}</p>
          <p className="flex items-center gap-1 text-[11px] text-slate-400">
            <Users className="w-3 h-3" /> 멤버 {group.memberIds.length}명 · 참여 멤버만 볼 수 있어요
          </p>
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3">
        <div className="max-w-lg mx-auto">
          {messages.map((m, i) => {
            const prev = messages[i - 1]
            const next = messages[i + 1]
            const showDay = !prev || !sameDay(prev.createdAt, m.createdAt)
            const dayDivider = showDay && (
              <div className="flex justify-center my-3">
                <span className="text-[10.5px] text-slate-500 bg-white/80 px-3 py-1 rounded-full">{dayLabel(m.createdAt)}</span>
              </div>
            )

            if (m.system) {
              return (
                <div key={m.id}>
                  {dayDivider}
                  <p className="text-center text-[11px] text-slate-400 my-2">{m.text}</p>
                </div>
              )
            }

            const mine = m.authorId === currentUserId
            const firstOfBurst = showDay || !sameBurst(prev, m)
            const lastOfBurst = !sameBurst(m, next)

            return (
              <div key={m.id}>
                {dayDivider}
                <div className={cn('flex gap-2', mine ? 'justify-end' : 'justify-start', firstOfBurst ? 'mt-2.5' : 'mt-1')}>
                  {!mine && (
                    <div className="w-8 flex-shrink-0">
                      {firstOfBurst && (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-base bg-white shadow-sm">{m.authorEmoji}</div>
                      )}
                    </div>
                  )}
                  <div className={cn('flex flex-col max-w-[75%]', mine ? 'items-end' : 'items-start')}>
                    {!mine && firstOfBurst && (
                      <p className="text-[11.5px] font-semibold text-slate-600 mb-1 px-0.5">
                        {m.authorName}{m.authorId === group.createdBy && <span className="ml-1 text-[10px] text-rose-400">방장</span>}
                      </p>
                    )}
                    <div className={cn('flex items-end gap-1.5', mine && 'flex-row-reverse')}>
                      <div className="flex flex-col gap-1">
                        {m.image && (
                          <button onClick={() => setViewing(m.image!)} className="block rounded-2xl overflow-hidden bg-slate-200 max-w-[220px]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={m.image} alt="" className="w-full h-auto object-cover" />
                          </button>
                        )}
                        {m.text && (
                          <div className={cn('px-3.5 py-2 text-[14px] leading-relaxed whitespace-pre-wrap break-words',
                            mine ? 'rounded-2xl rounded-tr-md text-white' : 'rounded-2xl rounded-tl-md bg-white text-slate-800 shadow-sm')}
                            style={mine ? { background: 'linear-gradient(135deg,#f43f75,#e11d5a)' } : undefined}>
                            {m.text}
                          </div>
                        )}
                      </div>
                      {lastOfBurst && <span className="text-[10px] text-slate-400 flex-shrink-0 pb-0.5">{timeLabel(m.createdAt)}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-white border-t border-slate-100 flex-shrink-0 pb-[env(safe-area-inset-bottom)]">
        {image && (
          <div className="max-w-lg mx-auto px-3 pt-2">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setImage(undefined)} className="absolute top-1 right-1 w-5 h-5 bg-black/55 rounded-full flex items-center justify-center">
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          </div>
        )}
        <div className="max-w-lg mx-auto flex items-end gap-2 px-3 py-2">
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-slate-400 hover:bg-slate-50">
            {uploading
              ? <div className="w-4 h-4 rounded-full border-2 border-rose-200 border-t-rose-500 animate-spin" />
              : <Camera className="w-5 h-5" />}
          </button>
          <textarea ref={inputRef} value={text} rows={1} maxLength={1000}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              // 한글 조합 중 Enter는 무시해야 마지막 글자가 두 번 전송되지 않아요
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send() }
            }}
            placeholder="메시지 보내기"
            className="flex-1 resize-none px-3.5 py-2 rounded-2xl text-[14px] bg-slate-100 outline-none text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-rose-200 transition-all" />
          <button onClick={send} disabled={!canSend}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40"
            style={{ background: canSend ? '#f43f75' : '#e2e8f0' }}>
            <Send className="w-4 h-4 text-white" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
      </div>

      {viewing && (
        <button onClick={() => setViewing(null)} className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewing} alt="" className="max-w-full max-h-full object-contain" />
        </button>
      )}
    </div>
  )
}
