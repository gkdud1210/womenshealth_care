'use client'

import { useEffect, useRef, useState } from 'react'
import { Thermometer, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThermalRegion {
  id: string
  nameKo: string
  x: number // 0-100%
  y: number // 0-100%
  temp: number
  status: 'cold' | 'normal' | 'warm' | 'hot'
  radius: number
}

const REGIONS: ThermalRegion[] = [
  { id: 'uterus', nameKo: '자궁', x: 50, y: 52, temp: 35.8, status: 'cold', radius: 18 },
  { id: 'left_ovary', nameKo: '좌측 난소', x: 32, y: 50, temp: 36.4, status: 'normal', radius: 10 },
  { id: 'right_ovary', nameKo: '우측 난소', x: 68, y: 50, temp: 36.6, status: 'normal', radius: 10 },
  { id: 'lower_left', nameKo: '좌하복부', x: 28, y: 62, temp: 35.9, status: 'cold', radius: 12 },
  { id: 'lower_right', nameKo: '우하복부', x: 72, y: 62, temp: 36.3, status: 'normal', radius: 12 },
  { id: 'upper_center', nameKo: '상복부', x: 50, y: 30, temp: 36.8, status: 'normal', radius: 14 },
]

function tempToColor(temp: number, alpha = 1): string {
  // 35.0 (cold/blue) -> 36.5 (normal/green) -> 38.0 (hot/red)
  const min = 35.0, max = 38.0
  const t = Math.max(0, Math.min(1, (temp - min) / (max - min)))

  let r, g, b
  if (t < 0.25) { // cold: blue -> cyan
    r = 0; g = Math.round(t * 4 * 200); b = 255
  } else if (t < 0.45) { // cool: cyan -> green
    r = 0; g = 200 + Math.round((t - 0.25) * 5 * 55); b = Math.round(255 - (t - 0.25) * 5 * 255)
  } else if (t < 0.65) { // normal: green -> yellow
    r = Math.round((t - 0.45) * 5 * 255); g = 255; b = 0
  } else { // warm/hot: yellow -> red
    r = 255; g = Math.round(255 - (t - 0.65) * 3 * 255); b = 0
  }

  return `rgba(${r},${g},${b},${alpha})`
}

// Generate simulated 320x240 thermal field as ImageData
function generateThermalField(regions: ThermalRegion[], w: number, h: number): ImageData {
  const data = new Uint8ClampedArray(w * h * 4)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let tempSum = 0
      let weightSum = 0

      // Base ambient temperature
      const ambientTemp = 36.2
      tempSum += ambientTemp * 0.1
      weightSum += 0.1

      // Influence from each region
      regions.forEach(region => {
        const rx = (region.x / 100) * w
        const ry = (region.y / 100) * h
        const rr = (region.radius / 100) * Math.min(w, h) * 1.5
        const dist = Math.sqrt((x - rx) ** 2 + (y - ry) ** 2)
        const weight = Math.exp(-dist / rr)
        tempSum += region.temp * weight
        weightSum += weight
      })

      const temp = weightSum > 0 ? tempSum / weightSum : ambientTemp
      const color = tempToColor(temp)
      const rgba = color.match(/[\d.]+/g)!.map(Number)

      const idx = (y * w + x) * 4
      data[idx] = rgba[0]
      data[idx + 1] = rgba[1]
      data[idx + 2] = rgba[2]
      data[idx + 3] = Math.round((rgba[3] ?? 1) * 255)
    }
  }

  return new ImageData(data, w, h)
}

export function ThermalMapView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredRegion, setHoveredRegion] = useState<ThermalRegion | null>(null)
  const [showLabels, setShowLabels] = useState(true)
  const [animated, setAnimated] = useState(false)

  const W = 320, H = 240

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Draw thermal field
    const imageData = generateThermalField(REGIONS, W, H)
    ctx.putImageData(imageData, 0, 0)

    // Blur for smooth look
    ctx.filter = 'blur(8px)'
    ctx.drawImage(canvas, 0, 0)
    ctx.filter = 'none'

    // Re-render sharp version on top
    ctx.globalAlpha = 0.85
    const sharpData = generateThermalField(REGIONS, W, H)
    ctx.putImageData(sharpData, 0, 0)
    ctx.globalAlpha = 1

    // Body outline silhouette
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    // Simple lower abdomen outline
    ctx.beginPath()
    ctx.ellipse(W / 2, H * 0.52, W * 0.35, H * 0.35, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    // Region markers
    if (showLabels) {
      REGIONS.forEach(region => {
        const rx = (region.x / 100) * W
        const ry = (region.y / 100) * H
        const rr = (region.radius / 100) * Math.min(W, H) * 0.8

        ctx.beginPath()
        ctx.arc(rx, ry, rr, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'
        ctx.lineWidth = 1
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(rx, ry, 3, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.fill()
      })
    }

    setTimeout(() => setAnimated(true), 50)
  }, [showLabels])

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    const scaleX = W / rect.width
    const scaleY = H / rect.height
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top) * scaleY

    const found = REGIONS.find(r => {
      const rx = (r.x / 100) * W
      const ry = (r.y / 100) * H
      const rr = (r.radius / 100) * Math.min(W, H) * 1.2
      return Math.sqrt((mx - rx) ** 2 + (my - ry) ** 2) < rr
    })
    setHoveredRegion(found ?? null)
  }

  const avgUterusTemp = REGIONS.find(r => r.id === 'uterus')?.temp ?? 36.5
  const isColdUterus = avgUterusTemp < 36.2

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-rose-500" />
          <span className="text-sm font-semibold text-slate-700">하복부 열화상 맵</span>
          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">320×240</span>
        </div>
        <button
          onClick={() => setShowLabels(!showLabels)}
          className={cn(
            'text-[10px] px-3 py-1.5 rounded-lg border font-medium transition-all',
            showLabels ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-slate-50 border-slate-200 text-slate-500'
          )}
        >
          영역 표시
        </button>
      </div>

      {/* Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200/60 shadow-card">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onClick={handleCanvasClick}
          className={cn(
            'w-full cursor-crosshair transition-all duration-700',
            animated ? 'opacity-100' : 'opacity-0'
          )}
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Hovered region tooltip */}
        {hoveredRegion && (
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm rounded-xl px-3 py-2 text-white text-xs">
            <p className="font-semibold">{hoveredRegion.nameKo}</p>
            <p className="text-white/70">{hoveredRegion.temp}°C</p>
            <p className={cn(
              'mt-0.5 font-medium',
              hoveredRegion.status === 'cold' ? 'text-blue-300' :
              hoveredRegion.status === 'normal' ? 'text-green-300' : 'text-red-300'
            )}>
              {hoveredRegion.status === 'cold' ? '냉기 감지' :
               hoveredRegion.status === 'normal' ? '정상' : '온도 상승'}
            </p>
          </div>
        )}

        {/* Scale bar */}
        <div className="absolute bottom-2 right-2 flex flex-col items-end gap-1">
          <div className="flex items-center gap-1">
            {[35.0, 35.5, 36.0, 36.5, 37.0, 37.5, 38.0].map(t => (
              <div key={t} className="w-5 h-3 rounded-sm" style={{ backgroundColor: tempToColor(t, 0.9) }} />
            ))}
          </div>
          <div className="flex justify-between w-full px-0.5">
            <span className="text-[9px] text-white/70">35°</span>
            <span className="text-[9px] text-white/70">38°C</span>
          </div>
        </div>
      </div>

      {/* Region grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {REGIONS.map(region => (
          <div
            key={region.id}
            onClick={() => setHoveredRegion(hoveredRegion?.id === region.id ? null : region)}
            className={cn(
              'p-2.5 rounded-xl border-2 cursor-pointer transition-all duration-200',
              hoveredRegion?.id === region.id
                ? 'border-rose-300 bg-rose-50'
                : 'border-slate-100 bg-slate-50/50 hover:border-rose-200'
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-slate-600">{region.nameKo}</span>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tempToColor(region.temp) }} />
            </div>
            <p className="text-sm font-bold text-slate-800">{region.temp}°C</p>
            <p className={cn(
              'text-[10px] font-medium mt-0.5',
              region.status === 'cold' ? 'text-blue-500' :
              region.status === 'normal' ? 'text-green-500' : 'text-red-500'
            )}>
              {region.status === 'cold' ? '냉기 감지' :
               region.status === 'normal' ? '정상 범위' : '온도 상승'}
            </p>
          </div>
        ))}
      </div>

      {/* Finding Alert */}
      {isColdUterus && (
        <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-700">자궁 냉기 패턴 감지</p>
            <p className="text-xs text-blue-600/80 mt-1">
              자궁 영역 평균 온도가 {avgUterusTemp}°C로 정상 범위(36.5°C)보다 낮습니다.
              온찜질, 쑥뜸 및 순환 개선 요법을 권장드립니다.
            </p>
            <div className="flex gap-2 mt-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-600 text-[10px] rounded-lg font-medium">온찜질 권장</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-600 text-[10px] rounded-lg font-medium">혈액 순환 개선</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-600 text-[10px] rounded-lg font-medium">쑥 온열 요법</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
