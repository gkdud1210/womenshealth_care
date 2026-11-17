'use client'

import { Brain } from 'lucide-react'
import { DiagnosticSubPage } from '@/components/diagnostic/DiagnosticSubPage'
import { PsycheDetail } from '@/components/diagnostic/PsycheView'
import { BmiGauge } from '@/components/diagnostic/DiagnosticCharts'

// 홍채 심리 — 안정·균형 ↔ 긴장·과부하 중 내 위치와 8가지 타입
export default function DiagnosticPsychePage() {
  return (
    <DiagnosticSubPage title="홍채 심리" icon={<Brain className="w-5 h-5" />}>
      {({ data, sessions }) => (
        <div className="space-y-4">
          <PsycheDetail data={data} sessions={sessions} scanHref="/diagnostic/scan" />
          <BmiGauge bmi={data.biosignal.bmi} weight={data.biosignal.weight} />
        </div>
      )}
    </DiagnosticSubPage>
  )
}
