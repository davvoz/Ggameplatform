import { Suit } from '../model/Card.js';

/**
 * Renders a playing card using the deck.png spritesheet (10 cols × 4 rows).
 * Handles face-up/face-down, flip animation, and slide-in animation.
 */

// Suit → row index in the spritesheet
const SUIT_ROW = Object.freeze({
    [Suit.DENARI]:  0,
    [Suit.COPPE]:   1,
    [Suit.BASTONI]: 2,
    [Suit.SPADE]:   3,
});

// Shared spritesheet — loaded once
let deckImage = null;
let deckLoaded = false;
const deckLoadPromise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { deckImage = img; deckLoaded = true; resolve(); };
    img.onerror = () => resolve(); // graceful fallback
    img.src = 'assets/deck.png';
});

export class CardView {
    // Animation state
    x = 0;
    y = 0;
    targetX = 0;
    targetY = 0;
    scale = 1;
    alpha = 1;
    rotation = 0;
    flipProgress = 1; // 0 = face-down, 1 = face-up

    #card;
    #width;
    #height;

    static WIDTH = 88;
    static HEIGHT = 128;
    static COLS = 10;
    static ROWS = 4;

    /** Wait for the deck spritesheet to be loaded. */
    static ready() { return deckLoadPromise; }

    /**
     * @param {import('../model/Card.js').Card} card
     * @param {number} x - target x
     * @param {number} y - target y
     */
    constructor(card, x, y) {
        this.#card = card;
        this.targetX = x;
        this.targetY = y;
        this.x = x + 200;
        this.y = y - 50;
        this.scale = 0.3;
        this.alpha = 0;
        this.#width = CardView.WIDTH;
        this.#height = CardView.HEIGHT;
    }

    get card() { return this.#card; }
    get width() { return this.#width; }
    get height() { return this.#height; }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;

        const cx = this.x + this.#width / 2;
        const cy = this.y + this.#height / 2;
        ctx.translate(cx, cy);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);

        // Flip effect: scale X based on flip progress
        const showFace = this.#card.faceUp && this.flipProgress > 0.5;
        const flipScale = Math.abs(this.flipProgress * 2 - 1);
        ctx.scale(flipScale || 0.05, 1);

        const w = this.#width;
        const h = this.#height;

        // Drop shadow
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 4;

        if (showFace) {
            this.#drawFace(ctx, w, h);
        } else {
            this.#drawBack(ctx, w, h);
        }

        ctx.restore();
    }

    #drawFace(ctx, w, h) {
        const hw = w / 2, hh = h / 2;
        const r = 6;

        if (deckLoaded && deckImage) {
            // Compute source rectangle from spritesheet
            const col = this.#card.rank - 1;            // 0–9
            const row = SUIT_ROW[this.#card.suit] ?? 0; // 0–3
            const sw = deckImage.naturalWidth / CardView.COLS;
            const sh = deckImage.naturalHeight / CardView.ROWS;
            const sx = col * sw;
            const sy = row * sh;

            // Draw rounded clip for the sprite
            this.#roundRect(ctx, -hw, -hh, w, h, r);
            ctx.clip();

            // Disable shadow inside the clip
            ctx.shadowColor = 'transparent';

            ctx.drawImage(deckImage, sx, sy, sw, sh, -hw, -hh, w, h);

            // Subtle border on top
            ctx.strokeStyle = 'rgba(0,0,0,0.25)';
            ctx.lineWidth = 1;
            this.#roundRect(ctx, -hw, -hh, w, h, r);
            ctx.stroke();
        } else {
            // Fallback: plain card
            ctx.fillStyle = '#faf5ec';
            this.#roundRect(ctx, -hw, -hh, w, h, r);
            ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#333';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.#card.label, 0, 0);
        }
    }

    #drawBack(ctx, w, h) {
        const hw = w / 2, hh = h / 2;
        const r = 6;

        // Card body — deep blue
        const bgGrad = ctx.createLinearGradient(-hw, -hh, hw, hh);
        bgGrad.addColorStop(0, '#1e3c72');
        bgGrad.addColorStop(1, '#0f2044');
        ctx.fillStyle = bgGrad;
        this.#roundRect(ctx, -hw, -hh, w, h, r);
        ctx.fill();

        ctx.shadowColor = 'transparent';

        // Ornate inner frame
        ctx.strokeStyle = '#3a6cc7';
        ctx.lineWidth = 1;
        this.#roundRect(ctx, -hw + 4, -hh + 4, w - 8, h - 8, 3);
        ctx.stroke();

        // Diamond lattice
        ctx.strokeStyle = 'rgba(80,140,230,0.18)';
        ctx.lineWidth = 0.5;
        const step = 10;
        for (let i = -hw + step; i < hw; i += step) {
            for (let j = -hh + step; j < hh; j += step) {
                ctx.beginPath();
                ctx.moveTo(i, j - 4);
                ctx.lineTo(i + 4, j);
                ctx.lineTo(i, j + 4);
                ctx.lineTo(i - 4, j);
                ctx.closePath();
                ctx.stroke();
            }
        }

        // Center crest — gold diamond
        ctx.fillStyle = 'rgba(212,175,55,0.25)';
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 12);
        ctx.lineTo(-8, 0);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(212,175,55,0.4)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Outer border
        ctx.strokeStyle = '#4a80d4';
        ctx.lineWidth = 1;
        this.#roundRect(ctx, -hw, -hh, w, h, r);
        ctx.stroke();
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
