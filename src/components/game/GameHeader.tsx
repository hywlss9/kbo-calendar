import type { GameSchedule } from '@/types';
import { KBO_TEAMS } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface GameHeaderProps {
  schedule: GameSchedule;
}

export function GameHeader({ schedule }: GameHeaderProps) {
  const { homeTeam, awayTeam, status, homeScore, awayScore, date, time } = schedule;
  const home = KBO_TEAMS[homeTeam];
  const away = KBO_TEAMS[awayTeam];
  const hasScore = homeScore !== null && awayScore !== null;
  const isCancelled = ['cancelled', 'postponed', 'suspended'].includes(status);

  return (
    <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
      <div className="flex items-center justify-between gap-4">
        {/* 원정팀 */}
        <div className="flex flex-col items-center gap-1 flex-1">
          <span className="text-xl font-bold" style={{ color: away.color }}>
            {away.shortName}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{away.name}</span>
          {hasScore && !isCancelled && (
            <span className="text-4xl font-mono font-bold mt-2 text-zinc-800 dark:text-zinc-100">
              {awayScore}
            </span>
          )}
        </div>

        {/* 가운데: 날짜/시간/상태 */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <StatusBadge status={status} />
          <time className="text-sm text-zinc-500 dark:text-zinc-400">{date}</time>
          {!hasScore || isCancelled ? (
            <span className="text-base font-medium text-zinc-700 dark:text-zinc-300">{time}</span>
          ) : (
            <span className="text-sm text-zinc-400 font-medium">VS</span>
          )}
        </div>

        {/* 홈팀 */}
        <div className="flex flex-col items-center gap-1 flex-1">
          <span className="text-xl font-bold" style={{ color: home.color }}>
            {home.shortName}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{home.name}</span>
          {hasScore && !isCancelled && (
            <span className="text-4xl font-mono font-bold mt-2 text-zinc-800 dark:text-zinc-100">
              {homeScore}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
