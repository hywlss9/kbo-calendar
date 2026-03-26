'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useState } from 'react';
import { prevMonth, nextMonth, nowKst } from '@/lib/utils/date';
import { triggerSyncSchedule } from '@/app/actions/sync';

interface CalendarNavProps {
  year: number;
  month: number;
}

type SyncStatus = 'idle' | 'syncing' | 'done' | 'error';

const MONTH_NAMES = [
  '', '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];

export function CalendarNav({ year, month }: CalendarNavProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');

  async function handleSync() {
    setSyncStatus('syncing');
    setSyncMessage('');
    try {
      const result = await triggerSyncSchedule(year, month);
      if (result.errors.length > 0 && result.gamesUpdated === 0) {
        setSyncStatus('error');
        setSyncMessage('동기화 실패');
      } else {
        setSyncStatus('done');
        setSyncMessage(`${result.gamesUpdated}경기 업데이트`);
        router.refresh();
      }
    } catch {
      setSyncStatus('error');
      setSyncMessage('동기화 오류');
    } finally {
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }

  function navigate(targetYear: number, targetMonth: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('year', String(targetYear));
    params.set('month', String(targetMonth));

    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      document.startViewTransition(() => {
        startTransition(() => {
          router.push(`/?${params.toString()}`);
        });
      });
    } else {
      startTransition(() => {
        router.push(`/?${params.toString()}`);
      });
    }
  }

  function handleToday() {
    const kst = nowKst();
    navigate(kst.year(), kst.month() + 1);
  }

  const prev = prevMonth(year, month);
  const next = nextMonth(year, month);

  const buttonClass = `p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800
    transition-colors disabled:opacity-50 disabled:cursor-wait`;

  return (
    <div className="relative flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
      <button
        onClick={() => navigate(prev.year, prev.month)}
        disabled={isPending}
        aria-label="이전 달"
        className={buttonClass}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="flex items-center gap-3">
        <h2 className="text-base font-bold">
          {year}년 {MONTH_NAMES[month]}
        </h2>
        <button
          onClick={handleToday}
          disabled={isPending}
          className="px-2.5 py-1 text-xs font-medium rounded-full border border-zinc-300
            dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800
            transition-colors disabled:opacity-50 disabled:cursor-wait"
        >
          오늘
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={handleSync}
          disabled={isPending || syncStatus === 'syncing'}
          aria-label="데이터 동기화"
          title={syncMessage || '이 달 경기 데이터 동기화'}
          className={`${buttonClass} relative`}
        >
          <svg
            className={`w-5 h-5 ${syncStatus === 'syncing' ? 'animate-spin' : ''} ${syncStatus === 'done' ? 'text-green-500' : ''} ${syncStatus === 'error' ? 'text-red-500' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {syncStatus === 'done' ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            ) : syncStatus === 'error' ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            )}
          </svg>
        </button>

        <button
          onClick={() => navigate(next.year, next.month)}
          disabled={isPending}
          aria-label="다음 달"
          className={buttonClass}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {syncMessage && (
        <div className={`absolute top-16 right-4 text-xs px-2 py-1 rounded shadow
          ${syncStatus === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'}`}
        >
          {syncMessage}
        </div>
      )}
    </div>
  );
}
