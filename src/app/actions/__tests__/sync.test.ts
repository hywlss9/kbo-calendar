import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { GameDetail, GameSchedule } from '@/types'

// next/cache mock
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

// DB queries mock
vi.mock('@/lib/db/queries', () => ({
  getGameDetail: vi.fn(),
  upsertBoxScore: vi.fn(),
  upsertScoreBoard: vi.fn(),
}))

// KBO API scraper mock
vi.mock('@/lib/scraper/kbo-api', () => ({
  fetchBoxScore: vi.fn(),
  fetchScoreBoard: vi.fn(),
}))

// sync-games mock (buildApiParams만 실제 구현 사용)
vi.mock('@/lib/sync/sync-games', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/sync/sync-games')>()
  return {
    ...actual,
    syncSchedule: vi.fn(),
    syncScores: vi.fn(),
    syncBoxScores: vi.fn(),
  }
})

import { triggerSyncGame } from '@/app/actions/sync'
import { getGameDetail, upsertBoxScore, upsertScoreBoard } from '@/lib/db/queries'
import { fetchBoxScore, fetchScoreBoard } from '@/lib/scraper/kbo-api'
import { revalidatePath } from 'next/cache'
import type { ScoreBoard, BoxScore } from '@/types'

const mockGetGameDetail = getGameDetail as ReturnType<typeof vi.fn>
const mockFetchBoxScore = fetchBoxScore as ReturnType<typeof vi.fn>
const mockFetchScoreBoard = fetchScoreBoard as ReturnType<typeof vi.fn>
const mockUpsertBoxScore = upsertBoxScore as ReturnType<typeof vi.fn>
const mockUpsertScoreBoard = upsertScoreBoard as ReturnType<typeof vi.fn>
const mockRevalidatePath = revalidatePath as ReturnType<typeof vi.fn>

const mockSchedule: GameSchedule = {
  gameId: '20260328KTLG0',
  date: '2026-03-28',
  time: '18:00',
  homeTeam: 'LG',
  awayTeam: 'KT',
  stadium: '잠실',
  status: 'final',
  seasonType: 'regular',
  homeScore: 5,
  awayScore: 3,
  broadcast: 'MBC스포츠+',
}

const mockDetail: GameDetail = {
  schedule: mockSchedule,
  scoreBoard: null,
  boxScore: null,
}

const mockScoreBoard: ScoreBoard = {
  gameId: '20260328KTLG0',
  innings: [{ inning: 1, away: 2, home: 0 }],
  home: { team: 'LG', runs: 5, hits: 8, errors: 0, baseOnBalls: 3 },
  away: { team: 'KT', runs: 3, hits: 7, errors: 1, baseOnBalls: 2 },
  homeRuns: [],
  winningPitcher: null,
  losingPitcher: null,
  savePitcher: null,
  duration: '2:30',
  attendance: 15000,
}

const mockBoxScore: BoxScore = {
  gameId: '20260328KTLG0',
  scoreBoard: mockScoreBoard,
  homeBatters: [],
  awayBatters: [],
  homePitchers: [],
  awayPitchers: [],
}

describe('triggerSyncGame', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('유효하지 않은 gameId → errors 반환', async () => {
    const result = await triggerSyncGame('invalid-id')
    expect(result.gamesUpdated).toBe(0)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(mockFetchBoxScore).not.toHaveBeenCalled()
  })

  it('DB에 경기 없음 → errors 반환', async () => {
    mockGetGameDetail.mockReturnValue(null)
    const result = await triggerSyncGame('20260328KTLG0')
    expect(result.gamesUpdated).toBe(0)
    expect(result.errors[0].message).toContain('찾을 수 없습니다')
    expect(mockFetchBoxScore).not.toHaveBeenCalled()
  })

  it('fetchBoxScore 성공 → upsertBoxScore 호출, gamesUpdated=1', async () => {
    mockGetGameDetail.mockReturnValue(mockDetail)
    mockFetchBoxScore.mockResolvedValue({ success: true, data: mockBoxScore, error: null })

    const result = await triggerSyncGame('20260328KTLG0')

    expect(result.gamesUpdated).toBe(1)
    expect(result.errors).toHaveLength(0)
    expect(mockUpsertBoxScore).toHaveBeenCalledWith('20260328KTLG0', mockBoxScore)
    expect(mockUpsertScoreBoard).not.toHaveBeenCalled()
    expect(mockRevalidatePath).toHaveBeenCalledWith('/game/20260328KTLG0')
  })

  it('fetchBoxScore 실패 + fetchScoreBoard 성공 → upsertScoreBoard 호출', async () => {
    mockGetGameDetail.mockReturnValue(mockDetail)
    mockFetchBoxScore.mockResolvedValue({ success: false, data: null, error: 'API 오류' })
    mockFetchScoreBoard.mockResolvedValue({ success: true, data: mockScoreBoard, error: null })

    const result = await triggerSyncGame('20260328KTLG0')

    expect(result.gamesUpdated).toBe(1)
    expect(result.errors).toHaveLength(0)
    expect(mockUpsertScoreBoard).toHaveBeenCalledWith('20260328KTLG0', mockScoreBoard)
    expect(mockUpsertBoxScore).not.toHaveBeenCalled()
  })

  it('fetchBoxScore + fetchScoreBoard 모두 실패 → errors 기록, gamesUpdated=0', async () => {
    mockGetGameDetail.mockReturnValue(mockDetail)
    mockFetchBoxScore.mockResolvedValue({ success: false, data: null, error: 'API 오류' })
    mockFetchScoreBoard.mockResolvedValue({ success: false, data: null, error: 'API 오류' })

    const result = await triggerSyncGame('20260328KTLG0')

    expect(result.gamesUpdated).toBe(0)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].gameId).toBe('20260328KTLG0')
    expect(mockUpsertBoxScore).not.toHaveBeenCalled()
    expect(mockUpsertScoreBoard).not.toHaveBeenCalled()
  })
})
