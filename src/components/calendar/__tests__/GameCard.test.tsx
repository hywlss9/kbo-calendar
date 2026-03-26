import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { GameSchedule } from '@/types'
import { KBO_TEAMS } from '@/types'
import React from 'react'

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

import { GameCard } from '@/components/calendar/GameCard'

const baseGame: GameSchedule = {
  gameId: '20260328KTLG0',
  date: '2026-03-28',
  time: '14:00',
  homeTeam: 'LG',
  awayTeam: 'KT',
  stadium: '잠실',
  status: 'scheduled',
  seasonType: 'regular',
  homeScore: null,
  awayScore: null,
  broadcast: null,
}

describe('GameCard', () => {
  it('scheduled 상태 → 시간 표시, 스코어 없음', () => {
    render(<GameCard game={baseGame} />)
    // 시간은 두 레이아웃 모두에 렌더링됨
    const timeEls = screen.getAllByText('14:00')
    expect(timeEls.length).toBeGreaterThan(0)
    // 스코어 없음 (숫자 대시 형태)
    expect(screen.queryByText(/\d+-\d+/)).toBeNull()
  })

  it('final 상태, 스코어 있음 → 스코어 표시', () => {
    const game: GameSchedule = {
      ...baseGame,
      status: 'final',
      homeScore: 5,
      awayScore: 3,
    }
    render(<GameCard game={game} />)
    // 그리드뷰: "3-5", 리스트뷰: "3 - 5"
    expect(screen.getByText('3-5')).toBeTruthy()
    expect(screen.getByText(/3 - 5/)).toBeTruthy()
  })

  it('cancelled 상태 → opacity-50 및 line-through 클래스 적용', () => {
    const game: GameSchedule = { ...baseGame, status: 'cancelled' }
    const { container } = render(<GameCard game={game} />)
    // 그리드뷰 div에 opacity-50 클래스
    expect(container.querySelector('.opacity-50')).toBeTruthy()
    // 팀명 span에 line-through 클래스
    expect(container.querySelector('.line-through')).toBeTruthy()
  })

  it('postponed 상태 → 취소 스타일 적용', () => {
    const game: GameSchedule = { ...baseGame, status: 'postponed' }
    const { container } = render(<GameCard game={game} />)
    expect(container.querySelector('.line-through')).toBeTruthy()
  })

  it('suspended 상태 → 취소 스타일 적용', () => {
    const game: GameSchedule = { ...baseGame, status: 'suspended' }
    const { container } = render(<GameCard game={game} />)
    expect(container.querySelector('.line-through')).toBeTruthy()
  })

  it('gameId로 올바른 href 생성', () => {
    render(<GameCard game={baseGame} />)
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/game/20260328KTLG0')
  })

  it('팀 shortName 텍스트 렌더링', () => {
    render(<GameCard game={baseGame} />)
    // KT, LG shortName
    expect(screen.getAllByText('KT').length).toBeGreaterThan(0)
    expect(screen.getAllByText('LG').length).toBeGreaterThan(0)
  })

  it('홈팀 색상 인디케이터 backgroundColor 검증', () => {
    const { container } = render(<GameCard game={baseGame} />)
    const colorDot = container.querySelector('span[style]') as HTMLElement | null
    expect(colorDot).not.toBeNull()
    // jsdom이 hex 색상을 rgb() 형식으로 변환함 (#C60C30 → rgb(198, 12, 48))
    expect(colorDot!.style.backgroundColor).toBeTruthy()
    expect(colorDot!.style.backgroundColor).not.toBe('')
  })

  it('cancelled 상태에서 스코어 없어도 시간 표시', () => {
    const game: GameSchedule = { ...baseGame, status: 'cancelled' }
    render(<GameCard game={game} />)
    expect(screen.getAllByText('14:00').length).toBeGreaterThan(0)
  })
})
