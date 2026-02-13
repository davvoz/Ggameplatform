import GameObject from './GameObject.js';
/**
 * PowerUp - Potenziamenti raccoglibili con effetti avanzati
 */
class PowerUp extends GameObject {
    constructor(x, y, type = 'weapon') {
        super(x - 16, y - 16, 32, 32);
        this.tag = 'powerup';
        this.type = type;
        this.speed = 70;
        
        // Animation
        this.bobTimer = Math.random() * Math.PI * 2;
        this.bobAmount = 6;
        this.rotationSpeed = 1.5;
        this.glowPulse = Math.random() * Math.PI * 2;
        this.sparkTimer = 0;
        
        // Sparks
        this.sparks = [];
        
        // Sprite
        this.sprite = `powerup_${type}`;
        
        // Colors per ogni tipo di power-up
        this.colors = {
            weapon: { r: 255, g: 170, b: 0 },
            health: { r: 50, g: 255, b: 100 },
            shield: { r: 68, g: 170, b: 255 },
            bomb: { r: 255, g: 68, b: 68 },
            speed: { r: 0, g: 255, b: 255 },
            rapid: { r: 255, g: 255, b: 0 },
            magnet: { r: 200, g: 100, b: 255 },
            life: { r: 255, g: 100, b: 200 }
        };
    }

    update(deltaTime, game) {
        // Effetto magnete - attira verso il player
        if (game.magnetActive && game.player && game.player.active) {
            const playerCenter = game.player.getCenter();
            const myCenter = this.getCenter();
            const dx = playerCenter.x - myCenter.x;
            const dy = playerCenter.y - myCenter.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 10) {
                const magnetSpeed = 300;
                this.position.x += (dx / dist) * magnetSpeed * deltaTime;
                this.position.y += (dy / dist) * magnetSpeed * deltaTime;
            }
        } else {
            // Movement normale
            this.position.y += this.speed * deltaTime;
        }
        
        // Animation
        this.bobTimer += deltaTime * 3;
        this.rotation += this.rotationSpeed * deltaTime;
        this.glowPulse += deltaTime * 6;
        
        // Spawn sparks
        this.sparkTimer += deltaTime;
        if (this.sparkTimer > 0.1) {
            this.sparkTimer = 0;
            const angle = Math.random() * Math.PI * 2;
            const color = this.colors[this.type] || this.colors.weapon;
            this.sparks.push({
                x: this.position.x + this.width / 2 + Math.cos(angle) * 15,
                y: this.position.y + this.height / 2 + Math.sin(angle) * 15,
                vx: Math.cos(angle) * 20,
                vy: Math.sin(angle) * 20 - 30,
                life: 1,
                size: 2 + Math.random() * 2,
                color: color
            });
        }
        
        // Update sparks
        this.sparks.forEach(s => {
            s.x += s.vx * deltaTime;
            s.y += s.vy * deltaTime;
            s.life -= deltaTime * 2;
            s.size *= 0.95;
        });
        this.sparks = this.sparks.filter(s => s.life > 0);
        
        // Remove if off screen
        if (this.position.y > game.canvas.height + 50) {
            this.destroy();
        }
    }

    apply(player, game) {
        switch (this.type) {
            case 'weapon':
                player.upgradeWeapon();
                break;
                
            case 'health':
                player.heal(1);
                break;
                
            case 'shield':
                player.invincible = true;
                player.invincibleTime = 5;
                break;
                
            case 'bomb':
                game.enemies.forEach(enemy => {
                    enemy.takeDamage(enemy.health, game);
                });
                game.postProcessing.flash({ r: 255, g: 255, b: 255 }, 0.3);
                game.postProcessing.shake(20, 0.5);
                break;
                
            case 'speed':
                player.speedBoost = true;
                player.speedBoostTime = 8;
                player.speed = 420; // +40% velocità
                break;
                
            case 'rapid':
                player.rapidFire = true;
                player.rapidFireTime = 6;
                player.fireRate = 0.18; // Fire rate più veloce ma non esagerato
                player.heatPerShot = 5; // Meno surriscaldamento durante rapid fire
                break;
                
            case 'magnet':
                game.magnetActive = true;
                game.magnetTime = 10;
                break;
                
            case 'life':
                if (player.maxHealth < player.absoluteMaxHealth) {
                    player.maxHealth++;
                    player.health = player.maxHealth;
                } else {
                    // Se già al max, cura completamente invece
                    player.health = player.maxHealth;
                }
                break;
        }
        
        game.sound.playPowerUp();
        this.destroy();
    }

    render(ctx, assets) {
        ctx.save();
        
        const bobOffset = Math.sin(this.bobTimer) * this.bobAmount;
        const drawY = this.position.y + bobOffset;
        const centerX = this.position.x + this.width / 2;
        const centerY = drawY + this.height / 2;
        const color = this.colors[this.type] || this.colors.weapon;
        
        // Draw sparks
        ctx.globalCompositeOperation = 'lighter';
        this.sparks.forEach(s => {
            const sparkGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 2);
            sparkGrad.addColorStop(0, `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.life})`);
            sparkGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = sparkGrad;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * 2, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalCompositeOperation = 'source-over';
        
        // Outer glow ring
        const glowIntensity = 0.4 + Math.sin(this.glowPulse) * 0.3;
        const ringRadius = this.width * 0.8 + Math.sin(this.glowPulse * 2) * 3;
        
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${glowIntensity * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner glow
        const innerGlow = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, this.width * 1.2
        );
        innerGlow.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${glowIntensity * 0.6})`);
        innerGlow.addColorStop(0.4, `rgba(${color.r}, ${color.g}, ${color.b}, ${glowIntensity * 0.3})`);
        innerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.width * 1.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Light rays
        ctx.globalCompositeOperation = 'lighter';
        const rayCount = 6;
        for (let i = 0; i < rayCount; i++) {
            const rayAngle = (i / rayCount) * Math.PI * 2 + this.rotation * 0.5;
            const rayLength = 25 + Math.sin(this.glowPulse + i) * 10;
            
            const rayGrad = ctx.createLinearGradient(
                centerX, centerY,
                centerX + Math.cos(rayAngle) * rayLength,
                centerY + Math.sin(rayAngle) * rayLength
            );
            rayGrad.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${glowIntensity * 0.4})`);
            rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.strokeStyle = rayGrad;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(
                centerX + Math.cos(rayAngle) * rayLength,
                centerY + Math.sin(rayAngle) * rayLength
            );
            ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
        
        // Draw sprite
        assets.drawSprite(
            ctx, this.sprite,
            this.position.x, drawY,
            this.width, this.height,
            this.rotation
        );
        
        ctx.restore();
    }

    getGlowColor() {
        switch (this.type) {
            case 'weapon': return 'rgb(255, 170, 0)';
            case 'health': return 'rgb(68, 255, 68)';
            case 'shield': return 'rgb(68, 170, 255)';
            case 'bomb': return 'rgb(255, 68, 68)';
            case 'speed': return 'rgb(0, 255, 255)';
            case 'rapid': return 'rgb(255, 255, 0)';
            case 'magnet': return 'rgb(200, 100, 255)';
            case 'life': return 'rgb(255, 100, 200)';
            default: return 'rgb(255, 255, 255)';
        }
    }
}

export default PowerUp;