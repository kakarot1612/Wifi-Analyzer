from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class ControllerConfig(BaseModel):
    id: str
    name: str = "Cisco Catalyst 9800-CL (Production WLC)"
    host: str = "10.10.20.50"
    port: int = 443
    username: str = "restconf_ro"
    password: Optional[str] = None  # sensitive, stripped on output
    verifyTls: bool = False
    iosXeVersion: str = "17.9.4a"
    status: str = "connected"  # 'connected', 'error', 'untested'
    lastSyncTime: Optional[str] = None


class CiscoRadioInfo(BaseModel):
    band: str  # '2.4', '5', '6'
    radioSlot: int
    adminState: str = "enabled"
    operationalState: str = "up"
    channel: int
    channelWidthMHz: int
    txPowerDbm: float
    antennaType: str = "internal"
    antennaGainDbi: float
    noiseFloorDbm: float = -95.0
    clientCount: int = 0


class CiscoApInventoryItem(BaseModel):
    apMac: str
    apName: str
    serialNumber: str
    model: str  # e.g., 'C9120AXI-B', 'C9130AXE-B', 'C9166I-B'
    ipAddress: str
    joined: bool = True
    locationString: Optional[str] = "Warehouse-Building-A"
    softwareVersion: str = "17.9.4a"
    radios: List[CiscoRadioInfo]
    mappedProjectApId: Optional[str] = None


class TestConnectionRequest(BaseModel):
    host: str
    port: int = 443
    username: str
    password: str
    verifyTls: bool = False


class TestConnectionResponse(BaseModel):
    success: bool
    message: str
    detectedPlatform: Optional[str] = "Cisco Catalyst 9800 Wireless Controller"
    iosXeVersion: Optional[str] = "17.9.4a"
    supportedYangModules: List[str] = Field(default_factory=list)


class MapApRequest(BaseModel):
    projectId: str
    projectApId: str
    controllerId: str
    apMac: str
