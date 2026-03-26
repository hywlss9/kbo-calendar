import type { ScoreBoard as ScoreBoardType, GameSchedule } from '@/types';
import { KBO_TEAMS } from '@/types';

interface ScoreBoardProps {
  scoreBoard: ScoreBoardType;
  schedule: GameSchedule;
}

export function ScoreBoard({ scoreBoard, schedule }: ScoreBoardProps) {
  const { innings, away, home } = scoreBoard;
  const awayInfo = KBO_TEAMS[schedule.awayTeam];
  const homeInfo = KBO_TEAMS[schedule.homeTeam];

  const maxInning = Math.max(
    9,
    innings.length > 0 ? innings[innings.length - 1].inning : 9,
  );
  const inningNums = Array.from({ length: maxInning }, (_, i) => i + 1);
  const inningMap = new Map(innings.map((inn) => [inn.inning, inn]));

  const th = 'px-2 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 text-center bg-zinc-50 dark:bg-zinc-900';
  const td = 'px-2 py-1.5 text-xs text-center font-mono text-zinc-700 dark:text-zinc-300';
  const borderL = 'border-l border-zinc-200 dark:border-zinc-700';

  return (
    <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <h2 className="px-4 py-2.5 text-sm font-semibold border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
        이닝별 스코어
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className={`${th} text-left pl-4 w-16`}>팀</th>
              {inningNums.map((n) => (
                <th key={n} className={th}>{n}</th>
              ))}
              {(['R', 'H', 'E', 'B'] as const).map((label) => (
                <th key={label} className={`${th} ${borderL}`}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 원정팀 */}
            <tr className="border-b border-zinc-100 dark:border-zinc-800/60">
              <td className={`${td} text-left pl-4 font-bold font-sans`} style={{ color: awayInfo.color }}>
                {awayInfo.shortName}
              </td>
              {inningNums.map((n) => {
                const inn = inningMap.get(n);
                return <td key={n} className={td}>{inn?.away ?? '-'}</td>;
              })}
              <td className={`${td} ${borderL} font-bold text-blue-600 dark:text-blue-400`}>{away.runs}</td>
              <td className={`${td} ${borderL}`}>{away.hits}</td>
              <td className={`${td} ${borderL}`}>{away.errors}</td>
              <td className={`${td} ${borderL}`}>{away.baseOnBalls}</td>
            </tr>
            {/* 홈팀 */}
            <tr>
              <td className={`${td} text-left pl-4 font-bold font-sans`} style={{ color: homeInfo.color }}>
                {homeInfo.shortName}
              </td>
              {inningNums.map((n) => {
                const inn = inningMap.get(n);
                return <td key={n} className={td}>{inn?.home ?? '-'}</td>;
              })}
              <td className={`${td} ${borderL} font-bold text-blue-600 dark:text-blue-400`}>{home.runs}</td>
              <td className={`${td} ${borderL}`}>{home.hits}</td>
              <td className={`${td} ${borderL}`}>{home.errors}</td>
              <td className={`${td} ${borderL}`}>{home.baseOnBalls}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
