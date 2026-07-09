export interface SdcpDiscoveryAttributes {
  Name?: string;
  MachineName?: string;
  MainboardIP?: string;
  MainboardID?: string;
  ProtocolVersion?: string;
  FirmwareVersion?: string;
}

export interface SdcpDiscoveryResponse {
  Id?: string;
  Data?: SdcpDiscoveryAttributes | { Attributes?: SdcpDiscoveryAttributes };
}

export interface NormalizedDiscoveredPrinter {
  id: string;
  name: string;
  machineName: string;
  mainboardIp: string;
  mainboardId: string;
  protocolVersion: string;
  firmwareVersion: string;
}

export interface DiscoveryRunResult {
  discoveredCount: number;
  printers: NormalizedDiscoveredPrinter[];
  durationMs: number;
  startedAt: string;
  finishedAt: string;
}

export interface RawPrinterStatusEvent {
  printerId: number;
  mainboardId: string;
  ipAddress: string;
  payload: string;
  receivedAt: string;
}
