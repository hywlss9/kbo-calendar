// ============================================
// HTML 파서 유틸 — KBO 크롤링 공통 파싱 함수
// ============================================

import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type {
  TeamCode,
  GameStatus,
  ScoreBoard,
  BoxScore,
  BatterRecord,
  PitcherRecord,
  InningScore,
  TeamScoreSummary,
  GameSchedule,
} from "@/types";
import { KBO_TEAMS } from "@/types";

// ---- 선택자 상수 ----

const SELECTORS = {
  // 이닝 스코어보드
  INNINGS_HEADER_CELLS: "thead tr th",
  INNINGS_BODY_ROWS: "tbody tr",

  // 타자/투수 공통
  TABLE_BODY_ROWS: "tbody tr",
  TABLE_BODY_CELLS: "td",
  BATTER_MIN_COLS: 13,
  PITCHER_MIN_COLS: 9,

  // 경기 일정
  SCHEDULE_TABLE: ".tbl-type06",
  SCHEDULE_ROWS: ".tbl-type06 tbody tr",
  SCHEDULE_MIN_COLS: 7,

  // 팀 코드 추출 (경기 일정)
  TEAM_IMG: "img",
  SCORE_ANCHOR: "a",
} as const;

// ---- 공개 인터페이스 ----

/** KBO API game_info 유래 메타데이터 */
export interface ScoreBoardMeta {
  winningPitcher?: string | null;
  losingPitcher?: string | null;
  savePitcher?: string | null;
  /** 쉼표 구분 raw string — "홍길동,김철수" */
  homeRuns?: string | null;
  /** "3:12" */
  duration?: string | null;
  /** "15,234" */
  attendance?: string | null;
}

/** parseBoxScoreHtml 입력 */
export interface BoxScoreInput {
  scoreBoardHtml: string;
  awayBatterHtml: string;
  homeBatterHtml: string;
  awayPitcherHtml: string;
  homePitcherHtml: string;
  gameId: string;
  awayTeam: TeamCode;
  homeTeam: TeamCode;
  meta: ScoreBoardMeta;
}

// ---- NaN 방어 유틸리티 ----

export function safeInt(value: string | undefined | null): number {
  if (value == null) return 0;
  const n = parseInt(value.trim(), 10);
  return isNaN(n) ? 0 : n;
}

export function safeIntOrNull(value: string | undefined | null): number | null {
  if (value == null || value.trim() === "") return null;
  const n = parseInt(value.trim(), 10);
  return isNaN(n) ? null : n;
}

export function safeFloat(value: string | undefined | null): number | null {
  if (value == null || value.trim() === "") return null;
  const n = parseFloat(value.trim());
  return isNaN(n) ? null : n;
}

// ---- 이닝 테이블 내부 파서 ----

function parseInningsTable(
  html: string,
  awayTeam: TeamCode,
  homeTeam: TeamCode
): {
  innings: InningScore[];
  home: TeamScoreSummary;
  away: TeamScoreSummary;
} {
  const $ = cheerio.load(html);

  // 헤더에서 이닝 번호 인덱스 추출 (숫자인 th만)
  const headers: string[] = [];
  $(SELECTORS.INNINGS_HEADER_CELLS).each((_i, el) => {
    headers.push($(el).text().trim());
  });

  const inningIndices: number[] = [];
  headers.forEach((h, i) => {
    if (/^\d+$/.test(h)) inningIndices.push(i);
  });

  // R/H/E/B: 뒤에서 4개 컬럼
  const totalCols = headers.length;
  const rIdx = totalCols - 4;
  const hIdx = totalCols - 3;
  const eIdx = totalCols - 2;
  const bIdx = totalCols - 1;

  const rows = $(SELECTORS.INNINGS_BODY_ROWS).toArray();

  if (rows.length === 0) {
    throw new Error("[parser] 이닝 테이블 파싱 실패: tbody 행 없음");
  }

  function parseRow(row: AnyNode): {
    inningVals: (number | null)[];
    r: number;
    h: number;
    e: number;
    b: number;
  } {
    const cells = $(row).find(SELECTORS.TABLE_BODY_CELLS).toArray();
    const getText = (i: number) => $(cells[i])?.text().trim() ?? "";

    const inningVals = inningIndices.map((idx) => {
      const val = getText(idx);
      if (val === "" || val.toLowerCase() === "x") return null;
      const n = parseInt(val, 10);
      return isNaN(n) ? null : n;
    });

    return {
      inningVals,
      r: safeInt(getText(rIdx)),
      h: safeInt(getText(hIdx)),
      e: safeInt(getText(eIdx)),
      b: safeInt(getText(bIdx)),
    };
  }

  const awayRow = rows[0] ? parseRow(rows[0]) : null;
  const homeRow = rows[1] ? parseRow(rows[1]) : null;

  const innings: InningScore[] = inningIndices.map((_, i) => ({
    inning: i + 1,
    away: awayRow?.inningVals[i] ?? null,
    home: homeRow?.inningVals[i] ?? null,
  }));

  const away: TeamScoreSummary = {
    team: awayTeam,
    runs: awayRow?.r ?? 0,
    hits: awayRow?.h ?? 0,
    errors: awayRow?.e ?? 0,
    baseOnBalls: awayRow?.b ?? 0,
  };

  const home: TeamScoreSummary = {
    team: homeTeam,
    runs: homeRow?.r ?? 0,
    hits: homeRow?.h ?? 0,
    errors: homeRow?.e ?? 0,
    baseOnBalls: homeRow?.b ?? 0,
  };

  return { innings, home, away };
}

// ---- 공개 파서 함수 ----

/**
 * KBO API `table1` (이닝 스코어보드 HTML)을 파싱하여 ScoreBoard를 반환.
 * gameId, awayTeam, homeTeam은 API의 game_info에서, meta는 ScoreBoardMeta로 전달.
 * @throws 이닝 테이블 파싱 실패 시
 */
export function parseScoreBoardHtml(
  html: string,
  gameId: string,
  awayTeam: TeamCode,
  homeTeam: TeamCode,
  meta: ScoreBoardMeta
): ScoreBoard {
  const { innings, home, away } = parseInningsTable(html, awayTeam, homeTeam);

  const homeRuns = meta.homeRuns
    ? meta.homeRuns
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const attendance = meta.attendance
    ? safeIntOrNull(meta.attendance.replace(/,/g, ""))
    : null;

  return {
    gameId,
    innings,
    home,
    away,
    winningPitcher: meta.winningPitcher?.trim() || null,
    losingPitcher: meta.losingPitcher?.trim() || null,
    savePitcher: meta.savePitcher?.trim() || null,
    homeRuns,
    duration: meta.duration?.trim() || null,
    attendance,
  };
}

/**
 * 타자 기록 테이블 HTML을 파싱하여 BatterRecord 배열을 반환.
 * 빈 html 또는 셀 수 < 13인 행은 skip.
 */
export function parseBatterTableHtml(html: string): BatterRecord[] {
  if (!html) return [];

  const $ = cheerio.load(html);
  const batters: BatterRecord[] = [];

  $(SELECTORS.TABLE_BODY_ROWS).each((_i, row) => {
    const cells = $(row).find(SELECTORS.TABLE_BODY_CELLS).toArray();
    if (cells.length < SELECTORS.BATTER_MIN_COLS) return;

    const getText = (i: number) => $(cells[i]).text().trim();
    const avg = getText(12);

    batters.push({
      order: safeInt(getText(0)),
      position: getText(1),
      name: getText(2),
      atBats: safeInt(getText(3)),
      runs: safeInt(getText(4)),
      hits: safeInt(getText(5)),
      rbi: safeInt(getText(6)),
      doubles: safeInt(getText(7)),
      triples: safeInt(getText(8)),
      homeRuns: safeInt(getText(9)),
      baseOnBalls: safeInt(getText(10)),
      strikeOuts: safeInt(getText(11)),
      average: avg === "" ? null : avg,
    });
  });

  return batters;
}

/**
 * 투수 기록 테이블 HTML을 파싱하여 PitcherRecord 배열을 반환.
 * 10컬럼(삼진 포함)과 9컬럼(삼진 없음) 두 가지 레이아웃을 처리.
 */
export function parsePitcherTableHtml(html: string): PitcherRecord[] {
  if (!html) return [];

  const $ = cheerio.load(html);
  const pitchers: PitcherRecord[] = [];

  $(SELECTORS.TABLE_BODY_ROWS).each((_i, row) => {
    const cells = $(row).find(SELECTORS.TABLE_BODY_CELLS).toArray();
    if (cells.length < SELECTORS.PITCHER_MIN_COLS) return;

    const getText = (i: number) => $(cells[i]).text().trim();
    const result = getText(1);

    // 10컬럼↑: [7]=삼진 [8]=투구수 [9]=ERA
    // 9컬럼: 삼진 없음, [7]=투구수 [8]=ERA
    const has10Cols = cells.length >= 10;
    const strikeOuts = has10Cols ? safeInt(getText(7)) : 0;
    const pitchCount = has10Cols
      ? safeIntOrNull(getText(8))
      : safeIntOrNull(getText(7));
    const eraRaw = has10Cols ? getText(9) : getText(8);

    pitchers.push({
      name: getText(0),
      result: result === "" ? null : result,
      inningsPitched: getText(2),
      hits: safeInt(getText(3)),
      runs: safeInt(getText(4)),
      earnedRuns: safeInt(getText(5)),
      baseOnBalls: safeInt(getText(6)),
      strikeOuts,
      pitchCount,
      era: eraRaw === "" ? null : eraRaw,
    });
  });

  return pitchers;
}

/**
 * KBO API BoxScore 원시 데이터(HTML 5개 + 메타)를 받아 BoxScore를 조립.
 */
export function parseBoxScoreHtml(input: BoxScoreInput): BoxScore {
  const scoreBoard = parseScoreBoardHtml(
    input.scoreBoardHtml,
    input.gameId,
    input.awayTeam,
    input.homeTeam,
    input.meta
  );

  return {
    gameId: input.gameId,
    scoreBoard,
    awayBatters: parseBatterTableHtml(input.awayBatterHtml),
    homeBatters: parseBatterTableHtml(input.homeBatterHtml),
    awayPitchers: parsePitcherTableHtml(input.awayPitcherHtml),
    homePitchers: parsePitcherTableHtml(input.homePitcherHtml),
  };
}

/**
 * KBO 경기일정 페이지 HTML(.tbl-type06 테이블)을 파싱하여 GameSchedule 배열을 반환.
 * year, month는 날짜 "03.28 (토)" → "2026-03-28" 변환 및 연도 경계 처리에 사용.
 */
export function parseScheduleTableHtml(
  html: string,
  year: number,
  month: number
): GameSchedule[] {
  const $ = cheerio.load(html);

  if ($(SELECTORS.SCHEDULE_TABLE).length === 0) {
    console.warn("[parser] .tbl-type06 테이블을 찾을 수 없음");
    return [];
  }

  const games: GameSchedule[] = [];
  let lastDate = "";

  $(SELECTORS.SCHEDULE_ROWS).each((_i, row) => {
    const game = parseGameRow($, row, lastDate, year, month);
    if (game) {
      lastDate = game.date;
      games.push(game);
    }
  });

  return games;
}

// ---- 스케줄 내부 헬퍼 ----

function isTeamCode(code: string): code is TeamCode {
  return Object.prototype.hasOwnProperty.call(KBO_TEAMS, code);
}

function parseDateStr(
  dateRaw: string,
  year: number,
  month: number
): string | null {
  // "03.28 (토)" → "2026-03-28"
  const match = /(\d{2})\.(\d{2})/.exec(dateRaw);
  if (!match) return null;

  const m = match[1].padStart(2, "0");
  const d = match[2].padStart(2, "0");

  const parsedMonth = parseInt(m, 10);
  let resolvedYear = year;
  if (parsedMonth < month && month === 12) {
    resolvedYear = year + 1;
  } else if (parsedMonth > month && month === 1) {
    resolvedYear = year - 1;
  }

  return `${resolvedYear}-${m}-${d}`;
}

function parseTeamCode(
  $: cheerio.CheerioAPI,
  cell: AnyNode
): TeamCode | null {
  const img = $(cell).find(SELECTORS.TEAM_IMG).first();
  const alt = img.attr("alt")?.trim() ?? "";
  const text = $(cell).text().trim();

  for (const candidate of [alt, text]) {
    if (candidate && isTeamCode(candidate)) return candidate;
  }
  return null;
}

function parseScoreCell(
  $: cheerio.CheerioAPI,
  cell: AnyNode
): { awayScore: number | null; homeScore: number | null; href: string | null } {
  const text = $(cell).text().trim();
  const scoreMatch = /(\d+)\s*:\s*(\d+)/.exec(text);

  let awayScore: number | null = null;
  let homeScore: number | null = null;
  if (scoreMatch) {
    awayScore = parseInt(scoreMatch[1], 10);
    homeScore = parseInt(scoreMatch[2], 10);
  }

  const anchor = $(cell).find(SELECTORS.SCORE_ANCHOR).first();
  const href = anchor.length > 0 ? (anchor.attr("href") ?? null) : null;

  return { awayScore, homeScore, href };
}

function parseGameId(href: string): string | null {
  try {
    const url = new URL(href, "https://www.koreabaseball.com");
    const gameId = url.searchParams.get("gameId");
    return typeof gameId === "string" && gameId.length > 0 ? gameId : null;
  } catch {
    return null;
  }
}

function mapGameStatus(remarkRaw: string, hasScore: boolean): GameStatus {
  const remark = remarkRaw.trim();

  if (remark.includes("우천취소") || remark === "취소") return "cancelled";
  if (remark.includes("연기")) return "postponed";
  if (remark.includes("서스펜디드")) return "suspended";

  if (hasScore) return "final";
  return "scheduled";
}

function parseGameRow(
  $: cheerio.CheerioAPI,
  row: AnyNode,
  lastDate: string,
  year: number,
  month: number
): GameSchedule | null {
  const cells = $(row).find(SELECTORS.TABLE_BODY_CELLS).toArray();

  if (cells.length < SELECTORS.SCHEDULE_MIN_COLS) return null;

  // 날짜 컬럼: 8개↑이면 날짜 포함, 7개이면 rowspan (lastDate 사용)
  let date: string;
  let offset = 0;

  if (cells.length >= 8) {
    const dateRaw = $(cells[0]).text().trim();
    const parsed = parseDateStr(dateRaw, year, month);
    if (parsed) {
      date = parsed;
    } else {
      if (!lastDate) return null;
      date = lastDate;
      offset = -1;
    }
  } else {
    if (!lastDate) return null;
    date = lastDate;
    offset = -1;
  }

  const timeRaw = $(cells[1 + offset]).text().trim();
  const time = /^\d{2}:\d{2}$/.test(timeRaw) ? timeRaw : "00:00";

  const awayTeam = parseTeamCode($, cells[2 + offset]);
  if (!awayTeam) return null;

  const scoreCell = cells[3 + offset];
  const { awayScore, homeScore, href } = parseScoreCell($, scoreCell);

  const gameId = href ? parseGameId(href) : null;
  if (!gameId) return null;

  const homeTeam = parseTeamCode($, cells[4 + offset]);
  if (!homeTeam) return null;

  const stadium = $(cells[5 + offset]).text().trim();
  const remarkRaw = $(cells[6 + offset])?.text().trim() ?? "";
  const broadcastRaw = cells[7 + offset]
    ? $(cells[7 + offset]).text().trim()
    : "";

  const hasScore = awayScore !== null && homeScore !== null;
  const status = mapGameStatus(remarkRaw, hasScore);

  return {
    gameId,
    date,
    time,
    homeTeam,
    awayTeam,
    stadium,
    status,
    seasonType: "regular",
    homeScore: hasScore ? homeScore : null,
    awayScore: hasScore ? awayScore : null,
    broadcast: broadcastRaw || null,
  };
}
