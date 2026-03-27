import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getCachedGameDetail } from '@/lib/db/cached-queries';
import { getAllGameIds } from '@/lib/db/queries';
import { validateGameId } from '@/lib/api/validation';
import { KBO_TEAMS } from '@/types';
import { BackButton } from '@/components/game/BackButton';
import { GameDetailClient } from '@/components/game/GameDetailClient';

interface Props {
  params: Promise<{ gameId: string }>;
}

export async function generateStaticParams() {
  const ids = getAllGameIds();
  return ids.map((gameId) => ({ gameId }));
}

export default async function GameDetailPage({ params }: Props) {
  const { gameId } = await params;

  const validation = validateGameId(gameId);
  if (!validation.ok) notFound();

  const detail = await getCachedGameDetail(validation.value);
  if (!detail) notFound();

  const { schedule } = detail;

  return (
    <main
      className="min-h-screen bg-white dark:bg-zinc-950"
      style={{ viewTransitionName: 'game-detail' }}
    >
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm
        border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center gap-2">
        <Suspense fallback={<div className="w-9 h-9" />}>
          <BackButton />
        </Suspense>
        <h1 className="text-base font-bold text-zinc-800 dark:text-zinc-100 flex-1">경기 상세</h1>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <GameDetailClient gameId={gameId} initialSchedule={schedule} />
      </div>
    </main>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { gameId } = await params;

  const validation = validateGameId(gameId);
  if (!validation.ok) return {
    title: '경기 없음',
    openGraph: { title: '경기 없음 — KBO Calendar' },
  };

  const detail = await getCachedGameDetail(validation.value);
  if (!detail) return {
    title: '경기 없음',
    openGraph: { title: '경기 없음 — KBO Calendar' },
  };

  const { schedule } = detail;
  const away = KBO_TEAMS[schedule.awayTeam].shortName;
  const home = KBO_TEAMS[schedule.homeTeam].shortName;

  return {
    title: `${away} vs ${home} (${schedule.date})`,
    openGraph: {
      title: `${away} vs ${home} (${schedule.date}) — KBO Calendar`,
      description: `${away} VS ${home} - ${schedule.date}`,
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title: `${away} vs ${home} (${schedule.date}) — KBO Calendar`,
      description: `${away} VS ${home} - ${schedule.date}`,
    },
  };
}
