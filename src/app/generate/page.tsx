import type { Metadata } from 'next'
import { ContentGeneratorClient } from '@/components/content/ContentGeneratorClient'

export const metadata: Metadata = {
  title: 'GEO 콘텐츠 생성기 — 플랫폼 최적화 콘텐츠',
  description: '네이버 블로그, 티스토리, 벨로그에 최적화된 GEO 콘텐츠를 AI로 즉시 생성하세요.',
}

interface Props {
  searchParams: Promise<{ service?: string; category?: string; score?: string; categoryLabel?: string }>
}

export default async function GeneratePage({ searchParams }: Props) {
  const params = await searchParams
  const serviceContext =
    params.service
      ? { name: params.service, category: params.category ?? 'other', categoryLabel: params.categoryLabel ?? '', score: Number(params.score ?? 0) }
      : undefined

  return <ContentGeneratorClient serviceContext={serviceContext} />
}
