'use client';

import { useEffect, useState } from 'react';
import type { GameDetail, GameSchedule, GameStatus, ScoreBoard } from '@/types';
import { GameHeader } from './GameHeader';
import { GameMeta } from './GameMeta';
import { ScoreBoard as ScoreBoardComponent } from './ScoreBoard';
import { BoxScore } from './BoxScore';
import { HomeRunList } from './HomeRunList';

const FALLBACK_MESSAGE: Record<GameStatus, string> = {
  scheduled:   '경기가 아직 시작되지 않았습니다.',
  in_progress: '경기 데이터를 불러오는 중입니다.',
  final:       '경기 데이터를 불러올 수 없습니다.',
  cancelled:   '취소된 경기입니다.',
  postponed:   '연기된 경기입니다.',
  suspended:   '서스펜디드 경기입니다.',
};

interface Props {
  gameId: string;
  initialSchedule: GameSchedule;
}

export function GameDetailClient({ gameId, initialSchedule }: Props) {
  const [detail, setDetail] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/project/kbo-calendar/data/games/detail/${gameId}.json`)
      .then((res) => {
        if (!res.ok) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        return res.json() as Promise<GameDetail>;
      })
      .then((data) => {
        if (data) {
          setDetail(data);
          setLoading(false);
        }
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [gameId]);

  const schedule = detail?.schedule ?? initialSchedule;
  const effectiveScoreBoard: ScoreBoard | null =
    detail?.boxScore?.scoreBoard ?? detail?.scoreBoard ?? null;
  const hasScoreBoard = effectiveScoreBoard !== null;
  const hasBoxScore = detail?.boxScore != null;

  return (
    <div className="space-y-4">
      <GameHeader schedule={schedule} />
      <GameMeta schedule={schedule} scoreBoard={effectiveScoreBoard} />

      {loading ? (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-10 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">불러오는 중...</p>
        </div>
      ) : notFound || (!hasScoreBoard && !hasBoxScore) ? (
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
          {hasBoxScore && <BoxScore boxScore={detail!.boxScore!} schedule={schedule} />}
        </>
      )}
    </div>
  );
}
