import { FastifyInstance } from "fastify";
import Database from "better-sqlite3";

import { listPrinters } from "../db/connection";
import { StartupSelfTestResult } from "../health/selfTest";
import { PrinterConnectionManager } from "../sdcp/connectionManager";

interface RegisterRoutesOptions {
  database: Database.Database;
  connectionManager: PrinterConnectionManager;
  getLatestSelfTest: () => StartupSelfTestResult;
  startedAt: number;
}

export async function registerRoutes(app: FastifyInstance, options: RegisterRoutesOptions): Promise<void> {
  app.get("/health", async () => {
    return {
      status: options.getLatestSelfTest().ok ? "ok" : "degraded",
      lastSelfTest: options.getLatestSelfTest(),
      connectedPrinters: options.connectionManager.getConnectedCount(),
      uptimeMs: Date.now() - options.startedAt
    };
  });

  app.get("/api/printers", async () => {
    return {
      printers: listPrinters(options.database)
    };
  });
}
