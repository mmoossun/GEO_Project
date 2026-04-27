'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, ChevronDown, ArrowRight, Clock, TrendingUp, BarChart3, Sparkles } from 'lucide-react'
import { CATEGORIES } from '@/lib/constants'
import { getHistory, formatDate } from '@/lib/utils'
import type { HistoryEntry } from '@/lib/types'
import { cn } from '@/lib/utils'

interface LandingScreenProps {
  onAnalyze: (serviceName: string, category: string, url?: string) => void
  isLoading: boolean
}

const GRADE_COLORS: Record<string, string> = {
  S: 'text-purple-600 bg-purple-50',
  A: 'text-green-600 bg-green-50',
  B: 'text-blue-600 bg-blue-50',
  C: 'text-yellow-600 bg-yellow-50',
  D: 'text-orange-600 bg-orange-50',
  F: 'text-red-600 bg-red-50',
}

export function LandingScreen({ onAnalyze, isLoading }: LandingScreenProps) {
  const [serviceName, setServiceName] = useState('')
  const [category, setCategory] = useState('')
  const [url, setUrl] = useState('')
  const [showUrl, setShowUrl] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  useEffect(() => {
    setHistory(getHistory().slice(0, 5))
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!serviceName.trim() || !category) return
    onAnalyze(serviceName.trim(), category, url.trim() || undefined)
  }

  const selectedCat = CATEGORIES.find(c => c.value === category)
  const isValid = serviceName.trim().length > 0 && category.length > 0

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex flex-col">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
            <BarChart3 size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-base">GEO Score</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/url-analyzer"
            className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <span className="text-sm leading-none">🔍</span>
            <span className="hidden sm:inline">URL 분석</span>
          </Link>
          <Link
            href="/studio"
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <span className="text-sm leading-none">🎨</span>
            <span className="hidden sm:inline">스튜디오</span>
          </Link>
          <Link
            href="/generate"
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Sparkles size={13} />
            <span className="hidden sm:inline">생성기</span>
          </Link>
          <a
            href="https://arxiv.org/abs/2311.09735"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors hidden sm:block"
          >
            Princeton KDD 2024
          </a>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-800 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-800 animate-pulse" />
              AI 검색 시대의 새로운 기준
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 text-center leading-tight mb-3">
            내 서비스, AI 검색에서<br />
            <span className="text-gray-900">얼마나 잘 보이나요?</span>
          </h1>
          <p className="text-center text-gray-500 text-sm mb-8">
            서비스 이름과 카테고리만 입력하면 ChatGPT · Perplexity · Gemini 인용 가능성을 30초 안에 분석해 드립니다.
          </p>

          {/* Form Card */}
          <div className="bg-white rounded-lg border border-gray-100 p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Service Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  서비스 이름 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={e => setServiceName(e.target.value)}
                  placeholder="예) 토스, 당근마켓, 쿠팡..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
                  disabled={isLoading}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  서비스 카테고리 <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className={cn(
                      'w-full px-4 py-3 border rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition bg-white pr-10',
                      category ? 'border-gray-200 text-gray-900' : 'border-gray-200 text-gray-400'
                    )}
                    disabled={isLoading}
                  >
                    <option value="">카테고리 선택...</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.emoji} {cat.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {selectedCat && (
                  <p className="mt-1.5 text-xs text-gray-400">
                    {selectedCat.emoji} {selectedCat.label} 업계 평균 GEO 점수: <span className="font-semibold text-gray-600">{selectedCat.avgScore}점</span>
                  </p>
                )}
              </div>

              {/* URL (Optional) */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowUrl(s => !s)}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-900 hover:text-gray-800 transition-colors"
                >
                  <span>{showUrl ? '▼' : '▶'}</span>
                  웹사이트 URL 추가 (선택사항 · 더 정확한 분석)
                </button>
                {showUrl && (
                  <div className="mt-2">
                    <input
                      type="url"
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
                      disabled={isLoading}
                    />
                    <p className="mt-1 text-xs text-gray-400">URL을 입력하면 해당 도메인의 특성을 반영해 분석합니다.</p>
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!isValid || isLoading}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all',
                  isValid && !isLoading
                    ? 'bg-gray-900 hover:bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    분석 중...
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    GEO 점수 무료 분석하기
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { value: '5가지', label: '분석 차원' },
              { value: '100점', label: '만점 기준' },
              { value: '30초', label: '분석 소요 시간' },
            ].map((stat, i) => (
              <div key={i} className="bg-white/60 rounded-xl p-3 text-center border border-white">
                <p className="font-bold text-gray-900 text-base">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="w-full max-w-xl mt-8">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">최근 분석 이력</span>
            </div>
            <div className="space-y-2">
              {history.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => {
                    setServiceName(entry.serviceName)
                    setCategory(entry.category)
                    // Auto-trigger analysis after state updates
                    setTimeout(() => onAnalyze(entry.serviceName, entry.category), 50)
                  }}
                  className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100 hover:border-gray-200 hover:bg-gray-50/30 transition-all text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-800 truncate">{entry.serviceName}</span>
                      <span className="text-xs text-gray-400">{entry.categoryLabel}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(entry.analyzedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn('text-sm font-bold px-2.5 py-1 rounded-full', GRADE_COLORS[entry.grade] ?? 'text-gray-600 bg-gray-50')}>
                      {entry.totalScore}점
                    </span>
                    <TrendingUp size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom note */}
      <footer className="text-center pb-6">
        <p className="text-xs text-gray-400">
          GEO Score · 무료 서비스 · 개인정보 수집 없음
        </p>
      </footer>
    </div>
  )
}
