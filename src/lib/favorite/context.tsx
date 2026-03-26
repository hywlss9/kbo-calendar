'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { TeamCode } from '@/types';
import {
  getFavoriteTeam,
  setFavoriteTeam as saveFavoriteTeam,
  getHighlightEnabled,
  setHighlightEnabled as saveHighlightEnabled,
  isFirstVisit,
  markVisited,
} from './storage';
import { setFavoriteTeamAction } from '@/app/actions/favorite';

interface FavoriteTeamState {
  favoriteTeam: TeamCode | null;
  highlightEnabled: boolean;
  isSelectOpen: boolean;
  isSettingsOpen: boolean;
  setFavoriteTeam: (code: TeamCode | null) => void;
  setHighlightEnabled: (value: boolean) => void;
  openSelect: () => void;
  closeSelect: () => void;
  openSettings: () => void;
  closeSettings: () => void;
}

const FavoriteTeamContext = createContext<FavoriteTeamState | null>(null);

export function FavoriteTeamProvider({ children }: { children: React.ReactNode }) {
  const [favoriteTeam, setFavoriteTeamState] = useState<TeamCode | null>(null);
  const [highlightEnabled, setHighlightEnabledState] = useState(true);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // SSR-safe: localStorage는 useEffect에서만 읽기
  useEffect(() => {
    setFavoriteTeamState(getFavoriteTeam());
    setHighlightEnabledState(getHighlightEnabled());

    if (isFirstVisit()) {
      markVisited();
      setIsSelectOpen(true);
    }
  }, []);

  const setFavoriteTeam = useCallback((code: TeamCode | null) => {
    saveFavoriteTeam(code);
    setFavoriteTeamState(code);
    setFavoriteTeamAction(code).catch(() => {});
  }, []);

  const setHighlightEnabled = useCallback((value: boolean) => {
    saveHighlightEnabled(value);
    setHighlightEnabledState(value);
  }, []);

  const openSelect   = useCallback(() => setIsSelectOpen(true), []);
  const closeSelect  = useCallback(() => setIsSelectOpen(false), []);
  const openSettings  = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

  return (
    <FavoriteTeamContext.Provider
      value={{
        favoriteTeam,
        highlightEnabled,
        isSelectOpen,
        isSettingsOpen,
        setFavoriteTeam,
        setHighlightEnabled,
        openSelect,
        closeSelect,
        openSettings,
        closeSettings,
      }}
    >
      {children}
    </FavoriteTeamContext.Provider>
  );
}

export function useFavoriteTeam(): FavoriteTeamState {
  const ctx = useContext(FavoriteTeamContext);
  if (!ctx) throw new Error('useFavoriteTeam must be used within FavoriteTeamProvider');
  return ctx;
}
