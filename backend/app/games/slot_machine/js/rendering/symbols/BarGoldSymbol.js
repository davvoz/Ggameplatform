import { BaseSymbol } from './BaseSymbol.js';

/** Classic gold BAR — three stacked yellow bars. */
export class BarGoldSymbol extends BaseSymbol {
    draw(ctx, cx, cy, size, sym) {
        this._drawBars(ctx, cx, cy, size, sym, { top: '#ffe066', bottom: '#b67900' });
    }
}
