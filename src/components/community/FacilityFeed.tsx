'use client'

// ── 이 장소 피드 ─────────────────────────────────────────────────────────────
//
// 루디아피드에 이 시설을 장소(📍)로 지정해서 올린 글을 시설 화면에서 쭉 모아 보여줘요.
// 여기서 바로 이 장소로 글(후기 자랑)을 쓸 수도 있어요.

import { useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useFeed, PostCard, WriteModal } from '@/components/feed/LudiaFeed'
import type { Facility } from '@/data/facilityData'

const PREVIEW = 3

export default function FacilityFeed({ f }: { f: Facility }) {
  const feed = useFeed()
  const [showAll, setShowAll] = useState(false)
  const [showWrite, setShowWrite] = useState(false)

  const posts = useMemo(() => feed.posts
    .filter(p => p.facilityId === f.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  [feed.posts, f.id])
  const shown = showAll ? posts : posts.slice(0, PREVIEW)

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11.5px] font-bold text-slate-500">📍 이 장소 피드 {posts.length > 0 && <span className="text-rose-500">{posts.length}</span>}</p>
        <button onClick={() => setShowWrite(true)}
          className="flex items-center gap-0.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#f43f75,#a855f7)' }}>
          <Plus className="w-3 h-3" strokeWidth={2.5} /> 이 장소로 글쓰기
        </button>
      </div>

      {posts.length === 0 ? (
        <p className="py-4 text-center text-[12px] text-slate-400 rounded-2xl bg-slate-50">
          아직 이 장소로 올라온 글이 없어요. 다녀온 후기를 처음 남겨 보세요!
        </p>
      ) : (
        <div className="-mx-5 bg-slate-50 py-2">
          {shown.map(p => (
            <PostCard key={p.id} post={p}
              liked={feed.liked.has(p.id)} saved={feed.saved.has(p.id)}
              currentUserId={feed.myId}
              currentUserName={feed.authorName} currentUserEmoji={feed.authorEmoji}
              onLike={feed.handleLike} onSave={feed.handleSave}
              onDelete={feed.handleDelete} onAddComment={feed.handleAddComment}
              analyzing={feed.analyzingIds.has(p.id)} onAnalyze={feed.handleAnalyze} />
          ))}
          {posts.length > PREVIEW && (
            <button onClick={() => setShowAll(v => !v)}
              className="mx-5 mt-1 w-[calc(100%-2.5rem)] py-2.5 rounded-2xl bg-white border border-slate-200 text-[12.5px] font-bold text-slate-600">
              {showAll ? '접기' : `이 장소 글 ${posts.length}개 모두 보기`}
            </button>
          )}
        </div>
      )}

      {feed.notice && (
        <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white text-[12px]">
          <span className="flex-1 leading-snug">{feed.notice}</span>
          <button onClick={feed.clearNotice} aria-label="닫기"><X className="w-3.5 h-3.5 opacity-70" /></button>
        </div>
      )}

      {showWrite && (
        <WriteModal authorName={feed.authorName} authorEmoji={feed.authorEmoji}
          defaultType="review" defaultFacilityId={f.id}
          allowedTypes={feed.canWriteKnowledge ? undefined : ['review']}
          onClose={() => setShowWrite(false)}
          onSubmit={async post => { if (await feed.handleSubmit(post)) { setShowWrite(false); setShowAll(true) } }} />
      )}
    </div>
  )
}
