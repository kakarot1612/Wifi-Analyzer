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


def get_default_warehouse_project() -> ProjectData:
    materials = [Material(**m) for m in DEFAULT_MATERIALS]

    # Pre-configured warehouse layout matching Pic 1 (Ekahau warehouse) and Pic 3 (directional aisle)
    # Warehouse dimensions: 60m wide x 36m high
    obstacles = [
        # Outer Brick Walls
        Obstacle(
            id="outer-wall-n",
            name="Tường ngoài phía Bắc",
            type="wall",
            pointsM=[[2.0, 2.0], [58.0, 2.0]],
            heightM=8.0,
            thicknessM=0.2,
            materialId="brick_wall"
        ),
        Obstacle(
            id="outer-wall-s",
            name="Tường ngoài phía Nam",
            type="wall",
            pointsM=[[2.0, 34.0], [58.0, 34.0]],
            heightM=8.0,
            thicknessM=0.2,
            materialId="brick_wall"
        ),
        Obstacle(
            id="outer-wall-w",
            name="Tường ngoài phía Tây",
            type="wall",
            pointsM=[[2.0, 2.0], [2.0, 34.0]],
            heightM=8.0,
            thicknessM=0.2,
            materialId="brick_wall"
        ),
        Obstacle(
            id="outer-wall-e",
            name="Tường ngoài phía Đông",
            type="wall",
            pointsM=[[58.0, 2.0], [58.0, 34.0]],
            heightM=8.0,
            thicknessM=0.2,
            materialId="brick_wall"
        ),

        # Internal Office Partitions (Drywall)
        Obstacle(
            id="office-wall-1",
            name="Vách văn phòng điều hành",
            type="wall",
            pointsM=[[42.0, 22.0], [58.0, 22.0]],
            heightM=3.5,
            thicknessM=0.1,
            materialId="drywall"
        ),
        Obstacle(
            id="office-wall-2",
            name="Vách phòng họp & IT",
            type="wall",
            pointsM=[[42.0, 22.0], [42.0, 34.0]],
            heightM=3.5,
            thicknessM=0.1,
            materialId="drywall"
        ),

        # Warehouse Metal Racks (Rows 1 to 5) - Height 6.0m
        # Row 1 Racks
        Obstacle(
            id="rack-row-1a",
            name="Kệ hàng A-01 (Cao 6m)",
            type="rack",
            pointsM=[[18.0, 6.0], [38.0, 6.0], [38.0, 8.5], [18.0, 8.5]],
            heightM=6.0,
            thicknessM=2.5,
            materialId="warehouse_rack_dense",
            attenuationDbPerM=18.0
        ),
        Obstacle(
            id="rack-row-1b",
            name="Kệ hàng A-02 (Cao 6m)",
            type="rack",
            pointsM=[[41.0, 6.0], [54.0, 6.0], [54.0, 8.5], [41.0, 8.5]],
            heightM=6.0,
            thicknessM=2.5,
            materialId="warehouse_rack_dense",
            attenuationDbPerM=18.0
        ),

        # Row 2 Racks
        Obstacle(
            id="rack-row-2a",
            name="Kệ hàng B-01 (Cao 6m)",
            type="rack",
            pointsM=[[18.0, 11.5], [38.0, 11.5], [38.0, 14.0], [18.0, 14.0]],
            heightM=6.0,
            thicknessM=2.5,
            materialId="warehouse_rack_dense",
            attenuationDbPerM=18.0
        ),
        Obstacle(
            id="rack-row-2b",
            name="Kệ hàng B-02 (Cao 6m)",
            type="rack",
            pointsM=[[41.0, 11.5], [54.0, 11.5], [54.0, 14.0], [41.0, 14.0]],
            heightM=6.0,
            thicknessM=2.5,
            materialId="warehouse_rack_dense",
            attenuationDbPerM=18.0
        ),

        # Row 3 Racks
        Obstacle(
            id="rack-row-3a",
            name="Kệ hàng C-01 (Cao 6m)",
            type="rack",
            pointsM=[[18.0, 17.0], [38.0, 17.0], [38.0, 19.5], [18.0, 19.5]],
            heightM=6.0,
            thicknessM=2.5,
            materialId="warehouse_rack_dense",
            attenuationDbPerM=18.0
        ),

        # Row 4 Racks
        Obstacle(
            id="rack-row-4a",
            name="Kệ hàng D-01 (Cao 6m)",
            type="rack",
            pointsM=[[18.0, 22.5], [38.0, 22.5], [38.0, 25.0], [18.0, 25.0]],
            heightM=6.0,
            thicknessM=2.5,
            materialId="warehouse_rack_dense",
            attenuationDbPerM=18.0
        ),

        # Heavy Metal Door / Loading Bay (West)
        Obstacle(
            id="loading-door-w",
            name="Cửa cuốn xuất nhập hàng",
            type="wall",
            pointsM=[[2.0, 16.0], [2.0, 26.0]],
            heightM=5.0,
            thicknessM=0.08,
            materialId="metal_door_elevator"
        )
    ]

    # Pre-configured AP instances
    aps = [
        AccessPoint(
            id="ap-01",
            label="WH-AP-01",
            vendor="Cisco",
            model="C9130AXE-DIR",
            positionM=Position3D(x=12.0, y=10.0, z=5.5),
            mountingType="wall",
            orientationDeg=0.0,  # beaming East along aisle between Racks A & B
            antennaType="directional_aisle",
            radios={
                "2.4": RadioConfig(enabled=True, channelNumber=1, channelMHz=2412, txPowerDbm=15.0, antennaGainDbi=6.0),
                "5": RadioConfig(enabled=True, channelNumber=36, channelMHz=5180, txPowerDbm=15.0, antennaGainDbi=8.0),
                "6": RadioConfig(enabled=False, reason="Hardware model 9130AXE does not support 6 GHz")
            },
            wlcBinding=WlcBinding(
                controllerId="c9800-warehouse",
                apMac="f4:bd:9e:11:22:01",
                ipAddress="10.10.20.101"
            )
        ),
        AccessPoint(
            id="ap-02",
            label="WH-AP-02",
            vendor="Cisco",
            model="C9130AXE-DIR",
            positionM=Position3D(x=12.0, y=21.0, z=5.5),
            mountingType="wall",
            orientationDeg=0.0,  # beaming East along aisle between Racks C & D
            antennaType="directional_aisle",
            radios={
                "2.4": RadioConfig(enabled=True, channelNumber=6, channelMHz=2437, txPowerDbm=14.0, antennaGainDbi=6.0),
                "5": RadioConfig(enabled=True, channelNumber=132, channelMHz=5660, txPowerDbm=14.0, antennaGainDbi=8.0),
                "6": RadioConfig(enabled=False, reason="Hardware model 9130AXE does not support 6 GHz")
            },
            wlcBinding=WlcBinding(
                controllerId="c9800-warehouse",
                apMac="f4:bd:9e:11:22:02",
                ipAddress="10.10.20.102"
            )
        ),
        AccessPoint(
            id="ap-03",
            label="WH-AP-03",
            vendor="Cisco",
            model="C9120AXI",
            positionM=Position3D(x=8.0, y=21.0, z=6.0),
            mountingType="ceiling",
            orientationDeg=90.0,
            antennaType="omni",
            radios={
                "2.4": RadioConfig(enabled=True, channelNumber=11, channelMHz=2462, txPowerDbm=14.0, antennaGainDbi=4.0),
                "5": RadioConfig(enabled=True, channelNumber=149, channelMHz=5745, txPowerDbm=14.0, antennaGainDbi=5.0),
                "6": RadioConfig(enabled=False, reason="Hardware model 9120AXI does not support 6 GHz")
            },
            wlcBinding=WlcBinding(
                controllerId="c9800-warehouse",
                apMac="f4:bd:9e:11:22:03",
                ipAddress="10.10.20.103"
            )
        ),
        AccessPoint(
            id="ap-04",
            label="WH-AP-04",
            vendor="Cisco",
            model="C9164I",
            positionM=Position3D(x=50.0, y=28.0, z=3.5),
            mountingType="ceiling",
            orientationDeg=0.0,
            antennaType="omni",
            radios={
                "2.4": RadioConfig(enabled=True, channelNumber=1, channelMHz=2412, txPowerDbm=12.0, antennaGainDbi=4.0),
                "5": RadioConfig(enabled=True, channelNumber=100, channelMHz=5500, txPowerDbm=14.0, antennaGainDbi=5.0),
                "6": RadioConfig(enabled=True, channelNumber=37, channelMHz=6135, txPowerDbm=12.0, antennaGainDbi=6.0)
            },
            wlcBinding=WlcBinding(
                controllerId="c9800-warehouse",
                apMac="f4:bd:9e:11:22:04",
                ipAddress="10.10.20.104"
            )
        )
    ]

    return ProjectData(
        schemaVersion=1,
        project=ProjectMeta(
            id="warehouse-demo",
            name="Kho Trung Tâm Tân Tạo (Demo Floor)",
            units="m",
            floorHeightM=8.0,
            scale=ScaleConfig(calibrated=True, pixelsPerMeter=24.0, referenceLengthM=10.0),
            receiverProfile=ReceiverProfile(
                id="barcode-pda",
                name="Zebra TC52/TC57 Barcode Scanner",
                heightM=1.2,
                bandsGHz=[2.4, 5.0],
                targetRssiDbm=-65.0,
                targetSnrDb=25.0,
                rxGainDbi=0.0
            )
        ),
        background=BackgroundConfig(
            type="preset",
            fileId="warehouse-layout",
            fileName="Warehouse-Layout-Blueprint.pdf",
            page=1,
            opacity=0.85,
            widthPx=1440,
            heightPx=864
        ),
        materials=materials,
        obstacles=obstacles,
        aps=aps,
        simulation=SimulationConfig(
            model="log-distance-wall-loss-v1",
            gridSizeM=0.5,
            pathLossExponent=2.8,
            referenceDistanceM=1.0,
            noiseFloorDbm={"2.4": -92.0, "5": -92.0, "6": -94.0},
            showLayer="5",
            revision=1,
            calibrationStatus="uncalibrated"
        )
    )
