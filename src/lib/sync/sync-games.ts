// ============================================
// KBO 데이터 동기화 파이프라인
// ============================================

import type { KboApiParams, SeasonType } from '@/types';
import { SR_ID_MAP } from '@/types';
import {
  fetchScheduleByMonth,
  fetchScheduleByMonthPlaywright,
} from '@/lib/scraper/kbo-schedule';
import { fetchScoreBoard, fetchBoxScore } from '@/lib/scraper/kbo-api';
import {
  upsertGame,
  upsertScoreBoard,
  upsertBoxScore,
  getGamesNeedingScores,
  getGamesNeedingBoxScores,
  insertSyncLog,
  updateSyncLog,
} from '@/lib/db/queries';

// ---- 공개 타입 ----

export interface SyncError {
  gameId?: string;
  message: string;
}

export interface SyncResult {
  gamesUpdated: number;
  errors: SyncError[];
}

// ---- 내부 유틸 ----

const DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * gameId 앞 4자리에서 연도를 추출하고, seasonType에서 srId를 결정하여
 * KboApiParams를 조립합니다.
 *
 * ⚠️ Known limitation: postseason의 경우 srId=4(와일드카드)로 고정됩니다.
 * 준PO(5)/PO(6)/KS(7)는 실제 srId와 다를 수 있습니다.
 */
export function buildApiParams(gameId: string, seasonType: SeasonType): KboApiParams {
  const seasonId = parseInt(gameId.slice(0, 4), 10);
  const srId = SR_ID_MAP[seasonType][0];
  return { leId: 1, srId, seasonId, gameId };
}

// ---- 공개 함수 ----

/**
 * 해당 연월의 경기 일정을 크롤링하여 DB에 upsert합니다.
 * 1차: fetchScheduleByMonth (PostBack)
 * 실패 시 2차: fetchScheduleByMonthPlaywright (fallback)
 */
export async function syncSchedule(
  year: number,
  month: number,
): Promise<SyncResult> {
  const logId = insertSyncLog(`schedule:${year}-${String(month).padStart(2, '0')}`);
  const errors: SyncError[] = [];
  let gamesUpdated = 0;

  try {
    let result = await fetchScheduleByMonth(year, month);

    if (!result.success || result.data === null) {
      console.warn(
        `[sync] fetchScheduleByMonth 실패, Playwright fallback 시도: ${result.error}`,
      );
      result = await fetchScheduleByMonthPlaywright(year, month);
    }

    if (!result.success || result.data === null) {
      throw new Error(result.error ?? '일정 크롤링 실패 (PostBack + Playwright 모두 실패)');
    }

    for (const game of result.data) {
      try {
        upsertGame(game);
        gamesUpdated++;
      } catch (err) {
        errors.push({
          gameId: game.gameId,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    updateSyncLog(
      logId,
      gamesUpdated,
      errors,
      errors.length > 0 ? 'error' : 'success',
    );
    return { gamesUpdated, errors };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[sync] syncSchedule 전체 실패:', message);
    errors.push({ message });
    updateSyncLog(logId, gamesUpdated, errors, 'error');
    return { gamesUpdated, errors };
  }
}

/**
 * 해당 날짜의 게임 중 scoreboard_json이 없는 게임의 스코어보드를 수집합니다.
 * status가 final 또는 in_progress인 게임이 대상입니다 (연장전 대응).
 */
export async function syncScores(date: string): Promise<SyncResult> {
  const logId = insertSyncLog(`scores:${date}`);
  const errors: SyncError[] = [];
  let gamesUpdated = 0;

  try {
    const games = getGamesNeedingScores(date);

    for (let i = 0; i < games.length; i++) {
      const game = games[i];

      try {
        const params = buildApiParams(game.gameId, game.seasonType);
        const result = await fetchScoreBoard(params);

        if (result.success && result.data !== null) {
          upsertScoreBoard(game.gameId, result.data);
          gamesUpdated++;
        } else {
          errors.push({
            gameId: game.gameId,
            message: result.error ?? '스코어보드 크롤링 실패',
          });
        }
      } catch (err) {
        errors.push({
          gameId: game.gameId,
          message: err instanceof Error ? err.message : String(err),
        });
      }

      // 마지막 게임이 아닐 때만 delay
      if (i < games.length - 1) {
        await sleep(DELAY_MS);
      }
    }

    updateSyncLog(
      logId,
      gamesUpdated,
      errors,
      errors.length > 0 ? 'error' : 'success',
    );
    return { gamesUpdated, errors };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[sync] syncScores 전체 실패:', message);
    errors.push({ message });
    updateSyncLog(logId, gamesUpdated, errors, 'error');
    return { gamesUpdated, errors };
  }
}

/**
 * 해당 날짜의 final 게임 중 boxscore_json이 없는 게임의 박스스코어를 수집합니다.
 * in_progress 게임은 제외합니다 (불완전한 박스스코어 방지).
 */
export async function syncBoxScores(date: string): Promise<SyncResult> {
  const logId = insertSyncLog(`boxscores:${date}`);
  const errors: SyncError[] = [];
  let gamesUpdated = 0;

  try {
    const games = getGamesNeedingBoxScores(date);

    for (let i = 0; i < games.length; i++) {
      const game = games[i];

      try {
        const params = buildApiParams(game.gameId, game.seasonType);
        const result = await fetchBoxScore(params);

        if (result.success && result.data !== null) {
          upsertBoxScore(game.gameId, result.data);
          gamesUpdated++;
        } else {
          errors.push({
            gameId: game.gameId,
            message: result.error ?? '박스스코어 크롤링 실패',
          });
        }
      } catch (err) {
        errors.push({
          gameId: game.gameId,
          message: err instanceof Error ? err.message : String(err),
        });
      }

      // 마지막 게임이 아닐 때만 delay
      if (i < games.length - 1) {
        await sleep(DELAY_MS);
      }
    }

    updateSyncLog(
      logId,
      gamesUpdated,
      errors,
      errors.length > 0 ? 'error' : 'success',
    );
    return { gamesUpdated, errors };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[sync] syncBoxScores 전체 실패:', message);
    errors.push({ message });
    updateSyncLog(logId, gamesUpdated, errors, 'error');
    return { gamesUpdated, errors };
  }
}
