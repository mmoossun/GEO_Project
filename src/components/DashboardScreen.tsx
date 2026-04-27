'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Share2, Check, Sparkles, FileText, Globe, BarChart3, FlaskConical, Info, MessageCircle } from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import { getGradeConfig, getScoreColor, getScoreLabel, getPriorityConfig, getEffortLabel, VISIBILITY_LABELS, formatDate, cn } from '@/lib/utils'
import { DIMENSION_META } from '@/lib/constants'
import type { GEOAnalysisResult, GEODimension } from '@/lib/types'

function ScoreArc({ score }: { score: number }) {
  const color = getScoreColor(score)
  const radius = 58
  const stroke = 10
  const circumference = Math.PI * radius
  const filled = (score / 100) * circumference

  return (
    <svg width="140" height="85" viewBox="0 0 140 85">
      <path
        d={`M ${stroke} ${75} A ${radius} ${radius} 0 0 1 ${140 - stroke} ${75}`}
        fill="none" stroke="#E5E7EB" strokeWidth={stroke} strokeLinecap="round"
      />
      <path
        d={`M ${stroke} ${75} A ${radius} ${radius} 0 0 1 ${140 - stroke} ${75}`}
        fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        style={{ transition: 'stroke-dasharray 1s ease-out' }}
      />
    </svg>
  )
}

function DimensionRow({
  dim,
  onImprove,
}: {
  dim: GEODimension
  onImprove: (message: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const meta = DIMENSION_META[dim.id as keyof typeof DIMENSION_META]
  const pct = Math.round((dim.score / dim.maxScore) * 100)
  const color = getScoreColor(pct)
  const label = getScoreLabel(pct)

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden hover:border-gray-200 transition-colors">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer bg-white hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="text-xl flex-shrink-0">{meta?.icon ?? '📊'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-gray-800 text-sm">{dim.nameKo}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color, backgroundColor: `${color}18` }}>{label}</span>
              <span className="font-bold text-sm" style={{ color }}>{dim.score}<span className="text-gray-400 font-normal text-xs">/{dim.maxScore}</span></span>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
          </div>
        </div>
        {expanded ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
      </div>

      {expanded && (
        <div className="bg-gray-50 border-t border-gray-100 px-4 py-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">현재 분석</p>
            <ul className="space-y-1">
              {dim.observations.map((obs, i) => (
                <li key={i} className="flex gap-2 text-xs text-gray-600">
                  <span className="text-blue-400 flex-shrink-0 mt-0.5">•</span>{obs}
                </li>
              ))}
            </ul>
          </div>
          {dim.improvements.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1.5">개선 방향</p>
              <ul className="space-y-1">
                {dim.improvements.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-xs text-gray-600">
                    <span className="text-amber-500 flex-shrink-0 mt-0.5">→</span>{tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onImprove(`${dim.nameKo} 점수를 높이는 구체적인 방법과 실제 콘텐츠 예시를 알려줘.`) }}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors"
          >
            <MessageCircle size={13} />
            AI에게 이 부분 개선 방법 물어보기
          </button>
        </div>
      )}
    </div>
  )
}

function BenchmarkBar({ label, score, isMe, color }: { label: string; score: number; isMe?: boolean; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn('text-xs w-20 flex-shrink-0', isMe ? 'font-bold text-gray-900' : 'text-gray-500')}>{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-3 relative overflow-hidden">
        <div
          className="h-3 rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className={cn('text-sm w-8 text-right flex-shrink-0', isMe ? 'font-bold text-gray-900' : 'text-gray-500')}>{score}</span>
      {isMe && <span className="text-xs">⭐</span>}
    </div>
  )
}

interface DashboardScreenProps {
  analysis: GEOAnalysisResult
  combined?: import('@/app/api/analyze/combined/route').CombinedAnalysisResult | null
  previousScore: number | null
  onBack: () => void
  onReanalyze: () => void
  onOpenChat: (message?: string) => void
}

export function DashboardScreen({ analysis, combined, previousScore, onBack, onReanalyze, onOpenChat }: DashboardScreenProps) {
  const [copied, setCopied] = useState(false)
  const gradeConfig = getGradeConfig(analysis.grade)
  const scoreDiff = previousScore != null ? analysis.totalScore - previousScore : null
  const radarData = analysis.dimensions.map(d => ({
    subject: d.nameKo.replace('E-E-A-T ', ''),
    score: Math.round((d.score / d.maxScore) * 100),
    fullMark: 100,
  }))

  async function copyReport() {
    const text = [
      `[GEO Score 분석 리포트]`,
      `서비스: ${analysis.serviceName} (${analysis.categoryLabel})`,
      `총점: ${analysis.totalScore}/100 (${analysis.grade}등급 · ${analysis.gradeLabel})`,
      ``,
      `차원별 점수:`,
      ...analysis.dimensions.map(d => `  ${d.nameKo}: ${d.score}/${d.maxScore}점`),
      ``,
      `업계 평균: ${analysis.industryAverage}점 | 상위 점수: ${analysis.topPerformerScore}점`,
      `AI 인용 확률: ${analysis.citationProbability}%`,
      ``,
      `주요 개선 과제:`,
      ...analysis.topIssues.map((issue, i) => `  ${i + 1}. ${issue}`),
      ``,
      `분석일: ${formatDate(analysis.analyzedAt)}`,
      `by GEO Score (geo-score.vercel.app)`,
    ].join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">새 분석</span>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 truncate">{analysis.serviceName}</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex-shrink-0">{analysis.categoryLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={copyReport} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg transition-colors">
              {copied ? <Check size={13} className="text-green-600" /> : <Share2 size={13} />}
              <span className="hidden sm:inline">{copied ? '복사됨' : '공유'}</span>
            </button>
            <button onClick={onReanalyze} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors">
              <RefreshCw size={13} />
              <span className="hidden sm:inline">재분석</span>
            </button>
            {analysis.url && (
              <Link
                href={`/url-analyzer?url=${encodeURIComponent(analysis.url)}`}
                className="flex items-center gap-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Globe size={13} />
                <span className="hidden sm:inline">UI/UX 분석</span>
              </Link>
            )}
            <Link
              href="/detail"
              className="flex items-center gap-1 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 px-3 py-1.5 rounded-lg transition-all shadow-sm"
            >
              <BarChart3 size={13} />
              <span className="hidden sm:inline">상세 분석</span>
            </Link>
            <Link
              href={`/generate?service=${encodeURIComponent(analysis.serviceName)}&category=${analysis.category}&categoryLabel=${encodeURIComponent(analysis.categoryLabel)}&score=${analysis.totalScore}`}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Sparkles size={13} />
              <span className="hidden sm:inline">콘텐츠 생성</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4 pb-24">
        {/* Analysis mode transparency banner */}
        {(analysis as GEOAnalysisResult & { analysisMode?: string }).analysisMode === 'estimation' && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <Info size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <span className="font-bold">AI 추정 점수</span> — URL을 입력하지 않아 GPT-4o가 서비스 특성을 추론해 점수를 산출했습니다.
              <Link href="/" className="ml-1 font-semibold underline">URL을 추가하면 실제 페이지를 분석</Link>해 더 정확한 점수를 얻을 수 있습니다.
            </div>
          </div>
        )}
        {(analysis as GEOAnalysisResult & { analysisMode?: string }).analysisMode === 'real_url' && (
          <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <FlaskConical size={15} className="text-green-600 flex-shrink-0" />
            <p className="text-xs text-green-800">
              <span className="font-bold">실제 페이지 분석</span> — {analysis.url} 를 직접 방문해 HTML을 파싱한 실측 점수입니다.
            </p>
          </div>
        )}

        {/* Score Hero */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            {/* Gauge */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="relative">
                <ScoreArc score={analysis.totalScore} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pb-4">
                  <span className="text-3xl font-extrabold text-gray-900">{analysis.totalScore}</span>
                  <span className="text-xs text-gray-400">/ 100</span>
                  <span className="text-lg font-bold mt-0.5" style={{ color: gradeConfig.color }}>{analysis.grade}</span>
                </div>
              </div>
              <div className="text-center -mt-1">
                <span className="text-sm font-semibold" style={{ color: gradeConfig.color }}>{analysis.gradeLabel}</span>
                {scoreDiff != null && (
                  <div className={cn(
                    'flex items-center justify-center gap-1 mt-1 text-xs font-medium',
                    scoreDiff > 0 ? 'text-green-600' : scoreDiff < 0 ? 'text-red-600' : 'text-gray-500'
                  )}>
                    {scoreDiff > 0 ? <TrendingUp size={12} /> : scoreDiff < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                    {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff}점 (이전 대비)
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex-1 space-y-3 w-full">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-blue-600 font-semibold mb-0.5">AI 가시성</p>
                  <p className="font-bold text-blue-800">{VISIBILITY_LABELS[analysis.aiVisibilityLevel]}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-xs text-green-600 font-semibold mb-0.5">AI 인용 확률</p>
                  <p className="font-bold text-green-800">{analysis.citationProbability}%</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{analysis.summary}</p>
              <p className="text-xs text-indigo-600 italic">{analysis.competitiveInsight}</p>
            </div>
          </div>
        </div>

        {/* ── Combined Analysis Panel ── */}
        {combined && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-slate-800 to-indigo-900 text-white">
              <span className="text-2xl">{combined.combined.gapEmoji}</span>
              <div className="flex-1">
                <p className="font-bold text-base">{combined.combined.gapLabel}</p>
                <p className="text-slate-300 text-xs mt-0.5">GEO 준비도 + AI 실측 종합 분석</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-3xl font-extrabold">{combined.combined.unifiedScore}</p>
                <p className="text-slate-400 text-xs">종합 점수</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Score comparison */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-indigo-600 mb-1">GEO 준비도 (내부 신호)</p>
                  <div className="flex items-end gap-1.5">
                    <span className="text-2xl font-extrabold text-indigo-700">{combined.combined.geoReadinessScore}</span>
                    <span className="text-xs text-indigo-400 mb-0.5">/100 · {combined.geoAnalysis.analysisMode === 'real_url' ? '실측' : '추정'}</span>
                  </div>
                  <div className="mt-1.5 bg-indigo-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-indigo-500 transition-all" style={{ width: `${combined.combined.geoReadinessScore}%` }} />
                  </div>
                </div>
                <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-violet-600 mb-1">AI 실측 인용율 (외부 신호)</p>
                  <div className="flex items-end gap-1.5">
                    <span className="text-2xl font-extrabold text-violet-700">{combined.combined.citationRate}</span>
                    <span className="text-xs text-violet-400 mb-0.5">% · {combined.citationTest.hasOpenRouter ? '4플랫폼' : '1플랫폼'} 실측</span>
                  </div>
                  <div className="mt-1.5 bg-violet-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-violet-500 transition-all" style={{ width: `${combined.combined.citationRate}%` }} />
                  </div>
                </div>
              </div>

              {/* Gap insight */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2">
                <p className="text-sm font-bold text-gray-800">격차 분석</p>
                <p className="text-sm text-gray-600 leading-relaxed">{combined.combined.gapInsight}</p>
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-indigo-700">👉 권장 전략</p>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{combined.combined.gapAction}</p>
                </div>
              </div>

              {/* AI 응답 점유율 */}
              {combined.responseShare && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">AI 응답 점유율</p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: combined.responseShare.benchmarkColor, backgroundColor: `${combined.responseShare.benchmarkColor}18` }}>
                      {combined.responseShare.benchmarkLabel}
                    </span>
                  </div>

                  {/* Overall weighted share */}
                  <div className="bg-gray-50 rounded-xl p-3 mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <span className="text-xs text-gray-500">가중 점유율</span>
                        <span className="text-xs text-gray-400 ml-1">(질문 유형 중요도 반영)</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-extrabold" style={{ color: combined.responseShare.benchmarkColor }}>{combined.responseShare.weightedShareRate}%</span>
                        <span className="text-xs text-gray-400">{combined.responseShare.totalMentions}/{combined.responseShare.totalResponses} 응답</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${combined.responseShare.weightedShareRate}%`, backgroundColor: combined.responseShare.benchmarkColor }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{combined.responseShare.insight}</p>
                  </div>

                  {/* Per-platform bars */}
                  <div className="space-y-2 mb-3">
                    {combined.responseShare.byPlatform.map(p => {
                      const barColor = p.status === 'skipped' ? '#D1D5DB'
                        : p.shareRate >= 60 ? '#059669' : p.shareRate >= 30 ? '#2563EB'
                        : p.shareRate >= 10 ? '#D97706' : '#EF4444'
                      return (
                        <div key={p.platform} className="flex items-center gap-2">
                          <span className="text-sm w-5 flex-shrink-0">{p.emoji}</span>
                          <span className="text-xs text-gray-600 w-20 flex-shrink-0">{p.platformKo}</span>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            {p.status !== 'skipped' && p.status !== 'error' && (
                              <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${p.shareRate}%`, backgroundColor: barColor }} />
                            )}
                          </div>
                          <span className="text-xs font-bold w-20 text-right flex-shrink-0" style={{ color: barColor }}>
                            {p.status === 'skipped' ? '미설정' : p.status === 'error' ? '오류' : `${p.shareRate}% (${p.mentionCount}/${p.totalQueries})`}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Per question type */}
                  {combined.responseShare.byQuestionType.length > 0 && (
                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-xs font-bold text-gray-500 mb-2">질문 유형별 점유율</p>
                      <div className="space-y-1.5">
                        {combined.responseShare.byQuestionType.map(t => (
                          <div key={t.type} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-24 flex-shrink-0">{t.typeKo}</span>
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-1.5 rounded-full"
                                style={{ width: `${t.shareRate}%`, backgroundColor: t.shareRate >= 60 ? '#059669' : t.shareRate >= 30 ? '#2563EB' : t.shareRate > 0 ? '#D97706' : '#E5E7EB' }} />
                            </div>
                            <span className="text-xs font-bold w-12 text-right flex-shrink-0 text-gray-600">{t.shareRate}%</span>
                            <span className="text-xs text-gray-300 w-4 text-center flex-shrink-0" title={`가중치 ${t.weight}×`}>×{t.weight}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Unified recommendations */}
              {combined.combined.unifiedRecommendations.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">통합 우선순위 개선안</p>
                  <div className="space-y-2">
                    {combined.combined.unifiedRecommendations.slice(0, 3).map((rec, i) => {
                      const sourceLabel = { geo: '기술분석', citation: '실측결과', combined: '교차분석' }[rec.source]
                      const sourceBg = { geo: 'bg-indigo-50 text-indigo-700', citation: 'bg-violet-50 text-violet-700', combined: 'bg-pink-50 text-pink-700' }[rec.source]
                      const pc = getPriorityConfig(rec.priority)
                      return (
                        <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                            style={{ color: pc.color, backgroundColor: pc.bg }}>{pc.label}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-sm font-semibold text-gray-800">{rec.title}</p>
                              <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', sourceBg)}>{sourceLabel}</span>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">{rec.description}</p>
                          </div>
                          <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full flex-shrink-0 font-medium">{rec.expectedImpact}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Correlation note */}
              <p className="text-xs text-gray-400 italic text-center">{combined.combined.correlationNote}</p>
            </div>
          </div>
        )}

        {/* Radar + Benchmark */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Radar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-sm font-bold text-gray-700 mb-2">차원별 균형 분석</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#E5E7EB" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#6B7280' }} />
                  <Radar dataKey="score" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Benchmark */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-sm font-bold text-gray-700 mb-4">업계 비교</p>
            <div className="space-y-3">
              <BenchmarkBar label="상위 10%" score={analysis.topPerformerScore} color="#7C3AED" />
              <BenchmarkBar label="내 서비스" score={analysis.totalScore} isMe color={getScoreColor(analysis.totalScore)} />
              <BenchmarkBar label="업계 평균" score={analysis.industryAverage} color="#94A3B8" />
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              {analysis.totalScore > analysis.industryAverage ? (
                <p className="text-xs text-green-600 font-medium">
                  업계 평균보다 <span className="font-bold">{analysis.totalScore - analysis.industryAverage}점</span> 높아요 🎉
                </p>
              ) : (
                <p className="text-xs text-orange-600 font-medium">
                  업계 평균까지 <span className="font-bold">{analysis.industryAverage - analysis.totalScore}점</span> 부족해요
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Dimension Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>📊</span> 5가지 차원 상세 분석
            <span className="text-xs text-gray-400 font-normal ml-1">각 항목을 클릭해 상세 내용을 확인하세요</span>
          </h2>
          <div className="space-y-2">
            {analysis.dimensions.map(dim => (
              <DimensionRow key={dim.id} dim={dim} onImprove={(msg) => onOpenChat(msg)} />
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>🎯</span> 핵심 개선 권고사항
            </h2>
            <div className="space-y-3">
              {analysis.recommendations.map((rec, i) => {
                const pc = getPriorityConfig(rec.priority)
                return (
                  <div key={i} className="rounded-xl border p-4" style={{ borderColor: `${pc.color}30`, backgroundColor: `${pc.color}06` }}>
                    <div className="flex items-start gap-3">
                      <span
                        className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 mt-0.5"
                        style={{ color: pc.color, backgroundColor: pc.bg }}
                      >
                        {pc.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-semibold text-sm text-gray-800">{rec.title}</p>
                          <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full flex-shrink-0">{rec.expectedImpact}</span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{rec.description}</p>
                        <p className="text-xs text-gray-400 mt-1.5">난이도: {getEffortLabel(rec.effort)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick Wins */}
        {analysis.quickWins.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
            <h2 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
              <span>⚡</span> 지금 바로 할 수 있는 빠른 개선 방법
            </h2>
            <div className="space-y-2">
              {analysis.quickWins.map((win, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-amber-800">
                  <span className="text-amber-500 font-bold flex-shrink-0 mt-0.5">✓</span>
                  <span>{win}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detail Dashboard CTA Banner */}
        <Link href="/detail"
          className="block bg-gradient-to-r from-slate-800 to-indigo-900 hover:from-slate-900 hover:to-indigo-950 text-white rounded-2xl p-5 transition-all hover:shadow-xl group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-colors">
              <BarChart3 size={22} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-bold text-base">상세 GEO 대시보드 보기</p>
                <span className="text-xs bg-indigo-500 text-white px-2 py-0.5 rounded-full font-semibold">NEW</span>
              </div>
              <p className="text-slate-300 text-sm">AI 플랫폼별 분석 · GEO 체크리스트 · 액션 매트릭스 · 30일 로드맵</p>
            </div>
            <span className="text-white/40 group-hover:text-white transition-all text-xl">→</span>
          </div>
        </Link>

        {/* CTA Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* AI Agent CTA */}
          <button
            onClick={() => onOpenChat()}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl p-4 text-left transition-all hover:shadow-lg group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🤖</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">GEO AI 전문가</p>
                <p className="text-indigo-200 text-xs mt-0.5">대화형 전략 컨설팅</p>
              </div>
              <span className="text-white/60 group-hover:text-white transition-colors flex-shrink-0">→</span>
            </div>
          </button>

          {/* Content Studio CTA */}
          <Link
            href="/studio"
            className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-2xl p-4 text-left transition-all hover:shadow-lg group block"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🎨</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">콘텐츠 스튜디오</p>
                <p className="text-purple-200 text-xs mt-0.5">이미지·참고자료 기반 생성</p>
              </div>
              <span className="text-white/60 group-hover:text-white transition-colors flex-shrink-0">→</span>
            </div>
          </Link>

          {/* Content Generator CTA */}
          <Link
            href={`/generate?service=${encodeURIComponent(analysis.serviceName)}&category=${analysis.category}&categoryLabel=${encodeURIComponent(analysis.categoryLabel)}&score=${analysis.totalScore}`}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl p-4 text-left transition-all hover:shadow-lg group block"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">콘텐츠 생성기</p>
                <p className="text-emerald-100 text-xs mt-0.5">플랫폼별 맞춤 생성</p>
              </div>
              <span className="text-white/60 group-hover:text-white transition-colors flex-shrink-0">→</span>
            </div>
          </Link>
        </div>

        <p className="text-xs text-center text-gray-400">분석 완료: {formatDate(analysis.analyzedAt)}</p>
      </main>
    </div>
  )
}
