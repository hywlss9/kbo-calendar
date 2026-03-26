import Link from 'next/link';
import { KBO_TEAMS } from '@/types';
import type { GameSchedule } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface GameCardProps {
  game: GameSchedule;
  isFavoriteGame?: boolean;
}

const CANCELLED_STATUSES = new Set(['cancelled', 'postponed', 'suspended']);

export function GameCard({ game, isFavoriteGame = false }: GameCardProps) {
  const { gameId, homeTeam, awayTeam, time, status, homeScore, awayScore } = game;
  const isCancelled = CANCELLED_STATUSES.has(status);
  const hasScore = homeScore !== null && awayScore !== null;
  const homeInfo = KBO_TEAMS[homeTeam];
  const awayInfo = KBO_TEAMS[awayTeam];

  return (
    <Link href={`/game/${gameId}`} className="block group">
      {/* 그리드 뷰 (md 이상): 압축 1행 표시 */}
      <div
        className={`hidden md:flex items-center gap-1 rounded px-1 py-0.5 text-xs
          hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors
          ${isCancelled ? 'opacity-50' : ''}
          ${isFavoriteGame ? 'font-semibold' : ''}`}
        style={isFavoriteGame ? { backgroundColor: `${homeInfo.color}18` } : undefined}
      >
        {/* 홈팀 색상 인디케이터 */}
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: homeInfo.color }}
        />
        <span className={`flex-1 truncate ${isCancelled ? 'line-through' : ''}`}>
          <span className="font-medium">{awayInfo.shortName}</span>
          <span className="text-zinc-400 mx-0.5">vs</span>
          <span className="font-medium">{homeInfo.shortName}</span>
        </span>
        {hasScore && !isCancelled ? (
          <span className="font-mono text-zinc-500 shrink-0">
            {awayScore}-{homeScore}
          </span>
        ) : (
          <span className="text-zinc-400 shrink-0">{time}</span>
        )}
      </div>

      {/* 리스트 뷰 (md 미만): 풀 카드 표시 */}
      <div
        className={`md:hidden flex items-center justify-between rounded-lg p-3
          bg-white dark:bg-zinc-900 border transition-colors
          ${isFavoriteGame
            ? 'border-2'
            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'}
          ${isCancelled ? 'opacity-60' : ''}`}
        style={isFavoriteGame ? { borderColor: homeInfo.color } : undefined}
      >
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div
              className="text-xs font-semibold"
              style={{ color: awayInfo.color }}
            >
              {awayInfo.shortName}
            </div>
          </div>
          <span className="text-xs text-zinc-400">vs</span>
          <div className="text-center">
            <div
              className="text-xs font-semibold"
              style={{ color: homeInfo.color }}
            >
              {homeInfo.shortName}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasScore && !isCancelled ? (
            <span className="font-mono text-sm font-semibold">
              {awayScore} - {homeScore}
            </span>
          ) : (
            <span className="text-sm text-zinc-500">{time}</span>
          )}
          <StatusBadge status={status} />
        </div>
      </div>
    </Link>
  );
}
