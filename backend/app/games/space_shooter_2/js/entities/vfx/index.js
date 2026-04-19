import PerkVfx from './PerkVfx.js';
import PowerUpVfx from './PowerUpVfx.js';
import ShieldDomeVfx from './ShieldDomeVfx.js';
import NovaBlastVfx from './NovaBlastVfx.js';
import BulletReflectVfx from './BulletReflectVfx.js';
import TimeWarpVfx from './TimeWarpVfx.js';

/**
 * Ordered list of VFX layers rendered on top of the player ship.
 * Each layer must expose:
 *   static shouldRender(player, perkSystem) → boolean
 *   static render(ctx, { player, cx, cy, perkSystem, assets }) → void
 *
 * To add a new VFX: create a file, import it here, add to the array.
 */
export const VFX_LAYERS = [
    PerkVfx,
    PowerUpVfx,
    ShieldDomeVfx,
    NovaBlastVfx,
    BulletReflectVfx,
    TimeWarpVfx,
];
