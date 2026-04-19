import EnemyBehavior from '../EnemyBehavior.js';

const BEACON_RANGE_SQ = 14400;     // 120²
const BEACON_TICK = 0.5;
const BEACON_BOOST_DURATION = 1.5;

const SHIELDER_RANGE_SQ = 22500;   // 150²
const SHIELDER_DAMAGE_MULT = 0.4;
const SHIELDER_HEX_SIDES = 6;

const PHASER_MIN_INTERVAL = 2;
const PHASER_INTERVAL_RANDOM = 1;
const PHASER_VISIBLE_ALPHA = 1;
const PHASER_HIDDEN_ALPHA = 0.08;

const FRAGMENT_COUNT = 3;
const FRAGMENT_SHARD_SIZE = 12;
const FRAGMENT_SPEED_MULT = 1.8;
const FRAGMENT_PARTICLE_COUNT = 10;

// ════════════════════════════════════════════
//  BlinkerBehavior
// ════════════════════════════════════════════

/**
 * Shoots immediately after a blink-teleport (triggered by the
 * `glitch_blink` movement pattern, which sets `_justBlinked`).
 */
class BlinkerBehavior extends EnemyBehavior {
    update(enemy, dt, game) {
        if (enemy._justBlinked > 0 && enemy._justBlinked === 6) {
            if (enemy.config.shootRate > 0) enemy.shoot(game);
        }
    }

    render(ctx, enemy, cx, cy) {
        if (!enemy._justBlinked || enemy._justBlinked <= 0) return;
        ctx.save();
        ctx.globalAlpha = enemy._justBlinked / 8;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(cx, cy, enemy.width * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ════════════════════════════════════════════
//  PhaserBehavior
// ════════════════════════════════════════════

/**
 * Cycles between visible (vulnerable) and invisible (invulnerable).
 */
class PhaserBehavior extends EnemyBehavior {
    constructor() {
        super();
        this.timer = Math.random() * 2.5;
        this.visible = true;
    }

    update(enemy, dt) {
        this.timer -= dt;
        if (this.timer <= 0) {
            this.timer = PHASER_MIN_INTERVAL + Math.random() * PHASER_INTERVAL_RANDOM;
            this.visible = !this.visible;
        }
        enemy.alpha = this.visible ? PHASER_VISIBLE_ALPHA : PHASER_HIDDEN_ALPHA;
        enemy._invulnerable = !this.visible;
    }

    render(ctx, enemy, cx, cy) {
        if (this.visible) return;
        ctx.save();
        ctx.globalAlpha = 0.3 + 0.15 * Math.sin(Date.now() * 0.008);
        ctx.strokeStyle = '#ff44ff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, enemy.width * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

// ════════════════════════════════════════════
//  BeaconBehavior
// ════════════════════════════════════════════

/**
 * Boosts the speed of nearby enemies periodically.
 */
class BeaconBehavior extends EnemyBehavior {
    constructor() {
        super();
        this.timer = 0;
    }

    update(enemy, dt, game) {
        this.timer -= dt;
        if (this.timer > 0) return;
        this.timer = BEACON_TICK;

        const cx = enemy.position.x + enemy.width / 2;
        const cy = enemy.position.y + enemy.height / 2;
        const enemies = game.entityManager ? game.entityManager.enemies : [];

        for (const e of enemies) {
            if (e === enemy || !e.active) continue;
            const dx = (e.position.x + e.width / 2) - cx;
            const dy = (e.position.y + e.height / 2) - cy;
            if (dx * dx + dy * dy < BEACON_RANGE_SQ) {
                e._boosted = BEACON_BOOST_DURATION;
            }
        }
    }

    render(ctx, enemy, cx, cy) {
        ctx.save();
        const pulse = 0.12 + 0.08 * Math.sin(Date.now() * 0.005);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.arc(cx, cy, 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ════════════════════════════════════════════
//  ShielderBehavior
// ════════════════════════════════════════════

/**
 * Links a shield with the nearest shielder, reducing damage taken.
 */
class ShielderBehavior extends EnemyBehavior {
    constructor() {
        super();
        this.linked = false;
        this.partner = null;
    }

    update(enemy, dt, game) {
        this.linked = false;
        this.partner = null;

        const cx = enemy.position.x + enemy.width / 2;
        const cy = enemy.position.y + enemy.height / 2;
        const enemies = game.entityManager ? game.entityManager.enemies : [];

        for (const e of enemies) {
            if (e === enemy || !e.active) continue;
            if (e.config.w3behaviour !== 'shielder') continue;

            const dx = (e.position.x + e.width / 2) - cx;
            const dy = (e.position.y + e.height / 2) - cy;
            if (dx * dx + dy * dy < SHIELDER_RANGE_SQ) {
                this.linked = true;
                this.partner = e;
                break;
            }
        }
    }

    modifyDamage(amount) {
        if (!this.linked) return amount;
        return Math.max(1, Math.ceil(amount * SHIELDER_DAMAGE_MULT));
    }

    render(ctx, enemy, cx, cy) {
        if (!this.linked || !this.partner?.active) return;
        ctx.save();

        // Dashed link line
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = '#44aaff';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        const px = this.partner.position.x + this.partner.width / 2;
        const py = this.partner.position.y + this.partner.height / 2;
        ctx.lineTo(px, py);
        ctx.stroke();

        // Shield hexagon
        this._drawShieldHex(ctx, cx, cy, enemy.width * 0.55);
        ctx.restore();
    }

    _drawShieldHex(ctx, cx, cy, radius) {
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = '#88ccff';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        for (let i = 0; i < SHIELDER_HEX_SIDES; i++) {
            const a = i * Math.PI / 3;
            const method = i === 0 ? 'moveTo' : 'lineTo';
            ctx[method](cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
        }
        ctx.closePath();
        ctx.stroke();
    }
}

// ════════════════════════════════════════════
//  MirrorBehavior
// ════════════════════════════════════════════

/**
 * Mirrors the player's horizontal position (opposite side of screen).
 */
class MirrorBehavior extends EnemyBehavior {
    update(enemy, dt, game) {
        if (!game.player?.active) return;
        const playerCx = game.player.position.x + game.player.width / 2;
        const mirrorX = enemy.canvasWidth - playerCx;
        enemy.position.x += (mirrorX - enemy.width / 2 - enemy.position.x) * 3 * dt;
    }

    render(ctx, enemy, cx, cy) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 6]);
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, ctx.canvas ? ctx.canvas.height : 800);
        ctx.stroke();
        ctx.restore();
    }
}

// ════════════════════════════════════════════
//  FragmenterBehavior
// ════════════════════════════════════════════

/**
 * On death, bursts into 3 fast micro-shards.
 * Shards do NOT carry this behavior (prevents infinite fragmentation).
 */
class FragmenterBehavior extends EnemyBehavior {
    onDeath(enemy, game) {
        if (enemy._isShard || !game.entityManager) return;

        const cx = enemy.position.x + enemy.width / 2;
        const cy = enemy.position.y;

        for (let i = 0; i < FRAGMENT_COUNT; i++) {
            const sx = cx + (i - 1) * 18;
            const shard = enemy.spawnEnemy(sx, cy, 'fragment_shard', 'straight', game);
            if (!shard) continue;
            this._configShard(shard, sx, i);
        }

        const emitCy = enemy.position.y + enemy.height / 2;
        game.particles.emit(cx, emitCy, 'hit', FRAGMENT_PARTICLE_COUNT);
    }

    _configShard(shard, sx, index) {
        shard.health = 1;
        shard.maxHealth = 1;
        shard.speed *= FRAGMENT_SPEED_MULT;
        shard.width = FRAGMENT_SHARD_SIZE;
        shard.height = FRAGMENT_SHARD_SIZE;
        shard._isShard = true;
        shard.config = { ...shard.config, w3behaviour: null };
        shard.startX = sx;
        shard.movePhase = (index - 1) * 0.5 > 0 ? 1 : -1;
        shard.pattern = 'sine';
        shard.behaviors = shard.behaviors.filter(
            b => !(b instanceof FragmenterBehavior)
        );
    }
}

export {
    BlinkerBehavior,
    PhaserBehavior,
    BeaconBehavior,
    ShielderBehavior,
    MirrorBehavior,
    FragmenterBehavior
};
