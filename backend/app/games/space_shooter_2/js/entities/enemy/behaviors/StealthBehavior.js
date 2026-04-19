import EnemyBehavior from './EnemyBehavior.js';

const REVEAL_RANGE = 180;
const HIDDEN_ALPHA = 0.08;
const LERP_SPEED = 3;

/**
 * StealthBehavior — Enemy fades to near-invisible and reveals when
 * the player comes within REVEAL_RANGE pixels.
 */
class StealthBehavior extends EnemyBehavior {
    onConstruct(enemy) {
        enemy.alpha = HIDDEN_ALPHA;
    }

    update(enemy, dt, game) {
        if (!game.player?.active) return;
        const dist = this._distanceToPlayer(enemy, game.player);
        const targetAlpha = dist < REVEAL_RANGE ? 1 : HIDDEN_ALPHA;
        enemy.alpha += (targetAlpha - enemy.alpha) * LERP_SPEED * dt;
    }

    _distanceToPlayer(enemy, player) {
        const dx = (enemy.position.x + enemy.width / 2) - (player.position.x + player.width / 2);
        const dy = (enemy.position.y + enemy.height / 2) - (player.position.y + player.height / 2);
        return Math.hypot(dx, dy);
    }
}

export default StealthBehavior;
