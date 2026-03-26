'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { TeamCode } from '@/types';
import {
  getFavoriteTeam,
  setFavoriteTeam as saveFavoriteTeam,
  getHighlightEnabled,
  setHighlightEnabled as saveHighlightEnabled,
  isFirstVisit,
  markVisited,
} from './storage';

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

  function setFavoriteTeam(code: TeamCode | null) {
    saveFavoriteTeam(code);
    setFavoriteTeamState(code);
  }

  function setHighlightEnabled(value: boolean) {
    saveHighlightEnabled(value);
    setHighlightEnabledState(value);
  }

  return (
    <FavoriteTeamContext.Provider
      value={{
        favoriteTeam,
        highlightEnabled,
        isSelectOpen,
        isSettingsOpen,
        setFavoriteTeam,
        setHighlightEnabled,
        openSelect: () => setIsSelectOpen(true),
        closeSelect: () => setIsSelectOpen(false),
        openSettings: () => setIsSettingsOpen(true),
        closeSettings: () => setIsSettingsOpen(false),
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
