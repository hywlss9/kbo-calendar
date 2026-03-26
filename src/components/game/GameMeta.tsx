import type { GameSchedule, ScoreBoard } from '@/types';

interface GameMetaProps {
  schedule: GameSchedule;
  scoreBoard: ScoreBoard | null;
}

export function GameMeta({ schedule, scoreBoard }: GameMetaProps) {
  const items: Array<{ label: string; value: string | null }> = [
    { label: '경기장', value: schedule.stadium || null },
    {
      label: '관중',
      value: scoreBoard?.attendance != null
        ? `${scoreBoard.attendance.toLocaleString()}명`
        : null,
    },
    { label: '경기시간', value: scoreBoard?.duration ?? null },
    { label: '중계', value: schedule.broadcast ?? null },
    { label: '승리투수', value: scoreBoard?.winningPitcher ?? null },
    { label: '패전투수', value: scoreBoard?.losingPitcher ?? null },
    { label: '세이브', value: scoreBoard?.savePitcher ?? null },
  ].filter((item): item is { label: string; value: string } => item.value !== null);

  if (items.length === 0) return null;

  return (
    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border
      border-zinc-200 dark:border-zinc-800 p-4">
      {items.map(({ label, value }) => (
        <div key={label} className="flex flex-col gap-0.5">
          <dt className="text-xs text-zinc-400 dark:text-zinc-500">{label}</dt>
          <dd className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
