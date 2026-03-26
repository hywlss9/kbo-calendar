# KBO Calendar — Project Rules

## Project Overview
KBO 프로야구 경기 일정, 결과, 경기 내용을 수집하여 캘린더 UI로 보여주는 웹 서비스.

## Tech Stack
- **Runtime**: Node.js 22+ / TypeScript 5.7+
- **Framework**: Next.js 16 (App Router, Turbopack, React 19.2)
- **Styling**: Tailwind CSS 4
- **Data Fetching**: axios + cheerio (KBO 내부 API / PostBack 크롤링)
- **Headless Browser**: playwright (fallback 크롤링 전용)
- **DB**: SQLite via better-sqlite3 — 경량, 서버리스 배포 가능
- **Scheduling**: node-cron (경기 데이터 정기 수집)
- **Date**: dayjs (KST 타임존 처리)
- **Testing**: vitest + @testing-library/react
- **Linting**: ESLint (flat config) + Prettier

## Next.js 16 Specific Rules
- **"use cache" 디렉티브**: 캘린더 월간 데이터 등 캐싱이 유리한 부분에 적용
- **Server Component 기본**: 모든 페이지/레이아웃은 Server Component, "use client"는 인터랙션이 꼭 필요한 컴포넌트에만 사용
- **Server Actions**: 수동 동기화 트리거 등 mutation은 Server Actions로 처리 (별도 API route 대신)
- **View Transitions**: 월 이동, 경기 상세 진입 시 React 19.2 View Transitions 활용
- **Turbopack**: 개발 서버는 `next dev --turbopack`으로 실행
- **next.config.ts**: TypeScript 설정 파일 사용

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # 루트 레이아웃
│   ├── page.tsx            # 메인 캘린더 뷰
│   ├── game/[gameId]/
│   │   └── page.tsx        # 경기 상세 페이지
│   ├── api/                # Route Handlers (외부 연동용)
│   │   ├── games/route.ts
│   │   └── game/[gameId]/route.ts
│   └── actions/            # Server Actions
│       ├── sync.ts         # 동기화 트리거
│       └── filter.ts       # 팀별 필터링
├── lib/
│   ├── scraper/            # 크롤러 모듈
│   │   ├── kbo-api.ts      # KBO Schedule.asmx 내부 API
│   │   ├── kbo-schedule.ts # 경기 일정 목록 (PostBack)
│   │   ├── kbo-detail.ts   # 박스스코어/경기 상세
│   │   ├── parser.ts       # HTML 파싱 유틸
│   │   └── types.ts        # 크롤링 raw 데이터 타입
│   ├── db/
│   │   ├── schema.ts       # SQLite 테이블 정의
│   │   ├── client.ts       # DB 연결 싱글턴
│   │   └── queries.ts      # 쿼리 함수
│   ├── sync/
│   │   ├── scheduler.ts    # node-cron 스케줄러
│   │   └── sync-games.ts   # 동기화 파이프라인
│   └── utils/
│       ├── date.ts         # dayjs KST 유틸
│       └── teams.ts        # KBO 10개 팀 상수
├── components/
│   ├── calendar/
│   │   ├── CalendarView.tsx     # 월간 캘린더 (Server Component)
│   │   ├── CalendarNav.tsx      # 월 이동 (Client Component)
│   │   ├── DayCell.tsx
│   │   └── GameCard.tsx
│   ├── game/
│   │   ├── ScoreBoard.tsx
│   │   └── BoxScore.tsx
│   └── ui/
│       ├── TeamBadge.tsx
│       └── StatusBadge.tsx
└── types/
    └── index.ts            # 공유 타입 정의
```

## Data Sources (우선순위 순)

### 1차: KBO 내부 웹서비스 API (POST)
- `POST /ws/Schedule.asmx/GetScoreBoardScroll`
- `POST /ws/Schedule.asmx/GetBoxScoreScroll`
- Body: `{ leId: 1, srId: 0, seasonId: 2026, gameId: "20260328KTLG0" }`
- 응답: JSON (HTML 조각 + 경기 메타데이터)

### 2차: KBO 경기일정 페이지 (ASP.NET PostBack)
- `GET → POST /Schedule/Schedule.aspx` (__VIEWSTATE 추출 후 PostBack)
- cheerio로 테이블 파싱

### 3차: Playwright (fallback)
- 위 방법 실패 시에만 사용 — 헤드리스 Chromium 렌더링

## Game ID Convention
포맷: `YYYYMMDD{AWAY}{HOME}{INDEX}`
- 예: `20260328KTLG0` → 2026-03-28 KT(원정) vs LG(홈) 첫 경기
- 팀 코드: LG, HH(한화), SK(SSG), SS(삼성), NC, KT, LT(롯데), HT(KIA), OB(두산), WO(키움)

## Coding Conventions
- 모든 날짜/시간: KST (Asia/Seoul) 기준, dayjs 사용
- 함수명: camelCase / 타입명: PascalCase / 파일명: kebab-case.ts
- 크롤링 요청 간 최소 1.5초 delay
- 에러 발생 시 3회 재시도, 이후 로그 남기고 skip
- 크롤러 함수는 모두 try-catch, graceful failure
- DB 쿼리는 prepared statement 사용
- import alias: `@/` → `src/`
- 절대 `any` 타입 사용 금지, unknown 후 타입 가드 사용

## Testing
- 크롤러: 네트워크 mock + HTML fixture 파일로 파싱 테스트
- DB: in-memory SQLite
- 컴포넌트: React Testing Library + vitest

## Important Notes
- KBO robots.txt: `/ws/` 경로 Disallow → 요청 간격 넉넉히
- 시즌 구분: srId(0=정규, 1=시범, 4~7=포스트시즌)
- 경기 특수 상태: 우천취소, 더블헤더, 연장전, 콜드게임, 서스펜디드
