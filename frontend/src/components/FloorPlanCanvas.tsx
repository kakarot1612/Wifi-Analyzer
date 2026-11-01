import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ProjectData,
  Obstacle,
  ToolMode,
  VisMetric,
  GridData,
  BandType,
} from '../types';
import { HeatmapRenderer2D, CanvasApData, CanvasObstacleData, CanvasRackData } from '../utils/heatmapRenderer2D';
import { WallDrawingConfig } from './WallDrawingBar';
import { RotateCw, Trash2, Maximize2 } from 'lucide-react';

interface FloorPlanCanvasProps {
  project: ProjectData;
  activeTool: ToolMode;
  activeBand: BandType;
  visMetric: VisMetric;
  gridData: GridData | null;
  selectedApId: string | null;
  onSelectAp: (apId: string | null) => void;
  onUpdateApPosition: (apId: string, xM: number, yM: number) => void;
  onAddObstacle: (obstacle: Obstacle) => void;
  onUpdateObstacle?: (updated: Obstacle) => void;
  onDeleteObstacle?: (obstacleId: string) => void;
  onAddAp: (xM: number, yM: number) => void;
  onAddApWithConfig?: (config: any, xM?: number, yM?: number) => void;
  onProbePoint: (xM: number, yM: number) => void;
  onCalibrateScale: (p1: [number, number], p2: [number, number]) => void;
  onZoneSelected?: (zone: { x: number; y: number; width: number; height: number }) => void;
  onSelectTool?: (tool: ToolMode) => void;
  wallConfig?: WallDrawingConfig;
  probePoint: [number, number] | null;
  probeSample: any | null;
  heatmapOpacity: number;
  showHeatmap: boolean;
  showWalls: boolean;
  showRacks: boolean;
  showApLabels: boolean;
  showRays: boolean;
}

export const FloorPlanCanvas: React.FC<FloorPlanCanvasProps> = ({
  project,
  activeTool,
  activeBand,
  visMetric,
  selectedApId,
  onSelectAp,
  onUpdateApPosition,
  onAddObstacle,
  onUpdateObstacle,
  onDeleteObstacle,
  onAddAp,
  onAddApWithConfig,
  onProbePoint,
  onCalibrateScale,
  onZoneSelected,
  onSelectTool,
  wallConfig,
  probePoint,
  probeSample,
  heatmapOpacity,
  showHeatmap,
  showWalls,
  showRacks,
  showApLabels,
  showRays,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<HeatmapRenderer2D>(new HeatmapRenderer2D());

  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const [bgLoaded, setBgLoaded] = useState<boolean>(false);

  const [scale, setScale] = useState<number>(0.8);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const startPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [selectedObstacleId, setSelectedObstacleId] = useState<string | null>(null);

  const dragApRef = useRef<{ apId: string; currentX: number; currentY: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const dragObsRef = useRef<{
    obsId: string;
    startMx: number;
    startMy: number;
    origPoints: [number, number][];
  } | null>(null);

  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [calibrationPoints, setCalibrationPoints] = useState<[number, number][]>([]);
  const [rectStartM, setRectStartM] = useState<{ x: number; y: number } | null>(null);
  const [hoverM, setHoverM] = useState<{ x: number; y: number } | null>(null);

  const ppm = project.project.scale.pixelsPerMeter || 24;

  useEffect(() => {
    const imgUrl = project.background.imageDataUrl;
    if (imgUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        bgImgRef.current = img;
        setBgLoaded(true);
      };
      img.onerror = () => {
        console.warn('Không thể tải ảnh nền bản vẽ:', imgUrl);
        bgImgRef.current = null;
        setBgLoaded(false);
      };
      img.src = imgUrl;
    } else {
      bgImgRef.current = null;
      setBgLoaded(false);
    }
  }, [project.background.imageDataUrl]);

  const fitToScreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cW = container.clientWidth;
    const cH = container.clientHeight;
    const bgW = project.background.widthPx || 1440;
    const bgH = project.background.heightPx || 864;
    const pad = 60;

    const scaleX = (cW - pad * 2) / bgW;
    const scaleY = (cH - pad * 2) / bgH;
    const fitScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.15), 3.0);
    const fitOffsetX = Math.round((cW - bgW * fitScale) / 2);
    const fitOffsetY = Math.round((cH - bgH * fitScale) / 2);

    setScale(fitScale);
    setOffset({ x: fitOffsetX, y: fitOffsetY });
  }, [project.background.widthPx, project.background.heightPx]);

  useEffect(() => {
    fitToScreen();
  }, [project.project.id, project.background.fileName, project.background.imageDataUrl, project.background.widthPx, project.background.heightPx]);

  useEffect(() => {
    setDrawingPoints([]);
    setRectStartM(null);
    setCalibrationPoints([]);
    setSelectedObstacleId(null);
  }, [project.project.id, activeTool]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        setDrawingPoints([]);
        setRectStartM(null);
        setCalibrationPoints([]);
        setSelectedObstacleId(null);
        if (onSelectTool) onSelectTool('select');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObstacleId && onDeleteObstacle) {
          onDeleteObstacle(selectedObstacleId);
          setSelectedObstacleId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObstacleId, onDeleteObstacle, onSelectTool]);

  const screenToWorld = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { pxX: 0, pxY: 0, mX: 0, mY: 0 };
      const scrX = e.clientX - rect.left;
      const scrY = e.clientY - rect.top;
      const pxX = (scrX - offset.x) / scale;
      const pxY = (scrY - offset.y) / scale;
      const mX = pxX / ppm;
      const mY = pxY / ppm;
      return { pxX, pxY, mX, mY };
    },
    [offset, scale, ppm]
  );

  const renderCanvas = useCallback(
    (isFastDrag = false) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const container = containerRef.current;
      const width = container?.clientWidth || 1200;
      const height = container?.clientHeight || 750;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(offset.x, offset.y);
      ctx.scale(scale, scale);

      const bgWidthPx = project.background.widthPx || 1440;
      const bgHeightPx = project.background.heightPx || 864;

      // 1. Draw Background: Image or Dark Grid
      if (bgImgRef.current && bgLoaded) {
        ctx.drawImage(bgImgRef.current, 0, 0, bgWidthPx, bgHeightPx);
      } else {
        ctx.fillStyle = '#0a0f1d';
        ctx.fillRect(0, 0, bgWidthPx, bgHeightPx);

        ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
        ctx.lineWidth = 1;
        const stepPx = 5 * ppm;
        ctx.beginPath();
        for (let x = 0; x <= bgWidthPx; x += stepPx) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, bgHeightPx);
        }
        for (let y = 0; y <= bgHeightPx; y += stepPx) {
          ctx.moveTo(0, y);
          ctx.lineTo(bgWidthPx, y);
        }
        ctx.stroke();
      }

      // 2. Heatmap Layer on top
      if (showHeatmap && rendererRef.current) {
        const matMap = new Map(project.materials.map((m) => [m.id, m]));

        const apList: CanvasApData[] = project.aps.map((ap) => {
          let x = ap.positionM.x;
          let y = ap.positionM.y;
          if (dragApRef.current && dragApRef.current.apId === ap.id) {
            x = dragApRef.current.currentX;
            y = dragApRef.current.currentY;
          }
          const radio = ap.radios ? ap.radios[activeBand] : undefined;
          const isEnabled = radio ? (radio.enabled !== false) : true;
          const defaultGain = activeBand === '2.4' ? 4.0 : 6.0;
          return {
            x,
            y,
            z: ap.positionM.z || 4.5,
            txPower: radio ? (radio.txPowerDbm ?? 14.0) : 14.0,
            gain: radio ? (radio.antennaGainDbi ?? defaultGain) : defaultGain,
            cableLoss: radio ? (radio.cableLossDb || 0.0) : 0.0,
            orientationDeg: ap.orientationDeg || 0,
            isDirectional: ap.antennaType === 'directional_aisle',
            enabled: isEnabled,
          };
        });

        const wallList: CanvasObstacleData[] = [];
        project.obstacles
          .filter((o) => o.type === 'wall' && o.pointsM.length >= 2)
          .forEach((w) => {
            const mat = matMap.get(w.materialId);
            const loss = mat?.attenuationDb?.[activeBand] ?? mat?.attenuationDb?.['5'] ?? 8.0;
            for (let i = 0; i < w.pointsM.length - 1; i++) {
              wallList.push({
                x1: w.pointsM[i][0],
                y1: w.pointsM[i][1],
                x2: w.pointsM[i + 1][0],
                y2: w.pointsM[i + 1][1],
                loss: loss,
                height: w.heightM || 3.5,
              });
            }
          });

        const rackList: CanvasRackData[] = project.obstacles
          .filter((o) => o.type === 'rack' && o.pointsM.length >= 2)
          .map((r) => {
            const minX = Math.min(...r.pointsM.map((p) => p[0]));
            const maxX = Math.max(...r.pointsM.map((p) => p[0]));
            const minY = Math.min(...r.pointsM.map((p) => p[1]));
            const maxY = Math.max(...r.pointsM.map((p) => p[1]));
            return {
              minX,
              maxX,
              minY,
              maxY,
              loss: r.attenuationDbPerM || 18.0,
              height: r.heightM || 6.0,
            };
          });

        rendererRef.current.renderHeatmap(ctx, {
          widthM: bgWidthPx / ppm,
          heightM: bgHeightPx / ppm,
          ppm: ppm,
          gridStepM: isFastDrag ? 0.35 : 0.15,
          freqMHz: activeBand === '2.4' ? 2440 : (activeBand === '5' ? 5200 : 6200),
          pathLossExp: project.simulation.pathLossExponent || 2.8,
          refDist: 1.0,
          rxHeight: project.project.receiverProfile.heightM || 1.2,
          rxGain: 0.0,
          noiseFloor: -92.0,
          opacity: heatmapOpacity,
          visMode: visMetric === 'rssi' ? 0 : (visMetric === 'snr' ? 1 : (visMetric === 'serving' ? 2 : 3)),
          aps: apList,
          walls: wallList,
          racks: rackList,
        });
      }

      // 3. Warehouse Racks
      if (showRacks) {
        const racks = project.obstacles.filter((o) => o.type === 'rack');
        racks.forEach((rack) => {
          if (rack.pointsM.length < 2) return;
          const isSelected = rack.id === selectedObstacleId;

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(rack.pointsM[0][0] * ppm, rack.pointsM[0][1] * ppm);
          for (let i = 1; i < rack.pointsM.length; i++) {
            ctx.lineTo(rack.pointsM[i][0] * ppm, rack.pointsM[i][1] * ppm);
          }
          ctx.closePath();

          ctx.fillStyle = isSelected ? 'rgba(6, 182, 212, 0.35)' : 'rgba(234, 179, 8, 0.28)';
          ctx.fill();
          ctx.strokeStyle = isSelected ? '#06b6d4' : '#eab308';
          ctx.lineWidth = isSelected ? 3.5 : 2.5;
          ctx.stroke();

          const minX = Math.min(...rack.pointsM.map((p) => p[0])) * ppm;
          const maxX = Math.max(...rack.pointsM.map((p) => p[0])) * ppm;
          const minY = Math.min(...rack.pointsM.map((p) => p[1])) * ppm;
          const maxY = Math.max(...rack.pointsM.map((p) => p[1])) * ppm;

          ctx.strokeStyle = isSelected ? 'rgba(6, 182, 212, 0.6)' : 'rgba(234, 179, 8, 0.55)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          for (let lx = minX; lx < maxX + (maxY - minY); lx += 16) {
            ctx.moveTo(lx, minY);
            ctx.lineTo(lx - (maxY - minY), maxY);
          }
          ctx.stroke();

          if (isSelected) {
            ctx.fillStyle = '#06b6d4';
            rack.pointsM.forEach((pt) => {
              ctx.fillRect(pt[0] * ppm - 5, pt[1] * ppm - 5, 10, 10);
            });
          }

          const midX = (minX + maxX) / 2;
          const midY = (minY + maxY) / 2;
          const rackW_m = ((maxX - minX) / ppm).toFixed(1);
          const rackH_m = ((maxY - minY) / ppm).toFixed(1);

          ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
          ctx.fillRect(midX - 70, midY - 11, 140, 22);
          ctx.strokeStyle = isSelected ? '#06b6d4' : 'rgba(234, 179, 8, 0.8)';
          ctx.strokeRect(midX - 70, midY - 11, 140, 22);

          ctx.fillStyle = isSelected ? '#38bdf8' : '#fef08a';
          ctx.font = 'bold 10px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`Kệ Kho ${rackW_m}m × ${rackH_m}m`, midX, midY);

          ctx.restore();
        });
      }

      // 3.5. Exclusion Zones (Vùng loại trừ không cần sóng)
      if (project.exclusionZones && project.exclusionZones.length > 0) {
        project.exclusionZones.forEach((ex) => {
          const exX = ex.x * ppm;
          const exY = ex.y * ppm;
          const exW = ex.width * ppm;
          const exH = ex.height * ppm;

          ctx.save();
          // Shaded background
          ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
          ctx.fillRect(exX, exY, exW, exH);

          // Dashed border
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(exX, exY, exW, exH);

          // Diagonal hatch lines
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.22)';
          ctx.lineWidth = 1.0;
          ctx.setLineDash([]);
          ctx.beginPath();
          for (let lx = exX; lx < exX + exW + exH; lx += 18) {
            ctx.moveTo(lx, exY);
            ctx.lineTo(lx - exH, exY + exH);
          }
          ctx.stroke();

          // Badge label
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          const label = '[Loại Trừ] ' + (ex.name || '') + ' (' + ex.width.toFixed(1) + 'm × ' + ex.height.toFixed(1) + 'm)';
          ctx.font = 'bold 10px Inter, sans-serif';
          const txtW = ctx.measureText(label).width + 12;
          ctx.fillRect(exX + 6, exY + 6, txtW, 18);
          ctx.strokeStyle = '#ef4444';
          ctx.strokeRect(exX + 6, exY + 6, txtW, 18);

          ctx.fillStyle = '#fca5a5';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, exX + 12, exY + 15);

          ctx.restore();
        });
      }

      // 4. Walls
      if (showWalls) {
        const walls = project.obstacles.filter((o) => o.type === 'wall');
        const matMap = new Map(project.materials.map((m) => [m.id, m]));

        walls.forEach((wall) => {
          if (wall.pointsM.length < 2) return;
          const isSelected = wall.id === selectedObstacleId;
          const mat = matMap.get(wall.materialId);
          const wallColor = isSelected ? '#06b6d4' : (mat?.color || '#f97316');
          const lineThick = Math.max(3.5, (wall.thicknessM || 0.15) * ppm);

          ctx.save();
          ctx.strokeStyle = wallColor;
          ctx.lineWidth = isSelected ? lineThick + 2 : lineThick;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          ctx.beginPath();
          ctx.moveTo(wall.pointsM[0][0] * ppm, wall.pointsM[0][1] * ppm);
          for (let i = 1; i < wall.pointsM.length; i++) {
            ctx.lineTo(wall.pointsM[i][0] * ppm, wall.pointsM[i][1] * ppm);
          }
          ctx.stroke();

          if (isSelected) {
            ctx.fillStyle = '#06b6d4';
            wall.pointsM.forEach((pt) => {
              ctx.beginPath();
              ctx.arc(pt[0] * ppm, pt[1] * ppm, 5, 0, Math.PI * 2);
              ctx.fill();
            });
          }

          ctx.restore();
        });
      }

      // 5. In-progress Wall Line
      if (drawingPoints.length > 0) {
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(drawingPoints[0][0] * ppm, drawingPoints[0][1] * ppm);
        for (let i = 1; i < drawingPoints.length; i++) {
          ctx.lineTo(drawingPoints[i][0] * ppm, drawingPoints[i][1] * ppm);
        }
        if (hoverM) {
          ctx.lineTo(hoverM.x * ppm, hoverM.y * ppm);
          const lastPt = drawingPoints[drawingPoints.length - 1];
          const distM = Math.hypot(hoverM.x - lastPt[0], hoverM.y - lastPt[1]);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
          ctx.fillRect(hoverM.x * ppm + 12, hoverM.y * ppm - 18, 90, 22);
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 11px Inter, sans-serif';
          ctx.fillText(`Dài: ${distM.toFixed(1)} m`, hoverM.x * ppm + 18, hoverM.y * ppm - 3);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 6. In-progress Dragged Box (Rack / Room Wall / AI Zone)
      if (rectStartM && hoverM) {
        const x1 = Math.min(rectStartM.x, hoverM.x) * ppm;
        const y1 = Math.min(rectStartM.y, hoverM.y) * ppm;
        const w = Math.abs(hoverM.x - rectStartM.x) * ppm;
        const h = Math.abs(hoverM.y - rectStartM.y) * ppm;
        const wM = Math.abs(hoverM.x - rectStartM.x);
        const hM = Math.abs(hoverM.y - rectStartM.y);

        ctx.save();
        if (activeTool === 'rack') {
          ctx.fillStyle = 'rgba(234, 179, 8, 0.3)';
          ctx.fillRect(x1, y1, w, h);
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 6]);
          ctx.strokeRect(x1, y1, w, h);

          ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
          ctx.fillRect(x1 + 10, y1 + 10, 180, 24);
          ctx.strokeStyle = '#eab308';
          ctx.strokeRect(x1 + 10, y1 + 10, 180, 24);

          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 11px Inter, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`Kệ: ${wM.toFixed(1)}m × ${hM.toFixed(1)}m (Cao 6m)`, x1 + 16, y1 + 26);
        } else if (activeTool === 'ai_plan') {
          ctx.fillStyle = 'rgba(236, 72, 153, 0.2)';
          ctx.fillRect(x1, y1, w, h);
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([8, 6]);
          ctx.strokeRect(x1, y1, w, h);

          ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
          ctx.fillRect(x1 + 10, y1 + 10, 190, 26);
          ctx.strokeStyle = '#ec4899';
          ctx.strokeRect(x1 + 10, y1 + 10, 190, 26);

          ctx.fillStyle = '#f472b6';
          ctx.font = 'bold 11px Inter, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`AI Vùng: ${wM.toFixed(1)}m × ${hM.toFixed(1)}m (${Math.round(wM * hM)}m²)`, x1 + 18, y1 + 27);
        } else if (activeTool === 'wall') {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
          ctx.fillRect(x1, y1, w, h);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 6]);
          ctx.strokeRect(x1, y1, w, h);

          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.fillRect(x1 + 10, y1 + 10, 160, 22);
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 10px Inter, sans-serif';
          ctx.fillText(`Phòng: ${wM.toFixed(1)}m × ${hM.toFixed(1)}m`, x1 + 16, y1 + 25);
        }
        ctx.restore();
      }

      // 7. Scale Calibration Line (CAD Precision Dimension Line)
      if (calibrationPoints.length > 0) {
        ctx.save();
        const p1 = calibrationPoints[0];
        const p2 = hoverM ? [hoverM.x, hoverM.y] : p1;
        const x1 = p1[0] * ppm;
        const y1 = p1[1] * ppm;
        const x2 = p2[0] * ppm;
        const y2 = p2[1] * ppm;
        const lineDistPx = Math.hypot(x2 - x1, y2 - y1);
        const lineDistM = lineDistPx / ppm;

        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(x1, y1, 6, 0, Math.PI * 2);
        ctx.arc(x2, y2, 6, 0, Math.PI * 2);
        ctx.fill();

        if (lineDistPx > 8) {
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const perp = angle + Math.PI / 2;
          const cap = 12;

          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x1 + Math.cos(perp) * cap, y1 + Math.sin(perp) * cap);
          ctx.lineTo(x1 - Math.cos(perp) * cap, y1 - Math.sin(perp) * cap);
          ctx.moveTo(x2 + Math.cos(perp) * cap, y2 + Math.sin(perp) * cap);
          ctx.lineTo(x2 - Math.cos(perp) * cap, y2 - Math.sin(perp) * cap);
          ctx.stroke();

          // Midpoint distance badge
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(midX - 60, midY - 14, 120, 26);
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(midX - 60, midY - 14, 120, 26);

          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 11px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${lineDistM.toFixed(2)}m (${lineDistPx.toFixed(0)}px)`, midX, midY);
        }
        ctx.restore();
      }

      // 8. 3D Ray-trace to Probe Point
      if (showRays && probePoint && probeSample) {
        const [px, py] = probePoint;
        ctx.save();
        probeSample.apSignals.forEach((sig: any) => {
          const ap = project.aps.find((a) => a.id === sig.apId);
          if (!ap) return;

          let apX = ap.positionM.x;
          let apY = ap.positionM.y;
          if (dragApRef.current && dragApRef.current.apId === ap.id) {
            apX = dragApRef.current.currentX;
            apY = dragApRef.current.currentY;
          }

          const isServing = ap.id === probeSample.servingApId;
          ctx.beginPath();
          ctx.moveTo(apX * ppm, apY * ppm);
          ctx.lineTo(px * ppm, py * ppm);
          ctx.strokeStyle = isServing ? '#22c55e' : 'rgba(148, 163, 184, 0.45)';
          ctx.lineWidth = isServing ? 2.5 : 1.2;
          if (!isServing) ctx.setLineDash([4, 4]);
          ctx.stroke();
        });

        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(px * ppm, py * ppm, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      // 9. Access Points
      project.aps.forEach((ap, idx) => {
        let apM_X = ap.positionM.x;
        let apM_Y = ap.positionM.y;
        if (dragApRef.current && dragApRef.current.apId === ap.id) {
          apM_X = dragApRef.current.currentX;
          apM_Y = dragApRef.current.currentY;
        }

        const apX = apM_X * ppm;
        const apY = apM_Y * ppm;
        const isSelected = ap.id === selectedApId;
        const radio = ap.radios ? ap.radios[activeBand] : undefined;
        const isRadioOn = radio ? (radio.enabled !== false) : true;

        ctx.save();

        if (ap.antennaType === 'directional_aisle') {
          const angleRad = (ap.orientationDeg * Math.PI) / 180;
          const beamAngleRad = (65 * Math.PI) / 180;
          const coneLengthPx = 135;

          const coneGrad = ctx.createRadialGradient(apX, apY, 5, apX, apY, coneLengthPx);
          coneGrad.addColorStop(0, isRadioOn ? 'rgba(6, 182, 212, 0.4)' : 'rgba(100, 116, 139, 0.2)');
          coneGrad.addColorStop(0.7, isRadioOn ? 'rgba(6, 182, 212, 0.15)' : 'rgba(100, 116, 139, 0.08)');
          coneGrad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

          ctx.fillStyle = coneGrad;
          ctx.beginPath();
          ctx.moveTo(apX, apY);
          ctx.arc(apX, apY, coneLengthPx, angleRad - beamAngleRad / 2, angleRad + beamAngleRad / 2);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = isRadioOn ? 'rgba(6, 182, 212, 0.8)' : '#64748b';
          ctx.lineWidth = 1.8;
          ctx.stroke();

          const arrowDist = 48;
          const arrowX = apX + Math.cos(angleRad) * arrowDist;
          const arrowY = apY + Math.sin(angleRad) * arrowDist;
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(apX, apY);
          ctx.lineTo(arrowX, arrowY);
          ctx.stroke();
        }

        if (isSelected) {
          ctx.beginPath();
          ctx.arc(apX, apY, 22, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(6, 182, 212, 0.3)';
          ctx.fill();
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(apX, apY, 14, 0, Math.PI * 2);
        ctx.fillStyle = isRadioOn ? '#0284c7' : '#334155';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${idx + 1}`, apX, apY);

        if (showApLabels) {
          const labelText = ap.label;
          const chNum = radio?.channelNumber ?? (activeBand === '2.4' ? 1 : 36);
          const pwr = radio?.txPowerDbm ?? 14;
          const channelText = isRadioOn ? `Ch ${chNum} | ${pwr}dBm (${activeBand}G)` : 'Radio OFF';

          ctx.font = 'bold 10px Inter, sans-serif';
          const labelWidth = Math.max(ctx.measureText(labelText).width, 75);

          ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
          ctx.fillRect(apX - labelWidth / 2 - 5, apY + 18, labelWidth + 10, 30);
          ctx.strokeStyle = isSelected ? '#06b6d4' : '#334155';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(apX - labelWidth / 2 - 5, apY + 18, labelWidth + 10, 30);

          ctx.fillStyle = '#f8fafc';
          ctx.textAlign = 'center';
          ctx.fillText(labelText, apX, apY + 30);

          ctx.fillStyle = isRadioOn ? '#38bdf8' : '#94a3b8';
          ctx.font = '9px JetBrains Mono, monospace';
          ctx.fillText(channelText, apX, apY + 42);
        }

        ctx.restore();
      });

      // Subtle boundary ticks on floorplan border
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= bgWidthPx; x += ppm) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, (x % (5 * ppm) === 0) ? 8 : 4);
      }
      for (let y = 0; y <= bgHeightPx; y += ppm) {
        ctx.moveTo(0, y);
        ctx.lineTo((y % (5 * ppm) === 0) ? 8 : 4, y);
      }
      ctx.stroke();

      ctx.restore(); // Restore world transform to 1:1 screen coordinates

      // 10. Ekahau-Style CAD Screen-Space Rulers (100% Crisp, Vector-Sharp at Any Zoom)
      const rulerH = 22; // Top ruler bar height
      const rulerW = 28; // Left ruler bar width

      // Top Ruler Bar
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(rulerW, 0, width - rulerW, rulerH);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rulerW, rulerH);
      ctx.lineTo(width, rulerH);
      ctx.stroke();

      // Left Ruler Bar
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(0, rulerH, rulerW, height - rulerH);
      ctx.beginPath();
      ctx.moveTo(rulerW, rulerH);
      ctx.lineTo(rulerW, height);
      ctx.stroke();

      // Top-Left Corner Box
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, rulerW, rulerH);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, rulerW, rulerH);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('m', rulerW / 2, rulerH / 2);

      // Determine smart step for meter labels based on current zoom
      const pxPerMOnScreen = ppm * scale;
      let majorStepM = 5;
      let minorStepM = 1;
      if (pxPerMOnScreen < 7) {
        majorStepM = 20;
        minorStepM = 5;
      } else if (pxPerMOnScreen < 18) {
        majorStepM = 10;
        minorStepM = 2;
      } else if (pxPerMOnScreen > 70) {
        majorStepM = 2;
        minorStepM = 0.5;
      }

      const maxWorldM_X = (bgWidthPx / ppm);
      const maxWorldM_Y = (bgHeightPx / ppm);

      // Render Top Ruler Ticks and Meter Labels
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      for (let m = 0; m <= maxWorldM_X + 2; m += minorStepM) {
        const scrX = Math.round(offset.x + m * ppm * scale);
        if (scrX < rulerW || scrX > width) continue;

        const isMajor = Math.abs(m % majorStepM) < 0.001 || Math.abs(m % majorStepM - majorStepM) < 0.001;

        if (isMajor) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(scrX, 10);
          ctx.lineTo(scrX, rulerH);
          ctx.stroke();

          ctx.fillStyle = '#f8fafc';
          ctx.fillText(`${Math.round(m)}m`, scrX, 1);
        } else {
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(scrX, 16);
          ctx.lineTo(scrX, rulerH);
          ctx.stroke();
        }
      }

      // Render Left Ruler Ticks and Meter Labels
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      for (let m = 0; m <= maxWorldM_Y + 2; m += minorStepM) {
        const scrY = Math.round(offset.y + m * ppm * scale);
        if (scrY < rulerH || scrY > height) continue;

        const isMajor = Math.abs(m % majorStepM) < 0.001 || Math.abs(m % majorStepM - majorStepM) < 0.001;

        if (isMajor) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(14, scrY);
          ctx.lineTo(rulerW, scrY);
          ctx.stroke();

          ctx.fillStyle = '#f8fafc';
          ctx.fillText(`${Math.round(m)}`, 12, scrY);
        } else {
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(20, scrY);
          ctx.lineTo(rulerW, scrY);
          ctx.stroke();
        }
      }

      // Cursor tracking indicator on rulers
      if (hoverM) {
        const curScrX = Math.round(offset.x + hoverM.x * ppm * scale);
        const curScrY = Math.round(offset.y + hoverM.y * ppm * scale);

        if (curScrX >= rulerW && curScrX <= width) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(curScrX - 4, 0);
          ctx.lineTo(curScrX + 4, 0);
          ctx.lineTo(curScrX, 6);
          ctx.closePath();
          ctx.fill();
        }

        if (curScrY >= rulerH && curScrY <= height) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(0, curScrY - 4);
          ctx.lineTo(0, curScrY + 4);
          ctx.lineTo(6, curScrY);
          ctx.closePath();
          ctx.fill();
        }
      }

      ctx.restore();
    },
    [
      scale,
      offset,
      project,
      activeBand,
      visMetric,
      selectedApId,
      selectedObstacleId,
      drawingPoints,
      calibrationPoints,
      rectStartM,
      hoverM,
      probePoint,
      probeSample,
      showHeatmap,
      showWalls,
      showRacks,
      showApLabels,
      showRays,
      heatmapOpacity,
      ppm,
      activeTool,
      bgLoaded,
    ]
  );

  useEffect(() => {
    let animId = requestAnimationFrame(() => renderCanvas(false));
    return () => cancelAnimationFrame(animId);
  }, [renderCanvas]);

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newScale = Math.min(Math.max(scale * zoomFactor, 0.15), 5.0);
    const newOffsetX = mouseX - (mouseX - offset.x) * (newScale / scale);
    const newOffsetY = mouseY - (mouseY - offset.y) * (newScale / scale);

    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || e.altKey) {
      setIsPanning(true);
      startPanRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
      return;
    }

    if (e.button === 2) {
      e.preventDefault();
      if (drawingPoints.length > 0) {
        setDrawingPoints([]);
      } else if (rectStartM) {
        setRectStartM(null);
      } else {
        setSelectedObstacleId(null);
        if (onSelectTool) onSelectTool('select');
      }
      return;
    }

    if (e.button !== 0) return;

    const { mX, mY, pxX, pxY } = screenToWorld(e);

    if (activeTool === 'select') {
      const hitAp = project.aps.find((ap) => {
        const apPxX = ap.positionM.x * ppm;
        const apPxY = ap.positionM.y * ppm;
        return Math.hypot(pxX - apPxX, pxY - apPxY) <= 24;
      });

      if (hitAp) {
        onSelectAp(hitAp.id);
        setSelectedObstacleId(null);
        dragApRef.current = {
          apId: hitAp.id,
          currentX: hitAp.positionM.x,
          currentY: hitAp.positionM.y,
        };
        setIsDragging(true);
        return;
      }

      const hitObstacle = project.obstacles.find((obs) => {
        if (obs.type === 'rack') {
          const minX = Math.min(...obs.pointsM.map((p) => p[0]));
          const maxX = Math.max(...obs.pointsM.map((p) => p[0]));
          const minY = Math.min(...obs.pointsM.map((p) => p[1]));
          const maxY = Math.max(...obs.pointsM.map((p) => p[1]));
          return mX >= minX && mX <= maxX && mY >= minY && mY <= maxY;
        } else if (obs.type === 'wall') {
          for (let i = 0; i < obs.pointsM.length - 1; i++) {
            const p1 = obs.pointsM[i];
            const p2 = obs.pointsM[i + 1];
            const dist = distToSegment(mX, mY, p1[0], p1[1], p2[0], p2[1]);
            if (dist <= 0.6) return true;
          }
        }
        return false;
      });

      if (hitObstacle) {
        setSelectedObstacleId(hitObstacle.id);
        onSelectAp(null);
        dragObsRef.current = {
          obsId: hitObstacle.id,
          startMx: mX,
          startMy: mY,
          origPoints: hitObstacle.pointsM.map((p) => [p[0], p[1]]),
        };
        setIsDragging(true);
        return;
      }

      onSelectAp(null);
      setSelectedObstacleId(null);
      setIsPanning(true);
      startPanRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    } else if (activeTool === 'inspect') {
      onProbePoint(mX, mY);
    } else if (activeTool === 'ap') {
      onAddAp(mX, mY);
      if (onSelectTool) onSelectTool('select');
    } else if (activeTool === 'calibrate') {
      const nextPts: [number, number][] = [...calibrationPoints, [mX, mY]];
      if (nextPts.length === 2) {
        onCalibrateScale(nextPts[0], nextPts[1]);
        setCalibrationPoints([]);
        if (onSelectTool) onSelectTool('select');
      } else {
        setCalibrationPoints(nextPts);
      }
    } else if (activeTool === 'rack') {
      setRectStartM({ x: mX, y: mY });
    } else if (activeTool === 'wall') {
      if (wallConfig?.drawMode === 'rect') {
        setRectStartM({ x: mX, y: mY });
      } else {
        if (drawingPoints.length === 0) {
          setDrawingPoints([[mX, mY]]);
        } else {
          const p1 = drawingPoints[drawingPoints.length - 1];
          const p2: [number, number] = [mX, mY];
          const distM = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
          if (distM >= 0.2) {
            const matId = wallConfig?.materialId || 'brick_wall';
            const hM = wallConfig?.heightM || 3.5;
            const thM = wallConfig?.thicknessM || 0.2;
            const newWall: Obstacle = {
              id: `wall-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              name: `Tường ngăn ${project.obstacles.filter((o) => o.type === 'wall').length + 1}`,
              type: 'wall',
              pointsM: [p1, p2],
              heightM: hM,
              thicknessM: thM,
              materialId: matId,
            };
            onAddObstacle(newWall);
            // Chain next segment from current point
            setDrawingPoints([[mX, mY]]);
          }
        }
      }
    } else if (activeTool === 'ai_plan') {
      setRectStartM({ x: mX, y: mY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { mX, mY } = screenToWorld(e);
    setHoverM({ x: mX, y: mY });

    if (isPanning) {
      setOffset({
        x: e.clientX - startPanRef.current.x,
        y: e.clientY - startPanRef.current.y,
      });
      return;
    }

    if (dragApRef.current) {
      dragApRef.current.currentX = Math.max(0, mX);
      dragApRef.current.currentY = Math.max(0, mY);
      requestAnimationFrame(() => renderCanvas(true));
    }

    if (dragObsRef.current && onUpdateObstacle) {
      const dx = mX - dragObsRef.current.startMx;
      const dy = mY - dragObsRef.current.startMy;
      const obs = project.obstacles.find((o) => o.id === dragObsRef.current?.obsId);
      if (obs) {
        const movedPts: [number, number][] = dragObsRef.current.origPoints.map((p) => [
          Math.round((p[0] + dx) * 2) / 2,
          Math.round((p[1] + dy) * 2) / 2,
        ]);
        onUpdateObstacle({ ...obs, pointsM: movedPts });
        requestAnimationFrame(() => renderCanvas(true));
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);

    if (dragApRef.current) {
      const { apId, currentX, currentY } = dragApRef.current;
      dragApRef.current = null;
      setIsDragging(false);
      onUpdateApPosition(apId, currentX, currentY);
      requestAnimationFrame(() => renderCanvas(false));
    }

    if (dragObsRef.current) {
      dragObsRef.current = null;
      setIsDragging(false);
      requestAnimationFrame(() => renderCanvas(false));
    }

    if (rectStartM && hoverM) {
      const minX = Math.min(rectStartM.x, hoverM.x);
      const maxX = Math.max(rectStartM.x, hoverM.x);
      const minY = Math.min(rectStartM.y, hoverM.y);
      const maxY = Math.max(rectStartM.y, hoverM.y);
      const width = maxX - minX;
      const height = maxY - minY;

      if (width >= 1.0 && height >= 0.5) {
        if (activeTool === 'rack') {
          const newRack: Obstacle = {
            id: `rack-${Date.now()}`,
            name: `Kệ hàng ${project.obstacles.filter((o) => o.type === 'rack').length + 1} (${width.toFixed(1)}m × ${height.toFixed(1)}m)`,
            type: 'rack',
            pointsM: [
              [Math.round(minX * 2) / 2, Math.round(minY * 2) / 2],
              [Math.round(maxX * 2) / 2, Math.round(minY * 2) / 2],
              [Math.round(maxX * 2) / 2, Math.round(maxY * 2) / 2],
              [Math.round(minX * 2) / 2, Math.round(maxY * 2) / 2],
            ],
            heightM: 6.0,
            thicknessM: Math.min(width, height),
            materialId: 'warehouse_rack_dense',
            attenuationDbPerM: 18.0,
          };
          onAddObstacle(newRack);
          setSelectedObstacleId(newRack.id);
          if (onSelectTool) onSelectTool('select');
        } else if (activeTool === 'ai_plan') {
          if (onZoneSelected) {
            onZoneSelected({
              x: Math.round(minX * 10) / 10,
              y: Math.round(minY * 10) / 10,
              width: Math.round(width * 10) / 10,
              height: Math.round(height * 10) / 10,
            });
          }
          if (onSelectTool) onSelectTool('select');
        } else if (activeTool === 'wall' && wallConfig?.drawMode === 'rect') {
          const matId = wallConfig.materialId || 'brick_wall';
          const hM = wallConfig.heightM || 3.5;
          const thM = wallConfig.thicknessM || 0.2;
          const roomIdx = Math.floor(project.obstacles.filter((o) => o.type === 'wall').length / 4) + 1;

          const roomWalls: Obstacle[] = [
            { id: `wall-n-${Date.now()}`, name: `Phòng ${roomIdx} (Bắc)`, type: 'wall', pointsM: [[minX, minY], [maxX, minY]], heightM: hM, thicknessM: thM, materialId: matId },
            { id: `wall-e-${Date.now() + 1}`, name: `Phòng ${roomIdx} (Đông)`, type: 'wall', pointsM: [[maxX, minY], [maxX, maxY]], heightM: hM, thicknessM: thM, materialId: matId },
            { id: `wall-s-${Date.now() + 2}`, name: `Phòng ${roomIdx} (Nam)`, type: 'wall', pointsM: [[minX, maxY], [maxX, maxY]], heightM: hM, thicknessM: thM, materialId: matId },
            { id: `wall-w-${Date.now() + 3}`, name: `Phòng ${roomIdx} (Tây)`, type: 'wall', pointsM: [[minX, minY], [minX, maxY]], heightM: hM, thicknessM: thM, materialId: matId },
          ];

          roomWalls.forEach((w) => onAddObstacle(w));
          if (onSelectTool) onSelectTool('select');
        }
      }
      setRectStartM(null);
    }
  };

  const handleDoubleClick = () => {
    if (activeTool === 'wall' && drawingPoints.length >= 2) {
      const matId = wallConfig?.materialId || 'brick_wall';
      const hM = wallConfig?.heightM || 3.5;
      const thM = wallConfig?.thicknessM || 0.2;

      const newWall: Obstacle = {
        id: `wall-${Date.now()}`,
        name: `Tường ngăn ${project.obstacles.filter((o) => o.type === 'wall').length + 1}`,
        type: 'wall',
        pointsM: drawingPoints,
        heightM: hM,
        thicknessM: thM,
        materialId: matId,
      };
      onAddObstacle(newWall);
      setDrawingPoints([]);
      if (onSelectTool) onSelectTool('select');
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (drawingPoints.length > 0) {
      setDrawingPoints([]);
    } else if (rectStartM) {
      setRectStartM(null);
    } else {
      setSelectedObstacleId(null);
      if (onSelectTool) onSelectTool('select');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;

    try {
      const templateConfig = JSON.parse(data);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const scrX = e.clientX - rect.left;
      const scrY = e.clientY - rect.top;
      const pxX = (scrX - offset.x) / scale;
      const pxY = (scrY - offset.y) / scale;
      const mX = pxX / ppm;
      const mY = pxY / ppm;

      if (onAddApWithConfig) {
        onAddApWithConfig(templateConfig, mX, mY);
      } else {
        onAddAp(mX, mY);
      }
    } catch (err) {
      console.error('Lỗi khi thả AP vào canvas:', err);
    }
  };

  const handleRotateSelectedObstacle = () => {
    if (!selectedObstacleId || !onUpdateObstacle) return;
    const obs = project.obstacles.find((o) => o.id === selectedObstacleId);
    if (!obs || obs.pointsM.length < 4) return;

    const minX = Math.min(...obs.pointsM.map((p) => p[0]));
    const maxX = Math.max(...obs.pointsM.map((p) => p[0]));
    const minY = Math.min(...obs.pointsM.map((p) => p[1]));
    const maxY = Math.max(...obs.pointsM.map((p) => p[1]));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const halfW = (maxX - minX) / 2;
    const halfH = (maxY - minY) / 2;

    const newPoints: [number, number][] = [
      [cx - halfH, cy - halfW],
      [cx + halfH, cy - halfW],
      [cx + halfH, cy + halfW],
      [cx - halfH, cy + halfW],
    ];

    onUpdateObstacle({
      ...obs,
      pointsM: newPoints,
      thicknessM: Math.min(halfW * 2, halfH * 2),
    });
  };

  const handleResizeSelectedObstacle = (newLengthM: number, newWidthM: number) => {
    if (!selectedObstacleId || !onUpdateObstacle) return;
    const obs = project.obstacles.find((o) => o.id === selectedObstacleId);
    if (!obs || obs.pointsM.length < 4) return;

    const minX = Math.min(...obs.pointsM.map((p) => p[0]));
    const minY = Math.min(...obs.pointsM.map((p) => p[1]));
    const len = Math.max(1.0, Math.round(newLengthM * 10) / 10);
    const wid = Math.max(0.5, Math.round(newWidthM * 10) / 10);

    const newPoints: [number, number][] = [
      [minX, minY],
      [minX + len, minY],
      [minX + len, minY + wid],
      [minX, minY + wid],
    ];

    onUpdateObstacle({
      ...obs,
      name: "Kệ hàng (" + len.toFixed(1) + "m × " + wid.toFixed(1) + "m)",
      pointsM: newPoints,
      thicknessM: Math.min(len, wid),
    });
  };

  const handleUpdateObstacleHeight = (newHeightM: number) => {
    if (!selectedObstacleId || !onUpdateObstacle) return;
    const obs = project.obstacles.find((o) => o.id === selectedObstacleId);
    if (!obs) return;
    onUpdateObstacle({
      ...obs,
      heightM: Math.max(1.0, Math.round(newHeightM * 10) / 10),
    });
  };

  function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  const selectedObs = project.obstacles.find((o) => o.id === selectedObstacleId);

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        userSelect: 'none',
        backgroundColor: '#070a13',
      }}
    >
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor:
            isPanning
              ? 'grabbing'
              : isDragging
              ? 'grabbing'
              : activeTool === 'calibrate' || activeTool === 'wall' || activeTool === 'ai_plan' || activeTool === 'rack'
              ? 'crosshair'
              : activeTool === 'ap'
              ? 'cell'
              : activeTool === 'inspect'
              ? 'help'
              : 'default',
        }}
      />

      {/* Floating Selected Obstacle Controls (Ekahau CAD Toolbar) */}
      {selectedObs && (
        <div
          style={{
            position: 'absolute',
            top: 32,
            left: 40,
            zIndex: 30,
            background: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(8px)',
            border: '1.5px solid #06b6d4',
            borderRadius: 8,
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <strong style={{ fontSize: 12, color: '#f8fafc' }}>{selectedObs.name}</strong>
            <span style={{ fontSize: 10, color: '#38bdf8' }}>
              {selectedObs.type === 'rack' ? 'Kệ pallet nhà kho' : 'Tường ngăn'}
            </span>
          </div>

          {selectedObs.type === 'rack' && (() => {
            const obsMinX = Math.min(...selectedObs.pointsM.map((p) => p[0]));
            const obsMaxX = Math.max(...selectedObs.pointsM.map((p) => p[0]));
            const obsMinY = Math.min(...selectedObs.pointsM.map((p) => p[1]));
            const obsMaxY = Math.max(...selectedObs.pointsM.map((p) => p[1]));
            const rackLen = Math.max(1.0, parseFloat((obsMaxX - obsMinX).toFixed(1)));
            const rackWid = Math.max(0.5, parseFloat((obsMaxY - obsMinY).toFixed(1)));

            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#1e293b', padding: '4px 8px', borderRadius: 6 }}>
                {/* Length Adjuster */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Dài:</span>
                  <button
                    onClick={() => handleResizeSelectedObstacle(Math.max(1.0, rackLen - 0.5), rackWid)}
                    style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: 3, width: 20, height: 20, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Giảm 0.5m chiều dài"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="100"
                    value={rackLen}
                    onChange={(e) => handleResizeSelectedObstacle(parseFloat(e.target.value) || 1.0, rackWid)}
                    style={{ width: 44, background: '#0f172a', border: '1px solid #475569', color: '#38bdf8', fontSize: 11, textAlign: 'center', borderRadius: 3, padding: '2px 0' }}
                  />
                  <button
                    onClick={() => handleResizeSelectedObstacle(rackLen + 0.5, rackWid)}
                    style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: 3, width: 20, height: 20, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Tăng 0.5m chiều dài"
                  >
                    +
                  </button>
                  <span style={{ fontSize: 11, color: '#64748b' }}>m</span>
                </div>

                {/* Width Adjuster */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Rộng:</span>
                  <button
                    onClick={() => handleResizeSelectedObstacle(rackLen, Math.max(0.5, rackWid - 0.5))}
                    style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: 3, width: 20, height: 20, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Giảm 0.5m chiều rộng"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="50"
                    value={rackWid}
                    onChange={(e) => handleResizeSelectedObstacle(rackLen, parseFloat(e.target.value) || 0.5)}
                    style={{ width: 44, background: '#0f172a', border: '1px solid #475569', color: '#38bdf8', fontSize: 11, textAlign: 'center', borderRadius: 3, padding: '2px 0' }}
                  />
                  <button
                    onClick={() => handleResizeSelectedObstacle(rackLen, rackWid + 0.5)}
                    style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: 3, width: 20, height: 20, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Tăng 0.5m chiều rộng"
                  >
                    +
                  </button>
                  <span style={{ fontSize: 11, color: '#64748b' }}>m</span>
                </div>

                {/* Height Adjuster */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Cao:</span>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="15"
                    value={selectedObs.heightM || 6.0}
                    onChange={(e) => handleUpdateObstacleHeight(parseFloat(e.target.value) || 6.0)}
                    style={{ width: 38, background: '#0f172a', border: '1px solid #475569', color: '#10b981', fontSize: 11, textAlign: 'center', borderRadius: 3, padding: '2px 0' }}
                  />
                  <span style={{ fontSize: 11, color: '#64748b' }}>m</span>
                </div>

                <button
                  onClick={handleRotateSelectedObstacle}
                  className="rf-btn-secondary"
                  style={{ padding: '3px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, borderRadius: 4 }}
                  title="Xoay kệ 90 độ"
                >
                  <RotateCw size={12} />
                  <span>Xoay 90°</span>
                </button>
              </div>
            );
          })()}

          {selectedObs.type === 'wall' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1e293b', padding: '4px 8px', borderRadius: 6 }}>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>Cao:</span>
              <input
                type="number"
                step="0.5"
                min="1"
                max="15"
                value={selectedObs.heightM || 3.5}
                onChange={(e) => handleUpdateObstacleHeight(parseFloat(e.target.value) || 3.5)}
                style={{ width: 40, background: '#0f172a', border: '1px solid #475569', color: '#10b981', fontSize: 11, textAlign: 'center', borderRadius: 3, padding: '2px 0' }}
              />
              <span style={{ fontSize: 11, color: '#64748b' }}>m</span>
            </div>
          )}

          <button
            onClick={() => {
              if (onDeleteObstacle) onDeleteObstacle(selectedObs.id);
              setSelectedObstacleId(null);
            }}
            className="rf-icon-btn-danger"
            style={{ padding: '4px 8px', borderRadius: 4 }}
            title="Xóa vật cản này (Delete)"
          >
            <Trash2 size={14} />
          </button>

          <button
            onClick={() => setSelectedObstacleId(null)}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}
            title="Đóng / Bỏ chọn (Esc)"
          >
            ✕
          </button>
        </div>
      )}
      {/* Floating Coordinates & Scale Badge */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #334155',
          borderRadius: 6,
          padding: '5px 10px',
          fontSize: 11,
          fontFamily: 'JetBrains Mono, monospace',
          color: '#cbd5e1',
          zIndex: 5,
          display: 'flex',
          gap: 12,
        }}
      >
        <span>
          Tọa độ: <b style={{ color: '#38bdf8' }}>X: {hoverM ? hoverM.x.toFixed(1) : '0.0'}m</b>,{' '}
          <b style={{ color: '#38bdf8' }}>Y: {hoverM ? hoverM.y.toFixed(1) : '0.0'}m</b>
        </span>
        <span>
          Tỷ lệ: <b style={{ color: '#10b981' }}>{ppm} px/m</b>
        </span>
        <span>
          Zoom: <b>{Math.round(scale * 100)}%</b>
        </span>
      </div>

      {/* Zoom / View controls overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(8px)',
          padding: 6,
          borderRadius: 8,
          border: '1px solid #334155',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          zIndex: 5,
        }}
      >
        <button
          onClick={() => setScale((s) => Math.min(s * 1.2, 5.0))}
          style={{ background: '#1e293b', color: '#f8fafc', border: 'none', borderRadius: 4, width: 30, height: 30, cursor: 'pointer', fontSize: 16 }}
          title="Phóng to (Zoom In)"
        >
          +
        </button>
        <button
          onClick={() => setScale((s) => Math.max(s * 0.8, 0.15))}
          style={{ background: '#1e293b', color: '#f8fafc', border: 'none', borderRadius: 4, width: 30, height: 30, cursor: 'pointer', fontSize: 16 }}
          title="Thu nhỏ (Zoom Out)"
        >
          −
        </button>
        <button
          onClick={fitToScreen}
          style={{ background: '#1e293b', color: '#38bdf8', border: 'none', borderRadius: 4, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Căn vừa màn hình (Fit to Screen)"
        >
          <Maximize2 size={15} />
        </button>
        <button
          onClick={() => {
            setScale(1.0);
            setOffset({ x: 50, y: 50 });
          }}
          style={{ background: '#1e293b', color: '#f8fafc', border: 'none', borderRadius: 4, width: 30, height: 30, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}
          title="Tỷ lệ 100% (1:1)"
        >
          1:1
        </button>
      </div>
    </div>
  );
};
