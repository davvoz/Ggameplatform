import GameObject from '../../../../shared/GameObject.js';
import { ENEMY_TYPES } from './types/ENEMY_TYPES.js';
import { MOVEMENT } from './types/MOVEMENT.js';
import BehaviorFactory from './behaviors/BehaviorFactory.js';
import EnemyRenderer from './EnemyRenderer.js';
import EmergenceAnimator from './EmergenceAnimator.js';

const ANIM_FRAME_INTERVAL = 0.18;
const POSITION_MARGIN = 10;
const BULLET_BASE_SPEED = 200;
const HIT_FLASH_DECAY_RATE = 5;
const QUANTUM_BOOST_SPEED_MULT = 1.3;
const FORCE_BOOST_DAMAGE_MULT = 0.5;
const QUANTUM_WEAK_DAMAGE_MULT = 1.5;
const LEVEL_HP_SCALE = 0.06;
const LEVEL_SPEED_SCALE = 0.02;
const LEVEL_SPEED_SCALE_W2 = 0.012;
const LEVELS_PER_WORLD = 30;

/**
 * Enemy — All enemy entities.
 *
 * Behavior-specific logic is delegated to EnemyBehavior subclasses
 * (stealth, spawner, W3/W4 archetypes). Rendering is delegated to
 * EnemyRenderer. The Enemy class handles only core lifecycle:
 * construction, movement, shooting, damage, and destruction.
 */
class Enemy extends GameObject {
    static setPerformanceMode(mode) {
        EnemyRenderer.setPerformanceMode(mode);
    }

    constructor(x, y, type, pattern, canvasWidth, difficultyConfig, level = 1) {
        const config = ENEMY_TYPES[type] || ENEMY_TYPES.scout;
        super(x, y, config.width, config.height);

        this.tag = 'enemy';
        this.type = type;
        this.config = { ...config };
        this.pattern = pattern || 'straight';
        this.canvasWidth = canvasWidth;

        this._applyScaling(config, difficultyConfig, level);
        this._initMovement(x, y);
        this._initShooting(config, difficultyConfig);
        this._initAnimation();
        this._initBehaviors(config);
        this._initEmergence(config);
    }

    // ── Construction helpers ────────────────

    _applyScaling(config, difficultyConfig, level) {
        const diff = difficultyConfig || {};
        const hpMult = diff.enemyHpMult || 1;
        const spdMult = diff.enemySpeedMult || 1;

        const worldRelLevel = ((level - 1) % LEVELS_PER_WORLD) + 1;
        const levelHpMult = 1 + (worldRelLevel - 1) * LEVEL_HP_SCALE;
        const speedScale = level > LEVELS_PER_WORLD ? LEVEL_SPEED_SCALE_W2 : LEVEL_SPEED_SCALE;
        const levelSpdMult = 1 + (worldRelLevel - 1) * speedScale;

        this.health = Math.ceil(config.health * hpMult * levelHpMult);
        this.maxHealth = this.health;
        this.speed = config.speed * spdMult * levelSpdMult;
        this.score = config.score;
        this.dropChance = config.dropChance;
    }

    _initMovement(x, y) {
        this.moveTimer = 0;
        this.movePhase = Math.random() > 0.5 ? 1 : -1;
        this.startX = x;
        this.startY = y;
        this.strafeY = 100 + Math.random() * 100;
        this.targetX = 0;
        this.hitFlash = 0;
    }

    _initShooting(config, difficultyConfig) {
        const frMult = difficultyConfig?.enemyFireRateMult || 1;
        this.shootTimer = config.shootRate > 0
            ? Math.random() * (config.shootRate * frMult)
            : 999;
        this.config.shootRate = config.shootRate * frMult;
    }

    _initAnimation() {
        this._animIdx = 0;
        this._animTimer = 0;
    }

    _initBehaviors(config) {
        this.behaviors = BehaviorFactory.createBehaviors(config);
        for (const behavior of this.behaviors) {
            behavior.onConstruct(this);
        }
    }

    _initEmergence(config) {
        this._emergence = null;
        if (config.w4behaviour) {
            this._emergence = new EmergenceAnimator();
            this._emergence.init(this);
        }
    }

    // ── Core update loop ────────────────────

    update(deltaTime, game) {
        if (this._isAlly) return false;

        // deltaTime is already scaled by Game._updateEntities()
        const dt = deltaTime;
        this._tickAnimation(dt);
        this._trackPlayer(game);

        if (!this._tickEmergence(dt)) return false;
        if (this._quantumFrozen) return;

        this._updateMovement(dt, game);
        this._clampPosition();
        this._updateShooting(dt, game);
        this._decayHitFlash(deltaTime);

        for (const behavior of this.behaviors) {
            behavior.update(this, dt, game);
        }

        this._updateForceBoost();
        this._updateBeaconBoost(dt);
        this._checkOffscreen(game);
    }

    _tickAnimation(dt) {
        this.moveTimer += dt;
        this._animTimer += dt;
        if (this._animTimer >= ANIM_FRAME_INTERVAL) {
            this._animTimer = 0;
            this._animIdx++;
        }
    }

    _trackPlayer(game) {
        if (game.player?.active) {
            this.targetX = game.player.position.x + game.player.width / 2;
        }
    }

    _tickEmergence(dt) {
        if (!this._emergence) return true;
        return this._emergence.update(this, dt);
    }

    _updateMovement(dt, game) {
        let savedSpeed;
        if (this._quantumBoosted) {
            savedSpeed = this.speed;
            this.speed *= QUANTUM_BOOST_SPEED_MULT;
        }

        const moveFn = MOVEMENT[this.pattern];
        if (moveFn) moveFn(this, dt);

        if (savedSpeed !== undefined) this.speed = savedSpeed;
    }

    _clampPosition() {
        this.position.x = Math.max(
            -POSITION_MARGIN,
            Math.min(this.canvasWidth - this.width + POSITION_MARGIN, this.position.x)
        );
    }

    _updateShooting(dt, game) {
        if (this.config.shootRate <= 0) return;
        this.shootTimer -= dt;
        if (this.shootTimer <= 0) {
            this.shoot(game);
            this.shootTimer = this.config.shootRate + (Math.random() - 0.5) * 0.5;
        }
    }

    _decayHitFlash(deltaTime) {
        if (this.hitFlash > 0) {
            this.hitFlash -= deltaTime * HIT_FLASH_DECAY_RATE;
        }
    }

    _updateForceBoost() {
        this._forceBoostedVisual = !!this._forceBoosted;
        this._forceBoosted = false;
    }

    _updateBeaconBoost(dt) {
        if (!this._boosted || this._boosted <= 1) return;
        this.position.y += this.speed * 0.5 * dt;
        this._boosted -= dt;
        if (this._boosted <= 1) this._boosted = 0;
    }

    _checkOffscreen(game) {
        if (this.position.y > game.logicalHeight + 50) {
            this.destroy();
        }
    }

    // ── Shooting ────────────────────────────

    shoot(game) {
        const cx = this.position.x + this.width / 2;
        const by = this.position.y + this.height;
        const bsMult = game.difficulty?.enemyBulletSpeedMult || 1;
        game.spawnBullet(cx, by, 0, BULLET_BASE_SPEED * bsMult, 'enemy');
        game.sound.playEnemyShoot();
    }

    // ── Damage ──────────────────────────────

    takeDamage(amount, game) {
        if (this._invulnerable) return false;

        amount = this._calculateDamage(amount);
        this.health -= amount;
        this.hitFlash = 1;

        game.particles.emit(
            this.position.x + this.width / 2,
            this.position.y + this.height / 2,
            'hit', 4
        );

        if (this.health <= 0) {
            this.health = 0;
            this._handleDeath(game);
            this.destroy();
            return true;
        }
        return false;
    }

    _calculateDamage(amount) {
        for (const behavior of this.behaviors) {
            amount = behavior.modifyDamage(amount, this);
        }
        if (this._forceBoostedVisual) {
            amount = Math.max(1, Math.ceil(amount * FORCE_BOOST_DAMAGE_MULT));
        }
        if (this._quantumWeak) {
            amount = Math.ceil(amount * QUANTUM_WEAK_DAMAGE_MULT);
        }
        return amount;
    }

    _handleDeath(game) {
        for (const behavior of this.behaviors) {
            behavior.onDeath(this, game);
        }
    }

    // ── Rendering ───────────────────────────

    render(ctx, assets) {
        EnemyRenderer.render(ctx, this, assets);
    }

    // ── Spawning helper (used by behaviors) ─

    spawnEnemy(x, y, type, pattern, game) {
        if (!game.entityManager) return null;
        const level = game.levelManager ? game.levelManager.currentLevel : 1;
        const spawn = new Enemy(x, y, type, pattern, this.canvasWidth, game.difficulty, level);
        game.entityManager.enemies.push(spawn);
        return spawn;
    }

    // ── Behavior lookup ─────────────────────

    getBehavior(BehaviorClass) {
        return this.behaviors.find(b => b instanceof BehaviorClass);
    }
}

export default Enemy;
