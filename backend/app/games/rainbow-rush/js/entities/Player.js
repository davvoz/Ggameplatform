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
        this.gravity = 1200;
        this.jumpForce = -500;
        this.isGrounded = false;
        this.canvasHeight = canvasHeight;
        this.color = [0.2, 0.6, 1.0, 1.0]; // Blue player
        this.maxFallSpeed = 800;
        this.alive = true;
    }

    jump() {
        if (this.isGrounded) {
            this.velocityY = this.jumpForce;
            this.isGrounded = false;
            return true; // Successful jump for sound trigger
        }
        return false;
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

        // Check ground collision
        if (this.y + this.height >= this.canvasHeight) {
            this.y = this.canvasHeight - this.height;
            this.velocityY = 0;
            this.isGrounded = true;
        }

        // Check if fell off screen
        if (this.y > this.canvasHeight + 100) {
            this.alive = false;
        }
    }

    checkPlatformCollision(platform) {
        if (!this.alive) return false;

        const playerBottom = this.y + this.height;
        const playerRight = this.x + this.width;
        const platformRight = platform.x + platform.width;
        const platformTop = platform.y;
        const platformBottom = platform.y + platform.height;

        // Check if player is falling onto platform
        if (this.velocityY > 0 &&
            playerBottom >= platformTop &&
            playerBottom <= platformBottom &&
            playerRight > platform.x &&
            this.x < platformRight) {
            
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
        this.alive = true;
    }

    updateCanvasHeight(height) {
        this.canvasHeight = height;
    }
}
