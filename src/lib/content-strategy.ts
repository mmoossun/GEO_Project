/**
 * Content Strategy Engine — Publishable Quality Standard
 *
 * All content generated must meet this bar:
 *   "Would a professional Korean content editor approve this for immediate upload?"
 *
 * Framework: Content DNA
 *   HOOK → THESIS → PROOF (specific examples + data) → UTILITY → SIGNATURE
 *
 * Research:
 *   Princeton GEO (KDD 2024) | Naver C-Rank/D.I.A.+ 2025 | lseo.com GEO guides
 */

export type PlatformType = 'naver_blog' | 'tistory' | 'velog' | 'company' | 'community'
export type ContentDepth = 'light' | 'medium' | 'deep'
export type ContentTone = 'friendly' | 'professional' | 'neutral' | 'technical'

export interface PlatformConfig {
  name: string; emoji: string; color: string; bgColor: string; borderColor: string
  shortDesc: string; idealDepths: ContentDepth[]; defaultTone: ContentTone
  supportsMarkdown: boolean; hashtagRange: [number, number]; tips: string[]
}

export const PLATFORMS: Record<PlatformType, PlatformConfig> = {
  naver_blog: {
    name: '네이버 블로그', emoji: '🟢', color: '#03C75A', bgColor: '#F0FDF4', borderColor: '#BBF7D0',
    shortDesc: '한국 최대 블로그 · 네이버 SEO 핵심 · 추천 알고리즘',
    idealDepths: ['light', 'medium', 'deep'], defaultTone: 'friendly', supportsMarkdown: false,
    hashtagRange: [15, 25],
    tips: ['경험 기반 후기체 권장', '이모지/구분선 활용', '2-3줄 짧은 문단', '키워드 3-5회 반복'],
  },
  tistory: {
    name: '티스토리', emoji: '🟠', color: '#FF5A00', bgColor: '#FFF7ED', borderColor: '#FED7AA',
    shortDesc: 'Google + Naver 혼합 SEO · 수익형 블로그 · Markdown 지원',
    idealDepths: ['medium', 'deep'], defaultTone: 'neutral', supportsMarkdown: true,
    hashtagRange: [5, 10],
    tips: ['H1-H3 구조적 글쓰기', '메타 최적화', '수익형 CTA 가능', 'Google SEO 기준'],
  },
  velog: {
    name: '벨로그', emoji: '🔵', color: '#20C997', bgColor: '#F0FDFB', borderColor: '#99F6E4',
    shortDesc: '개발자 커뮤니티 · 기술 블로그 · Markdown 필수',
    idealDepths: ['medium', 'deep'], defaultTone: 'technical', supportsMarkdown: true,
    hashtagRange: [3, 8],
    tips: ['코드 블록 필수', '문제→해결 구조', '논리적 흐름', '간결하고 기술적'],
  },
  company: {
    name: '기업 웹사이트', emoji: '🏢', color: '#4F46E5', bgColor: '#EEF2FF', borderColor: '#C7D2FE',
    shortDesc: '브랜드 메시지 · CTA · 신뢰 기반 · E-E-A-T 강화',
    idealDepths: ['medium', 'deep'], defaultTone: 'professional', supportsMarkdown: false,
    hashtagRange: [0, 0],
    tips: ['브랜드 일관성 유지', 'E-E-A-T 신호 강화', '비홍보적 어조', 'CTA 자연스럽게'],
  },
  community: {
    name: '커뮤니티', emoji: '💬', color: '#F59E0B', bgColor: '#FFFBEB', borderColor: '#FDE68A',
    shortDesc: '요즘IT · 커뮤니티 게시글 · Hook 중심 · 토론 유도',
    idealDepths: ['light', 'medium'], defaultTone: 'friendly', supportsMarkdown: true,
    hashtagRange: [0, 5],
    tips: ['강렬한 첫 문장 필수', '질문형/의견형', '경험 공유 형식', '댓글 유도로 마무리'],
  },
}

export const DEPTH_CONFIG: Record<ContentDepth, { label: string; icon: string; desc: string; charRange: string; sections: string; readTime: string }> = {
  light:  { label: '라이트', icon: '⚡', desc: '핵심만 빠르게', charRange: '700-1000자', sections: '3-4 섹션', readTime: '1-2분' },
  medium: { label: '보통', icon: '📝', desc: '구조화 + 사례 포함', charRange: '1500-2000자', sections: '5-7 섹션', readTime: '3-5분' },
  deep:   { label: '심화', icon: '🔬', desc: '분석형 인사이트', charRange: '2800-3500자', sections: '7-10 섹션', readTime: '7-12분' },
}

// ─── Prompt Layers ───────────────────────────────────────────────────────────

const BASE = `
You are a SENIOR Korean content editor at a top-tier Korean media company. Your standard is:
"Would I personally approve this article for immediate publication without revision?"

⚠️ GEO = Generative Engine Optimization (생성형 AI 검색 최적화, NOT geographic/location). Always means AI search citation optimization.

## PUBLISHABILITY STANDARD — all content must clear this bar

### What separates publishable content from AI filler:

❌ UNPUBLISHABLE PATTERNS (immediate rejection):
- Generic advice without specifics: "SEO가 중요합니다", "좋은 콘텐츠를 만드세요", "꾸준히 업로드하면..."
- Placeholder-style examples: "예를 들어 A라는 회사는...", "어떤 블로거는..."
- AI-obvious phrases: "이 글에서는 ~에 대해 알아보겠습니다", "첫째..., 둘째..., 셋째...", "마지막으로 정리하면"
- Vague quantification: "훨씬 좋아집니다", "크게 향상됩니다", "많은 사람들이"
- Empty padding: "이것은 매우 중요한 사항입니다", "주목해야 할 점은"
- Fake modesty hooks: "이 글을 쓰게 된 계기는...", "저도 처음엔 몰랐는데요..."

✅ PUBLISHABLE CONTENT has:
1. **SPECIFIC DATA** — concrete numbers, even if estimated ("월 검색량 12만", "GPT 응답 평균 3.2개 출처 인용", "2024년 기준 47% 블로거가")
2. **REAL EXAMPLES** — actual named services, actual blog posts, actual situations (not "A사", "어느 스타트업")
3. **UNIQUE INSIGHT** — one non-obvious observation the reader can't find in a generic search
4. **ACTIONABLE SPECIFICITY** — "H2 태그에 핵심 키워드를 넣은 뒤 30일 만에 인용 횟수 3배 증가" not "H2를 잘 쓰세요"
5. **AUTHENTIC VOICE** — actual opinions, actual preferences, actual "here's what I've seen work"

## CONTENT DNA FRAMEWORK
Every piece must have ALL FIVE:
- 🎣 HOOK: Opens with a surprising fact, counterintuitive claim, or compelling scenario — not a generic intro
- 💡 THESIS: One central argument or value the entire piece delivers — stated clearly in opening 2-3 lines
- 🔍 PROOF: 3+ specific examples, concrete data points, or real-world cases that support the thesis
- 🛠️ UTILITY: At least 3 immediately actionable items the reader can apply today
- 🎯 SIGNATURE: Memorable closing with a specific recommendation or prediction — not "오늘은 여기까지"

## LANGUAGE RULES
- Korean must feel native. Test: would a Korean millennial share this?
- Vary sentence endings: ~했는데, ~더라고요, ~거든요, ~잖아요, ~이었어요, ~하더라고요
- No "~입니다" / "~합니다" as dominant style in blogs (reserved for company/formal only)
- Numbers in context: "약 X개" or "X% 정도" not just "많은"
`.trim()

const PLATFORM_MODIFIERS: Record<PlatformType, string> = {
  naver_blog: `
### 플랫폼: 네이버 블로그 — 실제 업로드 기준

**알고리즘 이해 (2025)**
C-Rank는 "같은 주제를 깊게 다루는 블로거"를 우대합니다. D.I.A.+는 "이 글이 검색자에게 진짜 도움이 되는가"를 봅니다. 2025년 추천 알고리즘 전환 이후 체류시간(평균 2분30초 이상)과 스크롤 깊이(80% 이상)가 노출 결정의 핵심 변수입니다.

**제목 공식 (클릭율 최적화)**
[검색 키워드 앞 배치] + [구체적 숫자 or 경험 키워드]
- 우수: "GEO 최적화 6가지 | 3달 적용 후 인용율 4배 올린 방법"
- 우수: "네이버 블로그 상위노출 7단계 | 직접 테스트해서 효과 있었던 것만"
- 나쁨: "GEO 최적화에 대해 알아보자"

**필수 구조 (이 순서 엄수)**
1. 🎯 도입부 (3-4줄): 검색 의도를 정확히 짚는 공감 + 이 글의 핵심 약속
   예: "GEO 최적화 검색하셨다면 아마 ChatGPT나 Perplexity에서 내 브랜드가 언급 안 되는 게 답답해서 오셨을 거예요. 저도 6개월 전에 똑같은 상황이었거든요."
2. 💡 핵심 한 줄 요약 박스 (Answer Capsule — AI 인용용)
3. 🔥 본론 섹션들 (이모지 + 소제목, 2-3줄 문단)
   - 각 섹션: 이론 1줄 → 구체적 예시 → 내 경험 or 데이터
4. 📊 실제 결과/데이터 (숫자 포함 필수)
5. ✅ 핵심 요약 (오늘 바로 할 수 있는 것 3가지)
6. 🏷️ 해시태그 (15-25개)

**어투 필수 규칙**
- 경험자의 솔직한 후기 톤 유지
- 독자를 "여러분", "이 글 읽으시는 분" 등으로 직접 호칭
- 2-3줄 단락 필수 (6줄 이상 금지 — 모바일 UX)
- 핵심 키워드 자연스럽게 3-5회 등장

**MUST INCLUDE (없으면 실패)**
- [ ] 구체적인 수치/데이터 최소 2개
- [ ] 실제 경험 기반 예시 (가상 사례 금지)
- [ ] 바로 실행 가능한 팁 최소 3개
- [ ] Answer Capsule (핵심 요약 40-60자, AI 인용 최적화)
`.trim(),

  tistory: `
### 플랫폼: 티스토리 — Google SEO 기준 정보성 글

**SEO 전략**
Google 기준: E-E-A-T(경험·전문성·권위·신뢰)를 충족해야 상위 노출됩니다. 첫 단락은 Google의 Featured Snippet 추출 영역 — 핵심 답변을 150자 이내로 명확히 써야 합니다.

**제목 공식**
[명확한 주제 키워드] + [SEO 접미사: 방법, 가이드, 총정리, 비교]
예: "티스토리 SEO 최적화 완전 가이드 2025 | 실제 유입 증가 사례 포함"

**필수 구조**
1. 서론: 문제 정의 + 이 글의 답변 약속 (Google Featured Snippet 최적화)
2. 목차 (H2 링크 형태)
3. H2 섹션들 (각 섹션 독립적으로 완결 — Featured Snippet 노리기)
   - H3으로 세분화: 개념 → 방법 → 사례
4. 비교표 or 단계별 목록 (스캐닝 유저 잡기)
5. 자주 묻는 질문 FAQ (Google "사람들이 자주 묻는 질문" 대응)
6. 결론 + CTA

**어투**: 중립적 정보 전달체 (~입니다, ~합니다) + 가끔 구어체 혼용으로 딱딱함 방지

**MUST INCLUDE**
- [ ] H2/H3 계층 구조 명확히 (Markdown ## / ###)
- [ ] 비교표 or 단계별 번호 목록 최소 1개
- [ ] 수치/데이터 포함 사례 최소 2개
- [ ] FAQ 섹션 (Q 2-3개, 각 40-60자 답변)
- [ ] 태그 5-10개 (핵심 SEO 키워드)
`.trim(),

  velog: `
### 플랫폼: 벨로그 — 개발자가 즐겨찾기 저장하는 기술 글

**독자 이해**
벨로그 독자(주로 개발자·IT 종사자)는 "이 글에서 새로 배울 게 있나?"를 3초 안에 판단합니다. 제목과 첫 문단에 "핵심 문제 + 내가 발견한 해결책"이 없으면 즉시 이탈합니다.

**필수 구조 (문제 → 발견 → 해결 → 인사이트)**
1. 문제 상황 (구체적 상황 묘사, 공감 유도)
2. 기존 접근의 한계 (내가 처음 시도한 방법 + 왜 실패했나)
3. 핵심 개념/이론 (명확한 정의 + 간단한 도식)
4. 실제 구현 (코드 블록 필수, 주석으로 설명)
5. 결과 측정 (Before/After 비교, 수치 포함)
6. 배운 것 & 주의점 (트레이드오프 솔직히)
7. 참고 자료

**어투**: 직관적 구어체 ("이게 생각보다 복잡한데...", "삽질 좀 했습니다", "결국 깨달은 건")

**MUST INCLUDE**
- [ ] 코드 블록 최소 1개 (실제 동작하는 코드)
- [ ] Before/After 비교 or 성능 측정 수치
- [ ] "내가 겪은 실제 상황" 구체 서술
- [ ] "이 방법의 한계/주의점" 솔직히 명시
- [ ] 태그 3-8개 (기술 스택, 개념 위주)
`.trim(),

  company: `
### 플랫폼: 기업 웹사이트/공식 블로그 — 전환율 최적화 콘텐츠

**기업 콘텐츠의 목표**: 홍보 없이 신뢰를 쌓고, 자연스럽게 "이 서비스를 써봐야겠다"는 생각을 만드는 것. 직접 홍보는 AI 인용율 -26% (과학적 연구 결과).

**E-E-A-T 강화 전략**
- Experience: 실제 사례 수치 포함 ("A기업 적용 후 30일 만에 유입 +47%")
- Expertise: 전문 용어 + 쉬운 설명 조합
- Authoritativeness: 외부 연구/데이터 인용
- Trust: 비홍보적 어조, 단점도 언급하는 균형

**필수 구조**
1. 핵심 가치 제안 (첫 2문장 — 독자가 얻는 것 명확히)
2. 문제 인식 (독자의 pain point를 정확히 짚기)
3. 해결 접근법 (전문적 관점 + 업계 데이터)
4. 구체적 사례/결과 (측정 가능한 성과 수치)
5. 자연스러운 서비스 연계 (강요 아닌 흐름)
6. 명확한 CTA (다음 행동 1가지만)

**어투**: 전문적이지만 딱딱하지 않은 중립체

**MUST INCLUDE**
- [ ] 구체적 성과 수치 ("~% 개선", "~배 향상") 최소 2개
- [ ] 외부 데이터/연구 인용 1개 이상
- [ ] 실제 사용 사례 시나리오
- [ ] 자연스러운 CTA 1개
`.trim(),

  community: `
### 플랫폼: 커뮤니티 (요즘IT, 개발 커뮤니티 등) — 바이럴 가능한 글

**커뮤니티 콘텐츠 원칙**
커뮤니티에서 살아남는 글은 "이 사람 말이 맞나, 내 생각은 다른데" 또는 "나도 이거 궁금했는데!"를 유발합니다. 중립적이고 균형 잡힌 글은 커뮤니티에서 묻힙니다.

48% of AI citations come from community content (2025) — 커뮤니티 글이 ChatGPT에 인용될 확률 급상승.

**필수 구조**
1. 🔥 HOOK (첫 1-2문장 전부): 의외의 사실 / 논쟁적 주장 / 강한 공감 포인트
   좋은 예: "저는 SEO 전문가한테 돈 주고 컨설팅 받았는데 GPT한테 물어봤을 때랑 결과가 똑같았어요."
   나쁜 예: "안녕하세요, 오늘은 SEO에 대해 이야기하려고 합니다."
2. 배경 설명 (내가 이걸 왜 쓰는지 — 구체적 계기)
3. 핵심 내용 (나의 경험/발견 — 수치/사례 포함)
4. 나의 명확한 의견 (모호하게 "다양한 관점이 있지만..." 금지)
5. 독자 참여 유도 질문 (진짜 궁금한 것 1가지)

**어투**: 솔직하고 직접적, 약간의 감정 표현 허용, 구어체

**MUST INCLUDE**
- [ ] 첫 문장 = 즉각 주목하게 만드는 Hook
- [ ] 나의 명확한 의견/입장 (중립 금지)
- [ ] 구체적 경험 or 수치
- [ ] 마지막에 독자 의견 구하는 질문
`.trim(),
}

const KOREAN_SEO_LAYER = `
### GEO + 한국 검색 최적화 (전 플랫폼 공통)

**GEO 핵심 원칙 (Princeton KDD 2024 + 2025 실측)**
1. Answer Capsule: 핵심 답변 40-60자로 자기완결형 요약 → AI 직접 인용 시그널 #1
2. H1-H2-H3 계층: 적용 시 AI 인용율 2.8배 상승 (2025 측정치)
3. 통계 밀도: 150-200자마다 수치 1개 → AI 가시성 +41%
4. 비홍보 어조: 광고성 문구 제거 → AI 인용율 +26% 보호
5. FAQ 구조: 질문-답변 형식 → 음성검색·AI Overview·Perplexity 인용 최적화

**제목 최적화 (AI 검색 가시성)**
- 핵심 키워드 앞 15자 이내 배치
- 숫자/연도/후기/방법 포함 시 클릭율 +34% (2025 연구)
`.trim()

const DEPTH_MODIFIERS: Record<ContentDepth, string> = {
  light: `
### 깊이: 라이트 ⚡ (700-1000자 — 핵심 압축)
- 분량: 700-1000자 한국어 본문 (엄수)
- 섹션: 3-4개, 각 섹션 2-3문단
- 핵심 포인트 3가지, 예시 1개 이상 (구체적, 가상 금지)
- 독자가 1분 안에 1가지 핵심 행동을 파악할 수 있어야 함
- 얕은 내용이어도 구체적이어야 함 ("중요합니다" 금지 — 왜 중요한지 1줄 설명)
`.trim(),
  medium: `
### 깊이: 보통 📝 (1500-2000자 — 실용 정보형)
- 분량: 1500-2000자 한국어 본문 (최소 1500자 엄수 — 미달 시 실패)
- 섹션: 5-7개, 각 섹션 충분한 설명
- 구체적 사례 or 데이터 최소 2개 포함
- 비교/목록 형식 1개 이상 활용
- 바로 실행 가능한 팁 3-5개 (각 팁에 "왜" 1줄 설명)
- FAQ 섹션 권장 (Q 2개, 각 40-60자 답변)
`.trim(),
  deep: `
### 깊이: 심화 🔬 (2800-3500자 — 업계 최고 수준 글)
- 분량: 최소 2800자 한국어 본문 (미달 시 반드시 섹션 추가, 절대 실패 안 됨)
- 섹션: 7-10개, 각 섹션 300-400자 이상
- 논리 흐름: 배경 → 문제 정의 → 분석 → 해결책 → 적용 방법 → 심화 인사이트 → FAQ → 결론
- 수치/통계 최소 5개 (150-200자마다 1개 — 구체적으로)
- 사례 연구 or 비교 분석 1개 이상 (명명된 실제 사례)
- FAQ 섹션 필수 (Q 3-5개, 각 40-80자 답변)
- 전문가 관점 or 연구 결과 인용 최소 1회
- 섹션 8개 미만이면 반드시 추가: 심화 팁, 주의사항, 자주 하는 실수, 도구 비교 등
`.trim(),
}

const OUTPUT_SCHEMA = `
### 출력 형식 (JSON only)

FIELD RULES:
- "content": 반드시 위 깊이 분량 기준 충족. 짧으면 실패. 한국어만.
- "hashtags": naver_blog 15-25개, tistory 5-10개, velog 3-8개, company 0개, community 0-5개. # 없이 태그 텍스트만.
- "geo_score_estimate": 85+ 는 GEO 모범 사례 완전 적용 시만. 솔직하게.
- "unique_angle": 이 글만의 핵심 차별점 1문장 (독자가 다른 곳에서 못 찾는 것)

{
  "title": "플랫폼 최적화 제목 (검색 키워드 + 구체성 포함)",
  "summary": "Answer Capsule: 40-60자 자기완결형 핵심 요약 (AI 인용 최적화)",
  "content": "본문 전체 (플랫폼 포맷 + 깊이 분량 기준 완전 충족)",
  "hashtags": ["태그1", "태그2"],
  "estimated_read_time": "약 X분",
  "platform_optimization_notes": "적용된 최적화 요소 구체적 설명",
  "seo_keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
  "geo_score_estimate": <65-95, 정직하게>,
  "geo_optimizations_applied": ["Answer Capsule 포함", "수치 데이터 5개 포함", "FAQ 3개", ...],
  "unique_angle": "이 콘텐츠만의 차별화 포인트 1문장"
}
`

// ─── Brief Prompt (for quality agent pre-planning) ───────────────────────────

export function buildBriefPrompt(req: ContentRequest): string {
  const platform = PLATFORMS[req.platform].name
  const depthLabel = DEPTH_CONFIG[req.depth].label
  const ctx = req.serviceContext ? ` (서비스: ${req.serviceContext.name}, ${req.serviceContext.category})` : ''

  return `당신은 한국 시니어 콘텐츠 에디터입니다. 아래 콘텐츠를 작성하기 전에 "콘텐츠 브리프"를 먼저 작성하세요.

주제: "${req.topic}"${ctx}
플랫폼: ${platform} (${depthLabel} 깊이)
키워드: ${(req.keywords ?? []).join(', ') || '없음'}

콘텐츠 브리프는 실제 글쓰기 전 계획서입니다. 아래 항목을 채워주세요:

{
  "unique_angle": "이 글만의 핵심 차별점 — 검색하면 나오는 일반적인 내용과 다른 점 1문장",
  "hook": "첫 1-2문장 초안 — 독자를 즉시 사로잡는 문장 (의외 사실/공감 포인트/논쟁적 주장)",
  "thesis": "이 글이 전달하는 핵심 주장 또는 가치 1문장",
  "concrete_examples": [
    "구체적 예시 또는 데이터 1 (가상 사례 금지, 업계 상황 기반)",
    "구체적 예시 또는 데이터 2",
    "구체적 예시 또는 데이터 3"
  ],
  "key_sections": [
    {"title": "섹션 제목", "key_point": "이 섹션에서 전달할 핵심 1문장"},
    {"title": "섹션 제목 2", "key_point": "..."}
  ],
  "faq_questions": ["독자가 실제로 궁금해할 질문 1", "질문 2", "질문 3"],
  "actionable_tips": ["바로 실행 가능한 팁 1", "팁 2", "팁 3"],
  "signature_ending": "독자에게 남길 마지막 인상/메시지 초안"
}

JSON만 반환 (설명 없이).`
}

// ─── Main Prompt Builder ─────────────────────────────────────────────────────

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
  contentBrief?: string
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
  unique_angle?: string
}

export interface KeywordResult {
  keywords: { high_volume: string[]; medium: string[]; long_tail: string[] }
  recommended_title_keywords: string[]
  search_intent: '정보형' | '탐색형' | '거래형'
}

export function buildContentPrompt(req: ContentRequest): string {
  const userSection = buildUserSection(req)
  return [BASE, PLATFORM_MODIFIERS[req.platform], KOREAN_SEO_LAYER, DEPTH_MODIFIERS[req.depth], userSection, OUTPUT_SCHEMA].join('\n\n---\n\n')
}

function buildUserSection(req: ContentRequest): string {
  const lines = ['### 작성 요청']
  lines.push(`- 주제: "${req.topic}"`)
  if (req.keywords?.length) lines.push(`- 포함 키워드: ${req.keywords.join(', ')}`)
  if (req.targetAudience) lines.push(`- 타겟 독자: ${req.targetAudience}`)
  if (req.tone) {
    const toneMap: Record<ContentTone, string> = { friendly: '친근·경험 기반', professional: '전문·권위', neutral: '중립·정보 전달', technical: '기술·간결' }
    lines.push(`- 어조: ${toneMap[req.tone]}`)
  }
  if (req.serviceContext) {
    lines.push(`- 서비스 컨텍스트: "${req.serviceContext.name}" (${req.serviceContext.category}) — 이 서비스와 자연스럽게 연계`)
  }
  if (req.contentBrief) {
    lines.push(`\n### 콘텐츠 브리프 (아래 계획을 기반으로 작성하세요)`)
    lines.push(req.contentBrief)
    lines.push(`\n⚠️ 브리프의 unique_angle, hook, concrete_examples를 반드시 실제 글에 반영하세요.`)
  }
  if (req.convertFrom) {
    lines.push(`\n### 플랫폼 변환`)
    lines.push(`${PLATFORMS[req.convertFrom.platform].name} → ${PLATFORMS[req.platform].name}으로 핵심 유지하며 재작성:`)
    lines.push(`\`\`\`\n${req.convertFrom.content.slice(0, 3000)}\n\`\`\``)
  }
  if (req.adjustMode && req.existingContent) {
    const dir = req.adjustMode === 'shorter' ? '핵심만 압축 (현재의 60%)' : '분석·사례·설명 추가 (현재의 150%)'
    lines.push(`\n### 분량 조정 (${dir})`)
    lines.push(`\`\`\`\n${req.existingContent.slice(0, 3000)}\n\`\`\``)
  }
  return lines.join('\n')
}

export function buildKeywordPrompt(topic: string, platform: PlatformType, serviceContext?: { name: string; category: string }): string {
  const ctx = serviceContext ? `\n서비스 컨텍스트: "${serviceContext.name}" (${serviceContext.category})` : ''
  return `당신은 한국 콘텐츠 마케팅 및 SEO 전문가입니다.

⚠️ 중요: "GEO" = Generative Engine Optimization (생성형 AI 검색 최적화), 지리적 위치 아님.

주제: "${topic}"
플랫폼: ${PLATFORMS[platform].name}${ctx}

${PLATFORMS[platform].name}에 올릴 콘텐츠가 네이버 + AI 검색에서 잘 노출되도록 키워드를 선정해주세요.

JSON only:
{
  "keywords": {
    "high_volume": ["핵심 키워드 1", "핵심 키워드 2", "핵심 키워드 3"],
    "medium": ["중형 키워드 1", "중형 키워드 2", "중형 키워드 3"],
    "long_tail": ["롱테일 1", "롱테일 2", "롱테일 3", "롱테일 4"]
  },
  "recommended_title_keywords": ["제목 추천 키워드 1", "제목 추천 키워드 2"],
  "search_intent": "정보형 또는 탐색형 또는 거래형"
}`
}
