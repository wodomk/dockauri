import dgram from "node:dgram";
import Database from "better-sqlite3";

import { upsertPrinter } from "../db/connection";
import { DiscoveryRunResult, NormalizedDiscoveredPrinter, SdcpDiscoveryAttributes, SdcpDiscoveryResponse } from "./types";

const DISCOVERY_PORT = 3000;
const DISCOVERY_MESSAGE = "M99999";
const DISCOVERY_MESSAGE_BUFFER = Buffer.from(DISCOVERY_MESSAGE);
const DEFAULT_DISCOVERY_TIMEOUT_MS = 3_000;
const DEFAULT_DISCOVERY_INTERVAL_MS = 60_000;

interface DiscoveryOptions {
  broadcastAddress?: string;
  intervalMs?: number;
  timeoutMs?: number;
}

export class SdcpDiscoveryService {
  private readonly broadcastAddress: string;
  private intervalMs: number;
  private readonly timeoutMs: number;
  private readonly database: Database.Database;
  private socket?: dgram.Socket;
  private intervalHandle?: NodeJS.Timeout;
  private currentRun?: Promise<DiscoveryRunResult>;
  private recurringCallback?: (result: DiscoveryRunResult) => void | Promise<void>;

  constructor(database: Database.Database, options: DiscoveryOptions = {}) {
    this.database = database;
    this.broadcastAddress = options.broadcastAddress ?? "255.255.255.255";
    this.intervalMs = options.intervalMs ?? DEFAULT_DISCOVERY_INTERVAL_MS;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_DISCOVERY_TIMEOUT_MS;
  }

  async runDiscovery(): Promise<DiscoveryRunResult> {
    if (this.currentRun) {
      return this.currentRun;
    }

    this.currentRun = this.executeDiscovery();

    try {
      return await this.currentRun;
    } finally {
      this.currentRun = undefined;
    }
  }

  startRecurringDiscovery(onResult?: (result: DiscoveryRunResult) => void | Promise<void>): void {
    this.recurringCallback = onResult;
    this.clearRecurringDiscovery();
    this.armRecurringDiscovery();
  }

  updateIntervalMs(intervalMs: number): void {
    this.intervalMs = intervalMs;
    if (this.intervalHandle) {
      this.clearRecurringDiscovery();
      this.armRecurringDiscovery();
    }
  }

  getIntervalMs(): number {
    return this.intervalMs;
  }

  async close(): Promise<void> {
    this.clearRecurringDiscovery();

    if (!this.socket) {
      return;
    }

    const socket = this.socket;
    this.socket = undefined;

    await new Promise<void>((resolve) => {
      socket.close(() => resolve());
    });
  }

  private armRecurringDiscovery(): void {
    if (this.intervalHandle) {
      return;
    }

    this.intervalHandle = setInterval(async () => {
      try {
        const result = await this.runDiscovery();
        await this.recurringCallback?.(result);
      } catch (error) {
        console.error("Recurring SDCP discovery failed.", error);
      }
    }, this.intervalMs);
  }

  private clearRecurringDiscovery(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = undefined;
    }
  }

  private async executeDiscovery(): Promise<DiscoveryRunResult> {
    const startedAt = new Date();
    const socket = await this.getSocket();
    const discovered = new Map<string, NormalizedDiscoveredPrinter>();

    await new Promise<void>((resolve, reject) => {
      const onMessage = (message: Buffer) => {
        if (message.equals(DISCOVERY_MESSAGE_BUFFER)) {
          return;
        }

        const printer = this.parseDiscoveryResponse(message);

        if (!printer) {
          return;
        }

        discovered.set(printer.mainboardId, printer);
        upsertPrinter(this.database, {
          mainboardId: printer.mainboardId,
          ipAddress: printer.mainboardIp,
          source: "discovered",
          discoveredName: printer.name
        });
      };

      const timeout = setTimeout(() => {
        socket.off("message", onMessage);
        resolve();
      }, this.timeoutMs);

      socket.on("message", onMessage);
      socket.send(DISCOVERY_MESSAGE_BUFFER, DISCOVERY_PORT, this.broadcastAddress, (error) => {
        if (error) {
          clearTimeout(timeout);
          socket.off("message", onMessage);
          reject(error);
        }
      });
    });

    const finishedAt = new Date();

    return {
      discoveredCount: discovered.size,
      printers: Array.from(discovered.values()),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString()
    };
  }

  private async getSocket(): Promise<dgram.Socket> {
    if (this.socket) {
      return this.socket;
    }

    const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });

    await new Promise<void>((resolve, reject) => {
      socket.once("error", reject);
      socket.bind(DISCOVERY_PORT, () => {
        socket.off("error", reject);
        socket.setBroadcast(true);
        resolve();
      });
    });

    this.socket = socket;
    return socket;
  }

  private parseDiscoveryResponse(message: Buffer): NormalizedDiscoveredPrinter | null {
    try {
      const parsed = JSON.parse(message.toString("utf8")) as SdcpDiscoveryResponse;
      const data = this.unwrapAttributes(parsed.Data);

      if (!data.MainboardID || !data.MainboardIP) {
        return null;
      }

      return {
        id: parsed.Id ?? data.MainboardID,
        name: data.Name ?? data.MachineName ?? data.MainboardID,
        machineName: data.MachineName ?? data.Name ?? "Unknown printer",
        mainboardIp: data.MainboardIP,
        mainboardId: data.MainboardID,
        protocolVersion: data.ProtocolVersion ?? "unknown",
        firmwareVersion: data.FirmwareVersion ?? "unknown"
      };
    } catch (error) {
      console.warn("Ignoring malformed SDCP discovery packet.", error);
      return null;
    }
  }

  private unwrapAttributes(data: SdcpDiscoveryResponse["Data"]): SdcpDiscoveryAttributes {
    if (!data) {
      return {};
    }

    if ("Attributes" in data && data.Attributes) {
      return data.Attributes;
    }

    return data;
  }
}

export const DEFAULT_DISCOVERY_INTERVAL = DEFAULT_DISCOVERY_INTERVAL_MS;
