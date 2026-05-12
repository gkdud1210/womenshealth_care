'use client'

import {
  createContext, useContext, useState, useCallback, useMemo,
  type ReactNode,
} from 'react'
import {
  calculateComprehensiveHealth,
  DEFAULT_IRIS,
  type BioInputs,
  type BioTwinResult,
  type IrisData,
} from '@/lib/bio-digital-twin'

/* ── Context shape ────────────────────────────────────────────── */
interface GardenContextValue {
  inputs: BioInputs
  result: BioTwinResult

  setHrv:  (v: number) => void
  setEda:  (v: number) => void
  setBmi:  (v: number) => void
  setIris: (iris: IrisData) => void
  applyPreset: (inputs: BioInputs) => void
}

const GardenContext = createContext<GardenContextValue | null>(null)

/* ── Default inputs ───────────────────────────────────────────── */
const DEFAULT_INPUTS: BioInputs = {
  iris: DEFAULT_IRIS,
  bmi:  22,
  hrv:  60,
  eda:  6,
}

/* ── Provider ─────────────────────────────────────────────────── */
export function GardenProvider({ children }: { children: ReactNode }) {
  const [inputs, setInputs] = useState<BioInputs>(DEFAULT_INPUTS)

  const result = useMemo(() => calculateComprehensiveHealth(inputs), [inputs])

  const setHrv  = useCallback((v: number) => setInputs(p => ({ ...p, hrv: v })), [])
  const setEda  = useCallback((v: number) => setInputs(p => ({ ...p, eda: v })), [])
  const setBmi  = useCallback((v: number) => setInputs(p => ({ ...p, bmi: v })), [])
  const setIris = useCallback((iris: IrisData) => setInputs(p => ({ ...p, iris })), [])
  const applyPreset = useCallback((next: BioInputs) => setInputs(next), [])

  return (
    <GardenContext.Provider value={{ inputs, result, setHrv, setEda, setBmi, setIris, applyPreset }}>
      {children}
    </GardenContext.Provider>
  )
}

/* ── Hook ─────────────────────────────────────────────────────── */
export function useGarden(): GardenContextValue {
  const ctx = useContext(GardenContext)
  if (!ctx) throw new Error('useGarden must be inside GardenProvider')
  return ctx
}
