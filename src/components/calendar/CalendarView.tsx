import type { GameSchedule, TeamCode } from '@/types';
import { buildCalendarMonth } from '@/lib/utils/date';
import { DayCell } from './DayCell';

interface CalendarViewProps {
  year: number;
  month: number;
  games: GameSchedule[];
  favoriteTeam?: TeamCode | null;
}

const WEEKDAY_HEADERS = ['일', '월', '화', '수', '목', '금', '토'];

export default function CalendarView({ year, month, games, favoriteTeam = null }: CalendarViewProps) {
  const calendar = buildCalendarMonth(year, month, games);

  return (
    <section
      className="flex-1 flex flex-col"
      style={{ viewTransitionName: 'calendar-grid' }}
    >
      {/* 데스크탑: 7열 캘린더 그리드 (md 이상) */}
      <div className="hidden md:flex flex-col flex-1">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
          {WEEKDAY_HEADERS.map((day, i) => (
            <div
              key={day}
              className={`py-2 text-center text-xs font-semibold
                ${i === 0 ? 'text-red-500 dark:text-red-400' : ''}
                ${i === 6 ? 'text-blue-500 dark:text-blue-400' : ''}
                ${i > 0 && i < 6 ? 'text-zinc-500 dark:text-zinc-400' : ''}`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 날짜 셀 그리드 */}
        <div className="grid grid-cols-7 flex-1 border-l border-t border-zinc-200 dark:border-zinc-800">
          {calendar.days.map((day) => (
            <DayCell key={day.date} day={day} favoriteTeam={favoriteTeam} />
          ))}
        </div>
      </div>

      {/* 모바일: 리스트 뷰 (md 미만) */}
      <div className="md:hidden divide-y divide-zinc-200 dark:divide-zinc-800">
        {calendar.days
          .filter((day) => day.isCurrentMonth)
          .map((day) => (
            <DayCell key={day.date} day={day} hideIfEmpty favoriteTeam={favoriteTeam} />
          ))}
      </div>
    </section>
  );
}
