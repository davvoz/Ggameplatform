import GameObject from './GameObject.js';

/**
 * Player - Navicella del giocatore
 */
class Player extends GameObject {
    constructor(x, y) {
        super(x, y, 48, 48);
        this.tag = 'player';
        
        // Stats
        this.maxHealth = 3; // Vita base ridotta
        this.health = this.maxHealth;
        this.baseSpeed = 300;
        this.speed = this.baseSpeed;
        this.baseFireRate = 0.28; // Fire rate più lento per bilanciamento
        this.fireRate = this.baseFireRate;
        this.fireCooldown = 0;
        
        // Surriscaldamento arma
        this.heat = 0;
        this.maxHeat = 100;
        this.heatPerShot = 8; // Calore per colpo (aumenta con livello arma)
        this.heatCooldownRate = 35; // Raffreddamento per secondo
        this.overheated = false;
        
        // Weapon upgrades
        this.weaponLevel = 1;
        this.maxWeaponLevel = 5;
        
        // Invincibilità dopo danno
        this.invincible = false;
        this.invincibleTime = 0;
        this.invincibleDuration = 1.2; // Ridotto da 2 a 1.2 secondi
        this.blinkTimer = 0;
        
        // Limite salute massima
        this.absoluteMaxHealth = 6; // Non può superare 6 HP
        
        // Power-up temporanei
        this.speedBoost = false;
        this.speedBoostTime = 0;
        this.rapidFire = false;
        this.rapidFireTime = 0;
        
        // Effetti visivi
        this.thrusterFlicker = 0;
        
        // Abilità speciali
        this.healCooldown = 0;
        this.healMaxCooldown = 20; // 20 secondi di cooldown
        this.bombCooldown = 0;
        this.bombMaxCooldown = 25; // 25 secondi di cooldown
    }

    update(deltaTime, game) {
        // Aggiorna cooldown abilità
        if (this.healCooldown > 0) {
            this.healCooldown -= deltaTime;
            if (this.healCooldown < 0) this.healCooldown = 0;
        }
        if (this.bombCooldown > 0) {
            this.bombCooldown -= deltaTime;
            if (this.bombCooldown < 0) this.bombCooldown = 0;
        }
        
        // Input movimento
        const inputDir = game.input.getMovementDirection();
        this.velocity = inputDir.multiply(this.speed);
        
        // Applica movimento
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        
        // Limita ai bordi dello schermo
        this.position.x = Math.max(0, Math.min(game.canvas.width - this.width, this.position.x));
        this.position.y = Math.max(0, Math.min(game.canvas.height - this.height, this.position.y));
        
        // Gestione sparo
        this.fireCooldown -= deltaTime;
        
        // Raffreddamento arma
        if (this.heat > 0) {
            this.heat -= this.heatCooldownRate * deltaTime;
            if (this.heat < 0) this.heat = 0;
        }
        
        // Recovery da surriscaldamento
        if (this.overheated && this.heat < 30) {
            this.overheated = false;
        }
        
        // Sparo solo se non surriscaldato
        if (game.input.isFiring() && this.fireCooldown <= 0 && !this.overheated) {
            this.fire(game);
            this.fireCooldown = this.fireRate;
            
            // Aggiungi calore (più alto con armi potenti)
            this.heat += this.heatPerShot * (1 + (this.weaponLevel - 1) * 0.3);
            
            // Check surriscaldamento
            if (this.heat >= this.maxHeat) {
                this.heat = this.maxHeat;
                this.overheated = true;
            }
        }
        
        // Gestione invincibilità
        if (this.invincible) {
            this.invincibleTime -= deltaTime;
            this.blinkTimer += deltaTime;
            
            if (this.invincibleTime <= 0) {
                this.invincible = false;
                this.alpha = 1;
            } else {
                // Effetto lampeggio
                this.alpha = Math.sin(this.blinkTimer * 20) > 0 ? 1 : 0.3;
            }
        }
        
        // Gestione speed boost
        if (this.speedBoost) {
            this.speedBoostTime -= deltaTime;
            if (this.speedBoostTime <= 0) {
                this.speedBoost = false;
                this.speed = this.baseSpeed;
            }
        }
        
        // Gestione rapid fire
        if (this.rapidFire) {
            this.rapidFireTime -= deltaTime;
            if (this.rapidFireTime <= 0) {
                this.rapidFire = false;
                this.fireRate = this.baseFireRate;
                this.heatPerShot = 8; // Ripristina heat normale
            }
        }
        
        // Thruster animation
        this.thrusterFlicker += deltaTime * 10;
    }

    fire(game) {
        const bulletSpeed = -500;
        const centerX = this.position.x + this.width / 2;
        const topY = this.position.y;
        
        game.sound.playShoot();
        
        // Pattern di sparo basato sul livello arma
        switch (this.weaponLevel) {
            case 1:
                // Singolo proiettile centrale
                game.spawnBullet(centerX - 4, topY, 0, bulletSpeed, 'player');
                break;
                
            case 2:
                // Due proiettili
                game.spawnBullet(centerX - 12, topY + 5, 0, bulletSpeed, 'player');
                game.spawnBullet(centerX + 4, topY + 5, 0, bulletSpeed, 'player');
                break;
                
            case 3:
                // Tre proiettili (spread)
                game.spawnBullet(centerX - 4, topY, 0, bulletSpeed, 'player');
                game.spawnBullet(centerX - 16, topY + 10, -50, bulletSpeed, 'player');
                game.spawnBullet(centerX + 8, topY + 10, 50, bulletSpeed, 'player');
                break;
                
            case 4:
                // Quattro proiettili
                game.spawnBullet(centerX - 16, topY + 5, -30, bulletSpeed, 'player');
                game.spawnBullet(centerX - 6, topY, 0, bulletSpeed, 'player');
                game.spawnBullet(centerX + 2, topY, 0, bulletSpeed, 'player');
                game.spawnBullet(centerX + 12, topY + 5, 30, bulletSpeed, 'player');
                break;
                
            case 5:
                // Cinque proiettili (full spread)
                game.spawnBullet(centerX - 4, topY, 0, bulletSpeed * 1.2, 'player');
                game.spawnBullet(centerX - 14, topY + 5, -40, bulletSpeed, 'player');
                game.spawnBullet(centerX + 6, topY + 5, 40, bulletSpeed, 'player');
                game.spawnBullet(centerX - 22, topY + 10, -80, bulletSpeed * 0.9, 'player');
                game.spawnBullet(centerX + 14, topY + 10, 80, bulletSpeed * 0.9, 'player');
                break;
        }
    }

    takeDamage(amount, game) {
        if (this.invincible) return false;
        
        // Check if barrier can block the damage
        if (game.upgrades && game.upgrades.tryBlockDamage(amount)) {
            // Barrier absorbed the damage - visual feedback
            game.postProcessing.flash({ r: 0, g: 150, b: 255 }, 0.1);
            return false;
        }
        
        this.health -= amount;
        game.sound.playHit();
        
        if (this.health <= 0) {
            this.health = 0;
            this.destroy();
            game.spawnExplosion(this.getCenter().x, this.getCenter().y, 'large');
            return true;
        }
        
        // Attiva invincibilità
        this.invincible = true;
        this.invincibleTime = this.invincibleDuration;
        this.blinkTimer = 0;
        
        // Downgrade arma
        if (this.weaponLevel > 1) {
            this.weaponLevel--;
        }
        
        return false;
    }

    upgradeWeapon() {
        if (this.weaponLevel < this.maxWeaponLevel) {
            this.weaponLevel++;
            return true;
        }
        return false;
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    render(ctx, assets) {
        if (this.alpha <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        const centerX = this.position.x + this.width / 2;
        const bottomY = this.position.y + this.height;
        
        // Main thruster glow effect
        const thrusterIntensity = 0.6 + Math.sin(this.thrusterFlicker) * 0.3;
        const thrusterSize = 12 + Math.sin(this.thrusterFlicker * 2) * 4;
        
        // Outer glow
        const glowGrad = ctx.createRadialGradient(
            centerX, bottomY + 8, 0,
            centerX, bottomY + 8, thrusterSize * 2.5
        );
        glowGrad.addColorStop(0, `rgba(0, 200, 255, ${thrusterIntensity * 0.5})`);
        glowGrad.addColorStop(0.4, `rgba(0, 150, 255, ${thrusterIntensity * 0.3})`);
        glowGrad.addColorStop(1, 'rgba(0, 100, 255, 0)');
        
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.ellipse(centerX, bottomY + 8, thrusterSize * 2, thrusterSize * 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner flame core
        const coreGrad = ctx.createRadialGradient(
            centerX, bottomY + 5, 0,
            centerX, bottomY + 15, thrusterSize
        );
        coreGrad.addColorStop(0, `rgba(255, 255, 255, ${thrusterIntensity})`);
        coreGrad.addColorStop(0.3, `rgba(150, 220, 255, ${thrusterIntensity})`);
        coreGrad.addColorStop(0.7, `rgba(0, 150, 255, ${thrusterIntensity * 0.6})`);
        coreGrad.addColorStop(1, 'rgba(0, 50, 150, 0)');
        
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.ellipse(
            centerX, bottomY + 10,
            6 + Math.sin(this.thrusterFlicker * 3) * 2,
            thrusterSize + Math.sin(this.thrusterFlicker) * 4,
            0, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Side thrusters (when moving)
        const moveSpeed = this.velocity.magnitude();
        if (moveSpeed > 50) {
            const sideIntensity = Math.min(1, moveSpeed / 300) * 0.6;
            
            // Left thruster
            const leftGrad = ctx.createRadialGradient(
                this.position.x + 8, bottomY - 5, 0,
                this.position.x + 8, bottomY + 5, 8
            );
            leftGrad.addColorStop(0, `rgba(0, 200, 255, ${sideIntensity})`);
            leftGrad.addColorStop(1, 'rgba(0, 100, 200, 0)');
            ctx.fillStyle = leftGrad;
            ctx.beginPath();
            ctx.ellipse(this.position.x + 8, bottomY, 4, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Right thruster
            const rightGrad = ctx.createRadialGradient(
                this.position.x + this.width - 8, bottomY - 5, 0,
                this.position.x + this.width - 8, bottomY + 5, 8
            );
            rightGrad.addColorStop(0, `rgba(0, 200, 255, ${sideIntensity})`);
            rightGrad.addColorStop(1, 'rgba(0, 100, 200, 0)');
            ctx.fillStyle = rightGrad;
            ctx.beginPath();
            ctx.ellipse(this.position.x + this.width - 8, bottomY, 4, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw ship with shield effect when invincible
        if (this.invincible) {
            // Shield bubble
            const shieldPulse = Math.sin(this.blinkTimer * 8) * 0.3 + 0.5;
            const shieldGrad = ctx.createRadialGradient(
                centerX, this.position.y + this.height / 2, this.width * 0.3,
                centerX, this.position.y + this.height / 2, this.width * 0.7
            );
            shieldGrad.addColorStop(0, 'rgba(100, 200, 255, 0)');
            shieldGrad.addColorStop(0.7, `rgba(100, 200, 255, ${shieldPulse * 0.3})`);
            shieldGrad.addColorStop(1, `rgba(150, 220, 255, ${shieldPulse * 0.5})`);
            
            ctx.fillStyle = shieldGrad;
            ctx.beginPath();
            ctx.ellipse(centerX, this.position.y + this.height / 2, this.width * 0.7, this.height * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Shield border
            ctx.strokeStyle = `rgba(150, 220, 255, ${shieldPulse})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        // Draw ship
        assets.drawSprite(
            ctx, 'player',
            this.position.x, this.position.y,
            this.width, this.height,
            this.rotation
        );
        
        ctx.restore();
    }
    
    /**
     * Abilità Heal - Recupera vita in base al livello
     */
    useHeal(game) {
        if (this.healCooldown > 0) return false;
        
        // Percentuale di cura base: 25% + 5% per ogni livello (fino a 70% al livello 9+)
        const healPercent = Math.min(0.25 + (game.level - 1) * 0.05, 0.70);
        const healAmount = Math.ceil(this.maxHealth * healPercent);
        
        // Applica cura
        const oldHealth = this.health;
        this.health = Math.min(this.health + healAmount, this.maxHealth);
        const actualHeal = this.health - oldHealth;
        
        if (actualHeal > 0) {
            // Effetto visivo di cura
            game.particles.emit(
                this.position.x + this.width / 2,
                this.position.y + this.height / 2,
                15, // particelle
                {
                    color: '#00ff88',
                    speed: 80,
                    life: 0.8,
                    size: 4
                }
            );
            
            // Flash verde
            game.postProcessing.flash('#00ff8844');
        }
        
        // Attiva cooldown (ridotto leggermente ad alti livelli)
        const cooldownReduction = Math.min((game.level - 1) * 0.5, 5); // Fino a -5 secondi
        this.healCooldown = this.healMaxCooldown - cooldownReduction;
        
        game.sound.playPowerUp();
        return true;
    }
    
    /**
     * Abilità Super Bomba - Distrugge nemici in base al livello
     */
    useBomb(game) {
        if (this.bombCooldown > 0) return false;
        
        // Flash rosso/arancione
        game.postProcessing.flash('#ff660066');
        game.postProcessing.shake(15);
        
        // Percentuale di nemici colpiti: 40% + 6% per livello (fino a 100% al livello 10+)
        const killPercent = Math.min(0.40 + (game.level - 1) * 0.06, 1.0);
        
        // Danno base: 2, aumenta con il livello
        const baseDamage = 2 + Math.floor(game.level / 3);
        
        // Effetto esplosione centrale
        const centerX = this.position.x + this.width / 2;
        const centerY = this.position.y + this.height / 2;
        
        // Onda d'urto visiva
        game.particles.emit(centerX, centerY, 30, {
            color: '#ffaa00',
            speed: 300,
            life: 0.5,
            size: 6
        });
        
        // Colpisci i nemici
        const enemiesToHit = [...game.enemies];
        const hitCount = Math.ceil(enemiesToHit.length * killPercent);
        
        // Ordina per distanza dal player (colpisce i più vicini prima)
        enemiesToHit.sort((a, b) => {
            const distA = Math.hypot(a.position.x - centerX, a.position.y - centerY);
            const distB = Math.hypot(b.position.x - centerX, b.position.y - centerY);
            return distA - distB;
        });
        
        // Colpisci i nemici selezionati
        for (let i = 0; i < Math.min(hitCount, enemiesToHit.length); i++) {
            const enemy = enemiesToHit[i];
            
            // Crea esplosione su ogni nemico
            setTimeout(() => {
                if (!enemy.destroyed) {
                    // Danno che scala col livello
                    enemy.health -= baseDamage;
                    
                    // Effetto esplosione sul nemico
                    game.particles.emit(
                        enemy.position.x + enemy.width / 2,
                        enemy.position.y + enemy.height / 2,
                        10,
                        {
                            color: '#ff4400',
                            speed: 100,
                            life: 0.4,
                            size: 4
                        }
                    );
                    
                    if (enemy.health <= 0) {
                        enemy.destroy();
                        game.spawnExplosion(
                            enemy.position.x + enemy.width / 2,
                            enemy.position.y + enemy.height / 2,
                            'medium'
                        );
                        game.addScore(enemy.scoreValue);
                    }
                }
            }, i * 50); // Effetto a cascata
        }
        
        // Distruggi anche i proiettili nemici vicini
        game.bullets.forEach(bullet => {
            if (bullet.tag === 'enemy') {
                const dist = Math.hypot(
                    bullet.position.x - centerX,
                    bullet.position.y - centerY
                );
                if (dist < 200 + game.level * 20) { // Raggio aumenta col livello
                    bullet.destroy();
                    game.particles.emit(
                        bullet.position.x,
                        bullet.position.y,
                        3,
                        { color: '#ffaa00', speed: 50, life: 0.3, size: 3 }
                    );
                }
            }
        });
        
        // Attiva cooldown (ridotto leggermente ad alti livelli)
        const cooldownReduction = Math.min((game.level - 1) * 0.5, 5);
        this.bombCooldown = this.bombMaxCooldown - cooldownReduction;
        
        game.sound.playExplosion();
        return true;
    }
}

export default Player;