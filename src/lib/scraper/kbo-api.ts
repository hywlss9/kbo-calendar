// ============================================
// KBO 내부 웹서비스 API 크롤러
// POST /ws/Schedule.asmx/GetScoreBoardScroll
// POST /ws/Schedule.asmx/GetBoxScoreScroll
// ============================================

import axios, { isAxiosError } from "axios";
import type {
  KboApiParams,
  ScraperResult,
  ScoreBoard,
  BoxScore,
  TeamCode,
} from "@/types";
import {
  parseScoreBoardHtml,
  parseBatterTableHtml,
  parsePitcherTableHtml,
  type ScoreBoardMeta,
} from "@/lib/scraper/parser";

// ---- 설정 ----

const BASE_URL = "https://www.koreabaseball.com";

const SCRAPER_CONFIG = {
  delayMs: 1500,
  maxRetries: 3,
  retryDelayMs: 5000,
  timeoutMs: 10000,
  maxConcurrent: 1,
} as const;

// ---- 내부 Raw 타입 ----

interface GameInfoRaw {
  Home: string;
  Away: string;
  HomeScore: string;
  AwayScore: string;
  Stadium: string;
  StartTime: string;
  EndTime?: string;
  GameStatus: string;
  WinPitcher?: string;
  LosePitcher?: string;
  SavePitcher?: string;
  HomeRun?: string;
  Duration?: string;
  Crowd?: string;
}

interface ScoreBoardRawData {
  table1: string;
  game_info: GameInfoRaw;
}

interface BoxScoreRawData extends ScoreBoardRawData {
  table2?: string;
  table3?: string;
  table4?: string;
  table5?: string;
}

// ---- 유틸 ----

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---- HTTP 요청 (재시도 포함) ----

async function postKboApi<T>(
  endpoint: string,
  params: KboApiParams
): Promise<T> {
  const body = new URLSearchParams({
    leId: String(params.leId),
    srId: String(params.srId),
    seasonId: String(params.seasonId),
    gameId: params.gameId,
  });

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    Referer: "https://www.koreabaseball.com/",
  };

  let lastError: unknown;

  for (let attempt = 0; attempt <= SCRAPER_CONFIG.maxRetries; attempt++) {
    try {
      const response = await axios.post<{ d: string }>(
        BASE_URL + endpoint,
        body.toString(),
        { headers, timeout: SCRAPER_CONFIG.timeoutMs }
      );

      const raw = JSON.parse(response.data.d) as T;
      return raw;
    } catch (err) {
      lastError = err;

      // 403/429: 즉시 중단
      if (isAxiosError(err) && err.response) {
        const status = err.response.status;
        if (status === 403 || status === 429) {
          throw new Error(
            `HTTP ${status}: 접근 거부 (${endpoint}). 크롤링 중단.`
          );
        }
      }

      // 마지막 시도였으면 throw
      if (attempt === SCRAPER_CONFIG.maxRetries) break;

      await sleep(SCRAPER_CONFIG.retryDelayMs);
    }
  }

  const msg =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `${SCRAPER_CONFIG.maxRetries + 1}회 시도 후 실패 (${endpoint}): ${msg}`
  );
}

// ---- ScoreBoard 조립 ----

function buildScoreBoard(raw: ScoreBoardRawData, gameId: string): ScoreBoard {
  const gi = raw.game_info;

  const meta: ScoreBoardMeta = {
    winningPitcher: gi.WinPitcher,
    losingPitcher: gi.LosePitcher,
    savePitcher: gi.SavePitcher,
    homeRuns: gi.HomeRun,
    duration: gi.Duration,
    attendance: gi.Crowd,
  };

  return parseScoreBoardHtml(
    raw.table1,
    gameId,
    gi.Away as TeamCode,
    gi.Home as TeamCode,
    meta
  );
}

// ---- 공개 API ----

export async function fetchScoreBoard(
  params: KboApiParams
): Promise<ScraperResult<ScoreBoard>> {
  try {
    const raw = await postKboApi<ScoreBoardRawData>(
      "/ws/Schedule.asmx/GetScoreBoardScroll",
      params
    );
    const data = buildScoreBoard(raw, params.gameId);
    return { success: true, data, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, data: null, error };
  }
}

export async function fetchBoxScore(
  params: KboApiParams
): Promise<ScraperResult<BoxScore>> {
  try {
    const raw = await postKboApi<BoxScoreRawData>(
      "/ws/Schedule.asmx/GetBoxScoreScroll",
      params
    );

    const scoreBoard = buildScoreBoard(raw, params.gameId);
    const awayBatters = parseBatterTableHtml(raw.table2 ?? "");
    const homeBatters = parseBatterTableHtml(raw.table3 ?? "");
    const awayPitchers = parsePitcherTableHtml(raw.table4 ?? "");
    const homePitchers = parsePitcherTableHtml(raw.table5 ?? "");

    const data: BoxScore = {
      gameId: params.gameId,
      scoreBoard,
      homeBatters,
      awayBatters,
      homePitchers,
      awayPitchers,
    };

    return { success: true, data, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, data: null, error };
  }
}
