import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { url, reflectionPoint } = await req.json() as { url: string; reflectionPoint?: string }

    if (!url?.startsWith('http')) {
      return NextResponse.json({ error: '유효한 URL을 입력해주세요.' }, { status: 400 })
    }

    // Fetch the URL
    let html = ''
    let pageTitle = url
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GEOStudioBot/1.0)',
          'Accept': 'text/html',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(10000),
      })
      html = await res.text()
      pageTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? url
    } catch (e) {
      return NextResponse.json({ error: '페이지에 접근할 수 없습니다.' }, { status: 422 })
    }

    // Strip HTML, get readable text
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000)

    const focusInstruction = reflectionPoint
      ? `특히 다음 관점에 집중해서 요약해주세요: "${reflectionPoint}"`
      : '핵심 내용을 중심으로 요약해주세요.'

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `다음 웹페이지 내용을 콘텐츠 작성에 활용할 수 있도록 요약해주세요.
URL: ${url}
제목: ${pageTitle}

${focusInstruction}

요구사항:
- 3-5문장으로 핵심 내용 요약
- 인용할 수 있는 핵심 주장이나 데이터 포함
- 콘텐츠 작성에 활용 가능한 포인트 2-3가지 추출

페이지 내용:
${text}

JSON만 반환:
{
  "title": "${pageTitle}",
  "summary": "3-5문장 요약",
  "keyPoints": ["포인트1", "포인트2", "포인트3"],
  "quotable": "인용 가능한 핵심 문장"
}`,
      }],
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(response.choices[0]?.message?.content ?? '{}')
    return NextResponse.json({ url, ...result })
  } catch (error) {
    return NextResponse.json({ error: '참고자료 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
