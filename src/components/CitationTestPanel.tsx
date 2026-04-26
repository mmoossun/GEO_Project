'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, Play, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CitationTestResult, PlatformTestResult } from '@/app/api/analyze/citation-test/route'

// ─── Platform Result Card ─────────────────────────────────────────────────────

function PlatformCard({ p }: { p: PlatformTestResult }) {
  const [showDetail, setShowDetail] = useState(false)

  const statusCfg = {
    mentioned: { icon: <CheckCircle2 size={16} />, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: '✅ 언급됨' },
    not_mentioned: { icon: <XCircle size={16} />, color: 'text-red-500', bg: 'bg-red-50 border-red-200', label: '❌ 미언급' },
    error: { icon: <AlertCircle size={16} />, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: '⚠️ 오류' },
    skipped: { icon: <AlertCircle size={16} />, color: 'text-gray-400', bg: 'bg-gray-50 border-gray-200', label: '⚪ 키 미설정' },
  }[p.status]

  return (
    <div className={cn('rounded-xl border overflow-hidden', statusCfg.bg)}>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-xl flex-shrink-0">{p.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-800">{p.platformKo}</p>
          <p className="text-xs text-gray-500">{p.model}</p>
        </div>

        {p.status !== 'skipped' && p.totalQueries > 0 && (
          <div className="text-right flex-shrink-0 mr-2">
            <p className="text-xs text-gray-500">{p.mentionCount}/{p.totalQueries} 질문에서 언급</p>
            <div className="flex gap-1 mt-1 justify-end">
              {Array.from({ length: p.totalQueries }).map((_, i) => (
                <div key={i} className={cn('w-3 h-3 rounded-full border', i < p.mentionCount ? 'bg-green-500 border-green-600' : 'bg-white border-gray-300')} />
              ))}
            </div>
          </div>
        )}

        <div className={cn('flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0', statusCfg.color, 'bg-white/70')}>
          {statusCfg.icon}
          {statusCfg.label}
        </div>

        {p.excerpts.length > 0 && (
          <button onClick={() => setShowDetail(s => !s)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            {showDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {/* Excerpts */}
      {showDetail && p.excerpts.length > 0 && (
        <div className="px-4 pb-4 border-t border-white/50 pt-3 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI 응답 발췌</p>
          {p.excerpts.map((ex, i) => (
            <div key={i} className="bg-white rounded-lg p-3 text-xs text-gray-700 leading-relaxed border border-white">
              <span className="text-green-600 font-bold">[언급됨] </span>{ex}
            </div>
          ))}
        </div>
      )}

      {p.status === 'error' && p.error && (
        <div className="px-4 pb-3 text-xs text-amber-700 border-t border-white/50 pt-2">
          오류: {p.error.slice(0, 100)}
        </div>
      )}

      {p.status === 'skipped' && (
        <div className="px-4 pb-3 text-xs text-gray-500 border-t border-white/50 pt-2">
          .env.local에 OPENROUTER_API_KEY를 설정하면 실측 가능합니다.
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface CitationTestPanelProps {
  serviceName: string
  category: string
}

export function CitationTestPanel({ serviceName, category }: CitationTestPanelProps) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<CitationTestResult | null>(null)
  const [events, setEvents] = useState<string[]>([])
  const [error, setError] = useState('')
  const [hasOpenRouter, setHasOpenRouter] = useState<boolean | null>(null)

  async function runTest() {
    setRunning(true)
    setResult(null)
    setEvents([])
    setError('')

    try {
      const res = await fetch('/api/analyze/citation-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceName, category }),
      })

      if (!res.ok || !res.body) throw new Error('서버 오류')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line)
            if (event.type === 'start') {
              setHasOpenRouter(event.hasOpenRouter)
              setEvents(prev => [...prev, event.message])
            } else if (event.type === 'testing') {
              setEvents(prev => [...prev, `${event.emoji ?? '🔄'} ${event.platformKo} 테스트 중...`])
            } else if (event.type === 'result') {
              setEvents(prev => {
                const last = [...prev]
                last[last.length - 1] = `${event.result.emoji} ${event.result.platformKo}: ${event.result.statusKo}`
                return last
              })
            } else if (event.type === 'complete') {
              setResult(event.result)
            } else if (event.type === 'error') {
              throw new Error(event.message)
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue
            throw parseErr
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '테스트 오류')
    } finally {
      setRunning(false)
    }
  }

  const mentionedPlatforms = result?.platforms.filter(p => p.status === 'mentioned') ?? []
  const testedPlatforms = result?.platforms.filter(p => p.status !== 'skipped') ?? []

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            🔬 AI 실측 인용 테스트
            <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-semibold">
              실제 AI에 질문
            </span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            ChatGPT, Claude, Gemini, Perplexity에 실제로 질문을 던져 "{serviceName}"이 언급되는지 측정합니다
          </p>
        </div>

        {!running && !result && (
          <button
            onClick={runTest}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
          >
            <Play size={14} />
            실측 시작
          </button>
        )}
        {result && !running && (
          <button onClick={runTest} className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">
            <Play size={12} />
            재테스트
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Not started */}
        {!running && !result && !error && (
          <div className="text-center py-6 space-y-3">
            <div className="text-4xl">🤖</div>
            <p className="text-sm text-gray-600 leading-relaxed max-w-sm mx-auto">
              AI 검색엔진들이 실제로 <strong>"{serviceName}"</strong>을 알고 있는지,<br />
              관련 질문에서 언급하는지 직접 테스트합니다.
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
              {['🤖 ChatGPT', '🧠 Claude', '✨ Gemini', '🔍 Perplexity'].map(p => (
                <span key={p} className="bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">{p}</span>
              ))}
            </div>
            {hasOpenRouter === false && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700 text-left max-w-sm mx-auto">
                <Info size={13} className="flex-shrink-0 mt-0.5" />
                <span>OpenRouter 키가 없어 ChatGPT만 실측됩니다. .env.local에 OPENROUTER_API_KEY를 추가하면 모든 플랫폼을 테스트할 수 있습니다.</span>
              </div>
            )}
          </div>
        )}

        {/* Running */}
        {running && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-indigo-600 font-semibold">
              <Loader2 size={16} className="animate-spin" />
              AI 플랫폼에 실제 질문 전송 중...
            </div>
            <div className="space-y-1.5">
              {events.map((msg, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                  {i === events.length - 1 && running
                    ? <Loader2 size={12} className="animate-spin text-indigo-500 flex-shrink-0" />
                    : <span className="w-3 h-3 rounded-full bg-green-400 flex-shrink-0" />
                  }
                  {msg}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-700">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Summary */}
            <div className={cn(
              'rounded-xl p-4 border',
              mentionedPlatforms.length > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            )}>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl font-extrabold" style={{ color: mentionedPlatforms.length > 0 ? '#059669' : '#DC2626' }}>
                  {mentionedPlatforms.length}/{testedPlatforms.length}
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-800">플랫폼에서 언급됨</p>
                  <p className="text-xs text-gray-500">테스트한 AI 플랫폼 기준</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
            </div>

            {/* Platform results */}
            <div className="space-y-2">
              {result.platforms.map(p => (
                <PlatformCard key={p.platform} p={p} />
              ))}
            </div>

            {/* What this means */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1.5">
                <Info size={12} />
                이 결과가 의미하는 것
              </p>
              <div className="space-y-1 text-xs text-blue-700 leading-relaxed">
                <p>• AI 플랫폼들이 학습 데이터나 실시간 검색에서 "{serviceName}"을 얼마나 알고 있는지 측정했습니다</p>
                <p>• 언급이 없다고 서비스가 나쁜 것은 아닙니다 — GEO 최적화로 인지도를 높일 수 있습니다</p>
                <p>• 테스트 시점의 AI 모델 버전에 따라 결과가 달라질 수 있습니다</p>
                {!result.hasOpenRouter && <p>• <strong>OpenRouter 키 설정 시</strong> Claude, Gemini, Perplexity도 실측됩니다</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
