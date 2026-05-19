import { CONFIG } from '../config.js';
import { Boss } from './Boss.js';
import { MathUtils } from '../utils.js';

/**
 * World Boss class - themed boss per dimension with unique visuals and combat
 */
export class WorldBoss extends Boss {
    constructor(x, y, worldConfig, difficultyMult = {}) {
        super(x, y, difficultyMult);

        // Override with world boss config
        this.worldBossConfig = worldConfig;
        this.bossName = worldConfig.name;
        this.bossIcon = worldConfig.icon;
        this.color = worldConfig.color;
        this.auraBaseColor = worldConfig.auraColor;
        this.bossShape = worldConfig.shape || 'crown';
        this.abilities = worldConfig.abilities || ['charge', 'summon', 'aoe', 'shoot'];

        // Apply world-specific size and stats
        if (worldConfig.size) this.size = worldConfig.size;
        this.maxHealth *= (worldConfig.healthMult || 1.2);
        this.health = this.maxHealth;
        this.speed *= (worldConfig.speedMult || 1);
        this.spriteScale = this.size * 1.8;

        // World-specific ability state
        this.specialTimer = 0;
        this.specialCooldown = 4000;
        this.fireRingActive = false;
        this.iceStormActive = false;
        this.laserSweepAngle = 0;
        this.laserSweepActive = false;
        this.voidPullActive = false;

        // Eruption zones (Pyroclasm)
        this.eruptionZones = [];

        // Freeze zone (Cryomancer)
        this.freezeZoneActive = false;
        this.freezeZoneData = null;

        // Drone barrage (Overload Prime)
        this.droneBarrageActive = false;
        this.droneBarrageBursts = 0;
        this.droneBarrageMaxBursts = 3;
        this.droneBarrageCooldown = 0;

        // Shadow clones (The Devourer)
        this.shadowCloneSpawn = false;

        // Teleport (The Devourer unique movement)
        this.devourerTeleportTimer = 0;
        this.devourerTeleportCooldown = 6000;
        this.devourerTeleportAlpha = 1;
        this.devourerFadingOut = false;
        this.devourerFadeOutTimer = 0;
        this.devourerFadeOutDuration = 1200;

        // Pyroclasm magma trail
        this.magmaTrails = [];
        this.magmaTrailTimer = 0;
    }

    update(deltaTime, arena) {
        super.update(deltaTime, arena);

        if (!this.active || !this.target) return;

        // Update active special effects
        this.updateLaserSweep(deltaTime);

        // Update eruption zones (Pyroclasm)
        this.updateEruptionZones(deltaTime);

        // Drone barrage burst fire (Overload Prime)
        this.handleDroneBarrage(deltaTime);

        // The Devourer: periodic teleport movement (slow fade-out â†’ move â†’ fade-in)
        this.handleTeleportation(deltaTime);

        // Pyroclasm: leave magma trail
        this.updateMagmaTrails(deltaTime);
    }

    updateMagmaTrails(deltaTime) {
        if (this.bossShape === 'lava') {
            this.magmaTrailTimer += deltaTime * 1000;
            if (this.magmaTrailTimer >= 500) {
                this.magmaTrailTimer = 0;
                this.magmaTrails.push({
                    x: this.x, y: this.y,
                    radius: 25,
                    damage: this.damage * 0.3,
                    timer: 0,
                    lifetime: 3000
                });
            }
            for (let i = this.magmaTrails.length - 1; i >= 0; i--) {
                this.magmaTrails[i].timer += deltaTime * 1000;
                if (this.magmaTrails[i].timer >= this.magmaTrails[i].lifetime) {
                    this.magmaTrails.splice(i, 1);
                }
            }
        }
    }

    handleTeleportation(deltaTime) {
        if (this.bossShape === 'eye') {
            if (this.devourerFadingOut) {
                // Phase 1: Fading out before teleport
                this.devourerFadeOutTimer += deltaTime * 1000;
                this.devourerTeleportAlpha = Math.max(0, 1 - this.devourerFadeOutTimer / this.devourerFadeOutDuration);

                if (this.devourerFadeOutTimer >= this.devourerFadeOutDuration) {
                    // Fully faded  now actually teleport
                    this.devourerFadingOut = false;
                    this.devourerFadeOutTimer = 0;
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 200 + Math.random() * 150;
                    this.x = this.target.x + Math.cos(angle) * dist;
                    this.y = this.target.y + Math.sin(angle) * dist;
                    this.x = this.wrapCoord(this.x, CONFIG.ARENA.WIDTH);
                    this.y = this.wrapCoord(this.y, CONFIG.ARENA.HEIGHT);
                    this.position.set(this.x, this.y);
                    this.devourerTeleportAlpha = 0;
                }
            } else if (this.devourerTeleportAlpha < 1) {
                // Phase 2: Fading back in after teleport
                this.devourerTeleportAlpha = Math.min(1, this.devourerTeleportAlpha + deltaTime * 0.8);
            } else {
                // Phase 0: Waiting for next teleport
                this.devourerTeleportTimer += deltaTime * 1000;
                if (this.devourerTeleportTimer >= this.devourerTeleportCooldown && !this.currentAbility) {
                    this.devourerTeleportTimer = 0;
                    this.devourerFadingOut = true;
                    this.devourerFadeOutTimer = 0;
                }
            }
        }
    }

    handleDroneBarrage(deltaTime) {
        if (this.droneBarrageActive) {
            this.droneBarrageCooldown -= deltaTime * 1000;
            if (this.droneBarrageCooldown <= 0 && this.droneBarrageBursts < this.droneBarrageMaxBursts) {
                // Fire projectiles in 8 directions
                this.droneBarrageShoot = true;
                this.droneBarrageBursts++;
                this.droneBarrageCooldown = 400;
                if (this.droneBarrageBursts >= this.droneBarrageMaxBursts) {
                    this.droneBarrageActive = false;
                    this.endAbility();
                }
            }
        }
    }

    updateEruptionZones(deltaTime) {
        for (const zone of this.eruptionZones) {
            zone.timer += deltaTime * 1000;
            if (zone.timer >= zone.warningTime && !zone.active) {
                zone.active = true;
            }
        }
    }

    updateLaserSweep(deltaTime) {
        if (this.laserSweepActive) {
            this.laserSweepAngle += deltaTime * 2.5;
            if (this.laserSweepAngle > Math.PI * 2) {
                this.laserSweepActive = false;
                this.laserSweepAngle = 0;
                this.endAbility();
            }
        }
    }

    /**
     * Override useAbility to handle world-specific ability names
     */
    useAbility() {
        const ability = this.abilities[MathUtils.randomInt(0, this.abilities.length - 1)];

        switch (ability) {
            case 'charge':
                this.startCharge();
                break;
            case 'summon':
                if (this.summonCount < this.maxSummons) {
                    this.summonMinions();
                }
                break;
            case 'aoe':
                this.aoeAttack();
                break;
            case 'shoot':
                this.shootProjectiles = true;
                this.currentAbility = 'shoot';
                setTimeout(() => this.endAbility(), 500);
                break;
            // --- Pyroclasm (lava) abilities ---
            case 'fireRing':
                this.fireRingActive = true;
                this.fireRingStart = Date.now();
                this.currentAbility = 'fireRing';
                setTimeout(() => { this.fireRingActive = false; this.endAbility(); }, 2500);
                break;
            case 'eruption':
                this.startEruption();
                break;
            // --- Cryomancer (crystal) abilities ---
            case 'freezeZone':
                this.startFreezeZone();
                break;
            case 'iceStorm':
                this.iceStormActive = true;
                this.currentAbility = 'iceStorm';
                setTimeout(() => { this.iceStormActive = false; this.endAbility(); }, 2500);
                break;
            // --- Overload Prime (mech) abilities ---
            case 'droneBarrage':
                this.startDroneBarrage();
                break;
            case 'laserSweep':
                this.laserSweepActive = true;
                this.laserSweepAngle = 0;
                this.currentAbility = 'laserSweep';
                break;
            // --- The Devourer (eye) abilities ---
            case 'voidPull':
                this.voidPullActive = true;
                this.currentAbility = 'voidPull';
                setTimeout(() => { this.voidPullActive = false; this.endAbility(); }, 4000);
                break;
            case 'shadowClones':
                this.startShadowClones();
                break;
            default:
                this.startCharge();
                break;
        }
    }

    /**
     * Pyroclasm: Eruption  spawn multiple ground eruptions near the player
     */
    startEruption() {
        this.currentAbility = 'eruption';
        this.eruptionZones = [];
        const tx = this.target ? this.target.x : this.x;
        const ty = this.target ? this.target.y : this.y;
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 30 + Math.random() * 130;
            this.eruptionZones.push({
                x: tx + Math.cos(angle) * dist,
                y: ty + Math.sin(angle) * dist,
                radius: 65,
                warningTime: 1200,
                timer: 0,
                active: false,
                damage: this.damage * 0.4
            });
        }
        setTimeout(() => {
            this.eruptionZones = [];
            this.endAbility();
        }, 2200);
    }

    /**
     * Cryomancer: Freeze Zone  persistent frozen area on the ground with warning
     */
    startFreezeZone() {
        this.currentAbility = 'freezeZone';
        this.freezeZoneData = {
            x: this.target ? this.target.x : this.x,
            y: this.target ? this.target.y : this.y,
            radius: 130,
            damage: this.damage * 0.3,
            slowMult: 0.4,
            slowDuration: 800,
            warning: true,
            warningTime: 1500,
            warningTimer: 0
        };
        this.freezeZoneActive = true;
        setTimeout(() => {
            this.freezeZoneActive = false;
            this.freezeZoneData = null;
            this.endAbility();
        }, 5500); // 1.5s warning + 4s active
    }

    /**
     * Overload Prime: Drone Barrage  fire projectile bursts in all directions
     */
    startDroneBarrage() {
        this.currentAbility = 'droneBarrage';
        this.droneBarrageActive = true;
        this.droneBarrageBursts = 0;
        this.droneBarrageCooldown = 0;
    }

    /**
     * The Devourer: Shadow Clones  spawn shadow copies of the boss
     */
    startShadowClones() {
        this.currentAbility = 'shadowClones';
        this.shadowCloneSpawn = true;
        this.summonCount++;
        setTimeout(() => this.endAbility(), 500);
    }

    render(ctx) {
        if (!this.active) return;

        ctx.save();

        const t = Date.now();
        const auraColors = [this.auraBaseColor, this.color, '#ff4444'];
        const currentAura = auraColors[this.phase - 1] || this.auraBaseColor;

        // --- CHARGE VISUAL (all bosses) ---
        if (this.isCharging && this.chargeDirection) {
            const bx = this.x; const by = this.y;
            // Pulsing warning glow on boss (intensifies as charge builds)
            const chargeGlow = ctx.createRadialGradient(bx, by, 0, bx, by, this.size * 1.8);
            chargeGlow.addColorStop(0, `rgba(255, 50, 50, ${0.25 + Math.sin(t / 30) * 0.15})`);
            chargeGlow.addColorStop(0.6, `rgba(255, 20, 20, ${0.1 + Math.sin(t / 30) * 0.08})`);
            chargeGlow.addColorStop(1, 'rgba(255, 0, 0, 0)');
            ctx.fillStyle = chargeGlow;
            ctx.beginPath();
            ctx.arc(bx, by, this.size * 1.8, 0, Math.PI * 2);
            ctx.fill();
            // Ground cracks / shockwave ring growing outward
            const crackRing = this.size * (1.2 + Math.sin(t / 60) * 0.3);
            ctx.strokeStyle = `rgba(255, 80, 30, ${0.4 + Math.sin(t / 40) * 0.2})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(bx, by, crackRing, 0, Math.PI * 2);
            ctx.stroke();
        }

        // --- SUMMON VISUAL (all bosses)  boss glows briefly ---
        if (this.currentAbility === 'summon' || this.currentAbility === 'shadowClones') {
            const bx = this.x; const by = this.y;
            const summonPulse = Math.sin(t / 50) * 0.3 + 0.7;
            const glowColor = this.bossShape === 'eye' ? '150, 0, 255' : '255, 180, 0';
            // Brief aura glow on boss body
            const summonGlow = ctx.createRadialGradient(bx, by, this.size * 0.5, bx, by, this.size * 1.5);
            summonGlow.addColorStop(0, `rgba(${glowColor}, ${0.3 * summonPulse})`);
            summonGlow.addColorStop(1, `rgba(${glowColor}, 0)`);
            ctx.fillStyle = summonGlow;
            ctx.beginPath();
            ctx.arc(bx, by, this.size * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // --- SHAPE-SPECIFIC RENDERING ---
        switch (this.bossShape) {
            case 'lava':
                this.renderLavaBoss(ctx, t, currentAura);
                break;
            case 'crystal':
                this.renderCrystalBoss(ctx, t, currentAura);
                break;
            case 'mech':
                this.renderMechBoss(ctx, t, currentAura);
                break;
            case 'eye':
                this.renderEyeBoss(ctx, t, currentAura);
                break;
            default:
                this.renderCrownBoss(ctx, t, currentAura);
                break;
        }

        // --- HEALTH BAR (common) ---
        this.renderBossHealthBar(ctx, currentAura);

        ctx.restore();
    }

    // --- VOID OVERLORD (crown shape) ---
    renderCrownBoss(ctx, t, aura) {
        const sz = this.size;
        const bx = this.x;
        const by = this.y;
        const flash = this.damageFlash > 0;

        // Spinning aura particles (ethereal swirl)
        const auraSize = this.calculateAuraSize(sz, t, ctx, bx, by);
        // Aura ring
        ctx.strokeStyle = aura;
        ctx.lineWidth = 4 + Math.sin(t / 200) * 2;
        ctx.beginPath();
        ctx.arc(bx, by, auraSize, 0, Math.PI * 2);
        ctx.stroke();

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(bx + 5, by + sz * 0.5, sz * 0.9, sz * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        this.renderBossCharacter(bx, ctx, by, flash, aura, t, sz);
    }


    calculateAuraSize(sz, t, ctx, bx, by) {
        const auraSize = sz + 25 + Math.sin(t / 250) * 10;
        for (let i = 0; i < 10; i++) {
            const angle = (t / 600) + (i * Math.PI / 5);
            const dist = auraSize * (0.35 + Math.sin(t / 300 + i * 2) * 0.1);
            const ox = Math.cos(angle) * dist;
            const oy = Math.sin(angle) * dist;
            const pSize = 8 + Math.sin(t / 150 + i) * 4;
            const aGrad = ctx.createRadialGradient(bx + ox, by + oy, 0, bx + ox, by + oy, pSize * 3);
            aGrad.addColorStop(0, `rgba(200, 100, 255, ${0.25 + Math.sin(t / 200 + i) * 0.1})`);
            aGrad.addColorStop(1, 'rgba(100, 0, 200, 0)');
            ctx.fillStyle = aGrad;
            ctx.beginPath();
            ctx.arc(bx + ox, by + oy, pSize * 3, 0, Math.PI * 2);
            ctx.fill();
        }
        return auraSize;
    }

    renderBossCharacter(bx, ctx, by, flash, aura, t, sz) {
        if (this.sprite) {
            let flipX = false;
            if (this.target) flipX = this.target.x < bx;
            this.sprite.render(ctx, bx, by, this.spriteScale, {
                opacity: flash ? 0.7 : 1,
                flipX: flipX,
                tint: flash ? '#ffffff' : null,
                glow: true,
                glowColor: aura,
                glowIntensity: 0.5
            });
        } else {
            // Imposing Void Knight
            // Cape (flows behind)
            this.renderCharacterArmor(t, ctx, flash, bx, sz, by);
        }
    }

    renderCharacterArmor(t, ctx, flash, bx, sz, by) {
        const capeWave = Math.sin(t / 300) * 0.1;
        ctx.fillStyle = flash ? '#fff' : '#2a0044';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.5, by - sz * 0.1);
        ctx.quadraticCurveTo(bx - sz * 0.7, by + sz * 0.4 + capeWave * sz, bx - sz * 0.55, by + sz * 0.95);
        ctx.lineTo(bx + sz * 0.55, by + sz * 0.95);
        ctx.quadraticCurveTo(bx + sz * 0.7, by + sz * 0.4 - capeWave * sz, bx + sz * 0.5, by - sz * 0.1);
        ctx.closePath();
        ctx.fill();

        // Legs (armored greaves)
        this.renderLegArmor(ctx, flash, bx, sz, by);
        // Knee guards
        this.renderKneeGuards(ctx, flash, bx, sz, by);

        // Body armor (layered plates)
        this.renderBodyArmor(ctx, bx, by, sz, flash);
        // Armor trim
        ctx.strokeStyle = '#e1bee7';
        ctx.lineWidth = 3;
        ctx.stroke();
        // Center chest emblem (void symbol)
        this.renderChestEmblem(ctx, bx, by, sz);
        // Armor plate lines
        this.renderArmorLines(ctx, bx, sz, by);

        // Shoulder pauldrons
        this.renderLeftPauldron(ctx, flash, bx, sz, by);
        // Right pauldron
        this.renderRightPauldron(ctx, bx, sz, by);
        // Pauldron spikes
        this.renderPauldronSpikes(ctx, bx, sz, by);

        // Arms (segmented armor)
        const armSwing = this.renderLeftArmSwing(ctx, flash, t, bx, sz, by);
        // Right upper arm
        this.renderRightArmArmor(ctx, flash, bx, sz, by, armSwing);
        // Right forearm
        this.renderRightGauntlet(ctx, flash, bx, sz, by, armSwing);
        // Right gauntlet
        this.renderGauntlet(ctx, flash, sz, bx, by, armSwing);

        // Void sword (right hand)
        this.renderSwordBlade(ctx, bx, sz, by, armSwing, flash);
        // Sword glow
        this.renderSwordGlow(ctx);
        // Cross guard
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(-sz * 0.1, -sz * 0.12, sz * 0.2, sz * 0.04);
        ctx.restore();

        // Head (helmet with visor)
        ctx.fillStyle = flash ? '#fff' : '#4a148c';
        ctx.beginPath();
        ctx.arc(bx, by - sz * 0.55, sz * 0.35, 0, Math.PI * 2);
        ctx.fill();
        // Helmet face plate
        this.renderHelmetFacePlate(ctx, flash, bx, sz, by);

        // Crown (golden, ornate)
        this.renderCrown(ctx, bx, sz, by);

        // Eyes (menacing glow through visor)
        ctx.fillStyle = '#e040fb';
        ctx.shadowColor = '#e040fb';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.ellipse(bx - sz * 0.1, by - sz * 0.55, sz * 0.08, sz * 0.04, 0, 0, Math.PI * 2);
        ctx.ellipse(bx + sz * 0.1, by - sz * 0.55, sz * 0.08, sz * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    renderCrown(ctx, bx, sz, by) {
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 12;
        // Crown base
        ctx.fillRect(bx - sz * 0.34, by - sz * 0.86, sz * 0.68, sz * 0.08);
        // Crown spikes with jewels
        for (let i = 0; i < 5; i++) {
            const cx = bx + (i - 2) * sz * 0.14;
            const condA = i % 2 === 0 ? sz * 0.07 : 0;
            const ch = sz * 0.2 + (i === 2 ? sz * 0.14 : (condA));
            ctx.beginPath();
            ctx.moveTo(cx - sz * 0.06, by - sz * 0.82);
            ctx.lineTo(cx, by - sz * 0.82 - ch);
            ctx.lineTo(cx + sz * 0.06, by - sz * 0.82);
            ctx.closePath();
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        // Crown jewels
        const jewels = ['#ff00ff', '#00ffff', '#ff00ff'];
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = jewels[i];
            ctx.shadowColor = jewels[i];
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(bx + (i - 1) * sz * 0.14, by - sz * 0.84, sz * 0.04, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    }

    renderHelmetFacePlate(ctx, flash, bx, sz, by) {
        ctx.fillStyle = flash ? '#fff' : '#2a0044';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.2, by - sz * 0.65);
        ctx.lineTo(bx + sz * 0.2, by - sz * 0.65);
        ctx.lineTo(bx + sz * 0.15, by - sz * 0.4);
        ctx.lineTo(bx, by - sz * 0.35);
        ctx.lineTo(bx - sz * 0.15, by - sz * 0.4);
        ctx.closePath();
        ctx.fill();
    }

    renderSwordGlow(ctx) {
        ctx.shadowColor = '#e040fb';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = 'rgba(224, 64, 251, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    renderSwordBlade(ctx, bx, sz, by, armSwing, flash) {
        ctx.save();
        ctx.translate(bx + sz * 1.08, by + sz * 0.45 - armSwing * sz);
        ctx.rotate(0.4 + armSwing);
        // Blade
        const swordGrad = ctx.createLinearGradient(0, -sz * 0.1, 0, -sz * 0.9);
        swordGrad.addColorStop(0, '#9c27b0');
        swordGrad.addColorStop(0.5, '#e040fb');
        swordGrad.addColorStop(1, '#ffffff');
        ctx.fillStyle = flash ? '#fff' : swordGrad;
        ctx.beginPath();
        ctx.moveTo(-sz * 0.04, -sz * 0.1);
        ctx.lineTo(0, -sz * 0.9);
        ctx.lineTo(sz * 0.04, -sz * 0.1);
        ctx.closePath();
        ctx.fill();
    }

    renderGauntlet(ctx, flash, sz, bx, by, armSwing) {
        ctx.fillStyle = flash ? '#fff' : '#9c27b0';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            const r = sz * 0.14 * (0.9 + Math.sin(i * 2.5 + 1) * 0.1);
            const px = bx + sz * 1.08 + Math.cos(a) * r;
            const py = by + sz * 0.45 - armSwing * sz + Math.sin(a) * r;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
    }

    renderRightGauntlet(ctx, flash, bx, sz, by, armSwing) {
        ctx.fillStyle = flash ? '#fff' : '#6a1b9a';
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.98, by + sz * 0.2 - armSwing * sz);
        ctx.lineTo(bx + sz * 1.15, by + sz * 0.4 - armSwing * sz);
        ctx.lineTo(bx + sz * 1, by + sz * 0.5 - armSwing * sz);
        ctx.lineTo(bx + sz * 0.85, by + sz * 0.3 - armSwing * sz);
        ctx.closePath();
        ctx.fill();
    }

    renderRightArmArmor(ctx, flash, bx, sz, by, armSwing) {
        ctx.fillStyle = flash ? '#fff' : '#7b1fa2';
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.8, by - sz * 0.05);
        ctx.lineTo(bx + sz * 1.05, by + sz * 0.2 - armSwing * sz);
        ctx.lineTo(bx + sz * 0.9, by + sz * 0.3 - armSwing * sz);
        ctx.lineTo(bx + sz * 0.65, by + sz * 0.1);
        ctx.closePath();
        ctx.fill();
    }

    renderLeftArmSwing(ctx, flash, t, bx, sz, by) {
        const armSwing = this.renderArmSwing(ctx, flash, t, bx, sz, by);
        // Left forearm
        ctx.fillStyle = flash ? '#fff' : '#6a1b9a';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.98, by + sz * 0.2 + armSwing * sz);
        ctx.lineTo(bx - sz * 1.15, by + sz * 0.4 + armSwing * sz);
        ctx.lineTo(bx - sz * 1, by + sz * 0.5 + armSwing * sz);
        ctx.lineTo(bx - sz * 0.85, by + sz * 0.3 + armSwing * sz);
        ctx.closePath();
        ctx.fill();
        // Left gauntlet
        ctx.fillStyle = flash ? '#fff' : '#9c27b0';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            const r = sz * 0.14 * (0.9 + Math.sin(i * 2.5) * 0.1);
            const px = bx - sz * 1.08 + Math.cos(a) * r;
            const py = by + sz * 0.45 + armSwing * sz + Math.sin(a) * r;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        return armSwing;
    }

    renderArmSwing(ctx, flash, t, bx, sz, by) {
        ctx.fillStyle = flash ? '#fff' : '#7b1fa2';
        const armSwing = Math.sin(t / 250) * 0.1;
        // Left upper arm
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.8, by - sz * 0.05);
        ctx.lineTo(bx - sz * 1.05, by + sz * 0.2 + armSwing * sz);
        ctx.lineTo(bx - sz * 0.9, by + sz * 0.3 + armSwing * sz);
        ctx.lineTo(bx - sz * 0.65, by + sz * 0.1);
        ctx.closePath();
        ctx.fill();
        return armSwing;
    }

    renderPauldronSpikes(ctx, bx, sz, by) {
        ctx.fillStyle = '#e1bee7';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.85, by - sz * 0.25);
        ctx.lineTo(bx - sz * 1.05, by - sz * 0.55);
        ctx.lineTo(bx - sz * 0.75, by - sz * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.85, by - sz * 0.25);
        ctx.lineTo(bx + sz * 1.05, by - sz * 0.55);
        ctx.lineTo(bx + sz * 0.75, by - sz * 0.2);
        ctx.closePath();
        ctx.fill();
    }

    renderRightPauldron(ctx, bx, sz, by) {
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.6, by - sz * 0.35);
        ctx.lineTo(bx + sz * 0.95, by - sz * 0.25);
        ctx.lineTo(bx + sz * 0.9, by);
        ctx.lineTo(bx + sz * 0.6, by - sz * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    renderLeftPauldron(ctx, flash, bx, sz, by) {
        ctx.fillStyle = flash ? '#fff' : '#6a1b9a';
        // Left pauldron
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.6, by - sz * 0.35);
        ctx.lineTo(bx - sz * 0.95, by - sz * 0.25);
        ctx.lineTo(bx - sz * 0.9, by);
        ctx.lineTo(bx - sz * 0.6, by - sz * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ce93d8';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    renderArmorLines(ctx, bx, sz, by) {
        ctx.strokeStyle = 'rgba(225, 190, 231, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.45, by);
        ctx.lineTo(bx + sz * 0.45, by);
        ctx.moveTo(bx - sz * 0.35, by + sz * 0.25);
        ctx.lineTo(bx + sz * 0.35, by + sz * 0.25);
        ctx.stroke();
    }

    renderChestEmblem(ctx, bx, by, sz) {
        ctx.fillStyle = '#e040fb';
        ctx.shadowColor = '#e040fb';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(bx, by - sz * 0.1, sz * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#1a0033';
        ctx.beginPath();
        ctx.arc(bx, by - sz * 0.1, sz * 0.06, 0, Math.PI * 2);
        ctx.fill();
    }

    renderBodyArmor(ctx, bx, by, sz, flash) {
        const grad = ctx.createRadialGradient(bx, by - sz * 0.2, 0, bx, by, sz);
        grad.addColorStop(0, '#ce93d8');
        grad.addColorStop(0.3, '#ab47bc');
        grad.addColorStop(0.6, '#7b1fa2');
        grad.addColorStop(1, '#4a148c');
        ctx.fillStyle = flash ? '#fff' : grad;
        ctx.beginPath();
        ctx.moveTo(bx, by - sz * 0.7);
        ctx.lineTo(bx + sz * 0.7, by - sz * 0.15);
        ctx.lineTo(bx + sz * 0.6, by + sz * 0.5);
        ctx.lineTo(bx - sz * 0.6, by + sz * 0.5);
        ctx.lineTo(bx - sz * 0.7, by - sz * 0.15);
        ctx.closePath();
        ctx.fill();
    }

    renderKneeGuards(ctx, flash, bx, sz, by) {
        ctx.fillStyle = flash ? '#fff' : '#7b1fa2';
        ctx.beginPath();
        ctx.arc(bx - sz * 0.2, by + sz * 0.55, sz * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx + sz * 0.2, by + sz * 0.55, sz * 0.1, 0, Math.PI * 2);
        ctx.fill();
    }

    renderLegArmor(ctx, flash, bx, sz, by) {
        ctx.fillStyle = flash ? '#fff' : '#4a0066';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.25, by + sz * 0.4);
        ctx.lineTo(bx - sz * 0.45, by + sz * 0.85);
        ctx.lineTo(bx - sz * 0.35, by + sz * 0.9);
        ctx.lineTo(bx - sz * 0.08, by + sz * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.08, by + sz * 0.45);
        ctx.lineTo(bx + sz * 0.35, by + sz * 0.9);
        ctx.lineTo(bx + sz * 0.45, by + sz * 0.85);
        ctx.lineTo(bx + sz * 0.25, by + sz * 0.4);
        ctx.closePath();
        ctx.fill();
    }

    renderLavaBoss(ctx, t, aura) {
        const sz = this.size;
        const bx = this.x;
        const by = this.y;
        const flash = this.damageFlash > 0;

        // Rising embers (float upward)
        this.renderEmbers(bx, t, sz, by, ctx);

        // Fire ring ability visual  expanding fire wave
        this.renderFireRing(sz, ctx, bx, by, t);

        // Heat shimmer
        ctx.fillStyle = 'rgba(255, 60, 0, 0.15)';
        ctx.beginPath();
        ctx.ellipse(bx, by + sz * 0.6, sz * 1.2, sz * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // === MASSIVE LAVA DEMON BODY ===
        // Legs (thick rocky pillars with lava veins)
        ctx.fillStyle = flash ? '#fff' : '#553322';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.45, by + sz * 0.25);
        ctx.lineTo(bx - sz * 0.6, by + sz * 0.9);
        ctx.lineTo(bx - sz * 0.15, by + sz * 0.85);
        ctx.lineTo(bx - sz * 0.15, by + sz * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.15, by + sz * 0.25);
        ctx.lineTo(bx + sz * 0.15, by + sz * 0.85);
        ctx.lineTo(bx + sz * 0.6, by + sz * 0.9);
        ctx.lineTo(bx + sz * 0.45, by + sz * 0.25);
        ctx.closePath();
        ctx.fill();
        // Lava glow on legs
        ctx.strokeStyle = `rgba(255, ${100 + Math.floor(Math.sin(t / 100) * 50)}, 0, 0.7)`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.35, by + sz * 0.4);
        ctx.quadraticCurveTo(bx - sz * 0.42, by + sz * 0.6, bx - sz * 0.38, by + sz * 0.8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.35, by + sz * 0.45);
        ctx.quadraticCurveTo(bx + sz * 0.28, by + sz * 0.65, bx + sz * 0.32, by + sz * 0.82);
        ctx.stroke();

        // Torso (massive craggy body)
        this.renderBodyTexture(ctx, bx, by, sz, flash, t);

        // Lava cracks (pulsing)
        this.renderLavaCracks(t, ctx, bx, by, sz);

        // Shoulder plates (rocky armor)
        ctx.fillStyle = flash ? '#fff' : '#442211';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.7, by - sz * 0.4);
        ctx.lineTo(bx - sz * 1.1, by - sz * 0.3);
        ctx.lineTo(bx - sz * 1, by - sz * 0.05);
        ctx.lineTo(bx - sz * 0.7, by - sz * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.7, by - sz * 0.4);
        ctx.lineTo(bx + sz * 1.1, by - sz * 0.3);
        ctx.lineTo(bx + sz * 1, by - sz * 0.05);
        ctx.lineTo(bx + sz * 0.7, by - sz * 0.1);
        ctx.closePath();
        ctx.fill();
        // Shoulder lava glow
        ctx.fillStyle = `rgba(255, 120, 0, ${0.4 + Math.sin(t / 150) * 0.2})`;
        ctx.beginPath();
        ctx.arc(bx - sz * 0.9, by - sz * 0.15, sz * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx + sz * 0.9, by - sz * 0.15, sz * 0.08, 0, Math.PI * 2);
        ctx.fill();

        // Arms (segmented: upper + forearm + fist)
        const armSway = Math.sin(t / 250) * 0.08;
        // Left upper arm
        ctx.fillStyle = flash ? '#fff' : '#5a2a10';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.85, by - sz * 0.1);
        ctx.lineTo(bx - sz * 1.15, by + sz * 0.15 + armSway * sz);
        ctx.lineTo(bx - sz * 1.05, by + sz * 0.3 + armSway * sz);
        ctx.lineTo(bx - sz * 0.75, by + sz * 0.08);
        ctx.closePath();
        ctx.fill();
        // Left elbow lava joint
        ctx.fillStyle = `rgba(255, ${Math.floor(140 + Math.sin(t / 100) * 40)}, 0, 0.8)`;
        ctx.beginPath();
        ctx.arc(bx - sz * 1.1, by + sz * 0.22 + armSway * sz, sz * 0.09, 0, Math.PI * 2);
        ctx.fill();
        // Left forearm
        ctx.fillStyle = flash ? '#fff' : '#4a2010';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 1.1, by + sz * 0.2 + armSway * sz);
        ctx.lineTo(bx - sz * 1.3, by + sz * 0.45 + armSway * sz);
        ctx.lineTo(bx - sz * 1.2, by + sz * 0.55 + armSway * sz);
        ctx.lineTo(bx - sz * 1, by + sz * 0.32 + armSway * sz);
        ctx.closePath();
        ctx.fill();
        // Left fist (rocky boulder)
        this.renderLavaFist(ctx, flash, sz, bx, by, armSway);
        // Fist lava glow
        ctx.fillStyle = `rgba(255, 100, 0, ${0.4 + Math.sin(t / 80) * 0.2})`;
        ctx.beginPath();
        ctx.arc(bx - sz * 1.25, by + sz * 0.5 + armSway * sz, sz * 0.08, 0, Math.PI * 2);
        ctx.fill();

        // Right arm (mirrored)
        this.renderRightArm(ctx, flash, bx, sz, by, armSway, t);

        // Horns (large, curved, with lava tips)
        ctx.fillStyle = flash ? '#fff' : '#331100';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.3, by - sz * 0.55);
        ctx.quadraticCurveTo(bx - sz * 1, by - sz * 1.4, bx - sz * 0.75, by - sz * 1.15);
        ctx.lineTo(bx - sz * 0.15, by - sz * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.3, by - sz * 0.55);
        ctx.quadraticCurveTo(bx + sz * 1, by - sz * 1.4, bx + sz * 0.75, by - sz * 1.15);
        ctx.lineTo(bx + sz * 0.15, by - sz * 0.5);
        ctx.closePath();
        ctx.fill();
        // Horn tips glow
        ctx.fillStyle = `rgba(255, ${Math.floor(150 + Math.sin(t / 100) * 50)}, 0, 0.7)`;
        ctx.beginPath();
        ctx.arc(bx - sz * 0.75, by - sz * 1.15, sz * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx + sz * 0.75, by - sz * 1.15, sz * 0.06, 0, Math.PI * 2);
        ctx.fill();

        // Eyes (furious, narrowed, V-shaped angry brows)
        // Dark eye sockets
        ctx.fillStyle = '#220000';
        ctx.beginPath();
        ctx.ellipse(bx - sz * 0.25, by - sz * 0.22, sz * 0.2, sz * 0.14, -0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(bx + sz * 0.25, by - sz * 0.22, sz * 0.2, sz * 0.14, 0.15, 0, Math.PI * 2);
        ctx.fill();
        // Glowing angry eyes (narrow slits)
        ctx.fillStyle = '#ff2200';
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.ellipse(bx - sz * 0.25, by - sz * 0.2, sz * 0.15, sz * 0.06, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(bx + sz * 0.25, by - sz * 0.2, sz * 0.15, sz * 0.06, 0.2, 0, Math.PI * 2);
        ctx.fill();
        // Bright pupil cores
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(bx - sz * 0.25, by - sz * 0.2, sz * 0.04, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx + sz * 0.25, by - sz * 0.2, sz * 0.04, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Angry V-shaped brows (thick, prominent)
        ctx.strokeStyle = '#331100';
        ctx.lineWidth = sz * 0.06;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.42, by - sz * 0.18);
        ctx.lineTo(bx - sz * 0.12, by - sz * 0.32);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.42, by - sz * 0.18);
        ctx.lineTo(bx + sz * 0.12, by - sz * 0.32);
        ctx.stroke();
        // Brow lava glow
        ctx.strokeStyle = `rgba(255, 80, 0, ${0.5 + Math.sin(t / 80) * 0.3})`;
        ctx.lineWidth = sz * 0.03;
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.4, by - sz * 0.17);
        ctx.lineTo(bx - sz * 0.14, by - sz * 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.4, by - sz * 0.17);
        ctx.lineTo(bx + sz * 0.14, by - sz * 0.3);
        ctx.stroke();

        // === MASSIVE GAPING MAW (huge mouth stretching across the face) ===
        // Outer jaw shape (very wide, terrifying)
        const mawOpen = Math.sin(t / 200) * 0.04; // subtle breathing
        ctx.fillStyle = '#0a0000';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.5, by - sz * 0.02);
        ctx.quadraticCurveTo(bx - sz * 0.2, by - sz * 0.08, bx, by - sz * 0.05);
        ctx.quadraticCurveTo(bx + sz * 0.2, by - sz * 0.08, bx + sz * 0.5, by - sz * 0.02);
        ctx.quadraticCurveTo(bx + sz * 0.3, by + sz * (0.5 + mawOpen), bx, by + sz * (0.55 + mawOpen));
        ctx.quadraticCurveTo(bx - sz * 0.3, by + sz * (0.5 + mawOpen), bx - sz * 0.5, by - sz * 0.02);
        ctx.closePath();
        ctx.fill();
        // Deep lava throat (pulsing glow inside)
        const mawGlow = ctx.createRadialGradient(bx, by + sz * 0.2, 0, bx, by + sz * 0.2, sz * 0.35);
        mawGlow.addColorStop(0, `rgba(255, ${Math.floor(180 + Math.sin(t / 50) * 75)}, 0, 1)`);
        mawGlow.addColorStop(0.4, `rgba(255, 80, 0, 0.8)`);
        mawGlow.addColorStop(0.7, `rgba(180, 30, 0, 0.5)`);
        mawGlow.addColorStop(1, 'rgba(50, 0, 0, 0)');
        ctx.fillStyle = mawGlow;
        ctx.beginPath();
        ctx.ellipse(bx, by + sz * 0.2, sz * 0.35, sz * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        // Lava bubbles in throat
        for (let i = 0; i < 5; i++) {
            const bAngle = (i / 5) * Math.PI * 2 + t * 0.003;
            const bDist = sz * (0.08 + Math.sin(t / 150 + i * 1.5) * 0.06);
            const bbx = bx + Math.cos(bAngle) * bDist;
            const bby = by + sz * 0.2 + Math.sin(bAngle) * bDist * 0.7;
            const bSize = sz * (0.03 + Math.sin(t / 80 + i * 2) * 0.015);
            ctx.fillStyle = `rgba(255, ${Math.floor(200 + Math.sin(t / 40 + i) * 55)}, 50, ${0.7 + Math.sin(t / 60 + i) * 0.3})`;
            ctx.beginPath();
            ctx.arc(bbx, bby, bSize, 0, Math.PI * 2);
            ctx.fill();
        }
        // Upper fangs (large, jagged, like stalagmites)
        ctx.fillStyle = '#ffe8cc';
        const upperFangs = [0.15, 0.22, 0.12, 0.18, 0.14, 0.2, 0.13];
        for (let i = 0; i < 7; i++) {
            const fx = bx - sz * 0.44 + (i / 6) * sz * 0.88;
            const fh = sz * upperFangs[i];
            const fw = sz * 0.05;
            ctx.beginPath();
            ctx.moveTo(fx - fw, by - sz * 0.02);
            ctx.lineTo(fx, by - sz * 0.02 + fh);
            ctx.lineTo(fx + fw, by - sz * 0.02);
            ctx.closePath();
            ctx.fill();
        }
        // Lower fangs (pointing up, thick)
        const lowerFangs = [0.16, 0.18];
        for (let i = 0; i < 2; i++) {
            const fx = bx - sz * 0.15 + (i / 1) * sz * 0.3;
            const fh = sz * lowerFangs[i];
            const fw = sz * 0.045;
            ctx.beginPath();
            ctx.moveTo(fx - fw, by + sz * (0.45 + mawOpen));
            ctx.lineTo(fx, by + sz * (0.45 + mawOpen) - fh);
            ctx.lineTo(fx + fw, by + sz * (0.45 + mawOpen));
            ctx.closePath();
            ctx.fill();
        }
        // Drool / lava drips from fangs
        for (let i = 0; i < 3; i++) {
            const dx = bx - sz * 0.25 + i * sz * 0.25;
            const dripLen = sz * (0.05 + ((t / 3 + i * 200) % 400) / 400 * 0.1);
            const dripAlpha = 1 - ((t / 3 + i * 200) % 400) / 400;
            ctx.strokeStyle = `rgba(255, 120, 0, ${dripAlpha * 0.7})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(dx, by + sz * 0.1);
            ctx.lineTo(dx + Math.sin(t / 200 + i) * 2, by + sz * 0.1 + dripLen);
            ctx.stroke();
        }
    }


    renderRightArm(ctx, flash, bx, sz, by, armSway, t) {
        ctx.fillStyle = flash ? '#fff' : '#5a2a10';
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.85, by - sz * 0.1);
        ctx.lineTo(bx + sz * 1.15, by + sz * 0.15 - armSway * sz);
        ctx.lineTo(bx + sz * 1.05, by + sz * 0.3 - armSway * sz);
        ctx.lineTo(bx + sz * 0.75, by + sz * 0.08);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = `rgba(255, ${Math.floor(140 + Math.sin(t / 100 + 1) * 40)}, 0, 0.8)`;
        ctx.beginPath();
        ctx.arc(bx + sz * 1.1, by + sz * 0.22 - armSway * sz, sz * 0.09, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = flash ? '#fff' : '#4a2010';
        ctx.beginPath();
        ctx.moveTo(bx + sz * 1.1, by + sz * 0.2 - armSway * sz);
        ctx.lineTo(bx + sz * 1.3, by + sz * 0.45 - armSway * sz);
        ctx.lineTo(bx + sz * 1.2, by + sz * 0.55 - armSway * sz);
        ctx.lineTo(bx + sz * 1, by + sz * 0.32 - armSway * sz);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = flash ? '#fff' : '#663320';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const r = sz * 0.18 * (0.85 + Math.sin(i * 2.3 + 1) * 0.15);
            const px = bx + sz * 1.25 + Math.cos(a) * r;
            const py = by + sz * 0.5 - armSway * sz + Math.sin(a) * r;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = `rgba(255, 100, 0, ${0.4 + Math.sin(t / 80 + 1) * 0.2})`;
        ctx.beginPath();
        ctx.arc(bx + sz * 1.25, by + sz * 0.5 - armSway * sz, sz * 0.08, 0, Math.PI * 2);
        ctx.fill();
    }

    renderLavaFist(ctx, flash, sz, bx, by, armSway) {
        ctx.fillStyle = flash ? '#fff' : '#663320';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const r = sz * 0.18 * (0.85 + Math.sin(i * 2.3) * 0.15);
            const px = bx - sz * 1.25 + Math.cos(a) * r;
            const py = by + sz * 0.5 + armSway * sz + Math.sin(a) * r;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
    }

    renderLavaCracks(t, ctx, bx, by, sz) {
        const lavaR = Math.floor(200 + Math.sin(t / 80) * 55);
        ctx.strokeStyle = `rgba(255, ${lavaR}, 0, 0.85)`;
        ctx.lineWidth = 3;
        for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2 + 0.2;
            ctx.beginPath();
            ctx.moveTo(bx, by - sz * 0.1);
            const mx = bx + Math.cos(a + 0.15) * sz * 0.4;
            const my = by + Math.sin(a + 0.15) * sz * 0.35;
            ctx.quadraticCurveTo(mx, my, bx + Math.cos(a) * sz * 0.78, by + Math.sin(a) * sz * 0.62);
            ctx.stroke();
        }
        // Lava drips from cracks (animated drops falling)
        for (let i = 0; i < 4; i++) {
            const da = (i / 4) * Math.PI * 2 + 1;
            const dripX = bx + Math.cos(da) * sz * 0.7;
            const dripBaseY = by + Math.sin(da) * sz * 0.55;
            const dripFall = ((t / 2 + i * 300) % 600) / 600;
            const dripY = dripBaseY + dripFall * sz * 0.3;
            const dripAlpha = 1 - dripFall;
            ctx.fillStyle = `rgba(255, ${Math.floor(120 + Math.sin(t / 60) * 40)}, 0, ${dripAlpha * 0.8})`;
            ctx.beginPath();
            ctx.ellipse(dripX, dripY, 3, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderBodyTexture(ctx, bx, by, sz, flash, t) {
        const tGrad = ctx.createRadialGradient(bx, by - sz * 0.15, 0, bx, by, sz);
        tGrad.addColorStop(0, '#ff6600');
        tGrad.addColorStop(0.25, '#cc3300');
        tGrad.addColorStop(0.55, '#772200');
        tGrad.addColorStop(1, '#441100');
        ctx.fillStyle = flash ? '#fff' : tGrad;
        ctx.beginPath();
        for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2;
            const wobble = sz * (0.88 + Math.sin(t / 250 + i * 2.1) * 0.06 + Math.sin(i * 3.7) * 0.12);
            const px = bx + Math.cos(a) * wobble * 0.9;
            const py = by + Math.sin(a) * wobble * 0.75;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
    }

    renderFireRing(sz, ctx, bx, by, t) {
        if (this.fireRingActive) {
            const maxRadius = sz * 2.5;
            const elapsed = Date.now() - (this.fireRingStart || Date.now());
            const expandDuration = 600; // Fire expands outward in 600ms
            const expandProgress = Math.min(elapsed / expandDuration, 1);
            const currentRadius = maxRadius * expandProgress;

            // Ground fire fill  expanding radial gradient
            const fireGrad = ctx.createRadialGradient(bx, by, 0, bx, by, currentRadius);
            fireGrad.addColorStop(0, 'rgba(255, 200, 0, 0.45)');
            fireGrad.addColorStop(0.3, 'rgba(255, 120, 0, 0.35)');
            fireGrad.addColorStop(0.6, 'rgba(255, 50, 0, 0.25)');
            fireGrad.addColorStop(0.85, 'rgba(200, 20, 0, 0.15)');
            fireGrad.addColorStop(1, 'rgba(100, 0, 0, 0)');
            ctx.fillStyle = fireGrad;
            ctx.beginPath();
            ctx.arc(bx, by, currentRadius, 0, Math.PI * 2);
            ctx.fill();

            // Animated flame tongues  fire tendrils rising from the expanding ring
            this.renderFlameTendrils(expandProgress, t, currentRadius, bx, by, ctx);

            // Outer ring edge  fiery border
            this.renderFireBorder(expandProgress, currentRadius, ctx, t, bx, by);

            // Sparks / embers flying outward from the fire
            this.createEmbers(t, currentRadius, bx, by, ctx);

            // Central heat glow
            const coreGlow = ctx.createRadialGradient(bx, by, 0, bx, by, sz * 0.8);
            coreGlow.addColorStop(0, `rgba(255, 255, 200, ${0.3 + Math.sin(t / 60) * 0.1})`);
            coreGlow.addColorStop(0.5, 'rgba(255, 150, 0, 0.15)');
            coreGlow.addColorStop(1, 'rgba(255, 50, 0, 0)');
            ctx.fillStyle = coreGlow;
            ctx.beginPath();
            ctx.arc(bx, by, sz * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    createEmbers(t, currentRadius, bx, by, ctx) {
        for (let i = 0; i < 12; i++) {
            const sparkAngle = (i / 12) * Math.PI * 2 + (t / 300);
            const sparkDist = currentRadius * (0.3 + ((t / 5 + i * 200) % 400) / 400 * 0.7);
            if (sparkDist < currentRadius) {
                const sx = bx + Math.cos(sparkAngle) * sparkDist;
                const sy = by + Math.sin(sparkAngle) * sparkDist - Math.sin(t / 40 + i) * 5;
                const sparkAlpha = 1 - (sparkDist / currentRadius);
                ctx.fillStyle = `rgba(255, ${200 + Math.floor(Math.sin(t / 20 + i) * 55)}, 0, ${sparkAlpha * 0.7})`;
                ctx.beginPath();
                ctx.arc(sx, sy, 2 + Math.sin(t / 30 + i) * 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    renderFireBorder(expandProgress, currentRadius, ctx, t, bx, by) {
        if (expandProgress > 0.3) {
            for (let r = 0; r < 2; r++) {
                const rr = currentRadius - r * 6;
                ctx.strokeStyle = `rgba(255, ${40 + r * 50}, 0, ${(0.5 - r * 0.15) + Math.sin(t / 50 + r) * 0.15})`;
                ctx.lineWidth = 6 - r * 2;
                ctx.setLineDash([8 + Math.sin(t / 30) * 4, 6]);
                ctx.beginPath();
                ctx.arc(bx, by, rr, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.setLineDash([]);
        }
    }

    renderFlameTendrils(expandProgress, t, currentRadius, bx, by, ctx) {
        if (expandProgress > 0.2) {
            const flameCount = 20;
            for (let i = 0; i < flameCount; i++) {
                const baseAngle = (i / flameCount) * Math.PI * 2;
                const wobble = Math.sin(t / 60 + i * 2.5) * 0.15;
                const angle = baseAngle + wobble;
                const flameDist = currentRadius * (0.4 + Math.sin(t / 80 + i * 3) * 0.15 + Math.random() * 0.05);
                const fx = bx + Math.cos(angle) * flameDist;
                const fy = by + Math.sin(angle) * flameDist;
                const flameH = 12 + Math.sin(t / 50 + i * 1.7) * 8;
                const flameW = 5 + Math.sin(t / 70 + i) * 2;

                // Each flame tongue
                const flameGrad = ctx.createLinearGradient(fx, fy, fx, fy - flameH);
                flameGrad.addColorStop(0, `rgba(255, 80, 0, ${0.6 + Math.sin(t / 40 + i) * 0.2})`);
                flameGrad.addColorStop(0.4, `rgba(255, 180, 0, ${0.5 + Math.sin(t / 35 + i) * 0.15})`);
                flameGrad.addColorStop(1, 'rgba(255, 255, 100, 0)');
                ctx.fillStyle = flameGrad;
                ctx.beginPath();
                ctx.moveTo(fx - flameW, fy);
                ctx.quadraticCurveTo(fx - flameW * 0.3, fy - flameH * 0.6, fx, fy - flameH);
                ctx.quadraticCurveTo(fx + flameW * 0.3, fy - flameH * 0.6, fx + flameW, fy);
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    renderEmbers(bx, t, sz, by, ctx) {
        for (let i = 0; i < 14; i++) {
            const seed = i * 137.5;
            const ex = bx + Math.sin(t / 400 + seed) * sz * 1.2;
            const ey = by - (((t / 3 + seed * 10) % (sz * 2.5))) + sz;
            const eSize = 3 + Math.sin(t / 100 + i) * 2;
            const eAlpha = 0.4 + Math.sin(t / 80 + i) * 0.2;
            ctx.fillStyle = `rgba(255, ${Math.floor(100 + Math.sin(t / 60 + i) * 80)}, 0, ${eAlpha})`;
            ctx.beginPath();
            ctx.arc(ex, ey, eSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderCrystalBoss(ctx, t, aura) {
        const sz = this.size;
        const bx = this.x;
        const by = this.y;
        const flash = this.damageFlash > 0;

        // Floating ice shards (orbit with trails)
        this.renderIceShards(t, sz, bx, by, ctx);

        // Ice storm visual  full blizzard
        this.renderIceStormEffects(sz, ctx, t, bx, by);

        // Shadow
        ctx.fillStyle = 'rgba(0, 80, 150, 0.3)';
        ctx.beginPath();
        ctx.ellipse(bx, by + sz * 0.55, sz * 0.85, sz * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // === ICE ELEMENTAL BODY ===
        // Legs (crystalline pillars)
        ctx.fillStyle = flash ? '#fff' : '#1a6688';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.35, by + sz * 0.25);
        ctx.lineTo(bx - sz * 0.5, by + sz * 0.85);
        ctx.lineTo(bx - sz * 0.15, by + sz * 0.85);
        ctx.lineTo(bx - sz * 0.1, by + sz * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.1, by + sz * 0.25);
        ctx.lineTo(bx + sz * 0.15, by + sz * 0.85);
        ctx.lineTo(bx + sz * 0.5, by + sz * 0.85);
        ctx.lineTo(bx + sz * 0.35, by + sz * 0.25);
        ctx.closePath();
        ctx.fill();
        // Ice shine on legs
        ctx.strokeStyle = 'rgba(200, 240, 255, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.3, by + sz * 0.35);
        ctx.lineTo(bx - sz * 0.35, by + sz * 0.7);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.28, by + sz * 0.4);
        ctx.lineTo(bx + sz * 0.32, by + sz * 0.72);
        ctx.stroke();

        // Torso (hexagonal crystal with gradient)
        this.renderCrystalTorso(ctx, bx, by, sz, flash);

        // Crystal facet lines (shimmer)
        ctx.strokeStyle = `rgba(200, 240, 255, ${0.25 + Math.sin(t / 300) * 0.15})`;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + Math.cos(a) * sz * 0.85, by + Math.sin(a) * sz * 0.75);
            ctx.stroke();
        }
        // Inner frost pattern
        ctx.strokeStyle = 'rgba(180, 230, 255, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(bx + Math.cos(a) * sz * 0.3, by + Math.sin(a) * sz * 0.25);
            ctx.lineTo(bx + Math.cos(a + 0.5) * sz * 0.55, by + Math.sin(a + 0.5) * sz * 0.45);
            ctx.stroke();
        }

        // Shoulder crystal spikes (large, imposing)
        ctx.fillStyle = flash ? '#fff' : '#55ccee';
        // Left shoulder spike cluster
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.65, by - sz * 0.3);
        ctx.lineTo(bx - sz * 1, by - sz * 0.85);
        ctx.lineTo(bx - sz * 0.55, by - sz * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.7, by - sz * 0.25);
        ctx.lineTo(bx - sz * 0.85, by - sz * 0.65);
        ctx.lineTo(bx - sz * 0.55, by - sz * 0.3);
        ctx.closePath();
        ctx.fill();
        // Right shoulder spike cluster
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.65, by - sz * 0.3);
        ctx.lineTo(bx + sz * 1, by - sz * 0.85);
        ctx.lineTo(bx + sz * 0.55, by - sz * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.7, by - sz * 0.25);
        ctx.lineTo(bx + sz * 0.85, by - sz * 0.65);
        ctx.lineTo(bx + sz * 0.55, by - sz * 0.3);
        ctx.closePath();
        ctx.fill();

        // Arms (ice crystal segmented)
        ctx.fillStyle = flash ? '#fff' : '#2a99bb';
        const armSway = Math.sin(t / 250) * 0.08;
        // Left upper arm
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.75, by - sz * 0.1);
        ctx.lineTo(bx - sz * 1.1, by + sz * 0.1 + armSway * sz);
        ctx.lineTo(bx - sz * 1, by + sz * 0.25 + armSway * sz);
        ctx.lineTo(bx - sz * 0.65, by + sz * 0.08);
        ctx.closePath();
        ctx.fill();
        // Left elbow frost
        ctx.fillStyle = `rgba(180, 240, 255, ${0.5 + Math.sin(t / 150) * 0.2})`;
        ctx.beginPath();
        ctx.arc(bx - sz * 1.05, by + sz * 0.17 + armSway * sz, sz * 0.07, 0, Math.PI * 2);
        ctx.fill();
        // Left forearm
        ctx.fillStyle = flash ? '#fff' : '#2288aa';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 1.05, by + sz * 0.15 + armSway * sz);
        ctx.lineTo(bx - sz * 1.25, by + sz * 0.35 + armSway * sz);
        ctx.lineTo(bx - sz * 1.1, by + sz * 0.45 + armSway * sz);
        ctx.lineTo(bx - sz * 0.95, by + sz * 0.27 + armSway * sz);
        ctx.closePath();
        ctx.fill();
        // Left ice fist (crystalline)
        ctx.fillStyle = flash ? '#fff' : '#88ddff';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 1.2, by + sz * 0.3 + armSway * sz);
        ctx.lineTo(bx - sz * 1.4, by + sz * 0.38 + armSway * sz);
        ctx.lineTo(bx - sz * 1.25, by + sz * 0.52 + armSway * sz);
        ctx.lineTo(bx - sz * 1.1, by + sz * 0.42 + armSway * sz);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#aaeeff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Right arm (mirrored)
        ctx.fillStyle = flash ? '#fff' : '#2a99bb';
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.75, by - sz * 0.1);
        ctx.lineTo(bx + sz * 1.1, by + sz * 0.1 - armSway * sz);
        ctx.lineTo(bx + sz * 1, by + sz * 0.25 - armSway * sz);
        ctx.lineTo(bx + sz * 0.65, by + sz * 0.08);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = `rgba(180, 240, 255, ${0.5 + Math.sin(t / 150 + 1) * 0.2})`;
        ctx.beginPath();
        ctx.arc(bx + sz * 1.05, by + sz * 0.17 - armSway * sz, sz * 0.07, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = flash ? '#fff' : '#2288aa';
        ctx.beginPath();
        ctx.moveTo(bx + sz * 1.05, by + sz * 0.15 - armSway * sz);
        ctx.lineTo(bx + sz * 1.25, by + sz * 0.35 - armSway * sz);
        ctx.lineTo(bx + sz * 1.1, by + sz * 0.45 - armSway * sz);
        ctx.lineTo(bx + sz * 0.95, by + sz * 0.27 - armSway * sz);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = flash ? '#fff' : '#88ddff';
        ctx.beginPath();
        ctx.moveTo(bx + sz * 1.2, by + sz * 0.3 - armSway * sz);
        ctx.lineTo(bx + sz * 1.4, by + sz * 0.38 - armSway * sz);
        ctx.lineTo(bx + sz * 1.25, by + sz * 0.52 - armSway * sz);
        ctx.lineTo(bx + sz * 1.1, by + sz * 0.42 - armSway * sz);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#aaeeff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Crown of ice crystals (taller, more prominent)
        ctx.fillStyle = '#ccf0ff';
        ctx.shadowColor = '#00ccff';
        ctx.shadowBlur = 8;
        for (let i = 0; i < 7; i++) {
            const cx = bx + (i - 3) * sz * 0.12;
            const condA = i % 2 === 0 ? sz * 0.1 : sz * 0.05;
            const ch = sz * 0.15 + (i === 3 ? sz * 0.22 : (condA));
            ctx.beginPath();
            ctx.moveTo(cx - sz * 0.05, by - sz * 0.62);
            ctx.lineTo(cx, by - sz * 0.62 - ch);
            ctx.lineTo(cx + sz * 0.05, by - sz * 0.62);
            ctx.closePath();
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        // Eyes (piercing ice blue)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(bx - sz * 0.2, by - sz * 0.15, sz * 0.14, sz * 0.09, 0, 0, Math.PI * 2);
        ctx.ellipse(bx + sz * 0.2, by - sz * 0.15, sz * 0.14, sz * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#00bfff';
        ctx.shadowColor = '#00ccff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(bx - sz * 0.2, by - sz * 0.15, sz * 0.07, 0, Math.PI * 2);
        ctx.arc(bx + sz * 0.2, by - sz * 0.15, sz * 0.07, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Inner frost glow (pulsing core)
        const innerGlow = ctx.createRadialGradient(bx, by, 0, bx, by, sz * 0.5);
        innerGlow.addColorStop(0, `rgba(200, 240, 255, ${0.2 + Math.sin(t / 200) * 0.12})`);
        innerGlow.addColorStop(1, 'rgba(100, 200, 255, 0)');
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(bx, by, sz * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }


    renderCrystalTorso(ctx, bx, by, sz, flash) {
        const bGrad = ctx.createRadialGradient(bx, by - sz * 0.15, 0, bx, by, sz);
        bGrad.addColorStop(0, '#e0f7fa');
        bGrad.addColorStop(0.25, '#80deea');
        bGrad.addColorStop(0.55, '#4dd0e1');
        bGrad.addColorStop(1, '#006064');
        ctx.fillStyle = flash ? '#fff' : bGrad;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
            const px = bx + Math.cos(a) * sz * 0.88;
            const py = by + Math.sin(a) * sz * 0.78;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#80deea';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    renderIceStormEffects(sz, ctx, t, bx, by) {
        if (this.iceStormActive) {
            const stormR = sz * 2.8;
            // Outer frost ring pulsing
            ctx.strokeStyle = `rgba(100, 220, 255, ${0.35 + Math.sin(t / 100) * 0.2})`;
            ctx.lineWidth = 3;
            ctx.setLineDash([12, 6]);
            ctx.beginPath();
            ctx.arc(bx, by, stormR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            // Ice beams radiating from boss (6 rotating rays)
            for (let i = 0; i < 6; i++) {
                const ra = (t / 300) + (i * Math.PI / 3);
                const rx = bx + Math.cos(ra) * stormR;
                const ry = by + Math.sin(ra) * stormR;
                const beamGrad = ctx.createLinearGradient(bx, by, rx, ry);
                beamGrad.addColorStop(0, 'rgba(180, 240, 255, 0.4)');
                beamGrad.addColorStop(0.6, 'rgba(100, 200, 255, 0.15)');
                beamGrad.addColorStop(1, 'rgba(100, 200, 255, 0)');
                ctx.strokeStyle = beamGrad;
                ctx.lineWidth = 5 + Math.sin(t / 80 + i) * 2;
                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(rx, ry);
                ctx.stroke();
            }
            // Snowflakes (6-pointed stars spinning outward)
            for (let i = 0; i < 24; i++) {
                const a = (t / 120) + (i * Math.PI / 12);
                const d = 40 + (((t / 4 + i * 150) % (stormR - 40)));
                const px = bx + Math.cos(a) * d;
                const py = by + Math.sin(a) * d;
                const sfSize = 4 + Math.sin(t / 60 + i) * 2;
                const sfAlpha = 0.5 + Math.sin(t / 50 + i * 2) * 0.25;
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(t / 200 + i);
                ctx.strokeStyle = `rgba(220, 245, 255, ${sfAlpha})`;
                ctx.lineWidth = 1.2;
                // 6-pointed snowflake
                for (let s = 0; s < 6; s++) {
                    const sa = (s / 6) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(sa) * sfSize, Math.sin(sa) * sfSize);
                    ctx.stroke();
                    // Branch tips
                    const tx = Math.cos(sa) * sfSize * 0.6;
                    const ty = Math.sin(sa) * sfSize * 0.6;
                    ctx.beginPath();
                    ctx.moveTo(tx, ty);
                    ctx.lineTo(tx + Math.cos(sa + 0.8) * sfSize * 0.35, ty + Math.sin(sa + 0.8) * sfSize * 0.35);
                    ctx.stroke();
                }
                ctx.restore();
            }
            // Frost aura gradient
            const frostGrad = ctx.createRadialGradient(bx, by, sz, bx, by, stormR);
            frostGrad.addColorStop(0, 'rgba(100, 200, 255, 0.2)');
            frostGrad.addColorStop(0.5, 'rgba(80, 180, 255, 0.08)');
            frostGrad.addColorStop(1, 'rgba(100, 200, 255, 0)');
            ctx.fillStyle = frostGrad;
            ctx.beginPath();
            ctx.arc(bx, by, sz * 2.8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderIceShards(t, sz, bx, by, ctx) {
        for (let i = 0; i < 10; i++) {
            const angle = (t / 800) + (i * Math.PI / 5);
            const dist = sz + 30 + Math.sin(t / 300 + i) * 12;
            const sx = bx + Math.cos(angle) * dist;
            const sy = by + Math.sin(angle) * dist;
            // Trail ghost
            const tx2 = bx + Math.cos(angle - 0.15) * dist;
            const ty = by + Math.sin(angle - 0.15) * dist;
            ctx.fillStyle = `rgba(150, 230, 255, ${0.15 + Math.sin(t / 200 + i) * 0.1})`;
            ctx.beginPath();
            ctx.moveTo(tx2, ty - 8); ctx.lineTo(tx2 + 4, ty); ctx.lineTo(tx2, ty + 8); ctx.lineTo(tx2 - 4, ty);
            ctx.closePath();
            ctx.fill();
            // Main shard
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(angle + t / 400);
            ctx.fillStyle = `rgba(180, 240, 255, ${0.6 + Math.sin(t / 200 + i) * 0.25})`;
            ctx.beginPath();
            ctx.moveTo(0, -14); ctx.lineTo(7, 0); ctx.lineTo(0, 14); ctx.lineTo(-7, 0);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#ccf0ff';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }
    }

    renderMechBoss(ctx, t, aura) {
        const sz = this.size;
        const bx = this.x;
        const by = this.y;
        const flash = this.damageFlash > 0;

        // Electric arcs (more dramatic)
        this.renderElectricArcs(ctx, t, sz, bx, by);

        // Laser sweep
        this.renderLaserSweep(bx, by, ctx, t);

        // Drone barrage  orbiting attack drones
        this.renderDroneBarrage(sz, t, ctx, bx, by);

        // Shadow
        ctx.fillStyle = 'rgba(0, 100, 60, 0.3)';
        ctx.beginPath();
        ctx.ellipse(bx, by + sz * 0.55, sz * 0.85, sz * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // === MECH BODY ===
        // Legs (hydraulic, segmented)
        const legStep = Math.sin(t / 180) * sz * 0.08;
        ctx.fillStyle = flash ? '#fff' : '#1a2a1a';
        // Left leg
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.35, by + sz * 0.45);
        ctx.lineTo(bx - sz * 0.5, by + sz * 0.72 + legStep);
        ctx.lineTo(bx - sz * 0.2, by + sz * 0.72 + legStep);
        ctx.lineTo(bx - sz * 0.15, by + sz * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.5, by + sz * 0.72 + legStep);
        ctx.lineTo(bx - sz * 0.55, by + sz * 1 + legStep);
        ctx.lineTo(bx - sz * 0.15, by + sz * 0.95 + legStep);
        ctx.lineTo(bx - sz * 0.2, by + sz * 0.72 + legStep);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(bx - sz * 0.6, by + sz * 0.95 + legStep, sz * 0.5, sz * 0.08);
        // Right leg
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.15, by + sz * 0.45);
        ctx.lineTo(bx + sz * 0.2, by + sz * 0.72 - legStep);
        ctx.lineTo(bx + sz * 0.5, by + sz * 0.72 - legStep);
        ctx.lineTo(bx + sz * 0.35, by + sz * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.2, by + sz * 0.72 - legStep);
        ctx.lineTo(bx + sz * 0.15, by + sz * 0.95 - legStep);
        ctx.lineTo(bx + sz * 0.55, by + sz * 1 - legStep);
        ctx.lineTo(bx + sz * 0.5, by + sz * 0.72 - legStep);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(bx + sz * 0.1, by + sz * 0.95 - legStep, sz * 0.5, sz * 0.08);
        // Hydraulic pistons on legs
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.28, by + sz * 0.5);
        ctx.lineTo(bx - sz * 0.42, by + sz * 0.8 + legStep);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.28, by + sz * 0.5);
        ctx.lineTo(bx + sz * 0.42, by + sz * 0.8 - legStep);
        ctx.stroke();
        // Knee joints
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(bx - sz * 0.35, by + sz * 0.72 + legStep, sz * 0.07, 0, Math.PI * 2);
        ctx.arc(bx + sz * 0.35, by + sz * 0.72 - legStep, sz * 0.07, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Torso (armored hull)
        const mGrad = ctx.createRadialGradient(bx, by, 0, bx, by, sz);
        mGrad.addColorStop(0, '#334433');
        mGrad.addColorStop(0.4, '#222a22');
        mGrad.addColorStop(1, '#0a120a');
        ctx.fillStyle = flash ? '#fff' : mGrad;
        const r = sz * 0.12;
        const hs = sz * 0.72;
        ctx.beginPath();
        ctx.moveTo(bx - hs + r, by - hs);
        ctx.lineTo(bx + hs - r, by - hs);
        ctx.quadraticCurveTo(bx + hs, by - hs, bx + hs, by - hs + r);
        ctx.lineTo(bx + hs, by + hs - r);
        ctx.quadraticCurveTo(bx + hs, by + hs, bx + hs - r, by + hs);
        ctx.lineTo(bx - hs + r, by + hs);
        ctx.quadraticCurveTo(bx - hs, by + hs, bx - hs, by + hs - r);
        ctx.lineTo(bx - hs, by - hs + r);
        ctx.quadraticCurveTo(bx - hs, by - hs, bx - hs + r, by - hs);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Panel lines (animated circuit glow)
        ctx.strokeStyle = `rgba(0, 200, 100, ${0.25 + Math.sin(t / 200) * 0.15})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx - hs * 0.8, by - hs * 0.3);
        ctx.lineTo(bx, by - hs * 0.3);
        ctx.lineTo(bx, by + hs * 0.3);
        ctx.lineTo(bx + hs * 0.8, by + hs * 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx - hs * 0.7, by + hs * 0.1);
        ctx.lineTo(bx + hs * 0.7, by + hs * 0.1);
        ctx.stroke();
        // Vent grilles
        ctx.fillStyle = '#0a120a';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(bx - hs * 0.5 + i * hs * 0.45, by + hs * 0.5, hs * 0.25, hs * 0.15);
        }

        // Shoulder pads (angular armor)
        ctx.fillStyle = flash ? '#fff' : '#2a4a2a';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.72, by - sz * 0.72);
        ctx.lineTo(bx - sz * 1.2, by - sz * 0.58);
        ctx.lineTo(bx - sz * 1.15, by - sz * 0.3);
        ctx.lineTo(bx - sz * 0.72, by - sz * 0.48);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#00cc66';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx + sz * 0.72, by - sz * 0.72);
        ctx.lineTo(bx + sz * 1.2, by - sz * 0.58);
        ctx.lineTo(bx + sz * 1.15, by - sz * 0.3);
        ctx.lineTo(bx + sz * 0.72, by - sz * 0.48);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Shoulder lights
        ctx.fillStyle = `rgba(0, 255, 136, ${0.5 + Math.sin(t / 100) * 0.3})`;
        ctx.beginPath();
        ctx.arc(bx - sz * 0.96, by - sz * 0.48, sz * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx + sz * 0.96, by - sz * 0.48, sz * 0.06, 0, Math.PI * 2);
        ctx.fill();

        // Arms (mechanical, heavy, with cannon barrels)
        ctx.fillStyle = flash ? '#fff' : '#1a2a1a';
        const armSwing = Math.sin(t / 220) * sz * 0.06;
        // Left arm
        ctx.fillRect(bx - sz * 1.15, by - sz * 0.5, sz * 0.25, sz * 0.55 + armSwing);
        ctx.strokeStyle = '#00aa66';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx - sz * 1.15, by - sz * 0.5, sz * 0.25, sz * 0.55 + armSwing);
        // Left forearm + cannon
        ctx.fillStyle = flash ? '#fff' : '#142014';
        ctx.fillRect(bx - sz * 1.2, by + sz * 0.05 + armSwing, sz * 0.35, sz * 0.4);
        ctx.fillStyle = '#0a1a0a';
        ctx.fillRect(bx - sz * 1.18, by + sz * 0.45 + armSwing, sz * 0.3, sz * 0.14);
        // Cannon bore glow
        ctx.fillStyle = `rgba(0, 255, 136, ${0.4 + Math.sin(t / 60) * 0.3})`;
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(bx - sz * 1.03, by + sz * 0.52 + armSwing, sz * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Right arm
        ctx.fillStyle = flash ? '#fff' : '#1a2a1a';
        ctx.fillRect(bx + sz * 0.9, by - sz * 0.5, sz * 0.25, sz * 0.55 - armSwing);
        ctx.strokeStyle = '#00aa66';
        ctx.strokeRect(bx + sz * 0.9, by - sz * 0.5, sz * 0.25, sz * 0.55 - armSwing);
        ctx.fillStyle = flash ? '#fff' : '#142014';
        ctx.fillRect(bx + sz * 0.85, by + sz * 0.05 - armSwing, sz * 0.35, sz * 0.4);
        ctx.fillStyle = '#0a1a0a';
        ctx.fillRect(bx + sz * 0.88, by + sz * 0.45 - armSwing, sz * 0.3, sz * 0.14);
        ctx.fillStyle = `rgba(0, 255, 136, ${0.4 + Math.sin(t / 60 + 2) * 0.3})`;
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(bx + sz * 1.03, by + sz * 0.52 - armSwing, sz * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Head (angular, with visor)
        ctx.fillStyle = flash ? '#fff' : '#1a2a1a';
        ctx.beginPath();
        ctx.moveTo(bx - sz * 0.25, by - sz * 0.48);
        ctx.lineTo(bx + sz * 0.25, by - sz * 0.48);
        ctx.lineTo(bx + sz * 0.3, by - sz * 0.78);
        ctx.lineTo(bx, by - sz * 0.9);
        ctx.lineTo(bx - sz * 0.3, by - sz * 0.78);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#00cc66';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Visor (glowing bar)
        ctx.fillStyle = aura;
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 14;
        ctx.fillRect(bx - sz * 0.22, by - sz * 0.72, sz * 0.44, sz * 0.12);
        ctx.shadowBlur = 0;

        // Power core (center chest glow, pulsing)
        const corePulse = 0.5 + Math.sin(t / 80) * 0.3;
        ctx.fillStyle = `rgba(0, 255, 136, ${corePulse})`;
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(bx, by + sz * 0.05, sz * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(bx, by + sz * 0.05, sz * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Antenna
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(bx, by - sz * 0.9);
        ctx.lineTo(bx, by - sz * 1.15);
        ctx.stroke();
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(bx, by - sz * 1.17, sz * 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }


    renderDroneBarrage(sz, t, ctx, bx, by) {
        if (this.droneBarrageActive) {
            const orbitR = sz + 35 + Math.sin(t / 50) * 10;
            // Warning ring
            ctx.strokeStyle = `rgba(0, 255, 136, ${0.2 + Math.sin(t / 40) * 0.15})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 8]);
            ctx.beginPath();
            ctx.arc(bx, by, orbitR + 30, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            // 8 mini drones orbiting and shooting
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2 + t / 200;
                const dx = bx + Math.cos(a) * orbitR;
                const dy = by + Math.sin(a) * orbitR;
                ctx.save();
                ctx.translate(dx, dy);
                ctx.rotate(a + Math.PI / 2);
                // Drone body (diamond shape)
                ctx.fillStyle = `rgba(0, 80, 50, ${0.8 + Math.sin(t / 30 + i) * 0.2})`;
                ctx.beginPath();
                ctx.moveTo(0, -8); ctx.lineTo(6, 0); ctx.lineTo(0, 8); ctx.lineTo(-6, 0);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#00ff88';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                // Drone wings
                ctx.fillStyle = `rgba(0, 200, 100, ${0.5 + Math.sin(t / 20 + i) * 0.3})`;
                ctx.beginPath();
                ctx.moveTo(-6, -2); ctx.lineTo(-14, -6); ctx.lineTo(-10, 0);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(6, -2); ctx.lineTo(14, -6); ctx.lineTo(10, 0);
                ctx.closePath();
                ctx.fill();
                // Drone engine glow
                ctx.fillStyle = `rgba(0, 255, 136, ${0.6 + Math.sin(t / 15 + i * 2) * 0.3})`;
                ctx.beginPath();
                ctx.arc(0, 6, 3, 0, Math.PI * 2);
                ctx.fill();
                // Firing laser toward outward
                const burstPhase = Math.sin(t / 30 + i * Math.PI / 4);
                if (burstPhase > 0.5) {
                    ctx.strokeStyle = `rgba(0, 255, 136, ${(burstPhase - 0.5) * 1.5})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(0, -8);
                    ctx.lineTo(0, -8 - 25 * burstPhase);
                    ctx.stroke();
                    // Laser tip glow
                    ctx.fillStyle = `rgba(180, 255, 200, ${(burstPhase - 0.5)})`;
                    ctx.beginPath();
                    ctx.arc(0, -8 - 25 * burstPhase, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        }
    }

    renderLaserSweep(bx, by, ctx, t) {
        if (this.laserSweepActive) {
            const sweepLen = 350;
            const sx = bx + Math.cos(this.laserSweepAngle) * sweepLen;
            const sy = by + Math.sin(this.laserSweepAngle) * sweepLen;
            // Beam core
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(sx, sy);
            ctx.stroke();
            // Beam glow
            ctx.strokeStyle = `rgba(0, 255, 100, ${0.7 + Math.sin(t / 40) * 0.3})`;
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(sx, sy);
            ctx.stroke();
            // Outer glow
            ctx.strokeStyle = 'rgba(0, 255, 100, 0.12)';
            ctx.lineWidth = 28;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(sx, sy);
            ctx.stroke();
            // Sparks along beam
            for (let i = 0; i < 6; i++) {
                const frac = (i + Math.sin(t / 30 + i)) / 6;
                const spx = bx + (sx - bx) * frac + (Math.random() - 0.5) * 12;
                const spy = by + (sy - by) * frac + (Math.random() - 0.5) * 12;
                ctx.fillStyle = '#aaffdd';
                ctx.beginPath();
                ctx.arc(spx, spy, 2 + Math.random() * 2, 0, Math.PI * 2);
                ctx.fill();
            }
            // Impact flash at end
            const impactGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 20);
            impactGrad.addColorStop(0, 'rgba(200, 255, 200, 0.6)');
            impactGrad.addColorStop(1, 'rgba(0, 255, 100, 0)');
            ctx.fillStyle = impactGrad;
            ctx.beginPath();
            ctx.arc(sx, sy, 20, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderElectricArcs(ctx, t, sz, bx, by) {
        ctx.strokeStyle = `rgba(0, 255, 136, ${0.5 + Math.sin(t / 100) * 0.3})`;
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 6; i++) {
            const startAngle = (t / 250) + i * Math.PI / 3;
            const r = sz + 12 + Math.sin(t / 120 + i) * 10;
            ctx.beginPath();
            ctx.arc(bx, by, r, startAngle, startAngle + Math.PI / 5);
            ctx.stroke();
            // Spark at end of arc
            const sparkA = startAngle + Math.PI / 5;
            ctx.fillStyle = '#88ffcc';
            ctx.beginPath();
            ctx.arc(bx + Math.cos(sparkA) * r, by + Math.sin(sparkA) * r, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderEyeBoss(ctx, t, aura) {
        const sz = this.size;
        const bx = this.x;
        const by = this.y;
        const flash = this.damageFlash > 0;
        // Teleport fade
        if (this.devourerTeleportAlpha < 1) {
            ctx.globalAlpha = this.devourerTeleportAlpha;
        }
        // Void pull visual  black hole with spiral distortion
        this.renderVoidPull(ctx, bx, by, t, sz);
        // Dark mist aura
        this.renderDarkMistAura(t, sz, bx, by, ctx);
        // Shadow
        ctx.fillStyle = 'rgba(30, 0, 50, 0.5)';
        ctx.beginPath();
        ctx.ellipse(bx, by + sz * 0.55, sz * 0.9, sz * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // === ELDRITCH EYE BEAST ===
        // Writhing tentacles (8 around body)
        this.renderTentacles(t, sz, ctx, bx, by);

        // Main eyeball body
        const eGrad = ctx.createRadialGradient(bx, by, 0, bx, by, sz);
        eGrad.addColorStop(0, '#330055');
        eGrad.addColorStop(0.4, '#440077');
        eGrad.addColorStop(0.8, '#220044');
        eGrad.addColorStop(1, '#110022');
        ctx.fillStyle = flash ? '#fff' : eGrad;
        ctx.beginPath();
        ctx.arc(bx, by, sz, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#8800cc';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Eyelid effect (top and bottom)
        ctx.fillStyle = '#1a0033';
        const lidClose = Math.max(0, Math.sin(t / 3000) * 0.15);
        // Top eyelid
        ctx.beginPath();
        ctx.arc(bx, by, sz, Math.PI + 0.3, -0.3);
        ctx.lineTo(bx + sz * Math.cos(-0.3), by + sz * Math.sin(-0.3) + lidClose * sz);
        ctx.quadraticCurveTo(bx, by - sz * 0.6 + lidClose * sz * 2, bx + sz * Math.cos(Math.PI + 0.3), by + sz * Math.sin(Math.PI + 0.3) + lidClose * sz);
        ctx.closePath();
        ctx.fill();
        // Bottom eyelid
        ctx.beginPath();
        ctx.arc(bx, by, sz, 0.3, Math.PI - 0.3);
        ctx.lineTo(bx + sz * Math.cos(Math.PI - 0.3), by + sz * Math.sin(Math.PI - 0.3) - lidClose * sz * 0.5);
        ctx.quadraticCurveTo(bx, by + sz * 0.7 - lidClose * sz, bx + sz * Math.cos(0.3), by + sz * Math.sin(0.3) - lidClose * sz * 0.5);
        ctx.closePath();
        ctx.fill();

        // Veins on the eyeball
        this.renderVeins(ctx, bx, sz, by, t);

        // Iris (tracks player)
        const eyeDir = this.target ? Math.atan2(this.target.y - by, this.target.x - bx) : 0;
        const irisOffset = sz * 0.2;
        const irisX = bx + Math.cos(eyeDir) * irisOffset;
        const irisY = by + Math.sin(eyeDir) * irisOffset;
        // Large iris
        const irisGrad = ctx.createRadialGradient(irisX, irisY, 0, irisX, irisY, sz * 0.55);
        irisGrad.addColorStop(0, '#ff44ff');
        irisGrad.addColorStop(0.3, '#ff00ff');
        irisGrad.addColorStop(0.6, '#9900cc');
        irisGrad.addColorStop(1, '#330044');
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.arc(irisX, irisY, sz * 0.55, 0, Math.PI * 2);
        ctx.fill();
        // Pupil (pulsing)
        const pupilSize = sz * 0.22 + Math.sin(t / 200) * sz * 0.05;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(irisX, irisY, pupilSize, 0, Math.PI * 2);
        ctx.fill();
        // Pupil highlight
        ctx.fillStyle = 'rgba(255, 150, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(irisX - sz * 0.12, irisY - sz * 0.12, sz * 0.08, 0, Math.PI * 2);
        ctx.fill();
        // Second smaller highlight
        ctx.fillStyle = 'rgba(255, 200, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(irisX + sz * 0.06, irisY + sz * 0.08, sz * 0.04, 0, Math.PI * 2);
        ctx.fill();
    }

    renderVeins(ctx, bx, sz, by, t) {
        ctx.strokeStyle = 'rgba(150, 0, 200, 0.4)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(bx + Math.cos(a) * sz * 0.5, by + Math.sin(a) * sz * 0.5);
            const midA = a + Math.sin(t / 500 + i) * 0.3;
            ctx.quadraticCurveTo(
                bx + Math.cos(midA) * sz * 0.75, by + Math.sin(midA) * sz * 0.75,
                bx + Math.cos(a) * sz * 0.93, by + Math.sin(a) * sz * 0.93
            );
            ctx.stroke();
        }
    }

    renderTentacles(t, sz, ctx, bx, by) {
        for (let i = 0; i < 8; i++) {
            const ta = (i / 8) * Math.PI * 2 + Math.sin(t / 400 + i) * 0.2;
            const tlen = sz * 0.8 + Math.sin(t / 200 + i * 1.5) * sz * 0.2;
            ctx.strokeStyle = `rgba(${60 + i * 10}, 0, ${100 + i * 15}, 0.6)`;
            ctx.lineWidth = 4 - i * 0.3;
            const startX = bx + Math.cos(ta) * sz * 0.85;
            const startY = by + Math.sin(ta) * sz * 0.85;
            const ctrlX = bx + Math.cos(ta + Math.sin(t / 150 + i) * 0.3) * (sz + tlen * 0.6);
            const ctrlY = by + Math.sin(ta + Math.sin(t / 150 + i) * 0.3) * (sz + tlen * 0.6);
            const endX = bx + Math.cos(ta + Math.sin(t / 100 + i) * 0.4) * (sz + tlen);
            const endY = by + Math.sin(ta + Math.sin(t / 100 + i) * 0.4) * (sz + tlen);
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
            ctx.stroke();
            // Tentacle tip
            ctx.fillStyle = `rgba(150, 0, 220, 0.4)`;
            ctx.beginPath();
            ctx.arc(endX, endY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderVoidPull(ctx, bx, by, t, sz) {
        if (this.voidPullActive) {
            const pullRadius = 250;
            // Black hole center gradient (dark core)
            const bhGrad = ctx.createRadialGradient(bx, by, 0, bx, by, pullRadius);
            bhGrad.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
            bhGrad.addColorStop(0.15, 'rgba(30, 0, 60, 0.35)');
            bhGrad.addColorStop(0.4, 'rgba(60, 0, 120, 0.15)');
            bhGrad.addColorStop(0.7, 'rgba(80, 0, 160, 0.06)');
            bhGrad.addColorStop(1, 'rgba(60, 0, 100, 0)');
            ctx.fillStyle = bhGrad;
            ctx.beginPath();
            ctx.arc(bx, by, pullRadius, 0, Math.PI * 2);
            ctx.fill();
            // Spiral arms (accretion disc)  3 rotating arms
            this.renderSpiralArms(ctx, t, pullRadius, bx, by);
            // Particles being sucked inward (16 debris)
            this.renderParticles(t, pullRadius, bx, by, ctx);
            // Pulsing event horizon ring
            const horizonPulse = 0.5 + Math.sin(t / 80) * 0.3;
            ctx.strokeStyle = `rgba(180, 0, 255, ${horizonPulse})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(bx, by, sz * 1.4, 0, Math.PI * 2);
            ctx.stroke();
            // Inner glow ring
            ctx.strokeStyle = `rgba(255, 100, 255, ${horizonPulse * 0.6})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(bx, by, sz * 0.9, 0, Math.PI * 2);
            ctx.stroke();
            // Energy lightning bolts inward (4 arcs)
            for (let i = 0; i < 4; i++) {
                const la = (t / 150) + (i * Math.PI / 2);
                const lStartD = pullRadius * 0.8;
                const lEndD = sz * 0.5;
                ctx.strokeStyle = `rgba(200, 100, 255, ${0.4 + Math.sin(t / 40 + i) * 0.2})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                let cx2 = bx + Math.cos(la) * lStartD;
                let cy2 = by + Math.sin(la) * lStartD;
                ctx.moveTo(cx2, cy2);
                // Jagged lightning segments
                for (let seg = 0; seg < 5; seg++) {
                    const segFrac = (seg + 1) / 6;
                    const segD = lStartD - (lStartD - lEndD) * segFrac;
                    const jitter = (Math.sin(t / 20 + i * 5 + seg * 7) * 15);
                    cx2 = bx + Math.cos(la + jitter * 0.01) * segD + Math.cos(la + Math.PI / 2) * jitter;
                    cy2 = by + Math.sin(la + jitter * 0.01) * segD + Math.sin(la + Math.PI / 2) * jitter;
                    ctx.lineTo(cx2, cy2);
                }
                ctx.stroke();
            }
        }
    }

    renderParticles(t, pullRadius, bx, by, ctx) {
        for (let i = 0; i < 16; i++) {
            const seed = i * 97.3;
            const lifePhase = ((t / 5 + seed * 10) % 1500) / 1500; // 0->1 cycle
            const pDist = pullRadius * (1 - lifePhase);
            const pAngle = seed + lifePhase * Math.PI * 2 - t / 400;
            const px = bx + Math.cos(pAngle) * pDist;
            const py = by + Math.sin(pAngle) * pDist;
            const pSize = 2 + (1 - lifePhase) * 4;
            const pAlpha = 0.3 + lifePhase * 0.5;
            ctx.fillStyle = `rgba(${Math.floor(120 + lifePhase * 100)}, 0, ${Math.floor(200 + lifePhase * 55)}, ${pAlpha})`;
            ctx.beginPath();
            ctx.arc(px, py, pSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderSpiralArms(ctx, t, pullRadius, bx, by) {
        for (let arm = 0; arm < 3; arm++) {
            const armOffset = (arm / 3) * Math.PI * 2;
            ctx.beginPath();
            for (let s = 0; s < 40; s++) {
                const frac = s / 40;
                const spiralAngle = armOffset + frac * Math.PI * 3 - t / 300;
                const spiralDist = pullRadius * (1 - frac * 0.85);
                const sx = bx + Math.cos(spiralAngle) * spiralDist;
                const sy = by + Math.sin(spiralAngle) * spiralDist;
                if (s === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
            }
            ctx.strokeStyle = `rgba(150, 0, 255, ${0.3 + Math.sin(t / 100 + arm) * 0.15})`;
            ctx.lineWidth = 3 - 1.5 * 0; // keep consistent
            ctx.stroke();
        }
    }

    renderDarkMistAura(t, sz, bx, by, ctx) {
        for (let i = 0; i < 5; i++) {
            const angle = (t / 700) + (i * Math.PI * 2 / 5);
            const dist = sz + 20 + Math.sin(t / 250 + i * 2) * 15;
            const agx = bx + Math.cos(angle) * dist * 0.5;
            const agy = by + Math.sin(angle) * dist * 0.5;
            const dGrad = ctx.createRadialGradient(agx, agy, 0, agx, agy, 30);
            dGrad.addColorStop(0, 'rgba(80, 0, 120, 0.3)');
            dGrad.addColorStop(1, 'rgba(40, 0, 60, 0)');
            ctx.fillStyle = dGrad;
            ctx.beginPath();
            ctx.arc(agx, agy, 30, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // --- COMMON HEALTH BAR ---
    renderBossHealthBar(ctx, aura) {
        const barWidth = 220;
        const barHeight = 14;
        const barY = this.y - this.size - 65;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(this.x - barWidth / 2 - 3, barY - 3, barWidth + 6, barHeight + 6);
        ctx.fillStyle = '#222';
        ctx.fillRect(this.x - barWidth / 2, barY, barWidth, barHeight);

        // Phase segments
        for (let i = 0; i < this.maxPhases - 1; i++) {
            const segX = this.x - barWidth / 2 + barWidth * this.phaseThresholds[i];
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(segX, barY);
            ctx.lineTo(segX, barY + barHeight);
            ctx.stroke();
        }

        // Health fill
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = aura;
        ctx.fillRect(this.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);

        // Health bar border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x - barWidth / 2, barY, barWidth, barHeight);

        // Boss name with icon
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(this.bossName, this.x, barY - 8);
        ctx.fillText(this.bossName, this.x, barY - 8);

        // Phase indicator
        if (this.phase > 1) {
            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold 10px Arial';
            ctx.fillText(`PHASE ${this.phase}`, this.x, barY + barHeight + 14);
        }
    }
}