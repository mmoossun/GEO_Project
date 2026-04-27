'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, AlertCircle,
  TrendingUp, TrendingDown, BarChart3, Globe, Target,
  FileText, Code2, Layers, ChevronDown, ChevronUp,
  Copy, Check, Shield, Zap, Flag, BookOpen, Award,
} from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, Legend,
  ScatterChart, Scatter, ZAxis, ReferenceLine,
} from 'recharts'
import { cn, getScoreColor } from '@/lib/utils'
import type { GEOAnalysisResult } from '@/lib/types'
import type {
  DetailedAnalysis, CompetitorProfile, PlatformStrategy,
  ContentBlueprint, TechImplementation, ChecklistItem, ActionItem,
} from '@/app/api/analyze/detail/route'
import type { ResponseShare } from '@/app/api/analyze/combined/route'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ScoreBar({ score, max, color }: { score: number; max: number; color: string }) {
  const pct = Math.round((score / max) * 100)
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold w-8 text-right flex-shrink-0" style={{ color }}>{score}/{max}</span>
    </div>
  )
}

function PriorityBadge({ p }: { p: 'critical' | 'high' | 'medium' | string }) {
  const cfg = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  }[p] ?? 'bg-gray-100 text-gray-600 border-gray-200'
  const lbl = { critical: '긴급', high: '높음', medium: '보통' }[p] ?? p
  return <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border', cfg)}>{lbl}</span>
}

function MiniArc({ score, size = 56 }: { score: number; size?: number }) {
  const color = getScoreColor(score)
  const r = size * 0.38; const stroke = size * 0.1; const circ = Math.PI * r
  return (
    <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
      <path d={`M ${stroke} ${size * 0.58} A ${r} ${r} 0 0 1 ${size - stroke} ${size * 0.58}`} fill="none" stroke="#E5E7EB" strokeWidth={stroke} strokeLinecap="round" />
      <path d={`M ${stroke} ${size * 0.58} A ${r} ${r} 0 0 1 ${size - stroke} ${size * 0.58}`} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(score / 100) * circ} ${circ}`} />
      <text x={size / 2} y={size * 0.48} textAnchor="middle" fontSize={size * 0.24} fontWeight="bold" fill={color}>{score}</text>
    </svg>
  )
}

// ─── TABS ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',     label: '종합 개요',    icon: BarChart3 },
  { id: 'competitors',  label: '경쟁사 분석',  icon: Shield },
  { id: 'platforms',    label: '플랫폼 전략',  icon: Globe },
  { id: 'content',      label: '콘텐츠 플랜',  icon: FileText },
  { id: 'technical',    label: '기술 구현',    icon: Code2 },
  { id: 'execution',    label: '실행 계획',    icon: Zap },
] as const
type TabId = (typeof TABS)[number]['id']

// ─── TAB 1: Overview ──────────────────────────────────────────────────────────

function OverviewTab({ d, base, responseShare }: { d: DetailedAnalysis; base: GEOAnalysisResult; responseShare?: ResponseShare | null }) {
  const radarData = base.dimensions.map(dim => ({
    subject: dim.nameKo.replace('E-E-A-T ', ''),
    score: Math.round((dim.score / dim.maxScore) * 100),
  }))
  return (
    <div className="space-y-5">
      {/* Score cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '현재 점수', value: `${d.baseScore}`, sub: `${base.grade}등급`, color: getScoreColor(d.baseScore) },
          { label: '90일 목표', value: `${d.potentialScore}`, sub: '+' + (d.potentialScore - d.baseScore) + '점 가능', color: '#059669' },
          { label: 'AI 인용 확률', value: `${base.citationProbability}%`, sub: '현재 기준', color: '#2563EB' },
          { label: '업계 대비', value: `${base.totalScore >= base.industryAverage ? '+' : ''}${base.totalScore - base.industryAverage}pt`, sub: `업계 평균 ${base.industryAverage}점`, color: base.totalScore >= base.industryAverage ? '#059669' : '#DC2626' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-100 p-4 text-center">
            <p className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs font-semibold text-gray-600 mt-0.5">{s.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Radar + Brand Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-100 p-5">
          <p className="text-sm font-bold text-gray-700 mb-3">차원별 균형</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#E5E7EB" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#6B7280' }} />
                <Radar dataKey="score" stroke="#111111" fill="#111111" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-5 space-y-3">
          <p className="text-sm font-bold text-gray-700">브랜드 신뢰 지표</p>
          {[
            { label: '감성 점수', value: d.brandMetrics?.sentimentScore ?? 0, color: '#059669' },
            { label: '주제 권위', value: d.brandMetrics?.topicalAuthority ?? 0, color: '#111111' },
            { label: 'AI 인지도', value: d.brandMetrics?.shareOfVoice ?? 0, color: '#7C3AED' },
            { label: '신뢰 점수', value: d.brandMetrics?.trustScore ?? 0, color: '#0891B2' },
          ].map((m, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-20 flex-shrink-0">{m.label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full" style={{ width: `${m.value}%`, backgroundColor: m.color }} />
              </div>
              <span className="text-xs font-bold w-8 text-right" style={{ color: m.color }}>{m.value}</span>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="font-bold text-sm text-gray-800">{d.brandMetrics?.recognitionKo ?? '-'}</p>
              <p className="text-xs text-gray-400">AI 인지도</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="font-bold text-sm" style={{ color: d.brandMetrics?.sentiment === 'positive' ? '#059669' : d.brandMetrics?.sentiment === 'negative' ? '#DC2626' : '#D97706' }}>
                {{ positive: '긍정', neutral: '중립', negative: '부정' }[d.brandMetrics?.sentiment ?? 'neutral']}
              </p>
              <p className="text-xs text-gray-400">콘텐츠 감성</p>
            </div>
          </div>
        </div>
      </div>

      {/* Competitive gap bars */}
      <div className="bg-white rounded-lg border border-gray-100 p-5">
        <p className="text-sm font-bold text-gray-700 mb-4">경쟁 포지션 (차원별)</p>
        <div className="space-y-3">
          {(d.competitiveGap ?? []).map((g, i) => {
            const myPct = g.topPerformer > 0 ? g.yourScore / g.topPerformer * 100 : 0
            const avgPct = g.topPerformer > 0 ? g.industryAvg / g.topPerformer * 100 : 0
            const myColor = getScoreColor(Math.round((g.yourScore / (g.topPerformer || 1)) * 100))
            return (
              <div key={i}>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span className="font-medium text-gray-700">{g.dimension}</span>
                  <span className="text-gray-400">내 점수 {g.yourScore} · 평균 {g.industryAvg} · 최고 {g.topPerformer}</span>
                </div>
                <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="absolute h-3 rounded-full bg-gray-300" style={{ width: `${avgPct}%` }} />
                  <div className="absolute h-3 rounded-full transition-all duration-700" style={{ width: `${myPct}%`, backgroundColor: myColor }} />
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-gray-300 inline-block" />업계 평균</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-gray-700 inline-block" />내 서비스</span>
        </div>
      </div>

      {/* AI 응답 점유율 */}
      {responseShare && responseShare.totalResponses > 0 && (
        <div className="bg-white rounded-lg border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-700">AI 응답 점유율</p>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ color: responseShare.benchmarkColor, backgroundColor: `${responseShare.benchmarkColor}18` }}>
              {responseShare.benchmarkLabel}
            </span>
          </div>

          {/* Overall weighted share */}
          <div className="flex items-center gap-4 mb-4">
            <div className="text-center">
              <p className="text-3xl font-extrabold" style={{ color: responseShare.benchmarkColor }}>{responseShare.weightedShareRate}%</p>
              <p className="text-xs text-gray-400 mt-0.5">가중 점유율</p>
            </div>
            <div className="flex-1">
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                <div className="h-3 rounded-full transition-all duration-700"
                  style={{ width: `${responseShare.weightedShareRate}%`, backgroundColor: responseShare.benchmarkColor }} />
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{responseShare.insight}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Platform breakdown */}
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">플랫폼별</p>
              <div className="space-y-2">
                {responseShare.byPlatform.filter(p => p.status !== 'skipped').map(p => {
                  const c = p.shareRate >= 60 ? '#059669' : p.shareRate >= 30 ? '#2563EB' : p.shareRate >= 10 ? '#D97706' : '#EF4444'
                  return (
                    <div key={p.platform} className="flex items-center gap-2">
                      <span className="text-sm w-5 flex-shrink-0">{p.emoji}</span>
                      <span className="text-xs text-gray-600 w-20 flex-shrink-0">{p.platformKo}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-1.5 rounded-full" style={{ width: `${p.shareRate}%`, backgroundColor: c }} />
                      </div>
                      <span className="text-xs font-bold w-16 text-right flex-shrink-0" style={{ color: c }}>
                        {p.shareRate}% ({p.mentionCount}/{p.totalQueries})
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Question type breakdown */}
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">질문 유형별</p>
              <div className="space-y-2">
                {responseShare.byQuestionType.map(t => (
                  <div key={t.type} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-24 flex-shrink-0">{t.typeKo}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-1.5 rounded-full"
                        style={{ width: `${t.shareRate}%`, backgroundColor: t.shareRate >= 60 ? '#059669' : t.shareRate >= 30 ? '#2563EB' : t.shareRate > 0 ? '#D97706' : '#E5E7EB' }} />
                    </div>
                    <span className="text-xs font-bold w-8 text-right flex-shrink-0 text-gray-600">{t.shareRate}%</span>
                    <span className="text-xs text-gray-300 w-6 text-right flex-shrink-0">×{t.weight}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Strengths / Gaps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-100 rounded-lg p-5">
          <p className="text-sm font-bold text-green-900 mb-3 flex items-center gap-2"><TrendingUp size={15} />강점 영역</p>
          {(d.strengthAreas ?? []).map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-green-800 mb-2">
              <CheckCircle2 size={14} className="text-green-600 flex-shrink-0 mt-0.5" />{s}
            </div>
          ))}
        </div>
        <div className="bg-red-50 border border-red-100 rounded-lg p-5">
          <p className="text-sm font-bold text-red-900 mb-3 flex items-center gap-2"><TrendingDown size={15} />콘텐츠 공백</p>
          {(d.contentGaps ?? []).map((g, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-red-800 mb-2">
              <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />{g}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── TAB 2: Competitors ───────────────────────────────────────────────────────

function CompetitorsTab({ d }: { d: DetailedAnalysis }) {
  const { competitors = [], competitivePosition = '', winningOpportunity = '' } = d.competitorAnalysis ?? {}
  const allServices = [
    {
      name: d.serviceName,
      geoScore: d.baseScore,
      grade: '',
      citationRate: 0,
      strengths: (d.strengthAreas ?? []).slice(0, 2),
      weaknesses: (d.contentGaps ?? []).slice(0, 2),
      contentAdvantage: '현재 서비스',
      topCitedContent: '',
      strategicThreat: 'low' as const,
      dimensions: (d.competitiveGap ?? []).map(g => ({ nameKo: g.dimension, score: g.yourScore, maxScore: g.topPerformer })),
      isMe: true,
    },
    ...competitors.map(c => ({ ...c, isMe: false })),
  ]

  const threatColors = { low: '#059669', medium: '#D97706', high: '#DC2626' }
  const threatLabels = { low: '낮음', medium: '보통', high: '높음' }

  return (
    <div className="space-y-5">
      {/* Position summary */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-5 text-white">
        <p className="font-bold text-base mb-2">경쟁적 포지셔닝</p>
        <p className="text-slate-300 text-sm leading-relaxed mb-3">{competitivePosition}</p>
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-xs font-bold text-gray-400 mb-1">🎯 차별화 기회</p>
          <p className="text-sm text-white leading-relaxed">{winningOpportunity}</p>
        </div>
      </div>

      {/* GEO Score comparison bar chart */}
      <div className="bg-white rounded-lg border border-gray-100 p-5">
        <p className="text-sm font-bold text-gray-700 mb-4">GEO 점수 비교</p>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={allServices.map(s => ({ name: s.name, score: s.geoScore, fill: s.isMe ? '#111111' : '#9CA3AF' }))} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-10} textAnchor="end" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v}점`, 'GEO Score']} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {allServices.map((s, i) => <Cell key={i} fill={s.isMe ? '#111111' : '#94A3B8'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-dimension radar comparison */}
      {competitors.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-100 p-5">
          <p className="text-sm font-bold text-gray-700 mb-4">차원별 비교 ({d.serviceName} vs 1위 경쟁사)</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={['structure', 'eeat', 'technical', 'freshness', 'readability'].map((id, i) => {
                const labels: Record<string, string> = { structure: '구조', eeat: 'E-E-A-T', technical: '기술', freshness: '최신성', readability: '가독성' }
                const myDim = d.competitiveGap[i]
                const compDim = competitors[0]?.dimensions?.find(dd => dd.id === id)
                return {
                  subject: labels[id],
                  mine: myDim ? Math.round(myDim.yourScore / myDim.topPerformer * 100) : 0,
                  competitor: compDim ? Math.round(compDim.score / compDim.maxScore * 100) : 0,
                }
              })}>
                <PolarGrid stroke="#E5E7EB" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#6B7280' }} />
                <Radar name={d.serviceName} dataKey="mine" stroke="#111111" fill="#111111" fillOpacity={0.15} strokeWidth={2} />
                <Radar name={competitors[0]?.name} dataKey="competitor" stroke="#EF4444" fill="#EF4444" fillOpacity={0.1} strokeWidth={2} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Competitor cards */}
      <div className="space-y-4">
        {competitors.map((comp, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-600">{comp.name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900">{comp.name}</p>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{comp.grade}등급</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ backgroundColor: `${threatColors[comp.strategicThreat]}18`, color: threatColors[comp.strategicThreat] }}>
                    위협도: {threatLabels[comp.strategicThreat]}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">GEO {comp.geoScore}점 · 인용율 {comp.citationRate}%</p>
              </div>
              <MiniArc score={comp.geoScore} size={52} />
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-green-600 mb-2">✅ AI 검색 강점</p>
                {comp.strengths.map((s, j) => <p key={j} className="text-xs text-gray-700 flex gap-1.5 mb-1.5"><span className="text-green-500 flex-shrink-0">•</span>{s}</p>)}
                <div className="mt-3 bg-green-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-green-700 mb-1">💡 AI 인용 우위 이유</p>
                  <p className="text-xs text-green-700 leading-relaxed">{comp.contentAdvantage}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-red-500 mb-2">❌ 취약점</p>
                {comp.weaknesses.map((w, j) => <p key={j} className="text-xs text-gray-700 flex gap-1.5 mb-1.5"><span className="text-red-400 flex-shrink-0">•</span>{w}</p>)}
                <div className="mt-3 bg-blue-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-blue-700 mb-1">📄 최다 인용 콘텐츠</p>
                  <p className="text-xs text-blue-700 leading-relaxed">{comp.topCitedContent}</p>
                </div>
              </div>
            </div>
            {/* Dimension comparison bars */}
            {comp.dimensions?.length > 0 && (
              <div className="px-5 pb-5 border-t border-gray-50 pt-4">
                <p className="text-xs font-bold text-gray-500 mb-3">차원별 점수</p>
                <div className="space-y-2">
                  {comp.dimensions.map((cd, j) => {
                    const myDim = d.competitiveGap.find(g => g.dimension === cd.nameKo)
                    const compPct = Math.round((cd.score / cd.maxScore) * 100)
                    const myPct = myDim ? Math.round(myDim.yourScore / myDim.topPerformer * 100) : 0
                    return (
                      <div key={j} className="grid grid-cols-[80px_1fr_1fr] gap-2 items-center text-xs">
                        <span className="text-gray-500">{cd.nameKo}</span>
                        <div>
                          <div className="h-1.5 bg-gray-100 rounded-full"><div className="h-1.5 bg-gray-700 rounded-full" style={{ width: `${myPct}%` }} /></div>
                        </div>
                        <div>
                          <div className="h-1.5 bg-gray-100 rounded-full"><div className="h-1.5 bg-red-300 rounded-full" style={{ width: `${compPct}%` }} /></div>
                        </div>
                      </div>
                    )
                  })}
                  <div className="flex gap-4 text-xs text-gray-400 mt-1">
                    <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded bg-gray-700 inline-block" />{d.serviceName}</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded bg-red-300 inline-block" />{comp.name}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Topical Authority Map */}
      <div className="bg-white rounded-lg border border-gray-100 p-5">
        <p className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><BookOpen size={15} />주제 권위 맵</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold text-gray-800 mb-2">✅ 현재 강점 주제</p>
            <div className="flex flex-wrap gap-1.5">
              {(d.topicalAuthorityMap?.coreTopics ?? []).map((t, i) => (
                <span key={i} className="text-xs bg-gray-50 text-gray-800 border border-gray-200 px-2.5 py-1 rounded-full">{t}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-red-600 mb-2">❌ 미개척 주제 (기회)</p>
            <div className="flex flex-wrap gap-1.5">
              {(d.topicalAuthorityMap?.coverageGaps ?? []).map((t, i) => (
                <span key={i} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full">{t}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-amber-600 mb-2">⚠️ 경쟁사 독점 주제</p>
            <div className="flex flex-wrap gap-1.5">
              {(d.topicalAuthorityMap?.competitorExclusiveTopics ?? []).map((t, i) => (
                <span key={i} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">{t}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-green-600 mb-2">⚡ 빠른 콘텐츠 승리</p>
            <div className="flex flex-wrap gap-1.5">
              {(d.topicalAuthorityMap?.quickContentWins ?? []).map((t, i) => (
                <span key={i} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── TAB 3: Platform Strategies ───────────────────────────────────────────────

function PlatformsTab({ d }: { d: DetailedAnalysis }) {
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <div className="space-y-4">
      {/* Score bar chart */}
      <div className="bg-white rounded-lg border border-gray-100 p-5">
        <p className="text-sm font-bold text-gray-700 mb-4">AI 플랫폼별 현재 가시성</p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.platformScores} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="platformKo" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v}점`, '가시성']} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {d.platformScores.map((p, i) => <Cell key={i} fill={p.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Strategy cards */}
      <div className="space-y-3">
        {(d.platformStrategies ?? []).map((ps, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-100 overflow-hidden">
            <button
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
              onClick={() => setSelected(selected === ps.platform ? null : ps.platform)}
            >
              <span className="text-2xl">{ps.emoji}</span>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-gray-800">{ps.platformKo}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ backgroundColor: `${ps.color}18`, color: ps.color }}>{ps.visibility}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[120px]">
                    <div className="h-1.5 rounded-full" style={{ width: `${ps.currentScore}%`, backgroundColor: ps.color }} />
                  </div>
                  <span className="text-xs font-bold" style={{ color: ps.color }}>{ps.currentScore}점</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 max-w-[140px] text-right hidden sm:block truncate">{ps.mainBarrier}</p>
              {selected === ps.platform ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
            </button>

            {selected === ps.platform && (
              <div className="border-t border-gray-100 px-5 py-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-blue-700 mb-2">🔍 이 플랫폼의 인용 선호도</p>
                    <p className="text-sm text-blue-800 leading-relaxed">{ps.algorithmPreference}</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-red-600 mb-2">⚠️ 현재 낮은 인용율 이유</p>
                    <p className="text-sm text-red-700 leading-relaxed">{ps.mainBarrier}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">⚡ 즉시 적용 가능한 액션</p>
                  <div className="space-y-2">
                    {ps.quickWins.map((w, j) => (
                      <div key={j} className="flex items-start gap-2.5 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5">
                        <span className="text-green-600 font-bold flex-shrink-0 text-sm">{j + 1}.</span>
                        <p className="text-sm text-green-800">{w}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-2">📝 최적 콘텐츠 형식</p>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{ps.contentFormat}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-2">🎯 이 서비스가 답이 될 프롬프트</p>
                    <div className="space-y-1.5">
                      {ps.targetPrompts.map((p, j) => (
                        <p key={j} className="text-xs text-gray-700 bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-200 italic">"{p}"</p>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-400 text-right">⏱️ 효과 발현 예상: {ps.timeToImpact}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── TAB 4: Content Blueprint ─────────────────────────────────────────────────

function ContentTab({ d }: { d: DetailedAnalysis }) {
  const typeColors: Record<string, string> = {
    FAQ: 'bg-purple-50 text-purple-700 border-purple-200',
    'How-To': 'bg-blue-50 text-blue-700 border-blue-200',
    Comparison: 'bg-green-50 text-green-700 border-green-200',
    Definition: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    Guide: 'bg-gray-50 text-gray-800 border-gray-200',
    'Case-Study': 'bg-orange-50 text-orange-700 border-orange-200',
  }
  const [expanded, setExpanded] = useState<number | null>(0)

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-2"><Target size={15} />콘텐츠 플랜이란?</p>
        <p className="text-xs text-gray-800 leading-relaxed">
          AI 검색 엔진이 가장 많이 인용하는 콘텐츠 유형과, {d.serviceName}이 직접 답이 되어야 하는 쿼리를 분석해 작성해야 할 콘텐츠를 우선순위별로 제시합니다.
        </p>
      </div>

      <div className="space-y-3">
        {(d.contentBlueprint ?? []).map((bp, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-100 overflow-hidden">
            <button
              className="w-full flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
              onClick={() => setExpanded(expanded === i ? null : i)}
            >
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-800 flex-shrink-0 mt-0.5">{i + 1}</div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-semibold text-sm text-gray-800">{bp.title}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <PriorityBadge p={bp.priority} />
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', typeColors[bp.type] ?? 'bg-gray-50 text-gray-600 border-gray-200')}>
                    {bp.typeKo}
                  </span>
                  <span className="text-xs text-gray-400">{bp.wordCountTarget}</span>
                  <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{bp.estimatedImpact}</span>
                </div>
              </div>
              {expanded === i ? <ChevronUp size={15} className="text-gray-400 flex-shrink-0 mt-1" /> : <ChevronDown size={15} className="text-gray-400 flex-shrink-0 mt-1" />}
            </button>
            {expanded === i && (
              <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-4">
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-blue-700 mb-1">📌 이 콘텐츠가 필요한 이유</p>
                  <p className="text-sm text-blue-800 leading-relaxed">{bp.purpose}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-2">🤖 AI 인용 타겟 쿼리</p>
                    <div className="space-y-1.5">
                      {bp.aiTargetPrompts.map((q, j) => (
                        <p key={j} className="text-xs italic text-gray-700 bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-200">"{q}"</p>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-2">📝 포함해야 할 핵심 포인트</p>
                    {bp.keyPoints.map((p, j) => (
                      <div key={j} className="flex items-start gap-2 text-xs text-gray-700 mb-1.5">
                        <span className="text-gray-700 font-bold flex-shrink-0">{j + 1}.</span>{p}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── TAB 5: Technical Implementation ─────────────────────────────────────────

function TechnicalTab({ d }: { d: DetailedAnalysis }) {
  const [copies, setCopies] = useState<Record<number, boolean>>({})
  const [expanded, setExpanded] = useState<number | null>(0)

  const catColors: Record<string, string> = {
    'Schema Markup': 'bg-purple-50 text-purple-700 border-purple-200',
    'Meta Tags': 'bg-blue-50 text-blue-700 border-blue-200',
    'Content Structure': 'bg-green-50 text-green-700 border-green-200',
    'Technical': 'bg-orange-50 text-orange-700 border-orange-200',
  }
  const diffColors = { easy: '#059669', medium: '#D97706', hard: '#DC2626' }

  async function copy(i: number, code: string) {
    await navigator.clipboard.writeText(code)
    setCopies(p => ({ ...p, [i]: true }))
    setTimeout(() => setCopies(p => ({ ...p, [i]: false })), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm font-bold text-gray-700 mb-1 flex items-center gap-2"><Code2 size={15} />기술 구현 가이드</p>
        <p className="text-xs text-gray-500">각 항목을 클릭하면 실제 구현 코드와 설명을 확인할 수 있습니다. 코드는 복사해서 바로 사용할 수 있습니다.</p>
      </div>

      <div className="space-y-3">
        {(d.techImplementations ?? []).map((impl, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-100 overflow-hidden">
            <button
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
              onClick={() => setExpanded(expanded === i ? null : i)}
            >
              <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border flex-shrink-0', catColors[impl.category] ?? 'bg-gray-50 text-gray-600 border-gray-200')}>
                {impl.categoryKo}
              </span>
              <p className="flex-1 font-semibold text-sm text-gray-800 text-left">{impl.title}</p>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-semibold" style={{ color: diffColors[impl.difficulty] }}>{impl.difficultyKo}</span>
                <span className="text-xs text-gray-400">{impl.timeEstimate}</span>
                {expanded === i ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
              </div>
            </button>

            {expanded === i && (
              <div className="border-t border-gray-100 px-5 py-5 space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-bold text-gray-800 mb-1">💡 GEO 효과</p>
                    <p className="text-sm text-gray-800 leading-relaxed">{impl.impact}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 flex flex-col items-center justify-center gap-1 w-24 flex-shrink-0">
                    <span className="text-xs text-gray-500">난이도</span>
                    <span className="font-bold text-sm" style={{ color: diffColors[impl.difficulty] }}>{impl.difficultyKo}</span>
                    <span className="text-xs text-gray-400">{impl.timeEstimate}</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-600 mb-1">🔍 왜 중요한가</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{impl.explanation}</p>
                </div>

                {impl.code && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-gray-600">💻 구현 코드</p>
                      <button onClick={() => copy(i, impl.code)}
                        className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-lg transition-colors">
                        {copies[i] ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                        {copies[i] ? '복사됨' : '복사'}
                      </button>
                    </div>
                    <pre className="bg-gray-900 text-green-300 rounded-xl p-4 text-xs overflow-x-auto leading-relaxed whitespace-pre-wrap">{impl.code}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── TAB 6: Execution (Action Matrix + Roadmap + Checklist) ──────────────────

function ExecutionTab({ d }: { d: DetailedAnalysis }) {
  const [execTab, setExecTab] = useState<'matrix' | 'roadmap' | 'checklist'>('matrix')
  const [selected, setSelected] = useState<ActionItem | null>(null)
  const qColors = { quick_win: '#059669', strategic: '#7C3AED', fill_in: '#2563EB', thankless: '#9CA3AF' }
  const qLabels = { quick_win: '빠른 성과', strategic: '전략 투자', fill_in: '틈새 채우기', thankless: '재고 필요' }

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1">
        {([['matrix', '액션 매트릭스'], ['roadmap', '30일 로드맵'], ['checklist', 'GEO 체크리스트']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setExecTab(id)}
            className={cn('flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all', execTab === id ? 'bg-white text-gray-800' : 'text-gray-500 hover:text-gray-700')}>
            {label}
          </button>
        ))}
      </div>

      {execTab === 'matrix' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-100 p-5">
            <p className="text-sm font-bold text-gray-700 mb-1">Impact × Effort 매트릭스</p>
            <p className="text-xs text-gray-400 mb-4">점을 클릭하면 상세 내용을 확인할 수 있습니다</p>
            <div className="relative h-72 bg-gray-50 rounded-lg border border-gray-100 p-4">
              <div className="absolute top-3 left-3 text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">⚡ 빠른 성과</div>
              <div className="absolute top-3 right-3 text-xs font-semibold text-gray-700 bg-gray-50 px-2 py-0.5 rounded-full">🎯 전략 투자</div>
              <div className="absolute bottom-3 left-3 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">📌 틈새 채우기</div>
              <div className="absolute bottom-3 right-3 text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">💤 재고 필요</div>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 24, right: 24, bottom: 20, left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" dataKey="effort" domain={[0, 11]} label={{ value: '→ 노력', position: 'insideBottom', offset: -4, fontSize: 11, fill: '#9CA3AF' }} tick={{ fontSize: 10 }} />
                  <YAxis type="number" dataKey="impact" domain={[0, 11]} label={{ value: '임팩트 ↑', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#9CA3AF' }} tick={{ fontSize: 10 }} />
                  <ZAxis range={[60, 60]} />
                  <ReferenceLine x={5.5} stroke="#D1D5DB" strokeDasharray="4 4" />
                  <ReferenceLine y={5.5} stroke="#D1D5DB" strokeDasharray="4 4" />
                  <Tooltip cursor={false} content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const item = payload[0].payload as ActionItem
                    return (
                      <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 max-w-[200px]">
                        <p className="text-xs font-bold text-gray-800">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.timeframe} · {item.category}</p>
                      </div>
                    )
                  }} />
                  <Scatter data={[...(d.actionMatrix ?? [])]} onClick={(item) => setSelected(item as unknown as ActionItem)}
                    shape={(props: { cx?: number; cy?: number; payload?: ActionItem }) => {
                      const { cx = 0, cy = 0, payload } = props
                      return <circle cx={cx} cy={cy} r={8} fill={qColors[payload?.quadrant ?? 'fill_in']} fillOpacity={0.85} stroke="white" strokeWidth={2} style={{ cursor: 'pointer' }} />
                    }} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            {selected && (
              <div className="mt-3 bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: qColors[selected.quadrant] }} />
                  <div className="flex-1">
                    <p className="font-bold text-sm text-gray-800">{selected.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{qLabels[selected.quadrant]} · {selected.timeframe} · {selected.category}</p>
                    <p className="text-sm text-gray-600 mt-2 leading-relaxed">{selected.description}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-gray-300 hover:text-gray-500 text-lg leading-none">×</button>
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[...(d.actionMatrix ?? [])].sort((a, b) => (b.impact - b.effort * 0.3) - (a.impact - a.effort * 0.3)).slice(0, 8).map((item, i) => (
              <div key={item.id} className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-gray-100 cursor-pointer hover:border-gray-200" onClick={() => setSelected(item)}>
                <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: qColors[item.quadrant] }} />
                <span className="text-sm text-gray-800 flex-1 truncate">{item.title}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">{item.timeframe}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {execTab === 'roadmap' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-5 text-white">
            <p className="font-bold text-base mb-1">30일 GEO 개선 로드맵</p>
            <p className="text-gray-300 text-sm">현재 {d.baseScore}점 → 목표 {d.potentialScore}점</p>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1 bg-white/20 rounded-full h-2">
                <div className="h-2 rounded-full bg-white" style={{ width: `${d.baseScore}%` }} />
              </div>
              <span className="text-xs text-gray-300">+{d.potentialScore - d.baseScore}점 향상</span>
            </div>
          </div>
          {(d.roadmap ?? []).map(week => (
            <div key={week.week} className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-800">{week.week}주</div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">{week.label} — {week.focus}</p>
                </div>
                <span className="text-sm font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">{week.expectedGain}</span>
              </div>
              <div className="px-5 py-4 space-y-2">
                {week.tasks.map((task, i) => {
                  const typeColors = { content: '#2563EB', technical: '#374151', authority: '#059669' }
                  const typeLabels = { content: '콘텐츠', technical: '기술', authority: '권위' }
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: typeColors[task.type] }} />
                      <span className="flex-1 text-sm text-gray-700">{task.title}</span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${typeColors[task.type]}18`, color: typeColors[task.type] }}>
                        {typeLabels[task.type]}
                      </span>
                      {task.priority === 'high' && <Flag size={12} className="text-red-400 flex-shrink-0" />}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {execTab === 'checklist' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: '통과', count: d.checklistSummary.pass, color: '#059669', bg: 'bg-green-50 border-green-100' },
              { label: '경고', count: d.checklistSummary.warning, color: '#D97706', bg: 'bg-amber-50 border-amber-100' },
              { label: '미달', count: d.checklistSummary.fail, color: '#DC2626', bg: 'bg-red-50 border-red-100' },
            ].map((s, i) => (
              <div key={i} className={cn('rounded-lg border p-4 text-center', s.bg)}>
                <p className="text-2xl font-extrabold" style={{ color: s.color }}>{s.count}</p>
                <p className="text-xs font-semibold text-gray-600 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          {Array.from(new Set((d.checklist ?? []).map(c => c.category))).map(cat => (
            <div key={cat} className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-700">{cat}</p>
              </div>
              <div className="p-3 space-y-2">
                {(d.checklist ?? []).filter(c => c.category === cat).map(item => {
                  const cfg = {
                    pass: { icon: <CheckCircle2 size={14} />, color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
                    fail: { icon: <XCircle size={14} />, color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
                    warning: { icon: <AlertCircle size={14} />, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
                    unknown: { icon: <AlertCircle size={14} />, color: 'text-gray-400', bg: 'bg-gray-50 border-gray-100' },
                  }[item.status]
                  const impactBadge = { critical: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-gray-100 text-gray-500' }[item.impact]
                  return (
                    <div key={item.id} className={cn('flex items-center gap-3 p-3 rounded-xl border', cfg.bg)}>
                      <span className={cfg.color}>{cfg.icon}</span>
                      <span className="flex-1 text-sm text-gray-800">{item.item}</span>
                      {item.detail && <span className="text-xs text-gray-400 hidden sm:block max-w-[180px] truncate">{item.detail}</span>}
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0', impactBadge)}>
                        {{ critical: '긴급', high: '높음', medium: '보통', low: '낮음' }[item.impact]}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function DetailedDashboard({ analysis, responseShare }: { analysis: GEOAnalysisResult; responseShare?: ResponseShare | null }) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [detail, setDetail] = useState<DetailedAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/analyze/detail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(analysis),
    })
      .then(r => r.json())
      .then(setDetail)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [analysis])

  if (loading) return (
    <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-lg bg-gray-100 flex items-center justify-center text-3xl animate-pulse">📊</div>
        <p className="font-bold text-gray-900">심층 분석 생성 중...</p>
        <p className="text-sm text-gray-500">경쟁사 비교 · 플랫폼별 전략 · 콘텐츠 플랜 · 기술 구현 가이드</p>
        <Loader2 size={20} className="animate-spin text-gray-700 mx-auto" />
      </div>
    </div>
  )

  if (error || !detail) return (
    <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
      <div className="text-center space-y-3">
        <p className="text-red-600 font-bold">분석 실패</p>
        <p className="text-sm text-gray-500">{error}</p>
        <Link href="/" className="text-gray-900 underline text-sm">돌아가기</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">대시보드</span>
          </Link>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-gray-700" />
            <span className="font-bold text-gray-900 text-sm">{analysis.serviceName}</span>
            <span className="text-xs bg-gray-50 text-gray-800 px-2 py-0.5 rounded-full hidden sm:inline">심층 GEO 분석</span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="font-bold" style={{ color: getScoreColor(detail.baseScore) }}>{detail.baseScore}점</span>
            <span className="text-gray-300">→</span>
            <span className="font-bold text-green-600">{detail.potentialScore}점</span>
            <span className="text-xs text-gray-400">목표</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-5 space-y-5 pb-16">
        {/* Tab navigation */}
        <div className="flex gap-1 bg-white rounded-lg p-1.5 border border-gray-100 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn('flex items-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0', activeTab === tab.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50')}>
                <Icon size={13} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'overview'    && <OverviewTab d={detail} base={analysis} responseShare={responseShare} />}
        {activeTab === 'competitors' && <CompetitorsTab d={detail} />}
        {activeTab === 'platforms'   && <PlatformsTab d={detail} />}
        {activeTab === 'content'     && <ContentTab d={detail} />}
        {activeTab === 'technical'   && <TechnicalTab d={detail} />}
        {activeTab === 'execution'   && <ExecutionTab d={detail} />}
      </main>
    </div>
  )
}
