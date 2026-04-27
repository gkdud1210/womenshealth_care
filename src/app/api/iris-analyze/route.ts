import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30  // Next.js route timeout (seconds)

const IRIS_SERVICE = process.env.IRIS_SERVICE_URL ?? 'http://localhost:8001'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })
  }

  // 파일을 버퍼로 읽어두고, 각 시도마다 새 FormData 구성
  const fileBuffer = await file.arrayBuffer()
  const fileName   = file.name || 'iris.jpg'
  const fileType   = file.type || 'image/jpeg'

  for (const endpoint of ['/analyze/detailed', '/analyze']) {
    try {
      const fd = new FormData()
      fd.append('file', new Blob([fileBuffer], { type: fileType }), fileName)

      const res = await fetch(`${IRIS_SERVICE}${endpoint}`, {
        method: 'POST',
        body: fd,
        signal: AbortSignal.timeout(28_000),
      })

      if (!res.ok) continue

      const text = await res.text()
      if (!text) continue

      const data = JSON.parse(text)
      if (data.error) continue

      return NextResponse.json({
        ...data,
        analysisMode: endpoint === '/analyze/detailed' ? 'detailed' : 'basic',
      })
    } catch {
      continue
    }
  }

  return NextResponse.json(
    { error: '홍채 분석 서비스에 연결할 수 없습니다. iris_service.py가 실행 중인지 확인해 주세요.' },
    { status: 503 },
  )
}
