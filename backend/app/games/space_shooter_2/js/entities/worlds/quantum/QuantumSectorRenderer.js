// ── Zone type config ──────────────────────────────────
// Centralized definition: add/remove/tweak zone types here only.
// weight = relative spawn chance, timerRange = [min, max] seconds.
const ZONE_TYPES = [
    { type: 'safe',       weight: 3, timerRange: [2, 3], intensity: 0.7  },
    { type: 'danger',     weight: 3, timerRange: [1.5, 2.5], intensity: 0.7  },
    { type: 'info',       weight: 2, timerRange: [2.5, 3.5], intensity: 0.6  },
   // { type: 'distortion', weight: 1, timerRange: [1.5, 3.0], intensity: 0.6  },
];

// Pre-compute weighted pool once
const _ZONE_POOL = [];
for (const z of ZONE_TYPES) for (let i = 0; i < z.weight; i++) _ZONE_POOL.push(z);

// ── Progression scaling (levels 91-120) ───────────────
// progression 0.0 (lvl 91) → 1.0 (lvl 120)
// Early levels: zones rarer & weaker. Late levels: frequent & strong.
const COOLDOWN_MULT_RANGE = [2.5, 0.7];   // early ×2.5 slower, late ×0.7 faster
const INTENSITY_MULT_RANGE = [0.5, 1];   // early 50%, late 100%
const TIMER_MULT_RANGE = [0.7, 1.2];       // early shorter zones, late longer

function _lerp(a, b, t) { return a + (b - a) * t; }

export class QuantumSectorRenderer {
    /**
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     * @param {'high'|'medium'|'low'} quality
     * @param {Array} activeZones  shared reference — sectors push zones here
     * @param {number} level  current game level (91-120)
     */
    constructor(canvasWidth, canvasHeight, quality, activeZones, level) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.quality = quality;
        this.activeZones = activeZones;

        // Progression: 0.0 at level 91, 1.0 at level 120
        this.level = level || 91;
        this.progression = Math.max(0, Math.min(1, (this.level - 91) / 29));
        this.cooldownMult = _lerp(COOLDOWN_MULT_RANGE[0], COOLDOWN_MULT_RANGE[1], this.progression);
        this.intensityMult = _lerp(INTENSITY_MULT_RANGE[0], INTENSITY_MULT_RANGE[1], this.progression);
        this.timerMult = _lerp(TIMER_MULT_RANGE[0], TIMER_MULT_RANGE[1], this.progression);
    }

    /** Build all sector structures. */
    build() { /* override */ }

    /** Per-frame animation / scrolling. */
    update(dt) { /* override */ }

    /** Render sector background (currently empty for all sectors). */
    renderBg(ctx) { /* override */ }

    resize(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }

    setQuality(quality) {
        this.quality = quality;
    }

    /**
     * Spawn a random zone at (x, y) with given radius.
     * Type, intensity, and timer are scaled by level progression.
     */
    spawnZone(x, y, radius) {
        const cfg = _ZONE_POOL[Math.floor(Math.random() * _ZONE_POOL.length)];
        const baseTimer = cfg.timerRange[0] + Math.random() * (cfg.timerRange[1] - cfg.timerRange[0]);
        // Add randomness that grows with progression (±30% at max)
        const jitter = 1 + (Math.random() - 0.5) * 0.6 * this.progression;
        this.activeZones.push({
            x, y, radius,
            type: cfg.type,
            intensity: cfg.intensity * this.intensityMult * jitter,
            timer: baseTimer * this.timerMult
        });
    }

    /** Generate a cooldown value scaled by progression. Base range [min, max]. */
    cooldown(min, max) {
        return (min + Math.random() * (max - min)) * this.cooldownMult;
    }

    /** Returns a random zone type string (legacy shortcut). */
    randomZoneType() {
        return _ZONE_POOL[Math.floor(Math.random() * _ZONE_POOL.length)].type;
    }
}
