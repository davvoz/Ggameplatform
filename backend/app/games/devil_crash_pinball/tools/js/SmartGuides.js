import { EntityDefs, ENTITY_TYPE_ORDER } from './EntityDefs.js';

/** Auto-snap threshold (px): closer than this → coordinates are locked to the guide. */
const SNAP_DIST = 6;

/** Show-guide threshold (px): closer than this → guide line is drawn. */
const GUIDE_DIST = 14;

/** Horizontal centre of the standard 480 px board. */
export const SYMMETRY_X = 240;

/**
 * Collect snap reference points (centres + endpoints) from every entity in
 * the current level config, optionally skipping one entity (the one being
 * dragged, to avoid snapping to yourself).
 *
 * @param {object}  cfg            Level config object
 * @param {string}  excludeType    Entity type name to exclude (or null)
 * @param {number}  excludeIndex   Entity index to exclude (or -1)
 * @returns {{ x: number, y: number }[]}
 */
export function collectRefPoints(cfg, excludeType = null, excludeIndex = -1) {
    const pts = [];
    for (const typeName of ENTITY_TYPE_ORDER) {
        const def = EntityDefs[typeName];
        const arr = cfg[def.key];
        if (!Array.isArray(arr)) continue;
        arr.forEach((entity, i) => {
            if (typeName === excludeType && i === excludeIndex) return;
            // Centre of the entity
            const c = def.getCenter?.(entity);
            if (c) pts.push({ x: c.x, y: c.y });
            // Both endpoints for line entities
            if (def.isLine) {
                pts.push(
                    { x: entity.ax, y: entity.ay },
                    { x: entity.bx, y: entity.by }
                );
            }
        });
    }
    return pts;
}

/**
 * Compute the best-snapped position and active guide lines for a point being
 * dragged to (rawX, rawY).
 *
 * Alignment guides (horizontal / vertical) fire when the drag point is within
 * GUIDE_DIST pixels of any reference point on the same axis.  The closest one
 * within SNAP_DIST is used to snap the coordinate exactly.
 *
 * When symmetryOn is true, the vertical axis at SYMMETRY_X is also shown and
 * the drag point will snap to it.
 *
 * The function always produces a final (x, y) that has been grid-snapped as a
 * fallback, so callers can call the Raw move methods unconditionally.
 *
 * @param {number}             rawX        Raw (unsnapped) cursor X
 * @param {number}             rawY        Raw (unsnapped) cursor Y
 * @param {{ x, y }[]}         refPoints   From collectRefPoints()
 * @param {number}             gridSnap    Grid size in px (1 = no grid snap)
 * @param {boolean}            symmetryOn  Whether the vertical axis guide is active
 * @returns {{
 *   x: number,
 *   y: number,
 *   guides: Array<{type:'h',y:number}|{type:'v',x:number}|{type:'axis',x:number}>,
 *   mirrorX: number | null
 * }}
 */
export function computeGuides(rawX, rawY, refPoints, gridSnap, symmetryOn) {
    const guides = [];
    const snapX  = _scanAxis(rawX, refPoints.map(p => p.x), 'v', 'x', guides);
    const snapY  = _scanAxis(rawY, refPoints.map(p => p.y), 'h', 'y', guides);
    const mirrorX = symmetryOn ? _applySymmetryAxis(rawX, guides, snapX) : null;
    return {
        x:       _resolveCoord(rawX, snapX, gridSnap),
        y:       _resolveCoord(rawY, snapY, gridSnap),
        guides,
        mirrorX,
    };
}

// ─── Private helpers ───────────────────────────────────────────────────────────

/** Add a guide only if an equivalent entry doesn't already exist. */
function _addGuide(guides, type, key, value) {
    if (!guides.some(g => g.type === type && g[key] === value))
        guides.push({ type, [key]: value });
}

/**
 * Scan reference values on one axis, populate guides, and return the best snap.
 * @returns {{ snap: number|null, best: number }}
 */
function _scanAxis(raw, values, guideType, guideKey, guides) {
    let snap = null, best = Infinity;
    for (const v of values) {
        const d = Math.abs(v - raw);
        if (d < GUIDE_DIST) {
            if (d < best) { best = d; snap = v; }
            _addGuide(guides, guideType, guideKey, v);
        }
    }
    return { snap, best };
}

/** Insert the symmetry axis guide and, if close enough, tighten snapX. */
function _applySymmetryAxis(rawX, guides, snapX) {
    _addGuide(guides, 'axis', 'x', SYMMETRY_X);
    const d = Math.abs(rawX - SYMMETRY_X);
    if (d < GUIDE_DIST && d < snapX.best) { snapX.best = d; snapX.snap = SYMMETRY_X; }
    return 2 * SYMMETRY_X - rawX;
}

/** Resolve final coordinate: guide snap → grid snap → integer round. */
function _resolveCoord(raw, { snap, best }, gridSnap) {
    if (snap !== null && best <= SNAP_DIST) return snap;
    return gridSnap > 1 ? Math.round(raw / gridSnap) * gridSnap : Math.round(raw);
}
