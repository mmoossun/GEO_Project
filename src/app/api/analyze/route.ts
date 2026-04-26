import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { getGrade, getVisibilityLevel } from '@/lib/utils'
import { getCategoryInfo } from '@/lib/constants'
import type { GEOAnalysisResult } from '@/lib/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `You are a world-class GEO (Generative Engine Optimization) analyst with deep knowledge of Korean and global digital services.

GEO = the practice of optimizing content so AI search engines (ChatGPT, Perplexity, Gemini, Claude) cite and reference it.

## SCORING DIMENSIONS (100pts total)
1. **콘텐츠 구조** (20pts): H1-H6 hierarchy, FAQ sections, answer capsules, TOC, lists
2. **E-E-A-T 신뢰성** (25pts): Author credentials, statistics with sources, expert citations, non-promotional tone
3. **기술 신호** (20pts): JSON-LD schema markup, meta tags, dates, structured data, crawler access
4. **최신성** (15pts): Publication dates, update frequency, recency signals
5. **가독성** (20pts): Clarity, scannability, sentence length, jargon balance, Q&A format

## ⚠️ CRITICAL: SERVICE-SPECIFIC DIFFERENTIATION REQUIRED

You MUST analyze the specific service named by the user based on your actual knowledge of it.
DO NOT use industry averages as the target — individual services vary from 25 to 92.

**Reasoning process (required before scoring):**
1. What do you actually know about THIS specific service?
   - Is it a major established brand or a niche startup?
   - Does it have a content marketing strategy? (blog, help docs, newsroom?)
   - What is its tech sophistication? (affects schema, technical signals)
   - Is its content authoritative or promotional?
   - Does it have a FAQ/help center?

2. Score each dimension based on that SPECIFIC service's characteristics:
   - Major SaaS with extensive docs (e.g., Notion, Slack) → structure: 16-18/20
   - Fintech startup with only landing pages → structure: 6-9/20
   - News media company → freshness: 13-15/15
   - E-commerce with no blog → freshness: 4-7/15
   - Service known for E-E-A-T (medical, legal) → eeat: 18-22/25
   - New startup, minimal content → eeat: 8-12/25

3. FORBIDDEN behaviors:
   - Giving 토스 and 쿠팡 the same score when they have completely different content strategies
   - Regressing to the industry mean (e.g., giving everyone 62-68)
   - Giving round numbers like exactly 65/100 or 70/100 to every service
   - Ignoring what you know about a service just to be "safe"

4. Score reality check: Final scores should genuinely vary:
   - World-class content strategy (Notion, HubSpot style): 78-90
   - Good but not optimized (most large Korean platforms): 55-72
   - Average (typical SMB websites): 40-57
   - Poor (pure promotional, no content strategy): 25-42

## OUTPUT FORMAT
Return ONLY valid JSON:
{
  "totalScore": <integer — MUST reflect this specific service, NOT industry average>,
  "dimensions": [
    {"id": "structure", "nameKo": "콘텐츠 구조", "score": <0-20>, "maxScore": 20,
     "observations": ["<specific to THIS service>", "<specific>", "<specific>"],
     "improvements": ["<actionable for THIS service>", "<actionable>"]},
    {"id": "eeat", "nameKo": "E-E-A-T 신뢰성", "score": <0-25>, "maxScore": 25,
     "observations": ["<specific>", "<specific>", "<specific>"],
     "improvements": ["<actionable>", "<actionable>"]},
    {"id": "technical", "nameKo": "기술 신호", "score": <0-20>, "maxScore": 20,
     "observations": ["<specific>", "<specific>", "<specific>"],
     "improvements": ["<actionable>", "<actionable>"]},
    {"id": "freshness", "nameKo": "최신성", "score": <0-15>, "maxScore": 15,
     "observations": ["<specific>", "<specific>"],
     "improvements": ["<actionable>", "<actionable>"]},
    {"id": "readability", "nameKo": "가독성", "score": <0-20>, "maxScore": 20,
     "observations": ["<specific>", "<specific>", "<specific>"],
     "improvements": ["<actionable>", "<actionable>"]}
  ],
  "summary": "<2-3 Korean sentences — MUST mention the service by name and describe its SPECIFIC content strategy weaknesses/strengths>",
  "topIssues": ["<specific issue unique to this service>", "<specific>", "<specific>"],
  "recommendations": [
    {"priority": "critical", "title": "<Korean>", "description": "<Korean>", "expectedImpact": "<+Xpt>", "effort": "low|medium|high"},
    {"priority": "high", "title": "<Korean>", "description": "<Korean>", "expectedImpact": "<+Xpt>", "effort": "low|medium|high"},
    {"priority": "high", "title": "<Korean>", "description": "<Korean>", "expectedImpact": "<+Xpt>", "effort": "low|medium|high"},
    {"priority": "medium", "title": "<Korean>", "description": "<Korean>", "expectedImpact": "<+Xpt>", "effort": "low|medium|high"}
  ],
  "citationProbability": <integer — based on THIS service's actual content quality>,
  "competitiveInsight": "<Korean — compare this service specifically to competitors in its category>",
  "quickWins": ["<3 quick wins specific to THIS service's known weaknesses>", "<specific>", "<specific>"]
}`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { serviceName, category, url, previousScore } = body as {
      serviceName: string; category: string; url?: string; previousScore?: number
    }

    if (!serviceName?.trim() || !category?.trim()) {
      return NextResponse.json({ error: '서비스 이름과 카테고리를 입력해주세요.' }, { status: 400 })
    }

    const catInfo = getCategoryInfo(category)

    const urlLine = url
      ? `Website URL provided: ${url}\n→ Factor in what you know about this domain's content strategy.`
      : `No URL provided. Use your knowledge of "${serviceName}" specifically.`

    const prevLine = previousScore != null
      ? `⚠️ Previously scored ${previousScore}/100. Re-analyze independently — the score may change significantly.`
      : ''

    // The key: ask the model to REASON about the specific service first
    const userMessage = `Analyze this specific service for GEO optimization:

Service: "${serviceName}"
Category: ${catInfo.label} (${category})
${urlLine}
${prevLine}

STEP 1 — Before scoring, write your reasoning (internal, not in output):
"What do I specifically know about ${serviceName}?
- Content marketing approach?
- Technical sophistication?
- Blog/FAQ/Help center presence?
- Known strengths or weaknesses vs competitors?"

STEP 2 — Score each dimension based on YOUR ACTUAL KNOWLEDGE of this service.
The score must reflect ${serviceName} specifically. If ${serviceName} has a different GEO profile than ${catInfo.label} industry average (${catInfo.avgScore}), SHOW THAT difference.

All observations and improvements must specifically mention "${serviceName}" by name.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 3500,
      temperature: 0.4,   // lower = more consistent, but instructions force differentiation
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw)

    const totalScore = parsed.totalScore ??
      parsed.dimensions?.reduce((s: number, d: { score: number }) => s + d.score, 0) ?? 50
    const grade = getGrade(totalScore)

    const result: GEOAnalysisResult = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      serviceName: serviceName.trim(),
      category,
      categoryLabel: catInfo.label,
      url: url?.trim() || undefined,
      totalScore,
      grade,
      gradeLabel: { S: 'AI 최적화 최상급', A: 'AI 노출 우수', B: 'AI 노출 양호', C: 'AI 노출 보통', D: 'AI 노출 미흡', F: 'AI 노출 불량' }[grade],
      dimensions: parsed.dimensions ?? [],
      summary: parsed.summary ?? '',
      topIssues: parsed.topIssues ?? [],
      recommendations: (parsed.recommendations ?? []).slice(0, 4),
      industryAverage: catInfo.avgScore,
      topPerformerScore: catInfo.topScore,
      citationProbability: parsed.citationProbability ?? Math.round(totalScore * 0.9),
      aiVisibilityLevel: getVisibilityLevel(totalScore),
      competitiveInsight: parsed.competitiveInsight ?? '',
      quickWins: parsed.quickWins ?? [],
      analyzedAt: new Date().toISOString(),
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Analyze error:', error)
    return NextResponse.json({ error: '분석 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
