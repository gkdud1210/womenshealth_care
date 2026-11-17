'use client'

// 내 프로필 — 피드 올리기 · 리포트 공유 · 일주일마다 자동 저장되는 주간 기록(운동·식단·생리주기·진단) · 내 글
// 주간 기록과 리포트는 '후기 자랑에 공개'로 골라서 공개할 수 있어요 (공개 전엔 이 기기에만 있어요).

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  PenLine, Share2, CalendarCheck2, Settings, ChevronDown, Dumbbell, Salad, Flower2, ScanEye, Trophy, Lock, Check, X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useFeed, PostCard, WriteModal, saveReviewDraft, type ReviewChange } from '@/components/feed/LudiaFeed'
import { useDiagnosticHistory, type DiagnosticSession } from '@/lib/diagnosticHistory'
import { analyzePsyche } from '@/lib/iris-psyche'
import { CARE_CASES } from '@/data/careCases'
import {
  buildWeek, loadWeekly, saveThisWeekNow, markShared, weeklyDraft, weekLabel, ensureWeeklySnapshots, isEmptyWeek,
  type WeeklyRecord,
} from '@/lib/weekly-record'
import { myAuthorIds } from '@/components/profile/WeeklyAutoSaver'

type Tab = 'weekly' | 'posts'

// 리포트 공유 — 처음 기록과 비교해 좋아진 지표
function reportChanges(first: DiagnosticSession, now: DiagnosticSession): ReviewChange[] {
  const out: ReviewChange[] = []
  const add = (label: string, a: number, b: number, unit: string, higher: boolean, min: number) => {
    if (!a || !b || Math.abs(b - a) < min || (b > a) !== higher) return
    out.push({ label, from: a, to: b, unit, good: true })
  }
  add('심박변이(HRV)', first.data.biosignal.hrv, now.data.biosignal.hrv, 'ms', true, 1)
  add('스트레스', first.data.eda.stressIndex, now.data.eda.stressIndex, '/100', false, 1)
  add('이완 점수', first.data.eda.relaxationScore, now.data.eda.relaxationScore, '/100', true, 1)
  add('체중', first.data.biosignal.weight, now.data.biosignal.weight, 'kg', false, 0.3)
  add('수면', first.data.biosignal.sleepHours, now.data.biosignal.sleepHours, '시간', true, 0.2)
  return out
}

function Stat({ n, label }: { n: string | number; label: string }) {
  return (
    <div className="flex-1 text-center">
      <p className="text-[18px] font-black text-slate-800 leading-none">{n}</p>
      <p className="text-[10.5px] text-slate-400 mt-1">{label}</p>
    </div>
  )
}

function WeekCard({ r, prev, live, careTypes, onShare }: {
  r: WeeklyRecord; prev?: WeeklyRecord; live?: boolean; careTypes: string[]; onShare: (r: WeeklyRecord, prev?: WeeklyRecord) => void
}) {
  const [open, setOpen] = useState(!!live)
  const empty = isEmptyWeek(r)
  return (
    <div className="glass-card overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white"
          style={{ background: live ? 'linear-gradient(135deg,#10b981,#0d9488)' : 'linear-gradient(135deg,#f43f75,#a855f7)' }}>
          <CalendarCheck2 className="w-5 h-5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="text-[13.5px] font-bold text-slate-800 truncate">{weekLabel(r)}</span>
            {live && <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 flex-shrink-0">진행 중</span>}
            {r.sharedAt && <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded bg-rose-50 text-rose-500 flex-shrink-0">공개함</span>}
          </span>
          <span className="block text-[11px] text-slate-400 truncate mt-0.5">
            {empty ? '아직 기록이 없어요' : [
              r.workout.count ? `🏃 ${r.workout.count}회 ${r.workout.minutes}분` : '',
              r.diet.meals ? `🥗 ${r.diet.days}일` : '',
              r.cycle.logDays ? `🌸 ${r.cycle.logDays}일` : '',
              r.diag.count ? `👁️ ${r.diag.count}회` : '',
            ].filter(Boolean).join(' · ')}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !empty && (
        <div className="px-4 pb-4 space-y-2.5">
          <div className="rounded-xl bg-blue-50/60 px-3.5 py-2.5">
            <p className="flex items-center gap-1.5 text-[12px] font-bold text-slate-700"><Dumbbell className="w-3.5 h-3.5 text-blue-500" /> 운동 루틴</p>
            {r.workout.count ? (
              <>
                <p className="text-[12px] text-slate-600 mt-1">{r.workout.count}회 · {r.workout.minutes}분{r.workout.kcal ? ` · ${r.workout.kcal}kcal` : ''} · 주간 목표 {r.workout.goalPct}%</p>
                <div className="h-1.5 rounded-full bg-white mt-1.5"><div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${r.workout.goalPct}%` }} /></div>
                <p className="text-[11.5px] text-slate-500 mt-1.5">{r.workout.sports.map(s => `${s.emoji} ${s.label} ${s.count}회`).join(' · ')}</p>
              </>
            ) : <p className="text-[11.5px] text-slate-400 mt-1">기록 없음</p>}
          </div>
          <div className="rounded-xl bg-emerald-50/60 px-3.5 py-2.5">
            <p className="flex items-center gap-1.5 text-[12px] font-bold text-slate-700"><Salad className="w-3.5 h-3.5 text-emerald-500" /> 식단</p>
            {r.diet.meals ? (
              <>
                <p className="text-[12px] text-slate-600 mt-1">{r.diet.days}일 · {r.diet.meals}끼{r.diet.avgKcal ? ` · 하루 평균 ${r.diet.avgKcal.toLocaleString()}kcal` : ''}{r.diet.avgProtein ? ` · 단백질 ${r.diet.avgProtein}g` : ''}</p>
                {r.diet.foods.length > 0 && <p className="text-[11.5px] text-slate-500 mt-0.5">자주 먹은 것: {r.diet.foods.join(', ')}</p>}
              </>
            ) : <p className="text-[11.5px] text-slate-400 mt-1">기록 없음</p>}
          </div>
          <div className="rounded-xl bg-rose-50/60 px-3.5 py-2.5">
            <p className="flex items-center gap-1.5 text-[12px] font-bold text-slate-700"><Flower2 className="w-3.5 h-3.5 text-rose-500" /> 생리주기 · 몸</p>
            {r.cycle.logDays ? (
              <p className="text-[12px] text-slate-600 mt-1">{[
                `기록 ${r.cycle.logDays}일`, r.cycle.periodDays ? `생리 ${r.cycle.periodDays}일` : '', r.cycle.avgPain ? `통증 평균 ${r.cycle.avgPain}` : '',
                r.cycle.avgSleep ? `수면 ${r.cycle.avgSleep}시간` : '', r.cycle.weight ? `체중 ${r.cycle.weight}kg` : '', r.cycle.moods.length ? `기분 ${r.cycle.moods.join('·')}` : '',
              ].filter(Boolean).join(' · ')}</p>
            ) : <p className="text-[11.5px] text-slate-400 mt-1">기록 없음</p>}
          </div>
          <div className="rounded-xl bg-violet-50/60 px-3.5 py-2.5">
            <p className="flex items-center gap-1.5 text-[12px] font-bold text-slate-700"><ScanEye className="w-3.5 h-3.5 text-violet-500" /> 진단 · 홍채 타입</p>
            {r.diag.latest ? (
              <p className="text-[12px] text-slate-600 mt-1">{r.diag.count}회 · {r.diag.latest.typeName ?? '—'} · 긴장도 {r.diag.latest.tension} · HRV {r.diag.latest.hrv}ms · BMI {r.diag.latest.bmi}</p>
            ) : <p className="text-[11.5px] text-slate-400 mt-1">기록 없음</p>}
          </div>
          <button onClick={() => onShare(r, prev)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12.5px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#f43f75,#a855f7)' }}>
            <Trophy className="w-3.5 h-3.5" /> {r.sharedAt ? '후기 자랑에 다시 공개하기' : '후기 자랑에 공개하기'}
          </button>
          <p className="flex items-center justify-center gap-1 text-[10.5px] text-slate-400"><Lock className="w-3 h-3" /> 공개하기 전에는 나만 볼 수 있어요 · 글쓰기 화면에서 내용을 고칠 수 있어요</p>
        </div>
      )}
      {open && empty && live && (
        <p className="px-4 pb-4 text-[11.5px] text-slate-400">운동·식단·생리 기록이나 진단을 남기면 여기에 자동으로 모여요.</p>
      )}
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useAuth()
  const feed = useFeed()
  const { sessions } = useDiagnosticHistory()
  const [tab, setTab] = useState<Tab>('weekly')
  const [weeks, setWeeks] = useState<WeeklyRecord[]>([])
  const [thisWeek, setThisWeek] = useState<WeeklyRecord | null>(null)
  const [showWrite, setShowWrite] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const careTypes = useMemo(() => user?.careTypes ?? [], [user])
  const ids = useCallback(() => Array.from(new Set([...myAuthorIds(), feed.myId ?? ''].filter(Boolean))), [feed.myId])

  const refresh = useCallback(() => {
    ensureWeeklySnapshots(ids())
    setWeeks(loadWeekly())
    setThisWeek(buildWeek(new Date(), { myAuthorIds: ids() }))
  }, [ids])
  useEffect(() => { refresh() }, [refresh])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2500); return () => clearTimeout(t) }, [toast])

  const myPosts = feed.posts.filter(p => p.authorId === feed.myId || p.authorId === user?.userId)
  const realSessions = sessions.filter(s => !s.demo)
  const latest = realSessions[0] ?? sessions[0]
  const psyche = latest ? analyzePsyche(latest.data) : null
  const name = user?.nickname || user?.name || feed.authorName || '나'
  const thisWeekSaved = thisWeek ? weeks.some(w => w.id === thisWeek.id) : false

  function shareWeek(r: WeeklyRecord, prev?: WeeklyRecord) {
    saveReviewDraft(weeklyDraft(r, prev, careTypes))
    if (weeks.some(w => w.id === r.id)) markShared(r.id)
    router.push('/care?tab=review&write=review')
  }

  function shareReport() {
    if (!latest) { router.push('/diagnostic'); return }
    const earlier = realSessions.filter(x => x.createdAt < latest.createdAt).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    const changes = earlier[0] ? reportChanges(earlier[0], latest) : []
    const p = analyzePsyche(latest.data)
    const d = new Date(latest.createdAt)
    saveReviewDraft({
      content: `${d.getMonth() + 1}월 ${d.getDate()}일 진단 리포트를 공유해요 📊\n`
        + `${p.type ? `👁️ 홍채 타입: ${p.type.emoji} ${p.type.name}\n` : ''}`
        + `🧘 긴장도 ${p.tension} (${p.state === 'calm' ? '안정·균형' : p.state === 'tense' ? '긴장·과부하' : '중간'})\n`
        + `💓 HRV ${latest.data.biosignal.hrv}ms · 스트레스 ${latest.data.eda.stressIndex} · BMI ${latest.data.biosignal.bmi}\n\n`,
      review: { period: earlier[0] ? `${Math.max(1, Math.round((d.getTime() - new Date(earlier[0].createdAt).getTime()) / 86400000))}일 동안` : undefined, changes },
      tags: latest.careTypes.filter(t => CARE_CASES.some(c => c.id === t)),
    })
    router.push('/care?tab=review&write=review')
  }

  function saveNow() {
    const r = saveThisWeekNow(ids())
    setWeeks(loadWeekly()); setThisWeek(r)
    setToast('이번 주 기록을 프로필에 저장했어요')
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#fafafa' }}>
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* 프로필 머리 */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-3.5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-[30px] flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#fce7f3,#ede9fe)', boxShadow: '0 0 0 3px #fff, 0 0 0 5px rgba(244,63,117,0.25)' }}>
              {feed.authorEmoji}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[19px] font-black text-slate-900 truncate">{name}</h1>
              {psyche?.type && (
                <Link href={`/diagnostic/psyche${latest ? `?id=${latest.id}` : ''}`}
                  className="inline-flex items-center gap-1 mt-1 text-[11.5px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600">
                  {psyche.type.emoji} {psyche.type.name}{latest?.demo ? ' (예시)' : ''}
                </Link>
              )}
              {careTypes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {careTypes.slice(0, 3).map(id => {
                    const c = CARE_CASES.find(x => x.id === id)
                    return c && <span key={id} className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: c.bg, color: '#475569' }}>{c.label}</span>
                  })}
                </div>
              )}
            </div>
            <Link href="/settings" aria-label="설정" className="p-2 rounded-full hover:bg-slate-100 self-start"><Settings className="w-5 h-5 text-slate-400" /></Link>
          </div>
          <div className="flex mt-4 pt-3.5 border-t border-slate-100">
            <Stat n={myPosts.length} label="내 글" />
            <Stat n={weeks.length} label="주간 기록" />
            <Stat n={`${thisWeek?.workout.minutes ?? 0}분`} label="이번 주 운동" />
            <Stat n={realSessions.length} label="진단" />
          </div>
        </div>

        {/* 빠른 실행 */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '피드 올리기', Icon: PenLine, grad: 'linear-gradient(135deg,#f43f75,#e11d5a)', onClick: () => setShowWrite(true) },
            { label: '리포트 공유', Icon: Share2, grad: 'linear-gradient(135deg,#8b5cf6,#6366f1)', onClick: shareReport },
            { label: thisWeekSaved ? '이번 주 다시 저장' : '이번 주 저장', Icon: CalendarCheck2, grad: 'linear-gradient(135deg,#10b981,#0d9488)', onClick: saveNow },
          ].map(a => (
            <button key={a.label} onClick={a.onClick}
              className="glass-card py-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: a.grad }}><a.Icon className="w-5 h-5" /></span>
              <span className="text-[12px] font-bold text-slate-700">{a.label}</span>
            </button>
          ))}
        </div>

        {/* 탭 */}
        <div className="flex gap-1 p-1 rounded-2xl bg-slate-100">
          {([['weekly', '📅 주간 기록'], ['posts', `📝 내 글 ${myPosts.length}`]] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-xl text-[13px] font-bold transition-all"
              style={tab === t ? { background: '#fff', color: '#0f172a', boxShadow: '0 1px 3px rgba(15,23,42,0.08)' } : { color: '#94a3b8' }}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'weekly' ? (
          <div className="space-y-2.5">
            <p className="text-[11.5px] text-slate-400 leading-snug px-1">
              운동 루틴 · 식단 · 생리주기 · 진단이 <b className="text-slate-600">매주 월요일에 지난주 기록으로 자동 저장</b>돼요. 원하는 주를 골라 후기 자랑에 공개할 수 있어요.
            </p>
            {thisWeek && <WeekCard r={thisWeek} prev={weeks.find(w => w.id < thisWeek.id)} live careTypes={careTypes} onShare={shareWeek} />}
            {weeks.filter(w => w.id !== thisWeek?.id).map((w, i, arr) => (
              <WeekCard key={w.id} r={w} prev={arr[i + 1]} careTypes={careTypes} onShare={shareWeek} />
            ))}
            {weeks.length === 0 && (
              <p className="text-center text-[12px] text-slate-400 py-6">지난주 기록이 생기면 여기에 쌓여요 🌱</p>
            )}
          </div>
        ) : (
          <div className="-mx-4">
            {myPosts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-3xl">📝</p>
                <p className="text-[13px] text-slate-400 mt-1">아직 올린 글이 없어요</p>
                <button onClick={() => setShowWrite(true)} className="mt-2 text-xs font-bold text-rose-500">첫 글 올리기</button>
              </div>
            ) : myPosts.map(p => (
              <PostCard key={p.id} post={p}
                liked={feed.liked.has(p.id)} saved={feed.saved.has(p.id)}
                currentUserId={feed.myId}
                currentUserName={feed.authorName} currentUserEmoji={feed.authorEmoji}
                onLike={feed.handleLike} onSave={feed.handleSave}
                onDelete={feed.handleDelete} onAddComment={feed.handleAddComment}
                analyzing={feed.analyzingIds.has(p.id)} onAnalyze={feed.handleAnalyze} />
            ))}
          </div>
        )}
      </div>

      {showWrite && (
        <WriteModal authorName={feed.authorName} authorEmoji={feed.authorEmoji} defaultTags={careTypes}
          defaultType="review" allowedTypes={feed.canWriteKnowledge ? undefined : ['review']}
          onClose={() => setShowWrite(false)}
          onSubmit={async post => {
            if (!(await feed.handleSubmit(post))) return
            setShowWrite(false); setTab('posts'); setToast('피드에 올렸어요'); refresh()
          }} />
      )}

      {(toast || feed.notice) && (
        <div className="fixed inset-x-0 bottom-24 z-[70] flex justify-center px-4" role="status">
          <div className="max-w-sm w-full flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 text-white text-[12.5px] shadow-xl">
            {toast ? <Check className="w-4 h-4 text-emerald-400" /> : null}
            <span className="flex-1">{toast ?? feed.notice}</span>
            {!toast && <button onClick={feed.clearNotice} aria-label="닫기"><X className="w-4 h-4 opacity-70" /></button>}
          </div>
        </div>
      )}
    </div>
  )
}
