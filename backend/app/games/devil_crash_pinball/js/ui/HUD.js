import { GameConfig as C } from '../config/GameConfig.js';

/**
 * Heads-up display drawn on top of the game canvas (in screen space).
 * Renders 8-digit score, multiplier, ball indicator, mission name+progress,
 * the attract-mode banner, and on-screen control hints (mobile-first).
 */
export class HUD {
    /** @param {CanvasRenderingContext2D} ctx */
    constructor(ctx) {
        this.ctx = ctx;
        this.flashScore = 0;
        /** Accumulates time (seconds) to drive the RESET button pulse animation. */
        this._rescuePulse = 0;
    }

    pulse() { this.flashScore = 0.6; }

    update(dt) {
        if (this.flashScore > 0) this.flashScore = Math.max(0, this.flashScore - dt);
        this._rescuePulse += dt;
    }

    /**
     * @param {{
     *   score:string, multiplier:number, ballsLeft:number,
     *   mission:object|null, ballSaveTimer:number, gameState:number,
     *   hintTimer:number, ballReady:boolean, muted:boolean,
     *   plungerCharge:number, launchHeld:boolean,
     * }} data
     * @param {number} viewW
     * @param {number} viewH
     */
    draw(data, viewW, viewH) {
        const ctx = this.ctx;
        ctx.save();

        this._drawTopBar(data, viewW);
        this._drawActionButtons(data);

        if (data.gameState === 0) this._drawAttract(viewW, viewH);
        else if (data.gameState === 3) this._drawGameOver(viewW, viewH, data.score, data.timePlayed, data.bossesDefeated);
        else if (data.ballReady) this._drawPlungerPrompt(data, viewW, viewH);

        ctx.restore();
    }

    _drawTopBar(data, viewW) {
        const ctx = this.ctx;
        const grad = ctx.createLinearGradient(0, 0, 0, 40);
        grad.addColorStop(0, 'rgba(20,5,35,0.85)');
        grad.addColorStop(1, 'rgba(20,5,35,0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, viewW, 40);

        // Score — left
        ctx.font = 'bold 22px monospace';
        ctx.fillStyle = this.flashScore > 0 ? C.COLOR_GOLD : C.COLOR_WHITE;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = C.COLOR_GOLD;
        ctx.shadowBlur = this.flashScore > 0 ? 12 : 4;
        ctx.fillText(data.score, 14, 18);
        ctx.shadowBlur = 0;

        // Right: level multiplier (x1 at main_table, xN at top section)
        ctx.textAlign = 'right';
        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = C.COLOR_GOLD;
        ctx.fillText(`MULT x${data.zoneMult ?? 1}`, viewW - 14, 12);

        ctx.font = '11px monospace';
        ctx.fillStyle = C.COLOR_WHITE;
        ctx.fillText(`◉ BALLS ${data.ballsLeft}`, viewW - 14, 28);
    }

    // ── Canvas action buttons (RESET / TILT) ─────────────────────────────────

    /**
     * Hit-test a canvas-space point against the action buttons.
     * @param {number} cx  Canvas x (0…VIEW_WIDTH)
     * @param {number} cy  Canvas y (0…VIEW_HEIGHT)
     * @returns {'rescue'|'tilt'|null}
     */
    static hitTest(cx, cy) {
        const { HUD_BTN_RESCUE_X: rx, HUD_BTN_TILT_X: tx,
                HUD_BTN_BGM_X: bgmx, HUD_BTN_SFX_X: sfxx, HUD_BTN_PAUSE_X: px,
                HUD_BTN_Y: by, HUD_BTN_W: bw, HUD_BTN_H: bh } = C;
        if (cx >= rx   && cx <= rx   + bw && cy >= by && cy <= by + bh) return 'rescue';
        if (cx >= tx   && cx <= tx   + bw && cy >= by && cy <= by + bh) return 'tilt';
        if (cx >= bgmx && cx <= bgmx + bw && cy >= by && cy <= by + bh) return 'bgm';
        if (cx >= sfxx && cx <= sfxx + bw && cy >= by && cy <= by + bh) return 'sfx';
        if (cx >= px   && cx <= px   + bw && cy >= by && cy <= by + bh) return 'pause';
        return null;
    }

    /**
     * Draw the RESET and TILT action buttons inside the top bar.
     * Only rendered during active play (gameState === 2 / PLAY).
     * RESET glows when the ball is detected as stuck; TILT is lit until penalty.
     * @param {{ gameState:number, isStuck:boolean, tilted:boolean }} data
     * @private
     */
    _drawActionButtons(data) {
        const { HUD_BTN_RESCUE_X: rx, HUD_BTN_TILT_X: tx,
                HUD_BTN_BGM_X: bgmx, HUD_BTN_SFX_X: sfxx, HUD_BTN_PAUSE_X: pausex,
                HUD_BTN_Y: by, HUD_BTN_W: bw, HUD_BTN_H: bh } = C;

        // RESET & TILT — only during active play
        if (data.gameState === 2) {
            const pulseFactor = data.isStuck
                ? 0.5 + 0.5 * Math.sin(this._rescuePulse * Math.PI * 2.8)
                : 0;
            this._drawHudButton({ x: rx, y: by, w: bw, h: bh, label: 'RESET', lit: !!data.isStuck, litColor: C.COLOR_PURPLE, pulse: pulseFactor });
            this._drawHudButton({ x: tx, y: by, w: bw, h: bh, label: 'TILT',  lit: !data.tilted,   litColor: '#ff6622',      pulse: 0 });
        }

        // BGM, SFX, PAUSE — always visible
        this._drawHudButton({ x: bgmx,  y: by, w: bw, h: bh, label: '\u266b BGM', lit: !data.bgmMuted,              litColor: '#00e5ff', pulse: 0 });
        this._drawHudButton({ x: sfxx,  y: by, w: bw, h: bh, label: 'SFX',        lit: !data.muted,                 litColor: '#aa44ff', pulse: 0 });
        const isPaused = data.gameState === 4;
        const pauseLit = data.gameState === 2 || isPaused;
        this._drawHudButton({ x: pausex, y: by, w: bw, h: bh,
            label:    isPaused ? '\u25b6 GO' : 'PAUSE',
            lit:      pauseLit,
            litColor: isPaused ? '#44ff88' : '#ffcc00',
            pulse:    0,
        });
    }

    /**
     * Render a single inline HUD button.
     * @param {number}  x        Left edge (canvas px)
     * @param {number}  y        Top edge (canvas px)
     * @param {number}  w        Width
     * @param {number}  h        Height
     * @param {string}  label    Button text
     * @param {boolean} lit      Whether the button is in its active/highlighted state
     * @param {string}  litColor CSS colour used when lit
     * @private
     */
    /**
     * @param {Object} options
     * @param {number} options.x
     * @param {number} options.y
     * @param {number} options.w
     * @param {number} options.h
     * @param {string} options.label
     * @param {boolean} options.lit
     * @param {string}  options.litColor
     * @param {number}  [options.pulse=0]  0..1 sine factor for animated glow (0 = static)
     * @private
     */
    /**
     * @param {number}  x
     * @param {number}  y
     * @param {number}  w
     * @param {number}  h
     * @param {string}  label
     * @param {boolean} lit
     * @param {string}  litColor
     * @param {number}  [pulse=0]  0..1 sine factor for animated glow (0 = static)
     * @private
     */
    _drawHudButton(options) {
        const { x, y, w, h, label, lit, litColor, pulse = 0 } = options;
        const ctx = this.ctx;
        ctx.save();
        // Background — brightens with pulse when active
        const bgAlpha = lit ? 0.72 + pulse * 0.18 : 0.72;
        ctx.fillStyle = `rgba(6, 1, 14, ${bgAlpha})`;
        ctx.fillRect(x, y, w, h);
        // Animated border: lineWidth and opacity oscillate
        const borderWidth = lit ? 1 + pulse * 1.5 : 1;
        ctx.strokeStyle = lit ? litColor : 'rgba(80, 50, 100, 0.35)';
        ctx.globalAlpha = lit ? 0.55 + pulse * 0.45 : 1;
        ctx.lineWidth   = borderWidth;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        ctx.globalAlpha = 1;
        // Glow shadow scales with pulse
        if (lit) {
            ctx.shadowColor = litColor;
            ctx.shadowBlur  = 7 + pulse * 14;
        }
        ctx.font         = 'bold 8px "Orbitron", monospace';
        ctx.fillStyle    = lit ? litColor : 'rgba(80, 50, 100, 0.45)';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + w / 2, y + h / 2);
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    _drawMissionBar(data, viewW, viewH) {        if (!data.mission) return;
        const ctx = this.ctx;
        const m   = data.mission;
        const barH = 18;
        const barY = viewH - barH;

        // Minimal translucent strip — doesn't cover gameplay
        ctx.fillStyle = 'rgba(10,2,22,0.55)';
        ctx.fillRect(0, barY, viewW, barH);

        // Mission name
        ctx.fillStyle = C.COLOR_WHITE;
        ctx.font = 'bold 9px "Orbitron", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`☠ ${m.title}`, 8, barY + barH / 2);

        // Progress bar (thin line at very bottom)
        const pgX = 8;
        const pgY = viewH - 3;
        const pgW = viewW - 16;
        ctx.fillStyle = '#0a0018';
        ctx.fillRect(pgX, pgY, pgW, 3);
        const pg = ctx.createLinearGradient(pgX, 0, pgX + pgW, 0);
        pg.addColorStop(0, C.COLOR_PURPLE);
        pg.addColorStop(1, C.COLOR_GOLD);
        ctx.fillStyle = pg;
        ctx.fillRect(pgX, pgY, pgW * m.ratio, 3);

        // Timer
        if (m.timer > 0) {
            ctx.textAlign = 'right';
            ctx.fillStyle = m.timer < 5 ? C.COLOR_RED : C.COLOR_GOLD;
            ctx.font = 'bold 9px "Orbitron", monospace';
            ctx.fillText(`${m.timer.toFixed(1)}s`, viewW - 8, barY + barH / 2);
        }
    }

    _drawBallSave(data, viewW) {
        if (data.ballSaveTimer <= 0) return;
        if (data.gameState !== 2) return; // only during PLAY
        const ctx = this.ctx;
        const blink = Math.floor(data.ballSaveTimer * 6) % 2 === 0;
        if (!blink) return;
        ctx.font = 'bold 13px "Orbitron", monospace';
        ctx.fillStyle = C.COLOR_GOLD;
        ctx.textAlign = 'center';
        ctx.shadowColor = C.COLOR_GOLD;
        ctx.shadowBlur = 14;
        ctx.fillText('★ BALL SAVE ★', viewW / 2, 56);
        ctx.shadowBlur = 0;
    }



    /**
     * Plunger overlay shown while the ball is on the launcher.
     * Highlights the launch zone, draws a vertical charge meter, and labels it
     * so the player knows to HOLD-and-release on the bottom-right corner
     * (or hold SPACE) to launch with proportional power.
     */
    _drawPlungerPrompt(data, viewW, viewH) {
        const ctx = this.ctx;
        ctx.save();

        // Charge meter: thin vertical bar flush with the right edge
        const meterW = 6;
        const meterH = viewH * 0.35;
        const meterX = viewW - meterW - 2;
        const meterY = viewH * 0.55;
        ctx.fillStyle = 'rgba(10,0,20,0.7)';
        ctx.fillRect(meterX, meterY, meterW, meterH);
        const fill = Math.max(0.02, data.plungerCharge);
        const grad = ctx.createLinearGradient(0, meterY + meterH, 0, meterY);
        grad.addColorStop(0, C.COLOR_PURPLE);
        grad.addColorStop(1, C.COLOR_GOLD);
        ctx.fillStyle = grad;
        ctx.fillRect(meterX, meterY + meterH * (1 - fill), meterW, meterH * fill);
        ctx.strokeStyle = data.launchHeld ? C.COLOR_GOLD : 'rgba(245,197,24,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(meterX, meterY, meterW, meterH);

        // Minimal label above the bar
        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = C.COLOR_GOLD;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.shadowColor = C.COLOR_GOLD;
        ctx.shadowBlur = 5;
        ctx.fillText('HOLD', meterX - 2, meterY - 2);
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    _drawAttract(w, h) {
        const ctx = this.ctx;

        // Full-screen dark panel
        ctx.fillStyle = '#04010c';
        ctx.fillRect(0, 0, w, h);

        // Side accent lines
        const lineGrad = ctx.createLinearGradient(0, 0, 0, h);
        lineGrad.addColorStop(0,   'rgba(255,26,26,0)');
        lineGrad.addColorStop(0.5, 'rgba(255,26,26,0.8)');
        lineGrad.addColorStop(1,   'rgba(255,26,26,0)');
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(8, h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w - 8, 0); ctx.lineTo(w - 8, h); ctx.stroke();

        // Title
        ctx.font = '900 30px "Orbitron", monospace';
        ctx.fillStyle = C.COLOR_RED;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = C.COLOR_RED;
        ctx.shadowBlur = 24;
        ctx.fillText('DEVIL CRASH', w / 2, h * 0.18);
        ctx.shadowBlur = 0;

        ctx.font = '700 22px "Orbitron", monospace';
        ctx.fillStyle = C.COLOR_GOLD;
        ctx.shadowColor = C.COLOR_GOLD;
        ctx.shadowBlur = 16;
        ctx.fillText('PINBALL', w / 2, h * 0.25);
        ctx.shadowBlur = 0;

        // Divider
        ctx.strokeStyle = C.COLOR_PURPLE;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.moveTo(w * 0.15, h * 0.35); ctx.lineTo(w * 0.85, h * 0.35); ctx.stroke();
        ctx.globalAlpha = 1;

        // Controls header
        ctx.font = 'bold 11px "Orbitron", monospace';
        ctx.fillStyle = C.COLOR_WHITE;
        ctx.fillText('CONTROLS', w / 2, h * 0.39);

        const colTouchX = w * 0.27;
        const colKbdX   = w * 0.73;
        const headY     = h * 0.44;
        ctx.font = 'bold 10px "Orbitron", monospace';
        ctx.fillStyle = C.COLOR_GOLD;
        ctx.fillText('TOUCH',    colTouchX, headY);
        ctx.fillText('KEYBOARD', colKbdX,   headY);

        ctx.font = '12px "Exo 2", monospace';
        ctx.fillStyle = '#cc88ff';
        const lh = 15;
        ctx.fillText('Tap LEFT half',     colTouchX, headY + lh);
        ctx.fillText('Tap RIGHT half',    colTouchX, headY + lh * 2);
        ctx.fillText('HOLD bottom-right', colTouchX, headY + lh * 3);
        ctx.fillText('corner = PLUNGER',  colTouchX, headY + lh * 4);

        ctx.fillText('←  =  LEFT FLIP',  colKbdX, headY + lh);
        ctx.fillText('→  =  RIGHT FLIP', colKbdX, headY + lh * 2);
        ctx.fillText('↓  =  PLUNGER',    colKbdX, headY + lh * 3);
        ctx.fillText('(hold to charge)', colKbdX, headY + lh * 4);

        ctx.fillStyle = C.COLOR_DIM;
        ctx.font = '10px "Exo 2", monospace';
        ctx.fillText('T = TILT (penalty after 3)', w / 2, h * 0.74);

        // Blink prompt
        const blink = Math.floor(performance.now() / 520) % 2 === 0;
        if (blink) {
            ctx.font = 'bold 15px "Orbitron", monospace';
            ctx.fillStyle = C.COLOR_GOLD;
            ctx.shadowColor = C.COLOR_GOLD;
            ctx.shadowBlur = 18;
            ctx.fillText('▶ TAP TO START ◀', w / 2, h * 0.82);
            ctx.shadowBlur = 0;
        }
    }

    _drawGameOver(w, h, score, timePlayed, bossesDefeated) {
        const ctx = this.ctx;

        // Full-screen dark panel
        ctx.fillStyle = '#04010c';
        ctx.fillRect(0, 0, w, h);

        // Side accent lines (gold)
        const lineGrad = ctx.createLinearGradient(0, 0, 0, h);
        lineGrad.addColorStop(0,   'rgba(245,197,24,0)');
        lineGrad.addColorStop(0.5, 'rgba(245,197,24,0.7)');
        lineGrad.addColorStop(1,   'rgba(245,197,24,0)');
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth   = 1;
        ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(8, h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w - 8, 0); ctx.lineTo(w - 8, h); ctx.stroke();

        // Title
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.font         = '900 30px "Orbitron", monospace';
        ctx.fillStyle    = C.COLOR_RED;
        ctx.shadowColor  = C.COLOR_RED;
        ctx.shadowBlur   = 28;
        ctx.fillText('GAME OVER', w / 2, h * 0.18);
        ctx.shadowBlur = 0;

        // Subtitle skull
        ctx.font      = '300 11px "Exo 2", monospace';
        ctx.fillStyle = C.COLOR_DIM;
        ctx.letterSpacing = '3px';
        ctx.fillText('── YOUR SOUL HAS BEEN CLAIMED ──', w / 2, h * 0.24);
        ctx.letterSpacing = '0px';

        // Divider
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = C.COLOR_RED;
        ctx.lineWidth   = 1;
        ctx.beginPath(); ctx.moveTo(w * 0.12, h * 0.28); ctx.lineTo(w * 0.88, h * 0.28); ctx.stroke();
        ctx.globalAlpha = 1;

        // Score label
        ctx.font      = 'bold 10px "Orbitron", monospace';
        ctx.fillStyle = C.COLOR_DIM;
        ctx.fillText('FINAL SCORE', w / 2, h * 0.34);

        // Score value
        ctx.font        = 'bold 26px "Orbitron", monospace';
        ctx.fillStyle   = C.COLOR_GOLD;
        ctx.shadowColor = C.COLOR_GOLD;
        ctx.shadowBlur  = 18;
        ctx.fillText(score, w / 2, h * 0.41);
        ctx.shadowBlur = 0;

        // Stats divider
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = C.COLOR_PURPLE;
        ctx.lineWidth   = 1;
        ctx.beginPath(); ctx.moveTo(w * 0.12, h * 0.47); ctx.lineTo(w * 0.88, h * 0.47); ctx.stroke();
        ctx.globalAlpha = 1;

        // Stats row
        ctx.font = '10px "Exo 2", monospace';
        const mins = Math.floor((timePlayed ?? 0) / 60);
        const secs = String((timePlayed ?? 0) % 60).padStart(2, '0');
        const timeStr    = `${mins}:${secs}`;
        const bossSuffix = bossesDefeated > 1 ? 'ES' : '';
        const bossStr    = bossesDefeated > 0 ? `${bossesDefeated} BOSS${bossSuffix} SLAIN` : 'NO BOSSES';

        const statLabelX = w * 0.28;
        const statValueX = w * 0.72;
        const statY      = h * 0.53;
        const statLH     = 22;

        ctx.fillStyle = C.COLOR_DIM;
        ctx.textAlign = 'left';
        ctx.fillText('TIME SURVIVED', statLabelX, statY);
        ctx.fillText('BOSSES',        statLabelX, statY + statLH);

        ctx.fillStyle = C.COLOR_WHITE;
        ctx.textAlign = 'right';
        ctx.fillText(timeStr,  statValueX, statY);
        ctx.fillStyle = bossesDefeated > 0 ? C.COLOR_GOLD : C.COLOR_DIM;
        ctx.fillText(bossStr, statValueX, statY + statLH);

        // Bottom divider
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = C.COLOR_PURPLE;
        ctx.lineWidth   = 1;
        ctx.beginPath(); ctx.moveTo(w * 0.12, h * 0.66); ctx.lineTo(w * 0.88, h * 0.66); ctx.stroke();
        ctx.globalAlpha = 1;

        // Blink prompt
        const blink = Math.floor(performance.now() / 520) % 2 === 0;
        if (blink) {
            ctx.font        = 'bold 14px "Orbitron", monospace';
            ctx.fillStyle   = C.COLOR_GOLD;
            ctx.textAlign   = 'center';
            ctx.shadowColor = C.COLOR_GOLD;
            ctx.shadowBlur  = 18;
            ctx.fillText('▶ TAP TO PLAY AGAIN ◀', w / 2, h * 0.74);
            ctx.shadowBlur = 0;
        }
    }
}