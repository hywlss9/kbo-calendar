// ============================================
// Next.js Instrumentation Hook
// 서버 프로세스 시작 시 1회 실행
// ============================================

export async function register() {
  // Edge Runtime에서는 better-sqlite3 / node-cron이 동작하지 않으므로
  // Node.js 런타임에서만 스케줄러를 시작합니다.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startScheduler } = await import('@/lib/sync/scheduler');
    startScheduler();
  }
}
