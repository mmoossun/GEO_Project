import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { getGrade, getVisibilityLevel } from '@/lib/utils'
import { getCategoryInfo } from '@/lib/constants'
import type { GEOAnalysisResult } from '@/lib/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── Real HTML parser (same logic as analyze-url) ────────────────────────────

function stripTags(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
function getMeta(html: string, name: string) {
  return (
    html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)`, 'i'))?.[1] ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'))?.[1] ??
    ''
  )
}

function parseRealPageData(html: string) {
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? ''
  const metaDesc = getMeta(html, 'description')
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html)
  const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html)

  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => stripTags(m[1]).slice(0, 120))
  const h2Count = (html.match(/<h2[\s>]/gi) ?? []).length
  const h3Count = (html.match(/<h3[\s>]/gi) ?? []).length
  const hasNav = /<nav[\s>]/i.test(html)
  const btnCount = (html.match(/<button[\s>]/gi) ?? []).length
  const formCount = (html.match(/<form[\s>]/gi) ?? []).length
  const imgCount = (html.match(/<img[\s>]/gi) ?? []).length
  const imgsWithAlt = (html.match(/<img[^>]+alt=["'][^"']+["']/gi) ?? []).length

  const schemaBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  const schemaTypes = schemaBlocks.map(m => { try { return JSON.parse(m[1])?.['@type'] ?? 'Unknown' } catch { return null } }).filter(Boolean)

  const hasFAQ = /<details|faq|accordion/i.test(html) || /FAQ|자주\s*묻는/i.test(html)
  const bodyText = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
  const wordCount = stripTags(bodyText).split(/\s+/).filter(w => w.length > 1).length
  const hasOG = /<meta[^>]+property=["']og:/i.test(html)
  const isHttps = true // server-side fetch was successful with https

  return {
    title, metaDesc, hasViewport, hasCanonical,
    h1Count: h1s.length, h1Text: h1s[0] ?? '',
    h2Count, h3Count, hasNav,
    btnCount, formCount, imgCount, imgsWithAlt,
    schemaTypes, hasFAQ, wordCount, hasOG, isHttps,
  }
}

// ─── System prompt for REAL content analysis ─────────────────────────────────

const REAL_ANALYSIS_PROMPT = `You are a GEO (Generative Engine Optimization) expert analyzing a real website's actual content signals.
GEO = optimizing content so AI search engines (ChatGPT, Perplexity, Gemini) cite it.

You are scoring ACTUAL extracted data from a real page — NOT estimating.
Score each dimension strictly based on the provided data.

Scoring rules:
- h1Count=0 → structure.score deduct 4-6pts
- schemaTypes=[] → technical.score deduct 6-8pts
- metaDesc='' → technical.score deduct 3pts
- hasFAQ=false → structure/readability deduct 2-3pts
- imgsWithAlt < imgCount/2 → readability deduct 2pts
- wordCount < 300 → eeat.score low (thin content)
- wordCount > 2000 → eeat.score higher
- hasViewport=false → readability deduct 3pts

Return ONLY valid JSON.`

const ESTIMATION_PROMPT = `You are a GEO (Generative Engine Optimization) analyst.
GEO = optimizing content so AI search engines (ChatGPT, Perplexity, Gemini) cite it.

IMPORTANT: No URL was provided. You are making an EDUCATED ESTIMATE based on your knowledge of this specific service.
This is NOT a measurement — it is an AI-powered inference of likely GEO readiness.

Score based on what you actually know about this specific service. Scores must differ meaningfully between different services.
DO NOT regress to industry averages — individual services range from 25 to 90.

Return ONLY valid JSON.`

const OUTPUT_SCHEMA = `
{
  "totalScore": <integer>,
  "analysisMode": "real_url|estimation",
  "dimensions": [
    {"id":"structure","nameKo":"콘텐츠 구조","score":<0-20>,"maxScore":20,"observations":["<Korean>","<Korean>","<Korean>"],"improvements":["<Korean>","<Korean>"]},
    {"id":"eeat","nameKo":"E-E-A-T 신뢰성","score":<0-25>,"maxScore":25,"observations":["<Korean>","<Korean>","<Korean>"],"improvements":["<Korean>","<Korean>"]},
    {"id":"technical","nameKo":"기술 신호","score":<0-20>,"maxScore":20,"observations":["<Korean>","<Korean>","<Korean>"],"improvements":["<Korean>","<Korean>"]},
    {"id":"freshness","nameKo":"최신성","score":<0-15>,"maxScore":15,"observations":["<Korean>","<Korean>"],"improvements":["<Korean>","<Korean>"]},
    {"id":"readability","nameKo":"가독성","score":<0-20>,"maxScore":20,"observations":["<Korean>","<Korean>","<Korean>"],"improvements":["<Korean>","<Korean>"]}
  ],
  "summary":"<2-3 Korean sentences — mention service name and specific findings>",
  "topIssues":["<Korean specific>","<Korean specific>","<Korean specific>"],
  "recommendations":[
    {"priority":"critical","title":"<Korean>","description":"<Korean>","expectedImpact":"<+Xpt>","effort":"low|medium|high"},
    {"priority":"high","title":"<Korean>","description":"<Korean>","expectedImpact":"<+Xpt>","effort":"low|medium|high"},
    {"priority":"high","title":"<Korean>","description":"<Korean>","expectedImpact":"<+Xpt>","effort":"low|medium|high"},
    {"priority":"medium","title":"<Korean>","description":"<Korean>","expectedImpact":"<+Xpt>","effort":"low|medium|high"}
  ],
  "citationProbability":<integer>,
  "competitiveInsight":"<Korean>",
  "quickWins":["<Korean>","<Korean>","<Korean>"]
}`

// ─── Route ────────────────────────────────────────────────────────────────────

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
    let analysisMode: 'real_url' | 'estimation' = 'estimation'
    let pageDataContext = ''

    // ── PATH A: Real HTML analysis (URL provided) ─────────────────────────────
    if (url?.startsWith('http')) {
      try {
        const fetchRes = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GEOScoreBot/1.0)', 'Accept': 'text/html' },
          signal: AbortSignal.timeout(10000),
        })
        if (fetchRes.ok) {
          const html = await fetchRes.text()
          const pd = parseRealPageData(html)
          analysisMode = 'real_url'
          pageDataContext = `
ACTUAL PAGE DATA (fetched from ${url}):
- Title: "${pd.title || '없음'}"
- Meta Description: "${pd.metaDesc || '없음 (missing!)'}"
- H1 tags: ${pd.h1Count}개 (text: "${pd.h1Text}")
- H2 tags: ${pd.h2Count}개 / H3 tags: ${pd.h3Count}개
- Navigation: ${pd.hasNav ? '있음' : '없음'}
- Schema Markup (JSON-LD): ${pd.schemaTypes.length > 0 ? pd.schemaTypes.join(', ') : '없음 (critical missing!)'}
- FAQ sections: ${pd.hasFAQ ? '있음' : '없음'}
- Images: ${pd.imgCount}개 (alt 있음: ${pd.imgsWithAlt}, alt 없음: ${pd.imgCount - pd.imgsWithAlt})
- Forms: ${pd.formCount}개
- Word count (approx): ~${pd.wordCount}
- Mobile viewport: ${pd.hasViewport ? '있음' : '없음'}
- OG tags: ${pd.hasOG ? '있음' : '없음'}
- Canonical: ${pd.hasCanonical ? '있음' : '없음'}

Score dimensions based STRICTLY on this actual data.`
        }
      } catch {
        // URL failed, fall through to estimation
      }
    }

    // ── PATH B: Estimation (no URL or fetch failed) ────────────────────────────
    if (analysisMode === 'estimation') {
      pageDataContext = `
No URL provided or page unreachable. Make an EDUCATED ESTIMATE based on your knowledge of "${serviceName}".
- Use what you know about this specific company's content strategy
- If you know little about this service, score conservatively (40-55 range)
- Scores MUST differ from other services — do not regress to ${catInfo.avgScore} (industry avg)
${previousScore != null ? `- Previously scored ${previousScore}. Re-analyze independently.` : ''}`
    }

    const systemPrompt = analysisMode === 'real_url' ? REAL_ANALYSIS_PROMPT : ESTIMATION_PROMPT

    const userMessage = `Analyze "${serviceName}" (${catInfo.label} category) for GEO optimization.
${pageDataContext}

Return JSON matching this schema:
${OUTPUT_SCHEMA}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 3500,
      temperature: analysisMode === 'real_url' ? 0.2 : 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw)

    const totalScore = parsed.totalScore ??
      (parsed.dimensions ?? []).reduce((s: number, d: { score: number }) => s + d.score, 0) ?? 50
    const grade = getGrade(totalScore)

    const result: GEOAnalysisResult & { analysisMode: string } = {
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
      analysisMode,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Analyze error:', error)
    return NextResponse.json({ error: '분석 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
