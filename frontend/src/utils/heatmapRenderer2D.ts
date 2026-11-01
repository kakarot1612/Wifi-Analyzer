// High Definition 2D Canvas RF Heatmap Engine
// Modeled directly after Ekahau AI Pro (Pic 1) with smooth topographic contour bands

export interface CanvasApData {
  x: number;
  y: number;
  z: number;
  txPower: number;
  gain: number;
  cableLoss: number;
  orientationDeg: number;
  isDirectional: boolean;
  enabled: boolean;
}

export interface CanvasObstacleData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  loss: number;
  height: number;
}

export interface CanvasRackData {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  loss: number;
  height: number;
}

// Pre-computed 32-bit color lookup table for RSSI values from -90 dBm to -30 dBm
// Little-endian RGBA format: (A << 24) | (B << 16) | (G << 8) | R
const COLOR_LUT = new Uint32Array(256);

function initColorLut() {
  for (let i = 0; i < 256; i++) {
    // Map index 0..255 to RSSI -90..-30 dBm
    const rssi = -90 + (i / 255) * 60;

    let r = 0, g = 0, b = 0, a = 0;

    if (rssi < -86) {
      COLOR_LUT[i] = 0;
      continue;
    } else if (rssi <= -80) {
      // Transition from deep blue to indigo (-86 to -80 dBm)
      const t = (rssi - (-86)) / 6;
      r = Math.round(16 + t * 18);
      g = Math.round(44 + t * 50);
      b = Math.round(180 + t * 50);
      a = Math.round((0.40 + t * 0.35) * 255);
    } else if (rssi <= -72) {
      // Transition from blue to bright cyan (-80 to -72 dBm)
      const t = (rssi - (-80)) / 8;
      r = Math.round(34 + t * 10);
      g = Math.round(94 + t * 98);
      b = Math.round(230 - t * 15);
      a = Math.round((0.75 + t * 0.15) * 255);
    } else if (rssi <= -64) {
      // Transition from cyan to vivid emerald green (-72 to -64 dBm)
      const t = (rssi - (-72)) / 8;
      r = Math.round(44 + t * 10);
      g = Math.round(192 + t * 20);
      b = Math.round(215 - t * 140);
      a = Math.round(0.90 * 255);
    } else if (rssi <= -56) {
      // Transition from emerald green to bright lime green (-64 to -56 dBm)
      const t = (rssi - (-64)) / 8;
      r = Math.round(54 + t * 110);
      g = Math.round(212 + t * 15);
      b = Math.round(75 - t * 55);
      a = Math.round(0.93 * 255);
    } else if (rssi <= -48) {
      // Transition from lime green to rich gold/amber (-56 to -48 dBm)
      const t = (rssi - (-56)) / 8;
      r = Math.round(164 + t * 82);
      g = Math.round(227 - t * 35);
      b = Math.round(20 - t * 10);
      a = Math.round(0.95 * 255);
    } else if (rssi <= -40) {
      // Transition from gold/amber to radiant warm orange (-48 to -40 dBm)
      const t = (rssi - (-48)) / 8;
      r = Math.round(246 + t * 9);
      g = Math.round(192 - t * 85);
      b = Math.round(10 - t * 5);
      a = Math.round(0.97 * 255);
    } else {
      // Transition from warm orange to intense crimson red (strongest: > -40 dBm)
      const t = Math.min(1.0, (rssi - (-40)) / 10);
      r = 255;
      g = Math.round(107 - t * 85);
      b = Math.round(5 + t * 15);
      a = Math.round(0.98 * 255);
    }

    // Ekahau-Style distinct topographic contour bands at every 3 dBm step
    const contourInterval = 3.0;
    const bandPos = Math.abs(((rssi % contourInterval) + contourInterval) % contourInterval);
    const isContourLine = bandPos < 0.22 || bandPos > (contourInterval - 0.22);
    const contourFactor = isContourLine ? 0.84 : 1.0;

    r = Math.min(255, Math.max(0, Math.round(r * contourFactor)));
    g = Math.min(255, Math.max(0, Math.round(g * contourFactor)));
    b = Math.min(255, Math.max(0, Math.round(b * contourFactor)));

    // RGBA little endian
    COLOR_LUT[i] = (a << 24) | (b << 16) | (g << 8) | r;
  }
}

initColorLut();

// Helper line segment intersection
function lineSegmentsIntersect(
  p1x: number, p1y: number,
  p2x: number, p2y: number,
  p3x: number, p3y: number,
  p4x: number, p4y: number
): number | null {
  // Fast 2D bounding-box rejection
  if (
    Math.min(p1x, p2x) > Math.max(p3x, p4x) ||
    Math.max(p1x, p2x) < Math.min(p3x, p4x) ||
    Math.min(p1y, p2y) > Math.max(p3y, p4y) ||
    Math.max(p1y, p2y) < Math.min(p3y, p4y)
  ) {
    return null;
  }

  const dx1 = p2x - p1x;
  const dy1 = p2y - p1y;
  const dx2 = p4x - p3x;
  const dy2 = p4y - p3y;
  const det = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(det) < 1e-6) return null;

  const dx3 = p1x - p3x;
  const dy3 = p1y - p3y;
  const t = (dx2 * dy3 - dy2 * dx3) / det;
  const u = (dx1 * dy3 - dy1 * dx3) / det;

  if (t > 0.01 && t < 0.99 && u >= 0.0 && u <= 1.0) {
    return t;
  }
  return null;
}

export class HeatmapRenderer2D {
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D | null;

  constructor() {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
  }

  public renderHeatmap(
    targetCtx: CanvasRenderingContext2D,
    params: {
      widthM: number;
      heightM: number;
      ppm: number;
      gridStepM: number;
      freqMHz: number;
      pathLossExp: number;
      refDist: number;
      rxHeight: number;
      rxGain: number;
      noiseFloor: number;
      opacity: number;
      visMode: number;
      aps: CanvasApData[];
      walls: CanvasObstacleData[];
      racks: CanvasRackData[];
    }
  ) {
    const { widthM, heightM, gridStepM, aps, walls, racks } = params;
    if (!this.offscreenCtx || widthM <= 0 || heightM <= 0) return;

    const cols = Math.ceil(widthM / gridStepM) + 1;
    const rows = Math.ceil(heightM / gridStepM) + 1;

    if (this.offscreenCanvas.width !== cols || this.offscreenCanvas.height !== rows) {
      this.offscreenCanvas.width = cols;
      this.offscreenCanvas.height = rows;
    }

    const imgData = this.offscreenCtx.createImageData(cols, rows);
    const buf32 = new Uint32Array(imgData.data.buffer);

    const pl_d0 = -27.56 + 20 * Math.log10(Math.max(params.freqMHz, 1000));
    const pathLossExp = params.pathLossExp;
    const refDist = params.refDist;
    const rxHeight = params.rxHeight;
    const rxGain = params.rxGain;
    const noiseFloor = params.noiseFloor;

    const activeAps = aps.filter((ap) => ap.enabled);
    if (activeAps.length === 0) {
      return;
    }

    for (let r = 0; r < rows; r++) {
      const y = r * gridStepM;
      const rowOffset = r * cols;

      for (let c = 0; c < cols; c++) {
        const x = c * gridStepM;
        let bestRssi = -140.0;
        let servingApIdx = -1;
        let overlapCount = 0;

        for (let i = 0; i < activeAps.length; i++) {
          const ap = activeAps[i];
          const dx = x - ap.x;
          const dy = y - ap.y;
          const dz = rxHeight - ap.z;
          const dist3D = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), refDist);

          // Fast culling only for excessively distant APs (> 120m)
          if (dist3D > 120) continue;

          // Free space / Log distance path loss
          const pathLoss = pl_d0 + 10 * pathLossExp * Math.log10(dist3D / refDist);

          // Antenna radiation pattern gain
          let antGain = ap.gain;
          if (ap.isDirectional) {
            const angleRad = Math.atan2(dy, dx);
            let angleDeg = ((angleRad * 180) / Math.PI + 360) % 360;
            let delta = Math.abs(angleDeg - ap.orientationDeg);
            if (delta > 180) delta = 360 - delta;
            antGain -= Math.min(12 * Math.pow(delta / 65, 2), 22);
          }

          const eirp = ap.txPower + antGain - ap.cableLoss;

          // Wall attenuation check
          let obsLoss = 0.0;
          for (let w = 0; w < walls.length; w++) {
            const wall = walls[w];
            const hitT = lineSegmentsIntersect(ap.x, ap.y, x, y, wall.x1, wall.y1, wall.x2, wall.y2);
            if (hitT !== null) {
              const zCross = ap.z + hitT * (rxHeight - ap.z);
              // Structural walls (>= 2.5m) attenuate all rays from ceiling APs
              if (wall.height >= 2.5 || zCross <= wall.height) {
                obsLoss += wall.loss;
              }
            }
          }

          // Rack attenuation check
          for (let rk = 0; rk < racks.length; rk++) {
            const rack = racks[rk];
            if (
              (x >= rack.minX && x <= rack.maxX && y >= rack.minY && y <= rack.maxY) ||
              (ap.x >= rack.minX && ap.x <= rack.maxX && ap.y >= rack.minY && ap.y <= rack.maxY)
            ) {
              obsLoss += rack.loss * 0.7;
            } else {
              // Ray cross check against rack box
              if (
                lineSegmentsIntersect(ap.x, ap.y, x, y, rack.minX, rack.minY, rack.maxX, rack.minY) !== null ||
                lineSegmentsIntersect(ap.x, ap.y, x, y, rack.maxX, rack.minY, rack.maxX, rack.maxY) !== null ||
                lineSegmentsIntersect(ap.x, ap.y, x, y, rack.maxX, rack.maxY, rack.minX, rack.maxY) !== null ||
                lineSegmentsIntersect(ap.x, ap.y, x, y, rack.minX, rack.maxY, rack.minX, rack.minY) !== null
              ) {
                obsLoss += rack.loss * 0.85;
              }
            }
          }

          const apRssi = eirp - pathLoss - obsLoss + rxGain;

          if (apRssi > bestRssi) {
            bestRssi = apRssi;
            servingApIdx = i;
          }

          if (apRssi >= -65.0) {
            overlapCount++;
          }
        }

        const idx = rowOffset + c;

        if (params.visMode === 0) {
          // RSSI Mode with Ekahau color stops
          const lutIdx = Math.min(255, Math.max(0, Math.round(((bestRssi + 90) / 60) * 255)));
          buf32[idx] = COLOR_LUT[lutIdx];
        } else if (params.visMode === 1) {
          // SNR Mode
          const snr = Math.max(bestRssi - noiseFloor, 0);
          if (snr < 5) {
            buf32[idx] = 0;
          } else {
            const t = Math.min(1.0, snr / 40);
            const rVal = Math.round(230 - t * 180);
            const gVal = Math.round(50 + t * 150);
            const bVal = Math.round(50 + t * 50);
            buf32[idx] = (210 << 24) | (bVal << 16) | (gVal << 8) | rVal;
          }
        } else if (params.visMode === 2) {
          // Serving AP Mode
          if (bestRssi >= -82 && servingApIdx >= 0) {
            const apColors = [
              0xd0d4b606, // cyan
              0xd081b910, // emerald
              0xd00b9ef5, // amber
              0xd0f65c8b, // violet
              0xd09948ec, // pink
              0xd0f6823b, // blue
              0xd0a6b814, // teal
              0xd01673f9, // orange
            ];
            buf32[idx] = apColors[servingApIdx % apColors.length];
          } else {
            buf32[idx] = 0;
          }
        } else if (params.visMode === 3) {
          // Overlap Mode
          if (overlapCount === 1) {
            buf32[idx] = 0xc0d4b606; // 1 AP cyan
          } else if (overlapCount === 2) {
            buf32[idx] = 0xd05ee122; // 2 APs green
          } else if (overlapCount >= 3) {
            buf32[idx] = 0xe00b9ef5; // 3+ APs amber
          } else {
            buf32[idx] = 0;
          }
        }
      }
    }

    this.offscreenCtx.putImageData(imgData, 0, 0);

    // Render scaled smoothly onto target canvas with high quality bicubic interpolation
    targetCtx.save();
    targetCtx.globalAlpha = params.opacity;
    targetCtx.imageSmoothingEnabled = true;
    targetCtx.imageSmoothingQuality = 'high';
    targetCtx.drawImage(
      this.offscreenCanvas,
      0,
      0,
      cols,
      rows,
      0,
      0,
      widthM * params.ppm,
      heightM * params.ppm
    );
    targetCtx.restore();
  }
}
