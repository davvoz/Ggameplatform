import { Renderer } from './Renderer.js';
import { GameLoop } from './GameLoop.js';
import { StateMachine } from '../states/StateMachine.js';
import { TweenManager } from '../graphics/Tween.js';
import { ParticleSystem } from '../graphics/ParticleSystem.js';
import { ScreenShake } from '../graphics/ScreenShake.js';
import { InputManager } from '../input/InputManager.js';
import { UIManager, HUD } from '../ui/UIManager.js';
import { NetworkManager } from '../net/NetworkManager.js';
import { PlatformBridge } from '../platform/PlatformBridge.js';
import { AIController } from '../ai/AIController.js';
import { Character } from '../entities/Character.js';
import { Ball } from '../entities/Ball.js';
import { PowerUp } from '../entities/PowerUp.js';
import { Shield, SuperShield } from '../entities/FieldObjects.js';
import { CHARACTERS } from '../characters/CharacterData.js';
import { POWERUP_TYPES } from '../powerups/PowerUpTypes.js';
import { SoundManager } from '../audio/SoundManager.js';
import {
    DESIGN_WIDTH, DESIGN_HEIGHT,
    ARENA_LEFT, ARENA_RIGHT, ARENA_TOP, ARENA_BOTTOM, ARENA_MID_Y,
    BALL_BASE_SPEED, DEFAULT_ROUNDS_TO_WIN,
    COLORS,
} from '../config/Constants.js';

/* State imports */
import { MenuState } from '../states/MenuState.js';
import { CharacterSelectState } from '../states/CharacterSelectState.js';
import { LobbyState } from '../states/LobbyState.js';
import { CountdownState } from '../states/CountdownState.js';
import { PlayingState } from '../states/PlayingState.js';
import { RoundEndState } from '../states/RoundEndState.js';
import { MatchEndState } from '../states/MatchEndState.js';
import { StoryIntroState } from '../states/StoryIntroState.js';
import { StoryCompleteState } from '../states/StoryCompleteState.js';
import { MultiCharSelectState } from '../states/MultiCharSelectState.js';

/* Story imports */
import { getStoryLevel, STORY_LEVELS } from '../story/StoryModeConfig.js';
import { BackgroundRenderer } from '../rendering/BackgroundRenderer.js';
import { Obstacle } from '../entities/Obstacle.js';

/**
 * Main game orchestrator. Owns all subsystems and exposes the shared API
 * that individual states interact with.
 */
export class Game {
    /* --- subsystems --- */
    renderer;
    loop;
    fsm;
    tweens;
    particles;
    shake;
    input;
    ui;
    network;
    platform;
    ai;
    sound;

    /* --- entities --- */
    topPlayer = null;
    bottomPlayer = null;
    ball = null;
    powerUps = [];
    fieldObjects = [];

    /* --- match state --- */
    topScore = 0;
    bottomScore = 0;
    currentRound = 1;
    roundsToWin = DEFAULT_ROUNDS_TO_WIN;
    isVsCPU = true;
    isHost = true;
    betAmount = 0;
    matchData = null;
    powerupsCollected = 0;

    /** True when the local player controls the bottom character. */
    get playerIsBottom() { return this.isVsCPU || this.isHost; }

    /* --- story mode --- */
    storyLevel = 0;
    storyPlayerCharId = null;
    arenaTheme = null;
    obstacles = [];

    /* --- network interpolation (guest-side) --- */
    #netBuffer = [];
    #interpDelay = 100;     // ms behind authoritative state for smooth interpolation
    #lastSyncTime = 0;
    #syncRate = 50;         // ms between syncs → 20 Hz (was every frame ~60 Hz)
    #stateSeq = 0;

    constructor(canvas) {
        this.renderer = new Renderer(canvas, DESIGN_WIDTH, DESIGN_HEIGHT);
        this.tweens = new TweenManager();
        this.particles = new ParticleSystem();
        this.shake = new ScreenShake();
        this.input = new InputManager(this.renderer);
        this.ui = new UIManager(canvas, this.renderer);
        this.network = new NetworkManager();
        this.platform = new PlatformBridge();
        this.sound = new SoundManager();
        this.ui.soundManager = this.sound;

        this.loop = new GameLoop((dt) => {
            this.#update(dt);
            const ctx = this.renderer.ctx;
            this.renderer.clear();
            ctx.save();
            this.shake.apply(ctx);
            this.fsm.draw(ctx);
            ctx.restore();
        });

        this.#registerStates();
        this.#wireGlobalUIEvents();
        this.#wireNetworkEvents();

        window.addEventListener('resize', () => this.renderer.resize());
    }

    async start() {
        await this.platform.initialize();
        await this.sound.init();

        // Resume audio context on first user interaction
        const resumeAudio = () => {
            this.sound.resume();
        };
        window.addEventListener('pointerdown', resumeAudio, { once: true });
        window.addEventListener('keydown', resumeAudio, { once: true });

        this.fsm.transition('menu');
        this.loop.start();
    }

    /* ---------------------------------------------------------- */
    /*  State registration                                        */
    /* ---------------------------------------------------------- */

    #registerStates() {
        this.fsm = new StateMachine();
        this.fsm.register('menu', new MenuState(this));
        this.fsm.register('characterSelect', new CharacterSelectState(this));
        this.fsm.register('lobby', new LobbyState(this));
        this.fsm.register('countdown', new CountdownState(this));
        this.fsm.register('playing', new PlayingState(this));
        this.fsm.register('roundEnd', new RoundEndState(this));
        this.fsm.register('matchEnd', new MatchEndState(this));
        this.fsm.register('storyIntro', new StoryIntroState(this));
        this.fsm.register('storyComplete', new StoryCompleteState(this));
        this.fsm.register('multiCharSelect', new MultiCharSelectState(this));
    }

    /* ---------------------------------------------------------- */
    /*  Global UI event wiring                                    */
    /* ---------------------------------------------------------- */

    #wireGlobalUIEvents() {
        this.ui.onGlobal('selectCPU', () => {
            this.isVsCPU = true;
            this.fsm.transition('characterSelect', { mode: 'cpu' });
        });

        this.ui.onGlobal('selectMultiplayer', () => {
            this.isVsCPU = false;
            this.fsm.transition('lobby');
        });

        this.ui.onGlobal('selectStory', () => {
            this.isVsCPU = true;
            this.fsm.transition('characterSelect', { mode: 'story' });
        });
    }

    /* ---------------------------------------------------------- */
    /*  Network events (multiplayer sync)                         */
    /* ---------------------------------------------------------- */

    /** Stores the latest guest input received from the network. */
    guestInputState = { dx: 0, dy: 0 };

    #wireNetworkEvents() {
        // Guest sends input → host receives guestInput
        this.network.on('guestInput', (data) => {
            this.guestInputState.dx = data.dx ?? 0;
            this.guestInputState.dy = data.dy ?? 0;
        });

        // Host sends gameState → guest buffers snapshots for interpolation
        this.network.on('gameState', (data) => {
            if (this.isHost) return;  // only guest applies
            const s = data.state ?? data;

            // Buffer snapshot for interpolation
            this.#netBuffer.push({ time: performance.now(), state: s });
            // Keep last 30 snapshots (~1.5 s at 20 Hz)
            while (this.#netBuffer.length > 30) this.#netBuffer.shift();

            // Scores are discrete — apply immediately
            if (s.topScore !== undefined) this.topScore = s.topScore;
            if (s.bottomScore !== undefined) this.bottomScore = s.bottomScore;

            // Effect states applied immediately (they're booleans, not positions)
            if (s.ball?.fx) this.ball?.applyEffectState(s.ball.fx);
            if (s.top?.fx) this.topPlayer?.applyEffectState(s.top.fx);
            if (s.bottom?.fx) this.bottomPlayer?.applyEffectState(s.bottom.fx);
        });

        // Goal relayed from host to guest
        this.network.on('goal', (data) => {
            if (this.isHost) return;
            // Play goal effects on guest side
            this.ball?.freeze();
            this.shake.trigger(8, 300);
            this.sound.playGoal();
            const goalX = (ARENA_LEFT + ARENA_RIGHT) / 2;
            const goalY = data.scorerId === 'bottom' ? ARENA_TOP : ARENA_BOTTOM;
            this.particles.emit(goalX, goalY, 40, {
                colors: [COLORS.NEON_GREEN, COLORS.NEON_YELLOW, '#ffffff'],
                speedMin: 40, speedMax: 160,
                sizeMin: 2, sizeMax: 6,
                lifeMin: 500, lifeMax: 1500,
            });
            this.scoreGoal(data.scorerId);
        });

        // Super shot relayed from host to guest
        this.network.on('superShot', (data) => {
            if (this.isHost) return;
            const charId = data.charId;
            const isTop = data.isTopPlayer;
            const character = isTop ? this.topPlayer : this.bottomPlayer;
            if (!character) return;

            // Visual/audio effects
            this.sound.playSuperShot();
            this.shake.trigger(10, 400);
            this.particles.emit(character.x, character.y, 35, {
                colors: [character.data.palette.primary, character.data.palette.accent, '#ffffff'],
                speedMin: 50, speedMax: 160,
                sizeMin: 2, sizeMax: 5,
            });

            // Character-specific visuals
            if (charId === 'tank') {
                this.addFieldObject(
                    new SuperShield(isTop, character.data.palette.accent)
                );
                this.particles.emit(
                    (ARENA_LEFT + ARENA_RIGHT) / 2,
                    isTop ? ARENA_TOP + 4 : ARENA_BOTTOM - 4,
                    30,
                    { colors: ['#88ee88', '#44bb44', '#ffffff'], speedMin: 30, speedMax: 100 }
                );
            }
        });

        // Shield hit relayed from host to guest
        this.network.on('shieldHit', () => {
            if (this.isHost) return;
            // Find first alive field object with destroy and trigger it
            for (const obj of this.fieldObjects) {
                if (obj.alive && obj.destroy) {
                    obj.destroy();
                    this.shake.trigger(5, 150);
                    this.sound.playShieldHit();
                    if (obj.x !== undefined && obj.y !== undefined) {
                        this.particles.emit(obj.x, obj.y, 15, {
                            colors: [COLORS.NEON_CYAN, '#ffffff'],
                        });
                    }
                    break;
                }
            }
        });

        // Power-up spawned on host → create visual copy on guest
        this.network.on('powerUpSpawned', (data) => {
            if (this.isHost) return;
            const type = POWERUP_TYPES.find(t => t.id === data.typeId);
            if (type) {
                const pu = new PowerUp(type, data.x, data.y);
                pu._netId = data.id;
                this.addPowerUp(pu);
            }
        });

        // Power-up collected on host → remove visual on guest + effects
        this.network.on('powerUpCollected', (data) => {
            if (this.isHost) return;
            const pu = this.powerUps.find(p => p._netId === data.powerUpId && p.alive);
            if (pu) {
                this.sound.playPowerUp();
                this.particles.emit(pu.x, pu.y, 20, {
                    colors: [pu.type.color, '#ffffff'],
                    speedMin: 30, speedMax: 100,
                });

                // Create visual field objects for certain power-up types
                if (pu.type.id === 'shield') {
                    const isTopCollector = data.collectorId === 'top';
                    this.addFieldObject(new Shield(isTopCollector));
                }

                pu.collect();
                this.cleanupPowerUps();
            }
        });
    }

    /* ---------------------------------------------------------- */
    /*  Match setup (called by CountdownState)                    */
    /* ---------------------------------------------------------- */

    setupMatch(data) {
        this.matchData = data;
        this.topScore = 0;
        this.bottomScore = 0;
        this.currentRound = 1;
        this.roundsToWin = data.roundsToWin ?? DEFAULT_ROUNDS_TO_WIN;
        this.betAmount = data.betAmount ?? 0;
        this.powerUps = [];
        this.fieldObjects = [];
        this.obstacles = [];
        this.powerupsCollected = 0;
        this.clearNetBuffer();

        // Store story theme if present
        this.arenaTheme = data.theme ?? null;

        const playerCharData = CHARACTERS.find(c => c.id === data.playerCharId) ?? CHARACTERS[0];

        // Bottom player is always the local user
        this.bottomPlayer = new Character(playerCharData, false);
        this.bottomPlayer.x = (ARENA_LEFT + ARENA_RIGHT) / 2;
        this.bottomPlayer.y = ARENA_BOTTOM - 50;

        // Top player
        if (data.mode === 'story') {
            // Story mode — opponent is predetermined
            const oppChar = CHARACTERS.find(c => c.id === data.opponentCharId) ?? CHARACTERS[0];
            this.topPlayer = new Character(oppChar, true);
            this.ai = new AIController(data.aiDifficulty ?? 'MEDIUM');
        } else if (this.isVsCPU) {
            const cpuChar = this.#pickCPUCharacter(playerCharData.id);
            this.topPlayer = new Character(cpuChar, true);
            this.ai = new AIController(data.aiDifficulty ?? 'MEDIUM');
        } else {
            const opponentCharId = data.opponentCharId ?? 'blaze';
            const oppChar = CHARACTERS.find(c => c.id === opponentCharId) ?? CHARACTERS[0];
            if (this.isHost) {
                this.topPlayer = new Character(oppChar, true);
            } else {
                // Guest: match host's perspective so gameState positions sync correctly
                // bottomPlayer = host's char (at bottom), topPlayer = our char (at top)
                this.topPlayer = new Character(playerCharData, true);
                this.bottomPlayer = new Character(oppChar, false);
                this.bottomPlayer.x = (ARENA_LEFT + ARENA_RIGHT) / 2;
                this.bottomPlayer.y = ARENA_BOTTOM - 50;
            }
            this.ai = null;
        }

        this.topPlayer.x = (ARENA_LEFT + ARENA_RIGHT) / 2;
        this.topPlayer.y = ARENA_TOP + 50;

        // Create obstacles from level config
        if (data.obstacles && data.obstacles.length > 0) {
            const theme = data.theme ?? null;
            for (const def of data.obstacles) {
                this.obstacles.push(new Obstacle(def, theme));
            }
        }

        this.#spawnBall();

        this.platform.sendGameStarted();
    }

    /* ---------------------------------------------------------- */
    /*  Round lifecycle                                           */
    /* ---------------------------------------------------------- */

    scoreGoal(scorerId) {
        // Host sends goal event to guest so both transition together
        if (!this.isVsCPU && this.isHost) {
            this.network.sendGoal(scorerId);
        }

        if (scorerId === 'bottom') {
            this.bottomScore++;
        } else {
            this.topScore++;
        }

        if (this.#isMatchWon()) {
            const winner = this.bottomScore > this.topScore ? 'bottom' : 'top';

            // Story mode — advance or defeat
            if (this.matchData?.mode === 'story') {
                if (winner === 'bottom') {
                    this.#advanceStory();
                } else {
                    // Player lost — show match end, retry from story intro
                    this.fsm.transition('matchEnd', {
                        winner,
                        topScore: this.topScore,
                        bottomScore: this.bottomScore,
                        storyMode: true,
                    });
                }
                return;
            }

            this.fsm.transition('matchEnd', {
                winner,
                topScore: this.topScore,
                bottomScore: this.bottomScore,
            });
        } else {
            this.fsm.transition('roundEnd', {
                scorerId,
                topScore: this.topScore,
                bottomScore: this.bottomScore,
            });
        }
    }

    /**
     * Deuce / advantage win check.
     * A player must reach roundsToWin AND lead by at least 2
     * once both players have reached roundsToWin - 1 (deuce territory).
     */
    #isMatchWon() {
        const target = this.roundsToWin;
        const top = this.topScore;
        const bot = this.bottomScore;

        // Neither player has reached the target yet
        if (top < target && bot < target) return false;

        // At least one reached target — check lead of 2
        return Math.abs(top - bot) >= 2;
    }

    /** True when both players are at or above roundsToWin-1. */
    get isDeuce() {
        const t = this.roundsToWin;
        return this.topScore >= t - 1 && this.bottomScore >= t - 1
            && this.topScore === this.bottomScore;
    }

    /** Returns 'top', 'bottom', or null — who has the advantage point. */
    get advantage() {
        const t = this.roundsToWin;
        if (this.topScore < t - 1 || this.bottomScore < t - 1) return null;
        if (this.topScore === this.bottomScore) return null;
        if (Math.abs(this.topScore - this.bottomScore) !== 1) return null;
        return this.topScore > this.bottomScore ? 'top' : 'bottom';
    }

    /**
     * Advance to the next story level, or show completion screen.
     */
    #advanceStory() {
        this.storyLevel++;
        const nextLevel = getStoryLevel(this.storyLevel);
        if (nextLevel) {
            this.fsm.transition('storyIntro', { level: nextLevel });
        } else {
            this.fsm.transition('storyComplete');
        }
    }

    startNextRound(lastScorerId) {
        this.currentRound++;
        this.powerUps = [];
        this.fieldObjects = [];
        this.extraBalls.length = 0;
        this.clearNetBuffer();

        // Rebuild obstacles from matchData (they persist across rounds)
        this.obstacles = [];
        if (this.matchData?.obstacles && this.matchData.obstacles.length > 0) {
            const theme = this.matchData.theme ?? null;
            for (const def of this.matchData.obstacles) {
                this.obstacles.push(new Obstacle(def, theme));
            }
        }

        // Reset positions
        this.bottomPlayer.resetPosition();
        this.topPlayer.resetPosition();

        // Reset effects
        this.bottomPlayer.clearEffects();
        this.topPlayer.clearEffects();

        // Serve toward the player who lost the point
        const serveDir = lastScorerId === 'bottom' ? -1 : lastScorerId === 'top' ? 1 : undefined;
        this.#spawnBall(serveDir);
        this.ball.unfreeze();

        this.fsm.transition('playing', this.matchData);
    }

    /* ---------------------------------------------------------- */
    /*  Entity helpers (called by states and power-ups)           */
    /* ---------------------------------------------------------- */

    addPowerUp(pu) {
        this.powerUps.push(pu);
    }

    cleanupPowerUps() {
        this.powerUps = this.powerUps.filter(p => p.alive);
    }

    addFieldObject(obj) {
        this.fieldObjects.push(obj);
    }

    updateFieldObjects(dt) {
        for (const obj of this.fieldObjects) {
            if (obj.update) obj.update(dt);
        }
        this.fieldObjects = this.fieldObjects.filter(o => o.alive !== false);
    }

    getOpponent(character) {
        return character === this.bottomPlayer ? this.topPlayer : this.bottomPlayer;
    }

    spawnExtraBalls(count) {
        // Extra balls are tracked in PlayingState — emit event
        for (let i = 0; i < count; i++) {
            const extra = new Ball();
            extra.x = (ARENA_LEFT + ARENA_RIGHT) / 2;
            extra.y = ARENA_MID_Y;
            const angle = (Math.random() - 0.5) * Math.PI * 0.6;
            const dir = Math.random() < 0.5 ? -1 : 1;
            extra.vx = Math.sin(angle) * BALL_BASE_SPEED;
            extra.vy = Math.cos(angle) * BALL_BASE_SPEED * dir;
            this.extraBalls.push(extra);
        }
    }

    /* expose for PlayingState */
    extraBalls = [];

    /* ---------------------------------------------------------- */
    /*  Network sync                                              */
    /* ---------------------------------------------------------- */

    syncToNetwork() {
        if (!this.network.connected) return;

        // Rate-limit: send at ~20 Hz instead of every frame
        const now = performance.now();
        if (now - this.#lastSyncTime < this.#syncRate) return;
        this.#lastSyncTime = now;
        this.#stateSeq++;

        this.network.sendGameState({
            seq: this.#stateSeq,
            ball: {
                x: this.ball.x, y: this.ball.y,
                vx: this.ball.vx, vy: this.ball.vy,
                fx: this.ball.getEffectState(),
            },
            top: {
                x: this.topPlayer.x, y: this.topPlayer.y,
                fx: this.topPlayer.getEffectState(),
            },
            bottom: {
                x: this.bottomPlayer.x, y: this.bottomPlayer.y,
                fx: this.bottomPlayer.getEffectState(),
            },
            topScore: this.topScore,
            bottomScore: this.bottomScore,
        });
    }

    /* ---------------------------------------------------------- */
    /*  Drawing helpers                                           */
    /* ---------------------------------------------------------- */

    drawArena(ctx) {
        // Background — themed for story mode, default otherwise
        if (this.arenaTheme) {
            BackgroundRenderer.drawThemedArena(ctx, this.arenaTheme);
        } else {
            ctx.fillStyle = COLORS.BG_PRIMARY;
            ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
            HUD.drawArena(ctx);
        }

        HUD.drawScores(
            ctx,
            this.topScore, this.bottomScore,
            this.topPlayer?.data?.name ?? 'P2',
            this.bottomPlayer?.data?.name ?? 'P1',
            this.topPlayer?.data?.palette?.accent ?? COLORS.NEON_PINK,
            this.bottomPlayer?.data?.palette?.accent ?? COLORS.NEON_CYAN,
        );
        const isPlayerBottom = this.isVsCPU || this.isHost;
        const bottomLabel = isPlayerBottom ? 'YOU' : (this.bottomPlayer?.data?.name ?? 'P2');
        const topLabel = this.isVsCPU ? 'CPU' : (isPlayerBottom ? (this.topPlayer?.data?.name ?? 'P2') : 'YOU');
        HUD.drawRoundInfo(ctx, this.currentRound, this.roundsToWin, this.isDeuce, this.advantage, bottomLabel, topLabel);
        HUD.drawScanlines(ctx);
    }

    /* ---------------------------------------------------------- */
    /*  Private helpers                                           */
    /* ---------------------------------------------------------- */

    #spawnBall(direction) {
        this.ball = new Ball();
        this.ball.x = (ARENA_LEFT + ARENA_RIGHT) / 2;
        this.ball.y = ARENA_MID_Y;

        const angle = (Math.random() - 0.5) * Math.PI * 0.4;
        const dir = direction ?? (Math.random() < 0.5 ? -1 : 1);
        this.ball.vx = Math.sin(angle) * BALL_BASE_SPEED;
        this.ball.vy = Math.cos(angle) * BALL_BASE_SPEED * dir;
        this.ball.freeze();
    }

    #pickCPUCharacter(playerCharId) {
        const available = CHARACTERS.filter(c => c.id !== playerCharId);
        return available[Math.floor(Math.random() * available.length)];
    }

    /* ---------------------------------------------------------- */
    /*  Main loop callbacks                                       */
    /* ---------------------------------------------------------- */

    #update(dt) {
        this.fsm.update(dt);

        // Guest: apply interpolation AFTER the state machine update,
        // then run visual-only ball update with corrected positions.
        if (!this.isVsCPU && !this.isHost) {
            this.#interpolateNetState();
            this.ball?.updateVisuals(dt);
        }
    }

    /* ---------------------------------------------------------- */
    /*  Network snapshot interpolation (guest-side)               */
    /* ---------------------------------------------------------- */

    /**
     * Interpolate entity positions from the snapshot buffer.
     * Renders ~100 ms behind the host for smooth movement even with jitter.
     * Own character (topPlayer for guest) uses gentle correction
     * to blend client-side prediction with authoritative state.
     */
    #interpolateNetState() {
        if (this.#netBuffer.length === 0) return;

        const renderTime = performance.now() - this.#interpDelay;

        // Find two snapshots bracketing renderTime
        let before = null, after = null;
        for (let i = this.#netBuffer.length - 1; i > 0; i--) {
            if (this.#netBuffer[i - 1].time <= renderTime) {
                before = this.#netBuffer[i - 1];
                after = this.#netBuffer[i];
                break;
            }
        }

        if (!before) {
            // All snapshots are in the future or only one — use latest
            this.#applySnapshot(this.#netBuffer[this.#netBuffer.length - 1].state);
            return;
        }

        const range = after.time - before.time;
        const t = range > 0 ? Math.min(1, (renderTime - before.time) / range) : 1;

        const bs = before.state;
        const as_ = after.state;

        // Interpolate ball
        if (bs.ball && as_.ball && this.ball) {
            this.ball.x = this.#lerp(bs.ball.x, as_.ball.x, t);
            this.ball.y = this.#lerp(bs.ball.y, as_.ball.y, t);
            this.ball.vx = as_.ball.vx;
            this.ball.vy = as_.ball.vy;
        }

        // Interpolate opponent (bottomPlayer for guest = host's character)
        if (bs.bottom && as_.bottom && this.bottomPlayer) {
            this.bottomPlayer.x = this.#lerp(bs.bottom.x, as_.bottom.x, t);
            this.bottomPlayer.y = this.#lerp(bs.bottom.y, as_.bottom.y, t);
        }

        // Smooth correction for own character (topPlayer = guest's predicted character)
        if (as_.top && this.topPlayer) {
            const serverX = this.#lerp(
                bs.top?.x ?? as_.top.x,
                as_.top.x, t,
            );
            const serverY = this.#lerp(
                bs.top?.y ?? as_.top.y,
                as_.top.y, t,
            );
            // Gentle blend toward server — keeps prediction responsive but corrects drift
            const correction = 0.15;
            this.topPlayer.x += (serverX - this.topPlayer.x) * correction;
            this.topPlayer.y += (serverY - this.topPlayer.y) * correction;
        }
    }

    /**
     * Fallback: apply a single snapshot directly (no interpolation pair available).
     */
    #applySnapshot(s) {
        if (s.ball && this.ball) {
            this.ball.x = s.ball.x;
            this.ball.y = s.ball.y;
            this.ball.vx = s.ball.vx;
            this.ball.vy = s.ball.vy;
        }
        if (s.bottom && this.bottomPlayer) {
            this.bottomPlayer.x = s.bottom.x;
            this.bottomPlayer.y = s.bottom.y;
        }
        if (s.top && this.topPlayer) {
            const correction = 0.3;
            this.topPlayer.x += (s.top.x - this.topPlayer.x) * correction;
            this.topPlayer.y += (s.top.y - this.topPlayer.y) * correction;
        }
    }

    #lerp(a, b, t) {
        return a + (b - a) * t;
    }

    /** Clear interpolation buffer (call on round/match reset). */
    clearNetBuffer() {
        this.#netBuffer.length = 0;
        this.#stateSeq = 0;
    }
}
