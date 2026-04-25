# GEO Score 대시보드

**GEO (Generative Engine Optimization)** — ChatGPT · Perplexity · Gemini에서 내 서비스가 얼마나 인용되는지 측정하고, AI 검색에 최적화된 콘텐츠를 생성하는 서비스입니다.

> 프린스턴 대학교 KDD 2024 GEO 연구 기반 · OpenAI GPT-4o 구동

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| **GEO 점수 분석** | 서비스명 + 카테고리만 입력하면 5차원 100점 분석 |
| **AI 에이전트 채팅** | GEO 전문가 AI와 대화로 콘텐츠·전략 즉시 해결 |
| **콘텐츠 생성기** | 네이버 블로그·티스토리·벨로그·기업웹·커뮤니티 맞춤 생성 |
| **품질 에이전트** | 90점 달성까지 자동 생성→평가→개선 반복 |

---

## 빠른 시작

### 1. 클론 및 설치

```bash
git clone https://github.com/mmoossun/GEO_Project.git
cd GEO_Project
npm install
```

### 2. 환경 변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 파일을 열고 OpenAI API 키를 입력합니다:

```
OPENAI_API_KEY=sk-...
```

> OpenAI API 키 발급: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### 3. 실행

```bash
npm run dev
```

→ [http://localhost:3000](http://localhost:3000) 에서 확인

---

## 기술 스택

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **AI**: OpenAI GPT-4o (분석·생성·품질에이전트) + GPT-4o-mini (채팅·키워드)
- **Charts**: Recharts

---

## API 라우트

| 경로 | 모델 | 설명 |
|------|------|------|
| `POST /api/analyze` | GPT-4o | 서비스 GEO 점수 분석 (5차원) |
| `POST /api/chat` | GPT-4o-mini | AI 에이전트 스트리밍 채팅 |
| `POST /api/content` | GPT-4o | 플랫폼별 콘텐츠 생성 |
| `POST /api/content/keywords` | GPT-4o-mini | 한국어 SEO 키워드 추천 |
| `POST /api/content/quality` | GPT-4o | 90점 보장 자가개선 에이전트 |

---

## GEO 점수 체계 (100점 만점)

| 차원 | 배점 | 평가 항목 |
|------|------|----------|
| 콘텐츠 구조 | 20점 | H1-H3 계층, FAQ, 답변 캡슐 |
| E-E-A-T 신뢰성 | 25점 | 저자 정보, 통계, 인용, 비홍보 어조 |
| 기술 신호 | 20점 | JSON-LD 스키마, 메타태그, 날짜 |
| 최신성 | 15점 | 발행일, 업데이트 빈도 |
| 가독성 | 20점 | 명확성, 스캔 가능성, 어휘 다양성 |

---

## 라이선스

MIT
