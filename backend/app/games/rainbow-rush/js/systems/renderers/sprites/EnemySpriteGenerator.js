/**
 * EnemySpriteGenerator - Genera sprite professionali per tutti i tipi di nemici
 * Crea animazioni fluide usando canvas pre-renderizzati
 */

import { SpriteCache } from './SpriteCache.js';

export class EnemySpriteGenerator {
    constructor() {
        this.spriteCache = new SpriteCache(50);
        this.animationFrames = 8; // Frame per animazione
    }

    /**
     * Get or generate sprite frames for enemy type
     */
    getSpriteFrames(enemyConfig) {
        // Check cache first
        const cached = this.spriteCache.get(enemyConfig);
        if (cached) {
            return cached;
        }

        // Generate new frames
        const frames = this.generateSpriteFrames(enemyConfig);
        this.spriteCache.set(enemyConfig, frames);
        
        return frames;
    }

    /**
     * Generate animation frames based on enemy type
     */
    generateSpriteFrames(config) {
        const frames = [];
        const method = this.getSpriteMethod(config.id, config.category);

        for (let i = 0; i < this.animationFrames; i++) {
            const progress = i / this.animationFrames;
            const canvas = this.createCanvas(config.width, config.height);
            const ctx = canvas.getContext('2d');
            
            method.call(this, ctx, config, progress, config.width, config.height);
            
            frames.push(canvas);
        }

        return frames;
    }

    /**
     * Get appropriate sprite generation method
     */
    getSpriteMethod(id, category) {
        // Custom sprites per ID
        const customMethods = {
            'slug': this.drawSlugSprite,
            'spikeball': this.drawSpikeBallSprite,
            'fly': this.drawFlySprite,
            'wasp': this.drawWaspSprite,
            'chomper': this.drawChomperSprite,
            'bat': this.drawBatSprite,
            'ghost': this.drawGhostSprite,
            'stalker': this.drawStalkerSprite,
            'orb': this.drawOrbSprite,
            'turret': this.drawTurretSprite,
        };

        if (customMethods[id]) {
            return customMethods[id];
        }

        // Fallback to category-based sprites
        const categoryMethods = {
            'flying': this.drawFlyingSprite,
            'chaser': this.drawChaserSprite,
            'ground': this.drawGroundSprite,
            'jumper': this.drawJumperSprite,
            'turret': this.drawTurretSprite,
            'miniboss': this.drawMiniBossSprite,
        };

        return categoryMethods[category] || this.drawDefaultSprite;
    }

    /**
     * Create canvas
     */
    createCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }

    /**
     * Get color from config
     */
    getColor(config) {
        const color = config.color || [0.8, 0.3, 0.5, 1.0];
        return {
            r: Math.floor(color[0] * 255),
            g: Math.floor(color[1] * 255),
            b: Math.floor(color[2] * 255),
            a: color[3] || 1.0,
            base: `rgb(${Math.floor(color[0] * 255)}, ${Math.floor(color[1] * 255)}, ${Math.floor(color[2] * 255)})`,
            dark: `rgb(${Math.floor(color[0] * 150)}, ${Math.floor(color[1] * 150)}, ${Math.floor(color[2] * 150)})`,
            light: `rgb(${Math.min(255, Math.floor(color[0] * 350))}, ${Math.min(255, Math.floor(color[1] * 350))}, ${Math.min(255, Math.floor(color[2] * 350))})`,
        };
    }

    // ============================================
    // SPRITE GENERATORS - GROUND ENEMIES
    // ============================================

    /**
     * Slug/Hedgehog sprite (animated walking)
     */
    drawSlugSprite(ctx, config, progress, width, height) {
        const colors = this.getColor(config);
        const cx = width / 2;
        const cy = height / 2;

        // Body bob animation
        const bob = Math.sin(progress * Math.PI * 2) * 2;
        
        // Body
        const bodyGradient = ctx.createRadialGradient(cx - 5, cy - 5 + bob, 0, cx, cy + bob, width * 0.6);
        bodyGradient.addColorStop(0, colors.light);
        bodyGradient.addColorStop(0.5, colors.base);
        bodyGradient.addColorStop(1, colors.dark);
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.ellipse(cx, cy + bob, width * 0.4, height * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Spikes
        const numSpikes = 5;
        for (let i = 0; i < numSpikes; i++) {
            const spikeProgress = (i / numSpikes + progress) % 1;
            const spikeHeight = 6 + Math.sin(spikeProgress * Math.PI * 2) * 2;
            const x = cx - width * 0.3 + (i / numSpikes) * width * 0.6;
            
            ctx.fillStyle = colors.dark;
            ctx.beginPath();
            ctx.moveTo(x, cy - height * 0.2 + bob);
            ctx.lineTo(x - 3, cy - height * 0.2 - spikeHeight + bob);
            ctx.lineTo(x + 3, cy - height * 0.2 - spikeHeight + bob);
            ctx.closePath();
            ctx.fill();
        }

        // Face
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(cx + width * 0.2, cy - 2 + bob, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Spike ball sprite (rotating)
     */
    drawSpikeBallSprite(ctx, config, progress, width, height) {
        const colors = this.getColor(config);
        const cx = width / 2;
        const cy = height / 2;
        const radius = Math.min(width, height) / 2.5;
        const rotation = progress * Math.PI * 2;

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + height * 0.4, radius * 0.8, radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Main body
        const bodyGradient = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, 0, cx, cy, radius);
        bodyGradient.addColorStop(0, colors.light);
        bodyGradient.addColorStop(0.6, colors.base);
        bodyGradient.addColorStop(1, colors.dark);
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Spikes
        const numSpikes = 12;
        for (let i = 0; i < numSpikes; i++) {
            const angle = (i / numSpikes) * Math.PI * 2 + rotation;
            const spikeLength = radius * 0.6;
            const tipX = cx + Math.cos(angle) * (radius + spikeLength);
            const tipY = cy + Math.sin(angle) * (radius + spikeLength);
            
            const spikeGradient = ctx.createLinearGradient(cx, cy, tipX, tipY);
            spikeGradient.addColorStop(0, colors.base);
            spikeGradient.addColorStop(1, colors.dark);
            
            ctx.fillStyle = spikeGradient;
            ctx.strokeStyle = colors.dark;
            ctx.lineWidth = 1;
            
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
            ctx.lineTo(tipX, tipY);
            ctx.lineTo(
                cx + Math.cos(angle + 0.2) * radius,
                cy + Math.sin(angle + 0.2) * radius
            );
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    }

    /**
     * Chomper sprite (mouth opening/closing)
     */
    drawChomperSprite(ctx, config, progress, width, height) {
        const colors = this.getColor(config);
        const cx = width / 2;
        const cy = height / 2;
        const mouthOpen = Math.abs(Math.sin(progress * Math.PI * 2)) * 0.5 + 0.2;

        // Body
        const bodyGradient = ctx.createRadialGradient(cx - 6, cy - 6, 0, cx, cy, width * 0.5);
        bodyGradient.addColorStop(0, colors.light);
        bodyGradient.addColorStop(0.7, colors.base);
        bodyGradient.addColorStop(1, colors.dark);
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.arc(cx, cy, width * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Mouth
        ctx.save();
        ctx.translate(cx, cy);
        
        // Upper jaw
        ctx.fillStyle = colors.dark;
        ctx.beginPath();
        ctx.moveTo(0, -mouthOpen * height * 0.3);
        ctx.lineTo(width * 0.3, -mouthOpen * height * 0.2);
        ctx.lineTo(width * 0.3, 0);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();

        // Lower jaw
        ctx.beginPath();
        ctx.moveTo(0, mouthOpen * height * 0.3);
        ctx.lineTo(width * 0.3, mouthOpen * height * 0.2);
        ctx.lineTo(width * 0.3, 0);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();

        // Teeth
        ctx.fillStyle = '#fff';
        const numTeeth = 4;
        for (let i = 0; i < numTeeth; i++) {
            const x = (i / numTeeth) * width * 0.3;
            // Upper teeth
            ctx.fillRect(x, -mouthOpen * height * 0.3, 3, 5);
            // Lower teeth
            ctx.fillRect(x, mouthOpen * height * 0.3 - 5, 3, 5);
        }

        ctx.restore();

        // Eyes
        const eyeY = cy - height * 0.15;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx - 6, eyeY, 4, 0, Math.PI * 2);
        ctx.arc(cx + 6, eyeY, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(cx - 6, eyeY, 2, 0, Math.PI * 2);
        ctx.arc(cx + 6, eyeY, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // ============================================
    // SPRITE GENERATORS - FLYING ENEMIES
    // ============================================

    /**
     * Fly sprite (wings flapping)
     */
    drawFlySprite(ctx, config, progress, width, height) {
        const colors = this.getColor(config);
        const cx = width / 2;
        const cy = height / 2;
        const wingFlap = Math.sin(progress * Math.PI * 2) * 0.8;

        // Wings
        ctx.fillStyle = `rgba(${colors.r}, ${colors.g}, ${colors.b}, 0.4)`;
        ctx.strokeStyle = colors.dark;
        ctx.lineWidth = 1;

        // Left wing
        ctx.save();
        ctx.translate(cx - 4, cy);
        ctx.rotate(-wingFlap);
        ctx.beginPath();
        ctx.ellipse(0, 0, width * 0.35, height * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Right wing
        ctx.save();
        ctx.translate(cx + 4, cy);
        ctx.rotate(wingFlap);
        ctx.beginPath();
        ctx.ellipse(0, 0, width * 0.35, height * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Body
        const bodyGradient = ctx.createRadialGradient(cx - 2, cy - 2, 0, cx, cy, width * 0.25);
        bodyGradient.addColorStop(0, colors.light);
        bodyGradient.addColorStop(0.7, colors.base);
        bodyGradient.addColorStop(1, colors.dark);
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.ellipse(cx, cy, width * 0.2, height * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(cx - 2, cy - 2, 1.5, 0, Math.PI * 2);
        ctx.arc(cx + 2, cy - 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Wasp sprite (more aggressive)
     */
    drawWaspSprite(ctx, config, progress, width, height) {
        const colors = this.getColor(config);
        const cx = width / 2;
        const cy = height / 2;
        const wingFlap = Math.sin(progress * Math.PI * 4) * 0.6;

        // Wings (faster flap)
        ctx.fillStyle = `rgba(200, 200, 255, 0.3)`;
        ctx.strokeStyle = colors.dark;
        ctx.lineWidth = 1;

        ctx.save();
        ctx.translate(cx, cy - height * 0.15);
        ctx.rotate(-wingFlap);
        ctx.beginPath();
        ctx.ellipse(-width * 0.2, 0, width * 0.3, height * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.translate(cx, cy - height * 0.15);
        ctx.rotate(wingFlap);
        ctx.beginPath();
        ctx.ellipse(width * 0.2, 0, width * 0.3, height * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Body segments
        const segments = 3;
        for (let i = 0; i < segments; i++) {
            const segY = cy - height * 0.2 + (i / segments) * height * 0.6;
            const segWidth = width * 0.25 * (1 - i * 0.1);
            
            const segGradient = ctx.createRadialGradient(cx - 2, segY, 0, cx, segY, segWidth);
            segGradient.addColorStop(0, colors.light);
            segGradient.addColorStop(0.5, colors.base);
            segGradient.addColorStop(1, colors.dark);
            
            ctx.fillStyle = segGradient;
            ctx.beginPath();
            ctx.ellipse(cx, segY, segWidth, height * 0.15, 0, 0, Math.PI * 2);
            ctx.fill();

            // Stripes
            ctx.strokeStyle = colors.dark;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - segWidth, segY);
            ctx.lineTo(cx + segWidth, segY);
            ctx.stroke();
        }

        // Stinger
        ctx.fillStyle = colors.dark;
        ctx.beginPath();
        ctx.moveTo(cx, cy + height * 0.35);
        ctx.lineTo(cx - 2, cy + height * 0.45);
        ctx.lineTo(cx + 2, cy + height * 0.45);
        ctx.closePath();
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(cx - 3, cy - height * 0.15, 2, 0, Math.PI * 2);
        ctx.arc(cx + 3, cy - height * 0.15, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Bat sprite (wing animation)
     */
    drawBatSprite(ctx, config, progress, width, height) {
        const colors = this.getColor(config);
        const cx = width / 2;
        const cy = height / 2;
        const wingFlap = Math.sin(progress * Math.PI * 2);

        // Wings
        ctx.fillStyle = colors.base;
        ctx.strokeStyle = colors.dark;
        ctx.lineWidth = 1;

        // Left wing
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(
            cx - width * 0.4, cy - wingFlap * height * 0.3,
            cx - width * 0.5, cy + height * 0.1
        );
        ctx.lineTo(cx - width * 0.2, cy + height * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right wing
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(
            cx + width * 0.4, cy - wingFlap * height * 0.3,
            cx + width * 0.5, cy + height * 0.1
        );
        ctx.lineTo(cx + width * 0.2, cy + height * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Body
        const bodyGradient = ctx.createRadialGradient(cx - 3, cy - 3, 0, cx, cy, width * 0.2);
        bodyGradient.addColorStop(0, colors.light);
        bodyGradient.addColorStop(0.7, colors.base);
        bodyGradient.addColorStop(1, colors.dark);
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.ellipse(cx, cy, width * 0.15, height * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ears
        ctx.fillStyle = colors.dark;
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy - height * 0.2);
        ctx.lineTo(cx - 7, cy - height * 0.4);
        ctx.lineTo(cx - 2, cy - height * 0.25);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx + 4, cy - height * 0.2);
        ctx.lineTo(cx + 7, cy - height * 0.4);
        ctx.lineTo(cx + 2, cy - height * 0.25);
        ctx.closePath();
        ctx.fill();
    }

    // ============================================
    // SPRITE GENERATORS - CHASER ENEMIES
    // ============================================

    /**
     * Ghost sprite (floating, wavy)
     */
    drawGhostSprite(ctx, config, progress, width, height) {
        const colors = this.getColor(config);
        const cx = width / 2;
        const cy = height / 2;
        const wave = progress * Math.PI * 2;

        // Glow effect
        const glowGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, width * 0.6);
        glowGradient.addColorStop(0, `rgba(${colors.r}, ${colors.g}, ${colors.b}, 0.6)`);
        glowGradient.addColorStop(0.5, `rgba(${colors.r}, ${colors.g}, ${colors.b}, 0.3)`);
        glowGradient.addColorStop(1, `rgba(${colors.r}, ${colors.g}, ${colors.b}, 0)`);
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(cx, cy, width * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Body
        const bodyGradient = ctx.createRadialGradient(cx - 4, cy - 6, 0, cx, cy, width * 0.4);
        bodyGradient.addColorStop(0, colors.light);
        bodyGradient.addColorStop(0.6, colors.base);
        bodyGradient.addColorStop(1, colors.dark);
        
        ctx.fillStyle = bodyGradient;
        ctx.globalAlpha = 0.8;
        
        ctx.beginPath();
        ctx.arc(cx, cy - height * 0.1, width * 0.35, 0, Math.PI, true);
        
        // Wavy bottom
        const numWaves = 5;
        for (let i = 0; i <= numWaves; i++) {
            const x = cx - width * 0.35 + (i / numWaves) * width * 0.7;
            const y = cy + height * 0.2 + Math.sin(wave + i) * 3;
            if (i === 0) {
                ctx.lineTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.closePath();
        ctx.fill();
        
        ctx.globalAlpha = 1.0;

        // Eyes
        const eyeGlow = 0.5 + Math.sin(wave * 2) * 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${eyeGlow})`;
        ctx.beginPath();
        ctx.arc(cx - 6, cy - 4, 4, 0, Math.PI * 2);
        ctx.arc(cx + 6, cy - 4, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Stalker sprite (menacing creature)
     */
    drawStalkerSprite(ctx, config, progress, width, height) {
        const colors = this.getColor(config);
        const cx = width / 2;
        const cy = height / 2;
        const pulse = Math.sin(progress * Math.PI * 2) * 0.1 + 1;

        // Shadow form
        ctx.fillStyle = `rgba(${colors.r * 0.3}, ${colors.g * 0.3}, ${colors.b * 0.3}, 0.5)`;
        ctx.beginPath();
        ctx.ellipse(cx, cy + height * 0.3, width * 0.4, height * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Main body
        const bodyGradient = ctx.createRadialGradient(cx, cy - height * 0.1, 0, cx, cy, width * 0.4);
        bodyGradient.addColorStop(0, colors.light);
        bodyGradient.addColorStop(0.5, colors.base);
        bodyGradient.addColorStop(1, colors.dark);
        
        ctx.fillStyle = bodyGradient;
        ctx.save();
        ctx.scale(pulse, pulse);
        ctx.translate(cx * (1 - pulse), cy * (1 - pulse));
        ctx.beginPath();
        ctx.ellipse(cx, cy, width * 0.35, height * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Tendrils
        const numTendrils = 4;
        for (let i = 0; i < numTendrils; i++) {
            const angle = (i / numTendrils) * Math.PI * 2 + progress * Math.PI * 2;
            const length = height * 0.3 + Math.sin(progress * Math.PI * 4 + i) * 5;
            
            ctx.strokeStyle = colors.dark;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy + height * 0.2);
            ctx.quadraticCurveTo(
                cx + Math.cos(angle) * width * 0.2,
                cy + height * 0.3,
                cx + Math.cos(angle) * length * 0.5,
                cy + height * 0.4 + Math.sin(angle) * length * 0.5
            );
            ctx.stroke();
        }

        // Glowing eyes
        const eyeIntensity = 0.7 + Math.sin(progress * Math.PI * 4) * 0.3;
        ctx.fillStyle = `rgba(255, 50, 50, ${eyeIntensity})`;
        ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(cx - 7, cy - 5, 3, 0, Math.PI * 2);
        ctx.arc(cx + 7, cy - 5, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    /**
     * Orb sprite (energy ball)
     */
    drawOrbSprite(ctx, config, progress, width, height) {
        const colors = this.getColor(config);
        const cx = width / 2;
        const cy = height / 2;
        const radius = Math.min(width, height) / 2.5;
        const pulse = Math.sin(progress * Math.PI * 2) * 0.15 + 1;

        // Outer glow layers
        for (let i = 3; i > 0; i--) {
            const glowRadius = radius * pulse * (1 + i * 0.3);
            const glowAlpha = 0.15 / i;
            
            const glowGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
            glowGradient.addColorStop(0, `rgba(${colors.r}, ${colors.g}, ${colors.b}, ${glowAlpha})`);
            glowGradient.addColorStop(1, `rgba(${colors.r}, ${colors.g}, ${colors.b}, 0)`);
            
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Core
        const coreGradient = ctx.createRadialGradient(
            cx - radius * 0.3, cy - radius * 0.3, 0,
            cx, cy, radius * pulse
        );
        coreGradient.addColorStop(0, '#fff');
        coreGradient.addColorStop(0.3, colors.light);
        coreGradient.addColorStop(0.7, colors.base);
        coreGradient.addColorStop(1, colors.dark);
        
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Energy arcs
        const numArcs = 3;
        ctx.strokeStyle = colors.light;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        
        for (let i = 0; i < numArcs; i++) {
            const arcProgress = (progress + i / numArcs) % 1;
            const arcRadius = radius * 0.6 + arcProgress * radius * 0.4;
            
            ctx.beginPath();
            ctx.arc(cx, cy, arcRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.globalAlpha = 1.0;
    }

    /**
     * Turret sprite (stationary cannon)
     */
    drawTurretSprite(ctx, config, progress, width, height) {
        const colors = this.getColor(config);
        const cx = width / 2;
        const cy = height / 2;

        // Base
        const baseGradient = ctx.createLinearGradient(cx - width * 0.4, cy, cx + width * 0.4, cy);
        baseGradient.addColorStop(0, colors.dark);
        baseGradient.addColorStop(0.5, colors.base);
        baseGradient.addColorStop(1, colors.dark);
        
        ctx.fillStyle = baseGradient;
        ctx.fillRect(cx - width * 0.4, cy + height * 0.2, width * 0.8, height * 0.2);

        // Turret body
        const bodyGradient = ctx.createRadialGradient(cx - 4, cy - 4, 0, cx, cy, width * 0.35);
        bodyGradient.addColorStop(0, colors.light);
        bodyGradient.addColorStop(0.6, colors.base);
        bodyGradient.addColorStop(1, colors.dark);
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.arc(cx, cy, width * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Barrel (rotating slightly with animation)
        const barrelAngle = Math.sin(progress * Math.PI * 2) * 0.2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(barrelAngle);
        
        const barrelGradient = ctx.createLinearGradient(0, -3, 0, 3);
        barrelGradient.addColorStop(0, colors.dark);
        barrelGradient.addColorStop(0.5, colors.base);
        barrelGradient.addColorStop(1, colors.dark);
        
        ctx.fillStyle = barrelGradient;
        ctx.fillRect(0, -3, width * 0.4, 6);
        
        // Barrel tip
        ctx.fillStyle = '#333';
        ctx.fillRect(width * 0.35, -4, width * 0.05, 8);
        
        ctx.restore();

        // Details
        ctx.strokeStyle = colors.dark;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, width * 0.35, 0, Math.PI * 2);
        ctx.stroke();

        // Charging light
        const lightIntensity = progress;
        ctx.fillStyle = `rgba(255, 100, 0, ${lightIntensity * 0.8})`;
        ctx.beginPath();
        ctx.arc(cx, cy - 6, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // ============================================
    // FALLBACK SPRITES
    // ============================================

    /**
     * Generic flying sprite
     */
    drawFlyingSprite(ctx, config, progress, width, height) {
        this.drawFlySprite(ctx, config, progress, width, height);
    }

    /**
     * Generic chaser sprite
     */
    drawChaserSprite(ctx, config, progress, width, height) {
        this.drawGhostSprite(ctx, config, progress, width, height);
    }

    /**
     * Generic ground sprite
     */
    drawGroundSprite(ctx, config, progress, width, height) {
        const colors = this.getColor(config);
        const cx = width / 2;
        const cy = height / 2;
        const bob = Math.sin(progress * Math.PI * 2) * 2;

        const bodyGradient = ctx.createRadialGradient(cx - 4, cy - 4, 0, cx, cy, width * 0.4);
        bodyGradient.addColorStop(0, colors.light);
        bodyGradient.addColorStop(0.6, colors.base);
        bodyGradient.addColorStop(1, colors.dark);
        
        ctx.fillStyle = bodyGradient;
        ctx.fillRect(cx - width * 0.35, cy - height * 0.35 + bob, width * 0.7, height * 0.7);
        
        ctx.strokeStyle = colors.dark;
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - width * 0.35, cy - height * 0.35 + bob, width * 0.7, height * 0.7);

        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx - 6, cy - 4 + bob, 4, 0, Math.PI * 2);
        ctx.arc(cx + 6, cy - 4 + bob, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(cx - 6, cy - 4 + bob, 2, 0, Math.PI * 2);
        ctx.arc(cx + 6, cy - 4 + bob, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Generic jumper sprite
     */
    drawJumperSprite(ctx, config, progress, width, height) {
        const colors = this.getColor(config);
        const cx = width / 2;
        const cy = height / 2;
        const squash = Math.abs(Math.sin(progress * Math.PI)) * 0.3 + 1;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, squash);
        ctx.translate(-cx, -cy);

        const bodyGradient = ctx.createRadialGradient(cx - 4, cy - 4, 0, cx, cy, width * 0.4);
        bodyGradient.addColorStop(0, colors.light);
        bodyGradient.addColorStop(0.6, colors.base);
        bodyGradient.addColorStop(1, colors.dark);
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.arc(cx, cy, width * 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(cx - 5, cy - 3, 2, 0, Math.PI * 2);
        ctx.arc(cx + 5, cy - 3, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Mini boss sprite (larger, more detailed)
     */
    drawMiniBossSprite(ctx, config, progress, width, height) {
        const colors = this.getColor(config);
        const cx = width / 2;
        const cy = height / 2;
        const pulse = Math.sin(progress * Math.PI * 2) * 0.1 + 1;

        // Aura
        const auraGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, width * 0.6);
        auraGradient.addColorStop(0, `rgba(${colors.r}, ${colors.g}, ${colors.b}, 0.4)`);
        auraGradient.addColorStop(0.7, `rgba(${colors.r}, ${colors.g}, ${colors.b}, 0.2)`);
        auraGradient.addColorStop(1, `rgba(${colors.r}, ${colors.g}, ${colors.b}, 0)`);
        
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(cx, cy, width * 0.6 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Main body
        const bodyGradient = ctx.createRadialGradient(cx - 6, cy - 6, 0, cx, cy, width * 0.45);
        bodyGradient.addColorStop(0, colors.light);
        bodyGradient.addColorStop(0.5, colors.base);
        bodyGradient.addColorStop(1, colors.dark);
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.arc(cx, cy, width * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Armor plating
        ctx.strokeStyle = colors.dark;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, width * 0.45, 0, Math.PI * 2);
        ctx.stroke();

        // Spikes
        const numSpikes = 8;
        for (let i = 0; i < numSpikes; i++) {
            const angle = (i / numSpikes) * Math.PI * 2 + progress * Math.PI;
            const spikeLength = width * 0.2;
            const baseX = cx + Math.cos(angle) * width * 0.35;
            const baseY = cy + Math.sin(angle) * width * 0.35;
            const tipX = cx + Math.cos(angle) * (width * 0.35 + spikeLength);
            const tipY = cy + Math.sin(angle) * (width * 0.35 + spikeLength);
            
            ctx.fillStyle = colors.base;
            ctx.strokeStyle = colors.dark;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(baseX, baseY);
            ctx.lineTo(tipX, tipY);
            ctx.lineTo(
                baseX + Math.cos(angle + 0.3) * width * 0.1,
                baseY + Math.sin(angle + 0.3) * width * 0.1
            );
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        // Glowing core
        const coreGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, width * 0.15);
        coreGradient.addColorStop(0, '#fff');
        coreGradient.addColorStop(0.5, colors.light);
        coreGradient.addColorStop(1, colors.base);
        
        ctx.fillStyle = coreGradient;
        ctx.shadowColor = colors.base;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(cx, cy, width * 0.15 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    /**
     * Default fallback sprite
     */
    drawDefaultSprite(ctx, config, progress, width, height) {
        this.drawGroundSprite(ctx, config, progress, width, height);
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.spriteCache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return this.spriteCache.getStats();
    }

    /**
     * Pre-load common enemy sprites
     */
    preloadCommonEnemies(enemyConfigs) {
        this.spriteCache.preload(enemyConfigs);
    }
}
