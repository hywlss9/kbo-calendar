import type { BoxScore, GameDetail, GameSchedule, TeamCode } from '@/types';
import {
  getGamesByDate,
  getGamesByRange,
  getGamesByTeam,
  getGameById,
  getGameDetail,
} from './queries';

export async function getCachedGamesByDate(date: string): Promise<GameSchedule[]> {
  return getGamesByDate(date);
}

export async function getCachedGamesByRange(
  from: string,
  to: string,
): Promise<GameSchedule[]> {
  return getGamesByRange(from, to);
}

export async function getCachedGamesByTeam(
  team: TeamCode,
  from: string,
  to: string,
): Promise<GameSchedule[]> {
  return getGamesByTeam(team, from, to);
}

export async function getCachedGameById(gameId: string): Promise<BoxScore | null> {
  return getGameById(gameId);
}

export async function getCachedGameDetail(gameId: string): Promise<GameDetail | null> {
  return getGameDetail(gameId);
}
