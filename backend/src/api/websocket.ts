import { FastifyInstance } from "fastify";
import Database from "better-sqlite3";
import websocket from "@fastify/websocket";
import WebSocket from "ws";

import { getPrinterById } from "../db/connection";
import { PrinterConnectionManager } from "../sdcp/connectionManager";
import { PrinterRemovalEvent, PrinterStateEvent } from "../sdcp/types";

export async function registerFrontendWebsocket(
  app: FastifyInstance,
  database: Database.Database,
  connectionManager: PrinterConnectionManager
): Promise<void> {
  await app.register(websocket);

  app.get("/ws", { websocket: true }, (connection) => {
    const client = connection;

    const forwardState = (event: PrinterStateEvent) => {
      const printer = getPrinterById(database, event.printerId);
      if (!printer) {
        return;
      }

      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "printer-state", payload: { printer, state: event.state } }));
      }
    };

    const forwardRemoved = (event: PrinterRemovalEvent) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "printer-removed", payload: event }));
      }
    };

    connectionManager.on("state", forwardState);
    connectionManager.on("removed", forwardRemoved);

    client.send(JSON.stringify({ type: "initial-state", payload: connectionManager.getPrinterSnapshots() }));

    client.on("close", () => {
      connectionManager.off("state", forwardState);
      connectionManager.off("removed", forwardRemoved);
    });
  });
}
