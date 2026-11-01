from typing import List, Dict, Optional, Any, Union
from pydantic import BaseModel, Field


class ScaleConfig(BaseModel):
    calibrated: bool = False
    pixelsPerMeter: float = 20.0
    referenceLengthM: float = 10.0


class ReceiverProfile(BaseModel):
    id: str = "barcode-pda"
    name: str = "Barcode PDA (Zebra TC5x)"
    heightM: float = 1.2
    bandsGHz: List[float] = [2.4, 5.0]
    targetRssiDbm: float = -65.0
    targetSnrDb: float = 25.0
    rxGainDbi: float = 0.0


class ProjectMeta(BaseModel):
    id: str = "warehouse-demo"
    name: str = "Kho Trung TÃ¢m TÃ¢n Táº¡o (Demo Floor)"
    units: str = "m"
    floorHeightM: float = 8.0
    scale: ScaleConfig = Field(default_factory=ScaleConfig)
    receiverProfile: ReceiverProfile = Field(default_factory=ReceiverProfile)


class BackgroundConfig(BaseModel):
    type: str = "preset"  # 'pdf-page-render', 'image', 'preset'
    fileId: Optional[str] = "warehouse-blueprint"
    fileName: Optional[str] = "Warehouse-Ground-Floor.pdf"
    page: int = 1
    opacity: float = 0.85
    imageDataUrl: Optional[str] = None
    widthPx: int = 1600
    heightPx: int = 1000


class Material(BaseModel):
    id: str
    name: str
    attenuationDb: Dict[str, float]  # "2.4", "5", "6"
    defaultThicknessM: float = 0.15
    color: str = "#f59e0b"
    assumption: bool = True
    description: Optional[str] = None


class Obstacle(BaseModel):
    id: str
    type: str = "wall"  # 'wall', 'rack', 'area'
    name: Optional[str] = None
    pointsM: List[List[float]]  # [[x1, y1], [x2, y2]] or polygon [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
    heightM: float = 3.5
    thicknessM: float = 0.15
    materialId: str
    attenuationDbPerM: Optional[float] = None  # for warehouse racks with volumetric cargo


class RadioConfig(BaseModel):
    enabled: bool = True
    channelMHz: int = 5180
    channelNumber: int = 36
    txPowerDbm: float = 14.0
    channelWidthMHz: int = 20
    cableLossDb: float = 0.0
    antennaGainDbi: float = 4.0
    reason: Optional[str] = None


class Position3D(BaseModel):
    x: float
    y: float
    z: float = 4.5  # mounting height in meters


class WlcBinding(BaseModel):
    controllerId: Optional[str] = None
    apMac: Optional[str] = None
    ipAddress: Optional[str] = None
    syncedAt: Optional[str] = None


class AccessPoint(BaseModel):
    id: str
    label: str
    vendor: str = "Cisco"
    model: str = "C9120AXI"
    positionM: Position3D
    mountingType: str = "ceiling"  # 'ceiling', 'wall', 'pole'
    orientationDeg: float = 0.0    # azimuth angle 0-360
    elevationDeg: float = 0.0      # downtilt angle e.g. -30 for warehouse aisle
    antennaType: str = "omni"       # 'omni', 'directional_patch', 'aisle_narrow'
    radios: Dict[str, RadioConfig]
    wlcBinding: WlcBinding = Field(default_factory=WlcBinding)


class SimulationConfig(BaseModel):
    model: str = "log-distance-wall-loss-v1"
    gridSizeM: float = 0.5
    pathLossExponent: float = 2.8
    referenceDistanceM: float = 1.0
    noiseFloorDbm: Dict[str, float] = Field(
        default_factory=lambda: {"2.4": -92.0, "5": -92.0, "6": -92.0}
    )
    showLayer: str = "5"
    revision: int = 1
    calibrationStatus: str = "uncalibrated"  # 'uncalibrated', 'calibrated'


class ProjectData(BaseModel):
    schemaVersion: int = 1
    project: ProjectMeta = Field(default_factory=ProjectMeta)
    background: BackgroundConfig = Field(default_factory=BackgroundConfig)
    materials: List[Material] = Field(default_factory=list)
    obstacles: List[Obstacle] = Field(default_factory=list)
    exclusionZones: List[Dict[str, Any]] = Field(default_factory=list)
    aps: List[AccessPoint] = Field(default_factory=list)
    simulation: SimulationConfig = Field(default_factory=SimulationConfig)

class CreateProjectRequest(BaseModel):
    name: str
    floorHeightM: float = 6.0
    buildingType: str = "warehouse"
    bgDataUrl: Optional[str] = None
    bgFileName: Optional[str] = None
    widthPx: int = 1400
    heightPx: int = 900
    estimatedWidthM: float = 60.0
    estimatedHeightM: float = 36.0


class AutoPlanRequest(BaseModel):
    projectId: Optional[str] = None
    zoneX: float
    zoneY: float
    zoneWidth: float
    zoneHeight: float
    apModel: str = "C9120AXI"
    heightM: float = 3.5
    txPowerDbm: float = 14.0
    band: str = "5"
    targetRssiDbm: float = -65.0
    redundancy: str = "standard"
    exclusionZones: Optional[List[Dict[str, Any]]] = None
    optimizeForRooms: bool = True


class DetectWallsRequest(BaseModel):
    projectId: Optional[str] = None
    imageDataUrl: Optional[str] = None
    pixelsPerMeter: Optional[float] = None
    floorHeightM: Optional[float] = None
    sensitivity: str = "medium"  # "low", "medium", "high"
    defaultMaterial: str = "brick_wall"
    replaceExisting: bool = True


class DetectWallsResponse(BaseModel):
    success: bool = True
    walls: List[Obstacle]
    wallCount: int
    calcTimeMs: float
    message: str



