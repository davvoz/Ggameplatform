import { BOSS_DEFS, MINIBOSS_DEFS } from '../Enemy.js';
import BossPart from './BossPart.js';
import Enemy from './TheEnemy.js';
import { mono } from '../../FontConfig.js';
import { drawW4Boss, drawW4MiniBoss } from './types/QuantumBossSprites.js';

class MultiBoss {
    constructor(x, y, bossId, canvasWidth, isMiniBoss = false, difficultyConfig = null, level = 1) {
        const defs = isMiniBoss ? MINIBOSS_DEFS : BOSS_DEFS;
        const def = defs[bossId] || defs[1];
        this.bossId = bossId;
        this.def = def;
        this.name = def.name;
        this.canvasWidth = canvasWidth;
        this.score = def.score;
        this.isMiniBoss = isMiniBoss;
        this.difficultyConfig = difficultyConfig || {};

        // Difficulty multipliers
        const hpMult = this.difficultyConfig.bossHpMult || 1;
        const spdMult = this.difficultyConfig.bossSpeedMult || 1;

        // Level-based scaling for bosses/mini-bosses (world-relative)
        // HP: +5% per level, Speed: +1.5% per level
        const worldRelLevel = ((level - 1) % 30) + 1;
        const levelHpMult = 1 + (worldRelLevel - 1) * 0.05;
        const levelSpdMult = 1 + (worldRelLevel - 1) * (level > 30 ? 0.01 : 0.015);

        // Center position
        this.centerX = x + def.totalWidth / 2;
        this.centerY = y;
        this.width = def.totalWidth;
        this.height = def.totalHeight;
        this.position = { x: this.centerX - this.width / 2, y: this.centerY - this.height / 2 };
        this.active = true;
        this.targetY = isMiniBoss ? 100 : 120;

        // ── CINEMATIC ENTRANCE ──
        if (isMiniBoss) {
            // Mini-boss: simple slide-in, no warning phase
            this.entering = true;
            this.enterPhase = 1; // skip warning, start at descend
            this.enterTime = 2; // start at phase 1 time
            this.enterPartsSpread = 0;
        } else {
            // Phases: 0=warning(0-2s) 1=descend(2-3.5s) 2=deploy(3.5-4.5s) 3=active
            this.entering = true;
            this.enterPhase = 0;
            this.enterTime = 0;
            this.enterPartsSpread = 0;
        }

        // Movement
        this.speed = def.speed * spdMult * levelSpdMult;
        this.moveDir = 1;
        this.moveTimer = 0;

        // Total HP (all parts combined for health bar display)
        // Apply difficulty HP multiplier and level scaling to each part
        const frMult = this.difficultyConfig.enemyFireRateMult || 1;
        const bsMult = this.difficultyConfig.enemyBulletSpeedMult || 1;
        this.parts = def.parts.map(p => {
            const partCfg = { ...p };
            partCfg.health = Math.ceil(p.health * hpMult * levelHpMult);
            if (partCfg.shootRate) partCfg.shootRate = partCfg.shootRate * frMult;
            if (partCfg.bulletSpeed) partCfg.bulletSpeed = partCfg.bulletSpeed * bsMult;
            return new BossPart(partCfg);
        });
        this.maxHealth = this.parts.reduce((s, p) => s + p.maxHealth, 0);
        this.coreParts = this.parts.filter(p => p.isCore);

        // Phase tracking (enrage when HP low)
        this.enraged = false;
        this.dropChance = 1;

        // Initialize part positions so they don't flash at (0,0) on the first render frame
        this._updatePartPositions();
    }

    get health() {
        return this.parts.reduce((s, p) => p.active ? s + p.health : s, 0);
    }

    update(deltaTime, game) {
        const dt = deltaTime * (game.timeScale || 1);
        this.moveTimer += dt;

        // ── CINEMATIC ENTRY ──
        if (this.entering) {
            if (this._updateCinematicEntry(dt)) return;
        }

        // Enrage check (below 30% HP → faster shooting)
        this._checkEnrage();

        // Movement pattern
        this._applyMovement(dt, game);

        // ── Special Mechanics by World ──
        this._updateSpecialAbilities(dt, game);

        // ── Clamp boss to screen ──
        const bossMargin = this.width * 0.4;
        this.centerX = Math.max(bossMargin, Math.min(this.canvasWidth - bossMargin, this.centerX));

        // Update part positions
        this._updatePartPositions();

        // ── Update parts ──
        this._updateParts(dt, game);

        // Sync position for Game.js compatibility
        this.position.x = this.centerX - this.width / 2;
        this.position.y = this.centerY - this.height / 2;
    }

    _updateCinematicEntry(dt) {
        this.enterTime += dt;

        // Phase 0: WARNING (0-2s) — boss stays off-screen
        if (this.enterPhase === 0) {
            if (this.enterTime >= 2) {
                this.enterPhase = 1;
            }
            this._updatePartPositions();
            this._syncPosition();
            return true;
        }

        // Phase 1: DESCEND (2-3.5s) — slide in, parts clustered at center
        if (this.enterPhase === 1) {
            const slideProgress = Math.min(1, (this.enterTime - 2) / 1.5);
            const eased = 1 - Math.pow(1 - slideProgress, 3);
            this.centerY = -200 + (this.targetY - (-200)) * eased;
            this.enterPartsSpread = 0;

            if (slideProgress >= 1) {
                this.enterPhase = 2;
            }
            this._updatePartPositions();
            this._syncPosition();
            return true;
        }

        // Phase 2: DEPLOY (3.5-4.5s) — parts spread to final positions
        if (this.enterPhase === 2) {
            const deployProgress = Math.min(1, (this.enterTime - 3.5) / 1);
            const t = deployProgress;
            this.enterPartsSpread = t < 1
                ? 1 - Math.pow(2, -10 * t) * Math.cos((t * 10 - 0.75) * (2 * Math.PI / 3))
                : 1;

            if (deployProgress >= 1) {
                this.enterPhase = 3;
                this.entering = false;
                this.enterPartsSpread = 1;
            }
            this._updatePartPositions();
            this._syncPosition();
            return true;
        }
        return false;
    }

    _syncPosition() {
        this.position.x = this.centerX - this.width / 2;
        this.position.y = this.centerY - this.height / 2;
    }

    _checkEnrage() {
        const hpRatio = this.health / this.maxHealth;
        if (!this.enraged && hpRatio < 0.3) {
            this.enraged = true;
            for (const part of this.parts) {
                if (part.canShoot) part.shootRate *= 0.6;
            }
        }
    }

    _updateSpecialAbilities(dt, game) {
        if (!this.isMiniBoss && this.bossId >= 13 && this.bossId <= 18) {
            this._updateW3BossAbility(dt, game);
        }
        if (!this.isMiniBoss && this.bossId >= 19 && this.bossId <= 24) {
            this._updateW4BossAbility(dt, game);
        }
        if (this.isMiniBoss && this.def.w4miniboss) {
            this._updateW4MiniBossAbility(dt, game);
        }
    }

    _updateParts(dt, game) {
        // Tick hit-flash for ALL parts
        for (const part of this.parts) {
            if (part.hitFlash > 0) part.hitFlash = Math.max(0, part.hitFlash - dt * 4);
        }

        // Part shooting
        for (const part of this.parts) {
            if (!part.active || !part.canShoot) continue;
            part.shootTimer -= dt;
            if (part.shootTimer <= 0) {
                part.shoot(game, this.moveTimer);
                part.shootTimer = part.shootRate;
            }
        }
    }

    _applyMovement(dt, game) {
        switch (this.def.movePattern) {
            case 'slowSweep':
                this.centerX += this.moveDir * this.speed * 0.7 * dt;
                if (this.centerX < 100 || this.centerX > this.canvasWidth - 100) this.moveDir *= -1;
                break;
            case 'weave':
                this.centerX += Math.sin(this.moveTimer * 0.8) * this.speed * 1.2 * dt;
                this.centerY = this.targetY + Math.sin(this.moveTimer * 0.5) * 25;
                break;
            case 'figure8':
                this.centerX = this.canvasWidth / 2 + Math.sin(this.moveTimer * 0.6) * 100;
                this.centerY = this.targetY + Math.sin(this.moveTimer * 1.2) * 30;
                break;
            case 'chase': {
                if (game.player?.active) {
                    const px = game.player.position.x + game.player.width / 2;
                    const diff = px - this.centerX;
                    this.centerX += Math.sign(diff) * Math.min(Math.abs(diff), this.speed * dt);
                }
                this.centerY = this.targetY + Math.sin(this.moveTimer * 1.5) * 20;
                break;
            }
            case 'erratic':
                this.centerX += Math.sin(this.moveTimer * 1.2) * this.speed * dt;
                this.centerX += Math.cos(this.moveTimer * 0.7) * this.speed * 0.5 * dt;
                this.centerY = this.targetY + Math.sin(this.moveTimer * 0.9) * 35;
                // Clamp
                this.centerX = Math.max(100, Math.min(this.canvasWidth - 100, this.centerX));
                break;
            case 'zigzag':
                this.centerX += this.moveDir * this.speed * dt;
                this.centerY = this.targetY + Math.sin(this.moveTimer * 2.5) * 18;
                if (this.centerX < 60 || this.centerX > this.canvasWidth - 60) this.moveDir *= -1;
                break;
            case 'sweep':
            default:
                this.centerX += this.moveDir * this.speed * dt;
                if (this.centerX < 80 || this.centerX > this.canvasWidth - 80) this.moveDir *= -1;
        }
    }

    _updatePartPositions() {
        const spread = this.enterPartsSpread;
        for (const part of this.parts) {
            if (part.active) {
                // During entrance, parts collapse toward center
                const origOX = part.offsetX;
                const origOY = part.offsetY;
                if (spread < 1) {
                    part.offsetX = origOX * spread;
                    part.offsetY = origOY * spread;
                }
                part.updatePosition(this.centerX, this.centerY, this.moveTimer);
                // Restore original offsets
                part.offsetX = origOX;
                part.offsetY = origOY;
            }
        }
    }

    // ── W3 Boss Special Abilities ──
    _updateW3BossAbility(dt, game) {
        if (!this._w3Timer) this._w3Timer = 0;
        this._w3Timer += dt;

        switch (this.bossId) {
            case 13:
                this._updateW3Boss13(dt, game);
                break;
            case 14:
                this._updateW3Boss14(dt, game);
                break;
            case 15:
                this._updateW3Boss15(dt, game);
                break;
            case 16:
                this._updateW3Boss16(dt, game);
                break;
            case 17:
                this._updateW3Boss17(dt, game);
                break;
            case 18:
                this._updateW3Boss18(dt, game);
                break;
        }
    }

    _updateW3Boss13(dt, game) {
        // Corrupted Compiler — "Syntax Shield": every 8s, becomes invulnerable for 2.5s
        if (!this._shieldCooldown) this._shieldCooldown = 5;
        this._shieldCooldown -= dt;
        if (this._shieldCooldown <= 0 && !this._syntaxShieldActive) {
            this._syntaxShieldActive = true;
            this._syntaxShieldTimer = 2.5;
        }
        if (this._syntaxShieldActive) {
            this._syntaxShieldTimer -= dt;
            const core = this.parts.find(p => p.role === 'core' && p.active);
            if (core) core._shielded = true;
            if (this._syntaxShieldTimer <= 0) {
                this._syntaxShieldActive = false;
                this._shieldCooldown = 8;
                const core2 = this.parts.find(p => p.role === 'core' && p.active);
                if (core2) core2._shielded = false;
            }
        }
    }

    _updateW3Boss14(dt, game) {
        // Fragment King — "Shard Burst": every 7s spawns 3 fast fragment_shards
        if (!this._burstCooldown) this._burstCooldown = 6;
        this._burstCooldown -= dt;
        if (this._burstCooldown <= 0) {
            this._burstCooldown = 7;
            if (game.entityManager) {
                const level = game.levelManager ? game.levelManager.currentLevel : 1;
                for (let i = 0; i < 3; i++) {
                    const sx = this.centerX + (i - 1) * 50;
                    const sy = this.centerY + 60;
                    const shard = new Enemy(sx, sy, 'fragment_shard', 'sine', this.canvasWidth, game.difficulty, level);
                    shard.speed *= 1.5;
                    shard._isShard = true;
                    shard.config = { ...shard.config, w3behaviour: null };
                    game.entityManager.enemies.push(shard);
                }
                game.particles.emit(this.centerX, this.centerY + 40, 'hit', 12);
            }
        }
    }

    _updateW3Boss15(dt, game) {
        // Mirror Engine — "Reflect Mode": every 10s, for 3s all player bullets near the boss get deflected downward
        if (!this._reflectCooldown) this._reflectCooldown = 7;
        this._reflectCooldown -= dt;
        
        if (this._reflectCooldown <= 0 && !this._reflectActive) {
            this._reflectActive = true;
            this._reflectTimer = 3;
        }
        
        if (this._reflectActive) {
            this._reflectTimer -= dt;
            this._deflectNearbyBullets(game);
            
            if (this._reflectTimer <= 0) {
                this._reflectActive = false;
                this._reflectCooldown = 10;
            }
        }
    }

    _deflectNearbyBullets(game) {
        if (!game.entityManager) return;
        for (const b of game.entityManager.bullets) {
            if (!b.active || b.tag !== 'player') continue;
            const dx = (b.position.x + b.width / 2) - this.centerX;
            const dy = (b.position.y + b.height / 2) - this.centerY;
            if (dx * dx + dy * dy < 8100) {
                b.velocity.y = Math.abs(b.velocity.y);
                b.tag = 'enemy';
            }
        }
    }

    _updateW3Boss16(dt, game) {
        // Chaos Generator — "Warp Dash": every 6s teleports to random X, leaves damage trail
        if (!this._warpCooldown) this._warpCooldown = 4;
        this._warpCooldown -= dt;
        if (this._warpCooldown <= 0) {
            this._warpCooldown = 6;
            game.particles.emit(this.centerX, this.centerY, 'explosion', 10);
            this.centerX = 100 + Math.random() * (this.canvasWidth - 200);
            game.particles.emit(this.centerX, this.centerY, 'hit', 8);
            const core = this.parts.find(p => p.role === 'core' && p.active);
            if (core) {
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const bx = core.worldX + core.width / 2;
                    const by = core.worldY + core.height / 2;
                    game.spawnBullet(bx, by, Math.cos(angle) * 120, Math.sin(angle) * 120, 'enemy');
                }
            }
        }
    }

    _updateW3Boss17(dt, game) {
        // Data Devourer — "Absorb Phase": every 9s, for 2s, bullets hitting core HEAL it
        if (!this._absorbCooldown) this._absorbCooldown = 6;
        this._absorbCooldown -= dt;
        if (this._absorbCooldown <= 0 && !this._absorbActive) {
            this._absorbActive = true;
            this._absorbTimer = 2;
        }
        if (this._absorbActive) {
            this._absorbTimer -= dt;
            const core = this.parts.find(p => p.role === 'core' && p.active);
            if (core) core._absorbing = true;
            if (this._absorbTimer <= 0) {
                this._absorbActive = false;
                this._absorbCooldown = 9;
                const core2 = this.parts.find(p => p.role === 'core' && p.active);
                if (core2) core2._absorbing = false;
            }
        }
    }

    _updateW3Boss18(dt, game) {
        // The Kernel — "Phase Shift": changes move pattern at 66% and 33% HP
        const ratio = this.health / this.maxHealth;
        if (!this._phase) this._phase = 1;
        if (this._phase === 1 && ratio < 0.66) {
            this._transitionToPhase2(game);
        }
        if (this._phase === 2 && ratio < 0.33) {
            this._transitionToPhase3(game);
        }
    }

    _transitionToPhase2(game) {
        this._phase = 2;
        this.def = { ...this.def, movePattern: 'chase' };
        this.speed *= 1.2;
        this._adjustPartShootRate(0.75);
        game.particles.emit(this.centerX, this.centerY, 'explosion', 15);
    }

    _transitionToPhase3(game) {
        this._phase = 3;
        this.def = { ...this.def, movePattern: 'erratic' };
        this.speed *= 1.3;
        this._adjustPartShootRate(0.7);
        game.particles.emit(this.centerX, this.centerY, 'explosion', 20);
        this._spawnPhase3Drones(game);
    }

    _adjustPartShootRate(multiplier) {
        for (const p of this.parts) {
            if (p.canShoot && p.active) p.shootRate *= multiplier;
        }
    }

    _spawnPhase3Drones(game) {
        if (!game.entityManager) return;
        const level = game.levelManager ? game.levelManager.currentLevel : 1;
        for (let i = 0; i < 2; i++) {
            const sx = this.centerX + (i === 0 ? -80 : 80);
            const drone = new Enemy(sx, this.centerY + 80, 'glitch_drone', 'glitch_blink', this.canvasWidth, game.difficulty, level);
            game.entityManager.enemies.push(drone);
        }
    }

    /**
     * Deal damage to a specific part. Returns { partDestroyed, bossKilled, part }.
     */
    damagepart(partIndex, amount, game) {
        const part = this.parts[partIndex];
        if (!part?.active) return { partDestroyed: false, bossKilled: false, part: null };

        const destroyed = part.takeDamage(amount);

        if (destroyed) {
            // Part destruction explosion
            game.particles.emit(
                part.worldX + part.width / 2,
                part.worldY + part.height / 2,
                'explosion', 12
            );
        }

        // Check if all cores destroyed
        const coreAlive = this.coreParts.some(c => c.active);
        if (!coreAlive) {
            this.active = false;
            return { partDestroyed: destroyed, bossKilled: true, part };
        }

        return { partDestroyed: destroyed, bossKilled: false, part };
    }

    /**
     * Legacy takeDamage — finds the best target part and damages it.
     * Priority: shields → turrets → arms → core
     */
    takeDamage(amount, game) {
        // Find first active target by priority
        const priorities = ['shield', 'turret', 'arm', 'weakpoint', 'core'];
        for (const role of priorities) {
            const candidates = this.parts.filter(p => p.active && p.role === role);
            if (candidates.length > 0) {
                const target = candidates[Math.floor(Math.random() * candidates.length)];
                const idx = this.parts.indexOf(target);
                const result = this.damagepart(idx, amount, game);
                return result.bossKilled;
            }
        }
        return false;
    }

    /**
     * Find which part a bullet at (bx, by) hits. Returns part index or -1.
     */
    getHitPart(bx, by) {
        // Check non-core parts first (so shields/turrets absorb hits)
        for (let i = 0; i < this.parts.length; i++) {
            const p = this.parts[i];
            if (!p.active || p.isCore) continue;
            if (p.containsPoint(bx, by)) return i;
        }
        // Then core
        for (let i = 0; i < this.parts.length; i++) {
            const p = this.parts[i];
            if (!p.active || !p.isCore) continue;
            if (p.containsPoint(bx, by)) return i;
        }
        return -1;
    }

    /**
     * Circle collision with another entity — checks all active parts.
     */
    collidesWithCircle(other) {
        const otherCX = other.position.x + other.width / 2;
        const otherCY = other.position.y + other.height / 2;
        const otherR = Math.min(other.width, other.height) / 2;
        for (const part of this.parts) {
            if (!part.active) continue;
            if (part.collidesCircle(otherCX, otherCY, otherR)) return true;
        }
        return false;
    }

    render(ctx, assets) {
        if (!this.active && this.health > 0) return;
        // Don't render during warning phase
        if (this.enterPhase === 0) return;

        ctx.save();

        // ── ENTRANCE EFFECTS ──
        if (this.entering) {
            this._renderEntranceEffects(ctx);
        }

        // ── W4 BOSS / MINI-BOSS: fully custom rendering ──
        this._renderBody(ctx, assets);

        // ── HEALTH BAR & LABELS ──
        const barCoords = this._renderHealthBar(ctx);

        // ── ABILITY INDICATORS ──
        this._renderAbilityIndicators(ctx, barCoords.barY);

        ctx.restore();
    }

    _renderEntranceEffects(ctx) {
        // Intense pulsing aura during descent/deploy
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const pulse = 0.5 + 0.5 * Math.sin(this.enterTime * 8);
        const auraSize = this.width * (0.6 + this.enterPartsSpread * 0.4);
        ctx.globalAlpha = (0.12 + pulse * 0.08) * (this.enterPhase === 2 ? 1.5 : 1);
        const entryAura = ctx.createRadialGradient(
            this.centerX, this.centerY, 10,
            this.centerX, this.centerY, auraSize
        );
        entryAura.addColorStop(0, '#ffffff');
        entryAura.addColorStop(0.3, this.def.color);
        entryAura.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = entryAura;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, auraSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Energy lines converging to boss during deploy
        if (this.enterPhase === 2) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.3 * (1 - this.enterPartsSpread);
            ctx.strokeStyle = this.def.color;
            ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 / 8) * i + this.enterTime * 2;
                const r1 = 150;
                const r2 = 20;
                ctx.beginPath();
                ctx.moveTo(this.centerX + Math.cos(angle) * r1,
                    this.centerY + Math.sin(angle) * r1);
                ctx.lineTo(this.centerX + Math.cos(angle) * r2,
                    this.centerY + Math.sin(angle) * r2);
                ctx.stroke();
            }
            ctx.restore();
        }

        // ── W4 quantum warp-in overlay ──
        const _isW4 = (!this.isMiniBoss && this.bossId >= 19 && this.bossId <= 24)
            || (this.isMiniBoss && this.def.w4miniboss);
        if (_isW4 && this.enterPhase >= 1) {
            this._renderQuantumWarpIn(ctx);
        }
    }

    _renderBody(ctx, assets) {
        const isW4Boss = !this.isMiniBoss && this.bossId >= 19 && this.bossId <= 24;
        const isW4Mini = this.isMiniBoss && this.def.w4miniboss;
        if (isW4Boss || isW4Mini) {
            const handled = isW4Boss
                ? drawW4Boss(ctx, this, this.moveTimer)
                : drawW4MiniBoss(ctx, this, this.moveTimer);
            if (!handled) {
                this._renderGenericBody(ctx, assets);
            }
        } else {
            this._renderGenericBody(ctx, assets);
        }
    }

    _renderHealthBar(ctx) {
        const barW = (this.isMiniBoss ? this.width + 10 : this.width + 30);
        const barH = this.isMiniBoss ? 7 : 10;
        const barX = this.centerX - barW / 2;
        const barY = this.centerY - this.height / 2 - (this.isMiniBoss ? 18 : 24);
        
        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 4);
        ctx.fill();
        
        // Health fill
        const hpRatio = this.health / this.maxHealth;
        const isMinValue = hpRatio > 0.25 ? '#ffaa00' : '#ff4444';
        const barColor = hpRatio > 0.5 ? '#44ff44' : isMinValue;
        if (hpRatio > 0) {
            const hpGrad = ctx.createLinearGradient(barX, barY, barX + barW * hpRatio, barY);
            hpGrad.addColorStop(0, barColor);
            hpGrad.addColorStop(1, '#ffffff66');
            ctx.fillStyle = hpGrad;
            ctx.beginPath();
            ctx.roundRect(barX + 1, barY + 1, (barW - 2) * hpRatio, barH - 2, 3);
            ctx.fill();
        }
        
        // Border
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 4);
        ctx.stroke();

        // Part count indicators
        const activeParts = this.parts.filter(p => p.active && !p.isCore).length;
        const totalParts = this.parts.filter(p => !p.isCore).length;

        // Boss / mini-boss label
        const labelPrefix = this.isMiniBoss ? '★ ' : '';
        const isNotEnrageValue = (this.isMiniBoss ? 'rgba(255,220,100,0.7)' : 'rgba(255,255,255,0.6)');
        ctx.fillStyle = this.enraged ? '#ff4444' : isNotEnrageValue;
        ctx.font = this.isMiniBoss ? mono(9) : mono(10);
        ctx.textAlign = 'center';
        ctx.fillText(`${labelPrefix}${this.name.toUpperCase()} [${activeParts}/${totalParts}]`, this.centerX, barY - 4);

        // Enrage indicator
        if (this.enraged) {
            ctx.font = mono(9);
            ctx.fillStyle = '#ff2222';
            ctx.fillText('⚠ ENRAGED', this.centerX, barY - 14);
        }

        return { barX, barY, barW, barH };
    }

    _renderAbilityIndicators(ctx, barY) {
        // ── W3 Boss ability indicators ──
        if (!this.isMiniBoss && this.bossId >= 13) {
            this._renderW3AbilityIndicators(ctx, barY);
        }
    }

    _renderW3AbilityIndicators(ctx, barY) {
        // Boss 13: Syntax Shield glow
        if (this._syntaxShieldActive) {
            ctx.save();
            ctx.globalAlpha = 0.25 + 0.15 * Math.sin(Date.now() * 0.01);
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 4]);
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, this.width * 0.45, 0, Math.PI * 2);
            ctx.stroke();
            ctx.font = mono(8);
            ctx.fillStyle = '#00ffff';
            ctx.textAlign = 'center';
            ctx.setLineDash([]);
            ctx.fillText('SHIELD', this.centerX, barY - (this.enraged ? 24 : 14));
            ctx.restore();
        }
        
        // Boss 15: Reflect Mode indicator
        if (this._reflectActive) {
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = '#ccccff';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, 90, 0, Math.PI * 2);
            ctx.stroke();
            ctx.font = mono(8);
            ctx.fillStyle = '#ccccff';
            ctx.globalAlpha = 0.8;
            ctx.textAlign = 'center';
            ctx.setLineDash([]);
            ctx.fillText('REFLECT', this.centerX, barY - (this.enraged ? 24 : 14));
            ctx.restore();
        }
        
        // Boss 17: Absorb indicator
        if (this._absorbActive) {
            ctx.save();
            ctx.globalAlpha = 0.2 + 0.1 * Math.sin(Date.now() * 0.008);
            ctx.fillStyle = '#8844ff';
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, this.width * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = mono(8);
            ctx.fillStyle = '#cc88ff';
            ctx.globalAlpha = 0.9;
            ctx.textAlign = 'center';
            ctx.fillText('ABSORB', this.centerX, barY - (this.enraged ? 24 : 14));
            ctx.restore();
        }
    }

    /** Generic body render — aura, parts, connection lines (used by W1-W3) */
    /** W4 quantum warp-in visual — dimension rift + particle storm */
    _renderQuantumWarpIn(ctx) {
        const t = this.enterTime;
        const cx = this.centerX, cy = this.centerY;
        const col = this.def.color;
        const TAU = Math.PI * 2;

        ctx.save();
        // Phase 1: expanding dimension rift (vertical tear)
        const riftOpen = Math.min(1, t * 0.6);
        const riftH = this.height * 0.8 * riftOpen;
        const riftW = 4 + riftOpen * (this.width * 0.35);

        // Dark rift backdrop
        ctx.globalAlpha = 0.6 * riftOpen;
        ctx.fillStyle = '#000022';
        ctx.beginPath();
        ctx.ellipse(cx, cy, riftW, riftH * 0.5, 0, 0, TAU);
        ctx.fill();

        // Rift edge glow
        ctx.globalAlpha = 0.7 * riftOpen;
        ctx.strokeStyle = col;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = col;
        ctx.shadowBlur = 15;
        for (let side = -1; side <= 1; side += 2) {
            ctx.beginPath();
            const segs = 16;
            for (let i = 0; i <= segs; i++) {
                const f = i / segs;
                const yp = cy - riftH * 0.5 + riftH * f;
                const wobble = Math.sin(f * Math.PI * 5 + t * 10) * 2.5;
                const xp = cx + side * riftW + wobble;
                i === 0 ? ctx.moveTo(xp, yp) : ctx.lineTo(xp, yp);
            }
            ctx.stroke();
        }
        ctx.shadowBlur = 0;

        // Particle storm spiraling inward
        if (riftOpen > 0.4) {
            ctx.globalCompositeOperation = 'lighter';
            const count = 24;
            for (let i = 0; i < count; i++) {
                const a = TAU / count * i + t * 3;
                const distFactor = 1 - Math.min(1, (riftOpen - 0.4) * 2);
                const dist = (50 + i * 4) * (0.3 + distFactor * 0.7);
                const px = cx + Math.cos(a) * dist;
                const py = cy + Math.sin(a) * dist * 0.5;
                ctx.globalAlpha = 0.3 * (1 - distFactor) * riftOpen;
                ctx.fillStyle = i % 3 === 0 ? '#ffffff' : col;
                ctx.beginPath();
                ctx.arc(px, py, 1.5 + Math.sin(t * 8 + i) * 0.8, 0, TAU);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    _renderGenericBody(ctx, assets) {
        // Menacing aura (normal)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.06 + 0.03 * Math.sin(this.moveTimer * 3);
        const auraGrad = ctx.createRadialGradient(this.centerX, this.centerY, 20, this.centerX, this.centerY, this.width * 0.5);
        auraGrad.addColorStop(0, this.def.color);
        auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.width * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Render parts: arms first, then shields, then turrets, then core on top
        const order = ['arm', 'shield', 'turret', 'weakpoint', 'core'];
        for (const role of order) {
            for (const part of this.parts) {
                if (part.role === role) part.render(ctx, assets);
            }
        }

        // Connection lines between core and active orbiting turrets
        const core0 = this.coreParts[0];
        if (core0?.active) {
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.strokeStyle = this.def.color;
            ctx.lineWidth = 1;
            for (const part of this.parts) {
                if (!part.active || part.isCore || part.orbitRadius <= 0) continue;
                ctx.beginPath();
                ctx.moveTo(this.centerX, this.centerY);
                ctx.lineTo(part.worldX + part.width / 2, part.worldY + part.height / 2);
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  W4 BOSS ABILITIES (bossId 19-24)
    // ═══════════════════════════════════════════════════════════════
    _updateW4BossAbility(dt, game) {
        switch (this.bossId) {
            case 19:
                this._updateW4Boss19(dt, game);
                break;
            case 20:
                this._updateW4Boss20(dt, game);
                break;
            case 21:
                this._updateW4Boss21(dt, game);
                break;
            case 22:
                this._updateW4Boss22(dt, game);
                break;
            case 23:
                this._updateW4Boss23(dt, game);
                break;
            case 24:
                this._updateW4Boss24(dt, game);
                break;
        }
    }

    _updateW4Boss19(dt, game) {
        // Proton Crusher — Quark Confinement: when a core dies, 5s timer to reform it at 30% HP
        if (!this._confinementTimer) this._confinementTimer = 0;
        if (this._confinementTimer > 0) {
            this._confinementTimer -= dt;
            if (this._confinementTimer <= 0) {
                // Revive one dead core
                const dead = this.coreParts.find(c => !c.active);
                if (dead) {
                    dead.active = true;
                    dead.hp = Math.ceil(dead.maxHp * 0.3);
                    game.particles.emit(dead.worldX + dead.width / 2, dead.worldY + dead.height / 2, 'hit', 10);
                }
            }
        } else {
            // Check if a core just died
            const deadCore = this.coreParts.find(c => !c.active);
            const anyAlive = this.coreParts.some(c => c.active);
            if (deadCore && anyAlive) {
                this._confinementTimer = 5;
            }
        }
    }

    _updateW4Boss20(dt, game) {
        // Electroweak Unifier — Phase Toggle: every 8s switches EM/Weak, changing turret behaviour
        if (!this._electroweakPhase) this._electroweakPhase = 'em';
        if (!this._phaseCooldown) this._phaseCooldown = 8;
        this._phaseCooldown -= dt;
        if (this._phaseCooldown <= 0) {
            this._electroweakPhase = this._electroweakPhase === 'em' ? 'weak' : 'em';
            this._phaseCooldown = 8;
            // EM = fast aimed shots; Weak = slow radial bursts
            for (const p of this.parts) {
                if (p.role !== 'turret' || !p.active) continue;
                if (this._electroweakPhase === 'em') {
                    p.shootRate = p._baseShootRate * 0.7;
                    p.shootPattern = 'aimed';
                } else {
                    p.shootRate = p._baseShootRate * 1.4;
                    p.shootPattern = 'radial';
                }
            }
            game.particles.emit(this.centerX, this.centerY, 'hit', 8);
        }
    }

    _updateW4Boss21(dt, game) {
        // Gluon Overlord — Color Charge: paired turrets share damage 50% (same-color resist)
        // If one turret in a pair is hit, the other absorbs half the damage
        // This is passive — handled via damage routing in damagepart override below
    }

    _updateW4Boss22(dt, game) {
        // Higgs Manifestation — Mass Well: every 10s, for 3s pulls player toward boss center
        if (!this._massWellCooldown) this._massWellCooldown = 7;
        this._massWellCooldown -= dt;
        if (this._massWellCooldown <= 0 && !this._massWellActive) {
            this._massWellActive = true;
            this._massWellTimer = 3;
        }
        if (this._massWellActive) {
            this._massWellTimer -= dt;
            // Pull player toward boss
            if (game.player?.active) {
                const px = game.player.position.x + game.player.width / 2;
                const py = game.player.position.y + game.player.height / 2;
                const dx = this.centerX - px;
                const dy = this.centerY - py;
                const dist = Math.hypot(dx, dy) || 1;
                const pullForce = 60;
                game.player.position.x += (dx / dist) * pullForce * dt;
                game.player.position.y += (dy / dist) * pullForce * dt;
            }
            if (this._massWellTimer <= 0) {
                this._massWellActive = false;
                this._massWellCooldown = 10;
            }
        }
    }

    _updateW4Boss23(dt, game) {
        // Antimatter Sovereign — Damage Balance: tracks damage to each core;
        // if one core takes 40+ more damage than the other, it heals 20%
        if (this._damageBalance === undefined) this._damageBalance = 0;
        // Balance resets toward 0 over time
        this._damageBalance *= (1 - dt * 0.2);
    }

    _updateW4Boss24(dt, game) {
        // Grand Unified Theory — Force Cycling: every 6s cycles through 4 forces
        // Each force changes boss behaviour
        if (this._activeForce === undefined) this._activeForce = 0;
        if (!this._forceCooldown) this._forceCooldown = 6;
        this._forceCooldown -= dt;
        if (this._forceCooldown <= 0) {
            this._activeForce = (this._activeForce + 1) % 4;
            this._forceCooldown = 6;
            // 0=Strong: high damage, slow
            // 1=EM: fast shots, medium
            // 2=Weak: radial bursts
            // 3=Gravity: chase player
            for (const p of this.parts) {
                if (!p.active || !p.canShoot) continue;
                switch (this._activeForce) {
                    case 0: p.shootRate = p._baseShootRate * 1.5; break;
                    case 1: p.shootRate = p._baseShootRate * 0.6; break;
                    case 2: p.shootRate = p._baseShootRate * 1; p.shootPattern = 'radial'; break;
                    case 3: p.shootRate = p._baseShootRate * 0.8; p.shootPattern = 'aimed'; break;
                }
            }
            game.particles.emit(this.centerX, this.centerY, 'hit', 12);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  W4 MINI-BOSS ABILITIES
    // ═══════════════════════════════════════════════════════════════
    _updateW4MiniBossAbility(dt, game) {
        const ability = this.def.w4miniboss;
        switch (ability) {
            case 'charmPhase':
                this._updateCharmPhase(dt);
                break;
            case 'strangeOscillation':
                this._updateStrangeOscillation(dt);
                break;
            case 'resonanceShield':
                // Top Resonance — Rotating shield wall: shields orbit; there's a gap to shoot through
                // This is mostly visual — the orbit already creates gaps. We add shield-hit immunity.
                break;
            case 'decay':
                this._updateDecay(dt, game);
                break;
        }
    }

    _updateCharmPhase(dt) {
        // Charm Quark — Color Phase: every 4s cycles R/G/B, each color changes shot pattern
        if (this._charmPhase === undefined) this._charmPhase = 0;
        if (!this._charmCooldown) this._charmCooldown = 4;
        this._charmCooldown -= dt;
        if (this._charmCooldown <= 0) {
            this._charmPhase = (this._charmPhase + 1) % 3;
            this._charmCooldown = 4;
            const patterns = ['aimed', 'spread', 'radial'];
            for (const p of this.parts) {
                if (p.canShoot && p.active) p.shootPattern = patterns[this._charmPhase];
            }
        }
    }

    _updateStrangeOscillation(dt) {
        // Strange Oscillator — 3-state cycle: Normal(5s), Rapid-Fire(3s), Invulnerable(2s)
        if (this._oscillationState === undefined) this._oscillationState = 0;
        if (!this._oscTimer) this._oscTimer = 5;
        this._oscTimer -= dt;
        if (this._oscTimer <= 0) {
            this._oscillationState = (this._oscillationState + 1) % 3;
            switch (this._oscillationState) {
                case 0:
                    this._applyOscillationNormal();
                    break;
                case 1:
                    this._applyOscillationRapid();
                    break;
                case 2:
                    this._applyOscillationInvulnerable();
                    break;
            }
        }
    }

    _applyOscillationNormal() {
        this._oscTimer = 5;
        for (const p of this.parts) {
            if (p.canShoot) p.shootRate = p._baseShootRate;
            if (p.isCore) p._shielded = false;
        }
    }

    _applyOscillationRapid() {
        this._oscTimer = 3;
        for (const p of this.parts) {
            if (p.canShoot) p.shootRate = p._baseShootRate * 0.4;
        }
    }

    _applyOscillationInvulnerable() {
        this._oscTimer = 2;
        for (const p of this.parts) {
            if (p.isCore) p._shielded = true;
            if (p.canShoot) p.shootRate = p._baseShootRate * 2;
        }
    }

    _updateDecay(dt, game) {
        // Bottom Decayer — at <25% HP, splits into 2 smaller enemies
        const ratio = this.health / this.maxHealth;
        if (ratio < 0.25 && !this._decayed) {
            this._decayed = true;
            if (game.entityManager) {
                const level = game.levelManager ? game.levelManager.currentLevel : 1;
                for (let i = 0; i < 2; i++) {
                    const sx = this.centerX + (i === 0 ? -40 : 40);
                    const frag = new Enemy(sx, this.centerY, 'neutrino_ghost', 'sine', this.canvasWidth, game.difficulty, level);
                    frag.hp = 15;
                    game.entityManager.enemies.push(frag);
                }
                game.particles.emit(this.centerX, this.centerY, 'explosion', 15);
            }
        }
    }

    /** For compatibility with old Boss collision API */
    destroy() {
        this.active = false;
    }
}

export default MultiBoss;