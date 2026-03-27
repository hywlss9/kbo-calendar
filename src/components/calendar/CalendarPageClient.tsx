'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { KBO_TEAMS } from '@/types';
import type { GameSchedule, TeamCode } from '@/types';
import { nowKst } from '@/lib/utils/date';
import { useFavoriteTeam } from '@/lib/favorite/context';
import { CalendarNav } from './CalendarNav';
import { TeamFilter } from './TeamFilter';
import CalendarView from './CalendarView';

export function CalendarPageClient() {
  const searchParams = useSearchParams();
  const { favoriteTeam } = useFavoriteTeam();

  const kst = nowKst();
  const year  = Math.min(Math.max(Number(searchParams.get('year'))  || kst.year(),       2015), 2030);
  const month = Math.min(Math.max(Number(searchParams.get('month')) || kst.month() + 1,  1),    12);

  const rawTeam = searchParams.get('team');
  const selectedTeam: TeamCode | null =
    rawTeam !== null && rawTeam in KBO_TEAMS ? (rawTeam as TeamCode) : null;

  const [games, setGames] = useState<GameSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);

    const pad = (n: number) => String(n).padStart(2, '0');
    const url = `/project/kbo-calendar/data/games/${year}-${pad(month)}.json`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ games: GameSchedule[] }>;
      })
      .then((data) => {
        setGames(data.games ?? []);
        setLoading(false);
      })
      .catch(() => {
        setGames([]);
        setError(true);
        setLoading(false);
      });
  }, [year, month]);

  const filteredGames = selectedTeam
    ? games.filter((g) => g.homeTeam === selectedTeam || g.awayTeam === selectedTeam)
    : games;

  return (
    <>
      <CalendarNav year={year} month={month} />
      <TeamFilter selectedTeam={selectedTeam} />

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">
          경기 데이터 불러오는 중...
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">
          데이터를 불러올 수 없습니다.
        </div>
      ) : (
        <CalendarView
          year={year}
          month={month}
          games={filteredGames}
          favoriteTeam={favoriteTeam}
        />
      )}
    </>
  );
}
