import { KBO_TEAMS } from '@/types';
import type { TeamCode } from '@/types';

export const ALL_TEAM_CODES = Object.keys(KBO_TEAMS) as TeamCode[];

export function isValidTeamCode(code: unknown): code is TeamCode {
  return typeof code === 'string' && code in KBO_TEAMS;
}
