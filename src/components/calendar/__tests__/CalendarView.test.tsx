import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { GameSchedule } from '@/types'
import React from 'react'

// DB cached queries mock
vi.mock('@/lib/db/cached-queries', () => ({
  getCachedGamesByRange: vi.fn(),
  getCachedGamesByTeam: vi.fn(),
}))

// next/cache mock
vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

// next/link mock
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

import CalendarView from '@/components/calendar/CalendarView'
import { getCachedGamesByRange, getCachedGamesByTeam } from '@/lib/db/cached-queries'
import { beforeEach } from 'vitest'

const mockGetByRange = getCachedGamesByRange as ReturnType<typeof vi.fn>
const mockGetByTeam = getCachedGamesByTeam as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

const mockGames: GameSchedule[] = [
  {
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
  },
]

describe('CalendarView', () => {
  it('selectedTeam=null → getCachedGamesByRange 호출', async () => {
    mockGetByRange.mockResolvedValue(mockGames)

    const element = await CalendarView({ year: 2026, month: 3, selectedTeam: null })
    render(element)

    expect(mockGetByRange).toHaveBeenCalledTimes(1)
    expect(mockGetByTeam).not.toHaveBeenCalled()
  })

  it('selectedTeam="LG" → getCachedGamesByTeam("LG", ...) 호출', async () => {
    mockGetByTeam.mockResolvedValue(mockGames)

    const element = await CalendarView({ year: 2026, month: 3, selectedTeam: 'LG' })
    render(element)

    expect(mockGetByTeam).toHaveBeenCalledWith('LG', expect.any(String), expect.any(String))
    expect(mockGetByRange).not.toHaveBeenCalled()
  })

  it('요일 헤더(일~토) 렌더링', async () => {
    mockGetByRange.mockResolvedValue([])

    const element = await CalendarView({ year: 2026, month: 3, selectedTeam: null })
    render(element)

    for (const day of ['일', '월', '화', '수', '목', '금', '토']) {
      expect(screen.getAllByText(day).length).toBeGreaterThan(0)
    }
  })

  it('경기 있는 날 → gameId 기반 링크 존재', async () => {
    mockGetByRange.mockResolvedValue(mockGames)

    const element = await CalendarView({ year: 2026, month: 3, selectedTeam: null })
    render(element)

    const links = screen.getAllByRole('link')
    const gameLinks = links.filter((l) =>
      l.getAttribute('href')?.includes('/game/20260328KTLG0')
    )
    expect(gameLinks.length).toBeGreaterThan(0)
  })

  it('경기 없음 → 경기 링크 없음', async () => {
    mockGetByRange.mockResolvedValue([])

    const element = await CalendarView({ year: 2026, month: 3, selectedTeam: null })
    render(element)

    const gameLinks = screen.queryAllByRole('link').filter((l) =>
      l.getAttribute('href')?.startsWith('/game/')
    )
    expect(gameLinks).toHaveLength(0)
  })

  it('CalendarView가 section 요소 반환', async () => {
    mockGetByRange.mockResolvedValue([])

    const element = await CalendarView({ year: 2026, month: 3, selectedTeam: null })
    const { container } = render(element)

    expect(container.querySelector('section')).toBeTruthy()
  })
})
