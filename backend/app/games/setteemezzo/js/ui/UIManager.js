/**
 * Canvas-based UI — draws all buttons/overlays on the game canvas,
 * handles click/touch hit-testing in logical (design) coordinates.
 *
 * Font: "Press Start 2P" from Google Fonts — pixel manga style.
 */

const FONT = '"Press Start 2P", monospace';
const t = performance.now.bind(performance);

// ── Button descriptor ──
class Btn {
    constructor(x, y, w, h, label, style = 'accent') {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.label = label;
        this.style = style;  // 'accent' | 'normal' | 'small'
        this.pressed = 0;    // animation timer
    }

    contains(px, py) {
        return px >= this.x && px <= this.x + this.w &&
               py >= this.y && py <= this.y + this.h;
    }
}

export class UIManager {
    #callbacks = {};
    #buttons = [];       // active buttons for current state
    #mode = 'none';      // 'betting' | 'playing' | 'result' | 'none'
    #betAmount = 10;
    #resultText = '';
    #resultColor = '#fff';
    #resultAlpha = 0;
    #width;
    #height;
    #time = 0;

    constructor(canvas, renderer) {
        this.#width = renderer.width;
        this.#height = renderer.height;

        const toLogical = (clientX, clientY) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = renderer.width / rect.width;
            const scaleY = renderer.height / rect.height;
            return [
                (clientX - rect.left) * scaleX,
                (clientY - rect.top) * scaleY,
            ];
        };

        canvas.addEventListener('pointerdown', (e) => {
            const [lx, ly] = toLogical(e.clientX, e.clientY);
            this.#handlePress(lx, ly);
        });
    }

    // ── Callbacks ──

    on(event, cb) { this.#callbacks[event] = cb; }

    // ── Mode switches (called by states) ──

    showBetControls() {
        this.#mode = 'betting';
        this.#rebuildButtons();
    }

    showPlayControls() {
        this.#mode = 'playing';
        this.#rebuildButtons();
    }

    showResult(text, color) {
        this.#mode = 'result';
        this.#resultText = text;
        this.#resultColor = color;
        this.#resultAlpha = 0;
        this.#rebuildButtons();
    }

    hideAll() {
        this.#mode = 'none';
        this.#buttons = [];
    }

    // kept for compatibility
    hideBetControls() {
        //keep empty, since we now rebuild buttons on mode switch
    }
    hidePlayControls() {
        //keep empty, since we now rebuild buttons on mode switch
    }
    hideResult() {
        //keep empty, since we now rebuild buttons on mode switch
    }

    updateBetDisplay(amount) { this.#betAmount = amount; }

    // ── Update / Draw ──

    update(dt) {
        this.#time = t();
        if (this.#mode === 'result' && this.#resultAlpha < 1) {
            this.#resultAlpha = Math.min(1, this.#resultAlpha + dt / 350);
        }
        for (const b of this.#buttons) {
            if (b.pressed > 0) b.pressed = Math.max(0, b.pressed - dt / 150);
        }
    }

    draw(ctx) {
        if (this.#mode === 'none') return;

        if (this.#mode === 'result') {
            this.#drawResultOverlay(ctx);
        }
        if (this.#mode === 'betting') {
            this.#drawBetPanel(ctx);
        }

        for (const b of this.#buttons) {
            this.#drawButton(ctx, b);
        }
    }

    // ── Private: build buttons depending on mode ──

    #rebuildButtons() {
        const w = this.#width;
        const h = this.#height;
        this.#buttons = [];

        switch (this.#mode) {
            case 'betting': {
                const bw = 120, bh = 34;
                const cy = h - 108;
                // −  [ amount ]  +
                this.#buttons.push(
                    new Btn(w / 2 - 90, cy, 36, 36, '−', 'small'),
                    new Btn(w / 2 + 54, cy, 36, 36, '+', 'small'),
                    // DEAL below
                    new Btn(w / 2 - bw / 2, cy + 48, bw, bh, 'DEAL', 'accent')
                );
                break;
            }
            case 'playing': {
                const bw = 110, bh = 38;
                const cy = h - 80;
                this.#buttons.push(
                    new Btn(w / 2 - bw - 8, cy, bw, bh, 'HIT', 'accent'),
                    new Btn(w / 2 + 8, cy, bw, bh, 'STAND', 'normal')
                );
                break;
            }
            case 'result': {
                const bw = 160, bh = 36;
                this.#buttons.push(new Btn(w / 2 - bw / 2, h * 0.72, bw, bh, 'NEW HAND', 'accent'));
                break;
            }
        }
    }

    // ── Private: input ──

    #handlePress(lx, ly) {
        for (const b of this.#buttons) {
            if (b.contains(lx, ly)) {
                b.pressed = 1;
                this.#fireButton(b.label);
                return;
            }
        }
    }

    #fireButton(label) {
        switch (label) {
            case '−': this.#callbacks.betMinus?.(); break;
            case '+': this.#callbacks.betPlus?.(); break;
            case 'DEAL': this.#callbacks.deal?.(); break;
            case 'HIT': this.#callbacks.hit?.(); break;
            case 'STAND': this.#callbacks.stand?.(); break;
            case 'NEW HAND': this.#callbacks.newRound?.(); break;
        }
    }

    // ── Private: draw helpers ──

    #drawButton(ctx, btn) {
        const { x, y, w, h, label, style, pressed } = btn;
        const r = style === 'small' ? 8 : 12;
        const shrink = pressed > 0 ? pressed * 2 : 0;

        ctx.save();

        if (shrink > 0) {
            ctx.translate(x + w / 2, y + h / 2);
            ctx.scale(1 - shrink * 0.05, 1 - shrink * 0.05);
            ctx.translate(-(x + w / 2), -(y + h / 2));
        }

        // Shadow
        ctx.shadowColor = style === 'accent' ? 'rgba(232,200,74,0.35)' : 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;

        // Body gradient
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        if (style === 'accent') {
            grad.addColorStop(0, '#f0d050');
            grad.addColorStop(0.5, '#d4af37');
            grad.addColorStop(1, '#8a6508');
        } else {
            grad.addColorStop(0, '#3c3c58');
            grad.addColorStop(1, '#1e1e32');
        }
        ctx.fillStyle = grad;
        this.#roundRect(ctx, x, y, w, h, r);
        ctx.fill();

        // Kill shadow for details
        ctx.shadowColor = 'transparent';

        // Top highlight
        const highlight = ctx.createLinearGradient(x, y, x, y + h * 0.45);
        highlight.addColorStop(0, 'rgba(255,255,255,0.18)');
        highlight.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = highlight;
        this.#roundRect(ctx, x, y, w, h * 0.45, r);
        ctx.fill();

        // Border
        ctx.strokeStyle = style === 'accent' ? 'rgba(255,255,200,0.3)' : 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        this.#roundRect(ctx, x, y, w, h, r);
        ctx.stroke();

        // Label — pixel font with manga-colored drop shadow
        const fontSize = style === 'small' ? 14 : 8;
        ctx.font = `${fontSize}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const tx = x + w / 2;
        const ty = y + h / 2 + 1;

        // Colored shadow (manga style)
        ctx.fillStyle = style === 'accent' ? '#5a3800' : '#000';
        ctx.fillText(label, tx, ty + 2);

        // Main text
        ctx.fillStyle = style === 'accent' ? '#1a0e00' : '#e8e0d0';
        ctx.fillText(label, tx, ty);

        ctx.restore();
    }

    #drawBetPanel(ctx) {
        const w = this.#width;
        const h = this.#height;
        const cy = h - 108;

        // Panel background (subtle)
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        this.#roundRect(ctx, w / 2 - 110, cy - 16, 220, 104, 16);
        ctx.fill();

        // Bet amount — big gold pixel number
        const pulse = 1 + Math.sin(this.#time / 400) * 0.03;
        ctx.save();
        ctx.translate(w / 2, cy + 18);
        ctx.scale(pulse, pulse);

        // Shadow
        ctx.fillStyle = '#8a4400';
        ctx.font = `18px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(this.#betAmount), 1, 2);

        // Main
        ctx.fillStyle = '#f0d050';
        ctx.fillText(String(this.#betAmount), 0, 0);

        ctx.restore();

        // "BET" label above
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = `6px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BET', w / 2, cy + 1);
    }

    #drawResultOverlay(ctx) {
        const w = this.#width;
        const h = this.#height;
        const a = this.#resultAlpha;

        // Dark scrim — only lower half to keep croupier face visible
        const gradScrim = ctx.createLinearGradient(0, h * 0.4, 0, h * 0.6);
        gradScrim.addColorStop(0, `rgba(0,0,0,0)`);
        gradScrim.addColorStop(1, `rgba(0,0,0,${0.7 * a})`);
        ctx.fillStyle = gradScrim;
        ctx.fillRect(0, 0, w, h);

        // Scanline effect (manga/pixel)
        ctx.fillStyle = `rgba(0,0,0,${0.06 * a})`;
        for (let i = 0; i < h; i += 3) {
            ctx.fillRect(0, i, w, 1);
        }

        // Result text — multi-layered manga style
        const fontSize = this.#resultText.length > 15 ? 10 : 14;
        ctx.font = `${fontSize}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const tx = w / 2;
        const ty = h * 0.64;
        const wobble = Math.sin(this.#time / 200) * 1.5;

        ctx.save();
        ctx.globalAlpha = a;

        // Outer glow
        ctx.shadowColor = this.#resultColor;
        ctx.shadowBlur = 20;

        // Dark outline
        ctx.fillStyle = '#000';
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                ctx.fillText(this.#resultText, tx + dx, ty + dy + wobble);
            }
        }

        // Colored shadow
        ctx.shadowBlur = 0;
        ctx.fillStyle = this.#shiftColor(this.#resultColor, -80);
        ctx.fillText(this.#resultText, tx + 2, ty + 3 + wobble);

        // Main text
        ctx.fillStyle = this.#resultColor;
        ctx.fillText(this.#resultText, tx, ty + wobble);

        // White specular highlight
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillText(this.#resultText, tx, ty - 1 + wobble);

        ctx.restore();
    }

    /** Shift a hex color's lightness. */
    #shiftColor(hex, amount) {
        const n = Number.parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, Math.min(255, ((n >> 16) & 0xff) + amount));
        const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amount));
        const b = Math.max(0, Math.min(255, (n & 0xff) + amount));
        return `rgb(${r},${g},${b})`;
    }

    #roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
    }
}
