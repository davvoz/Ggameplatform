/**
 * EntityManager - Manages all game entities with unified update and cleanup logic
 * Handles 18+ entity types: platforms, obstacles, collectibles, powerups, hearts, boosts, 
 * magnetBonuses, timeBonuses, shieldBonuses, multiplierBonuses, rainbowBonuses, particles, etc.
 */
export class EntityManager {
    constructor() {
        // Entity collections organized by type
        this.platforms = [];
        this.obstacles = [];
        this.collectibles = [];
        this.powerups = [];
        this.hearts = [];
        this.boosts = [];
        this.magnetBonuses = [];
        this.timeBonuses = [];
        this.shieldBonuses = [];
        this.multiplierBonuses = [];
        this.rainbowBonuses = [];
        this.powerupParticles = [];
        this.boostParticles = [];
        this.floatingTexts = [];
    }

    /**
     * Add an entity to its appropriate collection
     */
    addEntity(type, entity) {
        const collection = this[type];
        if (!collection) {
            console.warn(`Unknown entity type: ${type}`);
            return;
        }
        collection.push(entity);
    }

    /**
     * Get all entities of a specific type
     */
    getEntities(type) {
        return this[type] || [];
    }

    /**
     * Clear all entities of a specific type
     */
    clearEntities(type) {
        if (this[type]) {
            this[type] = [];
        }
    }

    /**
     * Clear all entities
     */
    clearAll() {
        this.platforms = [];
        this.obstacles = [];
        this.collectibles = [];
        this.powerups = [];
        this.hearts = [];
        this.boosts = [];
        this.magnetBonuses = [];
        this.timeBonuses = [];
        this.shieldBonuses = [];
        this.multiplierBonuses = [];
        this.rainbowBonuses = [];
        this.powerupParticles = [];
        this.boostParticles = [];
        this.floatingTexts = [];
    }

    /**
     * Update all entities based on their type
     */
    updateAll(deltaTime, cameraSpeed, player) {
        // Update platforms with special logic for crumbling, spring, icy types
        this.platforms = this.platforms.filter(platform => 
            this.updatePlatform(platform, deltaTime, cameraSpeed)
        );

        // Update obstacles
        this.obstacles = this.obstacles.filter(obstacle => 
            this.updateObstacle(obstacle, deltaTime, cameraSpeed)
        );

        // Update collectibles with magnet effect
        this.collectibles = this.collectibles.filter(collectible => 
            this.updateCollectible(collectible, deltaTime, cameraSpeed, player)
        );

        // Update powerups
        this.powerups = this.powerups.filter(powerup => 
            this.updatePowerup(powerup, deltaTime, cameraSpeed)
        );

        // Update hearts
        this.hearts = this.hearts.filter(heart => 
            this.updateHeart(heart, deltaTime, cameraSpeed)
        );

        // Update boosts
        this.boosts = this.boosts.filter(boost => 
            this.updateBoost(boost, deltaTime, cameraSpeed)
        );

        // Update bonus types
        this.magnetBonuses = this.magnetBonuses.filter(bonus => 
            this.updateMagnetBonus(bonus, deltaTime, cameraSpeed)
        );

        this.timeBonuses = this.timeBonuses.filter(bonus => 
            this.updateTimeBonus(bonus, deltaTime, cameraSpeed)
        );

        this.shieldBonuses = this.shieldBonuses.filter(bonus => 
            this.updateShieldBonus(bonus, deltaTime, cameraSpeed)
        );

        this.multiplierBonuses = this.multiplierBonuses.filter(bonus => 
            this.updateMultiplierBonus(bonus, deltaTime, cameraSpeed)
        );

        this.rainbowBonuses = this.rainbowBonuses.filter(bonus => 
            this.updateRainbowBonus(bonus, deltaTime, cameraSpeed)
        );

        // Update particles
        this.boostParticles = this.boostParticles.filter(particle => 
            this.updateBoostParticle(particle, deltaTime)
        );

        this.powerupParticles = this.powerupParticles.filter(particle => 
            this.updatePowerupParticle(particle, deltaTime)
        );

        // Update floating texts
        this.floatingTexts = this.floatingTexts.filter(text => 
            this.updateFloatingText(text, deltaTime)
        );
    }

    /**
     * Update platform entity
     */
    updatePlatform(platform, deltaTime, cameraSpeed) {
        const totalVelocity = platform.velocity - cameraSpeed;
        platform.x += totalVelocity * deltaTime;

        // Handle crumbling platforms
        if (platform.isCrumbling) {
            platform.crumbleTimer += deltaTime;
            if (platform.crumbleTimer >= platform.crumbleDuration) {
                return false; // Remove crumbled platform
            }
        }

        // Handle spring animation
        if (platform.platformType === 'SPRING') {
            platform.springAnimationTime += deltaTime;
            
            // Decay compression over time
            if (platform.springCompression > 0) {
                platform.springCompression = Math.max(0, platform.springCompression - deltaTime * 3);
            }
        }

        // Handle icy platform shimmer effect
        if (platform.platformType === 'ICY') {
            platform.icyShimmer += deltaTime * 5;
        }

        return platform.x + platform.width > -100;
    }

    /**
     * Update obstacle entity
     */
    updateObstacle(obstacle, deltaTime, cameraSpeed) {
        const totalVelocity = obstacle.velocity - cameraSpeed;
        obstacle.x += totalVelocity * deltaTime;
        return obstacle.x + obstacle.width > -50;
    }

    /**
     * Update collectible with magnet effect
     */
    updateCollectible(collectible, deltaTime, cameraSpeed, player) {
        const totalVelocity = collectible.velocity - cameraSpeed;
        collectible.x += totalVelocity * deltaTime;

        // Magnet effect - attracts toward player
        if (collectible.magnetized) {
            collectible.magnetDuration -= deltaTime;
            if (collectible.magnetDuration <= 0) {
                collectible.magnetized = false;
            } else {
                const dx = player.x - collectible.x;
                const dy = (player.y + player.height / 2) - collectible.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 5) {
                    // Faster magnet during turbo to compensate for increased speed
                    const magnetSpeed = player.isTurboActive ? 1200 : 400;
                    collectible.x += (dx / dist) * magnetSpeed * deltaTime;
                    collectible.y += (dy / dist) * magnetSpeed * deltaTime;
                }
            }
        }

        return collectible.x + collectible.radius > -50;
    }

    /**
     * Update powerup entity
     */
    updatePowerup(powerup, deltaTime, cameraSpeed) {
        // Update powerup properties directly (no class method)
        powerup.x += powerup.velocity * deltaTime;
        powerup.x += -cameraSpeed * deltaTime;
        powerup.particleTimer = (powerup.particleTimer || 0) + deltaTime;
        powerup.rotationAngle = (powerup.rotationAngle || 0) + deltaTime * 2;
        return powerup.x + (powerup.radius || powerup.width / 2) > -50 && !powerup.collected;
    }

    /**
     * Update heart entity
     */
    updateHeart(heart, deltaTime, cameraSpeed) {
        const totalVelocity = heart.velocity - cameraSpeed;
        heart.x += totalVelocity * deltaTime;
        heart.pulsePhase += deltaTime * 3;
        return heart.x + heart.radius > -50;
    }

    /**
     * Update boost entity with trail particles
     */
    updateBoost(boost, deltaTime, cameraSpeed) {
        const totalVelocity = boost.velocity - cameraSpeed;
        boost.x += totalVelocity * deltaTime;
        boost.pulsePhase += deltaTime * 4;
        boost.rotationAngle += deltaTime * 3;

        // Trail particles for boost
        if (Math.random() < 0.3) {
            boost.trailParticles.push({
                x: boost.x,
                y: boost.y,
                life: 0.5,
                maxLife: 0.5,
                size: 4 + Math.random() * 3,
                color: [...boost.color]
            });
        }

        // Update trail particles
        boost.trailParticles = boost.trailParticles.filter(p => {
            p.life -= deltaTime;
            return p.life > 0;
        });

        return boost.x + boost.radius > -50;
    }

    /**
     * Update magnet bonus
     */
    updateMagnetBonus(bonus, deltaTime, cameraSpeed) {
        const totalVelocity = bonus.velocity - cameraSpeed;
        bonus.x += totalVelocity * deltaTime;
        bonus.pulsePhase += deltaTime * 5;
        bonus.rotation += deltaTime * 2;
        return bonus.x + bonus.radius > -50;
    }

    /**
     * Update time slow bonus
     */
    updateTimeBonus(bonus, deltaTime, cameraSpeed) {
        const totalVelocity = bonus.velocity - cameraSpeed;
        bonus.x += totalVelocity * deltaTime;
        bonus.pulsePhase += deltaTime * 4;
        bonus.rotation += deltaTime * 3;
        return bonus.x + bonus.radius > -50;
    }

    /**
     * Update shield bonus
     */
    updateShieldBonus(bonus, deltaTime, cameraSpeed) {
        const totalVelocity = bonus.velocity - cameraSpeed;
        bonus.x += totalVelocity * deltaTime;
        bonus.pulsePhase += deltaTime * 6;
        bonus.rotation += deltaTime * 2.5;
        return bonus.x + bonus.radius > -50;
    }

    /**
     * Update multiplier bonus
     */
    updateMultiplierBonus(bonus, deltaTime, cameraSpeed) {
        const totalVelocity = bonus.velocity - cameraSpeed;
        bonus.x += totalVelocity * deltaTime;
        bonus.pulsePhase += deltaTime * 7;
        bonus.rotation += deltaTime * 4;
        return bonus.x + bonus.radius > -50;
    }

    /**
     * Update rainbow bonus with trail
     */
    updateRainbowBonus(bonus, deltaTime, cameraSpeed) {
        const totalVelocity = bonus.velocity - cameraSpeed;
        bonus.x += totalVelocity * deltaTime;
        bonus.rainbowPhase += deltaTime * 10;
        bonus.pulsePhase += deltaTime * 5;
        bonus.rotation += deltaTime * 3;

        // Rainbow trail
        if (Math.random() < 0.5) {
            const hue = (bonus.rainbowPhase * 100) % 360;
            const rgb = this.hslToRgb(hue / 360, 1.0, 0.5);
            bonus.particles.push({
                x: bonus.x,
                y: bonus.y,
                life: 0.8,
                size: 6,
                color: [...rgb, 1.0]
            });
        }

        // Update particles
        bonus.particles = bonus.particles.filter(p => {
            p.life -= deltaTime;
            return p.life > 0;
        });

        return bonus.x + bonus.radius > -50;
    }

    /**
     * Update boost particle
     */
    updateBoostParticle(particle, deltaTime) {
        particle.x += particle.vx * deltaTime;
        particle.y += particle.vy * deltaTime;
        particle.life -= deltaTime;
        particle.size *= 0.98; // Shrink
        return particle.life > 0;
    }

    /**
     * Update powerup particle
     */
    updatePowerupParticle(particle, deltaTime) {
        particle.x += particle.vx * deltaTime;
        particle.y += particle.vy * deltaTime;
        particle.vy += particle.gravity * deltaTime; // Gravity
        particle.life -= deltaTime;
        particle.rotation += particle.rotationSpeed * deltaTime;
        return particle.life > 0;
    }

    /**
     * Update floating text
     */
    updateFloatingText(text, deltaTime) {
        text.life -= deltaTime;
        text.y -= deltaTime * 50; // Float upward
        text.alpha = text.life / text.maxLife;
        return text.life > 0;
    }

    /**
     * HSL to RGB color conversion
     */
    hslToRgb(h, s, l) {
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return [r, g, b];
    }

    /**
     * Get count of visible platforms within viewport
     */
    getVisiblePlatformCount(viewportWidth) {
        return this.platforms.filter(p => 
            p.x + p.width > 0 && p.x < viewportWidth
        ).length;
    }

    /**
     * Get all entities for rendering
     */
    getAllForRendering() {
        return {
            platforms: this.platforms,
            obstacles: this.obstacles,
            collectibles: this.collectibles,
            powerups: this.powerups,
            hearts: this.hearts,
            boosts: this.boosts,
            magnetBonuses: this.magnetBonuses,
            timeBonuses: this.timeBonuses,
            shieldBonuses: this.shieldBonuses,
            multiplierBonuses: this.multiplierBonuses,
            rainbowBonuses: this.rainbowBonuses,
            powerupParticles: this.powerupParticles,
            boostParticles: this.boostParticles,
            floatingTexts: this.floatingTexts
        };
    }
}
