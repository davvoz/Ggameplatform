/**
 * DamageHandler — SRP: all damage application and zombie kill logic.
 *
 * SonarQube deduplication: the `result.blocked` rendering pattern appeared
 * three times in game_old.js. It is now consolidated in `_renderHitResult`.
 */
import { CANNON_TYPES, ZOMBIE_TYPES } from '../config.js';
import { Utils } from '../utils.js';

export class DamageHandler {
    constructor(game) {
        this.game = game;
    }

    // ── convenience accessors ──────────────────────────────────────────────
    get state()     { return this.game.state; }
    get particles() { return this.game.particles; }
    get audio()     { return this.game.audio; }
    get entities()  { return this.game.entities; }

    // ── public API ─────────────────────────────────────────────────────────
    damageZombie(zombie, proj, currentTime) {
        const cannonType   = proj.cannonType || 'BASIC';
        const cannonConfig = CANNON_TYPES[cannonType];
        const effectiveness = cannonConfig.effectiveness?.[zombie.type] || 1;

        const baseDamage = proj.damage * effectiveness;
        const result     = zombie.takeDamage(baseDamage, currentTime);

        if (result.blocked) {
            this._renderBlockedHit(zombie, result);
            return;
        }

        // Visual feedback varies by effectiveness tier
        if (effectiveness >= 1.5) {
            this.particles.createDamageNumber(zombie.col, zombie.row, result.damage, '#00ff00');
            this.audio.enemyHit(1.2);
        } else if (effectiveness <= 0.7) {
            this.particles.createDamageNumber(zombie.col, zombie.row, result.damage, '#888888');
            this.audio.enemyHit(0.8);
        } else {
            this.particles.createDamageNumber(zombie.col, zombie.row, result.damage);
            this.audio.enemyHit();
        }

        if (proj.slowFactor > 0) {
            zombie.applySlow(proj.slowFactor, proj.slowDuration, currentTime);
            this.particles.createFreezeEffect(zombie.col, zombie.row);
        }

        if (zombie.isDead()) this.killZombie(zombie);
    }

    applySplashDamage(epicenter, proj, currentTime) {
        this.particles.createExplosion(epicenter.col, epicenter.row, proj.splashRadius, proj.color);

        for (const zombie of this.entities.zombies) {
            if (zombie === epicenter) continue;
            const dist = Utils.distance(epicenter.col, epicenter.row, zombie.col, zombie.row);
            if (dist > proj.splashRadius) continue;

            const result = zombie.takeDamage(proj.damage * 0.5, currentTime);
            this._renderHitResult(zombie, result);
            if (zombie.isDead()) this.killZombie(zombie);
        }
    }

    applyChainDamage(source, proj, currentTime) {
        let currentTarget = source;
        let chainsLeft    = proj.chainTargets;
        const hitTargets  = [source];

        while (chainsLeft > 0) {
            const nearestTarget = this._findNearestChainTarget(currentTarget, hitTargets);
            if (!nearestTarget) break;

            this.particles.createLightningEffect(nearestTarget.col, nearestTarget.row);
            const result = nearestTarget.takeDamage(proj.damage * 0.7, currentTime);
            this._renderHitResult(nearestTarget, result);
            if (nearestTarget.isDead()) this.killZombie(nearestTarget);

            hitTargets.push(nearestTarget);
            currentTarget = nearestTarget;
            chainsLeft--;
        }
    }

    killZombie(zombie) {
        this._processBomberDeath(zombie);
        this._processSplitterDeath(zombie);
        this._processKillRewards(zombie);

        this.particles.createDeathEffect(zombie.col, zombie.row, zombie.icon);
        this.particles.createCoinReward(zombie.col, zombie.row, zombie.reward);
        this.audio.enemyDeath();
        this.audio.coinCollect();

        this.entities.removeZombie(zombie);
    }

    // ── private helpers ────────────────────────────────────────────────────

    /**
     * Deduplicated hit-result renderer used by splash and chain damage.
     * Returns true if the hit was blocked.
     */
    _renderHitResult(zombie, result) {
        if (result.blocked) {
            if (result.type === 'shield') {
                this.particles.createShieldBlock(zombie.col, zombie.row);
            }
            return true;
        }
        this.particles.createDamageNumber(zombie.col, zombie.row, result.damage);
        return false;
    }

    /** Extended render for direct hits — includes invulnerability effect. */
    _renderBlockedHit(zombie, result) {
        if (result.type === 'shield') {
            this.particles.emit(zombie.col, zombie.row - 0.3, {
                text: '🛡️', color: '#44aaff', vy: -1.5, life: 0.6, scale: 1.2, glow: true,
            });
            this.particles.createShieldBlock(zombie.col, zombie.row);
        } else if (result.type === 'invulnerable') {
            this.particles.emit(zombie.col, zombie.row - 0.3, {
                text: '✨', color: '#aa66ff', vy: -1, life: 0.4, scale: 1.5, glow: true,
            });
        }
    }

    _findNearestChainTarget(origin, already) {
        let nearest     = null;
        let nearestDist = Infinity;
        for (const zombie of this.entities.zombies) {
            if (already.includes(zombie)) continue;
            const dist = Utils.distance(origin.col, origin.row, zombie.col, zombie.row);
            if (dist < 3 && dist < nearestDist) {
                nearestDist = dist;
                nearest     = zombie;
            }
        }
        return nearest;
    }

    _processBomberDeath(zombie) {
        if (!zombie.isBomber || zombie.explosionRadius <= 0) return;

        let towersHit = 0;
        this.entities.cannons.forEach(cannon => {
            if (Utils.distance(zombie.col, zombie.row, cannon.col, cannon.row) > zombie.explosionRadius) return;
            cannon.stunned     = true;
            cannon.stunDuration = 2000;
            towersHit++;
            this.particles.emit(cannon.col, cannon.row, {
                text: '💥STUN', color: '#ff4500', vy: -1.2, life: 1, scale: 1.1,
            });
        });

        this.particles.createExplosion(zombie.col, zombie.row, zombie.explosionRadius, '#ff4500');
        this.particles.emit(zombie.col, zombie.row, {
            text: '💣 BOOM!', color: '#ff4500', vy: -2, life: 1.2, scale: 1.4, glow: true,
        });
        if (towersHit > 0) this.audio.explosion?.();
    }

    _processSplitterDeath(zombie) {
        if (!zombie.canSplit || zombie.splitCount <= 0) return;

        const splitHp = ZOMBIE_TYPES[zombie.splitType].hp * zombie.splitHpPercent;
        for (let i = 0; i < zombie.splitCount; i++) {
            const child  = this.entities.addZombie(zombie.col, zombie.splitType, this.state.wave);
            child.hp     = splitHp;
            child.maxHp  = splitHp;
            child.row    = zombie.row;
            child.col   += (Math.random() - 0.5) * 0.5;
        }
        this.particles.emit(zombie.col, zombie.row, {
            text: 'SPLIT!', color: '#ff00ff', vy: -1.5, life: 1, scale: 1.2,
        });
    }

    _processKillRewards(zombie) {
        const { state, particles, audio } = this;
        const now = performance.now();

        if (!state.lastKillTime) state.lastKillTime = now;
        state.combo       = (now - state.lastKillTime < 1200) ? ((state.combo || 1) + 1) : 1;
        state.lastKillTime = now;
        if (!state.maxCombo || state.combo > state.maxCombo) state.maxCombo = state.combo;

        if (state.combo > 2) {
            const comboBonus = Math.floor(zombie.reward * state.combo * 0.5);
            state.score += comboBonus;
            particles.emit(zombie.col, zombie.row, {
                text: `COMBO x${state.combo}! +${comboBonus}`,
                color: '#00ffff', vy: -2, life: 1.2, scale: 1.2, glow: true,
            });
            audio.combo(state.combo);
        }

        state.killsWithoutLeak = (state.killsWithoutLeak || 0) + 1;
        if (state.killsWithoutLeak % 10 === 0) {
            const streakBonus = 50 + 10 * state.wave;
            state.coins += streakBonus;
            particles.emit(zombie.col, zombie.row, {
                text: `STREAK! +${streakBonus}💰`,
                color: '#ffaa00', vy: -2, life: 1.5, scale: 1.3, glow: true,
            });
        }

        state.coins += zombie.reward;
        state.kills++;
        state.score += Math.floor(zombie.reward * state.wave * 1.5);
    }
}
