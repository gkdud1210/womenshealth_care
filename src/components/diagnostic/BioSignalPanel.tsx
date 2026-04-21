'use client'

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
  AreaChart, Area, CartesianGrid
} from 'recharts'
import { Heart, Moon, Zap, Scale, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

const HRV_DATA = [
  { day: '월', hrv: 38, hr: 72 },
  { day: '화', hrv: 42, hr: 70 },
  { day: '수', hrv: 35, hr: 75 },
  { day: '목', hrv: 45, hr: 68 },
  { day: '금', hrv: 40, hr: 71 },
  { day: '토', hrv: 48, hr: 66 },
  { day: '일', hrv: 44, hr: 69 },
]

const SLEEP_DATA = [
  { day: '월', hours: 6.5, quality: 6 },
  { day: '화', hours: 7.5, quality: 8 },
  { day: '수', hours: 5.5, quality: 5 },
  { day: '목', hours: 8.0, quality: 9 },
  { day: '금', hours: 7.0, quality: 7 },
  { day: '토', hours: 8.5, quality: 9 },
  { day: '일', hours: 7.5, quality: 8 },
]

const WEIGHT_DATA = [
  { day: '4/15', w: 58.4 },
  { day: '4/16', w: 58.2 },
  { day: '4/17', w: 58.5 },
  { day: '4/18', w: 58.1 },
  { day: '4/19', w: 57.9 },
  { day: '4/20', w: 58.2 },
  { day: '4/21', w: 58.0 },
]

const RADAR_DATA = [
  { axis: '수면', value: 78 },
  { axis: 'HRV', value: 72 },
  { axis: '체력', value: 65 },
  { axis: '순환', value: 58 },
  { axis: '면역', value: 74 },
  { axis: '호르몬', value: 63 },
]

function Trend({ current, prev }: { current: number; prev: number }) {
  const diff = current - prev
  if (Math.abs(diff) < 0.5) return <Minus className="w-4 h-4 text-slate-400" />
  return diff > 0
    ? <TrendingUp className="w-4 h-4 text-green-500" />
    : <TrendingDown className="w-4 h-4 text-red-400" />
}

export function BioSignalPanel() {
  const latestHRV = HRV_DATA[HRV_DATA.length - 1]
  const prevHRV = HRV_DATA[HRV_DATA.length - 2]
  const latestSleep = SLEEP_DATA[SLEEP_DATA.length - 1]
  const latestWeight = WEIGHT_DATA[WEIGHT_DATA.length - 1]
  const prevWeight = WEIGHT_DATA[WEIGHT_DATA.length - 2]

  return (
    <div className="space-y-5">
      {/* Top KPI row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            icon: Heart,
            label: '심박수',
            value: `${latestHRV.hr}`,
            unit: 'bpm',
            subValue: `HRV ${latestHRV.hrv}ms`,
            color: 'text-rose-500',
            bg: 'bg-rose-50',
            trend: <Trend current={latestHRV.hrv} prev={prevHRV.hrv} />,
          },
          {
            icon: Moon,
            label: '수면',
            value: `${latestSleep.hours}`,
            unit: '시간',
            subValue: `수면 질 ${latestSleep.quality}/10`,
            color: 'text-indigo-500',
            bg: 'bg-indigo-50',
            trend: null,
          },
          {
            icon: Scale,
            label: '체중',
            value: `${latestWeight.w}`,
            unit: 'kg',
            subValue: 'BMI 22.1',
            color: 'text-amber-500',
            bg: 'bg-amber-50',
            trend: <Trend current={latestWeight.w} prev={prevWeight.w} />,
          },
        ].map(({ icon: Icon, label, value, unit, subValue, color, bg, trend }) => (
          <div key={label} className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', bg)}>
                <Icon className={cn('w-4 h-4', color)} />
              </div>
              {trend}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-display text-slate-800">{value}</span>
              <span className="text-xs text-slate-400">{unit}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            <p className="text-[10px] text-slate-400 mt-1">{subValue}</p>
          </div>
        ))}
      </div>

      {/* HRV + Sleep Charts */}
      <div className="grid grid-cols-2 gap-4">
        {/* HRV Trend */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-rose-400" />
            <span className="text-sm font-semibold text-slate-700">HRV 주간 트렌드</span>
          </div>
          <ResponsiveContainer width="100%" height={110}>
            <AreaChart data={HRV_DATA} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="hrvGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f75" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f75" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[25, 60]} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #fce7f3', fontSize: 12 }}
                formatter={(v) => [`${v}ms`, 'HRV']}
              />
              <ReferenceLine y={40} stroke="#22c55e" strokeDasharray="3 3" strokeWidth={1} />
              <Area type="monotone" dataKey="hrv" stroke="#f43f75" strokeWidth={2} fill="url(#hrvGrad)" dot={{ r: 3, fill: '#f43f75' }} />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-slate-400 mt-1">— 정상 기준선 (40ms)</p>
        </div>

        {/* Sleep Chart */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Moon className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-semibold text-slate-700">수면 패턴</span>
          </div>
          <ResponsiveContainer width="100%" height={110}>
            <AreaChart data={SLEEP_DATA} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[4, 10]} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e0e7ff', fontSize: 12 }}
                formatter={(v) => [`${v}시간`, '수면']}
              />
              <ReferenceLine y={7} stroke="#22c55e" strokeDasharray="3 3" strokeWidth={1} />
              <Area type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={2} fill="url(#sleepGrad)" dot={{ r: 3, fill: '#6366f1' }} />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-slate-400 mt-1">— 권장 수면 (7시간)</p>
        </div>
      </div>

      {/* Radar + Weight */}
      <div className="grid grid-cols-2 gap-4">
        {/* Wellness Radar */}
        <div className="glass-card p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">웰니스 레이더</p>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={RADAR_DATA}>
              <PolarGrid stroke="#fce7f3" />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Radar
                name="현재"
                dataKey="value"
                stroke="#f43f75"
                fill="#f43f75"
                fillOpacity={0.2}
                strokeWidth={2}
                dot={{ r: 3, fill: '#f43f75' }}
              />
              <Tooltip formatter={(v) => [`${v}점`, '']} contentStyle={{ borderRadius: '12px', fontSize: 12 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Weight trend */}
        <div className="glass-card p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">체중 트렌드</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={WEIGHT_DATA} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#fef3c7" />
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <YAxis domain={[57, 59]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #fef3c7', fontSize: 12 }}
                formatter={(v) => [`${v}kg`, '체중']}
              />
              <Line type="monotone" dataKey="w" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: '#f59e0b' }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-2 pt-2 border-t border-amber-100 flex justify-between text-xs">
            <span className="text-slate-400">BMI</span>
            <span className="font-semibold text-slate-700">22.1 <span className="text-green-500 font-normal">(정상)</span></span>
          </div>
        </div>
      </div>
    </div>
  )
}
