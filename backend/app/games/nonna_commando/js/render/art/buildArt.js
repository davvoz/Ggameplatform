import { bakeBosses } from './BossArt.js';
import { bakeFx } from './FxArt.js';
import { bakeNonna } from './NonnaArt.js';
import { bakeObjects } from './ObjectArt.js';
import { bakeSoldiers } from './SoldierArt.js';

/** Paint every sprite of the game into the bank. Called once at load. */
export function buildArt(bank) {
    bakeNonna(bank);
    bakeSoldiers(bank);
    bakeObjects(bank);
    bakeBosses(bank);
    bakeFx(bank);
}
