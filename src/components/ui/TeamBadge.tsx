import { KBO_TEAMS } from '@/types';
import type { TeamCode } from '@/types';

interface TeamBadgeProps {
  code: TeamCode;
  variant?: 'dot' | 'full';
}

export function TeamBadge({ code, variant = 'full' }: TeamBadgeProps) {
  const team = KBO_TEAMS[code];

  const dot = (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ backgroundColor: team.color }}
    />
  );

  if (variant === 'dot') return dot;

  return (
    <span className="inline-flex items-center gap-1">
      {dot}
      <span className="text-xs font-medium">{team.shortName}</span>
    </span>
  );
}
