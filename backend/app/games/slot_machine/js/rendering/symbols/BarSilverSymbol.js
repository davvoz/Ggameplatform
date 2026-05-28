import { BaseSymbol } from './BaseSymbol.js';

/** Classic silver BAR — three stacked metallic bars. */
export class BarSilverSymbol extends BaseSymbol {
    draw(ctx, cx, cy, size, sym) {
        this._drawBars(ctx, cx, cy, size, sym, { top: '#f4f4fa', bottom: '#6a6a82' });
    }
}
