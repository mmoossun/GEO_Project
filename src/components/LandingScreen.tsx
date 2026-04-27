'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Search, ChevronDown, ArrowRight, Clock, TrendingUp,
  BarChart3, Sparkles, Globe, Zap, FileText, FlaskConical,
} from 'lucide-react'
import { CATEGORIES } from '@/lib/constants'
import { getHistory, formatDate } from '@/lib/utils'
import type { HistoryEntry } from '@/lib/types'
import { cn } from '@/lib/utils'

interface LandingScreenProps {
  onAnalyze: (serviceName: string, category: string, url?: string) => void
  isLoading: boolean
}

const GRADE_COLORS: Record<string, string> = {
  S: 'text-gray-900 bg-gray-100',
  A: 'text-gray-900 bg-gray-100',
  B: 'text-gray-700 bg-gray-100',
  C: 'text-gray-600 bg-gray-100',
  D: 'text-gray-500 bg-gray-100',
  F: 'text-gray-400 bg-gray-100',
}

const FEATURES = [
  { icon: BarChart3,    title: 'GEO 점수 분석', desc: '콘텐츠 구조 · E-E-A-T · 기술 신호 등 5가지 차원을 100점 만점으로 측정합니다.', badge: '5가지 차원' },
  { icon: FlaskConical, title: 'AI 실측 테스트', desc: 'ChatGPT · Perplexity · Gemini · Claude에 직접 질문해 실제 언급 여부를 확인합니다.', badge: '4개 플랫폼' },
  { icon: FileText,     title: '콘텐츠 생성',   desc: 'AI 검색에 최적화된 블로그·기업 콘텐츠를 플랫폼별 맞춤형으로 즉시 생성합니다.', badge: '즉시 생성' },
  { icon: Zap,          title: '실행 로드맵',   desc: '경쟁사 비교, 플랫폼별 전략, 30일 실행 계획을 상세 대시보드에서 제공합니다.', badge: '30일 플랜' },
]

// Left column icons (top → bottom)
const LEFT_ICONS = [
  { src: 'https://cdn.simpleicons.org/openai/111111',    label: 'ChatGPT',    size: 56 },
  { src: 'https://cdn.simpleicons.org/anthropic/111111', label: 'Claude',     size: 44 },
  { src: 'https://cdn.simpleicons.org/naver/111111',     label: 'Naver AI',   size: 36 },
]

// Right column icons (top → bottom)
const RIGHT_ICONS = [
  { src: 'https://cdn.simpleicons.org/googlegemini/111111', label: 'Gemini',     size: 52 },
  { src: 'https://cdn.simpleicons.org/perplexity/111111',   label: 'Perplexity', size: 44 },
]

export function LandingScreen({ onAnalyze, isLoading }: LandingScreenProps) {
  const [serviceName, setServiceName] = useState('')
  const [category, setCategory] = useState('')
  const [url, setUrl] = useState('')
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
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Header ── */}
      <header className="border-b border-gray-100 sticky top-0 z-10 bg-white">
        <div className="max-w-5xl mx-auto px-5 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-black flex items-center justify-center">
              <BarChart3 size={13} className="text-white" />
            </div>
            <span className="font-bold text-black text-sm tracking-tight">GEO Score</span>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/url-analyzer" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-black hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors">
              <Globe size={12} /><span className="hidden sm:inline">URL 분석</span>
            </Link>
            <Link href="/generate" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-black hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors">
              <Sparkles size={12} /><span className="hidden sm:inline">콘텐츠 생성</span>
            </Link>
            <Link href="/studio" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-black hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors">
              <span className="text-sm leading-none">🎨</span><span className="hidden sm:inline">스튜디오</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-5 lg:px-8 py-10 lg:py-16">

        {/* ── Hero: 좌우 아이콘 + 중앙 폼 ── */}
        <div className="relative">

          {/* Left icons — 세로 중앙 정렬, 왼쪽 여백 */}
          <div className="hidden lg:flex flex-col items-center justify-center gap-10 absolute left-0 top-0 bottom-0 w-24 pointer-events-none select-none" aria-hidden>
            {LEFT_ICONS.map(icon => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={icon.label}
                src={icon.src}
                alt=""
                width={icon.size}
                height={icon.size}
                className="opacity-[0.14]"
                style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.06))' }}
              />
            ))}
          </div>

          {/* Right icons — 세로 중앙 정렬, 오른쪽 여백 */}
          <div className="hidden lg:flex flex-col items-center justify-center gap-12 absolute right-0 top-0 bottom-0 w-24 pointer-events-none select-none" aria-hidden>
            {RIGHT_ICONS.map(icon => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={icon.label}
                src={icon.src}
                alt=""
                width={icon.size}
                height={icon.size}
                className="opacity-[0.13]"
                style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.06))' }}
              />
            ))}
          </div>

          {/* Center: form */}
          <div className="max-w-md mx-auto">

            {/* Headline */}
            <div className="text-center mb-7">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 border border-gray-200 px-3 py-1 rounded-full mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                AI 검색 시대의 새로운 기준
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-black leading-tight tracking-tight mt-1">
                내 서비스, AI 검색에서<br />얼마나 잘 보이나요?
              </h1>
              <p className="text-sm text-gray-500 mt-2.5 leading-relaxed">
                서비스명과 카테고리만 입력하면<br className="sm:hidden" /> ChatGPT · Perplexity · Gemini의 인용 가능성을 분석합니다.
              </p>
            </div>

            {/* Form */}
            <div className="border border-gray-200 rounded-xl p-5">
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="text"
                  value={serviceName}
                  onChange={e => setServiceName(e.target.value)}
                  placeholder="서비스 이름 (예: 토스, 당근마켓, 쿠팡)"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-black placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition"
                  disabled={isLoading}
                />

                <div className="relative">
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className={cn(
                      'w-full px-4 py-3 border border-gray-200 rounded-lg text-sm appearance-none bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition pr-10',
                      category ? 'text-black' : 'text-gray-400'
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
                  <p className="text-xs text-gray-400 px-1 -mt-1">
                    {selectedCat.emoji} 업계 평균 <span className="font-semibold text-gray-700">{selectedCat.avgScore}점</span>
                  </p>
                )}

                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="웹사이트 URL (선택 · 입력 시 더 정확한 분석)"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-black placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition"
                  disabled={isLoading}
                />

                <button
                  type="submit"
                  disabled={!isValid || isLoading}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 py-3.5 rounded-lg font-semibold text-sm transition-all',
                    isValid && !isLoading
                      ? 'bg-black hover:bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  )}
                >
                  {isLoading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />분석 중...</>
                    : <><Search size={15} />GEO 점수 무료 분석하기<ArrowRight size={15} /></>
                  }
                </button>
              </form>
            </div>

            {/* Stats strip */}
            <div className="flex justify-center gap-8 mt-5">
              {[
                { value: '5가지', label: '분석 차원' },
                { value: '4개', label: 'AI 플랫폼' },
                { value: '30초', label: '분석 완료' },
                { value: '무료', label: '완전 무료' },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-sm font-bold text-black">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* ── Feature Grid ── */}
        <div className="mt-16 lg:mt-20">
          <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">
            분석 후 이런 것들을 제공합니다
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i} className="border border-gray-100 rounded-xl p-5 hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Icon size={15} className="text-black" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                      {f.badge}
                    </span>
                  </div>
                  <p className="font-bold text-sm text-black mb-1.5">{f.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── History ── */}
        {history.length > 0 && (
          <div className="mt-8 max-w-md mx-auto">
            <div className="flex items-center gap-2 mb-2.5">
              <Clock size={12} className="text-gray-400" />
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">최근 분석</span>
            </div>
            <div className="space-y-1.5">
              {history.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => setTimeout(() => onAnalyze(entry.serviceName, entry.category), 50)}
                  className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5 border border-gray-100 hover:border-gray-300 transition-all text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-black truncate">{entry.serviceName}</span>
                      <span className="text-xs text-gray-400">{entry.categoryLabel}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(entry.analyzedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                      {entry.totalScore}점
                    </span>
                    <TrendingUp size={13} className="text-gray-300 group-hover:text-black transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-5 lg:px-8 h-12 flex items-center justify-between">
          <p className="text-xs text-gray-400">© 2026 GEO Score · 무료 서비스 · 개인정보 수집 없음</p>
          <div className="flex items-center gap-4">
            <Link href="/url-analyzer" className="text-xs text-gray-400 hover:text-black transition-colors">URL 분석</Link>
            <Link href="/generate" className="text-xs text-gray-400 hover:text-black transition-colors">콘텐츠 생성</Link>
            <a href="https://arxiv.org/abs/2311.09735" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-black transition-colors">논문</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
