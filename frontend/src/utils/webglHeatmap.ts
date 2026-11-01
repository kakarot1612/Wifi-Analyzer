// High Performance WebGL 2D Heatmap Shader Engine
// Provides 120+ FPS real-time rendering and Ekahau AI Pro style topographic contour gradients

export interface WebGLApData {
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

export interface WebGLObstacleData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  loss: number;
  height: number;
}

export interface WebGLRackData {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  loss: number;
  height: number;
}

const VS_SOURCE = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = (a_position + 1.0) * 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FS_SOURCE = `
precision highp float;
varying vec2 v_uv;

// Viewport mapping
uniform vec2 u_resolution;
uniform vec2 u_pan_offset;
uniform float u_zoom;
uniform float u_ppm;

// RF parameters
uniform float u_freq_mhz;
uniform float u_path_loss_exp;
uniform float u_ref_dist;
uniform float u_rx_height;
uniform float u_rx_gain;
uniform float u_noise_floor;
uniform float u_opacity;
uniform int u_vis_mode; // 0 = RSSI, 1 = SNR, 2 = Serving, 3 = Overlap

// AP Data (up to 16 APs)
uniform int u_ap_count;
uniform vec3 u_ap_pos[16];        // x, y, z in meters
uniform vec3 u_ap_rf[16];         // txPower, gain, cableLoss
uniform float u_ap_orientation[16]; // degrees
uniform int u_ap_is_dir[16];      // 1 = directional, 0 = omni
uniform int u_ap_enabled[16];

// Obstacles (up to 32 wall segments)
uniform int u_wall_count;
uniform vec4 u_walls[32];         // x1, y1, x2, y2 in meters
uniform float u_wall_loss[32];
uniform float u_wall_height[32];

// Racks (up to 16 bounding boxes)
uniform int u_rack_count;
uniform vec4 u_racks[16];         // minX, minY, maxX, maxY
uniform float u_rack_loss[16];

// 2D Line segment intersection in GLSL
bool lineIntersect(vec2 p1, vec2 p2, vec2 p3, vec2 p4, out float tCross) {
  vec2 d1 = p2 - p1;
  vec2 d2 = p4 - p3;
  float det = d1.x * d2.y - d1.y * d2.x;
  if (abs(det) < 1e-5) return false;

  vec2 d3 = p1 - p3;
  float t = (d2.x * d3.y - d2.y * d3.x) / det;
  float u = (d1.x * d3.y - d1.y * d3.x) / det;

  if (t > 0.005 && t < 0.995 && u >= 0.0 && u <= 1.0) {
    tCross = t;
    return true;
  }
  return false;
}

// Ray-box intersection for warehouse racks
float rackTraversedDistance(vec2 p1, vec2 p2, vec4 box) {
  // Check if ray passes through box [minX, minY, maxX, maxY]
  vec2 dir = p2 - p1;
  float len = length(dir);
  if (len < 0.01) return 0.0;
  vec2 invDir = 1.0 / (dir + vec2(1e-6));

  vec2 t0 = (box.xy - p1) * invDir;
  vec2 t1 = (box.zw - p1) * invDir;

  vec2 tMin = min(t0, t1);
  vec2 tMax = max(t0, t1);

  float tNear = max(tMin.x, tMin.y);
  float tFar = min(tMax.x, tMax.y);

  if (tNear < tFar && tFar > 0.0 && tNear < 1.0) {
    float enterT = max(tNear, 0.0);
    float exitT = min(tFar, 1.0);
    return (exitT - enterT) * len;
  }
  return 0.0;
}

// Ekahau AI Pro / Hamina Topographic Color Palette Ramp
vec4 getEkahauRssiColor(float rssi) {
  // Below cut-off
  if (rssi < -85.0) return vec4(0.0);

  // Gradient stops
  vec3 c_deep_blue   = vec3(0.24, 0.47, 0.85); // -80 dBm
  vec3 c_cyan        = vec3(0.13, 0.77, 0.85); // -75 dBm
  vec3 c_emerald     = vec3(0.13, 0.77, 0.37); // -67 dBm (Target threshold)
  vec3 c_lime        = vec3(0.52, 0.80, 0.09); // -60 dBm
  vec3 c_yellow      = vec3(0.92, 0.70, 0.03); // -55 dBm
  vec3 c_orange      = vec3(0.98, 0.45, 0.09); // -50 dBm
  vec3 c_red         = vec3(0.88, 0.11, 0.28); // -40 dBm

  vec3 rgb;
  float alpha = 0.85;

  if (rssi <= -80.0) {
    float t = (rssi - (-85.0)) / 5.0;
    rgb = mix(vec3(0.2, 0.2, 0.25), c_deep_blue, t);
    alpha = mix(0.15, 0.45, t);
  } else if (rssi <= -75.0) {
    float t = (rssi - (-80.0)) / 5.0;
    rgb = mix(c_deep_blue, c_cyan, t);
    alpha = mix(0.45, 0.65, t);
  } else if (rssi <= -67.0) {
    float t = (rssi - (-75.0)) / 8.0;
    rgb = mix(c_cyan, c_emerald, t);
    alpha = mix(0.65, 0.80, t);
  } else if (rssi <= -60.0) {
    float t = (rssi - (-67.0)) / 7.0;
    rgb = mix(c_emerald, c_lime, t);
    alpha = 0.85;
  } else if (rssi <= -55.0) {
    float t = (rssi - (-60.0)) / 5.0;
    rgb = mix(c_lime, c_yellow, t);
    alpha = 0.88;
  } else if (rssi <= -50.0) {
    float t = (rssi - (-55.0)) / 5.0;
    rgb = mix(c_yellow, c_orange, t);
    alpha = 0.90;
  } else {
    float t = clamp((rssi - (-50.0)) / 15.0, 0.0, 1.0);
    rgb = mix(c_orange, c_red, t);
    alpha = 0.92;
  }

  // Topographic contour lines (subtle dark line every 5 dBm)
  float contour = fract((rssi + 100.0) / 5.0);
  if (contour < 0.08 || contour > 0.92) {
    rgb *= 0.82; // darken contour border
  }

  return vec4(rgb, alpha);
}

void main() {
  // Convert screen pixel to world coordinates (in meters)
  vec2 screenPx = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
  vec2 worldPx = (screenPx - u_pan_offset) / u_zoom;
  vec2 worldM = worldPx / u_ppm;

  // Free space path loss reference at 1m: PL(d0) = -27.56 + 20*log10(f_MHz)
  float pl_d0 = -27.56 + 20.0 * (log(max(u_freq_mhz, 1000.0)) / 2.302585);

  float bestRssi = -140.0;
  int servingAp = -1;
  int overlapCount = 0;

  // Loop through active APs
  for (int i = 0; i < 16; i++) {
    if (i >= u_ap_count) break;
    if (u_ap_enabled[i] == 0) continue;

    vec3 apPos = u_ap_pos[i];
    vec3 apRf = u_ap_rf[i]; // txPower, gain, cableLoss

    // 3D Distance
    float dx = worldM.x - apPos.x;
    float dy = worldM.y - apPos.y;
    float dz = u_rx_height - apPos.z;
    float dist3D = max(sqrt(dx*dx + dy*dy + dz*dz), u_ref_dist);

    // Path loss
    float logDist = log(dist3D / u_ref_dist) / 2.302585;
    float pathLoss = pl_d0 + 10.0 * u_path_loss_exp * logDist;

    // Antenna Gain Pattern
    float antGain = apRf.y;
    if (u_ap_is_dir[i] == 1) {
      float angleRad = atan(dy, dx);
      float angleDeg = mod(angleRad * 57.29578 + 360.0, 360.0);
      float deltaAngle = abs(angleDeg - u_ap_orientation[i]);
      if (deltaAngle > 180.0) deltaAngle = 360.0 - deltaAngle;
      float drop = min(12.0 * pow(deltaAngle / 65.0, 2.0), 22.0);
      antGain -= drop;
    }

    float eirp = apRf.x + antGain - apRf.z;

    // Obstacle Attenuation: Walls
    float obstacleLoss = 0.0;
    vec2 p1 = apPos.xy;
    vec2 p2 = worldM;

    for (int w = 0; w < 32; w++) {
      if (w >= u_wall_count) break;
      vec4 wall = u_walls[w];
      float tHit;
      if (lineIntersect(p1, p2, wall.xy, wall.zw, tHit)) {
        float zCrossing = apPos.z + tHit * (u_rx_height - apPos.z);
        if (zCrossing <= u_wall_height[w]) {
          obstacleLoss += u_wall_loss[w];
        }
      }
    }

    // Obstacle Attenuation: Racks
    for (int r = 0; r < 16; r++) {
      if (r >= u_rack_count) break;
      vec4 rack = u_racks[r];
      float insideDist = rackTraversedDistance(p1, p2, rack);
      if (insideDist > 0.0) {
        obstacleLoss += min(insideDist * u_rack_loss[r] * 0.45, 30.0);
      }
    }

    float apRssi = eirp - pathLoss - obstacleLoss + u_rx_gain;

    if (apRssi > bestRssi) {
      bestRssi = apRssi;
      servingAp = i;
    }

    if (apRssi >= -65.0) {
      overlapCount++;
    }
  }

  // Visualization modes
  vec4 color = vec4(0.0);

  if (u_vis_mode == 0) {
    // RSSI Mode
    color = getEkahauRssiColor(bestRssi);
  } else if (u_vis_mode == 1) {
    // SNR Mode
    float snr = max(bestRssi - u_noise_floor, 0.0);
    if (snr < 5.0) {
      color = vec4(0.0);
    } else {
      float t = clamp(snr / 45.0, 0.0, 1.0);
      vec3 snrColor = mix(vec3(0.9, 0.2, 0.2), vec3(0.1, 0.8, 0.3), t);
      color = vec4(snrColor, 0.85);
    }
  } else if (u_vis_mode == 2) {
    // Serving AP Mode
    if (bestRssi >= -82.0 && servingAp >= 0) {
      vec3 apColors[8];
      apColors[0] = vec3(0.02, 0.71, 0.83); // cyan
      apColors[1] = vec3(0.06, 0.72, 0.50); // emerald
      apColors[2] = vec3(0.96, 0.62, 0.04); // amber
      apColors[3] = vec3(0.54, 0.36, 0.96); // violet
      apColors[4] = vec3(0.92, 0.28, 0.60); // pink
      apColors[5] = vec3(0.23, 0.51, 0.96); // blue
      apColors[6] = vec3(0.08, 0.72, 0.65); // teal
      apColors[7] = vec3(0.97, 0.45, 0.08); // orange

      int colorIdx = servingAp - (servingAp / 8) * 8;
      vec3 base = apColors[colorIdx];
      color = vec4(base, clamp((bestRssi + 85.0) / 35.0, 0.3, 0.85));
    }
  } else if (u_vis_mode == 3) {
    // Overlap Mode
    if (overlapCount == 1) {
      color = vec4(0.02, 0.71, 0.83, 0.75); // 1 AP
    } else if (overlapCount == 2) {
      color = vec4(0.13, 0.77, 0.37, 0.80); // 2 APs (optimal)
    } else if (overlapCount >= 3) {
      color = vec4(0.96, 0.62, 0.04, 0.85); // 3+ APs
    }
  }

  gl_FragColor = color * u_opacity;
}
`;

export class WebGLHeatmapRenderer {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private isInitialized = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.init();
  }

  private init() {
    try {
      const gl = this.canvas.getContext('webgl', {
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
      });
      if (!gl) return;
      this.gl = gl;

      const vs = this.compileShader(gl.VERTEX_SHADER, VS_SOURCE);
      const fs = this.compileShader(gl.FRAGMENT_SHADER, FS_SOURCE);
      if (!vs || !fs) return;

      const prog = gl.createProgram();
      if (!prog) return;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);

      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error('WebGL Program linking failed:', gl.getProgramInfoLog(prog));
        return;
      }
      this.program = prog;

      // Full screen quad buffer
      const positions = new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0,
      ]);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
      this.positionBuffer = buf;

      this.isInitialized = true;
    } catch (err) {
      console.warn('WebGL init error, falling back:', err);
    }
  }

  private compileShader(type: number, src: string): WebGLShader | null {
    if (!this.gl) return null;
    const s = this.gl.createShader(type);
    if (!s) return null;
    this.gl.shaderSource(s, src);
    this.gl.compileShader(s);
    if (!this.gl.getShaderParameter(s, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile failed:', this.gl.getShaderInfoLog(s));
      this.gl.deleteShader(s);
      return null;
    }
    return s;
  }

  public render(params: {
    width: number;
    height: number;
    panOffset: { x: number; y: number };
    zoom: number;
    ppm: number;
    freqMHz: number;
    pathLossExp: number;
    refDist: number;
    rxHeight: number;
    rxGain: number;
    noiseFloor: number;
    opacity: number;
    visMode: number;
    aps: WebGLApData[];
    walls: WebGLObstacleData[];
    racks: WebGLRackData[];
  }) {
    if (!this.isInitialized || !this.gl || !this.program) return false;
    const gl = this.gl;

    if (this.canvas.width !== params.width || this.canvas.height !== params.height) {
      this.canvas.width = params.width;
      this.canvas.height = params.height;
    }
    gl.viewport(0, 0, params.width, params.height);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);

    // Bind full screen quad
    const aPos = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Uniforms: Viewport
    gl.uniform2f(gl.getUniformLocation(this.program, 'u_resolution'), params.width, params.height);
    gl.uniform2f(gl.getUniformLocation(this.program, 'u_pan_offset'), params.panOffset.x, params.panOffset.y);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_zoom'), params.zoom);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_ppm'), params.ppm);

    // Uniforms: RF
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_freq_mhz'), params.freqMHz);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_path_loss_exp'), params.pathLossExp);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_ref_dist'), params.refDist);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_rx_height'), params.rxHeight);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_rx_gain'), params.rxGain);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_noise_floor'), params.noiseFloor);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_opacity'), params.opacity);
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_vis_mode'), params.visMode);

    // Uniforms: APs
    const apCount = Math.min(params.aps.length, 16);
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_ap_count'), apCount);

    for (let i = 0; i < apCount; i++) {
      const ap = params.aps[i];
      gl.uniform3f(gl.getUniformLocation(this.program, `u_ap_pos[${i}]`), ap.x, ap.y, ap.z);
      gl.uniform3f(gl.getUniformLocation(this.program, `u_ap_rf[${i}]`), ap.txPower, ap.gain, ap.cableLoss);
      gl.uniform1f(gl.getUniformLocation(this.program, `u_ap_orientation[${i}]`), ap.orientationDeg);
      gl.uniform1i(gl.getUniformLocation(this.program, `u_ap_is_dir[${i}]`), ap.isDirectional ? 1 : 0);
      gl.uniform1i(gl.getUniformLocation(this.program, `u_ap_enabled[${i}]`), ap.enabled ? 1 : 0);
    }

    // Uniforms: Walls
    const wallCount = Math.min(params.walls.length, 32);
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_wall_count'), wallCount);
    for (let i = 0; i < wallCount; i++) {
      const w = params.walls[i];
      gl.uniform4f(gl.getUniformLocation(this.program, `u_walls[${i}]`), w.x1, w.y1, w.x2, w.y2);
      gl.uniform1f(gl.getUniformLocation(this.program, `u_wall_loss[${i}]`), w.loss);
      gl.uniform1f(gl.getUniformLocation(this.program, `u_wall_height[${i}]`), w.height);
    }

    // Uniforms: Racks
    const rackCount = Math.min(params.racks.length, 16);
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_rack_count'), rackCount);
    for (let i = 0; i < rackCount; i++) {
      const r = params.racks[i];
      gl.uniform4f(gl.getUniformLocation(this.program, `u_racks[${i}]`), r.minX, r.minY, r.maxX, r.maxY);
      gl.uniform1f(gl.getUniformLocation(this.program, `u_rack_loss[${i}]`), r.loss);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    return true;
  }
}
