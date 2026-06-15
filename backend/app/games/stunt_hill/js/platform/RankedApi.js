/**
 * RankedApi — fetches the server-authoritative weekly map+seed.
 *
 *   GET /api/stunt-hill/week → { week_id, map_index, map_id, map_name, seed }
 *
 * Everyone competes on the same weekly track. The client plays exactly this
 * map+seed in RANKED; the score itself is submitted through the normal platform
 * session (gameOver), where the server validates plausibility + the weekly map
 * before it counts on the leaderboard. Fails soft (null) if the backend is down.
 */
const BASE = '/api/stunt-hill';

let _weekCache = null;
let _weekPromise = null;

/** The weekly map+seed (cached). Returns null if the backend is unreachable. */
export async function getWeek(force = false) {
  if (_weekCache && !force) return _weekCache;
  if (_weekPromise && !force) return _weekPromise;
  _weekPromise = fetch(`${BASE}/week`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .then((w) => { _weekCache = w; _weekPromise = null; return w; });
  return _weekPromise;
}
