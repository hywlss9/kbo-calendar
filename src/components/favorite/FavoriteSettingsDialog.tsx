'use client';

import { useEffect, useRef } from 'react';
import { useFavoriteTeam } from '@/lib/favorite/context';
import { KBO_TEAMS } from '@/types';
import { TeamSelectGrid } from './TeamSelectGrid';
import type { TeamCode } from '@/types';

export function FavoriteSettingsDialog() {
  const {
    isSettingsOpen,
    closeSettings,
    favoriteTeam,
    setFavoriteTeam,
    highlightEnabled,
    setHighlightEnabled,
    openSelect,
  } = useFavoriteTeam();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (isSettingsOpen) {
      el.showModal();
    } else {
      el.close();
    }
  }, [isSettingsOpen]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handleClose = () => closeSettings();
    el.addEventListener('close', handleClose);
    return () => el.removeEventListener('close', handleClose);
  }, [closeSettings]);

  function handleSelect(code: TeamCode) {
    setFavoriteTeam(code);
  }

  function handleReset() {
    setFavoriteTeam(null);
  }

  return (
    <dialog
      ref={dialogRef}
      className="m-auto rounded-2xl p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm
        w-[min(90vw,420px)] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
    >
      <div className="p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">응원팀 설정</h2>
          <button
            onClick={closeSettings}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            aria-label="닫기"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* 현재 응원팀 표시 */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
            현재 응원팀
          </p>
          {favoriteTeam ? (
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: KBO_TEAMS[favoriteTeam].color }}
              />
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {KBO_TEAMS[favoriteTeam].name}
              </span>
            </div>
          ) : (
            <span className="text-sm text-zinc-400">선택된 팀 없음</span>
          )}
        </div>

        {/* 팀 선택 그리드 */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
            팀 변경
          </p>
          <TeamSelectGrid selected={favoriteTeam} onSelect={handleSelect} />
        </div>

        {/* 하이라이팅 토글 */}
        <div className="flex items-center justify-between py-3 border-t border-zinc-200 dark:border-zinc-800">
          <div>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">경기일 하이라이팅</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">캘린더에서 응원팀 경기일 강조</p>
          </div>
          <button
            role="switch"
            aria-checked={highlightEnabled}
            onClick={() => setHighlightEnabled(!highlightEnabled)}
            className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none
              ${highlightEnabled ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform
                ${highlightEnabled ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>

        {/* 초기화 버튼 */}
        {favoriteTeam && (
          <button
            onClick={handleReset}
            className="mt-3 w-full py-2 text-sm text-red-400 hover:text-red-500
              transition-colors"
          >
            응원팀 초기화
          </button>
        )}
      </div>
    </dialog>
  );
}
