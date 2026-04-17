import { C_MEDIUM_BLUE, C_WHITE } from '../entities/LevelsThemes.js';
import Explosion from '../entities/Explosion.js';
import AllyController from './AllyController.js';

class PerkEffectsManager {
    constructor(game) {
        this.game = game;
        this._emergencySlowTimer = 0;
        this.allyController = new AllyController(game);
    }

    applyPerkModifiersToPlayer() {
        const g = this.game;
        const player = g.entityManager.player;
        if (!player) return;
        player.speed = player.baseSpeed * g.perkSystem.getSpeedMultiplier();
        player.resistance = Math.max(0, Math.min(0.6,
            player.resistance + g.perkSystem.getResistanceModifier()
        ));
    }

    updatePerkEffects(deltaTime) {
        const g = this.game;
        const player = g.entityManager.player;
        if (!player?.active)
            return;
        const perks = g.perkSystem;

        this.updateAutoShield(perks, deltaTime, player, g);

        if (perks.hasThorns()) {
            perks.thornsAngle += deltaTime * 0.8;
            perks.thornsTime += deltaTime;
        }

        this.updateDrones(perks, deltaTime, player, g);

        this.activateEmergencyProtocol(perks, player, g);

        this.updateTimeScale(deltaTime, g, player);

        // ─── World 2 Perk Effects ───

        // Neural Hijack: orbital allies (delegated to AllyController)
        this.allyController.update(deltaTime);

        // Scia Infuocata (Fire Trail) — only drop segments while moving
        this.updateFireTrailSegments(perks, player, deltaTime, g);

        // Sovraccarico: overheat pulse instead of jam
        this.handleOverheatRecovery(perks, deltaTime, player, g);

        // Esploratore: reveal stealth enemies
        this.revealStealthEnemies(perks, player, g);

        // ─── World 3 Perk Effects ───

        // Glitch Dash: invulnerability + speed after taking damage
        this.applyGlitchDashEffect(perks, deltaTime, player, g);

        // Entropy Shield: kill counter → auto shield
        this.activateEntropyShield(perks, player, g);

        // Virus Inject: tick damage on infected enemies
        this.applyVirusInfection(perks, g, deltaTime);
    }

    updateAutoShield(perks, deltaTime, player, g) {
        if (perks.hasPerk('auto_shield')) {
            perks.autoShieldTimer -= deltaTime;
            if (perks.autoShieldTimer <= 0) {
                perks.autoShieldTimer = perks.getAutoShieldCooldown();
                if (!player.shieldActive) {
                    player.shieldActive = true;
                    player.shieldTime = 6;
                    g.particles.emit(
                        player.position.x + player.width / 2,
                        player.position.y + player.height / 2,
                        'shield', 12
                    );
                    g.sound.playPowerUp();
                    g.postProcessing.flash({ r: 60, g: 160, b: 255 }, 0.12);
                }
            }
        }
    }

    applyVirusInfection(perks, g, deltaTime) {
        if (perks.hasPerk('virus_inject')) {
            for (const e of g.entityManager.enemies) {
                if (!e.active || !e._virusInfected) continue;
                e._virusTimer += deltaTime;
                if (e._virusTimer >= e._virusDuration) {
                    e._virusInfected = false;
                    continue;
                }
                // 1 damage per second
                e._virusTickAccum = (e._virusTickAccum || 0) + deltaTime;
                this.spreadVirusEffect(e, g);
            }
        }
    }

    spreadVirusEffect(e, g) {
        if (e._virusTickAccum >= 1) {
            e._virusTickAccum -= 1;
            const killed = e.takeDamage(1, g);
            if (killed) {
                g.scoreManager.onEnemyKilled(e);
                // Spread on tick-kill too
                const cands = this.getNearbyEnemies(e, g);
                cands.sort((a, b) => a.d - b.d);
                for (let s = 0; s < Math.min(2, cands.length); s++) {
                    const t = cands[s].e;
                    t._virusInfected = true;
                    t._virusDuration = e._virusDuration;
                    t._virusTimer = 0;
                    g.particles.emitCustom(
                        t.position.x + t.width / 2, t.position.y + t.height / 2,
                        {
                            count: 4, speed: 25, life: 0.3, size: 2,
                            color: { r: 180, g: 0, b: 255 }, gravity: 0, fadeOut: true, shrink: true
                        }, 4
                    );
                }
            }
        }
    }

    getNearbyEnemies(e, g) {
        const eCX = e.position.x + e.width / 2;
        const eCY = e.position.y + e.height / 2;
        const cands = [];
        for (const e2 of g.entityManager.enemies) {
            if (!e2.active || e2 === e || e2._isAlly || e2._virusInfected) continue;
            const dx = (e2.position.x + e2.width / 2) - eCX;
            const dy = (e2.position.y + e2.height / 2) - eCY;
            const dist = Math.hypot(dx, dy);
            if (dist < 150) cands.push({ e: e2, d: dist });
        }
        return cands;
    }

    activateEntropyShield(perks, player, g) {
        if (perks.getEntropyShieldKills() < Infinity) {
            if (perks.entropyShieldKills >= perks.getEntropyShieldKills()) {
                perks.entropyShieldKills = 0;
                if (!player.shieldActive) {
                    player.shieldActive = true;
                    player.shieldTime = 4;
                    g.particles.emit(
                        player.position.x + player.width / 2,
                        player.position.y + player.height / 2,
                        'shield', 8
                    );
                    g.postProcessing.flash({ r: 0, g: 200, b: 255 }, 0.12);
                }
            }
        }
    }

    applyGlitchDashEffect(perks, deltaTime, player, g) {
        if (perks.glitchDashTimer > 0) {
            perks.glitchDashTimer -= deltaTime;
            const boost = perks.getGlitchDashSpeedBoost();
            player.speed = player.baseSpeed * (g.perkSystem.getSpeedMultiplier() + boost);
            if (perks.glitchDashTimer <= 0) {
                perks.glitchDashTimer = 0;
                player.invincible = false;
                this.applyPerkModifiersToPlayer();
            }
        }
    }

    revealStealthEnemies(perks, player, g) {
        if (perks.getRevealRange() > 0) {
            const revealRange = perks.getRevealRange();
            const pcx = player.position.x + player.width / 2;
            const pcy = player.position.y + player.height / 2;
            for (const e of g.entityManager.enemies) {
                if (!e.active || !e.config?.stealth) continue;
                const ex = e.position.x + e.width / 2;
                const ey = e.position.y + e.height / 2;
                const d = Math.hypot(ex - pcx, ey - pcy);
                if (d < revealRange) {
                    e.alpha = Math.max(e.alpha, 0.6);
                }
            }
        }
    }

    handleOverheatRecovery(perks, deltaTime, player, g) {
        if (perks.hasSovraccarico()) {
            if (perks.sovraccaricoCooldown > 0) perks.sovraccaricoCooldown -= deltaTime;
            if (player.overheated && perks.sovraccaricoCooldown <= 0) {
                perks.sovraccaricoCooldown = 2; // cooldown to prevent spam
                player.heat = 0;
                player.overheated = false;
                // Damage pulse
                this.applyExplosiveAoE(
                    player.position.x + player.width / 2,
                    player.position.y + player.height / 2,
                    120, 5
                );
                g.postProcessing.flash({ r: 255, g: 200, b: 50 }, 0.2);
                g.postProcessing.shake(5, 0.3);
            }
        }
    }

    updateFireTrailSegments(perks, player, deltaTime, g) {
        if (perks.getFireTrailDmg() <= 0) {
            // Perk removed — drain any leftover segments so they don't linger
            if (perks.fireTrailSegments.length > 0) perks.fireTrailSegments.length = 0;
        } else {
            const px = player.position.x + player.width / 2;
            const py = player.position.y + player.height;
            perks.fireTrailTimer -= deltaTime;
            if (perks.fireTrailTimer <= 0) {
                this.addFireTrailSegment(perks, px, py);
            }
            this.updateFireTrailSegmentsAndDamage(perks, deltaTime, g);
        }
    }

    updateFireTrailSegmentsAndDamage(perks, deltaTime, g) {
        const dmgPerSec = perks.getFireTrailDmg();
        const trailDrift = 50; // px/s — segments drift down like the world scrolls
        for (let i = perks.fireTrailSegments.length - 1; i >= 0; i--) {
            const seg = perks.fireTrailSegments[i];
            seg.timer -= deltaTime;
            seg.y += trailDrift * deltaTime; // drift downward with world
            if (seg.timer <= 0 || seg.y > g.canvas.height + 30) {
                perks.fireTrailSegments.splice(i, 1);
                continue;
            }
            // Damage enemies touching this trail segment
            for (const e of g.entityManager.enemies) {
                if (!e.active || e._isAlly) continue;
                const ex = e.position.x + e.width / 2;
                const ey = e.position.y + e.height / 2;
                const d = Math.hypot(ex - seg.x, ey - seg.y);
                if (d < 28) {
                    const killed = e.takeDamage(dmgPerSec * deltaTime, g);
                    if (killed) g.scoreManager.onEnemyKilled(e);
                }
            }
        }
    }

    addFireTrailSegment(perks, px, py) {
        perks.fireTrailTimer = 0.15; // drop a trail segment every 150ms


        // Skip if player hasn't moved enough since last segment
        const segs = perks.fireTrailSegments;
        const last = segs.length > 0 ? segs[segs.length - 1] : null;
        const moved = !last || (Math.abs(px - last.x) > 4 || Math.abs(py - last.y) > 4);
        if (moved) {
            segs.push({ x: px, y: py, timer: perks.getFireTrailDuration() });
        }
    }

    updateTimeScale(deltaTime, g, player) {
        if (this._emergencySlowTimer > 0) {
            this._emergencySlowTimer -= deltaTime;
            if (this._emergencySlowTimer <= 0) {
                this._emergencySlowTimer = 0;
                if (g.timeScale < 1 && !(player.ultimateActive && player.ultimateId === 'time_warp')) {
                    g.timeScale = 1;
                }
            }
        }
    }

    activateEmergencyProtocol(perks, player, g) {
        if (perks.hasEmergencyProtocol() && player.health <= 1 && !player.invincible) {
            perks.emergencyUsedThisLevel = true;
            player.invincible = true;
            player.invincibleTime = 3;
            player.blinkTimer = 0;
            this._emergencySlowTimer = 3;
            g.timeScale = 0.4;
            g.postProcessing.flash({ r: 255, g: 50, b: 50 }, 0.3);
            g.postProcessing.shake(10, 0.5);
            g.particles.emit(
                player.position.x + player.width / 2,
                player.position.y + player.height / 2,
                'explosion', 20
            );
        }
    }

    updateDrones(perks, deltaTime, player, g) {
        const droneCount = perks.getDroneCount();
        if (droneCount > 0) {
            perks.droneAngle += deltaTime * 2.5;
            const pcx = player.position.x + player.width / 2;
            const pcy = player.position.y + player.height / 2;
            const orbitR = 60;

            for (let i = 0; i < droneCount; i++) {
                const angle = perks.droneAngle + (i * Math.PI * 2 / droneCount);
                const dx = pcx + Math.cos(angle) * orbitR;
                const dy = pcy + Math.sin(angle) * orbitR;

                if (!perks.droneFireTimers[i]) perks.droneFireTimers[i] = 0;
                perks.droneFireTimers[i] -= deltaTime;
                this.spawnHomingMissileIfEnemyExists(perks, i, g, dx, dy);
            }
        }
    }

    spawnHomingMissileIfEnemyExists(perks, droneIndex, g, dx, dy) {
        if (perks.droneFireTimers[droneIndex] > 0) return;
        const enemies = g.entityManager.enemies;
        let nearest = null;
        let nearDist = Infinity;
        for (const e of enemies) {
            if (!e.active || e._isAlly) continue;
            const ex = e.position.x + e.width / 2;
            const ey = e.position.y + e.height / 2;
            const d = Math.hypot(ex - dx, ey - dy);
            if (d < nearDist) { nearDist = d; nearest = e; }
        }
        if (!nearest) return;
        perks.droneFireTimers[droneIndex] = 0.5;
        const ex = nearest.position.x + nearest.width / 2;
        const ey = nearest.position.y + nearest.height / 2;
        const angle = Math.atan2(ey - dy, ex - dx);
        g.entityManager.spawnHomingMissile(dx, dy, angle);
    }

    
    applyChainLightning(fromX, fromY, targets, damage) {
        const g = this.game;
        let cx = fromX, cy = fromY;
        const hit = new Set();
        for (let t = 0; t < targets; t++) {
            let nearest = null;
            let nearDist = 120;
            for (const e of g.entityManager.enemies) {
                if (!e.active || e._isAlly || hit.has(e)) continue;
                const ex = e.position.x + e.width / 2;
                const ey = e.position.y + e.height / 2;
                const d = Math.hypot(ex - cx, ey - cy);
                if (d < nearDist) { nearDist = d; nearest = e; }
            }
            if (!nearest) break;
            hit.add(nearest);
            const ex = nearest.position.x + nearest.width / 2;
            const ey = nearest.position.y + nearest.height / 2;

            g.particles.emitCustom(ex, ey, {
                count: 3, speed: 40, life: 0.3, size: 3,
                color: { r: 100, g: 180, b: 255 },
                gravity: 0, fadeOut: true, shrink: true
            }, 3);

            const killed = nearest.takeDamage(damage, g);
            if (killed) g.scoreManager.onEnemyKilled(nearest);
            cx = ex; cy = ey;
        }
    }

    applyExplosiveAoE(cx, cy, radius, damage) {
        const g = this.game;
        this.applyDamageToEnemiesInRadius(g, cx, cy, radius, damage);
        this.handleBossDamage(g, cx, cy, radius, damage);
        this.applyDamageToMiniBoss(g, cx, cy, radius, damage);
        g.entityManager.explosions.push(new Explosion(cx, cy, 0.8));
        g.particles.emit(cx, cy, 'explosion', 6);
    }

    applyDamageToMiniBoss(g, cx, cy, radius, damage) {
        if (g.entityManager.miniBoss?.active) {
            const bx = g.entityManager.miniBoss.position.x + g.entityManager.miniBoss.width / 2;
            const by = g.entityManager.miniBoss.position.y + g.entityManager.miniBoss.height / 2;
            const d = Math.hypot(bx - cx, by - cy);
            if (d <= radius) {
                g.entityManager.miniBoss.takeDamage(damage, g);
            }
        }
    }

    handleBossDamage(g, cx, cy, radius, damage) {
        if (g.entityManager.boss?.active) {
            const bx = g.entityManager.boss.position.x + g.entityManager.boss.width / 2;
            const by = g.entityManager.boss.position.y + g.entityManager.boss.height / 2;
            const d = Math.hypot(bx - cx, by - cy);
            if (d <= radius) {
                const killed = g.entityManager.boss.takeDamage(damage, g);
                if (killed) g.scoreManager.onBossKilled();
            }
        }
    }

    applyDamageToEnemiesInRadius(g, cx, cy, radius, damage) {
        for (const e of g.entityManager.enemies) {
            if (!e.active || e._isAlly) continue;
            const ex = e.position.x + e.width / 2;
            const ey = e.position.y + e.height / 2;
            const d = Math.hypot(ex - cx, ey - cy);
            if (d <= radius) {
                const killed = e.takeDamage(damage, g);
                if (killed) g.scoreManager.onEnemyKilled(e);
            }
        }
    }

    renderDrones(ctx) {
        const g = this.game;
        const droneCount = g.perkSystem.getDroneCount();
        const player = g.entityManager.player;
        if (droneCount <= 0 || !player?.active) return;
        const pcx = player.position.x + player.width / 2;
        const pcy = player.position.y + player.height / 2;
        const orbitR = 60;

        ctx.save();
        for (let i = 0; i < droneCount; i++) {
            const angle = g.perkSystem.droneAngle + (i * Math.PI * 2 / droneCount);
            const dx = pcx + Math.cos(angle) * orbitR;
            const dy = pcy + Math.sin(angle) * orbitR;

            ctx.fillStyle = '#88bbff';
            // Skip expensive shadowBlur on low/medium
            if (g.performanceMode === 'high') {
                ctx.shadowColor = C_MEDIUM_BLUE;
                ctx.shadowBlur = 8;
            }
            ctx.beginPath();
            ctx.arc(dx, dy, 6, 0, Math.PI * 2);
            ctx.fill();
            if (ctx.shadowBlur > 0) ctx.shadowBlur = 0;

            ctx.strokeStyle = 'rgba(100,150,255,0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pcx, pcy);
            ctx.lineTo(dx, dy);
            ctx.stroke();

            ctx.fillStyle = C_WHITE;
            ctx.beginPath();
            ctx.arc(dx, dy, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    /** Render fire trail segments (Scia Infuocata) */
    renderFireTrail(ctx) {
        const segments = this.game.perkSystem.fireTrailSegments;
        if (!segments || segments.length === 0) return;

        ctx.save();
        for (const seg of segments) {
            const t = seg.timer / this.game.perkSystem.getFireTrailDuration();
            const alpha = Math.min(1, t * 0.65);
            const flicker = 0.9 + 0.1 * Math.sin(performance.now() * 0.01 + seg.x * 0.3);
            ctx.globalAlpha = alpha * flicker;

            // Outer glow
            const r = 18;
            const outerGrad = ctx.createRadialGradient(seg.x, seg.y, 0, seg.x, seg.y, r * 1.4);
            outerGrad.addColorStop(0, `rgba(255,220,80,${alpha * 0.3})`);
            outerGrad.addColorStop(1, `rgba(255,80,10,0)`);
            ctx.fillStyle = outerGrad;
            ctx.beginPath();
            ctx.arc(seg.x, seg.y, r * 1.4, 0, Math.PI * 2);
            ctx.fill();

            // Core fire circle
            const grad = ctx.createRadialGradient(seg.x, seg.y, 0, seg.x, seg.y, r);
            grad.addColorStop(0, `rgba(255,240,100,${alpha * 0.85})`);
            grad.addColorStop(0.3, `rgba(255,160,30,${alpha * 0.65})`);
            grad.addColorStop(0.7, `rgba(230,60,10,${alpha * 0.3})`);
            grad.addColorStop(1, `rgba(180,20,0,0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(seg.x, seg.y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    /** Render allied enemies (Neural Hijack) — delegated to AllyController */
    renderAllies(ctx) {
        this.allyController.render(ctx, this.game.assets);
    }

    reset() {
        this._emergencySlowTimer = 0;
        this.allyController.reset();
    }
}

export default PerkEffectsManager;
