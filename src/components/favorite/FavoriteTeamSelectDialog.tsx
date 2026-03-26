'use client';

import { useEffect, useRef } from 'react';
import { useFavoriteTeam } from '@/lib/favorite/context';
import { TeamSelectGrid } from './TeamSelectGrid';
import type { TeamCode } from '@/types';

export function FavoriteTeamSelectDialog() {
  const { isSelectOpen, closeSelect, favoriteTeam, setFavoriteTeam } = useFavoriteTeam();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (isSelectOpen) {
      el.showModal();
    } else {
      el.close();
    }
  }, [isSelectOpen]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handleClose = () => closeSelect();
    el.addEventListener('close', handleClose);
    return () => el.removeEventListener('close', handleClose);
  }, [closeSelect]);

  function handleSelect(code: TeamCode) {
    setFavoriteTeam(code);
    closeSelect();
  }

  function handleSkip() {
    closeSelect();
  }

  return (
    <dialog
      ref={dialogRef}
      className="rounded-2xl p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm
        w-[min(90vw,400px)] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
      onCancel={handleSkip}
    >
      <div className="p-6">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
          응원팀을 선택하세요
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
          선택한 팀의 경기일이 캘린더에서 강조됩니다.
        </p>
        <TeamSelectGrid selected={favoriteTeam} onSelect={handleSelect} />
        <button
          onClick={handleSkip}
          className="mt-4 w-full py-2 text-sm text-zinc-400 hover:text-zinc-600
            dark:hover:text-zinc-300 transition-colors"
        >
          나중에 선택하기
        </button>
      </div>
    </dialog>
  );
}
