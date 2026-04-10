import { Renderer } from './Renderer.js';
import { GameLoop } from './GameLoop.js';
import { StateMachine } from '../../../shared/StateMachine.js';
import { TweenManager } from '../../../shared/Tween.js';
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

    /* --- network interpolation (server-authoritative) --- */
    #netBuffer = [];
    #interpDelay = 66;      // ms behind authoritative state (~2 server ticks at 30 Hz)
    #serverBallTarget = null;   // { x, y, vx, vy } — latest interpolated server truth
    #serverOppTarget = null;    // { x, y } — latest interpolated server opponent pos

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

    #wireNetworkEvents() {
        // Server sends a batched 'tick' message at 30 Hz containing
        // the authoritative snapshot + any events that occurred this tick.
        this.network.on('tick', (data) => {
            const s = data.state ?? data;

            this.#netBuffer.push({ time: performance.now(), state: s });
            while (this.#netBuffer.length > 30) this.#netBuffer.shift();

            // Scores — apply immediately (discrete)
            if (s.topScore !== undefined) this.topScore = s.topScore;
            if (s.bottomScore !== undefined) this.bottomScore = s.bottomScore;

            // Effect states — apply immediately (booleans, not positions)
            if (s.ball?.fx) this.ball?.applyEffectState(s.ball.fx);
            if (s.top?.fx) this.topPlayer?.applyEffectState(s.top.fx);
            if (s.bottom?.fx) this.bottomPlayer?.applyEffectState(s.bottom.fx);

            // On ball-affecting events, immediately snap ball to server state
            // so dead-reckoning continues with correct post-collision velocity.
            if (data.events?.length && s.ball && this.ball) {
                const BALL_EVENTS = ['paddleHit', 'shieldHit', 'superShot',
                    'fireballPassThrough', 'obstacleHit', 'wallHit'];
                if (data.events.some(ev => BALL_EVENTS.includes(ev.t))) {
                    this.ball.x = s.ball.x;
                    this.ball.y = s.ball.y;
                    this.ball.vx = s.ball.vx;
                    this.ball.vy = s.ball.vy;
                    this.#serverBallTarget = {
                        x: s.ball.x, y: s.ball.y,
                        vx: s.ball.vx, vy: s.ball.vy,
                    };
                }
            }

            // Replay bundled events
            if (data.events) {
                for (const ev of data.events) {
                    this.network.emit(ev.t, ev.d);
                }
            }
        });

        // Legacy / standalone events that are sent outside the tick loop
        this.network.on('gameState', (data) => {
            const s = data.state ?? data;
            this.#netBuffer.push({ time: performance.now(), state: s });
            while (this.#netBuffer.length > 30) this.#netBuffer.shift();
            if (s.topScore !== undefined) this.topScore = s.topScore;
            if (s.bottomScore !== undefined) this.bottomScore = s.bottomScore;
            if (s.ball?.fx) this.ball?.applyEffectState(s.ball.fx);
            if (s.top?.fx) this.topPlayer?.applyEffectState(s.top.fx);
            if (s.bottom?.fx) this.bottomPlayer?.applyEffectState(s.bottom.fx);
        });

        // Server countdown acknowledgement — the client runs its own local
        // countdown timer in CountdownState, so we just log receipt.
        this.network.on('countdown', () => { /* handled by CountdownState timer */ });

        // Server goal event — authoritative scoring + state transition
        this.network.on('goal', (data) => {
            this.topScore = data.topScore ?? this.topScore;
            this.bottomScore = data.bottomScore ?? this.bottomScore;

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

            if (data.matchEnd) {
                this.fsm.transition('matchEnd', {
                    winner: data.winner,
                    topScore: data.topScore,
                    bottomScore: data.bottomScore,
                });
            } else {
                this.fsm.transition('roundEnd', {
                    scorerId: data.scorerId,
                    topScore: data.topScore,
                    bottomScore: data.bottomScore,
                });
            }
        });

        // Server round start — transition out of RoundEnd into PlayingState
        this.network.on('roundStart', (data) => {
            // If we're still in roundEnd, trigger the next round.
            if (this.fsm.currentName === 'roundEnd') {
                this.startNextRound(data.lastScorerId, data.round);
            }
        });

        // Super shot VFX — both clients
        this.network.on('superShot', (data) => {
            const charId = data.charId;
            const isTop = data.isTopPlayer;
            const character = isTop ? this.topPlayer : this.bottomPlayer;
            if (!character) return;

            this.sound.playSuperShot();
            this.shake.trigger(10, 400);
            this.particles.emit(character.x, character.y, 35, {
                colors: [character.data.palette.primary, character.data.palette.accent, '#ffffff'],
                speedMin: 50, speedMax: 160,
                sizeMin: 2, sizeMax: 5,
            });

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

        // Shield hit VFX — both clients
        this.network.on('shieldHit', () => {
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

        // Power-up spawned — create visual entity on both clients
        this.network.on('powerUpSpawned', (data) => {
            const type = POWERUP_TYPES.find(t => t.id === data.typeId);
            if (type) {
                const pu = new PowerUp(type, data.x, data.y);
                pu._netId = data.id;
                this.addPowerUp(pu);
            }
        });

        // Power-up collected — remove visual + effects on both clients
        this.network.on('powerUpCollected', (data) => {
            const pu = this.powerUps.find(p => p._netId === data.powerUpId && p.alive);
            if (pu) {
                this.sound.playPowerUp();
                this.particles.emit(pu.x, pu.y, 20, {
                    colors: [pu.type.color, '#ffffff'],
                    speedMin: 30, speedMax: 100,
                });

                // Create visual field objects for shield power-ups
                if (data.typeId === 'shield') {
                    const isTopCollector = data.collectorId === 'top';
                    this.addFieldObject(new Shield(isTopCollector));
                }

                // Track powerups collected for quest progress
                const isLocalCollector = this.playerIsBottom
                    ? data.collectorId === 'bottom'
                    : data.collectorId === 'top';
                if (isLocalCollector) {
                    this.powerupsCollected++;
                }

                pu.collect();
                this.cleanupPowerUps();
            }
        });

        // Paddle hit sound + particles — both clients
        // Ball already snapped to collision pos by tick handler; play effects instantly.
        this.network.on('paddleHit', (data) => {
            this.sound.playPaddleHit();
            this.shake.trigger(3, 100);
            const character = data.isTopPlayer ? this.topPlayer : this.bottomPlayer;
            if (character) {
                character.playHit();
                this.particles.emit(data.ballX, data.ballY, 8, {
                    colors: [character.data.palette.accent, '#ffffff'],
                    speedMin: 20, speedMax: 80,
                });
            }
        });

        // Wall hit sound — both clients
        this.network.on('wallHit', () => {
            this.sound.playWallHit();
        });

        // Fireball pass-through VFX — both clients
        this.network.on('fireballPassThrough', (data) => {
            this.shake.trigger(6, 200);
            this.particles.emit(data.ballX, data.ballY, 25, {
                colors: [COLORS.NEON_ORANGE, COLORS.NEON_RED, '#ffff00'],
                speedMin: 40, speedMax: 120,
                sizeMin: 2, sizeMax: 5,
            });
        });

        // Extra ball scored — VFX (score already updated by server snapshot)
        this.network.on('extraBallGoal', (data) => {
            this.shake.trigger(4, 150);
            this.sound.playGoal();
            this.particles.emit(data.goalX, data.goalY, 20, {
                colors: [COLORS.NEON_YELLOW, '#ffffff'],
                speedMin: 30, speedMax: 120,
            });
        });

        // Obstacle hit — sound
        this.network.on('obstacleHit', () => {
            this.sound.playWallHit();
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

    startNextRound(lastScorerId, serverRound) {
        // Use server-provided round number if available, otherwise increment
        if (serverRound !== undefined) {
            this.currentRound = serverRound;
        } else {
            this.currentRound++;
        }
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

        // In multiplayer, keep ball frozen — server snapshots will position it.
        // In CPU mode, unfreeze for local physics.
        if (this.isVsCPU) {
            this.ball.unfreeze();
        }

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

        if (this.isVsCPU) {
            // Local physics — give ball a random starting velocity
            const angle = (Math.random() - 0.5) * Math.PI * 0.4;
            const dir = direction ?? (Math.random() < 0.5 ? -1 : 1);
            this.ball.vx = Math.sin(angle) * BALL_BASE_SPEED;
            this.ball.vy = Math.cos(angle) * BALL_BASE_SPEED * dir;
        } else {
            // Multiplayer — server controls the ball; start with zero velocity.
            // Server snapshots will provide authoritative position/velocity.
            this.ball.vx = 0;
            this.ball.vy = 0;
        }
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

        // Multiplayer: dead-reckon entities each frame for 60 fps smoothness,
        // blended toward the server snapshot target every tick.
        if (!this.isVsCPU) {
            // 1.  Compute the latest server target from the snapshot buffer.
            this.#computeServerTargets();

            const sec = dt / 1000;
            const oppPlayer = this.playerIsBottom ? this.topPlayer : this.bottomPlayer;

            // 2.  Dead-reckon ball: advance by velocity, bounce off walls.
            if (this.ball && !this.ball.frozen) {
                this.ball.x += this.ball.vx * sec;
                this.ball.y += this.ball.vy * sec;
                // Simple wall bounce (keeps ball visually correct between snapshots)
                const r = this.ball.radius;
                if (this.ball.x - r <= ARENA_LEFT) {
                    this.ball.x = ARENA_LEFT + r;
                    this.ball.vx = Math.abs(this.ball.vx);
                } else if (this.ball.x + r >= ARENA_RIGHT) {
                    this.ball.x = ARENA_RIGHT - r;
                    this.ball.vx = -Math.abs(this.ball.vx);
                }
            }

            // 3.  Blend toward server truth (frame-rate independent).
            //     Formula: 1 - (1-base)^(dt*60) keeps convergence rate
            //     consistent regardless of actual frame rate.
            if (this.#serverBallTarget && this.ball && !this.ball.frozen) {
                const bc = 1 - Math.pow(0.7, sec * 60);   // ~0.3 @60fps
                this.ball.x += (this.#serverBallTarget.x - this.ball.x) * bc;
                this.ball.y += (this.#serverBallTarget.y - this.ball.y) * bc;
                this.ball.vx += (this.#serverBallTarget.vx - this.ball.vx) * bc;
                this.ball.vy += (this.#serverBallTarget.vy - this.ball.vy) * bc;
            }

            if (this.#serverOppTarget && oppPlayer) {
                const oc = 1 - Math.pow(0.65, sec * 60);  // ~0.35 @60fps
                oppPlayer.x += (this.#serverOppTarget.x - oppPlayer.x) * oc;
                oppPlayer.y += (this.#serverOppTarget.y - oppPlayer.y) * oc;
            }

            // 4.  Visual updates (trail, effects — no position changes).
            this.ball?.updateVisuals(dt);
            for (const eb of this.extraBalls) {
                eb.updateVisuals(dt);
            }
        }
    }

    /* ---------------------------------------------------------- */
    /*  Network snapshot interpolation (guest-side)               */
    /* ---------------------------------------------------------- */

    /**
     * Compute the server target positions from the snapshot buffer.
     * Uses interpolation when a pair of snapshots brackets the render time,
     * otherwise extrapolates from the latest snapshot.
     * Results are stored in #serverBallTarget / #serverOppTarget and used
     * by the dead-reckoning blend in #update().
     */
    #computeServerTargets() {
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
            // Use latest snapshot directly
            const s = this.#netBuffer[this.#netBuffer.length - 1].state;
            this.#applySnapshotTargets(s);
            return;
        }

        const range = after.time - before.time;
        const rawT = range > 0 ? (renderTime - before.time) / range : 1;
        const t = Math.min(rawT, 1);

        const bs = before.state;
        const as_ = after.state;

        const ownKey = this.playerIsBottom ? 'bottom' : 'top';
        const oppKey = this.playerIsBottom ? 'top' : 'bottom';
        const ownPlayer = this.playerIsBottom ? this.bottomPlayer : this.topPlayer;

        // Ball target (interpolate or extrapolate)
        if (bs.ball && as_.ball) {
            let bx, by;
            if (rawT <= 1) {
                bx = this.#lerp(bs.ball.x, as_.ball.x, t);
                by = this.#lerp(bs.ball.y, as_.ball.y, t);
            } else {
                const overshoot = Math.min((renderTime - after.time) / 1000, 0.05);
                bx = as_.ball.x + as_.ball.vx * overshoot;
                by = as_.ball.y + as_.ball.vy * overshoot;
            }
            this.#serverBallTarget = {
                x: bx, y: by,
                vx: as_.ball.vx, vy: as_.ball.vy,
            };
        }

        // Opponent target
        if (bs[oppKey] && as_[oppKey]) {
            const ot = Math.min(rawT, 2);   // extrapolate linearly for opponent
            this.#serverOppTarget = {
                x: this.#lerp(bs[oppKey].x, as_[oppKey].x, ot),
                y: this.#lerp(bs[oppKey].y, as_[oppKey].y, ot),
            };
        }

        // Own character — trust client prediction fully.
        // Only correct on large discrepancy (stun, teleport, power-up push).
        // Uses LATEST snapshot (not interpolated) to avoid correcting toward stale data.
        if (as_[ownKey] && ownPlayer) {
            const dx = as_[ownKey].x - ownPlayer.x;
            const dy = as_[ownKey].y - ownPlayer.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 40) {
                // Teleport-level — hard snap
                ownPlayer.x = as_[ownKey].x;
                ownPlayer.y = as_[ownKey].y;
            } else if (dist > 15) {
                // Moderate mismatch — gentle nudge
                ownPlayer.x += dx * 0.1;
                ownPlayer.y += dy * 0.1;
            }
            // Below 15px: trust client prediction entirely
        }

        // Extra balls — sync count and set positions
        const snapExtra = as_.extraBalls ?? [];
        while (this.extraBalls.length > snapExtra.length) this.extraBalls.pop();
        while (this.extraBalls.length < snapExtra.length) this.extraBalls.push(new Ball());
        for (let i = 0; i < snapExtra.length; i++) {
            const seb = snapExtra[i];
            const bseb = bs.extraBalls?.[i];
            if (bseb && rawT <= 1) {
                this.extraBalls[i].x = this.#lerp(bseb.x, seb.x, t);
                this.extraBalls[i].y = this.#lerp(bseb.y, seb.y, t);
            } else {
                this.extraBalls[i].x = seb.x;
                this.extraBalls[i].y = seb.y;
            }
            this.extraBalls[i].vx = seb.vx;
            this.extraBalls[i].vy = seb.vy;
        }
    }

    /**
     * Fallback: extract targets from a single snapshot (no interpolation pair).
     */
    #applySnapshotTargets(s) {
        const ownKey = this.playerIsBottom ? 'bottom' : 'top';
        const oppKey = this.playerIsBottom ? 'top' : 'bottom';
        const ownPlayer = this.playerIsBottom ? this.bottomPlayer : this.topPlayer;

        if (s.ball) {
            this.#serverBallTarget = {
                x: s.ball.x, y: s.ball.y,
                vx: s.ball.vx, vy: s.ball.vy,
            };
        }
        if (s[oppKey]) {
            this.#serverOppTarget = { x: s[oppKey].x, y: s[oppKey].y };
        }
        if (s[ownKey] && ownPlayer) {
            const dx = s[ownKey].x - ownPlayer.x;
            const dy = s[ownKey].y - ownPlayer.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 40) {
                ownPlayer.x = s[ownKey].x;
                ownPlayer.y = s[ownKey].y;
            } else if (dist > 15) {
                ownPlayer.x += dx * 0.1;
                ownPlayer.y += dy * 0.1;
            }
        }

        // Extra balls
        const snapExtra = s.extraBalls ?? [];
        while (this.extraBalls.length > snapExtra.length) this.extraBalls.pop();
        while (this.extraBalls.length < snapExtra.length) this.extraBalls.push(new Ball());
        for (let i = 0; i < snapExtra.length; i++) {
            this.extraBalls[i].x = snapExtra[i].x;
            this.extraBalls[i].y = snapExtra[i].y;
            this.extraBalls[i].vx = snapExtra[i].vx;
            this.extraBalls[i].vy = snapExtra[i].vy;
        }
    }

    #lerp(a, b, t) {
        return a + (b - a) * t;
    }

    /** Clear interpolation buffer (call on round/match reset). */
    clearNetBuffer() {
        this.#netBuffer.length = 0;
        this.#serverBallTarget = null;
        this.#serverOppTarget = null;
    }
}
