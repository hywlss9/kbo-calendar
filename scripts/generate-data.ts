/**
 * generate-data.ts
 *
 * GitHub Actions에서 next build 전에 실행:
 *   npx ts-node --project tsconfig.scripts.json scripts/generate-data.ts
 *
 * 수행 작업:
 *   1. KBO 스크래퍼로 전월 + 당월~시즌 마지막 달(11월) 경기 일정 수집 → SQLite 갱신
 *   2. 최근 경기 스코어/박스스코어 수집 → SQLite 갱신
 *   3. SQLite → public/data/games/YYYY-MM.json 내보내기
 */

import path from 'path';
import fs from 'fs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

// tsconfig paths alias(@/)가 ts-node에서 작동하도록 require로 로드
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { syncSchedule, syncScores, syncBoxScores } = require('../src/lib/sync/sync-games');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getGamesByRange } = require('../src/lib/db/queries');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { calendarRangeFrom, calendarRangeTo } = require('../src/lib/utils/date');

const TZ = 'Asia/Seoul';
const OUT_DIR = path.resolve(__dirname, '../public/data/games');

async function main() {
  const today = dayjs().tz(TZ);
  const currentYear = today.year();
  const currentMonth = today.month() + 1;

  // 전월 + 당월~시즌 마지막 달(11월) 수집 — 미래 월 데이터도 미리 확보.
  // 비시즌(12월~2월)에는 기존과 동일하게 전월/당월/다음달 3개월만 수집.
  const KBO_SEASON_END = 11;
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear  = currentMonth === 1 ? currentYear - 1 : currentYear;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYear  = currentMonth === 12 ? currentYear + 1 : currentYear;

  const monthsToSync: Array<{ year: number; month: number; yearAdj: number }> = [];

  if (currentMonth <= KBO_SEASON_END) {
    // 시즌 중: 전월 + 당월~11월
    monthsToSync.push({ year: currentYear, month: prevMonth, yearAdj: prevYear });
    for (let m = currentMonth; m <= KBO_SEASON_END; m++) {
      monthsToSync.push({ year: currentYear, month: m, yearAdj: currentYear });
    }
  } else {
    // 비시즌(12월~): 전월/당월/다음달
    monthsToSync.push({ year: currentYear, month: prevMonth, yearAdj: prevYear });
    monthsToSync.push({ year: currentYear, month: currentMonth, yearAdj: currentYear });
    monthsToSync.push({ year: currentYear, month: nextMonth, yearAdj: nextYear });
  }

  console.log('[generate-data] 경기 일정 스크래핑 시작...');
  for (const { year, month, yearAdj } of monthsToSync) {
    const y = yearAdj ?? year;
    console.log(`  → ${y}년 ${month}월`);
    try {
      const result = await syncSchedule(y, month);
      console.log(`     ${result.gamesUpdated}경기 업데이트, 오류 ${result.errors.length}건`);
    } catch (err) {
      console.error(`     오류:`, err);
    }
  }

  // 오늘 + 어제 스코어/박스스코어 수집
  const datesToSync = [
    today.subtract(1, 'day').format('YYYY-MM-DD'),
    today.format('YYYY-MM-DD'),
  ];

  console.log('[generate-data] 스코어 수집 시작...');
  for (const date of datesToSync) {
    console.log(`  → ${date}`);
    try {
      await syncScores(date);
      await syncBoxScores(date);
    } catch (err) {
      console.error(`     오류:`, err);
    }
  }

  // JSON 파일 내보내기
  console.log('[generate-data] JSON 파일 생성 중...');
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const { year, month, yearAdj } of monthsToSync) {
    const y = yearAdj ?? year;
    const from = calendarRangeFrom(y, month);
    const to   = calendarRangeTo(y, month);
    const games = getGamesByRange(from, to);

    const pad = (n: number) => String(n).padStart(2, '0');
    const filename = `${y}-${pad(month)}.json`;
    const outPath = path.join(OUT_DIR, filename);

    fs.writeFileSync(outPath, JSON.stringify({ year: y, month, games }, null, 2), 'utf-8');
    console.log(`  → ${filename} (${games.length}경기)`);
  }

  console.log('[generate-data] 완료');
}

main().catch((err) => {
  console.error('[generate-data] 치명적 오류:', err);
  process.exit(1);
});
