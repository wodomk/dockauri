import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

import { initializeSchema } from "./schema";

export interface PrinterRecord {
  id: number;
  mainboard_id: string;
  name: string | null;
  last_known_ip: string;
  source: "discovered" | "manual";
  created_at: string;
  last_seen_at: string;
}

export interface PrinterUpsertPayload {
  mainboardId: string;
  ipAddress: string;
  source: "discovered" | "manual";
  discoveredName?: string;
}

export interface PrintHistoryRecord {
  id: number;
  printer_id: number;
  file_name: string;
  started_at: string;
  finished_at: string | null;
  status: "completed" | "failed" | "cancelled";
  progress_snapshot: string | null;
}

export interface PrintHistoryInsertPayload {
  printerId: number;
  fileName: string;
  startedAt: string;
  finishedAt: string;
  status: "completed" | "failed" | "cancelled";
  progressSnapshot: string;
}

const DEFAULT_DATABASE_PATH = "/data/dockauri.sqlite";

export function resolveDatabasePath(): string {
  return process.env.DOCKAURI_DB_PATH ?? DEFAULT_DATABASE_PATH;
}

export function createDatabaseConnection(): Database.Database {
  const databasePath = resolveDatabasePath();
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const database = new Database(databasePath);
  initializeSchema(database);

  return database;
}

export function listPrinters(database: Database.Database): PrinterRecord[] {
  const statement = database.prepare<[], PrinterRecord>("SELECT * FROM printers ORDER BY id ASC");
  return statement.all();
}

export function upsertPrinter(database: Database.Database, payload: PrinterUpsertPayload): PrinterRecord {
  const now = new Date().toISOString();
  const statement = database.prepare(
    `
      INSERT INTO printers (
        mainboard_id,
        name,
        last_known_ip,
        source,
        created_at,
        last_seen_at
      )
      VALUES (
        @mainboard_id,
        @name,
        @last_known_ip,
        @source,
        @created_at,
        @last_seen_at
      )
      ON CONFLICT(mainboard_id) DO UPDATE SET
        name = COALESCE(excluded.name, printers.name),
        last_known_ip = excluded.last_known_ip,
        source = excluded.source,
        last_seen_at = excluded.last_seen_at
    `
  );

  statement.run({
    mainboard_id: payload.mainboardId,
    name: payload.discoveredName ?? null,
    last_known_ip: payload.ipAddress,
    source: payload.source,
    created_at: now,
    last_seen_at: now
  });

  return database
    .prepare<[string], PrinterRecord>("SELECT * FROM printers WHERE mainboard_id = ?")
    .get(payload.mainboardId) as PrinterRecord;
}

export function getPrinterCount(database: Database.Database): number {
  const result = database.prepare<[], { total: number }>("SELECT COUNT(*) AS total FROM printers").get();
  return result?.total ?? 0;
}

export function getPrinterById(database: Database.Database, printerId: number): PrinterRecord | null {
  return database.prepare<[number], PrinterRecord>("SELECT * FROM printers WHERE id = ?").get(printerId) ?? null;
}

export function getPrinterByMainboardId(database: Database.Database, mainboardId: string): PrinterRecord | null {
  return database.prepare<[string], PrinterRecord>("SELECT * FROM printers WHERE mainboard_id = ?").get(mainboardId) ?? null;
}

export function deletePrinterById(database: Database.Database, printerId: number): boolean {
  const result = database.prepare<[number]>("DELETE FROM printers WHERE id = ?").run(printerId);
  return result.changes > 0;
}

export function insertPrintHistory(database: Database.Database, payload: PrintHistoryInsertPayload): PrintHistoryRecord {
  const statement = database.prepare(
    `
      INSERT INTO print_history (
        printer_id,
        file_name,
        started_at,
        finished_at,
        status,
        progress_snapshot
      ) VALUES (?, ?, ?, ?, ?, ?)
    `
  );

  const result = statement.run(
    payload.printerId,
    payload.fileName,
    payload.startedAt,
    payload.finishedAt,
    payload.status,
    payload.progressSnapshot
  );

  return database
    .prepare<[number], PrintHistoryRecord>("SELECT * FROM print_history WHERE id = ?")
    .get(Number(result.lastInsertRowid)) as PrintHistoryRecord;
}

export function listPrintHistoryByPrinterId(database: Database.Database, printerId: number): PrintHistoryRecord[] {
  return database
    .prepare<[number], PrintHistoryRecord>(
      "SELECT * FROM print_history WHERE printer_id = ? ORDER BY COALESCE(finished_at, started_at) DESC, id DESC"
    )
    .all(printerId);
}

export function setSetting(database: Database.Database, key: string, value: string): void {
  database.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
}

export function getSetting(database: Database.Database, key: string): string | null {
  const result = database.prepare<[string], { value: string }>("SELECT value FROM settings WHERE key = ?").get(key);
  return result?.value ?? null;
}

export function getSettingNumber(database: Database.Database, key: string, fallback: number): number {
  const value = getSetting(database, key);
  const parsed = value ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}
