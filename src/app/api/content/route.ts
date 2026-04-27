import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { buildContentPrompt, PLATFORMS } from '@/lib/content-strategy'
import type { ContentRequest, GeneratedContent } from '@/lib/content-strategy'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const DEPTH_CONFIG: Record<string, { maxTokens: number; minChars: number; maxChars: number; targetChars: string }> = {
  light:  { maxTokens: 3000, minChars:  600, maxChars: 1200, targetChars: '700-1000자' },
  medium: { maxTokens: 5000, minChars: 1400, maxChars: 2500, targetChars: '1500-2000자' },
  deep:   { maxTokens: 8000,  minChars: 2600, maxChars: 4000,  targetChars: '2800-3500자' },
  ultra:  { maxTokens: 16000, minChars: 4800, maxChars: 8000,  targetChars: '5000-7000자' },
}

function extractHashtagsFromContent(content: string): string[] {
  const matches = content.match(/#([가-힣a-zA-Z0-9_]+)/g) ?? []
  return matches.map(h => h.slice(1)).filter(h => h.length > 1)
}

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
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `"${body.topic}" 주제로 콘텐츠를 작성해주세요.

요구 분량: ${depthCfg.targetChars} (반드시 충족)
언어: 자연스러운 한국어
핵심: 즉시 업로드 가능한 퀄리티 — 구체적 수치, 실제 예시, 독자가 오늘 바로 실행할 수 있는 팁 포함

JSON만 반환.`,
        },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? '{}'
    const parsed: GeneratedContent = JSON.parse(raw)

    // Hashtag recovery
    let hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : []
    if (hashtags.length === 0 && body.platform !== 'company') {
      hashtags = extractHashtagsFromContent(parsed.content ?? '')
    }
    const [, maxTags] = platformCfg.hashtagRange
    if (body.platform === 'naver_blog' && hashtags.length < 10) {
      const genericTags = [
        body.topic.replace(/\s+/g, ''),
        ...((body.keywords ?? []).slice(0, 3)),
        'SEO최적화', '블로그운영', '마케팅', '콘텐츠마케팅', '온라인마케팅',
        '디지털마케팅', '소셜미디어', '인플루언서', '브랜딩', '트렌드',
      ].filter(t => t && !hashtags.includes(t))
      hashtags = [...hashtags, ...genericTags].slice(0, maxTags)
    }
    hashtags = [...new Set(hashtags)].slice(0, maxTags || 30)

    // Length enforcement
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
      geo_score_estimate: typeof parsed.geo_score_estimate === 'number' ? parsed.geo_score_estimate : 75,
      geo_optimizations_applied: Array.isArray(parsed.geo_optimizations_applied) ? parsed.geo_optimizations_applied : [],
      unique_angle: parsed.unique_angle ?? '',
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Content generation error:', error)
    return NextResponse.json({ error: '콘텐츠 생성 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
