import { ProjectData, AccessPoint, Obstacle } from '../types';

export function calculateLocalGrid(
  project: ProjectData,
  band: string,
  gridStepM: number = 0.8
) {
  const ppm = project.project.scale.pixelsPerMeter || 24;
  const widthM = (project.background.widthPx || 1440) / ppm;
  const heightM = (project.background.heightPx || 864) / ppm;

  const xs: number[] = [];
  for (let x = 0; x <= widthM; x += gridStepM) xs.push(x);
  const ys: number[] = [];
  for (let y = 0; y <= heightM; y += gridStepM) ys.push(y);

  const w = xs.length;
  const h = ys.length;

  const pathLossExp = project.simulation.pathLossExponent || 2.8;
  const refDist = project.simulation.referenceDistanceM || 1.0;
  const rxHeight = project.project.receiverProfile.heightM || 1.2;
  const rxGain = project.project.receiverProfile.rxGainDbi || 0.0;
  const noiseFloor = project.simulation.noiseFloorDbm[band] || -92.0;
  const targetRssi = project.project.receiverProfile.targetRssiDbm || -65.0;

  // Active APs
  const activeAps = project.aps.filter((ap) => ap.radios[band] && ap.radios[band].enabled);

  const rssiGrid = new Float32Array(w * h).fill(-120);
  const servingApGrid = new Int32Array(w * h).fill(-1);
  const overlapGrid = new Int32Array(w * h).fill(0);

  // Pre-parse obstacles
  const matMap = new Map(project.materials.map((m) => [m.id, m]));
  const obstacles = project.obstacles.map((obs) => {
    const mat = matMap.get(obs.materialId);
    const loss = mat?.attenuationDb[band] || obs.attenuationDbPerM || 6.0;
    return {
      type: obs.type,
      pts: obs.pointsM,
      height: obs.heightM,
      loss,
      perM: obs.attenuationDbPerM || loss,
    };
  });

  for (let apIdx = 0; apIdx < activeAps.length; apIdx++) {
    const ap = activeAps[apIdx];
    const radio = ap.radios[band];
    const freqMHz = radio.channelMHz || (band === '2.4' ? 2412 : 5180);
    const pl_d0 = -27.56 + 20 * Math.log10(freqMHz);
    const baseTxGain = radio.antennaGainDbi || 4.0;
    const cableLoss = radio.cableLossDb || 0.0;

    for (let r = 0; r < h; r++) {
      const ry = ys[r];
      for (let c = 0; c < w; c++) {
        const rx = xs[c];
        const dx = rx - ap.positionM.x;
        const dy = ry - ap.positionM.y;
        const dz = rxHeight - ap.positionM.z;
        const dist3d = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), refDist);

        const pathLoss = pl_d0 + 10 * pathLossExp * Math.log10(dist3d / refDist);

        // Antenna gain
        let antGain = baseTxGain;
        if (ap.antennaType === 'directional_aisle') {
          const angRad = Math.atan2(dy, dx);
          let angDeg = ((angRad * 180) / Math.PI + 360) % 360;
          let delta = Math.abs(angDeg - ap.orientationDeg);
          if (delta > 180) delta = 360 - delta;
          const drop = Math.min(12 * ((delta / 65) ** 2), 22);
          antGain -= drop;
        }

        const eirp = radio.txPowerDbm + antGain - cableLoss;

        // Fast obstacle check
        let obsLoss = 0;
        for (let o = 0; o < obstacles.length; o++) {
          const obs = obstacles[o];
          if (obs.type === 'wall' && obs.pts.length >= 2) {
            for (let i = 0; i < obs.pts.length - 1; i++) {
              const p1 = [ap.positionM.x, ap.positionM.y];
              const p2 = [rx, ry];
              const p3 = obs.pts[i];
              const p4 = obs.pts[i + 1];
              const hit = fastSegmentIntersect(p1, p2, p3, p4);
              if (hit) {
                const zAtCross = ap.positionM.z + hit * (rxHeight - ap.positionM.z);
                if (obs.height >= 2.5 || zAtCross <= obs.height) {
                  obsLoss += obs.loss;
                }
              }
            }
          } else if (obs.type === 'rack' && obs.pts.length >= 2) {
            // Check bounding box overlap
            const minOx = Math.min(...obs.pts.map((p) => p[0]));
            const maxOx = Math.max(...obs.pts.map((p) => p[0]));
            const minOy = Math.min(...obs.pts.map((p) => p[1]));
            const maxOy = Math.max(...obs.pts.map((p) => p[1]));
            if (lineBoxIntersect(ap.positionM.x, ap.positionM.y, rx, ry, minOx, minOy, maxOx, maxOy)) {
              obsLoss += obs.loss * 0.7; // approximate rack traversing loss
            }
          }
        }

        const rssi = eirp - pathLoss - obsLoss + rxGain;
        const idx = r * w + c;

        if (rssi > rssiGrid[idx]) {
          rssiGrid[idx] = rssi;
          servingApGrid[idx] = apIdx;
        }

        if (rssi >= targetRssi) {
          overlapGrid[idx]++;
        }
      }
    }
  }

  const snrGrid = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    snrGrid[i] = Math.max(rssiGrid[i] - noiseFloor, 0);
  }

  return {
    width: w,
    height: h,
    cellSizeM: gridStepM,
    rssiDbm: Array.from(rssiGrid),
    snrDb: Array.from(snrGrid),
    servingApIndex: Array.from(servingApGrid),
    apOverlapCount: Array.from(overlapGrid),
  };
}

function fastSegmentIntersect(
  p1: number[],
  p2: number[],
  p3: [number, number],
  p4: [number, number]
): number | null {
  // Fast 2D bounding-box rejection
  if (
    Math.min(p1[0], p2[0]) > Math.max(p3[0], p4[0]) ||
    Math.max(p1[0], p2[0]) < Math.min(p3[0], p4[0]) ||
    Math.min(p1[1], p2[1]) > Math.max(p3[1], p4[1]) ||
    Math.max(p1[1], p2[1]) < Math.min(p3[1], p4[1])
  ) {
    return null;
  }
  const dx1 = p2[0] - p1[0];
  const dy1 = p2[1] - p1[1];
  const dx2 = p4[0] - p3[0];
  const dy2 = p4[1] - p3[1];
  const det = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(det) < 1e-6) return null;

  const dx3 = p1[0] - p3[0];
  const dy3 = p1[1] - p3[1];
  const t = (dx2 * dy3 - dy2 * dx3) / det;
  const u = (dx1 * dy3 - dy1 * dx3) / det;

  if (t > 0.01 && t < 0.99 && u >= 0 && u <= 1) {
    return t;
  }
  return null;
}

function lineBoxIntersect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): boolean {
  // Check if either endpoint is inside or if line crosses box
  if ((x1 >= minX && x1 <= maxX && y1 >= minY && y1 <= maxY) ||
      (x2 >= minX && x2 <= maxX && y2 >= minY && y2 <= maxY)) {
    return true;
  }
  const boxSegments: [[number, number], [number, number]][] = [
    [[minX, minY], [maxX, minY]],
    [[maxX, minY], [maxX, maxY]],
    [[maxX, maxY], [minX, maxY]],
    [[minX, maxY], [minX, minY]],
  ];
  for (const seg of boxSegments) {
    if (fastSegmentIntersect([x1, y1], [x2, y2], seg[0], seg[1]) !== null) {
      return true;
    }
  }
  return false;
}
