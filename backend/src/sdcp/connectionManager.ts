import { EventEmitter } from "node:events";
import Database from "better-sqlite3";
import WebSocket from "ws";

import { listPrinters, PrinterRecord } from "../db/connection";
import { RawPrinterStatusEvent } from "./types";

interface ManagedConnection {
  printer: PrinterRecord;
  socket?: WebSocket;
  heartbeatInterval?: NodeJS.Timeout;
  reconnectTimeout?: NodeJS.Timeout;
  reconnectAttempt: number;
}

export class PrinterConnectionManager extends EventEmitter {
  private readonly database: Database.Database;
  private readonly connections = new Map<string, ManagedConnection>();

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
    this.openSocket(connection);
  }

  private openSocket(connection: ManagedConnection): void {
    const url = `ws://${connection.printer.last_known_ip}:3030/websocket`;
    const socket = new WebSocket(url);

    connection.socket = socket;

    socket.on("open", () => {
      connection.reconnectAttempt = 0;
      this.emit("connection", {
        mainboardId: connection.printer.mainboard_id,
        connected: true
      });

      connection.heartbeatInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send("ping");
        }
      }, 30_000);
    });

    socket.on("message", (payload) => {
      const event: RawPrinterStatusEvent = {
        printerId: connection.printer.id,
        mainboardId: connection.printer.mainboard_id,
        ipAddress: connection.printer.last_known_ip,
        payload: payload.toString(),
        receivedAt: new Date().toISOString()
      };

      this.emit("status", event);
    });

    socket.on("error", (error) => {
      console.error(`Printer connection error for ${connection.printer.mainboard_id}.`, error);
      this.emit("connection", {
        mainboardId: connection.printer.mainboard_id,
        connected: false
      });
    });

    socket.on("close", () => {
      if (connection.heartbeatInterval) {
        clearInterval(connection.heartbeatInterval);
        connection.heartbeatInterval = undefined;
      }

      this.emit("connection", {
        mainboardId: connection.printer.mainboard_id,
        connected: false
      });

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
}
