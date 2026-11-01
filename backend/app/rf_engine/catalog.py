import math
from typing import Dict, Any, List


DEFAULT_MATERIALS = [
    {
        "id": "drywall",
        "name": "Drywall / Thạch cao mỏng (10 cm)",
        "attenuationDb": {"2.4": 3.0, "5": 4.0, "6": 4.5},
        "defaultThicknessM": 0.1,
        "color": "#94a3b8",
        "assumption": True,
        "description": "Vách ngăn văn phòng thạch cao 2 lớp tiêu chuẩn."
    },
    {
        "id": "brick_wall",
        "name": "Tường gạch đặc (20 cm)",
        "attenuationDb": {"2.4": 8.0, "5": 12.0, "6": 14.0},
        "defaultThicknessM": 0.2,
        "color": "#f97316",
        "assumption": True,
        "description": "Tường bao công trình gạch nung trát vữa."
    },
    {
        "id": "concrete_heavy",
        "name": "Bê tông cốt thép (25 cm)",
        "attenuationDb": {"2.4": 15.0, "5": 22.0, "6": 26.0},
        "defaultThicknessM": 0.25,
        "color": "#64748b",
        "assumption": True,
        "description": "Tường chịu lực hoặc lõi thang máy bê tông dày."
    },
    {
        "id": "glass_window",
        "name": "Vách kính cường lực (1.2 cm)",
        "attenuationDb": {"2.4": 2.0, "5": 3.0, "6": 3.5},
        "defaultThicknessM": 0.012,
        "color": "#38bdf8",
        "assumption": True,
        "description": "Cửa hoặc vách kính phòng họp/văn phòng."
    },
    {
        "id": "warehouse_rack_dense",
        "name": "Kệ kho kim loại & hàng hóa dày (Rack 5-7m)",
        "attenuationDb": {"2.4": 14.0, "5": 18.0, "6": 21.0},
        "defaultThicknessM": 1.2,
        "color": "#eab308",
        "assumption": True,
        "description": "Kệ selective pallet racking chứa hàng hóa mật độ cao (tham khảo Pic 1 & 3)."
    },
    {
        "id": "metal_door_elevator",
        "name": "Cửa cuốn kim loại / Thang máy",
        "attenuationDb": {"2.4": 18.0, "5": 25.0, "6": 28.0},
        "defaultThicknessM": 0.05,
        "color": "#ef4444",
        "assumption": True,
        "description": "Cửa cuốn loading bay hoặc giếng thang máy kim loại."
    }
]

AP_CATALOG = [
    {
        "model": "C9115AXI",
        "vendor": "Cisco",
        "name": "Catalyst 9115AXI (Wi-Fi 6, Internal Omni Antennas)",
        "supports6GHz": False,
        "defaultMount": "ceiling",
        "radios": {
            "2.4": {"maxPowerDbm": 23, "defaultPowerDbm": 14, "gainDbi": 3.0, "defaultChannel": 1},
            "5": {"maxPowerDbm": 23, "defaultPowerDbm": 14, "gainDbi": 4.0, "defaultChannel": 36},
            "6": {"supported": False}
        },
        "antennaPattern": "omni"
    },
    {
        "model": "C9115AXE-DIR",
        "vendor": "Cisco",
        "name": "Catalyst 9115AXE + AIR-ANT2566P4W-R (Directional Patch 60°)",
        "supports6GHz": False,
        "defaultMount": "wall",
        "radios": {
            "2.4": {"maxPowerDbm": 23, "defaultPowerDbm": 15, "gainDbi": 6.0, "defaultChannel": 6},
            "5": {"maxPowerDbm": 23, "defaultPowerDbm": 15, "gainDbi": 6.0, "defaultChannel": 132},
            "6": {"supported": False}
        },
        "antennaPattern": "directional_aisle"
    },
    {
        "model": "C9115AXE-OMNI",
        "vendor": "Cisco",
        "name": "Catalyst 9115AXE + AIR-ANT2524Db-R (Dipole Omni)",
        "supports6GHz": False,
        "defaultMount": "ceiling",
        "radios": {
            "2.4": {"maxPowerDbm": 23, "defaultPowerDbm": 14, "gainDbi": 2.0, "defaultChannel": 1},
            "5": {"maxPowerDbm": 23, "defaultPowerDbm": 14, "gainDbi": 4.0, "defaultChannel": 36},
            "6": {"supported": False}
        },
        "antennaPattern": "omni"
    },
    {
        "model": "C9120AXI",
        "vendor": "Cisco",
        "name": "Catalyst 9120AX Series (Internal Omni)",
        "supports6GHz": False,
        "defaultMount": "ceiling",
        "radios": {
            "2.4": {"maxPowerDbm": 23, "defaultPowerDbm": 14, "gainDbi": 4.0, "defaultChannel": 1},
            "5": {"maxPowerDbm": 23, "defaultPowerDbm": 14, "gainDbi": 5.0, "defaultChannel": 36},
            "6": {"supported": False}
        },
        "antennaPattern": "omni"
    },
    {
        "model": "C9130AXE-DIR",
        "vendor": "Cisco",
        "name": "Catalyst 9130AXE + Directional Warehouse Patch",
        "supports6GHz": False,
        "defaultMount": "wall",
        "radios": {
            "2.4": {"maxPowerDbm": 24, "defaultPowerDbm": 15, "gainDbi": 6.0, "defaultChannel": 6},
            "5": {"maxPowerDbm": 24, "defaultPowerDbm": 15, "gainDbi": 8.0, "defaultChannel": 149},
            "6": {"supported": False}
        },
        "antennaPattern": "directional_aisle"
    },
    {
        "model": "C9164I",
        "vendor": "Cisco",
        "name": "Catalyst 9164I (Wi-Fi 6E Tri-Band)",
        "supports6GHz": True,
        "defaultMount": "ceiling",
        "radios": {
            "2.4": {"maxPowerDbm": 20, "defaultPowerDbm": 14, "gainDbi": 4.0, "defaultChannel": 11},
            "5": {"maxPowerDbm": 20, "defaultPowerDbm": 14, "gainDbi": 5.0, "defaultChannel": 100},
            "6": {"maxPowerDbm": 18, "defaultPowerDbm": 12, "gainDbi": 6.0, "defaultChannel": 37, "supported": True}
        },
        "antennaPattern": "omni"
    },
    {
        "model": "C9166I",
        "vendor": "Cisco",
        "name": "Catalyst 9166I Enterprise Flagship (Wi-Fi 6E)",
        "supports6GHz": True,
        "defaultMount": "ceiling",
        "radios": {
            "2.4": {"maxPowerDbm": 23, "defaultPowerDbm": 15, "gainDbi": 4.0, "defaultChannel": 1},
            "5": {"maxPowerDbm": 23, "defaultPowerDbm": 15, "gainDbi": 6.0, "defaultChannel": 149},
            "6": {"maxPowerDbm": 20, "defaultPowerDbm": 14, "gainDbi": 6.0, "defaultChannel": 69, "supported": True}
        },
        "antennaPattern": "omni"
    },
    {
        "model": "AP-574-DIR",
        "vendor": "Aruba",
        "name": "Aruba AP-574 + Narrow Aisle Directional (Pic 1)",
        "supports6GHz": False,
        "defaultMount": "wall",
        "radios": {
            "2.4": {"maxPowerDbm": 22, "defaultPowerDbm": 14, "gainDbi": 6.5, "defaultChannel": 6},
            "5": {"maxPowerDbm": 22, "defaultPowerDbm": 14, "gainDbi": 8.5, "defaultChannel": 132},
            "6": {"supported": False}
        },
        "antennaPattern": "directional_aisle"
    }
]


def calculate_antenna_gain(
    pattern_type: str,
    base_gain_dbi: float,
    ap_orientation_deg: float,
    ap_pos: tuple,
    rx_pos: tuple
) -> float:
    """
    Computes angle-dependent antenna gain in dBi.
    Supports Omni and Directional Aisle (Gaussian / Cardioid with 60 deg 3dB beamwidth).
    """
    if pattern_type == "omni":
        return base_gain_dbi

    if pattern_type == "directional_aisle":
        # Calculate azimuth angle from AP to RX point
        dx = rx_pos[0] - ap_pos[0]
        dy = rx_pos[1] - ap_pos[1]
        angle_rad = math.atan2(dy, dx)
        angle_deg = math.degrees(angle_rad)
        if angle_deg < 0:
            angle_deg += 360.0

        # Angular offset relative to AP antenna pointing azimuth
        delta_angle = abs(angle_deg - ap_orientation_deg)
        if delta_angle > 180:
            delta_angle = 360 - delta_angle

        # 3dB beamwidth = 65 degrees (typical warehouse aisle patch antenna)
        # Front-to-back ratio = 22 dB
        beamwidth = 65.0
        back_attenuation = 22.0

        # Gaussian pattern approximation: G(theta) = G_max - 12 * (theta / beamwidth)^2
        pattern_drop = 12.0 * ((delta_angle / beamwidth) ** 2)
        pattern_drop = min(pattern_drop, back_attenuation)

        return base_gain_dbi - pattern_drop

    return base_gain_dbi
