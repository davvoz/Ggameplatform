import { State } from './State.js';
import {
    ARENA_LEFT, ARENA_RIGHT, ARENA_TOP, ARENA_BOTTOM,
    POWERUP_SPAWN_INTERVAL, MAX_ACTIVE_POWERUPS, COLORS,
    DESIGN_WIDTH, DESIGN_HEIGHT, UI_FONT,
} from '../config/Constants.js';
import { HUD } from '../ui/UIManager.js';
import { CollisionSystem } from '../physics/CollisionSystem.js';
import { spawnRandomPowerUp } from '../entities/PowerUp.js';
import { POWERUP_TYPES } from '../powerups/PowerUpTypes.js';

/**
 * Main gameplay state — handles game logic, collisions, power-ups, input.
 */
export class PlayingState extends State {
    #powerUpTimer = 0;
    #lastHitter = null;
    /** Characters the fireball is currently passing through — skip collision */
    #noCollide = new Map();
    /** Per-character hit cooldown (ms) — prevents multi-frame collision spam */
    #hitCooldown = new Map();
    /** Track whether we've played the super-ready chime for each player */
    #superReadyPlayed = { top: false, bottom: false };
    /** Counter for unique power-up network IDs */

    enter(data) {
        this.#powerUpTimer = 0;
        this.#lastHitter = null;
        this.#noCollide.clear();
        this.#hitCooldown.clear();
        this.#superReadyPlayed = { top: false, bottom: false };
        this._game.extraBalls.length = 0;
        // Only unfreeze ball locally in CPU mode — in multiplayer the server controls the ball.
        if (this._game.isVsCPU) {
            this._game.ball.unfreeze();
        }
        this._game.ui.clearButtons();
        this._game.sound.stopMusic();
        this._game.sound.playGameMusic();

        // Handle opponent disconnect during match
        if (!this._game.isVsCPU) {
            this._game.network.on('opponentLeft', () => {
                // Opponent left mid-match — treat as win, award full pot
                const betAmount = this._game.betAmount ?? 0;
                if (betAmount > 0) {
                    this._game.platform.awardCoins(betAmount * 2, 'Pong bet won - opponent left');
                }
                this._game.network.disconnect();
                this._game.fsm.transition('menu');
            });
        }
    }

    exit() {
        if (!this._game.isVsCPU) {
            this._game.network?.off('opponentLeft');
        }
    }

    update(dt) {
        const game = this._game;

        // Update input
        game.input.update();

        if (game.isVsCPU) {
            this.#updateCPUMode(dt);
        } else {
            this.#updateMultiplayerMode(dt);
        }

        // Update power-ups (visual update — both modes)
        for (const pu of game.powerUps) {
            pu.update(dt);
        }

        // Update field objects
        game.updateFieldObjects(dt);

        // Update obstacles
        for (const obs of game.obstacles) {
            obs.update(dt);
        }

        // Update graphics
        game.shake.update(dt);
        game.particles.update(dt);
        game.tweens.update(dt);
    }

    #updateCPUMode(dt) {
        const game = this._game;

        // CPU/Story mode — full local authority (unchanged)
        game.bottomPlayer.move(game.input.dx, game.input.dy, dt);
        const aiInput = game.ai.computeInput(
            game.topPlayer, game.ball, game.powerUps, dt
        );
        game.topPlayer.move(aiInput.dx, aiInput.dy, dt);

        for (const obs of game.obstacles) {
            obs.pushCharacterOut(game.bottomPlayer);
            obs.pushCharacterOut(game.topPlayer);
        }

        game.topPlayer.update(dt);
        game.bottomPlayer.update(dt);
        game.ball.update(dt);

        if (game.ball.consumeWallHit()) {
            game.sound.playWallHit();
        }

        this.#updateTimers(dt);
        this.#updateExtraBalls(dt);
        this.#spawnPowerUps(dt);

        // Collisions & goals
        this.#handleCollisions();
        this.#checkGoals();
    }

    #updateMultiplayerMode(dt) {
        const game = this._game;

        // Multiplayer — server-authoritative
        // Predict own character locally for responsive feel
        const ownPlayer = game.playerIsBottom ? game.bottomPlayer : game.topPlayer;
        ownPlayer.move(game.input.dx, game.input.dy, dt);

        // Send input to server
        game.network.sendInput({ dx: game.input.dx, dy: game.input.dy });

        // Update character animations/effects (visual only)
        game.topPlayer.update(dt);
        game.bottomPlayer.update(dt);

        // No physics, collisions, goals, or power-up spawning —
        // the server handles all of that and sends events.
    }

    #updateTimers(dt) {
        // Decrement fireball no-collide timers
        for (const [char, timer] of this.#noCollide) {
            const t = timer - dt;
            if (t <= 0) this.#noCollide.delete(char);
            else this.#noCollide.set(char, t);
        }
        // Decrement hit cooldown timers
        for (const [char, timer] of this.#hitCooldown) {
            const t = timer - dt;
            if (t <= 0) this.#hitCooldown.delete(char);
            else this.#hitCooldown.set(char, t);
        }
    }

    #updateExtraBalls(dt) {
        // Update extra balls
        for (const eb of this._game.extraBalls) {
            eb.update(dt);
        }
    }

    #spawnPowerUps(dt) {
        const game = this._game;

        // Power-up spawning
        this.#powerUpTimer += dt;
        if (this.#powerUpTimer >= POWERUP_SPAWN_INTERVAL &&
            game.powerUps.filter(p => p.alive).length < MAX_ACTIVE_POWERUPS) {
            this.#powerUpTimer = 0;
            const pu = spawnRandomPowerUp(POWERUP_TYPES);
            game.addPowerUp(pu);
        }
    }

    draw(ctx) {
        this._game.drawArena(ctx);

        // Pulsing deuce / advantage border
        HUD.drawDeuceBorder(ctx, this._game.isDeuce, this._game.advantage);

        // Obstacles
        for (const obs of this._game.obstacles) {
            obs.draw(ctx);
        }

        // Field objects (shields, gravity wells)
        for (const obj of this._game.fieldObjects) {
            obj.draw(ctx);
        }

        // Power-ups
        for (const pu of this._game.powerUps) {
            pu.draw(ctx);
        }

        // Extra balls
        for (const eb of this._game.extraBalls) {
            eb.draw(ctx);
        }

        // Main ball
        this._game.ball.draw(ctx);

        // Characters
        this._game.topPlayer.draw(ctx);
        this._game.bottomPlayer.draw(ctx);

        // Particles on top
        this._game.particles.draw(ctx);

        // HUD
        HUD.drawSuperBars(ctx, this._game.topPlayer, this._game.bottomPlayer);
        HUD.drawJoystickHint(ctx, this._game.input);

        // Ping indicator (multiplayer only)
        if (!this._game.isVsCPU) {
            const rtt = Math.round(this._game.network.rtt);
            let color;
            if (rtt < 80) {
                color = COLORS.NEON_GREEN;
            } else if (rtt < 150) {
                color = COLORS.NEON_YELLOW;
            } else {
                color = COLORS.NEON_RED;
            }
            ctx.save();
            ctx.font = `7px ${UI_FONT}`;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.6;
            ctx.fillText(`${rtt}ms`, DESIGN_WIDTH - 14, DESIGN_HEIGHT - 18);
            ctx.restore();
        }
    }

    #handleCollisions() {
        const game = this._game;
        const ball = game.ball;

        // Ball vs characters (with fireball pass-through)
        this.#checkBallVsCharacter(ball, game.bottomPlayer, game);
        this.#checkBallVsCharacter(ball, game.topPlayer, game);

        // Ball vs power-ups
        this.#handlePowerUpCollisions(game);

        // Ball vs field objects (shields)
        this.#handleFieldObjectCollisions(game);

        // Ball vs obstacles (non-destructible)
        this.#handleObstacleCollisions(game);

        // Extra ball collisions & goals
        this.#handleExtraBallCollisions(game);
    }

    #handlePowerUpCollisions(game) {
        const ball = game.ball;
        const allPowerUps = [...game.powerUps];
        for (const pu of allPowerUps) {
            if (CollisionSystem.checkBallPowerUp(ball, pu)) {
                const collector = this.#lastHitter ?? game.bottomPlayer;
                this.#applyPowerUp(pu, collector);
                continue;
            }

            const collectedByBottom = CollisionSystem.checkCharacterPowerUp(game.bottomPlayer, pu);
            if (collectedByBottom) {
                this.#applyPowerUp(pu, game.bottomPlayer);
                continue;
            }

            const collectedByTop = CollisionSystem.checkCharacterPowerUp(game.topPlayer, pu);
            if (collectedByTop) {
                this.#applyPowerUp(pu, game.topPlayer);
            }
        }
    }

    #handleFieldObjectCollisions(game) {
        const ball = game.ball;
        for (const obj of game.fieldObjects) {
            if (obj.checkBallCollision?.(ball)) {
                ball.vy = -ball.vy;
                ball.triggerImpact();
                obj.destroy();
                game.shake.trigger(5, 150);
                game.sound.playShieldHit();
                game.particles.emit(ball.x, ball.y, 15, {
                    colors: [COLORS.NEON_CYAN, '#ffffff'],
                });
            }
        }
    }

    #handleObstacleCollisions(game) {
        const ball = game.ball;
        for (const obs of game.obstacles) {
            if (obs.checkBallCollision(ball)) {
                game.sound.playWallHit();
                game.shake.trigger(2, 80);
            }
        }
    }

    #handleExtraBallCollisions(game) {
        for (let i = game.extraBalls.length - 1; i >= 0; i--) {
            const eb = game.extraBalls[i];
            const goalResult = eb.checkGoal();
            if (goalResult !== 0) {
                this.#handleExtraBallGoal(eb, goalResult, i, game);
                return; // Exit — scoreGoal transitions state
            }
            // Extra balls bounce off characters normally
            CollisionSystem.checkBallCharacter(eb, game.bottomPlayer);
            CollisionSystem.checkBallCharacter(eb, game.topPlayer);
            // Extra balls vs shields
            for (const obj of game.fieldObjects) {
                if (obj.checkBallCollision?.(eb)) {
                    eb.vy = -eb.vy;
                    obj.destroy();
                    game.sound.playShieldHit();
                }
            }
            // Extra balls vs obstacles
            for (const obs of game.obstacles) {
                obs.checkBallCollision(eb);
            }
        }
    }

    #handleExtraBallGoal(eb, goalResult, index, game) {
        const scorerId = goalResult === 1 ? 'bottom' : 'top';
        game.extraBalls.splice(index, 1);
        game.shake.trigger(4, 150);
        game.sound.playGoal();
        const goalX = (ARENA_LEFT + ARENA_RIGHT) / 2;
        const goalY = goalResult === 1 ? ARENA_TOP : ARENA_BOTTOM;
        game.particles.emit(goalX, goalY, 20, {
            colors: [COLORS.NEON_YELLOW, '#ffffff'],
            speedMin: 30, speedMax: 120,
        });
        game.scoreGoal(scorerId);
    }

    /** Handle ball vs character collision with fireball pass-through logic. */
    #checkBallVsCharacter(ball, character, game) {
        // Skip if on hit cooldown (prevents multi-frame collision spam)
        if (this.#hitCooldown.has(character)) return;
        // Skip if fireball is passing through this character
        if (this.#noCollide.has(character)) return;

        // Fireball pass-through: ball passes through the OPPONENT of lastHitter
        const isFireball = ball.isFireball;
        const isOpponent = this.#lastHitter && this.#lastHitter !== character;

        if (isFireball && isOpponent) {
            this.#handleFireballPassThrough(ball, character, game);
            return;
        }

        // Normal collision
        if (CollisionSystem.checkBallCharacter(ball, character)) {
            this.#handleNormalCollision(character, ball, game);
        }
    }

    #handleFireballPassThrough(ball, character, game) {
        // Check overlap manually (don't bounce)
        const dx = ball.x - character.x;
        const dy = ball.y - character.y;
        const dist = Math.hypot(dx, dy);
        const minDist = ball.radius + character.hitboxRadius;
        if (dist < minDist) {
            // Fireball passes through! Consume and add cooldown
            ball.consumeFireball();
            this.#noCollide.set(character, 400);
            game.shake.trigger(6, 200);
            game.particles.emit(ball.x, ball.y, 25, {
                colors: [COLORS.NEON_ORANGE, COLORS.NEON_RED, '#ffff00'],
                speedMin: 40, speedMax: 120,
                sizeMin: 2, sizeMax: 5,
            });
        }
    }

    #handleNormalCollision(character, ball, game) {
        this.#hitCooldown.set(character, 150); // 150ms cooldown
        character.playHit();
        game.shake.trigger(3, 100);
        game.sound.playPaddleHit();
        this.#lastHitter = character;
        game.particles.emit(ball.x, ball.y, 8, {
            colors: [character.data.palette.accent, '#ffffff'],
            speedMin: 20, speedMax: 80,
        });

        // Super shot — triggers automatically on hit when bar is full
        if (character.superReady) {
            character.consumeSuper();
            this.#executeSuperShot(character, ball, game);
            const key = character === game.topPlayer ? 'top' : 'bottom';
            this.#superReadyPlayed[key] = false;
        }

        // Charge super on every hit
        const wasReady = character.superReady;
        character.chargeSuper(20);
        // Play chime when bar just filled
        if (!wasReady && character.superReady) {
            game.sound.playSuperReady();
            const key = character === game.topPlayer ? 'top' : 'bottom';
            this.#superReadyPlayed[key] = true;
        }
    }

    #applyPowerUp(powerUp, collector) {
        const game = this._game;
        game.sound.playPowerUp();
        powerUp.type.apply(game, collector);
        game.particles.emit(powerUp.x, powerUp.y, 20, {
            colors: [powerUp.type.color, '#ffffff'],
            speedMin: 30, speedMax: 100,
        });

        // Track powerups collected for quest progress
        const isLocalPlayer = game.playerIsBottom
            ? !collector.isTopPlayer
            : collector.isTopPlayer;
        if (isLocalPlayer) {
            game.powerupsCollected++;
        }

        // Charge super on power-up collect
        const wasReady = collector.superReady;
        collector.chargeSuper(15);
        if (!wasReady && collector.superReady) {
            game.sound.playSuperReady();
        }

        game.cleanupPowerUps();
    }

    /**
     * Execute a character's unique super shot.
     * Called automatically when a player with full super hits the ball.
     */
    #executeSuperShot(character, ball, game) {
        game.sound.playSuperShot();
        game.shake.trigger(10, 400);

        // Big particle burst with character colors
        game.particles.emit(character.x, character.y, 35, {
            colors: [character.data.palette.primary, character.data.palette.accent, '#ffffff'],
            speedMin: 50, speedMax: 160,
            sizeMin: 2, sizeMax: 5,
        });

        const opponent = game.getOpponent(character);
        character.data.superShot.execute(character, ball, game, opponent);
    }

    #checkGoals() {
        const game = this._game;
        const goalResult = game.ball.checkGoal();

        if (goalResult === 0) return;

        // goal scored
        const scorerId = goalResult === 1 ? 'bottom' : 'top';

        game.ball.freeze();
        game.shake.trigger(8, 300);
        game.sound.playGoal();

        // Goal explosion
        const goalX = (ARENA_LEFT + ARENA_RIGHT) / 2;
        const goalY = goalResult === 1 ? ARENA_TOP : ARENA_BOTTOM;
        game.particles.emit(goalX, goalY, 40, {
            colors: [COLORS.NEON_GREEN, COLORS.NEON_YELLOW, '#ffffff'],
            speedMin: 40, speedMax: 160,
            sizeMin: 2, sizeMax: 6,
            lifeMin: 500, lifeMax: 1500,
        });

        game.scoreGoal(scorerId);
    }
}
