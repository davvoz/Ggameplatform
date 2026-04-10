import {
    ARENA_LEFT, ARENA_RIGHT, ARENA_TOP, ARENA_BOTTOM,
    BALL_RADIUS, BALL_BASE_SPEED, BALL_MAX_SPEED, BALL_ACCELERATION,
    COLORS,
} from '../config/Constants.js';

/**
 * Ball entity — physics, magnet pull, and polished disc rendering.
 */
export class Ball {
    #x;
    #y;
    #vx;
    #vy;
    #radius = BALL_RADIUS;
    #speed = BALL_BASE_SPEED;
    #trail = [];
    #maxTrail = 16;
    #color = COLORS.WHITE;
    #glowColor = COLORS.NEON_CYAN;
    #fireball = false;
    #fireballTimer = 0;
    #frozen = false;
    #wallHitFlag = false;
    #magnetTargetY = null;
    #magnetTimer = 0;
    /* visual state */
    #rotation = 0;          // disc spin angle
    #impactFlash = 0;       // flash timer after collision
    #impactX = 0;
    #impactY = 0;
    #pulsePhase = 0;        // travelling pulse
    #speedGlow = 0;         // ramps up with speed
    #shadowBlazeTimer = 0;  // shadow super — purple fire disc
    #speedBurstFlash = 0;   // flash on accelerate
    #prevSpeedTier = 0;     // track speed tier changes

    constructor() {
        this.reset(1);
    }

    get x() { return this.#x; }
    get y() { return this.#y; }
    get vx() { return this.#vx; }
    get vy() { return this.#vy; }
    get radius() { return this.#radius; }
    get speed() { return this.#speed; }
    get isFireball() { return this.#fireball; }
    get frozen() { return this.#frozen; }
    get hasMagnet() { return this.#magnetTimer > 0; }

    /** Returns true once per wall hit, then resets. */
    consumeWallHit() {
        if (this.#wallHitFlag) {
            this.#wallHitFlag = false;
            return true;
        }
        return false;
    }

    set vx(val) { this.#vx = val; }
    set vy(val) { this.#vy = val; }
    set x(val) { this.#x = val; }
    set y(val) { this.#y = val; }

    /**
     * Reset ball to center with direction toward a player side.
     * @param {number} direction 1 = toward bottom, -1 = toward top
     */
    reset(direction) {
        this.#x = (ARENA_LEFT + ARENA_RIGHT) / 2;
        this.#y = (ARENA_TOP + ARENA_BOTTOM) / 2;
        const angle = (Math.random() * 0.5 - 0.25) * Math.PI;
        this.#speed = BALL_BASE_SPEED;
        this.#vx = Math.sin(angle) * this.#speed;
        this.#vy = Math.cos(angle) * this.#speed * direction;
        this.#trail = [];
        this.#fireball = false;
        this.#fireballTimer = 0;
        this.#color = COLORS.WHITE;
        this.#glowColor = COLORS.NEON_CYAN;
        this.#frozen = false;
        this.#magnetTargetY = null;
        this.#magnetTimer = 0;
        this.#rotation = 0;
        this.#impactFlash = 0;
        this.#pulsePhase = 0;
        this.#speedGlow = 0;
        this.#shadowBlazeTimer = 0;
        this.#speedBurstFlash = 0;
        this.#prevSpeedTier = 0;
    }

    freeze() { this.#frozen = true; }
    unfreeze() { this.#frozen = false; }

    setFireball(duration) {
        this.#fireball = true;
        this.#fireballTimer = duration;
        this.#color = COLORS.NEON_ORANGE;
        this.#glowColor = COLORS.NEON_RED;
    }

    /** Consume fireball state (one-shot pass-through). Returns true if was active. */
    consumeFireball() {
        if (!this.#fireball) return false;
        this.#fireball = false;
        this.#fireballTimer = 0;
        this.#color = COLORS.WHITE;
        this.#glowColor = this.speedColor;
        return true;
    }

    /** Apply magnet pull toward a goal Y position for a duration. */
    setMagnet(targetY, duration) {
        this.#magnetTargetY = targetY;
        this.#magnetTimer = duration;
    }

    /** Shadow super — purple blazing disc. */
    setShadowBlaze(duration) {
        this.#shadowBlazeTimer = duration;
    }

    clearShadowBlaze() {
        this.#shadowBlazeTimer = 0;
        this.#color = COLORS.WHITE;
        this.#glowColor = this.speedColor;
    }

    get isShadowBlaze() { return this.#shadowBlazeTimer > 0; }

    /** Export visual state for network sync (host → guest). */
    getEffectState() {
        return {
            fireball: this.#fireball,
            fireballTimer: this.#fireballTimer,
            shadowBlaze: this.#shadowBlazeTimer > 0,
            shadowBlazeTimer: this.#shadowBlazeTimer,
            frozen: this.#frozen,
        };
    }

    /** Apply visual state from network sync (guest receives). */
    applyEffectState(s) {
        if (!s) return;
        // Fireball
        if (s.fireball && !this.#fireball) {
            this.#fireball = true;
            this.#color = COLORS.NEON_ORANGE;
            this.#glowColor = COLORS.NEON_RED;
        } else if (!s.fireball && this.#fireball) {
            this.#fireball = false;
            this.#color = COLORS.WHITE;
            this.#glowColor = this.speedColor;
        }
        this.#fireballTimer = s.fireballTimer ?? 0;
        // Shadow blaze
        if (s.shadowBlaze && this.#shadowBlazeTimer <= 0) {
            this.#shadowBlazeTimer = s.shadowBlazeTimer;
        } else if (!s.shadowBlaze && this.#shadowBlazeTimer > 0) {
            this.#shadowBlazeTimer = 0;
            this.#color = COLORS.WHITE;
            this.#glowColor = this.speedColor;
        }
        // Frozen
        this.#frozen = !!s.frozen;
    }

    /** Trigger visual impact flash at current position. */
    triggerImpact() {
        this.#impactFlash = 180;
        this.#impactX = this.#x;
        this.#impactY = this.#y;
    }

    /**
     * Visual-only update for network guests.
     * Updates trail, timers, and visual state — no physics/position changes.
     * Call AFTER interpolation has set the correct x/y from the server.
     */
    updateVisuals(dt) {
        if (this.#frozen) return;

        // Trail (using current interpolated position) — grows with speed
        const dynamicMaxTrailVis = this.#maxTrail + Math.round(this.speedRatio * 14);
        this.#trail.push({ x: this.#x, y: this.#y });
        while (this.#trail.length > dynamicMaxTrailVis) {
            this.#trail.shift();
        }

        // Fireball timer
        if (this.#fireball) {
            this.#fireballTimer -= dt;
            if (this.#fireballTimer <= 0) {
                this.#fireball = false;
                this.#color = COLORS.WHITE;
                this.#glowColor = this.speedColor;
            }
        }

        // Visual timers
        const sec = dt / 1000;
        this.#rotation += (Math.abs(this.#vx) + Math.abs(this.#vy)) * sec * 0.04;
        this.#pulsePhase += dt * 0.006;
        this.#speedGlow = Math.min(1, this.#speed / BALL_MAX_SPEED);
        if (this.#impactFlash > 0) this.#impactFlash -= dt;
        if (this.#speedBurstFlash > 0) this.#speedBurstFlash -= dt;

        // Keep glow synced with speed (when no special FX)
        if (!this.#fireball && this.#shadowBlazeTimer <= 0) {
            this.#glowColor = this.speedColor;
        }

        // Shadow blaze timer
        if (this.#shadowBlazeTimer > 0) {
            this.#shadowBlazeTimer -= dt;
            if (this.#shadowBlazeTimer <= 0) {
                this.#color = COLORS.WHITE;
                this.#glowColor = this.speedColor;
            }
        }
    }

    setColor(color, glow) {
        this.#color = color;
        this.#glowColor = glow;
    }

    /** Speed ratio 0-1 from base to max. */
    get speedRatio() {
        return Math.max(0, Math.min(1, (this.#speed - BALL_BASE_SPEED) / (BALL_MAX_SPEED - BALL_BASE_SPEED)));
    }

    /**
     * Speed tier: 0 = calm, 1 = warm, 2 = hot, 3 = blaze.
     * Thresholds at ~25%, 50%, 75% of speed range.
     */
    get speedTier() {
        const r = this.speedRatio;
        if (r < 0.25) return 0;
        if (r < 0.50) return 1;
        if (r < 0.75) return 2;
        return 3;
    }

    /**
     * Returns dynamic glow/accent color based on current speed (when no special effect active).
     */
    get speedColor() {
        const r = this.speedRatio;
        if (r < 0.20) return COLORS.NEON_CYAN;
        if (r < 0.40) return COLORS.NEON_GREEN;
        if (r < 0.60) return COLORS.NEON_YELLOW;
        if (r < 0.80) return COLORS.NEON_ORANGE;
        return COLORS.NEON_RED;
    }

    accelerate() {
        const oldTier = this.speedTier;
        this.#speed = Math.min(this.#speed * BALL_ACCELERATION, BALL_MAX_SPEED);
        const magnitude = Math.hypot(this.#vx, this.#vy);
        if (magnitude > 0) {
            this.#vx = (this.#vx / magnitude) * this.#speed;
            this.#vy = (this.#vy / magnitude) * this.#speed;
        }

        // Update dynamic colors if no special FX is active
        if (!this.#fireball && this.#shadowBlazeTimer <= 0) {
            this.#glowColor = this.speedColor;
        }

        // Flash on tier change
        const newTier = this.speedTier;
        if (newTier > oldTier) {
            this.#speedBurstFlash = 250;
            this.#prevSpeedTier = newTier;
        }
    }

    update(dt) {
        if (this.#frozen) return;

        const sec = dt / 1000;
        this.#x += this.#vx * sec;
        this.#y += this.#vy * sec;

        // Wall bouncing (left/right)
        if (this.#x - this.#radius <= ARENA_LEFT) {
            this.#x = ARENA_LEFT + this.#radius;
            this.#vx = Math.abs(this.#vx);
            this.#wallHitFlag = true;
            this.triggerImpact();
        } else if (this.#x + this.#radius >= ARENA_RIGHT) {
            this.#x = ARENA_RIGHT - this.#radius;
            this.#vx = -Math.abs(this.#vx);
            this.#wallHitFlag = true;
            this.triggerImpact();
        }

        // Trail — length scales with speed
        const dynamicMaxTrail = this.#maxTrail + Math.round(this.speedRatio * 14);
        this.#trail.push({ x: this.#x, y: this.#y });
        while (this.#trail.length > dynamicMaxTrail) {
            this.#trail.shift();
        }

        // Fireball timer
        if (this.#fireball) {
            this.#fireballTimer -= dt;
            if (this.#fireballTimer <= 0) {
                this.#fireball = false;
                this.#color = COLORS.WHITE;
                this.#glowColor = this.speedColor;
            }
        }

        // Magnet pull — strong, curves ball noticeably toward target goal
        if (this.#magnetTimer > 0) {
            this.#magnetTimer -= dt;
            if (this.#magnetTimer <= 0) {
                this.#magnetTargetY = null;
            } else {
                const dy = this.#magnetTargetY - this.#y;
                const sign = dy > 0 ? 1 : -1;
                // Strong constant pull + proportional component
                const pullForce = 120 + Math.min(Math.abs(dy), 200) * 0.5;
                this.#vy += sign * pullForce * sec;
                // Also slightly steer horizontally toward center for dramatic curves
                const cx = (ARENA_LEFT + ARENA_RIGHT) / 2;
                this.#vx += (cx - this.#x) * 0.3 * sec;
            }
        }

        // Visual timers
        this.#rotation += (Math.abs(this.#vx) + Math.abs(this.#vy)) * sec * 0.04;
        this.#pulsePhase += dt * 0.006;
        this.#speedGlow = Math.min(1, this.#speed / BALL_MAX_SPEED);
        if (this.#impactFlash > 0) this.#impactFlash -= dt;
        if (this.#speedBurstFlash > 0) this.#speedBurstFlash -= dt;

        // Keep glow synced with speed (when no special FX)
        if (!this.#fireball && this.#shadowBlazeTimer <= 0) {
            this.#glowColor = this.speedColor;
        }

        // Shadow blaze timer — reset color when it expires
        if (this.#shadowBlazeTimer > 0) {
            this.#shadowBlazeTimer -= dt;
            if (this.#shadowBlazeTimer <= 0) {
                this.#color = COLORS.WHITE;
                this.#glowColor = this.speedColor;
            }
        }
    }

    /**
     * Check if ball has crossed top or bottom goal line.
     * @returns {number} 0 = in play, 1 = scored on top (bottom player scores), -1 = scored on bottom
     */
    checkGoal() {
        if (this.#y - this.#radius <= ARENA_TOP) return 1;
        if (this.#y + this.#radius >= ARENA_BOTTOM) return -1;
        return 0;
    }

    draw(ctx) {
        const r = this.#radius;
        const x = this.#x;
        const y = this.#y;

        const isShadowBlaze = this.#shadowBlazeTimer > 0;

        /* ---- 1. TRAIL — graduated disc echoes ---- */
        for (let i = 0; i < this.#trail.length; i++) {
            const t = i / this.#trail.length;
            const pos = this.#trail[i];
            const tr = r * (0.3 + t * 0.7);
            ctx.globalAlpha = t * 0.25;
            ctx.fillStyle = this.#glowColor;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, tr, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        /* ---- 2. IMPACT FLASH ring ---- */
        if (this.#impactFlash > 0) {
            const frac = this.#impactFlash / 180;
            const ringR = r + (1 - frac) * 18;
            ctx.save();
            ctx.globalAlpha = frac * 0.7;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2 + frac * 2;
            ctx.beginPath();
            ctx.arc(this.#impactX, this.#impactY, ringR, 0, Math.PI * 2);
            ctx.stroke();
            // Inner flash
            ctx.fillStyle = this.#glowColor;
            ctx.globalAlpha = frac * 0.35;
            ctx.beginPath();
            ctx.arc(this.#impactX, this.#impactY, ringR * 0.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        /* ---- 3. OUTER GLOW (speed-reactive) ---- */
        ctx.save();
        const glowSize = 6 + this.#speedGlow * 10;
        ctx.shadowColor = isShadowBlaze ? '#cc66ff' : this.#glowColor;
        ctx.shadowBlur = this.#fireball ? 18 : isShadowBlaze ? 22 : glowSize;

        /* ---- 4. DISC BODY ---- */
        // Outer ring
        ctx.fillStyle = this.#glowColor;
        ctx.beginPath();
        ctx.arc(x, y, r + 1, 0, Math.PI * 2);
        ctx.fill();

        // Main disc fill — gradient
        const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, this.#color);
        grad.addColorStop(1, this.#glowColor);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // Inner concentric grooves
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, r * 0.78, 0, Math.PI * 2);
        ctx.stroke();

        /* ---- 5. SPINNING DETAIL — visible rotation ---- */
        const rot = this.#rotation;

        // 2 opposite dark arc wedges (clearly rotating sectors)
        ctx.globalAlpha = 0.13;
        ctx.fillStyle = '#000000';
        for (let i = 0; i < 2; i++) {
            const sa = rot + i * Math.PI;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.arc(x, y, r * 0.88, sa, sa + Math.PI * 0.45);
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // 4 dark groove spokes
        ctx.strokeStyle = 'rgba(0,0,0,0.16)';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 4; i++) {
            const a = rot + i * Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2);
            ctx.lineTo(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85);
            ctx.stroke();
        }

        // Bright accent spoke (asymmetric — sells the spin)
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(rot) * r * 0.15, y + Math.sin(rot) * r * 0.15);
        ctx.lineTo(x + Math.cos(rot) * r * 0.88, y + Math.sin(rot) * r * 0.88);
        ctx.stroke();

        // 6 edge tick marks (rotate with disc)
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
            const a = rot + i * Math.PI / 3;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78);
            ctx.lineTo(x + Math.cos(a) * r * 0.97, y + Math.sin(a) * r * 0.97);
            ctx.stroke();
        }

        // Center hub
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath();
        ctx.arc(x, y, r * 0.16, 0, Math.PI * 2);
        ctx.fill();

        /* ---- 6. SPECULAR HIGHLIGHT ---- */
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        ctx.ellipse(x - r * 0.25, y - r * 0.25, r * 0.35, r * 0.2, -0.6, 0, Math.PI * 2);
        ctx.fill();

        /* ---- 7. PULSE RING (travel animation) ---- */
        const pulse = Math.sin(this.#pulsePhase) * 0.5 + 0.5;
        ctx.globalAlpha = 0.15 + pulse * 0.12;
        ctx.strokeStyle = this.#glowColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, r + 2 + pulse * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.restore();

        /* ---- 7b. SPEED MOMENTUM VISUALS ---- */
        const sRatio = this.speedRatio;
        const sTier  = this.speedTier;

        // Heat rings — appear from tier 1+, extra ring each tier
        if (sTier >= 1) {
            const sColor = this.speedColor;
            const now7 = Date.now();
            ctx.save();
            for (let ring = 0; ring < sTier; ring++) {
                const phase = now7 / (200 - ring * 30) + ring * 1.2;
                const expand = Math.sin(phase) * 2;
                const ringR = r + 4 + ring * 4 + expand;
                ctx.globalAlpha = (0.35 - ring * 0.07) * (0.7 + Math.sin(phase * 1.3) * 0.3);
                ctx.strokeStyle = sColor;
                ctx.lineWidth = 1.5 - ring * 0.25;
                ctx.beginPath();
                ctx.arc(x, y, ringR, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Motion streaks — at tier 2+ draw velocity lines behind the ball
        if (sTier >= 2) {
            const spd = Math.hypot(this.#vx, this.#vy);
            if (spd > 0) {
                const dx = -this.#vx / spd;
                const dy = -this.#vy / spd;
                const perpX = -dy;
                const perpY = dx;
                const streakCount = sTier + 1;
                const streakLen = 6 + sRatio * 18;
                ctx.save();
                ctx.strokeStyle = this.speedColor;
                ctx.lineWidth = 1;
                for (let s = 0; s < streakCount; s++) {
                    const offset = (s - (streakCount - 1) / 2) * 4;
                    const sx = x + perpX * offset + dx * (r + 2);
                    const sy = y + perpY * offset + dy * (r + 2);
                    ctx.globalAlpha = 0.25 + sRatio * 0.2;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    ctx.lineTo(sx + dx * streakLen, sy + dy * streakLen);
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        // Speed burst flash — brief expanding ring when tier changes
        if (this.#speedBurstFlash > 0) {
            const burstFrac = this.#speedBurstFlash / 250;
            const burstR = r + (1 - burstFrac) * 28;
            ctx.save();
            ctx.globalAlpha = burstFrac * 0.6;
            ctx.strokeStyle = this.speedColor;
            ctx.lineWidth = 3 * burstFrac;
            ctx.shadowColor = this.speedColor;
            ctx.shadowBlur = 12 * burstFrac;
            ctx.beginPath();
            ctx.arc(x, y, burstR, 0, Math.PI * 2);
            ctx.stroke();
            // Inner bright disc
            ctx.globalAlpha = burstFrac * 0.25;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x, y, burstR * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        /* ---- 8. FIREBALL PARTICLES ---- */
        if (this.#fireball) {
            for (let i = 0; i < 4; i++) {
                const a = Math.random() * Math.PI * 2;
                const d = r + Math.random() * 6;
                const ox = Math.cos(a) * d;
                const oy = Math.sin(a) * d;
                const sz = 1.5 + Math.random() * 2;
                ctx.globalAlpha = 0.4 + Math.random() * 0.3;
                ctx.fillStyle = Math.random() > 0.4 ? COLORS.NEON_ORANGE : COLORS.NEON_RED;
                ctx.beginPath();
                ctx.arc(x + ox, y + oy, sz, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        /* ---- 8b. SHADOW BLAZE — dramatic purple inferno ---- */
        if (isShadowBlaze) {
            const now = Date.now();
            const speed = Math.hypot(this.#vx, this.#vy);
            const dirX = speed > 0 ? -this.#vx / speed : 0;
            const dirY = speed > 0 ? -this.#vy / speed : 0;

            // 1) Long flame tail — 18 layered particles fanning out behind
            const blazeColors = ['#ffffff', '#ff66ff', '#cc66ff', '#9933ff', '#ff00ff', '#6600cc'];
            for (let i = 0; i < 18; i++) {
                const t = (i + Math.random()) * 0.6;
                const spreadAmt = (Math.random() - 0.5) * (4 + t * 6);
                const px = x + dirX * (r + t * 10) + (-dirY) * spreadAmt;
                const py = y + dirY * (r + t * 10) + dirX * spreadAmt;
                const sz = (3.5 - t * 0.15) * (0.6 + Math.random() * 0.8);
                ctx.globalAlpha = 0.7 - t * 0.035;
                ctx.fillStyle = blazeColors[i % blazeColors.length];
                ctx.beginPath();
                ctx.arc(px, py, Math.max(0.5, sz), 0, Math.PI * 2);
                ctx.fill();
            }

            // 2) Outer pulsing aura — big soft glow
            ctx.save();
            const auraPulse = 0.3 + Math.sin(now / 60) * 0.15;
            ctx.globalAlpha = auraPulse;
            ctx.shadowColor = '#ff00ff';
            ctx.shadowBlur = 35;
            ctx.fillStyle = '#cc66ff';
            ctx.beginPath();
            ctx.arc(x, y, r + 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // 3) Double spinning rings
            ctx.save();
            ctx.globalAlpha = 0.6;
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#ff00ff';
            ctx.shadowBlur = 14;
            const a1 = now / 100;
            ctx.beginPath();
            ctx.arc(x, y, r + 4, a1, a1 + Math.PI * 1.2);
            ctx.stroke();
            ctx.strokeStyle = '#cc66ff';
            ctx.beginPath();
            ctx.arc(x, y, r + 6, a1 + Math.PI, a1 + Math.PI * 2.2);
            ctx.stroke();
            ctx.restore();

            // 4) Bright core flash — pulsing white/pink center
            const corePulse = 0.5 + Math.sin(now / 50) * 0.3;
            ctx.globalAlpha = corePulse;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
            ctx.fill();

            // 5) Side sparks flying off perpendicular
            ctx.fillStyle = '#ff66ff';
            for (let i = 0; i < 4; i++) {
                const phase = now / 120 + i * Math.PI * 0.5;
                const sparkR = r + 5 + Math.sin(phase) * 6;
                const sa = phase * 1.5;
                const sx = x + Math.cos(sa) * sparkR;
                const sy = y + Math.sin(sa) * sparkR;
                ctx.globalAlpha = 0.6 + Math.sin(phase * 2) * 0.3;
                ctx.beginPath();
                ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        /* ---- 9. MAGNET INDICATOR (clear visual) ---- */
        if (this.#magnetTimer > 0) {
            const now = Date.now();
            // Pulsing pink/magenta ring
            ctx.save();
            ctx.globalAlpha = 0.5 + Math.sin(now / 150) * 0.2;
            ctx.strokeStyle = COLORS.NEON_PINK;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, r + 6, 0, Math.PI * 2);
            ctx.stroke();

            // Direction arrow showing where magnet pulls
            const arrowDir = this.#magnetTargetY > this.#y ? 1 : -1;
            const arrowOff = 12 + Math.sin(now / 200) * 3;
            const ax = x;
            const ay = y + arrowDir * arrowOff;
            ctx.fillStyle = COLORS.NEON_PINK;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.moveTo(ax, ay + arrowDir * 5);
            ctx.lineTo(ax - 4, ay);
            ctx.lineTo(ax + 4, ay);
            ctx.closePath();
            ctx.fill();
            // Second smaller arrow
            const ay2 = y + arrowDir * (arrowOff + 7);
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.moveTo(ax, ay2 + arrowDir * 4);
            ctx.lineTo(ax - 3, ay2);
            ctx.lineTo(ax + 3, ay2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    toNetState() {
        return {
            x: Math.round(this.#x * 10) / 10,
            y: Math.round(this.#y * 10) / 10,
            vx: Math.round(this.#vx),
            vy: Math.round(this.#vy),
            fireball: this.#fireball,
        };
    }

    applyNetState(state) {
        this.#x = state.x;
        this.#y = state.y;
        this.#vx = state.vx;
        this.#vy = state.vy;
        // Derive speed so guest sees correct speed visuals
        this.#speed = Math.hypot(state.vx, state.vy);
        if (state.fireball && !this.#fireball) {
            this.setFireball(3000);
        }
    }
}
