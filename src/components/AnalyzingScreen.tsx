'use client'

import { useEffect, useState } from 'react'
import { getCategoryInfo } from '@/lib/constants'

// Two parallel tracks shown simultaneously
const GEO_STEPS = [
  { label: 'GEO 기술 신호 분석 중...', duration: 1200 },
  { label: '5가지 차원 점수 계산 중...', duration: 1500 },
  { label: '권고안 생성 중...', duration: 800 },
]

const CITATION_STEPS = [
  { label: 'ChatGPT에 질문 전송 중...', duration: 1000 },
  { label: 'Claude / Gemini 실측 중...', duration: 1800 },
  { label: 'Perplexity 검증 중...', duration: 700 },
]

interface AnalyzingScreenProps {
  serviceName: string
  category: string
}

function TrackStep({ label, status }: { label: string; status: 'done' | 'active' | 'pending' }) {
  return (
    <div className={`flex items-center gap-2.5 text-xs transition-all duration-300 ${
      status === 'done' ? 'text-green-600' : status === 'active' ? 'text-gray-900 font-semibold' : 'text-gray-300'
    }`}>
      <span className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center border">
        {status === 'done'
          ? <span className="text-green-600 w-full h-full rounded-full border border-green-400 flex items-center justify-center text-xs">✓</span>
          : status === 'active'
            ? <span className="w-full h-full rounded-full border-2 border-gray-900 border-t-transparent animate-spin" />
            : <span className="text-gray-300 border-gray-200 w-full h-full rounded-full border flex items-center justify-center" />
        }
      </span>
      <span>{label}</span>
    </div>
  )
}

export function AnalyzingScreen({ serviceName, category }: AnalyzingScreenProps) {
  const [geoStep, setGeoStep] = useState(0)
  const [citStep, setCitStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const catInfo = getCategoryInfo(category)

  useEffect(() => {
    const totalDuration = 5500
    let elapsed = 0

    const interval = setInterval(() => {
      elapsed += 100
      setProgress(Math.min((elapsed / totalDuration) * 100, 96))

      // GEO track timing
      if (elapsed > 1200 && geoStep < 1) setGeoStep(1)
      if (elapsed > 2700 && geoStep < 2) setGeoStep(2)
      if (elapsed > 3500 && geoStep < 3) setGeoStep(3)

      // Citation track timing (slightly offset)
      if (elapsed > 400 && citStep < 1) setCitStep(1)
      if (elapsed > 1400 && citStep < 2) setCitStep(2)
      if (elapsed > 3200 && citStep < 3) setCitStep(3)
    }, 100)

    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Animated Icon */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 animate-ping opacity-20" />
          <div className="absolute inset-1 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 animate-pulse opacity-40" />
          <div className="absolute inset-2 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center">
            <span className="text-2xl">{catInfo.emoji}</span>
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-1">
          <span className="text-gray-900">{serviceName}</span> 종합 분석 중
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          GEO 기술 분석과 AI 실측 테스트를 동시에 진행합니다
        </p>

        {/* Progress Bar */}
        <div className="bg-gray-200 rounded-full h-2 mb-6 overflow-hidden">
          <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-300"
            style={{ width: `${progress}%` }} />
        </div>

        {/* Two parallel tracks */}
        <div className="grid grid-cols-2 gap-3">
          {/* GEO Analysis track */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-left">
            <p className="text-xs font-bold text-gray-800 mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-gray-800 rounded-full animate-pulse" />
              GEO 기술 분석
            </p>
            <div className="space-y-2">
              {GEO_STEPS.map((step, i) => (
                <TrackStep key={i} label={step.label}
                  status={i < geoStep ? 'done' : i === geoStep && geoStep < GEO_STEPS.length ? 'active' : 'pending'} />
              ))}
            </div>
          </div>

          {/* Citation test track */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-left">
            <p className="text-xs font-bold text-gray-800 mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse" />
              AI 실측 테스트
            </p>
            <div className="space-y-2">
              {CITATION_STEPS.map((step, i) => (
                <TrackStep key={i} label={step.label}
                  status={i < citStep ? 'done' : i === citStep && citStep < CITATION_STEPS.length ? 'active' : 'pending'} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 bg-gray-50 border border-gray-200 rounded-xl p-3 text-left">
          <p className="text-xs text-gray-800 leading-relaxed">
            <span className="font-bold">💡 종합 분석이란?</span> GEO 기술 신호(내부)와 AI 검색 실측(외부)을 교차 검증해 점수의 신뢰도를 높입니다. 약 20-30초 소요됩니다.
          </p>
        </div>
      </div>
    </div>
  )
}
