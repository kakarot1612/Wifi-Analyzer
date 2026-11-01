import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ProjectData,
  AppTab,
  ToolMode,
  BandType,
  VisMetric,
  GridData,
  AccessPoint,
  Obstacle,
  SampleResponse,
  ExclusionZone,
} from './types';
import { api } from './services/api';
import { calculateLocalGrid } from './utils/localRfEngine';
import { TopNav } from './components/TopNav';
import { LeftToolbar } from './components/LeftToolbar';
import { BottomBar } from './components/BottomBar';
import { FloorPlanCanvas } from './components/FloorPlanCanvas';
import { ApEditorPanel } from './components/Sidebar/ApEditorPanel';
import { InspectProbePanel } from './components/Sidebar/InspectProbePanel';
import { CiscoWlcPanel } from './components/Sidebar/CiscoWlcPanel';
import { SurveyPanel } from './components/Sidebar/SurveyPanel';
import { MaterialsPanel } from './components/Sidebar/MaterialsPanel';
import { ReportsPanel } from './components/Sidebar/ReportsPanel';
import { ScaleCalibrationModal } from './components/ScaleCalibrationModal';
import { UploadBlueprintModal } from './components/UploadBlueprintModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { WallDrawingBar, WallDrawingConfig } from './components/WallDrawingBar';
import { ApPalettePanel, ApTemplateConfig } from './components/ApPalettePanel';
import { AiAutoPlanModal } from './components/AiAutoPlanModal';
import { Wifi, Sliders, Layers, Ruler } from 'lucide-react';

export const App: React.FC = () => {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('design');
  const [designSidebarSubTab, setDesignSidebarSubTab] = useState<'editor' | 'palette'>('editor');
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [activeBand, setActiveBand] = useState<BandType>('5');
  const [visMetric, setVisMetric] = useState<VisMetric>('rssi');
  const [gridResolution, setGridResolution] = useState<number>(0.5);

  const [gridData, setGridData] = useState<GridData | null>(null);
  const [calcTimeMs, setCalcTimeMs] = useState<number>(0);
  const [selectedApId, setSelectedApId] = useState<string | null>('ap-01');

  // Probe Inspection
  const [probePoint, setProbePoint] = useState<[number, number] | null>([25.0, 15.0]);
  const [probeSample, setProbeSample] = useState<SampleResponse | null>(null);

  // Layer toggles
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showWalls, setShowWalls] = useState<boolean>(true);
  const [showRacks, setShowRacks] = useState<boolean>(true);
  const [showApLabels, setShowApLabels] = useState<boolean>(true);
  const [showRays, setShowRays] = useState<boolean>(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.85);

  // Wall Drawing Configuration (Idea 2)
  const [wallDrawingConfig, setWallDrawingConfig] = useState<WallDrawingConfig>({
    materialId: 'brick_wall',
    drawMode: 'line',
    heightM: 3.5,
    thicknessM: 0.2,
  });

  // AI Coverage Zone Selection (Idea 4)
  const [aiPlanZone, setAiPlanZone] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [showAiModal, setShowAiModal] = useState<boolean>(false);

  // Modals (Idea 1)
  const [showProjectManager, setShowProjectManager] = useState<boolean>(false);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [calibrationModalData, setCalibrationModalData] = useState<{
    p1?: [number, number] | null;
    p2?: [number, number] | null;
    mode?: 'ruler' | 'direct';
  } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDetectingWalls, setIsDetectingWalls] = useState<boolean>(false);

  // AI Wall Detection from Blueprint
  const handleDetectWalls = async (targetProj?: ProjectData) => {
    const p = targetProj || project;
    if (!p) return;
    if (!p.background.imageDataUrl) {
      alert('Vui lòng nạp tệp bản vẽ mặt bằng 2D trước khi quét tường.');
      return;
    }
    setIsDetectingWalls(true);
    try {
      const ppm = p.project.scale.pixelsPerMeter || 20.0;
      const res = await api.detectWalls({
        projectId: p.project.id,
        imageDataUrl: p.background.imageDataUrl,
        pixelsPerMeter: ppm,
        floorHeightM: p.project.floorHeightM || 3.5,
        sensitivity: 'medium',
        defaultMaterial: 'brick_wall',
        replaceExisting: true,
      });

      const updatedProj: ProjectData = {
        ...p,
        obstacles: res.walls,
        simulation: {
          ...p.simulation,
          revision: p.simulation.revision + 1,
        },
      };
      setProject(updatedProj);
      api.saveProject(updatedProj).catch((err) => console.warn('Lỗi lưu dự án:', err));
      triggerFastSimulation(updatedProj);
      alert(`Đã nhận diện thành công ${res.wallCount} bức tường từ bản vẽ! Cường độ sóng Wi-Fi đã tự động cập nhật suy hao qua các bức tường.`);
    } catch (err: any) {
      alert('Lỗi nhận diện tường: ' + err.message);
    } finally {
      setIsDetectingWalls(false);
    }
  };


  const simulationDebounceRef = useRef<any>(null);

  // Load initial project from backend
  useEffect(() => {
    loadProject();
  }, []);

  const loadProject = async (projectId?: string) => {
    try {
      const proj = projectId ? await api.getProject(projectId) : await api.getCurrentProject();
      setProject(proj);
      if (proj.aps.length > 0) {
        setSelectedApId(proj.aps[0].id);
      } else {
        setSelectedApId(null);
      }
      setActiveTool('select');
      setCalibrationModalData(null);
      runBackendSimulation(proj, activeBand, gridResolution);
    } catch (err) {
      console.error('Không thể kết nối backend, sử dụng dự án dự phòng:', err);
    }
  };

  // Run backend RF simulation
  const runBackendSimulation = useCallback(
    async (currentProj: ProjectData, band: BandType, resM: number) => {
      try {
        const resp = await api.computeHeatmap(
          currentProj.project.id,
          currentProj.simulation.revision,
          band,
          resM,
          currentProj
        );
        setGridData(resp.grid);
        setCalcTimeMs(resp.calcTimeMs);
      } catch (err) {
        console.warn('Backend calculation fallback to local engine:', err);
        const local = calculateLocalGrid(currentProj, band, resM);
        setGridData({
          originM: [0, 0],
          ...local,
        });
      }
    },
    []
  );

  // Fast interactive local update when dragging APs
  const triggerFastSimulation = useCallback(
    (currentProj: ProjectData) => {
      const local = calculateLocalGrid(currentProj, activeBand, Math.max(gridResolution, 0.8));
      setGridData({
        originM: [0, 0],
        ...local,
      });

      if (simulationDebounceRef.current) {
        clearTimeout(simulationDebounceRef.current);
      }
      simulationDebounceRef.current = setTimeout(() => {
        runBackendSimulation(currentProj, activeBand, gridResolution);
      }, 250);
    },
    [activeBand, gridResolution, runBackendSimulation]
  );

  // Update AP position during drag & drop
  const handleUpdateApPosition = (apId: string, xM: number, yM: number) => {
    if (!project) return;
    const updatedAps = project.aps.map((ap) => {
      if (ap.id === apId) {
        return {
          ...ap,
          positionM: {
            ...ap.positionM,
            x: Math.round(xM * 2) / 2,
            y: Math.round(yM * 2) / 2,
          },
        };
      }
      return ap;
    });

    const updatedProj: ProjectData = {
      ...project,
      aps: updatedAps,
      simulation: {
        ...project.simulation,
        revision: project.simulation.revision + 1,
      },
    };

    setProject(updatedProj);
    triggerFastSimulation(updatedProj);
  };

  // Update complete AP object from sidebar
  const handleUpdateAp = (updatedAp: AccessPoint) => {
    if (!project) return;
    const updatedAps = project.aps.map((ap) => (ap.id === updatedAp.id ? updatedAp : ap));
    const updatedProj = { ...project, aps: updatedAps };
    setProject(updatedProj);
    triggerFastSimulation(updatedProj);
  };

  // Delete AP
  const handleDeleteAp = (id: string) => {
    if (!project) return;
    const updatedAps = project.aps.filter((ap) => ap.id !== id);
    const updatedProj = { ...project, aps: updatedAps };
    setProject(updatedProj);
    setSelectedApId(updatedAps.length > 0 ? updatedAps[0].id : null);
    triggerFastSimulation(updatedProj);
  };

  // Add new default AP
  const handleAddAp = (xM: number, yM: number) => {
    if (!project) return;
    const newIdx = project.aps.length + 1;
    const newAp: AccessPoint = {
      id: `ap-${Date.now()}`,
      label: `WH-AP-${newIdx < 10 ? '0' + newIdx : newIdx}`,
      vendor: 'Cisco',
      model: 'C9120AXI',
      positionM: { x: Math.round(xM * 2) / 2, y: Math.round(yM * 2) / 2, z: 4.5 },
      mountingType: 'ceiling',
      orientationDeg: 0,
      antennaType: 'omni',
      radios: {
        '2.4': { enabled: true, channelNumber: 1, txPowerDbm: 14, antennaGainDbi: 4.0 },
        '5': { enabled: true, channelNumber: 36, txPowerDbm: 14, antennaGainDbi: 5.0 },
        '6': { enabled: false, channelNumber: 37, txPowerDbm: 12, antennaGainDbi: 6.0 },
      },
      wlcBinding: {},
    };

    const updatedProj = {
      ...project,
      aps: [...project.aps, newAp],
    };
    setProject(updatedProj);
    setSelectedApId(newAp.id);
    setActiveTool('select');
    triggerFastSimulation(updatedProj);
  };

  // Add AP with full template configuration (Idea 3: Drag & Drop palette)
  const handleAddApWithConfig = (config: ApTemplateConfig, xM?: number, yM?: number) => {
    if (!project) return;
    const posX = xM !== undefined ? Math.round(xM * 2) / 2 : 20.0;
    const posY = yM !== undefined ? Math.round(yM * 2) / 2 : 15.0;
    const newIdx = project.aps.length + 1;

    const newAp: AccessPoint = {
      id: `ap-${Date.now()}`,
      label: `${config.model.split('-')[0]}-${newIdx < 10 ? '0' + newIdx : newIdx}`,
      vendor: config.vendor,
      model: config.model,
      positionM: { x: posX, y: posY, z: config.heightM },
      mountingType: config.mountingType,
      orientationDeg: config.orientationDeg,
      antennaType: config.antennaType,
      radios: {
        '2.4': {
          enabled: config.radios['2.4'].enabled,
          channelNumber: config.radios['2.4'].channel,
          channelMHz: 2412 + (config.radios['2.4'].channel - 1) * 5,
          txPowerDbm: config.radios['2.4'].txPowerDbm,
          antennaGainDbi: 3.5,
        },
        '5': {
          enabled: config.radios['5'].enabled,
          channelNumber: config.radios['5'].channel,
          channelMHz: 5000 + config.radios['5'].channel * 5,
          txPowerDbm: config.radios['5'].txPowerDbm,
          antennaGainDbi: config.antennaType === 'directional_aisle' ? 7.0 : 5.0,
        },
        '6': {
          enabled: config.radios['6'].enabled,
          channelNumber: config.radios['6'].channel,
          channelMHz: 5950 + config.radios['6'].channel * 5,
          txPowerDbm: config.radios['6'].txPowerDbm,
          antennaGainDbi: 5.5,
        },
      },
      wlcBinding: {},
    };

    const updatedProj = {
      ...project,
      aps: [...project.aps, newAp],
    };
    setProject(updatedProj);
    setSelectedApId(newAp.id);
    setActiveTool('select');
    setDesignSidebarSubTab('editor');
    triggerFastSimulation(updatedProj);
  };


  // Clear All Walls
  const handleClearAllWalls = () => {
    if (!project) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ tường trên bản vẽ này để vẽ lại từ đầu?')) {
      const updatedProj: ProjectData = {
        ...project,
        obstacles: project.obstacles.filter((o) => o.type !== 'wall'),
        simulation: {
          ...project.simulation,
          revision: project.simulation.revision + 1,
        },
      };
      setProject(updatedProj);
      setActiveTool('select');
      api.saveProject(updatedProj).catch((err) => console.warn(err));
      triggerFastSimulation(updatedProj);
    }
  };

  // Add Obstacle (Wall or Rack)
  const handleAddObstacle = (newObstacle: Obstacle) => {
    if (!project) return;
    const updatedProj = {
      ...project,
      obstacles: [...project.obstacles, newObstacle],
    };
    setProject(updatedProj);
    triggerFastSimulation(updatedProj);
  };

  // Update Obstacle (move, resize, rotate)
  const handleUpdateObstacle = (updatedObs: Obstacle) => {
    if (!project) return;
    const updated = project.obstacles.map((o) => (o.id === updatedObs.id ? updatedObs : o));
    const updatedProj = { ...project, obstacles: updated };
    setProject(updatedProj);
    triggerFastSimulation(updatedProj);
  };

  // Delete Obstacle
  const handleDeleteObstacle = (obsId: string) => {
    if (!project) return;
    const updated = project.obstacles.filter((o) => o.id !== obsId);
    const updatedProj = { ...project, obstacles: updated };
    setProject(updatedProj);
    triggerFastSimulation(updatedProj);
  };

  // Zone selected for AI Planner (Idea 4)
  const handleZoneSelected = (zone: { x: number; y: number; width: number; height: number }) => {
    setAiPlanZone(zone);
    setShowAiModal(true);
  };

  // Trigger whole-floor AI Planner
  const handleOpenAiPlanner = () => {
    if (!project) return;
    const ppm = project.project.scale.pixelsPerMeter || 24;
    const floorW = Math.round(((project.background.widthPx || 1440) / ppm) * 10) / 10;
    const floorH = Math.round(((project.background.heightPx || 864) / ppm) * 10) / 10;
    setAiPlanZone({
      x: 0,
      y: 0,
      width: floorW,
      height: floorH,
    });
    setShowAiModal(true);
  };

  // Apply AI Generated APs (Idea 4)
  const handleApplyAiPlan = (
    newAps: AccessPoint[],
    replaceExisting: boolean,
    newExclusionZones?: ExclusionZone[]
  ) => {
    if (!project) return;
    let finalAps = [...project.aps];
    if (replaceExisting && aiPlanZone) {
      finalAps = finalAps.filter(
        (ap) =>
          ap.positionM.x < aiPlanZone.x ||
          ap.positionM.x > aiPlanZone.x + aiPlanZone.width ||
          ap.positionM.y < aiPlanZone.y ||
          ap.positionM.y > aiPlanZone.y + aiPlanZone.height
      );
    }
    finalAps = [...finalAps, ...newAps];

    const updatedProj: ProjectData = {
      ...project,
      aps: finalAps,
      exclusionZones: newExclusionZones !== undefined ? newExclusionZones : (project.exclusionZones || []),
      simulation: {
        ...project.simulation,
        revision: project.simulation.revision + 1,
      },
    };
    setProject(updatedProj);
    if (newAps.length > 0) setSelectedApId(newAps[0].id);
    setActiveTool('select');
    triggerFastSimulation(updatedProj);
    api.saveProject(updatedProj).catch(() => {});
  };

  // Probe single point inspection
  const handleProbePoint = async (xM: number, yM: number) => {
    if (!project) return;
    setProbePoint([xM, yM]);
    try {
      const sample = await api.computeSample(
        project.project.id,
        activeBand,
        xM,
        yM,
        project.project.receiverProfile.heightM,
        project
      );
      setProbeSample(sample);
      setActiveTab('inspect');
    } catch (err) {
      console.error('Lỗi đo kiểm điểm mẫu:', err);
    }
  };

  useEffect(() => {
    if (project && probePoint && !probeSample) {
      handleProbePoint(probePoint[0], probePoint[1]);
    }
  }, [project]);

  // Scale calibration modal trigger
  const handleCalibrateScale = (p1: [number, number], p2: [number, number]) => {
    setCalibrationModalData({ p1, p2, mode: 'ruler' });
  };

  const handleConfirmScale = (newPpm: number, referenceLengthM: number, keepVisualPositions: boolean = true) => {
    if (!project) return;
    const oldPpm = project.project.scale.pixelsPerMeter || 20;
    const ratio = oldPpm / newPpm;

    // Rescale AP meter coordinates to keep them at the exact same blueprint location
    const updatedAps = keepVisualPositions
      ? project.aps.map((ap) => ({
          ...ap,
          positionM: {
            ...ap.positionM,
            x: Math.round(ap.positionM.x * ratio * 100) / 100,
            y: Math.round(ap.positionM.y * ratio * 100) / 100,
          },
        }))
      : project.aps;

    // Rescale obstacle meter coordinates
    const updatedObstacles = keepVisualPositions
      ? project.obstacles.map((obs) => ({
          ...obs,
          pointsM: obs.pointsM.map((p) => [
            Math.round(p[0] * ratio * 100) / 100,
            Math.round(p[1] * ratio * 100) / 100,
          ]) as [number, number][],
          thicknessM: obs.thicknessM ? Math.round(obs.thicknessM * ratio * 100) / 100 : obs.thicknessM,
        }))
      : project.obstacles;

    const updatedProj: ProjectData = {
      ...project,
      project: {
        ...project.project,
        scale: {
          calibrated: true,
          pixelsPerMeter: parseFloat(newPpm.toFixed(2)),
          referenceLengthM: parseFloat(referenceLengthM.toFixed(2)),
        },
      },
      aps: updatedAps,
      obstacles: updatedObstacles,
      simulation: {
        ...project.simulation,
        revision: project.simulation.revision + 1,
      },
    };

    setProject(updatedProj);
    setCalibrationModalData(null);
    setActiveTool('select');
    api.saveProject(updatedProj).catch((err) => console.warn('Lỗi lưu dự án:', err));
    triggerFastSimulation(updatedProj);
  };

  // Save Project
  const handleSave = async () => {
    if (!project) return;
    setIsSaving(true);
    try {
      await api.saveProject(project);
      alert(`Đã lưu thành công dự án "${project.project.name}"!`);
    } catch (err: any) {
      alert('Lỗi lưu dự án: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default warehouse
  const handleReset = async () => {
    if (window.confirm('Bạn có chắc chắn muốn đặt lại bản vẽ mẫu nhà kho chuẩn ban đầu?')) {
      try {
        const def = await api.resetDefaultProject();
        setProject(def);
        runBackendSimulation(def, activeBand, gridResolution);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Export PDF Report
  const handleExportPdf = async () => {
    if (!project) return;
    try {
      const blob = await api.downloadPdfReport(project);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WiFi_RF_Plan_${project.project.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Lỗi tải báo cáo PDF: ' + err.message);
    }
  };

  // Blueprint Upload (PDF / Image) (Idea 1)
  const handleBlueprintLoaded = async (
    imageDataUrl: string,
    fileName: string,
    widthPx: number,
    heightPx: number,
    estimatedWidthM: number,
    estimatedHeightM: number,
    autoDetectWalls: boolean = true
  ) => {
    if (!project) return;
    const validWidthM = Math.max(5.0, estimatedWidthM || 60.0);
    const validHeightM = Math.max(5.0, estimatedHeightM || 36.0);
    const calculatedPpm = Math.max(2.0, Math.round((widthPx / validWidthM) * 100) / 100);

    // Xoa AP mau cua preset cu neu nguoi dung nap ban ve moi
    const isPreset = ['warehouse-tan-tao', 'office-complex-hcm', 'retail-supermarket-vn'].includes(project.project.id);
    const validAps = isPreset ? [] : project.aps.filter(ap => ap.positionM.x <= validWidthM && ap.positionM.y <= validHeightM);

    const updatedProj: ProjectData = {
      ...project,
      background: {
        ...project.background,
        type: 'image',
        fileName: fileName,
        imageDataUrl: imageDataUrl,
        widthPx: widthPx,
        heightPx: heightPx,
      },
      project: {
        ...project.project,
        scale: {
          calibrated: true,
          pixelsPerMeter: calculatedPpm,
          referenceLengthM: validWidthM,
        },
      },
      // Xóa vật cản mẫu của dự án cũ để người dùng vẽ trên mặt bằng thực tế mới
      obstacles: [],
      aps: validAps,
      simulation: {
        ...project.simulation,
        revision: project.simulation.revision + 1,
      },
    };
    setProject(updatedProj);
    setSelectedApId(validAps.length > 0 ? validAps[0].id : null);
    setShowUploadModal(false);
    setActiveTool('select');
    api.saveProject(updatedProj).catch((err) => console.warn('Lỗi lưu dự án:', err));
    triggerFastSimulation(updatedProj);

    if (autoDetectWalls) {
      handleDetectWalls(updatedProj);
    }
  };

  const handleBandChange = (band: BandType) => {
    setActiveBand(band);
    if (project) {
      runBackendSimulation(project, band, gridResolution);
    }
  };

  const handleResolutionChange = (res: number) => {
    setGridResolution(res);
    if (project) {
      runBackendSimulation(project, activeBand, res);
    }
  };

  if (!project) {
    return (
      <div className="rf-app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="rf-spinner" style={{ width: 40, height: 40 }} />
        <span style={{ marginTop: 16, color: '#38bdf8', fontSize: 13, fontFamily: 'JetBrains Mono' }}>
          Đang khởi tạo RF Engine & Mô hình suy hao 3D...
        </span>
      </div>
    );
  }

  return (
    <div className="rf-app-container">
      {/* Top Navigation */}
      <TopNav
        project={project}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'inspect') setActiveTool('inspect');
          else if (tab === 'design') setActiveTool('select');
        }}
        onSave={handleSave}
        onReset={handleReset}
        onExportPdf={handleExportPdf}
        onOpenProjectManager={() => setShowProjectManager(true)}
        onOpenUploadBlueprint={() => setShowUploadModal(true)}
        onOpenScaleModal={() => setCalibrationModalData({ mode: 'direct' })}
        onOpenAiPlanner={handleOpenAiPlanner}
        onDetectWalls={() => handleDetectWalls()}
        isDetectingWalls={isDetectingWalls}
        isSaving={isSaving}
        activeBand={activeBand}
        onBandChange={handleBandChange}
      />

      {/* Main Workspace Layout */}
      <div className="rf-main-workspace">
        {/* Left Toolbar */}
        <LeftToolbar
          activeTool={activeTool}
          onSelectTool={(tool) => {
            setActiveTool(tool);
            if (tool === 'inspect') setActiveTab('inspect');
            else if (tool === 'ap') {
              setActiveTab('design');
              setDesignSidebarSubTab('palette');
            } else if (tool === 'ai_plan') {
              handleOpenAiPlanner();
            }
          }}
          showHeatmap={showHeatmap}
          setShowHeatmap={setShowHeatmap}
          showWalls={showWalls}
          setShowWalls={setShowWalls}
          showRacks={showRacks}
          setShowRacks={setShowRacks}
          showApLabels={showApLabels}
          setShowApLabels={setShowApLabels}
          showRays={showRays}
          setShowRays={setShowRays}
          heatmapOpacity={heatmapOpacity}
          setHeatmapOpacity={setHeatmapOpacity}
        />

        {/* Central Floor Plan Canvas */}
        <main className="rf-canvas-area" style={{ position: 'relative' }}>
          {/* Idea 2: Floating Wall Drawing Sub-Toolbar */}
          {activeTool === 'wall' && (
            <WallDrawingBar
              materials={project.materials}
              config={wallDrawingConfig}
              onChangeConfig={setWallDrawingConfig}
              onFinish={() => setActiveTool('select')}
              onCancel={() => setActiveTool('select')}
              onClearAllWalls={handleClearAllWalls}
            />
          )}

          {/* Prompt banner to scan walls if blueprint has no obstacles */}
          {project.obstacles.length === 0 && project.background.imageDataUrl && activeTool !== 'calibrate' && (
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 35,
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1.5px solid #6366f1',
                borderRadius: '8px',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              }}
            >
              <span style={{ fontSize: '12px', color: '#c7d2fe', fontWeight: 600 }}>
                💡 Bản vẽ chưa có tường cản sóng (đang mô phỏng phòng trống).
              </span>
              <button
                className="rf-btn-primary"
                onClick={() => handleDetectWalls()}
                disabled={isDetectingWalls}
                style={{ padding: '4px 12px', fontSize: '11px', background: '#4f46e5', borderRadius: '4px', fontWeight: 700 }}
              >
                {isDetectingWalls ? 'Đang quét...' : '🤖 Quét Tường AI Ngay'}
              </button>
            </div>
          )}

          {/* Scale Calibration Guidance Banner */}
          {activeTool === 'calibrate' && (
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 40,
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1.5px solid #06b6d4',
                borderRadius: '8px',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              }}
            >
              <Ruler size={16} style={{ color: '#06b6d4' }} />
              <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600 }}>
                📏 Click 2 điểm trên bản vẽ để đo tỷ lệ thước, hoặc nhập trực tiếp kích thước sàn
              </span>
              <button
                className="rf-btn-primary"
                onClick={() => setCalibrationModalData({ mode: 'direct' })}
                style={{ padding: '4px 10px', fontSize: '11px', background: '#0284c7', borderRadius: '4px' }}
              >
                Nhập Kích Thước Trực Tiếp
              </button>
              <button
                onClick={() => setActiveTool('select')}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}
                title="Hủy đo thước (Esc)"
              >
                ✕
              </button>
            </div>
          )}

          {/* AI Selection Zone Guidance Banner */}
          {activeTool === 'ai_plan' && (
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 40,
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1.5px solid #ec4899',
                borderRadius: '8px',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              }}
            >
              <span style={{ fontSize: '12px', color: '#f472b6', fontWeight: 600 }}>
                🤖 Kéo chuột trên bản đồ để khoanh vùng khu vực cần AI bố trí AP (hoặc chọn toàn bộ kho)
              </span>
              <button
                className="rf-btn-primary"
                onClick={handleOpenAiPlanner}
                style={{ padding: '4px 10px', fontSize: '11px', background: '#ec4899', borderRadius: '4px' }}
              >
                Chọn Toàn Bộ Kho
              </button>
              <button
                onClick={() => setActiveTool('select')}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}
              >
                ✕
              </button>
            </div>
          )}

          <FloorPlanCanvas
            project={project}
            activeTool={activeTool}
            activeBand={activeBand}
            visMetric={visMetric}
            gridData={gridData}
            selectedApId={selectedApId}
            onSelectAp={(id) => {
              setSelectedApId(id);
              if (id) {
                setActiveTab('design');
                setDesignSidebarSubTab('editor');
              }
            }}
            onUpdateApPosition={handleUpdateApPosition}
            onAddObstacle={handleAddObstacle}
            onUpdateObstacle={handleUpdateObstacle}
            onDeleteObstacle={handleDeleteObstacle}
            onSelectTool={setActiveTool}
            onAddAp={handleAddAp}
            onAddApWithConfig={handleAddApWithConfig}
            onProbePoint={handleProbePoint}
            onCalibrateScale={handleCalibrateScale}
            onZoneSelected={handleZoneSelected}
            wallConfig={wallDrawingConfig}
            probePoint={probePoint}
            probeSample={probeSample}
            heatmapOpacity={heatmapOpacity}
            showHeatmap={showHeatmap}
            showWalls={showWalls}
            showRacks={showRacks}
            showApLabels={showApLabels}
            showRays={showRays}
          />
        </main>

        {/* Right Tabbed Sidebar */}
        <aside className="rf-sidebar">
          {activeTab === 'design' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Sub-tab toggle between AP List/Editor and AP Palette (Idea 3) */}
              <div style={{ display: 'flex', borderBottom: '1px solid #334155', background: '#0f172a' }}>
                <button
                  className={`rf-tab-btn ${designSidebarSubTab === 'editor' ? 'active' : ''}`}
                  onClick={() => setDesignSidebarSubTab('editor')}
                  style={{ flex: 1, padding: '8px 12px', fontSize: '11px', borderRadius: 0, justifyContent: 'center' }}
                >
                  <Wifi size={14} />
                  <span>AP Đã Đặt ({project.aps.length})</span>
                </button>
                <button
                  className={`rf-tab-btn ${designSidebarSubTab === 'palette' ? 'active' : ''}`}
                  onClick={() => setDesignSidebarSubTab('palette')}
                  style={{ flex: 1, padding: '8px 12px', fontSize: '11px', borderRadius: 0, justifyContent: 'center' }}
                >
                  <Sliders size={14} />
                  <span>Thư Viện Kéo-Thả</span>
                </button>
              </div>

              {designSidebarSubTab === 'editor' ? (
                <ApEditorPanel
                  project={project}
                  selectedApId={selectedApId}
                  onSelectAp={setSelectedApId}
                  onUpdateAp={handleUpdateAp}
                  onDeleteAp={handleDeleteAp}
                  activeBand={activeBand}
                  onBandChange={handleBandChange}
                />
              ) : (
                <ApPalettePanel
                  onAddApWithConfig={handleAddApWithConfig}
                  onClose={() => setDesignSidebarSubTab('editor')}
                />
              )}
            </div>
          )}

          {activeTab === 'inspect' && (
            <InspectProbePanel
              probePoint={probePoint}
              probeSample={probeSample}
              project={project}
              onClearProbe={() => {
                setProbePoint(null);
                setProbeSample(null);
              }}
            />
          )}

          {activeTab === 'survey' && (
            <SurveyPanel
              project={project}
              onUpdateProject={(updated) => {
                setProject(updated);
                runBackendSimulation(updated, activeBand, gridResolution);
              }}
            />
          )}

          {activeTab === 'wlc' && (
            <CiscoWlcPanel
              project={project}
              onRefreshProject={() => loadProject(project.project.id)}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsPanel
              project={project}
              onUpdateProject={(updated: ProjectData) => {
                setProject(updated);
                triggerFastSimulation(updated);
              }}
              onExportPdf={handleExportPdf}
            />
          )}
        </aside>
      </div>

      {/* Bottom Status & Metric Bar */}
      <BottomBar
        visMetric={visMetric}
        onMetricChange={setVisMetric}
        activeBand={activeBand}
        onBandChange={handleBandChange}
        gridResolution={gridResolution}
        onGridResolutionChange={handleResolutionChange}
        project={project}
        calcTimeMs={calcTimeMs}
      />

      {/* Idea 1: Project Manager Modal */}
      {showProjectManager && (
        <ProjectManagerModal
          currentProjectId={project.project.id}
          onSelectProject={(pId) => loadProject(pId)}
          onProjectCreated={(newProj) => {
            setProject(newProj);
            runBackendSimulation(newProj, activeBand, gridResolution);
          }}
          onClose={() => setShowProjectManager(false)}
        />
      )}

      {/* Idea 4: AI Auto-Plan Modal */}
      {showAiModal && aiPlanZone && (
        <AiAutoPlanModal
          project={project}
          zone={aiPlanZone}
          onApplyPlan={handleApplyAiPlan}
          onClose={() => {
            setShowAiModal(false);
            setAiPlanZone(null);
          }}
        />
      )}

      {/* Upload Blueprint Modal */}
      {showUploadModal && (
        <UploadBlueprintModal
          onBlueprintLoaded={handleBlueprintLoaded}
          onCancel={() => setShowUploadModal(false)}
        />
      )}

      {/* Scale Calibration Modal */}
      {calibrationModalData && (
        <ScaleCalibrationModal
          point1={calibrationModalData.p1}
          point2={calibrationModalData.p2}
          currentPpm={project.project.scale.pixelsPerMeter || 20}
          widthPx={project.background.widthPx || 1200}
          heightPx={project.background.heightPx || 800}
          initialMode={calibrationModalData.mode || (calibrationModalData.p1 && calibrationModalData.p2 ? 'ruler' : 'direct')}
          onConfirmScale={handleConfirmScale}
          onStartRulerMeasurement={() => {
            setCalibrationModalData(null);
            setActiveTool('calibrate');
          }}
          onCancel={() => setCalibrationModalData(null)}
        />
      )}
    </div>
  );
};



export default App;
