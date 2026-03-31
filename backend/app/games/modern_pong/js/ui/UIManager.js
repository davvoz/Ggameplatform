import {
    DESIGN_WIDTH, DESIGN_HEIGHT,
    ARENA_LEFT, ARENA_RIGHT, ARENA_TOP, ARENA_BOTTOM, ARENA_MID_Y,
    COLORS,  UI_FONT,
} from '../config/Constants.js';

/**
 * Canvas-based UI manager. Everything is drawn — no DOM elements.
 * Handles buttons, hit detection, and event dispatch.
 */
export class UIManager {
    #canvas;
    #renderer;
    #buttons = [];
    #globalListeners = new Map();
    #stateListeners = new Map();
    #soundManager = null;

    set soundManager(sm) { this.#soundManager = sm; }

    constructor(canvas, renderer) {
        this.#canvas = canvas;
        this.#renderer = renderer;
        this.#setupClickHandler();
    }

    /**
     * Register a persistent (global) listener that survives clearButtons().
     * Used by Game.#wireGlobalUIEvents() for menu actions.
     */
    onGlobal(eventName, callback) {
        if (!this.#globalListeners.has(eventName)) {
            this.#globalListeners.set(eventName, []);
        }
        this.#globalListeners.get(eventName).push(callback);
    }

    /**
     * Register a state-scoped listener, cleared on every clearButtons().
     */
    on(eventName, callback) {
        if (!this.#stateListeners.has(eventName)) {
            this.#stateListeners.set(eventName, []);
        }
        this.#stateListeners.get(eventName).push(callback);
    }

    emit(eventName, data = null) {
        const global = this.#globalListeners.get(eventName);
        if (global) {
            for (const cb of global) cb(data);
        }
        const state = this.#stateListeners.get(eventName);
        if (state) {
            for (const cb of state) cb(data);
        }
    }

    setButtons(buttons) {
        this.#buttons = buttons;
        this.#stateListeners.clear();
    }

    clearButtons() {
        this.#buttons = [];
        this.#stateListeners.clear();
    }

    drawButtons(ctx) {
        for (const btn of this.#buttons) {
            this.#drawButton(ctx, btn);
        }
    }

    #drawButton(ctx, btn) {
        if (btn.hidden) return;
        const { x, y, w, h, label, color = COLORS.NEON_CYAN, fontSize = 10 } = btn;
        if (!label) return; // invisible hitbox — don't draw

        const cut = Math.min(10, h / 3); // corner cut size for angular look
        const font = btn.fontFamily || UI_FONT;

        ctx.save();

        // Angular clipped path (top-left and bottom-right corners cut)
        ctx.beginPath();
        ctx.moveTo(x + cut, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + h - cut);
        ctx.lineTo(x + w - cut, y + h);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x, y + cut);
        ctx.closePath();

        // Gradient background fill
        const grad = ctx.createLinearGradient(x, y, x + w, y + h);
        grad.addColorStop(0, 'rgba(10,10,30,0.92)');
        grad.addColorStop(0.5, 'rgba(20,15,40,0.88)');
        grad.addColorStop(1, 'rgba(10,10,30,0.92)');
        ctx.fillStyle = grad;
        ctx.fill();

        // Inner highlight line at top
        ctx.save();
        ctx.clip();
        const topLine = ctx.createLinearGradient(x, y, x + w, y);
        topLine.addColorStop(0, 'transparent');
        topLine.addColorStop(0.3, color + '40');
        topLine.addColorStop(0.7, color + '40');
        topLine.addColorStop(1, 'transparent');
        ctx.fillStyle = topLine;
        ctx.fillRect(x, y, w, 2);
        ctx.restore();

        // Re-create path for stroke
        ctx.beginPath();
        ctx.moveTo(x + cut, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + h - cut);
        ctx.lineTo(x + w - cut, y + h);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x, y + cut);
        ctx.closePath();

        // Border with glow
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Second pass for stronger glow
        ctx.globalAlpha = 0.3;
        ctx.shadowBlur = 16;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Small accent triangle in top-left cut
        ctx.beginPath();
        ctx.moveTo(x, y + cut);
        ctx.lineTo(x + cut, y);
        ctx.lineTo(x + cut, y + cut);
        ctx.closePath();
        ctx.fillStyle = color + '15';
        ctx.fill();

        // Label
        ctx.shadowBlur = 4;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.font = `bold ${fontSize}px ${font}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.letterSpacing = '2px';
        ctx.fillText(label, x + w / 2, y + h / 2);

        ctx.restore();
    }

    #setupClickHandler() {
        let handledByTouch = false;

        const handleClick = (pageX, pageY) => {
            const pos = this.#renderer.pageToCanvas(pageX, pageY);
            for (const btn of this.#buttons) {
                if (pos.x >= btn.x && pos.x <= btn.x + btn.w &&
                    pos.y >= btn.y && pos.y <= btn.y + btn.h) {
                    if (this.#soundManager) this.#soundManager.playClick();
                    this.emit(btn.action, btn);
                    return;
                }
            }
        };

        this.#canvas.addEventListener('click', (e) => {
            if (handledByTouch) {
                handledByTouch = false;
                return;
            }
            handleClick(e.pageX, e.pageY);
        });

        this.#canvas.addEventListener('touchend', (e) => {
            const touch = e.changedTouches[0];
            if (touch) {
                handledByTouch = true;
                handleClick(touch.pageX, touch.pageY);
            }
        }, { passive: true });
    }

    update(_dt) { /* no-op for now */ }
}

/**
 * In-game HUD — scores, round info, arena.
 */
export class HUD {

    static #FNT = '"Rajdhani", "Orbitron", sans-serif';

    static drawArena(ctx) {
        const aW = ARENA_RIGHT - ARENA_LEFT;
        const aH = ARENA_BOTTOM - ARENA_TOP;
        const cx = (ARENA_LEFT + ARENA_RIGHT) / 2;
        const cy = ARENA_MID_Y;

        // Arena background
        ctx.fillStyle = COLORS.ARENA_BG;
        ctx.fillRect(ARENA_LEFT, ARENA_TOP, aW, aH);

        // Field markings color
        const lineColor = COLORS.ARENA_BORDER;
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);

        // Outer border
        ctx.strokeRect(ARENA_LEFT, ARENA_TOP, aW, aH);

        // Center line
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ARENA_LEFT, cy);
        ctx.lineTo(ARENA_RIGHT, cy);
        ctx.stroke();

        // Center circle
        const circleR = 55;
        ctx.beginPath();
        ctx.arc(cx, cy, circleR, 0, Math.PI * 2);
        ctx.stroke();

        // Center dot
        ctx.fillStyle = lineColor;
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();

        // Goal areas (penalty boxes)
        const boxW = 160;
        const boxH = 70;
        const boxX = cx - boxW / 2;
        // Top goal area
        ctx.strokeRect(boxX, ARENA_TOP, boxW, boxH);
        // Bottom goal area
        ctx.strokeRect(boxX, ARENA_BOTTOM - boxH, boxW, boxH);

        // Small goal areas (6-yard box)
        const sBoxW = 80;
        const sBoxH = 30;
        const sBoxX = cx - sBoxW / 2;
        ctx.strokeRect(sBoxX, ARENA_TOP, sBoxW, sBoxH);
        ctx.strokeRect(sBoxX, ARENA_BOTTOM - sBoxH, sBoxW, sBoxH);

        // Penalty dots
        ctx.fillStyle = lineColor;
        ctx.beginPath();
        ctx.arc(cx, ARENA_TOP + boxH - 15, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, ARENA_BOTTOM - boxH + 15, 3, 0, Math.PI * 2);
        ctx.fill();

        // Penalty arcs (semicircles outside penalty box)
        const penArcR = 30;
        ctx.beginPath();
        ctx.arc(cx, ARENA_TOP + boxH - 15, penArcR, 0.3 * Math.PI, 0.7 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, ARENA_BOTTOM - boxH + 15, penArcR, 1.3 * Math.PI, 1.7 * Math.PI);
        ctx.stroke();

        // Corner arcs
        const cornerR = 18;
        ctx.beginPath();
        ctx.arc(ARENA_LEFT, ARENA_TOP, cornerR, 0, Math.PI * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(ARENA_RIGHT, ARENA_TOP, cornerR, Math.PI * 0.5, Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(ARENA_RIGHT, ARENA_BOTTOM, cornerR, Math.PI, Math.PI * 1.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(ARENA_LEFT, ARENA_BOTTOM, cornerR, Math.PI * 1.5, Math.PI * 2);
        ctx.stroke();

        // Goal zones glow
        const goalGrad1 = ctx.createLinearGradient(0, ARENA_TOP, 0, ARENA_TOP + 15);
        goalGrad1.addColorStop(0, 'rgba(255,0,100,0.3)');
        goalGrad1.addColorStop(1, 'rgba(255,0,100,0)');
        ctx.fillStyle = goalGrad1;
        ctx.fillRect(ARENA_LEFT, ARENA_TOP, aW, 15);

        const goalGrad2 = ctx.createLinearGradient(0, ARENA_BOTTOM - 15, 0, ARENA_BOTTOM);
        goalGrad2.addColorStop(0, 'rgba(0,200,255,0)');
        goalGrad2.addColorStop(1, 'rgba(0,200,255,0.3)');
        ctx.fillStyle = goalGrad2;
        ctx.fillRect(ARENA_LEFT, ARENA_BOTTOM - 15, aW, 15);
    }

    static drawScores(ctx, topScore, bottomScore, topName, bottomName, topColor, bottomColor) {
        const w = DESIGN_WIDTH;
        const fnt = HUD.#FNT;

        // ---- TOP HUD BAR ----
        ctx.fillStyle = COLORS.HUD_BG;
        ctx.fillRect(0, 0, w, ARENA_TOP);

        // Top player: name left, score right
        // Name with colored accent dot
        ctx.fillStyle = topColor;
        ctx.beginPath();
        ctx.arc(14, 24, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#c8cde0';
        ctx.font = 'bold 13px ' + fnt;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(topName, 24, 24);

        // Score - big and glowing
        ctx.save();
        ctx.fillStyle = topColor;
        ctx.shadowColor = topColor;
        ctx.shadowBlur = 8;
        ctx.font = 'bold 28px ' + fnt;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(topScore), w - 14, 28);
        ctx.restore();

        // ---- BOTTOM HUD BAR ----
        ctx.fillStyle = COLORS.HUD_BG;
        ctx.fillRect(0, ARENA_BOTTOM, w, DESIGN_HEIGHT - ARENA_BOTTOM);

        // Bottom player: name left, score right
        ctx.fillStyle = bottomColor;
        ctx.beginPath();
        ctx.arc(14, ARENA_BOTTOM + 24, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#c8cde0';
        ctx.font = 'bold 13px ' + fnt;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(bottomName, 24, ARENA_BOTTOM + 24);

        ctx.save();
        ctx.fillStyle = bottomColor;
        ctx.shadowColor = bottomColor;
        ctx.shadowBlur = 8;
        ctx.font = 'bold 28px ' + fnt;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(bottomScore), w - 14, ARENA_BOTTOM + 28);
        ctx.restore();

        // ---- DIVIDER LINES ----
        ctx.strokeStyle = 'rgba(80,80,140,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, ARENA_TOP);
        ctx.lineTo(w, ARENA_TOP);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, ARENA_BOTTOM);
        ctx.lineTo(w, ARENA_BOTTOM);
        ctx.stroke();
    }

    static drawRoundInfo(ctx, currentRound, roundsToWin, deuce = false, advantage = null, bottomLabel = 'YOU', topLabel = 'CPU') {
        const w = DESIGN_WIDTH;
        const fnt = HUD.#FNT;
        const cx = w / 2;
        const y = ARENA_TOP - 14;

        if (deuce) {
            HUD.#drawDeuceLabel(ctx, cx, y, fnt);
        } else if (advantage) {
            HUD.#drawAdvantageLabel(ctx, cx, y, fnt, advantage, bottomLabel, topLabel);
        } else {
            ctx.font = 'bold 10px ' + fnt;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#6670a0';
            ctx.fillText('ROUND ' + currentRound + '  \u2022  FT ' + roundsToWin, cx, y);
        }
    }

    /* ----------  animated DEUCE label  ---------- */
    static #drawDeuceLabel(ctx, cx, y, fnt) {
        const t = performance.now();
        const pulse = 0.85 + 0.15 * Math.sin(t / 180);          // size throb
        const glow  = 10 + 8 * Math.sin(t / 220);               // shadow throb
        const alpha = 0.8 + 0.2 * Math.sin(t / 150);
        const size  = Math.round(14 * pulse);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold ' + size + 'px ' + fnt;
        ctx.fillStyle = `rgba(255,80,40,${alpha})`;
        ctx.shadowColor = '#ff3300';
        ctx.shadowBlur = glow;
        ctx.fillText('\u26A1 DEUCE! \u26A1', cx, y);
        // second pass for extra glow
        ctx.globalAlpha = 0.35;
        ctx.shadowBlur = glow + 6;
        ctx.fillText('\u26A1 DEUCE! \u26A1', cx, y);
        ctx.restore();
    }

    /* ----------  animated ADVANTAGE label  ---------- */
    static #drawAdvantageLabel(ctx, cx, y, fnt, who, bottomLabel = 'YOU', topLabel = 'CPU') {
        const t = performance.now();
        const slide = 2 * Math.sin(t / 250);                    // horizontal wobble
        const glow  = 8 + 6 * Math.sin(t / 200);
        const color = who === 'bottom' ? '#00f0ff' : '#ff00aa'; // player colors
        const label = who === 'bottom'
            ? '\u25B6 ADV ' + bottomLabel
            : 'ADV ' + topLabel + ' \u25C0';

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 13px ' + fnt;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = glow;
        ctx.fillText(label, cx + slide, y);
        // bloom pass
        ctx.globalAlpha = 0.3;
        ctx.shadowBlur = glow + 8;
        ctx.fillText(label, cx + slide, y);
        ctx.restore();
    }

    /* ----------  pulsing arena border for deuce / advantage  ---------- */
    static drawDeuceBorder(ctx, deuce, advantage) {
        if (!deuce && !advantage) return;

        const t = performance.now();
        const alpha = 0.12 + 0.10 * Math.sin(t / 300);
        const color = deuce
            ? `rgba(255,80,40,${alpha})`
            : (advantage === 'bottom'
                ? `rgba(0,240,255,${alpha})`
                : `rgba(255,0,170,${alpha})`);
        const blur = deuce
            ? 12 + 8 * Math.sin(t / 250)
            : 10 + 6 * Math.sin(t / 200);

        ctx.save();
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = blur;
        ctx.lineWidth = 3;
        ctx.strokeRect(ARENA_LEFT, ARENA_TOP, ARENA_RIGHT - ARENA_LEFT, ARENA_BOTTOM - ARENA_TOP);
        // second pass for stronger glow
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = blur + 6;
        ctx.strokeRect(ARENA_LEFT, ARENA_TOP, ARENA_RIGHT - ARENA_LEFT, ARENA_BOTTOM - ARENA_TOP);
        ctx.restore();
    }

    static drawCenterText(ctx, text, color = COLORS.WHITE, size = 20) {
        const cx = DESIGN_WIDTH / 2;
        const cy = (ARENA_TOP + ARENA_BOTTOM) / 2;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.shadowColor = color;
        ctx.shadowBlur = 18;
        ctx.fillStyle = color;
        ctx.font = 'bold ' + size + 'px ' + HUD.#FNT;

        ctx.globalAlpha = 0.2;
        ctx.fillText(text, cx + 2, cy + 2);
        ctx.globalAlpha = 1;
        ctx.fillText(text, cx, cy);

        ctx.restore();
    }

    static drawScanlines(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.04)';
        for (let i = 0; i < DESIGN_HEIGHT; i += 3) {
            ctx.fillRect(0, i, DESIGN_WIDTH, 1);
        }
        ctx.restore();
    }

    /**
     * Draw super-shot charge bars for both players in the HUD area.
     */
    static drawSuperBars(ctx, topPlayer, bottomPlayer) {
        const fnt = HUD.#FNT;
        const barW = 90;
        const barH = 6;
        const barR = 3; // corner radius

        // --- TOP PLAYER super bar (right side of top HUD, below score) ---
        const topX = DESIGN_WIDTH - 14 - barW;
        const topY = 46;
        HUD.#drawSuperBar(ctx, topX, topY, barW, barH, barR,
            topPlayer.superCharge, topPlayer.superReady,
            topPlayer.data.superShot?.color ?? topPlayer.data.palette.accent,
            topPlayer.data.superShot?.name ?? 'SUPER');

        // --- BOTTOM PLAYER super bar (right side of bottom HUD) ---
        const botX = DESIGN_WIDTH - 14 - barW;
        const botY = ARENA_BOTTOM + 46;
        HUD.#drawSuperBar(ctx, botX, botY, barW, barH, barR,
            bottomPlayer.superCharge, bottomPlayer.superReady,
            bottomPlayer.data.superShot?.color ?? bottomPlayer.data.palette.accent,
            bottomPlayer.data.superShot?.name ?? 'SUPER');
    }

    static #drawSuperBar(ctx, x, y, w, h, r, charge, ready, color, label) {
        ctx.save();

        // Background track
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
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
        ctx.fill();

        // Fill
        const fillW = w * Math.min(1, charge / 100);
        if (fillW > 0) {
            ctx.fillStyle = ready ? color : color + '99';
            if (ready) {
                ctx.shadowColor = color;
                ctx.shadowBlur = 8;
            }
            ctx.beginPath();
            const fR = Math.min(r, fillW / 2);
            ctx.moveTo(x + fR, y);
            ctx.lineTo(x + fillW - fR, y);
            ctx.arcTo(x + fillW, y, x + fillW, y + fR, fR);
            ctx.lineTo(x + fillW, y + h - fR);
            ctx.arcTo(x + fillW, y + h, x + fillW - fR, y + h, fR);
            ctx.lineTo(x + fR, y + h);
            ctx.arcTo(x, y + h, x, y + h - fR, fR);
            ctx.lineTo(x, y + fR);
            ctx.arcTo(x, y, x + fR, y, fR);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Label
        ctx.fillStyle = ready ? '#ffffff' : '#8890aa';
        ctx.font = 'bold 7px ' + HUD.#FNT;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(ready ? '\u26A1 ' + label : 'SUPER', x, y - 5);

        if (ready) {
            // Pulsing "READY" flash
            const pulse = 0.5 + Math.sin(Date.now() / 200) * 0.5;
            ctx.globalAlpha = pulse;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + r, y - 1);
            ctx.lineTo(x + w - r, y - 1);
            ctx.arcTo(x + w + 1, y - 1, x + w + 1, y + r, r);
            ctx.lineTo(x + w + 1, y + h - r + 1);
            ctx.arcTo(x + w + 1, y + h + 1, x + w - r, y + h + 1, r);
            ctx.lineTo(x + r, y + h + 1);
            ctx.arcTo(x - 1, y + h + 1, x - 1, y + h - r, r);
            ctx.lineTo(x - 1, y + r);
            ctx.arcTo(x - 1, y - 1, x + r, y - 1, r);
            ctx.closePath();
            ctx.stroke();
        }

        ctx.restore();
    }

    static drawJoystickHint(ctx, input) {
        // If touch/joystick is active, draw floating joystick
        if (input && input.joystickVisible) {
            const bx = input.joystickBaseX;
            const by = input.joystickBaseY;
            const tx = input.joystickThumbX;
            const ty = input.joystickThumbY;

            // Base ring
            ctx.save();
            ctx.globalAlpha = 0.2;
            ctx.strokeStyle = '#8890cc';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(bx, by, 30, 0, Math.PI * 2);
            ctx.stroke();

            // Inner fill
            ctx.globalAlpha = 0.06;
            ctx.fillStyle = '#8890cc';
            ctx.beginPath();
            ctx.arc(bx, by, 30, 0, Math.PI * 2);
            ctx.fill();

            // Thumb
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#b0bfff';
            ctx.shadowColor = '#b0bfff';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(tx, ty, 10, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
            return;
        }

        // Static hint when not touching
        const cx = DESIGN_WIDTH / 2;
        const cy = ARENA_BOTTOM + (DESIGN_HEIGHT - ARENA_BOTTOM) / 2 + 16;

        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = '#6670a0';
        ctx.lineWidth = 1;

        const size = 12;
        ctx.beginPath();
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx, cy + size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - size, cy);
        ctx.lineTo(cx + size, cy);
        ctx.stroke();

        const tip = 4;
        ctx.beginPath();
        ctx.moveTo(cx - tip, cy - size + tip);
        ctx.lineTo(cx, cy - size);
        ctx.lineTo(cx + tip, cy - size + tip);
        ctx.stroke();

        ctx.restore();
    }
}
