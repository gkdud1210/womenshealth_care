'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, MicOff, X, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import type { MultimodalData } from '@/components/calendar/LudiaInsightCard'
import type { CyclePhase } from '@/types/health'
import { getPhaseLabel } from '@/lib/cycle-utils'

/* ── TTS ─────────────────────────────────────────────────────────── */
function speak(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined') return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ko-KR'
  u.rate = 1.05
  u.pitch = 1.1
  if (onEnd) u.onend = onEnd
  window.speechSynthesis.speak(u)
}

/* ── Intents ─────────────────────────────────────────────────────── */
interface Intent {
  keywords: string[]
  respond: (d: MultimodalData, phase: CyclePhase, day: number, name: string) => string
  action?: 'scan'
}

const INTENTS: Intent[] = [
  {
    keywords: ['피부', '여드름', '트러블', '스킨', '피부 상태'],
    action: 'scan',
    respond(d, phase, day, name) {
      const score = Math.round((d.iris.leftScore + d.iris.rightScore) / 2)
      const ctx: Record<CyclePhase, string> = {
        luteal:     '황체기라 피지 분비가 늘어나는 시기예요.',
        menstrual:  '생리 중이라 피부가 민감할 수 있어요.',
        follicular: '난포기로 피부 재생이 활발한 시기예요.',
        ovulation:  '배란기라 피부 컨디션이 가장 좋은 시기예요.',
      }
      const status = score >= 75 ? '양호해요' : score >= 60 ? '보통이에요' : '주의가 필요해요'
      return `${name}님, 홍채 피부존 점수는 ${score}점으로 ${status}. ${ctx[phase]} ${
        score < 70
          ? '나이아신아마이드 세럼과 히알루론산 보습제를 추천해요. 카메라로 직접 피부를 스캔해볼게요.'
          : '지금 피부 루틴을 유지해주세요.'
      }`
    },
  },
  {
    keywords: ['스트레스', '피곤', '힘들', '지쳐', '긴장'],
    respond(d, _p, _day, name) {
      const s = d.eda.stressIndex
      if (s >= 65) return `${name}님, 스트레스 지수 ${s}로 높아요. 지금 4-7-8 호흡을 3회 해보세요. 들숨 4초, 멈춤 7초, 날숨 8초예요. 마그네슘 보충제도 코르티솔 완화에 도움이 돼요.`
      if (s >= 45) return `${name}님, 스트레스 ${s}로 약간 높아요. 5분 명상이나 가벼운 스트레칭을 추천해요.`
      return `${name}님, 스트레스 지수 ${s}로 안정적이에요. HRV ${d.biosignal.hrv}ms로 자율신경 균형도 좋아요.`
    },
  },
  {
    keywords: ['수면', '잠', '잤어', '못 잤', '피로'],
    respond(d, _p, _day, name) {
      const h = d.biosignal.sleepHours
      if (h < 6) return `${name}님, 어젯밤 수면이 ${h}시간이에요. 많이 부족해요. 오늘 밤 7시간 이상을 목표로 해주세요. 멜라토닌이나 마그네슘이 도움될 수 있어요.`
      if (h < 7) return `${name}님, 어젯밤 ${h}시간 주무셨어요. 조금 부족해요. 오늘은 일찍 취침해보세요.`
      return `${name}님, ${h}시간 수면으로 충분히 회복됐어요. 오늘 에너지 레벨이 좋을 거예요!`
    },
  },
  {
    keywords: ['생리', '주기', '생리통', '월경', '배란'],
    respond(d, phase, day, name) {
      const info: Record<CyclePhase, string> = {
        menstrual:  `자궁 온도 ${d.thermal.uterineTemp.toFixed(1)}°C예요. 하복부 온열 패드와 철분 보충을 추천해요.`,
        follicular: '에너지가 올라오는 시기예요. 운동하기 좋은 타이밍이에요.',
        ovulation:  '배란기예요. 자궁경부 점액 변화에 주의를 기울여 보세요.',
        luteal:     'PMS 증상이 나타날 수 있어요. 마그네슘과 비타민B6가 도움이 돼요.',
      }
      return `${name}님, 현재 생리 D+${day}일, ${getPhaseLabel(phase)}이에요. ${info[phase]}`
    },
  },
  {
    keywords: ['영양제', '보충제', '추천', '뭐 먹', '화장품'],
    respond(_d, phase, _day, name) {
      const rec: Record<CyclePhase, string> = {
        menstrual:  '철분 + 비타민C, 오메가3을 추천해요.',
        follicular: '비타민D, 아연, 콜라겐 보충제가 잘 맞아요.',
        ovulation:  '엽산, 비타민E, 코엔자임Q10이 좋아요.',
        luteal:     '마그네슘, 비타민B6, 프리바이오틱스로 PMS를 줄여보세요.',
      }
      return `${name}님, ${getPhaseLabel(phase)}에 맞는 추천이에요. ${rec[phase]} 스킨케어는 히알루론산 세럼과 나이아신아마이드를 추천해요.`
    },
  },
  {
    keywords: ['오늘', '상태', '컨디션', '건강', '어때'],
    respond(d, phase, day, name) {
      const avg = Math.round([
        Math.round((d.iris.leftScore + d.iris.rightScore) / 2),
        100 - d.eda.stressIndex,
        Math.min(100, Math.round(d.biosignal.hrv / 0.8)),
        Math.min(100, Math.round(d.biosignal.sleepHours / 8 * 100)),
      ].reduce((a, b) => a + b, 0) / 4)
      const label = avg >= 75 ? '좋아요' : avg >= 55 ? '보통이에요' : '주의가 필요해요'
      return `${name}님, 오늘 종합 건강 점수 ${avg}점으로 ${label}. 스트레스 ${d.eda.stressIndex}, 수면 ${d.biosignal.sleepHours}시간, 심박수 ${d.biosignal.heartRate}bpm이에요. ${avg < 60 ? '오늘은 여유롭게 보내세요.' : '좋은 하루 되세요!'}`
    },
  },
]

const DEFAULT = (name: string) =>
  `${name}님, 안녕하세요. 피부 상태, 건강 컨디션, 생리주기, 스트레스, 영양제 추천 등 무엇이든 물어보세요.`

function matchIntent(text: string) {
  return INTENTS.find(i => i.keywords.some(k => text.includes(k))) ?? null
}

/* ── Types ───────────────────────────────────────────────────────── */
type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking'

interface Props {
  data: MultimodalData
  phase: CyclePhase
  cycleDay: number
  userName: string
}

const EXAMPLES = ['오늘 컨디션 어때?', '피부 상태 확인해줘', '스트레스 어떤 것 같아?', '영양제 추천해줘']

/* ── Component ───────────────────────────────────────────────────── */
export function LudiaVoice({ data, phase, cycleDay, userName }: Props) {
  const [vs, setVs]         = useState<VoiceState>('idle')
  const [isOpen, setIsOpen] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse]     = useState('')
  const vsRef   = useRef<VoiceState>('idle')
  const recogRef = useRef<any>(null)
  const router  = useRouter()

  const updateVs = useCallback((s: VoiceState) => { vsRef.current = s; setVs(s) }, [])

  const processText = useCallback((text: string) => {
    setTranscript(text)
    updateVs('thinking')
    setTimeout(() => {
      const intent = matchIntent(text)
      const resp = intent ? intent.respond(data, phase, cycleDay, userName) : DEFAULT(userName)
      setResponse(resp)
      updateVs('speaking')
      speak(resp, () => {
        updateVs('idle')
        if (intent?.action === 'scan') setTimeout(() => router.push('/diagnostic/scan'), 800)
      })
    }, 700)
  }, [data, phase, cycleDay, userName, router, updateVs])

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { processText('오늘 컨디션 어때'); return }
    const recog = new SR()
    recog.lang = 'ko-KR'
    recog.continuous = false
    recog.interimResults = false
    recogRef.current = recog
    recog.onresult = (e: any) => processText(e.results[0][0].transcript)
    recog.onerror  = () => updateVs('idle')
    recog.onend    = () => { if (vsRef.current === 'listening') updateVs('idle') }
    updateVs('listening')
    try { recog.start() } catch {}
  }, [processText, updateVs])

  const close = useCallback(() => {
    recogRef.current?.stop()
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    setIsOpen(false)
    updateVs('idle')
  }, [updateVs])

  useEffect(() => () => { recogRef.current?.stop(); window.speechSynthesis?.cancel() }, [])

  const handleMic = () => {
    if (!isOpen) { setIsOpen(true); setTranscript(''); setResponse(''); updateVs('idle'); return }
    if (vs === 'idle')     { startListening(); return }
    if (vs === 'listening'){ recogRef.current?.stop(); return }
    if (vs === 'speaking') { window.speechSynthesis.cancel(); updateVs('idle') }
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div className="fixed inset-0 z-40" onClick={close} />}

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-28 inset-x-4 z-50 max-w-lg mx-auto">
          <div className="rounded-3xl overflow-hidden" style={{
            background: 'linear-gradient(145deg, rgba(12,5,18,0.97), rgba(28,10,38,0.97))',
            border: '1px solid rgba(244,63,117,0.18)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.55), 0 0 80px rgba(244,63,117,0.07)',
            backdropFilter: 'blur(24px)',
          }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #f43f75, #a855f7)' }}>
                  <span className="text-sm font-black text-white">L</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-white tracking-widest">LUDIA</p>
                  <p className="text-[10px] text-rose-400">AI Health Assistant</p>
                </div>
              </div>
              <button onClick={close}
                className="w-7 h-7 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-300 transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="px-5 pb-5 space-y-3">
              {/* Listening wave */}
              {vs === 'listening' && (
                <div className="flex items-end justify-center gap-1.5 py-4">
                  <style>{`
                    @keyframes ludia-wave {
                      0%,100% { height: 6px; opacity: 0.35; }
                      50%     { height: 28px; opacity: 1; }
                    }
                  `}</style>
                  {[0, 0.15, 0.3, 0.15, 0, 0.15, 0.3].map((delay, i) => (
                    <div key={i} className="w-1.5 rounded-full bg-rose-400"
                      style={{ height: '6px', animation: `ludia-wave 0.9s ease-in-out ${delay}s infinite` }} />
                  ))}
                </div>
              )}

              {/* Thinking dots */}
              {vs === 'thinking' && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <style>{`
                    @keyframes ludia-bounce {
                      0%,100% { transform: translateY(0); opacity: 0.4; }
                      50%     { transform: translateY(-8px); opacity: 1; }
                    }
                  `}</style>
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full"
                      style={{ background: 'linear-gradient(135deg,#f43f75,#a855f7)', animation: `ludia-bounce 0.8s ease-in-out ${delay}s infinite` }} />
                  ))}
                </div>
              )}

              {/* Transcript */}
              {transcript && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] px-3.5 py-2.5 rounded-2xl rounded-br-sm"
                    style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <p className="text-sm text-slate-300 leading-relaxed">{transcript}</p>
                  </div>
                </div>
              )}

              {/* LUDIA response */}
              {response && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl rounded-bl-sm"
                    style={{ background: 'rgba(244,63,117,0.1)', border: '1px solid rgba(244,63,117,0.18)' }}>
                    <p className="text-sm text-slate-200 leading-relaxed">{response}</p>
                    {vs === 'speaking' && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Volume2 className="w-3 h-3 text-rose-400 animate-pulse" />
                        <span className="text-[10px] text-rose-400">음성 응답 중</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Idle — examples */}
              {vs === 'idle' && !transcript && (
                <div className="space-y-2.5">
                  <p className="text-[11px] text-slate-600 text-center">마이크 버튼을 눌러 말하거나 예시를 탭해보세요</p>
                  <div className="flex flex-wrap gap-1.5">
                    {EXAMPLES.map(ex => (
                      <button key={ex} onClick={() => processText(ex)}
                        className="text-[11px] px-3 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95"
                        style={{
                          background: 'rgba(244,63,117,0.08)',
                          border: '1px solid rgba(244,63,117,0.18)',
                          color: 'rgba(255,180,200,0.9)',
                        }}>
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* After response — ask again */}
              {vs === 'idle' && response && (
                <button onClick={() => { setTranscript(''); setResponse(''); }}
                  className="w-full py-2 rounded-xl text-xs font-medium transition-all hover:scale-[1.02] active:scale-95"
                  style={{
                    background: 'rgba(244,63,117,0.08)',
                    border: '1px solid rgba(244,63,117,0.18)',
                    color: 'rgba(255,180,200,0.85)',
                  }}>
                  다른 것 물어보기
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating mic button */}
      <button
        onClick={handleMic}
        aria-label="루디아 음성 대화"
        className={cn(
          'fixed bottom-6 right-5 z-50 w-16 h-16 rounded-full flex flex-col items-center justify-center gap-0.5 transition-all duration-300',
          vs === 'listening' ? 'scale-110' : 'hover:scale-105 active:scale-95'
        )}
        style={{
          background: vs === 'listening'
            ? 'linear-gradient(135deg, #f43f75, #e11d5a)'
            : 'linear-gradient(145deg, #0f0810, #2d1129)',
          boxShadow: vs === 'listening'
            ? '0 0 0 10px rgba(244,63,117,0.12), 0 0 0 22px rgba(244,63,117,0.05), 0 8px 32px rgba(244,63,117,0.5)'
            : '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(244,63,117,0.15)',
        }}>
        {vs === 'listening'
          ? <MicOff className="w-6 h-6 text-white" />
          : <Mic   className="w-5 h-5 text-rose-300" />
        }
        <span className="text-[7px] font-bold tracking-widest" style={{ color: 'rgba(244,180,200,0.6)' }}>
          LUDIA
        </span>
      </button>
    </>
  )
}
