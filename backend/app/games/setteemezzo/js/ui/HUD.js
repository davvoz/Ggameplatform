/**
 * Heads-Up Display — pixel manga style overlays on canvas.
 * Uses "Press Start 2P" Google Font.
 * Draws: top chip bar, player/dealer score badges, bet chip.
 */

const FONT = '"Press Start 2P", monospace';

export class HUD {
    #width;
    #height;
    #time = 0;

    constructor(width, height) {
        this.#width = width;
        this.#height = height;
    }

    /** @param {CanvasRenderingContext2D} ctx */
    draw(ctx, state) {
        this.#drawTopBar(ctx, state);
        this.#drawPlayerScore(ctx, state);
        this.#drawDealerScore(ctx, state);
        this.#drawBetChip(ctx, state);
    }

    update(dt) {
        this.#time = performance.now();
    }

    // ── Top bar ──
    #drawTopBar(ctx, { chips }) {
        const w = this.#width;

        // Dark bar
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, w, 28);

        // Bottom pixel line — rainbow shimmer
        const hue = (this.#time / 20) % 360;
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.4)`;
        ctx.fillRect(0, 27, w, 2);

        // Coin icon
        const pulse = 1 + Math.sin(this.#time / 600) * 0.1;
        ctx.save();
        ctx.translate(14, 14);
        ctx.scale(pulse, pulse);

        // Coin
        ctx.fillStyle = '#f0d050';
        ctx.fillRect(-6, -6, 12, 12);
        ctx.fillStyle = '#8a6508';
        ctx.fillRect(-4, -4, 8, 8);
        ctx.fillStyle = '#f0d050';
        ctx.font = `6px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 1);
        ctx.restore();

        // Chips amount — colored
        ctx.save();
        ctx.shadowColor = '#f0d050';
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#f0d050';
        ctx.font = `10px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(chips), 26, 14);
        ctx.restore();

        // Title — rainbow pixel
        const title = '7 N HALF';
        ctx.font = `7px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < title.length; i++) {
            const ch = title[i];
            const charHue = (hue + i * 35) % 360;
            ctx.fillStyle = `hsla(${charHue}, 90%, 65%, 0.6)`;
            const charX = w / 2 - (title.length * 4) / 2 + i * 4 + 2;
            ctx.fillText(ch, charX, 14);
        }
    }

    // ── Player score badge ──
    #drawPlayerScore(ctx, { playerScore }) {
        if (playerScore <= 0) return;
        const w = this.#width;
        const h = this.#height;

        const bx = w - 22;
        const by = h * 0.56;

        const greenJellow = playerScore === 7.5 ? '#f0d050' : '#39ff14';
        const color = playerScore > 7.5 ? '#ff3b30' : greenJellow;

        ctx.save();

        // Glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;

        // Pixel box bg
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(bx - 16, by - 12, 32, 24);

        // Color border (pixel style — 1px lines)
        ctx.fillStyle = color;
        ctx.fillRect(bx - 16, by - 12, 32, 2);
        ctx.fillRect(bx - 16, by + 10, 32, 2);
        ctx.fillRect(bx - 16, by - 12, 2, 24);
        ctx.fillRect(bx + 14, by - 12, 2, 24);

        ctx.restore();

        // Score text
        ctx.fillStyle = color;
        ctx.font = `9px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(playerScore), bx, by + 1);
    }

    // ── Dealer score badge ──
    #drawDealerScore(ctx, { dealerScore, dealerRevealed }) {
        if (dealerScore <= 0) return;
        const w = this.#width;

        const bx = w - 22;
        const by = 50;

        const label = dealerRevealed ? String(dealerScore) : '?';
        const redGray = (dealerScore > 7.5 ? '#ff3b30' : '#c0c0c0')
        const color = dealerRevealed ? redGray : '#666';

        // Pixel box
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(bx - 14, by - 10, 28, 20);

        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(bx - 14, by - 10, 28, 1);
        ctx.fillRect(bx - 14, by + 9, 28, 1);
        ctx.fillRect(bx - 14, by - 10, 1, 20);
        ctx.fillRect(bx + 13, by - 10, 1, 20);

        ctx.fillStyle = color;
        ctx.font = `8px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, bx, by + 1);
    }

    // ── Bet chip ──
    #drawBetChip(ctx, { bet }) {
        if (bet <= 0) return;
        const h = this.#height;

        const cx = 32;
        const cy = h - 60;

        // Pixel shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(cx - 14, cy + 14, 28, 6);

        // Outer chip (red pixel square)
        ctx.fillStyle = '#8B0000';
        ctx.fillRect(cx - 16, cy - 16, 32, 32);

        // Gold edge notches (pixel)
        ctx.fillStyle = '#f0d050';
        const notches = [
            [-16, -4, 3, 8], [13, -4, 3, 8],   // left/right
            [-4, -16, 8, 3], [-4, 13, 8, 3],    // top/bottom
        ];
        for (const [dx, dy, nw, nh] of notches) {
            ctx.fillRect(cx + dx, cy + dy, nw, nh);
        }

        // Inner circle area
        ctx.fillStyle = '#a01010';
        ctx.fillRect(cx - 11, cy - 11, 22, 22);

        // Gold inner border
        ctx.fillStyle = '#f0d050';
        ctx.fillRect(cx - 11, cy - 11, 22, 1);
        ctx.fillRect(cx - 11, cy + 10, 22, 1);
        ctx.fillRect(cx - 11, cy - 11, 1, 22);
        ctx.fillRect(cx + 10, cy - 11, 1, 22);

        // Bet amount
        ctx.fillStyle = '#fff';
        ctx.font = `7px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(bet), cx, cy + 1);

        // Label
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = `5px ${FONT}`;
        ctx.fillText('BET', cx, cy + 26);
    }
}
