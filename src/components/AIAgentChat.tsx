'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Loader2, Copy, Check, ChevronDown } from 'lucide-react'
import { QUICK_ACTIONS } from '@/lib/constants'
import { getHistory, cn } from '@/lib/utils'
import type { ChatMessage, GEOAnalysisResult } from '@/lib/types'

function parseMarkdown(text: string): string {
  return text
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-900 text-green-300 rounded-lg p-3 text-xs overflow-x-auto my-2 whitespace-pre-wrap"><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-gray-800 rounded px-1 py-0.5 text-xs font-mono">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    .replace(/^### (.+)$/gm, '<p class="font-bold text-sm text-gray-800 mt-2 mb-1">$1</p>')
    .replace(/^## (.+)$/gm, '<p class="font-bold text-base text-gray-900 mt-3 mb-1">$1</p>')
    .replace(/^# (.+)$/gm, '<p class="font-bold text-lg text-gray-900 mt-3 mb-1">$1</p>')
    .replace(/^\d+\. (.+)$/gm, '<div class="flex gap-2 my-0.5"><span class="text-gray-700 font-semibold flex-shrink-0">•</span><span>$1</span></div>')
    .replace(/^[-*] (.+)$/gm, '<div class="flex gap-2 my-0.5"><span class="text-gray-400 flex-shrink-0">·</span><span>$1</span></div>')
    .replace(/\n{2,}/g, '<br class="my-1" />')
    .replace(/\n/g, ' ')
}

interface AIAgentChatProps {
  analysis: GEOAnalysisResult
  forceOpen?: boolean
  onForceOpenHandled?: () => void
  initialMessage?: string
  onClearInitialMessage: () => void
}

export function AIAgentChat({ analysis, forceOpen, onForceOpenHandled, initialMessage, onClearInitialMessage }: AIAgentChatProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const initializedRef = useRef(false)

  // Build initial greeting
  const buildGreeting = useCallback(() => {
    const gap = analysis.totalScore - analysis.industryAverage
    const gapText = gap >= 0 ? `업계 평균보다 **${gap}점 높은** 점수예요 👍` : `업계 평균까지 **${Math.abs(gap)}점** 더 올릴 수 있어요!`
    const lowestDim = [...analysis.dimensions].sort((a, b) => (a.score / a.maxScore) - (b.score / b.maxScore))[0]

    return `안녕하세요! **GEO AI** 전문가입니다 😊

**${analysis.serviceName}** (${analysis.categoryLabel}) 분석 결과를 보니, 현재 **${analysis.totalScore}점 (${analysis.grade}등급)**이에요. ${gapText}

가장 먼저 개선하면 좋을 영역은 **${lowestDim?.nameKo ?? '콘텐츠 구조'}** 부분이에요. 이 하나만 잘 잡아도 AI 인용율이 눈에 띄게 올라갈 수 있어요!

아래 빠른 메뉴를 선택하거나 직접 질문해주세요 ✨`
  }, [analysis])

  // forceOpen: dashboard CTA 버튼 클릭 시 채팅창 즉시 열기
  useEffect(() => {
    if (forceOpen && !open) {
      setOpen(true)
      onForceOpenHandled?.()
    }
  }, [forceOpen, open, onForceOpenHandled])

  // Open via initialMessage (dimension 개선 버튼)
  useEffect(() => {
    if (initialMessage && !open) {
      setOpen(true)
    }
  }, [initialMessage, open])

  useEffect(() => {
    if (open && !initializedRef.current) {
      initializedRef.current = true
      setMessages([{ role: 'assistant', content: buildGreeting(), timestamp: Date.now() }])
    }
  }, [open, buildGreeting])

  // Handle initial message passed from dashboard
  useEffect(() => {
    if (open && initialMessage && messages.length > 0 && !streaming) {
      sendMessage(initialMessage)
      onClearInitialMessage()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialMessage, messages.length])

  // Auto scroll
  useEffect(() => {
    if (open) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [messages, open])

  function handleScroll() {
    const el = messagesContainerRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    setShowScrollBtn(!nearBottom)
  }

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || streaming) return
    setInput('')

    const userMsg: ChatMessage = { role: 'user', content: msg, timestamp: Date.now() }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setStreaming(true)

    const placeholderTs = Date.now()
    setMessages(m => [...m, { role: 'assistant', content: '', timestamp: placeholderTs }])

    try {
      const history = getHistory()
        .filter(h => h.serviceName === analysis.serviceName)
        .map(h => ({ analyzedAt: h.analyzedAt, totalScore: h.totalScore }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
          analysis,
          history,
        }),
      })

      if (!res.ok || !res.body) throw new Error('응답 오류')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setMessages(m => m.map(msg =>
          msg.timestamp === placeholderTs ? { ...msg, content: full } : msg
        ))
      }
    } catch {
      setMessages(m => m.map(msg =>
        msg.timestamp === placeholderTs
          ? { ...msg, content: '죄송해요, 잠시 오류가 발생했어요. 다시 시도해주세요.' }
          : msg
      ))
    } finally {
      setStreaming(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  async function copyMessage(content: string, idx: number) {
    await navigator.clipboard.writeText(content)
    setCopiedId(idx)
    setTimeout(() => setCopiedId(null), 1500)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-gradient-to-r from-gray-900 to-gray-800 hover:bg-gray-800 text-white px-4 py-3 rounded-lg shadow-xl hover:shadow-2xl transition-all"
        >
          <MessageCircle size={20} />
          <span className="font-semibold text-sm">GEO AI 전문가</span>
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm sm:max-w-md flex flex-col bg-white rounded-lg shadow-2xl border border-gray-100 overflow-hidden"
          style={{ height: 'min(600px, calc(100dvh - 2rem))' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-gray-900 to-gray-800 flex-shrink-0">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🤖</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm">GEO AI 전문가</p>
              <p className="text-gray-300 text-xs truncate">{analysis.serviceName} 전담 컨설턴트</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-gray-300">온라인</span>
              <button onClick={() => setOpen(false)} className="ml-2 text-white/60 hover:text-white transition-colors p-1">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          {messages.length <= 1 && (
            <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
              <p className="text-xs text-gray-400 mb-1.5">빠른 메뉴</p>
              <div className="flex gap-1.5 flex-wrap">
                {QUICK_ACTIONS.map(action => (
                  <button
                    key={action.id}
                    onClick={() => sendMessage(action.prompt)}
                    disabled={streaming}
                    className="text-xs bg-gray-50 text-gray-800 hover:bg-gray-100 border border-gray-200 px-2.5 py-1.5 rounded-full transition-colors disabled:opacity-50"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
          >
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                    <span className="text-sm">🤖</span>
                  </div>
                )}
                <div className={cn(
                  'max-w-[82%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-gray-900 text-white rounded-br-sm'
                    : 'bg-gray-50 border border-gray-100 rounded-bl-sm text-gray-700'
                )}>
                  {msg.role === 'assistant' ? (
                    <>
                      {msg.content === '' && streaming ? (
                        <div className="flex gap-1 py-1">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      ) : (
                        <>
                          <div dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }} />
                          {msg.content && (
                            <button
                              onClick={() => copyMessage(msg.content, i)}
                              className="mt-1.5 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {copiedId === i ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
                              {copiedId === i ? '복사됨' : '복사'}
                            </button>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <span>{msg.content}</span>
                  )}
                </div>
              </div>
            ))}

            {/* Context-aware suggestions after bot reply */}
            {messages.length > 2 && !streaming && messages[messages.length - 1]?.role === 'assistant' && (
              <div className="flex flex-wrap gap-1.5 mt-1 ml-9">
                {['다음 단계는?', '예시 보여줘', '더 자세히 설명해줘'].map(s => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-xs text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-full transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom button */}
          {showScrollBtn && (
            <button
              onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="absolute bottom-20 right-4 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <ChevronDown size={14} />
            </button>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 flex-shrink-0 bg-white">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="질문하거나 콘텐츠 생성을 요청하세요..."
                rows={1}
                disabled={streaming}
                className="flex-1 resize-none border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent disabled:opacity-60 max-h-32 overflow-y-auto"
                style={{ minHeight: '42px' }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || streaming}
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all',
                  input.trim() && !streaming
                    ? 'bg-gray-900 hover:bg-gray-950 text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
              >
                {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5 text-center">Enter로 전송 · Shift+Enter로 줄바꿈</p>
          </div>
        </div>
      )}
    </>
  )
}
