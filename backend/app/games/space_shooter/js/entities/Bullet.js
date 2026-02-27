import GameObject from './GameObject.js';
import Vector2 from '../utils/Vector2.js';
/**
 * Bullet - Proiettile con effetti avanzati
 */
class Bullet extends GameObject {
    constructor(x, y, velocityX, velocityY, owner = 'player', scale = 1) {
        super(x, y, Math.round(8 * scale), Math.round(24 * scale));
        this.tag = 'bullet';
        this.owner = owner;
        this.velocity = new Vector2(velocityX, velocityY);
        this.damage = 1;
        this.sprite = owner === 'player' ? 'bullet_player' : 'bullet_enemy';
        
        // Trail effect
        this.trail = [];
        this.maxTrailLength = 8;
        
        // Animation
        this.glowPulse = Math.random() * Math.PI * 2;
        this.age = 0;
    }

    update(deltaTime, game) {
        this.age += deltaTime;
        this.glowPulse += deltaTime * 15;
        
        // Save position for trail
        this.trail.unshift({ 
            x: this.position.x + this.width / 2, 
            y: this.position.y + this.height / 2,
            vx: this.velocity.x,
            vy: this.velocity.y
        });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.pop();
        }
        
        // Movement
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        
        // Rotation based on direction
        this.rotation = Math.atan2(this.velocity.y, this.velocity.x) + Math.PI / 2;
        
        // Remove if off screen
        if (this.isOffScreen(game.canvas.width, game.canvas.height)) {
            this.destroy();
        }
    }

    render(ctx, assets) {
        const isPlayer = this.owner === 'player';
        const baseColor = isPlayer ? { r: 0, g: 200, b: 255 } : { r: 255, g: 80, b: 80 };
        const coreColor = isPlayer ? { r: 150, g: 240, b: 255 } : { r: 255, g: 200, b: 150 };
        
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        
        // Draw energy trail
        for (let i = 0; i < this.trail.length; i++) {
            const t = i / this.maxTrailLength;
            const pos = this.trail[i];
            const alpha = (1 - t) * 0.6;
            const size = (1 - t * 0.7) * 5;
            
            // Trail glow
            const trailGrad = ctx.createRadialGradient(
                pos.x, pos.y, 0,
                pos.x, pos.y, size * 2
            );
            trailGrad.addColorStop(0, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${alpha})`);
            trailGrad.addColorStop(0.5, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${alpha * 0.3})`);
            trailGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = trailGrad;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, size * 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Main bullet position
        const cx = this.position.x + this.width / 2;
        const cy = this.position.y + this.height / 2;
        const pulseIntensity = 0.7 + Math.sin(this.glowPulse) * 0.3;
        
        // Outer glow
        const outerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
        outerGlow.addColorStop(0, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${pulseIntensity * 0.4})`);
        outerGlow.addColorStop(0.5, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${pulseIntensity * 0.1})`);
        outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, 20, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner core glow
        const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 8);
        coreGlow.addColorStop(0, `rgba(${coreColor.r}, ${coreColor.g}, ${coreColor.b}, ${pulseIntensity})`);
        coreGlow.addColorStop(0.4, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${pulseIntensity * 0.8})`);
        coreGlow.addColorStop(1, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0)`);
        
        ctx.fillStyle = coreGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // Draw sprite
        assets.drawSprite(
            ctx, this.sprite,
            this.position.x, this.position.y,
            this.width, this.height,
            this.rotation
        );
    }

    getBounds() {
        const margin = 2;
        return {
            x: this.position.x + margin,
            y: this.position.y + margin,
            width: this.width - margin * 2,
            height: this.height - margin * 2
        };
    }
}

export default Bullet;