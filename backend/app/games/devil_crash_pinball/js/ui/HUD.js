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

        // Mobile control bar — only meaningful while a ball is in flight or
        // sitting on the launcher. Hidden during ATTRACT / GAME_OVER / PAUSED
        // so menus own the full canvas. Also hidden entirely on non-touch
        // devices (CTRL_BAR_HEIGHT collapses to 0 → keyboard owns input).
        const playing = data.gameState === 2 || data.ballReady;
        if (playing && C.CTRL_BAR_HEIGHT > 0) this._drawControlBar(data);

        if (data.gameState === 0) this._drawAttract(viewW, viewH);
        else if (data.gameState === 3) this._drawGameOver(viewW, viewH, data);
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
     * Hit-test a canvas-space point against EVERY HUD-owned button.
     *
     * Top-bar buttons are momentary (TAP semantics). Control-bar buttons
     * (`flipL`, `flipR`, `launch`) are held — InputManager maps them to
     * gameplay zones and tracks them across pointermove. Game-over buttons
     * (`replay`, `home`) are only active while the GAME_OVER panel is shown.
     *
     * @param {number} cx          Canvas x (0…VIEW_WIDTH)
     * @param {number} cy          Canvas y (0…VIEW_HEIGHT + CTRL_BAR_HEIGHT)
     * @param {boolean | {ballReady:boolean, gameState?:number, canExitToShell?:boolean}} opts
     *        Either a legacy boolean (true = ball-ready) or an options object.
     * @returns {'rescue'|'tilt'|'bgm'|'sfx'|'pause'|'perf'|'flipL'|'flipR'|'launch'|'replay'|'home'|null}
     */
    static hitTest(cx, cy, opts = false) {
        const o = (typeof opts === 'object' && opts !== null) ? opts : { ballReady: opts };
        const ballReady = Boolean(o.ballReady);
        const gameState = o.gameState ?? -1;
        const canExit   = o.canExitToShell !== false;

        // Game-over choice buttons take priority over everything else: they're
        // the only legal interaction while the panel is on screen.
        if (gameState === 3) {
            const goHit = HUD._findHit(cx, cy, HUD._gameOverButtons(canExit));
            if (goHit) return goHit;
        }
        const topHit = HUD._findHit(cx, cy, HUD._topBarButtons());
        if (topHit) return topHit;
        if (C.CTRL_BAR_HEIGHT > 0 && cy >= C.VIEW_HEIGHT) {
            return HUD._findHit(cx, cy, HUD._ctrlButtons(ballReady));
        }
        return null;
    }

    /** @private */
    static _findHit(cx, cy, rects) {
        for (const id of Object.keys(rects)) {
            if (HUD._inRect(cx, cy, rects[id])) return id;
        }
        return null;
    }

    /** @private */
    static _inRect(cx, cy, r) {
        return cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h;
    }

    /**
     * Layout of the top-bar action buttons. Single source of truth shared by
     * `hitTest` and (indirectly) `_drawActionButtons` via the same `C.HUD_*`
     * constants.
     * @private
     */
    static _topBarButtons() {
        const w = C.HUD_BTN_W;
        const h = C.HUD_BTN_H;
        const y = C.HUD_BTN_Y;
        return {
            rescue: { x: C.HUD_BTN_RESCUE_X, y, w, h },
            tilt:   { x: C.HUD_BTN_TILT_X,   y, w, h },
            bgm:    { x: C.HUD_BTN_BGM_X,    y, w, h },
            sfx:    { x: C.HUD_BTN_SFX_X,    y, w, h },
            pause:  { x: C.HUD_BTN_PAUSE_X,  y, w, h },
            perf:   { x: C.HUD_BTN_PERF_X,   y, w, h },
        };
    }

    /**
     * Layout of the Game-Over choice buttons. Centered horizontally on the
     * canvas. When `canExit` is false (editor test mode) only REPLAY is shown,
     * centered on its own.
     * @param {boolean} canExit
     * @returns {{replay:object, home?:object}}
     * @private
     */
    static _gameOverButtons(canExit) {
        const w   = C.GAMEOVER_BTN_W;
        const h   = C.GAMEOVER_BTN_H;
        const y   = C.GAMEOVER_BTN_Y;
        const gap = C.GAMEOVER_BTN_GAP;
        if (!canExit) {
            return { replay: { x: (C.VIEW_WIDTH - w) / 2, y, w, h } };
        }
        const total   = w * 2 + gap;
        const startX  = (C.VIEW_WIDTH - total) / 2;
        return {
            replay: { x: startX,             y, w, h },
            home:   { x: startX + w + gap,   y, w, h },
        };
    }

    /**
     * Layout of the bottom control bar. Single source of truth used by both
     * the renderer (`_drawControlBar`) and the hit-test (`hitTest`).
     * @param {boolean} ballReady
     * @returns {{flipL?:object, flipR?:object, launch?:object}}
     * @private
     */
    static _ctrlButtons(ballReady) {
        const pad = C.CTRL_BTN_PAD;
        const gap = C.CTRL_BTN_GAP;
        const y   = C.VIEW_HEIGHT + pad;
        const h   = C.CTRL_BAR_HEIGHT - pad * 2;
        if (ballReady) {
            return { launch: { x: pad, y, w: C.VIEW_WIDTH - pad * 2, h } };
        }
        const halfW = (C.VIEW_WIDTH - pad * 2 - gap) / 2;
        return {
            flipL: { x: pad,                 y, w: halfW, h },
            flipR: { x: pad + halfW + gap,   y, w: halfW, h },
        };
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
                HUD_BTN_PERF_X: perfx,
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
        // PERF: green when LOW-perf (basse performance), red when HIGH-perf (alte performance).
        this._drawHudButton({ x: perfx, y: by, w: bw, h: bh,
            label:    data.lowPerf ? 'PERF\u2191' : 'PERF\u2193',
            lit:      true,
            litColor: data.lowPerf ? '#88ff44' : '#ff4444',
            pulse:    0,
        });
    }

    /**
     * Render the bottom mobile control bar (canvas band below the playfield).
     *
     * Two layouts, decided by `ballReady`:
     *  - playing → LEFT and RIGHT flipper buttons (lit while pressed).
     *  - ball on launcher → single LAUNCH button with embedded charge fill.
     *
     * The bar is drawn on top of the canvas band the Renderer never touches
     * (Renderer is clipped to the playfield rect).
     *
     * @param {{ ballReady:boolean, plungerCharge:number, launchHeld:boolean,
     *           flipL?:boolean, flipR?:boolean, tilted:boolean }} data
     * @private
     */
    _drawControlBar(data) {
        const ctx = this.ctx;
        const W   = C.VIEW_WIDTH;
        const top = C.VIEW_HEIGHT;
        const H   = C.CTRL_BAR_HEIGHT;

        // Bar background — opaque, slight gradient, accent line above
        ctx.save();
        const g = ctx.createLinearGradient(0, top, 0, top + H);
        g.addColorStop(0, '#0a0418');
        g.addColorStop(1, '#04020a');
        ctx.fillStyle = g;
        ctx.fillRect(0, top, W, H);
        ctx.strokeStyle = 'rgba(136, 34, 238, 0.55)';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(0, top + 0.5);
        ctx.lineTo(W, top + 0.5);
        ctx.stroke();
        ctx.restore();

        const btns = HUD._ctrlButtons(data.ballReady);
        if (data.ballReady) {
            this._drawLaunchButton(btns.launch, data);
        } else {
            this._drawFlipperButton(btns.flipL, '◀',  'LEFT',  data.flipL && !data.tilted, C.COLOR_RED);
            this._drawFlipperButton(btns.flipR, '▶',  'RIGHT', data.flipR && !data.tilted, '#3a8cff');
        }
    }

    /**
     * Big chunky flipper button. Lit + pulsing while the user holds it.
     * @private
     */
    _drawFlipperButton(rect, glyph, label, lit, color) {
        const ctx = this.ctx;
        const { x, y, w, h } = rect;
        ctx.save();

        // Body
        const bg = ctx.createLinearGradient(0, y, 0, y + h);
        bg.addColorStop(0, lit ? 'rgba(60,18,80,0.95)'  : 'rgba(20,8,38,0.95)');
        bg.addColorStop(1, lit ? 'rgba(28, 8,40,0.95)'  : 'rgba(10,4,20,0.95)');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 18);
        ctx.fill();

        // Border + glow
        ctx.shadowColor = color;
        ctx.shadowBlur  = lit ? 22 : 6;
        ctx.strokeStyle = color;
        ctx.globalAlpha = lit ? 1 : 0.55;
        ctx.lineWidth   = lit ? 3 : 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.shadowBlur  = 0;

        // Glyph (chevron)
        ctx.fillStyle    = lit ? '#fff' : color;
        ctx.font         = 'bold 56px "Orbitron", monospace';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor  = color;
        ctx.shadowBlur   = lit ? 18 : 0;
        ctx.fillText(glyph, x + w / 2, y + h / 2 - 6);
        ctx.shadowBlur   = 0;

        // Label
        ctx.fillStyle = lit ? color : 'rgba(180,140,200,0.55)';
        ctx.font      = 'bold 11px "Orbitron", monospace';
        ctx.fillText(label, x + w / 2, y + h - 14);

        ctx.restore();
    }

    /**
     * Big LAUNCH button — visible only while the ball sits on the launcher.
     * Background fills bottom-up with the current plunger charge fraction.
     * @private
     */
    _drawLaunchButton(rect, data) {
        const ctx = this.ctx;
        const { x, y, w, h } = rect;
        const charge = Math.max(0, Math.min(1, data.plungerCharge ?? 0));
        const held   = !!data.launchHeld;

        ctx.save();

        // Body
        ctx.fillStyle = 'rgba(14, 6, 28, 0.95)';
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 18);
        ctx.fill();

        // Charge fill — bottom-up gradient (purple → gold), clipped to button
        ctx.save();
        ctx.clip();
        const fillH = Math.max(2, h * charge);
        const fg = ctx.createLinearGradient(0, y + h - fillH, 0, y + h);
        fg.addColorStop(0, C.COLOR_GOLD);
        fg.addColorStop(1, C.COLOR_PURPLE);
        ctx.fillStyle   = fg;
        ctx.globalAlpha = held ? 0.85 : 0.55;
        ctx.fillRect(x, y + h - fillH, w, fillH);
        ctx.restore();

        // Border + glow
        const glow = held ? C.COLOR_GOLD : C.COLOR_PURPLE;
        ctx.shadowColor = glow;
        ctx.shadowBlur  = held ? 28 : 10;
        ctx.strokeStyle = glow;
        ctx.lineWidth   = held ? 3 : 2;
        ctx.stroke();
        ctx.shadowBlur  = 0;

        // Glyph + label
        ctx.fillStyle    = '#fff';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.font         = 'bold 38px "Orbitron", monospace';
        ctx.shadowColor  = glow;
        ctx.shadowBlur   = 16;
        ctx.fillText('▲', x + w / 2, y + h / 2 - 14);
        ctx.shadowBlur   = 0;

        ctx.font      = 'bold 16px "Orbitron", monospace';
        ctx.fillStyle = held ? C.COLOR_GOLD : '#fff';
        ctx.fillText(held ? 'RELEASE TO LAUNCH' : 'HOLD TO CHARGE', x + w / 2, y + h - 22);

        ctx.restore();
    }


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

    _drawGameOver(w, h, data) {
        const ctx = this.ctx;
        const score          = data.score;
        const timePlayed     = data.timePlayed;
        const bossesDefeated = data.bossesDefeated;
        const canExit        = data.canExitToShell !== false;

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

        // Choice buttons (REPLAY + MAIN MENU). Standalone editor-test plays
        // skip MAIN MENU because the editor host owns navigation.
        this._drawGameOverButtons(canExit);
    }

    /**
     * Render REPLAY (and optionally MAIN MENU) using the same rect layout that
     * `hitTest` consumes. Pure presentation \u2014 logic lives in {@link Game}.
     * @private
     */
    _drawGameOverButtons(canExit) {
        const ctx  = this.ctx;
        const btns = HUD._gameOverButtons(canExit);
        const blink = Math.floor(performance.now() / 520) % 2 === 0;

        const draw = (rect, label, accent, glow) => {
            // Background
            ctx.fillStyle = 'rgba(8,4,18,0.92)';
            ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
            // Border
            ctx.strokeStyle = accent;
            ctx.lineWidth   = 2;
            ctx.shadowColor = accent;
            ctx.shadowBlur  = glow ? 18 : 6;
            ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
            ctx.shadowBlur = 0;
            // Label
            ctx.font         = 'bold 14px "Orbitron", monospace';
            ctx.fillStyle    = accent;
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
        };

        draw(btns.replay, '\u25B6 REPLAY', C.COLOR_GOLD, blink);
        if (btns.home) draw(btns.home, 'MAIN MENU', C.COLOR_PURPLE, false);
    }
}