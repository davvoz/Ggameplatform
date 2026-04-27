import { GameConfig as C }  from '../config/GameConfig.js';
import { LevelConfigStore }  from './LevelConfigStore.js';
import { Section }           from '../sections/Section.js';

/**
 * Instantiates all sections from the level configs loaded by LevelConfigStore.
 *
 * Open/Closed: to add a new floor, add its key to board.json `sections` array
 * and supply the corresponding JSON file in data/levels/. Zero JS files change.
 */
export class SectionRegistry {
    /**
     * Instantiate all sections in world order.
     * Position in board.json `sections` array determines world-Y:
     * index 0 = Y=0 (topmost), index N-1 = Y max (bottommost).
     * @returns {Section[]}
     */
    static createAll() {
        return LevelConfigStore.sectionKeys
            .map((key, i) => new Section(i * C.SECTION_HEIGHT, LevelConfigStore.get(key)));
    }

    /** Number of sections declared in board.json. */
    static get count() {
        return LevelConfigStore.sectionKeys.length;
    }
}

