/**
 * GameOverState - Displayed when player dies
 * Shows score, new record notification, and retry options.
 */

import { State } from './State.js';
import { DESIGN_WIDTH, DESIGN_HEIGHT, COLORS } from '../config/Constants.js';
import { bitmapFont } from '../graphics/BitmapFont.js';

export class GameOverState extends State {
    #animTime = 0;
    #selectedOption = 0;
    #options = ['RETRY', 'SHOP', 'MENU'];
    #isNewRecord = false;
    #displayScore = 0;
    #displayAltitude = 0;
    #displayCoins = 0;
    #particles = [];
    #revealed = false;
    #bgStars = [];

    #generateStars() {
        return Array.from({ length: 40 }, () => ({
            x:     Math.random() * DESIGN_WIDTH,
            y:     Math.random() * DESIGN_HEIGHT,
            size:  1 + Math.random() * 1.5,
            speed: 15 + Math.random() * 20,
            alpha: 0.2 + Math.random() * 0.5,
        }));
    }

    enter() {
        this.#animTime = 0;
        this.#selectedOption = 0;
        this.#revealed = false;

        // Get final score
        const finalScore = this._game.score;

        // Check new record
        this.#isNewRecord = this._game.isNewHighScore(finalScore);

        // Animated counters
        this.#displayScore = 0;
        this.#displayAltitude = 0;
        this.#displayCoins = 0;

        // Celebration particles
        this.#particles = [];
        this.#bgStars = this.#generateStars();
        if (this.#isNewRecord) {
            this.#createCelebrationParticles();
        }
    }

    exit() {
        this.#particles = [];
    }

    #createCelebrationParticles() {
        for (let i = 0; i < 50; i++) {
            this.#particles.push({
                x: Math.random() * DESIGN_WIDTH,
                y: Math.random() * DESIGN_HEIGHT,
                vx: (Math.random() - 0.5) * 100,
                vy: -50 - Math.random() * 100,
                size: 3 + Math.random() * 5,
                color: [COLORS.NEON_CYAN, COLORS.NEON_PURPLE, COLORS.NEON_YELLOW, COLORS.NEON_GREEN][Math.floor(Math.random() * 4)],
                life: 2 + Math.random() * 2,
                gravity: 30,
            });
        }
    }

    update(dt) {
        this.#animTime += dt;

        // Scroll stars
        for (const star of this.#bgStars) {
            star.y += star.speed * dt;
            if (star.y > DESIGN_HEIGHT) {
                star.y = 0;
                star.x = Math.random() * DESIGN_WIDTH;
            }
        }

        // Animated score reveal
        if (this.#animTime > 0.5 && this.#animTime < 2) {
            const progress = (this.#animTime - 0.5) / 1.5;
            const eased = 1 - Math.pow(1 - progress, 3);
            this.#displayScore = Math.floor(this._game.score * eased);
            this.#displayAltitude = Math.floor(this._game.altitude * eased);
            this.#displayCoins = Math.floor(this._game.coins * eased);
        } else if (this.#animTime >= 2 && !this.#revealed) {
            this.#displayScore = this._game.score;
            this.#displayAltitude = this._game.altitude;
            this.#displayCoins = this._game.coins;
            this.#revealed = true;
        }

        // Update particles
        for (const p of this.#particles) {
            p.x += p.vx * dt;
            p.vy += p.gravity * dt;
            p.y += p.vy * dt;
            p.life -= dt;
        }
        this.#particles = this.#particles.filter(p => p.life > 0);

        // Input handling after delay
        if (this.#animTime < 1) return;

        const input = this._game.input;

        if (input.justTapped) {
            const tx = input.tapX;
            const ty = input.tapY;
            input.consumeTap();
            this.#handleTap(tx, ty);
        }
    }

    #handleTap(tx, ty) {
        const y = 420;
        const buttonWidth = 90;
        const buttonHeight = 40;
        const spacing = 10;
        const totalWidth = this.#options.length * buttonWidth + (this.#options.length - 1) * spacing;
        const startX = (DESIGN_WIDTH - totalWidth) / 2;

        if (ty >= y && ty <= y + buttonHeight) {
            for (let i = 0; i < this.#options.length; i++) {
                const bx = startX + i * (buttonWidth + spacing);
                if (tx >= bx && tx <= bx + buttonWidth) {
                    this.#selectedOption = i;
                    this.#selectOption();
                    return;
                }
            }
        }
    }

    #selectOption() {
        this._game.sound.playConfirm();

        switch (this.#options[this.#selectedOption]) {
            case 'RETRY':
                // Replay the same level the player was on (no level reset)
                this._game.resetSession();
                this._game.fsm.transition('playing');
                break;
            case 'SHOP':
                this._game.openShop('menu');
                break;
            case 'MENU':
                this._game.fsm.transition('menu');
                break;
        }
    }

    draw(ctx) {
        // Background
        this.#drawBackground(ctx);

        // Particles
        this.#drawParticles(ctx);

        // Game Over text
        this.#drawGameOver(ctx);

        // Score display
        this.#drawScorePanel(ctx);

        // New record
        if (this.#isNewRecord && this.#animTime > 1.5) {
            this.#drawNewRecord(ctx);
        }

        // Options
        if (this.#animTime > 1) {
            this.#drawOptions(ctx);
        }
    }

    #drawBackground(ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, DESIGN_HEIGHT);
        g.addColorStop(0, COLORS.BG_GRADIENT_TOP);
        g.addColorStop(1, COLORS.BG_GRADIENT_BOTTOM);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

        for (const star of this.#bgStars) {
            ctx.fillStyle = `rgba(255,255,255,${star.alpha.toFixed(2)})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    #drawParticles(ctx) {
        for (const p of this.#particles) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.min(1, p.life);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    #drawGameOver(ctx) {
        const cx = DESIGN_WIDTH / 2;
        const ty = 62;

        // Shadow
        bitmapFont.drawText(ctx, 'GAME OVER', cx + 3, ty + 3, 48, { align: 'center', color: 'rgba(0,0,0,0.8)' });
        // Main text
        bitmapFont.drawText(ctx, 'GAME OVER', cx, ty, 48, { align: 'center', color: COLORS.NEON_RED });


    }

    #drawScorePanel(ctx) {
        ctx.save();
        const cx      = DESIGN_WIDTH / 2;
        const panelX  = 30;
        const panelY  = 118;
        const panelW  = DESIGN_WIDTH - 60;
        const panelH  = 242;

        // Panel background
        ctx.fillStyle   = COLORS.UI_PANEL;
        ctx.strokeStyle = COLORS.UI_BORDER;
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, panelH, 14);
        ctx.fill();
        ctx.stroke();

        // ── Score ────────────────────────────────────────────────────
        let y = panelY + 38;
        //shadow
        bitmapFont.drawText(ctx, 'SCORE', cx + 2, y + 2, 28, { align: 'center', color: 'rgba(0,0,0,1)' });  
        bitmapFont.drawText(ctx, 'SCORE', cx, y, 28, { align: 'center', color: COLORS.NEON_GREEN });
        y += 44;
        //shadow
        bitmapFont.drawText(ctx, String(Math.floor(this.#displayScore)), cx + 2, y + 2, 44, { align: 'center', color: 'rgb(0, 0, 0)' });
        bitmapFont.drawText(ctx, String(Math.floor(this.#displayScore)), cx, y, 44, { align: 'center', color: COLORS.NEON_GREEN });

        // Divider
        y += 28;
        ctx.strokeStyle = COLORS.UI_BORDER_DIM;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(panelX + 24, y);
        ctx.lineTo(panelX + panelW - 24, y);
        ctx.stroke();

        // ── Altitude + Coins (2-column row) ──────────────────────────
        const col1 = panelX + panelW * 0.25;
        const col2 = panelX + panelW * 0.75;
        y += 26;
        //shadow
        bitmapFont.drawText(ctx, 'ALTITUDE', col1 + 2, y + 2, 28, { align: 'center', color: 'rgba(0,0,0,1)' });
        bitmapFont.drawText(ctx, 'ALTITUDE', col1, y, 28, { align: 'center', color: COLORS.NEON_PINK });
        bitmapFont.drawText(ctx, 'COINS',    col2 + 2, y + 2, 28, { align: 'center', color: 'rgba(0,0,0,1)' });
        bitmapFont.drawText(ctx, 'COINS',    col2, y, 28, { align: 'center', color: COLORS.COIN_GOLD });
        y += 30;
        bitmapFont.drawText(ctx, `${Math.floor(this.#displayAltitude)} m`, col1, y, 22, { align: 'center', color: COLORS.NEON_CYAN });
        bitmapFont.drawText(ctx, `+${this.#displayCoins}`,                 col2, y, 22, { align: 'center', color: COLORS.COIN_GOLD });

        // Vertical separator between the two columns
        ctx.strokeStyle = COLORS.UI_BORDER_DIM;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(cx, y - 32);
        ctx.lineTo(cx, y + 14);
        ctx.stroke();

        ctx.restore();
    }

    #drawNewRecord(ctx) {
        ctx.save();

        const y = 385;
        const pulse = 1 + Math.sin(this.#animTime * 6) * 0.1;

        ctx.translate(DESIGN_WIDTH / 2, y);
        ctx.scale(pulse, pulse);

        bitmapFont.drawText(ctx, 'NEW RECORD!', 0, 0, 28, { align: 'center', color: COLORS.NEON_YELLOW });

        ctx.restore();
    }

    #drawOptions(ctx) {
        ctx.save();

        const y = 420;
        const buttonWidth = 90;
        const buttonHeight = 40;
        const spacing = 10;
        const totalWidth = this.#options.length * buttonWidth + (this.#options.length - 1) * spacing;
        const startX = (DESIGN_WIDTH - totalWidth) / 2;

        this.#options.forEach((option, i) => {
            const x = startX + i * (buttonWidth + spacing);
            const isSelected = i === this.#selectedOption;

            // Button background
            if (isSelected) {
                ctx.fillStyle   = COLORS.NEON_CYAN;
                ctx.strokeStyle = COLORS.NEON_CYAN;
                ctx.lineWidth   = 1.5;
            } else {
                ctx.fillStyle   = 'rgba(255,255,255,0.12)';
                ctx.strokeStyle = 'rgba(255,255,255,0.35)';
                ctx.lineWidth   = 1.5;
            }
            ctx.beginPath();
            ctx.roundRect(x, y, buttonWidth, buttonHeight, 8);
            ctx.fill();
            ctx.stroke();

            // Button text
            bitmapFont.drawText(ctx, option, x + buttonWidth / 2, y + buttonHeight / 2, 20, {
                align: 'center',
                color: isSelected ? COLORS.BG_PRIMARY : COLORS.UI_TEXT,
            });
        });

        ctx.restore();

    }
}
