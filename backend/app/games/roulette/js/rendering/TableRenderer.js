import { GameConfig } from '../config/GameConfig.js';
import { UIPainter } from '../ui/UIPainter.js';

const C = GameConfig.COLOR;

/**
 * Draws the felt table using a TableLayout's cells.
 * Adds hot/cold tinting overlays per heatmap data.
 *
 * Presentation upgrades (hit-boxes & bet logic untouched):
 *  - Pre-rendered felt backdrop with woven texture, vignette and gold trim.
 *  - Gradient cell fills with rounded inner faces and embossed labels.
 *  - Optional view-state: hover cell, active bet cells, winning number pulse.
 */
export class TableRenderer {
    constructor(layout) {
        this._layout = layout;
        this._feltCache = null;
    }

    /**
     * @param {object} [view] presentation-only state:
     *   { hoverCellId, activeTypeIds:Set, activeNumbers:Set, winNumber }
     */
    draw(ctx, ctxRun, view = {}) {
        const hot  = ctxRun?.heatmap.getHotNumbers()  ?? [];
        const cold = ctxRun?.heatmap.getColdNumbers() ?? [];
        const hotSet  = new Set(hot);
        const coldSet = new Set(cold);

        if (!this._feltCache) this._feltCache = this._buildFelt();
        const b = this._bounds();
        ctx.drawImage(this._feltCache, b.x - 12, b.y - 12);

        for (const cell of this._layout.getCells()) {
            this._drawCell(ctx, cell, hotSet, coldSet, view);
        }
    }

    _drawCell(ctx, cell, hotSet, coldSet, view) {
        const isHover  = view.hoverCellId === cell.id;
        const isActive = Boolean(
            view.activeTypeIds?.has(cell.typeId) &&
            (cell.numberValue === undefined || view.activeNumbers?.has(cell.numberValue))
        );
        const isWin = cell.numberValue !== undefined && cell.numberValue === view.winNumber;

        // Face with vertical depth gradient.
        const grad = ctx.createLinearGradient(0, cell.y, 0, cell.y + cell.h);
        grad.addColorStop(0, this._shade(cell.color, 0.1));
        grad.addColorStop(1, this._shade(cell.color, -0.18));
        ctx.fillStyle = grad;
        UIPainter.roundRect(ctx, cell.x + 1, cell.y + 1, cell.w - 2, cell.h - 2, 3);
        ctx.fill();

        // Hot/cold overlay tint for numbered cells.
        if (cell.numberValue !== undefined) {
            if (hotSet.has(cell.numberValue)) {
                ctx.fillStyle = 'rgba(255,106,44,0.32)';
                UIPainter.roundRect(ctx, cell.x + 1, cell.y + 1, cell.w - 2, cell.h - 2, 3);
                ctx.fill();
            } else if (coldSet.has(cell.numberValue)) {
                ctx.fillStyle = 'rgba(74,184,255,0.28)';
                UIPainter.roundRect(ctx, cell.x + 1, cell.y + 1, cell.w - 2, cell.h - 2, 3);
                ctx.fill();
            }
        }

        // Hover sheen.
        if (isHover) {
            ctx.fillStyle = 'rgba(255,255,255,0.14)';
            UIPainter.roundRect(ctx, cell.x + 1, cell.y + 1, cell.w - 2, cell.h - 2, 3);
            ctx.fill();
        }

        // Border: gold for active/hover/win, felt line otherwise.
        ctx.save();
        if (isWin) {
            const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 160);
            ctx.shadowColor = C.WIN_GLOW;
            ctx.shadowBlur = 8 + 8 * pulse;
            ctx.strokeStyle = C.GOLD_PALE;
            ctx.lineWidth = 2;
        } else if (isActive) {
            ctx.strokeStyle = C.GOLD_BRIGHT;
            ctx.lineWidth = 1.5;
        } else if (isHover) {
            ctx.strokeStyle = C.GOLD;
            ctx.lineWidth = 1.2;
        } else {
            ctx.strokeStyle = C.FELT_LINE;
            ctx.lineWidth = 1;
        }
        UIPainter.roundRect(ctx, cell.x + 0.5, cell.y + 0.5, cell.w - 1, cell.h - 1, 3);
        ctx.stroke();
        ctx.restore();

        // Label with soft emboss.
        const condA = cell.label.length > 3 ? 10 : 12;
        const fontSize = cell.isSpecial ? 9 : condA;
        ctx.font = `bold ${fontSize}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillText(cell.label, cell.x + cell.w / 2, cell.y + cell.h / 2 + 1);
        ctx.fillStyle = isWin ? C.GOLD_PALE : C.IVORY;
        ctx.fillText(cell.label, cell.x + cell.w / 2, cell.y + cell.h / 2);
    }

    _buildFelt() {
        const b = this._bounds();
        const w = b.w + 24;
        const h = b.h + 24;
        const off = document.createElement('canvas');
        off.width = w; off.height = h;
        const c = off.getContext('2d');
        // Outer drop shadow plate.
        c.fillStyle = 'rgba(0,0,0,0.4)';
        this._roundRectOn(c, 2, 5, w - 4, h - 4, 14);
        c.fill();
        // Felt body with center light.
        const grad = c.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.max(w, h) * 0.7);
        grad.addColorStop(0, C.FELT_GLOW);
        grad.addColorStop(0.55, C.FELT);
        grad.addColorStop(1, C.FELT_DARK);
        c.fillStyle = grad;
        this._roundRectOn(c, 0, 0, w, h, 14);
        c.fill();
        // Woven texture: sparse noise dots.
        c.save();
        c.clip();
        c.globalAlpha = 0.05;
        for (let i = 0; i < 900; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            c.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
            c.fillRect(x, y, 1, 1);
        }
        c.restore();
        // Gold trim.
        c.strokeStyle = 'rgba(212,160,23,0.55)';
        c.lineWidth = 1.5;
        this._roundRectOn(c, 2, 2, w - 4, h - 4, 12);
        c.stroke();
        c.strokeStyle = 'rgba(240,192,64,0.25)';
        c.lineWidth = 0.8;
        this._roundRectOn(c, 5, 5, w - 10, h - 10, 10);
        c.stroke();
        return off;
    }

    _bounds() {
        const cells = this._layout.getCells();
        let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
        for (const c of cells) {
            xMin = Math.min(xMin, c.x); yMin = Math.min(yMin, c.y);
            xMax = Math.max(xMax, c.x + c.w); yMax = Math.max(yMax, c.y + c.h);
        }
        return { x: xMin, y: yMin, w: xMax - xMin, h: yMax - yMin };
    }

    _roundRectOn(c, x, y, w, h, r) {
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + w, y,     x + w, y + h, r);
        c.arcTo(x + w, y + h, x,     y + h, r);
        c.arcTo(x,     y + h, x,     y,     r);
        c.arcTo(x,     y,     x + w, y,     r);
        c.closePath();
    }

    /** Lighten (amt>0) or darken (amt<0) a #rrggbb color. */
    _shade(hex, amt) {
        const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
        if (!m) return hex;
        const ch = (s) => {
            const v = Number.parseInt(s, 16);
            const out = amt >= 0 ? v + (255 - v) * amt : v * (1 + amt);
            return Math.round(Math.min(255, Math.max(0, out))).toString(16).padStart(2, '0');
        };
        return `#${ch(m[1])}${ch(m[2])}${ch(m[3])}`;
    }
}
