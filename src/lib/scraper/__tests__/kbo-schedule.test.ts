import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
  isAxiosError: vi.fn((err: unknown) => (err as Record<string, unknown>)?.isAxiosError === true),
}))

import axios, { isAxiosError } from 'axios'
import {
  fetchScheduleByMonth,
  fetchScheduleByMonthPlaywright,
} from '@/lib/scraper/kbo-schedule'

// ---- Fixtures ----
const FIXTURES_DIR = join(__dirname, 'fixtures')
const schedulePageHtml = readFileSync(join(FIXTURES_DIR, 'schedule-page.html'), 'utf-8')
const scheduleTableHtml = readFileSync(join(FIXTURES_DIR, 'schedule-table.html'), 'utf-8')

const mockGet = axios.get as ReturnType<typeof vi.fn>
const mockPost = axios.post as ReturnType<typeof vi.fn>
const mockIsAxiosError = isAxiosError as ReturnType<typeof vi.fn>

function makeAxiosError(status: number) {
  return Object.assign(new Error(`HTTP ${status}`), {
    isAxiosError: true,
    response: { status },
  })
}

// ---- fetchScheduleByMonth ----

describe('fetchScheduleByMonth', () => {
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

  it('정상 흐름: GET → ViewState 추출 → POST → GameSchedule[] 반환', async () => {
    mockGet.mockResolvedValueOnce({ data: schedulePageHtml })
    mockPost.mockResolvedValueOnce({ data: scheduleTableHtml })

    const promise = fetchScheduleByMonth(2026, 3)
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(3)

    // 첫 경기 검증
    const first = result.data![0]
    expect(first.date).toBe('2026-03-28')
    expect(first.awayTeam).toBe('KT')
    expect(first.homeTeam).toBe('LG')
    expect(first.gameId).toBe('20260328KTLG0')
    expect(first.status).toBe('final')
    expect(first.awayScore).toBe(3)
    expect(first.homeScore).toBe(5)

    // 예정 경기 검증
    const scheduled = result.data![2]
    expect(scheduled.status).toBe('scheduled')
    expect(scheduled.awayScore).toBeNull()
  })

  it('GET 응답에 __VIEWSTATE 없음 → success:false', async () => {
    mockGet.mockResolvedValueOnce({
      data: '<html><body><form></form></body></html>',
    })

    const promise = fetchScheduleByMonth(2026, 3)
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/__VIEWSTATE/)
  })

  it('GET 응답이 문자열이 아님 → success:false', async () => {
    // 재시도마다 동일한 object 반환
    mockGet.mockResolvedValue({ data: { unexpected: 'object' } })

    const promise = fetchScheduleByMonth(2026, 3)
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.success).toBe(false)
    // 4회 재시도 후 실패 → "4회 시도 후 실패" 또는 "문자열이 아님" 포함
    expect(result.error).toBeTruthy()
  })

  it('GET HTTP 403 → success:false, 즉시 중단', async () => {
    mockGet.mockRejectedValueOnce(makeAxiosError(403))

    const promise = fetchScheduleByMonth(2026, 3)
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/403/)
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('POST 실패 → success:false', async () => {
    mockGet.mockResolvedValueOnce({ data: schedulePageHtml })
    mockPost.mockRejectedValue(new Error('POST 네트워크 오류'))

    const promise = fetchScheduleByMonth(2026, 3)
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.success).toBe(false)
  })

  it('POST 응답에 .tbl-type06 없음 → success:true, data:[]', async () => {
    mockGet.mockResolvedValueOnce({ data: schedulePageHtml })
    mockPost.mockResolvedValueOnce({
      data: '<html><body><p>경기 없음</p></body></html>',
    })

    const promise = fetchScheduleByMonth(2026, 3)
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.success).toBe(true)
    expect(result.data).toEqual([])
  })
})

// ---- fetchScheduleByMonthPlaywright ----
// playwright는 resolve.alias로 stub에 연결됨
// vi.doMock으로 테스트별 동작 설정

describe('fetchScheduleByMonthPlaywright', () => {
  const mockClose = vi.fn()
  const mockContent = vi.fn()
  const mockWaitForSelector = vi.fn()
  const mockSelectOption = vi.fn()
  const mockGoto = vi.fn()

  const mockPage = {
    goto: mockGoto,
    selectOption: mockSelectOption,
    waitForSelector: mockWaitForSelector,
    content: mockContent,
  }

  const mockNewPage = vi.fn()
  const mockLaunch = vi.fn()

  // 실타이머 사용 (모든 playwright mock이 즉시 resolve → 1500ms sleep만 실제 대기)
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()

    mockClose.mockResolvedValue(undefined)
    mockContent.mockResolvedValue(scheduleTableHtml)
    mockWaitForSelector.mockResolvedValue(undefined)
    mockSelectOption.mockResolvedValue(undefined)
    mockGoto.mockResolvedValue(undefined)
    mockNewPage.mockResolvedValue(mockPage)
    mockLaunch.mockResolvedValue({ newPage: mockNewPage, close: mockClose })

    vi.doMock('playwright', () => ({
      chromium: { launch: mockLaunch },
    }))
  })

  afterEach(() => {
    vi.doUnmock('playwright')
    vi.clearAllMocks()
  })

  it('정상 실행 → GameSchedule[] 반환', async () => {
    const result = await fetchScheduleByMonthPlaywright(2026, 3)

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(3)
    expect(mockClose).toHaveBeenCalledTimes(1)
  }, 10000)

  it('page.goto 실패 → success:false, browser.close는 반드시 호출', async () => {
    mockGoto.mockRejectedValueOnce(new Error('페이지 로드 실패'))

    const result = await fetchScheduleByMonthPlaywright(2026, 3)

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/페이지 로드 실패/)
    // finally 블록에서 close 호출
    expect(mockClose).toHaveBeenCalledTimes(1)
  })
})
