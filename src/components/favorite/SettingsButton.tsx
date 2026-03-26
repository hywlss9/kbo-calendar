'use client';

import { useFavoriteTeam } from '@/lib/favorite/context';
import { KBO_TEAMS } from '@/types';

export function SettingsButton() {
  const { openSettings, favoriteTeam } = useFavoriteTeam();

  return (
    <button
      onClick={openSettings}
      aria-label="응원팀 설정"
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-zinc-500
        hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100
        dark:hover:bg-zinc-800 transition-colors"
    >
      {favoriteTeam && (
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: KBO_TEAMS[favoriteTeam].color }}
        />
      )}
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path
          d="M9 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
          stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
        />
        <path
          d="M14.55 9c0 .29.03.57.07.84l1.5 1.17a.36.36 0 0 1 .08.46l-1.42 2.46a.36.36 0 0 1-.44.16l-1.77-.71a6.3 6.3 0 0 1-1.45.84l-.27 1.88a.35.35 0 0 1-.35.3H7.5a.35.35 0 0 1-.35-.3l-.27-1.88a6.3 6.3 0 0 1-1.45-.84l-1.77.71a.36.36 0 0 1-.44-.16L1.8 11.47a.36.36 0 0 1 .08-.46l1.5-1.17c.04-.27.07-.56.07-.84s-.03-.57-.07-.84L1.88 6.99a.36.36 0 0 1-.08-.46l1.42-2.46a.36.36 0 0 1 .44-.16l1.77.71c.45-.32.93-.6 1.45-.84l.27-1.88A.35.35 0 0 1 7.5 1.5h2.85c.18 0 .33.13.35.3l.27 1.88c.52.24 1 .52 1.45.84l1.77-.71a.36.36 0 0 1 .44.16l1.42 2.46a.36.36 0 0 1-.08.46l-1.5 1.17c.04.27.07.55.07.84Z"
          stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
