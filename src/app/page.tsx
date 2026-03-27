import { Suspense } from 'react';
import { SettingsButton } from '@/components/favorite/SettingsButton';
import { CalendarPageClient } from '@/components/calendar/CalendarPageClient';

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
      <header className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight">KBO 캘린더</h1>
          <SettingsButton />
        </div>
      </header>

      <Suspense fallback={<div className="flex-1 flex items-center justify-center text-zinc-400">Loading...</div>}>
        <CalendarPageClient />
      </Suspense>
    </main>
  );
}
