'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, PenLine, Layers, CheckCircle, Loader2, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'
import { InputPanel } from './InputPanel'
import { StudioEditor } from './StudioEditor'
import { cn } from '@/lib/utils'
import type { StudioInput, GeneratedContent, StudioEvent } from '@/lib/studio-types'

// ─── Generation Progress ─────────────────────────────────────────────────────

interface ProgressStep {
  message: string
  type: StudioEvent['type']
  done: boolean
}

function GeneratingOverlay({ steps }: { steps: ProgressStep[] }) {
  const lastStep = steps[steps.length - 1]
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 gap-8 px-6">
      <div className="relative">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-3xl shadow-lg">
          ✨
        </div>
        <div className="absolute -inset-3 rounded-3xl border-4 border-violet-200 border-t-violet-600 animate-spin opacity-60" />
      </div>

      <div className="text-center space-y-2">
        <p className="font-bold text-gray-900 text-lg">AI가 콘텐츠를 생성하고 있어요</p>
        <p className="text-sm text-violet-600 font-medium">{lastStep?.message ?? '준비 중...'}</p>
      </div>

      <div className="w-full max-w-sm space-y-2">
        {steps.map((step, i) => (
          <div key={i} className={cn('flex items-center gap-3 text-sm transition-all duration-300', step.done ? 'text-green-600' : i === steps.length - 1 ? 'text-violet-700 font-semibold' : 'text-gray-300')}>
            {step.done
              ? <CheckCircle size={16} className="flex-shrink-0 text-green-500" />
              : i === steps.length - 1
                ? <Loader2 size={16} className="animate-spin flex-shrink-0 text-violet-500" />
                : <div className="w-4 h-4 rounded-full border-2 border-gray-200 flex-shrink-0" />
            }
            <span className="truncate">{step.message}</span>
          </div>
        ))}
      </div>

      <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 max-w-sm w-full">
        <p className="text-xs text-violet-700 text-center leading-relaxed">
          이미지 분석 + 참고자료 요약 + 3단계 파이프라인을 실행 중입니다.<br />
          약 20-40초 소요됩니다.
        </p>
      </div>
    </div>
  )
}

// ─── Default Input ────────────────────────────────────────────────────────────

function defaultInput(): StudioInput {
  return {
    topic: '',
    contentPurpose: 'blog',
    tone: 'friendly',
    targetAudience: '',
    platform: 'naver_blog',
    images: [],
    references: [],
    additionalNotes: '',
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ContentStudio() {
  const [input, setInput] = useState<StudioInput>(defaultInput)
  const [steps, setSteps] = useState<ProgressStep[]>([])
  const [generating, setGenerating] = useState(false)
  const [content, setContent] = useState<GeneratedContent | null>(null)
  const [error, setError] = useState('')
  const [panelCollapsed, setPanelCollapsed] = useState(false)

  function updateInput(update: Partial<StudioInput>) {
    setInput(prev => ({ ...prev, ...update }))
  }

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    setSteps([{ message: '입력 데이터 준비 중...', type: 'step', done: false }])

    try {
      // Build payload — convert File objects to just the needed fields
      const payload: StudioInput = {
        ...input,
        images: input.images.map(img => ({
          id: img.id,
          dataUrl: img.dataUrl,
          filename: img.filename,
          description: img.description,
          purpose: img.purpose,
        })),
      }

      const res = await fetch('/api/studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok || !res.body) throw new Error('서버 오류가 발생했습니다.')

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
            const event: StudioEvent = JSON.parse(line)

            if (event.type === 'step' || event.type === 'image_analyzed' || event.type === 'reference_fetched' || event.type === 'structure_ready') {
              setSteps(prev => {
                const updated = prev.map((s, i) => i === prev.length - 1 ? { ...s, done: true } : s)
                return [...updated, { message: event.message ?? '', type: event.type, done: false }]
              })
            }

            if (event.type === 'complete' && event.data) {
              setSteps(prev => prev.map(s => ({ ...s, done: true })))
              setContent(event.data!)
              setPanelCollapsed(true)
            }

            if (event.type === 'error') {
              throw new Error(event.error)
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue
            throw parseErr
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '생성 중 오류가 발생했습니다.')
    } finally {
      setGenerating(false)
    }
  }

  function handleReset() {
    setContent(null)
    setSteps([])
    setError('')
    setPanelCollapsed(false)
  }

  const showEditor = content !== null
  const showGenerating = generating

  return (
    <div className="min-h-screen bg-[#F0F4FF] flex flex-col">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">GEO Score</span>
          </Link>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-2">
            <PenLine size={16} className="text-violet-500" />
            <span className="font-bold text-gray-900 text-sm">콘텐츠 스튜디오</span>
            <span className="hidden sm:inline text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">
              이미지·참고자료 기반 생성 + 편집
            </span>
          </div>

          {content && (
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                <RotateCcw size={12} />
                새로 만들기
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 max-w-[1400px] mx-auto w-full px-4 py-5">
        <div className={cn(
          'grid gap-5 h-[calc(100vh-100px)] transition-all duration-300',
          showEditor && !panelCollapsed ? 'grid-cols-[380px_1fr]' :
          showEditor && panelCollapsed ? 'grid-cols-[48px_1fr]' :
          'grid-cols-1 max-w-2xl mx-auto'
        )}>

          {/* ── LEFT: Input Panel ── */}
          <div className={cn('relative transition-all duration-300', showEditor && panelCollapsed && 'overflow-hidden')}>
            {showEditor && (
              <button
                onClick={() => setPanelCollapsed(c => !c)}
                className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-12 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
              >
                {panelCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
              </button>
            )}

            {(!showEditor || !panelCollapsed) && (
              <div className="h-full overflow-y-auto">
                <InputPanel
                  input={input}
                  onChange={updateInput}
                  onGenerate={handleGenerate}
                  generating={generating}
                />
              </div>
            )}
          </div>

          {/* ── RIGHT: Editor / Generating / Empty ── */}
          <div className="h-full overflow-hidden">
            {showGenerating ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-full overflow-y-auto">
                <GeneratingOverlay steps={steps} />
              </div>
            ) : error ? (
              <div className="bg-white rounded-2xl border border-red-100 shadow-sm h-full flex flex-col items-center justify-center gap-4 p-8">
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-2xl">⚠️</div>
                <div className="text-center">
                  <p className="font-bold text-gray-800 mb-1">생성 실패</p>
                  <p className="text-sm text-gray-500">{error}</p>
                </div>
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-2 text-sm font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 px-4 py-2 rounded-xl transition-colors"
                >
                  <RotateCcw size={14} /> 다시 시도
                </button>
              </div>
            ) : content ? (
              <StudioEditor
                content={content}
                images={input.images}
              />
            ) : (
              /* Empty state */
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-full flex flex-col items-center justify-center gap-6 p-8 text-center">
                <div className="w-20 h-20 bg-violet-50 rounded-3xl flex items-center justify-center text-4xl">🎨</div>
                <div>
                  <h2 className="font-bold text-gray-900 text-lg mb-2">콘텐츠 스튜디오</h2>
                  <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                    왼쪽에서 이미지, 참고자료, 목적을 입력하고
                    "콘텐츠 생성하기" 버튼을 누르면<br />
                    AI가 구조화된 콘텐츠 초안을 생성합니다.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
                  {[
                    { icon: '📸', label: '이미지 업로드', desc: 'AI가 자동 분석·배치' },
                    { icon: '🔗', label: '참고자료 URL', desc: '내용 요약 후 자연스럽게 인용' },
                    { icon: '✏️', label: '직접 편집', desc: 'TipTap 에디터로 자유롭게 수정' },
                    { icon: '📤', label: 'Markdown/HTML 내보내기', desc: '한 번의 클릭으로 저장' },
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl text-left">
                      <span className="text-xl flex-shrink-0">{f.icon}</span>
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{f.label}</p>
                        <p className="text-xs text-gray-500">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
