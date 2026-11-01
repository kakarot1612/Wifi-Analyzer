import cv2
import numpy as np
import base64
import logging
from typing import List, Dict, Any, Tuple, Optional
from app.models.project import Obstacle

logger = logging.getLogger("wifi-rf-planner.wall-detector")


def decode_image_from_base64_or_bytes(image_data: str) -> np.ndarray:
    """Decodes a base64 Data URL or raw base64 string into an OpenCV BGR image."""
    if "," in image_data:
        image_data = image_data.split(",", 1)[1]
    raw_bytes = base64.b64decode(image_data)
    nparr = np.frombuffer(raw_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Không thể giải mã tệp hình ảnh bản vẽ.")
    return img


def merge_collinear_segments(raw_segments: List[Dict[str, Any]], dist_thresh_m: float = 0.35) -> List[Dict[str, Any]]:
    """
    Merges parallel, collinear and overlapping line segments into continuous straight walls.
    Categorizes into horizontal, vertical, and diagonal/angled segments.
    """
    h_lines = []
    v_lines = []
    other = []

    for seg in raw_segments:
        p1, p2 = seg["pointsM"]
        dx = abs(p2[0] - p1[0])
        dy = abs(p2[1] - p1[1])
        if dy <= 0.15 and dx >= 0.3:
            y = (p1[1] + p2[1]) / 2.0
            x_min = min(p1[0], p2[0])
            x_max = max(p1[0], p2[0])
            h_lines.append((y, x_min, x_max, seg))
        elif dx <= 0.15 and dy >= 0.3:
            x = (p1[0] + p2[0]) / 2.0
            y_min = min(p1[1], p2[1])
            y_max = max(p1[1], p2[1])
            v_lines.append((x, y_min, y_max, seg))
        elif np.hypot(dx, dy) >= 0.4:
            other.append(seg)

    # Merge horizontal
    final_h = []
    used_h = set()
    h_lines.sort(key=lambda it: (round(it[0], 1), it[1]))
    for i in range(len(h_lines)):
        if i in used_h:
            continue
        y1, x1_min, x1_max, w1 = h_lines[i]
        curr_y = y1
        curr_min = x1_min
        curr_max = x1_max
        is_perimeter = w1.get("is_perimeter", False)
        for j in range(i + 1, len(h_lines)):
            if j in used_h:
                continue
            y2, x2_min, x2_max, w2 = h_lines[j]
            if abs(y2 - curr_y) <= dist_thresh_m:
                if x2_min <= curr_max + dist_thresh_m:
                    curr_max = max(curr_max, x2_max)
                    curr_min = min(curr_min, x2_min)
                    if w2.get("is_perimeter", False):
                        is_perimeter = True
                    used_h.add(j)
        used_h.add(i)
        w_copy = dict(w1)
        w_copy["pointsM"] = [[round(curr_min, 2), round(curr_y, 2)], [round(curr_max, 2), round(curr_y, 2)]]
        w_copy["is_perimeter"] = is_perimeter
        final_h.append(w_copy)

    # Merge vertical
    final_v = []
    used_v = set()
    v_lines.sort(key=lambda it: (round(it[0], 1), it[1]))
    for i in range(len(v_lines)):
        if i in used_v:
            continue
        x1, y1_min, y1_max, w1 = v_lines[i]
        curr_x = x1
        curr_min = y1_min
        curr_max = y1_max
        is_perimeter = w1.get("is_perimeter", False)
        for j in range(i + 1, len(v_lines)):
            if j in used_v:
                continue
            x2, y2_min, y2_max, w2 = v_lines[j]
            if abs(x2 - curr_x) <= dist_thresh_m:
                if y2_min <= curr_max + dist_thresh_m:
                    curr_max = max(curr_max, y2_max)
                    curr_min = min(curr_min, y2_min)
                    if w2.get("is_perimeter", False):
                        is_perimeter = True
                    used_v.add(j)
        used_v.add(i)
        w_copy = dict(w1)
        w_copy["pointsM"] = [[round(curr_x, 2), round(curr_min, 2)], [round(curr_x, 2), round(curr_max, 2)]]
        w_copy["is_perimeter"] = is_perimeter
        final_v.append(w_copy)

    return final_h + final_v + other


def auto_detect_walls_from_image(
    image_data: str,
    ppm: float = 20.0,
    sensitivity: str = "medium",
    default_material: str = "brick_wall",
    floor_height_m: float = 3.5,
) -> List[Obstacle]:
    """
    AI / Computer Vision wall detection engine.
    Analyzes any 2D architectural blueprint image and extracts structural walls.
    """
    img = decode_image_from_base64_or_bytes(image_data)
    h_px, w_px, _ = img.shape
    ppm = max(ppm, 1.0)
    width_m = w_px / ppm
    height_m = h_px / ppm

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 1. Detect background polarity: white bg (scans/PDF) vs dark bg (AutoCAD)
    mean_val = float(np.mean(gray))
    if mean_val < 110:
        # Dark mode CAD drawing -> invert so walls are dark lines on light background
        gray = cv2.bitwise_not(gray)

    # 2. Contrast normalization & slight Gaussian blur
    norm = cv2.normalize(gray, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX)
    blurred = cv2.GaussianBlur(norm, (3, 3), 0)

    # 3. Binary thresholding to isolate architectural lines
    thresh_val = 215 if sensitivity == "medium" else (228 if sensitivity == "high" else 198)
    _, binary = cv2.threshold(blurred, thresh_val, 255, cv2.THRESH_BINARY_INV)

    # 4. Filter furniture & noise by minimum structural wall length
    # In architectural plans, walls are generally >= 0.6m in physical dimensions
    min_len_m = 0.55 if sensitivity == "high" else (0.75 if sensitivity == "medium" else 1.2)
    min_len_px = max(int(ppm * min_len_m), 18)

    # 5. Directional morphological filtering (extract horizontal & vertical structural segments)
    h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (min_len_px, 1))
    v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, min_len_px))

    h_walls = cv2.morphologyEx(binary, cv2.MORPH_OPEN, h_kernel)
    v_walls = cv2.morphologyEx(binary, cv2.MORPH_OPEN, v_kernel)

    # Combine structural walls
    walls_mask = cv2.bitwise_or(h_walls, v_walls)

    # Connect near-touching junctions
    walls_mask = cv2.dilate(walls_mask, cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3)), iterations=1)

    # 6. Find structural contours
    contours, _ = cv2.findContours(walls_mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    raw_segments: List[Dict[str, Any]] = []

    # Floor plan margins to determine perimeter walls
    margin_x = width_m * 0.08
    margin_y = height_m * 0.08

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < min_len_px * 2:
            continue

        epsilon = 0.02 * cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, epsilon, True)

        if len(approx) >= 2:
            pts = approx.reshape(-1, 2)
            n_pts = len(pts)
            for i in range(n_pts):
                p1 = pts[i]
                p2 = pts[(i + 1) % n_pts]
                seg_len_px = np.hypot(p2[0] - p1[0], p2[1] - p1[1])
                if seg_len_px >= min_len_px * 0.7:
                    dx_px = abs(p2[0] - p1[0])
                    dy_px = abs(p2[1] - p1[1])

                    # Orthogonal snapping
                    if dy_px > 0 and dx_px / (dy_px + 1e-5) > 5.5:
                        y_avg = (p1[1] + p2[1]) / 2.0
                        p1_y = p2_y = y_avg
                        p1_x, p2_x = p1[0], p2[0]
                    elif dx_px > 0 and dy_px / (dx_px + 1e-5) > 5.5:
                        x_avg = (p1[0] + p2[0]) / 2.0
                        p1_x = p2_x = x_avg
                        p1_y, p2_y = p1[1], p2[1]
                    else:
                        p1_x, p1_y = p1[0], p1[1]
                        p2_x, p2_y = p2[0], p2[1]

                    x1_m = round(float(p1_x / ppm), 2)
                    y1_m = round(float(p1_y / ppm), 2)
                    x2_m = round(float(p2_x / ppm), 2)
                    y2_m = round(float(p2_y / ppm), 2)

                    seg_len_m = np.hypot(x2_m - x1_m, y2_m - y1_m)
                    if seg_len_m >= 0.4:
                        # Check if near perimeter (outer envelope wall)
                        is_perimeter = (
                            min(x1_m, x2_m) <= margin_x or
                            max(x1_m, x2_m) >= (width_m - margin_x) or
                            min(y1_m, y2_m) <= margin_y or
                            max(y1_m, y2_m) >= (height_m - margin_y)
                        )
                        raw_segments.append({
                            "pointsM": [[x1_m, y1_m], [x2_m, y2_m]],
                            "is_perimeter": is_perimeter,
                            "length_m": seg_len_m,
                        })

    # 7. Merge collinear segments
    merged_segments = merge_collinear_segments(raw_segments, dist_thresh_m=0.35)

    # 8. Convert to Obstacle models with accurate physical attenuation
    obstacles: List[Obstacle] = []
    for idx, seg in enumerate(merged_segments, 1):
        is_perim = seg.get("is_perimeter", False)
        # Exterior envelope walls: concrete / thick brick (12 dB loss)
        # Interior partition walls: brick / drywall (6-8 dB loss)
        if is_perim:
            mat_id = "concrete_wall" if default_material == "concrete_wall" else "brick_wall"
            wall_name = f"Tường bao ngoại thất {idx}"
            thickness = 0.20
        else:
            mat_id = default_material if default_material != "concrete_wall" else "drywall"
            wall_name = f"Vách ngăn phòng {idx}"
            thickness = 0.12

        obstacles.append(
            Obstacle(
                id=f"auto-wall-{idx}",
                name=wall_name,
                type="wall",
                pointsM=seg["pointsM"],
                heightM=floor_height_m,
                thicknessM=thickness,
                materialId=mat_id,
            )
        )

    logger.info(f"AI Wall Detector extracted {len(obstacles)} structural walls from blueprint ({w_px}x{h_px} px)")
    return obstacles

