import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { ScoreBoard as ScoreBoardType, GameSchedule, InningScore } from '@/types'
import { ScoreBoard } from '@/components/game/ScoreBoard'
import React from 'react'

const mockSchedule: GameSchedule = {
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
}

function makeInnings(count: number): InningScore[] {
  return Array.from({ length: count }, (_, i) => ({
    inning: i + 1,
    away: i === 1 ? 1 : 0,   // 2회 원정 1점
    home: i === 3 ? 2 : (i === count - 1 ? null : 0),  // 4회 홈 2점, 마지막 회 null
  }))
}

const mockScoreBoard: ScoreBoardType = {
  gameId: '20260328KTLG0',
  innings: makeInnings(9),
  away: { team: 'KT', runs: 3, hits: 7, errors: 1, baseOnBalls: 2 },
  home: { team: 'LG', runs: 5, hits: 9, errors: 0, baseOnBalls: 3 },
  winningPitcher: '김승리',
  losingPitcher: '박패배',
  savePitcher: null,
  homeRuns: [],
  attendance: 15234,
  duration: '3:12',
}

describe('ScoreBoard', () => {
  it('"이닝별 스코어" 헤딩 렌더링', () => {
    render(<ScoreBoard scoreBoard={mockScoreBoard} schedule={mockSchedule} />)
    expect(screen.getByText('이닝별 스코어')).toBeTruthy()
  })

  it('9이닝 헤더 컬럼(1~9) 모두 렌더링', () => {
    render(<ScoreBoard scoreBoard={mockScoreBoard} schedule={mockSchedule} />)
    for (let i = 1; i <= 9; i++) {
      expect(screen.getByRole('columnheader', { name: String(i) })).toBeTruthy()
    }
  })

  it('R/H/E/B 요약 헤더 렌더링', () => {
    render(<ScoreBoard scoreBoard={mockScoreBoard} schedule={mockSchedule} />)
    expect(screen.getByRole('columnheader', { name: 'R' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'H' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'E' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'B' })).toBeTruthy()
  })

  it('연장 12이닝 → 12컬럼 렌더링', () => {
    const extraInnings: ScoreBoardType = {
      ...mockScoreBoard,
      innings: makeInnings(12),
    }
    render(<ScoreBoard scoreBoard={extraInnings} schedule={mockSchedule} />)
    expect(screen.getByRole('columnheader', { name: '12' })).toBeTruthy()
    // 10, 11도 존재
    expect(screen.getByRole('columnheader', { name: '10' })).toBeTruthy()
  })

  it('이닝 데이터 없는 이닝 → - 표시', () => {
    // 1~3이닝만 데이터 있고 나머지는 inningMap에 없음
    const sparse: ScoreBoardType = {
      ...mockScoreBoard,
      innings: [
        { inning: 2, away: 1, home: 0 },
      ],
    }
    render(<ScoreBoard scoreBoard={sparse} schedule={mockSchedule} />)
    // 1회 데이터 없음 → '-' 표시 (두 행: 원정/홈)
    const dashCells = screen.getAllByText('-')
    expect(dashCells.length).toBeGreaterThan(0)
  })

  it('9회말 홈팀 null → - 표시', () => {
    render(<ScoreBoard scoreBoard={mockScoreBoard} schedule={mockSchedule} />)
    // makeInnings에서 마지막 이닝 home=null → '-'
    const dashCells = screen.getAllByText('-')
    expect(dashCells.length).toBeGreaterThan(0)
  })

  it('원정팀 R/H/E/B 요약값 렌더링', () => {
    render(<ScoreBoard scoreBoard={mockScoreBoard} schedule={mockSchedule} />)
    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row')
    // 원정팀 행 (index 1, 헤더 제외)
    const awayRow = rows[1]
    const cells = within(awayRow).getAllByRole('cell')
    // 마지막 4개 셀: R, H, E, B
    const rCell = cells[cells.length - 4]
    const hCell = cells[cells.length - 3]
    const eCell = cells[cells.length - 2]
    const bCell = cells[cells.length - 1]
    expect(rCell.textContent).toBe('3')  // runs
    expect(hCell.textContent).toBe('7')  // hits
    expect(eCell.textContent).toBe('1')  // errors
    expect(bCell.textContent).toBe('2')  // baseOnBalls
  })

  it('팀 shortName 렌더링 (KT, LG)', () => {
    render(<ScoreBoard scoreBoard={mockScoreBoard} schedule={mockSchedule} />)
    expect(screen.getByText('KT')).toBeTruthy()
    expect(screen.getByText('LG')).toBeTruthy()
  })
})
