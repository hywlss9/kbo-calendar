'use cache';

import { cacheLife, cacheTag } from 'next/cache';
import type { BoxScore, GameDetail, GameSchedule, TeamCode } from '@/types';
import {
  getGamesByDate,
  getGamesByRange,
  getGamesByTeam,
  getGameById,
  getGameDetail,
} from './queries';

export async function getCachedGamesByDate(date: string): Promise<GameSchedule[]> {
  cacheLife('minutes'); // 10분 — 진행중 경기 반영
  cacheTag(`games-date-${date}`);
  return getGamesByDate(date);
}

export async function getCachedGamesByRange(
  from: string,
  to: string,
): Promise<GameSchedule[]> {
  cacheLife('hours'); // 1시간 — 월간 달력 조회
  cacheTag(`games-range-${from}-${to}`);
  return getGamesByRange(from, to);
}

export async function getCachedGamesByTeam(
  team: TeamCode,
  from: string,
  to: string,
): Promise<GameSchedule[]> {
  cacheLife('hours');
  cacheTag(`games-team-${team}-${from}-${to}`);
  return getGamesByTeam(team, from, to);
}

export async function getCachedGameById(gameId: string): Promise<BoxScore | null> {
  cacheLife('minutes');
  cacheTag(`game-${gameId}`);
  return getGameById(gameId);
}

export async function getCachedGameDetail(gameId: string): Promise<GameDetail | null> {
  cacheLife('minutes');
  cacheTag(`game-detail-${gameId}`);
  return getGameDetail(gameId);
}
