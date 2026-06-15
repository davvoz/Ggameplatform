/**
 * Terrain — deterministic, seedable heightfield h(x).
 *
 * DESIGN: the track is a sequence of FIXED-LENGTH SEGMENTS. Each segment is a
 * hand-shaped piece that starts and ends at height 0, so consecutive segments
 * always connect smoothly (no walls). A gentle global drift adds scenery.
 *
 * THE MATCH TRACK IS DESIGNED, NOT RANDOM: the first ~36 segments (0→1512 m,
 * covering the whole 1500 m run) follow a hand-authored zone plan:
 *
 *   WARM-UP (0–294)        easy jumps to learn the controls
 *   TRICK PARK (294–588)   dense jumps & a big ramp → chain combos
 *   SPEED VALLEY (588–840) flowing dips & turbo pads → pure speed
 *   BIG AIR RIDGE (840–1176) the spectacle: monster ramps, high tables
 *   FINAL SPRINT (1176–1500) fast flats + pads, race the clock to the line
 *
 * The seed only jitters segment amplitudes (±12%), so the weekly ranked seed
 * gives variety while the pacing curve stays fair. Past the designed part the
 * track falls back to procedural alternation (feature / recovery).
 *
 * `segmentInfo(k)` is the single source of truth for what a segment is — the
 * height function AND the object placer both read it, so collectibles always
 * sit on the feature they were designed for.
 *
 * NOTE: a heightfield is single-valued in x, so true overlapping multi-level /
 * drive-on-top tunnels need a segment-based world (a later step). Verticality
 * here comes from tables, valleys and tall ramps.
 */

import { MAPS } from '../config/maps.js';

let SEED = 1337;

export function setSeed(s) { SEED = (s >>> 0) || 1; }
export function getSeed() { return SEED; }

// ── Current map — ALL track data (design rows, tunnels, loops, cannons,
// perches, biome) comes from the active entry of the 5-map weekly roster.
let MAP = MAPS[0];

export function setMap(i) {
  const n = MAPS.length;
  MAP = MAPS[((Math.round(i) % n) + n) % n];
  if (MAP.seed) setSeed(MAP.seed);
  return MAP;
}
export function currentMap() { return MAP; }

function hash(i) {
  let x = (i ^ SEED) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = (x ^ (x >>> 16)) >>> 0;
  return x / 4294967296;
}

/** Deterministic [0,1) hash bound to the current seed (object placement etc.). */
export function seedHash(i) { return hash(i); }

function smoothLerp(a, b, t) { const s = t * t * (3 - 2 * t); return a + (b - a) * s; }
function valNoise(x) {
  const x0 = Math.floor(x), t = x - x0;
  return (smoothLerp(hash(x0), hash(x0 + 1), t) * 2 - 1);
}
/** smoothstep 0→1 between a and b */
function ss(a, b, u) { const t = Math.min(1, Math.max(0, (u - a) / (b - a))); return t * t * (3 - 2 * t); }

export const SEG_LEN = 42; // length of each track segment (m)

// ── Per-map terrain STYLE ────────────────────────────────────────────────────
// Each map reshapes the GENERATOR itself, not just the order of shapes:
//   driftAmp/driftFreq — long macro undulation of the whole baseline
//   texAmp/texFreq/texJag — surface micro-texture (smooth ice ↔ rough rock)
//   rollFreq — rolling wavelength (long dunes ↔ choppy)
//   valley   — 'sine' (smooth bowl) | 'round' (flat-bottom) | 'flatV' (pointy)
//   whoopFreq — mogul density
const DEF_STYLE = {
  driftAmp: 1.2, driftFreq: 0.012,
  texAmp: 0.20, texFreq: 0.10, texJag: 0,
  rollFreq: 0.20, valley: 'sine', whoopFreq: 0.85,
};
function st() { return MAP.style || DEF_STYLE; }

// ── Segment shapes — u in [0, L]; each returns 0 at u=0 and u=L ──────────────
function segRolling(u, L, p, S) {
  const win = Math.sin(Math.PI * u / L);                 // 0 at the ends
  return win * (2.0 + p * 1.3) * Math.sin(u * S.rollFreq + p * 4);
}

function segWhoops(u, L, S) {
  const win = Math.sin(Math.PI * u / L);
  return win * 0.9 * (1 + Math.sin(u * S.whoopFreq));     // gentle, passable moguls
}

function segSingleJump(u, L, p) {
  const H = 4.5 + p * 1.5;
  const up   = ss(0.08 * L, 0.32 * L, u) * H;             // launch face — long enough to carry speed
  const down = ss(0.32 * L, 0.48 * L, u) * (H + 2.5);     // crest drops away into a gap
  const land = ss(0.62 * L, 0.85 * L, u) * 2.5;           // landing rise back to 0
  return up - down + land;
}

function segBigRamp(u, L, p) {
  const H = 7 + p * 2;
  const up   = ss(0.10 * L, 0.42 * L, u) * H;             // long launch face (rideable at speed)
  const down = ss(0.42 * L, 0.58 * L, u) * (H + 2);       // crest drop — shallow pit, no trap
  const land = ss(0.72 * L, 0.90 * L, u) * 2;
  return up - down + land;
}

function segTable(u, L, p) {
  const H = 3.5 + p * 1.5;                                // raised flat "table" you ride over
  const up   = ss(0.15 * L, 0.30 * L, u) * H;
  const down = ss(0.55 * L, 0.72 * L, u) * H;
  return up - down;
}

function segValley(u, L, p, S) {
  const D = 4 + p * 2;
  const t = u / L, w = Math.sin(Math.PI * t);
  if (S.valley === 'round') return -D * Math.pow(w, 0.6);            // wide flat-bottom bowl
  if (S.valley === 'flatV') return -D * Math.pow(1 - Math.abs(2 * t - 1), 1.4); // pointy V
  return -D * w;                                                      // smooth sine dip
}

/** GAP — takeoff lip, a deep gorge/void, then a landing ramp (canyon, water). */
function segGap(u, L, p) {
  const t = u / L;
  const H = 4 + p * 1.5;
  const take = ss(0.12, 0.34, t) * H;                    // up to the takeoff lip
  const fall = ss(0.34, 0.46, t) * (H + 5);              // cliff down into the gorge
  const rise = ss(0.66, 0.86, t) * 5;                    // landing ramp back to grade
  return take - fall + rise;
}

/** STEPS — a stepped pyramid (climb in 3 plateaus, descend in 3). */
function segSteps(u, L, p) {
  const t = u / L;
  const H = 2.4 + p * 1.4;
  const climb = (ss(0.08, 0.16, t) + ss(0.20, 0.28, t) + ss(0.34, 0.44, t)) / 3;  // 0→1 by mid
  const fall  = (ss(0.56, 0.66, t) + ss(0.72, 0.80, t) + ss(0.84, 0.92, t)) / 3;  // 0→1 after mid
  return (climb - fall) * H;
}

/** CRATER — flat shoulders, steep walls, flat bottom (sharp, not a smooth dip). */
function segCrater(u, L, p) {
  const t = u / L;
  const D = 5 + p * 2;
  const dip = ss(0.30, 0.42, t) * (1 - ss(0.58, 0.70, t));  // 1 only across the flat floor
  return -D * dip;
}

/** KICKER — ski-jump: long approach, CONCAVE lip (steeper near the top → vertical
 *  pop), then a drop and a landing back to grade. Launchier than a plain ramp. */
function segKicker(u, L, p) {
  const t = u / L;
  const H = 4.5 + p * 1.5;
  const up = ss(0.06, 0.40, t);                     // long climbable approach
  const launch = (0.35 * up + 0.65 * up * up) * H;  // concave → kicks you upward
  const drop = ss(0.40, 0.54, t) * (H + 2.5);
  const land = ss(0.70, 0.90, t) * 2.5;
  return launch - drop + land;
}

/** HILL — one big rounded dune: gentle windward climb, steeper leeward drop. */
function segHill(u, L, p) {
  const t = u / L, H = 4 + p * 2.5;
  const w = Math.sin(Math.PI * t);
  return H * Math.pow(w, t < 0.5 ? 0.8 : 1.3);
}

/** CHASM — flat takeoff mesa, a cliff into a wide deep void, climbable far wall up
 *  to the landing mesa. Clear it at speed or drop into the gorge (vertigo). */
function segChasm(u, L, p) {
  const t = u / L, H = 2 + p * 1.0;
  const up0   = ss(0.00, 0.14, t) * H;          // onto the takeoff mesa
  const down  = ss(0.30, 0.44, t) * (H + 5);    // cliff into the void
  const up1   = ss(0.56, 0.80, t) * (H + 5);    // climbable far wall to landing mesa
  const down1 = ss(0.90, 1.00, t) * H;          // mesa back to grade
  return up0 - down + up1 - down1;
}

/** BUMP — a single sharp boulder hump: ride over it with speed, or it stops you. */
function segBump(u, L, p) {
  const t = u / L, H = 2.2 + p * 1.2;
  return H * ss(0.38, 0.50, t) * (1 - ss(0.50, 0.62, t));
}

/** TABLETOP — a flat-topped jump: steep up-ramp, a plateau to clear or land on,
 *  steep down-ramp (BMX/park style — different from the long, low `table`). */
function segTabletop(u, L, p) {
  const t = u / L, H = 4 + p * 1.5;
  return ss(0.16, 0.34, t) * H - ss(0.60, 0.80, t) * H;
}

/** DROP — a cliff descent: small rise to a ledge, a sheer drop to a lower shelf,
 *  then a climbable ramp back to grade. You fall OFF it (vs a jump that goes up). */
function segDrop(u, L, p) {
  const t = u / L, D = 4 + p * 2;
  return ss(0.10, 0.24, t) * 1.5 - ss(0.30, 0.42, t) * (D + 1.5) + ss(0.62, 0.86, t) * D;
}

/** STEPDOWN — a cascade of three descending ledges, then a ramp back up. */
function segStepdown(u, L, p) {
  const t = u / L, H = 2 + p * 1.0;
  const dn = ss(0.10, 0.18, t) + ss(0.26, 0.34, t) + ss(0.42, 0.50, t);  // 0→3 descending
  const up = ss(0.60, 0.92, t) * 3;                                       // climb back to grade
  return (up - dn) * H;
}

// ── Designed match track ──────────────────────────────────────────────────────
// The 36 segment rows (k = 0..35 → 0..1512 m) live in the CURRENT MAP
// (js/config/maps.js — 10 authored tracks cycling weekly).
// Row: { t, amp, pad, life, spring, gate, cannon, zone }.

/** Procedural fallback past the designed track (endless / free roam). */
function procInfo(k) {
  if (k <= 1) return { t: 'intro', amp: 0.4 };
  if ((k & 1) === 1) {
    return hash(k * 3 + 1) < 0.5 ? { t: 'flat' } : { t: 'rolling', amp: 1 };
  }
  const diff = 1 + Math.min(0.5, k / 80);                 // gentle difficulty curve
  const r = hash(k * 5 + 2);
  const t = r < 0.30 ? 'jump' : r < 0.50 ? 'table' : r < 0.68 ? 'whoops'
          : r < 0.84 ? 'valley' : 'ramp';
  return { t, amp: diff };
}

/**
 * What segment k is — designed entry if inside the authored track, procedural
 * otherwise. Used by the height function AND the object placer.
 */
export function segmentInfo(k) {
  if (k >= 0 && k < MAP.design.length) return MAP.design[k];
  return procInfo(k);
}

function segmentHeight(k, x) {
  const L = SEG_LEN;
  const u = x - k * L;
  const info = segmentInfo(k);
  const S = st();
  const p = hash(k * 9 + 4), q = hash(k * 17 + 8);
  // seed-driven amplitude jitter: weekly variety, same pacing curve
  const amp = (info.amp ?? 1) * (1 + (hash(k * 23 + 11) - 0.5) * 0.24);
  switch (info.t) {
    case 'flat':    return 0;
    case 'intro':   return segRolling(u, L, p, S) * amp;
    case 'rolling': return segRolling(u, L, p, S) * amp;
    case 'whoops':  return segWhoops(u, L, S) * amp;
    case 'jump':    return segSingleJump(u, L, q) * amp;
    case 'ramp':    return segBigRamp(u, L, q) * amp;
    case 'table':   return segTable(u, L, q) * amp;
    case 'valley':  return segValley(u, L, q, S) * amp;
    case 'gap':     return segGap(u, L, q) * amp;
    case 'steps':   return segSteps(u, L, q) * amp;
    case 'crater':  return segCrater(u, L, q) * amp;
    case 'kicker':  return segKicker(u, L, q) * amp;
    case 'hill':    return segHill(u, L, q) * amp;
    case 'chasm':   return segChasm(u, L, q) * amp;
    case 'bump':    return segBump(u, L, q) * amp;
    case 'tabletop':return segTabletop(u, L, q) * amp;
    case 'drop':    return segDrop(u, L, q) * amp;
    case 'stepdown':return segStepdown(u, L, q) * amp;
    default:        return 0;
  }
}

/** Per-map physics feel (all deterministic → ranked-safe). Defaults = 1. */
export function gravityScale() { return MAP.gravityScale || 1; }   // MOONLIGHT < 1 → floaty
export function gripScale()    { return MAP.gripScale ?? 1; }       // SNOWY < 1 → ice (slip)
export function dragScale()    { return MAP.dragScale ?? 1; }       // < 1 → glide · > 1 → sand bog

/** Per-map surface micro-texture (continuous → no seams). Smooth ice ↔ rough rock. */
function texture(x) {
  const S = st();
  if (!S.texAmp) return 0;
  const n = valNoise(x * S.texFreq + 11.3);
  const v = S.texJag ? (Math.abs(n) * 2 - 1) * S.texJag + n * (1 - S.texJag) : n;
  return S.texAmp * v;
}

/** Surface height AS DESIGNED (before tunnel carving) — also the tunnel ROOF top. */
export function baseHeight(x) {
  const k = Math.floor(x / SEG_LEN);
  return drift(x) + segmentHeight(k, x) + texture(x);    // macro drift + shape + micro texture
}

// ── Underground tunnels — the heightfield CARVES DOWN into a bore ─────────────
// The drivable ground dips to the tunnel floor; a one-way ROOF surface (looks
// like normal ground, grass on top) covers the bore at the original grade.
// THE FORK IS PHYSICAL: a launch lip rises just before the entry hole — carry
// speed (≳15 m/s) and you fly over the hole onto the roof (surface route);
// arrive slow and you drop into the bore (underground route, loot inside).
// Per-map table (MAP.tunnels): { x0, x1, depth, a, b, ex }.
export function tunnelList() { return MAP.tunnels; }

/** Roof surfaces span [t.a, t.b] and sit at the original (uncarved) grade. */
export function roofTopAt(t, x) { return baseHeight(x); }
export function roofSlopeAt(t, x) {
  const e = 0.05;
  return (baseHeight(x + e) - baseHeight(x - e)) / (2 * e);
}

/** Rocky CEILING of the bore — SOLID: you bump your head on it from inside. */
export function roofUnderAt(t, x) {
  const taper = Math.min(1, (x - t.a) / 2.5, (t.b - x) / 2.5);
  return baseHeight(x) - (1.6 + 0.7 * vh(Math.floor(x / 1.5) * 3.7)) * Math.max(0.3, taper);
}

export function roofUnderSlopeAt(t, x) {
  const e = 0.05;
  return (roofUnderAt(t, Math.min(t.b, x + e)) - roofUnderAt(t, Math.max(t.a, x - e))) / (2 * e);
}

export function terrainHeight(x) {
  let h = baseHeight(x);
  for (const t of MAP.tunnels) {
    if (x <= t.x0 - 7 || x >= t.x1) continue;
    if (x < t.x0) {
      // launch lip before the hole — at speed the curvature throws you over it
      const u = (x - (t.x0 - 7)) / 7;
      h += 1.5 * Math.sin(Math.PI * u);
    } else {
      // the bore: blend the surface toward a FLAT floor at (drift - depth).
      // Blending (not subtracting) keeps the floor flat even when the surface
      // above has features (whoops!), and the exit must be CLIMBABLE from a
      // standstill — no traps.
      const w = ss(t.x0, t.x0 + 10, x) * (1 - ss(t.x1 - t.ex, t.x1, x));
      h = h * (1 - w) + (drift(x) - t.depth) * w;
    }
  }
  return h;
}

export function terrainSlope(x) {
  const d = 0.05;
  return (terrainHeight(x + d) - terrainHeight(x - d)) / (2 * d);
}

// NOTE: floating platforms over the track were tried and REMOVED (user feedback:
// they interrupt the main line — you slam into their belly mid-jump and wheels
// snag climbing onto them). Extra fun lives IN the terrain (tunnels, ramps) or
// IN THE AIR (sky treasure, loop) — never suspended across the flight path.

function drift(x) { const S = st(); return S.driftAmp * valNoise(x * S.driftFreq); }

/** Deterministic visual/physics hash for slab undersides (NOT the gameplay seed). */
function vh(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// ── Loop-the-loop ─────────────────────────────────────────────────────────────
// A full 360° vertical loop standing ON THE GROUND (on a flat row). The car
// engages it when it crosses the entry grounded and fast enough; the ride is
// scripted (deterministic) and exits at the same point with the same speed.
// Per-map table (MAP.loops): { x, r, minSpeed }.
export function loopList() { return MAP.loops; }
export function loopBaseAt(l) { return terrainHeight(l.x); }

// ── Perches — small floating TARGET platforms ─────────────────────────────────
// Tiny pedestals placed as stunt TARGETS off a launcher's flight path (NOT roads
// over the track: below them there's only the launcher's pit, so the low route
// is never blocked). One-way top + solid belly, same physics as tunnel roofs.
// Per-map table (MAP.perches): { x0, x1, h }.
export function perchList() { return MAP.perches; }
export function perchTopAt(p, x) { return drift(x) + p.h; }
export function perchSlopeAt(p, x) {
  const e = 0.05;
  return (perchTopAt(p, Math.min(p.x1, x + e)) - perchTopAt(p, Math.max(p.x0, x - e))) / (2 * e);
}
/** Rocky belly — SOLID (full-thickness one-way window: no punch-through). */
export function perchUnderAt(p, x) {
  const taper = Math.min(1, (x - p.x0) / 2, (p.x1 - x) / 2);
  return perchTopAt(p, x) - (1.1 + 0.5 * vh(Math.floor(x / 1.2) * 5.13)) * Math.max(0.25, taper);
}
export function perchUnderSlopeAt(p, x) {
  const e = 0.05;
  return (perchUnderAt(p, Math.min(p.x1, x + e)) - perchUnderAt(p, Math.max(p.x0, x - e))) / (2 * e);
}

// ── Cannon ────────────────────────────────────────────────────────────────────
// Drive in grounded → the barrel sucks you in, short charge, BOOM: a scripted,
// deterministic ballistic launch (Vehicle._cannonStep). Gems trace the flight.
// Per-map table (MAP.cannons): { x, angle, power, perch } — `perch` indexes
// MAP.perches (null → the cannon stands on the ground).
export function cannonList() { return MAP.cannons; }
/** Ground the cannon stands on (perch top or terrain). */
export function cannonBaseY(cn) {
  return cn.perch != null ? perchTopAt(MAP.perches[cn.perch], cn.x) : terrainHeight(cn.x);
}
