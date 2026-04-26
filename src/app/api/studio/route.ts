import OpenAI from 'openai'
import { NextRequest } from 'next/server'
import type { StudioInput, GeneratedContent, StudioEvent } from '@/lib/studio-types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const PURPOSE_LABELS: Record<string, string> = {
  blog: '블로그 포스트 (정보 전달 + 경험 공유)',
  marketing: '마케팅 콘텐츠 (설득 + 전환)',
  technical: '기술 아티클 (전문 지식 전달)',
  news: '뉴스/보도 (사실 기반 보도)',
  social: '소셜 미디어 콘텐츠 (짧고 임팩트)',
}

const TONE_LABELS: Record<string, string> = {
  professional: '전문적이고 권위있는',
  friendly: '친근하고 경험 기반의',
  marketing: '마케팅형, 설득력 있는',
  casual: '캐주얼하고 편안한',
  academic: '학술적이고 논리적인',
}

// ─── Step 1: Analyze images with GPT-4o Vision ──────────────────────────────

async function analyzeImage(dataUrl: string, description: string, purpose: string) {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: dataUrl, detail: 'low' },
        },
        {
          type: 'text',
          text: `이 이미지를 분석해주세요.
사용자 설명: "${description}"
사용 목적: ${purpose}

JSON만 반환:
{
  "caption": "이미지에 대한 자연스러운 한국어 캡션 (1-2문장)",
  "altText": "스크린리더용 alt 텍스트 (1문장)",
  "contentSuggestion": "이 이미지를 본문에서 어떻게 활용하면 좋을지 1문장 제안"
}`,
        },
      ],
    }],
    response_format: { type: 'json_object' },
  })
  return JSON.parse(res.choices[0]?.message?.content ?? '{}')
}

// ─── Step 2: Generate structure (title, outline) ────────────────────────────

async function generateStructure(input: StudioInput, imageAnalyses: Record<string, { caption: string; altText: string; contentSuggestion: string }>, refSummaries: Record<string, { title: string; summary: string; keyPoints: string[] }>) {
  const imagesDesc = input.images.map(img => {
    const analysis = imageAnalyses[img.id]
    return `- 이미지 ID [${img.id}]: ${img.description} (목적: ${img.purpose})\n  AI 분석: ${analysis?.contentSuggestion ?? img.description}`
  }).join('\n')

  const refsDesc = input.references.map(ref => {
    const summary = refSummaries[ref.id]
    return `- 참고자료 ID [${ref.id}]: ${ref.url}\n  제목: ${summary?.title ?? ref.url}\n  핵심포인트: ${summary?.keyPoints?.join(' / ') ?? ''}\n  반영 포인트: ${ref.reflectionPoint}`
  }).join('\n')

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1000,
    response_format: { type: 'json_object' },
    messages: [{
      role: 'user',
      content: `콘텐츠 구조를 설계해주세요.

주제: ${input.topic}
목적: ${PURPOSE_LABELS[input.contentPurpose] ?? input.contentPurpose}
톤: ${TONE_LABELS[input.tone] ?? input.tone}
플랫폼: ${input.platform}
타겟: ${input.targetAudience || '일반 독자'}
${input.additionalNotes ? `추가 요구사항: ${input.additionalNotes}` : ''}

보유 이미지 (${input.images.length}개):
${imagesDesc || '없음'}

참고자료 (${input.references.length}개):
${refsDesc || '없음'}

다음을 설계해주세요:
1. 최적화된 제목 (GEO + 플랫폼 최적화)
2. 메타 설명 (150자 이내)
3. 섹션 구조 (각 섹션에 이미지 배치 계획 포함)

JSON만 반환:
{
  "title": "최적화된 제목",
  "metaDescription": "메타 설명 150자 이내",
  "outline": [
    {
      "id": "s1",
      "heading": "섹션 제목",
      "level": 2,
      "purpose": "이 섹션의 역할",
      "imageIds": ["이미지 ID (있으면)"],
      "referenceIds": ["참고자료 ID (있으면)"]
    }
  ],
  "tags": ["태그1", "태그2", "태그3"]
}`,
    }],
  })
  return JSON.parse(res.choices[0]?.message?.content ?? '{}')
}

// ─── Step 3: Generate full content ──────────────────────────────────────────

async function generateContent(
  input: StudioInput,
  structure: { title: string; metaDescription: string; outline: Array<{ id: string; heading: string; level: number; purpose: string; imageIds: string[]; referenceIds: string[] }>; tags: string[] },
  imageAnalyses: Record<string, { caption: string; altText: string; contentSuggestion: string }>,
  refSummaries: Record<string, { title: string; summary: string; keyPoints: string[]; quotable: string }>,
): Promise<GeneratedContent> {
  const imageContext = input.images.map(img => {
    const a = imageAnalyses[img.id]
    return `이미지 [${img.id}]: 설명="${img.description}", 캡션="${a?.caption}", alt="${a?.altText}"`
  }).join('\n')

  const refContext = input.references.map(ref => {
    const s = refSummaries[ref.id]
    return `참고자료 [${ref.id}]\n  URL: ${ref.url}\n  요약: ${s?.summary ?? ''}\n  핵심포인트: ${s?.keyPoints?.join(' · ') ?? ''}\n  인용구: ${s?.quotable ?? ''}`
  }).join('\n\n')

  const outlineText = structure.outline.map(s =>
    `섹션 "${s.heading}" (레벨 H${s.level}): ${s.purpose}${s.imageIds?.length ? ` | 이미지: ${s.imageIds.join(', ')}` : ''}${s.referenceIds?.length ? ` | 참고: ${s.referenceIds.join(', ')}` : ''}`
  ).join('\n')

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 5000,
    response_format: { type: 'json_object' },
    messages: [{
      role: 'system',
      content: `당신은 전문 콘텐츠 작가입니다. 톤: ${TONE_LABELS[input.tone]}.
이미지 배치 규칙: 이미지를 넣을 위치에 정확히 [IMG:이미지ID:캡션텍스트] 형식으로 마커를 삽입하세요.
참고자료 인용 규칙: 참고자료 인용 시 문장 끝에 [REF:참고자료ID] 형식으로 표시하세요.
GEO 최적화 필수: 답변 캡슐(첫 단락에 핵심 요약), H2/H3 계층 구조, FAQ 섹션 포함.`,
    }, {
      role: 'user',
      content: `다음 구조로 완성된 콘텐츠를 작성해주세요.

제목: ${structure.title}
주제: ${input.topic}
목적: ${PURPOSE_LABELS[input.contentPurpose]}
타겟: ${input.targetAudience || '일반 독자'}
플랫폼: ${input.platform}

섹션 구조:
${outlineText}

이미지 정보:
${imageContext || '없음'}

참고자료:
${refContext || '없음'}

JSON만 반환:
{
  "title": "${structure.title}",
  "metaDescription": "${structure.metaDescription}",
  "summary": "2-3문장 핵심 요약 (Answer Capsule)",
  "sections": [
    {
      "id": "s1",
      "heading": "섹션 제목",
      "level": 2,
      "content": "섹션 본문 (마크다운 형식, [IMG:id:캡션] 및 [REF:id] 마커 포함)",
      "images": [{"imageId": "img_id", "caption": "캡션", "altText": "alt", "position": "before|after|inline"}],
      "referenceIds": ["ref_id"]
    }
  ],
  "references": [
    {"id": "ref_id", "url": "url", "title": "제목", "summary": "요약", "usedInSections": ["s1"]}
  ],
  "tags": ${JSON.stringify(structure.tags ?? [])},
  "estimatedReadTime": "약 X분",
  "geoOptimizations": ["적용된 GEO 최적화 기법1", "기법2"]
}`,
    }],
  })

  return JSON.parse(res.choices[0]?.message?.content ?? '{}')
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const input: StudioInput = await req.json()

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StudioEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))

      try {
        const imageAnalyses: Record<string, { caption: string; altText: string; contentSuggestion: string }> = {}
        const refSummaries: Record<string, { title: string; summary: string; keyPoints: string[]; quotable: string }> = {}

        // ── Step 1: Analyze images (parallel) ─────────────────────────────
        if (input.images.length > 0) {
          send({ type: 'step', message: `이미지 ${input.images.length}개 분석 중...` })
          await Promise.all(
            input.images.slice(0, 5).map(async img => {
              try {
                const analysis = await analyzeImage(img.dataUrl, img.description, img.purpose)
                imageAnalyses[img.id] = analysis
                send({ type: 'image_analyzed', imageId: img.id, message: `이미지 분석 완료: ${img.filename}` })
              } catch {
                imageAnalyses[img.id] = { caption: img.description, altText: img.description, contentSuggestion: img.description }
              }
            })
          )
        }

        // ── Step 2: Fetch reference summaries (parallel) ───────────────────
        if (input.references.length > 0) {
          send({ type: 'step', message: `참고자료 ${input.references.length}개 처리 중...` })
          await Promise.all(
            input.references.slice(0, 5).map(async ref => {
              try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/studio/references`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url: ref.url, reflectionPoint: ref.reflectionPoint }),
                })
                const data = await res.json()
                refSummaries[ref.id] = data
                send({ type: 'reference_fetched', refId: ref.id, message: `참고자료 처리 완료: ${data.title ?? ref.url}` })
              } catch {
                refSummaries[ref.id] = { title: ref.url, summary: ref.reflectionPoint || '참고자료', keyPoints: [], quotable: '' }
              }
            })
          )
        }

        // ── Step 3: Generate structure ─────────────────────────────────────
        send({ type: 'step', message: '콘텐츠 구조 설계 중...' })
        const structure = await generateStructure(input, imageAnalyses, refSummaries)
        send({ type: 'structure_ready', message: `구조 완성: "${structure.title}"` })

        // ── Step 4: Generate full content ──────────────────────────────────
        send({ type: 'step', message: '본문 작성 중...' })
        const content = await generateContent(input, structure, imageAnalyses, refSummaries)

        // Merge image analysis data into content
        if (content.sections) {
          for (const section of content.sections) {
            if (section.images) {
              for (const img of section.images) {
                const a = imageAnalyses[img.imageId]
                if (a) {
                  if (!img.caption) img.caption = a.caption
                  if (!img.altText) img.altText = a.altText
                }
              }
            }
          }
        }

        send({ type: 'complete', data: content })
      } catch (err) {
        send({ type: 'error', error: err instanceof Error ? err.message : '생성 오류' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
