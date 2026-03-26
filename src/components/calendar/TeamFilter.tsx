'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { KBO_TEAMS } from '@/types';
import type { TeamCode } from '@/types';
import { ALL_TEAM_CODES } from '@/lib/utils/teams';

interface TeamFilterProps {
  selectedTeam: TeamCode | null;
}

export function TeamFilter({ selectedTeam }: TeamFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleTeamClick(code: TeamCode) {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedTeam === code) {
      params.delete('team');
    } else {
      params.set('team', code);
    }
    router.push(`/?${params.toString()}`);
  }

  function handleAllClick() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('team');
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800">
      <button
        onClick={handleAllClick}
        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
          ${selectedTeam === null
            ? 'bg-zinc-800 text-white border-zinc-800 dark:bg-white dark:text-zinc-900 dark:border-white'
            : 'border-zinc-300 text-zinc-600 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-400'
          }`}
      >
        전체
      </button>

      {ALL_TEAM_CODES.map((code) => {
        const team = KBO_TEAMS[code];
        const isSelected = selectedTeam === code;

        return (
          <button
            key={code}
            onClick={() => handleTeamClick(code)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
              ${isSelected
                ? 'text-white border-transparent'
                : 'border-zinc-300 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400'
              }`}
            style={isSelected ? { backgroundColor: team.color, borderColor: team.color } : undefined}
          >
            {team.shortName}
          </button>
        );
      })}
    </div>
  );
}
