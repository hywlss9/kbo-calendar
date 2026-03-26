import type { BoxScore as BoxScoreType, BatterRecord, PitcherRecord, GameSchedule } from '@/types';
import { KBO_TEAMS } from '@/types';

interface BoxScoreProps {
  boxScore: BoxScoreType;
  schedule: GameSchedule;
}

const RESULT_COLOR: Record<string, string> = {
  '승': 'text-blue-600 dark:text-blue-400',
  '패': 'text-red-600 dark:text-red-400',
  '홀': 'text-orange-600 dark:text-orange-400',
  '세': 'text-green-600 dark:text-green-400',
};

function BatterTable({ batters, teamCode }: { batters: BatterRecord[]; teamCode: string }) {
  const th = 'px-2 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 text-center whitespace-nowrap bg-zinc-50 dark:bg-zinc-900';
  const td = 'px-2 py-1.5 text-xs text-center text-zinc-700 dark:text-zinc-300 whitespace-nowrap';

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            {['순', '포지션', '선수', '타수', '득점', '안타', '타점', '2루타', '3루타', '홈런', '볼넷', '삼진', '타율'].map((h) => (
              <th key={h} className={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {batters.map((b, idx) => (
            <tr
              key={`${teamCode}-b-${idx}`}
              className="border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
            >
              <td className={td}>{b.order || ''}</td>
              <td className={td}>{b.position}</td>
              <td className={`${td} text-left font-medium text-zinc-800 dark:text-zinc-200`}>{b.name}</td>
              <td className={td}>{b.atBats}</td>
              <td className={td}>{b.runs}</td>
              <td className={td}>{b.hits}</td>
              <td className={td}>{b.rbi}</td>
              <td className={td}>{b.doubles}</td>
              <td className={td}>{b.triples}</td>
              <td className={`${td} font-semibold ${b.homeRuns > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                {b.homeRuns}
              </td>
              <td className={td}>{b.baseOnBalls}</td>
              <td className={td}>{b.strikeOuts}</td>
              <td className={`${td} font-mono`}>{b.average ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PitcherTable({ pitchers, teamCode }: { pitchers: PitcherRecord[]; teamCode: string }) {
  const th = 'px-2 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 text-center whitespace-nowrap bg-zinc-50 dark:bg-zinc-900';
  const td = 'px-2 py-1.5 text-xs text-center text-zinc-700 dark:text-zinc-300 whitespace-nowrap';

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            {['선수', '결과', '이닝', '피안타', '실점', '자책', '볼넷', '삼진', '투구수', 'ERA'].map((h) => (
              <th key={h} className={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pitchers.map((p, idx) => (
            <tr
              key={`${teamCode}-p-${idx}`}
              className="border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
            >
              <td className={`${td} text-left font-medium text-zinc-800 dark:text-zinc-200`}>{p.name}</td>
              <td className={`${td} font-bold ${p.result ? (RESULT_COLOR[p.result] ?? '') : ''}`}>
                {p.result ?? ''}
              </td>
              <td className={`${td} font-mono`}>{p.inningsPitched}</td>
              <td className={td}>{p.hits}</td>
              <td className={td}>{p.runs}</td>
              <td className={td}>{p.earnedRuns}</td>
              <td className={td}>{p.baseOnBalls}</td>
              <td className={td}>{p.strikeOuts}</td>
              <td className={td}>{p.pitchCount ?? '-'}</td>
              <td className={`${td} font-mono`}>{p.era ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BoxScore({ boxScore, schedule }: BoxScoreProps) {
  const { homeBatters, awayBatters, homePitchers, awayPitchers } = boxScore;
  const homeInfo = KBO_TEAMS[schedule.homeTeam];
  const awayInfo = KBO_TEAMS[schedule.awayTeam];

  function TeamSection({
    label,
    teamInfo,
    batters,
    pitchers,
  }: {
    label: string;
    teamInfo: typeof homeInfo;
    batters: BatterRecord[];
    pitchers: PitcherRecord[];
  }) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: teamInfo.color }} />
          {teamInfo.name}
          <span className="text-zinc-400 dark:text-zinc-500 text-xs font-normal">({label})</span>
        </h3>
        {batters.length > 0 && (
          <div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-1.5">타자</p>
            <BatterTable batters={batters} teamCode={teamInfo.code} />
          </div>
        )}
        {pitchers.length > 0 && (
          <div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-1.5">투수</p>
            <PitcherTable pitchers={pitchers} teamCode={teamInfo.code} />
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <h2 className="px-4 py-2.5 text-sm font-semibold border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
        박스스코어
      </h2>
      <div className="p-4 space-y-8">
        <TeamSection label="원정" teamInfo={awayInfo} batters={awayBatters} pitchers={awayPitchers} />
        <TeamSection label="홈" teamInfo={homeInfo} batters={homeBatters} pitchers={homePitchers} />
      </div>
    </section>
  );
}
