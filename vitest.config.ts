import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    environmentMatchGlobs: [
      ['src/lib/**/*.test.ts', 'node'],
    ],
    server: {
      deps: {
        // playwright는 선택적 의존성(fallback 전용)이므로 번들링에서 제외
        external: ['playwright'],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // playwright는 선택적 의존성(설치 안 된 환경 대비), stub으로 리다이렉트
      // 테스트에서 vi.doMock('playwright', ...) 로 실제 동작 교체
      'playwright': path.resolve(__dirname, './src/test/playwright-stub.ts'),
    },
  },
})
