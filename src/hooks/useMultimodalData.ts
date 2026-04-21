'use client'

import { useState, useEffect, useCallback } from 'react'
import type { MultimodalData } from '@/components/calendar/LudiaInsightCard'
import { DEFAULT_MULTIMODAL } from '@/components/calendar/MultimodalDataPanel'

const KEY = 'ludia_multimodal_v1'

export function useMultimodalData() {
  const [data, setDataState] = useState<MultimodalData>(DEFAULT_MULTIMODAL)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY)
      if (stored) setDataState(JSON.parse(stored))
    } catch {}
    setReady(true)
  }, [])

  const setData = useCallback((next: MultimodalData) => {
    setDataState(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
  }, [])

  return { data, setData, ready }
}
