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
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
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
    <div className="min-h-screen bg-[#F5F5F0]">
      {/* Sticky Header */}
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-14 flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">홈</span>
          </button>
          <div className="w-px h-4 bg-gray-200 flex-shrink-0" />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-bold text-gray-900 truncate">{analysis.serviceName}</span>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:inline">{analysis.categoryLabel}</span>
            {/* Score badge — desktop header */}
            <span className="hidden lg:inline-flex items-center gap-1.5 ml-2 text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 flex-shrink-0">
              <span style={{ color: gradeConfig.color }}>{analysis.totalScore}점</span>
              <span className="text-gray-400">·</span>
              <span style={{ color: gradeConfig.color }}>{analysis.grade}등급</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={copyReport} className="hidden sm:flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2.5 py-1.5 rounded-lg transition-colors">
              {copied ? <Check size={13} className="text-green-600" /> : <Share2 size={13} />}
              <span>{copied ? '복사됨' : '공유'}</span>
            </button>
            <button onClick={onReanalyze} className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2.5 py-1.5 rounded-lg transition-colors">
              <RefreshCw size={13} />
              <span className="hidden sm:inline">재분석</span>
            </button>
            {analysis.url && (
              <Link href={`/url-analyzer?url=${encodeURIComponent(analysis.url)}`}
                className="hidden md:flex items-center gap-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1.5 rounded-lg transition-colors">
                <Globe size={13} /><span>UI/UX 분석</span>
              </Link>
            )}
            <Link href="/detail"
              className="flex items-center gap-1 text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 px-3 py-1.5 rounded-lg transition-colors">
              <BarChart3 size={13} /><span className="hidden sm:inline">상세 분석</span>
            </Link>
            <Link href={`/generate?service=${encodeURIComponent(analysis.serviceName)}&category=${analysis.category}&categoryLabel=${encodeURIComponent(analysis.categoryLabel)}&score=${analysis.totalScore}`}
              className="hidden sm:flex items-center gap-1 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2.5 py-1.5 rounded-lg transition-colors">
              <Sparkles size={13} /><span>콘텐츠 생성</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {/* ── Analysis mode banners — always full-width at top ── */}
        {(analysis as GEOAnalysisResult & { analysisMode?: string }).analysisMode === 'estimation' && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mt-4">
            <Info size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <span className="font-bold">AI 추정 점수</span> — URL 없이 GPT-4o가 서비스 특성을 추론했습니다.
              <Link href="/" className="ml-1 font-semibold underline">URL 추가 시 실측 점수</Link>로 전환됩니다.
            </div>
          </div>
        )}
        {(analysis as GEOAnalysisResult & { analysisMode?: string }).analysisMode === 'real_url' && (
          <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mt-4">
            <FlaskConical size={14} className="text-green-600 flex-shrink-0" />
            <p className="text-xs text-green-800"><span className="font-bold">실제 페이지 분석</span> — {analysis.url}의 HTML을 직접 파싱한 실측 점수입니다.</p>
          </div>
        )}
      </div>

      {/* ── MAIN LAYOUT ── */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-5 pb-24 lg:flex lg:gap-6 lg:items-start">

        {/* ─── LEFT SIDEBAR ─── */}
        <aside className="lg:w-72 xl:w-80 lg:flex-shrink-0 lg:sticky lg:top-16 lg:self-start space-y-3 mb-4 lg:mb-0">

          {/* Score card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            {/* Arc + Score */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <ScoreArc score={analysis.totalScore} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pb-4">
                  <span className="text-4xl font-extrabold text-gray-900">{analysis.totalScore}</span>
                  <span className="text-xs text-gray-400">/ 100</span>
                </div>
              </div>
              <div className="text-center mt-1">
                <span className="text-base font-bold" style={{ color: gradeConfig.color }}>{analysis.grade}등급 · {analysis.gradeLabel}</span>
                {scoreDiff != null && (
                  <div className={cn('flex items-center justify-center gap-1 mt-1 text-xs font-medium', scoreDiff > 0 ? 'text-green-600' : scoreDiff < 0 ? 'text-red-500' : 'text-gray-400')}>
                    {scoreDiff > 0 ? <TrendingUp size={11} /> : scoreDiff < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
                    {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff}점 (이전 대비)
                  </div>
                )}
              </div>
            </div>
            {/* Key metrics */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100">
              <div className="text-center p-2.5 bg-blue-50 rounded-lg">
                <p className="text-lg font-extrabold text-blue-700">{analysis.citationProbability}%</p>
                <p className="text-xs text-blue-500 mt-0.5">AI 인용 확률</p>
              </div>
              <div className="text-center p-2.5 bg-gray-50 rounded-lg">
                <p className="text-lg font-extrabold text-gray-800">{VISIBILITY_LABELS[analysis.aiVisibilityLevel]}</p>
                <p className="text-xs text-gray-400 mt-0.5">AI 가시성</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mt-3 italic">{analysis.competitiveInsight}</p>
          </div>

          {/* Radar chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">차원별 균형</p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#E5E7EB" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#6B7280' }} />
                  <Radar dataKey="score" stroke="#111111" fill="#111111" fillOpacity={0.12} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Benchmark */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">업계 비교</p>
            <div className="space-y-3">
              <BenchmarkBar label="상위 10%" score={analysis.topPerformerScore} color="#374151" />
              <BenchmarkBar label="내 서비스" score={analysis.totalScore} isMe color={getScoreColor(analysis.totalScore)} />
              <BenchmarkBar label="업계 평균" score={analysis.industryAverage} color="#D1D5DB" />
            </div>
            <p className={cn('text-xs font-medium mt-4 pt-3 border-t border-gray-100', analysis.totalScore > analysis.industryAverage ? 'text-green-600' : 'text-orange-500')}>
              {analysis.totalScore > analysis.industryAverage
                ? `업계 평균보다 ${analysis.totalScore - analysis.industryAverage}점 높음`
                : `업계 평균까지 ${analysis.industryAverage - analysis.totalScore}점 부족`}
            </p>
          </div>

        </aside>

        {/* ─── RIGHT CONTENT ─── */}
        <div className="flex-1 min-w-0 space-y-4">

        {/* ── Combined Analysis Panel ── */}
        {combined && (
          <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
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
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-900 mb-1">GEO 준비도 (내부 신호)</p>
                  <div className="flex items-end gap-1.5">
                    <span className="text-2xl font-extrabold text-gray-800">{combined.combined.geoReadinessScore}</span>
                    <span className="text-xs text-gray-500 mb-0.5">/100 · {combined.geoAnalysis.analysisMode === 'real_url' ? '실측' : '추정'}</span>
                  </div>
                  <div className="mt-1.5 bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-gray-800 transition-all" style={{ width: `${combined.combined.geoReadinessScore}%` }} />
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">AI 실측 인용율 (외부 신호)</p>
                  <div className="flex items-end gap-1.5">
                    <span className="text-2xl font-extrabold text-gray-800">{combined.combined.citationRate}</span>
                    <span className="text-xs text-gray-500 mb-0.5">% · {combined.citationTest.hasOpenRouter ? '4플랫폼' : '1플랫폼'} 실측</span>
                  </div>
                  <div className="mt-1.5 bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-gray-500 transition-all" style={{ width: `${combined.combined.citationRate}%` }} />
                  </div>
                </div>
              </div>

              {/* Gap insight */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2">
                <p className="text-sm font-bold text-gray-800">격차 분석</p>
                <p className="text-sm text-gray-600 leading-relaxed">{combined.combined.gapInsight}</p>
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-800">👉 권장 전략</p>
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
                      const sourceBg = { geo: 'bg-gray-50 text-gray-800', citation: 'bg-gray-50 text-gray-800', combined: 'bg-pink-50 text-pink-700' }[rec.source]
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

        {/* Dimension Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">5가지 차원 분석</h2>
            <span className="text-xs text-gray-400">항목 클릭 시 상세 내용</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {analysis.dimensions.map(dim => (
              <DimensionRow key={dim.id} dim={dim} onImprove={(msg) => onOpenChat(msg)} />
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-bold text-gray-900 mb-4">핵심 개선 권고사항</h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {analysis.recommendations.map((rec, i) => {
                const pc = getPriorityConfig(rec.priority)
                return (
                  <div key={i} className="rounded-xl border p-4 flex items-start gap-3" style={{ borderColor: `${pc.color}25`, backgroundColor: `${pc.color}05` }}>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5" style={{ color: pc.color, backgroundColor: pc.bg }}>
                      {pc.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-semibold text-sm text-gray-800 leading-snug">{rec.title}</p>
                        <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full flex-shrink-0">{rec.expectedImpact}</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{rec.description}</p>
                      <p className="text-xs text-gray-400 mt-1.5">난이도: {getEffortLabel(rec.effort)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick Wins */}
        {analysis.quickWins.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
            <h2 className="font-bold text-amber-900 mb-3 flex items-center gap-1.5">⚡ 즉시 적용 가능한 개선안</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {analysis.quickWins.map((win, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-amber-800 bg-white/60 rounded-lg px-3 py-2">
                  <span className="text-amber-500 font-bold flex-shrink-0 mt-0.5">✓</span>
                  <span>{win}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Detail dashboard link — full width header */}
          <Link href="/detail"
            className="flex items-center gap-4 p-5 bg-gray-900 hover:bg-gray-800 text-white transition-colors group"
          >
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <BarChart3 size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold">상세 GEO 대시보드</p>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold">NEW</span>
              </div>
              <p className="text-gray-400 text-xs mt-0.5">경쟁사 분석 · 플랫폼 전략 · 콘텐츠 플랜 · 기술 구현 가이드</p>
            </div>
            <span className="text-gray-500 group-hover:text-white transition-colors text-lg">→</span>
          </Link>
          {/* Action buttons row */}
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            <button onClick={() => onOpenChat()}
              className="flex flex-col items-center gap-2 py-4 px-3 hover:bg-gray-50 transition-colors group">
              <span className="text-xl">🤖</span>
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-800">AI 전문가</p>
                <p className="text-xs text-gray-400 mt-0.5 hidden lg:block">대화형 컨설팅</p>
              </div>
            </button>
            <Link href="/studio"
              className="flex flex-col items-center gap-2 py-4 px-3 hover:bg-gray-50 transition-colors group">
              <span className="text-xl">🎨</span>
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-800">스튜디오</p>
                <p className="text-xs text-gray-400 mt-0.5 hidden lg:block">참고자료 기반 생성</p>
              </div>
            </Link>
            <Link href={`/generate?service=${encodeURIComponent(analysis.serviceName)}&category=${analysis.category}&categoryLabel=${encodeURIComponent(analysis.categoryLabel)}&score=${analysis.totalScore}`}
              className="flex flex-col items-center gap-2 py-4 px-3 hover:bg-gray-50 transition-colors group">
              <span className="text-xl">✍️</span>
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-800">콘텐츠 생성</p>
                <p className="text-xs text-gray-400 mt-0.5 hidden lg:block">플랫폼별 맞춤</p>
              </div>
            </Link>
          </div>
        </div>

        <p className="text-xs text-center text-gray-400 pb-2">분석 완료: {formatDate(analysis.analyzedAt)}</p>
        </div>{/* end right column */}
      </main>
    </div>
  )
}
