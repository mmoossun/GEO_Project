import OpenAI from 'openai'
import { NextRequest } from 'next/server'
import { buildContentPrompt } from '@/lib/content-strategy'
import {
  buildEvaluationPrompt,
  buildImprovementPrompt,
  type QualityRequest,
  type QualityEvent,
  type EvaluationResult,
} from '@/lib/quality-agent'
import type { GeneratedContent } from '@/lib/content-strategy'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const MAX_ITERATIONS = 3
const PASS_SCORE = 90

export async function POST(req: NextRequest) {
  const body: QualityRequest = await req.json()

  if (!body.topic?.trim()) {
    return new Response(JSON.stringify({ type: 'error', error: '주제를 입력해주세요.' }) + '\n', { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: QualityEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }

      let currentContent: GeneratedContent | null = null
      let bestContent: GeneratedContent | null = null   // track best version
      let lastEvaluation: EvaluationResult | null = null
      let bestScore = 0
      let finalScore = 0
      const improvementSummary: string[] = []

      try {
        for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
          // ── STEP 1: Generate or Improve ──────────────────────────────────
          send({ type: 'generating', iteration, message: iteration === 1 ? '초기 콘텐츠 생성 중...' : `${iteration}차 개선 콘텐츠 작성 중...` })

          if (iteration === 1) {
            const genPrompt = buildContentPrompt({
              platform: body.platform,
              depth: body.depth,
              topic: body.topic,
              keywords: body.keywords,
              tone: body.tone,
              targetAudience: body.targetAudience,
              serviceContext: body.serviceContext,
            })

            const genRes = await openai.chat.completions.create({
              model: 'gpt-4o',
              max_tokens: 4000,
              temperature: 0.8,
              response_format: { type: 'json_object' },
              messages: [
                { role: 'system', content: genPrompt },
                { role: 'user', content: `"${body.topic}" 주제로 콘텐츠를 생성해주세요. 반드시 자연스러운 한국어로 작성하세요.` },
              ],
            })
            currentContent = JSON.parse(genRes.choices[0]?.message?.content ?? '{}')
          } else {
            // Improve using best-scoring content so far (prevents regression)
            const contentToImprove = bestContent ?? currentContent!
            const evalToUse = lastEvaluation!
            const improvePrompt = buildImprovementPrompt(contentToImprove, evalToUse, body, iteration)
            const improveRes = await openai.chat.completions.create({
              model: 'gpt-4o',
              max_tokens: 4500,
              temperature: 0.7,
              response_format: { type: 'json_object' },
              messages: [
                { role: 'user', content: improvePrompt },
              ],
            })
            const improved = JSON.parse(improveRes.choices[0]?.message?.content ?? '{}')
            improvementSummary.push(`${iteration}차 개선: ${evalToUse.improvement_suggestions.slice(0, 2).join(', ')}`)
            currentContent = improved
          }

          // ── STEP 2: Evaluate ─────────────────────────────────────────────
          send({ type: 'evaluating', iteration, message: `${iteration}차 품질 평가 중...` })

          const evalPrompt = buildEvaluationPrompt(currentContent!, body)
          const evalRes = await openai.chat.completions.create({
            model: 'gpt-4o',
            max_tokens: 1200,
            temperature: 0.1,   // lower temperature for more consistent evaluation
            response_format: { type: 'json_object' },
            messages: [
              { role: 'user', content: evalPrompt },
            ],
          })

          const evaluation: EvaluationResult = JSON.parse(evalRes.choices[0]?.message?.content ?? '{}')

          // Recalculate total for accuracy
          const recalcTotal = Object.values(evaluation.score_breakdown ?? {}).reduce((s, v) => s + (v as number), 0)
          evaluation.total_score = typeof evaluation.total_score === 'number' ? evaluation.total_score : recalcTotal
          evaluation.pass = evaluation.total_score >= PASS_SCORE

          // ── Keep best version (prevent regression) ───────────────────────
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

          // ── STEP 3: Check pass condition ─────────────────────────────────
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
              message: `${iteration + 1}차 개선 시작 (약점: ${lastEvaluation.fail_reasons?.slice(0, 2).join(', ')})`,
              weakAreas,
            })
          }
        }

        // ── FINAL — always return best-scoring version ────────────────────
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
