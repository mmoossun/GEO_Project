/**
 * Combined Analysis Pipeline
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs GEO score analysis + AI citation test in PARALLEL, then cross-validates
 * both to produce a unified insight that's more accurate than either alone.
 *
 * Logic:
 *  - GEO Readiness Score (내부 신호): Content structure, E-E-A-T, Technical, Freshness, Readability
 *  - AI Citation Score (외부 신호): Actual mentions in ChatGPT, Claude, Gemini, Perplexity
 *  - Combined Score: Weighted (GEO 55% + Citation 45%)
 *  - Gap Analysis: Where the two scores diverge reveals the real opportunity
 */

import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { getGrade, getVisibilityLevel } from '@/lib/utils'
import { getCategoryInfo } from '@/lib/constants'
import type { GEOAnalysisResult } from '@/lib/types'
import type { CitationTestResult, PlatformTestResult } from '../citation-test/route'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY ?? 'missing',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: { 'HTTP-Referer': 'https://geo-score.vercel.app', 'X-Title': 'GEO Score' },
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type GapType = 'leader' | 'ready_not_cited' | 'cited_not_ready' | 'needs_work'

export interface CombinedMetrics {
  unifiedScore: number          // weighted combined score
  geoReadinessScore: number     // from content/technical signals
  citationRate: number          // actual mention rate 0-100
  gap: GapType
  gapLabel: string
  gapEmoji: string
  gapInsight: string            // what this gap means
  gapAction: string             // what to do about it
  correlationNote: string       // how the two scores relate
  strengthsFromReal: string[]   // confirmed by citation test
  weaknessesFromReal: string[]  // revealed by citation test
  unifiedRecommendations: Array<{
    priority: 'critical' | 'high' | 'medium'
    source: 'geo' | 'citation' | 'combined'
    title: string
    description: string
    expectedImpact: string
  }>
}

// ─── Response Share Types ─────────────────────────────────────────────────────

/**
 * 질문 유형별 가중치 (GEO 연구 기반)
 * category > problem_solving > comparison > feature > direct
 *
 * 근거:
 * - category (카테고리 추천): AI가 경쟁사 중 선택 → 가장 경쟁적, 희소성 높음
 * - problem_solving (문제 해결): 자연스러운 언급, 높은 구매 의향 신호
 * - comparison (비교): 브랜드 인지도 확인, 경쟁 인식 신호
 * - feature (기능 질문): 제품 이해도, 상대적으로 예측 가능
 * - direct (직접 질문): 당연히 나와야 함, 경쟁 가치 낮음
 */
export const QUESTION_TYPE_WEIGHTS: Record<string, { weight: number; typeKo: string; interpretation: string }> = {
  category:        { weight: 2.5, typeKo: '카테고리 추천',   interpretation: 'AI가 경쟁 서비스 중 선택 — 가장 가치 높은 언급' },
  problem_solving: { weight: 2.0, typeKo: '문제 해결',       interpretation: '실제 사용자 문제에서 자연스럽게 언급 — 높은 의도 신호' },
  comparison:      { weight: 1.5, typeKo: '비교/경쟁',       interpretation: '경쟁사와 함께 인식됨 — 브랜드 포지셔닝 확인' },
  feature:         { weight: 1.0, typeKo: '기능 특화',       interpretation: 'AI가 제품 기능을 인지하고 있음' },
  direct:          { weight: 0.5, typeKo: '직접 브랜드 질문', interpretation: '직접 질문에서 언급 — 기본 인지도 수준' },
}

export interface ResponseShareByType {
  type: string
  typeKo: string
  weight: number
  shareRate: number      // 0-100
  mentionCount: number
  total: number
  interpretation: string
}

export interface ResponseShare {
  rawShareRate: number           // 단순 언급수/총응답수 × 100
  weightedShareRate: number      // 가중 점유율 (질문 유형 중요도 반영)
  totalResponses: number         // 전체 테스트 응답 수
  totalMentions: number          // 전체 언급 횟수
  byPlatform: Array<{
    platform: string; platformKo: string; emoji: string; color: string
    shareRate: number; mentionCount: number; totalQueries: number; status: string
  }>
  byQuestionType: ResponseShareByType[]
  benchmarkLevel: 'top_tier' | 'strong' | 'moderate' | 'weak' | 'absent'
  benchmarkLabel: string
  benchmarkColor: string
  insight: string
}

export interface CombinedAnalysisResult {
  serviceName: string
  category: string
  analyzedAt: string
  geoAnalysis: GEOAnalysisResult & { analysisMode: 'real_url' | 'estimation' }
  citationTest: CitationTestResult
  combined: CombinedMetrics
  responseShare: ResponseShare
}

// ─── Gap analysis logic ───────────────────────────────────────────────────────

function computeGap(geoScore: number, citationRate: number): Omit<CombinedMetrics, 'unifiedScore' | 'geoReadinessScore' | 'citationRate' | 'strengthsFromReal' | 'weaknessesFromReal' | 'unifiedRecommendations' | 'correlationNote'> {
  const isGeoHigh = geoScore >= 62
  const isCitationHigh = citationRate >= 40

  if (isGeoHigh && isCitationHigh) {
    return {
      gap: 'leader',
      gapLabel: 'AI 가시성 리더',
      gapEmoji: '🏆',
      gapInsight: 'GEO 기술 준비도와 실제 AI 인용율이 모두 높습니다. 현재 전략이 효과적으로 작동하고 있습니다.',
      gapAction: '선두 지위 유지: 경쟁사 동향 모니터링과 콘텐츠 지속 업데이트에 집중하세요.',
    }
  }
  if (isGeoHigh && !isCitationHigh) {
    return {
      gap: 'ready_not_cited',
      gapLabel: '미발견의 보석',
      gapEmoji: '💎',
      gapInsight: 'GEO 기술 신호는 우수하지만 AI 검색엔진이 아직 이 서비스를 충분히 인식하지 못합니다. 콘텐츠는 준비됐지만 AI 학습 데이터에 덜 노출됐을 가능성이 높습니다.',
      gapAction: '브랜드 인지도 확산 전략: 외부 미디어 노출, 업계 논평 참여, AI가 자주 인용하는 사이트(Forbes, TechCrunch 등)에 언급 확보가 핵심입니다.',
    }
  }
  if (!isGeoHigh && isCitationHigh) {
    return {
      gap: 'cited_not_ready',
      gapLabel: '브랜드 의존',
      gapEmoji: '⚠️',
      gapInsight: 'AI 검색엔진들이 이 서비스를 알고 있지만, 정작 콘텐츠 구조와 기술 신호가 약합니다. 기존 브랜드 인지도에 의존하고 있어 장기적으로 경쟁에서 뒤처질 위험이 있습니다.',
      gapAction: '콘텐츠 품질 집중 강화: 스키마 마크업, FAQ, 구조화된 콘텐츠를 빠르게 보완해 기존 인지도를 지속 가능한 GEO 점수로 전환하세요.',
    }
  }
  return {
    gap: 'needs_work',
    gapLabel: '전면 개선 필요',
    gapEmoji: '🔴',
    gapInsight: 'GEO 기술 준비도와 AI 실측 인용율 모두 개선이 필요합니다. 콘텐츠 전략을 전면 재구축할 기회이기도 합니다.',
    gapAction: '기초부터 재설계: 스키마 마크업, 답변 캡슐, FAQ 섹션을 먼저 구축하고, 이후 외부 인지도 확산 전략을 병행하세요.',
  }
}

function buildUnifiedRecommendations(
  geo: GEOAnalysisResult,
  citation: CitationTestResult,
  gap: GapType
): CombinedMetrics['unifiedRecommendations'] {
  const recs: CombinedMetrics['unifiedRecommendations'] = []

  // From citation test: if not mentioned anywhere
  const notMentioned = citation.platforms.filter(p => p.status === 'not_mentioned')
  if (notMentioned.length > 0) {
    recs.push({
      priority: 'critical',
      source: 'citation',
      title: `${notMentioned.map(p => p.platformKo).join(', ')} AI 인용 확보`,
      description: `실측 결과 ${notMentioned.length}개 플랫폼에서 "${geo.serviceName}"이 언급되지 않았습니다. AI 인용의 핵심은 권위 있는 외부 사이트에서의 언급입니다.`,
      expectedImpact: '실측 인용율 +30-50%',
    })
  }

  // Gap-specific recommendations
  if (gap === 'ready_not_cited') {
    recs.push({
      priority: 'high',
      source: 'combined',
      title: 'AI 학습 데이터 노출 확대',
      description: '기술적 GEO 신호는 우수하지만 AI 인용이 낮습니다. 업계 뉴스레터, 기술 블로그, 위키피디아 언급 등 AI 학습 데이터에 포함될 가능성이 높은 채널에 집중하세요.',
      expectedImpact: '인용율 +20-40%p',
    })
  }
  if (gap === 'cited_not_ready') {
    recs.push({
      priority: 'critical',
      source: 'combined',
      title: '기존 인지도를 GEO 자산으로 전환',
      description: 'AI가 이미 알고 있는 브랜드입니다. 스키마 마크업, FAQ 섹션, Answer Capsule을 즉시 추가해 AI가 콘텐츠를 더 잘 인용할 수 있도록 준비하세요.',
      expectedImpact: 'GEO 점수 +15-25점',
    })
  }

  // From GEO analysis: top recommendations
  const geoRecs = geo.recommendations ?? []
  for (const rec of geoRecs.slice(0, 3)) {
    recs.push({
      priority: rec.priority,
      source: 'geo',
      title: rec.title,
      description: rec.description,
      expectedImpact: rec.expectedImpact,
    })
  }

  // Deduplicate and sort
  return recs
    .filter((r, i, arr) => arr.findIndex(x => x.title === r.title) === i)
    .sort((a, b) => {
      const p = { critical: 0, high: 1, medium: 2 }
      return p[a.priority] - p[b.priority]
    })
    .slice(0, 5)
}

// ─── GEO Analysis (reused logic from /api/analyze) ───────────────────────────

function stripTags(html: string) { return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }
function getMeta(html: string, name: string) {
  return html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)`, 'i'))?.[1] ?? ''
}

async function runGEOAnalysis(serviceName: string, category: string, url?: string): Promise<GEOAnalysisResult & { analysisMode: 'real_url' | 'estimation' }> {
  const catInfo = getCategoryInfo(category)
  let analysisMode: 'real_url' | 'estimation' = 'estimation'
  let pageContext = ''

  if (url?.startsWith('http')) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 GEOScoreBot/1.0' }, signal: AbortSignal.timeout(9000) })
      if (r.ok) {
        const html = await r.text()
        const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? ''
        const metaDesc = getMeta(html, 'description')
        const h1s = (html.match(/<h1[\s>]/gi) ?? []).length
        const h2s = (html.match(/<h2[\s>]/gi) ?? []).length
        const schemas = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
          .map(m => { try { return JSON.parse(m[1])?.['@type'] } catch { return null } }).filter(Boolean)
        const hasFAQ = /FAQ|자주\s*묻는|details|accordion/i.test(html)
        const imgCount = (html.match(/<img[\s>]/gi) ?? []).length
        const imgsAlt = (html.match(/<img[^>]+alt=["'][^"']+["']/gi) ?? []).length
        const wc = stripTags(html.replace(/<script[\s\S]*?<\/script>/gi, '')).split(/\s+/).filter(w => w.length > 1).length
        const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html)
        analysisMode = 'real_url'
        pageContext = `REAL PAGE DATA from ${url}:
Title: "${title}" | Meta desc: "${metaDesc || 'MISSING'}"
H1: ${h1s} | H2: ${h2s} | Schema: ${schemas.join(', ') || 'NONE (critical)'} | FAQ: ${hasFAQ}
Images: ${imgCount} total, ${imgsAlt} with alt | Words: ~${wc} | Viewport: ${hasViewport}`
      }
    } catch { /* fallback to estimation */ }
  }

  if (analysisMode === 'estimation') {
    pageContext = `No URL. Estimate based on known characteristics of "${serviceName}" in ${catInfo.label} category. Vary score meaningfully (do not regress to ${catInfo.avgScore}).`
  }

  const SCHEMA = `{"totalScore":<int>,"dimensions":[{"id":"structure","nameKo":"콘텐츠 구조","score":<0-20>,"maxScore":20,"observations":["<Korean>","<Korean>","<Korean>"],"improvements":["<Korean>","<Korean>"]},{"id":"eeat","nameKo":"E-E-A-T 신뢰성","score":<0-25>,"maxScore":25,"observations":["<Korean>","<Korean>","<Korean>"],"improvements":["<Korean>","<Korean>"]},{"id":"technical","nameKo":"기술 신호","score":<0-20>,"maxScore":20,"observations":["<Korean>","<Korean>","<Korean>"],"improvements":["<Korean>","<Korean>"]},{"id":"freshness","nameKo":"최신성","score":<0-15>,"maxScore":15,"observations":["<Korean>","<Korean>"],"improvements":["<Korean>","<Korean>"]},{"id":"readability","nameKo":"가독성","score":<0-20>,"maxScore":20,"observations":["<Korean>","<Korean>","<Korean>"],"improvements":["<Korean>","<Korean>"]}],"summary":"<Korean 2-3 sentences>","topIssues":["<Korean>","<Korean>","<Korean>"],"recommendations":[{"priority":"critical","title":"<Korean>","description":"<Korean>","expectedImpact":"<+Xpt>","effort":"low|medium|high"},{"priority":"high","title":"<Korean>","description":"<Korean>","expectedImpact":"<+Xpt>","effort":"low|medium|high"},{"priority":"high","title":"<Korean>","description":"<Korean>","expectedImpact":"<+Xpt>","effort":"low|medium|high"},{"priority":"medium","title":"<Korean>","description":"<Korean>","expectedImpact":"<+Xpt>","effort":"medium|high"}],"citationProbability":<int>,"competitiveInsight":"<Korean>","quickWins":["<Korean>","<Korean>","<Korean>"]}`

  const res = await openai.chat.completions.create({
    model: 'gpt-4o', max_tokens: 3000, temperature: analysisMode === 'real_url' ? 0.2 : 0.4,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: `GEO analyst. Score ${serviceName} based on ${pageContext}. Return JSON: ${SCHEMA}` },
      { role: 'user', content: `Analyze "${serviceName}" (${catInfo.label}) for GEO. ${pageContext}` },
    ],
  })

  const parsed = JSON.parse(res.choices[0]?.message?.content ?? '{}')
  const totalScore = parsed.totalScore ?? (parsed.dimensions ?? []).reduce((s: number, d: { score: number }) => s + d.score, 0) ?? 50
  const grade = getGrade(totalScore)

  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    serviceName: serviceName.trim(), category, categoryLabel: catInfo.label,
    url: url?.trim() || undefined, totalScore, grade,
    gradeLabel: { S: 'AI 최적화 최상급', A: 'AI 노출 우수', B: 'AI 노출 양호', C: 'AI 노출 보통', D: 'AI 노출 미흡', F: 'AI 노출 불량' }[grade],
    dimensions: parsed.dimensions ?? [], summary: parsed.summary ?? '',
    topIssues: parsed.topIssues ?? [],
    recommendations: (parsed.recommendations ?? []).slice(0, 4),
    industryAverage: catInfo.avgScore, topPerformerScore: catInfo.topScore,
    citationProbability: parsed.citationProbability ?? Math.round(totalScore * 0.9),
    aiVisibilityLevel: getVisibilityLevel(totalScore),
    competitiveInsight: parsed.competitiveInsight ?? '', quickWins: parsed.quickWins ?? [],
    analyzedAt: new Date().toISOString(), analysisMode,
  }
}

// ─── Citation Test (reused logic) ─────────────────────────────────────────────

const PLATFORMS_CONFIG = [
  { id: 'chatgpt', platformKo: 'ChatGPT', model: 'openai/gpt-4o-mini', directModel: 'gpt-4o-mini', emoji: '🤖', color: '#10A37F', requiresOR: false },
  { id: 'claude', platformKo: 'Claude', model: 'anthropic/claude-3-5-haiku', emoji: '🧠', color: '#CC785C', requiresOR: true },
  { id: 'gemini', platformKo: 'Gemini', model: 'google/gemini-flash-1.5', emoji: '✨', color: '#4285F4', requiresOR: true },
  { id: 'perplexity', platformKo: 'Perplexity', model: 'perplexity/sonar', emoji: '🔍', color: '#20808D', requiresOR: true },
] as const

function checkMention(text: string, name: string) {
  const found = text.toLowerCase().includes(name.toLowerCase())
  if (!found) return { found: false, excerpt: '' }
  const idx = text.toLowerCase().indexOf(name.toLowerCase())
  return { found: true, excerpt: '...' + text.slice(Math.max(0, idx - 60), idx + name.length + 100).trim() + '...' }
}

// ── Service analysis helper (same logic as citation-test route) ───────────────
async function analyzeServiceForCombined(serviceName: string, category: string, url?: string) {
  const catInfo = getCategoryInfo(category)
  let htmlContext = ''
  let sourceType: 'url_crawl' | 'ai_inference' = 'ai_inference'

  if (url?.startsWith('http')) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 GEOScoreBot/1.0' }, signal: AbortSignal.timeout(7000) })
      if (r.ok) {
        const html = await r.text()
        const text = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000)
        htmlContext = `웹사이트 내용: ${text}`
        sourceType = 'url_crawl'
      }
    } catch { /* fallback */ }
  }

  const prompt = sourceType === 'url_crawl'
    ? `다음 웹사이트 내용을 분석해서 "${serviceName}" 서비스 정보를 추출해주세요.\n${htmlContext}`
    : `"${serviceName}"(${catInfo.label}) 서비스를 알고 있는 정보로 분석해주세요.`

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini', max_tokens: 600, temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: `${prompt}\nJSON: {"features":["기능1","기능2","기능3"],"useCases":["케이스1","케이스2","케이스3"],"audience":"주요사용자","competitors":["경쟁1","경쟁2"]}` }],
  })
  const p = JSON.parse(res.choices[0]?.message?.content ?? '{}')
  return { features: p.features ?? [], useCases: p.useCases ?? [], audience: p.audience ?? '', competitors: p.competitors ?? [], sourceType }
}

interface TypedQuestion { question: string; type: string; typeKo: string }

async function generateQuestionsForCombined(serviceName: string, catLabel: string, intel: { features: string[]; useCases: string[]; competitors: string[] }): Promise<TypedQuestion[]> {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini', max_tokens: 800, temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: `"${serviceName}"(${catLabel}) 서비스가 답이 될 가능성이 높은 한국어 질문 5개를 유형별로 생성해주세요.
핵심기능: ${intel.features.slice(0, 3).join(', ')}
사용케이스: ${intel.useCases.slice(0, 3).join(', ')}
경쟁사: ${intel.competitors.slice(0, 2).join(', ')}

질문 유형 (반드시 각 1개씩):
- direct: "${serviceName}이 뭐야?" 형태 직접 브랜드 질문
- feature: 특정 기능 관련 질문
- problem_solving: 사용자 문제 해결 질문 (서비스명 언급 없이)
- category: "${catLabel} 추천 서비스" 카테고리 추천 질문
- comparison: "${serviceName}과 경쟁사 비교" 질문

JSON: {"questions":[{"question":"질문1","type":"direct","typeKo":"직접 브랜드 질문"},{"question":"질문2","type":"feature","typeKo":"기능 특화"},{"question":"질문3","type":"problem_solving","typeKo":"문제 해결"},{"question":"질문4","type":"category","typeKo":"카테고리 추천"},{"question":"질문5","type":"comparison","typeKo":"비교/경쟁"}]}` }],
  })
  const parsed = JSON.parse(res.choices[0]?.message?.content ?? '{"questions":[]}')
  return (parsed.questions ?? []).filter((q: TypedQuestion) => q.question && q.type)
}

async function runCitationTest(serviceName: string, category: string, url?: string): Promise<CitationTestResult> {
  const catInfo = getCategoryInfo(category)
  const hasOR = !!(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'your_openrouter_key_here')

  // Analyze service first, then generate typed questions
  const intel = await analyzeServiceForCombined(serviceName, category, url)
  const typedQuestions = await generateQuestionsForCombined(serviceName, catInfo.label, intel)

  // Fallback typed questions if generation failed
  const questions: TypedQuestion[] = typedQuestions.length >= 3 ? typedQuestions : [
    { question: `${catInfo.label} 분야 추천 서비스 알려줘. 한국 서비스 위주로.`, type: 'category', typeKo: '카테고리 추천' },
    { question: `"${serviceName}"이라는 서비스 알아? 설명해줘.`, type: 'direct', typeKo: '직접 브랜드 질문' },
    { question: `${intel.useCases[0] ? intel.useCases[0] + '하려면 어떤 서비스가 좋아?' : catInfo.label + ' 추천 앱 알려줘'}`, type: 'problem_solving', typeKo: '문제 해결' },
    { question: `${catInfo.label} 시장에서 ${serviceName} 같은 서비스들 추천해줘.`, type: 'comparison', typeKo: '비교/경쟁' },
  ]

  const platforms: PlatformTestResult[] = await Promise.all(
    PLATFORMS_CONFIG.map(async (p) => {
      if (p.requiresOR && !hasOR) {
        return { platform: p.id, platformKo: p.platformKo, model: p.model, emoji: p.emoji, color: p.color, status: 'skipped' as const, statusKo: 'OpenRouter 키 미설정', mentionCount: 0, totalQueries: 0, mentionRate: 0, excerpts: [], responses: [] }
      }
      try {
        const client = hasOR ? openrouter : openai
        const modelId = hasOR ? p.model : (p as { directModel?: string }).directModel ?? p.model
        let mc = 0
        const exs: string[] = []
        const resps: { question: string; type: string; typeKo: string; response: string; mentioned: boolean }[] = []
        const results = await Promise.allSettled(questions.map(q =>
          client.chat.completions.create({ model: modelId, max_tokens: 600, temperature: 0.3, messages: [{ role: 'system', content: '당신은 도움이 되는 AI 어시스턴트입니다. 솔직하게 알고 있는 정보만 답변해주세요. 한국어로 답변하세요.' }, { role: 'user', content: q.question }] })
            .then(r => ({ q, text: r.choices[0]?.message?.content ?? '' }))
        ))
        for (const r of results) {
          if (r.status === 'fulfilled') {
            const { q, text } = r.value
            const { found, excerpt } = checkMention(text, serviceName)
            resps.push({ question: q.question, type: q.type, typeKo: q.typeKo, response: text.slice(0, 400), mentioned: found })
            if (found) { mc++; if (excerpt) exs.push(excerpt) }
          }
        }
        const mr = Math.round((mc / questions.length) * 100)
        return { platform: p.id, platformKo: p.platformKo, model: p.model, emoji: p.emoji, color: p.color, status: mc > 0 ? 'mentioned' as const : 'not_mentioned' as const, statusKo: mc > 0 ? `${mc}/${questions.length}개 질문에서 언급` : '어떤 질문에서도 미언급', mentionCount: mc, totalQueries: questions.length, mentionRate: mr, excerpts: exs, responses: resps }
      } catch (e) {
        const msg = e instanceof Error ? e.message.slice(0, 80) : '오류'
        return { platform: p.id, platformKo: p.platformKo, model: p.model, emoji: p.emoji, color: p.color, status: 'error' as const, statusKo: `오류: ${msg}`, mentionCount: 0, totalQueries: questions.length, mentionRate: 0, excerpts: [], responses: [], error: msg }
      }
    })
  )

  const tested = platforms.filter(p => p.status !== 'skipped')
  const mentionedP = platforms.filter(p => p.status === 'mentioned')
  const overallMentionRate = tested.length > 0 ? Math.round((mentionedP.reduce((s, p) => s + p.mentionRate, 0) / tested.length)) : 0

  return {
    serviceName,
    category: catInfo.label,
    testedAt: new Date().toISOString(),
    hasOpenRouter: hasOR,
    platforms,
    overallMentionRate,
    summary: '',
    serviceIntelligence: {
      name: serviceName, category: catInfo.label,
      coreFeatures: intel.features, targetAudience: intel.audience,
      keyValueProps: [], useCases: intel.useCases, competitors: intel.competitors,
      sourceType: intel.sourceType, summary: '',
    },
    generatedQuestions: questions.map(q => ({
      question: q.question, type: q.type as 'direct' | 'feature' | 'problem_solving' | 'comparison' | 'category',
      typeKo: q.typeKo, rationale: `${serviceName} 관련 질문`,
    })),
  }
}

// ─── Response Share Calculator ───────────────────────────────────────────────

function calculateResponseShare(platforms: PlatformTestResult[]): ResponseShare {
  const tested = platforms.filter(p => p.status !== 'skipped' && p.status !== 'error')

  // Flatten all responses with type info
  const allResponses = tested.flatMap(p =>
    (p.responses as Array<{ question: string; type?: string; typeKo?: string; response: string; mentioned: boolean }>)
  )

  const totalResponses = allResponses.length
  const totalMentions = allResponses.filter(r => r.mentioned).length
  const rawShareRate = totalResponses > 0 ? Math.round((totalMentions / totalResponses) * 100) : 0

  // Weighted share rate by question type
  let weightedNumerator = 0
  let weightedDenominator = 0

  const typeMap: Record<string, { mentioned: number; total: number }> = {}
  for (const r of allResponses) {
    const type = r.type ?? 'category'
    if (!typeMap[type]) typeMap[type] = { mentioned: 0, total: 0 }
    typeMap[type].total++
    if (r.mentioned) typeMap[type].mentioned++
    const w = QUESTION_TYPE_WEIGHTS[type]?.weight ?? 1.0
    weightedDenominator += w
    if (r.mentioned) weightedNumerator += w
  }

  const weightedShareRate = weightedDenominator > 0
    ? Math.round((weightedNumerator / weightedDenominator) * 100)
    : 0

  // By question type breakdown
  const byQuestionType: ResponseShareByType[] = Object.entries(typeMap).map(([type, stat]) => {
    const meta = QUESTION_TYPE_WEIGHTS[type] ?? { weight: 1.0, typeKo: type, interpretation: '' }
    return {
      type,
      typeKo: meta.typeKo,
      weight: meta.weight,
      shareRate: stat.total > 0 ? Math.round((stat.mentioned / stat.total) * 100) : 0,
      mentionCount: stat.mentioned,
      total: stat.total,
      interpretation: meta.interpretation,
    }
  }).sort((a, b) => b.weight - a.weight)

  // By platform
  const byPlatform = platforms.map(p => ({
    platform: p.platform,
    platformKo: p.platformKo,
    emoji: p.emoji,
    color: p.color,
    shareRate: p.totalQueries > 0 ? Math.round((p.mentionCount / p.totalQueries) * 100) : 0,
    mentionCount: p.mentionCount,
    totalQueries: p.totalQueries,
    status: p.status,
  }))

  // Benchmark
  const score = weightedShareRate
  const benchmarkLevel: ResponseShare['benchmarkLevel'] =
    score >= 70 ? 'top_tier' : score >= 50 ? 'strong' : score >= 30 ? 'moderate' : score >= 10 ? 'weak' : 'absent'
  const benchmarkMap = {
    top_tier: { label: 'AI 가시성 최상위', color: '#059669' },
    strong:   { label: 'AI 가시성 우수',  color: '#2563EB' },
    moderate: { label: 'AI 가시성 보통',  color: '#D97706' },
    weak:     { label: 'AI 가시성 미흡',  color: '#DC2626' },
    absent:   { label: 'AI 가시성 없음',  color: '#6B7280' },
  }

  // Category mention rate (highest value signal)
  const catType = byQuestionType.find(t => t.type === 'category')
  const categoryInsight = catType
    ? catType.shareRate >= 50
      ? `카테고리 추천에서 ${catType.shareRate}% 언급 — AI가 이 서비스를 해당 분야 대표로 인식`
      : catType.shareRate > 0
        ? `카테고리 추천에서 ${catType.shareRate}% 언급 — 경쟁사 대비 존재감 강화 필요`
        : '카테고리 추천 질문에서 미언급 — 가장 시급한 GEO 개선 포인트'
    : ''

  const insight = totalResponses === 0
    ? '실측 데이터 없음 (OpenRouter 키 미설정)'
    : `${totalResponses}개 AI 응답 중 ${totalMentions}개에서 언급 (가중 점유율 ${weightedShareRate}%). ${categoryInsight}`

  return {
    rawShareRate,
    weightedShareRate,
    totalResponses,
    totalMentions,
    byPlatform,
    byQuestionType,
    benchmarkLevel,
    benchmarkLabel: benchmarkMap[benchmarkLevel].label,
    benchmarkColor: benchmarkMap[benchmarkLevel].color,
    insight,
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { serviceName, category, url } = await req.json()
    if (!serviceName?.trim() || !category?.trim()) {
      return NextResponse.json({ error: '서비스 이름과 카테고리를 입력해주세요.' }, { status: 400 })
    }

    // ── Run both analyses in PARALLEL ────────────────────────────────────────
    const [geoAnalysis, citationTest] = await Promise.all([
      runGEOAnalysis(serviceName, category, url),
      runCitationTest(serviceName, category, url),
    ])

    // ── Compute combined metrics ──────────────────────────────────────────────
    const geoScore = geoAnalysis.totalScore
    const citationRate = citationTest.overallMentionRate

    const gapData = computeGap(geoScore, citationRate)

    // Unified score: GEO 55% + Citation 45%
    const unifiedScore = Math.round(geoScore * 0.55 + citationRate * 0.45)

    // Correlation note
    const diff = Math.abs(geoScore - citationRate)
    const correlationNote = diff < 12
      ? '두 점수가 일치합니다. 분석 결과의 신뢰도가 높습니다.'
      : diff < 30
        ? '두 점수 간 약간의 차이가 있습니다. 격차 원인을 파악해 개선하세요.'
        : `두 점수 차이(${diff}pt)가 큽니다. ${gapData.gapInsight}`

    // Confirmed strengths & weaknesses from real test
    const strengthsFromReal: string[] = []
    const weaknessesFromReal: string[] = []

    const mentionedPlatforms = citationTest.platforms.filter(p => p.status === 'mentioned')
    const notMentionedPlatforms = citationTest.platforms.filter(p => p.status === 'not_mentioned')

    if (mentionedPlatforms.length > 0) {
      strengthsFromReal.push(`${mentionedPlatforms.map(p => p.platformKo).join(', ')}에서 실제 언급 확인됨`)
    }
    if (notMentionedPlatforms.length > 0) {
      weaknessesFromReal.push(`${notMentionedPlatforms.map(p => p.platformKo).join(', ')}에서 미언급`)
    }
    if (geoAnalysis.analysisMode === 'real_url') {
      const lowDims = (geoAnalysis.dimensions ?? []).filter(d => (d.score / d.maxScore) < 0.5)
      if (lowDims.length > 0) weaknessesFromReal.push(`실제 페이지 분석: ${lowDims.map(d => d.nameKo).join(', ')} 취약`)
    }

    const combined: CombinedMetrics = {
      unifiedScore,
      geoReadinessScore: geoScore,
      citationRate,
      ...gapData,
      correlationNote,
      strengthsFromReal,
      weaknessesFromReal,
      unifiedRecommendations: buildUnifiedRecommendations(geoAnalysis, citationTest, gapData.gap),
    }

    const result: CombinedAnalysisResult = {
      serviceName: serviceName.trim(),
      category,
      analyzedAt: new Date().toISOString(),
      geoAnalysis,
      citationTest,
      combined,
      responseShare: calculateResponseShare(citationTest.platforms),
    }

    // Save for session compatibility
    return NextResponse.json(result)
  } catch (error) {
    console.error('Combined analysis error:', error)
    return NextResponse.json({ error: '종합 분석 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
