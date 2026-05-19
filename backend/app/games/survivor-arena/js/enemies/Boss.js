
import { CONFIG } from '../config.js';
import { spriteManager } from '../sprite-system.js';
import { MiniBoss } from './MiniBoss.js';
/**
 * Boss class
 */
export class Boss extends MiniBoss {
    /**
     * @param {number} x 
     * @param {number} y 
     * @param {Object} difficultyMult 
     */
    constructor(x, y, difficultyMult = {}) {
        super(x, y, difficultyMult);

        // Override with boss config
        const config = CONFIG.BOSS;
        this.maxHealth = config.health * (difficultyMult.enemyHealth || 1);
        this.health = this.maxHealth;
        this.damage = config.damage * (difficultyMult.enemyDamage || 1);
        this.size = config.size;
        this.speed = config.speed * (difficultyMult.enemySpeed || 1);
        this.color = config.color;

        // Use boss sprite
        this.sprite = spriteManager.createSprite('boss');
        if (this.sprite) {
            this.sprite.play('walk');
        }
        this.spriteScale = this.size * 1.8;

        this.xpValue = CONFIG.LEVELING.XP_FROM_ENEMY.boss;
        this.scoreValue = CONFIG.SCORING.POINTS_PER_KILL.boss;

        this.phase = 1;
        this.maxPhases = config.phases;
        this.phaseThresholds = [0.66, 0.33]; // Health % to trigger phase change

        // Boss has additional ability: shoot projectiles
        this.abilities = ['charge', 'summon', 'aoe', 'shoot'];
        this.chargeDuration = 700; // Boss: longer charge than MiniBoss

        // More abilities
        this.abilityCooldown = 2000;
        this.maxSummons = 5;
    }

    /**
     * Take damage and check phase transitions
     * @param {number} amount 
     * @param {Entity} source 
     * @returns {boolean}
     */
    takeDamage(amount, source = null) {
        const died = super.takeDamage(amount, source);

        if (!died) {
            // Check for phase transition
            const healthPercent = this.health / this.maxHealth;
            const newPhase = this.phase < this.maxPhases &&
                healthPercent <= this.phaseThresholds[this.phase - 1];

            if (newPhase) {
                this.phase++;
                this.onPhaseChange();
            }
        }

        return died;
    }

    /**
     * Called when boss enters new phase
     */
    onPhaseChange() {
        // Increase speed and ability frequency
        this.speed *= 1.2;
        this.abilityCooldown *= 0.8;

        // Visual feedback handled in draw
    }

    /**
     * Draw boss
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} camera 
     */
    draw(ctx, camera) {
        if (!this.active) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        ctx.save();

        // Phase aura
        const auraColors = ['#9c27b0', '#e91e63', '#f44336'];
        ctx.strokeStyle = auraColors[this.phase - 1];
        ctx.lineWidth = 5 + Math.sin(Date.now() / 200) * 2;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size + 20 + Math.sin(Date.now() / 300) * 10, 0, Math.PI * 2);
        ctx.stroke();

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(screenX + 5, screenY + this.size * 0.5, this.size * 0.9, this.size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Main body
        const gradient = ctx.createRadialGradient(
            screenX - this.size * 0.3, screenY - this.size * 0.3, 0,
            screenX, screenY, this.size
        );
        gradient.addColorStop(0, '#ce93d8');
        gradient.addColorStop(1, this.color);

        ctx.fillStyle = this.damageFlash > 0 ? '#ffffff' : gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Outline
        ctx.strokeStyle = '#7b1fa2';
        ctx.lineWidth = 5;
        ctx.stroke();

        // Crown
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.moveTo(screenX - 40, screenY - this.size + 10);
        ctx.lineTo(screenX - 30, screenY - this.size - 30);
        ctx.lineTo(screenX - 15, screenY - this.size);
        ctx.lineTo(screenX, screenY - this.size - 40);
        ctx.lineTo(screenX + 15, screenY - this.size);
        ctx.lineTo(screenX + 30, screenY - this.size - 30);
        ctx.lineTo(screenX + 40, screenY - this.size + 10);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ff8f00';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Gems on crown
        ctx.fillStyle = '#f44336';
        ctx.beginPath();
        ctx.arc(screenX, screenY - this.size - 25, 8, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(screenX - 25, screenY - 10, 18, 0, Math.PI * 2);
        ctx.arc(screenX + 25, screenY - 10, 18, 0, Math.PI * 2);
        ctx.fill();

        // Pupils (change color with phase)
        ctx.fillStyle = auraColors[this.phase - 1];
        ctx.beginPath();
        ctx.arc(screenX - 25, screenY - 10, 10, 0, Math.PI * 2);
        ctx.arc(screenX + 25, screenY - 10, 10, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        const barWidth = 200;
        const barHeight = 12;
        const barY = screenY - this.size - 60;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(screenX - barWidth / 2 - 3, barY - 3, barWidth + 6, barHeight + 6);

        ctx.fillStyle = '#333';
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);

        // Phase segments
        for (let i = 0; i < this.maxPhases - 1; i++) {
            const segX = screenX - barWidth / 2 + barWidth * this.phaseThresholds[i];
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(segX, barY);
            ctx.lineTo(segX, barY + barHeight);
            ctx.stroke();
        }

        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = auraColors[this.phase - 1];
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth * healthPercent, barHeight);

        // "BOSS" text
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', screenX, barY - 8);

        ctx.restore();
    }

    /**
     * Render boss (camera transform already applied)
     * @param {CanvasRenderingContext2D} ctx 
     */
    render(ctx) {
        if (!this.active) return;

        ctx.save();

        const auraColors = ['#9c27b0', '#e91e63', '#f44336'];

        // Phase aura
        ctx.strokeStyle = auraColors[this.phase - 1];
        ctx.lineWidth = 5 + Math.sin(Date.now() / 200) * 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size + 15 + Math.sin(Date.now() / 300) * 5, 0, Math.PI * 2);
        ctx.stroke();

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(this.x + 5, this.y + this.size * 0.5, this.size * 0.9, this.size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Use sprite if available
        if (this.sprite) {
            let flipX = false;
            if (this.target) {
                flipX = this.target.x < this.x;
            }

            this.sprite.render(ctx, this.x, this.y, this.spriteScale, {
                opacity: this.damageFlash > 0 ? 0.7 : 1,
                flipX: flipX,
                tint: this.damageFlash > 0 ? '#ffffff' : null,
                glow: true,
                glowColor: auraColors[this.phase - 1],
                glowIntensity: 0.5
            });
        } else {
            // Fallback basic rendering
            const gradient = ctx.createRadialGradient(
                this.x - this.size * 0.3, this.y - this.size * 0.3, 0,
                this.x, this.y, this.size
            );
            gradient.addColorStop(0, '#ce93d8');
            gradient.addColorStop(1, this.color);

            ctx.fillStyle = this.damageFlash > 0 ? '#ffffff' : gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Health bar
        const barWidth = 200;
        const barHeight = 12;
        const barY = this.y - this.size - 60;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(this.x - barWidth / 2 - 3, barY - 3, barWidth + 6, barHeight + 6);

        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - barWidth / 2, barY, barWidth, barHeight);

        // Phase segments
        for (let i = 0; i < this.maxPhases - 1; i++) {
            const segX = this.x - barWidth / 2 + barWidth * this.phaseThresholds[i];
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(segX, barY);
            ctx.lineTo(segX, barY + barHeight);
            ctx.stroke();
        }

        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = auraColors[this.phase - 1];
        ctx.fillRect(this.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);

        // "BOSS" text
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', this.x, barY - 8);

        ctx.restore();
    }
}