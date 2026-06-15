/**
 * CARS — the garage roster. Bought with PLATFORM coins (see Garage.js).
 *
 * RANKED-FAIR DESIGN: every car is a balanced SIDEGRADE, not an upgrade. The
 * four performance stats (accel · maxSpeed · grip · boost) are multipliers that
 * always sum to 4.0, so no car is strictly better — it's a strategic choice
 * (e.g. a top-speed car shines on fast flat maps but slips on ice). `mass` is
 * flavor (~1.0). Because the stats are pure deterministic data, the future
 * ranked replay validator can re-apply the exact same numbers from the carId.
 *
 *   stats.accel    → engine force (acceleration)
 *   stats.maxSpeed → top speed
 *   stats.grip     → traction / braking / chassis friction
 *   stats.boost    → boost thrust
 *   stats.mass     → chassis mass (stability vs flippability)
 *
 * Pure data + a tiny active-car state. No imports, no fetch (Garage handles I/O).
 */
export const CARS = [
  {
    id: 'rookie', name: 'Rookie', price: 0, color: '#e23a22',
    blurb: 'The all-rounder. Balanced everywhere — the stock dune buggy.',
    stats: { accel: 1.00, maxSpeed: 1.00, grip: 1.00, boost: 1.00, mass: 1.00 },
    body: { kind: 'buggy', len: 1.00, h: 1.00, wheel: 1.00 },
  },
  {
    id: 'comet', name: 'Comet', price: 150, color: '#2db8e8',
    blurb: 'Open-wheel rocket. Flies on fast flats — sluggish off the line.',
    stats: { accel: 0.85, maxSpeed: 1.25, grip: 0.90, boost: 1.00, mass: 1.00 },
    body: { kind: 'f1', len: 1.25, h: 0.72, wheel: 0.9 },
  },
  {
    id: 'bulldog', name: 'Bulldog', price: 150, color: '#7bdc4a',
    blurb: 'Monster truck. Grips and climbs anything — low top end.',
    stats: { accel: 1.05, maxSpeed: 0.85, grip: 1.20, boost: 0.90, mass: 1.10 },
    body: { kind: 'monster', len: 1.0, h: 1.15, wheel: 1.32 },
  },
  {
    id: 'jolt', name: 'Jolt', price: 300, color: '#ffd24a',
    blurb: 'A quad bike. Explosive, light & flippy. Lower top speed.',
    stats: { accel: 1.25, maxSpeed: 0.90, grip: 0.95, boost: 0.90, mass: 0.90 },
    body: { kind: 'bike', len: 0.92, h: 0.95, wheel: 1.12 },
  },
  {
    id: 'titan', name: 'Titan', price: 450, color: '#ff7a18',
    blurb: 'Hot-rod rig. Twin turbo stacks, huge nitro, heavy.',
    stats: { accel: 0.95, maxSpeed: 0.95, grip: 0.95, boost: 1.15, mass: 1.05 },
    body: { kind: 'truck', len: 1.12, h: 1.12, wheel: 1.18 },
  },
  {
    id: 'phantom', name: 'Phantom', price: 700, color: '#b06bff',
    blurb: 'Hover car from the future. Fast & punchy but skittish.',
    stats: { accel: 1.15, maxSpeed: 1.15, grip: 0.80, boost: 0.90, mass: 0.85 },
    body: { kind: 'hover', len: 1.18, h: 0.78, wheel: 0.74 },
  },
];

const DEFAULT_BODY = { kind: 'buggy', len: 1, h: 1, wheel: 1 };
export function carBody() { return { ...DEFAULT_BODY, ..._active.body }; }

export const CAR_BY_ID = Object.fromEntries(CARS.map((c) => [c.id, c]));

// ── active car (what the Vehicle/Renderer use; Garage sets it) ───────────────
let _active = CARS[0];

export function setActiveCar(id) {
  if (CAR_BY_ID[id]) _active = CAR_BY_ID[id];
  return _active;
}
export function activeCar() { return _active; }
export function carStats() { return _active.stats; }      // Vehicle reads this
export function carColor() { return _active.color; }       // Renderer reads this
