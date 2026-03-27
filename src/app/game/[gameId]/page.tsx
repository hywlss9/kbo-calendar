import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getCachedGameDetail } from '@/lib/db/cached-queries';
import { getAllGameIds } from '@/lib/db/queries';
import { validateGameId } from '@/lib/api/validation';
import { KBO_TEAMS } from '@/types';
import type { GameStatus, ScoreBoard } from '@/types';
import { BackButton } from '@/components/game/BackButton';
import { GameHeader } from '@/components/game/GameHeader';
import { GameMeta } from '@/components/game/GameMeta';
import { ScoreBoard as ScoreBoardComponent } from '@/components/game/ScoreBoard';
import { BoxScore } from '@/components/game/BoxScore';
import { HomeRunList } from '@/components/game/HomeRunList';

interface Props {
  params: Promise<{ gameId: string }>;
}

const FALLBACK_MESSAGE: Record<GameStatus, string> = {
  scheduled:   '경기가 아직 시작되지 않았습니다.',
  in_progress: '경기 데이터를 불러오는 중입니다.',
  final:       '경기 데이터를 불러올 수 없습니다.',
  cancelled:   '취소된 경기입니다.',
  postponed:   '연기된 경기입니다.',
  suspended:   '서스펜디드 경기입니다.',
};

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

  const { schedule, scoreBoard, boxScore } = detail;

  // boxScore 내부 scoreBoard가 우선, 없으면 독립 scoreboard_json 사용
  const effectiveScoreBoard: ScoreBoard | null = boxScore?.scoreBoard ?? scoreBoard;
  const hasScoreBoard = effectiveScoreBoard !== null;
  const hasBoxScore = boxScore !== null;

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

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <GameHeader schedule={schedule} />
        <GameMeta schedule={schedule} scoreBoard={effectiveScoreBoard} />

        {!hasScoreBoard && !hasBoxScore ? (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-10 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {FALLBACK_MESSAGE[schedule.status]}
            </p>
          </div>
        ) : (
          <>
            {hasScoreBoard && (
              <ScoreBoardComponent scoreBoard={effectiveScoreBoard!} schedule={schedule} />
            )}
            {hasScoreBoard && effectiveScoreBoard!.homeRuns.length > 0 && (
              <HomeRunList homeRuns={effectiveScoreBoard!.homeRuns} />
            )}
            {hasBoxScore && (
              <BoxScore boxScore={boxScore} schedule={schedule} />
            )}
          </>
        )}
      </div>
    </main>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { gameId } = await params;

  const validation = validateGameId(gameId);
  if (!validation.ok) return { title: '경기 없음 — KBO 캘린더' };

  const detail = await getCachedGameDetail(validation.value);
  if (!detail) return { title: '경기 없음 — KBO 캘린더' };

  const { schedule } = detail;
  const away = KBO_TEAMS[schedule.awayTeam].shortName;
  const home = KBO_TEAMS[schedule.homeTeam].shortName;

  return {
    title: `${away} vs ${home} (${schedule.date}) — KBO 캘린더`,
  };
}
