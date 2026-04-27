'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, ChevronDown, ArrowRight, Clock, TrendingUp, BarChart3, Sparkles, Globe, Zap, FileText, FlaskConical } from 'lucide-react'
import { CATEGORIES } from '@/lib/constants'
import { getHistory, formatDate } from '@/lib/utils'
import type { HistoryEntry } from '@/lib/types'
import { cn } from '@/lib/utils'

interface LandingScreenProps {
  onAnalyze: (serviceName: string, category: string, url?: string) => void
  isLoading: boolean
}

const FEATURES = [
  { icon: BarChart3,    title: 'GEO 점수 분석',  desc: '콘텐츠 구조 · E-E-A-T · 기술 신호 등 5가지 차원을 100점 만점으로 측정합니다.', badge: '5가지 차원' },
  { icon: FlaskConical, title: 'AI 실측 테스트',  desc: 'ChatGPT · Perplexity · Gemini · Claude에 직접 질문해 실제 언급 여부를 확인합니다.', badge: '4개 플랫폼' },
  { icon: FileText,     title: '콘텐츠 생성',     desc: 'AI 검색에 최적화된 블로그·기업 콘텐츠를 플랫폼별 맞춤형으로 즉시 생성합니다.', badge: '즉시 생성' },
  { icon: Zap,          title: '실행 로드맵',     desc: '경쟁사 비교, 플랫폼별 전략, 30일 실행 계획을 상세 대시보드에서 제공합니다.', badge: '30일 플랜' },
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
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">

      {/* ── Header ── */}
      <header className="bg-[#F5F5F5] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-5 lg:px-10 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#111] flex items-center justify-center">
              <BarChart3 size={13} className="text-white" />
            </div>
            <span className="font-bold text-[#111] text-sm tracking-tight">GEO Score</span>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/url-analyzer" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#111] px-3 py-1.5 rounded-lg hover:bg-black/5 transition-colors">
              <Globe size={12} /><span className="hidden sm:inline">URL 분석</span>
            </Link>
            <Link href="/generate" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#111] px-3 py-1.5 rounded-lg hover:bg-black/5 transition-colors">
              <Sparkles size={12} /><span className="hidden sm:inline">콘텐츠 생성</span>
            </Link>
            <Link href="/studio" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#111] px-3 py-1.5 rounded-lg hover:bg-black/5 transition-colors">
              <span className="text-sm leading-none">🎨</span><span className="hidden sm:inline">스튜디오</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-5 lg:px-10 py-10 lg:py-16">

        <div className="max-w-2xl">

          {/* Label */}
          <p className="text-xs font-semibold text-gray-500 mb-4 tracking-wide">
            AI 검색 최적화 서비스
          </p>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0A0A14] leading-[1.1] tracking-tight mb-5">
            AI가 답할 때,<br />
            내 서비스가<br />
            거기 있나요?
          </h1>

          {/* Sub description */}
          <p className="text-base text-gray-500 leading-relaxed mb-8 max-w-lg">
            ChatGPT · Perplexity · Gemini · Claude가 관련 질문에 답할 때<br className="hidden sm:block" />
            내 서비스를 추천하는지 30초 안에 확인하세요.
          </p>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-5 max-w-xl">
            <form onSubmit={handleSubmit} className="space-y-3">

              <input
                type="text"
                value={serviceName}
                onChange={e => setServiceName(e.target.value)}
                placeholder="서비스 이름을 입력하여, AI 검색 리포트를 확인하세요"
                className="w-full px-1 py-1 text-sm text-[#111] placeholder-gray-400 focus:outline-none bg-transparent"
                disabled={isLoading}
              />

              <div className="h-px bg-gray-100" />

              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className={cn(
                      'w-full px-1 py-1 text-sm appearance-none bg-transparent focus:outline-none pr-6',
                      category ? 'text-[#111]' : 'text-gray-400'
                    )}
                    disabled={isLoading}
                  >
                    <option value="">카테고리 선택...</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.emoji} {cat.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                <button
                  type="submit"
                  disabled={!isValid || isLoading}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex-shrink-0',
                    isValid && !isLoading
                      ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  )}
                >
                  {isLoading
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Search size={14} />분석하기</>
                  }
                </button>
              </div>

              {/* URL optional toggle */}
              {!showUrl ? (
                <button
                  type="button"
                  onClick={() => setShowUrl(true)}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  + 웹사이트 URL 추가 (선택 · 더 정확한 분석)
                </button>
              ) : (
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-1 py-1 text-sm text-[#111] placeholder-gray-400 focus:outline-none bg-transparent border-t border-gray-100 pt-3"
                  disabled={isLoading}
                />
              )}
            </form>

            {/* Card footer */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-50">
              {selectedCat ? (
                <p className="text-xs text-gray-500">
                  {selectedCat.emoji} {selectedCat.label} 업계 평균 <span className="font-bold text-[#2563EB]">{selectedCat.avgScore}점</span>
                  <span className="mx-1.5 text-gray-300">·</span>
                  <span className="text-gray-400">AI 가시성 지표</span>
                </p>
              ) : (
                <p className="text-xs text-gray-400">
                  서비스명과 카테고리를 입력하면 AI 검색 가시성을 분석합니다
                  <span className="mx-1.5 text-gray-300">·</span>
                  <span className="text-gray-400">AI 지표</span>
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-6">
            {[
              { value: '5가지', label: '분석 차원' },
              { value: '4개', label: 'AI 플랫폼' },
              { value: '30초', label: '분석 완료' },
              { value: '무료', label: '완전 무료' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-[#111]">{s.value}</span>
                <span className="text-xs text-gray-400">{s.label}</span>
                {i < 3 && <span className="text-gray-300 ml-1.5">·</span>}
              </div>
            ))}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-2.5">
                <Clock size={12} className="text-gray-400" />
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">최근 분석</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => setTimeout(() => onAnalyze(entry.serviceName, entry.category), 50)}
                    className="flex items-center gap-2 bg-white rounded-lg px-3.5 py-2 text-sm hover:shadow-md transition-all group"
                  >
                    <span className="font-semibold text-[#111]">{entry.serviceName}</span>
                    <span className="text-xs font-bold text-[#2563EB]">{entry.totalScore}점</span>
                    <TrendingUp size={12} className="text-gray-300 group-hover:text-[#2563EB] transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Feature Grid ── */}
        <div className="mt-16 lg:mt-24">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">
            분석 후 이런 것들을 제공합니다
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i} className="bg-white rounded-xl p-5 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                      <Icon size={15} className="text-[#2563EB]" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                      {f.badge}
                    </span>
                  </div>
                  <p className="font-bold text-sm text-[#111] mb-1.5">{f.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-[#F5F5F5]">
        <div className="max-w-5xl mx-auto px-5 lg:px-10 h-12 flex items-center justify-between">
          <p className="text-xs text-gray-400">© 2026 GEO Score · 무료 서비스 · 개인정보 수집 없음</p>
          <div className="flex items-center gap-4">
            <Link href="/url-analyzer" className="text-xs text-gray-400 hover:text-[#111] transition-colors">URL 분석</Link>
            <Link href="/generate" className="text-xs text-gray-400 hover:text-[#111] transition-colors">콘텐츠 생성</Link>
            <a href="https://arxiv.org/abs/2311.09735" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-[#111] transition-colors">논문</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
