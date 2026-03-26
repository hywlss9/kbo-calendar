import Database from 'better-sqlite3';
import { CREATE_TABLES_SQL } from './schema';

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
}

function createDb(): Database.Database {
  const db = new Database(process.env.DATABASE_URL ?? './kbo.db');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(CREATE_TABLES_SQL);
  return db;
}

const db: Database.Database = global.__db ?? createDb();

if (process.env.NODE_ENV !== 'production') {
  global.__db = db;
}

export default db;
