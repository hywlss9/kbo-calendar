import { Suspense } from 'react';
import { KBO_TEAMS } from '@/types';
import type { TeamCode } from '@/types';
import { nowKst } from '@/lib/utils/date';
import { CalendarNav } from '@/components/calendar/CalendarNav';
import { TeamFilter } from '@/components/calendar/TeamFilter';
import { CalendarClientWrapper } from '@/components/calendar/CalendarClientWrapper';
import { SettingsButton } from '@/components/favorite/SettingsButton';

interface HomeProps {
  searchParams: Promise<{ year?: string; month?: string; team?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const kst = nowKst();

  const year = Math.min(Math.max(Number(params.year) || kst.year(), 2015), 2030);
  const month = Math.min(Math.max(Number(params.month) || kst.month() + 1, 1), 12);

  const rawTeam = params.team;
  const selectedTeam: TeamCode | null =
    rawTeam !== undefined && rawTeam in KBO_TEAMS ? (rawTeam as TeamCode) : null;

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
      <header className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight">KBO 캘린더</h1>
          <SettingsButton />
        </div>
      </header>

      <CalendarNav year={year} month={month} />
      <TeamFilter selectedTeam={selectedTeam} />
      <Suspense fallback={<div className="flex-1 flex items-center justify-center text-zinc-400">Loading...</div>}>
        <CalendarClientWrapper year={year} month={month} urlTeam={selectedTeam} />
      </Suspense>
    </main>
  );
}
