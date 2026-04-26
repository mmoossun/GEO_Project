import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── HTML Parser ─────────────────────────────────────────────────────────────

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function extractMeta(html: string, name: string): string {
  return (
    html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)`, 'i'))?.[1] ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'))?.[1] ??
    ''
  )
}

function parsePageData(html: string, url: string) {
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? ''
  const metaDesc = extractMeta(html, 'description')
  const metaKeywords = extractMeta(html, 'keywords')
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html)
  const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html)
  const hasHreflang = /<link[^>]+hreflang/i.test(html)

  // Headings
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => stripTags(m[1]).slice(0, 100))
  const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => stripTags(m[1]).slice(0, 80))
  const h3s = [...html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)].map(m => stripTags(m[1]).slice(0, 80))

  // Navigation
  const hasNav = /<nav[\s>]/i.test(html)
  const navLinks = [...html.matchAll(/<nav[\s\S]*?<\/nav>/gi)]
    .flatMap(m => [...m[0].matchAll(/<a[^>]*>([^<]+)<\/a>/gi)].map(a => a[1].trim()))
    .slice(0, 10)

  // CTAs
  const buttons = [...html.matchAll(/<button[^>]*>([^<]+)<\/button>/gi)].map(m => m[1].trim()).slice(0, 8)
  const ctaLinks = [...html.matchAll(/<a[^>]+(btn|button|cta)[^>]*>([^<]+)<\/a>/gi)].map(m => m[2].trim()).slice(0, 8)

  // Forms
  const formCount = (html.match(/<form[\s>]/gi) ?? []).length
  const inputCount = (html.match(/<input[^>]+type=["']?(text|email|tel|password)/gi) ?? []).length

  // Images
  const imgCount = (html.match(/<img[\s>]/gi) ?? []).length
  const imgsWithAlt = (html.match(/<img[^>]+alt=["'][^"']+["']/gi) ?? []).length
  const imgsWithoutAlt = imgCount - imgsWithAlt

  // Schema markup
  const schemaBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  const schemaTypes = schemaBlocks.map(m => {
    try { return JSON.parse(m[1])?.['@type'] ?? 'Unknown' } catch { return 'Unknown' }
  })

  // FAQ detection
  const hasFAQ = /<details|faq|accordion|collapse/i.test(html) || /FAQ|자주\s*묻는|frequently\s*asked/i.test(html)

  // Word count (approx)
  const bodyText = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
  const wordCount = stripTags(bodyText).split(/\s+/).filter(w => w.length > 1).length

  // Links
  const internalLinks = [...html.matchAll(/href=["'](?!http|mailto|#)([^"']+)/gi)].length
  const externalLinks = (html.match(/href=["']https?:\/\//gi) ?? []).length

  // OG tags
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1] ?? ''
  const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i)?.[1] ?? ''

  // HTTPS
  const isHttps = url.startsWith('https://')

  return {
    title, metaDesc, metaKeywords, hasViewport, hasCanonical, hasHreflang,
    h1s, h2s: h2s.slice(0, 6), h3s: h3s.slice(0, 6),
    hasNav, navLinks,
    buttons, ctaLinks,
    formCount, inputCount,
    imgCount, imgsWithAlt, imgsWithoutAlt,
    schemaTypes,
    hasFAQ, wordCount,
    internalLinks, externalLinks,
    ogTitle, ogDesc, isHttps,
  }
}

// ─── Prompt ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior UX designer and GEO (Generative Engine Optimization) expert specializing in Korean and global web services.

Analyze a website's UI/UX and GEO readiness based on extracted page data and HTML sample.

GEO = Generative Engine Optimization: optimizing content to be cited by AI search engines (ChatGPT, Perplexity, Gemini). NOT geographic optimization.

## SCORING DIMENSIONS (100pts total)

### 1. 정보 구조 (Information Architecture) — 25pts
- H1 quality & uniqueness: /8
- Heading hierarchy (H1→H2→H3): /7
- Navigation clarity: /5
- Content organization: /5

### 2. 전환 최적화 (Conversion & CTA) — 20pts
- CTA presence & clarity: /8
- Form usability: /6
- Value proposition clarity: /6

### 3. 콘텐츠 품질 (Content Quality) — 20pts
- Content depth & word count: /7
- Readability signals: /7
- FAQ / help content: /6

### 4. 기술적 UX (Technical UX) — 15pts
- Meta tags completeness: /5
- Mobile/viewport signals: /4
- Open Graph / Social: /3
- Accessibility (alt texts): /3

### 5. GEO 최적화 (GEO Readiness) — 20pts
- Schema markup: /7
- Answer capsule / direct answer patterns: /5
- E-E-A-T signals: /4
- AI-crawlable structure: /4

## RESPONSE FORMAT
Return ONLY valid JSON (no markdown):
{
  "overallScore": <0-100>,
  "pageInsight": "<3-4 sentence Korean summary of key findings>",
  "dimensions": [
    {
      "id": "ia|conversion|content|technical|geo",
      "nameKo": "정보 구조|전환 최적화|콘텐츠 품질|기술적 UX|GEO 최적화",
      "score": <integer>,
      "maxScore": 25|20|20|15|20,
      "findings": ["<Korean finding 1>", "<Korean finding 2>", "<Korean finding 3>"],
      "recommendations": ["<Korean specific action 1>", "<Korean specific action 2>"]
    }
  ],
  "criticalIssues": ["<Korean critical issue 1>", "<Korean critical issue 2>"],
  "quickWins": ["<Korean quick win 1>", "<Korean quick win 2>", "<Korean quick win 3>"],
  "recommendations": [
    {
      "priority": "critical|high|medium",
      "category": "<Korean category>",
      "title": "<Korean title>",
      "description": "<Korean description>",
      "expectedImpact": "<Korean impact e.g. 전환율 +15% 예상>",
      "implementation": "<Korean step-by-step implementation>"
    }
  ]
}`

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json() as { url: string }

    if (!url?.startsWith('http')) {
      return NextResponse.json({ error: '유효한 URL을 입력해주세요. (http:// 또는 https:// 로 시작)' }, { status: 400 })
    }

    // ── Fetch the URL ─────────────────────────────────────────────────────────
    let html = ''
    let fetchError = ''
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GEOScoreBot/1.0; +https://geo-score.vercel.app)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(12000),
      })
      if (!response.ok) {
        fetchError = `HTTP ${response.status}: 페이지를 불러올 수 없습니다.`
      } else {
        html = await response.text()
      }
    } catch (e) {
      fetchError = e instanceof Error
        ? (e.name === 'TimeoutError' ? '페이지 로딩 시간 초과 (12초). URL이 접근 가능한지 확인해주세요.' : `페이지 접근 실패: ${e.message}`)
        : '알 수 없는 오류'
    }

    if (fetchError) {
      return NextResponse.json({ error: fetchError }, { status: 422 })
    }

    // ── Parse HTML ────────────────────────────────────────────────────────────
    const pageData = parsePageData(html, url)
    const htmlSample = html.slice(0, 6000)

    // ── GPT-4o Analysis ───────────────────────────────────────────────────────
    const userMessage = `Analyze this website for UI/UX and GEO optimization:

URL: ${url}
HTTPS: ${pageData.isHttps}

## PAGE DATA SUMMARY
Title: ${pageData.title || '없음'}
Meta Description: ${pageData.metaDesc || '없음 (critical!)'}
Word Count: ~${pageData.wordCount}

Headings:
  H1 (${pageData.h1s.length}개): ${pageData.h1s.join(' | ') || '없음 (critical!)'}
  H2 (${pageData.h2s.length}개): ${pageData.h2s.join(' | ') || '없음'}
  H3 (${pageData.h3s.length}개): ${pageData.h3s.join(' | ') || '없음'}

Navigation: ${pageData.hasNav ? '있음' : '없음'} | Links: ${pageData.navLinks.join(', ') || '미감지'}
CTAs/Buttons: ${[...pageData.buttons, ...pageData.ctaLinks].join(', ') || '없음'}
Forms: ${pageData.formCount}개 (inputs: ${pageData.inputCount})

Images: ${pageData.imgCount}개 (alt 있음: ${pageData.imgsWithAlt}, alt 없음: ${pageData.imgsWithoutAlt})
Schema Markup: ${pageData.schemaTypes.length > 0 ? pageData.schemaTypes.join(', ') : '없음 (critical!)'}
FAQ 섹션: ${pageData.hasFAQ ? '있음' : '없음'}
Mobile Viewport: ${pageData.hasViewport ? '있음' : '없음'}
Canonical: ${pageData.hasCanonical ? '있음' : '없음'}
OG Tags: ${pageData.ogTitle ? '있음' : '없음'}

## HTML SAMPLE (first 6000 chars):
${htmlSample}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 3000,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw)

    return NextResponse.json({
      url,
      pageTitle: pageData.title,
      analyzedAt: new Date().toISOString(),
      pageData,
      ...parsed,
    })
  } catch (error) {
    console.error('URL analyze error:', error)
    return NextResponse.json({ error: '분석 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
