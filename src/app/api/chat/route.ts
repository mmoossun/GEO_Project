import OpenAI from 'openai'
import { NextRequest } from 'next/server'
import type { ChatMessage, GEOAnalysisResult } from '@/lib/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function buildSystemPrompt(analysis: GEOAnalysisResult, history: Array<{ analyzedAt: string; totalScore: number }>): string {
  const dimSummary = analysis.dimensions
    .map(d => `  - ${d.nameKo}: ${d.score}/${d.maxScore}점`)
    .join('\n')

  const historyNote = history.length > 0
    ? `\n과거 분석 이력: ${history.map(h => `${new Date(h.analyzedAt).toLocaleDateString('ko-KR')} ${h.totalScore}점`).join(', ')}`
    : ''

  const topIssues = analysis.topIssues.join(', ')

  return `당신은 GEO AI입니다. ${analysis.categoryLabel} 분야의 "${analysis.serviceName}" 서비스 전담 GEO(생성형 엔진 최적화) 전문 컨설턴트입니다.

## 현재 분석 데이터
- 서비스명: ${analysis.serviceName}
- 카테고리: ${analysis.categoryLabel}
- 총 GEO 점수: ${analysis.totalScore}/100 (${analysis.grade}등급 - ${analysis.gradeLabel})
- AI 인용 확률: ${analysis.citationProbability}%
- 업계 평균: ${analysis.industryAverage}점 / 상위 점수: ${analysis.topPerformerScore}점

## 차원별 점수
${dimSummary}

## 주요 개선 과제
${topIssues}
${historyNote}

## 응답 원칙
1. **항상 한국어**로 응답하세요 (사용자가 영어를 요청하지 않는 한)
2. **친근하고 전문적**인 톤 — 초보자도 이해할 수 있게 설명
3. **구체적이고 실행 가능한** 답변 — 막연한 조언 금지
4. **${analysis.serviceName}에 특화된** 내용 — 일반적인 조언 최소화
5. 콘텐츠를 생성할 때는 반드시 GEO 최적화 원칙 적용 (통계 포함, FAQ 구조, 비홍보 어조, 출처 인용)

## 콘텐츠 생성 시 적용 규칙
- 답변 캡슐 (핵심 내용을 첫 단락에 요약)
- H1-H3 제목 계층 구조
- 구체적 통계나 수치 포함 (실제 또는 현실적 예시)
- FAQ 섹션 포함
- 비홍보적 어조
- 전문가 관점/인용 포함

## 포맷
- **굵게** 강조
- 불릿 리스트 자유롭게 사용
- 코드 블록은 기술적 내용에만
- 응답은 명확하고 간결하게 (500자 이내 원칙, 생성 콘텐츠 제외)`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      messages,
      analysis,
      history = [],
    } = body as {
      messages: ChatMessage[]
      analysis: GEOAnalysisResult
      history?: Array<{ analyzedAt: string; totalScore: number }>
    }

    if (!messages?.length || !analysis) {
      return new Response('Invalid request', { status: 400 })
    }

    const openaiMessages = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1500,
      stream: true,
      messages: [
        { role: 'system', content: buildSystemPrompt(analysis, history) },
        ...openaiMessages,
      ],
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) controller.enqueue(encoder.encode(text))
          }
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (error) {
    console.error('Chat error:', error)
    return new Response('죄송해요, 잠시 오류가 발생했어요. 다시 시도해주세요.', { status: 500 })
  }
}
