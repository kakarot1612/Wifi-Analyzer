import math
from typing import List, Tuple, Optional, Dict, Any


def distance_3d(x1: float, y1: float, z1: float, x2: float, y2: float, z2: float) -> float:
    """Computes Euclidean 3D distance between two points."""
    return math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2 + (z1 - z2) ** 2)


def distance_2d(x1: float, y1: float, x2: float, y2: float) -> float:
    """Computes Euclidean 2D distance between two points."""
    return math.hypot(x1 - x2, y1 - y2)


def line_intersection_2d(
    p1: Tuple[float, float],
    p2: Tuple[float, float],
    p3: Tuple[float, float],
    p4: Tuple[float, float],
) -> Optional[Tuple[float, float, float]]:
    """
    Checks if segment p1->p2 intersects segment p3->p4.
    Returns (x, y, t) where t is the fractional parameter [0..1] along p1->p2,
    or None if no intersection.
    """
    x1, y1 = p1
    x2, y2 = p2
    x3, y3 = p3
    x4, y4 = p4

    # Fast 2D bounding-box rejection
    if min(x1, x2) > max(x3, x4) or max(x1, x2) < min(x3, x4) or min(y1, y2) > max(y3, y4) or max(y1, y2) < min(y3, y4):
        return None

    dx1 = x2 - x1
    dy1 = y2 - y1
    dx2 = x4 - x3
    dy2 = y4 - y3

    det = dx1 * dy2 - dy1 * dx2
    if abs(det) < 1e-9:
        return None  # Parallel or collinear

    dx3 = x1 - x3
    dy3 = y1 - y3

    t = (dx2 * dy3 - dy2 * dx3) / det
    u = (dx1 * dy3 - dy1 * dx3) / det

    # We use a small epsilon to avoid endpoints triggering false crossings
    if 0.002 <= t <= 0.998 and 0.0 <= u <= 1.0:
        ix = x1 + t * dx1
        iy = y1 + t * dy1
        return (ix, iy, t)

    return None


def ray_intersects_obstacle(
    ap_pos: Tuple[float, float, float],
    rx_pos: Tuple[float, float, float],
    obstacle_points: List[List[float]],
    obstacle_height: float,
    obstacle_type: str = "wall"
) -> Tuple[bool, float]:
    """
    Checks if 3D ray from AP to RX intersects an obstacle.
    Returns (hit: bool, path_length_through_obstacle: float).
    Checks relative 3D height at the intersection point.
    """
    ap_x, ap_y, ap_z = ap_pos
    rx_x, rx_y, rx_z = rx_pos

    if obstacle_type == "wall":
        # Wall is a sequence of line segments
        for i in range(len(obstacle_points) - 1):
            p3 = (obstacle_points[i][0], obstacle_points[i][1])
            p4 = (obstacle_points[i + 1][0], obstacle_points[i + 1][1])
            hit = line_intersection_2d((ap_x, ap_y), (rx_x, rx_y), p3, p4)
            if hit is not None:
                _, _, t = hit
                # 3D height of ray at crossing point
                z_at_crossing = ap_z + t * (rx_z - ap_z)
                if z_at_crossing <= obstacle_height:
                    return (True, 0.0)

    elif obstacle_type in ("rack", "area"):
        # Rack or area can be defined by bounding box or polygon
        if len(obstacle_points) >= 2:
            # Check if line intersects any segment of the rack polygon/box
            intersections = []
            pts = obstacle_points
            n = len(pts)
            for i in range(n):
                p3 = (pts[i][0], pts[i][1])
                p4 = (pts[(i + 1) % n][0], pts[(i + 1) % n][1])
                hit = line_intersection_2d((ap_x, ap_y), (rx_x, rx_y), p3, p4)
                if hit:
                    intersections.append(hit)

            if len(intersections) >= 2:
                # Ray entered and exited the rack volume
                t1 = min(h[2] for h in intersections)
                t2 = max(h[2] for h in intersections)
                # Check height at both entry and exit
                z1 = ap_z + t1 * (rx_z - ap_z)
                z2 = ap_z + t2 * (rx_z - ap_z)
                if z1 <= obstacle_height or z2 <= obstacle_height:
                    # Traversed distance through rack
                    ray_total_dist = distance_3d(ap_x, ap_y, ap_z, rx_x, rx_y, rx_z)
                    traversed_dist = (t2 - t1) * ray_total_dist
                    return (True, traversed_dist)
            elif len(intersections) == 1:
                # One crossing (e.g. AP or RX is inside rack area)
                _, _, t = intersections[0]
                z_at_crossing = ap_z + t * (rx_z - ap_z)
                if z_at_crossing <= obstacle_height:
                    return (True, 1.0)

    return (False, 0.0)
