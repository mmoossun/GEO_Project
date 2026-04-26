/**
 * Quality Agent — Publishable Content Standard
 *
 * Pass bar: 90+ / 100
 * Max iterations: 5
 * Scoring:
 *   Functionality Fit     15pts  (platform + depth match)
 *   Content Substance     30pts  (specificity, data, examples, unique insight) ← most important
 *   Context Fit           25pts  (platform-specific structure + voice)
 *   Korean Naturalness    20pts  (human feel, no AI patterns, authentic voice)
 *   GEO Optimization      10pts  (answer capsule, structure, keywords)
 */

import type { GeneratedContent, PlatformType, ContentDepth, ContentTone } from './content-strategy'

export interface ScoreBreakdown {
  functionality_fit: number        // 0-15
  context_fit: number              // 0-25
  korean_optimization: number      // 0-20
  naturalness: number              // 0-20 (renamed but maps to "korean naturalness")
  value_density: number            // 0-10 (maps to GEO optimization)
  platform_differentiation: number // 0-10 (maps to content substance partial)
}

export interface EvaluationResult {
  score_breakdown: ScoreBreakdown
  total_score: number
  pass: boolean
  fail_reasons: string[]
  improvement_suggestions: string[]
}

export interface QualityEvent {
  type: 'start' | 'generating' | 'briefing' | 'evaluating' | 'score' | 'improving' | 'complete' | 'error'
  iteration?: number
  message?: string
  total?: number
  pass?: boolean
  breakdown?: ScoreBreakdown
  reasons?: string[]
  suggestions?: string[]
  weakAreas?: string[]
  content?: GeneratedContent
  finalScore?: number
  totalIterations?: number
  improvementSummary?: string[]
  error?: string
}

export interface QualityRequest {
  platform: PlatformType
  depth: ContentDepth
  topic: string
  keywords?: string[]
  tone?: ContentTone
  targetAudience?: string
  serviceContext?: { name: string; category: string }
}

export const SCORE_LABELS: Record<keyof ScoreBreakdown, { label: string; max: number }> = {
  functionality_fit:        { label: '기능 적합성',  max: 15 },
  context_fit:              { label: '콘텐츠 실질',  max: 25 },
  korean_optimization:      { label: '한국어 최적화', max: 20 },
  naturalness:              { label: '자연스러움',   max: 20 },
  value_density:            { label: 'GEO 최적화',  max: 10 },
  platform_differentiation: { label: '플랫폼 차별성', max: 10 },
}

// ─── Evaluation Prompt ───────────────────────────────────────────────────────

function getContextRubric(platform: PlatformType): string {
  const rubrics: Record<PlatformType, string> = {
    naver_blog: `
### 2. Content Substance — 콘텐츠 실질 (25pts) ← HIGHEST WEIGHT

A. 구체성·데이터·예시 (10pts):
  - 10pts: 수치 최소 2개 + 실제 사례(가상 아님) + 각 팁에 "왜"가 설명됨
  - 7-9pts: 수치 1개 or 사례 1개 포함, 일부 부족
  - 4-6pts: "중요합니다", "효과적입니다" 수준의 막연한 서술
  - 0-3pts: 수치/사례 전무, 완전히 제네릭

B. 독창성·차별화 (8pts):
  - 8pts: 이 글만의 관점이 명확함 — 검색하면 나오는 일반 내용 아님
  - 5-7pts: 일부 독창적, 대부분 일반적
  - 0-4pts: 검색 최상위 결과를 그대로 요약한 수준

C. 즉시 활용 가능성 (7pts):
  - 7pts: 읽고 오늘 바로 실행 가능한 구체적 액션 3개 이상
  - 4-6pts: 1-2개 실행 가능, 나머지 추상적
  - 0-3pts: 이론 나열, 실행 불가

### 3. Context Fit — 네이버 블로그 적합성 (25pts)

A. 경험·후기 서술 (10pts):
  - 10pts: 실제 경험 기반 서술 (~했는데요, ~더라고요), 경험자의 시점이 명확
  - 7-9pts: 일부 경험 서술, 정보글 성격 강함
  - 0-6pts: 순수 정보 나열, 경험 없음

B. 검색 의도 공감 (8pts):
  - 8pts: 도입부에서 독자의 검색 의도를 정확히 짚고 "이 글이 그 답이다" 제시
  - 5-7pts: 의도 반영됐으나 공감 약함
  - 0-4pts: 도입부에 의도 파악 없음

C. 체류 유도 구조 (7pts):
  - 7pts: 이모지 소제목 + 2-3줄 단락 + 구분선 + 정리 섹션 모두 있음
  - 4-6pts: 대부분 있음, 일부 부족
  - 0-3pts: 긴 문단, 구조 없음`,

    tistory: `
### 2. Content Substance — 콘텐츠 실질 (25pts)

A. 구체성·데이터 (10pts): 수치 2개 이상 + 실제 사례 포함 여부
B. 독창성 (8pts): 검색 최상위와 다른 관점 또는 추가 인사이트 있는가
C. 즉시 활용 가능성 (7pts): 바로 적용 가능한 팁 3개 이상

### 3. Context Fit — 티스토리 적합성 (25pts)

A. Google SEO 구조 (10pts): H2/H3 계층 명확, 첫 단락에 키워드+핵심 요약
B. 정보 밀도 (8pts): 각 H2 섹션이 독립적으로 완결된 정보 제공
C. 비교/목록 활용 (7pts): 표나 번호 목록으로 스캐닝 독자 배려`,

    velog: `
### 2. Content Substance — 콘텐츠 실질 (25pts)

A. 기술적 정확성·구체성 (10pts): 코드 블록 있고 동작 가능한 코드, 개념 설명 정확
B. 문제-해결 스토리 (8pts): 실제 문제 → 시행착오 → 해결 흐름이 명확
C. 개발자 인사이트 (7pts): 트레이드오프, 주의점, "내가 배운 것" 포함

### 3. Context Fit — 벨로그 적합성 (25pts)

A. 문제 → 해결 구조 (10pts): 명확한 문제 정의 + 해결 과정
B. 기술 공동체 공감 (8pts): 개발자가 공감할 표현과 상황 묘사
C. 코드/도구 활용 (7pts): Markdown 코드 블록 + 기술 정확성`,

    company: `
### 2. Content Substance — 콘텐츠 실질 (25pts)

A. 구체적 성과/사례 (10pts): 측정 가능한 수치 2개 이상, 실제 적용 시나리오
B. E-E-A-T 신호 (8pts): 전문성·경험·권위·신뢰 신호가 명확히 있는가
C. 비홍보 설득력 (7pts): 직접 홍보 없이 "이 서비스가 필요하다"는 확신을 주는가

### 3. Context Fit — 기업 콘텐츠 적합성 (25pts)

A. 핵심 가치 제안 명확성 (10pts): 첫 2-3문장에서 독자가 얻는 것이 명확한가
B. CTA 자연스러움 (8pts): 강요 없이 다음 행동을 유도하는가
C. 브랜드 신뢰감 (7pts): 비홍보적이면서도 설득력 있는 어조인가`,

    community: `
### 2. Content Substance — 콘텐츠 실질 (25pts)

A. 고유한 경험/관점 (10pts): 작성자만의 경험 또는 관찰이 구체적으로 있는가
B. 논거의 구체성 (8pts): 주장을 뒷받침하는 수치나 사례가 있는가
C. 토론 유발 가능성 (7pts): "나는 어떻게 생각하지?"를 유발하는 내용인가

### 3. Context Fit — 커뮤니티 적합성 (25pts)

A. Hook 강도 (10pts): 첫 문장이 즉시 주목을 끄는가 (의외 사실/강한 주장)
B. 명확한 의견 제시 (8pts): 작성자의 입장이 명확한가 (중립적 정보글 금지)
C. 독자 참여 유도 (7pts): 마지막에 진짜 궁금한 질문으로 마무리하는가`,
  }
  return rubrics[platform]
}

export function buildEvaluationPrompt(content: GeneratedContent, req: QualityRequest): string {
  const contextRubric = getContextRubric(req.platform)
  const depthSpec = req.depth === 'light' ? '700-1000자, 3-4섹션' : req.depth === 'medium' ? '1500-2000자, 5-7섹션' : '2800-3500자, 7-10섹션'

  return `You are an EXTREMELY STRICT Korean content editor. Your single question: "Is this publishable without revision?"

EVALUATION TARGET:
- Platform: ${req.platform} | Depth: ${req.depth} (${depthSpec}) | Topic: "${req.topic}"

CONTENT:
Title: ${content.title}
---
${content.content}
---

## SCORING RUBRIC (100pts total) — BE BRUTALLY HONEST

### 1. Functionality Fit (15pts)
A. Platform spec (8pts): Does content clearly match ${req.platform}? (8=perfect, 5-7=mostly, 0-4=wrong)
B. Depth match (7pts): Does character count + section count match ${req.depth}? (7=exact, 4-6=close, 0-3=off)

${contextRubric}

### 4. Korean Naturalness (20pts)
A. No AI patterns (8pts):
  - Penalize EACH: "이 글에서는 ~알아보겠습니다", "첫째/둘째/셋째" without variation,
    "다음과 같습니다", "이것은 중요합니다", "마지막으로 정리하면", generic filler phrases
  - 8pts = zero AI patterns | 5-7pts = 1-2 patterns | 0-4pts = 3+ patterns
B. Authentic voice (6pts): Reads like a real person with genuine opinions, not a generated summary
C. Natural sentence flow (6pts): Varied lengths, natural transitions, not choppy or overly formal

### 5. GEO Optimization (10pts)
A. Answer Capsule (5pts): 40-60자 핵심 요약 있고 AI가 바로 인용할 수 있는 형태인가
B. Structure signals (5pts): Proper headings + keyword placement + FAQ/list if applicable

### 6. Platform Differentiation (10pts)
- 10pts: Unmistakably ${req.platform} — would feel totally wrong on any other platform
- 7-9pts: Mostly differentiated
- 0-6pts: Generic — could be any blog

## INSTANT FAIL CONDITIONS → force score 0:
- No specific data or examples (pure generic advice)
- More than 3 AI-obvious phrases
- Character count under 60% of depth minimum
- Wrong platform voice entirely

## SCORING PHILOSOPHY:
- 90-100: Publishable immediately, professional quality
- 80-89: Good but needs 1-2 specific improvements
- 65-79: Decent structure, content too generic or shallow
- Below 65: Needs major rewrite

First drafts of generic topics usually score 55-72. Be honest.

Return ONLY valid JSON:
{
  "score_breakdown": {
    "functionality_fit": <0-15>,
    "context_fit": <0-25>,
    "korean_optimization": <0-20>,
    "naturalness": <0-20>,
    "value_density": <0-10>,
    "platform_differentiation": <0-10>
  },
  "total_score": <0-100>,
  "pass": <true if total_score >= 90>,
  "fail_reasons": ["구체적 실패 이유 1 (한국어)", "이유 2", "이유 3"],
  "improvement_suggestions": ["구체적 개선 방향 1 (한국어)", "방향 2", "방향 3"]
}`
}

// ─── Improvement Prompt ───────────────────────────────────────────────────────

export function buildImprovementPrompt(
  content: GeneratedContent,
  evaluation: EvaluationResult,
  req: QualityRequest,
  iteration: number
): string {
  const breakdown = evaluation.score_breakdown
  const gaps = [
    { key: 'functionality_fit',        label: '기능 적합성',  current: breakdown.functionality_fit,        max: 15 },
    { key: 'context_fit',              label: '콘텐츠 실질',  current: breakdown.context_fit,              max: 25 },
    { key: 'korean_optimization',      label: '한국어 최적화', current: breakdown.korean_optimization,      max: 20 },
    { key: 'naturalness',              label: '자연스러움',   current: breakdown.naturalness,              max: 20 },
    { key: 'value_density',            label: 'GEO 최적화',  current: breakdown.value_density,            max: 10 },
    { key: 'platform_differentiation', label: '플랫폼 차별성', current: breakdown.platform_differentiation, max: 10 },
  ]
    .map(d => ({ ...d, gap: d.max - d.current, pct: Math.round((d.current / d.max) * 100) }))
    .sort((a, b) => b.gap - a.gap)

  const weakest = gaps.slice(0, 3).map(g => `  - ${g.label}: ${g.current}/${g.max}pts (${g.pct}%) — ${g.max - g.current}pts 회수 필요`).join('\n')

  const specificFixes: Record<PlatformType, string> = {
    naver_blog: `
NAVER BLOG FIX CHECKLIST:
  □ 도입부: "혹시 [구체적 상황] 때문에 찾으셨나요?" 형태로 시작
  □ 수치 최소 2개 추가 (월 검색량, 효과 수치, 연도 등 구체적으로)
  □ "실제로 해봤더니..." 경험 기반 서술 최소 1섹션
  □ 모든 팁에 "왜 효과적인가" 1줄 추가
  □ AI 패턴 제거: "이 글에서는 알아보겠습니다" → 바로 본론 시작
  □ Answer Capsule: 핵심 내용 40-60자 박스 추가`,
    tistory: `
TISTORY FIX CHECKLIST:
  □ 첫 단락 150자 이내에 핵심 키워드 + 이 글의 답변 포함
  □ ## H2 섹션마다 독립적 완결 정보 제공
  □ 비교표 or 단계 목록 추가 (스캐닝 독자 배려)
  □ FAQ 섹션 Q 2-3개 추가
  □ 각 섹션 끝에 핵심 요약 1줄`,
    velog: `
VELOG FIX CHECKLIST:
  □ 실제 동작하는 코드 블록 추가 (주석 포함)
  □ "내가 겪은 문제" → "시도한 방법" → "최종 해결" 구조 강화
  □ Before/After 비교 추가
  □ "이 방법의 한계점" 솔직히 언급
  □ 참고 리소스 추가`,
    company: `
COMPANY FIX CHECKLIST:
  □ 첫 2문장에 명확한 가치 제안 (독자가 얻는 것)
  □ 구체적 성과 수치 2개 추가 ("~% 개선" 형식)
  □ 홍보 어조 제거 → 교육적 어조로
  □ 자연스러운 CTA 1개만 (끝에)
  □ 외부 데이터/연구 인용 1개`,
    community: `
COMMUNITY FIX CHECKLIST:
  □ 첫 문장 완전 교체: 의외 사실 or 강한 주장으로
  □ "많은 사람들이..." → "제가 직접..." 으로 시점 전환
  □ 나의 명확한 의견/입장 강화 (중립 금지)
  □ 마지막 질문을 더 구체적으로 ("어떻게 생각하세요?" 금지 → 특정 상황 질문)`,
  }

  return `Korean content rewriter — iteration ${iteration}/5. Target: 90+/100.

CURRENT SCORE: ${evaluation.total_score}/100
POINTS NEEDED: +${90 - evaluation.total_score}pts

WEAKEST AREAS (fix in priority order):
${weakest}

FAILURES TO FIX:
${evaluation.fail_reasons.map(r => `  ❌ ${r}`).join('\n')}

EVALUATOR SUGGESTIONS:
${evaluation.improvement_suggestions.map(s => `  → ${s}`).join('\n')}

PLATFORM-SPECIFIC FIXES (${req.platform}):
${specificFixes[req.platform]}

ORIGINAL CONTENT:
Title: ${content.title}
---
${content.content}
---

REWRITE RULES:
1. MAJOR rewrites required — minor tweaks won't gain 10+ points
2. Add CONCRETE DATA where content is vague (실제 수치, 실제 사례)
3. Replace ALL AI-pattern phrases with natural Korean
4. Keep sections that scored well
5. If context_fit < 18: restructure to match ${req.platform} format exactly
6. If naturalness < 14: rewrite intro + transitions entirely
7. If content substance weak: add specific example/data to EVERY section
8. Content must be AT LEAST as long as original (do not shorten)

Return ONLY valid JSON (same format):
{
  "title": "...",
  "summary": "...",
  "content": "...",
  "hashtags": [...],
  "estimated_read_time": "...",
  "platform_optimization_notes": "...",
  "seo_keywords": [...],
  "geo_score_estimate": <number>,
  "geo_optimizations_applied": [...],
  "unique_angle": "..."
}`
}
