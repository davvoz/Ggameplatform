import { GameConfig } from '../config/GameConfig.js';

const C = GameConfig.COLOR;

/**
 * Draws the felt table using a TableLayout's cells.
 * Adds hot/cold tinting overlays per heatmap data.
 */
export class TableRenderer {
    constructor(layout) {
        this._layout = layout;
    }

    draw(ctx, ctxRun) {
        const cells = this._layout.getCells();
        const hot  = ctxRun?.heatmap.getHotNumbers()  ?? [];
        const cold = ctxRun?.heatmap.getColdNumbers() ?? [];
        const hotSet  = new Set(hot);
        const coldSet = new Set(cold);

        // Felt backdrop (rounded).
        const cellBounds = this._bounds();
        ctx.fillStyle = C.FELT;
        this._roundRect(ctx, cellBounds.x - 4, cellBounds.y - 4, cellBounds.w + 8, cellBounds.h + 8, 10);
        ctx.fill();

        for (const cell of cells) {
            this._drawCell(ctx, cell, hotSet, coldSet);
        }
    }

    _drawCell(ctx, cell, hotSet, coldSet) {
        ctx.fillStyle = cell.color;
        ctx.fillRect(cell.x + 1, cell.y + 1, cell.w - 2, cell.h - 2);

        // Hot/cold overlay tint for numbered cells.
        if (cell.numberValue !== undefined) {
            if (hotSet.has(cell.numberValue)) {
                ctx.fillStyle = 'rgba(255,106,44,0.32)';
                ctx.fillRect(cell.x + 1, cell.y + 1, cell.w - 2, cell.h - 2);
            } else if (coldSet.has(cell.numberValue)) {
                ctx.fillStyle = 'rgba(74,184,255,0.28)';
                ctx.fillRect(cell.x + 1, cell.y + 1, cell.w - 2, cell.h - 2);
            }
        }

        // Border
        ctx.strokeStyle = C.FELT_LINE;
        ctx.lineWidth = 1;
        ctx.strokeRect(cell.x + 0.5, cell.y + 0.5, cell.w - 1, cell.h - 1);

        // Label
        ctx.fillStyle = C.IVORY;
        const condA = cell.label.length > 3 ? 10 : 12;
        const fontSize = cell.isSpecial ? 9 : condA;
        ctx.font = `bold ${fontSize}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cell.label, cell.x + cell.w / 2, cell.y + cell.h / 2);
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

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y,     x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x,     y + h, r);
        ctx.arcTo(x,     y + h, x,     y,     r);
        ctx.arcTo(x,     y,     x + w, y,     r);
        ctx.closePath();
    }
}
