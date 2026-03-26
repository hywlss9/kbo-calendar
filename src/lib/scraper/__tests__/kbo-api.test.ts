import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { KboApiParams } from '@/types'

// axios mock — hoisting으로 import보다 먼저 실행됨
vi.mock('axios', () => ({
  default: { post: vi.fn() },
  isAxiosError: vi.fn((err: unknown) => (err as Record<string, unknown>)?.isAxiosError === true),
}))

import axios, { isAxiosError } from 'axios'
import { fetchScoreBoard, fetchBoxScore } from '@/lib/scraper/kbo-api'

// ---- Fixtures ----
const FIXTURES_DIR = join(__dirname, 'fixtures')
const scoreBoardFixture = JSON.parse(
  readFileSync(join(FIXTURES_DIR, 'scoreboard-api.json'), 'utf-8')
)
const boxScoreFixture = JSON.parse(
  readFileSync(join(FIXTURES_DIR, 'boxscore-api.json'), 'utf-8')
)

const mockPost = axios.post as ReturnType<typeof vi.fn>
const mockIsAxiosError = isAxiosError as ReturnType<typeof vi.fn>

const BASE_PARAMS: KboApiParams = {
  leId: 1,
  srId: 0,
  seasonId: 2026,
  gameId: '20260328KTLG0',
}

function makeAxiosError(status: number) {
  return Object.assign(new Error(`HTTP ${status}`), {
    isAxiosError: true,
    response: { status },
  })
}

// ---- Tests ----

describe('fetchScoreBoard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockIsAxiosError.mockImplementation(
      (err: unknown) => (err as Record<string, unknown>)?.isAxiosError === true
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('정상 응답 → success:true, ScoreBoard 반환', async () => {
    mockPost.mockResolvedValueOnce({
      data: { d: JSON.stringify(scoreBoardFixture) },
    })

    const result = await fetchScoreBoard(BASE_PARAMS)

    expect(result.success).toBe(true)
    expect(result.data).not.toBeNull()
    expect(result.data!.gameId).toBe('20260328KTLG0')
    expect(result.data!.away.team).toBe('KT')
    expect(result.data!.home.team).toBe('LG')
    expect(result.data!.innings).toHaveLength(9)
    expect(result.data!.away.runs).toBe(3)
    expect(result.data!.home.runs).toBe(5)
    expect(result.data!.winningPitcher).toBe('김승리')
    expect(result.data!.losingPitcher).toBe('박패배')
    expect(result.data!.homeRuns).toEqual(['홍길동', '김철수'])
    expect(result.data!.attendance).toBe(15234)
  })

  it('response.data.d가 유효하지 않은 JSON → success:false', async () => {
    // 재시도마다 invalid JSON 반환 (4회 모두)
    mockPost.mockResolvedValue({ data: { d: 'invalid-json!!!' } })

    const promise = fetchScoreBoard(BASE_PARAMS)
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('HTTP 403 → 즉시 중단, axios.post 호출 횟수 = 1', async () => {
    mockPost.mockRejectedValueOnce(makeAxiosError(403))

    const promise = fetchScoreBoard(BASE_PARAMS)
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/403/)
    expect(mockPost).toHaveBeenCalledTimes(1)
  })

  it('HTTP 429 → 즉시 중단, axios.post 호출 횟수 = 1', async () => {
    mockPost.mockRejectedValueOnce(makeAxiosError(429))

    const promise = fetchScoreBoard(BASE_PARAMS)
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/429/)
    expect(mockPost).toHaveBeenCalledTimes(1)
  })

  it('네트워크 오류 연속 → 4회 시도 후 success:false', async () => {
    const networkError = new Error('ECONNRESET')
    mockPost.mockRejectedValue(networkError)

    const promise = fetchScoreBoard(BASE_PARAMS)
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/4회 시도/)
    // attempt 0,1,2,3 → 총 4회
    expect(mockPost).toHaveBeenCalledTimes(4)
  })

  it('첫 2회 실패, 3회째 성공 → success:true', async () => {
    const networkError = new Error('ECONNRESET')
    mockPost
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce({ data: { d: JSON.stringify(scoreBoardFixture) } })

    const promise = fetchScoreBoard(BASE_PARAMS)
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.success).toBe(true)
    expect(mockPost).toHaveBeenCalledTimes(3)
  })
})

describe('fetchBoxScore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockIsAxiosError.mockImplementation(
      (err: unknown) => (err as Record<string, unknown>)?.isAxiosError === true
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('정상 응답 → BoxScore 반환, 타자/투수 파싱 포함', async () => {
    mockPost.mockResolvedValueOnce({
      data: { d: JSON.stringify(boxScoreFixture) },
    })

    const result = await fetchBoxScore(BASE_PARAMS)

    expect(result.success).toBe(true)
    expect(result.data).not.toBeNull()
    expect(result.data!.gameId).toBe('20260328KTLG0')
    // 원정 타자: batter-table 기반 (colspan 행 제외하여 2명)
    // 원정 타자: batter-table 기반 (colspan 행 제외하여 2명)
    expect(result.data!.awayBatters).toHaveLength(2)
    // 홈 타자: 1명
    expect(result.data!.homeBatters).toHaveLength(1)
    // 원정 투수: pitcher-table-10col 기반 3명 (삼진 컬럼 포함)
    expect(result.data!.awayPitchers).toHaveLength(3)
    // 홈 투수: pitcher-table-9col 기반 2명
    expect(result.data!.homePitchers).toHaveLength(2)
    // scoreBoard 포함 검증
    expect(result.data!.scoreBoard.away.team).toBe('KT')
    expect(result.data!.scoreBoard.away.runs).toBe(3)
  })

  it('table2~5 누락(undefined) → 빈 배열로 처리', async () => {
    const fixtureWithoutTables = {
      table1: boxScoreFixture.table1,
      game_info: boxScoreFixture.game_info,
      // table2~5 없음
    }
    mockPost.mockResolvedValueOnce({
      data: { d: JSON.stringify(fixtureWithoutTables) },
    })

    const result = await fetchBoxScore(BASE_PARAMS)

    expect(result.success).toBe(true)
    expect(result.data!.awayBatters).toEqual([])
    expect(result.data!.homeBatters).toEqual([])
    expect(result.data!.awayPitchers).toEqual([])
    expect(result.data!.homePitchers).toEqual([])
  })

  it('HTTP 403 → success:false, 재시도 없음', async () => {
    mockPost.mockRejectedValueOnce(makeAxiosError(403))

    const promise = fetchBoxScore(BASE_PARAMS)
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.success).toBe(false)
    expect(mockPost).toHaveBeenCalledTimes(1)
  })
})
