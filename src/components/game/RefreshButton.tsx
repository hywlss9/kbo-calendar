'use client';

import { useState, useTransition } from 'react';
import { triggerSyncGame } from '@/app/actions/sync';

interface Props {
  gameId: string;
}

export function RefreshButton({ gameId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function handleRefresh() {
    setMessage(null);
    startTransition(async () => {
      const result = await triggerSyncGame(gameId);
      if (result.errors.length > 0) {
        setMessage({ ok: false, text: '데이터 수집 실패' });
      } else if (result.gamesUpdated > 0) {
        setMessage({ ok: true, text: '업데이트 완료' });
      } else {
        setMessage({ ok: false, text: '수집할 데이터 없음' });
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {message && (
        <span
          className={`text-xs ${message.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
        >
          {message.text}
        </span>
      )}
      <button
        onClick={handleRefresh}
        disabled={isPending}
        aria-label="경기 데이터 새로고침"
        className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800
          transition-colors disabled:opacity-50 disabled:cursor-wait"
      >
        <svg
          className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>
  );
}
