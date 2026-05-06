'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export interface VoiceRecognitionState {
  isSupported: boolean
  isListening: boolean
  transcript: string       // real-time (including interim)
  finalTranscript: string  // only confirmed final segments
  error: string | null
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
}

export function useVoiceRecognition(): VoiceRecognitionState {
  const [isSupported,     setIsSupported]     = useState(false)
  const [isListening,     setIsListening]     = useState(false)
  const [transcript,      setTranscript]      = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [error,           setError]           = useState<string | null>(null)

  const recogRef        = useRef<SpeechRecognition | null>(null)
  const finalBufferRef  = useRef('')   // accumulated final segments this session
  const isListeningRef  = useRef(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsSupported(!!(window.SpeechRecognition ?? window.webkitSpeechRecognition))
    }
  }, [])

  const stopListening = useCallback(() => {
    isListeningRef.current = false
    recogRef.current?.stop()
    recogRef.current = null
    setIsListening(false)
  }, [])

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return

    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SR) {
      setError('이 브라우저는 음성 인식을 지원하지 않아요.')
      return
    }

    // Tear down any existing instance
    recogRef.current?.abort()

    const recog = new SR()
    recog.lang            = 'ko-KR'
    recog.continuous      = true
    recog.interimResults  = true
    recog.maxAlternatives = 1
    recogRef.current      = recog

    finalBufferRef.current = ''
    setTranscript('')
    setFinalTranscript('')
    setError(null)

    recog.onstart = () => {
      isListeningRef.current = true
      setIsListening(true)
    }

    recog.onresult = (e: SpeechRecognitionEvent) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const seg = e.results[i][0].transcript
        if (e.results[i].isFinal) {
          finalBufferRef.current += seg
        } else {
          interim += seg
        }
      }
      const combined = finalBufferRef.current + interim
      setTranscript(combined)
      setFinalTranscript(finalBufferRef.current)
    }

    recog.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === 'not-allowed' || e.error === 'permission-denied') {
        setError('마이크 권한이 필요해요. 브라우저 설정에서 허용해주세요.')
      } else if (e.error === 'no-speech') {
        setError('음성이 감지되지 않았어요. 다시 시도해주세요.')
      } else if (e.error !== 'aborted') {
        setError('음성 인식 중 오류가 발생했어요. 다시 시도해주세요.')
      }
      isListeningRef.current = false
      setIsListening(false)
    }

    recog.onend = () => {
      // Continuous mode may restart; only update state if we deliberately stopped
      if (!isListeningRef.current) {
        setIsListening(false)
      }
    }

    try {
      recog.start()
    } catch {
      setError('음성 인식을 시작할 수 없어요. 다시 시도해주세요.')
      setIsListening(false)
    }
  }, [])

  const resetTranscript = useCallback(() => {
    finalBufferRef.current = ''
    setTranscript('')
    setFinalTranscript('')
    setError(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => () => {
    isListeningRef.current = false
    recogRef.current?.abort()
  }, [])

  return {
    isSupported,
    isListening,
    transcript,
    finalTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  }
}
