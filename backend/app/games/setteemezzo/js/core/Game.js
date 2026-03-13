import { Renderer } from './Renderer.js';
import { GameLoop } from './GameLoop.js';
import { TweenManager } from '../graphics/Tween.js';
import { ParticleSystem } from '../graphics/ParticleSystem.js';
import { Deck } from '../model/Deck.js';
import { Hand } from '../model/Hand.js';
import { CardView } from '../entities/CardView.js';
import { TableRenderer } from '../entities/TableRenderer.js';
import { Croupier } from '../entities/Croupier.js';
import { HUD } from '../ui/HUD.js';
import { UIManager } from '../ui/UIManager.js';
import { StateMachine } from '../states/StateMachine.js';
import { BettingState } from '../states/BettingState.js';
import { DealingState } from '../states/DealingState.js';
import { PlayingState } from '../states/PlayingState.js';
import { PlatformSDKAdapter } from '../platform/PlatformSDKAdapter.js';
import { HitState } from '../states/HitState.js';
import { DealerTurnState } from '../states/DealerTurnState.js';
import { ResultState } from '../states/ResultState.js';

/**
 * Main game controller for Sette e Mezzo.
 * Orchestrates rendering, game loop, state machine, and entities.
 */
export class Game {
    #renderer;
    #loop;
    #tweens = new TweenManager();
    #particles = new ParticleSystem();
    #deck = new Deck();
    #playerHand = new Hand();
    #dealerHand = new Hand();
    #playerCards = [];  // CardView[]
    #dealerCards = [];  // CardView[]
    #table;
    #croupier;
    #hud;
    #ui;
    #fsm = new StateMachine();
    #chips = 500;
    #bet = 10;
    #platform = new PlatformSDKAdapter();
    #usePlatformCoins = false;
    #roundsPlayed = 0;
    #score = 0;

    constructor(canvasId) {
        const canvas = document.getElementById(canvasId);
        this.#renderer = new Renderer(canvas, 400, 700);
        this.#table = new TableRenderer(400, 800);
        this.#hud = new HUD(400, 700);
        this.#ui = new UIManager(canvas, this.#renderer);

        this.#croupier = new Croupier({
            idlePath: 'assets/croupier_idle.png',
            dealPath: 'assets/croupier_deal.jpg',
            sadPath: 'assets/croupier_sad.png',
            happyPath: 'assets/croupier_happy.png',
            idleGrid: { cols: 5, rows: 3, frameCount: 15 },
            dealGrid: { cols: 5, rows: 6, frameCount: 30 },
            sadGrid: { cols: 5, rows: 5, frameCount: 25 },
            happyGrid: { cols: 5, rows: 3, frameCount: 15 },
            width: 400,
            height: 700,
        });

        this.#setupStateMachine();
        this.#setupUI();

        this.#loop = new GameLoop((dt) => this.#tick(dt));

        window.addEventListener('resize', () => this.#renderer.resize());

        // Listen for platform XP / level-up messages
        window.addEventListener('message', (e) => {
            try {
                if (!e.data?.type) return;
                if (e.data.type === 'showXPBanner' && e.data.payload) {
                    Game.#showXPBanner(e.data.payload.xp_earned, e.data.payload);
                }
                if (e.data.type === 'showLevelUpModal' && e.data.payload) {
                    Game.#showLevelUpModal(e.data.payload);
                }
            } catch (_) {}
        });
    }

    // --- Public API for states ---
    get renderer() { return this.#renderer; }
    get fsm() { return this.#fsm; }
    get ui() { return this.#ui; }
    get deck() { return this.#deck; }
    get playerHand() { return this.#playerHand; }
    get dealerHand() { return this.#dealerHand; }
    get croupier() { return this.#croupier; }
    get particles() { return this.#particles; }
    get currentBet() { return this.#bet; }
    get chips() { return this.#chips; }
    get tweensActive() { return this.#tweens.active > 0; }
    get platform() { return this.#platform; }
    get usePlatformCoins() { return this.#usePlatformCoins; }
    get roundsPlayed() { return this.#roundsPlayed; }
    get score() { return this.#score; }

    addChips(amount) {
        this.#chips = Math.max(0, this.#chips + amount);
    }

    async start() {
        await CardView.ready();
        await this.#initPlatform();
        this.#loop.start();
        this.#fsm.transition('betting');
    }

    /** Deal a card to the player with animation. */
    dealCardToPlayer() {
        const card = this.#deck.draw();
        if (!card) return;
        card.faceUp = true;

        const w = this.#renderer.width;
        const h = this.#renderer.height;
        const idx = this.#playerCards.length;

        // Card position: bottom-right area, fanned with overlap
        const baseX = w - CardView.WIDTH - 16;
        const baseY = h * 0.62;
        const offsetX = idx * -24;
        const offsetY = idx * 6;
        const tx = baseX + offsetX;
        const ty = baseY + offsetY;

        const cv = new CardView(card, tx, ty);
        this.#playerCards.push(cv);
        this.#playerHand.addCard(card);

        // Animate slide-in
        this.#tweens.to(cv, { x: tx, y: ty, alpha: 1, scale: 1 }, {
            duration: 400,
            easing: 'easeOutBack',
        });

        // Sparkle
        this.#particles.sparkle(tx + CardView.WIDTH / 2, ty + CardView.HEIGHT / 2, 8);
    }

    /** Deal a card to the dealer with animation. */
    dealCardToDealer(faceUp = true) {
        const card = this.#deck.draw();
        if (!card) return;
        card.faceUp = faceUp;

        const idx = this.#dealerCards.length;
        const baseX = 16;
        const baseY = 46;
        const offsetX = idx * 24;
        const offsetY = idx * 5;
        const tx = baseX + offsetX;
        const ty = baseY + offsetY;

        const cv = new CardView(card, tx, ty);
        if (faceUp) cv.flipProgress = 1;
        else cv.flipProgress = 0;

        this.#dealerCards.push(cv);
        this.#dealerHand.addCard(card);

        this.#tweens.to(cv, { x: tx, y: ty, alpha: 1, scale: 1 }, {
            duration: 400,
            easing: 'easeOutBack',
        });
    }

    /** Reveal all dealer cards with flip animation. */
    revealDealerCards() {
        for (const cv of this.#dealerCards) {
            if (!cv.card.faceUp) {
                cv.card.faceUp = true;
                this.#tweens.to(cv, { flipProgress: 1 }, {
                    duration: 400,
                    easing: 'easeOutCubic',
                });
            }
        }
    }

    // ------ Private ------

    #setupStateMachine() {
        this.#fsm.register('betting', new BettingState(this));
        this.#fsm.register('dealing', new DealingState(this));
        this.#fsm.register('playing', new PlayingState(this));
        this.#fsm.register('hit', new HitState(this));
        this.#fsm.register('dealerTurn', new DealerTurnState(this));
        this.#fsm.register('result', new ResultState(this));
    }

    #setupUI() {
        this.#ui.on('betMinus', () => {
            if (this.#fsm.currentName !== 'betting') return;
            this.#bet = Math.max(5, this.#bet - 5);
            this.#ui.updateBetDisplay(this.#bet);
        });

        this.#ui.on('betPlus', () => {
            if (this.#fsm.currentName !== 'betting') return;
            this.#bet = Math.min(this.#chips, this.#bet + 5);
            this.#ui.updateBetDisplay(this.#bet);
        });

        this.#ui.on('deal', async () => {
            if (this.#fsm.currentName !== 'betting') return;
            if (this.#bet > this.#chips) return;

            // Platform: spend bet coins before dealing
            if (this.#usePlatformCoins && this.#platform.isAvailable()) {
                const spent = await this.#platform.spendCoins(
                    this.#bet,
                    `Sette e Mezzo bet: ${this.#bet} coins`
                );
                if (!spent) return;
            }

            // Deduct bet locally
            this.#chips -= this.#bet;

            // Notify platform (parent handles session lifecycle)
            if (this.#platform.isAvailable()) {
                this.#platform.sendGameStarted();
            }

            this.#newRoundSetup();
            this.#fsm.transition('dealing');
        });

        this.#ui.on('hit', () => {
            if (this.#fsm.currentName !== 'playing') return;
            this.#fsm.transition('hit');
        });

        this.#ui.on('stand', () => {
            if (this.#fsm.currentName !== 'playing') return;
            this.#fsm.transition('dealerTurn');
        });

        this.#ui.on('newRound', async () => {
            if (this.#fsm.currentName !== 'result') return;

            // Refresh balance from platform before new round
            if (this.#usePlatformCoins && this.#platform.isAvailable()) {
                await this.#refreshPlatformBalance();
            }

            if (this.#chips <= 0 && !this.#usePlatformCoins) this.#chips = 500;
            this.#newRoundSetup();
            this.#croupier.play('idle');
            this.#bet = Math.min(this.#bet, this.#chips);
            this.#ui.updateBetDisplay(this.#bet);
            this.#fsm.transition('betting');
        });

        this.#ui.updateBetDisplay(this.#bet);
    }

    /**
     * Resolve the round on the platform: award coins if won,
     * end session, and send gameOver event.
     * @param {'win'|'lose'} result
     * @param {number} payout - total coins to award (0 if loss)
     * @param {object} extraData - round metadata
     */
    async resolveRoundOnPlatform(result, payout, extraData) {
        this.#roundsPlayed++;

        if (result === 'win' && payout > 0) {
            if (this.#usePlatformCoins && this.#platform.isAvailable()) {
                await this.#platform.awardCoins(
                    payout,
                    `Sette e Mezzo win: ${payout} coins`
                );
            }
            this.#score += payout;
        }

        // gameOver triggers session close + XP in the platform parent
        if (this.#platform.isAvailable()) {
            await this.#platform.gameOver(payout, {
                game: 'setteemezzo',
                rounds_played: this.#roundsPlayed,
                result,
                ...extraData,
            });
        }

        // Sync local balance with server
        if (this.#usePlatformCoins && this.#platform.isAvailable()) {
            await this.#refreshPlatformBalance();
        }
    }

    #newRoundSetup() {
        this.#playerHand.clear();
        this.#dealerHand.clear();
        this.#playerCards = [];
        this.#dealerCards = [];

        if (this.#deck.remaining < 10) {
            this.#deck.reset();
        }
    }

    #tick(dt) {
        this.#update(dt);
        this.#render();
    }

    #update(dt) {
        this.#fsm.update(dt);
        this.#croupier.update(dt);
        this.#tweens.update(dt);
        this.#particles.update(dt);
        this.#hud.update(dt);
        this.#ui.update(dt);
    }

    #render() {
        const ctx = this.#renderer.ctx;
        this.#renderer.clear();

        // Croupier as fullscreen animated background
        this.#croupier.draw(ctx);

        // Table overlay (felt, decorations)
        this.#table.draw(ctx);

        // Dealer cards
        for (const cv of this.#dealerCards) cv.draw(ctx);

        // Player cards
        for (const cv of this.#playerCards) cv.draw(ctx);

        // Particles
        this.#particles.draw(ctx);

        // HUD overlay
        this.#hud.draw(ctx, {
            chips: this.#chips,
            bet: this.#bet,
            playerScore: this.#playerHand.score,
            dealerScore: this.#dealerHand.trueScore,
            dealerRevealed: this.#fsm.currentName === 'result' ||
                            this.#fsm.currentName === 'dealerTurn',
        });

        // Canvas UI (buttons, result overlay)
        this.#ui.draw(ctx);
    }

    // ── Platform integration ──

    async #initPlatform() {
        if (!this.#platform.isAvailable()) return;

        try {
            await this.#platform.initialize({
                onPause:  () => this.#loop.stop(),
                onResume: () => this.#loop.start(),
                onExit:   () => this.#handleExit(),
            });

            await this.#platform.sendScore(0, { rounds_played: 0, chips: this.#chips });
            await this.#loadUserCoins();
        } catch (_) {
            // Fallback to offline mode — keep local chips
        }
    }

    async #loadUserCoins() {
        // Wait for platformConfig.userId (max 3 s)
        const deadline = Date.now() + 3000;
        while (!window.platformConfig?.userId && Date.now() < deadline) {
            await new Promise(r => setTimeout(r, 100));
        }
        if (!window.platformConfig?.userId) return;

        const balance = await this.#platform.getUserBalance();
        if (balance !== null && balance !== undefined && typeof balance === 'number') {
            this.#chips = balance;
            this.#usePlatformCoins = true;
            this.#bet = Math.min(this.#bet, this.#chips);
            this.#ui.updateBetDisplay(this.#bet);
        }
    }

    async #refreshPlatformBalance() {
        const balance = await this.#platform.getUserBalance();
        if (balance !== null && balance !== undefined && typeof balance === 'number') {
            this.#chips = balance;
        }
    }

    #handleExit() {
        this.#loop.stop();
        if (this.#platform.isAvailable()) {
            this.#platform.gameOver(this.#score, {
                rounds_played: this.#roundsPlayed,
                chips: this.#chips,
            });
        }
    }

    // ── DOM overlays for platform messages ──

    static #ensureOverlayStyles() {
        if (document.getElementById('sm-overlay-styles')) return;
        const s = document.createElement('style');
        s.id = 'sm-overlay-styles';
        s.textContent = `
            .sm-xp-banner{position:fixed;top:60px;right:12px;z-index:10000;
                animation:smXpIn .45s ease;pointer-events:none}
            .sm-xp-banner.hiding{animation:smXpOut .45s ease forwards}
            .sm-xp-badge{background:linear-gradient(135deg,#ffd700,#ffed4e);
                padding:12px 20px;border-radius:10px;
                box-shadow:0 4px 18px rgba(255,215,0,.45);
                display:flex;align-items:center;gap:10px;
                font-family:"Press Start 2P",monospace}
            .sm-xp-icon{font-size:1.3em}
            .sm-xp-amount{font-size:.75em;font-weight:bold;color:#1a1a1a}
            @keyframes smXpIn{from{transform:translateX(300px);opacity:0}to{transform:translateX(0);opacity:1}}
            @keyframes smXpOut{from{transform:translateX(0);opacity:1}to{transform:translateX(300px);opacity:0}}

            .sm-lvl-modal{position:fixed;inset:0;z-index:10001;display:flex;
                align-items:center;justify-content:center;
                background:rgba(0,0,0,.6);opacity:0;transition:opacity .3s}
            .sm-lvl-modal.show{opacity:1}
            .sm-lvl-box{background:linear-gradient(135deg,#1a0a2e,#2d1b69);
                border:2px solid #ffd700;border-radius:14px;padding:24px;
                text-align:center;color:#fff;max-width:300px;width:90%;
                font-family:"Press Start 2P",monospace;
                box-shadow:0 0 40px rgba(255,215,0,.3)}
            .sm-lvl-box h2{font-size:.8em;color:#ffd700;margin:0 0 12px}
            .sm-lvl-levels{display:flex;align-items:center;justify-content:center;
                gap:10px;font-size:1.1em;margin:8px 0}
            .sm-lvl-levels .old{color:#888}
            .sm-lvl-levels .arrow{color:#ffd700}
            .sm-lvl-levels .new{color:#39ff14;text-shadow:0 0 8px #39ff14}
            .sm-lvl-title{font-size:.55em;color:#ccc;margin:6px 0}
            .sm-lvl-reward{font-size:.6em;color:#f0d050;margin:8px 0}
            .sm-lvl-close{background:#ffd700;color:#1a1a1a;border:none;
                border-radius:8px;padding:8px 18px;margin-top:12px;
                font-family:inherit;font-size:.55em;cursor:pointer}
        `;
        document.head.appendChild(s);
    }

    static #showXPBanner(xpAmount) {
        Game.#ensureOverlayStyles();
        const b = document.createElement('div');
        b.className = 'sm-xp-banner';
        b.innerHTML = `<div class="sm-xp-badge">
            <span class="sm-xp-icon">⭐</span>
            <span class="sm-xp-amount">+${Number(xpAmount).toFixed(2)} XP</span>
        </div>`;
        document.body.appendChild(b);
        setTimeout(() => b.classList.add('hiding'), 3500);
        setTimeout(() => b.remove(), 4000);
    }

    static #showLevelUpModal(data) {
        Game.#ensureOverlayStyles();
        const { old_level, new_level, title = '', badge = '', coins_awarded = 0,
                is_milestone = false, user_data = {} } = data;
        const isAnon = user_data?.is_anonymous === true;

        const m = document.createElement('div');
        m.className = 'sm-lvl-modal';
        m.innerHTML = `<div class="sm-lvl-box">
            <h2>🎉 LEVEL UP! 🎉</h2>
            <div class="sm-lvl-levels">
                <span class="old">${old_level ?? '-'}</span>
                <span class="arrow">→</span>
                <span class="new">${new_level ?? '-'}</span>
            </div>
            <div class="sm-lvl-title">${badge} ${title}</div>
            ${is_milestone ? '<div style="color:#ffd700;font-size:.55em">✨ MILESTONE ✨</div>' : ''}
            ${!isAnon && coins_awarded > 0 ? `<div class="sm-lvl-reward">🪙 +${coins_awarded} Coins</div>` : ''}
            <button class="sm-lvl-close">Continue</button>
        </div>`;
        document.body.appendChild(m);
        setTimeout(() => m.classList.add('show'), 10);

        const close = () => {
            m.classList.remove('show');
            setTimeout(() => m.remove(), 300);
        };
        m.querySelector('.sm-lvl-close').addEventListener('click', close);
        setTimeout(() => { if (m.parentElement) close(); }, 6000);
    }
}
