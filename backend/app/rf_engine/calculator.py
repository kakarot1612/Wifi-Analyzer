import time
import math
import numpy as np
from typing import List, Dict, Any, Tuple, Optional

from app.models.project import ProjectData, Obstacle, Material, AccessPoint
from app.models.rf import (
    HeatmapRequest,
    HeatmapResponse,
    GridData,
    SampleRequest,
    SampleResponse,
    ApSignalSample,
    ObstacleHit,
)
from app.rf_engine.geometry import (
    distance_3d,
    distance_2d,
    line_intersection_2d,
    ray_intersects_obstacle,
)
from app.rf_engine.catalog import calculate_antenna_gain


def get_frequency_mhz(band: str, channel: int) -> int:
    """Returns carrier center frequency in MHz from Wi-Fi band and channel."""
    if band == "2.4":
        if channel == 14:
            return 2484
        return 2407 + channel * 5  # ch 1: 2412, ch 6: 2437, ch 11: 2462
    elif band == "5":
        # 5 GHz channels: 36 -> 5180, 40 -> 5200, etc.
        return 5000 + channel * 5
    elif band == "6":
        # 6 GHz channels: 1 -> 5955, etc.
        return 5950 + channel * 5
    return 5180


def free_space_path_loss_1m(freq_mhz: float) -> float:
    """
    FSPL at d0 = 1m in dB:
    FSPL(d0) = 32.44 + 20*log10(f_MHz) + 20*log10(0.001 km)
             = 32.44 + 20*log10(f_MHz) - 60
             = -27.56 + 20*log10(f_MHz)
    """
    return -27.56 + 20.0 * math.log10(max(freq_mhz, 1.0))


def calculate_heatmap_grid(request: HeatmapRequest, project: ProjectData) -> HeatmapResponse:
    start_time = time.perf_counter()
    band = request.band
    grid_size = request.gridSizeM or project.simulation.gridSizeM or 0.5
    path_loss_exp = project.simulation.pathLossExponent or 2.8
    ref_dist = project.simulation.referenceDistanceM or 1.0
    rx_height = request.receiverHeightM or project.project.receiverProfile.heightM or 1.2
    target_rssi = project.project.receiverProfile.targetRssiDbm or -65.0
    rx_gain = project.project.receiverProfile.rxGainDbi or 0.0

    noise_floor = project.simulation.noiseFloorDbm.get(band, -92.0)

    # Determine bounds from request or obstacles/APs
    if request.boundsM:
        min_x, min_y = request.boundsM.minX, request.boundsM.minY
        max_x, max_y = request.boundsM.maxX, request.boundsM.maxY
    else:
        # Determine exact bounds from project scale and background width/height
        ppm = max(project.project.scale.pixelsPerMeter or 20.0, 0.5)
        bg_w = project.background.widthPx or 1000
        bg_h = project.background.heightPx or 600
        width_m = bg_w / ppm
        height_m = bg_h / ppm
        min_x, min_y = 0.0, 0.0
        max_x = width_m
        max_y = height_m

    # Generate 2D coordinate grid
    xs = np.arange(min_x, max_x + 1e-4, grid_size)
    ys = np.arange(min_y, max_y + 1e-4, grid_size)
    width = len(xs)
    height = len(ys)

    # Material dictionary
    mat_dict: Dict[str, Material] = {m.id: m for m in project.materials}

    # Filter APs that have the requested band enabled
    active_aps: List[Tuple[int, AccessPoint, Any]] = []
    ap_legend = []
    for idx, ap in enumerate(project.aps):
        radio = ap.radios.get(band)
        if radio and radio.enabled:
            active_aps.append((idx, ap, radio))
            ap_legend.append({
                "apIndex": idx,
                "id": ap.id,
                "label": ap.label,
                "model": ap.model,
                "channel": radio.channelNumber,
                "txPowerDbm": radio.txPowerDbm,
                "position": [ap.positionM.x, ap.positionM.y, ap.positionM.z],
            })

    if not active_aps:
        # Empty signal grid if no APs on this band
        empty_rssi = [-100.0] * (width * height)
        empty_snr = [0.0] * (width * height)
        empty_idx = [-1] * (width * height)
        empty_overlap = [0] * (width * height)
        return HeatmapResponse(
            revision=request.revision,
            band=band,
            grid=GridData(
                originM=[min_x, min_y],
                cellSizeM=grid_size,
                width=width,
                height=height,
                rssiDbm=empty_rssi,
                snrDb=empty_snr,
                servingApIndex=empty_idx,
                apOverlapCount=empty_overlap,
            ),
            apLegend=[],
            assumptions=["No APs configured or active on selected band"],
            calcTimeMs=(time.perf_counter() - start_time) * 1000.0,
        )

    # 2D Grid meshgrid
    grid_x, grid_y = np.meshgrid(xs, ys)  # shapes (height, width)

    # Initialize best RSSI and serving AP grids
    best_rssi_grid = np.full((height, width), -120.0, dtype=np.float32)
    serving_ap_grid = np.full((height, width), -1, dtype=np.int32)
    overlap_count_grid = np.zeros((height, width), dtype=np.int32)

    # Pre-parse obstacles for quick checking
    obstacle_list = []
    for obs in project.obstacles:
        mat = mat_dict.get(obs.materialId)
        loss_val = 6.0
        if mat:
            loss_val = mat.attenuationDb.get(band, 6.0)
        elif obs.attenuationDbPerM:
            loss_val = obs.attenuationDbPerM
        obstacle_list.append({
            "id": obs.id,
            "type": obs.type,
            "points": obs.pointsM,
            "height": obs.heightM,
            "lossDb": loss_val,
            "attenuationPerM": obs.attenuationDbPerM or loss_val
        })

    # For each active AP, calculate path loss and obstacle attenuation
    for orig_idx, ap, radio in active_aps:
        ap_pos_3d = (ap.positionM.x, ap.positionM.y, ap.positionM.z)
        freq_mhz = radio.channelMHz or get_frequency_mhz(band, radio.channelNumber)
        pl_d0 = free_space_path_loss_1m(freq_mhz)
        base_tx_gain = radio.antennaGainDbi
        cable_loss = radio.cableLossDb

        # 3D distance from AP to all grid cells
        dx = grid_x - ap.positionM.x
        dy = grid_y - ap.positionM.y
        dz = rx_height - ap.positionM.z
        dist_3d = np.sqrt(dx ** 2 + dy ** 2 + dz ** 2)
        dist_3d = np.maximum(dist_3d, ref_dist)

        # Log-distance path loss
        # PL(d) = PL(d0) + 10 * n * log10(d / d0)
        path_loss = pl_d0 + 10.0 * path_loss_exp * np.log10(dist_3d / ref_dist)

        # Antenna gain pattern (Omni or Directional)
        if ap.antennaType == "directional_aisle":
            # Compute angle for each grid point
            angles_rad = np.arctan2(dy, dx)
            angles_deg = np.degrees(angles_rad) % 360.0
            delta_angles = np.abs(angles_deg - ap.orientationDeg)
            delta_angles = np.where(delta_angles > 180.0, 360.0 - delta_angles, delta_angles)
            beamwidth = 65.0
            pattern_drop = np.minimum(12.0 * ((delta_angles / beamwidth) ** 2), 22.0)
            tx_gain = base_tx_gain - pattern_drop
        else:
            tx_gain = base_tx_gain

        eirp = radio.txPowerDbm + tx_gain - cable_loss

        # Obstacle attenuation matrix
        obstacle_loss = np.zeros((height, width), dtype=np.float32)

        # Ray-obstacle sampling on grid cells
        if obstacle_list:
            for r_idx in range(height):
                ry = ys[r_idx]
                for c_idx in range(width):
                    rx = xs[c_idx]
                    rx_pos_3d = (rx, ry, rx_height)
                    tot_loss = 0.0
                    for obs in obstacle_list:
                        hit, dist_inside = ray_intersects_obstacle(
                            ap_pos_3d, rx_pos_3d, obs["points"], obs["height"], obs["type"]
                        )
                        if hit:
                            if obs["type"] in ("rack", "area") and dist_inside > 0:
                                tot_loss += dist_inside * obs["attenuationPerM"]
                            else:
                                tot_loss += obs["lossDb"]
                    obstacle_loss[r_idx, c_idx] = tot_loss

        ap_rssi = eirp - path_loss - obstacle_loss + rx_gain

        # Update serving AP and overlap counts
        better_mask = ap_rssi > best_rssi_grid
        best_rssi_grid = np.where(better_mask, ap_rssi, best_rssi_grid)
        serving_ap_grid = np.where(better_mask, orig_idx, serving_ap_grid)

        # Overlap threshold
        overlap_count_grid += (ap_rssi >= target_rssi).astype(np.int32)

    # Compute SNR
    snr_grid = np.maximum(best_rssi_grid - noise_floor, 0.0)

    # Round results and flatten
    calc_time = (time.perf_counter() - start_time) * 1000.0

    return HeatmapResponse(
        revision=request.revision,
        band=band,
        grid=GridData(
            originM=[float(min_x), float(min_y)],
            cellSizeM=float(grid_size),
            width=width,
            height=height,
            rssiDbm=[round(float(v), 1) for v in best_rssi_grid.flatten()],
            snrDb=[round(float(v), 1) for v in snr_grid.flatten()],
            servingApIndex=[int(v) for v in serving_ap_grid.flatten()],
            apOverlapCount=[int(v) for v in overlap_count_grid.flatten()],
        ),
        apLegend=ap_legend,
        assumptions=[
            f"Log-distance path-loss model (exponent n={path_loss_exp:.2f})",
            f"Carrier frequency {band} GHz band with wall/rack 3D ray attenuation",
            f"Estimated noise floor: {noise_floor:.1f} dBm",
            "Predictive simulation; requires site survey calibration for production warehouse compliance"
        ],
        calcTimeMs=round(calc_time, 2),
    )


def calculate_sample_point(request: SampleRequest, project: ProjectData) -> SampleResponse:
    """Calculates detailed signal breakdown at a single probe point (x, y, z)."""
    band = request.band
    x, y = request.xM, request.yM
    z = request.zM or project.project.receiverProfile.heightM or 1.2
    rx_pos_3d = (x, y, z)

    path_loss_exp = project.simulation.pathLossExponent or 2.8
    ref_dist = project.simulation.referenceDistanceM or 1.0
    noise_floor = project.simulation.noiseFloorDbm.get(band, -92.0)
    target_rssi = project.project.receiverProfile.targetRssiDbm or -65.0
    target_snr = project.project.receiverProfile.targetSnrDb or 25.0
    rx_gain = project.project.receiverProfile.rxGainDbi or 0.0

    mat_dict = {m.id: m for m in project.materials}

    ap_signals: List[ApSignalSample] = []
    best_rssi = -120.0
    best_snr = 0.0
    serving_ap_id = None

    for ap in project.aps:
        radio = ap.radios.get(band)
        if not radio or not radio.enabled:
            continue

        ap_pos_3d = (ap.positionM.x, ap.positionM.y, ap.positionM.z)
        d3 = distance_3d(ap.positionM.x, ap.positionM.y, ap.positionM.z, x, y, z)
        eff_d3 = max(d3, ref_dist)
        freq_mhz = radio.channelMHz or get_frequency_mhz(band, radio.channelNumber)
        pl_d0 = free_space_path_loss_1m(freq_mhz)
        base_loss = pl_d0 + 10.0 * path_loss_exp * math.log10(eff_d3 / ref_dist)

        # Antenna gain
        ant_gain = calculate_antenna_gain(
            ap.antennaType, radio.antennaGainDbi, ap.orientationDeg, ap_pos_3d, rx_pos_3d
        )
        eirp = radio.txPowerDbm + ant_gain - radio.cableLossDb

        # Check all obstacles
        crossed_hits: List[ObstacleHit] = []
        tot_obstacle_loss = 0.0
        for obs in project.obstacles:
            hit, dist_inside = ray_intersects_obstacle(
                ap_pos_3d, rx_pos_3d, obs.pointsM, obs.heightM, obs.type
            )
            if hit:
                mat = mat_dict.get(obs.materialId)
                loss_db = mat.attenuationDb.get(band, 6.0) if mat else 6.0
                mat_name = mat.name if mat else "Vật cản"
                if obs.type in ("rack", "area") and dist_inside > 0:
                    unit_loss = obs.attenuationDbPerM or loss_db
                    actual_loss = dist_inside * unit_loss
                else:
                    actual_loss = loss_db

                tot_obstacle_loss += actual_loss
                crossed_hits.append(ObstacleHit(
                    obstacleId=obs.id,
                    obstacleName=obs.name or obs.id,
                    materialName=mat_name,
                    lossDb=round(actual_loss, 1),
                    thicknessM=obs.thicknessM
                ))

        rssi = eirp - base_loss - tot_obstacle_loss + rx_gain
        snr = max(rssi - noise_floor, 0.0)

        if rssi > best_rssi:
            best_rssi = rssi
            best_snr = snr
            serving_ap_id = ap.id

        ap_signals.append(ApSignalSample(
            apId=ap.id,
            apLabel=ap.label,
            model=ap.model,
            channel=radio.channelNumber,
            frequencyMHz=freq_mhz,
            txPowerDbm=radio.txPowerDbm,
            eirpDbm=round(eirp, 1),
            distance3DM=round(d3, 2),
            freeSpaceLossDb=round(base_loss, 1),
            obstacleLossDb=round(tot_obstacle_loss, 1),
            antennaGainDbi=round(ant_gain, 1),
            rssiDbm=round(rssi, 1),
            snrDb=round(snr, 1),
            crossedObstacles=crossed_hits,
        ))

    # Sort signals descending by RSSI
    ap_signals.sort(key=lambda s: s.rssiDbm, reverse=True)

    # Evaluate signal status
    if best_rssi >= -60.0:
        status = "very_good"
    elif best_rssi >= -67.0:
        status = "good"
    elif best_rssi >= -72.0:
        status = "moderate"
    elif best_rssi >= -75.0:
        status = "weak"
    else:
        status = "very_weak"

    return SampleResponse(
        pointM=[round(x, 2), round(y, 2), round(z, 2)],
        band=band,
        noiseFloorDbm=round(noise_floor, 1),
        servingApId=serving_ap_id,
        bestRssiDbm=round(best_rssi, 1),
        bestSnrDb=round(best_snr, 1),
        targetRssiDbm=target_rssi,
        targetSnrDb=target_snr,
        status=status,
        apSignals=ap_signals,
    )
