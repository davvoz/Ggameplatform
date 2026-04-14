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
        this.processBulletCollisions(perks, entities, grid, g);

        this.handlePlayerCollisions(entities, perks, g);
    }

    handlePlayerCollisions(entities, perks, g) {
        if (entities.player?.active) {
            // Pre-compute player AABB for fast reject
            const player = entities.player;
            const pcx = player.position.x + player.width / 2;
            const pcy = player.position.y + player.height / 2;
            const playerRadius = Math.min(player.width, player.height) * player.scale / 2;
            const phaseChance = perks.getPhaseChance();
            const dmgConverterRate = perks.getDamageConverterRate();
            const bulletReflectActive = player._bulletReflectActive && player.ultimateActive && player.ultimateId === 'quantum_shift';
            const reflectRadius = 52; // slightly larger than the visual

            this.complexFlow({
                entities,
                bulletReflectActive,
                pcx,
                pcy,
                reflectRadius,
                g,
                perks,
                playerRadius,
                player,
                phaseChance,
                dmgConverterRate
            });

            this.handleBossCollision(entities, player, phaseChance, g, dmgConverterRate, pcx, pcy);

            this.handleMiniBossCollision(entities, player, phaseChance, g, dmgConverterRate, pcx, pcy);

            this.handlePowerUpMagnetism(perks, entities, pcx, pcy, player, g);
        }
    }

    handlePowerUpMagnetism(perks, entities, pcx, pcy, player, g) {
        const magnetRange = perks.getMagnetRange();
        for (const pu of entities.powerUps) {
            if (!pu.active) continue;
            if (magnetRange > 0) {
                const dx = pcx - (pu.position.x + pu.width / 2);
                const dy = pcy - (pu.position.y + pu.height / 2);
                const dist = Math.hypot(dx, dy);
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

    handleMiniBossCollision(entities, player, phaseChance, g, dmgConverterRate, pcx, pcy) {
        if (entities.miniBoss?.active && !entities.miniBoss.entering && entities.miniBoss.collidesWithCircle(player)) {
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
    }

    handleBossCollision(entities, player, phaseChance, g, dmgConverterRate, pcx, pcy) {
        if (entities.boss?.active && !entities.boss.entering && entities.boss.collidesWithCircle(player)) {
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
    }

    complexFlow(options) {
        const { entities, g, perks, player, phaseChance, dmgConverterRate } = options;
        this.handleBulletInteractions(options);

        this.processEnemyCollisions(entities, player, perks, g, phaseChance, dmgConverterRate);
    }

    processEnemyCollisions(entities, player, perks, g, phaseChance, dmgConverterRate) {
        const playerCx = player.position.x + player.width / 2;
        const playerCy = player.position.y + player.height / 2;
        const thornsActive = perks.hasThorns();

        for (const enemy of entities.enemies) {
            if (!enemy.active || enemy._isAlly) continue;

            if (enemy.collidesWithCircle(player)) {
                if (thornsActive) {
                    this.applyThornsDamage(enemy, g, playerCx, playerCy);
                } else {
                    this.applyContactDamage(enemy, player, g, phaseChance, dmgConverterRate, playerCx, playerCy);
                }
            }
        }
    }

    applyThornsDamage(enemy, g, playerCx, playerCy) {
        const killed = enemy.takeDamage(3, g);
        if (killed) {
            g.waveManager.onEnemyKilled(enemy);
        }
        g.particles.emit(playerCx, playerCy, 'hit', 5);
    }

    applyContactDamage(enemy, player, g, phaseChance, dmgConverterRate, playerCx, playerCy) {
        const killed = enemy.takeDamage(enemy.health, g);
        if (killed) {
            g.waveManager.onEnemyKilled(enemy);
        }

        if (Math.random() < phaseChance) {
            g.particles.emit(playerCx, playerCy, 'shield', 3);
        } else {
            const playerDied = player.takeDamage(1, g);
            if (playerDied) {
                this.onPlayerDeath();
            } else {
                g.levelManager.levelDamageTaken += 1;
                if (dmgConverterRate > 0 && player.active) {
                    player.ultimateCharge = Math.min(100, player.ultimateCharge + 100 * dmgConverterRate);
                }
            }
        }
    }

    handleBulletInteractions(options) {
        const { entities, bulletReflectActive, pcx, pcy, reflectRadius, g, perks, playerRadius, player, phaseChance, dmgConverterRate } = options;
        for (const bullet of entities.bullets) {
            if (!bullet.active || bullet.owner !== 'enemy') continue;

            // ── Bullet Reflect: reflect enemy bullets within radius ──
            if (bulletReflectActive && this.tryReflectBullet(bullet, pcx, pcy, reflectRadius, g)) {
                continue;
            }

            // ── Allies absorb enemy bullets (shield the player) ──
            if (this.tryAbsorbBulletWithAllies(bullet, perks, g)) {
                continue;
            }

            // ── Fast distance pre-check: skip expensive circle if way too far ──
            const bcx = bullet.position.x + bullet.width / 2;
            const bcy = bullet.position.y + bullet.height / 2;
            const dx = bcx - pcx;
            const dy = bcy - pcy;
            const bulletRadius = Math.min(bullet.width, bullet.height) * bullet.scale / 2;
            const maxDist = playerRadius + bulletRadius;

            if (Math.abs(dx) > maxDist || Math.abs(dy) > maxDist) continue;

            if (bullet.collidesWithCircle(player)) {
                this.handlePlayerBulletCollision(bullet, player, g, phaseChance, dmgConverterRate);
            }
        }
    }

    tryReflectBullet(bullet, pcx, pcy, reflectRadius, g) {
        const bcx = bullet.position.x + bullet.width / 2;
        const bcy = bullet.position.y + bullet.height / 2;
        const dx = bcx - pcx;
        const dy = bcy - pcy;
        const dist = Math.hypot(dx, dy);

        if (dist < reflectRadius) {
            bullet.velocity.x = -bullet.velocity.x;
            bullet.velocity.y = -bullet.velocity.y;
            bullet.owner = 'player';
            bullet.damage = 2;
            g.particles.emit(bcx, bcy, 'shield', 3);
            return true;
        }
        return false;
    }

    tryAbsorbBulletWithAllies(bullet, perks, g) {
        const allies = perks.alliedEnemies;
        if (!allies || allies.length === 0) return false;

        const bcx = bullet.position.x + bullet.width / 2;
        const bcy = bullet.position.y + bullet.height / 2;

        for (const ally of allies) {
            if (!ally.active) continue;

            const ax = ally.position.x + ally.width / 2;
            const ay = ally.position.y + ally.height / 2;
            const ar = ally.width * 0.5;
            const adx = bcx - ax;
            const ady = bcy - ay;

            if (adx * adx + ady * ady < ar * ar) {
                bullet.destroy();
                ally.takeDamage(1, g);
                ally.hitFlash = 1;
                g.particles.emit(bcx, bcy, 'shield', 4);
                return true;
            }
        }
        return false;
    }

    handlePlayerBulletCollision(bullet, player, g, phaseChance, dmgConverterRate) {
        if (Math.random() < phaseChance) {
            bullet.destroy();
            g.particles.emit(player.position.x + player.width / 2, player.position.y + player.height / 2, 'shield', 3);
            return;
        }

        bullet.destroy();
        const died = player.takeDamage(1, g);

        if (died) {
            this.onPlayerDeath();
        } else {
            g.levelManager.levelDamageTaken += 1;
            if (dmgConverterRate > 0 && player.active) {
                player.ultimateCharge = Math.min(100, player.ultimateCharge + 100 * dmgConverterRate);
            }
        }
    }

    processBulletCollisions(perks, entities, grid, g) {
        const piercePerk = perks.getPierceCount(); //
        const dmgMult = perks.getDamageMultiplier(); //
        const critChance = perks.getCritChance(); //
        const critMult = perks.getCritMultiplier(); //
        const hasExplosive = perks.hasExplosiveRounds(); //
        const critAoeRange = perks.getCritAoeRange(); //
        const critAoeBonusChance = perks.getCritAoeBonusChance(); //
        const stealthDmgBonus = perks.getStealthDamageBonus(); //
        const hijackChance = perks.getNeuralHijackChance(); //
        const hijackMaxAllies = perks.getNeuralHijackMaxAllies(); //

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

            pierceLeft = this.processBulletHits({
                nearby,
                bullet,
                dmgMult,
                stealthDmgBonus,
                critChance,
                critAoeBonusChance,
                critMult,
                g,
                hijackChance,
                perks,
                hijackMaxAllies,
                critAoeRange,
                hasExplosive,
                pierceLeft
            });

            this.processBossCollision({ entities, bullet, dmgMult, critChance, critAoeBonusChance, critMult, g, critAoeRange, hasExplosive });

            this.processMiniBossCollision({ entities, bullet, dmgMult, critChance, critAoeBonusChance, critMult, g, critAoeRange, hasExplosive });
        }
    }

    processMiniBossCollision(options) {
        const { entities, bullet, dmgMult, critChance, critAoeBonusChance, critMult, g, critAoeRange, hasExplosive } = options;
        if (entities.miniBoss?.active && !entities.miniBoss.entering && bullet.active) {
            const bCX = bullet.position.x + bullet.width / 2;
            const bCY = bullet.position.y + bullet.height / 2;
            const hitIdx = entities.miniBoss.getHitPart(bCX, bCY);
            if (hitIdx >= 0) {
                const { dmg, isCrit } = this.calculateDamage(bullet, dmgMult, critChance, critAoeBonusChance, critMult);

                this.handleMiniBossDamage(entities, hitIdx, dmg, g);

                const hitPart = entities.miniBoss.parts[hitIdx];
                const px = hitPart && hitPart.active !== false ? hitPart.worldX + hitPart.width / 2 : (entities.miniBoss.position.x + entities.miniBoss.width / 2);
                const py = hitPart && hitPart.active !== false ? hitPart.worldY + hitPart.height / 2 : (entities.miniBoss.position.y + entities.miniBoss.height / 2);
                this.handleCriticalHitEffects(isCrit, g, px, py, critAoeRange, dmg);
                this.applyExplosiveDamage(hasExplosive, g, px, py, dmg);

                g.sound.playHit();
                bullet.destroy();
            }
        }
    }

    applyExplosiveDamage(hasExplosive, g, px, py, dmg) {
        if (hasExplosive) {
            g.perkEffectsManager.applyExplosiveAoE(px, py, 40, Math.ceil(dmg * 0.3));
        }
    }

    handleCriticalHitEffects(isCrit, g, px, py, critAoeRange, dmg) {
        if (isCrit) {
            g.particles.emit(px, py, 'explosion', 5);
            if (critAoeRange > 0) {
                g.perkEffectsManager.applyExplosiveAoE(px, py, critAoeRange, Math.ceil(dmg * 0.35));
            }
        }
    }

    handleMiniBossDamage(entities, hitIdx, dmg, g) {
        const res = entities.miniBoss.damagepart(hitIdx, Math.ceil(dmg), g);
        if (res.partDestroyed) {
            const part = res.part;
            const partCX = part.worldX + part.width / 2;
            const partCY = part.worldY + part.height / 2;
            entities.explosions.push(new Explosion(partCX, partCY, 0.8));
            g.particles.emit(partCX, partCY, 'explosion', 10);
        }
    }

    calculateDamage(bullet, dmgMult, critChance, critAoeBonusChance, critMult) {
        let dmg = bullet.damage * dmgMult;
        const isCrit = Math.random() < (critChance + critAoeBonusChance);
        if (isCrit) dmg = Math.ceil(dmg * critMult);
        return { dmg, isCrit };
    }

    processBossCollision(options) {
        const { entities, bullet, dmgMult, critChance, critAoeBonusChance, critMult, g, critAoeRange, hasExplosive } = options;
        if (entities.boss?.active && !entities.boss.entering && bullet.active) {
            const bCX = bullet.position.x + bullet.width / 2;
            const bCY = bullet.position.y + bullet.height / 2;
            const hitIdx = (entities.boss instanceof MultiBoss) ? entities.boss.getHitPart(bCX, bCY) : -1;
            const hitBoss = hitIdx >= 0 || (!(entities.boss instanceof MultiBoss) && bullet.collidesWithCircle(entities.boss));
            this.handleBossDamage({ hitBoss, bullet, dmgMult, critChance, critAoeBonusChance, critMult, hitIdx, entities, g, critAoeRange, hasExplosive });
        }
    }

    handleBossDamage(options) {
        const { hitBoss, bullet, dmgMult, critChance, critAoeBonusChance, critMult, hitIdx, entities, g, critAoeRange, hasExplosive } = options;
        if (hitBoss) {
            let dmg = bullet.damage * dmgMult;
            const isCrit = Math.random() < (critChance + critAoeBonusChance);
            if (isCrit) dmg = Math.ceil(dmg * critMult);

            this.handleBossDamageEvent(hitIdx, entities, dmg, g);

            this.handleCriticalHitEffectsBoss(hitIdx, entities, isCrit, g, critAoeRange, dmg, hasExplosive);

            g.sound.playHit();
            bullet.destroy();
        }
    }

    handleCriticalHitEffectsBoss(hitIdx, entities, isCrit, g, critAoeRange, dmg, hasExplosive) {
        const { px, py } = this.calculateHitPosition(hitIdx, entities);
        if (isCrit) {
            this.triggerExplosionEffects(g, px, py, critAoeRange, dmg);
        }
        if (hasExplosive) {
            g.perkEffectsManager.applyExplosiveAoE(px, py, 50, Math.ceil(dmg * 0.3));
        }
    }

    calculateHitPosition(hitIdx, entities) {
        const hitPart = hitIdx >= 0 ? entities.boss.parts[hitIdx] : null;
        const px = hitPart && hitPart.active !== false ? hitPart.worldX + hitPart.width / 2 : (entities.boss.position.x + entities.boss.width / 2);
        const py = hitPart && hitPart.active !== false ? hitPart.worldY + hitPart.height / 2 : (entities.boss.position.y + entities.boss.height / 2);
        return { px, py };
    }

    triggerExplosionEffects(g, px, py, critAoeRange, dmg) {
        g.particles.emit(px, py, 'explosion', 6);
        if (critAoeRange > 0) {
            g.perkEffectsManager.applyExplosiveAoE(px, py, critAoeRange, Math.ceil(dmg * 0.35));
        }
    }

    handleBossDamageEvent(hitIdx, entities, dmg, g) {
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
    }

    processBulletHits(options) {
        const { nearby, bullet, dmgMult, stealthDmgBonus, critChance, critAoeBonusChance, critMult, g, hijackChance, perks, hijackMaxAllies, critAoeRange, hasExplosive, pierceLeft } = options;
        let currentPierceLeft = pierceLeft;

        for (const enemy of nearby) {
            if (!this.shouldProcessEnemy(enemy, bullet)) {
                continue;
            }

            if (!bullet.collidesWithCircle(enemy)) {
                continue;
            }

            const dmg = this.calculateBulletDamage(bullet, dmgMult, stealthDmgBonus, critChance, critAoeBonusChance, critMult, enemy);
            const isCrit = Math.random() < (critChance + critAoeBonusChance);

            this.handleVirusInfection(bullet, enemy, g);
            const killed = enemy.takeDamage(Math.ceil(dmg), g);

            if (killed) {
                this.handleEnemyKilled(enemy, g, hijackChance, perks, hijackMaxAllies);
            }

            this.applyHitEffects(enemy, dmg, isCrit, g, critAoeRange, hasExplosive);
            currentPierceLeft = this.handlePierce(bullet, enemy, currentPierceLeft);

            if (!bullet.active) {
                break;
            }
        }

        return currentPierceLeft;
    }

    shouldProcessEnemy(enemy, bullet) {
        return enemy.active && !enemy._isAlly && !bullet._hitIds?.has(enemy);
    }

    calculateBulletDamage(bullet, dmgMult, stealthDmgBonus, critChance, critAoeBonusChance, critMult, enemy) {
        let dmg = bullet.damage * dmgMult;
        if (stealthDmgBonus > 0 && enemy.config?.stealth) {
            dmg *= (1 + stealthDmgBonus);
        }
        const isCrit = Math.random() < (critChance + critAoeBonusChance);
        if (isCrit) {
            dmg = Math.ceil(dmg * critMult);
        }
        return dmg;
    }

    handleVirusInfection(bullet, enemy, g) {
        if (!bullet._virusChance || enemy._virusInfected || Math.random() >= bullet._virusChance) {
            return;
        }

        enemy._virusInfected = true;
        enemy._virusDuration = bullet._virusDuration;
        enemy._virusTimer = 0;
        g.particles.emitCustom(
            enemy.position.x + enemy.width / 2,
            enemy.position.y + enemy.height / 2,
            {
                count: 5, speed: 30, life: 0.4, size: 3,
                color: { r: 180, g: 0, b: 255 }, gravity: 0, fadeOut: true, shrink: true
            },
            5
        );
    }

    handleEnemyKilled(enemy, g, hijackChance, perks, hijackMaxAllies) {
        if (enemy._virusInfected) {
            this.spreadVirus(enemy, g);
        }

        const canHijack = hijackChance > 0 && !enemy._isAlly && !enemy.config?.spawner
            && Math.random() < hijackChance && perks.alliedEnemies.length < hijackMaxAllies;

        if (canHijack) {
            this.convertToAlly(enemy, perks, g);
        } else {
            g.waveManager.onEnemyKilled(enemy);
        }
    }

    spreadVirus(enemy, g) {
        const eCX = enemy.position.x + enemy.width / 2;
        const eCY = enemy.position.y + enemy.height / 2;
        const candidates = [];

        for (const e2 of g.entityManager.enemies) {
            if (!e2.active || e2 === enemy || e2._isAlly || e2._virusInfected) {
                continue;
            }
            const dx = (e2.position.x + e2.width / 2) - eCX;
            const dy = (e2.position.y + e2.height / 2) - eCY;
            const dist = Math.hypot(dx, dy);
            if (dist < 150) {
                candidates.push({ e: e2, d: dist });
            }
        }

        candidates.sort((a, b) => a.d - b.d);
        const maxSpread = Math.min(2, candidates.length);

        for (let i = 0; i < maxSpread; i++) {
            const target = candidates[i].e;
            target._virusInfected = true;
            target._virusDuration = enemy._virusDuration;
            target._virusTimer = 0;
            g.particles.emitCustom(
                target.position.x + target.width / 2,
                target.position.y + target.height / 2,
                {
                    count: 4, speed: 25, life: 0.3, size: 2,
                    color: { r: 180, g: 0, b: 255 }, gravity: 0, fadeOut: true, shrink: true
                },
                4
            );
        }
    }

    convertToAlly(enemy, perks, g) {
        enemy.active = true;
        enemy.health = Math.ceil(enemy.maxHealth * 0.5);
        enemy._isAlly = true;
        enemy._allyShootTimer = 0;
        enemy.alpha = 1;
        perks.alliedEnemies.push(enemy);
        g.particles.emit(enemy.position.x + enemy.width / 2, enemy.position.y + enemy.height / 2, 'powerup', 10);
        g.postProcessing.flash({ r: 0, g: 220, b: 255 }, 0.08);
    }

    applyHitEffects(enemy, dmg, isCrit, g, critAoeRange, hasExplosive) {
        const eCX = enemy.position.x + enemy.width / 2;
        const eCY = enemy.position.y + enemy.height / 2;

        if (isCrit) {
            g.particles.emit(eCX, eCY, 'explosion', 6);
            g.postProcessing.flash({ r: 255, g: 200, b: 50 }, 0.05);
            if (critAoeRange > 0) {
                g.perkEffectsManager.applyExplosiveAoE(eCX, eCY, critAoeRange, Math.ceil(dmg * 0.4));
            }
        }

        if (hasExplosive) {
            g.perkEffectsManager.applyExplosiveAoE(eCX, eCY, 50, Math.ceil(dmg * 0.5));
        }

        g.sound.playHit();
    }

    handlePierce(bullet, enemy, pierceLeft) {
        if (pierceLeft > 0) {
            const newPierceLeft = pierceLeft - 1;
            bullet._pierceLeft = newPierceLeft;
            if (!bullet._hitIds) {
                bullet._hitIds = new Set();
            }
            bullet._hitIds.add(enemy);
            return newPierceLeft;
        }
        bullet.destroy();
        return 0;
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

        // Delete checkpoint save — this run is over (leaderboard integrity)
        g.saveManager.deleteSave(true);

        // Send score to platform — use delta (xp_score) so XP is only for new points
        const deltaScore = g.scoreManager.score - g.lastSentScore;
        if (globalThis.sendScoreToPlatform) {
            globalThis.sendScoreToPlatform(g.scoreManager.score, {
                level: g.levelManager.currentLevel,
                levelsCompleted: g.levelManager.currentLevel - (g.sessionStartLevel || 1),
                enemiesKilled: g.scoreManager.totalEnemiesKilled,
                maxCombo: g.scoreManager.maxCombo,
                ship: g.selectedShipId,
                ultimate: g.selectedUltimateId,
                difficulty: g.difficulty.id,
                continued: g.hasContinued,
                xp_score: deltaScore > 0 ? deltaScore : g.scoreManager.score
            });
        }
        g.lastSentScore = g.scoreManager.score;

        g.cinematicManager.beginDeathCinematic(px, py);
    }
}

export default CollisionManager;
