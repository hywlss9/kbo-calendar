'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { TeamCode } from '@/types';
import {
  getFavoriteTeam,
  setFavoriteTeam as saveFavoriteTeam,
  getHighlightEnabled,
  setHighlightEnabled as saveHighlightEnabled,
  getShowOnlyFavorite,
  setShowOnlyFavorite as saveShowOnlyFavorite,
  getShowOnlyWins,
  setShowOnlyWins as saveShowOnlyWins,
  isFirstVisit,
  markVisited,
} from './storage';

interface FavoriteTeamState {
  favoriteTeam: TeamCode | null;
  highlightEnabled: boolean;
  showOnlyFavorite: boolean;
  showOnlyWins: boolean;
  isSelectOpen: boolean;
  isSettingsOpen: boolean;
  setFavoriteTeam: (code: TeamCode | null) => void;
  setHighlightEnabled: (value: boolean) => void;
  setShowOnlyFavorite: (value: boolean) => void;
  setShowOnlyWins: (value: boolean) => void;
  openSelect: () => void;
  closeSelect: () => void;
  openSettings: () => void;
  closeSettings: () => void;
}

const FavoriteTeamContext = createContext<FavoriteTeamState | null>(null);

export function FavoriteTeamProvider({ children }: { children: React.ReactNode }) {
  const [favoriteTeam, setFavoriteTeamState] = useState<TeamCode | null>(null);
  const [highlightEnabled, setHighlightEnabledState] = useState(true);
  const [showOnlyFavorite, setShowOnlyFavoriteState] = useState(false);
  const [showOnlyWins, setShowOnlyWinsState] = useState(false);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // SSR-safe: localStorage는 useEffect에서만 읽기
  useEffect(() => {
    setFavoriteTeamState(getFavoriteTeam());
    setHighlightEnabledState(getHighlightEnabled());
    setShowOnlyFavoriteState(getShowOnlyFavorite());
    setShowOnlyWinsState(getShowOnlyWins());

    if (isFirstVisit()) {
      markVisited();
      setIsSelectOpen(true);
    }
  }, []);

  const setFavoriteTeam = useCallback((code: TeamCode | null) => {
    saveFavoriteTeam(code);
    setFavoriteTeamState(code);
  }, []);

  const setHighlightEnabled = useCallback((value: boolean) => {
    saveHighlightEnabled(value);
    setHighlightEnabledState(value);
  }, []);

  const setShowOnlyFavorite = useCallback((value: boolean) => {
    saveShowOnlyFavorite(value);
    setShowOnlyFavoriteState(value);
  }, []);

  const setShowOnlyWins = useCallback((value: boolean) => {
    saveShowOnlyWins(value);
    setShowOnlyWinsState(value);
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
        showOnlyFavorite,
        showOnlyWins,
        isSelectOpen,
        isSettingsOpen,
        setFavoriteTeam,
        setHighlightEnabled,
        setShowOnlyFavorite,
        setShowOnlyWins,
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
