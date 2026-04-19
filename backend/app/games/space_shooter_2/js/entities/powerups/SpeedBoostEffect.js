import PowerUpEffect from './PowerUpEffect.js';

class SpeedBoostEffect extends PowerUpEffect {
    update(deltaTime, player, game) {
        if (!this.active) return;
        this.time -= deltaTime;
        if (this.time <= 0) {
            this.active = false;
            const perkMult = game.perkSystem ? game.perkSystem.getSpeedMultiplier() : 1;
            player.speed = player.baseSpeed * perkMult;
        }
    }
}

export default SpeedBoostEffect;
