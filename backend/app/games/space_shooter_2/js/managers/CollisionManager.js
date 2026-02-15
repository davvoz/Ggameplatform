import Explosion from '../entities/Explosion.js';
import { MultiBoss } from '../entities/Enemy.js';

class CollisionManager {
    constructor(game) {
        this.game = game;
    }

    checkCollisions() {
        const g = this.game;
        const entities = g.entityManager;
        const perks = g.perkSystem;

        for (const bullet of entities.bullets) {
            if (!bullet.active || bullet.owner !== 'player') continue;

            let pierceLeft = bullet._pierceLeft ?? perks.getPierceCount();

            for (const enemy of entities.enemies) {
                if (!enemy.active) continue;
                if (bullet._hitIds && bullet._hitIds.has(enemy)) continue;
                if (bullet.collidesWithCircle(enemy)) {
                    let dmg = bullet.damage * perks.getDamageMultiplier();
                    const isCrit = Math.random() < perks.getCritChance();
                    if (isCrit) dmg = Math.ceil(dmg * perks.getCritMultiplier());

                    const killed = enemy.takeDamage(Math.ceil(dmg), g);
                    if (killed) g.waveManager.onEnemyKilled(enemy);

                    if (isCrit) {
                        g.particles.emit(enemy.position.x + enemy.width / 2, enemy.position.y + enemy.height / 2, 'explosion', 6);
                        g.postProcessing.flash({ r: 255, g: 200, b: 50 }, 0.05);
                    }

                    if (perks.hasExplosiveRounds()) {
                        g.perkEffectsManager.applyExplosiveAoE(enemy.position.x + enemy.width / 2, enemy.position.y + enemy.height / 2, 50, Math.ceil(dmg * 0.5));
                    }

                    g.sound.playHit();

                    if (pierceLeft > 0) {
                        pierceLeft--;
                        bullet._pierceLeft = pierceLeft;
                        bullet._hitIds = bullet._hitIds || new Set();
                        bullet._hitIds.add(enemy);
                    } else {
                        bullet.destroy();
                    }
                    if (!bullet.active) break;
                }
            }

            if (entities.boss && entities.boss.active && !entities.boss.entering && bullet.active) {
                const bCX = bullet.position.x + bullet.width / 2;
                const bCY = bullet.position.y + bullet.height / 2;
                const hitIdx = (entities.boss instanceof MultiBoss) ? entities.boss.getHitPart(bCX, bCY) : -1;
                const hitBoss = hitIdx >= 0 || (!(entities.boss instanceof MultiBoss) && bullet.collidesWithCircle(entities.boss));
                if (hitBoss) {
                    let dmg = bullet.damage * perks.getDamageMultiplier();
                    const isCrit = Math.random() < perks.getCritChance();
                    if (isCrit) dmg = Math.ceil(dmg * perks.getCritMultiplier());

                    let killed = false;
                    if (hitIdx >= 0) {
                        const res = entities.boss.damagepart(hitIdx, Math.ceil(dmg), g);
                        killed = res.bossKilled;
                        if (res.partDestroyed) {
                            const part = res.part;
                            const partCX = part.worldX + part.width / 2;
                            const partCY = part.worldY + part.height / 2;
                            entities.explosions.push(new Explosion(partCX, partCY, 1));
                            g.particles.emit(partCX, partCY, 'explosion', 12);
                        }
                    } else {
                        killed = entities.boss.takeDamage(Math.ceil(dmg), g);
                    }
                    if (killed) g.waveManager.onBossKilled();

                    const hitPart = hitIdx >= 0 ? entities.boss.parts[hitIdx] : null;
                    const px = hitPart && hitPart.active !== false ? hitPart.worldX + hitPart.width / 2 : (entities.boss.position.x + entities.boss.width / 2);
                    const py = hitPart && hitPart.active !== false ? hitPart.worldY + hitPart.height / 2 : (entities.boss.position.y + entities.boss.height / 2);
                    if (isCrit) {
                        g.particles.emit(px, py, 'explosion', 6);
                    }
                    if (perks.hasExplosiveRounds()) {
                        g.perkEffectsManager.applyExplosiveAoE(px, py, 50, Math.ceil(dmg * 0.3));
                    }

                    g.sound.playHit();
                    bullet.destroy();
                }
            }

            if (entities.miniBoss && entities.miniBoss.active && !entities.miniBoss.entering && bullet.active) {
                const bCX = bullet.position.x + bullet.width / 2;
                const bCY = bullet.position.y + bullet.height / 2;
                const hitIdx = entities.miniBoss.getHitPart(bCX, bCY);
                if (hitIdx >= 0) {
                    let dmg = bullet.damage * perks.getDamageMultiplier();
                    const isCrit = Math.random() < perks.getCritChance();
                    if (isCrit) dmg = Math.ceil(dmg * perks.getCritMultiplier());

                    const res = entities.miniBoss.damagepart(hitIdx, Math.ceil(dmg), g);
                    if (res.partDestroyed) {
                        const part = res.part;
                        const partCX = part.worldX + part.width / 2;
                        const partCY = part.worldY + part.height / 2;
                        entities.explosions.push(new Explosion(partCX, partCY, 0.8));
                        g.particles.emit(partCX, partCY, 'explosion', 10);
                    }

                    const hitPart = entities.miniBoss.parts[hitIdx];
                    const px = hitPart && hitPart.active !== false ? hitPart.worldX + hitPart.width / 2 : (entities.miniBoss.position.x + entities.miniBoss.width / 2);
                    const py = hitPart && hitPart.active !== false ? hitPart.worldY + hitPart.height / 2 : (entities.miniBoss.position.y + entities.miniBoss.height / 2);
                    if (isCrit) {
                        g.particles.emit(px, py, 'explosion', 5);
                    }
                    if (perks.hasExplosiveRounds()) {
                        g.perkEffectsManager.applyExplosiveAoE(px, py, 40, Math.ceil(dmg * 0.3));
                    }

                    g.sound.playHit();
                    bullet.destroy();
                }
            }
        }

        if (entities.player && entities.player.active) {
            for (const bullet of entities.bullets) {
                if (!bullet.active || bullet.owner !== 'enemy') continue;
                if (bullet.collidesWithCircle(entities.player)) {
                    if (Math.random() < perks.getPhaseChance()) {
                        bullet.destroy();
                        g.particles.emit(entities.player.position.x + entities.player.width / 2, entities.player.position.y + entities.player.height / 2, 'shield', 3);
                        continue;
                    }
                    bullet.destroy();
                    const died = entities.player.takeDamage(1, g);
                    if (died) {
                        this.onPlayerDeath();
                    } else {
                        g.levelManager.levelDamageTaken++;
                        if (perks.getDamageConverterRate() > 0 && entities.player.active) {
                            entities.player.ultimateCharge = Math.min(100, entities.player.ultimateCharge + 100 * perks.getDamageConverterRate());
                        }
                    }
                }
            }

            for (const enemy of entities.enemies) {
                if (!enemy.active) continue;
                if (enemy.collidesWithCircle(entities.player)) {
                    if (perks.hasThorns()) {
                        const thKilled = enemy.takeDamage(3, g);
                        if (thKilled) g.waveManager.onEnemyKilled(enemy);
                    } else {
                        const killed = enemy.takeDamage(enemy.health, g);
                        if (killed) g.waveManager.onEnemyKilled(enemy);
                    }
                    if (Math.random() < perks.getPhaseChance()) {
                        g.particles.emit(entities.player.position.x + entities.player.width / 2, entities.player.position.y + entities.player.height / 2, 'shield', 3);
                    } else {
                        const died = entities.player.takeDamage(1, g);
                        if (died) this.onPlayerDeath();
                        else {
                            g.levelManager.levelDamageTaken++;
                            if (perks.getDamageConverterRate() > 0 && entities.player.active) {
                                entities.player.ultimateCharge = Math.min(100, entities.player.ultimateCharge + 100 * perks.getDamageConverterRate());
                            }
                        }
                    }
                }
            }

            if (entities.boss && entities.boss.active && !entities.boss.entering && entities.boss.collidesWithCircle(entities.player)) {
                if (Math.random() >= perks.getPhaseChance()) {
                    const died = entities.player.takeDamage(2, g);
                    if (died) this.onPlayerDeath();
                    else {
                        g.levelManager.levelDamageTaken += 2;
                        if (perks.getDamageConverterRate() > 0 && entities.player.active) {
                            entities.player.ultimateCharge = Math.min(100, entities.player.ultimateCharge + 200 * perks.getDamageConverterRate());
                        }
                    }
                } else {
                    g.particles.emit(entities.player.position.x + entities.player.width / 2, entities.player.position.y + entities.player.height / 2, 'shield', 5);
                }
            }

            if (entities.miniBoss && entities.miniBoss.active && !entities.miniBoss.entering && entities.miniBoss.collidesWithCircle(entities.player)) {
                if (Math.random() >= perks.getPhaseChance()) {
                    const died = entities.player.takeDamage(1, g);
                    if (died) this.onPlayerDeath();
                    else {
                        g.levelManager.levelDamageTaken++;
                        if (perks.getDamageConverterRate() > 0 && entities.player.active) {
                            entities.player.ultimateCharge = Math.min(100, entities.player.ultimateCharge + 100 * perks.getDamageConverterRate());
                        }
                    }
                } else {
                    g.particles.emit(entities.player.position.x + entities.player.width / 2, entities.player.position.y + entities.player.height / 2, 'shield', 4);
                }
            }

            const magnetRange = perks.getMagnetRange();
            for (const pu of entities.powerUps) {
                if (!pu.active) continue;
                if (magnetRange > 0) {
                    const dx = (entities.player.position.x + entities.player.width / 2) - (pu.position.x + pu.width / 2);
                    const dy = (entities.player.position.y + entities.player.height / 2) - (pu.position.y + pu.height / 2);
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < magnetRange && dist > 5) {
                        const pull = 300 / dist;
                        pu.position.x += (dx / dist) * pull * 0.016;
                        pu.position.y += (dy / dist) * pull * 0.016;
                    }
                }
                if (pu.collidesWithCircle(entities.player)) {
                    pu.apply(entities.player, g);
                    pu.destroy();
                    g.sound.playPowerUp();
                    g.particles.emit(
                        pu.position.x + pu.width / 2,
                        pu.position.y + pu.height / 2,
                        'powerup', 8
                    );
                }
            }
        }
    }

    onPlayerDeath() {
        const g = this.game;
        const entities = g.entityManager;
        const px = entities.player.position.x + entities.player.width / 2;
        const py = entities.player.position.y + entities.player.height / 2;

        entities.explosions.push(new Explosion(px, py, 2, { r: 100, g: 200, b: 255 }));
        g.particles.emit(px, py, 'explosion', 25);
        g.sound.playExplosionBig();
        g.postProcessing.shake(12, 0.6);
        g.postProcessing.flash({ r: 255, g: 60, b: 60 }, 0.5);

        g.uiManager.hideHudButtons();

        if (window.sendScoreToPlatform) {
            window.sendScoreToPlatform(g.scoreManager.score, {
                level: g.levelManager.currentLevel,
                enemiesKilled: g.scoreManager.totalEnemiesKilled,
                ship: g.selectedShipId,
                ultimate: g.selectedUltimateId,
                difficulty: g.difficulty.id
            });
        }

        g.cinematicManager.beginDeathCinematic(px, py);
    }
}

export default CollisionManager;
