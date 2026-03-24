import { LivingEntity } from './entity.js';
import { Projectile } from './weapons.js';
import { Vector2 } from './utils.js';
import { MathUtils } from './utils.js';
import { CONFIG, WORLD_ENEMIES } from './config.js';
import { spriteManager } from './sprite-system.js';

/**
 * Survivor Arena - Enemy System
 * @fileoverview Enemy types and behaviors
 */



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
class Enemy extends LivingEntity {
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

        // World enemy flag — used for colored aura rendering
        this.isWorldEnemy = !!WORLD_ENEMIES[type];
        this.worldIcon = config.icon || null;
        
        // XP and score values — world enemies derive from health/damage if not in config
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
        
        // Ranged enemy specifics
        if (type === 'ranged') {
            this.attackRange = config.attackRange;
            this.projectileSpeed = config.projectileSpeed;
            this.fireRate = config.fireRate;
            this.fireCooldown = 0;
            this.projectiles = [];
        }
        
        // Exploder specifics
        if (type === 'exploder') {
            this.explosionRadius = config.explosionRadius;
            this.isExploding = false;
            this.explosionTimer = 0;
        }
        
        // --- World-specific enemy init ---
        // Flame Imp: leaves fire trail
        if (type === 'flameImp') {
            this.trailTimer = 0;
            this.trailInterval = 300; // drop fire every 300ms
            this.fireTrails = [];
        }
        // Magma Golem: splits on death
        if (type === 'magmaGolem') {
            this.splitsOnDeath = true;
            this.splitCount = config.splitCount || 2;
        }
        // Ice Wraith: slows player on hit
        if (type === 'iceWraith') {
            this.slowOnHit = config.slowOnHit || 0.4;
            this.slowDuration = config.slowDuration || 1500;
        }
        // Frost Giant: periodic freeze zone
        if (type === 'frostGiant') {
            this.freezeRadius = config.freezeRadius || 120;
            this.freezeTimer = 0;
            this.freezeCooldown = 4000;
            this.freezeActive = false;
            this.freezeDuration = config.freezeDuration || 2000;
        }
        // Drone Swarm: spawns in groups
        if (type === 'droneSwarm') {
            this.swarmSize = config.swarmSize || 3;
        }
        // Mech Sentinel: has a rechargeable shield
        if (type === 'mechSentinel') {
            this.shieldHP = config.shieldHP || 30;
            this.maxShieldHP = this.shieldHP;
            this.shieldRegenDelay = config.shieldRegenDelay || 3000;
            this.shieldRegenTimer = 0;
            this.shieldBroken = false;
        }
        // Shadow Clone: periodically teleports
        if (type === 'shadowClone') {
            this.teleportCooldown = config.teleportCooldown || 3000;
            this.teleportTimer = this.teleportCooldown;
            this.teleportRange = config.teleportRange || 200;
            this.isTeleporting = false;
            this.teleportAlpha = 1;
        }
        // Void Devourer: pulls player toward itself
        if (type === 'voidDevourer') {
            this.pullRadius = config.pullRadius || 180;
            this.pullForce = config.pullForce || 80;
        }
        
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
        
        // Ember Sprinter: zigzag dash movement
        if (type === 'emberSprinter') {
            this.zigzagTimer = 0;
            this.zigzagDir = 1;
            this.dashTimer = 0;
            this.dashCooldown = 2500;
            this.isDashing = false;
        }
        // Blizzard Wolf: pack circling behavior
        if (type === 'blizzardWolf') {
            this.circleAngle = Math.random() * Math.PI * 2;
            this.circleDir = Math.random() > 0.5 ? 1 : -1;
            this.lungeTimer = 0;
            this.lungeCooldown = 3000;
            this.isLunging = false;
            this.lungeDir = new Vector2(0, 0);
        }
        // Spark Runner: erratic jitter + electric trail
        if (type === 'sparkRunner') {
            this.jitterAngle = 0;
            this.electricTrails = [];
            this.trailTimer = 0;
        }
        // Phantasm: fade in/out, phase through
        if (type === 'phantasm') {
            this.phaseTimer = 0;
            this.phaseCooldown = 2000;
            this.isPhased = false;
            this.phantasmAlpha = 1;
        }
        // Drone Swarm: orbit around target then dive
        if (type === 'droneSwarm') {
            this.orbitAngle = Math.random() * Math.PI * 2;
            this.orbitDir = Math.random() > 0.5 ? 1 : -1;
            this.diveTimer = 0;
            this.diveCooldown = 2500;
            this.isDiving = false;
        }
        
        // Knockback
        this.knockbackVelocity = new Vector2(0, 0);
        this.knockbackDecay = 8;
        
        // Animation
        this.animationOffset = Math.random() * Math.PI * 2;
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
        
        const distance = Math.sqrt(dx * dx + dy * dy);
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
            'ranged':      { color: '#ba68c8', size: 7, type: 'energyBall' },
            'lavaCaster':  { color: '#ff5500', size: 10, type: 'fireball' },
            'frostArcher': { color: '#66ccff', size: 6, type: 'arrow' },
            'laserTurret': { color: '#00ffaa', size: 5, type: 'laserBolt' },
            'darkCaster':  { color: '#9933ff', size: 9, type: 'darkOrb' }
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
        
        // Periodic dash — burst of speed toward player
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
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
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
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
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
        if (this.isExploding && this.explosionRadius) {
            ctx.fillStyle = 'rgba(255, 100, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.explosionRadius * (1 + 0.2 * Math.sin(Date.now() / 100)), 0, Math.PI * 2);
            ctx.fill();
        }

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

        // Health bar for tanks and stronger enemies
        if (this.maxHealth > 30 && this.health < this.maxHealth) {
            const barWidth = this.size * 2;
            const barHeight = 4;
            const barY = screenY - this.size - 10;
            
            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);
            
            // Health
            const healthPercent = this.health / this.maxHealth;
            ctx.fillStyle = healthPercent > 0.5 ? '#4caf50' : healthPercent > 0.25 ? '#ff9800' : '#f44336';
            ctx.fillRect(screenX - barWidth / 2, barY, barWidth * healthPercent, barHeight);
        }

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
                const bob = Math.sin(t / 200) * s * 0.04;
                const bodyY = y + bob;
                // Legs
                const legSwing = Math.sin(t / 150) * 0.3;
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
                ctx.moveTo(x, bodyY - s * 1.0);
                ctx.bezierCurveTo(x + s * 0.9, bodyY - s * 0.3, x + s * 0.6, bodyY + s * 0.5, x, bodyY + s * 0.4);
                ctx.bezierCurveTo(x - s * 0.6, bodyY + s * 0.5, x - s * 0.9, bodyY - s * 0.3, x, bodyY - s * 1.0);
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
                break;
            }

            case 'magmaGolem': {
                // Large rocky humanoid with glowing lava cracks
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
                // Lava cracks on body
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
                // Arms (segmented: upper arm + forearm + fist)
                const armSway = Math.sin(t / 250) * 0.1;
                // Left shoulder
                const lsx = x - s * 0.75, lsy = bodyY - s * 0.25;
                // Left elbow
                const lex = x - s * 1.0, ley = bodyY + s * 0.05 + armSway * s;
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
                const rex = x + s * 1.0, rey = bodyY + s * 0.05 - armSway * s;
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
                break;
            }

            case 'emberSprinter': {
                // Lizard-like fire creature running fast
                const facing = this.velocity.x >= 0 ? 1 : -1;
                const runCycle = Math.sin(t / 80) * 0.3;
                // Tail (flaming, animated)
                const tailWave = Math.sin(t / 60) * s * 0.3;
                ctx.fillStyle = `rgba(255, ${Math.floor(100 + Math.sin(t / 50) * 60)}, 0, 0.85)`;
                ctx.beginPath();
                ctx.moveTo(x - s * 0.7 * facing, y);
                ctx.quadraticCurveTo(x - s * 1.2 * facing, y - s * 0.2 + tailWave, x - s * 1.6 * facing, y + tailWave * 0.5);
                ctx.quadraticCurveTo(x - s * 1.0 * facing, y + s * 0.3 + tailWave * 0.3, x - s * 0.7 * facing, y + s * 0.1);
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
                ctx.moveTo(x + s * 1.0 * facing, y - s * 0.15);
                ctx.lineTo(x + s * 1.35 * facing, y);
                ctx.lineTo(x + s * 1.0 * facing, y + s * 0.15);
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
                break;
            }

            case 'lavaCaster': {
                // Wizard-like fire mage with robe and floating lava orbs
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
                break;
            }

            case 'pyroBlob': {
                // Lava slime with bubbling surface and face
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
                break;
            }

            // ========== FROZEN WASTES ==========

            case 'iceWraith': {
                // Ghostly spectral figure with flowing robes and ice crystals
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
                break;
            }

            case 'frostGiant': {
                // Massive humanoid ice warrior with armor and crown
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
                ctx.moveTo(x - s * 1.0, bodyY + s * 0.12);
                ctx.lineTo(x - s * 1.15, bodyY + s * 0.3);
                ctx.lineTo(x - s * 1.0, bodyY + s * 0.4);
                ctx.lineTo(x - s * 0.9, bodyY + s * 0.25);
                ctx.closePath();
                ctx.fill();
                // Left ice gauntlet (articulated fist)
                ctx.fillStyle = flash ? '#fff' : '#55aacc';
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = (i / 6) * Math.PI * 2;
                    const r = s * 0.17 * (0.9 + Math.sin(i * 2.1) * 0.1);
                    const px = x - s * 1.08 + Math.cos(a) * r;
                    const py = bodyY + s * 0.35 + Math.sin(a) * r;
                    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                }
                ctx.closePath();
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
                ctx.moveTo(x + s * 1.0, bodyY + s * 0.12);
                ctx.lineTo(x + s * 1.15, bodyY + s * 0.3);
                ctx.lineTo(x + s * 1.0, bodyY + s * 0.4);
                ctx.lineTo(x + s * 0.9, bodyY + s * 0.25);
                ctx.closePath();
                ctx.fill();
                // Right ice gauntlet
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
                // Ice crown
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
                // Eyes
                ctx.fillStyle = '#00ccff';
                ctx.shadowColor = '#00aaff';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(x - s * 0.2, bodyY - s * 0.4, s * 0.09, 0, Math.PI * 2);
                ctx.arc(x + s * 0.2, bodyY - s * 0.4, s * 0.09, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                break;
            }

            case 'blizzardWolf': {
                // Proper wolf form with detailed anatomy
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
                break;
            }

            case 'frostArcher': {
                // Hooded archer figure with crystalline ice bow
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
                break;
            }

            case 'iceDetonator': {
                // Crystal cluster bomb, pulsating
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
                break;
            }

            // ========== NEON NEXUS ==========

            case 'droneSwarm': {
                // Detailed quad-copter drone with spinning rotors
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
                ctx.moveTo(-hs * 0.7, -hs * 0.4); ctx.lineTo(-hs * 1.2, -hs * 1.0);
                ctx.moveTo(hs * 0.7, -hs * 0.4); ctx.lineTo(hs * 1.2, -hs * 1.0);
                ctx.moveTo(-hs * 0.7, hs * 0.4); ctx.lineTo(-hs * 1.2, hs * 1.0);
                ctx.moveTo(hs * 0.7, hs * 0.4); ctx.lineTo(hs * 1.2, hs * 1.0);
                ctx.stroke();
                // Rotor motors (circles at arm ends)
                const rotorPositions = [[-1.2, -1.0], [1.2, -1.0], [-1.2, 1.0], [1.2, 1.0]];
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
                break;
            }

            case 'mechSentinel': {
                // Walking mech with legs, visor, and power core
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
                ctx.lineTo(x - s * 0.35, bodyY + s * 1.0 + legStep);
                ctx.stroke();
                // Right leg segments
                ctx.beginPath();
                ctx.moveTo(x + s * 0.3, bodyY + s * 0.5);
                ctx.lineTo(x + s * 0.4, bodyY + s * 0.8 - legStep);
                ctx.lineTo(x + s * 0.35, bodyY + s * 1.0 - legStep);
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
                break;
            }

            case 'sparkRunner': {
                // Electric bolt creature (lightning bolt shaped runner)
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
                break;
            }

            case 'laserTurret': {
                // Mechanical turret base with rotating barrel
                // Base (octagonal)
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
                break;
            }

            case 'emPulser': {
                // Energy core with circuit patterns and pulsing rings
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
                break;
            }

            // ========== SHADOW REALM ==========

            case 'shadowClone': {
                // Hooded shadow wraith with trailing darkness
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
                break;
            }

            case 'voidDevourer': {
                // Monstrous spherical maw with teeth and single eye
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
                break;
            }

            case 'phantasm': {
                // Ghostly phasing figure with ethereal effects
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
                break;
            }

            case 'darkCaster': {
                // Dark mage with staff and mystical orb
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
                break;
            }

            case 'voidMine': {
                // Dark star-shaped mine with pulsing core and tendrils
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
                break;
            }

            default: {
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
                break;
            }
        }
        ctx.globalAlpha = 1;
    }

    /**
     * Lighten a hex color
     * @param {string} color 
     * @param {number} percent 
     * @returns {string}
     */
    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
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
        const num = parseInt(color.replace('#', ''), 16);
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
                // Spawn particles — burst outward and fade
                const t = Date.now();
                const particleCount = 10;
                const enemyColor = this.color || '#ff4444';
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

        // Damage flash
        let opacity = 1.0;
        if (this.damageFlash > 0) {
            opacity = 0.7;
        }

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x + 2, this.y + this.size * 0.7, this.size * 0.7, this.size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rarity glow effect
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

        // Exploder warning pulse (all exploder-type enemies)
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

        // World enemy colored aura (drawn BEFORE the body/sprite)
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

        // Use sprite system if available
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

        // --- World-specific enemy visual effects ---
        // Flame Imp fire trails are rendered by game.js (needs worldToScreen)
        // Frost Giant: freeze zone indicator
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
        // Shadow Clone: transparency when teleporting
        if (this.type === 'shadowClone' && this.isTeleporting) {
            ctx.globalAlpha *= 0.3;
        }
        // Mech Sentinel: shield bubble
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
        // Void Devourer: gravity pull visual
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

        // Ember Sprinter: dash flame trail + fiery afterimage
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

        // Blizzard Wolf: frost aura + lunge indicator
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

        // Spark Runner: electric trail + jitter sparks
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

        // Phantasm: fade effect + ghostly trail
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

        // Drone Swarm: propeller/rotor visual + dive indicator
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

        // World enemy type indicator (colored dot)
        if (this.isWorldEnemy) {
            ctx.fillStyle = this.color || '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x, this.y - this.size - 6, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Rarity indicator
        if (this.rarity && this.rarity !== 'common') {
            const raritySymbols = {
                'uncommon': '★',
                'rare': '★★',
                'epic': '★★★',
                'legendary': '♦'
            };
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = this.rarityColor || '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.strokeText(raritySymbols[this.rarity] || '', this.x, this.y - this.size - 15);
            ctx.fillText(raritySymbols[this.rarity] || '', this.x, this.y - this.size - 15);
        }

        // Health bar for stronger enemies
        if (this.maxHealth > 30 && this.health < this.maxHealth) {
            const barWidth = this.size * 2;
            const barHeight = 4;
            const barY = this.y - this.size - (this.rarity && this.rarity !== 'common' ? 25 : 10);
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(this.x - barWidth / 2, barY, barWidth, barHeight);
            
            const healthPercent = this.health / this.maxHealth;
            ctx.fillStyle = healthPercent > 0.5 ? '#4caf50' : healthPercent > 0.25 ? '#ff9800' : '#f44336';
            ctx.fillRect(this.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
        }

        // Frozen visual overlay
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

        ctx.restore();
    }
}

/**
 * Mini Boss class
 */
class MiniBoss extends Enemy {
    /**
     * @param {number} x 
     * @param {number} y 
     * @param {Object} difficultyMult 
     */
    constructor(x, y, difficultyMult = {}) {
        // Create mini boss with custom config
        const config = CONFIG.MINI_BOSS;
        const tempConfig = {
            size: config.size,
            speed: config.speed,
            health: config.health,
            damage: config.damage,
            color: config.color,
            spawnWeight: 0
        };
        
        // Temporarily add to CONFIG for parent constructor
        CONFIG.ENEMIES.miniBoss = tempConfig;
        super(x, y, 'miniBoss', difficultyMult);
        
        // Use miniboss sprite instead of zombie
        this.sprite = spriteManager.createSprite('miniboss');
        if (this.sprite) {
            this.sprite.play('walk');
        }
        this.spriteScale = this.size * 2;
        
        this.xpValue = CONFIG.LEVELING.XP_FROM_ENEMY.miniBoss;
        this.scoreValue = CONFIG.SCORING.POINTS_PER_KILL.miniBoss;
        
        this.abilities = config.abilities;
        this.currentAbility = null;
        this.abilityCooldown = 3000;
        this.abilityTimer = this.abilityCooldown;
        
        // Charge attack
        this.isCharging = false;
        this.chargeDirection = new Vector2(0, 0);
        this.chargeTimer = 0;
        this.chargeDuration = 400; // MiniBoss: shorter charge
        
        // Summon cooldown
        this.summonCount = 0;
        this.maxSummons = 3;
    }

    /**
     * Update mini boss
     * @param {number} deltaTime 
     * @param {Object} arena 
     */
    update(deltaTime, arena) {
        if (!this.active || !this.target) return;

        // Ability cooldown
        this.abilityTimer -= deltaTime * 1000;
        
        if (this.abilityTimer <= 0 && !this.currentAbility) {
            this.useAbility();
        }

        // Handle current ability
        if (this.currentAbility) {
            this.updateAbility(deltaTime);
        } else {
            // Normal chase behavior - use wrapped direction for seamless toroidal world
            const arena = { width: CONFIG.ARENA.WIDTH, height: CONFIG.ARENA.HEIGHT };
            const wrapped = this.getWrappedDirectionToTarget(arena);
            const dirToTarget = new Vector2(wrapped.dirX, wrapped.dirY);
            this.velocity.set(
                dirToTarget.x * this.speed,
                dirToTarget.y * this.speed
            );
        }

        // Call LivingEntity update (skip Enemy behavior)
        LivingEntity.prototype.update.call(this, deltaTime);

        // Wrap position for seamless toroidal world
        this.x = this.wrapCoord(this.x, CONFIG.ARENA.WIDTH);
        this.y = this.wrapCoord(this.y, CONFIG.ARENA.HEIGHT);
        this.position.set(this.x, this.y);
    }

    /**
     * Use a random ability
     */
    useAbility() {
        const ability = this.abilities[MathUtils.randomInt(0, this.abilities.length - 1)];
        
        switch (ability) {
            case 'charge':
                this.startCharge();
                break;
            case 'summon':
                if (this.summonCount < this.maxSummons) {
                    this.summonMinions();
                }
                break;
            case 'aoe':
                this.aoeAttack();
                break;
            case 'shoot':
                this.shootProjectiles = true;
                this.currentAbility = 'shoot';
                setTimeout(() => this.endAbility(), 500);
                break;
        }
    }

    /**
     * Start charge attack
     */
    startCharge() {
        this.currentAbility = 'charge';
        this.isCharging = true;
        this.chargeDirection = this.position.directionTo(this.target.position);
        this.chargeTimer = 500; // 0.5 second charge
        this.velocity.set(0, 0);
    }

    /**
     * Update ability state
     * @param {number} deltaTime 
     */
    updateAbility(deltaTime) {
        switch (this.currentAbility) {
            case 'charge':
                this.chargeTimer -= deltaTime * 1000;
                
                if (this.chargeTimer > 0) {
                    // Charging up - slow movement
                    this.velocity.set(
                        -this.chargeDirection.x * 50,
                        -this.chargeDirection.y * 50
                    );
                } else {
                    // Execute charge
                    this.velocity.set(
                        this.chargeDirection.x * this.speed * 8,
                        this.chargeDirection.y * this.speed * 8
                    );
                    
                    // End charge after distance
                    if (this.chargeTimer < -this.chargeDuration) {
                        this.endAbility();
                    }
                }
                break;
        }
    }

    /**
     * Summon minions (sets flag for game to spawn)
     */
    summonMinions() {
        this.currentAbility = 'summon';
        this.summonCount++;
        
        // Set flag for game.js to detect
        this.summonEnemies = true;
        
        setTimeout(() => this.endAbility(), 500);
    }

    /**
     * AOE attack with charging phase
     */
    aoeAttack() {
        this.currentAbility = 'aoe';
        
        // Start charging phase (1.5 seconds warning)
        this.aoeCharging = true;
        this.aoeChargingStart = Date.now();
        this.aoeChargingDuration = 1500; // 1.5 seconds to charge
        
        // Store AOE data for preview
        this.aoeData = {
            x: this.x,
            y: this.y,
            radius: 300,
            damage: this.damage * 0.5,
            startTime: null, // Set when charging completes
            charging: true
        };
        
        // After charging, execute the AOE
        setTimeout(() => {
            if (this.currentAbility === 'aoe') {
                this.aoeCharging = false;
                this.aoeActive = true;
                this.aoeData.startTime = Date.now();
                this.aoeData.charging = false;
                this.aoeData.x = this.x; // Update position to current
                this.aoeData.y = this.y;
                
                // AOE lasts 0.8 seconds
                setTimeout(() => {
                    this.endAbility();
                    this.aoeActive = false;
                    this.aoeCharging = false;
                }, 800);
            }
        }, this.aoeChargingDuration);
    }

    /**
     * End current ability
     */
    endAbility() {
        this.currentAbility = null;
        this.isCharging = false;
        this.abilityTimer = this.abilityCooldown;
    }

    /**
     * Draw mini boss
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} camera 
     */
    draw(ctx, camera) {
        if (!this.active) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        ctx.save();

        // Charging indicator
        if (this.isCharging && this.chargeTimer > 0) {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            ctx.lineTo(
                screenX + this.chargeDirection.x * 400,
                screenY + this.chargeDirection.y * 400
            );
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Summon visual — brief aura glow on mini-boss body
        if (this.currentAbility === 'summon') {
            const summonPulse = Math.sin(Date.now() / 50) * 0.3 + 0.7;
            const summonGlow = ctx.createRadialGradient(screenX, screenY, this.size * 0.5, screenX, screenY, this.size * 1.5);
            summonGlow.addColorStop(0, `rgba(255, 180, 0, ${0.3 * summonPulse})`);
            summonGlow.addColorStop(1, 'rgba(255, 180, 0, 0)');
            ctx.fillStyle = summonGlow;
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.size * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw shadow (larger)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(screenX + 4, screenY + this.size * 0.6, this.size * 0.8, this.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Main body with gradient
        const gradient = ctx.createRadialGradient(
            screenX - this.size * 0.3, screenY - this.size * 0.3, 0,
            screenX, screenY, this.size
        );
        gradient.addColorStop(0, '#ff69b4');
        gradient.addColorStop(1, this.color);

        ctx.fillStyle = this.damageFlash > 0 ? '#ffffff' : gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Spiky outline
        ctx.strokeStyle = '#ff1493';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Crown/horns
        ctx.fillStyle = '#ffd700';
        for (let i = 0; i < 5; i++) {
            const angle = -Math.PI / 2 + (i - 2) * 0.3;
            const hornX = screenX + Math.cos(angle) * (this.size + 5);
            const hornY = screenY + Math.sin(angle) * (this.size + 5);
            
            ctx.beginPath();
            ctx.moveTo(hornX, hornY);
            ctx.lineTo(hornX + Math.cos(angle) * 15, hornY + Math.sin(angle) * 15);
            ctx.lineTo(hornX + Math.cos(angle + 0.3) * 8, hornY + Math.sin(angle + 0.3) * 8);
            ctx.closePath();
            ctx.fill();
        }

        // Angry eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(screenX - 15, screenY - 5, 12, 0, Math.PI * 2);
        ctx.arc(screenX + 15, screenY - 5, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(screenX - 15, screenY - 5, 6, 0, Math.PI * 2);
        ctx.arc(screenX + 15, screenY - 5, 6, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        const barWidth = this.size * 2.5;
        const barHeight = 8;
        const barY = screenY - this.size - 20;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(screenX - barWidth / 2 - 2, barY - 2, barWidth + 4, barHeight + 4);
        
        ctx.fillStyle = '#333';
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);
        
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = healthPercent > 0.5 ? '#4caf50' : healthPercent > 0.25 ? '#ff9800' : '#f44336';
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth * healthPercent, barHeight);

        // "MINI BOSS" text
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('MINI BOSS', screenX, barY - 5);

        ctx.restore();
    }
}

/**
 * Boss class
 */
class Boss extends MiniBoss {
    /**
     * @param {number} x 
     * @param {number} y 
     * @param {Object} difficultyMult 
     */
    constructor(x, y, difficultyMult = {}) {
        super(x, y, difficultyMult);
        
        // Override with boss config
        const config = CONFIG.BOSS;
        this.maxHealth = config.health * (difficultyMult.enemyHealth || 1);
        this.health = this.maxHealth;
        this.damage = config.damage * (difficultyMult.enemyDamage || 1);
        this.size = config.size;
        this.speed = config.speed * (difficultyMult.enemySpeed || 1);
        this.color = config.color;
        
        // Use boss sprite
        this.sprite = spriteManager.createSprite('boss');
        if (this.sprite) {
            this.sprite.play('walk');
        }
        this.spriteScale = this.size * 1.8;
        
        this.xpValue = CONFIG.LEVELING.XP_FROM_ENEMY.boss;
        this.scoreValue = CONFIG.SCORING.POINTS_PER_KILL.boss;
        
        this.phase = 1;
        this.maxPhases = config.phases;
        this.phaseThresholds = [0.66, 0.33]; // Health % to trigger phase change
        
        // Boss has additional ability: shoot projectiles
        this.abilities = ['charge', 'summon', 'aoe', 'shoot'];
        this.chargeDuration = 700; // Boss: longer charge than MiniBoss
        
        // More abilities
        this.abilityCooldown = 2000;
        this.maxSummons = 5;
    }

    /**
     * Take damage and check phase transitions
     * @param {number} amount 
     * @param {Entity} source 
     * @returns {boolean}
     */
    takeDamage(amount, source = null) {
        const died = super.takeDamage(amount, source);
        
        if (!died) {
            // Check for phase transition
            const healthPercent = this.health / this.maxHealth;
            const newPhase = this.phase < this.maxPhases && 
                healthPercent <= this.phaseThresholds[this.phase - 1];
            
            if (newPhase) {
                this.phase++;
                this.onPhaseChange();
            }
        }
        
        return died;
    }

    /**
     * Called when boss enters new phase
     */
    onPhaseChange() {
        // Increase speed and ability frequency
        this.speed *= 1.2;
        this.abilityCooldown *= 0.8;
        
        // Visual feedback handled in draw
    }

    /**
     * Draw boss
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} camera 
     */
    draw(ctx, camera) {
        if (!this.active) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        ctx.save();

        // Phase aura
        const auraColors = ['#9c27b0', '#e91e63', '#f44336'];
        ctx.strokeStyle = auraColors[this.phase - 1];
        ctx.lineWidth = 5 + Math.sin(Date.now() / 200) * 2;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size + 20 + Math.sin(Date.now() / 300) * 10, 0, Math.PI * 2);
        ctx.stroke();

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(screenX + 5, screenY + this.size * 0.5, this.size * 0.9, this.size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Main body
        const gradient = ctx.createRadialGradient(
            screenX - this.size * 0.3, screenY - this.size * 0.3, 0,
            screenX, screenY, this.size
        );
        gradient.addColorStop(0, '#ce93d8');
        gradient.addColorStop(1, this.color);

        ctx.fillStyle = this.damageFlash > 0 ? '#ffffff' : gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Outline
        ctx.strokeStyle = '#7b1fa2';
        ctx.lineWidth = 5;
        ctx.stroke();

        // Crown
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.moveTo(screenX - 40, screenY - this.size + 10);
        ctx.lineTo(screenX - 30, screenY - this.size - 30);
        ctx.lineTo(screenX - 15, screenY - this.size);
        ctx.lineTo(screenX, screenY - this.size - 40);
        ctx.lineTo(screenX + 15, screenY - this.size);
        ctx.lineTo(screenX + 30, screenY - this.size - 30);
        ctx.lineTo(screenX + 40, screenY - this.size + 10);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ff8f00';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Gems on crown
        ctx.fillStyle = '#f44336';
        ctx.beginPath();
        ctx.arc(screenX, screenY - this.size - 25, 8, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(screenX - 25, screenY - 10, 18, 0, Math.PI * 2);
        ctx.arc(screenX + 25, screenY - 10, 18, 0, Math.PI * 2);
        ctx.fill();

        // Pupils (change color with phase)
        ctx.fillStyle = auraColors[this.phase - 1];
        ctx.beginPath();
        ctx.arc(screenX - 25, screenY - 10, 10, 0, Math.PI * 2);
        ctx.arc(screenX + 25, screenY - 10, 10, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        const barWidth = 200;
        const barHeight = 12;
        const barY = screenY - this.size - 60;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(screenX - barWidth / 2 - 3, barY - 3, barWidth + 6, barHeight + 6);
        
        ctx.fillStyle = '#333';
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);
        
        // Phase segments
        for (let i = 0; i < this.maxPhases - 1; i++) {
            const segX = screenX - barWidth / 2 + barWidth * this.phaseThresholds[i];
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(segX, barY);
            ctx.lineTo(segX, barY + barHeight);
            ctx.stroke();
        }
        
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = auraColors[this.phase - 1];
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth * healthPercent, barHeight);

        // "BOSS" text
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', screenX, barY - 8);

        ctx.restore();
    }

    /**
     * Render boss (camera transform already applied)
     * @param {CanvasRenderingContext2D} ctx 
     */
    render(ctx) {
        if (!this.active) return;

        ctx.save();

        const auraColors = ['#9c27b0', '#e91e63', '#f44336'];

        // Phase aura
        ctx.strokeStyle = auraColors[this.phase - 1];
        ctx.lineWidth = 5 + Math.sin(Date.now() / 200) * 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size + 15 + Math.sin(Date.now() / 300) * 5, 0, Math.PI * 2);
        ctx.stroke();

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(this.x + 5, this.y + this.size * 0.5, this.size * 0.9, this.size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Use sprite if available
        if (this.sprite) {
            let flipX = false;
            if (this.target) {
                flipX = this.target.x < this.x;
            }

            this.sprite.render(ctx, this.x, this.y, this.spriteScale, {
                opacity: this.damageFlash > 0 ? 0.7 : 1.0,
                flipX: flipX,
                tint: this.damageFlash > 0 ? '#ffffff' : null,
                glow: true,
                glowColor: auraColors[this.phase - 1],
                glowIntensity: 0.5
            });
        } else {
            // Fallback basic rendering
            const gradient = ctx.createRadialGradient(
                this.x - this.size * 0.3, this.y - this.size * 0.3, 0,
                this.x, this.y, this.size
            );
            gradient.addColorStop(0, '#ce93d8');
            gradient.addColorStop(1, this.color);

            ctx.fillStyle = this.damageFlash > 0 ? '#ffffff' : gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Health bar
        const barWidth = 200;
        const barHeight = 12;
        const barY = this.y - this.size - 60;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(this.x - barWidth / 2 - 3, barY - 3, barWidth + 6, barHeight + 6);
        
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - barWidth / 2, barY, barWidth, barHeight);
        
        // Phase segments
        for (let i = 0; i < this.maxPhases - 1; i++) {
            const segX = this.x - barWidth / 2 + barWidth * this.phaseThresholds[i];
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(segX, barY);
            ctx.lineTo(segX, barY + barHeight);
            ctx.stroke();
        }
        
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = auraColors[this.phase - 1];
        ctx.fillRect(this.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);

        // "BOSS" text
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', this.x, barY - 8);

        ctx.restore();
    }
}

/**
 * World Boss class - themed boss per dimension with unique visuals and combat
 */
class WorldBoss extends Boss {
    constructor(x, y, worldConfig, difficultyMult = {}) {
        super(x, y, difficultyMult);
        
        // Override with world boss config
        this.worldBossConfig = worldConfig;
        this.bossName = worldConfig.name;
        this.bossIcon = worldConfig.icon;
        this.color = worldConfig.color;
        this.auraBaseColor = worldConfig.auraColor;
        this.bossShape = worldConfig.shape || 'crown';
        this.abilities = worldConfig.abilities || ['charge', 'summon', 'aoe', 'shoot'];
        
        // Apply world-specific size and stats
        if (worldConfig.size) this.size = worldConfig.size;
        this.maxHealth *= (worldConfig.healthMult || 1.2);
        this.health = this.maxHealth;
        this.speed *= (worldConfig.speedMult || 1.0);
        this.spriteScale = this.size * 1.8;
        
        // World-specific ability state
        this.specialTimer = 0;
        this.specialCooldown = 4000;
        this.fireRingActive = false;
        this.iceStormActive = false;
        this.laserSweepAngle = 0;
        this.laserSweepActive = false;
        this.voidPullActive = false;
        
        // Eruption zones (Pyroclasm)
        this.eruptionZones = [];
        
        // Freeze zone (Cryomancer)
        this.freezeZoneActive = false;
        this.freezeZoneData = null;
        
        // Drone barrage (Overload Prime)
        this.droneBarrageActive = false;
        this.droneBarrageBursts = 0;
        this.droneBarrageMaxBursts = 3;
        this.droneBarrageCooldown = 0;
        
        // Shadow clones (The Devourer)
        this.shadowCloneSpawn = false;
        
        // Teleport (The Devourer unique movement)
        this.devourerTeleportTimer = 0;
        this.devourerTeleportCooldown = 6000;
        this.devourerTeleportAlpha = 1;
        this.devourerFadingOut = false;
        this.devourerFadeOutTimer = 0;
        this.devourerFadeOutDuration = 1200;
        
        // Pyroclasm magma trail
        this.magmaTrails = [];
        this.magmaTrailTimer = 0;
    }

    update(deltaTime, arena) {
        super.update(deltaTime, arena);
        
        if (!this.active || !this.target) return;
        
        // Update active special effects
        if (this.laserSweepActive) {
            this.laserSweepAngle += deltaTime * 2.5;
            if (this.laserSweepAngle > Math.PI * 2) {
                this.laserSweepActive = false;
                this.laserSweepAngle = 0;
                this.endAbility();
            }
        }
        
        // Update eruption zones (Pyroclasm)
        for (const zone of this.eruptionZones) {
            zone.timer += deltaTime * 1000;
            if (zone.timer >= zone.warningTime && !zone.active) {
                zone.active = true;
            }
        }
        
        // Drone barrage burst fire (Overload Prime)
        if (this.droneBarrageActive) {
            this.droneBarrageCooldown -= deltaTime * 1000;
            if (this.droneBarrageCooldown <= 0 && this.droneBarrageBursts < this.droneBarrageMaxBursts) {
                // Fire projectiles in 8 directions
                this.droneBarrageShoot = true;
                this.droneBarrageBursts++;
                this.droneBarrageCooldown = 400;
                if (this.droneBarrageBursts >= this.droneBarrageMaxBursts) {
                    this.droneBarrageActive = false;
                    this.endAbility();
                }
            }
        }
        
        // The Devourer: periodic teleport movement (slow fade-out → move → fade-in)
        if (this.bossShape === 'eye') {
            if (this.devourerFadingOut) {
                // Phase 1: Fading out before teleport
                this.devourerFadeOutTimer += deltaTime * 1000;
                this.devourerTeleportAlpha = Math.max(0, 1 - this.devourerFadeOutTimer / this.devourerFadeOutDuration);
                
                if (this.devourerFadeOutTimer >= this.devourerFadeOutDuration) {
                    // Fully faded — now actually teleport
                    this.devourerFadingOut = false;
                    this.devourerFadeOutTimer = 0;
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 200 + Math.random() * 150;
                    this.x = this.target.x + Math.cos(angle) * dist;
                    this.y = this.target.y + Math.sin(angle) * dist;
                    this.x = this.wrapCoord(this.x, CONFIG.ARENA.WIDTH);
                    this.y = this.wrapCoord(this.y, CONFIG.ARENA.HEIGHT);
                    this.position.set(this.x, this.y);
                    this.devourerTeleportAlpha = 0;
                }
            } else if (this.devourerTeleportAlpha < 1) {
                // Phase 2: Fading back in after teleport
                this.devourerTeleportAlpha = Math.min(1, this.devourerTeleportAlpha + deltaTime * 0.8);
            } else {
                // Phase 0: Waiting for next teleport
                this.devourerTeleportTimer += deltaTime * 1000;
                if (this.devourerTeleportTimer >= this.devourerTeleportCooldown && !this.currentAbility) {
                    this.devourerTeleportTimer = 0;
                    this.devourerFadingOut = true;
                    this.devourerFadeOutTimer = 0;
                }
            }
        }
        
        // Pyroclasm: leave magma trail
        if (this.bossShape === 'lava') {
            this.magmaTrailTimer += deltaTime * 1000;
            if (this.magmaTrailTimer >= 500) {
                this.magmaTrailTimer = 0;
                this.magmaTrails.push({
                    x: this.x, y: this.y,
                    radius: 25,
                    damage: this.damage * 0.3,
                    timer: 0,
                    lifetime: 3000
                });
            }
            for (let i = this.magmaTrails.length - 1; i >= 0; i--) {
                this.magmaTrails[i].timer += deltaTime * 1000;
                if (this.magmaTrails[i].timer >= this.magmaTrails[i].lifetime) {
                    this.magmaTrails.splice(i, 1);
                }
            }
        }
    }

    /**
     * Override useAbility to handle world-specific ability names
     */
    useAbility() {
        const ability = this.abilities[MathUtils.randomInt(0, this.abilities.length - 1)];
        
        switch (ability) {
            case 'charge':
                this.startCharge();
                break;
            case 'summon':
                if (this.summonCount < this.maxSummons) {
                    this.summonMinions();
                }
                break;
            case 'aoe':
                this.aoeAttack();
                break;
            case 'shoot':
                this.shootProjectiles = true;
                this.currentAbility = 'shoot';
                setTimeout(() => this.endAbility(), 500);
                break;
            // --- Pyroclasm (lava) abilities ---
            case 'fireRing':
                this.fireRingActive = true;
                this.fireRingStart = Date.now();
                this.currentAbility = 'fireRing';
                setTimeout(() => { this.fireRingActive = false; this.endAbility(); }, 2500);
                break;
            case 'eruption':
                this.startEruption();
                break;
            // --- Cryomancer (crystal) abilities ---
            case 'freezeZone':
                this.startFreezeZone();
                break;
            case 'iceStorm':
                this.iceStormActive = true;
                this.currentAbility = 'iceStorm';
                setTimeout(() => { this.iceStormActive = false; this.endAbility(); }, 2500);
                break;
            // --- Overload Prime (mech) abilities ---
            case 'droneBarrage':
                this.startDroneBarrage();
                break;
            case 'laserSweep':
                this.laserSweepActive = true;
                this.laserSweepAngle = 0;
                this.currentAbility = 'laserSweep';
                break;
            // --- The Devourer (eye) abilities ---
            case 'voidPull':
                this.voidPullActive = true;
                this.currentAbility = 'voidPull';
                setTimeout(() => { this.voidPullActive = false; this.endAbility(); }, 4000);
                break;
            case 'shadowClones':
                this.startShadowClones();
                break;
            default:
                this.startCharge();
                break;
        }
    }

    /**
     * Pyroclasm: Eruption — spawn multiple ground eruptions near the player
     */
    startEruption() {
        this.currentAbility = 'eruption';
        this.eruptionZones = [];
        const tx = this.target ? this.target.x : this.x;
        const ty = this.target ? this.target.y : this.y;
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 30 + Math.random() * 130;
            this.eruptionZones.push({
                x: tx + Math.cos(angle) * dist,
                y: ty + Math.sin(angle) * dist,
                radius: 65,
                warningTime: 1200,
                timer: 0,
                active: false,
                damage: this.damage * 0.4
            });
        }
        setTimeout(() => {
            this.eruptionZones = [];
            this.endAbility();
        }, 2200);
    }

    /**
     * Cryomancer: Freeze Zone — persistent frozen area on the ground with warning
     */
    startFreezeZone() {
        this.currentAbility = 'freezeZone';
        this.freezeZoneData = {
            x: this.target ? this.target.x : this.x,
            y: this.target ? this.target.y : this.y,
            radius: 130,
            damage: this.damage * 0.3,
            slowMult: 0.4,
            slowDuration: 800,
            warning: true,
            warningTime: 1500,
            warningTimer: 0
        };
        this.freezeZoneActive = true;
        setTimeout(() => {
            this.freezeZoneActive = false;
            this.freezeZoneData = null;
            this.endAbility();
        }, 5500); // 1.5s warning + 4s active
    }

    /**
     * Overload Prime: Drone Barrage — fire projectile bursts in all directions
     */
    startDroneBarrage() {
        this.currentAbility = 'droneBarrage';
        this.droneBarrageActive = true;
        this.droneBarrageBursts = 0;
        this.droneBarrageCooldown = 0;
    }

    /**
     * The Devourer: Shadow Clones — spawn shadow copies of the boss
     */
    startShadowClones() {
        this.currentAbility = 'shadowClones';
        this.shadowCloneSpawn = true;
        this.summonCount++;
        setTimeout(() => this.endAbility(), 500);
    }

    render(ctx) {
        if (!this.active) return;

        ctx.save();

        const t = Date.now();
        const auraColors = [this.auraBaseColor, this.color, '#ff4444'];
        const currentAura = auraColors[this.phase - 1] || this.auraBaseColor;

        // --- CHARGE VISUAL (all bosses) ---
        if (this.isCharging && this.chargeDirection) {
            const bx = this.x; const by = this.y;
            // Pulsing warning glow on boss (intensifies as charge builds)
            const chargeGlow = ctx.createRadialGradient(bx, by, 0, bx, by, this.size * 1.8);
            chargeGlow.addColorStop(0, `rgba(255, 50, 50, ${0.25 + Math.sin(t / 30) * 0.15})`);
            chargeGlow.addColorStop(0.6, `rgba(255, 20, 20, ${0.1 + Math.sin(t / 30) * 0.08})`);
            chargeGlow.addColorStop(1, 'rgba(255, 0, 0, 0)');
            ctx.fillStyle = chargeGlow;
            ctx.beginPath();
            ctx.arc(bx, by, this.size * 1.8, 0, Math.PI * 2);
            ctx.fill();
            // Ground cracks / shockwave ring growing outward
            const crackRing = this.size * (1.2 + Math.sin(t / 60) * 0.3);
            ctx.strokeStyle = `rgba(255, 80, 30, ${0.4 + Math.sin(t / 40) * 0.2})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(bx, by, crackRing, 0, Math.PI * 2);
            ctx.stroke();
        }

        // --- SUMMON VISUAL (all bosses) — boss glows briefly ---
        if (this.currentAbility === 'summon' || this.currentAbility === 'shadowClones') {
            const bx = this.x; const by = this.y;
            const summonPulse = Math.sin(t / 50) * 0.3 + 0.7;
            const glowColor = this.bossShape === 'eye' ? '150, 0, 255' : '255, 180, 0';
            // Brief aura glow on boss body
            const summonGlow = ctx.createRadialGradient(bx, by, this.size * 0.5, bx, by, this.size * 1.5);
            summonGlow.addColorStop(0, `rgba(${glowColor}, ${0.3 * summonPulse})`);
            summonGlow.addColorStop(1, `rgba(${glowColor}, 0)`);
            ctx.fillStyle = summonGlow;
            ctx.beginPath();
            ctx.arc(bx, by, this.size * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // --- SHAPE-SPECIFIC RENDERING ---
        switch (this.bossShape) {
            case 'lava':
                this.renderLavaBoss(ctx, t, currentAura);
                break;
            case 'crystal':
                this.renderCrystalBoss(ctx, t, currentAura);
                break;
            case 'mech':
                this.renderMechBoss(ctx, t, currentAura);
                break;
            case 'eye':
                this.renderEyeBoss(ctx, t, currentAura);
                break;
            default:
                this.renderCrownBoss(ctx, t, currentAura);
                break;
        }

        // --- HEALTH BAR (common) ---
        this.renderBossHealthBar(ctx, currentAura);

        ctx.restore();
    }

    // --- VOID OVERLORD (crown shape) ---
    renderCrownBoss(ctx, t, aura) {
        const sz = this.size;
        const bx = this.x;
        const by = this.y;
        const flash = this.damageFlash > 0;

        // Spinning aura particles (ethereal swirl)
        const auraSize = sz + 25 + Math.sin(t / 250) * 10;
        for (let i = 0; i < 10; i++) {
            const angle = (t / 600) + (i * Math.PI / 5);
            const dist = auraSize * (0.35 + Math.sin(t / 300 + i * 2) * 0.1);
            const ox = Math.cos(angle) * dist;
            const oy = Math.sin(angle) * dist;
            const pSize = 8 + Math.sin(t / 150 + i) * 4;
            const aGrad = ctx.createRadialGradient(bx + ox, by + oy, 0, bx + ox, by + oy, pSize * 3);
            aGrad.addColorStop(0, `rgba(200, 100, 255, ${0.25 + Math.sin(t / 200 + i) * 0.1})`);
            aGrad.addColorStop(1, 'rgba(100, 0, 200, 0)');
            ctx.fillStyle = aGrad;
            ctx.beginPath();
            ctx.arc(bx + ox, by + oy, pSize * 3, 0, Math.PI * 2);
            ctx.fill();
        }
        // Aura ring
        ctx.strokeStyle = aura;
        ctx.lineWidth = 4 + Math.sin(t / 200) * 2;
        ctx.beginPath();
        ctx.arc(bx, by, auraSize, 0, Math.PI * 2);
        ctx.stroke();

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(bx + 5, by + sz * 0.5, sz * 0.9, sz * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        if (this.sprite) {
            let flipX = false;
            if (this.target) flipX = this.target.x < bx;
            this.sprite.render(ctx, bx, by, this.spriteScale, {
                opacity: flash ? 0.7 : 1.0,
                flipX: flipX,
                tint: flash ? '#ffffff' : null,
                glow: true,
                glowColor: aura,
                glowIntensity: 0.5
            });
        } else {
            // Imposing Void Knight
            // Cape (flows behind)
            const capeWave = Math.sin(t / 300) * 0.1;
            ctx.fillStyle = flash ? '#fff' : '#2a0044';
            ctx.beginPath();
            ctx.moveTo(bx - sz * 0.5, by - sz * 0.1);
            ctx.quadraticCurveTo(bx - sz * 0.7, by + sz * 0.4 + capeWave * sz, bx - sz * 0.55, by + sz * 0.95);
            ctx.lineTo(bx + sz * 0.55, by + sz * 0.95);
            ctx.quadraticCurveTo(bx + sz * 0.7, by + sz * 0.4 - capeWave * sz, bx + sz * 0.5, by - sz * 0.1);
            ctx.closePath();
            ctx.fill();

            // Legs (armored greaves)
            ctx.fillStyle = flash ? '#fff' : '#4a0066';
            ctx.beginPath();
            ctx.moveTo(bx - sz * 0.25, by + sz * 0.4);
            ctx.lineTo(bx - sz * 0.45, by + sz * 0.85);
            ctx.lineTo(bx - sz * 0.35, by + sz * 0.9);
            ctx.lineTo(bx - sz * 0.08, by + sz * 0.45);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(bx + sz * 0.08, by + sz * 0.45);
            ctx.lineTo(bx + sz * 0.35, by + sz * 0.9);
            ctx.lineTo(bx + sz * 0.45, by + sz * 0.85);
            ctx.lineTo(bx + sz * 0.25, by + sz * 0.4);
            ctx.closePath();
            ctx.fill();
            // Knee guards
            ctx.fillStyle = flash ? '#fff' : '#7b1fa2';
            ctx.beginPath();
            ctx.arc(bx - sz * 0.2, by + sz * 0.55, sz * 0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(bx + sz * 0.2, by + sz * 0.55, sz * 0.1, 0, Math.PI * 2);
            ctx.fill();

            // Body armor (layered plates)
            const grad = ctx.createRadialGradient(bx, by - sz * 0.2, 0, bx, by, sz);
            grad.addColorStop(0, '#ce93d8');
            grad.addColorStop(0.3, '#ab47bc');
            grad.addColorStop(0.6, '#7b1fa2');
            grad.addColorStop(1, '#4a148c');
            ctx.fillStyle = flash ? '#fff' : grad;
            ctx.beginPath();
            ctx.moveTo(bx, by - sz * 0.7);
            ctx.lineTo(bx + sz * 0.7, by - sz * 0.15);
            ctx.lineTo(bx + sz * 0.6, by + sz * 0.5);
            ctx.lineTo(bx - sz * 0.6, by + sz * 0.5);
            ctx.lineTo(bx - sz * 0.7, by - sz * 0.15);
            ctx.closePath();
            ctx.fill();
            // Armor trim
            ctx.strokeStyle = '#e1bee7';
            ctx.lineWidth = 3;
            ctx.stroke();
            // Center chest emblem (void symbol)
            ctx.fillStyle = '#e040fb';
            ctx.shadowColor = '#e040fb';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(bx, by - sz * 0.1, sz * 0.12, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#1a0033';
            ctx.beginPath();
            ctx.arc(bx, by - sz * 0.1, sz * 0.06, 0, Math.PI * 2);
            ctx.fill();
            // Armor plate lines
            ctx.strokeStyle = 'rgba(225, 190, 231, 0.3)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(bx - sz * 0.45, by);
            ctx.lineTo(bx + sz * 0.45, by);
            ctx.moveTo(bx - sz * 0.35, by + sz * 0.25);
            ctx.lineTo(bx + sz * 0.35, by + sz * 0.25);
            ctx.stroke();

            // Shoulder pauldrons
            ctx.fillStyle = flash ? '#fff' : '#6a1b9a';
            // Left pauldron
            ctx.beginPath();
            ctx.moveTo(bx - sz * 0.6, by - sz * 0.35);
            ctx.lineTo(bx - sz * 0.95, by - sz * 0.25);
            ctx.lineTo(bx - sz * 0.9, by);
            ctx.lineTo(bx - sz * 0.6, by - sz * 0.05);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#ce93d8';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Right pauldron
            ctx.beginPath();
            ctx.moveTo(bx + sz * 0.6, by - sz * 0.35);
            ctx.lineTo(bx + sz * 0.95, by - sz * 0.25);
            ctx.lineTo(bx + sz * 0.9, by);
            ctx.lineTo(bx + sz * 0.6, by - sz * 0.05);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Pauldron spikes
            ctx.fillStyle = '#e1bee7';
            ctx.beginPath();
            ctx.moveTo(bx - sz * 0.85, by - sz * 0.25);
            ctx.lineTo(bx - sz * 1.05, by - sz * 0.55);
            ctx.lineTo(bx - sz * 0.75, by - sz * 0.2);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(bx + sz * 0.85, by - sz * 0.25);
            ctx.lineTo(bx + sz * 1.05, by - sz * 0.55);
            ctx.lineTo(bx + sz * 0.75, by - sz * 0.2);
            ctx.closePath();
            ctx.fill();

            // Arms (segmented armor)
            ctx.fillStyle = flash ? '#fff' : '#7b1fa2';
            const armSwing = Math.sin(t / 250) * 0.1;
            // Left upper arm
            ctx.beginPath();
            ctx.moveTo(bx - sz * 0.8, by - sz * 0.05);
            ctx.lineTo(bx - sz * 1.05, by + sz * 0.2 + armSwing * sz);
            ctx.lineTo(bx - sz * 0.9, by + sz * 0.3 + armSwing * sz);
            ctx.lineTo(bx - sz * 0.65, by + sz * 0.1);
            ctx.closePath();
            ctx.fill();
            // Left forearm
            ctx.fillStyle = flash ? '#fff' : '#6a1b9a';
            ctx.beginPath();
            ctx.moveTo(bx - sz * 0.98, by + sz * 0.2 + armSwing * sz);
            ctx.lineTo(bx - sz * 1.15, by + sz * 0.4 + armSwing * sz);
            ctx.lineTo(bx - sz * 1.0, by + sz * 0.5 + armSwing * sz);
            ctx.lineTo(bx - sz * 0.85, by + sz * 0.3 + armSwing * sz);
            ctx.closePath();
            ctx.fill();
            // Left gauntlet
            ctx.fillStyle = flash ? '#fff' : '#9c27b0';
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a = (i / 5) * Math.PI * 2;
                const r = sz * 0.14 * (0.9 + Math.sin(i * 2.5) * 0.1);
                const px = bx - sz * 1.08 + Math.cos(a) * r;
                const py = by + sz * 0.45 + armSwing * sz + Math.sin(a) * r;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            // Right upper arm
            ctx.fillStyle = flash ? '#fff' : '#7b1fa2';
            ctx.beginPath();
            ctx.moveTo(bx + sz * 0.8, by - sz * 0.05);
            ctx.lineTo(bx + sz * 1.05, by + sz * 0.2 - armSwing * sz);
            ctx.lineTo(bx + sz * 0.9, by + sz * 0.3 - armSwing * sz);
            ctx.lineTo(bx + sz * 0.65, by + sz * 0.1);
            ctx.closePath();
            ctx.fill();
            // Right forearm
            ctx.fillStyle = flash ? '#fff' : '#6a1b9a';
            ctx.beginPath();
            ctx.moveTo(bx + sz * 0.98, by + sz * 0.2 - armSwing * sz);
            ctx.lineTo(bx + sz * 1.15, by + sz * 0.4 - armSwing * sz);
            ctx.lineTo(bx + sz * 1.0, by + sz * 0.5 - armSwing * sz);
            ctx.lineTo(bx + sz * 0.85, by + sz * 0.3 - armSwing * sz);
            ctx.closePath();
            ctx.fill();
            // Right gauntlet
            ctx.fillStyle = flash ? '#fff' : '#9c27b0';
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a = (i / 5) * Math.PI * 2;
                const r = sz * 0.14 * (0.9 + Math.sin(i * 2.5 + 1) * 0.1);
                const px = bx + sz * 1.08 + Math.cos(a) * r;
                const py = by + sz * 0.45 - armSwing * sz + Math.sin(a) * r;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();

            // Void sword (right hand)
            ctx.save();
            ctx.translate(bx + sz * 1.08, by + sz * 0.45 - armSwing * sz);
            ctx.rotate(0.4 + armSwing);
            // Blade
            const swordGrad = ctx.createLinearGradient(0, -sz * 0.1, 0, -sz * 0.9);
            swordGrad.addColorStop(0, '#9c27b0');
            swordGrad.addColorStop(0.5, '#e040fb');
            swordGrad.addColorStop(1, '#ffffff');
            ctx.fillStyle = flash ? '#fff' : swordGrad;
            ctx.beginPath();
            ctx.moveTo(-sz * 0.04, -sz * 0.1);
            ctx.lineTo(0, -sz * 0.9);
            ctx.lineTo(sz * 0.04, -sz * 0.1);
            ctx.closePath();
            ctx.fill();
            // Sword glow
            ctx.shadowColor = '#e040fb';
            ctx.shadowBlur = 10;
            ctx.strokeStyle = 'rgba(224, 64, 251, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.shadowBlur = 0;
            // Cross guard
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(-sz * 0.1, -sz * 0.12, sz * 0.2, sz * 0.04);
            ctx.restore();

            // Head (helmet with visor)
            ctx.fillStyle = flash ? '#fff' : '#4a148c';
            ctx.beginPath();
            ctx.arc(bx, by - sz * 0.55, sz * 0.35, 0, Math.PI * 2);
            ctx.fill();
            // Helmet face plate
            ctx.fillStyle = flash ? '#fff' : '#2a0044';
            ctx.beginPath();
            ctx.moveTo(bx - sz * 0.2, by - sz * 0.65);
            ctx.lineTo(bx + sz * 0.2, by - sz * 0.65);
            ctx.lineTo(bx + sz * 0.15, by - sz * 0.4);
            ctx.lineTo(bx, by - sz * 0.35);
            ctx.lineTo(bx - sz * 0.15, by - sz * 0.4);
            ctx.closePath();
            ctx.fill();

            // Crown (golden, ornate)
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#ffaa00';
            ctx.shadowBlur = 12;
            // Crown base
            ctx.fillRect(bx - sz * 0.34, by - sz * 0.86, sz * 0.68, sz * 0.08);
            // Crown spikes with jewels
            for (let i = 0; i < 5; i++) {
                const cx = bx + (i - 2) * sz * 0.14;
                const ch = sz * 0.2 + (i === 2 ? sz * 0.14 : (i % 2 === 0 ? sz * 0.07 : 0));
                ctx.beginPath();
                ctx.moveTo(cx - sz * 0.06, by - sz * 0.82);
                ctx.lineTo(cx, by - sz * 0.82 - ch);
                ctx.lineTo(cx + sz * 0.06, by - sz * 0.82);
                ctx.closePath();
                ctx.fill();
            }
            ctx.shadowBlur = 0;
            // Crown jewels
            const jewels = ['#ff00ff', '#00ffff', '#ff00ff'];
            for (let i = 0; i < 3; i++) {
                ctx.fillStyle = jewels[i];
                ctx.shadowColor = jewels[i];
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(bx + (i - 1) * sz * 0.14, by - sz * 0.84, sz * 0.04, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.shadowBlur = 0;

            // Eyes (menacing glow through visor)
            ctx.fillStyle = '#e040fb';
            ctx.shadowColor = '#e040fb';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.ellipse(bx - sz * 0.1, by - sz * 0.55, sz * 0.08, sz * 0.04, 0, 0, Math.PI * 2);
            ctx.ellipse(bx + sz * 0.1, by - sz * 0.55, sz * 0.08, sz * 0.04, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }


    renderLavaBoss(ctx, t, aura) {
        const sz = this.size;
        const bx = this.x;
        const by = this.y;
        const flash = this.damageFlash > 0;

        // Rising embers (float upward)
        for (let i = 0; i < 14; i++) {
            const seed = i * 137.5;
            const ex = bx + Math.sin(t / 400 + seed) * sz * 1.2;
            const ey = by - (((t / 3 + seed * 10) % (sz * 2.5))) + sz;
            const eSize = 3 + Math.sin(t / 100 + i) * 2;
            const eAlpha = 0.4 + Math.sin(t / 80 + i) * 0.2;
            ctx.fillStyle = `rgba(255, ${Math.floor(100 + Math.sin(t / 60 + i) * 80)}, 0, ${eAlpha})`;
            ctx.beginPath();
            ctx.arc(ex, ey, eSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // Fire ring ability visual — expanding fire wave
        if (this.fireRingActive) {
            const maxRadius = sz * 2.5;
            const elapsed = Date.now() - (this.fireRingStart || Date.now());
            const expandDuration = 600; // Fire expands outward in 600ms
            const expandProgress = Math.min(elapsed / expandDuration, 1.0);
            const currentRadius = maxRadius * expandProgress;

            // Ground fire fill — expanding radial gradient
            const fireGrad = ctx.createRadialGradient(bx, by, 0, bx, by, currentRadius);
            fireGrad.addColorStop(0, 'rgba(255, 200, 0, 0.45)');
            fireGrad.addColorStop(0.3, 'rgba(255, 120, 0, 0.35)');
            fireGrad.addColorStop(0.6, 'rgba(255, 50, 0, 0.25)');
            fireGrad.addColorStop(0.85, 'rgba(200, 20, 0, 0.15)');
            fireGrad.addColorStop(1, 'rgba(100, 0, 0, 0)');
            ctx.fillStyle = fireGrad;
            ctx.beginPath();
            ctx.arc(bx, by, currentRadius, 0, Math.PI * 2);
            ctx.fill();

            // Animated flame tongues — fire tendrils rising from the expanding ring
            if (expandProgress > 0.2) {
                const flameCount = 20;
                for (let i = 0; i < flameCount; i++) {
                    const baseAngle = (i / flameCount) * Math.PI * 2;
                    const wobble = Math.sin(t / 60 + i * 2.5) * 0.15;
                    const angle = baseAngle + wobble;
                    const flameDist = currentRadius * (0.4 + Math.sin(t / 80 + i * 3) * 0.15 + Math.random() * 0.05);
                    const fx = bx + Math.cos(angle) * flameDist;
                    const fy = by + Math.sin(angle) * flameDist;
                    const flameH = 12 + Math.sin(t / 50 + i * 1.7) * 8;
                    const flameW = 5 + Math.sin(t / 70 + i) * 2;

                    // Each flame tongue
                    const flameGrad = ctx.createLinearGradient(fx, fy, fx, fy - flameH);
                    flameGrad.addColorStop(0, `rgba(255, 80, 0, ${0.6 + Math.sin(t / 40 + i) * 0.2})`);
                    flameGrad.addColorStop(0.4, `rgba(255, 180, 0, ${0.5 + Math.sin(t / 35 + i) * 0.15})`);
                    flameGrad.addColorStop(1, 'rgba(255, 255, 100, 0)');
                    ctx.fillStyle = flameGrad;
                    ctx.beginPath();
                    ctx.moveTo(fx - flameW, fy);
                    ctx.quadraticCurveTo(fx - flameW * 0.3, fy - flameH * 0.6, fx, fy - flameH);
                    ctx.quadraticCurveTo(fx + flameW * 0.3, fy - flameH * 0.6, fx + flameW, fy);
                    ctx.closePath();
                    ctx.fill();
                }
            }

            // Outer ring edge — fiery border
            if (expandProgress > 0.3) {
                for (let r = 0; r < 2; r++) {
                    const rr = currentRadius - r * 6;
                    ctx.strokeStyle = `rgba(255, ${40 + r * 50}, 0, ${(0.5 - r * 0.15) + Math.sin(t / 50 + r) * 0.15})`;
                    ctx.lineWidth = 6 - r * 2;
                    ctx.setLineDash([8 + Math.sin(t / 30) * 4, 6]);
                    ctx.beginPath();
                    ctx.arc(bx, by, rr, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.setLineDash([]);
            }

            // Sparks / embers flying outward from the fire
            for (let i = 0; i < 12; i++) {
                const sparkAngle = (i / 12) * Math.PI * 2 + (t / 300);
                const sparkDist = currentRadius * (0.3 + ((t / 5 + i * 200) % 400) / 400 * 0.7);
                if (sparkDist < currentRadius) {
                    const sx = bx + Math.cos(sparkAngle) * sparkDist;
                    const sy = by + Math.sin(sparkAngle) * sparkDist - Math.sin(t / 40 + i) * 5;
                    const sparkAlpha = 1 - (sparkDist / currentRadius);
                    ctx.fillStyle = `rgba(255, ${200 + Math.floor(Math.sin(t / 20 + i) * 55)}, 0, ${sparkAlpha * 0.7})`;
                    ctx.beginPath();
                    ctx.arc(sx, sy, 2 + Math.sin(t / 30 + i) * 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Central heat glow
            const coreGlow = ctx.createRadialGradient(bx, by, 0, bx, by, sz * 0.8);
            coreGlow.addColorStop(0, `rgba(255, 255, 200, ${0.3 + Math.sin(t / 60) * 0.1})`);
            coreGlow.addColorStop(0.5, 'rgba(255, 150, 0, 0.15)');
            coreGlow.addColorStop(1, 'rgba(255, 50, 0, 0)');
            ctx.fillStyle = coreGlow;
            ctx.beginPath();
            ctx.arc(bx, by, sz * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Heat shimmer
        ctx.fillStyle = 'rgba(255, 60, 0, 0.15)';
        ctx.beginPath();
        ctx.ellipse(bx, by + sz * 0.6, sz * 1.2, sz * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // === MASSIVE LAVA DEMON BODY ===
        // Legs (thick rocky pillars with lava veins)
        ctx.fillStyle = flash ? '#fff' : '#553322';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.45, by + sz * 0.25);
        ctx.lineTo(bx - sz * 0.6, by + sz * 0.9);
        ctx.lineTo(bx - sz * 0.15, by + sz * 0.85);
        ctx.lineTo(bx - sz * 0.15, by + sz * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.15, by + sz * 0.25);
        ctx.lineTo(bx + sz * 0.15, by + sz * 0.85);
        ctx.lineTo(bx + sz * 0.6, by + sz * 0.9);
        ctx.lineTo(bx + sz * 0.45, by + sz * 0.25);
        ctx.closePath();
        ctx.fill();
        // Lava glow on legs
        ctx.strokeStyle = `rgba(255, ${100 + Math.floor(Math.sin(t / 100) * 50)}, 0, 0.7)`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.35, by + sz * 0.4);
        ctx.quadraticCurveTo(bx - sz * 0.42, by + sz * 0.6, bx - sz * 0.38, by + sz * 0.8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.35, by + sz * 0.45);
        ctx.quadraticCurveTo(bx + sz * 0.28, by + sz * 0.65, bx + sz * 0.32, by + sz * 0.82);
        ctx.stroke();

        // Torso (massive craggy body)
        const tGrad = ctx.createRadialGradient(bx, by - sz * 0.15, 0, bx, by, sz);
        tGrad.addColorStop(0, '#ff6600');
        tGrad.addColorStop(0.25, '#cc3300');
        tGrad.addColorStop(0.55, '#772200');
        tGrad.addColorStop(1, '#441100');
        ctx.fillStyle = flash ? '#fff' : tGrad;
        ctx.beginPath();
        for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2;
            const wobble = sz * (0.88 + Math.sin(t / 250 + i * 2.1) * 0.06 + Math.sin(i * 3.7) * 0.12);
            const px = bx + Math.cos(a) * wobble * 0.9;
            const py = by + Math.sin(a) * wobble * 0.75;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Lava cracks (pulsing)
        const lavaR = Math.floor(200 + Math.sin(t / 80) * 55);
        ctx.strokeStyle = `rgba(255, ${lavaR}, 0, 0.85)`;
        ctx.lineWidth = 3;
        for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2 + 0.2;
            ctx.beginPath();
            ctx.moveTo(bx, by - sz * 0.1);
            const mx = bx + Math.cos(a + 0.15) * sz * 0.4;
            const my = by + Math.sin(a + 0.15) * sz * 0.35;
            ctx.quadraticCurveTo(mx, my, bx + Math.cos(a) * sz * 0.78, by + Math.sin(a) * sz * 0.62);
            ctx.stroke();
        }
        // Lava drips from cracks (animated drops falling)
        for (let i = 0; i < 4; i++) {
            const da = (i / 4) * Math.PI * 2 + 1;
            const dripX = bx + Math.cos(da) * sz * 0.7;
            const dripBaseY = by + Math.sin(da) * sz * 0.55;
            const dripFall = ((t / 2 + i * 300) % 600) / 600;
            const dripY = dripBaseY + dripFall * sz * 0.3;
            const dripAlpha = 1 - dripFall;
            ctx.fillStyle = `rgba(255, ${Math.floor(120 + Math.sin(t / 60) * 40)}, 0, ${dripAlpha * 0.8})`;
            ctx.beginPath();
            ctx.ellipse(dripX, dripY, 3, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Shoulder plates (rocky armor)
        ctx.fillStyle = flash ? '#fff' : '#442211';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.7, by - sz * 0.4);
        ctx.lineTo(bx - sz * 1.1, by - sz * 0.3);
        ctx.lineTo(bx - sz * 1.0, by - sz * 0.05);
        ctx.lineTo(bx - sz * 0.7, by - sz * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.7, by - sz * 0.4);
        ctx.lineTo(bx + sz * 1.1, by - sz * 0.3);
        ctx.lineTo(bx + sz * 1.0, by - sz * 0.05);
        ctx.lineTo(bx + sz * 0.7, by - sz * 0.1);
        ctx.closePath();
        ctx.fill();
        // Shoulder lava glow
        ctx.fillStyle = `rgba(255, 120, 0, ${0.4 + Math.sin(t / 150) * 0.2})`;
        ctx.beginPath();
        ctx.arc(bx - sz * 0.9, by - sz * 0.15, sz * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx + sz * 0.9, by - sz * 0.15, sz * 0.08, 0, Math.PI * 2);
        ctx.fill();

        // Arms (segmented: upper + forearm + fist)
        const armSway = Math.sin(t / 250) * 0.08;
        // Left upper arm
        ctx.fillStyle = flash ? '#fff' : '#5a2a10';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.85, by - sz * 0.1);
        ctx.lineTo(bx - sz * 1.15, by + sz * 0.15 + armSway * sz);
        ctx.lineTo(bx - sz * 1.05, by + sz * 0.3 + armSway * sz);
        ctx.lineTo(bx - sz * 0.75, by + sz * 0.08);
        ctx.closePath();
        ctx.fill();
        // Left elbow lava joint
        ctx.fillStyle = `rgba(255, ${Math.floor(140 + Math.sin(t / 100) * 40)}, 0, 0.8)`;
        ctx.beginPath();
        ctx.arc(bx - sz * 1.1, by + sz * 0.22 + armSway * sz, sz * 0.09, 0, Math.PI * 2);
        ctx.fill();
        // Left forearm
        ctx.fillStyle = flash ? '#fff' : '#4a2010';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 1.1, by + sz * 0.2 + armSway * sz);
        ctx.lineTo(bx - sz * 1.3, by + sz * 0.45 + armSway * sz);
        ctx.lineTo(bx - sz * 1.2, by + sz * 0.55 + armSway * sz);
        ctx.lineTo(bx - sz * 1.0, by + sz * 0.32 + armSway * sz);
        ctx.closePath();
        ctx.fill();
        // Left fist (rocky boulder)
        ctx.fillStyle = flash ? '#fff' : '#663320';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const r = sz * 0.18 * (0.85 + Math.sin(i * 2.3) * 0.15);
            const px = bx - sz * 1.25 + Math.cos(a) * r;
            const py = by + sz * 0.5 + armSway * sz + Math.sin(a) * r;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        // Fist lava glow
        ctx.fillStyle = `rgba(255, 100, 0, ${0.4 + Math.sin(t / 80) * 0.2})`;
        ctx.beginPath();
        ctx.arc(bx - sz * 1.25, by + sz * 0.5 + armSway * sz, sz * 0.08, 0, Math.PI * 2);
        ctx.fill();

        // Right arm (mirrored)
        ctx.fillStyle = flash ? '#fff' : '#5a2a10';
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.85, by - sz * 0.1);
        ctx.lineTo(bx + sz * 1.15, by + sz * 0.15 - armSway * sz);
        ctx.lineTo(bx + sz * 1.05, by + sz * 0.3 - armSway * sz);
        ctx.lineTo(bx + sz * 0.75, by + sz * 0.08);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = `rgba(255, ${Math.floor(140 + Math.sin(t / 100 + 1) * 40)}, 0, 0.8)`;
        ctx.beginPath();
        ctx.arc(bx + sz * 1.1, by + sz * 0.22 - armSway * sz, sz * 0.09, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = flash ? '#fff' : '#4a2010';
        ctx.beginPath();
        ctx.moveTo(bx + sz * 1.1, by + sz * 0.2 - armSway * sz);
        ctx.lineTo(bx + sz * 1.3, by + sz * 0.45 - armSway * sz);
        ctx.lineTo(bx + sz * 1.2, by + sz * 0.55 - armSway * sz);
        ctx.lineTo(bx + sz * 1.0, by + sz * 0.32 - armSway * sz);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = flash ? '#fff' : '#663320';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const r = sz * 0.18 * (0.85 + Math.sin(i * 2.3 + 1) * 0.15);
            const px = bx + sz * 1.25 + Math.cos(a) * r;
            const py = by + sz * 0.5 - armSway * sz + Math.sin(a) * r;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = `rgba(255, 100, 0, ${0.4 + Math.sin(t / 80 + 1) * 0.2})`;
        ctx.beginPath();
        ctx.arc(bx + sz * 1.25, by + sz * 0.5 - armSway * sz, sz * 0.08, 0, Math.PI * 2);
        ctx.fill();

        // Horns (large, curved, with lava tips)
        ctx.fillStyle = flash ? '#fff' : '#331100';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.3, by - sz * 0.55);
        ctx.quadraticCurveTo(bx - sz * 1.0, by - sz * 1.4, bx - sz * 0.75, by - sz * 1.15);
        ctx.lineTo(bx - sz * 0.15, by - sz * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.3, by - sz * 0.55);
        ctx.quadraticCurveTo(bx + sz * 1.0, by - sz * 1.4, bx + sz * 0.75, by - sz * 1.15);
        ctx.lineTo(bx + sz * 0.15, by - sz * 0.5);
        ctx.closePath();
        ctx.fill();
        // Horn tips glow
        ctx.fillStyle = `rgba(255, ${Math.floor(150 + Math.sin(t / 100) * 50)}, 0, 0.7)`;
        ctx.beginPath();
        ctx.arc(bx - sz * 0.75, by - sz * 1.15, sz * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx + sz * 0.75, by - sz * 1.15, sz * 0.06, 0, Math.PI * 2);
        ctx.fill();

        // Eyes (furious, narrowed, V-shaped angry brows)
        // Dark eye sockets
        ctx.fillStyle = '#220000';
        ctx.beginPath();
        ctx.ellipse(bx - sz * 0.25, by - sz * 0.22, sz * 0.2, sz * 0.14, -0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(bx + sz * 0.25, by - sz * 0.22, sz * 0.2, sz * 0.14, 0.15, 0, Math.PI * 2);
        ctx.fill();
        // Glowing angry eyes (narrow slits)
        ctx.fillStyle = '#ff2200';
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.ellipse(bx - sz * 0.25, by - sz * 0.2, sz * 0.15, sz * 0.06, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(bx + sz * 0.25, by - sz * 0.2, sz * 0.15, sz * 0.06, 0.2, 0, Math.PI * 2);
        ctx.fill();
        // Bright pupil cores
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(bx - sz * 0.25, by - sz * 0.2, sz * 0.04, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx + sz * 0.25, by - sz * 0.2, sz * 0.04, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Angry V-shaped brows (thick, prominent)
        ctx.strokeStyle = '#331100';
        ctx.lineWidth = sz * 0.06;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.42, by - sz * 0.18);
        ctx.lineTo(bx - sz * 0.12, by - sz * 0.32);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.42, by - sz * 0.18);
        ctx.lineTo(bx + sz * 0.12, by - sz * 0.32);
        ctx.stroke();
        // Brow lava glow
        ctx.strokeStyle = `rgba(255, 80, 0, ${0.5 + Math.sin(t / 80) * 0.3})`;
        ctx.lineWidth = sz * 0.03;
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.4, by - sz * 0.17);
        ctx.lineTo(bx - sz * 0.14, by - sz * 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.4, by - sz * 0.17);
        ctx.lineTo(bx + sz * 0.14, by - sz * 0.3);
        ctx.stroke();

        // === MASSIVE GAPING MAW (huge mouth stretching across the face) ===
        // Outer jaw shape (very wide, terrifying)
        const mawOpen = Math.sin(t / 200) * 0.04; // subtle breathing
        ctx.fillStyle = '#0a0000';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.5, by - sz * 0.02);
        ctx.quadraticCurveTo(bx - sz * 0.2, by - sz * 0.08, bx, by - sz * 0.05);
        ctx.quadraticCurveTo(bx + sz * 0.2, by - sz * 0.08, bx + sz * 0.5, by - sz * 0.02);
        ctx.quadraticCurveTo(bx + sz * 0.3, by + sz * (0.5 + mawOpen), bx, by + sz * (0.55 + mawOpen));
        ctx.quadraticCurveTo(bx - sz * 0.3, by + sz * (0.5 + mawOpen), bx - sz * 0.5, by - sz * 0.02);
        ctx.closePath();
        ctx.fill();
        // Deep lava throat (pulsing glow inside)
        const mawGlow = ctx.createRadialGradient(bx, by + sz * 0.2, 0, bx, by + sz * 0.2, sz * 0.35);
        mawGlow.addColorStop(0, `rgba(255, ${Math.floor(180 + Math.sin(t / 50) * 75)}, 0, 1)`);
        mawGlow.addColorStop(0.4, `rgba(255, 80, 0, 0.8)`);
        mawGlow.addColorStop(0.7, `rgba(180, 30, 0, 0.5)`);
        mawGlow.addColorStop(1, 'rgba(50, 0, 0, 0)');
        ctx.fillStyle = mawGlow;
        ctx.beginPath();
        ctx.ellipse(bx, by + sz * 0.2, sz * 0.35, sz * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        // Lava bubbles in throat
        for (let i = 0; i < 5; i++) {
            const bAngle = (i / 5) * Math.PI * 2 + t * 0.003;
            const bDist = sz * (0.08 + Math.sin(t / 150 + i * 1.5) * 0.06);
            const bbx = bx + Math.cos(bAngle) * bDist;
            const bby = by + sz * 0.2 + Math.sin(bAngle) * bDist * 0.7;
            const bSize = sz * (0.03 + Math.sin(t / 80 + i * 2) * 0.015);
            ctx.fillStyle = `rgba(255, ${Math.floor(200 + Math.sin(t / 40 + i) * 55)}, 50, ${0.7 + Math.sin(t / 60 + i) * 0.3})`;
            ctx.beginPath();
            ctx.arc(bbx, bby, bSize, 0, Math.PI * 2);
            ctx.fill();
        }
        // Upper fangs (large, jagged, like stalagmites)
        ctx.fillStyle = '#ffe8cc';
        const upperFangs = [0.15, 0.22, 0.12, 0.18, 0.14, 0.2, 0.13];
        for (let i = 0; i < 7; i++) {
            const fx = bx - sz * 0.44 + (i / 6) * sz * 0.88;
            const fh = sz * upperFangs[i];
            const fw = sz * 0.05;
            ctx.beginPath();
            ctx.moveTo(fx - fw, by - sz * 0.02);
            ctx.lineTo(fx, by - sz * 0.02 + fh);
            ctx.lineTo(fx + fw, by - sz * 0.02);
            ctx.closePath();
            ctx.fill();
        }
        // Lower fangs (pointing up, thick)
        const lowerFangs = [0.16, 0.18];
        for (let i = 0; i < 2; i++) {
            const fx = bx - sz * 0.15 + (i / 1) * sz * 0.3;
            const fh = sz * lowerFangs[i];
            const fw = sz * 0.045;
            ctx.beginPath();
            ctx.moveTo(fx - fw, by + sz * (0.45 + mawOpen));
            ctx.lineTo(fx, by + sz * (0.45 + mawOpen) - fh);
            ctx.lineTo(fx + fw, by + sz * (0.45 + mawOpen));
            ctx.closePath();
            ctx.fill();
        }
        // Drool / lava drips from fangs
        for (let i = 0; i < 3; i++) {
            const dx = bx - sz * 0.25 + i * sz * 0.25;
            const dripLen = sz * (0.05 + ((t / 3 + i * 200) % 400) / 400 * 0.1);
            const dripAlpha = 1 - ((t / 3 + i * 200) % 400) / 400;
            ctx.strokeStyle = `rgba(255, 120, 0, ${dripAlpha * 0.7})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(dx, by + sz * 0.1);
            ctx.lineTo(dx + Math.sin(t / 200 + i) * 2, by + sz * 0.1 + dripLen);
            ctx.stroke();
        }
    }


    renderCrystalBoss(ctx, t, aura) {
        const sz = this.size;
        const bx = this.x;
        const by = this.y;
        const flash = this.damageFlash > 0;

        // Floating ice shards (orbit with trails)
        for (let i = 0; i < 10; i++) {
            const angle = (t / 800) + (i * Math.PI / 5);
            const dist = sz + 30 + Math.sin(t / 300 + i) * 12;
            const sx = bx + Math.cos(angle) * dist;
            const sy = by + Math.sin(angle) * dist;
            // Trail ghost
            const tx2 = bx + Math.cos(angle - 0.15) * dist;
            const ty = by + Math.sin(angle - 0.15) * dist;
            ctx.fillStyle = `rgba(150, 230, 255, ${0.15 + Math.sin(t / 200 + i) * 0.1})`;
            ctx.beginPath();
            ctx.moveTo(tx2, ty - 8); ctx.lineTo(tx2 + 4, ty); ctx.lineTo(tx2, ty + 8); ctx.lineTo(tx2 - 4, ty);
            ctx.closePath();
            ctx.fill();
            // Main shard
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(angle + t / 400);
            ctx.fillStyle = `rgba(180, 240, 255, ${0.6 + Math.sin(t / 200 + i) * 0.25})`;
            ctx.beginPath();
            ctx.moveTo(0, -14); ctx.lineTo(7, 0); ctx.lineTo(0, 14); ctx.lineTo(-7, 0);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#ccf0ff';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }

        // Ice storm visual — full blizzard
        if (this.iceStormActive) {
            const stormR = sz * 2.8;
            // Outer frost ring pulsing
            ctx.strokeStyle = `rgba(100, 220, 255, ${0.35 + Math.sin(t / 100) * 0.2})`;
            ctx.lineWidth = 3;
            ctx.setLineDash([12, 6]);
            ctx.beginPath();
            ctx.arc(bx, by, stormR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            // Ice beams radiating from boss (6 rotating rays)
            for (let i = 0; i < 6; i++) {
                const ra = (t / 300) + (i * Math.PI / 3);
                const rx = bx + Math.cos(ra) * stormR;
                const ry = by + Math.sin(ra) * stormR;
                const beamGrad = ctx.createLinearGradient(bx, by, rx, ry);
                beamGrad.addColorStop(0, 'rgba(180, 240, 255, 0.4)');
                beamGrad.addColorStop(0.6, 'rgba(100, 200, 255, 0.15)');
                beamGrad.addColorStop(1, 'rgba(100, 200, 255, 0)');
                ctx.strokeStyle = beamGrad;
                ctx.lineWidth = 5 + Math.sin(t / 80 + i) * 2;
                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(rx, ry);
                ctx.stroke();
            }
            // Snowflakes (6-pointed stars spinning outward)
            for (let i = 0; i < 24; i++) {
                const a = (t / 120) + (i * Math.PI / 12);
                const d = 40 + (((t / 4 + i * 150) % (stormR - 40)));
                const px = bx + Math.cos(a) * d;
                const py = by + Math.sin(a) * d;
                const sfSize = 4 + Math.sin(t / 60 + i) * 2;
                const sfAlpha = 0.5 + Math.sin(t / 50 + i * 2) * 0.25;
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(t / 200 + i);
                ctx.strokeStyle = `rgba(220, 245, 255, ${sfAlpha})`;
                ctx.lineWidth = 1.2;
                // 6-pointed snowflake
                for (let s = 0; s < 6; s++) {
                    const sa = (s / 6) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(sa) * sfSize, Math.sin(sa) * sfSize);
                    ctx.stroke();
                    // Branch tips
                    const tx = Math.cos(sa) * sfSize * 0.6;
                    const ty = Math.sin(sa) * sfSize * 0.6;
                    ctx.beginPath();
                    ctx.moveTo(tx, ty);
                    ctx.lineTo(tx + Math.cos(sa + 0.8) * sfSize * 0.35, ty + Math.sin(sa + 0.8) * sfSize * 0.35);
                    ctx.stroke();
                }
                ctx.restore();
            }
            // Frost aura gradient
            const frostGrad = ctx.createRadialGradient(bx, by, sz, bx, by, stormR);
            frostGrad.addColorStop(0, 'rgba(100, 200, 255, 0.2)');
            frostGrad.addColorStop(0.5, 'rgba(80, 180, 255, 0.08)');
            frostGrad.addColorStop(1, 'rgba(100, 200, 255, 0)');
            ctx.fillStyle = frostGrad;
            ctx.beginPath();
            ctx.arc(bx, by, sz * 2.8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Shadow
        ctx.fillStyle = 'rgba(0, 80, 150, 0.3)';
        ctx.beginPath();
        ctx.ellipse(bx, by + sz * 0.55, sz * 0.85, sz * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // === ICE ELEMENTAL BODY ===
        // Legs (crystalline pillars)
        ctx.fillStyle = flash ? '#fff' : '#1a6688';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.35, by + sz * 0.25);
        ctx.lineTo(bx - sz * 0.5, by + sz * 0.85);
        ctx.lineTo(bx - sz * 0.15, by + sz * 0.85);
        ctx.lineTo(bx - sz * 0.1, by + sz * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.1, by + sz * 0.25);
        ctx.lineTo(bx + sz * 0.15, by + sz * 0.85);
        ctx.lineTo(bx + sz * 0.5, by + sz * 0.85);
        ctx.lineTo(bx + sz * 0.35, by + sz * 0.25);
        ctx.closePath();
        ctx.fill();
        // Ice shine on legs
        ctx.strokeStyle = 'rgba(200, 240, 255, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.3, by + sz * 0.35);
        ctx.lineTo(bx - sz * 0.35, by + sz * 0.7);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.28, by + sz * 0.4);
        ctx.lineTo(bx + sz * 0.32, by + sz * 0.72);
        ctx.stroke();

        // Torso (hexagonal crystal with gradient)
        const bGrad = ctx.createRadialGradient(bx, by - sz * 0.15, 0, bx, by, sz);
        bGrad.addColorStop(0, '#e0f7fa');
        bGrad.addColorStop(0.25, '#80deea');
        bGrad.addColorStop(0.55, '#4dd0e1');
        bGrad.addColorStop(1, '#006064');
        ctx.fillStyle = flash ? '#fff' : bGrad;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
            const px = bx + Math.cos(a) * sz * 0.88;
            const py = by + Math.sin(a) * sz * 0.78;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#80deea';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Crystal facet lines (shimmer)
        ctx.strokeStyle = `rgba(200, 240, 255, ${0.25 + Math.sin(t / 300) * 0.15})`;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + Math.cos(a) * sz * 0.85, by + Math.sin(a) * sz * 0.75);
            ctx.stroke();
        }
        // Inner frost pattern
        ctx.strokeStyle = 'rgba(180, 230, 255, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(bx + Math.cos(a) * sz * 0.3, by + Math.sin(a) * sz * 0.25);
            ctx.lineTo(bx + Math.cos(a + 0.5) * sz * 0.55, by + Math.sin(a + 0.5) * sz * 0.45);
            ctx.stroke();
        }

        // Shoulder crystal spikes (large, imposing)
        ctx.fillStyle = flash ? '#fff' : '#55ccee';
        // Left shoulder spike cluster
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.65, by - sz * 0.3);
        ctx.lineTo(bx - sz * 1.0, by - sz * 0.85);
        ctx.lineTo(bx - sz * 0.55, by - sz * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.7, by - sz * 0.25);
        ctx.lineTo(bx - sz * 0.85, by - sz * 0.65);
        ctx.lineTo(bx - sz * 0.55, by - sz * 0.3);
        ctx.closePath();
        ctx.fill();
        // Right shoulder spike cluster
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.65, by - sz * 0.3);
        ctx.lineTo(bx + sz * 1.0, by - sz * 0.85);
        ctx.lineTo(bx + sz * 0.55, by - sz * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.7, by - sz * 0.25);
        ctx.lineTo(bx + sz * 0.85, by - sz * 0.65);
        ctx.lineTo(bx + sz * 0.55, by - sz * 0.3);
        ctx.closePath();
        ctx.fill();

        // Arms (ice crystal segmented)
        ctx.fillStyle = flash ? '#fff' : '#2a99bb';
        const armSway = Math.sin(t / 250) * 0.08;
        // Left upper arm
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.75, by - sz * 0.1);
        ctx.lineTo(bx - sz * 1.1, by + sz * 0.1 + armSway * sz);
        ctx.lineTo(bx - sz * 1.0, by + sz * 0.25 + armSway * sz);
        ctx.lineTo(bx - sz * 0.65, by + sz * 0.08);
        ctx.closePath();
        ctx.fill();
        // Left elbow frost
        ctx.fillStyle = `rgba(180, 240, 255, ${0.5 + Math.sin(t / 150) * 0.2})`;
        ctx.beginPath();
        ctx.arc(bx - sz * 1.05, by + sz * 0.17 + armSway * sz, sz * 0.07, 0, Math.PI * 2);
        ctx.fill();
        // Left forearm
        ctx.fillStyle = flash ? '#fff' : '#2288aa';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 1.05, by + sz * 0.15 + armSway * sz);
        ctx.lineTo(bx - sz * 1.25, by + sz * 0.35 + armSway * sz);
        ctx.lineTo(bx - sz * 1.1, by + sz * 0.45 + armSway * sz);
        ctx.lineTo(bx - sz * 0.95, by + sz * 0.27 + armSway * sz);
        ctx.closePath();
        ctx.fill();
        // Left ice fist (crystalline)
        ctx.fillStyle = flash ? '#fff' : '#88ddff';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 1.2, by + sz * 0.3 + armSway * sz);
        ctx.lineTo(bx - sz * 1.4, by + sz * 0.38 + armSway * sz);
        ctx.lineTo(bx - sz * 1.25, by + sz * 0.52 + armSway * sz);
        ctx.lineTo(bx - sz * 1.1, by + sz * 0.42 + armSway * sz);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#aaeeff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Right arm (mirrored)
        ctx.fillStyle = flash ? '#fff' : '#2a99bb';
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.75, by - sz * 0.1);
        ctx.lineTo(bx + sz * 1.1, by + sz * 0.1 - armSway * sz);
        ctx.lineTo(bx + sz * 1.0, by + sz * 0.25 - armSway * sz);
        ctx.lineTo(bx + sz * 0.65, by + sz * 0.08);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = `rgba(180, 240, 255, ${0.5 + Math.sin(t / 150 + 1) * 0.2})`;
        ctx.beginPath();
        ctx.arc(bx + sz * 1.05, by + sz * 0.17 - armSway * sz, sz * 0.07, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = flash ? '#fff' : '#2288aa';
        ctx.beginPath();
        ctx.moveTo(bx + sz * 1.05, by + sz * 0.15 - armSway * sz);
        ctx.lineTo(bx + sz * 1.25, by + sz * 0.35 - armSway * sz);
        ctx.lineTo(bx + sz * 1.1, by + sz * 0.45 - armSway * sz);
        ctx.lineTo(bx + sz * 0.95, by + sz * 0.27 - armSway * sz);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = flash ? '#fff' : '#88ddff';
        ctx.beginPath();
        ctx.moveTo(bx + sz * 1.2, by + sz * 0.3 - armSway * sz);
        ctx.lineTo(bx + sz * 1.4, by + sz * 0.38 - armSway * sz);
        ctx.lineTo(bx + sz * 1.25, by + sz * 0.52 - armSway * sz);
        ctx.lineTo(bx + sz * 1.1, by + sz * 0.42 - armSway * sz);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#aaeeff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Crown of ice crystals (taller, more prominent)
        ctx.fillStyle = '#ccf0ff';
        ctx.shadowColor = '#00ccff';
        ctx.shadowBlur = 8;
        for (let i = 0; i < 7; i++) {
            const cx = bx + (i - 3) * sz * 0.12;
            const ch = sz * 0.15 + (i === 3 ? sz * 0.22 : (i % 2 === 0 ? sz * 0.1 : sz * 0.05));
            ctx.beginPath();
            ctx.moveTo(cx - sz * 0.05, by - sz * 0.62);
            ctx.lineTo(cx, by - sz * 0.62 - ch);
            ctx.lineTo(cx + sz * 0.05, by - sz * 0.62);
            ctx.closePath();
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        // Eyes (piercing ice blue)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(bx - sz * 0.2, by - sz * 0.15, sz * 0.14, sz * 0.09, 0, 0, Math.PI * 2);
        ctx.ellipse(bx + sz * 0.2, by - sz * 0.15, sz * 0.14, sz * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#00bfff';
        ctx.shadowColor = '#00ccff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(bx - sz * 0.2, by - sz * 0.15, sz * 0.07, 0, Math.PI * 2);
        ctx.arc(bx + sz * 0.2, by - sz * 0.15, sz * 0.07, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Inner frost glow (pulsing core)
        const innerGlow = ctx.createRadialGradient(bx, by, 0, bx, by, sz * 0.5);
        innerGlow.addColorStop(0, `rgba(200, 240, 255, ${0.2 + Math.sin(t / 200) * 0.12})`);
        innerGlow.addColorStop(1, 'rgba(100, 200, 255, 0)');
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(bx, by, sz * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }


    renderMechBoss(ctx, t, aura) {
        const sz = this.size;
        const bx = this.x;
        const by = this.y;
        const flash = this.damageFlash > 0;

        // Electric arcs (more dramatic)
        ctx.strokeStyle = `rgba(0, 255, 136, ${0.5 + Math.sin(t / 100) * 0.3})`;
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 6; i++) {
            const startAngle = (t / 250) + i * Math.PI / 3;
            const r = sz + 12 + Math.sin(t / 120 + i) * 10;
            ctx.beginPath();
            ctx.arc(bx, by, r, startAngle, startAngle + Math.PI / 5);
            ctx.stroke();
            // Spark at end of arc
            const sparkA = startAngle + Math.PI / 5;
            ctx.fillStyle = '#88ffcc';
            ctx.beginPath();
            ctx.arc(bx + Math.cos(sparkA) * r, by + Math.sin(sparkA) * r, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Laser sweep
        if (this.laserSweepActive) {
            const sweepLen = 350;
            const sx = bx + Math.cos(this.laserSweepAngle) * sweepLen;
            const sy = by + Math.sin(this.laserSweepAngle) * sweepLen;
            // Beam core
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(sx, sy);
            ctx.stroke();
            // Beam glow
            ctx.strokeStyle = `rgba(0, 255, 100, ${0.7 + Math.sin(t / 40) * 0.3})`;
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(sx, sy);
            ctx.stroke();
            // Outer glow
            ctx.strokeStyle = 'rgba(0, 255, 100, 0.12)';
            ctx.lineWidth = 28;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(sx, sy);
            ctx.stroke();
            // Sparks along beam
            for (let i = 0; i < 6; i++) {
                const frac = (i + Math.sin(t / 30 + i)) / 6;
                const spx = bx + (sx - bx) * frac + (Math.random() - 0.5) * 12;
                const spy = by + (sy - by) * frac + (Math.random() - 0.5) * 12;
                ctx.fillStyle = '#aaffdd';
                ctx.beginPath();
                ctx.arc(spx, spy, 2 + Math.random() * 2, 0, Math.PI * 2);
                ctx.fill();
            }
            // Impact flash at end
            const impactGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 20);
            impactGrad.addColorStop(0, 'rgba(200, 255, 200, 0.6)');
            impactGrad.addColorStop(1, 'rgba(0, 255, 100, 0)');
            ctx.fillStyle = impactGrad;
            ctx.beginPath();
            ctx.arc(sx, sy, 20, 0, Math.PI * 2);
            ctx.fill();
        }

        // Drone barrage — orbiting attack drones
        if (this.droneBarrageActive) {
            const orbitR = sz + 35 + Math.sin(t / 50) * 10;
            // Warning ring
            ctx.strokeStyle = `rgba(0, 255, 136, ${0.2 + Math.sin(t / 40) * 0.15})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 8]);
            ctx.beginPath();
            ctx.arc(bx, by, orbitR + 30, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            // 8 mini drones orbiting and shooting
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2 + t / 200;
                const dx = bx + Math.cos(a) * orbitR;
                const dy = by + Math.sin(a) * orbitR;
                ctx.save();
                ctx.translate(dx, dy);
                ctx.rotate(a + Math.PI / 2);
                // Drone body (diamond shape)
                ctx.fillStyle = `rgba(0, 80, 50, ${0.8 + Math.sin(t / 30 + i) * 0.2})`;
                ctx.beginPath();
                ctx.moveTo(0, -8); ctx.lineTo(6, 0); ctx.lineTo(0, 8); ctx.lineTo(-6, 0);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#00ff88';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                // Drone wings
                ctx.fillStyle = `rgba(0, 200, 100, ${0.5 + Math.sin(t / 20 + i) * 0.3})`;
                ctx.beginPath();
                ctx.moveTo(-6, -2); ctx.lineTo(-14, -6); ctx.lineTo(-10, 0);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(6, -2); ctx.lineTo(14, -6); ctx.lineTo(10, 0);
                ctx.closePath();
                ctx.fill();
                // Drone engine glow
                ctx.fillStyle = `rgba(0, 255, 136, ${0.6 + Math.sin(t / 15 + i * 2) * 0.3})`;
                ctx.beginPath();
                ctx.arc(0, 6, 3, 0, Math.PI * 2);
                ctx.fill();
                // Firing laser toward outward
                const burstPhase = Math.sin(t / 30 + i * Math.PI / 4);
                if (burstPhase > 0.5) {
                    ctx.strokeStyle = `rgba(0, 255, 136, ${(burstPhase - 0.5) * 1.5})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(0, -8);
                    ctx.lineTo(0, -8 - 25 * burstPhase);
                    ctx.stroke();
                    // Laser tip glow
                    ctx.fillStyle = `rgba(180, 255, 200, ${(burstPhase - 0.5)})`;
                    ctx.beginPath();
                    ctx.arc(0, -8 - 25 * burstPhase, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        }

        // Shadow
        ctx.fillStyle = 'rgba(0, 100, 60, 0.3)';
        ctx.beginPath();
        ctx.ellipse(bx, by + sz * 0.55, sz * 0.85, sz * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // === MECH BODY ===
        // Legs (hydraulic, segmented)
        const legStep = Math.sin(t / 180) * sz * 0.08;
        ctx.fillStyle = flash ? '#fff' : '#1a2a1a';
        // Left leg
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.35, by + sz * 0.45);
        ctx.lineTo(bx - sz * 0.5, by + sz * 0.72 + legStep);
        ctx.lineTo(bx - sz * 0.2, by + sz * 0.72 + legStep);
        ctx.lineTo(bx - sz * 0.15, by + sz * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.5, by + sz * 0.72 + legStep);
        ctx.lineTo(bx - sz * 0.55, by + sz * 1.0 + legStep);
        ctx.lineTo(bx - sz * 0.15, by + sz * 0.95 + legStep);
        ctx.lineTo(bx - sz * 0.2, by + sz * 0.72 + legStep);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(bx - sz * 0.6, by + sz * 0.95 + legStep, sz * 0.5, sz * 0.08);
        // Right leg
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.15, by + sz * 0.45);
        ctx.lineTo(bx + sz * 0.2, by + sz * 0.72 - legStep);
        ctx.lineTo(bx + sz * 0.5, by + sz * 0.72 - legStep);
        ctx.lineTo(bx + sz * 0.35, by + sz * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.2, by + sz * 0.72 - legStep);
        ctx.lineTo(bx + sz * 0.15, by + sz * 0.95 - legStep);
        ctx.lineTo(bx + sz * 0.55, by + sz * 1.0 - legStep);
        ctx.lineTo(bx + sz * 0.5, by + sz * 0.72 - legStep);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(bx + sz * 0.1, by + sz * 0.95 - legStep, sz * 0.5, sz * 0.08);
        // Hydraulic pistons on legs
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.28, by + sz * 0.5);
        ctx.lineTo(bx - sz * 0.42, by + sz * 0.8 + legStep);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.28, by + sz * 0.5);
        ctx.lineTo(bx + sz * 0.42, by + sz * 0.8 - legStep);
        ctx.stroke();
        // Knee joints
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(bx - sz * 0.35, by + sz * 0.72 + legStep, sz * 0.07, 0, Math.PI * 2);
        ctx.arc(bx + sz * 0.35, by + sz * 0.72 - legStep, sz * 0.07, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Torso (armored hull)
        const mGrad = ctx.createRadialGradient(bx, by, 0, bx, by, sz);
        mGrad.addColorStop(0, '#334433');
        mGrad.addColorStop(0.4, '#222a22');
        mGrad.addColorStop(1, '#0a120a');
        ctx.fillStyle = flash ? '#fff' : mGrad;
        const r = sz * 0.12;
        const hs = sz * 0.72;
        ctx.beginPath();
        ctx.moveTo(bx - hs + r, by - hs);
        ctx.lineTo(bx + hs - r, by - hs);
        ctx.quadraticCurveTo(bx + hs, by - hs, bx + hs, by - hs + r);
        ctx.lineTo(bx + hs, by + hs - r);
        ctx.quadraticCurveTo(bx + hs, by + hs, bx + hs - r, by + hs);
        ctx.lineTo(bx - hs + r, by + hs);
        ctx.quadraticCurveTo(bx - hs, by + hs, bx - hs, by + hs - r);
        ctx.lineTo(bx - hs, by - hs + r);
        ctx.quadraticCurveTo(bx - hs, by - hs, bx - hs + r, by - hs);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Panel lines (animated circuit glow)
        ctx.strokeStyle = `rgba(0, 200, 100, ${0.25 + Math.sin(t / 200) * 0.15})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx - hs * 0.8, by - hs * 0.3);
        ctx.lineTo(bx, by - hs * 0.3);
        ctx.lineTo(bx, by + hs * 0.3);
        ctx.lineTo(bx + hs * 0.8, by + hs * 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx - hs * 0.7, by + hs * 0.1);
        ctx.lineTo(bx + hs * 0.7, by + hs * 0.1);
        ctx.stroke();
        // Vent grilles
        ctx.fillStyle = '#0a120a';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(bx - hs * 0.5 + i * hs * 0.45, by + hs * 0.5, hs * 0.25, hs * 0.15);
        }

        // Shoulder pads (angular armor)
        ctx.fillStyle = flash ? '#fff' : '#2a4a2a';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.72, by - sz * 0.72);
        ctx.lineTo(bx - sz * 1.2, by - sz * 0.58);
        ctx.lineTo(bx - sz * 1.15, by - sz * 0.3);
        ctx.lineTo(bx - sz * 0.72, by - sz * 0.48);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#00cc66';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.72, by - sz * 0.72);
        ctx.lineTo(bx + sz * 1.2, by - sz * 0.58);
        ctx.lineTo(bx + sz * 1.15, by - sz * 0.3);
        ctx.lineTo(bx + sz * 0.72, by - sz * 0.48);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Shoulder lights
        ctx.fillStyle = `rgba(0, 255, 136, ${0.5 + Math.sin(t / 100) * 0.3})`;
        ctx.beginPath();
        ctx.arc(bx - sz * 0.96, by - sz * 0.48, sz * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx + sz * 0.96, by - sz * 0.48, sz * 0.06, 0, Math.PI * 2);
        ctx.fill();

        // Arms (mechanical, heavy, with cannon barrels)
        ctx.fillStyle = flash ? '#fff' : '#1a2a1a';
        const armSwing = Math.sin(t / 220) * sz * 0.06;
        // Left arm
        ctx.fillRect(bx - sz * 1.15, by - sz * 0.5, sz * 0.25, sz * 0.55 + armSwing);
        ctx.strokeStyle = '#00aa66';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx - sz * 1.15, by - sz * 0.5, sz * 0.25, sz * 0.55 + armSwing);
        // Left forearm + cannon
        ctx.fillStyle = flash ? '#fff' : '#142014';
        ctx.fillRect(bx - sz * 1.2, by + sz * 0.05 + armSwing, sz * 0.35, sz * 0.4);
        ctx.fillStyle = '#0a1a0a';
        ctx.fillRect(bx - sz * 1.18, by + sz * 0.45 + armSwing, sz * 0.3, sz * 0.14);
        // Cannon bore glow
        ctx.fillStyle = `rgba(0, 255, 136, ${0.4 + Math.sin(t / 60) * 0.3})`;
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(bx - sz * 1.03, by + sz * 0.52 + armSwing, sz * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Right arm
        ctx.fillStyle = flash ? '#fff' : '#1a2a1a';
        ctx.fillRect(bx + sz * 0.9, by - sz * 0.5, sz * 0.25, sz * 0.55 - armSwing);
        ctx.strokeStyle = '#00aa66';
        ctx.strokeRect(bx + sz * 0.9, by - sz * 0.5, sz * 0.25, sz * 0.55 - armSwing);
        ctx.fillStyle = flash ? '#fff' : '#142014';
        ctx.fillRect(bx + sz * 0.85, by + sz * 0.05 - armSwing, sz * 0.35, sz * 0.4);
        ctx.fillStyle = '#0a1a0a';
        ctx.fillRect(bx + sz * 0.88, by + sz * 0.45 - armSwing, sz * 0.3, sz * 0.14);
        ctx.fillStyle = `rgba(0, 255, 136, ${0.4 + Math.sin(t / 60 + 2) * 0.3})`;
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(bx + sz * 1.03, by + sz * 0.52 - armSwing, sz * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Head (angular, with visor)
        ctx.fillStyle = flash ? '#fff' : '#1a2a1a';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.25, by - sz * 0.48);
        ctx.lineTo(bx + sz * 0.25, by - sz * 0.48);
        ctx.lineTo(bx + sz * 0.3, by - sz * 0.78);
        ctx.lineTo(bx, by - sz * 0.9);
        ctx.lineTo(bx - sz * 0.3, by - sz * 0.78);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#00cc66';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Visor (glowing bar)
        ctx.fillStyle = aura;
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 14;
        ctx.fillRect(bx - sz * 0.22, by - sz * 0.72, sz * 0.44, sz * 0.12);
        ctx.shadowBlur = 0;

        // Power core (center chest glow, pulsing)
        const corePulse = 0.5 + Math.sin(t / 80) * 0.3;
        ctx.fillStyle = `rgba(0, 255, 136, ${corePulse})`;
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(bx, by + sz * 0.05, sz * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(bx, by + sz * 0.05, sz * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Antenna
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(bx, by - sz * 0.9);
        ctx.lineTo(bx, by - sz * 1.15);
        ctx.stroke();
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(bx, by - sz * 1.17, sz * 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }


    renderEyeBoss(ctx, t, aura) {
        const sz = this.size;
        const bx = this.x;
        const by = this.y;
        const flash = this.damageFlash > 0;
        // Teleport fade
        if (this.devourerTeleportAlpha < 1) {
            ctx.globalAlpha = this.devourerTeleportAlpha;
        }
        // Void pull visual — black hole with spiral distortion
        if (this.voidPullActive) {
            const pullRadius = 250;
            // Black hole center gradient (dark core)
            const bhGrad = ctx.createRadialGradient(bx, by, 0, bx, by, pullRadius);
            bhGrad.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
            bhGrad.addColorStop(0.15, 'rgba(30, 0, 60, 0.35)');
            bhGrad.addColorStop(0.4, 'rgba(60, 0, 120, 0.15)');
            bhGrad.addColorStop(0.7, 'rgba(80, 0, 160, 0.06)');
            bhGrad.addColorStop(1, 'rgba(60, 0, 100, 0)');
            ctx.fillStyle = bhGrad;
            ctx.beginPath();
            ctx.arc(bx, by, pullRadius, 0, Math.PI * 2);
            ctx.fill();
            // Spiral arms (accretion disc) — 3 rotating arms
            for (let arm = 0; arm < 3; arm++) {
                const armOffset = (arm / 3) * Math.PI * 2;
                ctx.beginPath();
                for (let s = 0; s < 40; s++) {
                    const frac = s / 40;
                    const spiralAngle = armOffset + frac * Math.PI * 3 - t / 300;
                    const spiralDist = pullRadius * (1 - frac * 0.85);
                    const sx = bx + Math.cos(spiralAngle) * spiralDist;
                    const sy = by + Math.sin(spiralAngle) * spiralDist;
                    if (s === 0) ctx.moveTo(sx, sy);
                    else ctx.lineTo(sx, sy);
                }
                ctx.strokeStyle = `rgba(150, 0, 255, ${0.3 + Math.sin(t / 100 + arm) * 0.15})`;
                ctx.lineWidth = 3 - 1.5 * 0; // keep consistent
                ctx.stroke();
            }
            // Particles being sucked inward (16 debris)
            for (let i = 0; i < 16; i++) {
                const seed = i * 97.3;
                const lifePhase = ((t / 5 + seed * 10) % 1500) / 1500; // 0->1 cycle
                const pDist = pullRadius * (1 - lifePhase);
                const pAngle = seed + lifePhase * Math.PI * 2 - t / 400;
                const px = bx + Math.cos(pAngle) * pDist;
                const py = by + Math.sin(pAngle) * pDist;
                const pSize = 2 + (1 - lifePhase) * 4;
                const pAlpha = 0.3 + lifePhase * 0.5;
                ctx.fillStyle = `rgba(${Math.floor(120 + lifePhase * 100)}, 0, ${Math.floor(200 + lifePhase * 55)}, ${pAlpha})`;
                ctx.beginPath();
                ctx.arc(px, py, pSize, 0, Math.PI * 2);
                ctx.fill();
            }
            // Pulsing event horizon ring
            const horizonPulse = 0.5 + Math.sin(t / 80) * 0.3;
            ctx.strokeStyle = `rgba(180, 0, 255, ${horizonPulse})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(bx, by, sz * 1.4, 0, Math.PI * 2);
            ctx.stroke();
            // Inner glow ring
            ctx.strokeStyle = `rgba(255, 100, 255, ${horizonPulse * 0.6})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(bx, by, sz * 0.9, 0, Math.PI * 2);
            ctx.stroke();
            // Energy lightning bolts inward (4 arcs)
            for (let i = 0; i < 4; i++) {
                const la = (t / 150) + (i * Math.PI / 2);
                const lStartD = pullRadius * 0.8;
                const lEndD = sz * 0.5;
                ctx.strokeStyle = `rgba(200, 100, 255, ${0.4 + Math.sin(t / 40 + i) * 0.2})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                let cx2 = bx + Math.cos(la) * lStartD;
                let cy2 = by + Math.sin(la) * lStartD;
                ctx.moveTo(cx2, cy2);
                // Jagged lightning segments
                for (let seg = 0; seg < 5; seg++) {
                    const segFrac = (seg + 1) / 6;
                    const segD = lStartD - (lStartD - lEndD) * segFrac;
                    const jitter = (Math.sin(t / 20 + i * 5 + seg * 7) * 15);
                    cx2 = bx + Math.cos(la + jitter * 0.01) * segD + Math.cos(la + Math.PI / 2) * jitter;
                    cy2 = by + Math.sin(la + jitter * 0.01) * segD + Math.sin(la + Math.PI / 2) * jitter;
                    ctx.lineTo(cx2, cy2);
                }
                ctx.stroke();
            }
        }
        // Dark mist aura
        for (let i = 0; i < 5; i++) {
            const angle = (t / 700) + (i * Math.PI * 2 / 5);
            const dist = sz + 20 + Math.sin(t / 250 + i * 2) * 15;
            const agx = bx + Math.cos(angle) * dist * 0.5;
            const agy = by + Math.sin(angle) * dist * 0.5;
            const dGrad = ctx.createRadialGradient(agx, agy, 0, agx, agy, 30);
            dGrad.addColorStop(0, 'rgba(80, 0, 120, 0.3)');
            dGrad.addColorStop(1, 'rgba(40, 0, 60, 0)');
            ctx.fillStyle = dGrad;
            ctx.beginPath();
            ctx.arc(agx, agy, 30, 0, Math.PI * 2);
            ctx.fill();
        }
        // Shadow
        ctx.fillStyle = 'rgba(30, 0, 50, 0.5)';
        ctx.beginPath();
        ctx.ellipse(bx, by + sz * 0.55, sz * 0.9, sz * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // === ELDRITCH EYE BEAST ===
        // Writhing tentacles (8 around body)
        for (let i = 0; i < 8; i++) {
            const ta = (i / 8) * Math.PI * 2 + Math.sin(t / 400 + i) * 0.2;
            const tlen = sz * 0.8 + Math.sin(t / 200 + i * 1.5) * sz * 0.2;
            ctx.strokeStyle = `rgba(${60 + i * 10}, 0, ${100 + i * 15}, 0.6)`;
            ctx.lineWidth = 4 - i * 0.3;
            const startX = bx + Math.cos(ta) * sz * 0.85;
            const startY = by + Math.sin(ta) * sz * 0.85;
            const ctrlX = bx + Math.cos(ta + Math.sin(t / 150 + i) * 0.3) * (sz + tlen * 0.6);
            const ctrlY = by + Math.sin(ta + Math.sin(t / 150 + i) * 0.3) * (sz + tlen * 0.6);
            const endX = bx + Math.cos(ta + Math.sin(t / 100 + i) * 0.4) * (sz + tlen);
            const endY = by + Math.sin(ta + Math.sin(t / 100 + i) * 0.4) * (sz + tlen);
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
            ctx.stroke();
            // Tentacle tip
            ctx.fillStyle = `rgba(150, 0, 220, 0.4)`;
            ctx.beginPath();
            ctx.arc(endX, endY, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Main eyeball body
        const eGrad = ctx.createRadialGradient(bx, by, 0, bx, by, sz);
        eGrad.addColorStop(0, '#330055');
        eGrad.addColorStop(0.4, '#440077');
        eGrad.addColorStop(0.8, '#220044');
        eGrad.addColorStop(1, '#110022');
        ctx.fillStyle = flash ? '#fff' : eGrad;
        ctx.beginPath();
        ctx.arc(bx, by, sz, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#8800cc';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Eyelid effect (top and bottom)
        ctx.fillStyle = '#1a0033';
        const lidClose = Math.max(0, Math.sin(t / 3000) * 0.15);
        // Top eyelid
        ctx.beginPath();
        ctx.arc(bx, by, sz, Math.PI + 0.3, -0.3);
        ctx.lineTo(bx + sz * Math.cos(-0.3), by + sz * Math.sin(-0.3) + lidClose * sz);
        ctx.quadraticCurveTo(bx, by - sz * 0.6 + lidClose * sz * 2, bx + sz * Math.cos(Math.PI + 0.3), by + sz * Math.sin(Math.PI + 0.3) + lidClose * sz);
        ctx.closePath();
        ctx.fill();
        // Bottom eyelid
        ctx.beginPath();
        ctx.arc(bx, by, sz, 0.3, Math.PI - 0.3);
        ctx.lineTo(bx + sz * Math.cos(Math.PI - 0.3), by + sz * Math.sin(Math.PI - 0.3) - lidClose * sz * 0.5);
        ctx.quadraticCurveTo(bx, by + sz * 0.7 - lidClose * sz, bx + sz * Math.cos(0.3), by + sz * Math.sin(0.3) - lidClose * sz * 0.5);
        ctx.closePath();
        ctx.fill();

        // Veins on the eyeball
        ctx.strokeStyle = 'rgba(150, 0, 200, 0.4)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(bx + Math.cos(a) * sz * 0.5, by + Math.sin(a) * sz * 0.5);
            const midA = a + Math.sin(t / 500 + i) * 0.3;
            ctx.quadraticCurveTo(
                bx + Math.cos(midA) * sz * 0.75, by + Math.sin(midA) * sz * 0.75,
                bx + Math.cos(a) * sz * 0.93, by + Math.sin(a) * sz * 0.93
            );
            ctx.stroke();
        }

        // Iris (tracks player)
        const eyeDir = this.target ? Math.atan2(this.target.y - by, this.target.x - bx) : 0;
        const irisOffset = sz * 0.2;
        const irisX = bx + Math.cos(eyeDir) * irisOffset;
        const irisY = by + Math.sin(eyeDir) * irisOffset;
        // Large iris
        const irisGrad = ctx.createRadialGradient(irisX, irisY, 0, irisX, irisY, sz * 0.55);
        irisGrad.addColorStop(0, '#ff44ff');
        irisGrad.addColorStop(0.3, '#ff00ff');
        irisGrad.addColorStop(0.6, '#9900cc');
        irisGrad.addColorStop(1, '#330044');
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.arc(irisX, irisY, sz * 0.55, 0, Math.PI * 2);
        ctx.fill();
        // Pupil (pulsing)
        const pupilSize = sz * 0.22 + Math.sin(t / 200) * sz * 0.05;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(irisX, irisY, pupilSize, 0, Math.PI * 2);
        ctx.fill();
        // Pupil highlight
        ctx.fillStyle = 'rgba(255, 150, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(irisX - sz * 0.12, irisY - sz * 0.12, sz * 0.08, 0, Math.PI * 2);
        ctx.fill();
        // Second smaller highlight
        ctx.fillStyle = 'rgba(255, 200, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(irisX + sz * 0.06, irisY + sz * 0.08, sz * 0.04, 0, Math.PI * 2);
        ctx.fill();
    }

    // --- COMMON HEALTH BAR ---
    renderBossHealthBar(ctx, aura) {
        const barWidth = 220;
        const barHeight = 14;
        const barY = this.y - this.size - 65;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(this.x - barWidth / 2 - 3, barY - 3, barWidth + 6, barHeight + 6);
        ctx.fillStyle = '#222';
        ctx.fillRect(this.x - barWidth / 2, barY, barWidth, barHeight);

        // Phase segments
        for (let i = 0; i < this.maxPhases - 1; i++) {
            const segX = this.x - barWidth / 2 + barWidth * this.phaseThresholds[i];
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(segX, barY);
            ctx.lineTo(segX, barY + barHeight);
            ctx.stroke();
        }

        // Health fill
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = aura;
        ctx.fillRect(this.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);

        // Health bar border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x - barWidth / 2, barY, barWidth, barHeight);

        // Boss name with icon
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(this.bossName, this.x, barY - 8);
        ctx.fillText(this.bossName, this.x, barY - 8);

        // Phase indicator
        if (this.phase > 1) {
            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold 10px Arial';
            ctx.fillText(`PHASE ${this.phase}`, this.x, barY + barHeight + 14);
        }
    }
}


export { Enemy, MiniBoss, Boss, WorldBoss };