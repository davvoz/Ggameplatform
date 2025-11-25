/**
 * EntityManager - Manages all game entities with unified update and cleanup logic
 * Handles 18+ entity types: platforms, obstacles, collectibles, powerups, hearts, boosts, 
 * magnetBonuses, timeBonuses, shieldBonuses, multiplierBonuses, rainbowBonuses, particles, etc.
 */
export class EntityManager {
    constructor() {
        // Entity arrays
        this.platforms = [];
        this.obstacles = [];
        this.collectibles = [];
        this.powerups = [];
        this.hearts = [];
        this.boosts = [];
        this.magnetBonuses = [];
        this.coinRainBonuses = [];
        this.shieldBonuses = [];
        this.multiplierBonuses = [];
        this.rainbowBonuses = [];
        this.flightBonuses = [];
        this.rechargeBonuses = [];
        this.heartRechargeBonuses = [];
        
        // Level manager reference
        this.levelManager = null;
        this.powerupParticles = [];
        this.boostParticles = [];
        this.floatingTexts = [];
        
        // Performance limits - ULTRA aggressive optimization
        this.MAX_POWERUP_PARTICLES = 30; // Ridotto drasticamente
        this.MAX_BOOST_PARTICLES = 20;   // Ridotto drasticamente
        this.MAX_FLOATING_TEXTS = 3;     // Ridotto drasticamente
        this.MAX_RAINBOW_PARTICLES = 5;  // Ridotto per rainbow trails
        this.MAX_BOOST_TRAIL = 3;        // Ridotto per boost trails
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
        
        // Limit particle count for performance
        if (type === 'powerupParticles' && collection.length >= this.MAX_POWERUP_PARTICLES) {
            collection.shift(); // Remove oldest particle
        } else if (type === 'boostParticles' && collection.length >= this.MAX_BOOST_PARTICLES) {
            collection.shift(); // Remove oldest particle
        } else if (type === 'floatingTexts' && collection.length >= this.MAX_FLOATING_TEXTS) {
            collection.shift(); // Remove oldest text
        }
        
        collection.push(entity);
    }

    /**
     * Set level manager reference
     */
    setLevelManager(levelManager) {
        this.levelManager = levelManager;
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
        this.coinRainBonuses = [];
        this.shieldBonuses = [];
        this.multiplierBonuses = [];
        this.rainbowBonuses = [];
        this.flightBonuses = [];
        this.rechargeBonuses = [];
        this.heartRechargeBonuses = [];
        this.powerupParticles = [];
        this.boostParticles = [];
        this.floatingTexts = [];
    }

    /**
     * Update all entities based on their type
     */
    updateAll(deltaTime, cameraSpeed, player) {
        // ULTRA aggressive particle cleanup - remove particles early
        this.powerupParticles = this.powerupParticles.filter(p => p.life > 0.15);
        this.boostParticles = this.boostParticles.filter(p => p.life > 0.15);
        
        // Hard cap enforcement
        if (this.powerupParticles.length > this.MAX_POWERUP_PARTICLES) {
            this.powerupParticles.splice(0, this.powerupParticles.length - this.MAX_POWERUP_PARTICLES);
        }
        if (this.boostParticles.length > this.MAX_BOOST_PARTICLES) {
            this.boostParticles.splice(0, this.boostParticles.length - this.MAX_BOOST_PARTICLES);
        }
        
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

        this.coinRainBonuses = this.coinRainBonuses.filter(bonus => 
            this.updateCoinRainBonus(bonus, deltaTime, cameraSpeed)
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
        
        this.flightBonuses = this.flightBonuses.filter(bonus => 
            this.updateFlightBonus(bonus, deltaTime, cameraSpeed)
        );
        
        this.rechargeBonuses = this.rechargeBonuses.filter(bonus => 
            this.updateRechargeBonus(bonus, deltaTime, cameraSpeed)
        );
        
        this.heartRechargeBonuses = this.heartRechargeBonuses.filter(bonus => 
            this.updateHeartRechargeBonus(bonus, deltaTime, cameraSpeed)
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
                // Notifica levelManager prima di rimuovere
                if (this.levelManager && platform.index !== undefined && platform.platformType !== 'safety') {
                    this.levelManager.platformExited(platform.index);
                }
                return false; // Remove crumbled platform
            }
        }

        // Handle dissolving platforms
        if (platform.platformType === 'DISSOLVING' || platform.platformType === 'dissolving') {
            if (platform.isDissolving) {
                platform.dissolveTimer = (platform.dissolveTimer || 0) + deltaTime;
                platform.dissolveAlpha = Math.max(0, 1.0 - (platform.dissolveTimer / platform.dissolveDuration));
                
                if (platform.dissolveTimer >= platform.dissolveDuration) {
                    if (this.levelManager && platform.index !== undefined && platform.platformType !== 'safety') {
                        this.levelManager.platformExited(platform.index);
                    }
                    return false; // Remove dissolved platform
                }
            }
        }

        // Handle bouncing platforms
        if (platform.platformType === 'BOUNCING' || platform.platformType === 'bouncing') {
            if (platform.isBouncing) {
                platform.bounceSpeed = (platform.bounceSpeed || 0) + deltaTime * 8;
                platform.bounceOffset = Math.sin(platform.bounceSpeed) * platform.bounceAmplitude;
            } else {
                // Decelera quando il player non è sopra
                if (platform.bounceOffset && Math.abs(platform.bounceOffset) > 0.5) {
                    platform.bounceOffset *= 0.95;
                }
            }
        }

        // Handle rotating platforms
        if (platform.platformType === 'ROTATING' || platform.platformType === 'rotating') {
            if (platform.isRotating) {
                platform.rotationSpeed = (platform.rotationSpeed || 0) + deltaTime * 2;
                platform.rotationAngle = (platform.rotationAngle || 0) + platform.rotationSpeed * deltaTime;
            } else {
                // Decelerate rotation when player not on platform
                if (platform.rotationSpeed && platform.rotationSpeed > 0) {
                    platform.rotationSpeed = Math.max(0, platform.rotationSpeed - deltaTime * 1.5);
                    platform.rotationAngle = (platform.rotationAngle || 0) + platform.rotationSpeed * deltaTime;
                }
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

        // Check if platform exited screen
        const stillVisible = platform.x + platform.width > -100;
        if (!stillVisible && this.levelManager && platform.index !== undefined && platform.platformType !== 'safety') {
            this.levelManager.platformExited(platform.index);
        }
        
        return stillVisible;
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
        // Coin rain collectibles fall down with gravity
        if (collectible.fromCoinRain) {
            // Initialize velocityY if not present
            if (collectible.velocityY === undefined) {
                collectible.velocityY = 200;
            }
            
            // Apply gravity
            collectible.velocityY += 400 * deltaTime; // Gravity acceleration
            collectible.y += collectible.velocityY * deltaTime;
            
            // Slight horizontal drift
            if (collectible.drift === undefined) {
                collectible.drift = (Math.random() - 0.5) * 30;
            }
            collectible.x += collectible.drift * deltaTime;
            collectible.pulsePhase += deltaTime * 2;
        } else {
            // Normal collectibles move with camera
            const totalVelocity = collectible.velocity - cameraSpeed;
            collectible.x += totalVelocity * deltaTime;
        }

        // Magnet effect - attracts toward player (works for both types)
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

        // Remove if off screen (left side or too far down)
        const offScreenLeft = collectible.x + collectible.radius < -50;
        const offScreenBottom = collectible.y > 1200;
        return !offScreenLeft && !offScreenBottom;
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

        // Initialize trail particles if needed
        if (!boost.trailParticles) {
            boost.trailParticles = [];
        }

        // Trail particles for boost - ultra ridotto al 10% con max 6 particelle
        if (Math.random() < 0.1 && boost.trailParticles.length < this.MAX_BOOST_TRAIL) {
            boost.trailParticles.push({
                x: boost.x,
                y: boost.y,
                life: 0.3, // Vita ancora più breve
                maxLife: 0.3,
                size: 3 + Math.random() * 2,
                color: [...boost.color]
            });
        }

        // Update trail particles
        if (boost.trailParticles.length > 0) {
            boost.trailParticles = boost.trailParticles.filter(p => {
                p.life -= deltaTime;
                return p.life > 0;
            });
        }

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
     * Update coin rain bonus
     */
    updateCoinRainBonus(bonus, deltaTime, cameraSpeed) {
        const totalVelocity = bonus.velocity - cameraSpeed;
        bonus.x += totalVelocity * deltaTime;
        bonus.pulsePhase += deltaTime * 5;
        bonus.rotation += deltaTime * 3;
        bonus.sparklePhase += deltaTime * 12; // Brillantini veloci
        bonus.coinOrbitPhase += deltaTime * 6; // Orbita monete
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

        // Initialize particles array if needed
        if (!bonus.particles) {
            bonus.particles = [];
        }

        // Rainbow trail - ultra ridotto al 20% con max 10 particelle
        if (Math.random() < 0.2 && bonus.particles.length < this.MAX_RAINBOW_PARTICLES) {
            const hue = (bonus.rainbowPhase * 100) % 360;
            const rgb = this.hslToRgb(hue / 360, 1.0, 0.5);
            bonus.particles.push({
                x: bonus.x,
                y: bonus.y,
                life: 0.35, // Vita ancora più breve
                size: 5,
                color: [...rgb, 1.0]
            });
        }

        // Update particles - pulisci più aggressivamente
        if (bonus.particles.length > 0) {
            bonus.particles = bonus.particles.filter(p => {
                p.life -= deltaTime;
                return p.life > 0;
            });
        }

        return bonus.x + bonus.radius > -50;
    }
    
    updateFlightBonus(bonus, deltaTime, cameraSpeed) {
        const totalVelocity = bonus.velocity - cameraSpeed;
        bonus.x += totalVelocity * deltaTime;
        bonus.pulsePhase += deltaTime * 4;
        bonus.rotation += deltaTime * 2;
        bonus.wingPhase += deltaTime * 8; // Animazione battito ali
        
        return bonus.x > -100;
    }
    
    updateRechargeBonus(bonus, deltaTime, cameraSpeed) {
        const totalVelocity = bonus.velocity - cameraSpeed;
        bonus.x += totalVelocity * deltaTime;
        bonus.pulsePhase += deltaTime * 6;
        bonus.rotation += deltaTime * 3;
        bonus.energyPhase += deltaTime * 10; // Animazione energia
        bonus.orbitPhase += deltaTime * 4; // Orbita particelle
        
        return bonus.x > -100;
    }
    
    updateHeartRechargeBonus(bonus, deltaTime, cameraSpeed) {
        const totalVelocity = bonus.velocity - cameraSpeed;
        bonus.x += totalVelocity * deltaTime;
        bonus.pulsePhase += deltaTime * 5;
        bonus.rotation += deltaTime * 2.5;
        bonus.heartPhase += deltaTime * 8; // Animazione battito cuore
        bonus.glowPhase += deltaTime * 6; // Pulsazione glow
        
        return bonus.x > -100;
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
            coinRainBonuses: this.coinRainBonuses,
            shieldBonuses: this.shieldBonuses,
            multiplierBonuses: this.multiplierBonuses,
            rainbowBonuses: this.rainbowBonuses,
            flightBonuses: this.flightBonuses,
            rechargeBonuses: this.rechargeBonuses,
            heartRechargeBonuses: this.heartRechargeBonuses,
            powerupParticles: this.powerupParticles,
            boostParticles: this.boostParticles,
            floatingTexts: this.floatingTexts
        };
    }
}
