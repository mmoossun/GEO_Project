'use client'

import { useEffect, useState } from 'react'
import { getCategoryInfo } from '@/lib/constants'

const STEPS = [
  { label: '서비스 정보 수집 중...', duration: 800 },
  { label: 'AI 업계 데이터 분석 중...', duration: 1200 },
  { label: 'GEO 5가지 차원 점수 계산 중...', duration: 1500 },
  { label: '최적화 권고안 생성 중...', duration: 1000 },
  { label: '리포트 완성 중...', duration: 500 },
]

interface AnalyzingScreenProps {
  serviceName: string
  category: string
}

export function AnalyzingScreen({ serviceName, category }: AnalyzingScreenProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const catInfo = getCategoryInfo(category)

  useEffect(() => {
    let current = 0
    const totalDuration = STEPS.reduce((s, step) => s + step.duration, 0)
    let elapsed = 0

    const interval = setInterval(() => {
      elapsed += 80
      setProgress(Math.min((elapsed / totalDuration) * 100, 95))

      let acc = 0
      for (let i = 0; i < STEPS.length; i++) {
        acc += STEPS[i].duration
        if (elapsed < acc) {
          if (i !== current) {
            current = i
            setStepIndex(i)
          }
          break
        }
      }
    }, 80)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-[#F0F4FF] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {/* Animated Icon */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 animate-ping opacity-20" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 animate-pulse opacity-40" />
          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center">
            <span className="text-2xl">{catInfo.emoji}</span>
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-1">
          <span className="text-indigo-600">{serviceName}</span> 분석 중
        </h2>
        <p className="text-sm text-gray-500 mb-8">
          {catInfo.label} 업계 기준으로 GEO 점수를 산출하고 있어요
        </p>

        {/* Progress Bar */}
        <div className="bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-2 mt-6">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className={`flex items-center gap-2.5 text-sm transition-all duration-300 ${
                i < stepIndex
                  ? 'text-green-600'
                  : i === stepIndex
                    ? 'text-indigo-600 font-semibold'
                    : 'text-gray-300'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border transition-all">
                {i < stepIndex ? (
                  <span className="text-green-600 border-green-400 w-full h-full rounded-full border flex items-center justify-center">✓</span>
                ) : i === stepIndex ? (
                  <span className="w-full h-full rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                ) : (
                  <span className="text-gray-300 border-gray-200 w-full h-full rounded-full border flex items-center justify-center">{i + 1}</span>
                )}
              </span>
              <span>{step.label}</span>
            </div>
          ))}
        </div>

        {/* Fun fact */}
        <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-left">
          <p className="text-xs font-semibold text-indigo-700 mb-1">💡 알고 계셨나요?</p>
          <p className="text-xs text-indigo-600 leading-relaxed">
            통계 데이터를 포함한 콘텐츠는 그렇지 않은 콘텐츠보다 AI 검색 인용율이 <strong>41% 높습니다</strong>. (프린스턴 GEO 연구, 2024)
          </p>
        </div>
      </div>
    </div>
  )
}
