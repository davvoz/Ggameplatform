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
                    g.hudRenderer.xpBanners.push({
                        text: '🛡 AUTO SHIELD',
                        subtext: null,
                        life: 2,
                        maxLife: 2,
                        y: g.logicalHeight * 0.18,
                        color: '#44aaff'
                    });
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
                    perks.droneFireTimers[i] = 1.2;
                    let nearest = null;
                    let nearDist = 200;
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
                        const speed = 400;
                        g.entityManager.spawnBullet(dx, dy, Math.cos(a) * speed, Math.sin(a) * speed, 'player', 1);
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
            ctx.shadowColor = '#4488ff';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(dx, dy, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

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

    reset() {
        this._emergencySlowTimer = 0;
    }
}

export default PerkEffectsManager;
