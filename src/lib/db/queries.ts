import type {
  BoxScore,
  GameDetail,
  GameRow,
  GameSchedule,
  GameStatus,
  ScoreBoard,
  SeasonType,
  TeamCode,
} from '@/types';
import db from './client';
import { Q } from './schema';

// ============================================
// GameRow ↔ 도메인 타입 변환 유틸
// ============================================

function rowToGameSchedule(row: GameRow): GameSchedule {
  return {
    gameId: row.game_id,
    date: row.date,
    time: row.time,
    homeTeam: row.home_team as TeamCode,
    awayTeam: row.away_team as TeamCode,
    stadium: row.stadium,
    status: row.status as GameStatus,
    seasonType: row.season_type as SeasonType,
    homeScore: row.home_score,
    awayScore: row.away_score,
    broadcast: row.broadcast,
  };
}

function rowToBoxScore(row: GameRow): BoxScore | null {
  if (row.boxscore_json === null) return null;
  return JSON.parse(row.boxscore_json) as BoxScore;
}

function rowToScoreBoard(row: GameRow): ScoreBoard | null {
  if (row.scoreboard_json === null) return null;
  return JSON.parse(row.scoreboard_json) as ScoreBoard;
}

// ============================================
// Prepared Statements
// ============================================

const stmtGamesByDate = db.prepare<[string], GameRow>(Q.GAMES_BY_DATE);
const stmtGamesByRange = db.prepare<[string, string], GameRow>(Q.GAMES_BY_RANGE);
const stmtGamesByTeam = db.prepare<[string, string, string, string], GameRow>(Q.GAMES_BY_TEAM);
const stmtGameById = db.prepare<[string], GameRow>(Q.GAME_BY_ID);
const stmtUpsertGame = db.prepare<
  [
    string, string, string, string, string,
    string, string, string,
    number | null, number | null, string | null,
    string | null, string | null,
  ]
>(Q.UPSERT_GAME);
const stmtUpdateScoreboard = db.prepare<[string, string]>(Q.UPDATE_SCOREBOARD);
const stmtUpdateBoxscore = db.prepare<[string, string]>(Q.UPDATE_BOXSCORE);

// ============================================
// 쿼리 함수
// ============================================

export function getAllGameIds(): string[] {
  return db.prepare<[], { game_id: string }>('SELECT game_id FROM games ORDER BY date').all().map((r) => r.game_id);
}

export function getGamesByDate(date: string): GameSchedule[] {
  return stmtGamesByDate.all(date).map(rowToGameSchedule);
}

export function getGamesByRange(from: string, to: string): GameSchedule[] {
  return stmtGamesByRange.all(from, to).map(rowToGameSchedule);
}

export function getGamesByTeam(
  team: TeamCode,
  from: string,
  to: string,
): GameSchedule[] {
  return stmtGamesByTeam.all(team, team, from, to).map(rowToGameSchedule);
}

export function getGameById(gameId: string): BoxScore | null {
  const row = stmtGameById.get(gameId);
  if (!row) return null;
  return rowToBoxScore(row);
}

export function getGameDetail(gameId: string): GameDetail | null {
  const row = stmtGameById.get(gameId);
  if (!row) return null;
  return {
    schedule: rowToGameSchedule(row),
    scoreBoard: rowToScoreBoard(row),
    boxScore: rowToBoxScore(row),
  };
}

export function getGameDetailsByRange(from: string, to: string): GameDetail[] {
  return stmtGamesByRange.all(from, to)
    .filter((row) => row.status === 'final')
    .map((row) => ({
      schedule: rowToGameSchedule(row),
      scoreBoard: rowToScoreBoard(row),
      boxScore: rowToBoxScore(row),
    }));
}

export function upsertGame(game: GameSchedule): void {
  stmtUpsertGame.run(
    game.gameId,
    game.date,
    game.time,
    game.homeTeam,
    game.awayTeam,
    game.stadium,
    game.status,
    game.seasonType,
    game.homeScore,
    game.awayScore,
    game.broadcast,
    null,
    null,
  );
}

export function upsertScoreBoard(gameId: string, score: ScoreBoard): void {
  stmtUpdateScoreboard.run(JSON.stringify(score), gameId);
}

export function upsertBoxScore(gameId: string, box: BoxScore): void {
  stmtUpdateBoxscore.run(JSON.stringify(box), gameId);
}

// ============================================
// 동기화 파이프라인 전용 쿼리
// ============================================

const stmtGamesNeedingScores = db.prepare<[string], GameRow>(
  Q.GAMES_NEEDING_SCORES,
);
const stmtGamesNeedingBoxScores = db.prepare<[string], GameRow>(
  Q.GAMES_NEEDING_BOXSCORES,
);
const stmtInsertSyncLog = db.prepare<[string]>(Q.INSERT_SYNC_LOG);
const stmtUpdateSyncLog = db.prepare<[number, string, string, number]>(
  Q.UPDATE_SYNC_LOG,
);

export function getGamesNeedingScores(date: string): GameSchedule[] {
  return stmtGamesNeedingScores.all(date).map(rowToGameSchedule);
}

export function getGamesNeedingBoxScores(date: string): GameSchedule[] {
  return stmtGamesNeedingBoxScores.all(date).map(rowToGameSchedule);
}

export function insertSyncLog(syncType: string): number {
  const result = stmtInsertSyncLog.run(syncType);
  return Number(result.lastInsertRowid);
}

export function updateSyncLog(
  id: number,
  gamesUpdated: number,
  errors: Array<{ gameId?: string; message: string }>,
  status: 'success' | 'error',
): void {
  stmtUpdateSyncLog.run(gamesUpdated, JSON.stringify(errors), status, id);
}
