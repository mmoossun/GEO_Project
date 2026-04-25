import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { getGrade, getVisibilityLevel } from '@/lib/utils'
import { getCategoryInfo } from '@/lib/constants'
import type { GEOAnalysisResult } from '@/lib/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `You are a world-class GEO (Generative Engine Optimization) analyst. GEO is the practice of optimizing content so AI search engines (ChatGPT, Perplexity, Gemini, Claude) cite and reference it in their answers.

You analyze services based on their name, category, and optional website URL. When a URL is provided, consider typical content patterns for that specific site. When not provided, base your analysis on industry-standard patterns for that category.

GEO Scoring Dimensions (Total 100pts):
1. **Content Structure** (20pts): H1-H6 hierarchy, FAQ sections, bullet/numbered lists, answer capsules (self-contained direct-answer paragraphs), table of contents, clear information architecture
2. **E-E-A-T Signals** (25pts): Author credentials/bio, statistics & data with sources, expert quotes, external citations, non-promotional tone (-26% citation if promotional), trustworthiness markers
3. **Technical Signals** (20pts): JSON-LD schema markup (+30-40% AI citation), meta tags, publication/update dates, structured data, bot crawler accessibility
4. **Freshness** (15pts): Date presence, update frequency signals (76.4% of ChatGPT cited pages updated within 30 days), recency markers
5. **Readability** (20pts): Clarity, scannability, sentence length, vocabulary diversity, question-answer format, jargon balance

Industry-specific scoring tendencies:
- 이커머스: Product pages often promotional (bad), but review content can be strong
- SaaS: Technical documentation strong, but marketing pages often jargon-heavy
- 금융/핀테크: High authority signals, but compliance language hurts readability
- 의료/헬스케어: High E-E-A-T potential, but often lacks schema markup
- 교육/이러닝: Good structure (courses, lessons), often lacks freshness
- 뉴스/미디어: Strong freshness/dates, but author attribution varies
- 법률/전문직: High authority, poor readability from legal jargon

Key research findings to apply:
- Statistics inclusion: +41% visibility
- Source citation: +115% visibility for low-ranked content
- Schema markup: 30-40% higher AI citation rate
- Combined Fluency+Statistics: 5.5x improvement
- FAQ sections: strong AI extraction signal

Respond ONLY with valid JSON (no markdown wrapper) matching this exact structure:
{
  "totalScore": <integer 0-100>,
  "dimensions": [
    {
      "id": "structure",
      "nameKo": "콘텐츠 구조",
      "score": <0-20>,
      "maxScore": 20,
      "observations": ["<Korean observation 1>", "<Korean observation 2>", "<Korean observation 3>"],
      "improvements": ["<Korean improvement 1>", "<Korean improvement 2>"]
    },
    {
      "id": "eeat",
      "nameKo": "E-E-A-T 신뢰성",
      "score": <0-25>,
      "maxScore": 25,
      "observations": ["<Korean observation 1>", "<Korean observation 2>", "<Korean observation 3>"],
      "improvements": ["<Korean improvement 1>", "<Korean improvement 2>"]
    },
    {
      "id": "technical",
      "nameKo": "기술 신호",
      "score": <0-20>,
      "maxScore": 20,
      "observations": ["<Korean observation 1>", "<Korean observation 2>", "<Korean observation 3>"],
      "improvements": ["<Korean improvement 1>", "<Korean improvement 2>"]
    },
    {
      "id": "freshness",
      "nameKo": "최신성",
      "score": <0-15>,
      "maxScore": 15,
      "observations": ["<Korean observation 1>", "<Korean observation 2>"],
      "improvements": ["<Korean improvement 1>", "<Korean improvement 2>"]
    },
    {
      "id": "readability",
      "nameKo": "가독성",
      "score": <0-20>,
      "maxScore": 20,
      "observations": ["<Korean observation 1>", "<Korean observation 2>", "<Korean observation 3>"],
      "improvements": ["<Korean improvement 1>", "<Korean improvement 2>"]
    }
  ],
  "summary": "<2-3 sentence overall assessment specific to this service and category in Korean>",
  "topIssues": ["<top issue 1 in Korean>", "<top issue 2 in Korean>", "<top issue 3 in Korean>"],
  "recommendations": [
    {
      "priority": "critical",
      "title": "<Korean title for most critical issue>",
      "description": "<Korean detailed description>",
      "expectedImpact": "<e.g. +10-15점 예상>",
      "effort": "low|medium|high"
    },
    {
      "priority": "high",
      "title": "<Korean title for second priority issue>",
      "description": "<Korean detailed description>",
      "expectedImpact": "<e.g. +8-12점 예상>",
      "effort": "low|medium|high"
    },
    {
      "priority": "high",
      "title": "<Korean title for third priority issue>",
      "description": "<Korean detailed description>",
      "expectedImpact": "<e.g. +5-8점 예상>",
      "effort": "low|medium|high"
    },
    {
      "priority": "medium",
      "title": "<Korean title for fourth priority issue>",
      "description": "<Korean detailed description>",
      "expectedImpact": "<e.g. +3-5점 예상>",
      "effort": "low|medium|high"
    }
  ],
  "citationProbability": <integer 0-100>,
  "competitiveInsight": "<Korean sentence about competitive position in this category>",
  "quickWins": ["<Korean quick win 1>", "<Korean quick win 2>", "<Korean quick win 3>"]
}

IMPORTANT: You MUST return exactly 4 recommendations, ordered by priority (critical → high → high → medium).
Each recommendation must be specific and actionable for the analyzed service.`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { serviceName, category, url, previousScore } = body as {
      serviceName: string
      category: string
      url?: string
      previousScore?: number
    }

    if (!serviceName?.trim() || !category?.trim()) {
      return NextResponse.json({ error: '서비스 이름과 카테고리를 입력해주세요.' }, { status: 400 })
    }

    const catInfo = getCategoryInfo(category)
    const urlContext = url ? `Website URL: ${url} (analyze based on known/typical content patterns for this URL/domain)` : 'No URL provided (analyze based on industry-typical patterns)'
    const historyContext = previousScore != null
      ? `\nImportant: This service was previously analyzed with a score of ${previousScore}/100. Provide a fresh, independent assessment - scores may be similar or different based on industry patterns.`
      : ''

    const userMessage = `Analyze this service for GEO optimization:
Service Name: "${serviceName}"
Category: ${catInfo.label} (${category})
Industry Average Score: ${catInfo.avgScore}/100
${urlContext}${historyContext}

Generate a realistic, industry-specific GEO assessment. Be specific to this service type and category. Provide actionable Korean insights.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 3500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw)

    const totalScore = parsed.totalScore ?? parsed.dimensions?.reduce((s: number, d: { score: number }) => s + d.score, 0) ?? 50
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
    return NextResponse.json({ error: '분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500 })
  }
}
