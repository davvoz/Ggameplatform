/**
 * Central composition root. Wires data, audio, input, platform, systems,
 * renderers, and FSM. Owns the game loop.
 */
import { GameConfig } from '../config/GameConfig.js';
import { StateMachine } from './StateMachine.js';
import { RunContext } from './RunContext.js';
import { DataRegistry } from '../data/DataRegistry.js';
import { InputManager } from '../input/InputManager.js';
import { PlatformBridge } from '../platform/PlatformBridge.js';
import { SoundManager } from '../audio/SoundManager.js';

import { ReelEngine } from '../systems/ReelEngine.js';
import { PaylineEvaluator } from '../systems/PaylineEvaluator.js';
import { WinCalculator } from '../systems/WinCalculator.js';
import { WildHandler } from '../systems/WildHandler.js';
import { ScatterHandler } from '../systems/ScatterHandler.js';
import { ComboTracker } from '../systems/ComboTracker.js';
import { BonusManager } from '../systems/BonusManager.js';
import { PowerUpManager } from '../systems/PowerUpManager.js';

import { SymbolRenderer } from '../rendering/SymbolRenderer.js';
import { ReelRenderer } from '../rendering/ReelRenderer.js';
import { PaylineRenderer } from '../rendering/PaylineRenderer.js';
import { BackgroundRenderer } from '../rendering/BackgroundRenderer.js';
import { CabinetRenderer } from '../rendering/CabinetRenderer.js';
import { MarqueeRenderer } from '../rendering/MarqueeRenderer.js';
import { HUDRenderer } from '../rendering/HUDRenderer.js';
import { VFXManager } from '../rendering/VFXManager.js';
import { PaytableOverlay } from '../rendering/PaytableOverlay.js';

import { LoadingState } from '../states/LoadingState.js';
import { IdleState } from '../states/IdleState.js';
import { SoundEvent } from '../audio/SoundEvent.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.data = new DataRegistry();
        this.input = new InputManager(canvas);
        this.platform = new PlatformBridge();
        this.runCtx = new RunContext();
        this.fsm = new StateMachine();
        this._lastT = 0;
        this._running = false;
        this._paused = false;
    }

    async init() {
        await this.data.load();
        this.sound = new SoundManager(this.data.sounds);
        this._initSystems();
        this._initRenderers();
        this._initXPBanner();
        this._initSession();
        await this.platform.init();
        this._wirePlatformEvents();
        this._wireSoundResume();
        this.fsm.set(new LoadingState(this));
        await this._loadPlatformBalance();
        this.fsm.set(new IdleState(this));
    }

    _initSystems() {
        this.reelEngine       = new ReelEngine(this.data);
        this.paylineEvaluator = new PaylineEvaluator(this.data);
        this.winCalculator    = new WinCalculator();
        this.wildHandler      = new WildHandler(this.data);
        this.scatterHandler   = new ScatterHandler(this.data);
        this.comboTracker     = new ComboTracker(this.data);
        this.bonusManager     = new BonusManager(this.data);
        this.powerUpManager   = new PowerUpManager();
    }

    _initRenderers() {
        const L = GameConfig.LAYOUT;
        this.background    = new BackgroundRenderer();
        this.cabinet       = new CabinetRenderer();
        this.marquee       = new MarqueeRenderer();
        this.symbolRenderer = new SymbolRenderer(this.data);
        this.paylineRenderer = new PaylineRenderer();
        this.hud           = new HUDRenderer(this.data);
        this.vfx           = new VFXManager();
        this.paytableOverlay = new PaytableOverlay(this.data, this.symbolRenderer);
        this._hudOpts      = { canSpin: false, powerUpManager: null };
        this.reelRenderers = [];
        const cfg = this.data.config.reels;
        for (let i = 0; i < cfg.count; i++) {
            const strip = this.reelEngine.getStrip(i);
            const x = L.REEL_AREA_X + i * (L.CELL_W + L.CELL_GAP_X);
            this.reelRenderers.push(new ReelRenderer({
                reelIndex: i,
                symbolRenderer: this.symbolRenderer,
                strip: strip,
                x: x,
                y: L.REEL_AREA_Y,
                w: L.CELL_W,
                h: L.REEL_AREA_H,
                cellH: L.CELL_H,
                reelCfg: cfg
            }));
        }
    }

    _initSession() {
        const session = this.data.config.session;
        this.runCtx.reset();
        this.runCtx.balance = session.startingBalance;
        this.runCtx.betTierIndex = this.data.bets.defaultTierIndex;
        this.runCtx.jackpotPool = this.data.config.jackpotTicker.seed;
        this.runCtx.jackpotTarget = this.runCtx.jackpotPool;
    }

    async _loadPlatformBalance() {
        if (!this.platform.isAvailable()) return;
        const balance = await this.platform.getUserBalance();
        if (typeof balance === 'number' && balance >= 0) {
            this.runCtx.balance = balance;
        }
    }

    _wirePlatformEvents() {
        this.platform.on('pause',  () => this.pause());
        this.platform.on('resume', () => this.resume());
        this.platform.on('exit',   () => this.finalize());

        // XP Banner event — SDK validates origin before triggering
        this.platform.on('showXPBanner', (payload) => {
            try {
                if (!payload) return;
                const xp = Number(payload.xp_earned);
                if (!Number.isFinite(xp) || xp <= 0) return;
                this._showXPBanner(xp);
            } catch (err) {
                console.error('[slot_machine] Error handling showXPBanner:', err);
            }
        });

        // Level Up Modal event — SDK validates origin before triggering
        this.platform.on('showLevelUpModal', (payload) => {
            try {
                if (!payload) return;
                const sanitized = {
                    old_level:     Number.isFinite(Number(payload.old_level))     ? Number(payload.old_level)     : null,
                    new_level:     Number.isFinite(Number(payload.new_level))     ? Number(payload.new_level)     : null,
                    title:         String(payload.title   || ''),
                    badge:         String(payload.badge   || ''),
                    coins_awarded: Number.isFinite(Number(payload.coins_awarded)) ? Number(payload.coins_awarded) : 0,
                    is_milestone:  Boolean(payload.is_milestone),
                    user_data:     payload.user_data && typeof payload.user_data === 'object'
                                       ? { is_anonymous: Boolean(payload.user_data.is_anonymous) }
                                       : {}
                };
                this._showLevelUpModal(sanitized);
            } catch (err) {
                console.error('[slot_machine] Error handling showLevelUpModal:', err);
            }
        });
    }

    /**
     * Initialises the XP overlay as pure JS state.
     * Rendering happens entirely on the game canvas — no DOM elements,
     * no CSS animations, no compositor-layer conflicts with WinState.
     */
    _initXPBanner() {
        this._xpOverlay = { phase: 'hidden', t: 0, xpText: '' };
    }

    _showXPBanner(xpAmount) {
        this._xpOverlay.xpText = `+${Number(xpAmount).toFixed(2)} XP`;
        this._xpOverlay.phase  = 'in';
        this._xpOverlay.t      = 0;
    }

    /** Called every frame from _update(). Manages phase transitions by elapsed time. */
    _updateXPOverlay(dt) {
        const ov = this._xpOverlay;
        if (ov.phase === 'hidden') return;
        ov.t += dt;
        const SLIDE_IN  = 0.5;
        const HOLD      = 3;
        const SLIDE_OUT = 0.6;
        if      (ov.phase === 'in'   && ov.t >= SLIDE_IN)  { ov.phase = 'hold';   ov.t = 0; }
        else if (ov.phase === 'hold' && ov.t >= HOLD)      { ov.phase = 'out';    ov.t = 0; }
        else if (ov.phase === 'out'  && ov.t >= SLIDE_OUT) { ov.phase = 'hidden'; }
    }

    /** Draws the XP badge on top of the canvas. Fully isolated from the DOM. */
    _renderXPOverlay(ctx) {
        const ov = this._xpOverlay;
        if (ov.phase === 'hidden') return;

        const SLIDE_IN  = 0.5;
        const SLIDE_OUT = 0.6;
        const BW = 178, BH = 50, BY = 15, RADIUS = 12;
        const destX = GameConfig.VIEW_WIDTH - BW - 10;
        const srcX  = GameConfig.VIEW_WIDTH + 4;   // just off the right edge

        // Ease-out cubic for slide-in, linear for slide-out
        let slideP;
        if (ov.phase === 'in') {
            const p = Math.min(1, ov.t / SLIDE_IN);
            slideP = 1 - Math.pow(1 - p, 3);
        } else if (ov.phase === 'hold') {
            slideP = 1;
        } else {
            slideP = Math.max(0, 1 - ov.t / SLIDE_OUT);
        }

        const bx    = srcX + (destX - srcX) * slideP;
        const inAlpha = ov.phase === 'in' ? ov.t / 0.25 : 1;
        const alpha = ov.phase === 'out'
            ? Math.max(0, 1 - ov.t / SLIDE_OUT)
            : Math.min(1, inAlpha);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = 'rgba(255,215,0,0.55)';
        ctx.shadowBlur  = 18;
        if (GameConfig.IS_MOBILE) {
            ctx.fillStyle = '#ffd700';
        } else {
            const grad = ctx.createLinearGradient(bx, BY, bx, BY + BH);
            grad.addColorStop(0, '#ffd700');
            grad.addColorStop(1, '#e6c200');
            ctx.fillStyle = grad;
        }
        ctx.beginPath();
        ctx.roundRect(bx, BY, BW, BH, RADIUS);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.font = 'bold 17px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#1a1a1a';
        ctx.fillText(`⭐  ${ov.xpText}`, bx + BW / 2, BY + BH / 2);
        ctx.restore();
    }

    _showLevelUpModal(data) {
        const { old_level, new_level, title = '', badge = '', coins_awarded = 0, is_milestone = false, user_data = {} } = data;
        const isAnonymous = user_data?.is_anonymous === true;

        const modal = document.createElement('div');
        modal.className = 'level-up-modal';
        modal.innerHTML = `
            <div class="level-up-content ${is_milestone ? 'milestone' : ''}">
                <div class="level-up-animation">
                    <div class="level-up-rays"></div>
                    <div class="level-up-badge-container">
                        <span class="level-up-badge"></span>
                    </div>
                </div>
                <h2 class="level-up-title">🎉 LEVEL UP! 🎉</h2>
                <div class="level-up-levels">
                    <span class="old-level"></span>
                    <span class="level-arrow">→</span>
                    <span class="new-level"></span>
                </div>
                <div class="level-up-new-title"></div>
                ${is_milestone ? '<div class="level-up-milestone-badge">✨ MILESTONE ✨</div>' : ''}
                ${!isAnonymous && coins_awarded > 0 ? '<div class="level-up-reward"><span class="reward-icon">🪙</span><span class="reward-amount"></span></div>' : ''}
                <button class="level-up-close">Continue</button>
            </div>
        `;
        modal.querySelector('.level-up-badge').textContent    = badge || '🏅';
        modal.querySelector('.old-level').textContent         = old_level ?? '-';
        modal.querySelector('.new-level').textContent         = new_level ?? '-';
        modal.querySelector('.level-up-new-title').textContent = title;
        const rewardAmount = modal.querySelector('.reward-amount');
        if (rewardAmount) rewardAmount.textContent = `+${coins_awarded} Coins`;

        if (!document.querySelector('#level-up-styles')) {
            const link = document.createElement('link');
            link.id = 'level-up-styles';
            link.rel = 'stylesheet';
            link.href = '/css/level-widget.css';
            document.head.appendChild(link);
        }
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
        modal.querySelector('.level-up-close').addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => { if (modal.parentElement) modal.remove(); }, 400);
        });
    }

    _wireSoundResume() {
        const resume = () => this.sound.resume();
        globalThis.addEventListener('pointerdown', resume, { once: true });
        globalThis.addEventListener('keydown', resume, { once: true });
    }

    start() {
        this._running = true;
        this._lastT = performance.now();
        requestAnimationFrame((t) => this._loop(t));
    }

    pause()  { this._paused = true; this.sound.suspend(); }
    resume() { this._paused = false; this.sound.resume(); this._lastT = performance.now(); }

    _loop(t) {
        if (!this._running) return;
        const dt = Math.min((t - this._lastT) / 1000, GameConfig.TIMINGS.FRAME_DT_CLAMP);
        this._lastT = t;
        if (!this._paused) {
            this._update(dt);
            this._render();
        }
        requestAnimationFrame((tt) => this._loop(tt));
    }

    _update(dt) {
        // Drain input → overlay (if open) or FSM, with global hotkey + button intercept
        const events = this.input.drain();
        for (const ev of events) this._routeInput(ev);

        // Tick world
        this.background.update(dt);
        this.cabinet.update(dt);
        this.marquee.update(dt);
        this.hud.update(dt);
        for (const r of this.reelRenderers) r.update(dt);
        this.paylineRenderer.update(dt);
        this.vfx.update(dt);
        this.paytableOverlay.update(dt);
        this._lerpJackpotDisplay(dt);

        this.fsm.update(dt);
        this._updateXPOverlay(dt);
    }

    /** Paytable overlay has priority: it can intercept any input. */
    _routeInput(ev) {
        if (this.paytableOverlay.isOpen()) {
            this.paytableOverlay.handleInput(ev);
            return;
        }
        if (ev.type === 'pointerdown') {
            const id = this.hud.hitTest(ev.x, ev.y);
            if (id === 'paytable') {
                this.paytableOverlay.open();
                this.sound.play(SoundEvent.UI_CLICK);
                return;
            }
        } else if (ev.type === 'keydown' && (ev.code === 'KeyI' || ev.key === '?')) {
            this.paytableOverlay.open();
            this.sound.play(SoundEvent.UI_CLICK);
            return;
        }
        this.fsm.handleInput(ev);
    }

    _lerpJackpotDisplay(dt) {
        const k = this.data.config.jackpotTicker.lerpFactor;
        const diff = this.runCtx.jackpotPool - this.runCtx.jackpotTarget;
        if (Math.abs(diff) > 0.01) {
            this.runCtx.jackpotTarget += diff * Math.min(1, k * dt * 60);
        }
    }

    _render() {
        this.fsm.render(this.ctx);
        this._renderXPOverlay(this.ctx);
    }

    /** Composes the world. Called by states. */
    renderWorld(ctx, opts) {
        this.background.render(ctx);
        this.cabinet.render(ctx, this.runCtx);
        this.marquee.render(ctx, this.runCtx);
        for (const r of this.reelRenderers) r.render(ctx);
        this._renderLockOverlay(ctx);
        this.paylineRenderer.render(ctx);
        this._hudOpts.canSpin = opts.canSpin;
        this._hudOpts.powerUpManager = this.powerUpManager;
        this.hud.render(ctx, this.runCtx, this._hudOpts);
        this.vfx.render(ctx);
        this.paytableOverlay.render(ctx);
    }

    /** Cyan border + lock badge on reels the player has frozen. */
    _renderLockOverlay(ctx) {
        const lockPU = this.powerUpManager.getActive('reel_lock');
        if (!lockPU) return;
        const indices = lockPU.lockedIndices();
        if (indices.length === 0) return;
        const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 220);
        ctx.save();
        ctx.strokeStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 14 * pulse;
        ctx.lineWidth = 3;
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        for (const i of indices) {
            const r = this.reelRenderers[i];
            ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
            ctx.fillStyle = '#00ffff';
            ctx.fillText('🔒', r.x + r.w - 6, r.y + 6);
        }
        ctx.restore();
    }

    /** Sends gameOver if balance dropped below the minimum spin. */
    checkGameOverOnBroke() {
        const session = this.data.config.session;
        if (this.runCtx.balance < session.minBalanceForSpin && !this.platform.gameOverSent) {
            this.runCtx.autoplayRemaining = 0;
            this.finalize();
        }
    }

    /** Final score submission. Idempotent. */
    finalize() {
        if (this.platform.gameOverSent) return;
        this.platform.gameOver(this.runCtx.totalWon, {
            spins: this.runCtx.spinsPlayed,
            balance: this.runCtx.balance,
            biggestWin: Math.max(0, ...this.runCtx.lastWins)
        });
    }
}
