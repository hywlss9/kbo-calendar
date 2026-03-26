// ============================================
// KBO 경기일정 크롤러
// POST /ws/Schedule.asmx/GetScheduleList (JSON API)
// ============================================

import axios, { isAxiosError } from "axios";
import * as cheerio from "cheerio";
import type {
  GameSchedule,
  ScraperResult,
  SeasonType,
  TeamCode,
} from "@/types";
import { KBO_TEAMS } from "@/types";
import { parseScheduleTableHtml } from "@/lib/scraper/parser";

// ---- 설정 ----

const BASE_URL = "https://www.koreabaseball.com";
const SCHEDULE_LIST_ENDPOINT = "/ws/Schedule.asmx/GetScheduleList";
const SCHEDULE_PATH = "/Schedule/Schedule.aspx";

const SCRAPER_CONFIG = {
  delayMs: 1500,
  maxRetries: 3,
  retryDelayMs: 5000,
  timeoutMs: 15000,
} as const;

const HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://www.koreabaseball.com/Schedule/Schedule.aspx",
} as const;

// srId 그룹별 시즌 타입 (순서대로 시도)
const SR_ID_GROUPS: ReadonlyArray<{ srIds: string; seasonType: SeasonType }> =
  [
    { srIds: "1", seasonType: "preseason" },
    { srIds: "0", seasonType: "regular" },
    { srIds: "3,4,5,6,7", seasonType: "postseason" },
  ];

// 팀 shortName/name → TeamCode 역매핑
const TEAM_NAME_TO_CODE: Record<string, TeamCode> = Object.values(
  KBO_TEAMS
).reduce(
  (acc, team) => {
    acc[team.shortName] = team.code as TeamCode;
    acc[team.name] = team.code as TeamCode;
    return acc;
  },
  {} as Record<string, TeamCode>
);

// ---- 내부 타입 ----

interface ScheduleApiCell {
  Text: string;
  Class: string | null;
  RowSpan: string | null;
}

interface ScheduleApiRow {
  row: ScheduleApiCell[];
}

interface ScheduleListResponse {
  rows: ScheduleApiRow[];
}

// ---- 유틸 ----

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseDateText(
  text: string,
  year: number,
  month: number
): string | null {
  // "03.12(목)" → "2026-03-12"
  const match = /(\d{2})\.(\d{2})/.exec(text);
  if (!match) return null;

  const m = match[1];
  const d = match[2];
  const parsedMonth = parseInt(m, 10);

  let resolvedYear = year;
  if (parsedMonth < month && month === 12) resolvedYear = year + 1;
  else if (parsedMonth > month && month === 1) resolvedYear = year - 1;

  return `${resolvedYear}-${m}-${d}`;
}

function parseTeamName(name: string): TeamCode | null {
  return TEAM_NAME_TO_CODE[name.trim()] ?? null;
}

function parsePlayCell(html: string): {
  awayTeam: TeamCode;
  homeTeam: TeamCode;
  awayScore: number | null;
  homeScore: number | null;
} | null {
  const $ = cheerio.load(html);

  // 팀 이름: em 바깥의 span들 (첫 번째 = away, 마지막 = home)
  const outerSpans = $("span")
    .not($("em").find("span"))
    .toArray();
  if (outerSpans.length < 2) return null;

  const awayTeam = parseTeamName($(outerSpans[0]).text());
  const homeTeam = parseTeamName($(outerSpans[outerSpans.length - 1]).text());
  if (!awayTeam || !homeTeam) return null;

  // 점수: em 안의 span 중 숫자인 것만 (vs 텍스트 제외), 순서대로 away/home
  const scoreSpans = $("em span")
    .toArray()
    .filter((el) => /^\d+$/.test($(el).text().trim()));

  const awayScore =
    scoreSpans.length >= 1
      ? parseInt($(scoreSpans[0]).text().trim(), 10)
      : null;
  const homeScore =
    scoreSpans.length >= 2
      ? parseInt($(scoreSpans[1]).text().trim(), 10)
      : null;

  return { awayTeam, homeTeam, awayScore, homeScore };
}

function parseGameIdFromRelay(html: string): string | null {
  const $ = cheerio.load(html);
  const href = $("a").first().attr("href");
  if (!href) return null;

  try {
    const url = new URL(href, BASE_URL);
    const gameId = url.searchParams.get("gameId");
    return typeof gameId === "string" && gameId.length > 0 ? gameId : null;
  } catch {
    return null;
  }
}

function mapGameStatus(remarkRaw: string, hasScore: boolean): GameSchedule["status"] {
  const remark = remarkRaw.trim();
  if (remark.includes("우천취소") || remark === "취소") return "cancelled";
  if (remark.includes("연기")) return "postponed";
  if (remark.includes("서스펜디드")) return "suspended";
  if (hasScore) return "final";
  return "scheduled";
}

function parseApiRows(
  rows: ScheduleApiRow[],
  year: number,
  month: number,
  seasonType: SeasonType
): GameSchedule[] {
  const games: GameSchedule[] = [];
  let lastDate = "";

  for (const { row } of rows) {
    const dayCell = row.find((c) => c.Class === "day");
    const timeCell = row.find((c) => c.Class === "time");
    const playCell = row.find((c) => c.Class === "play");
    const relayCell = row.find((c) => c.Class === "relay");

    if (dayCell) {
      const parsed = parseDateText(dayCell.Text, year, month);
      if (parsed) lastDate = parsed;
    }

    if (!lastDate || !playCell || !relayCell) continue;

    const gameId = parseGameIdFromRelay(relayCell.Text);
    if (!gameId) continue;

    let time = "00:00";
    if (timeCell) {
      const m = /(\d{2}:\d{2})/.exec(timeCell.Text);
      if (m) time = m[1];
    }

    const play = parsePlayCell(playCell.Text);
    if (!play) continue;

    // Class 없는 셀: [highlight, broadcast, ?, stadium, remark] (5개)
    const noCells = row.filter(
      (c) => !["day", "time", "play", "relay"].includes(c.Class ?? "")
    );
    const broadcast = noCells[1]?.Text?.trim() || null;
    const stadium = noCells[noCells.length - 2]?.Text?.trim() || "";
    const remarkRaw = noCells[noCells.length - 1]?.Text?.trim() || "";

    const hasScore = play.awayScore !== null && play.homeScore !== null;

    games.push({
      gameId,
      date: lastDate,
      time,
      awayTeam: play.awayTeam,
      homeTeam: play.homeTeam,
      awayScore: play.awayScore,
      homeScore: play.homeScore,
      stadium,
      status: mapGameStatus(remarkRaw, hasScore),
      seasonType,
      broadcast: broadcast || null,
    });
  }

  return games;
}

// ---- HTTP 요청 ----

async function fetchScheduleListApi(
  year: number,
  month: number,
  srIds: string
): Promise<ScheduleListResponse> {
  const body = new URLSearchParams({
    leId: "1",
    srIdList: srIds,
    seasonId: String(year),
    gameMonth: String(month).padStart(2, "0"),
    teamId: "",
  });

  let lastError: unknown;

  for (let attempt = 0; attempt <= SCRAPER_CONFIG.maxRetries; attempt++) {
    try {
      const response = await axios.post<ScheduleListResponse>(
        BASE_URL + SCHEDULE_LIST_ENDPOINT,
        body.toString(),
        { headers: HEADERS, timeout: SCRAPER_CONFIG.timeoutMs }
      );
      return response.data;
    } catch (err) {
      lastError = err;

      if (isAxiosError(err) && err.response) {
        const status = err.response.status;
        if (status === 403 || status === 429) {
          throw new Error(
            `HTTP ${status}: 접근 거부 (${SCHEDULE_LIST_ENDPOINT})`
          );
        }
      }

      if (attempt === SCRAPER_CONFIG.maxRetries) break;
      await sleep(SCRAPER_CONFIG.retryDelayMs);
    }
  }

  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`${SCRAPER_CONFIG.maxRetries + 1}회 시도 후 실패: ${msg}`);
}

// ---- 공개 API ----

/**
 * KBO GetScheduleList JSON API로 해당 연월 경기 일정을 수집합니다.
 * 시범/정규/포스트시즌을 순서대로 각각 요청하여 합칩니다.
 */
export async function fetchScheduleByMonth(
  year: number,
  month: number
): Promise<ScraperResult<GameSchedule[]>> {
  try {
    const allGames: GameSchedule[] = [];

    for (let i = 0; i < SR_ID_GROUPS.length; i++) {
      const { srIds, seasonType } = SR_ID_GROUPS[i];

      try {
        const data = await fetchScheduleListApi(year, month, srIds);
        const games = parseApiRows(data.rows, year, month, seasonType);
        allGames.push(...games);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(
          `[kbo-schedule] srIds=${srIds} 요청 실패 (skip):`,
          msg
        );
      }

      if (i < SR_ID_GROUPS.length - 1) {
        await sleep(SCRAPER_CONFIG.delayMs);
      }
    }

    return { success: true, data: allGames, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[kbo-schedule] fetchScheduleByMonth 실패:", error);
    return { success: false, data: null, error };
  }
}

/**
 * Playwright 헤드리스 브라우저 fallback.
 * fetchScheduleByMonth 실패 시에만 사용.
 */
export async function fetchScheduleByMonthPlaywright(
  year: number,
  month: number
): Promise<ScraperResult<GameSchedule[]>> {
  // dynamic import: Next.js 번들에서 playwright 분리
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — playwright는 선택적 의존성 (fallback 실행 시에만 필요)
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(BASE_URL + SCHEDULE_PATH, { waitUntil: "networkidle" });

    await page.selectOption(`select[name*="ddlYear"]`, String(year));
    await sleep(SCRAPER_CONFIG.delayMs);

    await page.selectOption(`select[name*="ddlMonth"]`, String(month));
    await page.waitForSelector(".tbl-type06", { timeout: 10000 });

    const html = await page.content();
    const games = parseScheduleTableHtml(html, year, month);
    return { success: true, data: games, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[kbo-schedule] Playwright fallback 실패:", error);
    return { success: false, data: null, error };
  } finally {
    await browser.close();
  }
}
