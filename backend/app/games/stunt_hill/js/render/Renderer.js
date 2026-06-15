/**
 * Renderer — view + canvas drawing. Owns the camera (cam) and the
 * world→screen conversion.
 *
 * Visual stack (back → front):
 *   sky gradient (day → golden hour with progress) · sun · birds · clouds ·
 *   far/near mountain ridges · green hills · pine treeline ·
 *   terrain (soil gradient, strata, speckles, grass band + tufts + flowers) ·
 *   scenery (trees/bushes/rocks, deterministic) · finish arch ·
 *   track objects · particles · car shadow + car ·
 *   speed lines · vignette / boost tint.
 *
 * Camera: velocity look-ahead, speed-based zoom-out, impact shake (kick()).
 * Everything is procedural — no image assets, no build step.
 */
import { CONFIG } from '../config/GameConfig.js';
import {
  terrainHeight, terrainSlope, seedHash, baseHeight, currentMap,
  tunnelList, roofUnderAt,
  perchList, perchTopAt, perchUnderAt,
  loopList, loopBaseAt, cannonList, cannonBaseY,
} from '../core/Terrain.js';
import { rot, clamp } from '../core/utils.js';
import { carColor, carBody, activeCar, setActiveCar } from '../config/cars.js';

/** Lighten (amt>0) / darken (amt<0) a #rrggbb hex by an absolute amount. */
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

// The palette comes from the CURRENT MAP's biome (js/config/maps.js):
// [start, end] color pairs are lerped with run progress.

function mix(a, b, t) {
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}
/** Cheap deterministic visual hash (NOT the gameplay seed hash). */
function h01(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
/** Smooth continuous value-noise (0..1) for soft, non-jagged horizon shapes. */
function bnoise(x, seed = 0) {
  const i = Math.floor(x), t = x - i, s = t * t * (3 - 2 * t);
  const a = h01(i * 1.73 + seed * 57.3), b = h01((i + 1) * 1.73 + seed * 57.3);
  return a + (b - a) * s;
}

// Per-map tunnel looks (chosen by MAP.tunnelStyle) — interior, portal, ceiling deco.
const TUNNEL_STYLES = {
  grass: { in0: '#2a1a0c', in1: '#0d0805', pf: '#84878f', ps: '#5b5e66', deco: 'lantern' },   // GREEN
  sand:  { in0: '#3a2a14', in1: '#160f06', pf: '#c2a164', ps: '#8a6f3c', deco: 'torch'   },   // DESERT
  ice:   { in0: '#1a2c3a', in1: '#08121c', pf: '#bfe0ef', ps: '#7fb6cf', deco: 'icicle'  },   // SNOWY
  rock:  { in0: '#2a1810', in1: '#0c0604', pf: '#9a6a44', ps: '#5c3a22', deco: 'lantern' },   // CANYON
  tech:  { in0: '#10182a', in1: '#05080f', pf: '#5a6470', ps: '#333c48', deco: 'crystal' },   // MOON
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = 0; this.H = 0; this.DPR = 1;
    this.cam = { x: 0, y: 0 };
    this._zoom = 1;
    this._shake = 0;
    this._shakeX = 0; this._shakeY = 0;
    this._lastT = null;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.DPR = Math.min(2, window.devicePixelRatio || 1);
    this.W = window.innerWidth; this.H = window.innerHeight;
    this.canvas.width = this.W * this.DPR;
    this.canvas.height = this.H * this.DPR;
    this.ctx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
    this.basePPS = this._computePPS();
    this.pps = this.basePPS * this._zoom;
    // cached full-screen overlays (rebuilt only on resize)
    const cx = this.W / 2, cy = this.H * 0.55, R = Math.max(this.W, this.H) * 0.78;
    this._vig = this.ctx.createRadialGradient(cx, cy, Math.min(this.W, this.H) * 0.42, cx, cy, R);
    this._vig.addColorStop(0, 'rgba(8,12,24,0)');
    this._vig.addColorStop(1, 'rgba(8,12,24,.34)');
    this._boostVig = this.ctx.createRadialGradient(cx, cy, Math.min(this.W, this.H) * 0.36, cx, cy, R);
    this._boostVig.addColorStop(0, 'rgba(255,140,40,0)');
    this._boostVig.addColorStop(1, 'rgba(255,120,20,.16)');
  }

  /**
   * Adaptive pixels-per-meter: fit `viewMetersX` across the width AND
   * `viewMetersY` across the height, taking the smaller so both fit.
   */
  _computePPS() {
    const byW = this.W / CONFIG.viewMetersX;
    const byH = this.H / CONFIG.viewMetersY;
    return Math.max(CONFIG.minPPS, Math.min(CONFIG.maxPPS, Math.min(byW, byH)));
  }

  /** Camera: follow with smoothing + velocity look-ahead (see where you're going). */
  followCamera(vehicle) {
    const car = vehicle.car;
    const tx = car.x + clamp(car.vx * 0.32, -3, 7.5);
    const ty = car.y + 1.0 + clamp(car.vy * 0.10, -1.2, 2.2);
    this.cam.x += (tx - this.cam.x) * 0.12;
    this.cam.y += (ty - this.cam.y) * 0.08;
  }

  /** Impact shake — intensity 0..1 (decays on its own). */
  kick(intensity) {
    this._shake = Math.min(1, Math.max(this._shake, intensity));
  }

  w2s(wx, wy) {
    const pps = this.pps;
    return {
      x: (wx - this.cam.x) * pps + this.W * 0.32 + this._shakeX,
      y: this.H * 0.62 - (wy - this.cam.y) * pps + this._shakeY,
    };
  }

  draw(state) {
    const { vehicle, particles, track, time, finishX, braking, boosting } = state;
    const dt = this._lastT == null ? 0.016 : clamp(time - this._lastT, 0.001, 0.05);
    this._lastT = time;

    // speed-based zoom-out (see more track when flying fast)
    const spd = Math.hypot(vehicle.car.vx, vehicle.car.vy);
    const zTarget = 1 - 0.16 * clamp((spd - 9) / 15, 0, 1);
    this._zoom += (zTarget - this._zoom) * Math.min(1, dt * 2.5);
    this.pps = this.basePPS * this._zoom;

    // impact shake (smooth oscillation, decaying)
    this._shake = Math.max(0, this._shake - dt * 2.2);
    const sa = this._shake * this._shake * 14;
    this._shakeX = Math.sin(time * 71) * sa;
    this._shakeY = Math.cos(time * 83) * sa * 0.7;

    const p = clamp(this.cam.x / CONFIG.levelLength, 0, 1); // run progress → time of day
    this._biome = currentMap().biome;
    this._grassHiNow = mix(this._biome.grassHi[0], this._biome.grassHi[1], p);

    const w2s = (x, y) => this.w2s(x, y);
    this._drawSky(p, time);
    this._drawBackground(p);
    this._drawTerrain(p);
    this._drawTunnels(time);
    this._drawScenery(finishX);
    this._drawPerches();
    this._drawLoopsBack(time);
    if (finishX != null) this._drawFinish(finishX, time);
    if (track) track.draw(this.ctx, w2s, this.pps, time);
    if (particles) particles.draw(this.ctx, w2s, this.pps);
    this._drawCar(vehicle, p, braking, boosting);
    this._drawLoopsFront();                 // near rim OVER the car → inside the tube
    this._drawCannons(vehicle, time);       // barrel OVER the car → swallowed while loading
    this._drawSpeedFX(spd, boosting, time);
    this.ctx.fillStyle = this._vig; this.ctx.fillRect(0, 0, this.W, this.H);
    if (boosting) { this.ctx.fillStyle = this._boostVig; this.ctx.fillRect(0, 0, this.W, this.H); }
  }

  // ── Sky ────────────────────────────────────────────────────────────────────
  _drawSky(p, time) {
    const ctx = this.ctx, B = this._biome;
    const g = ctx.createLinearGradient(0, 0, 0, this.H);
    g.addColorStop(0, mix(B.skyTop[0], B.skyTop[1], p));
    g.addColorStop(0.55, mix(B.skyMid[0], B.skyMid[1], p));
    g.addColorStop(1, mix(B.skyBot[0], B.skyBot[1], p));
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.W, this.H);

    if (B.bg === 'moon') {                 // night sky: stars + planet Earth, no sun/birds/clouds
      this._drawStars(time);
      this._drawEarth(p);
      return;
    }

    // sun: sinks toward the horizon as you near the finish (golden hour)
    const sx = this.W * 0.76, sy = this.H * (0.16 + p * 0.30);
    const glowR = Math.min(this.W, this.H) * (0.30 + p * 0.14);
    const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, glowR);
    glow.addColorStop(0, `rgba(${B.sun[0].join(',')},${0.45 + p * 0.2})`);
    glow.addColorStop(1, `rgba(${B.sun[1].join(',')},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(sx, sy, glowR, 0, Math.PI * 2); ctx.fill();
    const discR = 20 + p * 10;
    const disc = ctx.createRadialGradient(sx, sy, 2, sx, sy, discR);
    disc.addColorStop(0, '#fffdf2');
    disc.addColorStop(0.62, mix(B.sun[0], B.sun[1], p));
    disc.addColorStop(1, `rgba(${B.sun[1].join(',')},0)`);
    ctx.fillStyle = disc;
    ctx.beginPath(); ctx.arc(sx, sy, discR, 0, Math.PI * 2); ctx.fill();

    this._drawBirds(time, p);
    this._drawClouds(time, p);
  }

  /** Twinkling starfield (deterministic positions; for the MOON night sky). */
  _drawStars(time) {
    const ctx = this.ctx;
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 70; i++) {
      const sx = h01(i * 2.1) * this.W;
      const sy = h01(i * 3.7 + 9) * this.H * 0.62;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(time * 1.4 + i * 1.7));
      const r = 0.6 + h01(i * 5.3) * 1.4;
      ctx.globalAlpha = tw;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** Planet Earth hanging in the lunar sky (fixed, distant). */
  _drawEarth(p) {
    const ctx = this.ctx;
    const ex = this.W * 0.72, ey = this.H * 0.20, r = Math.min(this.W, this.H) * 0.085;
    // soft glow
    const glow = ctx.createRadialGradient(ex, ey, r * 0.6, ex, ey, r * 2.4);
    glow.addColorStop(0, 'rgba(120,170,255,.30)'); glow.addColorStop(1, 'rgba(120,170,255,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(ex, ey, r * 2.4, 0, Math.PI * 2); ctx.fill();
    // ocean disc with day/night terminator
    const oc = ctx.createRadialGradient(ex - r * 0.3, ey - r * 0.3, r * 0.2, ex, ey, r);
    oc.addColorStop(0, '#5aa6f0'); oc.addColorStop(1, '#13386e');
    ctx.fillStyle = oc; ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI * 2); ctx.fill();
    // continents (a few green blobs) clipped to the disc
    ctx.save(); ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#4a9a52';
    for (const [dx, dy, br] of [[-0.3, -0.2, 0.5], [0.25, 0.15, 0.45], [-0.1, 0.45, 0.35], [0.4, -0.35, 0.3]]) {
      ctx.beginPath(); ctx.arc(ex + dx * r, ey + dy * r, br * r * 0.6, 0, Math.PI * 2); ctx.fill();
    }
    // night-side shadow
    ctx.fillStyle = 'rgba(6,10,26,.55)';
    ctx.beginPath(); ctx.arc(ex + r * 0.55, ey + r * 0.2, r * 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // cloud swirl highlight
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ex, ey, r * 0.72, Math.PI * 0.9, Math.PI * 1.7); ctx.stroke();
  }

  _drawBirds(time, p) {
    const ctx = this.ctx;
    ctx.strokeStyle = `rgba(36,48,70,${0.55 - p * 0.2})`;
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const span = this.W + 200;
      const bx = span - ((time * (24 + i * 7) + i * 420) % span) - 100;
      const by = this.H * (0.10 + 0.06 * i) + Math.sin(time * 0.7 + i * 2.1) * 12;
      const f = Math.sin(time * 9 + i * 2) * 4;
      ctx.beginPath();
      ctx.moveTo(bx - 7, by - f * 0.5);
      ctx.quadraticCurveTo(bx - 3, by - 4 - f, bx, by);
      ctx.quadraticCurveTo(bx + 3, by - 4 - f, bx + 7, by - f * 0.5);
      ctx.stroke();
    }
  }

  _drawClouds(time, p) {
    const ctx = this.ctx;
    const layers = [
      { par: 1.0, n: 4, y0: 0.05, r0: 18, a: 0.55, drift: 3 },  // far, small, slow
      { par: 2.2, n: 4, y0: 0.10, r0: 28, a: 0.85, drift: 6 },  // near, big
    ];
    for (const L of layers) {
      const off = this.cam.x * L.par + time * L.drift;
      const span = this.W + 320;
      for (let i = 0; i < L.n; i++) {
        const base = i * (span / L.n) + (i % 2) * 110;
        const cx = ((base - off) % span + span) % span - 160;
        const cy = this.H * L.y0 + ((i * 53) % Math.max(60, this.H * 0.16));
        this._cloud(cx, cy, L.r0 + (i % 3) * 9, L.a, p);
      }
    }
  }

  _cloud(cx, cy, r, alpha, p) {
    const ctx = this.ctx;
    // shaded underside first, warmer at golden hour
    ctx.fillStyle = `rgba(${Math.round(186 + p * 50)},${Math.round(196 - p * 30)},${Math.round(214 - p * 60)},${alpha * 0.5})`;
    ctx.beginPath();
    ctx.arc(cx + r * 0.1, cy + r * 0.28, r * 0.85, 0, Math.PI * 2);
    ctx.arc(cx - r * 0.8, cy + r * 0.32, r * 0.6, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.95, cy + r * 0.3, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,${255 - Math.round(p * 18)},${255 - Math.round(p * 45)},${alpha})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.9, cy + r * 0.15, r * 0.75, 0, Math.PI * 2);
    ctx.arc(cx - r * 0.9, cy + r * 0.18, r * 0.7, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.2, cy - r * 0.42, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Background panoramas (per biome) ─────────────────────────────────────
  // Parallax offset uses basePPS (constant), NOT pps → the horizon no longer
  // lurches/stretches when the speed-zoom changes. Each biome draws a real
  // skyline: green hills+forest, snowy alps, desert mesas+dunes, canyon buttes,
  // lunar crater hills (+ stars & Earth in the sky).
  _bgOff(par) { return this.cam.x * par * this.basePPS; }

  _drawBackground(p) {
    const B = this._biome, H = this.H;
    const c = (pair) => mix(pair[0], pair[1], p);
    switch (B.bg) {
      case 'peaks':   // SNOWY — alpine ranges with snow caps + snowy pines
        this._bgPeaks(0.05, H * 0.46, 150, c(B.ridgeFarT), c(B.ridgeFarB), true);
        this._bgPeaks(0.11, H * 0.58, 115, c(B.ridgeNrT), c(B.ridgeNrB), true);
        this._bgTrees(0.40, H * 0.75, c(B.pines), true);
        break;
      case 'dunes':   // DESERT — distant mesas, then big rolling sand dunes
        this._bgMesas(0.05, H * 0.52, 64, c(B.ridgeFarT), c(B.ridgeFarB));
        this._bgRolling(0.12, H * 0.60, 52, c(B.ridgeNrB), 7, true);
        this._bgRolling(0.24, H * 0.68, 40, c(B.hills), 11, true);
        break;
      case 'mesas':   // CANYON — layered flat-topped rock buttes at three depths
        this._bgMesas(0.05, H * 0.46, 120, c(B.ridgeFarT), c(B.ridgeFarB));
        this._bgMesas(0.11, H * 0.57, 95, c(B.ridgeNrT), c(B.ridgeNrB));
        this._bgMesas(0.22, H * 0.67, 64, c(B.hills), c(B.hills));
        break;
      case 'city':    // distant skyline: far dim towers, near towers with lit windows
        this._bgCity(0.05, H * 0.50, 140, c(B.ridgeFarT), c(B.ridgeFarB), false);
        this._bgCity(0.12, H * 0.60, 110, c(B.ridgeNrT), c(B.ridgeNrB), true);
        break;
      case 'moon':    // MOONLIGHT — low grey crater-rim hills (sky has stars+Earth)
        this._bgRolling(0.06, H * 0.54, 46, c(B.ridgeFarT), 6, false);
        this._bgRolling(0.14, H * 0.63, 38, c(B.ridgeNrT), 9, false);
        break;
      default:        // GREEN HILLS — distant blue mountains, green hills, pine forest
        this._bgPeaks(0.05, H * 0.46, 100, c(B.ridgeFarT), c(B.ridgeFarB), false);
        this._bgRolling(0.13, H * 0.58, 66, c(B.ridgeNrB), 8, false);
        this._bgRolling(0.24, H * 0.66, 54, c(B.hills), 12, false);
        this._bgTrees(0.42, H * 0.75, c(B.pines), false);
    }
  }

  /** Smooth rounded hills / dunes (asym = steeper lee face like wind-blown sand). */
  _bgRolling(par, baseY, amp, color, freqMul, asym) {
    const ctx = this.ctx, off = this._bgOff(par);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, this.H);
    for (let sx = 0; sx <= this.W; sx += 8) {
      const wx = (sx + off) * 0.0016 * freqMul;
      let h = 0.55 * (1 + Math.sin(wx)) + 0.30 * (1 + Math.sin(wx * 2.3 + 1.3));   // 0..~1.7
      if (asym) h = Math.pow(h / 1.7, 1.3) * 1.7;
      ctx.lineTo(sx, baseY - amp * 0.5 * h);
    }
    ctx.lineTo(this.W, this.H); ctx.closePath(); ctx.fill();
  }

  /** Alpine peaks: pointed triangles of varied height; optional snow caps. */
  _bgPeaks(par, baseY, amp, cTop, cBot, snow) {
    const ctx = this.ctx, off = this._bgOff(par), cw = 130;
    const x0 = -(((off % cw) + cw) % cw) - cw;
    const peaks = [];
    ctx.beginPath(); ctx.moveTo(x0, this.H);
    let minY = baseY;
    for (let x = x0; x <= this.W + cw; x += cw) {
      const j = Math.round((x + off) / cw);
      const valY = baseY - amp * 0.12 * bnoise(j * 0.7, 1);
      const peakH = amp * (0.45 + 0.55 * bnoise(j * 1.3 + 3, 1));
      const px = x + cw * 0.5, py = baseY - peakH;
      if (py < minY) minY = py;
      ctx.lineTo(x, valY); ctx.lineTo(px, py);
      peaks.push([px, py, peakH]);
    }
    ctx.lineTo(this.W + cw, this.H); ctx.closePath();
    const g = ctx.createLinearGradient(0, minY, 0, baseY + 20);
    g.addColorStop(0, cTop); g.addColorStop(1, cBot);
    ctx.fillStyle = g; ctx.fill();
    if (snow) {
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      for (const [px, py, ph] of peaks) {
        const cap = Math.min(amp * 0.16, ph * 0.5);              // snowline depth below the tip
        const half = (cap / ph) * (cw * 0.5) * 0.88;            // mountain half-width there → snow stays INSIDE the slopes
        ctx.beginPath();
        ctx.moveTo(px, py);                                      // tip
        ctx.lineTo(px - half, py + cap);                         // down the left slope
        ctx.lineTo(px - half * 0.32, py + cap * 0.62);           // jagged snowline
        ctx.lineTo(px + half * 0.36, py + cap);
        ctx.lineTo(px + half, py + cap * 0.8);                   // down the right slope
        ctx.closePath(); ctx.fill();
      }
    }
  }

  /** Varied rock skyline: mesas, spires, two-tier buttes, knolls, rubble — picked
   *  deterministically per cell (canyon distant rock; desert far outcrops). */
  _bgMesas(par, baseY, hmax, cTop, cBot) {
    const ctx = this.ctx, off = this._bgOff(par), cw = 116;
    const x0 = -(((off % cw) + cw) % cw) - cw;
    const footY = baseY + hmax * 0.08;
    ctx.beginPath(); ctx.moveTo(x0, this.H); ctx.lineTo(x0, footY);
    let minY = baseY;
    for (let x = x0; x <= this.W + cw; x += cw) {
      const j = Math.round((x + off) / cw);
      const cx = x + cw * 0.5;
      const r = bnoise(j * 1.9 + 2, 2);                       // formation type
      const hf = 0.35 + 0.65 * bnoise(j * 1.1 + 7, 2);
      const top = baseY - hmax * hf;
      const w = cw * (0.44 + 0.34 * bnoise(j * 2.3 + 4, 2));
      const L = cx - w / 2, Rr = cx + w / 2;
      if (top < minY) minY = top;
      if (r < 0.16) {                                          // low rubble mound
        ctx.lineTo(L, footY); ctx.lineTo(cx, footY - hmax * 0.13); ctx.lineTo(Rr, footY);
      } else if (r < 0.42) {                                   // flat-top mesa
        ctx.lineTo(L, footY); ctx.lineTo(L, top); ctx.lineTo(Rr, top); ctx.lineTo(Rr, footY);
      } else if (r < 0.63) {                                   // pointed spire / pinnacle
        ctx.lineTo(L, footY); ctx.lineTo(cx, top); ctx.lineTo(Rr, footY);
      } else if (r < 0.83) {                                   // two-tier stepped butte
        const shelf = baseY - hmax * hf * 0.55, ins = w * 0.24;
        ctx.lineTo(L, footY); ctx.lineTo(L, shelf); ctx.lineTo(L + ins, shelf);
        ctx.lineTo(L + ins, top); ctx.lineTo(Rr - ins, top); ctx.lineTo(Rr - ins, shelf);
        ctx.lineTo(Rr, shelf); ctx.lineTo(Rr, footY);
      } else {                                                 // rounded knoll
        ctx.lineTo(L, footY);
        for (let k = 1; k < 6; k++) { const t = k / 6; ctx.lineTo(L + t * w, top + (footY - top) * (1 - Math.sin(Math.PI * t))); }
        ctx.lineTo(Rr, footY);
      }
      ctx.lineTo(x + cw, footY);
    }
    ctx.lineTo(this.W + cw, this.H); ctx.closePath();
    const g = ctx.createLinearGradient(0, minY, 0, footY);
    g.addColorStop(0, cTop); g.addColorStop(1, cBot);
    ctx.fillStyle = g; ctx.fill();
    // faint rock strata
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(0,0,0,.07)'; ctx.lineWidth = 2;
    for (let y = minY; y < footY; y += Math.max(8, hmax * 0.18)) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.W, y); ctx.stroke();
    }
    ctx.restore();
  }

  /** Distant city skyline: varied buildings, roof details, lit windows. */
  _bgCity(par, baseY, hmax, cTop, cBot, windows) {
    const ctx = this.ctx, off = this._bgOff(par), cw = 58;
    const x0 = -(((off % cw) + cw) % cw) - cw;
    const footY = baseY + hmax * 0.06;
    const blds = [];
    // 1) silhouette (flat-topped towers of varied height/width, small gaps)
    ctx.beginPath(); ctx.moveTo(x0, this.H); ctx.lineTo(x0, footY);
    let minY = baseY;
    for (let x = x0; x <= this.W + cw; x += cw) {
      const j = Math.round((x + off) / cw);
      const top = baseY - hmax * (0.22 + 0.78 * bnoise(j * 1.7 + 3, 3));
      const w = cw * (0.60 + 0.32 * bnoise(j * 2.1 + 5, 3));
      const L = x + (cw - w) / 2, R = L + w;
      if (top < minY) minY = top;
      ctx.lineTo(L, footY); ctx.lineTo(L, top); ctx.lineTo(R, top); ctx.lineTo(R, footY); ctx.lineTo(x + cw, footY);
      blds.push({ L, R, top, j });
    }
    ctx.lineTo(this.W + cw, this.H); ctx.closePath();
    const g = ctx.createLinearGradient(0, minY, 0, footY);
    g.addColorStop(0, cTop); g.addColorStop(1, cBot);
    ctx.fillStyle = g; ctx.fill();
    // 2) roof details + lit windows
    for (const b of blds) {
      const { L, R, top, j } = b, w = R - L, cx = (L + R) / 2, r = bnoise(j * 3.3 + 1, 3);
      ctx.fillStyle = cBot;
      if (r < 0.20) {                                   // setback box on the roof
        const bw = w * 0.5, bh = hmax * 0.10; ctx.fillRect(cx - bw / 2, top - bh, bw, bh);
      } else if (r < 0.36) {                            // water tower on legs
        const bw = w * 0.32, bh = hmax * 0.08;
        ctx.fillRect(cx - bw / 2, top - bh - 3, bw, bh);
        ctx.fillRect(cx - bw / 2, top - 3, 2, 3); ctx.fillRect(cx + bw / 2 - 2, top - 3, 2, 3);
      } else if (r < 0.52) {                            // antenna with a blinking red light
        ctx.strokeStyle = cBot; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, top - hmax * 0.15); ctx.stroke();
        ctx.fillStyle = 'rgba(255,80,60,.9)'; ctx.beginPath(); ctx.arc(cx, top - hmax * 0.15, 2, 0, Math.PI * 2); ctx.fill();
      } else if (r < 0.64) {                            // pitched roof spanning the whole building
        const rh = Math.min(w * 0.5, hmax * 0.22);
        ctx.beginPath(); ctx.moveTo(L, top); ctx.lineTo(cx, top - rh); ctx.lineTo(R, top); ctx.closePath(); ctx.fill();
      }
      if (windows) {
        const pad = Math.max(3, w * 0.18), wy0 = top + Math.max(5, hmax * 0.05), wy1 = footY - 5;
        const cols = Math.max(2, Math.floor((w - pad * 2) / 7));
        const cellW = (w - pad * 2) / cols;
        for (let ci = 0; ci < cols; ci++) {
          for (let wy = wy0; wy < wy1; wy += 9) {
            const lit = bnoise(j * 13 + ci * 2.7 + wy * 0.31, 4) > 0.42;
            ctx.fillStyle = lit ? 'rgba(255,226,150,.85)' : 'rgba(0,0,0,.14)';
            ctx.fillRect(L + pad + ci * cellW + cellW * 0.18, wy, Math.max(2, cellW * 0.5), 4);
          }
        }
      }
    }
  }

  /** Pine forest silhouette (irregular treetops; optional snow). */
  _bgTrees(par, baseY, color, snow) {
    const ctx = this.ctx, off = this._bgOff(par), tw = 22;
    const x0 = -(((off % tw) + tw) % tw) - tw;
    const tops = [];
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(x0, this.H);
    for (let x = x0; x <= this.W + tw; x += tw) {
      const j = Math.round((x + off) / tw);
      const by = baseY + Math.sin(j * 0.7) * 9 + (h01(j * 3.1) - 0.5) * 8;
      const r = h01(j);
      ctx.lineTo(x, by);
      if (r < 0.18) { ctx.lineTo(x + tw, by + 2); continue; }   // forest clearing
      const h = 12 + r * 46, peak = tw * (0.3 + h01(j * 7.7) * 0.4);
      ctx.lineTo(x + peak, by - h); ctx.lineTo(x + tw, by);
      if (snow) tops.push([x + peak, by - h]);
    }
    ctx.lineTo(this.W + tw, this.H); ctx.closePath(); ctx.fill();
    if (snow) {
      ctx.fillStyle = 'rgba(244,250,255,.85)';
      for (const [px, py] of tops) { ctx.beginPath(); ctx.arc(px, py + 5, 3, 0, Math.PI * 2); ctx.fill(); }
    }
  }

  // ── Terrain ────────────────────────────────────────────────────────────────
  _surfacePath(leftWorld, rightWorld, step, yOff = 0) {
    const ctx = this.ctx;
    ctx.beginPath();
    let first = true;
    for (let x = leftWorld; x <= rightWorld; x += step) {
      const s = this.w2s(x, terrainHeight(x) + yOff);
      if (first) { ctx.moveTo(s.x, s.y); first = false; } else ctx.lineTo(s.x, s.y);
    }
  }

  _drawTerrain(p) {
    const ctx = this.ctx, pps = this.pps;
    const leftWorld = this.cam.x - (this.W * 0.32) / pps - 1;
    const rightWorld = this.cam.x + (this.W * 0.70) / pps + 1;
    const step = 0.25;

    // soil body
    this._surfacePath(leftWorld, rightWorld, step);
    ctx.lineTo(this.W + 60, this.H + 60); ctx.lineTo(-60, this.H + 60); ctx.closePath();
    const B = this._biome;
    const g = ctx.createLinearGradient(0, this.H * 0.28, 0, this.H);
    g.addColorStop(0, mix(B.dirtTop[0], B.dirtTop[1], p));
    g.addColorStop(0.45, B.dirtMid);
    g.addColorStop(1, B.dirtDark);
    ctx.fillStyle = g; ctx.fill();

    // sediment strata (parallel curves under the surface)
    ctx.lineWidth = 3;
    for (const [depth, alpha] of [[2.2, 0.14], [4.6, 0.11], [7.4, 0.08]]) {
      this._surfacePath(leftWorld, rightWorld, 1.0, -depth);
      ctx.strokeStyle = `rgba(30,18,6,${alpha})`;
      ctx.stroke();
    }

    // buried speckles (pebbles)
    for (let x = Math.floor(leftWorld); x <= rightWorld; x += 1.1) {
      const j = Math.floor(x / 1.1);
      const gy = terrainHeight(x);
      const d1 = 1.0 + h01(j) * 2.6, d2 = 3.2 + h01(j * 1.7 + 9) * 4.5;
      const s1 = this.w2s(x + h01(j + 4) * 1.0, gy - d1);
      const s2 = this.w2s(x + h01(j + 8) * 1.0, gy - d2);
      ctx.fillStyle = 'rgba(0,0,0,.12)';
      ctx.fillRect(s1.x, s1.y, 2.5, 2);
      ctx.fillStyle = 'rgba(255,235,200,.06)';
      ctx.fillRect(s2.x, s2.y, 3, 2);
    }

    // grass band: wide dark, mid bright, sun-lit top edge (biome colors)
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    this._surfacePath(leftWorld, rightWorld, step, -0.12);
    ctx.strokeStyle = B.grassDark; ctx.lineWidth = 15; ctx.stroke();
    this._surfacePath(leftWorld, rightWorld, step, -0.01);
    ctx.strokeStyle = B.grassMid; ctx.lineWidth = 6.5; ctx.stroke();
    this._surfacePath(leftWorld, rightWorld, step, 0.05);
    ctx.strokeStyle = this._grassHiNow; ctx.lineWidth = 2.5; ctx.stroke();

    // grass tufts + the occasional flower
    ctx.lineWidth = 1.6;
    for (let x = Math.floor(leftWorld / 0.8) * 0.8; x <= rightWorld; x += 0.8) {
      const j = Math.round(x / 0.8);
      const r = h01(j);
      if (r > 0.55) continue;
      const gx = x + (r - 0.25) * 0.6;
      const s = this.w2s(gx, terrainHeight(gx) + 0.04);
      const lean = terrainSlope(gx) * -3 + (h01(j + 3) - 0.5) * 5;
      const len = (4 + h01(j + 7) * 5) * (pps / 28);
      ctx.strokeStyle = B.tuft;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + lean, s.y - len);
      ctx.moveTo(s.x + 2, s.y); ctx.lineTo(s.x + 2 + lean * 0.6, s.y - len * 0.8);
      ctx.stroke();
      if (h01(j * 3.3) < 0.06) {
        ctx.fillStyle = h01(j * 5.1) < 0.5 ? '#ffe14a' : '#fff';
        ctx.beginPath(); ctx.arc(s.x + lean, s.y - len - 1.5, 2, 0, Math.PI * 2); ctx.fill();
      }
    }

    // distance markers: ticks every 50 m, labels every 100 m
    for (let mk = Math.ceil(leftWorld / 50) * 50; mk <= rightWorld; mk += 50) {
      if (mk <= 0) continue;
      const s = this.w2s(mk, terrainHeight(mk));
      const major = mk % 100 === 0;
      ctx.fillStyle = major ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.22)';
      ctx.fillRect(s.x - 1, s.y - (major ? 26 : 16), 2, major ? 22 : 12);
      if (major) {
        ctx.font = '700 11px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(mk + 'm', s.x, s.y - 30);
      }
    }
    ctx.textAlign = 'left';
  }

  // ── Scenery: trees / bushes / rocks standing on the terrain ───────────────
  _drawScenery(finishX) {
    const pps = this.pps;
    const leftWorld = this.cam.x - (this.W * 0.32) / pps - 4;
    const rightWorld = this.cam.x + (this.W * 0.70) / pps + 4;
    for (let j = Math.floor(leftWorld / 7); j <= Math.ceil(rightWorld / 7); j++) {
      if (j < 0) continue;
      const x = j * 7 + (seedHash(j * 61 + 13) - 0.5) * 4;
      if (finishX != null && Math.abs(x - finishX) < 9) continue;     // keep the arch clear
      if (Math.abs(terrainSlope(x)) > 0.35) continue;                  // only on calm ground
      let inTunnel = false;
      for (const t of tunnelList()) if (x > t.x0 - 4 && x < t.x1 + 4) { inTunnel = true; break; }
      if (inTunnel) continue;                                          // no trees inside the bore
      const r = seedHash(j * 97 + 29);
      const size = 0.75 + seedHash(j * 17 + 3) * 0.5;
      const s = this.w2s(x, terrainHeight(x));
      const style = (this._biome && this._biome.scenery) || 'forest';
      if (style === 'moon') {
        if (r < 0.35) this._rock(s, size, pps, j);
      } else if (style === 'desert') {
        if (r < 0.16) this._cactus(s, size, pps);
        else if (r < 0.30) this._bush(s, size * 0.8, pps, '#8a8a4a');
        else if (r < 0.46) this._rock(s, size, pps, j);
      } else if (style === 'palm') {
        if (r < 0.20) this._palm(s, size, pps, j);
        else if (r < 0.32) this._bush(s, size, pps);
        else if (r < 0.42) this._rock(s, size, pps, j);
      } else if (style === 'snow') {
        if (r < 0.22) this._pine(s, size, pps, true);
        else if (r < 0.34) this._rock(s, size, pps, j);
      } else if (style === 'dead') {
        if (r < 0.18) this._dead(s, size, pps);
        else if (r < 0.30) this._rock(s, size, pps, j);
      } else {                                  // forest / jungle
        if (r < 0.15) this._pine(s, size, pps);
        else if (r < 0.28) this._tree(s, size, pps);
        else if (r < 0.40) this._bush(s, size, pps);
        else if (r < 0.48) this._rock(s, size, pps, j);
      }
    }
  }

  _pine(s, size, pps, snow = false) {
    const ctx = this.ctx, h = 3.4 * size * pps, w = 1.5 * size * pps;
    ctx.fillStyle = '#4a3420';
    ctx.fillRect(s.x - w * 0.06, s.y - h * 0.22, w * 0.12, h * 0.24);
    ctx.fillStyle = snow ? '#2a5444' : '#2e6b46';
    for (let i = 0; i < 3; i++) {
      const ty = s.y - h * (0.18 + i * 0.26), tw = w * (1 - i * 0.26);
      ctx.beginPath();
      ctx.moveTo(s.x - tw / 2, ty);
      ctx.lineTo(s.x, ty - h * 0.34);
      ctx.lineTo(s.x + tw / 2, ty);
      ctx.closePath(); ctx.fill();
    }
    if (snow) {
      ctx.fillStyle = 'rgba(240,248,255,.9)';
      for (let i = 0; i < 3; i++) {
        const ty = s.y - h * (0.18 + i * 0.26), tw = w * (1 - i * 0.26) * 0.62;
        ctx.beginPath();
        ctx.moveTo(s.x - tw / 2, ty - h * 0.13);
        ctx.lineTo(s.x, ty - h * 0.34);
        ctx.lineTo(s.x + tw / 2, ty - h * 0.13);
        ctx.closePath(); ctx.fill();
      }
    }
  }

  /** Desert cactus: rounded column + two arms. */
  _cactus(s, size, pps) {
    const ctx = this.ctx, h = 2.4 * size * pps, w = Math.max(4, 0.42 * size * pps);
    ctx.fillStyle = '#3e8a4a'; ctx.strokeStyle = '#2c6436'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(s.x - w / 2, s.y - h, w, h, w / 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(s.x - w * 1.5, s.y - h * 0.72, w * 0.8, h * 0.34, w * 0.4); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(s.x + w * 0.7, s.y - h * 0.60, w * 0.8, h * 0.28, w * 0.4); ctx.fill(); ctx.stroke();
  }

  /** Beach palm: leaning trunk + a crown of fronds. */
  _palm(s, size, pps, j) {
    const ctx = this.ctx, h = 3.0 * size * pps;
    const lean = (h01(j * 3.7) - 0.5) * 0.8;
    const tx = s.x + lean * h * 0.4, ty = s.y - h;
    ctx.strokeStyle = '#8a6a3e'; ctx.lineWidth = Math.max(3, 0.13 * size * pps); ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.quadraticCurveTo(s.x + lean * h * 0.1, s.y - h * 0.6, tx, ty);
    ctx.stroke();
    ctx.strokeStyle = '#3e9a52'; ctx.lineWidth = Math.max(2, 0.10 * pps);
    for (let i = 0; i < 5; i++) {
      const ang = -Math.PI * (0.10 + i * 0.20);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(
        tx + Math.cos(ang) * h * 0.30, ty + Math.sin(ang) * h * 0.30 - 3,
        tx + Math.cos(ang) * h * 0.50, ty + Math.sin(ang) * h * 0.50 + h * 0.12,
      );
      ctx.stroke();
    }
  }

  /** Bare dead tree (volcano / neon night). */
  _dead(s, size, pps) {
    const ctx = this.ctx, h = 2.6 * size * pps;
    ctx.strokeStyle = '#4a3a34'; ctx.lineWidth = Math.max(2.5, 0.12 * pps); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + 2, s.y - h * 0.62); ctx.stroke();
    ctx.lineWidth = Math.max(2, 0.08 * pps);
    ctx.beginPath(); ctx.moveTo(s.x + 2, s.y - h * 0.62); ctx.lineTo(s.x - h * 0.20, s.y - h * 0.88); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s.x + 2, s.y - h * 0.62); ctx.lineTo(s.x + h * 0.22, s.y - h * 0.92); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s.x + 1, s.y - h * 0.40); ctx.lineTo(s.x + h * 0.24, s.y - h * 0.55); ctx.stroke();
  }

  _tree(s, size, pps) {
    const ctx = this.ctx, h = 2.8 * size * pps, r = 0.9 * size * pps;
    ctx.strokeStyle = '#5a4028'; ctx.lineWidth = Math.max(2, r * 0.22); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + r * 0.1, s.y - h * 0.55); ctx.stroke();
    ctx.fillStyle = '#3e7d3a';
    ctx.beginPath();
    ctx.arc(s.x - r * 0.5, s.y - h * 0.62, r * 0.7, 0, Math.PI * 2);
    ctx.arc(s.x + r * 0.55, s.y - h * 0.66, r * 0.65, 0, Math.PI * 2);
    ctx.arc(s.x, s.y - h * 0.88, r * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath(); ctx.arc(s.x - r * 0.25, s.y - h * 0.95, r * 0.45, 0, Math.PI * 2); ctx.fill();
  }

  _bush(s, size, pps, color = '#447a36') {
    const ctx = this.ctx, r = 0.55 * size * pps;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(s.x - r * 0.5, s.y - r * 0.4, r * 0.62, 0, Math.PI * 2);
    ctx.arc(s.x + r * 0.4, s.y - r * 0.45, r * 0.58, 0, Math.PI * 2);
    ctx.arc(s.x, s.y - r * 0.75, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  _rock(s, size, pps, j) {
    const ctx = this.ctx, r = 0.45 * size * pps;
    ctx.fillStyle = '#8b8d92';
    ctx.beginPath();
    ctx.moveTo(s.x - r, s.y);
    ctx.lineTo(s.x - r * 0.55, s.y - r * (0.7 + h01(j) * 0.3));
    ctx.lineTo(s.x + r * 0.3, s.y - r * 0.95);
    ctx.lineTo(s.x + r, s.y - r * 0.2);
    ctx.lineTo(s.x + r * 0.9, s.y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath();
    ctx.moveTo(s.x - r * 0.55, s.y - r * (0.7 + h01(j) * 0.3));
    ctx.lineTo(s.x + r * 0.3, s.y - r * 0.95);
    ctx.lineTo(s.x + r * 0.1, s.y - r * 0.55);
    ctx.closePath(); ctx.fill();
  }

  // ── Perches: small floating target platforms (grass top, rocky belly) ──────
  _drawPerches() {
    const ctx = this.ctx, pps = this.pps;
    const leftWorld = this.cam.x - (this.W * 0.32) / pps - 4;
    const rightWorld = this.cam.x + (this.W * 0.70) / pps + 4;
    for (const p of perchList()) {
      if (p.x1 < leftWorld || p.x0 > rightWorld) continue;
      const step = 0.4;
      // body: flat top out, wavy rocky belly back
      ctx.beginPath();
      let first = true;
      for (let x = p.x0; x <= p.x1; x += step) {
        const s = this.w2s(x, perchTopAt(p, x));
        if (first) { ctx.moveTo(s.x, s.y); first = false; } else ctx.lineTo(s.x, s.y);
      }
      for (let x = p.x1; x >= p.x0; x -= 0.6) {
        const s = this.w2s(x, perchUnderAt(p, x));
        ctx.lineTo(s.x, s.y);
      }
      ctx.closePath();
      const B = this._biome;
      const sTop = this.w2s(p.x0, perchTopAt(p, p.x0));
      const g = ctx.createLinearGradient(0, sTop.y, 0, sTop.y + 2.2 * pps);
      g.addColorStop(0, mix(B.dirtTop[0], B.dirtTop[1], 0.5)); g.addColorStop(1, B.dirtMid);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = B.dirtDark; ctx.lineWidth = 2; ctx.stroke();
      // a couple of rocks hanging under it
      ctx.fillStyle = B.dirtMid;
      for (const fx of [p.x0 + 3, p.x1 - 3.5]) {
        const s = this.w2s(fx, perchUnderAt(p, fx));
        ctx.beginPath();
        ctx.moveTo(s.x - 0.35 * pps, s.y - 2);
        ctx.lineTo(s.x + 0.3 * pps, s.y - 2);
        ctx.lineTo(s.x, s.y + 0.55 * pps);
        ctx.closePath(); ctx.fill();
      }
      // grass band on top
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (const [off, col, w] of [[-0.10, B.grassDark, 11], [-0.01, B.grassMid, 5], [0.05, this._grassHiNow, 2.2]]) {
        ctx.beginPath();
        let f2 = true;
        for (let x = p.x0; x <= p.x1; x += step) {
          const s = this.w2s(x, perchTopAt(p, x) + off);
          if (f2) { ctx.moveTo(s.x, s.y); f2 = false; } else ctx.lineTo(s.x, s.y);
        }
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
      }
    }
  }

  // ── Loop-the-loop ring (2.5D: far rim behind the car, near rim in front) ───
  _loopGeom(l) {
    const base = loopBaseAt(l);
    const c = this.w2s(l.x, base + l.r);
    return { base, c, R: l.r * this.pps, fx: c.x - 0.45 * this.pps, fy: c.y - 0.60 * this.pps };
  }

  _drawLoopsBack(time) {
    const ctx = this.ctx, pps = this.pps;
    const leftWorld = this.cam.x - (this.W * 0.32) / pps - 6;
    const rightWorld = this.cam.x + (this.W * 0.70) / pps + 6;
    for (const l of loopList()) {
      if (l.x + l.r < leftWorld || l.x - l.r > rightWorld) continue;
      const { base, c, R, fx, fy } = this._loopGeom(l);

      // struts anchoring the FAR rim to the ground
      ctx.strokeStyle = '#54381f'; ctx.lineWidth = Math.max(3, 0.18 * pps); ctx.lineCap = 'round';
      const g1 = this.w2s(l.x - l.r - 1.0, terrainHeight(l.x - l.r - 1.0));
      const g2 = this.w2s(l.x + l.r + 1.0, terrainHeight(l.x + l.r + 1.0));
      ctx.beginPath(); ctx.moveTo(fx - R * 0.55, fy + R * 0.5); ctx.lineTo(g1.x, g1.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(fx + R * 0.55, fy + R * 0.5); ctx.lineTo(g2.x, g2.y); ctx.stroke();

      // far rim band (darker, shifted up-left = depth)
      ctx.strokeStyle = '#4e525c'; ctx.lineWidth = 1.0 * pps;
      ctx.beginPath(); ctx.arc(fx, fy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#3a3d46'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(fx, fy, R + 0.5 * pps, 0, Math.PI * 2); ctx.stroke();

      // tube walls: connectors between the two rims sell the 3D
      ctx.strokeStyle = 'rgba(96,100,112,.6)'; ctx.lineWidth = Math.max(2, 0.10 * pps);
      for (let i = 0; i < 16; i++) {
        const ang = i * Math.PI / 8;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        ctx.beginPath();
        ctx.moveTo(fx + ca * R, fy + sa * R);
        ctx.lineTo(c.x + ca * R, c.y + sa * R);
        ctx.stroke();
      }

      // golden pulse at the entry so it reads as a stunt trigger
      const eb = this.w2s(l.x, base + 0.15);
      ctx.fillStyle = `rgba(255,210,74,${0.5 + 0.3 * Math.sin(time * 5)})`;
      ctx.beginPath(); ctx.arc(eb.x, eb.y, 0.3 * pps, 0, Math.PI * 2); ctx.fill();
    }
  }

  /** Near rim — drawn AFTER the car: it occludes the wheels → "inside the tube". */
  _drawLoopsFront() {
    const ctx = this.ctx, pps = this.pps;
    const leftWorld = this.cam.x - (this.W * 0.32) / pps - 6;
    const rightWorld = this.cam.x + (this.W * 0.70) / pps + 6;
    for (const l of loopList()) {
      if (l.x + l.r < leftWorld || l.x - l.r > rightWorld) continue;
      const { c, R } = this._loopGeom(l);
      ctx.strokeStyle = '#9aa0ab'; ctx.lineWidth = 1.0 * pps;
      ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#5b5e66'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(c.x, c.y, R + 0.5 * pps, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(c.x, c.y, R - 0.5 * pps, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(40,42,50,.5)'; ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const ang = i * Math.PI / 6;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        ctx.beginPath();
        ctx.moveTo(c.x + ca * (R - 0.5 * pps), c.y + sa * (R - 0.5 * pps));
        ctx.lineTo(c.x + ca * (R + 0.5 * pps), c.y + sa * (R + 0.5 * pps));
        ctx.stroke();
      }
      // sun highlight on the upper-left of the near rim
      ctx.strokeStyle = 'rgba(255,255,255,.30)'; ctx.lineWidth = Math.max(2, 0.16 * pps);
      ctx.beginPath(); ctx.arc(c.x, c.y, R + 0.34 * pps, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
    }
  }

  /** Cannon prop — drawn AFTER the car so the barrel swallows it while loading. */
  _drawCannons(vehicle, time) {
    const ctx = this.ctx, pps = this.pps;
    const leftWorld = this.cam.x - (this.W * 0.32) / pps - 6;
    const rightWorld = this.cam.x + (this.W * 0.70) / pps + 6;
    for (const cn of cannonList()) {
      if (cn.x < leftWorld || cn.x > rightWorld) continue;
      const g = this.w2s(cn.x, cannonBaseY(cn));
      const charging = vehicle._cannon && vehicle._cannon.cn === cn;
      const jx = charging ? Math.sin(time * 60) * 1.5 : 0;   // charge rumble

      // carriage + wheels
      ctx.fillStyle = '#4a3420';
      ctx.beginPath(); ctx.roundRect(g.x - 1.1 * pps, g.y - 0.78 * pps, 2.2 * pps, 0.78 * pps, 4); ctx.fill();
      for (const wx of [-0.62, 0.62]) {
        ctx.fillStyle = '#2e2014';
        ctx.beginPath(); ctx.arc(g.x + wx * pps, g.y - 0.20 * pps, 0.34 * pps, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6b4a28';
        ctx.beginPath(); ctx.arc(g.x + wx * pps, g.y - 0.20 * pps, 0.15 * pps, 0, Math.PI * 2); ctx.fill();
      }

      // barrel (aimed along cn.angle)
      ctx.save();
      ctx.translate(g.x + jx, g.y - 0.85 * pps);
      ctx.rotate(-cn.angle);
      const bw = 1.25 * pps;
      const grad = ctx.createLinearGradient(0, -bw / 2, 0, bw / 2);
      grad.addColorStop(0, '#5a5e6a'); grad.addColorStop(0.5, '#33363f'); grad.addColorStop(1, '#1d1f25');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.roundRect(-0.6 * pps, -bw / 2, 3.0 * pps, bw, bw * 0.35); ctx.fill();
      ctx.strokeStyle = '#15161a'; ctx.lineWidth = 2; ctx.stroke();
      // gold bands + muzzle ring
      ctx.fillStyle = '#d8a834';
      ctx.fillRect(-0.25 * pps, -bw / 2, 0.20 * pps, bw);
      ctx.fillRect(1.35 * pps, -bw / 2, 0.20 * pps, bw);
      ctx.fillStyle = '#15161a';
      ctx.fillRect(2.22 * pps, -bw * 0.58, 0.18 * pps, bw * 1.16);
      // glow building in the muzzle while charging
      if (charging) {
        const k = Math.min(1, vehicle._cannon.t / 0.5);
        ctx.fillStyle = `rgba(255,${Math.round(160 + 60 * k)},40,${0.35 + 0.55 * k})`;
        ctx.beginPath(); ctx.arc(2.4 * pps, 0, bw * 0.32 * (0.6 + 0.7 * k), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  // ── Underground tunnels ────────────────────────────────────────────────────
  _drawTunnels(time) {
    const pps = this.pps;
    const leftWorld = this.cam.x - (this.W * 0.32) / pps - 2;
    const rightWorld = this.cam.x + (this.W * 0.70) / pps + 2;
    for (const t of tunnelList()) {
      if (t.x1 < leftWorld || t.x0 > rightWorld) continue;
      this._tunnel(t, leftWorld, rightWorld, time);
    }
  }

  _tunnel(t, leftWorld, rightWorld, time) {
    const ctx = this.ctx, pps = this.pps;
    const step = 0.5;
    const a = Math.max(t.a, leftWorld), b = Math.min(t.b, rightWorld);
    if (b <= a) return;
    const TS = TUNNEL_STYLES[currentMap().tunnelStyle] || TUNNEL_STYLES.rock;

    // 1) dark bore interior (between the SOLID ceiling and the floor)
    ctx.beginPath();
    let first = true;
    for (let x = a; x <= b; x += step) {
      const s = this.w2s(x, roofUnderAt(t, x) + 0.3);
      if (first) { ctx.moveTo(s.x, s.y); first = false; } else ctx.lineTo(s.x, s.y);
    }
    for (let x = b; x >= a; x -= step) {
      const s = this.w2s(x, terrainHeight(x) - 0.3);
      ctx.lineTo(s.x, s.y);
    }
    ctx.closePath();
    const sMid = this.w2s(a, roofUnderAt(t, a));
    const dg = ctx.createLinearGradient(0, sMid.y, 0, sMid.y + t.depth * pps);
    dg.addColorStop(0, TS.in0); dg.addColorStop(1, TS.in1);
    ctx.fillStyle = dg; ctx.fill();

    // 2) ceiling decorations — themed per biome
    this._tunnelDeco(t, a, b, TS.deco, time);

    // 3) roof slab at the original grade — grass on top: the road goes ON it
    ctx.beginPath();
    first = true;
    for (let x = a; x <= b; x += step) {
      const s = this.w2s(x, baseHeight(x));
      if (first) { ctx.moveTo(s.x, s.y); first = false; } else ctx.lineTo(s.x, s.y);
    }
    for (let x = b; x >= a; x -= step) {
      const s = this.w2s(x, roofUnderAt(t, x));
      ctx.lineTo(s.x, s.y);
    }
    ctx.closePath();
    const B = this._biome;
    const sTop = this.w2s(a, baseHeight(a));
    const rg = ctx.createLinearGradient(0, sTop.y, 0, sTop.y + 2.6 * pps);
    rg.addColorStop(0, mix(B.dirtTop[0], B.dirtTop[1], 0.5)); rg.addColorStop(1, B.dirtMid);
    ctx.fillStyle = rg; ctx.fill();
    ctx.strokeStyle = B.dirtDark; ctx.lineWidth = 2; ctx.stroke();

    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const grassPass = (yOff, color, width) => {
      ctx.beginPath();
      let f2 = true;
      for (let x = a; x <= b; x += step) {
        const s = this.w2s(x, baseHeight(x) + yOff);
        if (f2) { ctx.moveTo(s.x, s.y); f2 = false; } else ctx.lineTo(s.x, s.y);
      }
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
    };
    grassPass(-0.12, B.grassDark, 13);
    grassPass(-0.01, B.grassMid, 6);
    grassPass(0.05, this._grassHiNow, 2.5);

    // hazard stripes on the roof's leading and trailing edges
    for (const [ex, dir] of [[t.a, 1], [t.b, -1]]) {
      for (let i = 0; i < 3; i++) {
        const qa = ex + dir * i * 0.45, qb = qa + dir * 0.45;
        if (Math.max(qa, qb) < a || Math.min(qa, qb) > b) continue;
        const cqa = clamp(qa, t.a, t.b), cqb = clamp(qb, t.a, t.b);
        const p1 = this.w2s(qa, baseHeight(qa));
        const p2 = this.w2s(qb, baseHeight(qb));
        const p3 = this.w2s(qb, baseHeight(qb) - Math.max(0.4, (baseHeight(cqb) - roofUnderAt(t, cqb)) * 0.55));
        const p4 = this.w2s(qa, baseHeight(qa) - Math.max(0.4, (baseHeight(cqa) - roofUnderAt(t, cqa)) * 0.55));
        ctx.fillStyle = i % 2 ? '#1d1d1f' : '#ffd24a';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
        ctx.closePath(); ctx.fill();
      }
    }

    // 4) portals at both mouths (themed blocks)
    for (const px of [t.a, t.b]) {
      if (px < leftWorld - 4 || px > rightWorld + 4) continue;
      const floorY = terrainHeight(px + (px === t.a ? 0.6 : -0.6));
      const top = this.w2s(px, baseHeight(px) + 0.45);
      const bot = this.w2s(px, floorY);
      const wpx = 0.55 * pps;
      ctx.fillStyle = TS.pf; ctx.strokeStyle = TS.ps; ctx.lineWidth = 2;
      const blocks = 4;
      for (let i = 0; i < blocks; i++) {
        const y0 = bot.y + (top.y - bot.y) * (i / blocks);
        const y1 = bot.y + (top.y - bot.y) * ((i + 1) / blocks);
        const jit = (h01(px * 3.1 + i) - 0.5) * 0.12 * pps;
        ctx.beginPath();
        ctx.roundRect(top.x - wpx / 2 + jit, y1, wpx, y0 - y1 + 1.5, 3);
        ctx.fill(); ctx.stroke();
      }
      // lintel
      ctx.beginPath();
      ctx.roundRect(top.x - wpx * 1.05, top.y - 0.30 * pps, wpx * 2.1, 0.42 * pps, 4);
      ctx.fill(); ctx.stroke();
    }
  }

  /** Ceiling decorations inside a bore — lantern · torch · icicle · crystal. */
  _tunnelDeco(t, a, b, deco, time) {
    const ctx = this.ctx, pps = this.pps;
    for (let lx = t.a + 4; lx < t.b - 2; lx += 8) {
      if (lx < a - 3 || lx > b + 3) continue;
      const s = this.w2s(lx, roofUnderAt(t, lx));
      if (deco === 'icicle') {
        // cool glow + downward ice spikes
        const gr = 1.6 * pps;
        const lg = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, gr);
        lg.addColorStop(0, `rgba(180,225,245,${0.3 + 0.08 * Math.sin(time * 3 + lx)})`); lg.addColorStop(1, 'rgba(180,225,245,0)');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(s.x, s.y, gr, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(220,242,252,.92)';
        for (const off of [-0.5, 0.2]) {
          const sp = this.w2s(lx + off, roofUnderAt(t, lx + off));
          ctx.beginPath(); ctx.moveTo(sp.x - 0.12 * pps, sp.y); ctx.lineTo(sp.x + 0.12 * pps, sp.y);
          ctx.lineTo(sp.x, sp.y + (0.5 + h01(lx + off) * 0.7) * pps); ctx.closePath(); ctx.fill();
        }
      } else if (deco === 'crystal') {
        // glowing cyan crystals
        const gr = 2.0 * pps;
        const lg = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, gr);
        lg.addColorStop(0, `rgba(90,230,255,${0.4 + 0.14 * Math.sin(time * 4 + lx)})`); lg.addColorStop(1, 'rgba(90,230,255,0)');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(s.x, s.y, gr, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#7cf0ff'; ctx.strokeStyle = '#2aa6c8'; ctx.lineWidth = 1.5;
        const cr = 0.22 * pps;
        ctx.beginPath(); ctx.moveTo(s.x, s.y - cr); ctx.lineTo(s.x + cr * 0.7, s.y); ctx.lineTo(s.x, s.y + cr * 1.3); ctx.lineTo(s.x - cr * 0.7, s.y); ctx.closePath();
        ctx.fill(); ctx.stroke();
      } else {
        // lantern (grass/rock) / torch (sand): warm flickering glow + hanging light
        const warm = deco === 'torch' ? [255, 150, 50] : [255, 190, 90];
        const ly = s.y - 0.45 * pps;
        const sl = { x: s.x, y: ly };
        const flick = 0.40 + 0.12 * Math.sin(time * 6 + lx);
        const gr = (deco === 'torch' ? 1.7 : 2.1) * pps;
        const lg = ctx.createRadialGradient(sl.x, sl.y, 2, sl.x, sl.y, gr);
        lg.addColorStop(0, `rgba(${warm[0]},${warm[1]},${warm[2]},${flick})`); lg.addColorStop(1, `rgba(${warm[0]},${warm[1]},${warm[2]},0)`);
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(sl.x, sl.y, gr, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#2e2e36'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sl.x, s.y); ctx.lineTo(sl.x, sl.y); ctx.stroke();
        ctx.fillStyle = deco === 'torch' ? '#ff8a2a' : '#ffd24a';
        ctx.beginPath(); ctx.arc(sl.x, sl.y, Math.max(2, 0.10 * pps), 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  // ── Finish arch ────────────────────────────────────────────────────────────
  _drawFinish(fx, time) {
    const left = this.cam.x - (this.W * 0.32) / this.pps;
    const right = this.cam.x + (this.W * 0.70) / this.pps;
    if (fx < left - 8 || fx > right + 8) return;
    const ctx = this.ctx, pps = this.pps;
    const span = 5.2, poleH = 5.8;
    const g1 = this.w2s(fx, terrainHeight(fx));
    const g2 = this.w2s(fx + span, terrainHeight(fx + span));
    const topY = Math.min(g1.y, g2.y) - poleH * pps;

    // checker band painted on the road
    for (let i = 0; i < 7; i++) {
      const bx = fx + i * (span / 7);
      const s = this.w2s(bx, terrainHeight(bx));
      const sl = Math.atan(terrainSlope(bx));
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(-sl);
      const cw = (span / 7) * pps;
      ctx.fillStyle = i % 2 ? '#15161a' : '#f4f4f4';
      ctx.fillRect(0, -2, cw + 0.5, 5);
      ctx.restore();
    }

    // poles with hazard bands
    for (const gp of [g1, g2]) {
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(gp.x - 3, topY, 6, gp.y - topY);
      ctx.fillStyle = '#d2342a';
      for (let y = topY + 8; y < gp.y - 6; y += 22) ctx.fillRect(gp.x - 3, y, 6, 9);
      ctx.fillStyle = '#ffd24a';
      ctx.beginPath(); ctx.arc(gp.x, topY - 3, 5, 0, Math.PI * 2); ctx.fill();
    }

    // banner between the poles (slight cloth sway)
    const sway = Math.sin(time * 1.8) * 2;
    const bw = g2.x - g1.x, bh = 1.15 * pps;
    ctx.save();
    ctx.translate(g1.x, topY + sway * 0.4);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, bw, bh);
    // checkered strip along the bottom of the banner
    const cols = 12, cw = bw / cols, ch = bh * 0.32;
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = c % 2 ? '#15161a' : '#fff';
      ctx.fillRect(c * cw, bh - ch, cw + 0.5, ch);
    }
    ctx.strokeStyle = '#15161a'; ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, bw, bh);
    ctx.fillStyle = '#15161a';
    ctx.font = `900 ${Math.max(12, bh * 0.48)}px system-ui`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('FINISH', bw / 2, bh * 0.36);
    ctx.restore();
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  }

  // ── Vehicle ────────────────────────────────────────────────────────────────
  _drawWheel(wx, wy, spin) {
    const ctx = this.ctx, B = carBody();
    const r = CONFIG.wheelRadius * this.pps * (B.wheel || 1);   // visual size per car
    const knobs = B.kind === 'monster';                          // chunky off-road tread
    const s = this.w2s(wx, wy);
    const cc = carColor();
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(spin);
    // tire (radial shade for roundness)
    const tg = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.4, 0, 0, r);
    tg.addColorStop(0, '#2a2a30'); tg.addColorStop(1, '#101013');
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = tg; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#070709'; ctx.stroke();
    // tread blocks around the rim
    ctx.fillStyle = '#0c0c0f';
    const n = knobs ? 12 : 18, tw = knobs ? 0.13 : 0.08;
    for (let k = 0; k < n; k++) {
      const a = k * Math.PI * 2 / n;
      ctx.save(); ctx.rotate(a); ctx.fillRect(-r * tw, -r * 1.02, r * tw * 2, r * (knobs ? 0.2 : 0.12)); ctx.restore();
    }
    // rim (metallic) with colored accent ring + spokes
    ctx.beginPath(); ctx.arc(0, 0, r * 0.52, 0, Math.PI * 2);
    ctx.strokeStyle = cc; ctx.lineWidth = Math.max(2, r * 0.1); ctx.stroke();
    const rg = ctx.createRadialGradient(-r * 0.15, -r * 0.15, r * 0.05, 0, 0, r * 0.5);
    rg.addColorStop(0, '#eef0f6'); rg.addColorStop(1, '#7e8088');
    ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2); ctx.fillStyle = rg; ctx.fill();
    ctx.strokeStyle = '#54565e'; ctx.lineWidth = Math.max(2, r * 0.09);
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42); ctx.stroke();
    }
    ctx.fillStyle = '#2b2b31'; ctx.beginPath(); ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = cc; ctx.beginPath(); ctx.arc(0, 0, r * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  _drawCar(vehicle, p, braking, boosting) {
    const ctx = this.ctx, pps = this.pps;
    const car = vehicle.car;
    const down = rot(0, -1, car.a);

    // soft ground shadow — a blurred radial blob hugging the ground, fading and
    // shrinking as the car climbs into the air.
    const gy = terrainHeight(car.x);
    const hAbove = Math.max(0, car.y - gy - 0.6);
    const k = clamp(1 - hAbove * 0.05, 0.28, 1);            // shrink/fade with height
    const shS = this.w2s(car.x, gy);
    ctx.save();
    ctx.translate(shS.x, shS.y + 1);
    ctx.rotate(-Math.atan(terrainSlope(car.x)));
    ctx.scale(1, 0.30);                                     // flatten to an ellipse
    const rad = CONFIG.bodyW * pps * (0.95 * carBody().len) * k;
    const sg = ctx.createRadialGradient(0, 0, rad * 0.2, 0, 0, rad);
    sg.addColorStop(0, `rgba(0,0,0,${0.36 * k})`);
    sg.addColorStop(0.65, `rgba(0,0,0,${0.18 * k})`);
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // wheels (at the end of the suspension, resting on the surface along the normal).
    // The HOVER car has none — it floats on jets, so we skip wheels & struts.
    if (carBody().kind !== 'hover') {
      for (let i = 0; i < 2; i++) {
        const la = vehicle.anchors[i];
        const aw = rot(la.x, la.y, car.a);
        const ax = car.x + aw.x, ay = car.y + aw.y;
        const L = CONFIG.suspRest, r = CONFIG.wheelRadius;
        let wx = ax + down.x * L, wy = ay + down.y * L;
        const wgy = terrainHeight(wx), m = (terrainHeight(wx + 0.05) - terrainHeight(wx - 0.05)) / 0.1;
        const inv = 1 / Math.hypot(m, 1), nx = -m * inv, ny = inv;
        const pen = r - (wy - wgy) * ny;
        if (pen > 0) { wx += nx * pen; wy += ny * pen; }
        const sA = this.w2s(ax, ay), sW = this.w2s(wx, wy);
        ctx.strokeStyle = '#2c2c32'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sA.x, sA.y); ctx.lineTo(sW.x, sW.y); ctx.stroke();
        ctx.strokeStyle = '#9a9aa4'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(sA.x, sA.y); ctx.lineTo(sW.x, sW.y); ctx.stroke();
        this._drawWheel(wx, wy, car.wheelSpin[i]);
      }
    }

    // chassis — each car KIND is a genuinely different vehicle (own draw routine)
    const B = carBody();
    const c = this.w2s(car.x, car.y);
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(-car.a);
    const hw = CONFIG.bodyW * pps / 2 * B.len;
    const hb = CONFIG.bodyH * pps / 2 * B.h;
    const cc = carColor();
    const fx = { p, braking, boosting };
    switch (B.kind) {
      case 'f1':      this._bodyF1(ctx, hw, hb, cc, fx); break;
      case 'monster': this._bodyMonster(ctx, hw, hb, cc, fx); break;
      case 'bike':    this._bodyBike(ctx, hw, hb, cc, fx); break;
      case 'truck':   this._bodyTruck(ctx, hw, hb, cc, fx); break;
      case 'hover':   this._bodyHover(ctx, hw, hb, cc, fx); break;
      default:        this._bodyBuggy(ctx, hw, hb, cc, fx);
    }
    ctx.restore();
  }

  /** Draw a given car into an arbitrary 2D canvas (garage card preview). */
  drawCarPreview(canvas, carId) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const prev = activeCar().id;
    setActiveCar(carId);                                  // body drawers read the active car
    const B = carBody(), cc = carColor();
    const hw = W * 0.23 * B.len, hb = H * 0.17 * B.h;       // fit: leaves room for wings/wheels
    ctx.save();
    ctx.translate(W * 0.5, H * 0.62);                        // baseline low so wheels sit near the bottom
    if (B.kind !== 'hover') {
      const r = hb * 0.7 * (B.wheel || 1), wy = hb * 0.5 + r * 0.3;
      this._previewWheel(ctx, -hw * 0.62, wy, r, cc, B.kind === 'monster');
      this._previewWheel(ctx, hw * 0.62, wy, r, cc, B.kind === 'monster');
    }
    const fx = { p: 0.25, braking: false, boosting: false };
    const draw = { f1: this._bodyF1, monster: this._bodyMonster, bike: this._bodyBike, truck: this._bodyTruck, hover: this._bodyHover }[B.kind] || this._bodyBuggy;
    draw.call(this, ctx, hw, hb, cc, fx);
    ctx.restore();
    setActiveCar(prev);
  }
  _previewWheel(ctx, x, y, r, cc, knobs) {
    ctx.save(); ctx.translate(x, y);
    const tg = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.4, 0, 0, r);
    tg.addColorStop(0, '#2a2a30'); tg.addColorStop(1, '#101013');
    ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#070709'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = cc; ctx.lineWidth = Math.max(2, r * 0.1); ctx.beginPath(); ctx.arc(0, 0, r * 0.52, 0, Math.PI * 2); ctx.stroke();
    const rg = ctx.createRadialGradient(-r * 0.15, -r * 0.15, r * 0.05, 0, 0, r * 0.5);
    rg.addColorStop(0, '#eef0f6'); rg.addColorStop(1, '#7e8088');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = cc; ctx.beginPath(); ctx.arc(0, 0, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ── shared vehicle helpers ───────────────────────────────────────────────
  _rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  _glow(ctx, x, y, r, rgb, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  _bodyFill(ctx, hb, cc, hi = 40, lo = -64) {
    const bg = ctx.createLinearGradient(0, -hb * 1.1, 0, hb * 0.6);
    bg.addColorStop(0, shade(cc, hi)); bg.addColorStop(0.5, cc); bg.addColorStop(1, shade(cc, lo));
    ctx.fillStyle = bg; ctx.fill();
    ctx.strokeStyle = shade(cc, -95); ctx.lineWidth = 2; ctx.stroke();
  }
  /** Glossy racing helmet (visor + stripe + sheen). */
  _driver(ctx, x, y, r, accent = '#d2342a') {
    ctx.fillStyle = '#161b26'; ctx.fillRect(x - r * 0.34, y, r * 0.68, r * 0.8);          // neck
    const hg = ctx.createLinearGradient(x, y - r, x, y + r);
    hg.addColorStop(0, '#ffffff'); hg.addColorStop(1, '#c6cad4');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(x, y, r, -Math.PI * 0.98, -Math.PI * 0.38); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#101a26'; ctx.beginPath(); ctx.ellipse(x + r * 0.34, y - r * 0.02, r * 0.5, r * 0.34, 0, -0.6, 0.8); ctx.fill();
    ctx.fillStyle = 'rgba(130,205,255,.75)'; ctx.beginPath(); ctx.ellipse(x + r * 0.46, y - r * 0.12, r * 0.2, r * 0.1, -0.3, 0, Math.PI * 2); ctx.fill();
  }

  /** RALLY BUGGY — tube frame, bucket seat, twin lights, two-tone hood. */
  _bodyBuggy(ctx, hw, hb, cc, { p, braking, boosting }) {
    // rear wing on twin uprights
    ctx.strokeStyle = '#202028'; ctx.lineWidth = Math.max(2, hb * 0.13); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-hw * 0.7, -hb * 0.55); ctx.lineTo(-hw * 0.96, -hb * 1.62); ctx.moveTo(-hw * 1.12, -hb * 0.5); ctx.lineTo(-hw * 1.18, -hb * 1.55); ctx.stroke();
    ctx.fillStyle = '#26262e'; this._rr(ctx, -hw * 1.34, -hb * 1.82, hw * 0.78, hb * 0.2, 3); ctx.fill();
    ctx.fillStyle = cc; this._rr(ctx, -hw * 1.34, -hb * 1.82, hw * 0.14, hb * 0.2, 2); ctx.fill();
    // tube roll cage
    ctx.strokeStyle = '#33333c'; ctx.lineWidth = Math.max(3, hb * 0.2);
    ctx.beginPath(); ctx.moveTo(-hw * 0.55, -hb * 0.5); ctx.quadraticCurveTo(-hw * 0.3, -hb * 2.1, hw * 0.05, -hb * 0.5); ctx.stroke();
    ctx.lineWidth = Math.max(2, hb * 0.12);
    ctx.beginPath(); ctx.moveTo(-hw * 0.4, -hb * 1.5); ctx.lineTo(hw * 0.5, -hb * 0.78); ctx.stroke();   // diagonal brace
    // bucket seat + driver
    ctx.fillStyle = '#1a1d24'; this._rr(ctx, -hw * 0.5, -hb * 1.1, hw * 0.5, hb * 0.7, 4); ctx.fill();
    this._driver(ctx, -hw * 0.18, -hb * 1.28, hb * 0.56);
    // hull
    ctx.beginPath();
    ctx.moveTo(-hw, hb * 0.55); ctx.lineTo(hw * 0.98, hb * 0.55); ctx.lineTo(hw * 1.04, -hb * 0.12);
    ctx.quadraticCurveTo(hw * 0.74, -hb * 0.74, hw * 0.32, -hb * 0.68);
    ctx.lineTo(-hw * 0.12, -hb * 0.58); ctx.lineTo(-hw * 0.55, -hb * 0.8); ctx.lineTo(-hw, -hb * 0.44); ctx.closePath();
    this._bodyFill(ctx, hb, cc);
    // hood scoop + two-tone strip
    ctx.fillStyle = shade(cc, -70); this._rr(ctx, hw * 0.2, -hb * 0.52, hw * 0.34, hb * 0.2, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.beginPath(); ctx.moveTo(-hw * 0.9, -hb * 0.32); ctx.quadraticCurveTo(hw * 0.1, -hb * 0.6, hw * 0.92, -hb * 0.2); ctx.lineTo(hw * 0.92, -hb * 0.05); ctx.quadraticCurveTo(hw * 0.1, -hb * 0.42, -hw * 0.9, -hb * 0.14); ctx.closePath(); ctx.fill();
    // skid plate
    ctx.strokeStyle = '#1b1b20'; ctx.lineWidth = Math.max(2, hb * 0.16); ctx.beginPath(); ctx.moveTo(-hw * 0.9, hb * 0.5); ctx.lineTo(hw * 0.95, hb * 0.5); ctx.stroke();
    // twin headlights
    for (const dy of [-0.28, -0.04]) { ctx.fillStyle = `rgba(255,238,150,${0.78 + p * 0.22})`; ctx.beginPath(); ctx.arc(hw * 0.98, hb * dy, hb * 0.13, 0, Math.PI * 2); ctx.fill(); }
    // number roundel
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hw * 0.18, -hb * 0.04, hb * 0.34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = shade(cc, -70); ctx.font = `900 ${Math.max(7, hb * 0.5)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('5', hw * 0.18, -hb * 0.02); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    // brake + exhaust
    ctx.fillStyle = braking ? '#ff3b2e' : '#6e1410'; this._rr(ctx, -hw * 1.04, -hb * 0.4, hb * 0.24, hb * 0.34, 2); ctx.fill();
    ctx.fillStyle = '#9a9aa4'; this._rr(ctx, -hw * 1.16, hb * 0.06, hw * 0.18, hb * 0.26, 3); ctx.fill();
    if (boosting) this._glow(ctx, -hw * 1.2, hb * 0.19, hb * 0.7, '255,150,40', 0.85);
  }

  /** F1 — open-wheel single-seater: nose cone, sidepods, halo, multi-element wing. */
  _bodyF1(ctx, hw, hb, cc, { p, braking, boosting }) {
    // multi-element rear wing on a swan-neck pylon
    ctx.fillStyle = '#15151b';
    this._rr(ctx, -hw * 1.22, -hb * 1.62, hw * 0.5, hb * 0.16, 2); ctx.fill();
    this._rr(ctx, -hw * 1.18, -hb * 1.38, hw * 0.42, hb * 0.12, 2); ctx.fill();
    ctx.fillStyle = cc; this._rr(ctx, -hw * 1.22, -hb * 1.62, hw * 0.5, hb * 0.05, 2); ctx.fill();    // wing flash
    ctx.strokeStyle = '#15151b'; ctx.lineWidth = Math.max(3, hb * 0.18); ctx.beginPath(); ctx.moveTo(-hw * 0.78, -hb * 0.42); ctx.lineTo(-hw * 0.95, -hb * 1.3); ctx.stroke();
    // sidepod
    ctx.fillStyle = shade(cc, -30); ctx.beginPath(); ctx.moveTo(-hw * 0.1, hb * 0.18); ctx.lineTo(-hw * 0.72, hb * 0.12); ctx.lineTo(-hw * 0.6, -hb * 0.22); ctx.lineTo(-hw * 0.05, -hb * 0.18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0d0d12'; this._rr(ctx, -hw * 0.18, -hb * 0.16, hw * 0.16, hb * 0.22, 2); ctx.fill();   // pod intake
    // slim tub with long nose
    ctx.beginPath();
    ctx.moveTo(-hw * 1.0, hb * 0.18); ctx.lineTo(hw * 0.55, hb * 0.16);
    ctx.quadraticCurveTo(hw * 1.2, hb * 0.12, hw * 1.34, -hb * 0.04);    // nose cone tip
    ctx.quadraticCurveTo(hw * 1.0, -hb * 0.14, hw * 0.5, -hb * 0.2);
    ctx.lineTo(hw * 0.08, -hb * 0.3); ctx.lineTo(-hw * 0.55, -hb * 0.3); ctx.lineTo(-hw * 0.96, -hb * 0.1); ctx.closePath();
    this._bodyFill(ctx, hb, cc, 46, -58);
    // accent stripe down the spine
    ctx.strokeStyle = shade(cc, 60); ctx.lineWidth = Math.max(2, hb * 0.1); ctx.beginPath(); ctx.moveTo(hw * 1.2, -hb * 0.05); ctx.lineTo(-hw * 0.4, -hb * 0.18); ctx.stroke();
    // front wing
    ctx.fillStyle = '#15151b'; this._rr(ctx, hw * 1.02, hb * 0.06, hw * 0.34, hb * 0.16, 2); ctx.fill();
    // airbox behind driver
    ctx.fillStyle = shade(cc, -36); ctx.beginPath(); ctx.moveTo(-hw * 0.34, -hb * 0.28); ctx.quadraticCurveTo(-hw * 0.5, -hb * 1.0, -hw * 0.2, -hb * 0.32); ctx.closePath(); ctx.fill();
    // halo + driver
    this._driver(ctx, -hw * 0.02, -hb * 0.66, hb * 0.46, '#101820');
    ctx.strokeStyle = '#0c0c11'; ctx.lineWidth = Math.max(2, hb * 0.12); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-hw * 0.3, -hb * 0.34); ctx.quadraticCurveTo(hw * 0.32, -hb * 1.28, hw * 0.34, -hb * 0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hw * 0.02, -hb * 1.04); ctx.lineTo(hw * 0.04, -hb * 0.34); ctx.stroke();   // halo central strut
    ctx.fillStyle = braking ? '#ff3b2e' : '#6e1410'; this._rr(ctx, -hw * 1.0, -hb * 0.08, hb * 0.2, hb * 0.24, 2); ctx.fill();
    if (boosting) this._glow(ctx, -hw * 1.06, -hb * 0.0, hb * 0.6, '255,150,40', 0.85);
  }

  /** MONSTER TRUCK — lifted cab on coil-overs, bull bar, roof light pod. */
  _bodyMonster(ctx, hw, hb, cc, { p, braking, boosting }) {
    // coil-over shocks down to the (big) wheels
    ctx.strokeStyle = '#454552'; ctx.lineWidth = Math.max(3, hb * 0.16);
    for (const sx of [-0.72, 0.72]) {
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) { const yy = hb * (0.4 + i * 0.11); const xx = hw * sx + (i % 2 ? hb * 0.12 : -hb * 0.12); i ? ctx.lineTo(xx, yy) : ctx.moveTo(hw * sx, yy); }
      ctx.stroke();
    }
    ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = Math.max(2, hb * 0.1);
    ctx.beginPath(); ctx.moveTo(-hw * 0.72, hb * 1.25); ctx.lineTo(hw * 0.72, hb * 1.25); ctx.stroke();   // axle
    // bull bar / push bar
    ctx.strokeStyle = '#c9ccd4'; ctx.lineWidth = Math.max(3, hb * 0.16); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hw * 1.04, hb * 0.4); ctx.lineTo(hw * 1.24, hb * 0.0); ctx.lineTo(hw * 1.04, -hb * 0.4); ctx.stroke();
    // body + tall cab
    ctx.beginPath();
    ctx.moveTo(-hw * 1.02, hb * 0.45); ctx.lineTo(hw * 1.06, hb * 0.45); ctx.lineTo(hw * 1.08, -hb * 0.5);
    ctx.lineTo(hw * 0.5, -hb * 0.62); ctx.lineTo(hw * 0.42, -hb * 1.12);
    ctx.lineTo(-hw * 0.5, -hb * 1.22); ctx.lineTo(-hw * 0.56, -hb * 0.5); ctx.lineTo(-hw * 1.02, -hb * 0.62); ctx.closePath();
    this._bodyFill(ctx, hb, cc, 44, -66);
    // flame/flare side accent
    ctx.fillStyle = shade(cc, 50); ctx.beginPath(); ctx.moveTo(hw * 1.06, -hb * 0.1); ctx.lineTo(hw * 0.2, hb * 0.0); ctx.lineTo(hw * 0.5, hb * 0.46); ctx.lineTo(hw * 1.06, hb * 0.45); ctx.closePath(); ctx.fill();
    // windshield + cab pillar
    ctx.fillStyle = 'rgba(150,200,235,.85)'; ctx.beginPath(); ctx.moveTo(hw * 0.44, -hb * 1.04); ctx.lineTo(-hw * 0.44, -hb * 1.12); ctx.lineTo(-hw * 0.46, -hb * 0.6); ctx.lineTo(hw * 0.46, -hb * 0.56); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(cc, -50); ctx.fillRect(-hw * 0.02, -hb * 1.16, hb * 0.1, hb * 0.6);   // B-pillar
    // roof light pod (4 lamps)
    ctx.fillStyle = '#23232a'; this._rr(ctx, -hw * 0.46, -hb * 1.42, hw * 0.86, hb * 0.2, 3); ctx.fill();
    for (let i = 0; i < 4; i++) { ctx.fillStyle = `rgba(255,240,170,${0.7 + p * 0.3})`; ctx.beginPath(); ctx.arc(-hw * 0.34 + i * hw * 0.2, -hb * 1.32, hb * 0.08, 0, Math.PI * 2); ctx.fill(); }
    // headlight + brake
    ctx.fillStyle = `rgba(255,238,150,${0.78 + p * 0.22})`; ctx.beginPath(); ctx.arc(hw * 1.04, -hb * 0.2, hb * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = braking ? '#ff3b2e' : '#6e1410'; this._rr(ctx, -hw * 1.04, -hb * 0.42, hb * 0.26, hb * 0.36, 2); ctx.fill();
    // exhaust stack out of the hood side
    ctx.fillStyle = '#b9bcc6'; this._rr(ctx, hw * 0.16, -hb * 0.95, hb * 0.16, hb * 0.5, 2); ctx.fill();
    if (boosting) this._glow(ctx, hw * 0.24, -hb * 1.0, hb * 0.6, '255,150,40', 0.85);
  }

  /** SPORT BIKE — fairing, windscreen, tank, seat hump, rider crouched, underslung pipe. */
  _bodyBike(ctx, hw, hb, cc, { p, braking, boosting }) {
    // swingarm + frame spine between the wheels
    ctx.strokeStyle = '#2a2a32'; ctx.lineWidth = Math.max(3, hb * 0.2); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-hw * 0.95, hb * 0.34); ctx.lineTo(hw * 0.2, -hb * 0.1); ctx.lineTo(hw * 0.95, hb * 0.36); ctx.stroke();   // rear arm + forks
    // underslung exhaust
    ctx.fillStyle = '#aeb0ba'; this._rr(ctx, -hw * 1.02, hb * 0.18, hw * 1.1, hb * 0.18, hb * 0.09); ctx.fill();
    if (boosting) this._glow(ctx, -hw * 1.05, hb * 0.27, hb * 0.6, '255,150,40', 0.85);
    // tank + tail bodywork (one sweeping shape)
    ctx.beginPath();
    ctx.moveTo(-hw * 0.92, -hb * 0.05);                                 // tail tip
    ctx.quadraticCurveTo(-hw * 0.7, -hb * 0.66, -hw * 0.2, -hb * 0.5);  // seat hump
    ctx.quadraticCurveTo(hw * 0.2, -hb * 0.42, hw * 0.5, -hb * 0.18);   // tank
    ctx.quadraticCurveTo(hw * 0.95, -hb * 0.06, hw * 1.02, -hb * 0.5);  // front fairing rise
    ctx.quadraticCurveTo(hw * 1.1, hb * 0.05, hw * 0.7, hb * 0.16);     // fairing nose down
    ctx.lineTo(-hw * 0.3, hb * 0.1); ctx.closePath();
    this._bodyFill(ctx, hb, cc, 48, -56);
    // windscreen (tinted)
    ctx.fillStyle = 'rgba(150,205,235,.7)'; ctx.beginPath(); ctx.moveTo(hw * 0.78, -hb * 0.46); ctx.quadraticCurveTo(hw * 1.0, -hb * 0.2, hw * 0.78, -hb * 0.12); ctx.lineTo(hw * 0.6, -hb * 0.2); ctx.closePath(); ctx.fill();
    // accent flash on the tail
    ctx.fillStyle = shade(cc, 60); ctx.beginPath(); ctx.moveTo(-hw * 0.88, -hb * 0.1); ctx.quadraticCurveTo(-hw * 0.6, -hb * 0.56, -hw * 0.24, -hb * 0.46); ctx.lineTo(-hw * 0.3, -hb * 0.3); ctx.quadraticCurveTo(-hw * 0.6, -hb * 0.4, -hw * 0.84, -hb * 0.02); ctx.closePath(); ctx.fill();
    // rider: low arm to the bars + crouched torso + helmet
    ctx.strokeStyle = '#181b22'; ctx.lineWidth = Math.max(4, hb * 0.34); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-hw * 0.18, -hb * 0.5); ctx.lineTo(hw * 0.34, -hb * 0.74); ctx.stroke();   // back
    ctx.lineWidth = Math.max(2, hb * 0.16); ctx.beginPath(); ctx.moveTo(hw * 0.34, -hb * 0.74); ctx.lineTo(hw * 0.7, -hb * 0.3); ctx.stroke();  // arm to bar
    this._driver(ctx, hw * 0.42, -hb * 0.86, hb * 0.42);
    // headlight + tail light
    ctx.fillStyle = `rgba(255,238,150,${0.8 + p * 0.2})`; ctx.beginPath(); ctx.arc(hw * 1.0, -hb * 0.2, hb * 0.13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = braking ? '#ff3b2e' : '#6e1410'; this._rr(ctx, -hw * 0.94, -hb * 0.12, hb * 0.16, hb * 0.2, 2); ctx.fill();
  }

  /** HOT-ROD RIG — long hood with supercharger, side pipes, cab, chrome bumper. */
  _bodyTruck(ctx, hw, hb, cc, { p, braking, boosting }) {
    // chrome front bumper
    ctx.fillStyle = '#c9ccd4'; this._rr(ctx, hw * 0.9, hb * 0.1, hw * 0.22, hb * 0.4, 3); ctx.fill();
    // body: long hood + cab + short bed
    ctx.beginPath();
    ctx.moveTo(-hw * 1.05, hb * 0.5); ctx.lineTo(hw * 1.0, hb * 0.5); ctx.lineTo(hw * 1.04, -hb * 0.14);
    ctx.lineTo(hw * 0.34, -hb * 0.26);                                  // long low hood
    ctx.lineTo(hw * 0.28, -hb * 1.0); ctx.lineTo(-hw * 0.28, -hb * 1.08);   // cab
    ctx.lineTo(-hw * 0.34, -hb * 0.34); ctx.lineTo(-hw * 1.05, -hb * 0.3); ctx.closePath();
    this._bodyFill(ctx, hb, cc, 44, -64);
    // hood flame accent
    ctx.fillStyle = shade(cc, 55); ctx.beginPath(); ctx.moveTo(hw * 1.0, -hb * 0.06); ctx.lineTo(hw * 0.2, hb * 0.0); ctx.quadraticCurveTo(hw * 0.5, hb * 0.12, hw * 1.0, hb * 0.16); ctx.closePath(); ctx.fill();
    // cab window + pillar
    ctx.fillStyle = 'rgba(150,200,235,.85)'; ctx.beginPath(); ctx.moveTo(hw * 0.24, -hb * 0.96); ctx.lineTo(-hw * 0.24, -hb * 1.02); ctx.lineTo(-hw * 0.28, -hb * 0.56); ctx.lineTo(hw * 0.26, -hb * 0.52); ctx.closePath(); ctx.fill();
    // supercharger blower poking out of the hood
    ctx.fillStyle = '#3a3a44'; this._rr(ctx, hw * 0.42, -hb * 0.62, hw * 0.3, hb * 0.4, 3); ctx.fill();
    ctx.fillStyle = '#1d1d24'; this._rr(ctx, hw * 0.48, -hb * 0.86, hw * 0.18, hb * 0.26, 2); ctx.fill();   // scoop
    // side exhaust pipes (chrome) along the body
    ctx.strokeStyle = '#cfd2da'; ctx.lineWidth = Math.max(3, hb * 0.16); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hw * 0.34, hb * 0.34); ctx.lineTo(-hw * 0.5, hb * 0.34); ctx.stroke();
    // twin stacks behind the cab
    ctx.fillStyle = '#c9ccd4'; this._rr(ctx, -hw * 0.5, -hb * 1.3, hw * 0.12, hb * 1.0, 2); ctx.fill(); this._rr(ctx, -hw * 0.34, -hb * 1.3, hw * 0.12, hb * 1.0, 2); ctx.fill();
    if (boosting) { this._glow(ctx, -hw * 0.44, -hb * 1.34, hb * 0.5, '255,150,40', 0.9); this._glow(ctx, -hw * 0.28, -hb * 1.34, hb * 0.5, '255,150,40', 0.9); }
    // headlight + brake
    ctx.fillStyle = `rgba(255,238,150,${0.78 + p * 0.22})`; ctx.beginPath(); ctx.arc(hw * 1.0, -hb * 0.02, hb * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = braking ? '#ff3b2e' : '#6e1410'; this._rr(ctx, -hw * 1.05, -hb * 0.24, hb * 0.22, hb * 0.32, 2); ctx.fill();
  }

  /** HOVER SPEEDER — sci-fi fuselage, bubble canopy, engine nacelles, neon underglow (no wheels). */
  _bodyHover(ctx, hw, hb, cc, { p, braking, boosting }) {
    const t = (this._lastT || 0);
    // MAGNETIC REPULSOR FIELD: cyan beams fanning down to the ground + ripple rings
    const pulse = 0.55 + 0.25 * Math.sin(t * 7);
    const yTop = hb * 0.28, yBot = hb * 2.4;
    for (const bx of [-0.55, 0, 0.55]) {
      const xT = hw * bx * 0.55, xB = hw * bx * 1.05, wT = hw * 0.14, wB = hw * 0.36;
      const grd = ctx.createLinearGradient(0, yTop, 0, yBot);
      grd.addColorStop(0, `rgba(150,238,255,${0.6 * pulse})`);
      grd.addColorStop(1, 'rgba(150,238,255,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(xT - wT, yTop); ctx.lineTo(xT + wT, yTop); ctx.lineTo(xB + wB, yBot); ctx.lineTo(xB - wB, yBot);
      ctx.closePath(); ctx.fill();
      this._glow(ctx, xT, yTop, hw * 0.24, '170,242,255', 0.75 * pulse);   // emitter pad
    }
    // field ripple rings spreading out where the beams meet the ground
    ctx.strokeStyle = `rgba(150,240,255,${0.55 * pulse})`; ctx.lineWidth = Math.max(1.5, hb * 0.05);
    for (let i = 0; i < 2; i++) {
      const f = (t * 0.9 + i * 0.5) % 1;
      ctx.globalAlpha = (1 - f) * pulse;
      ctx.beginPath(); ctx.ellipse(0, yBot, hw * (0.4 + f * 0.9), hb * 0.16 * (0.4 + f * 0.9), 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // dorsal fin
    ctx.fillStyle = shade(cc, -46); ctx.beginPath(); ctx.moveTo(-hw * 0.4, -hb * 0.3); ctx.lineTo(-hw * 0.92, -hb * 1.15); ctx.lineTo(-hw * 0.52, -hb * 0.34); ctx.closePath(); ctx.fill();
    ctx.fillStyle = cc; ctx.fillRect(-hw * 0.78, -hb * 0.95, hw * 0.06, hb * 0.5);   // fin accent
    // sleek fuselage
    ctx.beginPath();
    ctx.moveTo(-hw * 0.98, -hb * 0.04);
    ctx.quadraticCurveTo(hw * 0.1, hb * 0.46, hw * 1.34, -hb * 0.06);   // long pointed nose
    ctx.quadraticCurveTo(hw * 0.5, -hb * 0.42, hw * 0.05, -hb * 0.5);   // upper deck
    ctx.quadraticCurveTo(-hw * 0.6, -hb * 0.56, -hw * 0.98, -hb * 0.04); ctx.closePath();
    this._bodyFill(ctx, hb, cc, 52, -58);
    // neon trim line
    ctx.strokeStyle = 'rgba(150,240,255,.9)'; ctx.lineWidth = Math.max(2, hb * 0.08);
    ctx.beginPath(); ctx.moveTo(hw * 1.28, -hb * 0.08); ctx.quadraticCurveTo(hw * 0.1, hb * 0.3, -hw * 0.92, -hb * 0.02); ctx.stroke();
    // engine nacelle (rear top)
    ctx.fillStyle = shade(cc, -28); this._rr(ctx, -hw * 0.95, -hb * 0.5, hw * 0.55, hb * 0.34, hb * 0.16); ctx.fill();
    ctx.fillStyle = '#0c1620'; this._rr(ctx, -hw * 0.96, -hb * 0.44, hw * 0.12, hb * 0.22, 2); ctx.fill();   // intake
    // bubble canopy with sheen
    const cg = ctx.createLinearGradient(0, -hb * 0.55, 0, -hb * 0.05);
    cg.addColorStop(0, 'rgba(190,250,255,.95)'); cg.addColorStop(1, 'rgba(40,120,170,.85)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(hw * 0.12, -hb * 0.3, hw * 0.46, hb * 0.26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(hw * 0.24, -hb * 0.4, hw * 0.16, hb * 0.07, -0.4, 0, Math.PI * 2); ctx.fill();
    // nose light + rear thruster ring
    this._glow(ctx, hw * 1.3, -hb * 0.06, hb * 0.5, '160,245,255', 0.8 + p * 0.2);
    ctx.fillStyle = braking ? '#ff5a4a' : '#123244'; ctx.beginPath(); ctx.arc(-hw * 0.96, -hb * 0.2, hb * 0.2, 0, Math.PI * 2); ctx.fill();
    this._glow(ctx, -hw * 1.02, -hb * 0.2, hb * (boosting ? 0.85 : 0.4), '120,230,255', boosting ? 0.95 : 0.5);
  }

  // ── Screen FX ──────────────────────────────────────────────────────────────
  _drawSpeedFX(spd, boosting, time) {
    const a = clamp((spd - 16) / 14, 0, 1) * 0.22 + (boosting ? 0.14 : 0);
    if (a <= 0.02) return;
    const ctx = this.ctx;
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const span = this.W + 260;
      const x = span - ((time * (1100 + i * 90) + i * 357) % span) - 130;
      const y = h01(i * 13.7) * this.H;
      const len = 60 + h01(i * 7.1) * 140;
      ctx.lineWidth = 1.5 + h01(i * 3.3) * 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
    }
  }
}
