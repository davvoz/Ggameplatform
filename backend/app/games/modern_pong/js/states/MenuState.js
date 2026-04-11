import { State } from './State.js';
import {
    DESIGN_WIDTH, DESIGN_HEIGHT,
    COLORS,  TITLE_FONT, UI_FONT,
} from '../config/Constants.js';
import { CHARACTERS } from '../characters/CharacterData.js';
import { SpriteGenerator } from '../characters/SpriteGenerator.js';

/**
 * Main menu state — mode selection.
 */
export class MenuState extends State {
    #titlePhase = 0;
    #bgStars = [];
    #gridLines = [];

    constructor(game) {
        super(game);
        this.#generateStars();
        this.#generateGrid();
    }

    enter() {
        this.#titlePhase = 0;
        this._game.sound.stopMusic();
        this._game.sound.playMenuMusic();
        this._game.ui.setButtons([
            {
                x: 60, y: 320, w: 280, h: 48,
                label: 'VS CPU', action: 'selectCPU',
                color: COLORS.NEON_CYAN,
                fontSize: 14,
            },
            {
                x: 60, y: 384, w: 280, h: 48,
                label: 'STORY MODE', action: 'selectStory',
                color: COLORS.NEON_GREEN,
                fontSize: 14,
            },
            {
                x: 60, y: 448, w: 280, h: 48,
                label: 'MULTIPLAYER', action: 'selectMultiplayer',
                color: COLORS.NEON_PINK,
                fontSize: 14,
            },
        ]);
    }

    exit() {
        this._game.ui.clearButtons();
    }

    update(dt) {
        this.#titlePhase += dt / 1000;
    }

    draw(ctx) {
        const w = DESIGN_WIDTH;
        const h = DESIGN_HEIGHT;

        // Deep background
        ctx.fillStyle = COLORS.BG_PRIMARY;
        ctx.fillRect(0, 0, w, h);

        // Animated perspective grid
        this.#drawPerspectiveGrid(ctx);

        // Stars
        this.#drawStars(ctx);

        // Radial glow behind title
        const titleGlow = ctx.createRadialGradient(w / 2, 100, 10, w / 2, 100, 180);
        titleGlow.addColorStop(0, 'rgba(191,90,242,0.12)');
        titleGlow.addColorStop(0.5, 'rgba(0,229,255,0.06)');
        titleGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = titleGlow;
        ctx.fillRect(0, 0, w, 300);

        // Title
        const titleY = 110;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // "MODERN" — purple/cyan glow, futuristic
        ctx.fillStyle = COLORS.NEON_PURPLE;
        ctx.shadowColor = COLORS.NEON_PURPLE;
        ctx.shadowBlur = 20;
        ctx.font = `900 26px ${TITLE_FONT}`;
        ctx.fillText('MODERN', w / 2, titleY - 22);
        // Double pass for glow
        ctx.globalAlpha = 0.4;
        ctx.shadowBlur = 40;
        ctx.fillText('MODERN', w / 2, titleY - 22);
        ctx.globalAlpha = 1;

        // "PONG" — massive, white with hot pink glow
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = COLORS.NEON_PINK;
        ctx.shadowBlur = 35;
        ctx.font = `900 56px ${TITLE_FONT}`;
        ctx.fillText('PONG', w / 2, titleY + 38);
        // Glow bloom
        ctx.globalAlpha = 0.25;
        ctx.shadowBlur = 60;
        ctx.fillText('PONG', w / 2, titleY + 38);
        ctx.globalAlpha = 1;

        // Animated underline
        ctx.shadowBlur = 0;
        const lineW = 160 + Math.sin(this.#titlePhase * 2) * 20;
        const lineGrad = ctx.createLinearGradient(w / 2 - lineW / 2, 0, w / 2 + lineW / 2, 0);
        lineGrad.addColorStop(0, 'transparent');
        lineGrad.addColorStop(0.2, COLORS.NEON_CYAN);
        lineGrad.addColorStop(0.5, COLORS.NEON_PURPLE);
        lineGrad.addColorStop(0.8, COLORS.NEON_PINK);
        lineGrad.addColorStop(1, 'transparent');
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w / 2 - lineW / 2, titleY + 72);
        ctx.lineTo(w / 2 + lineW / 2, titleY + 72);
        ctx.stroke();

        ctx.restore();

        // Subtitle
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = COLORS.TEXT_DIM;
        ctx.font = `600 10px ${UI_FONT}`;
        const subtitleAlpha = 0.4 + Math.sin(this.#titlePhase * 1.5) * 0.2;
        ctx.globalAlpha = subtitleAlpha;
        ctx.fillText('SELECT YOUR MODE', w / 2, 200);
        ctx.globalAlpha = 1;
        ctx.restore();

        // Preview characters
        this.#drawCharacterPreview(ctx);

        // Buttons
        this._game.ui.drawButtons(ctx);

        // Version
        ctx.fillStyle = COLORS.TEXT_DIM;
        ctx.font = `600 9px ${UI_FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('v1.0', w / 2, h - 12);

        // Scanlines
        this.#drawScanlines(ctx);

        // Vignette
        this.#drawVignette(ctx);
    }

    #drawCharacterPreview(ctx) {
        const y = 260;
        const spacing = 50;
        const startX = DESIGN_WIDTH / 2 - (CHARACTERS.length - 1) * spacing / 2;

        for (let i = 0; i < CHARACTERS.length; i++) {
            const portrait = SpriteGenerator.generatePortrait(CHARACTERS[i], 32);
            const px = startX + i * spacing - 16;
            // Hover float animation per character
            const floatY = Math.sin(this.#titlePhase * 2 + i * 0.8) * 3;
            ctx.drawImage(portrait, px, y + floatY);
        }
    }

    #generateStars() {
        for (let i = 0; i < 80; i++) {
            const rand = Math.random();
            let color;
            if (rand > 0.7) {
                color = '#bf5af2';
            } else if (rand > 0.5) {
                color = '#00e5ff';
            } else {
                color = '#ffffff';
            }
            this.#bgStars.push({
                x: Math.random() * DESIGN_WIDTH,
                y: Math.random() * DESIGN_HEIGHT,
                size: 0.5 + Math.random() * 2,
                speed: 0.2 + Math.random() * 0.5,
                phase: Math.random() * Math.PI * 2,
                color: color,
            });
        }
    }

    #generateGrid() {
        for (let i = 0; i < 20; i++) {
            this.#gridLines.push({
                y: i * 40,
                speed: 30 + Math.random() * 20,
            });
        }
    }

    #drawStars(ctx) {
        for (const star of this.#bgStars) {
            const alpha = 0.2 + Math.sin(this.#titlePhase * star.speed + star.phase) * 0.3;
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.fillStyle = star.color;
            ctx.beginPath();
            ctx.arc(Math.round(star.x), Math.round(star.y), star.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    #drawPerspectiveGrid(ctx) {
        const w = DESIGN_WIDTH;
        const h = DESIGN_HEIGHT;
        const cx = w / 2;
        const horizon = h * 0.35;
        const t = this.#titlePhase;

        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.strokeStyle = COLORS.NEON_PURPLE;
        ctx.lineWidth = 1;

        // Horizontal lines (moving toward viewer)
        for (let i = 0; i < 15; i++) {
            const baseY = (i * 50 + t * 30) % (h - horizon);
            const y = horizon + baseY;
            const spread = (y - horizon) / (h - horizon);
            const x1 = cx - spread * cx * 1.5;
            const x2 = cx + spread * cx * 1.5;
            ctx.globalAlpha = 0.03 + spread * 0.06;
            ctx.beginPath();
            ctx.moveTo(x1, y);
            ctx.lineTo(x2, y);
            ctx.stroke();
        }

        // Vertical converging lines
        ctx.globalAlpha = 0.04;
        for (let i = -6; i <= 6; i++) {
            const bottomX = cx + i * 40;
            ctx.beginPath();
            ctx.moveTo(cx, horizon);
            ctx.lineTo(bottomX, h);
            ctx.stroke();
        }

        ctx.restore();
    }

    #drawScanlines(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.03)';
        for (let i = 0; i < DESIGN_HEIGHT; i += 2) {
            ctx.fillRect(0, i, DESIGN_WIDTH, 1);
        }
    }

    #drawVignette(ctx) {
        const w = DESIGN_WIDTH;
        const h = DESIGN_HEIGHT;
        const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.9);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    }
}
