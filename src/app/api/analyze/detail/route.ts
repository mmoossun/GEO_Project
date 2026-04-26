import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import type { GEOAnalysisResult } from '@/lib/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface PlatformScore {
  platform: string
  platformKo: string
  emoji: string
  score: number          // 0-100
  citationType: 'source' | 'mention' | 'none'
  citationTypeKo: string
  reasoning: string
  color: string
}

export interface ChecklistItem {
  id: string
  category: string
  item: string
  status: 'pass' | 'fail' | 'warning' | 'unknown'
  impact: 'critical' | 'high' | 'medium' | 'low'
  detail: string
}

export interface ActionItem {
  id: string
  title: string
  impact: number       // 1-10
  effort: number       // 1-10
  category: string
  timeframe: string
  description: string
  quadrant: 'quick_win' | 'strategic' | 'fill_in' | 'thankless'
}

export interface RoadmapWeek {
  week: number
  label: string
  focus: string
  tasks: Array<{ title: string; type: 'content' | 'technical' | 'authority'; priority: 'high' | 'medium' }>
  expectedGain: string
}

export interface DetailedAnalysis {
  serviceName: string
  category: string
  baseScore: number
  potentialScore: number

  platformScores: PlatformScore[]
  brandMetrics: {
    sentiment: 'positive' | 'neutral' | 'negative'
    sentimentScore: number
    recognition: 'high' | 'medium' | 'low'
    recognitionKo: string
    topicalAuthority: number
    shareOfVoice: number
    trustScore: number
  }
  checklist: ChecklistItem[]
  checklistSummary: { pass: number; warning: number; fail: number }
  actionMatrix: ActionItem[]
  roadmap: RoadmapWeek[]
  competitiveGap: {
    dimension: string
    yourScore: number
    industryAvg: number
    topPerformer: number
    gap: number
  }[]
  contentGaps: string[]
  strengthAreas: string[]
}

const DETAIL_PROMPT = `You are a senior GEO analyst producing a comprehensive deep-dive analysis.
Based on the provided basic GEO analysis data, generate an EXTENDED detailed report.

GEO = Generative Engine Optimization (AI search visibility — NOT geographic location).

## Output Sections Required:

### 1. Platform Visibility Scores
Estimate visibility score (0-100) for each AI platform based on the service's known content characteristics:
- ChatGPT (GPT-4o): Favors comprehensive, well-cited content
- Perplexity AI: Values freshness, sources, factual density
- Google AI Overview (SGE): Requires technical schema, E-E-A-T
- Gemini: Google ecosystem signals
- Claude: Authoritative, structured, non-promotional
- Naver AI Briefing: Korean content, Naver ecosystem (critical for Korean services)

Also determine citationType: "source" (directly linked), "mention" (brand mentioned), or "none"

### 2. Brand Metrics
- Sentiment: positive/neutral/negative based on content tone
- Recognition: high/medium/low — how well-known is this brand in AI training data
- Topical Authority: 0-100 — depth of expertise signals
- Share of Voice: 0-100 — % of AI answers where this brand might appear vs competitors
- Trust Score: 0-100 — E-E-A-T aggregate

### 3. GEO Checklist (generate 20-25 items across 6 categories)
Categories: 콘텐츠구조, E-E-A-T, 기술최적화, 최신성, 가독성, GEO특화
Each item: status (pass/fail/warning/unknown), impact (critical/high/medium/low), brief detail

### 4. Action Matrix (15 items)
For each action: impact (1-10), effort (1-10), timeframe, category
Quadrant auto-assigned:
- Quick Win: impact≥6, effort≤4
- Strategic: impact≥6, effort≥5
- Fill In: impact<6, effort≤4
- Thankless: impact<6, effort≥5

### 5. 30-Day Roadmap (4 weeks)
Week 1: Foundation/Quick Wins
Week 2: Content optimization
Week 3: Technical & Authority
Week 4: Advanced GEO

### 6. Competitive Analysis
Gap analysis per dimension vs industry avg and top performer.
Content gaps (what's missing vs competitors).
Strength areas (where this service leads).

Return ONLY valid JSON:
{
  "potentialScore": <integer — what score is achievable in 90 days>,
  "platformScores": [
    {"platform": "chatgpt", "platformKo": "ChatGPT", "emoji": "🤖", "score": <0-100>,
     "citationType": "source|mention|none", "citationTypeKo": "출처 인용|언급|없음",
     "reasoning": "<Korean 1-sentence reason>", "color": "#10B981"},
    {"platform": "perplexity", "platformKo": "Perplexity AI", "emoji": "🔍", "score": <0-100>,
     "citationType": "...", "citationTypeKo": "...", "reasoning": "...", "color": "#3B82F6"},
    {"platform": "google_sge", "platformKo": "Google AI Overview", "emoji": "🌐", "score": <0-100>,
     "citationType": "...", "citationTypeKo": "...", "reasoning": "...", "color": "#F59E0B"},
    {"platform": "gemini", "platformKo": "Gemini", "emoji": "✨", "score": <0-100>,
     "citationType": "...", "citationTypeKo": "...", "reasoning": "...", "color": "#8B5CF6"},
    {"platform": "claude", "platformKo": "Claude", "emoji": "🧠", "score": <0-100>,
     "citationType": "...", "citationTypeKo": "...", "reasoning": "...", "color": "#EC4899"},
    {"platform": "naver_ai", "platformKo": "Naver AI Briefing", "emoji": "🟢", "score": <0-100>,
     "citationType": "...", "citationTypeKo": "...", "reasoning": "...", "color": "#059669"}
  ],
  "brandMetrics": {
    "sentiment": "positive|neutral|negative",
    "sentimentScore": <0-100>,
    "recognition": "high|medium|low",
    "recognitionKo": "높음|보통|낮음",
    "topicalAuthority": <0-100>,
    "shareOfVoice": <0-100>,
    "trustScore": <0-100>
  },
  "checklist": [
    {"id": "c1", "category": "콘텐츠구조", "item": "H1 태그 단독 사용", "status": "pass|fail|warning|unknown", "impact": "critical|high|medium|low", "detail": "<Korean brief>"},
    ...20 more items
  ],
  "actionMatrix": [
    {"id": "a1", "title": "<Korean action>", "impact": <1-10>, "effort": <1-10>, "category": "<Korean category>", "timeframe": "<e.g. 1일|1주일|2주일|1개월>", "description": "<Korean>", "quadrant": "quick_win|strategic|fill_in|thankless"},
    ...14 more
  ],
  "roadmap": [
    {"week": 1, "label": "1주차", "focus": "<Korean focus>", "tasks": [{"title": "<Korean>", "type": "content|technical|authority", "priority": "high|medium"}, ...], "expectedGain": "+X점 예상"},
    {"week": 2, ...},
    {"week": 3, ...},
    {"week": 4, ...}
  ],
  "competitiveGap": [
    {"dimension": "콘텐츠 구조", "yourScore": <0-20>, "industryAvg": <0-20>, "topPerformer": <0-20>, "gap": <integer>},
    ...5 dimensions
  ],
  "contentGaps": ["<missing content type 1 in Korean>", "<missing 2>", "<missing 3>"],
  "strengthAreas": ["<strength 1 in Korean>", "<strength 2>", "<strength 3>"]
}`

export async function POST(req: NextRequest) {
  try {
    const analysis: GEOAnalysisResult = await req.json()

    if (!analysis?.serviceName) {
      return NextResponse.json({ error: '분석 데이터가 필요합니다.' }, { status: 400 })
    }

    const dimSummary = (analysis.dimensions ?? [])
      .map(d => `${d.nameKo}: ${d.score}/${d.maxScore}점`)
      .join(', ')

    const userMessage = `Perform detailed GEO analysis for:

Service: "${analysis.serviceName}"
Category: ${analysis.categoryLabel} (${analysis.category})

Basic Scores:
- Total: ${analysis.totalScore}/100 (${analysis.grade}등급 — ${analysis.gradeLabel})
- Dimensions: ${dimSummary}
- Industry Average: ${analysis.industryAverage}
- Citation Probability: ${analysis.citationProbability}%
- AI Visibility: ${analysis.aiVisibilityLevel}

Known Issues: ${(analysis.topIssues ?? []).join(', ')}
Summary: ${analysis.summary}

Generate the comprehensive detailed analysis based on this data and your knowledge of "${analysis.serviceName}".
All text fields must be in Korean. Scores must genuinely reflect this specific service.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 5000,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: DETAIL_PROMPT },
        { role: 'user', content: userMessage },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw)

    // Compute checklist summary
    const checklist: ChecklistItem[] = parsed.checklist ?? []
    const checklistSummary = {
      pass: checklist.filter(c => c.status === 'pass').length,
      warning: checklist.filter(c => c.status === 'warning').length,
      fail: checklist.filter(c => c.status === 'fail').length,
    }

    const result: DetailedAnalysis = {
      serviceName: analysis.serviceName,
      category: analysis.category,
      baseScore: analysis.totalScore,
      potentialScore: parsed.potentialScore ?? Math.min(95, analysis.totalScore + 22),
      platformScores: parsed.platformScores ?? [],
      brandMetrics: parsed.brandMetrics ?? {},
      checklist,
      checklistSummary,
      actionMatrix: parsed.actionMatrix ?? [],
      roadmap: parsed.roadmap ?? [],
      competitiveGap: parsed.competitiveGap ?? [],
      contentGaps: parsed.contentGaps ?? [],
      strengthAreas: parsed.strengthAreas ?? [],
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Detail analysis error:', error)
    return NextResponse.json({ error: '상세 분석 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
