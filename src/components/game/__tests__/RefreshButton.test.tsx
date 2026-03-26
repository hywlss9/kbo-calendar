import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// Server Action mock
vi.mock('@/app/actions/sync', () => ({
  triggerSyncGame: vi.fn(),
}))

import { RefreshButton } from '@/components/game/RefreshButton'
import { triggerSyncGame } from '@/app/actions/sync'

const mockTriggerSyncGame = triggerSyncGame as ReturnType<typeof vi.fn>

describe('RefreshButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('새로고침 버튼이 렌더링됨', () => {
    render(<RefreshButton gameId="20260328KTLG0" />)
    expect(screen.getByRole('button', { name: '경기 데이터 새로고침' })).toBeTruthy()
  })

  it('클릭 시 triggerSyncGame(gameId) 호출됨', async () => {
    mockTriggerSyncGame.mockResolvedValue({ gamesUpdated: 1, errors: [] })
    render(<RefreshButton gameId="20260328KTLG0" />)

    fireEvent.click(screen.getByRole('button', { name: '경기 데이터 새로고침' }))

    await waitFor(() => {
      expect(mockTriggerSyncGame).toHaveBeenCalledWith('20260328KTLG0')
    })
  })

  it('errors=[] → 성공 메시지 표시', async () => {
    mockTriggerSyncGame.mockResolvedValue({ gamesUpdated: 1, errors: [] })
    render(<RefreshButton gameId="20260328KTLG0" />)

    fireEvent.click(screen.getByRole('button', { name: '경기 데이터 새로고침' }))

    await waitFor(() => {
      expect(screen.getByText('업데이트 완료')).toBeTruthy()
    })
  })

  it('errors=[...] → 실패 메시지 표시', async () => {
    mockTriggerSyncGame.mockResolvedValue({
      gamesUpdated: 0,
      errors: [{ gameId: '20260328KTLG0', message: 'API 오류' }],
    })
    render(<RefreshButton gameId="20260328KTLG0" />)

    fireEvent.click(screen.getByRole('button', { name: '경기 데이터 새로고침' }))

    await waitFor(() => {
      expect(screen.getByText('데이터 수집 실패')).toBeTruthy()
    })
  })

  it('gamesUpdated=0이고 errors=[] → "수집할 데이터 없음" 메시지', async () => {
    mockTriggerSyncGame.mockResolvedValue({ gamesUpdated: 0, errors: [] })
    render(<RefreshButton gameId="20260328KTLG0" />)

    fireEvent.click(screen.getByRole('button', { name: '경기 데이터 새로고침' }))

    await waitFor(() => {
      expect(screen.getByText('수집할 데이터 없음')).toBeTruthy()
    })
  })
})
