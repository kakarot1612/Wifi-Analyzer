from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field
from app.models.project import ProjectData


class Bounds2D(BaseModel):
    minX: float = 0.0
    minY: float = 0.0
    maxX: float = 80.0
    maxY: float = 40.0


class HeatmapRequest(BaseModel):
    projectId: str = "warehouse-demo"
    revision: int = 1
    band: str = "5"  # '2.4', '5', '6'
    gridSizeM: float = 0.5
    receiverProfileId: Optional[str] = "barcode-pda"
    receiverHeightM: Optional[float] = 1.2
    boundsM: Optional[Bounds2D] = None
    project: Optional[ProjectData] = None


class GridData(BaseModel):
    originM: List[float] = [0.0, 0.0]
    cellSizeM: float = 0.5
    width: int
    height: int
    rssiDbm: List[float]  # flattened width*height
    snrDb: List[float]
    servingApIndex: List[int]
    apOverlapCount: List[int]  # number of APs with RSSI >= target


class HeatmapResponse(BaseModel):
    revision: int
    band: str
    units: Dict[str, str] = {"rssi": "dBm", "pathLoss": "dB", "snr": "dB"}
    grid: GridData
    apLegend: List[Dict[str, Any]]
    assumptions: List[str]
    calcTimeMs: float


class SampleRequest(BaseModel):
    projectId: str = "warehouse-demo"
    band: str = "5"
    xM: float
    yM: float
    zM: Optional[float] = 1.2
    project: Optional[ProjectData] = None


class ObstacleHit(BaseModel):
    obstacleId: str
    obstacleName: str
    materialName: str
    lossDb: float
    thicknessM: float


class ApSignalSample(BaseModel):
    apId: str
    apLabel: str
    model: str
    channel: int
    frequencyMHz: int
    txPowerDbm: float
    eirpDbm: float
    distance3DM: float
    freeSpaceLossDb: float
    obstacleLossDb: float
    antennaGainDbi: float
    rssiDbm: float
    snrDb: float
    crossedObstacles: List[ObstacleHit]


class SampleResponse(BaseModel):
    pointM: List[float]
    band: str
    noiseFloorDbm: float
    servingApId: Optional[str]
    bestRssiDbm: float
    bestSnrDb: float
    targetRssiDbm: float
    targetSnrDb: float
    status: str  # 'very_good', 'good', 'moderate', 'weak', 'very_weak'
    apSignals: List[ApSignalSample]
