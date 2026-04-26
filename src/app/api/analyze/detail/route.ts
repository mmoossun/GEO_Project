import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import type { GEOAnalysisResult } from '@/lib/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompetitorProfile {
  name: string
  geoScore: number
  grade: string
  citationRate: number
  strengths: string[]
  weaknesses: string[]
  contentAdvantage: string
  topCitedContent: string
  strategicThreat: 'low' | 'medium' | 'high'
  dimensions: { id: string; nameKo: string; score: number; maxScore: number }[]
}

export interface PlatformStrategy {
  platform: string
  platformKo: string
  emoji: string
  color: string
  currentScore: number
  visibility: string
  algorithmPreference: string
  mainBarrier: string
  quickWins: string[]
  contentFormat: string
  targetPrompts: string[]
  timeToImpact: string
}

export interface ContentBlueprint {
  title: string
  type: 'FAQ' | 'How-To' | 'Comparison' | 'Definition' | 'Guide' | 'Case-Study'
  typeKo: string
  priority: 'critical' | 'high' | 'medium'
  purpose: string
  aiTargetPrompts: string[]
  keyPoints: string[]
  wordCountTarget: string
  estimatedImpact: string
}

export interface TechImplementation {
  title: string
  category: 'Schema Markup' | 'Meta Tags' | 'Content Structure' | 'Technical'
  categoryKo: string
  impact: string
  difficulty: 'easy' | 'medium' | 'hard'
  difficultyKo: string
  timeEstimate: string
  code: string
  explanation: string
}

export interface TopicalAuthorityMap {
  coreTopics: string[]
  coverageGaps: string[]
  competitorExclusiveTopics: string[]
  quickContentWins: string[]
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
  impact: number
  effort: number
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

  // Platform visibility
  platformScores: Array<{
    platform: string; platformKo: string; emoji: string; score: number
    citationType: string; citationTypeKo: string; reasoning: string; color: string
  }>

  // Brand metrics
  brandMetrics: {
    sentiment: 'positive' | 'neutral' | 'negative'
    sentimentScore: number
    recognition: 'high' | 'medium' | 'low'
    recognitionKo: string
    topicalAuthority: number
    shareOfVoice: number
    trustScore: number
  }

  // GEO checklist
  checklist: ChecklistItem[]
  checklistSummary: { pass: number; warning: number; fail: number }

  // Action matrix
  actionMatrix: ActionItem[]

  // Roadmap
  roadmap: RoadmapWeek[]

  // Competitive gap
  competitiveGap: Array<{
    dimension: string; yourScore: number; industryAvg: number; topPerformer: number; gap: number
  }>
  contentGaps: string[]
  strengthAreas: string[]

  // NEW — Deep sections
  competitorAnalysis: {
    competitors: CompetitorProfile[]
    competitivePosition: string
    winningOpportunity: string
  }
  platformStrategies: PlatformStrategy[]
  contentBlueprint: ContentBlueprint[]
  techImplementations: TechImplementation[]
  topicalAuthorityMap: TopicalAuthorityMap
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a world-class GEO (Generative Engine Optimization) strategy consultant generating a DEEPLY DETAILED report.

GEO = optimizing content to be cited by AI search engines (ChatGPT, Perplexity, Gemini, Claude, Naver AI).

## CRITICAL QUALITY STANDARDS
- Every insight MUST mention the service by name — no generic advice
- Competitor names must be REAL, well-known services in the same category
- All scores must differ meaningfully per service
- Technical code examples must be accurate and production-ready
- Content blueprint titles must be specific and creative, not generic
- Platform strategies must reflect how each AI actually works differently

## NEVER DO THIS
❌ "Add FAQ sections to your website"
✅ "Create a dedicated FAQ page on {ServiceName}.com covering '{feature} 사용 방법', '{service} 요금제 비교' — these exact questions appear 800K+ times monthly in Korean search"

Return ONLY valid JSON (no markdown) matching this exact schema.`

function buildDetailPrompt(analysis: GEOAnalysisResult): string {
  const dimSummary = (analysis.dimensions ?? [])
    .map(d => `${d.nameKo}: ${d.score}/${d.maxScore}점 (${Math.round(d.score/d.maxScore*100)}%)`)
    .join(', ')

  return `Generate a DEEPLY DETAILED GEO analysis for: "${analysis.serviceName}" (${analysis.categoryLabel})

## Current GEO Status
- Total Score: ${analysis.totalScore}/100 (${analysis.grade} — ${analysis.gradeLabel})
- Dimension Breakdown: ${dimSummary}
- Industry Average: ${analysis.industryAverage}/100 | Top Performer: ${analysis.topPerformerScore}/100
- AI Citation Probability: ${analysis.citationProbability}%
- Known Issues: ${(analysis.topIssues ?? []).join(', ')}
- Summary: ${analysis.summary}

## Required Output JSON Structure:
{
  "potentialScore": <what score is achievable in 90 days with full optimization>,

  "platformScores": [
    {"platform":"chatgpt","platformKo":"ChatGPT","emoji":"🤖","score":<0-100>,"citationType":"source|mention|none","citationTypeKo":"출처인용|언급|없음","reasoning":"<Korean specific reason for this service>","color":"#10A37F"},
    {"platform":"perplexity","platformKo":"Perplexity","emoji":"🔍","score":<0-100>,"citationType":"...","citationTypeKo":"...","reasoning":"<Korean>","color":"#3B82F6"},
    {"platform":"google_sge","platformKo":"Google AI","emoji":"🌐","score":<0-100>,"citationType":"...","citationTypeKo":"...","reasoning":"<Korean>","color":"#F59E0B"},
    {"platform":"gemini","platformKo":"Gemini","emoji":"✨","score":<0-100>,"citationType":"...","citationTypeKo":"...","reasoning":"<Korean>","color":"#8B5CF6"},
    {"platform":"claude","platformKo":"Claude","emoji":"🧠","score":<0-100>,"citationType":"...","citationTypeKo":"...","reasoning":"<Korean>","color":"#EC4899"},
    {"platform":"naver_ai","platformKo":"Naver AI","emoji":"🟢","score":<0-100>,"citationType":"...","citationTypeKo":"...","reasoning":"<Korean>","color":"#059669"}
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
    {"id":"c1","category":"콘텐츠구조","item":"<specific item for this service>","status":"pass|fail|warning|unknown","impact":"critical|high|medium|low","detail":"<Korean specific detail>"}
    // 22-25 items across: 콘텐츠구조(5), E-E-A-T(5), 기술최적화(5), 최신성(4), GEO특화(5)
  ],

  "actionMatrix": [
    {"id":"a1","title":"<Korean action specific to ${analysis.serviceName}>","impact":<1-10>,"effort":<1-10>,"category":"<Korean>","timeframe":"1일|1주일|2주일|1개월","description":"<Korean specific>","quadrant":"quick_win|strategic|fill_in|thankless"}
    // 15 items
  ],

  "roadmap": [
    {"week":1,"label":"1주차","focus":"<Korean focus>","tasks":[{"title":"<Korean specific task>","type":"content|technical|authority","priority":"high|medium"}],"expectedGain":"+X점"},
    {"week":2,"label":"2주차","focus":"...","tasks":[...],"expectedGain":"+X점"},
    {"week":3,"label":"3주차","focus":"...","tasks":[...],"expectedGain":"+X점"},
    {"week":4,"label":"4주차","focus":"...","tasks":[...],"expectedGain":"+X점"}
  ],

  "competitiveGap": [
    {"dimension":"콘텐츠 구조","yourScore":${analysis.dimensions?.find(d=>d.id==='structure')?.score??10},"industryAvg":<int>,"topPerformer":<int>,"gap":<int>},
    {"dimension":"E-E-A-T 신뢰성","yourScore":${analysis.dimensions?.find(d=>d.id==='eeat')?.score??15},"industryAvg":<int>,"topPerformer":<int>,"gap":<int>},
    {"dimension":"기술 신호","yourScore":${analysis.dimensions?.find(d=>d.id==='technical')?.score??10},"industryAvg":<int>,"topPerformer":<int>,"gap":<int>},
    {"dimension":"최신성","yourScore":${analysis.dimensions?.find(d=>d.id==='freshness')?.score??8},"industryAvg":<int>,"topPerformer":<int>,"gap":<int>},
    {"dimension":"가독성","yourScore":${analysis.dimensions?.find(d=>d.id==='readability')?.score??12},"industryAvg":<int>,"topPerformer":<int>,"gap":<int>}
  ],
  "contentGaps": ["<Korean specific gap>","<gap 2>","<gap 3>"],
  "strengthAreas": ["<Korean specific strength>","<strength 2>","<strength 3>"],

  "competitorAnalysis": {
    "competitors": [
      {
        "name": "<REAL competitor name in same category>",
        "geoScore": <40-90>,
        "grade": "S|A|B|C|D",
        "citationRate": <0-100>,
        "strengths": ["<specific strength vs ${analysis.serviceName}>","<strength 2>"],
        "weaknesses": ["<specific weakness>","<weakness 2>"],
        "contentAdvantage": "<Why this competitor gets cited more in AI search — be specific>",
        "topCitedContent": "<Type of content this competitor is most cited for>",
        "strategicThreat": "low|medium|high",
        "dimensions": [
          {"id":"structure","nameKo":"콘텐츠 구조","score":<0-20>,"maxScore":20},
          {"id":"eeat","nameKo":"E-E-A-T","score":<0-25>,"maxScore":25},
          {"id":"technical","nameKo":"기술 신호","score":<0-20>,"maxScore":20},
          {"id":"freshness","nameKo":"최신성","score":<0-15>,"maxScore":15},
          {"id":"readability","nameKo":"가독성","score":<0-20>,"maxScore":20}
        ]
      }
      // 3 competitors total
    ],
    "competitivePosition": "<Where ${analysis.serviceName} stands vs competitors — 2 sentences Korean>",
    "winningOpportunity": "<Specific differentiating opportunity ${analysis.serviceName} can exploit — 2 sentences Korean>"
  },

  "platformStrategies": [
    {
      "platform": "chatgpt",
      "platformKo": "ChatGPT",
      "emoji": "🤖",
      "color": "#10A37F",
      "currentScore": <0-100>,
      "visibility": "높음|보통|낮음|매우낮음",
      "algorithmPreference": "<What ChatGPT looks for when citing ${analysis.categoryLabel} services — Korean>",
      "mainBarrier": "<Specific reason ${analysis.serviceName} isn't cited more on ChatGPT — Korean>",
      "quickWins": ["<Specific action 1>","<action 2>","<action 3>"],
      "contentFormat": "<Best content format for ChatGPT citations — Korean>",
      "targetPrompts": ["<Real query where ${analysis.serviceName} should appear>","<query 2>","<query 3>"],
      "timeToImpact": "2-4주|1-2개월|3개월+"
    },
    // Same for: perplexity, google_sge, naver_ai
    // 4 platforms total
  ],

  "contentBlueprint": [
    {
      "title": "<Specific compelling Korean content title for ${analysis.serviceName}>",
      "type": "FAQ|How-To|Comparison|Definition|Guide|Case-Study",
      "typeKo": "FAQ페이지|방법안내|비교분석|개념정의|종합가이드|사례연구",
      "priority": "critical|high|medium",
      "purpose": "<Why this specific content will dramatically improve ${analysis.serviceName}'s GEO — Korean>",
      "aiTargetPrompts": ["<AI query this content will answer>","<query 2>"],
      "keyPoints": ["<Must-include point 1>","<point 2>","<point 3>"],
      "wordCountTarget": "800-1200|1500-2000|2000-3000",
      "estimatedImpact": "+X-Y점 예상"
    }
    // 6-7 content pieces, sorted by priority
  ],

  "techImplementations": [
    {
      "title": "<Specific technical item>",
      "category": "Schema Markup|Meta Tags|Content Structure|Technical",
      "categoryKo": "스키마 마크업|메타 태그|콘텐츠 구조|기술 최적화",
      "impact": "<Concrete expected impact — Korean>",
      "difficulty": "easy|medium|hard",
      "difficultyKo": "쉬움|보통|어려움",
      "timeEstimate": "1시간|반나절|1일|3일",
      "code": "<Actual production-ready code — JSON-LD, HTML, or pseudo-code>",
      "explanation": "<Why this matters for GEO — Korean>"
    }
    // 5-6 implementations: 2x schema, 1x meta, 1x FAQ HTML, 1x heading structure, 1x internal linking
  ],

  "topicalAuthorityMap": {
    "coreTopics": ["<Core topic this service owns>","<topic 2>","<topic 3>","<topic 4>"],
    "coverageGaps": ["<Topic missing from content>","<gap 2>","<gap 3>","<gap 4>"],
    "competitorExclusiveTopics": ["<Topic only competitors cover>","<topic 2>","<topic 3>"],
    "quickContentWins": ["<Quick content win 1 — specific>","<win 2>","<win 3>"]
  }
}`
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const analysis: GEOAnalysisResult = await req.json()
    if (!analysis?.serviceName) {
      return NextResponse.json({ error: '분석 데이터가 필요합니다.' }, { status: 400 })
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 7000,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildDetailPrompt(analysis) },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw)

    const checklist = parsed.checklist ?? []
    const result: DetailedAnalysis = {
      serviceName: analysis.serviceName,
      category: analysis.categoryLabel,
      baseScore: analysis.totalScore,
      potentialScore: parsed.potentialScore ?? Math.min(95, analysis.totalScore + 22),
      platformScores: parsed.platformScores ?? [],
      brandMetrics: parsed.brandMetrics ?? { sentiment: 'neutral', sentimentScore: 50, recognition: 'medium', recognitionKo: '보통', topicalAuthority: 50, shareOfVoice: 50, trustScore: 50 },
      checklist,
      checklistSummary: {
        pass: checklist.filter((c: ChecklistItem) => c.status === 'pass').length,
        warning: checklist.filter((c: ChecklistItem) => c.status === 'warning').length,
        fail: checklist.filter((c: ChecklistItem) => c.status === 'fail').length,
      },
      actionMatrix: parsed.actionMatrix ?? [],
      roadmap: parsed.roadmap ?? [],
      competitiveGap: parsed.competitiveGap ?? [],
      contentGaps: parsed.contentGaps ?? [],
      strengthAreas: parsed.strengthAreas ?? [],
      competitorAnalysis: parsed.competitorAnalysis ?? { competitors: [], competitivePosition: '', winningOpportunity: '' },
      platformStrategies: parsed.platformStrategies ?? [],
      contentBlueprint: parsed.contentBlueprint ?? [],
      techImplementations: parsed.techImplementations ?? [],
      topicalAuthorityMap: parsed.topicalAuthorityMap ?? { coreTopics: [], coverageGaps: [], competitorExclusiveTopics: [], quickContentWins: [] },
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Detail analysis error:', error)
    return NextResponse.json({ error: '상세 분석 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
