import Vector2 from '../utils/Vector2.js';

/**
 * GameObject - Base class for all game objects
 */
class GameObject {
    constructor(x, y, width, height) {
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(0, 0);
        this.width = width;
        this.height = height;
        this.active = true;
        this.rotation = 0;
        this.scale = 1;
        this.alpha = 1;
        this.tag = 'gameobject';
    }

    update(deltaTime, game) {
        // Override in subclasses
    }

    render(ctx, assets) {
        // Override in subclasses
    }

    getBounds() {
        return {
            x: this.position.x,
            y: this.position.y,
            width: this.width * this.scale,
            height: this.height * this.scale
        };
    }

    getCenter() {
        return new Vector2(
            this.position.x + (this.width * this.scale) / 2,
            this.position.y + (this.height * this.scale) / 2
        );
    }

    collidesWith(other) {
        const a = this.getBounds();
        const b = other.getBounds();
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }

    collidesWithCircle(other) {
        const centerA = this.getCenter();
        const centerB = other.getCenter();
        const radiusA = Math.min(this.width, this.height) * this.scale / 2;
        const radiusB = Math.min(other.width, other.height) * other.scale / 2;
        const distance = centerA.distance(centerB);
        return distance < radiusA + radiusB;
    }

    isOffScreen(canvasWidth, canvasHeight, margin = 50) {
        return this.position.x + this.width < -margin ||
               this.position.x > canvasWidth + margin ||
               this.position.y + this.height < -margin ||
               this.position.y > canvasHeight + margin;
    }

    destroy() {
        this.active = false;
    }
}

export default GameObject;
