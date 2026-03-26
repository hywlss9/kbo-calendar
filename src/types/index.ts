// ============================================
// KBO Calendar — 핵심 데이터 타입 정의
// ============================================

// ---- KBO 팀 ----
export const KBO_TEAMS = {
  LG: { code: "LG", name: "LG 트윈스", shortName: "LG", city: "서울", stadium: "잠실", color: "#C60C30" },
  HH: { code: "HH", name: "한화 이글스", shortName: "한화", city: "대전", stadium: "대전", color: "#FF6600" },
  SK: { code: "SK", name: "SSG 랜더스", shortName: "SSG", city: "인천", stadium: "문학", color: "#CE0E2D" },
  SS: { code: "SS", name: "삼성 라이온즈", shortName: "삼성", city: "대구", stadium: "대구", color: "#074CA1" },
  NC: { code: "NC", name: "NC 다이노스", shortName: "NC", city: "창원", stadium: "창원", color: "#315288" },
  KT: { code: "KT", name: "kt wiz", shortName: "KT", city: "수원", stadium: "수원", color: "#000000" },
  LT: { code: "LT", name: "롯데 자이언츠", shortName: "롯데", city: "부산", stadium: "사직", color: "#002955" },
  HT: { code: "HT", name: "KIA 타이거즈", shortName: "KIA", city: "광주", stadium: "광주", color: "#EA0029" },
  OB: { code: "OB", name: "두산 베어스", shortName: "두산", city: "서울", stadium: "잠실", color: "#131230" },
  WO: { code: "WO", name: "키움 히어로즈", shortName: "키움", city: "서울", stadium: "고척", color: "#820024" },
} as const;

export type TeamCode = keyof typeof KBO_TEAMS;
export type TeamInfo = (typeof KBO_TEAMS)[TeamCode];

// ---- 시즌 구분 ----
export type SeasonType = "preseason" | "regular" | "postseason";

export const SR_ID_MAP: Record<SeasonType, number[]> = {
  preseason: [1],
  regular: [0],
  postseason: [4, 5, 6, 7],
};

// ---- 경기 상태 ----
export type GameStatus =
  | "scheduled"    // 예정
  | "in_progress"  // 진행중
  | "final"        // 종료
  | "cancelled"    // 취소 (우천 등)
  | "postponed"    // 연기
  | "suspended";   // 서스펜디드

// ---- 경기 일정 (캘린더용 경량 데이터) ----
export interface GameSchedule {
  gameId: string;          // "20260328KTLG0"
  date: string;            // "2026-03-28" (KST, ISO date)
  time: string;            // "14:00" (KST)
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  stadium: string;
  status: GameStatus;
  seasonType: SeasonType;
  homeScore: number | null;
  awayScore: number | null;
  broadcast: string | null;
}

// ---- 이닝별 스코어 ----
export interface InningScore {
  inning: number;
  away: number | null;
  home: number | null;
}

// ---- 스코어보드 ----
export interface TeamScoreSummary {
  team: TeamCode;
  runs: number;
  hits: number;
  errors: number;
  baseOnBalls: number;
}

export interface ScoreBoard {
  gameId: string;
  innings: InningScore[];
  home: TeamScoreSummary;
  away: TeamScoreSummary;
  winningPitcher: string | null;
  losingPitcher: string | null;
  savePitcher: string | null;
  homeRuns: string[];
  duration: string | null;     // "3:12"
  attendance: number | null;
}

// ---- 타자 기록 ----
export interface BatterRecord {
  order: number;
  position: string;
  name: string;
  atBats: number;
  runs: number;
  hits: number;
  rbi: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  baseOnBalls: number;
  strikeOuts: number;
  average: string | null;
}

// ---- 투수 기록 ----
export interface PitcherRecord {
  name: string;
  result: string | null;       // "승" | "패" | "홀" | "세"
  inningsPitched: string;      // "6.0", "2.1"
  hits: number;
  runs: number;
  earnedRuns: number;
  baseOnBalls: number;
  strikeOuts: number;
  pitchCount: number | null;
  era: string | null;
}

// ---- 박스스코어 ----
export interface BoxScore {
  gameId: string;
  scoreBoard: ScoreBoard;
  homeBatters: BatterRecord[];
  awayBatters: BatterRecord[];
  homePitchers: PitcherRecord[];
  awayPitchers: PitcherRecord[];
}

// ---- 크롤링 관련 ----
export interface KboApiParams {
  leId: number;
  srId: number;
  seasonId: number;
  gameId: string;
}

export interface ScraperResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

// ---- API 응답 ----
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

// ---- 캘린더 뷰 ----
export interface CalendarDay {
  date: string;            // "2026-03-28"
  isCurrentMonth: boolean;
  isToday: boolean;
  games: GameSchedule[];
}

export interface CalendarMonth {
  year: number;
  month: number;           // 1-12
  days: CalendarDay[];
}

// ---- 경기 상세 (페이지용 조합 타입) ----
export interface GameDetail {
  schedule: GameSchedule;
  scoreBoard: ScoreBoard | null;   // scoreboard_json (boxscore_json 없을 때 fallback)
  boxScore: BoxScore | null;       // boxscore_json (내부에 ScoreBoard 포함)
}

// ---- DB Row 타입 ----
export interface GameRow {
  game_id: string;
  date: string;
  time: string;
  home_team: string;
  away_team: string;
  stadium: string;
  status: string;
  season_type: string;
  home_score: number | null;
  away_score: number | null;
  broadcast: string | null;
  scoreboard_json: string | null;
  boxscore_json: string | null;
  created_at: string;
  updated_at: string;
}
