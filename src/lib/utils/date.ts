import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import type { CalendarDay, CalendarMonth, GameSchedule } from '@/types';

dayjs.extend(utc);
dayjs.extend(timezone);

export const KST = 'Asia/Seoul';

/** 현재 KST 기준 dayjs 객체 반환 */
export function nowKst(): dayjs.Dayjs {
  return dayjs().tz(KST);
}

/** YYYY-MM-DD 문자열을 KST dayjs로 파싱 */
export function parseKstDate(dateStr: string): dayjs.Dayjs {
  return dayjs.tz(dateStr, KST);
}

/** year/month → 해당 월의 첫날 문자열 "YYYY-MM-01" */
export function monthStart(year: number, month: number): string {
  return dayjs.tz(`${year}-${String(month).padStart(2, '0')}-01`, KST).format('YYYY-MM-DD');
}

/** year/month → 해당 월의 마지막날 문자열 "YYYY-MM-DD" */
export function monthEnd(year: number, month: number): string {
  return dayjs.tz(`${year}-${String(month).padStart(2, '0')}-01`, KST)
    .endOf('month')
    .format('YYYY-MM-DD');
}

/**
 * 캘린더 그리드 시작일 (이전 달 포함).
 * 해당 월 1일이 속한 주의 일요일.
 */
export function calendarRangeFrom(year: number, month: number): string {
  const firstDay = dayjs.tz(`${year}-${String(month).padStart(2, '0')}-01`, KST);
  return firstDay.subtract(firstDay.day(), 'day').format('YYYY-MM-DD');
}

/**
 * 캘린더 그리드 종료일 (다음 달 초 포함).
 * 해당 월 마지막날이 속한 주의 토요일.
 */
export function calendarRangeTo(year: number, month: number): string {
  const lastDay = dayjs
    .tz(`${year}-${String(month).padStart(2, '0')}-01`, KST)
    .endOf('month');
  return lastDay.add(6 - lastDay.day(), 'day').format('YYYY-MM-DD');
}

/**
 * CalendarView용 핵심 함수.
 * 해당 month의 캘린더 그리드를 채우는 CalendarDay 배열 생성.
 * games는 getGamesByRange로 미리 조회한 배열을 전달.
 */
export function buildCalendarDays(
  year: number,
  month: number,
  games: GameSchedule[],
  todayStr: string,
): CalendarDay[] {
  // 날짜별 경기 Map으로 전처리 O(n)
  const gamesByDate = new Map<string, GameSchedule[]>();
  for (const game of games) {
    const list = gamesByDate.get(game.date) ?? [];
    list.push(game);
    gamesByDate.set(game.date, list);
  }

  const firstDay = dayjs.tz(`${year}-${String(month).padStart(2, '0')}-01`, KST);
  const gridStart = firstDay.subtract(firstDay.day(), 'day');
  const lastDay = firstDay.endOf('month');
  const gridEnd = lastDay.add(6 - lastDay.day(), 'day');

  const days: CalendarDay[] = [];
  let current = gridStart;

  while (!current.isAfter(gridEnd)) {
    const dateStr = current.format('YYYY-MM-DD');
    days.push({
      date: dateStr,
      isCurrentMonth: current.month() + 1 === month && current.year() === year,
      isToday: dateStr === todayStr,
      games: gamesByDate.get(dateStr) ?? [],
    });
    current = current.add(1, 'day');
  }

  return days;
}

/** CalendarMonth 전체 조립 */
export function buildCalendarMonth(
  year: number,
  month: number,
  games: GameSchedule[],
): CalendarMonth {
  const todayStr = nowKst().format('YYYY-MM-DD');
  return {
    year,
    month,
    days: buildCalendarDays(year, month, games, todayStr),
  };
}

/** 이전 달 year/month 반환 */
export function prevMonth(year: number, month: number): { year: number; month: number } {
  const d = dayjs.tz(`${year}-${String(month).padStart(2, '0')}-01`, KST).subtract(1, 'month');
  return { year: d.year(), month: d.month() + 1 };
}

/** 다음 달 year/month 반환 */
export function nextMonth(year: number, month: number): { year: number; month: number } {
  const d = dayjs.tz(`${year}-${String(month).padStart(2, '0')}-01`, KST).add(1, 'month');
  return { year: d.year(), month: d.month() + 1 };
}
