/**
 * generate-data.ts
 *
 * GitHub Actions에서 next build 전에 실행:
 *   npx ts-node --project tsconfig.scripts.json scripts/generate-data.ts
 *
 * 수행 작업:
 *   1. KBO 스크래퍼로 전월 + 당월~시즌 마지막 달(11월) 경기 일정 수집 → SQLite 갱신
 *   2. 각 월의 final/in_progress 경기 스코어/박스스코어 수집 → SQLite 갱신
 *   3. SQLite → public/data/games/YYYY-MM.json 내보내기 (일정)
 *   4. SQLite → public/data/games/detail/{gameId}.json 내보내기 (경기 상세)
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
const { getGamesByRange, getGameDetailsByRange } = require('../src/lib/db/queries');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { calendarRangeFrom, calendarRangeTo } = require('../src/lib/utils/date');

const TZ = 'Asia/Seoul';
const OUT_DIR = path.resolve(__dirname, '../public/data/games');
const DETAIL_DIR = path.resolve(__dirname, '../public/data/games/detail');

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

  console.log('[generate-data] 경기 일정 + 스코어 수집 시작...');
  for (const { year, month, yearAdj } of monthsToSync) {
    const y = yearAdj ?? year;
    console.log(`  → ${y}년 ${month}월`);

    // 1. 경기 일정 수집
    try {
      const result = await syncSchedule(y, month);
      console.log(`     일정: ${result.gamesUpdated}경기 업데이트, 오류 ${result.errors.length}건`);
    } catch (err) {
      console.error(`     일정 오류:`, err);
    }

    // 2. 해당 월의 final/in_progress 경기 스코어/박스스코어 수집 (미시작 경기 제외)
    const from = calendarRangeFrom(y, month);
    const to   = calendarRangeTo(y, month);
    const playedGames = getGamesByRange(from, to).filter(
      (g: { status: string }) => g.status === 'final' || g.status === 'in_progress',
    );
    const datesWithGames: string[] = [...new Set<string>(playedGames.map((g: { date: string }) => g.date))];

    if (datesWithGames.length > 0) {
      console.log(`     스코어 수집: ${datesWithGames.length}일`);
      for (const date of datesWithGames) {
        try {
          const scoreResult = await syncScores(date);
          const boxResult = await syncBoxScores(date);
          if (scoreResult.errors.length > 0) {
            console.warn(`     [${date}] 스코어 오류 ${scoreResult.errors.length}건:`, scoreResult.errors.slice(0, 2));
          }
          if (boxResult.errors.length > 0) {
            console.warn(`     [${date}] 박스스코어 오류 ${boxResult.errors.length}건:`, boxResult.errors.slice(0, 2));
          }
        } catch (err) {
          console.error(`     스코어 오류 (${date}):`, err);
        }
      }
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

  // 경기 상세 JSON 파일 내보내기 (final 경기만)
  console.log('[generate-data] 경기 상세 JSON 파일 생성 중...');
  fs.mkdirSync(DETAIL_DIR, { recursive: true });

  const detailFrom = calendarRangeFrom(prevYear, prevMonth);
  const detailTo   = calendarRangeTo(currentYear, KBO_SEASON_END);
  const allDetails = getGameDetailsByRange(detailFrom, detailTo);

  for (const detail of allDetails) {
    const outPath = path.join(DETAIL_DIR, `${detail.schedule.gameId}.json`);
    fs.writeFileSync(outPath, JSON.stringify(detail, null, 2), 'utf-8');
  }
  console.log(`  → 상세 파일 ${allDetails.length}건 생성`);

  console.log('[generate-data] 완료');
}

main().catch((err) => {
  console.error('[generate-data] 치명적 오류:', err);
  process.exit(1);
});
