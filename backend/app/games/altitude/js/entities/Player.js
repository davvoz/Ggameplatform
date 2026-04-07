/**
 * Player - The player character entity
 * Handles movement, jumping, abilities, and rendering.
 */

import { GameObject } from './GameObject.js';
import { PHYSICS, DESIGN_WIDTH, COLORS } from '../config/Constants.js';
import { SpriteGenerator } from '../graphics/SpriteGenerator.js';
import { PlayerOverlayManager } from './PlayerOverlayRenderer.js';

export class Player extends GameObject {
    // State
    #grounded = false;
    #jumping = false;
    #canDoubleJump = false;
    #ghostRepelCooldown = 0;  // counts down to 0 = ready
    #dashesRemaining = 0;
    #facingRight = true;
    #invincible = false;
    #invincibleTimer = 0;
    #animFrame = 0;
    #animTimer = 0;
    #currentAnim = 'idle';

    // Stats (from upgrades)
    #stats = null;

    // Power-up states
    #jetpackActive = false;
    #jetpackTimer = 0;
    #shieldActive = false;
    #shieldTimer = 0;
    #magnetActive = false;
    #magnetTimer = 0;
    #springBootsActive = false;
    #springBootsTimer = 0;
    #slowTimeActive = false;
    #slowTimeTimer = 0;
    #doubleCoinsActive = false;
    #doubleCoinsTimer = 0;

    // Combat
    #lives = 1;
    #combo = 0;
    #comboTimer = 0;

    // Glide
    #gliding = false;

    // Dash state
    #dashing = false;
    #dashTimer = 0;
    static #DASH_DURATION = 0.18; // seconds of dash (invincible + kills enemies)

    // Landing squash timer
    #landTimer = 0;

    // Spike-head perk
    static #SPIKE_COOLDOWN = 3.0;  // seconds to regenerate one spike
    #spikeTimers = [];              // per-spike cooldown remaining (0 = ready)
    #spikeHasteActive = false;
    #spikeHasteTimer  = 0;

    // Perk visual overlay renderer
    #overlays = new PlayerOverlayManager();

    constructor(x, y, stats = {}) {
        super(x, y, 34, 42);
        this.tag = 'player';
        
        this.#stats = {
            jumpMultiplier: 1,
            ghostRepelLevel: 0,
            hasDoubleJump: false,
            hasGlide: false,
            dashCount: 0,
            stompMultiplier: 1,
            hasShockwave: false,
            knockbackResist: 0,
            extraLives: 0,
            magnetRange: 0,
            coinMultiplier: 1,
            powerupDuration: 1,
            scoreMultiplier: 1,
            comboKeeper: 1,
            spikeCount: 0,
            ...stats
        };

        this.#lives = this.maxLives;
        this.#dashesRemaining = this.#stats.dashCount;
        this.#spikeTimers = Array(this.#stats.spikeCount ?? 0).fill(0);
    }

    get isGrounded() { return this.#grounded; }
    get isJumping() { return this.#jumping; }
    get isGliding() { return this.#gliding; }
    get isInvincible() { return this.#invincible || this.#shieldActive || this.#dashing; }
    get isDashing() { return this.#dashing; }
    get lives() { return this.#lives; }
    get maxLives() { return 2 + (this.#stats.extraLives ?? 0); }
    get combo() { return this.#combo; }
    get comboTimer() { return this.#comboTimer; }
    get stats() { return this.#stats; }
    get grounded() { return this.#grounded; }
    get canDoubleJump() { return this.#canDoubleJump; }
    get dashesRemaining() { return this.#dashesRemaining; }
    get dashCount() { return this.#stats.dashCount ?? 0; }

    // Ghost Repel perk
    get ghostRepelReady() {
        return this.#stats.ghostRepelLevel > 0 && this.#ghostRepelCooldown <= 0;
    }
    get ghostRepelCooldown() { return this.#ghostRepelCooldown; }
    get ghostRepelMaxCooldown() {
        const cd = [60, 50, 40, 30, 20, 10];
        return cd[this.#stats.ghostRepelLevel] ?? 0;
    }
    triggerGhostRepel() {
        this.#ghostRepelCooldown = this.ghostRepelMaxCooldown;
    }

    // Power-up getters
    get hasJetpack() { return this.#jetpackActive; }
    get hasShield() { return this.#shieldActive; }
    get hasMagnet() { return this.#magnetActive; }
    get hasSpringBoots() { return this.#springBootsActive; }
    get hasSlowTime() { return this.#slowTimeActive; }
    get hasDoubleCoins() { return this.#doubleCoinsActive; }

    get magnetRange() {
        const baseRange = this.#stats.magnetRange;
        return this.#magnetActive ? baseRange + 100 : baseRange;
    }

    get coinMultiplier() {
        let mult = this.#stats.coinMultiplier;
        if (this.#doubleCoinsActive) mult *= 2;
        return mult;
    }

    get jumpForce() {
        let force = PHYSICS.PLAYER_JUMP_FORCE * this.#stats.jumpMultiplier;
        if (this.#springBootsActive) force *= 1.5;
        return force;
    }

    /**
     * Main update loop
     */
    update(dt, input, worldWidth) {
        this.#updatePowerUps(dt);
        this.#updateCombo(dt);
        this.#updateInvincibility(dt);
        this.#updateMovement(dt, input, worldWidth);
        this.#updateAnimation(dt);
        this.#overlays.update(dt);
    }

    #updatePowerUps(dt) {
        const decay = dt;

        // Dash timer
        if (this.#dashing) {
            this.#dashTimer -= decay;
            if (this.#dashTimer <= 0) this.#dashing = false;
        }

        if (this.#jetpackActive) {
            this.#jetpackTimer -= decay;
            if (this.#jetpackTimer <= 0) this.#jetpackActive = false;
        }
        if (this.#shieldTimer > 0) {
            this.#shieldTimer -= decay;
            if (this.#shieldTimer <= 0) this.#shieldActive = false;
        }
        if (this.#magnetActive) {
            this.#magnetTimer -= decay;
            if (this.#magnetTimer <= 0) this.#magnetActive = false;
        }
        if (this.#springBootsActive) {
            this.#springBootsTimer -= decay;
            if (this.#springBootsTimer <= 0) this.#springBootsActive = false;
        }
        if (this.#slowTimeActive) {
            this.#slowTimeTimer -= decay;
            if (this.#slowTimeTimer <= 0) this.#slowTimeActive = false;
        }
        if (this.#doubleCoinsActive) {
            this.#doubleCoinsTimer -= decay;
            if (this.#doubleCoinsTimer <= 0) this.#doubleCoinsActive = false;
        }
        if (this.#spikeHasteActive) {
            this.#spikeHasteTimer -= decay;
            if (this.#spikeHasteTimer <= 0) this.#spikeHasteActive = false;
        }
        // Tick down spike cooldowns (2.5× faster with haste)
        const spikeRate = this.#spikeHasteActive ? 2.5 : 1;
        this.#spikeTimers = this.#spikeTimers.map(t => Math.max(0, t - decay * spikeRate));

        // Ghost repel cooldown
        if (this.#ghostRepelCooldown > 0) this.#ghostRepelCooldown -= dt;
    }

    #updateCombo(dt) {
        if (this.#comboTimer > 0) {
            this.#comboTimer -= dt;
            if (this.#comboTimer <= 0) {
                this.#combo = 0;
            }
        }
    }

    #updateInvincibility(dt) {
        if (this.#invincible) {
            this.#invincibleTimer -= dt;
            if (this.#invincibleTimer <= 0) {
                this.#invincible = false;
            }
        }
    }

    #updateMovement(dt, input, worldWidth) {
        const moveSpeed = PHYSICS.PLAYER_MOVE_SPEED;

        // Horizontal movement — always full speed
        if (input.left) {
            this.vx -= moveSpeed * dt * 10;
            this.#facingRight = false;
        }
        if (input.right) {
            this.vx += moveSpeed * dt * 10;
            this.#facingRight = true;
        }

        // Apply friction
        this.vx *= PHYSICS.PLAYER_FRICTION;

        // Clamp horizontal speed
        this.vx = Math.max(-moveSpeed, Math.min(moveSpeed, this.vx));

        // Apply jetpack thrust
        if (this.#jetpackActive) {
            this.vy = -400; // Strong upward thrust
        } else {
            // Apply gravity
            this.vy += PHYSICS.GRAVITY * dt;
        }

        // Gliding
        this.#gliding = false;
        if (this.#stats.hasGlide && input.glide && this.vy > 0 && !this.#grounded) {
            this.vy = Math.min(this.vy, 150); // Slow fall
            this.#gliding = true;
        }

        // Clamp fall speed
        this.vy = Math.min(this.vy, PHYSICS.MAX_FALL_SPEED);

        // Apply velocity
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Screen wrapping
        if (this.x < 0) this.x += worldWidth;
        if (this.x > worldWidth) this.x -= worldWidth;

        // Reset grounded (will be set by collision detection)
        this.#grounded = false;
    }

    #updateAnimation(dt) {
        this.#animTimer += dt;

        // Landing squash keeps 'land' anim for a brief window after touching down
        if (this.#landTimer > 0) {
            this.#landTimer -= dt;
        }

        // Determine animation
        let anim = 'idle';
        if (this.#dashing) {
            anim = 'jump'; // stretch-like pose during dash
        } else if (this.#landTimer > 0) {
            anim = 'land';
        } else if (this.#jetpackActive) {
            anim = 'jetpack';
        } else if (!this.#grounded) {
            anim = this.vy < 0 ? 'jump' : 'fall';
        } else if (Math.abs(this.vx) > 10) {
            anim = 'idle'; // Could add run animation
        }

        if (this.#invincible) {
            anim = 'hurt';
        }

        if (anim !== this.#currentAnim) {
            this.#currentAnim = anim;
            this.#animFrame = 0;
            this.#animTimer = 0;
        }

        // Update frame
        const sprite = SpriteGenerator.get('player');
        if (sprite) {
            const animData = sprite.animations[this.#currentAnim];
            if (animData) {
                const frameTime = 1 / animData.speed;
                if (this.#animTimer >= frameTime) {
                    this.#animTimer -= frameTime;
                    this.#animFrame = (this.#animFrame + 1) % animData.count;
                }
            }
        }
    }

    /**
     * Handle jump input
     */
    jump(sound) {
        if (this.#jetpackActive) return false;

        if (this.#grounded) {
            this.vy = -this.jumpForce;
            this.#grounded = false;
            this.#jumping = true;
            this.#canDoubleJump = this.#stats.hasDoubleJump;
            this.#dashesRemaining = this.#stats.dashCount;
            sound?.playJump();
            return true;
        } else if (this.#canDoubleJump) {
            this.vy = -this.jumpForce;
            this.#canDoubleJump = false;
            sound?.playDoubleJump();
            return true;
        }
        return false;
    }

    /**
     * Fire one available spike (called when headbutting an enemy from below).
     * Returns true if a spike was available and consumed.
     */
    fireSpike() {
        const idx = this.#spikeTimers.findIndex(t => t <= 0);
        if (idx === -1) return false;
        this.#spikeTimers[idx] = Player.#SPIKE_COOLDOWN;
        return true;
    }

    get spikeCount() { return this.#stats.spikeCount ?? 0; }

    /**
     * Handle dash input — grants brief invincibility and kills enemies on contact
     */
    dash(direction, sound) {
        if (this.#dashesRemaining > 0 && !this.#grounded) {
            this.vx = direction * 500;
            this.vy = Math.min(this.vy, -80);
            this.#dashesRemaining--;
            this.#dashing = true;
            this.#dashTimer = Player.#DASH_DURATION;
            sound?.playJump();
            return true;
        }
        return false;
    }

    /**
     * Called when landing on a platform
     */
    land(platformY, bounceMultiplier = 1) {
        this.y = platformY - this.height / 2;
        this.vy = -this.jumpForce * bounceMultiplier;
        this.#grounded = true;
        this.#jumping = false;
        this.#canDoubleJump = this.#stats.hasDoubleJump;
        this.#dashesRemaining = this.#stats.dashCount;
        this.#landTimer = 0.22;  // 3 frames @ speed 24 — squash then rise
    }

    /**
     * Called when collecting a coin — increments combo and resets timer.
     * Combo Keeper upgrade extends the window between coins.
     */
    coinCollect() {
        this.#combo++;
        this.#comboTimer = 2 * this.#stats.comboKeeper;
    }

    /**
     * Called when stomping an enemy
     */
    stomp(sound) {
        this.vy = -this.jumpForce * (1 + this.#stats.stompMultiplier * 0.3);
        this.#canDoubleJump = this.#stats.hasDoubleJump;
        this.#dashesRemaining = this.#stats.dashCount;
        this.#combo++;
        this.#comboTimer = 3 * this.#stats.comboKeeper;
        sound?.playStomp();
    }

    /**
     * Take damage
     */
    takeDamage(sound) {
        if (this.#invincible) return false;

        if (this.#shieldActive) {
            this.#shieldActive = false;
            this.#shieldTimer = 0;
            sound?.playHurt();
            return false;
        }

        this.#lives--;
        this.#invincible = true;
        this.#invincibleTimer = 2;
        this.#combo = 0;
        this.#comboTimer = 0;

        sound?.playHurt();

        return this.#lives <= 0;
    }

    /**
     * Add a life
     */
    addLife() {
        this.#lives = Math.min(this.maxLives, this.#lives + 1);
    }

    /**
     * Override current life count (used to carry lives across levels)
     */
    setLives(n) {
        this.#lives = Math.min(this.maxLives, Math.max(0, n));
    }

    /**
     * Activate power-ups
     */
    activatePowerUp(type, duration) {
        const effectiveDuration = duration * this.#stats.powerupDuration;

        switch (type) {
            case 'jetpack':
                this.#jetpackActive = true;
                this.#jetpackTimer = effectiveDuration;
                break;
            case 'shield':
                this.#shieldActive = true;
                this.#shieldTimer = effectiveDuration;
                break;
            case 'magnet':
                this.#magnetActive = true;
                this.#magnetTimer = effectiveDuration;
                break;
            case 'spring_boots':
                this.#springBootsActive = true;
                this.#springBootsTimer = effectiveDuration;
                break;
            case 'slow_time':
                this.#slowTimeActive = true;
                this.#slowTimeTimer = effectiveDuration;
                break;
            case 'double_coins':
                this.#doubleCoinsActive = true;
                this.#doubleCoinsTimer = effectiveDuration;
                break;
            case 'extra_life':
                this.addLife();
                break;
            case 'spike_haste':
                this.#spikeHasteActive = true;
                this.#spikeHasteTimer  = effectiveDuration;
                break;
        }
    }

    /**
     * Draw the player
     */
    draw(ctx, cameraY) {
        const screenX = this.x;
        const screenY = this.y - cameraY;
        const perks   = this.#buildActivePerks();

        // ── Behind-sprite overlays: wings, rocket pods, armour plates ──────
        this.#overlays.drawBehind(ctx, screenX, screenY, this.height, perks);

        ctx.save();
        ctx.translate(screenX, screenY);

        // Flip for facing direction
        if (!this.#facingRight) {
            ctx.scale(-1, 1);
        }

        // Invincibility flash
        if (this.#invincible && Math.floor(this.#invincibleTimer * 10) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // Draw sprite
        const sprite = SpriteGenerator.get('player');
        if (sprite) {
            const animData = sprite.animations[this.#currentAnim];
            if (animData) {
                const frameX = (animData.start + this.#animFrame) * sprite.frameSize;
                ctx.drawImage(
                    sprite.canvas,
                    frameX, 0,
                    sprite.frameSize, sprite.frameSize,
                    -sprite.frameSize / 2, -sprite.frameSize / 2,
                    sprite.frameSize, sprite.frameSize
                );
            }
        } else {
            // Fallback drawing
            ctx.fillStyle = COLORS.PLAYER_PRIMARY;
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        }

        ctx.restore();

        // ── Front overlays: shield, auras, chevrons, jetpack flames ────────
        this.#overlays.draw(ctx, screenX, screenY, this.height, perks);
    }

    /** Builds the perk context object passed to every overlay. */
    #buildActivePerks() {
        return {
            // Active power-ups (temporary)
            jetpack:      this.#jetpackActive,
            shield:       this.#shieldActive,
            magnet:       this.#magnetActive,
            spring_boots: this.#springBootsActive,
            slow_time:    this.#slowTimeActive,
            double_coins: this.#doubleCoinsActive,
            // Permanent stat-based perks
            double_jump:  this.#stats.hasDoubleJump,
            glide:        this.#stats.hasGlide,
            dash:         (this.#stats.dashCount ?? 0) > 0,
            dashCount:    this.#stats.dashCount ?? 0,
            dashRemaining: this.#dashesRemaining,
            dashing:      this.#dashing,
            stomp:        (this.#stats.stompMultiplier ?? 1) > 1,
            shockwave:    !!this.#stats.hasShockwave,
            armor:        (this.#stats.knockbackResist ?? 0) > 0,
            spike_head:   (this.#stats.spikeCount ?? 0) > 0,
            // Spike state for overlay
            spikeCount:   this.#stats.spikeCount ?? 0,
            spikeTimers:  [...this.#spikeTimers],
            spikeCooldown: Player.#SPIKE_COOLDOWN,
            spike_haste:  this.#spikeHasteActive,
            // Ghost repel state for overlay
            ghost_repel:       (this.#stats.ghostRepelLevel ?? 0) > 0,
            ghostRepelCooldown: this.#ghostRepelCooldown,
            ghostRepelMaxCd:    this.ghostRepelMaxCooldown,
            // Animation state for overlays that respond to it
            anim:         this.#currentAnim,
            facing:       this.#facingRight ? 1 : -1,
        };
    }

    /**
     * Reset player state for new game
     */
    reset(x, y, stats) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.#stats = { ...this.#stats, ...stats };
        this.#lives = this.maxLives;
        this.#grounded = false;
        this.#jumping = false;
        this.#invincible = false;
        this.#invincibleTimer = 0;
        this.#combo = 0;
        this.#comboTimer = 0;
        this.#jetpackActive = false;
        this.#shieldActive = false;
        this.#magnetActive = false;
        this.#springBootsActive = false;
        this.#slowTimeActive = false;
        this.#doubleCoinsActive = false;
        this.#spikeHasteActive = false;
        this.#spikeHasteTimer  = 0;
        this.#dashesRemaining = this.#stats.dashCount;
        this.#spikeTimers = Array(this.#stats.spikeCount ?? 0).fill(0);
        this.active = true;
    }
}
