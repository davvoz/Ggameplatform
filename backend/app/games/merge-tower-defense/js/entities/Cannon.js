import { CANNON_TYPES, MERGE_LEVELS } from '../config.js';
import { MultiPartTowerSprites } from '../multi-part-towers.js';
import { Utils } from '../utils.js';

export class Cannon {
    constructor(col, row, type) {
        this.col = col;
        this.row = row;
        this.type = type;
        this.level = 1;
        this.lastFireTime = 0;
        this.selected = false;
        this.recoilTime = 0;
        this.targetLocked = null;
        this.multiSprite = null;

        // Get stats
        this.updateStats();

        // Initialize multi-part sprite if available
        this.initMultiPartSprite();
    }

    initMultiPartSprite() {
        if (!MultiPartTowerSprites) {

            return;
        }

        try {
            switch (this.type) {
                case 'BASIC': this.multiSprite = MultiPartTowerSprites.createBasic(); break;
                case 'RAPID': this.multiSprite = MultiPartTowerSprites.createRapid(); break;
                case 'SNIPER': this.multiSprite = MultiPartTowerSprites.createSniper(); break;
                case 'SPLASH': this.multiSprite = MultiPartTowerSprites.createSplash(); break;
                case 'FREEZE': this.multiSprite = MultiPartTowerSprites.createFreeze(); break;
                case 'LASER': this.multiSprite = MultiPartTowerSprites.createLaser(); break;
                case 'ELECTRIC': this.multiSprite = MultiPartTowerSprites.createElectric(); break;
            }

            if (this.multiSprite) {

                this.multiSprite.play('idle');

                this.multiSprite.onAnimationComplete = (name) => {
                    if (name === 'fire' || name === 'charging') {
                        this.multiSprite.play('idle');
                    }
                };
            } else {
                console.error('[CANNON] Failed to create multi-part sprite for', this.type);
            }
        } catch (e) {
            console.error('[CANNON] Exception creating multi-part sprite:', e);
            this.multiSprite = null;
        }
    }

    updateStats(boostMultipliers = null) {
        const baseStats = CANNON_TYPES[this.type];

        // Get level data (capped at max level in MERGE_LEVELS)
        const levelIndex = Math.min(this.level - 1, MERGE_LEVELS.length - 1);
        const levelData = MERGE_LEVELS[levelIndex];

        // Calculate base stats
        this.damage = baseStats.damage * levelData.damageMultiplier;
        this.range = baseStats.range + levelData.rangeBonus;
        this.fireRate = baseStats.fireRate / levelData.fireRateBonus;

        // Apply boost multipliers if provided
        if (boostMultipliers) {
            if (boostMultipliers.damage) {
                this.damage *= boostMultipliers.damage;
            }
            if (boostMultipliers.range) {
                this.range *= boostMultipliers.range;
            }
            if (boostMultipliers.fireRate) {
                this.fireRate /= boostMultipliers.fireRate; // Lower fireRate = faster shooting
            }
        }

        this.projectileSpeed = baseStats.projectileSpeed;
        this.color = baseStats.color;

        // Get sprite (professional vector ONLY)
        this.sprite = baseStats.sprite ? baseStats.sprite() : null;

        // Debug: verificare che sprite sia caricato
        // Special properties
        this.splashRadius = baseStats.splashRadius;
        this.slowFactor = baseStats.slowFactor;
        this.slowDuration = baseStats.slowDuration;
        this.piercing = baseStats.piercing;
        this.chainTargets = baseStats.chainTargets;
    }

    canFire(currentTime) {
        // Cannot fire if stunned
        if (this.stunned) {
            return false;
        }
        return currentTime - this.lastFireTime >= this.fireRate;
    }

    fire(currentTime, target) {
        this.lastFireTime = currentTime;
        this.recoilTime = currentTime + 200; // Recoil animation duration
        this.targetLocked = target;

        // Trigger fire animation
        if (this.multiSprite) {
            // Sniper and Laser have charging animation first
            if (this.type === 'SNIPER' || this.type === 'LASER') {
                this.multiSprite.play('charging');
            } else {
                this.multiSprite.play('fire');
            }
        }
    }

    update(dt) {
        // Handle stun duration
        if (this.stunned && this.stunDuration !== undefined) {
            this.stunDuration -= dt * 1000; // dt is in seconds
            if (this.stunDuration <= 0) {
                this.stunned = false;
                this.stunDuration = 0;
            }
        }

        // Update multi-part sprite animation
        if (this.multiSprite) {
            this.multiSprite.update(dt);

            // Ensure idle animation keeps playing
            if (!this.multiSprite.playing && this.multiSprite.currentAnimation !== 'idle') {
                this.multiSprite.play('idle');
            } else if (!this.multiSprite.playing) {
                // Restart idle if it somehow stopped
                this.multiSprite.play('idle');
            }

            // Rotate turret/chamber towards target
            if (this.targetLocked && !this.targetLocked.isDead()) {
                const targetPos = { x: this.targetLocked.col, y: this.targetLocked.row };
                const angle = Math.atan2(
                    targetPos.y - this.row,
                    targetPos.x - this.col
                );

                // Rotate appropriate part based on tower type
                const rotatePart = this.multiSprite.getPart('turret') ||
                    this.multiSprite.getPart('chamber') ||
                    this.multiSprite.getPart('housing');
                if (rotatePart) {
                    // Add rotation to the animated transform, don't override
                    rotatePart.targetRotation = angle;
                }
            }
        }
    }

    render(graphics, currentTime, isBeingDragged = false) {
        const recoilActive = currentTime < this.recoilTime;
        const bounce = recoilActive ? 0.5 : 0.2;
        const shake = recoilActive ? 0.3 : 0;

        const isStunned = this.stunnedUntil && currentTime < this.stunnedUntil;
        const isDisabled = this.disabledUntil && currentTime < this.disabledUntil;

        if (this.selected) {
            graphics.drawRange(this.col, this.row, this.range, Utils.colorWithAlpha(this.color, 0.15));
        }

        if (this.multiSprite) {
            this.#renderMultiSprite(graphics, currentTime, isBeingDragged, isStunned, isDisabled);
        } else if (this.sprite) {
            graphics.drawSprite(this.sprite, this.col, this.row, {
                scale: 1.0, color: this.color, glow: this.selected, glowColor: this.color,
                bounce, shake, opacity: isBeingDragged ? 0.3 : 1.0
            });
        }

        if (this.level > 1 && !isBeingDragged) {
            graphics.drawLevel(this.col, this.row, this.level, this.levelIcon);
        }

        if (this.selected) {
            graphics.drawSelection(this.col, this.row, this.color);
        }
    }

    #renderMultiSprite(graphics, currentTime, isBeingDragged, isStunned, isDisabled) {
        const pos = graphics.gridToScreen(this.col, this.row);
        const cellSize = graphics.getCellSize();
        const needsAlphaChange = isStunned || isDisabled || isBeingDragged;

        if (needsAlphaChange) {
            graphics.ctx.save();
            graphics.ctx.globalAlpha = isBeingDragged
                ? 0.3
                : 0.5 + Math.sin(currentTime * 0.01) * 0.2;
        }

        try {
            this.multiSprite.render(graphics.ctx, pos.x, pos.y, cellSize);
        } catch (e) {
            console.error('[CANNON] Render error for', this.type, ':', e);
            if (this.sprite) {
                graphics.drawSprite(this.sprite, this.col, this.row, {
                    scale: 1.0, color: this.color, glow: this.selected, glowColor: this.color
                });
            }
        }

        if (needsAlphaChange) {
            graphics.ctx.restore();
            this.#drawStatusIcon(graphics.ctx, pos, cellSize, isStunned, isDisabled, isBeingDragged);
        }
    }

    #drawStatusIcon(ctx, pos, cellSize, isStunned, isDisabled, isBeingDragged) {
        if ((isStunned || isDisabled) && !isBeingDragged) {
            ctx.font = `${cellSize * 0.4}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(isDisabled ? '🔇' : '💫', pos.x, pos.y - cellSize * 0.5);
        }
    }

    upgrade() {
        if (this.level < MERGE_LEVELS.length) {
            this.level++;
            this.updateStats();
            return true;
        }
        return false;
    }

    canMergeWith(other) {
        return other &&
            other.type === this.type &&
            other.level === this.level &&
            other !== this;
    }
}
