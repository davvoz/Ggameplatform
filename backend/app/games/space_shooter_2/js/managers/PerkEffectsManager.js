import Explosion from '../entities/Explosion.js';

class PerkEffectsManager {
    constructor(game) {
        this.game = game;
        this._emergencySlowTimer = 0;
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
        if (!player || !player.active) return;
        const perks = g.perkSystem;

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

        if (perks.hasThorns()) {
            perks.thornsAngle += deltaTime * 0.8;
            perks.thornsTime += deltaTime;
        }

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
                if (perks.droneFireTimers[i] <= 0) {
                    perks.droneFireTimers[i] = 2.5; // slower fire rate for missiles
                    // Find nearest enemy at any range
                    let nearest = null;
                    let nearDist = Infinity;
                    for (const e of g.entityManager.enemies) {
                        if (!e.active) continue;
                        const ex = e.position.x + e.width / 2;
                        const ey = e.position.y + e.height / 2;
                        const d = Math.sqrt((ex - dx) ** 2 + (ey - dy) ** 2);
                        if (d < nearDist) { nearDist = d; nearest = e; }
                    }
                    if (g.entityManager.miniBoss && g.entityManager.miniBoss.active) {
                        const mx = g.entityManager.miniBoss.position.x + g.entityManager.miniBoss.width / 2;
                        const my = g.entityManager.miniBoss.position.y + g.entityManager.miniBoss.height / 2;
                        const d = Math.sqrt((mx - dx) ** 2 + (my - dy) ** 2);
                        if (d < nearDist) { nearDist = d; nearest = g.entityManager.miniBoss; }
                    }
                    if (g.entityManager.boss && g.entityManager.boss.active) {
                        const bx = g.entityManager.boss.position.x + g.entityManager.boss.width / 2;
                        const by = g.entityManager.boss.position.y + g.entityManager.boss.height / 2;
                        const d = Math.sqrt((bx - dx) ** 2 + (by - dy) ** 2);
                        if (d < nearDist) { nearDist = d; nearest = g.entityManager.boss; }
                    }
                    if (nearest) {
                        const tx = nearest.position.x + nearest.width / 2;
                        const ty = nearest.position.y + nearest.height / 2;
                        const a = Math.atan2(ty - dy, tx - dx);
                        g.entityManager.spawnHomingMissile(dx, dy, a);
                    }
                }
            }
        }

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

        if (this._emergencySlowTimer > 0) {
            this._emergencySlowTimer -= deltaTime;
            if (this._emergencySlowTimer <= 0) {
                this._emergencySlowTimer = 0;
                if (g.timeScale < 1 && !(player.ultimateActive && player.ultimateId === 'time_warp')) {
                    g.timeScale = 1;
                }
            }
        }

        // ─── World 2 Perk Effects ───

        // Ricochet Master: make all player bullets bounce
        if (perks.getRicochetBounces() > 0) {
            for (const b of g.entityManager.bullets) {
                if (b.owner === 'player' && b.maxBounces === 0) {
                    b.maxBounces = perks.getRicochetBounces();
                }
            }
        }

        // Scia Infuocata (Fire Trail)
        if (perks.getFireTrailDmg() > 0) {
            perks.fireTrailTimer -= deltaTime;
            if (perks.fireTrailTimer <= 0) {
                perks.fireTrailTimer = 0.15; // drop a trail segment every 150ms
                perks.fireTrailSegments.push({
                    x: player.position.x + player.width / 2,
                    y: player.position.y + player.height,
                    timer: perks.getFireTrailDuration()
                });
            }
            const dmgPerSec = perks.getFireTrailDmg();
            for (let i = perks.fireTrailSegments.length - 1; i >= 0; i--) {
                const seg = perks.fireTrailSegments[i];
                seg.timer -= deltaTime;
                if (seg.timer <= 0) {
                    perks.fireTrailSegments.splice(i, 1);
                    continue;
                }
                // Damage enemies touching this trail segment
                for (const e of g.entityManager.enemies) {
                    if (!e.active) continue;
                    const ex = e.position.x + e.width / 2;
                    const ey = e.position.y + e.height / 2;
                    const d = Math.sqrt((ex - seg.x) ** 2 + (ey - seg.y) ** 2);
                    if (d < 20) {
                        const killed = e.takeDamage(dmgPerSec * deltaTime, g);
                        if (killed) g.scoreManager.onEnemyKilled(e);
                    }
                }
            }
        }

        // Sovraccarico: overheat pulse instead of jam
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

        // Esploratore: reveal stealth enemies
        if (perks.getRevealRange() > 0) {
            const revealRange = perks.getRevealRange();
            const pcx = player.position.x + player.width / 2;
            const pcy = player.position.y + player.height / 2;
            for (const e of g.entityManager.enemies) {
                if (!e.active || !e.config?.stealth) continue;
                const ex = e.position.x + e.width / 2;
                const ey = e.position.y + e.height / 2;
                const d = Math.sqrt((ex - pcx) ** 2 + (ey - pcy) ** 2);
                if (d < revealRange) {
                    e.alpha = Math.max(e.alpha, 0.6); // force reveal
                }
            }
        }
    }

    applyChainLightning(fromX, fromY, targets, damage) {
        const g = this.game;
        let cx = fromX, cy = fromY;
        const hit = new Set();
        for (let t = 0; t < targets; t++) {
            let nearest = null;
            let nearDist = 120;
            for (const e of g.entityManager.enemies) {
                if (!e.active || hit.has(e)) continue;
                const ex = e.position.x + e.width / 2;
                const ey = e.position.y + e.height / 2;
                const d = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2);
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
        for (const e of g.entityManager.enemies) {
            if (!e.active) continue;
            const ex = e.position.x + e.width / 2;
            const ey = e.position.y + e.height / 2;
            const d = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2);
            if (d <= radius) {
                const killed = e.takeDamage(damage, g);
                if (killed) g.scoreManager.onEnemyKilled(e);
            }
        }
        if (g.entityManager.boss && g.entityManager.boss.active) {
            const bx = g.entityManager.boss.position.x + g.entityManager.boss.width / 2;
            const by = g.entityManager.boss.position.y + g.entityManager.boss.height / 2;
            const d = Math.sqrt((bx - cx) ** 2 + (by - cy) ** 2);
            if (d <= radius) {
                const killed = g.entityManager.boss.takeDamage(damage, g);
                if (killed) g.scoreManager.onBossKilled();
            }
        }
        if (g.entityManager.miniBoss && g.entityManager.miniBoss.active) {
            const bx = g.entityManager.miniBoss.position.x + g.entityManager.miniBoss.width / 2;
            const by = g.entityManager.miniBoss.position.y + g.entityManager.miniBoss.height / 2;
            const d = Math.sqrt((bx - cx) ** 2 + (by - cy) ** 2);
            if (d <= radius) {
                g.entityManager.miniBoss.takeDamage(damage, g);
            }
        }
        g.entityManager.explosions.push(new Explosion(cx, cy, 0.8));
        g.particles.emit(cx, cy, 'explosion', 6);
    }

    renderDrones(ctx) {
        const g = this.game;
        const droneCount = g.perkSystem.getDroneCount();
        const player = g.entityManager.player;
        if (droneCount <= 0 || !player || !player.active) return;
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
                ctx.shadowColor = '#4488ff';
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

            ctx.fillStyle = '#ffffff';
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
            const alpha = t * 0.6;
            ctx.globalAlpha = alpha;
            const grad = ctx.createRadialGradient(seg.x, seg.y, 0, seg.x, seg.y, 14);
            grad.addColorStop(0, `rgba(255,200,50,${alpha})`);
            grad.addColorStop(0.4, `rgba(255,100,20,${alpha * 0.6})`);
            grad.addColorStop(1, `rgba(200,30,0,0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(seg.x, seg.y, 14, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    reset() {
        this._emergencySlowTimer = 0;
    }
}

export default PerkEffectsManager;
