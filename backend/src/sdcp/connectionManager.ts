import { EventEmitter } from "node:events";
import crypto from "node:crypto";
import Database from "better-sqlite3";
import WebSocket from "ws";

import {
  deletePrinterById,
  getPrinterById,
  insertPrintHistory,
  listPrinters,
  PrinterRecord,
  upsertPrinter
} from "../db/connection";
import {
  PrinterRemovalEvent,
  PrinterState,
  PrinterStateEvent,
  SdcpAttributesFrame,
  SdcpAttributesPayload,
  SdcpErrorFrame,
  SdcpRequestFrame,
  SdcpStatusFrame,
  SdcpStatusPayload
} from "./types";

interface ManagedConnection {
  printer: PrinterRecord;
  socket?: WebSocket;
  heartbeatInterval?: NodeJS.Timeout;
  reconnectTimeout?: NodeJS.Timeout;
  reconnectAttempt: number;
}

interface ParsedSocketMessage {
  topic: string | null;
  raw: Record<string, unknown>;
  status?: SdcpStatusFrame;
  attributes?: SdcpAttributesFrame;
  error?: SdcpErrorFrame;
}

interface ManualPrinterProbeResult {
  mainboardId: string;
  name: string;
  machineName: string;
  protocolVersion: string;
  firmwareVersion: string;
  ipAddress: string;
}

const STATUS_TOPIC = "sdcp/status/";
const ATTRIBUTES_TOPIC = "sdcp/attributes/";
const ERROR_TOPIC = "sdcp/error/";
const REQUEST_ATTRIBUTES_CMD = 1;
const REQUEST_STATUS_CMD = 0;

export class PrinterConnectionManager extends EventEmitter {
  private readonly database: Database.Database;
  private readonly connections = new Map<string, ManagedConnection>();
  private readonly states = new Map<number, PrinterState>();

  constructor(database: Database.Database) {
    super();
    this.database = database;
  }

  syncPrintersFromDatabase(): void {
    const printers = listPrinters(this.database).filter((printer) => Boolean(printer.last_known_ip));
    const activeIds = new Set(printers.map((printer) => printer.mainboard_id));

    for (const printer of printers) {
      const existing = this.connections.get(printer.mainboard_id);

      if (!existing) {
        this.connectPrinter(printer);
        continue;
      }

      if (existing.printer.last_known_ip !== printer.last_known_ip) {
        this.disposeConnection(existing);
        this.connectPrinter(printer);
        continue;
      }

      existing.printer = printer;
    }

    for (const [mainboardId, connection] of this.connections.entries()) {
      if (!activeIds.has(mainboardId)) {
        this.disposeConnection(connection);
        this.connections.delete(mainboardId);
      }
    }
  }

  getConnectedCount(): number {
    let total = 0;

    for (const connection of this.connections.values()) {
      if (connection.socket?.readyState === WebSocket.OPEN) {
        total += 1;
      }
    }

    return total;
  }

  getPrinterState(printerId: number): PrinterState | null {
    return this.states.get(printerId) ?? null;
  }

  getAllPrinterStates(): PrinterState[] {
    return Array.from(this.states.values()).sort((left, right) => left.printerId - right.printerId);
  }

  getPrinterSnapshots(): Array<{ printer: PrinterRecord; state: PrinterState }> {
    return listPrinters(this.database).map((printer) => ({
      printer,
      state: this.getOrCreateState(printer)
    }));
  }

  async addManualPrinter(ipAddress: string): Promise<{ printer: PrinterRecord; state: PrinterState }> {
    const probe = await this.probePrinter(ipAddress);
    const printer = upsertPrinter(this.database, {
      mainboardId: probe.mainboardId,
      ipAddress: probe.ipAddress,
      source: "manual",
      discoveredName: probe.name
    });

    const state = {
      ...this.getOrCreateState(printer),
      displayName: probe.name,
      machineName: probe.machineName,
      protocolVersion: probe.protocolVersion,
      firmwareVersion: probe.firmwareVersion,
      ipAddress: probe.ipAddress,
      lastUpdatedAt: new Date().toISOString()
    };

    this.states.set(printer.id, state);
    this.syncPrintersFromDatabase();
    return { printer, state };
  }

  removePrinterById(printerId: number): boolean {
    const printer = getPrinterById(this.database, printerId);
    if (!printer) {
      return false;
    }

    const connection = this.connections.get(printer.mainboard_id);
    if (connection) {
      this.disposeConnection(connection);
      this.connections.delete(printer.mainboard_id);
    }

    this.states.delete(printerId);
    const deleted = deletePrinterById(this.database, printerId);

    if (deleted) {
      const event: PrinterRemovalEvent = { printerId };
      this.emit("removed", event);
    }

    return deleted;
  }

  shutdown(): void {
    for (const connection of this.connections.values()) {
      this.disposeConnection(connection);
    }

    this.connections.clear();
  }

  private connectPrinter(printer: PrinterRecord): void {
    const connection: ManagedConnection = {
      printer,
      reconnectAttempt: 0
    };

    this.connections.set(printer.mainboard_id, connection);
    this.getOrCreateState(printer);
    this.openSocket(connection);
  }

  private openSocket(connection: ManagedConnection): void {
    const url = `ws://${connection.printer.last_known_ip}:3030/websocket`;
    const socket = new WebSocket(url);

    connection.socket = socket;

    socket.on("open", () => {
      connection.reconnectAttempt = 0;
      this.emitState(this.markPrinterConnectivity(connection.printer, true));
      this.requestInitialTelemetry(socket, connection.printer.mainboard_id);

      connection.heartbeatInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send("ping");
        }
      }, 30_000);
    });

    socket.on("message", (payload) => {
      this.handleSocketMessage(connection, payload.toString());
    });

    socket.on("error", (error) => {
      console.error(`Printer connection error for ${connection.printer.mainboard_id}.`, error);
    });

    socket.on("close", () => {
      if (connection.heartbeatInterval) {
        clearInterval(connection.heartbeatInterval);
        connection.heartbeatInterval = undefined;
      }

      this.emitState(this.markPrinterConnectivity(connection.printer, false));

      this.scheduleReconnect(connection);
    });
  }

  private scheduleReconnect(connection: ManagedConnection): void {
    if (!this.connections.has(connection.printer.mainboard_id)) {
      return;
    }

    const delayMs = Math.min(1_000 * 2 ** connection.reconnectAttempt, 30_000);
    connection.reconnectAttempt += 1;

    connection.reconnectTimeout = setTimeout(() => {
      this.openSocket(connection);
    }, delayMs);
  }

  private disposeConnection(connection: ManagedConnection): void {
    if (connection.reconnectTimeout) {
      clearTimeout(connection.reconnectTimeout);
      connection.reconnectTimeout = undefined;
    }

    if (connection.heartbeatInterval) {
      clearInterval(connection.heartbeatInterval);
      connection.heartbeatInterval = undefined;
    }

    if (connection.socket) {
      connection.socket.removeAllListeners();
      connection.socket.close();
      connection.socket = undefined;
    }
  }

  private handleSocketMessage(connection: ManagedConnection, payload: string): void {
    const parsed = this.parseSocketMessage(payload);
    if (!parsed) {
      return;
    }

    const previousState = this.getOrCreateState(connection.printer);
    let nextState = previousState;

    if (parsed.attributes?.Attributes) {
      nextState = this.applyAttributes(nextState, parsed.attributes.Attributes, parsed.topic);
    }

    if (parsed.status?.Status) {
      nextState = this.applyStatus(nextState, parsed.status.Status, parsed.topic);
    }

    if (parsed.error?.Data?.Data) {
      nextState = this.applyError(nextState, parsed.error.Data.Data, parsed.topic);
    }

    if (nextState !== previousState) {
      this.states.set(connection.printer.id, nextState);
      this.persistTerminalTransition(previousState, nextState);
      this.emitState(nextState);
    }
  }

  private parseSocketMessage(payload: string): ParsedSocketMessage | null {
    try {
      const raw = JSON.parse(payload) as Record<string, unknown>;
      const topic =
        typeof raw.Topic === "string"
          ? raw.Topic
          : typeof (raw.Data as { Topic?: unknown } | undefined)?.Topic === "string"
            ? ((raw.Data as { Topic?: string }).Topic ?? null)
            : null;

      const status = this.extractStatusFrame(raw, topic);
      const attributes = this.extractAttributesFrame(raw, topic);
      const error = this.extractErrorFrame(raw, topic);

      return {
        topic,
        raw,
        status,
        attributes,
        error
      };
    } catch (error) {
      console.warn("Ignoring malformed SDCP WebSocket payload.", error);
      return null;
    }
  }

  private extractStatusFrame(raw: Record<string, unknown>, topic: string | null): SdcpStatusFrame | undefined {
    if (raw.Status && typeof raw.Status === "object") {
      return raw as unknown as SdcpStatusFrame;
    }

    if (topic?.startsWith(STATUS_TOPIC)) {
      const data = raw.Data as Record<string, unknown> | undefined;
      if (data?.Status && typeof data.Status === "object") {
        return {
          Id: typeof raw.Id === "string" ? raw.Id : undefined,
          Status: data.Status as SdcpStatusPayload,
          MainboardID: typeof data.MainboardID === "string" ? data.MainboardID : undefined,
          TimeStamp: typeof data.TimeStamp === "number" ? data.TimeStamp : undefined,
          Topic: topic
        };
      }
    }

    return undefined;
  }

  private extractAttributesFrame(raw: Record<string, unknown>, topic: string | null): SdcpAttributesFrame | undefined {
    if (raw.Attributes && typeof raw.Attributes === "object") {
      return raw as unknown as SdcpAttributesFrame;
    }

    if (topic?.startsWith(ATTRIBUTES_TOPIC)) {
      const data = raw.Data as Record<string, unknown> | undefined;
      if (data?.Attributes && typeof data.Attributes === "object") {
        return {
          Id: typeof raw.Id === "string" ? raw.Id : undefined,
          Attributes: data.Attributes as SdcpAttributesPayload,
          MainboardID: typeof data.MainboardID === "string" ? data.MainboardID : undefined,
          TimeStamp: typeof data.TimeStamp === "number" ? data.TimeStamp : undefined,
          Topic: topic
        };
      }
    }

    return undefined;
  }

  private extractErrorFrame(raw: Record<string, unknown>, topic: string | null): SdcpErrorFrame | undefined {
    if (topic?.startsWith(ERROR_TOPIC)) {
      return raw as unknown as SdcpErrorFrame;
    }

    return undefined;
  }

  private getOrCreateState(printer: PrinterRecord): PrinterState {
    const existing = this.states.get(printer.id);
    if (existing) {
      return existing;
    }

    const created = this.buildBaseState(printer);
    this.states.set(printer.id, created);
    return created;
  }

  private buildBaseState(printer: PrinterRecord): PrinterState {
    return {
      printerId: printer.id,
      mainboardId: printer.mainboard_id,
      ipAddress: printer.last_known_ip,
      displayName: printer.name ?? printer.mainboard_id,
      machineName: null,
      protocolVersion: null,
      firmwareVersion: null,
      summaryStatus: "offline",
      activityStatus: "idle",
      connected: false,
      progressPercent: null,
      currentFileName: null,
      currentLayer: null,
      totalLayers: null,
      currentTicks: null,
      totalTicks: null,
      machineStatusCode: null,
      previousMachineStatusCode: null,
      printStatusCode: null,
      errorCode: null,
      errorMessage: null,
      temperatures: {
        nozzle: { actual: null, target: null },
        bed: { actual: null, target: null },
        chamber: { actual: null, target: null }
      },
      capabilities: [],
      lastTopic: null,
      lastMessageAt: null,
      lastUpdatedAt: new Date().toISOString(),
      startedAt: null
    };
  }

  private markPrinterConnectivity(printer: PrinterRecord, connected: boolean): PrinterState {
    const previous = this.getOrCreateState(printer);
    const next: PrinterState = {
      ...previous,
      connected,
      ipAddress: printer.last_known_ip,
      displayName: printer.name ?? previous.displayName,
      summaryStatus: connected ? this.deriveSummaryStatus(previous.activityStatus, previous.errorCode) : "offline",
      lastUpdatedAt: new Date().toISOString()
    };

    this.states.set(printer.id, next);
    return next;
  }

  private applyAttributes(previous: PrinterState, attributes: SdcpAttributesPayload, topic: string | null): PrinterState {
    const next: PrinterState = {
      ...previous,
      connected: true,
      displayName: attributes.Name ?? previous.displayName,
      machineName: attributes.MachineName ?? previous.machineName,
      protocolVersion: attributes.ProtocolVersion ?? previous.protocolVersion,
      firmwareVersion: attributes.FirmwareVersion ?? previous.firmwareVersion,
      capabilities: attributes.Capabilities ?? previous.capabilities,
      lastTopic: topic,
      lastMessageAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString()
    };

    next.summaryStatus = this.deriveSummaryStatus(next.activityStatus, next.errorCode);
    return next;
  }

  private applyStatus(previous: PrinterState, status: SdcpStatusPayload, topic: string | null): PrinterState {
    const currentLayer = this.readNumber(status.PrintInfo?.CurrentLayer);
    const totalLayers = this.readNumber(status.PrintInfo?.TotalLayer);
    const currentTicks = this.readNumber(status.PrintInfo?.CurrentTicks);
    const totalTicks = this.readNumber(status.PrintInfo?.TotalTicks);
    const printStatusCode = this.readNumber(status.PrintInfo?.Status);
    const errorCode = this.readNumber(status.PrintInfo?.ErrorNumber);
    const machineStatusCode = this.unwrapMachineStatus(status.CurrentStatus);
    const activityStatus = this.deriveActivityStatus(machineStatusCode, printStatusCode, errorCode);
    const startedAt =
      activityStatus === "printing" || activityStatus === "paused"
        ? previous.startedAt && !this.isTerminalActivity(previous.activityStatus)
          ? previous.startedAt
          : new Date().toISOString()
        : previous.startedAt;

    const next: PrinterState = {
      ...previous,
      connected: true,
      summaryStatus: this.deriveSummaryStatus(activityStatus, errorCode),
      activityStatus,
      progressPercent: this.calculateProgress(currentLayer, totalLayers, currentTicks, totalTicks),
      currentFileName: status.PrintInfo?.Filename ?? previous.currentFileName,
      currentLayer,
      totalLayers,
      currentTicks,
      totalTicks,
      machineStatusCode,
      previousMachineStatusCode: this.readNumber(status.PreviousStatus),
      printStatusCode,
      errorCode,
      errorMessage: errorCode ? this.describePrintError(errorCode) : previous.errorMessage,
      temperatures: {
        nozzle: {
          actual: this.readNumber(status.TempOfNozzle),
          target: this.readNumber(status.TempTargetNozzle)
        },
        bed: {
          actual: this.readNumber(status.TempOfHotbed),
          target: this.readNumber(status.TempTargetHotbed)
        },
        chamber: {
          actual: this.readNumber(status.TempOfBox),
          target: this.readNumber(status.TempTargetBox)
        }
      },
      lastTopic: topic,
      lastMessageAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      startedAt
    };

    return next;
  }

  private applyError(
    previous: PrinterState,
    errorPayload: { ErrorCode?: number | string; Message?: string },
    topic: string | null
  ): PrinterState {
    const errorCode = this.readNumber(errorPayload.ErrorCode);
    const message = errorPayload.Message ?? (errorCode ? this.describePrintError(errorCode) : "Printer reported an error.");

    return {
      ...previous,
      connected: true,
      summaryStatus: "error",
      activityStatus: "failed",
      errorCode,
      errorMessage: message,
      lastTopic: topic,
      lastMessageAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      startedAt: previous.startedAt ?? new Date().toISOString()
    };
  }

  private persistTerminalTransition(previous: PrinterState, next: PrinterState): void {
    if (!this.isTerminalActivity(next.activityStatus) || this.isTerminalActivity(previous.activityStatus)) {
      return;
    }

    insertPrintHistory(this.database, {
      printerId: next.printerId,
      fileName: next.currentFileName ?? "unknown",
      startedAt: next.startedAt ?? new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      status: this.mapHistoryStatus(next.activityStatus),
      progressSnapshot: JSON.stringify(next)
    });
  }

  private isTerminalActivity(activityStatus: PrinterState["activityStatus"]): boolean {
    return activityStatus === "completed" || activityStatus === "failed" || activityStatus === "cancelled";
  }

  private mapHistoryStatus(activityStatus: PrinterState["activityStatus"]): "completed" | "failed" | "cancelled" {
    if (activityStatus === "completed") {
      return "completed";
    }

    if (activityStatus === "cancelled") {
      return "cancelled";
    }

    return "failed";
  }

  private emitState(state: PrinterState): void {
    const event: PrinterStateEvent = {
      printerId: state.printerId,
      state
    };
    this.emit("state", event);
  }

  private deriveSummaryStatus(activityStatus: PrinterState["activityStatus"], errorCode: number | null): PrinterState["summaryStatus"] {
    if (errorCode && errorCode > 0) {
      return "error";
    }

    if (activityStatus === "printing" || activityStatus === "paused") {
      return "printing";
    }

    if (activityStatus === "failed") {
      return "error";
    }

    return "idle";
  }

  private deriveActivityStatus(
    machineStatusCode: number | null,
    printStatusCode: number | null,
    errorCode: number | null
  ): PrinterState["activityStatus"] {
    if (errorCode && errorCode > 0) {
      return "failed";
    }

    switch (printStatusCode) {
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 7:
        return "printing";
      case 6:
        return "paused";
      case 8:
        return "cancelled";
      case 9:
        return "completed";
      case 10:
        return "busy";
      default:
        break;
    }

    switch (machineStatusCode) {
      case 1:
        return "printing";
      case 2:
        return "transferring";
      case 3:
      case 4:
        return "busy";
      case 0:
        return "idle";
      default:
        return "unknown";
    }
  }

  private calculateProgress(
    currentLayer: number | null,
    totalLayers: number | null,
    currentTicks: number | null,
    totalTicks: number | null
  ): number | null {
    if (currentLayer !== null && totalLayers && totalLayers > 0) {
      return Math.max(0, Math.min(100, Math.round((currentLayer / totalLayers) * 100)));
    }

    if (currentTicks !== null && totalTicks && totalTicks > 0) {
      return Math.max(0, Math.min(100, Math.round((currentTicks / totalTicks) * 100)));
    }

    return null;
  }

  private readNumber(value: number | string | undefined): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private unwrapMachineStatus(value: number | number[] | undefined): number | null {
    if (typeof value === "number") {
      return value;
    }

    if (Array.isArray(value) && value.length > 0 && typeof value[0] === "number") {
      return value[0];
    }

    return null;
  }

  private describePrintError(errorCode: number): string {
    const errorMap = new Map<number, string>([
      [0, "No printer error."],
      [1, "File MD5 check failed."],
      [2, "File read failed."],
      [3, "Resolution mismatch."],
      [4, "Unknown file format."],
      [5, "Machine model mismatch."],
      [12, "USB drive removed during print."],
      [14, "Z-axis homing failed."],
      [17, "General homing failure."],
      [18, "Bed adhesion failed."],
      [19, "General print exception."],
      [20, "Movement abnormality detected."],
      [23, "Y-axis homing failed."],
      [24, "G-code file error."],
      [25, "Camera connection error."],
      [26, "Network connection error."],
      [27, "Server connection failed."],
      [28, "Application disconnected during print."],
      [33, "Nozzle temperature sensor offline."],
      [34, "Bed temperature sensor offline."]
    ]);

    return errorMap.get(errorCode) ?? `Printer reported SDCP error ${errorCode}.`;
  }

  private requestInitialTelemetry(socket: WebSocket, mainboardId: string): void {
    this.sendControlRequest(socket, mainboardId, REQUEST_ATTRIBUTES_CMD);
    this.sendControlRequest(socket, mainboardId, REQUEST_STATUS_CMD);
  }

  private sendControlRequest(socket: WebSocket, mainboardId: string, cmd: number): void {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const request: SdcpRequestFrame = {
      Id: crypto.randomUUID().replace(/-/g, ""),
      Data: {
        Cmd: cmd,
        Data: {},
        RequestID: crypto.randomUUID().replace(/-/g, ""),
        MainboardID: mainboardId,
        TimeStamp: Math.floor(Date.now() / 1000),
        From: 4
      },
      Topic: `sdcp/request/${mainboardId}`
    };

    socket.send(JSON.stringify(request));
  }

  private async probePrinter(ipAddress: string): Promise<ManualPrinterProbeResult> {
    const url = `ws://${ipAddress}:3030/websocket`;

    return await new Promise<ManualPrinterProbeResult>((resolve, reject) => {
      const socket = new WebSocket(url);
      const timeout = setTimeout(() => {
        socket.close();
        reject(new Error("Timed out while probing SDCP printer attributes."));
      }, 5_000);

      let requestedAttributesFor: string | null = null;

      const cleanup = () => {
        clearTimeout(timeout);
        socket.removeAllListeners();
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close();
        }
      };

      const finish = (attributes: SdcpAttributesPayload) => {
        if (!attributes.MainboardID) {
          return;
        }

        cleanup();
        resolve({
          mainboardId: attributes.MainboardID,
          name: attributes.Name ?? attributes.MachineName ?? attributes.MainboardID,
          machineName: attributes.MachineName ?? attributes.Name ?? "Unknown printer",
          protocolVersion: attributes.ProtocolVersion ?? "unknown",
          firmwareVersion: attributes.FirmwareVersion ?? "unknown",
          ipAddress
        });
      };

      socket.on("message", (payload) => {
        const parsed = this.parseSocketMessage(payload.toString());
        if (!parsed) {
          return;
        }

        if (parsed.attributes?.Attributes?.MainboardID) {
          finish(parsed.attributes.Attributes);
          return;
        }

        const mainboardId = parsed.status?.MainboardID ?? parsed.attributes?.MainboardID ?? parsed.error?.Data?.MainboardID;
        if (mainboardId && requestedAttributesFor !== mainboardId) {
          requestedAttributesFor = mainboardId;
          this.sendControlRequest(socket, mainboardId, REQUEST_ATTRIBUTES_CMD);
        }
      });

      socket.on("open", () => {
        socket.send("ping");
      });

      socket.on("error", (error) => {
        cleanup();
        reject(error);
      });
    });
  }
}
