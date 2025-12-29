/**
 * Entity System
 * Sprite-based entities with object pooling
 */

// ============ CANNON ENTITY ============
import { MultiPartTowerSprites } from './multi-part-towers.js';
import { MultiPartEnemySprites } from './multi-part-enemies.js';
import { CANNON_TYPES, CONFIG, ZOMBIE_TYPES, MERGE_LEVELS } from './config.js';
import { Utils } from './utils.js';
import { enemyAI } from './enemy-ai.js';
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
    
    // Reward scaling: cresce per compensare la difficoltà
    const rewardMultiplier = 1 + (waveNumber - 1) * 0.04;
    
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
        if (!MultiPartTowerSprites) {
            console.warn('[CANNON] MultiPartTowerSprites not available for', this.type);
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

    updateStats(boostMultipliers = null) {
        const baseStats = CANNON_TYPES[this.type];
        const levelData = MERGE_LEVELS[this.level - 1] || MERGE_LEVELS[MERGE_LEVELS.length - 1];
        
        // Calculate base stats
        this.damage = baseStats.damage * levelData.damageMultiplier;
        this.range = baseStats.range + levelData.rangeBonus;
        this.fireRate = baseStats.fireRate / levelData.fireRateBonus;
        
        // Apply boost multipliers if provided
        if (boostMultipliers) {
            if (boostMultipliers.damage) {
                this.damage *= boostMultipliers.damage;
            }
            if (boostMultipliers.range) {
                this.range *= boostMultipliers.range;
            }
            if (boostMultipliers.fireRate) {
                this.fireRate /= boostMultipliers.fireRate; // Lower fireRate = faster shooting
            }
        }
        
        this.projectileSpeed = baseStats.projectileSpeed;
        this.color = baseStats.color;
        
        // Get sprite (professional vector ONLY)
        this.sprite = baseStats.sprite ? baseStats.sprite() : null;
        
        // Debug: verificare che sprite sia caricato

        
        // Special properties
        this.splashRadius = baseStats.splashRadius;
        this.slowFactor = baseStats.slowFactor;
        this.slowDuration = baseStats.slowDuration;
        this.piercing = baseStats.piercing;
        this.chainTargets = baseStats.chainTargets;
    }

    canFire(currentTime) {
        // Cannot fire if stunned
        if (this.stunned) {
            return false;
        }
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
        // Handle stun duration
        if (this.stunned && this.stunDuration !== undefined) {
            this.stunDuration -= dt * 1000; // dt is in seconds
            if (this.stunDuration <= 0) {
                this.stunned = false;
                this.stunDuration = 0;
            }
        }
        
        // Update multi-part sprite animation
        if (this.multiSprite) {
            this.multiSprite.update(dt);
            
            // Ensure idle animation keeps playing
            if (!this.multiSprite.playing && this.multiSprite.currentAnimation !== 'idle') {
                this.multiSprite.play('idle');
            } else if (!this.multiSprite.playing) {
                // Restart idle if it somehow stopped
                this.multiSprite.play('idle');
            }
            
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
                    // Add rotation to the animated transform, don't override
                    rotatePart.targetRotation = angle;
                }
            }
        }
    }

    render(graphics, currentTime) {
        const recoilActive = currentTime < this.recoilTime;
        const bounce = recoilActive ? 0.5 : 0.2;
        const shake = recoilActive ? 0.3 : 0;
        
        // Check if stunned or disabled
        const isStunned = this.stunnedUntil && currentTime < this.stunnedUntil;
        const isDisabled = this.disabledUntil && currentTime < this.disabledUntil;
        
        // Draw range indicator if selected
        if (this.selected) {
            graphics.drawRange(this.col, this.row, this.range, Utils.colorWithAlpha(this.color, 0.15));
        }
        
        // Draw cannon - multi-part sprite takes priority
        if (this.multiSprite) {
            const pos = graphics.gridToScreen(this.col, this.row);
            const cellSize = graphics.getCellSize();
            
            // Apply visual effects for stunned/disabled state
            if (isStunned || isDisabled) {
                graphics.ctx.save();
                graphics.ctx.globalAlpha = 0.5 + Math.sin(currentTime * 0.01) * 0.2; // Flicker effect
            }
            
            try {
                // gridToScreen already returns the CENTER of the cell
                this.multiSprite.render(graphics.ctx, pos.x, pos.y, cellSize);
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
            
            // Restore alpha and draw status indicator
            if (isStunned || isDisabled) {
                graphics.ctx.restore();
                
                // Draw status icon above tower
                graphics.ctx.font = `${cellSize * 0.4}px Arial`;
                graphics.ctx.textAlign = 'center';
                graphics.ctx.textBaseline = 'middle';
                graphics.ctx.fillText(
                    isDisabled ? '🔇' : '💫',
                    pos.x,
                    pos.y - cellSize * 0.5
                );
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
        }
        
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
        this.ccResistance = 0;
        this.isBoss = baseStats.isBoss || false;
        
        // SPECIAL ABILITIES
        this.isHealer = baseStats.isHealer || false;
        this.healRange = baseStats.healRange || 0;
        this.healAmount = baseStats.healAmount || 0;
        this.healInterval = baseStats.healInterval || 2000;
        this.lastHealTime = 0;
        
        this.hasShield = baseStats.hasShield || false;
        this.shield = baseStats.shield || 0;
        this.maxShield = this.shield;
        this.shieldRegen = baseStats.shieldRegen || 0;
        this.shieldRegenDelay = baseStats.shieldRegenDelay || 3000;
        this.lastShieldDamageTime = 0;
        
        this.canSplit = baseStats.canSplit || false;
        this.splitCount = baseStats.splitCount || 0;
        this.splitType = baseStats.splitType || 'FAST';
        this.splitHpPercent = baseStats.splitHpPercent || 0.5;
        
        this.canPhase = baseStats.canPhase || false;
        this.phaseInterval = baseStats.phaseInterval || 4000;
        this.phaseDistance = baseStats.phaseDistance || 2.5;
        this.phaseInvulnerable = baseStats.phaseInvulnerable || 500;
        this.lastPhaseTime = 0;
        this.isInvulnerable = false;
        this.invulnerableUntil = 0;
        
        // NEW ABILITIES
        // VAMPIRE - Lifesteal on attack
        this.isVampire = baseStats.isVampire || false;
        this.lifesteal = baseStats.lifesteal || 0;
        this.lifestealRange = baseStats.lifestealRange || 2.0;
        this.lastDrainTime = 0;
        this.drainInterval = 1500; // Drain every 1.5 sec
        
        // BOMBER - Explodes on death
        this.isBomber = baseStats.isBomber || false;
        this.explosionRadius = baseStats.explosionRadius || 2.0;
        this.explosionDamage = baseStats.explosionDamage || 15;
        
        // SHADOW - Invisibility
        this.canInvis = baseStats.canInvis || false;
        this.invisDuration = baseStats.invisDuration || 2500;
        this.invisCooldown = baseStats.invisCooldown || 5000;
        this.lastInvisTime = -5000; // Start ready
        this.isInvisible = false;
        this.invisUntil = 0;
        
        // SIREN - Disable towers
        this.isSiren = baseStats.isSiren || false;
        this.disableRange = baseStats.disableRange || 2.5;
        this.disableDuration = baseStats.disableDuration || 1500;
        this.disableCooldown = baseStats.disableCooldown || 6000;
        this.lastDisableTime = 0;
        
        // GOLEM - Ground stomp
        this.isGolem = baseStats.isGolem || false;
        this.stompRange = baseStats.stompRange || 1.5;
        this.stompStunDuration = baseStats.stompStunDuration || 800;
        this.lastStompRow = -10; // Track position for stomp trigger
        this.stompEveryNCells = 3; // Stomp every 3 cells traveled
        
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
        if (!MultiPartEnemySprites) return;
        
        try {
            switch(this.type) {
                case 'NORMAL': this.multiSprite = MultiPartEnemySprites.createGrunt(); break;
                case 'RUSHER': this.multiSprite = MultiPartEnemySprites.createRusher(); break;
                case 'TANK': this.multiSprite = MultiPartEnemySprites.createTank(); break;
                case 'FLYER': this.multiSprite = MultiPartEnemySprites.createFlyer(); break;
                case 'SPLITTER': this.multiSprite = MultiPartEnemySprites.createSplitter(); break;
                case 'ARMORED': this.multiSprite = MultiPartEnemySprites.createArmored(); break;
                case 'BOSS': this.multiSprite = MultiPartEnemySprites.createBoss(); break;
                case 'HEALER': this.multiSprite = MultiPartEnemySprites.createHealer(); break;
                case 'PHASER': this.multiSprite = MultiPartEnemySprites.createPhaser(); break;
                case 'VAMPIRE': this.multiSprite = MultiPartEnemySprites.createVampire(); break;
                case 'BOMBER': this.multiSprite = MultiPartEnemySprites.createBomber(); break;
                case 'SHADOW': this.multiSprite = MultiPartEnemySprites.createShadow(); break;
                case 'SIREN': this.multiSprite = MultiPartEnemySprites.createSiren(); break;
                case 'GOLEM': this.multiSprite = MultiPartEnemySprites.createGolem(); break;
            }
            
            // if (this.multiSprite) {
            //     if (this.type === 'RUSHER') {
            //         this.multiSprite.play('fly');
            //     } else {
            //         this.multiSprite.play('walk');
            //     }
                
            //     this.multiSprite.onAnimationComplete = (name) => {
            //         if (name === 'hit') {
            //             // Return to appropriate locomotion
            //             if (this.type === 'RUSHER') {
            //                 this.multiSprite.play('fly');
            //             } else if (this.atWall && this.multiSprite.animations.has('attack')) {
            //                 // After hit while at wall, favor idle to prevent jitter
            //                 this.multiSprite.play('idle');
            //             } else {
            //                 this.multiSprite.play('walk');
            //             }
            //         } else if (name === 'attack' || name === 'drain') {
            //             // After attack or drain, return to idle at wall or walk otherwise
            //             if (this.atWall) {
            //                 this.multiSprite.play('idle');
            //             } else {
            //                 this.multiSprite.play(this.type === 'RUSHER' ? 'fly' : 'walk');
            //             }
            //         }
            //     };
            // }
        } catch(e) {
            this.multiSprite = null;
        }
    }

    update(dt, currentTime) {
        // ===== SPECIAL ABILITIES (status effects) =====
        this.updateAbilities(dt, currentTime);
        
        // ===== MOVEMENT is now handled by EnemyAISystem =====
        // The AI system is called from EntityManager.update()
        // This allows centralized, OOP-based movement with:
        // - Lane switching
        // - Collision avoidance
        // - Retreat behavior
        // - Type-specific strategies
        
        // Calculate effective speed for animations
        const effectiveSpeed = currentTime < this.slowUntil 
            ? this.speed * this.slowFactor 
            : this.speed;
        
        // Drive professional multi-part animations
        if (this.multiSprite) {
            // Scale playback speed with movement
            const speedFactor = Math.max(0.6, effectiveSpeed / Math.max(0.001, this.speed));
            this.multiSprite.setSpeed(speedFactor);

            // Check if hit animation finished (not playing and was hit)
            const isHitPlaying = this.multiSprite.currentAnimation === 'hit' && this.multiSprite.playing;
            const isDeathPlaying = this.multiSprite.currentAnimation === 'death';
            
            // Don't interrupt hit or death animations
            if (!isHitPlaying && !isDeathPlaying) {
                const locomotion = this.type === 'FLYER'  ? 'fly' : 'walk';
                
                if (this.atWall) {
                    // At wall: idle between occasional "attack" or "drain" strikes
                    if (this.multiSprite.currentAnimation !== 'idle' && 
                        this.multiSprite.currentAnimation !== 'attack' &&
                        this.multiSprite.currentAnimation !== 'drain' &&
                        this.multiSprite.currentAnimation !== 'heal') {
                        this.multiSprite.play('idle');
                    }
                    // Restart idle if it stopped playing (safety check)
                    if (this.multiSprite.currentAnimation === 'idle' && !this.multiSprite.playing) {
                        this.multiSprite.play('idle');
                    }
                    // Periodic attack if animation exists (non-vampire enemies)
                    // Healers attack very rarely (every 10 seconds), normal enemies every 1.1 seconds
                    if (!this.isVampire && this.multiSprite.animations && this.multiSprite.animations.has('attack')) {
                        this._attackAccumulator = (this._attackAccumulator || 0) + dt;
                        const attackInterval = this.isHealer ? 10.0 : 1.1;
                        if (this._attackAccumulator >= attackInterval) {
                            this._attackAccumulator = 0;
                            this.multiSprite.play('attack', true);
                        }
                    }
                } else {
                    // In motion: ensure walk/fly is playing
                    if (this.multiSprite.currentAnimation !== locomotion || !this.multiSprite.playing) {
                        this.multiSprite.play(locomotion);
                    }
                }
            }
        }
        
        // Legacy oscillation phase (used only for fallback emoji rendering)
        this.animPhase += dt * (effectiveSpeed + 2);
        
        // Hit flash decay
        if (this.hitFlash > 0) {
            this.hitFlash -= dt * 3;
        }
        
        // Shield block animation decay
        if (this._shieldBlockAnim > 0) {
            this._shieldBlockAnim -= dt * 2;
        }
        
        // Update multi-part sprite animation
        if (this.multiSprite) {
            this.multiSprite.update(dt);
        }
    }

    /**
     * Update special abilities (separated from movement for OOP)
     */
    updateAbilities(dt, currentTime) {
        // Check invulnerability (PHASER ability)
        if (this.isInvulnerable && currentTime > this.invulnerableUntil) {
            this.isInvulnerable = false;
        }
        
        // Check invisibility ending (SHADOW ability)
        if (this.isInvisible && currentTime > this.invisUntil) {
            this.isInvisible = false;
        }
        
        // PHASER ability: teleport forward
        if (this.canPhase && currentTime - this.lastPhaseTime >= this.phaseInterval) {
            this.row += this.phaseDistance;
            this.lastPhaseTime = currentTime;
            this.isInvulnerable = true;
            this.invulnerableUntil = currentTime + this.phaseInvulnerable;
        }
        
        // SHADOW ability: become invisible periodically
        if (this.canInvis && !this.isInvisible && currentTime - this.lastInvisTime >= this.invisCooldown) {
            this.isInvisible = true;
            this.invisUntil = currentTime + this.invisDuration;
            this.lastInvisTime = currentTime;
            if (this.multiSprite?.animations?.has('invis')) {
                this.multiSprite.play('invis');
            }
        }
        
        // GOLEM ability: stomp every N cells traveled
        if (this.isGolem) {
            const cellsTraveled = this.row - this.lastStompRow;
            if (cellsTraveled >= this.stompEveryNCells) {
                this.lastStompRow = this.row;
                this.needsStomp = true;
                if (this.multiSprite?.animations?.has('stomp')) {
                    this.multiSprite.play('stomp');
                }
            }
        }
        
        // VAMPIRE ability: drain attack flag
        if (this.isVampire && this.atWall && currentTime - this.lastDrainTime >= this.drainInterval) {
            this.needsDrain = true;
            this.lastDrainTime = currentTime;
            if (this.multiSprite?.animations?.has('drain')) {
                this.multiSprite.play('drain');
            }
        }
        
        // SIREN ability: scream to disable towers
        if (this.isSiren && currentTime - this.lastDisableTime >= this.disableCooldown) {
            this.needsScream = true;
            this.lastDisableTime = currentTime;
            if (this.multiSprite?.animations?.has('scream')) {
                this.multiSprite.play('scream');
            }
        }
        
        // HEALER ability
        if (this.isHealer && currentTime - this.lastHealTime >= this.healInterval) {
            this.lastHealTime = currentTime;
        }
        
        // SHIELDED ability: regenerate shield
        if (this.hasShield && this.shield < this.maxShield) {
            if (currentTime - this.lastShieldDamageTime >= this.shieldRegenDelay) {
                this.shield = Math.min(this.maxShield, this.shield + this.shieldRegen * dt);
            }
        }
    }

    findNearbyEnemies(radius) {
        if (!this._allEnemies) return [];
        return this._allEnemies.filter(e => 
            e !== this && 
            !e.isDead() && 
            Math.abs(e.col - this.col) < radius && 
            Math.abs(e.row - this.row) < radius
        );
    }

    takeDamage(amount, currentTime) {
        // PHASER invulnerability
        if (this.isInvulnerable) {
            this._shieldBlockAnim = 0.3; // Animazione invulnerabilità
            return { damage: 0, blocked: true, type: 'invulnerable' };
        }
        
        // SHIELDED: damage shield first
        if (this.hasShield && this.shield > 0) {
            const shieldDamage = Math.min(this.shield, amount);
            this.shield -= shieldDamage;
            amount -= shieldDamage;
            this.lastShieldDamageTime = currentTime;
            this._shieldBlockAnim = 0.4; // Animazione scudo colpito
            
            if (amount <= 0) {
                this.hitFlash = 0.5;
                return { damage: shieldDamage, blocked: true, type: 'shield' };
            }
        }
        
        // Apply armor reduction
        const actualDamage = Math.max(1, amount - this.armor);
        this.hp -= actualDamage;
        this.hitFlash = 1.0;
        
        // Trigger hit animation
        if (this.multiSprite && this.multiSprite.currentAnimation !== 'death') {
            this.multiSprite.play('hit');
        }
        
        return { damage: actualDamage, blocked: false, type: 'normal' };
    }

    applySlow(factor, duration, currentTime) {
        this.slowFactor = factor;
        this.slowUntil = currentTime + duration;
    }

    isDead() {
        return this.hp <= 0;
    }

    isOffScreen() {
        // Limite più restrittivo: non permettere ai nemici di andare oltre la zona di difesa
        return this.row >= (CONFIG.ROWS - CONFIG.DEFENSE_ZONE_ROWS + 0.5);
    }

    isPastDefenseLine() {
        return this.row >= (CONFIG.ROWS - CONFIG.DEFENSE_ZONE_ROWS);
    }

    render(graphics) {
        // Skip rendering if invisible (SHADOW ability)
        if (this.isInvisible) {
            // Draw a faint ghost outline only
            const pos = graphics.gridToScreen(this.col, this.row);
            graphics.ctx.save();
            graphics.ctx.globalAlpha = 0.15;
            graphics.ctx.fillStyle = '#00ffff';
            graphics.ctx.beginPath();
            graphics.ctx.arc(pos.x, pos.y, graphics.getCellSize() * 0.3, 0, Math.PI * 2);
            graphics.ctx.fill();
            graphics.ctx.restore();
            return;
        }
        
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
                // gridToScreen already returns the CENTER of the cell
                this.multiSprite.render(graphics.ctx, pos.x, pos.y, size);
            } catch(e) {
                console.error('[ZOMBIE] Render error:', e);
            }
            
            if (this.hitFlash > 0) {
                graphics.ctx.restore();
            }
        } else if (this.sprite) {
            // Legacy wobble for fallback sprite
            const wobble = Math.sin(this.animPhase) * 0.05;
            const rotation = Math.sin(this.animPhase * 0.5) * 0.1;
            
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
        this.target = null; // Aggiunto
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
        this.target = target; // Memorizza il nemico, non la posizione!
        this.targetX = target.col;
        this.targetY = target.row;
        
        // Calculate initial velocity
        const dx = this.targetX - x;
        const dy = this.targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            this.vx = (dx / dist) * cannon.projectileSpeed;
            this.vy = (dy / dist) * cannon.projectileSpeed;
        } else {
            this.vx = 0;
            this.vy = 0;
        }
        
        this.damage = cannon.damage;
        this.color = cannon.color;
        this.speed = cannon.projectileSpeed;
        this.piercing = cannon.piercing || 0;
        this.piercedTargets = [];
        this.splashRadius = cannon.splashRadius || 0;
        this.slowFactor = cannon.slowFactor || 0;
        this.slowDuration = cannon.slowDuration || 0;
        this.chainTargets = cannon.chainTargets || 0;
        this.cannonType = cannon.type;
        this.owner = cannon;
    }

    update(dt) {
        if (!this.active) return;
        
        // Se il target è morto, disattiva il projectile
        if (this.target && this.target.isDead()) {
            this.active = false;
            return;
        }
        
        // Aggiorna il target se il nemico è ancora vivo
        if (this.target && !this.target.isDead()) {
            this.targetX = this.target.col;
            this.targetY = this.target.row;
            
            // Ricalcola velocità per seguire il nemico
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                this.vx = (dx / dist) * this.speed;
                this.vy = (dy / dist) * this.speed;
            }
        }
        
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

