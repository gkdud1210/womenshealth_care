'use client'

import { useState, useCallback, useEffect } from 'react'
import { Mic, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition'
import type { ScheduleEvent } from '@/types/health'

type VoiceState = 'idle' | 'listening' | 'processing' | 'confirming'

interface Props {
  onEventsReady: (events: ScheduleEvent[], transcript: string) => void
  onError: (msg: string) => void
}

const CSS = `
@keyframes vib-ring {
  0%   { transform: scale(1);   opacity: 0.6; }
  100% { transform: scale(2.0); opacity: 0; }
}
`

export function VoiceInputButton({ onEventsReady, onError }: Props) {
  const [state, setState] = useState<VoiceState>('idle')

  const {
    isSupported,
    isListening,
    transcript,
    finalTranscript,
    error: recogError,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceRecognition()

  // Bubble recognition errors up
  useEffect(() => {
    if (recogError) {
      onError(recogError)
      setState('idle')
    }
  }, [recogError, onError])

  // Sync isListening → state
  useEffect(() => {
    if (isListening) setState('listening')
  }, [isListening])

  const parseTranscript = useCallback(async (text: string) => {
    if (!text.trim()) {
      onError('일정을 찾지 못했어요. 다시 말씀해주세요.')
      setState('idle')
      return
    }

    setState('processing')

    const now   = new Date()
    const currentDate = now.toISOString().split('T')[0]
    const hh    = String(now.getHours()).padStart(2, '0')
    const mm    = String(now.getMinutes()).padStart(2, '0')

    try {
      const res = await fetch('/api/parse-schedule/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ transcript: text, currentDate, currentTime: `${hh}:${mm}` }),
      })

      if (!res.ok) {
        if (res.status === 503) {
          onError('Gemini API 키가 설정되지 않았어요. .env.local에 GEMINI_API_KEY를 추가해주세요.')
        } else {
          onError('파싱 중 오류가 발생했어요. 다시 시도해주세요.')
        }
        setState('idle')
        return
      }

      const { events } = await res.json() as { events: ScheduleEvent[] }

      if (!events || events.length === 0) {
        onError('일정을 찾지 못했어요. "내일 오후 3시 회의" 처럼 날짜와 시간을 함께 말해보세요.')
        setState('idle')
        return
      }

      setState('confirming')
      onEventsReady(events, text)
    } catch {
      onError('네트워크 오류가 발생했어요. 연결 상태를 확인해주세요.')
      setState('idle')
    }
  }, [onEventsReady, onError])

  const handleClick = useCallback(async () => {
    if (!isSupported) {
      onError('이 브라우저는 음성 인식을 지원하지 않아요. Chrome을 사용해주세요.')
      return
    }

    if (state === 'idle') {
      resetTranscript()
      startListening()
    } else if (state === 'listening') {
      stopListening()
      const text = finalTranscript || transcript
      await parseTranscript(text)
    }
    // processing / confirming → do nothing
  }, [
    isSupported, state, resetTranscript, startListening,
    stopListening, finalTranscript, transcript, parseTranscript, onError,
  ])

  // Reset to idle when confirming is done externally
  const resetToIdle = useCallback(() => {
    setState('idle')
    resetTranscript()
  }, [resetTranscript])

  // Expose resetToIdle via data-attr so parent can call it
  useEffect(() => {
    const btn = document.getElementById('ludia-voice-fab')
    if (btn) (btn as any).__resetToIdle = resetToIdle
  }, [resetToIdle])

  if (!isSupported) return null

  const isActive   = state === 'listening'
  const isLoading  = state === 'processing'

  const bgStyle = isActive
    ? 'linear-gradient(135deg, #f43f75, #e11d5a)'
    : 'linear-gradient(145deg, #fff1f5, #fff8fb)'

  const shadowStyle = isActive
    ? '0 4px 20px rgba(244,63,117,0.5), 0 0 0 1px rgba(244,63,117,0.3)'
    : '0 4px 20px rgba(244,63,117,0.18), 0 0 0 1px rgba(244,63,117,0.12), inset 0 1px 0 rgba(255,255,255,0.9)'

  return (
    <>
      <style>{CSS}</style>

      <div className="fixed bottom-above-nav right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
        {/* Status label */}
        {state !== 'idle' && state !== 'confirming' && (
          <div className="pointer-events-none px-3 py-1.5 rounded-full text-xs font-medium shadow-soft"
            style={{
              background:   'rgba(255,255,255,0.96)',
              border:       '1px solid rgba(244,63,117,0.2)',
              color:        state === 'processing' ? '#94a3b8' : '#f43f75',
              backdropFilter: 'blur(12px)',
            }}>
            {state === 'listening'  && '듣고 있어요...'}
            {state === 'processing' && '정리하고 있어요...'}
          </div>
        )}

        {/* Live transcript preview */}
        {state === 'listening' && transcript && (
          <div
            className="pointer-events-none max-w-[220px] px-3 py-2 rounded-2xl text-xs leading-relaxed shadow-soft text-right"
            style={{
              background:   'rgba(255,255,255,0.97)',
              border:       '1px solid rgba(244,63,117,0.15)',
              color:        '#64748b',
              backdropFilter: 'blur(12px)',
            }}>
            {transcript}
          </div>
        )}

        {/* FAB */}
        <div className="relative flex items-center justify-center pointer-events-auto">
          {/* Pulse rings */}
          {isActive && [0, 0.5, 1].map((delay, i) => (
            <div key={i} className="absolute w-14 h-14 rounded-full"
              style={{
                background: 'rgba(244,63,117,0.25)',
                animation:  `vib-ring 1.8s ease-out ${delay}s infinite`,
              }} />
          ))}

          <button
            id="ludia-voice-fab"
            onClick={handleClick}
            disabled={isLoading || state === 'confirming'}
            aria-label={state === 'listening' ? '녹음 중지' : '음성으로 일정 추가'}
            className={cn(
              'relative w-14 h-14 rounded-full flex items-center justify-center',
              'transition-all duration-250 select-none',
              isActive  ? 'scale-110' : 'hover:scale-105 active:scale-95',
              (isLoading || state === 'confirming') && 'opacity-60 cursor-not-allowed',
            )}
            style={{ background: bgStyle, boxShadow: shadowStyle }}>
            {isLoading
              ? <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
              : isActive
                ? <Mic className="w-5 h-5 text-white" />
                : <Mic className="w-5 h-5 text-rose-500" />
            }
          </button>
        </div>
      </div>
    </>
  )
}
