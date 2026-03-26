import { vi } from 'vitest'

// next/navigation mock (jsdom 환경에서 CalendarView 하위 컴포넌트 대비)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))
