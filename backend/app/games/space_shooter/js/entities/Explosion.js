/**
 * Explosion - Effetto esplosione animato avanzato
 */
class Explosion extends GameObject {
    constructor(x, y, size = 'medium') {
        const sizes = {
            'small': 40,
            'medium': 72,
            'large': 120
        };

        const s = sizes[size] || sizes['medium'];
        super(x - s / 2, y - s / 2, s, s);

        this.tag = 'explosion';
        this.size = size;

        // Animation
        this.frameCount = 8;
        this.currentFrame = 0;
        this.frameTime = 0;
        this.frameDuration = 0.06;

        // Particles
        this.particles = this.createParticles();

        // Shockwave
        this.shockwaveRadius = 0;
        this.shockwaveMaxRadius = s * 1.5;
        this.shockwaveSpeed = s * 4;

        // Flash
        this.flashIntensity = 1;

        // Center position for effects
        this.centerX = x;
        this.centerY = y;
    }

    createParticles() {
        const particles = [];
        const count = this.size === 'large' ? 30 : this.size === 'medium' ? 18 : 10;

        // Fire particles
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
            const speed = 80 + Math.random() * 200;

            particles.push({
                x: this.centerX,
                y: this.centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 6,
                life: 1,
                decay: 1.2 + Math.random() * 0.8,
                type: 'fire',
                hue: Math.random() * 60 // 0-60 = red to yellow
            });
        }

        // Spark particles
        const sparkCount = Math.floor(count * 0.7);
        for (let i = 0; i < sparkCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 150 + Math.random() * 250;

            particles.push({
                x: this.centerX,
                y: this.centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 1 + Math.random() * 2,
                life: 1,
                decay: 2 + Math.random(),
                type: 'spark'
            });
        }

        // Smoke particles
        const smokeCount = Math.floor(count * 0.5);
        for (let i = 0; i < smokeCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 20 + Math.random() * 40;

            particles.push({
                x: this.centerX + (Math.random() - 0.5) * 20,
                y: this.centerY + (Math.random() - 0.5) * 20,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 30,
                size: 10 + Math.random() * 15,
                life: 1,
                decay: 0.6 + Math.random() * 0.4,
                type: 'smoke',
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 2
            });
        }

        return particles;
    }

    update(deltaTime, game) {
        // Update sprite animation
        this.frameTime += deltaTime;
        if (this.frameTime >= this.frameDuration) {
            this.frameTime = 0;
            this.currentFrame++;

            if (this.currentFrame >= this.frameCount) {
                this.destroy();
                return;
            }
        }

        // Update shockwave
        this.shockwaveRadius += this.shockwaveSpeed * deltaTime;

        // Update flash
        this.flashIntensity = Math.max(0, this.flashIntensity - deltaTime * 4);

        // Update particles
        this.particles.forEach(p => {
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;

            if (p.type === 'fire') {
                p.vy += 50 * deltaTime;
                p.vx *= 0.98;
            } else if (p.type === 'spark') {
                p.vy += 200 * deltaTime;
            } else if (p.type === 'smoke') {
                p.vy -= 40 * deltaTime;
                p.size *= 1.02;
                p.rotation += p.rotationSpeed * deltaTime;
            }

            p.life -= p.decay * deltaTime;
            if (p.type !== 'smoke') {
                p.size *= 0.96;
            }
        });

        // Remove dead particles
        this.particles = this.particles.filter(p => p.life > 0 && p.size > 0.3);
    }

    render(ctx, assets) {
        ctx.save();

        // Draw shockwave
        if (this.shockwaveRadius < this.shockwaveMaxRadius) {
            const shockwaveAlpha = 1 - this.shockwaveRadius / this.shockwaveMaxRadius;
            ctx.strokeStyle = `rgba(255, 200, 100, ${shockwaveAlpha * 0.6})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, this.shockwaveRadius, 0, Math.PI * 2);
            ctx.stroke();

            // Inner shockwave
            ctx.strokeStyle = `rgba(255, 255, 200, ${shockwaveAlpha * 0.4})`;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, this.shockwaveRadius * 0.7, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw smoke particles (behind main explosion)
        this.particles.filter(p => p.type === 'smoke').forEach(p => {
            if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(p.size) || p.size <= 0) return;
            
            const alpha = p.life * 0.4;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation || 0);

            const smokeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(0.1, p.size));
            smokeGrad.addColorStop(0, `rgba(80, 60, 40, ${alpha})`);
            smokeGrad.addColorStop(0.5, `rgba(50, 40, 30, ${alpha * 0.5})`);
            smokeGrad.addColorStop(1, 'rgba(30, 25, 20, 0)');

            ctx.fillStyle = smokeGrad;
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(0.1, p.size), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Draw central flash
        if (this.flashIntensity > 0) {
            const flashGrad = ctx.createRadialGradient(
                this.centerX, this.centerY, 0,
                this.centerX, this.centerY, this.width * 0.8
            );
            flashGrad.addColorStop(0, `rgba(255, 255, 200, ${this.flashIntensity * 0.8})`);
            flashGrad.addColorStop(0.3, `rgba(255, 200, 100, ${this.flashIntensity * 0.4})`);
            flashGrad.addColorStop(1, 'rgba(255, 100, 50, 0)');

            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = flashGrad;
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, this.width * 0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        // Draw explosion sprite
        const spriteKey = `explosion_${this.currentFrame}`;
        const scale = 1 + (1 - this.currentFrame / this.frameCount) * 0.3;
        const scaledWidth = this.width * scale;
        const scaledHeight = this.height * scale;

        assets.drawSprite(
            ctx, spriteKey,
            this.centerX - scaledWidth / 2,
            this.centerY - scaledHeight / 2,
            scaledWidth,
            scaledHeight
        );

        // Draw fire particles with glow
        ctx.globalCompositeOperation = 'lighter';
        this.particles.filter(p => p.type === 'fire').forEach(p => {
            if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(p.size)) return;
            
            const alpha = p.life;
            const glowSize = Math.max(0.1, p.size * 3);

            // Outer glow
            const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
            glowGrad.addColorStop(0, `hsla(${p.hue}, 100%, 60%, ${alpha * 0.6})`);
            glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = `hsla(${p.hue + 20}, 100%, 70%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw spark particles
        this.particles.filter(p => p.type === 'spark').forEach(p => {
            if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(p.size)) return;
            
            const alpha = p.life;
            ctx.fillStyle = `rgba(255, 255, 200, ${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }
}


