'use client'

import { CheckCircle2, XCircle, Loader2, TrendingUp, Zap, Award } from 'lucide-react'
import { SCORE_LABELS, type ScoreBreakdown, type QualityEvent } from '@/lib/quality-agent'
import { cn } from '@/lib/utils'

// ─── Score Bar ───────────────────────────────────────────────────────────────

function MiniScoreBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.round((value / max) * 100)
  const color = pct >= 80 ? '#059669' : pct >= 60 ? '#2563EB' : pct >= 40 ? '#D97706' : '#DC2626'
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold w-10 text-right flex-shrink-0" style={{ color }}>{value}/{max}</span>
    </div>
  )
}

// ─── Iteration Card ──────────────────────────────────────────────────────────

interface IterationEntry {
  iteration: number
  status: 'generating' | 'evaluating' | 'done'
  score?: number
  pass?: boolean
  breakdown?: ScoreBreakdown
  reasons?: string[]
  message?: string
}

function IterationCard({ entry }: { entry: IterationEntry }) {
  const isActive = entry.status !== 'done'
  const scoreColor = !entry.score ? '#6B7280'
    : entry.score >= 90 ? '#059669'
    : entry.score >= 75 ? '#2563EB'
    : entry.score >= 60 ? '#D97706' : '#DC2626'

  return (
    <div className={cn(
      'rounded-xl border p-4 transition-all',
      entry.pass ? 'border-green-200 bg-green-50' : isActive ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 bg-white'
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
          entry.pass ? 'bg-green-500 text-white' : isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
        )}>
          {entry.pass ? '✓' : entry.iteration}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">
              {entry.iteration === 1 ? '1차 생성' : `${entry.iteration}차 개선`}
            </span>
            {isActive && (
              <span className="flex items-center gap-1 text-xs text-indigo-600">
                <Loader2 size={12} className="animate-spin" />
                {entry.message ?? '처리 중...'}
              </span>
            )}
          </div>
        </div>

        {entry.score != null && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xl font-extrabold" style={{ color: scoreColor }}>{entry.score}</span>
            <span className="text-xs text-gray-400">/100</span>
            {entry.pass
              ? <CheckCircle2 size={18} className="text-green-500" />
              : <XCircle size={18} className="text-red-400" />
            }
          </div>
        )}
      </div>

      {/* Score breakdown */}
      {entry.breakdown && (
        <div className="space-y-1.5 mb-3">
          {(Object.entries(entry.breakdown) as [keyof ScoreBreakdown, number][]).map(([key, val]) => (
            <MiniScoreBar
              key={key}
              value={val}
              max={SCORE_LABELS[key].max}
              label={SCORE_LABELS[key].label}
            />
          ))}
        </div>
      )}

      {/* Fail reasons */}
      {entry.reasons && entry.reasons.length > 0 && !entry.pass && (
        <div className="space-y-1">
          {entry.reasons.map((r, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-red-600">
              <span className="flex-shrink-0 mt-0.5">❌</span>
              <span>{r}</span>
            </div>
          ))}
        </div>
      )}

      {entry.pass && (
        <div className="flex items-center gap-1.5 text-xs text-green-700 font-semibold">
          <Award size={13} />
          90점 이상 달성! 즉시 업로드 가능 퀄리티
        </div>
      )}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface QualityProgressProps {
  events: QualityEvent[]
  finalScore?: number
  totalIterations?: number
  improvementSummary?: string[]
}

export function QualityProgress({ events, finalScore, totalIterations, improvementSummary }: QualityProgressProps) {
  // Build iteration entries from events
  const entries: IterationEntry[] = []
  const iterMap = new Map<number, IterationEntry>()

  for (const event of events) {
    if (!event.iteration) continue

    if (!iterMap.has(event.iteration)) {
      iterMap.set(event.iteration, { iteration: event.iteration, status: 'generating', message: event.message })
    }

    const entry = iterMap.get(event.iteration)!

    if (event.type === 'generating') {
      entry.status = 'generating'
      entry.message = event.message
    } else if (event.type === 'evaluating') {
      entry.status = 'evaluating'
      entry.message = event.message
    } else if (event.type === 'score') {
      entry.status = 'done'
      entry.score = event.total
      entry.pass = event.pass
      entry.breakdown = event.breakdown
      entry.reasons = event.reasons
    }
  }

  // Collect active entry (last non-done)
  for (const entry of iterMap.values()) {
    entries.push(entry)
  }
  entries.sort((a, b) => a.iteration - b.iteration)

  const isDone = finalScore != null
  const passedEntry = entries.find(e => e.pass)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl text-white">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
          {isDone ? <Award size={20} /> : <Zap size={20} className="animate-pulse" />}
        </div>
        <div>
          <p className="font-bold text-sm">AI 품질 에이전트</p>
          <p className="text-indigo-200 text-xs">
            {isDone
              ? `${totalIterations}회 반복 완료 — ${finalScore}점 달성`
              : events.some(e => e.type === 'briefing') && !events.some(e => e.type === 'generating')
                ? '콘텐츠 브리프 생성 중...'
                : '90점 달성까지 자동 개선 중 (최대 5회)'}
          </p>
        </div>
        {isDone && finalScore != null && (
          <div className="ml-auto text-right flex-shrink-0">
            <span className="text-3xl font-extrabold">{finalScore}</span>
            <span className="text-indigo-200 text-sm">/100</span>
          </div>
        )}
      </div>

      {/* Score progress bar */}
      {entries.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">점수 개선 추이</p>
          <div className="flex items-end gap-3">
            {entries.map(entry => (
              <div key={entry.iteration} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold" style={{
                  color: entry.score
                    ? entry.score >= 90 ? '#059669' : entry.score >= 75 ? '#2563EB' : '#D97706'
                    : '#9CA3AF'
                }}>
                  {entry.score ?? '...'}
                </span>
                <div
                  className="w-full rounded-t-lg transition-all duration-700"
                  style={{
                    height: entry.score ? `${Math.max(8, Math.round((entry.score / 100) * 80))}px` : '8px',
                    backgroundColor: entry.score
                      ? entry.score >= 90 ? '#059669' : entry.score >= 75 ? '#2563EB' : '#D97706'
                      : '#E5E7EB'
                  }}
                />
                <span className="text-xs text-gray-400">{entry.iteration}차</span>
              </div>
            ))}
            {/* Target line indicator */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-bold text-green-600">목표</span>
              <div className="w-full rounded-t-lg bg-green-100 border-2 border-dashed border-green-400" style={{ height: `${Math.round((90 / 100) * 80)}px` }} />
              <span className="text-xs text-green-600">90</span>
            </div>
          </div>
        </div>
      )}

      {/* Iteration cards */}
      <div className="space-y-3">
        {entries.map(entry => (
          <IterationCard key={entry.iteration} entry={entry} />
        ))}
      </div>

      {/* Improvement summary */}
      {improvementSummary && improvementSummary.length > 0 && isDone && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
            <TrendingUp size={13} />
            개선 이력
          </p>
          {improvementSummary.map((s, i) => (
            <p key={i} className="text-xs text-blue-700 flex items-start gap-1.5">
              <span className="text-blue-400 flex-shrink-0">→</span>{s}
            </p>
          ))}
        </div>
      )}

      {/* Loading pulse when still running */}
      {!isDone && (
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-indigo-300 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}
    </div>
  )
}
