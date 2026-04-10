/**
 * Entity System
 * Sprite-based entities with object pooling
 */

// ============ CANNON ENTITY ============
import { CONFIG } from './config.js';
import { Utils } from './utils.js';
import { enemyAI } from './enemy-ai.js';
import { Cannon } from './entities/Cannon.js';
import { Zombie } from './entities/Zombie.js';
import { Projectile } from './entities/Projectile.js';
// If MERGE_LEVELS is defined elsewhere, import it here

/**
 * Wave Scaling System
 * Applies exponential scaling to enemy stats based on wave number
 * HP scaling accelerates in later waves to maintain challenge
 */
function applyWaveScaling(baseConfig, waveNumber) {
    // HP scaling: esponenziale ma parte piano
    // Wave 1-3: quasi invariato, poi accelera
    // Wave 1: x1.0, Wave 5: x1.25, Wave 10: x1.85, Wave 20: x5.0, Wave 30: x13.5
    const effectiveWave = Math.max(0, waveNumber - 3); // Scaling parte dalla wave 4
    const hpMultiplier = 1 + effectiveWave * 0.08 + Math.pow(1.10, effectiveWave) - 1;

    // Speed scaling: molto leggero, solo nelle wave avanzate
    // Wave 1-5: x1.0, Wave 10: x1.05, Wave 20: x1.15
    const speedEffectiveWave = Math.max(0, waveNumber - 5);
    const speedMultiplier = Math.min(1.30, 1 + speedEffectiveWave * 0.01);

    // Reward scaling: cresce significativamente per compensare la difficoltà
    // Wave 1: x1.0, Wave 5: x1.48, Wave 10: x2.08, Wave 20: x3.28, Wave 30: x4.48
    const rewardMultiplier = 1 + (waveNumber - 1) * 0.12;

    // Armor scaling: +20% ogni 6 wave per nemici corazzati
    const armorMultiplier = 1 + Math.floor((waveNumber - 1) / 6) * 0.2;

    // Dodge scaling: piccolo aumento per nemici agili, parte dalla wave 5
    const dodgeBonus = Math.min(0.15, Math.max(0, waveNumber - 5) * 0.01);

    // CC Resistance: nemici più resistenti a slow/stun nelle wave avanzate
    const ccResistance = Math.min(0.4, Math.max(0, waveNumber - 8) * 0.02);

    return {
        combat: {
            hp: Math.round(baseConfig.combat.hp * hpMultiplier),
            armor: Math.round(baseConfig.combat.armor * armorMultiplier),
            dodgeChance: Math.min(0.5, baseConfig.combat.dodgeChance + dodgeBonus),
            ccResistance: ccResistance
        },
        movement: {
            speed: baseConfig.movement.speed * speedMultiplier
        },
        reward: Math.round(baseConfig.reward * rewardMultiplier)
    };
}

// ============ ENTITY MANAGER ============
export class EntityManager {
    constructor() {
        this.cannons = [];
        this.zombies = [];

        // Object pooling for projectiles
        this.projectilePool = Utils.createPool(
            () => new Projectile(),
            (p) => p.reset(),
            CONFIG.MAX_PROJECTILES
        );
    }

    // Cannon management
    addCannon(col, row, type) {
        const cannon = new Cannon(col, row, type);
        this.cannons.push(cannon);
        return cannon;
    }

    removeCannon(cannon) {
        const index = this.cannons.indexOf(cannon);
        if (index !== -1) {
            this.cannons.splice(index, 1);
        }
    }

    getCannon(col, row) {
        return this.cannons.find(c => c.col === col && c.row === row);
    }

    // Zombie management
    addZombie(col, type, waveNumber = 1) {
        const zombie = new Zombie(col, type);

        // Applica lo scaling logaritmico completo usando applyWaveScaling
        if (typeof applyWaveScaling === 'function' && waveNumber > 1) {
            const baseConfig = {
                combat: {
                    hp: zombie.maxHp,
                    armor: zombie.armor,
                    dodgeChance: zombie.dodgeChance,
                    ccResistance: 0
                },
                movement: {
                    speed: zombie.speed
                },
                reward: zombie.reward
            };

            const scaled = applyWaveScaling(baseConfig, waveNumber);

            zombie.maxHp = scaled.combat.hp;
            zombie.hp = zombie.maxHp;
            zombie.speed = scaled.movement.speed;
            zombie.reward = scaled.reward;
            zombie.armor = scaled.combat.armor;
            zombie.dodgeChance = scaled.combat.dodgeChance;
            zombie.ccResistance = scaled.combat.ccResistance || 0;
        }

        // Initialize AI for this enemy
        enemyAI.initializeEnemy(zombie);

        this.zombies.push(zombie);
        return zombie;
    }

    removeZombie(zombie) {
        const index = this.zombies.indexOf(zombie);
        if (index !== -1) {
            this.zombies.splice(index, 1);
        }
    }

    // Projectile management
    fireProjectile(cannon, target) {
        const projectile = this.projectilePool.get();
        projectile.init(cannon.col + 0.5, cannon.row + 0.5, target, cannon);
        return projectile;
    }

    // Update all entities
    update(dt, currentTime) {
        // ===== ENEMY AI SYSTEM (OOP-based movement) =====
        // First update abilities for all zombies
        for (const zombie of this.zombies) {
            zombie._allEnemies = this.zombies;
            zombie.update(dt, currentTime);
        }

        // Then update movement via centralized AI system
        // This handles lane switching, avoidance, retreat, etc.
        enemyAI.updateAll(this.zombies, dt, currentTime, this.cannons);

        // Remove dead or off-screen zombies
        for (let i = this.zombies.length - 1; i >= 0; i--) {
            const zombie = this.zombies[i];
            if (zombie.isDead() || zombie.isOffScreen()) {
                this.zombies.splice(i, 1);
            }
        }

        // Update cannons
        for (const cannon of this.cannons) {
            cannon.update(dt);
        }

        // Update projectiles
        const activeProjectiles = this.projectilePool.active;
        for (let i = activeProjectiles.length - 1; i >= 0; i--) {
            const proj = activeProjectiles[i];
            proj.update(dt);

            if (!proj.active) {
                this.projectilePool.release(proj);
            }
        }
    }

    // Render all entities
    render(graphics, currentTime, draggingCannon = null) {
        // Render projectiles (behind zombies)
        this.projectilePool.active.forEach(proj => {
            proj.render(graphics);
        });

        // Render zombies
        this.zombies.forEach(zombie => {
            zombie.render(graphics);
        });

        // Render cannons
        this.cannons.forEach(cannon => {
            const isBeingDragged = draggingCannon && cannon === draggingCannon;
            cannon.render(graphics, currentTime, isBeingDragged);
        });
    }

    // Clear all entities
    clear() {
        this.cannons = [];
        this.zombies = [];
        this.projectilePool.releaseAll();
    }

    // Get counts
    getCounts() {
        return {
            cannons: this.cannons.length,
            zombies: this.zombies.length,
            projectiles: this.projectilePool.active.length
        };
    }
}

// Export

