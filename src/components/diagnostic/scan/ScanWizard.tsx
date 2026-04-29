'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Eye, Thermometer, Activity, CheckCircle2,
  Camera, CameraOff, ChevronRight, Scan, Zap,
  ArrowRight, MessageCircleHeart, BarChart2, Upload,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { MultimodalData } from '@/components/calendar/LudiaInsightCard'
import { useMultimodalData } from '@/hooks/useMultimodalData'

/* ── utils ──────────────────────────────────────────────────────── */
const rng  = (a: number, b: number) => Math.floor(a + Math.random() * (b - a))
const rngF = (a: number, b: number, d = 1) => parseFloat((a + Math.random() * (b - a)).toFixed(d))

/* ── step meta ──────────────────────────────────────────────────── */
const STEPS = [
  { id: 1, key: 'iris',      label: '홍채 스캔',  icon: Eye,         color: '#a855f7' },
  { id: 2, key: 'thermal',   label: '열화상',     icon: Thermometer, color: '#f97316' },
  { id: 3, key: 'eda',       label: 'EDA 피부전도', icon: Zap,         color: '#06b6d4' },
  { id: 4, key: 'biosignal', label: '바이오신호', icon: Activity,    color: '#f43f75' },
]

/* ══════════════════════════════════════════════════════════════════
   STEP 1 — IRIS SCAN  (오른쪽 눈 → 왼쪽 눈)
══════════════════════════════════════════════════════════════════ */

type IrisPhase = 'idle' | 'scanning' | 'captured' | 'analyzing' | 'uploading' | 'done'
type EyeStep   = 'right' | 'left'

interface EyeData {
  score: number
  skinZone: number
  thyroidZone: number
  annotatedImg: string | null
  isReal: boolean
}

function IrisStep({ onDone }: { onDone: (d: MultimodalData['iris']) => void }) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const simRef     = useRef<HTMLCanvasElement>(null)
  const fileRef    = useRef<HTMLInputElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  const rafRef     = useRef<number>()

  const [cam, setCam]     = useState<'idle' | 'requesting' | 'live' | 'denied'>('idle')
  const [phase, setPhase] = useState<IrisPhase>('idle')
  const [pct, setPct]     = useState(0)
  const [eyeStep, setEyeStep]   = useState<EyeStep>('right')
  const [rightData, setRightData] = useState<EyeData | null>(null)
  const [leftData,  setLeftData]  = useState<EyeData | null>(null)
  const [uploadErr, setUploadErr] = useState<string | null>(null)

  const currentData = eyeStep === 'right' ? rightData : leftData

  /* cleanup on unmount */
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      cancelAnimationFrame(rafRef.current ?? 0)
    }
  }, [])

  /* connect camera on demand */
  async function startCamera() {
    setCam('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setCam('live')
      setPhase('scanning')
    } catch {
      setCam('denied')
    }
  }

  /* image upload handler */
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadErr(null)
    setPhase('uploading')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const irisServiceUrl = process.env.NEXT_PUBLIC_IRIS_SERVICE_URL
      const endpoint = irisServiceUrl
        ? `${irisServiceUrl}/analyze/detailed`
        : '/api/iris-analyze'
      const resp = await fetch(endpoint, { method: 'POST', body: fd })
      const data = await resp.json()
      if (data.error) throw new Error(data.error)
      const eyeData: EyeData = {
        score:        eyeStep === 'right' ? data.rightScore : data.leftScore,
        skinZone:     data.skinZone,
        thyroidZone:  data.thyroidZone,
        annotatedImg: data.annotatedImage ?? null,
        isReal:       true,
      }
      if (eyeStep === 'right') setRightData(eyeData)
      else                     setLeftData(eyeData)
      setPhase('done')
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : '분석 실패')
      setPhase('idle')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  /* go to left eye */
  function goToLeft() {
    setEyeStep('left')
    setPhase('idle')
    setUploadErr(null)
    // 카메라가 이미 연결돼 있으면 sim canvas useEffect가 phase 변화를 감지해 계속 표시
  }

  /* finish — combine both eye results */
  function finish() {
    const r = rightData!
    const l = leftData!
    onDone({
      rightScore:  r.score,
      leftScore:   l.score,
      skinZone:    Math.round((r.skinZone  + l.skinZone)  / 2),
      thyroidZone: Math.round((r.thyroidZone + l.thyroidZone) / 2),
    })
  }

  /* overlay canvas for camera mode */
  useEffect(() => {
    if (cam !== 'live' || (phase !== 'scanning' && phase !== 'captured')) return
    const cv = overlayRef.current!; const ctx = cv.getContext('2d')!
    let t = 0
    const draw = () => {
      ctx.clearRect(0, 0, cv.width, cv.height)
      const cx = cv.width / 2, cy = cv.height / 2, R = cv.height * 0.3
      if (phase === 'captured') {
        ctx.beginPath(); ctx.arc(cx, cy, R * 1.02, 0, Math.PI * 2)
        ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 3; ctx.stroke()
        for (let i = 0; i < 5; i++) {
          const a1 = (i / 5) * Math.PI * 2, a2 = ((i + 1) / 5) * Math.PI * 2
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R * 0.92, a1, a2)
          ctx.closePath()
          ctx.fillStyle = ['rgba(244,63,117,.2)','rgba(251,146,60,.2)','rgba(168,85,247,.2)','rgba(59,130,246,.2)','rgba(34,197,94,.2)'][i]
          ctx.fill()
        }
      } else {
        const sy = cy - R + ((t % 90) / 90) * R * 2
        const g = ctx.createLinearGradient(cx - R, sy, cx + R, sy)
        g.addColorStop(0, 'transparent'); g.addColorStop(.4, 'rgba(244,63,117,.55)')
        g.addColorStop(.6, 'rgba(244,63,117,.55)'); g.addColorStop(1, 'transparent')
        ctx.fillStyle = g; ctx.fillRect(cx - R, sy - 1, R * 2, 2)
        const L = 16, bx = cx - R, by = cy - R, bw = R * 2, bh = R * 2
        ctx.strokeStyle = '#f43f75'; ctx.lineWidth = 2.5
        ;[[bx,by,1,0,0,1],[bx+bw,by,-1,0,0,1],[bx,by+bh,1,0,0,-1],[bx+bw,by+bh,-1,0,0,-1]]
          .forEach(([x,y,dx1,dy1,dx2,dy2]) => {
            ctx.beginPath()
            ctx.moveTo(x,y); ctx.lineTo(x+dx1*L,y+dy1*L)
            ctx.moveTo(x,y); ctx.lineTo(x+dx2*L,y+dy2*L); ctx.stroke()
          })
        ctx.beginPath(); ctx.arc(cx, cy, R + Math.sin(t*.12)*4, 0, Math.PI*2)
        ctx.strokeStyle = `rgba(244,63,117,${.55+Math.sin(t*.12)*.25})`
        ctx.lineWidth = 1.5; ctx.stroke()
        for (let i = 0; i < 6; i++) {
          const a = t*.04 + i*Math.PI/3
          ctx.beginPath(); ctx.arc(cx+Math.cos(a)*(R+10), cy+Math.sin(a)*(R+10), 2.5, 0, Math.PI*2)
          ctx.fillStyle = '#f43f75'; ctx.fill()
        }
      }
      t++; rafRef.current = requestAnimationFrame(draw)
    }
    draw(); return () => cancelAnimationFrame(rafRef.current ?? 0)
  }, [cam, phase])

  /* simulation canvas (카메라 미연결 상태) */
  useEffect(() => {
    if (cam === 'live') return
    const cv = simRef.current!; if (!cv) return
    const ctx = cv.getContext('2d')!; const W = cv.width, H = cv.height
    let t = 0
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#0a0510'; ctx.fillRect(0, 0, W, H)
      const cx = W/2, cy = H/2, R = Math.min(W,H)*.33
      // eye white
      ctx.beginPath(); ctx.ellipse(cx,cy,R*1.5,R*.85,0,0,Math.PI*2)
      ctx.fillStyle='#f5f0f3'; ctx.fill()
      // iris gradient
      const ig = ctx.createRadialGradient(cx,cy,0,cx,cy,R)
      ig.addColorStop(0,'#1e0f08'); ig.addColorStop(.35,'#5e2a12')
      ig.addColorStop(.7,'#96531e'); ig.addColorStop(1,'#c47a2a')
      ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.fillStyle=ig; ctx.fill()
      // fibres
      for (let i=0;i<40;i++) {
        const a=(i/40)*Math.PI*2
        ctx.beginPath()
        ctx.moveTo(cx+Math.cos(a)*R*.22,cy+Math.sin(a)*R*.22)
        ctx.lineTo(cx+Math.cos(a)*R*.93,cy+Math.sin(a)*R*.93)
        ctx.strokeStyle='rgba(0,0,0,.18)'; ctx.lineWidth=.7; ctx.stroke()
      }
      // zone rings
      for (let r=0;r<4;r++) {
        ctx.beginPath(); ctx.arc(cx,cy,R*[.22,.45,.65,.85][r],0,Math.PI*2)
        ctx.strokeStyle=`rgba(255,255,255,${phase==='scanning'?.12+Math.sin(t*.06+r)*.06:.07})`
        ctx.lineWidth=.6; ctx.stroke()
      }
      // pupil
      const pg = ctx.createRadialGradient(cx,cy,0,cx,cy,R*.29)
      pg.addColorStop(0,'#1a0808'); pg.addColorStop(1,'#000')
      ctx.beginPath(); ctx.arc(cx,cy,R*.29,0,Math.PI*2); ctx.fillStyle=pg; ctx.fill()
      // reflection
      ctx.beginPath(); ctx.ellipse(cx-R*.18,cy-R*.22,R*.07,R*.10,Math.PI/4,0,Math.PI*2)
      ctx.fillStyle='rgba(255,255,255,.65)'; ctx.fill()
      // eyelids
      ctx.beginPath(); ctx.ellipse(cx,cy-R*.5,R*1.5,R*.8,0,Math.PI,Math.PI*2)
      ctx.fillStyle='#0a0510'; ctx.fill()
      ctx.beginPath(); ctx.ellipse(cx,cy+R*.45,R*1.5,R*.8,0,0,Math.PI)
      ctx.fillStyle='#0a0510'; ctx.fill()

      if (phase==='scanning') {
        const sy=cy-R+((t%90)/90)*R*2
        const g=ctx.createLinearGradient(cx-R,sy,cx+R,sy)
        g.addColorStop(0,'transparent'); g.addColorStop(.4,'rgba(244,63,117,.55)')
        g.addColorStop(.6,'rgba(244,63,117,.55)'); g.addColorStop(1,'transparent')
        ctx.fillStyle=g; ctx.fillRect(cx-R,sy-1,R*2,2)
        ctx.beginPath(); ctx.arc(cx,cy,R+Math.sin(t*.1)*4,0,Math.PI*2)
        ctx.strokeStyle=`rgba(244,63,117,${.6+Math.sin(t*.1)*.3})`; ctx.lineWidth=2; ctx.stroke()
        for (let i=0;i<8;i++) {
          const a=t*.04+i*Math.PI/4
          ctx.beginPath(); ctx.arc(cx+Math.cos(a)*(R+9),cy+Math.sin(a)*(R+9),2.5,0,Math.PI*2)
          ctx.fillStyle='#f43f75'; ctx.fill()
        }
      } else if (phase==='captured'||phase==='done') {
        ctx.beginPath(); ctx.arc(cx,cy,R*1.03,0,Math.PI*2)
        ctx.strokeStyle='#22c55e'; ctx.lineWidth=3; ctx.stroke()
        const zc=['rgba(244,63,117,.18)','rgba(251,146,60,.18)','rgba(168,85,247,.18)','rgba(59,130,246,.18)']
        ;[.28,.5,.68,.88].forEach((rr,i)=>{
          ctx.beginPath(); ctx.arc(cx,cy,R*rr,0,Math.PI*2); ctx.strokeStyle=zc[i]
          ctx.lineWidth=R*([.28,.22,.18,.2][i])*2; ctx.stroke()
        })
      }
      t++; rafRef.current=requestAnimationFrame(draw)
    }
    draw(); return ()=>cancelAnimationFrame(rafRef.current??0)
  }, [cam, phase])

  /* scan timer (카메라 시뮬레이션) */
  useEffect(() => {
    if (phase!=='scanning') return
    let p=0; const iv=setInterval(()=>{
      p+=1.8; setPct(Math.min(100,Math.floor(p)))
      if (p>=100) {
        clearInterval(iv); setPhase('captured')
        setTimeout(()=>{
          setPhase('analyzing')
          setTimeout(()=>{
            const eyeData: EyeData = {
              score:        rng(58, 88),
              skinZone:     rng(42, 78),
              thyroidZone:  rng(62, 88),
              annotatedImg: null,
              isReal:       false,
            }
            if (eyeStep === 'right') setRightData(eyeData)
            else                     setLeftData(eyeData)
            setPhase('done')
          },1800)
        },900)
      }
    },55)
    return ()=>clearInterval(iv)
  },[phase, eyeStep])

  const eyeLabel = eyeStep === 'right' ? '오른쪽 눈' : '왼쪽 눈'
  const bothDone = phase === 'done' && eyeStep === 'left' && leftData !== null

  return (
    <div className="space-y-4">

      {/* ── 눈 단계 표시기 ── */}
      <div className="flex items-center gap-2">
        {(['right','left'] as EyeStep[]).map((eye, i) => {
          const label  = eye === 'right' ? '오른쪽 눈' : '왼쪽 눈'
          const done   = eye === 'right' ? rightData !== null : leftData !== null
          const active = eyeStep === eye && !bothDone
          return (
            <div key={eye} className="flex items-center gap-2 flex-1">
              <div className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-1 justify-center transition-all',
                done
                  ? 'bg-green-100 text-green-600'
                  : active
                    ? 'text-white'
                    : 'bg-slate-100 text-slate-400',
              )} style={active ? {background:'linear-gradient(135deg,#a855f7,#7c3aed)'} : {}}>
                {done
                  ? <><CheckCircle2 className="w-3 h-3"/>{label} ✓</>
                  : <><Eye className="w-3 h-3"/>{label}</>}
              </div>
              {i === 0 && <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0"/>}
            </div>
          )
        })}
      </div>

      {/* ── 뷰파인더 ── */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-950" style={{aspectRatio:'4/3',maxHeight:340}}>
        {/* 항상 video 엘리먼트를 DOM에 유지 (srcObject 할당을 위해) */}
        <video ref={videoRef} autoPlay muted playsInline
          className={cn('w-full h-full object-cover', cam !== 'live' && 'hidden')}
          style={{transform:'scaleX(-1)'}} />
        <canvas ref={overlayRef} width={640} height={480}
          className={cn('absolute inset-0 w-full h-full pointer-events-none', cam !== 'live' && 'hidden')}
          style={{transform:'scaleX(-1)'}} />

        {/* 결과 이미지 */}
        {phase==='done' && currentData?.annotatedImg && (
          <>
            <img src={currentData.annotatedImg} alt={`${eyeLabel} 홍채 인식 결과`} className="absolute inset-0 w-full h-full object-contain" />
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm">
              <Eye className="w-3 h-3 text-green-400"/>
              <span className="text-[10px] text-white">{eyeLabel} 인식 완료</span>
            </div>
            <div className="absolute bottom-3 right-3 flex items-center gap-3 px-2.5 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-[9px] text-white">
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-0.5 rounded" style={{background:'#1edc5a'}}/> 홍채</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-0.5 rounded" style={{background:'#00c8ff'}}/> 동공</span>
            </div>
          </>
        )}

        {/* 시뮬레이션 캔버스 (카메라 미연결 상태) */}
        {cam !== 'live' && !(phase==='done' && currentData?.annotatedImg) && (
          <canvas ref={simRef} width={420} height={320} className="w-full h-full" />
        )}

        {/* 상태 배지 */}
        {!(phase==='done' && currentData?.annotatedImg) && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm">
            {cam==='live'
              ? <><Camera className="w-3 h-3 text-green-400"/><span className="text-[10px] text-white">카메라 연결됨</span></>
              : cam==='requesting'
                ? <><div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"/><span className="text-[10px] text-white">카메라 연결 중...</span></>
                : cam==='denied'
                  ? <><CameraOff className="w-3 h-3 text-red-400"/><span className="text-[10px] text-red-300">카메라 권한 필요</span></>
                  : <><CameraOff className="w-3 h-3 text-amber-400"/><span className="text-[10px] text-white">카메라 대기 중</span></>}
          </div>
        )}
        {phase==='scanning' && (
          <div className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"/>
            <span className="text-[10px] text-rose-300 font-medium">스캔 중 {pct}%</span>
          </div>
        )}
        {phase==='captured' && (
          <div className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400"/>
            <span className="text-[10px] text-green-300 font-medium">캡처 완료</span>
          </div>
        )}
        {phase==='uploading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"/>
              <span className="text-xs text-white font-medium">AI 분석 중...</span>
            </div>
          </div>
        )}
      </div>

      {phase==='scanning' && (
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-75" style={{width:`${pct}%`}}/>
        </div>
      )}

      {/* ── 현재 눈 결과 점수 ── */}
      {phase==='done' && currentData && (
        <div className="flex gap-2">
          <div className="flex-1 rounded-xl p-3 text-center" style={{background:'rgba(248,244,246,.8)',border:'1px solid rgba(168,85,247,.15)'}}>
            <div className={cn('text-2xl font-bold font-display', currentData.score>=70?'text-green-600':'text-amber-600')}>
              {currentData.score}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{eyeLabel} 밀도</div>
          </div>
          <div className="flex-1 rounded-xl p-3 text-center" style={{background:'rgba(248,244,246,.8)',border:'1px solid rgba(168,85,247,.15)'}}>
            <div className={cn('text-2xl font-bold font-display', currentData.skinZone>=70?'text-green-600':'text-amber-600')}>
              {currentData.skinZone}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">피부 Zone</div>
          </div>
          <div className="flex-1 rounded-xl p-3 text-center" style={{background:'rgba(248,244,246,.8)',border:'1px solid rgba(168,85,247,.15)'}}>
            <div className={cn('text-2xl font-bold font-display', currentData.thyroidZone>=70?'text-green-600':'text-amber-600')}>
              {currentData.thyroidZone}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">갑상선 Zone</div>
          </div>
        </div>
      )}

      {/* ── 두 눈 모두 완료 — 최종 결과 ── */}
      {bothDone && rightData && leftData && (
        <div className="rounded-xl p-3 space-y-2" style={{background:'rgba(168,85,247,.06)',border:'1px solid rgba(168,85,247,.2)'}}>
          <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">양안 종합 분석</p>
          <div className="grid grid-cols-2 gap-2">
            {[['우안 밀도', rightData.score], ['좌안 밀도', leftData.score],
              ['피부 Zone', Math.round((rightData.skinZone+leftData.skinZone)/2)],
              ['갑상선 Zone', Math.round((rightData.thyroidZone+leftData.thyroidZone)/2)]
            ].map(([l, v]) => (
              <div key={String(l)} className="rounded-lg p-2 text-center" style={{background:'rgba(255,255,255,.7)'}}>
                <div className={cn('text-lg font-bold font-display', (v as number)>=70?'text-green-600':'text-amber-600')}>{v}</div>
                <div className="text-[10px] text-slate-500">{l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 상태 메시지 ── */}
      <div className="text-center text-sm text-slate-500 min-h-[24px]">
        {phase==='idle'    && `👁 ${eyeLabel} 홍채 사진을 업로드하거나 카메라로 스캔하세요`}
        {phase==='scanning'  && `👁 ${eyeLabel}을 화면 중앙에 맞추고 가만히 있어 주세요...`}
        {phase==='captured'  && '📸 캡처 완료 — 구역 분석 중...'}
        {phase==='analyzing' && '🔬 홍채 패턴 분석 중...'}
        {phase==='uploading' && '🔬 AI 홍채 분석 중... 잠시만 기다려 주세요'}
        {phase==='done' && eyeStep==='right' && '✅ 오른쪽 눈 완료! 이제 왼쪽 눈을 스캔하세요'}
        {phase==='done' && eyeStep==='left'  && '✅ 양안 분석 완료!'}
      </div>

      {uploadErr && <p className="text-xs text-red-500 text-center">{uploadErr}</p>}

      {/* ── 액션 버튼 ── */}
      {phase==='idle' && (
        <div className="flex gap-2">
          <button
            onClick={() => cam === 'live' ? setPhase('scanning') : startCamera()}
            className="flex-1 btn-primary py-3 rounded-2xl text-sm flex items-center justify-center gap-2">
            <Scan className="w-4 h-4"/>
            {cam === 'live' ? '스캔 시작' : 'Go Live'}
          </button>
          <button onClick={()=>fileRef.current?.click()}
            className="flex-1 py-3 rounded-2xl text-sm flex items-center justify-center gap-2 font-medium transition-all hover:opacity-90 active:scale-95"
            style={{background:'rgba(248,244,246,.9)',border:'1.5px solid rgba(168,85,247,.3)',color:'#a855f7'}}>
            <Upload className="w-4 h-4"/>이미지 업로드
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload}/>
        </div>
      )}

      {/* 오른쪽 눈 완료 → 왼쪽 눈으로 */}
      {phase==='done' && eyeStep==='right' && (
        <button onClick={goToLeft}
          className="w-full btn-primary py-3 rounded-2xl text-sm flex items-center justify-center gap-2">
          다음: 왼쪽 눈 스캔 <ChevronRight className="w-4 h-4"/>
        </button>
      )}

      {/* 양안 완료 → 다음 단계 */}
      {bothDone && (
        <button onClick={finish}
          className="w-full btn-primary py-3 rounded-2xl text-sm flex items-center justify-center gap-2">
          다음 단계: 열화상 스캔 <ChevronRight className="w-4 h-4"/>
        </button>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   STEP 2 — THERMAL SCAN
══════════════════════════════════════════════════════════════════ */

type ThermalPhase = 'idle'|'scanning'|'done'

const THERMAL_ZONES = [
  { key:'uterine',      label:'자궁',        cx:.50, cy:.56, rx:.17, ry:.12, baseTemp:35.8 },
  { key:'leftOvary',    label:'좌측 난소',   cx:.33, cy:.54, rx:.09, ry:.07, baseTemp:36.2 },
  { key:'rightOvary',   label:'우측 난소',   cx:.67, cy:.54, rx:.09, ry:.07, baseTemp:36.4 },
  { key:'lowerLeft',    label:'좌하복부',    cx:.30, cy:.66, rx:.10, ry:.08, baseTemp:36.1 },
  { key:'lowerRight',   label:'우하복부',    cx:.70, cy:.66, rx:.10, ry:.08, baseTemp:36.3 },
  { key:'upperAbdomen', label:'상복부',      cx:.50, cy:.38, rx:.16, ry:.10, baseTemp:36.8 },
]

function tempToRgba(t:number,a=0.7):string {
  const n=Math.max(0,Math.min(1,(t-35.0)/3.0))
  const r=Math.round(n*220+20), g=Math.round((1-Math.abs(n-.5)*2)*200), b=Math.round((1-n)*220+20)
  return `rgba(${r},${g},${b},${a})`
}

function ThermalStep({ onDone }:{ onDone:(d:MultimodalData['thermal'])=>void }) {
  const cvRef  = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>()
  const [phase,setPhase]=useState<ThermalPhase>('idle')
  const [pct,setPct]=useState(0)
  const [temps,setTemps]=useState<Record<string,number>>({})
  const [res,setRes]=useState<MultimodalData['thermal']|null>(null)

  useEffect(()=>{
    if(phase==='idle'&&!Object.keys(temps).length) return
    const cv=cvRef.current!; if(!cv)return; const ctx=cv.getContext('2d')!
    const W=cv.width, H=cv.height
    let t=0

    function drawBody(){
      ctx.clearRect(0,0,W,H)
      // dark bg
      ctx.fillStyle='#060412'; ctx.fillRect(0,0,W,H)
      // body silhouette
      ctx.fillStyle='rgba(40,20,55,.9)'
      // torso
      ctx.beginPath()
      ctx.ellipse(W*.5,H*.42,W*.22,H*.28,0,0,Math.PI*2); ctx.fill()
      // pelvis
      ctx.beginPath()
      ctx.ellipse(W*.5,H*.65,W*.20,H*.18,0,0,Math.PI*2); ctx.fill()
      // head
      ctx.beginPath()
      ctx.ellipse(W*.5,H*.14,W*.10,H*.12,0,0,Math.PI*2); ctx.fill()

      // scan line
      if(phase==='scanning'){
        const sy=H*.05+((t%120)/120)*H*.85
        const g=ctx.createLinearGradient(0,sy,W,sy)
        g.addColorStop(0,'transparent'); g.addColorStop(.4,'rgba(251,146,60,.5)')
        g.addColorStop(.6,'rgba(251,146,60,.5)'); g.addColorStop(1,'transparent')
        ctx.fillStyle=g; ctx.fillRect(0,sy-1.5,W,3)
        // scan progress grid
        ctx.strokeStyle='rgba(251,146,60,.06)'; ctx.lineWidth=.5
        for(let gy=0;gy<sy;gy+=12){
          ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke()
        }
        for(let gx=0;gx<W;gx+=12){
          ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,sy); ctx.stroke()
        }
      }

      // heat zones
      THERMAL_ZONES.forEach(z=>{
        const temp=temps[z.key]??z.baseTemp
        const scanned=(phase==='scanning'&&pct/100>z.cy-.1)||(phase==='done')
        if(!scanned) return
        // zone glow
        const gr=ctx.createRadialGradient(W*z.cx,H*z.cy,0,W*z.cx,H*z.cy,W*z.rx*1.8)
        gr.addColorStop(0,tempToRgba(temp,.8))
        gr.addColorStop(.6,tempToRgba(temp,.35))
        gr.addColorStop(1,'transparent')
        ctx.fillStyle=gr
        ctx.beginPath(); ctx.ellipse(W*z.cx,H*z.cy,W*z.rx*1.8,H*z.ry*1.8,0,0,Math.PI*2)
        ctx.fill()
        // zone center ellipse
        ctx.beginPath(); ctx.ellipse(W*z.cx,H*z.cy,W*z.rx,H*z.ry,0,0,Math.PI*2)
        ctx.fillStyle=tempToRgba(temp,.7); ctx.fill()
        ctx.strokeStyle=tempToRgba(temp,1); ctx.lineWidth=1; ctx.stroke()
        // label + temp
        const pulse=Math.sin(t*.08+z.cx*10)*.2+.8
        ctx.fillStyle=`rgba(255,255,255,${phase==='done'?pulse:.5})`
        ctx.font=`bold ${W*.035}px sans-serif`; ctx.textAlign='center'
        ctx.fillText(z.label,W*z.cx,H*z.cy-H*z.ry-8)
        ctx.fillStyle=tempToRgba(temp,phase==='done'?pulse:1)
        ctx.font=`bold ${W*.04}px sans-serif`
        ctx.fillText(`${temp.toFixed(1)}°`,W*z.cx,H*z.cy+5)
      })

      // colour scale bar
      const barX=W*.85,barY=H*.2,barH=H*.5
      const barG=ctx.createLinearGradient(barX,barY+barH,barX,barY)
      barG.addColorStop(0,tempToRgba(35,.9)); barG.addColorStop(.5,tempToRgba(36.5,.9)); barG.addColorStop(1,tempToRgba(38,.9))
      ctx.fillStyle=barG; ctx.fillRect(barX,barY,8,barH)
      ctx.fillStyle='rgba(255,255,255,.55)'; ctx.font=`${W*.025}px sans-serif`; ctx.textAlign='left'
      ctx.fillText('38°C',barX+11,barY+4); ctx.fillText('36.5°',barX+11,barY+barH/2+4); ctx.fillText('35°C',barX+11,barY+barH+4)

      t++; rafRef.current=requestAnimationFrame(drawBody)
    }
    drawBody(); return ()=>cancelAnimationFrame(rafRef.current??0)
  },[phase,temps,pct])

  useEffect(()=>{
    if(phase!=='scanning')return
    const newTemps:Record<string,number>={}
    THERMAL_ZONES.forEach(z=>{ newTemps[z.key]=rngF(z.baseTemp-.6,z.baseTemp+.8) })
    setTemps(newTemps)
    let p=0; const iv=setInterval(()=>{
      p+=1.5; setPct(Math.floor(p))
      if(p>=100){
        clearInterval(iv); setPhase('done')
        setRes({ uterineTemp:newTemps['uterine'], leftOvaryTemp:newTemps['leftOvary'], rightOvaryTemp:newTemps['rightOvary'] })
      }
    },60)
    return ()=>clearInterval(iv)
  },[phase])

  return (
    <div className="space-y-4">
      <div className="relative rounded-2xl overflow-hidden bg-slate-950" style={{aspectRatio:'3/4',maxHeight:400}}>
        <canvas ref={cvRef} width={320} height={430} className="w-full h-full"/>
        {phase==='scanning'&&<div className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm"><div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"/><span className="text-[10px] text-orange-300">측정 중 {pct}%</span></div>}
      </div>

      {phase==='scanning'&&<div className="h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all duration-75" style={{width:`${pct}%`}}/></div>}

      {phase==='done'&&res&&(
        <div className="grid grid-cols-3 gap-2">
          {[['자궁',res.uterineTemp],['좌측 난소',res.leftOvaryTemp],['우측 난소',res.rightOvaryTemp]].map(([l,v])=>(
            <div key={String(l)} className="rounded-xl p-2.5 text-center" style={{background:'rgba(248,244,246,.8)',border:'1px solid rgba(251,146,60,.15)'}}>
              <div className={cn('text-xl font-bold font-display',(v as number)>=36.5?'text-green-600':(v as number)>=36.0?'text-amber-500':'text-rose-600')}>{(v as number).toFixed(1)}°</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      )}

      <div className="text-center text-sm text-slate-500 min-h-[28px]">
        {phase==='idle'&&'열화상 카메라로 하복부 부위를 촬영합니다'}
        {phase==='scanning'&&'🌡  열화상 스캔 중 — 움직이지 말아 주세요...'}
        {phase==='done'&&'✅ 열화상 분석 완료!'}
      </div>

      {phase==='idle'&&<button onClick={()=>setPhase('scanning')} className="w-full btn-primary py-3 rounded-2xl text-sm flex items-center justify-center gap-2"><Thermometer className="w-4 h-4"/>열화상 스캔 시작</button>}
      {phase==='done'&&<button onClick={()=>onDone(res!)} className="w-full btn-primary py-3 rounded-2xl text-sm flex items-center justify-center gap-2">다음 단계: EDA 피부전도<ChevronRight className="w-4 h-4"/></button>}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   STEP 3 — EDA CAPTURE
══════════════════════════════════════════════════════════════════ */

type EDAPhase='idle'|'capturing'|'done'

function EDAStep({ onDone }:{ onDone:(d:MultimodalData['eda'])=>void }) {
  const cvRef  = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>()
  const [phase,setPhase]=useState<EDAPhase>('idle')
  const [pct,setPct]=useState(0)
  const [res,setRes]=useState<MultimodalData['eda']|null>(null)
  const bufRef = useRef<number[]>([])
  const hRef   = useRef(0)

  useEffect(()=>{
    if(phase==='idle')return
    const cv=cvRef.current!; const ctx=cv.getContext('2d')!
    const W=cv.width, H=cv.height
    let t=0

    function draw(){
      ctx.fillStyle='#020f14'; ctx.fillRect(0,0,W,H)

      // grid
      ctx.strokeStyle='rgba(6,182,212,.06)'; ctx.lineWidth=.5
      for(let y=0;y<H;y+=H/4){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }
      for(let x=0;x<W;x+=40){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }

      // generate EDA sample (slow-moving conductance + occasional spikes)
      const base = 8.4 + Math.sin(t*.004)*2.2
      const spike = Math.random()<.008 ? (Math.random()*4) : 0
      const v = Math.max(2, Math.min(22, base + spike + (Math.random()-.5)*.6))
      bufRef.current.push(v)
      if(bufRef.current.length>W) bufRef.current.shift()

      // draw conductance trace
      if(bufRef.current.length>1){
        ctx.beginPath()
        bufRef.current.forEach((val,i)=>{
          const px=i*(W/W)
          const py=H-((val-2)/(22-2))*(H*.75)-H*.1
          i===0?ctx.moveTo(px,py):ctx.lineTo(px,py)
        })
        const alpha=phase==='done'?.55:.88
        ctx.strokeStyle=`rgba(6,182,212,${alpha})`; ctx.lineWidth=2; ctx.stroke()

        // fill area under curve
        ctx.lineTo(bufRef.current.length-1,H); ctx.lineTo(0,H)
        ctx.fillStyle='rgba(6,182,212,.08)'; ctx.fill()
      }

      // reference lines
      ctx.strokeStyle='rgba(34,197,94,.4)'; ctx.setLineDash([4,4]); ctx.lineWidth=1
      const lo=H-((4-2)/(22-2))*(H*.75)-H*.1
      const hi=H-((16-2)/(22-2))*(H*.75)-H*.1
      ctx.beginPath(); ctx.moveTo(0,lo); ctx.lineTo(W,lo); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0,hi); ctx.lineTo(W,hi); ctx.stroke()
      ctx.setLineDash([])

      // labels
      ctx.fillStyle='rgba(6,182,212,.7)'; ctx.font=`bold ${W*.022}px monospace`; ctx.textAlign='left'
      ctx.fillText(`EDA ${v.toFixed(1)}μS`,8,20)
      ctx.fillStyle='rgba(34,197,94,.7)'; ctx.font=`${W*.018}px monospace`
      ctx.fillText('정상(4-16μS)',8,H-8)

      // progress bar (capturing)
      if(phase==='capturing'){
        ctx.fillStyle='rgba(6,182,212,.18)'; ctx.fillRect(0,H-4,W*(pct/100),4)
        ctx.fillStyle='rgba(6,182,212,.9)';  ctx.fillRect(0,H-4,W*(pct/100),4)
      }

      hRef.current++; t++
      rafRef.current=requestAnimationFrame(draw)
    }
    draw(); return ()=>cancelAnimationFrame(rafRef.current??0)
  },[phase,pct])

  useEffect(()=>{
    if(phase!=='capturing')return
    let p=0; const iv=setInterval(()=>{
      p+=1.2; setPct(Math.floor(p))
      if(p>=100){
        clearInterval(iv)
        const conductance   = rngF(5,14,1)
        const stressIndex   = rng(32,80)
        const tensionLevel  = rng(30,82)
        const relaxationScore = rng(40,78)
        const ansBalance    = rng(28,62)
        setRes({ conductance, stressIndex, tensionLevel, relaxationScore, ansBalance })
        setPhase('done')
      }
    },70)
    return ()=>clearInterval(iv)
  },[phase])

  return (
    <div className="space-y-4">
      <div className="relative rounded-2xl overflow-hidden" style={{aspectRatio:'16/9',maxHeight:280,background:'#020f14'}}>
        <canvas ref={cvRef} width={560} height={320} className="w-full h-full"/>
        {phase==='capturing'&&<div className="absolute bottom-5 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm"><div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"/><span className="text-[10px] text-cyan-300">EDA 측정 중 {pct}%</span></div>}
        {phase==='done'&&<div className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/80 backdrop-blur-sm"><CheckCircle2 className="w-3 h-3 text-white"/><span className="text-[10px] text-white font-medium">측정 완료</span></div>}
      </div>

      {phase==='capturing'&&<div className="h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-75" style={{width:`${pct}%`}}/></div>}

      {phase==='done'&&res&&(
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {([
            ['전도도', res.conductance.toFixed(1)+'μS', res.conductance>=4&&res.conductance<=16],
            ['스트레스', res.stressIndex+'점',           res.stressIndex<65],
            ['긴장도',   res.tensionLevel+'점',          res.tensionLevel<70],
            ['이완도',   res.relaxationScore+'점',       res.relaxationScore>=55],
            ['부교감',   res.ansBalance+'%',             res.ansBalance>=45],
          ] as [string,string,boolean][]).map(([l,v,ok])=>(
            <div key={l} className="rounded-xl p-2.5 text-center" style={{background:'rgba(248,244,246,.8)',border:'1px solid rgba(6,182,212,.15)'}}>
              <div className={cn('text-lg font-bold font-display',ok?'text-green-600':'text-amber-500')}>{v}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      )}

      <div className="text-center text-sm text-slate-500 min-h-[28px]">
        {phase==='idle'&&'손가락 센서를 착용하고 피부 전도도 측정을 시작합니다'}
        {phase==='capturing'&&'⚡ EDA 측정 중 — 편안하게 안정을 유지해 주세요...'}
        {phase==='done'&&'✅ EDA 피부전도 분석 완료!'}
      </div>

      {phase==='idle'&&<button onClick={()=>setPhase('capturing')} className="w-full btn-primary py-3 rounded-2xl text-sm flex items-center justify-center gap-2"><Zap className="w-4 h-4"/>EDA 측정 시작</button>}
      {phase==='done'&&<button onClick={()=>onDone(res!)} className="w-full btn-primary py-3 rounded-2xl text-sm flex items-center justify-center gap-2">다음 단계: 바이오신호<ChevronRight className="w-4 h-4"/></button>}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   STEP 4 — BIO SIGNAL
══════════════════════════════════════════════════════════════════ */

type BioPhase='idle'|'measuring'|'sleep'|'done'

function ecgVal(x:number):number {
  const p=0.28*Math.exp(-((x-.18)**2)/.01)
  const q=-0.12*Math.exp(-((x-.44)**2)/.0009)
  const r=1.1 *Math.exp(-((x-.5)**2)/.0009)
  const s=-0.28*Math.exp(-((x-.56)**2)/.0009)
  const tw=0.38*Math.exp(-((x-.72)**2)/.014)
  return p+q+r+s+tw
}

function BioStep({ onDone }:{ onDone:(d:MultimodalData['biosignal'])=>void }) {
  const cvRef  = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>()
  const [phase,setPhase]=useState<BioPhase>('idle')
  const [pct,setPct]=useState(0)
  const [sleep,setSleep]=useState(7.0)
  const [hrv,setHrv]=useState<number|null>(null)
  const [hr,setHr]=useState<number|null>(null)
  const [res,setRes]=useState<MultimodalData['biosignal']|null>(null)

  useEffect(()=>{
    if(phase!=='measuring') return
    const cv=cvRef.current!; const ctx=cv.getContext('2d')!
    const W=cv.width, H=cv.height
    let t=0, speed=0.018

    function draw(){
      ctx.fillStyle='rgba(6,4,18,.85)'; ctx.fillRect(0,0,W,H)
      // grid
      ctx.strokeStyle='rgba(34,197,94,.06)'; ctx.lineWidth=.5
      for(let y=0;y<H;y+=20){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }
      for(let x=0;x<W;x+=20){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }

      // ECG trace
      ctx.beginPath()
      for(let i=0;i<W;i++){
        const tx=((t-i*.003+100)%1)
        const v=ecgVal(tx)
        const px=i, py=H*.5-v*(H*.32)
        i===0?ctx.moveTo(px,py):ctx.lineTo(px,py)
      }
      ctx.strokeStyle='rgba(34,197,94,.9)'; ctx.lineWidth=1.8; ctx.stroke()

      // Glow on most recent beat
      const glowX=W*.85, glowTx=((t-glowX*.003+100)%1)
      const glowV=ecgVal(glowTx)
      if(glowV>0.9){
        ctx.beginPath(); ctx.arc(glowX,H*.5-glowV*(H*.32),5,0,Math.PI*2)
        ctx.fillStyle='rgba(34,197,94,.9)'; ctx.fill()
        const gr=ctx.createRadialGradient(glowX,H*.5-glowV*(H*.32),0,glowX,H*.5-glowV*(H*.32),18)
        gr.addColorStop(0,'rgba(34,197,94,.5)'); gr.addColorStop(1,'transparent')
        ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(glowX,H*.5-glowV*(H*.32),18,0,Math.PI*2); ctx.fill()
      }

      // HR counter
      const targetHR=rng(62,82); const dispHR=hr??Math.floor(targetHR*(pct/100))
      ctx.fillStyle='rgba(34,197,94,.9)'; ctx.font=`bold ${W*.095}px monospace`; ctx.textAlign='left'
      ctx.fillText(`${dispHR}`,W*.05,H*.3)
      ctx.fillStyle='rgba(255,255,255,.4)'; ctx.font=`${W*.035}px monospace`
      ctx.fillText('BPM',W*.05,H*.45)

      // HRV counter
      const targetHRV=rng(32,56); const dispHRV=hrv??Math.floor(targetHRV*(pct/100))
      ctx.fillStyle='rgba(59,130,246,.9)'; ctx.font=`bold ${W*.07}px monospace`; ctx.textAlign='right'
      ctx.fillText(`${dispHRV}`,W*.9,H*.3)
      ctx.fillStyle='rgba(255,255,255,.4)'; ctx.font=`${W*.035}px monospace`
      ctx.fillText('HRV ms',W*.9,H*.45)

      t+=speed*W
      rafRef.current=requestAnimationFrame(draw)
    }
    draw(); return ()=>cancelAnimationFrame(rafRef.current??0)
  },[phase,pct,hr,hrv])

  useEffect(()=>{
    if(phase!=='measuring')return
    const finalHR=rng(62,82), finalHRV=rng(32,56)
    let p=0; const iv=setInterval(()=>{
      p+=1.5; setPct(Math.floor(p))
      if(p>=100){ clearInterval(iv); setHr(finalHR); setHrv(finalHRV); setPhase('sleep') }
    },65)
    return ()=>clearInterval(iv)
  },[phase])

  function handleSleepDone(){
    const weight = rngF(52, 72, 1)
    const bmi    = parseFloat((weight / (1.63 * 1.63)).toFixed(1))
    const r:MultimodalData['biosignal']={ hrv:hrv!, sleepHours:sleep, heartRate:hr!, weight, bmi }
    setRes(r); setPhase('done')
  }

  return (
    <div className="space-y-4">
      {/* ECG canvas */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-950" style={{aspectRatio:'16/7',maxHeight:200}}>
        <canvas ref={cvRef} width={540} height={230} className="w-full h-full"/>
        {phase==='idle'&&<div className="absolute inset-0 flex items-center justify-center"><p className="text-xs text-slate-500">스캔 시작 후 ECG 파형이 표시됩니다</p></div>}
        {phase==='measuring'&&<div className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm"><div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/><span className="text-[10px] text-green-300">측정 중 {pct}%</span></div>}
      </div>

      {phase==='measuring'&&<div className="h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-green-400 to-emerald-600 rounded-full transition-all duration-75" style={{width:`${pct}%`}}/></div>}

      {/* Sleep input */}
      {(phase==='sleep'||phase==='done') && (
        <div className="glass-card-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">어젯밤 수면 시간</p>
            <span className="text-xl font-bold font-display text-indigo-600">{sleep.toFixed(1)}h</span>
          </div>
          <input type="range" min={2} max={12} step={0.5} value={sleep} onChange={e=>setSleep(parseFloat(e.target.value))} className="w-full"
            style={{background:`linear-gradient(to right,#6366f1 0%,#6366f1 ${(sleep-2)/10*100}%,#fce7f3 ${(sleep-2)/10*100}%,#fce7f3 100%)`}}/>
          <div className="flex justify-between text-xs text-slate-400"><span>2h</span><span className={cn(sleep>=7?'text-green-600':sleep>=6?'text-amber-500':'text-rose-600','font-semibold')}>{sleep>=7?'충분':'부족'}</span><span>12h</span></div>
        </div>
      )}

      {/* Results */}
      {phase==='done'&&res&&(
        <div className="grid grid-cols-3 gap-2">
          {[['HRV',`${res.hrv}ms`,res.hrv>=38],['수면',`${res.sleepHours}h`,res.sleepHours>=7],['심박수',`${res.heartRate}bpm`,res.heartRate>=55&&res.heartRate<=85]].map(([l,v,ok])=>(
            <div key={String(l)} className="rounded-xl p-2.5 text-center" style={{background:'rgba(248,244,246,.8)',border:'1px solid rgba(244,63,117,.15)'}}>
              <div className={cn('text-xl font-bold font-display',ok?'text-green-600':'text-amber-500')}>{v}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      )}

      <div className="text-center text-sm text-slate-500 min-h-[28px]">
        {phase==='idle'&&'손가락 또는 PPG 센서를 연결하여 측정합니다'}
        {phase==='measuring'&&'💓 심박수·HRV 측정 중 — 안정 상태를 유지해 주세요...'}
        {phase==='sleep'&&'어젯밤 수면 시간을 입력해 주세요'}
        {phase==='done'&&'✅ 바이오신호 측정 완료!'}
      </div>

      {phase==='idle'&&<button onClick={()=>setPhase('measuring')} className="w-full btn-primary py-3 rounded-2xl text-sm flex items-center justify-center gap-2"><Activity className="w-4 h-4"/>바이오신호 측정 시작</button>}
      {phase==='sleep'&&<button onClick={handleSleepDone} className="w-full btn-primary py-3 rounded-2xl text-sm flex items-center justify-center gap-2">확인 — 분석 완료<ChevronRight className="w-4 h-4"/></button>}
      {phase==='done'&&<button onClick={()=>onDone(res!)} className="w-full btn-primary py-3 rounded-2xl text-sm flex items-center justify-center gap-2">분석 완료 — 결과 확인<ArrowRight className="w-4 h-4"/></button>}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   STEP 5 — COMPLETE
══════════════════════════════════════════════════════════════════ */

function CompleteStep({ results }:{ results:MultimodalData }) {
  const irisAvg=Math.round((results.iris.leftScore+results.iris.rightScore)/2)
  return (
    <div className="space-y-5 text-center py-2">
      {/* animated LUDIA brain */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{background:'linear-gradient(135deg,#0f0810,#2d1129)',boxShadow:'0 0 40px rgba(244,63,117,.35)'}}>
            <Scan className="w-10 h-10 text-rose-300"/>
          </div>
          <div className="absolute inset-0 rounded-3xl animate-ping" style={{background:'rgba(244,63,117,.1)'}}/>
          <CheckCircle2 className="absolute -bottom-2 -right-2 w-8 h-8 text-green-500 bg-white rounded-full p-0.5"/>
        </div>
      </div>

      <div>
        <div className="text-xs font-black tracking-[.2em] mb-1" style={{background:'linear-gradient(135deg,#d4af37,#b8962e,#e8d07a)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>LUDIA SCAN COMPLETE</div>
        <h3 className="font-display text-xl font-semibold text-slate-800">4-Way 진단 완료!</h3>
        <p className="text-sm text-slate-400 mt-1">홍채 · 열화상 · EDA · 바이오신호 분석 결과가 LUDIA에 저장됐어요</p>
      </div>

      {/* summary */}
      <div className="grid grid-cols-2 gap-2 text-left">
        {[
          { icon:Eye, label:'홍채 분석', val:`평균 ${irisAvg}점`, ok:irisAvg>=70, color:'#a855f7' },
          { icon:Thermometer, label:'자궁 온도', val:`${results.thermal.uterineTemp.toFixed(1)}°C`, ok:results.thermal.uterineTemp>=36.2, color:'#f97316' },
          { icon:Zap,   label:'EDA 스트레스',  val:`${results.eda.stressIndex}/100`, ok:results.eda.stressIndex<65, color:'#06b6d4' },
          { icon:Activity, label:'HRV', val:`${results.biosignal.hrv}ms`, ok:results.biosignal.hrv>=38, color:'#f43f75' },
        ].map(({icon:Icon,label,val,ok,color})=>(
          <div key={label} className="glass-card-sm p-3 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:color+'18'}}>
              <Icon className="w-3.5 h-3.5" style={{color}}/>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400">{label}</p>
              <p className={cn('text-sm font-bold',ok?'text-green-600':'text-amber-600')}>{val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Link href="/consultant" className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
          style={{background:'linear-gradient(135deg,#f43f75,#e11d5a)',boxShadow:'0 4px 16px rgba(244,63,117,.35)'}}>
          <MessageCircleHeart className="w-4 h-4"/> AI 상담 시작
        </Link>
        <Link href="/diagnostic" className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all hover:opacity-90 active:scale-95"
          style={{background:'rgba(248,244,246,.9)',border:'1.5px solid rgba(244,63,117,.2)',color:'#e11d5a'}}>
          <BarChart2 className="w-4 h-4"/> 상세 결과 보기
        </Link>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   MAIN WIZARD
══════════════════════════════════════════════════════════════════ */

export function ScanWizard() {
  const [step,setStep]=useState(0)   // 0=intro, 1-4=steps, 5=complete
  const [results,setResults]=useState<Partial<MultimodalData>>({})
  const { setData }=useMultimodalData()

  function save(key:keyof MultimodalData, val:MultimodalData[keyof MultimodalData]) {
    const next={ ...results, [key]:val } as MultimodalData
    setResults(next)
    if(Object.keys(next).length===4) {
      setData(next as MultimodalData)
      setStep(5)
    } else {
      setStep(s=>s+1)
    }
  }

  const stepMeta = step>=1&&step<=4 ? STEPS[step-1] : null

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Top bar ── */}
      <div className="flex-shrink-0 px-4 sm:px-6 pt-5 pb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{background:'linear-gradient(135deg,#0f0810,#2d1129)',boxShadow:'0 3px 16px rgba(244,63,117,.25)'}}>
            <Scan className="w-5 h-5 text-rose-300"/>
          </div>
          <div>
            <div className="text-xs font-black tracking-[.18em]" style={{background:'linear-gradient(135deg,#d4af37,#b8962e,#e8d07a)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>LUDIA</div>
            <h1 className="font-display text-xl font-semibold text-slate-800 leading-tight">멀티모달 진단 스캔</h1>
          </div>
        </div>

        {/* Step progress */}
        {step>0&&step<5&&(
          <div className="flex items-center gap-1 mb-1">
            {STEPS.map((s,i)=>(
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex-1 flex flex-col items-center gap-1">
                  <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all',
                    step>s.id?'text-white':step===s.id?'text-white ring-2 ring-offset-2':'text-slate-400 bg-slate-100')}
                    style={step>=s.id?{background:s.color,boxShadow:`0 2px 8px ${s.color}50`}:{}}>
                    {step>s.id?<CheckCircle2 className="w-4 h-4"/>:s.id}
                  </div>
                  <span className={cn('text-[9px] font-medium text-center',step>=s.id?'text-slate-700':'text-slate-400')}>{s.label}</span>
                </div>
                {i<STEPS.length-1&&<div className={cn('h-0.5 flex-1 mx-1 rounded-full',step>s.id?'bg-rose-300':'bg-slate-200')}/>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 px-4 sm:px-6 pb-6">
        {/* Intro */}
        {step===0&&(
          <div className="glass-card p-6 sm:p-8 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{background:'linear-gradient(135deg,#0f0810,#2d1129)',boxShadow:'0 4px 24px rgba(244,63,117,.3)'}}>
              <Scan className="w-8 h-8 text-rose-300"/>
            </div>
            <h2 className="font-display text-2xl font-semibold text-slate-800 mb-2">4-Way 진단 시작</h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">홍채 3D · 열화상 · EDA 피부전도 · 바이오신호를 순서대로 측정해 LUDIA AI가 종합 분석합니다</p>
            <div className="space-y-2.5 mb-6">
              {STEPS.map(s=>{
                const Icon=s.icon
                return (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl text-left" style={{background:'rgba(248,244,246,.7)',border:`1px solid ${s.color}20`}}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:s.color+'18'}}>
                      <Icon className="w-4 h-4" style={{color:s.color}}/>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Step {s.id} — {s.label}</p>
                      <p className="text-[10px] text-slate-400">
                        {s.id===1?'홍채 3D 스캔으로 장기 밀도 분석':s.id===2?'자궁·난소 부위 체온 분포 측정':s.id===3?'피부 전도도로 스트레스·자율신경 분석':'HRV·심박수·수면 데이터 측정'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            <button onClick={()=>setStep(1)} className="w-full btn-primary py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2">
              <Scan className="w-4 h-4"/> 진단 시작하기
            </button>
          </div>
        )}

        {step>=1&&step<=4&&(
          <div className="glass-card p-4 sm:p-5 max-w-lg mx-auto">
            {stepMeta&&(
              <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-rose-100/60">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:stepMeta.color+'18'}}>
                  {<stepMeta.icon className="w-4.5 h-4.5" style={{color:stepMeta.color}}/>}
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Step {stepMeta.id} / 4</p>
                  <p className="text-base font-semibold text-slate-700">{stepMeta.label}</p>
                </div>
              </div>
            )}
            {step===1&&<IrisStep    onDone={d=>save('iris',d)}/>}
            {step===2&&<ThermalStep onDone={d=>save('thermal',d)}/>}
            {step===3&&<EDAStep     onDone={d=>save('eda',d)}/>}
            {step===4&&<BioStep     onDone={d=>save('biosignal',d)}/>}
          </div>
        )}

        {step===5&&results.iris&&results.thermal&&results.eda&&results.biosignal&&(
          <div className="glass-card p-5 sm:p-6 max-w-md mx-auto">
            <CompleteStep results={results as MultimodalData}/>
          </div>
        )}
      </div>
    </div>
  )
}
