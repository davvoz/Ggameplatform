import { ZOMBIE_TYPES, CONFIG } from '../config.js';
import { MultiPartEnemySprites } from '../sprites/multi-part-enemies.js';

// ============ ZOMBIE ENTITY ============
export class Zombie {
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
        this.lifestealRange = baseStats.lifestealRange || 2;
        this.lastDrainTime = 0;
        this.drainInterval = 1500; // Drain every 1.5 sec


        // BOMBER - Explodes on death
        this.isBomber = baseStats.isBomber || false;
        this.explosionRadius = baseStats.explosionRadius || 2;
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
        this.slowFactor = 1;
        this.stunnedUntil = 0; // Stun effect timestamp


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
            switch (this.type) {
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

        } catch (e) {
            console.warn(`[ZOMBIE] Failed to initialize multi-part sprite for type ${this.type}:`, e);
            this.multiSprite = null;
        }
    }

    update(dt, currentTime) {
        this.updateAbilities(dt, currentTime);

        const effectiveSpeed = currentTime < this.slowUntil
            ? this.speed * this.slowFactor
            : this.speed;

        if (this.multiSprite) this.#updateSpriteAnimation(dt, effectiveSpeed);

        this.animPhase += dt * (effectiveSpeed + 2);
        if (this.hitFlash > 0) this.hitFlash -= dt * 3;
        if (this._shieldBlockAnim > 0) this._shieldBlockAnim -= dt * 2;
        if (this.multiSprite) this.multiSprite.update(dt);
    }

    #updateSpriteAnimation(dt, effectiveSpeed) {
        const speedFactor = Math.max(0.6, effectiveSpeed / Math.max(0.001, this.speed));
        this.multiSprite.setSpeed(speedFactor);

        const isHitPlaying = this.multiSprite.currentAnimation === 'hit' && this.multiSprite.playing;
        const isDeathPlaying = this.multiSprite.currentAnimation === 'death';
        if (isHitPlaying || isDeathPlaying) return;

        const locomotion = this.type === 'FLYER' ? 'fly' : 'walk';
        if (this.atWall) {
            this.#updateWallAnimations(dt);
        } else {
            this.#updateMotionAnimation(locomotion);
        }
    }

    #updateWallAnimations(dt) {
        const anim = this.multiSprite.currentAnimation;
        const isWallAnim = anim === 'idle' || anim === 'attack' || anim === 'drain' || anim === 'heal';
        if (!isWallAnim) this.multiSprite.play('idle');
        if (anim === 'idle' && !this.multiSprite.playing) this.multiSprite.play('idle');

        if (!this.isVampire && this.multiSprite.animations?.has('attack')) {
            this._attackAccumulator = (this._attackAccumulator || 0) + dt;
            const attackInterval = this.isHealer ? 10 : 1.1;
            if (this._attackAccumulator >= attackInterval) {
                this._attackAccumulator = 0;
                this.multiSprite.play('attack', true);
            }
        }
    }

    #updateMotionAnimation(locomotion) {
        if (this.multiSprite.currentAnimation !== locomotion || !this.multiSprite.playing) {
            this.multiSprite.play(locomotion);
        }
    }

    updateAbilities(dt, currentTime) {
        if (this.stunnedUntil && currentTime < this.stunnedUntil) return;

        if (this.isInvulnerable && currentTime > this.invulnerableUntil) this.isInvulnerable = false;
        if (this.isInvisible && currentTime > this.invisUntil) this.isInvisible = false;

        this.#updatePhaserAbility(currentTime);
        this.#updateShadowAbility(currentTime);
        this.#updateGolemAbility();
        this.#updateVampireAbility(currentTime);
        this.#updateSirenAbility(currentTime);
        if (this.isHealer && currentTime - this.lastHealTime >= this.healInterval) this.lastHealTime = currentTime;
        this.#updateShieldRegen(dt, currentTime);
    }

    #updatePhaserAbility(currentTime) {
        if (!this.canPhase || currentTime - this.lastPhaseTime < this.phaseInterval) return;
        this.row += this.phaseDistance;
        this.lastPhaseTime = currentTime;
        this.isInvulnerable = true;
        this.invulnerableUntil = currentTime + this.phaseInvulnerable;
    }

    #updateShadowAbility(currentTime) {
        if (!this.canInvis || this.isInvisible || currentTime - this.lastInvisTime < this.invisCooldown) return;
        this.isInvisible = true;
        this.invisUntil = currentTime + this.invisDuration;
        this.lastInvisTime = currentTime;
        if (this.multiSprite?.animations?.has('invis')) this.multiSprite.play('invis');
    }

    #updateGolemAbility() {
        if (!this.isGolem || this.row - this.lastStompRow < this.stompEveryNCells) return;
        this.lastStompRow = this.row;
        this.needsStomp = true;
        if (this.multiSprite?.animations?.has('stomp')) this.multiSprite.play('stomp');
    }

    #updateVampireAbility(currentTime) {
        if (!this.isVampire || !this.atWall || currentTime - this.lastDrainTime < this.drainInterval) return;
        this.needsDrain = true;
        this.lastDrainTime = currentTime;
        if (this.multiSprite?.animations?.has('drain')) this.multiSprite.play('drain');
    }

    #updateSirenAbility(currentTime) {
        if (!this.isSiren || currentTime - this.lastDisableTime < this.disableCooldown) return;
        this.needsScream = true;
        this.lastDisableTime = currentTime;
        if (this.multiSprite?.animations?.has('scream')) this.multiSprite.play('scream');
    }

    #updateShieldRegen(dt, currentTime) {
        if (!this.hasShield || this.shield >= this.maxShield) return;
        if (currentTime - this.lastShieldDamageTime >= this.shieldRegenDelay) {
            this.shield = Math.min(this.maxShield, this.shield + this.shieldRegen * dt);
        }
    }

    findNearbyEnemies(radius) {
        if (!this._allEnemies) return [];
        return this._allEnemies.filter(e => e !== this &&
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
        this.hitFlash = 1;

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
            } catch (e) {
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
        if (hpPercent < 1) {
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
