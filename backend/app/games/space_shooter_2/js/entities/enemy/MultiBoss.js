import { BOSS_DEFS, MINIBOSS_DEFS } from '../Enemy.js';
import BossPart from './BossPart.js';
import AbilityFactory from './abilities/AbilityFactory.js';
import MultiBossRenderer from './MultiBossRenderer.js';
import MOVE_PATTERNS from './MovementPatterns.js';

const ENRAGE_THRESHOLD = 0.3;
const ENRAGE_FIRE_RATE_MULT = 0.6;
const DAMAGE_PRIORITY = ['shield', 'turret', 'arm', 'weakpoint', 'core'];
const BOSS_TARGET_Y = 160;
const MINIBOSS_TARGET_Y = 130;
const WORLD_SIZE = 30;
const LEVEL_HP_SCALE = 0.05;
const LEVEL_SPEED_SCALE = 0.015;
const LEVEL_SPEED_SCALE_LATE = 0.01;

class MultiBoss {
    constructor(x, y, bossId, canvasWidth, isMiniBoss = false, difficultyConfig = null, level = 1) {
        const defs = isMiniBoss ? MINIBOSS_DEFS : BOSS_DEFS;
        const def = defs[bossId] || defs[1];
        this.bossId = bossId;
        this.def = def;
        this.name = def.name;
        this.canvasWidth = canvasWidth;
        this.score = def.score;
        this.isMiniBoss = isMiniBoss;
        this.difficultyConfig = difficultyConfig || {};

        this.centerX = x + def.totalWidth / 2;
        this.centerY = y;
        this.width = def.totalWidth;
        this.height = def.totalHeight;
        this.position = { x: this.centerX - this.width / 2, y: this.centerY - this.height / 2 };
        this.active = true;
        this.targetY = isMiniBoss ? MINIBOSS_TARGET_Y : BOSS_TARGET_Y;

        this._initEntrance(isMiniBoss);

        const scaling = this._computeScaling(level);
        this.speed = def.speed * scaling.spdMult * scaling.levelSpdMult;
        this.moveDir = 1;
        this.moveTimer = 0;

        this._createParts(def, scaling);

        this.enraged = false;
        this.dropChance = 1;

        this.ability = AbilityFactory.create(def.ability);
        if (this.ability) this.ability.init(this);

        this._updatePartPositions();
    }

    _initEntrance(isMiniBoss) {
        this.entering = true;
        this.enterPartsSpread = 0;
        if (isMiniBoss) {
            this.enterPhase = 1;
            this.enterTime = 2;
        } else {
            this.enterPhase = 0;
            this.enterTime = 0;
        }
    }

    _computeScaling(level) {
        const hpMult = this.difficultyConfig.bossHpMult || 1;
        const spdMult = this.difficultyConfig.bossSpeedMult || 1;
        const worldRelLevel = ((level - 1) % WORLD_SIZE) + 1;
        const levelHpMult = 1 + (worldRelLevel - 1) * LEVEL_HP_SCALE;
        const speedScale = level > WORLD_SIZE ? LEVEL_SPEED_SCALE_LATE : LEVEL_SPEED_SCALE;
        const levelSpdMult = 1 + (worldRelLevel - 1) * speedScale;
        const frMult = this.difficultyConfig.enemyFireRateMult || 1;
        const bsMult = this.difficultyConfig.enemyBulletSpeedMult || 1;
        return { hpMult, spdMult, levelHpMult, levelSpdMult, frMult, bsMult };
    }

    _createParts(def, scaling) {
        this.parts = def.parts.map(p => {
            const partCfg = { ...p };
            partCfg.health = Math.ceil(p.health * scaling.hpMult * scaling.levelHpMult);
            if (partCfg.shootRate) partCfg.shootRate *= scaling.frMult;
            if (partCfg.bulletSpeed) partCfg.bulletSpeed *= scaling.bsMult;
            return new BossPart(partCfg);
        });
        this.maxHealth = this.parts.reduce((s, p) => s + p.maxHealth, 0);
        this.coreParts = this.parts.filter(p => p.isCore);
    }

    get health() {
        return this.parts.reduce((s, p) => p.active ? s + p.health : s, 0);
    }

    update(deltaTime, game) {
        // deltaTime is already scaled by Game._updateEntities()
        const dt = deltaTime;
        this.moveTimer += dt;

        // ── CINEMATIC ENTRY (uses raw time — cinematic plays at full speed) ──
        if (this.entering) {
            const ts = game.timeScale || 1;
            const rawDt = ts > 0 ? dt / ts : dt;
            if (this._updateCinematicEntry(rawDt)) return;
        }

        this._checkEnrage();
        this._applyMovement(dt, game);

        if (this.ability) this.ability.update(dt, game, this);

        const bossMargin = this.width * 0.4;
        this.centerX = Math.max(bossMargin, Math.min(this.canvasWidth - bossMargin, this.centerX));

        this._updatePartPositions();
        this._updateParts(dt, game);
        this._syncPosition();
    }

    _updateCinematicEntry(dt) {
        this.enterTime += dt;

        // Phase 0: WARNING (0-2s) — boss stays off-screen
        if (this.enterPhase === 0) {
            if (this.enterTime >= 2) {
                this.enterPhase = 1;
            }
            this._updatePartPositions();
            this._syncPosition();
            return true;
        }

        // Phase 1: DESCEND (2-3.5s) — slide in, parts clustered at center
        if (this.enterPhase === 1) {
            const slideProgress = Math.min(1, (this.enterTime - 2) / 1.5);
            const eased = 1 - Math.pow(1 - slideProgress, 3);
            this.centerY = -200 + (this.targetY - (-200)) * eased;
            this.enterPartsSpread = 0;

            if (slideProgress >= 1) {
                this.enterPhase = 2;
            }
            this._updatePartPositions();
            this._syncPosition();
            return true;
        }

        // Phase 2: DEPLOY (3.5-4.5s) — parts spread to final positions
        if (this.enterPhase === 2) {
            const deployProgress = Math.min(1, (this.enterTime - 3.5) / 1);
            const t = deployProgress;
            this.enterPartsSpread = t < 1
                ? 1 - Math.pow(2, -10 * t) * Math.cos((t * 10 - 0.75) * (2 * Math.PI / 3))
                : 1;

            if (deployProgress >= 1) {
                this.enterPhase = 3;
                this.entering = false;
                this.enterPartsSpread = 1;
            }
            this._updatePartPositions();
            this._syncPosition();
            return true;
        }
        return false;
    }

    _syncPosition() {
        this.position.x = this.centerX - this.width / 2;
        this.position.y = this.centerY - this.height / 2;
    }

    _checkEnrage() {
        const hpRatio = this.health / this.maxHealth;
        if (!this.enraged && hpRatio < ENRAGE_THRESHOLD) {
            this.enraged = true;
            for (const part of this.parts) {
                if (part.canShoot) part.shootRate *= ENRAGE_FIRE_RATE_MULT;
            }
        }
    }

    _updateParts(dt, game) {
        // Tick hit-flash for ALL parts
        for (const part of this.parts) {
            if (part.hitFlash > 0) part.hitFlash = Math.max(0, part.hitFlash - dt * 4);
        }

        // Part shooting
        for (const part of this.parts) {
            if (!part.active || !part.canShoot) continue;
            part.shootTimer -= dt;
            if (part.shootTimer <= 0) {
                part.shoot(game, this.moveTimer);
                part.shootTimer = part.shootRate;
            }
        }
    }

    _applyMovement(dt, game) {
        const pattern = MOVE_PATTERNS[this.def.movePattern] || MOVE_PATTERNS.sweep;
        pattern(this, dt, game);
    }

    _updatePartPositions() {
        const spread = this.enterPartsSpread;
        for (const part of this.parts) {
            if (part.active) {
                // During entrance, parts collapse toward center
                const origOX = part.offsetX;
                const origOY = part.offsetY;
                if (spread < 1) {
                    part.offsetX = origOX * spread;
                    part.offsetY = origOY * spread;
                }
                part.updatePosition(this.centerX, this.centerY, this.moveTimer);
                // Restore original offsets
                part.offsetX = origOX;
                part.offsetY = origOY;
            }
        }
    }

    damagepart(partIndex, amount, game) {
        const part = this.parts[partIndex];
        if (!part?.active) return { partDestroyed: false, bossKilled: false, part: null };

        // Let ability modify the damage amount
        if (this.ability) {
            amount = this.ability.onDamage(amount, partIndex, this, game);
        }
        if (amount <= 0) return { partDestroyed: false, bossKilled: false, part };

        const destroyed = part.takeDamage(amount);

        if (destroyed) {
            // Part destruction explosion
            game.particles.emit(
                part.worldX + part.width / 2,
                part.worldY + part.height / 2,
                'explosion', 12
            );
        }

        // Check if all cores destroyed
        const coreAlive = this.coreParts.some(c => c.active);
        if (!coreAlive) {
            this.active = false;
            return { partDestroyed: destroyed, bossKilled: true, part };
        }

        return { partDestroyed: destroyed, bossKilled: false, part };
    }

    /**
     * Legacy takeDamage — finds the best target part and damages it.
     * Priority: shields → turrets → arms → core
     */
    takeDamage(amount, game) {
        // Find first active target by priority
        for (const role of DAMAGE_PRIORITY) {
            const candidates = this.parts.filter(p => p.active && p.role === role);
            if (candidates.length > 0) {
                const target = candidates[Math.floor(Math.random() * candidates.length)];
                const idx = this.parts.indexOf(target);
                const result = this.damagepart(idx, amount, game);
                return result.bossKilled;
            }
        }
        return false;
    }

    /**
     * Find which part a bullet at (bx, by) hits. Returns part index or -1.
     */
    getHitPart(bx, by) {
        // Check non-core parts first (so shields/turrets absorb hits)
        for (let i = 0; i < this.parts.length; i++) {
            const p = this.parts[i];
            if (!p.active || p.isCore) continue;
            if (p.containsPoint(bx, by)) return i;
        }
        // Then core
        for (let i = 0; i < this.parts.length; i++) {
            const p = this.parts[i];
            if (!p.active || !p.isCore) continue;
            if (p.containsPoint(bx, by)) return i;
        }
        return -1;
    }

    /**
     * Circle collision with another entity — checks all active parts.
     */
    collidesWithCircle(other) {
        const otherCX = other.position.x + other.width / 2;
        const otherCY = other.position.y + other.height / 2;
        const otherR = Math.min(other.width, other.height) / 2;
        for (const part of this.parts) {
            if (!part.active) continue;
            if (part.collidesCircle(otherCX, otherCY, otherR)) return true;
        }
        return false;
    }

    render(ctx, assets) {
        MultiBossRenderer.render(ctx, this, assets);
    }

    /** For compatibility with old Boss collision API */
    destroy() {
        this.active = false;
    }
}

export default MultiBoss;