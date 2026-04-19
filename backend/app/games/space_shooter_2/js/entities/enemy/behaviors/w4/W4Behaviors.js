import EnemyBehavior from '../EnemyBehavior.js';

const REFORM_DELAY = 3;
const REFORM_SPAWN_COUNT = 2;
const REFORM_OFFSET = 25;
const REFORM_PARTICLE_COUNT = 8;

const OSCILLATOR_INTERVAL_BASE = 1.8;
const OSCILLATOR_INTERVAL_RANDOM = 0.5;
const OSCILLATOR_FLAVORS = ['#aa88ff', '#88ddff', '#ffaa55'];

const FORCELINK_TICK = 0.5;
const FORCELINK_RANGE = 160;
const FORCELINK_MAX_LINKS = 2;
const FORCELINK_DAMAGE_MULT = 0.5;

const MASSFIELD_MAX_RADIUS = 120;
const MASSFIELD_GROW_RATE = 8;
const MASSFIELD_SLOW_FACTOR = 0.96;

const ANTIMATTER_REFORM_DELAY = 2;
const ANTIMATTER_PARTICLE_COUNT = 6;

// ════════════════════════════════════════════
//  TripletBehavior
// ════════════════════════════════════════════

/**
 * Three linked quarks. If one dies and others survive for
 * REFORM_DELAY seconds, the group reforms.
 */
class TripletBehavior extends EnemyBehavior {
    constructor() {
        super();
        this.linked = false;
        this.kin = null;
        this.reformTimer = undefined;
    }

    get isW4() { return true; }

    update(enemy, dt, game) {
        this._initKin(enemy, game);
        this._tickReform(enemy, dt, game);
    }

    onDeath(enemy, game) {
        if (!this.kin) return;
        for (const kin of this.kin) {
            if (!kin.active) continue;
            const kinBehavior = kin.getBehavior(TripletBehavior);
            if (kinBehavior && kinBehavior.reformTimer === undefined) {
                kinBehavior.reformTimer = REFORM_DELAY;
            }
        }
    }

    getSpriteState() {
        return { reformTimer: this.reformTimer || 0 };
    }

    render(ctx, enemy, cx, cy) {
        if (!this.kin) return;
        ctx.save();
        this._drawGluonLines(ctx, cx, cy);
        this._drawReformWarning(ctx, enemy, cx, cy);
        ctx.restore();
    }

    _initKin(enemy, game) {
        if (this.kin) return;
        const cx = enemy.position.x + enemy.width / 2;
        const cy = enemy.position.y + enemy.height / 2;
        const enemies = game.entityManager ? game.entityManager.enemies : [];
        const kin = enemies.filter(
            e => e !== enemy && e.active && e.config.w4behaviour === 'triplet'
        );
        kin.sort((a, b) => {
            const da = Math.hypot(a.position.x - cx, a.position.y - cy);
            const db = Math.hypot(b.position.x - cx, b.position.y - cy);
            return da - db;
        });
        this.kin = kin.slice(0, 2);
        this.linked = this.kin.length > 0;
    }

    _tickReform(enemy, dt, game) {
        if (this.reformTimer === undefined || this.reformTimer <= 0) return;
        this.reformTimer -= dt;
        if (this.reformTimer > 0) return;

        const cx = enemy.position.x + enemy.width / 2;
        const cy = enemy.position.y + enemy.height / 2;

        for (let i = 0; i < REFORM_SPAWN_COUNT; i++) {
            const sx = cx + (i === 0 ? -REFORM_OFFSET : REFORM_OFFSET);
            const reformed = enemy.spawnEnemy(
                sx, cy - 20, 'quark_triplet', 'orbital', game
            );
            if (reformed) {
                const tripBehavior = reformed.getBehavior(TripletBehavior);
                if (tripBehavior) tripBehavior.kin = null;
            }
        }
        this.reformTimer = undefined;
        game.particles.emit(cx, cy, 'hit', REFORM_PARTICLE_COUNT);
    }

    _drawGluonLines(ctx, cx, cy) {
        const colors = ['#ff3355', '#33ff77', '#3366ff'];
        for (let i = 0; i < this.kin.length; i++) {
            const kin = this.kin[i];
            if (!kin.active) continue;
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = colors[i % 3];
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            const kx = kin.position.x + kin.width / 2;
            const ky = kin.position.y + kin.height / 2;
            this._drawWavyLine(ctx, cx, cy, kx, ky);
            ctx.stroke();
        }
    }

    _drawWavyLine(ctx, x1, y1, x2, y2) {
        const segs = 8;
        for (let s = 0; s <= segs; s++) {
            const t = s / segs;
            const mx = x1 + (x2 - x1) * t;
            const my = y1 + (y2 - y1) * t;
            const perp = Math.sin(t * Math.PI * 3 + Date.now() * 0.005) * 5;
            const ndx = y2 - y1;
            const ndy = -(x2 - x1);
            const nLen = Math.hypot(ndx, ndy) || 1;
            const px = mx + (ndx / nLen) * perp;
            const py = my + (ndy / nLen) * perp;
            s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
    }

    _drawReformWarning(ctx, enemy, cx, cy) {
        if (this.reformTimer === undefined) return;
        ctx.globalAlpha = 0.3 + 0.2 * Math.sin(Date.now() * 0.015);
        ctx.fillStyle = '#ff3355';
        ctx.beginPath();
        ctx.arc(cx, cy, enemy.width * 0.7, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ════════════════════════════════════════════
//  OscillatorBehavior
// ════════════════════════════════════════════

/**
 * Oscillates between 3 "flavors"; only vulnerable in flavor 0.
 */
class OscillatorBehavior extends EnemyBehavior {
    constructor() {
        super();
        this.flavorIdx = 0;
        this.flavorTimer = 2;
    }

    get isW4() { return true; }

    update(enemy, dt) {
        this.flavorTimer -= dt;
        if (this.flavorTimer <= 0) {
            this.flavorTimer = OSCILLATOR_INTERVAL_BASE + Math.random() * OSCILLATOR_INTERVAL_RANDOM;
            this.flavorIdx = (this.flavorIdx + 1) % 3;
        }
        enemy._invulnerable = this.flavorIdx !== 0;
        enemy.config.color = OSCILLATOR_FLAVORS[this.flavorIdx];
        enemy.alpha = this.flavorIdx === 0 ? 1 : 0.35;
    }

    getSpriteState() {
        return { flavorIdx: this.flavorIdx };
    }

    render(ctx, enemy, cx, cy) {
        ctx.save();
        this._drawFlavorDots(ctx, cx, cy, enemy.width);
        this._drawVulnerableFlash(ctx, cx, cy, enemy.width);
        ctx.restore();
    }

    _drawFlavorDots(ctx, cx, cy, w) {
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 / 3) * i - Math.PI / 2;
            const dx = Math.cos(angle) * (w * 0.45);
            const dy = Math.sin(angle) * (w * 0.45);
            ctx.globalAlpha = i === this.flavorIdx ? 0.8 : 0.15;
            ctx.fillStyle = OSCILLATOR_FLAVORS[i];
            ctx.beginPath();
            ctx.arc(cx + dx, cy + dy, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawVulnerableFlash(ctx, cx, cy, w) {
        if (this.flavorIdx !== 0) return;
        ctx.globalAlpha = 0.15 + 0.1 * Math.sin(Date.now() * 0.01);
        ctx.strokeStyle = '#aa88ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, w * 0.55, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// ════════════════════════════════════════════
//  ForcelinkBehavior
// ════════════════════════════════════════════

/**
 * Links to up to 2 nearby enemies, granting them damage reduction
 * while the link is active. Sets `_forceBoosted` on linked enemies.
 */
class ForcelinkBehavior extends EnemyBehavior {
    constructor() {
        super();
        this.timer = 0;
        this.forceLinked = [];
    }

    get isW4() { return true; }

    update(enemy, dt, game) {
        this.timer -= dt;
        if (this.timer > 0) return;
        this.timer = FORCELINK_TICK;

        const cx = enemy.position.x + enemy.width / 2;
        const cy = enemy.position.y + enemy.height / 2;
        const enemies = game.entityManager ? game.entityManager.enemies : [];

        this.forceLinked = [];
        const nearby = enemies.filter(
            e => e !== enemy && e.active && !e._isAlly
        );
        nearby.sort((a, b) => {
            const da = Math.hypot(a.position.x - cx, a.position.y - cy);
            const db = Math.hypot(b.position.x - cx, b.position.y - cy);
            return da - db;
        });

        const limit = Math.min(FORCELINK_MAX_LINKS, nearby.length);
        for (let i = 0; i < limit; i++) {
            const dist = Math.hypot(
                nearby[i].position.x - cx, nearby[i].position.y - cy
            );
            if (dist < FORCELINK_RANGE) {
                nearby[i]._forceBoosted = true;
                this.forceLinked.push(nearby[i]);
            }
        }
    }

    getSpriteState(enemy) {
        return { forceBoosted: !!enemy._forceBoostedVisual };
    }

    render(ctx, enemy, cx, cy) {
        if (!this.forceLinked.length) return;
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = '#ffee33';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);

        for (const linked of this.forceLinked) {
            if (!linked.active) continue;
            const lx = linked.position.x + linked.width / 2;
            const ly = linked.position.y + linked.height / 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(lx, ly);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // Boson glow
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = '#ffee33';
        ctx.beginPath();
        ctx.arc(cx, cy, enemy.width * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ════════════════════════════════════════════
//  MassfieldBehavior
// ════════════════════════════════════════════

/**
 * Expanding golden field that slows player bullets passing through it.
 */
class MassfieldBehavior extends EnemyBehavior {
    constructor() {
        super();
        this.fieldRadius = 30;
    }

    get isW4() { return true; }

    update(enemy, dt, game) {
        this.fieldRadius = Math.min(
            MASSFIELD_MAX_RADIUS,
            this.fieldRadius + MASSFIELD_GROW_RATE * (game.timeScale || 1)
        );
        this._slowBullets(enemy, game);
    }

    getSpriteState() {
        return { fieldRadius: this.fieldRadius };
    }

    render(ctx, enemy, cx, cy) {
        if (!this.fieldRadius) return;
        ctx.save();
        this._drawFieldGradient(ctx, cx, cy);
        this._drawConcentricRings(ctx, cx, cy);
        ctx.restore();
    }

    _slowBullets(enemy, game) {
        if (!game.entityManager) return;
        const cx = enemy.position.x + enemy.width / 2;
        const cy = enemy.position.y + enemy.height / 2;

        for (const b of game.entityManager.bullets) {
            if (!b.active || b.tag !== 'player') continue;
            const bx = b.position.x + b.width / 2;
            const by = b.position.y + b.height / 2;
            if (Math.hypot(bx - cx, by - cy) < this.fieldRadius) {
                b.velocity.y *= MASSFIELD_SLOW_FACTOR;
            }
        }
    }

    _drawFieldGradient(ctx, cx, cy) {
        ctx.globalAlpha = 0.08 + 0.04 * Math.sin(Date.now() * 0.004);
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.fieldRadius);
        grad.addColorStop(0, '#ffd700');
        grad.addColorStop(0.7, 'rgba(255,215,0,0.05)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, this.fieldRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawConcentricRings(ctx, cx, cy) {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.12;
        for (let r = 30; r < this.fieldRadius; r += 25) {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

// ════════════════════════════════════════════
//  AntimatterBehavior
// ════════════════════════════════════════════

/**
 * Paired antimatter twin. When one dies, the surviving twin
 * spawns a replacement after a delay.
 */
class AntimatterBehavior extends EnemyBehavior {
    constructor() {
        super();
        this.annihilateTimer = undefined;
    }

    get isW4() { return true; }

    update(enemy, dt, game) {
        if (this.annihilateTimer === undefined || this.annihilateTimer <= 0) return;
        this.annihilateTimer -= dt;
        if (this.annihilateTimer > 0) return;

        const cx = enemy.position.x + enemy.width / 2;
        const cy = enemy.position.y + enemy.height / 2;
        const sx = enemy.canvasWidth - cx;

        enemy.spawnEnemy(sx, cy, 'positron_mirror', 'superposition', game);
        this.annihilateTimer = undefined;
        game.particles.emit(sx, cy, 'hit', ANTIMATTER_PARTICLE_COUNT);
    }

    onDeath(enemy, game) {
        if (!game.entityManager) return;
        const enemies = game.entityManager.enemies;
        const twins = enemies.filter(
            e => e !== enemy && e.active && e.config.w4behaviour === 'antimatter'
        );
        for (const twin of twins) {
            const ab = twin.getBehavior(AntimatterBehavior);
            if (ab && ab.annihilateTimer === undefined) {
                ab.annihilateTimer = ANTIMATTER_REFORM_DELAY;
            }
        }
    }

    getSpriteState() {
        return { annihilateTimer: this.annihilateTimer || 0 };
    }

    render(ctx, enemy, cx, cy) {
        if (this.annihilateTimer === undefined) return;
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = '#ff4488';
        ctx.lineWidth = 2;
        const remaining = this.annihilateTimer / ANTIMATTER_REFORM_DELAY;
        ctx.beginPath();
        ctx.arc(cx, cy, enemy.width * 0.6,
            -Math.PI / 2,
            -Math.PI / 2 + remaining * Math.PI * 2
        );
        ctx.stroke();
        ctx.restore();
    }
}

// ════════════════════════════════════════════
//  ChainBehavior
// ════════════════════════════════════════════

/**
 * Gluon chain segments: only endpoints take damage,
 * middle links are invulnerable.
 */
class ChainBehavior extends EnemyBehavior {
    constructor() {
        super();
        this.chainInit = false;
        this.isEndpoint = true;
    }

    get isW4() { return true; }

    update(enemy, dt, game) {
        if (this.chainInit) return;
        this.chainInit = true;

        const enemies = game.entityManager ? game.entityManager.enemies : [];
        const chains = enemies.filter(
            e => e.active && e.config.w4behaviour === 'chain'
        );
        chains.sort((a, b) => a.position.y - b.position.y);

        const idx = chains.indexOf(enemy);
        this.isEndpoint = (idx === 0 || idx === chains.length - 1 || chains.length <= 2);
        enemy._invulnerable = !this.isEndpoint;
    }

    onDeath(enemy, game) {
        if (!game.entityManager) return;
        const chains = game.entityManager.enemies.filter(
            e => e !== enemy && e.active && e.config.w4behaviour === 'chain'
        );
        for (const c of chains) {
            const cb = c.getBehavior(ChainBehavior);
            if (cb) cb.chainInit = false;
        }
    }

    getSpriteState() {
        return { isEndpoint: this.isEndpoint };
    }

    render(ctx, enemy, cx, cy) {
        if (this.isEndpoint) return;
        ctx.save();
        ctx.globalAlpha = 0.2 + 0.1 * Math.sin(Date.now() * 0.006);
        ctx.strokeStyle = '#33ff77';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, enemy.width * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

export {
    TripletBehavior,
    OscillatorBehavior,
    ForcelinkBehavior,
    MassfieldBehavior,
    AntimatterBehavior,
    ChainBehavior
};
