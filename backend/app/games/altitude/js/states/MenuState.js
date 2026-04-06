/**
 * MenuState - Main menu with play and shop options
 */

import { State } from './State.js';
import { DESIGN_WIDTH, DESIGN_HEIGHT, COLORS, FONTS } from '../config/Constants.js';
import { bitmapFont } from '../graphics/BitmapFont.js';

export class MenuState extends State {
    #buttons = [];
    #titlePhase = 0;
    #bgStars = [];
    #selectedIndex = 0;
    #inputCooldown = 0;

    constructor(game) {
        super(game);
        this.#generateStars();
    }

    #generateStars() {
        this.#bgStars = [];
        for (let i = 0; i < 50; i++) {
            this.#bgStars.push({
                x: Math.random() * DESIGN_WIDTH,
                y: Math.random() * DESIGN_HEIGHT,
                size: 1 + Math.random() * 2,
                speed: 20 + Math.random() * 30,
                alpha: 0.3 + Math.random() * 0.7,
            });
        }
    }

    enter() {
        this.#titlePhase = 0;
        this.#selectedIndex = 0;

        const infiniteUnlocked = this._game.save.infiniteUnlocked;

        this.#buttons = [
            {
                label: infiniteUnlocked ? 'CAMPAIGN' : 'PLAY',
                action: () => {
                    this._game.fsm.transition('levelSelect');
                },
                color: COLORS.NEON_GREEN,
            },
        ];

        if (infiniteUnlocked) {
            this.#buttons.push({
                label: 'INFINITE',
                action: () => {
                    this._game.startInfinite();
                },
                color: COLORS.NEON_PURPLE,
            });
        }

        this.#buttons.push({
            label: 'SHOP',
            action: () => {
                this._game.openShop('menu');
            },
            color: COLORS.NEON_ORANGE,
        });
    }

    exit() {
        this.#buttons = [];
    }

    update(dt) {
        this.#titlePhase += dt;

        // Update stars
        for (const star of this.#bgStars) {
            star.y += star.speed * dt;
            if (star.y > DESIGN_HEIGHT) {
                star.y = 0;
                star.x = Math.random() * DESIGN_WIDTH;
            }
        }

        // Input cooldown
        if (this.#inputCooldown > 0) {
            this.#inputCooldown -= dt;
            return;
        }

        // Keyboard navigation only — skip when a touch is active so that
        // touch taps are handled exclusively via justTapped (with hit testing).
        // This prevents jumpJustPressed (fired on touchstart) from triggering
        // the wrong button before justTapped can resolve the correct one.
        const input = this._game.input;
        if (input.jumpJustPressed && !input.isTouching) {
            this.#buttons[this.#selectedIndex]?.action();
            this._game.sound.playMenuSelect();
            input.consumeJump();
            this.#inputCooldown = 0.2;
        }

        // Tap/click navigation
        if (input.justTapped) {
            const tx = input.tapX;
            const ty = input.tapY;
            input.consumeTap();

            const buttonY = 320;
            const buttonW = 200;
            const buttonH = 50;
            const buttonGap = 70;

            for (let i = 0; i < this.#buttons.length; i++) {
                const by = buttonY + i * buttonGap;
                if (tx >= DESIGN_WIDTH / 2 - buttonW / 2 && tx <= DESIGN_WIDTH / 2 + buttonW / 2 &&
                    ty >= by - buttonH / 2 && ty <= by + buttonH / 2) {
                    this.#selectedIndex = i;
                    this.#buttons[i].action();
                    this._game.sound.playMenuSelect();
                    this.#inputCooldown = 0.2;
                    break;
                }
            }
        }
    }

    #handleTouch() {
        // legacy stub — tap handling moved to update()
    }

    draw(ctx) {
        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, DESIGN_HEIGHT);
        gradient.addColorStop(0, COLORS.BG_GRADIENT_TOP);
        gradient.addColorStop(1, COLORS.BG_GRADIENT_BOTTOM);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

        // Draw stars
        this.#drawStars(ctx);

        // Title glow
        this.#drawTitleGlow(ctx);

        // Title
        this.#drawTitle(ctx);

        // High score
        this.#drawHighScore(ctx);

        // Buttons
        this.#drawButtons(ctx);

        // Instructions
        this.#drawInstructions(ctx);
    }

    #drawStars(ctx) {
        for (const star of this.#bgStars) {
            ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    #drawTitleGlow(ctx) {
        const glow = ctx.createRadialGradient(
            DESIGN_WIDTH / 2, 150, 10,
            DESIGN_WIDTH / 2, 150, 200
        );
        glow.addColorStop(0, 'rgba(0, 255, 170, 0.2)');
        glow.addColorStop(0.5, 'rgba(0, 170, 255, 0.1)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, DESIGN_WIDTH, 350);
    }

    #drawTitle(ctx) {
        const titleY = 132;

        //shadow layers
        bitmapFont.drawText(ctx, 'ALTITUDE', DESIGN_WIDTH / 2 + 4, titleY + 4, 90, {
            align: 'center',
            letterSpacing: 0,
            alpha: 1,
            color: 'rgb(0, 0, 0)'
        });


        // Main bitmap font pass
        bitmapFont.drawText(ctx, 'ALTITUDE', DESIGN_WIDTH / 2, titleY, 90, {
            align: 'center',
            letterSpacing: 0,
            alpha: 1,
            color: COLORS.NEON_GREEN,
        });

    }

    #drawHighScore(ctx) {
        const highScore = this._game.save.highScore;
        const maxAlt = this._game.save.maxAltitude;

        //shadow
        bitmapFont.drawText(ctx,
            `High Score: ${highScore}`,
            DESIGN_WIDTH / 2 + 2,
            220 + 2,
            30,
            {
                align: 'center',
                letterSpacing: 0.3,
                alpha: 1,
                color: 'rgba(0,0,0,1)'
            });
        bitmapFont.drawText(ctx,
            `High Score: ${highScore}`,
            DESIGN_WIDTH / 2,
            220,
            30,
            {
                align: 'center',
                letterSpacing: 0.3,
                alpha: 1,
                color: COLORS.NEON_PINK
            });

        //shadow
        bitmapFont.drawText(ctx,
            `Max Altitude: ${Math.floor(maxAlt)}m`,
            DESIGN_WIDTH / 2 + 2,
            260 + 2,
            30,
            {
                align: 'center',
                letterSpacing: 0.3,
                alpha: 1,
                color: 'rgba(0,0,0,1)'
            });
        bitmapFont.drawText(ctx,
            `Max Altitude: ${Math.floor(maxAlt)}m`,
            DESIGN_WIDTH / 2,
            260,
            30,
            {
                align: 'center',
                letterSpacing: 0.3,
                alpha: 1,
                color: COLORS.NEON_GREEN
            });
    }

    #drawButtons(ctx) {
        const buttonY = 320;
        const buttonW = 200;
        const buttonH = 50;
        const buttonGap = 70;

        this.#buttons.forEach((btn, i) => {
            const y = buttonY + i * buttonGap;
            const x = DESIGN_WIDTH / 2;
            const isSelected = i === this.#selectedIndex;
            const hover = isSelected ? 1.05 : 1;

            ctx.save();
            ctx.translate(x, y);
            ctx.scale(hover, hover);

            // Button background
            ctx.fillStyle = isSelected ? btn.color : 'rgba(255, 255, 255, 1)';
            ctx.globalAlpha = isSelected ? 0.3 : 0.2;
            ctx.beginPath();
            ctx.roundRect(-buttonW / 2, -buttonH / 2, buttonW, buttonH, 12);
            ctx.fill();

            // Border
            ctx.strokeStyle = btn.color;
            ctx.lineWidth = isSelected ? 3 : 2;
            ctx.globalAlpha = isSelected ? 1 : 0.7;
            ctx.stroke();

            //shadow
            bitmapFont.drawText(ctx, btn.label, 2, 3, 36, {
                align: 'center',
                color: 'rgba(0, 0, 0, 1)',
                alpha: 1,
                letterSpacing: 0.5,
            });

            // Text
            ctx.globalAlpha = 1;
            bitmapFont.drawText(ctx, btn.label, 0, 1, 36, {
                align: 'center',
                color: btn.color,
                alpha: 1,
                letterSpacing: 0.5,
            });

            ctx.restore();
        });
    }

    #drawInstructions(ctx) {
        const y = DESIGN_HEIGHT - 60;

        // Arrow chars not in bitmap sheet — keep as canvas text
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = COLORS.UI_TEXT_DIM;
        ctx.font = `400 12px ${FONTS.UI}`;
        ctx.fillText('\u2190 \u2192 or Touch to move', DESIGN_WIDTH / 2, y);
        ctx.restore();

        bitmapFont.drawText(ctx, 'Space or Tap to jump', DESIGN_WIDTH / 2, y + 18, 22, {
            align: 'center', color: COLORS.UI_TEXT_DIM,
        });

        // Coins — emoji not in bitmap sheet, keep as canvas
        const coins = this._game.save.totalCoins;
        // ctx.save();
        // ctx.textAlign = 'center';
        // ctx.textBaseline = 'middle';
        // ctx.fillStyle = COLORS.COIN_GOLD;
        // ctx.font = `600 14px ${FONTS.UI}`;
        // ctx.restore();
        //shadow
            bitmapFont.drawText(ctx, `${coins}`, DESIGN_WIDTH / 2 + 2, y - 18 + 2, 28, {
                align: 'center',
                color: 'rgba(0,0,0,1)',
                alpha: 1,
                letterSpacing: 0.5,
            });
        // Text
        bitmapFont.drawText(ctx, ` ${coins}`, DESIGN_WIDTH / 2, y - 18, 28, {
            align: 'center',
            color: COLORS.NEON_ORANGE,
            alpha: 1,
            letterSpacing: 0.5,
        });
    }
}
