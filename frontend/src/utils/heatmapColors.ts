// Heatmap color palettes inspired by Ekahau AI Pro, Hamina and TamoGraph

export interface ColorStop {
  val: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

// Ekahau style RSSI palette: -85 dBm to -35 dBm
export const RSSI_COLOR_STOPS: ColorStop[] = [
  { val: -85, r: 50, g: 50, b: 60, a: 0.15 },
  { val: -80, r: 60, g: 120, b: 216, a: 0.45 },
  { val: -75, r: 34, g: 197, b: 218, a: 0.65 },
  { val: -67, r: 34, g: 197, b: 94, a: 0.8 },  // Target threshold
  { val: -60, r: 132, g: 204, b: 22, a: 0.85 },
  { val: -55, r: 234, g: 179, b: 8, a: 0.88 },
  { val: -50, r: 249, g: 115, b: 22, a: 0.9 },
  { val: -42, r: 239, g: 68, b: 68, a: 0.92 },
  { val: -35, r: 225, g: 29, b: 72, a: 0.95 },
];

export const SNR_COLOR_STOPS: ColorStop[] = [
  { val: 0, r: 80, g: 80, b: 80, a: 0.1 },
  { val: 12, r: 239, g: 68, b: 68, a: 0.6 },
  { val: 18, r: 249, g: 115, b: 22, a: 0.75 },
  { val: 25, r: 234, g: 179, b: 8, a: 0.82 }, // Target 25dB
  { val: 32, r: 34, g: 197, b: 94, a: 0.88 },
  { val: 42, r: 6, g: 182, b: 212, a: 0.92 },
];

export const AP_PALETTE = [
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#3b82f6', // blue
  '#14b8a6', // teal
  '#f97316', // orange
];

export function getRssiColor(rssiDbm: number, cutoffDbm: number = -85): [number, number, number, number] {
  if (rssiDbm < cutoffDbm) {
    return [0, 0, 0, 0];
  }
  const stops = RSSI_COLOR_STOPS;
  if (rssiDbm <= stops[0].val) {
    return [stops[0].r, stops[0].g, stops[0].b, stops[0].a];
  }
  if (rssiDbm >= stops[stops.length - 1].val) {
    const s = stops[stops.length - 1];
    return [s.r, s.g, s.b, s.a];
  }

  for (let i = 0; i < stops.length - 1; i++) {
    if (rssiDbm >= stops[i].val && rssiDbm <= stops[i + 1].val) {
      const t = (rssiDbm - stops[i].val) / (stops[i + 1].val - stops[i].val);
      const r = Math.round(stops[i].r + t * (stops[i + 1].r - stops[i].r));
      const g = Math.round(stops[i].g + t * (stops[i + 1].g - stops[i].g));
      const b = Math.round(stops[i].b + t * (stops[i + 1].b - stops[i].b));
      const a = stops[i].a + t * (stops[i + 1].a - stops[i].a);
      return [r, g, b, a];
    }
  }

  return [0, 0, 0, 0];
}

export function getSnrColor(snrDb: number): [number, number, number, number] {
  if (snrDb <= 0) return [0, 0, 0, 0];
  const stops = SNR_COLOR_STOPS;
  if (snrDb <= stops[0].val) return [stops[0].r, stops[0].g, stops[0].b, stops[0].a];
  if (snrDb >= stops[stops.length - 1].val) {
    const s = stops[stops.length - 1];
    return [s.r, s.g, s.b, s.a];
  }
  for (let i = 0; i < stops.length - 1; i++) {
    if (snrDb >= stops[i].val && snrDb <= stops[i + 1].val) {
      const t = (snrDb - stops[i].val) / (stops[i + 1].val - stops[i].val);
      const r = Math.round(stops[i].r + t * (stops[i + 1].r - stops[i].r));
      const g = Math.round(stops[i].g + t * (stops[i + 1].g - stops[i].g));
      const b = Math.round(stops[i].b + t * (stops[i + 1].b - stops[i].b));
      const a = stops[i].a + t * (stops[i + 1].a - stops[i].a);
      return [r, g, b, a];
    }
  }
  return [0, 0, 0, 0];
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}
