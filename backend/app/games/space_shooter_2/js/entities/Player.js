import GameObject from './GameObject.js';

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
        color: '#4488ff',
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
        icon: '💥',
        description: 'Releases a devastating explosion that damages all enemies on screen.',
        color: '#ff6600',
        chargeNeeded: 100
    },
    shield_dome: {
        id: 'shield_dome',
        name: 'Shield Dome',
        icon: '🛡️',
        description: 'Deploys an invincible energy dome for 6 seconds.',
        color: '#44aaff',
        chargeNeeded: 100
    },
    time_warp: {
        id: 'time_warp',
        name: 'Time Warp',
        icon: '⏳',
        description: 'Slows all enemies to 25% speed for 5 seconds.',
        color: '#aa44ff',
        chargeNeeded: 100
    },
    missile_storm: {
        id: 'missile_storm',
        name: 'Missile Storm',
        icon: '🚀',
        description: 'Launches 12 homing missiles that seek out enemies.',
        color: '#ff4444',
        chargeNeeded: 100
    },
    quantum_shift: {
        id: 'quantum_shift',
        name: 'Quantum Shift',
        icon: '⚡',
        description: 'Teleport forward dealing massive damage to all enemies in path.',
        color: '#ffdd00',
        chargeNeeded: 100
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

        // Shield from power-up
        this.shieldActive = false;
        this.shieldTime = 0;

        // Power-up temporaries
        this.speedBoost = false;
        this.speedBoostTime = 0;
        this.rapidFire = false;
        this.rapidFireTime = 0;

        // Ultimate system
        this.ultimateCharge = 0;
        this.ultimateActive = false;
        this.ultimateTimer = 0;

        // Visual
        this.thrusterFlicker = 0;
    }

    /**
     * Recalculate all derived stats from base + bonus
     */
    recalculateStats() {
        const base = this.shipData.stats;
        const bonus = this.bonusStats;

        const effectiveHP = base.hp + bonus.hp;
        const effectiveSpeed = base.speed + bonus.speed;
        const effectiveResist = base.resist + bonus.resist;
        const effectiveFireRate = base.fireRate + bonus.fireRate;

        this.maxHealth = Math.floor(2 + effectiveHP * 0.8); // 2-10 HP range
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
        if (this.ultimateActive) {
            this.ultimateTimer -= deltaTime;
            if (this.ultimateTimer <= 0) {
                this.endUltimate(game);
            }
        }

        // Shield timer
        if (this.shieldActive) {
            this.shieldTime -= deltaTime;
            if (this.shieldTime <= 0) {
                this.shieldActive = false;
            }
        }

        // Input movement
        const inputDir = game.input.getMovementDirection();
        this.velocity = inputDir.multiply(this.speed);

        // Apply movement
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;

        // Clamp to screen
        this.position.x = Math.max(0, Math.min(game.canvas.width - this.width, this.position.x));
        this.position.y = Math.max(0, Math.min(game.canvas.height - this.height, this.position.y));

        // Fire cooldown & heat (cool_exhaust perk speeds dissipation)
        this.fireCooldown -= deltaTime;
        if (this.heat > 0) {
            const heatMult = game.perkSystem ? game.perkSystem.getHeatDissipationMult() : 1;
            this.heat -= this.heatCooldownRate * heatMult * deltaTime;
            if (this.heat < 0) this.heat = 0;
        }
        if (this.overheated && this.heat < 30) {
            this.overheated = false;
        }

        // Auto-fire / manual fire
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

        // Ultimate activation
        if (game.input.isUltimatePressed() && this.ultimateCharge >= 100 && !this.ultimateActive) {
            this.activateUltimate(game);
        }

        // Invincibility
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

        // Speed boost
        if (this.speedBoost) {
            this.speedBoostTime -= deltaTime;
            if (this.speedBoostTime <= 0) {
                this.speedBoost = false;
                this.speed = this.baseSpeed;
            }
        }

        // Rapid fire
        if (this.rapidFire) {
            this.rapidFireTime -= deltaTime;
            if (this.rapidFireTime <= 0) {
                this.rapidFire = false;
                this.fireRate = this.baseFireRate;
            }
        }

        this.thrusterFlicker += deltaTime * 10;
    }

    fire(game) {
        const bulletSpeed = -500;
        const centerX = this.position.x + this.width / 2;
        const topY = this.position.y;
        const doubleBarrel = game.perkSystem && game.perkSystem.hasDoubleBarrel();

        game.sound.playShoot();

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
        if (this.invincible || this.shieldActive) {
            if (this.shieldActive) {
                game.sound.playShieldHit();
                game.particles.emit(
                    this.position.x + this.width / 2,
                    this.position.y + this.height / 2,
                    'shield', 5
                );
            }
            return false;
        }
        if (this.ultimateActive && this.ultimateId === 'shield_dome') return false;

        // Apply resistance
        const effectiveDamage = Math.max(1, Math.round(amount * (1 - this.resistance)));
        this.health -= effectiveDamage;

        // Invincibility frames
        this.invincible = true;
        this.invincibleTime = this.invincibleDuration;
        this.blinkTimer = 0;

        game.sound.playDamage();
        game.postProcessing.shake(6, 0.15);
        game.postProcessing.flash({ r: 255, g: 50, b: 50 }, 0.2);
        game.particles.emit(
            this.position.x + this.width / 2,
            this.position.y + this.height / 2,
            'hit', 8
        );

        // Downgrade weapon on hit (lose 1 multi-shot level)
        if (this.weaponLevel > 1) {
            this.weaponLevel--;
        }

        if (this.health <= 0) {
            this.health = 0;
            this.destroy();
            return true; // died
        }
        return false;
    }

    // ===== ULTIMATE ABILITIES =====

    activateUltimate(game) {
        this.ultimateCharge = 0;
        this.ultimateActive = true;
        game.sound.playUltimate();
        game.postProcessing.flash({ r: 255, g: 215, b: 0 }, 0.3);

        switch (this.ultimateId) {
            case 'nova_blast':
                this.ultimateTimer = 0.5;
                // Damage all enemies on screen
                for (const enemy of game.enemies) {
                    if (enemy.active) {
                        enemy.takeDamage(10, game);
                        game.particles.emit(enemy.position.x + enemy.width / 2, enemy.position.y + enemy.height / 2, 'explosion', 15);
                    }
                }
                // Damage mini-boss
                if (game.miniBoss && game.miniBoss.active && !game.miniBoss.entering) {
                    game.miniBoss.takeDamage(10, game);
                    game.particles.emit(game.miniBoss.position.x + game.miniBoss.width / 2, game.miniBoss.position.y + game.miniBoss.height / 2, 'explosion', 15);
                }
                // Damage boss
                if (game.boss && game.boss.active && !game.boss.entering) {
                    game.boss.takeDamage(10, game);
                    game.particles.emit(game.boss.position.x + game.boss.width / 2, game.boss.position.y + game.boss.height / 2, 'explosion', 15);
                }
                game.postProcessing.shake(12, 0.4);
                // Nova visual ring will be rendered in render()
                break;

            case 'shield_dome':
                this.ultimateTimer = 6;
                break;

            case 'time_warp':
                this.ultimateTimer = 5;
                game.timeScale = 0.25;
                break;

            case 'missile_storm':
                this.ultimateTimer = 1;
                // Spawn 12 homing missiles
                for (let i = 0; i < 12; i++) {
                    const angle = -Math.PI / 2 + (i - 5.5) * 0.15;
                    setTimeout(() => {
                        if (game.player && game.player.active) {
                            game.spawnHomingMissile(
                                this.position.x + this.width / 2,
                                this.position.y,
                                angle
                            );
                        }
                    }, i * 60);
                }
                break;

            case 'quantum_shift':
                this.ultimateTimer = 0.3;
                this.invincible = true;
                this.invincibleTime = 0.5;
                // Teleport forward and damage in path
                const startY = this.position.y;
                const endY = 50;
                for (const enemy of game.enemies) {
                    if (enemy.active &&
                        Math.abs(enemy.position.x + enemy.width / 2 - this.position.x - this.width / 2) < 60 &&
                        enemy.position.y > endY && enemy.position.y < startY) {
                        enemy.takeDamage(8, game);
                        game.particles.emit(enemy.position.x + enemy.width / 2, enemy.position.y + enemy.height / 2, 'spark', 10);
                    }
                }
                // Also damage mini-boss in path
                if (game.miniBoss && game.miniBoss.active && !game.miniBoss.entering) {
                    const mbCX = game.miniBoss.position.x + game.miniBoss.width / 2;
                    const mbCY = game.miniBoss.position.y + game.miniBoss.height / 2;
                    if (Math.abs(mbCX - this.position.x - this.width / 2) < 80 && mbCY > endY && mbCY < startY) {
                        game.miniBoss.takeDamage(8, game);
                        game.particles.emit(mbCX, mbCY, 'spark', 10);
                    }
                }
                // Teleport effect
                game.particles.emit(this.position.x + this.width / 2, this.position.y + this.height / 2, 'spark', 20);
                this.position.y = endY;
                game.particles.emit(this.position.x + this.width / 2, this.position.y + this.height / 2, 'spark', 20);
                break;
        }
    }

    endUltimate(game) {
        this.ultimateActive = false;
        if (this.ultimateId === 'time_warp') {
            game.timeScale = 1;
        }
    }

    render(ctx, assets, perkSystem) {
        if (!this.active) return;

        ctx.save();
        ctx.globalAlpha = this.alpha;

        const cx = this.position.x + this.width / 2;
        const cy = this.position.y + this.height / 2;
        const by = this.position.y + this.height;
        const flicker = 0.7 + 0.3 * Math.sin(this.thrusterFlicker);

        // ── ENGINE FLAMES (bigger with speed upgrades) ──
        const flameCount = 2 + Math.min(2, Math.floor(this.bonusStats.speed / 2));
        const flameSize = 16 + this.bonusStats.speed * 2;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const shipColor = this.shipData.color;

        for (let i = 0; i < flameCount; i++) {
            const offsetX = flameCount <= 2
                ? (i === 0 ? -12 : 12)
                : (i - (flameCount - 1) / 2) * 16;
            const fx = cx + offsetX;
            const fy = by + 2;
            const fh = flameSize * flicker;
            const fw = 6 + i % 2 * 2;

            // Outer flame
            ctx.globalAlpha = 0.4 * flicker;
            const outerGrad = ctx.createLinearGradient(fx, fy, fx, fy + fh);
            outerGrad.addColorStop(0, shipColor);
            outerGrad.addColorStop(0.5, 'rgba(255,200,50,0.6)');
            outerGrad.addColorStop(1, 'rgba(255,100,0,0)');
            ctx.fillStyle = outerGrad;
            ctx.beginPath();
            ctx.moveTo(fx - fw, fy);
            ctx.bezierCurveTo(fx - fw * 0.8, fy + fh * 0.4, fx - 1, fy + fh * 0.7, fx, fy + fh);
            ctx.bezierCurveTo(fx + 1, fy + fh * 0.7, fx + fw * 0.8, fy + fh * 0.4, fx + fw, fy);
            ctx.closePath();
            ctx.fill();

            // Inner white core
            ctx.globalAlpha = 0.6 * flicker;
            const coreGrad = ctx.createLinearGradient(fx, fy, fx, fy + fh * 0.6);
            coreGrad.addColorStop(0, '#fff');
            coreGrad.addColorStop(1, 'rgba(255,255,200,0)');
            ctx.fillStyle = coreGrad;
            ctx.beginPath();
            ctx.moveTo(fx - fw * 0.4, fy);
            ctx.quadraticCurveTo(fx, fy + fh * 0.5, fx + fw * 0.4, fy);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        // ── SHIP SPRITE ──
        const sprite = assets.getSprite(`ship_${this.shipId}`);
        const spriteSize = this.width + 24; // 88px render from 128px canvas
        const spriteX = this.position.x - 12;
        const spriteY = this.position.y - 12;
        if (sprite) {
            ctx.drawImage(sprite, spriteX, spriteY, spriteSize, spriteSize);
        }

        // ── PERK DEVICE OVERLAYS ──
        // Concentric-ring layout: symmetric hardpoints around the ship
        if (perkSystem) {
            const devSlots = {
                // ═══ SPINE (center axis, top to bottom) ═══
                piercing_rounds:    { dx:   0, dy:-26, c:'o' },   // nose tip
                thorns:             { dx:   0, dy: -4, c:'d' },   // cockpit hull
                orbital_drone:      { dx:   0, dy: 12, c:'u' },   // belly
                ultimate_engine:    { dx:   0, dy: 26, c:'u' },   // tail

                // ═══ INNER RING (±12, hull-mounted) ═══
                critical_strike:    { dx:  12, dy:-14, c:'o' },   // R fwd inner
                explosive_rounds:   { dx: -12, dy:-14, c:'o' },   // L fwd inner
                auto_shield:        { dx:  12, dy:  4, c:'d' },   // R mid inner
                phase_dodge:        { dx: -12, dy:  4, c:'d' },   // L mid inner
                combo_master:       { dx:  12, dy: 18, c:'u' },   // R aft inner
                cool_exhaust:       { dx: -12, dy: 18, c:'u' },   // L aft inner

                // ═══ OUTER RING (±26, wing hardpoints) ═══
                double_barrel:      { dx:  26, dy:-18, c:'o' },   // R fwd wing
                glass_cannon:       { dx: -26, dy:-18, c:'o' },   // L fwd wing
                chain_lightning:    { dx:  26, dy: -6, c:'o' },   // R mid-fwd wing
                vampire_rounds:     { dx: -26, dy: -6, c:'o' },   // L mid-fwd wing
                emergency_protocol: { dx:  26, dy:  6, c:'d' },   // R mid wing
                damage_converter:   { dx: -26, dy:  6, c:'d' },   // L mid wing
                fortress_mode:      { dx:  26, dy: 16, c:'d' },   // R aft wing
                magnet_field:       { dx: -26, dy: 16, c:'u' },   // L aft wing
                lucky_drops:        { dx:  26, dy: 26, c:'u' },   // R tail wing
                point_multiplier:   { dx: -26, dy: 26, c:'u' },   // L tail wing
            };

            // Category glow colors: offensive=red, defensive=blue, utility=green
            const glowTint = { o: '#ff5030', d: '#3388ff', u: '#33dd77' };

            const activePerks = perkSystem.getActivePerks();
            const t = Date.now() * 0.002;

            // Draw outer ring first (behind inner), then inner, then spine
            const sorted = activePerks
                .filter(p => devSlots[p.id])
                .sort((a, b) => {
                    const sa = devSlots[a.id], sb = devSlots[b.id];
                    return (sb.dx * sb.dx + sb.dy * sb.dy)
                         - (sa.dx * sa.dx + sa.dy * sa.dy);
                });

            for (const { id, stacks } of sorted) {
                const slot = devSlots[id];
                const spriteKey = `perk_${id}_${Math.min(stacks, 3)}`;
                const devSprite = assets.getSprite(spriteKey);
                if (!devSprite) continue;

                const float = Math.sin(t + slot.dx * 0.07 + slot.dy * 0.05) * 0.8;
                const devCx = cx + slot.dx;
                const devCy = cy + slot.dy + float;

                // Category-colored glow halo
                ctx.save();
                ctx.shadowColor = glowTint[slot.c] || '#fff';
                ctx.shadowBlur = 6;
                ctx.globalAlpha = 0.9;
                ctx.drawImage(devSprite,
                    devCx - devSprite.width / 2,
                    devCy - devSprite.height / 2);
                ctx.restore();
            }
        }

        // ── WEAPON LEVEL indicator (small dots near nose) ──
        if (this.weaponLevel > 1) {
            ctx.save();
            ctx.globalAlpha = 0.8;
            const dotCount = this.weaponLevel - 1;
            const dotSpacing = 6;
            const startX = cx - (dotCount - 1) * dotSpacing / 2;
            const dotY = this.position.y - 4;
            for (let i = 0; i < dotCount; i++) {
                ctx.fillStyle = '#ffdd44';
                ctx.shadowColor = '#ffdd44';
                ctx.shadowBlur = 4;
                ctx.beginPath();
                ctx.arc(startX + i * dotSpacing, dotY, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // ── SHIELD VISUAL ──
        if (this.shieldActive || (this.ultimateActive && this.ultimateId === 'shield_dome')) {
            ctx.save();
            const now = Date.now();
            const shieldPulse = 0.45 + 0.2 * Math.sin(now * 0.005);
            const isUlt = this.ultimateActive && this.ultimateId === 'shield_dome';
            const shieldColor = isUlt ? '#ffd700' : '#44aaff';
            const shieldColorInner = isUlt ? 'rgba(255,215,0,' : 'rgba(68,170,255,';
            const shieldR = 54;

            // Outer glow ring
            ctx.globalAlpha = shieldPulse;
            ctx.strokeStyle = shieldColor;
            ctx.lineWidth = 3;
            ctx.shadowColor = shieldColor;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(cx, cy, shieldR, 0, Math.PI * 2);
            ctx.stroke();

            // Inner fill gradient
            const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, shieldR);
            innerGrad.addColorStop(0, shieldColorInner + '0.0)');
            innerGrad.addColorStop(0.6, shieldColorInner + '0.04)');
            innerGrad.addColorStop(1, shieldColorInner + '0.12)');
            ctx.globalAlpha = shieldPulse;
            ctx.fillStyle = innerGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, shieldR, 0, Math.PI * 2);
            ctx.fill();

            // Rotating arc segments (energy flow)
            ctx.shadowBlur = 8;
            ctx.lineWidth = 2;
            const arcCount = 3;
            for (let i = 0; i < arcCount; i++) {
                const aStart = (i * Math.PI * 2 / arcCount) + now * 0.003;
                const aEnd = aStart + Math.PI * 0.4;
                ctx.globalAlpha = shieldPulse * 0.7;
                ctx.beginPath();
                ctx.arc(cx, cy, shieldR - 3, aStart, aEnd);
                ctx.stroke();
            }

            // Hexagonal grid overlay
            ctx.shadowBlur = 0;
            ctx.globalAlpha = shieldPulse * 0.4;
            ctx.lineWidth = 1;
            for (let i = 0; i < 6; i++) {
                const a = i * Math.PI / 3 + now * 0.001;
                const hx = cx + Math.cos(a) * 40;
                const hy = cy + Math.sin(a) * 40;
                ctx.beginPath();
                for (let j = 0; j < 6; j++) {
                    const ha = j * Math.PI / 3;
                    const px = hx + Math.cos(ha) * 7;
                    const py = hy + Math.sin(ha) * 7;
                    j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.stroke();
            }

            // Shield about to expire warning — blink faster in last 2s
            if (this.shieldActive && this.shieldTime <= 2) {
                const blinkRate = 0.5 + 0.5 * Math.sin(now * 0.02);
                ctx.globalAlpha = blinkRate * 0.3;
                ctx.strokeStyle = '#ff6644';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(cx, cy, shieldR + 4, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.restore();
        }

        // ── THORNS VISUAL ──
        if (perkSystem && perkSystem.hasThorns()) {
            ctx.save();
            const thornCount = 10;
            const baseR = 38;
            const spikeLen = 16;
            const rotBase = perkSystem.thornsAngle;
            const tTime = perkSystem.thornsTime;
            const pulse = 0.6 + 0.3 * Math.sin(tTime * 4);

            ctx.lineWidth = 2;
            ctx.lineCap = 'round';

            for (let i = 0; i < thornCount; i++) {
                const angle = rotBase + (i / thornCount) * Math.PI * 2;
                const wobble = Math.sin(tTime * 6 + i * 1.2) * 3;
                const innerR = baseR + wobble;
                const outerR = innerR + spikeLen;

                const ix = cx + Math.cos(angle) * innerR;
                const iy = cy + Math.sin(angle) * innerR;
                const ox = cx + Math.cos(angle) * outerR;
                const oy = cy + Math.sin(angle) * outerR;

                // Spike line
                ctx.globalAlpha = pulse * 0.7;
                ctx.strokeStyle = '#aadd55';
                ctx.shadowColor = '#88ff33';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.moveTo(ix, iy);
                ctx.lineTo(ox, oy);
                ctx.stroke();

                // Bright tip
                ctx.globalAlpha = pulse;
                ctx.fillStyle = '#eeffaa';
                ctx.beginPath();
                ctx.arc(ox, oy, 1.8, 0, Math.PI * 2);
                ctx.fill();
            }

            // Base ring glow
            ctx.globalAlpha = pulse * 0.25;
            ctx.strokeStyle = '#88cc44';
            ctx.shadowColor = '#66ff22';
            ctx.shadowBlur = 10;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        }

        // ── HEAT BAR (visible when heat > 40%) ──
        if (this.heat > 40) {
            const barW = 40;
            const barH = 4;
            const barX = cx - barW / 2;
            const barY = this.position.y - 12;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW, barH, 2);
            ctx.fill();
            ctx.stroke();
            const heatPct = this.heat / this.maxHeat;
            const heatGrad = ctx.createLinearGradient(barX, barY, barX + barW * heatPct, barY);
            heatGrad.addColorStop(0, this.overheated ? '#ff2222' : '#ffaa00');
            heatGrad.addColorStop(1, this.overheated ? '#ff4444' : '#ff6600');
            ctx.fillStyle = heatGrad;
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW * heatPct, barH, 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

export { Player, SHIP_DATA, ULTIMATE_DATA };
