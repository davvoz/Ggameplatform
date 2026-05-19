import { LivingEntity } from '../entity.js';
import { Projectile } from '../weapons.js';
import {  Vector2 } from '../utils.js';
import { CONFIG, WORLD_ENEMIES } from '../config.js';
import { spriteManager } from '../sprite-system.js';

// Map enemy types to sprite types
const ENEMY_SPRITE_MAP = {
    'basic': 'zombie',
    'fast': 'runner',
    'tank': 'tank',
    'ranged': 'shooter',
    'exploder': 'exploder',
    'swarm': 'zombie',
    'ghost': 'ghost',
    // Inferno Core
    'flameImp': 'runner',
    'magmaGolem': 'tank',
    'emberSprinter': 'runner',
    'lavaCaster': 'shooter',
    'pyroBlob': 'exploder',
    // Frozen Wastes
    'iceWraith': 'ghost',
    'frostGiant': 'tank',
    'blizzardWolf': 'runner',
    'frostArcher': 'shooter',
    'iceDetonator': 'exploder',
    // Neon Nexus
    'droneSwarm': 'runner',
    'mechSentinel': 'tank',
    'sparkRunner': 'runner',
    'laserTurret': 'shooter',
    'emPulser': 'exploder',
    // Shadow Realm
    'shadowClone': 'ghost',
    'voidDevourer': 'tank',
    'phantasm': 'runner',
    'darkCaster': 'shooter',
    'voidMine': 'exploder'
};

/**
 * Get enemy config - checks both base CONFIG.ENEMIES and WORLD_ENEMIES
 */
function getEnemyConfig(type) {
    return CONFIG.ENEMIES[type] || WORLD_ENEMIES[type] || CONFIG.ENEMIES.basic;
}

/**
 * Base enemy class
 */
export class Enemy extends LivingEntity {
    /**
     * @param {number} x 
     * @param {number} y 
     * @param {string} type - Enemy type from CONFIG.ENEMIES
     * @param {Object} difficultyMult - Difficulty multipliers
     */
    constructor(x, y, type, difficultyMult = {}) {
        const config = getEnemyConfig(type);

        const health = config.health * (difficultyMult.enemyHealth || 1);
        super(x, y, config.size, health);

        this.type = type;
        this.config = config;

        // Apply difficulty scaling
        this.damage = config.damage * (difficultyMult.enemyDamage || 1);
        this.speed = config.speed * (difficultyMult.enemySpeed || 1);
        this.baseSpeed = this.speed;

        this.color = config.color;
        this.target = null;

        // World enemy flag  used for colored aura rendering
        this.isWorldEnemy = !!WORLD_ENEMIES[type];
        this.worldIcon = config.icon || null;

        // XP and score values  world enemies derive from health/damage if not in config
        this.xpValue = CONFIG.LEVELING.XP_FROM_ENEMY[type] || Math.max(1, Math.round(config.health / 8));
        this.scoreValue = CONFIG.SCORING.POINTS_PER_KILL[type] || Math.max(10, Math.round(config.health / 2 + config.damage * 2));

        // Initialize sprite system
        const spriteType = ENEMY_SPRITE_MAP[type] || 'zombie';
        this.sprite = spriteManager.createSprite(spriteType);
        if (this.sprite) {
            this.sprite.play('walk');
        }
        this.spriteScale = this.size * 2.5;

        // State machine
        this.state = 'chase';
        this.stateTimer = 0;

        // Enemy type-specific init
        this.initializeEnemyAbilities(type, config);

        // --- New world enemy init ---
        // Ranged-type world enemies (lavaCaster, frostArcher, laserTurret, darkCaster)
        if (['lavaCaster', 'frostArcher', 'laserTurret', 'darkCaster'].includes(type)) {
            this.attackRange = config.attackRange || 250;
            this.projectileSpeed = config.projectileSpeed || 250;
            this.fireRate = config.fireRate || 2500;
            this.fireCooldown = 0;
            this.projectiles = [];
        }
        // Exploder-type world enemies (pyroBlob, iceDetonator, emPulser, voidMine)
        if (['pyroBlob', 'iceDetonator', 'emPulser', 'voidMine'].includes(type)) {
            this.explosionRadius = config.explosionRadius || 80;
            this.isExploding = false;
            this.explosionTimer = 0;
        }


        // Knockback
        this.knockbackVelocity = new Vector2(0, 0);
        this.knockbackDecay = 8;

        // Animation
        this.animationOffset = Math.random() * Math.PI * 2;
    }

    initializeEnemyAbilities(type, config) {
        switch (type) {
            case 'ranged':
                this.attackRange = config.attackRange;
                this.projectileSpeed = config.projectileSpeed;
                this.fireRate = config.fireRate;
                this.fireCooldown = 0;
                this.projectiles = [];
                break;
            case 'exploder':
                this.explosionRadius = config.explosionRadius;
                this.isExploding = false;
                this.explosionTimer = 0;
                break;
            // --- World-specific enemy init ---
            case 'flameImp': // Flame Imp: leaves fire trail
                this.trailTimer = 0;
                this.trailInterval = 300; // drop fire every 300ms
                this.fireTrails = [];
                break;
            case 'magmaGolem': // Magma Golem: splits on death
                this.splitsOnDeath = true;
                this.splitCount = config.splitCount || 2;
                break;
            case 'iceWraith': // Ice Wraith: slows player on hit
                this.slowOnHit = config.slowOnHit || 0.4;
                this.slowDuration = config.slowDuration || 1500;
                break;
            case 'frostGiant': // Frost Giant: periodic freeze zone
                this.freezeRadius = config.freezeRadius || 120;
                this.freezeTimer = 0;
                this.freezeCooldown = 4000;
                this.freezeActive = false;
                this.freezeDuration = config.freezeDuration || 2000;
                break;
            case 'mechSentinel': // Mech Sentinel: has a rechargeable shield
                this.shieldHP = config.shieldHP || 30;
                this.maxShieldHP = this.shieldHP;
                this.shieldRegenDelay = config.shieldRegenDelay || 3000;
                this.shieldRegenTimer = 0;
                this.shieldBroken = false;
                break;
            case 'shadowClone': // Shadow Clone: periodically teleports
                this.teleportCooldown = config.teleportCooldown || 3000;
                this.teleportTimer = this.teleportCooldown;
                this.teleportRange = config.teleportRange || 200;
                this.isTeleporting = false;
                this.teleportAlpha = 1;
                break;
            case 'voidDevourer': // Void Devourer: pulls player toward itself
                this.pullRadius = config.pullRadius || 180;
                this.pullForce = config.pullForce || 80;
                break;
            case 'emberSprinter': // Ember Sprinter: zigzag dash movement
                this.zigzagTimer = 0;
                this.zigzagDir = 1;
                this.dashTimer = 0;
                this.dashCooldown = 2500;
                this.isDashing = false;
                break;
            case 'blizzardWolf': // Blizzard Wolf: pack circling behavior
                this.circleAngle = Math.random() * Math.PI * 2;
                this.circleDir = Math.random() > 0.5 ? 1 : -1;
                this.lungeTimer = 0;
                this.lungeCooldown = 3000;
                this.isLunging = false;
                this.lungeDir = new Vector2(0, 0);
                break;
            case 'sparkRunner': // Spark Runner: erratic jitter + electric trail
                this.jitterAngle = 0;
                this.electricTrails = [];
                this.trailTimer = 0;
                break;
            case 'phantasm': // Phantasm: fade in/out, phase through
                this.phaseTimer = 0;
                this.phaseCooldown = 2000;
                this.isPhased = false;
                this.phantasmAlpha = 1;
                break;
            case 'droneSwarm': // Drone Swarm: orbit around target then dive
                this.swarmSize = config.swarmSize || 3;
                this.orbitAngle = Math.random() * Math.PI * 2;
                this.orbitDir = Math.random() > 0.5 ? 1 : -1;
                this.diveTimer = 0;
                this.diveCooldown = 2500;
                this.isDiving = false;
                break;
        }
    }

    /**
     * Set target to chase
     * @param {Entity} target 
     */
    setTarget(target) {
        this.target = target;
    }

    /**
     * Update enemy
     * @param {number} deltaTime 
     * @param {Object} arena 
     */
    update(deltaTime, arena) {
        if (!this.active || !this.target) return;

        // Apply knockback
        if (this.knockbackVelocity.magnitudeSquared() > 0.1) {
            this.velocity.x = this.knockbackVelocity.x;
            this.velocity.y = this.knockbackVelocity.y;

            // Decay knockback
            this.knockbackVelocity.multiply(Math.max(0, 1 - this.knockbackDecay * deltaTime));
        } else {
            this.knockbackVelocity.set(0, 0);

            // Behavior based on type - direct chase, no wrapping
            this.updateBehavior(deltaTime);
        }

        super.update(deltaTime);

        // Wrap position for seamless toroidal world
        this.x = this.wrapCoord(this.x, CONFIG.ARENA.WIDTH);
        this.y = this.wrapCoord(this.y, CONFIG.ARENA.HEIGHT);
        this.position.set(this.x, this.y);

        // Update ranged projectiles
        if (this.projectiles) {
            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                const proj = this.projectiles[i];
                if (proj.active) {
                    proj.update(deltaTime);
                } else {
                    this.projectiles.splice(i, 1);
                }
            }
        }

        // Update sprite animation
        if (this.sprite) {
            this.sprite.update(deltaTime);
        }
    }

    /**
     * Wrap coordinate for infinite world
     * @param {number} value 
     * @param {number} max 
     * @returns {number}
     */
    wrapCoord(value, max) {
        if (value < 0) return value + max;
        if (value >= max) return value - max;
        return value;
    }

    /**
     * Get wrapped direction to target (shortest path in toroidal world)
     * @param {Object} arena
     * @returns {Object} {dx, dy, distance, dirX, dirY}
     */
    getWrappedDirectionToTarget(arena) {
        if (!this.target) return { dx: 0, dy: 0, distance: 0, dirX: 0, dirY: 0 };

        let dx = this.target.x - this.x;
        let dy = this.target.y - this.y;

        // Wrap horizontally - take shorter path
        if (Math.abs(dx) > arena.width / 2) {
            dx = dx > 0 ? dx - arena.width : dx + arena.width;
        }

        // Wrap vertically - take shorter path
        if (Math.abs(dy) > arena.height / 2) {
            dy = dy > 0 ? dy - arena.height : dy + arena.height;
        }

        const distance = Math.hypot(dx, dy);
        const dirX = distance > 0 ? dx / distance : 0;
        const dirY = distance > 0 ? dy / distance : 0;

        return { dx, dy, distance, dirX, dirY };
    }

    /**
     * Update behavior based on type (using wrapped distance for seamless toroidal world)
     * @param {number} deltaTime 
     */
    updateBehavior(deltaTime) {
        // Use wrapped direction for shortest path in toroidal world
        const arena = { width: CONFIG.ARENA.WIDTH, height: CONFIG.ARENA.HEIGHT };
        const wrapped = this.getWrappedDirectionToTarget(arena);
        const distToTarget = wrapped.distance;
        const dirToTarget = new Vector2(wrapped.dirX, wrapped.dirY);

        switch (this.type) {
            case 'ranged':
            case 'lavaCaster':
            case 'frostArcher':
            case 'laserTurret':
            case 'darkCaster':
                this.updateRangedBehavior(deltaTime, distToTarget, dirToTarget);
                break;
            case 'exploder':
            case 'pyroBlob':
            case 'iceDetonator':
            case 'emPulser':
            case 'voidMine':
                this.updateExploderBehavior(deltaTime, distToTarget, dirToTarget);
                break;
            case 'flameImp':
                this.updateFlameImpBehavior(deltaTime, dirToTarget);
                break;
            case 'frostGiant':
                this.updateFrostGiantBehavior(deltaTime, distToTarget, dirToTarget);
                break;
            case 'shadowClone':
                this.updateShadowCloneBehavior(deltaTime, distToTarget, dirToTarget);
                break;
            case 'voidDevourer':
                this.updateVoidDevourerBehavior(deltaTime, distToTarget, dirToTarget);
                break;
            case 'mechSentinel':
                this.updateMechSentinelBehavior(deltaTime, dirToTarget);
                break;
            case 'emberSprinter':
                this.updateEmberSprinterBehavior(deltaTime, distToTarget, dirToTarget);
                break;
            case 'blizzardWolf':
                this.updateBlizzardWolfBehavior(deltaTime, distToTarget, dirToTarget);
                break;
            case 'sparkRunner':
                this.updateSparkRunnerBehavior(deltaTime, dirToTarget);
                break;
            case 'phantasm':
                this.updatePhantasmBehavior(deltaTime, dirToTarget);
                break;
            case 'droneSwarm':
                this.updateDroneSwarmBehavior(deltaTime, distToTarget, dirToTarget);
                break;
            default:
                this.updateChaseBehavior(dirToTarget);
        }
    }

    /**
     * Basic chase behavior
     * @param {Vector2} dirToTarget 
     */
    updateChaseBehavior(dirToTarget) {
        this.velocity.set(
            dirToTarget.x * this.speed,
            dirToTarget.y * this.speed
        );
    }

    /**
     * Ranged enemy behavior
     * @param {number} deltaTime 
     * @param {number} distToTarget 
     * @param {Vector2} dirToTarget 
     */
    updateRangedBehavior(deltaTime, distToTarget, dirToTarget) {
        this.fireCooldown -= deltaTime * 1000;

        if (distToTarget > this.attackRange) {
            // Move closer
            this.velocity.set(
                dirToTarget.x * this.speed,
                dirToTarget.y * this.speed
            );
        } else if (distToTarget < this.attackRange * 0.5) {
            // Too close, back away
            this.velocity.set(
                -dirToTarget.x * this.speed * 0.5,
                -dirToTarget.y * this.speed * 0.5
            );
        } else {
            // In range, stop and shoot
            this.velocity.set(0, 0);

            if (this.fireCooldown <= 0) {
                this.fireProjectile(dirToTarget);
                this.fireCooldown = this.fireRate;
            }
        }
    }

    /**
     * Fire a projectile at target
     * @param {Vector2} direction 
     */
    fireProjectile(direction) {
        const angle = Math.atan2(direction.y, direction.x);
        // Per-enemy projectile style config
        const projStyles = {
            'ranged': { color: '#ba68c8', size: 7, type: 'energyBall' },
            'lavaCaster': { color: '#ff5500', size: 10, type: 'fireball' },
            'frostArcher': { color: '#66ccff', size: 6, type: 'arrow' },
            'laserTurret': { color: '#00ffaa', size: 5, type: 'laserBolt' },
            'darkCaster': { color: '#9933ff', size: 9, type: 'darkOrb' }
        };
        const style = projStyles[this.type] || { color: this.color, size: 8, type: 'enemyDefault' };
        const proj = new Projectile(
            this.x, this.y, angle,
            {
                damage: this.damage,
                projectileSpeed: this.projectileSpeed,
                projectileSize: style.size,
                projectileColor: style.color,
                range: this.attackRange * 1.5,
                pierce: 1,
                type: style.type
            }
        );
        proj.isEnemyProjectile = true;
        this.projectiles.push(proj);
    }

    /**
     * Exploder behavior
     * @param {number} deltaTime 
     * @param {number} distToTarget 
     * @param {Vector2} dirToTarget 
     */
    updateExploderBehavior(deltaTime, distToTarget, dirToTarget) {
        if (this.isExploding) {
            this.explosionTimer -= deltaTime * 1000;

            // Pulsate effect
            this.size = this.config.size * (1 + 0.3 * Math.sin(Date.now() / 50));

            if (this.explosionTimer <= 0) {
                this.explode();
            }
            this.velocity.set(0, 0);
        } else if (distToTarget < 60) {
            // Start explosion countdown
            this.isExploding = true;
            this.explosionTimer = 1000; // 1 second warning
            this.velocity.set(0, 0);
        } else {
            // Chase faster than normal
            this.velocity.set(
                dirToTarget.x * this.speed,
                dirToTarget.y * this.speed
            );
        }
    }

    /**
     * Flame Imp behavior: chase + leave fire trail
     */
    updateFlameImpBehavior(deltaTime, dirToTarget) {
        // Fast chase
        this.velocity.set(dirToTarget.x * this.speed, dirToTarget.y * this.speed);

        // Drop fire trail periodically
        this.trailTimer += deltaTime * 1000;
        if (this.trailTimer >= this.trailInterval) {
            this.trailTimer = 0;
            this.fireTrails.push({
                x: this.x, y: this.y,
                damage: this.config.trailDamage || 3,
                radius: 20,
                lifetime: this.config.trailDuration || 2000,
                timer: 0
            });
        }

        // Update existing trails
        for (let i = this.fireTrails.length - 1; i >= 0; i--) {
            this.fireTrails[i].timer += deltaTime * 1000;
            if (this.fireTrails[i].timer >= this.fireTrails[i].lifetime) {
                this.fireTrails.splice(i, 1);
            }
        }
    }

    /**
     * Frost Giant behavior: chase + periodic freeze zone
     */
    updateFrostGiantBehavior(deltaTime, distToTarget, dirToTarget) {
        this.velocity.set(dirToTarget.x * this.speed, dirToTarget.y * this.speed);

        this.freezeTimer += deltaTime * 1000;
        if (this.freezeTimer >= this.freezeCooldown && distToTarget < 250) {
            this.freezeTimer = 0;
            this.freezeActive = true;
            this.freezeStartTime = Date.now();
            setTimeout(() => { this.freezeActive = false; }, this.freezeDuration);
        }
    }

    /**
     * Shadow Clone behavior: chase + teleport near player
     */
    updateShadowCloneBehavior(deltaTime, distToTarget, dirToTarget) {
        this.teleportTimer -= deltaTime * 1000;

        if (this.teleportTimer <= 0 && distToTarget > 100) {
            // Teleport to a random position near the player
            this.teleportTimer = this.teleportCooldown;
            this.isTeleporting = true;
            this.teleportAlpha = 0;

            const angle = Math.random() * Math.PI * 2;
            const dist = 60 + Math.random() * 80;
            this.x = this.target.x + Math.cos(angle) * dist;
            this.y = this.target.y + Math.sin(angle) * dist;
            this.x = this.wrapCoord(this.x, CONFIG.ARENA.WIDTH);
            this.y = this.wrapCoord(this.y, CONFIG.ARENA.HEIGHT);
            this.position.set(this.x, this.y);

            setTimeout(() => {
                this.isTeleporting = false;
                this.teleportAlpha = 1;
            }, 300);
        }

        // Normal chase
        this.velocity.set(dirToTarget.x * this.speed, dirToTarget.y * this.speed);
    }

    /**
     * Void Devourer behavior: slow chase + gravitational pull on player
     */
    updateVoidDevourerBehavior(deltaTime, distToTarget, dirToTarget) {
        this.velocity.set(dirToTarget.x * this.speed, dirToTarget.y * this.speed);
        // Pull effect is applied by game.js checking this.pullRadius and this.pullForce
    }

    /**
     * Mech Sentinel behavior: chase + regenerate shield
     */
    updateMechSentinelBehavior(deltaTime, dirToTarget) {
        this.velocity.set(dirToTarget.x * this.speed, dirToTarget.y * this.speed);

        // Regenerate shield after delay
        if (this.shieldBroken) {
            this.shieldRegenTimer += deltaTime * 1000;
            if (this.shieldRegenTimer >= this.shieldRegenDelay) {
                this.shieldHP = this.maxShieldHP;
                this.shieldBroken = false;
                this.shieldRegenTimer = 0;
            }
        }
    }

    /**
     * Ember Sprinter: zigzag movement with periodic speed dashes
     */
    updateEmberSprinterBehavior(deltaTime, distToTarget, dirToTarget) {
        this.zigzagTimer += deltaTime * 1000;
        this.dashTimer += deltaTime * 1000;

        // Periodic dash  burst of speed toward player
        if (this.dashTimer >= this.dashCooldown && distToTarget < 300) {
            this.isDashing = true;
            this.dashTimer = 0;
            setTimeout(() => { this.isDashing = false; }, 400);
        }

        const speedMult = this.isDashing ? 2.5 : 1;

        // Zigzag perpendicular offset
        if (this.zigzagTimer >= 300) {
            this.zigzagTimer = 0;
            this.zigzagDir *= -1;
        }
        const perpX = -dirToTarget.y * this.zigzagDir * 0.5;
        const perpY = dirToTarget.x * this.zigzagDir * 0.5;

        this.velocity.set(
            (dirToTarget.x + perpX) * this.speed * speedMult,
            (dirToTarget.y + perpY) * this.speed * speedMult
        );
    }

    /**
     * Blizzard Wolf: circle around player then lunge attack
     */
    updateBlizzardWolfBehavior(deltaTime, distToTarget, dirToTarget) {
        this.lungeTimer += deltaTime * 1000;

        // Lunge attack
        if (this.isLunging) {
            this.velocity.set(this.lungeDir.x * this.speed * 3, this.lungeDir.y * this.speed * 3);
            return;
        }

        if (this.lungeTimer >= this.lungeCooldown && distToTarget < 200) {
            this.isLunging = true;
            this.lungeTimer = 0;
            this.lungeDir = new Vector2(dirToTarget.x, dirToTarget.y);
            setTimeout(() => { this.isLunging = false; }, 350);
            return;
        }

        // Circle around player at a distance
        if (distToTarget < 150) {
            this.circleAngle += deltaTime * 3 * this.circleDir;
            const orbitDist = 120;
            const targetX = this.target.x + Math.cos(this.circleAngle) * orbitDist;
            const targetY = this.target.y + Math.sin(this.circleAngle) * orbitDist;
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const len = Math.hypot(dx, dy) || 1;
            this.velocity.set((dx / len) * this.speed, (dy / len) * this.speed);
        } else {
            // Approach player
            this.velocity.set(dirToTarget.x * this.speed, dirToTarget.y * this.speed);
        }
    }

    /**
     * Spark Runner: erratic jittery movement + leaves electric trail
     */
    updateSparkRunnerBehavior(deltaTime, dirToTarget) {
        // Random jitter angle offset
        this.jitterAngle += (Math.random() - 0.5) * 8 * deltaTime;
        const jitterX = Math.cos(this.jitterAngle) * 0.4;
        const jitterY = Math.sin(this.jitterAngle) * 0.4;

        this.velocity.set(
            (dirToTarget.x + jitterX) * this.speed,
            (dirToTarget.y + jitterY) * this.speed
        );

        // Electric trail
        this.trailTimer += deltaTime * 1000;
        if (this.trailTimer >= 200) {
            this.trailTimer = 0;
            this.electricTrails.push({
                x: this.x, y: this.y, timer: 0, lifetime: 600
            });
        }
        for (let i = this.electricTrails.length - 1; i >= 0; i--) {
            this.electricTrails[i].timer += deltaTime * 1000;
            if (this.electricTrails[i].timer >= this.electricTrails[i].lifetime) {
                this.electricTrails.splice(i, 1);
            }
        }
    }

    /**
     * Phantasm: phases in and out, becoming invulnerable when phased
     */
    updatePhantasmBehavior(deltaTime, dirToTarget) {
        this.phaseTimer += deltaTime * 1000;

        if (this.phaseTimer >= this.phaseCooldown && !this.isPhased) {
            this.isPhased = true;
            this.phaseTimer = 0;
            this.phantasmAlpha = 0.15;
            setTimeout(() => {
                this.isPhased = false;
                this.phantasmAlpha = 1;
            }, 1000);
        }

        // Move faster when phased
        const speedMult = this.isPhased ? 1.8 : 1;
        this.velocity.set(
            dirToTarget.x * this.speed * speedMult,
            dirToTarget.y * this.speed * speedMult
        );
    }

    /**
     * Drone Swarm: orbit around player then dive in
     */
    updateDroneSwarmBehavior(deltaTime, distToTarget, dirToTarget) {
        this.diveTimer += deltaTime * 1000;

        // Dive attack
        if (this.isDiving) {
            this.velocity.set(dirToTarget.x * this.speed * 2.5, dirToTarget.y * this.speed * 2.5);
            return;
        }

        if (this.diveTimer >= this.diveCooldown && distToTarget < 200) {
            this.isDiving = true;
            this.diveTimer = 0;
            setTimeout(() => { this.isDiving = false; }, 500);
            return;
        }

        // Orbit at distance
        if (distToTarget < 180) {
            this.orbitAngle += deltaTime * 4 * this.orbitDir;
            const orbitDist = 100;
            const targetX = this.target.x + Math.cos(this.orbitAngle) * orbitDist;
            const targetY = this.target.y + Math.sin(this.orbitAngle) * orbitDist;
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const len = Math.hypot(dx, dy) || 1;
            this.velocity.set((dx / len) * this.speed, (dy / len) * this.speed);
        } else {
            this.velocity.set(dirToTarget.x * this.speed, dirToTarget.y * this.speed);
        }
    }

    /**
     * Override takeDamage for Mech Sentinel shield
     * Take damage with knockback
     * @param {number} amount 
     * @param {Entity} source 
     * @returns {boolean}
     */
    takeDamage(amount, source = null) {
        // Mech Sentinel: shield absorbs damage first
        if (this.type === 'mechSentinel' && this.shieldHP > 0) {
            const shieldAbsorbed = Math.min(this.shieldHP, amount);
            this.shieldHP -= shieldAbsorbed;
            amount -= shieldAbsorbed;
            if (this.shieldHP <= 0) {
                this.shieldBroken = true;
                this.shieldRegenTimer = 0;
            }
            if (amount <= 0) return false;
        }

        // Phantasm: invulnerable when phased
        if (this.type === 'phantasm' && this.isPhased) {
            return false;
        }

        const died = super.takeDamage(amount, source);

        // Apply knockback from damage source
        if (source && !died) {
            const dir = source.position.directionTo(this.position);
            this.applyKnockback(dir, 200);
        }

        return died;
    }

    /**
     * Explode (for exploder type)
     */
    explode() {
        this.hasExploded = true;
        this.active = false;
        // Explosion damage is handled by game.js
    }

    /**
     * Apply knockback
     * @param {Vector2} direction 
     * @param {number} force 
     */
    applyKnockback(direction, force) {
        this.knockbackVelocity.set(
            direction.x * force,
            direction.y * force
        );
    }

    /**
     * Draw enemy
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} camera 
     */
    draw(ctx, camera) {
        if (!this.active) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        ctx.save();

        // Damage flash
        if (this.damageFlash > 0) {
            ctx.globalAlpha = 0.7;
        }

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(screenX + 2, screenY + this.size * 0.7, this.size * 0.7, this.size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Exploder warning pulse (all exploder types)
        this.drawExplosionWarning(ctx, screenX, screenY);

        // Draw body with gradient
        const gradient = ctx.createRadialGradient(
            screenX - this.size * 0.3, screenY - this.size * 0.3, 0,
            screenX, screenY, this.size
        );

        // Lighter version of color for highlight
        gradient.addColorStop(0, this.lightenColor(this.color, 30));
        gradient.addColorStop(1, this.color);

        ctx.fillStyle = this.damageFlash > 0 ? '#ffffff' : gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Outline
        ctx.strokeStyle = this.darkenColor(this.color, 30);
        ctx.lineWidth = 2;
        ctx.stroke();

        // Eyes (looking at target)
        this.drawEyes(ctx, screenX, screenY);

        // Health bar for tanks and stronger enemies
        this.drawHealthBar(screenY, ctx, screenX);

        ctx.restore();

        // Draw ranged projectiles
        if (this.projectiles) {
            for (const proj of this.projectiles) {
                if (proj.active) {
                    proj.draw(ctx, camera);
                }
            }
        }
    }

    drawExplosionWarning(ctx, screenX, screenY) {
        if (this.isExploding && this.explosionRadius) {
            ctx.fillStyle = 'rgba(255, 100, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.explosionRadius * (1 + 0.2 * Math.sin(Date.now() / 100)), 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawHealthBar(screenY, ctx, screenX) {
        if (this.maxHealth > 30 && this.health < this.maxHealth) {
            const barWidth = this.size * 2;
            const barHeight = 4;
            const barY = screenY - this.size - 10;

            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);

            // Health
            const healthPercent = this.health / this.maxHealth;
            const condA = healthPercent > 0.25 ? '#ff9800' : '#f44336';
            ctx.fillStyle = healthPercent > 0.5 ? '#4caf50' : condA;
            ctx.fillRect(screenX - barWidth / 2, barY, barWidth * healthPercent, barHeight);
        }
    }

    drawEyes(ctx, screenX, screenY) {
        if (this.target) {
            const eyeAngle = this.position.angleTo(this.target.position);
            const eyeOffset = this.size * 0.3;
            const eyeSize = this.size * 0.2;

            // Eye whites
            ctx.fillStyle = '#ffffff';
            const leftEyeAngle = eyeAngle - 0.5;
            const rightEyeAngle = eyeAngle + 0.5;

            ctx.beginPath();
            ctx.arc(
                screenX + Math.cos(leftEyeAngle) * eyeOffset,
                screenY + Math.sin(leftEyeAngle) * eyeOffset,
                eyeSize, 0, Math.PI * 2
            );
            ctx.fill();
            ctx.beginPath();
            ctx.arc(
                screenX + Math.cos(rightEyeAngle) * eyeOffset,
                screenY + Math.sin(rightEyeAngle) * eyeOffset,
                eyeSize, 0, Math.PI * 2
            );
            ctx.fill();

            // Pupils
            const pupilOffset = eyeSize * 0.3;
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(
                screenX + Math.cos(leftEyeAngle) * eyeOffset + Math.cos(eyeAngle) * pupilOffset,
                screenY + Math.sin(leftEyeAngle) * eyeOffset + Math.sin(eyeAngle) * pupilOffset,
                eyeSize * 0.5, 0, Math.PI * 2
            );
            ctx.fill();
            ctx.beginPath();
            ctx.arc(
                screenX + Math.cos(rightEyeAngle) * eyeOffset + Math.cos(eyeAngle) * pupilOffset,
                screenY + Math.sin(rightEyeAngle) * eyeOffset + Math.sin(eyeAngle) * pupilOffset,
                eyeSize * 0.5, 0, Math.PI * 2
            );
            ctx.fill();
        }
    }

    /**
     * Render unique body shape for world enemies (replaces generic sprite)
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} opacity 
     */
    renderWorldEnemyBody(ctx, opacity) {
        ctx.globalAlpha = opacity;
        const t = Date.now();
        const s = this.size;
        const x = this.x;
        const y = this.y;
        const flash = this.damageFlash > 0;

        switch (this.type) {
            // ========== INFERNO CORE ==========

            case 'flameImp': {
                // Demon-like flame imp
                this.renderFlameImpBody(t, s, y, ctx, flash, x);
                break;
            }

            case 'magmaGolem': {
                // Large rocky humanoid with glowing lava cracks
                this.renderMagmaGolemBody(t, s, y, ctx, flash, x);
                break;
            }

            case 'emberSprinter': {
                // Lizard-like fire creature running fast
                this.renderEmberSprinter(t, s, ctx, x, y, flash);
                break;
            }

            case 'lavaCaster': {
                // Wizard-like fire mage with robe and floating lava orbs
                this.renderLavaCasterBody(t, s, y, ctx, x, flash);
                break;
            }

            case 'pyroBlob': {
                // Lava slime with bubbling surface and face
                this.renderLavaBlob(t, ctx, x, y, s, flash);
                break;
            }

            // ========== FROZEN WASTES ==========

            case 'iceWraith': {
                // Ghostly spectral figure with flowing robes and ice crystals
                this.renderEtherealRobe(ctx, t, s, y, x, flash);
                break;
            }

            case 'frostGiant': {
                // Massive humanoid ice warrior with armor and crown
                this.renderFrostGiantBody(t, s, y, ctx, flash, x);
                break;
            }

            case 'blizzardWolf': {
                // Proper wolf form with detailed anatomy
                this.renderWolfLegs(t, ctx, flash, x, s, y);
                break;
            }

            case 'frostArcher': {
                // Hooded archer figure with crystalline ice bow
                this.renderFrostArcher(t, s, y, ctx, flash, x);
                break;
            }

            case 'iceDetonator': {
                // Crystal cluster bomb, pulsating
                this.renderCrystalGlow(t, ctx, x, y, s, flash);
                break;
            }

            // ========== NEON NEXUS ==========

            case 'droneSwarm': {
                // Detailed quad-copter drone with spinning rotors
                this.renderDroneBody(s, t, ctx, x, y, flash);
                break;
            }

            case 'mechSentinel': {
                // Walking mech with legs, visor, and power core
                this.renderMechBody(t, s, y, ctx, flash, x);
                break;
            }

            case 'sparkRunner': {
                // Electric bolt creature (lightning bolt shaped runner)
                this.renderElectricArc(t, ctx, flash, x, s, y);
                break;
            }

            case 'laserTurret': {
                // Mechanical turret base with rotating barrel
                // Base (octagonal)
                this.renderLaserTurret(ctx, flash, x, s, y, t);
                break;
            }

            case 'emPulser': {
                // Energy core with circuit patterns and pulsing rings
                this.renderEnergyCore(t, s, ctx, x, y, flash);
                break;
            }

            // ========== SHADOW REALM ==========

            case 'shadowClone': {
                // Hooded shadow wraith with trailing darkness
                this.renderShadowedFigure(ctx, t, s, y, x, flash);
                break;
            }

            case 'voidDevourer': {
                // Monstrous spherical maw with teeth and single eye
                this.renderVoidDevourer(t, s, ctx, x, y, flash);
                break;
            }

            case 'phantasm': {
                // Ghostly phasing figure with ethereal effects
                this.renderPhantomAura(ctx, t, s, y, x, flash);
                break;
            }

            case 'darkCaster': {
                // Dark mage with staff and mystical orb
                this.renderDarkMage(t, s, y, ctx, flash, x);
                break;
            }

            case 'voidMine': {
                // Dark star-shaped mine with pulsing core and tendrils
                this.renderVoidMineEffects(t, ctx, x, s, y, flash);
                break;
            }

            default: {
                this.renderEnemyHighlight(ctx, x, s, y, flash);
                break;
            }
        }
        ctx.globalAlpha = 1;
    }

    renderEnemyHighlight(ctx, x, s, y, flash) {
        const grad = ctx.createRadialGradient(x - s * 0.3, y - s * 0.3, 0, x, y, s);
        grad.addColorStop(0, this.lightenColor(this.color, 30));
        grad.addColorStop(1, this.color);
        ctx.fillStyle = flash ? '#fff' : grad;
        ctx.beginPath();
        ctx.arc(x, y, s, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = this.darkenColor(this.color, 30);
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    renderVoidMineEffects(t, ctx, x, s, y, flash) {
        const pulse = 1 + Math.sin(t / 90) * 0.1;
        // Tendril extensions between spikes
        for (let i = 0; i < 4; i++) {
            const ta = (i / 4) * Math.PI * 2 + Math.PI / 4 + Math.sin(t / 300 + i) * 0.1;
            ctx.strokeStyle = `rgba(100, 0, 150, ${0.2 + Math.sin(t / 100 + i) * 0.1})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(ta) * s * 0.6, y + Math.sin(ta) * s * 0.6);
            ctx.quadraticCurveTo(
                x + Math.cos(ta + 0.3) * s * 1.3,
                y + Math.sin(ta + 0.3) * s * 1.3,
                x + Math.cos(ta + 0.5) * s * 0.8,
                y + Math.sin(ta + 0.5) * s * 0.8
            );
            ctx.stroke();
        }
        // Star body
        ctx.fillStyle = flash ? '#fff' : '#220044';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const isSpike = i % 2 === 0;
            const rr = s * pulse * (isSpike ? 1.1 : 0.55);
            const px = x + Math.cos(a) * rr;
            const py = y + Math.sin(a) * rr;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#7700bb';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Inner pattern
        ctx.strokeStyle = 'rgba(120, 0, 180, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2;
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(a) * s * 0.5, y + Math.sin(a) * s * 0.5);
        }
        ctx.stroke();
        // Core glow
        const cg = ctx.createRadialGradient(x, y, 0, x, y, s * 0.4);
        cg.addColorStop(0, `rgba(180, 0, 255, ${0.6 + Math.sin(t / 70) * 0.3})`);
        cg.addColorStop(0.5, `rgba(120, 0, 180, ${0.3 + Math.sin(t / 70) * 0.1})`);
        cg.addColorStop(1, 'rgba(60, 0, 100, 0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(x, y, s * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }

    renderDarkMage(t, s, y, ctx, flash, x) {
        const bob = Math.sin(t / 280) * s * 0.04;
        const bodyY = y + bob;
        // Legs peeking from robe
        ctx.fillStyle = flash ? '#fff' : '#220033';
        ctx.beginPath();
        ctx.moveTo(x - s * 0.15, bodyY + s * 0.5);
        ctx.lineTo(x - s * 0.25, bodyY + s * 0.85);
        ctx.lineTo(x - s * 0.05, bodyY + s * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + s * 0.15, bodyY + s * 0.5);
        ctx.lineTo(x + s * 0.25, bodyY + s * 0.85);
        ctx.lineTo(x + s * 0.05, bodyY + s * 0.8);
        ctx.closePath();
        ctx.fill();
        // Robe body
        const grad = ctx.createLinearGradient(x, bodyY - s * 0.5, x, bodyY + s * 0.6);
        grad.addColorStop(0, '#550088');
        grad.addColorStop(0.5, '#330055');
        grad.addColorStop(1, '#220033');
        ctx.fillStyle = flash ? '#fff' : grad;
        ctx.beginPath();
        ctx.moveTo(x, bodyY - s * 0.5);
        ctx.lineTo(x + s * 0.55, bodyY + s * 0.65);
        ctx.lineTo(x - s * 0.55, bodyY + s * 0.65);
        ctx.closePath();
        ctx.fill();
        // Robe trim
        ctx.strokeStyle = '#7700bb';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - s * 0.55, bodyY + s * 0.65);
        ctx.lineTo(x + s * 0.55, bodyY + s * 0.65);
        ctx.stroke();
        // Hood
        ctx.fillStyle = flash ? '#fff' : '#440066';
        ctx.beginPath();
        ctx.arc(x, bodyY - s * 0.35, s * 0.4, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        // Hood shadow
        ctx.fillStyle = '#220033';
        ctx.beginPath();
        ctx.arc(x, bodyY - s * 0.3, s * 0.28, Math.PI + 0.3, -0.3);
        ctx.closePath();
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#bb44ff';
        ctx.shadowColor = '#9900ff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x - s * 0.12, bodyY - s * 0.33, s * 0.06, 0, Math.PI * 2);
        ctx.arc(x + s * 0.12, bodyY - s * 0.33, s * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Staff (on right side)
        ctx.strokeStyle = '#664488';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + s * 0.55, bodyY - s * 0.9);
        ctx.lineTo(x + s * 0.55, bodyY + s * 0.6);
        ctx.stroke();
        // Staff crystal orb
        const orbPulse = 0.5 + Math.sin(t / 150) * 0.3;
        const orbGrad = ctx.createRadialGradient(x + s * 0.55, bodyY - s * 0.95, 0, x + s * 0.55, bodyY - s * 0.95, s * 0.2);
        orbGrad.addColorStop(0, `rgba(200, 100, 255, ${orbPulse})`);
        orbGrad.addColorStop(0.5, `rgba(150, 50, 220, ${orbPulse * 0.6})`);
        orbGrad.addColorStop(1, 'rgba(100, 0, 180, 0)');
        ctx.fillStyle = orbGrad;
        ctx.beginPath();
        ctx.arc(x + s * 0.55, bodyY - s * 0.95, s * 0.18, 0, Math.PI * 2);
        ctx.fill();
        // Left hand (casting gesture)
        ctx.fillStyle = flash ? '#fff' : '#440066';
        ctx.beginPath();
        ctx.arc(x - s * 0.55, bodyY + s * 0.1, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
    }

    renderPhantomAura(ctx, t, s, y, x, flash) {
        ctx.globalAlpha *= (this.isPhased ? 0.15 : (this.phantasmAlpha || 1));
        const bob = Math.sin(t / 350) * s * 0.06;
        const bodyY = y + bob;
        // Ethereal aura
        const auraGrad = ctx.createRadialGradient(x, bodyY, s * 0.3, x, bodyY, s * 1.2);
        auraGrad.addColorStop(0, 'rgba(150, 60, 200, 0.05)');
        auraGrad.addColorStop(1, 'rgba(80, 20, 120, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(x, bodyY, s * 1.2, 0, Math.PI * 2);
        ctx.fill();
        // Main body blob (semi-transparent)
        const grad = ctx.createRadialGradient(x, bodyY, 0, x, bodyY, s * 0.85);
        grad.addColorStop(0, 'rgba(160, 80, 220, 0.7)');
        grad.addColorStop(0.5, 'rgba(120, 40, 180, 0.5)');
        grad.addColorStop(1, 'rgba(80, 20, 120, 0.1)');
        ctx.fillStyle = flash ? '#fff' : grad;
        ctx.beginPath();
        // Wavy blob shape
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            const rr = s * 0.75 + Math.sin(t / 200 + i * 1.3) * s * 0.08;
            const px = x + Math.cos(a) * rr;
            const py = bodyY + Math.sin(a) * rr * 0.9;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        // Hollow eyes (dark holes with glowing pupils)
        ctx.fillStyle = '#220033';
        ctx.beginPath();
        ctx.ellipse(x - s * 0.22, bodyY - s * 0.15, s * 0.16, s * 0.2, 0, 0, Math.PI * 2);
        ctx.ellipse(x + s * 0.22, bodyY - s * 0.15, s * 0.16, s * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff66ff';
        ctx.shadowColor = '#cc00ff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x - s * 0.22, bodyY - s * 0.15, s * 0.06, 0, Math.PI * 2);
        ctx.arc(x + s * 0.22, bodyY - s * 0.15, s * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Mouth (jagged)
        ctx.strokeStyle = '#440066';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - s * 0.25, bodyY + s * 0.2);
        for (let i = 0; i < 6; i++) {
            ctx.lineTo(x - s * 0.25 + (i + 0.5) * s * 0.1, bodyY + s * 0.2 + (i % 2 === 0 ? s * 0.1 : -s * 0.08));
        }
        ctx.stroke();
    }

    renderVoidDevourer(t, s, ctx, x, y, flash) {
        const breathe = Math.sin(t / 200) * s * 0.05;
        // Body
        const grad = ctx.createRadialGradient(x, y, 0, x, y, s + breathe);
        grad.addColorStop(0, '#220044');
        grad.addColorStop(0.6, '#110022');
        grad.addColorStop(1, '#050010');
        ctx.fillStyle = flash ? '#fff' : grad;
        ctx.beginPath();
        ctx.arc(x, y, s + breathe, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#660099';
        ctx.lineWidth = 3;
        ctx.stroke();
        // Tentacle-like spikes around body
        for (let i = 0; i < 6; i++) {
            const sa = (i / 6) * Math.PI * 2 + Math.sin(t / 300 + i) * 0.15;
            const slen = s * 0.3 + Math.sin(t / 150 + i * 2) * s * 0.1;
            ctx.strokeStyle = `rgba(80, 0, 120, 0.6)`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(sa) * s, y + Math.sin(sa) * s);
            ctx.quadraticCurveTo(
                x + Math.cos(sa + 0.2) * (s + slen * 0.6),
                y + Math.sin(sa + 0.2) * (s + slen * 0.6),
                x + Math.cos(sa) * (s + slen),
                y + Math.sin(sa) * (s + slen)
            );
            ctx.stroke();
        }
        // Gaping maw
        const mouthOpen = s * 0.3 + Math.sin(t / 200) * s * 0.1;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(x, y + s * 0.15, s * 0.5, mouthOpen, 0, 0, Math.PI * 2);
        ctx.fill();
        // Teeth
        ctx.fillStyle = '#9944cc';
        for (let i = 0; i < 8; i++) {
            const ta = -0.7 + (i / 7) * 1.4;
            const tx2 = x + Math.cos(ta + Math.PI / 2) * s * 0.45;
            const ty2 = y + s * 0.15 - mouthOpen * 0.8;
            ctx.beginPath();
            ctx.moveTo(tx2 - 3, ty2);
            ctx.lineTo(tx2, ty2 + mouthOpen * 0.4);
            ctx.lineTo(tx2 + 3, ty2);
            ctx.closePath();
            ctx.fill();
            // Bottom teeth
            const ty3 = y + s * 0.15 + mouthOpen * 0.8;
            ctx.beginPath();
            ctx.moveTo(tx2 - 3, ty3);
            ctx.lineTo(tx2, ty3 - mouthOpen * 0.3);
            ctx.lineTo(tx2 + 3, ty3);
            ctx.closePath();
            ctx.fill();
        }
        // Giant eye above mouth
        ctx.fillStyle = '#ff00ff';
        ctx.shadowColor = '#cc00ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(x, y - s * 0.35, s * 0.22, 0, Math.PI * 2);
        ctx.fill();
        // Iris
        ctx.fillStyle = '#220044';
        ctx.beginPath();
        ctx.arc(x, y - s * 0.35, s * 0.12, 0, Math.PI * 2);
        ctx.fill();
        // Pupil (tracks player)
        const trackX = this.target ? Math.sign(this.target.x - x) * s * 0.04 : 0;
        const trackY = this.target ? Math.sign(this.target.y - y) * s * 0.03 : 0;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x + trackX, y - s * 0.35 + trackY, s * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    renderShadowedFigure(ctx, t, s, y, x, flash) {
        ctx.globalAlpha *= (this.isTeleporting ? 0.3 : 0.85);
        const bob = Math.sin(t / 250) * s * 0.05;
        const bodyY = y + bob;
        // Shadow trail
        for (let i = 0; i < 3; i++) {
            const trailAlpha = 0.05 - i * 0.015;
            const trailOff = (i + 1) * s * 0.15;
            ctx.fillStyle = `rgba(40, 0, 60, ${trailAlpha})`;
            ctx.beginPath();
            ctx.ellipse(x, bodyY + trailOff, s * (0.4 - i * 0.05), s * (0.6 - i * 0.1), 0, 0, Math.PI * 2);
            ctx.fill();
        }
        // Flowing wisps at bottom
        for (let i = 0; i < 3; i++) {
            const wa = (t / 350) + i * 2.1;
            ctx.strokeStyle = `rgba(100, 0, 160, ${0.15 + Math.sin(t / 120 + i) * 0.08})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + (i - 1) * s * 0.2, bodyY + s * 0.6);
            ctx.quadraticCurveTo(x + Math.sin(wa) * s * 0.4, bodyY + s * 0.9, x + Math.sin(wa) * s * 0.2, bodyY + s * 1.2);
            ctx.stroke();
        }
        // Body (robed figure)
        const grad = ctx.createRadialGradient(x, bodyY, 0, x, bodyY, s);
        grad.addColorStop(0, '#440077');
        grad.addColorStop(0.5, '#220044');
        grad.addColorStop(1, 'rgba(20, 0, 30, 0.3)');
        ctx.fillStyle = flash ? '#fff' : grad;
        // Head
        ctx.beginPath();
        ctx.arc(x, bodyY - s * 0.4, s * 0.38, 0, Math.PI * 2);
        ctx.fill();
        // Body cloak
        ctx.beginPath();
        ctx.moveTo(x - s * 0.45, bodyY - s * 0.1);
        ctx.lineTo(x + s * 0.45, bodyY - s * 0.1);
        ctx.lineTo(x + s * 0.3, bodyY + s * 0.7);
        ctx.lineTo(x - s * 0.3, bodyY + s * 0.7);
        ctx.closePath();
        ctx.fill();
        // Hood
        ctx.fillStyle = '#1a0033';
        ctx.beginPath();
        ctx.arc(x, bodyY - s * 0.45, s * 0.35, Math.PI + 0.4, -0.4);
        ctx.lineTo(x + s * 0.3, bodyY - s * 0.15);
        ctx.lineTo(x - s * 0.3, bodyY - s * 0.15);
        ctx.closePath();
        ctx.fill();
        // Arms
        ctx.fillStyle = flash ? '#fff' : '#330055';
        ctx.beginPath();
        ctx.moveTo(x - s * 0.45, bodyY);
        ctx.lineTo(x - s * 0.8, bodyY + s * 0.15 + Math.sin(t / 200) * s * 0.05);
        ctx.lineTo(x - s * 0.75, bodyY + s * 0.3 + Math.sin(t / 200) * s * 0.05);
        ctx.lineTo(x - s * 0.4, bodyY + s * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + s * 0.45, bodyY);
        ctx.lineTo(x + s * 0.8, bodyY + s * 0.15 - Math.sin(t / 200) * s * 0.05);
        ctx.lineTo(x + s * 0.75, bodyY + s * 0.3 - Math.sin(t / 200) * s * 0.05);
        ctx.lineTo(x + s * 0.4, bodyY + s * 0.15);
        ctx.closePath();
        ctx.fill();
        // Eyes (glowing purple)
        ctx.fillStyle = '#cc44ff';
        ctx.shadowColor = '#aa00ff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x - s * 0.12, bodyY - s * 0.42, s * 0.07, 0, Math.PI * 2);
        ctx.arc(x + s * 0.12, bodyY - s * 0.42, s * 0.07, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    renderEnergyCore(t, s, ctx, x, y, flash) {
        const pulse = 1 + Math.sin(t / 80) * 0.12;
        // Outer pulsing rings
        for (let i = 2; i >= 0; i--) {
            const rr = s * (0.5 + i * 0.25) * pulse + Math.sin(t / 100 + i) * 3;
            ctx.strokeStyle = `rgba(0, 255, 136, ${0.15 - i * 0.04 + Math.sin(t / 60 + i) * 0.05})`;
            ctx.lineWidth = 2 - i * 0.3;
            ctx.beginPath();
            ctx.arc(x, y, rr, 0, Math.PI * 2);
            ctx.stroke();
        }
        // Core body
        const grad = ctx.createRadialGradient(x, y, 0, x, y, s * pulse * 0.8);
        grad.addColorStop(0, '#88ffbb');
        grad.addColorStop(0.4, '#22dd88');
        grad.addColorStop(0.8, '#006633');
        grad.addColorStop(1, '#003311');
        ctx.fillStyle = flash ? '#fff' : grad;
        ctx.beginPath();
        ctx.arc(x, y, s * 0.7 * pulse, 0, Math.PI * 2);
        ctx.fill();
        // Circuit pattern on surface
        ctx.strokeStyle = 'rgba(0, 255, 180, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const ca = (i / 4) * Math.PI * 2 + t / 2000;
            const cr = s * 0.4 * pulse;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(ca) * cr, y + Math.sin(ca) * cr);
            ctx.stroke();
            ctx.fillStyle = 'rgba(0, 255, 180, 0.3)';
            ctx.beginPath();
            ctx.arc(x + Math.cos(ca) * cr, y + Math.sin(ca) * cr, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        // Center bright spot
        ctx.fillStyle = `rgba(200, 255, 230, ${0.5 + Math.sin(t / 40) * 0.3})`;
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x, y, s * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    renderLaserTurret(ctx, flash, x, s, y, t) {
        ctx.fillStyle = flash ? '#fff' : '#1a3333';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
            const px = x + Math.cos(a) * s * 0.8;
            const py = y + Math.sin(a) * s * 0.8;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Inner ring
        ctx.strokeStyle = '#00aa88';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, s * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        // Rotating barrel
        const barrelAngle = this.target ? Math.atan2(this.target.y - y, this.target.x - x) : (t / 500);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(barrelAngle);
        // Barrel body
        ctx.fillStyle = '#0a2222';
        ctx.fillRect(0, -s * 0.1, s * 1.2, s * 0.2);
        ctx.strokeStyle = '#00ddaa';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(0, -s * 0.1, s * 1.2, s * 0.2);
        // Barrel tip glow
        ctx.fillStyle = `rgba(0, 255, 200, ${0.4 + Math.sin(t / 80) * 0.3})`;
        ctx.beginPath();
        ctx.arc(s * 1.2, 0, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // Center core
        ctx.fillStyle = `rgba(0, 255, 200, ${0.5 + Math.sin(t / 100) * 0.3})`;
        ctx.beginPath();
        ctx.arc(x, y, s * 0.2, 0, Math.PI * 2);
        ctx.fill();
    }

    renderElectricArc(t, ctx, flash, x, s, y) {
        const flash2 = Math.sin(t / 40) > 0.5 ? 0.15 : 0;
        ctx.fillStyle = flash ? '#fff' : '#22dd88';
        ctx.shadowColor = '#00ffaa';
        ctx.shadowBlur = 6 + flash2 * 10;
        // Lightning bolt body shape
        ctx.beginPath();
        ctx.moveTo(x - s * 0.15, y - s * 0.9);
        ctx.lineTo(x + s * 0.5, y - s * 0.15);
        ctx.lineTo(x + s * 0.05, y - s * 0.05);
        ctx.lineTo(x + s * 0.25, y + s * 0.9);
        ctx.lineTo(x - s * 0.45, y + s * 0.05);
        ctx.lineTo(x - s * 0.05, y + s * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        // Inner glow core
        ctx.fillStyle = `rgba(150, 255, 220, ${0.4 + Math.sin(t / 50) * 0.3})`;
        ctx.beginPath();
        ctx.arc(x, y, s * 0.25, 0, Math.PI * 2);
        ctx.fill();
        // Electric arcs around body
        ctx.strokeStyle = `rgba(0, 255, 180, ${0.3 + Math.sin(t / 30) * 0.2})`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const aa = (t / 200) + i * 2.1;
            const arcR = s * 0.7 + Math.sin(t / 60 + i) * s * 0.15;
            ctx.beginPath();
            ctx.arc(x, y, arcR, aa, aa + 0.8);
            ctx.stroke();
        }
    }

    renderMechBody(t, s, y, ctx, flash, x) {
        const bob = Math.sin(t / 200) * s * 0.03;
        const bodyY = y + bob;
        // Legs (mechanical)
        ctx.fillStyle = flash ? '#fff' : '#2a3a2a';
        const legStep = Math.sin(t / 180) * s * 0.1;
        // Left leg segments
        ctx.strokeStyle = '#00cc66';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x - s * 0.3, bodyY + s * 0.5);
        ctx.lineTo(x - s * 0.4, bodyY + s * 0.8 + legStep);
        ctx.lineTo(x - s * 0.35, bodyY + s * 1 + legStep);
        ctx.stroke();
        // Right leg segments
        ctx.beginPath();
        ctx.moveTo(x + s * 0.3, bodyY + s * 0.5);
        ctx.lineTo(x + s * 0.4, bodyY + s * 0.8 - legStep);
        ctx.lineTo(x + s * 0.35, bodyY + s * 1 - legStep);
        ctx.stroke();
        // Knee joints
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(x - s * 0.4, bodyY + s * 0.8 + legStep, s * 0.06, 0, Math.PI * 2);
        ctx.arc(x + s * 0.4, bodyY + s * 0.8 - legStep, s * 0.06, 0, Math.PI * 2);
        ctx.fill();
        // Main body (rounded rectangle with armor)
        const bGrad2 = ctx.createRadialGradient(x, bodyY, 0, x, bodyY, s);
        bGrad2.addColorStop(0, '#334433');
        bGrad2.addColorStop(1, '#1a2a1a');
        ctx.fillStyle = flash ? '#fff' : bGrad2;
        const r = s * 0.12;
        const hs2 = s * 0.7;
        ctx.beginPath();
        ctx.moveTo(x - hs2 + r, bodyY - hs2);
        ctx.lineTo(x + hs2 - r, bodyY - hs2);
        ctx.quadraticCurveTo(x + hs2, bodyY - hs2, x + hs2, bodyY - hs2 + r);
        ctx.lineTo(x + hs2, bodyY + hs2 - r);
        ctx.quadraticCurveTo(x + hs2, bodyY + hs2, x + hs2 - r, bodyY + hs2);
        ctx.lineTo(x - hs2 + r, bodyY + hs2);
        ctx.quadraticCurveTo(x - hs2, bodyY + hs2, x - hs2, bodyY + hs2 - r);
        ctx.lineTo(x - hs2, bodyY - hs2 + r);
        ctx.quadraticCurveTo(x - hs2, bodyY - hs2, x - hs2 + r, bodyY - hs2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#00cc66';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Visor (glowing bar)
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 10;
        ctx.fillRect(x - s * 0.4, bodyY - s * 0.25, s * 0.8, s * 0.12);
        ctx.shadowBlur = 0;
        // Power core (center glow)
        ctx.fillStyle = `rgba(0, 255, 136, ${0.4 + Math.sin(t / 100) * 0.2})`;
        ctx.beginPath();
        ctx.arc(x, bodyY + s * 0.15, s * 0.12, 0, Math.PI * 2);
        ctx.fill();
        // Shoulder armor
        ctx.fillStyle = '#2a4a2a';
        ctx.fillRect(x - s * 0.85, bodyY - s * 0.5, s * 0.2, s * 0.35);
        ctx.fillRect(x + s * 0.65, bodyY - s * 0.5, s * 0.2, s * 0.35);
        ctx.strokeStyle = '#00aa66';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - s * 0.85, bodyY - s * 0.5, s * 0.2, s * 0.35);
        ctx.strokeRect(x + s * 0.65, bodyY - s * 0.5, s * 0.2, s * 0.35);
    }

    renderDroneBody(s, t, ctx, x, y, flash) {
        const hs = s * 0.5;
        const tilt = Math.sin(t / 200) * 0.05;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(tilt);
        // Main chassis
        ctx.fillStyle = flash ? '#fff' : '#1a3322';
        ctx.fillRect(-hs * 0.7, -hs * 0.4, hs * 1.4, hs * 0.8);
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-hs * 0.7, -hs * 0.4, hs * 1.4, hs * 0.8);
        // Cross support beams
        ctx.strokeStyle = '#00cc66';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-hs * 0.7, -hs * 0.4); ctx.lineTo(-hs * 1.2, -hs * 1);
        ctx.moveTo(hs * 0.7, -hs * 0.4); ctx.lineTo(hs * 1.2, -hs * 1);
        ctx.moveTo(-hs * 0.7, hs * 0.4); ctx.lineTo(-hs * 1.2, hs * 1);
        ctx.moveTo(hs * 0.7, hs * 0.4); ctx.lineTo(hs * 1.2, hs * 1);
        ctx.stroke();
        // Rotor motors (circles at arm ends)
        const rotorPositions = [[-1.2, -1], [1.2, -1], [-1.2, 1], [1.2, 1]];
        rotorPositions.forEach(([rx, ry], i) => {
            ctx.fillStyle = '#0a1a0a';
            ctx.beginPath();
            ctx.arc(hs * rx, hs * ry, hs * 0.25, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#00aa66';
            ctx.lineWidth = 1;
            ctx.stroke();
            // Spinning rotor blade
            const spin = t / 20 + i * 1.5;
            ctx.strokeStyle = `rgba(0, 255, 136, 0.4)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(hs * rx + Math.cos(spin) * hs * 0.6, hs * ry + Math.sin(spin) * hs * 0.6);
            ctx.lineTo(hs * rx - Math.cos(spin) * hs * 0.6, hs * ry - Math.sin(spin) * hs * 0.6);
            ctx.stroke();
        });
        // Center LED
        ctx.fillStyle = `rgba(0, 255, 136, ${0.5 + Math.sin(t / 80) * 0.3})`;
        ctx.beginPath();
        ctx.arc(0, 0, hs * 0.15, 0, Math.PI * 2);
        ctx.fill();
        // Camera lens
        ctx.fillStyle = '#001100';
        ctx.beginPath();
        ctx.arc(0, hs * 0.15, hs * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    renderCrystalGlow(t, ctx, x, y, s, flash) {
        const pulse = 1 + Math.sin(t / 100) * 0.1;
        // Glow ring
        const glowGrad = ctx.createRadialGradient(x, y, s * 0.3, x, y, s * 1.2 * pulse);
        glowGrad.addColorStop(0, 'rgba(100, 200, 255, 0.15)');
        glowGrad.addColorStop(1, 'rgba(60, 150, 220, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(x, y, s * 1.2 * pulse, 0, Math.PI * 2);
        ctx.fill();
        // Main crystal body (multifaceted diamond)
        ctx.fillStyle = flash ? '#fff' : '#55ccee';
        ctx.beginPath();
        ctx.moveTo(x, y - s * pulse);
        ctx.lineTo(x + s * 0.4 * pulse, y - s * 0.3 * pulse);
        ctx.lineTo(x + s * 0.7 * pulse, y);
        ctx.lineTo(x + s * 0.4 * pulse, y + s * 0.3 * pulse);
        ctx.lineTo(x, y + s * 0.7 * pulse);
        ctx.lineTo(x - s * 0.4 * pulse, y + s * 0.3 * pulse);
        ctx.lineTo(x - s * 0.7 * pulse, y);
        ctx.lineTo(x - s * 0.4 * pulse, y - s * 0.3 * pulse);
        ctx.closePath();
        ctx.fill();
        // Facet highlight
        ctx.fillStyle = 'rgba(200, 240, 255, 0.4)';
        ctx.beginPath();
        ctx.moveTo(x, y - s * pulse);
        ctx.lineTo(x + s * 0.15, y - s * 0.15);
        ctx.lineTo(x - s * 0.15, y - s * 0.15);
        ctx.closePath();
        ctx.fill();
        // Small orbiting crystals
        for (let i = 0; i < 4; i++) {
            const ca = (t / 300) + i * (Math.PI / 2);
            const cd = s * 0.8 * pulse;
            const cx = x + Math.cos(ca) * cd;
            const cy = y + Math.sin(ca) * cd * 0.6;
            ctx.fillStyle = `rgba(150, 230, 255, ${0.4 + Math.sin(t / 80 + i) * 0.2})`;
            ctx.beginPath();
            ctx.moveTo(cx, cy - s * 0.12);
            ctx.lineTo(cx + s * 0.06, cy);
            ctx.lineTo(cx, cy + s * 0.08);
            ctx.lineTo(cx - s * 0.06, cy);
            ctx.closePath();
            ctx.fill();
        }
        // Center energy core
        ctx.fillStyle = `rgba(180, 240, 255, ${0.5 + Math.sin(t / 50) * 0.3})`;
        ctx.shadowColor = '#00ccff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x, y, s * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    renderFrostArcher(t, s, y, ctx, flash, x) {
        const bob = Math.sin(t / 280) * s * 0.04;
        const bodyY = y + bob;
        // Legs
        ctx.fillStyle = flash ? '#fff' : '#2a5577';
        ctx.beginPath();
        ctx.moveTo(x - s * 0.2, bodyY + s * 0.4);
        ctx.lineTo(x - s * 0.3, bodyY + s * 0.9);
        ctx.lineTo(x - s * 0.1, bodyY + s * 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + s * 0.2, bodyY + s * 0.4);
        ctx.lineTo(x + s * 0.3, bodyY + s * 0.9);
        ctx.lineTo(x + s * 0.1, bodyY + s * 0.85);
        ctx.closePath();
        ctx.fill();
        // Body (triangular cloak)
        const grad = ctx.createLinearGradient(x, bodyY - s * 0.5, x, bodyY + s * 0.6);
        grad.addColorStop(0, '#4488bb');
        grad.addColorStop(0.6, '#336699');
        grad.addColorStop(1, '#225577');
        ctx.fillStyle = flash ? '#fff' : grad;
        ctx.beginPath();
        ctx.moveTo(x, bodyY - s * 0.7);
        ctx.lineTo(x + s * 0.55, bodyY + s * 0.6);
        ctx.lineTo(x - s * 0.55, bodyY + s * 0.6);
        ctx.closePath();
        ctx.fill();
        // Cloak clasp
        ctx.fillStyle = '#88ddff';
        ctx.beginPath();
        ctx.arc(x, bodyY - s * 0.15, s * 0.07, 0, Math.PI * 2);
        ctx.fill();
        // Left arm (holds bow grip)
        ctx.fillStyle = flash ? '#fff' : '#3a7799';
        ctx.beginPath();
        ctx.moveTo(x + s * 0.25, bodyY - s * 0.1);
        ctx.quadraticCurveTo(x + s * 0.45, bodyY - s * 0.15, x + s * 0.55, bodyY - s * 0.05);
        ctx.lineTo(x + s * 0.5, bodyY + s * 0.1);
        ctx.quadraticCurveTo(x + s * 0.4, bodyY + s * 0.05, x + s * 0.2, bodyY + s * 0.05);
        ctx.closePath();
        ctx.fill();
        // Left hand (gripping bow)
        ctx.fillStyle = flash ? '#fff' : '#5599bb';
        ctx.beginPath();
        ctx.arc(x + s * 0.55, bodyY, s * 0.08, 0, Math.PI * 2);
        ctx.fill();
        // Right arm (pulling string back)
        ctx.fillStyle = flash ? '#fff' : '#3a7799';
        ctx.beginPath();
        ctx.moveTo(x - s * 0.15, bodyY - s * 0.05);
        ctx.quadraticCurveTo(x - s * 0.1, bodyY + s * 0.05, x + s * 0.05, bodyY + s * 0.02);
        ctx.lineTo(x + s * 0.1, bodyY + s * 0.12);
        ctx.quadraticCurveTo(x - s * 0.05, bodyY + s * 0.15, x - s * 0.2, bodyY + s * 0.1);
        ctx.closePath();
        ctx.fill();
        // Right hand (at string)
        ctx.fillStyle = flash ? '#fff' : '#5599bb';
        ctx.beginPath();
        ctx.arc(x + s * 0.08, bodyY + s * 0.02, s * 0.065, 0, Math.PI * 2);
        ctx.fill();
        // Hood
        ctx.fillStyle = flash ? '#fff' : '#3a7799';
        ctx.beginPath();
        ctx.arc(x, bodyY - s * 0.35, s * 0.4, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        // Hood shadow
        ctx.fillStyle = '#1a4466';
        ctx.beginPath();
        ctx.arc(x, bodyY - s * 0.3, s * 0.27, Math.PI + 0.3, -0.3);
        ctx.closePath();
        ctx.fill();
        // Eyes (glowing under hood)
        ctx.fillStyle = '#66ddff';
        ctx.shadowColor = '#00ccff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(x - s * 0.1, bodyY - s * 0.35, s * 0.06, 0, Math.PI * 2);
        ctx.arc(x + s * 0.1, bodyY - s * 0.35, s * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Ice bow (on right side, held by left hand)
        ctx.strokeStyle = '#88ddff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x + s * 0.6, bodyY, s * 0.5, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();
        // Bow tips (small diamond decorations)
        const bowTopX = x + s * 0.6 + Math.cos(-Math.PI * 0.4) * s * 0.5;
        const bowTopY = bodyY + Math.sin(-Math.PI * 0.4) * s * 0.5;
        const bowBotX = x + s * 0.6 + Math.cos(Math.PI * 0.4) * s * 0.5;
        const bowBotY = bodyY + Math.sin(Math.PI * 0.4) * s * 0.5;
        ctx.fillStyle = '#aaeeff';
        ctx.beginPath();
        ctx.moveTo(bowTopX, bowTopY - s * 0.04);
        ctx.lineTo(bowTopX + s * 0.03, bowTopY);
        ctx.lineTo(bowTopX, bowTopY + s * 0.04);
        ctx.lineTo(bowTopX - s * 0.03, bowTopY);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bowBotX, bowBotY - s * 0.04);
        ctx.lineTo(bowBotX + s * 0.03, bowBotY);
        ctx.lineTo(bowBotX, bowBotY + s * 0.04);
        ctx.lineTo(bowBotX - s * 0.03, bowBotY);
        ctx.closePath();
        ctx.fill();
        // Bowstring (taut, pulled back to right hand)
        ctx.strokeStyle = '#aaeeff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bowTopX, bowTopY);
        ctx.lineTo(x + s * 0.08, bodyY + s * 0.02);
        ctx.lineTo(bowBotX, bowBotY);
        ctx.stroke();
        // Arrow nocked (from hand to tip)
        ctx.strokeStyle = '#ccf0ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + s * 0.08, bodyY + s * 0.02);
        ctx.lineTo(x + s * 1.1, bodyY);
        ctx.stroke();
        // Arrowhead
        ctx.fillStyle = '#aaeeff';
        ctx.beginPath();
        ctx.moveTo(x + s * 1.15, bodyY);
        ctx.lineTo(x + s * 1.05, bodyY - s * 0.07);
        ctx.lineTo(x + s * 1.05, bodyY + s * 0.07);
        ctx.closePath();
        ctx.fill();
    }

    renderWolfLegs(t, ctx, flash, x, s, y) {
        const facing = this.velocity.x >= 0 ? 1 : -1;
        const runCycle = Math.sin(t / 100) * 0.25;
        // Legs (4 animated)
        ctx.fillStyle = flash ? '#fff' : '#7799bb';
        // Front legs
        ctx.beginPath();
        ctx.moveTo(x + s * 0.4 * facing, y + s * 0.1);
        ctx.lineTo(x + s * 0.5 * facing, y + s * 0.55 + runCycle * s * 0.12);
        ctx.lineTo(x + s * 0.55 * facing, y + s * 0.6 + runCycle * s * 0.12);
        ctx.lineTo(x + s * 0.42 * facing, y + s * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + s * 0.25 * facing, y + s * 0.1);
        ctx.lineTo(x + s * 0.3 * facing, y + s * 0.55 - runCycle * s * 0.12);
        ctx.lineTo(x + s * 0.35 * facing, y + s * 0.6 - runCycle * s * 0.12);
        ctx.lineTo(x + s * 0.27 * facing, y + s * 0.15);
        ctx.closePath();
        ctx.fill();
        // Back legs
        ctx.beginPath();
        ctx.moveTo(x - s * 0.4 * facing, y + s * 0.1);
        ctx.lineTo(x - s * 0.5 * facing, y + s * 0.55 - runCycle * s * 0.12);
        ctx.lineTo(x - s * 0.45 * facing, y + s * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x - s * 0.55 * facing, y + s * 0.1);
        ctx.lineTo(x - s * 0.65 * facing, y + s * 0.55 + runCycle * s * 0.12);
        ctx.lineTo(x - s * 0.57 * facing, y + s * 0.15);
        ctx.closePath();
        ctx.fill();
        // Body
        const wolfGrad = ctx.createLinearGradient(x, y - s * 0.3, x, y + s * 0.3);
        wolfGrad.addColorStop(0, '#cceeff');
        wolfGrad.addColorStop(0.5, '#aaddff');
        wolfGrad.addColorStop(1, '#88bbdd');
        ctx.fillStyle = flash ? '#fff' : wolfGrad;
        ctx.beginPath();
        ctx.ellipse(x, y, s * 0.85, s * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Fur texture
        ctx.strokeStyle = 'rgba(200, 230, 255, 0.3)';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 5; i++) {
            const fx = x + (i - 2) * s * 0.25 * facing;
            ctx.beginPath();
            ctx.moveTo(fx, y - s * 0.2);
            ctx.lineTo(fx + s * 0.05, y - s * 0.3);
            ctx.stroke();
        }
        // Head (snout)
        ctx.fillStyle = flash ? '#fff' : '#bbddee';
        ctx.beginPath();
        ctx.moveTo(x + s * 0.7 * facing, y - s * 0.15);
        ctx.lineTo(x + s * 1.15 * facing, y - s * 0.05);
        ctx.lineTo(x + s * 0.7 * facing, y + s * 0.12);
        ctx.closePath();
        ctx.fill();
        // Ears
        ctx.fillStyle = flash ? '#fff' : '#99ccdd';
        ctx.beginPath();
        ctx.moveTo(x + s * 0.55 * facing, y - s * 0.25);
        ctx.lineTo(x + s * 0.45 * facing, y - s * 0.65);
        ctx.lineTo(x + s * 0.35 * facing, y - s * 0.2);
        ctx.closePath();
        ctx.fill();
        // Tail (fluffy, icy)
        const tailOff = Math.sin(t / 100) * s * 0.15;
        ctx.fillStyle = 'rgba(180, 220, 255, 0.6)';
        ctx.beginPath();
        ctx.moveTo(x - s * 0.75 * facing, y - s * 0.05);
        ctx.quadraticCurveTo(x - s * 1.3 * facing, y - s * 0.5 + tailOff, x - s * 1.4 * facing, y - s * 0.1 + tailOff);
        ctx.quadraticCurveTo(x - s * 1.2 * facing, y + s * 0.2 + tailOff, x - s * 0.75 * facing, y + s * 0.1);
        ctx.fill();
        // Eye
        ctx.fillStyle = '#00ddff';
        ctx.shadowColor = '#00ccff';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(x + s * 0.65 * facing, y - s * 0.15, s * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    renderFrostGiantBody(t, s, y, ctx, flash, x) {
        const bob = Math.sin(t / 350) * s * 0.03;
        const bodyY = y + bob;
        // Legs
        ctx.fillStyle = flash ? '#fff' : '#2a6688';
        ctx.beginPath();
        ctx.moveTo(x - s * 0.35, bodyY + s * 0.25);
        ctx.lineTo(x - s * 0.5, bodyY + s * 0.9);
        ctx.lineTo(x - s * 0.15, bodyY + s * 0.9);
        ctx.lineTo(x - s * 0.1, bodyY + s * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + s * 0.1, bodyY + s * 0.25);
        ctx.lineTo(x + s * 0.15, bodyY + s * 0.9);
        ctx.lineTo(x + s * 0.5, bodyY + s * 0.9);
        ctx.lineTo(x + s * 0.35, bodyY + s * 0.25);
        ctx.closePath();
        ctx.fill();
        // Body (pentagon armor)
        const bGrad = ctx.createRadialGradient(x, bodyY - s * 0.2, 0, x, bodyY, s);
        bGrad.addColorStop(0, '#b0e0ff');
        bGrad.addColorStop(0.5, '#4499cc');
        bGrad.addColorStop(1, '#1a5577');
        ctx.fillStyle = flash ? '#fff' : bGrad;
        ctx.beginPath();
        ctx.moveTo(x, bodyY - s * 0.8);
        ctx.lineTo(x + s * 0.75, bodyY - s * 0.2);
        ctx.lineTo(x + s * 0.6, bodyY + s * 0.5);
        ctx.lineTo(x - s * 0.6, bodyY + s * 0.5);
        ctx.lineTo(x - s * 0.75, bodyY - s * 0.2);
        ctx.closePath();
        ctx.fill();
        // Armor plate lines
        ctx.strokeStyle = '#80d0ff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - s * 0.4, bodyY - s * 0.1);
        ctx.lineTo(x + s * 0.4, bodyY - s * 0.1);
        ctx.moveTo(x - s * 0.3, bodyY + s * 0.2);
        ctx.lineTo(x + s * 0.3, bodyY + s * 0.2);
        ctx.stroke();
        // Shoulder pads (ice armor)
        ctx.fillStyle = flash ? '#fff' : '#4499bb';
        ctx.beginPath();
        ctx.moveTo(x - s * 0.65, bodyY - s * 0.35);
        ctx.lineTo(x - s * 0.95, bodyY - s * 0.25);
        ctx.lineTo(x - s * 0.85, bodyY - s * 0.05);
        ctx.lineTo(x - s * 0.65, bodyY - s * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + s * 0.65, bodyY - s * 0.35);
        ctx.lineTo(x + s * 0.95, bodyY - s * 0.25);
        ctx.lineTo(x + s * 0.85, bodyY - s * 0.05);
        ctx.lineTo(x + s * 0.65, bodyY - s * 0.1);
        ctx.closePath();
        ctx.fill();
        // Left arm (upper + forearm)
        ctx.fillStyle = flash ? '#fff' : '#3388aa';
        ctx.beginPath();
        ctx.moveTo(x - s * 0.85, bodyY - s * 0.15);
        ctx.lineTo(x - s * 1.05, bodyY + s * 0.12);
        ctx.lineTo(x - s * 0.95, bodyY + s * 0.2);
        ctx.lineTo(x - s * 0.75, bodyY);
        ctx.closePath();
        ctx.fill();
        // Left forearm (slightly wider)
        ctx.fillStyle = flash ? '#fff' : '#2a7799';
        ctx.beginPath();
        ctx.moveTo(x - s * 1, bodyY + s * 0.12);
        ctx.lineTo(x - s * 1.15, bodyY + s * 0.3);
        ctx.lineTo(x - s * 1, bodyY + s * 0.4);
        ctx.lineTo(x - s * 0.9, bodyY + s * 0.25);
        ctx.closePath();
        ctx.fill();
        // Left ice gauntlet (articulated fist)
        ctx.fillStyle = flash ? '#fff' : '#55aacc';
        this.drawGauntletEdge(ctx, s, x, bodyY);
        ctx.fill();
        // Gauntlet frost edge
        ctx.strokeStyle = '#aaeeff';
        ctx.lineWidth = 1;
        ctx.stroke();
        // Right arm
        ctx.fillStyle = flash ? '#fff' : '#3388aa';
        ctx.beginPath();
        ctx.moveTo(x + s * 0.85, bodyY - s * 0.15);
        ctx.lineTo(x + s * 1.05, bodyY + s * 0.12);
        ctx.lineTo(x + s * 0.95, bodyY + s * 0.2);
        ctx.lineTo(x + s * 0.75, bodyY);
        ctx.closePath();
        ctx.fill();
        // Right forearm
        ctx.fillStyle = flash ? '#fff' : '#2a7799';
        ctx.beginPath();
        ctx.moveTo(x + s * 1, bodyY + s * 0.12);
        ctx.lineTo(x + s * 1.15, bodyY + s * 0.3);
        ctx.lineTo(x + s * 1, bodyY + s * 0.4);
        ctx.lineTo(x + s * 0.9, bodyY + s * 0.25);
        ctx.closePath();
        ctx.fill();
        // Right ice gauntlet
        this.drawGauntletFrostEdge(ctx, flash, s, x, bodyY);
        // Ice crown
        this.drawIceCrown(ctx, x, s, bodyY);
        // Eyes
        ctx.fillStyle = '#00ccff';
        ctx.shadowColor = '#00aaff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x - s * 0.2, bodyY - s * 0.4, s * 0.09, 0, Math.PI * 2);
        ctx.arc(x + s * 0.2, bodyY - s * 0.4, s * 0.09, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    drawIceCrown(ctx, x, s, bodyY) {
        ctx.fillStyle = '#ccf0ff';
        for (let i = 0; i < 3; i++) {
            const cx2 = x + (i - 1) * s * 0.2;
            const ch = s * 0.25 + (i === 1 ? s * 0.15 : 0);
            ctx.beginPath();
            ctx.moveTo(cx2 - s * 0.08, bodyY - s * 0.7);
            ctx.lineTo(cx2, bodyY - s * 0.7 - ch);
            ctx.lineTo(cx2 + s * 0.08, bodyY - s * 0.7);
            ctx.closePath();
            ctx.fill();
        }
    }

    drawGauntletFrostEdge(ctx, flash, s, x, bodyY) {
        ctx.fillStyle = flash ? '#fff' : '#55aacc';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const r = s * 0.17 * (0.9 + Math.sin(i * 2.1 + 1) * 0.1);
            const px = x + s * 1.08 + Math.cos(a) * r;
            const py = bodyY + s * 0.35 + Math.sin(a) * r;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#aaeeff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    drawGauntletEdge(ctx, s, x, bodyY) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const r = s * 0.17 * (0.9 + Math.sin(i * 2.1) * 0.1);
            const px = x - s * 1.08 + Math.cos(a) * r;
            const py = bodyY + s * 0.35 + Math.sin(a) * r;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    renderEtherealRobe(ctx, t, s, y, x, flash) {
        ctx.globalAlpha *= 0.7;
        const bob = Math.sin(t / 300) * s * 0.08;
        const bodyY = y + bob;
        // Flowing trail/tail
        for (let i = 0; i < 4; i++) {
            const tLen = s * 0.3 + Math.sin(t / 200 + i * 1.5) * s * 0.15;
            const tx = x + (i - 1.5) * s * 0.25;
            ctx.strokeStyle = `rgba(150, 220, 255, ${0.15 - i * 0.03})`;
            ctx.lineWidth = 3 - i * 0.5;
            ctx.beginPath();
            ctx.moveTo(tx, bodyY + s * 0.5);
            ctx.quadraticCurveTo(tx + Math.sin(t / 100 + i) * s * 0.25, bodyY + s * 0.6 + tLen * 0.5, tx + Math.sin(t / 80 + i) * s * 0.15, bodyY + s * 0.5 + tLen);
            ctx.stroke();
        }
        // Body (ethereal robe shape)
        const grad = ctx.createRadialGradient(x, bodyY - s * 0.2, 0, x, bodyY, s);
        grad.addColorStop(0, 'rgba(200, 240, 255, 0.9)');
        grad.addColorStop(0.4, 'rgba(140, 210, 255, 0.7)');
        grad.addColorStop(0.7, 'rgba(100, 180, 240, 0.4)');
        grad.addColorStop(1, 'rgba(60, 150, 220, 0.1)');
        ctx.fillStyle = flash ? '#fff' : grad;
        ctx.beginPath();
        ctx.moveTo(x, bodyY - s * 0.95);
        ctx.bezierCurveTo(x + s * 0.9, bodyY - s * 0.4, x + s * 0.7, bodyY + s * 0.2, x + s * 0.4, bodyY + s * 0.6);
        ctx.quadraticCurveTo(x + s * 0.2, bodyY + s * 0.35, x, bodyY + s * 0.7);
        ctx.quadraticCurveTo(x - s * 0.2, bodyY + s * 0.35, x - s * 0.4, bodyY + s * 0.6);
        ctx.bezierCurveTo(x - s * 0.7, bodyY + s * 0.2, x - s * 0.9, bodyY - s * 0.4, x, bodyY - s * 0.95);
        ctx.fill();
        // Ice crystal shoulder pads
        ctx.fillStyle = flash ? '#fff' : 'rgba(180, 230, 255, 0.6)';
        ctx.beginPath();
        ctx.moveTo(x - s * 0.6, bodyY - s * 0.25);
        ctx.lineTo(x - s * 0.85, bodyY - s * 0.55);
        ctx.lineTo(x - s * 0.45, bodyY - s * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + s * 0.6, bodyY - s * 0.25);
        ctx.lineTo(x + s * 0.85, bodyY - s * 0.55);
        ctx.lineTo(x + s * 0.45, bodyY - s * 0.35);
        ctx.closePath();
        ctx.fill();
        // Hollow eyes (glowing blue)
        ctx.fillStyle = '#aaeeff';
        ctx.shadowColor = '#00ccff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(x - s * 0.2, bodyY - s * 0.3, s * 0.1, s * 0.14, 0, 0, Math.PI * 2);
        ctx.ellipse(x + s * 0.2, bodyY - s * 0.3, s * 0.1, s * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    renderLavaBlob(t, ctx, x, y, s, flash) {
        const pulse = 1 + Math.sin(t / 120) * 0.1;
        // Shadow/base puddle
        ctx.fillStyle = 'rgba(150, 30, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(x, y + s * 0.5, s * 0.8 * pulse, s * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        // Main blobby body
        const grad = ctx.createRadialGradient(x, y - s * 0.1, 0, x, y, s * pulse);
        grad.addColorStop(0, '#ffcc00');
        grad.addColorStop(0.35, '#ff8800');
        grad.addColorStop(0.7, '#ff4400');
        grad.addColorStop(1, '#aa2200');
        ctx.fillStyle = flash ? '#fff' : grad;
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            const r = s * pulse * (0.7 + Math.sin(t / 150 + i * 1.5) * 0.12);
            const px2 = x + Math.cos(a) * r;
            const py2 = y + Math.sin(a) * r * 0.85;
            i === 0 ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
        }
        ctx.closePath();
        ctx.fill();
        // Bubbles popping on surface
        for (let i = 0; i < 4; i++) {
            const ba = (t / 250) + i * 1.6;
            const bd = s * 0.3 + Math.sin(t / 100 + i * 2) * s * 0.15;
            const bsize = s * 0.08 + Math.sin(t / 80 + i * 3) * s * 0.04;
            ctx.fillStyle = `rgba(255, 200, 50, ${0.3 + Math.sin(t / 60 + i) * 0.2})`;
            ctx.beginPath();
            ctx.arc(x + Math.cos(ba) * bd, y + Math.sin(ba) * bd * 0.7, bsize, 0, Math.PI * 2);
            ctx.fill();
        }
        // Face
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(x - s * 0.2, y - s * 0.15, s * 0.12, s * 0.15, 0, 0, Math.PI * 2);
        ctx.ellipse(x + s * 0.2, y - s * 0.15, s * 0.12, s * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#880000';
        ctx.beginPath();
        ctx.arc(x - s * 0.2, y - s * 0.12, s * 0.06, 0, Math.PI * 2);
        ctx.arc(x + s * 0.2, y - s * 0.12, s * 0.06, 0, Math.PI * 2);
        ctx.fill();
        // Angry maw
        ctx.fillStyle = '#440000';
        ctx.beginPath();
        ctx.moveTo(x - s * 0.18, y + s * 0.02);
        ctx.lineTo(x - s * 0.08, y + s * 0.12);
        ctx.lineTo(x, y + s * 0.06);
        ctx.lineTo(x + s * 0.08, y + s * 0.12);
        ctx.lineTo(x + s * 0.18, y + s * 0.02);
        ctx.closePath();
        ctx.fill();
        // Teeth
        ctx.fillStyle = '#ffddaa';
        ctx.beginPath();
        ctx.moveTo(x - s * 0.12, y + s * 0.04);
        ctx.lineTo(x - s * 0.08, y + s * 0.1);
        ctx.lineTo(x - s * 0.04, y + s * 0.04);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + s * 0.04, y + s * 0.04);
        ctx.lineTo(x + s * 0.08, y + s * 0.1);
        ctx.lineTo(x + s * 0.12, y + s * 0.04);
        ctx.closePath();
        ctx.fill();
    }

    renderLavaCasterBody(t, s, y, ctx, x, flash) {
        const bob = Math.sin(t / 250) * s * 0.05;
        const bodyY = y + bob;
        // Robe body (triangular)
        const grad = ctx.createLinearGradient(x, bodyY - s * 0.5, x, bodyY + s * 0.8);
        grad.addColorStop(0, '#aa3300');
        grad.addColorStop(0.5, '#882200');
        grad.addColorStop(1, '#551100');
        ctx.fillStyle = flash ? '#fff' : grad;
        ctx.beginPath();
        ctx.moveTo(x, bodyY - s * 0.5);
        ctx.lineTo(x + s * 0.6, bodyY + s * 0.8);
        ctx.lineTo(x - s * 0.6, bodyY + s * 0.8);
        ctx.closePath();
        ctx.fill();
        // Robe pattern (lava veins)
        ctx.strokeStyle = `rgba(255, ${100 + Math.floor(Math.sin(t / 150) * 50)}, 0, 0.3)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, bodyY - s * 0.2);
        ctx.lineTo(x - s * 0.15, bodyY + s * 0.5);
        ctx.moveTo(x, bodyY - s * 0.1);
        ctx.lineTo(x + s * 0.2, bodyY + s * 0.6);
        ctx.stroke();
        // Left sleeve arm (extending from robe)
        const armAnim = Math.sin(t / 200) * 0.08;
        ctx.fillStyle = flash ? '#fff' : '#773311';
        ctx.beginPath();
        ctx.moveTo(x - s * 0.3, bodyY + s * 0.05);
        ctx.quadraticCurveTo(x - s * 0.55, bodyY - s * 0.1 + armAnim * s, x - s * 0.65, bodyY + s * 0.05 + armAnim * s);
        ctx.lineTo(x - s * 0.6, bodyY + s * 0.2 + armAnim * s);
        ctx.quadraticCurveTo(x - s * 0.45, bodyY + s * 0.15 + armAnim * s, x - s * 0.25, bodyY + s * 0.15);
        ctx.closePath();
        ctx.fill();
        // Left hand
        ctx.fillStyle = flash ? '#fff' : '#aa4400';
        ctx.beginPath();
        ctx.arc(x - s * 0.63, bodyY + s * 0.12 + armAnim * s, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
        // Right sleeve arm
        ctx.fillStyle = flash ? '#fff' : '#773311';
        ctx.beginPath();
        ctx.moveTo(x + s * 0.3, bodyY + s * 0.05);
        ctx.quadraticCurveTo(x + s * 0.55, bodyY - s * 0.1 - armAnim * s, x + s * 0.65, bodyY + s * 0.05 - armAnim * s);
        ctx.lineTo(x + s * 0.6, bodyY + s * 0.2 - armAnim * s);
        ctx.quadraticCurveTo(x + s * 0.45, bodyY + s * 0.15 - armAnim * s, x + s * 0.25, bodyY + s * 0.15);
        ctx.closePath();
        ctx.fill();
        // Right hand
        ctx.fillStyle = flash ? '#fff' : '#aa4400';
        ctx.beginPath();
        ctx.arc(x + s * 0.63, bodyY + s * 0.12 - armAnim * s, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
        // Head (hooded)
        ctx.fillStyle = flash ? '#fff' : '#993300';
        ctx.beginPath();
        ctx.arc(x, bodyY - s * 0.4, s * 0.4, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        // Hood shadow
        ctx.fillStyle = '#441100';
        ctx.beginPath();
        ctx.arc(x, bodyY - s * 0.35, s * 0.3, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        // Eyes (glowing from hood)
        ctx.fillStyle = '#ffff00';
        ctx.shadowColor = '#ff8800';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x - s * 0.12, bodyY - s * 0.35, s * 0.06, 0, Math.PI * 2);
        ctx.arc(x + s * 0.12, bodyY - s * 0.35, s * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Orbiting lava orbs
        for (let i = 0; i < 3; i++) {
            const ha = (t / 400) + i * (Math.PI * 2 / 3);
            const hx = x + Math.cos(ha) * s * 1.1;
            const hy = bodyY + Math.sin(ha) * s * 0.5;
            const orbGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, s * 0.2);
            orbGrad.addColorStop(0, '#ffdd00');
            orbGrad.addColorStop(0.5, `rgba(255, ${Math.floor(120 + Math.sin(t / 80 + i) * 40)}, 0, 0.9)`);
            orbGrad.addColorStop(1, 'rgba(200, 50, 0, 0)');
            ctx.fillStyle = orbGrad;
            ctx.beginPath();
            ctx.arc(hx, hy, s * 0.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderEmberSprinter(t, s, ctx, x, y, flash) {
        const facing = this.velocity.x >= 0 ? 1 : -1;
        const runCycle = Math.sin(t / 80) * 0.3;
        // Tail (flaming, animated)
        const tailWave = Math.sin(t / 60) * s * 0.3;
        ctx.fillStyle = `rgba(255, ${Math.floor(100 + Math.sin(t / 50) * 60)}, 0, 0.85)`;
        ctx.beginPath();
        ctx.moveTo(x - s * 0.7 * facing, y);
        ctx.quadraticCurveTo(x - s * 1.2 * facing, y - s * 0.2 + tailWave, x - s * 1.6 * facing, y + tailWave * 0.5);
        ctx.quadraticCurveTo(x - s * 1 * facing, y + s * 0.3 + tailWave * 0.3, x - s * 0.7 * facing, y + s * 0.1);
        ctx.closePath();
        ctx.fill();
        // Legs (4 legs, lizard-style)
        ctx.fillStyle = flash ? '#fff' : '#cc4400';
        // Front legs
        ctx.beginPath();
        ctx.moveTo(x + s * 0.3 * facing, y + s * 0.15);
        ctx.lineTo(x + s * 0.55 * facing, y + s * 0.55 + runCycle * s * 0.15);
        ctx.lineTo(x + s * 0.4 * facing, y + s * 0.5 + runCycle * s * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + s * 0.1 * facing, y + s * 0.2);
        ctx.lineTo(x + s * 0.3 * facing, y + s * 0.55 - runCycle * s * 0.15);
        ctx.lineTo(x + s * 0.15 * facing, y + s * 0.5 - runCycle * s * 0.15);
        ctx.closePath();
        ctx.fill();
        // Back legs
        ctx.beginPath();
        ctx.moveTo(x - s * 0.3 * facing, y + s * 0.15);
        ctx.lineTo(x - s * 0.5 * facing, y + s * 0.55 - runCycle * s * 0.15);
        ctx.lineTo(x - s * 0.35 * facing, y + s * 0.5 - runCycle * s * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x - s * 0.5 * facing, y + s * 0.15);
        ctx.lineTo(x - s * 0.7 * facing, y + s * 0.55 + runCycle * s * 0.15);
        ctx.lineTo(x - s * 0.55 * facing, y + s * 0.5 + runCycle * s * 0.15);
        ctx.closePath();
        ctx.fill();
        // Body (elongated with gradient)
        const grad = ctx.createLinearGradient(x - s * facing, y, x + s * facing, y);
        grad.addColorStop(0, '#ff4400');
        grad.addColorStop(0.5, '#ff8800');
        grad.addColorStop(1, '#ffbb00');
        ctx.fillStyle = flash ? '#fff' : grad;
        ctx.beginPath();
        ctx.ellipse(x, y, s * 0.95, s * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Scale pattern
        ctx.strokeStyle = 'rgba(200, 60, 0, 0.3)';
        ctx.lineWidth = 0.8;
        for (let i = -3; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(x + i * s * 0.2 * facing, y - s * 0.05, s * 0.12, 0, Math.PI);
            ctx.stroke();
        }
        // Head (pointed snout)
        ctx.fillStyle = flash ? '#fff' : '#ffaa00';
        ctx.beginPath();
        ctx.moveTo(x + s * 1 * facing, y - s * 0.15);
        ctx.lineTo(x + s * 1.35 * facing, y);
        ctx.lineTo(x + s * 1 * facing, y + s * 0.15);
        ctx.closePath();
        ctx.fill();
        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x + s * 0.85 * facing, y - s * 0.08, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x + s * 0.88 * facing, y - s * 0.08, s * 0.05, 0, Math.PI * 2);
        ctx.fill();
    }

    renderMagmaGolemBody(t, s, y, ctx, flash, x) {
        const bob = Math.sin(t / 300) * s * 0.03;
        const bodyY = y + bob;
        // Legs (thick, rocky)
        ctx.fillStyle = flash ? '#fff' : '#443322';
        ctx.beginPath();
        ctx.moveTo(x - s * 0.45, bodyY + s * 0.2);
        ctx.lineTo(x - s * 0.55, bodyY + s * 0.95);
        ctx.lineTo(x - s * 0.2, bodyY + s * 0.95);
        ctx.lineTo(x - s * 0.15, bodyY + s * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + s * 0.15, bodyY + s * 0.2);
        ctx.lineTo(x + s * 0.2, bodyY + s * 0.95);
        ctx.lineTo(x + s * 0.55, bodyY + s * 0.95);
        ctx.lineTo(x + s * 0.45, bodyY + s * 0.2);
        ctx.closePath();
        ctx.fill();
        // Lava glow on legs
        ctx.strokeStyle = `rgba(255, ${100 + Math.floor(Math.sin(t / 120) * 50)}, 0, 0.7)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - s * 0.35, bodyY + s * 0.4);
        ctx.lineTo(x - s * 0.4, bodyY + s * 0.75);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + s * 0.35, bodyY + s * 0.5);
        ctx.lineTo(x + s * 0.3, bodyY + s * 0.8);
        ctx.stroke();
        // Main body (jagged rock)
        this.renderBodyTexture(ctx, flash, s, x, bodyY);
        // Lava cracks on body
        this.renderLavaCracks(ctx, t, x, bodyY, s);
        // Arms (segmented: upper arm + forearm + fist)
        const armSway = Math.sin(t / 250) * 0.1;
        // Left shoulder
        const lsx = x - s * 0.75, lsy = bodyY - s * 0.25;
        // Left elbow
        const lex = x - s * 1, ley = bodyY + s * 0.05 + armSway * s;
        // Left fist
        const lfx = x - s * 1.15, lfy = bodyY + s * 0.3 + armSway * s;
        // Left upper arm
        ctx.fillStyle = flash ? '#fff' : '#4a2a1a';
        ctx.beginPath();
        ctx.moveTo(lsx, lsy - s * 0.1);
        ctx.lineTo(lex - s * 0.05, ley - s * 0.1);
        ctx.lineTo(lex + s * 0.05, ley + s * 0.1);
        ctx.lineTo(lsx, lsy + s * 0.12);
        ctx.closePath();
        ctx.fill();
        // Left elbow lava glow
        ctx.fillStyle = `rgba(255, ${Math.floor(140 + Math.sin(t / 100) * 40)}, 0, 0.7)`;
        ctx.beginPath();
        ctx.arc(lex, ley, s * 0.09, 0, Math.PI * 2);
        ctx.fill();
        // Left forearm
        ctx.fillStyle = flash ? '#fff' : '#3d2015';
        ctx.beginPath();
        ctx.moveTo(lex - s * 0.06, ley);
        ctx.lineTo(lfx - s * 0.05, lfy - s * 0.08);
        ctx.lineTo(lfx + s * 0.05, lfy + s * 0.08);
        ctx.lineTo(lex + s * 0.06, ley);
        ctx.closePath();
        ctx.fill();
        // Left fist (rocky boulder)
        ctx.fillStyle = flash ? '#fff' : '#553322';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const r = s * 0.16 * (0.85 + Math.sin(i * 2.3) * 0.15);
            const px = lfx + Math.cos(a) * r;
            const py = lfy + Math.sin(a) * r;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        // Right shoulder
        const rsx = x + s * 0.75, rsy = bodyY - s * 0.25;
        const rex = x + s * 1, rey = bodyY + s * 0.05 - armSway * s;
        const rfx = x + s * 1.15, rfy = bodyY + s * 0.3 - armSway * s;
        // Right upper arm
        ctx.fillStyle = flash ? '#fff' : '#4a2a1a';
        ctx.beginPath();
        ctx.moveTo(rsx, rsy - s * 0.1);
        ctx.lineTo(rex + s * 0.05, rey - s * 0.1);
        ctx.lineTo(rex - s * 0.05, rey + s * 0.1);
        ctx.lineTo(rsx, rsy + s * 0.12);
        ctx.closePath();
        ctx.fill();
        // Right elbow lava glow
        ctx.fillStyle = `rgba(255, ${Math.floor(140 + Math.sin(t / 100 + 1) * 40)}, 0, 0.7)`;
        ctx.beginPath();
        ctx.arc(rex, rey, s * 0.09, 0, Math.PI * 2);
        ctx.fill();
        // Right forearm
        ctx.fillStyle = flash ? '#fff' : '#3d2015';
        ctx.beginPath();
        ctx.moveTo(rex + s * 0.06, rey);
        ctx.lineTo(rfx + s * 0.05, rfy - s * 0.08);
        ctx.lineTo(rfx - s * 0.05, rfy + s * 0.08);
        ctx.lineTo(rex - s * 0.06, rey);
        ctx.closePath();
        ctx.fill();
        // Right fist (rocky boulder)
        ctx.fillStyle = flash ? '#fff' : '#553322';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const r = s * 0.16 * (0.85 + Math.sin(i * 2.3 + 1) * 0.15);
            const px = rfx + Math.cos(a) * r;
            const py = rfy + Math.sin(a) * r;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        // Glowing eyes
        ctx.fillStyle = '#ffaa00';
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x - s * 0.3, bodyY - s * 0.3, s * 0.13, 0, Math.PI * 2);
        ctx.arc(x + s * 0.3, bodyY - s * 0.3, s * 0.13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.arc(x - s * 0.3, bodyY - s * 0.3, s * 0.06, 0, Math.PI * 2);
        ctx.arc(x + s * 0.3, bodyY - s * 0.3, s * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    renderLavaCracks(ctx, t, x, bodyY, s) {
        ctx.strokeStyle = `rgba(255, ${Math.floor(150 + Math.sin(t / 100) * 50)}, 0, 0.9)`;
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 + 0.3;
            ctx.beginPath();
            ctx.moveTo(x, bodyY - s * 0.1);
            const mx = x + Math.cos(a + 0.2) * s * 0.4;
            const my = bodyY + Math.sin(a + 0.2) * s * 0.35 - s * 0.1;
            ctx.quadraticCurveTo(mx, my, x + Math.cos(a) * s * 0.8, bodyY + Math.sin(a) * s * 0.6 - s * 0.1);
            ctx.stroke();
        }
    }

    renderBodyTexture(ctx, flash, s, x, bodyY) {
        ctx.fillStyle = flash ? '#fff' : '#553322';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            const r = s * (0.85 + Math.sin(i * 3.7) * 0.15);
            const px = x + Math.cos(a) * r * 0.9;
            const py = bodyY + Math.sin(a) * r * 0.75 - s * 0.1;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
    }

    renderFlameImpBody(t, s, y, ctx, flash, x) {
        const bob = Math.sin(t / 200) * s * 0.04;
        const bodyY = y + bob;
        // Legs
        ctx.fillStyle = flash ? '#fff' : '#cc3300';
        ctx.beginPath();
        ctx.moveTo(x - s * 0.2, bodyY + s * 0.3);
        ctx.lineTo(x - s * 0.35, bodyY + s * 0.9 + Math.sin(t / 150) * s * 0.1);
        ctx.lineTo(x - s * 0.15, bodyY + s * 0.85 + Math.sin(t / 150) * s * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + s * 0.2, bodyY + s * 0.3);
        ctx.lineTo(x + s * 0.35, bodyY + s * 0.9 - Math.sin(t / 150) * s * 0.1);
        ctx.lineTo(x + s * 0.15, bodyY + s * 0.85 - Math.sin(t / 150) * s * 0.1);
        ctx.closePath();
        ctx.fill();
        // Main body (teardrop with gradient)
        const grad = ctx.createRadialGradient(x, bodyY - s * 0.2, 0, x, bodyY, s);
        grad.addColorStop(0, '#ffcc00');
        grad.addColorStop(0.4, '#ff8800');
        grad.addColorStop(0.7, '#ff4400');
        grad.addColorStop(1, '#cc2200');
        ctx.fillStyle = flash ? '#fff' : grad;
        ctx.beginPath();
        ctx.moveTo(x, bodyY - s * 1);
        ctx.bezierCurveTo(x + s * 0.9, bodyY - s * 0.3, x + s * 0.6, bodyY + s * 0.5, x, bodyY + s * 0.4);
        ctx.bezierCurveTo(x - s * 0.6, bodyY + s * 0.5, x - s * 0.9, bodyY - s * 0.3, x, bodyY - s * 1);
        ctx.fill();
        // Arms (filled shapes, not strokes)
        const armSwing = Math.sin(t / 180 + 1) * 0.15;
        // Left upper arm
        ctx.fillStyle = flash ? '#fff' : '#dd4400';
        ctx.beginPath();
        ctx.moveTo(x - s * 0.45, bodyY - s * 0.15);
        ctx.lineTo(x - s * 0.55, bodyY - s * 0.05);
        ctx.lineTo(x - s * 0.85, bodyY + s * 0.15 + armSwing * s);
        ctx.lineTo(x - s * 0.78, bodyY + s * 0.28 + armSwing * s);
        ctx.lineTo(x - s * 0.48, bodyY + s * 0.05);
        ctx.closePath();
        ctx.fill();
        // Left hand (small circle)
        ctx.fillStyle = flash ? '#fff' : '#ee5500';
        ctx.beginPath();
        ctx.arc(x - s * 0.82, bodyY + s * 0.22 + armSwing * s, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
        // Left claws (filled triangles)
        ctx.fillStyle = flash ? '#fff' : '#ffaa00';
        const lhx = x - s * 0.82, lhy = bodyY + s * 0.22 + armSwing * s;
        for (let c = 0; c < 3; c++) {
            const ca = -0.5 + c * 0.5;
            ctx.beginPath();
            ctx.moveTo(lhx + Math.cos(ca - 0.15) * s * 0.08, lhy + Math.sin(ca - 0.15) * s * 0.08);
            ctx.lineTo(lhx + Math.cos(ca) * s * 0.22, lhy + Math.sin(ca) * s * 0.22);
            ctx.lineTo(lhx + Math.cos(ca + 0.15) * s * 0.08, lhy + Math.sin(ca + 0.15) * s * 0.08);
            ctx.closePath();
            ctx.fill();
        }
        // Right upper arm
        ctx.fillStyle = flash ? '#fff' : '#dd4400';
        ctx.beginPath();
        ctx.moveTo(x + s * 0.45, bodyY - s * 0.15);
        ctx.lineTo(x + s * 0.55, bodyY - s * 0.05);
        ctx.lineTo(x + s * 0.85, bodyY + s * 0.15 - armSwing * s);
        ctx.lineTo(x + s * 0.78, bodyY + s * 0.28 - armSwing * s);
        ctx.lineTo(x + s * 0.48, bodyY + s * 0.05);
        ctx.closePath();
        ctx.fill();
        // Right hand
        ctx.fillStyle = flash ? '#fff' : '#ee5500';
        ctx.beginPath();
        ctx.arc(x + s * 0.82, bodyY + s * 0.22 - armSwing * s, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
        // Right claws
        ctx.fillStyle = flash ? '#fff' : '#ffaa00';
        const rhx = x + s * 0.82, rhy = bodyY + s * 0.22 - armSwing * s;
        for (let c = 0; c < 3; c++) {
            const ca = Math.PI - 0.5 + c * 0.5;
            ctx.beginPath();
            ctx.moveTo(rhx + Math.cos(ca - 0.15) * s * 0.08, rhy + Math.sin(ca - 0.15) * s * 0.08);
            ctx.lineTo(rhx + Math.cos(ca) * s * 0.22, rhy + Math.sin(ca) * s * 0.22);
            ctx.lineTo(rhx + Math.cos(ca + 0.15) * s * 0.08, rhy + Math.sin(ca + 0.15) * s * 0.08);
            ctx.closePath();
            ctx.fill();
        }
        // Horns (curved)
        ctx.fillStyle = flash ? '#fff' : '#ff3300';
        ctx.beginPath();
        ctx.moveTo(x - s * 0.25, bodyY - s * 0.6);
        ctx.quadraticCurveTo(x - s * 0.8, bodyY - s * 1.4, x - s * 0.6, bodyY - s * 1.2);
        ctx.lineTo(x - s * 0.1, bodyY - s * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + s * 0.25, bodyY - s * 0.6);
        ctx.quadraticCurveTo(x + s * 0.8, bodyY - s * 1.4, x + s * 0.6, bodyY - s * 1.2);
        ctx.lineTo(x + s * 0.1, bodyY - s * 0.55);
        ctx.closePath();
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(x - s * 0.22, bodyY - s * 0.2, s * 0.16, s * 0.1, -0.15, 0, Math.PI * 2);
        ctx.ellipse(x + s * 0.22, bodyY - s * 0.2, s * 0.16, s * 0.1, 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(x - s * 0.22, bodyY - s * 0.2, s * 0.07, 0, Math.PI * 2);
        ctx.arc(x + s * 0.22, bodyY - s * 0.2, s * 0.07, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Mouth with fangs
        ctx.strokeStyle = '#880000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, bodyY + s * 0.25, s * 0.18, Math.PI + 0.3, -0.3);
        ctx.stroke();
        ctx.fillStyle = '#ffcc88';
        ctx.beginPath();
        ctx.moveTo(x - s * 0.1, bodyY + s * 0.1);
        ctx.lineTo(x - s * 0.07, bodyY + s * 0.2);
        ctx.lineTo(x - s * 0.13, bodyY + s * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + s * 0.1, bodyY + s * 0.1);
        ctx.lineTo(x + s * 0.07, bodyY + s * 0.2);
        ctx.lineTo(x + s * 0.13, bodyY + s * 0.2);
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Lighten a hex color
     * @param {string} color 
     * @param {number} percent 
     * @returns {string}
     */
    lightenColor(color, percent) {
        const num = Number.parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    }

    /**
     * Darken a hex color
     * @param {string} color 
     * @param {number} percent 
     * @returns {string}
     */
    darkenColor(color, percent) {
        const num = Number.parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    }

    /**
     * Render enemy (camera transform already applied)
     * @param {CanvasRenderingContext2D} ctx 
     */
    render(ctx) {
        if (!this.active) return;

        ctx.save();

        // Spawn animation (summoned enemies fade in + scale up + particles)
        this.renderSpawnAnimation(ctx);

        // Damage flash
        let opacity = 1;
        if (this.damageFlash > 0) {
            opacity = 0.7;
        }

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x + 2, this.y + this.size * 0.7, this.size * 0.7, this.size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rarity glow effect
        this.renderRarityGlow(ctx);

        // Exploder warning pulse (all exploder-type enemies)
        this.renderExplosionEffect(ctx);

        // World enemy colored aura (drawn BEFORE the body/sprite)
        this.renderWorldEnemyAura(ctx);

        // Use sprite system if available
        this.renderEnemy(ctx, opacity);

        // --- World-specific enemy visual effects ---
        // Flame Imp fire trails are rendered by game.js (needs worldToScreen)
        // Frost Giant: freeze zone indicator
        this.renderFreezeEffect(ctx);
        // Shadow Clone: transparency when teleporting
        if (this.type === 'shadowClone' && this.isTeleporting) {
            ctx.globalAlpha *= 0.3;
        }
        // Mech Sentinel: shield bubble
        this.renderShieldEffect(ctx);
        // Void Devourer: gravity pull visual
        this.renderVoidDevourerEffect(ctx);

        // Ember Sprinter: dash flame trail + fiery afterimage
        this.renderEmberSprintingEffects(ctx);

        // Blizzard Wolf: frost aura + lunge indicator
        this.renderFrostBreathParticles(ctx);

        // Spark Runner: electric trail + jitter sparks
        this.renderElectricTrails(ctx);

        // Phantasm: fade effect + ghostly trail
        this.renderPhantasmEffects(ctx);

        // Drone Swarm: propeller/rotor visual + dive indicator
        this.renderDroneSwarmEffect(ctx);

        // World enemy type indicator (colored dot)
        this.renderWorldEnemyIndicator(ctx);

        // Rarity indicator
        this.renderRaritySymbols(ctx);

        // Health bar for stronger enemies
        this.drawHealthIndicator(ctx);

        // Frozen visual overlay
        this.renderFrozenOverlay(ctx);

        ctx.restore();
    }

    renderSpawnAnimation(ctx) {
        if (this.spawnAnim) {
            const elapsed = Date.now() - this.spawnAnim.start;
            const progress = Math.min(elapsed / this.spawnAnim.duration, 1);
            if (progress < 1) {
                const scale = 0.3 + progress * 0.7;
                const alpha = progress;
                ctx.globalAlpha = alpha;
                ctx.translate(this.x, this.y);
                ctx.scale(scale, scale);
                ctx.translate(-this.x, -this.y);
                // Spawn particles  burst outward and fade
                const t = Date.now();
                const particleCount = 10;
                for (let i = 0; i < particleCount; i++) {
                    const angle = (i / particleCount) * Math.PI * 2 + progress * 2;
                    const dist = this.size * (0.5 + progress * 2.5);
                    const px = this.x + Math.cos(angle) * dist;
                    const py = this.y + Math.sin(angle) * dist - Math.sin(t / 60 + i * 2) * 8;
                    const pAlpha = (1 - progress) * 0.8;
                    const pSize = 3 + (1 - progress) * 4;
                    // Colored particles matching enemy
                    ctx.fillStyle = `rgba(255, 255, 255, ${pAlpha})`;
                    ctx.beginPath();
                    ctx.arc(px, py, pSize, 0, Math.PI * 2);
                    ctx.fill();
                    // Smaller trailing spark
                    const trailDist = dist * 0.6;
                    const tx = this.x + Math.cos(angle + 0.3) * trailDist;
                    const ty = this.y + Math.sin(angle + 0.3) * trailDist;
                    ctx.fillStyle = `rgba(255, 200, 100, ${pAlpha * 0.6})`;
                    ctx.beginPath();
                    ctx.arc(tx, ty, pSize * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                delete this.spawnAnim;
            }
        }
    }

    renderFrozenOverlay(ctx) {
        if (this._frozen) {
            ctx.fillStyle = 'rgba(100, 200, 255, 0.25)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(150, 230, 255, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 3, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    drawHealthIndicator(ctx) {
        if (this.maxHealth > 30 && this.health < this.maxHealth) {
            const barWidth = this.size * 2;
            const barHeight = 4;
            const barY = this.y - this.size - (this.rarity && this.rarity !== 'common' ? 25 : 10);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(this.x - barWidth / 2, barY, barWidth, barHeight);

            const healthPercent = this.health / this.maxHealth;
            const condA = healthPercent > 0.25 ? '#ff9800' : '#f44336';
            ctx.fillStyle = healthPercent > 0.5 ? '#4caf50' : condA;
            ctx.fillRect(this.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
        }
    }

    renderRaritySymbols(ctx) {
        if (this.rarity && this.rarity !== 'common') {
            const raritySymbols = {
                'uncommon': 'â˜…',
                'rare': 'â˜…â˜…',
                'epic': 'â˜…â˜…â˜…',
                'legendary': 'â™¦'
            };
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = this.rarityColor || '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.strokeText(raritySymbols[this.rarity] || '', this.x, this.y - this.size - 15);
            ctx.fillText(raritySymbols[this.rarity] || '', this.x, this.y - this.size - 15);
        }
    }

    renderWorldEnemyIndicator(ctx) {
        if (this.isWorldEnemy) {
            ctx.fillStyle = this.color || '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x, this.y - this.size - 6, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderDroneSwarmEffect(ctx) {
        if (this.type === 'droneSwarm') {
            const t6 = Date.now();
            // Spinning rotor blades
            ctx.strokeStyle = `rgba(0, 255, 136, ${0.5 + Math.sin(t6 / 80) * 0.3})`;
            ctx.lineWidth = 1.5;
            const rotAngle = t6 / 50; // Fast spin
            for (let i = 0; i < 4; i++) {
                const a = rotAngle + (i * Math.PI / 2);
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x + Math.cos(a) * (this.size + 4), this.y + Math.sin(a) * (this.size + 4));
                ctx.stroke();
            }
            if (this.isDiving) {
                ctx.strokeStyle = 'rgba(255, 50, 50, 0.5)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size + 3, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    renderPhantasmEffects(ctx) {
        if (this.type === 'phantasm') {
            if (this.isPhased) {
                ctx.globalAlpha *= 0.15;
            } else if (this.phantasmAlpha < 1) {
                ctx.globalAlpha *= this.phantasmAlpha;
            }
            // Ghostly wisps
            const t5 = Date.now();
            for (let i = 0; i < 3; i++) {
                const a = (t5 / 400) + i * Math.PI * 2 / 3;
                const d = this.size + 8 + Math.sin(t5 / 150 + i * 2) * 5;
                ctx.fillStyle = `rgba(153, 68, 204, ${0.2 + Math.sin(t5 / 100 + i) * 0.15})`;
                ctx.beginPath();
                ctx.arc(this.x + Math.cos(a) * d, this.y + Math.sin(a) * d, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    renderElectricTrails(ctx) {
        if (this.type === 'sparkRunner') {
            // Electric trail behind
            if (this.electricTrails) {
                for (const trail of this.electricTrails) {
                    const alpha = 1 - (trail.timer / trail.lifetime);
                    ctx.strokeStyle = `rgba(68, 255, 170, ${alpha * 0.6})`;
                    ctx.lineWidth = 2;
                    const sparkLen = 8;
                    for (let j = 0; j < 2; j++) {
                        const sx = trail.x + (Math.random() - 0.5) * sparkLen;
                        const sy = trail.y + (Math.random() - 0.5) * sparkLen;
                        ctx.beginPath();
                        ctx.moveTo(trail.x, trail.y);
                        ctx.lineTo(sx, sy);
                        ctx.stroke();
                    }
                }
            }
            // Sparks around body
            const t4 = Date.now();
            ctx.strokeStyle = `rgba(0, 255, 180, ${0.4 + Math.sin(t4 / 50) * 0.3})`;
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 3; i++) {
                const a = Math.random() * Math.PI * 2;
                const d = this.size + 2;
                ctx.beginPath();
                ctx.moveTo(this.x + Math.cos(a) * d, this.y + Math.sin(a) * d);
                ctx.lineTo(this.x + Math.cos(a) * (d + 6 + Math.random() * 4), this.y + Math.sin(a) * (d + 6 + Math.random() * 4));
                ctx.stroke();
            }
        }
    }

    renderFrostBreathParticles(ctx) {
        if (this.type === 'blizzardWolf') {
            // Frost breath particles
            const t3 = Date.now();
            for (let i = 0; i < 3; i++) {
                const a = (t3 / 500) + i * 2;
                const d = this.size + 5 + Math.sin(t3 / 200 + i * 1.5) * 4;
                ctx.fillStyle = `rgba(170, 220, 255, ${0.3 + Math.sin(t3 / 120 + i) * 0.2})`;
                ctx.beginPath();
                ctx.arc(this.x + Math.cos(a) * d, this.y + Math.sin(a) * d, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            if (this.isLunging) {
                ctx.strokeStyle = 'rgba(170, 220, 255, 0.5)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size + 6, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    renderEmberSprintingEffects(ctx) {
        if (this.type === 'emberSprinter') {
            if (this.isDashing) {
                // Speed lines
                for (let i = 0; i < 4; i++) {
                    const ox = (Math.random() - 0.5) * this.size;
                    const oy = (Math.random() - 0.5) * this.size;
                    ctx.fillStyle = `rgba(255, ${Math.floor(100 + Math.random() * 100)}, 0, 0.6)`;
                    ctx.beginPath();
                    ctx.arc(this.x + ox - this.velocity.x * 0.02, this.y + oy - this.velocity.y * 0.02, 4 + Math.random() * 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            // Small ember particles
            const t2 = Date.now();
            for (let i = 0; i < 3; i++) {
                const a = (t2 / 300) + i * 2.1;
                const d = this.size + 4 + Math.sin(t2 / 100 + i) * 3;
                ctx.fillStyle = `rgba(255, ${Math.floor(120 + Math.sin(t2 / 80 + i) * 50)}, 0, 0.5)`;
                ctx.beginPath();
                ctx.arc(this.x + Math.cos(a) * d, this.y + Math.sin(a) * d, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    renderVoidDevourerEffect(ctx) {
        if (this.type === 'voidDevourer') {
            const pullAlpha = 0.08 + Math.sin(Date.now() / 300) * 0.05;
            const grad = ctx.createRadialGradient(this.x, this.y, this.size, this.x, this.y, this.pullRadius);
            grad.addColorStop(0, `rgba(80, 0, 120, ${pullAlpha + 0.1})`);
            grad.addColorStop(1, `rgba(40, 0, 60, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.pullRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderShieldEffect(ctx) {
        if (this.type === 'mechSentinel' && this.shieldHP > 0) {
            const shieldAlpha = 0.2 + (this.shieldHP / this.maxShieldHP) * 0.3;
            ctx.strokeStyle = `rgba(0, 200, 255, ${shieldAlpha})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = `rgba(0, 150, 255, ${shieldAlpha * 0.3})`;
            ctx.fill();
        }
    }

    renderFreezeEffect(ctx) {
        if (this.type === 'frostGiant' && this.freezeActive) {
            const freezeAlpha = 0.15 + Math.sin(Date.now() / 150) * 0.1;
            ctx.fillStyle = `rgba(100, 200, 255, ${freezeAlpha})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.freezeRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = `rgba(150, 230, 255, ${freezeAlpha + 0.2})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    renderEnemy(ctx, opacity) {
        if (this.sprite) {
            // Determine facing direction
            let flipX = false;
            if (this.target) {
                flipX = this.target.x < this.x;
            } else if (this.velocity.x !== 0) {
                flipX = this.velocity.x < 0;
            }

            // World enemies use custom canvas shapes instead of generic sprites
            if (this.isWorldEnemy) {
                this.renderWorldEnemyBody(ctx, opacity);
            } else {
                this.sprite.render(ctx, this.x, this.y, this.spriteScale, {
                    opacity: opacity,
                    flipX: flipX,
                    tint: this.damageFlash > 0 ? '#ffffff' : (this.rarityColor || null)
                });
            }
        } else {
            // Fallback to basic rendering
            ctx.globalAlpha = opacity;

            const bodyColor = this.rarityColor || this.color;
            const gradient = ctx.createRadialGradient(
                this.x - this.size * 0.3, this.y - this.size * 0.3, 0,
                this.x, this.y, this.size
            );
            gradient.addColorStop(0, this.lightenColor(bodyColor, 30));
            gradient.addColorStop(1, bodyColor);

            ctx.fillStyle = this.damageFlash > 0 ? '#ffffff' : gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = this.darkenColor(bodyColor, 30);
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    renderWorldEnemyAura(ctx) {
        if (this.isWorldEnemy && !this.rarityGlow) {
            const auraSize = this.size * 1.3 + Math.sin(Date.now() / 400) * 2;
            const grad = ctx.createRadialGradient(this.x, this.y, this.size * 0.4, this.x, this.y, auraSize);
            grad.addColorStop(0, this.color + '50');
            grad.addColorStop(0.7, this.color + '20');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(this.x, this.y, auraSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderExplosionEffect(ctx) {
        if (this.isExploding && this.explosionRadius) {
            const exploderColors = {
                'exploder': 'rgba(255, 100, 0, 0.3)', 'pyroBlob': 'rgba(255, 80, 0, 0.3)',
                'iceDetonator': 'rgba(0, 180, 255, 0.3)', 'emPulser': 'rgba(0, 255, 100, 0.3)',
                'voidMine': 'rgba(100, 0, 180, 0.3)'
            };
            ctx.fillStyle = exploderColors[this.type] || 'rgba(255, 100, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.explosionRadius * (1 + 0.2 * Math.sin(Date.now() / 100)), 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderRarityGlow(ctx) {
        if (this.rarityGlow && this.rarityColor) {
            const glowSize = this.size * 1.5 + Math.sin(Date.now() / 200) * 5;
            const gradient = ctx.createRadialGradient(
                this.x, this.y, this.size * 0.5,
                this.x, this.y, glowSize
            );
            gradient.addColorStop(0, this.rarityColor + '80');
            gradient.addColorStop(0.5, this.rarityColor + '40');
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}