// 미네랄 5가지를 하루 권장량 대비 막대로 보여줘요 (루디아피드 영양 분석 · 루디아 헬스 식단 분석 공용)

import { MINERAL_DAILY, MINERAL_KEYS, MINERAL_META, fmtMg, type Minerals } from '@/lib/minerals'

export default function MineralBars({ minerals, title = '미네랄', note = '하루 권장량 대비 · 성인 여성 기준', className = '' }: {
  minerals: Minerals
  title?: string
  note?: string
  className?: string
}) {
  return (
    <div className={`rounded-xl bg-white/80 px-3 py-2.5 ${className}`}>
      <div className="flex items-baseline justify-between mb-1.5">
        <p className="text-[11.5px] font-bold text-slate-600">{title}</p>
        <p className="text-[10px] text-slate-400">{note}</p>
      </div>
      <div className="space-y-1.5">
        {MINERAL_KEYS.map(k => {
          const m = MINERAL_META[k]
          const v = minerals[k]
          const pct = Math.round((v / MINERAL_DAILY[k]) * 100)
          return (
            <div key={k} className="flex items-center gap-2">
              <span className="w-14 text-[11.5px] font-semibold text-slate-700 flex-shrink-0">{m.label}</span>
              <div className="flex-1 min-w-0">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(200,200,220,0.35)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: m.color }} />
                </div>
                <p className="text-[9.5px] text-slate-400 mt-0.5 truncate">{m.why}</p>
              </div>
              <span className="w-[74px] text-right text-[11.5px] font-bold text-slate-800 flex-shrink-0">
                {fmtMg(v)}<span className="text-[9.5px] font-semibold text-slate-400">mg</span>
                <span className="ml-1 text-[10px] font-semibold" style={{ color: m.color }}>{pct}%</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
