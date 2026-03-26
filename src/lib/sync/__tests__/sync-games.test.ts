import { describe, it, expect } from 'vitest'
import { buildApiParams } from '@/lib/sync/sync-games'

describe('buildApiParams', () => {
  it('regular 시즌 → srId=0', () => {
    const result = buildApiParams('20260328KTLG0', 'regular')
    expect(result).toEqual({ leId: 1, srId: 0, seasonId: 2026, gameId: '20260328KTLG0' })
  })

  it('preseason → srId=1', () => {
    const result = buildApiParams('20260301KTLG0', 'preseason')
    expect(result).toEqual({ leId: 1, srId: 1, seasonId: 2026, gameId: '20260301KTLG0' })
  })

  it('postseason → srId=4 (와일드카드 기본값)', () => {
    const result = buildApiParams('20261001KTLG0', 'postseason')
    expect(result).toEqual({ leId: 1, srId: 4, seasonId: 2026, gameId: '20261001KTLG0' })
  })

  it('gameId 앞 4자리에서 seasonId 추출', () => {
    const result = buildApiParams('20251015KTLG0', 'regular')
    expect(result.seasonId).toBe(2025)
  })

  it('leId는 항상 1', () => {
    const result = buildApiParams('20260328KTLG0', 'regular')
    expect(result.leId).toBe(1)
  })
})
