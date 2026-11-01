import json
import logging
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Response, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

import time
from app.models.project import (
    ProjectData,
    CreateProjectRequest,
    AutoPlanRequest,
    DetectWallsRequest,
    DetectWallsResponse,
)
from app.rf_engine.wall_detector import auto_detect_walls_from_image
from app.models.rf import HeatmapRequest, HeatmapResponse, SampleRequest, SampleResponse
from app.models.cisco import (
    ControllerConfig,
    TestConnectionRequest,
    TestConnectionResponse,
    CiscoApInventoryItem,
    MapApRequest,
)
from app.models.survey import SurveyDataSet, CalibrationResult
from app.rf_engine.calculator import calculate_heatmap_grid, calculate_sample_point
from app.rf_engine.catalog import DEFAULT_MATERIALS, AP_CATALOG
from app.rf_engine.ai_planner import plan_ap_placement
from app.cisco_wlc.adapter import (
    CONTROLLERS_DB,
    test_wlc_connection,
    get_controller_inventory,
)
from app.survey.calibration import calibrate_path_loss_exponent
from app.reports.pdf_generator import generate_project_pdf_report
from app.initial_project import get_default_warehouse_project
from app.projects.store import (
    list_projects,
    get_project_by_id,
    save_project_to_store,
    create_new_project,
    delete_project_from_store,
    ensure_projects_storage
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("wifi-rf-planner")

# Initialize persistent storage on launch
ensure_projects_storage()

app = FastAPI(
    title="Wi-Fi RF Planner Backend API",
    description="Predictive Wi-Fi RF propagation, 3D obstacle attenuation, AI Auto-placement & Cisco 9800 WLC integration",
    version="1.1.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active in-memory project state
CURRENT_PROJECT: ProjectData = get_project_by_id("warehouse-tan-tao") or get_default_warehouse_project()


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Wi-Fi RF Planner Backend & Prediction Engine",
        "version": "1.1.0",
        "activeProject": CURRENT_PROJECT.project.name,
        "activeProjectId": CURRENT_PROJECT.project.id
    }


@app.get("/api/catalog/materials")
def get_materials():
    return DEFAULT_MATERIALS


@app.get("/api/catalog/aps")
def get_ap_catalog():
    return AP_CATALOG


# --- Project Management Endpoints ---

@app.get("/api/projects")
def get_all_projects():
    return list_projects()


@app.post("/api/projects", response_model=ProjectData)
def create_project_endpoint(req: CreateProjectRequest):
    global CURRENT_PROJECT
    new_proj = create_new_project(
        name=req.name,
        floor_height_m=req.floorHeightM,
        building_type=req.buildingType,
        bg_data_url=req.bgDataUrl,
        bg_file_name=req.bgFileName,
        width_px=req.widthPx,
        height_px=req.heightPx,
        estimated_width_m=req.estimatedWidthM,
        estimated_height_m=req.estimatedHeightM
    )
    CURRENT_PROJECT = new_proj
    logger.info(f"Created new project '{new_proj.project.id}' ({new_proj.project.name})")
    return new_proj


@app.get("/api/projects/current", response_model=ProjectData)
def get_current_project():
    return CURRENT_PROJECT


@app.get("/api/projects/{project_id}", response_model=ProjectData)
def load_project_by_id(project_id: str):
    global CURRENT_PROJECT
    proj = get_project_by_id(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")
    CURRENT_PROJECT = proj
    logger.info(f"Switched active project to '{project_id}' ({proj.project.name})")
    return CURRENT_PROJECT


@app.put("/api/projects/{project_id}", response_model=ProjectData)
def update_project_by_id(project_id: str, project: ProjectData):
    global CURRENT_PROJECT
    project.project.id = project_id
    saved = save_project_to_store(project)
    CURRENT_PROJECT = saved
    logger.info(f"Updated project '{project_id}' in persistent storage")
    return saved


@app.delete("/api/projects/{project_id}")
def delete_project_endpoint(project_id: str):
    global CURRENT_PROJECT
    success = delete_project_from_store(project_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")
    # If deleting current project, switch to default
    if CURRENT_PROJECT.project.id == project_id:
        CURRENT_PROJECT = get_default_warehouse_project()
    return {"success": True, "deletedProjectId": project_id}


@app.post("/api/projects/save", response_model=ProjectData)
def save_project(project: ProjectData):
    global CURRENT_PROJECT
    CURRENT_PROJECT = save_project_to_store(project)
    logger.info(f"Project '{project.project.id}' updated with {len(project.aps)} APs and {len(project.obstacles)} obstacles.")
    return CURRENT_PROJECT


@app.post("/api/projects/reset-default", response_model=ProjectData)
def reset_default_project():
    global CURRENT_PROJECT
    CURRENT_PROJECT = get_default_warehouse_project()
    save_project_to_store(CURRENT_PROJECT)
    return CURRENT_PROJECT


# --- RF Simulation & AI Auto-Placement Endpoints ---

@app.post("/api/simulation/heatmap", response_model=HeatmapResponse)
def compute_heatmap(request: HeatmapRequest):
    from app.projects.store import get_project_by_id
    if request.project:
        project = request.project
    elif request.projectId:
        project = get_project_by_id(request.projectId) or CURRENT_PROJECT
    else:
        project = CURRENT_PROJECT
    return calculate_heatmap_grid(request, project)


@app.post("/api/simulation/sample", response_model=SampleResponse)
def compute_sample(request: SampleRequest):
    from app.projects.store import get_project_by_id
    if request.project:
        project = request.project
    elif request.projectId:
        project = get_project_by_id(request.projectId) or CURRENT_PROJECT
    else:
        project = CURRENT_PROJECT
    return calculate_sample_point(request, project)




@app.post("/api/simulation/detect-walls", response_model=DetectWallsResponse)
def detect_walls_endpoint(req: DetectWallsRequest):
    start_t = time.perf_counter()
    image_data = req.imageDataUrl
    ppm = req.pixelsPerMeter
    floor_h = req.floorHeightM or 3.5

    target_project = None
    if req.projectId:
        from app.projects.store import get_project_by_id, save_project_to_store
        target_project = get_project_by_id(req.projectId) or CURRENT_PROJECT
        if not image_data and target_project.background.imageDataUrl:
            image_data = target_project.background.imageDataUrl
        if not ppm and target_project.project.scale.pixelsPerMeter:
            ppm = target_project.project.scale.pixelsPerMeter
        if not floor_h and target_project.project.floorHeightM:
            floor_h = target_project.project.floorHeightM

    if not image_data:
        raise HTTPException(
            status_code=400,
            detail="Không tìm thấy tệp ảnh bản vẽ 2D để nhận diện tường. Vui lòng nạp bản vẽ trước."
        )

    ppm = ppm or 20.0

    try:
        detected = auto_detect_walls_from_image(
            image_data=image_data,
            ppm=ppm,
            sensitivity=req.sensitivity,
            default_material=req.defaultMaterial,
            floor_height_m=floor_h
        )
    except Exception as e:
        logger.error(f"Error detecting walls: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi nhận diện tường: {str(e)}")

    elapsed = (time.perf_counter() - start_t) * 1000.0

    if target_project and req.replaceExisting:
        from app.projects.store import save_project_to_store
        target_project.obstacles = detected
        save_project_to_store(target_project)
        logger.info(f"Updated {len(detected)} walls in project '{target_project.project.id}'")

    return DetectWallsResponse(
        success=True,
        walls=detected,
        wallCount=len(detected),
        calcTimeMs=round(elapsed, 2),
        message=f"Đã nhận diện thành công {len(detected)} bức tường từ bản vẽ."
    )


@app.post("/api/simulation/auto-plan")
def ai_auto_plan(req: AutoPlanRequest):
    """
    AI Auto-placement algorithm for selected coverage zone.
    Returns optimal AP positions, antenna models, channels, and coverage metrics.
    """
    from app.projects.store import get_project_by_id
    active_p = get_project_by_id(req.projectId) if hasattr(req, "projectId") and req.projectId else CURRENT_PROJECT
    if not active_p:
        active_p = CURRENT_PROJECT
    rx_h = active_p.project.receiverProfile.heightM
    ple = active_p.simulation.pathLossExponent
    existing_count = len(active_p.aps)

    plan = plan_ap_placement(
        zone_x=req.zoneX,
        zone_y=req.zoneY,
        zone_width=req.zoneWidth,
        zone_height=req.zoneHeight,
        ap_model=req.apModel,
        height_m=req.heightM,
        tx_power_dbm=req.txPowerDbm,
        band=req.band,
        target_rssi_dbm=req.targetRssiDbm,
        redundancy=req.redundancy,
        receiver_height_m=rx_h,
        path_loss_exponent=ple,
        existing_ap_count=existing_count,
        obstacles=active_p.obstacles,
        exclusion_zones=req.exclusionZones if req.exclusionZones is not None else getattr(active_p, 'exclusionZones', []),
        optimize_for_rooms=req.optimizeForRooms
    )
    return plan


# --- Cisco Catalyst 9800 Endpoints ---

@app.get("/api/controllers", response_model=List[ControllerConfig])
def list_controllers():
    safe_list = []
    for c in CONTROLLERS_DB.values():
        copy_c = c.model_copy()
        copy_c.password = None  # sanitize
        safe_list.append(copy_c)
    return safe_list


@app.post("/api/controllers/test", response_model=TestConnectionResponse)
async def test_controller(req: TestConnectionRequest):
    return await test_wlc_connection(req.host, req.port, req.username, req.password, req.verifyTls)


@app.get("/api/controllers/{controller_id}/aps", response_model=List[CiscoApInventoryItem])
async def get_controller_aps(controller_id: str):
    inventory = await get_controller_inventory(controller_id)
    mapped_macs = {ap.wlcBinding.apMac: ap.id for ap in CURRENT_PROJECT.aps if ap.wlcBinding.apMac}
    for item in inventory:
        item.mappedProjectApId = mapped_macs.get(item.apMac)
    return inventory


@app.post("/api/projects/map-ap")
def map_ap_to_wlc(req: MapApRequest):
    global CURRENT_PROJECT
    found = False
    for ap in CURRENT_PROJECT.aps:
        if ap.id == req.projectApId:
            ap.wlcBinding.controllerId = req.controllerId
            ap.wlcBinding.apMac = req.apMac
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="AP not found in project")
    return {"success": True, "message": f"Mapped AP {req.projectApId} to WLC AP MAC {req.apMac}"}


# --- Survey & Calibration Endpoints ---

@app.post("/api/survey/calibrate", response_model=CalibrationResult)
def calibrate_survey(survey: SurveyDataSet):
    return calibrate_path_loss_exponent(survey.measurements, CURRENT_PROJECT)


# --- Report Generation Endpoint ---

@app.post("/api/reports/pdf")
def export_pdf_report(project: Optional[ProjectData] = None):
    target_project = project if project else CURRENT_PROJECT
    pdf_bytes = generate_project_pdf_report(target_project)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="WiFi_RF_Plan_{target_project.project.id}.pdf"'}
    )

