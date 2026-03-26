# /plan 프롬프트 모음

Claude Code에서 `/plan` 입력 후 아래 내용을 붙여넣으면 됩니다.
Phase 순서대로 진행하세요.

---

## Phase 1 — 프로젝트 초기화

```
/plan Next.js 16 프로젝트를 초기화해줘.

요구사항:
- npx create-next-app@latest로 생성 (App Router, TypeScript, Tailwind CSS 4, Turbopack, ESLint)
- 추가 의존성 설치: axios, cheerio, better-sqlite3, dayjs, node-cron
- Dev 의존성: @types/better-sqlite3, vitest, @testing-library/react, prettier
- tsconfig: strict, paths에 "@/*" → "./src/*"
- next.config.ts 사용 (TypeScript 설정 파일)
- CLAUDE.md의 Architecture에 맞게 디렉토리 생성
- 기존 src/types/index.ts와 src/lib/db/schema.ts를 프로젝트에 포함
```

---

## Phase 2 — KBO 크롤러 모듈

```
/plan KBO 내부 API 크롤러(src/lib/scraper/kbo-api.ts)를 설계해줘.

요구사항:
- fetchScoreBoard(params: KboApiParams): Promise<ScraperResult<ScoreBoard>>
- fetchBoxScore(params: KboApiParams): Promise<ScraperResult<BoxScore>>
- 응답의 d 필드를 JSON 파싱, HTML 조각을 cheerio로 구조화
- docs/kbo-data-reference.md의 SCRAPER_CONFIG 적용 (delay, retry, timeout)
- 파싱 실패 시 ScraperResult.error에 메시지 담아 반환
- src/types/index.ts의 타입 사용
```

```
/plan KBO 경기일정 크롤러(src/lib/scraper/kbo-schedule.ts)를 설계해줘.

요구사항:
- fetchScheduleByMonth(year: number, month: number): Promise<ScraperResult<GameSchedule[]>>
- GET으로 초기 페이지 → __VIEWSTATE 추출 → POST로 월별 일정 요청
- cheerio로 .tbl-type06 테이블 파싱
- 우천취소/더블헤더 등 비고 컬럼 → GameStatus 매핑
- gameId는 게임센터 링크에서 추출
- PostBack 실패 시 Playwright fallback 고려 (별도 함수로 분리)
```

```
/plan HTML 파서 유틸(src/lib/scraper/parser.ts)을 설계해줘.

요구사항:
- parseScoreBoardHtml(html: string): ScoreBoard
- parseBoxScoreHtml(html: string): { batters: BatterRecord[], pitchers: PitcherRecord[] }
- parseScheduleTableHtml(html: string): GameSchedule[]
- 각 함수는 cheerio로 HTML 파싱, 실패 시 명확한 에러 throw
- 숫자 파싱(parseInt, parseFloat)에서 NaN 방어
- 선택자(selector)를 상수로 분리하여 사이트 변경 시 한 곳만 수정
```

---

## Phase 3 — DB 레이어

```
/plan DB 클라이언트와 쿼리 함수를 설계해줘.

요구사항:
- src/lib/db/client.ts: better-sqlite3 싱글턴, 앱 시작 시 CREATE_TABLES_SQL 실행
- src/lib/db/queries.ts: schema.ts의 Q 상수를 사용하는 함수들
  - getGamesByDate(date: string): GameSchedule[]
  - getGamesByRange(from: string, to: string): GameSchedule[]
  - getGamesByTeam(team: TeamCode, from: string, to: string): GameSchedule[]
  - getGameById(gameId: string): BoxScore | null
  - upsertGame(game: GameSchedule): void
  - upsertScoreBoard(gameId: string, score: ScoreBoard): void
  - upsertBoxScore(gameId: string, box: BoxScore): void
- GameRow ↔ GameSchedule/BoxScore 변환 유틸 포함
- prepared statement 사용
```

---

## Phase 4 — 동기화 파이프라인

```
/plan 데이터 동기화 모듈(src/lib/sync/)을 설계해줘.

요구사항:
- src/lib/sync/sync-games.ts:
  - syncSchedule(year, month): 월별 일정 크롤링 → DB upsert
  - syncScores(date): 당일 종료 경기 스코어보드 수집 → DB upsert
  - syncBoxScores(date): 당일 종료 경기 박스스코어 수집 → DB upsert
  - 각 함수는 sync_logs 테이블에 이력 기록
  - 개별 경기 실패 시 continue, 최종적으로 에러 목록 반환

- src/lib/sync/scheduler.ts:
  - node-cron 스케줄 등록 (docs/kbo-data-reference.md 참고)
  - Next.js instrumentation hook에서 초기화

- src/app/actions/sync.ts:
  - Server Action으로 수동 동기화 트리거
  - revalidatePath로 캘린더 캐시 무효화
```

---

## Phase 5 — API Routes

```
/plan Next.js 16 Route Handlers를 설계해줘.

요구사항:
- GET /api/games?date=2026-03-28 → 특정 날짜 경기
- GET /api/games?from=2026-03-01&to=2026-03-31 → 범위 조회
- GET /api/games?from=...&to=...&team=LG → 팀 필터
- GET /api/game/[gameId] → 경기 상세 (스코어보드 + 박스스코어)
- 응답: ApiResponse<T> 타입 일관 적용
- 쿼리 파라미터 validation (zod 또는 수동)
- "use cache" 적용 가능한 부분 검토
```

---

## Phase 6 — 캘린더 UI

```
/plan 메인 캘린더 UI(src/components/calendar/)를 설계해줘.

요구사항:
- CalendarView.tsx (Server Component):
  - DB에서 월간 경기 데이터 직접 조회 (Server Component 이점 활용)
  - "use cache" 디렉티브로 같은 월 반복 조회 캐싱
  - 7열 × 5~6행 그리드, 날짜 셀에 경기 카드 배치

- CalendarNav.tsx ("use client"):
  - 이전/다음 월 네비게이션, 오늘 버튼
  - React 19.2 View Transitions로 월 전환 애니메이션
  - URL searchParams로 year/month 관리

- GameCard.tsx:
  - 팀 로고/이름, 시간, 스코어
  - 경기 상태별 스타일 (예정/진행중/종료/취소)
  - 클릭 → /game/[gameId] 링크

- DayCell.tsx:
  - 날짜 표시, 오늘 하이라이트
  - 경기 없는 날 표시

- 팀별 필터 (10개 팀 토글)
- 모바일: 캘린더 그리드 → 리스트 뷰 전환
```

```
/plan 경기 상세 페이지(src/app/game/[gameId]/page.tsx)를 설계해줘.

요구사항:
- Server Component로 구현, DB에서 직접 조회
- ScoreBoard.tsx: 이닝별 점수 테이블, R/H/E/B, 결정투수
- BoxScore.tsx: 타자 기록 테이블, 투수 기록 테이블
- 홈런 기록, 경기 메타 (경기장/관중/경기시간)
- 뒤로가기 → 캘린더로 복귀 (View Transitions)
- 경기 데이터 없을 때 fallback UI
```

---

## Phase 7 — 테스트

```
/plan 프로젝트 전체 테스트 전략을 설계해줘.

요구사항:
- vitest 설정 (vitest.config.ts)
- 크롤러 테스트:
  - KBO API 응답 mock용 fixture JSON 파일 작성
  - parser.ts: 정상 HTML → 구조화 데이터 정확성
  - kbo-api.ts: 에러/타임아웃 시나리오
  - kbo-schedule.ts: PostBack 응답 파싱, 특수 상태
- DB 테스트:
  - in-memory SQLite로 CRUD 검증
  - upsert 동작 (새 경기 vs 기존 경기 업데이트)
- 컴포넌트 테스트:
  - CalendarView: 월간 데이터 렌더링
  - GameCard: 상태별 렌더링
  - ScoreBoard: 이닝별 점수 표시
```

---

## Phase 8 - 추가 기능 개발(2026-03-20)

```
/plan
```

---

## 유틸리티 프롬프트

```
/plan 현재 프로젝트 구조를 점검하고 CLAUDE.md와 실제 코드의 불일치를 찾아줘.
```

```
/plan 크롤러에 방어적 파싱 패턴을 적용해줘.
- CSS 선택자를 상수로 분리
- 선택자 매칭 실패 시 graceful error
- 사이트 구조 변경 감지 로직
```

```
/plan 배포 전략을 설계해줘.
- Vercel 배포 시 SQLite 대안 (Turso / Cloudflare D1 등)
- 또는 VPS(fly.io, Railway) + SQLite 파일 영속화
- node-cron 스케줄러가 서버리스에서 동작하지 않는 문제 대응
```

---
