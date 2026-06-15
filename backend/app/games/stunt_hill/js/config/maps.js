/**
 * MAPS — 5 hand-authored tracks that cycle weekly (week % 5).
 *
 * DESIGN GOAL: each map is a JOURNEY of ~6 distinct ACTS that change from start
 * to finish (warm-up → feature section → stunt → … → finale), NOT one motif
 * tiled. And each map is clearly different from the others in its mix of pieces
 * (tunnels, hills, ramps, jumps, loops, chasms, kickers, …) and its stunts.
 *
 *   design  — the 36 segment rows (42 m each, 0→1512 m; finish at 1500).
 *             Row: { t, amp, pad, life, spring, gate, cannon, zone }
 *   tunnels — underground bores: { x0, x1, depth, a, b, ex }  (a=x0+8, b=x1-9)
 *   loops   — 360° rings ON flat ground: { x, r, minSpeed }   (x = flat segment center)
 *   perches — small floating target platforms: { x0, x1, h }
 *   cannons — { x, angle, power, perch } (perch = index into perches)
 *   gravityScale/gripScale/dragScale — optional per-map physics flavor (MOON
 *             floaty, SNOWY icy). Deterministic → ranked-safe. Default 1.
 *   style   — terrain GENERATOR character (drift/texture/rolling/valley/whoops).
 *   biome   — visual identity ([start,end] pairs lerped with run progress).
 *
 * SHAPE VOCABULARY (t): flat · intro · rolling(R) · whoops(W) · jump(J) ·
 *   ramp(RM) · table(T) · valley(V) · gap(G) · steps(S) · crater(C) ·
 *   kicker(K, ski-jump) · hill(H, big dune) · chasm(CH, mesa-void-mesa) · bump(B).
 *
 * THE 5 MAPS (each a distinct journey + distinct stunt mix):
 *   1 GREEN HILLS — grassy all-rounder: tunnel → loop → hills → cannon → technical → sprint
 *   2 DESERT DUNES — sand: dune intro → cave → big dunes → DOUBLE LOOP → valleys → dunes
 *   3 SNOWY PEAKS — ice: bunny slope → glacier steps → ice cave → summit kickers+cannon → cornice → downhill
 *   4 CANYON — rock: mesas → cave network → river gorge (chasms) → eagle cannon → rim → sprint
 *   5 MOONLIGHT — low-G night: crater field → comet cannon → mega kickers → dark-side cave → crater loop → sprint
 *
 * PLAYABILITY RULES:
 *   - never valley/crater/gap/chasm immediately before a ramp (slingshot risk)
 *   - tunnels only under flat / flat+whoops rows; loop on a clean flat (x=k*42+21)
 *   - cannon kit: ramp + cannon:true at K → perch [K*42+24.5, K*42+36.5, 8.8], cannon K*42+30.5
 *   - one flat/rolling row = ONE of spring | gate | pad | life
 *
 * Pure data — no imports (Terrain imports it).
 */

const F  = (o = {}) => ({ t: 'flat', ...o });
const R  = (a, o = {}) => ({ t: 'rolling', amp: a, ...o });
const J  = (a, o = {}) => ({ t: 'jump', amp: a, ...o });
const RM = (a, o = {}) => ({ t: 'ramp', amp: a, ...o });
const T  = (a, o = {}) => ({ t: 'table', amp: a, ...o });
const V  = (a, o = {}) => ({ t: 'valley', amp: a, ...o });
const W  = (a, o = {}) => ({ t: 'whoops', amp: a, ...o });
const G  = (a, o = {}) => ({ t: 'gap', amp: a, ...o });
const S  = (a, o = {}) => ({ t: 'steps', amp: a, ...o });
const C  = (a, o = {}) => ({ t: 'crater', amp: a, ...o });
const K  = (a, o = {}) => ({ t: 'kicker', amp: a, ...o });   // ski-jump
const H  = (a, o = {}) => ({ t: 'hill', amp: a, ...o });     // big dune
const CH = (a, o = {}) => ({ t: 'chasm', amp: a, ...o });    // mesa-void-mesa
const B  = (a, o = {}) => ({ t: 'bump', amp: a, ...o });     // boulder hump
const TT = (a, o = {}) => ({ t: 'tabletop', amp: a, ...o }); // flat-topped jump
const DR = (a, o = {}) => ({ t: 'drop', amp: a, ...o });     // cliff descent
const SD = (a, o = {}) => ({ t: 'stepdown', amp: a, ...o }); // cascading ledges
const I  = () => ({ t: 'intro', amp: 0.35 });

const ST = (o = {}) => ({
  driftAmp: 1.2, driftFreq: 0.012, texAmp: 0.20, texFreq: 0.10, texJag: 0,
  rollFreq: 0.20, valley: 'sine', whoopFreq: 0.85, ...o,
});

export const MAPS = [

  // ── 1 · GREEN HILLS — "Grand Tour" (grassy all-rounder) ────────────────────
  // A:warm-up+underpass · B:trick park+loop · C:hill country · D:cannon ridge ·
  // E:technical (whoops/steps/valley) · F:big-air sprint.
  {
    id: 'green-hills', name: 'GREEN HILLS', seed: 1337, tunnelStyle: 'grass',
    design: [
      I(), F(),
      R(0.50, { zone: 'WARM-UP' }), J(0.60), F({ zone: 'UNDERPASS' }), TT(0.80), F({ pad: true }),
      J(0.90, { zone: 'TRICK PARK' }), T(0.90), TT(1.00, { spring: true }), F({ pad: true }), F({ zone: 'LOOP' }), R(0.50),
      H(1.00, { zone: 'HILL COUNTRY' }), DR(0.90), H(1.10), F({ life: true }),
      RM(1.00, { cannon: true, zone: 'CANNON RIDGE' }), F(), R(0.50),
      W(1.00, { zone: 'WHOOPS' }), S(1.00), V(1.00), TT(1.10), F({ life: true }),
      RM(1.10, { zone: 'BIG AIR' }), F({ pad: true }), J(1.10, { spring: true }), R(0.50, { gate: true }), F({ pad: true, zone: 'FINAL SPRINT' }), DR(0.80), R(0.50), F({ pad: true }), R(0.50, { gate: true }), F({ pad: true }), F(),
    ],
    tunnels: [{ x0: 174, x1: 208, depth: 4.5, a: 182, b: 199, ex: 12 }],   // underpass under the k4 flat
    loops:   [{ x: 483, r: 4.2, minSpeed: 12 }],                            // loop on the k11 flat
    perches: [{ x0: 738.5, x1: 750.5, h: 8.8 }],
    cannons: [{ x: 744.5, angle: 0.72, power: 24, perch: 0 }],              // cannon on the k17 ramp
    style: ST({ texAmp: 0.25, texFreq: 0.10, driftAmp: 1.2, rollFreq: 0.20 }),
    biome: {
      skyTop: [[72, 146, 222], [70, 76, 152]], skyMid: [[150, 205, 245], [246, 158, 110]], skyBot: [[214, 238, 255], [255, 206, 142]],
      sun: [[255, 244, 200], [255, 168, 84]],
      ridgeFarT: [[170, 198, 228], [196, 158, 186]], ridgeFarB: [[136, 168, 204], [150, 120, 158]],
      ridgeNrT: [[120, 156, 198], [156, 116, 148]], ridgeNrB: [[92, 126, 168], [112, 84, 118]],
      hills: [[104, 158, 116], [134, 128, 104]], pines: [[52, 96, 74], [70, 84, 76]],
      dirtTop: [[138, 95, 52], [128, 84, 56]], dirtMid: '#6b4a2a', dirtDark: '#33220f',
      grassDark: '#39722e', grassMid: '#5fae3a', grassHi: [[158, 227, 107], [222, 196, 92]],
      tuft: 'rgba(110,196,74,.85)', scenery: 'forest', bg: 'hills',
    },
  },

  // ── 2 · DESERT DUNES — "Dune Sea" (flowing dunes + DOUBLE LOOP) ────────────
  // A:rolling dunes · B:oasis+sand cave · C:big dune jumps · D:TWIN LOOPS ·
  // E:valley swoops · F:final dunes.
  {
    id: 'desert-dunes', name: 'DESERT DUNES', seed: 4202, tunnelStyle: 'sand',
    design: [
      I(), F(),
      H(0.70, { zone: 'DUNE SEA' }), R(0.50), V(0.80), H(0.90, { spring: true }),
      F({ pad: true, zone: 'OASIS' }), F({ zone: 'SAND CAVE' }), SD(0.80), H(1.00, { spring: true }),
      V(1.00, { zone: 'BIG DUNES' }), H(1.10), TT(0.90), F({ life: true }),
      F({ zone: 'TWIN LOOPS' }), F(), R(0.60),
      V(1.00, { zone: 'VALLEY SWOOPS' }), H(1.00, { spring: true }), DR(0.90), F({ pad: true }), V(0.90), H(1.00),
      F({ life: true, zone: 'FINAL DUNES' }), J(0.90), V(0.90), TT(0.90), F({ pad: true }), R(0.50, { gate: true }), H(0.80), V(0.80), H(0.80), F({ pad: true }), R(0.50), F(), F(),
    ],
    tunnels: [{ x0: 300, x1: 334, depth: 4.5, a: 308, b: 325, ex: 12 }],   // sand cave under the k7 flat
    loops:   [{ x: 609, r: 4.2, minSpeed: 12 }, { x: 651, r: 4.2, minSpeed: 12 }],
    perches: [], cannons: [],
    style: ST({ driftAmp: 3.0, driftFreq: 0.009, texAmp: 0.50, texFreq: 0.07, rollFreq: 0.10, valley: 'round' }),
    biome: {
      skyTop: [[96, 160, 215], [150, 90, 130]], skyMid: [[190, 215, 240], [255, 150, 90]], skyBot: [[245, 235, 210], [255, 195, 120]],
      sun: [[255, 250, 220], [255, 150, 70]],
      ridgeFarT: [[226, 196, 156], [230, 160, 140]], ridgeFarB: [[196, 160, 118], [180, 120, 110]],
      ridgeNrT: [[208, 168, 120], [200, 130, 110]], ridgeNrB: [[170, 130, 88], [150, 96, 86]],
      hills: [[212, 178, 122], [200, 150, 100]], pines: [[150, 122, 80], [130, 100, 76]],
      dirtTop: [[214, 174, 110], [206, 156, 104]], dirtMid: '#b08a52', dirtDark: '#6b4f28',
      grassDark: '#b89a58', grassMid: '#d8b878', grassHi: [[244, 222, 160], [255, 210, 130]],
      tuft: 'rgba(196,168,98,.85)', scenery: 'desert', bg: 'dunes',
    },
  },

  // ── 3 · SNOWY PEAKS — "Ski Resort" (ice + ski jumps) ──────────────────────
  // ICE physics (slip + glide). A:bunny slope · B:glacier steps+kicker ·
  // C:ice cave · D:summit kickers+cannon · E:cornice · F:downhill finish.
  {
    id: 'snowy-peaks', name: 'SNOWY PEAKS', seed: 7311, tunnelStyle: 'ice',
    gripScale: 0.6, dragScale: 0.65,
    design: [
      I(), F(),
      J(0.60, { zone: 'BUNNY SLOPE' }), F({ pad: true }), T(0.80), DR(0.80),
      S(0.90, { zone: 'GLACIER STEPS' }), K(0.90), F({ life: true }),
      F({ zone: 'ICE CAVE' }), W(0.90), F({ pad: true }),
      K(1.10, { zone: 'SUMMIT KICKERS' }), TT(1.00), F(), K(1.20), F(), RM(1.20, { cannon: true }), F(),
      DR(1.00, { zone: 'CORNICE' }), K(1.20, { spring: true }), F({ life: true }), TT(1.10), S(1.00),
      T(1.00, { zone: 'DOWNHILL' }), K(1.00), F({ pad: true }), J(0.90), DR(0.80), K(0.90), F({ pad: true }), J(0.80), R(0.50), F({ pad: true }), F(), F(),
    ],
    tunnels: [{ x0: 384, x1: 458, depth: 6.0, a: 392, b: 449, ex: 16 }],   // ice cave under k9 flat + k10 whoops
    loops:   [],
    perches: [{ x0: 738.5, x1: 750.5, h: 8.8 }],
    cannons: [{ x: 744.5, angle: 0.72, power: 24, perch: 0 }],              // cannon on the k17 ramp
    style: ST({ driftAmp: 2.0, driftFreq: 0.013, texAmp: 0.06, texFreq: 0.12, rollFreq: 0.16 }),
    biome: {
      skyTop: [[110, 150, 205], [86, 96, 160]], skyMid: [[180, 210, 240], [220, 170, 170]], skyBot: [[235, 244, 252], [255, 222, 200]],
      sun: [[255, 252, 235], [255, 200, 140]],
      ridgeFarT: [[236, 244, 252], [240, 220, 230]], ridgeFarB: [[190, 208, 228], [196, 170, 190]],
      ridgeNrT: [[214, 228, 244], [216, 186, 200]], ridgeNrB: [[160, 182, 210], [160, 136, 160]],
      hills: [[208, 222, 234], [206, 192, 196]], pines: [[64, 96, 92], [70, 88, 86]],
      dirtTop: [[228, 236, 246], [224, 220, 228]], dirtMid: '#9fb4c8', dirtDark: '#5a6c80',
      grassDark: '#c8d8e8', grassMid: '#eef6fc', grassHi: [[255, 255, 255], [255, 240, 230]],
      tuft: 'rgba(220,236,250,.9)', scenery: 'snow', bg: 'peaks',
    },
  },

  // ── 4 · CANYON — "Gorge Run" (mesas + chasms + caves) ─────────────────────
  // A:mesa tops · B:cave network (2 caves) · C:river gorge (chasms) ·
  // D:eagle cannon · E:rim run · F:canyon sprint.
  {
    id: 'canyon', name: 'CITY CANYON', seed: 8181, tunnelStyle: 'rock',
    design: [
      I(), F(),
      T(0.90, { zone: 'MESA TOPS' }), R(0.50), TT(0.90), F({ pad: true }),
      F({ zone: 'CAVE NETWORK' }), R(0.50), F(), SD(0.90),
      CH(1.00, { zone: 'RIVER GORGE' }), F({ life: true }), CH(1.10), F({ pad: true }), T(1.10),
      R(0.50), RM(1.00, { cannon: true, zone: 'EAGLE JUMP' }), F(), CH(1.10),
      SD(0.90, { zone: 'RIM RUN' }), F({ pad: true }), T(1.10), J(0.90), CH(1.00), F({ life: true }),
      TT(1.00, { zone: 'CANYON SPRINT' }), R(0.50, { gate: true }), CH(0.90), F({ pad: true }), T(0.90), R(0.50), J(0.80), F({ pad: true }), R(0.50, { gate: true }), F({ pad: true }), F(),
    ],
    tunnels: [
      { x0: 258, x1: 292, depth: 4.5, a: 266, b: 283, ex: 12 },   // cave 1 (k6 flat)
      { x0: 342, x1: 376, depth: 4.5, a: 350, b: 367, ex: 12 },   // cave 2 (k8 flat)
    ],
    loops:   [],
    perches: [{ x0: 696.5, x1: 708.5, h: 8.8 }],
    cannons: [{ x: 702.5, angle: 0.72, power: 24, perch: 0 }],              // eagle cannon on the k16 ramp
    style: ST({ driftAmp: 1.0, driftFreq: 0.012, texAmp: 0.35, texFreq: 0.14, texJag: 1, rollFreq: 0.20 }),
    biome: {
      skyTop: [[120, 160, 200], [110, 86, 130]], skyMid: [[210, 190, 170], [240, 140, 100]], skyBot: [[244, 216, 180], [255, 180, 110]],
      sun: [[255, 248, 220], [255, 150, 80]],
      ridgeFarT: [[214, 150, 110], [210, 130, 110]], ridgeFarB: [[176, 110, 80], [170, 96, 84]],
      ridgeNrT: [[196, 126, 88], [190, 108, 88]], ridgeNrB: [[150, 90, 62], [144, 78, 64]],
      hills: [[200, 140, 96], [190, 120, 86]], pines: [[120, 86, 60], [110, 76, 58]],
      dirtTop: [[198, 124, 76], [188, 110, 74]], dirtMid: '#9a5c34', dirtDark: '#532f1c',
      grassDark: '#a86838', grassMid: '#d89050', grassHi: [[255, 200, 140], [255, 180, 110]],
      tuft: 'rgba(216,144,80,.8)', scenery: 'desert', bg: 'city',
    },
  },

  // ── 5 · MOONLIGHT — "Low-G Voyage" (floaty mega air) ──────────────────────
  // LOW GRAVITY (0.62) + dusty grip. A:crater field · B:comet cannon ·
  // C:mega kickers · D:dark-side cave · E:crater loop · F:apollo sprint.
  {
    id: 'moonlight', name: 'MOONLIGHT', seed: 1969, tunnelStyle: 'tech', gravityScale: 0.62, gripScale: 0.85, dragScale: 0.9,
    design: [
      I(), F(),
      C(0.80, { zone: 'CRATER FIELD' }), R(0.50), TT(0.90), F({ pad: true }),
      RM(1.00, { cannon: true, zone: 'COMET CANNON' }), F(), C(0.90),
      K(1.20, { zone: 'LUNAR LEAPS' }), DR(1.00), K(1.30), F({ life: true }),
      F({ zone: 'DARK SIDE' }), W(0.90), C(1.00), K(1.20),
      R(0.50), F({ zone: 'CRATER LOOP' }), C(1.00), TT(1.00), F({ life: true }),
      C(0.90, { zone: 'APOLLO SPRINT' }), K(1.10), F({ pad: true }), DR(0.90), K(1.00), R(0.50), C(0.80), F({ pad: true }), K(0.90), R(0.50), F({ pad: true }), R(0.50), F(), F(),
    ],
    tunnels: [{ x0: 552, x1: 626, depth: 6.0, a: 560, b: 617, ex: 16 }],   // dark-side bore under k13 flat + k14 whoops
    loops:   [{ x: 777, r: 4.2, minSpeed: 12 }],                            // crater loop on the k18 flat
    perches: [{ x0: 276.5, x1: 288.5, h: 8.8 }],
    cannons: [{ x: 282.5, angle: 0.72, power: 24, perch: 0 }],              // comet cannon on the k6 ramp
    style: ST({ driftAmp: 1.0, driftFreq: 0.011, texAmp: 0.40, texFreq: 0.13, texJag: 0.3, rollFreq: 0.18, valley: 'flatV' }),
    biome: {
      skyTop: [[10, 12, 28], [6, 8, 20]], skyMid: [[28, 32, 58], [36, 30, 60]], skyBot: [[54, 60, 92], [70, 56, 92]],
      sun: [[235, 240, 255], [220, 225, 250]],
      ridgeFarT: [[86, 92, 116], [92, 88, 118]], ridgeFarB: [[58, 62, 84], [62, 58, 84]],
      ridgeNrT: [[70, 76, 100], [76, 72, 100]], ridgeNrB: [[44, 48, 68], [48, 44, 68]],
      hills: [[70, 74, 92], [76, 70, 92]], pines: [[36, 40, 56], [40, 36, 54]],
      dirtTop: [[118, 120, 134], [112, 112, 128]], dirtMid: '#5e6070', dirtDark: '#262832',
      grassDark: '#6e7284', grassMid: '#9aa0b4', grassHi: [[200, 208, 230], [210, 200, 230]],
      tuft: 'rgba(160,168,190,.7)', scenery: 'moon', bg: 'moon',
    },
  },
];

/** Map of the week: epoch weeks aligned to Monday, cycling over the roster. */
export function weeklyMapIndex(now = Date.now()) {
  const week = Math.floor((now / 86400000 + 3) / 7);   // epoch day 0 was a Thursday
  return week % MAPS.length;
}
