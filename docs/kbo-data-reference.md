# KBO 데이터 소스 레퍼런스

## 1. KBO 내부 웹서비스 API

### 엔드포인트

| API | Method | URL |
|-----|--------|-----|
| 스코어보드 | POST | `/ws/Schedule.asmx/GetScoreBoardScroll` |
| 박스스코어 | POST | `/ws/Schedule.asmx/GetBoxScoreScroll` |

**Base URL**: `https://www.koreabaseball.com`
**Content-Type**: `application/x-www-form-urlencoded; charset=UTF-8`

### 요청 파라미터

```typescript
{
  leId: 1,            // KBO 리그 = 1
  srId: 0,            // 0=정규 | 1=시범 | 4=와카 | 5=준PO | 6=PO | 7=KS
  seasonId: 2026,     // 연도
  gameId: "20260328KTLG0"
}
```

### Game ID 포맷

```
YYYYMMDD + AWAY_CODE(2) + HOME_CODE(2) + INDEX(1)
```

예시: `20260328KTLG0` = 2026-03-28 KT(원정) vs LG(홈) 첫 번째 경기

### 팀 코드 매핑

| 팀 | 코드 | 비고 |
|----|------|------|
| LG 트윈스 | LG | |
| 한화 이글스 | HH | |
| SSG 랜더스 | SK | 전신 SK 코드 유지 |
| 삼성 라이온즈 | SS | |
| NC 다이노스 | NC | |
| kt wiz | KT | |
| 롯데 자이언츠 | LT | |
| KIA 타이거즈 | HT | 전신 해태 코드 유지 |
| 두산 베어스 | OB | 전신 OB 코드 유지 |
| 키움 히어로즈 | WO | 전신 우리 코드 유지 |

### 응답 구조

```jsonc
// 응답 최외곽: { d: "<json string>" }
// d를 JSON.parse하면:
{
  "table1": "<table>...</table>",   // 이닝별 스코어 HTML
  "game_info": {
    "Home": "LG",
    "Away": "KT",
    "HomeScore": "5",
    "AwayScore": "3",
    "Stadium": "잠실",
    "StartTime": "2026-03-28 14:00",
    "EndTime": "2026-03-28 17:12",
    "GameStatus": "종료"
  }
}
```

> `table1` HTML을 cheerio로 파싱하여 구조화된 ScoreBoard 데이터로 변환.

---

## 2. KBO 경기일정 페이지 (ASP.NET PostBack)

### 흐름
1. `GET /Schedule/Schedule.aspx` → 초기 HTML
2. cheerio로 `#__VIEWSTATE`, `#__EVENTVALIDATION` 값 추출
3. `POST /Schedule/Schedule.aspx` + hidden fields + 날짜 파라미터
4. 응답 HTML의 `.tbl-type06 tbody tr`에서 경기 일정 파싱

### 파싱 대상 컬럼
날짜, 시간, 대진(홈/원정), 스코어, 게임센터 링크(gameId 추출), 구장, 비고

---

## 3. Rate Limiting & 에러 핸들링

### robots.txt (2026-03 기준)
```
Disallow: /Common/
Disallow: /Help/
Disallow: /Member/
Disallow: /ws/
```

### 요청 제한
```typescript
const SCRAPER_CONFIG = {
  delayMs: 1500,           // 요청 간 1.5초
  maxRetries: 3,           // 최대 3회 재시도
  retryDelayMs: 5000,      // 재시도 간 5초
  timeoutMs: 10000,        // 타임아웃 10초
  maxConcurrent: 1,        // 동시 요청 1개
} as const;
```

### 에러 대응
| HTTP 상태 | 대응 |
|-----------|------|
| 403 / 429 | 즉시 중단, 30분 후 재시도 |
| 500 | 3회 재시도 후 skip |
| 파싱 실패 | 로그 + skip |
| 타임아웃 | 재시도 |

---

## 4. 동기화 스케줄

| 시점 | 내용 | cron |
|------|------|------|
| 매일 06:00 | 당일~7일 후 일정 | `0 6 * * *` |
| 경기일 22:30 | 당일 스코어보드 | `30 22 * * *` |
| 경기일 23:00 | 당일 박스스코어 | `0 23 * * *` |
| 매주 월 03:00 | 2주치 일정 전체 갱신 | `0 3 * * 1` |
