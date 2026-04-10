/**
 * PlayerOverlayManager.js
 *
 * Owns one overlay instance per perk.
 * drawBehind() is called BEFORE the sprite (wings, armour, rocket pods).
 * draw()       is called AFTER  the sprite (shields, auras, chevrons, flames).
 *
 * Adding a new perk overlay:
 *   1. Create a new file in this folder, subclass PlayerOverlay.
 *   2. Override drawBehind() and/or draw().
 *   3. Register the instance in #overlays below.
 *   4. Include the perk key in Player.#buildActivePerks().
 */

import { QUALITY } from '../../config/Constants.js';

import { RocketPodsOverlay }   from './RocketPodsOverlay.js';
import { GlideWingsOverlay }   from './GlideWingsOverlay.js';
import { ArmorPlatingOverlay } from './ArmorPlatingOverlay.js';
import { DoubleCoinsOverlay }  from './DoubleCoinsOverlay.js';
import { SlowTimeOverlay }     from './SlowTimeOverlay.js';
import { ShieldOverlay }       from './ShieldOverlay.js';
import { MagnetOverlay }       from './MagnetOverlay.js';
import { SpringBootsOverlay }  from './SpringBootsOverlay.js';
import { StompBootsOverlay }   from './StompBootsOverlay.js';
import { ShockwaveOverlay }    from './ShockwaveOverlay.js';
import { DashChevronOverlay }  from './DashChevronOverlay.js';
import { JetpackOverlay }      from './JetpackOverlay.js';
import { SpikeHeadOverlay }    from './SpikeHeadOverlay.js';
import { GhostRepelOverlay }   from './GhostRepelOverlay.js';

export class PlayerOverlayManager {
    /** @type {Map<string, PlayerOverlay>} */
    #overlays = new Map([
        // ── Permanent perks (behind-sprite) ───────────────────────────────
        ['double_jump',  new RocketPodsOverlay()],
        ['glide',        new GlideWingsOverlay()],
        ['armor',        new ArmorPlatingOverlay()],
        // ── Front overlays (after-sprite) ─────────────────────────────────
        ['double_coins', new DoubleCoinsOverlay()],
        ['slow_time',    new SlowTimeOverlay()],
        ['shield',       new ShieldOverlay()],
        ['magnet',       new MagnetOverlay()],
        ['spring_boots', new SpringBootsOverlay()],
        ['stomp',        new StompBootsOverlay()],
        ['shockwave',    new ShockwaveOverlay()],
        ['dash',         new DashChevronOverlay()],
        ['jetpack',      new JetpackOverlay()],
        ['spike_head',   new SpikeHeadOverlay()],
        ['ghost_repel',  new GhostRepelOverlay()],
    ]);

    /** Overlays to always draw even when FANCY_OVERLAYS is off (gameplay-critical) */
    static #ESSENTIAL = new Set(['shield', 'jetpack', 'spike_head']);

    update(dt) {
        for (const ov of this.#overlays.values()) ov.update(dt);
    }

    /** Drawn BEFORE the sprite — receives full perks context object. */
    drawBehind(ctx, x, y, h, activePerks) {
        for (const [key, ov] of this.#overlays) {
            if (activePerks[key]) {
                if (!QUALITY.FANCY_OVERLAYS && !PlayerOverlayManager.#ESSENTIAL.has(key)) continue;
                ov.drawBehind(ctx, x, y, h, activePerks);
            }
        }
    }

    /** Drawn AFTER the sprite — receives full perks context object. */
    draw(ctx, x, y, h, activePerks) {
        for (const [key, ov] of this.#overlays) {
            if (activePerks[key]) {
                if (!QUALITY.FANCY_OVERLAYS && !PlayerOverlayManager.#ESSENTIAL.has(key)) continue;
                ov.draw(ctx, x, y, h, activePerks);
            }
        }
    }
}
