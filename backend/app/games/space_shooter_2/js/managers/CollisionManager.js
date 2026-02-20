import Explosion from '../entities/Explosion.js';
import { MultiBoss } from '../entities/Enemy.js';
import SpatialGrid from '../utils/SpatialGrid.js';

class CollisionManager {
    constructor(game) {
        this.game = game;
        // Spatial grid for enemy collision lookups – cell size tuned for typical entity sizes
        this._enemyGrid = new SpatialGrid(120, game.logicalWidth, game.logicalHeight);
        // Cache logical size to detect resizes
        this._lastW = game.logicalWidth;
        this._lastH = game.logicalHeight;
    }

    /** Rebuild the spatial grid with current active enemies. */
    _rebuildEnemyGrid(entities) {
        const w = this.game.logicalWidth;
        const h = this.game.logicalHeight;
        if (w !== this._lastW || h !== this._lastH) {
            this._enemyGrid.resize(w, h);
            this._lastW = w;
            this._lastH = h;
        }
        this._enemyGrid.clear();
        for (let i = 0, len = entities.enemies.length; i < len; i++) {
            const e = entities.enemies[i];
            if (e.active) this._enemyGrid.insert(e);
        }
    }

    checkCollisions() {
        const g = this.game;
        const entities = g.entityManager;
        const perks = g.perkSystem;

        // ── Build spatial grid for enemies once per frame ──
        this._rebuildEnemyGrid(entities);
        const grid = this._enemyGrid;

        // ── Pre-compute per-frame perk values (avoid repeated virtual calls) ──
        const piercePerk = perks.getPierceCount();
        const dmgMult = perks.getDamageMultiplier();
        const critChance = perks.getCritChance();
        const critMult = perks.getCritMultiplier();
        const hasExplosive = perks.hasExplosiveRounds();

        for (const bullet of entities.bullets) {
            if (!bullet.active || bullet.owner !== 'player') continue;

            let pierceLeft = bullet._pierceLeft ?? piercePerk;

            // ── Spatial query: only check enemies near this bullet ──
            const margin = 30; // collision search margin
            const nearby = grid.query(
                bullet.position.x - margin,
                bullet.position.y - margin,
                bullet.width + margin * 2,
                bullet.height + margin * 2
            );

            for (let i = 0, len = nearby.length; i < len; i++) {
                const enemy = nearby[i];
                if (!enemy.active) continue;
                if (bullet._hitIds && bullet._hitIds.has(enemy)) continue;
                if (bullet.collidesWithCircle(enemy)) {
                    let dmg = bullet.damage * dmgMult;
                    const isCrit = Math.random() < critChance;
                    if (isCrit) dmg = Math.ceil(dmg * critMult);

                    const killed = enemy.takeDamage(Math.ceil(dmg), g);
                    if (killed) g.waveManager.onEnemyKilled(enemy);

                    if (isCrit) {
                        g.particles.emit(enemy.position.x + enemy.width / 2, enemy.position.y + enemy.height / 2, 'explosion', 6);
                        g.postProcessing.flash({ r: 255, g: 200, b: 50 }, 0.05);
                    }

                    if (hasExplosive) {
                        g.perkEffectsManager.applyExplosiveAoE(enemy.position.x + enemy.width / 2, enemy.position.y + enemy.height / 2, 50, Math.ceil(dmg * 0.5));
                    }

                    g.sound.playHit();

                    if (pierceLeft > 0) {
                        pierceLeft--;
                        bullet._pierceLeft = pierceLeft;
                        // Reuse existing Set to avoid per-frame allocation
                        if (!bullet._hitIds) bullet._hitIds = new Set();
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
                    let dmg = bullet.damage * dmgMult;
                    const isCrit = Math.random() < critChance;
                    if (isCrit) dmg = Math.ceil(dmg * critMult);

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
                    if (hasExplosive) {
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
                    let dmg = bullet.damage * dmgMult;
                    const isCrit = Math.random() < critChance;
                    if (isCrit) dmg = Math.ceil(dmg * critMult);

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
                    if (hasExplosive) {
                        g.perkEffectsManager.applyExplosiveAoE(px, py, 40, Math.ceil(dmg * 0.3));
                    }

                    g.sound.playHit();
                    bullet.destroy();
                }
            }
        }

        if (entities.player && entities.player.active) {
            // Pre-compute player AABB for fast reject
            const player = entities.player;
            const pcx = player.position.x + player.width / 2;
            const pcy = player.position.y + player.height / 2;
            const playerRadius = Math.min(player.width, player.height) * player.scale / 2;
            const phaseChance = perks.getPhaseChance();
            const dmgConverterRate = perks.getDamageConverterRate();
            const bulletReflectActive = player._bulletReflectActive && player.ultimateActive && player.ultimateId === 'quantum_shift';
            const reflectRadius = 52; // slightly larger than the visual

            for (const bullet of entities.bullets) {
                if (!bullet.active || bullet.owner !== 'enemy') continue;

                // ── Bullet Reflect: reflect enemy bullets within radius ──
                if (bulletReflectActive) {
                    const bcx = bullet.position.x + bullet.width / 2;
                    const bcy = bullet.position.y + bullet.height / 2;
                    const dx = bcx - pcx;
                    const dy = bcy - pcy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < reflectRadius) {
                        // Reflect: reverse velocity and change owner to player
                        bullet.velocity.x = -bullet.velocity.x;
                        bullet.velocity.y = -bullet.velocity.y;
                        bullet.owner = 'player';
                        bullet.damage = 2; // reflected bullets deal 2 damage
                        // Visual feedback
                        g.particles.emit(bcx, bcy, 'shield', 3);
                        continue;
                    }
                }

                // ── Fast distance pre-check: skip expensive circle if way too far ──
                const bcx = bullet.position.x + bullet.width / 2;
                const bcy = bullet.position.y + bullet.height / 2;
                const dx = bcx - pcx;
                const dy = bcy - pcy;
                const bulletRadius = Math.min(bullet.width, bullet.height) * bullet.scale / 2;
                const maxDist = playerRadius + bulletRadius;
                // Manhattan pre-reject (cheaper than sqrt)
                if (Math.abs(dx) > maxDist || Math.abs(dy) > maxDist) continue;

                if (bullet.collidesWithCircle(player)) {
                    if (Math.random() < phaseChance) {
                        bullet.destroy();
                        g.particles.emit(player.position.x + player.width / 2, player.position.y + player.height / 2, 'shield', 3);
                        continue;
                    }
                    bullet.destroy();
                    const died = player.takeDamage(1, g);
                    if (died) {
                        this.onPlayerDeath();
                    } else {
                        g.levelManager.levelDamageTaken++;
                        if (dmgConverterRate > 0 && player.active) {
                            player.ultimateCharge = Math.min(100, player.ultimateCharge + 100 * dmgConverterRate);
                        }
                    }
                }
            }

            for (const enemy of entities.enemies) {
                if (!enemy.active) continue;
                if (enemy.collidesWithCircle(player)) {
                    if (perks.hasThorns()) {
                        // Thorns: enemy takes 3 damage, player is immune to contact damage
                        const thKilled = enemy.takeDamage(3, g);
                        if (thKilled) g.waveManager.onEnemyKilled(enemy);
                        g.particles.emit(player.position.x + player.width / 2, player.position.y + player.height / 2, 'hit', 5);
                    } else {
                        const killed = enemy.takeDamage(enemy.health, g);
                        if (killed) g.waveManager.onEnemyKilled(enemy);
                        if (Math.random() < phaseChance) {
                            g.particles.emit(player.position.x + player.width / 2, player.position.y + player.height / 2, 'shield', 3);
                        } else {
                            const died = player.takeDamage(1, g);
                            if (died) this.onPlayerDeath();
                            else {
                                g.levelManager.levelDamageTaken++;
                                if (dmgConverterRate > 0 && player.active) {
                                    player.ultimateCharge = Math.min(100, player.ultimateCharge + 100 * dmgConverterRate);
                                }
                            }
                        }
                    }
                }
            }

            if (entities.boss && entities.boss.active && !entities.boss.entering && entities.boss.collidesWithCircle(player)) {
                if (Math.random() >= phaseChance) {
                    const died = player.takeDamage(2, g);
                    if (died) this.onPlayerDeath();
                    else {
                        g.levelManager.levelDamageTaken += 2;
                        if (dmgConverterRate > 0 && player.active) {
                            player.ultimateCharge = Math.min(100, player.ultimateCharge + 200 * dmgConverterRate);
                        }
                    }
                } else {
                    g.particles.emit(pcx, pcy, 'shield', 5);
                }
            }

            if (entities.miniBoss && entities.miniBoss.active && !entities.miniBoss.entering && entities.miniBoss.collidesWithCircle(player)) {
                if (Math.random() >= phaseChance) {
                    const died = player.takeDamage(1, g);
                    if (died) this.onPlayerDeath();
                    else {
                        g.levelManager.levelDamageTaken++;
                        if (dmgConverterRate > 0 && player.active) {
                            player.ultimateCharge = Math.min(100, player.ultimateCharge + 100 * dmgConverterRate);
                        }
                    }
                } else {
                    g.particles.emit(pcx, pcy, 'shield', 4);
                }
            }

            const magnetRange = perks.getMagnetRange();
            for (const pu of entities.powerUps) {
                if (!pu.active) continue;
                if (magnetRange > 0) {
                    const dx = pcx - (pu.position.x + pu.width / 2);
                    const dy = pcy - (pu.position.y + pu.height / 2);
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < magnetRange && dist > 5) {
                        const pull = 300 / dist;
                        pu.position.x += (dx / dist) * pull * 0.016;
                        pu.position.y += (dy / dist) * pull * 0.016;
                    }
                }
                if (pu.collidesWithCircle(player)) {
                    pu.apply(player, g);
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
                maxCombo: g.scoreManager.maxCombo,
                ship: g.selectedShipId,
                ultimate: g.selectedUltimateId,
                difficulty: g.difficulty.id
            });
        }

        g.cinematicManager.beginDeathCinematic(px, py);
    }
}

export default CollisionManager;
