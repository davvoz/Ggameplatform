class PlayerDefenseHandler {

    constructor(game, onPlayerDeath) {
        this.game = game;
        this._onPlayerDeath = onPlayerDeath;
    }

    process(entities, perks) {
        const player = entities.player;
        if (!player?.active) return;

        const pcx = player.position.x + player.width / 2;
        const pcy = player.position.y + player.height / 2;
        const playerRadius = Math.min(player.width, player.height) * player.scale / 2;
        const phaseChance = perks.getPhaseChance();
        const dmgConverterRate = perks.getDamageConverterRate();

        this._processEnemyBullets(player, entities, { perks, pcx, pcy, playerRadius, phaseChance, dmgConverterRate });
        this._processEnemyContact(entities.enemies, player, { perks, pcx, pcy, phaseChance, dmgConverterRate });
        this._processBossContact(entities.boss, player, { perks, pcx, pcy, phaseChance, dmgConverterRate }, 2);
        this._processBossContact(entities.miniBoss, player, { perks, pcx, pcy, phaseChance, dmgConverterRate }, 1);
        this._processItemPickups(perks, entities.powerUps, player, pcx, pcy);
    }

    // ─── Enemy Bullets → Player ──────────────────

    _processEnemyBullets(player, entities, options) {
        const { perks, pcx, pcy, playerRadius, phaseChance, dmgConverterRate } = options;
        const defense = this._buildDefenseContext(player, perks);

        for (const bullet of entities.bullets) {
            if (!bullet.active || bullet.owner !== 'enemy') continue;

            const bcx = bullet.position.x + bullet.width / 2;
            const bcy = bullet.position.y + bullet.height / 2;

            if (this._tryDefendBullet(bullet, bcx, bcy, pcx, pcy, defense)) continue;
            if (!this._isInCollisionRange(bcx, bcy, pcx, pcy, playerRadius, bullet)) continue;

            if (bullet.collidesWithCircle(player)) {
                this._handlePlayerHit(bullet, player, pcx, pcy, phaseChance, dmgConverterRate);
            }
        }
    }

    _buildDefenseContext(player, perks) {
        return {
            reflectActive: player._bulletReflectActive && player.ultimateActive && player.ultimateId === 'quantum_shift',
            reflectRadius: 52,
            probFieldChance: perks.getProbabilityFieldChance(),
            probFieldRange: perks.getProbabilityFieldRange(),
            perks,
        };
    }

    _tryDefendBullet(bullet, bcx, bcy, pcx, pcy, ctx) {
        if (ctx.reflectActive && this._tryReflectBullet(bullet, bcx, bcy, pcx, pcy, ctx.reflectRadius)) return true;
        if (ctx.probFieldChance > 0 && this._tryProbFieldDeflect(bullet, bcx, bcy, pcx, pcy, ctx)) return true;
        return this._tryAbsorbBulletWithAllies(bullet, bcx, bcy, ctx.perks);
    }

    _isInCollisionRange(bcx, bcy, pcx, pcy, playerRadius, bullet) {
        const bulletRadius = Math.min(bullet.width, bullet.height) * bullet.scale / 2;
        const maxDist = playerRadius + bulletRadius;
        return Math.abs(bcx - pcx) <= maxDist && Math.abs(bcy - pcy) <= maxDist;
    }

    _tryReflectBullet(bullet, bcx, bcy, pcx, pcy, reflectRadius) {
        if (Math.hypot(bcx - pcx, bcy - pcy) >= reflectRadius) return false;

        bullet.velocity.x = -bullet.velocity.x;
        bullet.velocity.y = -bullet.velocity.y;
        bullet.owner = 'player';
        bullet.damage = 2;
        this.game.particles.emit(bcx, bcy, 'shield', 3);
        return true;
    }

    _tryProbFieldDeflect(bullet, bcx, bcy, pcx, pcy, ctx) {
        const dist = Math.hypot(bcx - pcx, bcy - pcy);
        if (dist >= ctx.probFieldRange || Math.random() >= ctx.probFieldChance) return false;

        bullet.destroy();
        this.game.particles.emit(bcx, bcy, 'shield', 3);
        return true;
    }

    _tryAbsorbBulletWithAllies(bullet, bcx, bcy, perks) {
        const allies = perks.alliedEnemies;
        if (!allies || allies.length === 0) return false;

        for (const ally of allies) {
            if (!ally.active) continue;
            const dx = bcx - (ally.position.x + ally.width / 2);
            const dy = bcy - (ally.position.y + ally.height / 2);
            const ar = ally.width * 0.5;

            if (dx * dx + dy * dy < ar * ar) {
                bullet.destroy();
                ally.takeDamage(1, this.game);
                ally.hitFlash = 1;
                this.game.particles.emit(bcx, bcy, 'shield', 4);
                return true;
            }
        }
        return false;
    }

    _handlePlayerHit(bullet, player, pcx, pcy, phaseChance, dmgConverterRate) {
        const g = this.game;

        if (Math.random() < phaseChance) {
            bullet.destroy();
            g.particles.emit(pcx, pcy, 'shield', 3);
            return;
        }

        bullet.destroy();
        this._applyPlayerDamage(player, 1, dmgConverterRate);
    }

    // ─── Enemy Body → Player ─────────────────────

    _processEnemyContact(enemies, player, options) {
        const { perks, pcx, pcy, phaseChance, dmgConverterRate } = options;
        const thornsActive = perks.hasThorns();

        for (const enemy of enemies) {
            if (!enemy.active || enemy._isAlly || !enemy.collidesWithCircle(player)) continue;

            if (thornsActive) {
                this._applyThornsContact(enemy, pcx, pcy);
            } else {
                this._applyNormalContact(enemy, player, pcx, pcy, phaseChance, dmgConverterRate);
            }
        }
    }

    _applyThornsContact(enemy, pcx, pcy) {
        const g = this.game;
        const killed = enemy.takeDamage(3, g);
        if (killed) g.waveManager.onEnemyKilled(enemy);
        g.particles.emit(pcx, pcy, 'hit', 5);
    }

    _applyNormalContact(enemy, player, pcx, pcy, phaseChance, dmgConverterRate) {
        const g = this.game;
        const killed = enemy.takeDamage(enemy.health, g);
        if (killed) g.waveManager.onEnemyKilled(enemy);

        if (Math.random() < phaseChance) {
            g.particles.emit(pcx, pcy, 'shield', 3);
        } else {
            this._applyPlayerDamage(player, 1, dmgConverterRate);
        }
    }

    // ─── Boss / MiniBoss Body → Player ───────────

    _processBossContact(bossEntity, player, options, damage) {
        if (!bossEntity?.active || bossEntity.entering) return;
        if (!bossEntity.collidesWithCircle(player)) return;

        const { pcx, pcy, phaseChance, dmgConverterRate } = options;
        const g = this.game;

        if (Math.random() < phaseChance) {
            g.particles.emit(pcx, pcy, 'shield', damage + 2);
        } else {
            this._applyPlayerDamage(player, damage, dmgConverterRate);
        }
    }

    // ─── Power-up Pickup ─────────────────────────

    _processItemPickups(perks, powerUps, player, pcx, pcy) {
        const g = this.game;
        const magnetRange = perks.getMagnetRange();

        for (const pu of powerUps) {
            if (!pu.active) continue;

            if (magnetRange > 0) {
                this._applyMagnetism(pu, pcx, pcy, magnetRange);
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

    _applyMagnetism(pu, pcx, pcy, magnetRange) {
        const dx = pcx - (pu.position.x + pu.width / 2);
        const dy = pcy - (pu.position.y + pu.height / 2);
        const dist = Math.hypot(dx, dy);

        if (dist < magnetRange && dist > 5) {
            const pull = 300 / dist;
            pu.position.x += (dx / dist) * pull * 0.016;
            pu.position.y += (dy / dist) * pull * 0.016;
        }
    }

    // ─── Shared ──────────────────────────────────

    _applyPlayerDamage(player, damage, dmgConverterRate) {
        const g = this.game;
        const died = player.takeDamage(damage, g);

        if (died) {
            this._onPlayerDeath();
        } else {
            g.levelManager.levelDamageTaken += damage;
            if (dmgConverterRate > 0 && player.active) {
                player.ultimateCharge = Math.min(100, player.ultimateCharge + 100 * damage * dmgConverterRate);
            }
        }
    }
}

export default PlayerDefenseHandler;
