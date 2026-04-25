/**
 * Quality Agent — Self-Improving Content Optimization System
 * ─────────────────────────────────────────────────────────────────────────────
 * Architecture:
 *   STEP 1: Generate initial content (buildContentPrompt from content-strategy)
 *   STEP 2: Evaluate using strict 100-point rubric
 *   STEP 3: If score < 90 → improve with targeted rewrite
 *   STEP 4: Repeat max 3 iterations
 *
 * Scoring:
 *   Functionality Fit    20pts  (platform intent + depth)
 *   Context Fit          30pts  (blog/company/article/community specific)
 *   Korean Optimization  15pts  (natural Korean + SEO + title)
 *   Naturalness          15pts  (no AI patterns + flow + human feel)
 *   Value Density        10pts  (info/persuasion/insight/engagement)
 *   Platform Diff        10pts  (clearly distinct platform characteristics)
 */

import type { GeneratedContent, PlatformType, ContentDepth, ContentTone } from './content-strategy'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  functionality_fit: number    // 0-20
  context_fit: number          // 0-30
  korean_optimization: number  // 0-15
  naturalness: number          // 0-15
  value_density: number        // 0-10
  platform_differentiation: number // 0-10
}

export interface EvaluationResult {
  score_breakdown: ScoreBreakdown
  total_score: number
  pass: boolean
  fail_reasons: string[]
  improvement_suggestions: string[]
}

export interface QualityEvent {
  type: 'start' | 'generating' | 'evaluating' | 'score' | 'improving' | 'complete' | 'error'
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

// ─── Scoring Rubric Labels (for UI display) ──────────────────────────────────

export const SCORE_LABELS: Record<keyof ScoreBreakdown, { label: string; max: number }> = {
  functionality_fit:       { label: '기능 적합성',        max: 20 },
  context_fit:             { label: '컨텍스트 피팅',       max: 30 },
  korean_optimization:     { label: '한국어 최적화',       max: 15 },
  naturalness:             { label: '자연스러움',           max: 15 },
  value_density:           { label: '가치 밀도',           max: 10 },
  platform_differentiation:{ label: '플랫폼 차별성',       max: 10 },
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

function getPlatformContextRubric(platform: PlatformType): string {
  const rubrics: Record<PlatformType, string> = {
    naver_blog: `
BLOG Context Rubric (30pts):
- 검색 의도 반영 (10pts): 검색 키워드와 사용자 의도에 정확히 맞는가?
  · 10pts: 도입부에서 검색 의도 공감, 본문이 그에 맞는 답변 제공
  · 7-9pts: 검색 의도는 반영됐으나 공감이 약함
  · 0-6pts: 검색 의도 반영 부족
- 체류 유도 구조 (10pts): 스크롤/체류 유도 장치가 있는가?
  · 10pts: 이모지 소제목, 짧은 문단, 목록, 실제 경험, 정리 섹션 모두 포함
  · 7-9pts: 대부분 포함, 일부 부족
  · 0-6pts: 구조적 체류 유도 장치 부족
- 정보 + 경험 혼합 (10pts): 정보성과 경험 기반 서술이 적절히 혼합됐는가?
  · 10pts: 실제 경험체 (~했는데요, ~더라고요) + 구체적 정보 명확히 혼합
  · 7-9pts: 혼합됐으나 어느 한쪽 편향
  · 0-6pts: 순수 정보글 또는 경험만`,
    tistory: `
BLOG Context Rubric (30pts):
- 검색 의도 반영 (10pts): Google SEO 기준으로 검색 의도에 맞는가?
- 구조적 글쓰기 (10pts): H1-H3 계층, 목차, 단락 구조 명확한가?
- 정보 가치 (10pts): 실용적이고 활용 가능한 정보가 충분한가?`,
    velog: `
ARTICLE/BLOG Context Rubric (30pts):
- 문제 → 해결 구조 (10pts): 명확한 문제 정의와 해결 과정이 있는가?
- 기술적 정확성 (10pts): 코드/개념 설명이 정확하고 논리적인가?
- 개발자 커뮤니티 공감 (10pts): 개발자가 공감할 경험/인사이트가 있는가?`,
    company: `
COMPANY PAGE Context Rubric (30pts):
- 명확한 메시지 (10pts): 핵심 가치 제안이 처음 2-3문장 내 명확한가?
  · 10pts: 즉시 이해되는 명확한 메시지, 불필요한 설명 없음
  · 0-6pts: 메시지가 흐릿하거나 너무 장황함
- CTA 존재 (10pts): 명확하고 자연스러운 행동 유도가 있는가?
  · 10pts: 구체적이고 설득력 있는 CTA 포함
  · 0-6pts: CTA 없거나 억지스러움
- 간결하고 신뢰감 (10pts): 불필요한 설명 없이 신뢰를 주는가?
  · 10pts: 비홍보적이면서도 설득력 있음, 데이터/사례 포함
  · 0-6pts: 과도한 홍보 어조 또는 내용 부족`,
    community: `
COMMUNITY Post Context Rubric (30pts):
- 강한 Hook (10pts): 첫 문장이 즉시 관심을 끄는가?
  · 10pts: 의외의 사실/강한 주장/공감 포인트로 즉시 주목
  · 0-6pts: 평범하거나 밋밋한 시작
- 의견/질문 포함 (10pts): 토론을 유발하는 개인 의견이나 질문이 있는가?
  · 10pts: 명확한 본인 관점 + 독자 의견 구하는 질문
  · 0-6pts: 의견 없는 정보글 형태
- 참여 유도 (10pts): 댓글/토론을 자연스럽게 유도하는가?
  · 10pts: 마지막에 독자 경험/의견 구하는 질문으로 마무리
  · 0-6pts: 참여 유도 없음`,
  }
  return rubrics[platform]
}

export function buildEvaluationPrompt(
  content: GeneratedContent,
  req: QualityRequest
): string {
  const platformContextRubric = getPlatformContextRubric(req.platform)

  return `You are an EXTREMELY STRICT Korean content quality evaluator for a professional GEO Dashboard service.

EVALUATION TARGET:
- Platform: ${req.platform}
- Depth: ${req.depth} (${req.depth === 'light' ? '600-900자, 3-4섹션' : req.depth === 'medium' ? '1000-1500자, 4-6섹션' : '2000자+, 6-8섹션'})
- Topic: "${req.topic}"

CONTENT TO EVALUATE:
Title: ${content.title}
---
${content.content}
---

## SCORING RUBRIC (100pts total)

### 1. Functionality Fit (20pts)
- Platform intent correctly reflected (10pts):
  · 10pts: Content clearly and distinctly matches ${req.platform} expectations
  · 7-9pts: Mostly matches with minor issues
  · 4-6pts: Partially matches — key platform elements missing
  · 0-3pts: Does not match platform at all
- Depth (${req.depth}) properly implemented (10pts):
  · 10pts: Character count, section count, detail level exactly match ${req.depth} spec
  · 7-9pts: Close to spec
  · 0-6pts: Significantly off target

### 2. Context Fit (30pts) — MOST IMPORTANT
${platformContextRubric}

### 3. Korean Optimization (15pts)
- Natural Korean expression (5pts):
  · 5pts: Reads exactly like a native Korean wrote it, appropriate speech level
  · 3-4pts: Mostly natural, occasional awkward phrases
  · 0-2pts: Stiff, translated-feeling, or wrong speech level
- SEO keyword usage (5pts) [blog/article]:
  · 5pts: Main keywords appear 3-5x naturally, in title and early paragraphs
  · 3-4pts: Keywords present but placement/frequency suboptimal
  · 0-2pts: Missing or keyword-stuffed
- Title optimization (5pts):
  · 5pts: Title has keyword in first 15 chars, uses number/후기/방법 format for blogs
  · 3-4pts: Title is good but not optimized
  · 0-2pts: Generic or keyword-missing title

### 4. Naturalness (15pts)
- No AI patterns (5pts): Penalize ANY of: "~입니다 [newline] ~입니다", "첫째, 둘째, 셋째" without variation, "다음과 같습니다", overly structured bullets
- Sentence flow (5pts): Varied sentence lengths, natural transitions
- Human-like quality (5pts): Reads like a real person wrote this based on actual experience

### 5. Value Density (10pts)
- For blog: Is there enough practical, immediately useful information?
- For company: Is the persuasive value high enough to convert?
- For community: Will people want to respond?
Score 10 = outstanding, 7-9 = good, 4-6 = mediocre, 0-3 = poor

### 6. Platform Differentiation (10pts)
- Could this ONLY be this platform? Or does it read generic?
- 10pts: Unmistakably ${req.platform} — would feel out of place on any other platform
- 7-9pts: Mostly differentiated
- 0-6pts: Could be any blog/post

## AUTO FAIL CONDITIONS → total_score = 0:
- Platform characteristics completely ignored
- Company page written exactly like a blog post
- Community post with no Hook or opinion
- More than 3 obvious AI-sounding sentences

## SCORING PHILOSOPHY:
- Be STRICT. A genuinely excellent piece scores 90+.
- First drafts typically score 55-75.
- Do NOT inflate scores to be nice.
- If you see a problem, deduct accordingly.

Return ONLY valid JSON (no explanation):
{
  "score_breakdown": {
    "functionality_fit": <0-20>,
    "context_fit": <0-30>,
    "korean_optimization": <0-15>,
    "naturalness": <0-15>,
    "value_density": <0-10>,
    "platform_differentiation": <0-10>
  },
  "total_score": <0-100>,
  "pass": <true if total_score >= 90>,
  "fail_reasons": ["<specific Korean reason 1>", "..."],
  "improvement_suggestions": ["<specific Korean improvement 1>", "..."]
}`
}

export function buildImprovementPrompt(
  content: GeneratedContent,
  evaluation: EvaluationResult,
  req: QualityRequest,
  iteration: number
): string {
  // Find weakest areas
  const breakdown = evaluation.score_breakdown
  const gaps = [
    { key: 'functionality_fit', label: '기능 적합성', current: breakdown.functionality_fit, max: 20 },
    { key: 'context_fit', label: '컨텍스트 피팅', current: breakdown.context_fit, max: 30 },
    { key: 'korean_optimization', label: '한국어 최적화', current: breakdown.korean_optimization, max: 15 },
    { key: 'naturalness', label: '자연스러움', current: breakdown.naturalness, max: 15 },
    { key: 'value_density', label: '가치 밀도', current: breakdown.value_density, max: 10 },
    { key: 'platform_differentiation', label: '플랫폼 차별성', current: breakdown.platform_differentiation, max: 10 },
  ]
    .map(d => ({ ...d, gap: d.max - d.current, pct: Math.round((d.current / d.max) * 100) }))
    .sort((a, b) => b.gap - a.gap)

  const weakestAreas = gaps.slice(0, 3).map(g => `  - ${g.label}: ${g.current}/${g.max}점 (${g.pct}%) → ${g.max}점 목표`).join('\n')

  const platformTips: Record<PlatformType, string> = {
    naver_blog: '경험 기반 후기체 (~했는데요, ~더라고요), 이모지 소제목, 2-3줄 짧은 문단, 검색 의도 공감 도입부가 핵심입니다.',
    tistory: 'H2/H3 명확한 계층, 목차, 실용적 정보 위주, Google SEO 기준 제목 최적화가 핵심입니다.',
    velog: '문제 정의 → 코드/해결 → 회고 구조, 기술적 정확성, 개발자 관점의 인사이트가 핵심입니다.',
    company: '첫 2문장에 핵심 가치 제안, 자연스러운 CTA, 비홍보적이지만 설득력 있는 어조가 핵심입니다.',
    community: '첫 문장 Hook (의외 사실/강한 주장), 본인 의견 명확히, 마지막에 독자 질문이 핵심입니다.',
  }

  return `You are a Korean content improvement specialist — iteration ${iteration} of max 3.

CURRENT STATE: ${evaluation.total_score}/100 (FAIL — need 90+)
POINTS NEEDED: ${90 - evaluation.total_score}점 더 필요

WEAKEST AREAS (fix these first):
${weakestAreas}

SPECIFIC FAILURES:
${evaluation.fail_reasons.map(r => `  ❌ ${r}`).join('\n')}

EVALUATOR SUGGESTIONS:
${evaluation.improvement_suggestions.map(s => `  → ${s}`).join('\n')}

PLATFORM REMINDER (${req.platform}):
${platformTips[req.platform]}

ORIGINAL CONTENT:
Title: ${content.title}
---
${content.content}
---

IMPROVEMENT RULES:
1. DO NOT slightly tweak — make MEANINGFUL rewrites of weak areas
2. Keep sections that scored well (do not break what works)
3. Fix EVERY fail_reason listed above
4. Apply EVERY improvement_suggestion
5. The rewritten content MUST feel genuinely human-written in Korean
6. This iteration MUST improve score by at least 10+ points
7. If naturalness was weak: rewrite AI-sounding sentences with natural Korean expressions
8. If context_fit was weak: restructure to match platform format more precisely
9. If platform_differentiation was weak: make it unmistakably ${req.platform}

Return ONLY valid JSON (same format, no explanation):
{
  "title": "...",
  "summary": "...",
  "content": "...",
  "hashtags": [...],
  "estimated_read_time": "...",
  "platform_optimization_notes": "...",
  "seo_keywords": [...],
  "geo_score_estimate": <number>,
  "geo_optimizations_applied": [...]
}`
}
