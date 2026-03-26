'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

export function BackButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleBack() {
    const params = searchParams.toString();
    const target = params ? `/?${params}` : '/';

    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      document.startViewTransition(() => {
        startTransition(() => {
          router.push(target);
        });
      });
    } else {
      startTransition(() => router.push(target));
    }
  }

  return (
    <button
      onClick={handleBack}
      disabled={isPending}
      aria-label="캘린더로 돌아가기"
      className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800
        transition-colors disabled:opacity-50 disabled:cursor-wait"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
}
