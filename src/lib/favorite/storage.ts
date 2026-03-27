import { isValidTeamCode } from '@/lib/utils/teams';
import type { TeamCode } from '@/types';

const KEYS = {
  favoriteTeam: 'kbo-favorite-team',
  highlightEnabled: 'kbo-highlight-enabled',
  showOnlyFavorite: 'kbo-show-only-favorite',
  showOnlyWins: 'kbo-show-only-wins',
  visited: 'kbo-visited',
} as const;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function getFavoriteTeam(): TeamCode | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(KEYS.favoriteTeam);
  return isValidTeamCode(raw) ? raw : null;
}

export function setFavoriteTeam(code: TeamCode | null): void {
  if (!isBrowser()) return;
  if (code === null) {
    localStorage.removeItem(KEYS.favoriteTeam);
  } else {
    localStorage.setItem(KEYS.favoriteTeam, code);
  }
}

export function getHighlightEnabled(): boolean {
  if (!isBrowser()) return true;
  const raw = localStorage.getItem(KEYS.highlightEnabled);
  return raw !== 'false';
}

export function setHighlightEnabled(value: boolean): void {
  if (!isBrowser()) return;
  localStorage.setItem(KEYS.highlightEnabled, value ? 'true' : 'false');
}

export function getShowOnlyFavorite(): boolean {
  if (!isBrowser()) return false;
  return localStorage.getItem(KEYS.showOnlyFavorite) === 'true';
}

export function setShowOnlyFavorite(value: boolean): void {
  if (!isBrowser()) return;
  localStorage.setItem(KEYS.showOnlyFavorite, value ? 'true' : 'false');
}

export function getShowOnlyWins(): boolean {
  if (!isBrowser()) return false;
  return localStorage.getItem(KEYS.showOnlyWins) === 'true';
}

export function setShowOnlyWins(value: boolean): void {
  if (!isBrowser()) return;
  localStorage.setItem(KEYS.showOnlyWins, value ? 'true' : 'false');
}

export function isFirstVisit(): boolean {
  if (!isBrowser()) return false;
  return localStorage.getItem(KEYS.visited) === null;
}

export function markVisited(): void {
  if (!isBrowser()) return;
  localStorage.setItem(KEYS.visited, '1');
}
