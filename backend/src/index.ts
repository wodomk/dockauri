import Fastify from "fastify";
import cors from "@fastify/cors";

import { registerRoutes } from "./api/routes";
import { registerFrontendWebsocket } from "./api/websocket";
import { createDatabaseConnection, getSettingNumber } from "./db/connection";
import { runStartupSelfTest, StartupSelfTestResult } from "./health/selfTest";
import { PrinterConnectionManager } from "./sdcp/connectionManager";
import { DEFAULT_DISCOVERY_INTERVAL, SdcpDiscoveryService } from "./sdcp/discovery";

const BACKEND_PORT = Number(process.env.DOCKAURI_BACKEND_PORT ?? 8080);
const DISCOVERY_INTERVAL_SETTING_KEY = "discovery.intervalSeconds";

async function bootstrap(): Promise<void> {
  const startedAt = Date.now();
  const database = createDatabaseConnection();
  const discoveryIntervalSeconds = getSettingNumber(
    database,
    DISCOVERY_INTERVAL_SETTING_KEY,
    Math.round(DEFAULT_DISCOVERY_INTERVAL / 1000)
  );
  const discoveryService = new SdcpDiscoveryService(database, {
    intervalMs: discoveryIntervalSeconds * 1000
  });
  const connectionManager = new PrinterConnectionManager(database);
  const app = Fastify({
    logger: true
  });

  // TODO: Narrow CORS together with the future GUI-managed authentication mode.
  await app.register(cors, {
    origin: true
  });

  let latestSelfTest: StartupSelfTestResult = await runStartupSelfTest({
    database,
    discoveryService,
    httpPort: BACKEND_PORT
  });

  connectionManager.syncPrintersFromDatabase();
  discoveryService.startRecurringDiscovery(async (result) => {
    connectionManager.syncPrintersFromDatabase();

    latestSelfTest = {
      ...latestSelfTest,
      timestamp: new Date().toISOString(),
      checks: {
        ...latestSelfTest.checks,
        discovery: {
          ok: true,
          printersFound: result.discoveredCount,
          durationMs: result.durationMs
        }
      }
    };
  });

  await registerFrontendWebsocket(app, database, connectionManager);
  await registerRoutes(app, {
    database,
    connectionManager,
    discoveryService,
    getLatestSelfTest: () => latestSelfTest,
    startedAt
  });

  app.addHook("onClose", async () => {
    discoveryService.close().catch(() => undefined);
    connectionManager.shutdown();
    database.close();
  });

  await app.listen({
    host: "0.0.0.0",
    port: BACKEND_PORT
  });
}

bootstrap().catch((error) => {
  console.error("Dockauri backend failed to start.", error);
  process.exitCode = 1;
});
