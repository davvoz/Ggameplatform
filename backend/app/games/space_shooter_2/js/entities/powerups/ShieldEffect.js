import PowerUpEffect from './PowerUpEffect.js';

class ShieldEffect extends PowerUpEffect {
    update(deltaTime) {
        if (!this.active) return;
        this.time -= deltaTime;
        if (this.time <= 0) {
            this.active = false;
        }
    }
}

export default ShieldEffect;
