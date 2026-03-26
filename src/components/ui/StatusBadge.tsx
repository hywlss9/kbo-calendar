import type { GameStatus } from '@/types';

const STATUS_STYLE: Record<GameStatus, string> = {
  scheduled:   'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  in_progress: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  final:       'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  cancelled:   'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
  postponed:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  suspended:   'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
};

const STATUS_LABEL: Record<GameStatus, string> = {
  scheduled:   '예정',
  in_progress: '진행중',
  final:       '종료',
  cancelled:   '취소',
  postponed:   '연기',
  suspended:   '서스펜디드',
};

interface StatusBadgeProps {
  status: GameStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`inline-block rounded px-1 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
