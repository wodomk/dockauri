export interface PrinterRecord {
  id: number;
  mainboard_id: string;
  name: string | null;
  last_known_ip: string;
  source: "discovered" | "manual";
  created_at: string;
  last_seen_at: string;
}

export interface PrinterState {
  printerId: number;
  mainboardId: string;
  ipAddress: string;
  displayName: string;
  machineName: string | null;
  protocolVersion: string | null;
  firmwareVersion: string | null;
  summaryStatus: "idle" | "printing" | "error" | "offline";
  activityStatus: string;
  connected: boolean;
  progressPercent: number | null;
  currentFileName: string | null;
  currentLayer: number | null;
  totalLayers: number | null;
  currentTicks: number | null;
  totalTicks: number | null;
  machineStatusCode: number | null;
  previousMachineStatusCode: number | null;
  printStatusCode: number | null;
  errorCode: number | null;
  errorMessage: string | null;
  temperatures: {
    nozzle: {
      actual: number | null;
      target: number | null;
    };
    bed: {
      actual: number | null;
      target: number | null;
    };
    chamber: {
      actual: number | null;
      target: number | null;
    };
  };
  capabilities: string[];
  lastTopic: string | null;
  lastMessageAt: string | null;
  lastUpdatedAt: string;
  startedAt: string | null;
}

export interface PrinterSnapshot {
  printer: PrinterRecord;
  state: PrinterState;
}

export interface SettingsPayload {
  discoveryIntervalSeconds: number;
  theme: "light" | "dark" | "system";
}

export interface PrinterStateEvent {
  printerId: number;
  state: PrinterState;
}

export interface PrinterRemovalEvent {
  printerId: number;
}

export type FrontendSocketMessage =
  | { type: "initial-state"; payload: PrinterSnapshot[] }
  | { type: "printer-state"; payload: PrinterSnapshot }
  | { type: "printer-removed"; payload: PrinterRemovalEvent };
