import { SymbolRegistry } from './symbols/SymbolRegistry.js';

/**
 * Stateless symbol drawer. Composes a backdrop (panel + glow + sheen) with a
 * procedural glyph delegated to a SymbolRegistry entry. No fallback path:
 * unknown symbol ids fail fast inside the registry.
 */
export class SymbolRenderer {
    constructor(dataRegistry) {
        this.data = dataRegistry;
        this.glyphs = new SymbolRegistry();
    }

    /**
     * Draw a symbol filling the box (x,y,w,h). `t` (seconds) drives the idle
     * pulse for special symbols; `scale` shrinks the whole composition.
     */
    draw(ctx, symbolId, x, y, w, h, opts = {}) {
        const { t = 0, scale = 1 } = opts;
        const sym = this.data.getSymbol(symbolId);
        ctx.save();
        const cx = x + w / 2;
        const cy = y + h / 2;
        const sw = w * scale;
        const sh = h * scale;
        const sx = cx - sw / 2;
        const sy = cy - sh / 2;
        this._drawBackdrop(ctx, sx, sy, sw, sh, sym, t);
        const glyph = this.glyphs.get(symbolId);
        const innerSize = Math.min(sw, sh) * 0.78;
        glyph.draw(ctx, cx, cy, innerSize, sym);
        ctx.restore();
    }

    _drawBackdrop(ctx, x, y, w, h, sym, t) {
        const r = Math.min(w, h) * 0.16;
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, this._lighten(sym.color, 0.18));
        grad.addColorStop(1, this._darken(sym.color, 0.55));
        ctx.fillStyle = grad;
        this._roundRect(ctx, x, y, w, h, r);
        ctx.fill();
        // Glossy top sheen
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        this._roundRect(ctx, x + 3, y + 3, w - 6, h * 0.42, r * 0.85);
        ctx.fill();
        // Idle pulse outline for special symbols
        const isSpecial = sym.isWild || sym.isScatter || sym.isBonusTrigger || sym.isCash;
        const pulse = isSpecial ? (0.6 + Math.sin(t * 4) * 0.4) : 1;
        ctx.lineWidth = isSpecial ? 3 : 1.5;
        ctx.strokeStyle = sym.accent;
        ctx.shadowBlur = (isSpecial ? 24 : 10) * pulse;
        ctx.shadowColor = sym.color;
        this._roundRect(ctx, x, y, w, h, r);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    _lighten(hex, amt) {
        const { r, g, b } = this._parseHex(hex);
   
        //use Math.trunc instead of '|0' 
        return `rgb(${Math.min(255, Math.trunc(r + 255 * amt))},${Math.min(255, Math.trunc(g + 255 * amt))},${Math.min(255, Math.trunc(b + 255 * amt))})`;
    }
    _darken(hex, amt) {
        const { r, g, b } = this._parseHex(hex);
        return `rgb(${Math.max(0, Math.trunc(r - 255 * amt))},${Math.max(0, Math.trunc(g - 255 * amt))},${Math.max(0, Math.trunc(b - 255 * amt))})`;
    }
    _parseHex(hex) {
        const h = hex.replace('#', '');
        const n =Number.parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
}
