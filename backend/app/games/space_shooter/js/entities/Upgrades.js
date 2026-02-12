/**
 * Upgrades - Sistema di upgrade per Space Shooter
 * Include: Barrier, SmartMissile, e ProtectorDrone
 */

/**
 * UpgradeManager - Gestisce tutti gli upgrade del giocatore
 */
class UpgradeManager {
    constructor(game) {
        this.game = game;
        
        // Upgrade levels (0 = not acquired)
        this.barrierLevel = 0;
        this.missileLevel = 0;
        this.droneLevel = 0;
        
        // Active entities
        this.barrier = null;
        this.missiles = [];
        this.drones = [];
        
        // Constants
        this.maxLevel = Infinity; // No cap on upgrades
    }
    
    /**
     * Get available upgrade options for selection
     * @returns {Array} Array of upgrade options
     */
    getUpgradeOptions() {
        const options = [];
        
        // Barrier option
        if (this.barrierLevel < this.maxLevel) {
            const isNew = this.barrierLevel === 0;
            options.push({
                type: 'barrier',
                icon: '🛡️',
                name: isNew ? 'Energy Barrier' : `Barrier Lv.${this.barrierLevel + 1}`,
                description: isNew 
                    ? 'Protective shield that absorbs damage and regenerates slowly'
                    : `+${10 + this.barrierLevel * 5} shield capacity, +${5}% regen speed`,
                level: this.barrierLevel + 1,
                rarity: this.getRarity(this.barrierLevel)
            });
        }
        
        // Missiles option
        if (this.missileLevel < this.maxLevel) {
            const isNew = this.missileLevel === 0;
            const missilesCount = 1 + this.missileLevel;
            options.push({
                type: 'missile',
                icon: '🚀',
                name: isNew ? 'Smart Missiles' : `Missiles Lv.${this.missileLevel + 1}`,
                description: isNew 
                    ? 'Homing missile that seeks and destroys enemies (1 missile)'
                    : `${missilesCount + 1} missiles per wave, +${15}% damage`,
                level: this.missileLevel + 1,
                rarity: this.getRarity(this.missileLevel)
            });
        }
        
        // Drones option
        if (this.droneLevel < this.maxLevel) {
            const isNew = this.droneLevel === 0;
            options.push({
                type: 'drone',
                icon: '🤖',
                name: isNew ? 'Protector Drones' : `Drones Lv.${this.droneLevel + 1}`,
                description: isNew 
                    ? '2 intelligent drones that orbit and shoot enemies'
                    : `+${20}% fire rate, +${15}% damage`,
                level: this.droneLevel + 1,
                rarity: this.getRarity(this.droneLevel)
            });
        }
        
        return options;
    }
    
    /**
     * Get rarity based on level
     */
    getRarity(level) {
        if (level >= 6) return 'legendary';
        if (level >= 3) return 'rare';
        return 'common';
    }
    
    /**
     * Apply selected upgrade
     * @param {Object} upgrade - Selected upgrade option
     */
    applyUpgrade(upgrade) {
        switch (upgrade.type) {
            case 'barrier':
                this.upgradeBarrier();
                break;
            case 'missile':
                this.upgradeMissiles();
                break;
            case 'drone':
                this.upgradeDrones();
                break;
        }
    }
    
    /**
     * Upgrade barrier
     */
    upgradeBarrier() {
        this.barrierLevel++;
        
        if (!this.barrier) {
            // Create new barrier
            this.barrier = new EnergyBarrier(this.game.player, this);
        } else {
            // Upgrade existing
            this.barrier.upgrade();
        }
    }
    
    /**
     * Upgrade missiles
     */
    upgradeMissiles() {
        this.missileLevel++;
        
        // Missiles are spawned on demand, so just track the level
        // More missiles will be available in the next wave
    }
    
    /**
     * Upgrade drones
     */
    upgradeDrones() {
        this.droneLevel++;
        
        if (this.drones.length === 0) {
            // Create initial 2 drones
            this.drones.push(new ProtectorDrone(this.game.player, 0, this));
            this.drones.push(new ProtectorDrone(this.game.player, 1, this));
        } else {
            // Upgrade existing drones
            this.drones.forEach(drone => drone.upgrade());
        }
    }
    
    /**
     * Fire missiles at enemies
     */
    fireMissiles() {
        if (this.missileLevel === 0) return;
        
        const missileCount = this.missileLevel;
        const player = this.game.player;
        
        if (!player || !player.active) return;
        
        const enemies = this.game.enemies.filter(e => e.active);
        
        // Fire missiles even without targets - they'll seek in flight
        for (let i = 0; i < missileCount; i++) {
            // Pick a target if available, otherwise null (missile will find one)
            const target = enemies.length > 0 
                ? enemies[i % enemies.length] 
                : null;
            
            const offsetAngle = (i / missileCount) * Math.PI * 2;
            const spawnX = player.position.x + player.width / 2 + Math.cos(offsetAngle) * 25;
            const spawnY = player.position.y + Math.sin(offsetAngle) * 15;
            
            const missile = new SmartMissile(
                spawnX,
                spawnY,
                target,
                this
            );
            
            this.missiles.push(missile);
        }
        
        // Play missile sound
        this.game.sound.playShoot();
    }
    
    /**
     * Update all upgrades
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        // Update barrier
        if (this.barrier) {
            this.barrier.update(deltaTime);
        }
        
        // Update missiles
        for (let i = this.missiles.length - 1; i >= 0; i--) {
            const missile = this.missiles[i];
            missile.update(deltaTime, this.game);
            
            if (!missile.active) {
                this.missiles.splice(i, 1);
            }
        }
        
        // Update drones
        this.drones.forEach(drone => {
            drone.update(deltaTime, this.game);
        });
    }
    
    /**
     * Render all upgrades
     * @param {CanvasRenderingContext2D} ctx 
     */
    render(ctx) {
        // Render barrier
        if (this.barrier) {
            this.barrier.render(ctx);
        }
        
        // Render missiles
        this.missiles.forEach(missile => {
            if (missile.active) {
                missile.render(ctx);
            }
        });
        
        // Render drones
        this.drones.forEach(drone => {
            drone.render(ctx);
        });
    }
    
    /**
     * Check if barrier should block damage
     * @param {number} damage 
     * @returns {boolean} true if damage was fully blocked
     */
    tryBlockDamage(damage) {
        if (this.barrier && this.barrier.currentShield > 0) {
            const result = this.barrier.absorbDamage(damage);
            return result.blocked;
        }
        return false;
    }
    
    /**
     * Reset all upgrades (new game)
     */
    reset() {
        this.barrierLevel = 0;
        this.missileLevel = 0;
        this.droneLevel = 0;
        
        this.barrier = null;
        this.missiles = [];
        this.drones = [];
    }

    /**
     * Get current upgrade levels
     * @returns {Object} {barrier, missile, drone}
     */
    getUpgradeLevels() {
        return {
            barrier: this.barrierLevel,
            missile: this.missileLevel,
            drone: this.droneLevel
        };
    }
}


/**
 * EnergyBarrier - Protective shield around the player
 */
class EnergyBarrier {
    constructor(player, manager) {
        this.player = player;
        this.manager = manager;
        
        // Shield stats (level 1) - ultra nerfed
        this.maxShield = 3;
        this.currentShield = this.maxShield;
        this.regenRate = 0.5; // Per second
        this.regenDelay = 5; // Seconds before regen starts
        this.regenTimer = 0;
        
        // Visual
        this.radius = 35;
        this.pulseTime = 0;
        this.hitFlashTime = 0;
        this.breakParticles = [];
    }
    
    /**
     * Upgrade the barrier
     */
    upgrade() {
        const level = this.manager.barrierLevel;
        const shieldBase = 1;
        
        const regenBase = 0.3;
        // Increase stats - ultra nerfed
        this.maxShield = shieldBase + level * 2;
        this.regenRate = regenBase + level * 0.2;
        this.regenDelay = Math.max(3.5, 5 - level * 0.15);
        
        // Increase radius slightly
        this.radius = 35 + level * 2;
        
        // Restore some shield on upgrade
        this.currentShield = Math.min(this.currentShield + this.maxShield * 0.3, this.maxShield);
    }
    
    /**
     * Try to absorb incoming damage
     * @param {number} damage 
     * @returns {Object}
     */
    absorbDamage(damage) {
        if (this.currentShield <= 0) {
            return { blocked: false, remainingDamage: damage };
        }
        
        const absorbed = Math.min(this.currentShield, damage);
        this.currentShield -= absorbed;
        const remaining = damage - absorbed;
        
        // Reset regen timer
        this.regenTimer = 0;
        
        // Hit flash effect
        this.hitFlashTime = 0.3;
        
        // Create break particles if shield broke
        if (this.currentShield <= 0) {
            this.createBreakEffect();
        }
        
        return {
            blocked: remaining === 0,
            remainingDamage: remaining
        };
    }
    
    /**
     * Create shield break effect
     */
    createBreakEffect() {
        const centerX = this.player.position.x + this.player.width / 2;
        const centerY = this.player.position.y + this.player.height / 2;
        
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 / 20) * i;
            this.breakParticles.push({
                x: centerX + Math.cos(angle) * this.radius,
                y: centerY + Math.sin(angle) * this.radius,
                vx: Math.cos(angle) * 150,
                vy: Math.sin(angle) * 150,
                life: 0.8,
                size: 4 + Math.random() * 3
            });
        }
    }
    
    /**
     * Update barrier
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        this.pulseTime += deltaTime;
        
        // Update hit flash
        if (this.hitFlashTime > 0) {
            this.hitFlashTime -= deltaTime;
        }
        
        // Regenerate shield
        if (this.currentShield < this.maxShield) {
            this.regenTimer += deltaTime;
            
            if (this.regenTimer >= this.regenDelay) {
                this.currentShield = Math.min(
                    this.currentShield + this.regenRate * deltaTime,
                    this.maxShield
                );
            }
        }
        
        // Update break particles
        for (let i = this.breakParticles.length - 1; i >= 0; i--) {
            const p = this.breakParticles[i];
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.life -= deltaTime;
            p.size *= 0.98;
            
            if (p.life <= 0) {
                this.breakParticles.splice(i, 1);
            }
        }
    }
    
    /**
     * Render barrier
     * @param {CanvasRenderingContext2D} ctx 
     */
    render(ctx) {
        const centerX = this.player.position.x + this.player.width / 2;
        const centerY = this.player.position.y + this.player.height / 2;
        
        // Render break particles
        this.breakParticles.forEach(p => {
            ctx.fillStyle = `rgba(100, 200, 255, ${p.life})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Don't render shield if empty
        if (this.currentShield <= 0) return;
        
        const shieldPercent = this.currentShield / this.maxShield;
        const pulse = Math.sin(this.pulseTime * 3) * 0.1 + 0.9;
        const effectiveRadius = this.radius * pulse;
        
        ctx.save();
        
        // Hit flash effect
        const flashIntensity = this.hitFlashTime > 0 ? this.hitFlashTime / 0.3 : 0;
        
        // Outer glow
        const glowGrad = ctx.createRadialGradient(
            centerX, centerY, effectiveRadius * 0.7,
            centerX, centerY, effectiveRadius * 1.3
        );
        
        if (flashIntensity > 0) {
            glowGrad.addColorStop(0, `rgba(255, 255, 255, ${0.3 * flashIntensity})`);
            glowGrad.addColorStop(0.5, `rgba(100, 200, 255, ${0.4 * shieldPercent})`);
            glowGrad.addColorStop(1, 'rgba(50, 150, 255, 0)');
        } else {
            glowGrad.addColorStop(0, 'rgba(50, 150, 255, 0)');
            glowGrad.addColorStop(0.7, `rgba(100, 200, 255, ${0.15 * shieldPercent})`);
            glowGrad.addColorStop(1, 'rgba(50, 150, 255, 0)');
        }
        
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, effectiveRadius * 1.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Shield segments (hexagonal pattern effect)
        const segments = 6;
        const segmentAngle = (Math.PI * 2) / segments;
        const activeSegments = Math.ceil(segments * shieldPercent);
        
        for (let i = 0; i < activeSegments; i++) {
            const startAngle = i * segmentAngle - Math.PI / 2;
            const endAngle = startAngle + segmentAngle * 0.9;
            
            const segmentAlpha = i === activeSegments - 1 
                ? (shieldPercent * segments) % 1 
                : 1;
            
            // Segment arc
            ctx.strokeStyle = `rgba(100, 220, 255, ${(0.6 + flashIntensity * 0.4) * segmentAlpha})`;
            ctx.lineWidth = 3 + flashIntensity * 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(centerX, centerY, effectiveRadius, startAngle, endAngle);
            ctx.stroke();
        }
        
        // Inner energy field
        const innerGrad = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, effectiveRadius
        );
        innerGrad.addColorStop(0, 'rgba(100, 200, 255, 0)');
        innerGrad.addColorStop(0.6, `rgba(100, 200, 255, ${0.05 * shieldPercent})`);
        innerGrad.addColorStop(0.9, `rgba(150, 220, 255, ${0.1 * shieldPercent + flashIntensity * 0.2})`);
        innerGrad.addColorStop(1, `rgba(100, 200, 255, ${0.2 * shieldPercent})`);
        
        ctx.fillStyle = innerGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, effectiveRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Energy sparks when regenerating
        if (this.regenTimer >= this.regenDelay && this.currentShield < this.maxShield) {
            const sparkCount = 3;
            for (let i = 0; i < sparkCount; i++) {
                const angle = this.pulseTime * 5 + (Math.PI * 2 / sparkCount) * i;
                const sparkX = centerX + Math.cos(angle) * effectiveRadius;
                const sparkY = centerY + Math.sin(angle) * effectiveRadius;
                
                ctx.fillStyle = 'rgba(200, 255, 255, 0.8)';
                ctx.beginPath();
                ctx.arc(sparkX, sparkY, 3 + Math.sin(this.pulseTime * 10 + i) * 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        ctx.restore();
    }
}


/**
 * SmartMissile - Homing missile that tracks enemies
 */
class SmartMissile extends GameObject {
    constructor(x, y, target, manager) {
        super(x, y, 12, 20);
        this.tag = 'playerMissile';
        this.manager = manager;
        
        this.target = target;
        this.active = true;
        
        // Stats based on level
        const level = manager.missileLevel;
        this.damage = 3 + level * 1.5;
        this.speed = 250 + level * 20;
        this.turnSpeed = 4 + level * 0.5; // Radians per second
        this.lifetime = 5; // Seconds before self-destruct
        
        // Movement
        this.angle = -Math.PI / 2; // Start pointing up
        this.velocity = new Vector2(0, -this.speed);
        
        // Trail particles
        this.trailTimer = 0;
        this.trail = [];
        
        // Acquisition delay (to look more dramatic)
        this.acquireDelay = 0.2;
    }
    
    update(deltaTime, game) {
        if (!this.active) return;
        
        this.lifetime -= deltaTime;
        if (this.lifetime <= 0) {
            this.explode(game);
            return;
        }
        
        // Acquisition delay for dramatic launch
        if (this.acquireDelay > 0) {
            this.acquireDelay -= deltaTime;
            // Just move forward during acquisition
            this.position.x += this.velocity.x * deltaTime;
            this.position.y += this.velocity.y * deltaTime;
        } else {
            // Check if target is still valid
            if (!this.target || !this.target.active) {
                // Find new target
                const enemies = game.enemies.filter(e => e.active);
                if (enemies.length > 0) {
                    // Find closest enemy
                    let closest = null;
                    let closestDist = Infinity;
                    enemies.forEach(e => {
                        const dist = this.position.distance(e.getCenter());
                        if (dist < closestDist) {
                            closestDist = dist;
                            closest = e;
                        }
                    });
                    this.target = closest;
                }
            }
            
            // Home towards target
            if (this.target && this.target.active) {
                const targetCenter = this.target.getCenter();
                const toTarget = targetCenter.subtract(this.position);
                const targetAngle = Math.atan2(toTarget.y, toTarget.x);
                
                // Calculate angle difference
                let angleDiff = targetAngle - this.angle;
                
                // Normalize to -PI to PI
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                
                // Turn towards target
                const maxTurn = this.turnSpeed * deltaTime;
                if (Math.abs(angleDiff) < maxTurn) {
                    this.angle = targetAngle;
                } else {
                    this.angle += Math.sign(angleDiff) * maxTurn;
                }
            }
            
            // Update velocity based on angle
            this.velocity.x = Math.cos(this.angle) * this.speed;
            this.velocity.y = Math.sin(this.angle) * this.speed;
            
            // Move
            this.position.x += this.velocity.x * deltaTime;
            this.position.y += this.velocity.y * deltaTime;
        }
        
        // Update trail
        this.trailTimer += deltaTime;
        if (this.trailTimer >= 0.02) {
            this.trailTimer = 0;
            this.trail.push({
                x: this.position.x + this.width / 2,
                y: this.position.y + this.height / 2,
                life: 0.3
            });
        }
        
        // Update trail particles
        for (let i = this.trail.length - 1; i >= 0; i--) {
            this.trail[i].life -= deltaTime;
            if (this.trail[i].life <= 0) {
                this.trail.splice(i, 1);
            }
        }
        
        // Check collision with enemies
        game.enemies.forEach(enemy => {
            if (enemy.active && this.active && this.collidesWith(enemy)) {
                enemy.takeDamage(this.damage, game);
                this.explode(game);
            }
        });
        
        // Remove if off screen
        if (this.position.y < -50 || this.position.y > game.canvas.height + 50 ||
            this.position.x < -50 || this.position.x > game.canvas.width + 50) {
            this.active = false;
        }
    }
    
    explode(game) {
        this.active = false;
        
        // Create explosion
        game.spawnExplosion(
            this.position.x + this.width / 2,
            this.position.y + this.height / 2,
            'small'
        );
        
        // Splash damage to nearby enemies
        const splashRadius = 30 + this.manager.missileLevel * 5;
        const splashDamage = this.damage * 0.5;
        
        game.enemies.forEach(enemy => {
            if (enemy.active) {
                const dist = this.position.distance(enemy.position);
                if (dist < splashRadius) {
                    enemy.takeDamage(splashDamage * (1 - dist / splashRadius), game);
                }
            }
        });
    }
    
    render(ctx) {
        if (!this.active) return;
        
        // Render trail
        this.trail.forEach(t => {
            const alpha = t.life / 0.3;
            ctx.fillStyle = `rgba(255, 150, 50, ${alpha * 0.6})`;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 4 * alpha, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.save();
        ctx.translate(
            this.position.x + this.width / 2,
            this.position.y + this.height / 2
        );
        ctx.rotate(this.angle + Math.PI / 2);
        
        // Missile body
        ctx.fillStyle = '#8a8a8a';
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2);
        ctx.lineTo(-this.width / 3, this.height / 3);
        ctx.lineTo(this.width / 3, this.height / 3);
        ctx.closePath();
        ctx.fill();
        
        // Nose cone (red)
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2);
        ctx.lineTo(-this.width / 4, -this.height / 4);
        ctx.lineTo(this.width / 4, -this.height / 4);
        ctx.closePath();
        ctx.fill();
        
        // Fins
        ctx.fillStyle = '#666666';
        ctx.fillRect(-this.width / 2, this.height / 4, this.width / 4, this.height / 4);
        ctx.fillRect(this.width / 4, this.height / 4, this.width / 4, this.height / 4);
        
        // Exhaust flame
        const flicker = Math.random() * 0.3 + 0.7;
        const flameGrad = ctx.createLinearGradient(0, this.height / 3, 0, this.height / 2 + 10);
        flameGrad.addColorStop(0, `rgba(255, 200, 50, ${flicker})`);
        flameGrad.addColorStop(0.5, `rgba(255, 100, 0, ${flicker * 0.7})`);
        flameGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');
        
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.moveTo(-this.width / 4, this.height / 3);
        ctx.lineTo(0, this.height / 2 + 8 + Math.random() * 5);
        ctx.lineTo(this.width / 4, this.height / 3);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
}


/**
 * ProtectorDrone - Orbiting drone that shoots enemies
 */
class ProtectorDrone {
    constructor(player, index, manager) {
        this.player = player;
        this.index = index;
        this.manager = manager;
        
        // Orbital parameters
        this.orbitRadius = 55;
        this.orbitAngle = (Math.PI * 2 / 2) * index; // Start opposite for 2 drones
        this.orbitSpeed = 2.5;
        
        // Position
        this.x = 0;
        this.y = 0;
        this.size = 16;
        
        // Stats (level 1)
        this.damage = 1.2;
        this.fireRate = 0.40; // Seconds between shots
        this.fireCooldown = 0;
        this.range = 260;
        
        // Bullets
        this.bullets = [];
        
        // Animation
        this.animTime = 0;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.propellerAngle = 0;
    }
    
    /**
     * Upgrade drone stats
     */
    upgrade() {
        const level = this.manager.droneLevel;
        
        this.damage = 1.2 + level * 0.6;
        this.fireRate = Math.max(0.18, 0.40 - level * 0.03);
        this.range = 260 + level * 25;
    }
    
    update(deltaTime, game) {
        this.animTime += deltaTime;
        this.propellerAngle += deltaTime * 25;
        
        // Orbit around player
        this.orbitAngle += this.orbitSpeed * deltaTime;
        
        const playerCenterX = this.player.position.x + this.player.width / 2;
        const playerCenterY = this.player.position.y + this.player.height / 2;
        
        this.x = playerCenterX + Math.cos(this.orbitAngle) * this.orbitRadius;
        this.y = playerCenterY + Math.sin(this.orbitAngle) * this.orbitRadius;
        
        // Bob up and down
        this.y += Math.sin(this.animTime * 4 + this.bobOffset) * 3;
        
        // Fire at enemies
        this.fireCooldown -= deltaTime;
        if (this.fireCooldown <= 0) {
            const target = this.findTarget(game);
            if (target) {
                this.fire(target, game);
                this.fireCooldown = this.fireRate;
            }
        }
        
        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update(deltaTime, game);
            
            if (!bullet.active) {
                this.bullets.splice(i, 1);
            }
        }
    }
    
    findTarget(game) {
        let closest = null;
        let closestDist = this.range;
        
        game.enemies.forEach(enemy => {
            if (enemy.active) {
                const dx = enemy.position.x + enemy.width / 2 - this.x;
                const dy = enemy.position.y + enemy.height / 2 - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = enemy;
                }
            }
        });
        
        return closest;
    }
    
    fire(target, game) {
        const targetX = target.position.x + target.width / 2;
        const targetY = target.position.y + target.height / 2;
        const angle = Math.atan2(targetY - this.y, targetX - this.x);
        
        const bullet = new DroneBullet(
            this.x,
            this.y,
            angle,
            this.damage,
            this.range
        );
        
        this.bullets.push(bullet);
        game.sound.playShoot();
    }
    
    render(ctx) {
        // Render bullets
        this.bullets.forEach(bullet => {
            if (bullet.active) {
                bullet.render(ctx);
            }
        });
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, this.size + 3, this.size * 0.7, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Propeller blur
        ctx.fillStyle = 'rgba(100, 200, 255, 0.25)';
        ctx.beginPath();
        ctx.ellipse(0, -this.size * 0.6, this.size * 1.1, 4, this.propellerAngle, 0, Math.PI * 2);
        ctx.fill();
        
        // Main body (rounded hexagon shape)
        ctx.fillStyle = '#4a6fa5';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const r = this.size * 0.65;
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        
        // Body highlight
        ctx.fillStyle = '#6a8fc5';
        ctx.beginPath();
        ctx.arc(0, -2, this.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye/sensor
        ctx.fillStyle = '#1a2a4a';
        ctx.beginPath();
        ctx.arc(0, -1, this.size * 0.28, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye glow (pulsing)
        const pulse = (Math.sin(this.animTime * 5) + 1) * 0.5;
        ctx.fillStyle = `rgba(0, 255, 200, ${0.6 + pulse * 0.4})`;
        ctx.beginPath();
        ctx.arc(0, -1, this.size * 0.15, 0, Math.PI * 2);
        ctx.fill();
        
        // Gun barrel
        ctx.fillStyle = '#2a3a5a';
        ctx.fillRect(-3, this.size * 0.3, 6, this.size * 0.4);
        
        // Gun tip glow when ready
        if (this.fireCooldown <= 0) {
            ctx.fillStyle = 'rgba(0, 255, 200, 0.6)';
            ctx.beginPath();
            ctx.arc(0, this.size * 0.7, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Side thrusters
        const thrusterGlow = 0.5 + Math.sin(this.animTime * 8) * 0.2;
        ctx.fillStyle = `rgba(100, 200, 255, ${thrusterGlow})`;
        ctx.beginPath();
        ctx.arc(-this.size * 0.5, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.size * 0.5, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}


/**
 * DroneBullet - Bullet fired by protector drone
 */
class DroneBullet {
    constructor(x, y, angle, damage, range) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.damage = damage;
        this.range = range;
        this.speed = 500;
        this.size = 6;
        this.active = true;
        this.distanceTraveled = 0;
        
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
    }
    
    update(deltaTime, game) {
        if (!this.active) return;
        
        // Move
        const dx = this.vx * deltaTime;
        const dy = this.vy * deltaTime;
        this.x += dx;
        this.y += dy;
        this.distanceTraveled += Math.sqrt(dx * dx + dy * dy);
        
        // Check range
        if (this.distanceTraveled >= this.range) {
            this.active = false;
            return;
        }
        
        // Check collision with enemies
        game.enemies.forEach(enemy => {
            if (enemy.active && this.active) {
                const ex = enemy.position.x + enemy.width / 2;
                const ey = enemy.position.y + enemy.height / 2;
                const dist = Math.sqrt((ex - this.x) ** 2 + (ey - this.y) ** 2);
                
                if (dist < enemy.width / 2 + this.size) {
                    enemy.takeDamage(this.damage, game);
                    this.active = false;
                    
                    // Hit spark
                    game.particles.emitHitSpark(this.x, this.y, { r: 0, g: 255, b: 200 });
                }
            }
        });
        
        // Off screen
        if (this.x < -20 || this.x > game.canvas.width + 20 ||
            this.y < -20 || this.y > game.canvas.height + 20) {
            this.active = false;
        }
    }
    
    render(ctx) {
        if (!this.active) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Glow
        const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 2);
        glowGrad.addColorStop(0, 'rgba(0, 255, 200, 0.4)');
        glowGrad.addColorStop(1, 'rgba(0, 255, 200, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Bullet core
        const coreGrad = ctx.createLinearGradient(-this.size, 0, this.size, 0);
        coreGrad.addColorStop(0, '#00ffcc');
        coreGrad.addColorStop(0.5, '#ffffff');
        coreGrad.addColorStop(1, '#00ffcc');
        
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 1.5, this.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}
