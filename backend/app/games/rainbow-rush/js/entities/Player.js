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
        this.gravity = 800; // Lower gravity for floatier feel
        this.jumpForce = -550; // Strong consistent jump
        this.minJumpForce = -300; // Short hop
        this.maxJumpForce = -550; // Full jump
        this.isGrounded = false;
        this.isJumping = false;
        this.canvasHeight = canvasHeight;
        this.color = [0.2, 0.6, 1.0, 1.0]; // Blue player
        this.maxFallSpeed = 600;
        this.alive = true;
    }

    jump() {
        if (this.isGrounded) {
            // Apply full jump force immediately
            this.velocityY = this.maxJumpForce;
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

        // Apply gravity
        this.velocityY += this.gravity * deltaTime;
        
        // Cap fall speed
        if (this.velocityY > this.maxFallSpeed) {
            this.velocityY = this.maxFallSpeed;
        }

        // Update position
        this.y += this.velocityY * deltaTime;
        this.x += this.velocityX * deltaTime;

        // Check if fell off screen (game over when falling too low)
        if (this.y > this.canvasHeight) {
            this.alive = false;
        }
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
        const onPlatform = verticalDistance < 15 && horizontalOverlap; // Increased from 10 to 15

        if (onPlatform && this.velocityY >= 0) {
            // Snap to platform
            this.y = platformTop - this.height;
            this.velocityY = 0;
            this.isGrounded = true;
            return true;
        }

        return false;
    }

    checkObstacleCollision(obstacle) {
        if (!this.alive) return false;

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
    }

    updateCanvasHeight(height) {
        this.canvasHeight = height;
    }
}
