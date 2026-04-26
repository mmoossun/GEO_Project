/**
 * Real AI Citation Test
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses OpenRouter to send REAL queries to ChatGPT, Claude, Gemini, Perplexity
 * and checks if the service is mentioned in the actual AI responses.
 *
 * OpenRouter docs: https://openrouter.ai/docs
 * Models: openai/gpt-4o-mini, anthropic/claude-3-5-haiku, google/gemini-flash-1.5, perplexity/sonar
 */

import OpenAI from 'openai'
import { NextRequest } from 'next/server'
import { getCategoryInfo } from '@/lib/constants'

// OpenRouter client (OpenAI-compatible API)
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY ?? 'missing',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://geo-score.vercel.app',
    'X-Title': 'GEO Score Dashboard',
  },
})

// Fallback: use OpenAI directly for ChatGPT if OpenRouter not configured
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface PlatformTestResult {
  platform: string
  platformKo: string
  model: string
  emoji: string
  color: string
  status: 'mentioned' | 'not_mentioned' | 'error' | 'skipped'
  statusKo: string
  mentionCount: number
  totalQueries: number
  mentionRate: number        // 0-100
  excerpts: string[]         // context around mention
  responses: string[]        // full responses (truncated)
  error?: string
}

export interface CitationTestResult {
  serviceName: string
  category: string
  testedAt: string
  hasOpenRouter: boolean
  platforms: PlatformTestResult[]
  overallMentionRate: number   // avg across all tested platforms
  summary: string
}

// ─── Platform configs ─────────────────────────────────────────────────────────

const PLATFORMS = [
  {
    id: 'chatgpt',
    platformKo: 'ChatGPT (GPT-4o)',
    model: 'openai/gpt-4o-mini',
    directModel: 'gpt-4o-mini',  // fallback via direct OpenAI
    emoji: '🤖',
    color: '#10A37F',
    requiresOpenRouter: false,   // can test via direct OpenAI too
  },
  {
    id: 'claude',
    platformKo: 'Claude (Haiku)',
    model: 'anthropic/claude-3-5-haiku',
    emoji: '🧠',
    color: '#CC785C',
    requiresOpenRouter: true,
  },
  {
    id: 'gemini',
    platformKo: 'Gemini Flash',
    model: 'google/gemini-flash-1.5',
    emoji: '✨',
    color: '#4285F4',
    requiresOpenRouter: true,
  },
  {
    id: 'perplexity',
    platformKo: 'Perplexity Sonar',
    model: 'perplexity/sonar',
    emoji: '🔍',
    color: '#20808D',
    requiresOpenRouter: true,
  },
] as const

// ─── Query templates ──────────────────────────────────────────────────────────

function buildPrompts(serviceName: string, categoryLabel: string): string[] {
  return [
    `${categoryLabel} 분야에서 알아두면 좋은 서비스나 플랫폼을 추천해줘. 한국 서비스 위주로 알려줘.`,
    `한국의 ${categoryLabel} 서비스 중 많이 사용되거나 알려진 것들을 나열해줘.`,
    `"${serviceName}"이라는 서비스에 대해 알고 있어? 간단히 설명해줘.`,
    `${categoryLabel} 시장에서 ${serviceName} 같은 서비스들을 추천해줘.`,
  ]
}

function checkMention(text: string, serviceName: string): { found: boolean; excerpt: string } {
  const lower = text.toLowerCase()
  const nameL = serviceName.toLowerCase()
  const found = lower.includes(nameL)
  if (!found) return { found: false, excerpt: '' }
  const idx = lower.indexOf(nameL)
  const start = Math.max(0, idx - 80)
  const end = Math.min(text.length, idx + serviceName.length + 120)
  return { found: true, excerpt: '...' + text.slice(start, end).trim() + '...' }
}

// ─── Test one platform ────────────────────────────────────────────────────────

async function testPlatform(
  platform: typeof PLATFORMS[number],
  prompts: string[],
  serviceName: string,
  hasOpenRouter: boolean
): Promise<PlatformTestResult> {
  const base: Omit<PlatformTestResult, 'status' | 'statusKo' | 'mentionCount' | 'totalQueries' | 'mentionRate' | 'excerpts' | 'responses' | 'error'> = {
    platform: platform.id,
    platformKo: platform.platformKo,
    model: platform.model,
    emoji: platform.emoji,
    color: platform.color,
  }

  // Skip if OpenRouter required but not configured
  if (platform.requiresOpenRouter && !hasOpenRouter) {
    return { ...base, status: 'skipped', statusKo: 'OpenRouter 키 미설정', mentionCount: 0, totalQueries: 0, mentionRate: 0, excerpts: [], responses: [] }
  }

  try {
    let mentionCount = 0
    const excerpts: string[] = []
    const responses: string[] = []

    // Run prompts in parallel
    const results = await Promise.allSettled(prompts.map(async (prompt) => {
      // Use OpenRouter for all platforms; direct OpenAI for ChatGPT fallback
      const client = hasOpenRouter ? openrouter : openai
      const modelId = hasOpenRouter ? platform.model : (platform as { directModel?: string }).directModel ?? platform.model

      const res = await client.chat.completions.create({
        model: modelId,
        max_tokens: 600,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: '당신은 도움이 되는 AI 어시스턴트입니다. 솔직하게 알고 있는 정보만 답변해주세요.',
          },
          { role: 'user', content: prompt },
        ],
      })

      return res.choices[0]?.message?.content ?? ''
    }))

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const text = result.value
        responses.push(text.slice(0, 300))
        const { found, excerpt } = checkMention(text, serviceName)
        if (found) {
          mentionCount++
          if (excerpt) excerpts.push(excerpt)
        }
      }
    }

    const mentionRate = Math.round((mentionCount / prompts.length) * 100)
    const status = mentionCount > 0 ? 'mentioned' : 'not_mentioned'

    return {
      ...base,
      status,
      statusKo: mentionCount > 0 ? `${mentionCount}/${prompts.length}회 언급됨` : '언급되지 않음',
      mentionCount,
      totalQueries: prompts.length,
      mentionRate,
      excerpts,
      responses,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '알 수 없는 오류'
    return {
      ...base,
      status: 'error',
      statusKo: `오류: ${msg.slice(0, 80)}`,
      mentionCount: 0,
      totalQueries: prompts.length,
      mentionRate: 0,
      excerpts: [],
      responses: [],
      error: msg,
    }
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))

      try {
        const { serviceName, category } = await req.json() as { serviceName: string; category: string }
        const catInfo = getCategoryInfo(category)
        const hasOpenRouter = !!(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'your_openrouter_key_here')
        const prompts = buildPrompts(serviceName, catInfo.label)

        send({ type: 'start', message: `${hasOpenRouter ? '4개' : '1개'} AI 플랫폼 실측 테스트 시작...`, hasOpenRouter })

        // Test all platforms in parallel
        const platformResults = await Promise.all(
          PLATFORMS.map(async (platform) => {
            send({ type: 'testing', platform: platform.id, platformKo: platform.platformKo })
            const result = await testPlatform(platform, prompts, serviceName, hasOpenRouter)
            send({ type: 'result', platform: platform.id, result })
            return result
          })
        )

        const tested = platformResults.filter(p => p.status !== 'skipped')
        const mentioned = tested.filter(p => p.status === 'mentioned')
        const overallMentionRate = tested.length > 0
          ? Math.round(mentioned.length / tested.length * 100)
          : 0

        const summaryLines = []
        if (mentioned.length > 0) {
          summaryLines.push(`${mentioned.map(p => p.platformKo).join(', ')}에서 "${serviceName}"이 언급되었습니다.`)
        } else {
          summaryLines.push(`테스트된 AI 플랫폼 중 "${serviceName}"을 직접 언급한 곳이 없습니다.`)
        }
        if (!hasOpenRouter) {
          summaryLines.push('OpenRouter API 키를 설정하면 Claude, Gemini, Perplexity도 실측할 수 있습니다.')
        }

        const finalResult: CitationTestResult = {
          serviceName,
          category: catInfo.label,
          testedAt: new Date().toISOString(),
          hasOpenRouter,
          platforms: platformResults,
          overallMentionRate,
          summary: summaryLines.join(' '),
        }

        send({ type: 'complete', result: finalResult })
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : '테스트 오류' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
