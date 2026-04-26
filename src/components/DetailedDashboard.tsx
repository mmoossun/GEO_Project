'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, AlertCircle,
  TrendingUp, TrendingDown, Zap, Target, BarChart3,
  Globe, ChevronRight, Flag,
} from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  ScatterChart, Scatter, ZAxis, ReferenceLine,
} from 'recharts'
import { cn, getScoreColor } from '@/lib/utils'
import type { GEOAnalysisResult } from '@/lib/types'
import type { DetailedAnalysis, ChecklistItem, ActionItem } from '@/app/api/analyze/detail/route'

// ─── Tab bar ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',    label: '개요',         icon: '📊' },
  { id: 'platforms',   label: 'AI 플랫폼',    icon: '🌐' },
  { id: 'checklist',   label: '체크리스트',    icon: '✅' },
  { id: 'matrix',      label: '액션 매트릭스', icon: '⚡' },
  { id: 'roadmap',     label: '30일 로드맵',   icon: '🗺️' },
] as const
type TabId = (typeof TABS)[number]['id']

// ─── Score Arc ────────────────────────────────────────────────────────────────

function MiniArc({ score, max = 100, size = 60 }: { score: number; max?: number; size?: number }) {
  const pct = score / max
  const r = size * 0.38; const stroke = size * 0.09
  const circ = Math.PI * r
  const color = getScoreColor(Math.round(pct * 100))
  return (
    <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
      <path d={`M ${stroke} ${size * 0.58} A ${r} ${r} 0 0 1 ${size - stroke} ${size * 0.58}`}
        fill="none" stroke="#E5E7EB" strokeWidth={stroke} strokeLinecap="round" />
      <path d={`M ${stroke} ${size * 0.58} A ${r} ${r} 0 0 1 ${size - stroke} ${size * 0.58}`}
        fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${pct * circ} ${circ}`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      <text x={size / 2} y={size * 0.48} textAnchor="middle" fontSize={size * 0.22} fontWeight="bold" fill={color}>{score}</text>
    </svg>
  )
}

// ─── Checklist ────────────────────────────────────────────────────────────────

function ChecklistRow({ item }: { item: ChecklistItem }) {
  const cfg = {
    pass:    { icon: <CheckCircle2 size={15} />, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
    fail:    { icon: <XCircle size={15} />,      color: 'text-red-600',   bg: 'bg-red-50',   border: 'border-red-100' },
    warning: { icon: <AlertCircle size={15} />,  color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    unknown: { icon: <AlertCircle size={15} />,  color: 'text-gray-400',  bg: 'bg-gray-50',  border: 'border-gray-100' },
  }[item.status] ?? { icon: null, color: 'text-gray-400', bg: 'bg-gray-50', border: 'border-gray-100' }

  const impactBadge = { critical: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-gray-100 text-gray-500' }[item.impact]

  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-xl border', cfg.bg, cfg.border)}>
      <span className={cfg.color}>{cfg.icon}</span>
      <span className="flex-1 text-sm text-gray-800">{item.item}</span>
      {item.detail && <span className="text-xs text-gray-500 hidden sm:block max-w-[200px] truncate">{item.detail}</span>}
      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0', impactBadge)}>
        {{ critical: '긴급', high: '높음', medium: '보통', low: '낮음' }[item.impact]}
      </span>
    </div>
  )
}

// ─── Action Matrix Scatter ────────────────────────────────────────────────────

const QUADRANT_COLORS = {
  quick_win:  '#059669',
  strategic:  '#7C3AED',
  fill_in:    '#2563EB',
  thankless:  '#9CA3AF',
}

const QUADRANT_LABELS = {
  quick_win:  '빠른 성과',
  strategic:  '전략적 투자',
  fill_in:    '틈새 채우기',
  thankless:  '재고 필요',
}

function ActionMatrixChart({ items }: { items: ActionItem[] }) {
  const [selected, setSelected] = useState<ActionItem | null>(null)

  return (
    <div className="space-y-4">
      <div className="relative h-72 bg-gray-50 rounded-2xl border border-gray-100 p-4">
        {/* Quadrant labels */}
        <div className="absolute top-3 left-3 text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">⚡ 빠른 성과</div>
        <div className="absolute top-3 right-3 text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">🎯 전략적 투자</div>
        <div className="absolute bottom-3 left-3 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">📌 틈새 채우기</div>
        <div className="absolute bottom-3 right-3 text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">💤 재고 필요</div>

        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 24, right: 24, bottom: 20, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis type="number" dataKey="effort" domain={[0, 11]} name="노력" label={{ value: '→ 노력', position: 'insideBottom', offset: -4, fontSize: 11, fill: '#9CA3AF' }} tick={{ fontSize: 10 }} />
            <YAxis type="number" dataKey="impact" domain={[0, 11]} name="임팩트" label={{ value: '임팩트 ↑', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#9CA3AF' }} tick={{ fontSize: 10 }} />
            <ZAxis range={[60, 60]} />
            <ReferenceLine x={5.5} stroke="#D1D5DB" strokeDasharray="4 4" />
            <ReferenceLine y={5.5} stroke="#D1D5DB" strokeDasharray="4 4" />
            <Tooltip cursor={false} content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as ActionItem
              return (
                <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg max-w-[200px]">
                  <p className="text-xs font-bold text-gray-800">{d.title}</p>
                  <p className="text-xs text-gray-500">{d.timeframe} · {d.category}</p>
                </div>
              )
            }} />
            <Scatter
              data={items}
              onClick={(d) => setSelected(d as unknown as ActionItem)}
              shape={(props: { cx?: number; cy?: number; payload?: ActionItem }) => {
                const { cx = 0, cy = 0, payload } = props
                const color = QUADRANT_COLORS[payload?.quadrant ?? 'fill_in']
                return <circle cx={cx} cy={cy} r={8} fill={color} fillOpacity={0.85} stroke="white" strokeWidth={2} style={{ cursor: 'pointer' }} />
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Selected item detail */}
      {selected && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: QUADRANT_COLORS[selected.quadrant] }} />
            <div>
              <p className="font-bold text-gray-800 text-sm">{selected.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{QUADRANT_LABELS[selected.quadrant]} · {selected.timeframe} · {selected.category}</p>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">{selected.description}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-300 hover:text-gray-500 flex-shrink-0 text-lg leading-none">×</button>
          </div>
        </div>
      )}

      {/* Priority list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {items
          .sort((a, b) => (b.impact - b.effort * 0.3) - (a.impact - a.effort * 0.3))
          .slice(0, 8)
          .map((item, i) => (
            <div key={item.id}
              className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-gray-100 cursor-pointer hover:border-gray-200 transition-colors"
              onClick={() => setSelected(item)}
            >
              <span className="text-xs font-bold text-gray-400 w-4 flex-shrink-0">{i + 1}</span>
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: QUADRANT_COLORS[item.quadrant] }} />
              <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">{item.title}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">{item.timeframe}</span>
            </div>
          ))}
      </div>
    </div>
  )
}

// ─── Roadmap ──────────────────────────────────────────────────────────────────

function RoadmapView({ roadmap }: { roadmap: DetailedAnalysis['roadmap'] }) {
  const typeColors = { content: 'bg-blue-100 text-blue-700', technical: 'bg-purple-100 text-purple-700', authority: 'bg-green-100 text-green-700' }
  const typeLabels = { content: '콘텐츠', technical: '기술', authority: '권위' }

  return (
    <div className="space-y-4">
      {roadmap.map(week => (
        <div key={week.week} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700 flex-shrink-0">
              {week.week}주
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-sm">{week.label} — {week.focus}</p>
            </div>
            <span className="text-sm font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">{week.expectedGain}</span>
          </div>
          <div className="px-5 py-4 space-y-2">
            {week.tasks.map((task, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                <span className="flex-1 text-sm text-gray-700">{task.title}</span>
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0', typeColors[task.type])}>
                  {typeLabels[task.type]}
                </span>
                {task.priority === 'high' && (
                  <Flag size={12} className="text-red-400 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  analysis: GEOAnalysisResult
}

export function DetailedDashboard({ analysis }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [detail, setDetail] = useState<DetailedAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchDetail() {
      try {
        const res = await fetch('/api/analyze/detail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(analysis),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setDetail(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [analysis])

  if (loading) return (
    <div className="min-h-screen bg-[#F0F4FF] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-100 flex items-center justify-center text-3xl animate-pulse">📊</div>
        <p className="font-bold text-gray-900">상세 분석 생성 중...</p>
        <p className="text-sm text-gray-500">AI 플랫폼별 분석, 체크리스트, 액션 매트릭스를 준비하고 있어요</p>
        <Loader2 size={20} className="animate-spin text-indigo-500 mx-auto" />
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-[#F0F4FF] flex items-center justify-center">
      <div className="text-center space-y-3">
        <p className="text-red-600 font-bold">분석 실패</p>
        <p className="text-sm text-gray-500">{error}</p>
        <Link href="/" className="text-indigo-600 underline text-sm">돌아가기</Link>
      </div>
    </div>
  )

  if (!detail) return null

  const radarData = analysis.dimensions.map(d => ({
    subject: d.nameKo.replace('E-E-A-T ', ''),
    score: Math.round((d.score / d.maxScore) * 100),
  }))

  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">대시보드</span>
          </Link>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-indigo-500" />
            <span className="font-bold text-gray-900 text-sm">{analysis.serviceName}</span>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full hidden sm:inline">상세 GEO 분석</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: getScoreColor(analysis.totalScore) }}>{analysis.totalScore}점</span>
            <ChevronRight size={14} className="text-gray-300" />
            <span className="text-sm font-bold text-green-600">{detail.potentialScore}점 가능</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-5 pb-16">
        {/* Tabs */}
        <div className="flex gap-1.5 bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0',
                activeTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              )}>
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB: Overview ── */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Score summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: '현재 점수', value: `${analysis.totalScore}`, sub: `${analysis.grade}등급`, color: getScoreColor(analysis.totalScore) },
                { label: '성장 가능 점수', value: `${detail.potentialScore}`, sub: '90일 후 달성 가능', color: '#059669' },
                { label: 'AI 인용 확률', value: `${analysis.citationProbability}%`, sub: '현재 기준', color: '#2563EB' },
                { label: '업계 평균 대비', value: `${analysis.totalScore >= analysis.industryAverage ? '+' : ''}${analysis.totalScore - analysis.industryAverage}점`, sub: `업계 평균 ${analysis.industryAverage}점`, color: analysis.totalScore >= analysis.industryAverage ? '#059669' : '#DC2626' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                  <p className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs font-semibold text-gray-600 mt-0.5">{s.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Radar + Brand Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-sm font-bold text-gray-700 mb-3">차원별 균형 분석</p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#E5E7EB" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#6B7280' }} />
                      <Radar dataKey="score" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.15} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <p className="text-sm font-bold text-gray-700">브랜드 신뢰 지표</p>
                {[
                  { label: '감성 점수', value: detail.brandMetrics.sentimentScore, color: detail.brandMetrics.sentiment === 'positive' ? '#059669' : detail.brandMetrics.sentiment === 'negative' ? '#DC2626' : '#D97706' },
                  { label: '주제 권위', value: detail.brandMetrics.topicalAuthority, color: '#4F46E5' },
                  { label: '인지도', value: detail.brandMetrics.shareOfVoice, color: '#7C3AED' },
                  { label: '신뢰 점수', value: detail.brandMetrics.trustScore, color: '#059669' },
                ].map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-20 flex-shrink-0">{m.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${m.value}%`, backgroundColor: m.color }} />
                    </div>
                    <span className="text-xs font-bold w-8 text-right" style={{ color: m.color }}>{m.value}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="font-bold text-gray-800">{detail.brandMetrics.recognitionKo}</p>
                    <p className="text-gray-500">AI 인지도</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="font-bold" style={{ color: detail.brandMetrics.sentiment === 'positive' ? '#059669' : '#DC2626' }}>
                      {{ positive: '긍정적', neutral: '중립적', negative: '부정적' }[detail.brandMetrics.sentiment]}
                    </p>
                    <p className="text-gray-500">감성 분석</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Competitive Gap */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm font-bold text-gray-700 mb-4">경쟁 차이 분석</p>
              <div className="space-y-3">
                {detail.competitiveGap.map((g, i) => {
                  const myPct = g.yourScore / g.topPerformer * 100
                  const avgPct = g.industryAvg / g.topPerformer * 100
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span className="font-medium">{g.dimension}</span>
                        <span className="text-gray-400">내 점수 {g.yourScore} · 평균 {g.industryAvg} · 최상 {g.topPerformer}</span>
                      </div>
                      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="absolute h-3 bg-gray-300 rounded-full" style={{ width: `${avgPct}%` }} />
                        <div className="absolute h-3 rounded-full transition-all duration-700" style={{ width: `${myPct}%`, backgroundColor: getScoreColor(Math.round(myPct)) }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-gray-300 inline-block" />업계 평균</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-indigo-400 inline-block" />내 서비스</span>
              </div>
            </div>

            {/* Strengths & Gaps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
                <p className="text-sm font-bold text-green-900 mb-3 flex items-center gap-2"><TrendingUp size={15} /> 강점 영역</p>
                {detail.strengthAreas.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-green-800 mb-1.5">
                    <CheckCircle2 size={14} className="text-green-600 flex-shrink-0 mt-0.5" />{s}
                  </div>
                ))}
              </div>
              <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                <p className="text-sm font-bold text-red-900 mb-3 flex items-center gap-2"><TrendingDown size={15} /> 콘텐츠 공백</p>
                {detail.contentGaps.map((g, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-red-800 mb-1.5">
                    <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />{g}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: Platforms ── */}
        {activeTab === 'platforms' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm font-bold text-gray-700 mb-4">AI 플랫폼별 가시성 점수</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={detail.platformScores} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="platformKo" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v}점`, '가시성']} />
                    <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                      {detail.platformScores.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {detail.platformScores.map(p => (
                <div key={p.platform} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{p.emoji}</span>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 text-sm">{p.platformKo}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: `${p.color}18`, color: p.color }}>
                        {p.citationTypeKo}
                      </span>
                    </div>
                    <MiniArc score={p.score} size={52} />
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{p.reasoning}</p>
                  <div className="mt-2 bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${p.score}%`, backgroundColor: p.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB: Checklist ── */}
        {activeTab === 'checklist' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '통과', count: detail.checklistSummary.pass, color: '#059669', bg: 'bg-green-50 border-green-100' },
                { label: '경고', count: detail.checklistSummary.warning, color: '#D97706', bg: 'bg-amber-50 border-amber-100' },
                { label: '미달', count: detail.checklistSummary.fail, color: '#DC2626', bg: 'bg-red-50 border-red-100' },
              ].map((s, i) => (
                <div key={i} className={cn('rounded-2xl border p-4 text-center', s.bg)}>
                  <p className="text-2xl font-extrabold" style={{ color: s.color }}>{s.count}</p>
                  <p className="text-xs font-semibold text-gray-600 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Items by category */}
            {Array.from(new Set(detail.checklist.map(c => c.category))).map(cat => (
              <div key={cat} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <p className="text-sm font-bold text-gray-700">{cat}</p>
                </div>
                <div className="p-3 space-y-2">
                  {detail.checklist.filter(c => c.category === cat).map(item => (
                    <ChecklistRow key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TAB: Action Matrix ── */}
        {activeTab === 'matrix' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm font-bold text-gray-700 mb-1">액션 매트릭스</p>
              <p className="text-xs text-gray-400 mb-4">점을 클릭하면 상세 내용을 확인할 수 있어요</p>
              <ActionMatrixChart items={detail.actionMatrix} />
            </div>
          </div>
        )}

        {/* ── TAB: Roadmap ── */}
        {activeTab === 'roadmap' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 text-white">
              <p className="font-bold text-base mb-1">30일 GEO 개선 로드맵</p>
              <p className="text-indigo-200 text-sm">현재 {analysis.totalScore}점 → 목표 {detail.potentialScore}점 달성 계획</p>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex-1 bg-white/20 rounded-full h-2">
                  <div className="h-2 rounded-full bg-white" style={{ width: `${analysis.totalScore}%` }} />
                </div>
                <span className="text-xs text-indigo-200">+{detail.potentialScore - analysis.totalScore}점 향상</span>
              </div>
            </div>
            <RoadmapView roadmap={detail.roadmap} />
          </div>
        )}
      </main>
    </div>
  )
}
