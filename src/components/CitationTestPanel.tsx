'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, Play, Info, Lightbulb, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CitationTestResult, PlatformTestResult, GeneratedQuestion, ServiceIntelligence } from '@/app/api/analyze/citation-test/route'

// ─── Service Intelligence Card ────────────────────────────────────────────────

function ServiceIntelCard({ intel }: { intel: ServiceIntelligence }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-indigo-100/50 transition-colors">
        <Lightbulb size={14} className="text-indigo-500 flex-shrink-0" />
        <span className="text-sm font-semibold text-indigo-800 flex-1">
          서비스 분석 결과 ({intel.sourceType === 'url_crawl' ? '🔗 URL 크롤링' : '🤖 AI 추론'})
        </span>
        {open ? <ChevronUp size={13} className="text-indigo-400" /> : <ChevronDown size={13} className="text-indigo-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-indigo-100">
          <p className="text-xs text-indigo-700 leading-relaxed mt-3">{intel.summary}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-bold text-indigo-600 mb-1.5">🔧 핵심 기능</p>
              {intel.coreFeatures.map((f, i) => (
                <p key={i} className="text-xs text-indigo-700 flex items-center gap-1.5 mb-1">
                  <span className="w-1 h-1 rounded-full bg-indigo-400 flex-shrink-0" />{f}
                </p>
              ))}
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-600 mb-1.5">💡 핵심 가치</p>
              {intel.keyValueProps.map((v, i) => (
                <p key={i} className="text-xs text-indigo-700 flex items-center gap-1.5 mb-1">
                  <span className="w-1 h-1 rounded-full bg-indigo-400 flex-shrink-0" />{v}
                </p>
              ))}
            </div>
          </div>
          {intel.competitors.length > 0 && (
            <p className="text-xs text-indigo-600">
              <span className="font-semibold">경쟁사:</span> {intel.competitors.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Generated Questions Panel ────────────────────────────────────────────────

function QuestionsPanel({ questions }: { questions: GeneratedQuestion[] }) {
  const [open, setOpen] = useState(true)
  const typeColors: Record<string, string> = {
    direct: 'bg-purple-50 text-purple-700 border-purple-200',
    feature: 'bg-blue-50 text-blue-700 border-blue-200',
    problem_solving: 'bg-green-50 text-green-700 border-green-200',
    category: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    comparison: 'bg-orange-50 text-orange-700 border-orange-200',
  }
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-gray-100 transition-colors">
        <MessageSquare size={14} className="text-gray-500 flex-shrink-0" />
        <span className="text-sm font-semibold text-gray-700 flex-1">AI에 전송한 맞춤 질문 {questions.length}개</span>
        {open ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-200 pt-3">
          {questions.map((q, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-100 p-3">
              <div className="flex items-start gap-2 mb-1.5">
                <span className="text-xs font-bold text-gray-400 w-5 flex-shrink-0 mt-0.5">Q{i + 1}</span>
                <p className="text-sm text-gray-800 flex-1 leading-relaxed">"{q.question}"</p>
                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 whitespace-nowrap', typeColors[q.type] ?? 'bg-gray-50 text-gray-600 border-gray-200')}>
                  {q.typeKo}
                </span>
              </div>
              <p className="text-xs text-gray-400 ml-7 italic">{q.rationale}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Platform Result Card ─────────────────────────────────────────────────────

function PlatformCard({ p }: { p: PlatformTestResult }) {
  const [showDetail, setShowDetail] = useState(false)
  const cfg = {
    mentioned:     { border: 'border-green-200 bg-green-50', badge: 'text-green-700 bg-green-100', icon: <CheckCircle2 size={15} className="text-green-600" /> },
    not_mentioned: { border: 'border-red-200 bg-red-50',     badge: 'text-red-600 bg-red-100',     icon: <XCircle size={15} className="text-red-500" /> },
    error:         { border: 'border-amber-200 bg-amber-50', badge: 'text-amber-700 bg-amber-100', icon: <AlertCircle size={15} className="text-amber-600" /> },
    skipped:       { border: 'border-gray-200 bg-gray-50',   badge: 'text-gray-500 bg-gray-100',   icon: <AlertCircle size={15} className="text-gray-400" /> },
  }[p.status]

  const hasDetail = p.responses && p.responses.length > 0

  return (
    <div className={cn('rounded-xl border overflow-hidden', cfg.border)}>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-xl flex-shrink-0">{p.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-800">{p.platformKo}</p>
          {p.status !== 'skipped' && p.totalQueries > 0 && (
            <div className="flex gap-1 mt-1">
              {Array.from({ length: p.totalQueries }).map((_, i) => (
                <div key={i} className={cn('w-4 h-1.5 rounded-full', i < p.mentionCount ? 'bg-green-500' : 'bg-gray-200')} />
              ))}
              <span className="text-xs text-gray-500 ml-1">{p.mentionCount}/{p.totalQueries}</span>
            </div>
          )}
        </div>
        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 flex items-center gap-1', cfg.badge)}>
          {cfg.icon}
          {p.statusKo}
        </span>
        {hasDetail && (
          <button onClick={() => setShowDetail(s => !s)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            {showDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {/* Per-question breakdown */}
      {showDetail && p.responses.length > 0 && (
        <div className="border-t border-white/60 bg-white/50 px-4 py-3 space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">질문별 응답</p>
          {p.responses.map((r, i) => (
            <div key={i} className={cn('rounded-lg p-3 border text-xs', r.mentioned ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100')}>
              <div className="flex items-start gap-2 mb-1.5">
                <span className={cn('font-bold flex-shrink-0 w-4', r.mentioned ? 'text-green-600' : 'text-gray-400')}>
                  {r.mentioned ? '✓' : '✗'}
                </span>
                <p className="text-gray-600 italic flex-1">"{r.question}"</p>
              </div>
              <p className="text-gray-700 leading-relaxed ml-6 line-clamp-3">{r.response}</p>
            </div>
          ))}
        </div>
      )}

      {p.status === 'error' && p.error && (
        <div className="px-4 pb-2 text-xs text-amber-700 border-t border-white/50 pt-2">오류: {p.error}</div>
      )}
      {p.status === 'skipped' && (
        <div className="px-4 pb-2 text-xs text-gray-500 border-t border-white/50 pt-2">
          .env.local에 OPENROUTER_API_KEY를 설정하면 실측할 수 있습니다.
        </div>
      )}
    </div>
  )
}

// ─── Progress Steps ───────────────────────────────────────────────────────────

interface Step { step: number; message: string; done: boolean }

function StepList({ steps, running }: { steps: Step[]; running: boolean }) {
  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <div key={i} className={cn('flex items-center gap-2 text-sm', s.done ? 'text-green-600' : i === steps.length - 1 && running ? 'text-indigo-600 font-semibold' : 'text-gray-400')}>
          {s.done
            ? <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
            : i === steps.length - 1 && running
              ? <Loader2 size={15} className="animate-spin text-indigo-500 flex-shrink-0" />
              : <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 flex-shrink-0" />
          }
          <span>{s.message}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props { serviceName: string; category: string; url?: string }

export function CitationTestPanel({ serviceName, category, url }: Props) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<CitationTestResult | null>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [intel, setIntel] = useState<ServiceIntelligence | null>(null)
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [error, setError] = useState('')

  async function runTest() {
    setRunning(true); setResult(null); setSteps([]); setIntel(null); setQuestions([]); setError('')

    try {
      const res = await fetch('/api/analyze/citation-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceName, category, url }),
      })
      if (!res.ok || !res.body) throw new Error('서버 오류')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const ev = JSON.parse(line)
            if (ev.type === 'step') {
              setSteps(prev => {
                const updated = prev.map((s, i) => i === prev.length - 1 ? { ...s, done: true } : s)
                return [...updated, { step: ev.step, message: ev.message, done: false }]
              })
            }
            if (ev.type === 'service_analyzed') {
              setSteps(prev => prev.map((s, i) => i === prev.length - 1 ? { ...s, done: true } : s))
              setIntel(ev.intelligence)
            }
            if (ev.type === 'questions_generated') {
              setQuestions(ev.questions)
            }
            if (ev.type === 'complete') {
              setResult(ev.result)
              setSteps(prev => prev.map(s => ({ ...s, done: true })))
            }
            if (ev.type === 'error') throw new Error(ev.message)
          } catch (parseErr) { if (parseErr instanceof SyntaxError) continue; throw parseErr }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '테스트 오류')
    } finally {
      setRunning(false)
    }
  }

  const mentioned = result?.platforms.filter(p => p.status === 'mentioned') ?? []
  const tested = result?.platforms.filter(p => p.status !== 'skipped') ?? []

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            🔬 AI 실측 인용 테스트
            <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">서비스 분석 → 맞춤 질문</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            서비스를 먼저 분석한 뒤 관련 질문 5개를 생성해 4개 AI 플랫폼에 실제로 전송합니다
          </p>
        </div>
        {!running && (
          <button onClick={runTest}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-bold px-4 py-2 rounded-xl shadow-sm transition-all">
            <Play size={14} />{result ? '재테스트' : '실측 시작'}
          </button>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Not started */}
        {!running && !result && !error && (
          <div className="text-center py-6 space-y-3">
            <div className="text-4xl">🔬</div>
            <p className="text-sm text-gray-600 max-w-sm mx-auto leading-relaxed">
              <strong>"{serviceName}"</strong>을 먼저 분석하고, 이 서비스가 답이 될 만한 질문 5개를 생성한 뒤 ChatGPT·Claude·Gemini·Perplexity에 실제로 전송합니다.
            </p>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 text-left max-w-sm mx-auto space-y-1.5">
              <p className="font-bold">진행 순서:</p>
              <p>① 서비스 분석 (URL 크롤링 or AI 추론)</p>
              <p>② 맞춤 질문 5개 자동 생성</p>
              <p>③ 4개 AI 플랫폼에 동시 전송</p>
              <p>④ 언급 여부 + 응답 내용 확인</p>
            </div>
          </div>
        )}

        {/* Running */}
        {running && (
          <div className="space-y-4">
            <StepList steps={steps} running={running} />
            {intel && <ServiceIntelCard intel={intel} />}
            {questions.length > 0 && <QuestionsPanel questions={questions} />}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-700">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /><span>{error}</span>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Summary badge */}
            <div className={cn('rounded-xl border p-4', mentioned.length > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')}>
              <div className="flex items-center gap-3 mb-2">
                <span className={cn('text-3xl font-extrabold', mentioned.length > 0 ? 'text-green-600' : 'text-red-600')}>
                  {mentioned.length}/{tested.length}
                </span>
                <div>
                  <p className="font-bold text-sm text-gray-800">플랫폼 언급</p>
                  <p className="text-xs text-gray-500">맞춤 질문 {result.generatedQuestions.length}개 기준</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-lg font-extrabold text-gray-900">{result.overallMentionRate}%</p>
                  <p className="text-xs text-gray-500">평균 인용율</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
            </div>

            {/* Service analysis */}
            <ServiceIntelCard intel={result.serviceIntelligence} />

            {/* Questions used */}
            <QuestionsPanel questions={result.generatedQuestions} />

            {/* Platform results */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">플랫폼별 실측 결과</p>
              <div className="space-y-2">
                {result.platforms.map(p => <PlatformCard key={p.platform} p={p} />)}
              </div>
            </div>

            {/* Info note */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5"><Info size={12} /> 결과 해석 방법</p>
              <p>• 맞춤 질문은 이 서비스가 정답이 될 가능성이 높도록 설계되었습니다</p>
              <p>• 언급이 없다면 AI 학습 데이터에서 인지도가 낮거나, GEO 최적화가 부족한 것입니다</p>
              <p>• 테스트 결과는 AI 모델 버전 업데이트에 따라 달라질 수 있습니다</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
