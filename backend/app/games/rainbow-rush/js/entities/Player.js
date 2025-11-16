/**
 * Player - Main player entity with physics and controls
 * Follows Single Responsibility Principle
 */
export class Player {
    constructor(x, y, canvasHeight) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.velocityY = 0;
        this.velocityX = 0;
        this.gravity = 750;
        this.jumpForce = -550;
        this.minJumpForce = -350;
        this.maxJumpForce = -700;
        this.superJumpForce = -950; // Super jump powerup
        this.isGrounded = false;
        this.isJumping = false;
        this.canvasHeight = canvasHeight;
        this.color = [0.2, 0.6, 1.0, 1.0]; // Blue player
        this.maxFallSpeed = 600;
        this.alive = true;
        
        // Powerup states
        this.powerups = {
            immortality: false,
            flight: false,
            superJump: false
        };
        
        // Animation
        this.animationTime = 0;
        this.trailParticles = [];
        this.currentPlatform = null;
    }

    jump() {
        // Flight powerup allows unlimited jumping
        if (this.isGrounded || this.powerups.flight) {
            // Apply jump force (super jump if active)
            const jumpPower = this.powerups.superJump ? this.superJumpForce : this.maxJumpForce;
            this.velocityY = jumpPower;
            this.isGrounded = false;
            this.isJumping = true;
            return true; // Successful jump for sound trigger
        }
        return false;
    }

    releaseJump(pressDuration) {
        if (this.isJumping && this.velocityY < 0) {
            // Modulate jump based on hold time
            const shortTapThreshold = 100; // 100ms
            const longTapThreshold = 200; // 200ms
            
            if (pressDuration < shortTapThreshold) {
                // Very short tap: minimal jump (50% power)
                this.velocityY = this.velocityY * 0.5;
            } else if (pressDuration < longTapThreshold) {
                // Medium tap: partial jump (70% power)
                this.velocityY = this.velocityY * 0.7;
            }
            // Long hold (>200ms): full jump - no reduction
            
            this.isJumping = false;
        }
    }

    update(deltaTime) {
        if (!this.alive) return;

        this.animationTime += deltaTime;
        
        // Apply gravity (reduced if flight is active)
        const currentGravity = this.powerups.flight ? this.gravity * 0.3 : this.gravity;
        this.velocityY += currentGravity * deltaTime;
        
        // Cap fall speed
        if (this.velocityY > this.maxFallSpeed) {
            this.velocityY = this.maxFallSpeed;
        }

        // Update position
        this.y += this.velocityY * deltaTime;
        this.x += this.velocityX * deltaTime;

        // Check if fell off screen (game over when falling too low, unless immortal)
        if (this.y > this.canvasHeight && !this.powerups.immortality) {
            this.alive = false;
        }
        
        // Update trail particles for powerups
        this.updateTrailParticles(deltaTime);
    }
    
    updateTrailParticles(deltaTime) {
        // Add trail particles when powerups are active (più frequenti e visibili)
        if (this.powerups.immortality || this.powerups.flight || this.powerups.superJump) {
            // Aggiungi più particelle per frame
            for (let i = 0; i < 2; i++) {
                this.trailParticles.push({
                    x: this.x + this.width / 2 + (Math.random() - 0.5) * 10,
                    y: this.y + this.height / 2 + (Math.random() - 0.5) * 10,
                    life: 0.8,
                    maxLife: 0.8,
                    color: this.getPowerupTrailColor(),
                    size: 8 + Math.random() * 4
                });
            }
        }
        
        // Update existing particles
        for (let i = this.trailParticles.length - 1; i >= 0; i--) {
            this.trailParticles[i].life -= deltaTime;
            if (this.trailParticles[i].life <= 0) {
                this.trailParticles.splice(i, 1);
            }
        }
        
        // Limita il numero di particelle per performance
        if (this.trailParticles.length > 50) {
            this.trailParticles.splice(0, this.trailParticles.length - 50);
        }
    }
    
    getPowerupTrailColor() {
        if (this.powerups.immortality) return [1.0, 0.84, 0.0, 0.8]; // Gold
        if (this.powerups.flight) return [0.4, 0.7, 1.0, 0.8]; // Light blue
        if (this.powerups.superJump) return [1.0, 0.3, 0.5, 0.8]; // Pink
        return [1.0, 1.0, 1.0, 0.5];
    }

    checkPlatformCollision(platform) {
        if (!this.alive) return false;

        const playerBottom = this.y + this.height;
        const playerRight = this.x + this.width;
        const playerLeft = this.x;
        const platformRight = platform.x + platform.width;
        const platformLeft = platform.x;
        const platformTop = platform.y;

        // Check horizontal overlap
        const horizontalOverlap = playerRight > platformLeft && playerLeft < platformRight;
        
        // Check if player is on top of platform (generous tolerance)
        const verticalDistance = Math.abs(playerBottom - platformTop);
        const onPlatform = verticalDistance < 15 && horizontalOverlap;

        if (onPlatform && this.velocityY >= 0) {
            // Snap to platform
            this.y = platformTop - this.height;
            
            // Apply bounce multiplier for bouncy platforms
            if (platform.bounceMultiplier && platform.bounceMultiplier > 1.0) {
                this.velocityY = -Math.abs(this.velocityY) * platform.bounceMultiplier;
            } else {
                this.velocityY = 0;
            }
            
            this.isGrounded = true;
            this.currentPlatform = platform;
            
            // Trigger crumbling for crumbling platforms
            if (platform.platformType === 'crumbling' && !platform.isCrumbling) {
                platform.isCrumbling = true;
            }
            
            return true;
        } else {
            if (this.currentPlatform === platform) {
                this.currentPlatform = null;
            }
        }

        return false;
    }

    checkObstacleCollision(obstacle) {
        if (!this.alive) return false;
        
        // Immortality powerup makes player invincible
        if (this.powerups.immortality) return false;

        const playerRight = this.x + this.width;
        const playerBottom = this.y + this.height;
        const obstacleRight = obstacle.x + obstacle.width;
        const obstacleBottom = obstacle.y + obstacle.height;

        if (this.x < obstacleRight &&
            playerRight > obstacle.x &&
            this.y < obstacleBottom &&
            playerBottom > obstacle.y) {
            this.alive = false;
            return true;
        }

        return false;
    }
    
    checkPowerupCollision(powerup) {
        if (!this.alive) return false;

        const playerCenterX = this.x + this.width / 2;
        const playerCenterY = this.y + this.height / 2;
        const powerupCenterX = powerup.x;
        const powerupCenterY = powerup.y;

        const distance = Math.sqrt(
            Math.pow(playerCenterX - powerupCenterX, 2) +
            Math.pow(playerCenterY - powerupCenterY, 2)
        );

        // Raggio di collisione aumentato per facilitare la raccolta
        const collisionRadius = this.width / 2 + powerup.radius * 1.5;
        return distance < collisionRadius;
    }

    checkCollectibleCollision(collectible) {
        if (!this.alive) return false;

        const playerCenterX = this.x + this.width / 2;
        const playerCenterY = this.y + this.height / 2;
        const collectibleCenterX = collectible.x;
        const collectibleCenterY = collectible.y;

        const distance = Math.sqrt(
            Math.pow(playerCenterX - collectibleCenterX, 2) +
            Math.pow(playerCenterY - collectibleCenterY, 2)
        );

        return distance < (this.width / 2 + collectible.radius);
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.velocityY = 0;
        this.velocityX = 0;
        this.isGrounded = false;
        this.isJumping = false;
        this.alive = true;
        this.powerups = {
            immortality: false,
            flight: false,
            superJump: false
        };
        this.trailParticles = [];
        this.currentPlatform = null;
        this.animationTime = 0;
    }
    
    activatePowerup(type) {
        switch (type) {
            case 'immortality':
                this.powerups.immortality = true;
                break;
            case 'flight':
                this.powerups.flight = true;
                break;
            case 'superJump':
                this.powerups.superJump = true;
                break;
        }
    }
    
    deactivatePowerup(type) {
        switch (type) {
            case 'immortality':
                this.powerups.immortality = false;
                break;
            case 'flight':
                this.powerups.flight = false;
                break;
            case 'superJump':
                this.powerups.superJump = false;
                break;
        }
    }
    
    getTrailParticles() {
        return this.trailParticles;
    }

    updateCanvasHeight(height) {
        this.canvasHeight = height;
    }
}
