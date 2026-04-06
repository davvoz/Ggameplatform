/**
 * GameObject - Base class for all game entities
 * Open/Closed Principle: extend for specific entity types.
 */

export class GameObject {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.vx = 0;
        this.vy = 0;
        this.active = true;
        this.tag = 'object';
    }

    get left() { return this.x - this.width / 2; }
    get right() { return this.x + this.width / 2; }
    get top() { return this.y - this.height / 2; }
    get bottom() { return this.y + this.height / 2; }

    get bounds() {
        return {
            x: this.left,
            y: this.top,
            width: this.width,
            height: this.height,
        };
    }

    /**
     * Update entity state
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        // Override in derived classes
    }

    /**
     * Render entity
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} cameraY - Camera offset
     */
    draw(ctx, cameraY) {
        // Override in derived classes
    }

    /**
     * Check if this object is visible in the camera view
     */
    isVisible(cameraY, screenHeight) {
        const screenTop = cameraY;
        const screenBottom = cameraY + screenHeight;
        return this.bottom > screenTop && this.top < screenBottom;
    }

    /**
     * AABB collision detection
     */
    intersects(other) {
        return this.left < other.right &&
               this.right > other.left &&
               this.top < other.bottom &&
               this.bottom > other.top;
    }

    /**
     * Check if this object is below another (for stomp detection)
     */
    isAbove(other, threshold = 10) {
        return this.bottom <= other.top + threshold &&
               this.bottom >= other.top - threshold;
    }

    /**
     * Get center coordinates
     */
    get centerX() { return this.x; }
    get centerY() { return this.y; }

    /**
     * Set position from center
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Destroy this object
     */
    destroy() {
        this.active = false;
    }
}
