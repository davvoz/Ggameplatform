/**
 * EntityManager — Owns and manages all game entities (platforms, enemies,
 * collectibles, power-ups).
 *
 * Single Responsibility: creation, batch update, cleanup and draw of entities.
 * Eliminates duplicated spawning logic between level-mode and infinite-mode.
 */

import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../config/Constants.js';
import { PlatformFactory } from '../entities/Platform.js';
import { EnemyFactory }    from '../entities/Enemy.js';
import { CollectibleFactory } from '../entities/Collectible.js';
import { PowerUpFactory }  from '../entities/PowerUp.js';
import { compactInPlace }  from '../core/ArrayUtils.js';

export class EntityManager {
    #platforms    = [];
    #enemies      = [];
    #collectibles = [];
    #powerUps     = [];

    get platforms()    { return this.#platforms; }
    get enemies()      { return this.#enemies; }
    get collectibles() { return this.#collectibles; }
    get powerUps()     { return this.#powerUps; }

    /**
     * Add a safe starting platform at the bottom of the screen.
     */
    addStartPlatform() {
        this.#platforms.push(
            PlatformFactory.createType(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 50, 'normal')
        );
    }

    /**
     * Load entities from a screen definition at a given screen index.
     * Shared by both level-mode (bulk load) and infinite-mode (append).
     *
     * @param {object} screen  — { platforms, enemies, collectibles, powerUps }
     * @param {number} screenIndex — 0 = bottom, increasing upward
     */
    loadScreen(screen, screenIndex) {
        const toWorldY = (fracY) => DESIGN_HEIGHT * (1 - fracY - screenIndex);

        for (const pd of screen.platforms) {
            this.#platforms.push(
                PlatformFactory.createType(pd.x * DESIGN_WIDTH, toWorldY(pd.y), pd.type)
            );
        }
        for (const ed of screen.enemies) {
            const worldY = toWorldY(ed.y);
            this.#enemies.push(
                EnemyFactory.createType(ed.x * DESIGN_WIDTH, worldY, ed.type, -worldY)
            );
        }
        for (const cd of screen.collectibles) {
            const worldY = toWorldY(cd.y);
            this.#collectibles.push(
                CollectibleFactory.createType(cd.x * DESIGN_WIDTH, worldY, cd.type, -worldY)
            );
        }
        for (const upd of screen.powerUps) {
            this.#powerUps.push(
                PowerUpFactory.createType(upd.x * DESIGN_WIDTH, toWorldY(upd.y), upd.type)
            );
        }
    }

    /**
     * Load all screens from a level definition.
     *
     * @param {Array<object>} screens — array of screen descriptors
     */
    loadAllScreens(screens) {
        for (let s = 0; s < screens.length; s++) {
            this.loadScreen(screens[s], s);
        }
    }

    // ── Per-frame updates ─────────────────────────────────────────

    updatePlatforms(dt) {
        for (const platform of this.#platforms) {
            platform.update(dt);
        }
    }

    updateEnemies(dt, player) {
        const timeScale = player?.hasSlowTime ? 0.3 : 1;
        for (const enemy of this.#enemies) {
            enemy.update(dt * timeScale, player);
        }
    }

    updateCollectibles(dt, player) {
        const magnetRange = player?.magnetRange || 0;

        for (const collectible of this.#collectibles) {
            collectible.update(dt);

            if (magnetRange > 0 && !collectible.isCollected) {
                const dx = player.x - collectible.x;
                const dy = player.y - collectible.y;
                const dist = Math.hypot(dx, dy);

                if (dist < magnetRange) {
                    collectible.attractTo(player.x, player.y, 400, dt);
                }
            }
        }
    }

    updatePowerUps(dt) {
        for (const powerUp of this.#powerUps) {
            powerUp.update(dt);
        }
    }

    /**
     * Run all entity updates in one call.
     *
     * @param {number} dt
     * @param {object} player
     */
    updateAll(dt, player) {
        this.updatePlatforms(dt);
        this.updateEnemies(dt, player);
        this.updateCollectibles(dt, player);
        this.updatePowerUps(dt);
    }

    // ── Cleanup off-screen entities ───────────────────────────────

    cleanup(cameraY) {
        const threshold = cameraY + DESIGN_HEIGHT + 200;
        compactInPlace(this.#platforms,    p => p.active && p.y < threshold);
        compactInPlace(this.#enemies,      e => e.active && e.y < threshold);
        compactInPlace(this.#collectibles, c => c.active && c.y < threshold);
        compactInPlace(this.#powerUps,     p => p.active && p.y < threshold);
    }

    // ── Drawing ───────────────────────────────────────────────────

    drawAll(ctx, cameraY) {
        this.#drawList(ctx, cameraY, this.#platforms);
        this.#drawList(ctx, cameraY, this.#collectibles);
        this.#drawList(ctx, cameraY, this.#powerUps);
        this.#drawList(ctx, cameraY, this.#enemies);
    }

    #drawList(ctx, cameraY, list) {
        for (const entity of list) {
            if (entity.isVisible(cameraY, DESIGN_HEIGHT)) {
                entity.draw(ctx, cameraY);
            }
        }
    }

    // ── Lifecycle ─────────────────────────────────────────────────

    clear() {
        this.#platforms.length    = 0;
        this.#enemies.length      = 0;
        this.#collectibles.length = 0;
        this.#powerUps.length     = 0;
    }
}
