import type { Metadata } from 'next'
import { ContentStudio } from '@/components/studio/ContentStudio'

export const metadata: Metadata = {
  title: '콘텐츠 스튜디오 — GEO Score',
  description: '이미지·참고자료를 입력하면 AI가 구조화된 콘텐츠를 생성하고, TipTap 에디터로 직접 편집할 수 있습니다.',
}

export default function StudioPage() {
  return <ContentStudio />
}
