'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DetailedDashboard } from '@/components/DetailedDashboard'
import type { GEOAnalysisResult } from '@/lib/types'
import type { ResponseShare } from '@/app/api/analyze/combined/route'

export default function DetailPage() {
  const router = useRouter()
  const [analysis, setAnalysis] = useState<GEOAnalysisResult | null>(null)
  const [responseShare, setResponseShare] = useState<ResponseShare | null>(null)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('geo_current')
      if (!saved) { router.push('/'); return }
      setAnalysis(JSON.parse(saved))

      const combined = sessionStorage.getItem('geo_combined')
      if (combined) {
        const parsed = JSON.parse(combined)
        if (parsed?.responseShare) setResponseShare(parsed.responseShare)
      }
    } catch {
      router.push('/')
    }
  }, [router])

  if (!analysis) return (
    <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500">분석 데이터를 불러오는 중...</p>
      </div>
    </div>
  )

  return <DetailedDashboard analysis={analysis} responseShare={responseShare} />
}
