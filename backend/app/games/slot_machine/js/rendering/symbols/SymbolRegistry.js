import { SevenLuckySymbol } from './SevenLuckySymbol.js';
import { DiamondSymbol } from './DiamondSymbol.js';
import { CrownSymbol } from './CrownSymbol.js';
import { StarWildSymbol } from './StarWildSymbol.js';
import { RainbowSymbol } from './RainbowSymbol.js';
import { BarGoldSymbol } from './BarGoldSymbol.js';
import { BarSilverSymbol } from './BarSilverSymbol.js';
import { CherryBombSymbol } from './CherryBombSymbol.js';
import { BellNeonSymbol } from './BellNeonSymbol.js';
import { WatermelonSymbol } from './WatermelonSymbol.js';
import { GrapesSymbol } from './GrapesSymbol.js';
import { LemonSymbol } from './LemonSymbol.js';
import { OrangeSymbol } from './OrangeSymbol.js';
import { ScatterStarSymbol } from './ScatterStarSymbol.js';
import { BonusChestSymbol } from './BonusChestSymbol.js';
import { CoinCashSymbol } from './CoinCashSymbol.js';

/**
 * Registry of procedural glyph drawers.
 * Strict: throws if an unknown id is requested. No fallback.
 */
export class SymbolRegistry {
    constructor() {
        this._glyphs = new Map([
            ['seven_lucky',  new SevenLuckySymbol()],
            ['diamond',      new DiamondSymbol()],
            ['crown',        new CrownSymbol()],
            ['star_wild',    new StarWildSymbol()],
            ['rainbow',      new RainbowSymbol()],
            ['bar_gold',     new BarGoldSymbol()],
            ['bar_silver',   new BarSilverSymbol()],
            ['cherry_bomb',  new CherryBombSymbol()],
            ['bell_neon',    new BellNeonSymbol()],
            ['watermelon',   new WatermelonSymbol()],
            ['grapes',       new GrapesSymbol()],
            ['lemon',        new LemonSymbol()],
            ['orange',       new OrangeSymbol()],
            ['scatter_star', new ScatterStarSymbol()],
            ['bonus_chest',  new BonusChestSymbol()],
            ['coin_cash',    new CoinCashSymbol()],
            // Back-compat alias: stale caches may still hold the old id.
            ['mystery_box',  new CoinCashSymbol()],
        ]);
    }

    get(id) {
        const glyph = this._glyphs.get(id);
        if (!glyph) {
            throw new Error(`SymbolRegistry: no glyph registered for "${id}"`);
        }
        return glyph;
    }

    has(id) {
        return this._glyphs.has(id);
    }
}
