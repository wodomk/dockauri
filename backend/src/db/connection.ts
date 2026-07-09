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
        last_known_ip = excluded.last_known_ip,
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
