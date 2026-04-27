'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, ChevronDown, ArrowRight, Clock, TrendingUp, BarChart3, Sparkles, Globe } from 'lucide-react'
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

// Mock preview data
const PREVIEW_DIMS = [
  { name: '콘텐츠 구조', score: 17, max: 20, color: '#2563EB' },
  { name: 'E-E-A-T',    score: 22, max: 25, color: '#059669' },
  { name: '기술 신호',   score: 14, max: 20, color: '#D97706' },
  { name: '최신성',      score: 12, max: 15, color: '#059669' },
  { name: '가독성',      score: 19, max: 20, color: '#2563EB' },
]
const PREVIEW_PLATFORMS = [
  { emoji: '🤖', name: 'ChatGPT',    rate: '80%', ok: true,  color: '#10A37F' },
  { emoji: '🔍', name: 'Perplexity', rate: '60%', ok: true,  color: '#20808D' },
  { emoji: '✨', name: 'Gemini',     rate: '40%', ok: true,  color: '#4285F4' },
  { emoji: '🧠', name: 'Claude',     rate: '0%',  ok: false, color: '#EF4444' },
]

export function LandingScreen({ onAnalyze, isLoading }: LandingScreenProps) {
  const [serviceName, setServiceName] = useState('')
  const [category, setCategory] = useState('')
  const [url, setUrl] = useState('')
  const [showUrl, setShowUrl] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  useEffect(() => { setHistory(getHistory().slice(0, 4)) }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!serviceName.trim() || !category) return
    onAnalyze(serviceName.trim(), category, url.trim() || undefined)
  }

  const selectedCat = CATEGORIES.find(c => c.value === category)
  const isValid = serviceName.trim().length > 0 && category.length > 0

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gray-900 flex items-center justify-center flex-shrink-0">
              <BarChart3 size={13} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">GEO Score</span>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/url-analyzer" className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors">
              <Globe size={12} /> URL 분석
            </Link>
            <Link href="/studio" className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors">
              <span>🎨</span> 스튜디오
            </Link>
            <Link href="/generate" className="hidden md:flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors">
              <Sparkles size={12} /> 콘텐츠 생성
            </Link>
            <a href="https://arxiv.org/abs/2311.09735" target="_blank" rel="noopener noreferrer"
              className="hidden lg:block text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              Princeton 연구
            </a>
          </nav>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-5 lg:px-8">
        <div className="lg:grid lg:grid-cols-[460px_1fr] lg:gap-14 xl:gap-20 lg:min-h-[calc(100vh-56px)] lg:items-center">

          {/* ── LEFT: Form ── */}
          <div className="py-10 lg:py-0">

            {/* Badge */}
            <div className="mb-5">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-800 animate-pulse" />
                AI 검색 시대의 새로운 기준
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 leading-tight mb-3">
              내 서비스, AI 검색에서<br />
              얼마나 노출되나요?
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-7">
              서비스명과 카테고리만 입력하면 ChatGPT · Perplexity · Gemini · Claude의 인용 가능성을 30초 안에 분석합니다.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  서비스 이름 <span className="text-red-400 normal-case">*</span>
                </label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={e => setServiceName(e.target.value)}
                  placeholder="예) 토스, 당근마켓, 쿠팡..."
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  카테고리 <span className="text-red-400 normal-case">*</span>
                </label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className={cn(
                      'w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition pr-10',
                      category ? 'text-gray-900' : 'text-gray-400'
                    )}
                    disabled={isLoading}
                  >
                    <option value="">카테고리 선택...</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.emoji} {cat.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {selectedCat && (
                  <p className="mt-1.5 text-xs text-gray-400">
                    {selectedCat.emoji} {selectedCat.label} 업계 평균 <span className="font-semibold text-gray-600">{selectedCat.avgScore}점</span>
                  </p>
                )}
              </div>

              {/* URL toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowUrl(s => !s)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
                >
                  <ChevronDown size={12} className={cn('transition-transform', showUrl && 'rotate-180')} />
                  웹사이트 URL 추가 (선택 · 더 정확한 분석)
                </button>
                {showUrl && (
                  <div className="mt-2">
                    <input
                      type="url"
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition"
                      disabled={isLoading}
                    />
                    <p className="mt-1 text-xs text-gray-400">실제 페이지 HTML을 파싱해 더 정확한 점수를 산출합니다.</p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!isValid || isLoading}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-3.5 rounded-lg font-semibold text-sm transition-all',
                  isValid && !isLoading
                    ? 'bg-gray-900 hover:bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
              >
                {isLoading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />분석 중...</>
                ) : (
                  <><Search size={15} />GEO 점수 무료 분석하기<ArrowRight size={15} /></>
                )}
              </button>
            </form>

            {/* Stats strip */}
            <div className="flex items-center gap-6 mt-6 pt-5 border-t border-gray-200">
              {[
                { value: '5가지', label: '분석 차원' },
                { value: '4개', label: 'AI 플랫폼' },
                { value: '30초', label: '분석 완료' },
                { value: '무료', label: '완전 무료' },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-sm font-extrabold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* History */}
            {history.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-2.5">
                  <Clock size={12} className="text-gray-400" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">최근 분석</span>
                </div>
                <div className="space-y-1.5">
                  {history.map(entry => (
                    <button
                      key={entry.id}
                      onClick={() => setTimeout(() => onAnalyze(entry.serviceName, entry.category), 50)}
                      className="w-full flex items-center gap-3 bg-white rounded-lg px-3.5 py-2.5 border border-gray-100 hover:border-gray-300 transition-all text-left group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-gray-800 truncate">{entry.serviceName}</span>
                          <span className="text-xs text-gray-400 flex-shrink-0">{entry.categoryLabel}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(entry.analyzedAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', GRADE_COLORS[entry.grade] ?? 'text-gray-600 bg-gray-50')}>
                          {entry.totalScore}점
                        </span>
                        <TrendingUp size={13} className="text-gray-300 group-hover:text-gray-600 transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Dashboard Preview (desktop only) ── */}
          <div className="hidden lg:flex items-center justify-center py-12">
            <div className="w-full max-w-lg">
              {/* Preview card */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
                {/* Card header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-bold text-gray-900">토스</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">핀테크</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">방금 분석됨</span>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">A등급</span>
                  </div>
                </div>

                {/* Score metrics */}
                <div className="grid grid-cols-4 divide-x divide-gray-100">
                  {[
                    { label: 'GEO 점수', value: '84', color: '#2563EB' },
                    { label: '인용 확률', value: '71%', color: '#059669' },
                    { label: '응답 점유율', value: '58%', color: '#059669' },
                    { label: '업계 대비', value: '+19', color: '#059669' },
                  ].map((m, i) => (
                    <div key={i} className="px-4 py-3.5">
                      <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide">{m.label}</p>
                      <p className="text-xl font-extrabold" style={{ color: m.color }}>{m.value}</p>
                    </div>
                  ))}
                </div>

                {/* Dimension bars */}
                <div className="px-5 py-4 border-t border-gray-100 space-y-2.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">5가지 차원 분석</p>
                  {PREVIEW_DIMS.map((d, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-20 flex-shrink-0">{d.name}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${(d.score / d.max) * 100}%`, backgroundColor: d.color }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-500 w-10 text-right tabular-nums">{d.score}/{d.max}</span>
                    </div>
                  ))}
                </div>

                {/* AI platforms */}
                <div className="px-5 py-4 border-t border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">AI 플랫폼 실측</p>
                  <div className="grid grid-cols-4 gap-2">
                    {PREVIEW_PLATFORMS.map((p, i) => (
                      <div key={i} className={cn('rounded-lg px-2 py-2.5 text-center', p.ok ? 'bg-green-50' : 'bg-red-50')}>
                        <p className="text-lg leading-none">{p.emoji}</p>
                        <p className="text-[10px] font-semibold text-gray-600 mt-1.5">{p.name}</p>
                        <p className="text-sm font-extrabold mt-0.5" style={{ color: p.ok ? p.color : '#EF4444' }}>{p.rate}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top recommendation */}
                <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/50 flex items-center gap-3">
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex-shrink-0">긴급</span>
                  <p className="text-xs text-gray-600 leading-snug">Schema FAQ 마크업 추가 시 AI 인용율 +34% 예측 — Claude 즉시 적용 가능</p>
                </div>
              </div>

              {/* Credit */}
              <p className="text-center text-[11px] text-gray-400 mt-4">
                Princeton KDD 2024 GEO 연구 기반 · ChatGPT · Perplexity · Gemini · Claude 실측
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 h-12 flex items-center justify-between">
          <p className="text-xs text-gray-400">© 2026 GEO Score · 무료 서비스 · 개인정보 수집 없음</p>
          <div className="flex items-center gap-4">
            <Link href="/url-analyzer" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">URL 분석</Link>
            <Link href="/generate" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">콘텐츠 생성</Link>
            <a href="https://arxiv.org/abs/2311.09735" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">연구 논문</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
