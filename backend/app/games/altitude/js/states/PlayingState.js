/**
 * PlayingState — Main gameplay state (orchestrator).
 *
 * Delegates to focused subsystems following SOLID principles:
 *   - CameraController   (camera tracking)
 *   - EntityManager       (entity lifecycle)
 *   - CollisionSystem     (collision detection & response)
 *   - HUDRenderer         (all HUD rendering)
 *   - FloatingTextManager (transient text labels)
 *   - GameMode strategy   (LevelMode / InfiniteMode)
 *   - TimeBonusCalculator (medal/bonus logic)
 */

import { State } from './State.js';
import { DESIGN_WIDTH, DESIGN_HEIGHT, COLORS, GAME_SETTINGS, QUALITY } from '../config/Constants.js';
import { bitmapFont } from '../graphics/BitmapFont.js';
import { Player } from '../entities/Player.js';

// Extracted subsystems
import { CameraController }   from '../systems/CameraController.js';
import { EntityManager }       from '../systems/EntityManager.js';
import { CollisionSystem }     from '../systems/CollisionSystem.js';
import { FloatingTextManager } from '../systems/FloatingTextManager.js';
import { HUDRenderer }         from '../graphics/HUDRenderer.js';

// Mode strategies
import { LevelMode }    from './modes/LevelMode.js';
import { InfiniteMode } from './modes/InfiniteMode.js';

export class PlayingState extends State {
    // ── Subsystems (created fresh each enter()) ───────────────────
    #player         = null;
    #mode           = null;   // GameMode strategy
    #camera         = null;   // CameraController
    #entities       = null;   // EntityManager
    #collisions     = null;   // CollisionSystem
    #hud            = null;   // HUDRenderer
    #floatingTexts  = null;   // FloatingTextManager

    // HUD state (simple scalars kept here, not worth a class)
    #hudFlash    = 0;
    #comboDisplay = 0;

    // Background cache (tightly coupled to canvas, stays here)
    #bgGradient  = null;
    #bgZoneColor = null;
    #starCanvas  = null;
    #starCanvasH = 0;

    // ══════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ══════════════════════════════════════════════════════════════

    enter() {
        this._game.startSession();
        const stats = this._game.getPlayerStats();

        // Create subsystems
        this.#camera        = new CameraController();
        this.#entities      = new EntityManager();
        this.#collisions    = new CollisionSystem();
        this.#hud           = new HUDRenderer();
        this.#floatingTexts = new FloatingTextManager();

        // Select mode strategy (Open/Closed — new modes don't touch this class)
        this.#mode = this._game.infiniteMode
            ? new InfiniteMode()
            : new LevelMode(this._game.currentLevel);

        // Delegate initialisation to the mode
        const { playerStartY, pendingLives } = this.#mode.init(this.#entities, stats, this._game);

        // Create player
        this.#player = new Player(DESIGN_WIDTH / 2, playerStartY, stats);

        // Carry over lives from previous level (if any)
        if (pendingLives !== null) {
            this.#player.setLives(pendingLives);
            this._game.pendingLives = null;
        }

        this._game.particles.clear();
    }

    exit() {
        this.#player        = null;
        this.#mode          = null;
        this.#camera        = null;
        this.#entities      = null;
        this.#collisions    = null;
        this.#hud           = null;
        this.#floatingTexts = null;
        this.#bgGradient    = null;
        this.#bgZoneColor   = null;
        this.#starCanvas    = null;
    }

    // ══════════════════════════════════════════════════════════════
    // UPDATE
    // ══════════════════════════════════════════════════════════════

    update(dt) {
        if (!this.#player) return;

        // Pause
        if (this._game.input.pauseJustPressed) {
            this._game.input.consumePause();
            this._game.fsm.transition('pause');
            return;
        }

        // Mode timers (level timer / checkpoint timer)
        this.#mode.updateTimers(dt);

        // Player input + physics
        this.#updatePlayer(dt);

        // Camera
        this.#camera.update(dt, this.#player.y, DESIGN_HEIGHT);

        // Level completion / infinite expansion
        if (this.#mode.checkCompletion(dt, this.#player, this._game, this.#entities, this.#floatingTexts)) {
            return;
        }

        // Entities
        this.#entities.updateAll(dt, this.#player);

        // Collisions
        this.#collisions.checkAll(
            this.#player,
            this.#entities,
            this._game,
            this.#floatingTexts,
            this.#camera.y,
            () => this.#gameOver(),
        );

        // Death from falling
        this.#checkDeath();

        // Score (altitude)
        this._game.setAltitude(-this.#player.y);

        // Cleanup off-screen entities
        this.#entities.cleanup(this.#camera.y);

        // HUD effects
        if (this.#collisions.hudFlash) this.#hudFlash = 1;
        if (this.#hudFlash > 0) this.#hudFlash -= dt * 2;
        this.#comboDisplay = this.#player.combo;

        // Floating texts
        this.#floatingTexts.update(dt);
    }

    // ── Player input handling ─────────────────────────────────────

    #updatePlayer(dt) {
        const input = this._game.input;

        // Jump
        if (input.jumpJustPressed) {
            if (this.#player.jump(this._game.sound)) {
                this._game.particles.jumpDust(this.#player.x, this.#player.bottom);
            }
            input.consumeJump();
        }

        // Double jump via quick tap
        if (input.justTapped && this.#player.canDoubleJump) {
            if (this.#player.jump(this._game.sound)) {
                this._game.particles.jumpDust(this.#player.x, this.#player.bottom);
            }
        }

        // Air dash
        if (input.dashLeft) {
            if (this.#player.dash(-1, this._game.sound)) this.#dashBurst(-1);
            input.consumeDash();
        } else if (input.dashRight) {
            if (this.#player.dash(1, this._game.sound)) this.#dashBurst(1);
            input.consumeDash();
        }

        // Physics
        this.#player.update(dt, input, DESIGN_WIDTH);

        // Continuous dash trail
        if (this.#player.isDashing) {
            this._game.particles.trail(this.#player.x, this.#player.y, {
                color: '#88ddff',
                size: 5,
                sizeEnd: 0,
                life: 0.15,
                alpha: 0.5,
                alphaEnd: 0,
            });
        }
    }

    #dashBurst(direction) {
        this._game.particles.burst(this.#player.x, this.#player.y, {
            color: '#88ddff',
            size: 7,
            sizeEnd: 0,
            life: 0.25,
            speed: 120,
            angle: direction > 0 ? 180 : 0,
            spread: 50,
            alpha: 0.8,
            alphaEnd: 0,
        }, 10);
        this._game.shake.shake(4, 0.08);
    }

    #checkDeath() {
        const deathThreshold = this.#camera.y + DESIGN_HEIGHT + GAME_SETTINGS.DEATH_FALL_THRESHOLD;
        if (this.#player.y > deathThreshold) {
            this.#gameOver();
        }
    }

    #gameOver() {
        this._game.sound.playDeath();
        this._game.shake.shake(20, 0.5);

        this._game.particles.burst(this.#player.x, this.#player.y, {
            color: COLORS.PLAYER_PRIMARY,
            size: 8,
            sizeEnd: 0,
            life: 1,
            speed: 200,
            spread: 360,
        }, 30);

        setTimeout(() => {
            this._game.endSession();
            this._game.fsm.transition('gameOver');
        }, 800);
    }

    // ══════════════════════════════════════════════════════════════
    // DRAW
    // ══════════════════════════════════════════════════════════════

    draw(ctx) {
        this.#drawBackground(ctx);

        // Entities
        this.#entities.drawAll(ctx, this.#camera.y);

        // Infinite mode checkpoint lines
        if (this.#mode.isInfinite) {
            this.#drawInfiniteCheckpoints(ctx);
        }

        // Player
        if (this.#player?.active) {
            this.#player.draw(ctx, this.#camera.y);
        }

        // Particles
        this._game.particles.draw(ctx, this.#camera.y);

        // HUD (delegated to HUDRenderer)
        this.#hud.draw(ctx, this._game, this.#player, {
            isInfinite:       this.#mode.isInfinite,
            levelTimer:       this.#mode.levelTimer,
            parScreenCount:   this.#mode.parScreenCount,
            levelTotalClimb:  this.#mode.levelTotalClimb,
            levelGoalY:       this.#mode.levelGoalY,
            infScreenTimer:   this.#mode.infScreenTimer,
            infLastCpTime:    this.#mode.infLastCpTime,
            infScreenCleared: this.#mode.infScreenCleared,
            infCheckpointAnim: this.#mode.infCheckpointAnim,
            hudFlash:         this.#hudFlash,
            comboDisplay:     this.#comboDisplay,
        }, this.#floatingTexts);
    }

    // ── Background (kept here — tightly coupled to canvas caching) ─

    #drawBackground(ctx) {
        const zone = this._game.getCurrentZone();

        if (this.#bgZoneColor !== zone.bgColor) {
            this.#bgZoneColor = zone.bgColor;
            this.#bgGradient = ctx.createLinearGradient(0, 0, 0, DESIGN_HEIGHT);
            this.#bgGradient.addColorStop(0, zone.bgColor);
            this.#bgGradient.addColorStop(1, COLORS.BG_SECONDARY);
        }
        ctx.fillStyle = this.#bgGradient;
        ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

        this.#drawStars(ctx);

        bitmapFont.drawText(ctx, zone.name, 10, DESIGN_HEIGHT - 16, 12, { alpha: 0.3 });
    }

    #ensureStarCanvas() {
        const h = DESIGN_HEIGHT + 100;
        if (this.#starCanvas) return;
        this.#starCanvasH = h;
        const c = document.createElement('canvas');
        c.width = DESIGN_WIDTH;
        c.height = h;
        const sc = c.getContext('2d');
        sc.fillStyle = 'rgba(255, 255, 255, 0.5)';
        const count = QUALITY.STAR_COUNT;
        for (let i = 0; i < count; i++) {
            const x = (i * 47 + 23) % DESIGN_WIDTH;
            const y = (i * 73) % h;
            const size = 1 + (i % 3);
            sc.beginPath();
            sc.arc(x, y, size, 0, Math.PI * 2);
            sc.fill();
        }
        this.#starCanvas = c;
    }

    #drawStars(ctx) {
        this.#ensureStarCanvas();
        const offset = ((this.#camera.y * 0.1) % this.#starCanvasH + this.#starCanvasH) % this.#starCanvasH;
        ctx.drawImage(this.#starCanvas, 0, -offset);
        if (offset > 0) {
            ctx.drawImage(this.#starCanvas, 0, this.#starCanvasH - offset);
        }
    }

    // ── Infinite mode checkpoint finish lines ─────────────────────

    #drawInfiniteCheckpoints(ctx) {
        const SQ_W = 20;
        const SQ_H = 14;
        const HALF = SQ_H / 2;
        const cols = Math.ceil(DESIGN_WIDTH / SQ_W);
        const CP = 5 * DESIGN_HEIGHT;
        const camY = this.#camera.y;
        const nMin = Math.ceil((-DESIGN_HEIGHT - camY) / CP);
        const nMax = Math.floor(-camY / CP);

        ctx.save();

        for (let n = Math.max(1, nMin); n <= nMax; n++) {
            const worldY = -n * CP;
            const sy = worldY - camY;

            // Glow line
            ctx.shadowColor = 'rgba(255,255,255,0.8)';
            ctx.shadowBlur = 8;
            ctx.strokeStyle = 'rgba(255,255,255,0.55)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, sy);
            ctx.lineTo(DESIGN_WIDTH, sy);
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Two-row racing-flag checker
            for (let col = 0; col < cols; col++) {
                const x = col * SQ_W;
                const top1dark = col % 2 === 0;
                ctx.fillStyle = top1dark ? '#000000' : '#ffffff';
                ctx.globalAlpha = 0.90;
                ctx.fillRect(x, sy, SQ_W, HALF);
                ctx.fillStyle = top1dark ? '#ffffff' : '#000000';
                ctx.fillRect(x, sy + HALF, SQ_W, HALF);
            }
            ctx.globalAlpha = 1;

            // Floor label
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            bitmapFont.drawText(ctx, `FLOOR ${n * 5}`, DESIGN_WIDTH / 2, sy - 7, 10, {
                align: 'center',
                color: '#ffffff',
            });
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }
}
