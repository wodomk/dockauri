import fs from "node:fs";
import net from "node:net";
import Database from "better-sqlite3";

import { SdcpDiscoveryService } from "../sdcp/discovery";

export interface StartupSelfTestResult {
  timestamp: string;
  ok: boolean;
  checks: {
    database: {
      ok: boolean;
      path: string;
      writable: boolean;
    };
    httpPort: {
      ok: boolean;
      port: number;
    };
    discovery: {
      ok: boolean;
      printersFound: number;
      durationMs: number;
    };
  };
}

interface SelfTestOptions {
  database: Database.Database;
  discoveryService: SdcpDiscoveryService;
  httpPort: number;
}

export async function runStartupSelfTest(options: SelfTestOptions): Promise<StartupSelfTestResult> {
  const databaseCheck = runDatabaseCheck(options.database);
  const portCheck = await runHttpPortCheck(options.httpPort);
  const discoveryResult = await options.discoveryService.runDiscovery();

  const checks = {
    database: databaseCheck,
    httpPort: portCheck,
    discovery: {
      ok: true,
      printersFound: discoveryResult.discoveredCount,
      durationMs: discoveryResult.durationMs
    }
  };

  return {
    timestamp: new Date().toISOString(),
    ok: checks.database.ok && checks.httpPort.ok && checks.discovery.ok,
    checks
  };
}

function runDatabaseCheck(database: Database.Database): StartupSelfTestResult["checks"]["database"] {
  const markerKey = "__self_test__";
  const markerValue = new Date().toISOString();

  database.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(markerKey, markerValue);
  const result = database.prepare<[string], { value: string }>("SELECT value FROM settings WHERE key = ?").get(markerKey);
  database.prepare("DELETE FROM settings WHERE key = ?").run(markerKey);

  return {
    ok: result?.value === markerValue && fs.existsSync(database.name),
    path: database.name,
    writable: result?.value === markerValue
  };
}

async function runHttpPortCheck(port: number): Promise<StartupSelfTestResult["checks"]["httpPort"]> {
  const ok = await new Promise<boolean>((resolve) => {
    const probe = net.createServer();

    probe.once("error", () => resolve(false));
    probe.listen(port, "0.0.0.0", () => {
      probe.close(() => resolve(true));
    });
  });

  return {
    ok,
    port
  };
}
