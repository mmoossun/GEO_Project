export const CATEGORIES = [
  { value: 'ecommerce', label: '이커머스/쇼핑', emoji: '🛒', avgScore: 52, topScore: 78, mainIssue: '상품 설명 홍보성 어조' },
  { value: 'saas', label: 'SaaS/소프트웨어', emoji: '💻', avgScore: 55, topScore: 82, mainIssue: '기술 용어 과다 & 구조화 부족' },
  { value: 'fintech', label: '금융/핀테크', emoji: '💰', avgScore: 60, topScore: 85, mainIssue: '규정준수 중심으로 가독성 낮음' },
  { value: 'healthcare', label: '의료/헬스케어', emoji: '🏥', avgScore: 62, topScore: 86, mainIssue: '전문성은 있으나 스키마 마크업 부족' },
  { value: 'education', label: '교육/이러닝', emoji: '📚', avgScore: 65, topScore: 88, mainIssue: '콘텐츠 구조 우수 but 최신성 낮음' },
  { value: 'food', label: '음식/식품', emoji: '🍔', avgScore: 48, topScore: 75, mainIssue: '레시피 구조화 미흡' },
  { value: 'travel', label: '여행/숙박', emoji: '✈️', avgScore: 50, topScore: 77, mainIssue: '시즌성 콘텐츠 최신성 관리 부족' },
  { value: 'realestate', label: '부동산', emoji: '🏠', avgScore: 45, topScore: 72, mainIssue: '가격 중심 홍보성 콘텐츠 비율 높음' },
  { value: 'fashion', label: '패션/뷰티', emoji: '👗', avgScore: 47, topScore: 74, mainIssue: '트렌드 콘텐츠 최신성 미흡' },
  { value: 'legal', label: '법률/전문직', emoji: '⚖️', avgScore: 63, topScore: 87, mainIssue: '전문 용어 가독성 문제' },
  { value: 'marketing', label: '마케팅/광고', emoji: '📣', avgScore: 53, topScore: 80, mainIssue: '홍보성 어조로 AI 인용율 낮음' },
  { value: 'hr', label: 'HR/채용', emoji: '👔', avgScore: 49, topScore: 76, mainIssue: 'JD 중심으로 정보성 콘텐츠 부족' },
  { value: 'logistics', label: '물류/배송', emoji: '📦', avgScore: 46, topScore: 73, mainIssue: '서비스 안내 외 정보성 콘텐츠 부족' },
  { value: 'gaming', label: '게임/엔터테인먼트', emoji: '🎮', avgScore: 44, topScore: 71, mainIssue: 'E-E-A-T 신뢰 신호 부족' },
  { value: 'news', label: '뉴스/미디어', emoji: '📰', avgScore: 68, topScore: 89, mainIssue: '저자 정보 & 출처 인용 관리 필요' },
  { value: 'other', label: '기타', emoji: '🔷', avgScore: 50, topScore: 78, mainIssue: '업종별 맞춤 최적화 필요' },
] as const

export type CategoryValue = (typeof CATEGORIES)[number]['value']

export function getCategoryInfo(value: string) {
  return CATEGORIES.find(c => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1]
}

export const DIMENSION_META = {
  structure: { nameKo: '콘텐츠 구조', icon: '🗂️', maxScore: 20, color: '#4F46E5', desc: '제목 계층, FAQ, 목록, 답변 캡슐' },
  eeat: { nameKo: 'E-E-A-T 신뢰성', icon: '🛡️', maxScore: 25, color: '#7C3AED', desc: '저자 정보, 통계, 인용, 비홍보 어조' },
  technical: { nameKo: '기술 신호', icon: '⚙️', maxScore: 20, color: '#0891B2', desc: 'JSON-LD 스키마, 메타태그, 날짜' },
  freshness: { nameKo: '최신성', icon: '🕐', maxScore: 15, color: '#059669', desc: '발행일, 업데이트 빈도, 시의성' },
  readability: { nameKo: '가독성', icon: '📖', maxScore: 20, color: '#D97706', desc: '명확성, 스캔 용이성, 어휘 다양성' },
} as const

export const GRADE_CONFIG = {
  S: { label: 'AI 최적화 최상급', color: '#7C3AED', bg: '#F3E8FF', min: 90 },
  A: { label: 'AI 노출 우수', color: '#059669', bg: '#ECFDF5', min: 80 },
  B: { label: 'AI 노출 양호', color: '#2563EB', bg: '#EFF6FF', min: 70 },
  C: { label: 'AI 노출 보통', color: '#D97706', bg: '#FFFBEB', min: 60 },
  D: { label: 'AI 노출 미흡', color: '#EA580C', bg: '#FFF7ED', min: 50 },
  F: { label: 'AI 노출 불량', color: '#DC2626', bg: '#FEF2F2', min: 0 },
} as const

export const QUICK_ACTIONS = [
  { id: 'content', label: '블로그 초안 작성', prompt: '우리 서비스를 위한 GEO 최적화 블로그 포스트 초안을 작성해줘.' },
  { id: 'faq', label: 'FAQ 섹션 생성', prompt: 'GEO 최적화에 맞는 FAQ 섹션 5개를 작성해줘.' },
  { id: 'schema', label: 'JSON-LD 스키마', prompt: '우리 서비스에 맞는 JSON-LD 스키마 마크업을 만들어줘.' },
  { id: 'meta', label: '메타 설명 작성', prompt: 'GEO에 최적화된 메타 설명(150자)을 3가지 버전으로 작성해줘.' },
  { id: 'roadmap', label: '30일 개선 로드맵', prompt: '현재 점수를 기반으로 30일 GEO 개선 로드맵을 만들어줘.' },
] as const
