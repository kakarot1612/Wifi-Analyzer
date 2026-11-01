export interface ScaleConfig {
  calibrated: boolean;
  pixelsPerMeter: number;
  referenceLengthM: number;
}

export interface ReceiverProfile {
  id: string;
  name: string;
  heightM: number;
  bandsGHz: number[];
  targetRssiDbm: number;
  targetSnrDb: number;
  rxGainDbi: number;
}

export interface ProjectMeta {
  id: string;
  name: string;
  units: string;
  floorHeightM: number;
  scale: ScaleConfig;
  receiverProfile: ReceiverProfile;
}

export interface BackgroundConfig {
  type: string;
  fileId?: string;
  fileName?: string;
  page: number;
  opacity: number;
  imageDataUrl?: string | null;
  widthPx: number;
  heightPx: number;
}

export interface Material {
  id: string;
  name: string;
  attenuationDb: { [band: string]: number };
  defaultThicknessM: number;
  color: string;
  assumption: boolean;
  description?: string;
}

export interface Obstacle {
  id: string;
  type: 'wall' | 'rack' | 'area';
  name?: string;
  pointsM: [number, number][];
  heightM: number;
  thicknessM: number;
  materialId: string;
  attenuationDbPerM?: number;
}

export interface RadioConfig {
  enabled: boolean;
  channelNumber: number;
  channelMHz?: number;
  txPowerDbm: number;
  channelWidthMHz?: number;
  cableLossDb?: number;
  antennaGainDbi: number;
  reason?: string;
}

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface WlcBinding {
  controllerId?: string | null;
  apMac?: string | null;
  ipAddress?: string | null;
  syncedAt?: string | null;
}

export interface AccessPoint {
  id: string;
  label: string;
  vendor: string;
  model: string;
  positionM: Position3D;
  mountingType: 'ceiling' | 'wall' | 'pole';
  orientationDeg: number;
  elevationDeg?: number;
  antennaType: 'omni' | 'directional_patch' | 'directional_aisle';
  radios: { [band: string]: RadioConfig };
  wlcBinding: WlcBinding;
}

export interface SimulationConfig {
  model: string;
  gridSizeM: number;
  pathLossExponent: number;
  referenceDistanceM: number;
  noiseFloorDbm: { [band: string]: number };
  showLayer: string;
  revision: number;
  calibrationStatus: 'uncalibrated' | 'calibrated';
}

export interface ExclusionZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProjectData {
  schemaVersion: number;
  project: ProjectMeta;
  background: BackgroundConfig;
  materials: Material[];
  obstacles: Obstacle[];
  exclusionZones?: ExclusionZone[];
  aps: AccessPoint[];
  simulation: SimulationConfig;
}

export interface ProjectSummary {
  id: string;
  name: string;
  floorHeightM: number;
  units: string;
  apCount: number;
  obstacleCount: number;
  calibrated: boolean;
  pixelsPerMeter: number;
  backgroundFileName?: string;
  backgroundType?: string;
  updatedAt: string;
  fileSizeKb: number;
}

export interface CreateProjectRequest {
  name: string;
  floorHeightM?: number;
  buildingType?: string;
  bgDataUrl?: string | null;
  bgFileName?: string | null;
  widthPx?: number;
  heightPx?: number;
  estimatedWidthM?: number;
  estimatedHeightM?: number;
}

export interface AutoPlanRequest {
  projectId?: string;
  zoneX: number;
  zoneY: number;
  zoneWidth: number;
  zoneHeight: number;
  apModel: string;
  heightM: number;
  txPowerDbm: number;
  band: string;
  targetRssiDbm: number;
  redundancy: 'standard' | 'high';
  exclusionZones?: ExclusionZone[];
  optimizeForRooms?: boolean;
}

export interface AutoPlanResponse {
  status: string;
  zone: {
    x: number;
    y: number;
    width: number;
    height: number;
    areaSqm: number;
  };
  rfProfile: {
    apModel: string;
    heightM: number;
    txPowerDbm: number;
    band: string;
    targetRssiDbm: number;
    effectiveRadiusM: number;
    max3DDistanceM: number;
    redundancy: string;
    coveragePct?: number;
  };
  stats: {
    apCount: number;
    areaPerApSqm: number;
    density: string;
    coveragePct?: number;
    roomAware?: boolean;
  };
  aps: AccessPoint[];
}

export interface GridData {
  originM: [number, number];
  cellSizeM: number;
  width: number;
  height: number;
  rssiDbm: number[];
  snrDb: number[];
  servingApIndex: number[];
  apOverlapCount: number[];
}

export interface ApLegendItem {
  apIndex: number;
  id: string;
  label: string;
  model: string;
  channel: number;
  txPowerDbm: number;
  position: [number, number, number];
}

export interface HeatmapResponse {
  revision: number;
  band: string;
  units: { [key: string]: string };
  grid: GridData;
  apLegend: ApLegendItem[];
  assumptions: string[];
  calcTimeMs: number;
}

export interface ObstacleHit {
  obstacleId: string;
  obstacleName: string;
  materialName: string;
  lossDb: number;
  thicknessM: number;
}

export interface ApSignalSample {
  apId: string;
  apLabel: string;
  model: string;
  channel: number;
  frequencyMHz: number;
  txPowerDbm: number;
  eirpDbm: number;
  distance3DM: number;
  freeSpaceLossDb: number;
  obstacleLossDb: number;
  antennaGainDbi: number;
  rssiDbm: number;
  snrDb: number;
  crossedObstacles: ObstacleHit[];
}

export interface SampleResponse {
  pointM: [number, number, number];
  band: string;
  noiseFloorDbm: number;
  servingApId: string | null;
  bestRssiDbm: number;
  bestSnrDb: number;
  targetRssiDbm: number;
  targetSnrDb: number;
  status: 'very_good' | 'good' | 'moderate' | 'weak' | 'very_weak';
  apSignals: ApSignalSample[];
}

export interface ControllerConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string | null;
  verifyTls: boolean;
  iosXeVersion: string;
  status: string;
  lastSyncTime?: string | null;
}

export interface CiscoRadioInfo {
  band: string;
  radioSlot: number;
  adminState: string;
  operationalState: string;
  channel: number;
  channelWidthMHz: number;
  txPowerDbm: number;
  antennaType: string;
  antennaGainDbi: number;
  noiseFloorDbm: number;
  clientCount: number;
}

export interface CiscoApInventoryItem {
  apMac: string;
  apName: string;
  serialNumber: string;
  model: string;
  ipAddress: string;
  joined: boolean;
  locationString?: string;
  softwareVersion: string;
  radios: CiscoRadioInfo[];
  mappedProjectApId?: string | null;
}

export interface SurveyMeasurement {
  id: string;
  xM: number;
  yM: number;
  zM: number;
  band: string;
  bssid?: string | null;
  apLabel?: string | null;
  channel?: number | null;
  measuredRssiDbm: number;
  predictedRssiDbm?: number | null;
  deltaDb?: number | null;
  timestamp?: string | null;
  clientDevice?: string | null;
}

export interface SurveyDataSet {
  id: string;
  name: string;
  projectId: string;
  surveyDate: string;
  totalPoints: number;
  measurements: SurveyMeasurement[];
}

export interface CalibrationResult {
  originalMaeDb: number;
  originalRmseDb: number;
  calibratedMaeDb: number;
  calibratedRmseDb: number;
  originalPathLossExponent: number;
  recommendedPathLossExponent: number;
  status: string;
  summaryMessage: string;
  samplePoints: SurveyMeasurement[];
}

export type ToolMode = 'select' | 'calibrate' | 'wall' | 'rack' | 'ap' | 'inspect' | 'survey' | 'ai_plan';
export type AppTab = 'design' | 'inspect' | 'survey' | 'wlc' | 'reports';
export type VisMetric = 'rssi' | 'snr' | 'serving' | 'overlap';
export type BandType = '2.4' | '5' | '6';

