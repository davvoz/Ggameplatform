import PowerUpEffect from './PowerUpEffect.js';

const FIRE_COOLDOWN = 0.45;
const ORBIT_SPEED = 2;
const ORBIT_RADIUS = 40;
const BULLET_SPEED = 480;
const CLONE_COUNT = 2;

class GlitchCloneEffect extends PowerUpEffect {
    constructor() {
        super();
        this.fireTimer = 0;
        this.angle = 0;
    }

    activate() {
        super.activate();
        this.fireTimer = 0;
        this.angle = 0;
    }

    update(deltaTime, player, game) {
        if (!this.active) return;
        this.time -= deltaTime;
        this.angle += deltaTime * ORBIT_SPEED;
        this.fireTimer -= deltaTime;
        if (this.fireTimer <= 0) {
            this.fireTimer = FIRE_COOLDOWN;
            this.fireCloneBullets(player, game);
        }
        if (this.time <= 0) {
            this.active = false;
        }
    }

    fireCloneBullets(player, game) {
        for (let i = 0; i < CLONE_COUNT; i++) {
            const a = this.angle + i * Math.PI;
            const cx = player.position.x + player.width / 2 + Math.cos(a) * ORBIT_RADIUS;
            const cy = player.position.y + player.height / 2 + Math.sin(a) * ORBIT_RADIUS;
            const aim = PowerUpEffect.getAimDirection(cx, cy, BULLET_SPEED, game);
            game.spawnBullet(cx, cy, aim.vx, aim.vy, 'player');
        }
    }
}

export default GlitchCloneEffect;
