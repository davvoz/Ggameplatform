import PowerUpEffect from './PowerUpEffect.js';

const FIRE_COOLDOWN = 0.5;
const ORBIT_SPEED = 2.5;
const ORBIT_RADIUS = 35;
const BULLET_SPEED = 500;

class DroneCompanionEffect extends PowerUpEffect {
    constructor() {
        super();
        this.fireTimer = 0;
        this.angle = 0;
    }

    activate() {
        super.activate();
        this.fireTimer = 0;
    }

    update(deltaTime, player, game) {
        if (!this.active) return;
        this.time -= deltaTime;
        this.angle += deltaTime * ORBIT_SPEED;
        this.fireTimer -= deltaTime;
        if (this.fireTimer <= 0) {
            this.fireTimer = FIRE_COOLDOWN;
            const cx = player.position.x + player.width / 2 + Math.cos(this.angle) * ORBIT_RADIUS;
            const cy = player.position.y + player.height / 2 + Math.sin(this.angle) * ORBIT_RADIUS;
            const aim = PowerUpEffect.getAimDirection(cx, cy, BULLET_SPEED, game);
            game.spawnBullet(cx, cy, aim.vx, aim.vy, 'player');
        }
        if (this.time <= 0) {
            this.active = false;
        }
    }
}

export default DroneCompanionEffect;
