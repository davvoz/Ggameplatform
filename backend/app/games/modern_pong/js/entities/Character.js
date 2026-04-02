import { SpriteGenerator } from '../characters/SpriteGenerator.js';
import {
    ARENA_LEFT, ARENA_RIGHT, ARENA_TOP, ARENA_BOTTOM, ARENA_MID_Y,
    CHARACTER_SIZE, CHARACTER_HALF,
} from '../config/Constants.js';

/**
 * Character entity — handles position, movement, animation, and rendering.
 * Characters are constrained to their half of the arena.
 */
export class Character {
    #data;
    #spriteSheet;
    #x;
    #y;
    #isTopPlayer;
    #currentAnim = 'idle';
    #frameIndex = 0;
    #frameTimer = 0;
    #frameDuration = 110;
    #velocityX = 0;
    #velocityY = 0;
    #activeEffects = new Map();
    #sizeMultiplier = 1;
    #speedMultiplier = 1;
    #controlsReversed = false;
    #stunTimer = 0;
    #baseSize = 1;
    #superCharge = 0;

    constructor(data, isTopPlayer) {
        this.#data = data;
        this.#isTopPlayer = isTopPlayer;
        this.#baseSize = data.passiveSize ?? 1;
        this.#spriteSheet = SpriteGenerator.generate(data);
        this.resetPosition();
    }

    get data() { return this.#data; }
    get x() { return this.#x; }
    get y() { return this.#y; }
    get isTopPlayer() { return this.#isTopPlayer; }
    get currentAnim() { return this.#currentAnim; }
    get sizeMultiplier() { return this.#sizeMultiplier; }
    get isStunned() { return this.#stunTimer > 0; }
    get controlsReversed() { return this.#controlsReversed; }
    get hitboxRadius() { return CHARACTER_HALF * this.#sizeMultiplier * this.#baseSize; }
    get baseSize() { return this.#baseSize; }
    get superCharge() { return this.#superCharge; }
    get superReady() { return this.#superCharge >= 100; }

    set x(val) { this.#x = val; }
    set y(val) { this.#y = val; }

    get moveSpeed() {
        const base = 80 + this.#data.speed * 18;
        return base * this.#speedMultiplier;
    }

    get hitStrength() {
        return 0.8 + this.#data.strength * 0.08;
    }

    get spinFactor() {
        return this.#data.spin * 0.04;
    }

    resetPosition() {
        this.#x = (ARENA_LEFT + ARENA_RIGHT) / 2;
        this.#y = this.#isTopPlayer
            ? ARENA_TOP + (ARENA_MID_Y - ARENA_TOP) * 0.4
            : ARENA_MID_Y + (ARENA_BOTTOM - ARENA_MID_Y) * 0.6;
        this.#velocityX = 0;
        this.#velocityY = 0;
        this.#currentAnim = 'idle';
        this.#frameIndex = 0;
        this.clearEffects();
    }

    /**
     * Move character by directional input (-1, 0, or 1 for each axis).
     */
    move(dx, dy, dt) {
        if (this.#stunTimer > 0) return;

        const actualDx = this.#controlsReversed ? -dx : dx;
        const actualDy = this.#controlsReversed ? -dy : dy;

        const speed = this.moveSpeed;
        const sec = dt / 1000;

        this.#velocityX = actualDx * speed;
        this.#velocityY = actualDy * speed;

        this.#x += this.#velocityX * sec;
        this.#y += this.#velocityY * sec;

        this.#clampPosition();
        this.#updateAnimation(actualDx, actualDy);
    }

    applyEffect(name, duration, properties = {}) {
        this.#activeEffects.set(name, { remaining: duration, properties });
        if (properties.sizeMultiplier !== undefined) {
            this.#sizeMultiplier = properties.sizeMultiplier;
        }
        if (properties.speedMultiplier !== undefined) {
            this.#speedMultiplier = properties.speedMultiplier;
        }
        if (properties.controlsReversed !== undefined) {
            this.#controlsReversed = properties.controlsReversed;
        }
    }

    stun(duration) {
        this.#stunTimer = duration;
        this.#currentAnim = 'stun';
        this.#frameIndex = 0;
    }

    playHit() {
        this.#currentAnim = 'hit';
        this.#frameIndex = 0;
        this.#frameTimer = 0;
    }

    playCelebrate() {
        this.#currentAnim = 'celebrate';
        this.#frameIndex = 0;
        this.#frameTimer = 0;
    }

    clearEffects() {
        this.#activeEffects.clear();
        this.#sizeMultiplier = 1;
        this.#speedMultiplier = 1;
        this.#controlsReversed = false;
        this.#stunTimer = 0;
    }

    chargeSuper(amount) {
        this.#superCharge = Math.min(100, this.#superCharge + amount);
    }

    consumeSuper() {
        if (this.#superCharge < 100) return false;
        this.#superCharge = 0;
        return true;
    }

    resetSuper() {
        this.#superCharge = 0;
    }

    /** Export effect state for network sync (host → guest). */
    getEffectState() {
        return {
            stunTimer: this.#stunTimer,
            superCharge: this.#superCharge,
            sizeMultiplier: this.#sizeMultiplier,
            speedMultiplier: this.#speedMultiplier,
            controlsReversed: this.#controlsReversed,
        };
    }

    /** Apply effect state from network sync (guest receives). */
    applyEffectState(s) {
        if (!s) return;
        if (s.stunTimer > 0 && this.#stunTimer <= 0) {
            this.#currentAnim = 'stun';
            this.#frameIndex = 0;
        }
        this.#stunTimer = s.stunTimer ?? 0;
        this.#superCharge = s.superCharge ?? 0;
        this.#sizeMultiplier = s.sizeMultiplier ?? 1;
        this.#speedMultiplier = s.speedMultiplier ?? 1;
        this.#controlsReversed = s.controlsReversed ?? false;
    }

    update(dt) {
        // Update stun
        if (this.#stunTimer > 0) {
            this.#stunTimer = Math.max(0, this.#stunTimer - dt);
            if (this.#stunTimer <= 0) {
                this.#currentAnim = 'idle';
            }
        }

        // Update active effects
        for (const [name, effect] of this.#activeEffects) {
            effect.remaining -= dt;
            if (effect.remaining <= 0) {
                this.#activeEffects.delete(name);
                if (name === 'giant' || name === 'shrink') {
                    this.#sizeMultiplier = 1;
                }
                if (name === 'speed') {
                    this.#speedMultiplier = 1;
                }
                if (name === 'mirror') {
                    this.#controlsReversed = false;
                }
            }
        }

        // Update frame
        this.#frameTimer += dt;
        const animKey = this.#currentAnim;
        const animData = this.#spriteSheet.anims;
        const numFrames = animData[animKey] ?? 4;

        if (this.#frameTimer >= this.#frameDuration) {
            this.#frameTimer = 0;
            this.#frameIndex = (this.#frameIndex + 1) % numFrames;

            // Return to idle after one-shot animations
            if ((animKey === 'hit' || animKey === 'celebrate') &&
                this.#frameIndex === 0) {
                this.#currentAnim = 'idle';
            }
        }

        // Friction when no input
        this.#velocityX *= 0.85;
        this.#velocityY *= 0.85;
    }

    draw(ctx) {
        const fs = this.#spriteSheet.frameSize;
        const animKeys = Object.keys(this.#spriteSheet.anims);
        const rowIdx = animKeys.indexOf(this.#currentAnim);
        const row = rowIdx >= 0 ? rowIdx : 0;
        const col = this.#frameIndex;

        const sx = col * fs;
        const sy = row * fs;
        const drawSize = CHARACTER_SIZE * this.#sizeMultiplier * this.#baseSize;

        // Render scale accounts for padding in the spritesheet frame
        const renderScale = this.#spriteSheet.renderScale ?? 1;
        const artCenterY = this.#spriteSheet.artCenterY ?? 0.5;
        const renderSize = drawSize * renderScale;

        ctx.save();

        // Flip sprite for top player (faces down)
        if (this.#isTopPlayer) {
            ctx.translate(this.#x, this.#y);
            ctx.scale(1, -1);
            ctx.drawImage(
                this.#spriteSheet.canvas,
                sx, sy, fs, fs,
                -renderSize / 2, -(1 - artCenterY) * renderSize,
                renderSize, renderSize
            );
        } else {
            ctx.drawImage(
                this.#spriteSheet.canvas,
                sx, sy, fs, fs,
                this.#x - renderSize / 2,
                this.#y - artCenterY * renderSize,
                renderSize, renderSize
            );
        }

        // Effect indicators
        if (this.#stunTimer > 0) {
            ctx.restore();
            ctx.save();
            // Frozen flash overlay
            const flash = 0.25 + Math.sin(Date.now() / 100) * 0.15;
            ctx.globalAlpha = flash;
            ctx.fillStyle = '#88ddff';
            const r = this.hitboxRadius + 4;
            ctx.beginPath();
            ctx.arc(this.#x, this.#y, r, 0, Math.PI * 2);
            ctx.fill();
            // Stun sparkles
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 4; i++) {
                const a = Date.now() / 300 + i * Math.PI / 2;
                const sx = this.#x + Math.cos(a) * (r + 2);
                const sy = this.#y + Math.sin(a) * (r + 2);
                ctx.fillRect(sx - 1, sy - 1, 2, 2);
            }
        }

        if (this.#sizeMultiplier !== 1) {
            ctx.restore();
            ctx.save();
            const isGrow = this.#sizeMultiplier > 1;
            const ringColor = isGrow ? '#39ff14' : '#ff1744';
            const pulse = 0.4 + Math.sin(Date.now() / 300) * 0.2;
            ctx.globalAlpha = pulse;
            ctx.strokeStyle = ringColor;
            ctx.lineWidth = 2;
            ctx.shadowColor = ringColor;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(this.#x, this.#y, this.hitboxRadius + 4, 0, Math.PI * 2);
            ctx.stroke();
        }

        if (this.#speedMultiplier > 1) {
            ctx.restore();
            ctx.save();
            // Speed lines trailing behind the character
            const alpha = 0.3 + Math.sin(Date.now() / 200) * 0.15;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#ffee44';
            ctx.lineWidth = 1.5;
            ctx.shadowColor = '#ffee44';
            ctx.shadowBlur = 4;
            for (let i = -1; i <= 1; i++) {
                const ox = i * 8;
                ctx.beginPath();
                ctx.moveTo(this.#x + ox, this.#y + drawSize / 2 + 2);
                ctx.lineTo(this.#x + ox, this.#y + drawSize / 2 + 10);
                ctx.stroke();
            }
        }

        // Poison aura (controls reversed by venom)
        if (this.#controlsReversed) {
            ctx.restore();
            ctx.save();
            const t = Date.now();
            const pulse = 0.25 + Math.sin(t / 200) * 0.15;
            const r = this.hitboxRadius + 6;
            // Pulsing green aura
            ctx.globalAlpha = pulse;
            ctx.fillStyle = '#33cc33';
            ctx.shadowColor = '#33ff33';
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(this.#x, this.#y, r, 0, Math.PI * 2);
            ctx.fill();
            // Outer ring
            ctx.globalAlpha = pulse * 0.6;
            ctx.strokeStyle = '#66ff33';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.#x, this.#y, r + 3, 0, Math.PI * 2);
            ctx.stroke();
            // Floating toxic bubbles
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = '#66ff33';
            for (let i = 0; i < 5; i++) {
                const a = t / 600 + i * Math.PI * 2 / 5;
                const br = r + 2 + Math.sin(t / 400 + i) * 3;
                const bx = this.#x + Math.cos(a) * br;
                const by = this.#y + Math.sin(a) * br;
                const bs = 1.5 + Math.sin(t / 300 + i * 2) * 0.5;
                ctx.beginPath();
                ctx.arc(bx, by, bs, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Super-ready glow
        if (this.#superCharge >= 100) {
            ctx.restore();
            ctx.save();
            const t = Date.now();
            const pulse = 0.35 + Math.sin(t / 180) * 0.25;
            const superColor = this.#data.superShot?.color ?? this.#data.palette.accent;
            ctx.globalAlpha = pulse;
            ctx.strokeStyle = superColor;
            ctx.lineWidth = 2.5;
            ctx.shadowColor = superColor;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(this.#x, this.#y, this.hitboxRadius + 8, 0, Math.PI * 2);
            ctx.stroke();
            // Rotating sparkles
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.8;
            for (let i = 0; i < 4; i++) {
                const a = t / 400 + i * Math.PI / 2;
                const sr = this.hitboxRadius + 10;
                const sx = this.#x + Math.cos(a) * sr;
                const sy = this.#y + Math.sin(a) * sr;
                ctx.beginPath();
                ctx.arc(sx, sy, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    /**
     * Serialize position for network sync.
     */
    toNetState() {
        return {
            x: Math.round(this.#x),
            y: Math.round(this.#y),
            anim: this.#currentAnim,
            frame: this.#frameIndex,
            size: this.#sizeMultiplier,
        };
    }

    applyNetState(state) {
        this.#x = state.x;
        this.#y = state.y;
        this.#currentAnim = state.anim;
        this.#frameIndex = state.frame;
        this.#sizeMultiplier = state.size;
    }

    #clampPosition() {
        const halfSize = this.hitboxRadius;
        const minX = ARENA_LEFT + halfSize;
        const maxX = ARENA_RIGHT - halfSize;

        this.#x = Math.max(minX, Math.min(maxX, this.#x));

        if (this.#isTopPlayer) {
            const minY = ARENA_TOP + halfSize;
            const maxY = ARENA_MID_Y - halfSize;
            this.#y = Math.max(minY, Math.min(maxY, this.#y));
        } else {
            const minY = ARENA_MID_Y + halfSize;
            const maxY = ARENA_BOTTOM - halfSize;
            this.#y = Math.max(minY, Math.min(maxY, this.#y));
        }
    }

    #updateAnimation(dx, dy) {
        if (this.#currentAnim === 'hit' || this.#currentAnim === 'celebrate' ||
            this.#currentAnim === 'stun') {
            return;
        }

        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
            this.#currentAnim = 'idle';
            return;
        }

        if (Math.abs(dy) > Math.abs(dx)) {
            this.#currentAnim = dy < 0 ? 'moveUp' : 'moveDown';
        } else {
            this.#currentAnim = dx < 0 ? 'moveLeft' : 'moveRight';
        }
    }
}
