import { IncomingMessage, request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { FastifyInstance } from "fastify";
import Database from "better-sqlite3";

import { getPrinterById, getSetting, getSettingNumber, listPrintHistoryByPrinterId, setSetting } from "../db/connection";
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
const THEME_SETTING_KEY = "theme";
const ALLOWED_THEMES = new Set(["light", "dark", "system"]);
const CAMERA_CONNECTION_TIMEOUT_MS = 5_000;

function openCameraStream(videoUrl: string): Promise<IncomingMessage> {
  const parsedUrl = new URL(videoUrl);
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return Promise.reject(new Error("Printer returned an unsupported camera stream protocol."));
  }

  const requestStream = parsedUrl.protocol === "https:" ? httpsRequest : httpRequest;

  return new Promise<IncomingMessage>((resolve, reject) => {
    const upstreamRequest = requestStream(parsedUrl, { method: "GET" }, (upstreamResponse) => {
      upstreamRequest.setTimeout(0);

      const statusCode = upstreamResponse.statusCode ?? 502;
      if (statusCode < 200 || statusCode >= 300) {
        upstreamResponse.resume();
        reject(new Error(`Printer camera stream returned HTTP ${statusCode}.`));
        return;
      }

      resolve(upstreamResponse);
    });

    upstreamRequest.setTimeout(CAMERA_CONNECTION_TIMEOUT_MS, () => {
      upstreamRequest.destroy(new Error("Timed out while connecting to the printer camera stream."));
    });
    upstreamRequest.once("error", reject);
    upstreamRequest.end();
  });
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

  app.get<{ Params: { id: string } }>("/api/printers/:id/camera/stream", async (request, reply) => {
    const printerId = Number(request.params.id);
    if (!Number.isInteger(printerId)) {
      return reply.code(400).send({ error: "Invalid printer id." });
    }

    if (!getPrinterById(options.database, printerId)) {
      return reply.code(404).send({ error: "Printer not found." });
    }

    let upstreamResponse: IncomingMessage | undefined;
    const closeUpstream = () => {
      if (upstreamResponse && !upstreamResponse.destroyed) {
        upstreamResponse.destroy();
      }
    };

    request.raw.once("aborted", closeUpstream);
    reply.raw.once("close", closeUpstream);

    try {
      const videoUrl = await options.connectionManager.requestVideoStreamUrl(printerId);
      upstreamResponse = await openCameraStream(videoUrl);

      if (request.raw.aborted || reply.raw.destroyed) {
        reply.hijack();
        closeUpstream();
        return reply;
      }

      const contentType = upstreamResponse.headers["content-type"];

      if (typeof contentType !== "string" || !/\bboundary\s*=/i.test(contentType)) {
        upstreamResponse.destroy();
        throw new Error("Printer camera stream response is missing its Content-Type boundary.");
      }

      upstreamResponse.once("error", (error) => {
        request.log.error(error, "Printer camera stream failed while proxying MJPEG data.");
        if (!reply.raw.destroyed) {
          reply.raw.destroy(error);
        }
      });

      reply.hijack();
      reply.raw.statusCode = 200;
      reply.raw.setHeader("Content-Type", contentType);
      reply.raw.setHeader("Cache-Control", "no-store");
      upstreamResponse.pipe(reply.raw);
      return reply;
    } catch (error) {
      request.log.error(error, "Unable to open printer camera stream.");
      return reply.code(502).send({
        error: error instanceof Error ? error.message : "Unable to open printer camera stream."
      });
    }
  });

  app.get("/api/settings", async () => {
    return {
      discoveryIntervalSeconds: getSettingNumber(
        options.database,
        DISCOVERY_INTERVAL_SETTING_KEY,
        Math.round(DEFAULT_DISCOVERY_INTERVAL / 1000)
      ),
      theme: getSetting(options.database, THEME_SETTING_KEY) ?? "dark"
    };
  });

  app.put<{ Body: { discoveryIntervalSeconds?: number; theme?: string } }>("/api/settings", async (request, reply) => {
    const nextSettings = {
      discoveryIntervalSeconds: getSettingNumber(
        options.database,
        DISCOVERY_INTERVAL_SETTING_KEY,
        Math.round(DEFAULT_DISCOVERY_INTERVAL / 1000)
      ),
      theme: getSetting(options.database, THEME_SETTING_KEY) ?? "dark"
    };

    if (typeof request.body?.discoveryIntervalSeconds !== "undefined") {
      const seconds = Number(request.body.discoveryIntervalSeconds);
      if (!Number.isFinite(seconds) || seconds < 5) {
        return reply.code(400).send({ error: "Discovery interval must be a number greater than or equal to 5 seconds." });
      }

      const roundedSeconds = Math.round(seconds);
      setSetting(options.database, DISCOVERY_INTERVAL_SETTING_KEY, String(roundedSeconds));
      options.discoveryService.updateIntervalMs(roundedSeconds * 1000);
      nextSettings.discoveryIntervalSeconds = roundedSeconds;
    }

    if (typeof request.body?.theme !== "undefined") {
      const theme = String(request.body.theme);
      if (!ALLOWED_THEMES.has(theme)) {
        return reply.code(400).send({ error: "Theme must be one of: light, dark, system." });
      }

      setSetting(options.database, THEME_SETTING_KEY, theme);
      nextSettings.theme = theme;
    }

    return nextSettings;
  });
}
