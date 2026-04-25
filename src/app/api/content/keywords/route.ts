import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { buildKeywordPrompt } from '@/lib/content-strategy'
import type { PlatformType, KeywordResult } from '@/lib/content-strategy'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { topic, platform, serviceContext } = await req.json() as {
      topic: string
      platform: PlatformType
      serviceContext?: { name: string; category: string }
    }

    if (!topic?.trim()) {
      return NextResponse.json({ error: '주제를 입력해주세요.' }, { status: 400 })
    }

    const prompt = buildKeywordPrompt(topic, platform, serviceContext)

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 600,
      temperature: 0.5,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.choices[0]?.message?.content ?? '{}'
    const parsed: KeywordResult = JSON.parse(raw)

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Keyword error:', error)
    return NextResponse.json({ error: '키워드 추천 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
