import { FastifyInstance } from "fastify";
import Database from "better-sqlite3";

import { getPrinterById, getSettingNumber, listPrintHistoryByPrinterId, setSetting } from "../db/connection";
import { StartupSelfTestResult } from "../health/selfTest";
import { PrinterConnectionManager } from "../sdcp/connectionManager";
import { SdcpDiscoveryService, DEFAULT_DISCOVERY_INTERVAL } from "../sdcp/discovery";

interface RegisterRoutesOptions {
  database: Database.Database;
  connectionManager: PrinterConnectionManager;
  discoveryService: SdcpDiscoveryService;
  getLatestSelfTest: () => StartupSelfTestResult;
  startedAt: number;
}

const DISCOVERY_INTERVAL_SETTING_KEY = "discovery.intervalSeconds";

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
      printers: options.connectionManager.getPrinterSnapshots()
    };
  });

  app.post<{ Body: { ip?: string } }>("/api/printers", async (request, reply) => {
    const ipAddress = request.body?.ip?.trim();
    if (!ipAddress) {
      return reply.code(400).send({ error: "Missing printer IP address." });
    }

    try {
      const result = await options.connectionManager.addManualPrinter(ipAddress);
      return {
        printer: result.printer,
        state: result.state
      };
    } catch (error) {
      request.log.error(error);
      return reply.code(400).send({ error: "Unable to confirm SDCP printer at the provided IP address." });
    }
  });

  app.delete<{ Params: { id: string } }>("/api/printers/:id", async (request, reply) => {
    const printerId = Number(request.params.id);
    if (!Number.isInteger(printerId)) {
      return reply.code(400).send({ error: "Invalid printer id." });
    }

    const deleted = options.connectionManager.removePrinterById(printerId);
    if (!deleted) {
      return reply.code(404).send({ error: "Printer not found." });
    }

    return {
      deleted: true,
      printerId
    };
  });

  app.get<{ Params: { id: string } }>("/api/printers/:id/history", async (request, reply) => {
    const printerId = Number(request.params.id);
    const printer = getPrinterById(options.database, printerId);
    if (!printer) {
      return reply.code(404).send({ error: "Printer not found." });
    }

    return {
      history: listPrintHistoryByPrinterId(options.database, printerId)
    };
  });

  app.get("/api/settings", async () => {
    return {
      discoveryIntervalSeconds: getSettingNumber(
        options.database,
        DISCOVERY_INTERVAL_SETTING_KEY,
        Math.round(DEFAULT_DISCOVERY_INTERVAL / 1000)
      )
    };
  });

  app.put<{ Body: { discoveryIntervalSeconds?: number } }>("/api/settings", async (request, reply) => {
    const seconds = Number(request.body?.discoveryIntervalSeconds);
    if (!Number.isFinite(seconds) || seconds < 5) {
      return reply.code(400).send({ error: "Discovery interval must be a number greater than or equal to 5 seconds." });
    }

    setSetting(options.database, DISCOVERY_INTERVAL_SETTING_KEY, String(Math.round(seconds)));
    options.discoveryService.updateIntervalMs(Math.round(seconds) * 1000);

    return {
      discoveryIntervalSeconds: Math.round(seconds)
    };
  });
}
