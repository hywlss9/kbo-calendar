import type { CalendarDay, TeamCode } from '@/types';
import { GameCard } from './GameCard';

interface DayCellProps {
  day: CalendarDay;
  hideIfEmpty?: boolean;
  favoriteTeam?: TeamCode | null;
}

const WEEKDAY_LABEL = ['일', '월', '화', '수', '목', '금', '토'];

export function DayCell({ day, hideIfEmpty = false, favoriteTeam = null }: DayCellProps) {
  if (hideIfEmpty && day.games.length === 0) return null;

  const dayNum = parseInt(day.date.slice(8), 10);
  // 요일 계산 (Date 객체 사용, KST 기준 문자열로 충분)
  const weekday = new Date(day.date).getDay();

  const dateNumClass = day.isToday
    ? 'w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold'
    : `text-xs font-medium ${
        weekday === 0
          ? 'text-red-500 dark:text-red-400'
          : weekday === 6
          ? 'text-blue-500 dark:text-blue-400'
          : 'text-zinc-700 dark:text-zinc-300'
      }`;

  const cellOpacity = !day.isCurrentMonth ? 'opacity-40' : '';

  return (
    <>
      {/* 그리드 뷰 셀 (md 이상) */}
      <div
        className={`hidden md:block min-h-24 p-1 border-r border-b border-zinc-200
          dark:border-zinc-800 ${cellOpacity}`}
      >
        <div className="mb-1 flex items-center gap-1">
          <span className={dateNumClass}>{dayNum}</span>
        </div>
        <div className="space-y-0.5">
          {day.games.map((game) => {
            const isFavoriteGame =
              favoriteTeam !== null &&
              (game.homeTeam === favoriteTeam || game.awayTeam === favoriteTeam);
            return (
              <GameCard key={game.gameId} game={game} isFavoriteGame={isFavoriteGame} favoriteTeam={favoriteTeam} />
            );
          })}
        </div>
      </div>

      {/* 리스트 뷰 항목 (md 미만) */}
      <div
        className={`md:hidden px-4 py-3 ${cellOpacity}`}
      >
        <time className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
          <span>{`${parseInt(day.date.slice(5, 7), 10)}월 ${dayNum}일 (${WEEKDAY_LABEL[weekday]})`}</span>
        </time>
        {day.games.length > 0 ? (
          <div className="space-y-2">
            {day.games.map((game) => {
              const isFavoriteGame =
                favoriteTeam !== null &&
                (game.homeTeam === favoriteTeam || game.awayTeam === favoriteTeam);
              return (
                <GameCard key={game.gameId} game={game} isFavoriteGame={isFavoriteGame} favoriteTeam={favoriteTeam} />
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-zinc-400">경기 없음</p>
        )}
      </div>
    </>
  );
}
