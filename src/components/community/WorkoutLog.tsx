'use client'

// ── 운동 기록 ───────────────────────────────────────────────────────────────
//
// 모임 화면의 "운동 기록" 탭이에요.
// 직접 기록하거나 애플워치(iPhone 건강 앱) 내보내기 파일에서 가져오고,
// 이번 주 운동량·종목별 시간·생리 주기 단계별 운동량을 보여줘요. 기록은 내가 참여한 모임에 공유할 수 있어요.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Watch, Trash2, Share2, X, Flame, Timer, Route, Check, MapPin } from 'lucide-react'
import { CATEGORY_META, type MeetupCategory, type MeetupGroup } from '@/data/meetupData'
import { FACILITIES, facilityActivities } from '@/data/facilityData'
import { useCycleData } from '@/hooks/useCycleData'
import { getCyclePhase, getPhaseColor, getPhaseLabel, type CyclePhase } from '@/lib/cycle-utils'
import {
  INTENSITY_LABEL, WEEKLY_GOAL_MIN, WORKOUT_SPORTS, dayKey, formatDuration, importAppleHealth, inRange,
  loadWorkouts, mergeImported, minutesBySport, saveWorkouts, shareText, sortWorkouts, startOfWeek, totals,
  type Workout, type WorkoutIntensity,
} from '@/lib/workout-log'

const ACCENT = '#e11d5a'
const DISTANCE_SPORTS: MeetupCategory[] = ['walking', 'running', 'swimming', 'cycling', 'hiking']
const PHASES: CyclePhase[] = ['menstrual', 'follicular', 'ovulation', 'luteal']

/** 주기 단계별 운동 가이드 (일반적인 권장 — 몸 상태가 우선이에요) */
const PHASE_TIP: Record<CyclePhase, string> = {
  menstrual:  '무리하지 말고 걷기·요가·스트레칭처럼 가벼운 운동이 좋아요.',
  follicular: '에너지가 올라오는 시기예요. 강도 높은 운동이나 새 운동을 시작하기 좋아요.',
  ovulation:  '컨디션이 좋은 시기지만 관절이 느슨해질 수 있어 준비운동을 충분히 해주세요.',
  luteal:     '중강도로 꾸준히 이어가요. 후반에 피로가 느껴지면 강도를 낮춰도 괜찮아요.',
}

function sportLabel(s: MeetupCategory): string {
  return s === 'etc' ? '기타 운동' : CATEGORY_META[s].label
}

function sportEmoji(s: MeetupCategory): string {
  return s === 'etc' ? '🏅' : CATEGORY_META[s].emoji
}

function facilityName(id?: string): string | undefined {
  return id ? FACILITIES.find(f => f.id === id)?.name : undefined
}

function dateLabel(key: string): string {
  const today = dayKey(new Date())
  const yesterday = dayKey(new Date(Date.now() - 86400000))
  if (key === today) return '오늘'
  if (key === yesterday) return '어제'
  const d = new Date(`${key}T00:00:00`)
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
}

// ── 직접 기록하기 ──────────────────────────────────────────────────────────

function WorkoutForm({ onClose, onSave }: { onClose: () => void; onSave: (w: Workout) => void }) {
  const now = new Date()
  const [sport, setSport] = useState<MeetupCategory>('walking')
  const [date, setDate] = useState(dayKey(now))
  const [time, setTime] = useState(`${String(now.getHours()).padStart(2, '0')}:00`)
  const [duration, setDuration] = useState('30')
  const [distance, setDistance] = useState('')
  const [calories, setCalories] = useState('')
  const [intensity, setIntensity] = useState<WorkoutIntensity | undefined>()
  const [facilityId, setFacilityId] = useState('')
  const [memo, setMemo] = useState('')

  const facilities = useMemo(
    () => FACILITIES.filter(f => facilityActivities(f).includes(sport)).sort((a, b) => a.name.localeCompare(b.name, 'ko')),
    [sport],
  )
  const durationMin = Number(duration)
  const valid = durationMin > 0 && !!date

  const save = () => {
    if (!valid) return
    const startAt = new Date(`${date}T${time || '00:00'}:00`).toISOString()
    onSave({
      id: `wk_${Date.now().toString(36)}`,
      sport, startAt, durationMin: Math.round(durationMin),
      distanceKm: distance ? Number(distance) : undefined,
      calories: calories ? Math.round(Number(calories)) : undefined,
      intensity, facilityId: facilityId || undefined, memo: memo.trim() || undefined,
      source: 'manual', createdAt: new Date().toISOString(),
    })
  }

  const input = 'w-full text-[13px] rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-200'
  return (
    <Sheet title="운동 기록하기" onClose={onClose}
      footer={<button onClick={save} disabled={!valid}
        className="w-full py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>저장하기</button>}>
      <div>
        <p className="text-[12px] font-bold text-slate-600 mb-1.5">종목</p>
        <div className="flex flex-wrap gap-1.5">
          {WORKOUT_SPORTS.map(s => (
            <button key={s} onClick={() => { setSport(s); setFacilityId('') }}
              className="text-[12px] font-semibold px-2.5 py-1 rounded-full border"
              style={sport === s ? { background: ACCENT, borderColor: ACCENT, color: '#fff' } : { borderColor: '#e2e8f0', color: '#475569' }}>
              {sportEmoji(s)} {sportLabel(s)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-[12px] font-bold text-slate-600">날짜
          <input type="date" value={date} max={dayKey(now)} onChange={e => setDate(e.target.value)} className={`${input} mt-1`} />
        </label>
        <label className="text-[12px] font-bold text-slate-600">시작 시간
          <input type="time" value={time} onChange={e => setTime(e.target.value)} className={`${input} mt-1`} />
        </label>
      </div>

      <div>
        <label className="text-[12px] font-bold text-slate-600">운동 시간 (분)
          <input type="number" inputMode="numeric" min={1} value={duration} onChange={e => setDuration(e.target.value)} className={`${input} mt-1`} />
        </label>
        <div className="flex gap-1.5 mt-1.5">
          {[20, 30, 45, 60, 90].map(m => (
            <button key={m} onClick={() => setDuration(String(m))}
              className="text-[11.5px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{m}분</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {DISTANCE_SPORTS.includes(sport) && (
          <label className="text-[12px] font-bold text-slate-600">거리 (km, 선택)
            <input type="number" inputMode="decimal" min={0} step="0.1" value={distance} onChange={e => setDistance(e.target.value)} className={`${input} mt-1`} />
          </label>
        )}
        <label className="text-[12px] font-bold text-slate-600">칼로리 (kcal, 선택)
          <input type="number" inputMode="numeric" min={0} value={calories} onChange={e => setCalories(e.target.value)} className={`${input} mt-1`} />
        </label>
      </div>

      <div>
        <p className="text-[12px] font-bold text-slate-600 mb-1.5">느낌 (선택)</p>
        <div className="flex gap-1.5">
          {(Object.keys(INTENSITY_LABEL) as WorkoutIntensity[]).map(k => (
            <button key={k} onClick={() => setIntensity(intensity === k ? undefined : k)}
              className="flex-1 text-[12px] font-semibold py-1.5 rounded-xl border"
              style={intensity === k ? { background: ACCENT, borderColor: ACCENT, color: '#fff' } : { borderColor: '#e2e8f0', color: '#475569' }}>
              {INTENSITY_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      {facilities.length > 0 && (
        <label className="block text-[12px] font-bold text-slate-600">다녀온 곳 (선택)
          <select value={facilityId} onChange={e => setFacilityId(e.target.value)} className={`${input} mt-1 bg-white`}>
            <option value="">선택 안 함</option>
            {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
      )}

      <label className="block text-[12px] font-bold text-slate-600">메모 (선택)
        <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2} maxLength={300}
          placeholder="오늘 운동은 어땠나요?" className={`${input} mt-1 resize-none`} />
      </label>
    </Sheet>
  )
}

// ── 애플워치 기록 가져오기 ─────────────────────────────────────────────────

function ImportSheet({ onClose, onImport }: { onClose: () => void; onImport: (list: Workout[]) => number }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [found, setFound] = useState(0)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true); setFound(0); setResult(null); setError(null)
    try {
      const list = await importAppleHealth(file, setFound)
      const added = onImport(list)
      setResult(list.length === 0
        ? '파일에서 운동 기록을 찾지 못했어요.'
        : `운동 기록 ${list.length}개 중 새 기록 ${added}개를 가져왔어요.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일을 읽지 못했어요.')
    } finally { setBusy(false) }
  }

  return (
    <Sheet title="애플워치 기록 가져오기" onClose={onClose}
      footer={<button onClick={() => fileRef.current?.click()} disabled={busy}
        className="w-full py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-50" style={{ background: ACCENT }}>
        {busy ? `읽는 중… ${found ? `(운동 ${found}개 찾음)` : ''}` : '내보내기 파일 고르기'}
      </button>}>
      <p className="text-[13px] text-slate-600 leading-relaxed">
        애플워치 운동 기록은 iPhone 건강 앱에 모여 있어요. 건강 앱에서 내보낸 파일을 올리면 운동 기록만 골라 가져와요.
      </p>
      <ol className="space-y-2 text-[12.5px] text-slate-600">
        {[
          'iPhone에서 건강 앱을 열고 오른쪽 위 프로필 사진을 눌러요.',
          '맨 아래 "모든 건강 데이터 내보내기"를 누르고 잠시 기다려요.',
          '"파일에 저장"을 골라 내보내기.zip 을 저장해요.',
          '아래 버튼을 눌러 저장한 내보내기.zip (또는 압축을 푼 export.xml)을 골라요.',
        ].map((t, i) => (
          <li key={i} className="flex gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ background: ACCENT }}>{i + 1}</span>
            <span className="leading-snug">{t}</span>
          </li>
        ))}
      </ol>
      <ul className="text-[11.5px] text-slate-500 bg-slate-50 rounded-xl px-3 py-2.5 space-y-1">
        <li>• 파일은 이 기기 안에서만 읽어요. 서버로 올라가지 않아요.</li>
        <li>• 같은 파일을 다시 올려도 이미 가져온 기록은 겹치지 않아요.</li>
        <li>• 갤럭시워치 등 다른 기기는 지금은 직접 기록으로 남겨주세요.</li>
      </ul>
      {result && <p className="text-[13px] font-semibold text-emerald-600 flex items-center gap-1"><Check className="w-4 h-4" />{result}</p>}
      {error && <p className="text-[13px] text-rose-600">{error}</p>}
      <input ref={fileRef} type="file" accept=".zip,.xml,application/zip,text/xml" className="hidden" onChange={handleFile} />
    </Sheet>
  )
}

// ── 모임에 공유하기 ────────────────────────────────────────────────────────

function ShareSheet({ workout, groups, onClose, onShare }: {
  workout: Workout; groups: MeetupGroup[]; onClose: () => void; onShare: (groupId: string, text: string) => void
}) {
  const text = shareText(workout, sportLabel(workout.sport), sportEmoji(workout.sport), facilityName(workout.facilityId))
  // 같은 종목 모임을 먼저 보여줘요
  const sorted = [...groups].sort((a, b) => Number(b.category === workout.sport) - Number(a.category === workout.sport))
  const shared = new Set(workout.sharedGroupIds ?? [])
  return (
    <Sheet title="모임에 공유하기" onClose={onClose}>
      <div className="rounded-2xl bg-slate-50 px-3.5 py-3 text-[13px] text-slate-700 whitespace-pre-wrap">{text}</div>
      {sorted.length === 0 ? (
        <p className="text-[12.5px] text-slate-500 text-center py-4">참여한 모임이 없어요. 모임에 들어가면 운동 기록을 함께 나눌 수 있어요.</p>
      ) : (
        <ul className="space-y-2">
          {sorted.map(g => {
            const done = shared.has(g.id)
            return (
              <li key={g.id}>
                <button onClick={() => !done && onShare(g.id, text)} disabled={done}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl border border-slate-200 text-left disabled:opacity-60">
                  <span className="text-xl">{CATEGORY_META[g.category].emoji}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-bold text-slate-800 truncate">{g.name}</span>
                    <span className="block text-[11px] text-slate-400">{CATEGORY_META[g.category].label} · 멤버 {g.memberIds.length}명</span>
                  </span>
                  <span className="text-[12px] font-bold" style={{ color: done ? '#10b981' : ACCENT }}>{done ? '공유함' : '공유'}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <p className="text-[11px] text-slate-400">공유하면 모임 활동 게시판에 글로 올라가요.</p>
    </Sheet>
  )
}

function Sheet({ title, onClose, footer, children }: { title: string; onClose: () => void; footer?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" style={{ background: 'rgba(15,23,42,0.45)' }} onClick={onClose}>
      <div className="w-full sm:max-w-lg max-h-[88vh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 flex-shrink-0">
          <p className="text-base font-bold text-slate-900">{title}</p>
          <button onClick={onClose} aria-label="닫기" className="p-1 -mr-1 rounded-full hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-100 flex-shrink-0">{footer}</div>}
      </div>
    </div>
  )
}

// ── 운동 기록 탭 ───────────────────────────────────────────────────────────

export default function WorkoutLog({ myGroups, onShare }: {
  myGroups: MeetupGroup[]
  /** 모임 활동 게시판에 글로 올려요 */
  onShare: (groupId: string, text: string) => void
}) {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [sheet, setSheet] = useState<'add' | 'import' | null>(null)
  const [sharing, setSharing] = useState<Workout | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const cycle = useCycleData()

  useEffect(() => { setWorkouts(loadWorkouts()) }, [])

  const update = (next: Workout[]): boolean => {
    if (!saveWorkouts(next)) { setNotice('저장 공간이 부족해요. 오래된 기록을 지워주세요.'); return false }
    setWorkouts(next)
    return true
  }

  // 이번 주
  const weekStart = startOfWeek()
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000)
  const week = useMemo(() => totals(inRange(workouts, weekStart, weekEnd)), [workouts]) // eslint-disable-line react-hooks/exhaustive-deps
  const goalPct = Math.min(100, Math.round((week.minutes / WEEKLY_GOAL_MIN) * 100))

  // 최근 7일 막대
  const last7 = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i)); return d })
    return days.map(d => ({
      key: dayKey(d),
      label: i18nDay(d),
      minutes: totals(inRange(workouts, d, new Date(d.getTime() + 86400000))).minutes,
    }))
  }, [workouts])
  const maxDay = Math.max(30, ...last7.map(d => d.minutes))

  // 최근 30일 종목별
  const month = useMemo(() => {
    const from = new Date(); from.setHours(0, 0, 0, 0); from.setDate(from.getDate() - 29)
    return minutesBySport(inRange(workouts, from, new Date(Date.now() + 86400000)))
  }, [workouts])
  const maxSport = month[0]?.minutes ?? 1

  // 생리 주기 단계별 (최근 90일) — 생리 기록이 있을 때만
  const byPhase = useMemo(() => {
    if (!cycle.hasRealData || !cycle.lastPeriodStart) return null
    const start = cycle.lastPeriodStart.getTime()
    const from = Date.now() - 90 * 86400000
    const m: Record<CyclePhase, number> = { menstrual: 0, follicular: 0, ovulation: 0, luteal: 0 }
    for (const w of workouts) {
      const d = new Date(w.startAt); d.setHours(0, 0, 0, 0)
      if (d.getTime() < from) continue
      const diff = Math.floor((d.getTime() - start) / 86400000)
      const day = (((diff % cycle.cycleLength) + cycle.cycleLength) % cycle.cycleLength) + 1
      m[getCyclePhase(day, cycle.cycleLength, cycle.periodLength)] += w.durationMin
    }
    return m
  }, [workouts, cycle])

  // 날짜별 묶음
  const byDay = useMemo(() => {
    const m = new Map<string, Workout[]>()
    for (const w of sortWorkouts(workouts)) {
      const k = dayKey(new Date(w.startAt))
      m.set(k, [...(m.get(k) ?? []), w])
    }
    return Array.from(m)
  }, [workouts])

  const handleShare = (groupId: string, text: string) => {
    if (!sharing) return
    onShare(groupId, text)
    const next = workouts.map(w => w.id === sharing.id ? { ...w, sharedGroupIds: [...(w.sharedGroupIds ?? []), groupId] } : w)
    update(next)
    setSharing(next.find(w => w.id === sharing.id) ?? null)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-3 space-y-3">
      {/* 이번 주 */}
      <div className="rounded-3xl p-4 text-white" style={{ background: 'linear-gradient(135deg,#f43f75,#a855f7)' }}>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[12px] font-semibold opacity-90">이번 주 운동</p>
            <p className="text-[28px] font-extrabold leading-tight">{formatDuration(week.minutes)}</p>
          </div>
          <p className="text-[12px] font-semibold opacity-90">목표 {WEEKLY_GOAL_MIN}분 · {goalPct}%</p>
        </div>
        <div className="h-2 rounded-full bg-white/30 mt-2 overflow-hidden">
          <div className="h-full rounded-full bg-white" style={{ width: `${goalPct}%` }} />
        </div>
        <div className="flex gap-4 mt-3 text-[12px] font-semibold">
          <span className="flex items-center gap-1"><Timer className="w-3.5 h-3.5" />{week.count}회</span>
          <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5" />{Math.round(week.calories)}kcal</span>
          <span className="flex items-center gap-1"><Route className="w-3.5 h-3.5" />{week.distanceKm.toFixed(1)}km</span>
        </div>
        <p className="text-[10.5px] opacity-80 mt-2">세계보건기구는 일주일에 중강도 운동 150분 이상을 권해요.</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setSheet('add')}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-[13px] font-bold text-white" style={{ background: ACCENT }}>
          <Plus className="w-4 h-4" /> 직접 기록하기
        </button>
        <button onClick={() => setSheet('import')}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-[13px] font-bold bg-white border border-slate-200 text-slate-700">
          <Watch className="w-4 h-4" /> 애플워치 가져오기
        </button>
      </div>

      {notice && <p className="text-[12px] text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{notice}</p>}

      {/* 최근 7일 */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <p className="text-[12.5px] font-bold text-slate-700 mb-3">최근 7일</p>
        <div className="flex items-end gap-2 h-28">
          {last7.map(d => (
            <div key={d.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              {d.minutes > 0 && <span className="text-[10px] font-semibold text-slate-500">{d.minutes}</span>}
              <div className="w-full rounded-t-lg" style={{ height: `${Math.max(d.minutes ? 6 : 2, (d.minutes / maxDay) * 80)}%`, background: d.minutes ? ACCENT : '#e2e8f0' }} />
              <span className="text-[10.5px] text-slate-400">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 주기 단계 */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: getPhaseColor(cycle.phase) }}>
            {cycle.hasRealData ? `지금 ${getPhaseLabel(cycle.phase)}` : '생리 주기'}
          </span>
          <p className="text-[12.5px] font-bold text-slate-700">주기에 맞춘 운동</p>
        </div>
        {cycle.hasRealData ? (
          <>
            <p className="text-[12.5px] text-slate-600 leading-relaxed">{PHASE_TIP[cycle.phase]}</p>
            {byPhase && (
              <div className="grid grid-cols-4 gap-1.5 mt-3">
                {PHASES.map(p => (
                  <div key={p} className="rounded-xl px-2 py-2 text-center" style={{ background: `${getPhaseColor(p)}14` }}>
                    <p className="text-[10.5px] font-bold" style={{ color: getPhaseColor(p) }}>{getPhaseLabel(p)}</p>
                    <p className="text-[12.5px] font-extrabold text-slate-800">{byPhase[p]}분</p>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10.5px] text-slate-400 mt-1.5">최근 90일 단계별 운동 시간</p>
          </>
        ) : (
          <p className="text-[12.5px] text-slate-500 leading-relaxed">주기 기록에 생리일을 남기면 단계별 운동량과 지금 단계에 맞는 운동을 알려드려요.</p>
        )}
      </div>

      {/* 최근 30일 종목별 */}
      {month.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-[12.5px] font-bold text-slate-700 mb-2.5">최근 30일 종목별</p>
          <div className="space-y-1.5">
            {month.map(s => (
              <div key={s.sport} className="flex items-center gap-2">
                <span className="w-24 text-[12px] text-slate-600 truncate">{sportEmoji(s.sport)} {sportLabel(s.sport)}</span>
                <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(s.minutes / maxSport) * 100}%`, background: s.sport === 'etc' ? ACCENT : CATEGORY_META[s.sport].color }} />
                </div>
                <span className="w-20 text-right text-[11.5px] font-semibold text-slate-600">{formatDuration(s.minutes)} · {s.count}회</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 기록 목록 */}
      {byDay.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm px-4 py-8 text-center">
          <p className="text-3xl mb-2">🏃‍♀️</p>
          <p className="text-[13px] font-bold text-slate-700">아직 운동 기록이 없어요</p>
          <p className="text-[12px] text-slate-400 mt-1">직접 기록하거나 애플워치 기록을 가져와 보세요.</p>
        </div>
      ) : byDay.map(([key, list]) => (
        <div key={key}>
          <p className="text-[12px] font-bold text-slate-500 mb-1.5 px-1">{dateLabel(key)}</p>
          <div className="space-y-2">
            {list.map(w => (
              <div key={w.id} className="bg-white rounded-2xl shadow-sm p-3.5 flex gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: w.sport === 'etc' ? 'rgba(225,29,90,0.1)' : CATEGORY_META[w.sport].bg }}>{sportEmoji(w.sport)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-[14px] font-bold text-slate-800">{sportLabel(w.sport)}</p>
                    <span className="text-[11px] text-slate-400">
                      {new Date(w.startAt).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    {w.source === 'apple_health' && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        <Watch className="w-2.5 h-2.5" /> 애플워치
                      </span>
                    )}
                    {w.intensity && <span className="text-[10.5px] text-slate-400">· {INTENSITY_LABEL[w.intensity]}</span>}
                  </div>
                  <p className="text-[12.5px] text-slate-600 mt-0.5">
                    {[formatDuration(w.durationMin), w.distanceKm ? `${w.distanceKm}km` : null, w.calories ? `${w.calories}kcal` : null].filter(Boolean).join(' · ')}
                  </p>
                  {facilityName(w.facilityId) && (
                    <p className="flex items-center gap-0.5 text-[11.5px] text-slate-400 mt-0.5"><MapPin className="w-3 h-3" />{facilityName(w.facilityId)}</p>
                  )}
                  {w.memo && <p className="text-[12px] text-slate-500 mt-1 whitespace-pre-wrap">{w.memo}</p>}
                  {(w.sharedGroupIds?.length ?? 0) > 0 && (
                    <p className="text-[10.5px] text-emerald-600 mt-1">모임 {w.sharedGroupIds!.length}곳에 공유함</p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => setSharing(w)} aria-label="모임에 공유" className="p-1.5 rounded-full hover:bg-slate-50">
                    <Share2 className="w-4 h-4" style={{ color: ACCENT }} />
                  </button>
                  <button onClick={() => { if (confirm('이 기록을 지울까요?')) update(workouts.filter(x => x.id !== w.id)) }}
                    aria-label="기록 지우기" className="p-1.5 rounded-full hover:bg-slate-50">
                    <Trash2 className="w-4 h-4 text-slate-300" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {sheet === 'add' && (
        <WorkoutForm onClose={() => setSheet(null)}
          onSave={w => { if (update(sortWorkouts([...workouts, w]))) setSheet(null) }} />
      )}
      {sheet === 'import' && (
        <ImportSheet onClose={() => setSheet(null)}
          onImport={list => {
            const { list: next, added } = mergeImported(workouts, list)
            return update(next) ? added : 0
          }} />
      )}
      {sharing && (
        <ShareSheet workout={sharing} groups={myGroups} onClose={() => setSharing(null)} onShare={handleShare} />
      )}
    </div>
  )
}

function i18nDay(d: Date): string {
  return ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
}
