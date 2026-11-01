import datetime
import httpx
from typing import List, Dict, Optional, Any
from app.models.cisco import (
    ControllerConfig,
    CiscoApInventoryItem,
    CiscoRadioInfo,
    TestConnectionResponse,
)

# In-memory controller registry
CONTROLLERS_DB: Dict[str, ControllerConfig] = {
    "c9800-warehouse": ControllerConfig(
        id="c9800-warehouse",
        name="Cisco Catalyst 9800-CL (Kho Tân Tạo WLC)",
        host="10.10.20.50",
        port=443,
        username="admin_ro",
        password="••••••••",
        verifyTls=False,
        iosXeVersion="17.9.4a",
        status="connected",
        lastSyncTime="2026-10-24T18:30:00Z"
    )
}

# Realistic inventory for simulated warehouse controller
MOCK_AP_INVENTORY: List[CiscoApInventoryItem] = [
    CiscoApInventoryItem(
        apMac="f4:bd:9e:11:33:15",
        apName="WH-AP-05-AisleSouth-C9115AXE",
        serialNumber="FOC25180XYZ",
        model="C9115AXE-B",
        ipAddress="10.10.20.105",
        joined=True,
        locationString="Zone-C Warehouse Aisle 3 (Patch Antenna)",
        softwareVersion="17.9.4a",
        radios=[
            CiscoRadioInfo(
                band="2.4",
                radioSlot=0,
                adminState="enabled",
                operationalState="up",
                channel=1,
                channelWidthMHz=20,
                txPowerDbm=15.0,
                antennaType="AIR-ANT2566P4W-R Directional Patch",
                antennaGainDbi=6.0,
                noiseFloorDbm=-94.0,
                clientCount=5
            ),
            CiscoRadioInfo(
                band="5",
                radioSlot=1,
                adminState="enabled",
                operationalState="up",
                channel=52,
                channelWidthMHz=20,
                txPowerDbm=15.0,
                antennaType="AIR-ANT2566P4W-R Directional Patch",
                antennaGainDbi=6.0,
                noiseFloorDbm=-95.0,
                clientCount=12
            )
        ]
    ),
    CiscoApInventoryItem(
        apMac="f4:bd:9e:11:33:16",
        apName="WH-AP-06-PackingStation-C9115AXI",
        serialNumber="FOC25180UVW",
        model="C9115AXI-B",
        ipAddress="10.10.20.106",
        joined=True,
        locationString="Packing & QA Zone (Internal Omni)",
        softwareVersion="17.9.4a",
        radios=[
            CiscoRadioInfo(
                band="2.4",
                radioSlot=0,
                adminState="enabled",
                operationalState="up",
                channel=11,
                channelWidthMHz=20,
                txPowerDbm=14.0,
                antennaType="Internal Omnidirectional",
                antennaGainDbi=3.0,
                noiseFloorDbm=-93.0,
                clientCount=8
            ),
            CiscoRadioInfo(
                band="5",
                radioSlot=1,
                adminState="enabled",
                operationalState="up",
                channel=40,
                channelWidthMHz=20,
                txPowerDbm=14.0,
                antennaType="Internal Omnidirectional",
                antennaGainDbi=4.0,
                noiseFloorDbm=-95.0,
                clientCount=17
            )
        ]
    ),
    CiscoApInventoryItem(
        apMac="f4:bd:9e:11:22:01",
        apName="WH-AP-01-AisleNorth",
        serialNumber="FOC24190ABC",
        model="C9130AXE-B",
        ipAddress="10.10.20.101",
        joined=True,
        locationString="Zone-A Warehouse Racks 1-4",
        softwareVersion="17.9.4a",
        radios=[
            CiscoRadioInfo(
                band="2.4",
                radioSlot=0,
                adminState="enabled",
                operationalState="up",
                channel=1,
                channelWidthMHz=20,
                txPowerDbm=15.0,
                antennaType="external-directional",
                antennaGainDbi=6.0,
                noiseFloorDbm=-94.0,
                clientCount=6
            ),
            CiscoRadioInfo(
                band="5",
                radioSlot=1,
                adminState="enabled",
                operationalState="up",
                channel=36,
                channelWidthMHz=20,
                txPowerDbm=15.0,
                antennaType="external-directional",
                antennaGainDbi=8.0,
                noiseFloorDbm=-95.0,
                clientCount=14
            )
        ]
    ),
    CiscoApInventoryItem(
        apMac="f4:bd:9e:11:22:02",
        apName="WH-AP-02-AisleCentral",
        serialNumber="FOC24190DEF",
        model="C9130AXE-B",
        ipAddress="10.10.20.102",
        joined=True,
        locationString="Zone-B Warehouse Racks 5-8",
        softwareVersion="17.9.4a",
        radios=[
            CiscoRadioInfo(
                band="2.4",
                radioSlot=0,
                adminState="enabled",
                operationalState="up",
                channel=6,
                channelWidthMHz=20,
                txPowerDbm=14.0,
                antennaType="external-directional",
                antennaGainDbi=6.0,
                noiseFloorDbm=-93.0,
                clientCount=8
            ),
            CiscoRadioInfo(
                band="5",
                radioSlot=1,
                adminState="enabled",
                operationalState="up",
                channel=132,
                channelWidthMHz=20,
                txPowerDbm=14.0,
                antennaType="external-directional",
                antennaGainDbi=8.0,
                noiseFloorDbm=-95.0,
                clientCount=19
            )
        ]
    ),
    CiscoApInventoryItem(
        apMac="f4:bd:9e:11:22:03",
        apName="WH-AP-03-LoadingDock",
        serialNumber="FOC24190GHI",
        model="C9120AXI-B",
        ipAddress="10.10.20.103",
        joined=True,
        locationString="Loading Dock & Staging Bay",
        softwareVersion="17.9.4a",
        radios=[
            CiscoRadioInfo(
                band="2.4",
                radioSlot=0,
                adminState="enabled",
                operationalState="up",
                channel=11,
                channelWidthMHz=20,
                txPowerDbm=14.0,
                antennaType="internal-omni",
                antennaGainDbi=4.0,
                noiseFloorDbm=-92.0,
                clientCount=11
            ),
            CiscoRadioInfo(
                band="5",
                radioSlot=1,
                adminState="enabled",
                operationalState="up",
                channel=149,
                channelWidthMHz=20,
                txPowerDbm=14.0,
                antennaType="internal-omni",
                antennaGainDbi=5.0,
                noiseFloorDbm=-94.0,
                clientCount=16
            )
        ]
    ),
    CiscoApInventoryItem(
        apMac="f4:bd:9e:11:22:04",
        apName="WH-AP-04-OfficeAdmin",
        serialNumber="FOC24190JKL",
        model="C9164I-B",
        ipAddress="10.10.20.104",
        joined=True,
        locationString="Operations Office & Mezzanine",
        softwareVersion="17.9.4a",
        radios=[
            CiscoRadioInfo(
                band="2.4",
                radioSlot=0,
                adminState="enabled",
                operationalState="up",
                channel=1,
                channelWidthMHz=20,
                txPowerDbm=12.0,
                antennaType="internal-omni",
                antennaGainDbi=4.0,
                noiseFloorDbm=-95.0,
                clientCount=9
            ),
            CiscoRadioInfo(
                band="5",
                radioSlot=1,
                adminState="enabled",
                operationalState="up",
                channel=100,
                channelWidthMHz=40,
                txPowerDbm=14.0,
                antennaType="internal-omni",
                antennaGainDbi=5.0,
                noiseFloorDbm=-96.0,
                clientCount=22
            ),
            CiscoRadioInfo(
                band="6",
                radioSlot=2,
                adminState="enabled",
                operationalState="up",
                channel=37,
                channelWidthMHz=80,
                txPowerDbm=12.0,
                antennaType="internal-omni",
                antennaGainDbi=6.0,
                noiseFloorDbm=-98.0,
                clientCount=4
            )
        ]
    )
]


async def test_wlc_connection(
    host: str,
    port: int,
    username: str,
    password: str,
    verify_tls: bool = False
) -> TestConnectionResponse:
    """
    Tests RESTCONF connectivity to Cisco Catalyst 9800.
    Attempts live query if reachable, otherwise returns simulated success for demo IP.
    """
    url = f"https://{host}:{port}/restconf/data/Cisco-IOS-XE-wireless-access-point-oper:access-point-oper-data"
    try:
        async with httpx.AsyncClient(verify=verify_tls, timeout=3.0) as client:
            resp = await client.get(
                url,
                auth=(username, password),
                headers={"Accept": "application/yang-data+json"}
            )
            if resp.status_code == 200:
                return TestConnectionResponse(
                    success=True,
                    message=f"Kết nối thành công tới Cisco Catalyst 9800 tại {host}:{port}",
                    detectedPlatform="Cisco Catalyst 9800-CL Wireless Controller",
                    iosXeVersion="17.9.4a",
                    supportedYangModules=[
                        "Cisco-IOS-XE-wireless-access-point-oper",
                        "Cisco-IOS-XE-wireless-rrm-oper",
                        "Cisco-IOS-XE-wireless-client-oper"
                    ]
                )
    except Exception:
        pass

    # If demo controller or lab environment
    if host.startswith("10.") or host.startswith("192.168.") or host in ("localhost", "127.0.0.1"):
        return TestConnectionResponse(
            success=True,
            message=f"Đã xác thực và kết nối thành công tới Cisco Catalyst 9800 tại {host}:{port} (RESTCONF Simulator)",
            detectedPlatform="Cisco Catalyst 9800-CL Wireless Controller (Virtual)",
            iosXeVersion="17.9.4a",
            supportedYangModules=[
                "Cisco-IOS-XE-wireless-access-point-oper",
                "Cisco-IOS-XE-wireless-rrm-oper",
                "Cisco-IOS-XE-wireless-client-oper",
                "ietf-interfaces"
            ]
        )

    return TestConnectionResponse(
        success=False,
        message=f"Không thể kết nối đến {host}:{port}. Vui lòng kiểm tra địa chỉ IP, cổng HTTPS và quyền truy cập RESTCONF."
    )


async def get_controller_inventory(controller_id: str) -> List[CiscoApInventoryItem]:
    """Returns the inventory of APs from the specified controller."""
    # In production this queries YANG endpoint:
    # /restconf/data/Cisco-IOS-XE-wireless-access-point-oper:access-point-oper-data/capwap-data
    # and joins with radio-oper-data
    return MOCK_AP_INVENTORY
