import { ENEMIES } from '../../config/Enemies.js';
import { Archer } from './Archer.js';
import { Bat } from './Bat.js';
import { Brawler } from './Brawler.js';
import { Warrior } from './Warrior.js';

/** Which class plays each monster kind. A new monster: stats, a class, a line here. */
const CLASSES = Object.freeze({ bat: Bat, warrior: Warrior, archer: Archer, brawler: Brawler });

export const ENEMY_KINDS = Object.freeze(Object.keys(CLASSES));

export function createEnemy(kind, spec) {
    const Kind = CLASSES[kind];
    if (!Kind) throw new Error(`Unknown monster: ${kind}`);
    return new Kind({ ...spec, kind, stats: ENEMIES[kind] });
}
