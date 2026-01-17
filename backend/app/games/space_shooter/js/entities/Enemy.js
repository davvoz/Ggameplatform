/**
 * Enemy - Classe base per i nemici
 */
class Enemy extends GameObject {
    constructor(x, y, type = 'enemy1') {
        const sizes = {
            'enemy1': { w: 48, h: 48 },
            'enemy2': { w: 56, h: 56 },
            'enemy3': { w: 72, h: 72 },
            'boss': { w: 160, h: 120 }
        };
        
        const size = sizes[type] || sizes['enemy1'];
        super(x, y, size.w, size.h);
        
        this.tag = 'enemy';
        this.type = type;
        
        // Stats basati sul tipo
        this.initStats();
        
        // Movimento
        this.movementPattern = 'straight';
        this.movementTimer = 0;
        this.startX = x;
        this.amplitude = 100;
        this.frequency = 2;
        
        // Shooting
        this.canShoot = false; // Inizia disabilitato
        this.shootCooldown = 0;
        this.shootInterval = 2;
        this.initialShootDelay = 2.5; // 2.5 secondi prima di iniziare a sparare
        this.shootDelayTimer = this.initialShootDelay;
    }

    initStats() {
        const stats = {
            'enemy1': { health: 1, speed: 75, score: 100, shootInterval: 4.0 },
            'enemy2': { health: 2, speed: 70, score: 200, shootInterval: 3.2 },
            'enemy3': { health: 4, speed: 65, score: 400, shootInterval: 2.2 },
            'boss': { health: 60, speed: 50, score: 5000, shootInterval: 0.5 }
        };
        
        const s = stats[this.type] || stats['enemy1'];
        this.maxHealth = s.health;
        this.health = this.maxHealth;
        this.speed = s.speed;
        this.scoreValue = s.score;
        this.shootInterval = s.shootInterval;
    }

    /**
     * Imposta il pattern di movimento
     */
    setMovementPattern(pattern, params = {}) {
        this.movementPattern = pattern;
        this.amplitude = params.amplitude || 100;
        this.frequency = params.frequency || 2;
        this.targetX = params.targetX;
        this.targetY = params.targetY;
        return this;
    }

    update(deltaTime, game) {
        this.movementTimer += deltaTime;
        
        // Applica pattern di movimento
        switch (this.movementPattern) {
            case 'straight':
                this.velocity.y = this.speed;
                break;
                
            case 'sine':
                this.velocity.y = this.speed;
                this.position.x = this.startX + Math.sin(this.movementTimer * this.frequency) * this.amplitude;
                break;
                
            case 'zigzag':
                this.velocity.y = this.speed;
                const zigzagPhase = Math.floor(this.movementTimer * this.frequency) % 2;
                this.velocity.x = zigzagPhase === 0 ? this.speed * 0.5 : -this.speed * 0.5;
                break;
                
            case 'dive':
                // Si ferma, poi si tuffa verso il player
                if (this.movementTimer < 1) {
                    this.velocity.y = this.speed * 0.3;
                } else {
                    const player = game.player;
                    if (player && player.active) {
                        const dir = player.getCenter().subtract(this.getCenter()).normalize();
                        this.velocity = dir.multiply(this.speed * 2);
                    }
                }
                break;
                
            case 'boss':
                // Movimento orizzontale con oscillazione
                this.velocity.y = this.position.y < 80 ? this.speed : 0;
                this.position.x = game.canvas.width / 2 - this.width / 2 + 
                                  Math.sin(this.movementTimer * 0.5) * (game.canvas.width / 3);
                break;
        }
        
        // Applica velocità
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        
        // Delay iniziale prima di poter sparare
        if (!this.canShoot) {
            this.shootDelayTimer -= deltaTime;
            if (this.shootDelayTimer <= 0) {
                this.canShoot = true;
            }
        }
        
        // Shooting con probabilità basata sul livello
        if (this.canShoot && game.player && game.player.active) {
            this.shootCooldown -= deltaTime;
            if (this.shootCooldown <= 0) {
                // Probabilità di sparo dipende dal livello (ai primi livelli sparano molto meno)
                // Livello 1: 20%, Livello 2: 35%, Livello 3: 50%, etc fino a 95%
                const shootChance = Math.min(0.95, 0.20 + (game.level - 1) * 0.15);
                if (Math.random() < shootChance || this.type === 'boss') {
                    this.shoot(game);
                }
                // Intervallo più lungo ai primi livelli (2x al liv 1, 1x dal liv 5+)
                const levelMultiplier = Math.max(1, 2.0 - (game.level - 1) * 0.25);
                this.shootCooldown = this.shootInterval * levelMultiplier;
            }
        }
        
        // Rimuovi se fuori schermo (sotto)
        if (this.position.y > game.canvas.height + 50) {
            this.destroy();
        }
    }

    shoot(game) {
        const centerX = this.position.x + this.width / 2;
        const bottomY = this.position.y + this.height;
        
        if (this.type === 'boss') {
            // Boss spara pattern multipli
            const patterns = ['spread', 'aimed', 'burst'];
            const pattern = patterns[Math.floor(Math.random() * patterns.length)];
            
            switch (pattern) {
                case 'spread':
                    for (let i = -2; i <= 2; i++) {
                        game.spawnBullet(centerX - 4, bottomY, i * 60, 250, 'enemy');
                    }
                    break;
                case 'aimed':
                    if (game.player && game.player.active) {
                        const dir = game.player.getCenter().subtract(this.getCenter()).normalize();
                        game.spawnBullet(centerX - 4, bottomY, dir.x * 300, dir.y * 300, 'enemy');
                    }
                    break;
                case 'burst':
                    for (let i = 0; i < 8; i++) {
                        const angle = (i / 8) * Math.PI * 2;
                        game.spawnBullet(
                            centerX - 4, bottomY,
                            Math.cos(angle) * 200,
                            Math.sin(angle) * 200,
                            'enemy'
                        );
                    }
                    break;
            }
        } else {
            // Nemici normali - solo 30% mira al player, 70% dritto
            if (Math.random() > 0.7 && game.player && game.player.active) {
                // Proiettile mirato
                const dir = game.player.getCenter().subtract(this.getCenter()).normalize();
                game.spawnBullet(centerX - 4, bottomY, dir.x * 200, Math.abs(dir.y) * 200 + 100, 'enemy');
            } else {
                // Proiettile dritto
                game.spawnBullet(centerX - 4, bottomY, 0, 200, 'enemy');
            }
        }
    }

    takeDamage(amount, game) {
        this.health -= amount;
        
        // Flash bianco
        this.flashTime = 0.1;
        
        if (this.health <= 0) {
            this.destroy();
            game.addScore(this.scoreValue);
            
            // Esplosione
            const explosionSize = this.type === 'boss' ? 'large' : 'medium';
            game.spawnExplosion(this.getCenter().x, this.getCenter().y, explosionSize);
            
            // Chance di drop power-up
            if (Math.random() < this.getDropChance()) {
                const powerUpType = this.getRandomPowerUpType(game.level);
                game.spawnPowerUp(this.getCenter().x, this.getCenter().y, powerUpType);
            }
            
            return true;
        }
        return false;
    }
    
    getRandomPowerUpType(level) {
        // Probabilità pesate per tipo di power-up
        const types = [
            { type: 'weapon', weight: 30 },
            { type: 'health', weight: 25 },
            { type: 'shield', weight: 10 },
            { type: 'speed', weight: 10 },
            { type: 'rapid', weight: 10 },
            { type: 'magnet', weight: 5 },
            { type: 'bomb', weight: level >= 2 ? 5 : 0 },
            { type: 'life', weight: level >= 3 ? 3 : 0 }
        ];
        
        const totalWeight = types.reduce((sum, t) => sum + t.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const t of types) {
            random -= t.weight;
            if (random <= 0) return t.type;
        }
        return 'weapon';
    }

    getDropChance() {
        switch (this.type) {
            case 'enemy1': return 0.15;
            case 'enemy2': return 0.25;
            case 'enemy3': return 0.4;
            case 'boss': return 1.0;
            default: return 0.15;
        }
    }

    render(ctx, assets) {
        const centerX = this.position.x + this.width / 2;
        const centerY = this.position.y + this.height / 2;
        
        ctx.save();
        
        // Engine glow for all enemies
        const engineGlow = ctx.createRadialGradient(
            centerX, this.position.y - 5, 0,
            centerX, this.position.y - 5, 15
        );
        const glowColors = {
            'enemy1': { r: 255, g: 100, b: 100 },
            'enemy2': { r: 255, g: 150, b: 50 },
            'enemy3': { r: 200, g: 50, b: 255 },
            'boss': { r: 255, g: 50, b: 100 }
        };
        const glow = glowColors[this.type] || glowColors['enemy1'];
        const enginePulse = 0.5 + Math.sin(this.movementTimer * 10) * 0.3;
        
        engineGlow.addColorStop(0, `rgba(${glow.r}, ${glow.g}, ${glow.b}, ${enginePulse * 0.6})`);
        engineGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = engineGlow;
        ctx.beginPath();
        ctx.ellipse(centerX, this.position.y - 5, 12, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Flash effect when hit
        if (this.flashTime > 0) {
            ctx.globalCompositeOperation = 'lighter';
            
            // Additional hit flash glow
            const hitGlow = ctx.createRadialGradient(
                centerX, centerY, 0,
                centerX, centerY, this.width * 0.7
            );
            hitGlow.addColorStop(0, `rgba(255, 255, 255, ${this.flashTime * 5})`);
            hitGlow.addColorStop(0.5, `rgba(255, 200, 150, ${this.flashTime * 2})`);
            hitGlow.addColorStop(1, 'rgba(255, 100, 50, 0)');
            
            ctx.fillStyle = hitGlow;
            ctx.beginPath();
            ctx.arc(centerX, centerY, this.width * 0.7, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.globalCompositeOperation = 'source-over';
        }
        
        // Draw sprite
        assets.drawSprite(
            ctx, this.type,
            this.position.x, this.position.y,
            this.width, this.height,
            this.rotation
        );
        
        if (this.flashTime > 0) {
            this.flashTime -= 0.016;
        }
        
        ctx.restore();
        
        // Health bar for enemies with more health
        if (this.maxHealth > 1 && this.type !== 'boss') {
            this.renderHealthBar(ctx);
        }
        
        // Boss health bar
        if (this.type === 'boss') {
            this.renderBossHealthBar(ctx);
        }
    }

    renderHealthBar(ctx) {
        const barWidth = this.width * 0.8;
        const barHeight = 5;
        const x = this.position.x + (this.width - barWidth) / 2;
        const y = this.position.y - 10;
        
        ctx.save();
        
        // Background with border
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);
        
        // Health gradient
        const healthPercent = this.health / this.maxHealth;
        const healthGrad = ctx.createLinearGradient(x, y, x + barWidth, y);
        
        if (healthPercent > 0.5) {
            healthGrad.addColorStop(0, '#00ff66');
            healthGrad.addColorStop(1, '#00cc44');
        } else if (healthPercent > 0.25) {
            healthGrad.addColorStop(0, '#ffcc00');
            healthGrad.addColorStop(1, '#ff9900');
        } else {
            healthGrad.addColorStop(0, '#ff4444');
            healthGrad.addColorStop(1, '#cc0000');
        }
        
        ctx.fillStyle = healthGrad;
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
        
        // Shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight / 2);
        
        ctx.restore();
    }

    renderBossHealthBar(ctx) {
        const barWidth = 220;
        const barHeight = 14;
        const x = (ctx.canvas.width - barWidth) / 2;
        const y = 70;
        
        ctx.save();
        
        // Outer glow
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = 15;
        
        // Background with gradient
        const bgGrad = ctx.createLinearGradient(x, y, x, y + barHeight);
        bgGrad.addColorStop(0, '#1a0a0a');
        bgGrad.addColorStop(1, '#2a1010');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(x - 3, y - 3, barWidth + 6, barHeight + 6);
        
        // Border
        ctx.strokeStyle = '#ff6644';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 3, y - 3, barWidth + 6, barHeight + 6);
        
        ctx.shadowBlur = 0;
        
        // Health gradient
        const healthPercent = this.health / this.maxHealth;
        const healthGrad = ctx.createLinearGradient(x, y, x + barWidth, y);
        healthGrad.addColorStop(0, '#ff2222');
        healthGrad.addColorStop(0.5, '#ff6600');
        healthGrad.addColorStop(1, '#ffaa00');
        ctx.fillStyle = healthGrad;
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
        
        // Shine effect
        const shineGrad = ctx.createLinearGradient(x, y, x, y + barHeight);
        shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        shineGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        shineGrad.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
        ctx.fillStyle = shineGrad;
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
        
        // Damage segments
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 10; i++) {
            const segX = x + (barWidth / 10) * i;
            ctx.beginPath();
            ctx.moveTo(segX, y);
            ctx.lineTo(segX, y + barHeight);
            ctx.stroke();
        }
        
        // Boss label with glow
        ctx.font = 'bold 14px Orbitron, Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ff6644';
        ctx.fillText('⚠ BOSS ⚠', ctx.canvas.width / 2, y - 8);
        
        // Health percentage
        ctx.font = '10px Rajdhani, Arial';
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.fillText(`${Math.ceil(healthPercent * 100)}%`, ctx.canvas.width / 2, y + barHeight + 12);
        
        ctx.restore();
    }
}

/**
 * Factory per creare nemici con pattern predefiniti
 */
class EnemyFactory {
    static createWave(type, count, game, pattern = 'straight') {
        const enemies = [];
        const spacing = game.canvas.width / (count + 1);
        
        for (let i = 0; i < count; i++) {
            const x = spacing * (i + 1) - 24;
            const enemy = new Enemy(x, -60, type);
            enemy.setMovementPattern(pattern, { 
                amplitude: 80,
                frequency: 2 + Math.random()
            });
            enemies.push(enemy);
        }
        
        return enemies;
    }

    static createFormation(type, formation, game) {
        const enemies = [];
        const startX = game.canvas.width / 2;
        const startY = -60;
        
        // Formazioni predefinite
        const formations = {
            'v': [
                [0, 0], [-1, 1], [1, 1], [-2, 2], [2, 2]
            ],
            'line': [
                [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0]
            ],
            'diamond': [
                [0, 0], [-1, 1], [1, 1], [0, 2], [-1, 3], [1, 3], [0, 4]
            ]
        };
        
        const points = formations[formation] || formations['line'];
        const spacing = 60;
        
        points.forEach(([dx, dy], i) => {
            const enemy = new Enemy(
                startX + dx * spacing - 24,
                startY - dy * spacing,
                type
            );
            enemy.setMovementPattern('sine', {
                amplitude: 60,
                frequency: 1.5
            });
            enemies.push(enemy);
        });
        
        return enemies;
    }

    static createBoss(game) {
        const boss = new Enemy(
            game.canvas.width / 2 - 80,
            -150,
            'boss'
        );
        boss.setMovementPattern('boss');
        return boss;
    }
}
