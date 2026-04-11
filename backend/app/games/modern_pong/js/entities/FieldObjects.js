import {
    ARENA_LEFT, ARENA_RIGHT, ARENA_TOP, ARENA_BOTTOM,
    COLORS,
} from '../config/Constants.js';

//Abstract implements only checkBallCollision, the rest is up to subclasses
class FieldObject {
    get alive() { return true; }
    get x() { return 0; }
    get y() { return 0; }
    get width() { return 0; }
    get height() { return 0; }
    update(dt) {
        throw new Error('update() must be implemented by subclasses');
    }
    draw(ctx) {
        throw new Error('draw() must be implemented by subclasses');
    }
    checkBallCollision(ball) {
        const width = this.width;
        const height = this.height;
        const obj = { x: this.x, y: this.y, width: width, height: height };
        return this.#checkCollision(ball, obj);
    }
    #checkCollision(ball, obj) {
    const bx = ball.x;
    const by = ball.y;
    const br = ball.radius;
    return (
        bx + br >= obj.x - obj.width / 2 &&
        bx - br <= obj.x + obj.width / 2 &&
        by + br >= obj.y - obj.height / 2 &&
        by - br <= obj.y + obj.height / 2
    );
}
}

/**
 * Shield entity — sits at the goal line and blocks one hit.
 */
export class Shield extends FieldObject {
    #x;
    #goalY;
    #width = 60;
    #height = 6;
    #alive = true;
    #flashTimer = 0;

    constructor(isTopPlayer) {
        super();
        this.#x = (ARENA_LEFT + ARENA_RIGHT) / 2;
        this.#goalY = isTopPlayer ? ARENA_TOP + 3 : ARENA_BOTTOM - 3;
    }

    get alive() { return this.#alive; }
    get x() { return this.#x; }
    get y() { return this.#goalY; }
    get width() { return this.#width; }
    get height() { return this.#height; }

    destroy() { this.#alive = false; }

    update(dt) {
        this.#flashTimer += dt;
    }

    draw(ctx) {
        if (!this.#alive) return;
        const flash = Math.sin(this.#flashTimer / 200) * 0.3 + 0.7;

        ctx.save();
        ctx.globalAlpha = flash;
        ctx.fillStyle = COLORS.NEON_CYAN;
        ctx.shadowColor = COLORS.NEON_CYAN;
        ctx.shadowBlur = 8;
        ctx.fillRect(
            this.#x - this.#width / 2,
            this.#goalY - this.#height / 2,
            this.#width,
            this.#height
        );
        ctx.restore();
    }


}

/**
 * GravityWell entity — pulls the ball toward it.
 */
export class GravityWell extends FieldObject {
    #x;
    #y;
    #strength;
    #radius = 40;
    #timer;
    #maxTimer;
    #pulsePhase = 0;

    constructor(x, y, duration, strength = 100) {
        super();
        this.#x = x;
        this.#y = y;
        this.#strength = strength;
        this.#timer = duration;
        this.#maxTimer = duration;
    }

    get alive() { return this.#timer > 0; }
    get x() { return this.#x; }
    get y() { return this.#y; }

    update(dt) {
        this.#timer -= dt;
        this.#pulsePhase += dt / 300;
    }

    applyForce(ball, dt) {
        if (!this.alive) return;
        const dx = this.#x - ball.x;
        const dy = this.#y - ball.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 5 || dist > this.#radius * 2) return;

        const force = this.#strength / (dist * dist) * (dt / 1000);
        ball.vx += (dx / dist) * force * 100;
        ball.vy += (dy / dist) * force * 100;
    }

    draw(ctx) {
        if (!this.alive) return;
        const alpha = Math.max(0, this.#timer / this.#maxTimer);
        const pulse = 1 + Math.sin(this.#pulsePhase * Math.PI) * 0.2;

        ctx.save();
        ctx.globalAlpha = alpha * 0.4;

        // Outer ring
        ctx.strokeStyle = COLORS.NEON_PINK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.#x, this.#y, this.#radius * pulse, 0, Math.PI * 2);
        ctx.stroke();

        // Inner
        ctx.globalAlpha = alpha * 0.2;
        ctx.fillStyle = COLORS.NEON_PINK;
        ctx.beginPath();
        ctx.arc(this.#x, this.#y, this.#radius * pulse * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Center
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.#x - 2, this.#y - 2, 4, 4);

        ctx.restore();
    }
}

/**
 * SuperShield — full-width goal barrier that blocks 3 hits (Tank super).
 */
export class SuperShield extends FieldObject {
    #x;
    #goalY;
    #width;
    #height = 8;
    #alive = true;
    #hits = 3;
    #flashTimer = 0;
    #color;

    constructor(isTopPlayer, color = '#88ee88') {
        super();
        this.#x = (ARENA_LEFT + ARENA_RIGHT) / 2;
        this.#goalY = isTopPlayer ? ARENA_TOP + 4 : ARENA_BOTTOM - 4;
        this.#width = ARENA_RIGHT - ARENA_LEFT - 20;
        this.#color = color;
    }

    get alive() { return this.#alive; }
    get x() { return this.#x; }
    get y() { return this.#goalY; }
    get width() { return this.#width; }
    get height() { return this.#height; }

    destroy() {
        this.#hits--;
        if (this.#hits <= 0) this.#alive = false;
    }

    update(dt) {
        this.#flashTimer += dt;
    }

    draw(ctx) {
        if (!this.#alive) return;
        const flash = Math.sin(this.#flashTimer / 150) * 0.2 + 0.8;

        ctx.save();
        ctx.globalAlpha = flash;
        ctx.fillStyle = this.#color;
        ctx.shadowColor = this.#color;
        ctx.shadowBlur = 12;
        ctx.fillRect(
            this.#x - this.#width / 2,
            this.#goalY - this.#height / 2,
            this.#width,
            this.#height
        );
        // Hit indicators
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.9;
        const dotSpacing = 12;
        const startX = this.#x - (this.#hits - 1) * dotSpacing / 2;
        for (let i = 0; i < this.#hits; i++) {
            ctx.beginPath();
            ctx.arc(startX + i * dotSpacing, this.#goalY, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

}

 