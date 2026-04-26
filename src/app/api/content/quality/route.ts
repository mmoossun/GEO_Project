import OpenAI from 'openai'
import { NextRequest } from 'next/server'
import { buildContentPrompt, buildBriefPrompt } from '@/lib/content-strategy'
import {
  buildEvaluationPrompt,
  buildImprovementPrompt,
  type QualityRequest,
  type QualityEvent,
  type EvaluationResult,
} from '@/lib/quality-agent'
import type { GeneratedContent } from '@/lib/content-strategy'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const MAX_ITERATIONS = 5
const PASS_SCORE = 90

const DEPTH_TOKENS: Record<string, { gen: number; improve: number }> = {
  light:  { gen: 3000, improve: 3500 },
  medium: { gen: 5000, improve: 6000 },
  deep:   { gen: 8000, improve: 9000 },
}

export async function POST(req: NextRequest) {
  const body: QualityRequest = await req.json()

  if (!body.topic?.trim()) {
    return new Response(JSON.stringify({ type: 'error', error: '주제를 입력해주세요.' }) + '\n', { status: 400 })
  }

  const encoder = new TextEncoder()
  const depthTokens = DEPTH_TOKENS[body.depth] ?? DEPTH_TOKENS.medium

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: QualityEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }

      let currentContent: GeneratedContent | null = null
      let bestContent: GeneratedContent | null = null
      let lastEvaluation: EvaluationResult | null = null
      let bestScore = 0
      let finalScore = 0
      const improvementSummary: string[] = []

      try {
        // ── STEP 0: Content Brief (pre-planning for quality) ──────────────────
        send({ type: 'briefing', message: '콘텐츠 브리프 생성 중 (퀄리티 계획)...' })

        let contentBrief = ''
        try {
          const briefRes = await openai.chat.completions.create({
            model: 'gpt-4o',
            max_tokens: 1200,
            temperature: 0.6,
            response_format: { type: 'json_object' },
            messages: [{ role: 'user', content: buildBriefPrompt(body) }],
          })
          contentBrief = briefRes.choices[0]?.message?.content ?? ''
        } catch {
          // Brief generation is optional — proceed without it
          contentBrief = ''
        }

        // ── MAIN LOOP ─────────────────────────────────────────────────────────
        for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
          send({ type: 'generating', iteration, message: iteration === 1 ? '초기 콘텐츠 작성 중...' : `${iteration}차 개선 작성 중...` })

          if (iteration === 1) {
            const genPrompt = buildContentPrompt({
              platform: body.platform,
              depth: body.depth,
              topic: body.topic,
              keywords: body.keywords,
              tone: body.tone,
              targetAudience: body.targetAudience,
              serviceContext: body.serviceContext,
              contentBrief,
            })

            const genRes = await openai.chat.completions.create({
              model: 'gpt-4o',
              max_tokens: depthTokens.gen,
              temperature: 0.72,
              response_format: { type: 'json_object' },
              messages: [
                { role: 'system', content: genPrompt },
                {
                  role: 'user',
                  content: `"${body.topic}" 주제로 즉시 업로드 가능한 퀄리티의 콘텐츠를 작성해주세요.

필수 요건:
- 구체적 수치/데이터 최소 2개
- 실제 사례 (가상 사례 금지)
- 바로 실행 가능한 팁 3개 이상
- AI 패턴 문장 금지 ("이 글에서는...", "첫째 둘째...")
- 자연스러운 한국어 (진짜 사람이 쓴 것처럼)

JSON만 반환.`,
                },
              ],
            })
            currentContent = JSON.parse(genRes.choices[0]?.message?.content ?? '{}')

          } else {
            const contentToImprove = bestContent ?? currentContent!
            const improvePrompt = buildImprovementPrompt(contentToImprove, lastEvaluation!, body, iteration)
            const improveRes = await openai.chat.completions.create({
              model: 'gpt-4o',
              max_tokens: depthTokens.improve,
              temperature: 0.65,
              response_format: { type: 'json_object' },
              messages: [{ role: 'user', content: improvePrompt }],
            })
            currentContent = JSON.parse(improveRes.choices[0]?.message?.content ?? '{}')
            improvementSummary.push(`${iteration}차: ${(lastEvaluation?.improvement_suggestions ?? []).slice(0, 2).join(', ')}`)
          }

          // ── Evaluate ───────────────────────────────────────────────────────
          send({ type: 'evaluating', iteration, message: `${iteration}차 품질 평가 중...` })

          const evalPrompt = buildEvaluationPrompt(currentContent!, body)
          const evalRes = await openai.chat.completions.create({
            model: 'gpt-4o',
            max_tokens: 1500,
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [{ role: 'user', content: evalPrompt }],
          })

          const evaluation: EvaluationResult = JSON.parse(evalRes.choices[0]?.message?.content ?? '{}')

          const recalcTotal = Object.values(evaluation.score_breakdown ?? {}).reduce((s, v) => s + (v as number), 0)
          evaluation.total_score = typeof evaluation.total_score === 'number' ? evaluation.total_score : recalcTotal
          evaluation.pass = evaluation.total_score >= PASS_SCORE

          if (evaluation.total_score >= bestScore) {
            bestScore = evaluation.total_score
            bestContent = currentContent
          }
          finalScore = bestScore
          lastEvaluation = evaluation

          send({
            type: 'score',
            iteration,
            total: evaluation.total_score,
            pass: evaluation.pass,
            breakdown: evaluation.score_breakdown,
            reasons: evaluation.fail_reasons ?? [],
            suggestions: evaluation.improvement_suggestions ?? [],
          })

          if (evaluation.pass) break

          if (iteration < MAX_ITERATIONS) {
            const weakAreas = Object.entries(evaluation.score_breakdown ?? {})
              .map(([k, v]) => ({ key: k, gap: (v as number) }))
              .sort((a, b) => a.gap - b.gap)
              .slice(0, 2)
              .map(w => w.key)

            send({
              type: 'improving',
              iteration: iteration + 1,
              message: `${iteration + 1}차 개선 (약점: ${(lastEvaluation.fail_reasons ?? []).slice(0, 2).join(', ')})`,
              weakAreas,
            })
          }
        }

        send({
          type: 'complete',
          content: bestContent ?? currentContent!,
          finalScore: bestScore,
          totalIterations: improvementSummary.length + 1,
          improvementSummary,
        })
      } catch (err) {
        console.error('Quality agent error:', err)
        send({ type: 'error', error: err instanceof Error ? err.message : '품질 에이전트 오류가 발생했습니다.' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
