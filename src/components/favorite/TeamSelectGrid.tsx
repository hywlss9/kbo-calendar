'use client';

import { KBO_TEAMS } from '@/types';
import { ALL_TEAM_CODES } from '@/lib/utils/teams';
import type { TeamCode } from '@/types';

interface TeamSelectGridProps {
  selected: TeamCode | null;
  onSelect: (code: TeamCode) => void;
}

export function TeamSelectGrid({ selected, onSelect }: TeamSelectGridProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {ALL_TEAM_CODES.map((code) => {
        const team = KBO_TEAMS[code];
        const isSelected = selected === code;
        return (
          <button
            key={code}
            onClick={() => onSelect(code)}
            className={`flex flex-col items-center gap-1.5 rounded-lg py-3 px-2 text-xs font-semibold
              transition-all border-2
              ${isSelected
                ? 'text-white border-transparent'
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-500'
              }`}
            style={isSelected ? { backgroundColor: team.color, borderColor: team.color } : undefined}
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.6)' : team.color }}
            />
            {team.shortName}
          </button>
        );
      })}
    </div>
  );
}
