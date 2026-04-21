'use client'

import { useEffect, useRef } from 'react'

/* ── 10-20 electrode positions (unit circle, top-down view) ── */
const ELECTRODES = [
  { id: 'Fp1', x: -0.18, y: -0.85, value: 0 },
  { id: 'Fp2', x:  0.18, y: -0.85, value: 0 },
  { id: 'F7',  x: -0.71, y: -0.55, value: 0 },
  { id: 'F3',  x: -0.38, y: -0.50, value: 0 },
  { id: 'Fz',  x:  0.00, y: -0.50, value: 0 },
  { id: 'F4',  x:  0.38, y: -0.50, value: 0 },
  { id: 'F8',  x:  0.71, y: -0.55, value: 0 },
  { id: 'T7',  x: -0.87, y:  0.00, value: 0 },
  { id: 'C3',  x: -0.42, y:  0.00, value: 0 },
  { id: 'Cz',  x:  0.00, y:  0.00, value: 0 },
  { id: 'C4',  x:  0.42, y:  0.00, value: 0 },
  { id: 'T8',  x:  0.87, y:  0.00, value: 0 },
  { id: 'P7',  x: -0.71, y:  0.55, value: 0 },
  { id: 'P3',  x: -0.38, y:  0.50, value: 0 },
  { id: 'Pz',  x:  0.00, y:  0.50, value: 0 },
  { id: 'P4',  x:  0.38, y:  0.50, value: 0 },
  { id: 'P8',  x:  0.71, y:  0.55, value: 0 },
  { id: 'O1',  x: -0.18, y:  0.85, value: 0 },
  { id: 'O2',  x:  0.18, y:  0.85, value: 0 },
]

/* Simulated EEG values per band mode */
const BAND_VALUES: Record<string, number[]> = {
  stress: [0.72, 0.68, 0.55, 0.62, 0.58, 0.60, 0.52, 0.35, 0.65, 0.70, 0.62, 0.38, 0.30, 0.45, 0.48, 0.42, 0.32, 0.28, 0.25],
  alpha:  [0.30, 0.28, 0.25, 0.55, 0.70, 0.52, 0.28, 0.20, 0.62, 0.85, 0.60, 0.22, 0.55, 0.72, 0.80, 0.70, 0.58, 0.65, 0.62],
  beta:   [0.80, 0.75, 0.40, 0.55, 0.50, 0.52, 0.42, 0.25, 0.48, 0.55, 0.45, 0.28, 0.30, 0.40, 0.42, 0.38, 0.32, 0.22, 0.20],
  theta:  [0.20, 0.22, 0.28, 0.38, 0.42, 0.35, 0.30, 0.35, 0.50, 0.58, 0.48, 0.38, 0.62, 0.70, 0.75, 0.68, 0.65, 0.72, 0.68],
}

function valueToColor(v: number): [number, number, number] {
  // blue(low) → cyan → green → yellow → red(high)
  if (v < 0.25) return [0, Math.round(v * 4 * 200), 255]
  if (v < 0.45) return [0, 200, Math.round(255 - (v - 0.25) * 5 * 255)]
  if (v < 0.65) return [Math.round((v - 0.45) * 5 * 255), 255, 0]
  return [255, Math.round(255 - (v - 0.65) * 2.86 * 255), 0]
}

interface Props {
  band?: 'stress' | 'alpha' | 'beta' | 'theta'
  size?: number
}

export function BrainTopoMap({ band = 'stress', size = 260 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const cx = W / 2, cy = H / 2
    const R = W * 0.44

    ctx.clearRect(0, 0, W, H)

    const vals = BAND_VALUES[band]
    const elecs = ELECTRODES.map((e, i) => ({
      ...e,
      value: vals[i],
      px: cx + e.x * R,
      py: cy + e.y * R,
    }))

    /* ── Interpolate heatmap via ImageData ── */
    const imgData = ctx.createImageData(W, H)
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const dx = (px - cx) / R, dy = (py - cy) / R
        const dist2 = dx * dx + dy * dy
        if (dist2 > 1) continue

        let wSum = 0, vSum = 0
        elecs.forEach(e => {
          const d = Math.sqrt((px - e.px) ** 2 + (py - e.py) ** 2)
          const w = 1 / (d * d + 1e-6)
          wSum += w; vSum += w * e.value
        })
        const v = vSum / wSum
        const [r, g, b] = valueToColor(v)
        const alpha = Math.max(0, 1 - dist2) * 0.82

        const idx = (py * W + px) * 4
        imgData.data[idx]     = r
        imgData.data[idx + 1] = g
        imgData.data[idx + 2] = b
        imgData.data[idx + 3] = Math.round(alpha * 255)
      }
    }
    ctx.putImageData(imgData, 0, 0)

    /* ── Blur for smooth heatmap ── */
    const tmp = document.createElement('canvas')
    tmp.width = W; tmp.height = H
    const tctx = tmp.getContext('2d')!
    tctx.filter = 'blur(12px)'
    tctx.drawImage(canvas, 0, 0)
    ctx.clearRect(0, 0, W, H)
    ctx.drawImage(tmp, 0, 0)

    /* ── Head outline ── */
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(244,63,117,0.4)'
    ctx.lineWidth = 2
    ctx.stroke()

    // Nose
    ctx.beginPath()
    ctx.moveTo(cx - 12, cy - R + 6)
    ctx.quadraticCurveTo(cx, cy - R - 16, cx + 12, cy - R + 6)
    ctx.strokeStyle = 'rgba(244,63,117,0.4)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Ears
    ;[[-1, 1]].forEach(([s]) => {
      ctx.beginPath()
      ctx.ellipse(cx + s * (R + 6), cy, 7, 12, 0, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(244,63,117,0.35)'
      ctx.lineWidth = 1.5
      ctx.stroke()
    })
    ctx.beginPath()
    ctx.ellipse(cx + R + 6, cy, 7, 12, 0, 0, Math.PI * 2)
    ctx.stroke()

    ctx.restore()

    /* ── Electrode dots + labels ── */
    elecs.forEach(e => {
      const [r, g, b] = valueToColor(e.value)
      ctx.beginPath()
      ctx.arc(e.px, e.py, 5, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${r},${g},${b},0.9)`
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.font = `bold 8px Inter, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(e.id, e.px, e.py + 13)
    })

    /* ── Center cross ── */
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 0.5
    ctx.setLineDash([3, 3])
    ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke()
    ctx.restore()

  }, [band])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-full"
      style={{ imageRendering: 'auto' }}
    />
  )
}
