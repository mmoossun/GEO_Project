'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DetailedDashboard } from '@/components/DetailedDashboard'
import type { GEOAnalysisResult } from '@/lib/types'

export default function DetailPage() {
  const router = useRouter()
  const [analysis, setAnalysis] = useState<GEOAnalysisResult | null>(null)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('geo_current')
      if (!saved) { router.push('/'); return }
      setAnalysis(JSON.parse(saved))
    } catch {
      router.push('/')
    }
  }, [router])

  if (!analysis) return (
    <div className="min-h-screen bg-[#F0F4FF] flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500">분석 데이터를 불러오는 중...</p>
      </div>
    </div>
  )

  return <DetailedDashboard analysis={analysis} />
}
