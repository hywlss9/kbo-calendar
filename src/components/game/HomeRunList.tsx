interface HomeRunListProps {
  homeRuns: string[];
}

export function HomeRunList({ homeRuns }: HomeRunListProps) {
  if (homeRuns.length === 0) return null;

  return (
    <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
      <h2 className="text-sm font-semibold mb-3 text-zinc-800 dark:text-zinc-200">홈런</h2>
      <ul className="space-y-1.5">
        {homeRuns.map((hr, idx) => (
          <li key={idx} className="text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            {hr}
          </li>
        ))}
      </ul>
    </section>
  );
}
