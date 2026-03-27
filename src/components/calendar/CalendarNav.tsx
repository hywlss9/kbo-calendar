'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { prevMonth, nextMonth, nowKst } from '@/lib/utils/date';

interface CalendarNavProps {
  year: number;
  month: number;
}

const MONTH_NAMES = [
  '', '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];

export function CalendarNav({ year, month }: CalendarNavProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

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
    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
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
  );
}
