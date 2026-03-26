// playwright는 선택적 의존성 (fallback 전용).
// 테스트에서는 vi.doMock('playwright', ...) 로 동작을 교체.
export const chromium = {
  launch: () => {
    throw new Error('playwright stub — use vi.doMock to override in tests')
  },
}
