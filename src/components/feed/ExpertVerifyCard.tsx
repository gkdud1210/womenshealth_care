'use client'

// 설정 → 전문가 인증 — 운영자가 발급한 인증 코드를 넣으면 루디아피드에 전문가로 글을 올릴 수 있어요.
// 코드 발급: deploy/cloudflare-ai/new-expert-code.sh

import { useEffect, useState } from 'react'
import { BadgeCheck, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { feedServer, feedServerBase, feedErrorText } from '@/lib/feed-server'
import { AUTHOR_EMOJIS } from '@/components/feed/LudiaFeed'

export function ExpertVerifyCard() {
  const { user } = useAuth()
  const [state, setState] = useState<'loading' | 'off' | 'error' | 'ready'>(feedServerBase() ? 'loading' : 'off')
  const [title, setTitle] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const authorName = user?.nickname || user?.name || '나'
  const authorEmoji = AUTHOR_EMOJIS[Math.abs(authorName.charCodeAt(0)) % AUTHOR_EMOJIS.length]

  useEffect(() => {
    if (!feedServerBase()) return
    feedServer.me()
      .then(me => { setTitle(me.expert ? me.expertTitle ?? '전문가' : null); setState('ready') })
      .catch(() => setState('error'))
  }, [])

  async function submit() {
    if (!code.trim() || sending) return
    setSending(true); setMessage(null)
    try {
      const r = await feedServer.registerExpert(code.trim(), authorName, authorEmoji)
      setTitle(r.expertTitle); setCode('')
    } catch (err) {
      setMessage(feedErrorText(err))
    } finally { setSending(false) }
  }

  return (
    <div id="expert" className="glass-card p-5 mb-4 scroll-mt-4">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">전문가 인증</p>
      {state === 'off' ? (
        <p className="text-[13px] text-slate-500">피드 서버가 연결되면 전문가 인증을 할 수 있어요.</p>
      ) : state === 'loading' ? (
        <p className="flex items-center gap-1.5 text-[13px] text-slate-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /> 확인하는 중…</p>
      ) : state === 'error' ? (
        <p className="text-[13px] text-slate-500">피드 서버에 연결하지 못했어요. 잠시 후 다시 열어주세요.</p>
      ) : title ? (
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <div>
            <p className="text-[14px] font-bold text-slate-800">{title} 인증 완료</p>
            <p className="text-[12px] text-slate-400">루디아피드에 건강상식 글을 올릴 수 있고, 답글에 전문가 표시가 붙어요.</p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-[12.5px] text-slate-500 leading-relaxed mb-3">
            의사·약사·영양사·운동 전문가이신가요? 루디아에서 받은 인증 코드를 넣으면 건강상식 글을 올리고 질문에 전문가로 답할 수 있어요.
          </p>
          <div className="flex gap-2">
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="LUDIA-XXXXXXXX"
              aria-label="전문가 인증 코드" maxLength={40} autoCapitalize="characters"
              onKeyDown={e => { if (e.key === 'Enter') submit() }}
              className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 outline-none focus:border-rose-300 tracking-wider" />
            <button onClick={submit} disabled={!code.trim() || sending}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-white flex-shrink-0 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#f43f75,#a855f7)' }}>
              {sending ? '확인 중…' : '인증'}
            </button>
          </div>
          {message && <p className="text-[12px] text-red-500 mt-2">{message}</p>}
        </>
      )}
    </div>
  )
}
