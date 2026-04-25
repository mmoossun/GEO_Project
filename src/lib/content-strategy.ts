/**
 * Content Strategy Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Modular prompt architecture for Korean-market content generation.
 *
 * Research basis:
 *  - Princeton GEO paper (KDD 2024): stats +41%, citations +115%, FAQ +강력
 *  - lseo.com GEO guides: answer capsules, LLM structuring, AI citation patterns
 *  - Naver SEO 2025: C-Rank, D.I.A.+, 알고리즘 추천 기반 진화
 *  - AI-referred sessions +527% YoY (2025), H1-H3 hierarchy = 2.8× citation rate
 *
 * Architecture:
 *   buildContentPrompt = base + platform_modifier + korean_seo_modifier + depth_modifier + user_options
 */

export type PlatformType = 'naver_blog' | 'tistory' | 'velog' | 'company' | 'community'
export type ContentDepth = 'light' | 'medium' | 'deep'
export type ContentTone = 'friendly' | 'professional' | 'neutral' | 'technical'

export interface PlatformConfig {
  name: string
  emoji: string
  color: string
  bgColor: string
  borderColor: string
  shortDesc: string
  idealDepths: ContentDepth[]
  defaultTone: ContentTone
  supportsMarkdown: boolean
  hashtagRange: [number, number]
  tips: string[]
}

export const PLATFORMS: Record<PlatformType, PlatformConfig> = {
  naver_blog: {
    name: '네이버 블로그',
    emoji: '🟢',
    color: '#03C75A',
    bgColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    shortDesc: '한국 최대 블로그 · 네이버 SEO 핵심 · 추천 알고리즘',
    idealDepths: ['light', 'medium', 'deep'],
    defaultTone: 'friendly',
    supportsMarkdown: false,
    hashtagRange: [15, 25],
    tips: ['경험 기반 후기체 권장', '이모지/구분선 활용', '2-3줄 짧은 문단', '키워드 3-5회 반복'],
  },
  tistory: {
    name: '티스토리',
    emoji: '🟠',
    color: '#FF5A00',
    bgColor: '#FFF7ED',
    borderColor: '#FED7AA',
    shortDesc: 'Google + Naver 혼합 SEO · 수익형 블로그 · Markdown 지원',
    idealDepths: ['medium', 'deep'],
    defaultTone: 'neutral',
    supportsMarkdown: true,
    hashtagRange: [5, 10],
    tips: ['H1-H3 구조적 글쓰기', '메타 최적화', '수익형 CTA 가능', 'Google SEO 기준'],
  },
  velog: {
    name: '벨로그',
    emoji: '🔵',
    color: '#20C997',
    bgColor: '#F0FDFB',
    borderColor: '#99F6E4',
    shortDesc: '개발자 커뮤니티 · 기술 블로그 · Markdown 필수',
    idealDepths: ['medium', 'deep'],
    defaultTone: 'technical',
    supportsMarkdown: true,
    hashtagRange: [3, 8],
    tips: ['코드 블록 필수', '문제→해결 구조', '논리적 흐름', '간결하고 기술적'],
  },
  company: {
    name: '기업 웹사이트',
    emoji: '🏢',
    color: '#4F46E5',
    bgColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    shortDesc: '브랜드 메시지 · CTA · 신뢰 기반 · E-E-A-T 강화',
    idealDepths: ['medium', 'deep'],
    defaultTone: 'professional',
    supportsMarkdown: false,
    hashtagRange: [0, 0],
    tips: ['브랜드 일관성 유지', 'E-E-A-T 신호 강화', '비홍보적 어조', 'CTA 자연스럽게'],
  },
  community: {
    name: '커뮤니티',
    emoji: '💬',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    shortDesc: '요즘IT · 커뮤니티 게시글 · Hook 중심 · 토론 유도',
    idealDepths: ['light', 'medium'],
    defaultTone: 'friendly',
    supportsMarkdown: true,
    hashtagRange: [0, 5],
    tips: ['강렬한 첫 문장 필수', '질문형/의견형', '경험 공유 형식', '댓글 유도로 마무리'],
  },
}

export const DEPTH_CONFIG: Record<ContentDepth, { label: string; icon: string; desc: string; charRange: string; sections: string; readTime: string }> = {
  light: { label: '라이트', icon: '⚡', desc: '핵심만 빠르게', charRange: '600-900자', sections: '3-4 섹션', readTime: '1-2분' },
  medium: { label: '보통', icon: '📝', desc: '구조화 + 사례 포함', charRange: '1000-1500자', sections: '4-6 섹션', readTime: '3-5분' },
  deep: { label: '심화', icon: '🔬', desc: '분석형 인사이트', charRange: '2000-3000자', sections: '6-8 섹션', readTime: '6-10분' },
}

// ─── Prompt Layers ──────────────────────────────────────────────────────────

const BASE = `
You are a world-class Korean content strategist. You create content that feels genuinely Korean —
never generic AI-translated content. You have expert knowledge of:
- Naver C-Rank and D.I.A.+ algorithm (2025 update: now recommendation-algorithm based)
- Korean mobile search behavior (70%+ mobile traffic)
- GEO (Generative Engine Optimization — AI search optimization for ChatGPT/Perplexity/Gemini, NOT geographic location) principles from Princeton KDD 2024 research
- Platform-specific Korean writing conventions

⚠️ DEFINITION: "GEO" in this context always means "Generative Engine Optimization" (생성형 엔진 최적화) — the practice of making content more likely to be cited by AI search engines like ChatGPT, Perplexity, and Gemini. It is NEVER about geographic/location-based targeting.

Critical rules:
1. Content must sound like it was written by a real Korean person, not an AI.
2. STRICTLY follow the character count requirements for the requested depth level.
3. If the topic involves "GEO", write about AI search optimization (not geography).
`.trim()

const PLATFORM_MODIFIERS: Record<PlatformType, string> = {
  naver_blog: `
### 플랫폼: 네이버 블로그

**네이버 SEO 알고리즘 핵심 (2025 기준)**
- C-Rank: 콘텐츠 맥락·품질·참여도 평가. 전문성 있는 일관된 주제 블로그 우대
- D.I.A.+: 문서 정보성과 검색어 연관성 분석. 키워드 자연 확장 중요
- 2025년 변화: '검색어 중심'→'알고리즘 추천 기반' 진화. 체류시간·스크롤 깊이 더욱 중요

**제목 최적화 (필수)**
- 핵심 키워드를 제목 앞 15자 이내 배치
- 형식: [키워드] + [숫자/경험/방법] → 예: "GEO 최적화 7가지 | 직접 적용해본 후기"
- 클릭 유도: 숫자, 질문형, 후기/경험 키워드 효과적

**글쓰기 어투 (CRITICAL — 반드시 자연스러운 한국어 구어체)**
❌ 나쁜 예: "GEO 최적화는 AI 시대의 중요한 전략입니다."
✅ 좋은 예: "GEO 최적화, 처음엔 저도 뭔지 몰랐는데요. 직접 해보고 나서 완전히 생각이 바뀌었어요 😅"
- 자연스러운 구어체: ~해요, ~더라고요, ~거든요, ~인데요, ~했는데
- 독자 호칭: "이 글 찾으셨다면", "혹시 ~때문에 오셨나요?", "여러분도 한번"

**필수 구조 (이 순서 준수)**
1. 📌 검색 의도 공감 도입부 ("혹시 [검색 의도] 때문에 찾으셨나요?")
2. 💡 이 글에서 알 수 있는 것 (핵심 Hook 2-3줄)
3. 🔥 본론 섹션 (소제목마다 이모지 + 이모지 뒤 키워드)
4. 실제 경험/사례 (신뢰도 강화)
5. ✅ 정리 및 추천
6. #해시태그 목록 (15-25개)

**문단 규칙**
- 반드시 2-3줄 이내 (모바일 스크롤 UX + 체류시간)
- 핵심 키워드 본문 내 3-5회 자연스럽게 반복
- 구분선(---), 강조 박스 활용해 시각적 분리
`.trim(),

  tistory: `
### 플랫폼: 티스토리

**SEO 전략: Google 기준 + Naver 유입 혼합**
- Google 표준 HTML 구조 (H1 → H2 → H3 명확한 계층)
- 첫 단락에 핵심 키워드 자연스럽게 포함 (Google 메타 설명 역할)
- Markdown 구조화로 가독성 + 크롤러 파싱 최적화
- 내부 링크 전략: 관련 콘텐츠 상호 연결 권고

**글쓰기 어투**
- 정중한 정보 전달체 (~입니다, ~합니다, ~됩니다)
- 전문적이지만 접근하기 쉬운 중립적 톤
- 과도한 감성 표현 자제, 정보 전달 중심

**필수 구조**
1. SEO 최적화 서론 (키워드 포함, 글의 목적 명시)
2. ## 목차 섹션 (H2 제목으로 구성)
3. H2/H3 계층 본론 (각 섹션 핵심 요점 요약)
4. 비교표 또는 목록 (정보 구조화)
5. 결론 + CTA
6. 태그 5-10개 (SEO 키워드 기반)
`.trim(),

  velog: `
### 플랫폼: 벨로그 (개발자 기술 블로그)

**벨로그 특성 이해**
- 개발자 커뮤니티 (기술적 정확성 최우선)
- Markdown 문법 100% 활용
- 불필요한 표현 없이 핵심만 간결하게
- 개인 경험·학습 과정 공유 → 커뮤니티 공감 유발

**글쓰기 어투**
- 개발자스러운 직관적 서술
- 간결한 문어체 or 자연스러운 구어체 혼합
- 기술 용어 그대로 사용 (한글 번역 최소화)
- 군더더기 없이 핵심만

**필수 구조 (문제 → 해결 → 인사이트)**
1. 문제 정의 & 배경 (왜 이 글을 쓰는가)
2. 사전 지식 (필요한 배경 간략히)
3. 핵심 개념/이론 (명확한 정의 + 예시)
4. 실제 구현/적용 (\`\`\`코드 블록 활용\`\`\`)
5. 결과/성과 측정
6. 마무리 회고 & 다음 스텝
7. 태그 3-8개 (기술 스택 위주)
`.trim(),

  company: `
### 플랫폼: 기업 웹사이트 / 공식 블로그

**기업 콘텐츠 GEO 전략 (lseo.com 연구 기반)**
- 솔루션 중심 콘텐츠: 고객 pain point를 해결하는 심층 가이드
- 사례 연구 포함: 측정 가능한 성과 ("X사 30% 개선" 형식)
- E-E-A-T 강화: 저자 신뢰도, 전문성 신호 명확히
- 홍보 어조 금지: AI 인용율 -26% (과학적 근거)
- CTA는 자연스럽게: 강요하지 않고 다음 행동 유도

**글쓰기 어투**
- 브랜드 관점의 전문적 서술 (~입니다, ~합니다)
- 데이터·사례 근거 필수
- 비홍보적 교육적 어조 유지

**필수 구조**
1. 핵심 가치 제안 (독자가 얻는 것)
2. 문제 제기 (pain point 인식)
3. 해결책·접근법 (전문적 관점 + 데이터)
4. 서비스 자연스러운 연계
5. 사례/증거 (신뢰도)
6. CTA (명확한 다음 행동)
`.trim(),

  community: `
### 플랫폼: 커뮤니티 (요즘IT, 개발 커뮤니티)

**커뮤니티 콘텐츠 전략**
- 48% of AI citations come from community platforms (2025 연구) → 커뮤니티 콘텐츠 AI 인용율 급상승
- Hook이 전부: 첫 문장이 클릭 여부 결정
- 질문형/의견형: 토론·댓글 유도
- 개인 경험 강조: 실제 경험담이 공감 유발

**글쓰기 어투**
- 자연스럽고 솔직한 구어체
- 약간의 열정·감정 표현 허용
- 질문으로 마무리 (댓글 유도)

**필수 구조**
1. 강렬한 Hook (의외 사실 / 공감 포인트 / 논쟁적 주장)
2. 배경 설명 (왜 이 글을 쓰는지)
3. 핵심 내용 (구체적 경험/정보)
4. 개인 의견 (관점 명확히 제시)
5. 독자 의견 유도 질문으로 마무리
`.trim(),
}

const KOREAN_SEO_LAYER = `
### 한국 검색 + GEO 통합 최적화 (전 플랫폼 공통)

**한국 검색 생태계 (2025)**
- Naver 62.5% 점유 → 네이버 SEO 기준 중요
- 모바일 70%+ → 짧은 문단, 시각적 구분 필수
- 네이버 AI Briefing + Google AI Overview 동시 대응 필요

**GEO 핵심 원칙 (연구 근거)**
1. Answer Capsule: 핵심 답변을 첫 40-60단어 내 자기완결형으로 요약
   → AI가 직접 인용하는 가장 강력한 시그널
2. H1-H2-H3 계층 구조: 적용 시 AI 인용율 2.8배 상승 (2025 연구)
3. 통계/데이터: 150-200자마다 구체적 수치 포함 → AI 가시성 +41%
4. 비홍보적 어조: 광고성 표현 제거 → AI 인용율 +26% 보호
5. FAQ 구조: 30-50단어 간결 답변 → 음성 검색·AI Overview 인용 최적화
6. 출처 인용: 신뢰할 수 있는 출처 명시 → AI 신뢰도 신호

**제목 최적화 공식**
- 한국어 기준: [핵심 키워드] + [숫자/결과/방법/후기]
- 예시: "네이버 SEO 7가지 핵심 전략 | 실제 적용 후기 2025"
`.trim()

const DEPTH_MODIFIERS: Record<ContentDepth, string> = {
  light: `
### 콘텐츠 깊이: 라이트 ⚡ (STRICT: 600-900자)
- 목표 분량: **정확히 600-900자** (이보다 짧으면 실패, 이보다 길어도 실패)
- 구성: 3-4 섹션만 — 소제목 + 2-3줄 문단
- 핵심 포인트 3가지만, 예시 1개 이내
- 독자가 30초~1분 안에 핵심을 파악할 수 있는 분량
`.trim(),
  medium: `
### 콘텐츠 깊이: 보통 📝 (STRICT: 1000-1500자)
- 목표 분량: **정확히 1000-1500자** (최소 1000자 반드시 충족)
- 구성: 4-6 섹션, 구체적 사례 1-2개 포함
- 비교/목록 형식 적극 활용
- 실용적 팁 3-5개 포함
- 독자가 바로 활용 가능한 실용 정보 중심
`.trim(),
  deep: `
### 콘텐츠 깊이: 심화 🔬 (STRICT: 2000-3000자)
- 목표 분량: **정확히 2000자 이상** (2000자 미만이면 실패 — 반드시 섹션 추가)
- 구성: 6-8 섹션, 각 섹션 200-400자
- 논리 흐름: 배경 → 문제 → 분석 → 해결책 → 적용법 → 인사이트 → FAQ
- 통계/수치 최소 3개 이상 포함 (150-200자마다 수치 1개)
- 전문가 관점 또는 연구 결과 인용
- FAQ 섹션 필수 (최소 3개 Q&A)
`.trim(),
}

const OUTPUT_SCHEMA = `
### 출력 형식 (JSON only, no markdown wrapper)

CRITICAL FIELD RULES:
- "hashtags": naver_blog must have 15-25 items, tistory 5-10 items, velog 3-8 items, company 0 items, community 0-5 items. Write hashtag text WITHOUT the # symbol. NEVER return an empty array for naver_blog.
- "content": MUST meet minimum character counts — light: 600-900자, medium: 1000-1500자, deep: 2000-3000자. Count carefully and pad with additional sections if needed.
- "geo_score_estimate": Be realistic. Only assign 85+ if all GEO best practices are fully applied.

{
  "title": "플랫폼 최적화 제목 (한국어, 검색 키워드 포함)",
  "summary": "2-3문장 핵심 요약 — Answer Capsule 형식으로 (한국어, 40-60단어)",
  "content": "본문 전체 (플랫폼 포맷 반영, 한국어, 위 분량 기준 반드시 충족)",
  "hashtags": ["태그1", "태그2", "... (플랫폼별 개수 규칙 반드시 준수)"],
  "estimated_read_time": "약 X분",
  "platform_optimization_notes": "적용된 플랫폼 최적화 요소 간략 설명 (한국어)",
  "seo_keywords": ["핵심키워드1", "핵심키워드2", "핵심키워드3", "핵심키워드4", "핵심키워드5"],
  "geo_score_estimate": <integer 65-95, honest assessment>,
  "geo_optimizations_applied": ["Answer Capsule 포함", "통계 데이터 포함", "FAQ 구조 적용", ...]
}
`

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ContentRequest {
  platform: PlatformType
  depth: ContentDepth
  topic: string
  keywords?: string[]
  tone?: ContentTone
  targetAudience?: string
  serviceContext?: { name: string; category: string }
  convertFrom?: { platform: PlatformType; content: string }
  adjustMode?: 'shorter' | 'longer'
  existingContent?: string
}

export interface GeneratedContent {
  title: string
  summary: string
  content: string
  hashtags: string[]
  estimated_read_time: string
  platform_optimization_notes: string
  seo_keywords: string[]
  geo_score_estimate: number
  geo_optimizations_applied: string[]
}

export interface KeywordResult {
  keywords: {
    high_volume: string[]
    medium: string[]
    long_tail: string[]
  }
  recommended_title_keywords: string[]
  search_intent: '정보형' | '탐색형' | '거래형'
}

export function buildContentPrompt(req: ContentRequest): string {
  const userSection = buildUserSection(req)
  return [BASE, PLATFORM_MODIFIERS[req.platform], KOREAN_SEO_LAYER, DEPTH_MODIFIERS[req.depth], userSection, OUTPUT_SCHEMA].join('\n\n---\n\n')
}

function buildUserSection(req: ContentRequest): string {
  const lines = ['### 사용자 요청']
  lines.push(`- 주제: "${req.topic}"`)
  if (req.keywords?.length) lines.push(`- 포함 키워드: ${req.keywords.join(', ')}`)
  if (req.targetAudience) lines.push(`- 타겟 독자: ${req.targetAudience}`)
  if (req.tone) {
    const toneMap: Record<ContentTone, string> = { friendly: '친근·경험 기반', professional: '전문·권위', neutral: '중립·정보 전달', technical: '기술·간결' }
    lines.push(`- 어조: ${toneMap[req.tone]}`)
  }
  if (req.serviceContext) {
    lines.push(`- 서비스 컨텍스트: "${req.serviceContext.name}" (${req.serviceContext.category}) — 이 서비스와 관련된 내용으로 작성`)
  }
  if (req.convertFrom) {
    lines.push(`\n### 플랫폼 변환 요청`)
    lines.push(`${PLATFORMS[req.convertFrom.platform].name} → ${PLATFORMS[req.platform].name} 스타일로 핵심 내용 유지하며 재작성:`)
    lines.push(`\`\`\`\n${req.convertFrom.content.slice(0, 2000)}\n\`\`\``)
  }
  if (req.adjustMode && req.existingContent) {
    const dir = req.adjustMode === 'shorter' ? '더 짧게 (핵심만 압축, 현재 분량의 60% 수준)' : '더 길게 (분석·사례·설명 추가, 현재 분량의 150% 수준)'
    lines.push(`\n### 분량 조정 요청 (${dir})`)
    lines.push(`\`\`\`\n${req.existingContent.slice(0, 2000)}\n\`\`\``)
  }
  return lines.join('\n')
}

export function buildKeywordPrompt(topic: string, platform: PlatformType, serviceContext?: { name: string; category: string }): string {
  const ctx = serviceContext ? `\n서비스 컨텍스트: "${serviceContext.name}" (${serviceContext.category})` : ''
  return `당신은 한국 콘텐츠 마케팅 및 SEO 전문가입니다.

⚠️ 중요: 여기서 "GEO"는 지리적 위치(geographic)가 아닙니다. GEO = Generative Engine Optimization (생성형 AI 검색 최적화)입니다.

아래 주제와 플랫폼에 맞는 **한국어 SEO 키워드**를 추천해주세요.

주제: "${topic}"
플랫폼: ${PLATFORMS[platform].name}${ctx}

목표: 이 주제로 ${PLATFORMS[platform].name}에 올릴 콘텐츠가 네이버 검색 + AI 검색(ChatGPT, Perplexity)에서 잘 노출되도록 키워드를 선정해주세요.

키워드 선정 기준:
- 주제의 핵심 의미를 정확히 반영한 키워드
- 한국인이 실제로 검색할 법한 자연스러운 한국어
- 네이버 검색량 기준으로 대형/중형/롱테일 분류

JSON only (no explanation):
{
  "keywords": {
    "high_volume": ["주제와 직접 관련된 대형 키워드 1", "대형 키워드 2", "대형 키워드 3"],
    "medium": ["주제 관련 중형 키워드 1", "중형 키워드 2", "중형 키워드 3"],
    "long_tail": ["구체적 롱테일 키워드 1", "롱테일 키워드 2", "롱테일 키워드 3", "롱테일 키워드 4"]
  },
  "recommended_title_keywords": ["제목에 넣으면 좋은 키워드 1", "제목 추천 키워드 2"],
  "search_intent": "정보형 또는 탐색형 또는 거래형"
}`
}
