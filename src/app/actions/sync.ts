'use server';

// ============================================
// 동기화 수동 트리거 — Server Actions
// ============================================

import { revalidatePath } from 'next/cache';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import {
  syncSchedule,
  syncScores,
  syncBoxScores,
  buildApiParams,
  type SyncResult,
  type SyncError,
} from '@/lib/sync/sync-games';
import { validateGameId } from '@/lib/api/validation';
import { getGameDetail, upsertBoxScore, upsertScoreBoard } from '@/lib/db/queries';
import { fetchBoxScore, fetchScoreBoard } from '@/lib/scraper/kbo-api';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Seoul';

/**
 * 특정 연월의 경기 일정을 수동으로 동기화합니다.
 */
export async function triggerSyncSchedule(
  year: number,
  month: number,
): Promise<SyncResult> {
  const result = await syncSchedule(year, month);
  revalidatePath('/');
  return result;
}

/**
 * 오늘 날짜 기준으로 일정 → 스코어보드 → 박스스코어를 순서대로 동기화합니다.
 * syncSchedule을 먼저 실행하여 DB에 오늘 경기가 존재함을 보장합니다.
 */
export async function triggerSyncToday(): Promise<{
  schedule: SyncResult;
  scores: SyncResult;
  boxScores: SyncResult;
}> {
  const today = dayjs().tz(TZ);
  const year = today.year();
  const month = today.month() + 1;
  const dateStr = today.format('YYYY-MM-DD');

  const schedule = await syncSchedule(year, month);
  const scores = await syncScores(dateStr);
  const boxScores = await syncBoxScores(dateStr);

  revalidatePath('/');

  return { schedule, scores, boxScores };
}

/**
 * 특정 경기의 스코어보드/박스스코어를 즉시 수집합니다.
 * 상세 페이지의 "새로고침" 버튼에서 호출됩니다.
 */
export async function triggerSyncGame(gameId: string): Promise<SyncResult> {
  const validation = validateGameId(gameId);
  if (!validation.ok) {
    return { gamesUpdated: 0, errors: [{ gameId, message: validation.message }] };
  }

  const detail = getGameDetail(validation.value);
  if (!detail) {
    return { gamesUpdated: 0, errors: [{ gameId, message: '경기를 찾을 수 없습니다.' }] };
  }

  const params = buildApiParams(gameId, detail.schedule.seasonType);
  const errors: SyncError[] = [];
  let gamesUpdated = 0;

  const boxResult = await fetchBoxScore(params);
  if (boxResult.success && boxResult.data !== null) {
    upsertBoxScore(gameId, boxResult.data);
    gamesUpdated = 1;
  } else {
    const scoreResult = await fetchScoreBoard(params);
    if (scoreResult.success && scoreResult.data !== null) {
      upsertScoreBoard(gameId, scoreResult.data);
      gamesUpdated = 1;
    } else {
      errors.push({ gameId, message: boxResult.error ?? '데이터 수집 실패' });
    }
  }

  revalidatePath(`/game/${gameId}`);
  return { gamesUpdated, errors };
}
