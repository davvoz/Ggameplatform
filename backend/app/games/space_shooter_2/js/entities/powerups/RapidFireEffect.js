import PowerUpEffect from './PowerUpEffect.js';

class RapidFireEffect extends PowerUpEffect {
    update(deltaTime, player) {
        if (!this.active) return;
        this.time -= deltaTime;
        if (this.time <= 0) {
            this.active = false;
            player.fireRate = player.baseFireRate;
        }
    }
}

export default RapidFireEffect;
