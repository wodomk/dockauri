import Database from "better-sqlite3";

export const PRINTERS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS printers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mainboard_id TEXT NOT NULL UNIQUE,
    name TEXT,
    last_known_ip TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('discovered', 'manual')),
    created_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
  );
`;

export const PRINT_HISTORY_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS print_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    printer_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'cancelled')),
    progress_snapshot TEXT,
    FOREIGN KEY (printer_id) REFERENCES printers (id) ON DELETE CASCADE
  );
`;

export const SETTINGS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

export function initializeSchema(database: Database.Database): void {
  database.pragma("foreign_keys = ON");
  database.pragma("journal_mode = WAL");
  database.exec([
    PRINTERS_TABLE_SQL,
    PRINT_HISTORY_TABLE_SQL,
    SETTINGS_TABLE_SQL
  ].join("\n"));
}
