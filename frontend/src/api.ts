import { FrontendSocketMessage, PrinterSnapshot, SettingsPayload } from "./types";

const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:8080`;
const WS_PROTOCOL = window.location.protocol === "https:" ? "wss:" : "ws:";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error ?? `Request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

export async function fetchPrinters(): Promise<PrinterSnapshot[]> {
  const response = await requestJson<{ printers: PrinterSnapshot[] }>("/api/printers");
  return response.printers;
}

export async function addPrinter(ipAddress: string): Promise<PrinterSnapshot> {
  const response = await requestJson<{ printer: PrinterSnapshot["printer"]; state: PrinterSnapshot["state"] }>("/api/printers", {
    method: "POST",
    body: JSON.stringify({ ip: ipAddress })
  });

  return {
    printer: response.printer,
    state: response.state
  };
}

export async function deletePrinter(printerId: number): Promise<void> {
  await requestJson(`/api/printers/${printerId}`, {
    method: "DELETE"
  });
}

export async function fetchSettings(): Promise<SettingsPayload> {
  return await requestJson<SettingsPayload>("/api/settings");
}

export async function saveSettings(payload: Partial<SettingsPayload>): Promise<SettingsPayload> {
  return await requestJson<SettingsPayload>("/api/settings", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function createPrinterSocket(onMessage: (message: FrontendSocketMessage) => void): WebSocket {
  const socket = new WebSocket(`${WS_PROTOCOL}//${window.location.hostname}:8080/ws`);
  socket.addEventListener("message", (event) => {
    try {
      onMessage(JSON.parse(event.data) as FrontendSocketMessage);
    } catch (error) {
      console.warn("Ignoring malformed frontend WebSocket payload.", error);
    }
  });

  return socket;
}
