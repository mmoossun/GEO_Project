import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { buildContentPrompt, PLATFORMS } from '@/lib/content-strategy'
import type { ContentRequest, GeneratedContent } from '@/lib/content-strategy'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const DEPTH_CONFIG: Record<string, { maxTokens: number; minChars: number; maxChars: number; targetChars: string }> = {
  light:  { maxTokens: 1400, minChars: 500,  maxChars: 1000, targetChars: '600-900자' },
  medium: { maxTokens: 2200, minChars: 900,  maxChars: 1700, targetChars: '1000-1500자' },
  deep:   { maxTokens: 4500, minChars: 1800, maxChars: 3200, targetChars: '2000-3000자' },
}

/** Extract hashtags embedded in content body (e.g., "#태그1 #태그2") */
function extractHashtagsFromContent(content: string): string[] {
  const matches = content.match(/#([가-힣a-zA-Z0-9_]+)/g) ?? []
  return matches.map(h => h.slice(1)).filter(h => h.length > 1)
}

/** Smart truncate: cut at sentence boundary near targetLen */
function smartTruncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  const boundaries = ['. ', '.\n', '!\n', '?\n', '\n\n']
  let best = maxLen
  for (const b of boundaries) {
    const idx = text.lastIndexOf(b, maxLen)
    if (idx > maxLen * 0.7) { best = idx + b.length; break }
  }
  return text.slice(0, best).trimEnd()
}

export async function POST(req: NextRequest) {
  try {
    const body: ContentRequest = await req.json()

    if (!body.topic?.trim()) {
      return NextResponse.json({ error: '주제를 입력해주세요.' }, { status: 400 })
    }

    const depthCfg = DEPTH_CONFIG[body.depth] ?? DEPTH_CONFIG.medium
    const platformCfg = PLATFORMS[body.platform]
    const systemPrompt = buildContentPrompt(body)

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: depthCfg.maxTokens,
      temperature: 0.75,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `"${body.topic}" 주제로 콘텐츠를 생성해주세요.

content 필드 분량: ${depthCfg.targetChars} (이 범위를 엄격히 지키세요)
언어: 자연스러운 한국어
형식: JSON만 반환`,
        },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? '{}'
    const parsed: GeneratedContent = JSON.parse(raw)

    // ── Post-processing ───────────────────────────────────────────────────────

    // 1. Hashtag recovery: if array is empty, extract from content body
    let hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : []
    if (hashtags.length === 0 && body.platform !== 'company') {
      hashtags = extractHashtagsFromContent(parsed.content ?? '')
    }
    // For naver_blog, ensure minimum hashtag count
    const [minTags, maxTags] = platformCfg.hashtagRange
    if (body.platform === 'naver_blog' && hashtags.length < 10) {
      // Generate additional generic hashtags based on topic
      const genericTags = [
        body.topic.replace(/\s+/g, ''),
        ...((body.keywords ?? []).slice(0, 3)),
        'SEO최적화', '블로그운영', '마케팅', '콘텐츠마케팅', '온라인마케팅',
        '디지털마케팅', '소셜미디어', '인플루언서', '브랜딩', '트렌드',
      ].filter(t => t && !hashtags.includes(t))
      hashtags = [...hashtags, ...genericTags].slice(0, maxTags)
    }
    // Deduplicate hashtags
    hashtags = [...new Set(hashtags)].slice(0, maxTags || 30)

    // 2. Content length enforcement via smart truncation
    let content = parsed.content ?? ''
    if (content.length > depthCfg.maxChars) {
      content = smartTruncate(content, depthCfg.maxChars)
    }

    const result: GeneratedContent = {
      title: parsed.title ?? body.topic,
      summary: parsed.summary ?? '',
      content,
      hashtags,
      estimated_read_time: parsed.estimated_read_time ?? '약 3분',
      platform_optimization_notes: parsed.platform_optimization_notes ?? '',
      seo_keywords: Array.isArray(parsed.seo_keywords) ? parsed.seo_keywords : [],
      geo_score_estimate: typeof parsed.geo_score_estimate === 'number' ? parsed.geo_score_estimate : 78,
      geo_optimizations_applied: Array.isArray(parsed.geo_optimizations_applied) ? parsed.geo_optimizations_applied : [],
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Content generation error:', error)
    return NextResponse.json(
      { error: '콘텐츠 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    )
  }
}
