import os
import json
import uuid
import datetime
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional

from app.models.project import (
    ProjectData,
    ProjectMeta,
    ScaleConfig,
    ReceiverProfile,
    BackgroundConfig,
    Material,
    Obstacle,
    AccessPoint,
    Position3D,
    RadioConfig,
    WlcBinding,
    SimulationConfig
)
from app.rf_engine.catalog import DEFAULT_MATERIALS
from app.initial_project import get_default_warehouse_project

logger = logging.getLogger("wifi-rf-planner.store")

DATA_DIR = Path("data/projects")


def ensure_projects_storage():
    """Ensure data/projects directory exists and is populated with initial sample projects."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    tan_tao_file = DATA_DIR / "warehouse-tan-tao.json"
    if not tan_tao_file.exists():
        p1 = get_default_warehouse_project()
        p1.project.id = "warehouse-tan-tao"
        p1.project.name = "Kho Trung Tâm Logistics Tân Tạo (Demo Floor 60x36m)"
        with open(tan_tao_file, "w", encoding="utf-8") as f:
            json.dump(p1.model_dump(), f, ensure_ascii=False, indent=2)

    office_file = DATA_DIR / "office-building-bpvn.json"
    if not office_file.exists():
        p2 = create_sample_office_project()
        with open(office_file, "w", encoding="utf-8") as f:
            json.dump(p2.model_dump(), f, ensure_ascii=False, indent=2)

    factory_file = DATA_DIR / "factory-zone-b.json"
    if not factory_file.exists():
        p3 = create_sample_factory_project()
        with open(factory_file, "w", encoding="utf-8") as f:
            json.dump(p3.model_dump(), f, ensure_ascii=False, indent=2)


def create_sample_office_project() -> ProjectData:
    materials = [Material(**m) for m in DEFAULT_MATERIALS]
    obstacles = [
        Obstacle(
            id="off-wall-n",
            name="Tường bao kính/bê tông Bắc",
            type="wall",
            pointsM=[[1.0, 1.0], [39.0, 1.0]],
            heightM=3.5,
            thicknessM=0.2,
            materialId="brick_wall"
        ),
        Obstacle(
            id="off-wall-s",
            name="Tường bao Nam",
            type="wall",
            pointsM=[[1.0, 24.0], [39.0, 24.0]],
            heightM=3.5,
            thicknessM=0.2,
            materialId="brick_wall"
        ),
        Obstacle(
            id="off-wall-w",
            name="Tường bao Tây",
            type="wall",
            pointsM=[[1.0, 1.0], [1.0, 24.0]],
            heightM=3.5,
            thicknessM=0.2,
            materialId="brick_wall"
        ),
        Obstacle(
            id="off-wall-e",
            name="Tường bao Đông",
            type="wall",
            pointsM=[[39.0, 1.0], [39.0, 24.0]],
            heightM=3.5,
            thicknessM=0.2,
            materialId="brick_wall"
        ),
        Obstacle(
            id="off-dry-1",
            name="Vách thạch cao Phòng Họp Lớn",
            type="wall",
            pointsM=[[1.0, 10.0], [15.0, 10.0]],
            heightM=3.5,
            thicknessM=0.1,
            materialId="drywall"
        ),
        Obstacle(
            id="off-dry-2",
            name="Vách ngăn Giám Đốc",
            type="wall",
            pointsM=[[15.0, 1.0], [15.0, 10.0]],
            heightM=3.5,
            thicknessM=0.1,
            materialId="drywall"
        ),
        Obstacle(
            id="off-glass-1",
            name="Vách kính phòng họp VIP",
            type="wall",
            pointsM=[[25.0, 1.0], [25.0, 12.0]],
            heightM=3.5,
            thicknessM=0.012,
            materialId="glass_window"
        ),
        Obstacle(
            id="off-glass-2",
            name="Vách kính hành lang VIP",
            type="wall",
            pointsM=[[25.0, 12.0], [39.0, 12.0]],
            heightM=3.5,
            thicknessM=0.012,
            materialId="glass_window"
        ),
    ]

    aps = [
        AccessPoint(
            id="off-ap-01",
            label="OFF-AP-01",
            vendor="Cisco",
            model="C9120AXI",
            positionM=Position3D(x=8.0, y=5.5, z=3.0),
            mountingType="ceiling",
            radios={
                "2.4": RadioConfig(enabled=True, channelNumber=1, txPowerDbm=12, antennaGainDbi=4.0),
                "5": RadioConfig(enabled=True, channelNumber=36, txPowerDbm=14, antennaGainDbi=5.0),
                "6": RadioConfig(enabled=False, channelNumber=37, txPowerDbm=12, antennaGainDbi=5.0),
            }
        ),
        AccessPoint(
            id="off-ap-02",
            label="OFF-AP-02",
            vendor="Cisco",
            model="C9120AXI",
            positionM=Position3D(x=20.0, y=17.0, z=3.0),
            mountingType="ceiling",
            radios={
                "2.4": RadioConfig(enabled=True, channelNumber=6, txPowerDbm=12, antennaGainDbi=4.0),
                "5": RadioConfig(enabled=True, channelNumber=52, txPowerDbm=14, antennaGainDbi=5.0),
                "6": RadioConfig(enabled=False, channelNumber=37, txPowerDbm=12, antennaGainDbi=5.0),
            }
        ),
        AccessPoint(
            id="off-ap-03",
            label="OFF-AP-03",
            vendor="Cisco",
            model="C9120AXI",
            positionM=Position3D(x=32.0, y=6.0, z=3.0),
            mountingType="ceiling",
            radios={
                "2.4": RadioConfig(enabled=True, channelNumber=11, txPowerDbm=12, antennaGainDbi=4.0),
                "5": RadioConfig(enabled=True, channelNumber=100, txPowerDbm=14, antennaGainDbi=5.0),
                "6": RadioConfig(enabled=False, channelNumber=37, txPowerDbm=12, antennaGainDbi=5.0),
            }
        ),
    ]

    return ProjectData(
        schemaVersion=1,
        project=ProjectMeta(
            id="office-building-bpvn",
            name="Tòa Nhà Văn Phòng Điều Hành BPVN (Floor 2)",
            units="m",
            floorHeightM=3.5,
            scale=ScaleConfig(calibrated=True, pixelsPerMeter=24.0, referenceLengthM=40.0),
            receiverProfile=ReceiverProfile(
                id="laptop-office",
                name="Laptop & Mobile Văn Phòng",
                heightM=1.0,
                bandsGHz=[2.4, 5.0],
                targetRssiDbm=-65.0,
                targetSnrDb=25.0
            )
        ),
        background=BackgroundConfig(
            type="preset",
            fileName="BPVN-Office-Floor2.pdf",
            widthPx=1200,
            heightPx=750,
            opacity=0.85
        ),
        materials=materials,
        obstacles=obstacles,
        aps=aps,
        simulation=SimulationConfig(
            gridSizeM=0.5,
            pathLossExponent=2.6,
            showLayer="5"
        )
    )


def create_sample_factory_project() -> ProjectData:
    materials = [Material(**m) for m in DEFAULT_MATERIALS]
    obstacles = [
        Obstacle(
            id="fac-wall-n",
            name="Tường bê tông Bắc",
            type="wall",
            pointsM=[[2.0, 2.0], [68.0, 2.0]],
            heightM=10.0,
            thicknessM=0.25,
            materialId="concrete_heavy"
        ),
        Obstacle(
            id="fac-wall-s",
            name="Tường bê tông Nam",
            type="wall",
            pointsM=[[2.0, 43.0], [68.0, 43.0]],
            heightM=10.0,
            thicknessM=0.25,
            materialId="concrete_heavy"
        ),
        Obstacle(
            id="fac-wall-w",
            name="Tường bê tông Tây",
            type="wall",
            pointsM=[[2.0, 2.0], [2.0, 43.0]],
            heightM=10.0,
            thicknessM=0.25,
            materialId="concrete_heavy"
        ),
        Obstacle(
            id="fac-wall-e",
            name="Tường bê tông Đông",
            type="wall",
            pointsM=[[68.0, 2.0], [68.0, 43.0]],
            heightM=10.0,
            thicknessM=0.25,
            materialId="concrete_heavy"
        ),
        Obstacle(
            id="fac-door-1",
            name="Cửa cuốn xuất nhập hàng",
            type="wall",
            pointsM=[[30.0, 43.0], [42.0, 43.0]],
            heightM=6.0,
            thicknessM=0.05,
            materialId="metal_door_elevator"
        ),
    ]

    aps = [
        AccessPoint(
            id="fac-ap-01",
            label="FAC-AP-01",
            vendor="Cisco",
            model="C9130AXE-DIR",
            positionM=Position3D(x=15.0, y=12.0, z=7.0),
            mountingType="ceiling",
            antennaType="directional_aisle",
            radios={
                "2.4": RadioConfig(enabled=True, channelNumber=1, txPowerDbm=17, antennaGainDbi=6.0),
                "5": RadioConfig(enabled=True, channelNumber=36, txPowerDbm=18, antennaGainDbi=8.0),
            }
        ),
        AccessPoint(
            id="fac-ap-02",
            label="FAC-AP-02",
            vendor="Cisco",
            model="C9130AXE-DIR",
            positionM=Position3D(x=35.0, y=12.0, z=7.0),
            mountingType="ceiling",
            antennaType="directional_aisle",
            radios={
                "2.4": RadioConfig(enabled=True, channelNumber=6, txPowerDbm=17, antennaGainDbi=6.0),
                "5": RadioConfig(enabled=True, channelNumber=52, txPowerDbm=18, antennaGainDbi=8.0),
            }
        ),
        AccessPoint(
            id="fac-ap-03",
            label="FAC-AP-03",
            vendor="Cisco",
            model="C9130AXE-DIR",
            positionM=Position3D(x=55.0, y=12.0, z=7.0),
            mountingType="ceiling",
            antennaType="directional_aisle",
            radios={
                "2.4": RadioConfig(enabled=True, channelNumber=11, txPowerDbm=17, antennaGainDbi=6.0),
                "5": RadioConfig(enabled=True, channelNumber=100, txPowerDbm=18, antennaGainDbi=8.0),
            }
        ),
        AccessPoint(
            id="fac-ap-04",
            label="FAC-AP-04",
            vendor="Cisco",
            model="C9130AXE-DIR",
            positionM=Position3D(x=25.0, y=32.0, z=7.0),
            mountingType="ceiling",
            antennaType="directional_aisle",
            radios={
                "2.4": RadioConfig(enabled=True, channelNumber=1, txPowerDbm=17, antennaGainDbi=6.0),
                "5": RadioConfig(enabled=True, channelNumber=132, txPowerDbm=18, antennaGainDbi=8.0),
            }
        ),
        AccessPoint(
            id="fac-ap-05",
            label="FAC-AP-05",
            vendor="Cisco",
            model="C9130AXE-DIR",
            positionM=Position3D(x=48.0, y=32.0, z=7.0),
            mountingType="ceiling",
            antennaType="directional_aisle",
            radios={
                "2.4": RadioConfig(enabled=True, channelNumber=6, txPowerDbm=17, antennaGainDbi=6.0),
                "5": RadioConfig(enabled=True, channelNumber=149, txPowerDbm=18, antennaGainDbi=8.0),
            }
        ),
    ]

    return ProjectData(
        schemaVersion=1,
        project=ProjectMeta(
            id="factory-zone-b",
            name="Nhà Xưởng Sản Xuất Khu B (Trần 10m)",
            units="m",
            floorHeightM=10.0,
            scale=ScaleConfig(calibrated=True, pixelsPerMeter=18.0, referenceLengthM=70.0),
            receiverProfile=ReceiverProfile(
                id="industrial-tablet",
                name="Tablet Xe Nâng & AGV",
                heightM=1.5,
                bandsGHz=[2.4, 5.0],
                targetRssiDbm=-67.0,
                targetSnrDb=20.0
            )
        ),
        background=BackgroundConfig(
            type="preset",
            fileName="Factory-Zone-B-Blueprint.png",
            widthPx=1400,
            heightPx=900,
            opacity=0.85
        ),
        materials=materials,
        obstacles=obstacles,
        aps=aps,
        simulation=SimulationConfig(
            gridSizeM=0.5,
            pathLossExponent=3.0,
            showLayer="5"
        )
    )


def list_projects() -> List[Dict[str, Any]]:
    ensure_projects_storage()
    results = []
    for p_file in DATA_DIR.glob("*.json"):
        try:
            with open(p_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            meta = data.get("project", {})
            bg = data.get("background", {})
            results.append({
                "id": meta.get("id", p_file.stem),
                "name": meta.get("name", p_file.stem),
                "floorHeightM": meta.get("floorHeightM", 8.0),
                "units": meta.get("units", "m"),
                "apCount": len(data.get("aps", [])),
                "obstacleCount": len(data.get("obstacles", [])),
                "calibrated": meta.get("scale", {}).get("calibrated", False),
                "pixelsPerMeter": meta.get("scale", {}).get("pixelsPerMeter", 20.0),
                "backgroundFileName": bg.get("fileName"),
                "backgroundType": bg.get("type", "preset"),
                "updatedAt": datetime.datetime.fromtimestamp(p_file.stat().st_mtime).strftime("%d/%m/%Y %H:%M"),
                "fileSizeKb": round(p_file.stat().st_size / 1024, 1)
            })
        except Exception as e:
            logger.warning(f"Error reading project file {p_file}: {e}")
    results.sort(key=lambda x: x.get("updatedAt", ""), reverse=True)
    return results


def get_project_by_id(project_id: str) -> Optional[ProjectData]:
    ensure_projects_storage()
    file_path = DATA_DIR / f"{project_id}.json"
    if not file_path.exists():
        for p_file in DATA_DIR.glob("*.json"):
            try:
                with open(p_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if data.get("project", {}).get("id") == project_id:
                    return ProjectData(**data)
            except Exception:
                continue
        return None

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return ProjectData(**data)


def save_project_to_store(project: ProjectData) -> ProjectData:
    ensure_projects_storage()
    file_path = DATA_DIR / f"{project.project.id}.json"
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(project.model_dump(), f, ensure_ascii=False, indent=2)
    logger.info(f"Saved project {project.project.id} to {file_path}")
    return project


def create_new_project(
    name: str,
    floor_height_m: float = 6.0,
    building_type: str = "warehouse",
    bg_data_url: Optional[str] = None,
    bg_file_name: Optional[str] = None,
    width_px: int = 1400,
    height_px: int = 900,
    estimated_width_m: float = 60.0,
    estimated_height_m: float = 36.0
) -> ProjectData:
    ensure_projects_storage()
    project_id = f"proj-{uuid.uuid4().hex[:8]}"
    materials = [Material(**m) for m in DEFAULT_MATERIALS]

    if building_type == "office":
        profile = ReceiverProfile(
            id="laptop-office",
            name="Laptop & Mobile Văn Phòng",
            heightM=1.0,
            bandsGHz=[2.4, 5.0],
            targetRssiDbm=-65.0,
            targetSnrDb=25.0
        )
        ple = 2.6
    else:
        profile = ReceiverProfile(
            id="barcode-pda",
            name="Máy quét mã vạch Barcode PDA (Zebra TC52/TC57)",
            heightM=1.2,
            bandsGHz=[2.4, 5.0],
            targetRssiDbm=-65.0,
            targetSnrDb=25.0
        )
        ple = 2.8

    new_proj = ProjectData(
        schemaVersion=1,
        project=ProjectMeta(
            id=project_id,
            name=name,
            units="m",
            floorHeightM=floor_height_m,
            scale=ScaleConfig(calibrated=True, pixelsPerMeter=max(5.0, round(width_px / max(5.0, estimated_width_m), 2)), referenceLengthM=estimated_width_m),
            receiverProfile=profile
        ),
        background=BackgroundConfig(
            type="image" if bg_data_url else "preset",
            fileName=bg_file_name or "Mat-Bang-Kien-Truc-2D.png",
            imageDataUrl=bg_data_url,
            widthPx=width_px,
            heightPx=height_px,
            opacity=0.85
        ),
        materials=materials,
        obstacles=[],
        aps=[],
        simulation=SimulationConfig(
            gridSizeM=0.5,
            pathLossExponent=ple,
            showLayer="5"
        )
    )

    save_project_to_store(new_proj)
    return new_proj


def delete_project_from_store(project_id: str) -> bool:
    ensure_projects_storage()
    file_path = DATA_DIR / f"{project_id}.json"
    if file_path.exists():
        file_path.unlink()
        return True
    return False

