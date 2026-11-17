'use client'

import Link from 'next/link'
import { ScanEye, Brain, ChevronRight } from 'lucide-react'
import { DiagnosticSubPage } from '@/components/diagnostic/DiagnosticSubPage'
import { IrisEngineReport } from '@/components/diagnostic/IrisEngineReport'
import { PsycheGauge } from '@/components/diagnostic/PsycheView'
import { analyzePsyche } from '@/lib/iris-psyche'

// 홍채 엔진 리포트 — 엔진이 두 눈에서 찾은 소견·구역·섬유·자율신경 지표
export default function IrisEngineReportPage() {
  return (
    <DiagnosticSubPage title="홍채 엔진 리포트" icon={<ScanEye className="w-5 h-5" />}>
      {({ data, session }) => (
        <div className="space-y-4">
          <IrisEngineReport data={data} />
          {analyzePsyche(data).hasIris && (
            <div className="glass-card p-5">
              <p className="text-sm font-semibold text-slate-700 mb-3">이 결과로 본 심리 상태</p>
              <PsycheGauge r={analyzePsyche(data)} />
              <Link href={`/diagnostic/psyche${session ? `?id=${session.id}` : ''}`}
                className="mt-3 flex items-center justify-center gap-1 py-2.5 rounded-xl text-[12.5px] font-bold text-violet-600 bg-violet-50">
                <Brain className="w-3.5 h-3.5" /> 홍채 심리 자세히 <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}
    </DiagnosticSubPage>
  )
}
