import { C_MEDIUM_BLUE, C_GOLD } from './LevelsThemes.js';
import GameObject from '../../../shared/GameObject.js';
import PlayerRenderer from './PlayerRenderer.js';
import PowerUpManager from './powerups/PowerUpManager.js';

/**
 * SHIP_DATA - 5 ships with distinct characteristics
 * Stats range 1-10, used as base multipliers
 * 
 * Stats:
 *   hp       - Hit Points (max health)
 *   speed    - Movement speed
 *   resist   - Damage resistance (% reduction)
 *   fireRate - Shots per second (lower = faster cooldown)
 */
 const SHIP_DATA = {
    vanguard: {
        id: 'vanguard',
        name: 'Vanguard',
        description: 'Balanced all-rounder. No glaring weaknesses, no outstanding strengths.',
        color: C_MEDIUM_BLUE,
        stats: { hp: 5, speed: 5, resist: 5, fireRate: 5 }
    },
    interceptor: {
        id: 'interceptor',
        name: 'Interceptor',
        description: 'Lightning fast with rapid fire. Fragile hull demands expert piloting.',
        color: '#44ff88',
        stats: { hp: 3, speed: 8, resist: 2, fireRate: 7 }
    },
    fortress: {
        id: 'fortress',
        name: 'Fortress',
        description: 'Heavy armor and massive HP. Slow but nearly indestructible.',
        color: '#8888ff',
        stats: { hp: 8, speed: 3, resist: 8, fireRate: 3 }
    },
    striker: {
        id: 'striker',
        name: 'Striker',
        description: 'Glass cannon with devastating fire rate. Kill fast or die trying.',
        color: '#ff8844',
        stats: { hp: 4, speed: 6, resist: 3, fireRate: 8 }
    },
    titan: {
        id: 'titan',
        name: 'Titan',
        description: 'The ultimate juggernaut. Massive HP and resistance, but painfully slow.',
        color: '#ff4488',
        stats: { hp: 9, speed: 2, resist: 9, fireRate: 2 }
    }
};

/**
 * ULTIMATE_DATA - 5 ultimate abilities
 */
 const ULTIMATE_DATA = {
    nova_blast: {
        id: 'nova_blast',
        name: 'Nova Blast',
        icon: '✸',
        description: 'Releases a devastating explosion that damages all enemies on screen.',
        color: '#ff6600',
        chargeNeeded: 100,
        chargeMult: 1
    },
    shield_dome: {
        id: 'shield_dome',
        name: 'Invincibility',
        icon: '◆',
        description: 'Become invincible for 6 seconds. Charge freezes during effect.',
        color: C_GOLD,
        chargeNeeded: 100,
        chargeMult: 1
    },
    time_warp: {
        id: 'time_warp',
        name: 'Time Warp',
        icon: '⧖',
        description: 'Slows all enemies to 25% speed for 6 seconds.',
        color: '#aa44ff',
        chargeNeeded: 100,
        chargeMult: 2
    },
    missile_storm: {
        id: 'missile_storm',
        name: 'Missile Storm',
        icon: '☄',
        description: 'Launches 16 homing missiles that seek out enemies.',
        color: '#ff4444',
        chargeNeeded: 100,
        chargeMult: 1
    },
    quantum_shift: {
        id: 'quantum_shift',
        name: 'Bullet Reflect',
        icon: '⟲',
        description: 'All enemy bullets bounce back for 6 seconds, damaging enemies.',
        color: '#00ddff',
        chargeNeeded: 100,
        chargeMult: 2
    }
};

/**
 * Player - Controllable ship entity
 */
class Player extends GameObject {
    constructor(x, y, shipId, ultimateId) {
        super(x, y, 64, 64);
        this.tag = 'player';
        this.shipId = shipId;
        this.shipData = SHIP_DATA[shipId] || SHIP_DATA.vanguard;
        this.ultimateId = ultimateId;
        this.ultimateData = ULTIMATE_DATA[ultimateId] || ULTIMATE_DATA.nova_blast;

        // Bonus stats from shop upgrades (additive)
        this.bonusStats = { hp: 0, speed: 0, resist: 0, fireRate: 0 };

        // Compute effective stats
        this.recalculateStats();

        // Combat state
        this.health = this.maxHealth;
        this.fireCooldown = 0;
        this.weaponLevel = 1;
        this.maxWeaponLevel = 5;

        // Weapon heat
        this.heat = 0;
        this.maxHeat = 100;
        this.heatPerShot = 8;
        this.heatCooldownRate = 35;
        this.overheated = false;

        // Invincibility after damage
        this.invincible = false;
        this.invincibleTime = 0;
        this.invincibleDuration = 1.2;
        this.blinkTimer = 0;

        // Power-up system (delegated to PowerUpManager)
        this.powerUps = new PowerUpManager();

        // Ultimate system
        this.ultimateCharge = 0;
        this.ultimateActive = false;
        this.ultimateTimer = 0;

        // Visual
        this.thrusterFlicker = 0;
        this.bankLevel = 0; // -2..+2, smooth banking for left/right movement
        this.tunnelShiftAnimTimer = 0; // >0 = warp-in animation active
    }

    /**
     * Recalculate all derived stats from base + bonus
     */
    recalculateStats() {
        const base = this.shipData.stats;
        const bonus = this.bonusStats;

        const effectiveSpeed = base.speed + bonus.speed;
        const effectiveResist = base.resist + bonus.resist;
        const effectiveFireRate = base.fireRate + bonus.fireRate;

        this.maxHealth = Math.floor(2 + base.hp * 0.8) + bonus.hp; // base 2-10 HP + flat bonus
        this.baseSpeed = 150 + effectiveSpeed * 25;         // 175-400 speed
        this.speed = this.baseSpeed;
        this.resistance = Math.min(0.6, effectiveResist * 0.04); // 0-60% damage reduction
        this.baseFireRate = Math.max(0.08, 0.4 - effectiveFireRate * 0.03); // 0.1-0.37s cooldown
        this.fireRate = this.baseFireRate;
    }

    /**
     * Apply bonus stats from shop and recalculate
     */
    applyBonusStats(bonusStats) {
        this.bonusStats.hp += bonusStats.hp || 0;
        this.bonusStats.speed += bonusStats.speed || 0;
        this.bonusStats.resist += bonusStats.resist || 0;
        this.bonusStats.fireRate += bonusStats.fireRate || 0;
        const oldMaxHealth = this.maxHealth;
        this.recalculateStats();
        // Heal proportionally if max health increased
        if (this.maxHealth > oldMaxHealth) {
            this.health += (this.maxHealth - oldMaxHealth);
        }
    }

    update(deltaTime, game) {
        // Ultimate timer
        this.updateUltimateState(deltaTime, game);

        // Time-based ultimate cooldown: 30 seconds base, affected by Ultimate Engine perk
        // Charge accumulates always EXCEPT during Invincibility ultimate (frozen while active)
        this.updateUltimateCharge(game, deltaTime);

        // Input movement
        this.handleMovementInput(game, deltaTime);

        // Fire cooldown & heat (cool_exhaust perk speeds dissipation)
        this.updateHeatAndCooldown(deltaTime, game);

        // Auto-fire / manual fire
        this.handleFireInput(game);

        // Ultimate activation
        this.activateUltimateIfReady(game);

        // Invincibility
        this.updateInvincibilityState(deltaTime);

        // Power-ups (shield, speed boost, rapid fire, drone, glitch clone, data drain)
        this.powerUps.update(deltaTime, this, game);

        this.thrusterFlicker += deltaTime * 10;
    }

    handleMovementInput(game, deltaTime) {
        const inputDir = game.input.getMovementDirection();
        this.velocity = inputDir.multiply(this.speed);

        // Apply movement
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;

        // Smooth banking interpolation based on horizontal velocity
        const vxNorm = this.speed > 0 ? this.velocity.x / this.speed : 0;
        const targetBank = vxNorm * 2; // maps -1..+1 → -2..+2
        this.bankLevel += (targetBank - this.bankLevel) * Math.min(1, deltaTime * 10);
        this.bankLevel = Math.max(-2, Math.min(2, this.bankLevel));

        // Clamp to screen (logical coordinates)
        this.position.x = Math.max(0, Math.min(game.logicalWidth - this.width, this.position.x));
        this.position.y = Math.max(0, Math.min(game.logicalHeight - this.height, this.position.y));
    }

    updateUltimateCharge(game, deltaTime) {
        if (this.ultimateCharge < 100 && !(this._invincibilityUlt && this.ultimateActive)) {
            const ultMult = this.ultimateData.chargeMult || 1;
            const chargeRate = (100 / 30) * ultMult * (game.perkSystem ? game.perkSystem.getUltChargeMultiplier() : 1);
            this.ultimateCharge = Math.min(100, this.ultimateCharge + chargeRate * deltaTime);
        }
    }

    updateUltimateState(deltaTime, game) {
        if (this.ultimateActive) {
            this.ultimateTimer -= deltaTime;

            // Nova Blast: track animation time
            if (this.ultimateId === 'nova_blast') {
                this._novaTime = (this._novaTime || 0) + deltaTime;
            }

            // Bullet Reflect: track animation time
            if (this.ultimateId === 'quantum_shift' && this._bulletReflectActive) {
                this._bulletReflectTime = (this._bulletReflectTime || 0) + deltaTime;
            }

            // Time Warp: track animation time
            if (this.ultimateId === 'time_warp') {
                this._timeWarpTime = (this._timeWarpTime || 0) + deltaTime;
            }

            if (this.ultimateTimer <= 0) {
                this.endUltimate(game);
            }
        }
    }

    updateInvincibilityState(deltaTime) {
        if (this.tunnelShiftAnimTimer > 0) {
            this.tunnelShiftAnimTimer -= deltaTime;
        }
        if (this.invincible) {
            this.invincibleTime -= deltaTime;
            this.blinkTimer += deltaTime;
            if (this.invincibleTime <= 0) {
                this.invincible = false;
                this.alpha = 1;
            } else {
                this.alpha = Math.sin(this.blinkTimer * 20) > 0 ? 1 : 0.3;
            }
        }
    }

    activateUltimateIfReady(game) {
        if (game.input.isUltimatePressed() && this.ultimateCharge >= 100 && !this.ultimateActive) {
            this.activateUltimate(game);
        }
    }

    handleFireInput(game) {
        if (game.input.isFiring() && this.fireCooldown <= 0 && !this.overheated) {
            this.fire(game);
            this.fireCooldown = this.fireRate;
            const heatShotMult = game.perkSystem ? game.perkSystem.getHeatPerShotMult() : 1;
            this.heat += this.heatPerShot * (1 + (this.weaponLevel - 1) * 0.3) * heatShotMult;
            if (this.heat >= this.maxHeat) {
                this.heat = this.maxHeat;
                this.overheated = true;
            }
        }
    }

    updateHeatAndCooldown(deltaTime, game) {
        this.fireCooldown -= deltaTime;
        if (this.heat > 0) {
            const heatMult = game.perkSystem ? game.perkSystem.getHeatDissipationMult() : 1;
            this.heat -= this.heatCooldownRate * heatMult * deltaTime;
            if (this.heat < 0) this.heat = 0;
        }
        if (this.overheated && this.heat < 30) {
            this.overheated = false;
        }
    }

    fire(game) {
        const bulletSpeed = -500;
        const centerX = this.position.x + this.width / 2;
        const topY = this.position.y;
        const doubleBarrel = game.perkSystem?.hasDoubleBarrel();

        game.sound.playShoot();

        this.spawnBulletsBasedOnWeaponLevel(game, centerX, topY, bulletSpeed, doubleBarrel);

        // ── Packet Burst: every Nth shot fires 3 extra projectiles ──
        if (game.perkSystem) {
            const burstInterval = game.perkSystem.getPacketBurstInterval();
            if (burstInterval > 0) {
                game.perkSystem.packetBurstCounter++;
                if (game.perkSystem.packetBurstCounter >= burstInterval) {
                    game.perkSystem.packetBurstCounter = 0;
                    game.spawnBullet(centerX - 14, topY + 4, -60, bulletSpeed * 0.95, 'player');
                    game.spawnBullet(centerX, topY - 2, 0, bulletSpeed * 1.1, 'player');
                    game.spawnBullet(centerX + 14, topY + 4, 60, bulletSpeed * 0.95, 'player');
                }
            }
        }
    }

    spawnBulletsBasedOnWeaponLevel(game, centerX, topY, bulletSpeed, doubleBarrel) {
        switch (this.weaponLevel) {
            case 1:
                game.spawnBullet(centerX - 6, topY, 0, bulletSpeed, 'player');
                if (doubleBarrel) game.spawnBullet(centerX + 6, topY + 3, 0, bulletSpeed, 'player');
                break;
            case 2:
                game.spawnBullet(centerX - 16, topY + 5, 0, bulletSpeed, 'player');
                game.spawnBullet(centerX + 6, topY + 5, 0, bulletSpeed, 'player');
                if (doubleBarrel) {
                    game.spawnBullet(centerX - 10, topY + 8, 0, bulletSpeed, 'player');
                    game.spawnBullet(centerX + 12, topY + 8, 0, bulletSpeed, 'player');
                }
                break;
            case 3:
                game.spawnBullet(centerX - 6, topY, 0, bulletSpeed, 'player');
                game.spawnBullet(centerX - 22, topY + 10, -50, bulletSpeed, 'player');
                game.spawnBullet(centerX + 12, topY + 10, 50, bulletSpeed, 'player');
                if (doubleBarrel) {
                    game.spawnBullet(centerX + 6, topY + 2, 0, bulletSpeed, 'player');
                }
                break;
            case 4:
                game.spawnBullet(centerX - 22, topY + 5, -30, bulletSpeed, 'player');
                game.spawnBullet(centerX - 8, topY, 0, bulletSpeed, 'player');
                game.spawnBullet(centerX + 4, topY, 0, bulletSpeed, 'player');
                game.spawnBullet(centerX + 18, topY + 5, 30, bulletSpeed, 'player');
                if (doubleBarrel) {
                    game.spawnBullet(centerX - 15, topY + 8, -15, bulletSpeed, 'player');
                    game.spawnBullet(centerX + 11, topY + 8, 15, bulletSpeed, 'player');
                }
                break;
            case 5:
                game.spawnBullet(centerX - 6, topY, 0, bulletSpeed * 1.2, 'player');
                game.spawnBullet(centerX - 20, topY + 5, -40, bulletSpeed, 'player');
                game.spawnBullet(centerX + 10, topY + 5, 40, bulletSpeed, 'player');
                game.spawnBullet(centerX - 30, topY + 10, -80, bulletSpeed * 0.9, 'player');
                game.spawnBullet(centerX + 20, topY + 10, 80, bulletSpeed * 0.9, 'player');
                if (doubleBarrel) {
                    game.spawnBullet(centerX + 6, topY + 2, 0, bulletSpeed * 1.1, 'player');
                }
                break;
        }
    }

    takeDamage(amount, game) {
        if (this._isDamageBlocked(game)) return false;

        // Apply resistance
        const effectiveDamage = Math.max(1, Math.round(amount * (1 - this.resistance)));
        this.health -= effectiveDamage;

        // Invincibility frames
        this.invincible = true;
        this.invincibleTime = this.invincibleDuration;
        this.blinkTimer = 0;

        this._emitDamageEffects(game);

        // Downgrade weapon on hit (lose 1 multi-shot level)
        if (this.weaponLevel > 1) {
            this.weaponLevel--;
        }

        // ── Emergency Protocol: prevent lethal damage, grant 3s invincibility + slow-mo ──
        if (this.health <= 0 && this._tryEmergencyProtocol(game)) {
            return false;
        }

        // ── Tunnel Shift: teleport instead of dying (fallback if Emergency already used) ──
        if (this.health <= 0 && this._tryTunnelShift(game)) {
            return false;
        }

        if (this.health <= 0) {
            this.health = 0;
            this.destroy();
            return true; // died
        }

        // ── Glitch Dash: on-hit invuln + speed boost ──
        this._tryGlitchDash(game);

        return false;
    }

    _isDamageBlocked(game) {
        if (this.invincible || this.shieldActive) {
            if (this.shieldActive) {
                game.sound.playShieldHit();
                game.particles.emit(
                    this.position.x + this.width / 2,
                    this.position.y + this.height / 2,
                    'shield', 5
                );
            }
            return true;
        }
        // Invincibility ultimate blocks all damage
        return this.ultimateActive && this.ultimateId === 'shield_dome';
    }

    _emitDamageEffects(game) {
        game.sound.playDamage();
        game.postProcessing.shake(6, 0.15);
        game.postProcessing.flash({ r: 255, g: 50, b: 50 }, 0.2);
        game.particles.emit(
            this.position.x + this.width / 2,
            this.position.y + this.height / 2,
            'hit', 8
        );
    }

    _tryEmergencyProtocol(game) {
        if (!game.perkSystem?.hasEmergencyProtocol()) return false;

        if (this.health <= 0) this.health = 1;
        game.perkSystem.emergencyUsedThisLevel = true;
        this.invincible = true;
        this.invincibleTime = 3;
        this.blinkTimer = 0;
        if (game.perkEffectsManager) {
            game.perkEffectsManager._emergencySlowTimer = 3;
        }
        game.timeScale = 0.4;
        game.postProcessing.flash({ r: 255, g: 50, b: 50 }, 0.3);
        game.postProcessing.shake(10, 0.5);
        game.particles.emit(
            this.position.x + this.width / 2,
            this.position.y + this.height / 2,
            'explosion', 20
        );
        return true;
    }

    _tryGlitchDash(game) {
        if (!game.perkSystem || game.perkSystem.getGlitchDashDuration() <= 0) return;

        const dur = game.perkSystem.getGlitchDashDuration();
        game.perkSystem.glitchDashTimer = dur;
        this.invincible = true;
        this.invincibleTime = dur;
        this.blinkTimer = 0;
        game.postProcessing.flash({ r: 0, g: 255, b: 200 }, 0.15);
    }

    _tryTunnelShift(game) {
        if (!game.perkSystem?.hasTunnelShift()) return false;

        game.perkSystem.tunnelShiftUsed = true;
        this.health = 1;

        // Departure VFX at old position
        const oldCx = this.position.x + this.width / 2;
        const oldCy = this.position.y + this.height / 2;
        game.particles.emit(oldCx, oldCy, 'tunnelWarpOut', 20);

        // Teleport to random safe position in bottom third
        const margin = this.width;
        const maxX = game.logicalWidth - this.width - margin;
        const minY = game.logicalHeight * 0.6;
        const maxY = game.logicalHeight - this.height - margin;
        this.position.x = margin + Math.random() * maxX;
        this.position.y = minY + Math.random() * (maxY - minY);

        // Arrival VFX at new position
        const newCx = this.position.x + this.width / 2;
        const newCy = this.position.y + this.height / 2;
        game.particles.emit(newCx, newCy, 'tunnelWarpIn', 18);

        this.invincible = true;
        this.invincibleTime = 1.5;
        this.blinkTimer = 0;
        this.tunnelShiftAnimTimer = 0.45;

        game.postProcessing.flash({ r: 0, g: 220, b: 255 }, 0.4);
        game.postProcessing.shake(8, 0.3);
        return true;
    }

    // ===== ULTIMATE ABILITIES =====

    activateUltimate(game) {
        this.ultimateCharge = 0;
        this.ultimateActive = true;
        game.sound.playUltimate();
        game.postProcessing.flash({ r: 255, g: 215, b: 0 }, 0.3);

        switch (this.ultimateId) {
            case 'nova_blast':
                this.ultimateTimer = 1.2;
                this._novaTime = 0; // track animation progress
                // Damage all enemies on screen
                for (const enemy of game.enemies) {
                    if (enemy.active && !enemy._isAlly) {
                        enemy.takeDamage(10, game);
                        game.particles.emit(enemy.position.x + enemy.width / 2, enemy.position.y + enemy.height / 2, 'explosion', 15);
                    }
                }
                // Damage mini-boss
                if (game.miniBoss?.active && !game.miniBoss.entering) {
                    game.miniBoss.takeDamage(10, game);
                    game.particles.emit(game.miniBoss.position.x + game.miniBoss.width / 2, game.miniBoss.position.y + game.miniBoss.height / 2, 'explosion', 15);
                }
                // Damage boss
                if (game.boss?.active && !game.boss.entering) {
                    game.boss.takeDamage(10, game);
                    game.particles.emit(game.boss.position.x + game.boss.width / 2, game.boss.position.y + game.boss.height / 2, 'explosion', 15);
                }
                game.postProcessing.shake(15, 0.8);
                game.postProcessing.flash({ r: 255, g: 120, b: 0 }, 0.6);
                break;

            case 'shield_dome':
                // Invincibility: 6 seconds, charge is frozen during effect
                this.ultimateTimer = 6;
                this.invincible = true;
                this.invincibleTime = 6;
                this._invincibilityUlt = true; // flag for visual + charge freeze
                game.postProcessing.flash({ r: 255, g: 215, b: 0 }, 0.5);
                game.postProcessing.shake(6, 0.3);
                break;

            case 'time_warp':
                this.ultimateTimer = 6;
                this._timeWarpTime = 0;
                game.timeScale = 0.25;
                game.postProcessing.flash({ r: 120, g: 40, b: 255 }, 0.4);
                game.postProcessing.shake(4, 0.2);
                break;

            case 'missile_storm':
                this.ultimateTimer = 1.2;
                // Spawn 16 homing missiles with shorter delay
                for (let i = 0; i < 16; i++) {
                    const angle = -Math.PI / 2 + (i - 7.5) * 0.12;
                    setTimeout(() => {
                        if (game.player?.active) {
                            game.spawnHomingMissile(
                                this.position.x + this.width / 2,
                                this.position.y,
                                angle
                            );
                        }
                    }, i * 40); // 40ms instead of 60ms
                }
                break;

            case 'quantum_shift':
                // Bullet Reflect: 6 seconds of reflecting enemy bullets
                this.ultimateTimer = 6;
                this._bulletReflectActive = true;
                this._bulletReflectTime = 0;
                game.postProcessing.flash({ r: 0, g: 200, b: 255 }, 0.4);
                game.postProcessing.shake(6, 0.3);
                break;
        }
    }

    endUltimate(game) {
        this.ultimateActive = false;
        if (this.ultimateId === 'time_warp') {
            // Only reset timeScale if emergency protocol slow-mo isn't active
            if (!game.perkEffectsManager || game.perkEffectsManager._emergencySlowTimer <= 0) {
                game.timeScale = 1;
            }
        }
        if (this.ultimateId === 'shield_dome') {
            this._invincibilityUlt = false;
            // Don't cancel invincible immediately; let natural timer run out
        }
        if (this.ultimateId === 'quantum_shift') {
            this._bulletReflectActive = false;
        }
        this._novaTime = 0;
        this._timeWarpTime = 0;
    }

    // ── Power-up state delegation (backward compat for Renderer, PowerUp, Perks, Game) ──

    get shieldActive() { return this.powerUps.isActive('shield'); }
    set shieldActive(v) { this.powerUps.get('shield').active = v; }
    get shieldTime() { return this.powerUps.get('shield').time; }
    set shieldTime(v) { this.powerUps.get('shield').time = v; }

    get speedBoost() { return this.powerUps.isActive('speed'); }
    set speedBoost(v) { this.powerUps.get('speed').active = v; }
    get speedBoostTime() { return this.powerUps.get('speed').time; }
    set speedBoostTime(v) { this.powerUps.get('speed').time = v; }

    get rapidFire() { return this.powerUps.isActive('rapid'); }
    set rapidFire(v) { this.powerUps.get('rapid').active = v; }
    get rapidFireTime() { return this.powerUps.get('rapid').time; }
    set rapidFireTime(v) { this.powerUps.get('rapid').time = v; }

    get droneActive() { return this.powerUps.isActive('drone_companion'); }
    set droneActive(v) { this.powerUps.get('drone_companion').active = v; }
    get droneTime() { return this.powerUps.get('drone_companion').time; }
    set droneTime(v) { this.powerUps.get('drone_companion').time = v; }
    get droneFireTimer() { return this.powerUps.get('drone_companion').fireTimer; }
    set droneFireTimer(v) { this.powerUps.get('drone_companion').fireTimer = v; }
    get droneAngle() { return this.powerUps.get('drone_companion').angle; }
    set droneAngle(v) { this.powerUps.get('drone_companion').angle = v; }

    get glitchCloneActive() { return this.powerUps.isActive('glitch_clone'); }
    set glitchCloneActive(v) { this.powerUps.get('glitch_clone').active = v; }
    get glitchCloneTime() { return this.powerUps.get('glitch_clone').time; }
    set glitchCloneTime(v) { this.powerUps.get('glitch_clone').time = v; }
    get glitchCloneFireTimer() { return this.powerUps.get('glitch_clone').fireTimer; }
    set glitchCloneFireTimer(v) { this.powerUps.get('glitch_clone').fireTimer = v; }
    get glitchCloneAngle() { return this.powerUps.get('glitch_clone').angle; }
    set glitchCloneAngle(v) { this.powerUps.get('glitch_clone').angle = v; }

    get dataDrainActive() { return this.powerUps.isActive('data_drain'); }
    set dataDrainActive(v) { this.powerUps.get('data_drain').active = v; }
    get dataDrainTime() { return this.powerUps.get('data_drain').time; }
    set dataDrainTime(v) { this.powerUps.get('data_drain').time = v; }

    render(ctx, assets, perkSystem) {
        PlayerRenderer.render(ctx, this, assets, perkSystem);
    }
}

export { Player, SHIP_DATA, ULTIMATE_DATA };
