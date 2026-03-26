// ============================================
// syncSchedule / syncScores / syncBoxScores 단위 테스트
// DB 쿼리와 크롤러를 모두 mock — 네트워크·파일시스템 불필요
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GameSchedule, ScoreBoard, BoxScore } from '@/types';

// ---- mock 선언 (import보다 먼저 hoisting됨) ----

vi.mock('@/lib/scraper/kbo-schedule', () => ({
  fetchScheduleByMonth: vi.fn(),
  fetchScheduleByMonthPlaywright: vi.fn(),
}));

vi.mock('@/lib/scraper/kbo-api', () => ({
  fetchScoreBoard: vi.fn(),
  fetchBoxScore: vi.fn(),
}));

vi.mock('@/lib/db/queries', () => ({
  upsertGame: vi.fn(),
  upsertScoreBoard: vi.fn(),
  upsertBoxScore: vi.fn(),
  getGamesNeedingScores: vi.fn(),
  getGamesNeedingBoxScores: vi.fn(),
  insertSyncLog: vi.fn().mockReturnValue(1),
  updateSyncLog: vi.fn(),
}));

// ---- import (mock 이후) ----

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
import { syncSchedule, syncScores, syncBoxScores } from './sync-games';

// ---- 픽스처 ----

const makeGame = (overrides: Partial<GameSchedule> = {}): GameSchedule => ({
  gameId: '20260328KTLG0',
  date: '2026-03-28',
  time: '14:00',
  homeTeam: 'LG',
  awayTeam: 'KT',
  stadium: '잠실',
  status: 'final',
  seasonType: 'regular',
  homeScore: 5,
  awayScore: 3,
  broadcast: null,
  ...overrides,
});

const makeScoreBoard = (): ScoreBoard => ({
  gameId: '20260328KTLG0',
  innings: [{ inning: 1, away: 0, home: 1 }],
  home: { team: 'LG', runs: 5, hits: 8, errors: 0, baseOnBalls: 2 },
  away: { team: 'KT', runs: 3, hits: 6, errors: 1, baseOnBalls: 1 },
  winningPitcher: '엄상백',
  losingPitcher: '고영표',
  savePitcher: null,
  homeRuns: [],
  duration: '3:12',
  attendance: 15000,
});

const makeBoxScore = (): BoxScore => ({
  gameId: '20260328KTLG0',
  scoreBoard: makeScoreBoard(),
  homeBatters: [],
  awayBatters: [],
  homePitchers: [],
  awayPitchers: [],
});

// ---- 테스트 ----

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(insertSyncLog).mockReturnValue(1);
});

// ============================================
// syncSchedule
// ============================================

describe('syncSchedule', () => {
  it('fetchScheduleByMonth 성공 시 경기를 DB에 upsert하고 결과를 반환한다', async () => {
    const games = [makeGame(), makeGame({ gameId: '20260328HHLG0', awayTeam: 'HH' })];
    vi.mocked(fetchScheduleByMonth).mockResolvedValue({ success: true, data: games, error: null });

    const result = await syncSchedule(2026, 3);

    expect(fetchScheduleByMonth).toHaveBeenCalledWith(2026, 3);
    expect(fetchScheduleByMonthPlaywright).not.toHaveBeenCalled();
    expect(upsertGame).toHaveBeenCalledTimes(2);
    expect(result.gamesUpdated).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it('fetchScheduleByMonth 실패 시 Playwright fallback을 호출한다', async () => {
    const games = [makeGame()];
    vi.mocked(fetchScheduleByMonth).mockResolvedValue({ success: false, data: null, error: 'timeout' });
    vi.mocked(fetchScheduleByMonthPlaywright).mockResolvedValue({ success: true, data: games, error: null });

    const result = await syncSchedule(2026, 3);

    expect(fetchScheduleByMonthPlaywright).toHaveBeenCalledWith(2026, 3);
    expect(result.gamesUpdated).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it('PostBack과 Playwright 모두 실패하면 error를 반환한다', async () => {
    vi.mocked(fetchScheduleByMonth).mockResolvedValue({ success: false, data: null, error: 'timeout' });
    vi.mocked(fetchScheduleByMonthPlaywright).mockResolvedValue({ success: false, data: null, error: 'playwright error' });

    const result = await syncSchedule(2026, 3);

    expect(result.gamesUpdated).toBe(0);
    expect(result.errors).toHaveLength(1);
    // syncSchedule은 Playwright의 error 문자열을 그대로 throw하므로 해당 메시지 확인
    expect(result.errors[0].message).toContain('playwright error');
  });

  it('일부 게임 upsert 실패 시 나머지는 계속 처리하고 errors에 기록한다', async () => {
    const games = [makeGame(), makeGame({ gameId: '20260328HHLG0' })];
    vi.mocked(fetchScheduleByMonth).mockResolvedValue({ success: true, data: games, error: null });
    vi.mocked(upsertGame)
      .mockImplementationOnce(() => { throw new Error('DB 제약 위반'); })
      .mockImplementationOnce(() => undefined);

    const result = await syncSchedule(2026, 3);

    expect(result.gamesUpdated).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].gameId).toBe('20260328KTLG0');
  });

  it('syncLog를 시작/완료 시 각각 기록한다', async () => {
    vi.mocked(fetchScheduleByMonth).mockResolvedValue({ success: true, data: [], error: null });

    await syncSchedule(2026, 3);

    expect(insertSyncLog).toHaveBeenCalledWith('schedule:2026-03');
    expect(updateSyncLog).toHaveBeenCalledWith(1, 0, [], 'success');
  });

  it('경기가 0건이어도 성공으로 처리한다', async () => {
    vi.mocked(fetchScheduleByMonth).mockResolvedValue({ success: true, data: [], error: null });

    const result = await syncSchedule(2026, 3);

    expect(result.gamesUpdated).toBe(0);
    expect(result.errors).toHaveLength(0);
  });
});

// ============================================
// syncScores
// ============================================

describe('syncScores', () => {
  it('스코어 미수집 게임들의 스코어보드를 fetch하여 DB에 저장한다', async () => {
    const games = [makeGame({ status: 'final' })];
    vi.mocked(getGamesNeedingScores).mockReturnValue(games);
    vi.mocked(fetchScoreBoard).mockResolvedValue({ success: true, data: makeScoreBoard(), error: null });

    const result = await syncScores('2026-03-28');

    expect(getGamesNeedingScores).toHaveBeenCalledWith('2026-03-28');
    expect(fetchScoreBoard).toHaveBeenCalledTimes(1);
    expect(upsertScoreBoard).toHaveBeenCalledWith('20260328KTLG0', makeScoreBoard());
    expect(result.gamesUpdated).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it('스코어 수집 대상이 없으면 API를 호출하지 않는다', async () => {
    vi.mocked(getGamesNeedingScores).mockReturnValue([]);

    const result = await syncScores('2026-03-28');

    expect(fetchScoreBoard).not.toHaveBeenCalled();
    expect(result.gamesUpdated).toBe(0);
  });

  it('fetchScoreBoard 실패 시 해당 게임을 errors에 기록하고 다음 게임을 처리한다', async () => {
    const games = [
      makeGame({ gameId: '20260328KTLG0' }),
      makeGame({ gameId: '20260328HHLG0' }),
    ];
    vi.mocked(getGamesNeedingScores).mockReturnValue(games);
    vi.mocked(fetchScoreBoard)
      .mockResolvedValueOnce({ success: false, data: null, error: 'API 오류' })
      .mockResolvedValueOnce({ success: true, data: makeScoreBoard(), error: null });

    const result = await syncScores('2026-03-28');

    expect(result.gamesUpdated).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].gameId).toBe('20260328KTLG0');
  });

  it('syncLog를 시작/완료 시 각각 기록한다', async () => {
    vi.mocked(getGamesNeedingScores).mockReturnValue([]);

    await syncScores('2026-03-28');

    expect(insertSyncLog).toHaveBeenCalledWith('scores:2026-03-28');
    expect(updateSyncLog).toHaveBeenCalledWith(1, 0, [], 'success');
  });
});

// ============================================
// syncBoxScores
// ============================================

describe('syncBoxScores', () => {
  it('박스스코어 미수집 게임들을 fetch하여 DB에 저장한다', async () => {
    const games = [makeGame({ status: 'final' })];
    vi.mocked(getGamesNeedingBoxScores).mockReturnValue(games);
    vi.mocked(fetchBoxScore).mockResolvedValue({ success: true, data: makeBoxScore(), error: null });

    const result = await syncBoxScores('2026-03-28');

    expect(getGamesNeedingBoxScores).toHaveBeenCalledWith('2026-03-28');
    expect(fetchBoxScore).toHaveBeenCalledTimes(1);
    expect(upsertBoxScore).toHaveBeenCalledWith('20260328KTLG0', makeBoxScore());
    expect(result.gamesUpdated).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it('박스스코어 수집 대상이 없으면 API를 호출하지 않는다', async () => {
    vi.mocked(getGamesNeedingBoxScores).mockReturnValue([]);

    const result = await syncBoxScores('2026-03-28');

    expect(fetchBoxScore).not.toHaveBeenCalled();
    expect(result.gamesUpdated).toBe(0);
  });

  it('fetchBoxScore 실패 시 해당 게임을 errors에 기록하고 다음 게임을 처리한다', async () => {
    const games = [
      makeGame({ gameId: '20260328KTLG0' }),
      makeGame({ gameId: '20260328HHLG0' }),
    ];
    vi.mocked(getGamesNeedingBoxScores).mockReturnValue(games);
    vi.mocked(fetchBoxScore)
      .mockResolvedValueOnce({ success: false, data: null, error: 'API 오류' })
      .mockResolvedValueOnce({ success: true, data: makeBoxScore(), error: null });

    const result = await syncBoxScores('2026-03-28');

    expect(result.gamesUpdated).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].gameId).toBe('20260328KTLG0');
  });

  it('syncLog를 시작/완료 시 각각 기록한다', async () => {
    vi.mocked(getGamesNeedingBoxScores).mockReturnValue([]);

    await syncBoxScores('2026-03-28');

    expect(insertSyncLog).toHaveBeenCalledWith('boxscores:2026-03-28');
    expect(updateSyncLog).toHaveBeenCalledWith(1, 0, [], 'success');
  });
});
