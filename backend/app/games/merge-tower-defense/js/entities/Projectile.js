import { CONFIG } from '../config.js';
import { Utils } from '../utils.js';

// ============ PROJECTILE ENTITY ============
export class Projectile {
    constructor() {
        this.reset();
    }

    reset() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.target = null; // Aggiunto
        this.targetX = 0;
        this.targetY = 0;
        this.vx = 0;
        this.vy = 0;
        this.damage = 0;
        this.color = '#ffffff';
        this.speed = 10;
        this.piercing = 0;
        this.piercedTargets = [];
        this.splashRadius = 0;
        this.slowFactor = 0;
        this.slowDuration = 0;
        this.chainTargets = 0;
        this.chainedFrom = null;
        this.owner = null;
    }

    init(x, y, target, cannon) {
        this.active = true;
        this.x = x;
        this.y = y;
        this.target = target; // Memorizza il nemico, non la posizione!
        this.targetX = target.col;
        this.targetY = target.row;

        // Calculate initial velocity
        const dx = this.targetX - x;
        const dy = this.targetY - y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0) {
            this.vx = (dx / dist) * cannon.projectileSpeed;
            this.vy = (dy / dist) * cannon.projectileSpeed;
        } else {
            this.vx = 0;
            this.vy = 0;
        }

        this.damage = cannon.damage;
        this.color = cannon.color;
        this.speed = cannon.projectileSpeed;
        this.piercing = cannon.piercing || 0;
        this.piercedTargets = [];
        this.splashRadius = cannon.splashRadius || 0;
        this.slowFactor = cannon.slowFactor || 0;
        this.slowDuration = cannon.slowDuration || 0;
        this.chainTargets = cannon.chainTargets || 0;
        this.cannonType = cannon.type;
        this.owner = cannon;
    }

    update(dt) {
        if (!this.active) return;

        // Se il target è morto, disattiva il projectile
        if (this.target && this.target.isDead()) {
            this.active = false;
            return;
        }

        // Aggiorna il target se il nemico è ancora vivo
        if (this.target && !this.target.isDead()) {
            this.targetX = this.target.col;
            this.targetY = this.target.row;

            // Ricalcola velocità per seguire il nemico
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 0) {
                this.vx = (dx / dist) * this.speed;
                this.vy = (dy / dist) * this.speed;
            }
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Check if reached target area
        const dist = Utils.distance(this.x, this.y, this.targetX, this.targetY);
        if (dist < 0.3) {
            this.active = false;
        }

        // Check if off screen
        if (this.x < -2 || this.x > CONFIG.COLS + 2 || this.y < -2 || this.y > CONFIG.ROWS + 2) {
            this.active = false;
        }
    }

    render(graphics) {
        if (!this.active) return;

        graphics.drawProjectile(this.x, this.y, this.color, 1.0, {
            glow: true
        });
    }

    hasHitTarget(target) {
        return this.piercedTargets.includes(target);
    }

    addPiercedTarget(target) {
        this.piercedTargets.push(target);

        // Deactivate if pierced enough targets
        if (this.piercing > 0 && this.piercedTargets.length >= this.piercing) {
            this.active = false;
        }
    }
}
