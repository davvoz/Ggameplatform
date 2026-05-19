import { LivingEntity } from '../entity.js';
import { MathUtils, Vector2 } from '../utils.js';
import { CONFIG } from '../config.js';
import { spriteManager } from '../sprite-system.js';
import { Enemy } from './Enemy.js';
/**
 * Mini Boss class
 */
export class MiniBoss extends Enemy {
    /**
     * @param {number} x 
     * @param {number} y 
     * @param {Object} difficultyMult 
     */
    constructor(x, y, difficultyMult = {}) {
        // Create mini boss with custom config
        const config = CONFIG.MINI_BOSS;
        const tempConfig = {
            size: config.size,
            speed: config.speed,
            health: config.health,
            damage: config.damage,
            color: config.color,
            spawnWeight: 0
        };

        // Temporarily add to CONFIG for parent constructor
        CONFIG.ENEMIES.miniBoss = tempConfig;
        super(x, y, 'miniBoss', difficultyMult);

        // Use miniboss sprite instead of zombie
        this.sprite = spriteManager.createSprite('miniboss');
        if (this.sprite) {
            this.sprite.play('walk');
        }
        this.spriteScale = this.size * 2;

        this.xpValue = CONFIG.LEVELING.XP_FROM_ENEMY.miniBoss;
        this.scoreValue = CONFIG.SCORING.POINTS_PER_KILL.miniBoss;

        this.abilities = config.abilities;
        this.currentAbility = null;
        this.abilityCooldown = 3000;
        this.abilityTimer = this.abilityCooldown;

        // Charge attack
        this.isCharging = false;
        this.chargeDirection = new Vector2(0, 0);
        this.chargeTimer = 0;
        this.chargeDuration = 400; // MiniBoss: shorter charge

        // Summon cooldown
        this.summonCount = 0;
        this.maxSummons = 3;
    }

    /**
     * Update mini boss
     * @param {number} deltaTime 
     * @param {Object} arena 
     */
    update(deltaTime, arena) {
        if (!this.active || !this.target) return;

        // Ability cooldown
        this.abilityTimer -= deltaTime * 1000;

        if (this.abilityTimer <= 0 && !this.currentAbility) {
            this.useAbility();
        }

        // Handle current ability
        if (this.currentAbility) {
            this.updateAbility(deltaTime);
        } else {
            // Normal chase behavior - use wrapped direction for seamless toroidal world
            const arena = { width: CONFIG.ARENA.WIDTH, height: CONFIG.ARENA.HEIGHT };
            const wrapped = this.getWrappedDirectionToTarget(arena);
            const dirToTarget = new Vector2(wrapped.dirX, wrapped.dirY);
            this.velocity.set(
                dirToTarget.x * this.speed,
                dirToTarget.y * this.speed
            );
        }

        // Call LivingEntity update (skip Enemy behavior)
        LivingEntity.prototype.update.call(this, deltaTime);

        // Wrap position for seamless toroidal world
        this.x = this.wrapCoord(this.x, CONFIG.ARENA.WIDTH);
        this.y = this.wrapCoord(this.y, CONFIG.ARENA.HEIGHT);
        this.position.set(this.x, this.y);
    }

    /**
     * Use a random ability
     */
    useAbility() {
        const ability = this.abilities[MathUtils.randomInt(0, this.abilities.length - 1)];

        switch (ability) {
            case 'charge':
                this.startCharge();
                break;
            case 'summon':
                if (this.summonCount < this.maxSummons) {
                    this.summonMinions();
                }
                break;
            case 'aoe':
                this.aoeAttack();
                break;
            case 'shoot':
                this.shootProjectiles = true;
                this.currentAbility = 'shoot';
                setTimeout(() => this.endAbility(), 500);
                break;
        }
    }

    /**
     * Start charge attack
     */
    startCharge() {
        this.currentAbility = 'charge';
        this.isCharging = true;
        this.chargeDirection = this.position.directionTo(this.target.position);
        this.chargeTimer = 500; // 0.5 second charge
        this.velocity.set(0, 0);
    }

    /**
     * Update ability state
     * @param {number} deltaTime 
     */
    updateAbility(deltaTime) {
        if (this.currentAbility == 'charge') {

            this.chargeTimer -= deltaTime * 1000;

            if (this.chargeTimer > 0) {
                // Charging up - slow movement
                this.velocity.set(
                    -this.chargeDirection.x * 50,
                    -this.chargeDirection.y * 50
                );
            } else {
                // Execute charge
                this.velocity.set(
                    this.chargeDirection.x * this.speed * 8,
                    this.chargeDirection.y * this.speed * 8
                );

                // End charge after distance
                if (this.chargeTimer < -this.chargeDuration) {
                    this.endAbility();
                }
            }
        }
    }

    /**
     * Summon minions (sets flag for game to spawn)
     */
    summonMinions() {
        this.currentAbility = 'summon';
        this.summonCount++;

        // Set flag for game.js to detect
        this.summonEnemies = true;

        setTimeout(() => this.endAbility(), 500);
    }

    /**
     * AOE attack with charging phase
     */
    aoeAttack() {
        this.currentAbility = 'aoe';

        // Start charging phase (1.5 seconds warning)
        this.aoeCharging = true;
        this.aoeChargingStart = Date.now();
        this.aoeChargingDuration = 1500; // 1.5 seconds to charge

        // Store AOE data for preview
        this.aoeData = {
            x: this.x,
            y: this.y,
            radius: 300,
            damage: this.damage * 0.5,
            startTime: null, // Set when charging completes
            charging: true
        };

        // After charging, execute the AOE
        setTimeout(() => {
            if (this.currentAbility === 'aoe') {
                this.aoeCharging = false;
                this.aoeActive = true;
                this.aoeData.startTime = Date.now();
                this.aoeData.charging = false;
                this.aoeData.x = this.x; // Update position to current
                this.aoeData.y = this.y;

                // AOE lasts 0.8 seconds
                setTimeout(() => {
                    this.endAbility();
                    this.aoeActive = false;
                    this.aoeCharging = false;
                }, 800);
            }
        }, this.aoeChargingDuration);
    }

    /**
     * End current ability
     */
    endAbility() {
        this.currentAbility = null;
        this.isCharging = false;
        this.abilityTimer = this.abilityCooldown;
    }

    /**
     * Draw mini boss
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} camera 
     */
    draw(ctx, camera) {
        if (!this.active) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        ctx.save();

        // Charging indicator
        if (this.isCharging && this.chargeTimer > 0) {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            ctx.lineTo(
                screenX + this.chargeDirection.x * 400,
                screenY + this.chargeDirection.y * 400
            );
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Summon visual  brief aura glow on mini-boss body
        if (this.currentAbility === 'summon') {
            const summonPulse = Math.sin(Date.now() / 50) * 0.3 + 0.7;
            const summonGlow = ctx.createRadialGradient(screenX, screenY, this.size * 0.5, screenX, screenY, this.size * 1.5);
            summonGlow.addColorStop(0, `rgba(255, 180, 0, ${0.3 * summonPulse})`);
            summonGlow.addColorStop(1, 'rgba(255, 180, 0, 0)');
            ctx.fillStyle = summonGlow;
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.size * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw shadow (larger)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(screenX + 4, screenY + this.size * 0.6, this.size * 0.8, this.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Main body with gradient
        const gradient = ctx.createRadialGradient(
            screenX - this.size * 0.3, screenY - this.size * 0.3, 0,
            screenX, screenY, this.size
        );
        gradient.addColorStop(0, '#ff69b4');
        gradient.addColorStop(1, this.color);

        ctx.fillStyle = this.damageFlash > 0 ? '#ffffff' : gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Spiky outline
        ctx.strokeStyle = '#ff1493';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Crown/horns
        ctx.fillStyle = '#ffd700';
        for (let i = 0; i < 5; i++) {
            const angle = -Math.PI / 2 + (i - 2) * 0.3;
            const hornX = screenX + Math.cos(angle) * (this.size + 5);
            const hornY = screenY + Math.sin(angle) * (this.size + 5);

            ctx.beginPath();
            ctx.moveTo(hornX, hornY);
            ctx.lineTo(hornX + Math.cos(angle) * 15, hornY + Math.sin(angle) * 15);
            ctx.lineTo(hornX + Math.cos(angle + 0.3) * 8, hornY + Math.sin(angle + 0.3) * 8);
            ctx.closePath();
            ctx.fill();
        }

        // Angry eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(screenX - 15, screenY - 5, 12, 0, Math.PI * 2);
        ctx.arc(screenX + 15, screenY - 5, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(screenX - 15, screenY - 5, 6, 0, Math.PI * 2);
        ctx.arc(screenX + 15, screenY - 5, 6, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        const barWidth = this.size * 2.5;
        const barHeight = 8;
        const barY = screenY - this.size - 20;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(screenX - barWidth / 2 - 2, barY - 2, barWidth + 4, barHeight + 4);

        ctx.fillStyle = '#333';
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);

        const healthPercent = this.health / this.maxHealth;
        const condA = healthPercent > 0.25 ? '#ff9800' : '#f44336';

        ctx.fillStyle = healthPercent > 0.5 ? '#4caf50' : condA;
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth * healthPercent, barHeight);

        // "MINI BOSS" text
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('MINI BOSS', screenX, barY - 5);

        ctx.restore();
    }
}