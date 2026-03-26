import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { KBO_TEAMS } from '@/types';
import type { TeamCode } from '@/types';
import { nowKst } from '@/lib/utils/date';
import { CalendarNav } from '@/components/calendar/CalendarNav';
import { TeamFilter } from '@/components/calendar/TeamFilter';
import CalendarView from '@/components/calendar/CalendarView';
import { SettingsButton } from '@/components/favorite/SettingsButton';
import { isValidTeamCode } from '@/lib/utils/teams';

interface HomeProps {
  searchParams: Promise<{ year?: string; month?: string; team?: string }>;
}

// searchParams + cookies() 모두 dynamic API이므로 Suspense 안에서 호출
async function PageContent({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; team?: string }>;
}) {
  const params = await searchParams;
  const kst = nowKst();

  const year = Math.min(Math.max(Number(params.year) || kst.year(), 2015), 2030);
  const month = Math.min(Math.max(Number(params.month) || kst.month() + 1, 1), 12);

  const rawTeam = params.team;
  const selectedTeam: TeamCode | null =
    rawTeam !== undefined && rawTeam in KBO_TEAMS ? (rawTeam as TeamCode) : null;

  const cookieStore = await cookies();
  const rawFavorite = cookieStore.get('kbo-favorite-team')?.value ?? null;
  const favoriteTeam: TeamCode | null = isValidTeamCode(rawFavorite) ? rawFavorite : null;

  return (
    <>
      <CalendarNav year={year} month={month} />
      <TeamFilter selectedTeam={selectedTeam} />
      <CalendarView year={year} month={month} selectedTeam={selectedTeam} favoriteTeam={favoriteTeam} />
    </>
  );
}

export default function Home({ searchParams }: HomeProps) {
  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
      <header className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight">KBO 캘린더</h1>
          <SettingsButton />
        </div>
      </header>

      <Suspense fallback={<div className="flex-1 flex items-center justify-center text-zinc-400">Loading...</div>}>
        <PageContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
