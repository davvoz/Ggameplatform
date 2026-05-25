// ─── Color constants ─────────────────────────────────────────────────────────
const MANA_MAIN  = '#aa44ff';
const MANA_GLOW  = '#dd44ff';
const MANA_HALO  = '#cc88ff';
const MANA_PULSE = '#cc44ff';

const REPAIR_MAIN  = '#44ffaa';
const REPAIR_GLOW  = '#00ff88';
const REPAIR_CORE  = '#ccffee';

// ─── Drawer functions (pure canvas, no external state) ───────────────────────

function drawManaOrb(ctx, it) {
    const t     = it.life / it.maxLife;
    const alpha = Math.max(0, 1 - t * 1.3);
    if (alpha < 0.02) return;
    const cx = it.x + (it.vx ?? 0) * it.life;
    const cy = it.y + (it.vy ?? 0) * it.life;
    const r  = 7.5 - t * 2.5;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = MANA_GLOW;
    ctx.shadowBlur  = 26;
    ctx.fillStyle   = MANA_MAIN;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur  = 12;
    ctx.fillStyle   = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.38, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur  = 0;
    ctx.globalAlpha = alpha * 0.35;
    ctx.strokeStyle = MANA_HALO;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.75, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function drawManaPulse(ctx, it) {
    const t     = it.life / it.maxLife;
    const alpha = Math.max(0, 1 - t * 1.6) * 0.85;
    if (alpha < 0.02) return;
    const r = 10 + t * 30;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = MANA_PULSE;
    ctx.shadowBlur  = 24;
    ctx.strokeStyle = MANA_PULSE;
    ctx.lineWidth   = Math.max(0.5, 4.5 - t * 3.5);
    ctx.beginPath();
    ctx.arc(it.x, it.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.1;
    ctx.fillStyle   = MANA_MAIN;
    ctx.fill();
    ctx.restore();
}

function drawRepairSpark(ctx, it) {
    const t     = it.life / it.maxLife;
    const alpha = Math.max(0, 1 - t * 1.35);
    if (alpha < 0.02) return;
    const cx = it.x + (it.vx ?? 0) * it.life;
    const cy = it.y + (it.vy ?? 0) * it.life;
    const sz = 9.5 - t * 3.5;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = REPAIR_GLOW;
    ctx.shadowBlur  = 24;
    ctx.strokeStyle = REPAIR_MAIN;
    ctx.lineWidth   = Math.max(0.5, 4 - t);
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy - sz);
    ctx.lineTo(cx, cy + sz);
    ctx.moveTo(cx - sz, cy);
    ctx.lineTo(cx + sz, cy);
    ctx.stroke();

    ctx.shadowBlur = 14;
    ctx.fillStyle  = REPAIR_CORE;
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawRepairPulse(ctx, it) {
    const t     = it.life / it.maxLife;
    const alpha = Math.max(0, 1 - t * 1.7) * 0.8;
    if (alpha < 0.02) return;
    const r = 16 + t * 38;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = REPAIR_GLOW;
    ctx.shadowBlur  = 30;
    ctx.strokeStyle = REPAIR_MAIN;
    ctx.lineWidth   = Math.max(0.5, 5.5 - t * 4);
    ctx.beginPath();
    ctx.arc(it.x, it.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.08;
    ctx.fillStyle   = REPAIR_MAIN;
    ctx.fill();
    ctx.restore();
}

// ─── Tower-destruction VFX ──────────────────────────────────────────────────────

function drawTowerFlash(ctx, it) {
    const t     = it.life / it.maxLife;
    const alpha = Math.max(0, 1 - t * 2.5);
    if (alpha < 0.02) return;
    const r = 10 + t * 55;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = '#ffcc44';
    ctx.shadowBlur  = 35;
    ctx.fillStyle   = t < 0.15 ? '#ffffff' : '#ffcc44';
    ctx.beginPath();
    ctx.arc(it.x, it.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawTowerRing(ctx, it) {
    const t     = it.life / it.maxLife;
    const alpha = Math.max(0, 1 - t * 1.1) * 0.85;
    if (alpha < 0.02) return;
    const maxR = it.maxRadius ?? 70;
    const r    = 8 + t * maxR;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = '#ff8800';
    ctx.shadowBlur  = 18;
    ctx.strokeStyle = t < 0.25 ? '#ffff88' : '#ff8800';
    ctx.lineWidth   = Math.max(0.5, 5.5 - t * 4.5);
    ctx.beginPath();
    ctx.arc(it.x, it.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function drawTowerEmber(ctx, it) {
    const t     = it.life / it.maxLife;
    const alpha = Math.max(0, 1 - t * 1.4);
    if (alpha < 0.02) return;
    const g  = it.gravity ?? 80;
    const cx = it.x + (it.vx ?? 0) * it.life;
    const cy = it.y + (it.vy ?? 0) * it.life + 0.5 * g * it.life * it.life;
    const r  = Math.max(1, 4.5 - t * 3.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur  = 10;
    ctx.fillStyle   = t < 0.35 ? '#ffee44' : '#ff6600';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawTowerSmoke(ctx, it) {
    const t     = it.life / it.maxLife;
    const alpha = Math.max(0, 0.6 - t * 0.7);
    if (alpha < 0.02) return;
    const cx = it.x + (it.vx ?? 0) * it.life;
    const cy = it.y + (it.vy ?? 0) * it.life;
    const r  = 7 + t * 24;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = '#7a5c55';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// ─── Registry ─────────────────────────────────────────────────────────────────

/**
 * Dispatches VFX rendering via a type→function map.
 *
 * OCP : new VFX types register a drawer; no switch/if chains to modify.
 * SRP : knows only how to dispatch — draw logic lives in pure functions above.
 */
export class VfxDrawRegistry {

    constructor() {
        /** @type {Map<string, function(CanvasRenderingContext2D, object): void>} */
        this._drawers = new Map();
    }

    /**
     * Register a drawer for a given VFX type.
     * Returns `this` for fluent chaining.
     *
     * @param {string}   type   - VFX type string (e.g. 'mana_orb').
     * @param {function} drawFn - Function(ctx, item) that performs the draw.
     * @returns {VfxDrawRegistry}
     */
    register(type, drawFn) {
        this._drawers.set(type, drawFn);
        return this;
    }

    /**
     * Draw a single VFX item.  No-op for unregistered types.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} it - VFX item with at least {type, life, maxLife, x, y}.
     */
    draw(ctx, it) {
        const fn = this._drawers.get(it.type);
        if (fn) fn(ctx, it);
    }

    /**
     * Factory: creates a registry pre-loaded with all built-in support-VFX drawers.
     * Spell VFX must be registered by the BattleRenderer (it needs world/asset context).
     *
     * @returns {VfxDrawRegistry}
     */
    static createDefault() {
        return new VfxDrawRegistry()
            .register('mana_orb',     drawManaOrb)
            .register('mana_pulse',   drawManaPulse)
            .register('repair_spark', drawRepairSpark)
            .register('repair_pulse', drawRepairPulse)
            .register('tower_flash',  drawTowerFlash)
            .register('tower_ring',   drawTowerRing)
            .register('tower_ember',  drawTowerEmber)
            .register('tower_smoke',  drawTowerSmoke);
    }
}
