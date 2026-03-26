import { describe, it, expect, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { CREATE_TABLES_SQL } from '@/lib/db/schema'
import type { GameSchedule, ScoreBoard, BoxScore } from '@/types'

// next/cache mock (queries.ts에서 import)
vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

// better-sqlite3 in-memory DB를 client mock으로 주입
// vi.mock은 hoisting되어 queries.ts import 전에 실행됨
vi.mock('@/lib/db/client', () => {
  const db = new Database(':memory:')
  db.exec(CREATE_TABLES_SQL)
  return { default: db }
})

import {
  getGamesByDate,
  getGamesByRange,
  getGamesByTeam,
  getGameById,
  getGameDetail,
  upsertGame,
  upsertScoreBoard,
  upsertBoxScore,
  getGamesNeedingScores,
  getGamesNeedingBoxScores,
  insertSyncLog,
  updateSyncLog,
} from '@/lib/db/queries'
import db from '@/lib/db/client'

// ---- 테스트 데이터 ----

const mockGame: GameSchedule = {
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
  broadcast: 'SBS Sports',
}

const mockGame2: GameSchedule = {
  gameId: '20260328HHSS0',
  date: '2026-03-28',
  time: '14:00',
  homeTeam: 'SS',
  awayTeam: 'HH',
  stadium: '대전',
  status: 'final',
  seasonType: 'regular',
  homeScore: 4,
  awayScore: 2,
  broadcast: null,
}

const mockScheduledGame: GameSchedule = {
  gameId: '20260329NCHT0',
  date: '2026-03-29',
  time: '14:00',
  homeTeam: 'HT',
  awayTeam: 'NC',
  stadium: '광주',
  status: 'scheduled',
  seasonType: 'regular',
  homeScore: null,
  awayScore: null,
  broadcast: null,
}

const mockScoreBoard: ScoreBoard = {
  gameId: '20260328KTLG0',
  innings: [
    { inning: 1, away: 0, home: 0 },
    { inning: 2, away: 1, home: 0 },
    { inning: 9, away: 0, home: null },
  ],
  home: { team: 'LG', runs: 5, hits: 9, errors: 0, baseOnBalls: 3 },
  away: { team: 'KT', runs: 3, hits: 7, errors: 1, baseOnBalls: 2 },
  winningPitcher: '김승리',
  losingPitcher: '박패배',
  savePitcher: null,
  homeRuns: ['홍길동'],
  attendance: 15234,
  duration: '3:12',
}

const mockBoxScore: BoxScore = {
  gameId: '20260328KTLG0',
  scoreBoard: mockScoreBoard,
  homeBatters: [],
  awayBatters: [],
  homePitchers: [],
  awayPitchers: [],
}

// ---- 테스트 격리 ----

function clearTables() {
  db.exec('DELETE FROM games; DELETE FROM sync_logs')
}

// ---- CRUD ----

describe('upsertGame / getGamesByDate', () => {
  beforeEach(clearTables)

  it('경기 삽입 후 getGamesByDate로 조회', () => {
    upsertGame(mockGame)
    const games = getGamesByDate('2026-03-28')
    expect(games).toHaveLength(1)
    expect(games[0].gameId).toBe('20260328KTLG0')
    expect(games[0].homeTeam).toBe('LG')
    expect(games[0].awayTeam).toBe('KT')
    expect(games[0].homeScore).toBe(5)
    expect(games[0].awayScore).toBe(3)
    expect(games[0].status).toBe('final')
    expect(games[0].broadcast).toBe('SBS Sports')
  })

  it('다른 날짜 경기 → 해당 날짜 조회에서 제외', () => {
    upsertGame(mockGame)
    upsertGame(mockScheduledGame)
    expect(getGamesByDate('2026-03-28')).toHaveLength(1)
    expect(getGamesByDate('2026-03-29')).toHaveLength(1)
    expect(getGamesByDate('2026-03-30')).toHaveLength(0)
  })

  it('여러 경기 삽입 → time ASC 정렬', () => {
    const early: GameSchedule = { ...mockGame2, time: '13:00' }
    upsertGame(mockGame)    // 14:00
    upsertGame(early)       // 13:00
    const games = getGamesByDate('2026-03-28')
    expect(games[0].time).toBe('13:00')
    expect(games[1].time).toBe('14:00')
  })
})

describe('getGamesByRange', () => {
  beforeEach(() => {
    clearTables()
    upsertGame(mockGame)           // 2026-03-28
    upsertGame(mockScheduledGame)  // 2026-03-29
  })

  it('날짜 범위 내 경기 반환 (BETWEEN 경계값 포함)', () => {
    const games = getGamesByRange('2026-03-28', '2026-03-29')
    expect(games).toHaveLength(2)
  })

  it('범위 내 일부만 포함', () => {
    const games = getGamesByRange('2026-03-28', '2026-03-28')
    expect(games).toHaveLength(1)
    expect(games[0].date).toBe('2026-03-28')
  })

  it('범위 외 → 빈 배열', () => {
    const games = getGamesByRange('2026-04-01', '2026-04-30')
    expect(games).toHaveLength(0)
  })
})

describe('getGamesByTeam', () => {
  beforeEach(() => {
    clearTables()
    upsertGame(mockGame)   // KT(원정) vs LG(홈)
    upsertGame(mockGame2)  // HH(원정) vs SS(홈)
  })

  it('홈팀으로 조회', () => {
    const games = getGamesByTeam('LG', '2026-03-01', '2026-03-31')
    expect(games).toHaveLength(1)
    expect(games[0].homeTeam).toBe('LG')
  })

  it('원정팀으로 조회', () => {
    const games = getGamesByTeam('KT', '2026-03-01', '2026-03-31')
    expect(games).toHaveLength(1)
    expect(games[0].awayTeam).toBe('KT')
  })

  it('해당 경기 없는 팀 → 빈 배열', () => {
    const games = getGamesByTeam('NC', '2026-03-01', '2026-03-31')
    expect(games).toHaveLength(0)
  })
})

// ---- Upsert 동작 ----

describe('Upsert 동작 (ON CONFLICT + COALESCE)', () => {
  beforeEach(clearTables)

  it('동일 gameId 재삽입 → status 업데이트', () => {
    upsertGame({ ...mockGame, status: 'scheduled', homeScore: null, awayScore: null })
    upsertGame({ ...mockGame, status: 'final', homeScore: 5, awayScore: 3 })
    const games = getGamesByDate('2026-03-28')
    expect(games[0].status).toBe('final')
    expect(games[0].homeScore).toBe(5)
  })

  it('null 스코어로 upsert → COALESCE로 기존 스코어 보존', () => {
    upsertGame(mockGame)  // homeScore: 5, awayScore: 3
    // null 스코어로 재동기화
    upsertGame({ ...mockGame, homeScore: null, awayScore: null })
    const games = getGamesByDate('2026-03-28')
    // COALESCE(null, 5) = 5 → 기존 값 유지
    expect(games[0].homeScore).toBe(5)
    expect(games[0].awayScore).toBe(3)
  })

  it('upsertScoreBoard 후 upsertGame → scoreboard_json 유지', () => {
    upsertGame(mockGame)
    upsertScoreBoard(mockGame.gameId, mockScoreBoard)

    // 재동기화 (scoreboard_json=null로 upsert)
    upsertGame(mockGame)

    const detail = getGameDetail(mockGame.gameId)
    expect(detail?.scoreBoard).not.toBeNull()
    expect(detail?.scoreBoard?.winningPitcher).toBe('김승리')
  })
})

// ---- ScoreBoard / BoxScore JSON ----

describe('upsertScoreBoard / upsertBoxScore', () => {
  beforeEach(() => {
    clearTables()
    upsertGame(mockGame)
  })

  it('upsertScoreBoard → getGameDetail로 scoreBoard 조회', () => {
    upsertScoreBoard(mockGame.gameId, mockScoreBoard)
    const detail = getGameDetail(mockGame.gameId)
    expect(detail).not.toBeNull()
    expect(detail!.scoreBoard?.gameId).toBe('20260328KTLG0')
    expect(detail!.scoreBoard?.home.runs).toBe(5)
    expect(detail!.scoreBoard?.winningPitcher).toBe('김승리')
    expect(detail!.scoreBoard?.homeRuns).toEqual(['홍길동'])
    expect(detail!.scoreBoard?.attendance).toBe(15234)
  })

  it('upsertBoxScore → getGameDetail로 boxScore 조회', () => {
    upsertBoxScore(mockGame.gameId, mockBoxScore)
    const detail = getGameDetail(mockGame.gameId)
    expect(detail!.boxScore?.gameId).toBe('20260328KTLG0')
    expect(detail!.boxScore?.homeBatters).toEqual([])
  })

  it('scoreboard_json 없음 → scoreBoard: null', () => {
    const detail = getGameDetail(mockGame.gameId)
    expect(detail!.scoreBoard).toBeNull()
    expect(detail!.boxScore).toBeNull()
  })

  it('getGameDetail — 존재하지 않는 gameId → null', () => {
    const detail = getGameDetail('NONEXISTENT')
    expect(detail).toBeNull()
  })
})

// ---- 동기화 대상 쿼리 ----

describe('getGamesNeedingScores', () => {
  beforeEach(clearTables)

  it('status=final && scoreboard_json=null → 포함', () => {
    upsertGame(mockGame)  // status: final
    const games = getGamesNeedingScores('2026-03-28')
    expect(games).toHaveLength(1)
    expect(games[0].gameId).toBe('20260328KTLG0')
  })

  it('status=final && scoreboard_json 있음 → 제외', () => {
    upsertGame(mockGame)
    upsertScoreBoard(mockGame.gameId, mockScoreBoard)
    const games = getGamesNeedingScores('2026-03-28')
    expect(games).toHaveLength(0)
  })

  it('status=in_progress && scoreboard_json=null → 포함', () => {
    upsertGame({ ...mockGame, status: 'in_progress', homeScore: null, awayScore: null })
    const games = getGamesNeedingScores('2026-03-28')
    expect(games).toHaveLength(1)
  })

  it('status=scheduled → 포함되지 않음', () => {
    upsertGame(mockScheduledGame)
    const games = getGamesNeedingScores('2026-03-29')
    expect(games).toHaveLength(0)
  })
})

describe('getGamesNeedingBoxScores', () => {
  beforeEach(clearTables)

  it('status=final && boxscore_json=null → 포함', () => {
    upsertGame(mockGame)
    const games = getGamesNeedingBoxScores('2026-03-28')
    expect(games).toHaveLength(1)
  })

  it('status=final && boxscore_json 있음 → 제외', () => {
    upsertGame(mockGame)
    upsertBoxScore(mockGame.gameId, mockBoxScore)
    const games = getGamesNeedingBoxScores('2026-03-28')
    expect(games).toHaveLength(0)
  })
})

// ---- SyncLog ----

describe('insertSyncLog / updateSyncLog', () => {
  beforeEach(clearTables)

  it('insertSyncLog → number id 반환', () => {
    const id = insertSyncLog('schedule')
    expect(typeof id).toBe('number')
    expect(id).toBeGreaterThan(0)
  })

  it('updateSyncLog → status, games_updated 업데이트', () => {
    const id = insertSyncLog('scoreboard')
    updateSyncLog(id, 5, [], 'success')
    const row = db.prepare('SELECT * FROM sync_logs WHERE id = ?').get(id) as Record<string, unknown>
    expect(row.status).toBe('success')
    expect(row.games_updated).toBe(5)
    expect(row.finished_at).not.toBeNull()
    expect(row.errors_json).toBe('[]')
  })

  it('updateSyncLog — 에러 배열 포함', () => {
    const id = insertSyncLog('scoreboard')
    const errors = [{ gameId: '20260328KTLG0', message: '파싱 실패' }]
    updateSyncLog(id, 0, errors, 'error')
    const row = db.prepare('SELECT * FROM sync_logs WHERE id = ?').get(id) as Record<string, unknown>
    expect(row.status).toBe('error')
    expect(JSON.parse(row.errors_json as string)).toEqual(errors)
  })
})
