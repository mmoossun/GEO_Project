/**
 * Real AI Citation Test — Service-Aware Version
 * ─────────────────────────────────────────────────────────────────────────────
 * Flow:
 *   1. Analyze the service (fetch URL or infer by name/category)
 *   2. Extract: features, value props, target audience, key use cases
 *   3. Generate 5 targeted questions where this service is the natural answer
 *   4. Send those questions to ChatGPT, Claude, Gemini, Perplexity via OpenRouter
 *   5. Check each response for the service name
 *
 * This produces far more meaningful results than generic category questions.
 */

import OpenAI from 'openai'
import { NextRequest } from 'next/server'
import { getCategoryInfo } from '@/lib/constants'

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY ?? 'missing',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: { 'HTTP-Referer': 'https://geo-score.vercel.app', 'X-Title': 'GEO Score' },
})
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ServiceIntelligence {
  name: string
  category: string
  coreFeatures: string[]       // 핵심 기능들
  targetAudience: string       // 주요 사용자층
  keyValueProps: string[]      // 핵심 가치 제안
  useCases: string[]           // 주요 사용 케이스
  competitors: string[]        // 경쟁 서비스
  sourceType: 'url_crawl' | 'ai_inference'
  summary: string
}

export interface GeneratedQuestion {
  question: string
  type: 'direct' | 'feature' | 'problem_solving' | 'comparison' | 'category'
  typeKo: string
  rationale: string            // 왜 이 질문인지
}

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
  mentionRate: number
  excerpts: string[]
  responses: Array<{ question: string; response: string; mentioned: boolean }>
  error?: string
}

export interface CitationTestResult {
  serviceName: string
  category: string
  testedAt: string
  hasOpenRouter: boolean
  serviceIntelligence: ServiceIntelligence
  generatedQuestions: GeneratedQuestion[]
  platforms: PlatformTestResult[]
  overallMentionRate: number
  summary: string
}

// ─── Platform configs ─────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'chatgpt',    platformKo: 'ChatGPT',   model: 'openai/gpt-4o-mini',            directModel: 'gpt-4o-mini', emoji: '🤖', color: '#10A37F', requiresOR: false },
  { id: 'claude',     platformKo: 'Claude',     model: 'anthropic/claude-3-5-haiku',    emoji: '🧠', color: '#CC785C', requiresOR: true },
  { id: 'gemini',     platformKo: 'Gemini',     model: 'google/gemini-flash-1.5',       emoji: '✨', color: '#4285F4', requiresOR: true },
  { id: 'perplexity', platformKo: 'Perplexity', model: 'perplexity/sonar',              emoji: '🔍', color: '#20808D', requiresOR: true },
] as const

// ─── Step 1: Analyze service ──────────────────────────────────────────────────

async function analyzeService(
  serviceName: string,
  category: string,
  url?: string
): Promise<ServiceIntelligence> {
  const catInfo = getCategoryInfo(category)
  let htmlContext = ''
  let sourceType: ServiceIntelligence['sourceType'] = 'ai_inference'

  // Try fetching URL for real content analysis
  if (url?.startsWith('http')) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 GEOScoreBot/1.0', Accept: 'text/html' },
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) {
        const html = await res.text()
        // Extract meaningful text content
        const text = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 5000)

        const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? ''
        const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1] ?? ''

        htmlContext = `실제 웹사이트 내용:
페이지 제목: ${title}
메타 설명: ${metaDesc}
본문 텍스트(첫 5000자):
${text}`
        sourceType = 'url_crawl'
      }
    } catch {
      // Fall through to AI inference
    }
  }

  // Use GPT-4o to extract structured service intelligence
  const prompt = sourceType === 'url_crawl'
    ? `다음 웹사이트 내용을 분석해서 "${serviceName}" 서비스의 핵심 정보를 추출해주세요.

${htmlContext}`
    : `"${serviceName}"(${catInfo.label} 카테고리)에 대해 알고 있는 정보를 바탕으로 서비스 분석을 해주세요.
실제 알고 있는 정보만 사용하고, 모르는 부분은 카테고리 특성을 기반으로 합리적으로 추론해주세요.`

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1000,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [{
      role: 'user',
      content: `${prompt}

아래 JSON 형식으로만 반환해주세요:
{
  "coreFeatures": ["핵심 기능 1", "핵심 기능 2", "핵심 기능 3", "핵심 기능 4"],
  "targetAudience": "주요 사용자층 설명 (1-2문장)",
  "keyValueProps": ["핵심 가치 1", "핵심 가치 2", "핵심 가치 3"],
  "useCases": ["사용 케이스 1", "사용 케이스 2", "사용 케이스 3"],
  "competitors": ["경쟁 서비스 1", "경쟁 서비스 2", "경쟁 서비스 3"],
  "summary": "${serviceName}에 대한 2-3문장 요약"
}`,
    }],
  })

  const parsed = JSON.parse(res.choices[0]?.message?.content ?? '{}')
  return {
    name: serviceName,
    category: catInfo.label,
    coreFeatures: parsed.coreFeatures ?? [],
    targetAudience: parsed.targetAudience ?? '',
    keyValueProps: parsed.keyValueProps ?? [],
    useCases: parsed.useCases ?? [],
    competitors: parsed.competitors ?? [],
    sourceType,
    summary: parsed.summary ?? '',
  }
}

// ─── Step 2: Generate targeted questions ─────────────────────────────────────

async function generateQuestions(
  serviceName: string,
  catLabel: string,
  intel: ServiceIntelligence
): Promise<GeneratedQuestion[]> {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1200,
    temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [{
      role: 'user',
      content: `"${serviceName}"(${catLabel}) 서비스에 대한 AI 검색 인용 테스트용 질문 5개를 생성해주세요.

서비스 분석 결과:
- 핵심 기능: ${intel.coreFeatures.join(', ')}
- 주요 사용자: ${intel.targetAudience}
- 핵심 가치: ${intel.keyValueProps.join(', ')}
- 주요 사용 케이스: ${intel.useCases.join(', ')}
- 경쟁 서비스: ${intel.competitors.join(', ')}

질문 생성 조건:
1. **직접 질문** (1개): "${serviceName}"을 직접 묻는 질문
   예: "${serviceName}이 어떤 서비스인지 알려줘"
2. **기능 특화 질문** (1개): 이 서비스의 핵심 기능이 답인 질문
   예: "${intel.coreFeatures[0] ?? '핵심기능'}을 쉽게 할 수 있는 앱 추천해줘"
3. **문제 해결 질문** (1개): 사용자가 가진 문제가 이 서비스로 해결되는 질문
   예: "${intel.useCases[0] ?? '주요용도'}하려면 어떤 서비스가 좋아?"
4. **카테고리 추천 질문** (1개): 이 서비스가 자연스럽게 추천될 카테고리 질문
   예: "한국에서 ${catLabel} 서비스 중 많이 쓰는 거 알려줘"
5. **비교/심화 질문** (1개): ${intel.competitors[0] ?? '경쟁사'}와 비교하거나 심층적인 질문
   예: "${intel.competitors[0] ?? '경쟁사'} 말고 ${catLabel} 앱 뭐가 좋아?"

각 질문은:
- 실제 사람이 AI에게 물어볼 법한 자연스러운 한국어
- "${serviceName}"이 정답이 되거나 언급될 가능성이 높은 질문
- 다양한 각도에서 접근

JSON만 반환:
{
  "questions": [
    {
      "question": "실제 질문 텍스트",
      "type": "direct|feature|problem_solving|category|comparison",
      "typeKo": "직접질문|기능특화|문제해결|카테고리|비교심화",
      "rationale": "${serviceName}이 이 질문에 답으로 나올 가능성이 높은 이유 (1문장)"
    }
  ]
}`,
    }],
  })

  const parsed = JSON.parse(res.choices[0]?.message?.content ?? '{"questions":[]}')
  return parsed.questions ?? []
}

// ─── Step 3: Test one platform ────────────────────────────────────────────────

function checkMention(text: string, name: string): { found: boolean; excerpt: string } {
  const lower = text.toLowerCase()
  const nameL = name.toLowerCase()
  const found = lower.includes(nameL)
  if (!found) return { found: false, excerpt: '' }
  const idx = lower.indexOf(nameL)
  return {
    found: true,
    excerpt: '...' + text.slice(Math.max(0, idx - 70), idx + name.length + 130).trim() + '...',
  }
}

async function testPlatform(
  platform: typeof PLATFORMS[number],
  questions: GeneratedQuestion[],
  serviceName: string,
  hasOR: boolean
): Promise<PlatformTestResult> {
  const base = { platform: platform.id, platformKo: platform.platformKo, model: platform.model, emoji: platform.emoji, color: platform.color }

  if (platform.requiresOR && !hasOR) {
    return { ...base, status: 'skipped', statusKo: 'OpenRouter 키 미설정', mentionCount: 0, totalQueries: 0, mentionRate: 0, excerpts: [], responses: [] }
  }

  try {
    let mc = 0
    const excerpts: string[] = []
    const responses: PlatformTestResult['responses'] = []

    const results = await Promise.allSettled(
      questions.map(async (q) => {
        const client = hasOR ? openrouter : openai
        const modelId = hasOR ? platform.model : (platform as { directModel?: string }).directModel ?? platform.model

        const res = await client.chat.completions.create({
          model: modelId,
          max_tokens: 700,
          temperature: 0.3,
          messages: [
            { role: 'system', content: '당신은 도움이 되는 AI 어시스턴트입니다. 솔직하게 알고 있는 정보만 답변해주세요. 한국어로 답변해주세요.' },
            { role: 'user', content: q.question },
          ],
        })
        return { question: q.question, text: res.choices[0]?.message?.content ?? '' }
      })
    )

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { question, text } = result.value
        const { found, excerpt } = checkMention(text, serviceName)
        responses.push({ question, response: text.slice(0, 400), mentioned: found })
        if (found) { mc++; if (excerpt) excerpts.push(excerpt) }
      }
    }

    const mr = Math.round((mc / questions.length) * 100)
    return {
      ...base,
      status: mc > 0 ? 'mentioned' : 'not_mentioned',
      statusKo: mc > 0 ? `${mc}/${questions.length}개 질문에서 언급` : '어떤 질문에서도 미언급',
      mentionCount: mc, totalQueries: questions.length, mentionRate: mr, excerpts, responses,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message.slice(0, 100) : '오류'
    return { ...base, status: 'error', statusKo: `오류: ${msg}`, mentionCount: 0, totalQueries: questions.length, mentionRate: 0, excerpts: [], responses: [], error: msg }
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
        const { serviceName, category, url } = await req.json() as { serviceName: string; category: string; url?: string }
        const catInfo = getCategoryInfo(category)
        const hasOR = !!(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'your_openrouter_key_here')

        // ── Step 1: Analyze service ───────────────────────────────────────────
        send({ type: 'step', step: 1, message: url ? `${url} 페이지 분석 중...` : `"${serviceName}" 서비스 특성 파악 중...` })
        const intel = await analyzeService(serviceName, category, url)
        send({
          type: 'service_analyzed',
          message: `서비스 분석 완료 (${intel.sourceType === 'url_crawl' ? 'URL 크롤링' : 'AI 추론'})`,
          intelligence: intel,
        })

        // ── Step 2: Generate targeted questions ───────────────────────────────
        send({ type: 'step', step: 2, message: '맞춤 질문 생성 중...' })
        const questions = await generateQuestions(serviceName, catInfo.label, intel)
        send({
          type: 'questions_generated',
          message: `${questions.length}개 맞춤 질문 생성 완료`,
          questions,
        })

        // ── Step 3: Test all platforms in parallel ────────────────────────────
        send({ type: 'step', step: 3, message: `${hasOR ? '4개' : '1개'} AI 플랫폼 실측 테스트 시작...` })

        const platformResults = await Promise.all(
          PLATFORMS.map(async (platform) => {
            send({ type: 'testing', platform: platform.id, platformKo: platform.platformKo, emoji: platform.emoji })
            const result = await testPlatform(platform, questions, serviceName, hasOR)
            send({ type: 'result', platform: platform.id, result })
            return result
          })
        )

        const tested = platformResults.filter(p => p.status !== 'skipped')
        const mentioned = platformResults.filter(p => p.status === 'mentioned')
        const overallMentionRate = tested.length > 0
          ? Math.round(mentioned.reduce((s, p) => s + p.mentionRate, 0) / tested.length)
          : 0

        // Build summary
        const summaryLines: string[] = []
        if (mentioned.length > 0) {
          summaryLines.push(`${mentioned.map(p => p.platformKo).join(', ')}에서 "${serviceName}"이 언급되었습니다. (${overallMentionRate}% 인용율)`)
        } else {
          summaryLines.push(`테스트한 ${tested.length}개 AI 플랫폼 어디에서도 "${serviceName}"이 직접 언급되지 않았습니다.`)
        }
        if (intel.sourceType === 'url_crawl') {
          summaryLines.push(`실제 웹사이트 크롤링 기반 맞춤 질문 ${questions.length}개로 테스트했습니다.`)
        } else {
          summaryLines.push(`AI 추론 기반 맞춤 질문 ${questions.length}개로 테스트했습니다.`)
        }

        const finalResult: CitationTestResult = {
          serviceName,
          category: catInfo.label,
          testedAt: new Date().toISOString(),
          hasOpenRouter: hasOR,
          serviceIntelligence: intel,
          generatedQuestions: questions,
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
