import type { Metadata } from 'next'
import { URLAnalyzer } from '@/components/URLAnalyzer'

export const metadata: Metadata = {
  title: 'URL UI/UX 분석기 — GEO Score',
  description: 'URL을 입력하면 페이지를 직접 방문해 UI/UX와 GEO 최적화 상태를 분석하고 개선 방안을 제시합니다.',
}

interface Props {
  searchParams: Promise<{ url?: string }>
}

export default async function URLAnalyzerPage({ searchParams }: Props) {
  const params = await searchParams
  return <URLAnalyzer initialUrl={params.url} />
}
