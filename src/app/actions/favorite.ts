'use server';

import { cookies } from 'next/headers';
import { isValidTeamCode } from '@/lib/utils/teams';
import type { TeamCode } from '@/types';

const COOKIE_NAME = 'kbo-favorite-team';
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setFavoriteTeamAction(code: TeamCode | null): Promise<void> {
  const cookieStore = await cookies();
  if (code === null) {
    cookieStore.delete(COOKIE_NAME);
  } else {
    cookieStore.set(COOKIE_NAME, code, {
      maxAge: ONE_YEAR,
      path: '/',
      sameSite: 'lax',
    });
  }
}

export async function getFavoriteTeamFromCookie(): Promise<TeamCode | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value ?? null;
  return isValidTeamCode(raw) ? raw : null;
}
