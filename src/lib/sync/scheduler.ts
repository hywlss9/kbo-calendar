// ============================================
// node-cron 스케줄러 — KST 기준
// ============================================

import cron from 'node-cron';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { syncSchedule, syncScores, syncBoxScores } from './sync-games';
import { getGamesByDate } from '@/lib/db/queries';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Seoul';
const CRON_OPTS = { timezone: TZ };

function nowKst() {
  return dayjs().tz(TZ);
}

/**
 * 이번 달 일정을 수집하고, 7일 후가 다음 달이면 다음 달도 수집합니다.
 */
async function syncCurrentAndNextMonth() {
  const today = nowKst();
  const year = today.year();
  const month = today.month() + 1;

  await syncSchedule(year, month);

  const later = today.add(7, 'day');
  if (later.month() + 1 !== month) {
    await syncSchedule(later.year(), later.month() + 1);
  }
}

// Hot reload 중복 등록 방지 (개발 환경)
declare global {
  // eslint-disable-next-line no-var
  var __schedulerStarted: boolean | undefined;
}

export function startScheduler(): void {
  if (global.__schedulerStarted) return;
  global.__schedulerStarted = true;

  // 서버 시작 시 오늘 경기 데이터가 없으면 즉시 초기 동기화
  const today = nowKst().format('YYYY-MM-DD');
  const todayGames = getGamesByDate(today);
  if (todayGames.length === 0) {
    syncCurrentAndNextMonth().catch((err) =>
      console.error('[scheduler] 초기 동기화 실패:', err),
    );
  }

  // 매일 06:00 KST: 당일~7일 후 일정 수집
  cron.schedule(
    '0 6 * * *',
    async () => {
      try {
        await syncCurrentAndNextMonth();
      } catch (err) {
        console.error('[scheduler] 06:00 일정 동기화 실패:', err);
      }
    },
    CRON_OPTS,
  );

  // 매일 22:30 KST: 당일 스코어보드 수집
  cron.schedule(
    '30 22 * * *',
    async () => {
      try {
        const today = nowKst().format('YYYY-MM-DD');
        await syncScores(today);
      } catch (err) {
        console.error('[scheduler] 22:30 스코어 동기화 실패:', err);
      }
    },
    CRON_OPTS,
  );

  // 매일 23:00 KST: 당일 박스스코어 수집
  cron.schedule(
    '0 23 * * *',
    async () => {
      try {
        const today = nowKst().format('YYYY-MM-DD');
        await syncBoxScores(today);
      } catch (err) {
        console.error('[scheduler] 23:00 박스스코어 동기화 실패:', err);
      }
    },
    CRON_OPTS,
  );

  // 매주 월요일 03:00 KST: 2주치 일정 전체 갱신
  cron.schedule(
    '0 3 * * 1',
    async () => {
      try {
        await syncCurrentAndNextMonth();
      } catch (err) {
        console.error('[scheduler] 월요일 03:00 주간 동기화 실패:', err);
      }
    },
    CRON_OPTS,
  );

  console.log('[scheduler] KBO 데이터 동기화 스케줄러 시작됨 (KST)');
}
