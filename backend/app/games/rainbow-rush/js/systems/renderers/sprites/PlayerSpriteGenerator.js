/**
 * PlayerSpriteGenerator - Genera sprite professionali per il player
 * Sprite animati con dettagli, espressioni, ali, effetti
 */

export class PlayerSpriteGenerator {
    constructor() {
        this.spriteCache = new Map();
        this.animationFrames = 12; // 12 frame per animazioni ultra-fluide
    }

    /**
     * Generate sprite set for player state
     */
    generateSpriteSet(playerConfig) {
        const cacheKey = this.getCacheKey(playerConfig);
        
        if (this.spriteCache.has(cacheKey)) {
            return this.spriteCache.get(cacheKey);
        }

        const spriteSet = {
            idle: this.generateAnimation(playerConfig, 'idle'),
            running: this.generateAnimation(playerConfig, 'running'),
            jumping: this.generateAnimation(playerConfig, 'jumping'),
            falling: this.generateAnimation(playerConfig, 'falling'),
            landing: this.generateAnimation(playerConfig, 'landing'),
            flying: this.generateAnimation(playerConfig, 'flying'),
            turbo: this.generateAnimation(playerConfig, 'turbo'),
            hurt: this.generateAnimation(playerConfig, 'hurt'),
            victory: this.generateAnimation(playerConfig, 'victory')
        };

        this.spriteCache.set(cacheKey, spriteSet);
        return spriteSet;
    }

    getCacheKey(config) {
        return `player_${config.width}_${config.height}_${config.state || 'default'}`;
    }

    /**
     * Generate animation frames for specific state
     */
    generateAnimation(config, state) {
        const frames = [];
        const numFrames = this.getFrameCount(state);

        for (let i = 0; i < numFrames; i++) {
            const progress = i / numFrames;
            const canvas = this.createCanvas(config.width, config.height);
            const ctx = canvas.getContext('2d');

            this.drawPlayerState(ctx, config, state, progress, config.width, config.height);
            frames.push(canvas);
        }

        return frames;
    }

    getFrameCount(state) {
        const frameCounts = {
            idle: 8,
            running: 8,
            jumping: 6,
            falling: 4,
            landing: 4,
            flying: 12,
            turbo: 12,
            hurt: 6,
            victory: 16
        };
        return frameCounts[state] || this.animationFrames;
    }

    createCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width * 1.5; // Extra space for effects
        canvas.height = height * 1.5;
        return canvas;
    }

    /**
     * Main drawing method - routes to specific state renderer
     */
    drawPlayerState(ctx, config, state, progress, width, height) {
        const cx = width * 0.75; // Center with padding
        const cy = height * 0.75;

        // Draw state-specific animation
        switch (state) {
            case 'idle':
                this.drawIdle(ctx, config, progress, cx, cy, width, height);
                break;
            case 'running':
                this.drawRunning(ctx, config, progress, cx, cy, width, height);
                break;
            case 'jumping':
                this.drawJumping(ctx, config, progress, cx, cy, width, height);
                break;
            case 'falling':
                this.drawFalling(ctx, config, progress, cx, cy, width, height);
                break;
            case 'landing':
                this.drawLanding(ctx, config, progress, cx, cy, width, height);
                break;
            case 'flying':
                this.drawFlying(ctx, config, progress, cx, cy, width, height);
                break;
            case 'turbo':
                this.drawTurbo(ctx, config, progress, cx, cy, width, height);
                break;
            case 'hurt':
                this.drawHurt(ctx, config, progress, cx, cy, width, height);
                break;
            case 'victory':
                this.drawVictory(ctx, config, progress, cx, cy, width, height);
                break;
            default:
                this.drawIdle(ctx, config, progress, cx, cy, width, height);
        }
    }

    /**
     * Get player colors
     */
    getColors(config) {
        const baseColor = config.color || [0.2, 0.6, 1.0, 1.0];
        return {
            base: `rgb(${baseColor[0] * 255}, ${baseColor[1] * 255}, ${baseColor[2] * 255})`,
            light: `rgb(${Math.min(255, baseColor[0] * 400)}, ${Math.min(255, baseColor[1] * 400)}, ${Math.min(255, baseColor[2] * 400)})`,
            dark: `rgb(${baseColor[0] * 150}, ${baseColor[1] * 150}, ${baseColor[2] * 150})`,
            glow: `rgba(${baseColor[0] * 255}, ${baseColor[1] * 255}, ${baseColor[2] * 255}, 0.4)`
        };
    }

    // ============================================
    // IDLE ANIMATION - Breathing, subtle movement
    // ============================================
    drawIdle(ctx, config, progress, cx, cy, width, height) {
        const colors = this.getColors(config);
        const radius = width * 0.4;
        
        // Gentle breathing
        const breathe = Math.sin(progress * Math.PI * 2) * 0.08 + 1;
        const bob = Math.sin(progress * Math.PI * 2) * 2;

        // Shadow
        this.drawShadow(ctx, cx, cy + radius + 5, radius * 1.2, 0.3);

        // Glow
        const glowGradient = ctx.createRadialGradient(cx, cy + bob, 0, cx, cy + bob, radius * 1.8);
        glowGradient.addColorStop(0, colors.glow);
        glowGradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(cx, cy + bob, radius * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Body
        this.drawBody(ctx, cx, cy + bob, radius * breathe, colors);

        // Face - peaceful expression
        this.drawEyes(ctx, cx, cy + bob, radius, 'idle', progress);
        this.drawMouth(ctx, cx, cy + bob, radius, 'idle', progress);
    }

    // ============================================
    // RUNNING ANIMATION - Legs moving, lean forward
    // ============================================
    drawRunning(ctx, config, progress, cx, cy, width, height) {
        const colors = this.getColors(config);
        const radius = width * 0.4;
        
        // Running bob
        const runBob = Math.abs(Math.sin(progress * Math.PI * 2)) * 3;
        const lean = Math.sin(progress * Math.PI * 2) * 0.1;

        // Speed lines
        this.drawSpeedLines(ctx, cx, cy, radius, progress);

        // Shadow (moving)
        this.drawShadow(ctx, cx, cy + radius + 5 - runBob * 0.5, radius * 1.2, 0.4);

        // Body (leaning)
        ctx.save();
        ctx.translate(cx, cy - runBob);
        ctx.rotate(lean);
        this.drawBody(ctx, 0, 0, radius, colors);
        
        // Face - determined expression
        this.drawEyes(ctx, 0, 0, radius, 'running', progress);
        this.drawMouth(ctx, 0, 0, radius, 'running', progress);
        ctx.restore();

        // Legs (moving)
        this.drawRunningLegs(ctx, cx, cy + radius - runBob, radius, progress);
    }

    // ============================================
    // JUMPING ANIMATION - Squash and stretch
    // ============================================
    drawJumping(ctx, config, progress, cx, cy, width, height) {
        const colors = this.getColors(config);
        const radius = width * 0.4;
        
        // Stretch upward
        const stretch = 1 + progress * 0.3;
        const squash = 1 - progress * 0.15;

        // Shadow (smaller when jumping)
        this.drawShadow(ctx, cx, cy + radius * 2, radius * 0.8, 0.2);

        // Motion blur effect
        ctx.globalAlpha = 0.3;
        this.drawBody(ctx, cx, cy + 3, radius * 0.95, colors);
        ctx.globalAlpha = 1.0;

        // Body (stretched)
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(squash, stretch);
        this.drawBody(ctx, 0, 0, radius, colors);
        
        // Face - excited
        this.drawEyes(ctx, 0, 0, radius, 'jumping', progress);
        this.drawMouth(ctx, 0, 0, radius, 'jumping', progress);
        ctx.restore();
    }

    // ============================================
    // FALLING ANIMATION - Arms/legs spread
    // ============================================
    drawFalling(ctx, config, progress, cx, cy, width, height) {
        const colors = this.getColors(config);
        const radius = width * 0.4;
        
        // Flutter effect
        const flutter = Math.sin(progress * Math.PI * 4) * 3;

        // Shadow
        this.drawShadow(ctx, cx, cy + radius * 2.5, radius * 1.5, 0.25);

        // Wind lines
        this.drawWindLines(ctx, cx, cy, radius, progress);

        // Body
        this.drawBody(ctx, cx + flutter * 0.3, cy, radius, colors);
        
        // Face - worried
        this.drawEyes(ctx, cx + flutter * 0.3, cy, radius, 'falling', progress);
        this.drawMouth(ctx, cx + flutter * 0.3, cy, radius, 'falling', progress);

        // Limbs spread
        this.drawSpreadLimbs(ctx, cx, cy, radius, progress);
    }

    // ============================================
    // LANDING ANIMATION - Impact squash
    // ============================================
    drawLanding(ctx, config, progress, cx, cy, width, height) {
        const colors = this.getColors(config);
        const radius = width * 0.4;
        
        // Heavy squash at start, recover
        const squashAmount = Math.max(0, 1 - progress);
        const squash = 1 + squashAmount * 0.4;
        const stretch = 1 - squashAmount * 0.2;

        // Impact particles
        if (progress < 0.3) {
            this.drawImpactParticles(ctx, cx, cy + radius, radius, progress);
        }

        // Shadow (expanding on impact)
        this.drawShadow(ctx, cx, cy + radius + 5, radius * (1.2 + squashAmount * 0.5), 0.5 - progress * 0.2);

        // Body (squashed)
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(squash, stretch);
        this.drawBody(ctx, 0, 0, radius, colors);
        
        // Face - surprised
        this.drawEyes(ctx, 0, 0, radius, 'landing', progress);
        this.drawMouth(ctx, 0, 0, radius, 'landing', progress);
        ctx.restore();
    }

    // ============================================
    // FLYING ANIMATION - Wings flapping, floating
    // ============================================
    drawFlying(ctx, config, progress, cx, cy, width, height) {
        const colors = this.getColors(config);
        const radius = width * 0.4;
        
        // Smooth floating motion
        const floatY = Math.sin(progress * Math.PI * 2) * 4;
        const wingFlap = Math.sin(progress * Math.PI * 2);

        // Flight aura
        const auraGradient = ctx.createRadialGradient(cx, cy + floatY, 0, cx, cy + floatY, radius * 2.5);
        auraGradient.addColorStop(0, 'rgba(100, 200, 255, 0.3)');
        auraGradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.15)');
        auraGradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(cx, cy + floatY, radius * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Wings
        this.drawWings(ctx, cx, cy + floatY, radius, wingFlap, colors);

        // Shadow (faint when flying)
        this.drawShadow(ctx, cx, cy + radius * 2, radius * 1.0, 0.15);

        // Body
        this.drawBody(ctx, cx, cy + floatY, radius, colors);
        
        // Face - happy flying
        this.drawEyes(ctx, cx, cy + floatY, radius, 'flying', progress);
        this.drawMouth(ctx, cx, cy + floatY, radius, 'flying', progress);

        // Sparkles
        this.drawFlyingSparkles(ctx, cx, cy + floatY, radius, progress);
    }

    // ============================================
    // TURBO ANIMATION - Speed effect, trail
    // ============================================
    drawTurbo(ctx, config, progress, cx, cy, width, height) {
        const colors = this.getColors(config);
        const radius = width * 0.4;
        
        // Intense motion
        const vibrate = Math.sin(progress * Math.PI * 8) * 1.5;

        // Speed trail
        for (let i = 3; i > 0; i--) {
            ctx.globalAlpha = 0.2 / i;
            const trailX = cx - i * 8;
            this.drawBody(ctx, trailX + vibrate, cy, radius * 0.9, colors);
        }
        ctx.globalAlpha = 1.0;

        // Energy aura
        const energyGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 2);
        energyGradient.addColorStop(0, 'rgba(255, 200, 50, 0.4)');
        energyGradient.addColorStop(0.6, 'rgba(255, 150, 0, 0.2)');
        energyGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
        ctx.fillStyle = energyGradient;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Main body
        this.drawBody(ctx, cx + vibrate, cy, radius, colors);
        
        // Face - intense
        this.drawEyes(ctx, cx + vibrate, cy, radius, 'turbo', progress);
        this.drawMouth(ctx, cx + vibrate, cy, radius, 'turbo', progress);

        // Energy particles
        this.drawEnergyParticles(ctx, cx, cy, radius, progress);
    }

    // ============================================
    // HURT ANIMATION - Flash, recoil
    // ============================================
    drawHurt(ctx, config, progress, cx, cy, width, height) {
        const colors = this.getColors(config);
        const radius = width * 0.4;
        
        // Recoil motion
        const recoil = Math.max(0, 1 - progress) * 5;
        const flash = Math.sin(progress * Math.PI * 6) * 0.5 + 0.5;

        // Red flash overlay
        ctx.fillStyle = `rgba(255, 50, 50, ${flash * 0.4})`;
        ctx.beginPath();
        ctx.arc(cx - recoil, cy, radius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Body (flickering)
        ctx.globalAlpha = 0.5 + flash * 0.5;
        this.drawBody(ctx, cx - recoil, cy, radius, colors);
        ctx.globalAlpha = 1.0;
        
        // Face - hurt expression
        this.drawEyes(ctx, cx - recoil, cy, radius, 'hurt', progress);
        this.drawMouth(ctx, cx - recoil, cy, radius, 'hurt', progress);

        // Impact stars
        if (progress < 0.4) {
            this.drawImpactStars(ctx, cx, cy, radius, progress);
        }
    }

    // ============================================
    // VICTORY ANIMATION - Celebration
    // ============================================
    drawVictory(ctx, config, progress, cx, cy, width, height) {
        const colors = this.getColors(config);
        const radius = width * 0.4;
        
        // Jump for joy
        const jumpHeight = Math.abs(Math.sin(progress * Math.PI * 2)) * 15;
        const scale = 1 + Math.sin(progress * Math.PI * 4) * 0.1;

        // Celebration particles
        this.drawCelebrationParticles(ctx, cx, cy - jumpHeight, radius, progress);

        // Shadow
        this.drawShadow(ctx, cx, cy + radius + 5, radius * 1.2, 0.4 - jumpHeight * 0.015);

        // Body (bouncing)
        ctx.save();
        ctx.translate(cx, cy - jumpHeight);
        ctx.scale(scale, scale);
        this.drawBody(ctx, 0, 0, radius, colors);
        
        // Face - super happy
        this.drawEyes(ctx, 0, 0, radius, 'victory', progress);
        this.drawMouth(ctx, 0, 0, radius, 'victory', progress);
        ctx.restore();

        // Stars around
        this.drawVictoryStars(ctx, cx, cy - jumpHeight, radius, progress);
    }

    // ============================================
    // BODY DRAWING
    // ============================================
    drawBody(ctx, x, y, radius, colors) {
        // Glow/Outline
        const glowGradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius * 1.3);
        glowGradient.addColorStop(0, colors.light);
        glowGradient.addColorStop(0.7, colors.base);
        glowGradient.addColorStop(1, colors.dark);

        // Main body circle
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Shine highlight
        const shineGradient = ctx.createRadialGradient(
            x - radius * 0.25, y - radius * 0.25, 0,
            x - radius * 0.25, y - radius * 0.25, radius * 0.5
        );
        shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = shineGradient;
        ctx.beginPath();
        ctx.arc(x - radius * 0.25, y - radius * 0.25, radius * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = colors.dark;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
    }

    // ============================================
    // EYES - Different expressions
    // ============================================
    drawEyes(ctx, x, y, radius, expression, progress) {
        const eyeOffsetX = radius * 0.25;
        const eyeOffsetY = radius * 0.15;
        const eyeSize = radius * 0.15;

        // Blink animation for certain states
        const blink = (expression === 'idle' && Math.abs(Math.sin(progress * Math.PI * 2)) < 0.1) ? 0.2 : 1.0;

        switch (expression) {
            case 'idle':
            case 'running':
            case 'flying':
            case 'victory':
                // Normal round eyes
                this.drawEye(ctx, x - eyeOffsetX, y - eyeOffsetY, eyeSize * blink, '#000', '#fff');
                this.drawEye(ctx, x + eyeOffsetX, y - eyeOffsetY, eyeSize * blink, '#000', '#fff');
                break;

            case 'jumping':
            case 'turbo':
                // Wide excited eyes
                this.drawEye(ctx, x - eyeOffsetX, y - eyeOffsetY, eyeSize * 1.2, '#000', '#fff');
                this.drawEye(ctx, x + eyeOffsetX, y - eyeOffsetY, eyeSize * 1.2, '#000', '#fff');
                // Sparkle
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(x - eyeOffsetX - 2, y - eyeOffsetY - 2, 1.5, 0, Math.PI * 2);
                ctx.arc(x + eyeOffsetX - 2, y - eyeOffsetY - 2, 1.5, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'falling':
                // Worried wide eyes
                this.drawEye(ctx, x - eyeOffsetX, y - eyeOffsetY, eyeSize * 1.1, '#000', '#fff', true);
                this.drawEye(ctx, x + eyeOffsetX, y - eyeOffsetY, eyeSize * 1.1, '#000', '#fff', true);
                break;

            case 'landing':
                // Surprised eyes (oval)
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.ellipse(x - eyeOffsetX, y - eyeOffsetY, eyeSize * 0.8, eyeSize * 1.2, 0, 0, Math.PI * 2);
                ctx.ellipse(x + eyeOffsetX, y - eyeOffsetY, eyeSize * 0.8, eyeSize * 1.2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(x - eyeOffsetX, y - eyeOffsetY, eyeSize * 0.5, 0, Math.PI * 2);
                ctx.arc(x + eyeOffsetX, y - eyeOffsetY, eyeSize * 0.5, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'hurt':
                // X eyes
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x - eyeOffsetX - 3, y - eyeOffsetY - 3);
                ctx.lineTo(x - eyeOffsetX + 3, y - eyeOffsetY + 3);
                ctx.moveTo(x - eyeOffsetX + 3, y - eyeOffsetY - 3);
                ctx.lineTo(x - eyeOffsetX - 3, y - eyeOffsetY + 3);
                ctx.moveTo(x + eyeOffsetX - 3, y - eyeOffsetY - 3);
                ctx.lineTo(x + eyeOffsetX + 3, y - eyeOffsetY + 3);
                ctx.moveTo(x + eyeOffsetX + 3, y - eyeOffsetY - 3);
                ctx.lineTo(x + eyeOffsetX - 3, y - eyeOffsetY + 3);
                ctx.stroke();
                break;
        }
    }

    drawEye(ctx, x, y, size, pupilColor, whiteColor, worried = false) {
        // White
        ctx.fillStyle = whiteColor;
        ctx.beginPath();
        if (worried) {
            ctx.ellipse(x, y, size, size * 0.8, 0, 0, Math.PI * 2);
        } else {
            ctx.arc(x, y, size, 0, Math.PI * 2);
        }
        ctx.fill();

        // Pupil
        ctx.fillStyle = pupilColor;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }

    // ============================================
    // MOUTH - Different expressions
    // ============================================
    drawMouth(ctx, x, y, radius, expression, progress) {
        const mouthY = y + radius * 0.25;

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        switch (expression) {
            case 'idle':
            case 'running':
                // Small smile
                ctx.beginPath();
                ctx.arc(x, mouthY - radius * 0.1, radius * 0.3, 0.2, Math.PI - 0.2);
                ctx.stroke();
                break;

            case 'jumping':
            case 'flying':
            case 'turbo':
            case 'victory':
                // Big smile
                ctx.beginPath();
                ctx.arc(x, mouthY - radius * 0.15, radius * 0.35, 0.1, Math.PI - 0.1);
                ctx.stroke();
                break;

            case 'falling':
                // O mouth (worried)
                ctx.beginPath();
                ctx.arc(x, mouthY, radius * 0.15, 0, Math.PI * 2);
                ctx.stroke();
                break;

            case 'landing':
                // O mouth (surprised)
                ctx.beginPath();
                ctx.arc(x, mouthY, radius * 0.2, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'hurt':
                // Sad/pain
                ctx.beginPath();
                ctx.arc(x, mouthY + radius * 0.2, radius * 0.3, Math.PI + 0.3, Math.PI * 2 - 0.3, true);
                ctx.stroke();
                break;
        }
    }

    // ============================================
    // HELPER EFFECTS
    // ============================================

    drawShadow(ctx, x, y, radius, alpha) {
        const shadowGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        shadowGradient.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
        shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = shadowGradient;
        ctx.beginPath();
        ctx.ellipse(x, y, radius, radius * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    drawSpeedLines(ctx, x, y, radius, progress) {
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.4)';
        ctx.lineWidth = 2;
        
        for (let i = 0; i < 4; i++) {
            const offset = i * 8 + progress * 30;
            const lineY = y - radius + i * radius * 0.5;
            ctx.beginPath();
            ctx.moveTo(x - radius * 2 - offset, lineY);
            ctx.lineTo(x - radius * 1.2 - offset, lineY);
            ctx.stroke();
        }
    }

    drawWindLines(ctx, x, y, radius, progress) {
        ctx.strokeStyle = 'rgba(200, 200, 255, 0.3)';
        ctx.lineWidth = 1.5;
        
        for (let i = 0; i < 3; i++) {
            const angle = (progress + i * 0.3) * Math.PI * 2;
            const dist = radius * 1.5;
            const startX = x + Math.cos(angle) * dist;
            const startY = y + Math.sin(angle) * dist;
            const endX = startX + Math.cos(angle) * 10;
            const endY = startY + Math.sin(angle) * 10;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
    }

    drawRunningLegs(ctx, x, y, radius, progress) {
        const legSwing = Math.sin(progress * Math.PI * 2) * radius * 0.3;
        
        ctx.fillStyle = 'rgba(0, 50, 150, 0.8)';
        // Left leg
        ctx.beginPath();
        ctx.ellipse(x - radius * 0.2 + legSwing, y, radius * 0.15, radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Right leg
        ctx.beginPath();
        ctx.ellipse(x + radius * 0.2 - legSwing, y, radius * 0.15, radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    drawSpreadLimbs(ctx, x, y, radius, progress) {
        const spread = Math.sin(progress * Math.PI * 2) * 0.2;
        
        ctx.strokeStyle = 'rgba(0, 50, 150, 0.7)';
        ctx.lineWidth = radius * 0.15;
        ctx.lineCap = 'round';
        
        // Arms
        ctx.beginPath();
        ctx.moveTo(x - radius * 0.5, y);
        ctx.lineTo(x - radius * (1 + spread), y - radius * 0.5);
        ctx.moveTo(x + radius * 0.5, y);
        ctx.lineTo(x + radius * (1 + spread), y - radius * 0.5);
        ctx.stroke();
    }

    drawWings(ctx, x, y, radius, flapAmount, colors) {
        const wingSpread = 0.5 + flapAmount * 0.3;
        
        for (let side of [-1, 1]) {
            ctx.fillStyle = 'rgba(200, 220, 255, 0.7)';
            ctx.strokeStyle = colors.base;
            ctx.lineWidth = 1;
            
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(
                x + side * radius * wingSpread, y - radius * flapAmount,
                x + side * radius * 1.2, y + radius * 0.3
            );
            ctx.quadraticCurveTo(
                x + side * radius * 0.8, y + radius * 0.5,
                x, y
            );
            ctx.fill();
            ctx.stroke();
        }
    }

    drawImpactParticles(ctx, x, y, radius, progress) {
        const numParticles = 8;
        for (let i = 0; i < numParticles; i++) {
            const angle = (i / numParticles) * Math.PI * 2;
            const dist = radius * (1 + progress * 2);
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist * 0.5;
            
            ctx.fillStyle = `rgba(150, 150, 150, ${1 - progress})`;
            ctx.beginPath();
            ctx.arc(px, py, radius * 0.1, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawFlyingSparkles(ctx, x, y, radius, progress) {
        const numSparkles = 5;
        for (let i = 0; i < numSparkles; i++) {
            const angle = (i / numSparkles + progress) * Math.PI * 2;
            const dist = radius * 1.5;
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist;
            const alpha = Math.sin((progress + i / numSparkles) * Math.PI * 2) * 0.5 + 0.5;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawEnergyParticles(ctx, x, y, radius, progress) {
        const numParticles = 6;
        for (let i = 0; i < numParticles; i++) {
            const angle = (i / numParticles + progress * 2) * Math.PI * 2;
            const dist = radius * (1.2 + Math.sin(progress * Math.PI * 4 + i) * 0.3);
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist;
            const size = 3 + Math.sin(progress * Math.PI * 8 + i) * 2;
            
            ctx.fillStyle = `rgba(255, 200, 50, 0.8)`;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawImpactStars(ctx, x, y, radius, progress) {
        const numStars = 4;
        for (let i = 0; i < numStars; i++) {
            const angle = (i / numStars) * Math.PI * 2 + progress * Math.PI;
            const dist = radius * (1 + progress * 3);
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist;
            
            this.drawStar(ctx, px, py, 5, `rgba(255, 255, 100, ${1 - progress})`);
        }
    }

    drawCelebrationParticles(ctx, x, y, radius, progress) {
        const numParticles = 12;
        for (let i = 0; i < numParticles; i++) {
            const angle = (i / numParticles) * Math.PI * 2;
            const dist = radius * (1 + progress * 2);
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist - progress * 20;
            
            const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'];
            const color = colors[i % colors.length];
            
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawVictoryStars(ctx, x, y, radius, progress) {
        const numStars = 5;
        for (let i = 0; i < numStars; i++) {
            const angle = (i / numStars + progress * 0.5) * Math.PI * 2;
            const dist = radius * 2;
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist;
            const scale = 0.8 + Math.sin(progress * Math.PI * 4 + i) * 0.2;
            
            this.drawStar(ctx, px, py, 8 * scale, 'rgba(255, 215, 0, 0.9)');
        }
    }

    drawStar(ctx, x, y, size, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const radius = i % 2 === 0 ? size : size * 0.4;
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.spriteCache.clear();
    }
}
