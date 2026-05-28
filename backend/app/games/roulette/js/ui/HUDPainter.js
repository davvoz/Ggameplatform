import { GameConfig, RED_NUMBERS } from '../config/GameConfig.js';
import { UIPainter } from './UIPainter.js';

const C = GameConfig.COLOR;

/**
 * Top HUD: balance, current wager, last-N strip.
 */
export class HUDPainter {
    _maxStrip = 12;

    draw(ctx, run) {
        const W = GameConfig.VIEW_WIDTH;
        const H = GameConfig.LAYOUT.HUD_HEIGHT;
        UIPainter.panel(ctx, 0, 0, W, H, { fill: 'rgba(8,8,14,0.92)', border: C.GOLD, radius: 0 });

        // Balance pane (left)
        UIPainter.text(ctx, 'BALANCE', 14, 10, { size: 10, color: C.TEXT_DIM, weight: 'bold' });
        UIPainter.text(ctx, `${this._fmt(run.balance)}`, 14, 24, {
            size: 24, color: C.GOLD_BRIGHT, weight: 'bold', shadow: true
        });

        // Wager pane (right)
        const wager = run.chips.totalWagered();
        UIPainter.text(ctx, 'WAGER', W - 14, 10, { size: 10, color: C.TEXT_DIM, weight: 'bold', align: 'right' });
        UIPainter.text(ctx, this._fmt(wager), W - 14, 24, {
            size: 22, color: wager > 0 ? C.IVORY : C.TEXT_DIM, weight: 'bold', align: 'right', shadow: true
        });

        // Last-N strip
        const history = run.heatmap.getHistory().slice(0, this._maxStrip);
        const stripY = 56;
        const cellW = 18;
        const startX = (W - cellW * this._maxStrip) / 2;
        UIPainter.text(ctx, 'RECENT', W / 2, 52, { size: 8, color: C.TEXT_DIM, weight: 'bold', align: 'center' });
        for (let i = 0; i < this._maxStrip; i++) {
            const n = history[i];
            const x = startX + i * cellW;
            const fill = n === undefined ? '#1a1a22' : this._numberColor(n);
            ctx.fillStyle = fill;
            ctx.fillRect(x + 1, stripY, cellW - 2, 18);
            ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            ctx.strokeRect(x + 0.5, stripY - 0.5, cellW - 1, 19);
            if (n !== undefined) {
                ctx.fillStyle = C.IVORY;
                ctx.font = 'bold 10px system-ui';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(n), x + cellW / 2, stripY + 9);
            }
        }
    }

    _numberColor(n) {
        if (n === 0) return C.GREEN;
        return RED_NUMBERS.has(n) ? C.RED : C.BLACK;
    }

    _fmt(n) {
        return n.toLocaleString('en-US');
    }
}
