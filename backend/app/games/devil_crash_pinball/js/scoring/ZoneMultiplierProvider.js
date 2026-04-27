import { GameConfig as C } from '../config/GameConfig.js';

/**
 * Maps a ball's world-Y position to a simple integer section multiplier.
 * Section 0 (top = minussa) → highest mult; last section (bottom = main_table) → x1.
 * Each section up adds +1: main_table=x1, upper_table=x2, ... minussa=xN.
 */
export class ZoneMultiplierProvider {
    /**
     * @param {number} worldHeight - total world height in px (SECTION_HEIGHT × sectionCount)
     */
    constructor(worldHeight) {
        this._sectionCount = Math.round(worldHeight / C.SECTION_HEIGHT);
    }

    /**
     * Returns the mult for the given world-Y position.
     * @param {number} worldY
     * @returns {{ mult:number }}
     */
    getTier(worldY) {
        const idx     = Math.floor(Math.max(0, worldY) / C.SECTION_HEIGHT);
        const clamped = Math.max(0, Math.min(this._sectionCount - 1, idx));
        const mult    = this._sectionCount - clamped;
        return { mult };
    }

    /**
     * @param {number} worldY
     * @returns {number}
     */
    getMultiplier(worldY) {
        return this.getTier(worldY).mult;
    }
}
