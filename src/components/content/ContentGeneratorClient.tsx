'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Sparkles, Loader2, Copy, Check, RotateCcw,
  ChevronDown, ChevronUp, Minus, Plus, RefreshCw,
  Clock, Hash, BarChart3, Lightbulb, FileText, Code2, Eye, Award, Zap,
} from 'lucide-react'
import {
  PLATFORMS, DEPTH_CONFIG,
  type PlatformType, type ContentDepth, type ContentTone, type GeneratedContent, type KeywordResult,
} from '@/lib/content-strategy'
import { type QualityEvent } from '@/lib/quality-agent'
import { QualityProgress } from './QualityProgress'
import { cn } from '@/lib/utils'

// ─── Sub-components ──────────────────────────────────────────────────────────

function PlatformCard({ platform, selected, onClick }: { platform: PlatformType; selected: boolean; onClick: () => void }) {
  const cfg = PLATFORMS[platform]
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 transition-all text-left w-full',
        selected
          ? 'border-current shadow-sm'
          : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
      )}
      style={selected ? { borderColor: cfg.color, backgroundColor: cfg.bgColor } : {}}
    >
      <div className="flex items-center gap-2 w-full">
        <span className="text-base">{cfg.emoji}</span>
        <span className={cn('font-bold text-xs', selected ? '' : 'text-gray-700')} style={selected ? { color: cfg.color } : {}}>
          {cfg.name}
        </span>
        {selected && (
          <span className="ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: cfg.color, color: '#fff' }}>선택됨</span>
        )}
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{cfg.shortDesc}</p>
    </button>
  )
}

function DepthButton({ depth, selected, onClick }: { depth: ContentDepth; selected: boolean; onClick: () => void }) {
  const cfg = DEPTH_CONFIG[depth]
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all',
        selected
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
      )}
    >
      <span className="text-lg">{cfg.icon}</span>
      <span className={cn('text-xs font-bold', selected ? 'text-indigo-700' : 'text-gray-700')}>{cfg.label}</span>
      <span className="text-xs text-gray-400">{cfg.charRange}</span>
    </button>
  )
}

function GeoScoreBadge({ score, applied }: { score: number; applied: string[] }) {
  const color = score >= 85 ? '#059669' : score >= 75 ? '#2563EB' : '#D97706'
  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}>
      <div className="flex items-center gap-3">
        <div className="text-center">
          <span className="text-3xl font-extrabold block" style={{ color }}>{score}</span>
          <span className="text-xs text-gray-500">GEO 예상점수</span>
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 mb-1">AI 인용 가능성</p>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: color }} />
          </div>
        </div>
      </div>
      {applied.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {applied.map((item, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${color}15`, color }}>
              ✓ {item}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function LoadingAnimation({ platform }: { platform: PlatformType }) {
  const cfg = PLATFORMS[platform]
  const steps = [
    '플랫폼 특성 분석 중...',
    '한국 SEO 키워드 최적화 중...',
    '콘텐츠 구조 설계 중...',
    'AI 콘텐츠 작성 중...',
    'GEO 최적화 검토 중...',
  ]
  const [step] = useState(() => {
    // Cycle through steps with a CSS animation
    return 0
  })
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl animate-pulse" style={{ backgroundColor: cfg.bgColor }}>
          {cfg.emoji}
        </div>
        <div className="absolute -inset-2 rounded-2xl border-4 border-t-current animate-spin opacity-30" style={{ borderColor: cfg.color }} />
      </div>
      <div className="text-center space-y-1.5">
        <p className="font-bold text-gray-900">콘텐츠 생성 중</p>
        <p className="text-sm text-gray-500">{cfg.name}에 최적화된 콘텐츠를 작성하고 있어요</p>
      </div>
      <div className="space-y-2 w-64">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse" style={{ backgroundColor: cfg.color, animationDelay: `${i * 400}ms` }} />
            {s}
          </div>
        ))}
      </div>
    </div>
  )
}

function renderMarkdown(text: string): string {
  return text
    .replace(/```([\w]*)\n?([\s\S]*?)```/g, '<pre class="bg-gray-900 text-green-300 rounded-xl p-4 text-xs overflow-x-auto my-3 leading-relaxed"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-pink-600 rounded px-1 font-mono text-xs">$1</code>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-gray-800 mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-gray-900 mt-5 mb-2 border-b border-gray-100 pb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-extrabold text-gray-900 mt-4 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic text-gray-700">$1</em>')
    .replace(/^---$/gm, '<hr class="border-gray-200 my-4" />')
    .replace(/^\d+\. (.+)$/gm, '<div class="flex gap-2.5 my-1.5"><span class="text-indigo-500 font-bold flex-shrink-0 text-sm">•</span><span class="text-sm text-gray-700">$1</span></div>')
    .replace(/^[-*] (.+)$/gm, '<div class="flex gap-2.5 my-1"><span class="text-gray-400 flex-shrink-0">·</span><span class="text-sm text-gray-700">$1</span></div>')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n\n/g, '<div class="my-2"></div>')
    .replace(/\n/g, ' ')
}

function ContentPreview({ content, platform }: { content: GeneratedContent; platform: PlatformType }) {
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview')
  const [editContent, setEditContent] = useState(content.content)
  const [copies, setCopies] = useState<Record<string, boolean>>({})
  const cfg = PLATFORMS[platform]

  async function copyText(key: string, text: string) {
    await navigator.clipboard.writeText(text)
    setCopies(p => ({ ...p, [key]: true }))
    setTimeout(() => setCopies(p => ({ ...p, [key]: false })), 1800)
  }

  const fullText = `${content.title}\n\n${content.content}${content.hashtags.length ? '\n\n' + content.hashtags.map(h => `#${h}`).join(' ') : ''}`

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">제목</span>
          </div>
          <button onClick={() => copyText('title', content.title)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
            {copies.title ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
            복사
          </button>
        </div>
        <p className="text-lg font-bold text-gray-900 leading-snug">{content.title}</p>
        <p className="text-sm text-gray-500 mt-2 italic">{content.summary}</p>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
            <button onClick={() => setViewMode('preview')} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all', viewMode === 'preview' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50')}>
              <Eye size={12} /> 미리보기
            </button>
            <button onClick={() => setViewMode('raw')} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all', viewMode === 'raw' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50')}>
              <Code2 size={12} /> 편집
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock size={11} /> {content.estimated_read_time}
            </span>
            <button
              onClick={() => copyText('content', editContent)}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              {copies.content ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
              {copies.content ? '복사됨' : '전체 복사'}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {viewMode === 'preview' ? (
            <div
              className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(editContent) }}
            />
          ) : (
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full h-96 text-sm text-gray-700 font-mono leading-relaxed resize-none focus:outline-none"
              placeholder="콘텐츠를 직접 편집하세요..."
            />
          )}
        </div>
      </div>

      {/* Hashtags */}
      {content.hashtags.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Hash size={15} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">해시태그 ({content.hashtags.length}개)</span>
            </div>
            <button onClick={() => copyText('tags', content.hashtags.map(h => `#${h}`).join(' '))} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
              {copies.tags ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
              전체 복사
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {content.hashtags.map((tag, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer hover:opacity-80 transition-opacity"
                style={{ backgroundColor: cfg.bgColor, color: cfg.color, borderColor: cfg.borderColor }}
                onClick={() => copyText(`tag-${i}`, `#${tag}`)}
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* GEO Score */}
      <GeoScoreBadge score={content.geo_score_estimate} applied={content.geo_optimizations_applied} />

      {/* Platform notes */}
      {content.platform_optimization_notes && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={14} className="text-indigo-500" />
            <span className="text-xs font-semibold text-indigo-700">적용된 플랫폼 최적화</span>
          </div>
          <p className="text-sm text-indigo-700 leading-relaxed">{content.platform_optimization_notes}</p>
        </div>
      )}

      {/* Copy all */}
      <button
        onClick={() => copyText('all', fullText)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
      >
        {copies.all ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
        {copies.all ? '클립보드에 복사됨!' : '전체 내용 한 번에 복사 (제목 + 본문 + 해시태그)'}
      </button>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface ServiceContext {
  name: string
  category: string
  categoryLabel: string
  score?: number
}

interface Props {
  serviceContext?: ServiceContext
}

const GENERATION_STEPS = [
  '플랫폼 특성 분석 중...',
  '한국 SEO 최적화 적용 중...',
  'GEO 콘텐츠 구조 설계 중...',
  'AI 콘텐츠 작성 중...',
  '최종 GEO 검토 중...',
]

export function ContentGeneratorClient({ serviceContext }: Props) {
  // Form state
  const [platform, setPlatform] = useState<PlatformType>('naver_blog')
  const [depth, setDepth] = useState<ContentDepth>('medium')
  const [topic, setTopic] = useState(serviceContext ? `${serviceContext.name} ${serviceContext.categoryLabel || serviceContext.category}` : '')
  const [keywords, setKeywords] = useState<string[]>([])
  const [kwInput, setKwInput] = useState('')
  const [tone, setTone] = useState<ContentTone>(PLATFORMS['naver_blog'].defaultTone)
  const [targetAudience, setTargetAudience] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Keyword suggestions
  const [kwSuggestions, setKwSuggestions] = useState<KeywordResult | null>(null)
  const [loadingKw, setLoadingKw] = useState(false)
  const [showKwPanel, setShowKwPanel] = useState(false)

  // Generation mode
  const [qualityMode, setQualityMode] = useState(false)

  // Normal generation
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [result, setResult] = useState<GeneratedContent | null>(null)
  const [error, setError] = useState('')

  // Quality agent state
  const [qualityEvents, setQualityEvents] = useState<QualityEvent[]>([])
  const [qualityFinalScore, setQualityFinalScore] = useState<number | undefined>()
  const [qualityTotalIter, setQualityTotalIter] = useState<number | undefined>()
  const [qualitySummary, setQualitySummary] = useState<string[] | undefined>()

  // History (localStorage)
  const [history, setHistory] = useState<Array<{ id: string; title: string; platform: PlatformType; geoScore: number; ts: number }>>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('content_history') ?? '[]') } catch { return [] }
  })
  const [showHistory, setShowHistory] = useState(false)

  const platformCfg = PLATFORMS[platform]

  function addKeyword() {
    const kw = kwInput.trim()
    if (kw && !keywords.includes(kw) && keywords.length < 10) {
      setKeywords(p => [...p, kw])
      setKwInput('')
    }
  }

  function removeKeyword(kw: string) {
    setKeywords(p => p.filter(k => k !== kw))
  }

  function addFromSuggestion(kw: string) {
    if (!keywords.includes(kw) && keywords.length < 10) setKeywords(p => [...p, kw])
  }

  async function fetchKeywords() {
    if (!topic.trim()) return
    setLoadingKw(true)
    setShowKwPanel(true)
    try {
      const res = await fetch('/api/content/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, platform, serviceContext }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setKwSuggestions(data)
    } catch { /* ignore */ } finally { setLoadingKw(false) }
  }

  const generate = useCallback(async (override?: Partial<Parameters<typeof buildRequest>[0]>) => {
    if (!topic.trim()) return
    setLoading(true)
    setLoadingStep(0)
    setError('')
    setResult(null)

    const stepTimer = setInterval(() => {
      setLoadingStep(p => Math.min(p + 1, GENERATION_STEPS.length - 1))
    }, 1400)

    try {
      const body = buildRequest({ platform, depth, topic, keywords, tone, targetAudience, serviceContext, ...override })
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data: GeneratedContent = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? '생성 실패')
      setResult(data)

      // Save to history
      const entry = { id: Date.now().toString(), title: data.title, platform, geoScore: data.geo_score_estimate, ts: Date.now() }
      setHistory(prev => {
        const updated = [entry, ...prev].slice(0, 10)
        try { localStorage.setItem('content_history', JSON.stringify(updated)) } catch { /* */ }
        return updated
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '생성 중 오류가 발생했습니다.')
    } finally {
      clearInterval(stepTimer)
      setLoading(false)
    }
  }, [platform, depth, topic, keywords, tone, targetAudience, serviceContext])

  function buildRequest(opts: { platform: PlatformType; depth: ContentDepth; topic: string; keywords: string[]; tone: ContentTone; targetAudience: string; serviceContext?: ServiceContext; convertFrom?: { platform: PlatformType; content: string }; adjustMode?: 'shorter' | 'longer'; existingContent?: string }) {
    return {
      platform: opts.platform,
      depth: opts.depth,
      topic: opts.topic,
      keywords: opts.keywords.length ? opts.keywords : undefined,
      tone: opts.tone,
      targetAudience: opts.targetAudience || undefined,
      serviceContext: opts.serviceContext ? { name: opts.serviceContext.name, category: opts.serviceContext.categoryLabel || opts.serviceContext.category } : undefined,
      convertFrom: opts.convertFrom,
      adjustMode: opts.adjustMode,
      existingContent: opts.existingContent,
    }
  }

  // ── Quality Agent generator ────────────────────────────────────────────────
  const generateWithQuality = useCallback(async () => {
    if (!topic.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    setQualityEvents([])
    setQualityFinalScore(undefined)
    setQualityTotalIter(undefined)
    setQualitySummary(undefined)

    try {
      const body = {
        platform, depth, topic,
        keywords: keywords.length ? keywords : undefined,
        tone,
        targetAudience: targetAudience || undefined,
        serviceContext: serviceContext ? { name: serviceContext.name, category: serviceContext.categoryLabel || serviceContext.category } : undefined,
      }

      const res = await fetch('/api/content/quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok || !res.body) throw new Error('품질 에이전트 응답 오류')

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
            const event: QualityEvent = JSON.parse(line)
            setQualityEvents(prev => [...prev, event])

            if (event.type === 'complete') {
              setResult(event.content ?? null)
              setQualityFinalScore(event.finalScore)
              setQualityTotalIter(event.totalIterations)
              setQualitySummary(event.improvementSummary)

              if (event.content) {
                const entry = { id: Date.now().toString(), title: event.content.title, platform, geoScore: event.finalScore ?? event.content.geo_score_estimate, ts: Date.now() }
                setHistory(prev => {
                  const updated = [entry, ...prev].slice(0, 10)
                  try { localStorage.setItem('content_history', JSON.stringify(updated)) } catch { /* */ }
                  return updated
                })
              }
            } else if (event.type === 'error') {
              throw new Error(event.error)
            }
          } catch (parseErr) {
            // skip malformed lines
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '품질 에이전트 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [platform, depth, topic, keywords, tone, targetAudience, serviceContext])

  function handleConvert(targetPlatform: PlatformType) {
    if (!result) return
    setPlatform(targetPlatform)
    setTone(PLATFORMS[targetPlatform].defaultTone)
    generate({ platform: targetPlatform, tone: PLATFORMS[targetPlatform].defaultTone, convertFrom: { platform, content: result.content } })
  }

  function handleAdjust(mode: 'shorter' | 'longer') {
    if (!result) return
    const newDepth: ContentDepth = mode === 'shorter' ? 'light' : 'deep'
    setDepth(newDepth)
    generate({ depth: newDepth, adjustMode: mode, existingContent: result.content })
  }

  const otherPlatforms = (Object.keys(PLATFORMS) as PlatformType[]).filter(p => p !== platform)

  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">GEO Score</span>
          </Link>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-2">
            <span className="text-base">{platformCfg.emoji}</span>
            <span className="font-bold text-gray-900 text-sm hidden sm:inline">콘텐츠 생성기</span>
          </div>
          {serviceContext && (
            <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded-full">
              {serviceContext.name}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={() => setShowHistory(s => !s)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Clock size={12} />
                이력 ({history.length})
              </button>
            )}
          </div>
        </div>
      </header>

      {/* History drawer */}
      {showHistory && history.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 pt-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">최근 생성 이력</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {history.map(h => (
                <button key={h.id} className="flex items-center gap-2 text-left p-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100">
                  <span className="text-sm">{PLATFORMS[h.platform].emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{h.title}</p>
                    <p className="text-xs text-gray-400">{new Date(h.ts).toLocaleDateString('ko-KR')}</p>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full flex-shrink-0">{h.geoScore}점</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">

          {/* ── LEFT PANEL (Sticky Form) ── */}
          <div className="lg:sticky lg:top-[65px] space-y-4">

            {/* Platform Selector */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">플랫폼 선택</p>
              <div className="grid grid-cols-1 gap-2">
                {(Object.keys(PLATFORMS) as PlatformType[]).map(p => (
                  <PlatformCard
                    key={p} platform={p}
                    selected={platform === p}
                    onClick={() => { setPlatform(p); setTone(PLATFORMS[p].defaultTone) }}
                  />
                ))}
              </div>
            </div>

            {/* Topic + Keywords */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  주제 <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="예) GEO 최적화 방법, 네이버 블로그 상위노출..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                  rows={2}
                />
              </div>

              {/* Keyword suggestions */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    키워드 <span className="text-gray-400 font-normal">({keywords.length}/10)</span>
                  </label>
                  <button
                    onClick={fetchKeywords}
                    disabled={!topic.trim() || loadingKw}
                    className={cn(
                      'flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors',
                      topic.trim() && !loadingKw
                        ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                        : 'text-gray-400 bg-gray-50'
                    )}
                  >
                    {loadingKw ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                    AI 키워드 추천
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    value={kwInput}
                    onChange={e => setKwInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    placeholder="키워드 입력 후 Enter..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <button onClick={addKeyword} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-medium transition-colors">추가</button>
                </div>

                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {keywords.map(kw => (
                      <span key={kw} className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded-full">
                        {kw}
                        <button onClick={() => removeKeyword(kw)} className="hover:text-red-500 ml-0.5">×</button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Keyword suggestions panel */}
                {showKwPanel && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                    {loadingKw ? (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Loader2 size={12} className="animate-spin" /> 키워드 분석 중...
                      </div>
                    ) : kwSuggestions ? (
                      <>
                        <div>
                          <p className="text-xs font-semibold text-red-600 mb-1">🔥 대형 키워드</p>
                          <div className="flex flex-wrap gap-1">{kwSuggestions.keywords.high_volume.map(kw => (
                            <button key={kw} onClick={() => addFromSuggestion(kw)} className="text-xs bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded-full hover:bg-red-100 transition-colors">+ {kw}</button>
                          ))}</div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-amber-600 mb-1">📊 중형 키워드</p>
                          <div className="flex flex-wrap gap-1">{kwSuggestions.keywords.medium.map(kw => (
                            <button key={kw} onClick={() => addFromSuggestion(kw)} className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full hover:bg-amber-100 transition-colors">+ {kw}</button>
                          ))}</div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-green-600 mb-1">🎯 롱테일 키워드</p>
                          <div className="flex flex-wrap gap-1">{kwSuggestions.keywords.long_tail.map(kw => (
                            <button key={kw} onClick={() => addFromSuggestion(kw)} className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full hover:bg-green-100 transition-colors">+ {kw}</button>
                          ))}</div>
                        </div>
                        <p className="text-xs text-gray-500">검색 의도: <span className="font-semibold text-gray-700">{kwSuggestions.search_intent}</span></p>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {/* Depth */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">콘텐츠 깊이</p>
              <div className="flex gap-2">
                {(Object.keys(DEPTH_CONFIG) as ContentDepth[]).map(d => (
                  <DepthButton key={d} depth={d} selected={depth === d} onClick={() => setDepth(d)} />
                ))}
              </div>
            </div>

            {/* Advanced Options */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowAdvanced(s => !s)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider hover:bg-gray-50 transition-colors"
              >
                고급 옵션
                {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showAdvanced && (
                <div className="px-5 pb-5 space-y-4 border-t border-gray-50">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">어조</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['friendly', 'professional', 'neutral', 'technical'] as ContentTone[]).map(t => {
                        const labels: Record<ContentTone, string> = { friendly: '친근함', professional: '전문적', neutral: '중립적', technical: '기술적' }
                        return (
                          <button
                            key={t}
                            onClick={() => setTone(t)}
                            className={cn('py-2 rounded-lg text-xs font-medium border transition-all', tone === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}
                          >
                            {labels[t]}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">타겟 독자</label>
                    <input
                      value={targetAudience}
                      onChange={e => setTargetAudience(e.target.value)}
                      placeholder="예) 마케터, 스타트업 대표, 개발자..."
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Platform tips */}
            <div className="rounded-2xl border p-4 space-y-2" style={{ backgroundColor: platformCfg.bgColor, borderColor: platformCfg.borderColor }}>
              <p className="text-xs font-bold" style={{ color: platformCfg.color }}>{platformCfg.emoji} {platformCfg.name} 최적화 팁</p>
              {platformCfg.tips.map((tip, i) => (
                <p key={i} className="text-xs flex items-start gap-1.5" style={{ color: platformCfg.color }}>
                  <span className="opacity-60 flex-shrink-0 mt-0.5">•</span>{tip}
                </p>
              ))}
            </div>

            {/* Mode Toggle */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">생성 모드</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setQualityMode(false)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all',
                    !qualityMode ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 bg-white hover:bg-gray-50'
                  )}
                >
                  <Zap size={18} className={!qualityMode ? 'text-indigo-600' : 'text-gray-400'} />
                  <span className={cn('text-xs font-bold', !qualityMode ? 'text-indigo-700' : 'text-gray-500')}>빠른 생성</span>
                  <span className="text-xs text-gray-400">1회 즉시</span>
                </button>
                <button
                  onClick={() => setQualityMode(true)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all',
                    qualityMode ? 'border-violet-500 bg-violet-50' : 'border-gray-100 bg-white hover:bg-gray-50'
                  )}
                >
                  <Award size={18} className={qualityMode ? 'text-violet-600' : 'text-gray-400'} />
                  <span className={cn('text-xs font-bold', qualityMode ? 'text-violet-700' : 'text-gray-500')}>품질 에이전트</span>
                  <span className="text-xs text-gray-400">90점 보장</span>
                </button>
              </div>
              {qualityMode && (
                <div className="flex items-start gap-2 bg-violet-50 rounded-xl p-2.5">
                  <Award size={13} className="text-violet-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-violet-700 leading-relaxed">
                    생성 → 자가 평가 → 개선을 반복해 <strong>90점 이상</strong>이 될 때까지 자동으로 개선합니다. (최대 3회)
                  </p>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <button
              onClick={() => qualityMode ? generateWithQuality() : generate()}
              disabled={loading || !topic.trim()}
              className={cn(
                'w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-base transition-all',
                loading || !topic.trim()
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'text-white shadow-lg hover:shadow-xl'
              )}
              style={loading || !topic.trim() ? {} : {
                background: qualityMode
                  ? 'linear-gradient(135deg, #7C3AED, #9333EA)'
                  : 'linear-gradient(135deg, #4F46E5, #7C3AED)'
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {qualityMode ? '품질 에이전트 작동 중...' : `생성 중... (${GENERATION_STEPS[loadingStep]?.slice(0, 10)}...)`}
                </>
              ) : qualityMode ? (
                <>
                  <Award size={18} />
                  품질 에이전트로 생성 (90점 보장)
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  GEO 최적화 콘텐츠 생성
                </>
              )}
            </button>
          </div>

          {/* ── RIGHT PANEL (Result) ── */}
          <div className="min-h-[400px]">
            {/* Quality Agent: show progress while loading AND after done (until result is shown) */}
            {qualityMode && qualityEvents.length > 0 && (
              <div className={cn('mb-4', result ? '' : '')}>
                <QualityProgress
                  events={qualityEvents}
                  finalScore={qualityFinalScore}
                  totalIterations={qualityTotalIter}
                  improvementSummary={qualitySummary}
                />
              </div>
            )}

            {loading && !qualityMode ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <LoadingAnimation platform={platform} />
              </div>
            ) : loading && qualityMode ? null
            : error ? (
              <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-8 text-center">
                <p className="text-red-600 font-semibold mb-2">오류가 발생했습니다</p>
                <p className="text-sm text-gray-500 mb-4">{error}</p>
                <button onClick={() => qualityMode ? generateWithQuality() : generate()} className="flex items-center gap-2 mx-auto text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors">
                  <RefreshCw size={14} /> 다시 시도
                </button>
              </div>
            ) : result ? (
              <div className="space-y-4">
                {/* Action toolbar */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 mr-1">빠른 수정:</span>
                  <button onClick={() => handleAdjust('shorter')} className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">
                    <Minus size={12} /> 더 짧게
                  </button>
                  <button onClick={() => handleAdjust('longer')} className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">
                    <Plus size={12} /> 더 길게
                  </button>
                  <button onClick={() => generate()} className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">
                    <RotateCcw size={12} /> 재생성
                  </button>
                  <div className="h-4 w-px bg-gray-200 mx-1" />
                  <span className="text-xs font-semibold text-gray-500">플랫폼 변환:</span>
                  {otherPlatforms.map(p => (
                    <button
                      key={p}
                      onClick={() => handleConvert(p)}
                      className="flex items-center gap-1 text-xs font-medium bg-white border border-gray-200 hover:bg-gray-50 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      {PLATFORMS[p].emoji} {PLATFORMS[p].name.replace('네이버 블로그', '네이버').replace('티스토리', 'Tistory').replace('벨로그', 'Velog').replace('기업 웹사이트', '기업')}
                    </button>
                  ))}
                </div>

                <ContentPreview content={result} platform={platform} />
              </div>
            ) : (
              /* Empty state */
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl" style={{ backgroundColor: platformCfg.bgColor }}>
                  {platformCfg.emoji}
                </div>
                <h3 className="font-bold text-gray-800 mb-2">{platformCfg.name} 콘텐츠를 생성해보세요</h3>
                <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
                  {platformCfg.shortDesc}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-sm mx-auto text-left">
                  {platformCfg.tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-gray-600 p-2.5 rounded-xl" style={{ backgroundColor: platformCfg.bgColor }}>
                      <span style={{ color: platformCfg.color }}>✓</span>
                      {tip}
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
                    <BarChart3 size={12} />
                    GEO 최적화 적용 시 AI 인용율 최대 41% 향상 (Princeton 연구, 2024)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
