/**
 * CollisionSystem — Resolves all entity-vs-player collisions.
 *
 * Single Responsibility: collision detection and response dispatch.
 * Each collision type is a focused method with low cognitive complexity.
 */

import { COLORS } from '../config/Constants.js';

export class CollisionSystem {
    /** Set to `true` during any frame that a collectible/power-up was picked up. */
    hudFlash = false;

    /**
     * Run all collision checks for the current frame.
     *
     * @param {object} player
     * @param {import('./EntityManager.js').EntityManager} entities
     * @param {object} game               — Game instance
     * @param {import('./FloatingTextManager.js').FloatingTextManager} floatingTexts
     * @param {number} cameraY
     * @param {Function} onDeath           — callback when player dies
     */
    checkAll(player, entities, game, floatingTexts, cameraY, onDeath) {
        if (!player) return;

        this.hudFlash = false;
        this.#checkPlatforms(player, entities.platforms, game, onDeath);
        this.#checkEnemies(player, entities.enemies, game, floatingTexts, cameraY, onDeath);
        this.#checkCollectibles(player, entities.collectibles, game);
        this.#checkPowerUps(player, entities.powerUps, game, floatingTexts, cameraY);
        this.#checkBullets(player, entities.enemies, game, onDeath);
    }

    // ── Platform landing ──────────────────────────────────────────

    #checkPlatforms(player, platforms, game, onDeath) {
        if (player.vy <= 0) return; // only when falling

        for (const platform of platforms) {
            if (!platform.active || !platform.canLand(player)) continue;

            if (player.bottom >= platform.top &&
                player.bottom <= platform.top + 20 &&
                player.right  > platform.left &&
                player.left   < platform.right) {

                const isDeadly = platform.onLand(player, game.particles, game.sound);

                if (isDeadly) {
                    this.#applyDamage(player, game, onDeath);
                } else if (platform.type !== 'cloud' || platform.isSolid) {
                    const bounce = platform.getBounceMultiplier();
                    player.land(platform.top, bounce);

                    if (platform.type === 'bouncy') {
                        game.sound.playBounce();
                    }
                }
                break;
            }
        }
    }

    // ── Enemy interactions ────────────────────────────────────────

    #checkEnemies(player, enemies, game, floatingTexts, cameraY, onDeath) {
        for (const enemy of enemies) {
            if (!enemy.active) continue;
            if (!player.intersects(enemy)) continue;

            if (this.#tryDashKill(player, enemy, game, floatingTexts, cameraY)) continue;
            if (this.#tryStomp(player, enemy, enemies, game))   continue;
            if (this.#trySpikeHeadbutt(player, enemy, game)) continue;
            this.#handleEnemyContact(player, enemy, game, floatingTexts, cameraY, onDeath);
        }
    }

    #tryDashKill(player, enemy, game, floatingTexts, cameraY) {
        if (!player.isDashing) return false;

        enemy.onStomp(game.particles, game.sound);
        game.addScore(enemy.scoreValue * (1 + player.combo * 0.5));
        game.enemiesDefeated++;
        game.shake.shake(6, 0.12);
        game.sound.playCombo?.();
        floatingTexts.add({
            x: enemy.x,
            screenY: enemy.y - cameraY - 20,
            text: 'DASH!',
            life: 0.8,
            vy: -60,
        });
        return true;
    }

    #tryStomp(player, enemy, allEnemies, game) {
        if (player.vy <= 0) return false;
        if (player.top >= enemy.centerY) return false;
        if (!enemy.canBeStomped) return false;

        enemy.onStomp(game.particles, game.sound);
        player.stomp(game.sound);
        game.addScore(enemy.scoreValue * (1 + player.combo * 0.5));
        game.enemiesDefeated++;
        game.shake.shake(5, 0.1);
        game.sound.playCombo();

        if (player.stats.hasShockwave) {
            CollisionSystem.#shockwave(enemy.x, enemy.y, allEnemies, game);
        }
        return true;
    }

    #trySpikeHeadbutt(player, enemy, game) {
        if (player.vy >= 0) return false;
        if (player.top < enemy.bottom - 22) return false;
        if (player.spikeCount <= 0) return false;
        if (!player.fireSpike()) return false;

        enemy.onStomp(game.particles, game.sound);
        game.addScore(enemy.scoreValue * (1 + player.combo * 0.5));
        game.enemiesDefeated++;
        game.shake.shake(4, 0.1);
        game.sound.playCombo?.();
        return true;
    }

    #handleEnemyContact(player, enemy, game, floatingTexts, cameraY, onDeath) {
        if (player.isInvincible) return;

        // Ghost Repel perk
        if (enemy.type === 'ghost' && player.ghostRepelReady) {
            enemy.onStomp(game.particles, game.sound);
            game.addScore(enemy.scoreValue);
            game.enemiesDefeated++;
            player.triggerGhostRepel();
            game.shake.shake(8, 0.2);
            floatingTexts.add({
                x: enemy.x,
                screenY: enemy.y - cameraY - 20,
                text: 'REPELLED!',
                life: 1.2,
                vy: -50,
            });
            return;
        }

        this.#applyDamage(player, game, onDeath);
    }

    // ── Collectibles ──────────────────────────────────────────────

    #checkCollectibles(player, collectibles, game) {
        for (const collectible of collectibles) {
            if (!collectible.active || collectible.isCollected) continue;
            if (!player.intersects(collectible)) continue;

            collectible.collect(game.particles, game.sound);
            const multiplier = player.coinMultiplier;
            game.addCoins(collectible.value, multiplier);
            game.addScore(collectible.scoreValue);
            player.coinCollect();
            this.hudFlash = true;
        }
    }

    // ── Power-ups ─────────────────────────────────────────────────

    #checkPowerUps(player, powerUps, game, floatingTexts, cameraY) {
        for (const powerUp of powerUps) {
            if (!powerUp.active || powerUp.isCollected) continue;
            if (!player.intersects(powerUp)) continue;

            const isExtraLife = powerUp.type === 'extra_life';
            powerUp.collect(player, game.particles, game.sound);
            this.hudFlash = true;

            if (isExtraLife) {
                game.particles.extraLifeCollect(powerUp.x, powerUp.y);
                floatingTexts.add({
                    x: powerUp.x,
                    screenY: powerUp.y - cameraY,
                    text: '+❤️',
                    life: 1.4,
                    vy: -55,
                });
            }
        }
    }

    // ── Enemy bullets ─────────────────────────────────────────────

    #checkBullets(player, enemies, game, onDeath) {
        for (const enemy of enemies) {
            for (const bullet of enemy.bullets) {
                if (!bullet.active) continue;

                const dx   = bullet.x - player.x;
                const dy   = bullet.y - player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 20 && !player.isInvincible) {
                    bullet.active = false;
                    this.#applyDamage(player, game, onDeath);
                }
            }
        }
    }

    // ── Shared helpers ────────────────────────────────────────────

    #applyDamage(player, game, onDeath) {
        const died = player.takeDamage(game.sound);
        game.shake.shake(15, 0.3);
        if (died) onDeath();
    }

    static #shockwave(x, y, enemies, game) {
        for (const enemy of enemies) {
            if (!enemy.active) continue;
            const dx   = enemy.x - x;
            const dy   = enemy.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 80) {
                enemy.onStomp(game.particles, game.sound);
                game.addScore(enemy.scoreValue);
                game.enemiesDefeated++;
            }
        }

        game.particles.burst(x, y, {
            color: COLORS.NEON_CYAN,
            size: 10,
            sizeEnd: 0,
            life: 0.4,
            speed: 200,
            spread: 360,
        }, 20);
    }
}
