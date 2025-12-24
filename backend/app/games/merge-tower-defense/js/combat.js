/**
 * Combat System
 * OOP-based combat management with ability handlers
 */

import { CONFIG } from './config.js';
import { Utils } from './utils.js';

// ========== ABILITY HANDLERS ==========

/**
 * Base class for all ability handlers
 */
class AbilityHandler {
    constructor(game) {
        this.game = game;
    }

    get entities() { return this.game.entities; }
    get particles() { return this.game.particles; }
    get audio() { return this.game.audio; }
    get state() { return this.game.state; }

    /**
     * Check if this handler can process the given entity
     * @param {Object} entity - The entity to check
     * @returns {boolean}
     */
    canHandle(entity) {
        return false;
    }

    /**
     * Process the ability for the entity
     * @param {Object} entity - The entity using the ability
     * @param {number} currentTime - Current timestamp
     */
    execute(entity, currentTime) {
        // Override in subclasses
    }
}

/**
 * Golem Stomp Ability - Stuns nearby towers
 */
class GolemStompHandler extends AbilityHandler {
    canHandle(entity) {
        return entity.needsStomp === true;
    }

    execute(golem, currentTime) {
        golem.needsStomp = false;

        let towersStunned = 0;
        this.entities.cannons.forEach(cannon => {
            const dist = Utils.distance(golem.col, golem.row, cannon.col, cannon.row);
            if (dist <= golem.stompRange) {
                cannon.stunnedUntil = currentTime + golem.stompStunDuration;
                towersStunned++;

                this.particles.emit(cannon.col, cannon.row, {
                    text: '💫 STUNNED!',
                    color: '#8B4513',
                    vy: -1,
                    life: 0.8,
                    scale: 1.0
                });
            }
        });

        this.particles.emit(golem.col, golem.row, {
            text: '🗿 STOMP!',
            color: '#8B4513',
            vy: -1.5,
            life: 1.0,
            scale: 1.3,
            glow: true
        });
    }
}

/**
 * Siren Scream Ability - Disables nearby towers
 */
class SirenScreamHandler extends AbilityHandler {
    canHandle(entity) {
        return entity.needsScream === true;
    }

    execute(siren, currentTime) {
        siren.needsScream = false;

        this.entities.cannons.forEach(cannon => {
            const dist = Utils.distance(siren.col, siren.row, cannon.col, cannon.row);
            if (dist <= siren.disableRange) {
                cannon.disabledUntil = currentTime + siren.disableDuration;

                this.particles.emit(cannon.col, cannon.row, {
                    text: '🔇 DISABLED!',
                    color: '#E0B0FF',
                    vy: -1,
                    life: 1.2,
                    scale: 1.0
                });
            }
        });

        this.particles.emit(siren.col, siren.row, {
            text: '👻 SCREAM!',
            color: '#E0B0FF',
            vy: -1.5,
            life: 1.2,
            scale: 1.4,
            glow: true
        });
    }
}

/**
 * Vampire Drain Ability - Drains energy and heals self
 */
class VampireDrainHandler extends AbilityHandler {
    canHandle(entity) {
        return entity.needsDrain === true && entity.isVampire === true;
    }

    execute(vampire, currentTime) {
        vampire.needsDrain = false;

        const drainAmount = Math.floor(5 * vampire.lifesteal);
        const healAmount = Math.floor(drainAmount * 2);

        this.state.energy = Math.max(0, this.state.energy - drainAmount);
        vampire.hp = Math.min(vampire.maxHp, vampire.hp + healAmount);

        this.particles.emit(vampire.col, vampire.row, {
            text: `🩸+${healAmount}`,
            color: '#8B0000',
            vy: -1,
            life: 0.8,
            scale: 1.0
        });

        this.particles.emit(CONFIG.COLS / 2, CONFIG.ROWS - CONFIG.DEFENSE_ZONE_ROWS, {
            text: `-${drainAmount}⚡`,
            color: '#ff0000',
            vy: -0.5,
            life: 0.6,
            scale: 0.9
        });
    }
}

/**
 * Healer Ability - Heals nearby zombies
 */
class HealerAbilityHandler extends AbilityHandler {
    canHandle(entity) {
        return entity.isHealer === true;
    }

    shouldExecute(healer, currentTime) {
        return currentTime - healer.lastHealTime >= healer.healInterval;
    }

    execute(healer, currentTime) {
        if (!this.shouldExecute(healer, currentTime)) return;

        healer.lastHealTime = currentTime;
        let healedCount = 0;

        this.entities.zombies.forEach(target => {
            if (target === healer || target.hp >= target.maxHp) return;

            const dist = Utils.distance(healer.col, healer.row, target.col, target.row);
            if (dist <= healer.healRange) {
                target.hp = Math.min(target.maxHp, target.hp + healer.healAmount);
                healedCount++;

                this.particles.emit(target.col, target.row, {
                    text: `+${healer.healAmount}💚`,
                    color: '#00ff88',
                    vy: -0.8,
                    life: 0.8,
                    scale: 0.9
                });
            }
        });

        if (healedCount > 0) {
            if (healer.multiSprite?.animations?.has('heal')) {
                healer.multiSprite.play('heal', true);
            }

            this.particles.emit(healer.col, healer.row, {
                text: '✨',
                color: '#00ffaa',
                vy: -0.5,
                life: 0.5,
                scale: 1.2
            });
        }
    }
}

// ========== TOWER STATUS PROCESSOR ==========

/**
 * Manages tower status effects (stun, disable)
 */
class TowerStatusProcessor {
    constructor(game) {
        this.game = game;
    }

    /**
     * Check if tower can fire (not stunned or disabled)
     * @param {Object} cannon - The tower to check
     * @param {number} currentTime - Current timestamp
     * @returns {boolean}
     */
    canTowerAct(cannon, currentTime) {
        // Check stun
        if (cannon.stunnedUntil && currentTime < cannon.stunnedUntil) {
            cannon.showingStunEffect = true;
            return false;
        }
        cannon.showingStunEffect = false;

        // Check disable
        if (cannon.disabledUntil && currentTime < cannon.disabledUntil) {
            cannon.showingDisableEffect = true;
            return false;
        }
        cannon.showingDisableEffect = false;

        return true;
    }
}

// ========== TARGETING SYSTEM ==========

/**
 * Handles target selection for towers
 */
class TargetingSystem {
    constructor(entities) {
        this.entities = entities;
    }

    /**
     * Find best target for a cannon
     * @param {Object} cannon - The firing tower
     * @returns {Object|null} - Best target or null
     */
    findTarget(cannon) {
        let bestTarget = null;
        let bestScore = -Infinity;

        for (const zombie of this.entities.zombies) {
            if (zombie.isInvisible) continue;

            const dist = Utils.distance(cannon.col, cannon.row, zombie.col, zombie.row);
            if (dist > cannon.range) continue;

            const score = this.calculateTargetScore(zombie);
            if (score > bestScore) {
                bestScore = score;
                bestTarget = zombie;
            }
        }

        return bestTarget;
    }

    /**
     * Calculate priority score for a target
     * @param {Object} zombie - Target zombie
     * @returns {number} - Priority score
     */
    calculateTargetScore(zombie) {
        let score = 0;

        // Prioritize zombies further along (closer to wall)
        score += zombie.row * 10;

        // Prefer low health targets
        score -= zombie.hp;

        // Bonus for zombies at wall
        if (zombie.atWall) score += 50;

        // Bonus for corner zombies (less coverage)
        if (zombie.col < 1.5 || zombie.col > CONFIG.COLS - 1.5) {
            score += 30;
        }

        return score;
    }
}

// ========== PROJECTILE COLLISION SYSTEM ==========

/**
 * Handles projectile collision detection and effects
 */
class ProjectileCollisionSystem {
    constructor(game) {
        this.game = game;
    }

    get entities() { return this.game.entities; }
    get particles() { return this.game.particles; }
    get audio() { return this.game.audio; }

    /**
     * Process all projectile collisions
     * @param {number} currentTime - Current timestamp
     */
    processCollisions(currentTime) {
        const projectiles = this.entities.projectilePool.active;

        for (let i = projectiles.length - 1; i >= 0; i--) {
            const proj = projectiles[i];
            if (!proj.active) continue;

            this.checkProjectileHits(proj, currentTime);
        }
    }

    /**
     * Check if projectile hits any zombie
     * @param {Object} proj - The projectile
     * @param {number} currentTime - Current timestamp
     */
    checkProjectileHits(proj, currentTime) {
        for (const zombie of this.entities.zombies) {
            if (proj.hasHitTarget(zombie)) continue;
            if (zombie.isInvisible) continue;

            const dist = Utils.distance(proj.x, proj.y, zombie.col, zombie.row);
            if (dist >= 0.6) continue;

            // Check dodge
            if (this.handleDodge(zombie, proj)) continue;

            // Process hit
            this.processHit(zombie, proj, currentTime);
            break;
        }
    }

    /**
     * Handle dodge attempt
     * @returns {boolean} - True if dodged
     */
    handleDodge(zombie, proj) {
        if (!zombie.dodgeChance || Math.random() >= zombie.dodgeChance) {
            return false;
        }

        this.particles.emit(zombie.col, zombie.row, {
            text: 'DODGE!',
            color: CONFIG.COLORS.TEXT_WARNING,
            vy: -1,
            life: 0.5,
            scale: 0.8
        });
        proj.addPiercedTarget(zombie);
        return true;
    }

    /**
     * Process a successful hit
     */
    processHit(zombie, proj, currentTime) {
        // Delegate damage to game
        this.game.damageZombie(zombie, proj, currentTime);

        // Handle special effects
        if (proj.splashRadius > 0) {
            this.game.applySplashDamage(zombie, proj, currentTime);
        }

        if (proj.chainTargets > 0) {
            this.game.applyChainDamage(zombie, proj, currentTime);
        }

        // Handle piercing or deactivate
        if (proj.piercing > 0) {
            proj.addPiercedTarget(zombie);
        } else {
            proj.active = false;
        }
    }
}

// ========== MAIN COMBAT SYSTEM ==========

/**
 * Main combat system orchestrator
 */
export class CombatSystem {
    constructor(game) {
        this.game = game;

        // Initialize subsystems
        this.towerStatus = new TowerStatusProcessor(game);
        this.targeting = new TargetingSystem(game.entities);
        this.projectileCollision = new ProjectileCollisionSystem(game);

        // Initialize ability handlers
        this.abilityHandlers = [
            new GolemStompHandler(game),
            new SirenScreamHandler(game),
            new VampireDrainHandler(game),
            new HealerAbilityHandler(game)
        ];
    }

    get entities() { return this.game.entities; }
    get audio() { return this.game.audio; }

    /**
     * Main combat update loop
     * @param {number} dt - Delta time
     * @param {number} currentTime - Current timestamp
     */
    update(dt, currentTime) {
        this.processZombieAbilities(currentTime);
        this.processTowerFiring(currentTime);
        this.projectileCollision.processCollisions(currentTime);
    }

    /**
     * Process all zombie abilities
     * @param {number} currentTime - Current timestamp
     */
    processZombieAbilities(currentTime) {
        for (const zombie of this.entities.zombies) {
            for (const handler of this.abilityHandlers) {
                if (handler.canHandle(zombie)) {
                    handler.execute(zombie, currentTime);
                }
            }
        }
    }

    /**
     * Process tower firing
     * @param {number} currentTime - Current timestamp
     */
    processTowerFiring(currentTime) {
        for (const cannon of this.entities.cannons) {
            if (!this.towerStatus.canTowerAct(cannon, currentTime)) continue;
            if (!cannon.canFire(currentTime)) continue;

            const target = this.targeting.findTarget(cannon);
            if (!target) continue;

            cannon.fire(currentTime, target);
            this.entities.fireProjectile(cannon, target);
            this.audio.towerShoot(cannon.type);
        }
    }

    /**
     * Register a custom ability handler
     * @param {AbilityHandler} handler - The handler to register
     */
    registerAbilityHandler(handler) {
        this.abilityHandlers.push(handler);
    }

    /**
     * Remove an ability handler by type
     * @param {Function} handlerClass - The handler class to remove
     */
    unregisterAbilityHandler(handlerClass) {
        this.abilityHandlers = this.abilityHandlers.filter(
            h => !(h instanceof handlerClass)
        );
    }
}

// Export classes for extension
export {
    AbilityHandler,
    GolemStompHandler,
    SirenScreamHandler,
    VampireDrainHandler,
    HealerAbilityHandler,
    TowerStatusProcessor,
    TargetingSystem,
    ProjectileCollisionSystem
};
