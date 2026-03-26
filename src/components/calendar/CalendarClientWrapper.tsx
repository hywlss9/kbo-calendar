'use client';

import { useFavoriteTeam } from '@/lib/favorite/context';
import CalendarView from './CalendarView';
import type { TeamCode } from '@/types';

interface CalendarClientWrapperProps {
  year: number;
  month: number;
  urlTeam: TeamCode | null;
}

export function CalendarClientWrapper({ year, month, urlTeam }: CalendarClientWrapperProps) {
  const { favoriteTeam, highlightEnabled } = useFavoriteTeam();

  return (
    <CalendarView
      year={year}
      month={month}
      selectedTeam={urlTeam}
      favoriteTeam={highlightEnabled ? favoriteTeam : null}
    />
  );
}
