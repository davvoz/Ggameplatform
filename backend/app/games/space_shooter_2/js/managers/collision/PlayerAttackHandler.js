import Explosion from '../../entities/Explosion.js';
import { MultiBoss } from '../../entities/Enemy.js';

class PlayerAttackHandler {

    constructor(game) {
        this.game = game;
    }

    process(perks, entities, grid) {
        const g = this.game;
        const piercePerk = perks.getPierceCount();
        const dmgMult = perks.getDamageMultiplier();
        const critChance = perks.getCritChance() + perks.getCritAoeBonusChance();
        const critMult = perks.getCritMultiplier();
        const hasExplosive = perks.hasExplosiveRounds();
        const critAoeRange = perks.getCritAoeRange();
        const stealthDmgBonus = perks.getStealthDamageBonus();
        const hijackChance = perks.getNeuralHijackChance();
        const hijackMaxAllies = perks.getNeuralHijackMaxAllies();
        const hasQuantumEntangle = perks.hasQuantumEntangle();

        const ctx = {
            dmgMult, critChance, critMult, hasExplosive, critAoeRange,
            stealthDmgBonus, hijackChance, hijackMaxAllies, hasQuantumEntangle, perks
        };

        for (const bullet of entities.bullets) {
            if (!bullet.active || bullet.owner !== 'player') continue;

            bullet._pierceLeft = bullet._pierceLeft ?? piercePerk;

            this._processEnemyHits(bullet, grid, ctx, g);
            this._processBossHit(bullet, entities, ctx, g);
            this._processMiniBossHit(bullet, entities, ctx, g);
        }
    }

    // ─── Enemy Hits ──────────────────────────────

    _processEnemyHits(bullet, grid, ctx, g) {
        const margin = 30;
        const nearby = grid.query(
            bullet.position.x - margin,
            bullet.position.y - margin,
            bullet.width + margin * 2,
            bullet.height + margin * 2
        );

        for (const enemy of nearby) {
            if (!enemy.active || enemy._isAlly || bullet._hitIds?.has(enemy)) continue;
            if (!bullet.collidesWithCircle(enemy)) continue;

            const { dmg, isCrit } = this._calculateDamage(
                bullet, ctx.dmgMult, ctx.stealthDmgBonus,
                ctx.critChance, ctx.critMult, enemy
            );

            if (ctx.hasQuantumEntangle) {
                enemy._quantumEntangled = true;
            }

            this._handleVirusInfection(bullet, enemy, g);
            const killed = enemy.takeDamage(Math.ceil(dmg), g);

            if (killed) {
                this._handleEnemyKill(enemy, ctx, g);
            }

            this._applyHitEffects(enemy, dmg, isCrit, ctx, g);
            this._handlePierce(bullet, enemy);

            if (!bullet.active) break;
        }
    }

    _calculateDamage(bullet, dmgMult, stealthBonus, critChance, critMult, enemy) {
        let dmg = bullet.damage * dmgMult;

        if (stealthBonus > 0 && enemy?.config?.stealth) {
            dmg *= (1 + stealthBonus);
        }

        const isCrit = Math.random() < critChance;
        if (isCrit) {
            dmg = Math.ceil(dmg * critMult);
        }

        return { dmg, isCrit };
    }

    _handleVirusInfection(bullet, enemy, g) {
        if (!bullet._virusChance || enemy._virusInfected) return;
        if (Math.random() >= bullet._virusChance) return;

        enemy._virusInfected = true;
        enemy._virusDuration = bullet._virusDuration;
        enemy._virusTimer = 0;
        this._emitVirusParticles(g, enemy);
    }

    _handleEnemyKill(enemy, ctx, g) {
        if (enemy._virusInfected) {
            this._spreadVirus(enemy, g);
        }

        if (enemy._quantumEntangled && ctx.hasQuantumEntangle) {
            this._applyQuantumEntangleSplash(enemy, ctx.perks, g);
        }

        g.waveManager.onEnemyKilled(enemy);

        const canHijack = ctx.hijackChance > 0
            && !enemy._isAlly && !enemy.config?.spawner
            && Math.random() < ctx.hijackChance
            && ctx.perks.alliedEnemies.length < ctx.hijackMaxAllies;

        if (canHijack) {
            this._convertToAlly(enemy, ctx.perks, g);
        }
    }

    _spreadVirus(enemy, g) {
        const eCX = enemy.position.x + enemy.width / 2;
        const eCY = enemy.position.y + enemy.height / 2;
        const candidates = [];

        for (const e2 of g.entityManager.enemies) {
            if (!e2.active || e2 === enemy || e2._isAlly || e2._virusInfected) continue;
            const dist = Math.hypot(
                (e2.position.x + e2.width / 2) - eCX,
                (e2.position.y + e2.height / 2) - eCY
            );
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
            this._emitVirusParticles(g, target);
        }
    }

    _convertToAlly(enemy, perks, g) {
        enemy.active = true;
        enemy.health = Math.ceil(enemy.maxHealth * 0.5);
        enemy._isAlly = true;
        enemy._allyShootTimer = 0;
        enemy.alpha = 1;
        perks.alliedEnemies.push(enemy);
        g.particles.emit(enemy.position.x + enemy.width / 2, enemy.position.y + enemy.height / 2, 'powerup', 10);
        g.postProcessing.flash({ r: 0, g: 220, b: 255 }, 0.08);
    }

    _applyQuantumEntangleSplash(enemy, perks, g) {
        const ecx = enemy.position.x + enemy.width / 2;
        const ecy = enemy.position.y + enemy.height / 2;
        const range = perks.getQuantumEntangleRange();
        const splashDmg = Math.max(1, Math.ceil(enemy.maxHealth * perks.getQuantumEntangleDmgPct()));

        let nearest = null;
        let nearestDist = range;

        for (const e of g.entityManager.enemies) {
            if (!e.active || e === enemy || e._isAlly) continue;
            const dist = Math.hypot(
                (e.position.x + e.width / 2) - ecx,
                (e.position.y + e.height / 2) - ecy
            );
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = e;
            }
        }

        if (nearest) {
            nearest.takeDamage(splashDmg, g);
            g.particles.emitCustom(
                nearest.position.x + nearest.width / 2,
                nearest.position.y + nearest.height / 2,
                { count: 6, speed: 40, life: 0.3, size: 3, color: { r: 0, g: 200, b: 255 }, gravity: 0, fadeOut: true, shrink: true },
                6
            );
        }
    }

    _applyHitEffects(enemy, dmg, isCrit, ctx, g) {
        const eCX = enemy.position.x + enemy.width / 2;
        const eCY = enemy.position.y + enemy.height / 2;

        if (isCrit) {
            this._applyCritEffects(g, eCX, eCY, ctx.critAoeRange, dmg);
            g.postProcessing.flash({ r: 255, g: 200, b: 50 }, 0.05);
        }

        if (ctx.hasExplosive) {
            g.perkEffectsManager.applyExplosiveAoE(eCX, eCY, 50, Math.ceil(dmg * 0.5));
        }

        g.sound.playHit();
    }

    _handlePierce(bullet, enemy) {
        if (bullet._pierceLeft > 0) {
            bullet._pierceLeft--;
            if (!bullet._hitIds) bullet._hitIds = new Set();
            bullet._hitIds.add(enemy);
        } else {
            bullet.destroy();
        }
    }

    // ─── Boss / MiniBoss Hits ────────────────────

    _processBossHit(bullet, entities, ctx, g) {
        const boss = entities.boss;
        if (!boss?.active || boss.entering || !bullet.active) return;

        const bCX = bullet.position.x + bullet.width / 2;
        const bCY = bullet.position.y + bullet.height / 2;

        const isMulti = boss instanceof MultiBoss;
        const hitIdx = isMulti ? boss.getHitPart(bCX, bCY) : -1;
        const hit = hitIdx >= 0 || (!isMulti && bullet.collidesWithCircle(boss));
        if (!hit) return;

        const { dmg, isCrit } = this._calculateDamage(bullet, ctx.dmgMult, 0, ctx.critChance, ctx.critMult);
        const killed = this._applyBossDamage(boss, hitIdx, Math.ceil(dmg), entities, g);
        if (killed) g.waveManager.onBossKilled();

        const { px, py } = this._getHitPosition(boss, hitIdx);
        if (isCrit) this._applyCritEffects(g, px, py, ctx.critAoeRange, dmg);
        if (ctx.hasExplosive) g.perkEffectsManager.applyExplosiveAoE(px, py, 50, Math.ceil(dmg * 0.3));

        g.sound.playHit();
        bullet.destroy();
    }

    _processMiniBossHit(bullet, entities, ctx, g) {
        const miniBoss = entities.miniBoss;
        if (!miniBoss?.active || miniBoss.entering || !bullet.active) return;

        const bCX = bullet.position.x + bullet.width / 2;
        const bCY = bullet.position.y + bullet.height / 2;
        const hitIdx = miniBoss.getHitPart(bCX, bCY);
        if (hitIdx < 0) return;

        const { dmg, isCrit } = this._calculateDamage(bullet, ctx.dmgMult, 0, ctx.critChance, ctx.critMult);
        this._applyMiniBossDamage(miniBoss, hitIdx, Math.ceil(dmg), entities, g);

        const { px, py } = this._getHitPosition(miniBoss, hitIdx);
        if (isCrit) this._applyCritEffects(g, px, py, ctx.critAoeRange, dmg);
        if (ctx.hasExplosive) g.perkEffectsManager.applyExplosiveAoE(px, py, 40, Math.ceil(dmg * 0.3));

        g.sound.playHit();
        bullet.destroy();
    }

    _applyBossDamage(boss, hitIdx, dmg, entities, g) {
        if (hitIdx >= 0) {
            const res = boss.damagepart(hitIdx, dmg, g);
            if (res.partDestroyed) {
                this._emitPartExplosion(res.part, entities, g, 1, 12);
            }
            return res.bossKilled;
        }
        return boss.takeDamage(dmg, g);
    }

    _applyMiniBossDamage(miniBoss, hitIdx, dmg, entities, g) {
        const res = miniBoss.damagepart(hitIdx, dmg, g);
        if (res.partDestroyed) {
            this._emitPartExplosion(res.part, entities, g, 0.8, 10);
        }
    }

    _emitPartExplosion(part, entities, g, scale, particleCount) {
        const cx = part.worldX + part.width / 2;
        const cy = part.worldY + part.height / 2;
        entities.explosions.push(new Explosion(cx, cy, scale));
        g.particles.emit(cx, cy, 'explosion', particleCount);
    }

    _getHitPosition(bossEntity, hitIdx) {
        const hitPart = hitIdx >= 0 ? bossEntity.parts[hitIdx] : null;
        const active = hitPart && hitPart.active !== false;
        return {
            px: active ? hitPart.worldX + hitPart.width / 2 : bossEntity.position.x + bossEntity.width / 2,
            py: active ? hitPart.worldY + hitPart.height / 2 : bossEntity.position.y + bossEntity.height / 2,
        };
    }

    // ─── Shared ──────────────────────────────────

    _applyCritEffects(g, px, py, critAoeRange, dmg) {
        g.particles.emit(px, py, 'explosion', 6);
        if (critAoeRange > 0) {
            g.perkEffectsManager.applyExplosiveAoE(px, py, critAoeRange, Math.ceil(dmg * 0.35));
        }
    }

    _emitVirusParticles(g, target) {
        g.particles.emitCustom(
            target.position.x + target.width / 2,
            target.position.y + target.height / 2,
            { count: 5, speed: 30, life: 0.4, size: 3, color: { r: 180, g: 0, b: 255 }, gravity: 0, fadeOut: true, shrink: true },
            5
        );
    }
}

export default PlayerAttackHandler;
