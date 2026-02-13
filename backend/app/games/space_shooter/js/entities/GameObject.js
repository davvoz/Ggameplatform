import Vector2 from '../utils/Vector2.js';
/**
 * GameObject - Classe base per tutti gli oggetti di gioco
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

    /**
     * Aggiorna lo stato dell'oggetto
     */
    update(deltaTime, game) {
        // Override nelle sottoclassi
    }

    /**
     * Disegna l'oggetto
     */
    render(ctx, assets) {
        // Override nelle sottoclassi
    }

    /**
     * Ottiene il bounding box per le collisioni
     */
    getBounds() {
        return {
            x: this.position.x,
            y: this.position.y,
            width: this.width * this.scale,
            height: this.height * this.scale
        };
    }

    /**
     * Ottiene il centro dell'oggetto
     */
    getCenter() {
        return new Vector2(
            this.position.x + (this.width * this.scale) / 2,
            this.position.y + (this.height * this.scale) / 2
        );
    }

    /**
     * Verifica collisione con un altro oggetto (AABB)
     */
    collidesWith(other) {
        const a = this.getBounds();
        const b = other.getBounds();
        
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }

    /**
     * Verifica collisione circolare (più precisa per alcuni oggetti)
     */
    collidesWithCircle(other) {
        const centerA = this.getCenter();
        const centerB = other.getCenter();
        const radiusA = Math.min(this.width, this.height) * this.scale / 2;
        const radiusB = Math.min(other.width, other.height) * other.scale / 2;
        
        const distance = centerA.distance(centerB);
        return distance < radiusA + radiusB;
    }

    /**
     * Verifica se l'oggetto è fuori dallo schermo
     */
    isOffScreen(canvasWidth, canvasHeight, margin = 50) {
        return this.position.x + this.width < -margin ||
               this.position.x > canvasWidth + margin ||
               this.position.y + this.height < -margin ||
               this.position.y > canvasHeight + margin;
    }

    /**
     * Disattiva l'oggetto
     */
    destroy() {
        this.active = false;
    }
}

export default GameObject;
