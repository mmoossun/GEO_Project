'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Search, Loader2, AlertCircle, CheckCircle2,
  XCircle, ChevronDown, ChevronUp, Copy, Check,
  Globe, Zap, TrendingUp, ShieldCheck, BarChart2, Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Dimension {
  id: string
  nameKo: string
  score: number
  maxScore: number
  findings: string[]
  recommendations: string[]
}

interface Recommendation {
  priority: 'critical' | 'high' | 'medium'
  category: string
  title: string
  description: string
  expectedImpact: string
  implementation: string
}

interface URLAnalysisResult {
  url: string
  pageTitle: string
  analyzedAt: string
  overallScore: number
  pageInsight: string
  dimensions: Dimension[]
  criticalIssues: string[]
  quickWins: string[]
  recommendations: Recommendation[]
  pageData: {
    title: string
    metaDesc: string
    h1s: string[]
    h2s: string[]
    hasNav: boolean
    schemaTypes: string[]
    hasFAQ: boolean
    wordCount: number
    imgCount: number
    imgsWithoutAlt: number
    formCount: number
    hasViewport: boolean
    isHttps: boolean
    ogTitle: string
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const DIMENSION_ICONS: Record<string, React.ElementType> = {
  ia: Layers,
  conversion: TrendingUp,
  content: BarChart2,
  technical: ShieldCheck,
  geo: Globe,
}

function ScoreArc({ score, max = 100 }: { score: number; max?: number }) {
  const pct = score / max
  const color = pct >= 0.75 ? '#059669' : pct >= 0.55 ? '#2563EB' : pct >= 0.35 ? '#D97706' : '#DC2626'
  const r = 40
  const circ = Math.PI * r
  const filled = pct * circ
  return (
    <svg width="100" height="60" viewBox="0 0 100 60">
      <path d={`M 10 55 A ${r} ${r} 0 0 1 90 55`} fill="none" stroke="#E5E7EB" strokeWidth="8" strokeLinecap="round" />
      <path d={`M 10 55 A ${r} ${r} 0 0 1 90 55`} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${filled} ${circ}`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      <text x="50" y="46" textAnchor="middle" fontSize="18" fontWeight="bold" fill={color}>{score}</text>
      <text x="50" y="58" textAnchor="middle" fontSize="9" fill="#9CA3AF">/{max}</text>
    </svg>
  )
}

function DimensionCard({ dim }: { dim: Dimension }) {
  const [open, setOpen] = useState(false)
  const pct = dim.score / dim.maxScore
  const color = pct >= 0.75 ? '#059669' : pct >= 0.55 ? '#2563EB' : pct >= 0.35 ? '#D97706' : '#DC2626'
  const Icon = DIMENSION_ICONS[dim.id] ?? BarChart2

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors" onClick={() => setOpen(o => !o)}>
        <div className="p-2 rounded-xl flex-shrink-0" style={{ backgroundColor: `${color}18` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-sm text-gray-800">{dim.nameKo}</span>
            <span className="font-bold text-sm flex-shrink-0 ml-2" style={{ color }}>
              {dim.score}<span className="text-gray-400 font-normal text-xs">/{dim.maxScore}</span>
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
          </div>
        </div>
        {open ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">발견된 사항</p>
            <ul className="space-y-1">
              {dim.findings.map((f, i) => (
                <li key={i} className="flex gap-2 text-xs text-gray-600">
                  <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>{f}
                </li>
              ))}
            </ul>
          </div>
          {dim.recommendations.length > 0 && (
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1.5">개선 방향</p>
              <ul className="space-y-1">
                {dim.recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2 text-xs text-gray-600">
                    <span className="text-amber-500 mt-0.5 flex-shrink-0">→</span>{r}
                </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RecommendationCard({ rec, idx }: { rec: Recommendation; idx: number }) {
  const [open, setOpen] = useState(idx === 0)
  const cfg = {
    critical: { label: '긴급', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    high: { label: '높음', color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
    medium: { label: '보통', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  }[rec.priority]

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: cfg.border }}>
      <button className="w-full flex items-center gap-3 p-4 text-left hover:opacity-90 transition-opacity"
        style={{ backgroundColor: cfg.bg }} onClick={() => setOpen(o => !o)}>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ color: cfg.color, backgroundColor: '#fff', border: `1px solid ${cfg.border}` }}>
          {cfg.label}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-800 truncate">{rec.title}</p>
          <p className="text-xs mt-0.5" style={{ color: cfg.color }}>{rec.category} · {rec.expectedImpact}</p>
        </div>
        {open ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="bg-white px-4 py-4 space-y-3 border-t" style={{ borderColor: cfg.border }}>
          <p className="text-sm text-gray-700 leading-relaxed">{rec.description}</p>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">실행 방법</p>
            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{rec.implementation}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function PageMetaBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={cn('flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium', ok ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200')}>
      {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      {label}
    </div>
  )
}

const EXAMPLE_URLS = ['https://www.toss.im', 'https://www.coupang.com', 'https://velog.io']

// ─── Main Component ──────────────────────────────────────────────────────────

export function URLAnalyzer({ initialUrl }: { initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl ?? '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<URLAnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'actions'>('overview')
  const [copied, setCopied] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')

  // Auto-analyze if initialUrl provided
  useEffect(() => {
    if (initialUrl) analyze(initialUrl)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const LOADING_STEPS = [
    '페이지 접속 중...',
    'HTML 구조 파싱 중...',
    'UI/UX 요소 분석 중...',
    'GEO 최적화 평가 중...',
    '개선 방안 생성 중...',
  ]

  async function analyze(targetUrl?: string) {
    const u = (targetUrl ?? url).trim()
    if (!u) return
    if (!u.startsWith('http')) {
      setError('URL은 https:// 또는 http:// 로 시작해야 합니다.')
      return
    }
    setUrl(u)
    setLoading(true)
    setError('')
    setResult(null)
    setActiveTab('overview')

    let stepIdx = 0
    setLoadingMsg(LOADING_STEPS[0])
    const stepTimer = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, LOADING_STEPS.length - 1)
      setLoadingMsg(LOADING_STEPS[stepIdx])
    }, 2500)

    try {
      const res = await fetch('/api/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: u }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '분석 실패')
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '분석 중 오류가 발생했습니다.')
    } finally {
      clearInterval(stepTimer)
      setLoading(false)
    }
  }

  async function copyReport() {
    if (!result) return
    const lines = [
      `[URL UI/UX 분석 리포트]`,
      `URL: ${result.url}`,
      `제목: ${result.pageTitle}`,
      `종합 점수: ${result.overallScore}/100`,
      '',
      result.pageInsight,
      '',
      '차원별 점수:',
      ...result.dimensions.map(d => `  ${d.nameKo}: ${d.score}/${d.maxScore}점`),
      '',
      '긴급 개선 과제:',
      ...result.criticalIssues.map((c, i) => `  ${i + 1}. ${c}`),
      '',
      '빠른 개선:',
      ...result.quickWins.map((w, i) => `  ${i + 1}. ${w}`),
      '',
      `분석일: ${new Date(result.analyzedAt).toLocaleString('ko-KR')}`,
    ]
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const scoreColor = result
    ? result.overallScore >= 75 ? '#059669' : result.overallScore >= 55 ? '#2563EB' : result.overallScore >= 35 ? '#D97706' : '#DC2626'
    : '#6B7280'

  const TABS = [
    { id: 'overview', label: '개요' },
    { id: 'details', label: '차원별 분석' },
    { id: 'actions', label: '개선 액션플랜' },
  ] as const

  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">GEO Score</span>
          </Link>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-indigo-500" />
            <span className="font-bold text-gray-900 text-sm">URL UI/UX 분석기</span>
          </div>
          {result && (
            <button onClick={copyReport}
              className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">
              {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
              {copied ? '복사됨' : '리포트 복사'}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Input Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h1 className="text-lg font-bold text-gray-900 mb-1">URL UI/UX + GEO 분석</h1>
          <p className="text-sm text-gray-500 mb-5">
            URL을 입력하면 페이지를 직접 방문해 <strong>UI/UX 구조</strong>와 <strong>GEO 최적화 상태</strong>를 동시에 분석합니다.
          </p>

          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyze()}
              placeholder="https://example.com"
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            />
            <button
              onClick={() => analyze()}
              disabled={loading || !url.trim()}
              className={cn(
                'flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all flex-shrink-0',
                loading || !url.trim()
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
              )}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {loading ? '분석 중...' : '분석'}
            </button>
          </div>

          {/* Example URLs */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-gray-400">예시:</span>
            {EXAMPLE_URLS.map(u => (
              <button key={u} onClick={() => analyze(u)} disabled={loading}
                className="text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50">
                {u.replace('https://', '')}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 flex flex-col items-center gap-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <Globe size={28} className="text-indigo-500 animate-pulse" />
              </div>
              <div className="absolute -inset-2 rounded-2xl border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-800">{loadingMsg}</p>
              <p className="text-sm text-gray-500 mt-1">{url}</p>
            </div>
            <div className="flex gap-1.5">
              {LOADING_STEPS.map((s, i) => (
                <div key={i} className={cn('w-2 h-2 rounded-full transition-all', LOADING_STEPS.indexOf(loadingMsg) >= i ? 'bg-indigo-500' : 'bg-gray-200')} />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">분석 실패</p>
              <p className="text-sm mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Score Hero */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                {/* Score gauge */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <ScoreArc score={result.overallScore} />
                  <p className="text-xs font-semibold mt-1" style={{ color: scoreColor }}>
                    {result.overallScore >= 75 ? '우수' : result.overallScore >= 55 ? '보통' : result.overallScore >= 35 ? '미흡' : '불량'}
                  </p>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-bold text-gray-900 truncate">{result.pageTitle || '(제목 없음)'}</h2>
                  </div>
                  <a href={result.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-indigo-500 hover:underline truncate block mb-3">{result.url}</a>
                  <p className="text-sm text-gray-600 leading-relaxed">{result.pageInsight}</p>
                </div>
              </div>

              {/* Quick meta badges */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                <PageMetaBadge ok={result.pageData.isHttps} label="HTTPS" />
                <PageMetaBadge ok={!!result.pageData.metaDesc} label="메타 설명" />
                <PageMetaBadge ok={result.pageData.h1s.length === 1} label="H1 태그" />
                <PageMetaBadge ok={result.pageData.hasViewport} label="모바일 뷰포트" />
                <PageMetaBadge ok={result.pageData.schemaTypes.length > 0} label="스키마 마크업" />
                <PageMetaBadge ok={result.pageData.hasFAQ} label="FAQ 섹션" />
                <PageMetaBadge ok={result.pageData.imgsWithoutAlt === 0} label="이미지 alt 텍스트" />
                <PageMetaBadge ok={!!result.pageData.ogTitle} label="OG 태그" />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn('flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all',
                    activeTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50')}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Dimension score bars */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h2 className="font-bold text-gray-900 mb-4">5가지 차원 점수</h2>
                  <div className="space-y-3">
                    {result.dimensions.map(dim => {
                      const pct = dim.score / dim.maxScore
                      const color = pct >= 0.75 ? '#059669' : pct >= 0.55 ? '#2563EB' : pct >= 0.35 ? '#D97706' : '#DC2626'
                      const Icon = DIMENSION_ICONS[dim.id] ?? BarChart2
                      return (
                        <div key={dim.id} className="flex items-center gap-3">
                          <Icon size={15} className="flex-shrink-0" style={{ color }} />
                          <span className="text-sm text-gray-700 w-28 flex-shrink-0">{dim.nameKo}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                            <div className="h-2.5 rounded-full transition-all duration-700" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
                          </div>
                          <span className="text-sm font-bold w-12 text-right flex-shrink-0" style={{ color }}>
                            {dim.score}/{dim.maxScore}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Critical Issues */}
                {result.criticalIssues.length > 0 && (
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                    <h2 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                      <XCircle size={16} className="text-red-500" /> 긴급 개선 과제
                    </h2>
                    <div className="space-y-2">
                      {result.criticalIssues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-red-800">
                          <span className="font-bold text-red-500 flex-shrink-0 mt-0.5">{i + 1}.</span>
                          {issue}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Wins */}
                {result.quickWins.length > 0 && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
                    <h2 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                      <Zap size={16} className="text-amber-500" /> 즉시 적용 가능한 개선
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {result.quickWins.map((win, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-amber-800 bg-white rounded-xl p-2.5 border border-amber-100">
                          <CheckCircle2 size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                          {win}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Page stats */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h2 className="font-bold text-gray-900 mb-3">페이지 기본 정보</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: '단어 수', value: `~${result.pageData.wordCount.toLocaleString()}` },
                      { label: '이미지', value: `${result.pageData.imgCount}개` },
                      { label: 'H2 개수', value: `${result.pageData.h2s.length}개` },
                      { label: '폼', value: `${result.pageData.formCount}개` },
                    ].map((stat, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 px-1">각 차원을 클릭하면 상세 내용과 개선 방향을 확인할 수 있습니다.</p>
                {result.dimensions.map(dim => (
                  <DimensionCard key={dim.id} dim={dim} />
                ))}
              </div>
            )}

            {/* Action Plan Tab */}
            {activeTab === 'actions' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <p className="text-sm font-bold text-gray-700">총 {result.recommendations.length}개 권고사항</p>
                  <div className="flex gap-2 text-xs">
                    {['critical', 'high', 'medium'].map(p => {
                      const cnt = result.recommendations.filter(r => r.priority === p).length
                      if (!cnt) return null
                      const cfg = { critical: '긴급', high: '높음', medium: '보통' }[p]
                      const col = { critical: 'text-red-600 bg-red-50', high: 'text-orange-600 bg-orange-50', medium: 'text-yellow-600 bg-yellow-50' }[p as 'critical' | 'high' | 'medium']
                      return <span key={p} className={cn('px-2 py-0.5 rounded-full font-semibold', col)}>{cfg} {cnt}</span>
                    })}
                  </div>
                </div>
                {result.recommendations.map((rec, i) => (
                  <RecommendationCard key={i} rec={rec} idx={i} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
