'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface IrisZone {
  name: string
  nameKo: string
  radius: [number, number] // [inner%, outer%]
  startAngle: number
  endAngle: number
  density: number // 0-100
  status: 'normal' | 'elevated' | 'low' | 'critical'
}

const IRIS_ZONES: IrisZone[] = [
  { name: 'Uterus', nameKo: '자궁', radius: [15, 28], startAngle: 150, endAngle: 210, density: 42, status: 'low' },
  { name: 'Ovaries', nameKo: '난소', radius: [15, 28], startAngle: 210, endAngle: 270, density: 58, status: 'normal' },
  { name: 'Thyroid', nameKo: '갑상선', radius: [28, 42], startAngle: 80, endAngle: 130, density: 71, status: 'elevated' },
  { name: 'Adrenal', nameKo: '부신', radius: [28, 42], startAngle: 50, endAngle: 80, density: 65, status: 'normal' },
  { name: 'Liver', nameKo: '간', radius: [42, 58], startAngle: 20, endAngle: 90, density: 74, status: 'normal' },
  { name: 'Colon', nameKo: '대장', radius: [28, 42], startAngle: 180, endAngle: 360, density: 60, status: 'normal' },
  { name: 'Lymph', nameKo: '림프', radius: [58, 72], startAngle: 0, endAngle: 360, density: 55, status: 'normal' },
  { name: 'Skin', nameKo: '피부', radius: [72, 85], startAngle: 0, endAngle: 360, density: 48, status: 'low' },
]

const STATUS_COLORS = {
  normal: { fill: 'rgba(34, 197, 94, 0.25)', stroke: 'rgba(34, 197, 94, 0.7)', label: '정상' },
  elevated: { fill: 'rgba(245, 158, 11, 0.25)', stroke: 'rgba(245, 158, 11, 0.7)', label: '주의' },
  low: { fill: 'rgba(244, 63, 117, 0.2)', stroke: 'rgba(244, 63, 117, 0.6)', label: '저하' },
  critical: { fill: 'rgba(220, 38, 38, 0.3)', stroke: 'rgba(220, 38, 38, 0.8)', label: '경고' },
}

function toRad(deg: number) { return (deg * Math.PI) / 180 }

function drawArcSegment(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  innerRatio: number, outerRatio: number,
  startDeg: number, endDeg: number,
  fillColor: string, strokeColor: string
) {
  const innerR = r * innerRatio / 100
  const outerR = r * outerRatio / 100
  const start = toRad(startDeg - 90)
  const end = toRad(endDeg - 90)

  ctx.beginPath()
  ctx.arc(cx, cy, outerR, start, end)
  ctx.arc(cx, cy, innerR, end, start, true)
  ctx.closePath()
  ctx.fillStyle = fillColor
  ctx.fill()
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = 1
  ctx.stroke()
}

interface Props {
  side: 'left' | 'right'
  scanDate?: string
  overallScore?: number
}

export function IrisAnalysisView({ side, scanDate, overallScore = 67 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredZone, setHoveredZone] = useState<IrisZone | null>(null)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = canvas.width
    const cx = size / 2
    const cy = size / 2
    const r = size * 0.46

    ctx.clearRect(0, 0, size, size)

    // Outer glow
    const outerGlow = ctx.createRadialGradient(cx, cy, r * 0.85, cx, cy, r * 1.05)
    outerGlow.addColorStop(0, 'rgba(244, 63, 117, 0.08)')
    outerGlow.addColorStop(1, 'rgba(244, 63, 117, 0)')
    ctx.beginPath()
    ctx.arc(cx, cy, r * 1.05, 0, Math.PI * 2)
    ctx.fillStyle = outerGlow
    ctx.fill()

    // Sclera background
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(253, 248, 246, 0.9)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(244, 63, 117, 0.15)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Iris base gradient
    const irisGrad = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 0.87)
    irisGrad.addColorStop(0, 'rgba(100, 60, 40, 0.8)')
    irisGrad.addColorStop(0.3, 'rgba(80, 50, 30, 0.6)')
    irisGrad.addColorStop(0.7, 'rgba(60, 40, 25, 0.4)')
    irisGrad.addColorStop(1, 'rgba(40, 25, 15, 0.2)')
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.87, 0, Math.PI * 2)
    ctx.fillStyle = irisGrad
    ctx.fill()

    // Draw zone segments
    IRIS_ZONES.forEach(zone => {
      const colors = STATUS_COLORS[zone.status]
      drawArcSegment(ctx, cx, cy, r, zone.radius[0], zone.radius[1],
        zone.startAngle, zone.endAngle, colors.fill, colors.stroke)
    })

    // Fiber texture lines
    ctx.save()
    ctx.globalAlpha = 0.12
    for (let i = 0; i < 120; i++) {
      const angle = toRad((i / 120) * 360 - 90)
      const innerR = r * 0.15
      const outerR = r * 0.86
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR)
      ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR)
      ctx.strokeStyle = 'rgba(150, 100, 60, 0.8)'
      ctx.lineWidth = 0.5
      ctx.stroke()
    }
    ctx.restore()

    // Collarette ring
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.28, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(180, 130, 80, 0.5)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Pupil
    const pupilGrad = ctx.createRadialGradient(cx - r * 0.03, cy - r * 0.03, 0, cx, cy, r * 0.14)
    pupilGrad.addColorStop(0, 'rgba(40, 20, 10, 1)')
    pupilGrad.addColorStop(1, 'rgba(10, 5, 3, 1)')
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.14, 0, Math.PI * 2)
    ctx.fillStyle = pupilGrad
    ctx.fill()

    // Pupil highlight
    ctx.beginPath()
    ctx.arc(cx + r * 0.04, cy - r * 0.05, r * 0.03, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.fill()

    // Grid rings
    ctx.save()
    ctx.globalAlpha = 0.06
    ;[0.28, 0.42, 0.58, 0.72, 0.86].forEach(ratio => {
      ctx.beginPath()
      ctx.arc(cx, cy, r * ratio, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(244, 63, 117, 0.8)'
      ctx.lineWidth = 0.5
      ctx.stroke()
    })
    ctx.restore()

  }, [animated])

  const lowZones = IRIS_ZONES.filter(z => z.status !== 'normal')

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* Scan date badge */}
        {scanDate && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 px-3 py-1 bg-white/90 border border-rose-100 rounded-full text-[10px] text-rose-500 font-medium whitespace-nowrap shadow-sm">
            {scanDate} 스캔
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={220}
          height={220}
          className={cn(
            'rounded-full transition-all duration-700',
            animated ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          )}
        />

        {/* Side label */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/40 backdrop-blur-sm rounded-full text-[10px] text-white font-medium">
          {side === 'left' ? '좌안 (Left)' : '우안 (Right)'}
        </div>
      </div>

      {/* Score */}
      <div className="mt-4 text-center">
        <div className="text-3xl font-bold font-display text-rose-500">{overallScore}</div>
        <div className="text-xs text-slate-400">홍채 건강 점수</div>
      </div>

      {/* Zone findings */}
      <div className="mt-3 w-full space-y-1.5">
        {lowZones.map(zone => (
          <div key={zone.name} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[zone.status].stroke }} />
              <span className="text-xs text-slate-600">{zone.nameKo}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${zone.density}%`,
                    backgroundColor: STATUS_COLORS[zone.status].stroke
                  }} />
              </div>
              <span className="text-[10px] font-medium w-8 text-right"
                style={{ color: STATUS_COLORS[zone.status].stroke }}>
                {STATUS_COLORS[zone.status].label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
