from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class SurveyMeasurement(BaseModel):
    id: str
    xM: float
    yM: float
    zM: float = 1.2
    band: str = "5"
    bssid: Optional[str] = None
    apLabel: Optional[str] = None
    channel: Optional[int] = None
    measuredRssiDbm: float
    predictedRssiDbm: Optional[float] = None
    deltaDb: Optional[float] = None  # predicted - measured
    timestamp: Optional[str] = None
    clientDevice: Optional[str] = "Zebra TC57 Handheld"


class SurveyDataSet(BaseModel):
    id: str
    name: str = "Warehouse Actual Walkthrough Survey"
    projectId: str
    surveyDate: str
    totalPoints: int
    measurements: List[SurveyMeasurement]


class CalibrationResult(BaseModel):
    originalMaeDb: float
    originalRmseDb: float
    calibratedMaeDb: float
    calibratedRmseDb: float
    originalPathLossExponent: float
    recommendedPathLossExponent: float
    status: str  # 'calibrated', 'insufficient_data'
    summaryMessage: str
    samplePoints: List[SurveyMeasurement]
