'use client'

import { useEffect, useRef, useState } from 'react'

/* ── 3D Frequency × Time × Power surface plot ── */

const BANDS = ['Delta', 'Theta', 'Alpha', 'Beta', 'Gamma']
const FREQ_HZ = [2, 6, 10, 20, 45]
const TIME_POINTS = 20

function generateSurface(): number[][] {
  // rows = freq bands, cols = time
  return BANDS.map((_, fi) => {
    return Array.from({ length: TIME_POINTS }, (_, ti) => {
      const base = [0.6, 0.5, 0.75, 0.45, 0.3][fi]
      const noise = (Math.sin(ti * 0.8 + fi * 1.2) * 0.15) + (Math.random() * 0.08 - 0.04)
      return Math.max(0.05, Math.min(1, base + noise))
    })
  })
}

function powerToColor(v: number, alpha = 1): string {
  let r, g, b
  if (v < 0.3)       { r = 30;  g = 80;  b = 220 }
  else if (v < 0.5)  { r = 30;  g = 180; b = 200 }
  else if (v < 0.65) { r = 50;  g = 210; b = 80  }
  else if (v < 0.8)  { r = 240; g = 190; b = 30  }
  else               { r = 240; g = 60;  b = 60  }
  return `rgba(${r},${g},${b},${alpha})`
}

const SURFACE = generateSurface()

export function BrainSurface3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rotation, setRotation] = useState(30)
  const animRef = useRef<number>()

  useEffect(() => {
    let angle = rotation
    const animate = () => {
      angle = (angle + 0.3) % 360
      setRotation(angle)
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current!)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height

    ctx.clearRect(0, 0, W, H)

    // Isometric projection params
    const ox = W * 0.15          // origin x offset
    const oy = H * 0.82          // origin y (bottom)
    const cellW = (W * 0.72) / TIME_POINTS
    const cellD = (H * 0.28) / BANDS.length
    const maxH  = H * 0.52
    const angle = (rotation * Math.PI) / 180
    const cosA = Math.cos(angle * 0.012)  // subtle auto-rotate
    const sinA = Math.sin(angle * 0.012)

    // Project 3D (x=time, z=freq, y=power) → 2D
    function project(tx: number, fz: number, power: number): [number, number] {
      const x3 = tx * cellW
      const z3 = fz * cellD
      const y3 = power * maxH

      // Isometric + slight rotation
      const rx = x3 * cosA - z3 * sinA
      const rz = x3 * sinA + z3 * cosA

      return [
        ox + rx + rz * 0.5,
        oy - y3 - rz * 0.35,
      ]
    }

    // Draw grid floor
    ctx.save()
    ctx.strokeStyle = 'rgba(244,63,117,0.08)'
    ctx.lineWidth = 0.5
    for (let t = 0; t <= TIME_POINTS; t++) {
      const [x0, y0] = project(t, 0, 0)
      const [x1, y1] = project(t, BANDS.length, 0)
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke()
    }
    for (let f = 0; f <= BANDS.length; f++) {
      const [x0, y0] = project(0, f, 0)
      const [x1, y1] = project(TIME_POINTS, f, 0)
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke()
    }
    ctx.restore()

    // Draw surface cells (back to front)
    for (let fi = BANDS.length - 1; fi >= 0; fi--) {
      for (let ti = TIME_POINTS - 1; ti >= 0; ti--) {
        const v  = SURFACE[fi][ti]
        const v1 = ti + 1 < TIME_POINTS ? SURFACE[fi][ti + 1] : v
        const v2 = fi + 1 < BANDS.length ? SURFACE[fi + 1][ti] : v
        const v3 = ti + 1 < TIME_POINTS && fi + 1 < BANDS.length ? SURFACE[fi + 1][ti + 1] : v

        const [ax, ay] = project(ti,     fi,     v)
        const [bx, by] = project(ti + 1, fi,     v1)
        const [cx2, cy2] = project(ti + 1, fi + 1, v3)
        const [dx, dy] = project(ti,     fi + 1, v2)

        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(bx, by)
        ctx.lineTo(cx2, cy2)
        ctx.lineTo(dx, dy)
        ctx.closePath()

        const avgV = (v + v1 + v2 + v3) / 4
        ctx.fillStyle = powerToColor(avgV, 0.82)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
    }

    // Axis labels
    ctx.font = 'bold 9px Inter, sans-serif'
    ctx.fillStyle = 'rgba(148,163,184,0.9)'
    ctx.textAlign = 'center'

    BANDS.forEach((band, fi) => {
      const [lx, ly] = project(0, fi + 0.5, 0)
      ctx.fillText(band, lx - 22, ly + 3)
    })

    ;['0s', '5s', '10s', '15s', '20s'].forEach((label, i) => {
      const ti = i * (TIME_POINTS / 4)
      const [lx, ly] = project(ti, BANDS.length, 0)
      ctx.fillText(label, lx, ly + 14)
    })

    // Y-axis power label
    ctx.save()
    ctx.translate(ox - 30, oy - maxH / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillStyle = 'rgba(148,163,184,0.7)'
    ctx.font = '9px Inter, sans-serif'
    ctx.fillText('Power', 0, 0)
    ctx.restore()

  }, [rotation])

  return (
    <canvas
      ref={canvasRef}
      width={520}
      height={340}
      className="w-full"
      style={{ imageRendering: 'auto' }}
    />
  )
}
