/**
 * EnergyManager — SRP: wall energy consumption and regeneration logic.
 */
import { CONFIG } from '../config.js';

export class EnergyManager {
    constructor(game) {
        this.game = game;
    }

    get state()     { return this.game.state; }
    get entities()  { return this.game.entities; }
    get particles() { return this.game.particles; }
    get audio()     { return this.game.audio; }

    update(dt) {
        const { state, entities } = this;
        const zombiesAtWall       = entities.zombies.filter(z => z.atWall);
        const regulars            = zombiesAtWall.filter(z => !z.isHealer);
        const healers             = zombiesAtWall.filter(z =>  z.isHealer);

        if (!state._wallEnergyTimer)  state._wallEnergyTimer  = 0;
        if (!state._healerWallTimer)  state._healerWallTimer  = 0;
        state._wallEnergyTimer += dt;
        state._healerWallTimer += dt;

        let bricksToRemove   = 0;
        let zombiesToAnimate = [];

        if (state._wallEnergyTimer >= 0.5 && regulars.length > 0) {
            const n = Math.min(regulars.length, state.energy);
            bricksToRemove   += n;
            zombiesToAnimate  = zombiesToAnimate.concat(regulars.slice(0, n));
            state._wallEnergyTimer = 0;
        }

        if (state._healerWallTimer >= 5 && healers.length > 0) {
            const n = Math.min(healers.length, state.energy - bricksToRemove);
            if (n > 0) {
                bricksToRemove   += n;
                zombiesToAnimate  = zombiesToAnimate.concat(healers.slice(0, n));
            }
            state._healerWallTimer = 0;
        }

        if (bricksToRemove > 0) {
            state.energy -= bricksToRemove;
            this.audio.enemyDamageWall();
            this._animateAttackers(zombiesToAnimate);
            state.killsWithoutLeak = 0;
            if (state.energy <= 0) {
                state.energy = 0;
                this.game.gameOver();
            }
        }

        if (zombiesAtWall.length === 0) {
            state.energy = Math.min(
                CONFIG.INITIAL_ENERGY,
                state.energy + CONFIG.ENERGY_REGEN_RATE * dt
            );
        }
    }

    _animateAttackers(zombies) {
        for (const zombie of zombies) {
            this.particles.emit(zombie.col, zombie.row + 0.5, {
                text: '💥', color: '#ff5555', vy: 0.3, life: 0.5, scale: 1.2, glow: true,
            });
            if (!zombie._attackAnim) zombie._attackAnim = 0;
            zombie._attackAnim = 0.3;
        }
    }
}
