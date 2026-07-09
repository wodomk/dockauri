import { FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";

import { PrinterConnectionManager } from "../sdcp/connectionManager";
import { RawPrinterStatusEvent } from "../sdcp/types";

export async function registerFrontendWebsocket(app: FastifyInstance, connectionManager: PrinterConnectionManager): Promise<void> {
  await app.register(websocket);

  app.get("/ws", { websocket: true }, (socket) => {
    const client = socket as WebSocket;

    const forwardStatus = (event: RawPrinterStatusEvent) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "printer-status", payload: event }));
      }
    };

    const forwardConnection = (event: { mainboardId: string; connected: boolean }) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "printer-connection", payload: event }));
      }
    };

    connectionManager.on("status", forwardStatus);
    connectionManager.on("connection", forwardConnection);

    client.send(JSON.stringify({ type: "hello", payload: { message: "Dockauri frontend channel connected." } }));

    client.on("close", () => {
      connectionManager.off("status", forwardStatus);
      connectionManager.off("connection", forwardConnection);
    });
  });
}
