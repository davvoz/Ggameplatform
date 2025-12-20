/**
 * Entity System
 * Sprite-based entities with object pooling
 */

// ============ CANNON ENTITY ============
class Cannon {
    constructor(col, row, type) {
        this.col = col;
        this.row = row;
        this.type = type;
        this.level = 1;
        this.lastFireTime = 0;
        this.selected = false;
        this.recoilTime = 0;
        this.targetLocked = null;
        this.multiSprite = null;
        
        // Get stats
        this.updateStats();
        
        // Initialize multi-part sprite if available
        this.initMultiPartSprite();
    }

    initMultiPartSprite() {
        if (typeof MultiPartTowerSprites === 'undefined') {
            console.warn('[CANNON] MultiPartTowerSprites not defined for', this.type);
            return;
        }
        
        try {
            switch(this.type) {
                case 'BASIC': this.multiSprite = MultiPartTowerSprites.createBasic(); break;
                case 'RAPID': this.multiSprite = MultiPartTowerSprites.createRapid(); break;
                case 'SNIPER': this.multiSprite = MultiPartTowerSprites.createSniper(); break;
                case 'SPLASH': this.multiSprite = MultiPartTowerSprites.createSplash(); break;
                case 'FREEZE': this.multiSprite = MultiPartTowerSprites.createFreeze(); break;
                case 'LASER': this.multiSprite = MultiPartTowerSprites.createLaser(); break;
                case 'ELECTRIC': this.multiSprite = MultiPartTowerSprites.createElectric(); break;
            }
            
            if (this.multiSprite) {
                console.log('[CANNON] Multi-part sprite created for', this.type);
                this.multiSprite.play('idle');
                
                this.multiSprite.onAnimationComplete = (name) => {
                    if (name === 'fire' || name === 'charging') {
                        this.multiSprite.play('idle');
                    }
                };
            } else {
                console.error('[CANNON] Failed to create multi-part sprite for', this.type);
            }
        } catch(e) {
            console.error('[CANNON] Exception creating multi-part sprite:', e);
            this.multiSprite = null;
        }
    }

    updateStats() {
        const baseStats = CANNON_TYPES[this.type];
        const levelData = MERGE_LEVELS[this.level - 1] || MERGE_LEVELS[MERGE_LEVELS.length - 1];
        
        this.damage = baseStats.damage * levelData.damageMultiplier;
        this.range = baseStats.range + levelData.rangeBonus;
        this.fireRate = baseStats.fireRate / levelData.fireRateBonus;
        this.projectileSpeed = baseStats.projectileSpeed;
        this.color = baseStats.color;
        
        // Get sprite (professional vector ONLY)
        this.sprite = baseStats.sprite ? baseStats.sprite() : null;
        
        // Debug: verificare che sprite sia caricato
        if (!this.sprite && window.TowerSpriteLibrary) {
            console.error(`[CANNON] No sprite for ${this.type}, TowerSpriteLibrary exists but sprite is null`);
        } else if (!this.sprite) {
            console.error(`[CANNON] No sprite for ${this.type}, TowerSpriteLibrary not loaded`);
        }
        
        // Special properties
        this.splashRadius = baseStats.splashRadius;
        this.slowFactor = baseStats.slowFactor;
        this.slowDuration = baseStats.slowDuration;
        this.piercing = baseStats.piercing;
        this.chainTargets = baseStats.chainTargets;
    }

    canFire(currentTime) {
        return currentTime - this.lastFireTime >= this.fireRate;
    }

    fire(currentTime, target) {
        this.lastFireTime = currentTime;
        this.recoilTime = currentTime + 200; // Recoil animation duration
        this.targetLocked = target;
        
        // Trigger fire animation
        if (this.multiSprite) {
            // Sniper and Laser have charging animation first
            if (this.type === 'SNIPER' || this.type === 'LASER') {
                this.multiSprite.play('charging');
            } else {
                this.multiSprite.play('fire');
            }
        }
    }

    update(dt) {
        // Update multi-part sprite animation
        if (this.multiSprite) {
            this.multiSprite.update(dt);
            
            // Rotate turret/chamber towards target
            if (this.targetLocked && !this.targetLocked.isDead()) {
                const targetPos = {x: this.targetLocked.col, y: this.targetLocked.row};
                const angle = Math.atan2(
                    targetPos.y - this.row,
                    targetPos.x - this.col
                );
                
                // Rotate appropriate part based on tower type
                const rotatePart = this.multiSprite.getPart('turret') || 
                                 this.multiSprite.getPart('chamber') || 
                                 this.multiSprite.getPart('housing');
                if (rotatePart) {
                    rotatePart.animatedTransform.rotation = angle;
                }
            }
        }
    }

    render(graphics, currentTime) {
        const recoilActive = currentTime < this.recoilTime;
        const bounce = recoilActive ? 0.5 : 0.2;
        const shake = recoilActive ? 0.3 : 0;
        
        // Draw range indicator if selected
        if (this.selected) {
            graphics.drawRange(this.col, this.row, this.range, Utils.colorWithAlpha(this.color, 0.15));
        }
        
        // Draw cannon - multi-part sprite takes priority
        if (this.multiSprite) {
            const pos = graphics.gridToScreen(this.col, this.row);
            const cellSize = graphics.getCellSize();
            try {
                // pos.x + cellSize/2, pos.y + cellSize/2 is the CENTER of the cell
                this.multiSprite.render(graphics.ctx, pos.x + cellSize/2, pos.y + cellSize/2, cellSize);
            } catch(e) {
                console.error('[CANNON] Render error for', this.type, ':', e);
                // Fallback to static sprite on error
                if (this.sprite) {
                    graphics.drawSprite(this.sprite, this.col, this.row, {
                        scale: 1.0,
                        color: this.color,
                        glow: this.selected,
                        glowColor: this.color
                    });
                }
            }
        } else if (this.sprite) {
            // Use professional sprite only
            graphics.drawSprite(this.sprite, this.col, this.row, {
                scale: 1.0,
                color: this.color,
                glow: this.selected,
                glowColor: this.color,
                bounce: bounce,
                shake: shake
            });
        }
        
        // Draw level indicator
        if (this.level > 1) {
            graphics.drawLevel(this.col, this.row, this.level, this.levelIcon);
        }null
        
        // Draw selection
        if (this.selected) {
            graphics.drawSelection(this.col, this.row, this.color);
        }
    }

    upgrade() {
        if (this.level < MERGE_LEVELS.length) {
            this.level++;
            this.updateStats();
            return true;
        }
        return false;
    }

    canMergeWith(other) {
        return other && 
               other.type === this.type && 
               other.level === this.level &&
               other !== this;
    }
}

// ============ ZOMBIE ENTITY ============
class Zombie {
    constructor(col, type) {
        this.col = col;
        this.row = -1; // Start above grid
        this.type = type;
        
        const baseStats = ZOMBIE_TYPES[type];
        this.maxHp = baseStats.hp;
        this.hp = this.maxHp;
        this.speed = baseStats.speed;
        this.reward = baseStats.reward;
        this.color = baseStats.color;
        
        // Get sprite (professional vector ONLY)
        this.sprite = baseStats.sprite ? baseStats.sprite() : null;
        
        this.scale = baseStats.scale;
        this.armor = baseStats.armor || 0;
        this.dodgeChance = baseStats.dodgeChance || 0;
        this.ccResistance = 0; // Inizializza CC resistance (verrà scalato con la wave)
        this.isBoss = baseStats.isBoss || false;
        
        // Status effects
        this.slowUntil = 0;
        this.slowFactor = 1.0;
        
        // Animation
        this.animPhase = Math.random() * Math.PI * 2;
        this.hitFlash = 0;
        this.multiSprite = null;
        
        // Initialize multi-part sprite if available
        this.initMultiPartSprite();
    }

    initMultiPartSprite() {
        if (typeof MultiPartEnemySprites === 'undefined') return;
        
        try {
            switch(this.type) {
                case 'NORMAL': this.multiSprite = MultiPartEnemySprites.createGrunt(); break;
                case 'FAST': this.multiSprite = MultiPartEnemySprites.createRusher(); break;
                case 'TANK': this.multiSprite = MultiPartEnemySprites.createTank(); break;
                case 'AGILE': this.multiSprite = MultiPartEnemySprites.createFlyer(); break;
                case 'ARMORED': this.multiSprite = MultiPartEnemySprites.createTank(); break;
                case 'BOSS': this.multiSprite = MultiPartEnemySprites.createBoss(); break;
            }
            
            if (this.multiSprite) {
                if (this.type === 'AGILE') {
                    this.multiSprite.play('fly');
                } else {
                    this.multiSprite.play('walk');
                }
                
                this.multiSprite.onAnimationComplete = (name) => {
                    if (name === 'hit') {
                        if (this.type === 'AGILE') {
                            this.multiSprite.play('fly');
                        } else {
                            this.multiSprite.play('walk');
                        }
                    }
                };
            }
        } catch(e) {
            this.multiSprite = null;
        }
    }

    update(dt, currentTime) {
        // Apply slow effect
        const effectiveSpeed = currentTime < this.slowUntil ? 
                              this.speed * this.slowFactor : 
                              this.speed;
        
        this.row += effectiveSpeed * dt;
        
        // Update animation
        this.animPhase += dt * (effectiveSpeed + 2);
        
        // Hit flash decay
        if (this.hitFlash > 0) {
            this.hitFlash -= dt * 3;
        }
        
        // Update multi-part sprite animation
        if (this.multiSprite) {
            this.multiSprite.update(dt);
        }
    }

    takeDamage(amount) {
        const actualDamage = Math.max(1, amount - this.armor);
        this.hp -= actualDamage;
        this.hitFlash = 1.0;
        
        // Trigger hit animation
        if (this.multiSprite && this.multiSprite.currentAnimation !== 'death') {
            this.multiSprite.play('hit');
        }
        
        return actualDamage;
    }

    applySlow(factor, duration, currentTime) {
        this.slowFactor = factor;
        this.slowUntil = currentTime + duration;
    }

    isDead() {
        return this.hp <= 0;
    }

    isOffScreen() {
        return this.row > CONFIG.ROWS + 1;
    }

    isPastDefenseLine() {
        return this.row >= (CONFIG.ROWS - CONFIG.DEFENSE_ZONE_ROWS);
    }

    render(graphics) {
        const wobble = Math.sin(this.animPhase) * 0.05;
        const rotation = Math.sin(this.animPhase * 0.5) * 0.1;
        
        // Flash red when hit
        const flashColor = this.hitFlash > 0 ? '#ffffff' : null;
        
        // Draw zombie - multi-part sprite takes priority
        if (this.multiSprite) {
            const pos = graphics.gridToScreen(this.col, this.row);
            const cellSize = graphics.getCellSize();
            const size = cellSize * this.scale;
            
            // Apply hit flash effect
            if (this.hitFlash > 0) {
                graphics.ctx.save();
                graphics.ctx.globalAlpha = 0.5 + this.hitFlash * 0.5;
            }
            
            try {
                // pos.x + cellSize/2, pos.y + cellSize/2 is the CENTER of the cell
                this.multiSprite.render(graphics.ctx, pos.x + cellSize/2, pos.y + cellSize/2, size);
            } catch(e) {
                console.error('[ZOMBIE] Render error:', e);
            }
            
            if (this.hitFlash > 0) {
                graphics.ctx.restore();
            }
        } else if (this.sprite) {
            // Use professional sprite only
            graphics.drawSprite(this.sprite, this.col, this.row, {
                scale: this.scale,
                color: flashColor,
                tint: flashColor, // For vector sprites
                glow: this.isBoss || this.hitFlash > 0,
                glowColor: this.isBoss ? this.color : '#ffffff',
                bounce: Math.abs(wobble) * 2,
                rotation: rotation
            });
        }
        
        // Draw health bar
        const hpPercent = this.hp / this.maxHp;
        if (hpPercent < 1.0) {
            graphics.drawHealthBar(this.col, this.row, hpPercent, {
                offsetY: -0.5 * this.scale,
                width: 0.8 * this.scale
            });
        }
        
        // Draw armor indicator
        if (this.armor > 0) {
            const pos = graphics.gridToScreen(this.col, this.row);
            graphics.drawText('🛡️', pos.x + graphics.getCellSize() * 0.3, pos.y - graphics.getCellSize() * 0.3, {
                size: graphics.getCellSize() * 0.2,
                align: 'center'
            });
        }
    }
}

// ============ PROJECTILE ENTITY ============
class Projectile {
    constructor() {
        this.reset();
    }

    reset() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.vx = 0;
        this.vy = 0;
        this.damage = 0;
        this.color = '#ffffff';
        this.speed = 10;
        this.piercing = 0;
        this.piercedTargets = [];
        this.splashRadius = 0;
        this.slowFactor = 0;
        this.slowDuration = 0;
        this.chainTargets = 0;
        this.chainedFrom = null;
        this.owner = null;
    }

    init(x, y, target, cannon) {
        this.active = true;
        this.x = x;
        this.y = y;
        this.targetX = target.col;
        this.targetY = target.row;
        
        // Calculate velocity
        const dx = this.targetX - x;
        const dy = this.targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        this.vx = (dx / dist) * cannon.projectileSpeed;
        this.vy = (dy / dist) * cannon.projectileSpeed;
        
        this.damage = cannon.damage;
        this.color = cannon.color;
        this.speed = cannon.projectileSpeed;
        this.piercing = cannon.piercing || 0;
        this.piercedTargets = [];
        this.splashRadius = cannon.splashRadius || 0;
        this.slowFactor = cannon.slowFactor || 0;
        this.slowDuration = cannon.slowDuration || 0;
        this.chainTargets = cannon.chainTargets || 0;
        this.owner = cannon;
    }

    update(dt) {
        if (!this.active) return;
        
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        // Check if reached target area
        const dist = Utils.distance(this.x, this.y, this.targetX, this.targetY);
        if (dist < 0.3) {
            this.active = false;
        }
        
        // Check if off screen
        if (this.x < -2 || this.x > CONFIG.COLS + 2 || this.y < -2 || this.y > CONFIG.ROWS + 2) {
            this.active = false;
        }
    }

    render(graphics) {
        if (!this.active) return;
        
        graphics.drawProjectile(this.x, this.y, this.color, 1.0, {
            glow: true
        });
    }

    hasHitTarget(target) {
        return this.piercedTargets.includes(target);
    }

    addPiercedTarget(target) {
        this.piercedTargets.push(target);
        
        // Deactivate if pierced enough targets
        if (this.piercing > 0 && this.piercedTargets.length >= this.piercing) {
            this.active = false;
        }
    }
}

// ============ ENTITY MANAGER ============
class EntityManager {
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
            // Crea un config fittizio per applicare lo scaling
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
            
            // Applica i valori scalati
            zombie.maxHp = scaled.combat.hp;
            zombie.hp = zombie.maxHp;
            zombie.speed = scaled.movement.speed;
            zombie.reward = scaled.reward;
            zombie.armor = scaled.combat.armor;
            zombie.dodgeChance = scaled.combat.dodgeChance;
            zombie.ccResistance = scaled.combat.ccResistance || 0;
        }
        
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
        // Update zombies
        for (let i = this.zombies.length - 1; i >= 0; i--) {
            const zombie = this.zombies[i];
            zombie.update(dt, currentTime);
            
            // Remove dead or off-screen zombies
            if (zombie.isDead() || zombie.isOffScreen()) {
                this.zombies.splice(i, 1);
            }
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
    render(graphics, currentTime) {
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
            cannon.render(graphics, currentTime);
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
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Cannon, Zombie, Projectile, EntityManager };
}
