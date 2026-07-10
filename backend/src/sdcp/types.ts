export interface SdcpDiscoveryAttributes {
  Name?: string;
  MachineName?: string;
  BrandName?: string;
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

export interface SdcpStatusPrintInfo {
  Status?: number;
  CurrentLayer?: number;
  TotalLayer?: number;
  CurrentTicks?: number;
  TotalTicks?: number;
  Filename?: string;
  ErrorNumber?: number;
  TaskId?: string;
  PrintSpeed?: number;
}

export interface SdcpStatusPayload {
  CurrentStatus?: number | number[];
  PreviousStatus?: number;
  TempOfNozzle?: number;
  TempTargetNozzle?: number;
  TempOfHotbed?: number;
  TempTargetHotbed?: number;
  TempOfBox?: number;
  TempTargetBox?: number;
  CurrenCoord?: string;
  CurrentCoord?: string;
  CurrentFanSpeed?: {
    ModelFan?: number;
    ModeFan?: number;
    AuxiliaryFan?: number;
    BoxFan?: number;
  };
  LightStatus?: {
    SecondLight?: number;
  };
  RgbLight?: [number, number, number];
  ZOffset?: number;
  PrintSpeed?: number;
  PrintScreen?: number;
  ReleaseFilm?: number;
  TempOfUVLED?: number;
  TimeLapseStatus?: number;
  PrintInfo?: SdcpStatusPrintInfo;
}

export interface SdcpAttributesPayload extends SdcpDiscoveryAttributes {
  XYZsize?: string;
  NumberOfVideoStreamConnected?: number;
  MaximumVideoStreamAllowed?: number;
  NumberOfCloudSDCPServicesConnected?: number;
  MaximumCloudSDCPSercicesAllowed?: number;
  NetworkStatus?: string;
  MainboardMAC?: string;
  UsbDiskStatus?: number;
  Capabilities?: string[];
  SupportFileType?: string[];
  DevicesStatus?: Record<string, number>;
  CameraStatus?: number;
  RemainingMemory?: number;
  SDCPStatus?: number;
}

export interface SdcpStatusFrame {
  Id?: string;
  Status?: SdcpStatusPayload;
  MainboardID?: string;
  TimeStamp?: number;
  Topic?: string;
}

export interface SdcpAttributesFrame {
  Id?: string;
  Attributes?: SdcpAttributesPayload;
  MainboardID?: string;
  TimeStamp?: number;
  Topic?: string;
}

export interface SdcpErrorFrame {
  Id?: string;
  Data?: {
    Data?: {
      ErrorCode?: number | string;
      Message?: string;
    };
    MainboardID?: string;
    TimeStamp?: number;
  };
  Topic?: string;
}

export interface SdcpRequestFrame {
  Id: string;
  Data: {
    Cmd: number;
    Data: Record<string, unknown>;
    RequestID: string;
    MainboardID: string;
    TimeStamp: number;
    From: number;
  };
  Topic: string;
}

export type PrinterSummaryStatus = "idle" | "printing" | "error" | "offline";
export type PrinterActivityStatus =
  | "idle"
  | "printing"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled"
  | "transferring"
  | "busy"
  | "unknown";

export interface PrinterTemperaturePoint {
  actual: number | null;
  target: number | null;
}

export interface PrinterState {
  printerId: number;
  mainboardId: string;
  ipAddress: string;
  displayName: string;
  machineName: string | null;
  protocolVersion: string | null;
  firmwareVersion: string | null;
  summaryStatus: PrinterSummaryStatus;
  activityStatus: PrinterActivityStatus;
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
    nozzle: PrinterTemperaturePoint;
    bed: PrinterTemperaturePoint;
    chamber: PrinterTemperaturePoint;
  };
  capabilities: string[];
  lastTopic: string | null;
  lastMessageAt: string | null;
  lastUpdatedAt: string;
  startedAt: string | null;
}

export interface PrinterStateEvent {
  printerId: number;
  state: PrinterState;
}

export interface PrinterRemovalEvent {
  printerId: number;
}
